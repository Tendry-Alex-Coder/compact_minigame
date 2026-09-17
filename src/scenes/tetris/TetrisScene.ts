import Phaser from 'phaser';
import { TETROMINOES, rotateCW, makeBag } from './tetrominoes';
import { TetrisMode, DEFAULT_MODE } from './modes';

interface TetrisInit {
  mode?: TetrisMode;
}

interface ActivePiece {
  key: string;
  color: number;
  matrix: number[][];
  x: number; // colonne de la grille (coin haut-gauche de la matrice)
  y: number; // ligne de la grille
}

const COLS = 10;
const ROWS = 20;
const CELL = 30;

const LINE_SCORES = [0, 100, 300, 500, 800];

/**
 * Minigame Tetris.
 * Contrôles : ← → déplacer, ↑ tourner, ↓ descendre plus vite,
 * Espace : chute instantanée, Échap : menu.
 * Chaque ligne complétée rapporte des points (100/300/500/800 selon le
 * nombre de lignes d'un coup). En mode Infini, le score est multiplié par
 * le niveau et la vitesse augmente toutes les 10 lignes.
 */
export class TetrisScene extends Phaser.Scene {
  private mode: TetrisMode = DEFAULT_MODE;

  private board: number[][] = [];
  private active!: ActivePiece;
  private bag: string[] = [];
  private nextKey = 'I';

  private fieldX = 0;
  private fieldY = 0;
  private panelX = 0;

  private dropTimer = 0;
  private dropInterval = 800;
  private softDrop = false;

  private score = 0;
  private lines = 0;
  private level = 0;
  private state: 'playing' | 'over' = 'playing';

  private cells!: Phaser.GameObjects.Graphics;
  private nextGfx!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  constructor() {
    super('TetrisScene');
  }

  init(data: TetrisInit): void {
    this.mode = data.mode ?? DEFAULT_MODE;
    this.board = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
    this.bag = [];
    this.dropTimer = 0;
    this.softDrop = false;
    this.score = 0;
    this.lines = 0;
    this.level = 0;
    this.state = 'playing';
    this.dropInterval = this.mode.baseDrop;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a).setDepth(-10);

    const fieldW = COLS * CELL;
    const fieldH = ROWS * CELL;
    const gap = 40;
    const panelW = 240;
    const totalW = fieldW + gap + panelW;
    this.fieldX = Math.floor((width - totalW) / 2);
    this.fieldY = Math.floor((height - fieldH) / 2);
    this.panelX = this.fieldX + fieldW + gap;

    // Cadre + fond du plateau + grille discrète.
    const frame = this.add.graphics().setDepth(0);
    frame.fillStyle(0x111c33, 1);
    frame.fillRect(this.fieldX, this.fieldY, fieldW, fieldH);
    frame.lineStyle(1, 0x1e293b, 1);
    for (let c = 1; c < COLS; c++) {
      frame.lineBetween(this.fieldX + c * CELL, this.fieldY, this.fieldX + c * CELL, this.fieldY + fieldH);
    }
    for (let r = 1; r < ROWS; r++) {
      frame.lineBetween(this.fieldX, this.fieldY + r * CELL, this.fieldX + fieldW, this.fieldY + r * CELL);
    }
    frame.lineStyle(2, 0x334155, 1);
    frame.strokeRect(this.fieldX, this.fieldY, fieldW, fieldH);

