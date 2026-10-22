/* puzzle.js - 8-Puzzle state utilities and heuristics.
 * A state is a 9-character string, row-major, '0' = blank.  e.g. "283164705"
 */
(function (root) {
  'use strict';

  const DIRS = [
    { dr: -1, dc: 0, name: 'Up' },
    { dr: 1, dc: 0, name: 'Down' },
    { dr: 0, dc: -1, name: 'Left' },
    { dr: 0, dc: 1, name: 'Right' }
  ];

  function isValidState(s) {
    if (typeof s !== 'string' || s.length !== 9) return false;
    for (const ch of '012345678') if (s.indexOf(ch) === -1) return false;
    return true;
  }

  function inversions(s) {
    const a = s.split('').map(Number).filter(n => n !== 0);
    let c = 0;
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++;
    return c;
  }

  // For an odd-width board, goal is reachable iff inversion parities match.
  function isSolvable(start, goal) {
    return inversions(start) % 2 === inversions(goal) % 2;
  }

  // Legal successors: the blank swaps with an adjacent tile.
  function neighbors(s) {
    const b = s.indexOf('0');
    const r = Math.floor(b / 3), c = b % 3;
    const out = [];
    for (const d of DIRS) {
      const nr = r + d.dr, nc = c + d.dc;
      if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
      const ni = nr * 3 + nc;
      const arr = s.split('');
      arr[b] = arr[ni];
      arr[ni] = '0';
      out.push({ state: arr.join(''), move: d.name, tile: s[ni] });
    }
    return out;
  }

  // ---- Heuristics (blank is never counted) ----
  function makeHeuristic(name, goal) {
    if (name === 'misplaced') {
      return function (s) {
        let n = 0;
        for (let i = 0; i < 9; i++) if (s[i] !== '0' && s[i] !== goal[i]) n++;
        return n;
      };
    }
    if (name === 'manhattan') {
      const gr = {}, gc = {};
      for (let i = 0; i < 9; i++) { gr[goal[i]] = Math.floor(i / 3); gc[goal[i]] = i % 3; }
      return function (s) {
        let d = 0;
        for (let i = 0; i < 9; i++) {
          const t = s[i];
          if (t === '0') continue;
          d += Math.abs(Math.floor(i / 3) - gr[t]) + Math.abs((i % 3) - gc[t]);
        }
        return d;
      };
    }
    // h(n) = 0 : A* degenerates to uniform-cost search (baseline for comparison)
    return function () { return 0; };
  }

  function randomSolvable(goal) {
    const arr = '012345678'.split('');
    for (;;) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      const s = arr.join('');
      if (s !== goal && isSolvable(s, goal)) return s;
    }
  }

  const api = { DIRS, isValidState, isSolvable, neighbors, makeHeuristic, randomSolvable, inversions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Puzzle = api;
})(typeof window !== 'undefined' ? window : globalThis);
