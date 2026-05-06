import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import type { Word } from '../types';
import NavBar from '../components/NavBar';

/* ── Constants ─────────────────────────────────────────────── */
const MAX_HP = 5;
const HINT_AT = 0.45; // show hint at this fraction of time remaining

interface LevelDef {
  lv: number; name: string; emoji: string; color: string;
  timeLimit: number; scoreBase: number; description: string;
}

const LEVELS: LevelDef[] = [
  { lv: 1, name: 'スライム',   emoji: '🟢', color: '#4ade80', timeLimit: 20, scoreBase: 80,  description: '中学・基礎 (≤4文字)' },
  { lv: 2, name: 'ゴブリン',   emoji: '👺', color: '#fb923c', timeLimit: 17, scoreBase: 100, description: '一般語彙 (5文字)' },
  { lv: 3, name: 'スケルトン', emoji: '💀', color: '#e2e8f0', timeLimit: 15, scoreBase: 130, description: '高校・英検準2級 (6文字)' },
  { lv: 4, name: 'オーク',     emoji: '🐗', color: '#c084fc', timeLimit: 12, scoreBase: 170, description: '英検2級・大学入試 (7-8文字)' },
  { lv: 5, name: 'ドラゴン',   emoji: '🐲', color: '#f87171', timeLimit: 10, scoreBase: 220, description: '大学・TOEIC700+ (9-10文字)' },
  { lv: 6, name: 'デーモン',   emoji: '😈', color: '#d946ef', timeLimit:  8, scoreBase: 290, description: '難関大・上級 (11-12文字)' },
  { lv: 7, name: '魔　王',     emoji: '👿', color: '#fbbf24', timeLimit:  6, scoreBase: 400, description: '専門用語・難読 (13文字以上)' },
];

function diffOf(word: string) {
  const l = word.length;
  if (l <= 4) return 1; if (l <= 5) return 2; if (l <= 6) return 3;
  if (l <= 8) return 4; if (l <= 10) return 5; if (l <= 12) return 6;
  return 7;
}

function wordsForLevel(words: Word[], lv: number): Word[] {
  const primary = words.filter(w => diffOf(w.word) === lv);
  if (primary.length >= 3) return primary;
  return [...words].sort((a, b) => Math.abs(diffOf(a.word) - lv) - Math.abs(diffOf(b.word) - lv));
}

