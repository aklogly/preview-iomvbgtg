/* Kindling v5 — screens-today.js : Today IS the game. Hero (companion + Core + one big button), live tiles, quests. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  function coreStyle() { return S().theme === 'grove' ? 'bloom' : 'beacon'; }
  function compDef() { return Th.companionDef(th(), S().comp.species); }
  function pick(arr, salt) { return arr[(S().day + (salt || 0)) % arr.length]; }
  function destName(id) { var d = th().destinations.filter(function (x) { return x.id === id; })[0]; if (!d) { var ex = root.THEMES.expedition.destinations.concat(root.THEMES.grove.destinations).map(function (x) { return x.id; }).indexOf(id); d = th().destinations[ex >= 0 ? ex % 3 : S().day % 3]; } return d; }
  function she() { return S().comp.name; }
  function campAura() { return !!(root.CampUI && root.CampUI.aura()); }

  /* ---------- copy helpers ---------- */
  var ui = { other: false, names: false, busy: false };
  function stackTitle(st) {
    if (st.kind === 'rest') return 'Rest day';
    if (st.kind === 'journal') return 'Daily journal';
    if (st.boss) return 'Boss Day';
    return st.label + ' stack';
  }
  function medNames(st) { return st.doses.map(function (d) { var m = St.medById(d.medId); return m ? m.name + (d.label ? ' ' + d.label : '') : ''; }).filter(Boolean); }
  function stackSub(st) {
    if (st.kind === 'rest') return 'Nothing due today';
    if (st.kind === 'journal') return 'Any honest answer counts';
    var n = st.doses.length;
    if (n === 1) return medNames(st)[0] + ' · ' + E.fmtTime(st.mins);
    return n + (S().mode === 'habits' ? ' things' : ' medicines') + ' · ' + E.fmtTime(st.mins);
  }
  function namesList(st) {
    if (st.kind !== 'dose' || st.doses.length < 2) return '';
    var names = medNames(st), shown = ui.names ? names : names.slice(0, 3);
    return '<div class="med-names">' + shown.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('') +
      (names.length > 3 ? '<button class="names-more" data-act="names-toggle">' + (ui.names ? 'Show less' : '+' + (names.length - 3) + ' more') + '</button>' : '') + '</div>';
  }
  function answeredHonest() { var t = S().today; return St.allAnswered() && t.charge < 100; }
  function pieceLabel() {
    var t = S().today, n = t.plan.stacks.length, filled = St.piecesFor().filter(function (p) { return p === 'filled'; }).length, term = th().terms.charge, pc = th().terms.piece;
    if (filled === n) return 'Full ' + term + '!';
    if (answeredHonest()) return 'Answered. Thanks for being honest.';
    var op = St.openStack(); if (op && E.stackPhase(op, t.entries[op.id], S().clock) === 'past') return 'How did it go? Answer below';
    if (n === 1) return 'Today’s ' + term + ': 1 ' + pc + ' to go';
    return term + ': ' + filled + ' of ' + n + ' ' + pc + 's';
  }
  function fuelSource() {
    var pu = S().pu, src = S().puSources, best = null;
    E.PU_ORDER.forEach(function (k) { if (pu[k] > 0 && (!best || (src[k] && /stack|rest|journal|Boss/i.test(src[k])))) best = k; });
    return best;
  }

  /* ---------- hero ---------- */
  function heroHtml() {
    var s = S(), t = s.today, open = St.openStack(), entry = open && t.entries[open.id], tm = th();
    if (!open) return compactHero();
    var phase = E.stackPhase(open, entry, s.clock);
    var boss = open.boss;
    var mood = phase === 'out' ? 'holding' : 'happy';
    var speech = phase === 'out' ? tm.lines.holding : phase === 'past' ? 'Tell me how it went. Every answer counts.' : s.trip.status === 'back' ? tm.lines.back : boss ? 'A boss! We’ve got this.' : pick(tm.lines.hello);
    var title = boss ? 'Boss Day' : phase === 'past' ? 'Checking in' : she() + '’s ready';
    var pieces = St.piecesFor(), sr = pieceLabel();
    var stage = boss
      ? '<div class="core-wrap boss-wrap" id="coreWrap">' + root.Items.boss(false) + '</div><div class="core-label" aria-hidden="true">One dose beats it</div>'
      : '<div class="core-wrap" id="coreWrap">' + A.core(pieces, coreStyle(), { label: sr }) + '</div><div class="core-label" aria-hidden="true">' + esc(sr) + '</div>';
    return '<section class="hero' + (boss ? ' boss' : '') + '" aria-label="Today">' + A.scenery(s.theme) +
      (boss ? '<div class="boss-banner">⚔ BOSS DAY · This week’s boss is here</div>' : '') +
      '<div class="hero-inner">' +
        '<div class="hero-head"><div><div class="hero-kicker">' + esc(E.fmtDateLong(s.day)) + '</div><div class="hero-title">' + esc(title) + '</div></div></div>' +
        '<div class="stage-row">' +
          (speech ? '<div class="speech" id="speech">' + esc(speech) + '</div>' : '') +
          '<div class="comp-wrap" id="compWrap"><div class="c-idle">' + A.companion(compDef(), mood, { aura: campAura() }) + '</div>' + (mood === 'holding' ? '<div class="held-frag" id="heldFrag">' + A.fragment(coreStyle()) + '</div>' : '') + '</div>' +
          stage +
        '</div>' +
        stackCardHtml(open, entry, phase) +
      '</div></section>';
  }
  // Once everything's answered, the hero collapses to a compact strip so the game sits above the fold.
  function compactHero() {
    var s = S(), t = s.today, tm = th(), away = t.tripSent && (t.run || s.settings.simple) && s.trip.status !== 'back';
    var wasBoss = t.plan.boss;
    var art = wasBoss ? '<div class="mini-core">' + root.Items.boss(true) + '</div>' : '<div class="mini-core" id="coreWrap">' + A.core(St.piecesFor(), coreStyle(), { label: pieceLabel() }) + '</div>';
    var bossHeld = wasBoss && t.plan.stacks.some(function (x) { return x.boss && t.entries[x.id] && t.entries[x.id].state === 'held'; });
    var title = answeredHonest() ? 'Answered for today' : bossHeld ? 'Checked in ✓' : wasBoss ? 'Boss beaten ✓' : 'All set ✓';
    var sub = answeredHonest() ? 'Answered. Thanks for being honest.' : bossHeld ? 'The boss will be back next Sunday.' : wasBoss ? 'The boss is napping. See you next week.' : pieceLabel();
    return '<section class="hero compact" aria-label="Today">' + A.scenery(s.theme) +
      '<div class="hero-inner compact-inner">' +
        (away ? '<div class="mini-comp away"><span>' + esc(she()) + ' is ' + esc(tm.lines.away) + '</span></div>' : '<div class="mini-comp" id="compWrap"><div class="c-idle">' + A.companion(compDef(), 'delighted', { aura: campAura() }) + '</div></div>') +
        '<div class="compact-text"><div class="hero-kicker">' + esc(E.fmtDateLong(s.day)) + '</div><div class="hero-title">' + esc(title) + '</div><div class="compact-sub">' + esc(sub) + '</div>' +
        '<div class="done-chips">' + doneChips() + '</div></div>' + art +
      '</div></section>';
  }

  function doneChips() {
    var t = S().today, chips = '';
    t.plan.stacks.forEach(function (st) {
      var e = t.entries[st.id]; if (!e || e.state === 'out') return;
      var ds = E.doseStatus(e, st, S().clock);
      chips += '<span class="chip ' + ds.tone + '">' + ds.icon + ' ' + esc(st.kind === 'dose' ? st.label : stackTitle(st)) + ' · ' + esc(ds.label) + '</span>';
    });
    return chips;
  }
  function upcomingChips(openId) {
    var t = S().today, chips = '', seen = false;
    t.plan.stacks.forEach(function (st) {
      if (st.id === openId) { seen = true; return; }
      if (!seen || t.entries[st.id]) return;
      chips += '<span class="chip upcoming">◷ ' + esc(st.label) + ' · ' + E.fmtTime(st.mins) + '</span>';
    });
    return chips;
  }

  function stackCardHtml(open, entry, phase, plain) {
    var s = S();
    var pills = open.doses.slice(0, 5).map(function (d) { var m = St.medById(d.medId); return m ? A.pill(m) : ''; }).join('');
    var top = '<div class="stack-top"><div class="grow"><div class="stack-name">' + esc(phase === 'past' ? 'How did your ' + open.label.toLowerCase() + ' stack go?' : stackTitle(open)) + '</div><div class="stack-sub">' + esc(stackSub(open)) + '</div>' + namesList(open) + '</div><div class="pills">' + pills + '</div></div>';
    var body = '', twoStep = s.settings.twoStep, sid = open.id;
    var other = '<div class="other-row">' + (ui.other
      ? '<button class="btn" data-act="ci" data-a="didnt" data-s="' + sid + '">Didn’t take</button><button class="btn" data-act="ci" data-a="unsure" data-s="' + sid + '">Not sure</button><button class="btn" data-act="ci" data-a="held" data-s="' + sid + '">Held by care team</button>'
      : '') + '</div>';
    if (open.kind === 'rest') {
      body = '<button class="btn btn-cta btn-block" data-act="ci" data-a="rest" data-s="' + sid + '"><span class="big-ic">✓</span> All set for today</button>';
    } else if (open.kind === 'journal') {
      body = '<button class="btn btn-cta btn-block" data-act="ci" data-a="journal" data-s="' + sid + '">✓ Checked in for today</button>' +
        '<div class="answer-row"><button class="btn wide" data-act="prn-pick">I used something today</button></div>';
    } else if (phase === 'out') {
      var since = entry.outTs || Date.now();
      body = '<div class="out-line"><span>' + (open.boss ? 'Pen ready' : 'Out') + ' since ' + E.fmtTime(entry.outAt) + '</span><span class="timer" id="outTimer" data-since="' + since + '">0:00</span></div>' +
        '<button class="btn btn-cta btn-block" data-act="ci" data-a="swallowed" data-s="' + sid + '"><span class="big-ic">✓</span> ' + (open.boss ? 'Done' : 'Swallowed') + '</button>' +
        '<div class="answer-row"><button class="btn" data-act="putback" data-s="' + sid + '">Put it back</button><button class="btn" data-act="ci" data-a="unsure" data-s="' + sid + '">Not sure</button></div>';
    } else if (phase === 'past') {
      // After the window: a neutral question only. No pill-out, nothing that suggests taking it now (R2).
      body = '<div class="answer-col"><button class="btn btn-2 btn-block" data-act="earlier-sheet" data-s="' + sid + '">✓ Took it earlier</button>' +
        '<div class="answer-row"><button class="btn" data-act="ci" data-a="didnt" data-s="' + sid + '">Didn’t take</button><button class="btn" data-act="ci" data-a="unsure" data-s="' + sid + '">Not sure</button></div></div>';
    } else {
      var n = open.doses.length;
      var primary = twoStep
        ? '<button class="btn btn-cta btn-block" data-act="pillout" data-s="' + sid + '"><span class="big-ic">✋</span> ' + (open.boss ? 'Pen ready' : n > 1 ? 'Stack out' : 'Pill out') + '</button>'
        : '<button class="btn btn-cta btn-block" data-act="ci" data-a="took" data-s="' + sid + '"><span class="big-ic">✓</span> ' + (n > 1 ? 'Took all ' + n : open.boss ? 'Done' : 'Took it') + '</button>';
      var second = twoStep
        ? '<button class="btn" data-act="ci" data-a="took" data-s="' + sid + '">✓ ' + (open.boss ? 'Done' : n > 1 ? 'Took all ' + n : 'Took it') + '</button>'
        : '<button class="btn" data-act="pillout" data-s="' + sid + '">✋ ' + (n > 1 ? 'Stack out' : 'Pill out') + '</button>';
      body = primary + '<div class="answer-row">' + second + '<button class="btn" data-act="other-toggle" aria-expanded="' + ui.other + '">Other answer ' + (ui.other ? '▴' : '▾') + '</button></div>' + other;
    }
    var chips = doneChips() + upcomingChips(open.id);
    return '<div class="stack-card' + (ui.busy ? ' busy' : '') + (plain ? ' plain' : '') + '">' + top + body + (chips ? '<div class="done-chips">' + chips + '</div>' : '') + '</div>';
  }

  /* ---------- tiles ---------- */
  function tripTile() {
    if (root.QuestUI) return root.QuestUI.tile(); // v5.4: the Trip grew into a quest
    var s = S(), tm = th(), tr = s.trip;
    if (tr.status === 'back') {
      return '<section class="tile trip" aria-label="' + esc(tm.terms.trip) + '"><div class="deco">📮</div>' +
        '<div class="t-kicker">' + esc(tm.terms.trip) + ' · back this morning</div><div class="t-title">' + esc(she()) + ' is back with a postcard</div>' +
        '<div class="t-body">' + esc(she()) + ' brought something back from ' + esc((destName(tr.dest) || {}).name || 'the trail') + '.</div>' +
        '<div class="t-row"><button class="btn btn-tile" data-act="trip-open" data-autofocus>📬 Open postcard</button></div></section>';
    }
    if (tr.status === 'out') {
      return '<section class="tile trip" aria-label="' + esc(tm.terms.trip) + '"><div class="deco">' + ((destName(tr.dest) || {}).icon || '🧭') + '</div>' +
        '<div class="t-kicker">' + esc(tm.terms.trip) + '</div><div class="t-title">' + esc(she()) + ' heads to ' + esc((destName(tr.dest) || {}).name || 'somewhere new') + ' tonight</div>' +
        '<div class="t-body">Back tomorrow morning with a haul. Fuller days pack a bigger one.</div></section>';
    }
    return '<section class="tile trip" aria-label="' + esc(tm.terms.trip) + '"><div class="deco">🧭</div>' +
      '<div class="t-kicker">' + esc(tm.terms.trip) + '</div><div class="t-title">Where should ' + esc(she()) + ' go tonight?</div>' +
      '<div class="t-body">Pick a spot. ' + esc(she()) + ' comes back in the morning with finds.</div>' +
      '<div class="t-row"><button class="btn btn-tile" data-act="trip-send">🧭 Choose a destination</button></div></section>';
  }
  function runTile() {
    var s = S(), tm = th(), t = s.today, k = fuelSource(), n = ((s.day - 1) % 7) + 1;
    var info = root.RunGame && root.RunGame.boardInfo ? root.RunGame.boardInfo[n - 1] : null;
    if (t.run) {
      var st = '';
      for (var i = 0; i < 3; i++) st += i < t.run.stars ? '⭐' : '☆';
      return '<section class="tile run" aria-label="' + esc(tm.terms.run) + '"><div class="deco">🏆</div>' +
        '<div class="t-kicker">Today’s ' + esc(tm.terms.run) + ' · Board ' + n + '</div><div class="t-title">' + st + ' ' + t.run.stars + ' of 3 stars</div>' +
        '<div class="t-body">Your Grand Draw ticket is in. New board tomorrow.</div>' +
        '<div class="t-row"><button class="btn btn-tile" data-act="share">' + A.icon('share') + ' Share</button><button class="btn btn-tile" data-act="run-practice">Practice board</button></div></section>';
    }
    var fuel;
    if (k) {
      var pu = tm.powerUps[k], src = s.puSources[k] || 'Your check-ins';
      fuel = '<div class="fuel"><span class="pu-badge">' + pu.icon + '</span><div><div class="fuel-text">' + esc(src) + ' built this ' + esc(pu.name) + '.</div><div class="fuel-sub">' + esc(pu.does) + '</div></div></div>';
    } else {
      var have = Math.round(s.bank / (100 / Math.max(1, t.plan.stacks.length)));
      fuel = '<div class="fuel"><span class="pu-badge" style="filter:grayscale(.8);opacity:.7">✨</span><div><div class="fuel-text">Your next power-up is being built.</div><div class="fuel-sub">Every full ' + esc(tm.terms.charge) + ' pops one. Leftover ' + esc(tm.terms.piece) + 's carry over.</div></div></div>';
    }
    var chips = E.PU_ORDER.filter(function (x) { return s.pu[x] > 0; }).map(function (x) { return '<span class="pu-chip"><span class="pu-badge sm">' + tm.powerUps[x].icon + '</span>' + s.pu[x] + ' ' + esc(tm.powerUps[x].name) + '</span>'; }).join('');
    return '<section class="tile run" aria-label="' + esc(tm.terms.run) + '"><div class="deco">🧩</div>' +
      '<div class="t-kicker">Today’s ' + esc(tm.terms.run) + ' · Board ' + n + ' of 7</div><div class="t-title">' + esc(info ? info.title : 'A fresh path puzzle') + '</div>' +
      '<div class="t-body">' + esc(info && info.twist && info.twist.length > 14 ? info.twist : 'Plan a route, grab the finds, reach all 3 stars.') + '</div>' +
      fuel + (chips && k ? '<div class="pu-row" style="margin-top:8px">' + chips + '</div>' : '') +
      '<div class="t-row"><button class="btn btn-tile" data-act="run-play">▶ Play</button><span style="font-weight:800;font-size:.85rem;opacity:.95">2 min · no timer</span></div></section>';
  }
  // Weekly headline: the same Gold chest for everyone. Weekly-med users get it on Boss Day; everyone else via "Load the week".
  function weeklyHtml() {
    var done = St.headlineDone();
    if (St.hasWeekly()) {
      return '<div class="qcard weekly ' + (done ? 'done' : '') + '"><span class="q-ic">' + (done ? '✓' : '⚔') + '</span><span class="q-text">This week: beat the Boss on your dose day<span class="q-sub">Gold ' + esc(th().terms.chest.toLowerCase()) + '</span></span><span class="q-rew">Weekly</span></div>';
    }
    return '<div class="qcard weekly ' + (done ? 'done' : '') + '"><span class="q-ic">' + (done ? '✓' : '🗓') + '</span><span class="q-text">Load the week: fill your pill organizer<span class="q-sub">Gold ' + esc(th().terms.chest.toLowerCase()) + ', once a week</span></span>' +
      (done ? '<span class="q-rew">Weekly</span>' : '<button class="btn btn-soft q-btn" data-act="headline-done">Done</button>') + '</div>';
  }
  function drawTile() {
    var s = S();
    return '<section class="tile draw" aria-label="Grand Draw"><div class="deco">🎟️</div>' +
      '<div class="t-kicker">Grand Draw · Autumn season</div><div class="t-title">' + s.tickets + ' ticket' + (s.tickets === 1 ? '' : 's') + ' in the drum</div>' +
      '<div class="t-body">' + (s.today.run ? 'Today’s ticket is in.' : 'Finish today’s ' + esc(th().terms.run) + ' to add a ticket.') + ' Draw night is Sunday, Nov 29.</div>' +
      '<div class="t-row"><button class="btn btn-tile" data-act="go" data-to="draw">See prizes</button><span style="font-size:.8rem;font-weight:800;opacity:.95">Tickets come from the game, never from medicines</span></div></section>';
  }
  var QICON = { checkin: '✅', run: '🧩', run2: '⭐', chest: '🎁', place: '🏕️', album: '📖' };
  function questsHtml() {
    var tm = th();
    return S().today.quests.map(function (q) {
      return '<div class="qcard ' + (q.done ? 'done' : '') + '"><span class="q-ic">' + (q.done ? '✓' : (QICON[q.goal] || '✨')) + '</span><span class="q-text">' + esc(Th.fill(q.text, tm)) + (q.swapped && !q.done ? ' <span class="q-new">new</span>' : '') + '</span><span class="q-rew">+' + q.reward.stars + ' ★</span></div>';
    }).join('');
  }
  function prnHtml() {
    var s = S(), plan = s.today.plan; if (!plan.prn.length || plan.journal) return '';
    var chips = plan.prn.map(function (id) { var m = St.medById(id); return '<button class="prn-chip" data-act="prn" data-m="' + id + '">' + A.pill(m) + esc(m.name) + '</button>'; }).join('');
    var lastLines = plan.prn.map(function (id) { var l = St.lastPrn(id), m = St.medById(id); return l ? esc(m.name) + ': last logged ' + (l.day === s.day ? '' : E.fmtDate(l.day) + ', ') + E.fmtTime(l.at) : ''; }).filter(Boolean).join(' · ');
    var noneDone = s.today.prn.some(function (p) { return p.none; }), anyLogged = s.today.prn.some(function (p) { return p.medId; });
    return '<div class="sec-h"><h2>As needed</h2><span class="sub">Log it, no fuss</span></div>' +
      '<div class="prn-row">' + chips + (anyLogged ? '' : '<button class="prn-chip" data-act="prn-none" ' + (noneDone ? 'disabled style="opacity:.6"' : '') + '>' + (noneDone ? '✓ Noted: none needed' : 'Didn’t need any today') + '</button>') + '</div>' +
      (lastLines ? '<p class="prn-note">' + lastLines + '</p>' : '');
  }
  function assistHtml() {
    var a = S().flags.assist; if (!a || a.tier < 2) return '';
    return root.MedsUI.assistCard(a);
  }
  function chestsWaiting() {
    var c = S().chests.filter(function (x) { return !x.opened; });
    if (!c.length) return '';
    var ch = c[0];
    return '<div class="card"><div class="chest-row"><div class="chest-mini">' + A.chest(ch.type) + '</div><div class="grow"><h3>' + E.CHESTS[ch.type].label + ' ' + esc(th().terms.chest) + ' waiting</h3><p>' + (c.length > 1 ? c.length + ' to open' : 'Ready to open') + '</p></div><button class="btn btn-dark" data-act="chest-open" data-c="' + ch.id + '">Open</button></div></div>';
  }
  function allDoneHtml() {
    var s = S(), t = s.today;
    var runOk = s.settings.simple || t.run;
    if (!St.allAnswered() || !runOk || !t.tripSent || s.trip.status === 'back') return '';
    return '<section class="alldone" aria-label="All done for today"><div class="ad-comp">' + A.companion(compDef(), 'wave') + '</div><div><h3>All done for today</h3><p>“' + esc(th().lines.signoff) + '”</p>' +
      '<div class="ad-links"><button data-act="tab" data-t="collection">Decorate ' + esc(th().terms.home) + '</button><button data-act="run-practice">Practice board</button></div></div></section>';
  }
  function safetyHtml() {
    var id = S().flags.highRisk; if (!id) return '';
    var m = St.medById(id); if (!m) return '';
    return '<section class="safety" role="alert"><div class="s-h">' + A.icon('info') + ' Please check with your care team</div>' +
      '<p><b>' + esc(m.name) + ' ' + esc(m.strength || '') + '</b> isn’t logged for 2 days.</p>' +
      '<p>For this medicine, it’s important to talk with your prescriber or pharmacist before your next dose.</p>' +
      '<div class="btn-row"><button class="btn btn-clin" data-act="fake-call" data-who="pharmacy">' + A.icon('phonecall') + ' Call pharmacy</button><button class="btn btn-clin-2" data-act="fake-call" data-who="prescriber">Call prescriber</button></div>' +
      '<div class="btn-row" style="margin-top:8px"><button class="btn btn-clin-2" data-act="hr-ack">I’ve talked to my care team</button></div></section>';
  }

  function render() {
    var s = S(), tm = th(), lv = root.RPG.levelInfo(s.compLevel.xp);
    var campChip = s.settings.simple || !root.CampUI ? '' : root.CampUI.chip();
    var top = '<div class="topbar' + (campChip ? ' has-camp' : '') + (s.people ? ' has-person' : '') + '">' +
      (s.people ? '<button class="person-sw" data-act="go" data-to="family"><span class="avatar" style="background:#0a6b61">D</span>Dan ▾</button>' : campChip ? '' : '<div class="brand" aria-label="Kindling">' + A.logo(30) + '</div>') +
      '<div class="spacer"></div>' +
      campChip +
      (s.settings.simple ? '' : '<button class="pill-stat lv-pill" data-act="go" data-to="companion" aria-label="' + esc(s.comp.name) + ', level ' + lv.level + '">Lv ' + lv.level + '</button>') +
      '<span class="pill-stat" aria-label="' + s.stars + ' Stars"><span class="st">★</span>' + U.fmtNum(s.stars) + '</span>' +
      '<button class="dit-btn" data-act="dit">' + A.icon('clock') + 'Did I take it?</button></div>';
    var hr = safetyHtml(), open = St.openStack();
    // A high-risk alert never hides the check-in: plain safety card first, then a plain stack card for the rest.
    var html = top + hr + (hr ? (open ? '<section class="plain-stack">' + stackCardHtml(open, s.today.entries[open.id], E.stackPhase(open, s.today.entries[open.id], s.clock), true) + '</section>' : '') : heroHtml()) + assistHtml();
    if (s.trip.status === 'back') html += '<div class="sec-h"><h2>This morning</h2></div>' + tripTile();
    if (!s.settings.simple) {
      html += '<div class="sec-h"><h2>Play</h2><span class="sub">Free, every day</span></div>' + (root.CampUI ? root.CampUI.tile() : '') + runTile();
      if (s.trip.status !== 'back') html += tripTile();
      html += drawTile();
      html += chestsWaiting();
      html += '<div class="sec-h"><h2>Today’s quests</h2><span class="sub">' + s.today.quests.filter(function (q) { return q.done; }).length + ' of 3</span></div>' + questsHtml() + weeklyHtml();
    } else {
      html += root.CampUI ? root.CampUI.simpleLine() : '';
      if (s.trip.status !== 'back') html += tripTile();
      html += chestsWaiting();
      html += '<div class="card"><div class="row"><div class="grow"><h3>' + esc(tm.terms.run) + ' <span class="muted" style="font-weight:600">(optional)</span></h3><p>A short path puzzle, whenever you like.</p></div><button class="btn btn-soft" data-act="run-play">Play</button></div></div>' + weeklyHtml();
    }
    html += prnHtml();
    html += allDoneHtml();
    html += '<div class="more-row">' + A.icon('shield', '') + ' Nothing about your medicines is shared. Taking more never earns more.</div><div style="height:16px"></div>';
    return html;
  }

  /* ---------- after render: live timer ---------- */
  var timerInt = null;
  function after() {
    clearInterval(timerInt);
    var el = document.getElementById('outTimer');
    if (el) { var t0 = +el.getAttribute('data-since'); var tick0 = function () { var sec = Math.max(0, Math.floor((Date.now() - t0) / 1000)); el.textContent = Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }; tick0(); timerInt = setInterval(function () { var e = document.getElementById('outTimer'); if (!e) { clearInterval(timerInt); return; } var sec = Math.floor((Date.now() - t0) / 1000); e.textContent = Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }, 1000); }
    var s = S();
    if (s.flags.pendingWelcome && !U.topOverlay()) setTimeout(welcomeBack, 250);
  }

  /* ---------- actions ---------- */
  function corePieceEls(idx) { return U.$$('#coreWrap .piece-' + idx); }
  function onPillOut(el) {
    if (ui.busy) return;
    var r = St.pillOut(el.getAttribute('data-s'));
    if (!r || r.ignored) { root.App.render(); return; }
    ui.other = false;
    U.sfx('out'); U.haptic(12);
    root.App.render();
    var cw = document.getElementById('compWrap'); if (cw) { cw.classList.add('react'); }
    U.announce('Pill out. Tap Swallowed once it’s down.');
  }
  function onPutBack(el) { if (ui.busy) return; var r = St.putBack(el.getAttribute('data-s')); root.App.render(); if (r && !r.ignored) U.toast('Put back. No problem.'); }

  function onCheckIn(el) {
    if (ui.busy) return;
    var sid = el.getAttribute('data-s'), ans = el.getAttribute('data-a');
    var t = S().today, st = St.stackById(sid), idx = t.plan.stacks.indexOf(st);
    var from = document.getElementById('heldFrag') || document.getElementById('compWrap');
    var to = document.getElementById('coreWrap');
    var fx = St.checkIn(sid, ans);
    if (!fx) return;
    if (fx.already) { root.App.render(); U.toast(fx.at != null ? 'Already logged at ' + E.fmtTime(fx.at) + '.' : 'Already logged.'); return; }
    ui.other = false; ui.names = false;
    var full = fx.answer === 'swallowed' || fx.answer === 'took' || fx.answer === 'rest' || fx.answer === 'journal';
    if (full) {
      ui.busy = true; var card = el.closest('.stack-card'); if (card) card.classList.add('busy');
      U.fly(from, to, A.fragment(coreStyle()), function () { ui.busy = false; root.App.render(); celebrate(fx, idx); });
    } else if (ans === 'held') {
      root.App.render();
      corePieceEls(idx).forEach(function (p) { p.classList.add('just-filled'); });
      U.toast(fx.bossChest ? 'The boss will be back next Sunday. Chest earned for checking in.' : 'Held by your care team. That counts as following your plan.');
      afterRewards(fx);
    } else if (ans === 'didnt') {
      root.App.render();
      U.sfx('soft');
      honestSheet(fx, st);
      if (fx.bossChest) U.toast('The boss will be back next Sunday. Chest earned for checking in.');
    } else if (ans === 'unsure') {
      root.App.render();
      unsureSheet(fx, st);
      if (fx.bossChest) U.toast('The boss will be back next Sunday. Chest earned for checking in.');
    }
  }
  /* "Took it earlier": ask WHEN. The entered time becomes the dose time; the tap time is only the "logged at" time. */
  function earlierSheet(sid) {
    var st = St.stackById(sid); if (!st) return;
    var s = S(), dflt = Math.min(st.mins, s.clock), hh = ('0' + Math.floor(dflt / 60)).slice(-2) + ':' + ('0' + dflt % 60).slice(-2);
    var maxT = ('0' + Math.floor(s.clock / 60)).slice(-2) + ':' + ('0' + s.clock % 60).slice(-2);
    U.sheet('About what time?', '<p class="muted" style="margin-bottom:12px">So “Did I take it?” shows the right time later.</p><div class="opt-list">' +
      '<button class="opt" data-act="ci-later" data-s="' + sid + '" data-t="' + st.mins + '"><span class="o-t">Around ' + E.fmtTime(st.mins) + ' (scheduled)</span></button>' +
      '<div class="opt pick-time"><span class="o-t grow">Pick a time</span><input class="input" type="time" id="earlierTime" value="' + hh + '" max="' + maxT + '" aria-label="Time you took it" style="width:auto;min-height:44px"><button class="btn btn-dark" data-act="ci-later-pick" data-s="' + sid + '">Save</button></div>' +
      '<button class="opt" data-act="ci-later" data-s="' + sid + '" data-unsure="1"><span class="o-t">Not sure when</span></button></div>', { clin: true });
  }
  function logEarlier(sid, opts) {
    var t = S().today, st = St.stackById(sid), idx = t.plan.stacks.indexOf(st);
    var fx = St.checkIn(sid, 'took', opts);
    if (!fx) { U.toast('Pick a time before now.'); return; }
    U.closeAll(); ui.other = false;
    if (fx.already) { root.App.render(); return; }
    root.App.render(); celebrate(fx, idx);
  }
  function celebrate(fx, idx) {
    var tm = th(), cr = fx.credit;
    corePieceEls(idx).forEach(function (p) { p.classList.add('just-filled'); });
    var cw = document.getElementById('coreWrap'), comp = document.getElementById('compWrap');
    if (cw) { cw.classList.add('snap'); U.burstAt(cw, { n: 30, spread: 110, wave: true }); }
    if (comp) comp.classList.add('react');
    U.sfx('fragment'); U.haptic([12, 30, 18]);
    var pops = ['+' + (cr.stars + cr.onTimeStars) + ' ★'];
    if (fx.compXp) pops.push('+' + fx.compXp + ' XP');
    if (cr.onTimeStars) pops.push('On-time bonus ✓');
    U.popAt(cw, pops);
    var sp = document.getElementById('speech');
    if (sp && !fx.full) sp.textContent = pick(tm.lines.caught);
    var line = fx.stack.kind === 'rest' ? 'Rest day: all set.' : fx.boss ? 'Boss Day: done!' : (fx.stack.label + ' stack: done.');
    if (cr.onTimeStars === 0 && fx.stack.kind === 'dose') line += ' Still counts. Always does.';
    U.announce(line + ' ' + pieceLabel());
    var delay = 900;
    if (fx.full) {
      setTimeout(function () {
        var c2 = document.getElementById('coreWrap');
        U.burstAt(c2, { n: 60, spread: 190, wave: true, waveColor: 'rgba(255,255,255,.9)' });
        setTimeout(function () { U.burstAt(c2, { n: 40, spread: 160 }); }, 180);
        U.sfx('full'); U.haptic([20, 40, 20, 40, 60]);
        var sp2 = document.getElementById('speech'); if (sp2) sp2.textContent = tm.lines.full;
      }, 650);
      delay = 1700;
    }
    if (fx.bossChest) setTimeout(function () { U.toast('🏆 Boss beaten! A Gold ' + esc(tm.terms.chest.toLowerCase()) + ' is waiting.'); }, 900);
    setTimeout(function () { afterRewards(fx); }, delay);
  }
  function afterRewards(fx) {
    var q = [];
    (fx.drops || []).forEach(function (d) { q.push(function (next) { powerUpDrop(d, next); }); });
    if (fx.levelUp) q.push(function (next) { U.levelBanner(fx.levelUp); setTimeout(next, 600); });
    if (fx.quest) q.push(function (next) { U.toast('Quest done: ' + esc(Th.fill(fx.quest.text, th())) + ' +' + fx.quest.reward.stars + ' ★'); next(); });
    (function run() { var f = q.shift(); if (f) f(run); else root.App.render(); })();
  }
  function powerUpDrop(d, next) {
    var tm = th(), pu = tm.powerUps[d.type], s = S();
    if (d.converted) { U.toast('Your power-up bag is full, so this one became 60 ★.'); next && next(); return; }
    U.sfx('pu'); U.haptic([15, 30, 15]);
    var close = U.full('<div class="rays"></div><div class="big-item">' + pu.icon + '</div>' +
      '<div class="f-title" style="margin-top:22px">' + esc(pu.name) + ' power-up!</div>' +
      (s.settings.simple
        ? '<div class="f-sub">' + esc(s.puSources[d.type] || 'Your check-ins') + ' built this ' + esc(pu.name) + '. Save it to boost ' + esc(she()) + '’s next haul. You choose when.</div>'
        : '<div class="f-sub">' + esc(s.puSources[d.type] || 'Your check-ins') + ' built this ' + esc(pu.name) + '. ' + esc(pu.does) + '.</div><div class="f-sub" style="opacity:.85;font-size:.9rem">Use it in today’s ' + esc(tm.terms.run) + '.</div>') +
      '<div class="f-actions"><button class="btn btn-light" data-act="ov-next" data-autofocus>Nice!</button></div>', { bg: s.theme === 'grove' ? 'grove-bg' : 'dark', onClose: function () { next && next(); } });
    setTimeout(function () { var bi = document.querySelector('.big-item'); if (bi) U.burstAt(bi, { n: 40, spread: 170, wave: true }); }, 350);
  }

  function honestSheet(fx, st) {
    var tm = th();
    U.sheet('Thanks for telling me', '<div class="row" style="align-items:flex-start"><div style="width:84px;height:84px;flex:0 0 84px">' + A.companion(compDef(), 'happy') + '</div><div><p style="font-weight:700;font-size:1.02rem">“' + esc(tm.lines.honest) + '”</p>' +
      '<div class="done-chips" style="margin-top:10px">' + (fx.compXp ? '<span class="chip ok">+' + fx.compXp + ' XP for ' + esc(she()) + '</span>' : '') + '' + (fx.quest ? '<span class="chip ok">✓ Check-in quest</span>' : '') + '<span class="chip neutral">Your record says “Not taken”</span></div></div></div>' +
      '<p style="margin-top:16px;font-weight:800">Want help with what got in the way?</p><p class="muted" style="font-size:.9rem;font-weight:600">Optional and private. Your points stay the same either way.</p>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-dark" data-act="barrier" data-m="' + (st.doses[0] && st.doses[0].medId) + '">Yes, help me</button><button class="btn btn-ghost" data-act="sheet-close">Not now</button></div>');
  }
  function unsureSheet(fx, st) {
    var e = S().today.entries[st.id];
    var fact = e && e.outAt ? 'Taken out at ' + E.fmtTime(e.outAt) + ', not confirmed swallowed. Check where you set it down.' : 'No other entry for this stack today.';
    U.sheet('Marked as “Not sure”', '<p style="font-weight:700">Thanks for telling me. Your record stays accurate.</p>' +
      '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg);color:var(--neutral)">?</span><div><div class="f-t">' + esc(st.label) + ' stack</div><div class="f-s">' + esc(fact) + '</div></div></div>' +
      (fx.compXp ? '<div class="done-chips"><span class="chip ok">+' + fx.compXp + ' XP for an honest answer</span></div>' : '') +
      '<div class="assist" style="margin:12px 0 0"><h3>Not sure if you took it?</h3><p>Check your pill box or organizer first. Your pharmacist can tell you what to do for this medicine.</p><p style="font-size:.88rem">If you think you took too much, call poison control or your local emergency number.</p></div>' +
      '<button class="btn btn-dark btn-block" style="margin-top:14px" data-act="sheet-close">OK</button>');
  }

  function ditSheet() {
    var s = S(), t = s.today, rows = '';
    t.plan.stacks.forEach(function (st) {
      var e = t.entries[st.id], line, ic, bg;
      if (st.kind === 'rest') { line = e ? 'Checked in at ' + E.fmtTime(e.at) + '. Nothing was due today.' : 'Nothing due today.'; ic = '☾'; bg = 'var(--neutral-bg)'; }
      else if (!e) { line = 'No entry yet today. If you’re unsure, check your pill box or ask your pharmacist.'; ic = '○'; bg = 'var(--neutral-bg)'; }
      else if (e.state === 'out') { line = 'Taken out at ' + E.fmtTime(e.outAt) + ', not confirmed swallowed. Check where you set it down.'; ic = '✋'; bg = 'var(--attn-bg)'; }
      else if ((e.state === 'swallowed' || e.state === 'took') && e.loggedLater) { line = E.doseStatus(e, st, s.clock).label + '.'; ic = '✓'; bg = 'var(--ok-bg)'; }
      else if (e.state === 'swallowed' || e.state === 'took') { line = (e.outAt ? 'Out ' + E.fmtTime(e.outAt) + ', swallowed ' + E.fmtTime(e.at) : 'Taken at ' + E.fmtTime(e.at)) + (e.later ? ' (logged later)' : '') + '.'; ic = '✓'; bg = 'var(--ok-bg)'; }
      else { line = E.doseStatus(e, st, s.clock).label + ', logged ' + E.fmtTime(e.at) + '.'; ic = E.doseStatus(e, st).icon; bg = 'var(--neutral-bg)'; }
      var meds = st.doses.map(function (d) { var m = St.medById(d.medId); return m ? m.name + (d.label ? ' ' + d.label : '') : ''; }).join(', ');
      rows += '<div class="fact"><span class="f-ic" style="background:' + bg + '">' + ic + '</span><div><div class="f-t">' + esc(st.kind === 'dose' ? st.label + ' stack · ' + E.fmtTime(st.mins) : stackTitle(st)) + '</div><div class="f-s">' + esc(line) + '</div>' + (meds ? '<div class="f-s" style="color:var(--muted);font-size:.85rem">' + esc(meds) + '</div>' : '') + '</div></div>';
    });
    t.prn.filter(function (p) { return p.medId; }).forEach(function (p) { var m = St.medById(p.medId); rows += '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">•</span><div><div class="f-t">' + esc(m.name) + ' (as needed)</div><div class="f-s">Logged ' + E.fmtTime(p.at) + '.</div></div></div>'; });
    var y = St.yesterday(), yRows = '';
    if (y && s.day - y.dayNum <= 1) {
      y.plan.stacks.forEach(function (st) {
        var e = y.entries[st.id] || { state: 'none' };
        if (st.kind !== 'dose') return;
        var label = e.state === 'none' ? 'No entry' : e.state === 'unsure' ? (e.fromOut ? 'Taken out, not confirmed swallowed' : 'Not sure') : E.doseStatus(e, st, 1439).label;
        var canFix = e.state === 'none' || e.state === 'unsure';
        yRows += '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">' + (canFix ? '○' : '✓') + '</span><div class="grow"><div class="f-t">' + esc(st.label) + ' stack</div><div class="f-s">' + esc(label) + '</div>' +
          (canFix ? '<div class="btn-row" style="margin-top:8px"><button class="btn btn-soft" data-act="backfill" data-s="' + st.id + '" data-a="took">I took it</button><button class="btn btn-soft" data-act="backfill" data-s="' + st.id + '" data-a="didnt">Didn’t take</button></div>' : '') + '</div></div>';
      });
    }
    U.sheet('Did I take it?', rows + (yRows ? '<h3 style="margin-top:16px;font-size:1rem;font-weight:900">Yesterday, ' + esc(E.fmtDate(y.dayNum)) + '</h3>' + yRows : '') +
      '<p class="muted" style="font-size:.85rem;font-weight:600;margin-top:14px">This shows what you logged, with exact times. It isn’t medical advice.</p>', { sub: esc(E.fmtDateLong(s.day)) + ' · now ' + E.fmtTime(s.clock) });
  }

  function prnSheet(medId) {
    var s = S(), m = St.medById(medId), l = St.lastPrn(medId), today = s.today.prn.filter(function (p) { return p.medId === medId; }).length;
    var facts = (l ? '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">◷</span><div><div class="f-t">Last logged</div><div class="f-s">' + (l.day === s.day ? 'Today' : E.fmtDate(l.day)) + ', ' + E.fmtTime(l.at) + '</div></div></div>' : '') +
      '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">#</span><div><div class="f-t">Logged today</div><div class="f-s">' + today + '</div></div></div>';
    U.sheet('Log ' + m.name + (m.strength ? ' ' + m.strength : '') + '?', facts +
      '<div class="field" style="margin-top:12px"><div class="lab">Time</div><div class="chips"><button class="chip-btn on">Now · ' + E.fmtTime(s.clock) + '</button><button class="chip-btn" data-act="prn-earlier" data-m="' + medId + '">15 min ago</button></div></div>' +
      '<button class="btn btn-dark btn-block" data-act="prn-log" data-m="' + medId + '" data-autofocus>Log it</button>', { clin: true, sub: 'As needed · for your own record' });
  }
  function prnPickSheet() {
    var plan = S().today.plan;
    U.sheet('What did you use?', '<div class="opt-list">' + plan.prn.map(function (id) { var m = St.medById(id); return '<button class="opt" data-act="prn-log" data-m="' + id + '">' + A.pill(m) + '<span><span class="o-t">' + esc(m.name) + '</span></span></button>'; }).join('') + '</div>', { clin: true });
  }

  function tripOpen() {
    var s = S(), tm = th(), h = s.trip.haul; if (!h) return;
    var best = h.finds[0], art = Th.findArt(tm, best.id), dest = destName(s.trip.dest) || tm.destinations[0];
    U.sfx('reveal');
    U.full('<div class="postcard"><div class="pc-art">' + A.scenery(s.theme) + '<span class="pc-find">' + art.icon + '</span><div class="pc-stamp">' + dest.icon + '</div></div>' +
      '<div class="pc-name">' + esc(art.name) + ' <span class="rar ' + best.rarity + '">' + best.rarity + '</span></div>' +
      '<div class="pc-msg">“' + esc(pick(tm.lines.postcards)) + '”</div><div class="pc-sign">— ' + esc(she()) + ', from ' + esc(dest.name) + '</div></div>' +
      '<div class="f-actions">' + (s.settings.simple && E.PU_ORDER.some(function (k) { return s.pu[k] > 0; }) && !h.boost ? '<button class="btn btn-clear" data-act="trip-boost">Use a power-up for 1 more find</button>' : '') + '<button class="btn btn-light" data-act="trip-unpack" data-autofocus>Unpack the haul</button></div>', { bg: s.theme === 'grove' ? 'grove-bg' : 'warm' });
  }
  function tripUnpack() {
    U.closeAll();
    var s = S(), tm = th(), h = s.trip.haul;
    var r = St.openTrip(); if (!r) return;
    U.sfx('chest');
    var cards = h.finds.map(function (f, i) { var a = Th.findArt(tm, f.id); return '<div class="rcard flipped r-' + f.rarity + '" style="animation-delay:' + (i * 120) + 'ms"><div class="rc-in"><div class="rc-face rc-back">?</div><div class="rc-face rc-front"><span class="em">' + a.icon + '</span><span class="nm">' + esc(a.name) + '</span><span class="tag">' + (f.dup ? 'Duplicate' : 'New!') + '</span></div></div></div>'; }).join('');
    var loot = '<span>+' + h.stars + ' ★</span>' + (r.powerUp && !r.powerUp.converted ? '<span>+1 ' + esc(tm.powerUps[r.powerUp.type].name) + '</span>' : '');
    U.full('<div class="f-title">' + esc(she()) + '’s haul</div><div class="f-sub">' + h.finds.length + ' ' + esc(tm.terms.finds) + ' for your ' + esc(tm.terms.album) + (h.boost ? ' · boosted by your ' + esc(tm.powerUps[h.boost].name) : '') + '</div>' +
      '<div class="reveal-cards">' + cards + '</div><div class="loot-line">' + loot + '</div>' +
      '<div class="f-actions"><button class="btn btn-light" data-act="ov-next" data-autofocus>Nice!</button></div>', { bg: s.theme === 'grove' ? 'grove-bg' : 'dark', onClose: function () { root.App.render(); if (r.levelUp) U.levelBanner(r.levelUp); } });
  }
  function tripSendSheet() {
    var tm = th();
    U.sheet('Where should ' + she() + ' go tonight?', '<div class="opt-list">' + tm.destinations.map(function (d) {
      return '<button class="opt" data-act="trip-go" data-d="' + d.id + '"><span style="font-size:2rem">' + d.icon + '</span><span><span class="o-t" style="display:block">' + esc(d.name.replace(/^the /, '').replace(/^./, function (c) { return c.toUpperCase(); })) + '</span><span class="o-s">' + esc(d.route) + '</span></span></button>';
    }).join('') + '</div><p class="muted" style="font-size:.88rem;font-weight:600;margin-top:12px">Every spot has the same odds. Fuller days pack a bigger haul.</p>');
  }

  function welcomeBack() {
    var s = S(), tm = th();
    U.full('<div class="rays"></div><div style="width:190px;height:190px;position:relative">' + A.companion(compDef(), 'delighted') + '</div>' +
      '<div class="f-title" style="margin-top:8px">' + esc(she()) + ' is so happy to see you</div><div class="f-sub">“' + esc(tm.lines.reunion) + '”</div>' +
      '<div class="f-sub" style="font-size:.95rem">Everything you’ve earned is right where you left it. Here’s a little welcome gift.</div>' +
      '<div class="loot-line"><span>' + E.CHESTS.bronze.label + ' ' + esc(tm.terms.chest) + '</span><span>+50 ★</span></div>' +
      '<div class="f-actions"><button class="btn btn-light" data-act="wb-claim" data-autofocus>Open my gift</button></div>', { bg: s.theme === 'grove' ? 'grove-bg' : 'warm' });
  }

  root.TodayUI = { ui: ui, earlierSheet: earlierSheet, render: render, after: after, ditSheet: ditSheet, powerUpDrop: powerUpDrop, welcomeBack: welcomeBack, destName: destName };
  root.App.screens.today = render;
  root.App.afterHooks.today = after;
  Object.assign(root.App.acts, {
    pillout: onPillOut, putback: onPutBack, ci: onCheckIn,
    dit: function () { ditSheet(); },
    backfill: function (el) {
      var r = St.backfill(el.getAttribute('data-s'), el.getAttribute('data-a')); U.closeAll(); root.App.render();
      if (r) { U.toast(el.getAttribute('data-a') === 'took' ? 'Saved. Thanks for keeping your record accurate.' : 'Saved as “Not taken.” Thanks for telling me.'); (r.drops || []).forEach(function (d) { powerUpDrop(d); }); }
    },
    prn: function (el) { prnSheet(el.getAttribute('data-m')); },
    'prn-pick': function () { prnPickSheet(); },
    'prn-log': function (el) { var at = el.getAttribute('data-at'); var r = St.logPrn(el.getAttribute('data-m'), at ? +at : null); U.closeAll(); root.App.render(); U.toast('Noted. Last logged ' + E.fmtTime(r.at) + '.'); },
    'prn-earlier': function (el) { var r = St.logPrn(el.getAttribute('data-m'), Math.max(0, S().clock - 15)); U.closeAll(); root.App.render(); U.toast('Noted. Last logged ' + E.fmtTime(r.at) + '.'); },
    'prn-none': function () { var r = St.prnNone(); root.App.render(); if (!r.ignored) U.toast('Noted.'); },
    'trip-open': tripOpen, 'trip-unpack': tripUnpack,
    'trip-boost': function () { var k = St.boostTrip(); U.closeAll(); if (root.QuestUI) root.QuestUI.openReturn(); else tripOpen(); if (k) U.toast('Your ' + esc(th().powerUps[k].name) + ' added a find.'); },
    'earlier-sheet': function (el) { earlierSheet(el.getAttribute('data-s')); },
    'ci-later': function (el) { var sid = el.getAttribute('data-s'); logEarlier(sid, el.getAttribute('data-unsure') ? { loggedLater: true, timeUnsure: true } : { loggedLater: true, doseMins: +el.getAttribute('data-t') }); },
    'ci-later-pick': function (el) { var v = (document.getElementById('earlierTime') || {}).value || ''; var p = v.split(':'); if (p.length < 2) { U.toast('Pick a time first.'); return; } logEarlier(el.getAttribute('data-s'), { loggedLater: true, doseMins: (+p[0]) * 60 + (+p[1]) }); },
    'other-toggle': function () { ui.other = !ui.other; root.App.render(); },
    'names-toggle': function () { ui.names = !ui.names; root.App.render(); },
    'headline-done': function () { var id = St.completeHeadline('load'); root.App.render(); if (id) root.CollectionUI.chestFx(id); },
    'trip-send': tripSendSheet,
    'trip-go': function (el) { St.sendTrip(el.getAttribute('data-d')); U.closeAll(); root.App.render(); var d = destName(el.getAttribute('data-d')); U.toast(esc(she()) + ' heads to ' + esc(d.name) + ' tonight. Come see what comes back in the morning.'); },
    'wb-claim': function () { var r = St.claimWelcome(); U.closeAll(); root.App.render(); if (r) root.CollectionUI.chestFx(r.chestId); },
    'hr-ack': function () { S().flags.highRisk = null; St.save(); root.App.render(); U.toast('Thanks. Noted in your record.'); },
    'fake-call': function (el) { U.toast('This would call your ' + esc(el.getAttribute('data-who')) + ' (prototype).'); },
    'ov-next': function () { var top = U.topOverlay(); U.closeOverlay(top); }
  });
})(window);
