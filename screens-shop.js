/* Kindling v5.6 Part B — screens-shop.js : the Shop (Preview: no real purchases) and the Season Pass.
 * Fixed-price looks only. No premium currency, no chests or random draws, no timers, no consumables, nothing with stats,
 * no extra quest slot, no extra storage. Hidden for kid and teen profiles. Never on Today, My list or any health screen. */
(function (root) {
  'use strict';
  var St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, P = root.Progress, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  function nm() { return S().comp.name; }
  function fname(id) { return Th.findArt(th(), id).name; }
  function iname(it) { return it.names[S().theme] || it.names.expedition; }
  function price(n) { return '$' + n.toFixed(2); }
  function refresh(html) { var t = U.topOverlay(); var b = t && t.el.querySelector('.sh-body'); if (b) b.innerHTML = html; }
  function seasonName() { return S().theme === 'grove' ? 'Meadow Season' : 'Saltflats Season'; }
  var BANNER = '<div class="preview-banner" role="note">Preview: no real purchases</div>';
  var FOOT = '<div class="shop-foot"><p>[Placeholder: terms of sale]</p><p>[Placeholder: monthly spending limit]</p><p>[Placeholder: refunds and restore purchases]</p><p>[Placeholder: prices shown are examples]</p><p class="shop-spent">Spent this month (preview): $0.00 · nothing was charged</p></div>';

  function screen() {
    var s = S(), head = '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Me</button><div class="title">Shop</div></div>';
    if (!St.shopOn()) return head + '<div class="card"><h3>Not on this profile</h3><p>Kid and teen profiles don’t have a Shop. Everything that changes your games is free anyway.</p></div>';
    var owned = s.shop.owned;
    var items = P.CATALOG.filter(function (it) { return it.kind !== 'pass' && it.kind !== 'plus'; }).map(function (it) {
      var own = owned.indexOf(it.id) >= 0;
      return '<button type="button" class="shop-item" data-act="shop-item" data-id="' + it.id + '"><span class="si-comp-sm" aria-hidden="true">' + A.companion(Th.companionDef(th(), S().comp.species), 'happy', { look: it.id }) + '</span><span class="si-n">' + esc(iname(it)) + '</span><span class="si-p">' + (own ? '<span class="chip ok">Yours</span>' : price(it.price)) + '</span></button>';
    }).join('');
    var pass = P.item('pass.s1'), p = s.shop.pass;
    return head + BANNER + '<div class="page-h"><h1 style="font-size:1.6rem">Shop</h1><p>Looks and extras. Nothing here changes your games, your gear or your health record.</p></div>' +
      '<button type="button" class="card pass-card" data-act="shop-pass"><span class="si-ic" aria-hidden="true">🎫</span><span class="grow"><b>' + esc(seasonName()) + '</b><span class="muted sm" style="display:block">Step ' + p.step + ' of 30 · ' + (p.extra ? 'Season Pass: yours' : 'Free row for everyone · Season Pass ' + price(pass.price) + ' (preview)') + '</span></span>' + A.icon('chev') + '</button>' +
      '<div class="shop-grid">' + items + '</div>' +
      '<div class="card plus-card"><b>Plus · Coming later</b><p class="muted sm">Every Season Pass and a new look each month. Not in this preview.</p></div>' + FOOT + '<div style="height:20px"></div>';
  }
  function itemSheet(id) {
    var it = P.item(id), own = S().shop.owned.indexOf(id) >= 0;
    var body = '<div class="si-preview"><div class="si-comp">' + A.companion(Th.companionDef(th(), S().comp.species), 'happy', { look: id }) + '</div></div>' +
      '<p>' + esc(iname(it)) + ' · ' + price(it.price) + '. Just a look: same games, same gear, same everything else.</p>' +
      (own ? '<p class="chip ok">Yours</p>' : '<button class="btn btn-dark btn-block" data-act="shop-get" data-id="' + id + '">Get it (preview)</button>');
    U.sheet(iname(it), BANNER + body);
  }
  function confirmBody(id) { var it = P.item(id); return BANNER + '<p class="shop-confirm">Preview: this would cost ' + price(it.price) + '. You won’t be charged.</p><div class="btn-row"><button class="btn btn-dark" data-act="shop-yes" data-id="' + id + '">Get it</button><button class="btn btn-ghost" data-act="sheet-close">Cancel</button></div>'; }
  function passBody() {
    var s = S(), p = s.shop.pass, pass = P.item('pass.s1');
    var rows = P.PASS.slice(0, 10).map(function (st) {
      var reach = st.n <= p.step, fc = p.claimedFree.indexOf(st.n) >= 0, xc = p.claimedExtra.indexOf(st.n) >= 0;
      var free = st.free ? (st.free.kind === 'pick' ? 'Pick ' + (st.free.rarity === 'rare' ? 'a Rare' : 'an Uncommon') + ' ' + th().terms.find.toLowerCase() : { camp: 'A ' + th().terms.home + ' piece', look: 'A look for ' + nm() }[st.free.kind]) : '—';
      var extra = 'A look for ' + nm();
      return '<div class="ps-row' + (reach ? ' reach' : '') + '"><span class="ps-n">' + st.n + '</span>' +
        '<span class="ps-cell">' + esc(free) + (st.free && reach && !fc ? ' <button class="btn btn-soft ps-claim" data-act="pass-claim" data-row="free" data-n="' + st.n + '">Claim</button>' : fc ? ' ✓' : '') + '</span>' +
        '<span class="ps-cell ps-x">' + esc(extra) + (p.extra && reach && !xc ? ' <button class="btn btn-soft ps-claim" data-act="pass-claim" data-row="extra" data-n="' + st.n + '">Claim</button>' : xc ? ' ✓' : '') + '</span></div>';
    }).join('');
    return BANNER + '<p>Move up 1 step for each day you play. Nothing goes away. Keep going after the season, too.</p><p class="muted sm">You’re on step ' + p.step + ' of 30. Each day you play moves it. Nothing else does.</p>' +
      '<div class="ps-head"><span class="ps-n"></span><span class="ps-cell">Free</span><span class="ps-cell ps-x">Season Pass · ' + price(pass.price) + ' (preview)</span></div>' + rows +
      '<p class="muted sm">Showing steps 1 to 10 of 30 in this preview. Every Season Pass reward is a look you can wear.</p>' +
      (p.extra ? '' : '<button class="btn btn-dark btn-block" data-act="shop-get" data-id="pass.s1">Get the Season Pass (preview)</button>');
  }
  function pickSheet(n, rarity) {
    refresh('<p>Pick ' + (rarity === 'rare' ? 'a Rare' : 'an Uncommon') + ' ' + esc(th().terms.find.toLowerCase()) + '.</p><div class="opt-list">' + root.Engine.FINDS.filter(function (f) { return f.rarity === rarity; }).map(function (f) { return '<button type="button" class="opt" data-act="pass-pick" data-n="' + n + '" data-f="' + f.id + '"><span class="find-mini" style="width:32px;height:32px">' + Th.findArt(th(), f.id).icon + '</span><span><span class="o-t" style="display:block">' + esc(fname(f.id)) + '</span><span class="o-s">' + (S().found[f.id] ? 'you have ' + (S().owned[f.id] || 0) : '<b class="new-tag">New for you</b>') + '</span></span></button>'; }).join('') + '</div>');
  }
  root.ShopUI = { screen: screen, passBody: passBody };
  root.App.screens.shop = screen;
  Object.assign(root.App.acts, {
    'shop-item': function (el) { itemSheet(el.getAttribute('data-id')); },
    'shop-get': function (el) { var id = el.getAttribute('data-id'); U.closeAll(); U.sheet('Get it', confirmBody(id)); },
    'shop-yes': function (el) { var id = el.getAttribute('data-id'), r = St.purchase(id); U.closeAll(); root.App.render(); U.toast(r.ok ? (id === 'pass.s1' ? 'It’s yours! The Season Pass row is open.' : 'It’s yours! ' + esc(nm()) + ' is wearing it.') : r.why === 'owned' ? 'Already yours.' : 'Not on this profile.'); },
    'shop-pass': function () { U.sheet(seasonName(), passBody()); },
    'pass-claim': function (el) {
      var row = el.getAttribute('data-row'), n = +el.getAttribute('data-n'), st = P.PASS[n - 1];
      if (row === 'free' && st.free && st.free.kind === 'pick') { pickSheet(n, st.free.rarity); return; }
      var r = St.passClaim(row, n); root.App.render(); refresh(passBody()); if (r.ok) U.toast(r.decor ? 'A new piece for your ' + esc(th().terms.home) + '. Place it from Collection.' : 'A new look. Wear it from ' + esc(nm()) + '’s sheet.');
    },
    'pass-pick': function (el) { var r = St.passClaim('free', +el.getAttribute('data-n'), el.getAttribute('data-f')); root.App.render(); refresh(passBody()); if (r.ok) U.toast('Added ' + esc(fname(el.getAttribute('data-f'))) + ' to your ' + esc(th().terms.album) + '.'); }
  });
})(window);
