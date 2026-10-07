import Phaser from 'phaser';

const TILE = 48;
const TANK = 40;

type Facing = 'up' | 'down' | 'left' | 'right';

interface FaceInfo {
  x: number;
  y: number;
  angle: number;
}

const FACES: Record<Facing, FaceInfo> = {
  up: { x: 0, y: -1, angle: 0 },
  right: { x: 1, y: 0, angle: 90 },
  down: { x: 0, y: 1, angle: 180 },
  left: { x: -1, y: 0, angle: 270 },
};

const DIRS: Facing[] = ['up', 'down', 'left', 'right'];

/**
 * Minigame « Tank Battle » (façon Battle City).
 * Déplace ton tank (flèches / ZQSD), tire (Espace). Détruis tous les bots.
 * Les murs de briques sont destructibles ; les blocs d'acier non.
 * Les vagues s'enchaînent avec de plus en plus d'ennemis.
 */
export class TankScene extends Phaser.Scene {
  private originX = 0;
  private originY = 0;
  private arenaW = 0;
  private arenaH = 0;
  private cols = 0;
  private rows = 0;

  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Image;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private fireKey!: Phaser.Input.Keyboard.Key;

  private playerFacing: Facing = 'up';
  private playerNextShot = 0;
  private playerSpeed = 150;
  private enemySpeed = 85;
  private invulnUntil = 0;

