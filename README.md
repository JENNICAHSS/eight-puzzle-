# AI-8Puzzle-Visualizer

**Interactive 8-Puzzle Problem Solver using A\* Search**
Course: Artificial Intelligence - Digital Assignment (Case Study)
Student: Jennica Hanlynn | Registration No.: **24BDS0414** | Assigned algorithm: **7 - A\* Search**

## Project Description
A browser-based tool that solves the 8-Puzzle with **A\* Search**, implemented from scratch in JavaScript (no search libraries). It animates the blank tile, and shows the search as it happens: the node being expanded, its parent, the generated successors, the OPEN (frontier) and CLOSED (explored) lists, and g(n), h(n), f(n). It finishes with a solution summary, the animated solution path, and a performance comparison of heuristics.

Pages: **Home**, **Solver**, **Comparison**, **Algorithm Info**.

## Technologies Used
- HTML5, CSS3, JavaScript (ES6), no build step
- Bootstrap 5 (CDN) for layout and responsiveness
- CSS transforms/transitions for the tile animation

## Search Algorithms Implemented
- **A\* Search** with `f(n) = g(n) + h(n)`, `g` = number of moves so far, binary-heap OPEN list (ties broken by lower h, then FIFO), CLOSED set, parent pointers for path reconstruction.
- Goal test is applied when a node is *selected for expansion*, which guarantees optimality.
- Unsolvable puzzles are detected up front using inversion parity.

## Heuristics Used
| Heuristic | Definition |
|---|---|
| Misplaced Tiles | number of non-blank tiles not in their goal square |
| Manhattan Distance | sum of row + column distance of every tile from its goal square |

Both are admissible and consistent, so A\* returns an optimal (shortest) solution. The Comparison page also runs A\* with `h(n) = 0` as a no-heuristic baseline (this behaves like uniform-cost search).

## Features
- Two input methods: manual initial/goal state, or **Generate Random Puzzle** (always solvable)
- Controls: Run, Pause, Resume, Next Step, Previous Step, Reset, Change Speed (plus Jump to Solution)
- Live search metrics: nodes generated/expanded, search depth, parent, g/h/f, OPEN and CLOSED lists
- Solution summary: found/not found, moves, nodes generated/expanded, max depth, execution time, path cost, approximate memory
- Comparison table and bar chart on the same puzzle instance
- Algorithm information page (description, working principle, advantages, limitations, complexity, completeness, optimality)

## Screenshots
Add your screenshots to `images/` and reference them here:

```
![Home](images/home.png)
![Solver](images/solver.png)
![Comparison](images/comparison.png)
```

## GitHub Pages URL
`https://<your-username>.github.io/AI-8Puzzle-Visualizer/`

## Student Details
- Name: Jennica Hanlynn
- Register No.: 24BDS0414
- Course: Artificial Intelligence

## Repository Structure
```
AI-8Puzzle-Visualizer/
  index.html
  css/style.css
  js/puzzle.js     state utilities, solvability check, heuristics
  js/astar.js      A* search + min-heap (with replayable trace)
  js/app.js        UI, animation, playback controls, comparison
  assets/
  images/
  docs/algorithm-notes.md
  README.md
```

## How to Run the Project
1. Clone or download the repository.
2. Open `index.html` in any modern browser (no server needed), or run `python3 -m http.server` and visit `http://localhost:8000`.
3. Go to **Solver**, load the example or enter/generate a puzzle, pick a heuristic and press **Run**.

Optional command-line check of the algorithm (Node.js):
```
node -e "const A=require('./js/astar.js');console.log(A.solve('283164705','123804765','manhattan').stats)"
```

## Deployment (GitHub Pages)
1. Push the repository to GitHub.
2. Settings -> Pages -> Source: *Deploy from a branch* -> Branch: `main` / `(root)` -> Save.
3. Your site is live at `https://<username>.github.io/AI-8Puzzle-Visualizer/`.

## References
- S. Russell and P. Norvig, *Artificial Intelligence: A Modern Approach*, 4th ed. (A\* search, heuristic functions, 8-puzzle).
- P. Hart, N. Nilsson, B. Raphael, "A Formal Basis for the Heuristic Determination of Minimum Cost Paths", IEEE Trans. SSC, 1968.
- Bootstrap 5 - https://getbootstrap.com (UI framework, loaded from jsDelivr CDN).
- Course material and the assignment brief for Artificial Intelligence.

The search algorithm, heuristics and visualization code were written for this assignment.
