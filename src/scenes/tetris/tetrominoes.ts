/**
 * Les 7 tétrominos, leurs couleurs, et les utilitaires de rotation / sac.
 * Chaque pièce est une matrice carrée de 0/1 (rotation de base).
 */
export interface Tetromino {
  key: string;
  color: number;
  matrix: number[][];
}

export const TETROMINOES: Record<string, Tetromino> = {
  I: { key: 'I', color: 0x22d3ee, matrix: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ] },
  O: { key: 'O', color: 0xfbbf24, matrix: [
    [1, 1],
    [1, 1],
  ] },
  T: { key: 'T', color: 0xa855f7, matrix: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ] },
  S: { key: 'S', color: 0x4ade80, matrix: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ] },
  Z: { key: 'Z', color: 0xf43f5e, matrix: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ] },
  J: { key: 'J', color: 0x3b82f6, matrix: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ] },
  L: { key: 'L', color: 0xf59e0b, matrix: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ] },
};

export const PIECE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** Rotation horaire d'une matrice carrée. */
export function rotateCW(m: number[][]): number[][] {
  const n = m.length;
  const res: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      res[c][n - 1 - r] = m[r][c];
    }
  }
  return res;
}

/** Un « sac » mélangé des 7 pièces (randomizer équitable façon Tetris moderne). */
export function makeBag(): string[] {
  const bag = [...PIECE_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
