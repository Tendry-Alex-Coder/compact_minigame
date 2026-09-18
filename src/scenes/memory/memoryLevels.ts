/**
 * Niveaux du jeu de Memory, définis par le nombre de tuiles.
 * cols * rows doit toujours être pair (paires complètes).
 */
export interface MemoryLevel {
  key: string;
  label: string;
  cols: number;
  rows: number;
  color: number;
}

export const MEMORY_LEVELS: MemoryLevel[] = [
  { key: 'easy', label: 'Facile', cols: 4, rows: 3, color: 0x4ade80 }, // 12 tuiles
  { key: 'medium', label: 'Moyen', cols: 4, rows: 4, color: 0x38bdf8 }, // 16 tuiles
  { key: 'hard', label: 'Difficile', cols: 6, rows: 4, color: 0xf59e0b }, // 24 tuiles
  { key: 'expert', label: 'Expert', cols: 6, rows: 6, color: 0xf43f5e }, // 36 tuiles
];

/** Motifs possibles (emoji). Il en faut au moins autant que de paires. */
export const SYMBOLS = [
  '🍎', '🍌', '🍇', '🍓', '🍒', '🍊', '🥝', '🍍', '🥥', '🍉',
  '🍑', '🌸', '⭐', '🎈', '🚀', '⚽', '🎸', '🐱', '🐶', '🦊',
];
