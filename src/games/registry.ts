import Phaser from 'phaser';
import { MazeScene } from '../scenes/maze/MazeScene';

/**
 * Registre central des minigames.
 *
 * Pour ajouter un jeu :
 *   1. Créer une nouvelle Scene Phaser dans src/scenes/<jeu>/.
 *   2. Ajouter une entrée ici.
 * Le menu et l'enregistrement des scènes se mettent à jour automatiquement.
 */
export interface MiniGame {
  key: string;
  title: string;
  description: string;
  sceneKey: string;
  scene: new (...args: never[]) => Phaser.Scene;
  color: number;
}

export const GAMES: MiniGame[] = [
  {
    key: 'maze',
    title: 'Labyrinthe',
    description: 'Guide la bille à la souris jusqu’à la sortie ★ sans te perdre.',
    sceneKey: 'MazeScene',
    scene: MazeScene,
    color: 0x4ade80,
  },
];
