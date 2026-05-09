import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import SearchBox from '../components/SearchBox';
import RecommendSection from '../components/RecommendSection';
import { useWordStore } from '../store/wordStore';

const modes = [
  { path: '/test',  icon: '📚', label: '単語テスト',  desc: 'フラッシュカード' },
  { path: '/game1', icon: '🎯', label: 'アナグラム',  desc: '文字を並べ替えて単語完成' },
  { path: '/game2', icon: '🚡', label: 'トロッコ',    desc: '正しい意味の分岐へ誘導' },
  { path: '/game3', icon: '⌨️', label: 'タイピング',  desc: '意味を見て英単語を入力' },
];

export default function Home() {
  const count = useWordStore((s) => s.words.length);
  const customCount = useWordStore((s) => s.words.filter(w => w.custom).length);
  const favoriteCount = useWordStore((s) => s.words.filter(w => w.favorite).length);
  const favoriteOnly = useWordStore((s) => s.favoriteOnly);
  const setFavoriteOnly = useWordStore((s) => s.setFavoriteOnly);

  return (
    <div className="min-h-screen pb-24" style={{ background: `
      radial-gradient(ellipse at 10% 10%,  rgba(124, 58,237,0.55) 0%, transparent 40%),
      radial-gradient(ellipse at 88%  8%,  rgba( 30, 64,175,0.50) 0%, transparent 35%),
      radial-gradient(ellipse at 80% 82%,  rgba(  6,182,212,0.30) 0%, transparent 40%),
      radial-gradient(ellipse at 12% 80%,  rgba(217, 70,239,0.35) 0%, transparent 38%),
      radial-gradient(ellipse at 50% 48%,  rgba( 16,185,129,0.12) 0%, transparent 50%),
      #07070f` }}>

      {/* Header */}
      <div className="pt-12 pb-6 px-5 text-center">
        <p className="text-xs tracking-[0.3em] text-white/40 uppercase mb-2">English Vocabulary</p>
        <h1 className="text-5xl font-black text-white tracking-tight"
          style={{ textShadow: '0 0 48px rgba(167,139,250,0.7), 0 2px 12px rgba(0,0,0,0.6)' }}>
          VocabMaster
        </h1>
        <p className="text-white/50 text-sm mt-2.5">英単語を楽しく覚えよう</p>
        {count > 0 && (
          <div className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-white/70 text-sm">{count}単語を登録中</span>
          </div>
        )}
      </div>

      <div className="px-4 space-y-6">

        {/* Search */}
        <SearchBox />

        {/* Manual add card */}
        <Link to="/add"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all active:scale-95 hover:brightness-125"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.12))',
            border: '1.5px solid rgba(16,185,129,0.35)',
            boxShadow: '0 4px 24px rgba(16,185,129,0.10), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.4)' }}>
            <span className="text-xl">✏️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">単語を手動追加</p>
            <p className="text-slate-400 text-xs mt-0.5">辞書にない単語や自分専用の単語を登録</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-0.5">
            {customCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.4)' }}>
                {customCount}語
              </span>
            )}
            <span className="text-emerald-400/60 text-sm">→</span>
          </div>
        </Link>

        {/* Mode Buttons */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎮</span>
            <span className="text-indigo-200 text-sm font-semibold uppercase tracking-widest">学習モード</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(167,139,250,0.35)' }} />
          </div>

          {/* Favorite-only toggle */}
          {count > 0 && (
            <button
              onClick={() => setFavoriteOnly(!favoriteOnly)}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 mb-3 transition-all active:scale-95"
              style={{
                background: favoriteOnly ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${favoriteOnly ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`,
              }}>
              <span className={`text-xl transition-all ${favoriteOnly ? 'text-yellow-400' : 'text-slate-600'}`}>
                {favoriteOnly ? '★' : '☆'}
              </span>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${favoriteOnly ? 'text-yellow-300' : 'text-slate-400'}`}>
                  お気に入り単語のみ出題
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {favoriteOnly
                    ? favoriteCount > 0
                      ? `${favoriteCount}語でゲームに挑戦`
                      : 'お気に入り登録された単語がありません'
                    : `お気に入り: ${favoriteCount}語`}
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full transition-all relative ${favoriteOnly ? 'bg-yellow-400' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${favoriteOnly ? 'left-5' : 'left-1'}`} />
              </div>
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            {modes.map((m) => {
              const disabled = count === 0 || (favoriteOnly && favoriteCount === 0);
              return (
                <Link
                  key={m.path}
                  to={disabled ? '#' : m.path}
                  onClick={(e) => { if (disabled) e.preventDefault(); }}
                  className="rounded-2xl p-5 flex flex-col gap-3 transition-all active:scale-95 hover:brightness-125"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1.5px solid rgba(255,255,255,0.14)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                    minHeight: '148px',
                    opacity: disabled ? 0.4 : 1,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="text-5xl leading-none">{m.icon}</span>
                  <div className="flex-1 flex flex-col justify-end gap-0.5">
                    <span className="text-white font-bold text-base leading-tight">{m.label}</span>
                    <span className="text-slate-300 text-xs leading-snug">{m.desc}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {count === 0 && (
            <p className="text-center text-indigo-300/50 text-xs mt-3">
              単語を追加するとゲームが解放されます
            </p>
          )}
          {count > 0 && favoriteOnly && favoriteCount === 0 && (
            <p className="text-center text-yellow-500/60 text-xs mt-3">
              ★ 単語にお気に入りを登録するとゲームが解放されます
            </p>
          )}
        </div>

        {/* Recommendations */}
        <RecommendSection />
      </div>

      <NavBar />
    </div>
  );
}
