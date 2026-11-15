/* Kindling v5 — ui.js : DOM helpers, overlays, particles, sound, haptics. */
(function (root) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function screenEl() { return document.getElementById('screen'); }
  function overlayRoot() { return document.getElementById('overlay-root'); }
  function settings() { return root.Store.S.settings; }
  function osReduce() { try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function calm() { var s = settings(); return s.calm || s.reducedMotion || osReduce(); }

  /* ---------- sound (synthesized, no files) ---------- */
  var ctx = null;
  function ac() { if (!ctx) { try { ctx = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { ctx = null; } } return ctx; }
  function tone(freq, start, dur, type, vol) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  var SFX = {
    tap: function () { tone(660, 0, .08, 'triangle', .06); },
    out: function () { tone(520, 0, .12, 'triangle', .08); tone(780, .08, .14, 'triangle', .07); },
    fragment: function () { tone(784, 0, .16, 'triangle'); tone(1046, .09, .22, 'triangle'); tone(1318, .18, .3, 'sine', .08); },
    full: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, i * .08, .35, 'triangle', .1); }); },
    chest: function () { tone(196, 0, .25, 'square', .05); tone(392, .2, .2, 'triangle', .08); [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, .35 + i * .07, .3, 'triangle', .09); }); },
    reveal: function () { tone(880, 0, .12, 'triangle', .07); tone(1320, .06, .18, 'sine', .06); },
    rare: function () { [660, 880, 1100, 1320, 1760].forEach(function (f, i) { tone(f, i * .06, .4, 'sine', .08); }); },
    soft: function () { tone(440, 0, .15, 'sine', .05); },
    pu: function () { [440, 554, 659, 880].forEach(function (f, i) { tone(f, i * .07, .3, 'square', .045); }); }
  };
  function sfx(name) { var s = settings(); if (!s.sound || s.calm) return; try { SFX[name] && SFX[name](); } catch (e) { } }
  function haptic(p) { var s = settings(); if (!s.haptics) return; try { if (navigator.vibrate) navigator.vibrate(p || 10); } catch (e) { } }

  /* ---------- live region ---------- */
  function announce(text) { var el = document.getElementById('live'); if (!el) return; el.textContent = ''; setTimeout(function () { el.textContent = text; }, 30); }

  /* ---------- overlays ---------- */
  var stack = [];
  function openOverlay(html, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'ov ' + (opts.cls || '');
    wrap.style.position = 'absolute'; wrap.style.inset = '0';
    wrap.innerHTML = html;
    overlayRoot().appendChild(wrap);
    var rec = { el: wrap, onClose: opts.onClose };
    stack.push(rec);
    var f = wrap.querySelector('[data-autofocus]') || wrap.querySelector('button');
    if (f && !opts.noFocus) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { } }, 60);
    return function close() { closeOverlay(rec); };
  }
  function closeOverlay(rec) {
    rec = rec || stack[stack.length - 1]; if (!rec) return;
    var i = stack.indexOf(rec); if (i >= 0) stack.splice(i, 1);
    if (rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
    if (rec.onClose) rec.onClose();
    if (!stack.length) setTimeout(flushToasts, 120);
  }
  function closeAll() { while (stack.length) closeOverlay(stack[stack.length - 1]); }
  function topOverlay() { return stack[stack.length - 1]; }
  function sheet(title, body, opts) {
    opts = opts || {};
    return openOverlay('<div class="scrim" data-act="sheet-close"></div><div class="sheet ' + (opts.clin ? 'clin-sheet' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div>' +
      (opts.noClose ? '' : '<button class="sh-close" data-act="sheet-close" aria-label="Close">' + root.Art.icon('close') + '</button>') +
      '<h2>' + esc(title) + '</h2>' + (opts.sub ? '<p class="sh-sub">' + opts.sub + '</p>' : '') + '<div class="sh-body">' + body + '</div></div>', opts);
  }
  function full(html, opts) { return openOverlay('<div class="full ' + ((opts && opts.bg) || 'dark') + '" role="dialog" aria-modal="true">' + html + '</div>', opts); }

  /* ---------- toast ---------- */
  /* Toasts: small, top-anchored under the top bar, never over sheets or buttons.
   * While a sheet or full-screen moment is open they wait, then show once it closes. */
  var toastTimer = null, pending = [];
  function toast(msg, opts) {
    opts = opts || {};
    if (stack.length && !opts.force) { pending = [{ msg: msg, opts: opts }]; announce(String(msg).replace(/<[^>]+>/g, '')); return; }
    show(msg, opts);
  }
  function flushToasts() { if (stack.length || !pending.length) return; var p = pending.shift(); pending = []; show(p.msg, p.opts); }
  /* Inline banner directly under the top bar. It pushes content down (never overlays it), then collapses. */
  var current = null;
  function placeBanner(animate) {
    var old = document.querySelectorAll('#view .toast'); for (var i = 0; i < old.length; i++) old[i].remove();
    if (!current) return;
    var view = document.getElementById('view'); if (!view) return;
    var t = document.createElement('div'); t.className = 'toast banner' + (animate && !calm() ? ' enter' : ''); t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + current.msg + '</span>' + (current.opts.undo ? '<button data-act="' + current.opts.undo + '">Undo</button>' : '');
    var anchor = view.querySelector('.topbar, .nav-h, .page-h');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(t, anchor.nextSibling); else view.insertBefore(t, view.firstChild);
  }
  function show(msg, opts) {
    current = { msg: msg, opts: opts };
    placeBanner(true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      var t = document.querySelector('#view .toast');
      current = null;
      if (!t) return;
      if (calm()) { t.remove(); return; }
      t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.remove(); }, 320);
    }, opts.ms || 2500);
    announce(String(msg).replace(/<[^>]+>/g, ''));
  }

  /* ---------- particles ---------- */
  function fxLayer() { var l = screenEl().querySelector('.fx-layer'); if (!l) { l = document.createElement('div'); l.className = 'fx-layer'; l.setAttribute('aria-hidden', 'true'); screenEl().appendChild(l); } return l; }
  function relPos(el) {
    var s = screenEl().getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2, w: r.width, h: r.height };
  }
  var PALETTES = { expedition: ['#ffd65e', '#ff7a3d', '#20b2a0', '#ffffff', '#ff5d8f', '#8b4dff'], grove: ['#f4b6b0', '#9cc28c', '#fff4c9', '#ffffff', '#c9b8e8'] };
  function burst(x, y, opts) {
    opts = opts || {};
    if (calm()) return;
    var layer = fxLayer(), n = opts.n || 26, pal = opts.colors || PALETTES[root.Store.S.theme] || PALETTES.expedition;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i'); p.className = 'particle';
      var a = Math.random() * Math.PI * 2, d = (opts.spread || 120) * (0.4 + Math.random() * 0.8);
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.background = pal[i % pal.length];
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', (Math.sin(a) * d + (opts.gravity ? 40 : 0)) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg'); p.style.setProperty('--dur', (0.7 + Math.random() * 0.6) + 's');
      if (Math.random() < 0.35) p.style.borderRadius = '50%';
      var s = 6 + Math.random() * 8; p.style.width = s + 'px'; p.style.height = s + 'px';
      layer.appendChild(p);
      (function (pp) { setTimeout(function () { pp.remove(); }, 1500); })(p);
    }
    if (opts.wave) { var w = document.createElement('i'); w.className = 'ring-wave'; w.style.left = x + 'px'; w.style.top = y + 'px'; if (opts.waveColor) w.style.borderColor = opts.waveColor; layer.appendChild(w); setTimeout(function () { w.remove(); }, 900); }
  }
  function burstAt(el, opts) { if (!el) return; var p = relPos(el); burst(p.x, p.y, opts); }
  function pop(text, x, y, delay) {
    var layer = fxLayer();
    setTimeout(function () {
      var p = document.createElement('div'); p.className = 'pop'; p.textContent = text; p.style.left = x + 'px'; p.style.top = y + 'px';
      layer.appendChild(p); setTimeout(function () { p.remove(); }, 1600);
    }, delay || 0);
  }
  // reward chips: one column, stacked, staggered so they never overlap
  function popAt(el, texts) { if (!el) return; var p = relPos(el); texts.forEach(function (t, i) { pop(t, p.x, p.y - 20 + i * 40, i * 260); }); }
  function fly(fromEl, toEl, html, done) {
    if (!fromEl || !toEl || calm()) { done && done(); return; }
    var a = relPos(fromEl), b = relPos(toEl), f = document.createElement('div');
    f.className = 'fly-frag'; f.innerHTML = html; f.style.left = (a.x - 23) + 'px'; f.style.top = (a.y - 23) + 'px';
    fxLayer().appendChild(f);
    requestAnimationFrame(function () { requestAnimationFrame(function () { f.style.transform = 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px) scale(.8)'; }); });
    setTimeout(function () { f.style.opacity = '0'; setTimeout(function () { f.remove(); }, 200); done && done(); }, 560);
  }
  function levelBanner(level) {
    var b = document.createElement('div'); b.className = 'lvl-banner'; b.textContent = 'Level ' + level + '!';
    if (stack.length) { setTimeout(function () { levelBanner(level); }, 600); return; }
    screenEl().appendChild(b); setTimeout(function () { b.remove(); }, 2500); sfx('full'); announce('Level ' + level);
  }
  function fmtNum(n) { return Math.round(n).toLocaleString('en-US'); }

  root.UI = { placeBanner: placeBanner, esc: esc, $: $, $$: $$, sfx: sfx, haptic: haptic, announce: announce, openOverlay: openOverlay, closeOverlay: closeOverlay, closeAll: closeAll, topOverlay: topOverlay, sheet: sheet, full: full, toast: toast, burst: burst, burstAt: burstAt, pop: pop, popAt: popAt, fly: fly, relPos: relPos, levelBanner: levelBanner, calm: calm, fmtNum: fmtNum };
})(window);
