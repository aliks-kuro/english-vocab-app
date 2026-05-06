import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import type { Word } from '../types';
import NavBar from '../components/NavBar';

export default function WordTest() {
  const navigate = useNavigate();
  const { words, markKnown, markUnknown } = useWordStore();
  const [deck, setDeck] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (words.length === 0) {
      navigate('/');
      return;
    }
    setDeck([...words].sort(() => Math.random() - 0.5));
  }, []);

  const current = deck[index];

  const handleKnown = useCallback(() => {
    if (!current || direction) return;
    setDirection('left');
    markKnown(current.id);
    setKnown((k) => [...k, current.id]);
    setTimeout(() => {
      setDirection(null);
      setFlipped(false);
      if (index + 1 >= deck.length) setFinished(true);
      else setIndex((i) => i + 1);
    }, 350);
  }, [current, direction, index, deck.length]);

  const handleUnknown = useCallback(() => {
    if (!current || direction) return;
    setDirection('right');
    markUnknown(current.id);
    setUnknown((u) => [...u, current.id]);
    setTimeout(() => {
      setDirection(null);
      setFlipped(false);
      if (index + 1 >= deck.length) setFinished(true);
      else setIndex((i) => i + 1);
    }, 350);
  }, [current, direction, index, deck.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') handleKnown();
      if (e.key === 'ArrowRight') handleUnknown();
      if (e.key === ' ' || e.key === 'Enter') setFlipped((f) => !f);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKnown, handleUnknown]);

  function restart() {
    setDeck([...words].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setUnknown([]);
    setFinished(false);
    setDirection(null);
  }

  if (finished || !current) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-4 pb-24">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-2xl p-8 text-center max-w-sm w-full"
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">完了！</h2>
          <p className="text-slate-400 mb-6">{deck.length}枚のカードを確認しました</p>
          <div className="flex gap-4 justify-center mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{known.length}</div>
              <div className="text-slate-500 text-sm">覚えた</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{unknown.length}</div>
              <div className="text-slate-500 text-sm">要復習</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={restart} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-medium transition-all">
              もう一度
            </button>
            <button onClick={() => navigate('/')} className="flex-1 glass hover:bg-white/10 text-white py-2.5 rounded-xl font-medium transition-all">
              ホーム
            </button>
          </div>
        </motion.div>
        <NavBar />
      </div>
    );
  }

  const progress = (index / deck.length) * 100;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col pb-24">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white transition-all">
          ← 戻る
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{index + 1} / {deck.length}</span>
            <span>覚えた: {known.length}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: direction === 'left' ? 100 : direction === 'right' ? -100 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              x: direction === 'left' ? -150 : direction === 'right' ? 150 : 0,
              rotate: direction === 'left' ? -15 : direction === 'right' ? 15 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm"
          >
            <div
              className="flip-card w-full"
              style={{ height: '340px' }}
              onClick={() => setFlipped((f) => !f)}
            >
              <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
                {/* Front */}
                <div className="flip-card-front glass flex flex-col items-center justify-center p-6 cursor-pointer select-none">
                  <div className="text-slate-500 text-xs mb-4 uppercase tracking-widest">単語</div>
                  <h2 className="text-4xl font-bold text-white mb-2">{current.word}</h2>
                  {current.phonetic && (
                    <p className="text-slate-400 text-sm mb-2">{current.phonetic}</p>
                  )}
                  {current.partOfSpeech && (
                    <p className="text-indigo-400 text-sm italic">{current.partOfSpeech}</p>
                  )}
                  <div className="mt-6 flex items-center gap-1 text-slate-600 text-xs">
                    <span>クリックまたはスペースキーで裏返す</span>
                  </div>
                </div>
                {/* Back */}
                <div className="flip-card-back glass flex flex-col items-center justify-center p-6 cursor-pointer select-none bg-indigo-900/30">
                  <div className="text-slate-500 text-xs mb-3 uppercase tracking-widest">意味</div>
                  <p className="text-white text-center text-base leading-relaxed mb-2">{current.definition}</p>
                  {current.definitionJa && (
                    <p className="text-indigo-300 text-sm text-center mb-3">{current.definitionJa}</p>
                  )}
                  {current.example && (
                    <p className="text-slate-500 text-xs text-center italic mt-2">"{current.example}"</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Hint */}
        {!flipped && (
          <p className="text-slate-600 text-xs mt-4">クリックして意味を確認</p>
        )}
      </div>

      {/* Buttons */}
      <div className="px-6 pb-4 flex gap-4 max-w-sm mx-auto w-full">
        <button
          onClick={handleKnown}
          className="flex-1 bg-green-600/80 hover:bg-green-500 text-white py-4 rounded-2xl font-semibold text-base transition-all flex flex-col items-center gap-1"
        >
          <span className="text-xl">←</span>
          <span className="text-sm">覚えた</span>
        </button>
        <button
          onClick={handleUnknown}
          className="flex-1 bg-red-600/80 hover:bg-red-500 text-white py-4 rounded-2xl font-semibold text-base transition-all flex flex-col items-center gap-1"
        >
          <span className="text-xl">→</span>
          <span className="text-sm">要復習</span>
        </button>
      </div>
      <p className="text-center text-slate-600 text-xs pb-2">← → キーでも操作できます</p>

      <NavBar />
    </div>
  );
}