  private score = 0;
  private lives = 3;
  private wave = 1;
  private state: 'playing' | 'over' = 'playing';

  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('TankScene');
  }

  init(): void {
    this.playerFacing = 'up';
    this.playerNextShot = 0;
    this.invulnUntil = 0;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.state = 'playing';
    this.enemySpeed = 85;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1220).setDepth(-10);

    this.makeTextures();

    // Arène.
    const hud = 48;
    this.cols = Math.floor((width - 32) / TILE);
    this.rows = Math.floor((height - hud - 24) / TILE);
    this.arenaW = this.cols * TILE;
    this.arenaH = this.rows * TILE;
    this.originX = Math.floor((width - this.arenaW) / 2);
    this.originY = hud + Math.floor((height - hud - 24 - this.arenaH) / 2);

    this.add
      .rectangle(this.originX + this.arenaW / 2, this.originY + this.arenaH / 2, this.arenaW, this.arenaH, 0x0f172a)
      .setDepth(-5);
    this.add
      .rectangle(this.originX + this.arenaW / 2, this.originY + this.arenaH / 2, this.arenaW, this.arenaH)
      .setStrokeStyle(2, 0x334155)
      .setDepth(-4);

    this.physics.world.setBounds(this.originX, this.originY, this.arenaW, this.arenaH);

    // Murs.
    this.walls = this.physics.add.staticGroup();
    this.buildMap();

    // Groupes de projectiles.
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();

    // Joueur.
    const spawn = this.tileCenter(Math.floor(this.cols / 2), this.rows - 1);
    this.player = this.physics.add.image(spawn.x, spawn.y, 'tankP').setDepth(3);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(TANK - 8, TANK - 8, true);
    this.player.setCollideWorldBounds(true);

    // Ennemis.
    this.enemies = this.physics.add.group();
    this.spawnWave(this.wave);

    // Collisions.
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.playerBullets, this.walls, this.onBulletWall, undefined, this);
    this.physics.add.overlap(this.enemyBullets, this.walls, this.onBulletWall, undefined, this);
    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletEnemy, undefined, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.onBulletPlayer, undefined, this);

    // HUD.
    const pad = 16;
    this.scoreText = this.add
      .text(pad, 12, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#fbbf24' })
      .setDepth(20);
    this.statusText = this.add
      .text(pad, 38, '', { fontFamily: 'system-ui', fontSize: '15px', color: '#94a3b8' })
      .setDepth(20);
    this.waveText = this.add
      .text(width / 2, 16, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#e2e8f0' })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.makeResetButton(width - pad, 28);
    this.add
      .text(width / 2, height - 16, 'Flèches / ZQSD : bouger — Espace : tirer — Échap : menu', {
        fontFamily: 'system-ui',
        fontSize: '13px',
        color: '#64748b',
      })
      .setOrigin(0.5, 1)
      .setDepth(20);

    // Entrées.
    const kb = this.input.keyboard;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    kb?.addCapture([KC.UP, KC.DOWN, KC.LEFT, KC.RIGHT, KC.SPACE, KC.W, KC.A, KC.S, KC.D, KC.Z, KC.Q]);
    this.cursors = kb!.createCursorKeys();
    this.wasd = kb!.addKeys({
      up: KC.W,
      left: KC.A,
      down: KC.S,
      right: KC.D,
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.fireKey = kb!.addKey(KC.SPACE);
    kb?.on('keydown-ESC', () => this.scene.start('MenuScene'));
    this.input.on('pointerdown', () => {
      if (this.state === 'over') this.scene.restart();
    });

    this.updateHud();
    this.showBanner(`Vague ${this.wave}`);
  }

  private makeTextures(): void {
    this.makeTankTexture('tankP', 0x4ade80, 0x166534);
    this.makeTankTexture('tankE', 0xf87171, 0x7f1d1d);
    this.makeBulletTexture('bulletP', 0xfde047);
    this.makeBulletTexture('bulletE', 0xfb923c);
    this.makeBrickTexture();
    this.makeSteelTexture();
  }

  private makeTankTexture(key: string, body: number, barrel: number): void {
    if (this.textures.exists(key)) return;
    const s = TANK;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x111827, 1);
    g.fillRect(0, 3, 8, s - 6);
    g.fillRect(s - 8, 3, 8, s - 6);
    g.fillStyle(body, 1);
    g.fillRoundedRect(6, 7, s - 12, s - 14, 5);
    g.fillStyle(barrel, 1);
    g.fillRect(s / 2 - 3, 0, 6, s / 2);
    g.fillCircle(s / 2, s / 2, 8);
    g.generateTexture(key, s, s);
    g.destroy();
  }

  private makeBulletTexture(key: string, color: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillCircle(5, 5, 4);
    g.generateTexture(key, 10, 10);
    g.destroy();
  }

  private makeBrickTexture(): void {
    if (this.textures.exists('brick')) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x9a3412, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x7c2d12, 1);
    for (let r = 0; r < TILE; r += 12) g.fillRect(0, r, TILE, 2);
    for (let r = 0; r < TILE; r += 12) {
      const off = (r / 12) % 2 === 0 ? 0 : TILE / 2;
      for (let c = 0; c < TILE; c += TILE / 2) g.fillRect(((c + off) % TILE), r, 2, 12);
    }
    g.generateTexture('brick', TILE, TILE);
    g.destroy();
  }

  private makeSteelTexture(): void {
    if (this.textures.exists('steel')) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x64748b, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x94a3b8, 1);
    g.fillRect(4, 4, TILE - 8, TILE - 8);
    g.fillStyle(0x475569, 1);
    const b = 5;
    g.fillCircle(8, 8, b);
    g.fillCircle(TILE - 8, 8, b);
    g.fillCircle(8, TILE - 8, b);
    g.fillCircle(TILE - 8, TILE - 8, b);
    g.generateTexture('steel', TILE, TILE);
    g.destroy();
  }

  private tileCenter(c: number, r: number): { x: number; y: number } {
    return { x: this.originX + c * TILE + TILE / 2, y: this.originY + r * TILE + TILE / 2 };
  }

  private buildMap(): void {
    // Blocs 2x2 en quinconce avec des couloirs d'une tuile.
    for (let r = 2; r < this.rows - 3; r += 3) {
      for (let c = 2; c < this.cols - 2; c += 3) {
        const steel = (c + r) % 5 === 0; // quelques blocs en acier
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            this.placeWall(c + dc, r + dr, steel ? 'steel' : 'brick');
          }
        }
      }
    }
  }

  private placeWall(c: number, r: number, type: 'brick' | 'steel'): void {
    const { x, y } = this.tileCenter(c, r);
    const wall = this.walls.create(x, y, type) as Phaser.Physics.Arcade.Image;
    wall.setData('type', type);
    wall.setDepth(1);
  }

  private spawnWave(wave: number): void {
    const count = Math.min(3 + (wave - 1), 6);
    const placed: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const pos =
        this.randomSpawn(placed) ?? {
          x: this.originX + (this.arenaW * (i + 1)) / (count + 1),
          y: this.originY + TILE * 0.7,
        };
      placed.push(pos);

      const enemy = this.enemies.create(pos.x, pos.y, 'tankE') as Phaser.Physics.Arcade.Image;
      (enemy.body as Phaser.Physics.Arcade.Body).setSize(TANK - 8, TANK - 8, true);
      enemy.setCollideWorldBounds(true);
      enemy.setDepth(3);
      const dir = Phaser.Utils.Array.GetRandom(DIRS);
      enemy.setData('dir', dir);
      enemy.setData('nextTurn', 0);
      enemy.setData('nextShot', this.time.now + Phaser.Math.Between(600, 1800));
      enemy.setAngle(FACES[dir].angle);
    }
  }

  /** Cherche une case aléatoire libre : hors des murs, loin du joueur et des autres tanks. */
  private randomSpawn(placed: { x: number; y: number }[]): { x: number; y: number } | null {
    const walls = this.walls.getChildren() as Phaser.Physics.Arcade.Image[];
    for (let attempt = 0; attempt < 80; attempt++) {
      const c = Phaser.Math.Between(0, this.cols - 1);
      const r = Phaser.Math.Between(0, this.rows - 1);
      const { x, y } = this.tileCenter(c, r);

      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < TILE * 4) continue;
      if (walls.some((w) => w.active && Phaser.Math.Distance.Between(x, y, w.x, w.y) < TILE * 0.9)) {
        continue;
      }
      if (placed.some((p) => Phaser.Math.Distance.Between(x, y, p.x, p.y) < TILE * 1.3)) continue;

      return { x, y };
    }
    return null;
  }

  private fire(
    x: number,
    y: number,
    facing: Facing,
    group: Phaser.Physics.Arcade.Group,
    speed: number,
    texture: string,
  ): void {
    const f = FACES[facing];
    const bullet = group.create(x + f.x * 22, y + f.y * 22, texture) as Phaser.Physics.Arcade.Image;
    bullet.setDepth(4);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setSize(8, 8, true);
    body.setVelocity(f.x * speed, f.y * speed);
  }

  private onBulletWall: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (bulletObj, wallObj) => {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const wall = wallObj as Phaser.Physics.Arcade.Image;
    if (!bullet.active) return;
    bullet.destroy();
    if (wall.getData('type') === 'brick') {
      this.explode(wall.x, wall.y, 0xf59e0b, 14);
      wall.destroy();
    }
  };

  private onBulletEnemy: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (bulletObj, enemyObj) => {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const enemy = enemyObj as Phaser.Physics.Arcade.Image;
    if (!bullet.active || !enemy.active) return;
    bullet.destroy();
    this.explode(enemy.x, enemy.y, 0xf87171, 22);
    enemy.destroy();
    this.score += 100;
    this.updateHud();
    if (this.enemies.countActive(true) === 0) {
      this.nextWave();
    }
  };

  private onBulletPlayer: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (bulletObj) => {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    if (!bullet.active) return;
    bullet.destroy();
    if (this.time.now < this.invulnUntil || this.state !== 'playing') return;
    this.hitPlayer();
  };

  private hitPlayer(): void {
    this.lives--;
    this.explode(this.player.x, this.player.y, 0x4ade80, 24);
    this.updateHud();
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }
    const spawn = this.tileCenter(Math.floor(this.cols / 2), this.rows - 1);
    this.player.setPosition(spawn.x, spawn.y);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.playerFacing = 'up';
    this.player.setAngle(0);
    this.invulnUntil = this.time.now + 1800;
  }

  private nextWave(): void {
    this.wave++;
    this.enemySpeed = Math.min(140, this.enemySpeed + 10);
    this.updateHud();
    this.showBanner(`Vague ${this.wave}`);
    this.time.delayedCall(1200, () => {
      if (this.state === 'playing') {
        this.spawnWave(this.wave);
        this.updateHud();
      }
    });
  }

  private explode(x: number, y: number, color: number, radius: number): void {
    const blast = this.add.circle(x, y, radius, color, 0.9).setDepth(8);
    this.tweens.add({
      targets: blast,
      scale: 2.2,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => blast.destroy(),
    });
  }

  private showBanner(text: string): void {
    const { width, height } = this.scale;
    const banner = this.add
      .text(width / 2, height / 2, text, {
        fontFamily: 'system-ui',
        fontSize: '40px',
        color: '#f8fafc',
        fontStyle: 'bold',
        backgroundColor: '#0b1220cc',
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 700,
      duration: 500,
      onComplete: () => banner.destroy(),
    });
  }

  /** Bouton « Reset » arcade (relance la partie à la vague 1). */
  private makeResetButton(rightX: number, centerY: number): void {
    const w = 104;
    const h = 32;
    const accent = 0xf87171;
    const bg = this.add.rectangle(0, 0, w, h, 0x2a1420).setStrokeStyle(2, accent);
    const label = this.add
      .text(0, 0, '⟳ Reset', { fontFamily: 'system-ui', fontSize: '15px', color: '#fecaca' })
      .setOrigin(0.5);
    const container = this.add.container(rightX - w / 2, centerY, [bg, label]).setDepth(21);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x3b1d2a));
    bg.on('pointerout', () => bg.setFillStyle(0x2a1420));
    bg.on('pointerdown', () => this.scene.restart());
    void container;
  }

  private gameOver(): void {
    this.state = 'over';
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.player.setVisible(false);
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.62).setDepth(100);
    this.add
      .text(width / 2, height / 2 - 40, 'Game Over', {
        fontFamily: 'system-ui',
        fontSize: '46px',
        color: '#f87171',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(101);
    this.add
      .text(width / 2, height / 2 + 8, `Score : ${this.score}   ·   Vague ${this.wave}`, {
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

  private isDown(dir: 'up' | 'down' | 'left' | 'right'): boolean {
    return this.cursors[dir].isDown || this.wasd[dir].isDown;
  }

  private enemyBlocked(enemy: Phaser.Physics.Arcade.Image, dir: Facing): boolean {
    const b = enemy.body as Phaser.Physics.Arcade.Body;
    if (dir === 'left') return b.blocked.left;
    if (dir === 'right') return b.blocked.right;
    if (dir === 'up') return b.blocked.up;
    return b.blocked.down;
  }

  private retargetEnemy(enemy: Phaser.Physics.Arcade.Image, now: number): void {
    const open = DIRS.filter((d) => !this.enemyBlocked(enemy, d));
    const pool = open.length > 0 ? open : DIRS;
    let choice: Facing;
    if (Math.random() < 0.55) {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const pref: Facing =
        Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      choice = pool.includes(pref) ? pref : Phaser.Utils.Array.GetRandom(pool);
    } else {
      choice = Phaser.Utils.Array.GetRandom(pool);
    }
    const f = FACES[choice];
    (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(f.x * this.enemySpeed, f.y * this.enemySpeed);
    enemy.setAngle(f.angle);
    enemy.setData('dir', choice);
    enemy.setData('nextTurn', now + Phaser.Math.Between(700, 1600));
  }

  update(): void {
    if (this.state !== 'playing') return;
    const now = this.time.now;

    // Joueur.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    let facing: Facing | null = null;
    if (this.isDown('left')) {
      vx = -this.playerSpeed;
      facing = 'left';
    } else if (this.isDown('right')) {
      vx = this.playerSpeed;
      facing = 'right';
    } else if (this.isDown('up')) {
      vy = -this.playerSpeed;
      facing = 'up';
    } else if (this.isDown('down')) {
      vy = this.playerSpeed;
      facing = 'down';
    }
    body.setVelocity(vx, vy);
    if (facing) {
      this.playerFacing = facing;
      this.player.setAngle(FACES[facing].angle);
    }

    if (this.fireKey.isDown && now > this.playerNextShot) {
      this.fire(this.player.x, this.player.y, this.playerFacing, this.playerBullets, 460, 'bulletP');
      this.playerNextShot = now + 300;
    }

    // Clignotement pendant l'invulnérabilité.
    this.player.setAlpha(now < this.invulnUntil && Math.floor(now / 100) % 2 === 0 ? 0.35 : 1);

    // Ennemis.
    const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const dir = enemy.getData('dir') as Facing;
      const nextTurn = enemy.getData('nextTurn') as number;
      if (!dir || now > nextTurn || this.enemyBlocked(enemy, dir)) {
        this.retargetEnemy(enemy, now);
      }
      if (now > (enemy.getData('nextShot') as number)) {
        this.fire(enemy.x, enemy.y, enemy.getData('dir') as Facing, this.enemyBullets, 300, 'bulletE');
        enemy.setData('nextShot', now + Phaser.Math.Between(1100, 2400));
      }
    }

    // Nettoie les projectiles hors arène.
    this.cleanupBullets(this.playerBullets);
    this.cleanupBullets(this.enemyBullets);
  }

  private cleanupBullets(group: Phaser.Physics.Arcade.Group): void {
    const bullets = group.getChildren() as Phaser.Physics.Arcade.Image[];
    for (const bullet of bullets) {
      if (!bullet.active) continue;
      if (
        bullet.x < this.originX ||
        bullet.x > this.originX + this.arenaW ||
        bullet.y < this.originY ||
        bullet.y > this.originY + this.arenaH
      ) {
        bullet.destroy();
      }
    }
  }

  private updateHud(): void {
    this.scoreText.setText(`$ ${this.score}`);
    this.waveText.setText(`Vague ${this.wave}`);
    this.statusText.setText(`Vies : ${this.lives}   ·   Ennemis : ${this.enemies.countActive(true)}`);
  }
}
