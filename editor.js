/* Kindling v5.5 — editor.js : the shared wheel pickers and the ONE ItemEditor.
 * The ItemEditor is used in onboarding, "+ Add" and "Edit", for medicines, vitamins and habits. Same controls, same
 * words, same order everywhere; only the outer chrome differs. Screens: 1 What is it? · 2 When? · 3 Review.
 * Edit opens on Review. No pill-appearance step (refills change the look). Every number and time uses a wheel. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, esc = U.esc;
  function S() { return St.S; }

  /* =========================================================================================
   * Wheel: one component for numbers and one for times (a time is just three columns).
   * Scroll-snap + momentum on touch, mouse wheel, tap a row, up/down buttons, and the keyboard
   * (role="spinbutton": Up/Down ±1, PgUp/PgDn ±10, Home/End). Reduced motion snaps instantly.
   * ========================================================================================= */
  var W = {}, wseq = 0;
  function colHtml(id, c, col) {
    var rows = col.labels.map(function (l, i) { return '<div class="wh-row' + (i === col.index ? ' on' : '') + '" data-w="' + id + '" data-c="' + c + '" data-i="' + i + '">' + esc(l) + '</div>'; }).join('');
    return '<div class="wh-col" role="spinbutton" tabindex="0" data-w="' + id + '" data-c="' + c + '" aria-label="' + esc(col.label || '') + '" aria-valuemin="0" aria-valuemax="' + (col.labels.length - 1) + '" aria-valuenow="' + col.index + '" aria-valuetext="' + esc(col.spoken ? col.spoken(col.index) : col.labels[col.index]) + '">' +
      '<button class="wh-btn" type="button" data-act="wh-step" data-w="' + id + '" data-c="' + c + '" data-d="-1" aria-label="' + esc((col.label || 'Value') + ': previous') + '" tabindex="-1">▲</button>' +
      '<div class="wh-view" data-w="' + id + '" data-c="' + c + '"><div class="wh-pad"></div>' + rows + '<div class="wh-pad"></div></div>' +
      '<button class="wh-btn" type="button" data-act="wh-step" data-w="' + id + '" data-c="' + c + '" data-d="1" aria-label="' + esc((col.label || 'Value') + ': next') + '" tabindex="-1">▼</button>' +
      (col.unit ? '<div class="wh-unit" aria-hidden="true">' + esc(col.unit) + '</div>' : '') + '</div>';
  }
  function wheelHtml(cols, opts) {
    var id = 'w' + (++wseq);
    W[id] = { cols: cols, onChange: opts && opts.onChange };
    return '<div class="wheel" role="group" aria-label="' + esc((opts && opts.label) || '') + '" data-w="' + id + '">' + cols.map(function (col, c) { return colHtml(id, c, col); }).join('') + '<div class="wh-band" aria-hidden="true"></div></div>';
  }
  function rowH(view) { var r = view.querySelector('.wh-row'); return r ? r.offsetHeight || 44 : 44; }
  function place(id, c, smooth) {
    var view = document.querySelector('.wh-view[data-w="' + id + '"][data-c="' + c + '"]'); if (!view) return;
    var idx = W[id].cols[c].index, h = rowH(view);
    view._lock = true;
    try { view.scrollTo({ top: idx * h, behavior: smooth && !U.calm() ? 'smooth' : 'auto' }); } catch (e) { view.scrollTop = idx * h; }
    setTimeout(function () { view._lock = false; }, smooth && !U.calm() ? 260 : 30);
  }
  function setIdx(id, c, idx, smooth, fromScroll) {
    var w = W[id]; if (!w) return;
    var col = w.cols[c]; idx = Math.max(0, Math.min(col.labels.length - 1, idx));
    var changed = idx !== col.index; col.index = idx;
    var el = document.querySelector('.wh-col[data-w="' + id + '"][data-c="' + c + '"]');
    if (el) {
      el.setAttribute('aria-valuenow', idx); el.setAttribute('aria-valuetext', col.spoken ? col.spoken(idx) : col.labels[idx]);
      U.$$('.wh-row', el).forEach(function (r) { r.classList.toggle('on', +r.getAttribute('data-i') === idx); });
    }
    if (!fromScroll) place(id, c, smooth);
    if (changed) { U.haptic(4); if (w.onChange) w.onChange(values(id)); }
  }
  function values(id) { var w = W[id]; return w ? w.cols.map(function (c) { return c.values[c.index]; }) : []; }
  function initWheels(scope) {
    U.$$('.wheel', scope || document).forEach(function (wh) { var id = wh.getAttribute('data-w'); if (!W[id]) return; W[id].cols.forEach(function (_, c) { place(id, c, false); }); });
  }
  // scroll end -> snap to the nearest row
  document.addEventListener('scroll', function (e) {
    var v = e.target; if (!v || !v.classList || !v.classList.contains('wh-view') || v._lock) return;
    clearTimeout(v._t);
    v._t = setTimeout(function () { var id = v.getAttribute('data-w'), c = +v.getAttribute('data-c'); if (!W[id]) return; setIdx(id, c, Math.round(v.scrollTop / rowH(v)), false, true); }, 90);
  }, true);
  document.addEventListener('keydown', function (e) {
    var col = e.target && e.target.closest && e.target.closest('.wh-col'); if (!col) return;
    var id = col.getAttribute('data-w'), c = +col.getAttribute('data-c'), w = W[id]; if (!w) return;
    var i = w.cols[c].index, n = w.cols[c].labels.length, k = e.key, to = null;
    if (k === 'ArrowUp') to = i - 1; else if (k === 'ArrowDown') to = i + 1; else if (k === 'PageUp') to = i - 10; else if (k === 'PageDown') to = i + 10; else if (k === 'Home') to = 0; else if (k === 'End') to = n - 1;
    else if (/^[0-9]$/.test(k)) { var pre = (col._typed || '') + k; col._typed = pre; clearTimeout(col._tt); col._tt = setTimeout(function () { col._typed = ''; }, 900); var hit = w.cols[c].labels.map(String).findIndex(function (l) { return l.replace(/^0/, '').indexOf(pre) === 0 || l.indexOf(pre) === 0; }); if (hit >= 0) to = hit; }
    if (to != null) { e.preventDefault(); setIdx(id, c, to, true); }
  });
  document.addEventListener('click', function (e) { var r = e.target.closest && e.target.closest('.wh-row'); if (r) setIdx(r.getAttribute('data-w'), +r.getAttribute('data-c'), +r.getAttribute('data-i'), true); });
  root.App.acts['wh-step'] = function (el) { var id = el.getAttribute('data-w'), c = +el.getAttribute('data-c'); if (W[id]) setIdx(id, c, W[id].cols[c].index + (+el.getAttribute('data-d')), true); };

  /* ----- column builders ----- */
  function range(a, b, step) { var out = []; for (var i = a; i <= b; i += (step || 1)) out.push(i); return out; }
  function numCol(min, max, value, label, unit, fmt) {
    var vals = range(min, max), idx = Math.max(0, vals.indexOf(value));
    return { values: vals, labels: vals.map(function (v) { return fmt ? fmt(v) : String(v); }), index: idx, label: label, unit: unit, spoken: function (i) { return (fmt ? fmt(vals[i]) : vals[i]) + (unit ? ' ' + unit : ''); } };
  }
  function listCol(vals, labels, value, label) { var idx = Math.max(0, vals.indexOf(value)); return { values: vals, labels: labels, index: idx, label: label }; }
  function timeCols(hhmm) {
    var m = E.toMins(hhmm || '08:00'), h = Math.floor(m / 60), mi = Math.round((m % 60) / 5) * 5; if (mi === 60) { mi = 55; }
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return [
      { values: range(1, 12), labels: range(1, 12).map(String), index: h12 - 1, label: 'Hour', spoken: function (i) { return (i + 1) + ' o’clock'; } },
      { values: range(0, 55, 5), labels: range(0, 55, 5).map(function (x) { return ('0' + x).slice(-2); }), index: mi / 5, label: 'Minutes', spoken: function (i) { return (i * 5) + ' minutes'; } },
      { values: ['AM', 'PM'], labels: ['AM', 'PM'], index: h >= 12 ? 1 : 0, label: 'AM or PM' }
    ];
  }
  function timeFrom(vals) { var h = vals[0] % 12 + (vals[2] === 'PM' ? 12 : 0); return E.hhmm(h * 60 + vals[1]); }
  function dateCol(from, to, value, label) {
    var vals = range(from, to), today = (S().today ? S().day : (St.isLive() ? St.liveNow().day : 1));
    return { values: vals, labels: vals.map(function (d) { return d === today ? 'Today' : d === today + 1 ? 'Tomorrow' : d === today - 1 ? 'Yesterday' : E.fmtDate(d); }), index: Math.max(0, vals.indexOf(value)), label: label, spoken: function (i) { return E.fmtDateLong(vals[i]); } };
  }
  /* Wheel.sheet: title, the wheel, an optional live preview line and one Done button. Tapping outside also commits. */
  var cur = null;
  function wheelSheet(o) {
    var html = wheelHtml(o.cols, { label: o.title, onChange: function (vals) { var p = document.getElementById('whPreview'); if (p && o.preview) p.innerHTML = o.preview(vals); } });
    var id = 'w' + wseq;
    cur = o; cur.id = id; cur.done = false;
    U.sheet(o.title, (o.intro ? '<p class="ie-hint">' + o.intro + '</p>' : '') + html +
      (o.preview ? '<p class="wh-preview" id="whPreview" aria-live="polite">' + o.preview(values(id)) + '</p>' : '') + (o.extra || '') +
      '<button class="btn btn-clin btn-block" data-act="wh-done" data-autofocus>Done</button>', { clin: true, noFocus: true, onClose: function () { commit(); } });
    setTimeout(function () { initWheels(); var f = document.querySelector('.wh-col[data-w="' + id + '"]'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } }, 30);
  }
  function commit() { if (!cur || cur.done) return; cur.done = true; var o = cur; cur = null; if (o.onDone) o.onDone(values(o.id)); }
  root.App.acts['wh-done'] = function () { U.closeOverlay(); };
  // test / automation hook: set a column of the open wheel by value
  function setOpen(c, value) { if (!cur) return false; var col = W[cur.id].cols[c]; var i = col.values.indexOf(value); if (i < 0) return false; setIdx(cur.id, c, i, false); return true; }

  root.Wheel = { html: wheelHtml, init: initWheels, sheet: wheelSheet, values: values, setOpen: setOpen, numCol: numCol, listCol: listCol, timeCols: timeCols, timeFrom: timeFrom, dateCol: dateCol, commit: commit };

  /* =========================================================================================
   * ItemEditor
   * ========================================================================================= */
  var TYPES = [
    ['med', 'Medicine', 'Prescription or from the store'],
    ['vitamin', 'Vitamin or supplement', 'Vitamin D, fish oil, probiotic'],
    ['habit', 'Habit', 'Drink water, stretch, walk']
  ];
  var FREQS = [
    ['daily', 'Every day', ''],
    ['weekdays', 'Some days of the week', 'Like Mon, Wed and Fri'],
    ['everyNDays', 'Every few days', 'Like every 2 or 3 days'],
    ['weekly', 'Weekly or every few weeks', 'Like every Sunday, or every 2 weeks'],
    ['monthly', 'Once a month', 'Like the 1st, or the 2nd Tuesday'],
    ['cycle', 'On and off', 'Like 21 days on, 7 days off'],
    ['asNeeded', 'Only when I need it', 'No set time. Log it when you use it']
  ];
  var HABIT_IDEAS = ['Drink water', 'Stretch', 'Walk', 'Read', 'Floss', 'Journal'];
  var ed = null;

  function nearestBlock() {
    var s = S(), times = [];
    (s.meds || []).forEach(function (m) { if (!E.isAsNeeded(m) && !E.isEnded(m, s.day)) E.expandTimes(E.schedOf(m).times).forEach(function (t) { if (times.indexOf(t) < 0) times.push(t); }); });
    var now = clock();
    if (times.length) { var best = times[0]; times.forEach(function (t) { if (Math.abs(E.gameMins(t) - now) < Math.abs(E.gameMins(best) - now)) best = t; }); return best; }
    var m = now % 1440; return m >= 180 && m < 660 ? '08:00' : m >= 660 && m < 900 ? '12:00' : m >= 900 && m < 1200 ? '18:00' : '21:30';
  }
  /* "How many" (v5.5 round 2): amount | form wheel. Shown on the When screen next to each time, and on Review. */
  var QTY = ['½', '1', '1½', '2', '2½', '3', '4', '5', '6', '8', '10'], FORMS = ['pill', 'capsule', 'gummy', 'mL', 'drop', 'puff', 'spray', 'injection', 'patch'];
  var PLURAL = { pill: 'pills', capsule: 'capsules', gummy: 'gummies', mL: 'mL', drop: 'drops', puff: 'puffs', spray: 'sprays', injection: 'injections', patch: 'patches' };
  function defAmount(type) { return type === 'habit' ? '' : type === 'vitamin' ? '1 capsule' : '1 pill'; }
  function amountStr(q, f) { return q + ' ' + (q === '1' || q === '½' ? f : PLURAL[f]); }
  function parseAmount(a) { var m = /^(\S+)\s+(.+)$/.exec(a || '') || []; var f = FORMS.filter(function (x) { return x === m[2] || PLURAL[x] === m[2]; })[0] || 'pill'; return { q: QTY.indexOf(m[1]) >= 0 ? m[1] : '1', f: f }; }
  function amountsOf(it) { var list = E.expandTimes(it.schedule.times); return list.map(function (t) { return E.amountFor(it, t) || defAmount(it.type); }); }
  function setAmounts(it, arr) {
    var list = E.expandTimes(it.schedule.times), s = it.schedule;
    if (arr.every(function (a) { return a === arr[0]; })) { it.amount = arr[0]; delete s.amounts; return; }
    it.amount = arr[0]; s.amounts = {}; list.forEach(function (t, i) { s.amounts[t] = arr[i]; });
  }
  function amountSummary(it) {
    var list = E.expandTimes(it.schedule.times), a = amountsOf(it);
    if (a.every(function (x) { return x === a[0]; })) return a[0] + ' each time';
    return list.map(function (t, i) { return a[i] + ' at ' + E.fmtTime(E.toMins(t)); }).join(', ');
  }
  function blankItem(type) {
    return { id: null, type: type || 'med', name: '', strength: '', amount: defAmount(type || 'med'), reminders: true, twoStep: type === 'habit' ? false : !!S().settings.twoStep, supply: (type || 'med') === 'med' ? 30 : null, highRisk: false,
      schedule: { pattern: { kind: 'daily' }, times: { mode: 'list', list: [nearestBlock()] }, start: null, end: null, doseSteps: null } };
  }
  function open(mode, opts) {
    opts = opts || {};
    var item = opts.id ? JSON.parse(JSON.stringify(St.medById(opts.id))) : (opts.item ? JSON.parse(JSON.stringify(opts.item)) : blankItem(opts.type || 'med'));
    if (item && !item.schedule) item.schedule = E.schedOf(item);
    if (item && !item.type) item.type = 'med';
    if (item && item.reminders == null) item.reminders = true;
    if (item && item.amount == null && item.type !== 'habit') item.amount = defAmount(item.type);
    if (opts.id && item.supply != null) item.supply = St.supplyLeft(St.medById(opts.id)); // edit shows the countdown, not the saved start value
    if (mode === 'onboarding' && !item.name) item.name = suggestName(item.type);
    ed = { mode: mode, step: mode === 'edit' ? (opts.step || 3) : 1, item: item, only: opts.only || null, from: opts.from || null };
    if (mode !== 'onboarding') root.App.go('itemEditor', { mode: mode, id: opts.id || null, t: Date.now() });
    return ed;
  }
  function draft() { return ed && ed.item; }
  function sch() { return ed.item.schedule; }
  // During Live onboarding there's no game day yet: use the real date and clock.
  function today() { return S().today ? S().day : (St.isLive() ? St.liveNow().day : 1); }
  function clock() { return S().today ? S().clock : (St.isLive() ? St.liveNow().clock : 480); }
  function typeWord(t) { return t === 'habit' ? 'habit' : t === 'vitamin' ? 'vitamin' : 'medicine'; }
  // Onboarding shows the default name in the field (visible, editable) instead of inventing one silently.
  function suggestName(type) { return type === 'habit' ? 'Drink water' : type === 'vitamin' ? 'Vitamin D' : 'My morning medicine'; }
  function answeredToday(id) { var t = S().today; return !!t && t.plan.stacks.some(function (st) { return (t.entries[st.id] || t.paid[st.id]) && st.doses.some(function (d) { return d.medId === id; }); }); }
  function startsLine() {
    var it = ed.item, s = it.schedule;
    if (E.isAsNeeded(it)) return '';
    if (ed.mode === 'onboarding') return 'Starts today';
    if (ed.mode === 'edit' && it.id && St.medById(it.id)) return answeredToday(it.id) ? 'You’ve already checked in for this today, so changes start tomorrow' : 'Changes start with your next dose. Past days stay as they were';
    if (s.start != null && s.start > today()) return s.start === today() + 1 ? 'Starts tomorrow' : 'Starts ' + E.fmtDate(s.start);
    return St.itemStartsToday(it) ? 'Starts today' : 'Starts tomorrow';
  }
  function previewItem(src) {
    var it = JSON.parse(JSON.stringify(src || ed.item)), s = it.schedule;
    if (ed.mode === 'onboarding') { s.start = today(); delete it.startMins; return it; }
    if (!(ed.mode === 'edit' && St.medById(it.id))) {
      if (s.start == null || s.start <= today()) { if (St.itemStartsToday(it)) { s.start = today(); it.startMins = clock(); } else if (s.start == null || s.start < today() + 1) s.start = today() + 1; }
    }
    return it;
  }
  function nextLine(src) {
    var it = previewItem(src);
    if (E.isAsNeeded(it)) return 'Shows under “As needed” on Today. Log it when you use it.';
    // Onboarding: the first item starts today, so a slot that already passed is still today's (log it on Today).
    var n = E.nextOccurrences(it, today(), ed && ed.mode === 'onboarding' ? -1 : clock(), 4);
    if (!n.length) return 'Nothing coming up with these settings.';
    if (ed && ed.mode === 'onboarding' && n[0].day === today() && n[0].mins <= clock()) n[0].label += ' (log it on Today)';
    var line = (n[0].day > today() && ed.mode !== 'edit' ? 'First one: ' : 'Next: ') + n.map(function (x) { return x.label; }).join(' · ');
    if (it.schedule.end != null) line += ' · Last one: ' + E.fmtDate(it.schedule.end);
    return line;
  }
  function token(f, text, extra) { return '<button type="button" class="tok' + (extra || '') + '" data-act="ie-tok" data-f="' + f + '">' + esc(text) + ' <span class="tok-v" aria-hidden="true">▾</span></button>'; }
  function freqName(p) { var f = FREQS.filter(function (x) { return x[0] === p.kind; })[0]; return f ? f[1] : 'Every day'; }

  /* ----- screen 1: what is it? ----- */
  function step1() {
    var it = ed.item, t = it.type;
    return '<div class="ie" data-step="1"><h1 class="ie-h">What is it?</h1>' +
      '<div class="ie-types" role="radiogroup" aria-label="Type">' + TYPES.map(function (x) {
        return '<button type="button" class="ie-type' + (t === x[0] ? ' on' : '') + '" role="radio" aria-checked="' + (t === x[0]) + '" data-act="ie-type" data-v="' + x[0] + '"><span class="ie-ti">' + A.itemIcon({ type: x[0] }) + '</span><span><span class="ie-tt">' + x[1] + '</span><span class="ie-ts">' + x[2] + '</span></span></button>';
      }).join('') + '</div>' +
      '<div class="field"><label for="ieName">' + (t === 'habit' ? 'What’s the habit?' : 'What do you call it?') + '</label><input class="input" id="ieName" autocomplete="off" value="' + esc(it.name) + '" placeholder="' + (t === 'habit' ? 'Like “Drink a glass of water”' : t === 'vitamin' ? 'Like “Vitamin D”' : 'Like “Lisinopril” or “blue pill”') + '"><div class="hint">A nickname is fine. It stays on your phone.</div></div>' +
      (t === 'habit' ? '<div class="chips ie-ideas">' + HABIT_IDEAS.map(function (h) { return '<button type="button" class="chip-btn" data-act="ie-idea" data-v="' + esc(h) + '">' + esc(h) + '</button>'; }).join('') + '</div>' : '') +
      (t === 'med' ? '<div class="field"><label for="ieStr">Strength (optional)</label><input class="input" id="ieStr" autocomplete="off" value="' + esc(it.strength || '') + '" placeholder="Like 10 mg"></div>' : '') +
      '</div>';
  }
  /* ----- screen 2: when? (a sentence builder with a live preview) ----- */
  function step2() {
    var it = ed.item, s = it.schedule, p = s.pattern, an = p.kind === 'asNeeded';
    var lines = '<div class="ie-line">' + token('freq', freqName(p)) + '</div>';
    if (p.kind === 'weekdays' || p.kind === 'weekly') {
      if (p.kind === 'weekly') lines += '<div class="ie-line">every ' + token('everyWeeks', (p.everyWeeks || 1) === 1 ? 'week' : p.everyWeeks + ' weeks') + ' on</div>';
      lines += '<div class="ie-days" role="group" aria-label="Days of the week">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (d, i) { var on = (p.days || []).indexOf(i) >= 0; return '<button type="button" class="ie-day' + (on ? ' on' : '') + '" aria-pressed="' + on + '" aria-label="' + E.WD_LONG[i] + '" data-act="ie-day" data-v="' + i + '">' + d + '</button>'; }).join('') + '</div>';
    }
    if (p.kind === 'everyNDays') lines += '<div class="ie-line">every ' + token('n', p.n + ' days') + '</div>';
    if (p.kind === 'monthly') {
      lines += '<div class="ie-seg2"><button type="button" class="' + (p.by !== 'nth' ? 'on' : '') + '" data-act="ie-mby" data-v="date">By date</button><button type="button" class="' + (p.by === 'nth' ? 'on' : '') + '" data-act="ie-mby" data-v="nth">By weekday</button></div>';
      lines += p.by === 'nth' ? '<div class="ie-line">on the ' + token('nth', { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', '-1': 'last' }[p.nth]) + token('weekday', E.WD_LONG[p.weekday]) + '</div>' : '<div class="ie-line">on the ' + token('date', E.ord(p.date)) + '</div>';
      if (p.by !== 'nth' && p.date >= 29) lines += '<p class="ie-hint">On shorter months: the last day.</p>';
    }
    if (p.kind === 'cycle') lines += '<div class="ie-line">' + token('on', p.on + ' days on') + ', then ' + token('off', p.off + ' days off') + '</div><div class="ie-line">Day 1 is ' + token('day1', p.day1 === today() ? 'today' : E.fmtDate(p.day1)) + '</div>';
    if (!an) {
      if (s.times.mode === 'everyHours') {
        lines += '<div class="ie-line">every ' + token('hours', s.times.hours + ' hours') + ' from ' + token('first', E.fmtTime(E.toMins(s.times.first))) + ' until ' + token('last', E.fmtTime(E.toMins(s.times.last || '22:00'))) + '</div>' +
          '<div class="ie-chiprow" aria-label="Times">' + E.expandTimes(s.times).map(function (t) { return '<span class="ie-tchip">' + E.fmtTime(E.toMins(t)) + '</span>'; }).join('') + '</div>' +
          '<button type="button" class="ie-link" data-act="ie-tmode" data-v="list">Set the times instead</button>';
      } else {
        var list = E.expandTimes(s.times);
        var amts = it.type === 'habit' ? null : amountsOf(it);
        lines += '<div class="ie-line">at ' + list.map(function (t, i) { return token('time:' + i, E.fmtTime(E.toMins(t))) + (amts ? token('amt:' + i, amts[i], ' tok-amt') : ''); }).join('') + (list.length < 8 ? '<button type="button" class="tok tok-add" data-act="ie-addtime">+ time</button>' : '') + '</div>' +
          '<button type="button" class="ie-link" data-act="ie-tmode" data-v="everyHours">Every few hours instead</button>';
      }
    }
    return '<div class="ie" data-step="2"><h1 class="ie-h">When do you ' + (it.type === 'habit' ? 'do it' : 'take it') + '?</h1>' +
      '<div class="ie-live" aria-live="polite"><div class="ie-sentence" id="ieSentence">' + esc(E.scheduleSentence(previewItem())) + '</div>' +
      '<div class="ie-next" id="ieNext">' + esc(nextLine()) + '</div>' + (startsLine() ? '<div class="ie-starts">' + esc(startsLine()) + '</div>' : '') + '</div>' +
      '<div class="ie-builder">' + lines + '</div></div>';
  }
  /* ----- screen 3: review ----- */
  function rowBtn(k, label, value, act, extra) { return '<button type="button" class="ie-row" data-act="' + act + '"' + (extra || '') + '><span class="ie-rk">' + label + '</span><span class="ie-rv">' + esc(value) + '</span>' + A.icon('chev') + '</button>'; }
  function pastToday(it) { var t = E.timesOn(it, today()).map(E.gameMins).filter(function (m) { return m <= clock(); }); return t.length ? t[0] : 0; }
  function step3() {
    var it = ed.item, s = it.schedule, an = E.isAsNeeded(it), pv = previewItem(), n = E.nextOccurrences(pv, today(), clock(), 1)[0];
    var title = it.name + (it.strength ? ' ' + it.strength : '');
    var more = [];
    if (s.start != null && s.start > today() + 1) more.push('Starts ' + E.fmtDate(s.start));
    if (s.end != null) more.push('Until ' + E.fmtDate(s.end));
    if (s.doseSteps && s.doseSteps.length) more.push(s.doseSteps.length + ' dose step' + (s.doseSteps.length === 1 ? '' : 's'));
    if (it.highRisk) more.push('Extra care');
    var isEdit = ed.mode === 'edit' && it.id && St.medById(it.id), live = isEdit && St.medById(it.id);
    var summary = '<div class="ie-summary"><div class="ie-sum-h">' + A.itemIcon(it) + '<b>' + esc(title || 'Untitled') + '</b></div><div class="ie-sentence">' + esc(E.scheduleSentence(pv)) + '</div>' +
      '<div class="ie-next">' + esc(an ? 'Log it on Today when you use it.' : (startsLine() + (ed.mode === 'onboarding' && pastToday(pv) ? '. You can log today’s ' + E.fmtTime(pastToday(pv)) + ' dose on Today' : '') + (n && it.reminders !== false ? '. ' + (isEdit ? 'Next reminder: ' : it.type === 'habit' ? 'First nudge: ' : 'First reminder: ') + n.label.replace(/^Today/, 'today').replace(/^Tomorrow/, 'tomorrow') : '') + '.')) + '</div></div>';
    var rows = rowBtn('type', 'Type', TYPES.filter(function (x) { return x[0] === it.type; })[0][1], 'ie-goto', ' data-s="1"') +
      rowBtn('name', 'Name', title, 'ie-goto', ' data-s="1"') +
      rowBtn('when', 'When', E.scheduleSentence(pv), 'ie-goto', ' data-s="2"') +
      (an || it.type === 'habit' ? '' : rowBtn('amt', 'How many', amountSummary(it), 'ie-goto', ' data-s="2"')) +
      (an ? '' : rowBtn('rem', 'Reminders', (it.reminders !== false ? 'On' : 'Off') + (it.reminders !== false && !S().settings.reminders ? ' (all reminders are off in Me)' : '') + (it.type !== 'habit' && S().settings.twoStepAsked !== false && ed.mode !== 'onboarding' ? (it.twoStep ? ' · Two taps' : ' · One tap') : ''), 'ie-rem')) +
      (it.type === 'med' ? rowBtn('supply', 'Supply', it.supply == null ? 'Not tracked' : 'About ' + it.supply + ' days left', 'ie-tok', ' data-f="supply"') : '') +
      rowBtn('more', 'More options', more.join(' · ') || 'Start, end, dose changes', 'ie-more');
    return '<div class="ie" data-step="3"><h1 class="ie-h">' + (isEdit ? 'Edit' : 'Review') + '</h1>' + summary + '<div class="ie-rows">' + rows + '</div>' +
      (isEdit ? '<div class="ie-danger"><button type="button" class="btn btn-clin-2" data-act="pause-toggle" data-m="' + it.id + '">' + (live.paused ? 'Resume' : 'Pause it') + '</button><button type="button" class="btn btn-clin-2" data-act="ie-stop" data-m="' + it.id + '">Stop tracking</button></div>' : '') + '</div>';
  }
  function body() { return ed.step === 1 ? step1() : ed.step === 2 ? step2() : step3(); }
  function cta() { return ed.step < 3 ? 'Next' : 'Save'; }

  /* ----- clinical chrome (Add / Edit) ----- */
  function screen() {
    if (!ed) open('add');
    var isEdit = ed.mode === 'edit';
    var back = ed.step > 1 && !(isEdit && ed.step === 3) ? '<button class="back" data-act="ie-back">' + A.icon('back') + 'Back</button>' : '<button class="back" data-act="ie-cancel">' + A.icon('back') + (isEdit ? esc(ed.item.name || 'Back') : 'My list') + '</button>';
    var dots = isEdit ? '' : '<div class="stepper" aria-label="Step ' + ed.step + ' of 3">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= ed.step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    return '<div class="clin ie-wrap"><div class="nav-h">' + back + '<div class="title">' + (isEdit ? 'Edit' : 'Add') + '</div>' + (ed.step >= 2 ? '<button class="nav-save" data-act="ie-save">Save</button>' : '') + '</div>' + dots + body() +
      '<div class="ie-foot"><button class="btn btn-clin btn-block" data-act="' + (ed.step < 3 ? 'ie-next' : 'ie-save') + '">' + cta() + '</button></div></div>';
  }

  function readInputs() {
    if (!ed) return;
    var n = document.getElementById('ieName'), s = document.getElementById('ieStr');
    if (n) ed.item.name = n.value.trim(); if (s) ed.item.strength = s.value.trim();
  }
  function rerender() { if (ed.mode === 'onboarding') root.App.render(); else root.App.render(); setTimeout(function () { U.$$('.wheel').length && initWheels(); }, 20); }
  function refreshLive() { // update the sentence + preview without losing focus
    var a = document.getElementById('ieSentence'), b = document.getElementById('ieNext');
    if (a) a.textContent = E.scheduleSentence(previewItem()); if (b) b.textContent = nextLine();
  }
  function setPattern(kind) {
    var s = sch(), wd = E.weekday(today()), dt = E.dateOf(today()).getDate();
    var p = { kind: kind };
    if (ed.mode === 'edit' && s.pattern.kind !== kind) s.start = null; // counts from the day of the edit, not the old start
    if (kind === 'weekdays') p.days = [wd];
    if (kind === 'everyNDays') p.n = 2;
    if (kind === 'weekly') { p.everyWeeks = 1; p.days = [wd]; }
    if (kind === 'monthly') { p.by = 'date'; p.date = dt; p.nth = Math.min(4, Math.ceil(dt / 7)); p.weekday = wd; }
    if (kind === 'cycle') { p.on = 21; p.off = 7; p.day1 = today(); }
    s.pattern = p;
    if (kind === 'everyNDays' || kind === 'weekly' || kind === 'cycle') { if (s.start == null) s.start = null; }
  }
  function smartNextTime(list) {
    var mins = list.map(E.gameMins).sort(function (a, b) { return a - b; });
    if (mins.length === 1) return E.hhmm(Math.min(mins[0] + 720, 21 * 60 + 30));
    var best = 0, at = mins[0];
    for (var i = 0; i < mins.length - 1; i++) if (mins[i + 1] - mins[i] > best) { best = mins[i + 1] - mins[i]; at = mins[i] + Math.round(best / 2 / 5) * 5; }
    return E.hhmm(at);
  }
  function tokenSheet(f) {
    var it = ed.item, s = it.schedule, p = s.pattern;
    if (f === 'freq') {
      U.sheet('How often?', '<div class="opt-list">' + FREQS.map(function (x) { return '<button type="button" class="opt' + (p.kind === x[0] ? ' on' : '') + '" data-act="ie-freq" data-v="' + x[0] + '"><span><span class="o-t" style="display:block">' + x[1] + '</span>' + (x[2] ? '<span class="o-s">' + x[2] + '</span>' : '') + '</span></button>'; }).join('') + '</div>', { clin: true });
      return;
    }
    var o = null;
    // Setters resolve the item at call time, so the live preview can run them on a copy.
    function P(it) { return it.schedule.pattern; } function T(it) { return it.schedule.times; } function SC(it) { return it.schedule; }
    if (f === 'n') o = { title: 'Every how many days?', cols: [numCol(2, 60, p.n, 'Every', 'days')], set: function (v, x) { P(x).n = v[0]; } };
    if (f === 'everyWeeks') o = { title: 'Every how many weeks?', cols: [numCol(1, 12, p.everyWeeks || 1, 'Every', 'weeks')], set: function (v, x) { P(x).everyWeeks = v[0]; } };
    if (f === 'date') o = { title: 'Which day of the month?', cols: [numCol(1, 31, p.date, 'Day', '', E.ord)], set: function (v, x) { P(x).date = v[0]; } };
    if (f === 'nth') o = { title: 'Which one?', cols: [listCol([1, 2, 3, 4, -1], ['1st', '2nd', '3rd', '4th', 'Last'], p.nth, 'Which')], set: function (v, x) { P(x).nth = v[0]; } };
    if (f === 'weekday') o = { title: 'Which weekday?', cols: [listCol(range(0, 6), E.WD_LONG, p.weekday, 'Weekday')], set: function (v, x) { P(x).weekday = v[0]; } };
    if (f === 'on') o = { title: 'Days on', cols: [numCol(1, 90, p.on, 'Days on', 'days')], set: function (v, x) { P(x).on = v[0]; } };
    if (f === 'off') o = { title: 'Days off', cols: [numCol(1, 90, p.off, 'Days off', 'days')], set: function (v, x) { P(x).off = v[0]; } };
    if (f === 'day1') o = { title: 'Day 1 of the cycle', cols: [dateCol(today() - 90, today() + 60, p.day1, 'Day 1')], set: function (v, x) { P(x).day1 = v[0]; } };
    if (f === 'hours') o = { title: 'Every how many hours?', cols: [numCol(2, 12, s.times.hours, 'Every', 'hours')], set: function (v, x) { T(x).hours = v[0]; } };
    if (f === 'first') o = { title: 'First time', cols: timeCols(s.times.first), set: function (v, x) { T(x).first = timeFrom(v); } };
    if (f === 'last') o = { title: 'Last time', cols: timeCols(s.times.last || '22:00'), set: function (v, x) { T(x).last = timeFrom(v); } };
    if (/^time:/.test(f)) {
      var ti = +f.split(':')[1], tl = E.expandTimes(s.times);
      o = { title: 'What time?', cols: timeCols(tl[ti]), set: function (v, x) { var l = E.expandTimes(T(x)); l[ti] = timeFrom(v); SC(x).times = { mode: 'list', list: E.expandTimes({ mode: 'list', list: l }) }; },
        extra: tl.length > 1 ? '<button type="button" class="btn btn-ghost btn-block ie-rm" data-act="ie-rmtime" data-i="' + ti + '">Remove this time</button>' : '' };
    }
    if (/^amt:/.test(f)) {
      var ai = +f.split(':')[1], cura = parseAmount(amountsOf(it)[ai]);
      o = { title: 'How many' + (E.expandTimes(s.times).length > 1 ? ' at ' + E.fmtTime(E.toMins(E.expandTimes(s.times)[ai])) : ' each time') + '?', cols: [listCol(QTY, QTY, cura.q, 'How many'), listCol(FORMS, FORMS, cura.f, 'Form')],
        set: function (v, x) { var arr = amountsOf(x); arr[ai] = amountStr(v[0], v[1]); if (E.expandTimes(x.schedule.times).length === 1) arr = [arr[ai]]; setAmounts(x, arr); } };
    }
    if (f === 'supply') o = { title: 'How much do you have?', intro: 'Days’ worth on hand. It counts down each day.', cols: [numCol(0, 365, it.supply == null ? 30 : it.supply, 'Supply', 'days')], set: function (v, x) { x.supply = v[0]; },
      extra: '<button type="button" class="btn btn-ghost btn-block" data-act="ie-nosupply">Don’t track supply</button>' };
    if (f === 'start') o = { title: 'Starts', cols: [dateCol(today(), today() + 365, s.start == null ? today() : s.start, 'Starts')], set: function (v, x) { var q = SC(x); q.start = v[0]; if (q.end != null && q.end < q.start) q.end = q.start; if (q.start === today()) x.startMins = clock(); } };
    if (f === 'endDays') o = { title: 'For how many days?', cols: [numCol(1, 365, s.end != null && s.start != null ? s.end - s.start + 1 : 10, 'For', 'days')], set: function (v, x) { var q = SC(x); if (q.start == null) q.start = St.itemStartsToday(x) ? today() : today() + 1; q.end = q.start + v[0] - 1; } };
    if (f === 'endDate') o = { title: 'Until', cols: [dateCol(today(), today() + 365, s.end != null ? s.end : today() + 30, 'Until')], set: function (v, x) { SC(x).end = v[0]; } };
    if (/^stepDay:/.test(f)) { var k = +f.split(':')[1]; o = { title: 'From which day?', cols: [dateCol(today(), today() + 365, s.doseSteps[k].from, 'From')], set: function (v, x) { var q = SC(x); q.doseSteps[k].from = v[0]; q.doseSteps.sort(function (a, b) { return a.from - b.from; }); } }; }
    if (!o) return;
    var reopenMore = /^(start|endDays|endDate|stepDay)/.test(f);
    wheelSheet({ title: o.title, intro: o.intro, cols: o.cols, extra: o.extra, preview: ed.step === 2 ? function (v) { var copy = JSON.parse(JSON.stringify(ed.item)); o.set(v, copy); return esc(nextLine(copy)); } : null,
      onDone: function (v) { if (!ed) return; o.set(v, ed.item); rerender(); if (reopenMore) setTimeout(moreSheet, 60); } });
  }
  function moreSheet() {
    var it = ed.item, s = it.schedule;
    var endTxt = s.end == null ? 'Ongoing' : (s.start != null ? 'For ' + (s.end - s.start + 1) + ' days, until ' : 'Until ') + E.fmtDate(s.end);
    var steps = (s.doseSteps || []).map(function (st, i) { return '<div class="ie-step"><button type="button" class="tok" data-act="ie-tok" data-f="stepDay:' + i + '">From ' + esc(E.fmtDate(st.from)) + ' ▾</button><input class="input" data-step-label="' + i + '" value="' + esc(st.label) + '" aria-label="Dose from ' + esc(E.fmtDate(st.from)) + '"><button type="button" class="ie-x" data-act="ie-steprm" data-i="' + i + '" aria-label="Remove this step">×</button></div>'; }).join('');
    U.sheet('More options', '<div class="opt-list">' +
      '<button type="button" class="opt" data-act="ie-tok" data-f="start"><span><span class="o-t" style="display:block">Starts</span><span class="o-s">' + esc(s.start == null ? (St.itemStartsToday(it) ? 'Today' : 'Tomorrow') : s.start === today() ? 'Today' : E.fmtDate(s.start)) + '</span></span></button>' +
      '<div class="opt ie-endopt"><span class="grow"><span class="o-t" style="display:block">For how long</span><span class="o-s">' + esc(endTxt) + '</span></span></div>' +
      '<div class="ie-seg3"><button type="button" class="' + (s.end == null ? 'on' : '') + '" data-act="ie-end" data-v="none">Ongoing</button><button type="button" data-act="ie-tok" data-f="endDays">A number of days</button><button type="button" data-act="ie-tok" data-f="endDate">Until a date</button></div>' +
      (it.type === 'med' ? '<div class="ie-sub">Dose changes over time</div>' + (steps || '<p class="ie-hint">For a taper or a changing dose. Enter the steps exactly as your prescriber gave them.</p>') + '<button type="button" class="ie-link" data-act="ie-stepadd">+ The dose changes on a date</button>' : '') +
      (it.type === 'med' ? '<div class="set-row ie-hr"><span class="sr-main"><span class="sr-t" style="display:block">Extra care medicine</span><span class="sr-s">If it isn’t logged for a while, you’ll see a plain card to check with your care team.</span></span><button type="button" class="toggle" role="switch" aria-checked="' + (!!it.highRisk) + '" aria-label="Extra care medicine" data-act="ie-hrtoggle"></button></div>' : '') +
      '</div><button type="button" class="btn btn-clin btn-block" data-act="ie-moredone" style="margin-top:12px">Done</button>', { clin: true });
  }
  function readSteps() { U.$$('[data-step-label]').forEach(function (inp) { var i = +inp.getAttribute('data-step-label'); if (ed.item.schedule.doseSteps && ed.item.schedule.doseSteps[i]) ed.item.schedule.doseSteps[i].label = inp.value.trim() || ed.item.schedule.doseSteps[i].label; }); }
  function remSheet() {
    var it = ed.item, st = S().settings;
    U.sheet('Reminders', '<div class="set-group" style="margin:0">' +
      '<div class="set-row"><span class="sr-main"><span class="sr-t" style="display:block">Remind me at these times</span><span class="sr-s">' + esc(E.expandTimes(it.schedule.times).map(function (t) { return E.fmtTime(E.toMins(t)); }).join(', ')) + '</span></span><button type="button" class="toggle" role="switch" aria-checked="' + (it.reminders !== false) + '" aria-label="Reminders for this one" data-act="ie-remtoggle"></button></div>' +
      (it.type !== 'habit' ? '<div class="set-row"><span class="sr-main"><span class="sr-t" style="display:block">Two taps for this one</span><span class="sr-s">Pill out when it’s in your hand, then Swallowed.</span></span><button type="button" class="toggle" role="switch" aria-checked="' + (!!it.twoStep) + '" aria-label="Two taps" data-act="ie-twotoggle"></button></div>' : '') +
      '</div><p class="ie-hint" style="margin-top:10px">This is just for ' + esc(it.name || 'this one') + '. ' + (st.reminders ? '' : 'All reminders are off in Me right now. ') + 'Reminders don’t show the name on your lock screen unless you change that in Me.</p><button type="button" class="btn btn-clin btn-block" data-act="sheet-close" style="margin-top:12px">Done</button>', { clin: true, onClose: function () { rerender(); } });
  }
  function next() {
    readInputs();
    if (ed.step === 1) {
      if (!ed.item.name) {
        U.toast('Add a name or nickname first.'); var n = document.getElementById('ieName'); if (n) n.focus(); return;
      }
    }
    if (ed.mode === 'edit' && ed.step < 3) { ed.step = 3; rerender(); return; }
    ed.step = Math.min(3, ed.step + 1); rerender(); scrollTop();
  }
  function back() { readInputs(); if (ed.mode === 'edit') { ed.step = 3; rerender(); return; } ed.step = Math.max(1, ed.step - 1); rerender(); scrollTop(); }
  function scrollTop() { var v = document.getElementById('view'); if (v) v.scrollTop = 0; var b = document.querySelector('.ob-body'); if (b) b.scrollTop = 0; }
  function save() {
    readInputs();
    var it = JSON.parse(JSON.stringify(ed.item));
    if (!it.name) { ed.step = 1; rerender(); U.toast('Add a name or nickname first.'); return; }
    if (ed.mode === 'onboarding') { if (root.Onboarding && root.Onboarding.editorSaved) root.Onboarding.editorSaved(it); return; }
    if (it.type !== 'med') { it.supply = null; it.highRisk = false; }
    var r = St.saveItem(it), wasEdit = ed.mode === 'edit', mode = ed.mode;
    ed = null;
    U.closeAll();
    root.App.back();
    var nx = r.firstNext;
    if (wasEdit) U.toast(r.frozen ? 'Saved. Changes start tomorrow.' : 'Saved. Changes start with your next dose.');
    else if (E.isAsNeeded(r.item)) U.toast('Added. It’s under “As needed” on Today.');
    else U.toast('Added. ' + (r.item.type === 'habit' ? 'First nudge: ' : 'First reminder: ') + (nx ? nx.label.replace(/^Today/, 'today').replace(/^Tomorrow/, 'tomorrow') : 'soon') + '.');
    return mode;
  }

  root.ItemEditor = { open: open, screen: screen, body: body, cta: cta, draft: draft, next: next, back: back, save: save, state: function () { return ed; }, close: function () { ed = null; }, TYPES: TYPES, FREQS: FREQS };
  root.App.screens.itemEditor = screen;
  root.App.clinScreens = root.App.clinScreens || {};
  root.App.clinScreens.itemEditor = 1;
  root.App.afterHooks.itemEditor = function () { initWheels(); };
  Object.assign(root.App.acts, {
    'ie-type': function (el) { readInputs(); var v = el.getAttribute('data-v'), it = ed.item; if (it.type === v) return; if (ed.mode === 'onboarding' && it.name === suggestName(it.type)) it.name = suggestName(v); it.type = v; it.amount = defAmount(v); delete it.schedule.amounts; if (v === 'habit') { it.twoStep = false; it.supply = null; it.highRisk = false; it.strength = ''; } else { it.twoStep = !!S().settings.twoStep; if (v === 'med' && it.supply == null) it.supply = 30; if (v === 'vitamin') it.supply = null; } rerender(); },
    'ie-idea': function (el) { ed.item.name = el.getAttribute('data-v'); rerender(); },
    'ie-next': next, 'ie-back': back, 'ie-save': save,
    'ie-cancel': function () { ed = null; root.App.back(); },
    'ie-goto': function (el) { readInputs(); ed.step = +el.getAttribute('data-s'); rerender(); scrollTop(); },
    'ie-tok': function (el) { readInputs(); readSteps(); var f = el.getAttribute('data-f'); if (/^(start|endDays|endDate|stepDay)/.test(f)) U.closeAll(); tokenSheet(f); },
    'ie-freq': function (el) { setPattern(el.getAttribute('data-v')); U.closeAll(); rerender(); },
    'ie-day': function (el) { var p = sch().pattern, v = +el.getAttribute('data-v'), i = p.days.indexOf(v); if (i >= 0) { if (p.days.length > 1) p.days.splice(i, 1); else { U.toast('Pick at least one day.'); return; } } else p.days.push(v); p.days.sort(); rerender(); },
    'ie-mby': function (el) { sch().pattern.by = el.getAttribute('data-v'); rerender(); },
    'ie-tmode': function (el) { var s = sch(), v = el.getAttribute('data-v'), list = E.expandTimes(s.times); s.times = v === 'everyHours' ? { mode: 'everyHours', hours: 8, first: list[0] || '06:00', last: '22:00' } : { mode: 'list', list: [list[0] || '08:00'] }; rerender(); },
    'ie-addtime': function () { var s = sch(), list = E.expandTimes(s.times); if (list.length >= 8) return; var t = smartNextTime(list); list.push(t); s.times = { mode: 'list', list: E.expandTimes({ mode: 'list', list: list }) }; rerender(); setTimeout(function () { tokenSheet('time:' + s.times.list.indexOf(t)); }, 30); },
    'ie-rmtime': function (el) { var s = sch(), list = E.expandTimes(s.times), i = +el.getAttribute('data-i'); if (cur) cur.done = true; cur = null; list.splice(i, 1); s.times = { mode: 'list', list: list }; U.closeAll(); rerender(); },
    'ie-nosupply': function () { if (cur) cur.done = true; cur = null; ed.item.supply = null; U.closeAll(); rerender(); },
    'ie-more': function () { readInputs(); moreSheet(); },
    'ie-moredone': function () { readSteps(); U.closeAll(); rerender(); },
    'ie-end': function () { readSteps(); ed.item.schedule.end = null; U.closeAll(); moreSheet(); },
    'ie-stepadd': function () { readSteps(); var s = sch(); s.doseSteps = s.doseSteps || []; var last = s.doseSteps[s.doseSteps.length - 1]; s.doseSteps.push({ from: last ? last.from + 7 : today() + 7, label: last ? last.label : (ed.item.strength || '1 pill') }); U.closeAll(); moreSheet(); },
    'ie-steprm': function (el) { readSteps(); var s = sch(); s.doseSteps.splice(+el.getAttribute('data-i'), 1); if (!s.doseSteps.length) s.doseSteps = null; U.closeAll(); moreSheet(); },
    'ie-hrtoggle': function (el) { ed.item.highRisk = !ed.item.highRisk; el.setAttribute('aria-checked', String(ed.item.highRisk)); },
    'ie-rem': function () { readInputs(); remSheet(); },
    'ie-remtoggle': function (el) { ed.item.reminders = ed.item.reminders === false; el.setAttribute('aria-checked', String(ed.item.reminders)); },
    'ie-twotoggle': function (el) { ed.item.twoStep = !ed.item.twoStep; el.setAttribute('aria-checked', String(ed.item.twoStep)); },
    'ie-stop': function (el) { var m = St.medById(el.getAttribute('data-m')); U.sheet('Stop tracking ' + m.name + '?', '<p style="font-weight:600">It leaves your list from tomorrow. Your past record stays in your calendar.</p><div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-act="sheet-close">Keep it</button><button class="btn btn-clin" data-act="ie-stop-yes" data-m="' + m.id + '">Stop tracking</button></div>', { clin: true }); },
    'ie-stop-yes': function (el) { St.stopTracking(el.getAttribute('data-m')); ed = null; U.closeAll(); root.App.ui.stack = []; root.App.setTab('meds'); U.toast('Stopped. Your past record stays in your calendar.'); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && (e.target.id === 'ieName' || e.target.id === 'ieStr') && ed) { e.preventDefault(); next(); } });
})(window);
