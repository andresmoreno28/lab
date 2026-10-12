/**
 * Uniform grid for neighbour queries (lab, particle network): points are bucketed into square
 * cells as wide as the query radius, so finding everything within that radius reads the 3 × 3
 * cells around a point instead of every point: O(n) per frame instead of O(n²). No
 * dependencies: copy the file.
 */
export class SpatialHash {
  private readonly cells = new Map<number, number[]>();

  constructor(private readonly size: number) {}

  /** Cells are keyed by one integer: up to 2¹⁵ columns, enough for any screen. */
  private key(cx: number, cy: number): number {
    return (cy + 32768) * 65536 + (cx + 32768);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(index: number, x: number, y: number): void {
    const key = this.key(Math.floor(x / this.size), Math.floor(y / this.size));
    const cell = this.cells.get(key);
    if (cell) cell.push(index);
    else this.cells.set(key, [index]);
  }

  /**
   * Calls `visit` once for every inserted index in the cells around (x, y); the caller measures
   * the real distance. Pairs are visited from both sides: skip `other <= index` to see each once.
   */
  near(x: number, y: number, visit: (other: number) => void): void {
    const cx = Math.floor(x / this.size);
    const cy = Math.floor(y / this.size);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const cell = this.cells.get(this.key(cx + dx, cy + dy));
        if (cell) for (const other of cell) visit(other);
      }
    }
  }
}
