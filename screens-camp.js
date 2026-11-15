/* Kindling v5.3 — screens-camp.js : the Campfire (Expedition) / Garden days (Grove) daily-visit count, feeding, growth, rest mode.
 * Lit by one play action a day (any daily game, or Feed). Doses never light it, break it or appear in its copy.
 * No red, no sad companion, no "lost". Kid profiles never see it. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  function cm() { return th().camp; }
  function she() { return S().comp.name; }
  function compDef() { return Th.companionDef(th(), S().comp.species); }
  function on() { return St.campOn() && !!S().today; }
  function camp() { return S().camp; }
  function lit() { return E.campLitOn(camp(), S().day); }
  function resting() { return E.campResting(camp(), S().day); }
  function days(n) { return n + ' day' + (n === 1 ? '' : 's'); }
  function pick(arr) { return arr[(S().day + camp().total) % arr.length]; }
  function stageName(i) { return cm().stages[i]; }
  function aName(n) { return (/^[AEIOU]/i.test(n) ? 'an ' : 'a ') + n; }
  function aura() { return on() && camp().count >= 7; }

  /* ---------- top bar chip ---------- */
  function chip() {
    if (!on()) return '';
    var c = camp(), t = cm(), state = resting() ? 'rest' : lit() ? 'lit' : 'unlit';
    var label = resting() ? t.name + ' ' + t.is + ' resting' : c.count ? t.dayLabel(c.count) + (lit() ? '. ' + t.lit + '.' : '. Not counted yet today.') : t.start;
    return '<button class="camp-chip ' + state + '" data-act="camp-sheet" aria-label="' + esc(label) + '"><span class="cc-ic" aria-hidden="true">' + t.icon + '</span>' + '<b>' + c.count + '</b>' + '</button>';
  }

  /* ---------- relight progress ---------- */
  function relightHtml() {
    var off = E.relightOffer(camp(), S().day); if (!off) return '';
    var t = S().today, t1 = !!(t.run || t.gameDone), t2 = t.relightPractice > 0 && t1, tm = th(), c = cm();
    return '<div class="relight"><div class="rl-h">' + esc(c.relightLabel(off.prev)) + '</div>' +
      '<div class="rl-step ' + (t1 ? 'done' : '') + '"><span>' + (t1 ? '✓' : '○') + '</span>Finish one of today’s games</div>' +
      '<div class="rl-step ' + (t2 ? 'done' : '') + '"><span>' + (t2 ? '✓' : '○') + '</span>Play 1 practice board' + (t1 ? '' : ' after that') + '</div>' +
      '<div class="rl-sub">Free. Open until ' + esc(E.fmtDate(off.until)) + '.</div>' +
      (t1 && !t2 ? '<button class="btn btn-tile" data-act="game-intro" data-g="trail" data-practice="1">Practice board</button>' : '') + '</div>';
  }
  function noteLine() {
    var n = S().flags.campNote, c = cm();
    if (n && n.type === 'shield' && n.day === S().day && !lit()) return '<div class="camp-note">' + c.shieldIcon + ' A ' + esc(c.shield.toLowerCase()) + ' kept your ' + esc(c.name) + ' going yesterday.</div>';
    return '';
  }
  function feedBtn(cls) {
    var t = S().today, c = cm();
    if (t.fed) return '<span class="camp-fed">✓ ' + esc(she()) + ' had a treat</span>';
    return '<button class="btn ' + (cls || 'btn-tile') + '" data-act="camp-feed" id="feedBtn">' + c.treatIcon + ' Feed ' + esc(she()) + '</button>';
  }

  /* ---------- Today tile (full view) ---------- */
  function tile() {
    if (!on()) return '';
    var c = camp(), t = cm(), title, body;
    if (resting()) { title = t.icon + ' Resting until ' + E.fmtDate(c.rest.until); body = 'Your ' + t.name + ' ' + t.is + ' paused. Nothing to do. Play anytime if you like.'; }
    else if (lit()) { title = 'Day ' + c.count + ' ' + t.icon; body = t.lit + '. See you tomorrow.'; }
    else if (c.count) { title = 'Day ' + c.count + ' ' + t.icon; body = 'Feed ' + she() + ' or play any daily game to ' + t.today + '.'; }
    else if (c.best) { title = t.ready; body = 'Best ever: ' + days(c.best) + '. Finish any daily game or feed ' + she() + ' to start.'; }
    else { title = t.start; body = 'Feed ' + she() + ' or play any daily game once a day. It grows each day you visit.'; }
    var g = St.growth(), nx = E.nextMilestone(c);
    var meta = '<div class="camp-meta"><span>' + esc(she()) + ' · ' + esc(stageName(g.stage)) + (g.next ? ' · ' + days(g.next.daysLeft) + ' to ' + esc(stageName(g.next.stage)) : '') + '</span>' +
      (nx && !resting() ? '<span>Next: day ' + nx.n + ' · ' + esc(E.CHESTS[nx.chest].label) + ' ' + esc(th().terms.chest.toLowerCase()) + '</span>' : '') + '</div>';
    return '<section class="tile camp ' + (lit() ? 'is-lit' : '') + '" aria-label="' + esc(t.name) + '"><div class="deco">' + t.icon + '</div>' +
      '<div class="t-kicker">' + esc(t.name) + (c.best ? ' · best ' + c.best : '') + '</div><div class="t-title">' + esc(title) + '</div>' +
      '<div class="t-body">' + esc(body) + '</div>' + noteLine() + relightHtml() + meta +
      '<div class="t-row">' + feedBtn() + '<button class="btn btn-tile-2" data-act="camp-sheet">Details</button></div></section>';
  }

  /* ---------- Simple view: one line, one tap ---------- */
  function simpleLine() {
    if (!on()) return '';
    var c = camp(), t = cm(), line;
    if (resting()) line = 'Resting until ' + E.fmtDate(c.rest.until);
    else if (c.count) line = days(c.count) + ' in a row';
    else line = 'Feed ' + she() + ' to start';
    return '<div class="card camp-line"><button class="cl-main" data-act="camp-sheet"><span>' + esc(line) + ' <span class="cl-ic" aria-hidden="true">' + t.icon + '</span></span></button>' + feedBtn('btn-soft') + '</div>' + (E.relightOffer(c, S().day) ? '<div class="card">' + relightHtml() + '</div>' : '');
  }

  /* ---------- Campfire sheet ---------- */
  function sheet() {
    var s = S(), c = camp(), t = cm(), g = St.growth(), nx = E.nextMilestone(c), tm = th();
    var shields = ''; for (var i = 0; i < E.CAMP.shieldMax; i++) shields += '<span class="sh-slot ' + (i < c.shields ? 'have' : '') + '">' + t.shieldIcon + '</span>';
    var msList = E.milestonesUpTo(Math.max(1000, c.count + 365));
    var ms = msList.map(function (m) { var r = E.milestoneReward(m), got = !!c.paid[m]; return '<span class="ms ' + (got ? 'got' : '') + ' ms-' + r.chest + '" title="Day ' + m + '">' + (got ? '✓ ' : '') + m + '</span>'; }).join('');
    var head = resting() ? 'Resting until ' + E.fmtDate(c.rest.until) : c.count ? 'Day ' + c.count : c.best ? 'Ready to ' + t.light + ' again' : 'Not started yet';
    var body = '<div class="camp-hero ' + (lit() ? 'is-lit' : '') + '"><div class="ch-flame" aria-hidden="true">' + t.icon + '</div><div><div class="ch-count">' + esc(head) + '</div><div class="ch-sub">' + esc(resting() ? 'Paused. Pausing never resets it.' : lit() ? t.lit + '.' : 'Finish any daily game or feed ' + she() + ' to ' + t.light + ' today.') + '</div></div></div>' +
      '<div class="camp-stats"><div><b>' + c.best + '</b><span>Best ever</span></div><div><b>' + c.total + '</b><span>Total days played</span></div><div><b class="sh-row">' + shields + '</b><span>' + esc(t.shields) + '</span></div></div>' +
      relightHtml() +
      '<div class="camp-sec"><h3>Milestones</h3>' + (nx ? '<p>Next: day ' + nx.n + ' · ' + esc(E.CHESTS[nx.chest].label) + ' ' + esc(tm.terms.chest.toLowerCase()) + (nx.cosmetic ? ' + ' + esc(t.cosmetics[nx.cosmetic]) : '') + '</p>' : '<p>Every milestone earned. Wow.</p>') + '<div class="ms-row">' + ms + '</div><p class="muted sm">Each milestone pays once, then one every 365 days after day 1000. Day 365, 730 and 1000 each add a one-of-a-kind look for ' + esc(she()) + ': ' + esc(t.cosmetics.m365) + ', ' + esc(t.cosmetics.m730) + ', ' + esc(t.cosmetics.m1000) + '.</p></div>' +
      '<div class="camp-sec growth"><div class="gr-art">' + A.companion(compDef(), 'happy', { aura: aura() }) + '</div><div><h3>' + esc(she()) + ' is ' + esc(aName(stageName(g.stage))) + '</h3><p>' + (g.next ? days(g.next.daysLeft) + ' of play to ' + esc(stageName(g.next.stage)) + '.' : 'Fully grown. ') + ' Growth counts every day you play, in a row or not, so it never goes backwards.</p></div></div>' +
      '<div class="camp-sec"><h3>How it works</h3><ul class="camp-how">' +
        '<li>' + esc(t.light.charAt(0).toUpperCase() + t.light.slice(1)) + ' it once a day: feed ' + esc(she()) + ' or finish any daily game.</li>' +
        '<li>Medicines never count toward it, and never count against it.</li>' +
        '<li>' + esc(t.shields) + ': earn 1 for every 7 days you play, hold up to 2. If a day goes by, one is used for you.</li>' +
        '<li>No ' + esc(t.shield.toLowerCase()) + '? ' + esc(t.relight) + ' it within 2 days: finish one of that day’s games plus 1 practice board. Free.</li>' +
        '<li>Need a break? Pause it in Me for 1 to 14 days.</li>' +
        '<li>It never changes Grand Draw tickets or ' + esc(tm.terms.charge) + '. Nothing here is for sale.</li></ul></div>';
    U.sheet('Your ' + t.name, body, { sub: esc(E.fmtDateLong(s.day)) });
  }

  /* ---------- celebrations ---------- */
  // after(fx, done): queue milestone chests, relight, growth and shield moments, one at a time.
  function after(fx, done) {
    if (!fx) { done && done(); return; }
    var q = [], t = cm(), tm = th(), bg = S().theme === 'grove' ? 'grove-bg' : 'warm';
    var rl = fx.relit ? fx : fx.relight;
    if (rl && rl.relit) q.push(function (next) {
      U.sfx('full');
      U.full('<div class="rays"></div><div class="big-item camp-big">' + t.icon + '</div><div class="f-title" style="margin-top:18px">Day ' + rl.count + '!</div><div class="f-sub">Your ' + esc(t.name) + ' ' + t.is + ' back. ' + esc(she()) + ' kept ' + (t.is === 'are' ? 'them' : 'it') + ' warm for you.</div><div class="f-actions"><button class="btn btn-light" data-act="ov-next" data-autofocus>Nice!</button></div>', { bg: bg, onClose: next });
      burstBig();
    });
    var ms = (fx.milestones || []).concat(rl && rl.milestones ? rl.milestones : []), chests = (fx.chests || []).concat(rl && rl.chests ? rl.chests : []);
    ms.forEach(function (m, i) {
      q.push(function (next) {
        U.sfx('full'); U.haptic([20, 40, 20, 40, 60]);
        U.full('<div class="rays"></div><div class="big-item camp-big">' + t.icon + '</div><div class="f-title" style="margin-top:18px">Day ' + m.n + '!</div>' +
          '<div class="f-sub">' + m.n + ' days in a row. Here’s a ' + esc(E.CHESTS[m.chest].label) + ' ' + esc(tm.terms.chest.toLowerCase()) + '.' + (m.cosmetic ? ' And something one-of-a-kind for ' + esc(she()) + ': the ' + esc(t.cosmetics[m.cosmetic]) + '!' : '') + '</div>' +
          '<div class="chest-mini" style="width:120px;height:120px;margin-top:14px">' + A.chest(m.chest) + '</div>' +
          '<div class="f-actions"><button class="btn btn-light" data-act="camp-ms-open" data-c="' + (chests[i] || '') + '" data-autofocus>Open it</button><button class="btn btn-clear" data-act="ov-next">Later</button></div>', { bg: bg, onClose: function () { var id = pendingChest; pendingChest = null; var ch = id && S().chests.filter(function (x) { return x.id === id && !x.opened; })[0]; if (ch) setTimeout(function () { root.CollectionUI.chestFx(id, next); }, 50); else next(); } });
        burstBig();
      });
    });
    if (fx.stageUp) q.push(function (next) { stageUp(fx.stageUp, next); });
    if (fx.shieldEarned) q.push(function (next) { U.toast(t.shieldIcon + ' You earned a ' + esc(t.shield.toLowerCase()) + '. It covers a day you can’t play.'); next(); });
    (function run() { var f = q.shift(); if (f) f(run); else { root.App.render(); done && done(); } })();
  }
  var pendingChest = null;
  function burstBig() { setTimeout(function () { var bi = document.querySelector('.full .big-item'); if (bi) U.burstAt(bi, { n: 60, spread: 190, wave: true }); }, 300); }
  function stageUp(su, next) {
    var t = cm(), d = compDef();
    U.sfx('rare'); U.haptic([30, 40, 30, 40, 80]);
    U.full('<div class="rays"></div><div class="grow-pair"><div class="gp-from">' + A.companion(d, 'happy', { stage: su.from }) + '</div><div class="gp-arrow" aria-hidden="true">➜</div><div class="gp-to big-item">' + A.companion(d, 'delighted', { stage: su.to, aura: aura() }) + '</div></div>' +
      '<div class="f-title" style="margin-top:14px">' + esc(she()) + ' grew into ' + esc(aName(t.stages[su.to])) + '!</div>' +
      '<div class="f-sub">' + esc(t.stageAdds[su.to] ? 'Look: ' + t.stageAdds[su.to] + '.' : '') + ' Growth comes from every day you play, so it never goes backwards.</div>' +
      '<div class="f-actions"><button class="btn btn-light" data-act="ov-next" data-autofocus>Look at you!</button></div>', { bg: S().theme === 'grove' ? 'grove-bg' : 'dark', onClose: function () {
        // v5.4: growing into the second stage opens Chapter One, and you choose the way.
        if (S().book && S().book.spinePending && St.spineDue() && root.BookUI) setTimeout(function () { root.BookUI.spineChoice(next); }, 80); else next();
      } });
    burstBig();
  }

  function onFeed(el) {
    var btn = document.getElementById('feedBtn') || el;
    var to = document.getElementById('compWrap') || document.querySelector('.camp-chip');
    var r = St.feed(); if (!r) return;
    if (r.already) { root.App.render(); return; }
    var t = cm();
    U.sfx('fragment'); U.haptic([12, 30, 18]);
    U.fly(btn, to, '<span style="font-size:2rem">' + t.treatIcon + '</span>', function () {
      root.App.render();
      var cw = document.getElementById('compWrap'); if (cw) { cw.classList.add('react'); U.burstAt(cw, { n: 24, spread: 90 }); U.popAt(cw, ['+' + r.xp + ' XP']); }
      var ch = document.querySelector('.camp-chip'); if (ch) { ch.classList.add('pop'); U.burstAt(ch, { n: 18, spread: 60 }); }
      var cf = r.camp || {};
      var msg = '“' + pick(t.fed) + '”' + (cf.lit && !cf.kid ? ' ' + t.dayLabel(cf.count) + ' ' + t.icon : '');
      U.toast(esc(msg));
      setTimeout(function () { if (r.levelUp) U.levelBanner(r.levelUp); after(cf); }, 700);
    });
  }

  /* ---------- rest mode (Me) ---------- */
  var restDays = 3;
  function restRow(row) {
    if (!St.campOn()) return '';
    var c = camp(), t = cm(), sub;
    if (resting()) sub = t.name + ' paused through ' + E.fmtDate(c.rest.until) + '.';
    else sub = 'Pause your ' + t.name + ' for 1 to 14 days. Pausing never resets it.';
    return row('clock', 'Taking a break', esc(sub), root.Art.icon('chev'), 'camp-rest');
  }
  function restSheet() {
    var c = camp(), t = cm(), s = S();
    if (resting()) {
      U.sheet('Taking a break', '<p style="font-weight:700">Your ' + esc(t.name) + ' ' + t.is + ' paused through ' + esc(E.fmtDateLong(c.rest.until)) + '. Days in a break never reset ' + (t.is === 'are' ? 'them' : 'it') + '.</p>' +
        '<p class="muted" style="margin-top:8px;font-weight:600">Back sooner? End the break and play today to keep it going.</p>' +
        '<div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-act="sheet-close">Keep resting</button><button class="btn btn-dark" data-act="camp-rest-end">End the break</button></div>');
      return;
    }
    var av = E.restAvailable(c, s.day);
    if (!av.ok) {
      U.sheet('Taking a break', '<p style="font-weight:700">Breaks can be used once every 30 days. Your next one opens on ' + esc(E.fmtDateLong(av.nextDay)) + '.</p><p class="muted" style="margin-top:8px;font-weight:600">' + esc(t.shields) + ' still cover a day you can’t play.</p><button class="btn btn-dark btn-block" style="margin-top:14px" data-act="sheet-close">OK</button>');
      return;
    }
    U.sheet('Taking a break', '<p style="font-weight:700">Sick, in the hospital, or traveling? Pause your ' + esc(t.name) + '. Pausing never resets it.</p>' +
      '<div class="set-row" style="margin-top:12px"><span class="sr-main"><span class="sr-t" style="display:block">How many days?</span><span class="sr-s" id="restUntil">Paused through ' + esc(E.fmtDate(s.day + restDays - 1)) + '</span></span><button type="button" class="tok" data-act="camp-rest-wheel" aria-label="How many days: ' + restDays + '. Change">' + restDays + ' day' + (restDays === 1 ? '' : 's') + ' <span class="tok-v" aria-hidden="true">▾</span></button></div>' +
      '<p class="muted sm" style="margin-top:8px">1 to 14 days, once every 30 days. Medicine reminders keep going as usual.</p>' +
      '<button class="btn btn-dark btn-block" style="margin-top:14px" data-act="camp-rest-go">Start my break</button>');
  }

  root.CampUI = { relightHtml: relightHtml, noteLine: noteLine, chip: chip, tile: tile, simpleLine: simpleLine, sheet: sheet, after: after, aura: aura, restRow: restRow, stageUp: stageUp };
  Object.assign(root.App.acts, {
    'camp-sheet': function () { U.closeAll(); sheet(); },
    'camp-feed': onFeed,
    'camp-ms-open': function (el) { pendingChest = el.getAttribute('data-c') || null; U.closeOverlay(); },
    'camp-rest': function () { restSheet(); },
    'camp-rest-wheel': function () {
      U.closeAll();
      root.Wheel.sheet({ title: 'How many days?', cols: [root.Wheel.numCol(1, 14, restDays, 'Days', 'days')], preview: function (v) { return 'Paused through ' + esc(E.fmtDate(S().day + v[0] - 1)); }, onDone: function (v) { restDays = v[0]; setTimeout(restSheet, 60); } });
    },
    'camp-rest-d': function (el) {
      restDays = Math.max(E.CAMP.restMin, Math.min(E.CAMP.restMax, restDays + +el.getAttribute('data-d')));
      var n = document.getElementById('restDaysN'), u = document.getElementById('restUntil');
      if (n) n.textContent = restDays; if (u) u.textContent = 'Paused through ' + E.fmtDate(S().day + restDays - 1);
    },
    'camp-rest-go': function () { var r = St.startRest(restDays); U.closeAll(); root.App.render(); if (r.ok) U.toast('Break started. Your ' + esc(cm().name) + ' ' + cm().is + ' paused through ' + esc(E.fmtDate(camp().rest.until)) + '.'); },
    'camp-rest-end': function () { St.endRest(); U.closeAll(); root.App.render(); U.toast('Welcome back. Play today to keep your ' + esc(cm().name) + ' going.'); }
  });
})(window);
