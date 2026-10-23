# Algorithm Notes - A* on the 8-Puzzle

## Problem formulation
- State: 9-character string, row-major, `0` is the blank (e.g. `283164705`).
- Actions: move the blank Up/Down/Left/Right (2 to 4 legal per state).
- Step cost: 1. Path cost = number of moves.
- Reachable states: 9!/2 = 181,440 per goal. Solvable iff the inversion parity of start and goal match.

## A* pseudocode
```
OPEN <- heap {start}, g(start)=0, f(start)=h(start)
CLOSED <- {}
while OPEN not empty:
    n <- node in OPEN with smallest f (ties: smaller h, then oldest)
    if n in CLOSED: continue
    add n to CLOSED
    if n == goal: return path via parent pointers
    for each successor s of n:
        g' = g(n) + 1
        if s in CLOSED: ignore
        elif s in OPEN with g(s) <= g': ignore
        else: parent(s) <- n; g(s) <- g'; put s in OPEN with f = g' + h(s)
return failure
```

## Complexity
- Time: O(b^d) worst case; with a good heuristic about O(b^(e*d)), e < 1 (effective branching factor).
- Space: O(b^d), since all generated nodes are retained.
- Complete: yes (finite space, positive step cost). Optimal: yes for admissible h (consistent h with a closed list).

## Observed results (this implementation)
| Puzzle | Heuristic | Moves | Nodes expanded |
|---|---|---|---|
| 283164705 -> 123804765 (assignment example) | Manhattan / Misplaced | 5 | 6 / 6 |
| 867254301 -> 123456780 (hard, 31 moves) | h = 0 | 31 | 181,439 |
| 867254301 -> 123456780 | Misplaced Tiles | 31 | 121,529 |
| 867254301 -> 123456780 | Manhattan Distance | 31 | 6,745 |

All three runs return the same optimal length, but the better heuristic explores far fewer nodes.
