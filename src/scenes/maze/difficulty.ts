/**
 * Presets de difficulté du labyrinthe.
 *
 * - cellCols / cellRows : taille (en cellules) du labyrinthe au niveau 1.
 *   La grille de tuiles rendue fait (2*cols+1) x (2*rows+1).
 * - growth : nombre de cellules ajoutées par côté à chaque niveau.
 * - speedFactor : multiplicateur de la vitesse de la bille.
 */
export interface Difficulty {
  key: string;
  label: string;
  description: string;
  cellCols: number;
  cellRows: number;
  growth: number;
  speedFactor: number;
  color: number;
}

export const DIFFICULTIES: Difficulty[] = [
  {
    key: 'easy',
    label: 'Facile',
    description: 'Petit labyrinthe, progression douce.',
    cellCols: 6,
    cellRows: 4,
    growth: 1,
    speedFactor: 1,
    color: 0x4ade80,
  },
  {
    key: 'medium',
    label: 'Moyen',
    description: 'Un bon équilibre pour s’échauffer.',
    cellCols: 8,
    cellRows: 6,
    growth: 1,
    speedFactor: 1,
    color: 0x38bdf8,
  },
  {
    key: 'hard',
    label: 'Difficile',
    description: 'Grand labyrinthe qui s’agrandit vite.',
    cellCols: 11,
    cellRows: 8,
    growth: 2,
    speedFactor: 1,
    color: 0xf59e0b,
  },
  {
    key: 'expert',
    label: 'Expert',
    description: 'Immense, et la bille file plus vite.',
    cellCols: 14,
    cellRows: 10,
    growth: 2,
    speedFactor: 1.15,
    color: 0xf43f5e,
  },
];

export const DEFAULT_DIFFICULTY: Difficulty = DIFFICULTIES[1];