/* ── Dungeon canvas ─────────────────────────────────────────── */
function drawDungeon(ctx: CanvasRenderingContext2D, W: number, H: number, scroll: number) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#030210';
  ctx.fillRect(0, 0, W, H);

  const VX = W / 2, VY = H * 0.40;
  const cLT = VX - W * 0.045, cRT = VX + W * 0.045;
  const cLB = W * 0.07,       cRB = W * 0.93;

  const getX = (t: number, left: boolean) =>
    left ? cLT + (cLB - cLT) * t : cRT + (cRB - cRT) * t;
  const getY = (t: number) => VY + (H - VY) * t;

  /* Floor */
  const fg = ctx.createLinearGradient(0, VY, 0, H);
  fg.addColorStop(0, '#1a0b08'); fg.addColorStop(1, '#0a0503');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(cLT, VY); ctx.lineTo(cRT, VY); ctx.lineTo(cRB, H); ctx.lineTo(cLB, H);
  ctx.fill();

  /* Floor grid */
  for (let i = 0; i < 9; i++) {
    const t = ((i / 9) + scroll * 0.5) % 1;
    if (t < 0.03) continue;
    const y = getY(t), lx = getX(t, true), rx = getX(t, false);
    ctx.strokeStyle = `rgba(100,40,20,${0.08 + 0.55 * t})`;
    ctx.lineWidth = 0.5 + t * 2.5;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();
  }

  /* Ceiling */
  ctx.fillStyle = '#050310';
  ctx.fillRect(0, 0, W, VY);

  /* Left wall */
  const lw = ctx.createLinearGradient(0, 0, VX, 0);
  lw.addColorStop(0, '#1c0d08'); lw.addColorStop(1, '#080402');
  ctx.fillStyle = lw;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(cLT, 0); ctx.lineTo(cLT, VY); ctx.lineTo(cLB, H); ctx.lineTo(0, H);
  ctx.fill();

  /* Right wall */
  const rw = ctx.createLinearGradient(VX, 0, W, 0);
  rw.addColorStop(0, '#080402'); rw.addColorStop(1, '#1c0d08');
  ctx.fillStyle = rw;
  ctx.beginPath();
  ctx.moveTo(W, 0); ctx.lineTo(cRT, 0); ctx.lineTo(cRT, VY); ctx.lineTo(cRB, H); ctx.lineTo(W, H);
  ctx.fill();

  /* Wall brick seams */
  for (let i = 1; i < 6; i++) {
    const y = (i / 6) * H;
    const t = (y - VY) / (H - VY);
    const lx = t >= 0 ? getX(t, true) : cLT;
    const rx = t >= 0 ? getX(t, false) : cRT;
    ctx.strokeStyle = 'rgba(70,30,15,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(lx, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(W, y); ctx.stroke();
  }

  /* Corridor edge lines */
  ctx.shadowColor = 'rgba(180,70,30,0.6)'; ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(160,60,25,0.85)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cLT, VY); ctx.lineTo(cLB, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cRT, VY); ctx.lineTo(cRB, H); ctx.stroke();
  ctx.shadowBlur = 0;

  /* Torches */
  const t0 = Date.now();
  const torches = [
    { x: W * 0.12, y: H * 0.33 }, { x: W * 0.88, y: H * 0.33 },
    { x: W * 0.08, y: H * 0.66 }, { x: W * 0.92, y: H * 0.66 },
  ];
  for (const { x, y } of torches) {
    const flicker = 0.7 + Math.sin(t0 * 0.006 + x) * 0.3;
    const r = 48 * flicker;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,150,40,${0.5 * flicker})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = `rgba(255,220,90,${0.95 * flicker})`;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  /* Vanishing point glow */
  const vpg = ctx.createRadialGradient(VX, VY, 0, VX, VY, 90);
  vpg.addColorStop(0, 'rgba(220,60,60,0.14)'); vpg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vpg; ctx.fillRect(0, 0, W, H);
}

