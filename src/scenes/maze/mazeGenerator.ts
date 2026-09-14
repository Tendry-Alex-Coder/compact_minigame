/**
 * Génère un labyrinthe "parfait" (une seule solution, sans boucle) via
 * l'algorithme du recursive backtracker (parcours en profondeur).
 *
 * La grille de tuiles fait (2 * cellCols + 1) x (2 * cellRows + 1) :
 * les cellules impaires sont des passages, les cellules paires les murs
 * potentiels entre deux cellules.
 */

export type Grid = number[][]; // 1 = mur, 0 = sol

export interface MazeResult {
  grid: Grid;
  cols: number; // nombre de colonnes de tuiles
  rows: number; // nombre de lignes de tuiles
  start: { c: number; r: number }; // coordonnées tuile du départ
  exit: { c: number; r: number }; // coordonnées tuile de la sortie
}

interface Cell {
  c: number;
  r: number;
}

export function generateMaze(cellCols: number, cellRows: number): MazeResult {
  const cols = cellCols * 2 + 1;
  const rows = cellRows * 2 + 1;

  // Tout est mur au départ.
  const grid: Grid = Array.from({ length: rows }, () => Array<number>(cols).fill(1));

  const visited: boolean[][] = Array.from({ length: cellRows }, () =>
    Array<boolean>(cellCols).fill(false),
  );

  const dirs: Cell[] = [
    { c: 0, r: -1 },
    { c: 1, r: 0 },
    { c: 0, r: 1 },
    { c: -1, r: 0 },
  ];

  const stack: Cell[] = [];
  visited[0][0] = true;
  grid[1][1] = 0; // creuse la cellule de départ
  stack.push({ c: 0, r: 0 });

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];

    const neighbors: { cell: Cell; dir: Cell }[] = [];
    for (const d of dirs) {
      const nc = cur.c + d.c;
      const nr = cur.r + d.r;
      if (nc >= 0 && nc < cellCols && nr >= 0 && nr < cellRows && !visited[nr][nc]) {
        neighbors.push({ cell: { c: nc, r: nr }, dir: d });
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    visited[pick.cell.r][pick.cell.c] = true;

    // Coordonnées tuile de la cellule courante et de la cellule choisie.
    const curTileC = cur.c * 2 + 1;
    const curTileR = cur.r * 2 + 1;
    const pickTileC = pick.cell.c * 2 + 1;
    const pickTileR = pick.cell.r * 2 + 1;

    // Creuse le mur entre les deux, puis la cellule choisie.
    grid[(curTileR + pickTileR) / 2][(curTileC + pickTileC) / 2] = 0;
    grid[pickTileR][pickTileC] = 0;

    stack.push(pick.cell);
  }

  return {
    grid,
    cols,
    rows,
    start: { c: 1, r: 1 },
    exit: { c: cols - 2, r: rows - 2 },
  };
}
