import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import NavBar from '../components/NavBar';

interface Tile {
  id: string;
  char: string;
}

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const TIME_LIMIT = 30;
const MAX_LIVES = 5;

export default function Game1Anagram() {
  const navigate = useNavigate();
  const words = useWordStore((s) => s.words);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameStatus, setGameStatus] = useState<'playing' | 'correct' | 'timeout' | 'gameover' | 'finished'>('playing');
  const [showBigX, setShowBigX] = useState(false);
  const [shakeLives, setShakeLives] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [selectedChars, setSelectedChars] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const shuffledWords = useRef<typeof words>([]);
  const gameoverWordRef = useRef<(typeof words)[0] | null>(null);

  // Refs for stale-closure-safe callbacks
  const physicsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());
  const domRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const livesRef = useRef(MAX_LIVES);
  const qIdxRef = useRef(0);
  const statusRef = useRef<typeof gameStatus>('playing');
  const selectedRef = useRef<string[]>([]);
  const targetWordRef = useRef('');
  const timeLeftRef = useRef(TIME_LIMIT);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (words.length === 0) { navigate('/'); return; }
    shuffledWords.current = [...words].sort(() => Math.random() - 0.5);
    loadQuestion(0);
    return () => { clearTimer(); stopAnim(); };
  }, []);

  /* ── Animation loop (direct DOM, no React re-render) ── */
  function startAnim() {
    stopAnim();
    const TILE = 64;
    const loop = () => {
      const area = areaRef.current;
      if (!area) { animRef.current = requestAnimationFrame(loop); return; }
      const W = area.clientWidth;
      const H = area.clientHeight;
      for (const [id, p] of physicsRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        if (p.x >= W - TILE) { p.x = W - TILE; p.vx = -Math.abs(p.vx); }
        if (p.y <= 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        if (p.y >= H - TILE) { p.y = H - TILE; p.vy = -Math.abs(p.vy); }
        const el = domRefs.current.get(id);
        if (el) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; }
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }

  function stopAnim() {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }

  /* ── Load a question ── */
  function loadQuestion(idx: number) {
    if (idx >= shuffledWords.current.length) {
      stopAnim(); clearTimer();
      setGameStatus('finished'); statusRef.current = 'finished';
      return;
    }
    const word = shuffledWords.current[idx].word.toLowerCase();
    targetWordRef.current = word;

    const wordChars = word.split('');
    const extraCount = Math.max(8, wordChars.length + 4);
    const extras = Array.from({ length: extraCount }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]);

    const allTiles: Tile[] = shuffle([
      ...wordChars.map((c, i) => ({ id: `w${i}-${rnd()}`, char: c })),
      ...extras.map((c, i) => ({ id: `e${i}-${rnd()}`, char: c })),
    ]);

    physicsRef.current.clear();
    domRefs.current.clear();
    const W = areaRef.current?.clientWidth ?? 320;
    const H = areaRef.current?.clientHeight ?? 220;
    for (const tile of allTiles) {
      const x = 4 + Math.random() * (W - 68);
      const y = 4 + Math.random() * (H - 68);
      const spd = 0.35 + Math.random() * 0.75;
      const ang = Math.random() * Math.PI * 2;
      physicsRef.current.set(tile.id, { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd });
    }

    setTiles(allTiles);
    setRemovedIds(new Set());
    setSelectedChars([]);
    selectedRef.current = [];
    setTimeLeft(TIME_LIMIT);
    timeLeftRef.current = TIME_LIMIT;
    setGameStatus('playing'); statusRef.current = 'playing';

    clearTimer();
    startTimer(idx);
    setTimeout(() => startAnim(), 60);
  }

  function startTimer(idx: number) {
    timerRef.current = setInterval(() => {
      const t = timeLeftRef.current - 1;
      timeLeftRef.current = t;
      setTimeLeft(t);
      if (t <= 0) {
        clearTimer();
        if (statusRef.current === 'playing') {
          stopAnim();
          setGameStatus('timeout'); statusRef.current = 'timeout';
          setTimeout(() => advance(idx + 1), 1600);
        }
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function advance(nextIdx: number) {
    qIdxRef.current = nextIdx;
    setQuestionIdx(nextIdx);
    loadQuestion(nextIdx);
  }

  /* ── Tile click ── */
  function handleTileClick(tile: Tile) {
    if (statusRef.current !== 'playing') return;

    const pos = selectedRef.current.length;
    const target = targetWordRef.current;

    if (tile.char === target[pos]) {
      // Correct letter!
      const newSelected = [...selectedRef.current, tile.char];
      selectedRef.current = newSelected;
      setSelectedChars([...newSelected]);
      setRemovedIds((prev) => new Set([...prev, tile.id]));

      if (newSelected.length === target.length) {
        // Word complete!
        clearTimer(); stopAnim();
        const pts = 100;
        scoreRef.current += pts;
        setScore(scoreRef.current);
        setGameStatus('correct'); statusRef.current = 'correct';
        setTimeout(() => advance(qIdxRef.current + 1), 1500);
      }
    } else {
      // Wrong character!
      setShowBigX(true);
      setShakeLives(true);
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;

      setTimeout(() => {
        setShowBigX(false);
        setShakeLives(false);
        if (newLives < 0) {
          // 6th miss = game over
          livesRef.current = 0;
          setLives(0);
          clearTimer(); stopAnim();
          gameoverWordRef.current = shuffledWords.current[qIdxRef.current];
          setGameStatus('gameover'); statusRef.current = 'gameover';
        } else {
          setLives(newLives);
        }
      }, 800);
    }
  }

  function restartGame() {
    livesRef.current = MAX_LIVES; qIdxRef.current = 0;
    selectedRef.current = []; targetWordRef.current = '';
    timeLeftRef.current = TIME_LIMIT; statusRef.current = 'playing';
    scoreRef.current = 0;
    setLives(MAX_LIVES); setScore(0); setQuestionIdx(0); setShowBigX(false);
    shuffledWords.current = [...words].sort(() => Math.random() - 0.5);
    loadQuestion(0);
  }

  /* ── End screens ── */
  if (gameStatus === 'gameover') {
    const gw = gameoverWordRef.current;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pb-24" style={{ background: '#030310' }}>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-3">💀</div>
          <h2 className="text-2xl font-bold text-red-400 mb-1">ゲームオーバー</h2>
          <div className="text-3xl font-bold text-yellow-400 mb-4">{score}点</div>
          {gw && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4 mb-5 text-left space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest">問題の単語</p>
              <p className="text-white text-2xl font-bold">{gw.word}</p>
              {gw.phonetic && <p className="text-slate-500 text-sm">{gw.phonetic}</p>}
              <p className="text-slate-300 text-sm mt-1">{gw.definition}</p>
              {gw.definitionJa && <p className="text-indigo-300 text-sm">{gw.definitionJa}</p>}
              {gw.example && <p className="text-slate-500 text-xs italic mt-1">"{gw.example}"</p>}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={restartGame} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-medium transition-all">もう一度</button>
            <button onClick={() => navigate('/')} className="flex-1 glass text-white py-2.5 rounded-xl font-medium transition-all">ホーム</button>
          </div>
        </motion.div>
        <NavBar />
      </div>
    );
  }

  if (gameStatus === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pb-24" style={{ background: '#030310' }}>
        <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-2">ゲームクリア！</h2>
          <div className="text-4xl font-bold text-yellow-400 mb-6">{score}点</div>
          <div className="flex gap-3">
            <button onClick={restartGame} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-medium transition-all">もう一度</button>
            <button onClick={() => navigate('/')} className="flex-1 glass text-white py-2.5 rounded-xl font-medium transition-all">ホーム</button>
          </div>
        </div>
        <NavBar />
      </div>
    );
  }

  const currentWordData = shuffledWords.current[questionIdx];
  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const displayLives = Math.max(0, lives);

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: 'radial-gradient(ellipse at top, #08082a 0%, #030310 100%)' }}>
      {/* Header */}
      <div className="px-4 pt-5 flex items-center justify-between">
        <button onClick={() => { clearTimer(); stopAnim(); navigate('/'); }} className="text-slate-500 hover:text-white text-sm transition-all">← 終了</button>
        <motion.div animate={shakeLives ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.5 }} className="flex gap-1.5">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className={`text-xl transition-all duration-300 ${i < displayLives ? 'text-red-400' : 'opacity-15'}`}
              style={i < displayLives ? { filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.7))' } : {}}>♥</span>
          ))}
        </motion.div>
        <div className="flex gap-3 items-center">
          <span className="text-yellow-400 font-bold">{score}点</span>
          <span className="text-slate-600 text-sm">{questionIdx + 1}/{shuffledWords.current.length}</span>
        </div>
      </div>

      {/* Timer */}
      <div className="px-4 mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600">残り時間</span>
          <span className={`font-bold tabular-nums ${timeLeft <= 7 ? 'text-red-400' : 'text-slate-400'}`}>{timeLeft}秒</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${timeLeft > 15 ? 'bg-blue-500' : timeLeft > 7 ? 'bg-yellow-500' : 'bg-red-500'}`}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="px-4 mt-3">
        {currentWordData && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/30 p-3 text-center">
            <p className="text-slate-400 text-xs leading-relaxed">{currentWordData.definition}</p>
            {currentWordData.definitionJa && (
              <p className="text-blue-300 text-sm font-medium mt-1">{currentWordData.definitionJa}</p>
            )}
          </div>
        )}
      </div>

      {/* Answer slots */}
      <div className="mx-4 mt-2 h-12 rounded-xl border border-blue-500/20 bg-blue-950/20 flex items-center px-3 gap-1.5 overflow-hidden">
        <AnimatePresence>
          {selectedChars.length > 0 ? (
            selectedChars.map((ch, i) => (
              <motion.div key={i}
                initial={{ scale: 0.3, opacity: 0, y: -12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-8 h-8 shrink-0 rounded-lg font-bold text-sm uppercase flex items-center justify-center text-white"
                style={{ background: 'rgba(37,99,235,0.8)', boxShadow: '0 0 12px rgba(59,130,246,0.7)' }}>
                {ch}
              </motion.div>
            ))
          ) : (
            <span className="text-slate-600 text-xs">正しいアルファベットを順番にクリック！</span>
          )}
        </AnimatePresence>
        {selectedChars.length > 0 && (
          <div className="ml-auto flex gap-1 shrink-0">
            {Array.from({ length: targetWordRef.current.length }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < selectedChars.length ? 'bg-blue-400' : 'bg-white/10'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Play area */}
      <div ref={areaRef} className="flex-1 relative mx-4 mt-2 rounded-2xl overflow-hidden" style={{ minHeight: 200, background: 'radial-gradient(ellipse at center, #070720 0%, #020210 100%)' }}>
        {/* Big ✕ */}
        <AnimatePresence>
          {showBigX && (
            <motion.div
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            >
              <span style={{ fontSize: '11rem', lineHeight: 1, fontWeight: 900, color: '#ef4444',
                textShadow: '0 0 40px rgba(239,68,68,1), 0 0 80px rgba(239,68,68,0.6), 0 0 160px rgba(239,68,68,0.3)' }}>
                ✕
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status overlays */}
        <AnimatePresence>
          {gameStatus === 'correct' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-20 bg-green-900/60">
              <div className="text-center">
                <div className="text-5xl">🎉</div>
                <div className="text-2xl font-bold text-green-300 mt-2" style={{ textShadow: '0 0 20px rgba(134,239,172,0.8)' }}>正解！</div>
              </div>
            </motion.div>
          )}
          {gameStatus === 'timeout' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/70">
              <div className="text-center">
                <div className="text-xl font-bold text-slate-300">⏰ 時間切れ</div>
                <div className="text-slate-500 text-sm mt-1">正解: {targetWordRef.current}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Moving tiles */}
        {tiles.filter((t) => !removedIds.has(t.id)).map((tile) => {
          const p = physicsRef.current.get(tile.id);
          return (
            <button
              key={tile.id}
              ref={(el) => {
                if (el) {
                  domRefs.current.set(tile.id, el);
                  if (p) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; }
                } else { domRefs.current.delete(tile.id); }
              }}
              onClick={() => handleTileClick(tile)}
              className="absolute w-16 h-16 rounded-full font-bold text-2xl uppercase flex items-center justify-center cursor-pointer select-none active:scale-95"
              style={{
                color: '#bfdbfe',
                background: 'rgba(30, 64, 175, 0.65)',
                border: '1px solid rgba(96, 165, 250, 0.5)',
                boxShadow: '0 0 10px rgba(59,130,246,0.6), 0 0 22px rgba(59,130,246,0.25)',
                textShadow: '0 0 8px rgba(147,197,253,0.9)',
              }}
            >
              {tile.char}
            </button>
          );
        })}
      </div>

      <div className="text-center mt-2 mb-1">
        <button onClick={() => {
          clearTimer(); stopAnim();
          setGameStatus('timeout'); statusRef.current = 'timeout';
          setTimeout(() => advance(qIdxRef.current + 1), 300);
        }} className="text-slate-700 hover:text-slate-500 text-xs transition-all">
          スキップ →
        </button>
      </div>

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
function rnd() { return Math.random().toString(36).slice(2, 8); }
