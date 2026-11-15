/* Kindling v5 — themes.js
 * Theme packs render engine ids. Switching theme re-skins everything; progress is untouched.
 * Medicine surfaces (Meds tab, safety, settings) never read theme words.
 */
(function (root) {
  'use strict';
  var THEMES = {
    expedition: {
      id: 'expedition', name: 'Expedition', blurb: 'Bright trails, big finds, a buddy who can’t sit still.',
      terms: { charge: 'Spark', core: 'Beacon', piece: 'piece', run: 'Daily Run', trip: 'Quest', trips: 'Quests', finds: 'Specimens', find: 'Specimen', home: 'Camp', album: 'Field Guide', chest: 'Chest' },
      // v5.3 Campfire (daily-visit count). Shields are "Spare logs". Growth stages come from total days played.
      camp: { name: 'Campfire', is: 'is', start: 'Start a Campfire', ready: 'Your Campfire’s ready to light again', counts: 'The Campfire counts', icon: '🔥', shield: 'Spare log', shields: 'Spare logs', shieldIcon: '🪵', treatIcon: '🍖', lit: 'Today’s fire is lit', light: 'light', today: 'light today’s fire', relight: 'Relight',
        dayLabel: function (n) { return 'Campfire: day ' + n; }, relightLabel: function (n) { return 'Relight your ' + n + '-day Campfire'; },
        // 11 growth stages on Engine.GROWTH thresholds (0, 7, 21, 45, 75, 110, 160, 230, 320, 450, 600 total days played)
        stages: ['Hatchling', 'Cub', 'Scout', 'Ranger', 'Warden', 'Captain', 'Commander', 'Monarch', 'Epic', 'Mythic', 'Legend'],
        stageAdds: ['', 'a little bigger', 'a trail scarf', 'a ranger badge', 'a feather in the cap', 'a captain’s cape', 'a gold medal', 'a silver circlet', 'a sparkling halo', 'glowing star orbs', 'golden wings and a golden glow'],
        // one-of-a-kind milestone cosmetics (days 365, 730, 1000)
        cosmetics: { m365: 'Ember Crown', m730: 'Starlight Cape', m1000: 'Phoenix Plume' },
        fed: ['Mmm! Thanks, that hit the spot.', 'Best snack ever. Thank you!', 'Yum. Ready for anything now.'], reminder: '{name} saved you a treat 🔥' },
      companions: [
        // v5.4: pron/paw/sound feed the Book and postcards (the templates never hard-code "she").
        { id: 'fox', species: 'Fox kit', vibe: 'Cute', defaultName: 'Ember', body: '#ff8a4c', belly: '#ffe3c7', accent: '#ffcf5a', ears: 'pointy', pron: ['she', 'her', 'her'], paw: 'paw', sound: 'yip', sounding: 'yipping' },
        { id: 'otter', species: 'River otter', vibe: 'Cheerful', defaultName: 'Pebble', body: '#a8724f', belly: '#f3dcc0', accent: '#4fd1c5', ears: 'round', pron: ['he', 'him', 'his'], paw: 'paw', sound: 'chirp', sounding: 'chirping' },
        { id: 'drake', species: 'Ridge drake', vibe: 'Cool', defaultName: 'Nova', body: '#2bb3a3', belly: '#c9f5ea', accent: '#ffb020', ears: 'horns', pron: ['they', 'them', 'their'], paw: 'claw', sound: 'rumble', sounding: 'rumbling' }
      ],
      destinations: [
        { id: 'saltflats', name: 'the Saltflats', icon: '🏜️', route: 'Fast and open' },
        { id: 'canopy', name: 'the Canopy', icon: '🌴', route: 'Up in the treetops' },
        { id: 'tidepools', name: 'the Tidepools', icon: '🌊', route: 'Slow and curious' }
      ],
      sets: [
        { name: 'Saltflats', finds: [['Sand crystal', 'crystal', '#f6d7a7', '#c9a26b'], ['Rose crystal', 'crystal', '#f8b4c8', '#d97a9a'], ['Sky crystal', 'crystal', '#a8dcf5', '#5aa9d6'], ['Mint crystal', 'crystal', '#b5ecd1', '#5fbf94'], ['Amber twins', 'twin', '#ffc864', '#ffa94d'], ['Violet twins', 'twin', '#cdb4ff', '#a58bf0'], ['Crystal cluster', 'cluster', '#9fe3ff', '#c9b8ff'], ['Sun crystal', 'crystal', '#ffd84d', '#ff9e2c'], ['Starheart cluster', 'cluster', '#ffe27a', '#ff9ec2']] },
        { name: 'Canopy', finds: [['Green leaf', 'leaf', '#8fd16f', '#4f8f3a'], ['Lime leaf', 'leaf', '#c6e86a', '#7aa13a'], ['Autumn leaf', 'leaf', '#ff9f4a', '#c2611e'], ['Gold leaf', 'leaf', '#ffd166', '#c99a2e'], ['Blue feather', 'feather', '#7cc4f2', '#2f6f9f'], ['Parrot feather', 'feather', '#5fd38d', '#ff9f4a'], ['Twin leaves', 'twinleaf', '#8fd16f', '#c6e86a'], ['Jade feather', 'feather', '#4fd1a5', '#1f7a5f'], ['Sunbird feather', 'feather', '#ffd166', '#ff7a3d']] },
        { name: 'Tidepools', finds: [['Sand scallop', 'scallop', '#f6d7a7', '#c9a26b'], ['Pink scallop', 'scallop', '#f8b4c8', '#d97a9a'], ['Sea snail', 'snail', '#d9b38c', '#8a5a3a'], ['Blue snail', 'snail', '#9fd0f0', '#3f7fb0'], ['Starfish', 'star', '#ffb36b', '#d9782e'], ['Coral starfish', 'star', '#ff9e9e', '#d96a7a'], ['Spiral conch', 'conch', '#ffd2b0', '#d98a5a'], ['Pearl shell', 'pearl', '#ffffff', '#c9d6e8'], ['Moon conch', 'conch', '#e6dcff', '#9b86e0']] },
        { name: 'Summit', finds: [['Snowflake', 'snowflake', '#9fd8ff', '#ffffff'], ['Ice snowflake', 'snowflake', '#c9b8ff', '#ffffff'], ['Pine sprig', 'pine', '#5fae6a', '#8a5a3a'], ['Frost pine', 'pine', '#9fd8c9', '#8a5a3a'], ['Ice gem', 'gem', '#bfe8ff', '#5aa9d6'], ['Glacier gem', 'gem', '#a8f0e0', '#3fbf9f'], ['Aurora flake', 'snowflake', '#7fe8c4', '#c9b8ff'], ['Summit gem', 'gem', '#ffd166', '#ff9e2c'], ['Starlight gem', 'gem', '#e2c9ff', '#ff9ec2']] }
      ],
      decor: [
        { id: 'd1', name: 'Striped tent', icon: '⛺', cost: 120 }, { id: 'd2', name: 'Campfire', icon: '🔥', cost: 80 },
        { id: 'd3', name: 'Lantern', icon: '🏮', cost: 60 }, { id: 'd4', name: 'Telescope', icon: '🔭', cost: 200 },
        { id: 'd5', name: 'Trail sign', icon: '🪧', cost: 50 }, { id: 'd6', name: 'Hammock palm', icon: '🌴', cost: 150 },
        { id: 'd7', name: 'Map table', icon: '🗺️', cost: 140 }, { id: 'd8', name: 'Backpack', icon: '🎒', cost: 70 }
      ],
      powerUps: {
        magnet: { name: 'Magnet', does: 'Also grabs Specimens next to your path' },
        lens: { name: 'Lens', does: 'Shows every mystery tile before you go' },
        double: { name: 'Double', does: 'One Specimen you pick pays double' },
        lucky: { name: 'Lucky', does: 'Upgrades one Specimen on the board' }
      },
      lines: {
        back: 'Look what I found!',
        hello: ['Morning! Ready when you are.', 'Hey you. Big day out there.', 'I packed snacks. Let’s go.'],
        holding: 'Got it! Tap Swallowed once it’s down.',
        caught: ['Yes! That’s a piece.', 'Snapped right in!', 'Look at that glow.'],
        full: 'Full Spark. Look who showed up.',
        honest: 'Thanks for telling me. That helps more than you’d think.',
        away: 'out exploring',
        signoff: 'That’s the day. I’ll bring something back in the morning.',
        reunion: 'Hey, you’re here. Camp kept a seat warm for you.',
        postcards: ['Found this by the water. Thought of you.', 'You would not believe the view up there.', 'Took the long way. Worth it.']
      }
    },
    grove: {
      id: 'grove', name: 'Grove', blurb: 'A quiet garden that blooms as your day comes together.',
      terms: { charge: 'Sunlight', core: 'Bloom', piece: 'petal', run: 'Daily Run', trip: 'Wander', trips: 'Wanders', finds: 'Seeds & Blooms', find: 'Bloom', home: 'Cottage', album: 'Garden Book', chest: 'Basket' },
      // v5.4: the count is "Garden days" (Bloom is the name of the Finds, Seeds & Blooms).
      camp: { name: 'Garden days', is: 'are', start: 'Start your Garden days', ready: 'Your Garden days are ready to start again', counts: 'Garden days count', icon: '🌸', shield: 'Dewdrop', shields: 'Dewdrops', shieldIcon: '💧', treatIcon: '🍯', lit: 'Today counts as a garden day', light: 'count', today: 'count today', relight: 'Regrow',
        dayLabel: function (n) { return n + ' Garden day' + (n === 1 ? '' : 's'); }, relightLabel: function (n) { return 'Regrow your ' + n + ' Garden days'; },
        stages: ['Seed', 'Sprout', 'Sapling', 'Leafling', 'Gardener', 'Grove-keeper', 'Elder', 'Canopy', 'Ancient', 'Mythic', 'Legend'],
        stageAdds: ['', 'a little bigger', 'a petal scarf', 'a garden badge', 'a leaf in the cap', 'a leafy cloak', 'a gold medal', 'a silver circlet', 'a sparkling halo', 'glowing seed orbs', 'golden wings and a golden glow'],
        cosmetics: { m365: 'Flower Crown', m730: 'Moonpetal Shawl', m1000: 'Golden Laurel' },
        fed: ['Oh, lovely. Thank you.', 'Honey! My favorite.', 'That was just right. Thank you.'], reminder: '{name} saved you a treat 🌸' },
      companions: [
        // v5.4 garden spirits (Logan, 2026-11-09). Same engine; each kind has its own look, growth and voice.
        { id: 'fairy', kind: 'fairy', species: 'Fairy', vibe: 'Quick', defaultName: 'Clover', body: '#f6c6d8', belly: '#fff1f6', accent: '#b9a4f2', ears: 'fairy', pron: ['she', 'her', 'her'], paw: 'hand', sound: 'hum', sounding: 'humming' },
        { id: 'gnome', kind: 'gnome', species: 'Gnome', vibe: 'Steady', defaultName: 'Bramble', body: '#e9c3a0', belly: '#fff3e6', accent: '#e07a5f', ears: 'gnome', pron: ['he', 'him', 'his'], paw: 'hand', sound: 'grunt', sounding: 'grumbling' },
        { id: 'sprite', kind: 'sprite', species: 'Leaf sprite', vibe: 'Gentle', defaultName: 'Fern', body: '#9fd18b', belly: '#eefbe6', accent: '#f4a7a0', ears: 'sprite', pron: ['they', 'them', 'their'], paw: 'hand', sound: 'hum', sounding: 'humming' },
        { id: 'mushroom', kind: 'mushroom', species: 'Mushroom folk', vibe: 'Cozy', defaultName: 'Button', body: '#f3e6cf', belly: '#fffaf0', accent: '#e07a5f', ears: 'mushroom', pron: ['they', 'them', 'their'], paw: 'hand', sound: 'creak', sounding: 'squeaking' },
        { id: 'firefly', kind: 'firefly', species: 'Firefly spirit', vibe: 'Dreamy', defaultName: 'Luna', body: '#7c8fd6', belly: '#e9edff', accent: '#ffe066', ears: 'firefly', pron: ['she', 'her', 'her'], paw: 'hand', sound: 'buzz', sounding: 'buzzing' }
      ],
      destinations: [
        { id: 'market', name: 'the village market', icon: '🧺', route: 'Busy and bright' },
        { id: 'meadow', name: 'the far meadow', icon: '🌼', route: 'Slow and sunny' },
        { id: 'orchard', name: 'the old orchard', icon: '🍎', route: 'Shady paths' }
      ],
      sets: [
        { name: 'Spring Beds', finds: [['Daisy', 'flower', '#ffffff', '#ffd166', 8], ['Pink cosmos', 'flower', '#f8b4c8', '#ffd166', 8], ['Bluebell bloom', 'flower', '#a8c8f5', '#ffffff', 5], ['Buttercup', 'flower', '#ffe066', '#ffb21e', 5], ['Lilac star', 'flower', '#d7c4ff', '#ffd166', 6], ['Peach bloom', 'flower', '#ffc9a8', '#ff9e6b', 6], ['Twin daisies', 'twinflower', '#ffffff', '#ffd166'], ['Rose bloom', 'flower', '#ff9ec2', '#ffd166', 10], ['Golden bloom', 'flower', '#ffd84d', '#ff9e2c', 12]] },
        { name: 'Herb Patch', finds: [['Basil leaf', 'leaf', '#7fc46a', '#3f7a32'], ['Mint leaf', 'leaf', '#9fe0b0', '#3f8f5a'], ['Sage leaf', 'leaf', '#b9cfa8', '#6b8a5a'], ['Thyme sprig', 'sprig', '#8fbf7f', '#b9cfa8'], ['Bay leaf', 'leaf', '#a8c27a', '#5b7a3a'], ['Lavender sprig', 'sprig', '#c9b8ff', '#a58bf0'], ['Twin mint', 'twinleaf', '#9fe0b0', '#7fc46a'], ['Silver sage', 'leaf', '#dfe8d8', '#8aa07a'], ['Moon herb', 'sprig', '#e6dcff', '#b9cfa8']] },
        { name: 'Pond Edge', finds: [['River stone', 'stone', '#b8b2a8', '#ffffff'], ['Dew drop', 'drop', '#bfe8ff', '#ffffff'], ['Lily pad', 'lily', '#7fc46a', ''], ['Pond pebbles', 'pebbles', '#c9c1b4', '#9e968a'], ['Blue drop', 'drop', '#7cc4f2', '#ffffff'], ['Moss stone', 'stone', '#9cc28c', '#e6f2dc'], ['Pink lily', 'lily', '#7fc46a', '#f8b4c8'], ['Lotus pad', 'lily', '#5fae6a', '#ffffff'], ['Moon drop', 'drop', '#d7c4ff', '#ffffff']] },
        { name: 'Orchard', finds: [['Red apple', 'fruit', '#f0734f', '#6fbf5a'], ['Green apple', 'fruit', '#a8d86a', '#5b9a3a'], ['Plum', 'fruit', '#9b7fd6', '#6fbf5a'], ['Apricot', 'fruit', '#ffb46b', '#6fbf5a'], ['Pear', 'pear', '#c9df6a', '#6fbf5a'], ['Cherries', 'cherry', '#e8637a', '#6fbf5a'], ['Golden pear', 'pear', '#ffd166', '#6fbf5a'], ['Peach', 'fruit', '#ffb8a0', '#6fbf5a'], ['Golden apple', 'fruit', '#ffd84d', '#6fbf5a']] }
      ],
      decor: [
        { id: 'd1', name: 'Garden bench', icon: '🪑', cost: 120 }, { id: 'd2', name: 'Birdhouse', icon: '🐦', cost: 80 },
        { id: 'd3', name: 'Lantern', icon: '🏮', cost: 60 }, { id: 'd4', name: 'Beehive', icon: '🐝', cost: 200 },
        { id: 'd5', name: 'Flower pot', icon: '🪴', cost: 50 }, { id: 'd6', name: 'Apple tree', icon: '🌳', cost: 150 },
        { id: 'd7', name: 'Tea table', icon: '🫖', cost: 140 }, { id: 'd8', name: 'Watering pail', icon: '🪣', cost: 70 }
      ],
      powerUps: {
        magnet: { name: 'Magnet', does: 'Also gathers Blooms next to your path' },
        lens: { name: 'Lens', does: 'Shows every hidden bed before you go' },
        double: { name: 'Double', does: 'One Bloom you pick counts twice' },
        lucky: { name: 'Lucky', does: 'Upgrades one Bloom on the path' }
      },
      lines: {
        back: 'I brought you something from the market.',
        hello: ['Good morning. The garden’s waking up.', 'Morning. Tea’s on.', 'The beds look lovely today.'],
        holding: 'I’ll hold this petal. Tap Swallowed once it’s down.',
        caught: ['A new petal.', 'There it goes, into the bloom.', 'Lovely.'],
        full: 'Full Sunlight. The whole bloom is open.',
        honest: 'Thanks for telling me. That helps more than you’d think.',
        away: 'at the market',
        signoff: 'That’s the day. I’ll be back from the market by morning.',
        reunion: 'There you are. The garden kept growing for you.',
        postcards: ['Picked this up at the market. It made me smile.', 'The meadow was golden today.', 'Brought something for the beds.']
      }
    }
  };
  function puIcon(k) { return root.Items ? root.Items.powerUp(k) : ''; }
  Object.keys(THEMES).forEach(function (t) { Object.keys(THEMES[t].powerUps).forEach(function (k) { Object.defineProperty(THEMES[t].powerUps[k], 'icon', { get: function () { return puIcon(k); } }); }); });
  function T(state) { return THEMES[(state && state.theme) || 'expedition'] || THEMES.expedition; }
  function findArt(theme, id) {
    var p = /^s(\d)-(\d)$/.exec(id); if (!p) return { name: id, icon: '❓' };
    var set = theme.sets[+p[1] - 1], f = set.finds[+p[2] - 1];
    var rar = +p[2] <= 4 ? 'common' : +p[2] <= 7 ? 'uncommon' : +p[2] === 8 ? 'rare' : 'epic';
    var svg = root.Items ? root.Items.find(f, rar) : '';
    return { name: f[0], icon: svg, svg: svg, setName: set.name };
  }
  function companionDef(theme, speciesId) {
    var c = theme.companions.filter(function (x) { return x.id === speciesId; })[0];
    if (c) return c;
    // cross-theme mapping: same slot index renders in the other theme
    var other = THEMES[theme.id === 'grove' ? 'expedition' : 'grove'];
    var idx = other.companions.map(function (x) { return x.id; }).indexOf(speciesId);
    return theme.companions[idx >= 0 ? idx : 0];
  }
  function fill(str, theme) { return String(str).replace(/\{(\w+)\}/g, function (_, k) { return theme.terms[k] || k; }); }
  root.THEMES = THEMES; root.Theme = { T: T, findArt: findArt, companionDef: companionDef, fill: fill };
})(window);
