/* Kindling v5 — state.js : persistent state, presets, and actions (wrapping the pure Engine).
 * Actions mutate the state and return an "fx" description the UI turns into animation. */
(function (root) {
  'use strict';
  var E = root.Engine, R = root.RPG, KEY = 'kindling-v5-state';

  function blank() {
    return {
      v: 5, onboarded: false, preset: null, theme: 'expedition', mode: 'meds',
      comp: { species: 'fox', name: 'Ember', bond: 0 },
      settings: { simple: false, calm: false, reducedMotion: false, textSize: 'regular', gameNotifs: 1, twoStep: true, discreet: true, sound: true, haptics: true, nudgeMins: 10, appLock: false, reminders: true, campReminder: true },
      meds: [], day: 1, clock: 480,
      today: null, history: [],
      stars: 0, xp: 0, bank: 0, pu: { magnet: 0, lens: 0, double: 0, lucky: 0 }, puDropped: 0, puSources: {},
      tickets: 0, ticketDays: [],
      owned: {}, chests: [], pity: 0, decorOwned: ['d5'], placed: {},
      trip: { status: 'home' },
      life: { starsEarned: 0, xp: 0, finds: 0, checkins: 0, runs: 0 },
      flags: { wbLast: null, lastActiveDay: null, highRisk: null, assist: null, drawResult: null, pendingWelcome: false, careQuests: {} },
      people: false, seq: 1,
      // v5.3 Campfire + growth (game state only; never read by the health record, never written by it)
      camp: E.campBlank(), profile: { kid: false }, cosmetics: [],
      // v5.4 companion RPG (game state only; dose-blind: never read by, never written to, the health record)
      compLevel: { level: 1, xp: 0 }, inventory: { bag: [], equipped: { tool: null, garb: null, trinket: null } },
      rpg: { nodes: {}, fork: null, path: null, returns: 0, packedLast: null },
      book: { pages: [{ kind: 'prologue', day: 1 }], journal: [], quietLast: null, weekly: {}, spinePending: false }
    };
  }

  var S = blank();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable (file:// in some browsers) */ } }
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && o.v === 5) { var b = blank(); S = Object.assign(b, o); S.settings = Object.assign(blank().settings, o.settings || {}); if (!S.inventory.bag) S.inventory = b.inventory; if (!S.book.pages) S.book = blank().book; return true; } } } catch (e) { }
    return false;
  }
  function reset() { S = blank(); try { localStorage.removeItem(KEY); } catch (e) { } }
  function nid(p) { return (p || 'x') + (S.seq++); }

  /* ---------- day lifecycle ---------- */
  function startDay(dayNum, clock) {
    var plan = E.compilePlan(S.meds, dayNum);
    S.day = dayNum;
    S.clock = clock != null ? clock : Math.max(420, Math.min(plan.stacks[0].mins, 480));
    S.today = { dayNum: dayNum, plan: plan, entries: {}, credits: {}, charge: 0, prn: [], journalPaid: false, quests: E.questsFor(dayNum), run: null, practiceRuns: 0, tripSent: S.trip.status === 'out', fullShown: false, paid: {}, fed: false, relightPractice: 0 };
  }
  function stackById(id) { return S.today.plan.stacks.filter(function (s) { return s.id === id; })[0]; }
  function medById(id) { return S.meds.filter(function (m) { return m.id === id; })[0]; }
  function openStack() {
    var st = S.today.plan.stacks;
    for (var i = 0; i < st.length; i++) { var e = S.today.entries[st[i].id]; if (!e || e.state === 'out') return st[i]; }
    return null;
  }
  function allAnswered() { return !openStack(); }
  function piecesFor() {
    return S.today.plan.stacks.map(function (s) { var c = S.today.credits[s.id]; var e = S.today.entries[s.id]; return c && c.charge > 0 ? 'filled' : (e && e.state === 'out') ? 'pending' : 'empty'; });
  }

  /* ---------- wallet helpers (numbers only go up, except spending) ---------- */
  function addStars(n) { if (n > 0) { S.stars += n; S.life.starsEarned += n; } }
  // Legacy account XP: still counted (history, tests) but no longer shown. The one visible level is the companion's (v5.4).
  function addXp(n) { if (n > 0) { S.xp += n; S.life.xp += n; } return 0; }
  /* v5.4 companion XP: flat, dose-blind. Returns the new level on a level-up (no cap, the bar never freezes). */
  function compXp(n) {
    if (!(n > 0)) return 0;
    var before = R.levelInfo(S.compLevel.xp).level;
    S.compLevel.xp += n; var after = R.levelInfo(S.compLevel.xp).level; S.compLevel.level = after;
    return after > before ? after : 0;
  }
  function addPowerUp(type, source) {
    var total = S.pu.magnet + S.pu.lens + S.pu.double + S.pu.lucky;
    if (total >= E.PU_CAP) { addStars(60); return { type: type, converted: true }; }
    S.pu[type]++; S.puSources[type] = source; return { type: type, converted: false };
  }
  function addCharge(n, sourceLabel) {
    var r = E.powerBank(S.bank, n), drops = [];
    S.bank = r.bank;
    for (var i = 0; i < r.drops; i++) { var t = E.nextPowerUp(S.puDropped++); drops.push(addPowerUp(t, sourceLabel)); }
    return drops;
  }
  function addFind(id) { S.owned[id] = (S.owned[id] || 0) + 1; S.life.finds++; }
  function questDone(goal) {
    var q = S.today && S.today.quests.filter(function (q) { return q.goal === goal && !q.done; })[0];
    if (!q) return null;
    q.done = true; addStars(q.reward.stars); addXp(q.reward.xp); var lv = compXp(R.XP.daily);
    return { quest: q, levelUp: lv };
  }

  /* ---------- check-ins ---------- */
  function tick(m) { S.clock = Math.min(S.clock + (m || 2), 1439); }
  function catchUpClock(stack) { if (S.clock < stack.mins - 60) S.clock = stack.mins - 2; }

  /* Dose state machine (strict): none -> out -> answered;  none -> answered;  out -> none (put back).
   * Any other transition is ignored, so a stray second tap can never rewrite the record or pay twice. */
  function pillOut(stackId) {
    var st = stackById(stackId); if (!st || st.kind !== 'dose') return null;
    if (S.today.entries[stackId]) return { ignored: true };
    if (E.stackPhase(st, null, S.clock) === 'past') return { ignored: true }; // no pill-out prompt after the window
    catchUpClock(st); tick(2);
    S.today.entries[stackId] = { state: 'out', outAt: S.clock, outTs: Date.now() };
    save(); return { out: true };
  }
  function putBack(stackId) {
    var e = S.today.entries[stackId];
    if (!e || e.state !== 'out' || S.today.paid[stackId]) return { ignored: true };
    delete S.today.entries[stackId]; save(); return {};
  }

  // answer: swallowed | took | held | didnt | unsure | rest | journal
  function checkIn(stackId, answer, opts) {
    opts = opts || {};
    var st = stackById(stackId); if (!st) return null;
    var prev = S.today.entries[stackId];
    if (prev && prev.state !== 'out') return { already: true, at: prev.at };
    if (S.today.paid[stackId]) return { already: true, at: (prev || {}).at };
    if (answer === 'swallowed' && !(prev && prev.state === 'out')) answer = 'took';
    if (answer === 'rest' && st.kind !== 'rest') return null;
    if (answer === 'journal' && st.kind !== 'journal') return null;
    // "Took it earlier" (after the window): the user says WHEN. The dose time is what they entered, never the tap time.
    var loggedLater = !!opts.loggedLater;
    if (loggedLater) {
      if (answer !== 'took') return null;
      if (!opts.timeUnsure && !(typeof opts.doseMins === 'number' && opts.doseMins >= 0 && opts.doseMins <= S.clock)) return null;
    }
    if (!opts.atMins && !loggedLater) { catchUpClock(st); tick(2); }
    var at = loggedLater ? (opts.timeUnsure ? null : opts.doseMins) : (opts.atMins || S.clock);
    var mode = opts.later || loggedLater ? 'later' : 'live';
    var cr = E.creditFor(st, answer, { mode: mode, atMins: at == null ? S.clock : at });
    S.today.paid[stackId] = true; // ledger: one reward set per dose per day
    S.today.entries[stackId] = { state: answer, at: at, outAt: prev && prev.outAt, later: !!opts.later || loggedLater, loggedLater: loggedLater, loggedAt: loggedLater ? S.clock : undefined, timeUnsure: !!opts.timeUnsure };
    S.today.credits[stackId] = cr;
    var label = (st.kind === 'rest' ? 'Your rest-day check-in' : st.kind === 'journal' ? 'Your journal check-in' : 'Your ' + st.label.toLowerCase() + ' stack');
    addStars(cr.stars + cr.onTimeStars);
    addXp(cr.xp);
    // v5.4: every honest same-day answer pays the same flat companion XP (its share of 40 a day), whatever the answer.
    var ax = answerXp(stackId), lv = ax.levelUp;
    S.comp.bond += cr.bond; if (cr.checkin) S.life.checkins++;
    S.today.charge = E.dayCharge(S.today.plan, S.today.credits);
    var drops = cr.charge ? addCharge(cr.charge, label) : [];
    var q = cr.checkin ? questDone('checkin') : null;
    S.flags.lastActiveDay = S.day;
    var full = S.today.charge >= 100 && !S.today.fullShown;
    if (full) S.today.fullShown = true;
    // Boss Day: the weekly headline chest comes from the engine on ANY completion path (app, lock screen, held by care team)
    var bossChest = null;
    // any honest Boss Day answer earns the weekly headline (dose-independent, like "Load the week")
    if (st.boss && cr.checkin) bossChest = completeHeadline('boss');
    save();
    return { credit: cr, compXp: ax.xp, drops: drops, full: full, levelUp: lv || (q && q.levelUp) || 0, quest: q && q.quest, stack: st, answer: answer, boss: st.boss, bossChest: bossChest };
  }

  function answerXp(stackId) {
    var t = S.today; t.ansXp = t.ansXp || {};
    if (t.ansXp[stackId] != null) return { xp: 0, levelUp: 0 };
    var i = t.plan.stacks.map(function (s) { return s.id; }).indexOf(stackId); if (i < 0) return { xp: 0, levelUp: 0 };
    var share = R.answerShares(t.plan)[i]; t.ansXp[stackId] = share;
    return { xp: share, levelUp: compXp(share) };
  }

  /* ---------- weekly headline: one Gold chest per week for everyone (Boss Day for weekly meds, "Load the week" otherwise) ---------- */
  function hasWeekly() { return S.meds.some(function (m) { return m.kind === 'weekly' && !m.paused; }); }
  function headlineDone() { return !!(S.weekDone && S.weekDone[E.weekIndex(S.day)]); }
  function completeHeadline(kind) {
    S.weekDone = S.weekDone || {};
    var wk = E.weekIndex(S.day);
    if (S.weekDone[wk]) return null;
    if (kind === 'load' && hasWeekly()) return null;
    S.weekDone[wk] = kind; compXp(R.XP.weekly);
    var id = nid('ch'); S.chests.push({ id: id, type: 'gold', source: kind === 'boss' ? 'boss' : 'headline', day: S.day, opened: false });
    S.flags.lastActiveDay = S.day;
    save(); return id;
  }

  /* ---------- as-needed journal: flat once a day; no celebration ---------- */
  function logPrn(medId, atMins) {
    var at = atMins || S.clock;
    S.today.prn.push({ medId: medId, at: at });
    var r = E.journalReward(S.today.journalPaid);
    if (r.paid) { S.today.journalPaid = true; addStars(r.stars); addXp(r.xp); }
    if (S.today.plan.journal) answerXp('journal');
    S.flags.lastActiveDay = S.day;
    save(); return { at: at };
  }
  function prnNone() {
    if (S.today.prn.some(function (p) { return p.medId || p.none; })) return { ignored: true };
    S.today.prn.push({ medId: null, none: true, at: S.clock });
    S.flags.lastActiveDay = S.day;
    var r = E.journalReward(S.today.journalPaid);
    if (r.paid) { S.today.journalPaid = true; addStars(r.stars); addXp(r.xp); }
    if (S.today.plan.journal) answerXp('journal');
    save(); return {};
  }
  function lastPrn(medId) {
    var all = [];
    S.today.prn.forEach(function (p) { if (p.medId === medId) all.push({ day: S.day, at: p.at }); });
    if (all.length) return all[all.length - 1];
    for (var i = S.history.length - 1; i >= 0; i--) { var h = S.history[i], l = (h.prn || []).filter(function (p) { return p.medId === medId; }); if (l.length) return { day: h.dayNum, at: l[l.length - 1].at }; }
    return null;
  }

  /* ---------- backfill (previous day, within 48h, 50%) ---------- */
  function yesterday() { return S.history.length ? S.history[S.history.length - 1] : null; }
  function backfill(stackId, answer) {
    var y = yesterday(); if (!y || S.day - y.dayNum > 2) return null;
    var st = y.plan.stacks.filter(function (s) { return s.id === stackId; })[0]; if (!st) return null;
    var e = y.entries[stackId]; if (e && e.state !== 'none' && e.state !== 'unsure') return null;
    y.paid = y.paid || {};
    if (y.paid[stackId]) return null;
    y.paid[stackId] = true;
    var cr = E.creditFor(st, answer, { mode: 'backfill' });
    y.entries[stackId] = { state: answer, at: st.mins, later: true, backfilled: true };
    addStars(cr.stars); addXp(cr.xp); S.comp.bond += cr.bond;
    var drops = cr.charge ? addCharge(cr.charge, 'Yesterday’s ' + st.label.toLowerCase() + ' stack') : [];
    save(); return { credit: cr, drops: drops };
  }

  /* ---------- Run ---------- */
  function finishRun(result, practice) {
    if (!S.today) return { practice: true };
    if (practice || S.today.run) {
      S.today.practiceRuns++;
      if (S.today.run && E.relightOffer(S.camp, S.day)) S.today.relightPractice++;
      var rl = tryRelight();
      save(); return { practice: true, relight: rl };
    }
    var rw = E.runReward(result, { practice: false, alreadyPlayed: false });
    S.today.run = { stars: result.stars || 0, shareText: result.shareText || '', routeGrid: result.routeGrid || null, stepsUsed: result.stepsUsed, stepsMax: result.stepsMax, finds: result.finds || [] };
    addStars(rw.stars); addXp(rw.xp); var lv = compXp(R.runXp(result.stars || 0));
    S.life.runs++;
    (result.finds || []).forEach(function (f) { if (f && f.id && E.FIND_BY_ID[f.id]) addFind(f.id); else if (f) addFind(normalizeFind(f)); });
    consumePowerUps(result.powerUpsUsed);
    // Kid profiles: deterministic rewards only, so the Run pays a fixed Find instead of a random chest.
    var chestId = null;
    if (isKid()) addFind(E.FINDS.filter(function (f) { return !S.owned[f.id]; }).concat(E.FINDS)[0].id);
    else { chestId = nid('ch'); S.chests.push({ id: chestId, type: rw.chest, source: 'run', day: S.day, opened: false }); }
    S.tickets += rw.ticket; S.ticketDays.push(S.day);
    var q1 = questDone('run'), q2 = (result.stars || 0) >= 2 ? questDone('run2') : null;
    S.flags.lastActiveDay = S.day;
    var camp = light('run');
    save();
    return { camp: camp, reward: rw, chestId: chestId, levelUp: lv || (q1 && q1.levelUp) || (q2 && q2.levelUp) || 0, quests: [q1, q2].filter(Boolean).map(function (x) { return x.quest; }) };
  }
  function normalizeFind(f) {
    var rar = f.rarity && E.RARITIES.indexOf(f.rarity) >= 0 ? f.rarity : 'common';
    var pool = E.FINDS.filter(function (x) { return x.rarity === rar; });
    return pool[E.hash(String(f.id || Math.random())) % pool.length].id;
  }
  function consumePowerUps(used) {
    if (!used) return;
    var list = [];
    if (Array.isArray(used)) list = used;
    else if (typeof used === 'object') Object.keys(used).forEach(function (k) { for (var i = 0; i < (+used[k] || 0); i++) list.push(k); });
    list.forEach(function (k) { k = String(k); if (S.pu[k] > 0) S.pu[k]--; });
  }

  /* ---------- chests ---------- */
  function addChest(type, source) { var id = nid('ch'); S.chests.push({ id: id, type: type, source: source, day: S.day, opened: false }); save(); return id; }
  function openChest(id) {
    var c = S.chests.filter(function (x) { return x.id === id; })[0]; if (!c || c.opened) return null;
    var r = E.rollChest(c.type, { pity: S.pity, owned: S.owned, rng: E.rng('chest-' + id + '-' + S.day + '-' + S.life.finds) });
    S.pity = r.pity;
    r.finds.forEach(function (f) { addFind(f.id); });
    addStars(r.stars);
    var pu = null; if (r.powerUp) pu = addPowerUp(E.nextPowerUp(S.puDropped++), 'A ' + E.CHESTS[c.type].label + ' chest');
    c.opened = true; c.result = { finds: r.finds, stars: r.stars, powerUp: pu && pu.type, pityTriggered: r.pityTriggered }; c.openedDay = S.day;
    // v5.4: Epic and Legendary chests also hold a deterministic "choose 1 of 3" gear pick, never something you own.
    if ((c.type === 'epic' || c.type === 'legendary') && !isKid()) { var ch = R.chestChoices(c.type, S.inventory.bag, id); if (ch.length) { c.choose = ch; c.picked = null; } }
    var q = questDone('chest');
    save(); return { chest: c, result: r, powerUp: pu, quest: q && q.quest };
  }

  function pickChestGear(chestId, itemId) {
    var c = S.chests.filter(function (x) { return x.id === chestId; })[0];
    if (!c || !c.choose || c.picked || c.choose.indexOf(itemId) < 0) return null;
    c.picked = itemId; addGear(itemId); save(); return { item: itemId };
  }

  /* ---------- v5.4 companion: level, gear, tree, quests (the Scout Trip grows into a quest) ---------- */
  var DESTS = { expedition: ['saltflats', 'canopy', 'tidepools'], grove: ['market', 'meadow', 'orchard'] };
  function questForDest(destId) { for (var t in DESTS) { var i = DESTS[t].indexOf(destId); if (i >= 0) return R.QUESTS[i].id; } return /^q\d$/.test(destId || '') ? destId : null; }
  function destForQuest(qid) { return DESTS.expedition[R.questIndex(qid)]; }
  function compState() { return { level: R.levelInfo(S.compLevel.xp).level, nodes: S.rpg.nodes, fork: S.rpg.fork }; }
  function stage() { return E.growthStage(S.camp.total); }
  function regionTier() { return R.tierFor(S.camp.total); }
  function bag() { return S.inventory.bag; }
  function addGear(id) { if (!R.ITEMS[id]) return false; if (S.inventory.bag.indexOf(id) >= 0) return false; S.inventory.bag.push(id); return true; }
  function equip(slot, id) { if (id && (bag().indexOf(id) < 0 || R.ITEMS[id].slot !== slot)) return false; S.inventory.equipped[slot] = id || null; save(); return true; }
  function readyLoadout(qid) { return R.bestLoadout(qid, compState(), bag(), regionTier()); }
  function spFree() { return R.spEarned(R.levelInfo(S.compLevel.xp).level, stage()) - R.spentIn(S.rpg); }
  function learnNode(id, side) {
    var ok = R.canLearn(S.rpg, id, stage(), spFree()); if (!ok.ok) return ok;
    if (id === 'fork') { if (side !== 'ridge' && side !== 'water') return { ok: false, why: 'side' }; S.rpg.fork = side; }
    S.rpg.nodes[id] = true; save(); return { ok: true };
  }
  /* sendQuest: the loadout and stats are snapshotted at departure (the loadout locks while the companion is out).
   * packed: an optional power-up (Magnet / Double / Lucky). It only ever adds Finds when the quest comes back. */
  function sendQuest(qid, loadout, packed) {
    if (!S.today || S.trip.status === 'out') return null;
    qid = R.quest(qid).id;
    var lo = loadout || readyLoadout(qid);
    ['tool', 'garb', 'trinket'].forEach(function (sl) { if (lo[sl] && bag().indexOf(lo[sl]) < 0) lo[sl] = null; });
    S.inventory.equipped = { tool: lo.tool, garb: lo.garb, trinket: lo.trinket };
    var pk = null;
    if (packed && R.PACKABLE.indexOf(packed) >= 0 && S.pu[packed] > 0) { S.pu[packed]--; pk = { type: packed, source: S.puSources[packed] || null }; }
    S.trip = { status: 'out', dest: destForQuest(qid), quest: qid, leftDay: S.day, loadout: lo, comp: JSON.parse(JSON.stringify(compState())), tier: regionTier(), packed: pk };
    S.today.tripSent = true; save(); return { quest: qid };
  }
  function sendTrip(destId) { return sendQuest(questForDest(destId) || 'q1'); }
  // Finds are picked on their own stream, so a dose (more Finds) can never shift what gear or story a quest brings.
  function pickFinds(n, bumps, salt, silverLean) {
    var out = [], owned = Object.assign({}, S.owned), r = E.rng('finds-' + salt), w = silverLean ? E.CHESTS.silver.weights : E.CHESTS.basic.weights;
    for (var i = 0; i < n; i++) {
      var rar;
      if (isKid()) { var f0 = E.FINDS.filter(function (f) { return f.rarity === 'common' && !owned[f.id]; })[0] || E.FINDS[i % 5]; out.push({ id: f0.id, rarity: f0.rarity, dup: !!owned[f0.id] }); owned[f0.id] = 1; continue; }
      rar = E.RARITIES[Math.min(3, E.rarityRank(rollR(r, w)) + (i < bumps ? 1 : 0))];
      if (!E.FINDS.some(function (f) { return f.rarity === rar; })) rar = 'common';
      var pool = E.FINDS.filter(function (f) { return f.rarity === rar; }), fresh = pool.filter(function (f) { return !owned[f.id]; });
      var use = fresh.length && r() < 0.7 ? fresh : pool, f = use[Math.floor(r() * use.length)] || pool[0];
      out.push({ id: f.id, rarity: f.rarity, dup: !!owned[f.id] }); owned[f.id] = 1;
    }
    return out;
  }
  function rollR(r, w) { var tot = 0, k; for (k in w) tot += w[k]; var x = r() * tot; for (var i = 0; i < E.RARITIES.length; i++) { k = E.RARITIES[i]; x -= (w[k] || 0); if (x < 0) return k; } return 'common'; }
  /* The return, computed at rollover. Three parts kept apart on purpose:
   *   quest:      dose-blind (outcome, gear, base Finds and Stars, flat XP, the story)
   *   provisions: Spark-linked extra Finds and Stars (exactly v5's Trip scaling), shown only when above zero
   *   packed:     the power-up you packed, Finds only */
  function computeTripReturn(charge) {
    var tr = S.trip, qid = tr.quest || questForDest(tr.dest) || 'q1';
    var cs = tr.comp || compState(), lo = tr.loadout || R.bestLoadout(qid, cs, bag(), regionTier()), tier = tr.tier != null ? tr.tier : regionTier();
    var results = R.resolve(qid, cs, lo, tier);
    // The very first return carries one scripted piece of gear chosen to visibly upgrade a beat on tomorrow's board.
    var force = null;
    if (!S.rpg.returns && !isKid()) { var cand = R.BASIC.filter(function (x) { return bag().indexOf(x) < 0; }); for (var i = 0; i < cand.length && !force; i++) if (R.gearImpact(cand[i], compState(), bag().concat([cand[i]]), regionTier())) force = cand[i]; if (!force) force = cand[0] || null; }
    var seed = qid + '-' + (tr.leftDay || S.day) + '-' + S.rpg.returns;
    var base = R.rollHaul(results, { seed: seed, bag: bag(), kid: isKid(), forceGear: force });
    var c = Math.max(0, Math.min(100, charge || 0)) / 100, pr = E.rng('prov-' + S.day + '-' + S.life.finds);
    var prov = { finds: isKid() ? Math.round(2 * c) : Math.round(2 * c), stars: Math.round(80 * c), silver: !isKid() && pr() < 0.10 + 0.30 * c };
    var powerUp = !isKid() && pr() < 0.10 + 0.20 * c;
    var pk = tr.packed ? R.packedFinds(tr.packed.type, results, base) : { finds: 0, bump: 0 };
    var qFinds = pickFinds(base.finds, base.findBumps + pk.bump, 'q-' + seed, false);
    var extra = pickFinds(prov.finds + pk.finds, 0, 'p-' + S.day + '-' + S.life.finds, prov.silver);
    var finds = qFinds.concat(extra).sort(function (a, b) { return E.rarityRank(b.rarity) - E.rarityRank(a.rarity); });
    var haul = { finds: finds, stars: base.stars + prov.stars, xp: 20, compXp: R.XP.quest, powerUp: powerUp, silver: prov.silver, boost: false,
      gear: base.gear, base: { finds: base.finds, stars: base.stars }, provisions: { finds: prov.finds, stars: prov.stars }, packed: tr.packed ? { type: tr.packed.type, source: tr.packed.source, finds: pk.finds, bump: pk.bump } : null };
    S.trip = { status: 'back', dest: tr.dest || destForQuest(qid), quest: qid, loadout: lo, comp: cs, tier: tier, results: results, haul: haul, fromDay: S.day, leftDay: tr.leftDay };
  }
  // Simple view: the user can choose to spend one power-up on the haul from the postcard (their action, their spend)
  function boostTrip() {
    if (S.trip.status !== 'back' || S.trip.haul.boost) return null;
    var k = E.PU_ORDER.filter(function (t) { return S.pu[t] > 0; })[0]; if (!k) return null;
    S.pu[k]--;
    var r = E.rng('boost-' + S.day), f = E.FINDS[Math.floor(r() * 27)];
    S.trip.haul.finds.push({ id: f.id, rarity: f.rarity, dup: !!S.owned[f.id] }); S.trip.haul.boost = k;
    save(); return k;
  }
  function openTrip() {
    if (S.trip.status !== 'back') return null;
    var tr = S.trip, h = tr.haul;
    h.finds.forEach(function (f) { addFind(f.id); });
    addStars(h.stars); addXp(h.xp);
    var lv = compXp(h.compXp || R.XP.quest);
    var pu = h.powerUp ? addPowerUp(E.nextPowerUp(S.puDropped++), 'Your companion’s trip') : null;
    var newGear = []; (h.gear || []).forEach(function (g) { if (addGear(g.id)) newGear.push(g.id); });
    S.rpg.returns = (S.rpg.returns || 0) + 1;
    // The day's quest becomes a Journal page (not a Book page). Pages count days played, never dates.
    var entry = null, weekly = null;
    if (tr.results) {
      entry = { day: playedDayNo(), quest: tr.quest, tiers: tr.results.map(function (r) { return r.tier; }), gear: (h.gear || []).map(function (g) { return g.id; }) }; // dose-blind: no Find counts here
      S.book.journal.push(entry); if (S.book.journal.length > 60) S.book.journal.shift();
      weekly = maybeWeekly();
    }
    var dest = tr.dest;
    S.trip = { status: 'home', lastHaul: h, lastDest: dest, lastQuest: tr.quest };
    save(); return { haul: h, powerUp: pu, levelUp: lv, gear: newGear, entry: entry, weekly: weekly, results: tr.results, quest: tr.quest };
  }
  // Days played including today if today is already lit (or about to be). Used for page numbers only.
  function playedDayNo() { return Math.max(1, S.camp.total + (E.campLitOn(S.camp, S.day) ? 0 : 1)); }
  // One "Week on the trail" page a week, built from the week's best beats. Due on game days 7, 14, 21, ...
  function maybeWeekly() {
    var wk = Math.floor(S.day / 7); if (S.day % 7 !== 0 || S.book.weekly[wk]) return null;
    var recent = S.book.journal.slice(-7), picks = [];
    ['amazing', 'great', 'steady'].forEach(function (t) { recent.forEach(function (e) { e.tiers.forEach(function (x, i) { if (x === t && picks.length < 3 && !picks.some(function (p) { return p.quest === e.quest && p.beat === i; })) picks.push({ quest: e.quest, beat: i, tier: x }); }); }); });
    var pg = { kind: 'weekly', week: wk, day: playedDayNo(), picks: picks };
    S.book.weekly[wk] = true; S.book.pages.push(pg); return pg;
  }
  /* Day 7 spine chapter: the choice sets the Path and the title. Narrative only: it changes no stat, no quest, no loot. */
  var SPINE = { ridge: 'wanderer', hollow: 'gatherer', tower: 'guardian' };
  function chooseSpine(choice) {
    if (!SPINE[choice] || S.book.pages.some(function (p) { return p.kind === 'spine' && p.ch === 1; })) return null;
    S.rpg.path = SPINE[choice]; S.book.spinePending = false;
    var pg = { kind: 'spine', ch: 1, choice: choice, day: Math.max(7, playedDayNo()) };
    S.book.pages.push(pg); save(); return pg;
  }
  function spineDue() { return stage() >= 1 && !S.book.pages.some(function (p) { return p.kind === 'spine' && p.ch === 1; }); }

  /* ---------- decor ---------- */
  function buyDecor(id, cost) { if (S.stars < cost || S.decorOwned.indexOf(id) >= 0) return false; S.stars -= cost; S.decorOwned.push(id); save(); return true; }
  function placeDecor(slot, id) { S.placed[slot] = id; var q = questDone('place'); save(); return { quest: q && q.quest }; }

  /* ---------- rollover (3:00 local) : record finalized, Charge delivered with the companion, fresh Core ---------- */
  function rollover(opts) {
    opts = opts || {};
    var t = S.today;
    var entries = E.finalizeEntries(t.plan, t.entries);
    S.history.push({ dayNum: t.dayNum, plan: { stacks: t.plan.stacks.map(function (s) { return { id: s.id, label: s.label, mins: s.mins, kind: s.kind, value: s.value, stars: s.stars, xp: s.xp, onTime: s.onTime, doses: s.doses }; }) }, entries: entries, prn: t.prn.slice(), charge: t.charge, run: t.run ? { stars: t.run.stars } : null });
    if (S.history.length > 40) S.history.shift();
    // Trip: only a Trip that actually left comes back. An unopened haul waits (never lost, never duplicated).
    // On an active day the companion heads out by itself if you didn't pick a spot; idle days send nobody (P8).
    var active = S.flags.lastActiveDay === t.dayNum;
    if (S.trip.status === 'out') computeTripReturn(t.charge);
    else if (S.trip.status === 'home' && active) { S.trip = { status: 'out', dest: S.trip.lastDest || null, leftDay: t.dayNum, auto: true }; computeTripReturn(t.charge); }
    S.flags.assist = null;
    // Campfire: the day that just ended is judged by play actions only (Run / Feed). Doses are never read here.
    var ce = E.campEndDay(S.camp, t.dayNum, { kid: isKid() });
    S.camp = ce.camp;
    S.flags.campNote = ce.fx.shieldUsed ? { type: 'shield', day: t.dayNum + 1 } : ce.fx.reset ? { type: 'ready', day: t.dayNum + 1, prev: ce.fx.prev } : null;
    var next = t.dayNum + 1;
    startDay(next, opts.clock);
    if (E.welcomeBackEligible(S.flags.lastActiveDay, next, S.flags.wbLast) && !opts.silent) S.flags.pendingWelcome = true;
    // v5.4 quiet page: after a quiet stretch the Book gains one warm page (at most one per 14 days). It never mentions the gap,
    // and its number is the next day played, so the Book reads straight through.
    if (E.welcomeBackEligible(S.flags.lastActiveDay, next, null) && (S.book.quietLast == null || next - S.book.quietLast >= 14) && !S.book.pages.some(function (p) { return p.kind === 'quiet' && p.at === next; })) {
      var gapNow = next - S.flags.lastActiveDay - 1;
      if (gapNow === 3) { S.book.pages.push({ kind: 'quiet', day: Math.max(1, S.camp.total), at: next }); S.book.quietLast = next; }
    }
    save();
    return { camp: ce.fx, delivered: t.charge, taperChanged: S.meds.filter(function (m) { return E.taperStepChanged(m, next); }).map(function (m) { return m.id; }) };
  }
  function claimWelcome() {
    if (!S.flags.pendingWelcome) return null;
    S.flags.pendingWelcome = false; S.flags.wbLast = S.day;
    addStars(E.WELCOME_BACK.stars);
    if (isKid()) { save(); return { chestId: null }; } // kids: no random chest
    var id = addChest(E.WELCOME_BACK.chest, 'welcome');
    save(); return { chestId: id };
  }


  /* ---------- v5.3 Campfire + companion growth ----------
   * light(): the ONLY way the count moves up. Called from finishRun (real Run) and feed(). Never from check-ins. */
  function isKid() { return !!(S.profile && S.profile.kid); }
  function campOn() { return !isKid(); }
  function light(source) {
    if (!S.today) return null;
    var r = E.campLight(S.camp, S.day, { kid: isKid() });
    S.camp = r.camp;
    var fx = r.fx; fx.source = source; fx.chests = [];
    if (fx.lit) S.flags.campNote = null;
    if (fx.stageUp && spineDue()) { S.book.spinePending = true; fx.spine = true; }
    fx.milestones.forEach(function (m) { fx.chests.push(addChest(m.chest, 'campfire-' + m.n)); if (m.cosmetic) addCosmetic(m.cosmetic); });
    var rl = tryRelight(); if (rl && rl.relit) fx.relight = rl;
    save(); return fx;
  }
  function addCosmetic(id) { S.cosmetics = S.cosmetics || []; if (S.cosmetics.indexOf(id) < 0) S.cosmetics.push(id); }
  function tryRelight() {
    if (!S.today || !E.relightOffer(S.camp, S.day)) return null;
    var r = E.campRelight(S.camp, S.day, { kid: isKid(), runDone: !!S.today.run, practiceDone: S.today.relightPractice > 0 });
    if (!r.fx.relit) return null;
    S.camp = r.camp; r.fx.chests = [];
    r.fx.milestones.forEach(function (m) { r.fx.chests.push(addChest(m.chest, 'campfire-' + m.n)); if (m.cosmetic) addCosmetic(m.cosmetic); });
    save(); return r.fx;
  }
  /* Feed: one treat a day. Lights the day, small bond + XP burst. No Stars, no tickets, no Spark. */
  var FEED = { xp: 15, bond: 3 };
  function feed() {
    if (!S.today) return null;
    if (S.today.fed) return { already: true };
    S.today.fed = true;
    S.comp.bond += FEED.bond;
    addXp(FEED.xp); var lv = compXp(R.XP.feed);
    S.flags.lastActiveDay = S.day;
    var camp = light('feed');
    save(); return { fed: true, xp: R.XP.feed, bond: FEED.bond, levelUp: lv, camp: camp };
  }
  function startRest(days) { var r = E.campStartRest(S.camp, S.day, days, { kid: isKid() }); S.camp = r.camp; save(); return r; }
  function endRest() { var r = E.campEndRest(S.camp, S.day); S.camp = r.camp; save(); return r; }
  function growth() { return { stage: E.growthStage(S.camp.total), next: E.nextGrowth(S.camp.total), total: S.camp.total }; }

  /* ---------- barrier answers (R1: honesty credit already paid and never changed here) ---------- */
  function answerBarrier(barrierId, medId) {
    var tier = E.barrierTier(barrierId);
    var res = { tier: tier, barrierId: barrierId, swapped: null };
    if (tier === 2) {
      var cq = S.flags.careQuests;
      // The refill quest dissolves into an assistance card and is swapped for a quest of EQUAL value (+40),
      // so answering the help question never pays less than skipping it. The barrier itself earns nothing.
      var med = medById(medId);
      if (med && med.kind !== 'prn' && med.supply != null && med.supply <= 7) {
        var rq = careQuest(medId, 'refill');
        if (!rq.done && !rq.dissolved) { rq.dissolved = true; careQuest(medId, 'swap'); res.swapped = 'refill'; }
      }
      S.flags.assist = { tier: 2, barrierId: barrierId, medId: medId };
    } else if (tier === 3) {
      S.flags.assist = { tier: 3, barrierId: barrierId, medId: medId };
    } else if (tier === 1) {
      S.flags.assist = { tier: 1, barrierId: barrierId, medId: medId };
    }
    save(); return res;
  }

  /* ---------- care quests (refill + follow-up): fixed reward, same any day ---------- */
  var CARE_REWARD = { stars: 40, xp: 30 };
  function careQuest(medId, kind) {
    var cq = S.flags.careQuests[medId] = S.flags.careQuests[medId] || {};
    if (!cq[kind]) cq[kind] = { done: false };
    return cq[kind];
  }
  function completeCareQuest(medId, kind) {
    var q = careQuest(medId, kind); if (q.done || q.dissolved) return null;
    if (kind === 'refill' && S.today && S.today.paid['care-refill-' + medId]) return null;
    q.done = true; q.doneDay = S.day; addStars(CARE_REWARD.stars); addXp(CARE_REWARD.xp);
    var m = medById(medId); if (kind === 'refill' && m) m.supply = (m.supply || 0) + 30;
    save(); return { reward: CARE_REWARD };
  }

  /* ---------- med editing (takes effect from tomorrow; today's plan is locked) ---------- */
  function upsertMed(med) {
    var i = S.meds.map(function (m) { return m.id; }).indexOf(med.id);
    if (i >= 0) S.meds[i] = med; else { med.id = med.id || nid('m'); S.meds.push(med); }
    save(); return med;
  }
  function setPaused(medId, paused) { var m = medById(medId); if (!m) return; m.paused = paused; m.pausedFrom = paused ? S.day + 1 : null; save(); }

  /* ---------- fake Run result (used for simulation and when the Run module is missing) ---------- */
  function fakeRunResult(seed, opts) {
    opts = opts || {};
    var r = E.rng('fake-' + seed + '-' + (opts.salt || ''));
    var stars = opts.stars != null ? opts.stars : 1 + Math.floor(r() * 3);
    var finds = [];
    var nf = 1 + Math.floor(r() * 2) + (opts.magnet ? 1 : 0);
    for (var i = 0; i < nf; i++) { var f = E.FINDS[Math.floor(r() * 28)]; finds.push({ id: f.id, rarity: f.rarity }); }
    var grid = [];
    for (var y = 0; y < 5; y++) { var row = ''; for (var x = 0; x < 5; x++) row += r() < 0.45 ? '🟧' : '⬜'; grid.push(row); }
    var n = String(seed).replace(/\D/g, '') || '1';
    var used = []; if (opts.powerUps) Object.keys(opts.powerUps).forEach(function (k) { if (opts.powerUps[k] > 0 && used.length < 1) used.push(k); });
    return { stars: stars, finds: finds, stepsUsed: 9 + Math.floor(r() * 4), stepsMax: 14, powerUpsUsed: used, routeGrid: grid, shareText: 'Kindling #' + n + ' ' + '⭐'.repeat(stars) + '\n' + grid.join('\n') };
  }

  /* ---------- autoplay (used to build presets honestly through the same engine) ---------- */
  function autoplayDay(policy) {
    policy = policy || {};
    var r = E.rng('auto-' + S.day + '-' + (S.preset || ''));
    S.today.plan.stacks.forEach(function (st) {
      var ans = st.kind === 'rest' ? 'rest' : st.kind === 'journal' ? 'journal' : (policy.answer ? policy.answer(st, r) : 'took');
      if (!ans) return;
      checkIn(st.id, ans, { atMins: st.mins + Math.floor(r() * 25) });
    });
    if (S.today.plan.prn.length && r() < 0.5) logPrn(S.today.plan.prn[0], 900 + Math.floor(r() * 120));
    if (!policy.skipRun) {
      var res = fakeRunResult('day' + S.day, { salt: S.preset, stars: 1 + Math.floor(r() * 3) });
      res.powerUpsUsed = [];
      var fr = finishRun(res, false);
      openChest(fr.chestId);
      sendTrip(null);
    }
    else if (policy.feed !== false) feed(); // Simple-view players light the day with one tap
    if (S.trip.status === 'back') openTrip();
    S.chests.forEach(function (c) { if (!c.opened && /^campfire/.test(c.source || '')) openChest(c.id); });
  }

  /* ---------- presets ---------- */
  function baseMeds(name) {
    switch (name) {
      case 'logan': return [{ id: 'm1', name: 'Focus med', drug: '', strength: '1 capsule', kind: 'daily', times: ['08:00'], color: '#f6a04d', shape: 'capsule', supply: 6, twoStep: true }];
      case 'maya': return [{ id: 'm1', name: 'Vyvanse', strength: '40 mg', kind: 'daily', times: ['08:00'], color: '#7cc4f2', shape: 'capsule', supply: 12 }];
      case 'harold': return [
        { id: 'h1', name: 'Levothyroxine', strength: '75 mcg', kind: 'daily', times: ['07:30'], color: '#c9a7ff', shape: 'round', supply: 40 },
        { id: 'h2', name: 'Lisinopril', strength: '10 mg', kind: 'daily', times: ['08:00'], color: '#ffd2a6', shape: 'round', supply: 22 },
        { id: 'h3', name: 'Metformin', strength: '500 mg', kind: 'multi', times: ['08:00', '12:00', '18:00'], color: '#ffffff', shape: 'oval', supply: 18 },
        { id: 'h4', name: 'Prednisone', kind: 'taper', times: ['08:00'], color: '#fff3b0', shape: 'round', supply: 20, steps: [{ fromDay: 1, label: '40 mg' }, { fromDay: 8, label: '30 mg' }, { fromDay: 15, label: '20 mg' }, { fromDay: 22, label: '10 mg' }], endDay: 28 },
        { id: 'h5', name: 'Aspirin', strength: '81 mg', kind: 'daily', times: ['08:00'], color: '#ffb0a8', shape: 'round', supply: 60 },
        { id: 'h6', name: 'Vitamin D', strength: '1000 IU', kind: 'daily', times: ['08:00'], color: '#ffd166', shape: 'oval', supply: 80 },
        { id: 'h7', name: 'Calcium', strength: '600 mg', kind: 'daily', times: ['12:00'], color: '#eeeeee', shape: 'oval', supply: 45 },
        { id: 'h8', name: 'Atorvastatin', strength: '20 mg', kind: 'daily', times: ['18:00'], color: '#9ad0f5', shape: 'oval', supply: 25 },
        { id: 'h9', name: 'Metoprolol', strength: '25 mg', kind: 'daily', times: ['18:00'], color: '#f7a6c8', shape: 'round', supply: 5 },
        { id: 'h10', name: 'Warfarin', strength: '5 mg', kind: 'daily', times: ['18:00'], color: '#ffc4a3', shape: 'round', supply: 30, highRisk: true },
        { id: 'h11', name: 'Tamsulosin', strength: '0.4 mg', kind: 'daily', times: ['21:30'], color: '#b4e3a7', shape: 'capsule', supply: 28 },
        { id: 'h12', name: 'Melatonin', strength: '3 mg', kind: 'daily', times: ['21:30'], color: '#d7c8ff', shape: 'round', supply: 50 },
        { id: 'h13', name: 'Nitroglycerin', strength: '0.4 mg', kind: 'prn', times: [], color: '#fff', shape: 'round', note: '' },
        { id: 'h14', name: 'Acetaminophen', strength: '500 mg', kind: 'prn', times: [], color: '#fff', shape: 'oval' }
      ];
      case 'priya': return [{ id: 'p1', name: 'Adalimumab', strength: '40 mg pen', kind: 'weekly', weekday: 0, times: ['09:00'], color: '#8ec5ff', shape: 'pen', supply: 14 }];
      case 'dan': return [
        { id: 'd1', name: 'Sertraline', strength: '50 mg', kind: 'daily', times: ['08:00'], color: '#9ad0f5', shape: 'oval', supply: 20 },
        { id: 'd2', name: 'Allergy spray', strength: '1 spray', kind: 'prn', times: [], color: '#b4e3a7', shape: 'drop' }
      ];
    }
    return [];
  }
  function loadPreset(name) {
    var keepTheme = S.theme;
    S = blank(); S.onboarded = true; S.preset = name;
    S.meds = baseMeds(name);
    var target = 2, policy = {}, theme = 'expedition', comp = { species: 'fox', name: 'Ember' };
    if (name === 'logan') { target = 2; comp = { species: 'fox', name: 'Ember' }; S.settings.twoStep = true; }
    if (name === 'maya') { target = 5; comp = { species: 'drake', name: 'Nova' }; policy.answer = function (st, r) { return S.day === 3 ? 'didnt' : 'took'; }; }
    if (name === 'harold') { target = 4; theme = 'grove'; comp = { species: 'gnome', name: 'Bramble' }; S.settings.simple = true; S.settings.textSize = 'large'; S.settings.twoStep = false; policy.skipRun = true; policy.answer = function (st, r) { return st.id === 'midday' && S.day === 2 ? null : 'took'; }; }
    if (name === 'priya') { target = 6; comp = { species: 'otter', name: 'Pebble' }; S.settings.twoStep = true; }
    if (name === 'dan') { target = 3; comp = { species: 'otter', name: 'Pebble' }; S.people = true; S.settings.twoStep = false; }
    S.theme = theme; S.comp = { species: comp.species, name: comp.name, bond: 0 };
    // first-session gifts (same as onboarding)
    S.pu.magnet = 0; addChest('bronze', 'first'); openChest(S.chests[0].id);
    // v5.4 gear: everyone starts with one scripted Tool. The founder tour carries a week's worth of gear (demo) so the
    // board's "Change gear" has about 8 pieces to swap; the 9th arrives on the first morning return.
    S.inventory.bag = name === 'logan' ? ['compass', 'satchel', 'lantern', 'boots', 'cloak', 'scarf', 'acorn', 'stone'] : ['compass'];
    S.inventory.equipped = { tool: 'compass', garb: null, trinket: null };
    compXp(R.XP.welcome);
    startDay(1);
    for (var d = 1; d < target; d++) { autoplayDay(policy); rollover({ silent: true }); }
    if (name === 'logan') { S.decorOwned.push('d2'); S.placed = { 4: 'd5', 1: 'd2' }; }
    if (name === 'maya') { S.decorOwned.push('d1', 'd2', 'd3'); S.placed = { 4: 'd1', 3: 'd2', 5: 'd3' }; }
    if (name === 'harold') { S.decorOwned.push('d1', 'd6'); S.placed = { 4: 'd1', 1: 'd6' }; }
    if (name === 'priya') { S.decorOwned.push('d4'); S.placed = { 4: 'd4' }; }
    S.flags.pendingWelcome = false;
    S.clock = name === 'harold' ? 450 : 480;
    save();
  }

  /* ---------- onboarding completion ---------- */
  function finishOnboarding(o) {
    var keep = { theme: o.theme, comp: o.comp, settings: S.settings };
    S = blank(); S.onboarded = true; S.preset = 'onboarded';
    S.theme = keep.theme; S.comp = { species: keep.comp.species, name: keep.comp.name, bond: 2 };
    S.settings = Object.assign(S.settings, keep.settings, { twoStep: !!o.twoStep });
    S.mode = o.mode;
    S.meds = [{ id: 'm1', name: o.medName || (o.mode === 'habits' ? 'Vitamin' : 'My morning med'), strength: '', kind: 'daily', times: [o.time || '08:00'], color: o.mode === 'habits' ? '#ffd166' : '#f6a04d', shape: o.mode === 'habits' ? 'oval' : 'capsule', supply: 21, twoStep: !!o.twoStep }];
    startDay(1, 480);
    // tutorial rewards (practice: nothing recorded in the health record)
    addXp(80); addStars(80); compXp(R.XP.welcome);
    S.inventory.bag = ['compass']; S.inventory.equipped = { tool: 'compass', garb: null, trinket: null };
    if (o.chestResult) { o.chestResult.finds.forEach(function (f) { addFind(f.id); }); addStars(o.chestResult.stars); S.chests.push({ id: nid('ch'), type: 'bronze', source: 'first', day: 1, opened: true, openedDay: 1, result: { finds: o.chestResult.finds, stars: o.chestResult.stars } }); }
    addPowerUp('magnet', 'Your practice catch');
    S.puDropped = 1;
    S.trip = { status: 'out', dest: o.dest, leftDay: 1 };
    S.today.tripSent = true;
    S.flags.lastActiveDay = 1;
    save();
  }

  /* ---------- v5.4 demo jumps: build a believable day-N state through the same engine (moderate player, est.) ---------- */
  var SAMPLE_WEEK = [['q1', 0], ['q2', 1], ['q3', 0], ['q1', 2], ['q2', 0], ['q3', 1], ['q1', 1]];
  function jumpTo(n) {
    var keepSpine = (S.book.pages.filter(function (p) { return p.kind === 'spine' && p.ch === 1; })[0] || {}).choice;
    var keep = { theme: S.theme, comp: S.comp, settings: S.settings, meds: S.meds.length ? S.meds : baseMeds('logan'), preset: S.preset, fork: S.rpg.fork, kid: isKid() };
    S = blank(); S.onboarded = true; S.preset = keep.preset || 'logan';
    S.theme = keep.theme; S.comp = keep.comp; S.settings = keep.settings; S.meds = keep.meds; S.profile.kid = keep.kid;
    var played = n - 1; // every day before today was played; today lights on the first Feed or Run
    S.compLevel.xp = 130 * played + R.XP.welcome; S.compLevel.level = R.levelInfo(S.compLevel.xp).level;
    var c = E.campBlank(); c.total = played; c.count = played; c.best = played; c.shields = 2; c.lastLit = n - 1;
    E.milestonesUpTo(played).forEach(function (m) { c.paid[m] = true; }); S.camp = c;
    S.stars = 45 * played; S.life.starsEarned = S.stars; S.life.runs = Math.round(played * 0.7); S.tickets = 3;
    E.FINDS.slice(0, Math.min(30, Math.round(played / 4) + 6)).forEach(function (f) { S.owned[f.id] = 1; });
    // Early jumps hold 8 of the 9 basic pieces (the Trail Boots haven't dropped yet), so the day-45 fork visibly moves a beat.
    S.inventory.bag = n < 100 ? R.BASIC.filter(function (x) { return x !== 'boots'; }) : R.BASIC.slice();
    if (n >= 150) S.inventory.bag.push('spyglass', 'mantle', 'ribbon');
    S.rpg.returns = played; S.rpg.packedLast = null;
    if (n > 45) { ['trail', 'scout', 'wind', 'fork', 'stride'].forEach(function (k) { S.rpg.nodes[k] = true; }); S.rpg.fork = keep.fork || 'ridge'; }
    if (n >= 300) S.rpg.nodes.paths = true;
    // The Book, pre-built: prologue, chapter one (your choice if you made one), one weekly page a week, a quiet page,
    // and the later chapter titles for each stage reached.
    var choice = keepSpine || 'ridge', pages = [{ kind: 'prologue', day: 1 }];
    if (n > 7) { pages.push({ kind: 'spine', ch: 1, choice: choice, day: 7 }); S.rpg.path = SPINE[choice]; }
    for (var w = 1; w * 7 < n; w++) {
      pages.push({ kind: 'weekly', week: w, day: w * 7, picks: [0, 1, 2].map(function (k) { var x = SAMPLE_WEEK[(w + k * 2) % 7]; return { quest: x[0], beat: x[1], tier: k === 0 ? 'amazing' : 'great' }; }) });
      S.book.weekly[w] = true;
    }
    if (n > 40) { pages.push({ kind: 'quiet', day: 38, at: 41 }); S.book.quietLast = 41; }
    for (var st = 2; st < E.GROWTH.length && E.GROWTH[st] <= played; st++) pages.push({ kind: 'spine', ch: st, stub: true, day: E.GROWTH[st] });
    pages.sort(function (a, b) { return a.day - b.day; });
    S.book.pages = pages;
    S.book.journal = SAMPLE_WEEK.slice(0, 6).map(function (x, i) { var res = R.resolve(x[0], compState(), R.bestLoadout(x[0], compState(), S.inventory.bag, regionTier()), regionTier()); return { day: played - 5 + i, quest: x[0], tiers: res.map(function (r) { return r.tier; }), gear: [] }; });
    S.inventory.equipped = R.bestLoadout('q1', compState(), S.inventory.bag, regionTier());
    S.flags.lastActiveDay = n - 1;
    startDay(n, 480);
    // The overnight quest left yesterday and is back this morning.
    S.trip = { status: 'out', dest: 'saltflats', quest: 'q1', leftDay: n - 1, loadout: S.inventory.equipped, comp: JSON.parse(JSON.stringify(compState())), tier: regionTier(), packed: null };
    S.day = n - 1; computeTripReturn(80); S.day = n;
    S.today.tripSent = false;
    save();
  }
  /* Day 7 jump: the morning of day 7 with six days played. Feeding (or the Run) lights day 7: Cub, then Chapter One. */
  function jumpTo7() { jumpTo(7); }
  /* Jumps that land on a Campfire milestone: light today so the milestone chest is really earned through the engine. */
  function jumpLit(n) { jumpTo(n); S.today.fed = true; var fx = light('feed'); save(); return fx; }

  root.Store = {
    get S() { return S; }, set S(v) { S = v; },
    blank: blank, save: save, load: load, reset: reset,
    startDay: startDay, stackById: stackById, medById: medById, openStack: openStack, allAnswered: allAnswered, piecesFor: piecesFor,
    pillOut: pillOut, putBack: putBack, checkIn: checkIn, logPrn: logPrn, prnNone: prnNone, lastPrn: lastPrn,
    yesterday: yesterday, backfill: backfill,
    finishRun: finishRun, addChest: addChest, openChest: openChest, sendTrip: sendTrip, openTrip: openTrip,
    buyDecor: buyDecor, placeDecor: placeDecor, rollover: rollover, claimWelcome: claimWelcome,
    answerBarrier: answerBarrier, careQuest: careQuest, completeCareQuest: completeCareQuest, CARE_REWARD: CARE_REWARD,
    upsertMed: upsertMed, setPaused: setPaused, fakeRunResult: fakeRunResult, autoplayDay: autoplayDay,
    loadPreset: loadPreset, finishOnboarding: finishOnboarding,
    light: light, feed: feed, tryRelight: tryRelight, startRest: startRest, endRest: endRest, growth: growth, isKid: isKid, campOn: campOn, FEED: FEED, addPowerUp: addPowerUp, completeHeadline: completeHeadline, headlineDone: headlineDone, hasWeekly: hasWeekly, boostTrip: boostTrip, addCharge: addCharge, addStars: addStars, addXp: addXp, questDone: questDone, addFind: addFind,
    // v5.4 companion RPG
    compXp: compXp, compState: compState, stage: stage, regionTier: regionTier, bag: bag, addGear: addGear, equip: equip, readyLoadout: readyLoadout,
    spFree: spFree, learnNode: learnNode, sendQuest: sendQuest, questForDest: questForDest, pickChestGear: pickChestGear, chooseSpine: chooseSpine, spineDue: spineDue,
    playedDayNo: playedDayNo, jumpTo: jumpTo, jumpLit: jumpLit, answerXp: answerXp
  };
})(typeof window !== 'undefined' ? window : globalThis);
