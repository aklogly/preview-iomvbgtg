/* Kindling v5 — engine.js
 * Pure economy + regimen logic. No DOM. Theme-blind.
 * The health record is the truth; the game reads it and never writes to it.
 * Exposed as window.Engine in the browser and module.exports in Node (for tests).
 */
(function (root) {
  'use strict';

  /* ---------- time helpers ---------- */
  // Demo day 1 = Monday 9 Nov 2026. weekday(dayNum): 0=Sun..6=Sat
  var BASE = { y: 2026, m: 10, d: 8 };
  function dateOf(dayNum) { return new Date(BASE.y, BASE.m, BASE.d + dayNum, 12, 0, 0); }
  function weekday(dayNum) { return dateOf(dayNum).getDay(); }
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(dayNum) { var d = dateOf(dayNum); return WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function weekIndex(dayNum) { return Math.floor((dayNum - 1) / 7); }
  function fmtDateLong(dayNum) { var d = dateOf(dayNum); return WD_LONG[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function toMins(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function fmtTime(mins) {
    mins = Math.max(0, Math.round(mins)) % 1440;
    var h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? 'PM' : 'AM';
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  /* ---------- seeded RNG ---------- */
  function hash(str) {
    var h = 1779033703 ^ String(str).length;
    for (var i = 0; i < String(str).length; i++) {
      h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0);
  }
  function rng(seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- fair split (largest remainder; always sums exactly) ---------- */
  function allocate(total, n) {
    if (n <= 0) return [];
    var base = Math.floor(total / n), rem = total - base * n, out = [];
    for (var i = 0; i < n; i++) out.push(base + (i < rem ? 1 : 0));
    return out;
  }

  /* ---------- regimen ---------- */
  var SLOTS = [
    { id: 'morning', label: 'Morning', from: 0, to: 660 },
    { id: 'midday', label: 'Midday', from: 660, to: 960 },
    { id: 'evening', label: 'Evening', from: 960, to: 1230 },
    { id: 'bedtime', label: 'Bedtime', from: 1230, to: 1440 }
  ];
  function slotFor(mins) { for (var i = 0; i < SLOTS.length; i++) if (mins >= SLOTS[i].from && mins < SLOTS[i].to) return SLOTS[i]; return SLOTS[3]; }

  function isPaused(med, dayNum) {
    if (!med.paused) return false;
    if (med.pausedFrom && dayNum < med.pausedFrom) return false;
    if (med.pausedUntil && dayNum > med.pausedUntil) return false;
    return true;
  }
  function isScheduledOn(med, dayNum) {
    if (med.kind === 'prn') return false;
    if (isPaused(med, dayNum)) return false;
    if (med.startDay && dayNum < med.startDay) return false;
    if (med.endDay && dayNum > med.endDay) return false;
    if (med.kind === 'weekly') return weekday(dayNum) === (med.weekday == null ? 0 : med.weekday);
    return true;
  }
  // Taper: the label changes per step; the fragment count does not.
  function doseLabel(med, dayNum) {
    if (med.kind === 'taper' && med.steps && med.steps.length) {
      var lbl = med.steps[0].label;
      for (var i = 0; i < med.steps.length; i++) if (dayNum >= med.steps[i].fromDay) lbl = med.steps[i].label;
      return lbl;
    }
    return med.strength || '';
  }
  function taperStepChanged(med, dayNum) {
    if (med.kind !== 'taper' || !med.steps) return false;
    for (var i = 1; i < med.steps.length; i++) if (med.steps[i].fromDay === dayNum) return true;
    return false;
  }

  /* compilePlan: groups the day's scheduled doses into stacks by time of day.
   * Every day is worth exactly 100 Charge. Each stack = 100 / stacks. Never weighted by medicine. */
  function compilePlan(meds, dayNum) {
    var buckets = {}, order = [], prn = [], anyScheduledKind = false;
    (meds || []).forEach(function (med) {
      if (med.kind === 'prn') { if (!isPaused(med, dayNum)) prn.push(med.id); return; }
      anyScheduledKind = true;
      if (!isScheduledOn(med, dayNum)) return;
      (med.times && med.times.length ? med.times : ['08:00']).forEach(function (t) {
        var m = toMins(t), s = slotFor(m);
        if (!buckets[s.id]) { buckets[s.id] = { id: s.id, label: s.label, mins: m, doses: [], kind: 'dose' }; order.push(s.id); }
        var b = buckets[s.id];
        b.mins = Math.min(b.mins, m);
        b.doses.push({ medId: med.id, label: doseLabel(med, dayNum), weekly: med.kind === 'weekly' });
      });
    });
    var stacks = order.map(function (k) { return buckets[k]; }).sort(function (a, b) { return a.mins - b.mins; });
    var rest = false, journal = false;
    if (!stacks.length) {
      if (!anyScheduledKind && prn.length) { journal = true; stacks = [{ id: 'journal', label: 'Daily journal', mins: 720, doses: [], kind: 'journal' }]; }
      else { rest = true; stacks = [{ id: 'rest', label: 'Rest day', mins: 480, doses: [], kind: 'rest' }]; }
    }
    var n = stacks.length, v = allocate(100, n), s = allocate(80, n), x = allocate(80, n), o = allocate(20, n);
    stacks.forEach(function (st, i) {
      st.value = v[i]; st.stars = s[i]; st.xp = x[i]; st.onTime = o[i];
      st.boss = st.doses.some(function (d) { return d.weekly; });
    });
    return { dayNum: dayNum, stacks: stacks, rest: rest, journal: journal, boss: stacks.some(function (s) { return s.boss; }), prn: prn, locked: true };
  }
  function planTotal(plan) { return plan.stacks.reduce(function (a, s) { return a + s.value; }, 0); }

  /* ---------- check-in credit ---------- */
  var FULL = { swallowed: 1, took: 1, held: 1, rest: 1, journal: 1 };
  var HONEST = { didnt: 1, unsure: 1 };
  var WINDOW = { before: 60, after: 90 };
  function inWindow(stack, atMins) { return atMins >= stack.mins - WINDOW.before && atMins <= stack.mins + WINDOW.after; }

  /* ctx.mode: 'live' (logged as it happens), 'later' (same day, after the fact), 'backfill' (previous day, < 48h), 'old' (> 48h)
   * Two-step and one-tap earn exactly the same. Late live logs earn the full fragment, without the on-time bonus. */
  function creditFor(stack, answer, ctx) {
    ctx = ctx || {};
    var mode = ctx.mode || 'live';
    var r = { charge: 0, stars: 0, xp: 0, onTimeStars: 0, checkin: true, bond: 1, quiet: false };
    if (mode === 'old') return { charge: 0, stars: 0, xp: 0, onTimeStars: 0, checkin: false, bond: 0, quiet: true };
    if (FULL[answer]) {
      r.charge = stack.value; r.stars = stack.stars; r.xp = stack.xp;
      if (mode === 'live' && answer !== 'held' && (stack.kind !== 'dose' || inWindow(stack, ctx.atMins))) r.onTimeStars = stack.onTime; // rest/journal days: any time that day counts as on time
      if (answer === 'held') r.quiet = true;
    } else if (HONEST[answer]) {
      r.xp = Math.round(stack.xp * 0.3);
    } else {
      return { charge: 0, stars: 0, xp: 0, onTimeStars: 0, checkin: false, bond: 0, quiet: true };
    }
    if (mode === 'backfill') {
      r.charge = Math.round(r.charge * 0.5); r.stars = Math.round(r.stars * 0.5); r.xp = Math.round(r.xp * 0.5); r.onTimeStars = 0;
    }
    return r;
  }

  /* ---------- PRN / as-needed journal: once per day, flat, same for "used" and "didn't need any" ---------- */
  var JOURNAL = { stars: 10, xp: 10 };
  function journalReward(alreadyPaid) { return alreadyPaid ? { stars: 0, xp: 0, paid: false } : { stars: JOURNAL.stars, xp: JOURNAL.xp, paid: true }; }

  /* ---------- Power Bank: every 100 Charge pops one power-up; remainder carries over ---------- */
  var PU_ORDER = ['magnet', 'lens', 'double', 'lucky'];
  var PU_CAP = 10;
  function powerBank(bank, add) { var t = bank + add; return { bank: t % 100, drops: Math.floor(t / 100) }; }
  function nextPowerUp(totalDropped) { return PU_ORDER[totalDropped % PU_ORDER.length]; }

  /* ---------- levels ---------- */
  function xpForNext(level) { return 150 + 50 * level; }
  function levelInfo(xp) {
    var l = 1, rem = Math.max(0, xp);
    while (rem >= xpForNext(l)) { rem -= xpForNext(l); l++; }
    return { level: l, into: rem, need: xpForNext(l) };
  }

  /* ---------- catalog: 4 sets x 9 Finds (theme renders each id) ---------- */
  var RARITIES = ['common', 'uncommon', 'rare', 'epic'];
  function rarityOfIndex(i) { return i <= 4 ? 'common' : i <= 7 ? 'uncommon' : i === 8 ? 'rare' : 'epic'; }
  var FINDS = [];
  for (var si = 1; si <= 4; si++) for (var fi = 1; fi <= 9; fi++) FINDS.push({ id: 's' + si + '-' + fi, set: si, idx: fi, rarity: rarityOfIndex(fi) });
  var FIND_BY_ID = {}; FINDS.forEach(function (f) { FIND_BY_ID[f.id] = f; });
  function rarityRank(r) { return RARITIES.indexOf(r); }

  /* ---------- chests: disclosed odds, pity every 10, no near-miss ---------- */
  var CHESTS = {
    basic:  { label: 'Basic',  finds: 1, stars: [20, 40],  weights: { common: 70, uncommon: 25, rare: 4, epic: 1 }, powerUp: 0 },
    bronze: { label: 'Bronze', finds: 2, stars: [40, 80],  weights: { common: 60, uncommon: 32, rare: 7, epic: 1 }, powerUp: 0 },
    silver: { label: 'Silver', finds: 3, stars: [60, 100], weights: { common: 45, uncommon: 40, rare: 12, epic: 3 }, powerUp: 0.3 },
    gold:   { label: 'Gold',   finds: 3, stars: [80, 140], weights: { common: 35, uncommon: 40, rare: 20, epic: 5 }, powerUp: 1, guaranteeRare: true },
    // v5.3: long Campfire milestones only (day 100+). Same disclosed-odds rules; never sold.
    epic:      { label: 'Epic',      finds: 4, stars: [120, 200], weights: { common: 25, uncommon: 40, rare: 25, epic: 10 }, powerUp: 1, guaranteeRare: true },
    legendary: { label: 'Legendary', finds: 5, stars: [200, 320], weights: { common: 15, uncommon: 35, rare: 30, epic: 20 }, powerUp: 1, guaranteeRare: true }
  };
  var PITY_EVERY = 10;
  function rollRarity(r, w) {
    var tot = 0, k; for (k in w) tot += w[k];
    var x = r() * tot;
    for (var i = 0; i < RARITIES.length; i++) { k = RARITIES[i]; x -= (w[k] || 0); if (x < 0) return k; }
    return 'common';
  }
  function pickFind(r, rarity, owned, preferNew) {
    var pool = FINDS.filter(function (f) { return f.rarity === rarity; });
    if (preferNew) { var fresh = pool.filter(function (f) { return !(owned && owned[f.id]); }); if (fresh.length && r() < 0.7) pool = fresh; }
    return pool[Math.floor(r() * pool.length)];
  }
  /* ctx: {pity, owned, rng} -> {type, finds:[{id,rarity,dup}], stars, powerUp, pity, pityTriggered} */
  function rollChest(type, ctx) {
    ctx = ctx || {};
    var spec = CHESTS[type] || CHESTS.basic, r = ctx.rng || rng(String(Date.now()));
    var owned = Object.assign({}, ctx.owned || {}), finds = [], pity = ctx.pity || 0;
    var forceRare = spec.guaranteeRare || pity >= PITY_EVERY - 1, pityTriggered = !spec.guaranteeRare && pity >= PITY_EVERY - 1;
    for (var i = 0; i < spec.finds; i++) {
      var rar = rollRarity(r, spec.weights);
      if (forceRare && i === spec.finds - 1 && !finds.some(function (f) { return rarityRank(f.rarity) >= 2; }) && rarityRank(rar) < 2) rar = r() < 0.8 ? 'rare' : 'epic';
      var f = pickFind(r, rar, owned, true);
      finds.push({ id: f.id, rarity: f.rarity, dup: !!owned[f.id] });
      owned[f.id] = (owned[f.id] || 0) + 1;
    }
    var stars = spec.stars[0] + Math.round(r() * (spec.stars[1] - spec.stars[0]));
    var powerUp = spec.powerUp >= 1 || r() < spec.powerUp;
    var gotRare = finds.some(function (f) { return rarityRank(f.rarity) >= 2; });
    return { type: type, finds: finds, stars: stars, powerUp: powerUp, pity: gotRare ? 0 : pity + 1, pityTriggered: pityTriggered && gotRare };
  }

  /* ---------- Trip haul: free base, scales smoothly with yesterday's Charge ---------- */
  function tripHaul(yCharge, ctx) {
    ctx = ctx || {};
    var c = Math.max(0, Math.min(100, yCharge || 0)) / 100, r = ctx.rng || rng('trip');
    var silver = r() < 0.10 + 0.30 * c;
    var spec = silver ? CHESTS.silver.weights : CHESTS.basic.weights;
    var nFinds = 1 + Math.round(2 * c) + (ctx.boost ? 1 : 0);
    var owned = Object.assign({}, ctx.owned || {}), finds = [];
    for (var i = 0; i < nFinds; i++) { var f = pickFind(r, rollRarity(r, spec), owned, true); finds.push({ id: f.id, rarity: f.rarity, dup: !!owned[f.id] }); owned[f.id] = 1; }
    finds.sort(function (a, b) { return rarityRank(b.rarity) - rarityRank(a.rarity); });
    var stars = 20 + Math.round(r() * 20) + Math.round(80 * c);
    var powerUp = r() < 0.10 + 0.20 * c;
    return { finds: finds, stars: stars, xp: 20, powerUp: powerUp, silver: silver };
  }

  /* ---------- welcome-back: Bronze chest + 50 Stars, once per 14 days, never grows with the gap ---------- */
  var WELCOME_BACK = { chest: 'bronze', stars: 50 };
  function welcomeBackEligible(lastActiveDay, today, lastWBDay) {
    if (lastActiveDay == null) return false;
    var gap = today - lastActiveDay - 1; // full days with no check-in
    if (gap < 3) return false;
    if (lastWBDay != null && today - lastWBDay < 14) return false;
    return true;
  }
  // value equivalents from game-design §11.2 (estimates): 1 XP = 1 Star, Find = 25, power-up = 60
  var EQ = { find: 25, powerUp: 60, engagedDay: 880 };
  function chestExpectedValue(type) { var s = CHESTS[type]; return s.finds * EQ.find + (s.stars[0] + s.stars[1]) / 2 + s.powerUp * EQ.powerUp; }
  function welcomeBackValue() { return chestExpectedValue(WELCOME_BACK.chest) + WELCOME_BACK.stars; }

  /* ---------- Run rewards: one loot-bearing Run per day; Grand Draw ticket per completed Run, never doses ---------- */
  // v5.4 chest ladder: a 3-star Run pays Silver (Gold is kept for the weekly headline and milestones, so it still means something).
  function runChestFor(stars) { return stars >= 2 ? 'silver' : stars === 1 ? 'bronze' : 'basic'; }
  function runReward(result, ctx) {
    ctx = ctx || {};
    if (ctx.practice) return { stars: 0, xp: 0, chest: null, ticket: 0 };
    var s = result.stars || 0;
    return { stars: 30 + 10 * s, xp: 50 + 10 * s, chest: runChestFor(s), ticket: ctx.alreadyPlayed ? 0 : 1 };
  }

  /* ---------- quests: 3 a day (free-play, check-in answer, collection). Same value any day. ---------- */
  var QUEST_REWARD = { stars: 15, xp: 20 };
  var COLLECT_Q = [
    { id: 'chest', text: 'Open a chest' },
    { id: 'place', text: 'Place a piece at your {home}' },
    { id: 'album', text: 'Look at a {find} in your {album}' }
  ];
  function questsFor(dayNum) {
    var runQ = dayNum % 2 === 0 ? { id: 'run2', text: 'Get 2 stars on today’s {run}', goal: 'run2' } : { id: 'run', text: 'Play today’s {run}', goal: 'run' };
    var c = COLLECT_Q[dayNum % COLLECT_Q.length];
    return [
      { id: 'checkin', text: 'Check in at a stack. Any answer counts.', goal: 'checkin', done: false, reward: QUEST_REWARD },
      { id: runQ.id, text: runQ.text, goal: runQ.goal, done: false, reward: QUEST_REWARD },
      { id: c.id, text: c.text, goal: c.id, done: false, reward: QUEST_REWARD }
    ];
  }
  // Swapped quest is always of equal value (Tier 2/3 barrier): the barrier itself is never rewarded.
  function swapQuest(q) { return { id: 'swap-' + q.id, text: 'Look at a {find} in your {album}', goal: 'album', done: false, reward: q.reward, swapped: true }; }

  /* ---------- barrier tiers ---------- */
  var BARRIERS = [
    { id: 'busy', label: 'Forgot or got busy', tier: 1 },
    { id: 'away', label: 'Away from home', tier: 1 },
    { id: 'routine', label: 'My routine changed', tier: 1 },
    { id: 'ranout', label: 'Ran out', tier: 2 },
    { id: 'stock', label: 'Pharmacy was out of stock', tier: 2 },
    { id: 'cost', label: 'Cost or insurance', tier: 2 },
    { id: 'side', label: 'Side effects', tier: 3 },
    { id: 'stop', label: 'Decided to stop', tier: 3 },
    { id: 'other', label: 'Something else', tier: 1 },
    { id: 'skip', label: 'Rather not say', tier: 0 }
  ];
  function barrierTier(id) { for (var i = 0; i < BARRIERS.length; i++) if (BARRIERS[i].id === id) return BARRIERS[i].tier; return 0; }

  /* ---------- status (one function, every surface) ---------- */
  function doseStatus(entry, stack, clockMins) {
    var st = entry && entry.state;
    if (stack && stack.kind === 'rest') return st ? { label: 'All set ' + fmtTime(entry.at), tone: 'done', icon: '✓' } : { label: 'Rest day', tone: 'neutral', icon: '☾' };
    if ((st === 'swallowed' || st === 'took') && entry.loggedLater) return { label: entry.timeUnsure || entry.at == null ? 'Taken, time not sure · logged ' + fmtTime(entry.loggedAt) : 'Taken around ' + fmtTime(entry.at) + ' · logged at ' + fmtTime(entry.loggedAt), tone: 'done', icon: '✓' };
    if (st === 'swallowed' || st === 'took') return { label: 'Taken ' + fmtTime(entry.at) + (entry.later ? ' · logged later' : ''), tone: 'done', icon: '✓' };
    if (st === 'journal') return { label: 'Checked in ' + fmtTime(entry.at), tone: 'done', icon: '✓' };
    if (st === 'out') return { label: 'Out since ' + fmtTime(entry.outAt), tone: 'attn', icon: '✋' };
    if (st === 'didnt') return { label: 'Not taken', tone: 'neutral', icon: '–' };
    if (st === 'unsure') return { label: 'Not sure', tone: 'neutral', icon: '?' };
    if (st === 'held') return { label: 'Held by care team', tone: 'neutral', icon: '⏸' };
    if (!stack) return { label: 'No entry', tone: 'neutral', icon: '○' };
    if (clockMins < stack.mins - WINDOW.before) return { label: fmtTime(stack.mins), tone: 'upcoming', icon: '◷' };
    if (clockMins <= stack.mins + WINDOW.after) return { label: 'Due now', tone: 'attn', icon: '●' };
    return { label: 'Not logged yet', tone: 'neutral', icon: '○' };
  }

  /* ---------- phase of a stack right now: upcoming | due | out | past | answered ---------- */
  function stackPhase(stack, entry, clockMins) {
    if (entry && entry.state && entry.state !== 'out') return 'answered';
    if (stack.kind !== 'dose') return 'due';
    if (entry && entry.state === 'out') return 'out';
    if (clockMins > stack.mins + WINDOW.after) return 'past';
    if (clockMins < stack.mins - WINDOW.before) return 'upcoming';
    return 'due';
  }

  /* ---------- rollover: OUT unconfirmed becomes Unsure in the record (never Taken) ---------- */
  function finalizeEntries(plan, entries) {
    var out = {};
    plan.stacks.forEach(function (s) {
      var e = entries[s.id];
      if (!e) out[s.id] = { state: 'none' };
      else if (e.state === 'out') out[s.id] = Object.assign({}, e, { state: 'unsure', fromOut: true });
      else out[s.id] = Object.assign({}, e);
    });
    return out;
  }
  function dayCharge(plan, credits) { var c = 0; plan.stacks.forEach(function (s) { if (credits[s.id]) c += credits[s.id].charge || 0; }); return Math.min(100, c); }

  /* ---------- v5.3 Campfire: a daily-visit count (Expedition "Campfire", Grove "Garden days"). Same engine for both. ----------
   * A day is lit by ONE play action before the 3:00 rollover: finishing the Daily Run, or feeding the companion.
   * Doses never light it, never break it and are never required (a weekly-injection day lights the same way).
   * Never touches Grand Draw tickets, Spark/Charge, the Power Bank or the health record.
   * Kid profiles: no Campfire (counts, shields and milestone chests are off); days played still grow the companion. */
  var ROLLOVER = 180; // 3:00 local. Minutes after midnight but before 3:00 still belong to the previous game day.
  function gameDayFor(calendarDay, minsOfDay) { return minsOfDay < ROLLOVER ? calendarDay - 1 : calendarDay; }
  var CAMP = {
    milestones: [3, 7, 14, 30, 50, 75, 100, 150, 200, 250, 365, 500, 730, 1000], // then every 365 days after 1000 (1365, 1730, ...)
    repeatAfter: 1000, repeatEvery: 365,
    shieldEvery: 7, shieldMax: 2,
    relightDays: 2, // 48h after the break: through the end of the second game day after the unplayed one
    restMin: 1, restMax: 14, restCooldown: 30
  };
  function isMilestone(n) {
    if (CAMP.milestones.indexOf(n) >= 0) return true;
    return n > CAMP.repeatAfter && (n - CAMP.repeatAfter) % CAMP.repeatEvery === 0;
  }
  // Chests scale Bronze -> Silver -> Gold -> Epic -> Legendary. Days 365, 730 and 1000 also give a one-of-a-kind cosmetic
  // (its name is a theme word: themes.js camp.cosmetics[id]).
  var MILESTONE_COSMETIC = { 365: 'm365', 730: 'm730', 1000: 'm1000' };
  function milestoneReward(n) {
    var chest = n >= 365 ? 'legendary' : n >= 100 ? 'epic' : n >= 30 ? 'gold' : n >= 7 ? 'silver' : 'bronze';
    return { n: n, chest: chest, cosmetic: MILESTONE_COSMETIC[n] || null };
  }
  function milestonesUpTo(maxN) { var out = []; for (var n = 1; n <= maxN; n++) if (isMilestone(n)) out.push(n); return out; }
  // total days played -> stage index 0..10 (names live in themes.js camp.stages). Never consecutive, never reverses.
  var GROWTH = [0, 7, 21, 45, 75, 110, 160, 230, 320, 450, 600];
  function growthStage(totalDays) { var s = 0; for (var i = 0; i < GROWTH.length; i++) if ((totalDays || 0) >= GROWTH[i]) s = i; return s; }
  function nextGrowth(totalDays) { var s = growthStage(totalDays); return s < GROWTH.length - 1 ? { stage: s + 1, at: GROWTH[s + 1], daysLeft: GROWTH[s + 1] - (totalDays || 0) } : null; }
  function campBlank() { return { count: 0, best: 0, total: 0, shields: 0, lastLit: null, paid: {}, rest: null, restStarts: [], broken: null, shieldDays: [], relit: [] }; }
  function campClone(c) { var o = JSON.parse(JSON.stringify(c || campBlank())), b = campBlank(); for (var k in b) if (o[k] == null && b[k] != null) o[k] = b[k]; return o; }
  function campResting(c, day) { return !!(c && c.rest && day >= c.rest.from && day <= c.rest.until); }
  function campLitOn(c, day) { return !!(c && c.lastLit === day); }
  function nextMilestone(c) { for (var n = c.count + 1; n <= c.count + CAMP.repeatEvery + CAMP.repeatAfter; n++) if (isMilestone(n) && !c.paid[n]) return milestoneReward(n); return null; }
  function payMilestones(c, from, to) {
    var out = [];
    for (var n = from + 1; n <= to; n++) if (isMilestone(n) && !c.paid[n]) { c.paid[n] = true; out.push(milestoneReward(n)); }
    return out;
  }
  /* campLight(camp, day, ctx) -> { camp, fx }. Idempotent per game day: the second play action of a day changes nothing. */
  function campLight(camp, day, ctx) {
    ctx = ctx || {};
    var c = campClone(camp), fx = { lit: false, already: false, count: c.count, milestones: [], shieldEarned: false, stageUp: null, kid: !!ctx.kid };
    if (c.lastLit === day) { fx.already = true; return { camp: c, fx: fx }; }
    var stageBefore = growthStage(c.total);
    c.total += 1; c.lastLit = day;
    var stageAfter = growthStage(c.total);
    if (stageAfter > stageBefore) fx.stageUp = { from: stageBefore, to: stageAfter };
    fx.lit = true;
    if (ctx.kid) { fx.count = 0; return { camp: c, fx: fx }; }
    var before = c.count;
    c.count += 1; if (c.count > c.best) { c.best = c.count; fx.bestUp = true; }
    if (c.total % CAMP.shieldEvery === 0 && c.shields < CAMP.shieldMax) { c.shields += 1; fx.shieldEarned = true; }
    fx.milestones = payMilestones(c, before, c.count);
    fx.count = c.count;
    return { camp: c, fx: fx };
  }
  /* Relight: offered after a break that no shield could cover, for 48h. Needs today's Daily Run + one extra practice board. */
  function relightOffer(c, day) {
    if (!c || !c.broken || c.broken.prev <= 0) return null;
    if (day - c.broken.day > CAMP.relightDays || day <= c.broken.day) return null;
    return { prev: c.broken.prev, until: c.broken.day + CAMP.relightDays, brokenDay: c.broken.day };
  }
  function campRelight(camp, day, ctx) {
    ctx = ctx || {};
    var c = campClone(camp), off = relightOffer(c, day);
    if (ctx.kid || !off) return { camp: c, fx: { relit: false, reason: 'no-offer' } };
    if (!(ctx.runDone && ctx.practiceDone)) return { camp: c, fx: { relit: false, reason: 'steps' } };
    if (c.lastLit !== day) return { camp: c, fx: { relit: false, reason: 'not-lit' } };
    var before = c.count;
    c.count = off.prev + c.count;
    if (c.count > c.best) c.best = c.count;
    c.broken = null; c.relit.push(day);
    return { camp: c, fx: { relit: true, count: c.count, milestones: payMilestones(c, before, c.count) } };
  }
  /* campEndDay: run at the 3:00 rollover for the game day that just ended. Never looks at doses. */
  function campEndDay(camp, day, ctx) {
    ctx = ctx || {};
    var c = campClone(camp), fx = { kept: false, rested: false, shieldUsed: false, reset: false, prev: c.count };
    if (ctx.kid) return { camp: c, fx: fx };
    if (c.broken && day >= c.broken.day + CAMP.relightDays) c.broken = null; // the Relight window closes quietly
    if (c.rest && day > c.rest.until) c.rest = null;
    if (c.lastLit === day) { fx.kept = true; return { camp: c, fx: fx }; }
    if (campResting(c, day)) { fx.rested = true; return { camp: c, fx: fx }; }
    if (c.count === 0) return { camp: c, fx: fx };
    if (c.shields > 0) { c.shields -= 1; c.shieldDays.push(day); fx.shieldUsed = true; return { camp: c, fx: fx }; }
    c.broken = { day: day, prev: c.count }; c.count = 0; fx.reset = true;
    return { camp: c, fx: fx };
  }
  /* Rest mode: "Taking a break" pauses the count for 1-14 days. Pausing is not a break. Once per 30 days. */
  function restAvailable(c, day) {
    var last = (c.restStarts || []).length ? c.restStarts[c.restStarts.length - 1] : null;
    if (last == null || day - last >= CAMP.restCooldown) return { ok: true };
    return { ok: false, nextDay: last + CAMP.restCooldown };
  }
  function campStartRest(camp, day, days, ctx) {
    ctx = ctx || {};
    var c = campClone(camp);
    days = Math.round(+days || 0);
    if (ctx.kid || days < CAMP.restMin || days > CAMP.restMax) return { camp: c, ok: false, reason: 'range' };
    if (campResting(c, day)) return { camp: c, ok: false, reason: 'already' };
    var av = restAvailable(c, day); if (!av.ok) return { camp: c, ok: false, reason: 'cooldown', nextDay: av.nextDay };
    c.rest = { from: day, until: day + days - 1 }; c.restStarts.push(day);
    return { camp: c, ok: true };
  }
  function campEndRest(camp, day) {
    var c = campClone(camp); if (!c.rest) return { camp: c, ok: false };
    // Ending today: today counts as a normal day again (play to keep the count going); the days before stay paused.
    c.rest.until = day - 1; if (c.rest.until < c.rest.from) c.rest = null;
    return { camp: c, ok: true };
  }

  /* ---------- banned copy ---------- */
  var BANNED = ['missed', 'late', 'adherence', 'PRN', 'failed', 'lost', 'hurry', 'last chance', 'take another', 'you can take', 'safe to take', 'overdue', 'penalty', 'keep your streak', 'save your streak', 'don\'t lose', 'broke'];
  // v5.3: 'streak' is allowed in Campfire copy. Copy must never tie the Campfire to a dose.
  function bannedHits(text) {
    var hits = [];
    BANNED.forEach(function (w) {
      var re = w === 'PRN' ? /\bPRN\b/ : new RegExp('\\b' + w.replace(/ /g, '\\s+').replace(/'/g, "['\u2019]") + '\\b', 'i');
      var m = String(text).match(re); if (m) hits.push(w);
    });
    return hits;
  }

  var Engine = {
    dateOf: dateOf, weekday: weekday, weekIndex: weekIndex, stackPhase: stackPhase, fmtDate: fmtDate, fmtDateLong: fmtDateLong, fmtTime: fmtTime, toMins: toMins, WD_LONG: WD_LONG,
    hash: hash, rng: rng, allocate: allocate,
    SLOTS: SLOTS, slotFor: slotFor, isScheduledOn: isScheduledOn, isPaused: isPaused, doseLabel: doseLabel, taperStepChanged: taperStepChanged,
    compilePlan: compilePlan, planTotal: planTotal, inWindow: inWindow, WINDOW: WINDOW,
    creditFor: creditFor, journalReward: journalReward, JOURNAL: JOURNAL,
    powerBank: powerBank, nextPowerUp: nextPowerUp, PU_ORDER: PU_ORDER, PU_CAP: PU_CAP,
    xpForNext: xpForNext, levelInfo: levelInfo,
    FINDS: FINDS, FIND_BY_ID: FIND_BY_ID, RARITIES: RARITIES, rarityRank: rarityRank,
    CHESTS: CHESTS, PITY_EVERY: PITY_EVERY, rollChest: rollChest, tripHaul: tripHaul,
    WELCOME_BACK: WELCOME_BACK, welcomeBackEligible: welcomeBackEligible, welcomeBackValue: welcomeBackValue, chestExpectedValue: chestExpectedValue, EQ: EQ,
    runReward: runReward, runChestFor: runChestFor,
    questsFor: questsFor, swapQuest: swapQuest, QUEST_REWARD: QUEST_REWARD,
    BARRIERS: BARRIERS, barrierTier: barrierTier,
    doseStatus: doseStatus, finalizeEntries: finalizeEntries, dayCharge: dayCharge,
    BANNED: BANNED, bannedHits: bannedHits,
    ROLLOVER: ROLLOVER, gameDayFor: gameDayFor, CAMP: CAMP, GROWTH: GROWTH, isMilestone: isMilestone, milestonesUpTo: milestonesUpTo, MILESTONE_COSMETIC: MILESTONE_COSMETIC, growthStage: growthStage, nextGrowth: nextGrowth, milestoneReward: milestoneReward,
    campBlank: campBlank, campLight: campLight, campEndDay: campEndDay, campRelight: campRelight, relightOffer: relightOffer, campResting: campResting, campLitOn: campLitOn,
    nextMilestone: nextMilestone, restAvailable: restAvailable, campStartRest: campStartRest, campEndRest: campEndRest
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
