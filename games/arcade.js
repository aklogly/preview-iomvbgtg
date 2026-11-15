/* Kindling v5.5 - Daily Games Arcade shell (prototype module).
 * Exposes window.Arcade and window.LeaderboardSim. No build step, no dependencies.
 * Load order in a page: arcade.js, then word.js / memory.js (run/run.js is independent).
 * The engine parts (seed, toBoardEntry, compare, LeaderboardSim.board/band/personal) are DOM-free
 * so they can be tested in Node: require('./arcade.js').
 *
 * Dose-blind by construction: nothing here reads doses, Spark, Stars or the record.
 * Board entries never carry finds, power-ups, loot or anything from the app's save.
 */
(function (global) {
  'use strict';

  // ------------------------------------------------------------------
  // Seeded RNG (same functions as run/run.js so seeds behave the same)
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
    var a = hashStr(String(str));
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
      },
      normal: function () {
        var u = Math.max(1e-9, f()), v = f();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      }
    };
  }
  // Puzzle number = days since 2026-01-01 (same as RunGame). Practice seeds use their date part.
  function puzzleNumber(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return Math.floor(seed);
    var s = String(seed);
    var m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(2026, 0, 1)) / 864e5);
    var d = /^day([1-7])$/i.exec(s);
    if (d) return +d[1];
    return hashStr(s) % 1000;
  }
  function rollRarity(rng, skew) {
    var x = rng.f();
    if (skew) return x < 0.3 ? 'common' : x < 0.72 ? 'uncommon' : 'rare';
    return x < 0.55 ? 'common' : x < 0.86 ? 'uncommon' : 'rare';
  }
  function upRarity(r) { return r === 'common' ? 'uncommon' : 'rare'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtTime(ms) {
    if (ms == null) return '';
    var s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60);
    return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }
  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ------------------------------------------------------------------
  // Names and labels
  // ------------------------------------------------------------------
  var DIFFS = ['easy', 'normal', 'hard'];
  var DIFF_LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard', practice: 'Practice' };
  var TRAIL_DIFF = { easy: 'stroll', normal: 'trek', hard: 'summit' };      // Run engine config names
  var TRAIL_PLAIN = { stroll: 'easy', trek: 'normal', summit: 'hard', practice: 'practice' };
  var GAME_NAMES = {
    trail: { expedition: 'The Trail', grove: 'Garden Path' },
    word: { expedition: 'Rune Stones', grove: 'Petal Words' },
    memory: { expedition: 'Field Notes', grove: 'Firefly Pairs' }
  };
  function gameName(game, theme) { var g = GAME_NAMES[game]; return g ? (g[theme] || g.expedition) : game; }
  function normDiff(d) {
    if (TRAIL_PLAIN[d]) return TRAIL_PLAIN[d];
    return DIFFS.indexOf(d) >= 0 ? d : 'easy';
  }
  // Fallback find names when the app passes no renderItem (same lists as the Run).
  var FIND_NAMES = {
    expedition: {
      common: ['River stone', 'Hawk feather', 'Pine cone', 'Trail pin'],
      uncommon: ['Brass compass', 'Old map', 'Lantern', 'Spyglass'],
      rare: ['Amber gem', 'Golden idol', 'Star chart', 'Sky crystal']
    },
    grove: {
      common: ['Clover', 'Acorn', 'Smooth pebble', 'Snail shell'],
      uncommon: ['Toadstool', 'Honeycomb', 'Robin feather', 'Moss stone'],
      rare: ['Moon blossom', 'Glass butterfly', 'Golden pear', 'Fairy ring']
    }
  };

  // ------------------------------------------------------------------
  // Contract: seeds, board entries, ranking, result validation
  // ------------------------------------------------------------------
  // Seed string: <game>|<YYYY-MM-DD>|<difficulty>. The Trail keeps its legacy engine seed
  // ('run|' + day + '|' + stroll/trek/summit), so its boards are unchanged.
  function seed(game, gameDay, difficulty) {
    return String(game) + '|' + String(gameDay) + '|' + normDiff(difficulty);
  }
  function practiceSeed(gameDay, n) { return 'practice|' + String(gameDay) + '|' + (n || 1); }

  var PAUSE_LIMIT_MS = 60000;
  // Entry: { game, puzzleNo, difficulty, mode, primary, secondary, tertiary }
  //   trail:  primary = stars (higher is better), secondary = steps
  //   word:   primary = guesses,                  secondary = null
  //   memory: primary = slips,                    secondary = flips
  //   tertiary = time in ms for every game; null in relaxed, or when paused over 60 s (not on Fastest).
  // Never includes finds, powerUpsUsed, Stars, XP, Spark, Campfire, level or timestamps.
  function toBoardEntry(result) {
    if (!result || result.mode === 'practice' || result.difficulty === 'practice') return null;
    var g = result.game, s = result.score || {}, primary, secondary;
    if (g === 'trail') { primary = +result.stars || 0; secondary = s.steps != null ? s.steps : result.stepsUsed; }
    else if (g === 'word') { primary = s.guesses; secondary = null; }
    else if (g === 'memory') { primary = s.slips; secondary = s.flips; }
    else return null;
    var ranked = result.mode === 'ranked';
    var t = ranked && s.timeMs != null && (result.pausedMs || 0) <= PAUSE_LIMIT_MS ? Math.round(s.timeMs) : null;
    return {
      game: g, puzzleNo: result.puzzleNo, difficulty: normDiff(result.difficulty), mode: ranked ? 'ranked' : 'relaxed',
      primary: primary, secondary: secondary == null ? null : secondary, tertiary: t
    };
  }
  function cmpTime(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return a - b;
  }
  function cmpMoves(game, a, b) {
    if (game === 'trail') return (b.primary - a.primary) || ((a.secondary || 0) - (b.secondary || 0));
    if (game === 'word') return a.primary - b.primary;
    return (a.primary - b.primary) || ((a.secondary || 0) - (b.secondary || 0));
  }
  // Negative = a ranks ahead. tab 'moves' (default): moves, then time. 'fast': time, then moves.
  function compare(game, a, b, tab) {
    if (tab === 'fast') return cmpTime(a.tertiary, b.tertiary) || cmpMoves(game, a, b);
    return cmpMoves(game, a, b) || cmpTime(a.tertiary, b.tertiary);
  }

  var RESULT_KEYS = ['game', 'puzzleNo', 'seed', 'difficulty', 'mode', 'stars', 'score', 'pausedMs', 'finds', 'powerUpsUsed', 'shareText', 'log'];
  function validateResult(r) {
    var errs = [];
    if (!r || typeof r !== 'object') return ['not an object'];
    RESULT_KEYS.forEach(function (k) { if (!(k in r)) errs.push('missing ' + k); });
    if (['trail', 'word', 'memory'].indexOf(r.game) < 0) errs.push('bad game');
    if (['easy', 'normal', 'hard', 'practice'].indexOf(r.difficulty) < 0) errs.push('bad difficulty ' + r.difficulty);
    if (['ranked', 'relaxed', 'practice'].indexOf(r.mode) < 0) errs.push('bad mode ' + r.mode);
    if ((r.mode === 'practice') !== (r.difficulty === 'practice')) errs.push('practice mode and difficulty disagree');
    if (!(r.stars >= 0 && r.stars <= 3)) errs.push('bad stars');
    if ((r.game === 'word' || r.game === 'memory') && r.stars < 1) errs.push('word/memory stars must be >= 1');
    var s = r.score || {};
    var need = { trail: ['steps', 'stepsMax', 'par', 'timeMs'], word: ['guesses', 'assisted', 'timeMs'], memory: ['slips', 'flips', 'timeMs'] }[r.game] || [];
    need.forEach(function (k) { if (!(k in s)) errs.push('score missing ' + k); });
    if (r.mode !== 'ranked' && s.timeMs != null) errs.push('timeMs must be null unless ranked');
    if (r.mode === 'ranked' && typeof s.timeMs !== 'number') errs.push('ranked timeMs must be a number');
    if (typeof r.pausedMs !== 'number') errs.push('pausedMs must be a number');
    if (!Array.isArray(r.finds)) errs.push('finds must be an array');
    else if (r.mode === 'practice' && r.finds.length) errs.push('practice must have no finds');
    else r.finds.forEach(function (f) { if (!f || !/^find\./.test(f.id) || ['common', 'uncommon', 'rare'].indexOf(f.rarity) < 0) errs.push('bad find'); });
    var pu = r.powerUpsUsed || {};
    ['magnet', 'lens', 'double', 'lucky'].forEach(function (k) { if (pu[k] !== 0 && pu[k] !== 1) errs.push('powerUpsUsed.' + k); });
    if (typeof r.shareText !== 'string' || !r.shareText) errs.push('shareText');
    if (typeof r.puzzleNo !== 'number') errs.push('puzzleNo');
    return errs;
  }

  // ------------------------------------------------------------------
  // Clock: counts up, never down. Pauses exclude time. 'hidden'/'user' pauses count toward pausedMs;
  // 'free' pauses (power-up picking) exclude time without counting as a pause.
  // ------------------------------------------------------------------
  function defaultNow() { return (global.performance && performance.now) ? performance.now() : Date.now(); }
  function Clock(now) {
    this.now = now || defaultNow;
    this.started = false; this.stopped = false;
    this.run = 0; this.paused = 0; this.last = 0; this.reasons = {};
  }
  Clock.prototype._tick = function () {
    if (!this.started || this.stopped) return;
    var t = this.now(), dt = t - this.last; this.last = t;
    var any = false, counts = false;
    for (var k in this.reasons) { any = true; if (k !== 'free') counts = true; }
    if (!any) this.run += dt;
    else if (counts) this.paused += dt;
  };
  Clock.prototype.start = function () { if (this.started) return; this.started = true; this.last = this.now(); };
  Clock.prototype.pause = function (reason) { this._tick(); this.reasons[reason || 'user'] = 1; };
  Clock.prototype.resume = function (reason) { this._tick(); delete this.reasons[reason || 'user']; };
  Clock.prototype.elapsed = function () { this._tick(); return Math.round(this.run); };
  Clock.prototype.pausedMs = function () { this._tick(); return Math.round(this.paused); };
  Clock.prototype.stop = function () { this._tick(); this.stopped = true; };
  Clock.prototype.restore = function (elapsedMs, pausedMs) {
    this.run = +elapsedMs || 0; this.paused = +pausedMs || 0;
    if (this.run > 0 || this.paused > 0) { this.started = true; this.last = this.now(); }
  };

  // ------------------------------------------------------------------
  // Icons (24x24). Fill classes: a b c h; stroke classes: sa sb.
  // ------------------------------------------------------------------
  var IC = {
    star: '<polygon class="a" points="12,2.6 14.6,9.1 21.5,9.4 16.1,13.8 17.9,20.6 12,16.8 6.1,20.6 7.9,13.8 2.5,9.4 9.4,9.1"/>',
    bag: '<path class="a" d="M5 8.6h14l1.4 11a2 2 0 0 1-2 2.3H5.6a2 2 0 0 1-2-2.3z"/><path class="sb" stroke-width="2" fill="none" d="M8.6 10V6.6a3.4 3.4 0 0 1 6.8 0V10"/>',
    gem: '<path class="a" d="M6.8 3.6h10.4L22 9.4 12 21.4 2 9.4z"/><path class="sb" fill="none" stroke-width="1.15" stroke-linejoin="round" d="M2 9.4h20M9.2 3.6 7.5 9.4 12 21.4l4.5-12-1.7-5.8"/>',
    sparkle: '<path class="a" d="M12 1.5l2.3 7.2 7.2 2.3-7.2 2.3L12 20.5l-2.3-7.2L2.5 11l7.2-2.3z"/><circle class="a" cx="19.5" cy="19.5" r="2"/>',
    magnet: '<path class="sa" fill="none" stroke-width="4.4" d="M6 3.5v8.3a6 6 0 0 0 12 0V3.5"/><rect class="c" x="3.8" y="2.4" width="4.4" height="4" rx="1"/><rect class="c" x="15.8" y="2.4" width="4.4" height="4" rx="1"/>',
    lens: '<circle class="sa" fill="none" stroke-width="2.8" cx="10" cy="10" r="6.4"/><circle class="h" cx="10" cy="10" r="5"/><path class="sb" stroke-width="3.4" stroke-linecap="round" d="M15 15l5.6 5.6"/>',
    double: '<rect class="a" x="2" y="4" width="20" height="16" rx="5"/><text class="h" x="12" y="16.6" text-anchor="middle" font-size="11.5" font-weight="900" font-family="system-ui,sans-serif">x2</text>',
    lucky: '<path class="sb" stroke-width="1.8" stroke-linecap="round" d="M12 12l3 9.4"/><circle class="a" cx="12" cy="7.4" r="3.6"/><circle class="a" cx="16.6" cy="12" r="3.6"/><circle class="a" cx="12" cy="16.6" r="3.6"/><circle class="a" cx="7.4" cy="12" r="3.6"/><circle class="h" cx="12" cy="12" r="1.6"/>',
    help: '<circle class="sa" fill="none" stroke-width="2.4" cx="12" cy="12" r="9.4"/><text class="a" x="12" y="16.8" text-anchor="middle" font-size="13" font-weight="900" font-family="system-ui,sans-serif">?</text>',
    copy: '<rect class="sa" fill="none" stroke-width="2.2" x="8" y="8" width="12" height="12" rx="2.4"/><path class="sa" fill="none" stroke-width="2.2" d="M16 5.4V5a1.6 1.6 0 0 0-1.6-1.6H5A1.6 1.6 0 0 0 3.4 5v9.4A1.6 1.6 0 0 0 5 16h.4"/>',
    check: '<path class="sa" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12.6l4.4 4.4L19 7.4"/>',
    clock: '<circle class="sa" fill="none" stroke-width="2.4" cx="12" cy="12" r="9"/><path class="sa" fill="none" stroke-width="2.4" stroke-linecap="round" d="M12 7v5.4l3.4 2"/>',
    close: '<path class="sa" fill="none" stroke-width="2.6" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/>',
    pause: '<rect class="a" x="6" y="5" width="4" height="14" rx="1.4"/><rect class="a" x="14" y="5" width="4" height="14" rx="1.4"/>',
    board: '<rect class="a" x="3" y="12" width="5" height="9" rx="1.2"/><rect class="b" x="9.5" y="5" width="5" height="16" rx="1.2"/><rect class="a" x="16" y="9" width="5" height="12" rx="1.2"/>',
    lantern: '<rect class="b" x="9" y="2" width="6" height="2.6" rx="1"/><path class="a" d="M7 6h10l-1 13H8z"/><circle class="h" cx="12" cy="12.4" r="2.6"/><rect class="b" x="8" y="19" width="8" height="2.6" rx="1"/>',
    bloom: '<circle class="a" cx="12" cy="6" r="3.6"/><circle class="a" cx="17.6" cy="10.4" r="3.6"/><circle class="a" cx="15.4" cy="17" r="3.6"/><circle class="a" cx="8.6" cy="17" r="3.6"/><circle class="a" cx="6.4" cy="10.4" r="3.6"/><circle class="h" cx="12" cy="12.2" r="3"/>',
    ring: '<circle class="sa" fill="none" stroke-width="3.2" cx="12" cy="12" r="7.2"/>',
    bud: '<path class="sa" fill="none" stroke-width="2.6" stroke-linejoin="round" d="M12 3.6c4 3.4 5.6 6.8 5.6 9.6a5.6 5.6 0 0 1-11.2 0c0-2.8 1.6-6.2 5.6-9.6z"/>',
    crumble: '<path class="a" d="M4 14l3-5 4 1 2-4 4 3 3 5-2 6H6z"/><path class="h" d="M10.5 10.5l1.5 4-2 3M15 11l-1 3.5"/>',
    drift: '<path class="a" d="M5 18c0-7 5-12 14-13-1 9-6 14-14 13z"/><path class="sb" fill="none" stroke-width="1.6" stroke-linecap="round" d="M5 18l8-8"/>'
  };
  function svg(name, cls) {
    return '<svg class="ag-ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (IC[name] || '') + '</svg>';
  }
  var PU = [
    { k: 'magnet', name: 'Magnet' },
    { k: 'lens', name: 'Lens' },
    { k: 'double', name: 'Double' },
    { k: 'lucky', name: 'Lucky' }
  ];

  // ------------------------------------------------------------------
  // Shared UI helpers (used by word.js / memory.js)
  // ------------------------------------------------------------------
  function prefersReduced() { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function itemArtFactory(renderItem, theme) {
    var cache = {};
    function art(rarity, item) {
      var id = 'find.' + rarity + '.' + item;
      if (id in cache) return cache[id];
      var out = null;
      if (typeof renderItem === 'function') {
        try {
          var r = renderItem(id, rarity);
          if (typeof r === 'string' && r) out = { html: r };
          else if (r && (r.html || r.svg)) out = { html: r.html || r.svg, name: r.name };
        } catch (e) { out = null; }
      }
      cache[id] = out;
      return out;
    }
    return {
      html: function (rarity, item) { var a = art(rarity, item); return a ? '<span class="ag-item">' + a.html + '</span>' : svg('gem', 'ag-r-' + rarity); },
      name: function (rarity, item) { var a = art(rarity, item); return a && a.name ? a.name : FIND_NAMES[theme][rarity][(+item || 0) % 4]; }
    };
  }

  // Generic sheet inside a game root
  function Sheet(root) {
    var scrim = document.createElement('div'); scrim.className = 'ag-scrim'; scrim.hidden = true;
    var el = document.createElement('div'); el.className = 'ag-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.hidden = true;
    root.appendChild(scrim); root.appendChild(el);
    var lastFocus = null;
    return {
      el: el,
      open: function (html, cls, label) {
        lastFocus = global.document && document.activeElement;
        el.className = 'ag-sheet ' + (cls || '');
        el.innerHTML = html;
        if (label) el.setAttribute('aria-label', label); else el.removeAttribute('aria-label');
        el.hidden = false; scrim.hidden = false;
        root.classList.add('ag-sheet-open');
        var f = el.querySelector('[data-autofocus]') || el.querySelector('button');
        if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      },
      close: function () {
        el.hidden = true; scrim.hidden = true; root.classList.remove('ag-sheet-open');
        if (lastFocus && lastFocus.focus && root.contains(lastFocus)) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      },
      isOpen: function () { return !el.hidden; }
    };
  }

  // Pack controller: pre-game power-up picks. targets: [{ i, rarity, item }] (gems or glints).
  // packed: { magnet:bool, lens:bool, double:i|null, lucky:i|null }. Max 3 used, 1 of each.
  function packUsed(p) { return (p.magnet ? 1 : 0) + (p.lens ? 1 : 0) + (p.double != null ? 1 : 0) + (p.lucky != null ? 1 : 0); }
  function packHtml(o) {
    // o: { inv, packed, targeting, targets, art, targetWord, tips }
    var used = packUsed(o.packed), chips = '';
    PU.forEach(function (p) {
      var on = p.k === 'magnet' || p.k === 'lens' ? !!o.packed[p.k] : o.packed[p.k] != null;
      var tgt = o.targeting === p.k;
      var dis = !on && !tgt && (o.inv[p.k] <= 0 || used >= 3);
      chips += '<button type="button" class="ag-pu-chip ag-pu-' + p.k + (on ? ' is-on' : '') + (tgt ? ' is-targeting' : '') + '" data-pu="' + p.k + '"' + (dis ? ' disabled' : '') +
        ' aria-pressed="' + (on || tgt) + '" aria-label="' + p.name + ', ' + o.inv[p.k] + ' available. ' + esc(o.tips[p.k]) + '">' +
        '<span class="ag-pu-ico">' + svg(p.k) + '</span><span class="ag-pu-name">' + p.name + '</span>' +
        '<span class="ag-pu-count">' + (on ? svg('check') : o.inv[p.k]) + '</span></button>';
    });
    var tg = '';
    o.targets.forEach(function (t, k) {
      var r = o.packed.lucky === t.i ? upRarity(t.rarity) : t.rarity;
      var show = !!o.packed.lens;
      var pickable = o.targeting === 'double' || (o.targeting === 'lucky' && show && t.rarity !== 'rare');
      var label = o.targetWord + ' ' + (k + 1) + (show ? ': ' + o.art.name(r, t.item) + ', ' + r : ', hidden until Lens') +
        (o.packed.double === t.i ? ', pays double' : '') + (o.packed.lucky === t.i ? ', lucky' : '');
      tg += '<button type="button" class="ag-pack-target' + (show ? ' ag-r-' + r : '') + (pickable ? ' is-pickable' : '') + '" data-target="' + t.i + '" aria-label="' + esc(label) + '"' + (o.targeting && !pickable ? ' disabled' : '') + '>' +
        '<span class="ag-pack-art">' + (show ? o.art.html(r, t.item) : svg('sparkle', 'ag-sparkle')) + '</span>' +
        '<span class="ag-pack-lab">' + (show ? esc(cap(r)) : esc(o.targetWord + ' ' + (k + 1))) + '</span>' +
        (o.packed.double === t.i ? '<span class="ag-pack-tag">x2</span>' : '') + (o.packed.lucky === t.i ? '<span class="ag-pack-tag">' + svg('lucky') + '</span>' : '') +
        '</button>';
    });
    var msg = o.targeting === 'double' ? 'Tap a ' + o.targetWord.toLowerCase() + ' to make it pay double.' :
      o.targeting === 'lucky' ? (o.packed.lens ? 'Tap a ' + o.targetWord.toLowerCase() + ' to raise its rarity.' : 'Lucky needs a Lens first, so you can see what it holds.') :
      'Power-ups add to your finds. They never change your score.';
    return '<div class="ag-pack-head"><span>' + esc(msg) + '</span><span class="ag-pack-used">' + used + ' of 3 used</span></div>' +
      '<div class="ag-pu-row" role="group" aria-label="Power-ups">' + chips + '</div>' +
      '<div class="ag-pack-targets" role="group" aria-label="' + esc(o.targetWord) + 's">' + tg + '</div>';
  }
  function packClick(o, ev) {
    // returns true if state changed
    var b = ev.target.closest('[data-pu]');
    if (b && !b.disabled) {
      var k = b.getAttribute('data-pu');
      if (k === 'magnet' || k === 'lens') { o.packed[k] = !o.packed[k]; if (k === 'lens' && !o.packed.lens && o.packed.lucky != null) o.packed.lucky = null; o.targeting = null; }
      else if (o.packed[k] != null) { o.packed[k] = null; o.targeting = null; }
      else o.targeting = o.targeting === k ? null : k;
      return true;
    }
    var t = ev.target.closest('[data-target]');
    if (t && !t.disabled && o.targeting) {
      var i = +t.getAttribute('data-target');
      if (o.targeting === 'lucky' && !o.packed.lens) return false;
      o.packed[o.targeting] = i; o.targeting = null;
      return true;
    }
    return false;
  }

  function starsHtml(n) {
    var s = '';
    for (var k = 0; k < 3; k++) s += '<span class="ag-rstar' + (k < n ? ' is-on' : '') + '" style="--d:' + k * 140 + 'ms">' + svg('star') + '</span>';
    return '<div class="ag-res-stars" role="img" aria-label="' + n + ' of 3 stars">' + s + '</div>';
  }
  function copyText(text, btn, done) {
    function ok() {
      if (btn) { btn.classList.add('is-copied'); var sp = btn.querySelector('span'); if (sp) { sp.textContent = 'Copied!'; setTimeout(function () { sp.textContent = 'Copy'; btn.classList.remove('is-copied'); }, 1600); } }
      if (done) done();
    }
    function fallback() {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        ta.remove();
      } catch (e2) { /* ignore */ }
      ok();
    }
    try {
      if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  function buzz(p) { try { if (global.navigator && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } }

  // Results-sheet "how you did" block, from LeaderboardSim + personal history (ranked, boards allowed).
  function standingHtml(result, opts) {
    if (!result || result.mode !== 'ranked' || opts.boards === false) {
      if (result && result.mode === 'relaxed') return '<p class="ag-standing-note">Played relaxed. Your result stays private.</p>';
      return '';
    }
    var entry = toBoardEntry(result), out = '';
    var band = LeaderboardSim.band(result.game, entry.difficulty, entry, result.seed);
    if (band && band.label) out += '<div class="ag-standing-band">' + esc(band.label) + '</div>';
    if (band && band.tie) out += '<div class="ag-standing-tie">' + esc(band.tie) + '</div>';
    if (opts.history) {
      var p = LeaderboardSim.personal(opts.history, entry);
      p.lines.forEach(function (l) { out += '<div class="ag-standing-pb">' + esc(l) + '</div>'; });
    }
    return out ? '<div class="ag-standing"><div class="ag-standing-sample">Compared with sample players</div>' + out + '</div>' : '';
  }

  // ------------------------------------------------------------------
  // LeaderboardSim: deterministic sample players, clearly labeled. Never real people.
  // ------------------------------------------------------------------
  var ADJ = ['Brave', 'Mossy', 'Sunny', 'Quiet', 'Lucky', 'Misty', 'Bright', 'Gentle', 'Swift', 'Cozy', 'Happy', 'Clever', 'Calm', 'Merry', 'Bold', 'Kind', 'Starry', 'Breezy'];
  var CRIT = ['Otter', 'Finch', 'Fox', 'Owl', 'Hare', 'Wren', 'Badger', 'Heron', 'Deer', 'Robin', 'Newt', 'Moth', 'Vole', 'Lark', 'Bee', 'Puffin'];
  var SPECIES = ['fox', 'owl', 'otter', 'deer', 'hare', 'bear'];
  var FRIENDS = ['BraveOtter-412', 'MossyFinch-077', 'SunnyHare-238', 'QuietOwl-519', 'CozyBadger-604', 'MistyWren-153'];
  var POP_N = 5000;
  var TIME_MED = { easy: 55, normal: 100, hard: 170 };
  var DIFF_I = { easy: 0, normal: 1, hard: 2 };
  var popCache = {};

  function trailPar(seedStr, difficulty) {
    var RG = global.RunGame;
    try {
      if (RG && RG._engine && seedStr != null) {
        var day = String(seedStr).replace(/^(trail|run)\|/, '').split('|')[0];
        var b = RG._engine.generate(day, TRAIL_DIFF[difficulty]);
        return { par: b.par, stepsMax: b.stepsMax };
      }
    } catch (e) { /* fall through */ }
    var par = { easy: 9, normal: 11, hard: 14 }[difficulty];
    return { par: par, stepsMax: par + (difficulty === 'easy' ? 3 : 2) };
  }
  function dayOf(seedOrNo) {
    if (typeof seedOrNo === 'number') return seedOrNo;
    var m = /(\d{4}-\d{2}-\d{2})/.exec(String(seedOrNo));
    return m ? m[1] : String(seedOrNo);
  }
  function population(game, difficulty, seedOrNo) {
    difficulty = normDiff(difficulty);
    var pn = puzzleNumber(seedOrNo), key = game + '|' + pn + '|' + difficulty;
    if (popCache[key]) return popCache[key];
    var rng = makeRng('sim|' + key), di = DIFF_I[difficulty], list = [];
    var tp = game === 'trail' ? trailPar(dayOf(seedOrNo), difficulty) : null;
    for (var i = 0; i < POP_N; i++) {
      var p, s = null, z = rng.normal();
      if (game === 'trail') {
        var x = rng.f(), stars;
        if (x < [0.6, 0.45, 0.3][di]) stars = 3; else { var y = rng.f(); stars = y < 0.7 ? 2 : y < 0.95 ? 1 : 0; }
        var steps;
        if (stars === 3) { var k = 0; while (rng.f() > 0.45 && tp.par + k < tp.stepsMax) k++; steps = tp.par + k; }
        else steps = Math.max(3, tp.stepsMax - rng.int(4));
        p = stars; s = steps;
      } else if (game === 'word') {
        var med = [2, 3.5, 4.5][di], cap0 = [4, 6, 7][di] + [4, 5, 6][di];
        p = Math.max(1, Math.min(cap0, Math.round(med * Math.exp(0.42 * z))));
      } else {
        var mean = [1, 2, 3.5][di], L = Math.exp(-mean), kk = 0, pr = 1;
        do { kk++; pr *= rng.f(); } while (pr > L);
        p = kk - 1;
        var pairs = [6, 8, 10][di];
        s = 2 * pairs + 2 * (p + Math.max(0, Math.round(pairs * 0.7 + rng.normal() * pairs * 0.3)));
      }
      var t = Math.round(TIME_MED[difficulty] * 1000 * Math.exp(0.38 * (0.6 * z + 0.8 * rng.normal())));
      if (rng.f() < 0.04) t = null;  // paused over a minute: off the Fastest tab
      list.push({ primary: p, secondary: s, tertiary: t, id: i });
    }
    var pop = { list: list, par: tp ? tp.par : null, stepsMax: tp ? tp.stepsMax : null, relaxed: 800 + makeRng('relaxed|' + key).int(900), puzzleNo: pn };
    popCache[key] = pop;
    return pop;
  }
  function simHandle(key, i) {
    var r = makeRng('h|' + key + '|' + i);
    return { handle: r.pick(ADJ) + r.pick(CRIT) + '-' + String(100 + r.int(900)), species: r.pick(SPECIES) };
  }
  function sortedIdx(game, pop, tab) {
    var k = '_s_' + tab;
    if (pop[k]) return pop[k];
    var arr = pop.list.filter(function (e) { return tab !== 'fast' || e.tertiary != null; }).slice();
    arr.sort(function (a, b) { return compare(game, a, b, tab) || a.id - b.id; });
    pop[k] = arr;
    return arr;
  }
  function countBetter(game, arr, entry, tab) {
    var better = 0, same = 0;
    for (var i = 0; i < arr.length; i++) {
      var c = tab === 'fast' ? cmpTime(arr[i].tertiary, entry.tertiary) : cmpMoves(game, arr[i], entry);
      if (c < 0) better++; else if (c === 0) same++;
    }
    return { better: better, same: same, worse: arr.length - better - same, n: arr.length };
  }
  // Kind copy (games doc 8.4): Top 1/5/10%, else "Fewer moves than N%" from the 30th up, else no percentile.
  function band(game, difficulty, entry, seedOrNo, tab) {
    if (!entry || entry.mode !== 'ranked') return null;
    tab = tab === 'fast' ? 'fast' : 'moves';
    if (tab === 'fast' && entry.tertiary == null) return { pct: null, label: 'Your time stays off the Fastest list today, since the game was paused for a while.' };
    var pop = population(game, difficulty, seedOrNo != null ? seedOrNo : entry.puzzleNo);
    var arr = tab === 'fast' ? pop.list.filter(function (e) { return e.tertiary != null; }) : pop.list;
    var c = countBetter(game, arr, entry, tab);
    var top = Math.ceil((c.better + 1) / (c.n + 1) * 100);
    var pctWorse = Math.floor((c.worse / c.n) * 100 / 5) * 5;
    var out = { pct: null, label: '', top: null };
    if (top <= 10) { var t = top <= 1 ? 1 : top <= 5 ? 5 : 10; out.top = t; out.pct = 100 - t; out.label = 'Top ' + t + '% today'; }
    else if (pctWorse >= 30) { out.pct = pctWorse; out.label = (tab === 'fast' ? 'Faster than ' : 'Fewer moves than ') + pctWorse + '% of players'; }
    else {
      out.label = game === 'word' ? 'Finished! Solved in ' + entry.primary + '.' :
        game === 'memory' ? 'Finished! ' + entry.primary + (entry.primary === 1 ? ' slip.' : ' slips.') :
        'Finished! ' + entry.primary + (entry.primary === 1 ? ' star.' : ' stars.');
    }
    if (game === 'trail' && tab === 'moves' && entry.primary === 3 && pop.par != null && entry.secondary <= pop.par) {
      var sh = Math.max(1, Math.round(c.same / c.n * 100));
      out.tie = 'You found the shortest trail, along with ' + sh + '% of players.';
    }
    return out;
  }
  function median(arr) { return arr[Math.floor((arr.length - 1) / 2)]; }
  // history: the player's earlier board entries (any puzzle) for this game. Filters to the same difficulty.
  function personal(history, entry) {
    var lines = [], res = { best: null, isBest: false, firstTime: false, betterThanUsual: false, lines: lines };
    if (!entry) return res;
    var game = entry.game;
    var h = (history || []).filter(function (e) { return e && e.game === game && normDiff(e.difficulty) === entry.difficulty && !(e.puzzleNo === entry.puzzleNo && e.mode === entry.mode && cmpMoves(game, e, entry) === 0 && e.tertiary === entry.tertiary); });
    var label = DIFF_LABEL[entry.difficulty];
    if (!h.length) { res.firstTime = true; res.isBest = true; res.best = entry; lines.push('Your first ' + label + ' board. That is your best so far!'); return res; }
    var sorted = h.slice().sort(function (a, b) { return compare(game, a, b, 'moves'); });
    res.best = compare(game, entry, sorted[0], 'moves') <= 0 ? entry : sorted[0];
    if (compare(game, entry, sorted[0], 'moves') < 0) { res.isBest = true; lines.push('New personal best on ' + label + '!'); }
    var recent = h.slice(-28);
    if (recent.length >= 3) {
      var med = median(recent.slice().sort(function (a, b) { return cmpMoves(game, a, b); }));
      if (cmpMoves(game, entry, med) < 0) { res.betterThanUsual = true; lines.push('Better than your usual'); }
    }
    return res;
  }
  function scoreText(game, e, withTime) {
    var t = '';
    if (game === 'trail') t = e.primary + (e.primary === 1 ? ' star' : ' stars') + ' · ' + e.secondary + ' steps';
    else if (game === 'word') t = e.primary + (e.primary === 1 ? ' guess' : ' guesses');
    else t = e.primary + (e.primary === 1 ? ' slip' : ' slips') + ' · ' + e.secondary + ' flips';
    if (withTime && e.tertiary != null) t += ' · ' + fmtTime(e.tertiary);
    return t;
  }
  // board({ game, difficulty, scope:'global'|'friends', tab:'moves'|'fast', seed, me }) -> rows (top 10)
  function board(o) {
    var game = o.game, difficulty = normDiff(o.difficulty), tab = o.tab === 'fast' ? 'fast' : 'moves';
    var scope = o.scope === 'friends' ? 'friends' : 'global';
    var seedOrNo = o.seed != null ? o.seed : o.puzzleNo;
    var pop = population(game, difficulty, seedOrNo), key = game + '|' + pop.puzzleNo + '|' + difficulty;
    var me = o.me && o.me.primary != null ? o.me : (o.me ? toBoardEntry(o.me) : null);
    if (me && (me.game !== game || me.difficulty !== difficulty || me.puzzleNo !== pop.puzzleNo)) me = null;
    var meRanked = me && me.mode === 'ranked' && !(tab === 'fast' && me.tertiary == null);
    var rows = [], out = { sample: true, scope: scope, tab: tab, game: game, difficulty: difficulty, puzzleNo: pop.puzzleNo, rows: rows, me: null, relaxedCount: pop.relaxed, total: POP_N };
    var cmp = function (a, b) { return compare(game, a, b, tab); };
    if (scope === 'friends') {
      var fr = makeRng('friends|' + key), list = [];
      FRIENDS.forEach(function (hn, k) {
        var e = pop.list[fr.int(pop.list.length)];
        if (tab === 'fast' && e.tertiary == null) return;
        list.push({ handle: hn, species: SPECIES[k % SPECIES.length], primary: e.primary, secondary: e.secondary, tertiary: e.tertiary, sample: true });
      });
      if (meRanked) list.push({ handle: o.myName || 'You', species: o.mySpecies || 'fox', primary: me.primary, secondary: me.secondary, tertiary: me.tertiary, isMe: true, sample: false });
      list.sort(cmp);
      list.forEach(function (r, k) { r.rank = k + 1; rows.push(r); if (r.isMe) out.me = { rank: k + 1, band: band(game, difficulty, me, seedOrNo, tab) }; });
      out.total = list.length;
    } else {
      var arr = sortedIdx(game, pop, tab), meRank = null;
      if (meRanked) { meRank = 1; for (var q = 0; q < arr.length; q++) if (cmp(arr[q], me) < 0) meRank++; }  // ties go to you
      var shown = 0, rank = 1, idx = 0;
      while (shown < 10 && idx <= arr.length) {
        if (meRanked && rank === meRank) {
          rows.push({ rank: rank, handle: o.myName || 'You', species: o.mySpecies || 'fox', primary: me.primary, secondary: me.secondary, tertiary: me.tertiary, isMe: true, sample: false });
          shown++; rank++; continue;
        }
        if (idx >= arr.length) break;
        var e2 = arr[idx++], hs = simHandle(key, e2.id);
        rows.push({ rank: rank, handle: hs.handle, species: hs.species, primary: e2.primary, secondary: e2.secondary, tertiary: e2.tertiary, sample: true });
        shown++; rank++;
      }
      if (meRanked) out.me = { rank: meRank, band: band(game, difficulty, me, seedOrNo, tab) };
      out.total = arr.length + (meRanked ? 1 : 0);
    }
    if (me && !meRanked) out.me = { rank: null, band: me.mode === 'ranked' ? band(game, difficulty, me, seedOrNo, tab) : null, relaxed: me.mode !== 'ranked' };
    return out;
  }

  var SPECIES_COLOR = { fox: '#e58a2e', owl: '#8a6bb8', otter: '#6b8e9e', deer: '#b07a4a', hare: '#9aa36b', bear: '#7a5a46' };
  function speciesBadge(sp) {
    return '<span class="lb-species" style="--sp:' + (SPECIES_COLOR[sp] || '#888') + '" role="img" aria-label="' + esc(cap(sp)) + ' companion">' + esc(sp.charAt(0).toUpperCase()) + '</span>';
  }

  // render(el, opts): full leaderboard view the app can drop into a sheet.
  // opts: { game, difficulty, theme, seed, me (result or entry), history, scope, tab, kid, switchGame, onClose, mySpecies }
  function render(host, opts) {
    opts = opts || {};
    var state = {
      game: opts.game || 'word', difficulty: normDiff(opts.difficulty || 'normal'), scope: opts.scope === 'friends' ? 'friends' : 'global',
      tab: opts.tab === 'fast' ? 'fast' : 'moves'
    };
    var theme = opts.theme === 'grove' ? 'grove' : 'expedition';
    var root = document.createElement('div');
    root.className = 'lb-root ag-theme-' + theme;
    root.setAttribute('data-sample', 'true');
    host.appendChild(root);
    function meFor() {
      var all = [].concat(opts.me || []), found = null;
      all.forEach(function (m) {
        var e = m && m.primary !== undefined && m.score === undefined ? m : toBoardEntry(m);
        if (e && e.game === state.game && e.difficulty === state.difficulty) found = e;
        if (m && m.mode === 'relaxed' && m.game === state.game && normDiff(m.difficulty) === state.difficulty && !found) found = toBoardEntry(m);
      });
      return found;
    }
    function draw() {
      var name = gameName(state.game, theme), dl = DIFF_LABEL[state.difficulty];
      var head = '<div class="lb-head"><div><div class="lb-kicker">Leaderboard</div><h3 class="lb-h">' + esc(name) + ' &middot; ' + dl + '</h3></div>' +
        (opts.onClose ? '<button type="button" class="lb-close" data-lb="close" aria-label="Close leaderboard">' + svg('close') + '</button>' : '') + '</div>';
      var gameSeg = opts.switchGame === false ? '' : '<div class="lb-seg" role="group" aria-label="Game">' + ['trail', 'word', 'memory'].map(function (g) {
        return '<button type="button" class="lb-segbtn' + (g === state.game ? ' is-on' : '') + '" data-lb-game="' + g + '" aria-pressed="' + (g === state.game) + '">' + esc(gameName(g, theme)) + '</button>';
      }).join('') + '</div>';
      var diffSeg = '<div class="lb-seg" role="group" aria-label="Difficulty">' + DIFFS.map(function (d) {
        return '<button type="button" class="lb-segbtn' + (d === state.difficulty ? ' is-on' : '') + '" data-lb-diff="' + d + '" aria-pressed="' + (d === state.difficulty) + '">' + DIFF_LABEL[d] + '</button>';
      }).join('') + '</div>';
      if (opts.kid) {
        var hist = (opts.history || []).filter(function (e) { return e && e.game === state.game && normDiff(e.difficulty) === state.difficulty; });
        var best = hist.slice().sort(function (a, b) { return compare(state.game, a, b, 'moves'); })[0];
        root.innerHTML = head + gameSeg + diffSeg + '<div class="lb-kid"><p>Here are your own bests. Keep exploring!</p>' +
          (best ? '<div class="lb-mecard"><div class="lb-me-lab">Your best</div><div class="lb-me-score">' + esc(scoreText(state.game, best, false)) + '</div></div>' : '<p class="lb-empty">Play this one to set your first best.</p>') + '</div>';
        return;
      }
      var me = meFor();
      var b = board({ game: state.game, difficulty: state.difficulty, scope: 'global', tab: state.tab, seed: opts.seed, me: me, mySpecies: opts.mySpecies, myName: opts.myName });
      var banner = '<div class="lb-banner" role="note">' + svg('help') + '<span><b>Sample players: not real people.</b> Real boards come with accounts.</span></div>';
      var scopeSeg = '<div class="lb-seg lb-seg-sm" role="group" aria-label="Who to compare with">' + [['global', 'Everyone'], ['friends', 'Friends']].map(function (s) {
        return '<button type="button" class="lb-segbtn' + (s[0] === state.scope ? ' is-on' : '') + '" data-lb-scope="' + s[0] + '" aria-pressed="' + (s[0] === state.scope) + '">' + s[1] + '</button>';
      }).join('') + '</div>';
      var tabs = '<div class="lb-tabs" role="tablist" aria-label="Sort by">' + [['moves', 'Fewest moves'], ['fast', 'Fastest']].map(function (t) {
        return '<button type="button" role="tab" class="lb-tab' + (t[0] === state.tab ? ' is-on' : '') + '" data-lb-tab="' + t[0] + '" aria-selected="' + (t[0] === state.tab) + '">' + t[1] + '</button>';
      }).join('') + '</div>';
      var meCard;
      if (!me) meCard = '<div class="lb-mecard is-empty"><div class="lb-me-lab">You</div><div class="lb-me-band">Finish today’s ' + dl + ' board in Ranked to see where you land.</div></div>';
      else if (me.mode !== 'ranked') meCard = '<div class="lb-mecard"><div class="lb-me-lab">You</div><div class="lb-me-band">You played it relaxed. Relaxed games stay private and pay the same.</div></div>';
      else {
        var pl = opts.history ? personal(opts.history, me).lines : [];
        meCard = '<div class="lb-mecard"><div class="lb-me-lab">' + esc(opts.myName || 'You') + ' &middot; you</div>' +
          '<div class="lb-me-score">' + esc(scoreText(state.game, me, state.tab === 'fast')) + '</div>' +
          (b.me && b.me.band ? '<div class="lb-me-band">' + esc(b.me.band.label) + '</div>' + (b.me.band.tie ? '<div class="lb-me-tie">' + esc(b.me.band.tie) + '</div>' : '') : '') +
          pl.map(function (l) { return '<div class="lb-me-pb">' + esc(l) + '</div>'; }).join('') + '</div>';
      }
      var rows = b.rows.map(function (r) {
        return '<li class="lb-row' + (r.isMe ? ' is-me' : '') + '"><span class="lb-rank">' + r.rank + '</span>' + speciesBadge(r.species) +
          '<span class="lb-name">' + esc(r.handle) + '</span>' +
          '<span class="lb-score">' + esc(scoreText(state.game, r, state.tab === 'fast')) + '</span>' +
          (r.sample ? '<span class="lb-tag">sample</span>' : '<span class="lb-tag lb-tag-you">you</span>') + '</li>';
      }).join('');
      var list = rows ? '<ol class="lb-rows" aria-label="' + (state.scope === 'friends' ? 'Friends' : 'Top 10') + '">' + rows + '</ol>' : '<p class="lb-empty">No sample results on this list yet.</p>';
      // v5.5 round 2: no Friends tab until Crews exist (PM G6).
      root.innerHTML = head + banner + gameSeg + diffSeg + tabs + meCard +
        '<div class="lb-sub">Top 10 today</div>' + list +
        '<p class="lb-foot">' + fmtNum(b.relaxedCount) + ' sample players played it relaxed today.</p>' +
        (state.game === 'trail' ? '' : '<p class="lb-foot">Power-ups never show up here. They change finds, never scores.</p>');
    }
    function onClick(ev) {
      var t = ev.target.closest('button'); if (!t || !root.contains(t)) return;
      if (t.hasAttribute('data-lb-game')) state.game = t.getAttribute('data-lb-game');
      else if (t.hasAttribute('data-lb-diff')) state.difficulty = t.getAttribute('data-lb-diff');
      else if (t.hasAttribute('data-lb-scope')) state.scope = t.getAttribute('data-lb-scope');
      else if (t.hasAttribute('data-lb-tab')) state.tab = t.getAttribute('data-lb-tab');
      else if (t.getAttribute('data-lb') === 'close') { if (opts.onClose) opts.onClose(); return; }
      else return;
      var sel = t.getAttribute('data-lb-game') ? '[data-lb-game="' + state.game + '"]' : t.getAttribute('data-lb-diff') ? '[data-lb-diff="' + state.difficulty + '"]' : t.getAttribute('data-lb-scope') ? '[data-lb-scope="' + state.scope + '"]' : '[data-lb-tab="' + state.tab + '"]';
      draw();
      var f = root.querySelector(sel); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    root.addEventListener('click', onClick);
    draw();
    return {
      el: root,
      update: function (o2) { for (var k in o2) { if (k in state) state[k] = k === 'difficulty' ? normDiff(o2[k]) : o2[k]; else opts[k] = o2[k]; } draw(); },
      getState: function () { return { game: state.game, difficulty: state.difficulty, scope: state.scope, tab: state.tab }; },
      destroy: function () { root.removeEventListener('click', onClick); if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }

  // v5.5 round 2: the game's own intro is the only intro. It carries the difficulty choice (the host remounts through
  // opts.onDifficulty) and, for ranked boards, a quiet "Play without the clock" (relaxed pays the same).
  var DIFF_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
  function introControls(opts, mode, difficulty) {
    var seg = typeof opts.onDifficulty === 'function' ? '<div class="ig-seg" role="radiogroup" aria-label="Difficulty">' + ['easy', 'normal', 'hard'].map(function (d) {
      var on = normDiff(difficulty) === d, done = opts.played && opts.played[d];
      return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '" data-act="diff" data-v="' + d + '">' + DIFF_NAMES[d] + (done ? ' ✓' : '') + '</button>';
    }).join('') + '</div>' : '';
    var relax = mode === 'ranked' ? '<button type="button" class="ig-relax" data-act="relax">Play without the clock</button>' : '';
    return seg + relax;
  }
  var LeaderboardSim = {
    board: board, band: band, personal: personal, render: render, population: population,
    scoreText: scoreText, FRIENDS: FRIENDS, POP_N: POP_N
  };

  // ------------------------------------------------------------------
  // Registry and convenience mount
  // ------------------------------------------------------------------
  var Arcade = {
    get games() { return { trail: global.RunGame || null, word: global.WordGame || null, memory: global.MemoryGame || null }; },
    GAMES: ['trail', 'word', 'memory'],
    DIFFS: DIFFS, DIFF_LABEL: DIFF_LABEL, TRAIL_DIFF: TRAIL_DIFF, GAME_NAMES: GAME_NAMES,
    gameName: gameName,
    seed: seed, practiceSeed: practiceSeed, puzzleNumber: puzzleNumber,
    toBoardEntry: toBoardEntry, compare: compare, validateResult: validateResult, PAUSE_LIMIT_MS: PAUSE_LIMIT_MS,
    // Arcade.mount('word', el, opts) -> { destroy, getState } or null when that game's script is absent.
    mount: function (game, el, opts) {
      var G = this.games[game];
      if (!G || typeof G.mount !== 'function') return null;
      return G.mount(el, opts || {});
    },
    LeaderboardSim: LeaderboardSim,
    _util: {
      hashStr: hashStr, makeRng: makeRng, rollRarity: rollRarity, upRarity: upRarity, esc: esc, cap: cap, fmtTime: fmtTime,
      normDiff: normDiff, Clock: Clock, svg: svg, IC: IC, PU: PU, FIND_NAMES: FIND_NAMES, prefersReduced: prefersReduced,
      itemArtFactory: itemArtFactory, Sheet: Sheet, packHtml: packHtml, packClick: packClick, packUsed: packUsed,
      starsHtml: starsHtml, copyText: copyText, buzz: buzz, standingHtml: standingHtml, introControls: introControls
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Arcade;
  global.Arcade = Arcade;
  global.LeaderboardSim = LeaderboardSim;
})(typeof window !== 'undefined' ? window : globalThis);
