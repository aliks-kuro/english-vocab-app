import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import NavBar from '../components/NavBar';

const POS_OPTIONS = ['名詞', '動詞', '形容詞', '副詞', '前置詞', '接続詞', 'その他'];

export default function AddWord() {
  const navigate = useNavigate();
  const addWord = useWordStore(s => s.addWord);
  const words = useWordStore(s => s.words);

  const [word, setWord] = useState('');
  const [definitionJa, setDefinitionJa] = useState('');
  const [definition, setDefinition] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const trimmedWord = word.trim();
  const alreadyExists = !!trimmedWord &&
    words.some(w => w.word.toLowerCase() === trimmedWord.toLowerCase());

  function commitTag() {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTag(); }
    if (e.key === 'Backspace' && tagInput === '')
      setTags(prev => prev.slice(0, -1));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmedWord || !definitionJa.trim()) {
      setError('英単語と日本語訳は必須です'); return;
    }
    if (alreadyExists) { setError('この単語はすでに登録されています'); return; }

    // commit any uncommitted tag input
    const finalTags = tagInput.trim().replace(/^#/, '')
      ? [...new Set([...tags, tagInput.trim().replace(/^#/, '')])]
      : tags;

    addWord({
      id: crypto.randomUUID(),
      word: trimmedWord,
      partOfSpeech: partOfSpeech || undefined,
      definition: definition.trim() || definitionJa.trim(),
      definitionJa: definitionJa.trim(),
      categories: [],
      tags: finalTags,
      custom: true,
      known: false,
      addedAt: Date.now(),
    });

    setAdded(true);
    setError('');
    setWord(''); setDefinitionJa(''); setDefinition('');
    setPartOfSpeech(''); setTags([]); setTagInput('');
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-8" style={{ background: `
      radial-gradient(ellipse at 20% 10%, rgba(16,185,129,0.35) 0%, transparent 42%),
      radial-gradient(ellipse at 82% 12%, rgba(99,102,241,0.35) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 85%, rgba(217,70,239,0.20) 0%, transparent 40%),
      radial-gradient(ellipse at 18% 85%, rgba(6,182,212,0.18) 0%, transparent 38%),
      #06060f` }}>

      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/')}
            className="text-slate-500 hover:text-white text-sm transition-all mb-4 block">
            ← ホームへ戻る
          </button>
          <h1 className="text-2xl font-bold text-white">単語を手動追加</h1>
          <p className="text-slate-500 text-sm mt-1">辞書にない単語や自分専用の単語を登録できます</p>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {added && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}>
              <span className="text-green-400 text-lg">✓</span>
              <span className="text-green-300 text-sm font-medium">単語を追加しました！引き続き追加できます。</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* English word */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              英単語 <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={word}
              onChange={e => { setWord(e.target.value); setError(''); }}
              placeholder="例: serendipity"
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
              className="w-full glass rounded-xl px-4 py-3 text-white text-xl font-mono placeholder-slate-600 outline-none border border-white/10 focus:border-emerald-500/60 transition-all"
            />
            {alreadyExists && (
              <p className="text-yellow-400/70 text-xs mt-1">この単語はすでに登録されています</p>
            )}
          </div>

          {/* Japanese */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              日本語の意味 <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={definitionJa}
              onChange={e => { setDefinitionJa(e.target.value); setError(''); }}
              placeholder="例: 思いがけない幸運"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none border border-white/10 focus:border-emerald-500/60 transition-all"
            />
          </div>

          {/* English definition */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              英語の意味
              <span className="text-slate-600 font-normal normal-case tracking-normal ml-1">(任意)</span>
            </label>
            <input
              type="text" value={definition}
              onChange={e => setDefinition(e.target.value)}
              placeholder="例: the occurrence of happy events by chance"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none border border-white/10 focus:border-emerald-500/60 transition-all"
            />
          </div>

          {/* Part of speech */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              品詞
              <span className="text-slate-600 font-normal normal-case tracking-normal ml-1">(任意)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {POS_OPTIONS.map(p => (
                <button key={p} type="button"
                  onClick={() => setPartOfSpeech(partOfSpeech === p ? '' : p)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-all"
                  style={{
                    background: partOfSpeech === p ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${partOfSpeech === p ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.1)'}`,
                    color: partOfSpeech === p ? '#c4b5fd' : '#64748b',
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              タグ
              <span className="text-slate-600 font-normal normal-case tracking-normal ml-1">
                (任意 — Enter / カンマで追加)
              </span>
            </label>
            <div className="glass rounded-xl border border-white/10 focus-within:border-emerald-500/60 transition-all px-3 py-2.5 min-h-[48px]">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {tags.map(t => (
                  <span key={t}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7' }}>
                    #{t}
                    <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}
                      className="hover:text-white transition-all leading-none ml-0.5">×</button>
                  </span>
                ))}
              </div>
              <input
                type="text" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={commitTag}
                placeholder={tags.length === 0 ? 'TOEIC, ビジネス, 日常… (Enterで追加)' : '追加…'}
                className="bg-transparent outline-none text-white placeholder-slate-600 text-sm w-full"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!trimmedWord || !definitionJa.trim() || alreadyExists}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-40 active:scale-98"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.65), rgba(6,182,212,0.55))',
              border: '1px solid rgba(16,185,129,0.5)',
              boxShadow: '0 0 24px rgba(16,185,129,0.22)',
              color: '#fff',
            }}>
            ＋ マイリストに追加
          </button>
        </form>

        {/* Link to list */}
        <p className="text-center mt-4">
          <button onClick={() => navigate('/list')}
            className="text-slate-600 hover:text-slate-400 text-xs transition-all">
            マイリストを見る →
          </button>
        </p>
      </div>

      <NavBar />
    </div>
  );
}
