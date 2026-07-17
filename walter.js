/* =====================================================================
   WALTER VS WIZARDS
   A 2D wave-based brawler. Same mid-century modern visual language as
   Wizards & Waffles (bold primary colors, simple flat shapes), but a
   different genre: free-roam movement + climbing across a scrolling
   world, melee + spell combat, and a crystal economy.

   Shares this page with Wizards & Waffles, so this file only reacts to
   input when its OWN canvas is focused — see initGame() at the bottom.

   THIS FIRST PASS covers: movement/climbing/camera, melee combat, all
   five spells (functional, but no visual "skill tree" UI — the altar is
   a simple buy list), the three-zone world, wave spawning with the
   90%-knights-drifting-to-mixed ratio, crystal carry/bank/spend/lose.
   NOT yet included (by design, for a later pass): persistent save
   across sessions, and a shared leaderboard.

   TUNING: every number worth playing with lives in CONFIG below.
   ===================================================================== */

(function(){

  /* ==================== CONFIG ==================== */
  const CANVAS_W = 640;
  const CANVAS_H = 460;
  const GROUND_Y = 400;

  const COLORS = {
    skyTower: "#EDE6D6",
    skyWall: "#F5F0E6",
    skyFair: "#FBEFD8",
    wallStone: "#9C9284",
    wallStoneDark: "#7A7264",
    skyWater: "#CDE7F0",
    skyDock: "#CDE7F0",
    skyGrass: "#DCEFC4",
    skyForest: "#A9D48C",
    skyCaveEntrance: "#6B6355",
    skyInnerCave: "#0D0D0F",
    skyVillage: "#F5E6C8",
    skyCastleZone: "#EFD9A8",
    skyGrasslandsGen: "#DCEFC4",
    skyDesert: "#FCE3A1", duneColor: "#F2C777", cactusColor: "#3F7A3F", rockColor: "#8B6B4A", sunColor: "#FF9E4A",
    skySwamp: "#8FA382", swampGround: "#4A3B2C", swampWater: "#5C6B4B", cattailStem: "#3A4A2A", cattailHead: "#6B4A2A", fogColor: "rgba(220,220,220,0.2)",
    skyJungle: "#B4E0C5", jungleGround: "#2F5233", vineColor: "#3F7A3F", leafColor: "#3F8A4A", silhouetteColor: "#111111",
    skyUnderwater: "#4BA3C3", underwaterGround: "#C2A878", kelpColor: "#2F6B4A", bubbleColor: "rgba(255,255,255,0.6)", lightRayColor: "rgba(255,255,255,0.1)",
    treehousesSky: "#AEE2FF", trunkColor: "#6B4222", platformColor: "#8B5A2B", cloudColor: "rgba(255,255,255,0.85)",
    bossArenaSky: "#3A2C4A",
    houseDecrepit: "#8A8378",
    houseDecrepitDark: "#5C574C",
    houseWall: "#E8C99B",
    houseRoof: "#B8543A",
    houseDoor: "#6B4222",
    shrineDecrepit: "#8A8378",
    shrineDecrepitDark: "#5C574C",
    shrineStone: "#B8AFA0",
    shrineStoneDark: "#8C8272",
    townHallWall: "#D9C08A",
    townHallRoof: "#8B5A2B",
    castleDecrepit: "#7A7264",
    castleDecrepitDark: "#5C564A",
    castleRebuilt: "#D4AF37",
    castleRebuiltDark: "#A8842A",
    grassBlade: "#4E8F35",
    cyclopsBody: "#6B5842",
    cyclopsEye: "#E14B3C",
    sandwormBody: "#C9A45C", sandwormBodyDark: "#A9843C",
    feyBody: "#7B5FBF", feyGlow: "#C9A9F0",
    fairyBody: "#F6C945", fairyWing: "#FFF3C4",
    sirenBody: "#2E8B8B", sirenHair: "#1B4F72",
    mermaidBody: "#3AA6A6", mermaidTail: "#1B7A7A",
    ogreBody: "#4B5D3A", ogreBodyDark: "#33421F",
    snakeBody: "#5B8C3A", snakeBelly: "#C9D9A0",
    bossBody: "#8B2F3A", bossTrim: "#D4AF37",
    water: "#2C6E8E",
    waterDeep: "#1B4F72",
    waterLine: "#F2F7FA",
    boatHull: "#8B5A2B",
    boatHullDark: "#6B4222",
    boatMast: "#4A3420",
    boatSail: "#F5F0E6",
    wheel: "#6B4222",
    wheelSpoke: "#3D2A16",
    crowsNest: "#4A3420",
    ground: "#1F2430",
    tower: "#8B5A2B",
    towerDark: "#6B4222",
    ladder: "#C9922A",
    chest: "#B8860B",
    treeTrunk: "#6B4222",
    treeCanopy: "#2D6A4F",
    chestLid: "#8B5A2B",
    altarGlow: "#F6C945",
    player: "#1B7A4A",
    playerLeather: "#8B5A2B",
    playerSteel: "#9CA3AF",
    playerGoblin: "#5B7A3A",
    playerSiren: "#2E8B8B",
    playerCloak: "#5B4E77",
    playerSkin: "#E0AD7D",
    playerLegs: "#3D3226",
    playerSword: "#9CA3AF",
    swordHilt: "#6B4222",
    knight: "#5B6472",
    knightTrim: "#E5484D",
    archer: "#2851E3",
    archerBow: "#8B5A2B",
    wizardCloak: "#1B3A8F",
    wizardHat: "#132A66",
    wizardBeard: "#FFFFFF",
    arrow: "#6B4222",
    fireball: "#E14B3C",
    lightning: "#7FD4E8",
    freeze: "#8FE3F0",
    blackHole: "#2B1B4A",
    ally: "#F6A93B",
    hud: "#1F2430",
    hpGood: "#12B76A",
    hpBad: "#E14B3C",
    armor: "#9CA3AF",
    armorBg: "#4B5563",
    mana: "#8B5CF6",
    manaBg: "#3D2E5C",
    silver: "#8A94A6"
  };

  // World zones, left to right
  const TOWER_WIDTH = 260;
  const WALL_WIDTH = 900;
  const FAIR_WIDTH = 900;
  const WATER_WIDTH = 900;
  const TOWER_END = TOWER_WIDTH;
  const WALL_END = TOWER_END + WALL_WIDTH;
  const FAIR_END = WALL_END + FAIR_WIDTH;
  const WATER_END = FAIR_END + WATER_WIDTH;
  const WORLD_WIDTH = WATER_END;

  const TOWER_X = 130;              // center of the tower/ladder
  const LADDER_HALF_WIDTH = 22;
  const ALTAR_Y = GROUND_Y - 240;   // how high the altar sits
  const CHEST_X = TOWER_X - 60;
  const CHEST_W = 40, CHEST_H = 28;

  // The boat, out in the water zone — a second chest, a walk-up altar
  // (the steering wheel, no climbing needed), and a crow's nest you do
  // have to climb, which opens the map instead of the spell shop.
  const BOAT_X = FAIR_END + 260;
  const BOAT_W = 220;
  const BOAT_CHEST_X = BOAT_X + 16;
  const BOAT_ALTAR_X = BOAT_X + BOAT_W - 56;
  const CROWSNEST_X = BOAT_X + BOAT_W / 2;
  const CROWSNEST_HALF_WIDTH = 18;
  const MAP_Y = GROUND_Y - 220; // height of the crow's nest platform

  // Open water (the water zone, minus the boat's own footprint) has no solid
  // floor. Jumping is always available there — each jump is a "stroke" that
  // keeps Walter near the surface — but without jumping, gravity keeps
  // pulling him down until he drowns (treated as a normal respawn) once he
  // passes WATER_DROWN_DEPTH below the surface line.
  const WATER_DROWN_DEPTH = 90;
  const WATER_STROKE_COOLDOWN = 18; // frames between strokes — stops keyboard auto-repeat from stacking jump velocity
  const WATER_MAX_RISE = 70;        // how far above the surface a stroke can carry him — floats, doesn't fly

  // The cyclops laser sets Walter on fire rather than dealing direct impact
  // damage — the burn is the whole attack. Casting Freeze extinguishes it
  // early (see the freeze branch of castSpell).
  const PLAYER_BURN_DURATION_FRAMES = 600; // 10 seconds
  const PLAYER_BURN_DPS = 5;
  const PLAYER_BURN_DAMAGE_PER_FRAME = PLAYER_BURN_DPS / 60;

  const CHESTS_HOME = [
    { x: CHEST_X, w: CHEST_W, h: CHEST_H },
    { x: BOAT_CHEST_X, w: CHEST_W, h: CHEST_H }
  ];
  const WALKUP_ALTARS_HOME = [
    { x: BOAT_ALTAR_X, w: 36, h: 46, action: "altar" }
  ];
  // Climbable points: ladder position, how high it goes, and what opens
  // once you reach the top.
  const CLIMB_POINTS_HOME = [
    { x: TOWER_X,     halfWidth: LADDER_HALF_WIDTH,     zone: "tower", topY: ALTAR_Y, action: "altar" },
    { x: CROWSNEST_X, halfWidth: CROWSNEST_HALF_WIDTH,  zone: "water", topY: MAP_Y,   action: "map"   }
  ];

  // Trees in the fair grounds — solid to projectiles (both Walter's and
  // enemies'), not to movement, so standing behind one blocks incoming
  // shots without physically trapping the player against it.
  const TREE_W = 22, TREE_H = 95;
  const TREES_HOME = [150, 350, 550, 750].map(offset => ({ x: WALL_END + offset, w: TREE_W, h: TREE_H }));

  // Cosmetic castle wall backdrop, spanning the wall zone. Purely visual —
  // drawn behind everything, no collision.
  const CASTLE_WALL_HEIGHT = 150;
  const CRENEL_UNIT = 40; // width of one merlon + gap pair

  /* ==================== Land 1: Grass / Forest / Castle Wall ====================
     Reached by sailing from the home map's boat, once a crew is hired.
     Same combat systems (enemies, spells, altar) as home — just a new
     stretch of world to walk through, ending in a castle tower with a
     one-time silver chest and a rare spell for sale. More lands (and more
     biome variety per land) are meant to follow this same pattern later. */
  const LAND1_DOCK_WIDTH = 200;
  const LAND1_GRASS_WIDTH = 700;
  const LAND1_FOREST_WIDTH = 900;
  const LAND1_CASTLEWALL_WIDTH = 900;
  const LAND1_DOCK_END = LAND1_DOCK_WIDTH;
  const LAND1_GRASS_END = LAND1_DOCK_END + LAND1_GRASS_WIDTH;
  const LAND1_FOREST_END = LAND1_GRASS_END + LAND1_FOREST_WIDTH;
  const LAND1_CASTLEWALL_END = LAND1_FOREST_END + LAND1_CASTLEWALL_WIDTH;
  const LAND1_WORLD_WIDTH = LAND1_CASTLEWALL_END;

  const LAND1_DOCK_X = 90; // the boat, docked — this land's spawn point and the way back home
  const LAND1_DOCK_W = 200;
  const LAND1_TOWER_X = LAND1_CASTLEWALL_END - 150; // castle tower near the far right edge
  const LAND1_ALTAR_Y = GROUND_Y - 240; // same climb height as the home altar

  const LAND1_TREES = [120, 320, 520, 720].map(offset => ({ x: LAND1_GRASS_END + offset, w: TREE_W, h: TREE_H }));

  const CHESTS_LAND1 = []; // the tower-top chest is one-time loot, not a bank — handled separately
  const WALKUP_ALTARS_LAND1 = [
    { x: LAND1_DOCK_X + 40, w: 40, h: 40, action: "map" } // walking up to the dock opens the map (sail home)
  ];
  const CLIMB_POINTS_LAND1 = [
    { x: LAND1_TOWER_X, halfWidth: LADDER_HALF_WIDTH, zone: "castlewall", topY: LAND1_ALTAR_Y, action: "land1Tower" }
  ];

  /* ==================== Land 2: Grasslands / Cave Entrance / Inner Cave ====================
     Same dock/sail pattern as Land 1. Grasslands and the cave entrance use
     the normal enemy pool; the inner cave is a single fixed encounter (one
     cyclops per visit) rather than the usual wave spawner. */
  const LAND2_DOCK_WIDTH = 200;
  const LAND2_GRASS_WIDTH = 700;
  const LAND2_CAVE_WIDTH = 700;
  const LAND2_INNERCAVE_WIDTH = 500;
  const LAND2_DOCK_END = LAND2_DOCK_WIDTH;
  const LAND2_GRASS_END = LAND2_DOCK_END + LAND2_GRASS_WIDTH;
  const LAND2_CAVE_END = LAND2_GRASS_END + LAND2_CAVE_WIDTH;
  const LAND2_INNERCAVE_END = LAND2_CAVE_END + LAND2_INNERCAVE_WIDTH;
  const LAND2_WORLD_WIDTH = LAND2_INNERCAVE_END;
  const LAND2_DOCK_X = 90;

  const CHESTS_LAND2 = [];
  const WALKUP_ALTARS_LAND2 = [
    { x: LAND2_DOCK_X + 40, w: 40, h: 40, action: "map" }
  ];
  const CLIMB_POINTS_LAND2 = []; // no climbable structure on land 2 yet

  /* ==================== Home Base: Village / Village / Castle ====================
     A third sailable destination, entirely peaceful — no waves anywhere.
     Starts fully decrepit. Houses are individually leveled but managed
     from a single Town Hall interaction point in Village 1, rather than
     requiring a walk-up trigger per house. The Castle is a one-time flat
     remodel — the current endgame condition. */
  const HOMEBASE_DOCK_WIDTH = 200;
  const HOMEBASE_VILLAGE1_WIDTH = 700;
  const HOMEBASE_VILLAGE2_WIDTH = 700;
  const HOMEBASE_CASTLE_WIDTH = 500;
  const HOMEBASE_DOCK_END = HOMEBASE_DOCK_WIDTH;
  const HOMEBASE_VILLAGE1_END = HOMEBASE_DOCK_END + HOMEBASE_VILLAGE1_WIDTH;
  const HOMEBASE_VILLAGE2_END = HOMEBASE_VILLAGE1_END + HOMEBASE_VILLAGE2_WIDTH;
  const HOMEBASE_CASTLE_END = HOMEBASE_VILLAGE2_END + HOMEBASE_CASTLE_WIDTH;
  const HOMEBASE_WORLD_WIDTH = HOMEBASE_CASTLE_END;
  const HOMEBASE_DOCK_X = 90;

  // 3 houses per village (6 total) — no count was specified in the design
  // doc, this is a starting guess. Add more entries here to expand later.
  const HOMEBASE_HOUSES = [
    { id: "v1h1", x: HOMEBASE_DOCK_END + 120, village: 1 },
    { id: "v1h2", x: HOMEBASE_DOCK_END + 320, village: 1 },
    { id: "v1h3", x: HOMEBASE_DOCK_END + 520, village: 1 },
    { id: "v2h1", x: HOMEBASE_VILLAGE1_END + 120, village: 2 },
    { id: "v2h2", x: HOMEBASE_VILLAGE1_END + 320, village: 2 },
    { id: "v2h3", x: HOMEBASE_VILLAGE1_END + 520, village: 2 }
  ];
  const HOMEBASE_TOWNHALL_X = HOMEBASE_DOCK_END + 420; // middle of village 1, clear of the entrance and the houses
  const HOMEBASE_SHRINE_X = HOMEBASE_DOCK_END + 255; // village 1, in the gap between the first two houses
  const SHRINE_MANA_BONUS_PER_LEVEL = 0.20; // +20% mana regen per remodel level, stacking (not compounding)
  const HOMEBASE_CASTLE_X = HOMEBASE_VILLAGE2_END + 180;

  // House economy — house upgrade cost is 200 * 2.5^(level-1); rent is
  // 50 * 1.5^(level-1) silver/minute once occupied (level >= 1).
  const HOUSE_BASE_COST = 200;
  const HOUSE_COST_MULTIPLIER = 2.5;
  const HOUSE_BASE_RENT_PER_MIN = 50;
  const HOUSE_RENT_MULTIPLIER = 1.5;
  const CASTLE_REBUILD_COST = 10000;

  /* ==================== Land 3+: procedural biome generation ====================
     Land 1 and Land 2 stay hand-built and untouched. Starting at Land 3,
     lands are procedurally generated — and re-rolled fresh on every visit
     (a deliberate choice: infinite replayability over a fixed, memorized
     world). Each generation still uses a seeded RNG rather than raw
     Math.random() calls scattered around, purely so the generator itself
     stays a clean, testable pure function — the seed is just freshly
     randomized each time now instead of being fixed per player.
     Ported from a standalone, dependency-free generator module — see
     mulberry32/hashSeed below for the seeded RNG. */
  function mulberry32(seed){
    let a = seed >>> 0;
    return function(){
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(worldSeed, landNumber){
    const str = String(worldSeed) + ":" + String(landNumber);
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
    return h >>> 0;
  }
  function randInt(rng, n){ return Math.floor(rng() * n); }
  function seededShuffle(arr, rng){
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--){
      const j = randInt(rng, i + 1);
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  // baseWidth values weren't specified in the design doc — sized to match
  // the existing hand-built Land 1/2 zones (700-900px), scaling up
  // slightly with danger for pacing.
  const BIOME_DEFINITIONS = {
    river:       { id: "river",       displayName: "River",        enemyPool: [],                            isCombatBiome: false, dangerWeight: 0, baseWidth: 500, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: false },
    grasslands:  { id: "grasslands",  displayName: "Grasslands",   enemyPool: ["knight","archer","wizard"],  isCombatBiome: true,  dangerWeight: 1, baseWidth: 800, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: false }, // no boss defined yet, excluded from the pool below
    village:     { id: "village",     displayName: "Village",      enemyPool: ["knight","archer","wizard"],  isCombatBiome: true,  dangerWeight: 1, baseWidth: 800, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: true },
    forest:      { id: "forest",      displayName: "Forest",       enemyPool: ["fey","fairy"],                isCombatBiome: true,  dangerWeight: 2, baseWidth: 850, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: true },
    treehouses:  { id: "treehouses",  displayName: "Treehouses",   enemyPool: ["fey","fairy"],                isCombatBiome: true,  dangerWeight: 2, baseWidth: 850, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: true },
    castlewalls: { id: "castlewalls", displayName: "Castle Walls", enemyPool: ["knight","archer","wizard"],  isCombatBiome: true,  dangerWeight: 3, baseWidth: 900, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: true },
    swamp:       { id: "swamp",       displayName: "Swamp",        enemyPool: ["ogre"],                       isCombatBiome: true,  dangerWeight: 3, baseWidth: 900, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: true },
    jungle:      { id: "jungle",      displayName: "Jungle",       enemyPool: ["snake"],                      isCombatBiome: true,  dangerWeight: 4, baseWidth: 900, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: true },
    desert:      { id: "desert",      displayName: "Desert",       enemyPool: ["sandworm"],                   isCombatBiome: true,  dangerWeight: 4, baseWidth: 900, widthVariance: 0.15, requiredArmorTrait: null,        bossEligible: true },
    underwater:  { id: "underwater",  displayName: "Under Water",  enemyPool: ["siren","mermaid"],            isCombatBiome: true,  dangerWeight: 5, baseWidth: 900, widthVariance: 0.15, requiredArmorTrait: "waterproof", bossEligible: true } // hard-locked without the trait
  };
  // Grasslands excluded — no boss defined for it yet. River is a
  // transition, not a selectable slot.
  const GENERATOR_BIOME_POOL = Object.keys(BIOME_DEFINITIONS).filter(id => id !== "river" && id !== "grasslands");
  const GENERATED_BIOME_SKY_COLORS = {
    village: COLORS.skyVillage, forest: COLORS.skyForest, treehouses: COLORS.treehousesSky,
    castlewalls: COLORS.skyWall, swamp: COLORS.skySwamp, jungle: COLORS.skyJungle,
    desert: COLORS.skyDesert, underwater: COLORS.skyUnderwater
  };

  const BOSS_ROSTER = {
    village:     { name: "Commander",      amuletId: "banner_of_valor", hp: 1000, damage: 20, silverReward: 500, crystalReward: 5 },
    castlewalls: { name: "Royal Champion", amuletId: "champions_crest", hp: 1050, damage: 22, silverReward: 550, crystalReward: 5 },
    forest:      { name: "Fey Queen",      amuletId: "moon_blossom",    hp: 1100, damage: 18, silverReward: 550, crystalReward: 6 },
    jungle:      { name: "Serpent King",   amuletId: "emerald_fang",    hp: 1150, damage: 16, silverReward: 600, crystalReward: 6 },
    swamp:       { name: "Bog Titan",      amuletId: "bog_core",        hp: 1200, damage: 26, silverReward: 650, crystalReward: 6 },
    desert:      { name: "Sand Colossus",  amuletId: "buried_heart",    hp: 1250, damage: 24, silverReward: 600, crystalReward: 7 },
    treehouses:  { name: "Elder Dryad",    amuletId: "heartwood_seed",  hp: 1300, damage: 20, silverReward: 650, crystalReward: 7 },
    underwater:  { name: "Leviathan",      amuletId: "leviathan_scale", hp: 1400, damage: 22, silverReward: 700, crystalReward: 8 }
  };

  const RIVER_INSERT_CHANCE = 0.6; // not specified — starting guess

  function generateLand(worldSeed, landNumber, previousLandBiomeIds){
    previousLandBiomeIds = previousLandBiomeIds || [];
    const seed = hashSeed(worldSeed, landNumber);
    const rng = mulberry32(seed);

    let candidates = GENERATOR_BIOME_POOL.filter(id => !previousLandBiomeIds.includes(id));
    if (candidates.length < 3) candidates = GENERATOR_BIOME_POOL.slice();

    const chosen = seededShuffle(candidates, rng).slice(0, 3);
    const withDanger = chosen.map(id => ({ id, danger: BIOME_DEFINITIONS[id].dangerWeight }));
    withDanger.sort((a, b) => a.danger - b.danger);
    for (let i = 0; i < withDanger.length; i++){
      let j = i;
      while (j + 1 < withDanger.length && withDanger[j+1].danger === withDanger[i].danger) j++;
      if (j > i){
        const tiedIds = withDanger.slice(i, j+1).map(e => e.id);
        const reshuffled = seededShuffle(tiedIds, rng);
        for (let k = i; k <= j; k++) withDanger[k] = { id: reshuffled[k-i], danger: withDanger[k].danger };
      }
      i = j;
    }
    const orderedBiomeIds = withDanger.map(e => e.id);

    const widthMultiplier = 1.0 + landNumber * 0.04;
    const biomes = orderedBiomeIds.map(id => {
      const def = BIOME_DEFINITIONS[id];
      const varianceRoll = (rng() * 2 - 1) * def.widthVariance;
      const width = Math.round(def.baseWidth * widthMultiplier * (1 + varianceRoll));
      return { id, displayName: def.displayName, dangerWeight: def.dangerWeight, width, enemyPool: def.enemyPool, requiredArmorTrait: def.requiredArmorTrait };
    });

    let riverTransition = null;
    if (rng() < RIVER_INSERT_CHANCE){
      const afterIndex = randInt(rng, 2);
      const riverDef = BIOME_DEFINITIONS.river;
      const varianceRoll = (rng() * 2 - 1) * riverDef.widthVariance;
      riverTransition = { afterBiomeIndex: afterIndex, width: Math.round(riverDef.baseWidth * widthMultiplier * (1 + varianceRoll)) };
    }

    const finalBiomeId = biomes[biomes.length - 1].id;
    const boss = BOSS_ROSTER[finalBiomeId];

    return { landNumber, seed, biomes, riverTransition, boss: { biomeId: finalBiomeId, ...boss } };
  }

  const GENERATED_DOCK_WIDTH = 200;
  const GENERATED_BOSS_ARENA_WIDTH = 500;
  const GENERATED_DOCK_X = 90;

  // Turns a generateLand() result into a flat, walkable zone list with
  // absolute x-boundaries: dock -> biome -> [river] -> biome -> [river]
  // -> biome -> boss arena. This is the one generic layout builder every
  // generated land uses — no per-land hardcoding like Land 1/2 have.
  function buildGeneratedLandLayout(land){
    const zones = [];
    let cursor = 0;
    zones.push({ type: "dock", id: "dock", start: cursor, end: cursor + GENERATED_DOCK_WIDTH });
    cursor += GENERATED_DOCK_WIDTH;

    land.biomes.forEach((b, i) => {
      zones.push({
        type: "biome", id: b.id, displayName: b.displayName, enemyPool: b.enemyPool,
        requiredArmorTrait: b.requiredArmorTrait, start: cursor, end: cursor + b.width
      });
      cursor += b.width;
      if (land.riverTransition && land.riverTransition.afterBiomeIndex === i){
        zones.push({ type: "river", id: "river", start: cursor, end: cursor + land.riverTransition.width });
        cursor += land.riverTransition.width;
      }
    });

    zones.push({ type: "bossArena", id: "bossArena", boss: land.boss, start: cursor, end: cursor + GENERATED_BOSS_ARENA_WIDTH });
    cursor += GENERATED_BOSS_ARENA_WIDTH;

    return { land, zones, worldWidth: cursor, dockX: GENERATED_DOCK_X };
  }

  function currentGeneratedZone(x){
    if (!currentGeneratedLandLayout) return null;
    const zones = currentGeneratedLandLayout.zones;
    return zones.find(z => x >= z.start && x < z.end) || zones[zones.length - 1];
  }

  // Deterministically recovers what biomes an EARLIER generated land used,
  // without storing full layouts — everything regenerates from the seed.
  // Lands 1-2 are hand-built (outside this system), so recursion bottoms
  // out there.
  function loadGeneratedLand(landNumber){
    // Re-rolled every visit, on purpose — infinite replayability was the
    // whole point, so this no longer reuses a fixed per-player world seed.
    // The "no repeat from the land you just came from" rule now tracks
    // whatever you actually visited last (any land number), not a fixed
    // deterministic history.
    const freshSeed = Math.floor(Math.random() * 1000000000);
    const land = generateLand(freshSeed, landNumber, lastGeneratedLandBiomeIds);
    currentGeneratedLandLayout = buildGeneratedLandLayout(land);
    lastGeneratedLandBiomeIds = land.biomes.map(b => b.id);
  }

  function sailToGeneratedLand(landNumber){
    loadGeneratedLand(landNumber);
    currentMap = "generated";
    player.x = currentGeneratedLandLayout.dockX + 10;
    player.y = GROUND_Y - PLAYER_H;
    player.vy = 0;
    enemies = [];
    enemyProjectiles = [];
    dockMenuUnlockFrame = frame + DOCK_MENU_DELAY_FRAMES;
    if (DEBUG) console.log("[WvW] set sail for generated Land " + landNumber + " — biomes: " + currentGeneratedLandLayout.land.biomes.map(b => b.id).join(","));
  }

  const CHESTS_HOMEBASE = [];
  const WALKUP_ALTARS_HOMEBASE = [
    { x: HOMEBASE_DOCK_X + 40, w: 40, h: 40, action: "map" },
    { x: HOMEBASE_TOWNHALL_X, w: 40, h: 40, action: "townhall" },
    { x: HOMEBASE_CASTLE_X, w: 60, h: 70, action: "castle" }
  ];
  const CLIMB_POINTS_HOMEBASE = [];

  function currentWorldWidth(){
    if (currentMap === "land1") return LAND1_WORLD_WIDTH;
    if (currentMap === "land2") return LAND2_WORLD_WIDTH;
    if (currentMap === "homebase") return HOMEBASE_WORLD_WIDTH;
    if (currentMap === "generated") return currentGeneratedLandLayout ? currentGeneratedLandLayout.worldWidth : 0;
    return WORLD_WIDTH;
  }
  function getChests(){
    if (currentMap === "land1") return CHESTS_LAND1;
    if (currentMap === "land2") return CHESTS_LAND2;
    if (currentMap === "homebase") return CHESTS_HOMEBASE;
    if (currentMap === "generated") return [];
    return CHESTS_HOME;
  }
  function getWalkupAltars(){
    if (currentMap === "land1") return WALKUP_ALTARS_LAND1;
    if (currentMap === "land2") return WALKUP_ALTARS_LAND2;
    if (currentMap === "homebase") return WALKUP_ALTARS_HOMEBASE;
    if (currentMap === "generated") return currentGeneratedLandLayout
      ? [{ x: currentGeneratedLandLayout.dockX + 40, w: 40, h: 40, action: "map" }]
      : [];
    return WALKUP_ALTARS_HOME;
  }
  function getClimbPoints(){
    if (currentMap === "land1") return CLIMB_POINTS_LAND1;
    if (currentMap === "land2") return CLIMB_POINTS_LAND2;
    if (currentMap === "homebase") return CLIMB_POINTS_HOMEBASE;
    if (currentMap === "generated") return [];
    return CLIMB_POINTS_HOME;
  }
  function getTrees(){
    return currentMap === "land1" ? LAND1_TREES : TREES_HOME; // land2/homebase/generated have no trees yet
  }

  const PLAYER_W = 28, PLAYER_H = 42;
  const PLAYER_MAX_HP = 100;
  const MOVE_SPEED = 3.2;
  const GRAVITY = 0.7;
  const JUMP_VELOCITY = -11;
  const CLIMB_SPEED = 2.6;
  const RESPAWN_INVULN_FRAMES = 90;
  const HIT_INVULN_FRAMES = 30;

  const MELEE_RANGE = 34;
  const MELEE_DAMAGE = 30; // was 18 — now a one-shot against knights/archers/wizards
  const MELEE_COOLDOWN = 22;

  const ENEMY_STATS = {
    knight:  { hp: 30, speed: 1.4, damage: 8,  attackCooldown: 50, contactRange: 30, w: 26, h: 40, dropsSilver: true },
    archer:  { hp: 22, speed: 1.1, damage: 10, attackCooldown: 80, preferredRange: 220, projectileSpeed: 6,   w: 24, h: 38 },
    wizard:  { hp: 26, speed: 1.0, damage: 14, attackCooldown: 90, preferredRange: 260, projectileSpeed: 6.5, w: 26, h: 40, dropsCrystal: true },
    // 3x a knight's size, 6x a knight's HP (30 HP / 26x40 taken as the
    // "regular enemy" baseline). Damage is 0 — the laser doesn't deal a
    // direct hit, the burn it sets is the entire attack.
    // 3x a knight's size. HP is 6x a knight's baseline, then bumped 5x
    // further per feedback (30x total). Damage is 0 — the laser doesn't
    // deal a direct hit, the burn it sets is the entire attack.
    cyclops: { hp: 900, speed: 0.8, damage: 0, attackCooldown: 70, preferredRange: 320, w: 78, h: 120 },

    // Land 3+ roster (Deliverable 1). Reuses existing movement archetypes
    // where possible; novel mechanics (burrow, teleport, charm, poison)
    // are called out in updateEnemies()/fireEnemyProjectile().
    sandworm: { hp: 34, speed: 1.3, damage: 9,  attackCooldown: 55, contactRange: 30, burrowSpeed: 1.6, emergeDuration: 180, w: 30, h: 30, dropsSilver: true },
    fey:      { hp: 24, speed: 0.9, damage: 13, attackCooldown: 80, preferredRange: 240, projectileSpeed: 6, teleportRange: 200, teleportCooldown: 300, contactRangeForTeleport: 60, w: 24, h: 38 },
    fairy:    { hp: 16, speed: 1.6, damage: 7,  attackCooldown: 40, preferredRange: 200, projectileSpeed: 7, w: 16, h: 20 },
    siren:    { hp: 28, speed: 1.0, damage: 8,  attackCooldown: 90, preferredRange: 240, projectileSpeed: 6, w: 24, h: 38, charmDuration: 150, charmSlowMultiplier: 0.65 },
    mermaid:  { hp: 30, speed: 1.0, damage: 11, attackCooldown: 70, preferredRange: 240, projectileSpeed: 8.5, w: 24, h: 38, dropsSilver: true },
    ogre:     { hp: 60, speed: 0.6, damage: 18, attackCooldown: 100, contactRange: 34, w: 34, h: 46, dropsSilver: true },
    snake:    { hp: 20, speed: 1.3, damage: 6,  attackCooldown: 130, contactRange: 32, lungeRange: 140, poisonDuration: 300, poisonDps: 2, w: 22, h: 18 }
  };

  // Tougher wizard variants — same base stats as a regular wizard, just
  // harder-hitting, and each one starts appearing once totalKills crosses
  // its threshold. No thresholds were specified, so these are a starting
  // guess (escalating every so often) — easy to retune here.
  const WIZARD_TIERS = [
    { key: "wizard",       label: "Wizard",        cloakColor: null,      damageMultiplier: 1,    minKills: 0   },
    { key: "wizardYellow", label: "Yellow Wizard", cloakColor: "#F6C945", damageMultiplier: 1.25, minKills: 20  },
    { key: "wizardBlack",  label: "Black Wizard",  cloakColor: "#1F2430", damageMultiplier: 1.5,  minKills: 50  },
    { key: "wizardRed",    label: "Red Wizard",    cloakColor: "#E14B3C", damageMultiplier: 1.75, minKills: 100 }
  ];
  WIZARD_TIERS.forEach(tier => {
    if (tier.key === "wizard") return; // base wizard is already defined above
    ENEMY_STATS[tier.key] = {
      ...ENEMY_STATS.wizard,
      damage: Math.round(ENEMY_STATS.wizard.damage * tier.damageMultiplier),
      hp: Math.round(ENEMY_STATS.wizard.hp * tier.damageMultiplier)
    };
  });

  // Generic boss stats, merged into ENEMY_STATS so the existing pipeline
  // (damageEnemy, drawEnemy, AI dispatch) handles boss types uniformly.
  // Only Commander (Village) has its full unique mechanic built right
  // now — every other boss uses the shared generic AI (see updateEnemies,
  // isBoss branch) so every generated Land is still completable; their
  // signature mechanics get built out when a Land actually reaches them.
  Object.keys(BOSS_ROSTER).forEach(biomeId => {
    const b = BOSS_ROSTER[biomeId];
    ENEMY_STATS["boss_" + biomeId] = { hp: b.hp, damage: b.damage, speed: 0.7, attackCooldown: 90, contactRange: 55, w: 60, h: 92 };
  });

  const SPAWN_INTERVAL_MIN = 70;
  const SPAWN_INTERVAL_MAX = 140;
  const RATIO_SHIFT_KILLS = 60; // kills to fully shift from 90/5/5 toward 40/30/30

  const CRYSTAL_PER_WIZARD = 1;
  const SILVER_PER_KNIGHT = 1;

  const SPELLS = {
    fireball:    { label: "Fireball",     cost: 10, damage: 20, speed: 8, splashRadius: 80, burnDuration: 120, burnDamagePerFrame: 0.4, cooldown: 30 },
    lightning:   { label: "Lightning",    cost: 10, damage: 26, range: 260, chainMax: 3, cooldown: 45 },
    freeze:      { label: "Freeze",       cost: 10, radius: 120, duration: 180, cooldown: 240 },
    summonAlly:  { label: "Summon Ally",  cost: 10, allyDuration: 900, allyDamage: 12, allyHp: 40, cooldown: 300 },
    blackHole:   { label: "Black Hole",   cost: 10, radius: 100, duration: 180, damagePerFrame: 0.3, pullStrength: 3.5, cooldown: 360 }
  };
  const SPELL_ORDER = ["fireball", "lightning", "freeze", "summonAlly", "blackHole"];

  // Rare spells: bought one at a time at a specific land's castle tower (25
  // crystals, not silver), not at the regular altar. Casting one still costs
  // the same flat mana as any other spell — only the one-time unlock price
  // is different. Only mysticArmor is actually placed anywhere yet (land 1's
  // tower); the rest are here as ready-to-place configs for future lands.
  const RARE_SPELL_ORDER = ["mysticArmor", "demon", "angel", "teleport"];
  const RARE_SPELLS = {
    mysticArmor: { label: "Mystic Armor", cost: 25, duration: 900, cooldown: 600 },
    demon:       { label: "Demon",        cost: 25, cooldown: 400 },   // TODO: summon a red ally that shoots fireballs
    angel:       { label: "Angel",        cost: 25, cooldown: 400 },   // TODO: summon a white ally that shoots white lightning
    teleport:    { label: "Teleport",     cost: 25, cooldown: 900 }    // TODO: safe respawn, keeps everything carried
  };
  const MYSTIC_ARMOR_REGEN_PER_FRAME = 1.5; // fast enough to top off even steel armor (200) in ~2 seconds
  Object.assign(SPELLS, RARE_SPELLS);

  // Armor is a consumable HP buffer bought with silver (from knights), separate
  // from the crystal/spell economy. Damage drains armor before Walter's own HP.
  // Buying a new piece replaces whatever's left of the current one.
  const ARMOR = {
    leather: { label: "Leather Armor",      cost: 5,  multiplier: 1.5 },
    steel:   { label: "Steel Armor",        cost: 10, multiplier: 2 },
    // Trait armors. Costs weren't specified — picked to sit above steel
    // since the value here is the trait, not raw buffer size.
    goblin:  { label: "Goblin Armor",       cost: 12, multiplier: 1.5, trait: "pacifyGoblinOgre" },
    siren:   { label: "Siren Scale Armor",  cost: 12, multiplier: 1.5, trait: "waterBreathing" },
    // Tier-0 utility — no HP buffer at all (multiplier: 0). Its value is
    // the activated ability, not damage soak.
    cloak:   { label: "Invisibility Cloak", cost: 15, multiplier: 0,   trait: "cloak" }
  };
  const ARMOR_ORDER = ["leather", "steel", "goblin", "siren", "cloak"];
  const ARMOR_REPAIR_COST = 20; // flat, regardless of remaining durability
  // Letters for the save codex — S is already steel, so siren uses R.
  const ARMOR_LETTERS = { none: "N", leather: "L", steel: "S", goblin: "G", siren: "R", cloak: "C" };
  const ARMOR_LETTERS_REVERSE = { N: "none", L: "leather", S: "steel", G: "goblin", R: "siren", C: "cloak" };

  // Enemy types Goblin Armor pacifies. Goblins/ogres don't exist in the game
  // yet (Swamp biome, later phase) — this is wired and ready, just inert
  // against everything currently in the game.
  const GOBLIN_ARMOR_PACIFIES = new Set(["goblin", "ogre"]);

  const INVIS_CLOAK_DURATION_FRAMES = 20 * 60;
  const INVIS_CLOAK_COOLDOWN_FRAMES = 30 * 60;

  // Mana gates spell casting on top of each spell's own cooldown. Regen is
  // slow enough relative to cost that draining it acts as a natural extra
  // cooldown: 5 mana per cast, 1 mana/sec regen = ~5 seconds to recover a cast.
  const MANA_COST_PER_SPELL = 5;
  const RARE_SPELL_MANA_COST = 30;
  const MANA_REGEN_PER_SECOND = 1;
  const MANA_REGEN_PER_FRAME = MANA_REGEN_PER_SECOND / 60;
  const MAX_MANA_START = 50;
  const MANA_UPGRADE_COST_SILVER = 100;
  const MANA_UPGRADE_AMOUNT = 10;
  const HIRE_CREW_COST = 500; // silver, one-time — unlocks sailing to new lands from the map
  const DOCK_MENU_DELAY_FRAMES = 15 * 60; // the dock's map trigger stays inert for 15s after arriving anywhere via sailing

  // Letter code for each spell in the progress-save string (F/L/Z/S/B),
  // uppercase = unlocked, lowercase = locked. "fireball" and "freeze" both
  // start with F, so freeze uses Z and summonAlly uses S to keep every
  // letter unique.
  const SPELL_LETTERS = [
    { key: "fireball",   letter: "F" },
    { key: "lightning",  letter: "L" },
    { key: "freeze",     letter: "Z" },
    { key: "summonAlly", letter: "S" },
    { key: "blackHole",  letter: "B" }
  ];
  // Same idea, separate codex segment, for rare spells (bought at a land's
  // castle tower rather than the regular altar).
  const RARE_SPELL_LETTERS = [
    { key: "mysticArmor", letter: "M" },
    { key: "demon",       letter: "D" },
    { key: "angel",       letter: "A" },
    { key: "teleport",    letter: "T" }
  ];
  const ALL_SPELL_LETTERS = SPELL_LETTERS.concat(RARE_SPELL_LETTERS); // 9 total — one per amulet slot

  /* ==================== Amulets ====================
     Boss-dropped, unique, 9 spell slots, no duplicates. A slot just
     holds a spell key; the amulet's passive buff only applies while its
     specific buffSpell is actually sitting in one of the 9 slots.
     Only one amulet exists so far — the cyclops is the only boss. */
  const AMULET_ORDER = ["cyclopsEye", "banner_of_valor", "champions_crest", "moon_blossom", "emerald_fang", "bog_core", "buried_heart", "heartwood_seed", "leviathan_scale"];
  const AMULETS = {
    cyclopsEye:      { label: "The Cyclops's Eye", buffSpell: "fireball",  burnDurationMultiplier: 1.5 },
    // Reinterpreted from spec: "fires one additional projectile" / "Chain
    // Lightning jumps to one additional enemy" both map cleanly onto our
    // existing Lightning chain — +1 link while slotted.
    banner_of_valor: { label: "Banner of Valor",   buffSpell: "lightning", chainBonus: 1 },
    emerald_fang:    { label: "Emerald Fang",      buffSpell: "lightning", chainBonus: 1 },
    // These four reference spells we don't have (Shield, Blink, Earth
    // Spike, Vine Root) or a mechanic that isn't a player spell (poison
    // is an enemy attack, not something Walter casts). They still drop,
    // are ownable/equippable with working slots — the passive buff itself
    // is an intentional stub until a matching spell exists to hang it on.
    champions_crest: { label: "Champion's Crest",  buffSpell: null },
    moon_blossom:    { label: "Moon Blossom",      buffSpell: null },
    bog_core:        { label: "Bog Core",          buffSpell: null },
    buried_heart:    { label: "Buried Heart",      buffSpell: null },
    heartwood_seed:  { label: "Heartwood Seed",    buffSpell: null },
    leviathan_scale: { label: "Leviathan Scale",   buffSpell: null }
  };

  function isAmuletBuffActive(spellKey){
    if (!player.equippedAmulet) return false;
    const amulet = AMULETS[player.equippedAmulet];
    if (!amulet || amulet.buffSpell !== spellKey) return false;
    const slots = player.amuletSlots[player.equippedAmulet];
    return !!slots && slots.includes(spellKey);
  }

  const DEBUG = true; // logs key events to the console — flip to false once things look right
  /* ==================== end config ==================== */

  let canvas, ctx, overlay, overlayInner;
  let player, enemies, playerProjectiles, enemyProjectiles, allies, effects;
  let cameraX, frame, totalKills, keysDown;
  let spellCooldowns, spellUnlocked, activeSpell, meleeCooldown;
  let respawnMessageTimer, respawnMessageText;
  let altarOpen, mapOpen, rareAltarOpen, townHallOpen, castleUiOpen, started, running;
  let wasAtWalkupAltar, wasAtClimbTop, wasInInnerCave, wasInBossArena;
  let dockMenuUnlockFrame; // the dock's map trigger stays inert until this frame, so it doesn't pop up the instant you step off the boat
  let animId, nextSpawnFrame;
  let walterName, walterPassword, walterGuestMode, loadedProgress, loginComplete;
  let currentMap; // "home" | "land1" | "land2" | "homebase" | "generated"
  let currentGeneratedLandLayout = null; // { land, zones, worldWidth, dockX } — rebuilt whenever a generated land is entered
  let lastGeneratedLandBiomeIds = []; // whichever biomes were visited last, so a fresh re-roll doesn't immediately repeat them

  /* ---------------- helpers ---------------- */
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  function rectsOverlap(x1,y1,w1,h1,x2,y2,w2,h2){
    const pad = 3;
    return x1+pad < x2+w2-pad && x1+w1-pad > x2+pad && y1+pad < y2+h2-pad && y1+h1-pad > y2+pad;
  }

  function currentZone(x){
    if (currentMap === "land1"){
      if (x < LAND1_DOCK_END) return "dock";
      if (x < LAND1_GRASS_END) return "grass";
      if (x < LAND1_FOREST_END) return "forest";
      return "castlewall";
    }
    if (currentMap === "land2"){
      if (x < LAND2_DOCK_END) return "dock";
      if (x < LAND2_GRASS_END) return "l2grass";
      if (x < LAND2_CAVE_END) return "cave";
      return "innercave";
    }
    if (currentMap === "homebase"){
      if (x < HOMEBASE_DOCK_END) return "dock";
      if (x < HOMEBASE_VILLAGE1_END) return "village1";
      if (x < HOMEBASE_VILLAGE2_END) return "village2";
      return "castlezone";
    }
    if (currentMap === "generated"){
      const z = currentGeneratedZone(x);
      return z ? z.type : "dock"; // "dock" | "biome" | "river" | "bossArena"
    }
    if (x < TOWER_END) return "tower";
    if (x < WALL_END) return "wall";
    if (x < FAIR_END) return "fair";
    return "water";
  }

  function currentRatios(){
    const t = Math.min(1, totalKills / RATIO_SHIFT_KILLS);
    return {
      knight: 0.9 - 0.5 * t,
      archer: 0.05 + 0.25 * t,
      wizard: 0.05 + 0.25 * t
    };
  }

  function totalCrystals(){
    return player.carriedCrystals + player.bankedCrystals;
  }

  function buyArmor(key){
    const cfg = ARMOR[key];
    if (!cfg || player.silver < cfg.cost) return false;
    player.silver -= cfg.cost;
    player.armorType = key;
    player.armorMaxHp = Math.round(PLAYER_MAX_HP * cfg.multiplier);
    player.armorHp = player.armorMaxHp; // replaces whatever armor was left, if any
    player.armorBroken = false;
    if (DEBUG) console.log("[WvW] bought " + key + " armor, armorHp=" + player.armorHp);
    return true;
  }

  function repairArmor(){
    if (!player.armorType || player.armorHp >= player.armorMaxHp) return false;
    if (player.silver < ARMOR_REPAIR_COST) return false;
    player.silver -= ARMOR_REPAIR_COST;
    player.armorHp = player.armorMaxHp;
    player.armorBroken = false;
    if (DEBUG) console.log("[WvW] repaired " + player.armorType + " armor for " + ARMOR_REPAIR_COST + " silver");
    return true;
  }

  function houseUpgradeCost(currentLevel){
    // Level 0->1 costs the base; each level after that is 2.5x the
    // previous level's cost.
    return Math.round(HOUSE_BASE_COST * Math.pow(HOUSE_COST_MULTIPLIER, currentLevel));
  }

  function houseRentPerMinute(level){
    if (level <= 0) return 0;
    return HOUSE_BASE_RENT_PER_MIN * Math.pow(HOUSE_RENT_MULTIPLIER, level - 1);
  }

  function totalPassiveIncomePerMinute(){
    return HOMEBASE_HOUSES.reduce((sum, h) => sum + houseRentPerMinute(player.houseLevels[h.id] || 0), 0);
  }

  function upgradeHouse(houseId){
    const level = player.houseLevels[houseId] || 0;
    const cost = houseUpgradeCost(level);
    if (player.silver < cost) return false;
    player.silver -= cost;
    player.houseLevels[houseId] = level + 1;
    if (DEBUG) console.log("[WvW] " + houseId + " upgraded to level " + (level + 1));
    return true;
  }

  function upgradeShrine(){
    const cost = houseUpgradeCost(player.shrineLevel); // same cost curve as houses — no separate price was specified
    if (player.silver < cost) return false;
    player.silver -= cost;
    player.shrineLevel++;
    if (DEBUG) console.log("[WvW] shrine remodeled to level " + player.shrineLevel + " — mana regen now +" + (player.shrineLevel * SHRINE_MANA_BONUS_PER_LEVEL * 100) + "%");
    return true;
  }

  function manaRegenMultiplier(){
    return 1 + player.shrineLevel * SHRINE_MANA_BONUS_PER_LEVEL;
  }

  function rebuildCastle(){
    if (player.castleRebuilt || player.silver < CASTLE_REBUILD_COST) return false;
    player.silver -= CASTLE_REBUILD_COST;
    player.castleRebuilt = true;
    respawnMessageText = "The Castle stands rebuilt. Victory!";
    respawnMessageTimer = 240;
    if (DEBUG) console.log("[WvW] castle rebuilt — victory condition met");
    return true;
  }

  function assignAmuletSlot(amuletKey, slotIndex, spellKey){
    if (!player.amuletsOwned.has(amuletKey)) return false;
    if (slotIndex < 0 || slotIndex >= 9) return false;
    if (spellKey && !spellUnlocked.has(spellKey)) return false; // can't slot a spell you don't have

    const slots = player.amuletSlots[amuletKey];
    if (!slots) return false;

    // No duplicates: if this spell is already in another slot, clear it
    // there first — each spell can only occupy one slot at a time.
    if (spellKey){
      for (let i = 0; i < slots.length; i++){
        if (slots[i] === spellKey) slots[i] = null;
      }
    }
    slots[slotIndex] = spellKey || null;
    return true;
  }

  function buyManaUpgrade(){
    if (player.silver < MANA_UPGRADE_COST_SILVER) return false;
    player.silver -= MANA_UPGRADE_COST_SILVER;
    player.maxMana += MANA_UPGRADE_AMOUNT;
    if (DEBUG) console.log("[WvW] max mana increased to " + player.maxMana);
    return true;
  }

  function buyHireCrew(){
    if (player.crewHired || player.silver < HIRE_CREW_COST) return false;
    player.silver -= HIRE_CREW_COST;
    player.crewHired = true;
    if (DEBUG) console.log("[WvW] crew hired — sailing unlocked, boat is now the spawn point");
    return true;
  }

  function spawnPoint(){
    return player.crewHired
      ? { x: BOAT_ALTAR_X - 30, y: GROUND_Y - PLAYER_H }
      : { x: TOWER_X, y: GROUND_Y - PLAYER_H };
  }

  function sailToLand1(){
    currentMap = "land1";
    player.x = LAND1_DOCK_X + 10;
    player.y = GROUND_Y - PLAYER_H;
    player.vy = 0;
    enemies = [];
    enemyProjectiles = [];
    dockMenuUnlockFrame = frame + DOCK_MENU_DELAY_FRAMES;
    if (DEBUG) console.log("[WvW] set sail for the first land");
  }

  function sailToLand2(){
    currentMap = "land2";
    player.x = LAND2_DOCK_X + 10;
    player.y = GROUND_Y - PLAYER_H;
    player.vy = 0;
    enemies = [];
    enemyProjectiles = [];
    dockMenuUnlockFrame = frame + DOCK_MENU_DELAY_FRAMES;
    if (DEBUG) console.log("[WvW] set sail for the second land");
  }

  function sailToHomebase(){
    currentMap = "homebase";
    player.x = HOMEBASE_DOCK_X + 10;
    player.y = GROUND_Y - PLAYER_H;
    player.vy = 0;
    enemies = [];
    enemyProjectiles = [];
    dockMenuUnlockFrame = frame + DOCK_MENU_DELAY_FRAMES;
    if (DEBUG) console.log("[WvW] set sail for home base");
  }

  function sailHome(){
    currentMap = "home";
    const spawn = spawnPoint();
    player.x = spawn.x;
    player.y = spawn.y;
    player.vy = 0;
    enemies = [];
    enemyProjectiles = [];
    dockMenuUnlockFrame = frame + DOCK_MENU_DELAY_FRAMES;
    if (DEBUG) console.log("[WvW] sailed home");
  }

  /* ---------------- progress save/load codex ----------------
     Format: $<silver>$&<5 spell letters>&@<banked crystals>@!<armor L/S/N>!
     Spell letters use SPELL_LETTERS above, uppercase = unlocked.
     Only banked crystals persist — carried (at-risk) crystals are always
     0 at the start of a session, same as any other respawn. Kill count
     and HP aren't part of this format, so both reset each session too. */
  function encodeProgress(){
    const spellStr = SPELL_LETTERS.map(({ key, letter }) =>
      spellUnlocked.has(key) ? letter.toUpperCase() : letter.toLowerCase()
    ).join("");
    const rareStr = RARE_SPELL_LETTERS.map(({ key, letter }) =>
      spellUnlocked.has(key) ? letter.toUpperCase() : letter.toLowerCase()
    ).join("");
    const armorChar = ARMOR_LETTERS[player.armorType] || "N";
    const flags = (player.crewHired ? "1" : "0") + (player.land1ChestCollected ? "1" : "0");
    const amuletStr = encodeAmulets();
    const homebaseStr = encodeHomebase();
    const worldStr = "0," + player.highestUnlockedLand; // first slot is vestigial now that lands re-roll per visit instead of using a fixed seed
    // Silver accrues fractionally now (passive income), but the codex only
    // stores whole numbers — floor it here. The in-memory fractional part
    // just keeps accumulating during the session; only the saved snapshot
    // is truncated.
    return "$" + Math.floor(player.silver) + "$&" + spellStr + "&@" + player.bankedCrystals + "@!" + armorChar + "!#" + player.maxMana + "#~" + rareStr + "~^" + flags + "^*" + amuletStr + "*+" + homebaseStr + "+%" + worldStr + "%";
  }

  function encodeHomebase(){
    const levels = HOMEBASE_HOUSES.map(h => player.houseLevels[h.id] || 0);
    return levels.join(",") + "," + (player.castleRebuilt ? "1" : "0") + "," + player.shrineLevel;
  }

  function decodeHomebase(str){
    const result = { houseLevels: HOMEBASE_HOUSES.map(() => 0), castleRebuilt: false, shrineLevel: 0 };
    if (!str) return result;
    const parts = str.split(",").map(s => parseInt(s, 10));
    HOMEBASE_HOUSES.forEach((h, i) => {
      result.houseLevels[i] = Number.isFinite(parts[i]) ? Math.max(0, parts[i]) : 0;
    });
    result.castleRebuilt = parts[HOMEBASE_HOUSES.length] === 1;
    result.shrineLevel = Number.isFinite(parts[HOMEBASE_HOUSES.length + 1]) ? Math.max(0, parts[HOMEBASE_HOUSES.length + 1]) : 0;
    return result;
  }

  // Single-amulet format for now: <owned 0/1><equipped 0/1><9 slot letters,
  // x = empty, reusing the same spell letters as everywhere else in the
  // codex>. Will need redesigning once a second amulet actually exists —
  // this doesn't try to generalize past that yet.
  // Format: <9 ownedBits><equippedIndex>:<9-char slot block per OWNED
  // amulet, in AMULET_ORDER sequence, x = empty slot>. Replaces the old
  // single-amulet-only format (flagged in an earlier pass as needing a
  // redesign once a second amulet existed — this is that redesign).
  function encodeAmulets(){
    const ownedBits = AMULET_ORDER.map(k => player.amuletsOwned.has(k) ? "1" : "0").join("");
    const equippedIndex = player.equippedAmulet ? AMULET_ORDER.indexOf(player.equippedAmulet) : -1;
    const slotBlocks = AMULET_ORDER.filter(k => player.amuletsOwned.has(k)).map(k => {
      const slots = player.amuletSlots[k] || new Array(9).fill(null);
      return slots.map(s => {
        if (!s) return "x";
        const entry = ALL_SPELL_LETTERS.find(e => e.key === s);
        return entry ? entry.letter : "x";
      }).join("");
    }).join("");
    return ownedBits + equippedIndex + ":" + slotBlocks;
  }

  function decodeAmulets(str){
    const result = { ownedKeys: [], equippedKey: null, slotsByKey: {} };
    if (!str) return result;
    const colonIdx = str.indexOf(":");
    if (colonIdx < 0){
      // Old single-amulet format (owned/equipped/9 slots, no colon) —
      // predates this redesign. Map it onto cyclopsEye specifically,
      // since that was the only amulet that could exist back then.
      if (str.length >= 11 && str[0] === "1"){
        result.ownedKeys.push("cyclopsEye");
        const slots = new Array(9).fill(null);
        for (let j = 0; j < 9; j++){
          const c = str[2 + j];
          if (c && c !== "x"){
            const entry = ALL_SPELL_LETTERS.find(e => e.letter.toUpperCase() === c.toUpperCase());
            if (entry) slots[j] = entry.key;
          }
        }
        result.slotsByKey.cyclopsEye = slots;
        if (str[1] === "1") result.equippedKey = "cyclopsEye";
      }
      return result;
    }
    const header = str.slice(0, colonIdx);
    const slotBlocks = str.slice(colonIdx + 1);
    const ownedBits = header.slice(0, AMULET_ORDER.length);
    const equippedIndex = parseInt(header.slice(AMULET_ORDER.length), 10);

    let cursor = 0;
    AMULET_ORDER.forEach((key, i) => {
      if (ownedBits[i] === "1"){
        result.ownedKeys.push(key);
        const block = slotBlocks.slice(cursor, cursor + 9);
        cursor += 9;
        const slots = new Array(9).fill(null);
        for (let j = 0; j < 9; j++){
          const c = block[j];
          if (c && c !== "x"){
            const entry = ALL_SPELL_LETTERS.find(e => e.letter.toUpperCase() === c.toUpperCase());
            if (entry) slots[j] = entry.key;
          }
        }
        result.slotsByKey[key] = slots;
      }
    });
    if (Number.isInteger(equippedIndex) && equippedIndex >= 0 && AMULET_ORDER[equippedIndex]) result.equippedKey = AMULET_ORDER[equippedIndex];
    return result;
  }

  function decodeProgress(str){
    const result = {
      silver: 0, crystals: 0, armor: "none", spells: new Set(), maxMana: MAX_MANA_START,
      crewHired: false, land1ChestCollected: false,
      amuletOwnedKeys: [], amuletEquippedKey: null, amuletSlotsByKey: {},
      houseLevels: HOMEBASE_HOUSES.map(() => 0), castleRebuilt: false, shrineLevel: 0,
      worldSeed: null, highestUnlockedLand: 2
    };
    if (!str) return result;
    // The #maxMana#, ~rare~, ^flags^, *amulet*, +homebase+, and %world%
    // segments are all optional so saves from before each feature existed
    // still load fine.
    const m = String(str).match(/\$(\d+)\$&([A-Za-z]*)&@(\d+)@!([LSNGRC])!(?:#(\d+)#)?(?:~([A-Za-z]*)~)?(?:\^(\d*)\^)?(?:\*([0-9x:\-A-Za-z]*)\*)?(?:\+([\d,]*)\+)?(?:%([\d,]*)%)?/);
    if (!m) return result;
    result.silver = parseInt(m[1], 10) || 0;
    result.crystals = parseInt(m[3], 10) || 0;
    result.armor = ARMOR_LETTERS_REVERSE[m[4]] || "none";
    result.maxMana = m[5] ? (parseInt(m[5], 10) || MAX_MANA_START) : MAX_MANA_START;

    const spellChars = m[2] || "";
    SPELL_LETTERS.forEach(({ key, letter }, i) => {
      if (spellChars[i] && spellChars[i] === letter.toUpperCase()) result.spells.add(key);
    });

    const rareChars = m[6] || "";
    RARE_SPELL_LETTERS.forEach(({ key, letter }, i) => {
      if (rareChars[i] && rareChars[i] === letter.toUpperCase()) result.spells.add(key);
    });

    const flags = m[7] || "";
    result.crewHired = flags[0] === "1";
    result.land1ChestCollected = flags[1] === "1";

    const amuletData = decodeAmulets(m[8] || "");
    result.amuletOwnedKeys = amuletData.ownedKeys;
    result.amuletEquippedKey = amuletData.equippedKey;
    result.amuletSlotsByKey = amuletData.slotsByKey;

    const homebaseData = decodeHomebase(m[9] || "");
    result.houseLevels = homebaseData.houseLevels;
    result.castleRebuilt = homebaseData.castleRebuilt;
    result.shrineLevel = homebaseData.shrineLevel;

    const worldParts = (m[10] || "").split(",");
    if (worldParts[0]) result.worldSeed = parseInt(worldParts[0], 10) || null;
    if (worldParts[1]) result.highestUnlockedLand = Math.max(2, parseInt(worldParts[1], 10) || 2);

    return result;
  }

  function applyLoadedProgress(){
    if (!loadedProgress) return;
    player.silver = loadedProgress.silver;
    player.bankedCrystals = loadedProgress.crystals;
    player.maxMana = loadedProgress.maxMana;
    player.mana = loadedProgress.maxMana; // start each session with mana full, same as HP
    player.crewHired = loadedProgress.crewHired;
    player.land1ChestCollected = loadedProgress.land1ChestCollected;
    loadedProgress.spells.forEach(key => spellUnlocked.add(key));
    if (loadedProgress.armor !== "none"){
      player.armorType = loadedProgress.armor;
      player.armorMaxHp = Math.round(PLAYER_MAX_HP * ARMOR[loadedProgress.armor].multiplier);
      player.armorHp = player.armorMaxHp;
    }
    loadedProgress.amuletOwnedKeys.forEach(key => {
      player.amuletsOwned.add(key);
      player.amuletSlots[key] = loadedProgress.amuletSlotsByKey[key] || new Array(9).fill(null);
    });
    if (loadedProgress.amuletEquippedKey) player.equippedAmulet = loadedProgress.amuletEquippedKey;
    HOMEBASE_HOUSES.forEach((h, i) => { player.houseLevels[h.id] = loadedProgress.houseLevels[i] || 0; });
    player.castleRebuilt = loadedProgress.castleRebuilt;
    player.shrineLevel = loadedProgress.shrineLevel || 0;
    // worldSeed is no longer applied here — lands re-roll per visit now, not per player.
    player.highestUnlockedLand = loadedProgress.highestUnlockedLand;
    if (player.crewHired){
      const spawn = spawnPoint();
      player.x = spawn.x;
      player.y = spawn.y;
    }
  }

  async function saveProgress(){
    if (walterGuestMode || !walterName) return; // guest / not logged in — nothing to save to
    try{
      const res = await apiPost({ action: "walterSaveProgress", name: walterName, password: walterPassword, progress: encodeProgress() });
      if (DEBUG) console.log("[WvW] progress saved: " + encodeProgress(), res);
    }catch(err){
      console.error("[WvW] save failed", err);
    }
  }

  function spendCrystals(cost){
    let remaining = cost;
    const fromCarried = Math.min(player.carriedCrystals, remaining);
    player.carriedCrystals -= fromCarried;
    remaining -= fromCarried;
    player.bankedCrystals -= remaining;
  }

  /* ---------------- state ---------------- */
  function resetState(){
    currentMap = "home";
    player = {
      x: TOWER_X, y: GROUND_Y - PLAYER_H, vy: 0, onGround: true, onLadder: false,
      facing: 1, hp: PLAYER_MAX_HP,
      carriedCrystals: 0, bankedCrystals: 0, silver: 0,
      armorType: null, armorHp: 0, armorMaxHp: 0, armorBroken: false,
      cloakActiveFramesLeft: 0, cloakCooldownFramesLeft: 0,
      mana: MAX_MANA_START, maxMana: MAX_MANA_START,
      waterStrokeCooldown: 0,
      crewHired: false, land1ChestCollected: false,
      equippedAmulet: null,
      burningFrames: 0,
      charmFramesLeft: 0, charmSlowMultiplier: 1,
      poisonFramesLeft: 0, poisonDps: 0,
      mysticArmorFramesLeft: 0,
      invulnFrames: RESPAWN_INVULN_FRAMES
    };
    enemies = [];
    playerProjectiles = [];
    enemyProjectiles = [];
    allies = [];
    effects = [];
    cameraX = 0;
    frame = 0;
    totalKills = 0;
    keysDown = new Set();
    spellCooldowns = { fireball: 0, lightning: 0, freeze: 0, summonAlly: 0, blackHole: 0,
      mysticArmor: 0, demon: 0, angel: 0, teleport: 0 };
    spellUnlocked = new Set();
    player.amuletsOwned = new Set();
    player.amuletSlots = {}; // { amuletKey: [9 slots, spell key or null] }, populated as amulets are earned
    player.houseLevels = {}; // { houseId: level }, 0 or absent = decrepit/unremodeled
    HOMEBASE_HOUSES.forEach(h => { player.houseLevels[h.id] = 0; });
    player.castleRebuilt = false;
    player.shrineLevel = 0; // decrepit until remodeled, then each level adds +20% mana regen
    // worldSeed is no longer generated/persisted per player — lands re-roll per visit now.
    player.highestUnlockedLand = 2; // lands 1-2 are hand-built and always available; 3+ unlock progressively
    activeSpell = null; // null = sword
    meleeCooldown = 0;
    respawnMessageTimer = 0;
    respawnMessageText = "";
    altarOpen = false;
    mapOpen = false;
    rareAltarOpen = false;
    townHallOpen = false;
    castleUiOpen = false;
    wasAtWalkupAltar = false;
    wasAtClimbTop = false;
    wasInInnerCave = false;
    wasInBossArena = false;
    dockMenuUnlockFrame = 0;
    lastGeneratedLandBiomeIds = [];
    nextSpawnFrame = 90;
    running = true;
  }

  /* ---------------- input ---------------- */
  function onKeyDown(e){
    if (document.activeElement !== canvas) return;
    if (!started){ if (loginComplete) startGame(); return; }
    if (altarOpen) return; // altar has its own buttons, don't also move/attack behind it

    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault();
    keysDown.add(e.code);

    if (e.code === "Space"){
      if (activeSpell) castSpell(activeSpell);
      else meleeAttack();
    }

    if (e.code === "KeyC") activateCloak();

    if (e.code === "ArrowUp"){
      const onLadderNow = Math.abs(player.x + PLAYER_W/2 - TOWER_X) < LADDER_HALF_WIDTH && currentZone(player.x) === "tower";
      if (!onLadderNow) jumpIfGrounded();
    }

    const numMatch = e.code.match(/^Digit([1-9])$/);
    if (numMatch){
      const idx = Number(numMatch[1]) - 1;
      const key = SPELL_ORDER.concat(RARE_SPELL_ORDER)[idx]; // 1-5 standard, 6-9 rare
      if (key && spellUnlocked.has(key)){
        activeSpell = (activeSpell === key) ? null : key;
      }
    }
  }
  function onKeyUp(e){
    keysDown.delete(e.code);
  }

  function handleTap(clientX){
    if (!started){ if (loginComplete) startGame(); return; }
    const rect = canvas.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    if (relX < 0.33) keysDown.add("ArrowLeft");
    else if (relX > 0.66) keysDown.add("ArrowRight");
    else if (activeSpell) castSpell(activeSpell); else meleeAttack();
  }

  /* ---------------- update ---------------- */
  function update(){
    frame++;
    updatePlayerMovement();
    updateCamera();
    updateCooldowns();
    updateMana();
    updatePassiveIncome();
    updateWaveSpawning();
    updateCyclopsEncounter();
    updateGeneratedBossEncounter();
    updateEnemies();
    updateProjectiles();
    updateAllies();
    updateEffects();
    checkChestAndAltar();
    if (respawnMessageTimer > 0) respawnMessageTimer--;
  }

  // The inner cave doesn't use the normal wave spawner — it's a single
  // fixed encounter, one cyclops per visit (a "visit" = each fresh entry
  // into the zone, edge-triggered so lingering there doesn't spawn more).
  function updateCyclopsEncounter(){
    const inInnerCave = currentMap === "land2" && currentZone(player.x) === "innercave";
    if (inInnerCave && !wasInInnerCave){
      const alreadyPresent = enemies.some(en => en.type === "cyclops" && en.hp > 0);
      if (!alreadyPresent) spawnCyclops();
    }
    wasInInnerCave = inInnerCave;
  }

  // Player Power drives enemy scaling. No exact formula was specified, so:
  // spell count (unlocked, standard + rare) + filled amulet slots (0-9,
  // the only real "amulet progression" that exists yet) + armor tier
  // weight (reusing each armor's existing HP multiplier rather than
  // inventing new numbers). +5% enemy HP/damage per power point — also
  // not specified, easy to retune via POWER_SCALING_FACTOR.
  const POWER_SCALING_FACTOR = 0.05;

  function playerPower(){
    const spellCount = spellUnlocked.size;
    const amuletSlotsFilled = player.equippedAmulet
      ? (player.amuletSlots[player.equippedAmulet] || []).filter(Boolean).length
      : 0;
    const armorPower = (player.armorType && ARMOR[player.armorType]) ? (ARMOR[player.armorType].multiplier || 0) : 0;
    return spellCount + amuletSlotsFilled + armorPower;
  }

  function difficultyMultiplier(){
    return 1 + playerPower() * POWER_SCALING_FACTOR;
  }

  function spawnCyclops(){
    const stats = ENEMY_STATS.cyclops;
    const mult = difficultyMultiplier();
    const x = LAND2_INNERCAVE_END - 180;
    enemies.push({
      type: "cyclops", x, y: GROUND_Y - stats.h, w: stats.w, h: stats.h,
      hp: Math.round(stats.hp * mult), maxHp: Math.round(stats.hp * mult),
      scaledDamage: Math.round(stats.damage * mult),
      attackCooldown: 0, frozenFrames: 0, burningFrames: 0, counted: false
    });
    if (DEBUG) console.log("[WvW] cyclops spawned in the inner cave (power " + playerPower() + ", x" + mult.toFixed(2) + ")");
  }

  // One boss per generated Land, spawned on entering its arena — same
  // "edge-triggered, one per visit" pattern as the cyclops.
  function updateGeneratedBossEncounter(){
    if (currentMap !== "generated" || !currentGeneratedLandLayout) return;
    const zone = currentGeneratedZone(player.x);
    const inArena = !!zone && zone.type === "bossArena";
    if (inArena && !wasInBossArena && !currentGeneratedLandLayout.bossDefeated){
      const alreadyPresent = enemies.some(en => en.isBoss && en.hp > 0);
      if (!alreadyPresent) spawnGeneratedBoss(zone);
    }
    wasInBossArena = inArena;
  }

  function spawnGeneratedBoss(zone){
    const bossInfo = currentGeneratedLandLayout.land.boss;
    const type = "boss_" + bossInfo.biomeId;
    const stats = ENEMY_STATS[type];
    const mult = difficultyMultiplier();
    enemies.push({
      type, x: zone.end - 160, y: GROUND_Y - stats.h, w: stats.w, h: stats.h,
      hp: Math.round(stats.hp * mult), maxHp: Math.round(stats.hp * mult),
      scaledDamage: Math.round(stats.damage * mult),
      attackCooldown: 0, frozenFrames: 0, burningFrames: 0, counted: false,
      isBoss: true, bossBiomeId: bossInfo.biomeId, rallyTriggered: [false, false, false]
    });
    if (DEBUG) console.log("[WvW] boss spawned: " + bossInfo.name + " (" + bossInfo.biomeId + ")");
  }

  // Commander's (Village) signature mechanic — the one boss with its full
  // unique behavior built out this round. Every other boss uses the
  // shared generic AI in updateEnemies().
  function updateCommanderRally(boss){
    const thresholds = [0.75, 0.5, 0.25];
    const hpFrac = boss.hp / boss.maxHp;
    thresholds.forEach((t, i) => {
      if (!boss.rallyTriggered[i] && hpFrac <= t){
        boss.rallyTriggered[i] = true;
        summonRallyGuards(boss);
      }
    });
  }

  function summonRallyGuards(boss){
    const mult = difficultyMultiplier();
    const bounds = combatZoneBounds();
    [["knight", boss.x - 60], ["knight", boss.x - 30], ["archer", boss.x + boss.w + 30]].forEach(([type, x]) => {
      const s = ENEMY_STATS[type];
      enemies.push({
        type, x: clamp(x, bounds.start, bounds.end - s.w), y: GROUND_Y - s.h, w: s.w, h: s.h,
        hp: Math.round(s.hp * mult), maxHp: Math.round(s.hp * mult), scaledDamage: Math.round(s.damage * mult),
        attackCooldown: 0, frozenFrames: 0, burningFrames: 0, counted: false
      });
    });
    if (DEBUG) console.log("[WvW] Commander rallies the guard");
  }

  function updateMana(){
    if (player.mana < player.maxMana){
      player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN_PER_FRAME * manaRegenMultiplier());
    }
  }

  function updatePassiveIncome(){
    const perMinute = totalPassiveIncomePerMinute();
    if (perMinute <= 0) return;
    player.silver += perMinute / 60 / 60; // per-minute rate -> per-frame at 60fps, ticks regardless of current map
  }

  function activeClimbPoint(){
    return getClimbPoints().find(c =>
      Math.abs(player.x + PLAYER_W/2 - c.x) < c.halfWidth &&
      player.y + PLAYER_H > c.topY - 20 &&
      currentZone(player.x) === c.zone
    );
  }

  function isOverOpenWater(x){
    if (currentZone(x) !== "water") return false;
    const center = x + PLAYER_W / 2;
    return !(center >= BOAT_X && center <= BOAT_X + BOAT_W); // false while standing on the boat itself
  }

  function hasWaterBreathing(){
    // A passive trait of the material itself, independent of the armor's
    // HP buffer — works even if the buffer is currently broken.
    return player.armorType === "siren";
  }

  // Maps a generated biome's requiredArmorTrait to existing armor. Siren
  // Scale Armor already grants water breathing (Phase 1) — Waterproof
  // reuses that rather than inventing a new armor.
  function hasArmorTrait(trait){
    if (trait === "waterproof") return player.armorType === "siren";
    return false;
  }

  function updatePlayerMovement(){
    const climb = activeClimbPoint();

    if (climb && (keysDown.has("ArrowUp") || keysDown.has("ArrowDown"))){
      player.onLadder = true;
      player.vy = 0;
      if (keysDown.has("ArrowUp")) player.y -= CLIMB_SPEED;
      if (keysDown.has("ArrowDown")) player.y += CLIMB_SPEED;
      player.y = clamp(player.y, climb.topY - PLAYER_H + 10, GROUND_Y - PLAYER_H);
      player.onGround = player.y >= GROUND_Y - PLAYER_H - 0.5;
    }else{
      player.onLadder = false;
      player.vy += GRAVITY;
      player.y += player.vy;

      const floorY = GROUND_Y - PLAYER_H;
      if (isOverOpenWater(player.x) && !hasWaterBreathing()){
        const drownY = floorY + WATER_DROWN_DEPTH;
        const riseCeiling = floorY - WATER_MAX_RISE;
        if (player.y >= drownY){
          player.y = drownY;
          player.vy = 0;
          respawnPlayer("drowned");
          return;
        }
        if (player.y < riseCeiling){
          player.y = riseCeiling;
          if (player.vy < 0) player.vy = 0; // stop rising once capped, keep falling if already headed down
        }
        player.onGround = false; // no solid footing over open water — has to keep jumping to stay up
      }else{
        if (player.y >= floorY){
          player.y = floorY;
          player.vy = 0;
          player.onGround = true;
        }else{
          player.onGround = false;
        }
      }
    }

    const effectiveMoveSpeed = MOVE_SPEED * (player.charmFramesLeft > 0 ? player.charmSlowMultiplier : 1);
    if (keysDown.has("ArrowLeft")){ player.x -= effectiveMoveSpeed; player.facing = -1; }
    if (keysDown.has("ArrowRight")){ player.x += effectiveMoveSpeed; player.facing = 1; }
    player.x = clamp(player.x, 0, currentWorldWidth() - PLAYER_W);

    if (currentMap === "generated" && currentGeneratedLandLayout){
      const targetZone = currentGeneratedZone(player.x);
      if (targetZone && targetZone.type === "biome" && targetZone.requiredArmorTrait && !hasArmorTrait(targetZone.requiredArmorTrait)){
        // Hard-locked, not a penalty — push back out of the zone entirely.
        player.x = (player.x >= targetZone.start) ? targetZone.start - 2 : targetZone.end + 2;
      }
    }

    if (player.invulnFrames > 0) player.invulnFrames--;
  }

  function jumpIfGrounded(){
    if (player.onLadder) return;
    if (isOverOpenWater(player.x) && !hasWaterBreathing()){
      // Both gates matter: the cooldown stops rapid-fire spam, but the real
      // fix is the velocity check — without it, a new stroke could fire
      // right as the previous one peaks (before it's fallen back down at
      // all), chaining peak-to-peak into a sustained climb instead of a
      // bob. Must actually be falling (or neutral) before another stroke.
      if (player.waterStrokeCooldown > 0 || player.vy < 0) return;
      player.vy = JUMP_VELOCITY;
      player.waterStrokeCooldown = WATER_STROKE_COOLDOWN;
      return;
    }
    if (player.onGround){
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
    }
  }

  function updateCamera(){
    cameraX = clamp(player.x + PLAYER_W/2 - CANVAS_W/2, 0, Math.max(0, currentWorldWidth() - CANVAS_W));
  }

  function updateCooldowns(){
    if (meleeCooldown > 0) meleeCooldown--;
    if (player.waterStrokeCooldown > 0) player.waterStrokeCooldown--;
    SPELL_ORDER.concat(RARE_SPELL_ORDER).forEach(k => { if (spellCooldowns[k] > 0) spellCooldowns[k]--; });
    updateMysticArmor();
    updatePlayerBurn();
    updatePlayerCharm();
    updatePlayerPoison();
    updateCloak();
  }

  function activateCloak(){
    if (player.armorType !== "cloak") return;
    if (player.cloakActiveFramesLeft > 0 || player.cloakCooldownFramesLeft > 0) return;
    player.cloakActiveFramesLeft = INVIS_CLOAK_DURATION_FRAMES;
    player.cloakCooldownFramesLeft = INVIS_CLOAK_COOLDOWN_FRAMES; // starts now, not after the effect ends
    if (DEBUG) console.log("[WvW] cloak activated");
  }

  function updateCloak(){
    if (player.cloakActiveFramesLeft > 0) player.cloakActiveFramesLeft--;
    if (player.cloakCooldownFramesLeft > 0) player.cloakCooldownFramesLeft--;
  }

  function updateMysticArmor(){
    if (player.mysticArmorFramesLeft <= 0) return;
    player.mysticArmorFramesLeft--;
    if (player.armorType && !player.armorBroken && player.armorHp < player.armorMaxHp){
      player.armorHp = Math.min(player.armorMaxHp, player.armorHp + MYSTIC_ARMOR_REGEN_PER_FRAME);
    }
  }

  function applyBurnToPlayer(){
    if (player.invulnFrames > 0) return; // still guarded from a recent hit
    player.burningFrames = PLAYER_BURN_DURATION_FRAMES;
    player.invulnFrames = HIT_INVULN_FRAMES; // same brief guard as any other hit, so a laser can't be spammed
  }

  function updatePlayerBurn(){
    if (player.burningFrames <= 0) return;
    player.burningFrames--;
    damagePlayer(PLAYER_BURN_DAMAGE_PER_FRAME, { ignoreInvuln: true });
  }

  // Siren's Charm: immediate damage + a slow, no damage-over-time. Doesn't
  // stack — a fresh charm just refreshes the duration.
  function applyCharmToPlayer(duration, slowMultiplier){
    if (player.invulnFrames > 0) return;
    player.charmFramesLeft = duration;
    player.charmSlowMultiplier = slowMultiplier;
    player.invulnFrames = HIT_INVULN_FRAMES;
  }
  function updatePlayerCharm(){
    if (player.charmFramesLeft > 0) player.charmFramesLeft--;
  }

  // Snake's poison: damage-over-time, mirrors burn's pattern. Doesn't
  // stack — refreshes duration instead.
  function applyPoisonToPlayer(duration, dps){
    if (player.invulnFrames > 0) return;
    player.poisonFramesLeft = duration;
    player.poisonDps = dps;
    player.invulnFrames = HIT_INVULN_FRAMES;
  }
  function updatePlayerPoison(){
    if (player.poisonFramesLeft <= 0) return;
    player.poisonFramesLeft--;
    damagePlayer(player.poisonDps / 60, { ignoreInvuln: true });
  }

  /* ---------------- combat: player ---------------- */
  function meleeAttack(){
    if (meleeCooldown > 0) return;
    meleeCooldown = MELEE_COOLDOWN;
    const hitX = player.facing > 0 ? player.x + PLAYER_W : player.x - MELEE_RANGE;
    enemies.forEach(en => {
      if (en.hp > 0 && rectsOverlap(hitX, player.y, MELEE_RANGE, PLAYER_H, en.x, en.y, en.w, en.h)){
        damageEnemy(en, MELEE_DAMAGE);
      }
    });
  }

  function castSpell(key){
    const cfg = SPELLS[key];
    if (!cfg || spellCooldowns[key] > 0) return;
    const manaCost = RARE_SPELL_ORDER.includes(key) ? RARE_SPELL_MANA_COST : MANA_COST_PER_SPELL;
    if (player.mana < manaCost) return;
    spellCooldowns[key] = cfg.cooldown;
    player.mana -= manaCost;

    if (key === "fireball"){
      playerProjectiles.push({
        type: "fireball", x: player.x + PLAYER_W/2, y: player.y + PLAYER_H/2,
        vx: cfg.speed * player.facing, damage: cfg.damage
      });
    }else if (key === "lightning"){
      // Chain lightning: bridges from Walter to the nearest enemy, then from
      // that enemy to the next nearest (not yet hit), up to chainMax links.
      // An equipped amulet (Banner of Valor / Emerald Fang) can extend that
      // chain while Lightning is slotted in one of its 9 slots.
      const chainMax = cfg.chainMax + (isAmuletBuffActive("lightning") ? (AMULETS[player.equippedAmulet].chainBonus || 0) : 0);
      const chainPoints = [{ x: player.x + PLAYER_W/2, y: player.y + PLAYER_H/2 }];
      const hitSoFar = [];
      let fromX = chainPoints[0].x, fromY = chainPoints[0].y;

      for (let i = 0; i < chainMax; i++){
        let nearest = null, nearestDist = Infinity;
        enemies.forEach(en => {
          if (en.hp <= 0 || hitSoFar.includes(en)) return;
          const enCx = en.x + en.w/2, enCy = en.y + en.h/2;
          const dx = enCx - fromX, dy = enCy - fromY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist <= cfg.range && dist < nearestDist){
            nearest = en;
            nearestDist = dist;
          }
        });
        if (!nearest) break;
        hitSoFar.push(nearest);
        damageEnemy(nearest, cfg.damage);
        const enCx = nearest.x + nearest.w/2, enCy = nearest.y + nearest.h/2;
        chainPoints.push({ x: enCx, y: enCy });
        fromX = enCx; fromY = enCy;
      }

      effects.push({ type: "lightning-chain", points: chainPoints, life: 10 });
    }else if (key === "freeze"){
      const originX = player.x + PLAYER_W/2, originY = player.y + PLAYER_H/2;
      enemies.forEach(en => {
        const dx = (en.x + en.w/2) - originX, dy = (en.y + en.h/2) - originY;
        if (Math.sqrt(dx*dx + dy*dy) < cfg.radius) en.frozenFrames = cfg.duration;
      });
      player.burningFrames = 0; // ice puts out fire — extinguishes an active cyclops burn early
      effects.push({ type: "freeze-burst", x: originX, y: originY, radius: cfg.radius, life: 20 });
    }else if (key === "summonAlly"){
      allies = []; // only one ally at a time — casting again replaces it
      allies.push({
        x: player.x - 30 * player.facing, y: player.y, hp: cfg.allyHp,
        life: cfg.allyDuration, damage: cfg.allyDamage, cooldown: 0
      });
    }else if (key === "blackHole"){
      const cx = player.x + PLAYER_W/2 + 90 * player.facing;
      effects.push({
        type: "black-hole", x: cx, y: GROUND_Y - 60, radius: cfg.radius,
        life: cfg.duration, damagePerFrame: cfg.damagePerFrame, pullStrength: cfg.pullStrength
      });
    }else if (key === "mysticArmor"){
      player.mysticArmorFramesLeft = cfg.duration;
    }

    if (DEBUG) console.log("[WvW] cast " + key);
  }

  function damageEnemy(en, amount){
    if (en.burrowed) return; // sand worms take no damage while burrowed
    en.hp -= amount;
    if (en.hp <= 0 && !en.counted){
      en.counted = true;
      totalKills++;
      if (ENEMY_STATS[en.type].dropsCrystal){
        player.carriedCrystals += CRYSTAL_PER_WIZARD;
        if (DEBUG) console.log("[WvW] wizard defeated, crystal carried=" + player.carriedCrystals);
      }
      if (ENEMY_STATS[en.type].dropsSilver){
        player.silver += SILVER_PER_KNIGHT;
        if (DEBUG) console.log("[WvW] knight defeated, silver=" + player.silver);
      }
      if (en.type === "cyclops" && !player.amuletsOwned.has("cyclopsEye")){
        player.amuletsOwned.add("cyclopsEye");
        player.amuletSlots.cyclopsEye = new Array(9).fill(null);
        if (!player.equippedAmulet) player.equippedAmulet = "cyclopsEye"; // auto-equip a first amulet
        respawnMessageText = "The cyclops dropped " + AMULETS.cyclopsEye.label + "!";
        respawnMessageTimer = 180;
        if (DEBUG) console.log("[WvW] earned amulet: cyclopsEye");
        saveProgress();
      }
      if (en.isBoss && currentGeneratedLandLayout && !currentGeneratedLandLayout.bossDefeated){
        currentGeneratedLandLayout.bossDefeated = true;
        const bossInfo = BOSS_ROSTER[en.bossBiomeId];
        const amuletKey = bossInfo.amuletId;
        player.silver += bossInfo.silverReward;
        player.bankedCrystals += bossInfo.crystalReward;
        let amuletMsg = "";
        if (!player.amuletsOwned.has(amuletKey)){
          player.amuletsOwned.add(amuletKey);
          player.amuletSlots[amuletKey] = new Array(9).fill(null);
          if (!player.equippedAmulet) player.equippedAmulet = amuletKey;
          amuletMsg = " " + AMULETS[amuletKey].label + " earned.";
        }
        const landNumber = currentGeneratedLandLayout.land.landNumber;
        player.highestUnlockedLand = Math.max(player.highestUnlockedLand, landNumber);
        respawnMessageText = bossInfo.name + " defeated!" + amuletMsg;
        respawnMessageTimer = 240;
        if (DEBUG) console.log("[WvW] boss defeated: " + bossInfo.name + " — Land " + (landNumber + 1) + " unlocked");
        saveProgress();
      }
    }
  }

  function damagePlayer(amount, opts){
    opts = opts || {};
    if (!opts.ignoreInvuln && player.invulnFrames > 0) return;

    let remaining = amount;
    if (player.armorHp > 0){
      const absorbed = Math.min(player.armorHp, remaining);
      player.armorHp -= absorbed;
      remaining -= absorbed;
      if (player.armorHp <= 0){
        player.armorHp = 0;
        player.armorBroken = true; // depleted, not deleted — repairable at an altar
        if (DEBUG) console.log("[WvW] " + player.armorType + " armor broke");
      }
    }
    if (remaining > 0) player.hp -= remaining;

    if (!opts.ignoreInvuln) player.invulnFrames = HIT_INVULN_FRAMES;
    if (player.hp <= 0) respawnPlayer();
  }

  function respawnPlayer(reason){
    const lost = player.carriedCrystals;
    player.carriedCrystals = 0;
    player.hp = PLAYER_MAX_HP;
    player.burningFrames = 0;
    currentMap = "home"; // dying anywhere (including land1) sends you back home
    const spawn = spawnPoint();
    player.x = spawn.x;
    player.y = spawn.y;
    player.vy = 0;
    player.invulnFrames = RESPAWN_INVULN_FRAMES;
    const verb = reason === "drowned" ? "drowned" : "went down";
    respawnMessageText = lost > 0
      ? "You " + verb + " and lost " + lost + " crystal" + (lost === 1 ? "" : "s") + "."
      : "You " + verb + ".";
    respawnMessageTimer = 180;
    if (DEBUG) console.log("[WvW] respawned (" + (reason || "defeated") + "), lost " + lost + " crystals");
  }

  /* ---------------- wave spawning ---------------- */
  const PEACEFUL_ZONES = ["tower", "water", "dock", "innercave", "village1", "village2", "castlezone", "river", "bossArena"]; // innercave/bossArena use their own single-encounter spawns; homebase is entirely peaceful

  function updateWaveSpawning(){
    if (currentMap === "generated"){ updateGeneratedWaveSpawning(); return; }
    const zone = currentZone(player.x);
    if (PEACEFUL_ZONES.includes(zone)) return;

    if (frame >= nextSpawnFrame){
      spawnWaveEnemy(zone);
      nextSpawnFrame = frame + SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
    }
  }

  function updateGeneratedWaveSpawning(){
    const zone = currentGeneratedZone(player.x);
    if (!zone || zone.type !== "biome") return; // only biome zones spawn regular waves
    if (frame >= nextSpawnFrame){
      spawnGeneratedWaveEnemy(zone);
      nextSpawnFrame = frame + SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
    }
  }

  function spawnGeneratedWaveEnemy(zone){
    if (!zone.enemyPool || zone.enemyPool.length === 0) return;
    const type = zone.enemyPool[Math.floor(Math.random() * zone.enemyPool.length)];
    const stats = ENEMY_STATS[type];
    if (!stats) return;
    const mult = difficultyMultiplier();
    const x = Math.random() < 0.5 ? zone.start + 10 : zone.end - 10;
    const en = {
      type, x, y: GROUND_Y - stats.h, w: stats.w, h: stats.h,
      hp: Math.round(stats.hp * mult), maxHp: Math.round(stats.hp * mult),
      scaledDamage: Math.round(stats.damage * mult),
      attackCooldown: 0, frozenFrames: 0, burningFrames: 0, counted: false
    };
    if (type === "sandworm"){ en.burrowed = true; en.emergeFramesLeft = 0; }
    if (type === "fey"){ en.teleportCooldown = 0; }
    if (type === "snake"){ en.lunging = false; }
    enemies.push(en);
    if (DEBUG) console.log("[WvW] spawned " + type + " in generated biome " + zone.id);
  }

  // Bounds + which side enemies spawn from, per combat zone. The first
  // combat zone after a peaceful one only spawns from the right (ahead of
  // the player); later zones spawn from either side.
  function zoneCombatBounds(zone){
    switch (zone){
      case "wall":       return { start: TOWER_END,        end: WALL_END,             spawnSide: "right" };
      case "fair":       return { start: WALL_END,          end: FAIR_END,             spawnSide: "both"  };
      case "grass":      return { start: LAND1_DOCK_END,    end: LAND1_GRASS_END,      spawnSide: "right" };
      case "forest":     return { start: LAND1_GRASS_END,   end: LAND1_FOREST_END,     spawnSide: "both"  };
      case "castlewall": return { start: LAND1_FOREST_END,  end: LAND1_CASTLEWALL_END, spawnSide: "both"  };
      case "l2grass":    return { start: LAND2_DOCK_END,    end: LAND2_GRASS_END,      spawnSide: "right" };
      case "cave":       return { start: LAND2_GRASS_END,   end: LAND2_CAVE_END,       spawnSide: "both"  };
      default:           return { start: 0, end: 0, spawnSide: "both" };
    }
  }

  // Overall bounds enemies are confined to on the current map — can't
  // wade into water/the peaceful zones on either end. Land 2's span
  // reaches through the inner cave too, so the cyclops isn't clamped out
  // of its own zone.
  function combatZoneBounds(){
    if (currentMap === "land1") return { start: LAND1_DOCK_END, end: LAND1_CASTLEWALL_END };
    if (currentMap === "land2") return { start: LAND2_DOCK_END, end: LAND2_INNERCAVE_END };
    if (currentMap === "generated"){
      if (!currentGeneratedLandLayout) return { start: 0, end: 0 };
      const zones = currentGeneratedLandLayout.zones;
      return { start: zones[0].end, end: zones[zones.length - 1].end };
    }
    return { start: TOWER_END, end: FAIR_END };
  }

  function pickWizardTier(){
    const unlocked = WIZARD_TIERS.filter(t => totalKills >= t.minKills);
    return unlocked[Math.floor(Math.random() * unlocked.length)];
  }

  function spawnWaveEnemy(zone){
    const r = currentRatios();
    const roll = Math.random();
    let type = "knight";
    if (roll > r.knight + r.archer) type = pickWizardTier().key;
    else if (roll > r.knight) type = "archer";

    const stats = ENEMY_STATS[type];
    const mult = difficultyMultiplier();
    const bounds = zoneCombatBounds(zone);
    let x;
    if (bounds.spawnSide === "right"){
      x = bounds.end - 10;
    }else{
      x = Math.random() < 0.5 ? bounds.start + 10 : bounds.end - 10;
    }

    enemies.push({
      type, x, y: GROUND_Y - stats.h, w: stats.w, h: stats.h,
      hp: Math.round(stats.hp * mult), maxHp: Math.round(stats.hp * mult),
      scaledDamage: Math.round(stats.damage * mult),
      attackCooldown: 0, frozenFrames: 0, burningFrames: 0, counted: false
    });
    if (DEBUG) console.log("[WvW] spawned " + type + " in " + zone + " zone (power " + playerPower() + ", x" + mult.toFixed(2) + ")");
  }

  /* ---------------- enemies ---------------- */
  function updateEnemies(){
    enemies.forEach(en => {
      if (en.hp <= 0) return;
      if (en.frozenFrames > 0){ en.frozenFrames--; return; }

      if (en.burningFrames > 0){
        en.burningFrames--;
        damageEnemy(en, SPELLS.fireball.burnDamagePerFrame);
        if (en.hp <= 0) return;
      }

      // Global non-aggro while the Invisibility Cloak is active, and
      // per-type pacification from Goblin Armor. Status effects (frozen,
      // burning) still tick above — only aggro/movement/attack pauses.
      if (player.cloakActiveFramesLeft > 0) return;
      if (player.armorType === "goblin" && GOBLIN_ARMOR_PACIFIES.has(en.type)) return;

      const stats = ENEMY_STATS[en.type];
      const enCx = en.x + en.w/2;
      const playerCx = player.x + PLAYER_W/2;
      const dist = playerCx - enCx;

      if (en.attackCooldown > 0) en.attackCooldown--;

      if (en.type === "knight" || en.type === "ogre"){
        if (Math.abs(dist) > stats.contactRange){
          en.x += Math.sign(dist) * stats.speed;
        }else if (en.attackCooldown <= 0){
          damagePlayer(en.scaledDamage);
          en.attackCooldown = stats.attackCooldown;
        }
      }else if (en.type === "cyclops"){
        // Always closes in, never retreats — unlike archer/wizard, a
        // cyclops doesn't kite. It just stops advancing once in firing
        // range rather than trying to hold a preferred distance.
        if (Math.abs(dist) > stats.preferredRange){
          en.x += Math.sign(dist) * stats.speed;
        }
        if (Math.abs(dist) <= stats.preferredRange && en.attackCooldown <= 0){
          fireCyclopsBeam(en);
          en.attackCooldown = stats.attackCooldown;
        }
      }else if (en.type === "sandworm"){
        // Burrowed: invulnerable, untargetable, moves toward the player,
        // can't attack. Emerges once in melee range; after a few seconds
        // above ground (or if the player creates distance) it burrows
        // again.
        if (en.burrowed){
          if (Math.abs(dist) > stats.contactRange){
            en.x += Math.sign(dist) * stats.burrowSpeed;
          }else{
            en.burrowed = false;
            en.emergeFramesLeft = stats.emergeDuration;
          }
        }else{
          en.emergeFramesLeft--;
          if (Math.abs(dist) > stats.contactRange * 2.5 || en.emergeFramesLeft <= 0){
            en.burrowed = true;
          }else if (Math.abs(dist) > stats.contactRange){
            en.x += Math.sign(dist) * stats.speed;
          }else if (en.attackCooldown <= 0){
            damagePlayer(en.scaledDamage);
            en.attackCooldown = stats.attackCooldown;
          }
        }
      }else if (en.type === "fey"){
        // Ranged kiting, same as archer/wizard, but instead of backing
        // away when the player closes to melee range, it teleports.
        if (Math.abs(dist) <= stats.contactRangeForTeleport && en.teleportCooldown <= 0){
          const dir = Math.sign(dist) || 1;
          const jump = stats.teleportRange * 0.5 + Math.random() * (stats.teleportRange * 0.5);
          const bounds = combatZoneBounds();
          en.x = clamp(en.x - dir * jump, bounds.start, bounds.end - en.w);
          en.teleportCooldown = stats.teleportCooldown;
        }else if (Math.abs(dist) > stats.preferredRange + 20){
          en.x += Math.sign(dist) * stats.speed;
        }else if (en.attackCooldown <= 0){
          fireEnemyProjectile(en, Math.sign(dist) || 1);
          en.attackCooldown = stats.attackCooldown;
        }
        if (en.teleportCooldown > 0) en.teleportCooldown--;
      }else if (en.type === "snake"){
        // Circles outside melee range, lunges in on a cooldown, applies
        // poison on contact, then retreats back out to lunge range.
        if (en.lunging){
          en.x += Math.sign(dist) * stats.speed * 1.8;
          if (Math.abs(dist) <= stats.contactRange && en.attackCooldown <= 0){
            damagePlayer(en.scaledDamage);
            applyPoisonToPlayer(stats.poisonDuration, stats.poisonDps);
            en.attackCooldown = stats.attackCooldown;
            en.lunging = false;
          }else if (Math.abs(dist) > stats.lungeRange * 1.5){
            en.lunging = false; // lost the target, stop committing
          }
        }else if (Math.abs(dist) <= stats.lungeRange && en.attackCooldown <= 0){
          en.lunging = true;
        }else if (Math.abs(dist) > stats.lungeRange + 30){
          en.x += Math.sign(dist) * stats.speed;
        }else if (Math.abs(dist) < stats.lungeRange - 20){
          en.x -= Math.sign(dist) * stats.speed; // circles just outside lunge range
        }
      }else if (en.isBoss){
        // Generic boss posture: always closes in, never retreats — same
        // as the cyclops. Commander additionally rallies reinforcements
        // at HP thresholds; every other boss uses just this shared AI
        // until its own signature mechanic gets built.
        if (Math.abs(dist) > stats.contactRange){
          en.x += Math.sign(dist) * stats.speed;
        }else if (en.attackCooldown <= 0){
          damagePlayer(en.scaledDamage);
          en.attackCooldown = stats.attackCooldown;
        }
        if (en.bossBiomeId === "village") updateCommanderRally(en);
      }else{
        if (Math.abs(dist) > stats.preferredRange + 20){
          en.x += Math.sign(dist) * stats.speed;
        }else if (Math.abs(dist) < stats.preferredRange - 20){
          en.x -= Math.sign(dist) * stats.speed;
        }else if (en.attackCooldown <= 0){
          fireEnemyProjectile(en, Math.sign(dist) || 1);
          en.attackCooldown = stats.attackCooldown;
        }
      }

      // Land-bound — can't wade into the water (or off the far end of
      // land1) chasing the player, and can't retreat into a peaceful
      // zone either.
      const bounds = combatZoneBounds();
      en.x = clamp(en.x, bounds.start, bounds.end - en.w);
    });

    enemies = enemies.filter(en => en.hp > 0);
  }

  function fireEnemyProjectile(en, dir){
    const stats = ENEMY_STATS[en.type];
    const type = en.type === "archer" ? "arrow"
      : en.type === "fairy" ? "arrow"
      : en.type === "siren" ? "charm"
      : (Math.random() < 0.5 ? "lightning" : "fireball");
    enemyProjectiles.push({
      type, x: en.x + en.w/2, y: en.y + en.h/2, vx: stats.projectileSpeed * dir,
      damage: en.scaledDamage, sourceType: en.type
    });
  }

  // Instant hitscan, not a traveling projectile — a slow horizontal shot
  // from a 3x-tall enemy would fly over the player's head most of the
  // time. This draws (and hits) directly from the eye to wherever the
  // player actually is the moment it fires, so it can't miss vertically.
  function fireCyclopsBeam(en){
    const eyeX = en.x + en.w / 2;
    const eyeY = en.y + en.h * 0.32; // matches the eye's drawn position
    const targetX = player.x + PLAYER_W / 2;
    const targetY = player.y + PLAYER_H / 2;
    effects.push({ type: "cyclops-beam", x1: eyeX, y1: eyeY, x2: targetX, y2: targetY, life: 12 });
    applyBurnToPlayer();
  }

  /* ---------------- projectiles ---------------- */
  function triggerFireSplash(x, y){
    const cfg = SPELLS.fireball;
    const buffed = isAmuletBuffActive("fireball");
    const burnDuration = buffed
      ? Math.round(cfg.burnDuration * AMULETS[player.equippedAmulet].burnDurationMultiplier)
      : cfg.burnDuration;
    enemies.forEach(en => {
      if (en.hp <= 0) return;
      const enCx = en.x + en.w/2, enCy = en.y + en.h/2;
      const dx = enCx - x, dy = enCy - y;
      if (Math.sqrt(dx*dx + dy*dy) < cfg.splashRadius) en.burningFrames = burnDuration;
    });
    effects.push({ type: "fire-burst", x, y, radius: cfg.splashRadius, life: 20 });
  }

  function hitsTree(x, y){
    return getTrees().some(t => rectsOverlap(x - 8, y - 8, 16, 16, t.x, GROUND_Y - t.h, t.w, t.h));
  }

  function updateProjectiles(){
    playerProjectiles.forEach(p => { p.x += p.vx; });

    // Trees physically block projectiles — check before anything else can hit.
    playerProjectiles.forEach(p => {
      if (!p.hit && hitsTree(p.x, p.y)) p.hit = true;
    });

    playerProjectiles.forEach(p => {
      if (p.hit) return;
      enemies.forEach(en => {
        if (en.hp > 0 && rectsOverlap(p.x-8, p.y-8, 16, 16, en.x, en.y, en.w, en.h)){
          damageEnemy(en, p.damage);
          p.hit = true;
          if (p.type === "fireball") triggerFireSplash(p.x, p.y);
        }
      });
    });
    playerProjectiles = playerProjectiles.filter(p => !p.hit && p.x > -30 && p.x < currentWorldWidth() + 30);

    enemyProjectiles.forEach(p => { p.x += p.vx; });

    enemyProjectiles.forEach(p => {
      if (!p.hit && hitsTree(p.x, p.y)) p.hit = true;
    });

    enemyProjectiles.forEach(p => {
      if (p.hit) return;
      if (player.invulnFrames <= 0 && rectsOverlap(p.x-8, p.y-8, 16, 16, player.x, player.y, PLAYER_W, PLAYER_H)){
        if (p.type === "charm"){
          const s = ENEMY_STATS.siren;
          applyCharmToPlayer(s.charmDuration, s.charmSlowMultiplier); // before damagePlayer, which sets invuln
        }
        damagePlayer(p.damage);
        p.hit = true;
      }
    });
    enemyProjectiles = enemyProjectiles.filter(p => !p.hit && p.x > -30 && p.x < currentWorldWidth() + 30);
  }

  /* ---------------- allies ---------------- */
  function updateAllies(){
    allies.forEach(a => {
      a.life--;
      if (a.cooldown > 0) a.cooldown--;
      const alive = enemies.filter(en => en.hp > 0);
      const target = alive.sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
      if (target){
        const dist = (target.x + target.w/2) - (a.x + PLAYER_W/2);
        if (Math.abs(dist) > 30){
          a.x += Math.sign(dist) * 2.2;
        }else if (a.cooldown <= 0){
          damageEnemy(target, a.damage);
          a.cooldown = 40;
        }
      }
    });
    allies = allies.filter(a => a.life > 0 && a.hp > 0);
  }

  /* ---------------- effects ---------------- */
  function updateEffects(){
    effects.forEach(fx => {
      fx.life--;
      if (fx.type === "black-hole"){
        enemies.forEach(en => {
          if (en.hp <= 0) return;
          const enCx = en.x + en.w/2, enCy = en.y + en.h/2;
          const dx = fx.x - enCx, dy = fx.y - enCy;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          if (dist < fx.radius){
            en.x += (dx/dist) * fx.pullStrength;
            damageEnemy(en, fx.damagePerFrame);
          }
        });
      }
    });
    effects = effects.filter(fx => fx.life > 0);
  }

  /* ---------------- chest / altar ---------------- */
  function checkChestAndAltar(){
    getChests().forEach(chest => {
      if (rectsOverlap(player.x, player.y, PLAYER_W, PLAYER_H, chest.x, GROUND_Y - chest.h, chest.w, chest.h)){
        if (player.carriedCrystals > 0){
          player.bankedCrystals += player.carriedCrystals;
          if (DEBUG) console.log("[WvW] deposited " + player.carriedCrystals + " crystals, banked=" + player.bankedCrystals);
          player.carriedCrystals = 0;
          saveProgress();
        }
      }
    });

    // Edge-triggered: only fires on the transition into the zone, not every
    // frame you happen to be standing in it — otherwise clicking Close
    // while still standing there reopens it again on the very next frame.
    const walkupHit = getWalkupAltars().find(a =>
      rectsOverlap(player.x, player.y, PLAYER_W, PLAYER_H, a.x, GROUND_Y - a.h, a.w, a.h)
    );
    if (walkupHit && !wasAtWalkupAltar){
      if (walkupHit.action === "map" && !mapOpen && frame >= dockMenuUnlockFrame) openMap();
      else if (walkupHit.action === "altar" && !altarOpen) openAltar();
      else if (walkupHit.action === "townhall" && !townHallOpen) openTownHall();
      else if (walkupHit.action === "castle" && !castleUiOpen) openCastleUi();
    }
    wasAtWalkupAltar = !!walkupHit;

    const climb = activeClimbPoint();
    const atClimbTop = !!climb && player.y <= climb.topY - PLAYER_H + 20;
    if (atClimbTop && !wasAtClimbTop){
      if (climb.action === "altar" && !altarOpen) openAltar();
      if (climb.action === "map" && !mapOpen) openMap();
      if (climb.action === "land1Tower") openLand1Tower();
    }
    wasAtClimbTop = atClimbTop;
  }

  /* ---------------- draw ---------------- */
  function draw(){
    drawBackground();
    if (currentMap === "land1"){
      drawLand1Grass();
      drawLand1Dock();
      drawLand1CastleWalls();
      drawLand1Tower();
    }else if (currentMap === "land2"){
      drawLand2Dock();
      drawLand2Cave();
    }else if (currentMap === "homebase"){
      drawHomebaseDock();
      drawHomebaseHouses();
      drawHomebaseShrine();
      drawHomebaseTownHall();
      drawHomebaseCastle();
    }else if (currentMap === "generated"){
      drawGeneratedDock();
      drawGeneratedBiomeDecorations();
      drawGeneratedBossArena();
    }else{
      drawWater();
      drawCastleWalls();
      drawTower();
      drawBoat();
    }
    drawChest();
    drawTrees();
    enemies.forEach(drawEnemy);
    allies.forEach(drawAlly);
    effects.forEach(drawEffect);
    enemyProjectiles.forEach(p => drawProjectile(p));
    playerProjectiles.forEach(p => drawProjectile(p));
    drawPlayer();
    drawHud();
    drawRespawnMessage();
  }

  function worldToScreen(x){ return x - cameraX; }

  function drawBackground(){
    ctx.fillStyle = COLORS.skyWall;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    let bands;
    if (currentMap === "land1"){
      bands = [
        { from: 0, to: LAND1_DOCK_END, color: COLORS.skyDock },
        { from: LAND1_DOCK_END, to: LAND1_GRASS_END, color: COLORS.skyGrass },
        { from: LAND1_GRASS_END, to: LAND1_FOREST_END, color: COLORS.skyForest },
        { from: LAND1_FOREST_END, to: LAND1_CASTLEWALL_END, color: COLORS.skyWall }
      ];
    }else if (currentMap === "land2"){
      bands = [
        { from: 0, to: LAND2_DOCK_END, color: COLORS.skyDock },
        { from: LAND2_DOCK_END, to: LAND2_GRASS_END, color: COLORS.skyGrass },
        { from: LAND2_GRASS_END, to: LAND2_CAVE_END, color: COLORS.skyCaveEntrance },
        { from: LAND2_CAVE_END, to: LAND2_INNERCAVE_END, color: COLORS.skyInnerCave }
      ];
    }else if (currentMap === "homebase"){
      bands = [
        { from: 0, to: HOMEBASE_DOCK_END, color: COLORS.skyDock },
        { from: HOMEBASE_DOCK_END, to: HOMEBASE_VILLAGE1_END, color: COLORS.skyVillage },
        { from: HOMEBASE_VILLAGE1_END, to: HOMEBASE_VILLAGE2_END, color: COLORS.skyVillage },
        { from: HOMEBASE_VILLAGE2_END, to: HOMEBASE_CASTLE_END, color: COLORS.skyCastleZone }
      ];
    }else if (currentMap === "generated" && currentGeneratedLandLayout){
      bands = currentGeneratedLandLayout.zones.map(z => ({
        from: z.start, to: z.end,
        color: z.type === "dock" ? COLORS.skyDock
          : z.type === "river" ? COLORS.skyWater
          : z.type === "bossArena" ? COLORS.bossArenaSky
          : (GENERATED_BIOME_SKY_COLORS[z.id] || COLORS.skyGrasslandsGen)
      }));
    }else{
      bands = [
        { from: 0, to: TOWER_END, color: COLORS.skyTower },
        { from: TOWER_END, to: WALL_END, color: COLORS.skyWall },
        { from: WALL_END, to: FAIR_END, color: COLORS.skyFair },
        { from: FAIR_END, to: WATER_END, color: COLORS.skyWater }
      ];
    }
    bands.forEach(b => {
      const x1 = worldToScreen(b.from), x2 = worldToScreen(b.to);
      if (x2 < 0 || x1 > CANVAS_W) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.max(0, x1), 0, Math.min(CANVAS_W, x2) - Math.max(0, x1), CANVAS_H);
    });

    ctx.strokeStyle = COLORS.ground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // On the home map the ground line stops at the water's edge (the water
    // zone draws its own ripple line instead); the lands have no water, so
    // the ground runs the full visible width there.
    const groundLineEnd = currentMap === "home"
      ? Math.max(0, Math.min(CANVAS_W, worldToScreen(FAIR_END)))
      : CANVAS_W;
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(groundLineEnd, GROUND_Y);
    ctx.stroke();
  }

  function drawCastleWalls(){
    drawCastleWallBackdrop(TOWER_END, WALL_END);
  }

  function drawCastleWallBackdrop(startX, endX){
    const left = worldToScreen(startX);
    const right = worldToScreen(endX);
    if (right < 0 || left > CANVAS_W) return; // zone not currently in view

    const top = GROUND_Y - CASTLE_WALL_HEIGHT;
    const visLeft = Math.max(0, left);
    const visRight = Math.min(CANVAS_W, right);

    ctx.fillStyle = COLORS.wallStone;
    ctx.fillRect(visLeft, top, visRight - visLeft, CASTLE_WALL_HEIGHT);

    // crenellations along the top edge
    ctx.fillStyle = COLORS.wallStoneDark;
    for (let wx = startX; wx < endX; wx += CRENEL_UNIT * 2){
      const sx = worldToScreen(wx);
      if (sx + CRENEL_UNIT < 0 || sx > CANVAS_W) continue;
      ctx.fillRect(sx, top - 14, CRENEL_UNIT, 14);
    }

    // sparse vertical seams for a bit of stone texture
    ctx.strokeStyle = COLORS.wallStoneDark;
    ctx.lineWidth = 2;
    for (let wx = startX + 60; wx < endX; wx += 120){
      const sx = worldToScreen(wx);
      if (sx < 0 || sx > CANVAS_W) continue;
      ctx.beginPath();
      ctx.moveTo(sx, top);
      ctx.lineTo(sx, GROUND_Y);
      ctx.stroke();
    }
  }

  function drawLand1Grass(){
    const spacing = 36;
    ctx.strokeStyle = COLORS.grassBlade;
    ctx.lineWidth = 2;
    for (let gx = LAND1_DOCK_END; gx < LAND1_GRASS_END; gx += spacing){
      const sx = worldToScreen(gx);
      if (sx < -20 || sx > CANVAS_W + 20) continue;
      [-6, 0, 6].forEach(offset => {
        ctx.beginPath();
        ctx.moveTo(sx + offset, GROUND_Y);
        ctx.lineTo(sx + offset * 1.4, GROUND_Y - 11);
        ctx.stroke();
      });
    }
  }

  function drawLand1CastleWalls(){
    drawCastleWallBackdrop(LAND1_FOREST_END, LAND1_CASTLEWALL_END);
  }

  function drawDockAt(worldX){
    const x = worldToScreen(worldX);
    if (x + LAND1_DOCK_W < -40 || x > CANVAS_W + 40) return;
    const deckY = GROUND_Y - 24;

    // a short dock/gangway rather than a full hull — "attached to a dock,
    // no swimming needed" reads more like a pier than another ship
    ctx.fillStyle = COLORS.boatHullDark;
    ctx.fillRect(x, deckY, LAND1_DOCK_W, 10);
    ctx.fillStyle = COLORS.boatHull;
    for (let px = 0; px < LAND1_DOCK_W; px += 24){
      ctx.fillRect(x + px, deckY, 3, GROUND_Y - deckY);
    }

    // the boat itself, moored at the near end
    ctx.fillStyle = COLORS.boatHull;
    ctx.beginPath();
    ctx.moveTo(x, deckY);
    ctx.lineTo(x + 90, deckY);
    ctx.lineTo(x + 76, GROUND_Y + 14);
    ctx.lineTo(x + 14, GROUND_Y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.boatHullDark;
    ctx.fillRect(x, deckY, 90, 8);
    ctx.strokeStyle = COLORS.boatMast;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 45, deckY);
    ctx.lineTo(x + 45, deckY - 60);
    ctx.stroke();
    ctx.fillStyle = COLORS.boatSail;
    ctx.beginPath();
    ctx.moveTo(x + 45, deckY - 50);
    ctx.lineTo(x + 45, deckY - 8);
    ctx.lineTo(x + 15, deckY - 20);
    ctx.closePath();
    ctx.fill();
  }

  function drawLand1Dock(){ drawDockAt(LAND1_DOCK_X); }
  function drawLand2Dock(){ drawDockAt(LAND2_DOCK_X); }
  function drawHomebaseDock(){ drawDockAt(HOMEBASE_DOCK_X); }
  function drawGeneratedDock(){
    if (currentGeneratedLandLayout) drawDockAt(currentGeneratedLandLayout.dockX);
  }

  function drawGeneratedBossArena(){
    if (!currentGeneratedLandLayout) return;
    const arenaZone = currentGeneratedLandLayout.zones.find(z => z.type === "bossArena");
    if (!arenaZone) return;
    const gateX = worldToScreen(arenaZone.start);
    if (gateX < -60 || gateX > CANVAS_W + 60) return;
    ctx.fillStyle = COLORS.bossTrim;
    ctx.fillRect(gateX - 4, GROUND_Y - 140, 8, 140);
    ctx.fillRect(gateX - 4, GROUND_Y - 140, 90, 8);
  }

  // Biome decoration, per Gemini's visual spec doc. Each iterates world-x
  // positions across its zone at fixed spacing, skipping anything not
  // currently on screen. Flat canvas primitives only, no gradients/sprites.
  function drawGeneratedBiomeDecorations(){
    if (currentMap !== "generated" || !currentGeneratedLandLayout) return;
    currentGeneratedLandLayout.zones.forEach(z => {
      if (z.type !== "biome") return;
      const left = worldToScreen(z.start), right = worldToScreen(z.end);
      if (right < -100 || left > CANVAS_W + 100) return;
      if (z.id === "desert") drawDesertZone(z);
      else if (z.id === "underwater") drawUnderwaterZone(z);
      else if (z.id === "swamp") drawSwampZone(z);
      else if (z.id === "jungle") drawJungleZone(z);
      else if (z.id === "treehouses") drawTreehousesZone(z);
    });
  }

  function drawDesertZone(z){
    // sun
    const sunX = worldToScreen(z.start + 80);
    if (sunX > -80 && sunX < CANVAS_W + 80){
      ctx.fillStyle = COLORS.sunColor;
      ctx.beginPath(); ctx.arc(sunX, 70, 40, 0, Math.PI * 2); ctx.fill();
    }
    // dunes: overlapping curved paths instead of a flat line
    ctx.fillStyle = COLORS.duneColor;
    for (let wx = z.start; wx < z.end; wx += 140){
      const sx = worldToScreen(wx);
      if (sx < -160 || sx > CANVAS_W + 160) continue;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.quadraticCurveTo(sx + 70, GROUND_Y - 18, sx + 140, GROUND_Y);
      ctx.lineTo(sx + 140, GROUND_Y + 20);
      ctx.lineTo(sx, GROUND_Y + 20);
      ctx.closePath();
      ctx.fill();
    }
    // cacti + rocks
    for (let wx = z.start + 40; wx < z.end; wx += 220){
      const sx = worldToScreen(wx);
      if (sx < -30 || sx > CANVAS_W + 30) continue;
      ctx.fillStyle = COLORS.cactusColor;
      ctx.fillRect(sx, GROUND_Y - 40, 10, 40);
      ctx.fillRect(sx - 8, GROUND_Y - 28, 8, 6);
      ctx.fillRect(sx + 10, GROUND_Y - 22, 8, 6);
    }
    for (let wx = z.start + 130; wx < z.end; wx += 260){
      const sx = worldToScreen(wx);
      if (sx < -20 || sx > CANVAS_W + 20) continue;
      ctx.fillStyle = COLORS.rockColor;
      ctx.beginPath(); ctx.arc(sx, GROUND_Y, 10, Math.PI, Math.PI * 2); ctx.fill();
    }
  }

  function drawUnderwaterZone(z){
    ctx.fillStyle = COLORS.underwaterGround;
    ctx.fillRect(Math.max(0, worldToScreen(z.start)), GROUND_Y, Math.min(CANVAS_W, worldToScreen(z.end)) - Math.max(0, worldToScreen(z.start)), CANVAS_H - GROUND_Y);
    for (let wx = z.start + 20; wx < z.end; wx += 90){
      const sx = worldToScreen(wx);
      if (sx < -20 || sx > CANVAS_W + 20) continue;
      ctx.strokeStyle = COLORS.kelpColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.quadraticCurveTo(sx + 8, GROUND_Y - 30, sx - 6, GROUND_Y - 60);
      ctx.stroke();
      ctx.strokeStyle = COLORS.bubbleColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx + 12, GROUND_Y - 80 - (frame % 60), 3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#FFFFFF";
    for (let wx = z.start; wx < z.end; wx += 160){
      const sx = worldToScreen(wx);
      if (sx < -40 || sx > CANVAS_W + 40) continue;
      ctx.beginPath();
      ctx.moveTo(sx, 0); ctx.lineTo(sx + 40, 0); ctx.lineTo(sx - 10, GROUND_Y); ctx.lineTo(sx - 40, GROUND_Y);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawSwampZone(z){
    ctx.fillStyle = COLORS.swampGround;
    ctx.fillRect(Math.max(0, worldToScreen(z.start)), GROUND_Y, Math.min(CANVAS_W, worldToScreen(z.end)) - Math.max(0, worldToScreen(z.start)), 16);
    for (let wx = z.start + 30; wx < z.end; wx += 180){
      const sx = worldToScreen(wx);
      if (sx < -70 || sx > CANVAS_W + 70) continue;
      ctx.fillStyle = COLORS.swampWater;
      ctx.fillRect(sx, GROUND_Y + 2, 70, 12);
      ctx.fillStyle = COLORS.leafColor;
      ctx.beginPath(); ctx.ellipse(sx + 35, GROUND_Y + 6, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (let wx = z.start + 100; wx < z.end; wx += 220){
      const sx = worldToScreen(wx);
      if (sx < -10 || sx > CANVAS_W + 10) continue;
      ctx.strokeStyle = COLORS.cattailStem;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, GROUND_Y); ctx.lineTo(sx, GROUND_Y - 34); ctx.stroke();
      ctx.fillStyle = COLORS.cattailHead;
      ctx.beginPath(); ctx.ellipse(sx, GROUND_Y - 38, 3, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#D8D8D8";
    for (let wx = z.start; wx < z.end; wx += 100){
      const sx = worldToScreen(wx);
      if (sx < -60 || sx > CANVAS_W + 60) continue;
      ctx.beginPath(); ctx.ellipse(sx, GROUND_Y - 6, 60, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawJungleZone(z){
    ctx.fillStyle = COLORS.jungleGround;
    ctx.fillRect(Math.max(0, worldToScreen(z.start)), GROUND_Y - 8, Math.min(CANVAS_W, worldToScreen(z.end)) - Math.max(0, worldToScreen(z.start)), 8);
    ctx.fillStyle = COLORS.jungleGround;
    for (let wx = z.start; wx < z.end; wx += 14){
      const sx = worldToScreen(wx);
      if (sx < -14 || sx > CANVAS_W + 14) continue;
      ctx.beginPath(); ctx.moveTo(sx, GROUND_Y - 8); ctx.lineTo(sx + 7, GROUND_Y - 16); ctx.lineTo(sx + 14, GROUND_Y - 8); ctx.closePath(); ctx.fill();
    }
    for (let wx = z.start + 20; wx < z.end; wx += 150){
      const sx = worldToScreen(wx);
      if (sx < -10 || sx > CANVAS_W + 10) continue;
      ctx.strokeStyle = COLORS.vineColor;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, 60 + (wx % 3) * 20); ctx.stroke();
      ctx.fillStyle = COLORS.leafColor;
      [[-6,0],[6,0],[0,-8],[0,8]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.arc(sx + dx, 40 + dy, 7, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.fillStyle = COLORS.silhouetteColor;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 0); ctx.lineTo(0, 80); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(CANVAS_W, 0); ctx.lineTo(CANVAS_W - 60, 0); ctx.lineTo(CANVAS_W, 80); ctx.closePath(); ctx.fill();
  }

  function drawTreehousesZone(z){
    for (let wx = z.start + 10; wx < z.end; wx += 130){
      const sx = worldToScreen(wx);
      if (sx < -30 || sx > CANVAS_W + 30) continue;
      ctx.fillStyle = COLORS.trunkColor;
      ctx.fillRect(sx, 0, 24, CANVAS_H);
      ctx.fillStyle = COLORS.platformColor;
      ctx.fillRect(sx - 30, GROUND_Y - 150, 90, 12);
      ctx.strokeStyle = COLORS.trunkColor;
      ctx.lineWidth = 2;
      for (let ly = GROUND_Y - 150; ly < GROUND_Y; ly += 18){
        ctx.beginPath(); ctx.moveTo(sx - 6, ly); ctx.lineTo(sx + 6, ly); ctx.stroke();
      }
    }
    ctx.fillStyle = COLORS.cloudColor;
    for (let wx = z.start; wx < z.end; wx += 220){
      const sx = worldToScreen(wx);
      if (sx < -50 || sx > CANVAS_W + 50) continue;
      [[0,0,14],[16,4,11],[-14,5,10]].forEach(([dx,dy,r]) => {
        ctx.beginPath(); ctx.arc(sx + dx, 40 + dy, r, 0, Math.PI * 2); ctx.fill();
      });
    }
  }

  function drawHomebaseHouses(){
    HOMEBASE_HOUSES.forEach(h => {
      const x = worldToScreen(h.x);
      if (x < -60 || x > CANVAS_W + 60) return;
      const level = player.houseLevels[h.id] || 0;
      const baseW = 50, baseH = 40;
      const w = baseW + Math.min(level, 5) * 4; // grows slightly with level, then caps
      const houseY = GROUND_Y - baseH;

      if (level === 0){
        ctx.fillStyle = COLORS.houseDecrepit;
        ctx.fillRect(x, houseY, baseW, baseH);
        ctx.strokeStyle = COLORS.houseDecrepitDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 4, houseY + 6);
        ctx.lineTo(x + baseW + 2, houseY - 6); // a broken, tilted roofline
        ctx.stroke();
      }else{
        ctx.fillStyle = COLORS.houseWall;
        ctx.fillRect(x, houseY + 10, w, baseH - 10);
        ctx.fillStyle = COLORS.houseRoof;
        ctx.beginPath();
        ctx.moveTo(x - 4, houseY + 10);
        ctx.lineTo(x + w / 2, houseY - 12);
        ctx.lineTo(x + w + 4, houseY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = COLORS.houseDoor;
        ctx.fillRect(x + w / 2 - 6, houseY + 20, 12, 20);

        ctx.fillStyle = COLORS.hud;
        ctx.font = "700 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("Lv" + level, x + w / 2, houseY - 16);
      }
    });
  }

  function drawHomebaseShrine(){
    const x = worldToScreen(HOMEBASE_SHRINE_X);
    if (x < -40 || x > CANVAS_W + 40) return;
    const level = player.shrineLevel;

    if (level === 0){
      ctx.fillStyle = COLORS.shrineDecrepit;
      ctx.beginPath();
      ctx.moveTo(x - 14, GROUND_Y);
      ctx.lineTo(x - 6, GROUND_Y - 18);
      ctx.lineTo(x + 8, GROUND_Y - 10);
      ctx.lineTo(x + 16, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = COLORS.shrineDecrepitDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, GROUND_Y - 6);
      ctx.lineTo(x + 4, GROUND_Y - 14);
      ctx.stroke();
    }else{
      const h = 30 + Math.min(level, 5) * 4; // grows slightly with level, then caps
      ctx.fillStyle = COLORS.shrineStone;
      ctx.fillRect(x - 6, GROUND_Y - h, 12, h);
      ctx.fillStyle = COLORS.shrineStoneDark;
      ctx.fillRect(x - 10, GROUND_Y - 6, 20, 6); // base
      // pulsing mana glow on top, matching the mana bar's color
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
      ctx.fillStyle = COLORS.mana;
      ctx.globalAlpha = 0.6 + 0.3 * pulse;
      ctx.beginPath();
      ctx.arc(x, GROUND_Y - h - 4, 6 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = COLORS.hud;
      ctx.font = "700 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Lv" + level, x, GROUND_Y - h - 16);
    }
  }

  function drawHomebaseTownHall(){
    const x = worldToScreen(HOMEBASE_TOWNHALL_X);
    if (x < -60 || x > CANVAS_W + 60) return;
    const w = 44, h = 60;
    const y = GROUND_Y - h;
    ctx.fillStyle = COLORS.townHallWall;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.townHallRoof;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + w / 2, y - 20);
    ctx.lineTo(x + w + 6, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.townHallRoof;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - 20);
    ctx.lineTo(x + w / 2, y - 34);
    ctx.stroke();
    ctx.fillStyle = COLORS.hud;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - 34);
    ctx.lineTo(x + w / 2 + 14, y - 28);
    ctx.lineTo(x + w / 2, y - 22);
    ctx.closePath();
    ctx.fill();
  }

  function drawHomebaseCastle(){
    const x = worldToScreen(HOMEBASE_CASTLE_X);
    if (x < -100 || x > CANVAS_W + 100) return;
    const w = 120, h = 130;
    const y = GROUND_Y - h;
    const rebuilt = player.castleRebuilt;

    ctx.fillStyle = rebuilt ? COLORS.castleRebuilt : COLORS.castleDecrepit;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = rebuilt ? COLORS.castleRebuiltDark : COLORS.castleDecrepitDark;
    for (let cx = 0; cx < w; cx += 24){
      ctx.fillRect(x + cx, y - 12, 14, 12);
    }

    if (rebuilt){
      ctx.strokeStyle = COLORS.castleRebuiltDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y - 12);
      ctx.lineTo(x + w / 2, y - 40);
      ctx.stroke();
      ctx.fillStyle = COLORS.mana;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y - 40);
      ctx.lineTo(x + w / 2 + 16, y - 33);
      ctx.lineTo(x + w / 2, y - 26);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawLand2Cave(){
    // a simple rocky arch marking the mouth of the cave — the inner cave
    // itself is just the black sky band already handled by drawBackground
    const archX = worldToScreen(LAND2_GRASS_END);
    if (archX < -100 || archX > CANVAS_W + 100) return;

    ctx.fillStyle = COLORS.wallStoneDark;
    ctx.beginPath();
    ctx.moveTo(archX - 10, GROUND_Y);
    ctx.lineTo(archX - 10, GROUND_Y - 140);
    ctx.quadraticCurveTo(archX + 40, GROUND_Y - 190, archX + 90, GROUND_Y - 140);
    ctx.lineTo(archX + 90, GROUND_Y);
    ctx.lineTo(archX + 70, GROUND_Y);
    ctx.lineTo(archX + 70, GROUND_Y - 130);
    ctx.quadraticCurveTo(archX + 40, GROUND_Y - 165, archX + 10, GROUND_Y - 130);
    ctx.lineTo(archX + 10, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  function drawLand1Tower(){
    const x = worldToScreen(LAND1_TOWER_X - LADDER_HALF_WIDTH - 10);
    const w = (LADDER_HALF_WIDTH + 10) * 2;
    const topY = LAND1_ALTAR_Y - 20;
    if (x + w < -40 || x > CANVAS_W + 40) return;

    ctx.fillStyle = COLORS.wallStone;
    ctx.fillRect(x, topY, w, GROUND_Y - topY);
    ctx.fillStyle = COLORS.wallStoneDark;
    ctx.fillRect(x, topY, w, 10);

    // ladder rungs
    ctx.strokeStyle = COLORS.boatMast;
    ctx.lineWidth = 3;
    const ladderX = worldToScreen(LAND1_TOWER_X);
    for (let ly = topY + 20; ly < GROUND_Y; ly += 22){
      ctx.beginPath();
      ctx.moveTo(ladderX - 10, ly);
      ctx.lineTo(ladderX + 10, ly);
      ctx.stroke();
    }

    // a chest icon at the top hints at the loot, even before it's collected
    if (!player.land1ChestCollected){
      const chestX = ladderX - 10;
      const chestY = topY - 22;
      ctx.fillStyle = COLORS.chest;
      ctx.fillRect(chestX, chestY, 20, 16);
      ctx.fillStyle = COLORS.chestLid;
      ctx.fillRect(chestX, chestY, 20, 5);
    }
  }

  function drawWater(){
    const left = worldToScreen(FAIR_END);
    const right = worldToScreen(WATER_END);
    if (right < 0 || left > CANVAS_W) return;

    const visLeft = Math.max(0, left);
    const visRight = Math.min(CANVAS_W, right);

    ctx.fillStyle = COLORS.water;
    ctx.fillRect(visLeft, GROUND_Y, visRight - visLeft, CANVAS_H - GROUND_Y);
    ctx.fillStyle = COLORS.waterDeep;
    ctx.fillRect(visLeft, GROUND_Y + 20, visRight - visLeft, CANVAS_H - GROUND_Y - 20);

    // a simple ripple line along the surface instead of the plain ground line
    ctx.strokeStyle = COLORS.waterLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let wx = FAIR_END; wx <= WATER_END; wx += 20){
      const sx = worldToScreen(wx);
      if (sx < -20 || sx > CANVAS_W + 20) continue;
      const ripple = Math.sin(wx / 40 + frame / 20) * 2;
      if (wx === FAIR_END) ctx.moveTo(sx, GROUND_Y + ripple);
      else ctx.lineTo(sx, GROUND_Y + ripple);
    }
    ctx.stroke();
  }

  function drawBoat(){
    const x = worldToScreen(BOAT_X);
    if (x + BOAT_W < -40 || x > CANVAS_W + 40) return;

    const deckY = GROUND_Y - 30;

    // hull
    ctx.fillStyle = COLORS.boatHull;
    ctx.beginPath();
    ctx.moveTo(x, deckY);
    ctx.lineTo(x + BOAT_W, deckY);
    ctx.lineTo(x + BOAT_W - 20, GROUND_Y + 14);
    ctx.lineTo(x + 20, GROUND_Y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.boatHullDark;
    ctx.fillRect(x, deckY, BOAT_W, 8);

    // mast + sail
    const mastX = worldToScreen(CROWSNEST_X);
    ctx.strokeStyle = COLORS.boatMast;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(mastX, deckY);
    ctx.lineTo(mastX, MAP_Y - 20);
    ctx.stroke();

    ctx.fillStyle = COLORS.boatSail;
    ctx.beginPath();
    ctx.moveTo(mastX, deckY - 10);
    ctx.lineTo(mastX, MAP_Y + 10);
    ctx.lineTo(mastX - 40, deckY - 20);
    ctx.closePath();
    ctx.fill();

    // crow's nest platform + climb rungs
    ctx.fillStyle = COLORS.crowsNest;
    ctx.fillRect(mastX - CROWSNEST_HALF_WIDTH, MAP_Y - 20, CROWSNEST_HALF_WIDTH * 2, 12);
    ctx.strokeStyle = COLORS.boatMast;
    ctx.lineWidth = 3;
    for (let y = MAP_Y; y < GROUND_Y; y += 22){
      ctx.beginPath();
      ctx.moveTo(mastX - 6, y);
      ctx.lineTo(mastX + 6, y);
      ctx.stroke();
    }

    // steering wheel (the boat's altar)
    const wheelX = worldToScreen(BOAT_ALTAR_X + 18);
    const wheelY = deckY - 18;
    ctx.strokeStyle = COLORS.wheel;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = COLORS.wheelSpoke;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++){
      const angle = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(wheelX, wheelY);
      ctx.lineTo(wheelX + Math.cos(angle) * 16, wheelY + Math.sin(angle) * 16);
      ctx.stroke();
    }
  }

  function drawTower(){
    const x = worldToScreen(TOWER_X - LADDER_HALF_WIDTH - 10);
    const w = (LADDER_HALF_WIDTH + 10) * 2;
    const topY = ALTAR_Y - 20;
    ctx.fillStyle = COLORS.tower;
    ctx.fillRect(x, topY, w, GROUND_Y - topY);
    ctx.fillStyle = COLORS.towerDark;
    ctx.fillRect(x, topY, w, 14);

    ctx.strokeStyle = COLORS.ladder;
    ctx.lineWidth = 3;
    for (let y = topY + 20; y < GROUND_Y; y += 22){
      ctx.beginPath();
      ctx.moveTo(worldToScreen(TOWER_X - LADDER_HALF_WIDTH + 4), y);
      ctx.lineTo(worldToScreen(TOWER_X + LADDER_HALF_WIDTH - 4), y);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.altarGlow;
    ctx.beginPath();
    ctx.arc(worldToScreen(TOWER_X), topY - 10, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawChest(){
    getChests().forEach(chest => {
      const x = worldToScreen(chest.x);
      if (x < -50 || x > CANVAS_W + 50) return;
      ctx.fillStyle = COLORS.chest;
      ctx.fillRect(x, GROUND_Y - chest.h, chest.w, chest.h);
      ctx.fillStyle = COLORS.chestLid;
      ctx.fillRect(x, GROUND_Y - chest.h, chest.w, 8);
    });
  }

  function drawTrees(){
    getTrees().forEach(t => {
      const x = worldToScreen(t.x);
      if (x < -60 || x > CANVAS_W + 60) return;

      const trunkW = 10;
      const trunkX = x + (t.w - trunkW) / 2;
      ctx.fillStyle = COLORS.treeTrunk;
      ctx.fillRect(trunkX, GROUND_Y - 30, trunkW, 30);

      ctx.fillStyle = COLORS.treeCanopy;
      const cx = x + t.w / 2;
      ctx.beginPath();
      ctx.moveTo(cx, GROUND_Y - t.h);
      ctx.lineTo(x, GROUND_Y - 26);
      ctx.lineTo(x + t.w, GROUND_Y - 26);
      ctx.closePath();
      ctx.fill();
    });
  }

  // A real humanoid figure (head/torso/arms/legs) instead of a flat
  // rectangle, all still flat canvas primitives — no images/sprite
  // sheets, consistent with the rest of the game. Legs animate with a
  // walking gait while moving on the ground, tuck into a jump pose while
  // airborne, and alternate in a simple climbing motion on a ladder.
  // Fits inside the exact same PLAYER_W x PLAYER_H box, so hitboxes and
  // collision are completely untouched by this — purely visual.
  function drawWalterFigure(x, bodyColor){
    const cx = x + PLAYER_W / 2;
    const moving = (keysDown.has("ArrowLeft") || keysDown.has("ArrowRight")) && player.onGround && !player.onLadder;
    const airborne = !player.onGround && !player.onLadder;
    const climbing = player.onLadder;

    let legSwing = 0, armSwing = 0;
    if (moving){
      const phase = Math.sin(frame * 0.35);
      legSwing = phase * 5;
      armSwing = -phase * 3;
    }else if (climbing){
      const phase = Math.sin(frame * 0.3);
      legSwing = phase * 3;
    }

    const headR = 6;
    const headCy = player.y + headR + 1;
    const torsoTop = player.y + headR * 2 + 2;
    const torsoH = 14;
    const torsoBottom = torsoTop + torsoH;
    const torsoW = 12;
    const legW = 4;
    const legTop = torsoBottom;
    const legBottom = player.y + PLAYER_H;

    // legs first, so the torso overlaps their tops cleanly
    ctx.fillStyle = COLORS.playerLegs;
    if (airborne){
      ctx.fillRect(cx - torsoW/2 + 1, legTop, legW, legBottom - legTop - 4);
      ctx.fillRect(cx + torsoW/2 - legW - 1, legTop, legW, legBottom - legTop - 4);
    }else{
      ctx.fillRect(cx - torsoW/2 + 1 + legSwing, legTop, legW, legBottom - legTop);
      ctx.fillRect(cx + torsoW/2 - legW - 1 - legSwing, legTop, legW, legBottom - legTop);
    }

    // arms, behind the torso
    ctx.fillStyle = bodyColor;
    const armW = 3, armH = 12;
    ctx.fillRect(cx - torsoW/2 - armW + 1 + armSwing, torsoTop + 1, armW, armH);
    ctx.fillRect(cx + torsoW/2 - 1 - armSwing, torsoTop + 1, armW, armH);

    // torso
    ctx.fillRect(cx - torsoW/2, torsoTop, torsoW, torsoH);

    // head
    ctx.fillStyle = COLORS.playerSkin;
    ctx.beginPath();
    ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer(){
    const x = worldToScreen(player.x);
    if (player.invulnFrames > 0 && Math.floor(frame / 4) % 2 === 0) return;
    const bodyColor = player.armorType === "leather" ? COLORS.playerLeather
      : player.armorType === "steel" ? COLORS.playerSteel
      : player.armorType === "goblin" ? COLORS.playerGoblin
      : player.armorType === "siren" ? COLORS.playerSiren
      : player.armorType === "cloak" ? COLORS.playerCloak
      : COLORS.player;

    const wasCloaked = player.cloakActiveFramesLeft > 0;
    if (wasCloaked) ctx.globalAlpha = 0.35; // visibly faded while invisible to enemies

    drawWalterFigure(x, bodyColor);

    if (isOverOpenWater(player.x) && player.y > GROUND_Y - PLAYER_H){
      ctx.fillStyle = "rgba(44,110,142,0.5)"; // sinking below the surface
      ctx.fillRect(x, player.y, PLAYER_W, PLAYER_H);
    }
    if (player.burningFrames > 0){
      ctx.fillStyle = "rgba(225,75,60,0.45)"; // on fire, same treatment as a burning enemy
      ctx.fillRect(x, player.y, PLAYER_W, PLAYER_H);
    }

    if (!activeSpell) drawSword(x);
    if (wasCloaked) ctx.globalAlpha = 1;
  }

  function drawSword(x){
    const swordDir = player.facing > 0 ? 1 : -1;
    const cx = x + PLAYER_W / 2;
    // Anchored to the humanoid figure's actual arm position now (was
    // anchored to the old full-body-width edges, which reads as
    // floating too far out once the body got real limbs).
    const handX = cx + 9 * swordDir;
    const handY = player.y + 15;

    // Quick swing: sweeps from a raised, wound-up pose down through to
    // the normal ready position over the first part of the melee
    // cooldown, then just holds there until the next swing is available.
    const SWING_DURATION = 10;
    const elapsed = MELEE_COOLDOWN - meleeCooldown;
    const t = (elapsed >= 0 && elapsed < SWING_DURATION) ? elapsed / SWING_DURATION : 1;
    const dx = (6 + (20 - 6) * t) * swordDir;
    const dy = -20 + (-16 - -20) * t; // -20 (raised) eases down to -16 (ready)

    const tipX = handX + dx, tipY = handY + dy;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const ux = dx / len, uy = dy / len;       // unit vector along the blade
    const nx = -uy, ny = ux;                  // perpendicular (blade width direction)

    const handleLen = 6;
    const guardX = handX + ux * handleLen, guardY = handY + uy * handleLen;
    const bladeWidth = 3;

    // handle (short brown segment from the hand out to the guard)
    ctx.strokeStyle = COLORS.swordHilt;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(guardX, guardY);
    ctx.stroke();

    // crossguard (short brown line perpendicular to the blade, at the base)
    ctx.beginPath();
    ctx.moveTo(guardX + nx * 5, guardY + ny * 5);
    ctx.lineTo(guardX - nx * 5, guardY - ny * 5);
    ctx.stroke();

    // blade — a tapered shape from the guard to a pointed tip
    ctx.fillStyle = COLORS.playerSword;
    ctx.beginPath();
    ctx.moveTo(guardX + nx * bladeWidth, guardY + ny * bladeWidth);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(guardX - nx * bladeWidth, guardY - ny * bladeWidth);
    ctx.closePath();
    ctx.fill();
  }

  function drawEnemy(en){
    if (en.hp <= 0) return;
    const x = worldToScreen(en.x);
    if (x < -40 || x > CANVAS_W + 40) return;

    if (en.type === "knight"){
      ctx.fillStyle = COLORS.knight;
      ctx.fillRect(x, en.y, en.w, en.h);
      ctx.fillStyle = COLORS.knightTrim;
      ctx.fillRect(x, en.y + 6, en.w, 6);
    }else if (en.type === "archer"){
      ctx.fillStyle = COLORS.archer;
      ctx.fillRect(x, en.y, en.w, en.h);
      ctx.strokeStyle = COLORS.archerBow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + en.w/2, en.y + en.h/2, 12, -Math.PI/2.2, Math.PI/2.2);
      ctx.stroke();
    }else if (en.type === "cyclops"){
      ctx.fillStyle = COLORS.cyclopsBody;
      ctx.fillRect(x, en.y, en.w, en.h);
      const eyeCx = x + en.w/2, eyeCy = en.y + en.h * 0.32;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(eyeCx, eyeCy, en.w * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.cyclopsEye;
      ctx.beginPath();
      ctx.arc(eyeCx, eyeCy, en.w * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }else if (en.type === "sandworm"){
      if (en.burrowed){
        // just a low sand mound while burrowed/untargetable
        ctx.fillStyle = COLORS.sandwormBodyDark;
        ctx.beginPath();
        ctx.ellipse(x + en.w/2, GROUND_Y - 4, en.w * 0.6, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }else{
        ctx.fillStyle = COLORS.sandwormBody;
        ctx.beginPath();
        ctx.ellipse(x + en.w/2, en.y + en.h/2, en.w/2, en.h/2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.sandwormBodyDark;
        ctx.beginPath();
        ctx.arc(x + en.w/2, en.y + en.h * 0.3, en.w * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }else if (en.type === "fey"){
      ctx.fillStyle = COLORS.feyBody;
      ctx.fillRect(x + 3, en.y, en.w - 6, en.h);
      ctx.fillStyle = COLORS.feyGlow;
      ctx.beginPath();
      ctx.arc(x + en.w/2, en.y + 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }else if (en.type === "fairy"){
      ctx.fillStyle = COLORS.fairyWing;
      ctx.beginPath();
      ctx.ellipse(x + en.w/2 - 6, en.y + en.h/2, 8, 4, 0.4, 0, Math.PI * 2);
      ctx.ellipse(x + en.w/2 + 6, en.y + en.h/2, 8, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.fairyBody;
      ctx.beginPath();
      ctx.arc(x + en.w/2, en.y + en.h/2, en.w * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }else if (en.type === "siren"){
      ctx.fillStyle = COLORS.sirenHair;
      ctx.fillRect(x, en.y, en.w, 10);
      ctx.fillStyle = COLORS.sirenBody;
      ctx.fillRect(x + 2, en.y + 8, en.w - 4, en.h - 8);
    }else if (en.type === "mermaid"){
      ctx.fillStyle = COLORS.mermaidBody;
      ctx.fillRect(x + 3, en.y, en.w - 6, en.h * 0.6);
      ctx.fillStyle = COLORS.mermaidTail;
      ctx.beginPath();
      ctx.moveTo(x + 3, en.y + en.h * 0.6);
      ctx.lineTo(x + en.w - 3, en.y + en.h * 0.6);
      ctx.lineTo(x + en.w/2, en.y + en.h);
      ctx.closePath();
      ctx.fill();
    }else if (en.type === "ogre"){
      ctx.fillStyle = COLORS.ogreBody;
      ctx.fillRect(x, en.y, en.w, en.h);
      ctx.fillStyle = COLORS.ogreBodyDark;
      ctx.fillRect(x, en.y + 8, en.w, 8);
    }else if (en.type === "snake"){
      ctx.fillStyle = COLORS.snakeBody;
      ctx.beginPath();
      ctx.ellipse(x + en.w/2, en.y + en.h/2, en.w/2, en.h/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.snakeBelly;
      ctx.fillRect(x + 4, en.y + en.h - 6, en.w - 8, 4);
    }else if (en.isBoss){
      ctx.fillStyle = COLORS.bossBody;
      ctx.fillRect(x, en.y, en.w, en.h);
      ctx.fillStyle = COLORS.bossTrim;
      ctx.fillRect(x, en.y, en.w, 10);
      ctx.fillRect(x, en.y + en.h - 10, en.w, 6);
    }else{
      const tier = WIZARD_TIERS.find(t => t.key === en.type);
      const cloakColor = (tier && tier.cloakColor) ? tier.cloakColor : COLORS.wizardCloak;
      const hatColor = (tier && tier.cloakColor) ? tier.cloakColor : COLORS.wizardHat;
      ctx.fillStyle = cloakColor;
      ctx.beginPath();
      ctx.moveTo(x + 3, en.y + en.h);
      ctx.lineTo(x, en.y + en.h * 0.4);
      ctx.lineTo(x + en.w, en.y + en.h * 0.4);
      ctx.lineTo(x + en.w - 3, en.y + en.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hatColor;
      ctx.beginPath();
      ctx.moveTo(x + en.w/2, en.y - 10);
      ctx.lineTo(x + 3, en.y + en.h * 0.4);
      ctx.lineTo(x + en.w - 3, en.y + en.h * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.wizardBeard;
      ctx.beginPath();
      ctx.arc(x + en.w/2, en.y + en.h * 0.5, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (en.frozenFrames > 0){
      ctx.fillStyle = "rgba(143,227,240,0.5)";
      ctx.fillRect(x, en.y, en.w, en.h);
    }
    if (en.burningFrames > 0){
      ctx.fillStyle = "rgba(225,75,60,0.45)";
      ctx.fillRect(x, en.y, en.w, en.h);
    }

    ctx.fillStyle = COLORS.hpBad;
    ctx.fillRect(x, en.y - 8, en.w, 3);
    ctx.fillStyle = COLORS.hpGood;
    ctx.fillRect(x, en.y - 8, en.w * Math.max(0, en.hp / en.maxHp), 3);
  }

  function drawAlly(a){
    const x = worldToScreen(a.x);
    ctx.fillStyle = COLORS.ally;
    ctx.fillRect(x, a.y, PLAYER_W - 4, PLAYER_H - 6);
  }

  function drawProjectile(p){
    const x = worldToScreen(p.x);
    if (p.type === "fireball"){
      ctx.fillStyle = COLORS.fireball;
      ctx.beginPath(); ctx.arc(x, p.y, 7, 0, Math.PI*2); ctx.fill();
    }else if (p.type === "arrow"){
      ctx.strokeStyle = COLORS.arrow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 10, p.y);
      ctx.lineTo(x + 10, p.y);
      ctx.stroke();
    }else if (p.type === "charm"){
      ctx.fillStyle = COLORS.sirenBody;
      ctx.beginPath();
      ctx.arc(x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }else{
      ctx.fillStyle = COLORS.lightning;
      ctx.beginPath();
      ctx.moveTo(x, p.y - 8);
      ctx.lineTo(x + 5, p.y - 2);
      ctx.lineTo(x + 1, p.y);
      ctx.lineTo(x + 6, p.y + 8);
      ctx.lineTo(x - 4, p.y + 1);
      ctx.lineTo(x, p.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawEffect(fx){
    const x = worldToScreen(fx.x);
    if (fx.type === "freeze-burst"){
      ctx.strokeStyle = COLORS.freeze;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, fx.y, fx.radius * (1 - fx.life/20), 0, Math.PI*2);
      ctx.stroke();
    }else if (fx.type === "fire-burst"){
      ctx.strokeStyle = COLORS.fireball;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, fx.y, fx.radius * (1 - fx.life/20), 0, Math.PI*2);
      ctx.stroke();
    }else if (fx.type === "lightning-chain"){
      ctx.strokeStyle = COLORS.lightning;
      ctx.lineWidth = 4;
      ctx.beginPath();
      fx.points.forEach((p, i) => {
        const sx = worldToScreen(p.x);
        if (i === 0) ctx.moveTo(sx, p.y);
        else ctx.lineTo(sx, p.y);
      });
      ctx.stroke();
    }else if (fx.type === "cyclops-beam"){
      const sx1 = worldToScreen(fx.x1), sx2 = worldToScreen(fx.x2);
      ctx.strokeStyle = COLORS.cyclopsEye;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx1, fx.y1);
      ctx.lineTo(sx2, fx.y2);
      ctx.stroke();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx1, fx.y1);
      ctx.lineTo(sx2, fx.y2);
      ctx.stroke();
    }else if (fx.type === "black-hole"){
      ctx.fillStyle = COLORS.blackHole;
      ctx.beginPath();
      ctx.arc(x, fx.y, fx.radius * 0.5, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = COLORS.blackHole;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, fx.y, fx.radius, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  function drawHud(){
    ctx.fillStyle = COLORS.hpBad;
    ctx.fillRect(12, 12, 120, 12);
    ctx.fillStyle = COLORS.hpGood;
    ctx.fillRect(12, 12, 120 * Math.max(0, player.hp / PLAYER_MAX_HP), 12);
    ctx.strokeStyle = COLORS.hud;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 12, 120, 12);

    if (player.armorType && player.armorMaxHp > 0){
      ctx.fillStyle = COLORS.armorBg;
      ctx.fillRect(12, 27, 120, 7);
      ctx.fillStyle = COLORS.armor;
      ctx.fillRect(12, 27, 120 * Math.max(0, player.armorHp / player.armorMaxHp), 7);
      ctx.strokeStyle = COLORS.hud;
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 27, 120, 7);
      if (player.armorBroken){
        ctx.fillStyle = COLORS.hpBad;
        ctx.font = "700 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText("broken — repair for " + ARMOR_REPAIR_COST + " silver", 138, 34);
      }
    }

    ctx.fillStyle = COLORS.manaBg;
    ctx.fillRect(12, 38, 120, 7);
    ctx.fillStyle = COLORS.mana;
    ctx.fillRect(12, 38, 120 * Math.max(0, player.mana / player.maxMana), 7);
    ctx.strokeStyle = COLORS.hud;
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 38, 120, 7);

    ctx.fillStyle = COLORS.hud;
    ctx.font = "700 13px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("Crystals: " + player.carriedCrystals + " carried / " + player.bankedCrystals + " banked", 12, 64);
    ctx.fillStyle = COLORS.silver;
    ctx.fillText("Silver: " + Math.floor(player.silver), 12, 80);

    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.hud;
    ctx.fillText(activeSpell ? SPELLS[activeSpell].label.toUpperCase() : "SWORD", CANVAS_W - 12, 24);

    if (player.mysticArmorFramesLeft > 0){
      ctx.fillStyle = COLORS.mana;
      ctx.fillText("MYSTIC ARMOR " + Math.ceil(player.mysticArmorFramesLeft / 60) + "s", CANVAS_W - 12, 40);
    }
    if (player.armorType === "cloak"){
      if (player.cloakActiveFramesLeft > 0){
        ctx.fillStyle = COLORS.playerCloak;
        ctx.fillText("CLOAKED " + Math.ceil(player.cloakActiveFramesLeft / 60) + "s", CANVAS_W - 12, 40);
      }else if (player.cloakCooldownFramesLeft > 0){
        ctx.fillStyle = COLORS.hud;
        ctx.fillText("cloak recharging " + Math.ceil(player.cloakCooldownFramesLeft / 60) + "s", CANVAS_W - 12, 40);
      }else{
        ctx.fillStyle = COLORS.hud;
        ctx.fillText("[C] cloak ready", CANVAS_W - 12, 40);
      }
    }
    if (player.burningFrames > 0){
      ctx.fillStyle = COLORS.fireball;
      ctx.fillText("ON FIRE " + Math.ceil(player.burningFrames / 60) + "s", CANVAS_W - 12, 56);
    }
  }

  function drawRespawnMessage(){
    if (respawnMessageTimer <= 0) return;
    ctx.fillStyle = "rgba(20,24,31,0.8)";
    ctx.fillRect(CANVAS_W/2 - 160, 50, 320, 30);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 13px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(respawnMessageText, CANVAS_W/2, 70);
  }

  /* ---------------- loop / lifecycle ---------------- */
  function loop(){
    if (!running) return;
    if (!altarOpen && !mapOpen && !rareAltarOpen && !townHallOpen && !castleUiOpen) update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function startGame(){
    resetState();
    applyLoadedProgress();
    started = true;
    hideOverlay();
    canvas.focus();
    loop();
  }

  function hideOverlay(){ overlay.style.display = "none"; }

  function progressSummaryHTML(){
    if (walterGuestMode) return `<p style="font-size:0.8rem;opacity:0.8;">Playing as guest — progress won't be saved.</p>`;
    if (!loadedProgress) return "";
    const spellCount = loadedProgress.spells.size;
    const hasAnything = spellCount > 0 || loadedProgress.silver > 0 || loadedProgress.crystals > 0 || loadedProgress.armor !== "none";
    if (!hasAnything) return `<p style="font-size:0.8rem;opacity:0.8;">New save — starting fresh.</p>`;
    const armorLabel = loadedProgress.armor !== "none" ? ARMOR[loadedProgress.armor].label : "no armor";
    return `<p style="font-size:0.8rem;opacity:0.8;">Welcome back — loaded ${spellCount} spell${spellCount === 1 ? "" : "s"}, ${loadedProgress.silver} silver, ${loadedProgress.crystals} banked crystals, ${armorLabel}.</p>`;
  }

  function showStartOverlay(){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Walter vs Wizards</h3>
      <p>Arrow keys to move, Up to jump or climb the tower ladder, Space to swing your sword (or cast your active spell). Number keys switch spells once you've unlocked them at the altar.</p>
      ${progressSummaryHTML()}
      <button type="button" class="btn" id="wvw-play-btn">Play</button>
    `;
    document.getElementById("wvw-play-btn").addEventListener("click", startGame);
  }

  function showLoginOverlay(){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Walter vs Wizards</h3>
      <p>Log in with a name and password to save your spells, armor, silver, and crystals. First time using a name creates a fresh save automatically — just remember the password.</p>
      <div class="form-row"><input type="text" id="wvw-login-name" placeholder="Name" maxlength="40"></div>
      <div class="form-row"><input type="password" id="wvw-login-password" placeholder="Password" maxlength="40"></div>
      <button type="button" class="btn" id="wvw-login-btn">Log In &amp; Play</button>
      <p class="form-note" id="wvw-login-status"></p>
      <p class="form-note" style="margin-top:6px;"><a href="#" id="wvw-guest-link" style="color:inherit;text-decoration:underline;">Play without saving</a></p>
    `;

    if (typeof getStoredName === "function"){
      const stored = getStoredName();
      if (stored) document.getElementById("wvw-login-name").value = stored;
    }

    document.getElementById("wvw-login-btn").addEventListener("click", attemptLogin);
    document.getElementById("wvw-guest-link").addEventListener("click", (e) => {
      e.preventDefault();
      walterGuestMode = true;
      walterName = null;
      walterPassword = null;
      loadedProgress = null;
      loginComplete = true;
      showStartOverlay();
    });
  }

  async function attemptLogin(){
    const nameInput = document.getElementById("wvw-login-name");
    const passwordInput = document.getElementById("wvw-login-password");
    const statusEl = document.getElementById("wvw-login-status");
    const name = nameInput.value.trim();
    const password = passwordInput.value;

    if (!name || !password){
      statusEl.textContent = "Enter both a name and a password.";
      statusEl.style.color = "var(--red)";
      return;
    }

    if (!isConfigured()){
      statusEl.textContent = "Not connected to a Google Sheet yet — see config.js. Playing without saving.";
      statusEl.style.color = "var(--red)";
      walterGuestMode = true;
      walterName = null;
      walterPassword = null;
      loadedProgress = null;
      loginComplete = true;
      setTimeout(showStartOverlay, 1200);
      return;
    }

    const btn = document.getElementById("wvw-login-btn");
    btn.disabled = true;
    statusEl.textContent = "Logging in…";
    statusEl.style.color = "var(--muted)";

    try{
      const res = await apiPost({ action: "walterLogin", name, password });
      if (!res.success){
        statusEl.textContent = res.error || "Couldn't log in — try again.";
        statusEl.style.color = "var(--red)";
        btn.disabled = false;
        return;
      }
      walterGuestMode = false;
      walterName = name;
      walterPassword = password;
      if (typeof setStoredName === "function") setStoredName(name);
      loadedProgress = decodeProgress(res.progress);
      loginComplete = true;
      showStartOverlay();
    }catch(err){
      console.error("[WvW] login failed", err);
      statusEl.textContent = "Couldn't reach the server — check your connection and try again.";
      statusEl.style.color = "var(--red)";
      btn.disabled = false;
    }
  }

  /* ---------------- altar shop ---------------- */
  function openAltar(){
    altarOpen = true;
    renderAltar();
    overlay.style.display = "flex";
  }
  function closeAltar(){
    altarOpen = false;
    hideOverlay();
    canvas.focus();
    // NOTE: no loop() call here — the original requestAnimationFrame chain
    // never stopped (it only skipped update() while altarOpen was true), so
    // calling loop() again would spawn a second, parallel chain and the game
    // would run 2x speed after every altar visit (3x after two visits, etc).
  }

  function openMap(){
    mapOpen = true;
    renderMap();
    overlay.style.display = "flex";
  }
  function closeMap(){
    mapOpen = false;
    hideOverlay();
    canvas.focus();
    // Same reasoning as closeAltar() — the requestAnimationFrame chain never
    // stopped, it just skipped update() while mapOpen was true.
  }

  function openLand1Tower(){
    if (!player.land1ChestCollected){
      const silverReward = 200 + Math.floor(Math.random() * 101); // 200-300
      player.silver += silverReward;
      player.land1ChestCollected = true;
      respawnMessageText = "Found a chest of " + silverReward + " silver!";
      respawnMessageTimer = 180;
      if (DEBUG) console.log("[WvW] land1 tower chest: +" + silverReward + " silver");
      saveProgress();
    }
    openRareAltar();
  }

  function openRareAltar(){
    rareAltarOpen = true;
    renderRareAltar();
    overlay.style.display = "flex";
  }
  function closeRareAltar(){
    rareAltarOpen = false;
    hideOverlay();
    canvas.focus();
    // Same reasoning as closeAltar() — no loop() call, the rAF chain never stopped.
  }

  function openTownHall(){
    townHallOpen = true;
    renderTownHall();
    overlay.style.display = "flex";
  }
  function closeTownHall(){
    townHallOpen = false;
    hideOverlay();
    canvas.focus();
  }

  function renderTownHall(){
    const totalIncome = totalPassiveIncomePerMinute();
    const houseRows = HOMEBASE_HOUSES.map(h => {
      const level = player.houseLevels[h.id] || 0;
      const cost = houseUpgradeCost(level);
      const affordable = player.silver >= cost;
      const rent = houseRentPerMinute(level);
      const label = level === 0 ? "Decrepit House" : "House (Level " + level + ")";
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>Village ${h.village} — ${label}${level > 0 ? " — " + rent.toFixed(0) + "/min" : ""}</span>
          <button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-house="${h.id}" ${affordable ? "" : "disabled"}>${level === 0 ? "Remodel" : "Upgrade"} (${cost} silver)</button>
        </div>
      `;
    }).join("");

    const shrineCost = houseUpgradeCost(player.shrineLevel);
    const shrineAffordable = player.silver >= shrineCost;
    const shrineLabel = player.shrineLevel === 0 ? "Decrepit Shrine" : "Shrine (Level " + player.shrineLevel + ")";
    const shrineBonusPct = Math.round(player.shrineLevel * SHRINE_MANA_BONUS_PER_LEVEL * 100);
    const shrineRow = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
        <span>${shrineLabel}${player.shrineLevel > 0 ? " — +" + shrineBonusPct + "% mana regen" : ""}</span>
        <button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" id="wvw-shrine-btn" ${shrineAffordable ? "" : "disabled"}>${player.shrineLevel === 0 ? "Remodel" : "Upgrade"} (${shrineCost} silver)</button>
      </div>
    `;

    overlayInner.innerHTML = `
      <h3>Town Hall</h3>
      <p>Total passive income: ${totalIncome.toFixed(0)} silver/minute — ticks while the game is open, no matter where you're exploring.</p>
      <div style="text-align:left;">${houseRows}${shrineRow}</div>
      <button type="button" class="btn light" id="wvw-townhall-close" style="margin-top:14px;">Close</button>
    `;

    overlayInner.querySelectorAll("button[data-house]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (upgradeHouse(btn.dataset.house)){
          renderTownHall();
          saveProgress();
        }
      });
    });
    const shrineBtn = document.getElementById("wvw-shrine-btn");
    if (shrineBtn){
      shrineBtn.addEventListener("click", () => {
        if (upgradeShrine()){
          renderTownHall();
          saveProgress();
        }
      });
    }
    document.getElementById("wvw-townhall-close").addEventListener("click", closeTownHall);
  }

  function openCastleUi(){
    castleUiOpen = true;
    renderCastleUi();
    overlay.style.display = "flex";
  }
  function closeCastleUi(){
    castleUiOpen = false;
    hideOverlay();
    canvas.focus();
  }

  function renderCastleUi(){
    const affordable = player.silver >= CASTLE_REBUILD_COST;
    const body = player.castleRebuilt
      ? `<p>The Castle stands rebuilt, restored to its former glory.</p>`
      : `
        <p>A decrepit ruin. Rebuilding it costs a flat ${CASTLE_REBUILD_COST} silver.</p>
        <button type="button" class="btn" id="wvw-castle-rebuild-btn" ${affordable ? "" : "disabled"}>Rebuild the Castle (${CASTLE_REBUILD_COST} silver)</button>
      `;
    overlayInner.innerHTML = `
      <h3>The Castle</h3>
      ${body}
      <button type="button" class="btn light" id="wvw-castle-close" style="margin-top:14px;">Close</button>
    `;
    const rebuildBtn = document.getElementById("wvw-castle-rebuild-btn");
    if (rebuildBtn){
      rebuildBtn.addEventListener("click", () => {
        if (rebuildCastle()){
          renderCastleUi();
          saveProgress();
        }
      });
    }
    document.getElementById("wvw-castle-close").addEventListener("click", closeCastleUi);
  }

  function renderRareAltar(){
    const key = "mysticArmor"; // the only rare spell actually placed anywhere yet
    const cfg = RARE_SPELLS[key];
    const owned = spellUnlocked.has(key);
    const affordable = totalCrystals() >= cfg.cost;

    overlayInner.innerHTML = `
      <h3>Castle Tower</h3>
      <p>A rare spell, guarded at the top of this tower.</p>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
        <span>${cfg.label}${owned ? " ✓" : ""}</span>
        ${owned
          ? `<span style="opacity:0.7;font-size:0.8rem;">Owned</span>`
          : `<button type="button" class="btn light" id="wvw-rare-buy-btn" ${affordable ? "" : "disabled"}>Buy (${cfg.cost} crystals)</button>`
        }
      </div>
      <button type="button" class="btn light" id="wvw-rare-close" style="margin-top:14px;">Close</button>
    `;

    const buyBtn = document.getElementById("wvw-rare-buy-btn");
    if (buyBtn){
      buyBtn.addEventListener("click", () => {
        if (totalCrystals() >= cfg.cost && !spellUnlocked.has(key)){
          spendCrystals(cfg.cost);
          spellUnlocked.add(key);
          if (DEBUG) console.log("[WvW] unlocked rare spell " + key);
          renderRareAltar();
          saveProgress();
        }
      });
    }
    document.getElementById("wvw-rare-close").addEventListener("click", closeRareAltar);
  }

  function renderMap(){
    const onAnyLand = currentMap === "land1" || currentMap === "land2" || currentMap === "homebase" || currentMap === "generated";

    let actionHTML;
    if (onAnyLand){
      actionHTML = `<button type="button" class="btn" id="wvw-sail-home-btn">Set Sail</button>`;
    }else if (!player.crewHired){
      const affordable = player.silver >= HIRE_CREW_COST;
      actionHTML = `
        <p style="font-size:0.85rem;opacity:0.85;">A crew costs ${HIRE_CREW_COST} silver, and unlocks setting sail for new lands.</p>
        <button type="button" class="btn" id="wvw-hire-crew-btn" ${affordable ? "" : "disabled"}>Hire a Crew (${HIRE_CREW_COST} silver)</button>
      `;
    }else{
      const nextLand = player.highestUnlockedLand + 1;
      const revisitOptions = [];
      for (let n = 3; n <= player.highestUnlockedLand; n++) revisitOptions.push(n);
      actionHTML = `
        <button type="button" class="btn" id="wvw-sail-land1-btn">Grasslands</button>
        <button type="button" class="btn" id="wvw-sail-land2-btn" style="margin-left:8px;">Home of the Cyclops</button>
        <div style="margin-top:10px;">
          <button type="button" class="btn" id="wvw-sail-generated-btn" data-land="${nextLand}">Explore New Lands</button>
          ${revisitOptions.length ? `
            <select id="wvw-revisit-select" style="margin-left:8px;">
              ${revisitOptions.map(n => `<option value="${n}">Revisit Land ${n}</option>`).join("")}
            </select>
            <button type="button" class="btn light" id="wvw-sail-revisit-btn" style="padding:6px 12px;font-size:0.8rem;">Go</button>
          ` : ""}
        </div>
        <div style="margin-top:10px;">
          <button type="button" class="btn" id="wvw-sail-homebase-btn">Home Village</button>
        </div>
      `;
    }

    overlayInner.innerHTML = `
      <h3>Captain's Map</h3>
      <p>Four continents, charted so far. ${player.crewHired ? "Your crew can set sail whenever you're ready." : "Hiring a crew is the first step toward reaching them."}</p>
      <svg viewBox="0 0 300 200" width="100%" height="auto" style="background:#1B4F72;border-radius:8px;">
        <ellipse cx="70"  cy="55"  rx="42" ry="28" fill="#2D6A4F" />
        <ellipse cx="220" cy="50"  rx="36" ry="24" fill="#2D6A4F" />
        <ellipse cx="60"  cy="145" rx="38" ry="26" fill="#2D6A4F" />
        <ellipse cx="225" cy="150" rx="44" ry="30" fill="#2D6A4F" />
        <circle cx="150" cy="100" r="4" fill="#F6C945" />
      </svg>
      <div style="margin-top:14px;">${actionHTML}</div>
      <p class="form-note" id="wvw-map-status"></p>
      <button type="button" class="btn light" id="wvw-map-close" style="margin-top:10px;">Close</button>
    `;

    const hireBtn = document.getElementById("wvw-hire-crew-btn");
    if (hireBtn) hireBtn.addEventListener("click", () => {
      if (buyHireCrew()){ renderMap(); saveProgress(); }
    });

    const sailLand1Btn = document.getElementById("wvw-sail-land1-btn");
    if (sailLand1Btn) sailLand1Btn.addEventListener("click", () => {
      sailToLand1();
      closeMap();
    });

    const sailLand2Btn = document.getElementById("wvw-sail-land2-btn");
    if (sailLand2Btn) sailLand2Btn.addEventListener("click", () => {
      sailToLand2();
      closeMap();
    });

    const sailHomebaseBtn = document.getElementById("wvw-sail-homebase-btn");
    if (sailHomebaseBtn) sailHomebaseBtn.addEventListener("click", () => {
      sailToHomebase();
      closeMap();
    });

    const sailGeneratedBtn = document.getElementById("wvw-sail-generated-btn");
    if (sailGeneratedBtn) sailGeneratedBtn.addEventListener("click", () => {
      sailToGeneratedLand(Number(sailGeneratedBtn.dataset.land));
      closeMap();
    });

    const sailRevisitBtn = document.getElementById("wvw-sail-revisit-btn");
    if (sailRevisitBtn) sailRevisitBtn.addEventListener("click", () => {
      const sel = document.getElementById("wvw-revisit-select");
      sailToGeneratedLand(Number(sel.value));
      closeMap();
    });

    const sailHomeBtn = document.getElementById("wvw-sail-home-btn");
    if (sailHomeBtn) sailHomeBtn.addEventListener("click", () => {
      sailHome();
      closeMap();
    });

    document.getElementById("wvw-map-close").addEventListener("click", closeMap);
  }

  function renderAmuletSection(){
    if (player.amuletsOwned.size === 0) return "";

    const amuletKey = player.equippedAmulet;
    const amulet = AMULETS[amuletKey];
    const slots = player.amuletSlots[amuletKey] || new Array(9).fill(null);
    const buffActive = isAmuletBuffActive(amulet.buffSpell);
    const buffSpellLabel = SPELLS[amulet.buffSpell] ? SPELLS[amulet.buffSpell].label : amulet.buffSpell;

    const allSpellKeys = SPELL_ORDER.concat(RARE_SPELL_ORDER);
    const assignedElsewhere = new Set(slots.filter(Boolean));

    const slotRows = slots.map((assigned, i) => {
      const choices = allSpellKeys.filter(k => spellUnlocked.has(k) && (k === assigned || !assignedElsewhere.has(k)));
      const options = ['<option value="">Empty</option>'].concat(
        choices.map(k => `<option value="${k}" ${k === assigned ? "selected" : ""}>${SPELLS[k].label}</option>`)
      ).join("");
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;">
          <span style="font-size:0.78rem;opacity:0.75;min-width:48px;">Slot ${i + 1}</span>
          <select data-amulet-slot="${i}" style="flex:1;">${options}</select>
        </div>
      `;
    }).join("");

    return `
      <p style="font-weight:700;margin:14px 0 4px;">${amulet.label}${buffActive ? " — buff active" : ""}</p>
      <p style="font-size:0.78rem;opacity:0.8;margin-top:-4px;">Slot ${buffSpellLabel} into any of the 9 slots to activate its passive (+50% Fireball burn duration).</p>
      <div style="text-align:left;">${slotRows}</div>
    `;
  }

  function renderAltar(){
    const total = totalCrystals();
    const spellRows = SPELL_ORDER.map((key, i) => {
      const cfg = SPELLS[key];
      const owned = spellUnlocked.has(key);
      const affordable = total >= cfg.cost;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>${i+1}. ${cfg.label}${owned ? " ✓" : ""}</span>
          ${owned
            ? `<span style="opacity:0.7;font-size:0.8rem;">Owned</span>`
            : `<button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-spell="${key}" ${affordable ? "" : "disabled"}>Buy (${cfg.cost})</button>`
          }
        </div>
      `;
    }).join("");

    const armorRows = ARMOR_ORDER.map(key => {
      const cfg = ARMOR[key];
      const equipped = player.armorType === key;
      const affordable = player.silver >= cfg.cost;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>${cfg.label}${equipped ? " (equipped)" : ""}</span>
          <button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-armor="${key}" ${affordable ? "" : "disabled"}>Buy (${cfg.cost} silver)</button>
        </div>
      `;
    }).join("");

    const armorStatus = player.armorType
      ? `${ARMOR[player.armorType].label}: ${Math.ceil(player.armorHp)}/${player.armorMaxHp}${player.armorBroken ? " (broken)" : ""}`
      : "No armor equipped";

    const repairEligible = player.armorType && player.armorHp < player.armorMaxHp;
    const repairAffordable = player.silver >= ARMOR_REPAIR_COST;
    const repairRow = repairEligible ? `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;">
        <span>Repair ${ARMOR[player.armorType].label}</span>
        <button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" id="wvw-repair-btn" ${repairAffordable ? "" : "disabled"}>Repair (${ARMOR_REPAIR_COST} silver)</button>
      </div>
    ` : "";

    const manaAffordable = player.silver >= MANA_UPGRADE_COST_SILVER;
    const manaRow = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;">
        <span>Max Mana: ${player.maxMana}</span>
        <button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" id="wvw-mana-upgrade-btn" ${manaAffordable ? "" : "disabled"}>+${MANA_UPGRADE_AMOUNT} (${MANA_UPGRADE_COST_SILVER} silver)</button>
      </div>
    `;

    const amuletSection = renderAmuletSection();

    overlayInner.innerHTML = `
      <h3>Wizard Skill Altar</h3>
      <p>You have ${total} crystal${total === 1 ? "" : "s"} to spend on spells (carried + banked), and ${Math.floor(player.silver)} silver for armor and mana.</p>
      <p style="font-size:0.82rem;opacity:0.85;margin-top:-8px;">${armorStatus}</p>
      <div style="text-align:left;">${spellRows}</div>
      <p style="font-weight:700;margin:14px 0 4px;">Armor (buying replaces your current piece)</p>
      <div style="text-align:left;">${armorRows}</div>
      ${repairRow ? `<div style="text-align:left;">${repairRow}</div>` : ""}
      <p style="font-weight:700;margin:14px 0 4px;">Mana (repeatable)</p>
      <div style="text-align:left;">${manaRow}</div>
      ${amuletSection}
      <button type="button" class="btn light" id="wvw-altar-close" style="margin-top:14px;">Close</button>
    `;

    overlayInner.querySelectorAll("button[data-spell]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.spell;
        const cfg = SPELLS[key];
        if (totalCrystals() >= cfg.cost && !spellUnlocked.has(key)){
          spendCrystals(cfg.cost);
          spellUnlocked.add(key);
          if (DEBUG) console.log("[WvW] unlocked spell " + key);
          renderAltar();
          saveProgress();
        }
      });
    });
    overlayInner.querySelectorAll("button[data-armor]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (buyArmor(btn.dataset.armor)){
          renderAltar();
          saveProgress();
        }
      });
    });
    const manaBtn = document.getElementById("wvw-mana-upgrade-btn");
    if (manaBtn){
      manaBtn.addEventListener("click", () => {
        if (buyManaUpgrade()){
          renderAltar();
          saveProgress();
        }
      });
    }
    const repairBtn = document.getElementById("wvw-repair-btn");
    if (repairBtn){
      repairBtn.addEventListener("click", () => {
        if (repairArmor()){
          renderAltar();
          saveProgress();
        }
      });
    }
    overlayInner.querySelectorAll("select[data-amulet-slot]").forEach(sel => {
      sel.addEventListener("change", () => {
        const slotIndex = Number(sel.dataset.amuletSlot);
        if (assignAmuletSlot(player.equippedAmulet, slotIndex, sel.value || null)){
          renderAltar();
          saveProgress();
        }
      });
    });
    document.getElementById("wvw-altar-close").addEventListener("click", closeAltar);
  }

  /* ---------------- init ---------------- */
  function initGame(){
    canvas = document.getElementById("walter-canvas");
    overlay = document.getElementById("walter-overlay");
    overlayInner = document.getElementById("walter-overlay-inner");
    if (!canvas || !overlay) return;

    ctx = canvas.getContext("2d");
    resetState();
    running = false;
    loginComplete = false;
    draw();
    showLoginOverlay();

    canvas.addEventListener("click", (e) => { canvas.focus(); handleTap(e.clientX); });
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); canvas.focus(); handleTap(e.touches[0].clientX); }, { passive: false });

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", (e) => { if (document.activeElement === canvas) onKeyUp(e); });

    setupFullscreenButton();
  }

  function setupFullscreenButton(){
    // Skip gracefully on browsers without Fullscreen API support, rather
    // than showing a button that does nothing.
    if (!document.fullscreenEnabled && !canvas.requestFullscreen) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn light";
    btn.textContent = "⛶ Fullscreen";
    btn.style.display = "block";
    btn.style.marginTop = "8px";

    btn.addEventListener("click", () => {
      if (document.fullscreenElement){
        document.exitFullscreen();
      }else{
        canvas.requestFullscreen().catch(() => {}); // silently ignore if the browser denies it
      }
    });

    document.addEventListener("fullscreenchange", () => {
      const isFull = !!document.fullscreenElement;
      btn.textContent = isFull ? "✕ Exit Fullscreen" : "⛶ Fullscreen";
      if (isFull){
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.objectFit = "contain";
      }else{
        canvas.style.width = "";
        canvas.style.height = "";
        canvas.style.objectFit = "";
      }
    });

    if (canvas.parentNode) canvas.parentNode.insertBefore(btn, canvas.nextSibling);
  }

  document.addEventListener("DOMContentLoaded", initGame);
})();
