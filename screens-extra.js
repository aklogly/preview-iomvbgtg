/* Kindling v5 — screens-extra.js : Grand Draw, draw night, lock screen mock, share card, Run host, demo panel. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }

  /* ---------- Grand Draw ---------- */
  var PRIZES = [
    { em: '🏕️', name: 'Weekend cabin getaway', tier: 'Grand prize' },
    { em: '🎮', name: 'Handheld game console', tier: '2 winners' },
    { em: '🎧', name: 'Wireless headphones', tier: '5 winners' },
    { em: '🧸', name: 'Kindling companion plush', tier: '25 winners' }
  ];
  function draw() {
    var s = S(), tm = th();
    var stubs = ''; for (var i = 0; i < Math.min(s.tickets, 7); i++) stubs += '<span class="ticket-stub" style="transform:rotate(' + ((i % 3) - 1) * 4 + 'deg)">🎟️ #' + (4800 + i * 7 + s.day) + '</span>';
    var age = s.flags.age18;
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Today</button><div class="title">Grand Draw</div></div>' +
      '<section class="tile draw" style="margin-top:4px"><div class="deco">🎟️</div><div class="t-kicker">This season · draw night ' + esc(E.fmtDate(E.drawNightDay(s.day))) + '</div><div class="t-title">' + s.tickets + ' ticket' + (s.tickets === 1 ? '' : 's') + ' in the drum</div>' +
      '<div class="t-body">One ticket a day, for your first finished daily game. Tickets never come from medicines or check-ins.</div>' +
      (stubs ? '<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:12px">' + stubs + '</div>' : '') + '</section>' +
      (age === false ? '<div class="card"><h3>Not available on this account</h3><p>The Grand Draw is for people 18 and older. Everything else in Kindling works the same.</p></div>' :
        age ? '' : '<div class="card"><h3>Before your first ticket</h3><p>Prize draws have an age requirement. What year were you born?</p><div class="row" style="margin-top:10px"><input class="input" id="byear" inputmode="numeric" maxlength="4" placeholder="Year" style="border-color:var(--line)" aria-label="Birth year"><button class="btn btn-dark" data-act="age-ok">Continue</button></div></div>') +
      '<div class="sec-h"><h2>This season’s prizes</h2></div>' +
      PRIZES.map(function (p) { return '<div class="prize-flat"><div class="row"><span style="font-size:2.6rem;width:56px;text-align:center">' + p.em + '</span><div class="grow"><h3>' + esc(p.name) + '</h3><p style="margin-top:2px">' + esc(p.tier) + '</p><span class="legal-tag" style="margin-top:6px">Sample — pending legal review</span></div></div></div>'; }).join('') +
      '<div class="set-group"><button class="set-row" data-act="draw-how"><span class="sr-ic">' + A.icon('info') + '</span><span class="sr-main"><span class="sr-t" style="display:block">How it works</span><span class="sr-s">Tickets, odds, winners</span></span>' + A.icon('chev') + '</button>' +
      '<button class="set-row" data-act="draw-free"><span class="sr-ic">' + A.icon('note') + '</span><span class="sr-main"><span class="sr-t" style="display:block">Free entry</span><span class="sr-s">No purchase or app activity needed</span></span>' + A.icon('chev') + '</button>' +
      '<button class="set-row" data-act="draw-rules"><span class="sr-ic">' + A.icon('shield') + '</span><span class="sr-main"><span class="sr-t" style="display:block">Official rules (sample)</span><span class="sr-s">18+, where permitted</span></span>' + A.icon('chev') + '</button></div>' +
      '<p class="muted" style="margin:0 18px 30px;font-size:.82rem;font-weight:600">Prototype: real-value prizes would launch only after legal review. Entries are never for sale. Winners are never announced by name.</p>';
  }
  function drawNight() {
    U.closeAll();
    var s = S(), num = 4800 + s.day;
    if (s.flags.age18 === false || !s.tickets) {
      var why = s.flags.age18 === false ? 'The Grand Draw is for people 18 and older, so this account wasn’t entered. Everything else in Kindling works the same.' : 'You didn’t have tickets in this draw. Finish a daily game to add one for the next draw.';
      U.full('<div class="f-title">Draw night</div><div class="f-sub">Tonight’s winners have been drawn.</div><div class="f-sub" style="margin-top:14px">' + why + '</div>' +
        '<div class="f-actions"><button class="btn btn-light" data-act="ov-next" data-autofocus>OK</button></div>', { bg: 'dark' });
      return;
    }
    U.sfx('chest');
    U.full('<div class="rays"></div><div class="f-title">Draw night!</div><div class="f-sub">Autumn Grand Draw · ' + s.tickets + ' of your tickets were in the drum</div>' +
      '<div class="big-item" id="drum" style="margin-top:26px;font-size:4.2rem;animation:spin 1.2s linear infinite">🎟️</div><div class="f-sub" id="drawLine" style="margin-top:20px">Drawing…</div>' +
      '<div class="f-actions" id="drawActs"></div>', { bg: 'dark' });
    setTimeout(function () {
      var d = document.getElementById('drum'); if (!d) return;
      d.style.animation = 'itemPop .6s var(--ease-spring) both'; d.innerHTML = A.companion(Th.companionDef(th(), S().comp.species), 'delighted');
      U.burstAt(d, { n: 80, spread: 220, wave: true }); U.sfx('rare'); U.haptic([30, 40, 30, 40, 80]);
      document.getElementById('drawLine').innerHTML = '<b style="font-size:1.3rem">Ticket #' + num + ' is yours!</b><br>You won a plush ' + esc(S().comp.name) + '.<br><span class="legal-tag" style="margin-top:8px">Sample prize — pending legal review</span>';
      document.getElementById('drawActs').innerHTML = '<button class="btn btn-light" data-act="draw-claim" data-autofocus>Claim my prize</button><button class="btn btn-clear" data-act="ov-next">Later</button>';
    }, U.calm() ? 100 : 2600);
  }
  // v5.5 wording: no "stack". Reminders read "Time for your 8:00 AM check-in" (no names unless you turn them on).
  var WHEN = { morning: 'this morning', midday: 'midday', evening: 'this evening', bedtime: 'tonight' };
  function lockscreen() {
    var s = S(), t = s.today, open = St.openStack(), e = open && t.entries[open.id];
    var phase = open ? E.stackPhase(open, e, s.clock) : null;
    var app = '<span class="n-app">' + A.logo(16) + '</span>KINDLING';
    var hab = open && root.TodayUI.habitOnly(open), at = open ? E.fmtTime(open.mins) : '';
    var names = open && !s.settings.discreet ? open.doses.map(function (d) { var m = St.medById(d.medId); return m ? m.name : ''; }).filter(Boolean).join(', ') : '';
    function n(time, title, body, acts) { return '<div class="notif"><div class="n-h">' + app + ' · ' + time + '</div><div class="n-t">' + title + '</div>' + (body ? '<div class="n-b">' + body + '</div>' : '') + (acts ? '<div class="n-acts">' + acts + '</div>' : '') + '</div>'; }
    function b(a, label, extra) { return '<button data-act="lk" data-a="' + a + '" data-s="' + (open && open.id) + '"' + (extra || '') + '>' + label + '</button>'; }
    var answered = t.plan.stacks.filter(function (st) { var x = t.entries[st.id]; return x && x.state !== 'out'; });
    var last = answered[answered.length - 1];
    var allSet = last ? (last.kind === 'rest' ? 'Nothing due today' : 'All set for ' + (WHEN[last.group || last.id] || 'today') + ' ✓') : '';
    var notifs = '';
    if (!open) {
      notifs = n('now', t.plan.rest ? 'Nothing due today' : allSet, t.plan.rest ? 'Enjoy your day.' : 'Logged. Nothing else is due right now.');
    } else if (open.kind === 'rest') {
      notifs = n('now', 'Nothing due today', 'Tap to check in for the day.', b('rest', 'All set'));
    } else if (phase === 'out') {
      notifs = '<div class="live"><span class="lv-ic">✋</span><div><div class="lv-t">Pill out · since ' + E.fmtTime(e.outAt) + '</div><div class="lv-s">Kindling · tap when it’s down</div></div><button data-act="lk" data-a="swallowed" data-s="' + open.id + '">Swallowed</button></div>' +
        n(s.settings.nudgeMins + ' min later', 'Still in your hand, or already down?', 'Your ' + at + ' pill is out.', b('swallowed', 'Swallowed') + b('putback', 'Put it back') + b('unsure', 'Not sure'));
    } else if (phase === 'past') {
      notifs = n('now', 'How did your ' + at + ' check-in go?', 'Just tell me how it went. Every answer counts.', '<button data-act="lk-earlier" data-s="' + open.id + '">' + (hab ? 'Did it earlier' : 'Took it earlier') + '</button>' + b('didnt', hab ? 'Not today' : 'Didn’t take') + (hab ? '' : b('unsure', 'Not sure')));
    } else if (phase === 'upcoming') {
      notifs = (last ? n('earlier', allSet, 'Logged.') : '') + n('later', 'Next check-in: ' + esc(open.label) + ' · ' + at, 'We’ll remind you then.');
    } else {
      var many = open.doses.length > 1, took = many ? (open.doses.some(function (d) { var m = St.medById(d.medId); return m && E.itemType(m) === 'habit'; }) ? 'All ' + open.doses.length + ' done' : 'Took all ' + open.doses.length) : (hab ? 'Done' : 'Took it');
      var pillish = open.doses.some(function (d) { var m = St.medById(d.medId), t = m && E.itemType(m); return t === 'med' || t === 'vitamin'; });
      var two = !hab && open.doses.some(function (d) { var m = St.medById(d.medId), t = m && E.itemType(m); return m && (t === 'med' || t === 'vitamin') && (m.twoStep == null ? s.settings.twoStep : !!m.twoStep); });
      var sOut = hab || !pillish ? b('took', took) : two ? b('pillout', many ? 'Pills out' : 'Pill out') + b('took', took) : b('took', took) + b('pillout', 'Pill out');
      notifs = n('now', 'Time for your ' + at + ' check-in', names ? esc(names) : 'Tap when you’re ready.', sOut);
    }
    // v5.6 (A7): the refill reminder, every day until it's answered. No name unless names are turned on in Me.
    St.refillsDue().forEach(function (m) { var dl = St.daysLeft(m); notifs += n('9:00 AM', 'Refill time' + (s.settings.discreet ? '' : ' for ' + esc(m.name)), dl > 0 ? 'About ' + dl + ' day' + (dl === 1 ? '' : 's') + ' left.' : 'It may be out now.', '<button data-act="lk-refill" data-a="in" data-m="' + m.id + '">Refill’s in</button><button data-act="lk-refill" data-a="no" data-m="' + m.id + '">Not needed</button><button data-act="lk-refill" data-a="other" data-m="' + m.id + '">Something else</button>'); });
    if (s.trip.status === 'back' && !St.tripOvernight()) notifs += n('7:30 AM', esc(s.comp.name) + ' is back from ' + esc((root.Story.T(s.theme).quests[s.trip.quest] || { name: 'a trip' }).name) + ' 📮', 'There’s a story waiting for you.');
    if (St.campOn() && s.settings.campReminder !== false && s.settings.gameNotifs > 0 && s.camp.count > 0 && !E.campLitOn(s.camp, s.day) && !E.campResting(s.camp, s.day) && s.clock >= 1080) notifs += n('7:00 PM', esc(th().camp.reminder.replace('{name}', s.comp.name)), 'Come say hi when you have a minute.');
    U.openOverlay('<div class="lock" role="dialog" aria-label="Lock screen preview"><div class="lk-date">' + E.fmtDateLong(s.day) + '</div><div class="lk-time">' + E.fmtTime(s.clock).replace(/ (AM|PM)/, '') + '</div>' + notifs +
      '<p class="lk-note">No medicine names on your lock screen unless you turn them on. Logging here earns exactly the same as in the app.</p><button class="lk-close" data-act="lk-close" data-autofocus>Back to Kindling</button></div>');
  }
  function shareCard() {
    var s = S(), tm = th(), r = s.today.run, n = E.boardNo(s.day);
    var grid = r && r.routeGrid ? (Array.isArray(r.routeGrid) ? r.routeGrid.join('\n') : r.routeGrid) : St.fakeRunResult('day' + n).routeGrid.join('\n');
    var stars = r ? r.stars : 3, st = ''; for (var i = 0; i < 3; i++) st += i < stars ? '⭐' : '☆';
    var text = 'Kindling · ' + tm.terms.run + ' #' + n + '\n' + st + '\n' + grid + '\nPlay today’s board: kindling.app/b/' + n;
    root.App._shareText = text;
    U.sheet('Share today’s board', '<div class="share-card"><div class="sc-h">' + esc(tm.terms.run) + ' #' + n + '</div><div style="font-size:1.6rem;margin-top:4px">' + st + '</div><div class="sc-grid">' + esc(grid) + '</div><div class="sc-foot">Made in Kindling · tap to play today’s board</div></div>' +
      '<p class="muted" style="font-weight:700;font-size:.85rem;margin:14px 4px 0;text-align:center">Shows your route and stars only. Nothing about medicine, ever.</p>' +
      '<div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-act="share-copy">Copy</button><button class="btn btn-dark" data-act="share-copy">' + A.icon('share') + ' Share</button></div>');
  }

  /* ---------- Run host ---------- */
  // Shared item art for the Run: maps a Run find id to the catalog item that
  // Store.finishRun will actually add (same hash rule as normalizeFind).
  function runItemArt(findId, rarity) {
    var id = findId;
    if (!E.FIND_BY_ID[id]) {
      var pool = E.FINDS.filter(function (x) { return x.rarity === rarity; });
      if (!pool.length) return '';
      id = pool[E.hash(String(findId)) % pool.length].id;
    }
    var a = Th.findArt(th(), id);
    return a && a.svg ? { html: a.svg, name: a.name } : '';
  }
  var runInst = null, runEl = null;
  function openRun(opts) {
    opts = opts || {};
    if (!opts.onboarding && root.GamesUI) { root.GamesUI.play('trail', null, !!opts.practice, false); return; }
    closeRun();
    var s = S(), tm = th(), n = ((s.day - 1) % 7) + 1, practice = !!opts.practice || !!opts.onboarding || !!(s.today && s.today.run);
    var k = E.PU_ORDER.filter(function (x) { return s.pu[x] > 0; });
    var fuelK = null; k.forEach(function (x) { if (!fuelK || /stack|rest|journal|Boss/i.test(s.puSources[x] || '')) fuelK = x; });
    var fuel = fuelK ? (s.puSources[fuelK] || 'Your check-ins') + ' built this ' + tm.powerUps[fuelK].name + '.' : '';
    runEl = document.createElement('div'); runEl.className = 'run-screen';
    runEl.innerHTML = '<div class="nav-h"><button class="back" data-act="run-close">' + A.icon('back') + (opts.onboarding ? 'Back' : 'Today') + '</button><div class="title">' + esc(practice ? 'Practice board' : tm.terms.run) + '</div></div><div class="run-host" id="runHost"></div>';
    document.getElementById('screen').appendChild(runEl);
    var host = runEl.querySelector('#runHost'), finished = null;
    function done() {
      var res = finished; closeRun();
      if (opts.onDone) { opts.onDone(res); return; }
      if (res && !practice) afterRun(res);
      else { root.App.render(); if (res && res._fxp && res._fxp.relight && root.CampUI) root.CampUI.after(res._fxp.relight); }
    }
    function onFinish(result) {
      finished = result || {};
      if (opts.onboarding) { /* tutorial: nothing recorded */ }
      else if (!practice) finished._fx = St.finishRun(finished, false);
      else finished._fxp = St.finishRun(finished, true);
      // The Run module calls onDone when its results sheet is dismissed (contract); no extra button needed.
    }
    root.App._runDone = done;
    var cfg = { seed: opts.onboarding ? 'day1' : 'day' + n, difficulty: 'stroll', powerUps: practice ? { magnet: 0, lens: 0, double: 0, lucky: 0 } : Object.assign({}, s.pu), theme: s.theme, practice: practice, tutorial: !!opts.tutorial, reducedMotion: U.calm(), fuelLabel: practice ? '' : fuel, onFinish: onFinish, onDone: done, renderItem: runItemArt };
    if (root.RunGame && typeof root.RunGame.mount === 'function') {
      try { runInst = root.RunGame.mount(host, cfg); } catch (e) { console.warn('Run failed to mount', e); placeholder(host, cfg); }
    } else placeholder(host, cfg);
  }
  function placeholder(host, cfg) {
    var tm = th(), cells = ''; for (var i = 0; i < 25; i++) cells += '<i class="' + ([0, 1, 6, 11, 12, 13, 18, 23, 24].indexOf(i) >= 0 ? 'on' : '') + '"></i>';
    host.innerHTML = '<div class="run-ph"><div class="t-kicker" style="font-weight:900;letter-spacing:.6px;text-transform:uppercase;font-size:.75rem">' + esc(tm.terms.run) + '</div><div class="t-title" style="font-size:1.4rem;font-weight:900;margin-top:4px">The puzzle is loading in</div><div class="grid5">' + cells + '</div>' +
      (cfg.fuelLabel ? '<div class="fuel" style="text-align:left"><span class="pu-badge">' + tm.powerUps.magnet.icon + '</span><div class="fuel-text">' + esc(cfg.fuelLabel) + '</div></div>' : '') +
      '<p style="margin:14px 0;font-weight:700">This build can’t find the puzzle module. Simulate a finished board to keep exploring.</p><button class="btn btn-tile btn-block" style="background:#fff;color:#1d2333;min-height:56px;border-radius:16px;font-weight:900" data-act="run-sim">Simulate run</button></div>';
    root.App._runSim = function () { var r = St.fakeRunResult(cfg.seed, { powerUps: cfg.powerUps, magnet: cfg.powerUps.magnet > 0 }); cfg.onFinish(r); cfg.onDone(); };
  }
  function closeRun() { if (runInst && runInst.destroy) { try { runInst.destroy(); } catch (e) { } } runInst = null; if (runEl && runEl.parentNode) runEl.parentNode.removeChild(runEl); runEl = null; if (root.GamesUI && !closeRun._busy) { closeRun._busy = true; try { root.GamesUI.close(); } finally { closeRun._busy = false; } } }
  function afterRun(res) {
    var fx = res._fx; root.App.render();
    if (!fx || fx.practice) return;
    U.toast('🎟️ +1 Grand Draw ticket. Tickets come from the game, never your medicines.');
    if (fx.levelUp) setTimeout(function () { U.levelBanner(fx.levelUp); }, 400);
    setTimeout(function () {
      var chestOrNot = fx.chestId ? function (cb) { root.CollectionUI.chestFx(fx.chestId, cb); } : function (cb) { cb(); }; // kid profiles: no chest
      chestOrNot(function () {
        var trip = function () { if (!S().today.tripSent && S().trip.status !== 'back') setTimeout(function () { root.App.acts['trip-send'](); }, 250); };
        // v5.3: the Run lit today's Campfire. Milestones, Relight and growth celebrate after the Run chest.
        var cf = fx.camp;
        if (cf && root.CampUI && (cf.milestones.length || cf.stageUp || cf.relight || cf.shieldEarned)) setTimeout(function () { root.CampUI.after(cf, trip); }, 250);
        else { if (cf && cf.lit && !cf.kid) U.toast(esc(th().camp.icon + ' ' + th().camp.dayLabel(cf.count))); trip(); }
      });
    }, 900);
  }

  /* ---------- demo panel (prototype controls, hidden) ---------- */
  var Demo = {
    open: function () {
      var s = S(), d = E.fmtDateLong(s.day), live = St.isLive(), now = St.liveNow();
      var liveSec = '<div class="d-lab">Live</div><div class="demo-live"><div><b>' + (live ? 'Live' : 'Demo time') + ' · ' + esc(live && s.today ? E.fmtDate(s.day) + ' · ' + E.fmtTime(s.clock) : E.fmtDate(now.day) + ' · ' + E.fmtTime(now.clock)) + '</b><small>' + (live ? 'The real date and clock. The companion leaves at 9 PM and is back at 6 AM.' : 'You’re on the demo clock. Your real progress is untouched.') + '</small></div>' +
        (live ? '<button data-act="demo-startover">Start over</button>' : '<button class="hl" data-act="back-to-live">Back to live</button>') + '</div>';
      var presets = [['logan', 'Founder tour', '1 daily med, two-step'], ['maya', 'Maya', '1 morning stimulant'], ['harold', 'Harold', '14 meds · 4 stacks · Simple'], ['priya', 'Priya', 'Weekly injection · Boss Day'], ['dan', 'Dan + Leo', 'Caregiver preview'], ['fresh', 'Fresh start', 'Onboarding from the top']];
      var campCtl = [['day6', 'Campfire day 6', 'Milestone tomorrow'], ['skip1', 'Skip a day', 'Shield used'], ['skip2', 'Skip 2 days', 'Relight offer'], ['rest', 'Rest mode on', '3-day break'], ['grow', 'Growth', 'Next stage tomorrow']];
      var rpgCtl = [['day7', 'Day 7: story choice', 'Weekly page, then Feed'], ['tree', 'Skill tree', 'Jump to day 45 (fork open)'], ['builds', 'Same quest, two builds', 'Side by side'], ['book', 'Open the Book', 'Prologue onward'], ['d100', 'Day 100', 'Epic chest: choose 1 of 3'], ['d365', 'Day 365', 'Legendary: choose 1 of 3'], ['quiet', 'A quiet page', 'After 3 quiet days'], ['fairy', 'Grove: fairy', 'Garden spirit'], ['gnome', 'Grove: gnome', 'Garden spirit'], ['exp', 'Back to Expedition', 'Fox kit']];
      var progCtl = [['spares', 'Give spares', '6 of each kind in one set'], ['epics', 'Give Epic spares', '3 in one set, for Shiny'], ['d30', 'Day 30', 'Workbench opens, spare piles'], ['bench', 'Workbench open now', 'Skips the day-30 lock'], ['dupgear', 'Duplicate gear', 'On the next return'],
        ['open', 'Crew + Shop now', 'Skips the day 10 / 14 wait'], ['join', 'Join the sample crew', 'Labelled sample'], ['crewday', 'Crew: next day', 'Moves the shared meter'], ['gift', 'Crew: receive a gift', 'From a sample member'], ['moment', 'Crew: a moment', 'A member posts one'],
        ['shopreset', 'Shop: reset preview', 'Clears preview purchases'], ['kid', S().profile && S().profile.kid ? 'Kid profile: on' : 'Kid profile: off', 'Shop, Crew, Pass disappear'], ['fair', 'Fairness check', 'Spark 0 vs 100, same plays']];
      var triggers = [['welcome', 'Welcome back', 'After 4 quiet days'], ['tier2', 'Barrier: Tier 2', 'Pharmacy out of stock'], ['tier3', 'Barrier: Tier 3', 'Side effects'], ['refill', 'Refill reminder', 'About 6 days of supply left'], ['highrisk', 'High-risk lapse', 'Plain safety card'], ['drawnight', 'Draw night', 'Grand Draw reveal'], ['pudrop', 'Power-up drop', 'Power Bank pops'], ['lock', 'Lock screen', 'Reminder + pill-out nudge'], ['share', 'Share card', 'Run grid, no health info'], ['reset', 'Reset the demo', 'Clears the demo save only']];
      U.openOverlay('<div class="demo" role="dialog" aria-label="Demo controls"><div class="demo-sheet"><button class="demo-close" data-act="demo-close">Close</button>' +
        '<h2>⚙️ Demo controls</h2><div class="d-sub">Prototype only, not part of the product.' + (s.today ? ' ' + esc(d) + ' · day ' + s.day + (s.preset ? ' · ' + esc(s.preset) : '') : '') + '</div>' + liveSec +
        '<div class="d-lab">Demo (your real progress is untouched)</div>' +
        '<button class="demo-next" data-act="demo-next">Next morning ☀</button>' +
        '<div class="d-lab">Demo clock</div><div class="demo-clock"><button data-act="demo-clock" data-d="-60">− 1h</button><b>' + E.fmtTime(s.clock) + '</b><button data-act="demo-clock" data-d="60">+ 1h</button></div>' +
        '<div class="d-lab">People</div><div class="demo-grid">' + presets.map(function (p) { return '<button class="' + (p[0] === 'logan' ? 'hl' : '') + '" data-act="demo-preset" data-p="' + p[0] + '" data-label="' + p[1] + '">' + p[1] + '<small>' + p[2] + '</small></button>'; }).join('') + '</div>' +
        '<div class="d-lab">Companion RPG + the Book (v5.4)</div><div class="demo-grid">' + rpgCtl.map(function (p) { return '<button data-act="demo-rpg" data-t="' + p[0] + '">' + p[1] + '<small>' + p[2] + '</small></button>'; }).join('') + '</div>' +
        '<div class="d-lab">Progress, Crew and Shop (v5.6)</div><div class="demo-grid">' + progCtl.map(function (p) { return '<button data-act="demo-prog" data-t="' + p[0] + '">' + p[1] + '<small>' + p[2] + '</small></button>'; }).join('') + '</div>' +
        '<div class="d-lab">Campfire (v5.3)</div><div class="demo-grid">' + campCtl.map(function (p) { return '<button data-act="demo-camp" data-t="' + p[0] + '">' + p[1] + '<small>' + p[2] + '</small></button>'; }).join('') + '</div>' +
        '<div class="d-lab">Moments</div><div class="demo-grid">' + triggers.map(function (p) { return '<button data-act="demo-trig" data-t="' + p[0] + '">' + p[1] + '<small>' + p[2] + '</small></button>'; }).join('') + '</div>' +
        '</div></div>');
    }
  };
  function demoClose() { U.closeAll(); }
  function trigger(t) {
    St.enterDemo(); // every Moment, including "Reset the demo", runs on the demo save; Live is reset only from Start over
    var s = S();
    U.closeAll(); closeRun();
    if (!s.today && t !== 'reset') { U.toast('Finish onboarding or pick a person first.'); return; }
    root.App.ui.stack = []; root.App.ui.tab = 'today';
    if (t === 'welcome') {
      s.flags.wbLast = null; s.flags.lastActiveDay = s.day;
      for (var i = 0; i < 4; i++) St.rollover({ silent: i < 3 });
      if (!s.flags.pendingWelcome) { St.S.flags.pendingWelcome = true; St.save(); }
      root.App.render();
    } else if (t === 'tier2' || t === 'tier3') {
      var m = s.meds.filter(function (x) { return x.kind !== 'prn'; })[0];
      var open = St.openStack();
      if (open && open.kind === 'dose') St.checkIn(open.id, 'didnt');
      St.answerBarrier(t === 'tier2' ? 'stock' : 'side', m && m.id);
      root.App.render();
    } else if (t === 'refill') {
      var rm = s.meds.filter(function (x) { return !E.isAsNeeded(x) && E.itemType(x) !== 'habit' && !E.isEnded(x, s.day); })[0];
      if (rm) { var per = E.unitsOn(rm, s.day) || E.expandTimes(E.schedOf(rm).times).length; rm.supply = 6 * per; rm.supplySetOn = s.day; rm.supplyV = 2; rm.refill = Object.assign({}, rm.refill || {}, { askAgain: null, off: false }); St.save(); }
      root.App.render();
    } else if (t === 'highrisk') {
      var hr = s.meds.filter(function (x) { return x.highRisk; })[0];
      if (!hr) { hr = { id: 'hr1', name: 'Warfarin', strength: '5 mg', kind: 'daily', times: ['18:00'], color: '#ffc4a3', shape: 'round', highRisk: true, supply: 30, startDay: s.day + 1 }; s.meds.push(hr); }
      s.flags.highRisk = hr.id; St.save(); root.App.render();
    } else if (t === 'drawnight') { root.App.render(); drawNight(); }
    else if (t === 'pudrop') { var drops = St.addCharge(100, 'Your check-ins'); St.save(); root.App.render(); drops.forEach(function (d) { root.TodayUI.powerUpDrop(d); }); }
    else if (t === 'lock') { root.App.render(); lockscreen(); }
    else if (t === 'share') { root.App.render(); shareCard(); }
    else if (t === 'reset') { St.freshDemo(); root.Onboarding.reset(); root.App.render(); }
  }

  /* v5.3 Campfire demo controls. They set up game state honestly through the same engine (rollover, feed). */
  function campDemo(t) {
    St.enterDemo();
    var s = S();
    U.closeAll(); closeRun();
    if (!s.today) { U.toast('Finish onboarding or pick a person first.'); return; }
    root.App.ui.stack = []; root.App.ui.tab = 'today';
    var nm = th().camp.name, msg = '';
    function feedToday() { if (!s.today.fed) St.feed(); }
    function skipDay() { St.rollover({ silent: true }); }
    if (t === 'day6') {
      feedToday(); var c = St.S.camp;
      c.count = 6; c.best = Math.max(c.best, 6); c.total = Math.max(c.total, 12); c.lastLit = St.S.day; c.broken = null; c.rest = null;
      E.CAMP.milestones.forEach(function (m) { if (m > 6) delete c.paid[m]; else c.paid[m] = true; });
      msg = th().camp.dayLabel(6) + '. Tap Next morning, then feed or play for the day 7 milestone.';
    } else if (t === 'skip1') {
      var c1 = St.S.camp; if (c1.count < 1) { feedToday(); c1 = St.S.camp; c1.count = Math.max(c1.count, 5); c1.best = Math.max(c1.best, 5); }
      if (c1.shields < 1) c1.shields = 1;
      if (E.campLitOn(c1, St.S.day)) skipDay(); // today was played, so skip the next one
      skipDay();
      msg = 'A day went by with no play. A ' + th().camp.shield.toLowerCase() + ' covered it.';
    } else if (t === 'skip2') {
      var c2 = St.S.camp; if (c2.count < 3) { feedToday(); c2 = St.S.camp; c2.count = 9; c2.best = Math.max(c2.best, 9); c2.total = Math.max(c2.total, 9); }
      c2.shields = Math.min(c2.shields, 1); c2.rest = null;
      if (E.campLitOn(c2, St.S.day)) skipDay();
      skipDay(); skipDay();
      msg = 'Two days went by. ' + th().camp.relight + ' is open: finish one of today’s games plus 1 practice board.';
    } else if (t === 'rest') {
      var c3 = St.S.camp; c3.rest = null; c3.restStarts = [];
      if (c3.count < 1) { feedToday(); }
      St.startRest(3);
      msg = 'Break on for 3 days. Tap Next morning a few times: the count stays put.';
    } else if (t === 'grow') {
      feedToday(); var c4 = St.S.camp, nx = E.nextGrowth(c4.total);
      if (nx) c4.total = nx.at - 1;
      msg = nx ? 'Tap Next morning, then feed or play to see ' + S().comp.name + ' grow.' : S().comp.name + ' is fully grown.';
    }
    St.save(); root.App.render();
    var v = document.getElementById('view'); if (v) v.scrollTop = 0;
    if (msg) U.toast(esc(msg), { ms: 4000 });
  }

  /* v5.4 RPG demo controls. Jumps build the state through the same engine (Store.jumpTo); nothing is painted on. */
  function rpgDemo(t) {
    St.enterDemo();
    var s = S();
    U.closeAll(); closeRun();
    if (!s.today && t !== 'fairy' && t !== 'gnome' && t !== 'exp') { U.toast('Finish onboarding or pick a person first.'); return; }
    root.App.ui.stack = []; root.App.ui.tab = 'today';
    var msg = '', after = null;
    if (t === 'day7') { St.jumpTo(7); msg = 'Day 7. Check in, open this morning’s ' + th().terms.trip.toLowerCase() + ' for the weekly page, then feed ' + S().comp.name + '.'; }
    else if (t === 'tree') { St.jumpLit(45); after = function () { root.App.go('tree'); }; msg = 'Day 45: the ' + root.Story.T(S().theme).tree.name + ' tree is open and the fork is ready.'; }
    else if (t === 'builds') { after = function () { root.QuestUI.twoBuilds(); }; }
    else if (t === 'book') { after = function () { root.App.go('book'); }; }
    else if (t === 'd100' || t === 'd365') {
      St.jumpLit(t === 'd100' ? 100 : 365);
      var ch = S().chests.filter(function (c) { return !c.opened && (c.type === 'epic' || c.type === 'legendary'); })[0];
      if (ch) after = function () { root.CollectionUI.chestFx(ch.id); };
    }
    else if (t === 'quiet') {
      s.flags.wbLast = null; s.flags.lastActiveDay = s.day;
      for (var i = 0; i < 4; i++) St.rollover({ silent: i < 3 });
      var list = root.BookUI.bookList(), q = list.filter(function (p) { return p.kind === 'quiet'; }).pop();
      if (q) after = function () { var l2 = root.BookUI.bookList(), qi = l2.indexOf(q); root.BookUI.open(l2, qi, { turnFrom: Math.max(0, qi - 1) }); };
      else msg = 'A quiet page was added less than 14 days ago, so the Book waits.';
    }
    else if (t === 'fairy' || t === 'gnome') {
      if (!s.today) St.loadPreset('logan');
      var S2 = St.S; S2.theme = 'grove'; S2.comp = { species: t, name: t === 'fairy' ? 'Clover' : 'Bramble', bond: S2.comp.bond || 0 };
      St.save(); after = function () { root.App.go('companion'); };
    }
    else if (t === 'exp') { if (!s.today) St.loadPreset('logan'); St.S.theme = 'expedition'; St.S.comp = { species: 'fox', name: 'Ember', bond: St.S.comp.bond || 0 }; St.save(); }
    St.save(); root.App.render();
    var v = document.getElementById('view'); if (v) v.scrollTop = 0;
    if (after) setTimeout(after, 120);
    if (msg) U.toast(esc(msg), { ms: 4500 });
  }

  /* v5.6 Part B demo controls (spec §6.5). All run on the demo save, through the same engine. */
  function progDemo(t) {
    St.enterDemo();
    var s = S(), P = root.Progress; U.closeAll(); closeRun();
    if (!s.today) { U.toast('Finish onboarding or pick a person first.'); return; }
    var msg = '';
    if (t === 'spares') { P.idsIn(1).forEach(function (id) { var f = E.FIND_BY_ID[id]; if (f.rarity !== 'epic') { s.owned[id] = (s.owned[id] || 0) + (f.rarity === 'common' ? 6 : f.rarity === 'uncommon' ? 4 : 3); s.found[id] = true; } }); msg = 'Spares added. Open Collection to combine.'; }
    else if (t === 'epics') { s.owned['s1-9'] = (s.owned['s1-9'] || 0) + 4; s.found['s1-9'] = true; msg = '3 Epic spares added. Open Collection, then Combine, to make one shine.'; }
    else if (t === 'd30') { St.jumpTo(30); s = S(); msg = 'Day 30: the ' + th().terms.bench + ' is open.'; }
    else if (t === 'bench') { s.flags.benchOpen = true; msg = 'The ' + th().terms.bench + ' is open.'; }
    else if (t === 'dupgear') { s.flags.dupGearNext = true; msg = 'The next return brings a piece of gear you own.'; }
    else if (t === 'open') { s.flags.socialOpen = true; msg = 'Crew and Shop are in Me.'; }
    else if (t === 'join') { s.flags.socialOpen = true; St.joinCrew(); msg = St.crewOn() ? 'You joined the sample crew.' : 'Crews are for grown-up profiles.'; }
    else if (t === 'crewday') { if (!s.crew) St.joinCrew(); if (s.crew) { P.crewEndDay(s, s.day); s.crew.week.mineDay = s.day; } msg = 'The crew meter moved (a sample day).'; }
    else if (t === 'gift') { if (!s.crew) St.joinCrew(); if (s.crew) s.crew.gifts.inbox.push({ from: 'BraveOtter-412', id: E.FINDS.filter(function (f) { return f.rarity === 'common'; })[(s.crew.gifts.inbox.length + s.day) % 16].id }); msg = 'A gift is waiting in the crew.'; }
    else if (t === 'moment') { if (!s.crew) St.joinCrew(); if (s.crew) s.crew.moments.unshift({ id: 'ms' + Date.now(), handle: 'MossyFinch-077', species: 'fox', kind: 'set', text: 'MossyFinch-077 finished a set!', day: s.day, cheers: 2, mine: false, cheered: null }); msg = 'A crew mate shared a moment.'; }
    else if (t === 'shopreset') { St.resetShop(); msg = 'Preview purchases cleared.'; }
    else if (t === 'kid') { s.profile.kid = !s.profile.kid; msg = s.profile.kid ? 'Kid profile on.' : 'Kid profile off.'; }
    else if (t === 'fair') {
      var r = St.fairnessCheck(); St.save(); root.App.render();
      var gl = function (j) { var o = JSON.parse(j), k = Object.keys(o); return k.length ? k.map(function (id) { return esc(root.Story.T(S().theme).gear[id] || id) + ' +' + o[id]; }).join(', ') : 'none yet'; };
      U.sheet('Fairness check', '<p style="font-weight:700">7 days where every dose is “Didn’t take” (Spark 0) and 7 where every dose is taken (Spark 100), with the same games and feeding.</p>' + r.runs.map(function (x) { return '<div class="fact"><span class="f-ic" style="background:var(--neutral-bg)">' + x.spark + '</span><div><div class="f-t">Spark ' + x.spark + '</div><div class="f-s">Spares ' + x.spares + ' · Gear levels: ' + gl(x.plus) + ' · ' + esc(th().terms.crew) + ' points ' + esc(String(x.crew).split('|')[0]) + ' · Season step ' + x.step + '</div><div class="f-s">Found ' + x.found + ' · Stars ' + x.stars + '</div></div></div>'; }).join('') +
        '<p style="font-weight:800;margin-top:10px">' + (r.same ? '✓ Spares, gear levels, ' + esc(th().terms.crew.toLowerCase()) + ' points and the Season step match. Only found entries and Stars may differ.' : 'These should match. Please report this.') + '</p>' +
        '<p class="muted" style="font-weight:600">Answering a check-in (any answer, same value) gives companion XP. A higher level helps quests a little. Answers never create spares directly, and never add ' + esc(th().terms.crew.toLowerCase()) + ' points, Season steps or Shop value.</p>');
      return;
    }
    St.save(); root.App.ui.stack = []; root.App.ui.tab = 'today'; root.App.render(); if (msg) U.toast(msg);
  }
  root.Extra = { drawNight: drawNight, lockscreen: lockscreen, shareCard: shareCard, openRun: openRun, closeRun: closeRun };
  root.Demo = Demo;
  root.App.screens.draw = draw;
  Object.assign(root.App.acts, {
    'draw-how': function () { U.sheet('How the Grand Draw works', '<ul style="padding-left:20px;font-weight:600;color:var(--ink-2);line-height:1.6"><li>Finish your first daily game of the day and you get one ticket. One a day, max.</li><li>Tickets never come from medicines, check-ins or anything about your health.</li><li>Prefer not to play? One free entry a day by mail. No purchase, ever.</li><li>Odds depend on how many tickets are in. Shown before each draw.</li><li>18 and older, where permitted. Winners are never announced by name.</li></ul><span class="legal-tag">Sample — pending legal review</span>'); },
    'draw-free': function () { U.sheet('Free entry', '<p style="font-weight:600">No purchase or app activity needed. Send a postcard with your name, email and “Kindling Grand Draw” to the address in the official rules. One free entry per person per day, same odds as a ticket.</p><span class="legal-tag" style="margin-top:10px">Sample — pending legal review</span>'); },
    'draw-rules': function () { U.sheet('Official rules (sample)', '<p style="font-weight:600">No purchase necessary. Open to legal residents 18+ where permitted. Void where prohibited. Entries: one per day for finishing a daily game, or one free mail-in entry per day. Odds depend on entries received. Prize descriptions are samples. Winners verified by identity check and never publicized by name.</p><span class="legal-tag" style="margin-top:10px">Sample — pending legal review</span>'); },
    'age-ok': function () { var v = +((document.getElementById('byear') || {}).value || 0); var yr = new Date().getFullYear(); if (!v || v < 1900 || v > yr) { U.toast('Enter a 4-digit year.'); return; } S().flags.age18 = (yr - v) >= 18; St.save(); root.App.render(); },
    'draw-claim': function () { U.closeAll(); U.sheet('Claim your prize', '<p style="font-weight:600">In the real draw: a quick identity check (18+), then a shipping address. Your name is never published.</p><span class="legal-tag" style="margin-top:10px">Sample prize — pending legal review</span><button class="btn btn-dark btn-block" style="margin-top:14px" data-act="sheet-close">Got it</button>'); },
    lockscreen: function () { lockscreen(); },
    'lk-refill': function (el) { var a = el.getAttribute('data-a'), id = el.getAttribute('data-m'); U.closeAll(); root.App.render(); var fake = { getAttribute: function (k) { return k === 'data-m' ? id : null; } }; root.App.acts[a === 'in' ? 'refill-in' : a === 'no' ? 'refill-no' : 'refill-other'](fake); },
    'lk-earlier': function (el) { var sid = el.getAttribute('data-s'); U.closeAll(); root.App.ui.stack = []; root.App.ui.tab = 'today'; root.App.render(); root.TodayUI.earlierSheet(sid); },
    'lk-close': function () { U.closeAll(); root.App.render(); },
    lk: function (el) {
      var a = el.getAttribute('data-a'), sid = el.getAttribute('data-s');
      var r = null;
      if (a === 'pillout') r = St.pillOut(sid); else if (a === 'putback') r = St.putBack(sid); else r = St.checkIn(sid, a);
      U.closeAll(); root.App.ui.stack = []; root.App.ui.tab = 'today'; root.App.render();
      if (!r || r.ignored || r.already) return;
      U.toast(a === 'pillout' ? 'Pill out. Tap Swallowed once it’s down.' : a === 'putback' ? 'Put back. No problem.' : 'Logged from your lock screen at ' + E.fmtTime(S().clock) + '.');
      (r.drops || []).forEach(function (d) { root.TodayUI.powerUpDrop(d); });
    },
    share: function () { shareCard(); },
    'share-copy': function () { var t = root.App._shareText || ''; try { navigator.clipboard.writeText(t).then(function () { U.toast('Copied. Paste it anywhere.'); }, function () { U.toast('Copied.'); }); } catch (e) { U.toast('Copied.'); } },
    'run-close': function () { closeRun(); root.App.render(); },
    'run-continue': function () { if (root.App._runDone) root.App._runDone(); },
    'run-sim': function () { if (root.App._runSim) root.App._runSim(); },
    'demo-close': demoClose,
    'demo-startover': function () { U.closeAll(); U.sheet('Start over?', '<p style="font-weight:600">This clears your live progress on this phone and starts setup again on today’s date. Demo saves aren’t affected.</p><div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-act="sheet-close">Keep my progress</button><button class="btn btn-dark" data-act="demo-startover-yes">Start over</button></div>'); },
    'demo-startover-yes': function () { U.closeAll(); closeRun(); St.startOver(); root.Onboarding.reset(); root.App.ui.stack = []; root.App.ui.tab = 'today'; root.App.render(); },
    'demo-next': function () {
      if (!S().today) { U.closeAll(); U.toast('Finish onboarding or pick a person first.'); return; }
      St.enterDemo();
      U.closeAll(); closeRun(); root.TodayUI.ui.other = false; var r = St.rollover(); root.App.ui.stack = []; root.App.ui.tab = 'today'; root.App.render();
      var v = document.getElementById('view'); if (v) v.scrollTop = 0;
      var extra = r.taperChanged.length ? ' ' + St.medById(r.taperChanged[0]).name + ' is ' + E.doseLabel(St.medById(r.taperChanged[0]), S().day) + ' from today.' : '';
      U.toast('☀ Good morning. It’s ' + E.fmtDateLong(S().day) + '.' + extra);
    },
    'demo-clock': function (el) { if (!S().today) return; St.enterDemo(); var s = S(); s.clock = Math.max(E.ROLLOVER, Math.min(1440 + E.ROLLOVER - 1, s.clock + +el.getAttribute('data-d'))); St.save(); U.closeAll(); root.App.render(); Demo.open(); },
    'demo-preset': function (el) { var p = el.getAttribute('data-p'); U.closeAll(); closeRun(); St.enterDemo(); root.TodayUI.ui.other = false; root.App.ui.stack = []; root.App.ui.tab = 'today'; if (p === 'fresh') { St.freshDemo(); root.Onboarding.reset(); } else { St.loadPreset(p); root.Onboarding.state().active = false; root.CollectionUI.setSeg('album'); } root.App.render(); var v = document.getElementById('view'); if (v) v.scrollTop = 0; },
    'demo-trig': function (el) { trigger(el.getAttribute('data-t')); },
    'demo-camp': function (el) { campDemo(el.getAttribute('data-t')); },
    'demo-rpg': function (el) { rpgDemo(el.getAttribute('data-t')); },
    'demo-prog': function (el) { progDemo(el.getAttribute('data-t')); }
  });
})(window);
