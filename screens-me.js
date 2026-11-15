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
    return '<button class="theme-card ' + (on ? 'on' : '') + '" data-act="set-theme" data-v="' + id + '" aria-pressed="' + on + '" data-theme="' + id + '"><div class="tc-art" style="background:' + (id === 'grove' ? 'linear-gradient(180deg,#dbe8cf,#fbe7df)' : 'linear-gradient(180deg,#36c6c0,#ffe49a)') + '">' + A.scenery(id) + '<div class="tc-comp">' + A.companion(cd, 'happy') + '</div></div><div class="tc-txt"><div class="tc-name">' + t.name + '</div><div class="tc-sub">' + (on ? '✓ In use' : esc(id === 'grove' ? 'Calm garden' : 'Bright adventure')) + '</div></div></button>';
  }

  function render() {
    var s = S(), st = s.settings, lv = root.RPG.levelInfo(s.compLevel.xp), tm = th();
    var ts = st.textSize;
    return '<div class="page-h"><h1>Me</h1></div>' +
      '<div class="profile"><div class="pf-comp">' + A.companion(Th.companionDef(tm, s.comp.species), 'happy', { aura: !!(root.CampUI && root.CampUI.aura()) }) + '</div><div class="grow"><div class="pf-name">' + esc(s.comp.name) + ' &amp; you</div><div class="pf-sub">Level ' + lv.level + ' · ' + U.fmtNum(s.stars) + ' ★' + (St.campOn() && s.today ? ' · ' + esc(th().camp.stages[St.growth().stage]) : '') + '</div><div class="xpbar" aria-label="' + lv.into + ' of ' + lv.need + ' XP to the next level"><i style="width:' + Math.round(100 * lv.into / lv.need) + '%"></i></div></div></div>' +
      '<div class="sec-h"><h2>Your world</h2><span class="sub">Progress comes with you</span></div><div class="theme-cards">' + themeCard('expedition') + themeCard('grove') + '</div>' +
      '<div class="sec-h"><h2>Comfort</h2></div><div class="set-group">' +
        row('eye', 'Simple view', 'Check-ins, ' + esc(s.comp.name) + ', trips and chests. The puzzle is optional.', toggle('simple', st.simple, 'Simple view')) +
        row('sparkle', 'Calm mode', 'Softer celebrations, no sound, muted colors', toggle('calm', st.calm, 'Calm mode')) +
        row('sparkle', 'Reduce motion', 'Fades instead of movement', toggle('reducedMotion', st.reducedMotion, 'Reduce motion')) +
        '<div class="set-row"><span class="sr-ic" style="font-weight:900">Aa</span><span class="sr-main"><span class="sr-t" style="display:block">Text size</span></span><span class="ts-seg"><button class="' + (ts === 'regular' ? 'on' : '') + '" data-act="set-ts" data-v="regular" aria-label="Regular text">A</button><button class="' + (ts === 'large' ? 'on' : '') + '" data-act="set-ts" data-v="large" aria-label="Large text" style="font-size:1.15em">A</button><button class="' + (ts === 'xl' ? 'on' : '') + '" data-act="set-ts" data-v="xl" aria-label="Extra large text" style="font-size:1.35em">A</button></span></div>' +
        row('bell', 'Sound', 'Little chimes on check-ins and chests', toggle('sound', st.sound, 'Sound')) +
        row('phone', 'Haptics', 'Gentle taps', toggle('haptics', st.haptics, 'Haptics')) +
        row('pill', 'Pill out + Swallowed', 'Two taps, so you never wonder if you took it', toggle('twoStep', st.twoStep, 'Pill out and Swallowed')) +
        (root.CampUI ? root.CampUI.restRow(row) : '') +
      '</div>' +
      '<div class="sec-h"><h2>Notifications</h2></div><div class="set-group">' +
        row('bell', 'Medicine reminders', 'At the times you set. Always separate from game alerts.', toggle('reminders', st.reminders, 'Medicine reminders')) +
        '<div class="set-row"><span class="sr-ic">' + A.icon('sparkle') + '</span><span class="sr-main"><span class="sr-t" style="display:block">Game notifications</span><span class="sr-s">Trip back, draw night. Up to ' + st.gameNotifs + ' a day.</span></span><span class="num-stepper"><button data-act="notif" data-d="-1" aria-label="Fewer">−</button><b>' + st.gameNotifs + '</b><button data-act="notif" data-d="1" aria-label="More">+</button></span></div>' +
        (St.campOn() ? row('sparkle', esc(th().camp.name) + ' reminder', 'Once in the evening if you haven’t played: “' + esc(th().camp.reminder.replace('{name}', s.comp.name)) + '” Never about medicines.', toggle('campReminder', st.campReminder !== false, th().camp.name + ' reminder')) : '') +
        row('lock', 'Hide names on lock screen', 'Shows “Morning stack ready” instead', toggle('discreet', st.discreet, 'Hide names on lock screen')) +
        row('phone', 'Preview your lock screen', 'See what a reminder looks like', A.icon('chev'), 'lockscreen') +
      '</div>' +
      '<div class="promise"><h3>🤝 Fair Play Promise</h3><ul><li>Taking more never earns more. Everyone’s day is worth the same.</li><li>As-needed medicines earn the same small amount, used or not.</li><li>Nothing about your medicines ever goes down. Logged after the usual time? Still counts.</li><li>' + esc(tm.camp.counts) + ' days you play, never doses. Best ever and total days only go up.</li><li>An honest “didn’t take” still earns points.</li><li>We never tell you to take a dose. That’s between you and your care team.</li><li>Nothing is for sale. Chest odds are always shown.</li></ul></div>' +
      '<div class="sec-h"><h2>Privacy &amp; data</h2></div><div class="set-group">' +
        row('shield', 'What’s shared', 'Nothing about your meds. Ever.', A.icon('chev'), 'go', ' data-to="privacy"') +
        row('lock', 'App lock', 'Face ID or a PIN to open Kindling', toggle('appLock', st.appLock, 'App lock')) +
        row('download', 'Export my data', 'Your full record as a file', A.icon('chev'), 'export') +
        row('close', 'Delete my account', 'Removes everything, right away', A.icon('chev'), 'delete-acct') +
      '</div>' +
      '<div class="sec-h"><h2>Coming next</h2><span class="sub">Preview</span></div><div class="set-group">' +
        row('people', 'Family profiles', 'Log for a child or a parent, each with their own world', '<span class="preview-tag">Preview</span>', 'go', ' data-to="family"') +
        row('people', 'Crews', 'Play alongside 4 or more friends', '<span class="preview-tag">Preview</span>', 'go', ' data-to="crew"') +
      '</div>' +
      '<div class="set-group">' + row('info', 'Help', 'Questions, contact us', A.icon('chev'), 'fake-call', ' data-who="support team"') + '</div>' +
      '<button class="about" data-act="logo-tap" style="display:flex;flex-direction:column;align-items:center;gap:4px;margin:18px auto 30px;border:0;background:none;cursor:pointer;color:var(--muted);font-weight:700;font-size:.85rem" aria-label="About Kindling">' + A.logo(40) + '<span style="font-weight:900;color:var(--ink);font-size:1rem">Kindling</span><span>The daily game your meds power · v5 prototype</span></button>';
  }

  function privacy() {
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Me</button><div class="title">What’s shared</div></div>' +
      '<div class="page-h"><h1 style="font-size:1.6rem">Nothing about your meds</h1><p>Plain answers. No fine print.</p></div>' +
      '<div class="card"><h3>Shared with no one</h3><ul style="padding-left:20px;font-weight:600;color:var(--ink-2);line-height:1.6"><li>Medicine names, doses and times</li><li>Whether you took something</li><li>Your record and notes</li><li>How full your day got</li></ul></div>' +
      '<div class="card"><h3>What a share card can show</h3><p>Only game things: your puzzle stars and route shape, your companion, finds and decorations. Never anything about medicine.</p></div>' +
      '<div class="card"><h3>No ad trackers</h3><p>No advertising or analytics SDKs from other companies. We don’t sell your data.</p></div>' +
      '<div class="card"><h3>Your lock screen</h3><p>Reminders say “Morning stack ready,” not the medicine name, unless you change that.</p></div>' +
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
      '<div class="stack-card"><div class="stack-top"><div><div class="stack-name">Evening stack</div><div class="stack-sub">Controller inhaler · 7:00 PM</div></div></div><button class="btn btn-cta btn-block" data-act="fake-call" data-who="hand-over screen (preview)">🤲 Hand it over to Leo</button>' +
      '<div class="done-chips"><span class="chip ok">✓ Morning · Taken 7:45 AM · logged by Dan</span></div></div></div></section>' +
      '<div class="card"><h3>How it works</h3><ul style="padding-left:20px;font-weight:600;color:var(--ink-2);line-height:1.6"><li>Dan taps “pill out” and hands the phone over. Leo snaps the piece into his own world.</li><li>Each person has their own day worth the same amount. Adding people never adds points.</li><li>Dan earns a small, capped helper bonus for logging for others.</li><li>Under 13: a sticker book with fixed rewards. No chests, no social, no prize draws.</li><li>Kids’ profiles have no Campfire or day count. Their companion still grows as they play.</li><li>Leo’s profile belongs to Dan’s account. Leo has no login.</li></ul></div><div style="height:20px"></div>';
  }

  function crew() {
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Me</button><div class="title">Crews</div></div>' +
      '<div style="margin:0 16px 10px"><span class="preview-tag">Preview · coming in a later release</span></div>' +
      '<div class="tile run" style="margin-top:6px"><div class="t-kicker">Crew of 6</div><div class="t-title">The Night Owls</div><div class="t-body">This week: 31 of 40 to the crew chest</div>' +
      '<div style="height:14px;background:rgba(255,255,255,.25);border-radius:8px;margin-top:12px;overflow:hidden"><i style="display:block;height:100%;width:77%;background:#ffd65e;border-radius:8px"></i></div>' +
      '<div class="row" style="margin-top:12px;gap:-6px">' + ['#ff7a3d', '#14a394', '#ffd65e', '#e98bc0', '#7cc4f2', '#b48cff'].map(function (c) { return '<span class="avatar" style="background:' + c + ';box-shadow:0 0 0 2px rgba(255,255,255,.7);margin-right:-6px"></span>'; }).join('') + '</div></div>' +
      '<div class="card"><h3>What counts</h3><p>Checking in (any answer, including “didn’t take”) and playing the daily puzzle. Never medicines.</p></div>' +
      '<div class="card"><h3>What nobody sees</h3><p>Who did what. There are no per-person numbers, no “last active,” and the crew total only shows once there are 4 or more of you.</p></div>' +
      '<div class="card"><h3>Everyone wins together</h3><p>Hit a milestone and every member gets the same crew chest.</p></div><div style="height:20px"></div>';
  }

  var taps = [], tapTimer = null;
  root.App.screens.me = render;
  root.App.screens.privacy = privacy;
  root.App.screens.family = family;
  root.App.screens.crew = crew;
  Object.assign(root.App.acts, {
    'set-toggle': function (el) {
      var k = el.getAttribute('data-k'); S().settings[k] = !S().settings[k]; St.save(); root.App.render();
      var msg = { simple: S().settings.simple ? 'Simple view is on. Today shows the essentials.' : 'Simple view is off.', calm: S().settings.calm ? 'Calm mode is on.' : 'Calm mode is off.' }[k];
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
    notif: function (el) { var st = S().settings; st.gameNotifs = Math.max(0, Math.min(3, st.gameNotifs + +el.getAttribute('data-d'))); St.save(); root.App.render(); },
    export: function () {
      var s = S(), lines = ['date,stack,status,time'];
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
