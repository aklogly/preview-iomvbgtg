/* Kindling v5.6 Part B — screens-social.js : the sample Crew (Grove: Circle). Positive-only and play-only.
 * Points come from playing any game and feeding the companion (max 2 a day). Doses and check-ins never count.
 * No per-person numbers, no "last active", no list of who didn't play. Every row is a labelled sample. */
(function (root) {
  'use strict';
  var St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, P = root.Progress, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }
  function crewWord() { return th().terms.crew || 'Crew'; }
  function nm() { return S().comp.name; }
  function fname(id) { return Th.findArt(th(), id).name; }
  function cap(r) { return r.charAt(0).toUpperCase() + r.slice(1); }
  var SPECIES_IC = { otter: '🦦', fox: '🦊', drake: '🐉' };
  function refresh(html) { var t = U.topOverlay(); var b = t && t.el.querySelector('.sh-body'); if (b) b.innerHTML = html; }
  function banner() { return '<div class="sample-banner" role="note">Sample ' + esc(crewWord().toLowerCase()) + ': not real people. Real ' + esc(crewWord().toLowerCase()) + 's come with accounts.</div>'; }

  function todayCard() {
    var s = S(); if (!s.crew || !St.crewOn() || s.settings.simple) return '';
    var w = s.crew.week, t3 = w.tiers[2];
    return '<button type="button" class="crew-card" data-act="go" data-to="crew"><span class="cc-ic" aria-hidden="true">🤝</span><span class="grow"><span class="cc-t">' + esc(crewWord()) + ': ' + w.shared + ' of ' + t3 + ' this week</span><span class="cc-s">Sample ' + esc(crewWord().toLowerCase()) + '</span></span>' + A.icon('chev') + '</button>';
  }
  function screen() {
    var s = S(), c = s.crew;
    var head = '<div class="nav-h"><button class="back" data-act="back">' + A.icon('back') + 'Back</button><div class="title">' + esc(crewWord()) + '</div></div>';
    if (!St.crewOn()) return head + '<div class="card"><h3>' + esc(crewWord()) + 's are for grown-up profiles</h3><p>Kid and teen profiles play on their own. Everything else works the same.</p></div>';
    if (!c) return head + banner() + '<div class="card"><h3>Play alongside a ' + esc(crewWord().toLowerCase()) + '</h3><p>A ' + esc(crewWord().toLowerCase()) + ' shares one goal each week. Everyone can add up to 2 points a day: 1 for playing any game, 1 for feeding ' + esc(nm()) + '. Everyone gets every reward.</p><p class="muted sm">Medicines and check-ins never count, and nobody sees who did what.</p><button class="btn btn-dark btn-block" style="margin-top:12px" data-act="crew-join">Join the sample ' + esc(crewWord().toLowerCase()) + '</button></div>';
    var w = c.week, max = w.tiers[2], pct = Math.min(100, Math.round(100 * w.shared / max)), mine = (w.mineDay === s.day ? (w.mineToday.game || 0) + (w.mineToday.feed || 0) : 0);
    var claim = P.crewClaimable(s, s.day);
    var prize = [': pick an Uncommon', ': pick a Rare', ': a Rare and a ' + crewWord().toLowerCase() + ' banner'];
    var tiers = w.tiers.map(function (t, i) { return '<span class="ct-tier' + (w.shared >= t ? ' on' : '') + (w.claimed[i] ? ' got' : '') + '" aria-label="' + t + ' points' + esc(prize[i]) + '">' + t + esc(prize[i]) + (w.claimed[i] ? ' ✓' : '') + '</span>'; }).join('');
    var members = '<div class="cr-members">' + c.members.map(function (m) { return '<div class="cr-m"><span class="cr-sp" aria-hidden="true">' + (SPECIES_IC[m.species] || '🐾') + '</span><span class="grow">' + esc(m.handle) + '</span><span class="sample-tag">sample</span></div>'; }).join('') + '<div class="cr-m"><span class="cr-sp" aria-hidden="true">' + (SPECIES_IC[s.comp.species] || '🐾') + '</span><span class="grow">' + esc(nm()) + ' (you)</span></div></div>';
    var sentToday = c.gifts.sentDay === s.day;
    var moments = P.liveMoments(c, s.day).map(function (m) {
      return '<div class="cr-mo"><div class="cr-mo-t"><span aria-hidden="true">' + (SPECIES_IC[m.species] || '🐾') + '</span> ' + esc(m.text) + (m.mine ? '' : ' <span class="sample-tag">sample</span>') + '</div>' +
        (m.mine ? '<div class="muted sm">' + m.cheers + ' cheer' + (m.cheers === 1 ? '' : 's') + '</div>' : '<div class="cr-cheers"><button type="button" class="btn btn-soft cr-cheer' + (m.cheered ? ' on' : '') + '" data-act="crew-cheer" data-m="' + m.id + '" data-v="Cheer"' + (m.cheered ? ' disabled' : '') + '>' + (m.cheered ? '🎉 Cheered' : '🎉 Cheer') + '</button><span class="muted sm">' + m.cheers + ' cheer' + (m.cheers === 1 ? '' : 's') + '</span></div>') + '</div>';
    }).join('');
    return head + banner() +
      '<div class="card cr-goal"><h3>' + esc(c.name.replace(/Crew$/, crewWord())) + '</h3><p class="cr-big">This week together: ' + w.shared + ' of ' + max + ' points</p><div class="cr-meter" role="img" aria-label="' + w.shared + ' of ' + max + ' points"><i style="width:' + pct + '%"></i></div><div class="cr-tiers">' + tiers + '</div>' +
      '<p class="muted sm">Everyone can add up to 2 points a day: 1 for playing any game, 1 for feeding ' + esc(nm()) + '. Everyone gets every reward.</p><p class="cr-mine">You added ' + mine + ' today.</p>' +
      (claim ? '<button class="btn btn-cta btn-block" data-act="crew-claim" data-t="' + claim.key + '">' + esc(crewWord()) + ' reward ready! Pick ' + (P.TIER_REWARD[claim.tier].rarity === 'uncommon' ? 'an Uncommon' : 'a Rare') + ' ' + esc(th().terms.find.toLowerCase()) + '.' + (claim.key.charAt(0) === 'c' ? ' (from an earlier week)' : '') + '</button>' : '') + '</div>' +
      '<div class="card"><h3>Gifts</h3>' + (c.gifts.inbox.length ? '<button class="btn btn-dark btn-block" data-act="crew-gifts-in">Gifts for you (' + c.gifts.inbox.length + ')</button>' : '<p class="muted sm">No gifts waiting.</p>') +
      '<button class="btn btn-soft btn-block" style="margin-top:8px" data-act="crew-gift"' + (sentToday ? ' disabled' : '') + '>Send a spare</button>' + (sentToday ? '<p class="muted sm">You sent today’s gift. You can send another tomorrow.</p>' : '') + '</div>' +
      '<div class="card"><h3>Moments</h3>' + (moments || '<p class="muted sm">Shared moments show here for a week.</p>') + '</div>' +
      '<div class="card"><h3>Members</h3>' + members + '<p class="muted sm">Only names and buddies. Never levels, days or anything about health.</p></div><div style="height:20px"></div>';
  }
  function giftPick() {
    var s = S(), list = root.Engine.FINDS.filter(function (f) { return (f.rarity === 'common' || f.rarity === 'uncommon') && P.spares(s, f.id) > 0; });
    U.sheet('Send a spare', '<p>Pick a spare to send to a crew mate. You can send 1 a day.</p>' + (list.length ? '<div class="opt-list">' + list.map(function (f) { return '<button type="button" class="opt" data-act="crew-gift-pick" data-f="' + f.id + '"><span class="find-mini" style="width:32px;height:32px">' + Th.findArt(th(), f.id).icon + '</span><span><span class="o-t" style="display:block">' + esc(fname(f.id)) + '</span><span class="o-s">' + cap(f.rarity) + ' · ' + P.spares(s, f.id) + ' spare' + (P.spares(s, f.id) === 1 ? '' : 's') + '</span></span></button>'; }).join('') + '</div>' : '<p class="muted">No Common or Uncommon spares right now. Your first copies always stay with you.</p>'));
  }
  function claimPick(key) {
    var c = P.crewClaimable(S(), S().day); if (!c || c.key !== key) return; var tier = key, r = P.TIER_REWARD[c.tier].rarity;
    U.sheet('Pick ' + (r === 'uncommon' ? 'an Uncommon' : 'a Rare') + ' ' + th().terms.find.toLowerCase(), '<div class="opt-list">' + root.Engine.FINDS.filter(function (f) { return f.rarity === r; }).map(function (f) { var n = S().owned[f.id] || 0; return '<button type="button" class="opt" data-act="crew-claim-pick" data-t="' + tier + '" data-f="' + f.id + '"><span class="find-mini" style="width:32px;height:32px">' + Th.findArt(th(), f.id).icon + '</span><span><span class="o-t" style="display:block">' + esc(fname(f.id)) + '</span><span class="o-s">' + (S().found[f.id] ? 'you have ' + n : '<b class="new-tag">New for you</b>') + '</span></span></button>'; }).join('') + '</div>');
  }
  root.SocialUI = { todayCard: todayCard, screen: screen };
  root.App.screens.crew = screen;
  Object.assign(root.App.acts, {
    'crew-join': function () { St.joinCrew(); root.App.render(); U.toast('You joined the sample ' + esc(crewWord().toLowerCase()) + '.'); },
    'crew-cheer': function (el) { if (St.cheer(el.getAttribute('data-m'), el.getAttribute('data-v'))) { root.App.render(); U.toast('Cheered!'); } },
    'crew-gift': giftPick,
    'crew-gift-pick': function (el) {
      var f = el.getAttribute('data-f'); refresh('<p>Who gets your ' + esc(fname(f)) + '?</p><div class="opt-list">' + S().crew.members.map(function (m) { return '<button type="button" class="opt" data-act="crew-gift-send" data-f="' + f + '" data-h="' + esc(m.handle) + '"><span aria-hidden="true">' + (SPECIES_IC[m.species] || '🐾') + '</span><span class="o-t">' + esc(m.handle) + '</span><span class="sample-tag">sample</span></button>'; }).join('') + '</div>');
    },
    'crew-gift-send': function (el) { var f = el.getAttribute('data-f'), h = el.getAttribute('data-h'), r = St.giftSpare(f, h); U.closeAll(); root.App.render(); U.toast(r.ok ? 'Sent! ' + esc(h) + ' got your ' + esc(fname(f)) + '.' : r.why === 'oneADay' ? 'You sent today’s gift. You can send another tomorrow.' : 'That one can’t be sent.'); },
    'crew-gifts-in': function () { var got = St.giftsIn(); root.App.render(); if (got.length) U.toast(got.map(function (g) { return esc(g.from) + ' sent you a ' + esc(fname(g.id)) + '.'; }).join(' ')); else U.toast('3 gifts a day. The rest wait for tomorrow.'); },
    'crew-claim': function (el) { claimPick(el.getAttribute('data-t')); },
    'crew-claim-pick': function (el) { var r = St.crewClaim(el.getAttribute('data-t'), el.getAttribute('data-f')); U.closeAll(); root.App.render(); if (r.ok) U.toast('Added ' + esc(fname(r.id)) + ' to your ' + esc(th().terms.album) + '.'); },
    'crew-share': function (el) { St.shareMoment(el.getAttribute('data-kind'), nm() + ' ' + el.getAttribute('data-t')); U.toast('Shared with your ' + esc(crewWord().toLowerCase()) + '.'); el.disabled = true; }
  });
})(window);
