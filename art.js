/* Kindling v5 — art.js : inline SVG illustration (companion, Core, chests, scenery, icons). No network. */
(function (root) {
  'use strict';
  var uid = 0;

  /* ---------- companion ---------- */
  // mood: 'happy' | 'delighted' | 'holding' | 'sleepy' | 'wave'
  // v5.4: every growth stage changes the silhouette (size, body length, ears, tail, ruff, cape, mane, wings), and the
  // five Grove garden spirits (fairy, gnome, sprite, mushroom folk, firefly) each grow in their own way across 11 stages.
  var KS = [0.6, 0.68, 0.75, 0.81, 0.86, 0.9, 0.93, 0.96, 0.98, 1, 1];
  var PATH_SCARF = { wanderer: ['#2b7fd6', '#1f63ab'], gatherer: ['#b0417a', '#8a2f5f'], guardian: ['#3f8f5a', '#2c6b41'] };
  function companion(def, mood, opts) {
    opts = opts || {};
    var id = 'c' + (uid++), b = def.body, be = def.belly, ac = def.accent, kind = def.kind || null;
    var St = root.Store && root.Store.S, E = root.Engine;
    var stage = opts.stage != null ? opts.stage : (St && St.camp && E && E.growthStage ? E.growthStage(St.camp.total) : 3);
    var s = Math.max(0, Math.min(10, stage));
    var cos = opts.cosmetics || (St && St.cosmetics) || [];
    var path = opts.path !== undefined ? opts.path : (St && St.rpg && St.rpg.path) || null;
    var grove = !!kind || def.ears === 'leaf' || def.ears === 'antennae' || def.ears === 'spikes';
    var k = KS[s];
    var ears = '', extra = '', tail = '', hat = '', bodyShape = '', back = '';
    var es = 1 + Math.min(s, 6) * 0.045, ts = 1 + s * 0.06; // ears and tail grow with each stage
    // body grows longer with each stage (the head stays big and friendly)
    var bry = 17 + s * 0.7, bcy = 112 - bry - 3, brx = 24 + s * 0.35;
    switch (def.ears) {
      case 'pointy':
        ears = '<path d="M30 40 L24 8 L52 26 Z" fill="' + b + '"/><path d="M33 34 L30 16 L46 27 Z" fill="' + be + '"/>' +
               '<path d="M90 40 L96 8 L68 26 Z" fill="' + b + '"/><path d="M87 34 L90 16 L74 27 Z" fill="' + be + '"/>';
        tail = '<path d="M86 96 C110 96 116 70 104 60 C102 76 96 84 82 86 Z" fill="' + b + '"/><path d="M104 60 C110 66 110 74 106 78 C104 72 102 66 104 60Z" fill="#fff"/>';
        break;
      case 'round':
        ears = '<circle cx="32" cy="28" r="10" fill="' + b + '"/><circle cx="32" cy="28" r="5" fill="' + be + '"/><circle cx="88" cy="28" r="10" fill="' + b + '"/><circle cx="88" cy="28" r="5" fill="' + be + '"/>';
        tail = '<path d="M84 98 C104 104 114 90 108 80 C104 90 96 92 84 90Z" fill="' + b + '"/>';
        break;
      case 'horns':
        ears = '<path d="M36 26 C30 12 36 4 44 2 C40 10 42 18 46 22 Z" fill="' + ac + '"/><path d="M84 26 C90 12 84 4 76 2 C80 10 78 18 74 22 Z" fill="' + ac + '"/>';
        extra = '<path d="M22 70 C4 60 6 44 14 40 C16 52 22 58 30 62Z" fill="' + ac + '" opacity=".9"/><path d="M98 70 C116 60 114 44 106 40 C104 52 98 58 90 62Z" fill="' + ac + '" opacity=".9"/>';
        tail = '<path d="M84 100 C106 104 116 94 114 82 L108 88 C104 94 96 96 84 94Z" fill="' + b + '"/><path d="M114 82 L118 76 L108 80Z" fill="' + ac + '"/>';
        break;
      case 'leaf':
        ears = '<path d="M60 22 C44 4 30 10 30 10 C36 24 48 26 60 22Z" fill="#6aa65c"/><path d="M60 22 C76 2 92 8 92 8 C86 24 72 28 60 22Z" fill="#82bd73"/><path d="M60 24 L60 14" stroke="#4f8a44" stroke-width="3" stroke-linecap="round"/>';
        break;
      case 'antennae':
        ears = '<path d="M48 24 C44 12 38 8 32 8" stroke="#7a68a6" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="31" cy="8" r="5" fill="' + ac + '"/>' +
               '<path d="M72 24 C76 12 82 8 88 8" stroke="#7a68a6" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="89" cy="8" r="5" fill="' + ac + '"/>';
        break;
      case 'spikes':
        ears = '<path d="M26 52 L14 40 L30 38 L22 22 L40 28 L40 10 L54 22 L60 6 L66 22 L80 10 L80 28 L98 22 L90 38 L106 40 L94 52Z" fill="#8a6a50"/>';
        break;
      case 'fairy': {
        // wings grow from little buds to big petal wings
        var ws = 0.55 + s * 0.075;
        back += '<g transform="translate(60 74) scale(' + ws.toFixed(3) + ') translate(-60 -74)" opacity=".85"><ellipse cx="30" cy="60" rx="24" ry="32" fill="#e8f1ff" stroke="' + ac + '" stroke-width="2.5" transform="rotate(-24 30 60)"/><ellipse cx="90" cy="60" rx="24" ry="32" fill="#e8f1ff" stroke="' + ac + '" stroke-width="2.5" transform="rotate(24 90 60)"/>' +
          '<ellipse cx="34" cy="92" rx="14" ry="18" fill="#f3e8ff" stroke="' + ac + '" stroke-width="2" transform="rotate(30 34 92)"/><ellipse cx="86" cy="92" rx="14" ry="18" fill="#f3e8ff" stroke="' + ac + '" stroke-width="2" transform="rotate(-30 86 92)"/></g>';
        ears = '<path d="M30 52 L14 40 L32 44 Z" fill="' + b + '"/><path d="M90 52 L106 40 L88 44 Z" fill="' + b + '"/>';
        hat = '<path d="M28 50 C26 26 44 18 60 18 C78 18 96 28 92 50 C86 36 74 30 60 32 C48 30 34 36 28 50Z" fill="#b07a4f"/>' + (s >= 1 ? '<circle cx="60" cy="' + (16 - Math.min(s, 6)) + '" r="' + (6 + Math.min(s, 6) * 0.6) + '" fill="#b07a4f"/>' : '');
        if (s >= 3) hat += '<path d="M96 70 L112 ' + (52 - s) + '" stroke="#c9a227" stroke-width="2.5" stroke-linecap="round"/><path d="M112 ' + (46 - s) + ' l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5z" fill="#ffd65e"/>';
        bodyShape = '<path d="M42 ' + (bcy - 6) + ' L78 ' + (bcy - 6) + ' L' + (88 + s) + ' 112 L' + (32 - s) + ' 112 Z" fill="' + b + '"/><path d="M' + (36 - s) + ' 106 L' + (84 + s) + ' 106 L' + (88 + s) + ' 112 L' + (32 - s) + ' 112Z" fill="' + ac + '" opacity=".7"/>';
        break; }
      case 'gnome': {
        // the hat gets taller (and a little floppier) every stage; the beard grows too
        var tip = 16 - s * 1.45, lean = s * 2.4;
        hat = '<path d="M24 44 C30 30 46 ' + (tip + 14) + ' ' + (60 + lean) + ' ' + tip.toFixed(1) + ' C' + (66 + lean) + ' ' + (tip + 16) + ' 92 30 96 44 Z" fill="' + ac + '"/><path d="M22 44 Q60 52 98 44 L98 48 Q60 57 22 48Z" fill="#9c4a3a"/>' + (s >= 4 ? '<circle cx="' + (60 + lean) + '" cy="' + tip.toFixed(1) + '" r="3.5" fill="#ffd65e"/>' : '');
        var bl = 78 + s * 1.6;
        extra = '<path d="M36 66 C36 ' + bl + ' 50 ' + (bl + 10) + ' 60 ' + (bl + 12) + ' C70 ' + (bl + 10) + ' 84 ' + bl + ' 84 66 C76 74 44 74 36 66Z" fill="#fff" stroke="#e6e1d8" stroke-width="1.5"/>';
        bodyShape = '<ellipse cx="60" cy="' + bcy + '" rx="' + (brx + 4) + '" ry="' + bry + '" fill="#4f7cc4"/><rect x="' + (60 - brx - 4) + '" y="' + (bcy + 2) + '" width="' + ((brx + 4) * 2) + '" height="5" fill="#5a3b24"/>' +
          '<ellipse cx="46" cy="112" rx="9" ry="5" fill="#5a3b24"/><ellipse cx="74" cy="112" rx="9" ry="5" fill="#5a3b24"/>';
        break; }
      case 'sprite': {
        // leaf hair: one leaf at first, a full crown of leaves by the later stages
        var n = 1 + Math.min(6, Math.floor(s / 1.6)), lv = '';
        for (var i = 0; i < n; i++) { var a = n === 1 ? 0 : -50 + 100 * i / (n - 1); lv += '<path d="M60 26 C52 10 56 ' + (2 - s * 0.6) + ' 60 ' + (-2 - s * 0.6) + ' C64 ' + (2 - s * 0.6) + ' 68 10 60 26Z" fill="' + (i % 2 ? '#6aa65c' : '#82bd73') + '" transform="rotate(' + a.toFixed(0) + ' 60 26)"/>'; }
        hat = lv;
        ears = '<path d="M30 54 C18 50 14 40 16 34 C24 40 30 44 34 48Z" fill="' + b + '"/><path d="M90 54 C102 50 106 40 104 34 C96 40 90 44 86 48Z" fill="' + b + '"/>';
        bodyShape = '<path d="M60 ' + (bcy - bry) + ' C' + (60 + brx) + ' ' + (bcy - 4) + ' ' + (60 + brx - 6) + ' 110 60 112 C' + (60 - brx + 6) + ' 110 ' + (60 - brx) + ' ' + (bcy - 4) + ' 60 ' + (bcy - bry) + 'Z" fill="' + b + '"/><path d="M60 ' + (bcy - bry + 6) + ' L60 110" stroke="#5f9a4f" stroke-width="2"/>';
        if (s >= 2) tail = '<path d="M80 100 C98 104 104 92 100 84 C108 86 110 96 104 104 C98 110 86 108 80 104Z" fill="#6aa65c"/>';
        break; }
      case 'mushroom': {
        // the cap widens and collects spots every stage
        var cr = 34 + s * 1.5, ctop = 24 - s * 1.1, spots = '';
        for (var j = 0; j < 2 + s; j++) { var sx = 60 + (j % 2 ? 1 : -1) * (6 + (j * 7) % (cr - 6)), sy = ctop + 8 + (j * 5) % 14; spots += '<ellipse cx="' + sx.toFixed(0) + '" cy="' + sy.toFixed(0) + '" rx="' + (3 + j % 3) + '" ry="' + (2.5 + j % 2) + '" fill="#fff"/>'; }
        hat = '<path d="M' + (60 - cr) + ' 44 C' + (60 - cr) + ' ' + (ctop - 4) + ' ' + (60 + cr) + ' ' + (ctop - 4) + ' ' + (60 + cr) + ' 44 Q60 52 ' + (60 - cr) + ' 44Z" fill="' + ac + '"/>' + spots;
        bodyShape = '<rect x="' + (60 - brx + 4) + '" y="' + (bcy - bry) + '" width="' + ((brx - 4) * 2) + '" height="' + (112 - bcy + bry) + '" rx="14" fill="' + b + '"/>';
        break; }
      case 'firefly': {
        // the lantern glow behind grows from a spark into a bright lamp; wings grow too
        var gr = 6 + s * 1.7, fws = 0.6 + s * 0.05;
        back += '<g transform="translate(60 70) scale(' + fws.toFixed(3) + ') translate(-60 -70)" opacity=".8"><ellipse cx="34" cy="66" rx="20" ry="12" fill="#eef3ff" stroke="#9fb0ea" stroke-width="2" transform="rotate(-30 34 66)"/><ellipse cx="86" cy="66" rx="20" ry="12" fill="#eef3ff" stroke="#9fb0ea" stroke-width="2" transform="rotate(30 86 66)"/></g>' +
          '<circle cx="' + (88 + s * 0.6) + '" cy="100" r="' + (gr * 1.9).toFixed(1) + '" fill="#fff6b0" opacity=".45"/><circle cx="' + (88 + s * 0.6) + '" cy="100" r="' + gr.toFixed(1) + '" fill="' + ac + '" stroke="#f2c300" stroke-width="2"/>';
        ears = '<path d="M48 26 C44 12 38 8 32 6" stroke="#4b5a9e" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="31" cy="6" r="' + (3.5 + s * 0.25) + '" fill="' + ac + '"/>' +
               '<path d="M72 26 C76 12 82 8 88 6" stroke="#4b5a9e" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="89" cy="6" r="' + (3.5 + s * 0.25) + '" fill="' + ac + '"/>';
        break; }
    }
    var eyes, mouth;
    if (mood === 'delighted') {
      eyes = '<path d="M40 54 Q46 46 52 54" stroke="#2a1f1a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M68 54 Q74 46 80 54" stroke="#2a1f1a" stroke-width="4" fill="none" stroke-linecap="round"/>';
      mouth = '<path d="M50 64 Q60 78 70 64 Z" fill="#7a2e2e"/><path d="M54 68 Q60 74 66 68" fill="#ff8b8b"/>';
    } else if (mood === 'sleepy') {
      eyes = '<path d="M40 55 Q46 59 52 55" stroke="#2a1f1a" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M68 55 Q74 59 80 55" stroke="#2a1f1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
      mouth = '<path d="M55 67 Q60 70 65 67" stroke="#2a1f1a" stroke-width="3" fill="none" stroke-linecap="round"/>';
    } else {
      var look = mood === 'holding' ? -2 : 0;
      eyes = '<g class="blink"><ellipse cx="46" cy="' + (54 + look) + '" rx="5.5" ry="7" fill="#2a1f1a"/><ellipse cx="74" cy="' + (54 + look) + '" rx="5.5" ry="7" fill="#2a1f1a"/>' +
             '<circle cx="48" cy="' + (51 + look) + '" r="2" fill="#fff"/><circle cx="76" cy="' + (51 + look) + '" r="2" fill="#fff"/></g>';
      mouth = mood === 'holding' ? '<ellipse cx="60" cy="68" rx="4" ry="4.5" fill="#7a2e2e"/>' : '<path d="M52 65 Q56 70 60 65 Q64 70 68 65" stroke="#2a1f1a" stroke-width="3" fill="none" stroke-linecap="round"/>';
    }
    var arms = mood === 'holding'
      ? '<ellipse cx="44" cy="84" rx="8" ry="10" fill="' + b + '" transform="rotate(-25 44 84)"/><ellipse cx="76" cy="84" rx="8" ry="10" fill="' + b + '" transform="rotate(25 76 84)"/>'
      : mood === 'wave' || mood === 'delighted'
        ? '<ellipse cx="26" cy="72" rx="7" ry="11" fill="' + b + '" transform="rotate(-40 26 72)"/><ellipse cx="94" cy="72" rx="7" ry="11" fill="' + b + '" transform="rotate(40 94 72)"/>'
        : '<ellipse cx="34" cy="92" rx="7" ry="9" fill="' + b + '"/><ellipse cx="86" cy="92" rx="7" ry="9" fill="' + b + '"/>';
    var nose = def.ears === 'pointy' || def.ears === 'round' ? '<ellipse cx="60" cy="61" rx="3.5" ry="2.6" fill="#2a1f1a"/>' : kind === 'gnome' ? '<circle cx="60" cy="62" r="6" fill="#f2a58a"/>' : '';
    var behind = '', front = '', gold = '#ffd65e', goldE = '#c99a2e';
    var capeC = grove ? '#9cc28c' : '#e8505b';
    var pc = path && PATH_SCARF[path], scarfC = pc ? pc[0] : grove ? '#f4a7a0' : '#2b7fd6', scarfD = pc ? pc[1] : grove ? '#e48a83' : '#1f63ab';
    if (opts.aura) {
      var ac2 = grove ? ['#f7b3c2', '#ffd6e0', '#fff1a8'] : ['#ffb020', '#ff7a3d', '#ffe27a'];
      behind += '<g class="aura aura-' + (grove ? 'petal' : 'ember') + '"><circle cx="60" cy="74" r="50" fill="url(#' + id + 'au)"/>' +
        [[22, 48], [98, 44], [16, 86], [104, 84], [60, 14]].map(function (p, i) { return grove
          ? '<ellipse class="au-p" style="animation-delay:' + (i * .35) + 's" cx="' + p[0] + '" cy="' + p[1] + '" rx="4" ry="6.5" fill="' + ac2[i % 3] + '" transform="rotate(' + (i * 50) + ' ' + p[0] + ' ' + p[1] + ')"/>'
          : '<path class="au-p" style="animation-delay:' + (i * .35) + 's" d="M' + p[0] + ' ' + (p[1] - 7) + ' C' + (p[0] + 5) + ' ' + (p[1] - 1) + ' ' + (p[0] + 4) + ' ' + (p[1] + 5) + ' ' + p[0] + ' ' + (p[1] + 5) + ' C' + (p[0] - 4) + ' ' + (p[1] + 5) + ' ' + (p[0] - 5) + ' ' + (p[1] - 1) + ' ' + p[0] + ' ' + (p[1] - 7) + 'Z" fill="' + ac2[i % 3] + '"/>'; }).join('') + '</g>';
    }
    // --- stage silhouettes (outside the scaled body so they read at every size) ---
    if (s >= 10) behind += '<circle cx="60" cy="64" r="54" fill="' + gold + '" opacity=".22"/>' +
      '<path d="M40 70 C14 54 4 30 10 22 C20 34 30 40 42 50 Z" fill="' + gold + '" stroke="' + goldE + '" stroke-width="1.5"/><path d="M80 70 C106 54 116 30 110 22 C100 34 90 40 78 50 Z" fill="' + gold + '" stroke="' + goldE + '" stroke-width="1.5"/>';
    if (s >= 8) behind += '<circle cx="60" cy="58" r="44" fill="none" stroke="' + gold + '" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" opacity=".9"/>';
    if (s >= 5) behind += '<path d="M36 84 C26 104 30 112 40 112 L80 112 C90 112 94 104 84 84 Z" fill="' + capeC + '" opacity=".95"/>' + (s >= 6 ? '<path d="M30 108 L90 108" stroke="' + gold + '" stroke-width="3"/>' : '');
    if (s >= 9) behind += [[14, 40], [106, 40], [60, 2]].map(function (p, i) { return '<circle class="au-p" style="animation-delay:' + (i * .5) + 's" cx="' + p[0] + '" cy="' + (p[1] + 6) + '" r="4.5" fill="' + (grove ? '#c9f2b5' : '#bfe8ff') + '" stroke="#fff" stroke-width="1.5"/>'; }).join('');
    // inside the scaled body
    var inBack = '', inFront = '';
    if (s === 0) inFront += grove ? '<path d="M36 108 C36 96 48 94 50 104 Z M84 108 C84 96 72 94 70 104 Z" fill="#c9a26b" stroke="#a07c48" stroke-width="1.5"/>' : '<path d="M60 26 C54 16 58 8 64 4 C63 12 70 14 66 26 Z" fill="#ff9a3d"/><path d="M61 24 C59 18 61 14 63 12 C63 17 65 19 63 24Z" fill="#ffe27a"/>';
    if (s >= 1 && !kind) inBack += '<path d="M28 62 L18 58 L26 66 L16 70 L30 70 Z" fill="' + b + '"/><path d="M92 62 L102 58 L94 66 L104 70 L90 70 Z" fill="' + b + '"/>'; // cheek fluff
    if (s >= 4) inBack += kind ? '<path d="M38 84 L44 78 L50 84 L56 78 L60 84 L64 78 L70 84 L76 78 L82 84 Q60 94 38 84Z" fill="' + (grove ? '#82bd73' : b) + '"/>' : '<path d="M36 84 L40 76 L46 82 L52 75 L58 81 L62 75 L68 81 L74 75 L80 82 L84 76 L86 86 Q60 96 34 86Z" fill="' + b + '"/>';
    if (s >= 6 && !kind && tail) inBack += '<g transform="rotate(-22 84 94)">' + tail + '</g>';
    if (s >= 8) inFront += '<path d="M30 80 Q36 70 46 74 L44 82 Z" fill="' + gold + '" stroke="' + goldE + '" stroke-width="1.2"/><path d="M90 80 Q84 70 74 74 L76 82 Z" fill="' + gold + '" stroke="' + goldE + '" stroke-width="1.2"/>';
    if (s >= 9) inBack += [0, 1, 2, 3, 4, 5, 6].map(function (i) { var a = (-150 + i * 20) * Math.PI / 180, x1 = 60 + Math.cos(a) * 30, y1 = 56 + Math.sin(a) * 30, x2 = 60 + Math.cos(a) * 44, y2 = 56 + Math.sin(a) * 44; return '<path d="M' + (x1 - 4).toFixed(1) + ' ' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' L' + (x1 + 4).toFixed(1) + ' ' + y1.toFixed(1) + 'Z" fill="' + (grove ? '#9cc28c' : '#ffb020') + '"/>'; }).join('');
    if (s >= 2) front += '<path d="M36 82 Q60 96 84 82 L84 89 Q60 103 36 89Z" fill="' + scarfC + '"/><path d="M74 90 L80 104 L70 101Z" fill="' + scarfD + '"/>';
    if (s >= 3) front += '<circle cx="47" cy="99" r="6.5" fill="' + gold + '" stroke="' + goldE + '" stroke-width="1.5"/><path d="M47 95 L48.3 98 L51.4 98.2 L49 100.1 L49.8 103.1 L47 101.4 L44.2 103.1 L45 100.1 L42.6 98.2 L45.7 98Z" fill="#fff6c9"/>';
    if (s >= 4 && kind !== 'gnome' && kind !== 'mushroom') front += grove ? '<path d="M78 30 C86 18 96 18 98 20 C94 28 86 32 78 30Z" fill="#6aa65c"/>' : '<path d="M78 30 C84 14 92 10 96 10 C94 20 88 28 78 30Z" fill="#ff7a3d"/><path d="M80 28 L93 13" stroke="#fff" stroke-width="1.2"/>';
    if (s >= 6) front += '<circle cx="73" cy="99" r="5.5" fill="' + gold + '" stroke="' + goldE + '" stroke-width="1.5"/><path d="M70 92 L73 96 L76 92" stroke="' + capeC + '" stroke-width="2.5" fill="none"/>';
    var crowned = cos.indexOf('m365') >= 0;
    if (s >= 7 && !crowned) front += '<path d="M46 27 Q60 20 74 27" stroke="' + (s >= 10 ? gold : '#dfe6ee') + '" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="60" cy="22.5" r="2.6" fill="' + (grove ? '#f4a7a0' : '#7cc4f2') + '"/>';
    // one-of-a-kind milestone cosmetics: day 365 crown, day 730 star cape, day 1000 plume
    if (cos.indexOf('m730') >= 0) behind += '<path d="M34 82 C20 106 26 114 38 114 L82 114 C94 114 100 106 86 82 Z" fill="#2a2f6b"/><g fill="#fff6c9"><circle cx="46" cy="104" r="1.8"/><circle cx="62" cy="108" r="1.4"/><circle cx="76" cy="100" r="1.8"/><circle cx="54" cy="96" r="1.2"/></g>';
    if (crowned) front += '<path d="M47 27 L49 15 L55 22 L60 12 L65 22 L71 15 L73 27 Z" fill="' + (grove ? '#f7b3c2' : gold) + '" stroke="' + goldE + '" stroke-width="1.5"/><circle cx="60" cy="20" r="2.2" fill="#ff5d8f"/>';
    if (cos.indexOf('m1000') >= 0) front += grove ? '<path d="M30 40 C34 26 44 20 52 22 M90 40 C86 26 76 20 68 22" stroke="' + gold + '" stroke-width="4" fill="none" stroke-linecap="round"/>' : '<path d="M60 22 C52 6 58 -2 66 0 C62 6 64 14 60 22Z" fill="#ff7a3d"/><path d="M60 22 C64 8 72 4 78 6 C72 10 66 16 60 22Z" fill="' + gold + '"/>';
    var body = bodyShape || ('<ellipse cx="60" cy="' + bcy.toFixed(1) + '" rx="' + brx.toFixed(1) + '" ry="' + bry.toFixed(1) + '" fill="' + b + '"/><ellipse cx="60" cy="' + (bcy + 4).toFixed(1) + '" rx="' + (brx * 0.62).toFixed(1) + '" ry="' + (bry * 0.66).toFixed(1) + '" fill="' + be + '"/>');
    var earsG = ears ? '<g transform="translate(60 40) scale(' + es.toFixed(3) + ') translate(-60 -40)">' + ears + '</g>' : '';
    var tailG = tail ? '<g transform="translate(84 94) scale(' + ts.toFixed(3) + ') translate(-84 -94)">' + tail + '</g>' : '';
    var headFill = kind === 'mushroom' ? be : b;
    return '<svg class="companion-svg stage-' + s + (kind ? ' kind-' + kind : '') + ' ' + (opts.cls || '') + '" viewBox="0 0 120 120" aria-hidden="true" data-stage="' + s + '"' + (kind ? ' data-kind="' + kind + '"' : '') + '>' +
      (opts.aura ? '<defs><radialGradient id="' + id + 'au"><stop offset="0" stop-color="' + (grove ? '#ffe4ec' : '#ffd36b') + '" stop-opacity=".75"/><stop offset="1" stop-color="' + (grove ? '#ffe4ec' : '#ff9a3d') + '" stop-opacity="0"/></radialGradient></defs>' : '') +
      behind +
      '<ellipse cx="60" cy="114" rx="' + Math.round(30 * k) + '" ry="5" fill="rgba(0,0,0,.12)"/>' +
      '<g transform="translate(60 114) scale(' + k + ') translate(-60 -114)">' + back + inBack + tailG + (kind === 'gnome' ? '' : extra) +
      '<g class="c-body">' + body +
      earsG + '<circle cx="60" cy="56" r="32" fill="' + headFill + '"/>' +
      '<ellipse cx="60" cy="64" rx="22" ry="16" fill="' + be + '"/>' + eyes + nose + (kind === 'gnome' ? extra : '') + mouth +
      '<ellipse cx="38" cy="66" rx="5" ry="3" fill="#ff8f8f" opacity=".55"/><ellipse cx="82" cy="66" rx="5" ry="3" fill="#ff8f8f" opacity=".55"/>' +
      hat + arms + inFront + front + '</g></g></svg>';
  }

  /* ---------- Core: pieces assembling (never a percent) ---------- */
  function polar(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  // pieces: array of 'empty'|'filled'|'pending' (length N). style: 'beacon'|'bloom'
  function core(pieces, style, opts) {
    opts = opts || {};
    var N = Math.max(1, pieces.length), fpp = N <= 3 ? 6 / N : N === 4 ? 2 : 1, cx = 100, cy = 100, out = [], gid = 'g' + (uid++);
    var bloom = style === 'bloom';
    var defs = '<defs>' +
      '<radialGradient id="' + gid + 'f" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="' + (bloom ? '#ffe1dc' : '#fff4c2') + '"/><stop offset=".55" stop-color="' + (bloom ? '#f49a8f' : '#ffc23a') + '"/><stop offset="1" stop-color="' + (bloom ? '#e0675c' : '#ff7a3d') + '"/></radialGradient>' +
      '<radialGradient id="' + gid + 'glow"><stop offset="0" stop-color="' + (bloom ? '#fff3c4' : '#fff1a8') + '" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '</defs>';
    var filledCount = pieces.filter(function (p) { return p === 'filled'; }).length;
    out.push('<circle class="core-glow" cx="100" cy="100" r="' + (60 + 30 * filledCount / N) + '" fill="url(#' + gid + 'glow)" opacity="' + (0.25 + 0.6 * filledCount / N) + '"/>');
    for (var p = 0; p < N; p++) {
      var st = pieces[p] || 'empty';
      var a0 = -Math.PI / 2 + (p / N) * Math.PI * 2, a1 = -Math.PI / 2 + ((p + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
      var off = st === 'filled' || N === 1 ? 0 : 8, dx = Math.cos(am) * off, dy = Math.sin(am) * off;
      var fill = st === 'filled' ? 'url(#' + gid + 'f)' : st === 'pending' ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.42)';
      var dash = st === 'filled' ? '' : ' stroke-dasharray="7 6"';
      var inner = '';
      if (bloom) {
        for (var k = 0; k < fpp; k++) {
          var pa = a0 + (k + 0.5) * (a1 - a0) / fpp;
          var tip = polar(cx, cy, 70, pa), l = polar(cx, cy, 40, pa - 0.4), r = polar(cx, cy, 40, pa + 0.4);
          inner += '<path d="M' + cx + ' ' + cy + ' Q' + l[0].toFixed(1) + ' ' + l[1].toFixed(1) + ' ' + tip[0].toFixed(1) + ' ' + tip[1].toFixed(1) + ' Q' + r[0].toFixed(1) + ' ' + r[1].toFixed(1) + ' ' + cx + ' ' + cy + 'Z" fill="' + fill + '" stroke="#fff" stroke-width="3" stroke-linejoin="round"' + dash + '/>';
        }
      } else {
        var d = N === 1 ? '' : 'M' + cx + ' ' + cy + ' ';
        for (var j = 0; j <= fpp; j++) {
          if (N === 1 && j === fpp) break;
          var pt = polar(cx, cy, 68, a0 + j * (a1 - a0) / fpp);
          d += (d === '' ? 'M' : 'L') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1) + ' ';
        }
        inner = '<path d="' + d + 'Z" fill="' + fill + '" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"' + dash + '/>';
        if (st === 'filled') for (var q = 0; q <= fpp; q++) { var v = polar(cx, cy, 68, a0 + q * (a1 - a0) / fpp); inner += '<path d="M' + cx + ' ' + cy + ' L' + v[0].toFixed(1) + ' ' + v[1].toFixed(1) + '" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>'; }
      }
      out.push('<g class="facet facet-' + st + ' piece-' + p + '" data-piece="' + p + '" transform="translate(' + dx.toFixed(1) + ' ' + dy.toFixed(1) + ')' + (N === 1 && st !== 'filled' ? ' scale(1)' : '') + '">' + inner + '</g>');
    }
    var center = bloom
      ? '<circle cx="100" cy="100" r="17" fill="' + (filledCount === N ? '#ffd166' : 'rgba(255,255,255,.85)') + '" stroke="#fff" stroke-width="3"/>'
      : '<circle cx="100" cy="100" r="18" fill="' + (filledCount === N ? '#fff6d0' : 'rgba(255,255,255,.8)') + '" stroke="#fff" stroke-width="3"/>' + (filledCount === N ? '<path d="M100 87 L103.5 96.5 L113 100 L103.5 103.5 L100 113 L96.5 103.5 L87 100 L96.5 96.5Z" fill="#ff9a2e"/>' : '');
    return '<svg class="core-svg" viewBox="0 0 200 200" role="img" aria-label="' + (opts.label || '') + '">' + defs + out.join('') + center + '</svg>';
  }

  /* ---------- glowing fragment the companion holds ---------- */
  function fragment(style) {
    return style === 'bloom'
      ? '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 36 Q4 20 20 4 Q36 20 20 36Z" fill="#f49a8f" stroke="#fff" stroke-width="2.5"/></svg>'
      : '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L34 14 L28 36 L12 36 L6 14Z" fill="#ffc23a" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 3 L20 36 M6 14 L34 14" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/></svg>';
  }

  /* ---------- chest ---------- */
  var CHEST_COL = { basic: ['#b97a46', '#8a5530', '#e7c9a0'], bronze: ['#d98b4a', '#a85d2a', '#ffcf9a'], silver: ['#9fb3c8', '#6b8099', '#f1f6fb'], gold: ['#ffc83d', '#d9921a', '#fff3b8'], epic: ['#9b6bff', '#5b3bc4', '#e6d9ff'], legendary: ['#ff7ab0', '#c2337a', '#fff0a8'] };
  function chest(type, opts) {
    opts = opts || {};
    var c = CHEST_COL[type] || CHEST_COL.basic;
    return '<svg class="chest-svg" viewBox="0 0 160 140" aria-hidden="true">' +
      '<ellipse cx="80" cy="132" rx="58" ry="7" fill="rgba(0,0,0,.18)"/>' +
      '<g class="chest-base"><rect x="22" y="62" width="116" height="66" rx="12" fill="' + c[0] + '"/><rect x="22" y="62" width="116" height="14" fill="' + c[1] + '" opacity=".5"/>' +
      '<rect x="72" y="62" width="16" height="66" fill="' + c[1] + '"/><rect x="66" y="78" width="28" height="26" rx="6" fill="' + c[2] + '"/><circle cx="80" cy="88" r="4" fill="' + c[1] + '"/><rect x="78" y="90" width="4" height="8" rx="2" fill="' + c[1] + '"/></g>' +
      '<g class="chest-lid"><path d="M18 64 C18 30 142 30 142 64 Z" fill="' + c[0] + '"/><path d="M18 64 C18 30 142 30 142 64" fill="none" stroke="' + c[2] + '" stroke-width="4" opacity=".6"/><rect x="72" y="34" width="16" height="30" fill="' + c[1] + '"/><rect x="16" y="58" width="128" height="10" rx="5" fill="' + c[1] + '"/></g>' +
      '</svg>';
  }

  /* ---------- hero scenery ---------- */
  function scenery(theme, away) {
    if (theme === 'grove') {
      return '<svg class="scenery" viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
        '<circle cx="320" cy="62" r="34" fill="#fff4c9" opacity=".95"/>' +
        '<path d="M0 210 C70 170 150 190 210 200 C280 212 330 180 390 190 L390 300 L0 300Z" fill="#b9d4a8"/>' +
        '<path d="M0 240 C90 214 170 236 250 232 C320 228 350 214 390 220 L390 300 L0 300Z" fill="#9cc28c"/>' +
        '<g fill="#f4b6b0"><circle cx="40" cy="250" r="5"/><circle cx="64" cy="262" r="4"/><circle cx="340" cy="244" r="5"/><circle cx="360" cy="258" r="4"/></g>' +
        '<g fill="#fff"><circle cx="40" cy="250" r="2"/><circle cx="340" cy="244" r="2"/></g>' +
        '</svg>';
    }
    return '<svg class="scenery" viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<circle class="sun" cx="300" cy="70" r="40" fill="#fff1b0"/><circle cx="300" cy="70" r="58" fill="#fff1b0" opacity=".25"/>' +
      '<g fill="#fff" opacity=".8"><ellipse cx="80" cy="52" rx="34" ry="10"/><ellipse cx="104" cy="44" rx="20" ry="10"/><ellipse cx="220" cy="34" rx="22" ry="7"/></g>' +
      '<path d="M0 200 L60 130 L105 175 L170 98 L240 180 L290 140 L390 210 L390 300 L0 300Z" fill="#ff9f68" opacity=".55"/>' +
      '<path d="M170 98 L186 117 L176 114 L170 122 L162 112 L154 117Z" fill="#fff" opacity=".8"/>' +
      '<path d="M0 230 C60 200 120 222 190 214 C260 206 320 186 390 204 L390 300 L0 300Z" fill="#20b2a0"/>' +
      '<path d="M0 262 C80 240 160 258 240 252 C310 246 350 238 390 244 L390 300 L0 300Z" fill="#14907f"/>' +
      '</svg>';
  }

  /* ---------- small icons (stroke) ---------- */
  var ICONS = {
    today: '<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4.5"/>',
    collection: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    meds: '<rect x="2.8" y="8.5" width="18.4" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.3 8.2l5.4 7.6"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.4-6 8-6s6.8 2 8 6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.8 0 4.7 1.6 5.5 4.8"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9z"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
    sparkle: '<path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z"/>',
    pill: '<rect x="2.8" y="8.5" width="18.4" height="7" rx="3.5" transform="rotate(-35 12 12)"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    note: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    phonecall: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    chest: '<rect x="3.5" y="10" width="17" height="10" rx="2"/><path d="M3.5 10c0-4 17-4 17 0"/><path d="M11 13h2v3h-2z"/>'
  };
  function icon(name, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>'; }

  /* ---------- pill appearance (CSS) ---------- */
  function pill(med) {
    var c = med.color || '#f6a04d', shape = med.shape || 'capsule';
    if (shape === 'round') return '<span class="pill-ic round" style="--pc:' + c + '" aria-hidden="true"></span>';
    if (shape === 'oval') return '<span class="pill-ic oval" style="--pc:' + c + '" aria-hidden="true"></span>';
    if (shape === 'pen') return '<span class="pill-ic pen" style="--pc:' + c + '" aria-hidden="true"></span>';
    if (shape === 'inhaler') return '<span class="pill-ic inhaler" style="--pc:' + c + '" aria-hidden="true"></span>';
    if (shape === 'drop') return '<span class="pill-ic drop" style="--pc:' + c + '" aria-hidden="true"></span>';
    return '<span class="pill-ic capsule" style="--pc:' + c + '" aria-hidden="true"></span>';
  }

  /* ---------- logo ---------- */
  function logo(size) {
    size = size || 28;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg' + (uid++) + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd75e"/><stop offset="1" stop-color="#ff6a3d"/></linearGradient></defs>' +
      '<path d="M20 3 C27 12 32 16 32 24 A12 12 0 0 1 8 24 C8 18 12 15 14 10 C16 15 18 16 20 14 C21 11 20 7 20 3Z" fill="url(#lg' + (uid - 1) + ')"/><path d="M20 20 C23 24 25 26 25 29 A5 5 0 0 1 15 29 C15 26 18 24 20 20Z" fill="#fff4c4"/></svg>';
  }

  /* v5.5: one generic icon per item TYPE (no shape or colour: refills change how a pill looks). Drawn in the clinical accent. */
  var ITEM_ICONS = {
    med: '<path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="M8.5 8.5l7 7"/>',
    vitamin: '<path d="M12 3.5c3.2 3.6 5 6.6 5 9.3a5 5 0 0 1-10 0c0-2.7 1.8-5.7 5-9.3z"/><path d="M10 13.5a2 2 0 0 0 2 2"/>',
    habit: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><path d="M9.5 12.2l1.7 1.7 3.4-3.6"/>'
  };
  function itemIcon(item, cls) {
    var t = (item && item.type) || 'med';
    return '<span class="item-ic it-' + t + ' ' + (cls || '') + '" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (ITEM_ICONS[t] || ITEM_ICONS.med) + '</svg></span>';
  }
  root.Art = { companion: companion, core: core, fragment: fragment, chest: chest, scenery: scenery, icon: icon, pill: itemIcon, itemIcon: itemIcon, logo: logo };
})(window);
