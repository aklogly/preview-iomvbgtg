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
    return st.label;
  }
  function itemOf(d) { return St.medById(d.medId); }
  function habitOnly(st) { return st.kind === 'dose' && st.doses.length && st.doses.every(function (d) { var m = itemOf(d); return m && E.itemType(m) === 'habit'; }); }
  function anyHabit(st) { return st.doses.some(function (d) { var m = itemOf(d); return m && E.itemType(m) === 'habit'; }); }
  // Two taps (Pill out, then Swallowed) only when the check-in holds a medicine or vitamin set to two taps.
  function stackTwoStep(st) { var g = S().settings.twoStep; return st.doses.some(function (d) { var m = itemOf(d); return m && E.itemType(m) !== 'habit' && (m.twoStep == null ? g : !!m.twoStep); }); }
  // One function for "3 things" / "3 medicines" / "3 habits".
  function countWord(st) {
    var types = st.doses.map(function (d) { var m = itemOf(d); return m ? E.itemType(m) : 'med'; }), n = types.length;
    var all = function (t) { return types.every(function (x) { return x === t; }); };
    return n + ' ' + (all('med') ? 'medicines' : all('habit') ? 'habits' : all('vitamin') ? 'vitamins' : 'things');
  }
  function medNames(st) { return st.doses.map(function (d) { var m = St.medById(d.medId); return m ? m.name + (d.label ? ' ' + d.label : '') : ''; }).filter(Boolean); }
  function stackSub(st) {
    if (st.kind === 'rest') return 'Nothing due today';
    if (st.kind === 'journal') return 'Any honest answer counts';
    var n = st.doses.length;
    if (n === 1) return medNames(st)[0] + ' · ' + E.fmtTime(st.mins);
    return countWord(st) + ' · ' + E.fmtTime(st.mins);
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
    E.PU_ORDER.forEach(function (k) { if (pu[k] > 0 && (!best || (src[k] && /check-in|rest|journal|Boss/i.test(src[k])))) best = k; });
    return best;
  }

  /* ---------- hero ---------- */
  function heroHtml() {
    var s = S(), t = s.today, open = St.openStack(), entry = open && t.entries[open.id], tm = th();
    if (!open) return compactHero();
    var phase = E.stackPhase(open, entry, s.clock);
    // Upcoming (more than 60 min away): show what's next, not what to do. The full card returns 60 min before the dose.
    if (phase === 'upcoming' && ui.early !== open.id && open.kind === 'dose') return upcomingHero(open);
    var boss = open.boss;
    var mood = phase === 'out' ? 'holding' : 'happy';
    var away = St.tripOvernight(), back = s.trip.status === 'back' && !away;
    var speech = away ? she() + ' is out on ' + questName() + '. Back around 6:00 AM.' : phase === 'out' ? tm.lines.holding : phase === 'past' ? 'Tell me how it went. Every answer counts.' : back ? 'Look what I found on ' + questName() + '.' : boss ? 'A boss! We’ve got this.' : pick(tm.lines.hello);
    var title = boss ? 'Boss Day' : away ? she() + ' is out tonight' : phase === 'past' ? 'Checking in' : back ? she() + '’s back!' : she() + '’s ready';
    var pieces = St.piecesFor(), sr = pieceLabel();
    var stage = boss
      ? '<div class="core-wrap boss-wrap" id="coreWrap">' + root.Items.boss(false) + '</div><div class="core-label" aria-hidden="true">One dose beats it</div>'
      : '<button type="button" class="core-wrap core-btn" id="coreWrap" data-act="spark-how" aria-label="' + esc(sr) + '. How today’s ' + esc(tm.terms.charge) + ' fills">' + A.core(pieces, coreStyle(), { label: sr }) + '</button><div class="core-label" aria-hidden="true">' + esc(sr) + '</div>';
    return '<section class="hero' + (boss ? ' boss' : '') + '" aria-label="Today">' + A.scenery(s.theme) +
      (boss ? '<div class="boss-banner">⚔ BOSS DAY · This week’s boss is here</div>' : '') +
      '<div class="hero-inner">' + feedBtn() +
        '<div class="hero-head"><div><div class="hero-kicker">' + esc(E.fmtDateLong(s.day)) + '</div><div class="hero-title">' + esc(title) + '</div></div></div>' +
        '<div class="stage-row">' +
          (speech ? '<div class="speech" id="speech">' + esc(speech) + '</div>' : '') +
          (away ? '<div class="comp-wrap away-camp" id="compWrap" aria-label="' + esc(she()) + ' is out tonight">' + emptyCamp() + '</div>' : '<button type="button" class="comp-wrap comp-btn" id="compWrap" data-act="go" data-to="companion" aria-label="' + esc(she()) + ': level, gear and Feed"><div class="c-idle">' + A.companion(compDef(), mood, { aura: campAura() }) + '</div>' + (mood === 'holding' ? '<div class="held-frag" id="heldFrag">' + A.fragment(coreStyle()) + '</div>' : '') + '</button>') +
          stage +
        '</div>' +
        stackCardHtml(open, entry, phase) +
      '</div></section>';
  }
  /* ---------- the upcoming state (UX review §C) ---------- */
  function upNextHtml(open) {
    var names = medNames(open), sub = (open.doses.length === 1 ? names[0] : countWord(open)) + ' · We’ll remind you then';
    var label = 'Next check-in: ' + open.label + ' · ' + E.fmtTime(open.mins);
    return '<button type="button" class="up-next" data-act="log-early" data-s="' + open.id + '" aria-label="' + esc('Next check-in, ' + open.label + ' at ' + E.fmtTime(open.mins) + ', ' + names.join(', ') + '. Log it early.') + '">' +
      '<span class="un-ic" aria-hidden="true">◷</span><span class="un-main"><span class="un-t">' + esc(label) + '</span><span class="un-s">' + esc(sub) + '</span></span><span class="un-early">Log it early</span></button>';
  }
  function upcomingHero(open) {
    if (St.tripOvernight()) return overnightHero(open);
    var s = S(), t = s.today, back = s.trip.status === 'back' && !St.tripOvernight();
    var anyDone = t.plan.stacks.some(function (x) { var e = t.entries[x.id]; return e && e.state !== 'out'; });
    var title = back ? she() + '’s back!' : anyDone ? 'Done for now' : she() + '’s ready';
    return '<section class="hero compact upcoming" aria-label="Today">' + A.scenery(s.theme) +
      '<div class="hero-inner compact-inner">' +
        '<button type="button" class="mini-comp comp-btn" id="compWrap" data-act="go" data-to="companion" aria-label="' + esc(she()) + ': level and gear"><div class="c-idle">' + A.companion(compDef(), 'happy', { aura: campAura() }) + '</div></button>' +
        '<div class="compact-text"><div class="hero-kicker">' + esc(E.fmtDateLong(s.day)) + '</div><div class="hero-title">' + esc(title) + '</div>' +
        (doneChips() ? '<div class="done-chips">' + doneChips() + '</div>' : '') + feedBtn() + '</div>' +
        '<button type="button" class="mini-core core-btn" id="coreWrap" data-act="spark-how" aria-label="' + esc(pieceLabel()) + '">' + A.core(St.piecesFor(), coreStyle(), { label: pieceLabel() }) + '</button>' +
      '</div>' + upNextHtml(open) + '</section>';
  }
  // Feed stays one tap on Today (it lights the Campfire): a small button by the companion.
  function feedBtn() {
    var s = S(); if (!s.today || s.settings.simple) return '';
    if (s.today.fed) return '<span class="feed-btn feed-done">✓ ' + esc(she()) + ' had a treat</span>';
    return '<button type="button" class="feed-btn" data-act="camp-feed" id="feedBtn">' + th().camp.treatIcon + ' Feed ' + esc(she()) + '</button>';
  }
  // Once everything's answered, the hero collapses to a compact strip so the game sits above the fold.
  function compactHero() {
    var s = S(), t = s.today, tm = th(), overnight = St.tripOvernight(), away = overnight || (t.tripSent && (t.gameDone || s.settings.simple) && s.trip.status !== 'back');
    var wasBoss = t.plan.boss;
    if (overnight) return overnightHero();
    var art = wasBoss ? '<div class="mini-core">' + root.Items.boss(true) + '</div>' : '<div class="mini-core" id="coreWrap">' + A.core(St.piecesFor(), coreStyle(), { label: pieceLabel() }) + '</div>';
    var bossHeld = wasBoss && t.plan.stacks.some(function (x) { return x.boss && t.entries[x.id] && t.entries[x.id].state === 'held'; });
    var title = answeredHonest() ? 'Answered for today' : bossHeld ? 'Checked in ✓' : wasBoss ? 'Boss beaten ✓' : 'All set ✓';
    var nb = St.nextBossDay();
    var sub = answeredHonest() ? 'Answered. Thanks for being honest.' : bossHeld ? 'The boss will be back on ' + (nb ? E.fmtDate(nb) : 'your next dose day') + '.' : wasBoss ? 'The boss is napping until ' + (nb ? E.fmtDate(nb) : 'your next dose day') + '.' : pieceLabel();
    return '<section class="hero compact" aria-label="Today">' + A.scenery(s.theme) + '<button type="button" class="hero-tap" data-act="dit" aria-label="See today’s record"></button>' +
      '<div class="hero-inner compact-inner">' +
        (away ? '<div class="mini-comp away"><span>' + esc(she()) + ' is ' + esc(tm.lines.away) + '</span></div>' : '<div class="mini-comp" id="compWrap"><div class="c-idle">' + A.companion(compDef(), 'delighted', { aura: campAura() }) + '</div></div>') +
        '<div class="compact-text"><div class="hero-kicker">' + esc(E.fmtDateLong(s.day)) + '</div><div class="hero-title">' + esc(title) + '</div><div class="compact-sub">' + esc(sub) + '</div>' +
        '<div class="done-chips">' + doneChips() + '</div>' + feedBtn() + '</div>' + art +
      '</div></section>';
  }

  function doneChips() {
    var t = S().today, chips = '';
    t.plan.stacks.forEach(function (st) {
      var e = t.entries[st.id]; if (!e || e.state === 'out') return;
      var ds = E.doseStatus(e, st, S().clock);
      var lab = E.recordLabel(e, st, { clock: S().clock, habit: habitOnly(st) });
      chips += '<button type="button" class="chip ' + lab.tone + '" data-act="dit">' + lab.icon + ' ' + esc(st.kind === 'dose' ? st.label : stackTitle(st)) + ' · ' + esc(lab.label) + '</button>';
    });
    return chips;
  }
  function upcomingChips(openId) {
    var t = S().today, chips = '', seen = false;
    t.plan.stacks.forEach(function (st) {
      if (st.id === openId) { seen = true; return; }
      if (!seen || t.entries[st.id]) return;
      chips += '<button type="button" class="chip upcoming" data-act="dit">◷ ' + esc(st.label) + ' · ' + E.fmtTime(st.mins) + '</button>';
    });
    return chips;
  }

  function stackCardHtml(open, entry, phase, plain) {
    var s = S();
    var seen = {}, pills = open.doses.map(function (d) { var m = St.medById(d.medId), t = m ? E.itemType(m) : 'med'; if (seen[t]) return ''; seen[t] = 1; return A.itemIcon(m || {}); }).join('');
    var top = '<div class="stack-top"><div class="grow"><div class="stack-name">' + esc(phase === 'past' ? 'How did your ' + open.label.toLowerCase() + ' go?' : stackTitle(open)) + '</div><div class="stack-sub">' + esc(stackSub(open)) + '</div>' + namesList(open) + '</div><div class="pills">' + pills + '</div></div>';
    var body = '', twoStep = stackTwoStep(open), sid = open.id, hab = habitOnly(open), mixedHabit = anyHabit(open);
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
      body = '<div class="answer-col"><button class="btn btn-2 btn-block" data-act="earlier-sheet" data-s="' + sid + '">✓ ' + (hab ? 'Did it earlier' : 'Took it earlier') + '</button>' +
        '<div class="answer-row"><button class="btn" data-act="ci" data-a="didnt" data-s="' + sid + '">' + (hab ? 'Not today' : 'Didn’t take') + '</button>' + (hab ? '' : '<button class="btn" data-act="ci" data-a="unsure" data-s="' + sid + '">Not sure</button>') + '</div></div>';
    } else {
      var n = open.doses.length, tookAll = n > 1 ? (mixedHabit ? 'All ' + n + ' done' : 'Took all ' + n) : (hab || open.boss ? 'Done' : 'Took it');
      if (hab) {
        // Habits: one-tap Done. Pill out / Swallowed only applies when the check-in holds a medicine or vitamin.
        var hOther = '<div class="other-row">' + (ui.other ? '<button class="btn" data-act="ci" data-a="didnt" data-s="' + sid + '">Not today</button>' : '') + '</div>';
        body = '<button class="btn btn-cta btn-block" data-act="ci" data-a="took" data-s="' + sid + '"><span class="big-ic">✓</span> ' + tookAll + '</button><div class="answer-row"><button class="btn" data-act="other-toggle" aria-expanded="' + ui.other + '">Other answer ' + (ui.other ? '▴' : '▾') + '</button></div>' + hOther;
      } else {
        var outWord = open.boss ? 'Pen ready' : n > 1 ? 'Pills out' : 'Pill out';
        var primary = twoStep
          ? '<button class="btn btn-cta btn-block" data-act="pillout" data-s="' + sid + '"><span class="big-ic">✋</span> ' + outWord + '</button>'
          : '<button class="btn btn-cta btn-block" data-act="ci" data-a="took" data-s="' + sid + '"><span class="big-ic">✓</span> ' + tookAll + '</button>';
        var second = twoStep
          ? '<button class="btn" data-act="ci" data-a="took" data-s="' + sid + '">✓ ' + tookAll + '</button>'
          : '<button class="btn" data-act="pillout" data-s="' + sid + '">✋ ' + (n > 1 ? 'Pills out' : 'Pill out') + '</button>';
        body = primary + '<div class="answer-row">' + second + '<button class="btn" data-act="other-toggle" aria-expanded="' + ui.other + '">Other answer ' + (ui.other ? '▴' : '▾') + '</button></div>' + other;
      }
    }
    var chips = doneChips() + upcomingChips(open.id);
    var early = phase === 'upcoming' && ui.early === open.id ? '<p class="early-line">It’s ' + E.fmtTime(s.clock) + '. Logging now records ' + E.fmtTime(s.clock) + '.</p>' : '';
    return '<div class="stack-card' + (ui.busy ? ' busy' : '') + (plain ? ' plain' : '') + '">' + early + top + body + (chips ? '<div class="done-chips">' + chips + '</div>' : '') + '</div>';
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
  // Weekly headline (F-6, decided per week): the same Gold chest for everyone. A Boss Day this week -> "Beat the Boss";
  // otherwise "Load the week". Every open row is a button that goes to its thing; done rows are plain text.
  function weeklyHtml() {
    var done = St.headlineDone(), bd = St.bossDayThisWeek(), chest = esc(th().terms.chest.toLowerCase());
    if (bd != null) {
      if (done) return '<div class="qcard weekly done"><span class="q-ic">✓</span><span class="q-text">This week: beat the Boss<span class="q-sub">Gold ' + chest + ' earned</span></span><span class="q-rew">Weekly</span></div>';
      return '<button type="button" class="qcard weekly go" data-act="goal-go" data-g="boss"><span class="q-ic">⚔</span><span class="q-text">This week: beat the Boss on ' + (bd === S().day ? 'today’s dose' : esc(E.fmtDate(bd))) + '<span class="q-sub">Gold ' + chest + '</span></span><span class="q-rew">Weekly</span>' + A.icon('chev') + '</button>';
    }
    if (done) return '<div class="qcard weekly done"><span class="q-ic">✓</span><span class="q-text">Load the week: fill your pill organizer<span class="q-sub">Gold ' + chest + ' earned</span></span><span class="q-rew">Weekly</span></div>';
    return '<div class="qcard weekly go-row"><button type="button" class="q-main" data-act="goal-go" data-g="load"><span class="q-ic">🗓</span><span class="q-text">Load the week: fill your pill organizer<span class="q-sub">Gold ' + chest + ', once a week</span></span></button><button class="btn btn-soft q-btn" data-act="headline-done">Done</button></div>';
  }
  var QICON = { two: '🎲', checkin: '✅', run: '🎲', run2: '⭐', chest: '🎁', place: '🏕️', album: '📖' };
  // Today's goals (was "Today's quests"): every open row is a button that takes you to the thing. Done rows are not buttons.
  function questsHtml() {
    var tm = th();
    return S().today.quests.map(function (q) {
      var txt = esc(Th.fill(q.text, tm)) + (q.swapped && !q.done ? ' <span class="q-new">new</span>' : '');
      if (q.done) return '<div class="qcard done"><span class="q-ic">✓</span><span class="q-text">' + txt + '</span><span class="q-rew">+' + q.reward.stars + ' ★</span></div>';
      return '<button type="button" class="qcard go" data-act="goal-go" data-g="' + q.goal + '"><span class="q-ic">' + (QICON[q.goal] || '✨') + '</span><span class="q-text">' + txt + '</span><span class="q-rew">+' + q.reward.stars + ' ★</span>' + A.icon('chev') + '</button>';
    }).join('');
  }
  function prnHtml() {
    var s = S(), plan = s.today.plan; if (!plan.prn.length || plan.journal) return '';
    var chips = plan.prn.map(function (id) { var m = St.medById(id); return '<button class="prn-chip" data-act="prn" data-m="' + id + '">' + A.itemIcon(m) + esc(m.name) + '</button>'; }).join('');
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
    var runOk = s.settings.simple || t.gameDone || t.run;
    var nextGame = root.GamesUI ? root.GamesUI.games().filter(function (g) { return !root.GamesUI.played(g); })[0] : null;
    if (!St.allAnswered() || !runOk || !t.tripSent || s.trip.status === 'back') return '';
    var g = St.growth(), q = s.trip.quest ? (root.Story.T(s.theme).quests[s.trip.quest] || {}).name : null;
    var tomorrow = 'Tomorrow: ' + [q ? esc(she()) + ' is back from ' + esc(q) : esc(she()) + ' is back with a story', 'new games', g.next && St.campOn() ? g.next.daysLeft + ' day' + (g.next.daysLeft === 1 ? '' : 's') + ' to the next growth stage' : null].filter(Boolean).join(' · ');
    return '<section class="alldone" aria-label="All done for today"><div class="ad-comp">' + A.companion(compDef(), 'wave') + '</div><div><h3>All done for today</h3><p>“' + esc(th().lines.signoff) + '”</p><p class="ad-tomorrow">' + tomorrow + '</p>' +
      '<div class="ad-links"><button data-act="tab" data-t="collection">Decorate ' + esc(th().terms.home) + '</button>' + (nextGame ? '<button data-act="game-intro" data-g="' + nextGame + '">Play ' + esc(root.GamesUI.name(nextGame)) + '</button>' : '<button data-act="game-intro" data-g="trail" data-practice="1">Practice board</button>') + '</div></div></section>';
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
    // Top bar: every number has a label or icon and taps to a one-screen explainer.
    var top = '<div class="topbar' + (campChip ? ' has-camp' : '') + (s.people ? ' has-person' : '') + '">' +
      (s.people ? '<button class="person-sw" data-act="go" data-to="family"><span class="avatar" style="background:#0a6b61">D</span>Dan ▾</button>' : campChip ? '' : '<div class="brand" aria-label="Kindling">' + A.logo(30) + '</div>') +
      '<div class="spacer"></div>' +
      campChip +
      (s.settings.simple ? '' : '<button class="pill-stat lv-pill" data-act="go" data-to="companion" aria-label="' + esc(s.comp.name) + ' is level ' + lv.level + '. Open ' + esc(s.comp.name) + '">Lv ' + lv.level + '</button>') +
      '<button class="pill-stat st-pill" data-act="stars-sheet" aria-label="' + s.stars + ' Stars. What Stars are for"><span class="st">★</span>' + U.fmtNum(s.stars) + '</button>' +
      '<button class="dit-btn" data-act="dit">' + A.icon('clock') + 'Did I take it?</button></div>';
    var hr = safetyHtml(), open = St.openStack();
    // A high-risk alert never hides the check-in: plain safety card first, then a plain check-in card for the rest.
    var oph = open && E.stackPhase(open, s.today.entries[open.id], s.clock);
    var html = top + hr + (hr ? (open ? '<section class="plain-stack">' + (oph === 'upcoming' && ui.early !== open.id && open.kind === 'dose' ? upNextHtml(open) : stackCardHtml(open, s.today.entries[open.id], oph, true)) + '</section>' : '') : heroHtml()) + assistHtml();
    if (s.trip.status === 'back' && !St.tripOvernight()) html += '<div class="sec-h"><h2>This morning</h2></div>' + tripTile();
    var games = root.GamesUI ? root.GamesUI.card() : '';
    if (!s.settings.simple) {
      html += games;
      if (s.trip.status !== 'back' && !St.tripOvernight()) html += '<div class="sec-h"><h2>Tonight’s ' + esc(tm.terms.trip.toLowerCase()) + '</h2></div>' + tripTile();
      html += chestsWaiting();
      html += '<div class="sec-h"><h2>Today’s goals</h2><span class="sub">' + s.today.quests.filter(function (q) { return q.done; }).length + ' of 3</span></div>' + questsHtml() + weeklyHtml();
    } else {
      html += root.CampUI ? root.CampUI.simpleLine() : '';
      if (s.trip.status !== 'back' && !St.tripOvernight()) html += tripTile();
      html += chestsWaiting();
      html += games + weeklyHtml();
    }
    html += prnHtml();
    html += allDoneHtml();
    html += '<div class="more-row">' + A.icon('shield', '') + ' Nothing about your medicines is shared. Taking more never earns more.</div><div style="height:16px"></div>';
    return html;
  }

  /* ---------- Live mode: the empty campsite overnight ---------- */
  function questName() { var q = S().trip.quest; var st = root.Story && root.Story.T(S().theme); return q && st && st.quests[q] ? st.quests[q].name : 'a ' + th().terms.trip.toLowerCase(); }
  function emptyCamp() {
    return '<svg class="empty-camp" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="100" rx="46" ry="9" fill="rgba(0,0,0,.12)"/>' +
      '<path d="M30 96 L52 52 L74 96 Z" fill="#f3e2c4" stroke="#7a5a3a" stroke-width="3" stroke-linejoin="round"/><path d="M52 52 L52 96" stroke="#7a5a3a" stroke-width="2.5"/>' +
      '<g class="lantern"><rect x="82" y="78" width="12" height="16" rx="3" fill="#ffd65e" stroke="#7a5a3a" stroke-width="2.5"/><path d="M85 78 q3 -7 6 0" fill="none" stroke="#7a5a3a" stroke-width="2.5"/><circle cx="88" cy="86" r="10" fill="rgba(255,214,94,.28)"/></g>' +
      '<g fill="#7a5a3a" opacity=".55"><ellipse cx="100" cy="104" rx="2.6" ry="1.6"/><ellipse cx="106" cy="100" rx="2.6" ry="1.6"/><ellipse cx="112" cy="104" rx="2.6" ry="1.6"/><ellipse cx="118" cy="100" rx="2.6" ry="1.6"/></g></svg>';
  }
  function nightTrail() {
    var c = S().clock, from = St.DEPART, to = 1440 + St.RETURN, now = c < 600 ? c + 1440 : c;
    var pct = Math.max(0, Math.min(100, Math.round(100 * (now - from) / (to - from))));
    return '<div class="night-trail" role="img" aria-label="Back around 6:00 AM"><span aria-hidden="true">🌙</span><div class="nt-bar"><i style="left:' + pct + '%"></i></div><span aria-hidden="true">☀️</span></div>';
  }
  function overnightHero(upNext) {
    var s = S();
    return '<section class="hero compact night" aria-label="Today">' + A.scenery(s.theme) +
      '<div class="hero-inner compact-inner"><div class="mini-comp away-camp" id="compWrap">' + emptyCamp() + '</div>' +
      '<div class="compact-text"><div class="hero-kicker">' + esc(E.fmtDateLong(s.day)) + '</div><div class="hero-title">' + esc(she()) + ' is out on ' + esc(questName()) + '</div><div class="compact-sub">Back around 6:00 AM.</div>' + nightTrail() +
      '<div class="done-chips">' + doneChips() + '</div>' + feedBtn() + '</div></div>' + (upNext ? upNextHtml(upNext) : '') + '</section>';
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
    ui.early = null;
    if (fx.already) { root.App.render(); U.toast(fx.at != null ? 'Already logged at ' + E.fmtTime(fx.at) + '.' : 'Already logged.'); return; }
    ui.other = false; ui.names = false;
    var full = fx.answer === 'swallowed' || fx.answer === 'took' || fx.answer === 'rest' || fx.answer === 'journal';
    if (full) {
      ui.busy = true; var card = el.closest('.stack-card'); if (card) card.classList.add('busy');
      U.fly(from, to, A.fragment(coreStyle()), function () { ui.busy = false; root.App.render(); celebrate(fx, idx); });
    } else if (ans === 'held') {
      root.App.render();
      corePieceEls(idx).forEach(function (p) { p.classList.add('just-filled'); });
      U.toast(fx.bossChest ? bossBack() + ' Chest earned for checking in.' : 'Held by your care team. That counts as following your plan.');
      afterRewards(fx);
    } else if (ans === 'didnt') {
      root.App.render();
      U.sfx('soft');
      honestSheet(fx, st);
      if (fx.bossChest) U.toast(bossBack() + ' Chest earned for checking in.');
    } else if (ans === 'unsure') {
      root.App.render();
      unsureSheet(fx, st);
      if (fx.bossChest) U.toast(bossBack() + ' Chest earned for checking in.');
    }
  }
  function bossBack() { var nb = St.nextBossDay(); return 'The boss will be back on ' + (nb ? E.fmtDate(nb) : 'your next dose day') + '.'; }
  /* "Took it earlier": ask WHEN. The entered time becomes the dose time; the tap time is only the "logged at" time. */
  function earlierSheet(sid) {
    var st = St.stackById(sid); if (!st) return;
    var s = S(), dflt = Math.min(st.mins, s.clock), hh = ('0' + Math.floor(dflt / 60)).slice(-2) + ':' + ('0' + dflt % 60).slice(-2);
    var maxT = ('0' + Math.floor(s.clock / 60)).slice(-2) + ':' + ('0' + s.clock % 60).slice(-2);
    U.sheet('About what time?', '<p class="muted" style="margin-bottom:12px">So “Did I take it?” shows the right time later.</p><div class="opt-list">' +
      '<button class="opt" data-act="ci-later" data-s="' + sid + '" data-t="' + st.mins + '"><span class="o-t">Around ' + E.fmtTime(st.mins) + ' (scheduled)</span></button>' +
      '<button class="opt" data-act="ci-later-wheel" data-s="' + sid + '" data-t="' + dflt + '"><span class="o-t">Pick a time ›</span></button>' +
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
    var pops = cr.stars + cr.onTimeStars > 0 ? ['+' + (cr.stars + cr.onTimeStars) + ' ★'] : [];
    if (fx.compXp) pops.push('+' + fx.compXp + ' XP');
    if (cr.onTimeStars) pops.push('On-time bonus ✓');
    U.popAt(cw, pops);
    var sp = document.getElementById('speech');
    if (sp && !fx.full) sp.textContent = pick(tm.lines.caught);
    var line = fx.stack.kind === 'rest' ? 'Rest day: all set.' : fx.boss ? 'Boss Day: done!' : (fx.stack.label + ': done.');
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
    if (fx.quest) q.push(function (next) { U.toast('Goal done: ' + esc(Th.fill(fx.quest.text, th())) + ' +' + fx.quest.reward.stars + ' ★'); next(); });
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

  // "Didn't take": thanks, the record line, then "Make it easier" inline. One tap from here reaches the help itself.
  function honestSheet(fx, st) {
    var tm = th(), hab = habitOnly(st), mid = st.doses[0] && st.doses[0].medId;
    U.sheet('Thanks for telling me', '<div class="row" style="align-items:flex-start"><div style="width:84px;height:84px;flex:0 0 84px">' + A.companion(compDef(), 'happy') + '</div><div><p style="font-weight:700;font-size:1.02rem">“' + esc(tm.lines.honest) + '”</p>' +
      '<div class="done-chips" style="margin-top:10px">' + (fx.compXp ? '<span class="chip ok">+' + fx.compXp + ' XP for ' + esc(she()) + '</span>' : '') + '' + (fx.quest ? '<span class="chip ok">✓ Check-in goal</span>' : '') + '<span class="chip neutral">Your record says “' + (hab ? 'Not today' : 'Not taken') + '”</span></div></div></div>' +
      root.MedsUI.reasonsHtml(mid) +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close" style="margin-top:6px">Not now</button>');
  }
  function unsureSheet(fx, st) {
    var e = S().today.entries[st.id];
    var fact = e && e.outAt ? 'Taken out at ' + E.fmtTime(e.outAt) + ', not confirmed swallowed. Check where you set it down.' : 'No other entry for this check-in today.';
    U.sheet('Marked as “Not sure”', '<p style="font-weight:700">Thanks for telling me. Your record stays accurate.</p>' +
      '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg);color:var(--neutral)">?</span><div><div class="f-t">' + esc(st.label) + ' · ' + E.fmtTime(st.mins) + '</div><div class="f-s">' + esc(fact) + '</div></div></div>' +
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
      else if ((e.state === 'swallowed' || e.state === 'took') && e.loggedLater) { line = E.recordLabel(e, st, { clock: s.clock, habit: habitOnly(st) }).label + '.'; ic = '✓'; bg = 'var(--ok-bg)'; }
      else if (e.state === 'swallowed' || e.state === 'took') { line = (e.outAt ? 'Out ' + E.fmtTime(e.outAt) + ', swallowed ' + E.fmtTime(e.at) : (habitOnly(st) ? 'Done at ' : 'Taken at ') + E.fmtTime(e.at)) + (e.later ? ' (logged later)' : '') + '.'; ic = '✓'; bg = 'var(--ok-bg)'; }
      else { var rl = E.recordLabel(e, st, { clock: s.clock, habit: habitOnly(st) }); line = rl.label + ', logged ' + E.fmtTime(e.at) + '.'; ic = rl.icon; bg = 'var(--neutral-bg)'; }
      var meds = st.doses.map(function (d) { var m = St.medById(d.medId); return m ? m.name + (d.label ? ' ' + d.label : '') : ''; }).join(', ');
      rows += '<div class="fact"><span class="f-ic" style="background:' + bg + '">' + ic + '</span><div><div class="f-t">' + esc(st.kind === 'dose' ? st.label + ' · ' + E.fmtTime(st.mins) : stackTitle(st)) + '</div><div class="f-s">' + esc(line) + '</div>' + (meds ? '<div class="f-s" style="color:var(--muted);font-size:.85rem">' + esc(meds) + '</div>' : '') + '</div></div>';
    });
    t.prn.filter(function (p) { return p.medId; }).forEach(function (p) { var m = St.medById(p.medId); rows += '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">•</span><div><div class="f-t">' + esc(m.name) + ' (as needed)</div><div class="f-s">Logged ' + E.fmtTime(p.at) + '.</div></div></div>'; });
    var y = St.yesterday(), yRows = '';
    if (y && s.day - y.dayNum <= 1) {
      y.plan.stacks.forEach(function (st) {
        var e = y.entries[st.id] || { state: 'none' };
        if (st.kind !== 'dose') return;
        var label = E.recordLabel(e, st, { past: true, habit: habitOnly(st) }).label;
        var canFix = e.state === 'none' || e.state === 'unsure';
        yRows += '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">' + (canFix ? '○' : '✓') + '</span><div class="grow"><div class="f-t">' + esc(st.label) + ' · ' + E.fmtTime(st.mins) + '</div><div class="f-s">' + esc(label) + '</div>' +
          (canFix ? '<div class="btn-row" style="margin-top:8px"><button class="btn btn-soft" data-act="backfill" data-s="' + st.id + '" data-a="took">I took it</button><button class="btn btn-soft" data-act="backfill" data-s="' + st.id + '" data-a="didnt">Didn’t take</button></div>' : '') + '</div></div>';
      });
    }
    U.sheet('Did I take it?', rows + (yRows ? '<h3 style="margin-top:16px;font-size:1rem;font-weight:900">Yesterday, ' + esc(E.fmtDate(y.dayNum)) + '</h3>' + yRows : '') +
      '<button type="button" class="ds-help" data-act="see-earlier">See earlier days ›</button>' +
      '<p class="muted" style="font-size:.85rem;font-weight:600;margin-top:14px">This shows what you logged, with exact times. It isn’t medical advice.</p>', { sub: esc(E.fmtDateLong(s.day)) + ' · now ' + E.fmtTime(s.clock) });
  }

  function prnSheet(medId) {
    var s = S(), m = St.medById(medId), l = St.lastPrn(medId), today = s.today.prn.filter(function (p) { return p.medId === medId; }).length;
    var facts = (l ? '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">◷</span><div><div class="f-t">Last logged</div><div class="f-s">' + (l.day === s.day ? 'Today' : E.fmtDate(l.day)) + ', ' + E.fmtTime(l.at) + '</div></div></div>' : '') +
      '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">#</span><div><div class="f-t">Logged today</div><div class="f-s">' + today + '</div></div></div>';
    U.sheet('Log ' + m.name + (m.strength ? ' ' + m.strength : '') + '?', facts +
      '<button class="btn btn-dark btn-block" style="margin-top:12px" data-act="prn-log" data-m="' + medId + '" data-autofocus>Log it now · ' + E.fmtTime(s.clock) + '</button>' +
      '<button class="btn btn-ghost btn-block" data-act="prn-wheel" data-m="' + medId + '">Earlier today ›</button>', { clin: true, sub: 'As needed · for your own record' });
  }
  function prnPickSheet() {
    var plan = S().today.plan;
    U.sheet('What did you use?', '<div class="opt-list">' + plan.prn.map(function (id) { var m = St.medById(id); return '<button class="opt" data-act="prn-log" data-m="' + id + '">' + A.itemIcon(m) + '<span><span class="o-t">' + esc(m.name) + '</span></span></button>'; }).join('') + '</div>', { clin: true });
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

  root.TodayUI = { ui: ui, goalGo: goalGo, habitOnly: habitOnly, earlierSheet: earlierSheet, render: render, after: after, ditSheet: ditSheet, powerUpDrop: powerUpDrop, welcomeBack: welcomeBack, destName: destName };
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
    // v5.5 round 2: the same time wheel as everywhere else. The time can't be later than now.
    'ci-later-wheel': function (el) {
      var sid = el.getAttribute('data-s'), d = +el.getAttribute('data-t'); U.closeAll();
      root.Wheel.sheet({ title: 'About what time?', cols: root.Wheel.timeCols(E.hhmm(d)), preview: function (v) { var m = E.gameMins(root.Wheel.timeFrom(v)); return m > S().clock ? 'That’s later than now. Pick an earlier time.' : 'Saves ' + E.fmtTime(m) + ' as the time you took it.'; },
        onDone: function (v) { var m = E.gameMins(root.Wheel.timeFrom(v)); if (m > S().clock) { U.toast('Pick a time before now.'); return; } logEarlier(sid, { loggedLater: true, doseMins: m }); } });
    },
    'prn-wheel': function (el) {
      var mid = el.getAttribute('data-m'); U.closeAll();
      root.Wheel.sheet({ title: 'When did you use it?', cols: root.Wheel.timeCols(E.hhmm(Math.max(0, S().clock - 15))), onDone: function (v) { var m = E.gameMins(root.Wheel.timeFrom(v)); if (m > S().clock) m = S().clock; var r = St.logPrn(mid, m); root.App.render(); U.toast('Noted. Last logged ' + E.fmtTime(r.at) + '.'); } });
    },
    'ci-later-pick': function (el) { var v = (document.getElementById('earlierTime') || {}).value || ''; var p = v.split(':'); if (p.length < 2) { U.toast('Pick a time first.'); return; } logEarlier(el.getAttribute('data-s'), { loggedLater: true, doseMins: (+p[0]) * 60 + (+p[1]) }); },
    'other-toggle': function () { ui.other = !ui.other; root.App.render(); },
    'names-toggle': function () { ui.names = !ui.names; root.App.render(); },
    'headline-done': function () { U.closeAll(); var id = St.completeHeadline('load'); root.App.render(); if (id) root.CollectionUI.chestFx(id); },
    'trip-send': tripSendSheet,
    'trip-go': function (el) { St.sendTrip(el.getAttribute('data-d')); U.closeAll(); root.App.render(); var d = destName(el.getAttribute('data-d')); U.toast(esc(she()) + ' heads to ' + esc(d.name) + ' tonight. Come see what comes back in the morning.'); },
    'wb-claim': function () { var r = St.claimWelcome(); U.closeAll(); root.App.render(); if (r) root.CollectionUI.chestFx(r.chestId); },
    'hr-ack': function () { S().flags.highRisk = null; St.save(); root.App.render(); U.toast('Thanks. Noted in your record.'); },
    'fake-call': function (el) { U.toast('This would call your ' + esc(el.getAttribute('data-who')) + ' (prototype).'); },
    'ov-next': function () { var top = U.topOverlay(); U.closeOverlay(top); },
    'goal-go': function (el) { goalGo(el.getAttribute('data-g')); },
    'log-early': function (el) { ui.early = el.getAttribute('data-s'); root.App.render(); var c = document.querySelector('#view .stack-card'); if (c) { var b = c.querySelector('.btn-cta'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { } } },
    'stars-sheet': function () { var s = S(), tm = th(); U.sheet('Stars ★', '<p style="font-weight:700">Stars are game money. You earn them from check-ins (any honest answer), daily games, goals and chests.</p><div class="fact"><span class="f-ic" style="background:var(--ok-bg)">★</span><div><div class="f-t">' + U.fmtNum(s.stars) + ' Stars</div><div class="f-s">Spend them on pieces for your ' + esc(tm.terms.home) + '.</div></div></div><p class="muted" style="font-size:.88rem;font-weight:600">Taking more never earns more. Every day is worth the same.</p><button class="btn btn-dark btn-block" style="margin-top:12px" data-act="goal-go" data-g="place">Spend them in Collection ›</button>'); },
    'spark-how': function () { var tm = th(), n = S().today.plan.stacks.length; U.sheet('How today’s ' + tm.terms.charge + ' fills', '<p style="font-weight:700">Every day is worth one full ' + esc(tm.terms.charge) + ', the same for everyone.</p><ul style="padding-left:20px;font-weight:600;line-height:1.6"><li>Today has ' + n + ' check-in' + (n === 1 ? '' : 's') + '. Each one fills ' + (n === 1 ? 'the whole thing' : 'an equal piece') + '.</li><li>Any honest answer counts toward ' + esc(she()) + '’s XP. “Didn’t take” still counts.</li><li>A full ' + esc(tm.terms.charge) + ' pops a power-up. Power-ups only add ' + esc(tm.terms.finds) + ', never game scores.</li><li>Rest days fill with one tap.</li></ul>'); }
  });
  /* Goal tap-through (F4): each open goal takes you to the thing itself. */
  function goalGo(g) {
    var s = S(); U.closeAll();
    var toToday = function () { root.App.ui.stack = []; root.App.ui.tab = 'today'; root.App.render(); };
    if (g === 'checkin' || g === 'boss') {
      var bd = g === 'boss' ? St.bossDayThisWeek() : null;
      if (g === 'boss' && bd != null && bd !== s.day) { U.sheet('The boss is coming', '<p style="font-weight:700">Your next dose day is ' + esc(E.fmtDate(bd)) + '. The boss shows up then.</p><p class="muted" style="font-weight:600">Any honest answer that day earns this week’s Gold ' + esc(th().terms.chest.toLowerCase()) + '.</p>'); return; }
      toToday();
      var card = document.querySelector('#view .stack-card'), btn = card && card.querySelector('.btn-cta, .btn-2, [data-act="earlier-sheet"]');
      if (card) { card.scrollIntoView({ block: 'center', behavior: U.calm() ? 'auto' : 'smooth' }); card.classList.add('pulse'); setTimeout(function () { card.classList.remove('pulse'); }, 1600); if (btn) try { btn.focus({ preventScroll: true }); } catch (e) { } }
      else ditSheet();
      return;
    }
    if (g === 'run' || g === 'run2' || g === 'two') { toToday(); if (root.GamesUI) root.GamesUI.intro(root.GamesUI.suggest()); return; }
    if (g === 'chest') { var c = s.chests.filter(function (x) { return !x.opened; })[0]; if (c) { root.CollectionUI.chestFx(c.id); return; } root.CollectionUI.setSeg('chests'); root.App.setTab('collection'); U.toast('Today’s games and goals bring more.'); return; }
    if (g === 'place') { root.CollectionUI.setSeg('home'); root.App.setTab('collection'); return; }
    if (g === 'album') { root.CollectionUI.setSeg('album'); root.App.setTab('collection'); return; }
    if (g === 'load') { U.sheet('Load the week', '<p style="font-weight:700">Fill your pill organizer for the week, then tap Done.</p><p class="muted" style="font-weight:600">Once a week. It earns this week’s Gold ' + esc(th().terms.chest.toLowerCase()) + '.</p><button class="btn btn-dark btn-block" style="margin-top:12px" data-act="headline-done">Done</button>'); return; }
  }
})(window);
