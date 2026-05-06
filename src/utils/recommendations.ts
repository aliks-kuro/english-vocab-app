import type { Word, RecommendedWord } from '../types';
import { WORD_DATABASE } from './wordDatabase';

export function getRecommendations(userWords: Word[], count = 5): RecommendedWord[] {
  if (userWords.length === 0) {
    // No words yet → return random selection
    return shuffle(WORD_DATABASE).slice(0, count);
  }

  // Count category frequencies in user's word list
  const catCount: Record<string, number> = {};
  for (const w of userWords) {
    for (const c of w.categories) {
      catCount[c] = (catCount[c] ?? 0) + 1;
    }
  }

  // Sort categories by frequency
  const topCats = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const userWordSet = new Set(userWords.map((w) => w.word.toLowerCase()));

  // Score each candidate word
  const scored = WORD_DATABASE
    .filter((w) => !userWordSet.has(w.word.toLowerCase()))
    .map((w) => {
      let score = 0;
      for (const cat of w.categories) {
        const rank = topCats.indexOf(cat);
        if (rank !== -1) score += 10 - rank;
      }
      // Add small randomness to vary recommendations
      score += Math.random() * 3;
      return { word: w, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map((s) => s.word);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
