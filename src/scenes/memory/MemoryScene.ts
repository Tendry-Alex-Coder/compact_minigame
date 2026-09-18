import Phaser from 'phaser';
import { MEMORY_LEVELS, SYMBOLS, MemoryLevel } from './memoryLevels';

interface MemoryInit {
  levelIndex?: number;
}

interface Tile {
  symbol: string;
  state: 'down' | 'up' | 'matched';
  container: Phaser.GameObjects.Container;
  back: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

const DOWN_COLOR = 0x334155;
const DOWN_STROKE = 0x475569;
const UP_COLOR = 0xf1f5f9;
const MATCH_COLOR = 0xbbf7d0; // vert clair : la paire reste lisible
const MATCH_STROKE = 0x22c55e;

/**
 * Minigame Memory : retourne deux tuiles ; si elles portent le même motif,
 * la paire reste découverte, sinon elles se retournent. Le nombre de tuiles
 * dépend du niveau choisi. On peut enchaîner vers des grilles plus grandes.
 */
export class MemoryScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: MemoryLevel;

  private tiles: Tile[] = [];
  private firstPick: Tile | null = null;
  private lock = false;

  private moves = 0;
  private matchedPairs = 0;
  private totalPairs = 0;

  private startTime = 0;
  private state: 'playing' | 'won' = 'playing';
  private isLast = false;
  private finalDone = false;

  private infoText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  constructor() {
    super('MemoryScene');
  }

