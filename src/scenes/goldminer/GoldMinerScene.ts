import Phaser from 'phaser';

interface GoldMinerInit {
  level?: number;
  score?: number;
}

type HookState = 'swing' | 'extend' | 'retract' | 'ended';

interface Collectible {
  kind: string;
  value: number;
  weight: number; // plus lourd = remontée plus lente
  radius: number; // rayon de collision
  shape: Phaser.GameObjects.Shape;
}

/**
 * Minigame « Gold Miner ».
 *
 * Un grappin oscille au bout d'une corde. On le lâche (clic / Espace / Bas) :
 * il s'étend dans la direction courante, attrape le premier objet touché, puis
 * remonte — d'autant plus lentement que l'objet est lourd. Il faut atteindre
 * l'objectif de score avant la fin du chrono pour passer au niveau suivant.
 */
export class GoldMinerScene extends Phaser.Scene {
  private level = 1;
  private score = 0;
  private goal = 0;

  // Grappin / corde.
  private pivot = new Phaser.Math.Vector2(0, 0);
  private state: HookState = 'swing';
  private swingT = 0;
  private swingSpeed = 2.4; // vitesse angulaire de l'oscillation
  private swingRange = Phaser.Math.DegToRad(78);
  private angle = 0; // 0 = tout droit vers le bas
  private length = 30;
  private minLength = 30;
  private maxLength = 2000;
  private extendSpeed = 480;
  private emptyRetract = 640;
  private loadedRetractBase = 420;
  private currentRetract = 640;
  private hookRadius = 10;

  private collectibles: Collectible[] = [];
  private grabbed: Collectible | null = null;

  // Temps.
  private timeLimit = 60000;
  private timeLeft = 60000;

  // Rendu / UI.
  private rope!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private won = false;

  constructor() {
    super('GoldMinerScene');
  }

  init(data: GoldMinerInit): void {
    this.level = data.level ?? 1;
    this.score = data.score ?? 0;
    this.collectibles = [];
    this.grabbed = null;
    this.state = 'swing';
    this.swingT = 0;
    this.angle = 0;
    this.length = this.minLength;
    this.won = false;
    this.timeLeft = this.timeLimit;
  }

  create(): void {
    const { width, height } = this.scale;
    this.goal = GoldMinerScene.goalForLevel(this.level);

    // Décor : ciel puis terre.
    const surfaceH = 96;
    this.add.rectangle(width / 2, surfaceH / 2, width, surfaceH, 0x0f172a).setDepth(-10);
    this.add
      .rectangle(width / 2, (surfaceH + height) / 2, width, height - surfaceH, 0x2a1c0b)
      .setDepth(-10);
    this.add.rectangle(width / 2, surfaceH, width, 4, 0x000000, 0.35).setDepth(-9);

    // Le mineur.
    const cx = width / 2;
    this.add.rectangle(cx, 66, 32, 36, 0x1d4ed8).setDepth(1); // corps
    this.add.circle(cx, 40, 13, 0xf1c27d).setDepth(1); // tête
    this.add.rectangle(cx, 30, 34, 7, 0xdc2626).setDepth(2); // bord du casque
    this.add.rectangle(cx, 23, 22, 12, 0xdc2626).setDepth(2); // dôme du casque

    this.pivot.set(cx, 84);

    // Génère les objets à ramasser.
    this.spawnCollectibles();

    // Corde + grappin (redessinés à chaque frame).
    this.rope = this.add.graphics().setDepth(5);

    // HUD.
    const pad = 18;
    this.scoreText = this.add
      .text(pad, 14, '', { fontFamily: 'system-ui', fontSize: '22px', color: '#fbbf24' })
      .setDepth(20);
    this.goalText = this.add
      .text(pad, 42, '', { fontFamily: 'system-ui', fontSize: '15px', color: '#94a3b8' })
      .setDepth(20);
    this.levelText = this.add
      .text(width / 2, 14, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#e2e8f0' })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.timeText = this.add
      .text(width - pad, 14, '', { fontFamily: 'system-ui', fontSize: '22px', color: '#e2e8f0' })
      .setOrigin(1, 0)
      .setDepth(20);
    this.add
      .text(width - pad, 44, 'Clic / Espace : lâcher — Échap : menu', {
        fontFamily: 'system-ui',
        fontSize: '13px',
        color: '#64748b',
      })
      .setOrigin(1, 0)
      .setDepth(20);

    // Entrées.
    this.input.on('pointerdown', () => this.onDrop());
    this.input.keyboard?.on('keydown-SPACE', () => this.onDrop());
    this.input.keyboard?.on('keydown-DOWN', () => this.onDrop());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));

