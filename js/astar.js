/* astar.js - A* Search for the 8-Puzzle (implemented from scratch).
 *
 *   f(n) = g(n) + h(n)
 *   g(n) = number of moves from the start state   (every move costs 1)
 *   h(n) = heuristic estimate to the goal          (Misplaced Tiles / Manhattan)
 *
 * OPEN  list = binary min-heap ordered by f, ties broken by smaller h, then FIFO.
 * CLOSED list = Set of expanded states.
 * With trace = true every expansion is recorded so the UI can replay it.
 */
(function (root) {
  'use strict';
  const Puzzle = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./puzzle.js') : root.Puzzle;

  function less(a, b) {
    if (a.f !== b.f) return a.f < b.f;
    if (a.h !== b.h) return a.h < b.h;
    return a.seq < b.seq;
  }

  class MinHeap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(x) {
      const a = this.a;
      a.push(x);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (less(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break;
      }
    }
    pop() {
      const a = this.a;
      const top = a[0];
      const last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < a.length && less(a[l], a[m])) m = l;
          if (r < a.length && less(a[r], a[m])) m = r;
          if (m === i) break;
          [a[i], a[m]] = [a[m], a[i]];
          i = m;
        }
      }
      return top;
    }
    // Best k entries (exact for small heaps, a good sample for very large ones).
    top(k) {
      const src = this.a.length <= 2000 ? this.a.slice() : this.a.slice(0, 64);
      src.sort((x, y) => (less(x, y) ? -1 : 1));
      return src.slice(0, k).map(n => ({ state: n.state, g: n.g, h: n.h, f: n.f }));
    }
  }

  /**
   * @param {string} start  9-char state
   * @param {string} goal   9-char state
   * @param {'misplaced'|'manhattan'|'zero'} hname
   * @param {{trace?:boolean, maxExpansions?:number}} opts
   */
  function solve(start, goal, hname, opts) {
    opts = opts || {};
    const trace = !!opts.trace;
    const maxExp = opts.maxExpansions || 400000;
    const h = Puzzle.makeHeuristic(hname, goal);
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();

    const heap = new MinHeap();
    const nodes = new Map();           // state -> {g, parent, move}
    const closed = new Set();
    const steps = [];
    let seq = 0, generated = 1, expanded = 0, maxDepth = 0, maxOpen = 1;
    let found = false;

    nodes.set(start, { g: 0, parent: null, move: null });
    const h0 = h(start);
    heap.push({ state: start, g: 0, h: h0, f: h0, seq: seq++ });

    while (heap.size) {
      const cur = heap.pop();
      if (closed.has(cur.state)) continue;              // stale duplicate entry
      const info = nodes.get(cur.state);
      if (cur.g > info.g) continue;                     // a cheaper path was found later
      closed.add(cur.state);
      expanded++;
      if (cur.g > maxDepth) maxDepth = cur.g;

      const step = trace ? {
        current: cur.state, parent: info.parent, move: info.move,
        g: cur.g, h: cur.h, f: cur.f, depth: cur.g,
        isGoal: cur.state === goal, successors: []
      } : null;

      if (cur.state === goal) {
        found = true;
        if (trace) {
          step.generated = generated; step.expanded = expanded;
          step.openSize = heap.size; step.closedSize = closed.size;
          step.open = heap.top(8);
          steps.push(step);
        }
        break;
      }
      if (expanded >= maxExp) break;

      for (const nb of Puzzle.neighbors(cur.state)) {
        generated++;
        const g2 = cur.g + 1;
        const hv = h(nb.state);
        let status;
        if (closed.has(nb.state)) status = 'in CLOSED - ignored';
        else {
          const known = nodes.get(nb.state);
          if (known && known.g <= g2) status = 'in OPEN with <= g - ignored';
          else {
            status = known ? 'better path - OPEN updated' : 'new - added to OPEN';
            nodes.set(nb.state, { g: g2, parent: cur.state, move: nb.move });
            heap.push({ state: nb.state, g: g2, h: hv, f: g2 + hv, seq: seq++ });
            if (g2 > maxDepth) maxDepth = g2;
          }
        }
        if (trace) step.successors.push({ state: nb.state, move: nb.move, g: g2, h: hv, f: g2 + hv, status });
      }
      if (heap.size > maxOpen) maxOpen = heap.size;

      if (trace) {
        step.generated = generated; step.expanded = expanded;
        step.openSize = heap.size; step.closedSize = closed.size;
        step.open = heap.top(8);
        steps.push(step);
      }
    }

    const timeMs = ((typeof performance !== 'undefined' ? performance : Date).now()) - t0;

    let path = [], moves = [];
    if (found) {
      let s = goal;
      while (s !== null) {
        const n = nodes.get(s);
        path.push(s);
        if (n.move) moves.push(n.move);
        s = n.parent;
      }
      path.reverse(); moves.reverse();
    }
    const stored = nodes.size;
    return {
      found, path, moves, steps, heuristic: hname,
      stats: {
        generated, expanded, maxDepth, timeMs,
        moves: found ? moves.length : null,
        pathCost: found ? moves.length : null,
        maxOpen, storedNodes: stored,
        memoryKB: Math.round((stored * 96 + maxOpen * 40) / 1024 * 10) / 10 // rough estimate
      }
    };
  }

  const api = { solve, MinHeap };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AStar = api;
})(typeof window !== 'undefined' ? window : globalThis);
