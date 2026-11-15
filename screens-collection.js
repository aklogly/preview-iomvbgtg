/* Kindling v5 — screens-collection.js : album (sets of 9), Home (place decor), chests (open, odds, pity, history). */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  var seg = 'album';
  var RCOL = { common: '#ffffff', uncommon: '#7cc8ff', rare: '#b48cff', epic: '#ffcc33' };

  function albumHtml() {
    var tm = th(), owned = S().owned, total = 0;
    var sets = tm.sets.map(function (set, si) {
      var have = 0, cells = '';
      for (var i = 1; i <= 9; i++) {
        var id = 's' + (si + 1) + '-' + i, f = E.FIND_BY_ID[id], n = owned[id] || 0, a = Th.findArt(tm, id);
        if (n) have++;
        cells += '<button class="find r-' + f.rarity + (n ? '' : ' locked') + '" data-act="find" data-f="' + id + '" aria-label="' + esc(n ? a.name + ', ' + f.rarity : 'Not found yet, ' + f.rarity) + '"><span class="em">' + a.icon + '</span><span class="nm">' + esc(n ? a.name : '???') + '</span>' + (n > 1 ? '<span class="cnt">x' + n + '</span>' : '') + '</button>';
      }
      total += have;
      return '<section class="set-card"><div class="set-head"><h3>' + esc(set.name) + '</h3><span class="count">' + have + ' of 9' + (have === 9 ? ' ✓' : '') + '</span></div><div class="find-grid">' + cells + '</div>' +
        (have === 9 ? '' : '<p class="muted" style="font-size:.82rem;font-weight:700;margin-top:8px">Finish the set for a set ' + esc(tm.terms.chest.toLowerCase()) + ' and a trophy for your ' + esc(tm.terms.home) + '.</p>') + '</section>';
    }).join('');
    return '<div class="row" style="margin:0 16px 12px"><p class="grow muted" style="font-weight:700">' + total + ' of 36 ' + esc(tm.terms.finds) + ' found</p><button class="btn btn-soft" data-act="album-info">' + A.icon('info') + ' How it works</button></div>' + sets;
  }
  function homeHtml() {
    var s = S(), tm = th(), slots = '';
    for (var i = 0; i < 9; i++) {
      var d = s.placed[i] && tm.decor.filter(function (x) { return x.id === s.placed[i]; })[0];
      slots += '<button class="slot ' + (d ? 'filled' : '') + '" data-act="slot" data-i="' + i + '" aria-label="' + (d ? esc(d.name) : 'Empty spot') + '">' + (d ? d.icon : '<span class="plus">+</span>') + '</button>';
    }
    var inv = tm.decor.map(function (d) {
      var own = s.decorOwned.indexOf(d.id) >= 0;
      return '<div class="list-row"><span style="font-size:2rem;width:44px;text-align:center">' + d.icon + '</span><div class="grow"><div style="font-weight:800">' + esc(d.name) + '</div><div class="muted" style="font-size:.85rem;font-weight:700">' + (own ? 'Yours' : d.cost + ' ★') + '</div></div>' +
        (own ? '<span class="chip ok">✓ Owned</span>' : '<button class="btn btn-soft" data-act="buy" data-d="' + d.id + '" data-c="' + d.cost + '" ' + (s.stars < d.cost ? 'disabled style="opacity:.5"' : '') + '>Get</button>') + '</div>';
    }).join('');
    return '<div class="home-scene">' + A.scenery(s.theme) + '<div class="home-comp">' + A.companion(Th.companionDef(tm, s.comp.species), 'happy') + '</div><div class="home-grid">' + slots + '</div></div>' +
      '<p class="muted" style="margin:0 16px 12px;font-weight:700;font-size:.9rem">Tap a spot to place something. Move things around anytime.</p>' +
      '<div class="card"><h3>Pieces</h3><p>Spend Stars on pieces for your ' + esc(tm.terms.home) + '. You have ' + U.fmtNum(s.stars) + ' ★.</p>' + inv + '</div>';
  }
  function chestsHtml() {
    var s = S(), tm = th();
    var waiting = s.chests.filter(function (c) { return !c.opened; });
    var hist = s.chests.filter(function (c) { return c.opened; }).slice().reverse().slice(0, 12);
    var pityLeft = E.PITY_EVERY - s.pity;
    var pend = s.chests.filter(function (c) { return c.opened && c.choose && !c.picked; }).map(function (c) { return '<div class="list-row"><div class="chest-mini">' + A.chest(c.type) + '</div><div class="grow"><div style="font-weight:900">' + E.CHESTS[c.type].label + ' ' + esc(tm.terms.chest) + '</div><div class="muted" style="font-size:.85rem;font-weight:700">A “choose 1 of 3” is waiting</div></div><button class="btn btn-dark" data-act="cc-open" data-c="' + c.id + '">Choose</button></div>'; }).join('');
    var w = pend + waiting.map(function (c) { return '<div class="list-row"><div class="chest-mini">' + A.chest(c.type) + '</div><div class="grow"><div style="font-weight:900">' + E.CHESTS[c.type].label + ' ' + esc(tm.terms.chest) + '</div><div class="muted" style="font-size:.85rem;font-weight:700">' + srcLabel(c.source) + '</div></div><button class="btn btn-dark" data-act="chest-open" data-c="' + c.id + '">Open</button></div>'; }).join('');
    var h = hist.map(function (c) {
      var r = c.result || { finds: [] };
      return '<button type="button" class="list-row list-btn" data-act="chest-past" data-c="' + c.id + '"><div class="chest-mini" style="width:44px;height:40px;flex-basis:44px">' + A.chest(c.type) + '</div><div class="grow"><div style="font-weight:800">' + E.CHESTS[c.type].label + ' · ' + srcLabel(c.source) + '</div><div style="font-size:1.2rem">' + r.finds.map(function (f) { return '<span class="find-mini">' + Th.findArt(tm, f.id).icon + '</span>'; }).join(' ') + '</div></div><span class="muted" style="font-weight:800;font-size:.85rem">' + E.fmtDate(c.openedDay || c.day) + '</span></button>';
    }).join('');
    return (w ? '<div class="card"><h3>Ready to open</h3>' + w + '</div>' : '<div class="card"><h3>No ' + esc(tm.terms.chest.toLowerCase()) + 's waiting</h3><p>Today’s games and goals bring more. Nothing here ever expires.</p></div>') +
      '<div class="card"><div class="row"><div class="grow"><h3>Rare guarantee</h3><p>A rare or better is guaranteed within the next <b>' + pityLeft + '</b> ' + esc(tm.terms.chest.toLowerCase()) + (pityLeft === 1 ? '' : 's') + '.</p></div><button class="btn btn-soft" data-act="odds" aria-label="Chest odds">' + A.icon('info') + ' Odds</button></div></div>' +
      '<div class="card"><h3>History</h3>' + (h || '<p>Your opened ' + esc(tm.terms.chest.toLowerCase()) + 's will show here.</p>') + '</div>';
  }
  function srcLabel(src) { var tm = th(); return { run: 'From today’s ' + tm.terms.run, game: 'From today’s games', first: 'Your first ' + tm.terms.chest.toLowerCase(), welcome: 'Welcome-back gift', boss: 'Boss Day', draw: 'Draw night', quest: 'Quest' }[src] || (/^campfire-(\d+)/.test(src || '') ? tm.camp.dayLabel(+/^campfire-(\d+)/.exec(src)[1]) : 'Reward'); }

  function render() {
    var tm = th();
    return '<div class="page-h"><h1>Collection</h1><p>Your ' + esc(tm.terms.finds) + ', your ' + esc(tm.terms.home) + ', your ' + esc(tm.terms.chest.toLowerCase()) + 's</p></div>' +
      '<div class="seg" role="tablist"><button role="tab" class="' + (seg === 'book' ? 'on' : '') + '" data-act="cseg" data-v="book">Book</button><button role="tab" class="' + (seg === 'album' ? 'on' : '') + '" data-act="cseg" data-v="album">' + esc(tm.terms.album) + '</button><button role="tab" class="' + (seg === 'home' ? 'on' : '') + '" data-act="cseg" data-v="home">' + esc(tm.terms.home) + '</button><button role="tab" class="' + (seg === 'chests' ? 'on' : '') + '" data-act="cseg" data-v="chests">' + esc(tm.terms.chest) + 's</button></div>' +
      (seg === 'book' && root.BookUI ? root.BookUI.body() : seg === 'album' ? albumHtml() : seg === 'home' ? homeHtml() : chestsHtml()) + '<div style="height:20px"></div>';
  }

  function oddsHtml() {
    var rows = Object.keys(E.CHESTS).map(function (k) { var c = E.CHESTS[k], w = c.weights; return '<tr><td><b>' + c.label + '</b></td><td>' + c.finds + '</td><td>' + w.common + '%</td><td>' + w.uncommon + '%</td><td>' + w.rare + '%</td><td>' + w.epic + '%</td></tr>'; }).join('');
    return '<table class="odds-table"><thead><tr><th>Chest</th><th>Finds</th><th>Common</th><th>Uncom.</th><th>Rare</th><th>Epic</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<ul style="padding-left:20px;margin-top:12px;font-weight:600;color:var(--ink-2)"><li>Odds are per find.</li><li>Gold always includes a rare or better and a power-up.</li><li>If 9 in a row have no rare, the 10th guarantees one.</li><li>Duplicates are saved as Scraps for crafting a missing find later.</li><li>Epic and Legendary chests also let you choose 1 of 3 pieces of gear. No luck, and never one you own.</li><li>A 3-star Run pays Silver. Gold is for the weekly headline and milestones.</li><li>Chests are earned only. Nothing is for sale, ever.</li></ul>';
  }

  /* ---------- the big chest opening ---------- */
  function chestFx(id, after) {
    var s = S(), tm = th(), c = s.chests.filter(function (x) { return x.id === id; })[0]; if (!c || c.opened) return;
    if (document.getElementById('chestStage')) return; // one chest opening at a time (double-tap safe)
    var label = E.CHESTS[c.type].label;
    U.full('<button class="sh-close" style="position:absolute;right:14px;top:14px;width:48px;height:48px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;display:grid;place-items:center;cursor:pointer" data-act="odds" aria-label="Odds">' + A.icon('info') + '</button>' +
      '<div class="rays" style="opacity:.6"></div><div class="f-title">' + label + ' ' + esc(tm.terms.chest) + '</div><div class="f-sub" id="chestHint">Tap to open</div>' +
      '<button class="chest-stage" id="chestStage" data-act="chest-tap" data-c="' + id + '" style="border:0;background:none;cursor:pointer" aria-label="Open the chest">' + A.chest(c.type) + '<i class="flare" id="chestFlare"></i></button>' +
      '<div class="reveal-cards" id="revealCards"></div><div class="loot-line" id="lootLine"></div><div class="f-sub" id="pityLine" style="font-size:.9rem"></div>' +
      '<div class="f-actions" id="chestActs"></div>', { bg: s.theme === 'grove' ? 'grove-bg' : 'dark', onClose: function () { root.App.render(); after && after(); } });
    U.sfx('tap');
  }
  function chestTap(el) {
    var id = el.getAttribute('data-c'), stage = document.getElementById('chestStage');
    if (!stage || stage.getAttribute('data-busy')) return;
    stage.setAttribute('data-busy', '1');
    var r = St.openChest(id); if (!r) return;
    var tm = th(), best = r.result.finds.reduce(function (m, f) { return E.rarityRank(f.rarity) > E.rarityRank(m) ? f.rarity : m; }, 'common');
    $id('chestHint').textContent = 'Opening…';
    var calm = U.calm();
    function $id(x) { return document.getElementById(x) || { textContent: '', innerHTML: '', style: {}, appendChild: function () { } }; }
    stage.classList.add('shake'); U.haptic([10, 60, 10, 60, 20]);
    setTimeout(function () {
      if (!document.body.contains(stage)) return;
      stage.classList.remove('shake'); stage.classList.add('open');
      var fl = document.getElementById('chestFlare'); if (fl) fl.style.background = RCOL[best];
      U.sfx(E.rarityRank(best) >= 2 ? 'rare' : 'chest'); U.haptic([30, 30, 60]);
      U.burstAt(stage, { n: E.rarityRank(best) >= 2 ? 70 : 40, spread: 200, wave: true, waveColor: RCOL[best] });
      $id('chestHint').textContent = E.rarityRank(best) >= 2 ? 'A ' + best + ' find!' : 'Here’s what’s inside';
      var cards = $id('revealCards'); if (!document.getElementById('revealCards')) return;
      r.result.finds.forEach(function (f, i) {
        var a = Th.findArt(tm, f.id);
        var d = document.createElement('div'); d.className = 'rcard r-' + f.rarity; d.style.animationDelay = (i * 140) + 'ms';
        d.innerHTML = '<div class="rc-in"><div class="rc-face rc-back">?</div><div class="rc-face rc-front"><span class="em">' + a.icon + '</span><span class="nm">' + esc(a.name) + '</span><span class="tag">' + f.rarity.toUpperCase() + (f.dup ? ' · DUPLICATE' : ' · NEW') + '</span></div></div>';
        cards.appendChild(d);
        setTimeout(function () { d.classList.add('flipped'); U.sfx('reveal'); if (E.rarityRank(f.rarity) >= 2) U.burstAt(d, { n: 24, spread: 90, colors: [RCOL[f.rarity], '#fff'] }); }, calm ? 0 : 600 + i * 450);
      });
      setTimeout(function () {
        $id('lootLine').innerHTML = '<span>+' + r.result.stars + ' ★</span>' + (r.powerUp && !r.powerUp.converted ? '<span><i class="find-mini">' + tm.powerUps[r.powerUp.type].icon + '</i> +1 ' + esc(tm.powerUps[r.powerUp.type].name) + '</span>' : '');
        if (r.result.pityTriggered) $id('pityLine').textContent = 'Rare guarantee used. The counter starts fresh.';
        var cc = S().chests.filter(function (x) { return x.id === id; })[0];
        $id('chestActs').innerHTML = cc && cc.choose && !cc.picked ? '<button class="btn btn-light" data-act="cc-open" data-c="' + id + '" data-autofocus>Choose 1 of 3 ' + (cc.type === 'legendary' ? 'Legendary' : 'Epic') + ' pieces</button><button class="btn btn-clear" data-act="ov-next">Later</button>' : '<button class="btn btn-light" data-act="ov-next" data-autofocus>Collect</button>';
        var b = document.querySelector('#chestActs button'); if (b) b.focus();
        U.announce('Chest opened. ' + r.result.finds.length + ' finds and ' + r.result.stars + ' Stars.');
      }, calm ? 50 : 800 + r.result.finds.length * 450);
    }, calm ? 50 : 1500);
  }

  function findSheet(id) {
    var tm = th(), f = E.FIND_BY_ID[id], n = S().owned[id] || 0, a = Th.findArt(tm, id);
    U.sheet(n ? a.name : 'Not found yet', '<div style="text-align:center"><div class="big-item" style="margin:4px auto 12px;width:120px;height:120px;font-size:4rem;animation:none' + (n ? '' : ';filter:grayscale(1);opacity:.4') + '">' + a.icon + '</div>' +
      '<span class="rar ' + f.rarity + '">' + f.rarity + '</span><p class="muted" style="margin-top:8px;font-weight:700">' + esc(a.setName) + ' set · #' + f.idx + ' of 9' + (n > 1 ? ' · you have ' + n : '') + '</p>' +
      '<p style="margin-top:8px;font-weight:600">' + (n ? 'Found on a ' + esc(tm.terms.run) + ', a ' + esc(tm.terms.trip) + ' or in a ' + esc(tm.terms.chest.toLowerCase()) + '.' : 'Could turn up on any ' + esc(tm.terms.run) + ', ' + esc(tm.terms.trip) + ' or ' + esc(tm.terms.chest.toLowerCase()) + '.') + '</p></div>');
    if (n) St.questDone('album');
  }

  root.CollectionUI = { render: render, chestFx: chestFx, oddsHtml: oddsHtml, setSeg: function (v) { seg = v; } };
  root.App.screens.collection = render;
  Object.assign(root.App.acts, {
    cseg: function (el) { seg = el.getAttribute('data-v'); root.App.render(); },
    find: function (el) { findSheet(el.getAttribute('data-f')); },
    'album-info': function () { var tm = th(); U.sheet('How the ' + tm.terms.album + ' works', '<ul style="padding-left:20px;font-weight:600;color:var(--ink-2);line-height:1.6"><li>' + esc(tm.terms.finds) + ' come in sets of 9: four common, three uncommon, one rare, one epic.</li><li>They turn up on your ' + esc(tm.terms.run) + ', ' + esc(tm.terms.trip) + 's and ' + esc(tm.terms.chest.toLowerCase()) + 's.</li><li>Finish a set for a set ' + esc(tm.terms.chest.toLowerCase()) + ' and a trophy for your ' + esc(tm.terms.home) + '.</li><li>Duplicates become Scraps. Later you can trade them with friends or craft any find you’re missing, so every set can be finished.</li><li>Change your look in Me and every ' + esc(tm.terms.find.toLowerCase()) + ' re-skins. You keep all of it.</li></ul>'); },
    slot: function (el) {
      var i = +el.getAttribute('data-i'), s = S(), tm = th();
      var opts = s.decorOwned.map(function (id) { var d = tm.decor.filter(function (x) { return x.id === id; })[0]; return d ? '<button class="opt" data-act="place" data-i="' + i + '" data-d="' + d.id + '"><span style="font-size:2rem">' + d.icon + '</span><span class="o-t">' + esc(d.name) + '</span></button>' : ''; }).join('');
      U.sheet('Place something here', '<div class="opt-list">' + opts + (s.placed[i] ? '<button class="opt" data-act="place" data-i="' + i + '" data-d=""><span style="font-size:2rem">↩️</span><span class="o-t">Clear this spot</span></button>' : '') + '</div>');
    },
    place: function (el) { var d = el.getAttribute('data-d'), i = el.getAttribute('data-i'); if (d) { var r = St.placeDecor(i, d); U.closeAll(); root.App.render(); var sl = document.querySelector('.slot[data-i="' + i + '"]'); U.burstAt(sl, { n: 18, spread: 70 }); U.sfx('reveal'); if (r.quest) U.toast('Quest done: ' + esc(Th.fill(r.quest.text, th())) + ' +' + r.quest.reward.stars + ' ★'); } else { delete S().placed[i]; St.save(); U.closeAll(); root.App.render(); } },
    buy: function (el) { if (St.buyDecor(el.getAttribute('data-d'), +el.getAttribute('data-c'))) { root.App.render(); U.toast('It’s yours. Tap a spot to place it.'); U.sfx('reveal'); } },
    'chest-open': function (el) { chestFx(el.getAttribute('data-c')); },
    'chest-past': function (el) {
      var tm = th(), c = S().chests.filter(function (x) { return x.id === el.getAttribute('data-c'); })[0]; if (!c) return;
      var r = c.result || { finds: [] };
      U.sheet(E.CHESTS[c.type].label + ' ' + tm.terms.chest, '<p class="muted" style="font-weight:700">' + esc(srcLabel(c.source)) + ' · opened ' + esc(E.fmtDate(c.openedDay || c.day)) + '</p><div class="opt-list">' + r.finds.map(function (f) { var a = Th.findArt(tm, f.id); return '<button class="opt" data-act="find" data-f="' + f.id + '"><span style="font-size:1.6rem">' + a.icon + '</span><span><span class="o-t" style="display:block">' + esc(a.name) + '</span><span class="o-s">' + f.rarity + (f.dup ? ' · duplicate' : '') + '</span></span></button>'; }).join('') + '</div>' + (r.stars ? '<p style="font-weight:800;margin-top:10px">+' + r.stars + ' ★</p>' : ''));
    },
    'chest-tap': chestTap,
    odds: function () { U.sheet('Chest odds', oddsHtml(), { sub: 'Plain and simple. Same for everyone.' }); }
  });
})(window);
