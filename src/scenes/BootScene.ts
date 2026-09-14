import Phaser from 'phaser';

/**
 * Scène d'amorçage. Aujourd'hui les visuels sont générés à la volée, mais
 * c'est ici que se chargeront plus tard les assets partagés (sprites, sons…).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
