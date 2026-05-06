import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import SearchBox from '../components/SearchBox';
import RecommendSection from '../components/RecommendSection';
import { useWordStore } from '../store/wordStore';

const modes = [
  { path: '/test', icon: '📚', label: '単語テスト', desc: 'フラッシュカード' },
  { path: '/game1', icon: '🎯', label: 'アナグラム', desc: 'ダンガンロンパ風' },
  { path: '/game2', icon: '🚀', label: 'レールゲーム', desc: 'ネプリーグ風' },
  { path: '/game3', icon: '⌨️', label: 'タイピング', desc: '漢字でGO!風' },
];

export default function Home() {
  const count = useWordStore((s) => s.words.length);

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="pt-10 pb-6 px-4 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          VocabMaster
        </h1>
        <p className="text-slate-500 text-sm mt-1">英単語学習アプリ</p>
        {count > 0 && (
          <p className="text-indigo-400 text-sm mt-1">{count}単語を登録中</p>
        )}
      </div>

      <div className="px-4 space-y-8 max-w-2xl mx-auto">
        {/* Search */}
        <SearchBox />

        {/* Mode Buttons */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-400 text-lg">🎮</span>
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">学習モード</h3>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {modes.map((m) => (
              <Link
                key={m.path}
                to={count === 0 && m.path !== '/list' ? '#' : m.path}
                onClick={(e) => {
                  if (count === 0 && m.path !== '/list') e.preventDefault();
                }}
                className={`glass rounded-xl p-4 flex flex-col gap-1 transition-all
                  ${count === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:border-indigo-500/50 hover:bg-white/10'}`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span className="text-white font-semibold text-sm">{m.label}</span>
                <span className="text-slate-500 text-xs">{m.desc}</span>
              </Link>
            ))}
          </div>
          {count === 0 && (
            <p className="text-center text-slate-600 text-xs mt-2">
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
