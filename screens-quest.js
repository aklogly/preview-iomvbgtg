/* Kindling v5.4 — screens-quest.js : the companion RPG.
 * Quest tile (Today, below the check-in card), quest board, gear, the morning return (beats -> haul -> page turn),
 * "Same quest, two builds", the companion sheet, the Pathfinder tree, and Epic/Legendary "choose 1 of 3".
 * Dose-blind: quest outcomes come from level + tree + gear only. Packed power-ups add Finds, nothing else. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, R = root.RPG, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  function ST() { return root.Story.T(S().theme); }
  function def() { return Th.companionDef(th(), S().comp.species); }
  function nm() { return S().comp.name; }
  function fill(t) { return root.Story.fill(t, { theme: S().theme, name: nm(), def: def() }); }
  function bg() { return S().theme === 'grove' ? 'grove-bg' : 'dark'; }
  function qName(id) { return ST().quests[id].name; }
  function statName(k) { return ST().stats[k][0]; }
  function statIc(k) { return ST().stats[k][1]; }
  function tierName(t) { return ST().tiers[t]; }
  function gName(id) { return ST().gear[id]; }
  function cs() { return St.compState(); }
  var ui = { pack: null, gq: null, lo: null, last: null, ccPick: null };

  /* ---------- small pieces ---------- */
  function beatChip(r, q, i, opts) {
    opts = opts || {};
    var b = R.quest(q).beats[i];
    if (r.unknown) return '<span class="beat-chip t-unknown"><i>?</i><span class="bc-l">Hidden beat</span></span>';
    var tag = b.tag ? ' <em>' + esc(ST().tags[b.tag]) + '</em>' : '';
    return '<span class="beat-chip t-' + r.tier + '"><i>' + statIc(r.stat) + '</i><span class="bc-l">' + esc(statName(r.stat)) + tag + (opts.nums ? ' <small>' + r.value + '</small>' : '') + '</span><b>' + esc(tierName(r.tier)) + '</b></span>';
  }
  function gearIcons(lo) { return ['tool', 'garb', 'trinket'].map(function (sl) { var id = lo && lo[sl]; return '<span class="g-ic ' + (id ? 'r-' + R.ITEMS[id].rarity : 'empty') + '" title="' + esc(id ? gName(id) : 'Empty ' + ST().slots[sl]) + '">' + (id ? R.ITEMS[id].icon : '·') + '</span>'; }).join(''); }
  function impactText(imp) {
    if (!imp) return 'No change on tomorrow’s board. It helps on harder ' + th().terms.trips.toLowerCase() + ' later.';
    var q = qName(imp.quest), bn = ST().quests[imp.quest].beats[imp.beat].name;
    if (imp.reveal) return q + ': shows the hidden beat, “' + bn + '” (' + statName(imp.stat) + ', ' + tierName(imp.to) + ').';
    if (imp.numeric) return q + ' · ' + bn + ': ' + statName(imp.stat) + ' ' + imp.fromV + ' → ' + imp.toV + (imp.to !== 'amazing' ? ' (' + tierName(imp.to === 'steady' ? 'great' : 'amazing') + ' at ' + imp.next + ')' : ', already ' + tierName('amazing')) + '.';
    return q + ' · ' + bn + ': ' + tierName(imp.from) + ' → ' + tierName(imp.to);
  }
  // One format everywhere (v5.6 UX fix 2): the upgraded stat as a plain number, "Wayfinding 5". The gear level is "+2" after the name.
  function plusOf(id) { return root.Progress ? root.Progress.plusOf(S(), id) : 1; }
  function statLine(id) { var it = R.ITEMS[id]; return statName(it.stat) + ' ' + (it.amt + plusOf(id) - 1); }
  function gTitle(id) { return gName(id) + (plusOf(id) > 1 ? ' +' + plusOf(id) : ''); }
  function rarTitle(r) { return r.charAt(0).toUpperCase() + r.slice(1); }
  function forkName() { var f = S().rpg.fork; return f && S().rpg.nodes.fork ? ST().tree.sides[f][0] : null; }

  /* ---------- Today: the quest tile (below the check-in card) ---------- */
  function tile() {
    var s = S(), tr = s.trip, tm = th();
    if (tr.status === 'back' && tr.quest) {
      return '<section class="tile trip quest-tile tap" data-act="trip-open" aria-label="' + esc(tm.terms.trip) + '"><div class="deco">📮</div>' +
        '<div class="t-kicker">' + esc(tm.terms.trip) + ' · back this morning</div><div class="t-title">' + esc(nm()) + ' is back from ' + esc(qName(tr.quest)) + '</div>' +
        '<div class="t-body">Three beats to see, a haul to unpack, and a new page.' + (tr.auto ? ' ' + esc(nm()) + ' picked ' + esc(qName(tr.quest)) + ' on their own. Pick tonight’s anytime.' : '') + '</div>' +
        '<div class="t-row"><button class="btn btn-tile" data-act="trip-open" data-autofocus>📬 See how it went</button></div></section>';
    }
    if (tr.status === 'back') { // a pre-v5.4 Trip still waiting
      return '<section class="tile trip" aria-label="' + esc(tm.terms.trip) + '"><div class="deco">📮</div><div class="t-kicker">' + esc(tm.terms.trip) + ' · back this morning</div><div class="t-title">' + esc(nm()) + ' is back</div><div class="t-row"><button class="btn btn-tile" data-act="trip-open">📬 See how it went</button></div></section>';
    }
    if (tr.status === 'out') {
      var q = tr.quest || St.questForDest(tr.dest) || 'q1';
      var p = R.predict(q, tr.comp || cs(), tr.loadout || St.readyLoadout(q), tr.tier != null ? tr.tier : St.regionTier());
      var gone = St.tripOvernight();
      // The whole card opens "where, gear, when back" (it has no other button). Beat chips are flat here, not buttons.
      return '<section class="tile trip quest-tile tap" role="button" tabindex="0" data-act="quest-out" aria-label="' + esc(nm()) + (gone ? ' is out on ' : ' leaves tonight for ') + esc(qName(q)) + '. Back around 6:00 AM"><div class="deco">' + ST().quests[q].icon + '</div>' +
        '<div class="t-kicker">' + esc(tm.terms.trip) + (gone ? ' · out tonight' : ' · tonight') + '</div><div class="t-title">' + (gone ? esc(nm()) + ' is out on ' + esc(qName(q)) : 'Tonight: ' + esc(qName(q))) + '</div>' +
        '<div class="beat-row flat">' + p.map(function (r, i) { return beatChip(r, q, i); }).join('') + '</div>' +
        '<div class="t-body">' + gearIcons(tr.loadout) + (tr.packed ? ' · packed a ' + esc(tm.powerUps[tr.packed.type].name) : '') + (gone ? ' · back around 6:00 AM.' : ' · leaves 9:00 PM · back around 6:00 AM.') + '</div></section>';
    }
    if (s.settings.simple) {
      var rq = recommended();
      return '<section class="tile trip quest-tile" aria-label="' + esc(tm.terms.trip) + '"><div class="deco">🧭</div><div class="t-kicker">' + esc(tm.terms.trip) + '</div><div class="t-title">Send ' + esc(nm()) + ' to ' + esc(qName(rq)) + '?</div>' +
        '<div class="t-body">' + esc(nm()) + ' gets ready and comes back in the morning with a story.</div>' +
        '<div class="t-row"><button class="btn btn-tile" data-act="qs-send" data-q="' + rq + '">🧭 Send ' + esc(nm()) + '</button><button class="btn btn-tile-2" data-act="trip-send">Other places</button></div></section>';
    }
    var rec = St.recommendedQuest();
    return '<section class="tile trip quest-tile tap" data-act="trip-send" aria-label="' + esc(tm.terms.trip) + '"><div class="deco">🧭</div>' +
      '<div class="t-kicker">' + esc(tm.terms.trip) + '</div><div class="t-title">Where should ' + esc(nm()) + ' go tonight?</div>' +
      '<div class="t-body">Pick a ' + esc(tm.terms.trip.toLowerCase()) + '. Gear and skills decide how it goes. It never fails. If you don’t pick, ' + esc(nm()) + ' will choose ' + esc(qName(rec)) + ' at 9:00 PM.</div>' +
      '<div class="t-row"><button class="btn btn-tile" data-act="trip-send">🧭 Pick a ' + esc(tm.terms.trip.toLowerCase()) + '</button><button class="btn btn-tile-2" data-act="go" data-to="companion">' + esc(nm()) + '’s gear</button></div></section>';
  }
  function recommended() { var best = 'q1', bs = -1; R.QUESTS.forEach(function (q) { var sc = R.score(R.predict(q, cs(), St.readyLoadout(q.id), St.regionTier())); if (sc > bs) { bs = sc; best = q.id; } }); return best; }

  /* ---------- the quest board ---------- */
  function packRow() {
    var s = S(), tm = th(), have = R.PACKABLE.filter(function (k) { return s.pu[k] > 0; });
    if (!have.length) return '<p class="muted sm pack-note">Power-ups from your check-ins can be packed for extra ' + esc(tm.terms.finds) + '. None in the bag right now.</p>';
    if (ui.pack && have.indexOf(ui.pack) < 0) ui.pack = null;
    return '<div class="pack-row"><div class="pack-h">Pack a power-up <span class="muted">(optional)</span></div><div class="pack-chips">' +
      '<button class="pk-chip ' + (!ui.pack ? 'on' : '') + '" data-act="qs-pack" data-k="">None</button>' +
      have.map(function (k) { return '<button class="pk-chip ' + (ui.pack === k ? 'on' : '') + '" data-act="qs-pack" data-k="' + k + '"><span class="pu-badge sm">' + tm.powerUps[k].icon + '</span>' + esc(tm.powerUps[k].name) + ' ×' + s.pu[k] + '</button>'; }).join('') + '</div>' +
      (ui.pack ? '<p class="muted sm">' + esc(s.puSources[ui.pack] || 'Your check-ins') + ' built this ' + esc(tm.powerUps[ui.pack].name) + '. ' + esc(packDoes(ui.pack)) + '</p>' : '<p class="muted sm">Power-ups only ever add ' + esc(tm.terms.finds) + '. Gear, skills and the story never depend on them.</p>') + '</div>';
  }
  function packDoes(k) { var f = th().terms.finds; return k === 'magnet' ? '+1 ' + th().terms.find + ' for each Great or Amazing beat.' : k === 'double' ? 'Doubles the extra ' + f + ' from the rolls.' : 'One ' + th().terms.find + ' comes back one rarity higher.'; }
  function boardBody() {
    var tier = St.regionTier(), tm = th();
    var cards = R.QUESTS.map(function (q) {
      var lo = St.readyLoadout(q.id), p = R.predict(q, cs(), lo, tier), sq = ST().quests[q.id];
      return '<div class="qb-card"><div class="qb-top"><span class="qb-ic">' + sq.icon + '</span><div class="grow"><div class="qb-name">' + esc(sq.name) + '</div><div class="qb-sub">' + gearIcons(lo) + ' <span class="muted">best gear</span></div></div></div>' +
        '<div class="beat-row">' + p.map(function (r, i) { return beatChip(r, q.id, i); }).join('') + '</div>' +
        '<div class="qb-acts"><button class="btn btn-dark" data-act="qs-send" data-q="' + q.id + '">Get ready + Send</button><button class="btn btn-soft" data-act="qs-gear" data-q="' + q.id + '">Change gear</button></div></div>';
    }).join('');
    return '<p class="muted qb-lede">Each line shows how that part of the trip will go with ' + esc(nm()) + '’s best gear. Same gear, same result, every time.</p>' + (root.ProgressUI ? root.ProgressUI.lookForRow() : '') + cards + packRow() +
      '<p class="muted sm qb-foot">' + esc(tm.terms.trips) + ' never fail. The worst result is Steady, plus a story. Every ' + esc(tm.terms.trip.toLowerCase()) + ' pays the same XP.</p>';
  }
  function board() {
    if (!S().today) return;
    if (S().trip.status !== 'home') { U.toast(esc(nm()) + ' is already out. Back in the morning.'); return; }
    U.sheet('Where should ' + nm() + ' go tonight?', boardBody(), { sub: esc(title()) + ' · Lv ' + R.levelInfo(S().compLevel.xp).level, cls: 'qb-ov' });
  }
  function title() { return root.BookUI ? root.BookUI.title() : nm(); }
  function refreshSheet(html) { var t = U.topOverlay(); var b = t && t.el.querySelector('.sh-body'); if (b) b.innerHTML = html; }

  /* ---------- manual gear (behind "Change gear") ---------- */
  function gearBody() {
    var q = ui.gq, lo = ui.lo, p = R.predict(q, cs(), lo, St.regionTier());
    var rows = ['tool', 'garb', 'trinket'].map(function (sl) {
      var items = St.bag().filter(function (id) { return R.ITEMS[id].slot === sl; });
      return '<div class="gs-row"><div class="gs-h">' + esc(ST().slots[sl]) + '</div><div class="gs-items">' +
        '<button class="gs-item ' + (!lo[sl] ? 'on' : '') + '" data-act="qs-equip" data-slot="' + sl + '" data-id="">None</button>' +
        items.map(function (id) { return '<button class="gs-item r-' + R.ITEMS[id].rarity + (lo[sl] === id ? ' on' : '') + '" data-act="qs-equip" data-slot="' + sl + '" data-id="' + id + '"><span class="gi-ic">' + R.ITEMS[id].icon + '</span><span class="gi-t">' + esc(gName(id)) + '<small>' + esc(statLine(id)) + '</small></span></button>'; }).join('') + '</div></div>';
    }).join('');
    return '<div class="beat-row gs-preview">' + p.map(function (r, i) { return beatChip(r, q, i, { nums: true }); }).join('') + '</div>' +
      '<p class="muted sm">Great at ' + R.TIERS[St.regionTier()].great + ', Amazing at ' + R.TIERS[St.regionTier()].amazing + '. Tap gear to see the chips change.</p>' + rows + packRow() +
      '<div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-act="qs-ready">Get ready (best)</button><button class="btn btn-dark" data-act="qs-send-manual">Send with this gear</button></div>';
  }
  function gearSheet(q) { ui.gq = q; ui.lo = Object.assign({}, St.readyLoadout(q)); U.sheet('Change gear', gearBody(), { sub: esc(qName(q)) + ' · 3 slots · ' + St.bag().length + ' pieces in the bag' }); }
  function send(q, lo) {
    var r = St.sendQuest(q, lo, ui.pack); if (!r) return;
    var packed = ui.pack; ui.pack = null;
    U.closeAll(); root.App.render(); U.sfx('reveal');
    U.toast(esc(nm()) + ' leaves for ' + esc(qName(q)) + ' at 9:00 PM' + (packed ? ' with a ' + esc(th().powerUps[packed].name) + ' packed' : '') + '. Back around 6:00 AM.');
  }

  /* ---------- the morning return: beats first, then the haul, then a page turn ---------- */
  function postcardLine() { var k = (ST().kinds || {})[def().kind]; var arr = k ? k.postcards : th().lines.postcards; return arr[(S().day + S().rpg.returns) % arr.length]; }
  function openReturn() {
    var s = S(), tr = s.trip; if (tr.status !== 'back') return;
    if (!tr.results) { legacyOpen(); return; }
    var q = tr.quest, sq = ST().quests[q], fk = tr.comp && tr.comp.fork && tr.comp.nodes && tr.comp.nodes.fork ? ST().tree.sides[tr.comp.fork][0] : null;
    var cards = tr.results.map(function (r, i) {
      var b = sq.beats[i], line = fill(b.lines[{ steady: 0, great: 1, amazing: 2 }[r.tier]]);
      return '<div class="beat-card t-' + r.tier + '" style="--d:' + (i * 0.55) + 's"><div class="bc-in"><div class="bc-face bc-down">' + (r.hidden ? '?' : statIc(r.stat)) + '</div><div class="bc-face bc-up">' +
        '<div class="bc-top"><span class="bc-ic">' + statIc(r.stat) + '</span><span class="bc-name">' + esc(b.name) + '<small>' + (r.hidden ? 'Hidden beat · ' : '') + esc(statName(r.stat)) + (r.tag ? ' ' + esc(ST().tags[r.tag]) : '') + ' · ' + r.value + '</small></span><span class="bc-tier">' + esc(tierName(r.tier)) + '</span></div>' +
        '<p class="bc-line">' + esc(line) + '</p>' + (r.perk ? '<p class="bc-perk">' + esc(gName(r.perk)) + ' turned this Steady into Great.</p>' : '') + '</div></div></div>';
    }).join('');
    var boost = s.settings.simple && E.PU_ORDER.some(function (k) { return s.pu[k] > 0; }) && !tr.haul.boost ? '<button class="btn btn-clear" data-act="trip-boost">Use a power-up for 1 more ' + esc(th().terms.find) + '</button>' : '';
    U.sfx('reveal');
    U.full('<div class="qr-wrap"><div class="qr-scroll"><div class="qr-kicker">' + sq.icon + ' This morning</div><div class="qr-title">' + esc(nm()) + ' is back from ' + esc(sq.name) + '</div>' +
      '<div class="qr-sub">“' + esc(postcardLine()) + '”</div><div class="qr-gear">' + gearIcons(tr.loadout) + (fk ? '<span class="qr-fork">' + esc(fk) + '</span>' : '') + '</div>' +
      '<div class="beat-cards">' + cards + '</div></div>' +
      '<div class="qr-actions">' + boost + '<button class="btn btn-light" data-act="trip-unpack" data-autofocus>Unpack the haul</button></div></div>', { bg: bg(), cls: 'qr-ov' });
    setTimeout(function () { U.$$('.beat-card').forEach(function (c) { c.classList.add('up'); if (c.classList.contains('t-amazing')) setTimeout(function () { U.burstAt(c, { n: 24, spread: 90 }); U.sfx('rare'); }, U.calm() ? 0 : 600 + 550 * (+getComputedStyle(c).getPropertyValue('--d').replace('s', '') || 0)); }); }, U.calm() ? 0 : 250);
  }
  function legacyOpen() { var tr = S().trip; tr.results = R.resolve(tr.quest || 'q1', cs(), St.readyLoadout(tr.quest || 'q1'), St.regionTier()); tr.quest = tr.quest || 'q1'; tr.haul.gear = tr.haul.gear || []; openReturn(); }
  function unpack() {
    U.closeAll();
    var s = S(), tm = th(), tr = s.trip; if (tr.status !== 'back') return;
    var h = tr.haul, q = tr.quest;
    var r = St.openTrip(); if (!r) return;
    ui.last = r;
    U.sfx('chest');
    var seenNew = {};
    var cards = h.finds.map(function (f, i) { var a = Th.findArt(tm, f.id), isNew = !f.dup && !seenNew[f.id]; if (isNew) seenNew[f.id] = 1; return '<div class="rcard flipped r-' + f.rarity + '" style="animation-delay:' + (i * 120) + 'ms"><div class="rc-in"><div class="rc-face rc-back">?</div><div class="rc-face rc-front"><span class="em">' + a.icon + '</span><span class="nm">' + esc(a.name) + '</span><span class="tag">' + (f.fuelStars ? 'Extra copy: +25 ★' : isNew ? 'New!' : 'Spare') + '</span></div></div></div>'; }).join('');
    var ga = r.gearArrive || [];
    var gear = (h.gear || []).map(function (g, gi) {
      var arr = ga[gi] || {};
      var it = R.ITEMS[g.id], imp = g.dup ? null : R.gearImpact(g.id, cs(), St.bag(), St.regionTier());
      return '<div class="gear-card r-' + it.rarity + '"><span class="gc-ic">' + it.icon + '</span><div class="grow"><div class="gc-name">' + esc(gTitle(g.id)) + ' <span class="rar ' + (it.rarity === 'legendary' ? 'epic' : it.rarity) + '">' + it.rarity + '</span></div><div class="gc-stat">' + esc(ST().slots[it.slot]) + ' · ' + esc(statLine(g.id)) + '</div>' +
        '<div class="gc-imp">' + (arr.kind === 'plus' ? 'Another ' + esc(gName(g.id)) + '! Yours is now +' + arr.plus + '. ' + esc(statName(it.stat)) + ' ' + (it.amt + arr.plus - 2) + ' → ' + (it.amt + arr.plus - 1) + '.' : arr.kind === 'stars' ? esc(gName(g.id)) + ' is fully upgraded, so this one became 100 Stars.' : imp ? '⬆ Turns ' + esc(impactText(imp)) : 'Ready for the next ' + esc(tm.terms.trip.toLowerCase()) + '.') + '</div></div></div>';
    }).join('');
    var lines = '<span>+' + h.stars + ' ★</span><span>+' + (h.compXp || R.XP.quest) + ' XP for ' + esc(nm()) + '</span>' + (r.powerUp && !r.powerUp.converted ? '<span>+1 ' + esc(tm.powerUps[r.powerUp.type].name) + '</span>' : '');
    var fuel = '';
    if (h.provisions && (h.provisions.finds > 0 || h.provisions.stars > 0)) fuel += '<div class="fuel-line">✨ Packed with your ' + esc(tm.terms.charge) + ': ' + [h.provisions.finds > 0 ? '+' + h.provisions.finds + ' ' + esc(h.provisions.finds === 1 ? tm.terms.find : tm.terms.finds) : '', h.provisions.stars > 0 ? '+' + h.provisions.stars + ' ★' : ''].filter(Boolean).join(', ') + '</div>';
    if (h.packed && (h.packed.finds > 0 || h.packed.bump > 0)) fuel += '<div class="fuel-line"><span class="pu-badge sm">' + tm.powerUps[h.packed.type].icon + '</span> Your ' + esc(tm.powerUps[h.packed.type].name) + (h.packed.source ? ' (built by ' + esc(h.packed.source.replace(/^Your /, 'your ')) + ')' : '') + ': ' + (h.packed.finds > 0 ? '+' + h.packed.finds + ' ' + esc(h.packed.finds === 1 ? tm.terms.find : tm.terms.finds) : 'one ' + esc(tm.terms.find) + ' came back rarer') + '</div>';
    U.full('<div class="qr-wrap"><div class="qr-scroll"><div class="qr-title">' + esc(nm()) + '’s haul</div><div class="qr-sub">From ' + esc(qName(q)) + '</div>' +
      (gear ? '<div class="gear-cards">' + gear + '</div>' : '') +
      '<div class="reveal-cards">' + cards + '</div><div class="loot-line">' + lines + '</div>' + fuel + '</div>' +
      '<div class="qr-actions"><button class="btn btn-light" data-act="qr-page" data-autofocus>📖 Turn the page</button><button class="btn btn-clear" data-act="ov-next">Later</button></div></div>', { bg: bg(), cls: 'qr-ov' });
    setTimeout(function () { var gc = document.querySelector('.gear-card'); if (gc) { U.burstAt(gc, { n: 30, spread: 110 }); U.sfx('rare'); } }, U.calm() ? 0 : 400);
    if (r.levelUp) setTimeout(function () { U.levelBanner(r.levelUp); }, 900);
  }
  // The page turn: on day 7 into the Book's weekly page, otherwise into today's Journal page.
  function turnPage() {
    var r = ui.last; U.closeAll();
    if (!r || !root.BookUI) return;
    if (r.weekly) {
      var list = root.BookUI.bookList(), i = list.indexOf(r.weekly);
      root.BookUI.open(list, i, { turnFrom: Math.max(0, i - 1) });
    } else {
      var jl = root.BookUI.journalList(), j = jl.length - 1;
      root.BookUI.open(jl, j, { journal: true, turnFrom: j > 0 ? j - 1 : -1 });
    }
  }

  /* ---------- "Same quest, two builds" ---------- */
  var BUILDS = [
    { side: 'ridge', lo: { tool: 'compass', garb: 'boots', trinket: 'acorn' } },
    { side: 'water', lo: { tool: 'satchel', garb: 'boots', trinket: 'bead' } }
  ];
  function twoBuilds() {
    var q = 'q1', sq = ST().quests[q], tier = 1;
    var cols = BUILDS.map(function (b, bi) {
      var c = { level: 14, nodes: { trail: true, scout: true, fork: true }, fork: b.side };
      var res = R.resolve(q, c, b.lo, tier), h = R.rollHaul(res, { seed: 'two-builds-' + b.side, bag: ['compass', 'satchel', 'boots', 'acorn', 'bead'] });
      var best = res.reduce(function (m, r) { return R.TIER_VAL[r.tier] > R.TIER_VAL[m.tier] ? r : m; }, res[0]);
      var side = ST().tree.sides[b.side];
      return '<div class="tb-col tb-' + b.side + '"><div class="tb-name">' + esc(side[0]) + '</div><div class="tb-sub">' + esc(side[1]) + '</div>' +
        '<div class="tb-art">' + A.companion(def(), bi ? 'happy' : 'delighted', { stage: 3, cosmetics: [], path: bi ? 'gatherer' : 'wanderer' }) + '</div><div class="tb-gear">' + gearIcons(b.lo) + '</div>' +
        '<div class="tb-beats">' + res.map(function (r, i) { return '<div class="tb-beat t-' + r.tier + '"><span>' + statIc(r.stat) + ' ' + esc(sq.beats[i].name) + '</span><b>' + esc(tierName(r.tier)) + '</b></div>'; }).join('') + '</div>' +
        '<div class="tb-loot">' + (h.finds) + ' ' + esc(h.finds === 1 ? th().terms.find : th().terms.finds) + ' · ' + h.stars + ' ★' + (h.gear.length ? ' · ' + h.gear.map(function (g) { return R.ITEMS[g.id].icon; }).join(' ') : '') + '</div>' +
        '<p class="tb-page">“' + esc(fill(sq.beats[best.i].lines[2])) + '”</p></div>';
    }).join('');
    U.full('<div class="qr-wrap"><div class="qr-scroll"><div class="qr-kicker">' + sq.icon + ' ' + esc(sq.name) + '</div><div class="qr-title">Same ' + esc(th().terms.trip.toLowerCase()) + ', two builds</div>' +
      '<div class="qr-sub">Same companion, same level, same day. Only the fork and the gear are different.</div><div class="tb-cols">' + cols + '</div>' +
      '<p class="tb-foot">Both builds earn the same XP, and neither can fail. The build decides which beats shine, what comes home and how the page reads.</p></div>' +
      '<div class="qr-actions"><button class="btn btn-light" data-act="tb-read">📖 Read both pages</button><button class="btn btn-clear" data-act="ov-next">Close</button></div></div>', { bg: bg(), cls: 'qr-ov tb-ov' });
  }
  function twoPages() {
    var list = BUILDS.map(function (b) { var res = R.resolve('q1', { level: 14, nodes: { trail: true, scout: true, fork: true }, fork: b.side }, b.lo, 1); return { kind: 'journal', quest: 'q1', tiers: res.map(function (r) { return r.tier; }), gear: [], day: ST().tree.sides[b.side][0] }; });
    U.closeAll(); root.BookUI.open(list, 1, { journal: true, turnFrom: 0, onClose: twoBuilds, doneLabel: 'Back to the builds' });
  }

  /* ---------- the companion sheet ---------- */
  function companionScreen() {
    var s = S(), li = R.levelInfo(s.compLevel.xp), st = St.stage(), c = cs(), stats = R.stats(c, s.inventory.equipped), cm = th().camp;
    var next = E.nextGrowth(s.camp.total), treeOpen = st >= R.TREE_OPENS, sp = St.spFree();
    var statsHtml = R.STATS.map(function (k) { return '<div class="cp-stat"><span class="cs-ic">' + statIc(k) + '</span><span class="cs-v">' + stats[k] + '</span><span class="cs-l">' + esc(statName(k)) + '</span></div>'; }).join('');
    var slots = ['tool', 'garb', 'trinket'].map(function (sl) { var id = s.inventory.equipped[sl]; return '<button class="cp-slot ' + (id ? 'r-' + R.ITEMS[id].rarity : '') + '" data-act="cp-slot" data-slot="' + sl + '"><span class="cps-ic">' + (id ? R.ITEMS[id].icon : '＋') + '</span><span class="cps-t"><small>' + esc(ST().slots[sl]) + '</small>' + esc(id ? gTitle(id) : 'Empty') + (id ? '<small>' + esc(statLine(id)) + '</small>' : '') + '</span></button>'; }).join('');
    var pages = s.book.pages.length;
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Back</button><div class="title">' + esc(nm()) + '</div></div>' +
      '<section class="cp-hero"><div class="cp-art">' + A.companion(def(), 'happy', { aura: !!(root.CampUI && root.CampUI.aura()) }) + '</div>' +
      '<div class="cp-name">' + esc(title()) + '</div><div class="cp-stage">' + esc(cm.stages[st]) + (next ? ' · ' + next.daysLeft + ' day' + (next.daysLeft === 1 ? '' : 's') + ' of play to ' + esc(cm.stages[next.stage]) : ' · fully grown') + '</div>' +
      '<div class="cp-lv"><span class="lv-ring">Lv ' + li.level + '</span><div class="xpbar" aria-label="' + li.into + ' of ' + li.need + ' XP to level ' + (li.level + 1) + '"><i style="width:' + Math.round(100 * li.into / li.need) + '%"></i></div><span class="muted sm">' + li.into + ' / ' + li.need + '</span></div></section>' +
      '<div class="card"><h3>Stats</h3><div class="cp-stats">' + statsHtml + '</div><p class="muted sm">From level, skills and the gear below.</p></div>' +
      '<div class="card"><h3>Gear</h3><div class="cp-slots">' + slots + '</div><p class="muted sm">' + St.bag().length + ' pieces in the bag. Gear is never used up and never sold. “Get ready” on the board picks the best set for you.</p></div>' +
      '<div class="card"><div class="row"><div class="grow"><h3>' + esc(th().terms.bench) + '</h3><p>' + (root.Progress.benchOpen(s) ? 'Make ' + esc(nm()) + '’s gear stronger with spares.' : 'Opens on day ' + root.Progress.BENCH_DAY + ' of ' + esc(nm()) + '’s journey.') + '</p></div><button class="btn ' + (root.Progress.benchOpen(s) ? 'btn-dark' : 'btn-soft') + '" data-act="go" data-to="workbench">' + (root.Progress.benchOpen(s) ? 'Open' : 'Peek') + '</button></div></div>' +
      looksCard() +
      '<div class="card"><div class="row"><div class="grow"><h3>' + esc(ST().tree.name) + ' skills</h3><p>' + (treeOpen ? sp + ' point' + (sp === 1 ? '' : 's') + ' to spend' : 'The first skill tree opens at day ' + E.GROWTH[R.TREE_OPENS] + ' (' + esc(cm.stages[R.TREE_OPENS]) + '). ' + Math.max(0, E.GROWTH[R.TREE_OPENS] - s.camp.total) + ' days of play to go.') + '</p></div><button class="btn ' + (treeOpen ? 'btn-dark' : 'btn-soft') + '" data-act="go" data-to="tree">' + (treeOpen ? 'Open' : 'Peek') + '</button></div></div>' +
      '<div class="card"><div class="row"><div class="grow"><h3>📖 The Book</h3><p>' + pages + ' page' + (pages === 1 ? '' : 's') + ' so far, plus the ' + esc(ST().book.journal) + '.</p></div><button class="btn btn-soft" data-act="go" data-to="book">Read</button></div></div>' +
      '<div class="card"><h3>Where XP comes from</h3><ul class="cp-how"><li>Any honest answer on the same day: the same ' + R.XP.answerDay + ' XP a day, whatever the answer, however many medicines.</li><li>Feeding ' + esc(nm()) + ': ' + R.XP.feed + ' · the Daily Run: ' + R.XP.runBase + '–' + R.runXp(3) + ' · each ' + esc(th().terms.trip.toLowerCase()) + ': ' + R.XP.quest + ' · daily quests: ' + R.XP.daily + ' each.</li><li>No cap. Growing up comes from days played, so the bar never stops.</li></ul></div><div style="height:20px"></div>';
  }
  // v5.6: looks you own (Shop, Season Pass, crew banner). Looks only: no stats.
  function looksCard() {
    var s = S(), lk = s.looks || { owned: [], equipped: {} }, cat = root.Progress.CATALOG, own = (lk.owned || []).filter(function (id) { return /^look\./.test(id) || /^pass\.look/.test(id) || /^passx\./.test(id); });
    if (!own.length) return '';
    var name = function (id) { var it = cat.filter(function (x) { return x.id === id; })[0]; return it ? (it.names[s.theme] || it.names.expedition) : /^passx\./.test(id) ? 'Season Pass look ' + id.split('.')[1] : /^pass\.look/.test(id) ? 'Season look ' + (+id.slice(-1) + 1) : 'A look'; };
    return '<div class="card looks-card"><h3>Looks</h3>' + own.map(function (id) { var on = lk.equipped && lk.equipped.companion === id; return '<div class="row lk-row"><span class="grow">' + esc(name(id)) + '</span><button class="btn ' + (on ? 'btn-soft' : 'btn-dark') + '" data-act="look-wear" data-id="' + (on ? '' : id) + '">' + (on ? 'Wearing · Take off' : 'Wear') + '</button></div>'; }).join('') + '<p class="muted sm">Looks change how ' + esc(nm()) + ' looks. Nothing else.</p></div>';
  }
  function slotSheet(sl) {
    var s = S(), items = St.bag().filter(function (id) { return R.ITEMS[id].slot === sl; });
    U.sheet(ST().slots[sl], '<div class="opt-list"><button class="opt" data-act="cp-equip" data-slot="' + sl + '" data-id=""><span class="o-t">Nothing</span></button>' + items.map(function (id) { var it = R.ITEMS[id]; return '<button class="opt ' + (s.inventory.equipped[sl] === id ? 'on' : '') + '" data-act="cp-equip" data-slot="' + sl + '" data-id="' + id + '"><span style="font-size:1.8rem">' + it.icon + '</span><span><span class="o-t" style="display:block">' + esc(gTitle(id)) + '</span><span class="o-s">' + esc(statLine(id)) + ' · ' + rarTitle(it.rarity) + (it.perk ? ' · ' + esc(ST().perk) : '') + '</span></span></button>'; }).join('') + '</div>');
  }

  /* ---------- the Pathfinder tree ---------- */
  function nodeState(n) {
    var c = S().rpg;
    if (c.nodes[n.id]) return 'have';
    var ok = R.canLearn(c, n.id, St.stage(), St.spFree());
    return ok.ok ? 'open' : ok.why;
  }
  function nodeBtn(n) {
    var st = nodeState(n), t = ST().tree.nodes[n.id], f = n.id === 'fork' && S().rpg.nodes.fork ? ST().tree.sides[S().rpg.fork] : null;
    return '<button class="tr-node st-' + st + (n.fork ? ' fork' : '') + '" data-act="tr-node" data-id="' + n.id + '"><span class="tn-name">' + esc(f ? f[0] : t[0]) + '</span><span class="tn-eff">' + esc(f ? f[1] : t[1]) + '</span><span class="tn-cost">' + (st === 'have' ? '✓ learned' : n.locked ? 'later' : n.cost + ' pt' + (n.cost === 1 ? '' : 's')) + '</span></button>';
  }
  function treeScreen() {
    var s = S(), st = St.stage(), cm = th().camp, open = st >= R.TREE_OPENS, sp = St.spFree();
    var rows = [1, 2, 3, 4].map(function (tier) { return '<div class="tr-tier"><div class="tr-tl">' + (tier === 4 ? 'Top' : 'Tier ' + tier) + '</div><div class="tr-nodes">' + R.TREE.filter(function (n) { return n.tier === tier; }).map(nodeBtn).join('') + '</div></div>'; }).join('');
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Back</button><div class="title">' + esc(ST().tree.name) + '</div></div>' +
      '<div class="card tr-head"><div class="row"><div class="grow"><h3>' + esc(fill(ST().tree.blurb)) + '</h3><p>' + (open ? '<b>' + sp + '</b> point' + (sp === 1 ? '' : 's') + ' to spend. One point per level, one per growth stage.' : 'Opens at day ' + E.GROWTH[R.TREE_OPENS] + ' (' + esc(cm.stages[R.TREE_OPENS]) + '). Use Demo → “Skill tree” to jump there.') + '</p></div></div>' +
      (open && st < R.FORK_OPENS ? '<p class="muted sm">The fork opens at day ' + E.GROWTH[R.FORK_OPENS] + ' (' + esc(cm.stages[R.FORK_OPENS]) + ').</p>' : '') + '</div>' +
      '<div class="tr-tree">' + rows + '</div>' +
      '<div class="card"><div class="row"><div class="grow"><h3>See what a build does</h3><p>One ' + esc(th().terms.trip.toLowerCase()) + ', two different builds, side by side.</p></div><button class="btn btn-soft" data-act="two-builds">Compare</button></div></div><div style="height:20px"></div>';
  }
  var WHY = { tree: 'The tree opens at day ' + 21 + '.', stage: 'Opens at a later growth stage.', need: 'Spend more points in this tree first.', sp: 'Not enough points yet.', later: 'Comes later in the full game.', have: '' };
  function nodeSheet(id) {
    var n = R.node(id), t = ST().tree.nodes[id], st = nodeState(n), tier = St.regionTier(), c = cs();
    var body;
    if (n.fork && !S().rpg.nodes.fork) {
      body = '<p>' + esc(t[1]) + '</p><div class="fork-pick">' + n.fork.map(function (side) {
        var sd = ST().tree.sides[side], imp = R.nodeImpact(c, 'fork', side, St.bag(), tier);
        return '<div class="fp-card"><div class="fp-name">' + esc(sd[0]) + '</div><div class="fp-eff">' + esc(sd[1]) + '</div><div class="fp-imp"><b>Tomorrow:</b> ' + esc(impactText(imp)) + '</div>' +
          (st === 'open' ? '<button class="btn btn-dark btn-block" data-act="tr-learn" data-id="fork" data-side="' + side + '">Choose ' + esc(sd[0]) + '</button>' : '') + '</div>';
      }).join('') + '</div>' + (st !== 'open' ? '<p class="muted">' + esc(WHY[st] || '') + '</p>' : '') + '<p class="muted sm">A fork is either/or. The other side stays closed.</p>';
    } else {
      var f = n.fork ? ST().tree.sides[S().rpg.fork] : null, imp = st === 'have' || n.locked ? null : R.nodeImpact(c, id, null, St.bag(), tier);
      body = '<p style="font-weight:700">' + esc(f ? f[1] : t[1]) + '</p>' + (st === 'have' ? '<p class="chip ok" style="margin-top:10px">✓ Learned</p>' : n.locked ? '<p class="muted">' + esc(WHY.later) + '</p>' :
        '<div class="fp-imp" style="margin-top:12px"><b>Tomorrow on the board:</b> ' + esc(impactText(imp)) + '</div>' +
        (st === 'open' ? '<button class="btn btn-dark btn-block" style="margin-top:14px" data-act="tr-learn" data-id="' + id + '">Learn for ' + n.cost + ' point' + (n.cost === 1 ? '' : 's') + '</button>' : '<p class="muted" style="margin-top:10px">' + esc(WHY[st] || '') + '</p>'));
    }
    U.sheet(n.fork && S().rpg.nodes.fork ? ST().tree.sides[S().rpg.fork][0] : t[0], body, { sub: esc(ST().tree.name) + ' · tier ' + n.tier });
  }
  function learn(el) {
    var id = el.getAttribute('data-id'), side = el.getAttribute('data-side'), before = cs(), imp = R.nodeImpact(before, id, side, St.bag(), St.regionTier());
    var r = St.learnNode(id, side); if (!r.ok) { U.toast('Not yet. ' + esc(WHY[r.why] || '')); return; }
    U.closeAll(); root.App.render(); U.sfx('rare');
    var nmTxt = id === 'fork' ? ST().tree.sides[side][0] : ST().tree.nodes[id][0];
    var el2 = document.querySelector('.tr-node[data-id="' + id + '"]'); if (el2) U.burstAt(el2, { n: 30, spread: 90 });
    U.toast('Learned ' + esc(nmTxt) + '. ' + (imp ? 'Tomorrow: ' + esc(impactText(imp)) : ''), { ms: 4000 });
  }

  /* ---------- Epic / Legendary: choose 1 of 3 ---------- */
  function chooseScreen(chestId) {
    var c = S().chests.filter(function (x) { return x.id === chestId; })[0]; if (!c || !c.choose || c.picked) return;
    var lab = E.CHESTS[c.type].label;
    var cards = c.choose.map(function (id) {
      var it = R.ITEMS[id], imp = R.gearImpact(id, cs(), St.bag().concat([id]), St.regionTier());
      return '<button class="cc-card r-' + it.rarity + (ui.ccPick === id ? ' on' : '') + '" data-act="cc-pick" data-c="' + chestId + '" data-id="' + id + '"><span class="cc-ic">' + it.icon + '</span><span class="grow"><span class="cc-name">' + esc(gName(id)) + '</span><span class="cc-stat">' + esc(ST().slots[it.slot]) + ' · ' + esc(statLine(id)) + '</span>' + (it.perk ? '<span class="cc-perk">' + esc(ST().perk) + '</span>' : '') +
        '<span class="cc-imp">' + (imp ? '⬆ ' + esc(impactText(imp)) : 'Strongest on harder ' + esc(th().terms.trips.toLowerCase()) + ' later.') + '</span></span></button>';
    }).join('');
    U.full('<div class="qr-wrap"><div class="qr-scroll"><div class="qr-kicker">' + esc(lab) + ' ' + esc(th().terms.chest) + '</div><div class="qr-title">Choose 1 of 3</div>' +
      '<div class="qr-sub">No luck involved. None of these are pieces you already own. The other two may turn up later.</div><div class="cc-list">' + cards + '</div></div>' +
      '<div class="qr-actions"><button class="btn btn-light" data-act="cc-take" data-c="' + chestId + '" ' + (ui.ccPick ? '' : 'disabled style="opacity:.55"') + '>' + (ui.ccPick ? 'Take the ' + esc(gName(ui.ccPick)) : 'Tap one to choose') + '</button><button class="btn btn-clear" data-act="ov-next">Decide later</button></div></div>', { bg: c.type === 'legendary' ? 'legend-bg' : 'epic-bg', cls: 'qr-ov cc-ov' });
  }

  root.QuestUI = { tile: tile, board: board, openReturn: openReturn, unpack: unpack, twoBuilds: twoBuilds, chooseScreen: chooseScreen, impactText: impactText, gearSheet: gearSheet, recommended: recommended };
  root.App.screens.companion = companionScreen;
  root.App.screens.tree = treeScreen;
  function outSheet() {
    var s = S(), tr = s.trip, q = tr.quest || St.questForDest(tr.dest) || 'q1', gone = St.tripOvernight();
    var p = R.predict(q, tr.comp || cs(), tr.loadout || St.readyLoadout(q), tr.tier != null ? tr.tier : St.regionTier());
    U.sheet(nm() + '’s ' + th().terms.trip.toLowerCase(), '<p style="font-weight:800">' + esc(qName(q)) + '</p><div class="beat-row flat">' + p.map(function (r, i) { return beatChip(r, q, i); }).join('') + '</div>' +
      '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">🎒</span><div><div class="f-t">Gear</div><div class="f-s">' + gearIcons(tr.loadout) + (tr.packed ? ' · packed a ' + esc(th().powerUps[tr.packed.type].name) : '') + '</div></div></div>' +
      '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">🌙</span><div><div class="f-t">' + (gone ? 'Out now' : 'Leaves at 9:00 PM') + '</div><div class="f-s">Back around 6:00 AM, with a story and a haul.</div></div></div>' +
      '<p class="muted" style="font-weight:600;font-size:.88rem">Gear and skills decide how it goes. It never fails.</p>');
  }
  Object.assign(root.App.acts, {
    'quest-out': function () { outSheet(); },
    'look-wear': function (el) { St.equipLook(el.getAttribute('data-id') || null); root.App.render(); U.toast(el.getAttribute('data-id') ? esc(nm()) + ' is wearing it.' : 'Back to the usual look.'); },
    'trip-send': function () { board(); },
    'trip-go': function (el) { send(St.questForDest(el.getAttribute('data-d')) || 'q1'); },
    'trip-open': openReturn, 'trip-unpack': unpack, 'qr-page': turnPage,
    'qs-send': function (el) { send(el.getAttribute('data-q')); },
    'qs-gear': function (el) { gearSheet(el.getAttribute('data-q')); },
    'qs-pack': function (el) { ui.pack = el.getAttribute('data-k') || null; refreshSheet(ui.gq && document.querySelector('.gs-preview') ? gearBody() : boardBody()); },
    'qs-equip': function (el) { ui.lo[el.getAttribute('data-slot')] = el.getAttribute('data-id') || null; refreshSheet(gearBody()); U.sfx('tap'); },
    'qs-ready': function () { ui.lo = Object.assign({}, St.readyLoadout(ui.gq)); refreshSheet(gearBody()); },
    'qs-send-manual': function () { var q = ui.gq; send(q, Object.assign({}, ui.lo)); ui.gq = null; },
    'two-builds': function () { U.closeAll(); twoBuilds(); }, 'tb-read': twoPages,
    'cp-slot': function (el) { slotSheet(el.getAttribute('data-slot')); },
    'cp-equip': function (el) { St.equip(el.getAttribute('data-slot'), el.getAttribute('data-id') || null); U.closeAll(); root.App.render(); },
    'tr-node': function (el) { nodeSheet(el.getAttribute('data-id')); }, 'tr-learn': learn,
    'cc-open': function (el) { var id = el.getAttribute('data-c'); U.closeAll(); ui.ccPick = null; chooseScreen(id); },
    'cc-pick': function (el) { ui.ccPick = el.getAttribute('data-id'); var id = el.getAttribute('data-c'); U.closeAll(); chooseScreen(id); U.sfx('tap'); },
    'cc-take': function (el) {
      var id = el.getAttribute('data-c'), pick = ui.ccPick; if (!pick) return;
      var r = St.pickChestGear(id, pick); ui.ccPick = null; U.closeAll(); root.App.render();
      if (r) { U.sfx('rare'); U.toast('🎉 ' + esc(gName(pick)) + ' is yours. Find it in ' + esc(nm()) + '’s gear.', { ms: 3500 }); }
    }
  });
})(window);
