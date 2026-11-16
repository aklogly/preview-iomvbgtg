/* Kindling v5 — app.js : router, tab bar, event delegation. Loaded before the screen modules (they register into App). */
(function (root) {
  'use strict';
  var App = root.App = { ui: { tab: 'today', stack: [] }, screens: {}, acts: {}, afterHooks: {}, clinScreens: {} };
  var TABS = [['today', 'Today'], ['collection', 'Collection'], ['meds', 'My list'], ['me', 'Me']];
  var lastKey = null;

  App.render = function () {
    var St = root.Store, S = St.S, E = root.Engine, A = root.Art;
    var body = document.body, html = document.documentElement;
    body.setAttribute('data-theme', S.theme);
    body.classList.toggle('calm', root.UI.calm());
    body.classList.toggle('rm', root.UI.calm());
    html.classList.remove('ts-large', 'ts-xl');
    if (S.settings.textSize === 'large') html.classList.add('ts-large');
    if (S.settings.textSize === 'xl') html.classList.add('ts-xl');
    var sbt = document.getElementById('sbTime'); if (sbt) sbt.textContent = S.today ? E.fmtTime(S.clock).replace(/ (AM|PM)/, '') : '9:41';
    App.demoChip();
    var view = document.getElementById('view'), tabbar = document.getElementById('tabbar');
    if (root.Onboarding.active || !S.onboarded) {
      view.innerHTML = ''; tabbar.classList.add('hidden');
      var old = document.querySelector('#screen > .ob'); if (old) old.remove();
      var holder = document.createElement('div'); holder.innerHTML = root.Onboarding.render();
      document.getElementById('screen').insertBefore(holder.firstChild, document.getElementById('overlay-root'));
      lastKey = 'ob';
      return;
    }
    var ob = document.querySelector('#screen > .ob'); if (ob) ob.remove();
    var top = App.ui.stack[App.ui.stack.length - 1];
    var name = top ? top.name : App.ui.tab;
    var key = name + JSON.stringify(top ? top.params : {});
    var keep = key === lastKey ? view.scrollTop : 0;
    if (key !== lastKey && lastKey && root.UI.clearToast) root.UI.clearToast(); // a message belongs to the screen it was said on
    var fn = App.screens[name] || App.screens.today;
    view.innerHTML = fn(top ? top.params : null);
    view.scrollTop = keep;
    lastKey = key;
    view.style.background = App.clinScreens[name] ? 'var(--clin-bg)' : '';
    tabbar.classList.remove('hidden');
    var active = top && App.clinScreens[name] ? 'meds' : top && (name === 'privacy' || name === 'crew') ? 'me' : top && (name === 'leaderboard' || name === 'draw') ? 'today' : App.ui.tab;
    tabbar.innerHTML = TABS.map(function (t) {
      var dot = t[0] === 'collection' && (S.chests.some(function (c) { return !c.opened; }) || (root.ProgressUI && root.ProgressUI.anyReady())) ? '<span class="tab-dot" aria-hidden="true"></span>' : '';
      return '<button class="tab ' + (active === t[0] ? 'active' : '') + '" data-act="tab" data-t="' + t[0] + '" aria-current="' + (active === t[0] ? 'page' : 'false') + '">' + A.icon(t[0] === 'meds' ? 'mylist' : t[0]) + dot + '<span>' + t[1] + '</span></button>';
    }).join('');
    var hook = App.afterHooks[name]; if (hook) hook();
    root.UI.placeBanner(false); // keep a live banner in place across re-renders
  };
  App.go = function (name, params) {
    App.ui.stack.push({ name: name, params: params || {} }); App.render(); document.getElementById('view').scrollTop = 0;
    try { history.pushState({ depth: App.ui.stack.length }, ''); } catch (e) { }
  };
  App.back = function (fromPop) { App.ui.stack.pop(); App.render(); if (!fromPop && history.state && history.state.depth) { App._ignorePop = true; try { history.back(); } catch (e) { App._ignorePop = false; } } };
  // Browser / Android back steps back inside the app instead of leaving it.
  window.addEventListener('popstate', function () {
    if (App._ignorePop) { App._ignorePop = false; return; }
    var t = root.UI.topOverlay(); if (t) { root.UI.closeOverlay(t); return; }
    if (App.ui.stack.length) App.back(true);
  });
  App.setTab = function (t) { App.ui.tab = t; App.ui.stack = []; App.render(); document.getElementById('view').scrollTop = 0; };
  // Fit the desktop phone frame into short windows (e.g. 1280x800) instead of cutting it off.
  function fitFrame() { var ph = document.getElementById('phone'); if (!ph) return; if (window.innerWidth <= 500) { ph.style.zoom = ''; return; } var z = Math.min(1, (window.innerHeight - 16) / 892); ph.style.zoom = z < 1 ? z.toFixed(3) : ''; }
  window.addEventListener('resize', fitFrame);
  App.fitFrame = fitFrame;

  Object.assign(App.acts, {
    tab: function (el) { root.UI.closeAll(); if (root.TodayUI) root.TodayUI.ui.early = null; App.setTab(el.getAttribute('data-t')); root.UI.sfx('tap'); },
    back: function () { App.back(); },
    go: function (el) { root.UI.closeAll(); var p = {}; if (el.getAttribute('data-id')) p.id = el.getAttribute('data-id'); App.go(el.getAttribute('data-to'), p); },
    'sheet-close': function () { root.UI.closeOverlay(); }
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    var h = App.acts[el.getAttribute('data-act')];
    if (h) { e.preventDefault(); try { h(el, e); } catch (err) { console.error(err); } }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var t = root.UI.topOverlay(); if (t) root.UI.closeOverlay(t); }
  });

  /* "Demo time · Back to live": shown while the demo save is active. Tapping it discards nothing live. */
  App.demoChip = function () {
    var St = root.Store, el = document.getElementById('demoLive'), on = St.S.clockMode === 'demo' && !St.pinned();
    if (!el) { el = document.createElement('button'); el.id = 'demoLive'; el.type = 'button'; el.setAttribute('data-act', 'back-to-live'); el.textContent = 'Demo time · Back to live'; el.setAttribute('aria-label', 'Demo time is on. Back to live'); document.body.appendChild(el); }
    el.hidden = !on;
  };
  // Live mode: catch up on open, on focus / visibility change and once a minute. Re-render only when something moved.
  App.sync = function (force) {
    var St = root.Store; if (!St.isLive()) return false;
    var r = St.liveSync();
    if ((r.changed || force) && !document.querySelector('.run-screen, .game-screen')) {
      if (r.rolled) { root.UI.closeAll(); App.ui.stack = []; App.ui.tab = 'today'; }
      App.render();
    }
    return r.changed;
  };
  App.boot = function () {
    var St = root.Store;
    St.load();
    if (St.S.onboarded) root.Onboarding.state().active = false;
    if (St.S.onboarded) St.liveSync();
    fitFrame();
    App.render();
    document.getElementById('demoChevron').addEventListener('click', function () { root.Demo.open(); });
    if (!App._ticking) {
      App._ticking = setInterval(function () { App.sync(false); }, 60000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) App.sync(false); });
      window.addEventListener('focus', function () { App.sync(false); });
    }
  };
  App.acts['back-to-live'] = function () {
    var St = root.Store; root.UI.closeAll(); if (root.Extra) root.Extra.closeRun();
    var r = St.backToLive();
    root.Onboarding.reset(); if (St.S.onboarded) root.Onboarding.state().active = false;
    App.ui.stack = []; App.ui.tab = 'today'; App.render();
    root.UI.toast(r.fresh ? 'Live mode. Set up your real list to start.' : 'Back to live. It’s ' + E().fmtDate(St.S.day) + ', ' + E().fmtTime(St.S.clock) + '.');
  };
  function E() { return root.Engine; }
})(window);
