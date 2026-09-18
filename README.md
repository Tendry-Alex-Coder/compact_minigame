# Compact Mini

Collection de minigames web à jouer quand on s'ennuie.

Jeux disponibles :
- **Labyrinthe** — généré procéduralement, dirigé à la souris, avec réglage de difficulté.
- **Gold Miner** — un grappin qui balance ; lâche-le pour attraper l'or et les diamants avant la fin du chrono.
- **Tetris** — empile les blocs et complète des lignes. Modes Facile / Intermédiaire / Expert / Infini.
- **Memory** — retrouve les paires de tuiles identiques. Le niveau = le nombre de tuiles (12 → 36).

## Stack

- **Vite** + **TypeScript** — build/dev rapide, typage sûr
- **Phaser 3** — moteur de jeu 2D (boucle, souris, collisions, gestion des scènes)

## Démarrer

```bash
npm install
npm run dev      # serveur de dev sur http://localhost:5173
```

Autres scripts :

```bash
npm run build    # vérifie les types (tsc) puis build de production dans dist/
npm run preview  # sert le build de production
```

## Comment jouer

### Labyrinthe

1. Depuis le menu, clique sur **Labyrinthe**, puis choisis une **difficulté**.
2. Amène la souris sur la **bille verte** pour démarrer (lance le chrono).
3. La bille **suit ta souris** ; les murs la bloquent.
4. Atteins la **sortie ★** pour passer au niveau suivant (plus grand).
5. **Échap** : revenir à l'écran de difficulté.

### Gold Miner

1. Depuis le menu, clique sur **Gold Miner**.
2. Le grappin oscille tout seul. **Clic / Espace / Bas** : le lâcher.
3. Il attrape le premier objet touché et le remonte — plus c'est **lourd**, plus
   c'est **lent**. Or 🟡, diamants 🔷 (précieux), pierres ⚫ (lourdes, peu payantes).
4. Attention aux **bombes** 💣 (pièges) : les attraper fait **perdre 250 points**
   (avec explosion), et il y en a de plus en plus aux niveaux élevés.
5. Atteins l'**objectif** de score avant la fin du **chrono** (60 s) pour passer
   au niveau suivant. Sinon, c'est perdu.
6. **Échap** : revenir au menu.

### Tetris

1. Depuis le menu, clique sur **Tetris**, puis choisis un **mode** :
   - **Facile / Intermédiaire / Expert** : vitesse de chute constante (lente → rapide).
   - **Infini** : la vitesse augmente sans fin toutes les 10 lignes, et le score
     est multiplié par le niveau.
2. Contrôles : **← →** déplacer, **↑** tourner, **↓** descendre plus vite,
   **Espace** chute instantanée, **Échap** menu.
3. Complète des lignes pour marquer : **100 / 300 / 500 / 800** points selon le
   nombre de lignes effacées d'un seul coup.
4. La partie se termine quand la pile atteint le haut.

### Memory

1. Depuis le menu, clique sur **Memory**, puis choisis le **nombre de tuiles**
   (12 / 16 / 24 / 36 — c'est le niveau).
2. Au départ, **toutes les tuiles sont montrées quelques secondes** (« Mémorise ! »)
   avec un compte à rebours, puis elles se retournent et le chrono démarre.
3. Clique une tuile pour la retourner, puis une seconde.
4. Deux motifs **identiques** → la paire reste découverte (en vert). Sinon, les
   deux tuiles se retournent.
5. Trouve toutes les paires. Le nombre de **coups** et le **temps** sont comptés,
   et on enchaîne automatiquement vers la grille plus grande.
6. **Échap** : revenir à l'écran de sélection.

## Architecture

```
src/
├── main.ts                    # config Phaser, enregistre les scènes
├── games/
│   └── registry.ts            # registre central des minigames (source unique)
├── scenes/
│   ├── BootScene.ts           # amorçage (chargement futur des assets)
│   ├── MenuScene.ts           # hub : liste et lance les jeux
│   ├── maze/
│   │   ├── MazeSetupScene.ts  # choix de la difficulté
│   │   ├── MazeScene.ts       # le jeu de labyrinthe
│   │   ├── mazeGenerator.ts   # génération (recursive backtracker)
│   │   └── difficulty.ts      # presets de difficulté
│   ├── goldminer/
│   │   └── GoldMinerScene.ts  # le jeu Gold Miner
│   ├── tetris/
│   │   ├── TetrisSetupScene.ts # choix du mode
│   │   ├── TetrisScene.ts      # le jeu Tetris
│   │   ├── tetrominoes.ts      # pièces, couleurs, rotation, sac
│   │   └── modes.ts            # modes de difficulté
│   └── memory/
│       ├── MemorySetupScene.ts # choix du nombre de tuiles
│       ├── MemoryScene.ts      # le jeu Memory
│       └── memoryLevels.ts     # niveaux (tailles) + motifs
└── style.css
```

## Ajouter un nouveau minigame

1. Créer une nouvelle scène dans `src/scenes/<mon-jeu>/MonJeuScene.ts`
   (une classe qui étend `Phaser.Scene`).
2. Ajouter une entrée dans `src/games/registry.ts`.

Le menu et l'enregistrement des scènes se mettent à jour automatiquement.
