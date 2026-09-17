/**
 * Modes de difficulté du Tetris.
 *
 * - baseDrop : durée (ms) d'une descente automatique d'une ligne.
 * - progressive : si vrai (mode Infini), la vitesse augmente toutes les
 *   10 lignes et le score est multiplié par (niveau + 1).
 */
export interface TetrisMode {
  key: string;
  label: string;
  description: string;
  baseDrop: number;
  progressive: boolean;
  color: number;
}

export const TETRIS_MODES: TetrisMode[] = [
  {
    key: 'easy',
    label: 'Facile',
    description: 'Chute lente, vitesse constante.',
    baseDrop: 800,
    progressive: false,
    color: 0x4ade80,
  },
  {
    key: 'inter',
    label: 'Intermédiaire',
    description: 'Rythme soutenu, vitesse constante.',
    baseDrop: 480,
    progressive: false,
    color: 0x38bdf8,
  },
  {
    key: 'expert',
    label: 'Expert',
    description: 'Chute rapide, réflexes exigés.',
    baseDrop: 230,
    progressive: false,
    color: 0xf43f5e,
  },
  {
    key: 'infini',
    label: 'Infini',
    description: 'Accélère sans fin toutes les 10 lignes, score multiplié.',
    baseDrop: 700,
    progressive: true,
    color: 0xa855f7,
  },
];

export const DEFAULT_MODE: TetrisMode = TETRIS_MODES[0];
