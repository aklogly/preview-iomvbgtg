/* Kindling v5.4 — rpg.js : the companion RPG engine. Pure numbers and ids, no DOM, no theme words.
 *
 * The one rule that matters: this module is DOSE-BLIND. Nothing here reads Spark, Charge, check-in
 * answers or the health record. Companion XP is flat per honest same-day answer (the Store pays it),
 * quest outcomes are a pure function of level + skill tree + gear, and loot rolls use their own seeded
 * stream. Packed power-ups (fuelled by doses) only ever add Finds and Stars, and that is applied by the
 * Store on the Find side, never here.
 *
 * Exposed as window.RPG in the browser and module.exports in Node (for tests).
 */
(function (root) {
  'use strict';
  var E = root.Engine;

  var STATS = ['way', 'for', 'grit', 'charm'];
  var SLOTS = ['tool', 'garb', 'trinket'];

  /* ---------- companion XP (all flat, all dose-blind) ---------- */
  var XP = { answerDay: 40, feed: 20, runBase: 30, runPerStar: 10, quest: 40, daily: 15, weekly: 60, welcome: 80 };
  // No hard level ceiling: the bar always moves. Evolution comes from total days played (Engine.GROWTH), not level.
  function xpForNext(level) { return 120 + 45 * level; }
  function levelInfo(xp) {
    var l = 1, rem = Math.max(0, xp || 0);
    while (rem >= xpForNext(l)) { rem -= xpForNext(l); l++; }
    return { level: l, into: rem, need: xpForNext(l) };
  }
  function xpToReach(level) { var t = 0; for (var l = 1; l < level; l++) t += xpForNext(l); return t; }
  // Every stack's share of the flat 40. Same total for 1 stack or 4, a rest day or a journal day.
  function answerShares(plan) { return E.allocate(XP.answerDay, plan.stacks.length); }
  function runXp(stars) { return XP.runBase + XP.runPerStar * Math.max(0, Math.min(3, stars || 0)); }
  // Skill points: one per level gained, one per growth stage reached.
  function spEarned(level, stage) { return Math.max(0, level - 1) + Math.max(0, stage || 0); }

  /* ---------- gear (account-bound, never sold, never consumed by a quest) ---------- */
  var ITEMS = {
    compass:  { slot: 'tool', rarity: 'rare', stat: 'way', amt: 4, icon: '🧭' },
    satchel:  { slot: 'tool', rarity: 'uncommon', stat: 'for', amt: 3, icon: '🎒' },
    lantern:  { slot: 'tool', rarity: 'uncommon', stat: 'grit', amt: 3, icon: '🏮' },
    boots:    { slot: 'garb', rarity: 'uncommon', stat: 'way', amt: 3, icon: '🥾' },
    cloak:    { slot: 'garb', rarity: 'rare', stat: 'grit', amt: 4, icon: '🧥' },
    scarf:    { slot: 'garb', rarity: 'uncommon', stat: 'charm', amt: 3, icon: '🧣' },
    acorn:    { slot: 'trinket', rarity: 'common', stat: 'for', amt: 2, icon: '🌰' },
    bead:     { slot: 'trinket', rarity: 'uncommon', stat: 'way', amt: 2, icon: '📿' },
    stone:    { slot: 'trinket', rarity: 'common', stat: 'charm', amt: 2, icon: '🪨' },
    // Epic: from Epic chests ("choose 1 of 3")
    spyglass: { slot: 'tool', rarity: 'epic', stat: 'way', amt: 6, icon: '🔭' },
    basket:   { slot: 'tool', rarity: 'epic', stat: 'for', amt: 6, icon: '🧺' },
    mantle:   { slot: 'garb', rarity: 'epic', stat: 'grit', amt: 6, icon: '🦺' },
    ribbon:   { slot: 'garb', rarity: 'epic', stat: 'charm', amt: 6, icon: '🎀' },
    compassrose: { slot: 'trinket', rarity: 'epic', stat: 'way', amt: 4, icon: '🌟' },
    // Legendary: from Legendary chests ("choose 1 of 3 you don't own"). Perk: the first Steady beat of its stat becomes Great.
    sunfire:  { slot: 'tool', rarity: 'legendary', stat: 'way', amt: 9, perk: 'steadyUp', icon: '☀️' },
    hearth:   { slot: 'tool', rarity: 'legendary', stat: 'for', amt: 9, perk: 'steadyUp', icon: '🍯' },
    phoenix:  { slot: 'garb', rarity: 'legendary', stat: 'grit', amt: 9, perk: 'steadyUp', icon: '🔥' },
    songbird: { slot: 'garb', rarity: 'legendary', stat: 'charm', amt: 9, perk: 'steadyUp', icon: '🐦' },
    starmap:  { slot: 'trinket', rarity: 'legendary', stat: 'way', amt: 7, perk: 'steadyUp', icon: '🗺️' }
  };
  var BASIC = ['compass', 'satchel', 'lantern', 'boots', 'cloak', 'scarf', 'acorn', 'bead', 'stone'];
  var EPIC = ['spyglass', 'basket', 'mantle', 'ribbon', 'compassrose'];
  var LEGENDARY = ['sunfire', 'hearth', 'phoenix', 'songbird', 'starmap'];
  // Kids: a fixed, published sticker order. Never random.
  var KID_STICKERS = ['acorn', 'boots', 'stone', 'satchel', 'bead', 'scarf', 'lantern', 'cloak', 'compass'];

  /* ---------- the one skill tree in the slice: Pathfinder (Wayfinding) ---------- */
  // need = points already spent in this tree. Tree opens at stage 2 (day 21); the fork at stage 3 (day 45).
  var TREE_OPENS = 2, FORK_OPENS = 3;
  var TREE = [
    { id: 'trail', tier: 1, cost: 1, need: 0, stat: 'way', amt: 2 },
    { id: 'scout', tier: 1, cost: 1, need: 0, flag: 'scoutAhead' },
    { id: 'wind', tier: 2, cost: 2, need: 2, stat: 'way', amt: 3 },
    { id: 'fork', tier: 2, cost: 2, need: 2, fork: ['ridge', 'water'], needStage: FORK_OPENS },
    { id: 'stride', tier: 3, cost: 3, need: 5, stat: 'way', amt: 3 },
    { id: 'paths', tier: 3, cost: 3, need: 5, flag: 'hiddenPaths' },
    { id: 'cap', tier: 4, cost: 4, need: 14, needStage: FORK_OPENS, locked: true }
  ];
  var FORK_BONUS = 4; // +4 Wayfinding on beats tagged with the chosen side (ridge or water)
  function node(id) { for (var i = 0; i < TREE.length; i++) if (TREE[i].id === id) return TREE[i]; return null; }
  function spentIn(c) { var t = 0; Object.keys(c.nodes || {}).forEach(function (k) { var n = node(k); if (n && c.nodes[k]) t += n.cost; }); return t; }
  function hasFlag(c, f) { return TREE.some(function (n) { return n.flag === f && c.nodes && c.nodes[n.id]; }); }
  function canLearn(c, id, stage, spFree) {
    var n = node(id); if (!n) return { ok: false, why: 'none' };
    if (n.locked) return { ok: false, why: 'later' };
    if (c.nodes && c.nodes[id]) return { ok: false, why: 'have' };
    if (stage < TREE_OPENS) return { ok: false, why: 'tree' };
    if (n.needStage && stage < n.needStage) return { ok: false, why: 'stage' };
    if (spentIn(c) < n.need) return { ok: false, why: 'need' };
    if (spFree < n.cost) return { ok: false, why: 'sp' };
    return { ok: true };
  }

  /* ---------- stats ---------- */
  // c = { level, nodes: {id:true}, fork: 'ridge'|'water'|null }   loadout = { tool, garb, trinket } (item ids or null)
  function stats(c, loadout) {
    var base = 2 + Math.floor((c.level || 1) / 5), s = { way: base, for: base, grit: base, charm: base };
    TREE.forEach(function (n) { if (n.stat && c.nodes && c.nodes[n.id]) s[n.stat] += n.amt; });
    // v5.6 Part B: Workbench level. Each level above +1 adds +1 to the gear's main stat (c.plus = { itemId: 1..5 }).
    SLOTS.forEach(function (sl) { var id = loadout && loadout[sl], it = ITEMS[id]; if (it) s[it.stat] += it.amt + Math.max(0, Math.min(5, (c.plus && c.plus[id]) || 1) - 1); });
    return s;
  }
  function beatValue(c, loadout, beat) {
    var v = stats(c, loadout)[beat.stat];
    if (c.fork && beat.tag === c.fork && beat.stat === 'way' && c.nodes && c.nodes.fork) v += FORK_BONUS;
    return v;
  }

  /* ---------- quests: 3 beats each (2 shown, 1 hidden). Outcome is a pure function of the numbers. ---------- */
  // Region tiers open by total days played (never by date). Tier 6 is the last; seasons add sideways, not up.
  var TIERS = [{ at: 0, great: 6, amazing: 10 }, { at: 21, great: 9, amazing: 15 }, { at: 50, great: 14, amazing: 22 }, { at: 140, great: 20, amazing: 30 }, { at: 280, great: 27, amazing: 38 }, { at: 600, great: 34, amazing: 46 }];
  function tierFor(daysPlayed) { var t = 0; for (var i = 0; i < TIERS.length; i++) if ((daysPlayed || 0) >= TIERS[i].at) t = i; return t; }
  // Same index as the theme destinations (Expedition: saltflats / canopy / tidepools; Grove: market / meadow / orchard).
  // v5.6: each quest has a specimen set (its destination's set), used by "Look for".
  var QUESTS = [
    { id: 'q1', set: 1, beats: [{ stat: 'way', tag: 'ridge' }, { stat: 'for' }, { stat: 'way', tag: 'water', hidden: true }] },
    { id: 'q2', set: 2, beats: [{ stat: 'grit', tag: 'ridge' }, { stat: 'way' }, { stat: 'charm', hidden: true }] },
    { id: 'q3', set: 3, beats: [{ stat: 'for', tag: 'water' }, { stat: 'charm' }, { stat: 'grit', tag: 'water', hidden: true }] }
  ];
  function quest(id) { for (var i = 0; i < QUESTS.length; i++) if (QUESTS[i].id === id) return QUESTS[i]; return QUESTS[0]; }
  function questIndex(id) { for (var i = 0; i < QUESTS.length; i++) if (QUESTS[i].id === id) return i; return 0; }
  var TIER_VAL = { steady: 0, great: 1, amazing: 2 };
  function tierOf(v, great, amazing) { return v >= amazing ? 'amazing' : v >= great ? 'great' : 'steady'; }
  // resolve(): deterministic. Same companion + same loadout + same quest + same region tier = same result, always.
  function resolve(q, c, loadout, regionTier) {
    q = typeof q === 'string' ? quest(q) : q;
    var t = TIERS[regionTier || 0];
    var res = q.beats.map(function (b, i) { var v = beatValue(c, loadout, b); return { i: i, stat: b.stat, tag: b.tag || null, hidden: !!b.hidden, value: v, great: t.great, amazing: t.amazing, tier: tierOf(v, t.great, t.amazing), perk: false }; });
    // Legendary perk: the first Steady beat of the item's stat becomes Great (once per quest, per item)
    SLOTS.forEach(function (sl) {
      var it = loadout && ITEMS[loadout[sl]]; if (!it || it.perk !== 'steadyUp') return;
      for (var i = 0; i < res.length; i++) if (res[i].stat === it.stat && res[i].tier === 'steady') { res[i].tier = 'great'; res[i].perk = loadout[sl]; break; }
    });
    return res;
  }
  // What the board can show before you send: the hidden beat stays "?" unless Scout Ahead is learned.
  function predict(q, c, loadout, regionTier) {
    var scout = hasFlag(c, 'scoutAhead');
    return resolve(q, c, loadout, regionTier).map(function (r) { if (r.hidden && !scout) return { i: r.i, hidden: true, unknown: true, stat: null, tier: null }; return r; });
  }
  function score(res) { return res.reduce(function (a, r) { return a + (r.tier ? TIER_VAL[r.tier] : 0); }, 0); }
  function margin(res) { return res.reduce(function (a, r) { return a + (r.value != null ? r.value : 0); }, 0); }
  // "Get ready": try every combination from the bag and keep the best predicted result (ties: higher numbers, then bag order).
  function bestLoadout(q, c, bag, regionTier) {
    var by = { tool: [null], garb: [null], trinket: [null] };
    (bag || []).forEach(function (id) { var it = ITEMS[id]; if (it && by[it.slot].indexOf(id) < 0) by[it.slot].push(id); });
    var best = null, bs = -1, bm = -1;
    by.tool.forEach(function (t) { by.garb.forEach(function (g) { by.trinket.forEach(function (k) {
      var lo = { tool: t, garb: g, trinket: k }, p = predict(q, c, lo, regionTier), sc = score(p), m = margin(p);
      if (sc > bs || (sc === bs && m > bm)) { best = lo; bs = sc; bm = m; }
    }); }); });
    return best || { tool: null, garb: null, trinket: null };
  }

  /* ---------- gear impact: "turns Saltflats Crossing · Wayfinding Great -> Amazing" ---------- */
  // For each quest on the board, compare its best loadout with and without the item. First upgrade wins.
  function gearImpact(itemId, c, bag, regionTier) {
    var without = (bag || []).filter(function (x) { return x !== itemId; }), withIt = without.concat([itemId]);
    for (var qi = 0; qi < QUESTS.length; qi++) {
      var q = QUESTS[qi], a = predict(q, c, bestLoadout(q, c, without, regionTier), regionTier), b = predict(q, c, bestLoadout(q, c, withIt, regionTier), regionTier);
      for (var i = 0; i < a.length; i++) if (a[i].tier && b[i].tier && TIER_VAL[b[i].tier] > TIER_VAL[a[i].tier]) return { quest: q.id, beat: i, stat: a[i].stat, from: a[i].tier, to: b[i].tier };
    }
    return null;
  }
  // Skill node impact on tomorrow's board, compared with the best loadout before and after.
  // Prefers a reveal or a tier upgrade on the node's own stat, then any tier upgrade, then a number going up.
  function nodeImpact(c, id, side, bag, regionTier) {
    var n = node(id), own = n && n.stat ? n.stat : 'way';
    var after = { level: c.level, nodes: Object.assign({}, c.nodes), fork: c.fork };
    after.nodes[id] = true; if (id === 'fork') after.fork = side;
    var found = { reveal: null, ownUp: null, up: null, ownNum: null, num: null };
    for (var qi = 0; qi < QUESTS.length; qi++) {
      var q = QUESTS[qi], a = predict(q, c, bestLoadout(q, c, bag, regionTier), regionTier), b = predict(q, after, bestLoadout(q, after, bag, regionTier), regionTier);
      for (var i = 0; i < a.length; i++) {
        if (a[i].unknown && !b[i].unknown) { if (!found.reveal) found.reveal = { quest: q.id, beat: i, reveal: true, stat: b[i].stat, to: b[i].tier }; continue; }
        if (!a[i].tier || !b[i].tier) continue;
        if (TIER_VAL[b[i].tier] > TIER_VAL[a[i].tier]) { var u = { quest: q.id, beat: i, stat: a[i].stat, from: a[i].tier, to: b[i].tier }; if (a[i].stat === own && !found.ownUp) found.ownUp = u; if (!found.up) found.up = u; }
        else if (b[i].value > a[i].value) { var m = { quest: q.id, beat: i, stat: a[i].stat, from: a[i].tier, to: b[i].tier, fromV: a[i].value, toV: b[i].value, next: b[i].tier === 'steady' ? b[i].great : b[i].amazing, numeric: true }; if (a[i].stat === own && !found.ownNum) found.ownNum = m; if (!found.num) found.num = m; }
      }
    }
    return found.reveal || found.ownUp || found.up || found.ownNum || found.num || null;
  }

  /* ---------- the haul (dose-blind part) ---------- */
  // Base per quest-day: 1 Find + 30 Stars + flat XP. Great = +1 roll, Amazing = +2 rolls (one with +1 rarity).
  var BASE_HAUL = { finds: 1, stars: 30 };
  var TABLE = [['find', 45], ['gear', 30], ['stars', 25]];
  function rollCat(r, table) { table = table || TABLE; var x = r() * 100; for (var i = 0; i < table.length; i++) { x -= table[i][1]; if (x < 0) return table[i][0]; } return 'find'; }
  // v5.6 "Look for": re-weights only the extra rolls (Anything = TABLE). Specimens rolls bring 2, all from the quest's set.
  var LOOK_FOR = { any: { table: TABLE, mult: 1, setShare: 0.7 }, gear: { table: [['find', 20], ['gear', 60], ['stars', 20]], mult: 1, setShare: 0.7 }, specimens: { table: [['find', 75], ['gear', 5], ['stars', 20]], mult: 2, setShare: 1 } };
  /* rollHaul(results, ctx) -> { finds, findBumps, stars, gear:[{id,dup}], rolls }
   * ctx: { seed, bag (owned gear ids), kid, forceGear }. The rng is seeded from quest + day only: never from Spark or answers. */
  function rollHaul(results, ctx) {
    ctx = ctx || {};
    var lf = LOOK_FOR[ctx.lookFor] || LOOK_FOR.any;
    var out = { finds: BASE_HAUL.finds, findBumps: 0, stars: BASE_HAUL.stars, gear: [], rolls: [], set: ctx.set || null, setShare: lf.setShare, lookFor: ctx.lookFor || 'any', rollFinds: 0 };
    var bag = (ctx.bag || []).slice(), nRolls = 0, bumps = 0;
    results.forEach(function (r) { if (r.tier === 'great') nRolls += 1; if (r.tier === 'amazing') { nRolls += 2; bumps += 1; } });
    function giveGear(id) { var dup = bag.indexOf(id) >= 0; out.gear.push({ id: id, dup: dup }); if (!dup) bag.push(id); }
    if (ctx.kid) {
      // Kids: a fixed table. Steady = the base; each Great = +1 Find; each Amazing = +1 Find + the next sticker in a published order.
      // Kids, "Look for: Specimens": +1 more (Common, from the set) per Great beat. Fixed, never random.
      results.forEach(function (r) { if (r.tier !== 'steady') { out.finds += 1; out.rolls.push('find'); } if (r.tier === 'great' && ctx.lookFor === 'specimens') { out.finds += 1; out.rolls.push('find'); } if (r.tier === 'amazing') { var nx = KID_STICKERS.filter(function (x) { return bag.indexOf(x) < 0; })[0]; if (nx) { giveGear(nx); out.rolls.push('gear'); } } });
      return out;
    }
    var r = E.rng('rpg-' + (ctx.seed || 'x'));
    if (ctx.forceGear) { giveGear(ctx.forceGear); out.rolls.push('gear'); }
    for (var i = 0; i < nRolls; i++) {
      var cat = rollCat(r, lf.table);
      if (cat === 'find') { out.finds += lf.mult; out.rollFinds += lf.mult; if (bumps > 0) { out.findBumps += 1; bumps--; } }
      else if (cat === 'stars') out.stars += 40;
      else { var pool = BASIC.filter(function (x) { return bag.indexOf(x) < 0; }); if (!pool.length || r() < 0.25) pool = BASIC; giveGear(pool[Math.floor(r() * pool.length)]); }
      out.rolls.push(cat);
    }
    return out;
  }

  /* ---------- packed power-ups: Finds only (they come from doses, so they stay on the Find side) ---------- */
  var PACKABLE = ['magnet', 'double', 'lucky'];
  function packedFinds(pu, results, haul) {
    if (pu === 'magnet') return { finds: results.filter(function (r) { return r.tier !== 'steady'; }).length, bump: 0 };
    if (pu === 'double') return { finds: Math.max(0, haul.finds - BASE_HAUL.finds), bump: 0 };
    if (pu === 'lucky') return { finds: 0, bump: 1 };
    return { finds: 0, bump: 0 };
  }

  /* ---------- chests: Epic and Legendary are "choose 1 of 3", deterministic, never something you own ---------- */
  function chooseThree(pool, owned, seed) {
    var fresh = pool.filter(function (x) { return (owned || []).indexOf(x) < 0; });
    var r = E.rng('choose-' + seed), list = fresh.slice();
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    return list.slice(0, 3);
  }
  function chestChoices(type, owned, seed) { return type === 'legendary' ? chooseThree(LEGENDARY, owned, seed) : type === 'epic' ? chooseThree(EPIC, owned, seed) : []; }

  var RPG = {
    STATS: STATS, SLOTS: SLOTS, XP: XP, xpForNext: xpForNext, levelInfo: levelInfo, xpToReach: xpToReach, answerShares: answerShares, runXp: runXp, spEarned: spEarned,
    ITEMS: ITEMS, BASIC: BASIC, EPIC: EPIC, LEGENDARY: LEGENDARY, KID_STICKERS: KID_STICKERS,
    TREE: TREE, TREE_OPENS: TREE_OPENS, FORK_OPENS: FORK_OPENS, FORK_BONUS: FORK_BONUS, node: node, spentIn: spentIn, hasFlag: hasFlag, canLearn: canLearn,
    stats: stats, beatValue: beatValue, TIERS: TIERS, tierFor: tierFor, QUESTS: QUESTS, quest: quest, questIndex: questIndex, TIER_VAL: TIER_VAL,
    resolve: resolve, predict: predict, score: score, bestLoadout: bestLoadout, gearImpact: gearImpact, nodeImpact: nodeImpact,
    BASE_HAUL: BASE_HAUL, rollHaul: rollHaul, TABLE: TABLE, LOOK_FOR: LOOK_FOR, PACKABLE: PACKABLE, packedFinds: packedFinds, chestChoices: chestChoices
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = RPG;
  root.RPG = RPG;
})(typeof window !== 'undefined' ? window : globalThis);
