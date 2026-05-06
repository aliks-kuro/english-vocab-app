import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Word } from '../types';

interface WordStore {
  words: Word[];
  addWord: (word: Word) => void;
  removeWord: (id: string) => void;
  updateWord: (id: string, updates: Partial<Word>) => void;
  markKnown: (id: string) => void;
  markUnknown: (id: string) => void;
  resetKnownStatus: () => void;
}

export const useWordStore = create<WordStore>()(
  persist(
    (set) => ({
      words: [],
      addWord: (word) =>
        set((state) => ({
          words: state.words.some(
            (w) => w.word.toLowerCase() === word.word.toLowerCase()
          )
            ? state.words
            : [...state.words, word],
        })),
      removeWord: (id) =>
        set((state) => ({ words: state.words.filter((w) => w.id !== id) })),
      updateWord: (id, updates) =>
        set((state) => ({
          words: state.words.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        })),
      markKnown: (id) =>
        set((state) => ({
          words: state.words.map((w) => (w.id === id ? { ...w, known: true } : w)),
        })),
      markUnknown: (id) =>
        set((state) => ({
          words: state.words.map((w) => (w.id === id ? { ...w, known: false } : w)),
        })),
      resetKnownStatus: () =>
        set((state) => ({
          words: state.words.map((w) => ({ ...w, known: false })),
        })),
    }),
    { name: 'vocab-master-words' }
  )
);
