/* Kindling v5.6 Part B — progress.js : combining, the Workbench, "Look for", the sample Crew and the Shop guard.
 * Spec: research/wave4/progression-economy-v56.md §6. Pure rules on the state object; no DOM, no theme words.
 *
 * The rules that matter (all tested in tests/engine.test.js):
 *  - DOSE-BLIND. Nothing here reads Spark, Charge, check-ins or the health record. A specimen from a power-up or from
 *    Spark provisions can fill a NEW Field Guide entry, but an extra copy from those sources becomes 25 Stars, never a
 *    spare (FUEL_SRC). A first copy from a fuel source is locked: it can never be combined, gifted or spent.
 *  - The Workbench costs spares only, never Stars, never a last copy.
 *  - "found" and "shiny" are set once and never unset. Combining removes 3 copies and adds 1 (total -2), only upward.
 *  - Crew points come from play only (1 game + 1 feed a day, max 2). Doses and check-ins never count.
 *  - purchase() writes only S.shop and S.looks. No premium currency, no consumables, no randomness, no stats.
 * Exposed as window.Progress in the browser and module.exports in Node. */
(function (root) {
  'use strict';
  var E = root.Engine, R = root.RPG;

  var RAR = ['common', 'uncommon', 'rare', 'epic'];
  var FUEL_SRC = ['powerup', 'provision'];
  var FUEL_STARS = 25;          // = Engine.EQ.find
  var GEAR_MAX = 5, GEAR_MAX_STARS = 100;
  var BENCH_DAY = 30;           // the Workbench opens at day 30 of play (days played, not dates)

  function rank(r) { return RAR.indexOf(r); }
  function find(id) { return E.FIND_BY_ID[id]; }
  function setOf(id) { var f = find(id); return f ? f.set : null; }
  function idsIn(set, rarity) { return E.FINDS.filter(function (f) { return f.set === set && (!rarity || f.rarity === rarity); }).map(function (f) { return f.id; }); }
  function ensure(S) {
    S.owned = S.owned || {}; S.found = S.found || {}; S.fuel = S.fuel || {}; S.shiny = S.shiny || {};
    S.inventory = S.inventory || { bag: [], equipped: { tool: null, garb: null, trinket: null } };
    S.inventory.plus = S.inventory.plus || {};
    return S;
  }
  // Migration for a v5.5 save: everything already owned is found. Idempotent.
  function migrate(S) { ensure(S); Object.keys(S.owned).forEach(function (id) { if (S.owned[id] > 0) S.found[id] = true; }); S.quest = S.quest || { lookFor: 'any' }; if (S.crew === undefined) S.crew = null; S.shop = S.shop || blankShop(); S.looks = S.looks || { equipped: {}, owned: [] }; return S; }

  /* ---------- specimens ---------- */
  // addFind: the only way a specimen arrives. -> { added, stars, isNew }
  function countLife(S) { if (S.life) S.life.finds = (S.life.finds || 0) + 1; }
  function addFind(S, id, src) {
    ensure(S); if (!find(id)) return { added: false, stars: 0, isNew: false };
    var r = addFind0(S, id, src); if (r.added && src !== 'combine') countLife(S); return r;
  }
  function addFind0(S, id, src) {
    var has = (S.owned[id] || 0) > 0, isNew = !S.found[id];
    if (FUEL_SRC.indexOf(src) >= 0) {
      if (has) return { added: false, stars: FUEL_STARS, isNew: false };   // an extra copy from doses -> Stars, never a spare
      S.owned[id] = 1; S.found[id] = true; S.fuel[id] = 1;                 // a first copy: found, but locked
      return { added: true, stars: 0, isNew: isNew };
    }
    // Every other source (play, chest, gift, crew, pass, combine) adds a real copy. A locked power-up copy, if there is one,
    // stays locked and never counts as a spare (see spares()), so doses can't turn any copy into a spare by any path.
    S.owned[id] = (S.owned[id] || 0) + 1; S.found[id] = true;
    return { added: true, stars: 0, isNew: isNew };
  }
  // A locked power-up copy is held but never spendable: spares = copies - your first copy - the locked one.
  function lockedN(S, id) { return S.fuel && S.fuel[id] && ((S.owned || {})[id] || 0) > 0 ? 1 : 0; }
  function spares(S, id) { var n = (S.owned || {})[id] || 0; return Math.max(0, n - 1 - lockedN(S, id)); }
  function usable(S, id, useLast) { var n = (S.owned || {})[id] || 0; if (!n) return 0; return useLast ? n - lockedN(S, id) : spares(S, id); }
  function spareTotal(S, set, rarity) { return idsIn(set, rarity).reduce(function (a, id) { return a + spares(S, id); }, 0); }
  function nextRarity(r) { return RAR[rank(r) + 1] || null; }
  function combineOptions(S, set, rarity) {
    var nx = nextRarity(rarity), tot = spareTotal(S, set, rarity);
    return { set: set, rarity: rarity, next: nx, spareTotal: tot, canMake: nx ? Math.floor(tot / 3) : 0, outputs: nx ? idsIn(set, nx).map(function (id) { return { id: id, isNew: !S.found[id] }; }) : [] };
  }
  // Default "take": the spares you hold the most of first (keeps variety). Never a last copy.
  function defaultTake(S, ids, n) {
    var pool = ids.map(function (id) { return { id: id, n: spares(S, id) }; }).filter(function (x) { return x.n > 0; }), take = {}, left = n;
    while (left > 0) { pool.sort(function (a, b) { return b.n - a.n || (a.id < b.id ? -1 : 1); }); if (!pool.length || pool[0].n <= 0) return null; take[pool[0].id] = (take[pool[0].id] || 0) + 1; pool[0].n--; left--; }
    return take;
  }
  function takeSum(take) { return Object.keys(take || {}).reduce(function (a, k) { return a + (+take[k] || 0); }, 0); }
  // Checks a take against the rules: every id in the set/rarity, never more than usable, last copies only with confirm.
  function checkTake(S, take, set, rarity, confirmLast) {
    var keys = Object.keys(take || {});
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i], n = +take[id] || 0, f = find(id); if (n <= 0) continue;
      if (!f || (set != null && f.set !== set) || f.rarity !== rarity) return 'wrongSet';
      if (n > spares(S, id)) { if (n > usable(S, id, true)) return lockedN(S, id) ? 'locked' : 'needs3'; if (!confirmLast) return 'lastCopy'; }
    }
    return null;
  }
  function removeTake(S, take) { Object.keys(take).forEach(function (id) { S.owned[id] = Math.max(0, (S.owned[id] || 0) - (+take[id] || 0)); }); }
  // combine: exactly 3 of one rarity from one set -> 1 of the next rarity, same set, the one you pick. Total copies -2.
  function combine(S, o) {
    ensure(S); o = o || {};
    var set = o.set, rarity = o.rarity, nx = nextRarity(rarity);
    if (!nx) return { ok: false, why: 'topRarity' };
    var take = o.take || defaultTake(S, idsIn(set, rarity), 3);
    if (!take || takeSum(take) !== 3) return { ok: false, why: 'needs3' };
    var bad = checkTake(S, take, set, rarity, !!o.confirmLast); if (bad) return { ok: false, why: bad };
    var out = find(o.output); if (!out || out.set !== set || out.rarity !== nx) return { ok: false, why: 'wrongSet' };
    var isNew = !S.found[o.output];
    removeTake(S, take);
    addFind(S, o.output, 'combine');
    return { ok: true, made: o.output, isNew: isNew };
  }
  // Fill gaps: one step at a time, missing specimens only, spares only (never a last copy), never a Shiny.
  function fillGapsPlan(S) {
    ensure(S); var plan = [], shadow = JSON.parse(JSON.stringify({ owned: S.owned, found: S.found, fuel: S.fuel }));
    for (var set = 1; set <= 4; set++) for (var ri = 1; ri < RAR.length; ri++) {
      var rarity = RAR[ri], below = RAR[ri - 1];
      idsIn(set, rarity).forEach(function (id) {
        if (shadow.found[id]) return;
        var take = defaultTake(shadow, idsIn(set, below), 3); if (!take) return;
        removeTake(shadow, take); shadow.found[id] = true; shadow.owned[id] = 1;
        plan.push({ set: set, rarity: below, take: take, output: id });
      });
    }
    // single step: an output made in this plan is never used as input (shadow marks it owned=1, so it has 0 spares)
    return plan;
  }
  function fillGaps(S) { var plan = fillGapsPlan(S), made = []; plan.forEach(function (p) { var r = combine(S, p); if (r.ok) made.push(r.made); }); return made; }
  function readyCount(S, set) { var n = 0; for (var ri = 0; ri < RAR.length - 1; ri++) n += Math.floor(spareTotal(S, set, RAR[ri]) / 3); return n + (shinyOptions(S, set).can ? 1 : 0); }
  function setFound(S, set) { return idsIn(set).filter(function (id) { return S.found && S.found[id]; }).length; }
  /* Shiny: 3 Epic spares from a set make any one specimen in that set Shiny. A look only. Each specimen once. */
  function shinyOptions(S, set) { var tot = spareTotal(S, set, 'epic'); return { spareTotal: tot, can: tot >= 3, targets: idsIn(set).filter(function (id) { return S.found[id] && !S.shiny[id]; }) }; }
  function makeShiny(S, o) {
    ensure(S); var set = o.set, target = o.target, f = find(target);
    if (!f || f.set !== set) return { ok: false, why: 'wrongSet' };
    if (!S.found[target]) return { ok: false, why: 'notFound' };
    if (S.shiny[target]) return { ok: false, why: 'already' };
    var take = o.take || defaultTake(S, idsIn(set, 'epic'), 3);
    if (!take || takeSum(take) !== 3) return { ok: false, why: 'needs3' };
    var bad = checkTake(S, take, set, 'epic', false); if (bad) return { ok: false, why: bad };
    removeTake(S, take); S.shiny[target] = true;
    return { ok: true, target: target };
  }

  /* ---------- the Workbench: gear +1..+5, costs spares of the gear's rarity (Legendary: Epic x2), never Stars ---------- */
  var COST = { 1: 2, 2: 3, 3: 4, 4: 5 };
  function plusOf(S, itemId) { return Math.max(1, Math.min(GEAR_MAX, ((S.inventory && S.inventory.plus) || {})[itemId] || 1)); }
  function upgradeCost(itemId, plus) {
    var it = R.ITEMS[itemId]; plus = plus || 1; if (!it || plus >= GEAR_MAX) return null;
    return it.rarity === 'legendary' ? { rarity: 'epic', n: COST[plus] * 2 } : { rarity: it.rarity, n: COST[plus] };
  }
  function spareIdsOf(rarity) { return E.FINDS.filter(function (f) { return f.rarity === rarity; }).map(function (f) { return f.id; }); }
  function sparesOfRarity(S, rarity) { return spareIdsOf(rarity).reduce(function (a, id) { return a + spares(S, id); }, 0); }
  // "Day 30 of the journey" = days played, counting today as the next one until it's lit (same as the Book's page numbers).
  function journeyDay(S) { var c = S.camp || {}; return (c.total || 0) + (c.lastLit === S.day ? 0 : 1); }
  function benchOpen(S) { return !!(S.flags && S.flags.benchOpen) || journeyDay(S) >= BENCH_DAY; }
  function upgrade(S, itemId, take) {
    ensure(S);
    if (!benchOpen(S)) return { ok: false, why: 'locked' };
    if ((S.inventory.bag || []).indexOf(itemId) < 0) return { ok: false, why: 'notOwned' };
    var p = plusOf(S, itemId), c = upgradeCost(itemId, p); if (!c) return { ok: false, why: 'max' };
    take = take || defaultTake(S, spareIdsOf(c.rarity), c.n);
    if (!take) return { ok: false, why: 'short', need: c.n - sparesOfRarity(S, c.rarity), rarity: c.rarity };
    if (takeSum(take) !== c.n) return { ok: false, why: 'count' };
    var keys = Object.keys(take);
    for (var i = 0; i < keys.length; i++) { var f = find(keys[i]); if (!f || f.rarity !== c.rarity) return { ok: false, why: 'rarity' }; if (+take[keys[i]] > spares(S, keys[i])) return { ok: false, why: 'lastCopy' }; } // never a last copy, never a locked copy
    removeTake(S, take); S.inventory.plus[itemId] = p + 1;
    return { ok: true, plus: p + 1, used: take };
  }
  // A duplicate piece of gear merges by itself: +1, or 100 Stars at +5. (The Store adds the Stars.)
  function gearArrive(S, itemId) {
    ensure(S); if (!R.ITEMS[itemId]) return { kind: 'none' };
    if ((S.inventory.bag || []).indexOf(itemId) < 0) { S.inventory.bag.push(itemId); return { kind: 'new', plus: 1 }; }
    var p = plusOf(S, itemId);
    if (p >= GEAR_MAX) return { kind: 'stars', stars: GEAR_MAX_STARS, plus: p };
    S.inventory.plus[itemId] = p + 1; return { kind: 'plus', plus: p + 1 };
  }

  /* ---------- "Look for": re-weights only the extra rolls. Base haul and outcome tiers never change. ---------- */
  var LOOK = R.LOOK_FOR; // one table, in rpg.js (rollHaul uses it)
  function lookForTable(mode) { var l = LOOK[mode] || LOOK.any; return { table: l.table.map(function (x) { return x.slice(); }), findMult: l.mult, setShare: l.setShare }; }
  var QUEST_SET = { q1: 1, q2: 2, q3: 3 }; // destination -> specimen set (Saltflats / Canopy / Tidepools; Grove: market / meadow / orchard)

  /* ---------- the Crew (sample in the prototype). Play only: 1 game + 1 feed a day. ---------- */
  var SAMPLE_MEMBERS = [['BraveOtter-412', 'otter'], ['MossyFinch-077', 'fox'], ['QuietHeron-230', 'drake'], ['SunnyMoth-519', 'otter'], ['TallPine-808', 'fox']];
  function crewTiers(memberCount) { if (memberCount < 4) return []; var max = memberCount * 7 * 2; return [0.12, 0.30, 0.48].map(function (p) { return Math.round(max * p); }); }
  function weekId(day) { return 'w' + E.weekIndex(day); }
  function sampleCrew(day) {
    var members = SAMPLE_MEMBERS.map(function (m) { return { handle: m[0], species: m[1], sample: true }; });
    return { id: 'crew-sample-1', name: 'Lantern Crew', sample: true, joinedDay: day - 7, members: members,
      week: newWeek(day, members.length + 1), gifts: { sentDay: null, inbox: [], inToday: 0, inDay: day, lastSent: null },
      moments: [{ id: 'm1', handle: 'BraveOtter-412', species: 'otter', kind: 'evolve', text: 'BraveOtter-412’s otter grew to Scout!', day: day - 1, cheers: 4, mine: false, cheered: null }] };
  }
  // P13: rewards reached but not claimed carry over the week change and wait until claimed.
  function carryOver(c) {
    c.carry = c.carry || [];
    (c.week.tiers || []).forEach(function (t, i) { if (!c.week.claimed[i] && c.week.shared >= t) { c.carrySeq = (c.carrySeq || 0) + 1; c.carry.push({ tier: i, week: c.week.id, key: 'c' + c.carrySeq }); } });
  }
  function newWeek(day, n) { return { id: weekId(day), shared: 0, mineToday: { game: 0, feed: 0 }, mineDay: day, tiers: crewTiers(n), claimed: [false, false, false] }; }
  function crewSize(c) { return c ? c.members.length + 1 : 0; }
  function rollWeek(S, day) { var c = S.crew; if (c && c.week.id !== weekId(day)) { carryOver(c); c.week = newWeek(day, crewSize(c)); } }
  // crewAdd: the only way your points move. kind 'game' | 'feed'; each at most 1 a day. Never from check-ins.
  function crewAdd(S, kind, day) {
    var c = S.crew; if (!c || (kind !== 'game' && kind !== 'feed')) return 0;
    rollWeek(S, day);
    if (c.week.mineDay !== day) { c.week.mineToday = { game: 0, feed: 0 }; c.week.mineDay = day; }
    if (c.week.mineToday[kind]) return 0;
    c.week.mineToday[kind] = 1; return 1;
  }
  // Deterministic sample-member points for a day (0-2 each, seeded per week + day). Never anything health-related.
  function samplePoints(c, day) { var r = E.rng('crew-' + c.id + '-' + day), t = 0; c.members.forEach(function () { var x = r(); t += x < 0.25 ? 0 : x < 0.55 ? 1 : 2; }); return t; }
  // Daily batch at the rollover: yesterday's points (yours + the sample members') go on the shared meter.
  function crewEndDay(S, day) {
    var c = S.crew; if (!c) return;
    rollWeek(S, day);
    var mine = c.week.mineDay === day ? (c.week.mineToday.game || 0) + (c.week.mineToday.feed || 0) : 0;
    c.week.shared += mine + samplePoints(c, day);
    if (weekId(day + 1) !== c.week.id) { carryOver(c); c.week = newWeek(day + 1, crewSize(c)); } else { c.week.mineToday = { game: 0, feed: 0 }; c.week.mineDay = day + 1; }
  }
  var TIER_REWARD = [{ rarity: 'uncommon' }, { rarity: 'rare' }, { rarity: 'rare', banner: true }];
  /* crewClaimable -> the next reward ready to pick, or null: { key: 'c0' (carried from an earlier week) | 'w1' (this week), tier }.
   * Carried rewards come first. Nothing is ever lost (P13). */
  function crewClaimable(S, day) {
    var c = S.crew; if (!c || day - c.joinedDay < 7) return null;
    if (c.carry && c.carry.length) return { key: c.carry[0].key || 'c0', tier: c.carry[0].tier }; // its own key: a double-tap claims once
    for (var i = 0; i < 3; i++) if (!c.week.claimed[i] && c.week.shared >= c.week.tiers[i]) return { key: 'w' + i, tier: i };
    return null;
  }
  function crewClaim(S, key, pickId, day) {
    var c = S.crew, ready = crewClaimable(S, day); if (!c || !ready || ready.key !== key) return { ok: false, why: 'notReady' };
    var tierIdx = ready.tier, f = find(pickId); if (!f || f.rarity !== TIER_REWARD[tierIdx].rarity) return { ok: false, why: 'rarity' };
    if (key.charAt(0) === 'c') c.carry.shift(); else c.week.claimed[tierIdx] = true;
    addFind(S, pickId, 'crew');
    if (TIER_REWARD[tierIdx].banner) { S.looks = S.looks || { equipped: {}, owned: [] }; if (S.looks.owned.indexOf('crew.banner') < 0) S.looks.owned.push('crew.banner'); }
    return { ok: true, id: pickId };
  }
  // Gifts: send 1 spare a day (Common or Uncommon, never a last copy, never a locked fuel copy). Receive up to 3 a day.
  function giftSpare(S, id, toHandle, day, kid) {
    var c = S.crew; if (kid) return { ok: false, why: 'kid' }; if (!c) return { ok: false, why: 'noCrew' };
    if (c.gifts.sentDay === day) return { ok: false, why: 'oneADay' };
    var f = find(id); if (!f) return { ok: false, why: 'notSpare' };
    if (lockedN(S, id) && spares(S, id) < 1) return { ok: false, why: 'locked' };
    if (f.rarity !== 'common' && f.rarity !== 'uncommon') return { ok: false, why: 'rarity' };
    if (spares(S, id) < 1) return { ok: false, why: 'notSpare' };
    if (!c.members.some(function (m) { return m.handle === toHandle; })) return { ok: false, why: 'member' };
    S.owned[id] -= 1; c.gifts.sentDay = day; c.gifts.lastSent = { to: toHandle, id: id };
    return { ok: true };
  }
  function giftsIn(S, day) { // takes up to 3 gifts a day from the inbox; the rest wait (never lost)
    var c = S.crew; if (!c) return [];
    if (c.gifts.inDay !== day) { c.gifts.inDay = day; c.gifts.inToday = 0; }
    var got = [];
    while (c.gifts.inbox.length && c.gifts.inToday < 3) { var g = c.gifts.inbox.shift(); addFind(S, g.id, 'gift'); c.gifts.inToday++; got.push(g); }
    return got;
  }
  var CHEERS = ['Cheer']; // one button, no choosing (UX review)
  function cheer(S, momentId, which) { var c = S.crew, m = c && c.moments.filter(function (x) { return x.id === momentId; })[0]; if (!m || m.mine || m.cheered || CHEERS.indexOf(which) < 0) return false; m.cheered = which; m.cheers++; return true; }
  function postMoment(S, kind, text, day, handle, species) { var c = S.crew; if (!c) return null; var m = { id: 'mo' + (c.moments.length + 1) + '-' + day, handle: handle, species: species, kind: kind, text: text, day: day, cheers: 0, mine: true, cheered: null }; c.moments.unshift(m); return m; }
  function liveMoments(c, day) { return (c.moments || []).filter(function (m) { return day - m.day < 7; }); }

  /* ---------- the Shop: fixed-price looks and the deterministic Season Pass. Preview only: no payment flow. ---------- */
  function blankShop() { return { owned: [], preview: true, previewSpent: 0, pass: { season: 's1', extra: false, step: 0, lastStepDay: null, claimedFree: [], claimedExtra: [] } }; }
  var CATALOG = [
    { id: 'look.basic', kind: 'look', names: { expedition: 'Autumn coat', grove: 'Dewdrop cloak' }, price: 2.99, currency: 'USD', grants: ['look.basic'], stats: null, icon: '🧥' },
    { id: 'look.deluxe', kind: 'look-deluxe', names: { expedition: 'Starlit coat', grove: 'Moonpetal cloak' }, price: 4.99, currency: 'USD', grants: ['look.deluxe'], stats: null, icon: '✨' },
    // Camp sets, board skins, covers and effects are designed (spec §4.2) but left out of the prototype until they can be used.
    { id: 'pass.s1', kind: 'pass', names: { expedition: 'Saltflats Season Pass', grove: 'Meadow Season Pass' }, price: 4.99, currency: 'USD', grants: ['pass.s1'], stats: null, icon: '🎫' },
    { id: 'plus', kind: 'plus', names: { expedition: 'Plus', grove: 'Plus' }, price: null, currency: 'USD', grants: [], stats: null, comingLater: true, icon: '➕' }
  ];
  function item(id) { return CATALOG.filter(function (x) { return x.id === id; })[0] || null; }
  function shopAllowed(S) { return !(S.profile && (S.profile.kid || S.profile.teen)); }
  // purchase: writes ONLY S.shop and S.looks. Refused for kid and teen profiles. Nothing random, nothing with stats.
  function purchase(S, itemId) {
    if (!shopAllowed(S)) return { ok: false, why: 'kid' };
    var it = item(itemId); if (!it || it.comingLater || it.price == null) return { ok: false, why: 'unknown' };
    S.shop = S.shop || blankShop(); S.looks = S.looks || { equipped: {}, owned: [] };
    if (S.shop.owned.indexOf(itemId) >= 0) return { ok: false, why: 'owned' };
    S.shop.owned.push(itemId); S.shop.previewSpent = Math.round((S.shop.previewSpent + it.price) * 100) / 100;
    if (it.kind === 'pass') S.shop.pass.extra = true;
    else it.grants.forEach(function (g) { if (S.looks.owned.indexOf(g) < 0) S.looks.owned.push(g); });
    return { ok: true, item: itemId };
  }
  // The Season Pass: 30 steps, one per day played (the day lit the Campfire). Never doses. Never expires.
  var PASS = [];
  (function () {
    // Every reward can be used right away: specimen picks, Camp pieces (they go to your Camp) and looks you can wear.
    var free = { 3: { kind: 'pick', rarity: 'uncommon' }, 8: { kind: 'pick', rarity: 'rare' }, 12: { kind: 'pick', rarity: 'uncommon' }, 18: { kind: 'pick', rarity: 'rare' }, 25: { kind: 'pick', rarity: 'rare' }, 5: { kind: 'camp' }, 20: { kind: 'camp' }, 10: { kind: 'look', id: 'pass.look0' }, 15: { kind: 'look', id: 'pass.look1' }, 30: { kind: 'look', id: 'pass.look2' } };
    for (var n = 1; n <= 30; n++) PASS.push({ n: n, free: free[n] || null, extra: { kind: 'look', id: 'passx.' + n } });
  })();
  function passStep(S, playedDay) {
    S.shop = S.shop || blankShop(); var p = S.shop.pass;
    if (p.lastStepDay === playedDay || p.step >= PASS.length) return false;
    p.step += 1; p.lastStepDay = playedDay; return true;
  }
  function passClaim(S, row, n, pickId) {
    S.shop = S.shop || blankShop(); var p = S.shop.pass, st = PASS[n - 1]; if (!st || n > p.step) return { ok: false, why: 'notYet' };
    if (row === 'extra') {
      if (!p.extra) return { ok: false, why: 'noPass' }; if (p.claimedExtra.indexOf(n) >= 0) return { ok: false, why: 'claimed' };
      p.claimedExtra.push(n); S.looks = S.looks || { equipped: {}, owned: [] }; if (S.looks.owned.indexOf(st.extra.id) < 0) S.looks.owned.push(st.extra.id); return { ok: true };
    }
    if (!st.free) return { ok: false, why: 'none' }; if (p.claimedFree.indexOf(n) >= 0) return { ok: false, why: 'claimed' };
    if (st.free.kind === 'pick') { var f = find(pickId); if (!f || f.rarity !== st.free.rarity) return { ok: false, why: 'rarity' }; addFind(S, pickId, 'pass'); }
    else if (st.free.kind === 'camp') { S.decorOwned = S.decorOwned || []; var d = ['d1', 'd2', 'd3', 'd4', 'd6', 'd5'].filter(function (x) { return S.decorOwned.indexOf(x) < 0; })[0]; if (d) S.decorOwned.push(d); else { S.looks = S.looks || { equipped: {}, owned: [] }; S.looks.owned.push('pass.camp' + n); } p.claimedFree.push(n); return { ok: true, decor: d || null }; }
    else { S.looks = S.looks || { equipped: {}, owned: [] }; if (S.looks.owned.indexOf(st.free.id) < 0) S.looks.owned.push(st.free.id); }
    p.claimedFree.push(n); return { ok: true };
  }
  function passReady(S) { var p = (S.shop || blankShop()).pass, n = 0; PASS.forEach(function (st) { if (st.n <= p.step && st.free && p.claimedFree.indexOf(st.n) < 0) n++; if (st.n <= p.step && p.extra && p.claimedExtra.indexOf(st.n) < 0) n++; }); return n; }

  var Progress = {
    RAR: RAR, FUEL_SRC: FUEL_SRC, FUEL_STARS: FUEL_STARS, GEAR_MAX: GEAR_MAX, GEAR_MAX_STARS: GEAR_MAX_STARS, BENCH_DAY: BENCH_DAY,
    ensure: ensure, migrate: migrate, lockedN: lockedN, idsIn: idsIn, setOf: setOf, nextRarity: nextRarity,
    addFind: addFind, spares: spares, usable: usable, spareTotal: spareTotal, combineOptions: combineOptions, defaultTake: defaultTake, combine: combine,
    fillGapsPlan: fillGapsPlan, fillGaps: fillGaps, readyCount: readyCount, setFound: setFound, shinyOptions: shinyOptions, makeShiny: makeShiny,
    journeyDay: journeyDay, plusOf: plusOf, upgradeCost: upgradeCost, sparesOfRarity: sparesOfRarity, benchOpen: benchOpen, upgrade: upgrade, gearArrive: gearArrive,
    LOOK: LOOK, lookForTable: lookForTable, QUEST_SET: QUEST_SET,
    SAMPLE_MEMBERS: SAMPLE_MEMBERS, crewTiers: crewTiers, sampleCrew: sampleCrew, crewSize: crewSize, crewAdd: crewAdd, crewEndDay: crewEndDay, crewClaimable: crewClaimable, crewClaim: crewClaim, TIER_REWARD: TIER_REWARD,
    giftSpare: giftSpare, giftsIn: giftsIn, CHEERS: CHEERS, cheer: cheer, postMoment: postMoment, liveMoments: liveMoments, weekId: weekId,
    CATALOG: CATALOG, item: item, shopAllowed: shopAllowed, purchase: purchase, blankShop: blankShop, PASS: PASS, passStep: passStep, passClaim: passClaim, passReady: passReady
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Progress;
  root.Progress = Progress;
})(typeof window !== 'undefined' ? window : globalThis);
