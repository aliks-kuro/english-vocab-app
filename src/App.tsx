import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import WordTest from './pages/WordTest';
import Game1Anagram from './pages/Game1Anagram';
import Game2Path from './pages/Game2Path';
import Game3Type from './pages/Game3Type';
import MyWordList from './pages/MyWordList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<WordTest />} />
        <Route path="/game1" element={<Game1Anagram />} />
        <Route path="/game2" element={<Game2Path />} />
        <Route path="/game3" element={<Game3Type />} />
        <Route path="/list" element={<MyWordList />} />
      </Routes>
    </BrowserRouter>
  );
}
