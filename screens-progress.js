/* Kindling v5.6 Part B — screens-progress.js : Combine (and Shiny, Fill gaps) in the Field Guide, the Workbench, and the
 * "Look for" line on the quest board. Rules live in progress.js; this file only shows them. Dose-blind throughout. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, R = root.RPG, P = root.Progress, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  function ST() { return root.Story.T(S().theme); }
  function nm() { return S().comp.name; }
  function cap(r) { return r.charAt(0).toUpperCase() + r.slice(1); }
  function fname(id) { return Th.findArt(th(), id).name; }
  function setName(set) { return th().sets[set - 1].name; }
  function gName(id) { return ST().gear[id]; }
  function statName(k) { return ST().stats[k][0]; }
  function bench() { return th().terms.bench || 'Workbench'; }
  function refresh(html) { var t = U.topOverlay(); var b = t && t.el.querySelector('.sh-body'); if (b) { b.innerHTML = html; var f = b.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } } }
  var ui = { set: 1, rarity: null, out: null, pend: null, item: null, take: null };

  /* ---------- Field Guide: set header pieces ---------- */
  function setHeader(set) {
    var n = P.readyCount(S(), set);
    return '<button type="button" class="btn btn-soft cmb-btn" data-act="cmb-open" data-set="' + set + '">' + (n ? 'Combine (' + n + ' ready)' : 'Combine') + '</button>';
  }
  function cellExtras(id) { var s = S(), out = ''; if (s.shiny && s.shiny[id]) out += '<span class="shiny-tag" aria-label="Shiny">✦</span>'; if (s.found && s.found[id] && !(s.owned[id] > 0)) out += '<span class="kept0">0 kept</span>'; return out; }

  /* ---------- the Combine sheet ---------- */
  function fillPlan() { return P.fillGapsPlan(S()); }
  function combineBody(set) {
    var s = S(), plan = fillPlan(), rows = '';
    ['common', 'uncommon', 'rare'].forEach(function (r) {
      var o = P.combineOptions(s, set, r), left = 3 - (o.spareTotal % 3);
      rows += '<div class="cmb-row"><span class="grow"><b>' + cap(r) + ' spares: ' + o.spareTotal + '</b></span>' +
        (o.canMake ? '<button type="button" class="btn btn-dark cmb-make" data-act="cmb-pick" data-set="' + set + '" data-r="' + r + '">Make 1 ' + cap(o.next) + '</button>'
          : withLast(set, r) >= 3 ? '<span class="cmb-more-col"><span class="muted cmb-more">' + left + ' more to go</span><button type="button" class="ie-link cmb-lastlink" data-act="cmb-pick" data-set="' + set + '" data-r="' + r + '" aria-label="Make 1 ' + cap(o.next) + ' using a last copy">Use a last copy</button></span>'
          : '<span class="muted cmb-more">' + left + ' more to go</span>') + '</div>';
    });
    var sh = P.shinyOptions(s, set);
    rows += '<div class="cmb-row"><span class="grow"><b>Epic spares: ' + sh.spareTotal + '</b></span>' + (sh.can && sh.targets.length ? '<button type="button" class="btn btn-dark cmb-make" data-act="cmb-shiny" data-set="' + set + '">Make it shine</button>' : '<span class="muted cmb-more">' + (3 - sh.spareTotal % 3) + ' more to go</span>') + '</div>';
    var locked = P.idsIn(set).filter(function (id) { return s.fuel && s.fuel[id] && s.owned[id] === 1; });
    return '<p class="cmb-line">3 spares make 1 of the next kind up. You pick which one.</p>' +
      (plan.length ? '<button type="button" class="btn btn-cta btn-block cmb-fill" data-act="cmb-fill">Fill gaps</button>' : '') +
      '<div class="cmb-rows">' + rows + '</div>' +
      (locked.length ? '<p class="muted sm cmb-locked">' + locked.map(function (id) { return esc(fname(id)) + ': Kept: from a power-up'; }).join(' · ') + '</p>' : '') +
      '<p class="muted sm">Your first copy always stays. Spares are extra copies.</p>';
  }
  // Spares plus last copies you could choose to use (never a locked power-up copy).
  function withLast(set, r) { var s = S(); return P.idsIn(set, r).reduce(function (a, id) { return a + P.usable(s, id, true); }, 0); }
  function openCombine(set) { ui.set = set; U.sheet('Combine', combineBody(set), { sub: esc(setName(set)) + ' · ' + P.setFound(S(), set) + ' of 9 found' }); }
  function pickBody(set, r) {
    var s = S(), o = P.combineOptions(s, set, r);
    return '<p class="cmb-line">Make which one?</p><div class="opt-list">' + o.outputs.map(function (x) {
      var a = Th.findArt(th(), x.id);
      return '<button type="button" class="opt' + (ui.out === x.id ? ' on' : '') + '" data-act="cmb-out" data-id="' + x.id + '"><span class="find-mini" style="width:36px;height:36px">' + a.icon + '</span><span><span class="o-t" style="display:block">' + esc(a.name) + '</span><span class="o-s">' + cap(o.next) + (x.isNew ? ' · <b class="new-tag">New for you</b>' : ' · you have ' + (s.owned[x.id] || 0)) + '</span></span></button>';
    }).join('') + '</div><button type="button" class="btn btn-dark btn-block" style="margin-top:12px" data-act="cmb-go" ' + (ui.out ? '' : 'disabled') + '>Combine 3 into 1</button>';
  }
  function doCombine(confirmLast) {
    var s = S(), set = ui.set, r = ui.rarity, take = P.defaultTake(s, P.idsIn(set, r), 3), last = null;
    if (!take) { // not enough spares: a last copy (never a power-up one) can complete it, with a confirm
      take = {}; var need = 3, lasts = [];
      P.idsIn(set, r).forEach(function (id) { var sp = P.spares(s, id); if (sp > 0 && need > 0) { var k = Math.min(sp, need); take[id] = k; need -= k; } });
      P.idsIn(set, r).forEach(function (id) { if (need > 0 && s.owned[id] > 0 && !(s.fuel && s.fuel[id]) && P.spares(s, id) === 0) { take[id] = 1; need--; lasts.push(id); } });
      if (need > 0) { U.toast('3 spares are needed.'); return; }
      // QA P2-1: say exactly what it will use
      if (!confirmLast) { ui.pend = take; var nmz = lasts.map(function (x) { return esc(fname(x)); }), list = nmz.length === 1 ? nmz[0] : nmz.slice(0, -1).join(', ') + ' and ' + nmz[nmz.length - 1];
        refresh('<p class="cmb-confirm">' + (lasts.length === 1 ? 'This uses your one ' + list + '. It stays found in your ' + esc(th().terms.album) + ' either way. Use it?' : 'This uses your last ' + list + ' (' + lasts.length + ' copies). They stay found in your ' + esc(th().terms.album) + ' either way. Use them?') + '</p><div class="btn-row"><button class="btn btn-dark" data-act="cmb-last-yes">' + (lasts.length === 1 ? 'Use it' : 'Use them') + '</button><button class="btn btn-ghost" data-act="cmb-last-no">' + (lasts.length === 1 ? 'Keep it' : 'Keep them') + '</button></div>'); return; }
      take = ui.pend;
    }
    var found0 = P.setFound(s, set), spOut0 = ui.out ? P.spares(s, ui.out) : 0;
    var res = St.combine({ set: set, rarity: r, take: take, output: ui.out, confirmLast: !!confirmLast });
    if (!res.ok) { U.toast(res.why === 'locked' ? 'That one is kept: it came from a power-up.' : 'Not yet: 3 spares are needed.'); return; }
    U.sfx('reveal'); root.App.render();
    resultSheet((res.isNew ? 'New: ' : 'You made ') + fname(res.made) + '!', res.isNew ? 'Added to your ' + th().terms.album + '.' : (P.spares(S(), res.made) > spOut0 ? 'One more spare.' : 'Yours to keep.'), set, res.made, false, found0 < 9 && P.setFound(S(), set) === 9);
  }
  // done = this combine just completed the set (shown once, never again for an already-complete set)
  function resultSheet(title, line, set, id, shiny, done) {
    var a = Th.findArt(th(), id), crew = S().crew && St.crewOn();
    var share = crew && (shiny || done) ? '<button class="btn btn-soft btn-block" data-act="crew-share" data-kind="' + (shiny ? 'shiny' : 'set') + '" data-t="' + esc(shiny ? 'got a Shiny ' + fname(id) + '!' : 'finished the ' + setName(set) + ' set!') + '">Share with ' + esc((th().terms.crew || 'crew').toLowerCase()) + '</button>' : '';
    refresh('<div class="cmb-res"><div class="big-item cmb-big' + (shiny ? ' shiny' : '') + '">' + a.icon + '</div><h3>' + esc(title) + '</h3><p>' + esc(line) + '</p>' + (done && !shiny ? '<p class="muted sm">' + esc(setName(set)) + ' set complete: a trophy and a title.</p>' : '') + '</div>' + share +
      '<button class="btn btn-dark btn-block" data-act="sheet-close">Done</button><button class="btn btn-ghost btn-block" data-act="cmb-back" data-set="' + set + '">Combine more</button>');
    var bi = document.querySelector('.cmb-big'); if (bi) U.burstAt(bi, { n: 30, spread: 110 });
  }
  function shinyBody(set) {
    var o = P.shinyOptions(S(), set);
    return '<p class="cmb-line">3 Epic spares make any ' + esc(setName(set)) + ' ' + esc(th().terms.find.toLowerCase()) + ' Shiny. Just for looks.</p><div class="opt-list">' + o.targets.map(function (id) { var a = Th.findArt(th(), id); return '<button type="button" class="opt' + (ui.out === id ? ' on' : '') + '" data-act="cmb-shiny-pick" data-id="' + id + '"><span class="find-mini" style="width:36px;height:36px">' + a.icon + '</span><span class="o-t">' + esc(a.name) + '</span></button>'; }).join('') + '</div>' +
      '<button type="button" class="btn btn-dark btn-block" style="margin-top:12px" data-act="cmb-shiny-go" ' + (ui.out ? '' : 'disabled') + '>Make it shine</button>';
  }
  function fillPreview() {
    var plan = fillPlan(); if (!plan.length) return;
    refresh('<p class="cmb-confirm">This makes: ' + plan.map(function (p) { return esc(fname(p.output)) + ' (' + cap(E.FIND_BY_ID[p.output].rarity) + ')'; }).join(', ') + '. Your first copies stay.</p><div class="btn-row"><button class="btn btn-dark" data-act="cmb-fill-go">Do it</button><button class="btn btn-ghost" data-act="cmb-back" data-set="' + ui.set + '">Not now</button></div>');
  }

  /* ---------- the Workbench ---------- */
  function shortBy(id) { var s = S(), c = P.upgradeCost(id, P.plusOf(s, id)); return c ? Math.max(0, c.n - P.sparesOfRarity(s, c.rarity)) : 0; }
  function canUp(id) { return P.benchOpen(S()) && !!P.upgradeCost(id, P.plusOf(S(), id)) && shortBy(id) === 0; }
  function gearRow(id) {
    var it = R.ITEMS[id], p = P.plusOf(S(), id), eq = Object.keys(S().inventory.equipped).some(function (k) { return S().inventory.equipped[k] === id; }), c = P.upgradeCost(id, p), sh = shortBy(id);
    return '<div class="wb-row r-' + it.rarity + '"><span class="wb-ic">' + it.icon + '</span><span class="grow"><span class="wb-n">' + esc(gName(id)) + ' +' + p + (eq ? ' <span class="chip ok wb-eq">Equipped</span>' : '') + '</span><span class="wb-s">' + esc(statName(it.stat)) + ' ' + (it.amt + p - 1) + ' · ' + cap(it.rarity) + '</span></span>' +
      (!c ? '<span class="chip ok">Fully upgraded</span>' : sh ? '<span class="muted wb-need">' + sh + ' more ' + cap(c.rarity) + ' spare' + (sh === 1 ? '' : 's') + '</span>' : '<button class="btn btn-dark" data-act="wb-up" data-id="' + id + '">Upgrade</button>') + '</div>';
  }
  function benchScreen() {
    var s = S(), open = P.benchOpen(s), bag = s.inventory.bag.slice(), eq = s.inventory.equipped;
    bag.sort(function (a, b) { var ra = canUp(a) ? 0 : 1, rb = canUp(b) ? 0 : 1; if (ra !== rb) return ra - rb; var ea = [eq.tool, eq.garb, eq.trinket].indexOf(a) >= 0 ? 0 : 1, eb = [eq.tool, eq.garb, eq.trinket].indexOf(b) >= 0 ? 0 : 1; return ea - eb; }); // ready first, then equipped
    var spareLine = P.RAR.map(function (r) { return cap(r) + ' ' + P.sparesOfRarity(s, r); }).join(' · '), ready = bag.filter(canUp);
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Back</button><div class="title">' + esc(bench()) + '</div></div>' +
      '<div class="page-h"><h1 style="font-size:1.6rem">' + esc(bench()) + '</h1><p>Make ' + esc(nm()) + '’s gear stronger.</p></div>' +
      (open ? '<div class="card wb-spares"><b>Your spares</b><p>' + spareLine + '</p>' + (ready.length ? '<p class="wb-ready"><b>Ready to upgrade:</b> ' + ready.map(function (id) { return esc(gName(id)); }).join(', ') + '</p>' : '') + '<p class="muted sm">Upgrades use spares of the gear’s kind. Never Stars, never your first copies.</p></div><div class="card wb-list">' + bag.map(gearRow).join('') + '</div>'
        : '<div class="card"><h3>Opens on day ' + P.BENCH_DAY + ' of ' + esc(nm()) + '’s journey.</h3><p>' + Math.max(0, P.BENCH_DAY - P.journeyDay(s)) + ' days of play to go. Until then, a second copy of gear makes yours +2 by itself.</p></div><div class="card wb-list">' + bag.map(function (id) { var it = R.ITEMS[id]; return '<div class="wb-row r-' + it.rarity + '"><span class="wb-ic">' + it.icon + '</span><span class="grow"><span class="wb-n">' + esc(gName(id)) + ' +' + P.plusOf(s, id) + '</span><span class="wb-s">' + esc(statName(it.stat)) + ' ' + (it.amt + P.plusOf(s, id) - 1) + ' · ' + cap(it.rarity) + '</span></span></div>'; }).join('') + '</div>') +
      '<div style="height:20px"></div>';
  }
  // What one more level changes on tomorrow's board (first tier upgrade), else "Helps on harder quests later."
  function upImpact(id) {
    var c = St.compState(), after = JSON.parse(JSON.stringify(c)), tier = St.regionTier(), bag = St.bag();
    after.plus[id] = P.plusOf(S(), id) + 1;
    for (var qi = 0; qi < R.QUESTS.length; qi++) {
      var q = R.QUESTS[qi], a = R.predict(q, c, R.bestLoadout(q, c, bag, tier), tier), b = R.predict(q, after, R.bestLoadout(q, after, bag, tier), tier);
      for (var i = 0; i < a.length; i++) if (a[i].tier && b[i].tier && R.TIER_VAL[b[i].tier] > R.TIER_VAL[a[i].tier]) return ST().quests[q.id].name + ': ' + statName(a[i].stat) + ' ' + ST().tiers[a[i].tier] + ' → ' + ST().tiers[b[i].tier];
    }
    return 'Helps on harder ' + th().terms.trips.toLowerCase() + ' later.';
  }
  function upBody(id, take) {
    var s = S(), it = R.ITEMS[id], p = P.plusOf(s, id), c = P.upgradeCost(id, p), have = P.sparesOfRarity(s, c.rarity);
    var head = '<p class="wb-h"><b>' + esc(gName(id)) + ' +' + p + ' → +' + (p + 1) + '</b></p><p>' + esc(statName(it.stat)) + ' ' + (it.amt + p - 1) + ' → ' + (it.amt + p) + '</p><p class="wb-imp">' + esc(upImpact(id)) + '</p>';
    if (have < c.n) return head + '<p class="wb-short">' + (c.n - have) + ' more ' + cap(c.rarity) + ' spare' + (c.n - have === 1 ? '' : 's') + ' to go. ' + cap(c.rarity) + ' spares come from games, ' + esc(th().terms.trips.toLowerCase()) + ' and chests.</p>';
    return head + '<p class="wb-cost">Uses ' + c.n + ' ' + cap(c.rarity) + ' spare' + (c.n === 1 ? '' : 's') + (take ? ': ' + Object.keys(take).map(function (k) { return take[k] + ' ' + esc(fname(k)); }).join(', ') : '') + '</p>' +
      '<div class="btn-row"><button class="btn btn-dark" data-act="wb-go" data-id="' + id + '">Upgrade</button><button class="btn btn-ghost" data-act="wb-choose" data-id="' + id + '">Choose spares</button></div>';
  }
  function chooseBody(id) {
    var s = S(), c = P.upgradeCost(id, P.plusOf(s, id)), take = ui.take || {}, sum = Object.keys(take).reduce(function (a, k) { return a + take[k]; }, 0);
    var list = E.FINDS.filter(function (f) { return f.rarity === c.rarity && P.spares(s, f.id) > 0; });
    return '<p class="cmb-line">Pick ' + c.n + ' ' + cap(c.rarity) + ' spares (' + sum + ' of ' + c.n + ').</p><div class="opt-list">' + list.map(function (f) { var n = take[f.id] || 0, sp = P.spares(s, f.id); return '<div class="opt wb-pick"><span class="find-mini" style="width:32px;height:32px">' + Th.findArt(th(), f.id).icon + '</span><span class="grow"><span class="o-t" style="display:block">' + esc(fname(f.id)) + '</span><span class="o-s">' + sp + ' spare' + (sp === 1 ? '' : 's') + '</span></span><button class="btn btn-ghost wb-step" data-act="wb-take" data-f="' + f.id + '" data-d="-1" aria-label="One fewer ' + esc(fname(f.id)) + '">−</button><b class="wb-n2">' + n + '</b><button class="btn btn-ghost wb-step" data-act="wb-take" data-f="' + f.id + '" data-d="1" aria-label="One more ' + esc(fname(f.id)) + '">+</button></div>'; }).join('') + '</div>' +
      '<button class="btn btn-dark btn-block" style="margin-top:12px" data-act="wb-go-take" data-id="' + id + '" ' + (sum === c.n ? '' : 'disabled') + '>Use these</button>';
  }
  function doUpgrade(id, take) {
    var r = St.upgradeGear(id, take); if (!r.ok) { U.toast(r.why === 'short' ? 'Not enough spares yet.' : 'Not yet.'); return; }
    U.closeAll(); root.App.render(); U.sfx('rare'); U.toast(esc(gName(id)) + ' is now +' + r.plus + '!');
  }

  /* ---------- "Look for" (quest board) ---------- */
  function lookForRow() {
    var cur = (S().quest && S().quest.lookFor) || 'any';
    var help = { any: 'A mix of everything.', gear: 'More gear. Copies make your gear stronger.', specimens: 'More ' + th().terms.finds.toLowerCase().replace(/^seeds & /, '') + ' from where ' + nm() + ' goes, 2 at a time.' };
    return '<div class="lf-row"><div class="lf-h">' + esc(nm()) + ' will look for:</div><div class="lf-chips" role="radiogroup" aria-label="' + esc(nm()) + ' will look for">' +
      [['any', 'Anything'], ['gear', 'Gear'], ['specimens', th().terms.finds.replace(/^Seeds & /, '')]].map(function (x) { return '<button type="button" role="radio" aria-checked="' + (cur === x[0]) + '" class="pk-chip lf-chip' + (cur === x[0] ? ' on' : '') + '" data-act="lf-pick" data-v="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') +
      '</div><p class="muted sm lf-help">' + esc(help[cur]) + '</p></div>';
  }

  /* "Ready for you" (UX fix 1): at most 2 rows, in priority order. Empty -> nothing shown. */
  function readyRows() {
    var s = S(), rows = [], plan = P.fillGapsPlan(s), tm = th();
    if (plan.length) { var bySet = {}; plan.forEach(function (p) { bySet[p.set] = (bySet[p.set] || 0) + 1; }); var st = +Object.keys(bySet).sort(function (a, b) { return bySet[b] - bySet[a]; })[0]; rows.push({ act: 'ready-fill', set: st, text: 'Make ' + bySet[st] + ' new ' + setName(st) + ' ' + (bySet[st] === 1 ? tm.terms.find.toLowerCase() : tm.terms.finds.toLowerCase().replace(/^seeds & /, '')) }); }
    else { for (var set = 1; set <= 4; set++) { var n = 0; ['common', 'uncommon', 'rare'].forEach(function (r) { n += Math.floor(P.spareTotal(s, set, r) / 3) * 3; }); if (n) { rows.push({ act: 'cmb-open', set: set, text: 'Combine ' + n + ' ' + setName(set) + ' spares' }); break; } } }
    if (P.benchOpen(s)) { var up = s.inventory.bag.filter(canUp)[0]; if (up) rows.push({ act: 'wb-up', id: up, text: gName(up) + ' can go to +' + (P.plusOf(s, up) + 1) }); }
    if (s.crew && St.crewOn()) { var cl = P.crewClaimable(s, s.day); if (cl) rows.push({ go: 'crew', text: (tm.terms.crew || 'Crew') + ' reward ready: pick ' + (P.TIER_REWARD[cl.tier].rarity === 'rare' ? 'a Rare' : 'an Uncommon') + ' ' + tm.terms.find.toLowerCase() }); else if (s.crew.gifts.inbox.length) rows.push({ go: 'crew', text: 'Gift waiting from ' + s.crew.gifts.inbox[0].from }); }
    return rows.slice(0, 2);
  }
  function readyCard() {
    var rows = readyRows(); if (!rows.length) return '';
    return '<section class="ready-card" aria-label="Ready for you"><h3>Ready for you</h3>' + rows.map(function (r) {
      var a = r.go ? 'data-act="go" data-to="' + r.go + '"' : 'data-act="' + r.act + '"' + (r.set ? ' data-set="' + r.set + '"' : '') + (r.id ? ' data-id="' + r.id + '"' : '');
      return '<button type="button" class="ready-row" ' + a + '><span class="grow">' + esc(r.text) + '</span>' + A.icon('chev') + '</button>';
    }).join('') + '</section>';
  }
  function anyReady() { var s = S(); for (var set = 1; set <= 4; set++) if (P.readyCount(s, set)) return true; return false; }
  root.ProgressUI = { readyRows: readyRows, readyCard: readyCard, anyReady: anyReady, setHeader: setHeader, cellExtras: cellExtras, openCombine: openCombine, lookForRow: lookForRow, benchScreen: benchScreen, upImpact: upImpact };
  root.App.screens.workbench = benchScreen;
  Object.assign(root.App.acts, {
    'cmb-open': function (el) { ui.out = null; openCombine(+el.getAttribute('data-set')); },
    'cmb-back': function (el) { ui.out = null; ui.set = +el.getAttribute('data-set') || ui.set; refresh(combineBody(ui.set)); },
    'cmb-pick': function (el) { ui.rarity = el.getAttribute('data-r'); ui.out = null; refresh(pickBody(ui.set, ui.rarity)); },
    'cmb-out': function (el) { ui.out = el.getAttribute('data-id'); refresh(pickBody(ui.set, ui.rarity)); },
    'cmb-go': function () { if (ui.out) doCombine(false); },
    'cmb-last-yes': function () { doCombine(true); },
    'cmb-last-no': function () { ui.pend = null; refresh(combineBody(ui.set)); },
    'cmb-fill': fillPreview,
    'ready-fill': function (el) { ui.out = null; openCombine(+el.getAttribute('data-set')); fillPreview(); },
    'cmb-fill-go': function () { var made = St.fillGaps(); root.App.render(); U.sfx('reveal'); if (made.length) { refresh('<div class="cmb-res"><h3>New: ' + made.map(function (id) { return esc(fname(id)); }).join(', ') + '!</h3><p>Added to your ' + esc(th().terms.album) + '.</p></div><button class="btn btn-dark btn-block" data-act="sheet-close">Done</button><button class="btn btn-ghost btn-block" data-act="cmb-back" data-set="' + ui.set + '">Combine more</button>'); } else refresh(combineBody(ui.set)); },
    'cmb-shiny': function (el) { ui.set = +el.getAttribute('data-set'); ui.out = null; refresh(shinyBody(ui.set)); },
    'cmb-shiny-pick': function (el) { ui.out = el.getAttribute('data-id'); refresh(shinyBody(ui.set)); },
    'cmb-shiny-go': function () { var r = St.makeShiny({ set: ui.set, target: ui.out }); if (!r.ok) { U.toast('3 Epic spares are needed.'); return; } root.App.render(); U.sfx('rare'); resultSheet('Your ' + fname(r.target) + ' is Shiny!', 'Just for looks. It shines in your ' + th().terms.album + '.', ui.set, r.target, true); },
    'wb-up': function (el) { var id = el.getAttribute('data-id'); ui.item = id; ui.take = null; U.sheet('Upgrade', upBody(id), { sub: esc(ST().slots[R.ITEMS[id].slot]) }); },
    'wb-go': function (el) { doUpgrade(el.getAttribute('data-id')); },
    'wb-choose': function (el) { ui.take = {}; refresh(chooseBody(el.getAttribute('data-id'))); },
    'wb-take': function (el) { var f = el.getAttribute('data-f'), d = +el.getAttribute('data-d'), c = P.upgradeCost(ui.item, P.plusOf(S(), ui.item)), sum = Object.keys(ui.take).reduce(function (a, k) { return a + ui.take[k]; }, 0); var n = (ui.take[f] || 0) + d; if (n < 0 || n > P.spares(S(), f) || (d > 0 && sum >= c.n)) return; ui.take[f] = n; if (!n) delete ui.take[f]; refresh(chooseBody(ui.item)); },
    'wb-go-take': function (el) { doUpgrade(el.getAttribute('data-id'), ui.take); },
    'lf-pick': function (el) { St.setLookFor(el.getAttribute('data-v')); var row = document.querySelector('.lf-row'); if (row) row.outerHTML = lookForRow(); }
  });
})(window);
