/* Kindling v5 — screens-onboarding.js : ~2 minutes to the aha. No account wall.
 * world -> companion -> ItemEditor (What is it? · When? · Review) -> "ever wonder if you took it?" (not for habits)
 * -> practice catch -> practice board -> first chest -> the companion's first quest -> Today.
 * v5.5: the item step is the SAME ItemEditor used by "+ Add" and "Edit". Calm mode is gone from the world picker. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, esc = U.esc;
  var ob;
  var OBKEY = 'kindling-v55-ob';
  // v5.6: 'more' (A2: "Add another" / "That's it for now") comes after the first item is saved.
  var NAMES = ['welcome', 'world', 'buddy', 'ie1', 'ie2', 'ie3', 'more', 'wonder', 'practice', 'run', 'chest', 'trip'];
  var CHEST = NAMES.indexOf('chest');
  function initial() { return { active: true, step: 0, theme: 'expedition', species: null, name: '', items: [], editIdx: null, twoStep: true, practice: 'idle', dest: null, chestResult: null }; }
  function reset() { ob = initial(); try { localStorage.removeItem(OBKEY); } catch (e) { } }
  ob = initial();
  // Resume onboarding where it stopped after a reload (steps before the first real chest only)
  try { var saved = JSON.parse(localStorage.getItem(OBKEY) || 'null'); if (saved && saved.active && saved.step > 0 && saved.step < CHEST && saved.items) { ob = saved; if (ob.practice === 'out') ob.practice = 'idle'; } } catch (e) { }
  function persist() { try { if (ob.active && ob.step < CHEST) localStorage.setItem(OBKEY, JSON.stringify(ob)); else localStorage.removeItem(OBKEY); } catch (e) { } }
  function th() { return root.THEMES[ob.theme]; }
  function compDef() { return Th.companionDef(th(), ob.species || th().companions[0].id); }
  var STEPS = 9;

  // Every screen after the welcome counts once, in order (round 2): World … the night step = "N of N". The "one quick
  // question" screen only counts when something you take was added (habits skip it).
  function visibleSteps() { return NAMES.slice(1).filter(function (n) { return n !== 'wonder' || !ob.items || !ob.items.length || ob.items.some(function (it) { return it.type !== 'habit'; }); }); }
  function stepAt() { var v = visibleSteps(), i = v.indexOf(NAMES[ob.step]); return { n: Math.max(1, i + 1), of: v.length }; }
  function progress() { var st = stepAt(); var h = '<div class="ob-progress" aria-hidden="true">'; for (var i = 1; i <= st.of; i++) h += '<i class="' + (i <= st.n ? 'on' : '') + '"></i>'; return h + '</div>'; }
  // v5.6 (A8): every step after the welcome has a Back (top-left ‹). Going back keeps what was entered.
  function backBtn() { return ob.step > 0 ? '<button type="button" class="ob-back" data-act="ob-back">' + A.icon('back') + 'Back</button>' : ''; }
  function wrap(body, foot, noProg) {
    return '<div class="ob" data-theme="' + ob.theme + '">' + backBtn() + (noProg ? '' : progress() + '<div class="ob-steplabel">Step ' + stepAt().n + ' of ' + stepAt().of + '</div>') + '<div class="ob-body">' + body + '</div><div class="ob-foot">' + foot + '</div></div>';
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
    return wrap('<h1>Pick your world</h1><p class="lede" style="margin-bottom:16px">Same game, different look. Switch anytime and your progress comes with you.</p>' + worldCard('expedition') + worldCard('grove'),
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
  /* The item step IS the shared ItemEditor (same controls, words and order as "+ Add" and "Edit"); only the chrome differs. */
  function ensureEditor(sub) {
    var IE = root.ItemEditor, st = IE.state();
    if (!st || st.mode !== 'onboarding') {
      var it = ob.editIdx != null ? ob.items[ob.editIdx] : null;
      st = IE.open('onboarding', it ? { item: it, first: ob.editIdx === 0 } : { first: !ob.items.length, blank: ob.items.length > 0 });
    }
    if (sub) st.step = sub;
    return st;
  }
  function stepEditor() {
    var IE = root.ItemEditor, st = ensureEditor();
    ob.step = 2 + st.step; // keep the progress dots in step with the editor
    var foot = '<button class="btn btn-cta btn-block" data-act="' + (st.step < 3 ? 'ie-next' : 'ie-save') + '">' + (st.step < 3 ? 'Next' : 'Looks good') + '</button>';
    return wrap('<div class="ob-ie clin">' + IE.body() + '</div>', foot).replace('data-act="ob-back"', 'data-act="ie-back"');
  }
  /* A2: after the first item is saved, "Add another" and "That's it for now" side by side. */
  function stepMore() {
    var rows = ob.items.map(function (it, i) {
      return '<button type="button" class="ob-item" data-act="ob-edit-item" data-i="' + i + '">' + A.itemIcon(it) + '<span class="grow"><span class="ob-item-n">' + esc(it.name + (it.strength ? ' ' + it.strength : '')) + '</span><span class="ob-item-s">' + esc(E.scheduleSentence(it)) + '</span></span><span class="ob-item-e">Edit</span></button>';
    }).join('');
    return wrap('<h1>' + (ob.items.length === 1 ? 'Added!' : 'Added ' + ob.items.length + ' things') + '</h1><p class="lede">This is a quick start. You can add the rest any time from My list.</p><div class="ob-items">' + rows + '</div>',
      '<div class="ob-pair"><button class="btn btn-2" data-act="ob-add-another">+ Add another</button><button class="btn btn-cta" data-act="ob-done-adding">That’s it for now</button></div>');
  }
  function anyTakes() { return ob.items.some(function (it) { return it.type !== 'habit'; }); }
  function stepWonder() {
    return wrap('<h1>One quick question</h1><p class="lede">Ever take a pill out, get sidetracked, and later wonder if you actually took it?</p>' +
      '<div class="ob-hero" style="height:200px;margin-top:18px">' + A.scenery(ob.theme) + '<div class="ob-comp" style="width:130px;height:130px;bottom:10px">' + A.companion(compDef(), 'holding') + '</div><div class="held-frag" style="left:50%;top:auto;bottom:62px;margin-left:-24px">' + A.fragment(ob.theme === 'grove' ? 'bloom' : 'beacon') + '</div></div>' +
      '<div class="big-choice"><button class="' + (ob.twoStep ? 'on' : '') + '" data-act="ob-wonder" data-v="1"><span class="bc-em">🙋</span><span><span class="bc-t" style="display:block">Yes, that’s me</span><span class="bc-s">Use two taps: Pill out, then Swallowed</span></span></button>' +
      '<button class="' + (!ob.twoStep ? 'on' : '') + '" data-act="ob-wonder" data-v="0"><span class="bc-em">👍</span><span><span class="bc-t" style="display:block">Not really</span><span class="bc-s">One tap: Took it</span></span></button></div>' +
      '', '<button class="btn btn-cta btn-block" data-act="ob-next">Continue</button>');
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
    var t = th(), r = ob.chestResult;
    if (r) { // already opened (you came back with ‹): show what was inside, no second chest
      var tm = Th.T({ theme: ob.theme });
      return wrap('<h1>Your first ' + esc(t.terms.chest.toLowerCase()) + '</h1><p class="lede">Here’s what was inside. It’s already in your ' + esc(t.terms.album) + '.</p>' +
        '<div class="ob-got">' + r.finds.map(function (f) { var a = Th.findArt(tm, f.id); return '<span class="ob-got-f"><span class="em">' + a.icon + '</span>' + esc(a.name) + '</span>'; }).join('') + '<span class="ob-got-f">+' + r.stars + ' ★</span></div>',
        '<button class="btn btn-cta btn-block" data-act="ob-chest">Continue</button>');
    }
    return wrap('<h1>Your first ' + esc(t.terms.chest.toLowerCase()) + '</h1><p class="lede">A welcome gift. Chests hold ' + esc(t.terms.finds) + ' for your ' + esc(t.terms.album) + '. The odds are always one tap away.</p>' +
      '<div style="display:grid;place-items:center;margin-top:30px"><div class="chest-stage" style="width:220px;height:190px">' + A.chest('bronze') + '</div></div>',
      '<button class="btn btn-cta btn-block" data-act="ob-chest">Open it</button>');
  }
  /* A10: the overnight step explains itself before it asks anything. Three short lines, then one button. */
  function stepTrip() {
    var nm = ob.name || compDef().defaultName, pr = (compDef().pron || ['they'])[0];
    var lines = ['Every night at 9 PM, ' + nm + ' heads out to explore.', 'In the morning, see what ' + pr + ' found.', 'Tomorrow, you can pick where ' + pr + ' goes.'];
    return wrap('<h1>While you sleep</h1>' +
      '<div class="ob-hero ob-night">' + A.scenery(ob.theme) + '<div class="ob-comp">' + A.companion(compDef(), 'wave') + '</div></div>' +
      '<ol class="ob-seq">' + lines.map(function (l, i) { return '<li style="animation-delay:' + (i * 0.7) + 's"><span class="ob-seq-n" aria-hidden="true">' + (['🌙', '☀️', '🧭'][i]) + '</span>' + esc(l) + '</li>'; }).join('') + '</ol>',
      '<button class="btn btn-cta btn-block ob-send" data-act="ob-finish">Sounds good</button>');
  }

  function render() {
    var n = NAMES[ob.step] || 'welcome';
    if (n === 'ie1' || n === 'ie2' || n === 'ie3') return stepEditor();
    return ({ welcome: stepWelcome, world: stepWorld, buddy: stepCompanion, more: stepMore, wonder: stepWonder, practice: stepPractice, run: stepRun, chest: stepChest, trip: stepTrip })[n]();
  }
  function stepIndex(n) { return NAMES.indexOf(n); }
  function readInputs() {
    var n = document.getElementById('obName'); if (n) ob.name = n.value.trim() || compDef().defaultName;
  }
  function go(step) { readInputs(); ob.step = step; persist(); root.App.render(); var b = document.querySelector('.ob-body'); if (b) b.scrollTop = 0; }

  // Called by the ItemEditor when its Review is confirmed in onboarding.
  function editorSaved(item) {
    if (ob.editIdx != null && ob.items[ob.editIdx]) ob.items[ob.editIdx] = item; else ob.items.push(item);
    ob.editIdx = null; root.ItemEditor.close();
    go(stepIndex('more'));
  }
  // ‹ on the editor's first screen: back to "Added!" when adding another, else back to the buddy.
  function editorBack() { root.ItemEditor.close(); ob.editIdx = null; go(stepIndex(ob.items.length ? 'more' : 'buddy')); }
  function prevStep() {
    var n = NAMES[ob.step];
    if (n === 'more') { ob.editIdx = ob.items.length - 1; ensureEditor(3); return stepIndex('ie3'); }
    if (n === 'wonder') return stepIndex('more');
    if (n === 'practice') return stepIndex(anyTakes() ? 'wonder' : 'more');
    if (n === 'trip') return stepIndex('chest');
    if (n === 'buddy') return stepIndex('world');
    return Math.max(0, ob.step - 1);
  }
  root.Onboarding = { render: render, get active() { return ob.active; }, reset: reset, state: function () { return ob; }, editorSaved: editorSaved, editorBack: editorBack, stepIndex: stepIndex };
  Object.assign(root.App.acts, {
    'ob-next': function () {
      if (NAMES[ob.step] === 'buddy') { readInputs(); ob.editIdx = ob.items.length ? 0 : null; ensureEditor(1); go(stepIndex('ie1')); return; }
      go(ob.step + 1);
    },
    'ob-back': function () { readInputs(); go(prevStep()); },
    'ob-add-another': function () { ob.editIdx = null; root.ItemEditor.close(); ensureEditor(1); go(stepIndex('ie1')); },
    'ob-edit-item': function (el) { ob.editIdx = +el.getAttribute('data-i'); root.ItemEditor.close(); ensureEditor(3); go(stepIndex('ie3')); },
    'ob-done-adding': function () { go(stepIndex(anyTakes() ? 'wonder' : 'practice')); },
    'ob-signin': function () { U.toast('Sign-in comes later. Your progress saves on this phone until then.'); },
    'ob-theme': function (el) { ob.theme = el.getAttribute('data-v'); St.S.theme = ob.theme; St.save(); ob.species = null; ob.name = ''; root.App.render(); },
    'ob-comp': function (el) { readInputs(); var prevDefault = compDef().defaultName; ob.species = el.getAttribute('data-v'); if (!ob.name || ob.name === prevDefault) ob.name = compDef().defaultName; root.App.render(); U.sfx('tap'); },
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
    'ob-run': function () { root.Extra.openRun({ onboarding: true, practice: true, tutorial: true, onDone: function () { go(CHEST); } }); },
    'ob-chest': function () {
      // complete onboarding into real state, then open the first chest with the shared chest animation (one tap: A9).
      // Coming back with ‹ re-applies what you changed and keeps the chest you already opened.
      St.finishOnboarding({ theme: ob.theme, comp: { species: ob.species || th().companions[0].id, name: ob.name || compDef().defaultName }, items: ob.items, twoStep: anyTakes() ? ob.twoStep : false, dest: null, now: St.isLive() ? new Date() : null, chestResult: ob.chestResult });
      if (ob.chestResult) { St.questDone('chest'); St.save(); go(stepIndex('trip')); return; } // the first chest's goal stays done
      var id = St.addChest('bronze', 'first');
      root.CollectionUI.chestFx(id, function () { var c = St.S.chests.filter(function (x) { return x.id === id; })[0]; if (c && c.result) ob.chestResult = { finds: c.result.finds, stars: c.result.stars }; go(stepIndex('trip')); });
    },
    'ob-finish': function () {
      // The first quest is a real quest (the recommended one, same as "Get ready + Send"); it leaves at 9 PM and is back at 6 AM.
      St.S.trip = { status: 'home' }; St.S.today.tripSent = false; St.sendQuest(St.recommendedQuest()); St.save();
      ob.active = false; persist(); root.App.ui.tab = 'today'; root.App.ui.stack = []; root.App.render();
      U.toast('Welcome to Kindling!');
    }
  });
})(window);
