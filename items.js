/* Kindling v5 — items.js : one inline-SVG item set. Every Find and power-up renders from here,
 * so the same item looks identical in chests, postcards, hauls and the album (no emoji art). */
(function (root) {
  'use strict';
  function g(inner, glow) { return '<svg class="item-svg" viewBox="0 0 64 64" aria-hidden="true">' + (glow ? '<circle cx="32" cy="32" r="29" fill="' + glow + '" opacity=".28"/>' : '') + inner + '</svg>'; }
  var OUT = ' stroke="#3a2a1a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
  var K = {
    crystal: function (a, b) { return '<path d="M32 6 L44 20 L40 56 L24 56 L20 20Z" fill="' + a + '"' + OUT + '/><path d="M32 6 L32 56 M20 20 L44 20" stroke="' + b + '" stroke-width="2" opacity=".8"/><path d="M26 24 L28 46" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>'; },
    twin: function (a, b) { return '<path d="M22 14 L31 25 L28 56 L16 56 L13 25Z" fill="' + a + '"' + OUT + '/><path d="M42 8 L52 21 L48 56 L36 56 L33 21Z" fill="' + b + '"' + OUT + '/><path d="M40 24 L41 44" stroke="#fff" stroke-width="3" opacity=".55" stroke-linecap="round"/>'; },
    cluster: function (a, b) { return '<path d="M20 22 L27 31 L25 56 L15 56 L13 31Z" fill="' + b + '"' + OUT + '/><path d="M44 22 L51 31 L49 56 L39 56 L37 31Z" fill="' + b + '"' + OUT + '/><path d="M32 6 L41 18 L38 56 L26 56 L23 18Z" fill="' + a + '"' + OUT + '/><path d="M29 22 L30 42" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>'; },
    leaf: function (a, b) { return '<path d="M32 58 C10 44 10 18 32 6 C54 18 54 44 32 58Z" fill="' + a + '"' + OUT + '/><path d="M32 54 L32 12 M32 26 L22 20 M32 34 L42 28 M32 42 L23 37" stroke="' + b + '" stroke-width="2.4" stroke-linecap="round"/>'; },
    twinleaf: function (a, b) { return '<path d="M30 58 C8 48 6 26 22 14 C36 26 38 44 30 58Z" fill="' + a + '"' + OUT + '/><path d="M34 58 C56 48 58 26 42 14 C28 26 26 44 34 58Z" fill="' + b + '"' + OUT + '/><path d="M32 58 L32 40" stroke="#3a2a1a" stroke-width="2.2"/>'; },
    feather: function (a, b) { return '<path d="M46 6 C24 10 14 30 18 52 L24 46 C30 44 40 34 46 6Z" fill="' + a + '"' + OUT + '/><path d="M44 10 C34 24 26 36 14 58" stroke="' + b + '" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M38 20 L30 22 M34 30 L26 31 M30 38 L22 38" stroke="' + b + '" stroke-width="2" stroke-linecap="round"/>'; },
    scallop: function (a, b) { return '<path d="M32 10 C14 12 6 30 10 44 L24 54 L40 54 L54 44 C58 30 50 12 32 10Z" fill="' + a + '"' + OUT + '/><path d="M32 12 L32 52 M20 16 L26 52 M44 16 L38 52 M12 30 L22 52 M52 30 L42 52" stroke="' + b + '" stroke-width="2" opacity=".85"/><rect x="24" y="52" width="16" height="6" rx="2" fill="' + b + '"' + OUT + '/>'; },
    snail: function (a, b) { return '<path d="M34 54 C14 54 8 36 18 24 C28 12 48 16 50 32 C52 44 40 48 34 40 C28 32 38 26 42 32" fill="' + a + '"' + OUT + '/><path d="M8 56 L58 56" stroke="#3a2a1a" stroke-width="2.2" stroke-linecap="round"/><circle cx="20" cy="40" r="3" fill="' + b + '"/>'; },
    star: function (a, b) { return '<path d="M32 6 L39 24 L58 24 L43 36 L49 56 L32 44 L15 56 L21 36 L6 24 L25 24Z" fill="' + a + '"' + OUT + '/><circle cx="32" cy="24" r="2.4" fill="' + b + '"/><circle cx="26" cy="34" r="2.4" fill="' + b + '"/><circle cx="38" cy="34" r="2.4" fill="' + b + '"/><circle cx="32" cy="40" r="2.4" fill="' + b + '"/>'; },
    conch: function (a, b) { return '<path d="M18 50 C10 34 20 12 40 8 C52 12 56 26 48 38 C42 48 30 56 18 50Z" fill="' + a + '"' + OUT + '/><path d="M24 44 C22 32 30 20 42 16 M30 46 C30 36 36 28 46 26" stroke="' + b + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>'; },
    pearl: function (a, b) { return '<path d="M8 40 C8 24 56 24 56 40 C56 52 8 52 8 40Z" fill="' + b + '"' + OUT + '/><circle cx="32" cy="34" r="12" fill="' + a + '"' + OUT + '/><circle cx="28" cy="30" r="4" fill="#fff" opacity=".85"/>'; },
    snowflake: function (a, b) { var s = ''; for (var i = 0; i < 6; i++) { var t = i * 60; s += '<g transform="rotate(' + t + ' 32 32)"><path d="M32 32 L32 6 M32 14 L26 9 M32 14 L38 9 M32 22 L27 18 M32 22 L37 18" stroke="' + a + '" stroke-width="4" stroke-linecap="round"/></g>'; } return s + '<circle cx="32" cy="32" r="5" fill="' + b + '"' + OUT + '/>'; },
    pine: function (a, b) { return '<path d="M32 6 L46 26 L38 26 L52 44 L12 44 L26 26 L18 26Z" fill="' + a + '"' + OUT + '/><rect x="28" y="44" width="8" height="12" rx="2" fill="' + b + '"' + OUT + '/><circle cx="26" cy="36" r="2.5" fill="#fff" opacity=".8"/><circle cx="38" cy="22" r="2.5" fill="#fff" opacity=".8"/>'; },
    gem: function (a, b) { return '<path d="M14 22 L22 10 L42 10 L50 22 L32 56Z" fill="' + a + '"' + OUT + '/><path d="M14 22 L50 22 M22 10 L28 22 L32 56 L36 22 L42 10" stroke="' + b + '" stroke-width="2" fill="none" opacity=".85"/><path d="M24 14 L22 20" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>'; },
    flower: function (a, b, n) { n = n || 6; var s = ''; for (var i = 0; i < n; i++) s += '<ellipse cx="32" cy="17" rx="7.5" ry="12" fill="' + a + '"' + OUT + ' transform="rotate(' + (i * 360 / n) + ' 32 32)"/>'; return s + '<circle cx="32" cy="32" r="8" fill="' + b + '"' + OUT + '/>'; },
    twinflower: function (a, b) { return '<g transform="translate(-9 -6) scale(.72)">' + K.flower(a, b, 5) + '</g><g transform="translate(18 18) scale(.72)">' + K.flower(b, a, 5) + '</g>'; },
    sprig: function (a, b) { return '<path d="M32 58 L32 8" stroke="#5b7a3a" stroke-width="3" stroke-linecap="round"/>' + [14, 24, 34, 44].map(function (y, i) { return '<ellipse cx="' + (i % 2 ? 40 : 24) + '" cy="' + y + '" rx="8" ry="5" fill="' + (i % 2 ? b : a) + '"' + OUT + ' transform="rotate(' + (i % 2 ? -30 : 30) + ' ' + (i % 2 ? 40 : 24) + ' ' + y + ')"/>'; }).join(''); },
    stone: function (a, b) { return '<path d="M10 40 C8 26 22 16 36 18 C52 20 58 34 52 44 C46 54 14 54 10 40Z" fill="' + a + '"' + OUT + '/><path d="M20 30 C24 26 30 25 34 26" stroke="' + b + '" stroke-width="3" stroke-linecap="round" fill="none"/>'; },
    pebbles: function (a, b) { return '<ellipse cx="22" cy="40" rx="14" ry="10" fill="' + a + '"' + OUT + '/><ellipse cx="42" cy="30" rx="13" ry="9" fill="' + b + '"' + OUT + '/>'; },
    drop: function (a, b) { return '<path d="M32 6 C40 20 50 30 50 40 A18 18 0 0 1 14 40 C14 30 24 20 32 6Z" fill="' + a + '"' + OUT + '/><path d="M24 38 C24 32 27 28 30 25" stroke="' + b + '" stroke-width="3.5" stroke-linecap="round" fill="none"/>'; },
    lily: function (a, b) { return '<path d="M32 34 L58 30 C58 46 46 56 32 56 C18 56 6 46 6 34 C6 22 18 12 32 12 C40 12 48 16 52 22Z" fill="' + a + '"' + OUT + '/>' + (b ? '<g transform="translate(14 6) scale(.55)">' + K.flower(b, '#ffd166', 6) + '</g>' : ''); },
    fruit: function (a, b) { return '<path d="M32 18 C22 10 8 16 10 32 C12 48 24 58 32 52 C40 58 52 48 54 32 C56 16 42 10 32 18Z" fill="' + a + '"' + OUT + '/><path d="M32 18 C32 12 34 8 37 6" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M34 12 C40 6 48 8 50 12 C44 16 38 15 34 12Z" fill="' + b + '"' + OUT + '/><ellipse cx="22" cy="28" rx="4" ry="6" fill="#fff" opacity=".5"/>'; },
    pear: function (a, b) { return '<path d="M32 12 C26 12 26 24 22 30 C14 38 16 56 32 56 C48 56 50 38 42 30 C38 24 38 12 32 12Z" fill="' + a + '"' + OUT + '/><path d="M32 12 L33 6" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round"/><path d="M33 9 C38 4 45 6 46 9 C41 12 37 12 33 9Z" fill="' + b + '"' + OUT + '/>'; },
    cherry: function (a, b) { return '<path d="M20 40 C22 24 30 14 40 8 M44 42 C42 28 40 18 40 8" stroke="#5a3a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="20" cy="46" r="10" fill="' + a + '"' + OUT + '/><circle cx="44" cy="46" r="10" fill="' + a + '"' + OUT + '/><path d="M40 8 C46 2 54 4 56 8 C50 12 44 12 40 8Z" fill="' + b + '"' + OUT + '/>'; }
  };
  var RGLOW = { common: null, uncommon: '#7cc8ff', rare: '#b48cff', epic: '#ffcc33' };
  function find(spec, rarity) {
    var f = K[spec[1]] || K.gem;
    var sparkle = rarity === 'rare' || rarity === 'epic' ? '<path d="M52 6 L54 12 L60 14 L54 16 L52 22 L50 16 L44 14 L50 12Z" fill="#fff" stroke="#3a2a1a" stroke-width="1.5"/>' : '';
    return g(f(spec[2], spec[3], spec[4]) + sparkle, RGLOW[rarity]);
  }
  var PU = {
    magnet: '<path d="M14 10 L26 10 L26 34 A6 6 0 0 0 38 34 L38 10 L50 10 L50 34 A18 18 0 0 1 14 34Z" fill="#3b82f6"' + OUT + '/><rect x="14" y="10" width="12" height="9" fill="#e5e7eb"' + OUT + '/><rect x="38" y="10" width="12" height="9" fill="#e5e7eb"' + OUT + '/>',
    lens: '<circle cx="27" cy="27" r="16" fill="#c8ecff"' + OUT + '/><circle cx="27" cy="27" r="16" fill="none" stroke="#2b6cb0" stroke-width="4"/><path d="M39 39 L54 54" stroke="#7a4a1a" stroke-width="7" stroke-linecap="round"/><path d="M20 20 C22 17 26 16 29 17" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>',
    double: '<path d="M22 8 L26 20 L38 24 L26 28 L22 40 L18 28 L6 24 L18 20Z" fill="#ffd166"' + OUT + '/><path d="M44 26 L47 35 L56 38 L47 41 L44 50 L41 41 L32 38 L41 35Z" fill="#ffb21e"' + OUT + '/>',
    lucky: '<g' + OUT + '><circle cx="24" cy="22" r="10" fill="#4caf50"/><circle cx="40" cy="22" r="10" fill="#4caf50"/><circle cx="24" cy="38" r="10" fill="#4caf50"/><circle cx="40" cy="38" r="10" fill="#4caf50"/></g><path d="M32 32 C34 44 38 50 44 58" stroke="#2e7d32" stroke-width="3.5" stroke-linecap="round" fill="none"/>'
  };
  function powerUp(k) { return g(PU[k] || PU.double); }
  function boss(beaten) {
    var eyes = beaten ? '<path d="M38 56 Q44 60 50 56 M70 56 Q76 60 82 56" stroke="#2a1f3a" stroke-width="4" fill="none" stroke-linecap="round"/><text x="88" y="30" font-size="16" font-weight="900" fill="#fff">z</text><text x="98" y="18" font-size="12" font-weight="900" fill="#fff">z</text>'
      : '<path d="M34 46 L50 52 M86 46 L70 52" stroke="#2a1f3a" stroke-width="5" stroke-linecap="round"/><circle cx="44" cy="58" r="6" fill="#fff"/><circle cx="76" cy="58" r="6" fill="#fff"/><circle cx="45" cy="59" r="3" fill="#2a1f3a"/><circle cx="77" cy="59" r="3" fill="#2a1f3a"/>';
    var mouth = beaten ? '<path d="M50 76 Q60 82 70 76" stroke="#2a1f3a" stroke-width="4" fill="none" stroke-linecap="round"/>' : '<path d="M44 76 Q60 70 76 76 L72 82 L66 77 L60 82 L54 77 L48 82Z" fill="#fff" stroke="#2a1f3a" stroke-width="3" stroke-linejoin="round"/>';
    return '<svg class="boss-svg" viewBox="0 0 120 110" aria-hidden="true"><ellipse cx="60" cy="104" rx="40" ry="6" fill="rgba(0,0,0,.2)"/>' +
      '<path d="M30 30 L22 6 L42 22Z M90 30 L98 6 L78 22Z" fill="#ffd166" stroke="#2a1f3a" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M14 70 C14 34 34 20 60 20 C86 20 106 34 106 70 C106 94 88 102 60 102 C32 102 14 94 14 70Z" fill="' + (beaten ? '#9b8cc9' : '#7b5cd6') + '" stroke="#2a1f3a" stroke-width="3.5"/>' +
      '<path d="M30 88 C40 96 80 96 90 88" stroke="#5a3fb0" stroke-width="3" fill="none" opacity=".6"/>' + eyes + mouth + '</svg>';
  }
  root.Items = { find: find, powerUp: powerUp, boss: boss, KINDS: Object.keys(K) };
})(window);