  init(data: MemoryInit): void {
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex ?? 0, 0, MEMORY_LEVELS.length - 1);
    this.level = MEMORY_LEVELS[this.levelIndex];
    this.tiles = [];
    this.firstPick = null;
    this.lock = false;
    this.moves = 0;
    this.matchedPairs = 0;
    this.state = 'playing';
    this.finalDone = false;
    this.isLast = this.levelIndex === MEMORY_LEVELS.length - 1;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a).setDepth(-10);

    const { cols, rows } = this.level;
    this.totalPairs = (cols * rows) / 2;

    // Construit et mélange le paquet.
    const pool = Phaser.Utils.Array.Shuffle([...SYMBOLS]).slice(0, this.totalPairs);
    const deck = Phaser.Utils.Array.Shuffle([...pool, ...pool]);

    // Mise en page de la grille.
    const marginTop = 70;
    const pad = 20;
    const availW = width - pad * 2;
    const availH = height - marginTop - pad;
    const cell = Math.floor(Math.min(availW / cols, availH / rows));
    const gridW = cell * cols;
    const gridH = cell * rows;
    const gridX = (width - gridW) / 2;
    const gridY = marginTop + (availH - gridH) / 2;
    const tileSize = cell - 10;
    const fontSize = Math.floor(tileSize * 0.5);

    for (let i = 0; i < deck.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gridX + col * cell + cell / 2;
      const y = gridY + row * cell + cell / 2;

      const back = this.add
        .rectangle(0, 0, tileSize, tileSize, DOWN_COLOR)
        .setStrokeStyle(2, DOWN_STROKE)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(0, 0, '', { fontFamily: 'system-ui', fontSize: `${fontSize}px`, color: '#0f172a' })
        .setOrigin(0.5);
      const container = this.add.container(x, y, [back, label]);

      const tile: Tile = { symbol: deck[i], state: 'down', container, back, label };
      back.on('pointerdown', () => this.onTileClick(tile));
      this.tiles.push(tile);
    }

    // HUD.
    this.infoText = this.add
      .text(pad, 16, '', { fontFamily: 'system-ui', fontSize: '18px', color: '#e2e8f0' })
      .setDepth(20);
    this.statsText = this.add
      .text(pad, 42, '', { fontFamily: 'system-ui', fontSize: '15px', color: '#94a3b8' })
      .setDepth(20);
    this.timeText = this.add
      .text(width - pad, 16, '', { fontFamily: 'system-ui', fontSize: '18px', color: '#e2e8f0' })
      .setOrigin(1, 0)
      .setDepth(20);
    this.add
      .text(width - pad, 42, 'Échap : niveaux', {
        fontFamily: 'system-ui',
        fontSize: '13px',
        color: '#64748b',
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MemorySetupScene'));
    this.input.on('pointerdown', () => {
      if (this.state === 'won' && this.finalDone) this.scene.start('MemorySetupScene');
    });

    this.startTime = this.time.now;
    this.updateHud();
  }

  private onTileClick(tile: Tile): void {
    if (this.state !== 'playing' || this.lock) return;
    if (tile.state !== 'down') return;

    tile.state = 'up';
    this.reveal(tile);

    if (!this.firstPick) {
      this.firstPick = tile;
      return;
    }

    // Deuxième tuile : on compte un coup et on compare.
    this.moves++;
    const first = this.firstPick;
    this.firstPick = null;

    if (first.symbol === tile.symbol) {
      first.state = 'matched';
      tile.state = 'matched';
      this.matchedPairs++;
      this.markMatched(first);
      this.markMatched(tile);
      this.updateHud();
      if (this.matchedPairs === this.totalPairs) {
        this.win();
      }
    } else {
      this.lock = true;
      this.time.delayedCall(750, () => {
        this.hide(first);
        this.hide(tile);
        first.state = 'down';
        tile.state = 'down';
        this.lock = false;
      });
      this.updateHud();
    }
  }

  /** Révèle une tuile : motif + couleur posés immédiatement, petit « pop ». */
  private reveal(tile: Tile): void {
    tile.back.setFillStyle(UP_COLOR).setStrokeStyle(2, DOWN_STROKE);
    tile.label.setText(tile.symbol);
    tile.container.setScale(0.86);
    this.tweens.add({
      targets: tile.container,
      scale: 1,
      duration: 140,
      ease: 'Back.easeOut',
    });
  }

  /** Retourne une tuile face cachée (animation scaleX, swap au milieu). */
  private hide(tile: Tile): void {
    this.tweens.add({
      targets: tile.container,
      scaleX: 0,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeInOut',
      onYoyo: () => {
        tile.back.setFillStyle(DOWN_COLOR).setStrokeStyle(2, DOWN_STROKE);
        tile.label.setText('');
      },
    });
  }

  /** Marque une paire trouvée (couleur uniquement, pas d'animation d'échelle). */
  private markMatched(tile: Tile): void {
    tile.back.setFillStyle(MATCH_COLOR).setStrokeStyle(3, MATCH_STROKE);
  }

  private win(): void {
    this.state = 'won';
    const { width, height } = this.scale;
    const secs = Math.round((this.time.now - this.startTime) / 1000);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(100);
    this.add
      .text(width / 2, height / 2 - 42, `Niveau ${this.level.label} terminé !`, {
        fontFamily: 'system-ui',
        fontSize: '36px',
        color: '#4ade80',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(101);
    this.add
      .text(width / 2, height / 2 + 2, `Coups : ${this.moves}   ·   Temps : ${secs}s`, {
        fontFamily: 'system-ui',
        fontSize: '20px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
      .setDepth(101);

    if (!this.isLast) {
      const next = MEMORY_LEVELS[this.levelIndex + 1];
      this.add
        .text(width / 2, height / 2 + 44, `Niveau suivant : ${next.cols * next.rows} tuiles…`, {
          fontFamily: 'system-ui',
          fontSize: '16px',
          color: '#94a3b8',
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.time.delayedCall(1700, () => this.scene.restart({ levelIndex: this.levelIndex + 1 }));
    } else {
      this.finalDone = true;
      this.add
        .text(width / 2, height / 2 + 44, 'Bravo, tous les niveaux terminés ! Clic : autres tailles', {
          fontFamily: 'system-ui',
          fontSize: '16px',
          color: '#94a3b8',
        })
        .setOrigin(0.5)
        .setDepth(101);
    }
  }

  update(): void {
    if (this.state !== 'playing') return;
    this.updateHud();
  }

  private updateHud(): void {
    const tiles = this.level.cols * this.level.rows;
    this.infoText.setText(`Niveau : ${this.level.label}  ·  ${tiles} tuiles`);
    this.statsText.setText(`Paires : ${this.matchedPairs}/${this.totalPairs}     Coups : ${this.moves}`);
    const secs = this.state === 'playing' ? Math.round((this.time.now - this.startTime) / 1000) : 0;
    this.timeText.setText(`⏱ ${secs}s`);
  }
}
