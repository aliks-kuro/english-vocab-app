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

        {/* Mode Buttons */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎮</span>
            <span className="text-indigo-200 text-sm font-semibold uppercase tracking-widest">学習モード</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(167,139,250,0.35)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {modes.map((m) => (
              <Link
                key={m.path}
                to={count === 0 && m.path !== '/list' ? '#' : m.path}
                onClick={(e) => { if (count === 0 && m.path !== '/list') e.preventDefault(); }}
                className="rounded-2xl p-5 flex flex-col gap-3 transition-all active:scale-95 hover:brightness-125"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1.5px solid rgba(255,255,255,0.14)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                  minHeight: '148px',
                  opacity: count === 0 ? 0.4 : 1,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span className="text-5xl leading-none">{m.icon}</span>
                <div className="flex-1 flex flex-col justify-end gap-0.5">
                  <span className="text-white font-bold text-base leading-tight">{m.label}</span>
                  <span className="text-slate-300 text-xs leading-snug">{m.desc}</span>
                </div>
              </Link>
            ))}
          </div>

          {count === 0 && (
            <p className="text-center text-indigo-300/50 text-xs mt-3">
              単語を追加するとゲームが解放されます
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
