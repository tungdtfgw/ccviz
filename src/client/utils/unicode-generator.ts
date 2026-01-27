import Phaser from 'phaser';

/**
 * Unicode block definition with range and weight
 */
export interface UnicodeBlock {
  range: [number, number]; // [start, end] code points
  weight: number; // Probability weight (higher = more common)
}

/**
 * UnicodeGenerator - Generate randomized alien-looking text
 *
 * Uses 5 Unicode blocks (Geometric, Math, Block, Box, Dingbats)
 * with weighted random selection for visual variety.
 *
 * Features:
 * - 2-3 words per phrase
 * - 3-6 characters per word
 * - No consecutive identical phrases
 * - Fast generation (<5ms)
 *
 * Usage:
 *   const alienText = UnicodeGenerator.generatePhrase(2);
 *   // Returns something like: "◆■▲◢◣ ☰☱☲☳"
 */
export class UnicodeGenerator {
  /**
   * Unicode blocks for alien text generation
   * Each block has a weight (higher = more common selection)
   */
  private static readonly BLOCKS: Record<string, UnicodeBlock> = {
    // Geometric Shapes (most common - squares, triangles, circles)
    geometric: { range: [0x25A0, 0x25FF], weight: 3 },

    // Mathematical Operators (medium - symbols, arrows)
    math: { range: [0x2200, 0x22FF], weight: 2 },

    // Block Elements (rare - solid blocks, shades)
    block: { range: [0x2580, 0x259F], weight: 1 },

    // Box Drawing (medium - lines, corners)
    box: { range: [0x2500, 0x257F], weight: 2 },

    // Dingbats (rare - decorative symbols)
    dingbats: { range: [0x2700, 0x27BF], weight: 1 }
  };

  // Track last generated phrase to prevent repeats
  private static lastPhrase: string = '';

  /**
   * Generate alien-looking phrase with multiple words
   * @param wordCount - Number of words in phrase (default: 2)
   * @returns Unicode string with space-separated words
   */
  static generatePhrase(wordCount = 2): string {
    let attempts = 0;
    let phrase = '';

    // Ensure uniqueness - no consecutive identical phrases
    do {
      const words: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        const length = Phaser.Math.Between(3, 6);
        words.push(this.generateWord(length));
      }
      phrase = words.join(' ');
      attempts++;
    } while (phrase === this.lastPhrase && attempts < 10);

    this.lastPhrase = phrase;
    return phrase;
  }

  /**
   * Generate single word of specified length
   * @param length - Number of characters in word
   * @returns Unicode string
   */
  private static generateWord(length: number): string {
    const chars: string[] = [];
    for (let i = 0; i < length; i++) {
      const block = this.selectBlock();
      chars.push(this.getRandomChar(block.range));
    }
    return chars.join('');
  }

  /**
   * Select Unicode block based on weight (weighted random)
   * Higher weight = more likely to be selected
   * @returns Selected Unicode block
   */
  private static selectBlock(): UnicodeBlock {
    const totalWeight = Object.values(this.BLOCKS).reduce(
      (sum, b) => sum + b.weight,
      0
    );
    let random = Math.random() * totalWeight;

    for (const block of Object.values(this.BLOCKS)) {
      random -= block.weight;
      if (random <= 0) return block;
    }

    // Fallback (should never reach here)
    return this.BLOCKS.geometric;
  }

  /**
   * Get random character from Unicode range
   * @param range - [start, end] code points
   * @returns Single Unicode character
   */
  private static getRandomChar(range: [number, number]): string {
    const [start, end] = range;
    const codePoint = Phaser.Math.Between(start, end);
    return String.fromCodePoint(codePoint);
  }

  /**
   * Reset generator state (for testing)
   * Clears last phrase memory
   */
  static reset(): void {
    this.lastPhrase = '';
  }

  /**
   * Get last generated phrase (for debugging)
   */
  static getLastPhrase(): string {
    return this.lastPhrase;
  }
}
