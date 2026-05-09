import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import { sfx } from '../utils/sound';
import type { Word } from '../types';
import NavBar from '../components/NavBar';

/* ── Constants ─────────────────────────────────────────────── */
const MAX_HP = 5;
const HINT_AT = 0.45; // show hint at this fraction of time remaining

interface QuestionResult {
  word: Word;
  status: 'correct' | 'timeout';
}

interface LevelDef {
  lv: number; name: string; emoji: string; color: string;
  timeLimit: number; scoreBase: number; description: string;
  imgPrompt: string;
}

const LEVELS: LevelDef[] = [
  { lv: 1, name: 'スライム',   emoji: '🟢', color: '#4ade80', timeLimit: 20, scoreBase: 80,  description: '中学・基礎 (≤4文字)',
    imgPrompt: 'cute translucent green slime blob creature, dark fantasy RPG enemy, pure black background, glowing yellow eyes, gelatinous body' },
  { lv: 2, name: 'ゴブリン',   emoji: '👺', color: '#fb923c', timeLimit: 17, scoreBase: 100, description: '一般語彙 (5文字)',
    imgPrompt: 'menacing green goblin warrior monster, dark fantasy RPG enemy, pure black background, sharp fangs, ragged leather armor, orange glow' },
  { lv: 3, name: 'スケルトン', emoji: '💀', color: '#e2e8f0', timeLimit: 15, scoreBase: 130, description: '高校・英検準2級 (6文字)',
    imgPrompt: 'undead skeleton warrior monster, dark fantasy RPG enemy, pure black background, glowing blue eye sockets, cracked bones, tattered armor' },
  { lv: 4, name: 'オーク',     emoji: '🐗', color: '#c084fc', timeLimit: 12, scoreBase: 170, description: '英検2級・大学入試 (7-8文字)',
    imgPrompt: 'powerful orc berserker monster, dark fantasy RPG enemy, pure black background, large tusks, war paint, purple magical aura, heavy axe' },
  { lv: 5, name: 'ドラゴン',   emoji: '🐲', color: '#f87171', timeLimit: 10, scoreBase: 220, description: '大学・TOEIC700+ (9-10文字)',
    imgPrompt: 'fearsome red fire dragon monster, dark fantasy RPG enemy, pure black background, breathing flames, enormous wings spread, glowing red eyes' },
  { lv: 6, name: 'デーモン',   emoji: '😈', color: '#d946ef', timeLimit:  8, scoreBase: 290, description: '難関大・上級 (11-12文字)',
    imgPrompt: 'powerful winged demon monster, dark fantasy RPG enemy, pure black background, large curved horns, purple arcane flames, dark wings, sinister' },
  { lv: 7, name: '魔　王',     emoji: '👿', color: '#fbbf24', timeLimit:  6, scoreBase: 400, description: '専門用語・難読 (13文字以上)',
    imgPrompt: 'supreme demon king final boss, dark fantasy RPG, pure black background, golden crown, massive dark aura, overwhelming power, divine evil' },
];

function monsterImgUrl(lv: LevelDef) {
  return `/monsters/lv${lv.lv}.png`;
}

function diffOf(word: string) {
  const l = word.length;
  if (l <= 4) return 1; if (l <= 5) return 2; if (l <= 6) return 3;
  if (l <= 8) return 4; if (l <= 10) return 5; if (l <= 12) return 6;
  return 7;
}

function wordsForLevel(words: Word[], lv: number): Word[] {
  const custom = words.filter(w => w.custom);
  const nonCustom = words.filter(w => !w.custom);
  const primary = nonCustom.filter(w => diffOf(w.word) === lv);
  const base = primary.length >= 3
    ? primary
    : [...nonCustom].sort((a, b) => Math.abs(diffOf(a.word) - lv) - Math.abs(diffOf(b.word) - lv));
  return [...base, ...custom];
}