    // Panneau latéral.
    this.add.text(this.panelX, this.fieldY, 'TETRIS', {
      fontFamily: 'system-ui',
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.add.text(this.panelX, this.fieldY + 44, `Mode : ${this.mode.label}`, {
      fontFamily: 'system-ui',
      fontSize: '16px',
      color: '#94a3b8',
    });

    this.add.text(this.panelX, this.fieldY + 92, 'SCORE', {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#64748b',
    });
    this.scoreText = this.add.text(this.panelX, this.fieldY + 110, '0', {
      fontFamily: 'system-ui',
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold',
    });

    this.linesText = this.add.text(this.panelX, this.fieldY + 160, 'Lignes : 0', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.levelText = this.add.text(this.panelX, this.fieldY + 188, '', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#e2e8f0',
    });

    this.add.text(this.panelX, this.fieldY + 236, 'SUIVANT', {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#64748b',
    });
    this.nextGfx = this.add.graphics().setDepth(1);

    this.add.text(
      this.panelX,
      this.fieldY + fieldH - 108,
      '← →   déplacer\n↑   tourner\n↓   descendre\nEspace   chute\nÉchap   menu',
      { fontFamily: 'system-ui', fontSize: '15px', color: '#64748b', lineSpacing: 6 },
    );

    // Graphique dynamique (cases posées + fantôme + pièce active).
    this.cells = this.add.graphics().setDepth(2);

    // Entrées clavier.
    const kb = this.input.keyboard;
    kb?.addCapture(['LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE']);
    kb?.on('keydown-LEFT', () => this.onMove(-1));
    kb?.on('keydown-RIGHT', () => this.onMove(1));
    kb?.on('keydown-UP', () => this.onRotate());
    kb?.on('keydown-X', () => this.onRotate());
    kb?.on('keydown-DOWN', () => { this.softDrop = true; });
    kb?.on('keyup-DOWN', () => { this.softDrop = false; });
    kb?.on('keydown-SPACE', () => this.onHardDrop());
    kb?.on('keydown-ESC', () => this.scene.start('MenuScene'));
    this.input.on('pointerdown', () => {
      if (this.state === 'over') this.restart();
    });

    // Première pièce.
    this.bag = makeBag();
    this.nextKey = this.takeFromBag();
    this.spawnPiece();

    this.drawNext();
    this.updateHud();
    this.draw();
  }

  private takeFromBag(): string {
    if (this.bag.length === 0) this.bag = makeBag();
    return this.bag.pop() as string;
  }

  private spawnPiece(): void {
    const key = this.nextKey;
    this.nextKey = this.takeFromBag();
    const t = TETROMINOES[key];
    const matrix = t.matrix.map((row) => [...row]);
    const x = Math.floor((COLS - matrix.length) / 2);
    const y = 0;
    this.active = { key, color: t.color, matrix, x, y };
    this.drawNext();

    if (this.collides(matrix, x, y)) {
      this.gameOver();
    }
  }

  private collides(matrix: number[][], x: number, y: number): boolean {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix.length; c++) {
        if (!matrix[r][c]) continue;
        const gx = x + c;
        const gy = y + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && this.board[gy][gx] !== 0) return true;
      }
    }
    return false;
  }

  private tryMove(dx: number, dy: number): boolean {
    if (this.collides(this.active.matrix, this.active.x + dx, this.active.y + dy)) {
      return false;
    }
    this.active.x += dx;
    this.active.y += dy;
    return true;
  }

  private onMove(dx: number): void {
    if (this.state !== 'playing') return;
    if (this.tryMove(dx, 0)) this.draw();
  }

  private onRotate(): void {
    if (this.state !== 'playing') return;
    const rotated = rotateCW(this.active.matrix);
    // Wall kicks simples : essaie sur place puis décalé.
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!this.collides(rotated, this.active.x + dx, this.active.y)) {
        this.active.matrix = rotated;
        this.active.x += dx;
        this.draw();
        return;
      }
    }
  }

  private onHardDrop(): void {
    if (this.state === 'over') {
      this.restart();
      return;
    }
    if (this.state !== 'playing') return;
    let dist = 0;
    while (this.tryMove(0, 1)) dist++;
    this.score += dist * 2;
    this.lockPiece();
  }

  private lockPiece(): void {
    const { matrix, x, y, color } = this.active;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix.length; c++) {
        if (matrix[r][c]) {
          const gy = y + r;
          const gx = x + c;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            this.board[gy][gx] = color;
          }
        }
      }
    }
    this.clearLines();
    this.dropTimer = 0;
    if (this.state === 'playing') {
      this.spawnPiece();
    }
    this.updateHud();
    this.draw();
  }

  private clearLines(): void {
    let cleared = 0;
    let r = ROWS - 1;
    while (r >= 0) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(Array<number>(COLS).fill(0));
        cleared++;
      } else {
        r--;
      }
    }
    if (cleared > 0) {
      this.lines += cleared;
      const mult = this.mode.progressive ? this.level + 1 : 1;
      this.score += LINE_SCORES[cleared] * mult;
      if (this.mode.progressive) {
        this.level = Math.floor(this.lines / 10);
        this.dropInterval = Math.max(80, Math.round(this.mode.baseDrop * Math.pow(0.85, this.level)));
      }
    }
  }

  private gameOver(): void {
    this.state = 'over';
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.62).setDepth(100);
    this.add
      .text(width / 2, height / 2 - 40, 'Game Over', {
        fontFamily: 'system-ui',
        fontSize: '46px',
        color: '#f43f5e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(101);
    this.add
      .text(width / 2, height / 2 + 8, `Score : ${this.score}   —   Lignes : ${this.lines}`, {
        fontFamily: 'system-ui',
        fontSize: '20px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
      .setDepth(101);
    this.add
      .text(width / 2, height / 2 + 48, 'Clic / Espace : rejouer   ·   Échap : menu', {
        fontFamily: 'system-ui',
        fontSize: '16px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setDepth(101);
  }

  private restart(): void {
    this.scene.restart({ mode: this.mode });
  }

  update(_time: number, delta: number): void {
    if (this.state !== 'playing') return;

    this.dropTimer += delta;
    const interval = this.softDrop ? Math.min(45, this.dropInterval) : this.dropInterval;
    if (this.dropTimer >= interval) {
      this.dropTimer = 0;
      if (this.tryMove(0, 1)) {
        if (this.softDrop) this.score += 1;
        this.updateHud();
        this.draw();
      } else {
        this.lockPiece();
      }
    }
  }

  private drawCell(g: Phaser.GameObjects.Graphics, gx: number, gy: number, color: number, alpha = 1): void {
    if (gy < 0) return;
    const px = this.fieldX + gx * CELL;
    const py = this.fieldY + gy * CELL;
    g.fillStyle(color, alpha);
    g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    g.fillStyle(0xffffff, 0.14 * alpha);
    g.fillRect(px + 1, py + 1, CELL - 2, 4);
  }

  private draw(): void {
    const g = this.cells;
    g.clear();

    // Cases posées.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c] !== 0) {
          this.drawCell(g, c, r, this.board[r][c]);
        }
      }
    }

    if (this.state !== 'playing') return;

    // Pièce fantôme (position d'atterrissage).
    let ghostY = this.active.y;
    while (!this.collides(this.active.matrix, this.active.x, ghostY + 1)) ghostY++;
    const m = this.active.matrix;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (m[r][c]) {
          const gy = ghostY + r;
          if (gy < 0) continue;
          const px = this.fieldX + (this.active.x + c) * CELL;
          const py = this.fieldY + gy * CELL;
          g.lineStyle(2, this.active.color, 0.45);
          g.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4);
        }
      }
    }

    // Pièce active.
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (m[r][c]) {
          this.drawCell(g, this.active.x + c, this.active.y + r, this.active.color);
        }
      }
    }
  }

  private drawNext(): void {
    const g = this.nextGfx;
    g.clear();
    const t = TETROMINOES[this.nextKey];
    const m = t.matrix;

    // Boîte de prévisualisation d'un côté ~ 4 mini-cases.
    const mini = 22;
    const boxX = this.panelX;
    const boxY = this.fieldY + 258;

    // Centre la pièce dans une zone 4x4.
    let minR = m.length, maxR = -1, minC = m.length, maxC = -1;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (m[r][c]) {
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
      }
    }
    const pieceW = (maxC - minC + 1) * mini;
    const pieceH = (maxR - minR + 1) * mini;
    const offX = boxX + (4 * mini - pieceW) / 2;
    const offY = boxY + (4 * mini - pieceH) / 2;

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (m[r][c]) {
          const px = offX + (c - minC) * mini;
          const py = offY + (r - minR) * mini;
          g.fillStyle(t.color, 1);
          g.fillRect(px + 1, py + 1, mini - 2, mini - 2);
          g.fillStyle(0xffffff, 0.14);
          g.fillRect(px + 1, py + 1, mini - 2, 3);
        }
      }
    }
  }

  private updateHud(): void {
    this.scoreText.setText(`${this.score}`);
    this.linesText.setText(`Lignes : ${this.lines}`);
    if (this.mode.progressive) {
      this.levelText.setText(`Niveau : ${this.level}`);
    } else {
      this.levelText.setText('');
    }
  }
}
