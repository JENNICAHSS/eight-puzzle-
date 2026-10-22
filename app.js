/* app.js - UI controller: pages, input, playback of the A* trace, comparison. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  const STD_GOAL = '123456780';
  const EXAMPLE_START = '283164705';
  const EXAMPLE_GOAL = '123804765';
  const HNAME = { manhattan: 'Manhattan Distance', misplaced: 'Misplaced Tiles', zero: 'h(n) = 0' };

  let data = null;        // result of AStar.solve (with trace)
  let timeline = [];      // search steps followed by solution-path steps
  let searchLen = 0;
  let idx = -1;           // -1 = nothing shown yet
  let timer = null;
  let playing = false;
  let startState = '', goalState = '';

  /* ---------------- navigation ---------------- */
  function showPage(name) {
    if (!['home', 'solver', 'compare', 'info'].includes(name)) name = 'home';
    document.querySelectorAll('.page').forEach(p => p.classList.add('d-none'));
    $('page-' + name).classList.remove('d-none');
    document.querySelectorAll('[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === name && a.classList.contains('nav-link')));
    if (name === 'compare') updateComparePuzzleLabel();
    const nav = document.getElementById('navMenu');
    if (nav && nav.classList.contains('show')) nav.classList.remove('show');
  }
  document.querySelectorAll('[data-page]').forEach(a => a.addEventListener('click', () => showPage(a.dataset.page)));
  window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));

  /* ---------------- input grids ---------------- */
  function buildGrid(el) {
    const inputs = [];
    for (let i = 0; i < 9; i++) {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.maxLength = 1; inp.inputMode = 'numeric'; inp.autocomplete = 'off';
      inp.setAttribute('aria-label', 'cell ' + (i + 1));
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^0-8_ ]/g, '').replace(' ', ''); onInputChange(); });
      el.appendChild(inp);
      inputs.push(inp);
    }
    return inputs;
  }
  const startInputs = buildGrid($('startGrid'));
  const goalInputs = buildGrid($('goalGrid'));

  function setGrid(inputs, state) {
    for (let i = 0; i < 9; i++) inputs[i].value = state[i] === '0' ? '_' : state[i];
  }
  function readGrid(inputs, label) {
    let s = '';
    for (const inp of inputs) {
      const v = inp.value.trim();
      s += (v === '' || v === '_') ? '0' : v;
    }
    if (!Puzzle.isValidState(s)) return { error: label + ' must use each of 1-8 exactly once plus one blank.' };
    return { state: s };
  }

  function readPuzzle() {
    const a = readGrid(startInputs, 'Initial state');
    if (a.error) return a;
    const b = readGrid(goalInputs, 'Goal state');
    if (b.error) return b;
    return { start: a.state, goal: b.state };
  }

  function msg(text, cls) {
    const el = $('inputMsg');
    el.className = 'small mt-2 ' + (cls || '');
    el.textContent = text || '';
  }

  function onInputChange() {
    stopTimer();
    data = null; timeline = []; idx = -1;
    clearPanels();
    const p = readPuzzle();
    if (p.error) { msg(p.error, 'text-danger'); setControls(); return; }
    if (!Puzzle.isSolvable(p.start, p.goal)) msg('This initial/goal pair is NOT solvable (inversion parity differs).', 'text-danger');
    else msg('Puzzle is valid and solvable.', 'text-success');
    startState = p.start; goalState = p.goal;
    drawIdle();
    setControls();
  }

  /* ---------------- rendering helpers ---------------- */
  function mini(state, goal, big) {
    if (!state) return '<span class="text-muted small">-</span>';
    let h = '<div class="mini' + (big ? ' big' : '') + '">';
    for (let i = 0; i < 9; i++) {
      const c = state[i];
      if (c === '0') h += '<span class="b"></span>';
      else h += '<span class="' + (goal && goal[i] === c ? 'ok' : '') + '">' + c + '</span>';
    }
    return h + '</div>';
  }

  // animated board: 8 tiles that slide into new positions
  const board = $('board');
  const tiles = {};
  for (let v = 1; v <= 8; v++) {
    const t = document.createElement('div');
    t.className = 'tile'; t.textContent = v;
    t.style.setProperty('--r', 0); t.style.setProperty('--c', 0);
    board.appendChild(t); tiles[v] = t;
  }
  function drawBoard(state) {
    for (let v = 1; v <= 8; v++) {
      const i = state.indexOf(String(v));
      tiles[v].style.setProperty('--r', Math.floor(i / 3));
      tiles[v].style.setProperty('--c', i % 3);
      tiles[v].classList.toggle('correct', !!goalState && goalState[i] === String(v));
    }
  }

  function drawIdle() {
    $('initialMini').innerHTML = mini(startState, goalState, true);
    $('goalMini').innerHTML = mini(goalState, goalState, true);
    if (startState) drawBoard(startState);
    $('phaseLabel').textContent = 'Ready';
    $('phaseLabel').className = 'badge bg-secondary';
    $('stepCaption').textContent = '';
    $('moveCaption').textContent = '';
  }

  function clearPanels() {
    ['mDepth', 'mG', 'mH', 'mF'].forEach(i => $(i).textContent = '-');
    ['mGen', 'mExp', 'mOpen', 'mClosed'].forEach(i => $(i).textContent = '0');
    $('curMini').innerHTML = '-'; $('parMini').innerHTML = '-';
    $('succList').innerHTML = '<span class="text-muted small">Run the search to see successors.</span>';
    $('openList').innerHTML = '<span class="text-muted small">-</span>';
    $('closedList').innerHTML = '<span class="text-muted small">-</span>';
    $('pathList').innerHTML = '<span class="text-muted small">The solution path appears after the search finishes.</span>';
    $('summaryTable').classList.add('d-none');
    $('summaryEmpty').classList.remove('d-none');
    $('summaryEmpty').textContent = 'The summary appears when the search reaches the goal.';
  }

  function renderSearchStep(i) {
    const s = data.steps[i];
    $('phaseLabel').textContent = 'Searching';
    $('phaseLabel').className = 'badge bg-primary';
    $('stepCaption').textContent = '(expansion ' + (i + 1) + ' of ' + searchLen + ')';
    $('moveCaption').textContent = s.move ? 'Blank moved ' + s.move : 'Start node';
    drawBoard(s.current);

    $('curMini').innerHTML = mini(s.current, goalState);
    $('parMini').innerHTML = s.parent ? mini(s.parent, goalState) : '<span class="text-muted small">none (root)</span>';
    $('mDepth').textContent = s.depth;
    $('mG').textContent = s.g; $('mH').textContent = s.h; $('mF').textContent = s.f;
    $('mGen').textContent = s.generated; $('mExp').textContent = s.expanded;
    $('mOpen').textContent = s.openSize; $('mClosed').textContent = s.closedSize;

    $('succList').innerHTML = s.successors.length ? s.successors.map(c =>
      '<div class="row-item">' + mini(c.state, goalState) +
      '<div class="tags"><b>' + c.move + '</b> &nbsp;g=' + c.g + ' h=' + c.h + ' f=' + c.f +
      '<div class="st">' + c.status + '</div></div></div>').join('')
      : '<span class="text-muted small">Goal reached - no expansion needed.</span>';

    $('openList').innerHTML = s.open.length ? s.open.map((n, k) =>
      '<div class="row-item' + (k === 0 ? ' best' : '') + '">' + mini(n.state, goalState) +
      '<div class="tags">g=' + n.g + ' h=' + n.h + ' <b>f=' + n.f + '</b></div></div>').join('')
      + (s.openSize > s.open.length ? '<div class="small text-muted pt-1">... and ' + (s.openSize - s.open.length) + ' more</div>' : '')
      : '<span class="text-muted small">empty</span>';

    const from = Math.max(0, i - 9);
    $('closedList').innerHTML = data.steps.slice(from, i + 1).reverse().map(c =>
      '<div class="row-item">' + mini(c.current, goalState) +
      '<div class="tags">g=' + c.g + ' h=' + c.h + ' f=' + c.f + '</div></div>').join('')
      + (s.closedSize > 10 ? '<div class="small text-muted pt-1">... ' + (s.closedSize - 10) + ' earlier nodes</div>' : '');

    if (s.isGoal) showSummary();
  }

  function renderPathStep(j) {
    const total = data.path.length - 1;
    $('phaseLabel').textContent = 'Solution path';
    $('phaseLabel').className = 'badge bg-success';
    $('stepCaption').textContent = '(step ' + j + ' of ' + total + ')';
    $('moveCaption').textContent = j === 0 ? 'Initial state' : 'Step ' + j + ': blank moves ' + data.moves[j - 1];
    drawBoard(data.path[j]);
    document.querySelectorAll('.path-step').forEach((el, k) => el.classList.toggle('active', k === j));
    showSummary();
  }

  function buildPathList() {
    $('pathList').innerHTML = data.path.map((st, k) =>
      (k ? '<span class="path-arrow">&rarr;<br><small>' + data.moves[k - 1] + '</small></span>' : '') +
      '<div class="path-step">Step ' + k + '<br>' + mini(st, goalState) + '</div>').join('');
  }

  function showSummary() {
    const st = data.stats;
    $('summaryEmpty').classList.add('d-none');
    $('summaryTable').classList.remove('d-none');
    $('sFound').innerHTML = data.found ? '<span class="text-success">Found</span>' : '<span class="text-danger">Not Found</span>';
    $('sHeur').textContent = HNAME[data.heuristic];
    $('sMoves').textContent = st.moves;
    $('sGen').textContent = st.generated; $('sExp').textContent = st.expanded;
    $('sDepth').textContent = st.maxDepth;
    $('sTime').textContent = st.timeMs.toFixed(2) + ' ms';
    $('sCost').textContent = st.pathCost;
    $('sMem').textContent = '~' + st.memoryKB + ' KB (' + st.storedNodes + ' nodes stored, peak OPEN ' + st.maxOpen + ')';
  }

  /* ---------------- solving & playback ---------------- */
  function prepare() {
    const p = readPuzzle();
    if (p.error) { msg(p.error, 'text-danger'); return false; }
    startState = p.start; goalState = p.goal;
    if (!Puzzle.isSolvable(startState, goalState)) {
      msg('Not solvable: the goal cannot be reached from this initial state.', 'text-danger');
      clearPanels();
      $('summaryEmpty').classList.add('d-none');
      $('summaryTable').classList.remove('d-none');
      $('sFound').innerHTML = '<span class="text-danger">Not Found (unsolvable puzzle)</span>';
      ['sHeur', 'sMoves', 'sGen', 'sExp', 'sDepth', 'sTime', 'sCost', 'sMem'].forEach(i => $(i).textContent = '-');
      return false;
    }
    msg('', '');
    data = AStar.solve(startState, goalState, $('heuristic').value, { trace: true });
    searchLen = data.steps.length;
    timeline = data.steps.map((s, i) => ({ type: 'search', i }));
    if (data.found) data.path.forEach((s, j) => timeline.push({ type: 'path', j }));
    idx = -1;
    clearPanels();
    if (data.found) buildPathList();
    drawIdle();
    return true;
  }

  function show(i) {
    idx = Math.max(0, Math.min(timeline.length - 1, i));
    const e = timeline[idx];
    if (e.type === 'search') renderSearchStep(e.i); else renderPathStep(e.j);
    setControls();
  }

  function delay() { return Math.round(1150 - parseInt($('speed').value, 10) * 110); }
  function stopTimer() { if (timer) clearTimeout(timer); timer = null; playing = false; }
  function tick() {
    if (!playing) return;
    if (idx >= timeline.length - 1) { playing = false; setControls(); return; }
    show(idx + 1);
    if (idx >= timeline.length - 1) { playing = false; setControls(); return; }
    timer = setTimeout(tick, delay());
  }
  function play() { playing = true; setControls(); timer = setTimeout(tick, 0); }

  function ensureData() {
    if (!data) return prepare();
    return true;
  }

  $('btnRun').addEventListener('click', () => {
    stopTimer();
    if (!prepare()) { setControls(); return; }
    play();
  });
  $('btnPause').addEventListener('click', () => { stopTimer(); setControls(); });
  $('btnResume').addEventListener('click', () => {
    if (!data || idx >= timeline.length - 1) return;
    play();
  });
  $('btnNext').addEventListener('click', () => {
    stopTimer();
    if (!ensureData()) { setControls(); return; }
    if (idx < timeline.length - 1) show(idx + 1);
  });
  $('btnPrev').addEventListener('click', () => {
    stopTimer();
    if (data && idx > 0) show(idx - 1);
  });
  $('btnJump').addEventListener('click', () => {
    stopTimer();
    if (data && data.found) show(searchLen);
  });
  $('btnReset').addEventListener('click', () => {
    stopTimer();
    data = null; timeline = []; idx = -1;
    clearPanels();
    const p = readPuzzle();
    if (!p.error) { startState = p.start; goalState = p.goal; drawIdle(); }
    setControls();
  });
  $('speed').addEventListener('input', () => { $('speedLabel').textContent = $('speed').value; });

  function setControls() {
    const started = !!data && idx >= 0;
    const atEnd = !!data && idx >= timeline.length - 1;
    $('btnRun').disabled = false;
    $('btnPause').disabled = !playing;
    $('btnResume').disabled = playing || !started || atEnd;
    $('btnPrev').disabled = !started || idx <= 0;
    $('btnNext').disabled = atEnd;
    $('btnJump').disabled = !data || !data.found || idx >= searchLen;
  }

  /* ---------------- puzzle creation buttons ---------------- */
  $('btnRandom').addEventListener('click', () => {
    const g = readGrid(goalInputs, 'Goal state');
    const goal = g.error ? STD_GOAL : g.state;
    if (g.error) setGrid(goalInputs, goal);
    setGrid(startInputs, Puzzle.randomSolvable(goal));
    onInputChange();
  });
  $('btnExample').addEventListener('click', () => {
    setGrid(startInputs, EXAMPLE_START); setGrid(goalInputs, EXAMPLE_GOAL); onInputChange();
  });
  $('btnStdGoal').addEventListener('click', () => { setGrid(goalInputs, STD_GOAL); onInputChange(); });

  /* ---------------- comparison page ---------------- */
  function updateComparePuzzleLabel() {
    const p = readPuzzle();
    $('cmpPuzzle').innerHTML = p.error ? '' : 'Puzzle: ' + mini(p.start, p.goal) + ' &rarr; ' + mini(p.goal, p.goal);
  }

  function memLabel(kb) { return kb < 50 ? 'Low' : kb < 500 ? 'Medium' : 'High'; }

  $('btnCompare').addEventListener('click', () => {
    const p = readPuzzle();
    const out = $('cmpMsg');
    if (p.error) { out.className = 'small mt-2 text-danger'; out.textContent = p.error + ' Fix it on the Solver page.'; return; }
    if (!Puzzle.isSolvable(p.start, p.goal)) { out.className = 'small mt-2 text-danger'; out.textContent = 'This puzzle is unsolvable, nothing to compare.'; return; }
    out.textContent = '';
    updateComparePuzzleLabel();
    const configs = [['A* + h(n) = 0 (no heuristic)', 'zero'], ['A* + Misplaced Tiles', 'misplaced'], ['A* + Manhattan Distance', 'manhattan']];
    const rows = configs.map(([label, h]) => ({ label, r: AStar.solve(p.start, p.goal, h, { trace: false }) }));
    $('cmpTable').querySelector('tbody').innerHTML = rows.map(({ label, r }) =>
      '<tr><td>' + label + '</td><td>' + (r.found ? 'Yes' : 'No') + '</td><td>' + r.stats.generated +
      '</td><td>' + r.stats.expanded + '</td><td>' + (r.found ? r.stats.moves : '-') +
      '</td><td>' + r.stats.timeMs.toFixed(2) + ' ms</td><td>' + memLabel(r.stats.memoryKB) + ' (~' + r.stats.memoryKB + ' KB)</td></tr>').join('');
    const max = Math.max(...rows.map(x => x.r.stats.expanded), 1);
    $('cmpBars').innerHTML = rows.map(({ label, r }) =>
      '<div class="bar-row"><div class="lab">' + label + '</div><div class="bar" style="width:' +
      Math.max(1, (r.stats.expanded / max) * 60) + '%"></div><div>' + r.stats.expanded + '</div></div>').join('');
  });

  /* ---------------- init ---------------- */
  setGrid(startInputs, EXAMPLE_START);
  setGrid(goalInputs, EXAMPLE_GOAL);
  onInputChange();
  showPage(location.hash.slice(1) || 'home');
})();