/* ── Dungeon canvas helpers ──────────────────────────────────── */
function drawBrickWall(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  clip: [number, number][], fromLeft: boolean,
) {
  ctx.save();
  ctx.beginPath();
  clip.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.clip();

  // Base stone gradient
  const base = ctx.createLinearGradient(fromLeft ? 0 : W / 2, 0, fromLeft ? W / 2 : W, 0);
  base.addColorStop(0, fromLeft ? '#2e2015' : '#16100a');
  base.addColorStop(1, fromLeft ? '#16100a' : '#2e2015');
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);

  const ROWS = 13;
  const BW = Math.max(W * 0.16, 26);

  for (let row = 0; row < ROWS; row++) {
    const y0 = (row / ROWS) * H;
    const y1 = ((row + 1) / ROWS) * H;
    const bh = y1 - y0;

    // Brick face tint (subtle brightness variation per row)
    const v = Math.sin(row * 4.1 + (fromLeft ? 0 : 1.3)) * 9 + Math.sin(row * 7.9) * 4;
    const lum = 22 + v;
    ctx.fillStyle = `rgba(${lum},${lum * 0.80},${lum * 0.58},0.14)`;
    ctx.fillRect(0, y0 + 1, W, bh - 2);

    // Shadow at bottom of each brick row
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, y1 - 3, W, 3);

    // Horizontal mortar line
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();

    // Vertical mortar (staggered every other row)
    const stagger = (row % 2) * BW * 0.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    for (let bx = -stagger; bx <= W; bx += BW) {
      ctx.beginPath(); ctx.moveTo(bx, y0 + 1); ctx.lineTo(bx, y1 - 1); ctx.stroke();
    }

    // Moss / moisture stain (random per row)
    if (Math.sin(row * 5.3 + (fromLeft ? 2.0 : 4.2)) > 0.52) {
      const mx = (fromLeft ? W * 0.55 : W * 0.45) + Math.sin(row * 11.7) * W * 0.28;
      const my = (y0 + y1) / 2;
      const mG = ctx.createRadialGradient(mx, my, 0, mx, my, BW * 0.65);
      mG.addColorStop(0, 'rgba(16,30,8,0.32)');
      mG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mG;
      ctx.beginPath();
      ctx.ellipse(mx, my, BW * 0.7, bh * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTorchStone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const now = Date.now();
  const f1 = Math.sin(now * 0.0075 + x * 0.011);
  const f2 = Math.sin(now * 0.0163 + x * 0.019);
  const flicker = f1 * 0.26 + f2 * 0.13;

  // Wall glow cast by torch
  const gr = 62 + flicker * 16;
  const wg = ctx.createRadialGradient(x, y - 10, 0, x, y, gr);
  wg.addColorStop(0, `rgba(215,108,22,${0.34 + flicker * 0.09})`);
  wg.addColorStop(0.45, `rgba(155,52,8,0.13)`);
  wg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wg;
  ctx.fillRect(x - gr, y - gr, gr * 2, gr * 2);

  // Iron bracket
  ctx.fillStyle = '#3c2810';
  ctx.fillRect(x - 4, y + 2, 8, 14);
  // Bowl
  ctx.fillStyle = '#50341a';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bowl rim highlight
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 3.5, 0, 0, Math.PI);
  ctx.stroke();

  // Flame
  const fh = 18 + flicker * 8;
  const fw = 5 + flicker * 2.2;
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(255,105,0,0.85)';
  const fg = ctx.createRadialGradient(x + f1 * 1.8, y - fh * 0.55, 0.5, x, y - 4, fh);
  fg.addColorStop(0, 'rgba(255,248,170,0.98)');
  fg.addColorStop(0.22, 'rgba(255,145,18,0.92)');
  fg.addColorStop(0.58, 'rgba(215,48,0,0.52)');
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(x + f1 * 1.5, y - fh * 0.58, fw, fh * 0.74, f1 * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/* ── Dungeon canvas ─────────────────────────────────────────── */
function drawDungeon(ctx: CanvasRenderingContext2D, W: number, H: number, scroll: number) {
  ctx.clearRect(0, 0, W, H);

  const VX = W / 2, VY = H * 0.40;
  const cLT = VX - W * 0.045, cRT = VX + W * 0.045;
  const cLB = W * 0.07,       cRB = W * 0.93;

  const getX = (t: number, left: boolean) =>
    left ? cLT + (cLB - cLT) * t : cRT + (cRB - cRT) * t;
  const getY = (t: number) => VY + (H - VY) * t;

  /* ── Ceiling: stone ── */
  ctx.fillStyle = '#0d0b07';
  ctx.fillRect(0, 0, W, VY + 2);

  // Ceiling brick rows
  const CEIL_ROWS = 5;
  for (let r = 0; r < CEIL_ROWS; r++) {
    const cy0 = (r / CEIL_ROWS) * VY;
    const cy1 = ((r + 1) / CEIL_ROWS) * VY;
    const stagger = (r % 2) * W * 0.13;
    // brick shading
    const lum = 18 + Math.sin(r * 5.3) * 5;
    ctx.fillStyle = `rgba(${lum},${lum * 0.82},${lum * 0.6},0.12)`;
    ctx.fillRect(0, cy0 + 1, W, cy1 - cy0 - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, cy0); ctx.lineTo(W, cy0); ctx.stroke();
    ctx.lineWidth = 0.8;
    for (let bx = -stagger; bx <= W; bx += W * 0.19) {
      ctx.beginPath(); ctx.moveTo(bx, cy0 + 1); ctx.lineTo(bx, cy1 - 1); ctx.stroke();
    }
  }
  // Top vignette
  const cGrad = ctx.createLinearGradient(0, 0, 0, VY);
  cGrad.addColorStop(0, 'rgba(0,0,0,0.5)'); cGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cGrad; ctx.fillRect(0, 0, W, VY);

  // Stalactites
  const now = Date.now();
  const stalXs = [0.13, 0.26, 0.43, 0.57, 0.72, 0.87];
  for (const fx of stalXs) {
    const sx = fx * W;
    const len = 9 + Math.sin(sx * 0.09) * 5;
    const wd = 3.5 + Math.sin(sx * 0.14) * 1.5;
    ctx.fillStyle = '#1e1610';
    ctx.beginPath();
    ctx.moveTo(sx - wd, VY - 1); ctx.lineTo(sx + wd, VY - 1);
    ctx.lineTo(sx + wd * 0.22, VY - 1 + len); ctx.lineTo(sx - wd * 0.22, VY - 1 + len);
    ctx.closePath(); ctx.fill();
    // Dripping water
    if (Math.sin(sx * 0.19) > 0.28) {
      const dp = ((now * 0.00032 + fx * 3.8) % 1) * 26;
      ctx.fillStyle = 'rgba(60,100,130,0.38)';
      ctx.beginPath();
      ctx.ellipse(sx, VY + dp, 1.2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Walls: stone brick ── */
  drawBrickWall(ctx, W, H,
    [[0, 0], [cLT, 0], [cLT, VY], [cLB, H], [0, H]], true);
  drawBrickWall(ctx, W, H,
    [[W, 0], [cRT, 0], [cRT, VY], [cRB, H], [W, H]], false);

  /* ── Floor: stone slabs ── */
  const fg = ctx.createLinearGradient(0, VY, 0, H);
  fg.addColorStop(0, '#201508'); fg.addColorStop(1, '#0e0904');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(cLT, VY); ctx.lineTo(cRT, VY); ctx.lineTo(cRB, H); ctx.lineTo(cLB, H);
  ctx.fill();

  // Stone slab horizontal seams (fewer, thicker = realistic slabs)
  const SLABS = 7;
  for (let i = 1; i < SLABS; i++) {
    const t = ((i / SLABS) + scroll * 0.38) % 1;
    if (t < 0.04 || t > 0.97) continue;
    const y = getY(t), lx = getX(t, true), rx = getX(t, false);
    const a = 0.18 + 0.52 * t;
    // Shadow crack
    ctx.strokeStyle = `rgba(0,0,0,${a})`;
    ctx.lineWidth = 1.8 + t * 3.8;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();
    // Stone edge highlight
    ctx.strokeStyle = `rgba(90,62,32,${a * 0.38})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(lx, y - 1); ctx.lineTo(rx, y - 1); ctx.stroke();
  }

  // Vertical slab divisions
  for (let col = 1; col < 4; col++) {
    const frac = col / 4;
    for (let i = 1; i < SLABS - 1; i++) {
      const t0 = ((i / SLABS) + scroll * 0.38) % 1;
      const t1 = (((i + 1) / SLABS) + scroll * 0.38) % 1;
      if (t0 < 0.04 || t0 > 0.94) continue;
      const y0 = getY(t0), y1 = getY(Math.min(t1 < t0 ? 1 : t1, 0.98));
      const lx0 = getX(t0, true), rx0 = getX(t0, false);
      const lx1 = getX(Math.min(t1 < t0 ? 1 : t1, 0.98), true), rx1 = getX(Math.min(t1 < t0 ? 1 : t1, 0.98), false);
      const x0 = lx0 + (rx0 - lx0) * frac;
      const x1 = lx1 + (rx1 - lx1) * frac;
      ctx.strokeStyle = `rgba(0,0,0,${0.12 + 0.28 * t0})`;
      ctx.lineWidth = 0.8 + t0 * 1.8;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }

  // Water/moisture pool
  const pT = 0.70;
  const pY = getY(pT);
  const plx = getX(pT, true), prx = getX(pT, false);
  const pcx = (plx + prx) / 2, pw = (prx - plx) * 0.28;
  const pG = ctx.createRadialGradient(pcx, pY, 0, pcx, pY, pw);
  pG.addColorStop(0, 'rgba(30,55,80,0.32)'); pG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pG;
  ctx.beginPath(); ctx.ellipse(pcx, pY, pw, pw * 0.28, 0, 0, Math.PI * 2); ctx.fill();

  /* ── Corridor arch edges (stone) ── */
  ctx.shadowColor = 'rgba(130,75,22,0.35)'; ctx.shadowBlur = 5;
  ctx.strokeStyle = 'rgba(70,48,22,0.92)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cLT, VY); ctx.lineTo(cLB, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cRT, VY); ctx.lineTo(cRB, H); ctx.stroke();
  ctx.shadowBlur = 0;

  /* ── Torches ── */
  drawTorchStone(ctx, W * 0.12, H * 0.33);
  drawTorchStone(ctx, W * 0.88, H * 0.33);
  drawTorchStone(ctx, W * 0.08, H * 0.64);
  drawTorchStone(ctx, W * 0.92, H * 0.64);

  /* ── Deep darkness at vanishing point (abyss, not glow) ── */
  const dark = ctx.createRadialGradient(VX, VY, 0, VX, VY, W * 0.28);
  dark.addColorStop(0, 'rgba(0,0,0,0.75)');
  dark.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  dark.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H * 0.72);
}

/* ── Level Select ───────────────────────────────────────────── */
function LevelSelect({ words, onSelect }: { words: Word[]; onSelect: (lv: LevelDef) => void }) {
  const [loadedLvs, setLoadedLvs] = useState<Set<number>>(new Set());

  return (
    <div className="min-h-screen pb-24 px-4 pt-8" style={{ background: `
      radial-gradient(ellipse at 15% 10%, rgba(124, 58,237,0.50) 0%, transparent 40%),
      radial-gradient(ellipse at 85% 10%, rgba( 30, 64,175,0.42) 0%, transparent 38%),
      radial-gradient(ellipse at 80% 85%, rgba(217, 70,239,0.28) 0%, transparent 40%),
      radial-gradient(ellipse at 15% 85%, rgba(  6,182,212,0.22) 0%, transparent 38%),
      #06060f` }}>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-white" style={{ textShadow: '0 0 24px rgba(167,139,250,0.6)' }}>
          ダンジョン・タイピング
        </h1>
        <p className="text-slate-500 text-sm mt-1">難易度を選んで冒険に出発！</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        {LEVELS.map(lv => {
          const count = words.filter(w => diffOf(w.word) === lv.lv).length;
          const loaded = loadedLvs.has(lv.lv);
          return (
            <button key={lv.lv} onClick={() => onSelect(lv)}
              className="relative rounded-2xl p-4 text-left transition-all active:scale-95 hover:scale-105 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))`,
                border: `1.5px solid ${lv.color}44`,
                boxShadow: `0 0 20px ${lv.color}22`,
              }}>
              {/* Monster image / emoji */}
              <div className="relative w-14 h-14 mb-2">
                <span className={`text-4xl absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`}>
                  {lv.emoji}
                </span>
                <img
                  src={monsterImgUrl(lv)}
                  alt={lv.name}
                  onLoad={() => setLoadedLvs(s => new Set([...s, lv.lv]))}
                  onError={() => {}}
                  className={`w-14 h-14 object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                  style={{ filter: `drop-shadow(0 0 6px ${lv.color}88)`, mixBlendMode: 'screen' }}
                />
              </div>
              <div className="font-bold text-white text-sm">{lv.name}</div>
              <div className="text-xs mt-1" style={{ color: lv.color }}>{lv.description}</div>
              <div className="text-xs text-slate-600 mt-1">⏱ {lv.timeLimit}秒</div>
              {count > 0 && (
                <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: `${lv.color}33`, color: lv.color }}>
                  {count}語
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-center text-slate-600 text-xs mt-4">
        {words.length}語登録中 — すべての難易度で挑戦できます
      </p>
      <NavBar />
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function Game3Type() {
  const navigate = useNavigate();
  const allWords = useWordStore(s => s.words);
  const favoriteOnly = useWordStore(s => s.favoriteOnly);
  const words = favoriteOnly ? allWords.filter(w => w.favorite) : allWords;
  const [phase, setPhase] = useState<'select' | 'playing' | 'victory' | 'defeat'>('select');
  const [level, setLevel] = useState<LevelDef>(LEVELS[0]);

  // Game state
  const [deck, setDeck] = useState<Word[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [input, setInput] = useState('');
  const [hp, setHp] = useState(MAX_HP);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [status, setStatus] = useState<'fighting' | 'correct' | 'wrong' | 'timeout'>('fighting');
  const [showHint, setShowHint] = useState(false);
  const [showBigX, setShowBigX] = useState(false);
  const [showBigO, setShowBigO] = useState(false);
  const [attackAnim, setAttackAnim] = useState<{ word: string; id: number } | null>(null);
  const [monsterHit, setMonsterHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [monsterHp, setMonsterHp] = useState(100);
  const [monsterAttacking, setMonsterAttacking] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const resultsRef = useRef<QuestionResult[]>([]);

  // Refs (closure-safe)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<number | null>(null);
  const scrollRef = useRef(0);
  const timeRef = useRef(20);
  const statusRef = useRef<typeof status>('fighting');
  const hpRef = useRef(MAX_HP);
  const qIdxRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const deckRef = useRef<Word[]>([]);
  const levelRef = useRef<LevelDef>(LEVELS[0]);
  const monsterHpRef = useRef(100);

  useEffect(() => { if (words.length === 0) navigate('/'); }, []);

  // Global Enter key to advance after timeout
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && statusRef.current === 'timeout') {
        handleTimeoutContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Canvas loop */
  function startCanvas() {
    stopCanvas();
    const loop = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const w = container.clientWidth, h = container.clientHeight || 300;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        if (w > 0) {
          scrollRef.current = (scrollRef.current + 0.0035) % 1;
          const ctx = canvas.getContext('2d');
          if (ctx) drawDungeon(ctx, canvas.width, canvas.height, scrollRef.current);
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

  /* Start a level */
  function startLevel(lv: LevelDef) {
    const available = wordsForLevel(words, lv.lv);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    deckRef.current = shuffled; levelRef.current = lv;
    hpRef.current = MAX_HP; scoreRef.current = 0; comboRef.current = 0;
    qIdxRef.current = 0; monsterHpRef.current = 100;
    setLevel(lv); setDeck(shuffled); setHp(MAX_HP); setScore(0);
    setCombo(0); setQIdx(0); setMonsterHp(100);
    resultsRef.current = []; setResults([]);
    setPhase('playing');
    setTimeout(() => {
      startCanvas();
      setTimeout(() => beginQ(0, shuffled, lv), 200);
    }, 50);
  }

  function beginQ(idx: number, d: Word[], lv: LevelDef) {
    if (idx >= d.length) { clearTimer(); stopCanvas(); sfx.victory(); setPhase('victory'); return; }
    qIdxRef.current = idx; setQIdx(idx);
    setInput(''); setShowHint(false);
    monsterHpRef.current = 100; setMonsterHp(100);
    timeRef.current = lv.timeLimit; setTimeLeft(lv.timeLimit);
    setStatus('fighting'); statusRef.current = 'fighting';
    clearTimer();
    timerRef.current = setInterval(() => {
      const t = timeRef.current - 1; timeRef.current = t; setTimeLeft(t);
      if (t <= Math.ceil(lv.timeLimit * HINT_AT)) setShowHint(true);
      if (t <= 0) {
        clearTimer();
        if (statusRef.current === 'fighting') {
          // Delay by 900 ms to sync with timer-bar CSS transition (duration: 0.9s)
          setTimeout(() => {
            if (statusRef.current === 'fighting') takeDamage('timeout', idx, d, lv);
          }, 900);
        }
      }
    }, 1000);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  function takeDamage(reason: 'timeout' | 'wrong', idx: number, d: Word[], lv: LevelDef) {
    clearTimer();
    sfx.monsterAttack();
    setTimeout(() => sfx.damage(), 180);
    comboRef.current = 0; setCombo(0);
    const newHp = hpRef.current - 1; hpRef.current = newHp;
    const r: QuestionResult = { word: d[idx], status: reason === 'timeout' ? 'timeout' : 'timeout' };
    resultsRef.current = [...resultsRef.current, r];
    setResults([...resultsRef.current]);
    setPlayerHit(true); setTimeout(() => setPlayerHit(false), 700);
    const st = reason === 'timeout' ? 'timeout' : 'wrong';
    setStatus(st); statusRef.current = st;
    if (reason === 'timeout') {
      setMonsterAttacking(true);
      setTimeout(() => setMonsterAttacking(false), 800);
    }
    if (newHp <= 0) {
      hpRef.current = 0; setHp(0);
      sfx.defeat();
      // timeout: show answer first, then defeat on Enter
      if (reason === 'timeout') { setHp(0); return; }
      setTimeout(() => { stopCanvas(); setPhase('defeat'); }, 1900); return;
    }
    setHp(newHp);
    // timeout: wait for Enter to advance; wrong: auto-advance
    if (reason !== 'timeout') {
      setTimeout(() => beginQ(idx + 1, d, lv), 1900);
    }
  }

  function handleTimeoutContinue() {
    if (statusRef.current !== 'timeout') return;
    const idx = qIdxRef.current;
    const d = deckRef.current;
    const lv = levelRef.current;
    if (hpRef.current <= 0) { stopCanvas(); setPhase('defeat'); return; }
    setStatus('fighting'); statusRef.current = 'fighting';
    beginQ(idx + 1, d, lv);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (statusRef.current === 'timeout') { handleTimeoutContinue(); return; }
    if (statusRef.current !== 'fighting') return;
    const current = deckRef.current[qIdxRef.current];
    if (!current) return;
    const typed = input.trim().toLowerCase();
    if (typed === current.word.toLowerCase()) {
      clearTimer();
      resultsRef.current = [...resultsRef.current, { word: current, status: 'correct' }];
      setResults([...resultsRef.current]);
      // Combo + score
      comboRef.current += 1; setCombo(comboRef.current);
      sfx.dungeonHit();
      if (comboRef.current >= 2) sfx.combo(comboRef.current);
      const mult = comboRef.current >= 6 ? 3.0 : comboRef.current >= 4 ? 2.0 : comboRef.current >= 2 ? 1.5 : 1.0;
      const pts = Math.round(levelRef.current.scoreBase * mult + timeRef.current * 8);
      scoreRef.current += pts; setScore(scoreRef.current);
      // Attack animation
      setAttackAnim({ word: current.word, id: Date.now() });
      setMonsterHit(true); setTimeout(() => setMonsterHit(false), 500);
      monsterHpRef.current = 0; setMonsterHp(0);
      setShowBigO(true); setTimeout(() => setShowBigO(false), 900);
      setStatus('correct'); statusRef.current = 'correct';
      setTimeout(() => beginQ(qIdxRef.current + 1, deckRef.current, levelRef.current), 1600);
      return;
    }
    // wrong: show × mark, clear input, no HP penalty
    sfx.dungeonWrong();
    setShowBigX(true);
    setInput('');
    setTimeout(() => setShowBigX(false), 700);
  }

  /* ── Phase: level select ── */
  if (phase === 'select') {
    return <LevelSelect words={words} onSelect={startLevel} />;
  }

  /* ── Phase: victory / defeat ── */
  if (phase === 'victory' || phase === 'defeat') {
    const win = phase === 'victory';
    const correctResults = results.filter(r => r.status === 'correct');
    const wrongResults   = results.filter(r => r.status === 'timeout');
    return (
      <div className="min-h-screen flex flex-col pb-24"
        style={{ background: win
          ? `radial-gradient(ellipse at 50% 10%, rgba(16,185,129,0.35) 0%, transparent 50%), #04100a`
          : `radial-gradient(ellipse at 50% 10%, rgba(220,38,38,0.35) 0%, transparent 50%), #100404` }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-6 pb-3 text-center shrink-0">
          <div className="text-5xl mb-1">{win ? '🏆' : '💀'}</div>
          <h2 className="text-2xl font-bold" style={{ color: win ? '#86efac' : '#f87171' }}>
            {win ? 'ダンジョン制覇！' : '全滅…'}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">{level.emoji} {level.name}</p>
          <div className="text-3xl font-bold text-yellow-400 mt-1">{score}点</div>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            <span className="text-green-400 font-bold">✓ {correctResults.length}問正解</span>
            <span className="text-red-400 font-bold">✗ {wrongResults.length}問時間切れ</span>
            <span className="text-slate-500">MAX ×{combo}</span>
          </div>
        </motion.div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((r, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: r.status === 'correct' ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                  style={{
                    background: r.status === 'correct' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    border: `1px solid ${r.status === 'correct' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                  <span className="text-xl font-black mt-0.5 shrink-0"
                    style={{ color: r.status === 'correct' ? '#4ade80' : '#f87171' }}>
                    {r.status === 'correct' ? '○' : '✗'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-white font-mono font-bold text-base leading-tight">
                      {r.word.word}
                    </div>
                    <div className="text-slate-300 text-sm mt-0.5 leading-snug">
                      {r.word.definitionJa || r.word.definition}
                    </div>
                    {r.status === 'timeout' && (
                      <div className="text-red-400 text-xs mt-0.5">⏰ 時間切れ</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-600 py-8">問題なし</div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-4 pt-2 pb-1 flex gap-3 shrink-0">
          <button onClick={() => startLevel(level)}
            className="flex-1 bg-violet-700 hover:bg-violet-600 text-white py-3 rounded-xl font-medium transition-all active:scale-95">
            再挑戦
          </button>
          <button onClick={() => setPhase('select')}
            className="flex-1 text-white py-3 rounded-xl font-medium transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            ステージ選択
          </button>
        </div>

        <NavBar />
      </div>
    );
  }

  /* ── Phase: playing ── */
  const current = deck[qIdx];
  const timerPct = (timeLeft / level.timeLimit) * 100;
  const timerColor = timerPct > 50 ? level.color : timerPct > 25 ? '#fbbf24' : '#f87171';
  const rawTimeProgress = level.timeLimit > 0 ? Math.max(0, Math.min(1, 1 - timeLeft / level.timeLimit)) : 0;
  const approachScale = 1 + rawTimeProgress * 1.8;
  const approachY = rawTimeProgress * 70;

  return (
    <div className="min-h-screen flex flex-col pb-24 overflow-hidden relative select-none" style={{ background: `
      radial-gradient(ellipse at 50%  0%,  rgba( 80, 42, 12,0.60) 0%, transparent 42%),
      radial-gradient(ellipse at 10% 50%,  rgba( 60, 30,  8,0.40) 0%, transparent 38%),
      radial-gradient(ellipse at 90% 50%,  rgba( 60, 30,  8,0.40) 0%, transparent 38%),
      radial-gradient(ellipse at 50% 100%, rgba( 35, 18,  5,0.55) 0%, transparent 45%),
      #07050200` }}>

      {/* Player damage flash */}
      <AnimatePresence>
        {playerHit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-600 pointer-events-none z-50" />
        )}
      </AnimatePresence>

      {/* Top bar (merged) */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between gap-2 shrink-0 relative z-10">
        <button onClick={() => { clearTimer(); stopCanvas(); setPhase('select'); }}
          className="text-slate-500 hover:text-white text-sm transition-all shrink-0">← 戻る</button>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-slate-600 shrink-0">{level.emoji} {qIdx + 1}/{deck.length}</span>
          <div className="flex gap-0.5 shrink-0">
            {Array.from({ length: MAX_HP }).map((_, i) => (
              <motion.span key={i} animate={playerHit && i === hp - 1 ? { scale: [1, 0.3, 1] } : {}}
                className={`text-base ${i < hp ? 'text-red-400' : 'opacity-15'}`}
                style={i < hp ? { filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.7))' } : {}}>♥</motion.span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AnimatePresence>
            {combo >= 2 && (
              <motion.span key={combo}
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: combo >= 6 ? 'linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6)' : combo >= 4 ? 'rgba(251,191,36,0.3)' : 'rgba(167,139,250,0.3)',
                  color: combo >= 6 ? '#fff' : combo >= 4 ? '#fbbf24' : '#a78bfa',
                }}>
                COMBO×{combo}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-yellow-400 font-bold text-sm">{score}点</span>
        </div>
      </div>

      {/* Dungeon canvas */}
      <div ref={containerRef} className="relative mx-2 mt-1 rounded-2xl overflow-hidden flex-1" style={{ minHeight: 380, maxHeight: 720 }}>
        <canvas ref={canvasRef} className="absolute inset-0" style={{ display: 'block', width: '100%', height: '100%' }} />

        {/* Timer overlay */}
        <div className="absolute top-2 left-3 right-3 z-10 pointer-events-none">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">残り時間</span>
            <span className="font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}秒</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full"
              animate={{ width: `${timerPct}%`, backgroundColor: timerColor }}
              transition={{ duration: 0.9, ease: 'linear' }} />
          </div>
        </div>

        {/* Monster */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            animate={monsterHit && status !== 'correct' ? { x: [-8, 8, -6, 6, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.4 }}>
            <div className="relative">
              {/* Monster HP bar */}
              <div className="w-36 h-2.5 bg-black/60 rounded-full mb-3 mx-auto overflow-hidden">
                <motion.div className="h-full rounded-full"
                  animate={{ width: `${monsterHp}%` }}
                  style={{ background: `linear-gradient(90deg, ${level.color}, ${level.color}99)` }} />
              </div>
              {/* Monster — scale-only animation (no opacity) to avoid visibility bug */}
              <motion.div
                key={qIdx}
                className="flex items-center justify-center"
                initial={{ scale: 0.5, y: 0, rotate: 0 }}
                animate={
                  status === 'correct' ? {
                    scale:  [approachScale, approachScale * 1.3, approachScale * 0.7, 0.15, 0.01],
                    rotate: [0, -12, 15, 50, 200],
                    y:      [approachY, approachY - 20, approachY - 10, -70, -140],
                  } : monsterAttacking ? {
                    scale:  [approachScale, approachScale * 1.6, approachScale * 2.0, approachScale * 1.1, approachScale],
                    y:      [approachY, approachY + 35, approachY + 90, approachY + 25, approachY],
                    rotate: [0, -12, 12, -6, 0],
                  } : {
                    scale: approachScale,
                    y: approachY,
                    rotate: 0,
                  }
                }
                transition={
                  status === 'correct' || monsterAttacking
                    ? { duration: status === 'correct' ? 0.75 : 0.7, ease: 'easeInOut' }
                    : { duration: 0.9, ease: 'linear' }
                }
                style={{ filter: `drop-shadow(0 0 36px ${level.color}cc)` }}
              >
                <div className="w-44 h-44">
                  <img
                    src={monsterImgUrl(level)}
                    alt={level.name}
                    className="w-44 h-44 object-contain"
                    style={{ mixBlendMode: 'screen' }}
                  />
                </div>
              </motion.div>
              {/* Hit flash */}
              {monsterHit && status !== 'correct' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl font-black text-yellow-300"
                    style={{ textShadow: '0 0 20px rgba(255,200,50,1)' }}>
                    HIT!
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Correct ○ mark */}
        <AnimatePresence>
          {showBigO && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            >
              <span style={{
                fontSize: '9rem', lineHeight: 1, fontWeight: 900, color: '#22c55e',
                textShadow: '0 0 40px rgba(34,197,94,1), 0 0 80px rgba(34,197,94,0.6)',
              }}>○</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wrong input × mark */}
        <AnimatePresence>
          {showBigX && (
            <motion.div
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            >
              <span style={{
                fontSize: '9rem', lineHeight: 1, fontWeight: 900, color: '#ef4444',
                textShadow: '0 0 40px rgba(239,68,68,1), 0 0 80px rgba(239,68,68,0.5)',
              }}>✕</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attack text animation */}
        <AnimatePresence>
          {attackAnim && (
            <motion.div key={attackAnim.id}
              initial={{ opacity: 1, y: 60, x: '-50%', scale: 0.8 }}
              animate={{ opacity: 0, y: -20, x: '-50%', scale: 1.4 }}
              exit={{}}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="absolute bottom-4 left-1/2 font-black pointer-events-none z-20"
              style={{
                color: '#fde047',
                textShadow: '0 0 16px rgba(253,224,71,0.9), 0 0 32px rgba(253,224,71,0.5)',
                fontSize: '1.6rem', letterSpacing: '0.05em',
              }}
              onAnimationComplete={() => setAttackAnim(null)}>
              {attackAnim.word.toUpperCase()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status feedback overlay */}
        <AnimatePresence>
          {(status === 'timeout' || status === 'wrong') && current && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"
              onClick={status === 'timeout' ? handleTimeoutContinue : undefined}>
              <div className="text-red-400 font-bold text-lg">
                {status === 'timeout' ? '⏰ 時間切れ！' : '✕ ミス！'}
              </div>
              <div className="text-slate-300 text-sm mt-1">
                正解: <span className="text-white font-mono font-bold text-xl">{current.word}</span>
              </div>
              {status === 'timeout' && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  onClick={handleTimeoutContinue}
                  className="mt-4 px-6 py-2.5 rounded-xl font-bold text-base text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', boxShadow: '0 0 20px rgba(124,58,237,0.6)' }}>
                  次の問題へ →
                </motion.button>
              )}
            </motion.div>
          )}
          {status === 'correct' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ background: `radial-gradient(ellipse, ${level.color}22, transparent 70%)` }}>
              <div className="text-4xl font-black" style={{ color: level.color, textShadow: `0 0 30px ${level.color}` }}>
                撃破！
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Question */}
      <div className="px-3 mt-2 shrink-0 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div key={current?.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="rounded-xl border px-4 py-3 text-center"
            style={{ borderColor: `${level.color}44`, background: `${level.color}0d` }}>
            <p className="text-xs text-slate-500 mb-1">この意味の英単語を入力</p>
            {current?.definitionJa ? (
              <>
                <p className="text-white text-xl font-semibold leading-snug">{current.definitionJa}</p>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">{current.definition}</p>
              </>
            ) : (
              <p className="text-white text-lg">{current?.definition}</p>
            )}
            {showHint && current && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-2 font-mono tracking-widest text-base"
                style={{ color: level.color }}>
                {current.word[0]}{'＿'.repeat(current.word.length - 1)}
                <span className="text-slate-600 text-xs ml-2 font-sans">({current.word.length}文字)</span>
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-3 mt-2 shrink-0 relative z-10">
        <div className="flex rounded-2xl overflow-hidden"
          style={{ border: `2px solid ${status === 'correct' ? level.color : status === 'timeout' || status === 'wrong' ? '#f87171' : `${level.color}66`}`, boxShadow: `0 0 16px ${level.color}22` }}>
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            disabled={status !== 'fighting'}
            placeholder="英単語を入力..."
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            className="flex-1 bg-transparent px-4 py-4 text-lg text-white outline-none placeholder-slate-700 font-mono" />
          <button type="submit" disabled={status !== 'fighting'}
            className="px-5 font-bold text-xl transition-all disabled:opacity-30"
            style={{ color: level.color, textShadow: `0 0 10px ${level.color}` }}>→</button>
        </div>
        {!showHint && status === 'fighting' && (
          <button type="button" onClick={() => setShowHint(true)}
            className="w-full text-center text-slate-700 hover:text-slate-500 text-xs mt-1 transition-all">
            ヒントを見る (−20点)
          </button>
        )}
      </form>

      <NavBar />
    </div>
  );
}
