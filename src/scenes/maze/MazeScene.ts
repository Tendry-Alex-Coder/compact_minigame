import Phaser from 'phaser';
import { generateMaze } from './mazeGenerator';

interface MazeInit {
  level?: number;
}

/**
 * Minigame : labyrinthe généré procéduralement.
 * Le personnage (une bille) suit la souris ; les murs le bloquent.
 * Atteindre la sortie (★) fait passer au niveau suivant, plus grand.
 */
export class MazeScene extends Phaser.Scene {
  private level = 1;
  private player!: Phaser.Physics.Arcade.Image;
  private playerRadius = 8;
  private walls: Phaser.GameObjects.Rectangle[] = [];
  private exitZone!: Phaser.GameObjects.Rectangle;
  private maxSpeed = 320;
  private started = false;
  private finished = false;
  private startTime = 0;
  private hud!: Phaser.GameObjects.Text;
  private banner?: Phaser.GameObjects.Text;

  constructor() {
    super('MazeScene');
  }

  init(data: MazeInit): void {
    this.level = data.level ?? 1;
    this.walls = [];
    this.started = false;
    this.finished = false;
    this.banner = undefined;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a).setDepth(-10);

    // Difficulté croissante : le labyrinthe grandit à chaque niveau.
    const cellCols = 7 + this.level;
    const cellRows = 5 + this.level;
    const maze = generateMaze(cellCols, cellRows);

    // Mise en page : on réserve une marge en haut pour le HUD.
    const marginTop = 56;
    const pad = 16;
    const availW = width - pad * 2;
    const availH = height - marginTop - pad;
    const tile = Math.floor(Math.min(availW / maze.cols, availH / maze.rows));
    const mazeW = tile * maze.cols;
    const mazeH = tile * maze.rows;
    const offsetX = (width - mazeW) / 2;
    const offsetY = marginTop + (availH - mazeH) / 2;

    // Fond de la zone de jeu.
    this.add.rectangle(offsetX + mazeW / 2, offsetY + mazeH / 2, mazeW, mazeH, 0x111c33);

    // Murs (avec corps physiques statiques pour les collisions).
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        if (maze.grid[r][c] === 1) {
          const x = offsetX + c * tile + tile / 2;
          const y = offsetY + r * tile + tile / 2;
          const wall = this.add.rectangle(x, y, tile, tile, 0x24406b);
          this.physics.add.existing(wall, true);
          this.walls.push(wall);
        }
      }
    }

    // Sortie.
    const ex = offsetX + maze.exit.c * tile + tile / 2;
    const ey = offsetY + maze.exit.r * tile + tile / 2;
    this.exitZone = this.add
      .rectangle(ex, ey, tile, tile, 0xf59e0b)
      .setStrokeStyle(2, 0xfbbf24);
    this.physics.add.existing(this.exitZone, true);
    this.add
      .text(ex, ey, '★', {
        fontFamily: 'system-ui',
        fontSize: `${Math.floor(tile * 0.6)}px`,
        color: '#7c2d12',
      })
      .setOrigin(0.5);

    // Marqueur de départ.
    const sx = offsetX + maze.start.c * tile + tile / 2;
    const sy = offsetY + maze.start.r * tile + tile / 2;
    this.add.rectangle(sx, sy, tile, tile, 0x14532d, 0.6);

    // Joueur : texture générée (cercle) pour un corps circulaire propre.
    const radius = Math.max(6, Math.floor(tile * 0.3));
    this.playerRadius = radius;
    if (this.textures.exists('player')) {
      this.textures.remove('player');
    }
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(2, 0x166534, 1);
    g.strokeCircle(radius, radius, radius);
    g.generateTexture('player', radius * 2, radius * 2);
    g.destroy();

    this.player = this.physics.add.image(sx, sy, 'player').setDepth(5);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCircle(radius);
    this.maxSpeed = tile * 6;

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.overlap(this.player, this.exitZone, () => this.win());

    // HUD.
    this.hud = this.add
      .text(pad, 16, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#e2e8f0' })
      .setDepth(10);
    this.add
      .text(width - pad, 16, 'Échap : menu', {
        fontFamily: 'system-ui',
        fontSize: '14px',
        color: '#64748b',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // Invite de départ.
    this.banner = this.add
      .text(width / 2, offsetY + mazeH + 4, 'Amène la souris sur la bille verte pour commencer', {
        fontFamily: 'system-ui',
        fontSize: '16px',
        color: '#f8fafc',
        backgroundColor: '#1e293bcc',
        padding: { x: 12, y: 8 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(20);

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));

    this.updateHud();
  }

  private win(): void {
    if (this.finished) return;
    this.finished = true;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    const time = ((this.time.now - this.startTime) / 1000).toFixed(1);
    const { width, height } = this.scale;

    this.banner?.destroy();
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(30);
    this.add
      .text(width / 2, height / 2 - 30, `Niveau ${this.level} terminé !`, {
        fontFamily: 'system-ui',
        fontSize: '34px',
        color: '#4ade80',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(31);
    this.add
      .text(width / 2, height / 2 + 12, `Temps : ${time}s`, {
        fontFamily: 'system-ui',
        fontSize: '20px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
      .setDepth(31);
    this.add
      .text(width / 2, height / 2 + 50, 'Niveau suivant…', {
        fontFamily: 'system-ui',
        fontSize: '16px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.time.delayedCall(1500, () => this.scene.restart({ level: this.level + 1 }));
  }

  update(): void {
    if (this.finished) return;

    const pointer = this.input.activePointer;
    const px = pointer.worldX;
    const py = pointer.worldY;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // On ne démarre (et on ne lance le chrono) qu'une fois la souris posée
    // sur la bille : évite un dash involontaire à l'ouverture du niveau.
    if (!this.started) {
      const d = Phaser.Math.Distance.Between(px, py, this.player.x, this.player.y);
      if (d < this.playerRadius + 6) {
        this.started = true;
        this.startTime = this.time.now;
        this.banner?.destroy();
      } else {
        body.setVelocity(0, 0);
        this.updateHud();
        return;
      }
    }

    const dist = Phaser.Math.Distance.Between(px, py, this.player.x, this.player.y);
    if (dist > 3) {
      // La vitesse se réduit près de la cible pour éviter les tremblements.
      const speed = Math.min(this.maxSpeed, dist * 10);
      this.physics.moveTo(this.player, px, py, speed);
    } else {
      body.setVelocity(0, 0);
    }

    this.updateHud();
  }

  private updateHud(): void {
    const t = this.started ? ((this.time.now - this.startTime) / 1000).toFixed(1) : '0.0';
    this.hud.setText(`Niveau ${this.level}     ⏱ ${t}s`);
  }
}
