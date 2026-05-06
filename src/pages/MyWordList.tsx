import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWordStore } from '../store/wordStore';
import NavBar from '../components/NavBar';

type Filter = 'all' | 'known' | 'unknown';

export default function MyWordList() {
  const { words, removeWord, updateWord, resetKnownStatus } = useWordStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDef, setEditDef] = useState('');
  const [editDefJa, setEditDefJa] = useState('');

  const filtered = words.filter((w) => {
    if (filter === 'known' && !w.known) return false;
    if (filter === 'unknown' && w.known) return false;
    if (search && !w.word.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const knownCount = words.filter((w) => w.known).length;

  function startEdit(id: string, def: string, defJa: string | undefined) {
    setEditing(id);
    setEditDef(def);
    setEditDefJa(defJa ?? '');
  }

  function saveEdit(id: string) {
    updateWord(id, { definition: editDef.trim(), definitionJa: editDefJa.trim() || undefined });
    setEditing(null);
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-white">マイ単語リスト</h1>
        <p className="text-slate-500 text-sm mt-1">{words.length}単語　覚えた: {knownCount}</p>
      </div>

      {/* Search + filter */}
      <div className="px-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="単語を検索..."
          className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none border border-white/10 focus:border-indigo-500 transition-all"
        />
        <div className="flex gap-2">
          {(['all', 'unknown', 'known'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-all
                ${filter === f ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
            >
              {f === 'all' ? `全て(${words.length})` : f === 'known' ? `覚えた(${knownCount})` : `要復習(${words.length - knownCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Word list */}
      <div className="px-4 mt-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-slate-600 py-12">
            {words.length === 0 ? (
              <>
                <p className="text-4xl mb-3">📝</p>
                <p>まだ単語がありません</p>
                <p className="text-sm mt-1">ホームで単語を検索して追加しましょう</p>
              </>
            ) : (
              <p>該当する単語がありません</p>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((word) => (
              <motion.div
                key={word.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`glass rounded-xl overflow-hidden border ${word.known ? 'border-green-500/30' : 'border-white/10'}`}
              >
                <button
                  onClick={() => {
                    if (editing === word.id) return;
                    setExpanded(expanded === word.id ? null : word.id);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${word.known ? 'bg-green-400' : 'bg-slate-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-white">{word.word}</span>
                      {word.phonetic && (
                        <span className="text-slate-500 text-xs">{word.phonetic}</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm truncate">
                      {word.definitionJa ?? word.definition}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1">
                      {word.categories.slice(0, 1).map((c) => (
                        <span key={c} className="text-xs bg-white/10 text-slate-500 px-1.5 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                    <span className="text-slate-600 text-xs">{expanded === word.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {expanded === word.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-2">
                        {word.partOfSpeech && (
                          <span className="text-indigo-400 text-xs italic">{word.partOfSpeech}</span>
                        )}

                        {editing === word.id ? (
                          /* ── Edit mode ── */
                          <div className="space-y-2">
                            <div>
                              <p className="text-slate-500 text-xs mb-1">英語の意味</p>
                              <textarea
                                value={editDef}
                                onChange={e => setEditDef(e.target.value)}
                                rows={2}
                                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500 resize-none transition-all"
                              />
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs mb-1">日本語の意味</p>
                              <textarea
                                value={editDefJa}
                                onChange={e => setEditDefJa(e.target.value)}
                                rows={2}
                                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500 resize-none transition-all"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => saveEdit(word.id)}
                                disabled={!editDef.trim()}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-1.5 rounded-lg text-sm font-medium transition-all"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditing(null)}
                                className="flex-1 glass hover:bg-white/10 text-slate-400 py-1.5 rounded-lg text-sm transition-all"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── View mode ── */
                          <>
                            <p className="text-slate-300 text-sm">{word.definition}</p>
                            {word.definitionJa && (
                              <p className="text-indigo-300 text-sm">{word.definitionJa}</p>
                            )}
                            {word.example && (
                              <p className="text-slate-500 text-xs italic">"{word.example}"</p>
                            )}
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => startEdit(word.id, word.definition, word.definitionJa)}
                                className="text-indigo-400/70 hover:text-indigo-400 text-xs transition-all"
                              >
                                編集
                              </button>
                              <span className="text-slate-700">|</span>
                              <button
                                onClick={() => removeWord(word.id)}
                                className="text-red-400/70 hover:text-red-400 text-xs transition-all"
                              >
                                削除
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Reset button */}
      {words.length > 0 && (
        <div className="px-4 mt-6 text-center">
          <button
            onClick={() => resetKnownStatus()}
            className="text-slate-600 hover:text-slate-400 text-sm transition-all"
          >
            覚えた/未覚えをリセット
          </button>
        </div>
      )}

      <NavBar />
    </div>
  );
}
