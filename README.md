# Compact Mini

Collection de minigames web à jouer quand on s'ennuie.
Premier jeu : un **labyrinthe** généré procéduralement, dirigé à la souris.

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

## Comment jouer (Labyrinthe)

1. Depuis le menu, clique sur **Labyrinthe**.
2. Amène la souris sur la **bille verte** pour démarrer (lance le chrono).
3. La bille **suit ta souris** ; les murs la bloquent.
4. Atteins la **sortie ★** pour passer au niveau suivant (plus grand).
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
│   └── maze/
│       ├── MazeScene.ts       # le jeu de labyrinthe
│       └── mazeGenerator.ts   # génération (recursive backtracker)
└── style.css
```

## Ajouter un nouveau minigame

1. Créer une nouvelle scène dans `src/scenes/<mon-jeu>/MonJeuScene.ts`
   (une classe qui étend `Phaser.Scene`).
2. Ajouter une entrée dans `src/games/registry.ts`.

Le menu et l'enregistrement des scènes se mettent à jour automatiquement.
