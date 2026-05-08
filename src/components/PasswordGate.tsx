import { useState } from 'react';

const SESSION_KEY = 'vocab_auth';
const EXPECTED = import.meta.env.VITE_ACCESS_PASSWORD as string | undefined;

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => {
    if (!EXPECTED) return true;
    return sessionStorage.getItem(SESSION_KEY) === EXPECTED;
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (authed) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === EXPECTED) {
      sessionStorage.setItem(SESSION_KEY, EXPECTED!);
      setAuthed(true);
    } else {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 1500);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-2xl font-bold text-white text-center mb-2">VocabMaster</h1>
        <p className="text-gray-400 text-center text-sm mb-6">パスワードを入力してください</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-500 outline-none transition border-2 ${
              error ? 'border-red-500' : 'border-transparent focus:border-blue-500'
            }`}
          />
          {error && (
            <p className="text-red-400 text-sm text-center -mt-2">パスワードが違います</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold transition"
          >
            入る
          </button>
        </form>
      </div>
    </div>
  );
}
