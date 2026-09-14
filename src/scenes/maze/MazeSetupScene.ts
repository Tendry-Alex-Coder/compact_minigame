import Phaser from 'phaser';
import { DIFFICULTIES } from './difficulty';

/**
 * Écran de réglage du labyrinthe : choix de la difficulté avant de jouer.
 * Lancé par le menu, il démarre ensuite MazeScene avec la difficulté choisie.
 */
export class MazeSetupScene extends Phaser.Scene {
  constructor() {
    super('MazeSetupScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

    this.add
      .text(width / 2, 74, 'LABYRINTHE', {
        fontFamily: 'system-ui',
        fontSize: '46px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 120, 'Choisis la difficulté', {
        fontFamily: 'system-ui',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    const startY = 196;
    const cardW = 560;
    const cardH = 84;
    const gap = 18;

    DIFFICULTIES.forEach((d, i) => {
      const y = startY + i * (cardH + gap);
      const card = this.add
        .rectangle(width / 2, y, cardW, cardH, 0x1e293b)
        .setStrokeStyle(2, d.color)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(width / 2 - cardW / 2 + 24, y - 16, d.label, {
          fontFamily: 'system-ui',
          fontSize: '24px',
          color: '#f8fafc',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);

      const cols = d.cellCols * 2 + 1;
      const rows = d.cellRows * 2 + 1;
      this.add
        .text(
          width / 2 - cardW / 2 + 24,
          y + 16,
          `${d.description}   —   grille de départ ${cols}×${rows}`,
          {
            fontFamily: 'system-ui',
            fontSize: '14px',
            color: '#94a3b8',
          },
        )
        .setOrigin(0, 0.5);

      card.on('pointerover', () => card.setFillStyle(0x334155));
      card.on('pointerout', () => card.setFillStyle(0x1e293b));
      card.on('pointerdown', () => this.scene.start('MazeScene', { level: 1, difficulty: d }));
    });

    const backY = startY + DIFFICULTIES.length * (cardH + gap) + 6;
    const back = this.add
      .text(width / 2, backY, '← Retour au menu', {
        fontFamily: 'system-ui',
        fontSize: '16px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#f8fafc'));
    back.on('pointerout', () => back.setColor('#94a3b8'));
    back.on('pointerdown', () => this.scene.start('MenuScene'));

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }
}
