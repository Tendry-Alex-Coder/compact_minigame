import Phaser from 'phaser';
import { GAMES } from '../games/registry';

/**
 * Hub de l'application : liste les minigames disponibles (depuis le registre)
 * et lance celui que le joueur choisit.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

    this.add
      .text(width / 2, 80, 'COMPACT MINI', {
        fontFamily: 'system-ui',
        fontSize: '52px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 132, 'Choisis un jeu', {
        fontFamily: 'system-ui',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    const startY = 220;
    const cardW = 560;
    const cardH = 96;
    const gap = 24;

    GAMES.forEach((game, i) => {
      const y = startY + i * (cardH + gap);
      const card = this.add
        .rectangle(width / 2, y, cardW, cardH, 0x1e293b)
        .setStrokeStyle(2, game.color)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(width / 2 - cardW / 2 + 24, y - 20, game.title, {
          fontFamily: 'system-ui',
          fontSize: '28px',
          color: '#f8fafc',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      this.add
        .text(width / 2 - cardW / 2 + 24, y + 18, game.description, {
          fontFamily: 'system-ui',
          fontSize: '15px',
          color: '#94a3b8',
          wordWrap: { width: cardW - 48 },
        })
        .setOrigin(0, 0.5);

      card.on('pointerover', () => card.setFillStyle(0x334155));
      card.on('pointerout', () => card.setFillStyle(0x1e293b));
      card.on('pointerdown', () => this.scene.start(game.sceneKey, { level: 1 }));
    });

    this.add
      .text(width / 2, height - 34, 'Astuce : déplace la souris pour guider ton personnage.', {
        fontFamily: 'system-ui',
        fontSize: '14px',
        color: '#64748b',
      })
      .setOrigin(0.5);
  }
}
