/* Kindling v5.5 — screens-meds.js : "My list". Plain, theme-neutral, fast. No celebrations and no game numbers here.
 * Calendar | Items. The calendar is facts only: each day's ring fills with what was taken or done; any other answer is a
 * grey dot; a day with nothing logged looks exactly like a day with nothing scheduled. No red, no %, no "missed". */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, esc = U.esc;
  function S() { return St.S; }
  var ui = { view: 'calendar', filter: null, month: null };
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ---------- shared bits ---------- */
  function itemName(m) { return m ? m.name + (m.strength ? ' ' + m.strength : '') : 'Removed item'; }
  function isHabit(m) { return m && E.itemType(m) === 'habit'; }
  function stackHabitOnly(st) { return st.doses && st.doses.length && st.doses.every(function (d) { return isHabit(St.medById(d.medId)); }); }
  function todayLabelFor(m) {
    // The chip shows the dose that matters now: the first one still open today, else the last one answered.
    var t = S().today, mine = t.plan.stacks.filter(function (st) { return st.doses.some(function (d) { return d.medId === m.id; }); });
    if (!mine.length) return null;
    var open = mine.filter(function (st) { var e = t.entries[st.id]; return !e || e.state === 'out'; })[0], st = open || mine[mine.length - 1];
    return E.recordLabel(t.entries[st.id], st, { clock: S().clock, habit: isHabit(m) });
  }
  function itemRow(m) {
    var chip = '', an = E.isAsNeeded(m);
    if (an) { var l = St.lastPrn(m.id); chip = l ? '<span class="status neutral">Last ' + (l.day === S().day ? '' : E.fmtDate(l.day) + ' ') + E.fmtTime(l.at) + '</span>' : ''; }
    else if (m.paused && E.isPaused(m, S().day + 1)) chip = '<span class="status neutral">Paused</span>';
    else { var ds = todayLabelFor(m); if (ds) chip = '<span class="status ' + ds.tone + '">' + ds.icon + ' ' + esc(ds.label) + '</span>'; }
    var sub = E.scheduleSentence(m), rng = E.rangeText(m, S().day);
    return '<button class="med-row" data-act="go" data-to="medDetail" data-id="' + m.id + '">' + A.itemIcon(m) + '<span class="mr-main"><span class="mr-name" style="display:block">' + esc(itemName(m)) + (m.highRisk ? ' <span class="status neutral" style="vertical-align:1px">Extra care</span>' : '') + '</span><span class="mr-sub">' + esc(sub) + (rng ? ' · ' + esc(rng) : '') + '</span></span>' + chip + A.icon('chev') + '</button>';
  }

  /* ---------- the record, read from day snapshots (never recompiled from the current schedule) ---------- */
  function dayRec(day) {
    var s = S();
    if (s.today && day === s.day) return { day: day, stacks: s.today.plan.stacks, entries: s.today.entries, prn: s.today.prn, rest: !!s.today.plan.rest, today: true };
    for (var i = s.history.length - 1; i >= 0; i--) { var h = s.history[i]; if (h.dayNum === day) return { day: day, stacks: h.plan.stacks, entries: h.entries, prn: h.prn || [], rest: !!h.plan.rest || (h.plan.stacks.length === 1 && h.plan.stacks[0].kind === 'rest') }; }
    return null;
  }
  var TAKEN = { swallowed: 1, took: 1 };
  function daySum(rec, itemId) {
    var o = { due: 0, done: 0, other: 0, prn: 0 };
    if (!rec) return o;
    rec.stacks.forEach(function (st) {
      if (st.kind !== 'dose') return;
      if (itemId && !st.doses.some(function (d) { return d.medId === itemId; })) return;
      o.due++;
      var e = rec.entries[st.id], state = e && e.state;
      if (TAKEN[state]) o.done++; else if (state && state !== 'none' && state !== 'out') o.other++;
    });
    (rec.prn || []).forEach(function (p) { if (p.medId && (!itemId || p.medId === itemId)) o.prn++; });
    o.logged = o.done + o.other + o.prn > 0;
    return o;
  }
  function ringSvg(frac, full) {
    var r = 15, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
    return '<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="' + r + '" class="ring-track"/>' + (f > 0 ? '<circle cx="18" cy="18" r="' + r + '" class="ring-fill" stroke-dasharray="' + (c * f).toFixed(2) + ' ' + c.toFixed(2) + '" transform="rotate(-90 18 18)"/>' : '') + '</svg>';
  }
  function dayCell(day, itemId, small) {
    var s = S(), d = E.dateOf(day), rec = day <= s.day ? dayRec(day) : null, sm = daySum(rec, itemId), future = day > s.day;
    var spoken = E.WD_LONG[d.getDay()] + ', ' + MONTHS_LONG[d.getMonth()] + ' ' + d.getDate();
    var inner = '<span class="cd-n">' + d.getDate() + '</span>', cls = 'cal-day';
    if (future) { cls += ' future'; spoken += ', coming up'; }
    else if (sm.logged) {
      var full = sm.due > 0 && sm.done === sm.due;
      if (sm.due > 0 && (sm.done > 0 || sm.other > 0)) inner = ringSvg(sm.done / sm.due, full) + inner;
      if (full) inner += '<span class="cd-check" aria-hidden="true">✓</span>';
      else if (sm.other) inner += '<span class="cd-dot" aria-hidden="true"></span>';
      if (itemId && sm.prn) inner += '<span class="cd-count" aria-hidden="true">' + sm.prn + '</span>';
      spoken += sm.due ? ', ' + sm.done + ' of ' + sm.due + ' taken or done' : '';
      if (sm.other) spoken += ', ' + sm.other + ' other answer' + (sm.other === 1 ? '' : 's');
      if (sm.prn) spoken += ', ' + sm.prn + ' as needed';
    } else spoken += ', nothing logged';
    if (day === s.day) cls += ' today';
    return '<button type="button" class="' + cls + (small ? ' small' : '') + '" data-act="cal-day" data-d="' + day + '"' + (future ? ' disabled' : '') + ' aria-label="' + esc(spoken) + '">' + inner + '</button>';
  }
  function firstDay() {
    var s = S(), first = s.day;
    if (s.history.length) first = Math.min(first, s.history[0].dayNum);
    s.meds.forEach(function (m) { if (m.createdDay != null) first = Math.min(first, m.createdDay); });
    return first;
  }
  function monthOf(day) { var d = E.dateOf(day); return { y: d.getFullYear(), m: d.getMonth() }; }
  function calendarMonth(itemId) {
    var s = S(), mo = ui.month || monthOf(s.day), first = monthOf(firstDay()), last = monthOf(s.day + 31);
    var d1 = E.dayOfDate(mo.y, mo.m, 1), dim = E.daysInMonth(mo.y, mo.m), lead = E.weekday(d1), cells = '';
    for (var i = 0; i < lead; i++) cells += '<span class="cal-blank"></span>';
    var logged = 0;
    for (var k = 0; k < dim; k++) { var day = d1 + k; cells += dayCell(day, itemId); if (day <= s.day && daySum(dayRec(day), itemId).logged) logged++; }
    var canPrev = mo.y > first.y || (mo.y === first.y && mo.m > first.m), canNext = mo.y < last.y || (mo.y === last.y && mo.m < last.m);
    var isNow = mo.y === monthOf(s.day).y && mo.m === monthOf(s.day).m;
    var items = s.meds;
    var cur = itemId && St.medById(itemId);
    var filter = '<div class="cal-filter"><button type="button" class="tok cal-show" data-act="cal-filter-sheet" aria-label="Showing ' + esc(cur ? cur.name : 'everything') + '. Change">Showing: ' + esc(cur ? cur.name : 'Everything') + ' <span class="tok-v" aria-hidden="true">▾</span></button></div>';
    return '<div class="cal" data-item="' + (itemId || '') + '">' + filter +
      '<div class="cal-head"><button type="button" class="cal-nav" data-act="cal-month" data-d="-1"' + (canPrev ? '' : ' disabled') + ' aria-label="Previous month">‹</button><h2>' + MONTHS_LONG[mo.m] + ' ' + mo.y + '</h2><button type="button" class="cal-nav" data-act="cal-month" data-d="1"' + (canNext ? '' : ' disabled') + ' aria-label="Next month">›</button></div>' +
      (isNow ? '' : '<button type="button" class="cal-today" data-act="cal-month" data-d="0">Back to this month</button>') +
      '<div class="cal-grid" role="group" aria-label="' + MONTHS_LONG[mo.m] + ' ' + mo.y + '">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (w, i) { return '<span class="cal-wd" aria-hidden="true">' + w + '</span>'; }).join('') + cells + '</div>' +
      '<p class="cal-sum">Logged on ' + logged + ' day' + (logged === 1 ? '' : 's') + ' in ' + MONTHS_LONG[mo.m] + '</p>' +
      (itemId ? '' : monthCounts(d1, dim)) +
      '<p class="cal-key">Each ring fills with what you took or did that day. A small dot means you answered, but not “Taken”. Tap a day to see it.</p></div>';
  }
  /* v5.6 (A11): per-item counts for the month, counts only ("Lisinopril · taken on 12 days"). Each one taps to filter.
   * Items with nothing logged this month aren't listed (no zeros, nothing that reads as a score). */
  function monthCounts(d1, dim) {
    var s = S(), rows = '';
    s.meds.forEach(function (m) {
      var n = 0;
      for (var k = 0; k < dim; k++) { var day = d1 + k; if (day > s.day) break; var sm = daySum(dayRec(day), m.id); if (E.isAsNeeded(m) ? sm.prn > 0 : sm.done > 0) n++; }
      if (!n) return;
      var verb = E.isAsNeeded(m) ? 'logged' : isHabit(m) ? 'done' : 'taken';
      rows += '<button type="button" class="cal-count" data-act="cal-filter" data-id="' + m.id + '">' + A.itemIcon(m) + '<span class="grow">' + esc(m.name) + '</span><span class="cc-n">' + verb + ' on ' + n + ' day' + (n === 1 ? '' : 's') + '</span>' + A.icon('chev') + '</button>';
    });
    return rows ? '<div class="cal-counts" aria-label="This month, by item">' + rows + '</div>' : '';
  }
  function weekStrip(itemId) {
    var s = S(), out = '';
    for (var d = s.day - 6; d <= s.day; d++) out += '<span class="ws-day"><span class="ws-wd" aria-hidden="true">' + E.WD[E.weekday(d)].slice(0, 2) + '</span>' + dayCell(d, itemId, true) + '</span>';
    return '<div class="week-strip">' + out + '</div>';
  }

  /* ---------- DaySheet(day): one component for the calendar, item detail and "See earlier days" ---------- */
  function daySheetBody(day) {
    var s = S(), rec = dayRec(day), rows = '';
    var y = St.yesterday(), canFix = y && y.dayNum === day && s.day - day <= 1;
    if (!rec) rows = '<p class="ds-none">Not logged.</p>';
    else if (rec.rest || !rec.stacks.some(function (st) { return st.kind === 'dose'; })) {
      var e0 = rec.entries[rec.stacks[0] && rec.stacks[0].id];
      rows = '<p class="ds-none">Nothing was scheduled.' + (e0 && e0.state && e0.state !== 'none' && e0.at != null ? ' Checked in ' + E.fmtTime(e0.at) + '.' : '') + '</p>';
    } else {
      rec.stacks.forEach(function (st) {
        if (st.kind !== 'dose') return;
        var e = rec.entries[st.id] || { state: 'none' }, past = !rec.today || E.stackPhase(st, e, s.clock) === 'past';
        rows += '<div class="ds-group"><div class="ds-gh">' + esc(st.label) + ' · ' + E.fmtTime(st.mins) + '</div>';
        st.doses.forEach(function (d) {
          var m = St.medById(d.medId), lab = E.recordLabel(e, st, { clock: rec.today ? s.clock : 1619, habit: isHabit(m), past: !rec.today });
          // Two taps: keep both exact times ("Out 8:01 AM, swallowed 8:03 AM"), as "Did I take it?" always showed.
          if (e.state === 'swallowed' && e.outAt != null && e.at != null && !e.loggedLater) lab = { label: 'Out ' + E.fmtTime(e.outAt) + ', swallowed ' + E.fmtTime(e.at), tone: lab.tone, icon: lab.icon };
          // Past days: tap a row to fix it (v5.5 round 2). Today: the check-in lives on Today, so a row opens the item.
          rows += (rec.today ? '<button type="button" class="ds-row" data-act="go" data-to="medDetail" data-id="' + d.medId + '">' : '<button type="button" class="ds-row" data-act="ds-entry" data-d="' + day + '" data-s="' + st.id + '" data-m="' + d.medId + '" aria-label="' + esc((m ? m.name : '') + ', ' + lab.label + '. Change this entry') + '">') + A.itemIcon(m || {}) + '<span class="grow"><span class="ds-n">' + esc(m ? m.name : 'Removed item') + (d.label ? ' ' + esc(d.label) : '') + '</span></span><span class="status ' + lab.tone + '">' + lab.icon + ' ' + esc(lab.label) + '</span>' + A.icon('chev') + '</button>';
        });
        var notTaken = e.state === 'didnt';
        if (notTaken) rows += '<button type="button" class="ds-help" data-act="mie-open" data-m="' + (st.doses[0] && st.doses[0].medId) + '" data-d="' + day + '">Make it easier ›</button>';
        if (canFix && (e.state === 'none' || e.state === 'unsure') && !(y.paid && y.paid[st.id])) rows += '<div class="btn-row ds-fix"><button class="btn btn-soft" data-act="backfill" data-s="' + st.id + '" data-a="took">' + (stackHabitOnly(st) ? 'I did it' : 'I took it') + '</button><button class="btn btn-soft" data-act="backfill" data-s="' + st.id + '" data-a="didnt">' + (stackHabitOnly(st) ? 'Not that day' : 'Didn’t take') + '</button></div>';
        if (rec.today && !e.state || (rec.today && e.state === 'out')) rows += '<button type="button" class="ds-help" data-act="tab" data-t="today">Check in on Today ›</button>';
        rows += '</div>';
      });
    }
    var prn = (rec && rec.prn || []).filter(function (p) { return p.medId; });
    var notes = St.notesFor(day);
    if (notes.length) rows += '<div class="ds-group"><div class="ds-gh">Your notes</div>' + notes.map(function (n) { var m = n.itemId && St.medById(n.itemId); return '<div class="ds-note"><span class="ds-note-h">' + esc(m ? m.name : 'Note') + (n.kind === 'refill' ? ' · refill' : '') + (n.at != null ? ' · ' + E.fmtTime(n.at) : '') + '</span>' + esc(n.text) + '</div>'; }).join('') + '</div>';
    if (prn.length) rows += '<div class="ds-group"><div class="ds-gh">As needed</div>' + prn.map(function (p) { var m = St.medById(p.medId); return '<div class="ds-row static">' + A.itemIcon(m || {}) + '<span class="grow ds-n">' + esc(m ? m.name : '') + '</span><span class="status neutral">Logged ' + E.fmtTime(p.at) + '</span></div>'; }).join('') + '</div>';
    return '<div class="ds-nav"><button type="button" class="cal-nav" data-act="ds-nav" data-d="' + (day - 1) + '" aria-label="Previous day"' + (day - 1 < firstDay() ? ' disabled' : '') + '>‹</button><b>' + esc(E.fmtDateLong(day)) + '</b><button type="button" class="cal-nav" data-act="ds-nav" data-d="' + (day + 1) + '" aria-label="Next day"' + (day + 1 > s.day ? ' disabled' : '') + '>›</button></div>' +
      rows + (rec && !rec.today ? '<p class="ds-foot">Tap a line to change it.</p>' : '') + '<p class="ds-foot">This shows what you logged. It isn’t medical advice.</p>';
  }
  function daySheet(day) { U.sheet('Your day', daySheetBody(day), { clin: true }); }
  /* ---------- v5.6 refill reminder card (A7): on Today every day and on My list, until the person answers ---------- */
  function refillCard(m) {
    var n = St.daysLeft(m), left = n == null ? '' : n <= 0 ? 'It may be out now.' : 'About ' + n + ' day' + (n === 1 ? '' : 's') + ' left.';
    void left;
    // "(555) 013-4 ext 2": dial the number; show the extension as text
    var ph = splitPhone(m.pharmacy || '');
    var call = m.pharmacy ? '<a class="btn btn-clin-2" href="tel:' + esc(ph.main) + '">Call pharmacy' + (ph.ext ? ' <small>then ext ' + esc(ph.ext) + '</small>' : '') + '</a>' : '<button type="button" class="btn btn-clin-2" data-act="refill-phone" data-m="' + m.id + '">Call pharmacy</button>';
    return '<section class="refill-card" aria-label="Refill time for ' + esc(m.name) + '"><div class="rf-h">' + A.itemIcon(m) + '<div class="grow"><h3>Refill time for ' + esc(m.name) + '.</h3><p>' + esc(left) + (St.refillWillPay(m) ? ' Tap Refill’s in when you have it: +' + St.CARE_REWARD.stars + ' ★' : ' Tap Refill’s in when you have it.') + '</p></div></div>' +
      '<div class="rf-acts"><button type="button" class="btn btn-clin" data-act="refill-in" data-m="' + m.id + '">Refill’s in</button>' + call + '<button type="button" class="btn btn-clin-2" data-act="refill-other" data-m="' + m.id + '">Something else</button></div></section>';
  }
  function splitPhone(s) { var m = /^(.*?)(?:\s*(?:ext\.?|extension|x|#)\s*(\d+))\s*$/i.exec(String(s)); var main = (m ? m[1] : String(s)).replace(/[^0-9+]/g, ''); return { main: main, ext: m ? m[2] : '' }; }
  function refillCards() { return St.refillsDue().map(refillCard).join(''); }

  /* ---------- My list ---------- */
  function render() {
    var s = S();
    var head = '<div class="clin"><div class="page-h ml-head"><div class="grow"><h1>My list</h1><p>Medicines, vitamins and habits</p></div><button class="btn btn-clin ml-add" data-act="ie-add" aria-label="Add something">' + A.icon('plus') + ' Add</button></div>' +
      '<div class="seg clin-seg" role="tablist"><button role="tab" aria-selected="' + (ui.view === 'calendar') + '" class="' + (ui.view === 'calendar' ? 'on' : '') + '" data-act="ml-view" data-v="calendar">Calendar</button><button role="tab" aria-selected="' + (ui.view === 'items') + '" class="' + (ui.view === 'items' ? 'on' : '') + '" data-act="ml-view" data-v="items">Items</button></div>';
    var assist = s.flags.assist && s.flags.assist.tier >= 2 ? assistCard(s.flags.assist) : '';
    var body = ui.view === 'calendar' ? '<div class="clin-card">' + calendarMonth(ui.filter) + '</div>' : itemsHtml();
    return head + assist + body + extrasHtml() + '<div style="height:24px"></div></div>';
  }
  function itemsHtml() {
    var s = S(), html = '', items = s.meds.filter(function (m) { return !E.isEnded(m, s.day); });
    if (!items.length) return '<div class="clin-empty"><p>Nothing on your list yet.</p><button class="btn btn-clin" data-act="ie-add">Add your first thing</button></div>';
    var sched = items.filter(function (m) { return !E.isAsNeeded(m) && !(m.paused && E.isPaused(m, s.day + 1)); });
    E.SLOTS.forEach(function (slot) {
      var list = sched.filter(function (m) { var tl = E.expandTimes(E.schedOf(m).times); return E.slotFor(E.gameMins(tl[0])).id === slot.id; });
      if (list.length) html += '<div class="clin-label">' + slot.label + '</div><div class="clin-group">' + list.map(itemRow).join('') + '</div>';
    });
    var prn = items.filter(function (m) { return E.isAsNeeded(m); });
    if (prn.length) html += '<div class="clin-label">As needed</div><div class="clin-group">' + prn.map(itemRow).join('') + '</div>';
    var paused = items.filter(function (m) { return !E.isAsNeeded(m) && m.paused && E.isPaused(m, s.day + 1); });
    if (paused.length) html += '<div class="clin-label">Paused</div><div class="clin-group">' + paused.map(itemRow).join('') + '</div>';
    var ended = s.meds.filter(function (m) { return E.isEnded(m, s.day); });
    if (ended.length) html += '<div class="clin-label">Finished</div><div class="clin-group">' + ended.map(itemRow).join('') + '</div>';
    return html + '<div style="padding:4px 12px 0"><button class="btn btn-clin btn-block" data-act="ie-add">' + A.icon('plus') + ' Add something</button></div>';
  }
  function extrasHtml() {
    var s = S(), out = '';
    out += refillCards();
    var first = s.meds.filter(function (m) { return !E.isAsNeeded(m) && E.itemType(m) === 'med'; })[0];
    if (first) {
      var fq = St.careQuest(first.id, 'followup');
      out += '<div class="carequest"><span class="cq-ic">' + A.icon('note') + '</span><div class="grow"><h4>Book your follow-up</h4><p>' + (fq.done ? 'Booked. Nice.' : 'Visit coming up? +' + St.CARE_REWARD.stars + ' ★ once it’s booked') + '</p></div>' +
        (fq.done ? '<span class="status done">✓ Done</span>' : '<button class="btn btn-clin-2" data-act="followup" data-m="' + first.id + '">Booked</button>') + '</div>';
    }
    return (out ? '<div class="clin-label" style="margin-top:18px">Refills and visits</div>' + out : '') +
      '<div class="clin-group" style="margin-top:14px"><button class="med-row" data-act="report"><span class="cq-ic" style="width:36px;height:36px;border-radius:10px;background:#eef3fb;color:#24467f;display:grid;place-items:center">' + A.icon('download') + '</span><span class="mr-main"><span class="mr-name" style="display:block">Report for my doctor</span><span class="mr-sub">A plain summary you can print or share</span></span>' + A.icon('chev') + '</button></div>';
  }

  function assistCard(a) {
    var m = a.medId && St.medById(a.medId), nm = m ? m.name : 'this medicine';
    if (a.tier === 2) {
      if (a.barrierId === 'cost') return '<section class="assist" aria-label="Help with cost"><h3>Help with medicine costs</h3><p>Some things people ask about:</p><ul><li>A generic version, if there is one</li><li>A 90-day supply or mail-order pharmacy</li><li>The maker’s savings or patient-assistance program</li><li>A pharmacist review of your list</li></ul><div class="btn-row" style="margin-top:12px"><button class="btn btn-clin" data-act="fake-call" data-who="pharmacy">Call pharmacy</button><button class="btn btn-clin-2" data-act="assist-done">Got it</button></div></section>';
      return '<section class="assist" aria-label="Refill help"><h3>Let’s sort out ' + esc(nm) + '</h3><p>' + (a.barrierId === 'stock' ? 'Pharmacies can often check other locations or transfer the prescription. Your prescriber can suggest an alternative if it stays out of stock.' : 'Your pharmacy can tell you if a refill is ready or if your prescriber needs to send a new one.') + '</p><div class="btn-row" style="margin-top:12px"><button class="btn btn-clin" data-act="fake-call" data-who="pharmacy">Call pharmacy</button><button class="btn btn-clin-2" data-act="assist-done">Got it</button></div></section>';
    }
    if (a.tier === 3) {
      var side = a.barrierId === 'side';
      return '<section class="assist" aria-label="Talk with your care team"><h3>' + (side ? 'Side effects are worth mentioning' : 'That’s a decision to make with your care team') + '</h3><p>' + (side ? 'Please tell your prescriber or pharmacist about them. Talk with them before stopping ' + esc(nm) + '.' : 'Please talk with your prescriber or pharmacist before stopping ' + esc(nm) + '. Some medicines need a plan to stop safely.') + '</p><div class="btn-row" style="margin-top:12px"><button class="btn btn-clin" data-act="visit-note">Add a note for my next visit</button></div><div class="btn-row" style="margin-top:8px"><button class="btn btn-clin-2" data-act="fake-call" data-who="pharmacy">Call pharmacy</button><button class="btn btn-clin-2" data-act="assist-done">Done</button></div></section>';
    }
    return '';
  }

  /* ---------- "Make it easier" (v5.6 A1): one optional free-text box, then the same plain actions every time ----------
   * No list of reasons to pick from (a list reads as "these are the only answers"). The text goes on that day's record and
   * shows in the day sheet. The actions are buttons: change the time, turn on or adjust a reminder, keep it where you'll see it. */
  function easierHtml(itemId, day) {
    var m = St.medById(itemId), hab = isHabit(m), on = m && m.reminders !== false;
    day = day == null ? S().day : day;
    // One label, one optional box. Whatever is typed is saved when the sheet closes (Done, ×, swipe) or an action is tapped.
    return '<div class="mie" data-m="' + (itemId || '') + '" data-d="' + day + '">' +
      '<label class="mie-q" for="mieText">Anything get in the way? <span class="muted">(optional)</span></label>' +
      '<textarea class="input mie-text" id="mieText" rows="2" maxlength="280" placeholder="Type anything. Only you see this. It’s saved to your day."></textarea>' +
      (m ? '<div class="mie-acts" role="group" aria-label="Things that can help">' +
        (E.isAsNeeded(m) ? '' : '<button type="button" class="opt mie-act" data-act="mie-time" data-m="' + m.id + '"><span class="mie-ai" aria-hidden="true">◷</span><span><span class="o-t" style="display:block">Change the time</span><span class="o-s">' + esc(timesLine(m)) + '</span></span></button>') +
        (E.isAsNeeded(m) ? '' : '<button type="button" class="opt mie-act" data-act="mie-rem" data-m="' + m.id + '"><span class="mie-ai" aria-hidden="true">🔔</span><span><span class="o-t" style="display:block">' + (on ? 'Adjust the reminder' : 'Turn on a reminder') + '</span><span class="o-s">' + (on ? 'Reminders are on for this one' : 'Reminders are off for this one') + '</span></span></button>') +
        '<button type="button" class="opt mie-act" data-act="mie-tips" aria-expanded="false" aria-controls="mieTips"><span class="mie-ai" aria-hidden="true">👀</span><span><span class="o-t" style="display:block">Keep it where you’ll see it</span><span class="o-s">A few ideas</span></span></button>' +
        '<ul class="mie-tips" id="mieTips" hidden>' + (hab
          ? '<li>Leave what you need out, like a water bottle on your desk.</li><li>Do it right after something you already do, like brushing your teeth.</li><li>A sticky note where you’ll see it helps.</li>'
          : '<li>Next to something you use every day, like your toothbrush or coffee.</li><li>A weekly pill box makes it easy to see.</li><li>For days out, a small bag by your keys.</li>') + '</ul></div>' : '') + '</div>';
  }
  function timesLine(m) { return 'Now: ' + E.expandTimes(E.schedOf(m).times).map(function (t) { return E.fmtTime(E.toMins(t)); }).join(', '); }
  function itemTimeFor(m) { var t = S().today, st = t && t.plan.stacks.filter(function (x) { return x.doses.some(function (d) { return d.medId === m.id; }); })[0]; return st ? st.doses.filter(function (d) { return d.medId === m.id; })[0].mins || st.mins : E.gameMins(E.expandTimes(E.schedOf(m).times)[0]); }
  function mieOpen(itemId, day) { var m = St.medById(itemId); U.sheet('Make it easier', easierHtml(itemId, day) + '<button type="button" class="btn btn-clin btn-block" data-act="sheet-close">Done</button>', { clin: true, sub: m ? esc(itemName(m)) : '', beforeClose: function () { kept = keepTyped(); }, onClose: function () { if (kept) { kept = false; root.App.render(); U.toast('Saved to your day.'); } } }); }
  var kept = false;
  function savedOnClose() { if (keepTyped()) { root.App.render(); U.toast('Saved to your day.'); } }
  function sheetSaveOpts() { return { beforeClose: function () { kept = keepTyped(); }, onClose: function () { if (kept) { kept = false; root.App.render(); U.toast('Saved to your day.'); } } }; }
  function barrierSheet(medId) { U.closeAll(); mieOpen(medId); }
  // Save what's typed (if anything) before an action moves on, so nothing typed is ever thrown away.
  function keepTyped() { var t = document.getElementById('mieText'), box = t && t.closest('.mie'); if (t && box && t.value.trim()) { St.addNote(+box.getAttribute('data-d'), box.getAttribute('data-m') || null, t.value); t.value = ''; return true; } return false; }

  /* ---------- item detail ---------- */
  function detail(p) {
    var m = St.medById(p.id); if (!m) return render();
    var s = S(), an = E.isAsNeeded(m), nd = an ? null : E.nextOccurrenceDay(m, s.day), rng = E.rangeText(m, s.day);
    var nx = an ? null : E.nextOccurrences(m, s.day, s.clock, 1)[0];
    var status = E.isEnded(m, s.day) ? 'Finished' : m.paused ? (E.isPaused(m, s.day) ? 'Paused' : 'Paused from tomorrow') : '';
    var rows = '<button type="button" class="kv kv-btn" data-act="ie-edit" data-m="' + m.id + '" data-s="2"><span class="k">When</span><span class="v">' + esc(E.scheduleSentence(m)) + (rng ? '<br><span class="kv-sub">' + esc(rng) + '</span>' : '') + '</span>' + A.icon('chev') + '</button>' +
      (an ? '' : '<button type="button" class="kv kv-btn" data-act="ie-edit" data-m="' + m.id + '" data-s="3"><span class="k">Reminders</span><span class="v">' + (m.reminders === false ? 'Off for this one' : s.settings.reminders ? 'On, no name on the lock screen' : 'Off for everything (in Me)') + (E.itemType(m) !== 'habit' ? (m.twoStep || (m.twoStep == null && s.settings.twoStep) ? ' · Two taps' : ' · One tap') : '') + '</span>' + A.icon('chev') + '</button>') +
      (E.itemType(m) !== 'habit' && !E.isAsNeeded(m) ? '<button type="button" class="kv kv-btn" data-act="ie-edit" data-m="' + m.id + '" data-s="3"><span class="k">Supply</span><span class="v">' + esc(m.supply == null ? 'Not tracked' : St.supplyText(m) + ' · ' + St.supplyLeft(m) + ' on hand') + '</span>' + A.icon('chev') + '</button>' : '');
    var steps = E.schedOf(m).doseSteps;
    var taper = steps && steps.length ? '<div class="clin-label">Dose changes over time</div><div class="clin-group">' + steps.map(function (st, i) { var next = steps[i + 1]; var on = s.day >= st.from && (!next || s.day < next.from); return '<div class="kv"><span class="k">' + E.fmtDate(st.from) + (next ? ' to ' + E.fmtDate(next.from - 1) : ' on') + '</span><span class="v">' + esc(st.label) + (on ? ' · now' : '') + '</span></div>'; }).join('') + '</div>' : '';
    var rec;
    if (an) {
      var logs = [];
      s.today.prn.forEach(function (x) { if (x.medId === m.id) logs.push({ day: s.day, at: x.at }); });
      s.history.slice().reverse().forEach(function (h) { (h.prn || []).forEach(function (x) { if (x.medId === m.id) logs.push({ day: h.dayNum, at: x.at }); }); });
      rec = '<div class="clin-label">Recent logs</div><div class="clin-group">' + (logs.length ? logs.slice(0, 8).map(function (l) { return '<div class="rec-row"><span class="d">' + (l.day === s.day ? 'Today' : E.fmtDate(l.day)) + '</span><span>Logged ' + E.fmtTime(l.at) + '</span></div>'; }).join('') : '<div class="rec-row"><span>No logs yet.</span></div>') + '</div>';
    } else rec = '<div class="clin-label">Last 7 days</div><div class="clin-card">' + weekStrip(m.id) + '<button type="button" class="cal-see" data-act="cal-see" data-id="' + m.id + '">See in calendar ›</button></div>';
    return '<div class="clin"><div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'My list</button><div class="title"></div></div>' +
      '<div class="page-h row" style="gap:14px">' + A.itemIcon(m, 'lg') + '<div><h1 style="font-size:1.6rem">' + esc(m.name) + '</h1><p>' + esc([E.doseLabel(m, s.day), (E.itemType(m) === 'other' ? (m.typeLabel || 'Other') : { med: 'Medicine', vitamin: 'Vitamin or supplement', habit: 'Habit' }[E.itemType(m)]), status].filter(Boolean).join(' · ')) + '</p></div></div>' +
      (nx ? '<p class="det-next">Next: ' + esc(nx.label) + '</p>' : nd != null ? '<p class="det-next">Next: ' + esc(E.fmtDate(nd)) + '</p>' : '') +
      (m.highRisk ? '<div class="assist" style="border-left-color:#1d5fd1"><h3>Extra care medicine</h3><p>If this one isn’t logged for a while, Kindling shows a plain card asking you to check with your prescriber or pharmacist. No game on that card.</p></div>' : '') +
      '<div class="clin-group">' + rows + '</div>' + taper + rec +
      '<div class="det-acts">' +
      '<button class="btn btn-clin-2 btn-block" data-act="ie-edit" data-m="' + m.id + '" data-s="3">' + A.icon('edit') + ' Edit</button>' +
      (an ? '' : '<button class="btn btn-clin-2 btn-block" data-act="mie-open" data-m="' + m.id + '">Make it easier</button>') +
      (an || E.isEnded(m, s.day) ? '' : '<button class="btn btn-clin-2 btn-block" data-act="pause-toggle" data-m="' + m.id + '">' + (m.paused ? 'Resume' : 'Pause') + '</button>') +
      (E.isEnded(m, s.day) ? '' : '<button class="btn btn-clin-2 btn-block" data-act="ie-stop" data-m="' + m.id + '">Stop tracking</button>') +
      '</div><p style="margin:10px 18px 30px;font-size:.85rem;color:var(--clin-muted);font-weight:600">Kindling records what you log. It doesn’t give dosing advice. Your label, pharmacist and prescriber are the source for that.</p></div>';
  }

  root.MedsUI = { splitPhone: function (s) { return splitPhone(s); }, keepTyped: function () { return keepTyped(); }, savedOnClose: function () { savedOnClose(); }, sheetSaveOpts: sheetSaveOpts, render: render, assistCard: assistCard, barrierSheet: barrierSheet, mieOpen: mieOpen, easierHtml: easierHtml, reasonsHtml: easierHtml, refillCards: refillCards, refillCard: refillCard, daySheet: daySheet, daySheetBody: daySheetBody, dayRec: dayRec, daySum: daySum, calendarMonth: calendarMonth, ui: ui, itemName: itemName, isHabit: isHabit, stackHabitOnly: stackHabitOnly, resetWizard: function () { } };
  root.App.screens.meds = render;
  root.App.screens.medDetail = detail;
  root.App.screens.history = function () { ui.view = 'calendar'; return render(); };
  Object.assign(root.App.clinScreens, { meds: 1, medDetail: 1, history: 1 });
  var refillUndo = null;
  Object.assign(root.App.acts, {
    'ml-view': function (el) { ui.view = el.getAttribute('data-v'); root.App.render(); },
    'ie-add': function () { U.closeAll(); root.ItemEditor.open('add'); },
    'ie-edit': function (el) { U.closeAll(); root.ItemEditor.open('edit', { id: el.getAttribute('data-m'), step: +(el.getAttribute('data-s') || 3) }); },
    'cal-day': function (el) { daySheet(+el.getAttribute('data-d')); },
    'ds-entry': function (el) {
      var day = +el.getAttribute('data-d'), sid = el.getAttribute('data-s'), m = St.medById(el.getAttribute('data-m')), rec = dayRec(day);
      var st = rec && rec.stacks.filter(function (x) { return x.id === sid; })[0]; if (!st) return;
      var hab = stackHabitOnly(st), ttl = (m ? m.name : 'Entry') + ' · ' + E.fmtDate(day) + ' · ' + E.fmtTime(st.mins);
      U.closeAll();
      U.sheet(ttl, '<div class="opt-list">' +
        '<button class="opt" data-act="ds-set" data-d="' + day + '" data-s="' + sid + '" data-a="took"><span class="o-t">' + (hab ? 'Done' : 'Taken') + '</span><span class="o-s" style="margin-left:auto">pick the time ›</span></button>' +
        '<button class="opt" data-act="ds-set" data-d="' + day + '" data-s="' + sid + '" data-a="didnt"><span class="o-t">' + (hab ? 'Not that day' : 'Didn’t take') + '</span></button>' +
        (hab ? '' : '<button class="opt" data-act="ds-set" data-d="' + day + '" data-s="' + sid + '" data-a="unsure"><span class="o-t">Not sure</span></button>') + '</div>' +
        '<p class="ds-foot">This changes your record. It isn’t medical advice.</p>', { clin: true });
    },
    'ds-set': function (el) {
      var day = +el.getAttribute('data-d'), sid = el.getAttribute('data-s'), a = el.getAttribute('data-a'), rec = dayRec(day), st = rec.stacks.filter(function (x) { return x.id === sid; })[0];
      var done = function (at) { var r = St.editEntry(day, sid, a, at); U.closeAll(); root.App.render(); if (r) { U.toast(a === 'took' ? 'Saved. Thanks for keeping your record accurate.' : 'Saved. Thanks for telling me.'); (r.drops || []).forEach(function (d) { root.TodayUI.powerUpDrop(d); }); } daySheet(day); };
      if (a !== 'took') { done(null); return; }
      U.closeAll();
      root.Wheel.sheet({ title: 'About what time?', cols: root.Wheel.timeCols(E.hhmm(st.mins)), onDone: function (v) { done(E.gameMins(root.Wheel.timeFrom(v))); } });
    },
    'ds-nav': function (el) { var d = +el.getAttribute('data-d'); var t = U.topOverlay(); var b = t && t.el.querySelector('.sh-body'); if (b) b.innerHTML = daySheetBody(d); },
    'cal-filter': function (el) { ui.filter = el.getAttribute('data-id') || null; U.closeAll(); root.App.render(); },
    'cal-filter-sheet': function () {
      var s = S(), cur = ui.filter, live = s.meds.filter(function (m) { return !E.isEnded(m, s.day); }), past = s.meds.filter(function (m) { return E.isEnded(m, s.day); });
      var row = function (m) { var on = (m ? m.id : null) === cur; return '<button type="button" class="opt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="cal-filter" data-id="' + (m ? m.id : '') + '">' + (m ? A.itemIcon(m) : '') + '<span class="o-t">' + esc(m ? m.name : 'Everything') + '</span></button>'; };
      U.sheet('Showing', '<div class="opt-list" role="radiogroup">' + row(null) + live.map(row).join('') + '</div>' + (past.length ? '<div class="clin-label">Past items</div><div class="opt-list">' + past.map(row).join('') + '</div>' : ''), { clin: true });
    },
    'cal-month': function (el) { var d = +el.getAttribute('data-d'), mo = ui.month || monthOf(S().day); if (d === 0) ui.month = null; else { var m = mo.m + d, y = mo.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } ui.month = { y: y, m: m }; } root.App.render(); },
    'cal-see': function (el) { ui.filter = el.getAttribute('data-id'); ui.view = 'calendar'; ui.month = null; root.App.setTab('meds'); },
    'see-earlier': function () { U.closeAll(); ui.view = 'calendar'; ui.filter = null; ui.month = null; root.App.setTab('meds'); },
    barrier: function (el) { barrierSheet(el.getAttribute('data-m')); },
    'mie-open': function (el) { U.closeAll(); mieOpen(el.getAttribute('data-m'), el.getAttribute('data-d') != null ? +el.getAttribute('data-d') : null); },
    // Change the time: the time wheel for the dose that's in question. Once there's an answer today, it starts tomorrow.
    'mie-time': function (el) {
      var m = St.medById(el.getAttribute('data-m')); if (!m) return; keepTyped();
      var from = itemTimeFor(m); U.closeAll();
      root.Wheel.sheet({ title: 'What time works better?', intro: 'For ' + esc(m.name) + '. You can always change it again.', cols: root.Wheel.timeCols(E.hhmm(from)), onDone: function (v) {
        var to = E.gameMins(root.Wheel.timeFrom(v)); if (to === from) return;
        var it = JSON.parse(JSON.stringify(m)); it.schedule = JSON.parse(JSON.stringify(E.schedOf(m)));
        var list = E.expandTimes(it.schedule.times).map(function (t) { return E.gameMins(t) === from ? E.hhmm(to) : t; });
        it.schedule.times = { mode: 'list', list: E.expandTimes({ mode: 'list', list: list }) };
        var r = St.saveItem(it); root.App.render(); U.toast(r.frozen ? 'Done. From tomorrow we’ll remind you at ' + E.fmtTime(to) + '.' : 'Done. We’ll remind you at ' + E.fmtTime(to) + '.');
      } });
    },
    // Turn on or adjust a reminder (for this item only; the global switch stays in Me).
    'mie-rem': function (el) {
      var m = St.medById(el.getAttribute('data-m')); if (!m) return; keepTyped(); U.closeAll();
      var hab = isHabit(m), two = m.twoStep == null ? S().settings.twoStep : !!m.twoStep;
      U.sheet('Reminder for ' + m.name, '<div class="set-group" style="margin:0"><div class="set-row"><span class="sr-main"><span class="sr-t" style="display:block">Remind me at these times</span><span class="sr-s">' + esc(timesLine(m).replace(/^Now: /, '')) + '</span></span><button type="button" class="toggle" role="switch" aria-checked="' + (m.reminders !== false) + '" aria-label="Reminders for ' + esc(m.name) + '" data-act="mie-remtoggle" data-m="' + m.id + '"></button></div>' +
        (hab ? '' : '<div class="set-row"><span class="sr-main"><span class="sr-t" style="display:block">Two taps</span><span class="sr-s">Pill out when it’s in your hand, then Swallowed. Handy if you get sidetracked.</span></span><button type="button" class="toggle" role="switch" aria-checked="' + two + '" aria-label="Two taps" data-act="mie-twotoggle" data-m="' + m.id + '"></button></div>') + '</div>' +
        (S().settings.reminders ? '' : '<p class="ie-hint" style="margin-top:10px">All reminders are off in Me right now.</p>') +
        '<button type="button" class="btn btn-clin btn-block" data-act="sheet-close" style="margin-top:12px">Done</button>', { clin: true, onClose: function () { root.App.render(); } });
    },
    'mie-remtoggle': function (el) { var m = St.medById(el.getAttribute('data-m')); if (!m) return; m.reminders = m.reminders === false; St.save(); el.setAttribute('aria-checked', String(m.reminders)); U.toast(m.reminders ? 'Reminders are on for ' + esc(m.name) + '.' : 'Reminders are off for ' + esc(m.name) + '.'); },
    'mie-twotoggle': function (el) { var m = St.medById(el.getAttribute('data-m')); if (!m) return; var two = m.twoStep == null ? S().settings.twoStep : !!m.twoStep; m.twoStep = !two; St.save(); el.setAttribute('aria-checked', String(m.twoStep)); },
    'mie-tips': function (el) { var t = document.getElementById('mieTips'); if (!t) return; t.hidden = !t.hidden; el.setAttribute('aria-expanded', String(!t.hidden)); },
    'mie-save': function (el) {
      var t = document.getElementById('mieText'), v = t ? t.value.trim() : '';
      if (!v) { U.toast('Type something first, or tap Done.'); if (t) t.focus(); return; }
      St.addNote(+el.getAttribute('data-d'), el.getAttribute('data-m') || null, v); t.value = '';
      U.closeAll(); root.App.render(); U.toast('Saved to your day.');
    },
    tier1: function (el) { var v = el.getAttribute('data-v'); if (v === 'two') S().settings.twoStep = true; St.save(); U.closeAll(); root.App.render(); U.toast('Two taps are on: Pill out, then Swallowed.'); },
    'barrier-pick': function (el) { var b = el.getAttribute('data-b'), m = el.getAttribute('data-m') || null; St.answerBarrier(b, m); U.closeAll(); root.App.render(); U.toast(E.barrierTier(b) >= 2 ? 'Thanks. Some help is on your Today screen.' : 'No problem.'); },
    'assist-done': function () { S().flags.assist = null; St.save(); root.App.render(); },
    'visit-note': function () { S().flags.assist = null; St.save(); root.App.render(); U.toast('Added to your notes for your next visit.'); },
    // A7 refill answers
    'refill-in': function (el) {
      var m = St.medById(el.getAttribute('data-m')); if (!m) return; U.closeAll();
      U.sheet('Refill’s in', '<p class="ie-hint">How much did you get? Count pills, mL or puffs, the same way as your supply.</p><div class="field"><label for="refillAmt">I got</label><input class="input" id="refillAmt" type="number" inputmode="decimal" min="1" step="any" value="' + St.lastRefillAmount(m) + '"></div>' +
        '<button type="button" class="btn btn-clin btn-block" data-act="refill-in-save" data-m="' + m.id + '">Save</button>', { clin: true, sub: esc(m.name) });
      setTimeout(function () { var i = document.getElementById('refillAmt'); if (i) try { i.focus(); i.select(); } catch (e) { } }, 40);
    },
    'refill-in-save': function (el) {
      var id = el.getAttribute('data-m'), i = document.getElementById('refillAmt'), v = i ? parseFloat(i.value) : NaN;
      if (!(v > 0)) { U.toast('Type how much you got, like 30.'); return; }
      var r = St.refillIn(id, v); U.closeAll(); root.App.render();
      if (r) U.toast('Nice, you’re stocked up' + (r.daysLeft != null && r.daysLeft < 400 ? ': about ' + r.daysLeft + ' days' : '') + '.' + (r.paid ? ' +' + r.paid.stars + ' ★' : ''));
    },
    'refill-no': function (el) { var m = St.medById(el.getAttribute('data-m')); if (!m) return; refillUndo = { id: m.id, supply: m.supply, setOn: m.supplySetOn, refill: JSON.parse(JSON.stringify(m.refill || {})) }; St.refillNotNeeded(m.id); U.closeAll(); root.App.render(); U.toast('Refill reminders are off for ' + esc(m.name) + '.', { undo: 'refill-undo' }); },
    'refill-undo': function () { var u = refillUndo, m = u && St.medById(u.id); if (!m) return; m.supply = u.supply; m.supplySetOn = u.setOn; m.refill = u.refill; refillUndo = null; St.save(); root.App.render(); U.toast('Refill reminders are back on for ' + esc(m.name) + '.'); },
    'refill-phone': function (el) { var id = el.getAttribute('data-m'), m = St.medById(id); U.sheet('Add your pharmacy’s number', '<div class="field"><label for="rfPhone">Phone number</label><input class="input" id="rfPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Like 555-0134"></div><p class="ie-hint">Then Call pharmacy rings it from the refill card. It stays on your phone.</p><button type="button" class="btn btn-clin btn-block" data-act="refill-phone-save" data-m="' + id + '">Save</button>', { clin: true, sub: m ? esc(m.name) : '' }); },
    'refill-phone-save': function (el) { var m = St.medById(el.getAttribute('data-m')), i = document.getElementById('rfPhone'), v = i ? i.value.trim().slice(0, 30) : ''; if (!m || !/\d{3}/.test(v)) { U.toast('Type the phone number first.'); return; } m.pharmacy = v; St.save(); U.closeAll(); root.App.render(); U.toast('Saved. Call pharmacy is on the refill card.'); },
    'refill-other': function (el) {
      var m = St.medById(el.getAttribute('data-m')); if (!m) return; U.closeAll();
      U.sheet('Something else', '<label class="mie-q" for="refillText">What’s going on? <span class="muted">(optional)</span></label><textarea class="input mie-text" id="refillText" rows="3" maxlength="280" placeholder="Type anything. Only you see this."></textarea>' +
        '<p class="ie-hint">We’ll ask again in 3 days.</p><button type="button" class="btn btn-clin btn-block" data-act="refill-other-save" data-m="' + m.id + '">Save</button>' +
        '<button type="button" class="btn btn-ghost btn-block" data-act="refill-no" data-m="' + m.id + '">Stop refill reminders for ' + esc(m.name) + '</button>', { clin: true, sub: esc(m.name) });
    },
    'refill-other-save': function (el) { var id = el.getAttribute('data-m'), t = document.getElementById('refillText'), r = St.refillOther(id, t ? t.value : ''); U.closeAll(); root.App.render(); if (r) U.toast('Got it. We’ll check in again on ' + E.fmtDate(r.askAgain) + '.'); },
    'swap-quest': function (el) { var r = St.completeCareQuest(el.getAttribute('data-m'), 'swap'); root.CollectionUI.setSeg('album'); root.App.setTab('collection'); if (r) U.toast('Goal done. +' + r.reward.stars + ' ★'); },
    followup: function (el) { var r = St.completeCareQuest(el.getAttribute('data-m'), 'followup'); root.App.render(); if (r) U.toast('Nice. +' + r.reward.stars + ' ★'); },
    'pause-toggle': function (el) { var m = St.medById(el.getAttribute('data-m')); St.setPaused(m.id, !m.paused); St.replanToday(); U.closeAll(); root.App.render(); U.toast(m.paused ? 'Paused from tomorrow. Those days stay fully playable.' : 'Resumed.'); },
    report: function () { U.sheet('Report for my doctor', '<p style="font-weight:600">A plain summary of the last 30 days: each item, its schedule, and every entry with times. No points, no game.</p><div class="btn-row" style="margin-top:14px"><button class="btn btn-clin" data-act="fake-call" data-who="printer">Print or save PDF</button></div>', { clin: true }); }
  });
})(window);
