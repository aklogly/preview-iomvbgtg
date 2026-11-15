/* Kindling v5.4 — story.js : every word of the companion RPG and the Chronicle, per theme.
 * The engine (rpg.js) knows ids and numbers only; this file turns them into names and prose.
 * Tokens: {name} {they} {They} {them} {their} {Their} {paw} {sound} {sounding} and, in Grove, the spirit-kind
 * lines {kindArrival} {kindHabit} {kindMove} {kindPush}. The Book is written in the past tense so a pronoun is
 * never followed by "is/was" (works for she, he and they alike).
 * Nothing here mentions doses, medicines or dates. Pages are numbered by days played. */
(function (root) {
  'use strict';

  var STORY = {
    expedition: {
      stats: { way: ['Wayfinding', '🧭'], for: ['Foraging', '🌿'], grit: ['Grit', '🪨'], charm: ['Charm', '💬'] },
      tiers: { steady: 'Steady', great: 'Great', amazing: 'Amazing' },
      slots: { tool: 'Tool', garb: 'Garb', trinket: 'Trinket' },
      gear: {
        compass: 'Brass Compass', satchel: 'Forager’s Satchel', lantern: 'Storm Lantern', boots: 'Trail Boots', cloak: 'Gale Cloak', scarf: 'Friendly Scarf',
        acorn: 'Lucky Acorn', bead: 'Wayfinder’s Bead', stone: 'Story Stone', spyglass: 'Long Spyglass', basket: 'Bottomless Basket', mantle: 'Storm Mantle',
        ribbon: 'Festival Ribbon', compassrose: 'Compass Rose Pin', sunfire: 'Sunfire Compass', hearth: 'Hearth Satchel', phoenix: 'Phoenix Cloak', songbird: 'Songbird Scarf', starmap: 'Starmap Bead'
      },
      perk: 'Once per quest, its first Steady beat becomes Great.',
      tree: {
        name: 'Pathfinder', blurb: 'Where {name} can go, and what {they} can see.',
        nodes: {
          trail: ['Trail Sense', '+2 Wayfinding'], scout: ['Scout Ahead', 'The board shows every quest’s hidden beat.'],
          wind: ['Second Wind', '+3 Wayfinding'], fork: ['Ridge or water?', 'Pick one. The other stays closed.'],
          stride: ['Long Stride', '+3 Wayfinding'], paths: ['Hidden Paths', 'An Amazing Wayfinding beat adds a Secret Spot page to the Journal.'],
          cap: ['Trailblazer or Cartographer', 'The big choice at the top of the tree. Comes later in the full game.']
        },
        sides: { ridge: ['Ridge Runner', '+4 Wayfinding on ridge beats'], water: ['Wavecutter', '+4 Wayfinding on water beats'] }
      },
      tags: { ridge: '⛰ ridge', water: '💧 water' },
      quests: {
        q1: { name: 'Saltflats Crossing', icon: '🏜️', beats: [
          { name: 'Cross the salt ridge', lines: ['The salt ridge glared too bright to read, so {name} took the long way round and found an old cart track going the same way.', '{name} picked a line across the salt ridge and stuck to it, hopping from shadow to shadow.', '{name} ran the whole salt ridge without one wrong turn and stood on the top rock while the flats shone white below.'] },
          { name: 'Find water in the flats', lines: ['There was no water in the flats today, but {name} found a patch of shade and a cool stone to lie on.', '{name} sniffed out a damp spot under the crust and dug until clear water came up.', '{name} found a spring nobody marks on maps, ringed with tiny pink salt crystals.'] },
          { name: 'Follow the hidden creek', lines: ['{name} heard a creek somewhere under the salt, could not find it, and marked the spot for next time.', '{name} followed the sound of water under the salt until the creek came up into the open.', '{name} followed the hidden creek all the way to a deep blue pool, and swam in it until the sun went down.'] }
        ] },
        q2: { name: 'Canopy Climb', icon: '🌴', beats: [
          { name: 'Climb the tall kapok', lines: ['The big kapok tree was slippery after the rain, so {name} climbed the friendly fig next to it instead.', '{name} climbed the tall kapok branch by branch, and only looked down once.', '{name} climbed past the top of the kapok, into the wind, and sat with the clouds for a while.'] },
          { name: 'Find the rope bridge', lines: ['{name} never found the rope bridge, but found a vine swing, which is almost as good.', '{name} found the old rope bridge and crossed it slowly, one board at a time.', '{name} found a second rope bridge nobody knew about, hidden behind a curtain of orchids.'] },
          { name: 'Make friends with the parrots', lines: ['The parrots were busy shouting at each other, so {name} sat nearby and listened.', 'A red parrot let {name} share a branch and a handful of seeds.', 'The whole parrot flock took {name} in for the afternoon and showed off their best fruit tree.'] }
        ] },
        q3: { name: 'Tidepool Wander', icon: '🌊', beats: [
          { name: 'Comb the rock pools', lines: ['The tide stayed high, so {name} combed the dry rocks and found a perfect skipping stone.', '{name} checked every rock pool along the point and came back with full pockets.', 'In the very last rock pool {name} found a shell that hums when you hold it to your ear.'] },
          { name: 'Trade with the crabs', lines: ['The crabs did not feel like trading, so {name} waved and left them a pebble anyway.', '{name} traded a shiny pebble with a crab for a piece of old blue sea glass.', 'The crab king himself came out to trade, and gave {name} a pearl in return for a story.'] },
          { name: 'Wade out at high tide', lines: ['The waves came in big, so {name} waited on the sand and counted them instead.', '{name} waded out to the sandbar at high tide and back again, soaked and grinning.', '{name} waded out past the sandbar and stood on the old wreck while the whole sea went gold.'] }
        ] }
      },
      book: {
        title: 'The Chronicle of {name}', journal: 'Trail Journal',
        prologue: { title: 'Before the First Trail', text:
          'For three nights the campfire burned low, and for three nights a single ember refused to go out. It sat in the ash like a tiny orange eye, watching.\n\n' +
          'On the fourth morning, the ember sat up.\n\n' +
          'It shook off the ash. It sneezed. It grew ears, then a tail, then a very surprised face. By the time the kettle boiled, it was {name}, and {name} was looking straight at you.\n\n' +
          'Nobody at camp could say where the ember came from. The old map on the post had a blank corner. The trail sign pointed four ways at once. {name} sniffed at all of it and gave one small {sound}, the way you would if you had just been born and found the world already full of things.\n\n' +
          'That night {name} would not sleep until the fire was down to coals. Then one {paw} came out from under the blanket, pointed at the dark past the tents, and stayed there.\n\n' +
          'Some stories start with a map. This one starts with a {paw}, pointing.' },
        ch1: {
          title: 'Chapter One: The Three Trails',
          intro: '{name} has grown. Not a lot, but enough. Enough to see over the woodpile. Enough to stay out past the tents until the fire is only a dot of light behind.\n\n' +
            'This morning {name} walked to the edge of camp and stopped where the path splits into three.\n\n' +
            'One trail climbs to the high ridge, where the wind never stops. One drops down to the berry hollow, where everything smells like jam. One winds up to the old watchtower, which looks out over camp and everyone in it.\n\n' +
            '{name} looks back at you. Which way?',
          options: [
            { id: 'ridge', label: 'The high ridge', why: 'To see how far the world goes.' },
            { id: 'hollow', label: 'The berry hollow', why: 'To bring something back for camp.' },
            { id: 'tower', label: 'The old watchtower', why: 'To keep an eye on home.' }
          ],
          variants: {
            ridge: '{name} took the ridge trail at a run and did not slow down until the trees ran out.\n\n' +
              'Up top the wind was loud and cold and smelled of snow, even in summer. {name} leaned into it and climbed the last rock on all fours.\n\n' +
              'From there you could see everything. The salt flats, white as a plate. The green smudge of the canopy. A river nobody had named, curling off the edge of the map. {name} stared at that river for a long time.\n\n' +
              'On the way down, {name} found a hawk feather caught in a thornbush and carried it home very carefully, like a letter.\n\n' +
              'That night {name} pushed the feather into the dirt by the trail sign, pointing at the river. It is still there.\n\n' +
              'From then on, everyone at camp called {them} {name} of the High Ridge.',
            hollow: '{name} took the low trail, down where the ferns grow taller than tents and the air hums with bees.\n\n' +
              'The berry hollow was exactly as good as it smelled. Blackberries. Wild strawberries the size of a thumbnail. One bush so heavy with fruit that it bent all the way to the ground, as if it were bowing.\n\n' +
              '{name} ate one berry. Then two. Then remembered the whole point, and started filling a big leaf instead, one berry at a time, nudging the soft ones into the middle so they would not squash.\n\n' +
              'It took all afternoon to carry that leaf back up the hill. Twice it nearly tipped. Twice {name} stopped, sat down, and fixed it.\n\n' +
              'At dinner there was a little pile of berries on every plate in camp. Nobody had to ask who did it. A trail of purple {paw} prints went straight to {name}’s bed.\n\n' +
              'From then on, everyone at camp called {them} {name} of the Berry Hollow.',
            tower: '{name} took the winding trail up to the old watchtower, the one with the loose third step that everyone warns you about.\n\n' +
              '{name} skipped the third step.\n\n' +
              'At the top there was a bench, a bird’s nest, and a view of camp so clear you could count the tent pegs. {name} sat on the bench and counted them. Then counted the people. Then counted again, to be sure.\n\n' +
              'A storm rolled in that afternoon, fast and dark. From the tower {name} saw it first, and came tearing down the trail, {sounding} at every tent until the flaps were tied and the firewood was under the tarp.\n\n' +
              'The rain came. Camp stayed dry. Afterward someone found a small, muddy {paw} print on the tower bench, right where a guard would sit.\n\n' +
              'From then on, everyone at camp called {them} {name} of the Watchtower.'
          }
        },
        titles: { ridge: 'of the High Ridge', hollow: 'of the Berry Hollow', tower: 'of the Watchtower' },
        weekly: { title: 'A Week on the Trail', open: 'Seven days out. Here is what {name} would want you to remember.', close: 'On the last night {name} fell asleep by the fire with the map still open, already planning the next one.' },
        quiet: { title: 'By the Fire', text: 'Some days the trail can wait.\n\n{name} spent a few of them by the fire, mending the strap on an old satchel and teaching a moth to land on {their} nose. The moth was not a quick learner. {name} did not mind.\n\nWhen {name} set out again, the satchel sat just a little better on {their} shoulder, and the moth came too.' },
        chapters: ['', '', 'The Long Grass', 'Ranger’s Knot', 'A Bell in the Storm', 'The Captain’s Map', 'Lanterns on the Water', 'The Crown of Leaves', 'The Long Night', 'Starfall', 'The Legend of {name}'],
        volumes: ['Volume I: First Sparks', 'Volume II: Far Fires', 'Volume III: The Legend Years'],
        paths: { wanderer: 'Wanderer', gatherer: 'Gatherer', guardian: 'Guardian' }
      }
    },

    grove: {
      stats: { way: ['Wayfinding', '🧭'], for: ['Foraging', '🌿'], grit: ['Grit', '🪨'], charm: ['Charm', '💬'] },
      tiers: { steady: 'Steady', great: 'Great', amazing: 'Amazing' },
      slots: { tool: 'Tool', garb: 'Garb', trinket: 'Trinket' },
      gear: {
        compass: 'Moonstone Compass', satchel: 'Acorn Satchel', lantern: 'Firefly Lantern', boots: 'Moss Slippers', cloak: 'Thistle Cloak', scarf: 'Petal Scarf',
        acorn: 'Lucky Clover', bead: 'Dewdrop Bead', stone: 'Wishing Pebble', spyglass: 'Honeycomb Spyglass', basket: 'Harvest Basket', mantle: 'Bark Mantle',
        ribbon: 'Maypole Ribbon', compassrose: 'Dandelion Pin', sunfire: 'Sunrise Compass', hearth: 'Harvest Moon Satchel', phoenix: 'Rowan Cloak', songbird: 'Nightingale Scarf', starmap: 'Starflower Bead'
      },
      perk: 'Once per wander, its first Steady beat becomes Great.',
      tree: {
        name: 'Pathfinder', blurb: 'Where {name} can wander, and what {they} can see.',
        nodes: {
          trail: ['Trail Sense', '+2 Wayfinding'], scout: ['Scout Ahead', 'The board shows every wander’s hidden beat.'],
          wind: ['Second Wind', '+3 Wayfinding'], fork: ['Hill or water?', 'Pick one. The other stays closed.'],
          stride: ['Long Stride', '+3 Wayfinding'], paths: ['Hidden Paths', 'An Amazing Wayfinding beat adds a Secret Spot page to the Journal.'],
          cap: ['Pathmaker or Mapkeeper', 'The big choice at the top of the tree. Comes later in the full game.']
        },
        sides: { ridge: ['Hilltop Hopper', '+4 Wayfinding on hill beats'], water: ['Brook Skipper', '+4 Wayfinding on water beats'] }
      },
      tags: { ridge: '⛰ hill', water: '💧 water' },
      quests: {
        q1: { name: 'Over the Hill to Market', icon: '🧺', beats: [
          { name: 'Climb Thyme Hill', lines: ['Thyme Hill was wrapped in fog, so {name} took the lane around the bottom and said hello to the cows.', '{name} went straight over Thyme Hill and down the other side before the church bell rang nine.', '{name} found a shortcut over Thyme Hill that even the postman does not know, and got to market first.'] },
          { name: 'Pick the best plums', lines: ['The best plums were gone by the time {name} arrived, but the plum seller gave {them} a free one anyway.', '{name} picked out a whole bag of plums without a single bruise.', '{name} found a crate of golden plums at the back of the stall, the kind that only come once a year.'] },
          { name: 'Cross the stepping stones', lines: ['The brook was high, so {name} walked down to the bridge and watched the ducks.', '{name} crossed the brook on the stepping stones and did not get one toe wet.', '{name} found a hidden line of stepping stones downstream and followed it to a pool full of watercress.'] }
        ] },
        q2: { name: 'The Far Meadow', icon: '🌼', beats: [
          { name: 'Brave the windy rise', lines: ['The wind on the rise was strong, so {name} sat low in the long grass until it passed.', '{name} kept low and walked up the windy rise without stopping once.', '{name} stood on top of the windy rise and let the wind carry every seed head in the meadow into the sky.'] },
          { name: 'Find the hidden path', lines: ['{name} could not find the path in the tall grass, but found a ring of mushrooms to sit in.', '{name} found the hidden path through the meadow by following the poppies.', '{name} followed the hidden path to an old stone bench that nobody had sat on in years.'] },
          { name: 'Chat with the bees', lines: ['The bees were too busy to talk, so {name} hummed along with them instead.', 'The bees showed {name} which clover patch had the sweetest flowers.', 'The queen bee herself came out to say thank you, and the whole hive sang.'] }
        ] },
        q3: { name: 'The Old Orchard', icon: '🍎', beats: [
          { name: 'Gather windfalls by the brook', lines: ['Most of the windfalls by the brook were soft, but {name} found one good pear.', '{name} filled a basket with windfall apples from under the trees by the brook.', '{name} found a tree by the brook with apples striped red and gold, a kind nobody in the village has tasted.'] },
          { name: 'Ask the old crow', lines: ['The old crow pretended to be asleep, so {name} left a crust on the fence post and tiptoed off.', 'The old crow told {name} which tree had the best pears this year.', 'The old crow walked {name} to a secret tree and asked for nothing but a little company.'] },
          { name: 'Wait out the rain', lines: ['When the rain came, {name} sheltered under a big leaf and watched the drops race.', '{name} waited out the rain under the old pear tree and came home with clean, shining fruit.', '{name} stayed out through the whole storm and saw the orchard’s first rainbow of the year.'] }
        ] }
      },
      kinds: {
        fairy: {
          arrival: 'A fairy no bigger than a teacup lay asleep on it, wings folded like two pressed petals. When the sun touched the stone, {they} yawned so wide {they} nearly rolled off.',
          habit: 'turned three quick loops in the air', move: 'flying in short, happy hops', push: 'had to ask two sparrows for help with the heavy part',
          postcards: ['I flew so high the swallows looked small. Brought you this.', 'Found this inside a dewdrop. Don’t laugh, it’s true.', 'A bee told me a secret. I’ll tell you later.']
        },
        gnome: {
          arrival: 'A gnome sat on it, boots crossed, red hat pulled down against the dew. {They} had clearly been waiting a while, and did not mind one bit.',
          habit: 'tipped {their} hat', move: 'boots crunching on every step', push: 'pushed it the whole way and would not hear of resting',
          postcards: ['Walked all day. Boots are fine. Brought you this.', 'Dug this up by the old fence. Good, solid find.', 'Market was busy. I kept my hat on.']
        },
        sprite: {
          arrival: 'A sprite the color of new leaves lay on it, humming. Every time {they} hummed, the clover around the stone stood up a little straighter.',
          habit: 'hummed a little louder', move: 'barely bending the grass', push: 'sang to it until the wheel stopped squeaking',
          postcards: ['The meadow was humming. I hummed back.', 'Every leaf said hello. I brought one home.', 'The brook has a new song today. Here’s a bit of it.']
        },
        mushroom: {
          arrival: 'A mushroom had come up beside it overnight, round and red with white spots. Then the mushroom stretched, opened two sleepy eyes under {their} cap, and said good morning.',
          habit: 'settled a little deeper into the moss', move: 'slow and steady, never once stopping', push: 'rolled it along an inch at a time and never dropped a single plum',
          postcards: ['Took my time. Found this anyway.', 'It rained. I liked that very much.', 'The shade under the oaks is perfect. Here’s a little piece of it.']
        },
        firefly: {
          arrival: 'A firefly spirit rested on it, glowing softly even in daylight, as if someone had left a tiny lamp on. When {they} saw you, the glow went from yellow to gold.',
          habit: 'blinked {their} light twice', move: 'glowing a little brighter with every step', push: 'lit the path so the wheel rolled clear of every root',
          postcards: ['Lit the way home for a wandering beetle. Found this on the path.', 'The night was soft. I glowed the whole way.', 'Saw the first star before anyone. Here’s a little sparkle.']
        }
      },
      book: {
        title: 'The Chronicle of {name}', journal: 'Garden Journal',
        prologue: { title: 'Before the First Bloom', text:
          'At the bottom of the cottage garden, past the bean poles and the rain barrel, there is a corner nobody weeds. Clover grows there, and a few stubborn daisies, and one flat stone that stays warm long after sunset.\n\n' +
          'One spring morning the stone had company.\n\n' +
          '{kindArrival}\n\n' +
          '{name} looked at the garden the way you look at a letter with your name on it. Then {name} looked at you.\n\n' +
          'Nobody could say where garden spirits come from. Your neighbor said they come up with the first warm rain. The old seed book said they come when someone starts looking after something every day. {name} did not say. {name} only {kindHabit}, and stayed.\n\n' +
          'That evening, when the light went gold, {name} climbed to the top of the garden wall and sat facing the far hills, very still, like a seed deciding which way to grow.\n\n' +
          'Some stories start with a key. This one starts with a garden wall, and someone small sitting on top of it.' },
        ch1: {
          title: 'Chapter One: The Three Gates',
          intro: '{name} has grown. Not a lot, but enough. Enough to reach the latch on the garden gate. Enough to wander past the beans until the cottage chimney is only a thin line of smoke.\n\n' +
            'Beyond the garden there are three gates. The blue gate opens onto Thyme Hill, where the wind brushes the whole slope silver. The green gate opens onto the old orchard, heavy with fruit nobody picks. The little wooden gate opens onto the path to the village well, where everyone in the valley stops to talk.\n\n' +
            '{name} looks back at you. Which gate?',
          options: [
            { id: 'ridge', label: 'The blue gate to Thyme Hill', why: 'To see what is over the top.' },
            { id: 'hollow', label: 'The green gate to the orchard', why: 'To bring something home.' },
            { id: 'tower', label: 'The little gate to the well', why: 'To look after the neighbors.' }
          ],
          variants: {
            ridge: '{name} pushed open the blue gate and went straight up Thyme Hill, {kindMove}.\n\n' +
              'The higher {name} climbed, the stronger the thyme smelled, until the whole world seemed to be made of it. Near the top a lark went up out of the grass, singing, and {name} followed the song for the last few steps.\n\n' +
              'From the top you could see three more hills, a church spire, and a silver line that might have been the sea. {name} sat in the warm grass and looked for a long time, not at anything in particular. Just at how much there was.\n\n' +
              'On the way home {name} picked one sprig of thyme and tucked it behind the garden gate, where you would find it.\n\n' +
              'From then on, the bees and the blackbirds called {them} {name} of Thyme Hill.',
            hollow: '{name} lifted the latch on the green gate and slipped into the old orchard.\n\n' +
              'Nobody had picked it in years. Apples lay in the grass. Pears hung so low they bumped your head. A plum tree had grown right through an old wheelbarrow and filled it with fruit, as if it wanted to help.\n\n' +
              '{name} chose carefully. Not the bruised ones. Not the ones the wasps had found first. Only the best, one at a time, laid in the wheelbarrow on a bed of soft leaves.\n\n' +
              'It took the whole afternoon to get that wheelbarrow home. {name} {kindPush}.\n\n' +
              'That night the cottage smelled of baked apples, and there was a jar of plum jam on the windowsill with a crooked label nobody remembered writing.\n\n' +
              'From then on, the old trees called {them} {name} of the Orchard.',
            tower: '{name} squeezed through the little wooden gate and followed the path down to the village well.\n\n' +
              'Everyone stopped at the well sooner or later. The baker. The postman. Old Mrs. Pell with her two goats. {name} sat on the stone rim and listened to all of them, and remembered everything.\n\n' +
              'That afternoon one of the goat kids wandered off. Mrs. Pell called and called. It was {name} who remembered the gate in the far field that never quite shut, and {name} who found the kid there, chewing a fence post as if nothing had happened.\n\n' +
              'Mrs. Pell brought a seed cake to the cottage the next morning. She said she had never seen anyone so small keep such a careful eye on things.\n\n' +
              'From then on, the whole village called {them} {name} of the Well.'
          }
        },
        titles: { ridge: 'of Thyme Hill', hollow: 'of the Orchard', tower: 'of the Well' },
        weekly: { title: 'A Week in the Garden', open: 'Seven days, and the garden is a little different after every one of them. Here is what {name} would want you to remember.', close: 'On the last evening {name} sat on the garden wall until the first star came out, then went in to bed.' },
        quiet: { title: 'Under the Rhubarb', text: 'Some days the garden only needs watching.\n\n{name} spent a few of them under the big rhubarb leaves, listening to the rain and sorting seeds into three piles: big ones, small ones, and ones that might be magic.\n\nWhen the sun came back, the magic pile had sprouted. {name} pretended not to be surprised.' },
        chapters: ['', '', 'The Seed Fair', 'Hedge and Hollow', 'The Gardener’s Year', 'Keeper of the Grove', 'The Elder Oak', 'Under the Canopy', 'The Ancient Well', 'Moonflower', 'The Legend of {name}'],
        volumes: ['Volume I: First Shoots', 'Volume II: Long Summers', 'Volume III: The Legend Years'],
        paths: { wanderer: 'Wanderer', gatherer: 'Gatherer', guardian: 'Guardian' }
      }
    }
  };

  function T(theme) { return STORY[theme] || STORY.expedition; }
  // ctx: { theme, name, def } (def = the theme's companion definition: pron, paw, sound, kind)
  function fill(text, ctx) {
    var d = ctx.def || {}, p = d.pron || ['they', 'them', 'their'], k = (T(ctx.theme).kinds || {})[d.kind] || null;
    var cap = function (x) { return x.charAt(0).toUpperCase() + x.slice(1); };
    var map = { name: ctx.name, they: p[0], They: cap(p[0]), them: p[1], their: p[2], Their: cap(p[2]), paw: d.paw || 'paw', sound: d.sound || 'yip', sounding: d.sounding || 'yipping' };
    var out = String(text);
    if (k) out = out.replace(/\{kindArrival\}/g, k.arrival).replace(/\{kindHabit\}/g, k.habit).replace(/\{kindMove\}/g, k.move).replace(/\{kindPush\}/g, k.push);
    else out = out.replace(/\{kindArrival\}/g, 'A small garden spirit sat on it, watching the bees.').replace(/\{kindHabit\}/g, 'smiled').replace(/\{kindMove\}/g, 'never once looking back').replace(/\{kindPush\}/g, 'never once gave up');
    return out.replace(/\{(\w+)\}/g, function (m, key) { return map[key] != null ? map[key] : m; });
  }
  root.Story = { STORY: STORY, T: T, fill: fill };
})(typeof window !== 'undefined' ? window : globalThis);
