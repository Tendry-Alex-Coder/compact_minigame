import Phaser from 'phaser';
import { GAMES } from '../games/registry';

interface ScrollButton {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
}

interface Card {
  rect: Phaser.GameObjects.Rectangle;
  localY: number;
}

const CARD_W = 560;
const CARD_H = 92;
const GAP = 18;
const STEP = CARD_H + GAP;

/**
 * Hub de l'application : liste défilable des minigames (depuis le registre).
 * Si la liste déborde, deux boutons flèches « arcade » (▲ / ▼) et la molette
 * permettent de faire défiler ; les cartes sont découpées à la zone visible.
 */
export class MenuScene extends Phaser.Scene {
  private listContainer!: Phaser.GameObjects.Container;
  private cards: Card[] = [];
  private scrollOffset = 0;
  private maxScroll = 0;
  private baseY = 0;
  private viewportTop = 0;
  private viewportBottom = 0;
  private upBtn?: ScrollButton;
  private downBtn?: ScrollButton;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.cards = [];
    this.scrollOffset = 0;

    this.add.rectangle(cx, height / 2, width, height, 0x0f172a).setDepth(-10);

    this.add
      .text(cx, 56, 'COMPACT MINI', {
        fontFamily: 'system-ui',
        fontSize: '48px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 100, 'Choisis un jeu', {
        fontFamily: 'system-ui',
        fontSize: '19px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    // Zone de défilement (entre les deux boutons).
    this.viewportTop = 172;
    this.viewportBottom = 602;
    const viewportH = this.viewportBottom - this.viewportTop;
    this.baseY = this.viewportTop + CARD_H / 2;

    // Conteneur des cartes, découpé à la zone visible par un masque.
    this.listContainer = this.add.container(cx, this.baseY).setDepth(1);
    GAMES.forEach((game, i) => {
      const localY = i * STEP;
      const rect = this.add
        .rectangle(0, localY, CARD_W, CARD_H, 0x1e293b)
        .setStrokeStyle(2, game.color)
        .setInteractive({ useHandCursor: true });
      const title = this.add
        .text(-CARD_W / 2 + 24, localY - 16, game.title, {
          fontFamily: 'system-ui',
          fontSize: '27px',
          color: '#f8fafc',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      const desc = this.add
        .text(-CARD_W / 2 + 24, localY + 17, game.description, {
          fontFamily: 'system-ui',
          fontSize: '15px',
          color: '#94a3b8',
          wordWrap: { width: CARD_W - 48 },
        })
        .setOrigin(0, 0.5);

      rect.on('pointerover', () => rect.setFillStyle(0x334155));
      rect.on('pointerout', () => rect.setFillStyle(0x1e293b));
      rect.on('pointerdown', () => {
        const worldY = this.listContainer.y + localY;
        if (worldY < this.viewportTop || worldY > this.viewportBottom) return;
        this.scene.start(game.sceneKey);
      });

      this.listContainer.add([rect, title, desc]);
      this.cards.push({ rect, localY });
    });

    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(cx - CARD_W / 2 - 6, this.viewportTop, CARD_W + 12, viewportH);
    this.listContainer.setMask(maskShape.createGeometryMask());

    // Combien peut-on défiler ?
    const contentH = GAMES.length * CARD_H + (GAMES.length - 1) * GAP;
    this.maxScroll = Math.max(0, contentH - viewportH);

    // Boutons arcade ▲ / ▼ (seulement si la liste déborde).
    if (this.maxScroll > 0) {
      this.upBtn = this.makeScrollButton(cx, 146, 'up', () =>
        this.scrollTo(this.scrollOffset + STEP),
      );
      this.downBtn = this.makeScrollButton(cx, this.viewportBottom + 34, 'down', () =>
        this.scrollTo(this.scrollOffset - STEP),
      );

      // Molette.
      this.input.on(
        'wheel',
        (_p: unknown, _o: unknown, _dx: number, dy: number) =>
          this.scrollTo(this.scrollOffset - dy * 0.5),
      );
    }

    this.add
      .text(cx, height - 16, 'Astuce : chaque jeu a ses propres contrôles (souris ou clavier).', {
        fontFamily: 'system-ui',
        fontSize: '13px',
        color: '#64748b',
      })
      .setOrigin(0.5, 1)
      .setDepth(5);

    this.applyScroll();
  }

  private makeScrollButton(
    x: number,
    y: number,
    dir: 'up' | 'down',
    onClick: () => void,
  ): ScrollButton {
    const w = 150;
    const h = 42;
    const accent = 0x38bdf8;
    const bg = this.add.rectangle(0, 0, w, h, 0x16233a).setStrokeStyle(3, accent);
    const chevron =
      dir === 'up'
        ? this.add.triangle(0, 0, 0, -9, -15, 8, 15, 8, accent)
        : this.add.triangle(0, 0, 0, 9, -15, -8, 15, -8, accent);
    const container = this.add.container(x, y, [bg, chevron]).setDepth(5);

    const state = { enabled: true };
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      if (state.enabled) bg.setFillStyle(0x24405f);
    });
    bg.on('pointerout', () => {
      if (state.enabled) bg.setFillStyle(0x16233a);
    });
    bg.on('pointerdown', () => {
      if (state.enabled) onClick();
    });

    return {
      container,
      setEnabled: (enabled: boolean) => {
        state.enabled = enabled;
        container.setAlpha(enabled ? 1 : 0.28);
        if (!enabled) bg.setFillStyle(0x16233a);
      },
    };
  }

  private scrollTo(target: number): void {
    const clamped = Phaser.Math.Clamp(target, -this.maxScroll, 0);
    this.tweens.killTweensOf(this);
    this.tweens.add({
      targets: this,
      scrollOffset: clamped,
      duration: 160,
      ease: 'Quad.easeOut',
      onUpdate: () => this.applyScroll(),
      onComplete: () => this.applyScroll(),
    });
  }

  private applyScroll(): void {
    this.listContainer.y = this.baseY + this.scrollOffset;

    // Active/désactive l'interaction des cartes hors zone visible.
    for (const card of this.cards) {
      const worldY = this.listContainer.y + card.localY;
      const inside = worldY >= this.viewportTop && worldY <= this.viewportBottom;
      if (card.rect.input) card.rect.input.enabled = inside;
    }

    this.upBtn?.setEnabled(this.scrollOffset < -0.5);
    this.downBtn?.setEnabled(this.scrollOffset > -this.maxScroll + 0.5);
  }
}
