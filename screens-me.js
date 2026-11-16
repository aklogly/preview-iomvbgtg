/* Kindling v5 — screens-me.js : theme switcher, comfort settings, notifications, privacy, Fair Play, Slice 2 previews. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  function toggle(key, on, label) { return '<button class="toggle" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label) + '" data-act="set-toggle" data-k="' + key + '"></button>'; }
  function row(icon, t, s, right, act, extra) { return '<' + (act ? 'button' : 'div') + ' class="set-row"' + (act ? ' data-act="' + act + '"' + (extra || '') : '') + '><span class="sr-ic">' + A.icon(icon) + '</span><span class="sr-main"><span class="sr-t" style="display:block">' + t + '</span>' + (s ? '<span class="sr-s">' + s + '</span>' : '') + '</span>' + (right || '') + '</' + (act ? 'button' : 'div') + '>'; }

  function themeCard(id) {
    var t = root.THEMES[id], on = S().theme === id;
    var cd = Th.companionDef(t, S().comp.species);
    return '<button class="theme-card ' + (on ? 'on' : '') + '" data-act="set-theme" data-v="' + id + '" aria-pressed="' + on + '" data-theme="' + id + '"><div class="tc-art" style="background:' + (id === 'grove' ? 'linear-gradient(180deg,#dbe8cf,#fbe7df)' : 'linear-gradient(180deg,#36c6c0,#ffe49a)') + '">' + A.scenery(id) + '<div class="tc-comp">' + A.companion(cd, 'happy') + '</div></div><div class="tc-txt"><div class="tc-name">' + t.name + '</div><div class="tc-sub">' + (on ? '✓ In use' : esc(id === 'grove' ? 'Quiet garden' : 'Bright adventure')) + '</div></div></button>';
  }

  function osReduce() { try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function render() {
    var s = S(), st = s.settings, lv = root.RPG.levelInfo(s.compLevel.xp), tm = th();
    var ts = st.textSize, os = osReduce();
    var celebOn = st.celebrations !== false && !st.reducedMotion && !os;
    return '<div class="page-h"><h1>Me</h1></div>' +
      '<button type="button" class="profile" data-act="go" data-to="companion" aria-label="' + esc(s.comp.name) + ': level ' + lv.level + '. Open ' + esc(s.comp.name) + '"><div class="pf-comp">' + A.companion(Th.companionDef(tm, s.comp.species), 'happy', { aura: !!(root.CampUI && root.CampUI.aura()) }) + '</div><div class="grow"><div class="pf-name">' + esc(s.comp.name) + ' &amp; you</div><div class="pf-sub">Level ' + lv.level + ' · ' + U.fmtNum(s.stars) + ' ★' + (St.campOn() && s.today ? ' · ' + esc(th().camp.stages[St.growth().stage]) : '') + '</div><div class="xpbar" aria-hidden="true"><i style="width:' + Math.round(100 * lv.into / lv.need) + '%"></i></div></div>' + A.icon('chev') + '</button>' +
      '<div class="sec-h"><h2>Your world</h2><span class="sub">Progress comes with you</span></div><div class="theme-cards">' + themeCard('expedition') + themeCard('grove') + '</div>' +
      '<div class="sec-h"><h2>Sound and motion</h2></div><div class="set-group">' +
        row('bell', 'Sounds', 'Little chimes when you check in and open chests.', toggle('sound', st.sound, 'Sounds')) +
        row('phone', 'Vibration', 'A light buzz when you tap buttons.', toggle('haptics', st.haptics, 'Vibration')) +
        row('sparkle', 'Big celebrations', os ? 'Off because Reduce Motion is on in your phone’s settings.' : 'Confetti and animations when you check in. Off shows a simple check mark instead.', os ? '<span class="status neutral">Off</span>' : toggle('celebrations', celebOn, 'Big celebrations')) +
      '</div>' +
      '<div class="sec-h"><h2>Display</h2></div><div class="set-group">' +
        '<div class="set-row ts-row"><span class="sr-ic" style="font-weight:900">Aa</span><span class="sr-main"><span class="sr-t" style="display:block">Text size</span><span class="sr-s ts-sample">Morning · 8:00 AM</span></span></div>' +
        '<div class="ts-seg ts-seg-wide" role="radiogroup" aria-label="Text size"><button role="radio" aria-checked="' + (ts === 'regular') + '" class="' + (ts === 'regular' ? 'on' : '') + '" data-act="set-ts" data-v="regular">Regular</button><button role="radio" aria-checked="' + (ts === 'large') + '" class="' + (ts === 'large' ? 'on' : '') + '" data-act="set-ts" data-v="large">Large</button><button role="radio" aria-checked="' + (ts === 'xl') + '" class="' + (ts === 'xl' ? 'on' : '') + '" data-act="set-ts" data-v="xl">Extra large</button></div>' +
        row('eye', 'Fewer things on Today', 'Shows your check-ins and ' + esc(s.comp.name) + ' first. One game, marked optional.', toggle('simple', st.simple, 'Fewer things on Today')) +
      '</div>' +
      '<div class="sec-h"><h2>Check-ins</h2></div><div class="set-group">' +
        row('pill', 'Two taps for new pills', 'Tap Pill out when it’s in your hand, then Swallowed. You can change it for each item.', toggle('twoStep', st.twoStep, 'Two taps for new pills')) +
      '</div>' +
      '<div class="sec-h"><h2>Notifications</h2></div><div class="set-group">' +
        row('bell', 'Reminders', 'For everything on My list, at the times you set.', toggle('reminders', st.reminders, 'Reminders')) +
        row('sparkle', 'Game news', 'When ' + esc(s.comp.name) + ' is back, and draw night. At most one a day.', toggle('gameNews', st.gameNotifs > 0, 'Game news')) +
        (St.campOn() ? row('sparkle', 'Evening game reminder', 'One nudge at 7 PM if you haven’t played. Never about medicines.', toggle('campReminder', st.campReminder !== false, 'Evening game reminder')) : '') +
        row('lock', 'Hide names in reminders', 'Your lock screen says “Time for your 8:00 AM check-in” instead of the name.', toggle('discreet', st.discreet, 'Hide names in reminders')) +
        row('phone', 'Preview your lock screen', 'See what a reminder looks like', A.icon('chev'), 'lockscreen') +
      '</div>' +
      (St.isKid() ? '' : '<div class="sec-h"><h2>Games</h2></div><div class="set-group">' +
        row('people', 'Show my game scores on leaderboards', 'Shows ' + esc(s.comp.name) + '’s name and your scores. Never anything about medicines.', toggle('boards', st.boards !== false, 'Show my game scores on leaderboards')) +
        (root.CampUI ? root.CampUI.restRow(row) : '') +
      '</div>') +
      '<div class="sec-h"><h2>Privacy and data</h2></div><div class="set-group">' +
        row('shield', 'What’s shared', 'Nothing about your meds. Ever.', A.icon('chev'), 'go', ' data-to="privacy"') +
        row('lock', 'App lock', 'Face ID or a PIN to open Kindling', toggle('appLock', st.appLock, 'App lock')) +
        row('download', 'Export my data', 'Your full record as a file', A.icon('chev'), 'export') +
        row('close', 'Delete my account', 'Removes everything, right away', A.icon('chev'), 'delete-acct') +
      '</div>' +
      '<div class="set-group">' + row('info', 'How Kindling stays fair', 'Taking more never earns more', A.icon('chev'), 'fair-play') + '</div>' +
      // v5.6 Part B: Crew (from day 10 of play) and Shop (from day 14), never for kid or teen profiles. Demo can open them early.
      (St.crewOn() && (s.camp.total >= 10 || s.flags.socialOpen || s.crew) ? '<div class="sec-h"><h2>Together</h2></div><div class="set-group">' + row('people', esc(tm.terms.crew), s.crew ? 'Sample ' + esc(tm.terms.crew.toLowerCase()) + ' · ' + s.crew.week.shared + ' of ' + s.crew.week.tiers[2] + ' this week' : 'Play alongside a few others. Sample only in this preview.', A.icon('chev'), 'go', ' data-to="crew"') + '</div>' : '') +
      (St.shopOn() && (s.camp.total >= 14 || s.flags.socialOpen) ? '<div class="set-group">' + row('sparkle', 'Shop', 'Looks and the Season Pass. Preview: no real purchases.', A.icon('chev'), 'go', ' data-to="shop"') + '</div>' : '') +
      '<div class="sec-h"><h2>Coming soon</h2></div><div class="set-group">' +
        row('people', 'Family profiles', 'Log for a child or a parent, each with their own world', '<span class="preview-tag">Preview</span>', 'go', ' data-to="family"') +
      '</div>' +
      '<div class="set-group">' + row('info', 'Help', 'Questions, contact us', A.icon('chev'), 'fake-call', ' data-who="support team"') + '</div>' +
      '<button class="about" data-act="logo-tap" style="display:flex;flex-direction:column;align-items:center;gap:4px;margin:18px auto 30px;border:0;background:none;cursor:pointer;color:var(--muted);font-weight:700;font-size:.85rem" aria-label="About Kindling">' + A.logo(40) + '<span style="font-weight:900;color:var(--ink);font-size:1rem">Kindling</span><span>The daily game your meds power · v5.6 prototype</span></button>';
  }
  function fairPlay() {
    var tm = th();
    U.sheet('How Kindling stays fair', '<div class="promise" style="margin:0"><ul><li>Taking more never earns more. Everyone’s day is worth the same.</li><li>As-needed medicines earn the same small amount, used or not.</li><li>Nothing about your medicines ever goes down. Logged after the usual time? Still counts.</li><li>' + esc(tm.camp.counts) + ' days you play, never doses. Best ever and total days only go up.</li><li>An honest “didn’t take” still earns points.</li><li>Games and leaderboards never see your medicines. Power-ups only add finds, never a score.</li><li>We never tell you to take a dose. That’s between you and your care team.</li><li>Chests, spares, gear and anything that helps you play are never for sale. The Shop sells looks only. Chest odds are always shown.</li></ul></div>');
  }

  function privacy() {
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Me</button><div class="title">What’s shared</div></div>' +
      '<div class="page-h"><h1 style="font-size:1.6rem">Nothing about your meds</h1><p>Plain answers. No fine print.</p></div>' +
      '<div class="card"><h3>Shared with no one</h3><ul style="padding-left:20px;font-weight:600;color:var(--ink-2);line-height:1.6"><li>Medicine names, doses and times</li><li>Whether you took something</li><li>Your record and notes</li><li>How full your day got</li></ul></div>' +
      '<div class="card"><h3>What a share card can show</h3><p>Only game things: your puzzle stars and route shape, your companion, finds and decorations. Never anything about medicine.</p></div>' +
      '<div class="card"><h3>No ad trackers</h3><p>No advertising or analytics SDKs from other companies. We don’t sell your data.</p></div>' +
      '<div class="card"><h3>Your lock screen</h3><p>Reminders say “Time for your 8:00 AM check-in,” not the medicine name, unless you change that.</p></div>' +
      '<div class="card"><h3>Leaderboards</h3><p>Boards show only ' + esc(S().comp.name) + '’s name and game scores. Never medicines, check-ins, power-ups or anything about your health.</p></div>' +
      '<div class="card"><h3>Your data, your call</h3><p>Export it anytime. Delete it in two taps from Me.</p></div><div style="height:20px"></div>';
  }

  function family() {
    var leoDef = root.THEMES.expedition.companions[1];
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Back</button><div class="title">Family profiles</div></div>' +
      '<div style="margin:0 16px 10px"><span class="preview-tag">Preview · coming in a later release</span></div>' +
      '<div class="page-h"><h1 style="font-size:1.5rem">Dan logs for Leo</h1><p>One account, a world for each person.</p></div>' +
      '<div class="row" style="margin:0 16px 12px;gap:8px"><span class="person-sw"><span class="avatar" style="background:#0a6b61">D</span>Dan</span><span class="person-sw" style="box-shadow:0 0 0 3px var(--ink)"><span class="avatar" style="background:#8b4dff">L</span>Leo, 8</span><span class="person-sw">Everyone</span></div>' +
      '<section class="hero" style="margin-bottom:12px">' + A.scenery('expedition') + '<div class="hero-inner"><div class="hero-kicker">Leo’s world</div><div class="hero-title">Pebble’s ready</div>' +
      '<div class="stage-row" style="height:180px"><div class="comp-wrap" style="width:130px;height:130px">' + A.companion(leoDef, 'happy', { stage: 1, cosmetics: [] }) + '</div><div class="core-wrap" style="width:170px;height:170px">' + A.core(['filled', 'empty'], 'beacon') + '</div></div>' +
      '<div class="stack-card"><div class="stack-top"><div><div class="stack-name">Evening</div><div class="stack-sub">Controller inhaler · 7:00 PM</div></div></div><button class="btn btn-cta btn-block" data-act="fake-call" data-who="hand-over screen (preview)">🤲 Hand it over to Leo</button>' +
      '<div class="done-chips"><span class="chip ok">✓ Morning · Taken 7:45 AM · logged by Dan</span></div></div></div></section>' +
      '<div class="card"><h3>How it works</h3><ul style="padding-left:20px;font-weight:600;color:var(--ink-2);line-height:1.6"><li>Dan taps “pill out” and hands the phone over. Leo snaps the piece into his own world.</li><li>Each person has their own day worth the same amount. Adding people never adds points.</li><li>Dan earns a small, capped helper bonus for logging for others.</li><li>Under 13: a sticker book with fixed rewards. No chests, no social, no prize draws.</li><li>Kids’ profiles have no Campfire or day count. Their companion still grows as they play.</li><li>Leo’s profile belongs to Dan’s account. Leo has no login.</li></ul></div><div style="height:20px"></div>';
  }

  var taps = [], tapTimer = null;
  root.App.screens.me = render;
  root.App.screens.privacy = privacy;
  root.App.screens.family = family;
  Object.assign(root.App.acts, {
    'set-toggle': function (el) {
      var k = el.getAttribute('data-k'), st = S().settings;
      if (k === 'gameNews') st.gameNotifs = st.gameNotifs > 0 ? 0 : 1;
      else if (k === 'celebrations') { var on = st.celebrations !== false && !st.reducedMotion; st.celebrations = !on; st.reducedMotion = false; }
      else st[k] = !st[k];
      St.save(); root.App.render();
      var msg = { simple: st.simple ? 'Fewer things on Today is on. Check-ins come first.' : 'Fewer things on Today is off.', celebrations: st.celebrations ? 'Big celebrations are on.' : 'Big celebrations are off. You’ll see a simple check mark.' }[k];
      if (msg) U.toast(msg);
    },
    'set-theme': function (el) {
      var v = el.getAttribute('data-v'); if (S().theme === v) return;
      var prev = S().theme; S().theme = v; St.save(); root.App.render();
      U.toast('Look changed. Everything you’ve earned came with you.', { undo: 'theme-undo' });
      root.App._themeUndo = prev;
      U.burstAt(el, { n: 30, spread: 120 });
    },
    'theme-undo': function () { if (root.App._themeUndo) { S().theme = root.App._themeUndo; St.save(); root.App.render(); U.toast('Switched back.'); } },
    'set-ts': function (el) { S().settings.textSize = el.getAttribute('data-v'); St.save(); root.App.render(); },
    'fair-play': function () { fairPlay(); },
    notif: function (el) { var st = S().settings; st.gameNotifs = Math.max(0, Math.min(3, st.gameNotifs + +el.getAttribute('data-d'))); St.save(); root.App.render(); },
    export: function () {
      var s = S(), lines = ['date,check-in,status,time'];
      s.history.slice(-3).forEach(function (h) { h.plan.stacks.forEach(function (st) { var e = h.entries[st.id] || {}; lines.push(E.fmtDate(h.dayNum) + ',' + st.label + ',' + (e.state || 'none') + ',' + (e.at ? E.fmtTime(e.at) : '')); }); });
      U.sheet('Export my data', '<p style="font-weight:600">Your file is ready: your medicines, schedule and every entry with times. Here’s a peek:</p><pre style="background:var(--chip);border-radius:12px;padding:12px;font-size:.8rem;overflow:auto;white-space:pre">' + esc(lines.join('\n')) + '\n…</pre><button class="btn btn-dark btn-block" data-act="fake-call" data-who="share sheet to save the file">Save file</button>');
    },
    'delete-acct': function () { U.sheet('Delete your account?', '<p style="font-weight:600">This removes your medicines, record, companion and collection from this phone and our servers. It can’t be undone.</p><div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-act="sheet-close">Keep my account</button><button class="btn btn-dark" data-act="fake-call" data-who="deletion flow (prototype only)">Delete</button></div>'); },
    'logo-tap': function () {
      var now = Date.now(); taps = taps.filter(function (t) { return now - t < 2000; }); taps.push(now);
      if (taps.length >= 5) { taps = []; root.Demo.open(); }
    }
  });
})(window);
