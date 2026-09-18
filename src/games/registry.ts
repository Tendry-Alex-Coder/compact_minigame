import Phaser from 'phaser';
import { MazeSetupScene } from '../scenes/maze/MazeSetupScene';
import { MazeScene } from '../scenes/maze/MazeScene';
import { GoldMinerScene } from '../scenes/goldminer/GoldMinerScene';
import { TetrisSetupScene } from '../scenes/tetris/TetrisSetupScene';
import { TetrisScene } from '../scenes/tetris/TetrisScene';
import { MemorySetupScene } from '../scenes/memory/MemorySetupScene';
import { MemoryScene } from '../scenes/memory/MemoryScene';

type SceneClass = new (...args: never[]) => Phaser.Scene;

/**
 * Registre central des minigames.
 *
 * Pour ajouter un jeu :
 *   1. Créer une (ou plusieurs) Scene Phaser dans src/scenes/<jeu>/.
 *   2. Ajouter une entrée ici : `sceneKey` est la scène lancée par le menu,
 *      `scenes` liste toutes les scènes du jeu à enregistrer auprès de Phaser.
 * Le menu et l'enregistrement des scènes se mettent à jour automatiquement.
 */
export interface MiniGame {
  key: string;
  title: string;
  description: string;
  sceneKey: string;
  scenes: SceneClass[];
  color: number;
}

export const GAMES: MiniGame[] = [
  {
    key: 'maze',
    title: 'Labyrinthe',
    description: 'Guide la bille à la souris jusqu’à la sortie ★ sans te perdre.',
    sceneKey: 'MazeSetupScene',
    scenes: [MazeSetupScene, MazeScene],
    color: 0x4ade80,
  },
  {
    key: 'goldminer',
    title: 'Gold Miner',
    description: 'Lâche le grappin au bon moment pour attraper l’or et les diamants.',
    sceneKey: 'GoldMinerScene',
    scenes: [GoldMinerScene],
    color: 0xfbbf24,
  },
  {
    key: 'tetris',
    title: 'Tetris',
    description: 'Empile les blocs et complète des lignes. Modes Facile à Infini.',
    sceneKey: 'TetrisSetupScene',
    scenes: [TetrisSetupScene, TetrisScene],
    color: 0xa855f7,
  },
  {
    key: 'memory',
    title: 'Memory',
    description: 'Retrouve les paires de tuiles identiques. Plus de tuiles = plus dur.',
    sceneKey: 'MemorySetupScene',
    scenes: [MemorySetupScene, MemoryScene],
    color: 0x38bdf8,
  },
];
