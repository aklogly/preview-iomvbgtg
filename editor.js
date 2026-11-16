/* Kindling v5.6 — editor.js : the shared wheel pickers and the ONE ItemEditor.
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
  // v5.6 (A4): "Other" opens a free-text field; what they type becomes the type label.
  var TYPES = [
    ['med', 'Medicine', 'Prescription or from the store'],
    ['vitamin', 'Vitamin or supplement', 'Vitamin D, fish oil, probiotic'],
    ['habit', 'Habit', 'Drink water, stretch, walk'],
    ['other', 'Other', 'Type your own: inhaler, cream, eye drops']
  ];
  // v5.6 (A11): "Weekly or every few weeks" is merged into "Some days of the week" (with an "every [1 week]" token).
  var FREQS = [
    ['daily', 'Every day', ''],
    ['weekdays', 'Some days of the week', 'Like Mon, Wed and Fri, or every 2 weeks'],
    ['everyNDays', 'Every few days', 'Like every 2 or 3 days'],
    ['monthly', 'Once a month', 'Like the 1st, or the 2nd Tuesday'],
    ['cycle', 'On and off', 'Like 21 days on, 7 days off'],
    ['asNeeded', 'Only when I need it', 'No set time. Log it when you use it']
  ];
  var ed = null;

  function nearestBlock() {
    var s = S(), times = [];
    (s.meds || []).forEach(function (m) { if (!E.isAsNeeded(m) && !E.isEnded(m, s.day)) E.expandTimes(E.schedOf(m).times).forEach(function (t) { if (times.indexOf(t) < 0) times.push(t); }); });
    var now = clock();
    if (times.length) { var best = times[0]; times.forEach(function (t) { if (Math.abs(E.gameMins(t) - now) < Math.abs(E.gameMins(best) - now)) best = t; }); return best; }
    var m = now % 1440; return m >= 180 && m < 660 ? '08:00' : m >= 660 && m < 900 ? '12:00' : m >= 900 && m < 1200 ? '18:00' : '21:30';
  }
  /* "How many" (v5.6 A3): free text per time ("2", "1/2", "10 mL", "2 puffs"). Optional. No wheel. */
  function amountsOf(it) { var list = E.expandTimes(it.schedule.times); return list.map(function (t) { return E.amountFor(it, t); }); }
  function setAmounts(it, arr) {
    var list = E.expandTimes(it.schedule.times), s = it.schedule;
    arr = arr.map(function (a) { return String(a || '').trim().slice(0, 40); });
    if (arr.every(function (a) { return a === arr[0]; })) { it.amount = arr[0] || ''; delete s.amounts; return; }
    it.amount = arr[0]; s.amounts = {}; list.forEach(function (t, i) { s.amounts[t] = arr[i]; });
  }
  function amountSummary(it) {
    var list = E.expandTimes(it.schedule.times), a = amountsOf(it);
    if (a.every(function (x) { return !x; })) return 'Optional';
    if (a.every(function (x) { return x === a[0]; })) return a[0] + ' each time';
    return list.map(function (t, i) { return (a[i] || '–') + ' at ' + E.fmtTime(E.toMins(t)); }).join(', ');
  }
  function tracksSupply(type) { return type !== 'habit'; } // v5.6 (A11): vitamins (and "Other") can track supply too
  function blankItem(type) {
    type = type || 'med';
    return { id: null, type: type, typeLabel: '', name: '', strength: '', amount: '', reminders: true, twoStep: type === 'habit' || type === 'other' ? false : !!S().settings.twoStep, supply: null, highRisk: false, pharmacy: '',
      schedule: { pattern: { kind: 'daily' }, times: { mode: 'list', list: [nearestBlock()] }, start: null, end: null, doseSteps: null } };
  }
  function open(mode, opts) {
    opts = opts || {};
    var item = opts.id ? JSON.parse(JSON.stringify(St.medById(opts.id))) : (opts.item ? JSON.parse(JSON.stringify(opts.item)) : blankItem(opts.type || 'med'));
    if (item && !item.schedule) item.schedule = E.schedOf(item);
    if (item) E.migrateItemTimes(item);
    if (item && !item.type) item.type = 'med';
    if (item && item.reminders == null) item.reminders = true;
    if (item && item.amount == null) item.amount = '';
    if (opts.id && item.supply != null) item.supply = St.supplyLeft(St.medById(opts.id)); // edit shows what's on hand now, not the saved start value
    if (mode === 'onboarding' && !item.name && !opts.blank) item.name = suggestName(item.type);
    ed = { mode: mode, step: mode === 'edit' ? (opts.step || 3) : (opts.step || 1), item: item, only: opts.only || null, from: opts.from || null, first: opts.first !== false };
    if (mode !== 'onboarding') root.App.go('itemEditor', { mode: mode, id: opts.id || null, t: Date.now() });
    return ed;
  }
  function draft() { return ed && ed.item; }
  function sch() { return ed.item.schedule; }
  // During Live onboarding there's no game day yet: use the real date and clock.
  function today() { return S().today ? S().day : (St.isLive() ? St.liveNow().day : 1); }
  function clock() { return S().today ? S().clock : (St.isLive() ? St.liveNow().clock : 480); }
  function typeName(it) { return it.type === 'other' ? (it.typeLabel || 'Other') : (TYPES.filter(function (x) { return x[0] === it.type; })[0] || TYPES[0])[1]; }
  // Onboarding shows the default name in the field (visible, editable) instead of inventing one silently.
  function suggestName(type) { return type === 'habit' ? 'Drink water' : type === 'vitamin' ? 'Vitamin D' : type === 'other' ? '' : 'My morning medicine'; }
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
  function token(f, text, extra, label) { return '<button type="button" class="tok' + (extra || '') + '" data-act="ie-tok" data-f="' + f + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '>' + esc(text) + ' <span class="tok-v" aria-hidden="true">▾</span></button>'; }
  // The weekly family: "Some days of the week" covers weekdays and every N weeks. The engine keeps both kinds.
  function isWeekFamily(p) { return p.kind === 'weekdays' || p.kind === 'weekly'; }
  function everyWeeks(p) { return p.kind === 'weekly' ? (p.everyWeeks || 1) : 1; }
  // One day every week, or every N weeks, is stored as "weekly" (it gets Boss Day); several days every week as "weekdays".
  function setWeekFamily(p, days, n) {
    days = days.slice().sort(function (a, b) { return a - b; });
    var q = days.length === 1 || n > 1 ? { kind: 'weekly', everyWeeks: n, days: days } : { kind: 'weekdays', days: days };
    for (var k in p) delete p[k]; for (k in q) p[k] = q[k];
  }
  function freqName(p) { if (isWeekFamily(p)) return 'Some days of the week'; var f = FREQS.filter(function (x) { return x[0] === p.kind; })[0]; return f ? f[1] : 'Every day'; }
  function forText(it) { var s = it.schedule; if (s.end == null) return 'no end date'; var st = s.start != null ? s.start : (ed.mode === 'onboarding' || St.itemStartsToday(it) ? today() : today() + 1); return (s.end - st + 1) + ' day' + (s.end - st === 0 ? '' : 's'); }

  /* ----- screen 1: what is it? ----- */
  function step1() {
    var it = ed.item, t = it.type;
    var intro = ed.mode === 'onboarding' ? '<p class="ie-quick">' + (ed.first ? 'Let’s start with one thing. You can add the rest any time from My list.' : 'Add another thing. You can always add more later from My list.') + '</p>' : '';
    return '<div class="ie" data-step="1">' + intro + '<h1 class="ie-h">What is it?</h1>' +
      '<div class="ie-types" role="radiogroup" aria-label="Type">' + TYPES.map(function (x) {
        return '<button type="button" class="ie-type' + (t === x[0] ? ' on' : '') + '" role="radio" aria-checked="' + (t === x[0]) + '" data-act="ie-type" data-v="' + x[0] + '"><span class="ie-ti">' + A.itemIcon({ type: x[0] }) + '</span><span><span class="ie-tt">' + x[1] + '</span><span class="ie-ts">' + x[2] + '</span></span></button>';
      }).join('') + '</div>' +
      (t === 'other' ? '<div class="field"><label for="ieTypeLabel">What kind of thing is it?</label><input class="input" id="ieTypeLabel" autocomplete="off" maxlength="30" value="' + esc(it.typeLabel || '') + '" placeholder="Like “Inhaler” or “Eye drops”"></div>' : '') +
      '<div class="field"><label for="ieName">' + (t === 'habit' ? 'What’s the habit?' : 'What do you call it?') + '</label><input class="input" id="ieName" autocomplete="off" value="' + esc(it.name) + '" placeholder="' + (t === 'habit' ? 'Like “Drink a glass of water”' : t === 'vitamin' ? 'Like “Vitamin D”' : t === 'other' ? 'Like “Blue inhaler”' : 'Like “Lisinopril” or “blue pill”') + '"><div class="hint">' + (t === 'habit' ? 'Anything you want to do each day. Type it your way.' : 'A nickname is fine. It stays on your phone.') + '</div></div>' +
      (t === 'med' || t === 'other' ? '<div class="field"><label for="ieStr">Strength (optional)</label><input class="input" id="ieStr" autocomplete="off" value="' + esc(it.strength || '') + '" placeholder="Like 10 mg"></div>' : '') +
      '</div>';
  }
  /* ----- screen 2: when? The tokens ARE the sentence ("[Every day ▾] at [8:00 AM ▾] [2 pills] for [no end date ▾]"). ----- */
  function step2() {
    var it = ed.item, s = it.schedule, p = s.pattern, an = p.kind === 'asNeeded', hab = it.type === 'habit';
    var lines = '<div class="ie-line">' + token('freq', freqName(p), '', 'How often: ' + freqName(p) + '. Change') + '</div>';
    if (isWeekFamily(p)) {
      lines += '<div class="ie-line ie-sub">on</div><div class="ie-days" role="group" aria-label="Days of the week">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (d, i) { var on = (p.days || []).indexOf(i) >= 0; return '<button type="button" class="ie-day' + (on ? ' on' : '') + '" aria-pressed="' + on + '" aria-label="' + E.WD_LONG[i] + '" data-act="ie-day" data-v="' + i + '">' + d + '</button>'; }).join('') + '</div>' +
        '<div class="ie-line">every ' + token('everyWeeks', everyWeeks(p) === 1 ? 'week' : everyWeeks(p) + ' weeks') + '</div>';
    }
    if (p.kind === 'everyNDays') lines += '<div class="ie-line">every ' + token('n', p.n + ' days') + '</div>';
    if (p.kind === 'monthly') {
      lines += '<div class="ie-seg2"><button type="button" class="' + (p.by !== 'nth' ? 'on' : '') + '" data-act="ie-mby" data-v="date">By date</button><button type="button" class="' + (p.by === 'nth' ? 'on' : '') + '" data-act="ie-mby" data-v="nth">By weekday</button></div>';
      lines += p.by === 'nth' ? '<div class="ie-line">on the ' + token('nth', { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', '-1': 'last' }[p.nth]) + token('weekday', E.WD_LONG[p.weekday]) + '</div>' : '<div class="ie-line">on the ' + token('date', E.ord(p.date)) + '</div>';
      if (p.by !== 'nth' && p.date >= 29) lines += '<p class="ie-hint">On shorter months: the last day.</p>';
    }
    if (p.kind === 'cycle') lines += '<div class="ie-line">' + token('on', p.on + ' days on') + ', then ' + token('off', p.off + ' days off') + '</div><div class="ie-line">Day 1 is ' + token('day1', p.day1 === today() ? 'today' : E.fmtDate(p.day1)) + '</div>';
    if (!an) {
      var list = E.expandTimes(s.times), amts = amountsOf(it), only = list.length === 1;
      // A5: every extra time row has an ×; the first row has none while it's the only one.
      lines += '<div class="ie-times" role="group" aria-label="Times"><span class="ie-at">at</span><div class="ie-trows">' + list.map(function (t, i) {
        var tl = E.fmtTime(E.toMins(t));
        return '<div class="ie-trow">' + token('time:' + i, tl, ' tok-time', 'Time ' + (i + 1) + ': ' + tl + '. Change') +
          (hab ? '' : '<input class="input ie-amt" data-amt="' + i + '" value="' + esc(amts[i] || '') + '" maxlength="40" autocomplete="off" placeholder="How many? (optional)" aria-label="How many at ' + esc(tl) + ' (optional)">') +
          (only ? '' : '<button type="button" class="ie-x ie-rmx" data-act="ie-rmtime" data-i="' + i + '" aria-label="Remove ' + esc(tl) + '">×</button>') + '</div>';
      }).join('') + (list.length < 8 ? '<button type="button" class="ie-link ie-addt" data-act="ie-addtime">+ Add a time</button>' : '') + '</div></div>';
      if (!hab) lines += '<p class="ie-hint ie-amt-hint">Type it your way: 2, 1/2, 10 mL, 2 puffs.</p>';
      lines += '<div class="ie-line">for ' + token('endDays', forText(it), '', 'For how long: ' + forText(it) + '. Change') + '</div>';
    }
    return '<div class="ie" data-step="2"><h1 class="ie-h">When do you ' + (hab ? 'do it' : 'take it') + '?</h1>' +
      '<div class="ie-builder ie-sentence-card">' + lines + '</div>' +
      '<div class="ie-live" aria-live="polite"><div class="ie-next" id="ieNext">' + esc(nextLine()) + '</div>' + (startsLine() ? '<div class="ie-starts">' + esc(startsLine()) + '</div>' : '') + '</div></div>';
  }
  /* ----- screen 3: review ----- */
  function rowBtn(k, label, value, act, extra) { return '<button type="button" class="ie-row" data-act="' + act + '" data-k="' + k + '"' + (extra || '') + '><span class="ie-rk">' + label + '</span><span class="ie-rv">' + esc(value) + '</span>' + A.icon('chev') + '</button>'; }
  function pastToday(it) { var t = E.timesOn(it, today()).map(E.gameMins).filter(function (m) { return m <= clock(); }); return t.length ? t[0] : 0; }
  // Days left for the draft (as if the supply was just counted today).
  function draftDaysLeft(it) {
    if (it.supply == null || !S().today) return null;
    var c = JSON.parse(JSON.stringify(it)); c.supplySetOn = S().day; var pv = previewItem(c); pv.supply = c.supply; pv.supplySetOn = S().day;
    return St.daysLeft(pv);
  }
  function supplyValue(it) {
    if (it.supply == null) return 'Not tracked';
    var n = draftDaysLeft(it), have = (Math.round(it.supply * 100) / 100) + ' on hand';
    return n == null || E.isAsNeeded(it) ? have : have + ' · about ' + n + ' day' + (n === 1 ? '' : 's');
  }
  function step3() {
    var it = ed.item, s = it.schedule, an = E.isAsNeeded(it), pv = previewItem(), n = E.nextOccurrences(pv, today(), clock(), 1)[0];
    var title = it.name + (it.strength ? ' ' + it.strength : '');
    var more = [];
    if (s.start != null && s.start > today() + 1) more.push('Starts ' + E.fmtDate(s.start));
    if (s.doseSteps && s.doseSteps.length) more.push(s.doseSteps.length + ' dose step' + (s.doseSteps.length === 1 ? '' : 's'));
    if (it.highRisk) more.push('Extra care');
    var isEdit = ed.mode === 'edit' && it.id && St.medById(it.id), live = isEdit && St.medById(it.id);
    var summary = '<div class="ie-summary"><div class="ie-sum-h">' + A.itemIcon(it) + '<b>' + esc(title || 'Untitled') + '</b></div><div class="ie-sentence" id="ieSentence">' + esc(E.scheduleSentence(pv)) + '</div>' +
      '<div class="ie-next">' + esc(an ? 'Log it on Today when you use it.' : (startsLine() + (ed.mode === 'onboarding' && pastToday(pv) ? '. You can log today’s ' + E.fmtTime(pastToday(pv)) + ' dose on Today' : '') + (n && it.reminders !== false ? '. ' + (isEdit ? 'Next reminder: ' : it.type === 'habit' ? 'First nudge: ' : 'First reminder: ') + n.label.replace(/^Today/, 'today').replace(/^Tomorrow/, 'tomorrow') : '') + '.')) + '</div></div>';
    var rows = rowBtn('type', 'Type', typeName(it), 'ie-goto', ' data-s="1"') +
      rowBtn('name', 'Name', title, 'ie-goto', ' data-s="1"') +
      rowBtn('when', 'When', E.scheduleSentence(pv), 'ie-goto', ' data-s="2"') +
      (an || it.type === 'habit' ? '' : rowBtn('amt', 'How many', amountSummary(it), 'ie-goto', ' data-s="2"')) +
      (an ? '' : rowBtn('rem', 'Reminders', (it.reminders !== false ? 'On' : 'Off') + (it.reminders !== false && !S().settings.reminders ? ' (all reminders are off in Me)' : '') + ((it.type === 'med' || it.type === 'vitamin') && S().settings.twoStepAsked !== false && ed.mode !== 'onboarding' ? (it.twoStep ? ' · Pill out, then Swallowed' : ' · One tap') : ''), 'ie-rem')) +
      (tracksSupply(it.type) ? rowBtn('supply', 'Supply', supplyValue(it), 'ie-tok', ' data-f="supply"') : '') +
      (tracksSupply(it.type) && it.supply != null && !an ? rowBtn('pharm', 'Pharmacy phone', it.pharmacy ? it.pharmacy : 'Add a number (optional)', 'ie-pharm') : '') +
      (tracksSupply(it.type) && it.supply != null && !an ? rowBtn('lead', 'Refill reminder', 'Remind me ' + E.refillLead(it) + ' day' + (E.refillLead(it) === 1 ? '' : 's') + ' before', 'ie-tok', ' data-f="lead"') : '') +
      rowBtn('more', 'More options', more.join(' · ') || 'Start date, dose changes', 'ie-more');
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
    var n = document.getElementById('ieName'), s = document.getElementById('ieStr'), tl = document.getElementById('ieTypeLabel');
    if (n) ed.item.name = n.value.trim(); if (s) ed.item.strength = s.value.trim(); if (tl) ed.item.typeLabel = tl.value.trim();
    var amts = U.$$('.ie-amt'); if (amts.length && ed.item.type !== 'habit') { var arr = amountsOf(ed.item); amts.forEach(function (inp) { arr[+inp.getAttribute('data-amt')] = inp.value; }); setAmounts(ed.item, arr); }
  }
  function rerender() { root.App.render(); setTimeout(function () { U.$$('.wheel').length && initWheels(); }, 20); }
  function refreshLive() { // update the preview without losing focus
    var b = document.getElementById('ieNext'); if (b) b.textContent = nextLine();
  }
  function setPattern(kind) {
    var s = sch(), wd = E.weekday(today()), dt = E.dateOf(today()).getDate();
    var p = { kind: kind };
    if (ed.mode === 'edit' && s.pattern.kind !== kind && !(isWeekFamily(s.pattern) && kind === 'weekdays')) s.start = null; // counts from the day of the edit, not the old start
    if (kind === 'weekdays') { if (isWeekFamily(s.pattern)) return; setWeekFamily(p, [wd], 1); }
    if (kind === 'everyNDays') p.n = 2;
    if (kind === 'monthly') { p.by = 'date'; p.date = dt; p.nth = Math.min(4, Math.ceil(dt / 7)); p.weekday = wd; }
    if (kind === 'cycle') { p.on = 21; p.off = 7; p.day1 = today(); }
    s.pattern = p;
  }
  function smartNextTime(list) {
    var mins = list.map(E.gameMins).sort(function (a, b) { return a - b; });
    if (mins.length === 1) return E.hhmm(Math.min(mins[0] + 720, 21 * 60 + 30));
    var best = 0, at = mins[0];
    for (var i = 0; i < mins.length - 1; i++) if (mins[i + 1] - mins[i] > best) { best = mins[i + 1] - mins[i]; at = mins[i] + Math.round(best / 2 / 5) * 5; }
    return E.hhmm(at);
  }
  // Moving a time keeps its "how many" with it.
  function moveTime(x, i, to) {
    var l = E.expandTimes(x.schedule.times), a = amountsOf(x), from = l[i];
    l[i] = to; var pairs = l.map(function (t, k) { return [t, a[k]]; });
    var uniq = E.expandTimes({ mode: 'list', list: l });
    x.schedule.times = { mode: 'list', list: uniq };
    setAmounts(x, uniq.map(function (t) { var hit = pairs.filter(function (p) { return p[0] === t; })[0]; return hit ? hit[1] : ''; }));
    return from;
  }
  function tokenSheet(f) {
    var it = ed.item, s = it.schedule, p = s.pattern;
    if (f === 'freq') {
      var curK = isWeekFamily(p) ? 'weekdays' : p.kind;
      U.sheet('How often?', '<div class="opt-list">' + FREQS.map(function (x) { return '<button type="button" class="opt' + (curK === x[0] ? ' on' : '') + '" data-act="ie-freq" data-v="' + x[0] + '"><span><span class="o-t" style="display:block">' + x[1] + '</span>' + (x[2] ? '<span class="o-s">' + x[2] + '</span>' : '') + '</span></button>'; }).join('') + '</div>', { clin: true });
      return;
    }
    if (f === 'supply') { supplySheet(); return; }
    var o = null;
    // Setters resolve the item at call time, so the live preview can run them on a copy.
    function P(it) { return it.schedule.pattern; } function SC(it) { return it.schedule; }
    if (f === 'n') o = { title: 'Every how many days?', cols: [numCol(2, 60, p.n, 'Every', 'days')], set: function (v, x) { P(x).n = v[0]; } };
    if (f === 'everyWeeks') o = { title: 'Every how many weeks?', cols: [numCol(1, 12, everyWeeks(p), 'Every', 'weeks')], set: function (v, x) { setWeekFamily(P(x), P(x).days || [E.weekday(today())], v[0]); } };
    if (f === 'date') o = { title: 'Which day of the month?', cols: [numCol(1, 31, p.date, 'Day', '', E.ord)], set: function (v, x) { P(x).date = v[0]; } };
    if (f === 'nth') o = { title: 'Which one?', cols: [listCol([1, 2, 3, 4, -1], ['1st', '2nd', '3rd', '4th', 'Last'], p.nth, 'Which')], set: function (v, x) { P(x).nth = v[0]; } };
    if (f === 'weekday') o = { title: 'Which weekday?', cols: [listCol(range(0, 6), E.WD_LONG, p.weekday, 'Weekday')], set: function (v, x) { P(x).weekday = v[0]; } };
    if (f === 'on') o = { title: 'Days on', cols: [numCol(1, 90, p.on, 'Days on', 'days')], set: function (v, x) { P(x).on = v[0]; } };
    if (f === 'off') o = { title: 'Days off', cols: [numCol(1, 90, p.off, 'Days off', 'days')], set: function (v, x) { P(x).off = v[0]; } };
    if (f === 'day1') o = { title: 'Day 1 of the cycle', cols: [dateCol(today() - 90, today() + 60, p.day1, 'Day 1')], set: function (v, x) { P(x).day1 = v[0]; } };
    if (/^time:/.test(f)) {
      var ti = +f.split(':')[1], tl = E.expandTimes(s.times);
      o = { title: 'What time?', cols: timeCols(tl[ti]), set: function (v, x) { moveTime(x, ti, timeFrom(v)); } };
    }
    if (f === 'lead') o = { title: 'Refill reminder', intro: 'We’ll start reminding you this many days before it runs out.', cols: [numCol(1, E.REFILL.maxLead, E.refillLead(it), 'Days before', 'days')], set: function (v, x) { x.refill = Object.assign({}, x.refill || {}, { lead: v[0] }); } };
    if (f === 'start') o = { title: 'Starts', cols: [dateCol(today(), today() + 365, s.start == null ? today() : s.start, 'Starts')], set: function (v, x) { var q = SC(x); q.start = v[0]; if (q.end != null && q.end < q.start) q.end = q.start; if (q.start === today()) x.startMins = clock(); } };
    // A11: "for N days" is a token in the sentence. "No end date" and "Until a date" sit under the wheel.
    if (f === 'endDays') o = { title: 'For how many days?', cols: [numCol(1, 365, s.end != null && s.start != null ? s.end - s.start + 1 : 10, 'For', 'days')], set: function (v, x) { var q = SC(x); if (q.start == null) q.start = ed.mode === 'onboarding' || St.itemStartsToday(x) ? today() : today() + 1; q.end = q.start + v[0] - 1; },
      extra: '<div class="btn-row ie-endx"><button type="button" class="btn btn-ghost" data-act="ie-end" data-v="none">No end date</button><button type="button" class="btn btn-ghost" data-act="ie-end" data-v="date">Until a date ›</button></div>' };
    if (f === 'endDate') o = { title: 'Until', cols: [dateCol(today(), today() + 365, s.end != null ? s.end : today() + 30, 'Until')], set: function (v, x) { SC(x).end = v[0]; } };
    if (/^stepDay:/.test(f)) { var k = +f.split(':')[1]; o = { title: 'From which day?', cols: [dateCol(today(), today() + 365, s.doseSteps[k].from, 'From')], set: function (v, x) { var q = SC(x); q.doseSteps[k].from = v[0]; q.doseSteps.sort(function (a, b) { return a.from - b.from; }); } }; }
    if (!o) return;
    var reopenMore = /^(start|stepDay)/.test(f);
    wheelSheet({ title: o.title, intro: o.intro, cols: o.cols, extra: o.extra, preview: ed.step === 2 ? function (v) { var copy = JSON.parse(JSON.stringify(ed.item)); o.set(v, copy); return esc(nextLine(copy)); } : null,
      onDone: function (v) { if (!ed) return; o.set(v, ed.item); rerender(); if (reopenMore) setTimeout(moreSheet, 60); } });
  }
  /* Supply (v5.6): a count you type (pills, mL, puffs). It goes down by "how many" each dose, or one when that's empty. */
  function supplySheet() {
    var it = ed.item;
    U.sheet('How many do you have?', '<p class="ie-hint">Count what’s on hand: pills, mL, puffs. Each dose takes off your “how many”, or 1 if that’s empty.</p>' +
      '<div class="field"><label for="ieSupplyIn">On hand now</label><input class="input" id="ieSupplyIn" type="number" inputmode="decimal" min="0" step="any" placeholder="Like 30" value="' + (it.supply == null ? '' : it.supply) + '"></div>' +
      '<button type="button" class="btn btn-clin btn-block" data-act="ie-supply-save">Done</button>' +
      '<button type="button" class="btn btn-ghost btn-block" data-act="ie-nosupply">Don’t track supply</button>', { clin: true });
    setTimeout(function () { var i = document.getElementById('ieSupplyIn'); if (i) try { i.focus(); i.select(); } catch (e) { } }, 40);
  }
  function moreSheet() {
    var it = ed.item, s = it.schedule;
    var steps = (s.doseSteps || []).map(function (st, i) { return '<div class="ie-step"><button type="button" class="tok" data-act="ie-tok" data-f="stepDay:' + i + '">From ' + esc(E.fmtDate(st.from)) + ' ▾</button><input class="input" data-step-label="' + i + '" value="' + esc(st.label) + '" aria-label="Dose from ' + esc(E.fmtDate(st.from)) + '"><button type="button" class="ie-x" data-act="ie-steprm" data-i="' + i + '" aria-label="Remove this step">×</button></div>'; }).join('');
    var med = it.type === 'med' || it.type === 'other';
    U.sheet('More options', '<div class="opt-list">' +
      '<button type="button" class="opt" data-act="ie-tok" data-f="start"><span><span class="o-t" style="display:block">Starts</span><span class="o-s">' + esc(s.start == null ? (ed.mode === 'onboarding' || St.itemStartsToday(it) ? 'Today' : 'Tomorrow') : s.start === today() ? 'Today' : E.fmtDate(s.start)) + '</span></span></button>' +
      (med ? '<div class="ie-sub">Dose changes over time</div>' + (steps || '<p class="ie-hint">For a taper or a changing dose. Enter the steps exactly as your prescriber gave them.</p>') + '<button type="button" class="ie-link" data-act="ie-stepadd">+ The dose changes on a date</button>' : '') +
      (it.type === 'med' ? '<div class="set-row ie-hr"><span class="sr-main"><span class="sr-t" style="display:block">Extra care medicine</span><span class="sr-s">If it isn’t logged for a while, you’ll see a plain card to check with your care team.</span></span><button type="button" class="toggle" role="switch" aria-checked="' + (!!it.highRisk) + '" aria-label="Extra care medicine" data-act="ie-hrtoggle"></button></div>' : '') +
      '</div><button type="button" class="btn btn-clin btn-block" data-act="ie-moredone" style="margin-top:12px">Done</button>', { clin: true });
  }
  function readSteps() { U.$$('[data-step-label]').forEach(function (inp) { var i = +inp.getAttribute('data-step-label'); if (ed.item.schedule.doseSteps && ed.item.schedule.doseSteps[i]) ed.item.schedule.doseSteps[i].label = inp.value.trim() || ed.item.schedule.doseSteps[i].label; }); }
  function remSheet() {
    var it = ed.item, st = S().settings;
    U.sheet('Reminders', '<div class="set-group" style="margin:0">' +
      '<div class="set-row"><span class="sr-main"><span class="sr-t" style="display:block">Remind me at these times</span><span class="sr-s">' + esc(E.expandTimes(it.schedule.times).map(function (t) { return E.fmtTime(E.toMins(t)); }).join(', ')) + '</span></span><button type="button" class="toggle" role="switch" aria-checked="' + (it.reminders !== false) + '" aria-label="Reminders for this one" data-act="ie-remtoggle"></button></div>' +
      (it.type === 'med' || it.type === 'vitamin' ? '<div class="set-row"><span class="sr-main"><span class="sr-t" style="display:block">Two taps for this one</span><span class="sr-s">Pill out when it’s in your hand, then Swallowed.</span></span><button type="button" class="toggle" role="switch" aria-checked="' + (!!it.twoStep) + '" aria-label="Two taps" data-act="ie-twotoggle"></button></div>' : '') +
      '</div><p class="ie-hint" style="margin-top:10px">This is just for ' + esc(it.name || 'this one') + '. ' + (st.reminders ? '' : 'All reminders are off in Me right now. ') + 'Reminders don’t show the name on your lock screen unless you change that in Me.</p><button type="button" class="btn btn-clin btn-block" data-act="sheet-close" style="margin-top:12px">Done</button>', { clin: true, onClose: function () { rerender(); } });
  }
  function next() {
    readInputs();
    if (ed.step === 1) {
      if (ed.item.type === 'other' && !ed.item.typeLabel) { U.toast('Type what kind of thing it is.'); var tl = document.getElementById('ieTypeLabel'); if (tl) tl.focus(); return; }
      if (!ed.item.name) { U.toast('Add a name or nickname first.'); var n = document.getElementById('ieName'); if (n) n.focus(); return; }
    }
    if (ed.mode === 'edit' && ed.step < 3) { ed.step = 3; rerender(); return; }
    ed.step = Math.min(3, ed.step + 1); rerender(); scrollTop();
  }
  function back() { readInputs(); if (ed.mode === 'edit') { ed.step = 3; rerender(); return; } if (ed.mode === 'onboarding' && ed.step === 1) { if (root.Onboarding && root.Onboarding.editorBack) root.Onboarding.editorBack(); return; } ed.step = Math.max(1, ed.step - 1); rerender(); scrollTop(); }
  function scrollTop() { var v = document.getElementById('view'); if (v) v.scrollTop = 0; var b = document.querySelector('.ob-body'); if (b) b.scrollTop = 0; }
  function save() {
    readInputs();
    var it = JSON.parse(JSON.stringify(ed.item));
    if (it.type === 'other' && !it.typeLabel) { ed.step = 1; rerender(); U.toast('Type what kind of thing it is.'); return; }
    if (!it.name) { ed.step = 1; rerender(); U.toast('Add a name or nickname first.'); return; }
    if (it.type !== 'other') delete it.typeLabel;
    if (it.type === 'habit') { it.supply = null; it.amount = ''; delete it.schedule.amounts; }
    if (it.type !== 'med') it.highRisk = false;
    if (it.supply != null && it.refill && it.refill.off) it.refill = Object.assign({}, it.refill, { off: false }); // supply turned back on
    if (it.supply != null && (!St.medById(it.id) || St.medById(it.id).supply == null)) it.supplyStart = it.supply;
    if (ed.mode === 'onboarding') { it.supplyV = 2; if (root.Onboarding && root.Onboarding.editorSaved) root.Onboarding.editorSaved(it); return; }
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

  root.ItemEditor = { open: open, screen: screen, body: body, cta: cta, draft: draft, next: next, back: back, save: save, state: function () { return ed; }, close: function () { ed = null; }, TYPES: TYPES, FREQS: FREQS, typeName: typeName };
  root.App.screens.itemEditor = screen;
  root.App.clinScreens = root.App.clinScreens || {};
  root.App.clinScreens.itemEditor = 1;
  root.App.afterHooks.itemEditor = function () { initWheels(); };
  Object.assign(root.App.acts, {
    'ie-type': function (el) {
      readInputs(); var v = el.getAttribute('data-v'), it = ed.item; if (it.type === v) return;
      if (ed.mode === 'onboarding' && it.name === suggestName(it.type)) it.name = suggestName(v);
      it.type = v;
      if (v === 'habit') { it.twoStep = false; it.supply = null; it.highRisk = false; it.strength = ''; it.amount = ''; delete it.schedule.amounts; }
      else { it.twoStep = v === 'other' ? false : !!S().settings.twoStep; if (ed.mode !== 'edit') it.supply = null; if (v !== 'med') it.highRisk = false; if (v === 'vitamin') it.strength = ''; }
      rerender(); if (v === 'other') setTimeout(function () { var tl = document.getElementById('ieTypeLabel'); if (tl) tl.focus(); }, 40);
    },
    'ie-next': next, 'ie-back': back, 'ie-save': save,
    'ie-cancel': function () { ed = null; root.App.back(); },
    'ie-goto': function (el) { readInputs(); ed.step = +el.getAttribute('data-s'); rerender(); scrollTop(); },
    'ie-tok': function (el) { readInputs(); readSteps(); var f = el.getAttribute('data-f'); if (/^(start|endDate|stepDay)/.test(f)) U.closeAll(); tokenSheet(f); },
    'ie-freq': function (el) { setPattern(el.getAttribute('data-v')); U.closeAll(); rerender(); },
    'ie-day': function (el) { readInputs(); var p = sch().pattern, v = +el.getAttribute('data-v'), days = (p.days || []).slice(), i = days.indexOf(v); if (i >= 0) { if (days.length > 1) days.splice(i, 1); else { U.toast('Pick at least one day.'); return; } } else days.push(v); setWeekFamily(p, days, everyWeeks(p)); rerender(); },
    'ie-mby': function (el) { readInputs(); sch().pattern.by = el.getAttribute('data-v'); rerender(); },
    'ie-addtime': function () { readInputs(); var s = sch(), list = E.expandTimes(s.times), a = amountsOf(ed.item); if (list.length >= 8) return; var t = smartNextTime(list); var all = list.concat([t]), amt = a.concat([a.every(function (x) { return x === a[0]; }) ? a[0] : '']); var uniq = E.expandTimes({ mode: 'list', list: all }); s.times = { mode: 'list', list: uniq }; setAmounts(ed.item, uniq.map(function (x) { return amt[all.indexOf(x)] || ''; })); rerender(); setTimeout(function () { tokenSheet('time:' + s.times.list.indexOf(t)); }, 30); },
    'ie-rmtime': function (el) { readInputs(); var s = sch(), list = E.expandTimes(s.times), a = amountsOf(ed.item), i = +el.getAttribute('data-i'); if (list.length < 2) return; if (cur) cur.done = true; cur = null; list.splice(i, 1); a.splice(i, 1); s.times = { mode: 'list', list: list }; setAmounts(ed.item, a); U.closeAll(); rerender(); var f = document.querySelector('[data-act="ie-addtime"]'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } },
    'ie-nosupply': function () { if (cur) cur.done = true; cur = null; ed.item.supply = null; U.closeAll(); rerender(); },
    'ie-supply-save': function () { var i = document.getElementById('ieSupplyIn'), v = i ? parseFloat(i.value) : NaN; if (!(v >= 0) || !i.value.trim()) { U.toast('Type a number, like 30.'); return; } ed.item.supply = Math.round(v * 100) / 100; U.closeAll(); rerender(); },
    'ie-more': function () { readInputs(); moreSheet(); },
    'ie-pharm': function () { readInputs(); U.sheet('Pharmacy phone', '<div class="field"><label for="iePharm">Phone number</label><input class="input" id="iePharm" type="tel" inputmode="tel" autocomplete="tel" placeholder="Like 555-0134" value="' + esc(ed.item.pharmacy || '') + '"></div><p class="ie-hint">Used for the Call pharmacy button on refill reminders. It stays on your phone.</p><button type="button" class="btn btn-clin btn-block" data-act="ie-pharm-save">Done</button>', { clin: true }); },
    'ie-pharm-save': function () { var i = document.getElementById('iePharm'); ed.item.pharmacy = i ? i.value.trim().slice(0, 30) : ''; U.closeAll(); rerender(); },
    'ie-moredone': function () { readSteps(); U.closeAll(); rerender(); },
    'ie-end': function (el) { if (cur) cur.done = true; cur = null; var v = el.getAttribute('data-v'); U.closeAll(); if (v === 'date') { setTimeout(function () { tokenSheet('endDate'); }, 30); return; } ed.item.schedule.end = null; rerender(); },
    'ie-stepadd': function () { readSteps(); var s = sch(); s.doseSteps = s.doseSteps || []; var last = s.doseSteps[s.doseSteps.length - 1]; s.doseSteps.push({ from: last ? last.from + 7 : today() + 7, label: last ? last.label : (ed.item.strength || '1 pill') }); U.closeAll(); moreSheet(); },
    'ie-steprm': function (el) { readSteps(); var s = sch(); s.doseSteps.splice(+el.getAttribute('data-i'), 1); if (!s.doseSteps.length) s.doseSteps = null; U.closeAll(); moreSheet(); },
    'ie-hrtoggle': function (el) { ed.item.highRisk = !ed.item.highRisk; el.setAttribute('aria-checked', String(ed.item.highRisk)); },
    'ie-rem': function () { readInputs(); remSheet(); },
    'ie-remtoggle': function (el) { ed.item.reminders = ed.item.reminders === false; el.setAttribute('aria-checked', String(ed.item.reminders)); },
    'ie-twotoggle': function (el) { ed.item.twoStep = !ed.item.twoStep; el.setAttribute('aria-checked', String(ed.item.twoStep)); },
    'ie-stop': function (el) { var m = St.medById(el.getAttribute('data-m')); U.sheet('Stop tracking ' + m.name + '?', '<p style="font-weight:600">It leaves your list from tomorrow. Your past record stays in your calendar.</p><div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-act="sheet-close">Keep it</button><button class="btn btn-clin" data-act="ie-stop-yes" data-m="' + m.id + '">Stop tracking</button></div>', { clin: true }); },
    'ie-stop-yes': function (el) { St.stopTracking(el.getAttribute('data-m')); ed = null; U.closeAll(); root.App.ui.stack = []; root.App.setTab('meds'); U.toast('Stopped. Your past record stays in your calendar.'); }
  });
  // Typing "how many" updates the live preview without a re-render (focus stays in the field).
  document.addEventListener('input', function (e) { if (!ed || !e.target || !e.target.classList || !e.target.classList.contains('ie-amt')) return; readInputs(); refreshLive(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && ed && (e.target.id === 'ieName' || e.target.id === 'ieStr' || e.target.id === 'ieTypeLabel')) { e.preventDefault(); next(); }
    if (e.key === 'Enter' && e.target && e.target.id === 'ieSupplyIn') { e.preventDefault(); root.App.acts['ie-supply-save'](); }
  });
})(window);
