/* The Daily Run - path puzzle mini-game (prototype module).
 * No build step, no dependencies. Exposes window.RunGame.
 * Engine (rules, generator, solver) is DOM-free so it can be tested in Node.
 */
(function (global) {
  'use strict';

  // ------------------------------------------------------------------
  // Seeded RNG
  // ------------------------------------------------------------------
  function hashStr(s) {
    var h = 1779033703 ^ s.length;
    for (var i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function makeRng(str) {
    var a = hashStr(str);
    function f() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      f: f,
      int: function (n) { return Math.floor(f() * n); },
      pick: function (arr) { return arr[Math.floor(f() * arr.length)]; },
      shuffle: function (arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(f() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
      }
    };
  }

  function puzzleNumber(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return Math.floor(seed);
    var s = String(seed);
    var d = /^day([1-7])$/i.exec(s);
    if (d) return +d[1];
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(2026, 0, 1)) / 864e5);
    return hashStr(s) % 1000;
  }

  // ------------------------------------------------------------------
  // Board helpers
  // ------------------------------------------------------------------
  var RAR = ['common', 'uncommon', 'rare'];
  function upRarity(r) { return r === 'common' ? 'uncommon' : 'rare'; }
  function isFindCell(c) { return c.t === 'find' || c.t === 'mystery'; }

  function finishBoard(b) {
    var n = b.n, N = n * n;
    b.N = N;
    b.nbrs = [];
    for (var i = 0; i < N; i++) {
      var r = Math.floor(i / n), c = i % n, a = [];
      if (r > 0) a.push(i - n);
      if (c < n - 1) a.push(i + 1);
      if (r < n - 1) a.push(i + n);
      if (c > 0) a.push(i - 1);
      b.nbrs.push(a);
    }
    b.objectives = []; b.boostCount = 0;
    b.cells.forEach(function (cell, idx) {
      if (cell.t === 'start') b.start = idx;
      if (cell.t === 'obj') b.objectives[cell.oi] = idx;
      if (cell.t === 'boost') b.boostCount++;
    });
    computeDist(b);
    return b;
  }

  function isAdj(b, a, c) {
    var n = b.n, ra = Math.floor(a / n), rc = Math.floor(c / n);
    return Math.abs(ra - rc) + Math.abs((a % n) - (c % n)) === 1;
  }

  // 0-1 BFS all pairs. Relaxation: gates passable, portals free jump.
  function computeDist(b) {
    var N = b.N, INF = 999, d = new Int16Array(N * N);
    for (var s = 0; s < N; s++) {
      var base = s * N;
      for (var k = 0; k < N; k++) d[base + k] = INF;
      if (b.cells[s].t === 'hazard') continue;
      var dq = [s], head = 0; d[base + s] = 0;
      // simple deque via array with front inserts for 0-edges
      var front = [];
      while (front.length || head < dq.length) {
        var u = front.length ? front.pop() : dq[head++];
        var du = d[base + u], cu = b.cells[u];
        if (cu.t === 'portal') {
          var p = cu.pair;
          if (d[base + p] > du) { d[base + p] = du; front.push(p); }
        }
        var nb = b.nbrs[u];
        for (var j = 0; j < nb.length; j++) {
          var v = nb[j];
          if (b.cells[v].t === 'hazard') continue;
          if (d[base + v] > du + 1) { d[base + v] = du + 1; dq.push(v); }
        }
      }
    }
    b.dist = d;
  }

  var PERMS = { 1: [[0]], 2: [[0, 1], [1, 0]], 3: [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] };
  function tourLB(b, h, mask) {
    var rem = [];
    for (var k = 0; k < 3; k++) if (!(mask & (1 << k))) rem.push(b.objectives[k]);
    if (!rem.length) return 0;
    var best = 9999, N = b.N, perms = PERMS[rem.length];
    for (var p = 0; p < perms.length; p++) {
      var cur = h, tot = 0, pr = perms[p];
      for (var q = 0; q < pr.length; q++) { var o = rem[pr[q]]; tot += b.dist[cur * N + o]; cur = o; }
      if (tot < best) best = tot;
    }
    return best;
  }

  // ------------------------------------------------------------------
  // Rules engine (shared by UI, hint and solver)
  // ------------------------------------------------------------------
  function Walker(b, stepsMax) {
    this.b = b;
    this.max = stepsMax == null ? b.stepsMax : stepsMax;
    this.path = [b.start]; this.tele = [0]; this.moves = [];
    this.vis = new Uint8Array(b.N); this.vis[b.start] = 1;
    this.steps = 0; this.bonus = 0; this.keys = 0; this.objMask = 0;
    this.boostsLeft = b.boostCount; this.hist = [];
  }
  Walker.prototype.head = function () { return this.path[this.path.length - 1]; };
  Walker.prototype.stepsLeft = function () { return this.max + this.bonus - this.steps; };
  Walker.prototype.check = function (t) {
    var b = this.b;
    if (t < 0 || t >= b.N) return 'off';
    if (!isAdj(b, this.head(), t)) return 'far';
    if (this.vis[t]) return 'visited';
    var c = b.cells[t];
    if (c.t === 'hazard') return 'hazard';
    if (c.t === 'gate' && !this.keys) return 'gate';
    if (this.stepsLeft() <= 0) return 'nosteps';
    return '';
  };
  Walker.prototype.step = function (t) {
    var c = this.b.cells[t];
    this.hist.push([this.path.length, this.steps, this.bonus, this.keys, this.objMask, this.boostsLeft]);
    this.moves.push(t); this.path.push(t); this.tele.push(0); this.vis[t] = 1; this.steps++;
    if (c.t === 'boost') { this.bonus += 2; this.boostsLeft--; }
    else if (c.t === 'key') this.keys++;
    else if (c.t === 'obj') this.objMask |= 1 << c.oi;
    else if (c.t === 'portal' && !this.vis[c.pair]) {
      this.path.push(c.pair); this.tele.push(1); this.vis[c.pair] = 1;
    }
  };
  Walker.prototype.undo = function () {
    var h = this.hist.pop();
    if (!h) return false;
    while (this.path.length > h[0]) { this.vis[this.path.pop()] = 0; this.tele.pop(); }
    this.moves.pop();
    this.steps = h[1]; this.bonus = h[2]; this.keys = h[3]; this.objMask = h[4]; this.boostsLeft = h[5];
    return true;
  };
  Walker.prototype.stars = function () {
    var m = this.objMask; return (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
  };
  Walker.prototype.canMove = function () {
    var nb = this.b.nbrs[this.head()];
    for (var i = 0; i < nb.length; i++) if (this.check(nb[i]) === '') return true;
    return false;
  };

  // Lower bound using BFS over unvisited cells from the head (exact first leg),
  // then static distances between the remaining objectives. 9999 = unreachable.
  var dynQ = null, dynD = null;
  function dynLB(b, w) {
    var N = b.N;
    if (!dynQ || dynD.length !== N) { dynQ = new Int16Array(N * 8); dynD = new Int16Array(N); }
    for (var i = 0; i < N; i++) dynD[i] = 9999;
    var h = w.head(), qh = 2 * N, qt = 2 * N, vis = w.vis, cells = b.cells;
    dynD[h] = 0; dynQ[qt++] = h;
    // deque stored in dynQ with front at index qh (front pushes go to qh-1)
    while (qh < qt) {
      var u = dynQ[qh++], du = dynD[u], cu = cells[u];
      if (u !== h && cu.t === 'portal' && !vis[cu.pair] && dynD[cu.pair] > du) { dynD[cu.pair] = du; dynQ[--qh] = cu.pair; }
      var nb = b.nbrs[u];
      for (var j = 0; j < nb.length; j++) {
        var v = nb[j];
        if (vis[v] || cells[v].t === 'hazard') continue;
        if (dynD[v] > du + 1) { dynD[v] = du + 1; dynQ[qt++] = v; }
      }
    }
    var rem = [];
    for (var k = 0; k < 3; k++) if (!(w.objMask & (1 << k))) {
      var o = b.objectives[k];
      if (dynD[o] >= 9999) return 9999;
      rem.push(o);
    }
    if (!rem.length) return 0;
    var best = 9999, perms = PERMS[rem.length];
    for (var p = 0; p < perms.length; p++) {
      var pr = perms[p], cur = rem[pr[0]], tot = dynD[cur];
      for (var q = 1; q < pr.length; q++) { var o2 = rem[pr[q]]; tot += b.dist[cur * N + o2]; cur = o2; }
      if (tot < best) best = tot;
    }
    return best;
  }

  // DFS solver. o: {moves, stepsMax, budget, maxSol, onSol}
  function search(b, o) {
    o = o || {};
    var w = new Walker(b, o.stepsMax);
    var mv = o.moves || [];
    for (var i = 0; i < mv.length; i++) {
      if (w.check(mv[i]) !== '') return { sols: [], budgetHit: false, nodes: 0, invalid: true };
      w.step(mv[i]);
    }
    var nodes = 0, stop = false, budgetHit = false, sols = [];
    var budget = o.budget || 100000, maxSol = o.maxSol || 1, N = b.N;
    function rec() {
      if (++nodes > budget) { budgetHit = true; stop = true; return; }
      if (w.objMask === 7) {
        var p = w.moves.slice(); sols.push(p);
        if (o.onSol ? o.onSol(p, w) : sols.length >= maxSol) stop = true;
        return;
      }
      var left = w.stepsLeft() + 2 * w.boostsLeft;
      if (tourLB(b, w.head(), w.objMask) > left) return;
      if (dynLB(b, w) > left) return;
      if (w.stepsLeft() <= 0) return;
      var nb = b.nbrs[w.head()], cand = [];
      for (var j = 0; j < nb.length; j++) {
        var t = nb[j];
        if (w.check(t) !== '') continue;
        var c = b.cells[t], hp = t;
        if (c.t === 'portal' && !w.vis[c.pair]) hp = c.pair;
        var m2 = w.objMask | (c.t === 'obj' ? 1 << c.oi : 0);
        cand.push([t, tourLB(b, hp, m2) - (c.t === 'boost' ? 1.5 : 0) - (c.t === 'key' ? 1 : 0)]);
      }
      cand.sort(function (x, y) { return x[1] - y[1]; });
      for (var k = 0; k < cand.length; k++) {
        w.step(cand[k][0]); rec(); w.undo();
        if (stop) return;
      }
    }
    rec();
    return { sols: sols, budgetHit: budgetHit, nodes: nodes };
  }

  function objOrder(b, moves) {
    var s = '';
    for (var i = 0; i < moves.length; i++) { var c = b.cells[moves[i]]; if (c.t === 'obj') s += c.oi; }
    return s;
  }
  function routesDiffer(b, p, q) {
    if (objOrder(b, p) !== objOrder(b, q)) return true;
    var sp = {}, diff = 0;
    p.forEach(function (x) { sp[x] = 1; });
    q.forEach(function (x) { if (!sp[x]) diff++; else sp[x] = 2; });
    for (var k in sp) if (sp[k] === 1) diff++;
    return diff >= 4;
  }

  // Optimal step count (iterative deepening) + diversity check.
  function evaluate(b, slack) {
    var lb0 = tourLB(b, b.start, 0);
    if (lb0 >= 999) return null;
    var par = -1, path = null, spent = 0;
    for (var L = lb0; L <= b.N; L++) {
      var r = search(b, { stepsMax: L, budget: Math.max(1000, 80000 - spent), maxSol: 1 });
      spent += r.nodes;
      if (r.sols.length) { par = L; path = r.sols[0]; break; }
      if (r.budgetHit || spent >= 80000) return null;
    }
    if (par < 0) return null;
    var stepsMax = par + slack, kept = [], diverse = false;
    search(b, {
      stepsMax: stepsMax, budget: 30000, onSol: function (p) {
        for (var i = 0; i < kept.length; i++) if (routesDiffer(b, kept[i], p)) { diverse = true; return true; }
        if (kept.length < 40) kept.push(p);
        return false;
      }
    });
    return { par: par, path: path, diverse: diverse, stepsMax: stepsMax };
  }

  // ------------------------------------------------------------------
  // Procedural generator
  // ------------------------------------------------------------------
  var CFG = {
    practice: { n: 4, hz: [1, 2], finds: 2, myst: 0, portals: 0, boosts: 0, keys: 0, slack: 3, spread: 2, minPar: 5, startDist: 2 },
    stroll: { n: 5, hz: [3, 5], finds: 5, myst: 0, portals: 0, boosts: 1, keys: 0, slack: 3, spread: 3, minPar: 8, startDist: 2 },
    trek: { n: 6, hz: [5, 7], finds: 4, myst: 3, portals: 1, boosts: 1, keys: 0, slack: 2, spread: 3, minPar: 10, startDist: 3 },
    summit: { n: 7, hz: [8, 10], finds: 5, myst: 2, portals: 1, boosts: 1, keys: 1, slack: 2, spread: 4, minPar: 13, startDist: 3 }
  };

  function md(n, a, b) { return Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs((a % n) - (b % n)); }

  function staticConnected(b) {
    // every non-hazard cell reachable from start (gates passable, portals ignored)
    var seen = new Uint8Array(b.N), st = [b.start], cnt = 1, total = 0;
    seen[b.start] = 1;
    for (var i = 0; i < b.N; i++) if (b.cells[i].t !== 'hazard') total++;
    while (st.length) {
      var u = st.pop(), nb = b.nbrs[u];
      for (var j = 0; j < nb.length; j++) {
        var v = nb[j];
        if (!seen[v] && b.cells[v].t !== 'hazard') { seen[v] = 1; cnt++; st.push(v); }
      }
    }
    return cnt === total;
  }

  function rollRarity(rng, skew) {
    var x = rng.f();
    if (skew) return x < 0.3 ? 'common' : x < 0.72 ? 'uncommon' : 'rare';
    return x < 0.55 ? 'common' : x < 0.86 ? 'uncommon' : 'rare';
  }

  function tryBuild(cfg, rng) {
    var n = cfg.n, N = n * n, cells = [], i;
    for (i = 0; i < N; i++) cells.push({ t: 'empty' });
    var b = { n: n, cells: cells };
    finishBoardShape(b);
    var edge = [];
    for (i = 0; i < N; i++) { var r = Math.floor(i / n), c = i % n; if (!r || !c || r === n - 1 || c === n - 1) edge.push(i); }
    var start = rng.pick(edge); cells[start].t = 'start'; b.start = start;
    var objs = null;
    for (var k = 0; k < 400 && !objs; k++) {
      var cand = [rng.int(N), rng.int(N), rng.int(N)], ok = true;
      for (var x = 0; x < 3 && ok; x++) {
        if (cand[x] === start || md(n, start, cand[x]) < cfg.startDist) ok = false;
        for (var y = x + 1; y < 3 && ok; y++) if (md(n, cand[x], cand[y]) < cfg.spread) ok = false;
      }
      if (ok) objs = cand;
    }
    if (!objs) return null;
    objs.forEach(function (o, k2) { cells[o].t = 'obj'; cells[o].oi = k2; });
    function free() { var a = []; for (var q = 0; q < N; q++) if (cells[q].t === 'empty') a.push(q); return a; }
    function freeAway() { return free().filter(function (q) { return md(n, q, start) > 1; }); }

    if (cfg.keys) {
      var g = objs.slice().sort(function (p, q) { return md(n, start, q) - md(n, start, p); })[0];
      var nb = b.nbrs[g].filter(function (q) { return cells[q].t === 'empty'; });
      if (nb.length < 2) return null;
      rng.shuffle(nb);
      cells[nb[0]].t = 'gate';
      var rest = nb.slice(1);
      if (rest.length >= 2) { cells[rest[0]].t = 'gate'; rest = rest.slice(1); }
      rest.forEach(function (q) { cells[q].t = 'hazard'; cells[q].hv = rng.int(2); });
      if (!staticConnected(b)) return null;
      var kc = free().filter(function (q) { return md(n, q, start) >= 2 && md(n, q, g) >= 3; });
      if (!kc.length) return null;
      cells[rng.pick(kc)].t = 'key';
    }
    var hzCount = cfg.hz[0] + rng.int(cfg.hz[1] - cfg.hz[0] + 1), placed = 0, tries = 0;
    cells.forEach(function (c2) { if (c2.t === 'hazard') placed++; });
    while (placed < hzCount && tries++ < 300) {
      var fa = freeAway(); if (!fa.length) break;
      var h = rng.pick(fa);
      cells[h].t = 'hazard';
      if (!staticConnected(b)) { cells[h].t = 'empty'; continue; }
      cells[h].hv = rng.int(2); placed++;
    }
    for (var p = 0; p < cfg.portals; p++) {
      var pa = null, pb = null, fr = freeAway();
      for (var t2 = 0; t2 < 200 && pa === null; t2++) {
        var u = rng.pick(fr), v = rng.pick(fr);
        if (u !== v && md(n, u, v) >= n - 1) { pa = u; pb = v; }
      }
      if (pa === null) return null;
      cells[pa] = { t: 'portal', pair: pb, pi: p }; cells[pb] = { t: 'portal', pair: pa, pi: p };
    }
    for (var bo = 0; bo < cfg.boosts; bo++) { var fb = freeAway(); if (fb.length) cells[rng.pick(fb)].t = 'boost'; }
    for (var f = 0; f < cfg.finds; f++) {
      var ff = freeAway(); if (!ff.length) break;
      cells[rng.pick(ff)] = { t: 'find', rarity: rollRarity(rng, false), item: rng.int(4) };
    }
    for (var m = 0; m < cfg.myst; m++) {
      var fm = freeAway(); if (!fm.length) break;
      cells[rng.pick(fm)] = { t: 'mystery', rarity: rollRarity(rng, true), item: rng.int(4) };
    }
    // at least one rare to chase on bigger boards: farthest find from start
    if (cfg.n >= 5 && !cells.some(function (c3) { return isFindCell(c3) && c3.rarity === 'rare'; })) {
      var far = -1, fd = -1;
      cells.forEach(function (c4, q) { if (c4.t === 'find' && md(n, q, start) > fd) { fd = md(n, q, start); far = q; } });
      if (far >= 0) cells[far].rarity = 'rare';
    }
    return finishBoard(b);
  }
  function finishBoardShape(b) {
    // nbrs only (used during build before finishBoard)
    var n = b.n, N = n * n; b.N = N; b.nbrs = [];
    for (var i = 0; i < N; i++) {
      var r = Math.floor(i / n), c = i % n, a = [];
      if (r > 0) a.push(i - n); if (c < n - 1) a.push(i + 1); if (r < n - 1) a.push(i + n); if (c > 0) a.push(i - 1);
      b.nbrs.push(a);
    }
  }

  function fallbackBoard(cfg) {
    // Always-solvable plain board (never expected to be used).
    var n = cfg.n, cells = [];
    for (var i = 0; i < n * n; i++) cells.push({ t: 'empty' });
    cells[0].t = 'start';
    cells[n - 1] = { t: 'obj', oi: 0 }; cells[n * n - 1] = { t: 'obj', oi: 1 }; cells[n * (n - 1)] = { t: 'obj', oi: 2 };
    cells[n + 1] = { t: 'find', rarity: 'common', item: 0 };
    var b = finishBoard({ n: n, cells: cells });
    var ev = evaluate(b, cfg.slack);
    b.par = ev.par; b.stepsMax = ev.stepsMax; b.solution = ev.path;
    return b;
  }

  // ------------------------------------------------------------------
  // Hand-crafted boards (first week). Legend:
  //  S start  O objective  . open  # hazard  ~ hazard (water/pond)
  //  B boost  P portal (pairs in reading order: P,P then Q,Q)
  //  c u r  find common/uncommon/rare    1 2 3 mystery common/uncommon/rare
  //  K key  G gate
  // ------------------------------------------------------------------
  var CRAFTED = [
    { id: 'day1', title: 'Trailhead', twist: null, slack: 3, diff: 'stroll',
      intro: 'A gentle start. Draw a trail to all 3 {objs} for 3 stars.',
      map: ['S.c.O',
            '.#.#.',
            'u.O..',
            '.#.#c',
            'r...O'] },
    { id: 'day2', title: 'Fork in the Path', twist: 'fork', slack: 2, diff: 'stroll',
      intro: 'Two ways around the rocks. Only one of them gets you home.',
      map: ['S...O',
            '.#.#.',
            '.#O#u',
            'c....',
            'r..#O'] },
    { id: 'day3', title: 'Second Wind', twist: 'boost', slack: 2, diff: 'stroll',
      intro: '{boost} give +2 steps. Spend them on that rare find.',
      map: ['S.#O..',
            '.B#..r',
            '.....u',
            '#..O..',
            'c..#..',
            'O#u...'] },
    { id: 'day4', title: 'The Tunnel', twist: 'portal', slack: 2, diff: 'trek',
      intro: 'Step into a {portal} and pop out at its twin.',
      map: ['S....O',
            '.##.#.',
            '.c#P..',
            '..#...',
            'O.P..#',
            '.u#r.O'] },
    { id: 'day5', title: 'Fog Bank', twist: 'mystery', slack: 1, diff: 'trek',
      intro: 'Mystery tiles hide a find. A Lens shows what is inside.',
      map: ['S.2.#O',
            '.#....',
            '1.O.3#',
            '.#.#.c',
            '..u..#',
            'O.~3.1'] },
    { id: 'day6', title: 'Behind the Gate', twist: 'key', slack: 2, diff: 'summit',
      intro: 'One {obj} sits behind gates. Grab the key first.',
      map: ['S..#..r',
            '.#.K...',
            '.c.#.u.',
            '#..O.##',
            'O..#..#',
            '.#u..G#',
            '3....GO'] },
    { id: 'day7', title: 'The Summit', twist: 'all', slack: 2, diff: 'summit',
      intro: 'Everything at once: a key, a {portal}, a boost and the fog. Good luck up there.',
      map: ['S..#K.r',
            '.B...#.',
            '.#.O.Pu',
            '##c####',
            'O..P.3.',
            '.#2..#G',
            'u...cGO'] }
  ];

  function parseMap(def, raw) {
    var rows = def.map, n = rows.length, cells = [], oi = 0, portals = {};
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var ch = rows[r][c], i = r * n + c, cell;
      switch (ch) {
        case 'S': cell = { t: 'start' }; break;
        case 'O': cell = { t: 'obj', oi: oi++ }; break;
        case '#': cell = { t: 'hazard', hv: 0 }; break;
        case '~': cell = { t: 'hazard', hv: 1 }; break;
        case 'B': cell = { t: 'boost' }; break;
        case 'K': cell = { t: 'key' }; break;
        case 'G': cell = { t: 'gate' }; break;
        case 'c': case 'u': case 'r':
          cell = { t: 'find', rarity: { c: 'common', u: 'uncommon', r: 'rare' }[ch], item: (i * 7) % 4 }; break;
        case '1': case '2': case '3':
          cell = { t: 'mystery', rarity: RAR[+ch - 1], item: (i * 5) % 4 }; break;
        case 'P': case 'Q':
          cell = { t: 'portal', pi: ch === 'P' ? 0 : 1 };
          if (portals[ch] != null) { cell.pair = portals[ch]; cells[portals[ch]].pair = i; } else portals[ch] = i;
          break;
        default: cell = { t: 'empty' };
      }
      cells.push(cell);
    }
    var b = finishBoard({ n: n, cells: cells });
    if (raw) return b;
    var ev = evaluate(b, def.slack);
    if (!ev) throw new Error('Crafted board ' + def.id + ' is not solvable');
    b.par = ev.par; b.stepsMax = ev.stepsMax; b.solution = ev.path; b.diverse = ev.diverse;
    b.crafted = def; b.difficulty = def.diff;
    return b;
  }

  var cache = {};
  function generate(seed, difficulty) {
    var key = String(seed) + '|' + difficulty;
    if (cache[key]) return cache[key];
    var b = null, crafted = /^day([1-7])$/i.exec(String(seed));
    if (crafted && difficulty !== 'practice') {
      b = parseMap(CRAFTED[+crafted[1] - 1]);
    } else {
      if (!CFG[difficulty]) difficulty = 'stroll';
      var cfg = CFG[difficulty], fallback = null;
      for (var attempt = 0; attempt < 80; attempt++) {
        var rng = makeRng('run|' + seed + '|' + difficulty + '|' + attempt);
        var cand = tryBuild(cfg, rng);
        if (!cand) continue;
        var ev = evaluate(cand, cfg.slack);
        if (!ev) continue;
        cand.par = ev.par; cand.stepsMax = ev.stepsMax; cand.solution = ev.path; cand.diverse = ev.diverse; cand.attempt = attempt;
        if (ev.diverse && ev.par >= cfg.minPar) { b = cand; break; }
        if (!fallback) fallback = cand;
      }
      if (!b) b = fallback || fallbackBoard(cfg);
      b.difficulty = difficulty;
    }
    b.seed = seed; b.puzzleNo = puzzleNumber(seed);
    cache[key] = b;
    return b;
  }

  function boardSignature(b) {
    return b.n + ':' + b.stepsMax + ':' + b.cells.map(function (c) {
      return c.t[0] + (c.rarity ? c.rarity[0] : '') + (c.pair != null ? c.pair : '') + (c.hv || '');
    }).join(',');
  }

  // ------------------------------------------------------------------
  // Themes: copy + palette hooks (palette lives in run.css)
  // ------------------------------------------------------------------
  var THEMES = {
    expedition: {
      start: 'camp', obj: 'flag', objs: 'flags', square: '🟧',
      finds: {
        common: ['River stone', 'Hawk feather', 'Pine cone', 'Trail pin'],
        uncommon: ['Brass compass', 'Old map', 'Lantern', 'Spyglass'],
        rare: ['Amber gem', 'Golden idol', 'Star chart', 'Sky crystal']
      },
      hazard: ['Boulders block the trail.', 'The river is too deep here.'],
      hazardName: ['Boulder', 'River'], boost: 'Trail boots', portal: 'Cave tunnel',
      cheer: ['Onward!', 'Nice step!', 'Good eye!', 'Trailblazer!'],
      empty: 'Trail'
    },
    grove: {
      start: 'seedling', obj: 'bloom', objs: 'blooms', square: '🟩',
      finds: {
        common: ['Clover', 'Acorn', 'Smooth pebble', 'Snail shell'],
        uncommon: ['Toadstool', 'Honeycomb', 'Robin feather', 'Moss stone'],
        rare: ['Moon blossom', 'Glass butterfly', 'Golden pear', 'Fairy ring']
      },
      hazard: ['Brambles block the way.', 'The pond is too wide here.'],
      hazardName: ['Bramble', 'Pond'], boost: 'Watering can', portal: 'Rabbit burrow',
      cheer: ['Lovely!', 'Nice step!', 'Good eye!', 'In bloom!'],
      empty: 'Path'
    }
  };
  var DIFF_LABEL = { stroll: 'Stroll', trek: 'Trek', summit: 'Summit', practice: 'Practice' };

  // ------------------------------------------------------------------
  // Icons (24x24). Classes: a b c h = fills, sa sb sc = strokes.
  // ------------------------------------------------------------------
  function starPts(cx, cy, ro, ri, k) {
    var s = [];
    for (var i = 0; i < k * 2; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / k, rr = i % 2 ? ri : ro;
      s.push((cx + rr * Math.cos(ang)).toFixed(2) + ',' + (cy + rr * Math.sin(ang)).toFixed(2));
    }
    return s.join(' ');
  }
  var STAR = starPts(12, 12.6, 10, 4.4, 5);
  var IC = {
    tent: '<path class="a" d="M12 3.2 21.8 20H2.2z"/><path class="b" d="M12 10.2 15.9 20H8.1z"/><path class="sc" stroke-width="1.8" stroke-linecap="round" d="M1.5 20.6h21"/>',
    flag: '<rect class="b" x="4.6" y="2.4" width="2.4" height="19.4" rx="1.2"/><path class="a" d="M7 3.4h12.6l-3.4 4.5 3.4 4.5H7z"/>',
    boulder: '<path class="a" d="M2.6 19.6C1.8 14 5.4 8.4 10.8 7.2 16.2 6 21.4 10 21.4 15.4c0 2.6-1 4.2-3 4.2z"/><path class="sc" stroke-width="1.4" stroke-linecap="round" d="M9.4 10.4l2.1 2.6-1.7 2.5M15.6 12.7l-1.3 2.1"/>',
    river: '<path class="a" d="M2 7.6c2.5-2 4.5-2 6.7 0s4.3 2 6.6 0 4.3-2 6.7 0v4.2c-2.4-2-4.4-2-6.7 0s-4.4 2-6.6 0-4.2-2-6.7 0z"/><path class="b" d="M2 14.6c2.5-2 4.5-2 6.7 0s4.3 2 6.6 0 4.3-2 6.7 0v4.2c-2.4-2-4.4-2-6.7 0s-4.4 2-6.6 0-4.2-2-6.7 0z"/>',
    boots: '<path class="a" d="M4.5 12 12 4.5l7.5 7.5-2.7 2.7L12 9.9l-4.8 4.8z"/><path class="b" d="M4.5 18.6 12 11.1l7.5 7.5-2.7 2.7-4.8-4.8-4.8 4.8z"/>',
    portal: '<circle class="a" cx="12" cy="12" r="9.6"/><circle class="b" cx="12" cy="12" r="6.4"/><circle class="c" cx="12" cy="12" r="3.2"/>',
    key: '<circle class="a" cx="7.4" cy="12" r="5"/><circle class="h" cx="7.4" cy="12" r="2"/><path class="a" d="M11.6 10.5H21.6v3h-1.9v3h-2.8v-3h-5.3z"/>',
    lock: '<path class="sb" stroke-width="2.8" d="M7.8 11V8.2a4.2 4.2 0 0 1 8.4 0V11"/><rect class="a" x="4.4" y="10.4" width="15.2" height="11" rx="2.4"/><circle class="h" cx="12" cy="15.4" r="1.8"/><rect class="h" x="11.2" y="15.4" width="1.6" height="3.2" rx=".8"/>',
    unlock: '<path class="sb" stroke-width="2.8" d="M7.8 11V8.2a4.2 4.2 0 0 1 8-1.8"/><rect class="a" x="4.4" y="10.4" width="15.2" height="11" rx="2.4"/><circle class="h" cx="12" cy="15.4" r="1.8"/>',
    feather: '<path class="a" d="M20 2.8C11.2 3.4 6.6 9.6 6.4 18l5.4-5.6-4.5 6.9C14.8 18.8 20.6 12.4 20 2.8z"/><path class="sb" stroke-width="1.7" stroke-linecap="round" d="M3.4 21.4 12.6 11"/>',
    compass: '<circle class="a" cx="12" cy="12" r="9.6"/><circle class="h" cx="12" cy="12" r="7"/><path class="b" d="M12 5.4 14.4 12H9.6z"/><path class="c" d="M12 18.6 9.6 12h4.8z"/>',
    gem: '<path class="a" d="M6.8 3.6h10.4L22 9.4 12 21.4 2 9.4z"/><path class="sc" stroke-width="1.15" stroke-linejoin="round" d="M2 9.4h20M9.2 3.6 7.5 9.4 12 21.4l4.5-12-1.7-5.8"/>',
    sprout: '<path class="b" d="M10.9 21.6v-9.4h2.2v9.4z"/><path class="a" d="M12 13.4C12 8.2 7.9 6.2 3.4 7c0 4.4 3.4 7.4 8.6 6.4z"/><path class="c" d="M12 11.4c0-5.4 4.2-8.2 8.6-7.4 0 4.6-3.6 8-8.6 7.4z"/>',
    flower: '<path class="sb" stroke-width="2" stroke-linecap="round" d="M12 14v8"/><circle class="a" cx="12" cy="5.6" r="3.7"/><circle class="a" cx="16.6" cy="8.9" r="3.7"/><circle class="a" cx="14.8" cy="14.3" r="3.7"/><circle class="a" cx="9.2" cy="14.3" r="3.7"/><circle class="a" cx="7.4" cy="8.9" r="3.7"/><circle class="b" cx="12" cy="10.4" r="3"/>',
    bramble: '<polygon class="a" points="' + starPts(12, 12.4, 10.2, 6.4, 9) + '"/><circle class="c" cx="9" cy="11" r="1.7"/><circle class="c" cx="14.6" cy="10.2" r="1.7"/><circle class="c" cx="12.4" cy="15" r="1.7"/>',
    pond: '<ellipse class="a" cx="12" cy="13" rx="10" ry="6.6"/><ellipse class="sc" stroke-width="1.3" cx="12" cy="13" rx="6" ry="3.4"/><circle class="b" cx="16.4" cy="11.4" r="2.4"/>',
    drop: '<path class="a" d="M12 2.6c4.2 5.2 7 8.8 7 12.4a7 7 0 0 1-14 0c0-3.6 2.8-7.2 7-12.4z"/><ellipse class="h" cx="9.4" cy="15" rx="1.6" ry="2.6"/>',
    burrow: '<path class="b" d="M1.6 20c2-6.6 6-9.8 10.4-9.8s8.4 3.2 10.4 9.8z"/><ellipse class="a" cx="12" cy="17.6" rx="5.4" ry="3.4"/>',
    clover: '<path class="sb" stroke-width="1.8" stroke-linecap="round" d="M12 12.4 13.8 21.6"/><circle class="a" cx="12" cy="7" r="4"/><circle class="a" cx="7.6" cy="12.6" r="4"/><circle class="a" cx="16.4" cy="12.6" r="4"/>',
    mushroom: '<path class="a" d="M2.6 12.6C2.6 6.8 6.8 3 12 3s9.4 3.8 9.4 9.6z"/><circle class="h" cx="8" cy="8.4" r="1.6"/><circle class="h" cx="14.6" cy="6.6" r="1.3"/><circle class="h" cx="16.4" cy="10.2" r="1.2"/><path class="b" d="M9 12.6h6l.8 7.2a1.6 1.6 0 0 1-1.6 1.8H9.8a1.6 1.6 0 0 1-1.6-1.8z"/>',
    butterfly: '<path class="a" d="M12 11.4C9 4.2 2.6 3.4 2.6 7.6c0 3.8 4.2 4.6 9.4 4.6zM12 11.4c3-7.2 9.4-8 9.4-3.8 0 3.8-4.2 4.6-9.4 4.6z"/><path class="b" d="M12 12.4c-4.2 0-7.8 1.6-7.2 4.6.6 3 4.6 2.6 7.2-3.6zM12 12.4c4.2 0 7.8 1.6 7.2 4.6-.6 3-4.6 2.6-7.2-3.6z"/><rect class="c" x="11.1" y="6.6" width="1.8" height="11.4" rx=".9"/>',
    mystery: '<circle class="a" cx="12" cy="12" r="10"/><text class="h" x="12" y="17.2" text-anchor="middle" font-size="15" font-weight="900" font-family="system-ui,sans-serif">?</text>',
    star: '<polygon class="a" points="' + STAR + '"/>',
    magnet: '<path class="sa" stroke-width="4.4" d="M6 3.5v8.3a6 6 0 0 0 12 0V3.5"/><rect class="c" x="3.8" y="2.4" width="4.4" height="4" rx="1"/><rect class="c" x="15.8" y="2.4" width="4.4" height="4" rx="1"/>',
    lens: '<circle class="sa" stroke-width="2.8" cx="10" cy="10" r="6.4"/><circle class="h" cx="10" cy="10" r="5"/><path class="sb" stroke-width="3.4" stroke-linecap="round" d="M15 15l5.6 5.6"/>',
    double: '<rect class="a" x="2" y="4" width="20" height="16" rx="5"/><text class="h" x="12" y="16.6" text-anchor="middle" font-size="11.5" font-weight="900" font-family="system-ui,sans-serif">x2</text>',
    lucky: '<path class="sb" stroke-width="1.8" stroke-linecap="round" d="M12 12l3 9.4"/><circle class="a" cx="12" cy="7.4" r="3.6"/><circle class="a" cx="16.6" cy="12" r="3.6"/><circle class="a" cx="12" cy="16.6" r="3.6"/><circle class="a" cx="7.4" cy="12" r="3.6"/><circle class="h" cx="12" cy="12" r="1.6"/>',
    bag: '<path class="a" d="M5 8.6h14l1.4 11a2 2 0 0 1-2 2.3H5.6a2 2 0 0 1-2-2.3z"/><path class="sb" stroke-width="2" d="M8.6 10V6.6a3.4 3.4 0 0 1 6.8 0V10"/>',
    undo: '<path class="sa" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M9 5.5 4 10.5l5 5M4.6 10.5H15a5 5 0 0 1 0 10h-3"/>',
    clear: '<path class="sa" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.2 3.6v4.2h4.2"/>',
    hint: '<path class="a" d="M12 2.6a7 7 0 0 0-4.2 12.6c.8.6 1.2 1.4 1.2 2.3h6c0-.9.4-1.7 1.2-2.3A7 7 0 0 0 12 2.6z"/><rect class="b" x="9" y="18.6" width="6" height="2.4" rx="1.2"/>',
    soundOn: '<path class="a" d="M3.5 9h3.8L12 4.6v14.8L7.3 15H3.5z"/><path class="sa" stroke-width="2.2" stroke-linecap="round" d="M15.4 8.6a5 5 0 0 1 0 6.8M18.2 6a8.6 8.6 0 0 1 0 12"/>',
    soundOff: '<path class="a" d="M3.5 9h3.8L12 4.6v14.8L7.3 15H3.5z"/><path class="sa" stroke-width="2.2" stroke-linecap="round" d="M15.6 9.2l5.4 5.6M21 9.2l-5.4 5.6"/>',
    help: '<circle class="sa" stroke-width="2.4" cx="12" cy="12" r="9.4"/><text class="a" x="12" y="16.8" text-anchor="middle" font-size="13" font-weight="900" font-family="system-ui,sans-serif">?</text>',
    copy: '<rect class="sa" stroke-width="2.2" x="8" y="8" width="12" height="12" rx="2.4"/><path class="sa" stroke-width="2.2" d="M16 5.4V5a1.6 1.6 0 0 0-1.6-1.6H5A1.6 1.6 0 0 0 3.4 5v9.4A1.6 1.6 0 0 0 5 16h.4"/>',
    check: '<path class="sa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12.6l4.4 4.4L19 7.4"/>'
  };
  function svg(name, cls) {
    return '<svg class="rg-ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (IC[name] || '') + '</svg>';
  }
  var THEME_ICONS = {
    expedition: { start: 'tent', obj: 'flag', hz: ['boulder', 'river'], boost: 'boots', portal: 'portal',
      find: { common: 'feather', uncommon: 'compass', rare: 'gem' } },
    grove: { start: 'sprout', obj: 'flower', hz: ['bramble', 'pond'], boost: 'drop', portal: 'burrow',
      find: { common: 'clover', uncommon: 'mushroom', rare: 'butterfly' } }
  };
  var PU = [
    { k: 'magnet', name: 'Magnet', tip: 'Pulls in finds next to your trail.' },
    { k: 'lens', name: 'Lens', tip: 'Shows what every mystery tile hides.' },
    { k: 'double', name: 'Double', tip: 'Tap a find. It pays double.' },
    { k: 'lucky', name: 'Lucky', tip: 'Tap a find. It goes up one rarity.' }
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ------------------------------------------------------------------
  // Sound (WebAudio, muted by default)
  // ------------------------------------------------------------------
  function Sound(theme) { this.ctx = null; this.on = false; this.wave = theme === 'grove' ? 'sine' : 'triangle'; }
  Sound.prototype.ensure = function () {
    if (this.ctx) return this.ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; }
    return this.ctx;
  };
  Sound.prototype.tone = function (freq, dur, delay, vol) {
    if (!this.on) return;
    var ctx = this.ensure(); if (!ctx) return;
    var t0 = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = this.wave; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.07, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  };
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  Sound.prototype.step = function (k) { this.tone(392 * Math.pow(2, PENTA[k % PENTA.length] / 12), 0.12); };
  Sound.prototype.back = function () { this.tone(330, 0.08, 0, 0.04); };
  Sound.prototype.bump = function () { this.tone(150, 0.14, 0, 0.06); };
  Sound.prototype.chord = function (base) { var s = this; [0, 4, 7, 12].forEach(function (x, i) { s.tone(base * Math.pow(2, x / 12), 0.3, i * 0.06); }); };
  Sound.prototype.find = function (r) { this.tone(r === 'rare' ? 1318 : r === 'uncommon' ? 1046 : 880, 0.16, 0, 0.05); };

  function buzz(p) { try { if (global.navigator && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------------
  // Mount
  // ------------------------------------------------------------------
  function mount(container, opts) {
    opts = opts || {};
    var theme = THEMES[opts.theme] ? opts.theme : 'expedition';
    var T = THEMES[theme], TI = THEME_ICONS[theme];
    var practice = !!opts.practice;
    var difficulty = practice ? 'practice' : (CFG[opts.difficulty] ? opts.difficulty : 'stroll');
    var seed = opts.seed != null ? opts.seed : new Date().toISOString().slice(0, 10);
    var board = generate(practice ? 'practice|' + seed : seed, difficulty);
    var shownDiff = practice ? 'practice' : (board.difficulty || difficulty);
    var n = board.n;
    var rm = !!opts.reducedMotion || !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var inv = {};
    PU.forEach(function (p) { inv[p.k] = practice ? 0 : Math.max(0, (opts.powerUps && +opts.powerUps[p.k]) || 0); });
    var onFinish = typeof opts.onFinish === 'function' ? opts.onFinish : function () {};
    // Optional shared item art: renderItem(findId, rarity) -> SVG/HTML string, or { html, name }.
    var renderItem = typeof opts.renderItem === 'function' ? opts.renderItem : null, artCache = {};
    function itemArt(rarity, item) {
      if (!renderItem) return null;
      var id = 'find.' + rarity + '.' + item;
      if (id in artCache) return artCache[id];
      var out = null;
      try {
        var r = renderItem(id, rarity);
        if (typeof r === 'string' && r) out = { html: r };
        else if (r && (r.html || r.svg)) out = { html: r.html || r.svg, name: r.name };
      } catch (e) { out = null; }
      artCache[id] = out;
      return out;
    }
    function artHtml(rarity, item) {
      var a = itemArt(rarity, item);
      return a ? '<span class="rg-item">' + a.html + '</span>' : svg(TI.find[rarity]);
    }
    function itemLabel(rarity, item) {
      var a = itemArt(rarity, item);
      return a && a.name ? a.name : T.finds[rarity][(+item || 0) % 4];
    }
    var sound = new Sound(theme);
    var destroyed = false, timers = [];

    var st = {
      w: new Walker(board), powers: { magnet: false, lens: false, double: null, lucky: null },
      target: null, phase: 'intro', hint: null, hintBack: null, lastLen: 1, msgT: null, skipping: false
    };

    var root = document.createElement('div');
    root.className = 'rg-root rg-theme-' + theme + (rm ? ' rg-rm' : '') + ' rg-n' + n;
    root.setAttribute('data-difficulty', shownDiff);
    root.setAttribute('data-phase', 'intro');
    var puzzleLabel = practice ? 'Practice board' : (board.crafted ? 'Board ' + board.puzzleNo + ' of 7' : 'Puzzle #' + board.puzzleNo);
    var titleText = board.crafted && !practice ? board.crafted.title : 'The Daily Run';

    root.innerHTML =
      '<div class="rg-wrap">' +
      '<header class="rg-head">' +
        '<div class="rg-title"><div class="rg-kicker">' + esc(practice ? 'Practice' : 'The Daily Run') + '</div>' +
        '<h2 class="rg-h">' + esc(titleText) + '</h2>' +
        '<div class="rg-sub">' + esc(puzzleLabel) + ' &middot; <span class="rg-diff">' + DIFF_LABEL[shownDiff] + '</span></div></div>' +
        '<button type="button" class="rg-icon-btn rg-sound" aria-pressed="false" aria-label="Sound off">' + svg('soundOff') + '</button>' +
        '<button type="button" class="rg-icon-btn rg-help" aria-label="How to play">' + svg('help') + '</button>' +
      '</header>' +
      '<div class="rg-hud">' +
        '<div class="rg-steps" aria-label="Steps left"><div class="rg-steps-num">0</div><div class="rg-steps-lab">steps left</div><div class="rg-pips" aria-hidden="true"></div></div>' +
        '<div class="rg-stars" aria-label="Stars"></div>' +
        '<div class="rg-tray" aria-label="Finds">' + svg('bag', 'rg-bag') + '<span class="rg-tray-num">0</span><span class="rg-tray-lab">finds</span></div>' +
      '</div>' +
      '<div class="rg-board-wrap"><div class="rg-board" tabindex="0" role="application" aria-roledescription="puzzle board">' +
        '<div class="rg-layer rg-bg"></div>' +
        '<svg class="rg-path" viewBox="0 0 ' + n + ' ' + n + '" aria-hidden="true"><g class="rg-path-tele"></g><g class="rg-path-edge"></g><g class="rg-path-main"></g><g class="rg-path-inner"></g><g class="rg-path-dots"></g></svg>' +
        '<div class="rg-layer rg-fg" aria-hidden="true"></div>' +
        '<div class="rg-token" aria-hidden="true"><span></span></div>' +
        '<div class="rg-fx" aria-hidden="true"></div>' +
      '</div></div>' +
      '<div class="rg-msg" aria-live="polite"></div>' +
      '<div class="rg-pu" role="group" aria-label="Power-ups"></div>' +
      '<div class="rg-actions">' +
        '<button type="button" class="rg-btn rg-undo">' + svg('undo') + '<span>Undo</span></button>' +
        '<button type="button" class="rg-btn rg-clear">' + svg('clear') + '<span>Clear</span></button>' +
        '<button type="button" class="rg-btn rg-hintbtn">' + svg('hint') + '<span>Hint</span></button>' +
        '<button type="button" class="rg-btn rg-primary rg-commit">Commit</button>' +
      '</div>' +
      '<div class="rg-sr" aria-live="polite"></div>' +
      '</div>' +
      '<div class="rg-coach" hidden></div>' +
      '<div class="rg-sheet-scrim" hidden></div>' +
      '<div class="rg-sheet" role="dialog" aria-modal="true" hidden></div>' +
      '<div class="rg-flylayer" aria-hidden="true"></div>' +
      '<div class="rg-skip" hidden>Tap to skip</div>';
    container.appendChild(root);

    function $(s) { return root.querySelector(s); }
    var el = {
      board: $('.rg-board'), bg: $('.rg-bg'), fg: $('.rg-fg'), token: $('.rg-token'), fx: $('.rg-fx'),
      pTele: $('.rg-path-tele'), pEdge: $('.rg-path-edge'), pMain: $('.rg-path-main'), pInner: $('.rg-path-inner'), pDots: $('.rg-path-dots'),
      stepsNum: $('.rg-steps-num'), stepsLab: $('.rg-steps-lab'), pips: $('.rg-pips'), stars: $('.rg-stars'), trayNum: $('.rg-tray-num'), tray: $('.rg-tray'),
      msg: $('.rg-msg'), pu: $('.rg-pu'), undo: $('.rg-undo'), clear: $('.rg-clear'), hint: $('.rg-hintbtn'), commit: $('.rg-commit'),
      sr: $('.rg-sr'), coach: $('.rg-coach'), scrim: $('.rg-sheet-scrim'), sheet: $('.rg-sheet'), fly: $('.rg-flylayer'),
      skip: $('.rg-skip'), sound: $('.rg-sound'), help: $('.rg-help')
    };
    if (practice) el.pu.hidden = true;

    // Stars
    var starHtml = '';
    for (var s = 0; s < 3; s++) starHtml += '<span class="rg-star">' + svg('star') + '</span>';
    el.stars.innerHTML = starHtml;
    var starEls = el.stars.querySelectorAll('.rg-star');

    // Cells
    var bgCells = [], fgCells = [];
    for (var i = 0; i < board.N; i++) {
      var b1 = document.createElement('div');
      b1.className = 'rg-cell';
      b1.setAttribute('data-i', i);
      b1.style.left = (i % n) * 100 / n + '%'; b1.style.top = Math.floor(i / n) * 100 / n + '%';
      b1.innerHTML = '<div class="rg-tile"></div>';
      el.bg.appendChild(b1); bgCells.push(b1);
      var f1 = document.createElement('div');
      f1.className = 'rg-fcell';
      f1.style.left = b1.style.left; f1.style.top = b1.style.top;
      el.fg.appendChild(f1); fgCells.push(f1);
    }

    function cellName(i) {
      var c = board.cells[i];
      switch (c.t) {
        case 'start': return cap(T.start);
        case 'obj': return cap(T.obj);
        case 'hazard': return T.hazardName[c.hv || 0];
        case 'boost': return T.boost + ', plus 2 steps';
        case 'portal': return T.portal;
        case 'key': return 'Key';
        case 'gate': return 'Gate';
        case 'find': return findName(i) + ', ' + effRarity(i) + ' find';
        case 'mystery': return revealed(i) ? findName(i) + ', ' + effRarity(i) + ' find' : 'Mystery tile';
        default: return T.empty;
      }
    }
    function findName(i) { var c = board.cells[i]; return itemLabel(effRarity(i), c.item); }
    function effRarity(i) { var c = board.cells[i]; return st.powers.lucky === i ? upRarity(c.rarity) : c.rarity; }
    function revealed(i) { return st.powers.lens || (st.revealSet && st.revealSet[i]); }

    function tileIcon(i) {
      var c = board.cells[i];
      switch (c.t) {
        case 'start': return svg(TI.start);
        case 'obj': return svg(TI.obj);
        case 'hazard': return svg(TI.hz[c.hv || 0]);
        case 'boost': return svg(TI.boost) + '<span class="rg-plus">+2</span>';
        case 'portal': return svg(TI.portal) + '<span class="rg-plabel">' + (c.pi ? 'B' : 'A') + '</span>';
        case 'key': return svg('key');
        case 'gate': return svg(st.w.keys ? 'unlock' : 'lock');
        case 'find': return findIcon(i);
        case 'mystery': return revealed(i) ? findIcon(i) : svg('mystery');
        default: return '';
      }
    }
    function findIcon(i) {
      var r = effRarity(i);
      return '<span class="rg-rbadge rg-rb-' + r + '"></span>' + artHtml(r, board.cells[i].item) +
        '<span class="rg-rpips rg-rp-' + r + '"><i></i><i></i><i></i></span>';
    }
    function tileClass(i) {
      var c = board.cells[i], k = 'rg-tile rg-t-' + c.t;
      if (c.t === 'hazard') k += ' rg-hv' + (c.hv || 0);
      if (c.t === 'portal') k += ' rg-pi' + (c.pi || 0);
      if (isFindCell(c) && (c.t === 'find' || revealed(i))) k += ' rg-r-' + effRarity(i);
      if (c.t === 'mystery' && revealed(i)) k += ' is-revealed';
      return k;
    }

    var iconCache = [];
    function renderTileIcons(force) {
      for (var i = 0; i < board.N; i++) {
        var html = tileIcon(i) +
          (st.powers.double === i ? '<span class="rg-x2">x2</span>' : '') +
          (st.powers.lucky === i ? '<span class="rg-lucky-tag">' + svg('lucky') + '</span>' : '');
        if (force || iconCache[i] !== html) { fgCells[i].innerHTML = html; iconCache[i] = html; }
        var c0 = board.cells[i];
        fgCells[i].setAttribute('data-t', c0.t);
        if (c0.t === 'hazard') fgCells[i].setAttribute('data-hv', c0.hv || 0);
        if (c0.t === 'find' || (c0.t === 'mystery' && revealed(i))) fgCells[i].setAttribute('data-r', effRarity(i));
        else fgCells[i].removeAttribute('data-r');
        var tc = tileClass(i), tile = bgCells[i].firstChild;
        if (tile.className !== tc) tile.className = tc;
        bgCells[i].setAttribute('aria-label', cellName(i));
      }
    }

    // ---------- path drawing ----------
    function ctr(i) { return [(i % n) + 0.5, Math.floor(i / n) + 0.5]; }
    var NS = 'http://www.w3.org/2000/svg';
    function mkLine(g, a, b, cls, animate) {
      var l = document.createElementNS(NS, 'line'), p = ctr(a), q = ctr(b);
      l.setAttribute('x1', p[0]); l.setAttribute('y1', p[1]); l.setAttribute('x2', q[0]); l.setAttribute('y2', q[1]);
      l.setAttribute('class', cls + (animate ? ' is-new' : ''));
      l.setAttribute('pathLength', '1');
      g.appendChild(l);
      return l;
    }
    function renderPath() {
      var w = st.w, path = w.path, prev = st.lastLen;
      [el.pTele, el.pEdge, el.pMain, el.pInner, el.pDots].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); });
      for (var k = 1; k < path.length; k++) {
        var animate = !rm && k >= prev, a = path[k - 1], b = path[k];
        if (w.tele[k]) { mkLine(el.pTele, a, b, 'rg-seg-tele', animate); continue; }
        mkLine(el.pEdge, a, b, 'rg-seg-edge', animate);
        mkLine(el.pMain, a, b, 'rg-seg-main', animate);
        mkLine(el.pInner, a, b, 'rg-seg-inner', animate);
      }
      for (var d = 0; d < path.length; d++) {
        var c = document.createElementNS(NS, 'circle'), p = ctr(path[d]);
        c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', d === 0 ? 0.13 : 0.09);
        c.setAttribute('class', 'rg-dot');
        el.pDots.appendChild(c);
      }
      st.lastLen = path.length;
      placeToken(w.head(), path.length > prev && w.tele[path.length - 1]);
    }
    function placeToken(i, jump) {
      var p = ctr(i);
      el.token.style.left = p[0] * 100 / n + '%';
      el.token.style.top = p[1] * 100 / n + '%';
      if (jump && !rm) { el.token.classList.remove('is-warp'); void el.token.offsetWidth; el.token.classList.add('is-warp'); }
    }

    // ---------- HUD / state render ----------
    function plannedHaul() {
      var w = st.w, set = {}, list = [];
      w.path.forEach(function (i) {
        if (isFindCell(board.cells[i]) && !set[i]) { set[i] = 1; list.push({ i: i, via: 'trail' }); }
        if (st.powers.magnet) board.nbrs[i].forEach(function (j) {
          if (isFindCell(board.cells[j]) && !set[j] && !w.vis[j]) { set[j] = 1; list.push({ i: j, via: 'magnet' }); }
        });
      });
      return list;
    }
    function usedCount() {
      var p = st.powers; return (p.magnet ? 1 : 0) + (p.lens ? 1 : 0) + (p.double != null ? 1 : 0) + (p.lucky != null ? 1 : 0);
    }

    function render() {
      var w = st.w, head = w.head(), live = st.phase === 'plan';
      renderTileIcons();
      var haul = plannedHaul(), magnetSet = {};
      haul.forEach(function (h) { if (h.via === 'magnet') magnetSet[h.i] = 1; });
      for (var i = 0; i < board.N; i++) {
        var cl = bgCells[i].classList, fc = fgCells[i].classList, c = board.cells[i];
        var onPath = !!w.vis[i];
        cl.toggle('is-path', onPath);
        cl.toggle('is-head', live && i === head);
        cl.toggle('is-next', live && !st.target && w.check(i) === '');
        cl.toggle('is-reached', c.t === 'obj' && onPath);
        cl.toggle('is-hint', st.hint === i);
        cl.toggle('is-hintback', st.hintBack === i);
        cl.toggle('is-magnet', !!magnetSet[i]);
        fc.toggle('is-magnet', !!magnetSet[i]);
        fc.toggle('is-path', onPath);
        cl.toggle('is-target', !!st.target && isFindCell(c) && (st.target === 'double' || (c.t === 'find' || revealed(i)) && effRarity(i) !== 'rare' || st.powers.lucky === i));
        cl.toggle('is-open', c.t === 'gate' && !!w.keys);
        fc.toggle('is-open', c.t === 'gate' && !!w.keys);
        cl.toggle('is-collect', isFindCell(c) && onPath);
        fc.toggle('is-collect', isFindCell(c) && onPath);
        fc.toggle('is-dim', c.t === 'hazard');
      }
      // magnet pull direction
      haul.forEach(function (h) {
        if (h.via !== 'magnet') return;
        var src = board.nbrs[h.i].filter(function (j) { return w.vis[j]; })[0];
        if (src == null) return;
        var dx = (src % n) - (h.i % n), dy = Math.floor(src / n) - Math.floor(h.i / n);
        fgCells[h.i].style.setProperty('--px', dx * 9 + '%'); fgCells[h.i].style.setProperty('--py', dy * 9 + '%');
      });
      // steps
      var left = w.stepsLeft(), total = w.max + w.bonus;
      el.stepsNum.textContent = left;
      el.stepsLab.textContent = left === 1 ? 'step left' : 'steps left';
      var pipHtml = '';
      for (var k = 0; k < total; k++) pipHtml += '<i class="' + (k < w.steps ? 'used' : '') + '"></i>';
      el.pips.innerHTML = pipHtml;
      el.pips.style.setProperty('--cols', Math.min(total, 12));
      root.classList.toggle('is-low', left <= 2 && left > 0);
      // stars preview
      for (var s2 = 0; s2 < 3; s2++) starEls[s2].classList.toggle('is-planned', live && s2 < w.stars());
      el.trayNum.textContent = haul.length + (st.powers.double != null && haul.some(function (h) { return h.i === st.powers.double; }) ? 1 : 0);
      // buttons
      var planning = st.phase === 'plan';
      el.undo.disabled = !planning || !w.moves.length;
      el.clear.disabled = !planning || !w.moves.length;
      el.hint.disabled = !planning;
      el.commit.disabled = !planning || !w.moves.length;
      el.commit.classList.toggle('is-ready', planning && w.stars() === 3);
      renderPU();
    }

    function renderPU() {
      if (practice) return;
      var used = usedCount(), html = '';
      PU.forEach(function (p) {
        var active = p.k === 'magnet' ? st.powers.magnet : p.k === 'lens' ? st.powers.lens : st.powers[p.k] != null;
        var targeting = st.target === p.k;
        var dis = st.phase !== 'plan' || (!active && !targeting && (inv[p.k] <= 0 || used >= 3)) || (p.k === 'lens' && active);
        if (p.k === 'lens' && !board.cells.some(function (c) { return c.t === 'mystery'; })) dis = dis || !active;
        html += '<button type="button" class="rg-pu-chip rg-pu-' + p.k + (active ? ' is-on' : '') + (targeting ? ' is-targeting' : '') + '" data-pu="' + p.k + '"' +
          (dis ? ' disabled' : '') + ' aria-pressed="' + (active || targeting) + '" aria-label="' + p.name + ', ' + inv[p.k] + ' available. ' + p.tip + '">' +
          '<span class="rg-pu-ico">' + svg(p.k) + '</span><span class="rg-pu-name">' + p.name + '</span>' +
          '<span class="rg-pu-count">' + (active ? svg('check') : inv[p.k]) + '</span></button>';
      });
      el.pu.innerHTML = '<div class="rg-pu-head"><span>Power-ups boost finds, never stars</span><span class="rg-pu-used">' + used + ' of 3 used</span></div><div class="rg-pu-row">' + html + '</div>';
    }

    var baseMsg = '';
    function setMsg(text, tone, sticky) {
      el.msg.textContent = text;
      el.msg.className = 'rg-msg' + (tone ? ' is-' + tone : '');
      if (!rm && tone) { el.msg.classList.remove('is-bump'); void el.msg.offsetWidth; el.msg.classList.add('is-bump'); }
      clearTimeout(st.msgT);
      if (!sticky) st.msgT = later(function () { statusMsg(); }, 2600);
    }
    function statusMsg() {
      var w = st.w, s = w.stars();
      if (st.phase !== 'plan') return;
      var txt;
      if (st.target === 'double') txt = 'Tap a find to make it pay double.';
      else if (st.target === 'lucky') txt = 'Tap a find to raise its rarity.';
      else if (!w.moves.length) txt = 'Draw a trail from your ' + T.start + ' to all 3 ' + T.objs + '.';
      else if (s === 3) txt = 'All 3 ' + T.objs + ' reached! Grab more finds or commit.';
      else if (w.stepsLeft() <= 0) txt = 'All steps used. Undo to try another way, or commit.';
      else if (!w.canMove()) txt = 'This spot is a dead end. Undo to try another way.';
      else txt = s + ' of 3 ' + T.objs + ' · ' + w.stepsLeft() + (w.stepsLeft() === 1 ? ' step' : ' steps') + ' left';
      el.msg.textContent = txt; el.msg.className = 'rg-msg';
    }
    function announce(t) { el.sr.textContent = ''; later(function () { el.sr.textContent = t; }, 30); }
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function wait(ms) { return new Promise(function (res) { if (st.skipping || ms <= 0) return res(); later(res, ms); }); }

    // ---------- feedback ----------
    function pop(i, cls) {
      if (rm) return;
      var t = bgCells[i].firstChild, f = fgCells[i];
      [t, f].forEach(function (x) { x.classList.remove(cls || 'is-pop'); void x.offsetWidth; x.classList.add(cls || 'is-pop'); });
    }
    function floatText(i, text, cls) {
      if (rm) return;
      var d = document.createElement('div'), p = ctr(i);
      d.className = 'rg-float ' + (cls || '');
      d.textContent = text;
      d.style.left = Math.min(Math.max(p[0] * 100 / n, 14), 86) + '%'; d.style.top = p[1] * 100 / n + '%';
      el.fx.appendChild(d);
      later(function () { d.remove(); }, 1000);
    }
    function burst(i, count) {
      if (rm) return;
      var p = ctr(i);
      for (var k = 0; k < (count || 8); k++) {
        var d = document.createElement('i');
        d.className = 'rg-spark';
        var ang = (k / (count || 8)) * Math.PI * 2 + Math.random() * 0.4, dist = 28 + Math.random() * 18;
        d.style.left = p[0] * 100 / n + '%'; d.style.top = p[1] * 100 / n + '%';
        d.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); d.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
        d.style.setProperty('--hue', k % 3);
        el.fx.appendChild(d);
        (function (x) { later(function () { x.remove(); }, 750); })(d);
      }
    }

    // ---------- moves ----------
    function doStep(t, quiet) {
      var w = st.w, why = w.check(t);
      if (why) { if (!quiet) reject(t, why); return false; }
      var before = w.stars(), c = board.cells[t];
      w.step(t);
      st.hint = null; st.hintBack = null;
      render(); renderPath();
      pop(t);
      sound.step(w.moves.length);
      buzz(8);
      var parts = [];
      if (c.t === 'obj') {
        burst(t, 10); sound.chord(523); buzz([12, 40, 12]);
        floatText(t, w.stars() === 3 ? 'All 3!' : w.stars() + ' of 3', 'is-star');
        parts.push(cap(T.obj) + ' reached, ' + w.stars() + ' of 3');
        if (w.stars() === 3 && before < 3) setMsg('All 3 ' + T.objs + ' reached! Grab more finds or commit.', 'good', true);
      } else if (c.t === 'boost') {
        floatText(t, '+2 steps', 'is-boost'); sound.chord(440); parts.push('Plus 2 steps');
      } else if (c.t === 'key') {
        floatText(t, 'Key!', 'is-boost'); sound.chord(587); parts.push('Key collected. Gates open');
        later(function () { board.cells.forEach(function (cc, j) { if (cc.t === 'gate') pop(j, 'is-unlock'); }); }, 120);
      } else if (isFindCell(c)) {
        if (c.t === 'find' || revealed(t)) floatText(t, cap(effRarity(t)), 'is-find rg-fr-' + effRarity(t));
        else floatText(t, '?', 'is-find');
        parts.push(cellName(t));
      } else if (c.t === 'portal' && w.tele[w.path.length - 1]) {
        parts.push('Through the ' + T.portal.toLowerCase());
        later(function () { pop(w.head()); }, 160);
      }
      parts.push(w.stepsLeft() + ' steps left');
      announce(parts.join('. ') + '.');
      if (c.t !== 'obj' || w.stars() < 3) statusMsg();
      coachEvent('step');
      return true;
    }
    function reject(t, why) {
      var c = board.cells[t], txt;
      if (c.t === 'hazard') why = 'hazard';
      else if (c.t === 'gate' && !st.w.keys && why === 'far') why = 'gate';
      if (why === 'hazard') txt = T.hazard[c.hv || 0];
      else if (why === 'gate') txt = 'Locked. Find the key first.';
      else if (why === 'nosteps') txt = 'All steps used. Undo to try another way, or commit.';
      else if (why === 'visited') txt = 'Your trail already goes here. Tap it to back up.';
      else txt = 'Pick a glowing tile next to your trail.';
      setMsg(txt, 'soft');
      if (!rm) { var x = bgCells[t].firstChild; x.classList.remove('is-shake'); void x.offsetWidth; x.classList.add('is-shake'); }
      sound.bump(); buzz(15);
      announce(txt);
    }
    function undo(quiet) {
      if (!st.w.undo()) return false;
      st.hint = null; st.hintBack = null;
      render(); renderPath();
      if (!quiet) { sound.back(); buzz(5); statusMsg(); announce('Back one step. ' + st.w.stepsLeft() + ' steps left.'); }
      return true;
    }
    function truncateTo(i) {
      var w = st.w, p = w.path.lastIndexOf(i);
      if (p < 0) return;
      if (w.tele[p + 1]) p++;
      var changed = false;
      while (w.path.length - 1 > p && w.undo()) changed = true;
      if (changed) { st.hint = null; st.hintBack = null; render(); renderPath(); sound.back(); statusMsg(); announce('Trail shortened. ' + w.stepsLeft() + ' steps left.'); }
    }
    function prevCell() {
      var w = st.w, L = w.path.length;
      if (L < 2) return -1;
      return w.tele[L - 1] ? (L >= 3 ? w.path[L - 3] : -1) : w.path[L - 2];
    }

    // ---------- pointer input ----------
    var drag = null;
    function cellAt(ev) {
      var r = el.board.getBoundingClientRect();
      var x = ev.clientX - r.left, y = ev.clientY - r.top;
      if (x < 0 || y < 0 || x >= r.width || y >= r.height) return -1;
      var c = Math.floor(x / (r.width / n)), rr = Math.floor(y / (r.height / n));
      // forgiving drag: require being nearer the cell center than the edge
      return rr * n + c;
    }
    function onDown(ev) {
      if (st.phase === 'commit') { st.skipping = true; return; }
      if (st.phase !== 'plan') return;
      var i = cellAt(ev); if (i < 0) return;
      ev.preventDefault();
      if (st.target) { applyTarget(i); return; }
      var w = st.w;
      if (w.vis[i]) {
        if (i !== w.head()) truncateTo(i);
        drag = { last: i };
      } else if (doStep(i)) {
        drag = { last: i };
      } else drag = null;
      if (drag) { try { el.board.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } }
    }
    function onMove(ev) {
      if (!drag || st.phase !== 'plan') return;
      var i = cellAt(ev);
      if (i < 0 || i === drag.last) return;
      var r = el.board.getBoundingClientRect(), cw = r.width / n;
      var cx = (i % n + 0.5) * cw, cy = (Math.floor(i / n) + 0.5) * cw;
      var dx = ev.clientX - r.left - cx, dy = ev.clientY - r.top - cy;
      if (dx * dx + dy * dy > cw * cw * 0.16) return; // must be within ~40% of the center
      drag.last = i;
      var w = st.w;
      if (i === w.head()) return;
      if (i === prevCell()) { undo(); return; }
      if (w.check(i) === '') doStep(i);
    }
    function onUp() { drag = null; }
    el.board.addEventListener('pointerdown', onDown);
    el.board.addEventListener('pointermove', onMove);
    el.board.addEventListener('pointerup', onUp);
    el.board.addEventListener('pointercancel', onUp);

    function onKey(ev) {
      if (st.phase !== 'plan') return;
      var w = st.w, h = w.head(), t = -1;
      if (ev.key === 'ArrowUp' && h >= n) t = h - n;
      else if (ev.key === 'ArrowDown' && h < board.N - n) t = h + n;
      else if (ev.key === 'ArrowLeft' && h % n > 0) t = h - 1;
      else if (ev.key === 'ArrowRight' && h % n < n - 1) t = h + 1;
      else if (ev.key === 'Backspace' || ev.key === 'Delete') { ev.preventDefault(); undo(); return; }
      else return;
      ev.preventDefault();
      if (t === prevCell()) undo(); else doStep(t);
    }
    el.board.addEventListener('keydown', onKey);

    function onSkip(ev) {
      if (st.phase === 'commit' && !ev.target.closest('.rg-board')) st.skipping = true;
    }
    root.addEventListener('pointerdown', onSkip);

    // ---------- power-ups ----------
    el.pu.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-pu]'); if (!b || b.disabled) return;
      var k = b.getAttribute('data-pu');
      if (k === 'magnet') {
        st.powers.magnet = !st.powers.magnet; st.target = null;
        if (st.powers.magnet) { setMsg('Magnet on. Finds next to your trail get pulled in.', 'good'); sound.chord(660); buzz(10); }
      } else if (k === 'lens') {
        if (st.powers.lens) return;
        st.powers.lens = true; st.target = null;
        render(); flipMysteries();
        setMsg('Lens on. Every mystery tile is showing its find.', 'good');
        sound.chord(784); buzz(10);
        return;
      } else {
        if (st.powers[k] != null) { st.powers[k] = null; st.target = null; setMsg(k === 'double' ? 'Double put back.' : 'Lucky put back.', ''); }
        else st.target = st.target === k ? null : k;
      }
      render(); if (st.target) statusMsg();
    });
    function flipMysteries() {
      var k = 0;
      board.cells.forEach(function (c, i) {
        if (c.t !== 'mystery') return;
        if (rm) return;
        (function (j, d) { later(function () { pop(j, 'is-flip'); burst(j, 6); }, d); })(i, k++ * 110);
      });
    }
    function applyTarget(i) {
      var c = board.cells[i], k = st.target;
      if (!isFindCell(c)) { setMsg('Pick a find tile.', 'soft'); return; }
      if (k === 'lucky') {
        if (c.t === 'mystery' && !revealed(i)) { setMsg('Lucky needs a find you can see. Try Lens first.', 'soft'); return; }
        if (c.rarity === 'rare') { setMsg('That one is already rare!', 'soft'); return; }
      }
      st.powers[k] = i; st.target = null;
      render();
      if (k === 'double') { pop(i, 'is-pop'); floatText(i, 'x2', 'is-boost'); setMsg('Double set. Collect it to get two.', 'good'); }
      else { pop(i, 'is-shimmer'); burst(i, 8); floatText(i, cap(effRarity(i)) + '!', 'is-find rg-fr-' + effRarity(i)); setMsg('Lucky! Now ' + effRarity(i) + ': ' + findName(i) + '.', 'good'); }
      sound.chord(698); buzz([8, 30, 8]);
      if (board.cells[i] && !st.w.vis[i]) { /* not yet collected: no-op */ }
    }

    // ---------- buttons ----------
    el.undo.addEventListener('click', function () { undo(); coachEvent('undo'); });
    el.clear.addEventListener('click', function () {
      var any = false; while (st.w.undo()) any = true;
      if (any) { render(); renderPath(); sound.back(); statusMsg(); announce('Trail cleared.'); }
    });
    el.hint.addEventListener('click', showHint);
    el.commit.addEventListener('click', function () {
      if (st.phase !== 'plan' || !st.w.moves.length) return;
      st.target = null;
      if (st.w.stars() < 3) confirmCommit(); else runCommit();
    });
    el.sound.addEventListener('click', function () {
      sound.on = !sound.on;
      el.sound.setAttribute('aria-pressed', sound.on);
      el.sound.setAttribute('aria-label', sound.on ? 'Sound on' : 'Sound off');
      el.sound.innerHTML = svg(sound.on ? 'soundOn' : 'soundOff');
      if (sound.on) { sound.ensure(); if (sound.ctx && sound.ctx.resume) sound.ctx.resume(); sound.chord(523); }
    });
    el.help.addEventListener('click', showHelp);

    function showHint() {
      var w = st.w;
      st.hint = null; st.hintBack = null;
      if (w.stars() === 3) { setMsg('All 3 ' + T.objs + ' reached! Grab more finds or commit.', 'good'); render(); return; }
      var r = search(board, { moves: w.moves, budget: 120000, maxSol: 1 });
      if (r.sols.length) {
        st.hint = r.sols[0][w.moves.length];
        setMsg('Try the glowing tile next.', 'good');
      } else {
        for (var k = w.moves.length - 1; k >= 0; k--) {
          var r2 = search(board, { moves: w.moves.slice(0, k), budget: 60000, maxSol: 1 });
          if (r2.sols.length) {
            var tmp = new Walker(board); for (var q = 0; q < k; q++) tmp.step(w.moves[q]);
            st.hintBack = tmp.head();
            break;
          }
        }
        setMsg('To reach all 3, back up to the glowing tile.', 'good', true);
      }
      render(); sound.tone(880, 0.1); buzz(6);
      announce(el.msg.textContent);
    }

    // ---------- sheets ----------
    function openSheet(html, cls) {
      el.sheet.className = 'rg-sheet ' + (cls || '');
      el.sheet.innerHTML = html;
      el.sheet.hidden = false; el.scrim.hidden = false;
      void el.sheet.offsetWidth;
      root.classList.add('sheet-open');
      var f = el.sheet.querySelector('[data-autofocus]') || el.sheet.querySelector('button');
      if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    function closeSheet() {
      root.classList.remove('sheet-open');
      el.sheet.hidden = true; el.scrim.hidden = true;
    }
    el.sheet.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return;
      var a = b.getAttribute('data-act');
      if (a === 'keep') { closeSheet(); }
      else if (a === 'commit') { closeSheet(); runCommit(); }
      else if (a === 'close-help') { closeSheet(); }
      else if (a === 'start') { closeSheet(); startPlanning(); }
      else if (a === 'copy') copyShare(b);
      else if (a === 'done') { closeSheet(); root.classList.add('is-finished'); if (typeof opts.onDone === 'function') opts.onDone(); }
      else if (a === 'show-results') showResults();
    });

    function confirmCommit() {
      var w = st.w, left = w.stepsLeft();
      openSheet(
        '<div class="rg-sheet-grab"></div><h3 class="rg-sheet-h">Commit this trail?</h3>' +
        '<p class="rg-sheet-p">You reach <b>' + w.stars() + ' of 3</b> ' + T.objs + (left > 0 && w.canMove() ? ' and have <b>' + left + '</b> ' + (left === 1 ? 'step' : 'steps') + ' left.' : '.') + ' You can commit once.</p>' +
        '<div class="rg-sheet-actions"><button type="button" class="rg-btn" data-act="keep" data-autofocus>Keep planning</button>' +
        '<button type="button" class="rg-btn rg-primary" data-act="commit">Commit trail</button></div>', 'is-small');
    }

    function legendRow(icon, cls, name, text) {
      return '<li><span class="rg-leg-tile ' + cls + '">' + icon + '</span><span><b>' + name + '</b> ' + text + '</span></li>';
    }
    function showHelp() {
      var rows = legendRow(svg(TI.start), 'rg-t-start', cap(T.start), 'Your trail starts here.') +
        legendRow(svg(TI.obj), 'rg-t-obj', cap(T.objs), 'Reach all 3 for 3 stars.') +
        legendRow(svg(TI.find.uncommon), 'rg-t-find rg-r-uncommon', 'Finds', 'Bonus treasures. Dots show rarity: 1, 2 or 3.') +
        legendRow(svg(TI.hz[0]), 'rg-t-hazard', T.hazardName.join(' and '), 'Block the way.') +
        legendRow(svg(TI.boost) + '<span class="rg-plus">+2</span>', 'rg-t-boost', T.boost, 'Gives 2 extra steps.') +
        legendRow(svg(TI.portal), 'rg-t-portal', T.portal + 's', 'Step in, pop out at the twin.') +
        legendRow(svg('mystery'), 'rg-t-mystery', 'Mystery', 'Hides a find. Lens shows it.') +
        legendRow(svg('key'), 'rg-t-key', 'Key and gate', 'Pick up the key and every gate opens.');
      openSheet('<div class="rg-sheet-grab"></div><h3 class="rg-sheet-h">How to play</h3>' +
        '<p class="rg-sheet-p">Tap or drag from your ' + T.start + ' to draw a trail. Each tile is one step. Tap any earlier tile to back up. Nothing counts until you commit.</p>' +
        '<ul class="rg-legend">' + rows + '</ul>' +
        '<div class="rg-sheet-actions"><button type="button" class="rg-btn rg-primary" data-act="close-help" data-autofocus>Got it</button></div>');
    }

    // ---------- intro (pre-run screen) ----------
    function showIntro() {
      var intro = board.crafted ? board.crafted.intro.replace('{objs}', T.objs).replace('{obj}', T.obj).replace('{boost}', T.boost + 's').replace('{portal}', T.portal.toLowerCase()) : (practice ? 'A small practice board. No finds to keep, just the fun.' :
        { stroll: 'Everything is in view. Plenty of steps.', trek: 'Mystery tiles and tunnels. Steps are tighter.', summit: 'Keys, gates and tunnels. Every step counts.' }[shownDiff]);
      var counts = { find: 0, mystery: 0 };
      board.cells.forEach(function (c) { if (c.t in counts) counts[c.t]++; });
      var chips = PU.filter(function (p) { return inv[p.k] > 0; }).map(function (p) {
        return '<span class="rg-intro-pu rg-pu-' + p.k + '">' + svg(p.k) + '<b>' + inv[p.k] + '</b> ' + p.name + '</span>';
      }).join('');
      var puBlock = practice ? '' :
        '<div class="rg-intro-tray">' +
          (opts.fuelLabel ? '<div class="rg-fuel">' + esc(opts.fuelLabel) + '</div>' : '') +
          (chips ? '<div class="rg-intro-pus">' + chips + '</div><div class="rg-intro-note">Use up to 3. They add to your finds, never your stars.</div>'
                 : '<div class="rg-intro-note">No power-ups today. Every board can still reach 3 stars.</div>') +
        '</div>';
      openSheet('<div class="rg-intro-badge">' + svg(TI.obj) + '</div>' +
        '<div class="rg-kicker">' + esc(puzzleLabel) + ' &middot; ' + DIFF_LABEL[shownDiff] + '</div>' +
        '<h3 class="rg-sheet-h rg-intro-h">' + esc(titleText) + '</h3>' +
        '<p class="rg-sheet-p">' + esc(intro) + '</p>' +
        '<div class="rg-intro-facts"><span><b>' + board.stepsMax + '</b> steps</span><span><b>3</b> ' + T.objs + '</span><span><b>' + (counts.find + counts.mystery) + '</b> finds</span></div>' +
        puBlock +
        '<div class="rg-sheet-actions"><button type="button" class="rg-btn rg-primary rg-big" data-act="start" data-autofocus>Let’s go</button></div>', 'is-intro');
    }
    function startPlanning() {
      st.phase = 'plan'; root.setAttribute('data-phase', 'plan');
      render(); renderPath(); statusMsg();
      if (opts.tutorial || practice) startCoach();
      try { el.board.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }

    // ---------- coach marks ----------
    var coach = null;
    function coachSteps() {
      var list = [
        { sel: function () { return [bgCells[board.start]]; }, text: 'This is your ' + T.start + '. Your trail starts here.' },
        { sel: function () { return bgCells.filter(function (x, j) { return st.w.check(j) === ''; }); }, text: 'Tap a glowing tile next to it to take a step. You can drag, too.', on: 'step' },
        { sel: function () { return board.objectives.map(function (j) { return bgCells[j]; }); }, text: 'Reach all 3 ' + T.objs + ' to earn 3 stars.' },
        { sel: function () { return [root.querySelector('.rg-steps')]; }, text: 'Every tile costs one step. Plan a trail that fits.' }
      ];
      if (board.cells.some(function (c) { return c.t === 'find'; }))
        list.push({ sel: function () { return bgCells.filter(function (x, j) { return board.cells[j].t === 'find'; }); }, text: 'Finds are bonus treasures. More dots means rarer.' });
      if (board.boostCount) list.push({ sel: function () { return bgCells.filter(function (x, j) { return board.cells[j].t === 'boost'; }); }, text: T.boost + ' give +2 steps when you step on them.' });
      if (board.cells.some(function (c) { return c.t === 'portal'; })) list.push({ sel: function () { return bgCells.filter(function (x, j) { return board.cells[j].t === 'portal'; }); }, text: 'Step into a ' + T.portal.toLowerCase() + ' and pop out at its twin.' });
      if (board.cells.some(function (c) { return c.t === 'key'; })) list.push({ sel: function () { return bgCells.filter(function (x, j) { return board.cells[j].t === 'key' || board.cells[j].t === 'gate'; }); }, text: 'Pick up the key and the gates open.' });
      list.push({ sel: function () { return [el.undo, el.clear]; }, text: 'Changed your mind? Undo, or tap an earlier tile on your trail.' });
      list.push({ sel: function () { return [el.hint]; }, text: 'Stuck? Hint lights up one good step.' });
      list.push({ sel: function () { return [el.commit]; }, text: 'Happy with it? Commit to walk your trail and collect your finds.' });
      return list;
    }
    function startCoach() { coach = { steps: coachSteps(), k: 0, targets: [] }; showCoach(); }
    function clearCoachTargets() { if (coach) coach.targets.forEach(function (x) { x.classList.remove('rg-coach-target'); }); }
    function showCoach() {
      clearCoachTargets();
      if (!coach || coach.k >= coach.steps.length) { el.coach.hidden = true; coach = null; return; }
      var s2 = coach.steps[coach.k];
      coach.targets = s2.sel().filter(Boolean);
      coach.targets.forEach(function (x) { x.classList.add('rg-coach-target'); });
      var last = coach.k === coach.steps.length - 1;
      el.coach.innerHTML = '<div class="rg-coach-count">' + (coach.k + 1) + ' of ' + coach.steps.length + '</div>' +
        '<p>' + esc(s2.text) + '</p><div class="rg-coach-actions">' +
        (last ? '' : '<button type="button" class="rg-link" data-c="skip">Skip tips</button>') +
        '<button type="button" class="rg-btn rg-primary rg-coach-next" data-c="next">' + (last ? 'Got it' : (s2.on ? 'Next' : 'Next')) + '</button></div>';
      el.coach.hidden = false;
      announce(s2.text);
    }
    el.coach.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-c]'); if (!b || !coach) return;
      if (b.getAttribute('data-c') === 'skip') coach.k = coach.steps.length; else coach.k++;
      showCoach();
    });
    function coachEvent(kind) {
      if (!coach) return;
      var s2 = coach.steps[coach.k];
      if (s2 && s2.on === kind) { coach.k++; showCoach(); }
      else if (s2) { clearCoachTargets(); coach.targets = s2.sel().filter(Boolean); coach.targets.forEach(function (x) { x.classList.add('rg-coach-target'); }); }
    }

    // ---------- commit sequence ----------
    function flyToTray(i, r, doubled) {
      if (rm || st.skipping) return;
      var rr = root.getBoundingClientRect(), a = fgCells[i].getBoundingClientRect(), b = el.tray.getBoundingClientRect();
      var copies = doubled ? 2 : 1;
      for (var k = 0; k < copies; k++) {
        var d = document.createElement('div');
        d.className = 'rg-flyer rg-r-' + r;
        d.innerHTML = artHtml(r, board.cells[i].item);
        d.style.left = (a.left - rr.left + a.width * 0.2) + 'px';
        d.style.top = (a.top - rr.top + a.height * 0.2) + 'px';
        d.style.width = a.width * 0.6 + 'px'; d.style.height = a.height * 0.6 + 'px';
        el.fly.appendChild(d);
        var dx = b.left - a.left + 4, dy = b.top - a.top - 4;
        if (d.animate) {
          var an = d.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: 'translate(' + dx * 0.45 + 'px,' + (dy * 0.45 - 60) + 'px) scale(1.25)', opacity: 1, offset: 0.45 },
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.45)', opacity: 0.9 }
          ], { duration: 640, delay: k * 120, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
          (function (x) { an.onfinish = function () { x.remove(); el.tray.classList.remove('is-bump'); void el.tray.offsetWidth; el.tray.classList.add('is-bump'); }; })(d);
        } else later(function () { d.remove(); }, 700);
      }
    }
    function stampStar(k) {
      var s3 = starEls[k];
      s3.classList.add('is-stamped');
      if (!rm) { var r = root.getBoundingClientRect(), b = s3.getBoundingClientRect(); sparkAt(b.left - r.left + b.width / 2, b.top - r.top + b.height / 2); }
    }
    function sparkAt(x, y) {
      for (var k = 0; k < 10; k++) {
        var d = document.createElement('i');
        d.className = 'rg-spark';
        var ang = (k / 10) * Math.PI * 2, dist = 26 + (k % 3) * 8;
        d.style.left = x + 'px'; d.style.top = y + 'px';
        d.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); d.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
        d.style.setProperty('--hue', k % 3);
        el.fly.appendChild(d);
        (function (z) { later(function () { z.remove(); }, 750); })(d);
      }
    }

    function runCommit() {
      if (st.phase !== 'plan') return;
      st.phase = 'commit';
      if (coach) { coach.k = coach.steps.length; showCoach(); }
      st.hint = null; st.hintBack = null; st.revealSet = {};
      root.classList.add('is-committing');
      for (var s4 = 0; s4 < 3; s4++) starEls[s4].classList.remove('is-planned');
      render();
      el.skip.hidden = rm;
      var w = st.w, path = w.path, collected = {}, haul = [], starK = 0, trayCount = 0;
      el.trayNum.textContent = '0';
      // reset path drawing so the trail traces itself
      st.lastLen = 1;
      [el.pTele, el.pEdge, el.pMain, el.pInner, el.pDots].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); });
      placeToken(path[0]);
      root.classList.add('is-tracing');
      sound.chord(392);
      buzz(10);
      var k = 0;
      function addFind(i, via) {
        if (collected[i]) return;
        collected[i] = 1;
        var r = effRarity(i), doubled = st.powers.double === i;
        if (board.cells[i].t === 'mystery') { st.revealSet[i] = 1; pop(i, 'is-flip'); }
        haul.push({ i: i, rarity: r, item: board.cells[i].item, via: via, doubled: doubled, lucky: st.powers.lucky === i });
        trayCount += doubled ? 2 : 1;
        el.trayNum.textContent = trayCount;
        bgCells[i].classList.add('is-taken'); fgCells[i].classList.add('is-taken');
        flyToTray(i, r, doubled);
        sound.find(r);
      }
      function stepOnce() {
        if (destroyed) return;
        if (k >= path.length) { return finishCommit(); }
        var i = path[k], c = board.cells[i];
        // draw segment
        if (k > 0) {
          var a = path[k - 1], an = !rm && !st.skipping;
          if (w.tele[k]) mkLine(el.pTele, a, i, 'rg-seg-tele', an);
          else { mkLine(el.pEdge, a, i, 'rg-seg-edge', an); mkLine(el.pMain, a, i, 'rg-seg-main', an); mkLine(el.pInner, a, i, 'rg-seg-inner', an); }
        }
        var dot = document.createElementNS(NS, 'circle'), p = ctr(i);
        dot.setAttribute('cx', p[0]); dot.setAttribute('cy', p[1]); dot.setAttribute('r', k === 0 ? 0.13 : 0.09); dot.setAttribute('class', 'rg-dot');
        el.pDots.appendChild(dot);
        placeToken(i, w.tele[k]);
        if (k > 0 && !st.skipping) { pop(i); sound.step(k); }
        bgCells[i].classList.add('is-traced');
        if (isFindCell(c)) addFind(i, 'trail');
        if (st.powers.magnet) board.nbrs[i].forEach(function (j) { if (isFindCell(board.cells[j]) && !w.vis[j]) addFind(j, 'magnet'); });
        var delay = 150;
        if (c.t === 'obj') {
          stampStar(starK++);
          if (!st.skipping) { burst(i, 12); sound.chord(523 * Math.pow(2, (starK - 1) * 4 / 12)); buzz([15, 40, 15]); }
          delay = 420;
        }
        k++;
        if (st.skipping || rm) { stepOnce(); return; }
        later(stepOnce, delay);
      }
      later(stepOnce, rm ? 0 : 250);

      function finishCommit() {
        root.classList.remove('is-tracing');
        el.skip.hidden = true;
        st.phase = 'done';
        render();
        var stars = w.stars();
        var finds = [];
        haul.forEach(function (h) {
          var f = { id: 'find.' + h.rarity + '.' + h.item, rarity: h.rarity };
          finds.push(f);
          if (h.doubled) finds.push({ id: f.id, rarity: f.rarity });
        });
        var consolation = false;
        if (practice) finds = [];
        else if (stars === 0) { finds.push({ id: 'find.common.trail-gift', rarity: 'common' }); consolation = true; }
        var used = { magnet: st.powers.magnet ? 1 : 0, lens: st.powers.lens ? 1 : 0, double: st.powers.double != null ? 1 : 0, lucky: st.powers.lucky != null ? 1 : 0 };
        PU.forEach(function (p) { inv[p.k] -= used[p.k]; });
        var grid = routeGrid(), share = shareText(stars, grid);
        st.result = {
          stars: stars, finds: finds, stepsUsed: w.steps, stepsMax: w.max + w.bonus,
          powerUpsUsed: used, shareText: share, routeGrid: grid
        };
        st.haul = haul; st.consolation = consolation;
        sound.chord(stars === 3 ? 659 : 523); buzz(stars === 3 ? [20, 50, 20, 50, 40] : [20, 40, 20]);
        later(showResults, rm ? 50 : (st.skipping ? 150 : 450));
        try { onFinish(st.result); } catch (e) { if (global.console) console.error(e); }
      }
    }

    function routeGrid() {
      var w = st.w, rows = [];
      for (var r = 0; r < n; r++) {
        var row = '';
        for (var c = 0; c < n; c++) {
          var i = r * n + c, cell = board.cells[i];
          if (i === board.start) row += '🟦';
          else if (w.vis[i] && cell.t === 'obj') row += '⭐';
          else if (w.vis[i]) row += T.square;
          else row += '⬜';
        }
        rows.push(row);
      }
      return rows.join('\n');
    }
    function shareText(stars, grid) {
      var head = 'The Daily Run ' + (practice ? 'Practice' : (board.crafted ? 'Board ' + board.puzzleNo : '#' + board.puzzleNo)) + ' · ' + DIFF_LABEL[shownDiff];
      var st3 = '', k;
      for (k = 0; k < 3; k++) st3 += k < stars ? '⭐' : '☆';
      return head + '\n' + st3 + ' ' + stars + '/3\n' + grid;
    }

    function headline(stars) {
      if (practice) return ['Practice complete!', 'Practice boards are just for fun. Your Daily Run keeps its finds.'];
      if (stars === 3) return ['Perfect route! All 3 reached', 'That trail was a beauty.'];
      if (stars === 2) return ['Nice route! 2 of 3 reached', 'Great trail. Tomorrow brings a new board.'];
      if (stars === 1) return ['Good outing! 1 of 3 reached', 'Every trail teaches the next one.'];
      return ['Thanks for the walk!', 'Here is a little something for the trail.'];
    }

    function showResults() {
      var res = st.result, hl = headline(res.stars), haulHtml = '';
      (st.haul || []).forEach(function (h) {
        var nm = itemLabel(h.rarity, h.item);
        haulHtml += '<li class="rg-haul-item rg-r-' + h.rarity + '"><span class="rg-haul-ico">' + artHtml(h.rarity, h.item) + '</span>' +
          '<span class="rg-haul-txt"><b>' + esc(nm) + '</b><small>' + cap(h.rarity) + (h.via === 'magnet' ? ' · Magnet' : '') + (h.lucky ? ' · Lucky' : '') + '</small></span>' +
          (h.doubled ? '<span class="rg-haul-x2">x2</span>' : '') + '</li>';
      });
      if (st.consolation) {
        var gift = itemArt('common', 'trail-gift');
        haulHtml += '<li class="rg-haul-item rg-r-common"><span class="rg-haul-ico">' + (gift ? '<span class="rg-item">' + gift.html + '</span>' : svg(TI.find.common)) + '</span><span class="rg-haul-txt"><b>' + esc(gift && gift.name ? gift.name : 'Trail gift') + '</b><small>Common \u00b7 Trail gift</small></span></li>';
      }
      var stars = '';
      for (var k = 0; k < 3; k++) stars += '<span class="rg-rstar' + (k < res.stars ? ' is-on' : '') + '" style="--d:' + k * 140 + 'ms">' + svg('star') + '</span>';
      var sq = '';
      res.routeGrid.split('\n').forEach(function (row) {
        sq += '<div class="rg-sq-row">';
        Array.from(row).forEach(function (ch) {
          var cls = ch === '🟦' ? 'start' : ch === '⭐' ? 'obj' : ch === '⬜' ? 'off' : 'on';
          sq += '<i class="rg-sq rg-sq-' + cls + '"></i>';
        });
        sq += '</div>';
      });
      var haulBlock = practice ? '' : '<div class="rg-res-sec"><div class="rg-res-lab">Your haul</div>' +
        (haulHtml ? '<ul class="rg-haul">' + haulHtml + '</ul>' : '<p class="rg-sheet-p">No finds on this trail. Your stars still count!</p>') + '</div>';
      var badge = '';
      if (res.stars === 3 && st.w.steps <= board.par) badge = '<div class="rg-badge-best">Shortest possible route!</div>';
      else if (res.stars === 3) badge = '<div class="rg-badge-soft">Shortest route on this board: ' + board.par + ' steps</div>';
      var next = '';
      if (!practice) {
        var nb = board.crafted ? CRAFTED[board.puzzleNo] : null;
        next = '<div class="rg-next">' + (nb ? 'Up next: <b>Board ' + (board.puzzleNo + 1) + ' \u00b7 ' + esc(nb.title) + '</b>' : (board.crafted ? 'You finished the first week. <b>Daily boards start tomorrow.</b>' : 'A fresh board arrives <b>tomorrow</b>.')) + '</div>';
      }
      openSheet('<div class="rg-sheet-grab"></div>' +
        '<div class="rg-res-stars">' + stars + '</div>' + badge +
        '<h3 class="rg-sheet-h rg-res-h">' + esc(hl[0]) + '</h3>' +
        '<p class="rg-sheet-p rg-res-sub">' + esc(hl[1]) + ' ' + res.stepsUsed + ' of ' + res.stepsMax + ' steps used.</p>' +
        haulBlock +
        '<div class="rg-res-sec"><div class="rg-res-lab">Share</div>' +
          '<div class="rg-share"><div class="rg-share-meta"><b>The Daily Run</b><span>' + esc(practice ? 'Practice' : (board.crafted ? 'Board ' + board.puzzleNo : '#' + board.puzzleNo)) + ' · ' + DIFF_LABEL[shownDiff] + '</span>' +
          '<span class="rg-share-stars" aria-label="' + res.stars + ' of 3 stars">' + [0, 1, 2].map(function (k) { return '<i class="' + (k < res.stars ? 'is-on' : '') + '">' + svg('star') + '</i>'; }).join('') + '<span>' + res.stars + '/3</span></span></div><div class="rg-sq-grid" aria-label="Route shape">' + sq + '</div></div>' +
        '</div>' +
        next +
        '<div class="rg-sheet-actions"><button type="button" class="rg-btn" data-act="copy">' + svg('copy') + '<span>Copy</span></button>' +
        '<button type="button" class="rg-btn rg-primary" data-act="done" data-autofocus>Done</button></div>', 'is-results');
      announce(hl[0] + '. ' + (practice ? '' : (st.haul.length + (st.consolation ? 1 : 0)) + ' finds.'));
    }

    function copyShare(btn) {
      var text = st.result.shareText;
      function ok() { btn.classList.add('is-copied'); btn.querySelector('span').textContent = 'Copied!'; buzz(8); later(function () { btn.classList.remove('is-copied'); btn.querySelector('span').textContent = 'Copy'; }, 1600); }
      function fallback() {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0'; root.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        ta.remove(); ok();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
      else fallback();
    }

    // initial paint
    render(); renderPath(); statusMsg();
    showIntro();

    return {
      destroy: function () {
        destroyed = true;
        timers.forEach(clearTimeout);
        el.board.removeEventListener('pointerdown', onDown);
        el.board.removeEventListener('pointermove', onMove);
        el.board.removeEventListener('pointerup', onUp);
        el.board.removeEventListener('pointercancel', onUp);
        el.board.removeEventListener('keydown', onKey);
        root.removeEventListener('pointerdown', onSkip);
        if (sound.ctx && sound.ctx.close) try { sound.ctx.close(); } catch (e) { /* ignore */ }
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  var api = {
    mount: mount,
    boards: CRAFTED.map(function (d) { return d.id; }),
    boardInfo: CRAFTED.map(function (d) { return { id: d.id, title: d.title, twist: d.twist, difficulty: d.diff }; }),
    // test / integration helpers (not part of the core contract)
    _engine: { generate: generate, parseMap: parseMap, search: search, evaluate: evaluate, Walker: Walker, puzzleNumber: puzzleNumber, boardSignature: boardSignature, CRAFTED: CRAFTED }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.RunGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
