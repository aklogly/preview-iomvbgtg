/* Kindling v5.5 - Field Notes (Expedition) / Firefly Pairs (Grove). Prototype module.
 * Memory pairs scored by slips (memory, not luck), then flips, then time.
 * Easy: identical pairs. Normal: identical pairs plus two look-alike pairs. Hard: kin pairs with an on-screen key.
 * Exposes window.MemoryGame. Needs arcade.js loaded first (in Node: require('./arcade.js')).
 * The engine (generate / isSlip / Session) is DOM-free and testable in Node.
 */
(function (global) {
  'use strict';
  var Arcade = global.Arcade || (typeof require === 'function' ? require('./arcade.js') : null);
  var U = Arcade._util;
  var makeRng = U.makeRng, esc = U.esc, cap = U.cap, svg = U.svg;

  var DIFF = {
    easy: { rows: 4, cols: 3, pairs: 6, kind: 'identical', glints: 2, stars: [0, 2] },
    normal: { rows: 4, cols: 4, pairs: 8, kind: 'lookalike', glints: 3, stars: [1, 3] },
    hard: { rows: 5, cols: 4, pairs: 10, kind: 'kin', glints: 4, stars: [2, 5] }
  };
  var BASE_N = 10;   // identical face icons per theme
  var KIN_N = 10;    // kin pairs per theme

  // ------------------------------------------------------------------
  // Engine
  // ------------------------------------------------------------------
  var cache = {};
  // cards: [{ idx, pairId, face, glint }]; face: 'pair.3' | 'pair.3b' | 'kin.4.a' (engine ids, theme-free)
  function generate(seed, difficulty) {
    difficulty = DIFF[difficulty] ? difficulty : 'easy';
    var key = String(seed) + '|' + difficulty;
    if (cache[key]) return cache[key];
    var cfg = DIFF[difficulty], practice = /^practice\|/.test(String(seed));
    var rng = makeRng('memory|' + seed + '|' + difficulty), faces = [], keyList = null;
    var icons = []; for (var i = 0; i < BASE_N; i++) icons.push(i);
    rng.shuffle(icons);
    if (cfg.kind === 'kin') {
      keyList = [];
      for (var k = 1; k <= KIN_N; k++) { faces.push(['kin.' + k + '.a', 'kin.' + k + '.b']); keyList.push(['kin.' + k + '.a', 'kin.' + k + '.b']); }
    } else if (cfg.kind === 'lookalike') {
      var base = icons.slice(0, cfg.pairs - 2);
      base.forEach(function (n) { faces.push(['pair.' + n, 'pair.' + n]); });
      base.slice(0, 2).forEach(function (n) { faces.push(['pair.' + n + 'b', 'pair.' + n + 'b']); });
    } else {
      icons.slice(0, cfg.pairs).forEach(function (n) { faces.push(['pair.' + n, 'pair.' + n]); });
    }
    var cards = [];
    faces.forEach(function (f, pid) { cards.push({ pairId: pid, face: f[0] }); cards.push({ pairId: pid, face: f[1] }); });
    rng.shuffle(cards);
    cards.forEach(function (c, ix) { c.idx = ix; c.glint = null; });
    if (!practice) {
      // glints: chosen per position, independent of which pair a card belongs to
      var pos = cards.map(function (c) { return c.idx; });
      for (var g = 0; g < cfg.glints; g++) {
        var j = g + rng.int(pos.length - g); var t = pos[g]; pos[g] = pos[j]; pos[j] = t;
        cards[pos[g]].glint = { rarity: U.rollRarity(rng, false), item: rng.int(4) };
      }
    }
    var b = { seed: seed, difficulty: difficulty, practice: practice, puzzleNo: Arcade.puzzleNumber(seed), rows: cfg.rows, cols: cfg.cols,
      pairs: cfg.pairs, kind: cfg.kind, cards: cards, key: keyList, stars: cfg.stars.slice() };
    cache[key] = b;
    return b;
  }
  function partnerOf(cards, a) {
    for (var i = 0; i < cards.length; i++) if (i !== a && cards[i].pairId === cards[a].pairId) return i;
    return -1;
  }
  // The slip rule: no match AND (partner(a) was seen before the turn,
  // OR b was seen before the turn while unseen cards remained). seenBefore: { idx: true } or Set.
  function isSlip(seenBefore, a, b, cards) {
    var has = function (i) { return seenBefore instanceof Set ? seenBefore.has(i) : !!seenBefore[i]; };
    if (cards[a].pairId === cards[b].pairId) return false;
    if (has(partnerOf(cards, a))) return true;
    if (has(b)) {
      for (var i = 0; i < cards.length; i++) if (i !== a && i !== b && !has(i)) return true;
    }
    return false;
  }
  function starsFor(difficulty, slips) {
    var s = (DIFF[difficulty] || DIFF.easy).stars;
    return slips <= s[0] ? 3 : slips <= s[1] ? 2 : 1;
  }
  function adjacent(b, i, j) {
    var ri = Math.floor(i / b.cols), rj = Math.floor(j / b.cols);
    return Math.abs(ri - rj) + Math.abs((i % b.cols) - (j % b.cols)) === 1;
  }

  // Session: DOM-free rules. packed = { magnet, lens, double: idx|null, lucky: idx|null } (loot only).
  function Session(board, o) {
    o = o || {};
    this.b = board; this.practice = !!board.practice;
    var pk = o.packed || {};
    this.packed = this.practice ? { magnet: false, lens: false, double: null, lucky: null } :
      { magnet: !!pk.magnet, lens: !!pk.lens, double: pk.double != null ? pk.double : null, lucky: pk.lucky != null ? pk.lucky : null };
    var N = board.cards.length;
    this.seen = {}; this.matched = new Array(N); for (var i = 0; i < N; i++) this.matched[i] = false;
    this.open = []; this.turnSeen = null;
    this.flips = 0; this.slips = 0; this.matches = 0; this.turns = 0;
    this.finds = []; this.magnetPaid = 0; this.log = []; this.done = false;
  }
  Session.prototype.pending = function () { return this.open.length === 2; };
  Session.prototype.closePending = function () { if (this.open.length === 2) { this.open = []; return true; } return false; };
  Session.prototype._pay = function (idx) {
    var c = this.b.cards[idx];
    if (this.practice || !c.glint) return null;
    var r = this.packed.lucky === idx ? U.upRarity(c.glint.rarity) : c.glint.rarity, f = { id: 'find.' + r + '.' + c.glint.item, rarity: r };
    this.finds.push(f);
    if (this.packed.double === idx) this.finds.push({ id: f.id, rarity: f.rarity });
    return { idx: idx, rarity: r, item: c.glint.item, doubled: this.packed.double === idx };
  };
  // flip(idx, ms) -> { ignored } | { first:true } | { match:bool, slip:bool, a, b, gems:[], magnet:0|1, done }
  Session.prototype.flip = function (idx, ms) {
    if (this.done || idx < 0 || idx >= this.b.cards.length || this.matched[idx] || this.open.indexOf(idx) >= 0) return { ignored: true };
    if (this.open.length === 2) this.open = [];
    this.log.push([idx, Math.max(0, Math.round(ms || 0))]);
    this.flips++;
    if (this.open.length === 0) {
      this.turnSeen = {}; for (var k in this.seen) this.turnSeen[k] = true;
      this.open.push(idx); this.seen[idx] = true;
      return { first: true, a: idx };
    }
    var a = this.open[0], b = idx, cards = this.b.cards;
    this.open.push(b); this.turns++;
    var match = cards[a].pairId === cards[b].pairId;
    var slip = !match && isSlip(this.turnSeen, a, b, cards);
    this.seen[b] = true;
    var ev = { match: match, slip: slip, a: a, b: b, gems: [], magnet: 0 };
    if (slip) this.slips++;
    if (match) {
      this.matched[a] = this.matched[b] = true; this.open = []; this.matches++;
      var g1 = this._pay(a), g2 = this._pay(b); if (g1) ev.gems.push(g1); if (g2) ev.gems.push(g2);
      if (this.packed.magnet && !this.practice && this.magnetPaid < 3) {
        var self = this, near = cards.some(function (c, j) {
          return c.glint && !self.matched[j] && (adjacent(self.b, a, j) || adjacent(self.b, b, j));
        });
        if (near) { this.finds.push({ id: 'find.common.' + ((this.b.puzzleNo + this.magnetPaid) % 4 + 4) % 4, rarity: 'common' }); this.magnetPaid++; ev.magnet = 1; }
      }
      if (this.matches === this.b.pairs) { this.done = true; ev.done = true; }
    }
    return ev;
  };
  Session.prototype.powerUpsUsed = function () {
    var p = this.packed;
    return { magnet: p.magnet ? 1 : 0, lens: p.lens ? 1 : 0, double: p.double != null ? 1 : 0, lucky: p.lucky != null ? 1 : 0 };
  };
  Session.prototype.result = function (meta) {
    meta = meta || {};
    var b = this.b, practice = this.practice, mode = practice ? 'practice' : (meta.mode === 'ranked' ? 'ranked' : 'relaxed');
    var timeMs = mode === 'ranked' ? Math.max(0, Math.round(meta.timeMs || 0)) : null;
    return {
      game: 'memory', puzzleNo: b.puzzleNo, seed: meta.seed != null ? meta.seed : b.seed,
      difficulty: practice ? 'practice' : b.difficulty, level: b.difficulty, mode: mode, stars: starsFor(b.difficulty, this.slips),
      score: { slips: this.slips, flips: this.flips, timeMs: timeMs },
      pausedMs: Math.round(meta.pausedMs || 0),
      finds: practice ? [] : this.finds.slice(),
      powerUpsUsed: practice ? { magnet: 0, lens: 0, double: 0, lucky: 0 } : this.powerUpsUsed(),
      shareText: shareText(this, meta.theme, mode === 'ranked' && meta.showTime ? timeMs : null),
      log: { flips: this.log.map(function (f) { return f.slice(); }) }
    };
  };
  function shareText(sess, theme, timeMs) {
    var b = sess.b, name = Arcade.gameName('memory', theme);
    var lines = [name + (sess.practice ? ' · Practice' : ' #' + b.puzzleNo + ' · ' + Arcade.DIFF_LABEL[b.difficulty]),
      sess.slips + (sess.slips === 1 ? ' slip' : ' slips') + ' · ' + sess.flips + ' flips'];
    if (sess.slips === 0) lines.push('Cleanest memory!');
    if (timeMs != null) lines.push('Time ' + U.fmtTime(timeMs));
    return lines.join('\n');
  }

  // ------------------------------------------------------------------
  // Art: simple 24x24 pictures. Classes a b c h; colors come from CSS vars per face.
  // ------------------------------------------------------------------
  var ART = {
    feather: '<path class="a" d="M20 2.8C11.2 3.4 6.6 9.6 6.4 18l5.4-5.6-4.5 6.9C14.8 18.8 20.6 12.4 20 2.8z"/><path class="c" d="M3.2 21.8l-.9-.9 9.6-10.3.9.9z"/>',
    compass: '<circle class="a" cx="12" cy="12" r="9.6"/><circle class="h" cx="12" cy="12" r="7"/><path class="b" d="M12 5.4 14.4 12H9.6z"/><path class="c" d="M12 18.6 9.6 12h4.8z"/>',
    lantern: '<rect class="c" x="9" y="2" width="6" height="2.6" rx="1"/><path class="a" d="M7 6h10l-1 13H8z"/><circle class="b" cx="12" cy="12.4" r="3"/><rect class="c" x="8" y="19" width="8" height="2.6" rx="1"/>',
    flame: '<path class="b" d="M12 2c3 4 7 7 7 12a7 7 0 0 1-14 0c0-3 1.6-5 3-6.4C8.4 10 9.6 11 10.6 11 10.6 7 11 4.6 12 2z"/><path class="a" d="M12 11c1.6 2 3.4 3.4 3.4 5.6a3.4 3.4 0 0 1-6.8 0c0-1.8 1.6-3.2 3.4-5.6z"/>',
    acorn: '<path class="a" d="M5 10h14c0 6-3 11-7 12-4-1-7-6-7-12z"/><path class="b" d="M3.6 10.4C4 6.6 7.6 4.6 12 4.6s8 2 8.4 5.8z"/><rect class="c" x="11" y="1.6" width="2" height="3.6" rx="1"/>',
    oak: '<rect class="c" x="10.4" y="13" width="3.2" height="9" rx="1"/><circle class="a" cx="12" cy="8.6" r="6.6"/><circle class="a" cx="6.4" cy="12" r="4.4"/><circle class="a" cx="17.6" cy="12" r="4.4"/><circle class="b" cx="9" cy="7" r="1.2"/><circle class="b" cx="15" cy="10" r="1.2"/>',
    canoe: '<path class="a" d="M1.6 12.6c3 3.6 6.4 5 10.4 5s7.4-1.4 10.4-5c-3.4 1-6.8 1.4-10.4 1.4S5 13.6 1.6 12.6z"/><path class="b" d="M5 13.4h14l-1 1.6H6z"/>',
    paddle: '<rect class="c" x="11" y="1.6" width="2" height="12" rx="1" transform="rotate(30 12 12)"/><ellipse class="a" cx="16.4" cy="18.4" rx="3" ry="5" transform="rotate(30 16.4 18.4)"/><rect class="b" x="5.4" y="1.6" width="3.6" height="2.4" rx="1" transform="rotate(30 7 3)"/>',
    map: '<path class="a" d="M2.6 5.4 8.4 3.4l7.2 2.4 5.8-2v14.8l-5.8 2-7.2-2.4-5.8 2z"/><path class="b" d="M8.4 3.4v14.8l7.2 2.4V5.8z"/><path class="s" d="M11 9.6l2.4 2.4M13.4 9.6 11 12" stroke-width="1.4"/>',
    boot: '<path class="a" d="M6 2.6h6.4v9.4l6 2.6c1.6.7 2.6 2.2 2.6 3.9V20H3.4v-5z"/><rect class="b" x="3.4" y="19.4" width="17.6" height="2.4" rx="1"/><rect class="c" x="6" y="6" width="6.4" height="1.6"/>',
    footprint: '<ellipse class="a" cx="10.6" cy="15" rx="4.2" ry="6.2"/><circle class="a" cx="8" cy="5" r="1.7"/><circle class="a" cx="11.2" cy="3.8" r="1.6"/><circle class="a" cx="14.2" cy="4.8" r="1.5"/><circle class="a" cx="16.2" cy="7.4" r="1.3"/>',
    kettle: '<path class="a" d="M5.4 10h11.2l1.2 9.6a1.6 1.6 0 0 1-1.6 1.8H5.8a1.6 1.6 0 0 1-1.6-1.8z"/><path class="c" d="M6.6 10a4.4 4.4 0 0 1 8.8 0h-1.8a2.6 2.6 0 0 0-5.2 0z"/><path class="b" d="M16.6 12.4l4-2.4.8 1.4-3.8 3.6z"/>',
    mug: '<rect class="a" x="4" y="6" width="12" height="15" rx="2.4"/><path class="b" d="M16 9h2.4a3 3 0 0 1 0 6H16v-2h2.4a1 1 0 0 0 0-2H16z"/><path class="s" d="M7 2.6c1 1 1 2 0 3M10.6 2.6c1 1 1 2 0 3" stroke-width="1.3" fill="none"/>',
    key: '<circle class="a" cx="7.4" cy="12" r="5"/><circle class="h" cx="7.4" cy="12" r="2"/><path class="a" d="M11.6 10.5H21.6v3h-1.9v3h-2.8v-3h-5.3z"/>',
    lock: '<path class="c" d="M7 11V8.2a5 5 0 0 1 10 0V11h-2.6V8.2a2.4 2.4 0 0 0-4.8 0V11z"/><rect class="a" x="4.4" y="10.4" width="15.2" height="11" rx="2.4"/><circle class="h" cx="12" cy="15.4" r="1.8"/>',
    tent: '<path class="a" d="M12 3.2 21.8 20H2.2z"/><path class="b" d="M12 10.2 15.9 20H8.1z"/>',
    egg: '<path class="a" d="M12 2.4c4 0 7 6.6 7 11.6a7 7 0 0 1-14 0C5 9 8 2.4 12 2.4z"/><ellipse class="h" cx="9.4" cy="10" rx="1.4" ry="2.4"/>',
    nest: '<path class="b" d="M2 11.6h20c0 5-4.4 8.4-10 8.4S2 16.6 2 11.6z"/><path class="s" d="M3.4 14h17.2M4.6 16.6h14.8" stroke-width="1.1"/><ellipse class="a" cx="8.6" cy="10.4" rx="2.6" ry="3"/><ellipse class="a" cx="14.6" cy="10.4" rx="2.6" ry="3"/>',
    bee: '<ellipse class="b" cx="12" cy="14" rx="6.6" ry="5.4"/><path class="c" d="M9.4 9.2h1.8v9.6H9.4zM12.8 9.2h1.8v9.6h-1.8z"/><ellipse class="h" cx="8" cy="6.4" rx="3.4" ry="2.6"/><ellipse class="h" cx="16" cy="6.4" rx="3.4" ry="2.6"/>',
    hive: '<path class="b" d="M8 3h8l3 3.6v0H5z"/><rect class="b" x="4" y="6.6" width="16" height="4" rx="2"/><rect class="b" x="3" y="10.6" width="18" height="4.4" rx="2.2"/><rect class="b" x="4" y="15" width="16" height="4.4" rx="2.2"/><circle class="c" cx="12" cy="17.4" r="1.8"/>',
    cloud: '<path class="a" d="M6.4 18.4a4.4 4.4 0 0 1-.6-8.8 6.2 6.2 0 0 1 12-1.2 4.8 4.8 0 0 1 .6 10z"/>',
    drop: '<path class="a" d="M12 2.6c4.2 5.2 7 8.8 7 12.4a7 7 0 0 1-14 0c0-3.6 2.8-7.2 7-12.4z"/><ellipse class="h" cx="9.4" cy="15" rx="1.6" ry="2.6"/>',
    clover: '<path class="c" d="M11.4 12.4h1.4L14.4 21.6h-1.4z"/><circle class="a" cx="12" cy="7" r="4"/><circle class="a" cx="7.6" cy="12.6" r="4"/><circle class="a" cx="16.4" cy="12.6" r="4"/>',
    mushroom: '<path class="a" d="M2.6 12.6C2.6 6.8 6.8 3 12 3s9.4 3.8 9.4 9.6z"/><circle class="h" cx="8" cy="8.4" r="1.6"/><circle class="h" cx="14.6" cy="6.6" r="1.3"/><path class="b" d="M9 12.6h6l.8 7.2a1.6 1.6 0 0 1-1.6 1.8H9.8a1.6 1.6 0 0 1-1.6-1.8z"/>',
    butterfly: '<path class="a" d="M12 11.4C9 4.2 2.6 3.4 2.6 7.6c0 3.8 4.2 4.6 9.4 4.6zM12 11.4c3-7.2 9.4-8 9.4-3.8 0 3.8-4.2 4.6-9.4 4.6z"/><path class="b" d="M12 12.4c-4.2 0-7.8 1.6-7.2 4.6.6 3 4.6 2.6 7.2-3.6zM12 12.4c4.2 0 7.8 1.6 7.2 4.6-.6 3-4.6 2.6-7.2-3.6z"/><rect class="c" x="11.1" y="6.6" width="1.8" height="11.4" rx=".9"/>',
    flower: '<rect class="c" x="11" y="13" width="2" height="9" rx="1"/><circle class="a" cx="12" cy="5.6" r="3.7"/><circle class="a" cx="16.6" cy="8.9" r="3.7"/><circle class="a" cx="14.8" cy="14.3" r="3.7"/><circle class="a" cx="9.2" cy="14.3" r="3.7"/><circle class="a" cx="7.4" cy="8.9" r="3.7"/><circle class="b" cx="12" cy="10.4" r="3"/>',
    snail: '<circle class="a" cx="13" cy="11" r="7"/><circle class="h" cx="13" cy="11" r="3.6"/><circle class="a" cx="13" cy="11" r="1.6"/><path class="b" d="M2 19.6c0-1.4 1-2.2 2.4-2.2H20c1 0 2 .8 2 2.2z"/><rect class="b" x="3" y="12" width="2" height="6" rx="1"/>',
    sprout: '<path class="c" d="M10.9 21.6v-9.4h2.2v9.4z"/><path class="a" d="M12 13.4C12 8.2 7.9 6.2 3.4 7c0 4.4 3.4 7.4 8.6 6.4z"/><path class="b" d="M12 11.4c0-5.4 4.2-8.2 8.6-7.4 0 4.6-3.6 8-8.6 7.4z"/>',
    seed: '<ellipse class="a" cx="12" cy="13" rx="5.4" ry="8" transform="rotate(25 12 13)"/><path class="sh" stroke-width="1.2" d="M10 8c1.4 2 2 5 1.6 8"/>',
    frog: '<ellipse class="a" cx="12" cy="15" rx="9" ry="6.4"/><circle class="a" cx="7.4" cy="7.6" r="3.4"/><circle class="a" cx="16.6" cy="7.6" r="3.4"/><circle class="h" cx="7.4" cy="7.6" r="1.8"/><circle class="h" cx="16.6" cy="7.6" r="1.8"/><circle class="c" cx="7.4" cy="7.6" r=".9"/><circle class="c" cx="16.6" cy="7.6" r=".9"/><path class="s" d="M8 16c2.4 1.6 5.6 1.6 8 0" stroke-width="1.3" fill="none"/>',
    tadpole: '<circle class="a" cx="8" cy="10" r="5.4"/><path class="a" d="M12 12c3 1 5 3 9.6 8.4-5-2-7.6-3-11-5z"/><circle class="h" cx="6.4" cy="8.6" r="1.4"/>',
    caterpillar: '<circle class="a" cx="4.6" cy="15" r="3"/><circle class="b" cx="9" cy="14" r="3"/><circle class="a" cx="13.4" cy="13.6" r="3"/><circle class="b" cx="17.6" cy="12.4" r="3.2"/><circle class="c" cx="18.6" cy="11.4" r=".9"/><path class="s" d="M17.6 9.4l-.8-3M19.4 9.6l1.4-2.8" stroke-width="1.2"/>',
    bird: '<path class="a" d="M4 13a8 7 0 0 1 14-4.6L22 9l-3.4 2A8 7 0 0 1 4 13z"/><path class="b" d="M7 12c2-2 5-2.4 7.6-1.4-1.6 3-5 4-7.6 1.4z"/><circle class="c" cx="16" cy="9" r="1"/><path class="s" d="M9 19l1.4-3M12 19.4l.4-3" stroke-width="1.3"/>',
    spider: '<circle class="a" cx="12" cy="13.6" r="4.6"/><circle class="a" cx="12" cy="7.6" r="2.8"/><path class="s" d="M8 12 2.4 9M8 14l-6 1.4M8.6 16.4l-4.4 4M16 12l5.6-3M16 14l6 1.4M15.4 16.4l4.4 4" stroke-width="1.4" fill="none"/>',
    web: '<path class="s" stroke-width="1.2" d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/><path class="sa" stroke-width="1.6" d="M12 6.4 16 8l1.6 4L16 16l-4 1.6L8 16l-1.6-4L8 8z"/><path class="sa" stroke-width="1.4" d="M12 3.4l6 2.6 2.6 6-2.6 6-6 2.6-6-2.6L3.4 12 6 6z"/>',
    trowel: '<rect class="c" x="10.8" y="1.6" width="2.4" height="8" rx="1.2"/><rect class="b" x="11.4" y="9" width="1.2" height="3"/><path class="a" d="M7 12h10l-2 7-3 3-3-3z"/>',
    pot: '<path class="a" d="M4 9h16l-2 12.4H6z"/><rect class="b" x="3" y="7" width="18" height="3.6" rx="1.4"/><path class="c" d="M12 7V3M12 4.6c1.6-1.6 3.6-1.6 4.4-.6-1.4 1.4-3 1.4-4.4.6z"/>',
    apple: '<path class="a" d="M12 7.4c-3-2.4-8-1.4-8 4.6 0 5 3.4 9.6 6 9.6 1 0 1.4-.6 2-.6s1 .6 2 .6c2.6 0 6-4.6 6-9.6 0-6-5-7-8-4.6z"/><path class="c" d="M11.4 7.4c0-2 .6-3.6 2-4.8l1 .8c-1.2 1-1.6 2.4-1.6 4z"/><path class="b" d="M13.4 4.6c1.6-1.6 4-1.8 5.4-.8-1.2 2-3.6 2.2-5.4.8z"/>',
    appletree: '<rect class="c" x="10.6" y="13" width="2.8" height="9" rx="1"/><circle class="b" cx="12" cy="9" r="7.4"/><circle class="a" cx="8.4" cy="8" r="1.6"/><circle class="a" cx="14.6" cy="6.4" r="1.6"/><circle class="a" cx="15.4" cy="11.4" r="1.6"/><circle class="a" cx="10" cy="12.4" r="1.6"/>'
  };
  function pic(name) { return '<svg class="mg-pic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ART[name] || '') + '</svg>'; }
  // Colors for faces (no red anywhere). [fill a, fill b, name]
  var HUES = [['#0d9488', '#f2c14e', 'Teal'], ['#e58a2e', '#7a4a24', 'Orange'], ['#7c4ddb', '#ffd98f', 'Purple'], ['#2f7de1', '#bfe0ff', 'Blue'],
    ['#1f9d55', '#a7e3b9', 'Green'], ['#c99412', '#6b4a10', 'Gold'], ['#8a6e52', '#e8d3b8', 'Brown'], ['#d0559e', '#ffd3ea', 'Pink'],
    ['#4b6fd6', '#f2c14e', 'Indigo'], ['#5c7a48', '#d9ead0', 'Olive']];
  var THEME = {
    expedition: {
      base: [['feather', 'Feather'], ['compass', 'Compass'], ['lantern', 'Lantern'], ['acorn', 'Acorn'], ['canoe', 'Canoe'], ['map', 'Map'], ['boot', 'Boot'], ['kettle', 'Kettle'], ['key', 'Key'], ['tent', 'Tent']],
      kin: [[['key', 'Key'], ['lock', 'Lock']], [['canoe', 'Canoe'], ['paddle', 'Paddle']], [['lantern', 'Lantern'], ['flame', 'Flame']], [['acorn', 'Acorn'], ['oak', 'Oak tree']],
        [['egg', 'Egg'], ['nest', 'Nest']], [['bee', 'Bee'], ['hive', 'Hive']], [['cloud', 'Cloud'], ['drop', 'Raindrop']], [['boot', 'Boot'], ['footprint', 'Footprint']],
        [['map', 'Map'], ['compass', 'Compass']], [['kettle', 'Kettle'], ['mug', 'Mug']]],
      card: 'note', cards: 'notes', glint: 'Glint', match: 'Noted!', back: 'Field note'
    },
    grove: {
      base: [['clover', 'Clover'], ['mushroom', 'Toadstool'], ['butterfly', 'Butterfly'], ['acorn', 'Acorn'], ['flower', 'Flower'], ['snail', 'Snail'], ['bee', 'Bee'], ['sprout', 'Sprout'], ['frog', 'Frog'], ['apple', 'Apple']],
      kin: [[['seed', 'Seed'], ['sprout', 'Sprout']], [['caterpillar', 'Caterpillar'], ['butterfly', 'Butterfly']], [['tadpole', 'Tadpole'], ['frog', 'Frog']], [['acorn', 'Acorn'], ['oak', 'Oak tree']],
        [['bee', 'Bee'], ['hive', 'Hive']], [['bird', 'Bird'], ['nest', 'Nest']], [['cloud', 'Cloud'], ['drop', 'Raindrop']], [['spider', 'Spider'], ['web', 'Web']],
        [['trowel', 'Trowel'], ['pot', 'Flowerpot']], [['apple', 'Apple'], ['appletree', 'Apple tree']]],
      card: 'firefly', cards: 'fireflies', glint: 'Glow', match: 'A pair!', back: 'Firefly card'
    }
  };
  // face id -> { art, name, hue:[a,b], dots:bool }
  function faceInfo(theme, face, board) {
    var T = THEME[theme], m;
    if ((m = /^kin\.(\d+)\.(a|b)$/.exec(face))) {
      var k = +m[1] - 1, side = m[2] === 'a' ? 0 : 1, pr = T.kin[k];
      return { art: pr[side][0], name: pr[side][1], hue: HUES[k % HUES.length], dots: false };
    }
    m = /^pair\.(\d+)(b?)$/.exec(face);
    var n = +m[1], twin = !!m[2], bs = T.base[n];
    var twinned = board && board.kind === 'lookalike' && board.cards.some(function (c) { return c.face === 'pair.' + n + 'b'; });
    var hue = twin ? HUES[(n + 5) % HUES.length] : HUES[n % HUES.length];
    return { art: bs[0], name: twinned ? hue[2] + ' ' + bs[1].toLowerCase() + (twin ? ' with dots' : '') : bs[1], hue: hue, dots: twin };
  }

  // ------------------------------------------------------------------
  // Mount
  // ------------------------------------------------------------------
  function mount(container, opts) {
    opts = opts || {};
    var theme = opts.theme === 'grove' ? 'grove' : 'expedition', T = THEME[theme];
    var practice = !!opts.practice;
    var difficulty = DIFF[U.normDiff(opts.difficulty)] ? U.normDiff(opts.difficulty) : 'easy';
    var day = opts.seed != null ? String(opts.seed) : new Date().toISOString().slice(0, 10);
    var board = generate(practice ? Arcade.practiceSeed(day, opts.practiceRound) : day, difficulty);
    var mode = practice ? 'practice' : (opts.mode === 'ranked' ? 'ranked' : 'relaxed');
    var timer = mode === 'ranked' ? (opts.timer === 'shown' ? 'shown' : 'quiet') : 'none';
    var rm = !!opts.reducedMotion || U.prefersReduced();
    var TURN_BACK = mode === 'ranked' ? (opts.turnBackMs != null ? opts.turnBackMs : 900) : null;   // relaxed: stays up until your next tap
    var inv = {};
    U.PU.forEach(function (p) { inv[p.k] = practice ? 0 : Math.max(0, (opts.powerUps && +opts.powerUps[p.k]) || 0); });
    var hasPU = !practice && U.PU.some(function (p) { return inv[p.k] > 0; });
    var onFinish = typeof opts.onFinish === 'function' ? opts.onFinish : function () {};
    var art = U.itemArtFactory(opts.renderItem, theme);
    var clock = new U.Clock();
    var pack = { inv: inv, packed: { magnet: false, lens: false, double: null, lucky: null }, targeting: null };
    var sess = new Session(board, { packed: pack.packed });
    var phase = 'intro', destroyed = false, timers = [], result = null, fired = false, lock = false, backT = null, focusIdx = 0;
    var name = Arcade.gameName('memory', theme), dl = Arcade.DIFF_LABEL[difficulty];
    var puzzleLabel = practice ? 'Practice board' : 'Puzzle #' + board.puzzleNo;
    var N = board.cards.length;

    var root = document.createElement('div');
    root.className = 'ag-root mg-root ag-theme-' + theme + (rm ? ' ag-rm' : '') + ' mg-' + difficulty;
    root.setAttribute('data-game', 'memory'); root.setAttribute('data-difficulty', practice ? 'practice' : difficulty);
    root.setAttribute('data-mode', mode); root.setAttribute('data-phase', 'intro');
    var keyHtml = '';
    if (board.key) {
      keyHtml = '<div class="mg-key" role="list" aria-label="Pair key: which pictures go together">' + board.key.map(function (pr) {
        var a = faceInfo(theme, pr[0], board), b = faceInfo(theme, pr[1], board);
        return '<div class="mg-keychip" role="listitem" aria-label="' + esc(a.name + ' goes with ' + b.name) + '" style="--m-a:' + a.hue[0] + ';--m-b:' + a.hue[1] + '">' + pic(a.art) + '<span class="mg-key-plus" aria-hidden="true">+</span>' + pic(b.art) + '</div>';
      }).join('') + '<button type="button" class="mg-keymore" data-act="key">Pair names</button></div>';
    }
    root.innerHTML =
      '<div class="ag-wrap">' +
        '<header class="ag-head"><div class="ag-title"><div class="ag-kicker">' + esc(practice ? 'Practice' : 'Daily game') + '</div>' +
          '<h2 class="ag-h">' + esc(name) + '</h2><div class="ag-sub">' + esc(puzzleLabel) + ' &middot; <span class="ag-diff">' + dl + '</span>' +
          (mode === 'ranked' ? ' &middot; Ranked' : mode === 'relaxed' ? ' &middot; Relaxed' : '') + '</div></div>' +
          '<div class="ag-clock" ' + (timer === 'shown' ? '' : 'hidden') + ' aria-label="Time">' + svg('clock') + '<span>0:00</span></div>' +
          (mode === 'ranked' ? '<button type="button" class="ag-icon-btn ag-pausebtn" aria-label="Pause">' + svg('pause') + '</button>' : '') +
          '<button type="button" class="ag-icon-btn ag-helpbtn" aria-label="How to play">' + svg('help') + '</button></header>' +
        '<div class="ag-hud"><div class="ag-hud-item mg-pairs" aria-label="Pairs found"><b>0</b><span>/ ' + board.pairs + ' pairs</span></div>' +
          '<div class="ag-hud-item mg-slips"><b>0</b><span>slips</span></div><div class="ag-hud-item mg-flips"><b>0</b><span>flips</span></div>' +
          (practice ? '' : '<div class="ag-hud-item ag-bag" aria-label="Finds">' + svg('bag') + '<b>0</b><span>finds</span></div>') + '</div>' +
        keyHtml +
        '<div class="mg-grid" role="group" aria-label="Cards, ' + board.rows + ' rows of ' + board.cols + '" style="--cols:' + board.cols + ';--rows:' + board.rows + '"></div>' +
        '<div class="ag-msg mg-msg" aria-live="polite"></div>' +
        '<div class="ag-sr" aria-live="polite"></div>' +
      '</div>';
    container.appendChild(root);
    var sheet = U.Sheet(root);
    function $(s) { return root.querySelector(s); }
    var el = { grid: $('.mg-grid'), msg: $('.mg-msg'), sr: $('.ag-sr'), pairs: $('.mg-pairs b'), slips: $('.mg-slips b'), slipsLab: $('.mg-slips span'), flips: $('.mg-flips b'),
      bag: $('.ag-bag b'), bagBox: $('.ag-bag'), clockT: $('.ag-clock span'), help: $('.ag-helpbtn'), pause: $('.ag-pausebtn'), key: $('.mg-key') };
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function announce(t) { el.sr.textContent = ''; later(function () { el.sr.textContent = t; }, 30); }
    function setMsg(t, tone) { el.msg.textContent = t; el.msg.className = 'ag-msg mg-msg' + (tone ? ' is-' + tone : ''); }
    var tickId = null;
    if (timer === 'shown') tickId = setInterval(function () { if (!destroyed) el.clockT.textContent = U.fmtTime(clock.elapsed()); }, 500);

    // ---------- cards ----------
    var cardEls = [];
    for (var i = 0; i < N; i++) {
      var c = board.cards[i], fi = faceInfo(theme, c.face, board);
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mg-card'; b.setAttribute('data-i', i); b.tabIndex = i === 0 ? 0 : -1;
      b.style.setProperty('--m-a', fi.hue[0]); b.style.setProperty('--m-b', fi.hue[1]);
      b.innerHTML = '<span class="mg-inner"><span class="mg-back"><span class="mg-back-art" aria-hidden="true"></span><span class="mg-glint" aria-hidden="true"></span></span>' +
        '<span class="mg-front' + (fi.dots ? ' has-dots' : '') + '">' + pic(fi.art) + (fi.dots ? '<span class="mg-dots" aria-hidden="true"><i></i><i></i><i></i></span>' : '') +
        '<span class="mg-label">' + esc(fi.name) + '</span></span></span>';
      el.grid.appendChild(b); cardEls.push(b);
    }
    function glintFor(i) {
      var g = board.cards[i].glint;
      if (practice || !g) return null;
      return { rarity: sess.packed.lucky === i ? U.upRarity(g.rarity) : g.rarity, item: g.item };
    }
    function pos(i) { return 'row ' + (Math.floor(i / board.cols) + 1) + ', card ' + (i % board.cols + 1); }
    function render() {
      for (var i = 0; i < N; i++) {
        var bEl = cardEls[i], up = sess.matched[i] || sess.open.indexOf(i) >= 0, fi = faceInfo(theme, board.cards[i].face, board), g = glintFor(i);
        bEl.classList.toggle('is-up', up);
        bEl.classList.toggle('is-matched', sess.matched[i]);
        bEl.classList.toggle('has-glint', !!g && !sess.matched[i]);
        var gl = bEl.querySelector('.mg-glint');
        var ghtml = g && !sess.matched[i] ? (sess.packed.lens ? '<span class="ag-r-' + g.rarity + '">' + art.html(g.rarity, g.item) + '</span>' : svg('sparkle')) + (sess.packed.double === i ? '<i>x2</i>' : '') : '';
        if (gl.innerHTML !== ghtml) gl.innerHTML = ghtml;
        var label = up ? fi.name + (sess.matched[i] ? ', matched' : ', face up') : T.back + ', ' + pos(i) + (g ? ', glinting' : '') + (sess.seen[i] ? ', seen before' : '');
        bEl.setAttribute('aria-label', label + (up ? ', ' + pos(i) : ''));
        bEl.setAttribute('aria-disabled', sess.matched[i] || phase !== 'play' ? 'true' : 'false');
      }
      el.pairs.textContent = sess.matches;
      el.slips.textContent = sess.slips; el.slipsLab.textContent = sess.slips === 1 ? 'slip' : 'slips';
      el.flips.textContent = sess.flips;
      if (el.bag) el.bag.textContent = sess.finds.length;
    }
    function bump(e) { if (rm || !e) return; e.classList.remove('is-bump'); void e.offsetWidth; e.classList.add('is-bump'); }

    // ---------- play ----------
    function closeOpen() {
      if (backT) { clearTimeout(backT); backT = null; }
      if (sess.closePending()) { lock = false; render(); return true; }
      lock = false; return false;
    }
    function flipCard(i) {
      if (phase !== 'play' || sheet.isOpen()) return;
      if (lock) return;   // ranked turn-back window (same 900 ms for everyone)
      if (sess.pending()) closeOpen();   // relaxed: the next tap turns the pair back and flips the tapped card
      if (sess.matched[i] || sess.open.indexOf(i) >= 0) return;
      if (!clock.started) clock.start();
      var ev = sess.flip(i, clock.elapsed());
      if (ev.ignored) return;
      render();
      var fi = faceInfo(theme, board.cards[i].face, board);
      if (ev.first) { announce(fi.name + '. Pick another card.'); U.buzz(5); return; }
      var fa = faceInfo(theme, board.cards[ev.a].face, board);
      if (ev.match) {
        bump(cardEls[ev.a]); bump(cardEls[ev.b]);
        if (ev.gems.length || ev.magnet) bump(el.bagBox);
        var extra = (ev.gems.length ? ' A ' + T.glint.toLowerCase() + ' find!' : '') + (ev.magnet ? ' Magnet pulled in a find.' : '');
        setMsg(T.match + ' ' + fa.name + ' and ' + fi.name + '.' + extra, 'good');
        announce('Match: ' + fa.name + ' and ' + fi.name + '. ' + sess.matches + ' of ' + board.pairs + ' pairs.' + extra);
        U.buzz([10, 30, 10]);
        if (ev.done) finish();
        return;
      }
      setMsg((ev.slip ? 'A slip. You have seen one of these before.' : 'Not a pair. Now you know two more.') + (TURN_BACK == null ? ' Tap any card to keep going.' : ''), ev.slip ? 'soft' : '');
      announce(fi.name + '. Not a pair with ' + fa.name + '.' + (ev.slip ? ' That counts as a slip.' : ''));
      if (TURN_BACK != null) { lock = true; backT = later(function () { backT = null; closeOpen(); }, TURN_BACK); }
    }
    function finish() {
      phase = 'done'; root.setAttribute('data-phase', 'done');
      clock.stop(); if (tickId) { clearInterval(tickId); tickId = null; }
      result = sess.result({ mode: mode, timeMs: clock.elapsed(), pausedMs: clock.pausedMs(), theme: theme, showTime: !!opts.showTimeOnCards, seed: day });
      render();
      if (!fired) { fired = true; try { onFinish(result); } catch (e) { if (global.console) console.error(e); } }
      later(showResults, rm ? 30 : 700);
    }
    el.grid.addEventListener('click', function (ev) {
      var b = ev.target.closest('.mg-card'); if (!b) return;
      var i = +b.getAttribute('data-i'); setFocus(i, false); flipCard(i);
    });
    function setFocus(i, move) {
      cardEls[focusIdx].tabIndex = -1; focusIdx = i; cardEls[i].tabIndex = 0;
      if (move) try { cardEls[i].focus({ preventScroll: false }); } catch (e) { /* ignore */ }
    }
    el.grid.addEventListener('keydown', function (ev) {
      var i = focusIdx, r = Math.floor(i / board.cols), c2 = i % board.cols, t = -1;
      if (ev.key === 'ArrowRight') t = c2 < board.cols - 1 ? i + 1 : i;
      else if (ev.key === 'ArrowLeft') t = c2 > 0 ? i - 1 : i;
      else if (ev.key === 'ArrowDown') t = r < board.rows - 1 ? i + board.cols : i;
      else if (ev.key === 'ArrowUp') t = r > 0 ? i - board.cols : i;
      else if (ev.key === 'Home') t = r * board.cols;
      else if (ev.key === 'End') t = r * board.cols + board.cols - 1;
      else return;
      ev.preventDefault(); setFocus(t, true);
    });
    el.help.addEventListener('click', function () { showHelp(); });
    if (el.pause) el.pause.addEventListener('click', function () { showPause(); });
    if (el.key) el.key.addEventListener('click', function (ev) { if (ev.target.closest('[data-act="key"]')) showKey(); });
    function onVis() { if (document.hidden) clock.pause('hidden'); else clock.resume('hidden'); }
    document.addEventListener('visibilitychange', onVis);

    // ---------- sheets ----------
    function modeLine() {
      if (mode === 'practice') return 'Practice: no clock, no board, no finds. Just for fun.';
      if (mode === 'relaxed') return 'Relaxed: no clock and no board. Cards stay up until your next tap. It pays the same.';
      return timer === 'shown' ? 'Ranked: the clock counts up on screen.' : 'Ranked: a quiet clock keeps time. You see it at the end.';
    }
    function kindLine() {
      if (board.kind === 'kin') return 'Hard pairs are two different pictures that go together, like ' + faceInfo(theme, 'kin.4.a', board).name.toLowerCase() + ' and ' + faceInfo(theme, 'kin.4.b', board).name.toLowerCase() + '. The key at the top shows every pair.';
      if (board.kind === 'lookalike') return 'Two pairs have look-alikes: the same picture in a different color, one with dots. Check the label.';
      return 'Every pair is two of the same picture.';
    }
    function introHtml() {
      var packBlock = '';
      if (hasPU) {
        var targets = board.cards.filter(function (c) { return c.glint; }).map(function (c) { return { i: c.idx, rarity: c.glint.rarity, item: c.glint.item }; });
        packBlock = '<div class="ag-pack"><div class="ag-pack-title">Pack your power-ups</div>' +
          (opts.fuelLabel ? '<div class="ag-fuel">' + esc(opts.fuelLabel) + '</div>' : '') +
          '<div class="ag-pack-body">' + U.packHtml({ inv: inv, packed: pack.packed, targeting: pack.targeting, targets: targets, art: art, targetWord: T.glint,
            tips: { magnet: 'A match next to a face-down ' + T.glint.toLowerCase() + ' card pulls in a bonus find, up to 3.', lens: 'Shows what each ' + T.glint.toLowerCase() + ' holds.', double: 'Tap a ' + T.glint.toLowerCase() + '. It pays double.', lucky: 'Tap a ' + T.glint.toLowerCase() + '. It goes up one rarity.' } }) + '</div></div>';
      }
      return '<div class="ag-intro-badge">' + pic(theme === 'grove' ? 'butterfly' : 'compass') + '</div>' +
        '<div class="ag-kicker">' + esc(puzzleLabel) + ' &middot; ' + dl + '</div><h3 class="ag-sheet-h">' + esc(name) + '</h3>' + U.introControls(opts, mode, difficulty) +
        '<p class="ag-sheet-p">Flip two cards. Find every pair. ' + esc(kindLine()) + '</p>' +
        '<p class="ag-sheet-p"><b>Slips</b> count memory, not luck. A slip is a miss when you had already seen the card you needed. Flips into the unknown never count.</p>' +
        '<div class="ag-facts"><span><b>' + board.pairs + '</b> pairs</span><span><b>' + N + '</b> cards</span><span>3 stars at ' + board.stars[0] + (board.stars[0] === 1 ? ' slip' : ' slips') + '</span></div>' +
        '<p class="ag-mode-line">' + esc(modeLine()) + '</p>' + packBlock +
        '<div class="ag-sheet-actions"><button type="button" class="ag-btn ag-primary ag-big" data-act="start" data-autofocus>Let’s go</button></div>';
    }
    function refreshPack(ev) {
      var hit = ev.target.closest('[data-pu],[data-target]'), sel = hit ? (hit.hasAttribute('data-pu') ? '[data-pu="' + hit.getAttribute('data-pu') + '"]' : '[data-target="' + hit.getAttribute('data-target') + '"]') : null;
      var tmp = document.createElement('div'); tmp.innerHTML = introHtml();
      var fresh = tmp.querySelector('.ag-pack-body'), body = sheet.el.querySelector('.ag-pack-body');
      if (fresh && body) body.innerHTML = fresh.innerHTML;
      var f = sel && sheet.el.querySelector(sel); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    function showHelp() {
      clock.pause('free');
      sheet.open('<h3 class="ag-sheet-h">How to play</h3><p class="ag-sheet-p">Tap a card to flip it, then tap another. A pair stays up. Other cards turn back over' + (TURN_BACK == null ? ' when you tap again' : ' after a moment') + '. On a keyboard, use the arrow keys and press Enter or Space to flip.</p>' +
        '<p class="ag-sheet-p">' + esc(kindLine()) + '</p><p class="ag-sheet-p"><b>Slips</b>: a miss counts as a slip when you had already seen the partner of your first card, or if you picked a card you had seen while new cards were still waiting. Lucky first tries never change slips.</p>' +
        '<div class="ag-sheet-actions"><button type="button" class="ag-btn ag-primary" data-act="close" data-autofocus>Got it</button></div>', 'is-help', 'How to play');
    }
    function showKey() {
      clock.pause('free');
      var rows = board.key.map(function (pr) {
        var a = faceInfo(theme, pr[0], board), b = faceInfo(theme, pr[1], board);
        return '<li style="--m-a:' + a.hue[0] + ';--m-b:' + a.hue[1] + '">' + pic(a.art) + '<span>' + esc(a.name) + '</span><span class="mg-key-plus">+</span>' + pic(b.art) + '<span>' + esc(b.name) + '</span></li>';
      }).join('');
      sheet.open('<h3 class="ag-sheet-h">Pair key</h3><ul class="mg-keylist">' + rows + '</ul><div class="ag-sheet-actions"><button type="button" class="ag-btn ag-primary" data-act="close" data-autofocus>Back to the cards</button></div>', 'is-help', 'Pair key');
    }
    function showPause() {
      clock.pause('user'); root.classList.add('ag-paused');
      sheet.open('<h3 class="ag-sheet-h">Paused</h3><p class="ag-sheet-p">The cards are hidden and the clock is stopped. Take all the time you need.</p>' +
        '<div class="ag-sheet-actions"><button type="button" class="ag-btn ag-primary" data-act="resume" data-autofocus>Keep playing</button></div>', 'is-small', 'Paused');
    }
    function headline() {
      var s = result.score.slips;
      if (practice) return 'Practice complete!';
      if (s === 0) return 'Cleanest memory!';
      if (result.stars === 3) return 'Sharp memory!';
      if (result.stars === 2) return 'Nicely done!';
      return 'All pairs found!';
    }
    function haulHtml() {
      if (practice) return '';
      var items = result.finds.map(function (f) {
        var m = /^find\.(\w+)\.(\d+)$/.exec(f.id), item = m ? +m[2] : 0;
        return '<li class="ag-haul-item ag-r-' + f.rarity + '"><span class="ag-haul-ico">' + art.html(f.rarity, item) + '</span><span class="ag-haul-txt"><b>' + esc(art.name(f.rarity, item)) + '</b><small>' + cap(f.rarity) + '</small></span></li>';
      }).join('');
      return '<div class="ag-res-sec"><div class="ag-res-lab">Your finds</div>' + (items ? '<ul class="ag-haul">' + items + '</ul>' : '<p class="ag-sheet-p">No finds this time. Your stars still count!</p>') + '</div>';
    }
    function showResults() {
      var s = result.score;
      var timeLine = s.timeMs != null ? '<p class="ag-time">' + svg('clock') + ' ' + U.fmtTime(s.timeMs) + '</p>' : '';
      sheet.open(U.starsHtml(result.stars) + '<h3 class="ag-sheet-h ag-res-h">' + esc(headline()) + '</h3>' +
        '<p class="ag-sheet-p ag-res-sub">' + s.slips + (s.slips === 1 ? ' slip' : ' slips') + ' &middot; ' + s.flips + ' flips</p>' + timeLine +
        U.standingHtml(result, opts) + haulHtml() +
        '<div class="ag-res-sec"><div class="ag-res-lab">Share</div><pre class="ag-share">' + esc(result.shareText) + '</pre></div>' +
        (practice ? '' : '<p class="ag-next">A fresh board arrives <b>tomorrow</b>.</p>') +
        '<div class="ag-sheet-actions">' + (opts.onLeaderboard && mode !== 'practice' && opts.boards !== false ? '<button type="button" class="ag-btn" data-act="board">' + svg('board') + '<span>Leaderboard</span></button>' : '') +
        '<button type="button" class="ag-btn" data-act="copy">' + svg('copy') + '<span>Copy</span></button>' +
        '<button type="button" class="ag-btn ag-primary" data-act="done" data-autofocus>Done</button></div>', 'is-results', 'Results');
      announce(headline() + ' ' + s.slips + ' slips, ' + s.flips + ' flips.');
    }
    sheet.el.addEventListener('click', function (ev) {
      if (phase === 'intro' && hasPU && U.packClick(pack, ev)) {
        sess.packed = { magnet: pack.packed.magnet, lens: pack.packed.lens, double: pack.packed.double, lucky: pack.packed.lucky };
        refreshPack(ev); return;
      }
      var b = ev.target.closest('[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'diff') { if (opts.onDifficulty) opts.onDifficulty(b.getAttribute('data-v')); return; }
      if (act === 'relax') { if (opts.onRelax) { opts.onRelax(); return; } mode = 'relaxed'; timer = 'none'; sheet.open(introHtml(), 'is-intro', name + ', how to play'); return; }
      if (act === 'start') { sheet.close(); startPlay(); }
      else if (act === 'close') { sheet.close(); clock.resume('free'); }
      else if (act === 'resume') { sheet.close(); root.classList.remove('ag-paused'); clock.resume('user'); }
      else if (act === 'copy') U.copyText(result.shareText, b);
      else if (act === 'board') { if (opts.onLeaderboard) opts.onLeaderboard(result); }
      else if (act === 'done') { sheet.close(); root.classList.add('is-finished'); if (typeof opts.onDone === 'function') opts.onDone(result); }
    });
    function startPlay() {
      sess = new Session(board, { packed: pack.packed });
      phase = 'play'; root.setAttribute('data-phase', 'play');
      render(); setMsg('Flip two cards to find a pair.');
      setFocus(0, true);
    }
    function applyResume(rs) {
      if (!rs || rs.game !== 'memory' || String(rs.seed) !== day || rs.difficulty !== (practice ? 'practice' : difficulty)) return false;
      pack.packed = rs.packed || pack.packed;
      sess = new Session(board, { packed: pack.packed });
      // Replay exactly like live play: a missed pair is turned back before the next flip (flipCard does closeOpen first).
      (rs.flips || []).forEach(function (f) { if (sess.pending()) sess.closePending(); sess.flip(f[0], f[1]); });
      sess.closePending();
      clock.restore(rs.elapsedMs, rs.pausedMs);
      if (sess.done) {
        phase = 'done'; root.setAttribute('data-phase', 'done'); clock.stop(); fired = true;
        result = sess.result({ mode: mode, timeMs: rs.elapsedMs, pausedMs: rs.pausedMs, theme: theme, showTime: !!opts.showTimeOnCards, seed: day });
        render(); showResults();
      } else if (rs.started) {
        phase = 'play'; root.setAttribute('data-phase', 'play'); render(); setMsg('Welcome back! Your cards are just as you left them.');
      } else return false;
      return true;
    }
    render();
    if (!applyResume(opts.resume)) sheet.open(introHtml(), 'is-intro', name + ', how to play');

    return {
      getState: function () {
        return {
          v: 1, game: 'memory', seed: day, difficulty: practice ? 'practice' : difficulty, mode: mode,
          packed: { magnet: sess.packed.magnet, lens: sess.packed.lens, double: sess.packed.double, lucky: sess.packed.lucky },
          flips: sess.log.map(function (f) { return f.slice(); }), started: phase !== 'intro', finished: phase === 'done',
          elapsedMs: clock.elapsed(), pausedMs: clock.pausedMs()
        };
      },
      destroy: function () {
        destroyed = true; timers.forEach(clearTimeout); if (tickId) clearInterval(tickId);
        document.removeEventListener('visibilitychange', onVis);
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  var api = {
    mount: mount,
    _engine: { generate: generate, isSlip: isSlip, starsFor: starsFor, Session: Session, partnerOf: partnerOf, DIFF: DIFF, faceInfo: faceInfo, ART: ART, THEME: THEME, shareText: shareText }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.MemoryGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
