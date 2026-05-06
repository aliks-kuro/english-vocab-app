import type { DictionaryApiResponse } from '../types';

export async function fetchWordDefinition(word: string): Promise<DictionaryApiResponse | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`
    );
    if (!res.ok) return null;
    const data: DictionaryApiResponse[] = await res.json();
    return data[0] ?? null;
  } catch {
    return null;
  }
}

export async function translateToJapanese(text: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`
    );
    const data = await res.json();
    return data?.responseData?.translatedText ?? text;
  } catch {
    return text;
  }
}

export function guessCategories(word: string, definition: string): string[] {
  const text = (word + ' ' + definition).toLowerCase();
  const cats: string[] = [];

  const patterns: [string, RegExp][] = [
    ['technology', /\b(software|code|program|computer|data|network|digital|algorithm|system|server|api|database|web|app)\b/],
    ['law', /\b(legal|law|court|judge|attorney|plaintiff|defendant|contract|statute|jurisdiction|tort|verdict)\b/],
    ['medicine', /\b(medical|disease|patient|symptom|diagnosis|drug|treatment|health|body|clinical|hospital|doctor)\b/],
    ['business', /\b(business|company|market|finance|money|profit|investment|stock|revenue|asset|fiscal|equity)\b/],
    ['science', /\b(science|chemical|element|molecule|atom|physics|biology|experiment|hypothesis|theory|energy)\b/],
    ['literature', /\b(literary|narrative|story|poem|novel|character|plot|metaphor|fiction|prose|verse|author)\b/],
    ['academic', /\b(abstract|concept|theory|analysis|research|study|academic|philosophy|logic|principle)\b/],
  ];

  for (const [cat, re] of patterns) {
    if (re.test(text)) cats.push(cat);
  }

  if (cats.length === 0) cats.push('general');
  return cats;
}
