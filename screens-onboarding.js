/* Kindling v5 — screens-onboarding.js : ~2 minutes to the aha. No account wall.
 * world -> companion -> what to remember -> "ever wonder if you took it?" -> practice catch -> tutorial Run -> first chest -> Trip leaves -> Today */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, esc = U.esc;
  var ob;
  var OBKEY = 'kindling-v5-ob';
  function initial() { return { active: true, step: 0, theme: 'expedition', species: null, name: '', mode: 'meds', medName: '', time: '08:00', twoStep: true, practice: 'idle', dest: null }; }
  function reset() { ob = initial(); try { localStorage.removeItem(OBKEY); } catch (e) { } }
  ob = initial();
  // Resume onboarding where it stopped after a reload (steps before the first real chest only)
  try { var saved = JSON.parse(localStorage.getItem(OBKEY) || 'null'); if (saved && saved.active && saved.step > 0 && saved.step < 7) { ob = saved; if (ob.practice === 'out') ob.practice = 'idle'; } } catch (e) { }
  function persist() { try { if (ob.active && ob.step < 7) localStorage.setItem(OBKEY, JSON.stringify(ob)); else localStorage.removeItem(OBKEY); } catch (e) { } }
  function th() { return root.THEMES[ob.theme]; }
  function compDef() { return Th.companionDef(th(), ob.species || th().companions[0].id); }
  var STEPS = 8;

  function progress() { var h = '<div class="ob-progress" aria-hidden="true">'; for (var i = 1; i <= STEPS; i++) h += '<i class="' + (i <= ob.step ? 'on' : '') + '"></i>'; return h + '</div>'; }
  function wrap(body, foot, noProg) {
    return '<div class="ob" data-theme="' + ob.theme + '">' + (noProg ? '' : progress()) + '<div class="ob-body">' + body + '</div><div class="ob-foot">' + foot + '</div></div>';
  }

  function stepWelcome() {
    var t = th(), cd = t.companions[0];
    return wrap('<div style="display:flex;align-items:center;gap:8px;margin-top:6px">' + A.logo(34) + '<span style="font-weight:900;font-size:1.4rem;letter-spacing:-.4px">Kindling</span></div>' +
      '<div class="ob-hero">' + A.scenery(ob.theme) + '<div class="ob-core">' + A.core(['filled', 'filled', 'filled', 'empty'], 'beacon') + '</div><div class="ob-comp">' + A.companion(cd, 'wave') + '</div></div>' +
      '<h1>The daily game your meds power.</h1><p class="lede">You take what you already take. We turn it into a game. Nothing here ever goes down.</p>',
      '<button class="btn btn-cta btn-block" data-act="ob-next" data-autofocus>Let’s play</button><button class="btn btn-ghost btn-block" data-act="ob-signin">I already have an account</button>', true);
  }
  function worldCard(id) {
    var t = root.THEMES[id];
    return '<button class="world-card ' + (ob.theme === id ? 'on' : '') + '" data-act="ob-theme" data-v="' + id + '" data-theme="' + id + '" aria-pressed="' + (ob.theme === id) + '"><div class="wc-art" style="background:' + (id === 'grove' ? 'linear-gradient(180deg,#dbe8cf,#fbe7df)' : 'linear-gradient(180deg,#36c6c0,#ffe49a)') + '">' + A.scenery(id) + '<div class="wc-comps">' + t.companions.map(function (c) { return '<div>' + A.companion(c, 'happy') + '</div>'; }).join('') + '</div></div>' +
      '<div class="wc-txt"><div class="wc-name">' + t.name + '</div><div class="wc-sub">' + esc(t.blurb) + '</div></div><span class="wc-check">' + A.icon('check') + '</span></button>';
  }
  function stepWorld() {
    return wrap('<h1>Pick your world</h1><p class="lede" style="margin-bottom:16px">Same game, different look. Switch anytime and your progress comes with you.</p>' + worldCard('expedition') + worldCard('grove') +
      '<div class="set-group" style="margin:6px 0 0"><div class="set-row"><span class="sr-main"><span class="sr-t" style="display:block">Calm mode</span><span class="sr-s">Softer celebrations, no sound</span></span><button class="toggle" role="switch" aria-label="Calm mode" aria-checked="' + (St.S.settings.calm ? 'true' : 'false') + '" data-act="ob-calm"></button></div></div>',
      '<button class="btn btn-cta btn-block" data-act="ob-next">Continue</button>');
  }
  function stepCompanion() {
    var t = th(); if (!ob.species) { ob.species = t.companions[0].id; }
    if (!ob.name) ob.name = compDef().defaultName;
    return wrap('<h1>Meet your buddy</h1><p class="lede">They’ll catch every piece you earn and go exploring at night.</p>' +
      '<div class="comp-pick">' + t.companions.map(function (c) { return '<button class="comp-opt ' + (ob.species === c.id ? 'on' : '') + '" data-act="ob-comp" data-v="' + c.id + '" aria-pressed="' + (ob.species === c.id) + '"><div class="co-art">' + A.companion(c, ob.species === c.id ? 'delighted' : 'happy') + '</div><span class="co-name">' + esc(c.species) + '</span><span class="co-vibe">' + esc(c.vibe) + '</span></button>'; }).join('') + '</div>' +
      '<div class="field" style="margin-top:18px"><label for="obName" style="font-weight:800">Name them</label><input class="input" id="obName" value="' + esc(ob.name) + '" maxlength="14"></div>',
      '<button class="btn btn-cta btn-block" data-act="ob-next">That’s my buddy</button>');
  }
  function stepRemember() {
    var times = [['08:00', 'Morning'], ['12:00', 'Midday'], ['18:00', 'Evening'], ['21:30', 'Bedtime']];
    return wrap('<h1>What do you want to remember every day?</h1>' +
      '<div class="big-choice"><button class="' + (ob.mode === 'meds' ? 'on' : '') + '" data-act="ob-mode" data-v="meds"><span class="bc-em">💊</span><span><span class="bc-t" style="display:block">A medicine</span><span class="bc-s">Prescription or over the counter</span></span></button>' +
      '<button class="' + (ob.mode === 'habits' ? 'on' : '') + '" data-act="ob-mode" data-v="habits"><span class="bc-em">🌿</span><span><span class="bc-t" style="display:block">A vitamin or habit</span><span class="bc-s">Vitamins, water, a stretch, the dog’s pill</span></span></button></div>' +
      '<div class="field" style="margin-top:16px"><label for="obMed" style="font-weight:800">What do you call it?</label><input class="input" id="obMed" value="' + esc(ob.medName) + '" placeholder="' + (ob.mode === 'habits' ? 'e.g. Vitamin D' : 'e.g. “focus pill” or its name') + '"><p style="font-size:.85rem;color:var(--muted);font-weight:600;margin-top:6px">A nickname is fine. It stays on your phone and is never shared.</p></div>' +
      '<div class="field"><div class="lab" style="font-weight:800;margin-bottom:6px">When?</div><div class="chips">' + times.map(function (x) { return '<button class="chip-btn ' + (ob.time === x[0] ? 'on' : '') + '" data-act="ob-time" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>',
      '<button class="btn btn-cta btn-block" data-act="ob-next">Continue</button>');
  }
  function stepWonder() {
    return wrap('<h1>One quick question</h1><p class="lede">Ever take a pill out, get sidetracked, and later wonder if you actually took it?</p>' +
      '<div class="ob-hero" style="height:200px;margin-top:18px">' + A.scenery(ob.theme) + '<div class="ob-comp" style="width:130px;height:130px;bottom:10px">' + A.companion(compDef(), 'holding') + '</div><div class="held-frag" style="left:50%;top:auto;bottom:62px;margin-left:-24px">' + A.fragment(ob.theme === 'grove' ? 'bloom' : 'beacon') + '</div></div>' +
      '<div class="big-choice"><button class="' + (ob.twoStep ? 'on' : '') + '" data-act="ob-wonder" data-v="1"><span class="bc-em">🙋</span><span><span class="bc-t" style="display:block">Yes, that’s me</span><span class="bc-s">Use two taps: Pill out, then Swallowed</span></span></button>' +
      '<button class="' + (!ob.twoStep ? 'on' : '') + '" data-act="ob-wonder" data-v="0"><span class="bc-em">👍</span><span><span class="bc-t" style="display:block">Not really</span><span class="bc-s">One tap: Took it</span></span></button></div>',
      '<button class="btn btn-cta btn-block" data-act="ob-next">Continue</button>');
  }
  function stepPractice() {
    var st = ob.practice, style = ob.theme === 'grove' ? 'bloom' : 'beacon', t = th();
    var pieces = st === 'done' ? ['filled'] : st === 'out' ? ['pending'] : ['empty'];
    var speech = st === 'idle' ? 'Try it! Tap Pill out.' : st === 'out' ? t.lines.holding : 'That’s a full ' + t.terms.charge + '!';
    var btn = st === 'idle' ? '<button class="btn btn-cta btn-block" data-act="ob-pout"><span class="big-ic">✋</span> Pill out</button>'
      : st === 'out' ? '<button class="btn btn-cta btn-block" data-act="ob-swallow"><span class="big-ic">✓</span> Swallowed</button>'
      : '<button class="btn btn-cta btn-block" data-act="ob-next">Spend it</button>';
    return wrap('<div class="row"><h1 class="grow" style="font-size:1.7rem">Practice catch</h1><span class="practice-tag">Practice</span></div><p class="lede">Each day is worth one full ' + esc(t.terms.charge) + '. Your doses are the pieces, and pieces build power-ups.</p>' +
      '<section class="hero" style="margin:16px 0 0">' + A.scenery(ob.theme) + '<div class="hero-inner"><div class="stage-row"><div class="speech" id="speech">' + esc(speech) + '</div>' +
      '<div class="comp-wrap" id="compWrap"><div class="c-idle">' + A.companion(compDef(), st === 'out' ? 'holding' : st === 'done' ? 'delighted' : 'happy') + '</div>' + (st === 'out' ? '<div class="held-frag" id="heldFrag">' + A.fragment(style) + '</div>' : '') + '</div>' +
      '<div class="core-wrap" id="coreWrap">' + A.core(pieces, style) + '</div><div class="core-label">' + (st === 'done' ? 'Full ' + esc(t.terms.charge) + '!' : 'Today’s ' + esc(t.terms.charge) + ': 1 ' + esc(t.terms.piece) + ' to go') + '</div></div></div></section>' +
      '<p style="font-size:.85rem;color:var(--muted);font-weight:600;margin-top:12px">Practice only. Nothing goes in your record.</p>', btn);
  }
  function stepRun() {
    var t = th();
    return wrap('<h1>Now play</h1><p class="lede">Every day there’s a fresh ' + esc(t.terms.run) + ': a short path puzzle. Reach the 3 stars, grab finds on the way. Power-ups make your haul bigger.</p>' +
      '<div class="tile run" style="margin:18px 0 0"><div class="deco">🧩</div><div class="t-kicker">Practice board</div><div class="t-title">Learn the ropes in a minute</div><div class="fuel"><span class="pu-badge">' + t.powerUps.magnet.icon + '</span><div><div class="fuel-text">Your practice catch built a ' + esc(t.powerUps.magnet.name) + '.</div><div class="fuel-sub">It’s saved for your first real board.</div></div></div></div>',
      '<button class="btn btn-cta btn-block" data-act="ob-run">▶ Play the practice board</button><button class="btn btn-ghost btn-block" data-act="ob-next">Skip for now</button>');
  }
  function stepChest() {
    var t = th();
    return wrap('<h1>Your first ' + esc(t.terms.chest.toLowerCase()) + '</h1><p class="lede">A welcome gift. Chests hold ' + esc(t.terms.finds) + ' for your ' + esc(t.terms.album) + '. The odds are always one tap away.</p>' +
      '<div style="display:grid;place-items:center;margin-top:30px"><div class="chest-stage" style="width:220px;height:190px">' + A.chest('bronze') + '</div></div>',
      '<button class="btn btn-cta btn-block" data-act="ob-chest">Open it</button>');
  }
  function stepTrip() {
    var t = th();
    return wrap('<h1>' + esc(ob.name) + ' heads out tonight</h1><p class="lede">Pick a spot. Come see what comes back in the morning.</p>' +
      '<div class="opt-list" style="margin-top:16px">' + t.destinations.map(function (d) { return '<button class="opt ' + (ob.dest === d.id ? 'on' : '') + '" data-act="ob-dest" data-v="' + d.id + '" style="border-color:' + (ob.dest === d.id ? 'var(--ink)' : 'var(--line)') + ';background:var(--card);color:var(--ink)"><span style="font-size:2rem">' + d.icon + '</span><span><span class="o-t" style="display:block">' + esc(d.name.replace(/^the /, '').replace(/^./, function (c) { return c.toUpperCase(); })) + '</span><span class="o-s" style="color:var(--muted)">' + esc(d.route) + '</span></span></button>'; }).join('') + '</div>' +
      '<div class="card" style="margin:16px 0 0"><div class="row"><span class="dit-btn" style="pointer-events:none">' + A.icon('clock') + 'Did I take it?</span><p style="margin:0;font-weight:700">Tap this anytime to see exactly when you took it.</p></div></div>',
      '<button class="btn btn-cta btn-block" data-act="ob-finish" ' + (ob.dest ? '' : 'disabled style="opacity:.5"') + '>Let’s go</button>');
  }

  function render() {
    var view = [stepWelcome, stepWorld, stepCompanion, stepRemember, stepWonder, stepPractice, stepRun, stepChest, stepTrip][ob.step]();
    return view;
  }
  function readInputs() {
    var n = document.getElementById('obName'); if (n) ob.name = n.value.trim() || compDef().defaultName;
    var m = document.getElementById('obMed'); if (m) ob.medName = m.value.trim();
  }
  function go(step) { readInputs(); ob.step = step; persist(); root.App.render(); var b = document.querySelector('.ob-body'); if (b) b.scrollTop = 0; }

  root.Onboarding = { render: render, get active() { return ob.active; }, reset: reset, state: function () { return ob; } };
  Object.assign(root.App.acts, {
    'ob-next': function () {
      if (ob.step === 3) { readInputs(); if (!ob.medName) ob.medName = ob.mode === 'habits' ? 'Vitamin D' : 'Morning med'; }
      go(ob.step + 1);
    },
    'ob-signin': function () { U.toast('Sign-in comes later. Your progress saves on this phone until then.'); },
    'ob-theme': function (el) { ob.theme = el.getAttribute('data-v'); St.S.theme = ob.theme; St.save(); ob.species = null; ob.name = ''; root.App.render(); },
    'ob-calm': function () { St.S.settings.calm = !St.S.settings.calm; root.App.render(); },
    'ob-comp': function (el) { readInputs(); var prevDefault = compDef().defaultName; ob.species = el.getAttribute('data-v'); if (!ob.name || ob.name === prevDefault) ob.name = compDef().defaultName; root.App.render(); U.sfx('tap'); },
    'ob-mode': function (el) { readInputs(); ob.mode = el.getAttribute('data-v'); root.App.render(); },
    'ob-time': function (el) { readInputs(); ob.time = el.getAttribute('data-v'); root.App.render(); },
    'ob-wonder': function (el) { ob.twoStep = el.getAttribute('data-v') === '1'; root.App.render(); },
    'ob-pout': function () { ob.practice = 'out'; U.sfx('out'); U.haptic(12); root.App.render(); var cw = document.getElementById('compWrap'); if (cw) cw.classList.add('react'); },
    'ob-swallow': function () {
      var from = document.getElementById('heldFrag'), to = document.getElementById('coreWrap');
      U.fly(from, to, A.fragment(ob.theme === 'grove' ? 'bloom' : 'beacon'), function () {
        ob.practice = 'done'; root.App.render();
        var cw = document.getElementById('coreWrap'); if (cw) { cw.classList.add('snap'); U.$$('#coreWrap .facet').forEach(function (p) { p.classList.add('just-filled'); }); U.burstAt(cw, { n: 60, spread: 180, wave: true }); }
        var comp = document.getElementById('compWrap'); if (comp) comp.classList.add('react');
        U.sfx('full'); U.haptic([20, 40, 20, 40, 60]);
        U.popAt(cw, ['+80 ★', '+80 XP']);
        setTimeout(function () {
          var t = th();
          U.sfx('pu');
          U.full('<div class="rays"></div><div class="big-item">' + t.powerUps.magnet.icon + '</div><div class="f-title" style="margin-top:22px">' + esc(t.powerUps.magnet.name) + ' power-up!</div><div class="f-sub">Your practice catch built this ' + esc(t.powerUps.magnet.name) + '. ' + esc(t.powerUps.magnet.does) + '.</div><div class="f-sub" style="opacity:.85;font-size:.9rem">Every full ' + esc(t.terms.charge) + ' pops a power-up. Leftover ' + esc(t.terms.piece) + 's carry over.</div><div class="f-actions"><button class="btn btn-light" data-act="ov-next" data-autofocus>Nice!</button></div>', { bg: ob.theme === 'grove' ? 'grove-bg' : 'dark' });
          setTimeout(function () { var bi = document.querySelector('.big-item'); if (bi) U.burstAt(bi, { n: 40, spread: 170, wave: true }); }, 350);
        }, 1300);
      });
    },
    'ob-run': function () { root.Extra.openRun({ onboarding: true, practice: true, tutorial: true, onDone: function () { go(7); } }); },
    'ob-chest': function () {
      // complete onboarding into real state, then open the first chest with the shared chest animation
      St.finishOnboarding({ theme: ob.theme, comp: { species: ob.species || th().companions[0].id, name: ob.name || compDef().defaultName }, mode: ob.mode, medName: ob.medName, time: ob.time, twoStep: ob.twoStep, dest: null });
      var id = St.addChest('bronze', 'first');
      root.CollectionUI.chestFx(id, function () { go(8); });
    },
    'ob-dest': function (el) { ob.dest = el.getAttribute('data-v'); root.App.render(); },
    'ob-finish': function () {
      if (!ob.dest) return;
      St.S.trip = { status: 'out', dest: ob.dest, leftDay: St.S.day }; St.S.today.tripSent = true; St.save();
      ob.active = false; persist(); root.App.ui.tab = 'today'; root.App.ui.stack = []; root.App.render();
      U.toast('Welcome to Kindling!');
    }
  });
})(window);
