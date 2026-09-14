# Compact Mini

Collection de minigames web à jouer quand on s'ennuie.

Jeux disponibles :
- **Labyrinthe** — généré procéduralement, dirigé à la souris, avec réglage de difficulté.
- **Gold Miner** — un grappin qui balance ; lâche-le pour attraper l'or et les diamants avant la fin du chrono.

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
4. Atteins l'**objectif** de score avant la fin du **chrono** (60 s) pour passer
   au niveau suivant. Sinon, c'est perdu.
5. **Échap** : revenir au menu.

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
│   └── goldminer/
│       └── GoldMinerScene.ts  # le jeu Gold Miner
└── style.css
```

## Ajouter un nouveau minigame

1. Créer une nouvelle scène dans `src/scenes/<mon-jeu>/MonJeuScene.ts`
   (une classe qui étend `Phaser.Scene`).
2. Ajouter une entrée dans `src/games/registry.ts`.

Le menu et l'enregistrement des scènes se mettent à jour automatiquement.
