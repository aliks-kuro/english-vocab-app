import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import { WORD_DATABASE } from '../utils/wordDatabase';
import type { Word } from '../types';
import NavBar from '../components/NavBar';

interface Question {
  word: string; definition: string; definitionJa?: string;
  options: string[]; correctIdx: number;
}

interface WrongEntry { word: string; correct: string; selected: string }

const TIME_PER_Q = 12;
const MAX_LIVES = 5;
const RUN_DURATION = 2.4; // seconds for running animation

function buildQuestions(words: Word[]): Question[] {
  const allDefs = [
    ...words.map(w => w.definitionJa ?? w.definition),
    ...WORD_DATABASE.map(w => w.definitionJa),
  ];
  return shuffle(words).slice(0, Math.min(10, words.length)).map(w => {
    const correct = w.definitionJa ?? w.definition;
    const wrongs = shuffle(allDefs.filter(d => d !== correct)).slice(0, 3);
    const opts = shuffle([correct, ...wrongs]);
    return {
      word: w.word, definition: w.definition, definitionJa: w.definitionJa,
      options: opts, correctIdx: opts.indexOf(correct),
    };
  });
}

/* ══════════════════════════════════════════
   3D TPS-style Trolley (seen from behind)
   Draw centered at (cx, groundY). Pass scale for running animation.
══════════════════════════════════════════ */
function drawTrolleyTPS(
  ctx: CanvasRenderingContext2D, cx: number, groundY: number,
  scale = 1, extraRotation = 0, alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, groundY);
  ctx.rotate(extraRotation);
  ctx.scale(scale, scale);

  const bob = Math.sin(Date.now() * 0.005) * 1.6;
  const gy = bob; // local Y (0 = groundY after translate)

  const HW = 44, BH = 36, depthY = 22, pF = 0.65;
  const bL = -HW, bR = HW;
  const bTop = gy - BH, bBot = gy;
  const rHW = HW * pF, rL = -rHW, rR = rHW, rY = bTop - depthY;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.ellipse(0, gy + 12, HW + 10, 7, 0, 0, Math.PI * 2); ctx.fill();

  // Roof face
  const roofGrad = ctx.createLinearGradient(0, rY, 0, bTop);
  roofGrad.addColorStop(0, '#3b0764'); roofGrad.addColorStop(1, '#5b21b6');
  ctx.fillStyle = roofGrad;
  ctx.shadowColor = 'rgba(139,92,246,0.6)'; ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(rL, rY); ctx.lineTo(rR, rY); ctx.lineTo(bR, bTop); ctx.lineTo(bL, bTop);
  ctx.closePath(); ctx.fill();

  // Left side
  const lsGrad = ctx.createLinearGradient(rL, 0, bL, 0);
  lsGrad.addColorStop(0, '#2e1065'); lsGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = lsGrad; ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(bL, bTop); ctx.lineTo(rL, rY);
  ctx.lineTo(rL, rY + depthY + BH * 0.8); ctx.lineTo(bL, bBot); ctx.closePath(); ctx.fill();

  // Right side
  const rsGrad = ctx.createLinearGradient(bR, 0, rR, 0);
  rsGrad.addColorStop(0, '#1e1b4b'); rsGrad.addColorStop(1, '#2e1065');
  ctx.fillStyle = rsGrad;
  ctx.beginPath();
  ctx.moveTo(bR, bTop); ctx.lineTo(rR, rY);
  ctx.lineTo(rR, rY + depthY + BH * 0.8); ctx.lineTo(bR, bBot); ctx.closePath(); ctx.fill();

  // Back face
  ctx.shadowColor = 'rgba(139,92,246,1)'; ctx.shadowBlur = 24;
  const faceGrad = ctx.createLinearGradient(0, bTop, 0, bBot);
  faceGrad.addColorStop(0, '#7c3aed'); faceGrad.addColorStop(0.45, '#6d28d9'); faceGrad.addColorStop(1, '#4c1d95');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.moveTo(bL, bTop); ctx.lineTo(bR, bTop); ctx.lineTo(bR, bBot); ctx.lineTo(bL, bBot); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;

  // Cab stripe
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath(); ctx.roundRect(bL + 2, bTop, HW * 2 - 4, 11, [4, 4, 0, 0]); ctx.fill();

  // Windows
  ctx.shadowBlur = 16; ctx.shadowColor = 'rgba(221,214,254,1)';
  ctx.fillStyle = '#ede9fe';
  ctx.fillRect(bL + 8, bTop + 13, 22, 14);
  ctx.fillRect(bR - 30, bTop + 13, 22, 14);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 1.5;
  ctx.strokeRect(bL + 8, bTop + 13, 22, 14);
  ctx.strokeRect(bR - 30, bTop + 13, 22, 14);
  ctx.beginPath(); ctx.moveTo(0, bTop + 13); ctx.lineTo(0, bTop + 27); ctx.stroke();

  // Brake lights
  ctx.fillStyle = 'rgba(239,68,68,0.9)';
  ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(239,68,68,0.8)';
  ctx.fillRect(bL + 5, bBot - 10, 11, 7);
  ctx.fillRect(bR - 16, bBot - 10, 11, 7);
  ctx.shadowBlur = 0;

  // Chassis
  ctx.fillStyle = '#0f0b2e';
  ctx.fillRect(bL - 5, bBot - 7, (HW + 5) * 2, 8);

  // Wheels
  const wheelY = bBot + 6;
  for (const wx of [bL + 10, bL + 28, bR - 28, bR - 10]) {
    ctx.fillStyle = '#0f0b2e';
    ctx.beginPath(); ctx.arc(wx, wheelY, 10, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(109,40,217,0.8)';
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.arc(wx, wheelY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.2; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(wx, wheelY, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 1;
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(wx, wheelY);
      ctx.lineTo(wx + Math.cos(a) * 6, wheelY + Math.sin(a) * 6); ctx.stroke();
    }
  }

  // Edge highlight
  ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.8;
  ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(196,181,253,0.7)';
  ctx.strokeRect(bL, bTop, HW * 2, BH);
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rL, rY); ctx.lineTo(rR, rY); ctx.lineTo(bR, bTop); ctx.lineTo(bL, bTop); ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

/* ══════════════════════════════════════════
   Option signs on rails (bigger)
══════════════════════════════════════════ */
function drawOptionSigns(
  ctx: CanvasRenderingContext2D, _W: number, _H: number,
  VP: { x: number; y: number }, GY: number, GAUGE: number,
  laneCount: number, options: string[],
  selectedLane: number, correctIdx: number, judging: boolean,
) {
  if (laneCount <= 1 || options.length === 0) return;
  const SPLIT = 0.52;
  const splitY = VP.y + (GY - VP.y) * SPLIT;
  const SIGN_FRAC = 0.28; // closer to split = bigger signs

  for (let i = 0; i < Math.min(laneCount, options.length); i++) {
    const lnCenter = ((i + 0.5) / laneCount - 0.5) * 2.2;
    const bxC = VP.x + lnCenter * GAUGE * SPLIT;
    const signX = bxC + (VP.x - bxC) * SIGN_FRAC;
    const signY = splitY + (VP.y - splitY) * SIGN_FRAC;

    const scale = 0.82 + 0.28 * (1 - SIGN_FRAC);

    const isSelected = selectedLane === i;
    const isCorrect = judging && i === correctIdx;
    const isWrong = judging && selectedLane === i && i !== correctIdx;

    const glowC = isCorrect ? '#4ade80' : isWrong ? '#f87171' : isSelected ? '#a78bfa' : '#6366f166';
    const bgC = isCorrect ? 'rgba(20,83,45,0.95)' : isWrong ? 'rgba(127,29,29,0.95)' : isSelected ? 'rgba(49,46,129,0.95)' : 'rgba(8,6,32,0.88)';
    const textC = isCorrect ? '#86efac' : isWrong ? '#fca5a5' : isSelected ? '#ddd6fe' : '#a5b4fc';

    const SW = Math.round(20 * scale);
    const SH = Math.round(30 * scale);

    // Post
    ctx.shadowBlur = isSelected ? 10 : 4; ctx.shadowColor = glowC;
    ctx.strokeStyle = glowC; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(signX, signY + SH / 2);
    ctx.lineTo(signX, signY + SH / 2 + Math.round(20 * scale));
    ctx.stroke();

    // Board shadow
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(signX - SW + 2, signY - SH / 2 + 2, SW * 2, SH, 3);
    ctx.fill();

    // Board
    ctx.fillStyle = bgC;
    ctx.shadowBlur = isSelected ? 16 : 6; ctx.shadowColor = glowC;
    ctx.beginPath();
    ctx.roundRect(signX - SW, signY - SH / 2, SW * 2, SH, 3);
    ctx.fill();
    ctx.strokeStyle = glowC; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Letter
    const letter = String.fromCharCode(65 + i);
    const fs = Math.round(15 * scale);
    ctx.fillStyle = textC;
    ctx.font = `bold ${fs}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, signX, signY);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    // Text snippet below letter
    if (options[i] && scale > 0.6) {
      const snippet = options[i].slice(0, 12);
      const tfs = Math.max(7, Math.round(7.5 * scale));
      ctx.fillStyle = textC + 'bb';
      ctx.font = `${tfs}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(snippet, signX, signY + SH / 2 + 3);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }
}

/* ══════════════════════════════════════════
   Pitfall drawn on wrong lanes during running phase
══════════════════════════════════════════ */
function drawBrokenRails(
  ctx: CanvasRenderingContext2D,
  VP: { x: number; y: number }, GY: number, GAUGE: number,
  laneCount: number, _selectedLane: number, correctIdx: number,
  revealT: number,
) {
  const SPLIT = 0.52;
  const getY = (t: number) => VP.y + (GY - VP.y) * t;
  const gapT = SPLIT * 0.45;
  const gapAlpha = Math.min(1, revealT * 2.5);

  for (let i = 0; i < laneCount; i++) {
    if (i === correctIdx) continue;

    const lnN = ((i + 0.5) / laneCount - 0.5) * 2.2;
    const hw = 0.5 / laneCount;
    const cx = VP.x + lnN * GAUGE * gapT;
    const cy = getY(gapT);
    // Left/right rail positions at the gap
    const lrX = VP.x + (lnN - hw) * GAUGE * gapT;
    const rrX = VP.x + (lnN + hw) * GAUGE * gapT;
    const pitW = Math.max(12, (rrX - lrX) * 1.5);
    const pitH = pitW * 0.55;

    ctx.globalAlpha = gapAlpha;

    // Dark abyss fill
    const abyssGrad = ctx.createRadialGradient(cx, cy + pitH * 0.15, 0, cx, cy, pitW);
    abyssGrad.addColorStop(0, 'rgba(180,10,0,0.35)');
    abyssGrad.addColorStop(0.3, 'rgba(0,0,0,0.98)');
    abyssGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = abyssGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, pitW, pitH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pit rim glow
    ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(239,68,68,0.8)';
    ctx.strokeStyle = 'rgba(239,68,68,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, pitW * 0.85, pitH * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Broken left rail end (jagged teeth)
    ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 2;
    ctx.shadowBlur = 8; ctx.shadowColor = '#f87171';
    ctx.beginPath();
    ctx.moveTo(lrX, cy - 2);
    ctx.lineTo(lrX - 3, cy + 6);
    ctx.lineTo(lrX + 3, cy + 11);
    ctx.stroke();

    // Broken right rail end
    ctx.beginPath();
    ctx.moveTo(rrX, cy - 2);
    ctx.lineTo(rrX + 3, cy + 6);
    ctx.lineTo(rrX - 3, cy + 11);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Warning symbol above pit
    const iconSize = Math.max(8, Math.round(pitW * 0.55));
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${iconSize}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10; ctx.shadowColor = '#fbbf24';
    ctx.fillText('⚠', cx, cy - pitH * 0.95);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
  }
}

/* ══════════════════════════════════════════
   Explosion
══════════════════════════════════════════ */
function drawExplosion(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, scale = 1) {
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const dist = t * 85 * scale;
    const px = x + Math.cos(ang) * dist, py = y + Math.sin(ang) * dist;
    const hue = 10 + i * 20;
    ctx.fillStyle = `hsla(${hue},92%,62%,${Math.max(0, 1 - t * 1.3)})`;
    ctx.shadowBlur = 14; ctx.shadowColor = `hsla(${hue},92%,62%,0.8)`;
    ctx.beginPath(); ctx.arc(px, py, Math.max(0, (1 - t) * 11 * scale + 2), 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
}

/* ══════════════════════════════════════════
   Main draw scene
══════════════════════════════════════════ */
function drawScene(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  scroll: number, laneCount: number, cartNormX: number,
  explodeT: number, stars: [number, number][],
  options: string[], selectedLane: number, correctIdx: number, judging: boolean,
  // running phase
  runProgress: number, // -1 = not running, 0-1 = running
  isRunningWrong: boolean,
) {
  ctx.clearRect(0, 0, W, H);

  const VP = { x: W / 2, y: H * 0.28 };
  const GY = H * 0.88;
  const GAUGE = W * 0.44;
  const getX = (t: number, n: number) => VP.x + n * GAUGE * t;
  const getY = (t: number) => VP.y + (GY - VP.y) * t;

  /* Sky */
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010110'); sky.addColorStop(1, '#04041c');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  /* Horizon glow */
  const hg = ctx.createRadialGradient(VP.x, VP.y, 0, VP.x, VP.y, W * 0.5);
  hg.addColorStop(0, 'rgba(99,102,241,0.3)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);

  /* Stars */
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [sx, sy] of stars) {
    if (sy * H > VP.y) continue;
    ctx.beginPath(); ctx.arc(sx * W, sy * H, 0.8, 0, Math.PI * 2); ctx.fill();
  }

  /* Ground */
  const grd = ctx.createLinearGradient(0, VP.y, 0, H);
  grd.addColorStop(0, '#04042a'); grd.addColorStop(1, '#0c0c38');
  ctx.fillStyle = grd; ctx.fillRect(0, VP.y, W, H - VP.y);

  /* Ties */
  ctx.lineCap = 'round';
  const TN = 24;
  for (let i = 0; i < TN; i++) {
    const t = ((i / TN) + scroll) % 1;
    if (t < 0.02) continue;
    ctx.strokeStyle = `rgba(99,102,241,${0.12 + 0.6 * t})`;
    ctx.lineWidth = 0.5 + 3.5 * t;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(getX(t, -0.5), getY(t));
    ctx.lineTo(getX(t, 0.5), getY(t));
    ctx.stroke();
  }

  /* Rails */
  ctx.shadowColor = 'rgba(139,92,246,0.95)'; ctx.shadowBlur = 18;
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3.5;

  const SPLIT = 0.52;
  if (laneCount <= 1) {
    for (const n of [-0.5, 0.5]) {
      ctx.beginPath(); ctx.moveTo(getX(1, n), getY(1)); ctx.lineTo(VP.x, VP.y); ctx.stroke();
    }
  } else {
    for (const n of [-0.5, 0.5]) {
      ctx.beginPath(); ctx.moveTo(getX(1, n), getY(1)); ctx.lineTo(getX(SPLIT, n), getY(SPLIT)); ctx.stroke();
    }
    for (let i = 0; i < laneCount; i++) {
      const ln = ((i + 0.5) / laneCount - 0.5) * 2.2;
      const hw = 0.5 / laneCount;
      // correct lane glows green during running
      const isThisCorrect = i === correctIdx;
      const isThisSelected = i === selectedLane;
      if (runProgress >= 0 && isThisCorrect) {
        ctx.strokeStyle = '#4ade80';
        ctx.shadowColor = 'rgba(74,222,128,0.9)';
        ctx.shadowBlur = 20;
      } else if (runProgress >= 0 && !isThisCorrect && runProgress > 0.5) {
        ctx.strokeStyle = '#f87171';
        ctx.shadowColor = 'rgba(248,113,113,0.7)';
        ctx.shadowBlur = 14;
      } else if (isThisSelected && !judging) {
        ctx.strokeStyle = '#c4b5fd';
        ctx.shadowColor = 'rgba(196,181,253,0.9)';
        ctx.shadowBlur = 22;
      } else {
        ctx.strokeStyle = '#a78bfa';
        ctx.shadowColor = 'rgba(139,92,246,0.95)';
        ctx.shadowBlur = 18;
      }
      ctx.lineWidth = 3.5;
      for (const off of [-hw, hw]) {
        const bx = getX(SPLIT, ln + off);
        ctx.beginPath();
        ctx.moveTo(bx, getY(SPLIT));
        ctx.bezierCurveTo(bx, getY(SPLIT * 0.65), VP.x + (bx - VP.x) * 0.25, getY(0.1), VP.x, VP.y);
        ctx.stroke();
      }
    }
  }
  ctx.shadowBlur = 0;

  /* Broken rails overlay during running */
  if (runProgress > 0.5 && laneCount > 1) {
    const revealT = Math.min(1, (runProgress - 0.5) / 0.25);
    drawBrokenRails(ctx, VP, GY, GAUGE, laneCount, selectedLane, correctIdx, revealT);
  }

  /* Option signs */
  if (laneCount > 1 && runProgress < 0) {
    drawOptionSigns(ctx, W, H, VP, GY, GAUGE, laneCount, options, selectedLane, correctIdx, judging);
  }

  /* Trolley / explosion */
  if (runProgress >= 0) {
    // Running animation: trolley moves forward (shrinks toward VP)
    const lane = selectedLane >= 0 ? selectedLane : 0;
    const lnN = ((lane + 0.5) / laneCount - 0.5) * 2.2;
    // trolleyT goes from 0.95 down toward 0.22 as runProgress → 1
    const trolleyT = 0.95 - runProgress * 0.73;
    let txWorld: number, tyWorld: number;
    if (trolleyT >= SPLIT) {
      txWorld = VP.x;
      tyWorld = getY(trolleyT);
    } else {
      const branchFrac = (SPLIT - trolleyT) / SPLIT; // 0 at split, 1 at VP
      const bxC = VP.x + lnN * GAUGE * SPLIT;
      txWorld = VP.x + (bxC - VP.x) * (1 - branchFrac);
      tyWorld = getY(trolleyT);
    }
    const trolleyScale = Math.max(0.12, trolleyT);

    if (isRunningWrong && runProgress > 0.72) {
      const fallT = (runProgress - 0.72) / 0.28;
      const fallY = fallT * H * 0.35;
      const rot = fallT * Math.PI * 0.55;
      const falpha = Math.max(0, 1 - fallT * 0.85);
      // Explosion sparks
      if (fallT > 0.1) drawExplosion(ctx, txWorld, tyWorld + fallY * 0.3, fallT * 0.8, trolleyScale);
      drawTrolleyTPS(ctx, txWorld, tyWorld + fallY, trolleyScale, rot, falpha);
    } else {
      drawTrolleyTPS(ctx, txWorld, tyWorld, trolleyScale);
    }
  } else if (explodeT < 0.05) {
    const cx = VP.x + cartNormX * W * 0.38;
    drawTrolleyTPS(ctx, cx, GY - 10);
  } else {
    const cx = VP.x + cartNormX * W * 0.38;
    drawExplosion(ctx, cx, GY - 10, explodeT);
    drawTrolleyTPS(ctx, cx, GY - 10, 1, 0, Math.max(0, 1 - explodeT * 2.5));
  }
}

/* ══════════════════════════════════════════
   Component
══════════════════════════════════════════ */
type GameStatus = 'questioning' | 'running' | 'judging' | 'gameover' | 'finished';

export default function Game2Path() {
  const navigate = useNavigate();
  const allWords = useWordStore(s => s.words);
  const favoriteOnly = useWordStore(s => s.favoriteOnly);
  const words = favoriteOnly ? allWords.filter(w => w.favorite) : allWords;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [selectedLane, setSelectedLane] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('questioning');
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [shakeLives, setShakeLives] = useState(false);
  const [wrongWords, setWrongWords] = useState<WrongEntry[]>([]);
  const [revivalCount, setRevivalCount] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef(0);
  const cartXRef = useRef(0);
  const cartTargetRef = useRef(0);
  const explodeTRef = useRef(0);
  const starsRef = useRef<[number, number][]>([]);
  const livesRef = useRef(MAX_LIVES);
  const qIdxRef = useRef(0);
  const statusRef = useRef<GameStatus>('questioning');
  const timeRef = useRef(TIME_PER_Q);
  const questionsRef = useRef<Question[]>([]);
  const selectedLaneRef = useRef<number>(-1);
  const optionsRef = useRef<string[]>([]);
  const correctIdxRef = useRef(0);
  const judgingRef = useRef(false);
  // Running phase
  const runProgressRef = useRef(-1);
  const runDoneRef = useRef(false);
  const runWrongRef = useRef(false);
  // Callback ref to finalize run (avoids stale closure)
  const finalizeRunRef = useRef<(() => void) | null>(null);
  const revivalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (words.length === 0) { navigate('/'); return; }
    starsRef.current = Array.from({ length: 90 }, () =>
      [Math.random(), Math.random() * 0.45] as [number, number]);
    const qs = buildQuestions(words);
    questionsRef.current = qs;
    setQuestions(qs);

    let tries = 0;
    const tryInit = () => {
      const canvas = canvasRef.current, container = containerRef.current;
      if (!canvas || !container) { if (tries++ < 30) requestAnimationFrame(tryInit); return; }
      const w = container.clientWidth;
      const h = container.clientHeight || 300;
      if (w > 0) {
        canvas.width = w; canvas.height = h;
        startCanvas();
        setTimeout(() => beginQuestion(0, questionsRef.current), 500);
      } else if (tries++ < 30) {
        requestAnimationFrame(tryInit);
      }
    };
    requestAnimationFrame(tryInit);
    return () => { stopCanvas(); clearTimer(); if (revivalTimerRef.current) clearInterval(revivalTimerRef.current); };
  }, []);

  function startCanvas() {
    stopCanvas();
    let lastTs = 0;
    const loop = (ts: number) => {
      const dt = Math.min((ts - lastTs) / 1000, 0.05); lastTs = ts;
      const st = statusRef.current;

      if (st === 'questioning') scrollRef.current = (scrollRef.current + dt * 0.5) % 1;
      if (st === 'running') {
        scrollRef.current = (scrollRef.current + dt * 2.8) % 1;
        runProgressRef.current = Math.min(1, runProgressRef.current + dt / RUN_DURATION);
        if (runProgressRef.current >= 1.0 && !runDoneRef.current) {
          runDoneRef.current = true;
          setTimeout(() => finalizeRunRef.current?.(), 0);
        }
      }
      if (st === 'judging') scrollRef.current = (scrollRef.current + dt * 1.2) % 1;

      cartXRef.current += (cartTargetRef.current - cartXRef.current) * 0.08;

      const canvas = canvasRef.current;
      if (canvas && canvas.width > 0) {
        const container = containerRef.current;
        if (container && container.clientWidth !== canvas.width) {
          canvas.width = container.clientWidth; canvas.height = container.clientHeight || 300;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const q = questionsRef.current[qIdxRef.current];
          const lc = (st === 'questioning' || st === 'running' || st === 'judging')
            ? (q?.options.length ?? 1) : 1;
          drawScene(
            ctx, canvas.width, canvas.height, scrollRef.current, lc, cartXRef.current,
            explodeTRef.current, starsRef.current,
            optionsRef.current, selectedLaneRef.current, correctIdxRef.current, judgingRef.current,
            runProgressRef.current, runWrongRef.current,
          );
        }
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }

  function stopCanvas() {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }
  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function beginQuestion(idx: number, qs: Question[]) {
    if (revivalTimerRef.current) { clearInterval(revivalTimerRef.current); revivalTimerRef.current = null; }
    setRevivalCount(null);
    if (idx >= qs.length) { stopCanvas(); setGameStatus('finished'); statusRef.current = 'finished'; return; }
    qIdxRef.current = idx; setQIdx(idx);
    cartTargetRef.current = 0; explodeTRef.current = 0;
    selectedLaneRef.current = -1; judgingRef.current = false;
    runProgressRef.current = -1; runDoneRef.current = false; runWrongRef.current = false;
    optionsRef.current = qs[idx]?.options ?? [];
    correctIdxRef.current = qs[idx]?.correctIdx ?? 0;
    setSelectedLane(null); setLastCorrect(null);
    setTimeLeft(TIME_PER_Q); timeRef.current = TIME_PER_Q;
    setGameStatus('questioning'); statusRef.current = 'questioning';
    clearTimer();
    timerRef.current = setInterval(() => {
      const t = timeRef.current - 1; timeRef.current = t; setTimeLeft(t);
      if (t <= 0) {
        clearTimer();
        if (statusRef.current === 'questioning') {
          // Use current lane (default to 0 if none hovered)
          const lane = selectedLaneRef.current >= 0 ? selectedLaneRef.current : 0;
          startRunning(lane, idx, qs);
        }
      }
    }, 1000);
  }

  function startRunning(lane: number, idx: number, qs: Question[]) {
    clearTimer();
    const n = qs[idx]?.options.length ?? 1;
    selectedLaneRef.current = lane;
    setSelectedLane(lane);
    cartTargetRef.current = ((lane + 0.5) / n - 0.5) * 1.6;
    runProgressRef.current = 0;
    runDoneRef.current = false;
    const isWrong = lane !== (qs[idx]?.correctIdx ?? 0);
    runWrongRef.current = isWrong;
    judgingRef.current = false;
    setGameStatus('running'); statusRef.current = 'running';

    // Store finalize callback so rAF loop can call it without stale closure
    finalizeRunRef.current = () => finalizeRun(lane, idx, qs);
  }

  function finalizeRun(lane: number, idx: number, qs: Question[]) {
    const q = qs[idx];
    if (!q) return;
    const correct = lane === q.correctIdx;
    setLastCorrect(correct);
    judgingRef.current = true;

    if (correct) {
      setScore(s => s + 100);
    } else {
      setWrongWords(ws => [...ws, {
        word: q.word,
        correct: q.options[q.correctIdx] ?? '',
        selected: q.options[lane] ?? '(無回答)',
      }]);
      const nl = livesRef.current - 1;
      livesRef.current = Math.max(0, nl);
      setLives(Math.max(0, nl));
      setShakeLives(true); setTimeout(() => setShakeLives(false), 600);
      if (nl < 0) {
        livesRef.current = 0;
        setGameStatus('judging'); statusRef.current = 'judging';
        setTimeout(() => { stopCanvas(); setGameStatus('gameover'); statusRef.current = 'gameover'; }, 1800);
        return;
      }
    }
    setGameStatus('judging'); statusRef.current = 'judging';
    if (correct) {
      setTimeout(() => {
        judgingRef.current = false;
        runProgressRef.current = -1;
        explodeTRef.current = 0;
        beginQuestion(idx + 1, qs);
      }, 1600);
    } else {
      let rCount = 5;
      setRevivalCount(rCount);
      const revTick = setInterval(() => {
        rCount -= 1;
        setRevivalCount(rCount);
        if (rCount <= 0) {
          clearInterval(revTick);
          revivalTimerRef.current = null;
          judgingRef.current = false;
          runProgressRef.current = -1;
          explodeTRef.current = 0;
          beginQuestion(idx + 1, qs);
        }
      }, 1000);
      revivalTimerRef.current = revTick;
    }
  }

  const handleSelect = useCallback((lane: number) => {
    if (statusRef.current !== 'questioning') return;
    startRunning(lane, qIdxRef.current, questionsRef.current);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const q = questionsRef.current[qIdxRef.current];
      if (!q) return;
      if (statusRef.current !== 'questioning') return;
      const n = q.options.length;
      if (e.key === 'ArrowLeft') setSelectedLane(l => {
        const next = l === null ? Math.floor(n / 2) - 1 : Math.max(0, l - 1);
        selectedLaneRef.current = next;
        cartTargetRef.current = ((next + 0.5) / n - 0.5) * 1.6; return next;
      });
      if (e.key === 'ArrowRight') setSelectedLane(l => {
        const next = l === null ? Math.ceil(n / 2) : Math.min(n - 1, (l ?? 0) + 1);
        selectedLaneRef.current = next;
        cartTargetRef.current = ((next + 0.5) / n - 0.5) * 1.6; return next;
      });
      if ((e.key === 'Enter' || e.key === ' ') && selectedLane !== null) handleSelect(selectedLane);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedLane, handleSelect]);

  /* ── End screens ── */
  if (gameStatus === 'gameover' || gameStatus === 'finished') {
    const isOver = gameStatus === 'gameover';
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pb-24" style={{ background: `
        radial-gradient(ellipse at 50%  0%,  rgba( 99,102,241,0.38) 0%, transparent 50%),
        radial-gradient(ellipse at  8% 65%,  rgba(  6,182,212,0.22) 0%, transparent 38%),
        radial-gradient(ellipse at 92% 65%,  rgba(124, 58,237,0.28) 0%, transparent 35%),
        #03030e` }}>
        <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">{isOver ? '💥' : '🏆'}</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: isOver ? '#f87171' : '#fff' }}>
            {isOver ? 'ゲームオーバー' : 'クリア！'}
          </h2>
          <div className="text-4xl font-bold text-yellow-400 mb-4">{score}点</div>
          {wrongWords.length > 0 && (
            <div className="text-left mb-6 max-h-48 overflow-y-auto space-y-1.5">
              <p className="text-xs text-slate-500 mb-2">間違えた単語 ({wrongWords.length}語)</p>
              {wrongWords.map((w, i) => (
                <div key={i} className="rounded-lg bg-white/5 px-3 py-2">
                  <span className="text-white font-bold text-sm">{w.word}</span>
                  <p className="text-green-400 text-xs mt-0.5">✓ {w.correct}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => {
              const qs = buildQuestions(words); questionsRef.current = qs;
              livesRef.current = MAX_LIVES; setLives(MAX_LIVES); setScore(0);
              setWrongWords([]); setQuestions(qs);
              setGameStatus('questioning'); statusRef.current = 'questioning';
              scrollRef.current = 0; cartXRef.current = 0; explodeTRef.current = 0;
              selectedLaneRef.current = -1; judgingRef.current = false;
              runProgressRef.current = -1; runDoneRef.current = false;
              startCanvas(); setTimeout(() => beginQuestion(0, qs), 500);
            }} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-medium transition-all">
              もう一度
            </button>
            <button onClick={() => navigate('/')} className="flex-1 glass text-white py-2.5 rounded-xl font-medium transition-all">
              ホーム
            </button>
          </div>
        </div>
        <NavBar />
      </div>
    );
  }

  const currentQ = questions[qIdx];
  const timerPct = (timeLeft / TIME_PER_Q) * 100;
  const timerColor = timerPct > 50 ? '#6366f1' : timerPct > 25 ? '#fbbf24' : '#f87171';
  const isRunning = gameStatus === 'running';

  return (
    <div className="min-h-screen flex flex-col pb-20 select-none" style={{ background: `
      radial-gradient(ellipse at 50%  0%,  rgba( 99,102,241,0.38) 0%, transparent 50%),
      radial-gradient(ellipse at  8% 65%,  rgba(  6,182,212,0.22) 0%, transparent 38%),
      radial-gradient(ellipse at 92% 65%,  rgba(124, 58,237,0.28) 0%, transparent 35%),
      radial-gradient(ellipse at 50% 100%, rgba(217, 70,239,0.15) 0%, transparent 40%),
      #03030e` }}>
      {/* Top bar */}
      <div className="px-4 pt-4 flex items-center justify-between shrink-0">
        <motion.div animate={shakeLives ? { x: [-6, 6, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }} className="flex gap-1.5">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className={`text-xl ${i < lives ? 'text-red-400' : 'opacity-15'}`}
              style={i < lives ? { filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.7))' } : {}}>♥</span>
          ))}
        </motion.div>
        <motion.div key={timeLeft} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
          className={`text-5xl font-black tabular-nums ${timeLeft <= 3 ? 'text-red-400' : isRunning ? 'text-slate-500' : 'text-white'}`}
          style={timeLeft <= 3 && !isRunning ? { textShadow: '0 0 20px rgba(239,68,68,0.8)' } : {}}>
          {isRunning ? '…' : String(timeLeft).padStart(2, '0')}
        </motion.div>
        <span className="text-yellow-400 font-bold text-lg">{score}点</span>
      </div>

      {/* Timer bar */}
      <div className="px-4 mt-1 shrink-0">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            animate={{ width: isRunning ? '0%' : `${timerPct}%`, backgroundColor: timerColor }}
            transition={{ duration: isRunning ? 0.3 : 0.9, ease: 'linear' }} />
        </div>
      </div>

      {/* Question card */}
      <div className="px-4 mt-3 shrink-0">
        {currentQ ? (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/50 px-4 py-3 text-center">
            <p className="text-xs text-slate-500 mb-1">問 {qIdx + 1}/{questions.length}　｜　意味を選べ</p>
            <h2 className="text-3xl font-bold text-white" style={{ textShadow: '0 0 18px rgba(167,139,250,0.6)' }}>
              {currentQ.word}
            </h2>
          </div>
        ) : (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-4 py-4 text-center">
            <p className="text-slate-600 text-sm">読み込み中...</p>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative mx-2 mt-3 rounded-2xl overflow-hidden shrink-0" style={{ height: 300 }}>
        <canvas ref={canvasRef} className="absolute inset-0" style={{ display: 'block', width: '100%', height: '100%' }} />

        {/* Running phase label */}
        <AnimatePresence>
          {isRunning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
              走行中…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Revival countdown overlay */}
        <AnimatePresence>
          {revivalCount !== null && currentQ && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.72)' }}>
              <div className="text-red-400 font-bold text-base">✕ 不正解</div>
              <div className="text-slate-500 text-xs mt-1">正解</div>
              <div className="text-green-300 font-bold text-center px-6 mt-1 leading-snug" style={{ fontSize: '1.05rem' }}>
                {currentQ.options[currentQ.correctIdx]}
              </div>
              <div className="mt-4 text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>
                復活まで {revivalCount}秒
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {lastCorrect !== null && gameStatus === 'judging' && (
            <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 rounded-xl pointer-events-none"
              style={{
                background: lastCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                border: `1px solid ${lastCorrect ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'}`,
              }}>
              <span className={`font-bold text-base ${lastCorrect ? 'text-green-300' : 'text-red-300'}`}>
                {lastCorrect ? '✓ 正解！' : `✕ ${currentQ?.options[currentQ.correctIdx]?.slice(0, 22) ?? ''}`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Option buttons */}
      {currentQ && (
        <div className="px-3 mt-3 shrink-0">
          <div className="grid grid-cols-2 gap-2.5">
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedLane === i;
              const isCorrect = (gameStatus === 'judging' || isRunning) && i === currentQ.correctIdx;
              const isWrong = (gameStatus === 'judging' || isRunning) && selectedLane === i && i !== currentQ.correctIdx;
              const label = String.fromCharCode(65 + i);
              return (
                <button key={i} onClick={() => {
                  if (gameStatus !== 'questioning') return;
                  selectedLaneRef.current = i;
                  const n = currentQ.options.length;
                  cartTargetRef.current = ((i + 0.5) / n - 0.5) * 1.6;
                  setSelectedLane(i);
                  handleSelect(i);
                }}
                  disabled={gameStatus !== 'questioning'}
                  className="relative rounded-xl py-3 px-3 text-left transition-all active:scale-95 disabled:cursor-default"
                  style={{
                    background: isCorrect ? 'rgba(34,197,94,0.3)' : isWrong ? 'rgba(239,68,68,0.3)' : isSelected ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)',
                    border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.7)' : isWrong ? 'rgba(239,68,68,0.7)' : isSelected ? 'rgba(167,139,250,0.8)' : 'rgba(99,102,241,0.3)'}`,
                    boxShadow: isSelected ? '0 0 14px rgba(99,102,241,0.5)' : 'none',
                  }}>
                  <span className="text-sm font-bold mr-1.5"
                    style={{ color: isCorrect ? '#86efac' : isWrong ? '#fca5a5' : isSelected ? '#c4b5fd' : '#6366f1' }}>
                    {label}
                  </span>
                  <span className={`text-sm leading-snug ${isCorrect ? 'text-green-200' : isWrong ? 'text-red-200' : isSelected ? 'text-indigo-100' : 'text-slate-300'}`}>
                    {opt.length > 36 ? opt.slice(0, 34) + '…' : opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile controls */}
      <div className="flex items-center gap-2 px-4 mt-2.5 shrink-0">
        <button onClick={() => {
          if (!currentQ || gameStatus !== 'questioning') return;
          const n = currentQ.options.length;
          setSelectedLane(l => {
            const next = l === null ? Math.floor(n / 2) - 1 : Math.max(0, l - 1);
            selectedLaneRef.current = next;
            cartTargetRef.current = ((next + 0.5) / n - 0.5) * 1.6; return next;
          });
        }} className="flex-none w-12 h-11 glass rounded-xl text-xl text-white font-bold hover:bg-white/10 transition-all">←</button>

        <button onClick={() => { if (selectedLane !== null) handleSelect(selectedLane); }}
          disabled={selectedLane === null || gameStatus !== 'questioning'}
          className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-all disabled:opacity-40 text-sm">
          決定 (Enter)
        </button>

        <button onClick={() => {
          if (!currentQ || gameStatus !== 'questioning') return;
          const n = currentQ.options.length;
          setSelectedLane(l => {
            const next = l === null ? Math.ceil(n / 2) : Math.min(n - 1, (l ?? 0) + 1);
            selectedLaneRef.current = next;
            cartTargetRef.current = ((next + 0.5) / n - 0.5) * 1.6; return next;
          });
        }} className="flex-none w-12 h-11 glass rounded-xl text-xl text-white font-bold hover:bg-white/10 transition-all">→</button>
      </div>
      <p className="text-center text-slate-700 text-xs mt-1">← → キーで選択・Enter で決定</p>

      {/* Wrong words list */}
      {wrongWords.length > 0 && (
        <div className="px-4 mt-4 shrink-0">
          <p className="text-xs text-slate-600 mb-2 font-medium">間違えた単語 ({wrongWords.length})</p>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {wrongWords.map((w, i) => (
              <div key={i} className="glass rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="text-red-400 text-xs mt-0.5 shrink-0">✕</span>
                <div className="min-w-0">
                  <span className="text-white font-bold text-sm">{w.word}</span>
                  <p className="text-green-400 text-xs mt-0.5 leading-snug truncate">✓ {w.correct}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
