export interface Word {
  id: string;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  definitionJa?: string;
  example?: string;
  categories: string[];
  tags?: string[];
  custom?: boolean;
  known: boolean;
  addedAt: number;
}

export interface DictionaryApiResponse {
  word: string;
  phonetics: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

export interface RecommendedWord {
  word: string;
  definition: string;
  definitionJa: string;
  example: string;
  categories: string[];
}
