import { Link, useLocation } from 'react-router-dom';
import { useWordStore } from '../store/wordStore';

const navItems = [
  { path: '/', label: 'ホーム', icon: '🏠' },
  { path: '/test', label: '単語テスト', icon: '📚' },
  { path: '/game1', label: 'アナグラム', icon: '🎯' },
  { path: '/game2', label: 'レールゲーム', icon: '🚀' },
  { path: '/game3', label: 'タイピング', icon: '⌨️' },
  { path: '/list', label: 'マイリスト', icon: '📝' },
];

export default function NavBar() {
  const location = useLocation();
  const count = useWordStore((s) => s.words.length);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all text-xs
                ${active ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="leading-none">
                {path === '/list' ? `${label}(${count})` : label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
