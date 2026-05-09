import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import WordTest from './pages/WordTest';
import Game1Anagram from './pages/Game1Anagram';
import Game2Path from './pages/Game2Path';
import Game3Type from './pages/Game3Type';
import MyWordList from './pages/MyWordList';
import AddWord from './pages/AddWord';
import { useWordStore } from './store/wordStore';
import { setSoundEnabled } from './utils/sound';

function SoundToggle() {
  const soundEnabled = useWordStore(s => s.soundEnabled);
  const toggleSound = useWordStore(s => s.toggleSound);

  useEffect(() => setSoundEnabled(soundEnabled), [soundEnabled]);

  return (
    <button
      onClick={toggleSound}
      className="fixed bottom-[4.75rem] right-3 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.14)',
        backdropFilter: 'blur(8px)',
      }}
      title={soundEnabled ? 'サウンドオフ' : 'サウンドオン'}
    >
      <span className="text-base leading-none">{soundEnabled ? '🔊' : '🔇'}</span>
    </button>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SoundToggle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<WordTest />} />
        <Route path="/game1" element={<Game1Anagram />} />
        <Route path="/game2" element={<Game2Path />} />
        <Route path="/game3" element={<Game3Type />} />
        <Route path="/list" element={<MyWordList />} />
        <Route path="/add" element={<AddWord />} />
      </Routes>
    </BrowserRouter>
  );
}
