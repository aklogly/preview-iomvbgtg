/* Kindling v5.4 — screens-book.js : the Chronicle (a player-shaped book) and the Journal.
 * The Book holds the prologue, spine chapters, one "Week on the trail" page a week, and quiet pages.
 * Daily quest pages go to the Journal. Every page is numbered by days played, never by a date.
 * Text is rendered from story.js at read time, so switching theme re-skins the whole book. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, R = root.RPG, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  function ST() { return root.Story.T(S().theme); }
  function def() { return Th.companionDef(th(), S().comp.species); }
  function fill(t) { return root.Story.fill(t, { theme: S().theme, name: S().comp.name, def: def() }); }
  function paras(t) { return fill(t).split('\n\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); }
  var ROMAN = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  /* ---------- titles ---------- */
  function spinePage() { return S().book.pages.filter(function (p) { return p.kind === 'spine' && p.ch === 1 && !p.stub; })[0] || null; }
  function title() {
    var sp = spinePage(), n = S().comp.name;
    if (sp) return n + ' ' + ST().book.titles[sp.choice];
    return n + ' the ' + th().camp.stages[St.stage()];
  }
  function bookTitle() { return fill(ST().book.title); }

  /* ---------- page renderers: { kicker, title, html, folio } ---------- */
  function beatLine(qid, i, tier) { var q = ST().quests[qid]; return fill(q.beats[i].lines[{ steady: 0, great: 1, amazing: 2 }[tier] || 0]); }
  function render(pg) {
    var b = ST().book;
    if (pg.kind === 'prologue') return { kicker: 'Prologue', title: b.prologue.title, html: paras(b.prologue.text), folio: pg.day };
    if (pg.kind === 'cover') return { kicker: '', title: bookTitle(), html: '<p class="bk-cover-line">' + esc(pg.journal ? ST().book.journal : title()) + '</p><div class="bk-cover-art">' + A.companion(def(), 'happy', {}) + '</div>', folio: '' };
    if (pg.kind === 'spine' && pg.stub) return { kicker: 'Chapter ' + (ROMAN[pg.ch] || pg.ch), title: fill(b.chapters[pg.ch] || ''), html: '<p class="bk-stub">This chapter is written when ' + esc(S().comp.name) + ' grows into ' + esc(aName(th().camp.stages[pg.ch])) + '. The prototype writes the prologue, chapter one, the weekly pages and a quiet page in full; later chapters show their titles only.</p>', folio: pg.day };
    if (pg.kind === 'spine') {
      var intro = fill(b.ch1.intro).split('\n\n'); intro.pop(); // drop the question; the choice is answered below
      var opt = b.ch1.options.filter(function (o) { return o.id === pg.choice; })[0];
      return { kicker: 'Chapter One', title: b.ch1.title.replace(/^Chapter One:\s*/, ''), html: intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '<p class="bk-choice">✦ ' + esc(opt.label) + '. ' + esc(opt.why) + '</p>' + paras(b.ch1.variants[pg.choice]), folio: pg.day };
    }
    if (pg.kind === 'weekly') {
      var lines = (pg.picks || []).map(function (p) { return '<p><span class="bk-sc">' + esc(ST().quests[p.quest].name) + '.</span> ' + esc(beatLine(p.quest, p.beat, p.tier)) + '</p>'; }).join('');
      return { kicker: 'Week ' + pg.week, title: b.weekly.title, html: '<p>' + esc(fill(b.weekly.open)) + '</p>' + lines + '<p>' + esc(fill(b.weekly.close)) + '</p>', folio: pg.day };
    }
    if (pg.kind === 'quiet') return { kicker: 'A quiet page', title: b.quiet.title, html: paras(b.quiet.text), folio: pg.day };
    if (pg.kind === 'journal') {
      var q = ST().quests[pg.quest], tiers = pg.tiers || [];
      var rows = q.beats.map(function (bt, i) { var t = tiers[i] || 'steady'; return '<p><span class="tier-chip t-' + t + '">' + esc(ST().tiers[t]) + '</span> ' + esc(beatLine(pg.quest, i, t)) + '</p>'; }).join('');
      var g = (pg.gear || []).map(function (id) { return R.ITEMS[id].icon + ' ' + ST().gear[id]; }).join(', ');
      return { kicker: q.icon + ' ' + b.journal, title: q.name, html: rows + (g ? '<p class="bk-found">Brought home: ' + esc(g) + '.</p>' : ''), folio: pg.day };
    }
    return { kicker: '', title: '', html: '', folio: '' };
  }
  function aName(n) { return (/^[AEIOU]/i.test(n) ? 'an ' : 'a ') + n; }
  function pageInner(pg) {
    var r = render(pg);
    var prose = /^(prologue|spine|weekly|quiet)$/.test(pg.kind) && !pg.stub;
    return '<div class="bp-paper"><div class="bp-kicker">' + esc(r.kicker) + '</div><h2 class="bp-title">' + esc(r.title) + '</h2><div class="bp-text' + (prose ? ' prose' : '') + '">' + r.html + '</div>' +
      '<div class="bp-folio" aria-label="Page ' + r.folio + ', numbered by days played">— ' + r.folio + ' —</div></div>';
  }

  /* ---------- the reader: a real page turn ---------- */
  var rd = null; // { list, i }
  function bookList() { return S().book.pages.slice().sort(function (a, b) { return a.day - b.day; }); }
  function journalList() { return S().book.journal.map(function (e) { return Object.assign({ kind: 'journal' }, e); }); }
  function open(list, i, opts) {
    opts = opts || {};
    rd = { list: list, i: Math.max(0, Math.min(list.length - 1, i)), journal: !!opts.journal };
    var startI = opts.turnFrom != null ? opts.turnFrom : rd.i;
    var first = startI === -1 ? pageInner({ kind: 'cover', journal: !!opts.journal }) : pageInner(list[startI]);
    U.full('<div class="book-stage"><div class="book" id="bookEl" role="document"><div class="bpage under" id="bpUnder"></div><div class="bpage top" id="bpTop">' + first + '</div></div>' +
      '<div class="book-nav"><button class="bk-btn" data-act="bk-prev" aria-label="Previous page">‹</button><span class="bk-pos" id="bkPos"></span><button class="bk-btn" data-act="bk-next" aria-label="Next page">›</button></div>' +
      '<button class="btn btn-light bk-done" data-act="ov-next" data-autofocus>' + (opts.doneLabel || 'Close the book') + '</button></div>', { bg: 'book-bg', cls: 'book-ov', onClose: function () { rd = null; root.App.render(); opts.onClose && opts.onClose(); } });
    rd.i = startI; pos();
    if (startI === -1) { var pe = document.getElementById('bkPos'); if (pe) pe.textContent = ''; }
    if (opts.turnFrom != null && opts.turnFrom !== i) setTimeout(function () { turnTo(i); }, U.calm() ? 0 : 450);
  }
  function pos() { var el = document.getElementById('bkPos'); if (el && rd) el.textContent = (rd.journal ? ST().book.journal : 'Page') + ' ' + (rd.i + 1) + ' of ' + rd.list.length; }
  function turnTo(i) {
    if (!rd || i < 0 || i >= rd.list.length || i === rd.i) return;
    if (rd.i === -1) rd.i = i - 1; // turning off the cover
    var top = document.getElementById('bpTop'), under = document.getElementById('bpUnder'); if (!top || !under) return;
    if (top.classList.contains('turning') || top.classList.contains('turning-back')) return;
    var fwd = i > rd.i; rd.i = i; pos();
    U.sfx('reveal');
    if (U.calm()) { top.innerHTML = pageInner(rd.list[i]); return; }
    if (fwd) {
      under.innerHTML = pageInner(rd.list[i]);
      top.classList.add('turning');
      setTimeout(function () { top.innerHTML = under.innerHTML; top.classList.remove('turning'); under.innerHTML = ''; }, 760);
    } else {
      under.innerHTML = top.innerHTML; top.innerHTML = pageInner(rd.list[i]);
      top.classList.add('turning-back');
      setTimeout(function () { top.classList.remove('turning-back'); under.innerHTML = ''; }, 760);
    }
  }

  /* ---------- the Book screen (Collection → Book) ---------- */
  var seg = 'story';
  function cover() {
    var s = S(), sp = spinePage(), b = ST().book;
    var path = sp ? b.paths[{ ridge: 'wanderer', hollow: 'gatherer', tower: 'guardian' }[sp.choice]] : null;
    return '<section class="bk-cover ' + (s.rpg.path ? 'path-' + s.rpg.path : '') + '"><div class="bkc-art">' + A.companion(def(), 'happy', {}) + '</div><div class="bkc-txt"><div class="bkc-kicker">' + esc(b.volumes[St.stage() >= 7 ? 2 : St.stage() >= 4 ? 1 : 0]) + '</div><h2>' + esc(bookTitle()) + '</h2><p>' + esc(title()) + (path ? ' · ' + esc(path) : '') + '</p>' +
      '<button class="btn btn-light bkc-read" data-act="bk-read" data-i="0">📖 Read from the start</button></div></section>';
  }
  function toc() {
    var list = bookList(), b = ST().book, rows = '', weeks = [], vol = -1;
    list.forEach(function (pg, i) {
      if (pg.kind === 'weekly') { weeks.push([pg, i]); return; }
      var v = pg.day >= E.GROWTH[7] ? 2 : pg.day >= E.GROWTH[4] ? 1 : 0;
      if (v !== vol) { vol = v; rows += '<div class="toc-vol">' + esc(b.volumes[v]) + '</div>'; }
      var r = render(pg);
      rows += '<button class="toc-row ' + (pg.stub ? 'stub' : '') + '" data-act="bk-read" data-i="' + i + '"><span class="toc-k">' + esc(r.kicker) + '</span><span class="toc-t">' + esc(r.title) + '</span><span class="toc-p">' + pg.day + '</span></button>';
    });
    var wk = weeks.length ? '<div class="toc-weeks"><div class="toc-wt">' + esc(b.weekly.title) + ' <span class="muted">· one page a week</span></div><div class="toc-wchips">' + weeks.map(function (w) { return '<button class="wk-chip" data-act="bk-read" data-i="' + w[1] + '" aria-label="Week ' + w[0].week + ', page ' + w[0].day + '">' + w[0].week + '</button>'; }).join('') + '</div></div>' : '';
    return rows + wk;
  }
  function journalHtml() {
    var j = journalList();
    if (!j.length) return '<div class="card"><h3>' + esc(ST().book.journal) + '</h3><p>Every quest ' + esc(S().comp.name) + ' goes on is written here, one page a day.</p></div>';
    return '<div class="card jr-list">' + j.map(function (e, i) { return { e: e, i: i }; }).reverse().map(function (x) {
      var q = ST().quests[x.e.quest];
      return '<button class="jr-row" data-act="bk-jr" data-i="' + x.i + '"><span class="jr-ic">' + q.icon + '</span><span class="grow"><span class="jr-t">' + esc(q.name) + '</span><span class="jr-chips">' + x.e.tiers.map(function (t) { return '<i class="tier-dot t-' + t + '"></i>'; }).join('') + '</span></span><span class="toc-p">' + x.e.day + '</span></button>';
    }).join('') + '</div>';
  }
  function spineCard() {
    if (!St.spineDue()) return '';
    return '<div class="card spine-card"><h3>✦ ' + esc(ST().book.ch1.title) + '</h3><p>' + esc(S().comp.name) + ' is big enough to go past the edge of ' + esc(th().terms.home.toLowerCase()) + '. You choose the way.</p><button class="btn btn-dark" data-act="bk-spine">Choose the way</button></div>';
  }
  function bookBody() {
    return cover() + spineCard() +
      '<div class="seg" role="tablist"><button role="tab" class="' + (seg === 'story' ? 'on' : '') + '" data-act="bk-seg" data-v="story">The Book</button><button role="tab" class="' + (seg === 'journal' ? 'on' : '') + '" data-act="bk-seg" data-v="journal">' + esc(ST().book.journal) + '</button></div>' +
      (seg === 'story' ? '<div class="card toc">' + toc() + '<p class="muted sm toc-note">Pages are numbered by days played. Daily quest pages live in the ' + esc(ST().book.journal) + '.</p></div>' : journalHtml());
  }
  function screen() {
    return '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Back</button><div class="title">The Book</div></div>' + bookBody() + '<div style="height:20px"></div>';
  }

  /* ---------- the day-7 spine choice ---------- */
  function spineChoice(after) {
    var b = ST().book, c = b.ch1;
    var intro = fill(c.intro).split('\n\n'), q = intro.pop();
    U.full('<div class="spine-ov"><div class="bp-paper spine-paper"><div class="bp-kicker">A new chapter</div><h2 class="bp-title">' + esc(c.title) + '</h2><div class="bp-text">' + intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '<p><b>' + esc(q) + '</b></p></div>' +
      '<div class="spine-opts">' + c.options.map(function (o) { return '<button class="spine-opt" data-act="bk-choose" data-v="' + o.id + '"><span class="so-t">' + esc(o.label) + '</span><span class="so-s">“' + esc(o.why) + '”</span></button>'; }).join('') + '</div>' +
      '<p class="spine-note">This choice shapes the story, ' + esc(S().comp.name) + '’s title and colors. It never changes stats, quests or rewards.</p></div>' +
      '<button class="btn btn-clear spine-later" data-act="ov-next">Decide later</button></div>', { bg: 'book-bg', cls: 'book-ov', onClose: function () { root.App.render(); if (after) { var f = after; after = null; f(); } } });
  }
  function choose(el) {
    var pg = St.chooseSpine(el.getAttribute('data-v')); if (!pg) return;
    var cb = null; U.closeAll();
    var list = bookList(), i = list.indexOf(list.filter(function (p) { return p.kind === 'spine' && p.ch === 1 && !p.stub; })[0]);
    // "Turn" from the page before into the new chapter
    open(list, i, { turnFrom: Math.max(0, i - 1), doneLabel: 'Close the book' });
    U.sfx('rare');
    setTimeout(function () { U.toast(esc(title()) + '. A new title, and a new chapter in the Book.'); }, 100);
    return cb;
  }

  root.BookUI = { render: render, pageInner: pageInner, open: open, bookList: bookList, journalList: journalList, spineChoice: spineChoice, title: title, bookTitle: bookTitle, body: bookBody, fill: fill };
  root.App.screens.book = screen;
  Object.assign(root.App.acts, {
    'bk-read': function (el) { open(bookList(), +el.getAttribute('data-i')); },
    'bk-jr': function (el) { open(journalList(), +el.getAttribute('data-i'), { journal: true }); },
    'bk-next': function () { if (rd) turnTo(rd.i + 1); },
    'bk-prev': function () { if (rd) turnTo(rd.i - 1); },
    'bk-seg': function (el) { seg = el.getAttribute('data-v'); root.App.render(); },
    'bk-spine': function () { spineChoice(); },
    'bk-choose': choose,
    'book': function () { U.closeAll(); root.App.go('book'); }
  });
  document.addEventListener('keydown', function (e) { if (!rd) return; if (e.key === 'ArrowRight') turnTo(rd.i + 1); if (e.key === 'ArrowLeft') turnTo(rd.i - 1); });
})(window);
