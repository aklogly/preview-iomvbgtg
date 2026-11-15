/* Kindling v5 — screens-meds.js : plain, theme-neutral, fast. No celebrations here. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, esc = U.esc;
  function S() { return St.S; }
  var KIND = { daily: 'Every day', multi: 'More than once a day', prn: 'As needed', weekly: 'Once a week', taper: 'Dose changing over time', paused: 'Paused by my care team' };

  function schedSentence(m) {
    var t = (m.times || []).map(function (x) { return E.fmtTime(E.toMins(x)); }).join(', ');
    if (m.paused) return 'Paused by your care team' + (m.pausedUntil ? ' until ' + E.fmtDate(m.pausedUntil) : '') + '.';
    if (m.kind === 'prn') return 'As needed. You log it when you use it.';
    if (m.kind === 'weekly') return 'Every ' + E.WD_LONG[m.weekday || 0] + ' at ' + t + '.';
    if (m.kind === 'taper') return 'Every day at ' + t + '. Today: ' + E.doseLabel(m, S().day) + '.';
    if (m.kind === 'multi') return (m.times.length === 2 ? 'Twice' : m.times.length === 3 ? 'Three times' : m.times.length + ' times') + ' a day at ' + t + '.';
    return 'Every day at ' + t + '.';
  }
  function todayStatus(m) {
    var t = S().today, out = [];
    t.plan.stacks.forEach(function (st) { if (st.doses.some(function (d) { return d.medId === m.id; })) out.push(E.doseStatus(t.entries[st.id], st, S().clock)); });
    return out;
  }
  function medRow(m) {
    var st = todayStatus(m), chip = '';
    if (m.kind === 'prn') { var l = St.lastPrn(m.id); chip = l ? '<span class="status neutral">Last ' + (l.day === S().day ? '' : E.fmtDate(l.day) + ' ') + E.fmtTime(l.at) + '</span>' : ''; }
    else if (m.paused) chip = '<span class="status neutral">⏸ Paused</span>';
    else if (st.length) chip = '<span class="status ' + st[st.length - 1].tone + '">' + st[st.length - 1].icon + ' ' + esc(st[st.length - 1].label) + '</span>';
    else if (m.kind === 'weekly') chip = '<span class="status neutral">' + E.WD_LONG[m.weekday || 0] + 's</span>';
    var sub = [m.kind === 'taper' ? E.doseLabel(m, S().day) : (m.strength || ''), m.kind !== 'prn' && m.times && m.times.length ? m.times.map(function (x) { return E.fmtTime(E.toMins(x)); }).join(', ') : ''].filter(Boolean).join(' · ');
    return '<button class="med-row" data-act="go" data-to="medDetail" data-id="' + m.id + '">' + A.pill(m) + '<span class="mr-main"><span class="mr-name" style="display:block">' + esc(m.name) + (m.highRisk ? ' <span class="status neutral" style="vertical-align:1px">Extra care</span>' : '') + '</span><span class="mr-sub">' + esc(sub) + '</span></span>' + chip + A.icon('chev') + '</button>';
  }

  function render() {
    var s = S(), meds = s.meds, groups = {};
    var plan = s.today.plan;
    var habits = s.mode === 'habits';
    var html = '<div class="clin"><div class="page-h"><h1>' + (habits ? 'My list' : 'Meds') + '</h1><p>' + (habits ? 'Things you remember every day' : 'Your medicines and your record') + '</p></div>';
    html += careQuestsHtml();
    if (s.flags.assist && s.flags.assist.tier >= 2) html += assistCard(s.flags.assist);
    // group by time of day using engine slots
    var scheduled = meds.filter(function (m) { return m.kind !== 'prn' && !m.paused; });
    E.SLOTS.forEach(function (slot) {
      var list = scheduled.filter(function (m) { return (m.times || []).some(function (t) { var mm = E.toMins(t); return mm >= slot.from && mm < slot.to; }); });
      if (list.length) html += '<div class="clin-label">' + slot.label + '</div><div class="clin-group">' + list.map(medRow).join('') + '</div>';
    });
    var prn = meds.filter(function (m) { return m.kind === 'prn'; });
    if (prn.length) html += '<div class="clin-label">As needed</div><div class="clin-group">' + prn.map(medRow).join('') + '</div>';
    var paused = meds.filter(function (m) { return m.paused; });
    if (paused.length) html += '<div class="clin-label">Paused</div><div class="clin-group">' + paused.map(medRow).join('') + '</div>';
    html += '<div style="padding:4px 12px 0"><button class="btn btn-clin btn-block" data-act="go" data-to="medWizard">' + A.icon('plus') + ' Add ' + (habits ? 'something' : 'a medicine') + '</button></div>';
    html += '<div class="clin-label" style="margin-top:22px">Your record</div><div class="clin-group">' +
      '<button class="med-row" data-act="go" data-to="history"><span class="cq-ic" style="width:36px;height:36px;border-radius:10px;background:#eef3fb;color:#24467f;display:grid;place-items:center">' + A.icon('note') + '</span><span class="mr-main"><span class="mr-name" style="display:block">History</span><span class="mr-sub">Every entry, with exact times</span></span>' + A.icon('chev') + '</button>' +
      '<button class="med-row" data-act="report"><span class="cq-ic" style="width:36px;height:36px;border-radius:10px;background:#eef3fb;color:#24467f;display:grid;place-items:center">' + A.icon('download') + '</span><span class="mr-main"><span class="mr-name" style="display:block">Report for my doctor</span><span class="mr-sub">A plain summary you can print or share</span></span>' + A.icon('chev') + '</button>' +
      '</div><p style="margin:4px 18px 24px;font-size:.85rem;color:var(--clin-muted);font-weight:600">Changes to your schedule start tomorrow, so today stays as planned.</p></div>';
    return html;
  }

  function careQuestsHtml() {
    var s = S(), out = '';
    s.meds.forEach(function (m) {
      if (m.kind === 'prn' || m.paused || m.supply == null || m.supply > 7) return;
      var q = St.careQuest(m.id, 'refill');
      if (q.dissolved) {
        var sw = St.careQuest(m.id, 'swap'), tm = root.Theme.T(S());
        out += '<div class="carequest"><span class="cq-ic">' + A.icon('book') + '</span><div class="grow"><h4>Fresh quest: browse your ' + esc(tm.terms.album) + '</h4><p>' + (sw.done ? 'Done.' : 'Same reward as before: +' + St.CARE_REWARD.stars + ' ★') + '</p></div>' +
          (sw.done ? '<span class="status done">✓ Done</span>' : '<button class="btn btn-clin-2" data-act="swap-quest" data-m="' + m.id + '">Go</button>') + '</div>';
        return;
      }
      out += '<div class="carequest"><span class="cq-ic">' + A.icon('pill') + '</span><div class="grow"><h4>Supply run: ' + esc(m.name) + '</h4><p>' + (q.done ? 'Done. Thanks for staying stocked up.' : 'About ' + m.supply + ' days left. Same reward whenever you do it: +' + St.CARE_REWARD.stars + ' ★') + '</p></div>' +
        (q.done ? '<span class="status done">✓ Done</span>' : '<button class="btn btn-clin-2" data-act="refill" data-m="' + m.id + '">Start</button>') + '</div>';
    });
    var first = s.meds.filter(function (m) { return m.kind !== 'prn'; })[0];
    if (first) {
      var fq = St.careQuest(first.id, 'followup');
      out += '<div class="carequest"><span class="cq-ic">' + A.icon('note') + '</span><div class="grow"><h4>Book your follow-up</h4><p>' + (fq.done ? 'Booked. Nice.' : 'Visit coming up? +' + St.CARE_REWARD.stars + ' ★ once it’s booked') + '</p></div>' +
        (fq.done ? '<span class="status done">✓ Done</span>' : '<button class="btn btn-clin-2" data-act="followup" data-m="' + first.id + '">Booked</button>') + '</div>';
    }
    return out ? '<div class="clin-label">Quests for your meds</div>' + out : '';
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

  function barrierSheet(medId) {
    U.closeAll();
    U.sheet('What got in the way?', '<p style="color:var(--clin-muted);font-weight:600;margin-bottom:12px">Optional. Only you see this.</p><div class="opt-list">' +
      E.BARRIERS.map(function (b) { return '<button class="opt" data-act="barrier-pick" data-b="' + b.id + '" data-m="' + (medId || '') + '"><span class="o-t">' + esc(b.label) + '</span></button>'; }).join('') + '</div>', { clin: true });
  }
  function barrierPick(el) {
    var b = el.getAttribute('data-b'), m = el.getAttribute('data-m') || null;
    var r = St.answerBarrier(b, m);
    U.closeAll(); root.App.render();
    if (r.tier === 1) {
      U.sheet('Want a nudge that fits better?', '<p style="font-weight:600">A few things that help when the day gets busy:</p><div class="opt-list" style="margin-top:12px">' +
        '<button class="opt" data-act="tier1" data-v="time"><span><span class="o-t" style="display:block">Move my reminder to 9:00 AM</span><span class="o-s">Takes effect tomorrow</span></span></button>' +
        '<button class="opt" data-act="tier1" data-v="two"><span><span class="o-t" style="display:block">Turn on Pill out + Swallowed</span><span class="o-s">Great for getting sidetracked mid-dose</span></span></button>' +
        '<button class="opt" data-act="sheet-close"><span class="o-t">Keep things as they are</span></button></div>');
    } else if (r.tier >= 2) {
      U.toast('Thanks. Some help is on your Today screen.');
    } else {
      U.toast('No problem.');
    }
  }

  /* ---------- detail ---------- */
  function detail(p) {
    var m = St.medById(p.id); if (!m) return render();
    var s = S(), rec = '';
    var days = s.history.slice(-6).reverse();
    var todayRows = todayStatus(m).map(function (ds) { return '<div class="rec-row"><span class="d">Today</span><span class="status ' + ds.tone + '">' + ds.icon + ' ' + esc(ds.label) + '</span></div>'; }).join('');
    if (m.kind === 'prn') {
      var logs = [];
      s.today.prn.forEach(function (x) { if (x.medId === m.id) logs.push({ day: s.day, at: x.at }); });
      days.forEach(function (h) { (h.prn || []).forEach(function (x) { if (x.medId === m.id) logs.push({ day: h.dayNum, at: x.at }); }); });
      rec = logs.length ? logs.slice(0, 8).map(function (l) { return '<div class="rec-row"><span class="d">' + (l.day === s.day ? 'Today' : E.fmtDate(l.day)) + '</span><span>Logged ' + E.fmtTime(l.at) + '</span></div>'; }).join('') : '<div class="rec-row"><span>No entries yet.</span></div>';
    } else {
      rec = todayRows + days.map(function (h) {
        return h.plan.stacks.filter(function (st) { return st.doses && st.doses.some(function (d) { return d.medId === m.id; }); }).map(function (st) {
          var e = h.entries[st.id] || { state: 'none' };
          var ds = e.state === 'none' ? { label: 'No entry', tone: 'neutral', icon: '○' } : e.state === 'unsure' && e.fromOut ? { label: 'Out ' + E.fmtTime(e.outAt) + ', not confirmed', tone: 'neutral', icon: '?' } : E.doseStatus(e, st, 1439);
          return '<div class="rec-row"><span class="d">' + E.fmtDate(h.dayNum) + (h.plan.stacks.length > 1 ? ' · ' + esc(st.label) : '') + '</span><span class="status ' + ds.tone + '">' + ds.icon + ' ' + esc(ds.label) + '</span></div>';
        }).join('');
      }).join('');
      if (!rec) rec = '<div class="rec-row"><span>No entries yet.</span></div>';
    }
    var taper = m.kind === 'taper' ? '<div class="clin-label">Dose changing over time</div><div class="clin-group">' + m.steps.map(function (st, i) { var next = m.steps[i + 1]; var on = s.day >= st.fromDay && (!next || s.day < next.fromDay); return '<div class="kv"><span class="k">' + E.fmtDate(st.fromDay) + (next ? ' to ' + E.fmtDate(next.fromDay - 1) : ' on') + '</span><span class="v">' + esc(st.label) + (on ? ' · now' : '') + '</span></div>'; }).join('') + '</div>' : '';
    return '<div class="clin"><div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Meds</button><div class="title"></div></div>' +
      '<div class="page-h row" style="gap:14px">' + A.pill(m) + '<div><h1 style="font-size:1.6rem">' + esc(m.name) + '</h1><p>' + esc(m.kind === 'taper' ? E.doseLabel(m, s.day) : m.strength || '') + (m.drug ? ' · ' + esc(m.drug) : '') + '</p></div></div>' +
      (m.highRisk ? '<div class="assist" style="border-left-color:#1d5fd1"><h3>Extra care medicine</h3><p>If this one isn’t logged for a while, Kindling shows a plain card asking you to check with your prescriber or pharmacist. No game on that card.</p></div>' : '') +
      '<div class="clin-group"><div class="kv"><span class="k">Schedule</span><span class="v">' + esc(schedSentence(m)) + '</span></div>' +
      '<div class="kv"><span class="k">Type</span><span class="v">' + esc(m.paused ? KIND.paused : KIND[m.kind] || '') + '</span></div>' +
      (m.kind !== 'prn' ? '<div class="kv"><span class="k">Reminder</span><span class="v">' + (s.settings.reminders ? 'On, no name on the lock screen' : 'Off') + '</span></div>' : '') +
      (m.supply != null && m.kind !== 'prn' ? '<div class="kv"><span class="k">Supply</span><span class="v">About ' + m.supply + ' days left</span></div>' : '') + '</div>' + taper +
      '<div class="clin-label">Record</div><div class="clin-group">' + rec + '</div>' +
      '<div style="padding:4px 12px;display:flex;flex-direction:column;gap:8px">' +
      '<button class="btn btn-clin-2 btn-block" data-act="go" data-to="medWizard" data-id="' + m.id + '">' + A.icon('edit') + ' Edit</button>' +
      (m.kind !== 'prn' ? '<button class="btn btn-clin-2 btn-block" data-act="barrier" data-m="' + m.id + '">What got in the way?</button>' : '') +
      (m.kind !== 'prn' ? '<button class="btn btn-clin-2 btn-block" data-act="pause-toggle" data-m="' + m.id + '">' + (m.paused ? 'Resume tomorrow' : 'Paused by my care team') + '</button>' : '') +
      '</div><p style="margin:10px 18px 30px;font-size:.85rem;color:var(--clin-muted);font-weight:600">Kindling records what you log. It doesn’t give dosing advice. Your label, pharmacist and prescriber are the source for that.</p></div>';
  }

  /* ---------- history ---------- */
  function history() {
    var s = S(), rows = '';
    s.history.slice().reverse().slice(0, 10).forEach(function (h) {
      rows += '<div class="clin-label">' + E.fmtDateLong(h.dayNum) + '</div><div class="clin-group">';
      h.plan.stacks.forEach(function (st) {
        var e = h.entries[st.id] || { state: 'none' };
        var ds = e.state === 'none' ? { label: st.kind === 'rest' ? 'Rest day' : 'No entry', tone: 'neutral', icon: st.kind === 'rest' ? '☾' : '○' } : e.state === 'unsure' && e.fromOut ? { label: 'Out ' + E.fmtTime(e.outAt) + ', not confirmed', tone: 'neutral', icon: '?' } : E.doseStatus(e, st, 1439);
        rows += '<div class="rec-row"><span class="d">' + esc(st.kind === 'dose' ? st.label + ' · ' + E.fmtTime(st.mins) : st.kind === 'rest' ? 'Rest day' : 'Journal') + '</span><span class="status ' + ds.tone + '">' + ds.icon + ' ' + esc(ds.label) + '</span></div>';
      });
      (h.prn || []).filter(function (p) { return p.medId; }).forEach(function (p) { var m = St.medById(p.medId); rows += '<div class="rec-row"><span class="d">' + esc(m ? m.name : '') + '</span><span>As needed, logged ' + E.fmtTime(p.at) + '</span></div>'; });
      rows += '</div>';
    });
    return '<div class="clin"><div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Meds</button><div class="title">History</div></div>' +
      '<p style="margin:0 18px 6px;color:var(--clin-muted);font-weight:600">Facts only. Tap an entry in a real build to edit it.</p>' + (rows || '<p style="margin:18px">No past days yet.</p>') + '<div style="height:24px"></div></div>';
  }

  /* ---------- add / edit wizard ---------- */
  var wz = null;
  function wizardStart(id) {
    var m = id && St.medById(id);
    wz = { step: 0, id: id || null, d: m ? JSON.parse(JSON.stringify(m)) : { name: '', strength: '', kind: 'daily', times: ['08:00'], weekday: 0, color: '#9ad0f5', shape: 'round', supply: 30, steps: [{ fromDay: S().day + 1, label: '40 mg' }, { fromDay: S().day + 8, label: '20 mg' }] } };
  }
  function wizard(p) {
    if (!wz || (p && p.id && wz.id !== p.id) || (p && !p.id && wz.id)) wizardStart(p && p.id);
    var d = wz.d, step = wz.step, body = '', steps = 4;
    var bar = '<div class="stepper">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i <= step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    if (step === 0) {
      body = '<div class="form"><div class="field"><label for="wzName">Name</label><input class="input" id="wzName" value="' + esc(d.name) + '" placeholder="e.g. Lisinopril, or “blue pill”"><div class="hint">A nickname works fine. The drug name is optional.</div></div>' +
        '<div class="field"><label for="wzStr">Strength (optional)</label><input class="input" id="wzStr" value="' + esc(d.strength || '') + '" placeholder="e.g. 10 mg"></div>' +
        '<div class="field"><div class="lab">Looks like</div><div class="chips">' + ['round', 'oval', 'capsule', 'pen', 'drop'].map(function (sh) { return '<button class="chip-btn ' + (d.shape === sh ? 'on' : '') + '" data-act="wz-set" data-k="shape" data-v="' + sh + '" aria-label="' + sh + '">' + A.pill({ shape: sh, color: d.color }) + '</button>'; }).join('') + '</div>' +
        '<div class="chips" style="margin-top:8px">' + ['#9ad0f5', '#f6a04d', '#ffffff', '#f7a6c8', '#b4e3a7', '#ffd166'].map(function (c) { return '<button class="chip-btn ' + (d.color === c ? 'on' : '') + '" data-act="wz-set" data-k="color" data-v="' + c + '" aria-label="Color"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:' + c + ';box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.2)"></span></button>'; }).join('') + '</div></div></div>';
    } else if (step === 1) {
      var kinds = [['daily', 'Every day', 'Once a day'], ['multi', 'More than once a day', 'Morning and evening, for example'], ['prn', 'As needed', 'Log it when you use it'], ['weekly', 'Once a week', 'Same day each week'], ['taper', 'Dose changing over time', 'Steps set by your prescriber'], ['paused', 'Paused by my care team', 'Keep it on your list, no reminders']];
      body = '<div class="form"><div class="opt-list">' + kinds.map(function (k) { var on = (k[0] === 'paused' ? d.paused : d.kind === k[0] && !d.paused); return '<button class="opt ' + (on ? 'on' : '') + '" data-act="wz-kind" data-v="' + k[0] + '"><span><span class="o-t" style="display:block">' + k[1] + '</span><span class="o-s">' + k[2] + '</span></span></button>'; }).join('') + '</div></div>';
    } else if (step === 2) {
      var slots = [['07:30', 'Early'], ['08:00', 'Morning'], ['12:00', 'Midday'], ['18:00', 'Evening'], ['21:30', 'Bedtime']];
      if (d.kind === 'prn' || d.paused) body = '<div class="form"><p style="font-weight:700">' + (d.paused ? 'No reminders while it’s paused. Resume it anytime from its page.' : 'No schedule needed. You’ll see it under “As needed” on Today, with the last time you logged it.') + '</p></div>';
      else {
        body = '<div class="form"><div class="field"><div class="lab">' + (d.kind === 'multi' ? 'Pick the times' : 'What time?') + '</div><div class="chips">' + slots.map(function (sl) { var on = d.times.indexOf(sl[0]) >= 0; return '<button class="chip-btn ' + (on ? 'on' : '') + '" data-act="wz-time" data-v="' + sl[0] + '">' + sl[1] + ' · ' + E.fmtTime(E.toMins(sl[0])) + '</button>'; }).join('') + '</div></div>';
        if (d.kind === 'weekly') body += '<div class="field"><div class="lab">Which day?</div><div class="chips">' + E.WD_LONG.map(function (w, i) { return '<button class="chip-btn ' + (d.weekday === i ? 'on' : '') + '" data-act="wz-set" data-k="weekday" data-v="' + i + '">' + w.slice(0, 3) + '</button>'; }).join('') + '</div><div class="hint">The other days are rest days. Your dose day is a Boss Day.</div></div>';
        if (d.kind === 'taper') body += '<div class="field"><div class="lab">Steps (from your prescriber)</div>' + d.steps.map(function (st, i) { return '<div class="kv" style="border:1px solid var(--clin-line);border-radius:12px;margin-bottom:6px"><span class="k">From ' + E.fmtDate(st.fromDay) + '</span><span class="v">' + esc(st.label) + '</span></div>'; }).join('') + '<div class="hint">Kindling never creates a schedule. Enter the steps exactly as prescribed.</div></div>';
        body += '<div class="field"><div class="lab">Supply on hand (optional)</div><div class="chips">' + [7, 14, 30, 90].map(function (n) { return '<button class="chip-btn ' + (d.supply === n ? 'on' : '') + '" data-act="wz-set" data-k="supply" data-v="' + n + '">' + n + ' days</button>'; }).join('') + '</div></div></div>';
      }
    } else {
      body = '<div class="confirm-sentence">' + esc(sentence(d)) + '</div><p style="margin:0 18px;color:var(--clin-muted);font-weight:600">Starts tomorrow, so today’s plan stays the same. Reminders never show the name on your lock screen unless you turn that on.</p>';
    }
    var titles = ['What is it?', 'How do you take it?', 'When?', 'Look right?'];
    return '<div class="clin"><div class="nav-h"><button class="back" data-act="' + (step ? 'wz-prev' : 'back') + '">' + A.icon('back') + (step ? 'Back' : 'Meds') + '</button><div class="title">' + (wz.id ? 'Edit' : 'Add') + '</div></div>' + bar +
      '<div class="page-h"><h1 style="font-size:1.5rem">' + titles[step] + '</h1></div>' + body +
      '<div style="padding:18px 16px 30px"><button class="btn btn-clin btn-block" data-act="' + (step < steps - 1 ? 'wz-next' : 'wz-save') + '">' + (step < steps - 1 ? 'Next' : 'Save') + '</button></div></div>';
  }
  function sentence(d) {
    var nm = d.name || 'This medicine';
    var t = (d.times || []).map(function (x) { return E.fmtTime(E.toMins(x)); }).join(' and ');
    if (d.paused) return nm + ' stays on your list, paused by your care team. No reminders.';
    if (d.kind === 'prn') return nm + ' is as needed. Log it on Today when you use it.';
    if (d.kind === 'weekly') return 'We’ll remind you every ' + E.WD_LONG[d.weekday] + ' at ' + t + ' to take ' + nm + '.';
    if (d.kind === 'taper') return 'We’ll remind you every day at ' + t + ' to take ' + nm + '. The dose label follows your prescriber’s steps.';
    return 'We’ll remind you every day at ' + t + ' to take ' + nm + (d.strength ? ' ' + d.strength : '') + '.';
  }
  function readStep0() { var n = document.getElementById('wzName'), s = document.getElementById('wzStr'); if (n) wz.d.name = n.value.trim(); if (s) wz.d.strength = s.value.trim(); }

  root.MedsUI = { render: render, assistCard: assistCard, barrierSheet: barrierSheet, resetWizard: function () { wz = null; } };
  root.App.screens.meds = render;
  root.App.screens.medDetail = detail;
  root.App.screens.medWizard = wizard;
  root.App.screens.history = history;
  root.App.clinScreens = { meds: 1, medDetail: 1, medWizard: 1, history: 1 };
  Object.assign(root.App.acts, {
    barrier: function (el) { barrierSheet(el.getAttribute('data-m')); },
    'barrier-pick': barrierPick,
    tier1: function (el) { var v = el.getAttribute('data-v'); if (v === 'two') S().settings.twoStep = true; St.save(); U.closeAll(); root.App.render(); U.toast(v === 'two' ? 'Pill out + Swallowed is on.' : 'Your reminder moves to 9:00 AM from tomorrow.'); },
    'assist-done': function () { S().flags.assist = null; St.save(); root.App.render(); },
    'visit-note': function () { S().flags.assist = null; St.save(); root.App.render(); U.toast('Added to your notes for your next visit.'); },
    refill: function (el) {
      var id = el.getAttribute('data-m');
      U.sheet('Supply run', '<p style="font-weight:600">Steps that usually work:</p><ol style="padding-left:20px;font-weight:600;line-height:1.7"><li>Call or tap refill in your pharmacy’s app</li><li>If it needs a new prescription, the pharmacy can ask your prescriber</li><li>Pick it up or get it delivered</li></ol>' +
        '<div class="opt-list" style="margin-top:12px"><button class="opt" data-act="refill-done" data-m="' + id + '"><span class="o-t">Done, I have it</span></button><button class="opt" data-act="barrier-pick" data-b="stock" data-m="' + id + '"><span class="o-t">The pharmacy is out of stock</span></button><button class="opt" data-act="barrier-pick" data-b="cost" data-m="' + id + '"><span class="o-t">Cost or insurance is a problem</span></button></div>', { clin: true, sub: 'Same reward whichever day you do it.' });
    },
    'swap-quest': function (el) { var r = St.completeCareQuest(el.getAttribute('data-m'), 'swap'); root.App.setTab('collection'); if (r) U.toast('Quest done. +' + r.reward.stars + ' ★'); },
    'refill-done': function (el) { var r = St.completeCareQuest(el.getAttribute('data-m'), 'refill'); U.closeAll(); root.App.render(); if (r) U.toast('Supply run done. +' + r.reward.stars + ' ★'); },
    followup: function (el) { var r = St.completeCareQuest(el.getAttribute('data-m'), 'followup'); root.App.render(); if (r) U.toast('Nice. +' + r.reward.stars + ' ★'); },
    'pause-toggle': function (el) { var m = St.medById(el.getAttribute('data-m')); St.setPaused(m.id, !m.paused); root.App.render(); U.toast(m.paused ? 'Paused from tomorrow. Those days stay fully chargeable.' : 'Resumes tomorrow.'); },
    report: function () { U.sheet('Report for my doctor', '<p style="font-weight:600">A plain summary of the last 30 days: each medicine, its schedule, and every entry with times. No points, no game.</p><div class="btn-row" style="margin-top:14px"><button class="btn btn-clin" data-act="fake-call" data-who="printer">Print or save PDF</button></div>', { clin: true }); },
    'wz-next': function () { readStep0(); if (wz.step === 0 && !wz.d.name) { U.toast('Add a name or nickname first.'); return; } wz.step++; root.App.render(); },
    'wz-prev': function () { readStep0(); wz.step = Math.max(0, wz.step - 1); root.App.render(); },
    'wz-set': function (el) { readStep0(); var k = el.getAttribute('data-k'), v = el.getAttribute('data-v'); wz.d[k] = (k === 'weekday' || k === 'supply') ? +v : v; root.App.render(); },
    'wz-kind': function (el) { var v = el.getAttribute('data-v'); if (v === 'paused') { wz.d.paused = true; } else { wz.d.paused = false; wz.d.kind = v; if (v === 'multi' && wz.d.times.length < 2) wz.d.times = ['08:00', '18:00']; if (v === 'daily' || v === 'weekly' || v === 'taper') wz.d.times = [wz.d.times[0] || '08:00']; } root.App.render(); },
    'wz-time': function (el) { var v = el.getAttribute('data-v'), t = wz.d.times; if (wz.d.kind === 'multi') { var i = t.indexOf(v); if (i >= 0 && t.length > 1) t.splice(i, 1); else if (i < 0) t.push(v); t.sort(); } else wz.d.times = [v]; root.App.render(); },
    'wz-save': function () { var d = wz.d; if (d.paused) d.pausedFrom = S().day + 1; d.startDay = d.startDay || (wz.id ? null : S().day + 1); St.upsertMed(d); wz = null; root.App.back(); U.toast('Saved. It starts tomorrow.'); }
  });
})(window);
