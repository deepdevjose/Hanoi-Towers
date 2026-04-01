/**
 * hanoi-ui.js — Renderer + interaction layer
 * Depends on HanoiBridge (hanoi-bridge.js)
 *
 * Features:
 *  - Manual play: click on towers / keys 1, 2, 3
 *  - Auto-solve: step-by-step animation with speed control
 *  - Flying disk arc animation (quadratic Bezier)
 *  - Hover highlight / visual selection
 *  - Error flash on illegal moves
 *  - Undo last move (manual mode)
 */
(async function () {

  // ── Paleta de discos (iOS) ──────────────────────────────────────
  const DISK_PALETTE = [
    { h: '#FF3B30', l: '#FF6961', s: '#C4281F' },  // red
    { h: '#FF9F0A', l: '#FFB340', s: '#C47800' },  // orange
    { h: '#FFCC00', l: '#FFD426', s: '#C49B00' },  // yellow
    { h: '#30D158', l: '#5EE37A', s: '#1FAA3E' },  // green
    { h: '#007AFF', l: '#409CFF', s: '#0055B3' },  // blue
    { h: '#5856D6', l: '#7977E1', s: '#3C3AAB' },  // purple
    { h: '#AF52DE', l: '#C274EA', s: '#8B3EB8' },  // violet
    { h: '#FF2D55', l: '#FF5C77', s: '#C4204A' },  // pink
    { h: '#5AC8FA', l: '#82D4FB', s: '#3AA0DC' },  // teal
    { h: '#64D2FF', l: '#86DEFF', s: '#42AEDE' },  // sky
  ];
  const TOWER_NAMES = ['A', 'B', 'C'];

  // ── Canvas ──────────────────────────────────────────────────────
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  function cssDims() {
    const r = canvas.parentElement.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = cssDims();
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => { resizeCanvas(); });

  // ── Layout geometry ─────────────────────────────────────────────
  function getLayout(w, h, n) {
    const groundY  = h - 64;
    const diskH    = Math.min(38, Math.max(18, (groundY - 100) / (n + 2)));
    const poleH    = diskH * n + 36;
    const poleW    = Math.max(7, diskH * 0.22);
    const maxDiskW = (w / 3) * 0.80;
    const minDiskW = Math.max(26, diskH);
    const cx       = [w * 1/6, w * 3/6, w * 5/6];
    return { groundY, diskH, poleH, poleW, maxDiskW, minDiskW, cx, n };
  }

  function diskWidth(size, lo) {
    const ratio = (size - 1) / Math.max(lo.n - 1, 1);
    return lo.minDiskW + (lo.maxDiskW - lo.minDiskW) * ratio;
  }

  function diskTopCenter(tower, stackIndex, lo) {
    // stackIndex 0 = bottom disk; returns center of that disk
    const x = lo.cx[tower];
    const y = lo.groundY - lo.diskH * (stackIndex + 1) + lo.diskH / 2;
    return { x, y };
  }

  // ── Flying disk animation (Bezier arc) ───────────────────────────
  class FlyingDisk {
    constructor(diskSize, toTower, x0, y0, x1, y1, duration) {
      this.diskSize  = diskSize;
      this.toTower   = toTower;
      this.x0 = x0; this.y0 = y0;
      this.x1 = x1; this.y1 = y1;
      // Control point: midpoint horizontally, above both towers
      this.cx = (x0 + x1) / 2;
      this.cy = Math.min(y0, y1) - Math.max(60, Math.abs(x1 - x0) * 0.35);
      this.duration  = duration;
      this.startTime = performance.now();
      this.done      = false;
      this.x = x0; this.y = y0;
    }

    update(now) {
      let t = Math.min(1, (now - this.startTime) / this.duration);
      // ease in-out cubic
      t = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
      const mt = 1 - t;
      this.x = mt*mt*this.x0 + 2*mt*t*this.cx + t*t*this.x1;
      this.y = mt*mt*this.y0 + 2*mt*t*this.cy + t*t*this.y1;
      if (t >= 1) this.done = true;
      return { x: this.x, y: this.y };
    }
  }

  // ── Flash animation ─────────────────────────────────────────────
  let towerFlash = null; // { tower, type:'error'|'ok', alpha, start }

  function flashTower(tower, type) {
    towerFlash = { tower, type, alpha: 1, start: performance.now() };
  }

  // ── State ───────────────────────────────────────────────────────
  let gameState    = { numDisks:3, moveCount:0, finished:false, towers:[[3,2,1],[],[]] };
  let visualTowers = [[3,2,1],[],[]];  // mirrors real state, updated by animations
  let flyingDisk   = null;             // FlyingDisk | null
  let selectedTower = -1;
  let hoveredTower  = -1;
  let mode          = 'manual';        // 'manual' | 'auto'
  let solving       = false;
  let solveQueue    = [];
  let lastMoveEndAt = 0;
  let undoStack     = []; // array of {from,to,diskSize} for undo

  // ── Animation speed helpers ─────────────────────────────────────
  const speedSlider  = document.getElementById('speed-slider');

  function animDuration() {
    if (mode === 'manual') return 320;
    const s = parseInt(speedSlider.value);
    return Math.round(1100 - s * 90); // 1010ms → 200ms
  }

  function solveDelay() {
    const s = parseInt(speedSlider.value);
    return Math.max(0, Math.round(500 - s * 48));
  }

  // ── Bridge event binding ─────────────────────────────────────────
  function bindBridgeEvents() {
    HanoiBridge.on('hanoi:statechange', s => {
      gameState = s;
      updateStats(s);
    });

    HanoiBridge.on('hanoi:reset', () => {
      selectedTower = -1;
      solving       = false;
      solveQueue    = [];
      flyingDisk    = null;
      undoStack     = [];
      visualTowers  = gameState.towers.map(t => [...t]);
      document.getElementById('win-overlay').classList.add('hidden');
      setStatus('Select a tower to move a disk');
      updateHistory([]);
    });

    HanoiBridge.on('hanoi:finished', s => {
      const optimal = Math.pow(2, s.numDisks) - 1;
      document.getElementById('win-moves-text').textContent =
        `${s.moveCount} moves — optimal: ${optimal}`;
      document.getElementById('win-overlay').classList.remove('hidden');
      stopSolve(false);
    });
  }

  // ── Attempt a move with animation ───────────────────────────────
  function attemptMove(from, to) {
    if (flyingDisk) return false;

    const src = visualTowers[from];
    if (!src.length) { flashTower(from, 'error'); setStatus('Empty tower', 'error'); return false; }

    // Capture positions BEFORE modifying visual state
    const diskSize = src[src.length - 1];
    const { w, h } = cssDims();
    const lo = getLayout(w, h, gameState.numDisks);

    const fp = diskTopCenter(from, src.length - 1, lo);
    const tp = diskTopCenter(to,   visualTowers[to].length, lo); // landing position

    // Apply to game
    const ok = HanoiBridge.move(from, to);
    if (!ok) {
      flashTower(to, 'error');
      setStatus('Illegal move', 'error');
      setTimeout(() => setStatus('Select a tower to move a disk'), 1400);
      return false;
    }

    // Record for undo
    undoStack.push({ from, to, diskSize });

    // Update visual source, start flight
    visualTowers[from].pop();
    flyingDisk = new FlyingDisk(diskSize, to, fp.x, fp.y, tp.x, tp.y, animDuration());

    // History
    addHistoryEntry(from, to, diskSize, gameState.moveCount);
    setStatus(`${TOWER_NAMES[from]} → ${TOWER_NAMES[to]}`);
    return true;
  }

  // ── Undo ────────────────────────────────────────────────────────
  function undoMove() {
    if (flyingDisk || !undoStack.length) return;
    const { from, to, diskSize } = undoStack.pop();
    // Undo: rebuild state from scratch replaying history minus last move
    // (the C++ core has no native undo, so we replay from the beginning)
    rebuildFromHistory();
  }

  function rebuildFromHistory() {
    // Reset and replay all moves except the one just popped
    const history = [...undoStack];
    const n = gameState.numDisks;
    HanoiBridge.reset(n);
    for (const step of history) {
      HanoiBridge.move(step.from, step.to);
    }
    // Sync visual state
    visualTowers = HanoiBridge.getState().towers.map(t => [...t]);
    rebuildHistoryUI(history);
  }

  function rebuildHistoryUI(history) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    history.forEach((m, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="history-num">${i+1}</span>
        <span>${TOWER_NAMES[m.from]}</span>
        <span class="history-arrow">→</span>
        <span>${TOWER_NAMES[m.to]}</span>
        <span class="history-disk">D${m.diskSize}</span>`;
      list.appendChild(li);
    });
    document.getElementById('history-count').textContent = history.length + ' mov.';
  }

  // ── Auto-solve ───────────────────────────────────────────────────
  function startSolve() {
    if (solving) return;
    HanoiBridge.reset(gameState.numDisks);
    solveQueue = HanoiBridge.precomputeSolution();
    solving    = true;
    lastMoveEndAt = performance.now() - solveDelay(); // start immediately

    document.getElementById('btn-solve').disabled = true;
    document.getElementById('btn-stop').disabled  = false;
    document.getElementById('btn-reset-auto').disabled = true;
    setStatus(`Solving — ${solveQueue.length} steps`);
  }

  function stopSolve(resetButtons = true) {
    solving    = false;
    solveQueue = [];
    if (resetButtons) {
      document.getElementById('btn-solve').disabled      = false;
      document.getElementById('btn-stop').disabled       = true;
      document.getElementById('btn-reset-auto').disabled = false;
    }
  }

  // ── Mode toggle ──────────────────────────────────────────────────
  function setMode(m) {
    mode = m;
    document.getElementById('tab-manual').classList.toggle('active', m === 'manual');
    document.getElementById('tab-auto').classList.toggle('active', m === 'auto');
    document.getElementById('manual-controls').style.display = m === 'manual' ? '' : 'none';
    document.getElementById('auto-controls').style.display   = m === 'auto'   ? '' : 'none';
    document.getElementById('speed-group').style.display     = m === 'auto'   ? '' : 'none';
    document.getElementById('kbd-hint').style.display        = m === 'manual' ? '' : 'none';
    if (m === 'auto') {
      stopSolve();
      selectedTower = -1;
      setStatus('Press "Solve" to watch the animated solution');
    } else {
      setStatus('Select a tower to move a disk');
    }
  }

  // ── Status / stats ───────────────────────────────────────────────
  function setStatus(msg, type = '') {
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = 'status-msg ' + type;
  }

  function updateStats(s) {
    document.getElementById('stat-moves').textContent  = s.moveCount;
    document.getElementById('stat-disks').textContent  = s.numDisks;
    const opt = Math.pow(2, s.numDisks) - 1;
    document.getElementById('stat-optimal').textContent = opt;
    if (s.moveCount >= opt) {
      // Efficiency: optimal / actual moves, always 0–100%
      const eff = Math.min(100, Math.round(opt / s.moveCount * 100));
      document.getElementById('stat-eff').textContent = eff + '%';
    } else {
      // Not yet at minimum possible moves — show placeholder
      document.getElementById('stat-eff').textContent = '—';
    }
  }

  function addHistoryEntry(from, to, disk, count) {
    const list = document.getElementById('history-list');
    list.querySelectorAll('li').forEach(li => li.classList.remove('latest'));
    const li = document.createElement('li');
    li.classList.add('latest');
    li.innerHTML = `
      <span class="history-num">${count}</span>
      <span>${TOWER_NAMES[from]}</span>
      <span class="history-arrow">→</span>
      <span>${TOWER_NAMES[to]}</span>
      <span class="history-disk">D${disk}</span>`;
    list.prepend(li);
    document.getElementById('history-count').textContent = count + ' moves';
  }

  function updateHistory(history) {
    document.getElementById('history-list').innerHTML = '';
    document.getElementById('history-count').textContent = '0 moves';
  }

  // ── Render ───────────────────────────────────────────────────────
  function draw() {
    const { w, h } = cssDims();
    const lo = getLayout(w, h, gameState.numDisks);
    ctx.clearRect(0, 0, w, h);

    drawBackground(w, h);
    drawBase(w, lo);

    for (let t = 0; t < 3; t++) {
      drawTower(t, lo, w, h);
    }
    if (flyingDisk) drawFlyingDisk(lo);

    drawSelectionRing(lo);
  }

  function drawBackground(w, h) {
    ctx.fillStyle = '#F9F9FB';
    ctx.fillRect(0, 0, w, h);
  }

  function drawBase(w, lo) {
    const bh = 10, br = 5;
    const bx = w * 0.06, by = lo.groundY + 4, bw = w * 0.88;
    ctx.fillStyle = '#E0E0E5';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, br);
    ctx.fill();

    // Subtle highlight on top
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 3, br);
    ctx.fill();
  }

  function drawTower(t, lo, w, h) {
    const cx = lo.cx[t];
    const isHovered  = hoveredTower === t && mode === 'manual' && !flyingDisk;
    const isSelected = selectedTower === t;

    // Flash
    let flashAlpha = 0, flashColor = 'transparent';
    if (towerFlash && towerFlash.tower === t) {
      flashAlpha = towerFlash.alpha;
      flashColor = towerFlash.type === 'error' ? '#FF3B30' : '#30D158';
    }

    // Hover glow
    if (isHovered && !isSelected) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#007AFF';
      ctx.beginPath();
      ctx.roundRect(lo.cx[t] - lo.maxDiskW/2 - 6, lo.groundY - lo.poleH - 8,
                    lo.maxDiskW + 12, lo.poleH + 20, 12);
      ctx.fill();
      ctx.restore();
    }

    // Flash overlay
    if (flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = flashAlpha * 0.12;
      ctx.fillStyle = flashColor;
      ctx.beginPath();
      ctx.roundRect(lo.cx[t] - lo.maxDiskW/2 - 6, lo.groundY - lo.poleH - 8,
                    lo.maxDiskW + 12, lo.poleH + 20, 12);
      ctx.fill();
      ctx.restore();
    }

    // Pole
    const pg = ctx.createLinearGradient(cx - lo.poleW, 0, cx + lo.poleW, 0);
    if (isSelected) {
      pg.addColorStop(0,   'rgba(0,122,255,0.4)');
      pg.addColorStop(0.5, 'rgba(0,122,255,0.9)');
      pg.addColorStop(1,   'rgba(0,122,255,0.4)');
    } else {
      pg.addColorStop(0,   '#C7C7CC');
      pg.addColorStop(0.4, '#D8D8DC');
      pg.addColorStop(1,   '#AEAEB2');
    }
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(cx - lo.poleW/2, lo.groundY - lo.poleH, lo.poleW, lo.poleH, lo.poleW/2);
    ctx.fill();

    // Tower label
    ctx.fillStyle = '#AEAEB2';
    ctx.font = `600 13px ${'-apple-system, BlinkMacSystemFont, sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(TOWER_NAMES[t], cx, lo.groundY + 18);

    // Disks
    const disks = visualTowers[t];
    for (let i = 0; i < disks.length; i++) {
      const pos = diskTopCenter(t, i, lo);
      const dw  = diskWidth(disks[i], lo);
      const isTopOfSelected = isSelected && i === disks.length - 1;
      const yOffset = isTopOfSelected ? -6 : 0; // lift top disk of selected tower
      drawDisk(pos.x, pos.y + yOffset, dw, lo.diskH, disks[i], isTopOfSelected);
    }
  }

  function drawDisk(cx, cy, dw, dh, size, lifted) {
    const color   = DISK_PALETTE[(size - 1) % DISK_PALETTE.length];
    const r       = dh / 2;
    const x       = cx - dw / 2;
    const y       = cy - dh / 2;

    // Shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur    = lifted ? 18 : 8;
    ctx.shadowOffsetY = lifted ? 8  : 3;

    // Disk body
    const g = ctx.createLinearGradient(x, y, x, y + dh);
    g.addColorStop(0,   color.l);
    g.addColorStop(0.5, color.h);
    g.addColorStop(1,   color.s);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, dw, dh, r);
    ctx.fill();
    ctx.restore();

    // White highlight stripe
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle   = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 3, dw - 8, dh * 0.38, r * 0.8);
    ctx.fill();
    ctx.restore();
  }

  function drawFlyingDisk(lo) {
    if (!flyingDisk) return;
    const { x, y, diskSize } = flyingDisk;
    const dw = diskWidth(diskSize, lo);
    drawDisk(x, y, dw, lo.diskH, diskSize, true);
  }

  function drawSelectionRing(lo) {
    if (selectedTower < 0) return;
    const cx = lo.cx[selectedTower];

    // Blue ring around the selected tower zone
    ctx.save();
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.7;
    const rx = cx - lo.maxDiskW/2 - 6;
    const ry = lo.groundY - lo.poleH - 8;
    const rw = lo.maxDiskW + 12;
    const rh = lo.poleH + 20;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 12);
    ctx.stroke();
    ctx.restore();

    // Label above
    ctx.save();
    ctx.fillStyle    = '#007AFF';
    ctx.font         = `500 11px -apple-system, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Source', cx, ry - 4);
    ctx.restore();
  }

  // ── Render loop ──────────────────────────────────────────────────
  function renderLoop() {
    const now = performance.now();

    // Update flying disk
    if (flyingDisk) {
      flyingDisk.update(now);
      if (flyingDisk.done) {
        visualTowers[flyingDisk.toTower].push(flyingDisk.diskSize);
        flyingDisk    = null;
        lastMoveEndAt = now;
      }
    }

    // Auto-solve: fire next step when animation done + delay
    if (solving && !flyingDisk && solveQueue.length > 0) {
      if (now - lastMoveEndAt >= solveDelay()) {
        const step = solveQueue.shift();
        if (!attemptMove(step.from, step.to)) stopSolve();
      }
    } else if (solving && !flyingDisk && solveQueue.length === 0) {
      stopSolve();
    }

    // Decay flash
    if (towerFlash) {
      towerFlash.alpha = Math.max(0, 1 - (now - towerFlash.start) / 600);
      if (towerFlash.alpha <= 0) towerFlash = null;
    }

    draw();
    requestAnimationFrame(renderLoop);
  }

  // ── User interaction ─────────────────────────────────────────────
  function towerAtX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x    = clientX - rect.left;
    const zone = (canvas.clientWidth || rect.width) / 3;
    return Math.floor(x / zone);
  }

  canvas.addEventListener('click', e => {
    if (mode !== 'manual' || flyingDisk) return;
    const t = towerAtX(e.clientX);
    if (t < 0 || t > 2) return;

    if (selectedTower === -1) {
      if (!visualTowers[t].length) {
        flashTower(t, 'error');
        setStatus('That tower has no disks', 'error');
        setTimeout(() => setStatus('Select a tower to move a disk'), 1400);
        return;
      }
      selectedTower = t;
      const diskSize = visualTowers[t][visualTowers[t].length - 1];
      setStatus(`Disk ${diskSize} selected — choose destination`);
    } else {
      const from = selectedTower;
      selectedTower = -1;
      if (from !== t) {
        attemptMove(from, t);
      } else {
        setStatus('Select a different tower');
      }
    }
  });

  canvas.addEventListener('mousemove', e => {
    if (mode !== 'manual') { hoveredTower = -1; return; }
    hoveredTower = towerAtX(e.clientX);
    canvas.style.cursor = (!flyingDisk && hoveredTower >= 0) ? 'pointer' : 'default';
  });

  canvas.addEventListener('mouseleave', () => { hoveredTower = -1; });

  // Keyboard: 1, 2, 3
  document.addEventListener('keydown', e => {
    if (mode !== 'manual' || flyingDisk) return;
    const key = parseInt(e.key);
    if (key >= 1 && key <= 3) {
      const t = key - 1;
      if (selectedTower === -1) {
        if (!visualTowers[t].length) {
          flashTower(t, 'error');
          return;
        }
        selectedTower = t;
        const diskSize = visualTowers[t][visualTowers[t].length - 1];
        setStatus(`Disk ${diskSize} selected — choose destination [1, 2, 3]`);
      } else if (selectedTower === t) {
        selectedTower = -1;
        setStatus('Selection cancelled');
      } else {
        const from = selectedTower;
        selectedTower = -1;
        attemptMove(from, t);
      }
    }
    if (e.key === 'Escape') { selectedTower = -1; setStatus('Selection cancelled'); }
  });

  // ── Controls wiring ──────────────────────────────────────────────
  const diskSlider   = document.getElementById('disk-slider');
  const diskLabel    = document.getElementById('disk-count-label');
  const speedLabel   = document.getElementById('speed-count-label');
  const btnUndo      = document.getElementById('btn-undo');
  const btnReset     = document.getElementById('btn-reset');
  const btnSolve     = document.getElementById('btn-solve');
  const btnStop      = document.getElementById('btn-stop');
  const btnResetAuto = document.getElementById('btn-reset-auto');
  const btnWinRestart= document.getElementById('win-restart-btn');

  diskSlider.addEventListener('input', () => {
    diskLabel.textContent = diskSlider.value;
    if (!flyingDisk && !solving) HanoiBridge.reset(parseInt(diskSlider.value));
  });

  speedSlider.addEventListener('input', () => {
    speedLabel.textContent = speedSlider.value;
  });

  btnUndo.addEventListener('click', undoMove);
  btnReset.addEventListener('click', () => {
    stopSolve(false); HanoiBridge.reset(parseInt(diskSlider.value));
  });
  btnSolve.addEventListener('click', startSolve);
  btnStop.addEventListener('click', () => stopSolve());
  btnResetAuto.addEventListener('click', () => {
    stopSolve(false); HanoiBridge.reset(parseInt(diskSlider.value));
    setStatus('Press "Solve" to watch the animated solution');
  });
  btnWinRestart.addEventListener('click', () => {
    document.getElementById('win-overlay').classList.add('hidden');
    HanoiBridge.reset(parseInt(diskSlider.value));
  });

  // Mode tabs
  document.getElementById('tab-manual').addEventListener('click', () => setMode('manual'));
  document.getElementById('tab-auto').addEventListener('click',   () => setMode('auto'));

  // ── Fallback JS (sin Wasm) ───────────────────────────────────────
  function applyFallback(n) {
    const fb = {
      numDisks: n, moveCount: 0, finished: false,
      towers: [Array.from({length:n},(_,i)=>n-i), [], []]
    };
    window.HanoiBridge = {
      init() { return Promise.reject(); },
      reset(nd) {
        Object.assign(fb, { numDisks:nd, moveCount:0, finished:false,
          towers:[Array.from({length:nd},(_,i)=>nd-i),[],[]] });
        document.dispatchEvent(new CustomEvent('hanoi:reset', {detail:{numDisks:nd}}));
        document.dispatchEvent(new CustomEvent('hanoi:statechange', {detail:{...fb,towers:fb.towers.map(t=>[...t])}}));
      },
      move(from, to) {
        const src=fb.towers[from], dst=fb.towers[to];
        if(!src.length) return false;
        const top=src[src.length-1];
        if(dst.length && dst[dst.length-1]<top) return false;
        dst.push(src.pop());
        fb.moveCount++;
        fb.finished = fb.towers[0].length===0 &&
          (fb.towers[1].length===fb.numDisks||fb.towers[2].length===fb.numDisks);
        document.dispatchEvent(new CustomEvent('hanoi:statechange', {detail:{...fb,towers:fb.towers.map(t=>[...t])}}));
        if(fb.finished) document.dispatchEvent(new CustomEvent('hanoi:finished',{detail:{...fb}}));
        return true;
      },
      precomputeSolution() {
        const steps=[];
        function s(n,f,t,a){if(!n)return;s(n-1,f,a,t);steps.push({from:f,to:t,disk:n});s(n-1,a,t,f);}
        s(fb.numDisks,0,2,1); return steps;
      },
      getState() { return {...fb, towers:fb.towers.map(t=>[...t])}; },
      on(type,fn) { document.addEventListener(type,e=>fn(e.detail)); }
    };
  }

  // ── Bootstrap ────────────────────────────────────────────────────
  async function bootstrap() {
    resizeCanvas();

    const badge = document.getElementById('wasm-status');
    try {
      await HanoiBridge.init('./hanoi.js');
      badge.querySelector('.badge-label').textContent = 'Wasm active';
      badge.classList.add('ready');
    } catch {
      applyFallback(3);
      badge.querySelector('.badge-label').textContent = 'JS mode';
    }

    bindBridgeEvents();
    HanoiBridge.reset(3);
    setMode('manual');
    renderLoop();
  }

  bootstrap();

})();
