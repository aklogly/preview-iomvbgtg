/* Kindling v5.5 — screens-games.js : "Today's games" card, the game intro (difficulty) sheet, the game host and the
 * leaderboard screen. Built against the arcade contract (games doc §11): XGame.mount(el, cfg) -> { destroy, getState },
 * Arcade.toBoardEntry(result), LeaderboardSim.board(...) / .band(...). Degrades gracefully when a game isn't loaded.
 * Dose-blind: nothing here reads the medicine list, the record or Spark. Power-ups only ever change Finds, never a score or a board. */
(function (root) {
  'use strict';
  var E = root.Engine, St = root.Store, A = root.Art, U = root.UI, Th = root.Theme, esc = U.esc;
  function S() { return St.S; }
  function th() { return Th.T(S()); }

  var NAMES = { trail: { expedition: 'The Trail', grove: 'Garden Path' }, word: { expedition: 'Rune Stones', grove: 'Petal Words' }, memory: { expedition: 'Field Notes', grove: 'Firefly Pairs' } };
  var BLURB = { trail: 'Find the shortest path to all 3 stars. Grab finds on the way.', word: 'Find the hidden word from the letter tray. The clue helps.', memory: 'Turn cards to find the pairs. Fewer repeat misses is better.' };
  var ICON = { trail: '🧭', word: '🪨', memory: '📓' };
  var ICON_G = { trail: '🌷', word: '🌸', memory: '✨' };
  var DIFFS = ['easy', 'normal', 'hard'], DLABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
  var RUN_DIFF = { easy: 'stroll', normal: 'trek', hard: 'summit' };
  var GAME_ORDER = ['trail', 'word', 'memory'];

  function gameApi(g) {
    if (root.Arcade && root.Arcade.games && root.Arcade.games[g] && typeof root.Arcade.games[g].mount === 'function') return root.Arcade.games[g];
    return g === 'trail' ? root.RunGame : g === 'word' ? root.WordGame : root.MemoryGame;
  }
  function available(g) { if (g === 'trail') return true; var api = gameApi(g); return !!(api && typeof api.mount === 'function'); }
  function games() { return GAME_ORDER.filter(available); }
  function name(g) { var t = S().theme === 'grove' ? 'grove' : 'expedition'; if (root.Arcade && typeof root.Arcade.gameName === 'function') { try { var n = root.Arcade.gameName(g, t); if (n && n !== g) return n; } catch (e) { } } return NAMES[g][t]; }
  function icon(g) { return (S().theme === 'grove' ? ICON_G : ICON)[g]; }
  function diffOf(g) { var d = (S().settings.gameDiff || {})[g]; return DIFFS.indexOf(d) >= 0 ? d : 'easy'; }
  function today() { return S().today || {}; }
  function played(g, d) { var b = today().boards || {}; return d ? b[St.gameKey(g, d)] : DIFFS.map(function (x) { return b[St.gameKey(g, x)]; }).filter(Boolean)[0]; }
  function paid(g) { return (today().paidGames || []).indexOf(g) >= 0; }
  function stars(n) { var o = ''; for (var i = 0; i < 3; i++) o += i < n ? '★' : '☆'; return o; }
  function boardsOn() { return !St.isKid() && S().settings.boards !== false; }
  function suggest() { var g = games(); for (var i = 0; i < g.length; i++) if (!paid(g[i])) return g[i]; return g[0]; }

  /* ---------- Today's games card ---------- */
  var KIND = { trail: 'Path puzzle', word: 'Word puzzle', memory: 'Memory pairs' };
  function tile(g, badge) {
    var p = played(g), d = diffOf(g), st;
    if (p) st = '<span class="gt-st done">' + stars(p.stars) + '</span><span class="gt-sub">Played · ' + DLABEL[d] + '</span>';
    else st = '<span class="gt-st">▶ Play</span><span class="gt-sub">' + DLABEL[d] + '</span>';
    var label = name(g) + ', ' + KIND[g] + ', ' + DLABEL[d] + (p ? ', played, ' + p.stars + ' of 3 stars' : ', not played yet') + (badge ? '. Starts today’s chest' : '');
    return '<button type="button" class="game-tile' + (p ? ' played' : '') + '" data-act="game-intro" data-g="' + g + '" aria-label="' + esc(label) + '">' + (badge ? '<span class="gt-badge">Starts today’s ' + esc(th().terms.chest.toLowerCase()) + '</span>' : '') +
      '<span class="gt-art" aria-hidden="true">' + icon(g) + '</span><span class="gt-name">' + esc(name(g)) + '</span><span class="gt-kind">' + KIND[g] + '</span>' + st + '</button>';
  }
  // The Campfire line lives here because a game lights it. Feed is one tap by the companion in the hero.
  function campLine() {
    if (!root.CampUI || !St.campOn() || !S().today) return '';
    var c = S().camp, t = th().camp, lit = E.campLitOn(c, S().day), rest = E.campResting(c, S().day);
    var txt = rest ? 'Resting until ' + E.fmtDate(c.rest.until) : lit ? (c.count ? 'Day ' + c.count + ' · ' : '') + t.lit : c.count ? 'Day ' + c.count + ' · Play any game to ' + t.today : c.best ? t.ready + '. Best ever: ' + c.best + ' day' + (c.best === 1 ? '' : 's') + '.' : 'Play any game to ' + t.today;
    var rl = root.CampUI.relightHtml ? root.CampUI.relightHtml() : '';
    var note = root.CampUI.noteLine ? root.CampUI.noteLine() : '';
    return note + '<div class="gc-line"><button type="button" class="gc-link" data-act="camp-sheet"><span aria-hidden="true">' + t.icon + '</span> ' + esc(txt) + '</button></div>' + (rl ? '<div class="gc-relight">' + rl + '</div>' : '');
  }
  function drawLine() {
    if (St.isKid()) return '';
    var s = S(), dn = E.drawNightDay(s.day);
    return '<button type="button" class="gc-link gc-draw" data-act="go" data-to="draw"><span aria-hidden="true">🎟️</span> ' + s.tickets + ' ticket' + (s.tickets === 1 ? '' : 's') + ' · Grand Draw ' + esc(E.fmtDate(dn)) + ' ›</button>';
  }
  function card() {
    var s = S(), list = games(), t = today();
    if (s.settings.simple) {
      var p = played('trail');
      return '<div class="card gc-simple"><div class="row"><div class="grow"><h3>' + esc(name('trail')) + ' <span class="muted" style="font-weight:600">(optional)</span></h3><p>' + (p ? stars(p.stars) + ' Played today. New board tomorrow.' : 'A short path puzzle, whenever you like.') + '</p></div><button class="btn btn-soft" data-act="game-intro" data-g="trail">' + (p ? 'Open' : 'Play') + '</button></div></div>';
    }
    var nPaid = (t.paidGames || []).length, allDone = list.length > 1 && list.every(function (g) { return played(g); }), sug = nPaid ? null : suggest();
    var head = '<div class="gc-h"><h2>Today’s games</h2>' + (boardsOn() ? '<button type="button" class="gc-lb" data-act="go" data-to="leaderboard">🏆 Leaderboards ›</button>' : '') + '</div>';
    if (allDone) return '<section class="games-card all" aria-label="Today’s games">' + head + '<button type="button" class="gc-alldone" data-act="game-intro" data-g="' + list[0] + '">✓ All ' + list.length + ' games played · New ones tomorrow</button>' + campLine() + drawLine() + '</section>';
    return '<section class="games-card" aria-label="Today’s games">' + head + '<div class="gc-tiles n' + list.length + '">' + list.map(function (g) { return tile(g, g === sug && !played(g)); }).join('') + '</div>' +
      campLine() + drawLine() + '</section>';
  }

  /* ---------- one intro only: the game's own. A tile tap mounts the game at the remembered difficulty; the game's intro
   * has Easy / Normal / Hard (the host remounts) and "Play without the clock". Ranked with a quiet clock is the default
   * whenever Me › "Show my game scores on leaderboards" is on. A board already played today opens as practice. ---------- */
  function openIntro(g, opts) {
    opts = opts || {};
    if (!available(g)) g = 'trail';
    play(g, diffOf(g), !!opts.practice, boardsOn());
  }

  /* ---------- the host: mounts a game full-screen ---------- */
  var inst = null, hostEl = null;
  function seedFor(g, d, practice) {
    var s = S();
    if (g === 'trail' && d === 'easy' && !practice && s.camp.total < 7) return 'day' + Math.min(7, s.camp.total + 1); // new players: the hand-made boards
    return E.isoDate(s.day);
  }
  function itemArt(findId, rarity) {
    var id = findId;
    if (!E.FIND_BY_ID[id]) { var pool = E.FINDS.filter(function (x) { return x.rarity === rarity; }); if (!pool.length) return ''; id = pool[E.hash(String(findId)) % pool.length].id; }
    var a = Th.findArt(th(), id); return a && a.svg ? { html: a.svg, name: a.name } : '';
  }
  // Daily boards resume and never restart: the board's state is saved when you leave and handed back on return.
  var curKey = null;
  function saveResume() {
    if (!inst || !curKey || typeof inst.getState !== 'function' || !S().today) return;
    try { var st = inst.getState(); var t = S().today; t.resume = t.resume || {}; if (st) t.resume[curKey] = st; St.save(); } catch (e) { }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveResume(); });
  function close() { saveResume(); curKey = null; if (inst && inst.destroy) { try { inst.destroy(); } catch (e) { } } inst = null; if (hostEl && hostEl.parentNode) hostEl.parentNode.removeChild(hostEl); hostEl = null; }
  function play(g, d, practice, ranked) {
    close(); U.closeAll();
    var s = S(), tm = th(), api = gameApi(g);
    d = DIFFS.indexOf(d) >= 0 ? d : diffOf(g);
    var explicitPractice = !!practice;
    s.settings.gameDiff = s.settings.gameDiff || {}; s.settings.gameDiff[g] = d; St.save();
    if (!practice && played(g, d)) practice = true;
    var mode = practice ? 'practice' : ranked && boardsOn() ? 'ranked' : 'relaxed';
    // A board you left resumes in the mode you started it in (ranked or relaxed), whatever today's default is.
    var saved = !practice && s.today && s.today.resume ? s.today.resume[g + '|' + d] : null;
    if (saved && (saved.mode === 'ranked' || saved.mode === 'relaxed')) mode = saved.mode;
    var fuelK = null; E.PU_ORDER.forEach(function (x) { if (s.pu[x] > 0 && (!fuelK || /check-in|rest|journal|Boss/i.test(s.puSources[x] || ''))) fuelK = x; });
    hostEl = document.createElement('div'); hostEl.className = 'run-screen game-screen'; hostEl.setAttribute('data-game', g);
    hostEl.innerHTML = '<div class="nav-h"><button class="back" data-act="game-close">' + A.icon('back') + 'Today</button><div class="title">' + esc(practice ? 'Practice · ' + name(g) : name(g) + ' · ' + DLABEL[d]) + '</div></div><div class="run-host" id="gameHost"></div>';
    document.getElementById('screen').appendChild(hostEl);
    var host = hostEl.querySelector('#gameHost'), finished = null, dayAtStart = s.day;
    function onFinish(result) {
      if (S().today && S().today.resume) delete S().today.resume[g + '|' + d];
      curKey = null;
      S().rulesSeen = S().rulesSeen || {}; S().rulesSeen[g] = true; // A11: next time the rules start collapsed
      finished = Object.assign({}, result || {});
      finished.game = g;
      finished.difficulty = practice ? 'practice' : d; // the board the player picked (hand-made new-player boards report their own tier)
      if (!finished.mode) finished.mode = mode;
      finished._fx = St.finishGame(finished, practice, { day: dayAtStart }); // a board started before 3:00 never counts for the next day
    }
    function done() { var r = finished; close(); after(r); }
    root.App._gameDone = done;
    var cfg = root.App._gameCfg = { seed: seedFor(g, d, practice), difficulty: g === 'trail' ? RUN_DIFF[d] : d, powerUps: practice ? { magnet: 0, lens: 0, double: 0, lucky: 0 } : Object.assign({}, s.pu), theme: s.theme, practice: !!practice,
      mode: practice ? undefined : mode, timer: mode === 'ranked' ? 'quiet' : undefined, reducedMotion: U.calm(), fuelLabel: practice || !fuelK ? '' : (s.puSources[fuelK] || 'Your check-ins') + ' built this ' + tm.powerUps[fuelK].name + '.',
      renderItem: itemArt, onFinish: onFinish, onDone: done, rulesSeen: !!(s.rulesSeen && s.rulesSeen[g]),
      boards: boardsOn(), history: (s.boardHistory || []).filter(function (e) { return e && e.game === g; }),
      resume: !practice && s.today && s.today.resume ? s.today.resume[g + '|' + d] || null : null,
      played: { easy: !!played(g, 'easy'), normal: !!played(g, 'normal'), hard: !!played(g, 'hard') },
      // "Play without the clock" remounts the same board relaxed, so every game's clock, turn-back and labels reset cleanly.
      onRelax: function () { curKey = null; if (S().today && S().today.resume) delete S().today.resume[g + '|' + d]; play(g, d, false, false); },
      onDifficulty: explicitPractice ? undefined : function (nd) { if (nd === d) return; curKey = null; if (S().today && S().today.resume) delete S().today.resume[g + '|' + d]; play(g, nd, false, mode === 'ranked'); },
      onLeaderboard: function () { var r = finished; close(); after(r); if (boardsOn()) setTimeout(function () { U.closeAll(); root.App.go('leaderboard', { id: g }); }, r && r._fx && r._fx.chestId ? 0 : 50); } };
    if (!practice) curKey = g + '|' + d;
    if (api && typeof api.mount === 'function') {
      try { inst = api.mount(host, cfg); } catch (e) { console.warn('Game failed to mount', e); placeholder(host, g, cfg); }
    } else placeholder(host, g, cfg);
  }
  function placeholder(host, g, cfg) {
    host.innerHTML = '<div class="run-ph"><div class="t-title" style="font-size:1.3rem;font-weight:900">' + esc(name(g)) + ' is loading in</div><p style="margin:14px 0;font-weight:700">This build can’t find the game module. Simulate a finished board to keep exploring.</p><button class="btn btn-tile btn-block" style="background:#fff;color:#1d2333;min-height:56px;border-radius:16px;font-weight:900" data-act="game-sim">Simulate a finished board</button></div>';
    root.App._gameSim = function () { var r = St.fakeRunResult(cfg.seed, { powerUps: cfg.powerUps }); r.game = g; cfg.onFinish(r); cfg.onDone(); };
  }
  function after(res) {
    root.App.render();
    var fx = res && res._fx;
    if (!fx) return;
    if (fx.staleDay) { U.toast('That board was from yesterday, so it counted as practice. Today’s boards are fresh.'); return; }
    if (fx.practice) { if (fx.relight && root.CampUI) root.CampUI.after(fx.relight); return; }
    var rw = fx.reward || {};
    if (rw.ticket) U.toast('🎟️ +1 Grand Draw ticket. Tickets come from the game, never your medicines.');
    else if (rw.paid) U.toast('+' + rw.stars + ' ★ bonus. Each game pays once a day.');
    if (fx.levelUp) setTimeout(function () { U.levelBanner(fx.levelUp); }, 400);
    setTimeout(function () {
      var chestOrNot = fx.chestId ? function (cb) { root.CollectionUI.chestFx(fx.chestId, cb); } : function (cb) { cb(); };
      chestOrNot(function () {
        var trip = function () { if (!S().today.tripSent && S().trip.status !== 'back' && !St.tripOvernight()) setTimeout(function () { root.App.acts['trip-send'](); }, 250); };
        var cf = fx.camp;
        if (cf && root.CampUI && (cf.milestones.length || cf.stageUp || cf.relight || cf.shieldEarned)) setTimeout(function () { root.CampUI.after(cf, rw.first ? trip : null); }, 250);
        else { if (cf && cf.lit && !cf.kid) U.toast(esc(th().camp.icon + ' ' + th().camp.dayLabel(cf.count))); if (rw.first) trip(); }
      });
    }, 900);
  }

  /* ---------- leaderboards: a SIMULATED board, clearly labeled ("Sample players: not real people"). ----------
   * The view itself is LeaderboardSim.render (games/arcade.js): banner, sample tags, bands from the 30th percentile up,
   * top 10, personal best, "better than your usual", Fewest moves (default) / Fastest. Kid profiles get personal bests only.
   * What the app passes in is game-only: today's board results and past board entries. Never anything from the record. */
  var lb = { g: null, inst: null };
  function myResults() {
    var b = today().boards || {}, out = [];
    Object.keys(b).forEach(function (k) { var r = b[k]; if (r && r.result) out.push(r.result); });
    return out;
  }
  function leaderboard(p) {
    var list = games(), g = (p && p.id && list.indexOf(p.id) >= 0) ? p.id : (lb.g && list.indexOf(lb.g) >= 0 ? lb.g : list[0]);
    lb.g = g;
    var nav = '<div class="nav-h"><button class="back" data-act="lb-back">' + A.icon('back') + 'Today</button><div class="title">Leaderboards</div></div>';
    if (!root.LeaderboardSim || typeof root.LeaderboardSim.render !== 'function') return nav + '<div class="lb-banner" role="note"><b>Sample players: not real people.</b> Real boards come with accounts.</div><div class="card"><h3>Boards arrive with the games</h3><p>This build doesn’t have the sample boards loaded yet.</p></div>';
    return nav + '<div class="lb-host" id="lbHost"></div><p class="lb-foot app">Scores come only from games. Medicines never affect your rank.</p><div style="height:20px"></div>';
  }
  function afterLeaderboard() {
    var host = document.getElementById('lbHost'); if (!host || !root.LeaderboardSim) return;
    if (lb.inst && lb.inst.destroy) { try { lb.inst.destroy(); } catch (e) { } }
    var s = S();
    try {
      lb.inst = root.LeaderboardSim.render(host, { game: lb.g, difficulty: diffOf(lb.g), theme: s.theme, seed: E.isoDate(s.day), me: myResults(), history: s.boardHistory || [], kid: St.isKid(), mySpecies: s.comp.species, myName: s.comp.name, switchGame: games().length > 1 });
    } catch (e) { console.warn('Leaderboard failed', e); host.innerHTML = '<div class="card"><p>The sample board didn’t load.</p></div>'; }
  }

  root.GamesUI = { card: card, intro: openIntro, play: play, close: close, games: games, available: available, name: name, suggest: suggest, played: played, paid: paid, NAMES: NAMES };
  root.App.screens.leaderboard = leaderboard;
  root.App.afterHooks.leaderboard = afterLeaderboard;
  Object.assign(root.App.acts, {
    'game-intro': function (el) { openIntro(el.getAttribute('data-g') || 'trail', { practice: !!el.getAttribute('data-practice') }); },
    'game-close': function () { close(); root.App.render(); },
    'game-sim': function () { if (root.App._gameSim) root.App._gameSim(); },
    'run-play': function () { play('trail', diffOf('trail'), false, boardsOn()); },
    'run-practice': function () { play('trail', diffOf('trail'), true, false); },
    'lb-back': function () { if (lb.inst && lb.inst.destroy) { try { lb.inst.destroy(); } catch (e) { } } lb.inst = null; root.App.back(); }
  });
})(window);
