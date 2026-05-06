import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import { getRecommendations } from '../utils/recommendations';
import type { RecommendedWord, Word } from '../types';

export default function RecommendSection() {
  const { words, addWord } = useWordStore();
  const [recs, setRecs] = useState<RecommendedWord[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRecs(getRecommendations(words, 6));
  }, []);

  function handleCheck(rec: RecommendedWord) {
    const word: Word = {
      id: crypto.randomUUID(),
      word: rec.word,
      definition: rec.definition,
      definitionJa: rec.definitionJa,
      example: rec.example,
      categories: rec.categories,
      known: false,
      addedAt: Date.now(),
    };
    addWord(word);
    setDismissed((prev) => new Set([...prev, rec.word]));
  }

  function handleX(rec: RecommendedWord) {
    setDismissed((prev) => new Set([...prev, rec.word]));
  }

  const visible = recs.filter((r) => !dismissed.has(r.word));

  if (visible.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-purple-400 text-lg">✨</span>
        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">
          AIリコメンド
        </h3>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <AnimatePresence>
          {visible.map((rec) => (
            <motion.div
              key={rec.word}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="glass rounded-xl p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white">{rec.word}</span>
                  <div className="flex gap-1">
                    {rec.categories.slice(0, 2).map((c) => (
                      <span key={c} className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-slate-400 text-sm truncate">{rec.definitionJa}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleCheck(rec)}
                  className="w-9 h-9 rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-400 text-lg flex items-center justify-center transition-all"
                  title="追加"
                >
                  ✓
                </button>
                <button
                  onClick={() => handleX(rec)}
                  className="w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 text-lg flex items-center justify-center transition-all"
                  title="スキップ"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
