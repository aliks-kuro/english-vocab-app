import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import { fetchWordDefinition, translateToJapanese, guessCategories } from '../utils/dictionaryApi';
import type { Word } from '../types';

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [autoAdd, setAutoAdd] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Word | null>(null);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const addWord = useWordStore((s) => s.addWord);
  const words = useWordStore((s) => s.words);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    setAdded(false);

    const searchWord = query.trim();
    setQuery('');
    const data = await fetchWordDefinition(searchWord);
    if (!data) {
      setError(`"${searchWord}" は見つかりませんでした`);
      setLoading(false);
      return;
    }

    const meaning = data.meanings[0];
    const def = meaning?.definitions[0];
    const definition = def?.definition ?? '';
    const example = def?.example;
    const phonetic = data.phonetics.find((p) => p.text)?.text;
    const defJa = await translateToJapanese(definition);
    const categories = guessCategories(data.word, definition);

    const word: Word = {
      id: crypto.randomUUID(),
      word: data.word ?? searchWord,
      phonetic,
      partOfSpeech: meaning?.partOfSpeech,
      definition,
      definitionJa: defJa,
      example,
      categories,
      known: false,
      addedAt: Date.now(),
    };

    setResult(word);
    setLoading(false);

    if (autoAdd) {
      addWord(word);
      setAdded(true);
    }
  }

  function handleAddToggle(word: Word) {
    const alreadyIn = words.some((w) => w.word.toLowerCase() === word.word.toLowerCase());
    if (alreadyIn) return;
    addWord(word);
    setAdded(true);
  }

  const alreadyAdded = result
    ? words.some((w) => w.word.toLowerCase() === result.word.toLowerCase())
    : false;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className="flex items-center glass rounded-2xl px-4 py-4 gap-3 focus-within:border-indigo-400 border border-white/15 transition-all"
          style={{ boxShadow: '0 2px 20px rgba(99,102,241,0.15)' }}>
          <span className="text-2xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="英単語を検索..."
            className="flex-1 bg-transparent outline-none text-white placeholder-slate-400 text-xl"
          />
          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <div
              onClick={() => setAutoAdd(!autoAdd)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer
                ${autoAdd ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}
            >
              {autoAdd && <span className="text-white text-xs leading-none">✓</span>}
            </div>
            <span className="text-slate-400 text-sm whitespace-nowrap">自動追加</span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-base font-medium transition-all disabled:opacity-50"
          >
            {loading ? '…' : '検索'}
          </button>
        </div>
      </form>

      {/* Auto-add explanation */}
      <p className="text-xs mt-2 px-1 leading-relaxed" style={{ color: 'rgba(165,180,252,0.65)' }}>
        <span style={{ color: 'rgba(165,180,252,0.9)' }}>自動追加</span>にチェックが入っていると、検索した単語を自動でマイリストに追加します。チェックを外すと追加されません。
      </p>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 glass rounded-2xl p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-white">{result.word}</h2>
                  {result.phonetic && (
                    <span className="text-slate-400 text-sm">{result.phonetic}</span>
                  )}
                  {result.partOfSpeech && (
                    <span className="text-indigo-400 text-sm italic">{result.partOfSpeech}</span>
                  )}
                </div>
                <p className="mt-2 text-slate-300">{result.definition}</p>
                {result.definitionJa && (
                  <p className="mt-1 text-indigo-300 text-sm">{result.definitionJa}</p>
                )}
                {result.example && (
                  <p className="mt-2 text-slate-500 text-sm italic">"{result.example}"</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.categories.map((c) => (
                    <span key={c} className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleAddToggle(result)}
                disabled={alreadyAdded || added}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
                  ${alreadyAdded || added
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
              >
                {alreadyAdded || added ? '✓ 追加済み' : '+ 追加'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
