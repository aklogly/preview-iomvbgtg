/* Kindling v5.5 - Rune Stones (Expedition) / Petal Words (Grove). Prototype module.
 * An original letter-tray deduction game: a fixed tray of the answer's letters plus decoys,
 * any arrangement is a guess, stones answer with shapes, lit stones lock, decoys leave,
 * a clue arrives on a schedule, and a kind lantern makes sure every board finishes.
 * Exposes window.WordGame. Needs arcade.js loaded first (in Node: require('./arcade.js')).
 * The engine (generate / feedback / Session) is DOM-free and testable in Node.
 */
(function (global) {
  'use strict';
  var Arcade = global.Arcade || (typeof require === 'function' ? require('./arcade.js') : null);
  var U = Arcade._util;
  var makeRng = U.makeRng, esc = U.esc, cap = U.cap, svg = U.svg;

  // ------------------------------------------------------------------
  // Word list (36 per length): shared by both themes, nature and outdoors, about an age-8 reading level.
  // No body/health/medical words, no plurals ending in S, no US/UK spelling splits.
  // cat = the vaguer Hard clue.
  // ------------------------------------------------------------------
  var O = 'Found outdoors', A = 'An animal', G = 'Something growing', C = 'At the campsite';
  function L(rows) { return rows.map(function (r) { return { w: r[0], clue: r[1], cat: r[2] }; }); }
  var LIST = {
    4: L([
      ['LEAF', 'Falls from a tree in autumn', G], ['POND', 'Small still water where frogs live', O], ['NEST', 'A bird builds one', O],
      ['MOSS', 'Soft green carpet on rocks', G], ['FERN', 'Leafy plant of shady woods', G], ['SEED', 'A plant starts as one', G],
      ['WIND', 'Moves the clouds along', O], ['ROCK', 'A hard piece of the ground', O],
      ['RAIN', 'Falls from clouds', O], ['STAR', 'Twinkles at night', O], ['MOON', 'Lights the night sky', O],
      ['LAKE', 'Water with shore all around', O], ['PATH', 'A way to walk through the woods', O], ['BIRD', 'Has feathers and wings', A],
      ['FROG', 'Hops and croaks', A], ['SNOW', 'White and cold, falls in winter', O], ['WAVE', 'Rolls onto the beach', O],
      ['TENT', 'Sleep in it when camping', C], ['LAMP', 'Gives light after dark', C], ['BOAT', 'Floats on water', C],
      ['DEER', 'Quiet forest animal; some have antlers', A], ['PINE', 'Tree with needles and cones', G], ['CAVE', 'A hollow in a hillside', O],
      ['BARK', 'Rough coat on a tree trunk', G], ['DUCK', 'Swims and quacks', A], ['GOAT', 'Farm animal that loves to climb', A],
      ['HIVE', 'Home for a busy group of bees', O], ['KITE', 'Flies on a string in the wind', C], ['MOLE', 'Digs tunnels under the lawn', A],
      ['ROOT', 'Part of a plant under the soil', G], ['SAND', 'Tiny grains on the beach', O], ['TREE', 'Tall plant with a trunk', G],
      ['FAWN', 'A baby deer', A], ['COVE', 'A small bay on the coast', O], ['GLOW', 'Soft light from a firefly', O], ['CLAY', 'Wet earth you can shape into a pot', O]
    ]),
    5: L([
      ['RIVER', 'Flows downhill to the sea', O], ['CLOUD', 'Floats in the sky', O], ['STONE', 'A small piece of rock', O],
      ['MAPLE', 'Tree with a famous leaf and sweet syrup', G], ['TRAIL', 'A path through the woods', O], ['BERRY', 'Small juicy fruit on a bush', G],
      ['ACORN', 'An oak tree’s seed', G], ['OTTER', 'Playful swimmer that floats on its back', A], ['CREEK', 'A small stream', O],
      ['PETAL', 'Part of a flower', G], ['CABIN', 'Little wooden house in the woods', C], ['EAGLE', 'Big bird with sharp eyes', A],
      ['TORCH', 'A light you can carry', C], ['BLOOM', 'A flower opening up', G],
      ['CLIFF', 'A steep wall of rock', O], ['OCEAN', 'The biggest water of all', O],
      ['HONEY', 'Bees make it', O], ['ROBIN', 'Bird with an orange-red chest', A], ['TULIP', 'Spring flower shaped like a cup', G],
      ['CANOE', 'Paddle this narrow boat', C],
      ['APPLE', 'Crunchy fruit that grows on a tree', G], ['PLANT', 'Grows in soil and needs sun', G], ['DAISY', 'White flower with a yellow middle', G],
      ['HERON', 'Tall bird that wades in ponds', A], ['PANDA', 'Black-and-white bear that eats bamboo', A], ['KOALA', 'Sleepy animal that hugs trees', A],
      ['CORAL', 'Grows in warm, clear seas', O], ['BENCH', 'A seat in the park', C], ['FLAME', 'Dances in the campfire', C],
      ['MARSH', 'Wet, grassy land near water', O], ['SNAIL', 'Slow crawler that carries its home', A], ['WHALE', 'The biggest animal in the sea', A],
      ['ZEBRA', 'Horse-like animal with stripes', A], ['FROST', 'Icy sparkle on a cold morning', O], ['BIRCH', 'Tree with white, papery bark', G],
      ['CEDAR', 'Sweet-smelling evergreen tree', G]
    ]),
    6: L([
      ['MEADOW', 'Grassy field full of wildflowers', O], ['SPROUT', 'A tiny new plant', G], ['FOREST', 'Lots and lots of trees', G],
      ['CANYON', 'Deep valley with steep walls', O],
      ['GARDEN', 'Where flowers and vegetables grow', G], ['ISLAND', 'Land with water all around', O],
      ['SUMMIT', 'The top of a mountain', O], ['VALLEY', 'Low land between hills', O], ['BEETLE', 'Insect with a hard shiny shell', A],
      ['PUFFIN', 'Seabird with a colorful beak', A], ['RABBIT', 'Long ears, loves to hop', A], ['FALCON', 'A very fast bird', A],
      ['ORCHID', 'A fancy flower', G], ['TURTLE', 'Carries its home on its back', A],
      ['SPRING', 'Season of new growth', O], ['SUNSET', 'The sky turns orange as the sun goes down', O], ['PARROT', 'Colorful bird that can talk', A],
      ['KETTLE', 'Heat water on the campfire', C], ['PICNIC', 'Lunch on a blanket outside', C],
      ['CLOVER', 'Little plant with three round leaves', G], ['LAGOON', 'Calm water near the sea', O], ['SALMON', 'Fish that swims upstream', A],
      ['PLANET', 'Earth is one of these', O], ['FLOWER', 'Has petals and a stem', G], ['FOSSIL', 'An old shape left in rock', O],
      ['CANDLE', 'A wax light with a wick', C], ['TOUCAN', 'Bird with a giant, colorful beak', A], ['MONKEY', 'Swings from tree to tree', A],
      ['POLLEN', 'Yellow dust that bees carry', G], ['BADGER', 'Striped digger of the woods', A], ['DONKEY', 'Gentle farm animal with long ears', A],
      ['PUDDLE', 'Fun to splash in after rain', O], ['TOMATO', 'Red fruit that grows on a vine', G], ['WALNUT', 'A nut with a wrinkly shell', G],
      ['RIPPLE', 'A tiny wave on a pond', O], ['LIZARD', 'Small reptile that suns on rocks', A]
    ])
  };

  // Tray screening list (reviewed internally; never rendered). Rude, medical, scary and unkind words, 3-6 letters.
  // Answers whose own letters can spell one of these are kept out of the list (tested), and a tray is
  // rejected when a decoy makes one spellable.
  var BLOCK = ('ASS BUTT POO POOP PEE PISS FART CRAP DAMN HELL SHIT FUCK TIT TITS BOOB SEX SEXY NUDE NAKED ' +
    'DIE DIED DEAD DEATH KILL GUN GUNS BLOOD GORE STAB HATE HURT ILL SICK PILL PILLS DOSE PAIN CURE SHOT DRUG ' +
    'DRUGS METH BEER DRUNK WEED RAPE NAZI PORN TOMB GRAVE CORPSE BOMB FAT UGLY DUMB IDIOT MORON JERK SLUT ' +
    'WHORE COCK DICK PENIS ANUS ANAL BITCH PUKE VOMIT TUMOR CANCER VIRUS FEVER ACHE WOUND').split(' ');

  var DIFF = {
    easy: { len: 4, decoys: 1, clueAfter: 0, firstLit: true, blockNotHere: true, assistAfter: 4, stars: [2, 4], gems: 1, vague: false },
    normal: { len: 5, decoys: 2, clueAfter: 2, firstLit: false, blockNotHere: false, assistAfter: 6, stars: [3, 5], gems: 2, vague: false },
    hard: { len: 6, decoys: 3, clueAfter: 3, firstLit: false, blockNotHere: false, assistAfter: 7, stars: [4, 6], gems: 3, vague: true }
  };
  var DECOY_POOL = 'EARIOTNSLCUDPMHGBFYWK';

  function counts(s) { var c = {}; for (var i = 0; i < s.length; i++) c[s[i]] = (c[s[i]] || 0) + 1; return c; }
  function canBuild(have, word) {
    var c = counts(word);
    for (var k in c) if ((have[k] || 0) < c[k]) return false;
    return true;
  }
  function blockedBy(trayLetters, answer) {
    var have = counts(trayLetters), own = counts(answer);
    for (var i = 0; i < BLOCK.length; i++) {
      var w = BLOCK[i];
      if (w.length > trayLetters.length) continue;
      if (canBuild(have, w) && !canBuild(own, w)) return w;
    }
    return null;
  }
  function dailyIndex(puzzleNo, n) { return (((puzzleNo * 7 + 3) % n) + n) % n; }

  var cache = {};
  // generate(seed, difficulty): seed is a game-day string ('2026-11-15') or a practice seed ('practice|2026-11-15|1').
  function generate(seed, difficulty) {
    difficulty = DIFF[difficulty] ? difficulty : 'easy';
    var key = String(seed) + '|' + difficulty;
    if (cache[key]) return cache[key];
    var cfg = DIFF[difficulty], practice = /^practice\|/.test(String(seed));
    var rng = makeRng('word|' + seed + '|' + difficulty);
    var puzzleNo = Arcade.puzzleNumber(seed), list = LIST[cfg.len];
    var idx = dailyIndex(puzzleNo, list.length);
    if (practice) {
      var dailyIdx = idx;
      idx = rng.int(list.length);
      if (idx === dailyIdx) idx = (idx + 1 + rng.int(list.length - 1)) % list.length;  // never rehearse today's daily
    }
    var entry = list[idx], answer = entry.w;
    var pool = DECOY_POOL.split('').filter(function (ch) { return answer.indexOf(ch) < 0; });
    var letters = null, decoys = null;
    for (var attempt = 0; attempt < 40; attempt++) {
      var p = pool.slice(), d = [];
      while (d.length < cfg.decoys && p.length) {
        var k = Math.floor(p.length * Math.pow(rng.f(), 1.6)), ch = p.splice(k, 1)[0];
        if (!blockedBy(answer + d.join('') + ch, answer)) d.push(ch);   // skip a decoy that would make a blocked word
      }
      if (d.length < cfg.decoys) continue;
      var cand = answer + d.join('');
      if (!blockedBy(cand, answer)) { letters = cand; decoys = d; break; }
    }
    if (!letters) throw new Error('No clean tray for ' + answer);  // never expected; tests sweep every daily board
    var tray = letters.split('').map(function (ch, i) { return { id: 0, ch: ch, decoy: i >= answer.length, gem: null }; });
    for (var sh = 0; sh < 10; sh++) {
      rng.shuffle(tray);
      if (tray.slice(0, answer.length).map(function (t) { return t.ch; }).join('') !== answer) break;
    }
    tray.forEach(function (t, i) { t.id = i; });
    if (!practice) {
      var spots = tray.map(function (t) { return t.id; });
      rng.shuffle(spots);
      spots.slice(0, cfg.gems).forEach(function (i) { tray[i].gem = { rarity: U.rollRarity(rng, false), item: rng.int(4) }; });
    }
    var b = {
      seed: seed, difficulty: difficulty, practice: practice, puzzleNo: puzzleNo,
      answer: answer, length: answer.length, tray: tray, decoys: decoys,
      clue: cfg.vague ? entry.cat : entry.clue, clueAfter: cfg.clueAfter, firstLit: cfg.firstLit,
      blockNotHere: cfg.blockNotHere, assistAfter: cfg.assistAfter, stars: cfg.stars.slice(), maxGuesses: cfg.assistAfter + answer.length
    };
    cache[key] = b;
    return b;
  }

  // Two-pass, repeat-safe: each answer letter justifies at most one lit or warm.
  function feedback(guess, answer) {
    var n = answer.length, out = new Array(n), left = {};
    for (var i = 0; i < n; i++) {
      if (guess[i] === answer[i]) out[i] = 'lit';
      else left[answer[i]] = (left[answer[i]] || 0) + 1;
    }
    for (var j = 0; j < n; j++) {
      if (out[j]) continue;
      if (left[guess[j]] > 0) { out[j] = 'warm'; left[guess[j]]--; }
      else out[j] = 'cold';
    }
    return out;
  }
  function starsFor(difficulty, guesses) {
    var s = (DIFF[difficulty] || DIFF.easy).stars;
    return guesses <= s[0] ? 3 : guesses <= s[1] ? 2 : 1;
  }

  // ------------------------------------------------------------------
  // Session: the rules, DOM-free. packed = { magnet, lens, double: stoneId|null, lucky: stoneId|null }.
  // Power-ups only change which finds are paid; nothing here lets them touch feedback or guesses.
  // ------------------------------------------------------------------
  function Session(board, o) {
    o = o || {};
    this.b = board;
    this.practice = !!board.practice;
    var pk = o.packed || {};
    this.packed = this.practice ? { magnet: false, lens: false, double: null, lucky: null } :
      { magnet: !!pk.magnet, lens: !!pk.lens, double: pk.double != null ? pk.double : null, lucky: pk.lucky != null ? pk.lucky : null };
    this.locked = new Array(board.length);
    for (var i = 0; i < board.length; i++) this.locked[i] = null;
    this.notHere = board.answer.split('').map(function () { return {}; });
    this.removed = {};
    this.rows = []; this.log = [];
    this.assisted = 0; this.solved = false;
    this.paid = {}; this.finds = []; this.magnetPaid = 0;
    this.pendingLantern = null;
    if (board.firstLit) this._lock(0);
  }
  Session.prototype._stoneFor = function (slot) {
    var ch = this.b.answer[slot], self = this, inUse = {};
    this.locked.forEach(function (id) { if (id != null) inUse[id] = 1; });
    var s = this.b.tray.filter(function (t) { return t.ch === ch && !inUse[t.id] && !self.removed[t.id]; })[0];
    return s ? s.id : null;
  };
  Session.prototype._lock = function (slot) {
    var id = this._stoneFor(slot);
    if (id == null) return null;
    this.locked[slot] = id;
    this._payGem(id);
    return id;
  };
  Session.prototype._payGem = function (id) {
    var t = this.b.tray[id];
    if (this.practice || !t.gem || this.paid[id]) return null;
    this.paid[id] = 1;
    var r = this.packed.lucky === id ? U.upRarity(t.gem.rarity) : t.gem.rarity, f = { id: 'find.' + r + '.' + t.gem.item, rarity: r };
    if (this.packed.lucky === id) f.pu = true;
    this.finds.push(f);
    if (this.packed.double === id) this.finds.push({ id: f.id, rarity: f.rarity, pu: true });
    return { stone: id, rarity: r, item: t.gem.item, doubled: this.packed.double === id };
  };
  Session.prototype.available = function () {
    var self = this, inUse = {};
    this.locked.forEach(function (id) { if (id != null) inUse[id] = 1; });
    return this.b.tray.filter(function (t) { return !inUse[t.id] && !self.removed[t.id]; });
  };
  Session.prototype.clueShown = function () { return this.rows.length >= this.b.clueAfter; };
  Session.prototype.canPlace = function (id, slot) {
    if (this.locked[slot] != null) return false;
    var t = this.b.tray[id];
    if (!t || this.removed[t.id]) return false;
    if (this.b.blockNotHere && this.notHere[slot][t.ch]) return false;
    return true;
  };
  // ids: stone id per slot (locked slots may be omitted/null; they are filled in). Returns events.
  Session.prototype.guess = function (ids) {
    if (this.solved) return { error: 'solved' };
    var n = this.b.length, full = [], used = {};
    for (var i = 0; i < n; i++) {
      var id = this.locked[i] != null ? this.locked[i] : ids[i];
      if (id == null || this.removed[id] || used[id] || !this.b.tray[id]) return { error: 'incomplete' };
      if (this.locked[i] == null && !this.canPlace(id, i)) return { error: 'blocked' };
      used[id] = 1; full.push(id);
    }
    var self = this, letters = full.map(function (id) { return self.b.tray[id].ch; }).join('');
    var fb = feedback(letters, this.b.answer), ev = { fb: fb, letters: letters, ids: full, gems: [], cold: [], newlyLit: [], magnet: 0, lantern: null, clueNow: false };
    var wasLocked = this.locked.slice();
    for (var s = 0; s < n; s++) {
      var sid = full[s];
      if (fb[s] === 'lit') {
        if (wasLocked[s] == null) { this.locked[s] = sid; ev.newlyLit.push(s); var g = this._payGem(sid); if (g) ev.gems.push(g); }
      } else if (fb[s] === 'warm') {
        this.notHere[s][letters[s]] = 1;
      } else {
        this.removed[sid] = 1; ev.cold.push(sid);
        var g2 = this._payGem(sid); if (g2) ev.gems.push(g2);
      }
    }
    var clueBefore = this.clueShown();
    this.rows.push({ letters: letters, ids: full, fb: fb, lantern: this.pendingLantern });
    this.pendingLantern = null;
    this.log.push(letters);
    if (this.rows.length === 1 && this.packed.magnet && !this.practice) {
      var lit = fb.filter(function (x) { return x === 'lit'; }).length, k = Math.min(3, lit);
      for (var m = 0; m < k; m++) this.finds.push({ id: 'find.common.' + ((this.b.puzzleNo + m) % 4 + 4) % 4, rarity: 'common', pu: true });
      this.magnetPaid = k; ev.magnet = k;
    }
    ev.clueNow = !clueBefore && this.clueShown();
    if (fb.every(function (x) { return x === 'lit'; })) {
      this.solved = true; ev.solved = true;
      // every remaining gem empties into the bag at the solve, so testing decoys never pays more
      for (var t = 0; t < this.b.tray.length; t++) { var g3 = this._payGem(t); if (g3) ev.gems.push(g3); }
      return ev;
    }
    // kind lantern: from the assist point, one more correct letter lights before each further guess
    if (this.rows.length >= this.b.assistAfter) {
      for (var q = 0; q < n; q++) if (this.locked[q] == null) {
        var nf = this.finds.length, lid = this._lock(q);
        if (lid != null) { this.assisted++; this.pendingLantern = q; ev.lantern = q; if (this.finds.length > nf) ev.gems.push({ stone: lid }); }
        break;
      }
    }
    return ev;
  };
  // Replay helper: letters -> stone ids (locked slots fixed, otherwise the first free stone with that letter).
  Session.prototype.guessLetters = function (str) {
    var used = {}, ids = [], self = this, avail = this.available();
    this.locked.forEach(function (id) { if (id != null) used[id] = 1; });
    for (var i = 0; i < this.b.length; i++) {
      if (this.locked[i] != null) { ids.push(this.locked[i]); continue; }
      var s = avail.filter(function (t) { return t.ch === str[i] && !used[t.id] && self.canPlace(t.id, i); })[0];
      if (!s) return { error: 'cannot place ' + str[i] };
      used[s.id] = 1; ids.push(s.id);
    }
    return this.guess(ids);
  };
  Session.prototype.powerUpsUsed = function () {
    var p = this.packed;
    return { magnet: p.magnet ? 1 : 0, lens: p.lens ? 1 : 0, double: p.double != null ? 1 : 0, lucky: p.lucky != null ? 1 : 0 };
  };
  // meta: { mode, timeMs, pausedMs, theme, showTime }
  Session.prototype.result = function (meta) {
    meta = meta || {};
    var b = this.b, practice = this.practice, mode = practice ? 'practice' : (meta.mode === 'ranked' ? 'ranked' : 'relaxed');
    var guesses = this.rows.length, stars = starsFor(b.difficulty, guesses);
    var timeMs = mode === 'ranked' ? Math.max(0, Math.round(meta.timeMs || 0)) : null;
    return {
      game: 'word', puzzleNo: b.puzzleNo, seed: meta.seed != null ? meta.seed : b.seed,
      difficulty: practice ? 'practice' : b.difficulty, level: b.difficulty, mode: mode, stars: stars,
      score: { guesses: guesses, assisted: this.assisted, timeMs: timeMs },
      pausedMs: Math.round(meta.pausedMs || 0),
      finds: practice ? [] : this.finds.slice(),
      powerUpsUsed: practice ? { magnet: 0, lens: 0, double: 0, lucky: 0 } : this.powerUpsUsed(),
      shareText: shareText(this, meta.theme, mode === 'ranked' && meta.showTime ? timeMs : null),
      log: { guesses: this.log.slice() }
    };
  };
  // Share line: lit counts per guess, never letters, never dates or health info.
  function shareText(sess, theme, timeMs) {
    var b = sess.b, name = Arcade.gameName('word', theme);
    var head = name + (sess.practice ? ' · Practice' : ' #' + b.puzzleNo + ' · ' + Arcade.DIFF_LABEL[b.difficulty]);
    var counts2 = sess.rows.map(function (r) { return r.fb.filter(function (x) { return x === 'lit'; }).length; });
    var lines = [head, 'Solved in ' + sess.rows.length + (sess.rows.length === 1 ? '!' : ''), (theme === 'grove' ? 'Blooms open: ' : 'Lanterns lit: ') + counts2.join(' · ')];
    if (timeMs != null) lines.push('Time ' + U.fmtTime(timeMs));
    return lines.join('\n');
  }

  // ------------------------------------------------------------------
  // Theme copy
  // ------------------------------------------------------------------
  var TH = {
    expedition: {
      lit: 'lantern', warm: 'ring', cold: 'crumble', litIcon: 'lantern', warmIcon: 'ring', coldIcon: 'crumble',
      litName: 'Lantern', warmName: 'Ring', coldName: 'Crumble', stone: 'stone', stones: 'stones', gem: 'Gem',
      litLine: 'Right letter, right spot. It locks in place.', warmLine: 'In the word, but in another spot.', coldLine: 'Not in the word. It leaves the tray.',
      hill: 'Your climb', tray: 'Rune stones', next: 'Next step', lanternMsg: 'A kind lantern lit a letter for you.', cheer: ['Onward!', 'Good thinking!', 'Nice step!']
    },
    grove: {
      lit: 'bloom', warm: 'bud', cold: 'drift', litIcon: 'bloom', warmIcon: 'bud', coldIcon: 'drift',
      litName: 'Bloom', warmName: 'Bud', coldName: 'Drift', stone: 'petal', stones: 'petals', gem: 'Dewdrop',
      litLine: 'Right letter, right spot. It blooms and stays.', warmLine: 'In the word, but in another spot.', coldLine: 'Not in the word. It drifts away.',
      hill: 'Your vine', tray: 'Petals', next: 'Next bloom', lanternMsg: 'A kind firefly lit a letter for you.', cheer: ['Lovely!', 'Good thinking!', 'Growing nicely!']
    }
  };

  // ------------------------------------------------------------------
  // Mount
  // ------------------------------------------------------------------
  function mount(container, opts) {
    opts = opts || {};
    var theme = opts.theme === 'grove' ? 'grove' : 'expedition', T = TH[theme];
    var practice = !!opts.practice;
    var difficulty = DIFF[U.normDiff(opts.difficulty)] ? U.normDiff(opts.difficulty) : 'easy';
    var day = opts.seed != null ? String(opts.seed) : new Date().toISOString().slice(0, 10);
    var boardSeed = practice ? Arcade.practiceSeed(day, opts.practiceRound) : day;
    var board = generate(boardSeed, difficulty);
    var mode = practice ? 'practice' : (opts.mode === 'ranked' ? 'ranked' : 'relaxed');
    var timer = mode === 'ranked' ? (opts.timer === 'shown' ? 'shown' : 'quiet') : 'none';
    var rm = !!opts.reducedMotion || U.prefersReduced();
    var inv = {};
    U.PU.forEach(function (p) { inv[p.k] = practice ? 0 : Math.max(0, (opts.powerUps && +opts.powerUps[p.k]) || 0); });
    var hasPU = !practice && U.PU.some(function (p) { return inv[p.k] > 0; });
    var onFinish = typeof opts.onFinish === 'function' ? opts.onFinish : function () {};
    var art = U.itemArtFactory(opts.renderItem, theme);
    var clock = new U.Clock();
    var pack = { inv: inv, packed: { magnet: false, lens: false, double: null, lucky: null }, targeting: null };
    var sess = null, placed = [], selSlot = null, phase = 'intro', destroyed = false, timers = [], result = null, lastEv = null, fired = false;
    var name = Arcade.gameName('word', theme), dl = Arcade.DIFF_LABEL[difficulty];
    var puzzleLabel = practice ? 'Practice board' : 'Puzzle #' + board.puzzleNo;

    var root = document.createElement('div');
    root.className = 'ag-root wg-root ag-theme-' + theme + (rm ? ' ag-rm' : '') + ' wg-len' + board.length;
    root.setAttribute('data-game', 'word'); root.setAttribute('data-difficulty', practice ? 'practice' : difficulty);
    root.setAttribute('data-mode', mode); root.setAttribute('data-phase', 'intro');
    root.innerHTML =
      '<div class="ag-wrap">' +
        '<header class="ag-head"><div class="ag-title"><div class="ag-kicker">' + esc(practice ? 'Practice' : 'Daily game') + '</div>' +
          '<h2 class="ag-h">' + esc(name) + '</h2><div class="ag-sub">' + esc(puzzleLabel) + ' &middot; <span class="ag-diff">' + dl + '</span>' +
          (mode === 'ranked' ? ' &middot; Ranked' : mode === 'relaxed' ? ' &middot; Relaxed' : '') + '</div></div>' +
          '<div class="ag-clock" ' + (timer === 'shown' ? '' : 'hidden') + ' aria-label="Time">' + svg('clock') + '<span>0:00</span></div>' +
          (mode === 'ranked' ? '<button type="button" class="ag-icon-btn ag-pausebtn" aria-label="Pause">' + svg('pause') + '</button>' : '') +
          '<button type="button" class="ag-icon-btn ag-helpbtn" aria-label="How to play">' + svg('help') + '</button></header>' +
        '<div class="ag-hud"><div class="ag-hud-item wg-count"><b>0</b><span>guesses</span></div>' +
          (practice ? '' : '<div class="ag-hud-item ag-bag" aria-label="Finds">' + svg('bag') + '<b>0</b><span>finds</span></div>') + '</div>' +
        '<div class="wg-clue" aria-live="polite"></div>' +
        '<div class="wg-hill" role="list" aria-label="' + esc(T.hill) + '"></div>' +
        '<div class="wg-slots-wrap"><div class="wg-slots-lab">' + esc(T.next) + '</div><div class="wg-slots" role="group" aria-label="Your next guess"></div></div>' +
        '<div class="ag-msg wg-msg" aria-live="polite"></div>' +
        '<div class="wg-tray" role="group" aria-label="' + esc(T.tray) + '"></div>' +
        '<div class="ag-actions"><button type="button" class="ag-btn wg-clear">Clear</button><button type="button" class="ag-btn ag-primary wg-try" disabled>Try</button></div>' +
        '<div class="ag-sr" aria-live="polite"></div>' +
      '</div>';
    container.appendChild(root);
    var sheet = U.Sheet(root);
    function $(s) { return root.querySelector(s); }
    var el = { clue: $('.wg-clue'), hill: $('.wg-hill'), slots: $('.wg-slots'), tray: $('.wg-tray'), msg: $('.wg-msg'), tryB: $('.wg-try'), clear: $('.wg-clear'),
      count: $('.wg-count b'), bag: $('.ag-bag b'), bagBox: $('.ag-bag'), sr: $('.ag-sr'), clock: $('.ag-clock'), clockT: $('.ag-clock span'), help: $('.ag-helpbtn'), pause: $('.ag-pausebtn') };

    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function announce(t) { el.sr.textContent = ''; later(function () { el.sr.textContent = t; }, 30); }
    function setMsg(t, tone) { el.msg.textContent = t; el.msg.className = 'ag-msg wg-msg' + (tone ? ' is-' + tone : ''); }
    var tickId = null;
    if (timer === 'shown') tickId = setInterval(function () { if (!destroyed) el.clockT.textContent = U.fmtTime(clock.elapsed()); }, 500);

    function newSession() { sess = new Session(board, { packed: pack.packed }); placed = new Array(board.length); for (var i = 0; i < board.length; i++) placed[i] = null; }
    newSession();

    // ---------- render ----------
    function stoneShape(state) { return svg(state === 'lit' ? T.litIcon : state === 'warm' ? T.warmIcon : T.coldIcon, 'wg-shape'); }
    function gemMark(t) {
      if (practice || !t.gem || sess.paid[t.id]) return '';
      var r = sess.packed.lucky === t.id ? U.upRarity(t.gem.rarity) : t.gem.rarity;
      return '<span class="wg-gem' + (sess.packed.lens ? ' ag-r-' + r : '') + '" aria-hidden="true">' + svg(sess.packed.lens ? 'gem' : 'sparkle') + (sess.packed.double === t.id ? '<i>x2</i>' : '') + '</span>';
    }
    function gemLabel(t) {
      if (practice || !t.gem || sess.paid[t.id]) return '';
      return sess.packed.lens ? ', carries a ' + (sess.packed.lucky === t.id ? U.upRarity(t.gem.rarity) : t.gem.rarity) + ' ' + T.gem.toLowerCase() : ', carries a ' + T.gem.toLowerCase();
    }
    function renderClue() {
      if (sess.clueShown()) el.clue.innerHTML = '<span class="wg-clue-lab">Clue</span> ' + esc(board.clue);
      else { var k = board.clueAfter - sess.rows.length; el.clue.innerHTML = '<span class="wg-clue-lab">Clue</span> <span class="wg-clue-wait">arrives after ' + k + ' more ' + (k === 1 ? 'guess' : 'guesses') + '</span>'; }
    }
    function renderHill(animateTop) {
      var html = '';
      for (var r = sess.rows.length - 1; r >= 0; r--) {
        var row = sess.rows[r], top = r === sess.rows.length - 1, label = [];
        var cells = row.ids.map(function (id, s) {
          var st = row.fb[s]; label.push(row.letters[s] + ' ' + T[st]);
          return '<span class="wg-stone is-' + st + (row.lantern === s ? ' is-lantern' : '') + '" style="--k:' + s + '"><span class="wg-ch">' + esc(row.letters[s]) + '</span>' + stoneShape(st) + '</span>';
        }).join('');
        html += '<div class="wg-row' + (top && animateTop ? ' is-new' : '') + '" role="listitem" style="--off:' + ((r % 2) ? 1 : 0) + '" aria-label="Guess ' + (r + 1) + ': ' + esc(label.join(', ')) + '">' +
          '<span class="wg-rownum" aria-hidden="true">' + (r + 1) + '</span>' + cells + '</div>';
      }
      el.hill.innerHTML = html || '<div class="wg-hill-empty">Your guesses climb up here, one row of ' + T.stones + ' at a time.</div>';
    }
    function renderSlots() {
      var html = '';
      for (var s = 0; s < board.length; s++) {
        var lock = sess.locked[s], pid = placed[s], nh = Object.keys(sess.notHere[s]).sort();
        var nhHtml = nh.length ? '<span class="wg-nothere" aria-hidden="true">' + nh.map(function (c) { return '<i>' + esc(c) + '</i>'; }).join('') + '</span>' : '';
        var nhLab = nh.length ? '. Not here: ' + nh.join(', ') : '';
        if (lock != null) {
          var lt = board.tray[lock];
          html += '<div class="wg-slot is-locked" role="img" aria-label="Spot ' + (s + 1) + ': ' + lt.ch + ', ' + T.lit + '"><span class="wg-ch">' + esc(lt.ch) + '</span>' + stoneShape('lit') + '</div>';
        } else if (pid != null) {
          var pt = board.tray[pid];
          html += '<button type="button" class="wg-slot is-filled" data-slot="' + s + '" aria-label="Spot ' + (s + 1) + ': ' + pt.ch + '. Tap to put it back' + nhLab + '"><span class="wg-ch">' + esc(pt.ch) + '</span>' + gemMark(pt) + nhHtml + '</button>';
        } else {
          html += '<button type="button" class="wg-slot is-empty' + (selSlot === s ? ' is-selected' : '') + '" data-slot="' + s + '" aria-pressed="' + (selSlot === s) + '" aria-label="Spot ' + (s + 1) + ', empty' + nhLab + '"><span class="wg-ch"></span>' + nhHtml + '</button>';
        }
      }
      el.slots.innerHTML = html;
    }
    function renderTray() {
      var html = '', inSlot = {};
      placed.forEach(function (id) { if (id != null) inSlot[id] = 1; });
      sess.available().forEach(function (t) {
        var used = !!inSlot[t.id];
        html += '<button type="button" class="wg-tstone' + (used ? ' is-used' : '') + '" data-stone="' + t.id + '"' + (used || phase !== 'play' ? ' disabled' : '') +
          ' aria-label="' + esc(T.stone) + ' ' + t.ch + gemLabel(t) + (used ? ', placed' : '') + '"><span class="wg-ch">' + esc(t.ch) + '</span>' + gemMark(t) + '</button>';
      });
      el.tray.innerHTML = html;
    }
    function render(animateTop) {
      var fk = document.activeElement && root.contains(document.activeElement) ? (document.activeElement.getAttribute('data-stone') != null ? '[data-stone="' + document.activeElement.getAttribute('data-stone') + '"]' : document.activeElement.getAttribute('data-slot') != null ? '[data-slot="' + document.activeElement.getAttribute('data-slot') + '"]' : null) : null;
      renderClue(); renderHill(animateTop); renderSlots(); renderTray();
      el.count.textContent = sess.rows.length;
      el.count.nextSibling.textContent = sess.rows.length === 1 ? 'guess' : 'guesses';
      if (el.bag) el.bag.textContent = sess.finds.length;
      el.tryB.disabled = phase !== 'play' || !full();
      el.clear.disabled = phase !== 'play' || !placed.some(function (x) { return x != null; });
      if (fk) { var f = root.querySelector(fk); if (f && !f.disabled) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } else if (el.tryB && !el.tryB.disabled && fk.indexOf('stone') >= 0) try { el.tryB.focus({ preventScroll: true }); } catch (e2) { /* ignore */ } }
    }
    function full() { for (var s = 0; s < board.length; s++) if (sess.locked[s] == null && placed[s] == null) return false; return true; }
    function statusMsg() {
      if (phase !== 'play') return;
      if (full()) setMsg('Ready! Tap Try to see how the ' + T.stones + ' answer.');
      else if (!sess.rows.length) setMsg('Tap ' + T.stones + ' to fill the spots. Any order is a fair guess.');
      else setMsg('Fill the open spots and try again.');
    }

    // ---------- actions ----------
    function begin() { if (!clock.started) clock.start(); }
    function placeStone(id) {
      if (phase !== 'play') return;
      if (placed.indexOf(id) >= 0) return;
      var order = [];
      if (selSlot != null) order.push(selSlot);
      for (var s = 0; s < board.length; s++) if (order.indexOf(s) < 0) order.push(s);
      var target = null, blocked = false;
      for (var k = 0; k < order.length; k++) {
        var s2 = order[k];
        if (sess.locked[s2] != null || placed[s2] != null) continue;
        if (!sess.canPlace(id, s2)) { blocked = true; continue; }
        target = s2; break;
      }
      if (target == null) {
        if (blocked) setMsg('That ' + T.stone + ' was warm there before. Try it in another spot.', 'soft');
        else setMsg('All spots are full. Tap Try, or tap a spot to put a ' + T.stone + ' back.', 'soft');
        return;
      }
      begin();
      placed[target] = id; selSlot = null;
      render();
      announce(board.tray[id].ch + ' in spot ' + (target + 1) + '.');
      statusMsg();
      U.buzz(6);
    }
    function unplace(slot) {
      if (phase !== 'play' || placed[slot] == null) return;
      var ch = board.tray[placed[slot]].ch;
      placed[slot] = null; render(); statusMsg(); announce(ch + ' back in the tray.');
    }
    function clearAll() { for (var s = 0; s < board.length; s++) placed[s] = null; selSlot = null; render(); statusMsg(); }
    function tryGuess() {
      if (phase !== 'play' || !full()) return;
      begin();
      var ids = placed.slice(), ev = sess.guess(ids);
      if (ev.error) { setMsg('Fill every spot first.', 'soft'); return; }
      lastEv = ev;
      for (var s = 0; s < board.length; s++) placed[s] = null;
      selSlot = null;
      var nLit = ev.fb.filter(function (x) { return x === 'lit'; }).length, nWarm = ev.fb.filter(function (x) { return x === 'warm'; }).length, nCold = ev.cold.length;
      render(true);
      if (ev.gems.length && el.bagBox && !rm) { el.bagBox.classList.remove('is-bump'); void el.bagBox.offsetWidth; el.bagBox.classList.add('is-bump'); }
      // v5.5 round 2: one vocabulary, the legend's, said in plain words.
      var parts = [nLit + ' ' + T.litName + ' (right spot)', nWarm + ' ' + T.warmName + ' (in the word)', nCold + ' ' + T.coldName + ' (not in it)'];
      announce('Guess ' + sess.rows.length + ': ' + ev.fb.map(function (x, i) { return ev.letters[i] + ' ' + T[x]; }).join(', ') + '.');
      if (ev.solved) { U.buzz([20, 50, 20, 50, 40]); return finish(); }
      var msg = parts.join(' · ') + '.';
      if (ev.magnet) msg += ' Magnet pulled in ' + ev.magnet + (ev.magnet === 1 ? ' find.' : ' finds.');
      if (ev.clueNow) msg += ' A clue appeared!';
      if (ev.lantern != null) msg += ' ' + T.lanternMsg;
      setMsg(msg, nLit ? 'good' : '');
      U.buzz(10);
    }
    function finish() {
      phase = 'done'; root.setAttribute('data-phase', 'done');
      clock.stop();
      if (tickId) { clearInterval(tickId); tickId = null; }
      result = sess.result({ mode: mode, timeMs: clock.elapsed(), pausedMs: clock.pausedMs(), theme: theme, showTime: !!opts.showTimeOnCards, seed: day });
      render();
      setMsg('Solved! ' + T.cheer[sess.rows.length % T.cheer.length]);
      if (!fired) { fired = true; try { onFinish(result); } catch (e) { if (global.console) console.error(e); } }
      later(showResults, rm ? 30 : 650);
    }

    // ---------- input ----------
    el.tray.addEventListener('click', function (ev) { var b = ev.target.closest('[data-stone]'); if (b && !b.disabled) placeStone(+b.getAttribute('data-stone')); });
    el.slots.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-slot]'); if (!b || phase !== 'play') return;
      var s = +b.getAttribute('data-slot');
      if (placed[s] != null) unplace(s);
      else { selSlot = selSlot === s ? null : s; render(); }
    });
    el.tryB.addEventListener('click', tryGuess);
    el.clear.addEventListener('click', clearAll);
    el.help.addEventListener('click', function () { showHelp(); });
    if (el.pause) el.pause.addEventListener('click', function () { showPause(); });
    function onKey(ev) {
      if (destroyed || phase !== 'play' || sheet.isOpen() || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var tg = ev.target;   // typing works when focus is in the game or nowhere in particular (body)
      if (tg && tg !== document.body && tg !== document.documentElement && !root.contains(tg)) return;
      if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
      var k = ev.key;
      if (/^[a-zA-Z]$/.test(k)) {
        var ch = k.toUpperCase(), inSlot = {};
        placed.forEach(function (id) { if (id != null) inSlot[id] = 1; });
        var t = sess.available().filter(function (x) { return x.ch === ch && !inSlot[x.id]; })[0];
        if (t) { ev.preventDefault(); placeStone(t.id); }
        else setMsg('No free ' + T.stone + ' with ' + ch + ' in the tray.', 'soft');
      } else if (k === 'Backspace' || k === 'Delete') {
        for (var s = board.length - 1; s >= 0; s--) if (placed[s] != null) { ev.preventDefault(); unplace(s); break; }
      } else if (k === 'Enter') {
        var a = document.activeElement;
        if (a && a.tagName === 'BUTTON' && root.contains(a) && a !== el.tryB) return;  // let buttons activate normally
        if (full()) { ev.preventDefault(); tryGuess(); }
      }
    }
    document.addEventListener('keydown', onKey);
    function onVis() { if (document.hidden) clock.pause('hidden'); else clock.resume('hidden'); }
    document.addEventListener('visibilitychange', onVis);

    // ---------- sheets ----------
    function legend() {
      return '<ul class="wg-legend">' +
        '<li><span class="wg-stone is-lit">' + stoneShape('lit') + '</span><span><b>' + T.litName + '</b> ' + esc(T.litLine) + '</span></li>' +
        '<li><span class="wg-stone is-warm">' + stoneShape('warm') + '</span><span><b>' + T.warmName + '</b> ' + esc(T.warmLine) + '</span></li>' +
        '<li><span class="wg-stone is-cold">' + stoneShape('cold') + '</span><span><b>' + T.coldName + '</b> ' + esc(T.coldLine) + '</span></li></ul>';
    }
    function modeLine() {
      if (mode === 'practice') return 'Practice: no clock, no board, no finds. Just for fun.';
      if (mode === 'relaxed') return 'Relaxed: no clock and no board. It pays the same.';
      return timer === 'shown' ? 'Ranked: the clock counts up on screen.' : 'Ranked: a quiet clock keeps time. You see it at the end.';
    }
    function introHtml() {
      var clueFact = board.clueAfter === 0 ? 'clue from the start' : 'clue after guess ' + board.clueAfter;
      var packBlock = '';
      if (hasPU) {
        var targets = board.tray.filter(function (t) { return t.gem; }).map(function (t) { return { i: t.id, rarity: t.gem.rarity, item: t.gem.item }; });
        packBlock = '<div class="ag-pack"><div class="ag-pack-title">Pack your power-ups</div>' +
          (opts.fuelLabel ? '<div class="ag-fuel">' + esc(opts.fuelLabel) + '</div>' : '') +
          '<div class="ag-pack-body">' + U.packHtml({ inv: inv, packed: pack.packed, targeting: pack.targeting, targets: targets, art: art, targetWord: T.gem,
            tips: { magnet: 'Each ' + T.litName + ' in your first guess pulls in a bonus find, up to 3.', lens: 'Shows what each ' + T.gem.toLowerCase() + ' holds.', double: 'Tap a ' + T.gem.toLowerCase() + '. It pays double.', lucky: 'Tap a ' + T.gem.toLowerCase() + '. It goes up one rarity.' } }) + '</div></div>';
      }
      return '<div class="ag-intro-badge">' + svg(T.litIcon) + '</div>' +
        '<div class="ag-kicker">' + esc(puzzleLabel) + ' &middot; ' + dl + '</div>' +
        '<h3 class="ag-sheet-h">' + esc(name) + '</h3>' + U.introControls(opts, mode, difficulty) +
        U.rulesWrap(opts, '<p class="ag-sheet-p">Find the hidden word. Put ' + T.stones + ' in the spots and tap Try. Any order is a fair guess, and there is no limit.</p>' +
        legend()) +
        '<div class="ag-facts"><span><b>' + board.length + '</b> letters</span><span><b>' + board.decoys.length + '</b> ' + (board.decoys.length === 1 ? 'extra ' + T.stone : 'extra ' + T.stones) + '</span><span>' + clueFact + '</span></div>' +
        '<p class="ag-mode-line">' + esc(modeLine()) + '</p>' + packBlock +
        '<div class="ag-sheet-actions"><button type="button" class="ag-btn ag-primary ag-big" data-act="start" data-autofocus>Let’s go</button></div>';
    }
    function showIntro() { sheet.open(introHtml(), 'is-intro', name + ', how to play'); }
    // Re-render only the pack block and keep keyboard focus on the same control.
    function refreshPack(ev) {
      var hit = ev.target.closest('[data-pu],[data-target]'), sel = hit ? (hit.hasAttribute('data-pu') ? '[data-pu="' + hit.getAttribute('data-pu') + '"]' : '[data-target="' + hit.getAttribute('data-target') + '"]') : null;
      var tmp = document.createElement('div'); tmp.innerHTML = introHtml();
      var fresh = tmp.querySelector('.ag-pack-body'), body = sheet.el.querySelector('.ag-pack-body');
      if (fresh && body) body.innerHTML = fresh.innerHTML;
      var f = sel && sheet.el.querySelector(sel); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    function showHelp() {
      sheet.open('<h3 class="ag-sheet-h">How to play</h3><p class="ag-sheet-p">Tap a ' + T.stone + ' to drop it in the next open spot, or tap a spot first to choose where it goes. Tap a filled spot to put the ' + T.stone + ' back. On a keyboard, type letters, use Backspace, and press Enter to try.</p>' +
        legend() + '<p class="ag-sheet-p">Small letters under a spot show ' + T.stones + ' that showed a ' + T.warmName + ' there. After a few guesses, a kind light starts filling in one letter before each guess, so every board finishes.</p>' +
        '<div class="ag-sheet-actions"><button type="button" class="ag-btn ag-primary" data-act="close" data-autofocus>Got it</button></div>', 'is-help', 'How to play');
      clock.pause('free');
    }
    function showPause() {
      clock.pause('user'); root.classList.add('ag-paused');
      sheet.open('<h3 class="ag-sheet-h">Paused</h3><p class="ag-sheet-p">The board is hidden and the clock is stopped. Take all the time you need.</p>' +
        '<div class="ag-sheet-actions"><button type="button" class="ag-btn ag-primary" data-act="resume" data-autofocus>Keep playing</button></div>', 'is-small', 'Paused');
    }
    function haulHtml() {
      if (practice) return '';
      var items = result.finds.map(function (f) {
        var m = /^find\.(\w+)\.(\d+)$/.exec(f.id), item = m ? +m[2] : 0;
        return '<li class="ag-haul-item ag-r-' + f.rarity + '"><span class="ag-haul-ico">' + art.html(f.rarity, item) + '</span><span class="ag-haul-txt"><b>' + esc(art.name(f.rarity, item)) + '</b><small>' + cap(f.rarity) + '</small></span></li>';
      }).join('');
      return '<div class="ag-res-sec"><div class="ag-res-lab">Your finds</div>' + (items ? '<ul class="ag-haul">' + items + '</ul>' : '<p class="ag-sheet-p">No finds this time. Your stars still count!</p>') + '</div>';
    }
    function headline() {
      var g = result.score.guesses;
      if (practice) return 'Practice solved in ' + g + '!';
      if (g === 1) return 'Solved in 1! Wow!';
      if (result.stars === 3) return 'Brilliant! Solved in ' + g + '.';
      if (result.stars === 2) return 'Nicely done! Solved in ' + g + '.';
      return 'You got it! Solved in ' + g + '.';
    }
    function showResults() {
      var g = result.score.guesses, a = result.score.assisted;
      var sub = 'The word was <b>' + esc(board.answer) + '</b>.' + (a ? ' ' + (theme === 'grove' ? 'Fireflies' : 'Lanterns') + ' helped with ' + a + (a === 1 ? ' letter.' : ' letters.') : '');
      var timeLine = result.score.timeMs != null ? '<p class="ag-time">' + svg('clock') + ' ' + U.fmtTime(result.score.timeMs) + '</p>' : '';
      sheet.open(U.starsHtml(result.stars) +
        '<h3 class="ag-sheet-h ag-res-h">' + esc(headline()) + '</h3><p class="ag-sheet-p ag-res-sub">' + sub + '</p>' + timeLine +
        U.standingHtml(result, opts) + haulHtml() +
        '<div class="ag-res-sec"><div class="ag-res-lab">Share</div><pre class="ag-share">' + esc(result.shareText) + '</pre></div>' +
        (practice ? '' : '<p class="ag-next">A fresh word arrives <b>tomorrow</b>.</p>') +
        '<div class="ag-sheet-actions">' + (opts.onLeaderboard && mode !== 'practice' && opts.boards !== false ? '<button type="button" class="ag-btn" data-act="board">' + svg('board') + '<span>Leaderboard</span></button>' : '') +
        '<button type="button" class="ag-btn" data-act="copy">' + svg('copy') + '<span>Copy</span></button>' +
        '<button type="button" class="ag-btn ag-primary" data-act="done" data-autofocus>Done</button></div>', 'is-results', 'Results');
      announce(headline() + ' ' + (practice ? '' : result.finds.length + ' finds.'));
    }
    sheet.el.addEventListener('click', function (ev) {
      if (phase === 'intro' && hasPU && U.packClick(pack, ev)) {
        sess.packed = { magnet: pack.packed.magnet, lens: pack.packed.lens, double: pack.packed.double, lucky: pack.packed.lucky };
        refreshPack(ev);
        return;
      }
      var b = ev.target.closest('[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'diff') { if (opts.onDifficulty) opts.onDifficulty(b.getAttribute('data-v')); return; }
      if (act === 'relax') { if (opts.onRelax) { opts.onRelax(); return; } mode = 'relaxed'; timer = 'none'; showIntro(); return; }
      if (act === 'start') { sheet.close(); startPlay(); }
      else if (act === 'close') { sheet.close(); clock.resume('free'); }
      else if (act === 'resume') { sheet.close(); root.classList.remove('ag-paused'); clock.resume('user'); }
      else if (act === 'copy') U.copyText(result.shareText, b);
      else if (act === 'board') { if (opts.onLeaderboard) opts.onLeaderboard(result); }
      else if (act === 'done') { sheet.close(); root.classList.add('is-finished'); if (typeof opts.onDone === 'function') opts.onDone(result); }
    });
    function startPlay() {
      newSession();
      phase = 'play'; root.setAttribute('data-phase', 'play');
      render(); statusMsg();
      var f = el.tray.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }

    // ---------- resume ----------
    function applyResume(rs) {
      if (!rs || rs.game !== 'word' || String(rs.seed) !== day || rs.difficulty !== (practice ? 'practice' : difficulty)) return false;
      pack.packed = rs.packed || pack.packed;
      newSession();
      (rs.guesses || []).forEach(function (g) { if (!sess.solved) sess.guessLetters(g); });
      clock.restore(rs.elapsedMs, rs.pausedMs);
      if (sess.solved) {
        phase = 'done'; root.setAttribute('data-phase', 'done'); clock.stop(); fired = true;  // never fire onFinish twice
        result = sess.result({ mode: mode, timeMs: rs.elapsedMs, pausedMs: rs.pausedMs, theme: theme, showTime: !!opts.showTimeOnCards, seed: day });
        render(); showResults();
      } else if (rs.started) {
        phase = 'play'; root.setAttribute('data-phase', 'play'); render(); statusMsg();
        setMsg('Welcome back! Your board is just as you left it.');
      } else return false;
      return true;
    }
    render();
    if (!applyResume(opts.resume)) showIntro();

    return {
      getState: function () {
        return {
          v: 1, game: 'word', seed: day, difficulty: practice ? 'practice' : difficulty, mode: mode,
          packed: { magnet: sess.packed.magnet, lens: sess.packed.lens, double: sess.packed.double, lucky: sess.packed.lucky },
          guesses: sess.log.slice(), started: phase !== 'intro', finished: phase === 'done',
          elapsedMs: clock.elapsed(), pausedMs: clock.pausedMs()
        };
      },
      destroy: function () {
        destroyed = true; timers.forEach(clearTimeout); if (tickId) clearInterval(tickId);
        document.removeEventListener('visibilitychange', onVis);
        document.removeEventListener('keydown', onKey);
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  var api = {
    mount: mount,
    _engine: { generate: generate, feedback: feedback, starsFor: starsFor, Session: Session, LIST: LIST, BLOCK: BLOCK, DIFF: DIFF, blockedBy: blockedBy, dailyIndex: dailyIndex, shareText: shareText }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.WordGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
