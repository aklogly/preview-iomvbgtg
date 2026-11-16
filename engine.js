/* Kindling v5 — engine.js
 * Pure economy + regimen logic. No DOM. Theme-blind.
 * The health record is the truth; the game reads it and never writes to it.
 * Exposed as window.Engine in the browser and module.exports in Node (for tests).
 */
(function (root) {
  'use strict';

  /* ---------- time helpers ---------- */
  // Demo day 1 = Monday 9 Nov 2026. weekday(dayNum): 0=Sun..6=Sat
  var BASE = { y: 2026, m: 10, d: 8 };
  function dateOf(dayNum) { return new Date(BASE.y, BASE.m, BASE.d + dayNum, 12, 0, 0); }
  function weekday(dayNum) { return dateOf(dayNum).getDay(); }
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(dayNum) { var d = dateOf(dayNum); return WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function weekIndex(dayNum) { return Math.floor((dayNum - 1) / 7); }
  function fmtDateLong(dayNum) { var d = dateOf(dayNum); return WD_LONG[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function toMins(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function fmtTime(mins) {
    mins = Math.max(0, Math.round(mins)) % 1440;
    var h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? 'PM' : 'AM';
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  /* ---------- seeded RNG ---------- */
  function hash(str) {
    var h = 1779033703 ^ String(str).length;
    for (var i = 0; i < String(str).length; i++) {
      h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0);
  }
  function rng(seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- fair split (largest remainder; always sums exactly) ---------- */
  function allocate(total, n) {
    if (n <= 0) return [];
    var base = Math.floor(total / n), rem = total - base * n, out = [];
    for (var i = 0; i < n; i++) out.push(base + (i < rem ? 1 : 0));
    return out;
  }

  /* ---------- regimen (v5.5: one schedule model for medicines, vitamins and habits) ---------- */
  var ROLLOVER = 180; // 3:00 local. Minutes after midnight but before 3:00 still belong to the previous game day.
  var SLOTS = [
    { id: 'morning', label: 'Morning', from: 0, to: 660 },
    { id: 'midday', label: 'Midday', from: 660, to: 960 },
    { id: 'evening', label: 'Evening', from: 960, to: 1230 },
    { id: 'bedtime', label: 'Bedtime', from: 1230, to: 1440 + ROLLOVER }
  ];
  function slotFor(mins) { for (var i = 0; i < SLOTS.length; i++) if (mins >= SLOTS[i].from && mins < SLOTS[i].to) return SLOTS[i]; return SLOTS[3]; }
  // Game-day minutes: 00:00-02:59 belong to the END of the game day (F-3), so they sort after 23:59.
  function gameMins(hhmm) { var m = typeof hhmm === 'number' ? hhmm : toMins(hhmm); return m < ROLLOVER ? m + 1440 : m; }
  function hhmm(mins) { mins = ((Math.round(mins) % 1440) + 1440) % 1440; return ('0' + Math.floor(mins / 60)).slice(-2) + ':' + ('0' + mins % 60).slice(-2); }

  /* ----- calendar helpers (day numbers; computed from date parts, so DST never shifts a day) ----- */
  function dayOfDate(y, m, d) { return Math.round((Date.UTC(y, m, d) - Date.UTC(BASE.y, BASE.m, BASE.d)) / 86400000); }
  function dayOfJs(date) { return dayOfDate(date.getFullYear(), date.getMonth(), date.getDate()); }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function isoDate(dayNum) { var d = dateOf(dayNum); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function mod(a, n) { return ((a % n) + n) % n; }
  /* gameNow(date) -> { day, clock }. Live mode: the game day comes from the local date, rolling over at 3:00.
   * From 00:00 to 02:59 the clock reads 1440+ (end of the previous game day). */
  function gameNow(date) {
    var mins = date.getHours() * 60 + date.getMinutes(), cal = dayOfJs(date);
    return mins < ROLLOVER ? { day: cal - 1, clock: mins + 1440 } : { day: cal, clock: mins };
  }

  /* ----- schedule model (PM spec §1.2). Legacy v5.4 "kind" items map onto it, so old presets compile identically. ----- */
  function schedOf(item) {
    if (item && item.schedule) { migrateTimes(item.schedule); return item.schedule; }
    var times = item && item.times && item.times.length ? item.times.slice() : ['08:00'];
    var s = { pattern: { kind: 'daily' }, times: { mode: 'list', list: times }, start: item && item.startDay != null ? item.startDay : null, end: item && item.endDay != null ? item.endDay : null, doseSteps: null };
    var k = item && item.kind;
    if (k === 'prn') s.pattern = { kind: 'asNeeded' };
    else if (k === 'weekly') s.pattern = { kind: 'weekly', everyWeeks: 1, days: [item.weekday == null ? 0 : item.weekday] };
    else if (k === 'taper') s.doseSteps = (item.steps || []).map(function (st) { return { from: st.fromDay, label: st.label }; });
    return s;
  }
  function isAsNeeded(item) { return schedOf(item).pattern.kind === 'asNeeded'; }
  function itemType(item) { return (item && item.type) || 'med'; }
  /* v5.6 (A6): "every few hours" is gone. A saved everyHours schedule is migrated ONCE to its expanded list of times
   * (first, first+h, ... up to last, within 24 hours), so a person keeps exactly the reminders they had. The engine has no
   * everyHours path any more; this migration is the only place the old rule still lives. */
  function migrateTimes(s) {
    var t = s && s.times;
    if (!t || t.mode !== 'everyHours') return false;
    var h = Math.max(1, Math.min(12, +t.hours || 8)), first = gameMins(t.first || '08:00');
    var last = t.last ? gameMins(t.last) : first + 1440 - 1, out = [];
    if (last < first) last = first;
    for (var m = first; m <= last && m < first + 1440 && out.length < 24; m += h * 60) out.push(hhmm(m));
    s.times = { mode: 'list', list: out.length ? out : ['08:00'] };
    return true;
  }
  function migrateItemTimes(item) { return !!(item && item.schedule && migrateTimes(item.schedule)); }
  function expandTimes(times) {
    if (!times) return ['08:00'];
    if (times.mode === 'everyHours') { var tmp = { times: JSON.parse(JSON.stringify(times)) }; migrateTimes(tmp); times = tmp.times; } // an unmigrated copy (never stored)
    var list = (times.list && times.list.length ? times.list : ['08:00']).slice();
    return list.sort(function (a, b) { return gameMins(a) - gameMins(b); }).filter(function (t, i, a) { return a.indexOf(t) === i; });
  }
  function anchorOf(item, s) { return s.start != null ? s.start : (item.createdDay != null ? item.createdDay : 1); }
  function weekStart(day) { return day - weekday(day); }
  function isPaused(med, dayNum) {
    if (!med.paused) return false;
    if (med.pausedFrom && dayNum < med.pausedFrom) return false;
    if (med.pausedUntil && dayNum > med.pausedUntil) return false;
    return true;
  }
  function isEnded(item, day) { return item.ended != null && day >= item.ended; }
  /* occursOn(item, day): the ONE function that says whether a scheduled item is due on a game day. */
  function occursOn(item, day) {
    if (!item || isPaused(item, day) || isEnded(item, day)) return false;
    var s = schedOf(item), p = s.pattern;
    if (p.kind === 'asNeeded') return false;
    if (s.start != null && day < s.start) return false;
    if (s.end != null && day > s.end) return false;
    var d = dateOf(day);
    switch (p.kind) {
      case 'daily': return true;
      case 'weekdays': return (p.days || []).indexOf(d.getDay()) >= 0;
      case 'everyNDays': return mod(day - anchorOf(item, s), Math.max(1, p.n || 1)) === 0;
      case 'weekly': return (p.days || []).indexOf(d.getDay()) >= 0 && mod(Math.round((weekStart(day) - weekStart(anchorOf(item, s))) / 7), Math.max(1, p.everyWeeks || 1)) === 0;
      case 'monthly':
        if (p.by === 'nth') {
          if (d.getDay() !== p.weekday) return false;
          var dim = daysInMonth(d.getFullYear(), d.getMonth());
          return p.nth === -1 ? d.getDate() + 7 > dim : Math.ceil(d.getDate() / 7) === p.nth;
        }
        return d.getDate() === Math.min(p.date || 1, daysInMonth(d.getFullYear(), d.getMonth()));
      case 'cycle': return mod(day - (p.day1 != null ? p.day1 : anchorOf(item, s)), (p.on || 1) + (p.off || 0)) < (p.on || 1);
    }
    return true;
  }
  function isScheduledOn(med, dayNum) { return occursOn(med, dayNum); } // v5.4 name, kept for callers and tests
  // Boss Day: an item whose doses are 7 or more days apart (weekly on one day, every N>=7 days or weeks, monthly).
  function bossEligible(item) {
    var p = schedOf(item).pattern;
    if (p.kind === 'weekly') return (p.days || []).length === 1;
    if (p.kind === 'everyNDays') return (p.n || 1) >= 7;
    if (p.kind === 'monthly') return true;
    return false;
  }
  // Taper / changing dose: the label follows the steps; the check-in count does not change.
  function doseLabel(med, dayNum) {
    var steps = schedOf(med).doseSteps, lbl = med.strength || '';
    if (steps && steps.length) { var hit = false; for (var i = 0; i < steps.length; i++) if (dayNum >= steps[i].from) { lbl = steps[i].label; hit = true; } if (!hit && !med.strength) lbl = steps[0].label; }
    return lbl;
  }
  function taperStepChanged(med, dayNum) {
    var steps = schedOf(med).doseSteps; if (!steps) return false;
    for (var i = 1; i < steps.length; i++) if (steps[i].from === dayNum) return true;
    return false;
  }
  /* "How many" per dose (v5.6 A3): free text, optional ("2", "1/2", "10 mL", "2 puffs"). item.amount is the default for every
   * time; schedule.amounts[time] holds a different amount at one time. Shown on Today and in the sentence whenever it's filled. */
  function amountFor(item, time) { var s = schedOf(item); var v = s.amounts && time && Object.prototype.hasOwnProperty.call(s.amounts, time) ? s.amounts[time] : item.amount; return String(v || '').trim(); }
  // On Today a bare number reads "×2" so "Metformin ×2" can't be mistaken for part of the name. Words stay as typed.
  function amountShown(a) { a = String(a || '').trim(); if (/^0+([.,]0+)?(\s|$)/.test(a) || /\/\s*0+(\s|$)/.test(a)) return ''; // "0" or "1/0": nothing to show
    return /^(\d+([.,]\d+)?|\d*\s*[½¼¾⅓⅔]|\d+\s*\/\s*\d+|\d+\s+\d+\s*\/\s*\d+)$/.test(a) ? '×' + a : a; }
  /* Supply countdown (A3): the amount's leading number when there is one ("2 puffs" -> 2, "1/2" -> 0.5, "1 1/2" -> 1.5,
   * "½" -> 0.5, "10 mL" -> 10); otherwise one per dose. */
  var FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  function amountUnits(text) {
    var t = String(text || '').trim().replace(/,/g, '.'), m;
    if (!t) return 1;
    if ((m = /^(\d+)\s+(\d+)\s*\/\s*(\d+)/.exec(t)) && +m[3] > 0) return +m[1] + (+m[2]) / (+m[3]);
    if ((m = /^(\d+)\s*([½¼¾⅓⅔])/.exec(t))) return +m[1] + FRAC[m[2]];
    if ((m = /^(\d*\.?\d+)\s*\/\s*(\d+)/.exec(t)) && +m[2] > 0) return (+m[1]) / (+m[2]);
    if ((m = /^([½¼¾⅓⅔])/.exec(t))) return FRAC[m[1]];
    if ((m = /^(\d*\.?\d+)/.exec(t)) && +m[1] > 0) return +m[1];
    return 1;
  }
  function doseText(item, day, time) { return [doseLabel(item, day), amountShown(amountFor(item, time))].filter(Boolean).join(' · '); }
  // Units used on a day the item is due (sum over its times). Used for "About N days left".
  function unitsOn(item, day) { return timesOn(item, day).reduce(function (a, t) { return a + amountUnits(amountFor(item, t)); }, 0); }
  function timesOn(item, day) {
    var list = expandTimes(schedOf(item).times);
    // S5: an item added mid-day starts today only with the times still ahead.
    if (item.startMins != null && schedOf(item).start === day) list = list.filter(function (t) { return gameMins(t) >= item.startMins; });
    return list;
  }

  /* compilePlan: groups the day's doses into check-ins by time of day.
   * Every day is worth exactly 100 Spark, split equally across time-of-day groups (max 4). Inside a group, doses more
   * than 90 minutes apart become separate check-ins (F-2) that split the group's share equally. Never weighted by item. */
  var CLUSTER = 90;
  function compilePlan(meds, dayNum) {
    var groups = {}, prn = [], anyScheduledKind = false;
    (meds || []).forEach(function (med) {
      if (isAsNeeded(med)) { if (!isPaused(med, dayNum) && !isEnded(med, dayNum)) prn.push(med.id); return; }
      if (isEnded(med, dayNum)) return;
      anyScheduledKind = true;
      if (!occursOn(med, dayNum)) return;
      var boss = bossEligible(med);
      timesOn(med, dayNum).forEach(function (t) {
        var m = gameMins(t), sl = slotFor(m);
        (groups[sl.id] = groups[sl.id] || { slot: sl, doses: [] }).doses.push({ medId: med.id, label: doseText(med, dayNum, t), weekly: boss, mins: m });
      });
    });
    var glist = Object.keys(groups).map(function (k) { return groups[k]; });
    glist.forEach(function (g) { g.doses.sort(function (a, b) { return a.mins - b.mins; }); g.first = g.doses[0].mins; });
    glist.sort(function (a, b) { return a.first - b.first; });
    var gv = allocate(100, glist.length), gs = allocate(80, glist.length), gx = allocate(80, glist.length), go = allocate(20, glist.length), stacks = [];
    glist.forEach(function (g, gi) {
      var clusters = [];
      g.doses.forEach(function (d) { var c = clusters[clusters.length - 1]; if (!c || d.mins - c.mins > CLUSTER) { c = { mins: d.mins, doses: [] }; clusters.push(c); } c.doses.push(d); });
      var v = allocate(gv[gi], clusters.length), s = allocate(gs[gi], clusters.length), x = allocate(gx[gi], clusters.length), o = allocate(go[gi], clusters.length);
      clusters.forEach(function (c, ci) {
        stacks.push({ id: g.slot.id + (ci ? '-' + (ci + 1) : ''), group: g.slot.id, label: g.slot.label, mins: c.mins, kind: 'dose', value: v[ci], stars: s[ci], xp: x[ci], onTime: o[ci],
          doses: c.doses.map(function (d) { return { medId: d.medId, label: d.label, weekly: d.weekly, mins: d.mins }; }), boss: c.doses.some(function (d) { return d.weekly; }) });
      });
    });
    stacks.sort(function (a, b) { return a.mins - b.mins; });
    var rest = false, journal = false;
    if (!stacks.length) {
      if (!anyScheduledKind && prn.length) { journal = true; stacks = [{ id: 'journal', label: 'Daily journal', mins: 720, doses: [], kind: 'journal' }]; }
      else { rest = true; stacks = [{ id: 'rest', label: 'Rest day', mins: 480, doses: [], kind: 'rest' }]; }
      var only = stacks[0]; only.value = 100; only.stars = 80; only.xp = 80; only.onTime = 20; only.boss = false;
    }
    return { dayNum: dayNum, stacks: stacks, rest: rest, journal: journal, boss: stacks.some(function (s) { return s.boss; }), prn: prn, locked: true };
  }
  function planTotal(plan) { return plan.stacks.reduce(function (a, s) { return a + s.value; }, 0); }

  /* F-6: one Gold headline per week (Mon-Sun), decided per week. A Boss Day in this week -> "Beat the Boss"; otherwise "Load the week". */
  function weekDays(weekIdx) { var out = []; for (var i = 1; i <= 7; i++) out.push(weekIdx * 7 + i); return out; }
  function bossDayInWeek(items, weekIdx) {
    var days = weekDays(weekIdx);
    for (var i = 0; i < days.length; i++) if ((items || []).some(function (it) { return bossEligible(it) && occursOn(it, days[i]); })) return days[i];
    return null;
  }
  function nextBossDay(items, fromDay, maxDays) {
    for (var d = fromDay; d < fromDay + (maxDays || 400); d++) if ((items || []).some(function (it) { return bossEligible(it) && occursOn(it, d); })) return d;
    return null;
  }
  function nextOccurrenceDay(item, fromDay, maxDays) {
    for (var d = fromDay; d < fromDay + (maxDays || 400); d++) if (occursOn(item, d) && timesOn(item, d).length) return d;
    return null;
  }
  /* nextOccurrences(item, day, clock, n): the live "Next: ..." preview. Labels: Today 8:00 PM, Tomorrow 8:00 AM, Sun 8:00 AM, Mon, Dec 14. */
  function nextOccurrences(item, day, clock, n) {
    var out = [];
    for (var d = day; d < day + 400 && out.length < (n || 4); d++) {
      if (!occursOn(item, d)) continue;
      timesOn(item, d).forEach(function (t) { var m = gameMins(t); if (out.length < (n || 4) && (d > day || m > clock)) out.push({ day: d, mins: m, label: relDay(d, day) + ' ' + fmtTime(m) }); });
    }
    return out;
  }
  function relDay(d, today) { return d === today ? 'Today' : d === today + 1 ? 'Tomorrow' : d - today < 7 ? WD[weekday(d)] : fmtDate(d); }

  /* ----- scheduleSentence(item): the ONE way a schedule reads, on every surface (editor, list, detail, day sheet). ----- */
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function joinAnd(list) { return list.length <= 1 ? (list[0] || '') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }
  var NTH = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', '-1': 'last' };
  function daysText(days) {
    var d = (days || []).slice().sort(function (a, b) { return a - b; });
    if (d.length === 7) return 'Every day';
    if (d.join() === '1,2,3,4,5') return 'Every weekday';
    if (d.join() === '0,6') return 'Saturdays and Sundays';
    if (d.length === 1) return 'Every ' + WD_LONG[d[0]];
    return 'Every ' + joinAnd(d.map(function (x) { return WD[x]; }));
  }
  function timesText(times) { return 'at ' + joinAnd(expandTimes(times).map(function (t) { return fmtTime(toMins(t)); })); }
  // A3: the amount shows whenever it's filled. One amount for every time: "..., 2 each time". Different amounts: per time.
  function timesTextWithAmounts(item, s) {
    var list = expandTimes(s.times), amts = list.map(function (t) { return amountFor(item, t); });
    var same = amts.every(function (a) { return a === amts[0]; });
    if (same) return timesText(s.times) + (amts[0] ? ', ' + amts[0] + ' each time' : '');
    return 'at ' + joinAnd(list.map(function (t, i) { return fmtTime(toMins(t)) + (amts[i] ? ' (' + amts[i] + ')' : ''); }));
  }
  function patternText(p) {
    switch (p.kind) {
      case 'daily': return 'Every day';
      case 'weekdays': return daysText(p.days);
      case 'everyNDays': return p.n === 1 ? 'Every day' : 'Every ' + p.n + ' days';
      case 'weekly': return (p.everyWeeks || 1) === 1 ? daysText(p.days).replace('Every day', 'Every day of the week') : 'Every ' + p.everyWeeks + ' weeks on ' + joinAnd((p.days || []).slice().sort().map(function (x) { return WD_LONG[x]; }));
      case 'monthly': return p.by === 'nth' ? 'The ' + NTH[p.nth] + ' ' + WD_LONG[p.weekday] + ' of each month' : 'The ' + ord(p.date) + ' of each month' + (p.date >= 29 ? ' (the last day in shorter months)' : '');
      case 'cycle': return p.on + ' days on, ' + p.off + ' off';
      case 'asNeeded': return 'As needed';
    }
    return 'Every day';
  }
  function scheduleSentence(item) {
    var s = schedOf(item), p = s.pattern;
    if (p.kind === 'asNeeded') return 'As needed';
    return patternText(p) + (p.kind === 'cycle' ? ', ' : ' ') + timesTextWithAmounts(item, s);
  }
  // The start/end line that goes with the sentence ("Starts tomorrow", "For 10 days, until Fri, Nov 21").
  function rangeText(item, today) {
    var s = schedOf(item), parts = [];
    if (s.start != null && s.start > today) parts.push('Starts ' + (s.start === today + 1 ? 'tomorrow' : fmtDate(s.start)));
    if (s.end != null) parts.push((s.start != null ? 'For ' + (s.end - s.start + 1) + ' days, until ' : 'Until ') + fmtDate(s.end));
    return parts.join(' · ');
  }
  /* Migration helper: a v5.4 item -> a v5.5 item with an explicit schedule (used by presets and tests). */
  function migrateItem(item) {
    var o = JSON.parse(JSON.stringify(item)); o.schedule = schedOf(item); o.type = o.type || 'med';
    delete o.kind; delete o.times; delete o.weekday; delete o.steps; delete o.startDay; delete o.endDay; delete o.color; delete o.shape;
    return o;
  }

  /* ---------- check-in credit ---------- */
  var FULL = { swallowed: 1, took: 1, held: 1, rest: 1, journal: 1 };
  var HONEST = { didnt: 1, unsure: 1 };
  var WINDOW = { before: 60, after: 90 };
  function inWindow(stack, atMins) { return atMins >= stack.mins - WINDOW.before && atMins <= stack.mins + WINDOW.after; }

  /* ctx.mode: 'live' (logged as it happens), 'later' (same day, after the fact), 'backfill' (previous day, < 48h), 'old' (> 48h)
   * Two-step and one-tap earn exactly the same. Late live logs earn the full fragment, without the on-time bonus. */
  function creditFor(stack, answer, ctx) {
    ctx = ctx || {};
    var mode = ctx.mode || 'live';
    var r = { charge: 0, stars: 0, xp: 0, onTimeStars: 0, checkin: true, bond: 1, quiet: false };
    if (mode === 'old') return { charge: 0, stars: 0, xp: 0, onTimeStars: 0, checkin: false, bond: 0, quiet: true };
    if (FULL[answer]) {
      r.charge = stack.value; r.stars = stack.stars; r.xp = stack.xp;
      if (mode === 'live' && answer !== 'held' && (stack.kind !== 'dose' || inWindow(stack, ctx.atMins))) r.onTimeStars = stack.onTime; // rest/journal days: any time that day counts as on time
      if (answer === 'held') r.quiet = true;
    } else if (HONEST[answer]) {
      r.xp = Math.round(stack.xp * 0.3);
    } else {
      return { charge: 0, stars: 0, xp: 0, onTimeStars: 0, checkin: false, bond: 0, quiet: true };
    }
    if (mode === 'backfill') {
      r.charge = Math.round(r.charge * 0.5); r.stars = Math.round(r.stars * 0.5); r.xp = Math.round(r.xp * 0.5); r.onTimeStars = 0;
    }
    return r;
  }

  /* ---------- v5.6 refill reminders (A7) ----------
   * When supply is tracked, the reminder starts `lead` days before it runs out (default 7, editable on Review) and shows
   * every day until the person answers: "Refill's in" (supply goes up), "Not needed" (supply tracking stops until they turn
   * it back on) or "Something else" (asks again in 3 days). Pure: the caller passes days left (Store.daysLeft). */
  var REFILL = { lead: 7, reask: 3, maxLead: 30 };
  function refillLead(item) { var r = item && item.refill; var n = r && r.lead != null ? +r.lead : REFILL.lead; return Math.max(1, Math.min(REFILL.maxLead, Math.round(n) || REFILL.lead)); }
  function refillDue(item, day, daysLeft) {
    if (!item || item.supply == null || daysLeft == null) return false;
    if (isAsNeeded(item) || isEnded(item, day) || isPaused(item, day)) return false;
    var r = item.refill || {};
    if (r.askAgain != null && day < r.askAgain) return false;
    if (r.cleared) return false; // answered "Refill's in" this cycle: the card stays away until supply runs down again
    return daysLeft <= refillLead(item);
  }

  /* ---------- PRN / as-needed journal: once per day, flat, same for "used" and "didn't need any" ---------- */
  var JOURNAL = { stars: 10, xp: 10 };
  function journalReward(alreadyPaid) { return alreadyPaid ? { stars: 0, xp: 0, paid: false } : { stars: JOURNAL.stars, xp: JOURNAL.xp, paid: true }; }

  /* ---------- Power Bank: every 100 Charge pops one power-up; remainder carries over ---------- */
  var PU_ORDER = ['magnet', 'lens', 'double', 'lucky'];
  var PU_CAP = 10;
  function powerBank(bank, add) { var t = bank + add; return { bank: t % 100, drops: Math.floor(t / 100) }; }
  function nextPowerUp(totalDropped) { return PU_ORDER[totalDropped % PU_ORDER.length]; }

  /* ---------- levels ---------- */
  function xpForNext(level) { return 150 + 50 * level; }
  function levelInfo(xp) {
    var l = 1, rem = Math.max(0, xp);
    while (rem >= xpForNext(l)) { rem -= xpForNext(l); l++; }
    return { level: l, into: rem, need: xpForNext(l) };
  }

  /* ---------- catalog: 4 sets x 9 Finds (theme renders each id) ---------- */
  var RARITIES = ['common', 'uncommon', 'rare', 'epic'];
  function rarityOfIndex(i) { return i <= 4 ? 'common' : i <= 7 ? 'uncommon' : i === 8 ? 'rare' : 'epic'; }
  var FINDS = [];
  for (var si = 1; si <= 4; si++) for (var fi = 1; fi <= 9; fi++) FINDS.push({ id: 's' + si + '-' + fi, set: si, idx: fi, rarity: rarityOfIndex(fi) });
  var FIND_BY_ID = {}; FINDS.forEach(function (f) { FIND_BY_ID[f.id] = f; });
  function rarityRank(r) { return RARITIES.indexOf(r); }

  /* ---------- chests: disclosed odds, pity every 10, no near-miss ---------- */
  var CHESTS = {
    basic:  { label: 'Basic',  finds: 1, stars: [20, 40],  weights: { common: 70, uncommon: 25, rare: 4, epic: 1 }, powerUp: 0 },
    bronze: { label: 'Bronze', finds: 2, stars: [40, 80],  weights: { common: 60, uncommon: 32, rare: 7, epic: 1 }, powerUp: 0 },
    silver: { label: 'Silver', finds: 3, stars: [60, 100], weights: { common: 45, uncommon: 40, rare: 12, epic: 3 }, powerUp: 0.3 },
    gold:   { label: 'Gold',   finds: 3, stars: [80, 140], weights: { common: 35, uncommon: 40, rare: 20, epic: 5 }, powerUp: 1, guaranteeRare: true },
    // v5.3: long Campfire milestones only (day 100+). Same disclosed-odds rules; never sold.
    epic:      { label: 'Epic',      finds: 4, stars: [120, 200], weights: { common: 25, uncommon: 40, rare: 25, epic: 10 }, powerUp: 1, guaranteeRare: true },
    legendary: { label: 'Legendary', finds: 5, stars: [200, 320], weights: { common: 15, uncommon: 35, rare: 30, epic: 20 }, powerUp: 1, guaranteeRare: true }
  };
  var PITY_EVERY = 10;
  function rollRarity(r, w) {
    var tot = 0, k; for (k in w) tot += w[k];
    var x = r() * tot;
    for (var i = 0; i < RARITIES.length; i++) { k = RARITIES[i]; x -= (w[k] || 0); if (x < 0) return k; }
    return 'common';
  }
  function pickFind(r, rarity, owned, preferNew) {
    var pool = FINDS.filter(function (f) { return f.rarity === rarity; });
    if (preferNew) { var fresh = pool.filter(function (f) { return !(owned && owned[f.id]); }); if (fresh.length && r() < 0.7) pool = fresh; }
    return pool[Math.floor(r() * pool.length)];
  }
  /* ctx: {pity, owned, rng} -> {type, finds:[{id,rarity,dup}], stars, powerUp, pity, pityTriggered} */
  function rollChest(type, ctx) {
    ctx = ctx || {};
    var spec = CHESTS[type] || CHESTS.basic, r = ctx.rng || rng(String(Date.now()));
    var owned = Object.assign({}, ctx.owned || {}), finds = [], pity = ctx.pity || 0;
    var forceRare = spec.guaranteeRare || pity >= PITY_EVERY - 1, pityTriggered = !spec.guaranteeRare && pity >= PITY_EVERY - 1;
    for (var i = 0; i < spec.finds; i++) {
      var rar = rollRarity(r, spec.weights);
      if (forceRare && i === spec.finds - 1 && !finds.some(function (f) { return rarityRank(f.rarity) >= 2; }) && rarityRank(rar) < 2) rar = r() < 0.8 ? 'rare' : 'epic';
      var f = pickFind(r, rar, owned, true);
      finds.push({ id: f.id, rarity: f.rarity, dup: !!owned[f.id] });
      owned[f.id] = (owned[f.id] || 0) + 1;
    }
    var stars = spec.stars[0] + Math.round(r() * (spec.stars[1] - spec.stars[0]));
    var powerUp = spec.powerUp >= 1 || r() < spec.powerUp;
    var gotRare = finds.some(function (f) { return rarityRank(f.rarity) >= 2; });
    return { type: type, finds: finds, stars: stars, powerUp: powerUp, pity: gotRare ? 0 : pity + 1, pityTriggered: pityTriggered && gotRare };
  }

  /* ---------- Trip haul: free base, scales smoothly with yesterday's Charge ---------- */
  function tripHaul(yCharge, ctx) {
    ctx = ctx || {};
    var c = Math.max(0, Math.min(100, yCharge || 0)) / 100, r = ctx.rng || rng('trip');
    var silver = r() < 0.10 + 0.30 * c;
    var spec = silver ? CHESTS.silver.weights : CHESTS.basic.weights;
    var nFinds = 1 + Math.round(2 * c) + (ctx.boost ? 1 : 0);
    var owned = Object.assign({}, ctx.owned || {}), finds = [];
    for (var i = 0; i < nFinds; i++) { var f = pickFind(r, rollRarity(r, spec), owned, true); finds.push({ id: f.id, rarity: f.rarity, dup: !!owned[f.id] }); owned[f.id] = 1; }
    finds.sort(function (a, b) { return rarityRank(b.rarity) - rarityRank(a.rarity); });
    var stars = 20 + Math.round(r() * 20) + Math.round(80 * c);
    var powerUp = r() < 0.10 + 0.20 * c;
    return { finds: finds, stars: stars, xp: 20, powerUp: powerUp, silver: silver };
  }

  /* ---------- welcome-back: Bronze chest + 50 Stars, once per 14 days, never grows with the gap ---------- */
  var WELCOME_BACK = { chest: 'bronze', stars: 50 };
  function welcomeBackEligible(lastActiveDay, today, lastWBDay) {
    if (lastActiveDay == null) return false;
    var gap = today - lastActiveDay - 1; // full days with no check-in
    if (gap < 3) return false;
    if (lastWBDay != null && today - lastWBDay < 14) return false;
    return true;
  }
  // value equivalents from game-design §11.2 (estimates): 1 XP = 1 Star, Find = 25, power-up = 60
  var EQ = { find: 25, powerUp: 60, engagedDay: 880 };
  function chestExpectedValue(type) { var s = CHESTS[type]; return s.finds * EQ.find + (s.stars[0] + s.stars[1]) / 2 + s.powerUp * EQ.powerUp; }
  function welcomeBackValue() { return chestExpectedValue(WELCOME_BACK.chest) + WELCOME_BACK.stars; }

  /* ---------- Run rewards: one loot-bearing Run per day; Grand Draw ticket per completed Run, never doses ---------- */
  // v5.4 chest ladder: a 3-star Run pays Silver (Gold is kept for the weekly headline and milestones, so it still means something).
  function runChestFor(stars) { return stars >= 2 ? 'silver' : stars === 1 ? 'bronze' : 'basic'; }
  function runReward(result, ctx) {
    ctx = ctx || {};
    if (ctx.practice) return { stars: 0, xp: 0, chest: null, ticket: 0 };
    var s = result.stars || 0;
    return { stars: 30 + 10 * s, xp: 50 + 10 * s, chest: runChestFor(s), ticket: ctx.alreadyPlayed ? 0 : 1 };
  }

  /* ---------- quests: 3 a day (free-play, check-in answer, collection). Same value any day. ---------- */
  var QUEST_REWARD = { stars: 15, xp: 20 };
  var COLLECT_Q = [
    { id: 'chest', text: 'Open a chest' },
    { id: 'place', text: 'Place a piece at your {home}' },
    { id: 'album', text: 'Look at a {find} in your {album}' }
  ];
  // v5.5: these are "Today's goals" in the UI (the word "quest" now means only the companion's overnight Quest).
  function questsFor(dayNum) {
    // v5.5 round 2: no goal repeats a card already on Today (the check-in hero, the games card). Same value every day.
    var c = COLLECT_Q[dayNum % COLLECT_Q.length], c2 = COLLECT_Q[(dayNum + 1) % COLLECT_Q.length];
    return [
      { id: 'two', text: 'Play 2 different games today', goal: 'two', done: false, reward: QUEST_REWARD },
      { id: c.id, text: c.text, goal: c.id, done: false, reward: QUEST_REWARD },
      { id: c2.id, text: c2.text, goal: c2.id, done: false, reward: QUEST_REWARD }
    ];
  }
  // Swapped quest is always of equal value (Tier 2/3 barrier): the barrier itself is never rewarded.
  function swapQuest(q) { return { id: 'swap-' + q.id, text: 'Look at a {find} in your {album}', goal: 'album', done: false, reward: q.reward, swapped: true }; }

  /* ---------- barrier tiers ---------- */
  var BARRIERS = [
    { id: 'busy', label: 'Forgot or got busy', tier: 1 },
    { id: 'away', label: 'Away from home', tier: 1 },
    { id: 'routine', label: 'My routine changed', tier: 1 },
    { id: 'ranout', label: 'Ran out', tier: 2 },
    { id: 'stock', label: 'Pharmacy was out of stock', tier: 2 },
    { id: 'cost', label: 'Cost or insurance', tier: 2 },
    { id: 'side', label: 'Side effects', tier: 3 },
    { id: 'stop', label: 'Decided to stop', tier: 3 },
    { id: 'other', label: 'Something else', tier: 1 },
    { id: 'skip', label: 'Rather not say', tier: 0 }
  ];
  function barrierTier(id) { for (var i = 0; i < BARRIERS.length; i++) if (BARRIERS[i].id === id) return BARRIERS[i].tier; return 0; }

  /* ---------- status (one function, every surface) ---------- */
  function doseStatus(entry, stack, clockMins) {
    var st = entry && entry.state;
    if (stack && stack.kind === 'rest') return st ? { label: 'All set ' + fmtTime(entry.at), tone: 'done', icon: '✓' } : { label: 'Rest day', tone: 'neutral', icon: '☾' };
    if ((st === 'swallowed' || st === 'took') && entry.loggedLater) return { label: entry.timeUnsure || entry.at == null ? 'Taken, time not sure · logged ' + fmtTime(entry.loggedAt) : 'Taken around ' + fmtTime(entry.at) + ' · logged at ' + fmtTime(entry.loggedAt), tone: 'done', icon: '✓' };
    if (st === 'swallowed' || st === 'took') return { label: 'Taken ' + fmtTime(entry.at) + (entry.later ? ' · logged later' : ''), tone: 'done', icon: '✓' };
    if (st === 'journal') return { label: 'Checked in ' + fmtTime(entry.at), tone: 'done', icon: '✓' };
    if (st === 'out') return { label: 'Out since ' + fmtTime(entry.outAt), tone: 'attn', icon: '✋' };
    if (st === 'didnt') return { label: 'Not taken', tone: 'neutral', icon: '–' };
    if (st === 'unsure') return { label: 'Not sure', tone: 'neutral', icon: '?' };
    if (st === 'held') return { label: 'Held by care team', tone: 'neutral', icon: '⏸' };
    if (!stack) return { label: 'Not logged', tone: 'neutral', icon: '○' };
    if (clockMins < stack.mins - WINDOW.before) return { label: fmtTime(stack.mins), tone: 'upcoming', icon: '◷' };
    if (clockMins <= stack.mins + WINDOW.after) return { label: 'Due now', tone: 'attn', icon: '●' };
    return { label: 'Not logged', tone: 'neutral', icon: '○' };
  }
  /* recordLabel(entry, stack, opts): the one state label for every record surface (Today chips, Did I take it?,
   * the calendar day sheet, item detail, lock screen). Habit-only check-ins read "Done", never "Taken".
   * opts: { clock, habit, past }. A past day with nothing logged is "Not logged" (v5.6), in neutral grey. Never red, never "missed". */
  function recordLabel(entry, stack, opts) {
    opts = opts || {};
    var st = entry && entry.state, habit = !!opts.habit;
    if (stack && stack.kind === 'rest') return st && st !== 'none' ? { label: 'All set ' + fmtTime(entry.at), tone: 'done', icon: '✓' } : { label: 'Nothing was scheduled', tone: 'neutral', icon: '☾' };
    if (!st || st === 'none') {
      if (opts.past || !stack) return { label: 'Not logged', tone: 'neutral', icon: '○' };
      return doseStatus(null, stack, opts.clock == null ? 0 : opts.clock);
    }
    if (st === 'unsure' && entry.fromOut) return { label: 'Out ' + fmtTime(entry.outAt) + ', not confirmed', tone: 'neutral', icon: '?' };
    if (st === 'didnt') return { label: habit ? 'Not today' : 'Not taken', tone: 'neutral', icon: '–' };
    var ds = doseStatus(entry, stack, opts.clock == null ? 1439 : opts.clock);
    if (habit && (st === 'swallowed' || st === 'took')) ds = { label: ds.label.replace(/^Taken/, 'Done'), tone: ds.tone, icon: ds.icon };
    return ds;
  }

  /* ---------- phase of a stack right now: upcoming | due | out | past | answered ---------- */
  function stackPhase(stack, entry, clockMins) {
    if (entry && entry.state && entry.state !== 'out') return 'answered';
    if (stack.kind !== 'dose') return 'due';
    if (entry && entry.state === 'out') return 'out';
    if (clockMins > stack.mins + WINDOW.after) return 'past';
    if (clockMins < stack.mins - WINDOW.before) return 'upcoming';
    return 'due';
  }

  /* ---------- rollover: OUT unconfirmed becomes Unsure in the record (never Taken) ---------- */
  function finalizeEntries(plan, entries) {
    var out = {};
    plan.stacks.forEach(function (s) {
      var e = entries[s.id];
      if (!e) out[s.id] = { state: 'none' };
      else if (e.state === 'out') out[s.id] = Object.assign({}, e, { state: 'unsure', fromOut: true });
      else out[s.id] = Object.assign({}, e);
    });
    return out;
  }
  function dayCharge(plan, credits) { var c = 0; plan.stacks.forEach(function (s) { if (credits[s.id]) c += credits[s.id].charge || 0; }); return Math.min(100, c); }

  /* ---------- v5.3 Campfire: a daily-visit count (Expedition "Campfire", Grove "Garden days"). Same engine for both. ----------
   * A day is lit by ONE play action before the 3:00 rollover: finishing any daily game, or feeding the companion.
   * Doses never light it, never break it and are never required (a weekly-injection day lights the same way).
   * Never touches Grand Draw tickets, Spark/Charge, the Power Bank or the health record.
   * Kid profiles: no Campfire (counts, shields and milestone chests are off); days played still grow the companion. */
  function gameDayFor(calendarDay, minsOfDay) { return minsOfDay < ROLLOVER ? calendarDay - 1 : calendarDay; }
  var CAMP = {
    milestones: [3, 7, 14, 30, 50, 75, 100, 150, 200, 250, 365, 500, 730, 1000], // then every 365 days after 1000 (1365, 1730, ...)
    repeatAfter: 1000, repeatEvery: 365,
    shieldEvery: 7, shieldMax: 2,
    relightDays: 2, // 48h after the break: through the end of the second game day after the unplayed one
    restMin: 1, restMax: 14, restCooldown: 30
  };
  function isMilestone(n) {
    if (CAMP.milestones.indexOf(n) >= 0) return true;
    return n > CAMP.repeatAfter && (n - CAMP.repeatAfter) % CAMP.repeatEvery === 0;
  }
  // Chests scale Bronze -> Silver -> Gold -> Epic -> Legendary. Days 365, 730 and 1000 also give a one-of-a-kind cosmetic
  // (its name is a theme word: themes.js camp.cosmetics[id]).
  var MILESTONE_COSMETIC = { 365: 'm365', 730: 'm730', 1000: 'm1000' };
  function milestoneReward(n) {
    var chest = n >= 365 ? 'legendary' : n >= 100 ? 'epic' : n >= 30 ? 'gold' : n >= 7 ? 'silver' : 'bronze';
    return { n: n, chest: chest, cosmetic: MILESTONE_COSMETIC[n] || null };
  }
  function milestonesUpTo(maxN) { var out = []; for (var n = 1; n <= maxN; n++) if (isMilestone(n)) out.push(n); return out; }
  // total days played -> stage index 0..10 (names live in themes.js camp.stages). Never consecutive, never reverses.
  var GROWTH = [0, 7, 21, 45, 75, 110, 160, 230, 320, 450, 600];
  function growthStage(totalDays) { var s = 0; for (var i = 0; i < GROWTH.length; i++) if ((totalDays || 0) >= GROWTH[i]) s = i; return s; }
  function nextGrowth(totalDays) { var s = growthStage(totalDays); return s < GROWTH.length - 1 ? { stage: s + 1, at: GROWTH[s + 1], daysLeft: GROWTH[s + 1] - (totalDays || 0) } : null; }
  function campBlank() { return { count: 0, best: 0, total: 0, shields: 0, lastLit: null, paid: {}, rest: null, restStarts: [], broken: null, shieldDays: [], relit: [] }; }
  function campClone(c) { var o = JSON.parse(JSON.stringify(c || campBlank())), b = campBlank(); for (var k in b) if (o[k] == null && b[k] != null) o[k] = b[k]; return o; }
  function campResting(c, day) { return !!(c && c.rest && day >= c.rest.from && day <= c.rest.until); }
  function campLitOn(c, day) { return !!(c && c.lastLit === day); }
  function nextMilestone(c) { for (var n = c.count + 1; n <= c.count + CAMP.repeatEvery + CAMP.repeatAfter; n++) if (isMilestone(n) && !c.paid[n]) return milestoneReward(n); return null; }
  function payMilestones(c, from, to) {
    var out = [];
    for (var n = from + 1; n <= to; n++) if (isMilestone(n) && !c.paid[n]) { c.paid[n] = true; out.push(milestoneReward(n)); }
    return out;
  }
  /* campLight(camp, day, ctx) -> { camp, fx }. Idempotent per game day: the second play action of a day changes nothing. */
  function campLight(camp, day, ctx) {
    ctx = ctx || {};
    var c = campClone(camp), fx = { lit: false, already: false, count: c.count, milestones: [], shieldEarned: false, stageUp: null, kid: !!ctx.kid };
    if (c.lastLit === day) { fx.already = true; return { camp: c, fx: fx }; }
    var stageBefore = growthStage(c.total);
    c.total += 1; c.lastLit = day;
    var stageAfter = growthStage(c.total);
    if (stageAfter > stageBefore) fx.stageUp = { from: stageBefore, to: stageAfter };
    fx.lit = true;
    if (ctx.kid) { fx.count = 0; return { camp: c, fx: fx }; }
    var before = c.count;
    c.count += 1; if (c.count > c.best) { c.best = c.count; fx.bestUp = true; }
    if (c.total % CAMP.shieldEvery === 0 && c.shields < CAMP.shieldMax) { c.shields += 1; fx.shieldEarned = true; }
    fx.milestones = payMilestones(c, before, c.count);
    fx.count = c.count;
    return { camp: c, fx: fx };
  }
  /* Relight: offered after a break that no shield could cover, for 48h. Needs one of today's daily games + one extra practice board. */
  function relightOffer(c, day) {
    if (!c || !c.broken || c.broken.prev <= 0) return null;
    if (day - c.broken.day > CAMP.relightDays || day <= c.broken.day) return null;
    return { prev: c.broken.prev, until: c.broken.day + CAMP.relightDays, brokenDay: c.broken.day };
  }
  function campRelight(camp, day, ctx) {
    ctx = ctx || {};
    var c = campClone(camp), off = relightOffer(c, day);
    if (ctx.kid || !off) return { camp: c, fx: { relit: false, reason: 'no-offer' } };
    if (!(ctx.runDone && ctx.practiceDone)) return { camp: c, fx: { relit: false, reason: 'steps' } };
    if (c.lastLit !== day) return { camp: c, fx: { relit: false, reason: 'not-lit' } };
    var before = c.count;
    c.count = off.prev + c.count;
    if (c.count > c.best) c.best = c.count;
    c.broken = null; c.relit.push(day);
    return { camp: c, fx: { relit: true, count: c.count, milestones: payMilestones(c, before, c.count) } };
  }
  /* campEndDay: run at the 3:00 rollover for the game day that just ended. Never looks at doses. */
  function campEndDay(camp, day, ctx) {
    ctx = ctx || {};
    var c = campClone(camp), fx = { kept: false, rested: false, shieldUsed: false, reset: false, prev: c.count };
    if (ctx.kid) return { camp: c, fx: fx };
    if (c.broken && day >= c.broken.day + CAMP.relightDays) c.broken = null; // the Relight window closes quietly
    if (c.rest && day > c.rest.until) c.rest = null;
    if (c.lastLit === day) { fx.kept = true; return { camp: c, fx: fx }; }
    if (campResting(c, day)) { fx.rested = true; return { camp: c, fx: fx }; }
    if (c.count === 0) return { camp: c, fx: fx };
    if (c.shields > 0) { c.shields -= 1; c.shieldDays.push(day); fx.shieldUsed = true; return { camp: c, fx: fx }; }
    c.broken = { day: day, prev: c.count }; c.count = 0; fx.reset = true;
    return { camp: c, fx: fx };
  }
  /* Rest mode: "Taking a break" pauses the count for 1-14 days. Pausing is not a break. Once per 30 days. */
  function restAvailable(c, day) {
    var last = (c.restStarts || []).length ? c.restStarts[c.restStarts.length - 1] : null;
    if (last == null || day - last >= CAMP.restCooldown) return { ok: true };
    return { ok: false, nextDay: last + CAMP.restCooldown };
  }
  function campStartRest(camp, day, days, ctx) {
    ctx = ctx || {};
    var c = campClone(camp);
    days = Math.round(+days || 0);
    if (ctx.kid || days < CAMP.restMin || days > CAMP.restMax) return { camp: c, ok: false, reason: 'range' };
    if (campResting(c, day)) return { camp: c, ok: false, reason: 'already' };
    var av = restAvailable(c, day); if (!av.ok) return { camp: c, ok: false, reason: 'cooldown', nextDay: av.nextDay };
    c.rest = { from: day, until: day + days - 1 }; c.restStarts.push(day);
    return { camp: c, ok: true };
  }
  function campEndRest(camp, day) {
    var c = campClone(camp); if (!c.rest) return { camp: c, ok: false };
    // Ending today: today counts as a normal day again (play to keep the count going); the days before stay paused.
    c.rest.until = day - 1; if (c.rest.until < c.rest.from) c.rest = null;
    return { camp: c, ok: true };
  }

  /* ---------- v5.5 arcade: three daily games share one reward frame (games doc §6.1) ----------
   * Each game pays once a day (its first finished daily board). The first paying game of the day brings the chest, the one
   * Grand Draw ticket and lights the Campfire; games 2-3 pay a small bonus. Practice and replays pay nothing. Dose-blind:
   * nothing here reads doses, Spark or the record. Stars/XP are the same at every difficulty; 2+ stars on Normal/Hard adds one Find. */
  var ARCADE = { games: ['trail', 'word', 'memory'], maxPaid: 3, first: { stars: [30, 10], xp: [50, 10], compXp: [30, 10] }, bonus: { stars: [10, 5], xp: [15, 5], compXp: [10, 5] } };
  function arcadeReward(game, result, ctx) {
    ctx = ctx || {}; result = result || {};
    var zero = { stars: 0, xp: 0, compXp: 0, chest: null, ticket: 0, diffFind: null, lights: false, paid: false, first: false };
    var practice = ctx.practice || result.mode === 'practice' || result.difficulty === 'practice';
    if (practice) return zero;
    var paidGames = ctx.paidGames || [];
    var out = Object.assign({}, zero, { lights: true });
    if (paidGames.indexOf(game) >= 0 || paidGames.length >= ARCADE.maxPaid) return out;
    var s = Math.max(0, Math.min(3, result.stars || 0)), first = paidGames.length === 0, k = first ? ARCADE.first : ARCADE.bonus;
    out.paid = true; out.first = first;
    out.stars = k.stars[0] + k.stars[1] * s; out.xp = k.xp[0] + k.xp[1] * s; out.compXp = k.compXp[0] + k.compXp[1] * s;
    if (first) { out.chest = ctx.isKid ? null : runChestFor(s); out.ticket = 1; }
    var d = result.difficulty === 'trek' ? 'normal' : result.difficulty === 'summit' ? 'hard' : result.difficulty;
    if (s >= 2 && d === 'normal') out.diffFind = 'common';
    if (s >= 2 && d === 'hard') out.diffFind = 'uncommon';
    return out;
  }

  /* ---------- real dates (no hard-coded "Sun, Nov 29") ---------- */
  var DRAW_ANCHOR = 21; // Sun, Nov 29 2026; draws every 4th Sunday from here
  function drawNightDay(fromDay) { var d = DRAW_ANCHOR; if (fromDay > d) d += Math.ceil((fromDay - d) / 28) * 28; return d; }
  function boardNo(dayNum) { return dayOfDate(2026, 10, 8) + dayNum - dayOfDate(2026, 0, 1) + 1; } // days since 2026-01-01, same as the Run's puzzle number

  /* ---------- banned copy ---------- */
  var BANNED = ['missed', 'late', 'adherence', 'PRN', 'failed', 'lost', 'hurry', 'last chance', 'take another', 'you can take', 'safe to take', 'overdue', 'penalty', 'keep your streak', 'save your streak', 'don\'t lose', 'broke'];
  // v5.5 leaderboard copy adds these (games doc §8.4). Scoped to board/game surfaces: Book prose may say "behind the ridge".
  var BOARD_BANNED = ['last place', 'bottom', 'behind', 'beat you', 'lost to', 'slowest', 'only'];
  // v5.3: 'streak' is allowed in Campfire copy. Copy must never tie the Campfire to a dose.
  function bannedHits(text) {
    var hits = [];
    BANNED.forEach(function (w) {
      var re = w === 'PRN' ? /\bPRN\b/ : new RegExp('\\b' + w.replace(/ /g, '\\s+').replace(/'/g, "['\u2019]") + '\\b', 'i');
      var m = String(text).match(re); if (m) hits.push(w);
    });
    return hits;
  }

  var Engine = {
    dateOf: dateOf, weekday: weekday, weekIndex: weekIndex, stackPhase: stackPhase, fmtDate: fmtDate, fmtDateLong: fmtDateLong, fmtTime: fmtTime, toMins: toMins, WD_LONG: WD_LONG,
    hash: hash, rng: rng, allocate: allocate,
    SLOTS: SLOTS, slotFor: slotFor, isScheduledOn: isScheduledOn, occursOn: occursOn, schedOf: schedOf, isAsNeeded: isAsNeeded, itemType: itemType, expandTimes: expandTimes, bossEligible: bossEligible, gameMins: gameMins, hhmm: hhmm,
    dayOfDate: dayOfDate, dayOfJs: dayOfJs, daysInMonth: daysInMonth, isoDate: isoDate, gameNow: gameNow, timesOn: timesOn, isEnded: isEnded, CLUSTER: CLUSTER,
    bossDayInWeek: bossDayInWeek, nextBossDay: nextBossDay, nextOccurrenceDay: nextOccurrenceDay, nextOccurrences: nextOccurrences, relDay: relDay, scheduleSentence: scheduleSentence, rangeText: rangeText, migrateItem: migrateItem, ord: ord, WD: WD, MON: MON,
    recordLabel: recordLabel, amountFor: amountFor, amountShown: amountShown, amountUnits: amountUnits, unitsOn: unitsOn, doseText: doseText, migrateTimes: migrateTimes, migrateItemTimes: migrateItemTimes, REFILL: REFILL, refillLead: refillLead, refillDue: refillDue, ARCADE: ARCADE, arcadeReward: arcadeReward, drawNightDay: drawNightDay, boardNo: boardNo, isPaused: isPaused, doseLabel: doseLabel, taperStepChanged: taperStepChanged,
    compilePlan: compilePlan, planTotal: planTotal, inWindow: inWindow, WINDOW: WINDOW,
    creditFor: creditFor, journalReward: journalReward, JOURNAL: JOURNAL,
    powerBank: powerBank, nextPowerUp: nextPowerUp, PU_ORDER: PU_ORDER, PU_CAP: PU_CAP,
    xpForNext: xpForNext, levelInfo: levelInfo,
    FINDS: FINDS, FIND_BY_ID: FIND_BY_ID, RARITIES: RARITIES, rarityRank: rarityRank,
    CHESTS: CHESTS, PITY_EVERY: PITY_EVERY, rollChest: rollChest, tripHaul: tripHaul,
    WELCOME_BACK: WELCOME_BACK, welcomeBackEligible: welcomeBackEligible, welcomeBackValue: welcomeBackValue, chestExpectedValue: chestExpectedValue, EQ: EQ,
    runReward: runReward, runChestFor: runChestFor,
    questsFor: questsFor, swapQuest: swapQuest, QUEST_REWARD: QUEST_REWARD,
    BARRIERS: BARRIERS, barrierTier: barrierTier,
    doseStatus: doseStatus, finalizeEntries: finalizeEntries, dayCharge: dayCharge,
    BANNED: BANNED, BOARD_BANNED: BOARD_BANNED, bannedHits: bannedHits,
    ROLLOVER: ROLLOVER, gameDayFor: gameDayFor, CAMP: CAMP, GROWTH: GROWTH, isMilestone: isMilestone, milestonesUpTo: milestonesUpTo, MILESTONE_COSMETIC: MILESTONE_COSMETIC, growthStage: growthStage, nextGrowth: nextGrowth, milestoneReward: milestoneReward,
    campBlank: campBlank, campLight: campLight, campEndDay: campEndDay, campRelight: campRelight, relightOffer: relightOffer, campResting: campResting, campLitOn: campLitOn,
    nextMilestone: nextMilestone, restAvailable: restAvailable, campStartRest: campStartRest, campEndRest: campEndRest
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
