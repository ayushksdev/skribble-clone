import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WordCategories {
  [category: string]: string[];
}

export class WordService {
  private wordsByCategory: WordCategories = {};
  private allWords: string[] = [];

  constructor() {
    this.loadWords();
  }

  private loadWords(): void {
    const candidatePaths = [
      path.resolve(__dirname, '../data/words.json'),
      path.resolve(__dirname, '../../src/data/words.json'),
      path.resolve(process.cwd(), 'src/data/words.json'),
      path.resolve(process.cwd(), 'server/src/data/words.json'),
    ];

    let loaded = false;
    for (const wordsPath of candidatePaths) {
      if (fs.existsSync(wordsPath)) {
        try {
          const data = fs.readFileSync(wordsPath, 'utf-8');
          this.wordsByCategory = JSON.parse(data);
          this.allWords = Object.values(this.wordsByCategory).flat();
          loaded = true;
          break;
        } catch {
          // Continue trying next path
        }
      }
    }

    if (!loaded || this.allWords.length === 0) {
      console.warn('Using built-in fallback word list.');
      this.allWords = [
        'apple', 'banana', 'cat', 'dog', 'elephant', 'guitar', 'house', 'pizza',
        'robot', 'star', 'tree', 'umbrella', 'volcano', 'whale', 'car', 'airplane',
        'bicycle', 'castle', 'dolphin', 'flower', 'giraffe', 'helicopter', 'island'
      ];
    }
  }

  public getRandomWords(count: number = 3, exclude: string[] = []): string[] {
    const available = this.allWords.filter((w) => !exclude.includes(w.toLowerCase()));
    const pool = available.length >= count ? available : this.allWords;

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  public getMaskedWord(word: string, revealedIndices: Set<number> = new Set()): string {
    return word
      .split('')
      .map((char, index) => {
        if (char === ' ') return ' ';
        if (char === '-') return '-';
        if (revealedIndices.has(index)) return char;
        return '_';
      })
      .join(' ');
  }

  public getRevealedIndices(word: string, hintsRevealed: number, totalHints: number): Set<number> {
    const validIndices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== ' ' && word[i] !== '-') {
        validIndices.push(i);
      }
    }

    if (hintsRevealed <= 0 || validIndices.length <= 1) {
      return new Set();
    }

    const maxReveal = Math.min(
      hintsRevealed,
      Math.max(1, Math.floor(validIndices.length * 0.5)),
      totalHints
    );

    const step = Math.max(1, Math.floor(validIndices.length / (maxReveal + 1)));
    const revealed = new Set<number>();

    for (let i = 1; i <= maxReveal; i++) {
      const targetIdx = (i * step) % validIndices.length;
      revealed.add(validIndices[targetIdx]);
    }

    return revealed;
  }

  public isCloseGuess(guess: string, target: string): boolean {
    const g = guess.trim().toLowerCase();
    const t = target.trim().toLowerCase();

    if (g === t) return false;
    if (t.length <= 3) return false;

    const dist = this.levenshteinDistance(g, t);
    return dist === 1;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

export const wordService = new WordService();