    this.updateHud();
    this.drawRope();
  }

  /** Objectif cumulé à atteindre au niveau n : 300, 700, 1200, 1800, … */
  private static goalForLevel(n: number): number {
    return 200 * n + 50 * n * (n + 1);
  }

  private spawnCollectibles(): void {
    const { width, height } = this.scale;

    const specs = [
      { kind: 'gold-small', value: 60, weight: 1, radius: 15, color: 0xfbbf24, stroke: 0xb45309 },
      { kind: 'gold-large', value: 130, weight: 2, radius: 24, color: 0xf59e0b, stroke: 0x92400e },
      { kind: 'rock', value: 20, weight: 3, radius: 22, color: 0x6b7280, stroke: 0x374151 },
      { kind: 'diamond', value: 300, weight: 1, radius: 16, color: 0x22d3ee, stroke: 0x0e7490 },
    ];

    const needed = Math.max(this.goal - this.score, 0);
    const valueTarget = Math.max(needed * 1.8, 500);

    const minY = 178;
    const maxY = height - 46;
    const minX = 46;
    const maxX = width - 46;

    let total = 0;
    let guard = 0;
    while (total < valueTarget && this.collectibles.length < 16 && guard < 400) {
      guard++;
      const r = Math.random();
      const spec = r < 0.4 ? specs[0] : r < 0.65 ? specs[1] : r < 0.9 ? specs[2] : specs[3];

      // Cherche une position sans chevauchement.
      let placed = false;
      for (let attempt = 0; attempt < 30 && !placed; attempt++) {
        const x = Phaser.Math.Between(minX, maxX);
        const y = Phaser.Math.Between(minY, maxY);
        const clash = this.collectibles.some(
          (c) => Phaser.Math.Distance.Between(x, y, c.shape.x, c.shape.y) < c.radius + spec.radius + 10,
        );
        if (clash) continue;

        let shape: Phaser.GameObjects.Shape;
        if (spec.kind === 'diamond') {
          shape = this.add
            .rectangle(x, y, spec.radius * 1.5, spec.radius * 1.5, spec.color)
            .setStrokeStyle(3, spec.stroke)
            .setAngle(45);
        } else {
          shape = this.add.circle(x, y, spec.radius, spec.color).setStrokeStyle(3, spec.stroke);
        }
        shape.setDepth(3);

        this.collectibles.push({
          kind: spec.kind,
          value: spec.value,
          weight: spec.weight,
          radius: spec.radius,
          shape,
        });
        total += spec.value;
        placed = true;
      }
      if (!placed) break; // plus de place
    }
  }

  private onDrop(): void {
    if (this.state === 'swing') {
      this.state = 'extend';
      return;
    }
    if (this.state === 'ended' && !this.won) {
      this.scene.restart({ level: 1, score: 0 });
    }
  }

  private tip(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.pivot.x + Math.sin(this.angle) * this.length,
      this.pivot.y + Math.cos(this.angle) * this.length,
    );
  }

  private startRetract(target: Collectible | null): void {
    this.grabbed = target;
    this.state = 'retract';
    if (target) {
      this.currentRetract = this.loadedRetractBase / target.weight;
      target.shape.setDepth(6);
    } else {
      this.currentRetract = this.emptyRetract;
    }
  }

  private finalizeGrab(): void {
    if (this.grabbed) {
      this.score += this.grabbed.value;
      this.collectibles = this.collectibles.filter((c) => c !== this.grabbed);
      this.grabbed.shape.destroy();
      this.grabbed = null;
      if (this.collectibles.length === 0) {
        this.endLevel();
        return;
      }
    }
    this.state = 'swing';
  }

  private endLevel(): void {
    if (this.state === 'ended') return;
    this.state = 'ended';
    this.won = this.score >= this.goal;

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(100);

    if (this.won) {
      this.add
        .text(width / 2, height / 2 - 40, `Niveau ${this.level} réussi !`, {
          fontFamily: 'system-ui',
          fontSize: '38px',
          color: '#4ade80',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.add
        .text(width / 2, height / 2 + 6, `Score : ${this.score}  (objectif ${this.goal})`, {
          fontFamily: 'system-ui',
          fontSize: '20px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.add
        .text(width / 2, height / 2 + 46, 'Niveau suivant…', {
          fontFamily: 'system-ui',
          fontSize: '16px',
          color: '#94a3b8',
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.time.delayedCall(1800, () =>
        this.scene.restart({ level: this.level + 1, score: this.score }),
      );
    } else {
      this.add
        .text(width / 2, height / 2 - 40, 'Perdu !', {
          fontFamily: 'system-ui',
          fontSize: '40px',
          color: '#f43f5e',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.add
        .text(width / 2, height / 2 + 6, `Score : ${this.score}  —  objectif manqué : ${this.goal}`, {
          fontFamily: 'system-ui',
          fontSize: '20px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.add
        .text(width / 2, height / 2 + 46, 'Clic / Espace : rejouer   ·   Échap : menu', {
          fontFamily: 'system-ui',
          fontSize: '16px',
          color: '#94a3b8',
        })
        .setOrigin(0.5)
        .setDepth(101);
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const { width, height } = this.scale;

    if (this.state !== 'ended') {
      this.timeLeft -= delta;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endLevel();
      }
    }

    if (this.state === 'swing') {
      this.swingT += dt * this.swingSpeed;
      this.angle = this.swingRange * Math.sin(this.swingT);
      this.length = this.minLength;
    } else if (this.state === 'extend') {
      this.length += this.extendSpeed * dt;
      const tip = this.tip();

      const outOfBounds =
        tip.x < 24 || tip.x > width - 24 || tip.y > height - 24 || this.length > this.maxLength;
      if (outOfBounds) {
        this.startRetract(null);
      } else {
        const hit = this.collectibles.find(
          (c) => Phaser.Math.Distance.Between(tip.x, tip.y, c.shape.x, c.shape.y) <= c.radius + this.hookRadius,
        );
        if (hit) this.startRetract(hit);
      }
    } else if (this.state === 'retract') {
      this.length -= this.currentRetract * dt;
      if (this.grabbed) {
        const tip = this.tip();
        this.grabbed.shape.setPosition(tip.x, tip.y);
      }
      if (this.length <= this.minLength) {
        this.length = this.minLength;
        this.finalizeGrab();
      }
    }

    this.drawRope();
    this.updateHud();
  }

  private drawRope(): void {
    const tip = this.tip();
    const g = this.rope;
    g.clear();

    // Corde.
    g.lineStyle(3, 0xcbd5e1, 1);
    g.lineBetween(this.pivot.x, this.pivot.y, tip.x, tip.y);

    // Griffe orientée selon la corde.
    const dirX = Math.sin(this.angle);
    const dirY = Math.cos(this.angle);
    const perpX = dirY;
    const perpY = -dirX;
    const span = 9;
    const prong = 12;
    const bx = tip.x;
    const by = tip.y;
    const lX = bx + perpX * span;
    const lY = by + perpY * span;
    const rX = bx - perpX * span;
    const rY = by - perpY * span;

    g.lineStyle(4, 0x94a3b8, 1);
    g.lineBetween(lX, lY, rX, rY); // barre de la griffe
    g.lineBetween(lX, lY, lX + dirX * prong, lY + dirY * prong); // pince gauche
    g.lineBetween(rX, rY, rX + dirX * prong, rY + dirY * prong); // pince droite

    g.fillStyle(0xcbd5e1, 1);
    g.fillCircle(bx, by, 5);
  }

  private updateHud(): void {
    this.scoreText.setText(`$ ${this.score}`);
    this.goalText.setText(`Objectif : ${this.goal}`);
    this.levelText.setText(`Niveau ${this.level}`);
    const secs = Math.ceil(this.timeLeft / 1000);
    this.timeText.setText(`⏱ ${secs}s`);
    this.timeText.setColor(secs <= 10 ? '#f43f5e' : '#e2e8f0');
  }
}