/* ── Level Select ───────────────────────────────────────────── */
function LevelSelect({ words, onSelect }: { words: Word[]; onSelect: (lv: LevelDef) => void }) {
  return (
    <div className="min-h-screen pb-24 px-4 pt-8" style={{ background: 'radial-gradient(ellipse at top, #0d0428 0%, #030210 100%)' }}>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-white" style={{ textShadow: '0 0 24px rgba(167,139,250,0.6)' }}>
          ダンジョン・タイピング
        </h1>
        <p className="text-slate-500 text-sm mt-1">難易度を選んで冒険に出発！</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        {LEVELS.map(lv => {
          const available = wordsForLevel(words, lv.lv);
          const count = words.filter(w => diffOf(w.word) === lv.lv).length;
          return (
            <button key={lv.lv} onClick={() => onSelect(lv)}
              className="relative rounded-2xl p-4 text-left transition-all active:scale-95 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))`,
                border: `1.5px solid ${lv.color}44`,
                boxShadow: `0 0 20px ${lv.color}22`,
              }}>
              <div className="text-4xl mb-2">{lv.emoji}</div>
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
  const words = useWordStore(s => s.words);
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
  const [attackAnim, setAttackAnim] = useState<{ word: string; id: number } | null>(null);
  const [monsterHit, setMonsterHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [monsterHp, setMonsterHp] = useState(100);

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

  /* Canvas loop */
  function startCanvas() {
    stopCanvas();
    const loop = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const w = container.clientWidth, h = container.clientHeight || 200;
        if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
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
    setCombo(0); setQIdx(0); setMonsterHp(100); setPhase('playing');
    setTimeout(() => {
      startCanvas();
      setTimeout(() => beginQ(0, shuffled, lv), 200);
    }, 50);
  }

  function beginQ(idx: number, d: Word[], lv: LevelDef) {
    if (idx >= d.length) { clearTimer(); stopCanvas(); setPhase('victory'); return; }
    qIdxRef.current = idx; setQIdx(idx);
    setInput(''); setShowHint(false);
    monsterHpRef.current = 100; setMonsterHp(100);
    timeRef.current = lv.timeLimit; setTimeLeft(lv.timeLimit);
    setStatus('fighting'); statusRef.current = 'fighting';
    clearTimer();
    timerRef.current = setInterval(() => {
      const t = timeRef.current - 1; timeRef.current = t; setTimeLeft(t);
      if (t <= Math.ceil(lv.timeLimit * HINT_AT)) setShowHint(true);
      if (t <= 0) { clearTimer(); if (statusRef.current === 'fighting') takeDamage('timeout', idx, d, lv); }
    }, 1000);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  function takeDamage(reason: 'timeout' | 'wrong', idx: number, d: Word[], lv: LevelDef) {
    clearTimer();
    comboRef.current = 0; setCombo(0);
    const newHp = hpRef.current - 1; hpRef.current = newHp;
    setPlayerHit(true); setTimeout(() => setPlayerHit(false), 700);
    const st = reason === 'timeout' ? 'timeout' : 'wrong';
    setStatus(st); statusRef.current = st;
    if (newHp <= 0) {
      hpRef.current = 0; setHp(0);
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
      // Combo + score
      comboRef.current += 1; setCombo(comboRef.current);
      const mult = comboRef.current >= 6 ? 3.0 : comboRef.current >= 4 ? 2.0 : comboRef.current >= 2 ? 1.5 : 1.0;
      const pts = Math.round(levelRef.current.scoreBase * mult + timeRef.current * 8);
      scoreRef.current += pts; setScore(scoreRef.current);
      // Attack animation
      setAttackAnim({ word: current.word, id: Date.now() });
      setMonsterHit(true); setTimeout(() => setMonsterHit(false), 500);
      monsterHpRef.current = 0; setMonsterHp(0);
      setStatus('correct'); statusRef.current = 'correct';
      setTimeout(() => beginQ(qIdxRef.current + 1, deckRef.current, levelRef.current), 1600);
    }
    // wrong: no immediate action (timeout will penalize)
  }

  /* ── Phase: level select ── */
  if (phase === 'select') {
    return <LevelSelect words={words} onSelect={startLevel} />;
  }

  /* ── Phase: victory / defeat ── */
  if (phase === 'victory' || phase === 'defeat') {
    const win = phase === 'victory';
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pb-24"
        style={{ background: win ? 'radial-gradient(ellipse at top, #0d2808, #030210)' : 'radial-gradient(ellipse at top, #280808, #030210)' }}>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-3">{win ? '🏆' : '💀'}</div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: win ? '#86efac' : '#f87171' }}>
            {win ? 'ダンジョン制覇！' : '全滅…'}
          </h2>
          <p className="text-slate-500 text-sm mb-2">{level.emoji} {level.name} を{win ? '全て倒した' : '倒せなかった'}</p>
          <div className="text-4xl font-bold text-yellow-400 mb-2">{score}点</div>
          <div className="text-slate-400 text-sm mb-6">
            {qIdx}/{deck.length}問クリア　最大コンボ: ×{combo}
          </div>
          <div className="flex gap-3">
            <button onClick={() => startLevel(level)}
              className="flex-1 bg-violet-700 hover:bg-violet-600 text-white py-2.5 rounded-xl font-medium transition-all">
              再挑戦
            </button>
            <button onClick={() => setPhase('select')}
              className="flex-1 glass text-white py-2.5 rounded-xl font-medium transition-all">
              ステージ選択
            </button>
          </div>
        </motion.div>
        <NavBar />
      </div>
    );
  }

  /* ── Phase: playing ── */
  const current = deck[qIdx];
  const timerPct = (timeLeft / level.timeLimit) * 100;
  const timerColor = timerPct > 50 ? level.color : timerPct > 25 ? '#fbbf24' : '#f87171';
  const comboMult = combo >= 6 ? '×3.0' : combo >= 4 ? '×2.0' : combo >= 2 ? '×1.5' : null;

  return (
    <div className="min-h-screen flex flex-col pb-24 overflow-hidden relative select-none"
      style={{ background: 'radial-gradient(ellipse at top, #08031a 0%, #030210 100%)' }}>

      {/* Player damage flash */}
      <AnimatePresence>
        {playerHit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-600 pointer-events-none z-50" />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="px-4 pt-4 flex items-center justify-between shrink-0 relative z-10">
        <button onClick={() => { clearTimer(); stopCanvas(); setPhase('select'); }}
          className="text-slate-500 hover:text-white text-sm transition-all">← 戻る</button>
        <div className="flex gap-1">
          {Array.from({ length: MAX_HP }).map((_, i) => (
            <motion.span key={i} animate={playerHit && i === hp - 1 ? { scale: [1, 0.3, 1] } : {}}
              className={`text-lg ${i < hp ? 'text-red-400' : 'opacity-15'}`}
              style={i < hp ? { filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.7))' } : {}}>♥</motion.span>
          ))}
        </div>
        <span className="text-yellow-400 font-bold">{score}点</span>
      </div>

      {/* Stage info + combo */}
      <div className="px-4 mt-1 flex items-center justify-between shrink-0 relative z-10">
        <span className="text-xs text-slate-600">{level.emoji} {level.name}  {qIdx + 1}/{deck.length}</span>
        <AnimatePresence>
          {combo >= 2 && (
            <motion.span key={combo}
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="text-sm font-bold px-2 py-0.5 rounded-full"
              style={{
                background: combo >= 6 ? 'linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6)' : combo >= 4 ? 'rgba(251,191,36,0.3)' : 'rgba(167,139,250,0.3)',
                color: combo >= 6 ? '#fff' : combo >= 4 ? '#fbbf24' : '#a78bfa',
                boxShadow: combo >= 4 ? `0 0 12px ${level.color}66` : 'none',
              }}>
              COMBO ×{combo}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Dungeon canvas */}
      <div ref={containerRef} className="relative mx-3 mt-2 rounded-2xl overflow-hidden shrink-0" style={{ height: 200 }}>
        <canvas ref={canvasRef} className="absolute inset-0" style={{ display: 'block', width: '100%', height: '100%' }} />

        {/* Monster */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            animate={monsterHit ? { x: [-8, 8, -6, 6, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.4 }}>
            <div className="relative">
              {/* Monster HP bar */}
              <div className="w-24 h-2 bg-black/60 rounded-full mb-2 mx-auto overflow-hidden">
                <motion.div className="h-full rounded-full"
                  animate={{ width: `${monsterHp}%` }}
                  style={{ background: `linear-gradient(90deg, ${level.color}, ${level.color}99)` }} />
              </div>
              <div className="text-7xl" style={{
                filter: `drop-shadow(0 0 20px ${level.color}99)`,
                opacity: status === 'correct' ? 0.3 : 1,
                transition: 'opacity 0.3s',
              }}>{level.emoji}</div>
              {/* Hit flash */}
              {monsterHit && (
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
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="mt-3 text-xs text-slate-500 border border-slate-600 px-3 py-1 rounded-full">
                  Enter / タップで次へ
                </motion.div>
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

      {/* Timer bar */}
      <div className="px-4 mt-2 shrink-0 relative z-10">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600">残り時間</span>
          <span className="font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}秒</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            animate={{ width: `${timerPct}%`, backgroundColor: timerColor }}
            transition={{ duration: 0.9, ease: 'linear' }} />
        </div>
      </div>

      {/* Question */}
      <div className="px-4 mt-3 shrink-0 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div key={current?.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="rounded-xl border px-4 py-3 text-center"
            style={{ borderColor: `${level.color}44`, background: `${level.color}0d` }}>
            <p className="text-xs text-slate-500 mb-1">この意味の英単語を入力</p>
            {current?.definitionJa ? (
              <>
                <p className="text-white text-lg font-semibold leading-snug">{current.definitionJa}</p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">{current.definition}</p>
              </>
            ) : (
              <p className="text-white text-base">{current?.definition}</p>
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
      <form onSubmit={handleSubmit} className="px-4 mt-3 shrink-0 relative z-10">
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
