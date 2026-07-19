/* =====================================================================
   AND SO I WANDER
   (formerly "Walter vs Wizards")
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
    sandwormBody: "#C9A45C", sandwormBodyDark: "#A9843C", sandwormMouth: "#5C3A1E",
    feyBody: "#7B5FBF", feyGlow: "#C9A9F0", feyArm: "#5B4394",
    fairyBody: "#F6C945", fairyWing: "#FFF3C4", fairyLeg: "#C9962E",
    sirenBody: "#2E8B8B", sirenHair: "#1B4F72", sirenShell: "#E8C99B",
    mermaidBody: "#3AA6A6", mermaidTail: "#1B7A7A", mermaidFin: "#134F5C",
    ogreBody: "#4B5D3A", ogreBodyDark: "#33421F", ogreFist: "#3A4A2C", ogreTusk: "#E8E0C8",
    snakeBody: "#5B8C3A", snakeBelly: "#C9D9A0", snakeTongue: "#B8283A",
    knightPauldron: "#3F4652", knightVisor: "#1A1E24", knightSword: "#9CA3AF",
    archerTunic: "#2D7A3A", archerHood: "#1F5A2A",
    bossBody: "#8B2F3A", bossTrim: "#D4AF37",
    commanderArmor: "#8A8FA0", commanderCape: "#A8283A",
    championArmor: "#B8BCC8", championShield: "#C9A45C", championShieldRim: "#D4AF37",
    feyQueenRobe: "#3A8F5C", feyQueenAntler: "#D9C08A",
    serpentKingScale: "#4A6B2A", serpentKingHood: "#A8283A", serpentKingCrown: "#D4AF37",
    bogTitanMoss: "#4A6B3A", bogTitanMossDark: "#2F4A26", bogTitanStone: "#7A7264",
    sandColossusBody: "#C9A45C", sandColossusDark: "#A9843C", sandColossusShard: "#8B6B4A",
    elderDryadTrunk: "#6B4222", elderDryadLeaf: "#3F8A4A",
    leviathanBody: "#1B6B7A", leviathanBodyDark: "#134F5C", leviathanFin: "#0F3A44",
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
    villagerHat: "#6B4222",
    crewHelmet: "#7A828C",
    playerGoblin: "#5B7A3A",
    playerSiren: "#2E8B8B",
    playerCloak: "#5B4E77",
    playerSkin: "#E0AD7D",
    playerLegs: "#3D3226",
    playerSword: "#9CA3AF",
    swordHilt: "#6B4222",
    swordHiltSOTGK: "#6B4A2A", // brown leather-wrapped hilt, per the SOTGK spec
    sotgkBladeEdge: "#F5F0E6", sotgkBladeCore: "#8A8FA0", // bright white edge, opaque bright grey core
    sotgkUltimate: "#F5D742", // gold glow when all three elements are stacked
    imbueLightning: "#7EC8E3", imbueFire: "#D9483A", imbueFreeze: "#2C4F7C",
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
    nebulaRing: "#9B6FE8", nebulaParticle: "#6B5FC9",
    eelSkinBody: "#3A4A5C", eelSkinTrim: "#5FD4E8", eelSkinEmblem: "#7FD4E8",
    ally: "#F6A93B",
    allyYellow: "#F5D742",
    demonBody: "#B8283A", demonWing: "#7A1420",
    angelBody: "#F5F0E6", angelWing: "#C9D8E8",
    ghostBody: "#C8D8E8",
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
  const HOMEBASE_EXPANSION_WIDTH = 900; // Library -> Blacksmith -> Training Grounds -> Graveyard, past the castle
  const HOMEBASE_DOCK_END = HOMEBASE_DOCK_WIDTH;
  const HOMEBASE_VILLAGE1_END = HOMEBASE_DOCK_END + HOMEBASE_VILLAGE1_WIDTH;
  const HOMEBASE_VILLAGE2_END = HOMEBASE_VILLAGE1_END + HOMEBASE_VILLAGE2_WIDTH;
  const HOMEBASE_CASTLE_END = HOMEBASE_VILLAGE2_END + HOMEBASE_CASTLE_WIDTH;
  const HOMEBASE_EXPANSION_END = HOMEBASE_CASTLE_END + HOMEBASE_EXPANSION_WIDTH;
  const HOMEBASE_WORLD_WIDTH = HOMEBASE_EXPANSION_END;
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
  const HOMEBASE_LIBRARY_X = HOMEBASE_CASTLE_END + 100;
  const HOMEBASE_BLACKSMITH_X = HOMEBASE_CASTLE_END + 320;
  const HOMEBASE_TRAINING_X = HOMEBASE_CASTLE_END + 540;
  const HOMEBASE_GRAVEYARD_X = HOMEBASE_CASTLE_END + 760;

  // House economy — house upgrade cost is 200 * 2.5^(level-1); rent is
  // 50 * 1.5^(level-1) silver/minute once occupied (level >= 1).
  const HOUSE_BASE_COST = 200;
  const HOUSE_COST_MULTIPLIER = 2.5;
  const HOUSE_BASE_RENT_PER_MIN = 50;
  const HOUSE_RENT_MULTIPLIER = 1.5;
  const CASTLE_REBUILD_COST = 10000;

  // Village Expansion (roadmap "And So I Wander" Phase 3).
  const VILLAGER_COUNT = 5; // not specified in the roadmap — a starting guess, easy to retune
  const VILLAGER_STRENGTH_MIN = 5, VILLAGER_STRENGTH_MAX = 20; // DPS stat, randomly rolled once per villager
  const RECRUIT_COST_SILVER = 50;
  const TRAINING_DURATION_MINUTES = 10;
  const LIBRARY_REMODEL_COST = 200;
  const LIBRARY_UPGRADE_COST_CRYSTALS = 20;
  const LIBRARY_DAMAGE_BONUS_PER_LEVEL = 0.05; // +5% spell damage per level, stacking
  const LIBRARY_LEARNING_DURATION_MINUTES = 45;
  const BLACKSMITH_REMODEL_COST = 300;
  const BLACKSMITH_UPKEEP_PER_MINUTE = 50;
  const BLACKSMITH_FALL_CHANCE_PER_MINUTE = 0.01; // not specified — see the assumption noted when this phase started: nothing else in the roadmap defines how crew can die, so working the blacksmith (the only ongoing active job) carries a small risk
  const TRAINING_REMODEL_COST = 500;
  const NECROMANCY_COST_CRYSTALS = 75;
  // Minutes-to-frames uses the same "ticks only while the game is open,
  // no wall-clock catch-up" philosophy already established for passive
  // income — consistent with the rest of this codebase, not a new rule.
  const FRAMES_PER_MINUTE = 60 * 60;

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
    if (DEBUG) console.log("[WvW] set sail for generated Land " + landNumber + " — biomes: " + currentGeneratedLandLayout.land.biomes.map(b => b.id).join(","));
  }

  const CHESTS_HOMEBASE = [];
  const WALKUP_ALTARS_HOMEBASE = [
    { x: HOMEBASE_DOCK_X + 40, w: 40, h: 40, action: "map" },
    { x: HOMEBASE_TOWNHALL_X, w: 40, h: 40, action: "townhall" },
    { x: HOMEBASE_CASTLE_X, w: 60, h: 70, action: "castle" },
    { x: HOMEBASE_LIBRARY_X, w: 50, h: 60, action: "library" },
    { x: HOMEBASE_BLACKSMITH_X, w: 50, h: 50, action: "blacksmith" },
    { x: HOMEBASE_TRAINING_X, w: 50, h: 50, action: "training" },
    { x: HOMEBASE_GRAVEYARD_X, w: 50, h: 50, action: "graveyard" }
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

  // Sword Inventory / imbuing ("And So I Wander" Phase 8b). The roadmap
  // specifies imbue *outcomes* in detail (combo table, visuals) but never
  // says how imbuing is actually triggered — this is a real design call,
  // not something spelled out: casting Fireball, Lightning, or Freeze
  // also imbues the equipped sword with that element for a limited
  // duration, refreshed on recast. A standard sword holds one imbue at a
  // time (a new element replaces the old one); the SOTGK stacks all
  // three independently.
  const IMBUE_DURATION_FRAMES = 20 * 60; // 20s per element, refreshed on recast
  const SOTGK_COST_SILVER = 100000;
  const IMBUE_BONUS_DAMAGE = 8; // standard single-imbue melee bonus
  const SOTGK_ARC_TARGETS = 10; // max enemies hit by the fully-stacked Ultimate arc
  const SOTGK_COMBO_ARC_TARGETS = 3; // smaller arc for the 2-element combos

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
    demon:       { label: "Demon",        cost: 25, allyDuration: 900, allyDamage: 10, allyHp: 30, preferredRange: 200, projectileSpeed: 7, attackCooldown: 60, cooldown: 400 },
    angel:       { label: "Angel",        cost: 25, allyDuration: 900, allyDamage: 10, allyHp: 30, preferredRange: 200, projectileSpeed: 7, attackCooldown: 60, cooldown: 400 },
    teleport:    { label: "Teleport",     cost: 25, cooldown: 900 } // safe respawn — keeps everything carried, unlike dying
  };
  const MYSTIC_ARMOR_REGEN_PER_FRAME = 1.5; // fast enough to top off even steel armor (200) in ~2 seconds
  Object.assign(SPELLS, RARE_SPELLS);

  // Ghost Army ("And So I Wander" Phase 4). Deliberately NOT part of
  // SPELL_ORDER/RARE_SPELL_ORDER — those two arrays are exactly 9 long,
  // matching the 9 number keys and the amulet system's fixed 9 slots.
  // Adding a 10th spell there would break both. It still unlocks the same
  // way as any other spell (crystals, shown in the Spells tab), but casts
  // from its own dedicated key (G), same pattern as the Cloak's C key.
  const SPECIAL_SPELL_ORDER = ["ghostArmy"];
  const SPECIAL_SPELLS = {
    // Cost/mana/cooldown weren't specified — priced near the rare spells
    // given how powerful "summon your whole fallen crew" reads.
    ghostArmy: { label: "Ghost Army", cost: 30, manaCost: 30, cooldown: 3600, duration: 15 * 60 }
  };
  Object.assign(SPELLS, SPECIAL_SPELLS);
  let ghosts; // temporary combat allies, one per dead crew member, cleared on cast expiry — never persisted (transient, like any other active effect)

  // Armor is a consumable HP buffer bought with silver (from knights), separate
  // from the crystal/spell economy. Damage drains armor before Walter's own HP.
  // Buying a new piece replaces whatever's left of the current one.
  const ARMOR = {
    leather: { label: "Leather Armor",      cost: 5,  multiplier: 1.5 },
    steel:   { label: "Steel Armor",        cost: 10, multiplier: 2 },
    // Trait armors — repriced up significantly (roadmap balancing pass).
    goblin:  { label: "Goblin Armor",       cost: 500, multiplier: 1.5, trait: "pacifyGoblinOgre" },
    siren:   { label: "Siren Scale Armor",  cost: 500, multiplier: 1.5, trait: "waterBreathing" },
    // Cost wasn't specified anywhere in the Phase 8c roadmap — priced to
    // match the other trait armors, same 500-silver tier.
    eelSkin: { label: "Eel Skin Armor",     cost: 500, multiplier: 1.5, trait: "lightningMitigation" },
    // Tier-0 utility — no HP buffer at all (multiplier: 0). Its value is
    // the activated ability, not damage soak.
    cloak:   { label: "Invisibility Cloak", cost: 200, multiplier: 0,   trait: "cloak" }
  };
  // Tiered repair: standard armor is cheap to fix, special/trait armor costs more.
  const ARMOR_REPAIR_COST_STANDARD = 20;
  const ARMOR_REPAIR_COST_SPECIAL = 50;
  const ARMOR_SPECIAL_TYPES = new Set(["goblin", "siren", "cloak", "eelSkin"]);
  function armorRepairCost(key){
    return ARMOR_SPECIAL_TYPES.has(key) ? ARMOR_REPAIR_COST_SPECIAL : ARMOR_REPAIR_COST_STANDARD;
  }
  const ARMOR_ORDER = ["leather", "steel", "goblin", "siren", "eelSkin", "cloak"];
  // Letters for the save codex — S is already steel, so siren uses R.
  const ARMOR_LETTERS = { none: "N", leather: "L", steel: "S", goblin: "G", siren: "R", cloak: "C", eelSkin: "E" };
  const ARMOR_LETTERS_REVERSE = { N: "none", L: "leather", S: "steel", G: "goblin", R: "siren", C: "cloak", E: "eelSkin" };

  // Format: <equipped char><5 owned bits><5 broken bits>, bits in
  // ARMOR_ORDER sequence. Old saves only ever stored the single equipped
  // character — those still decode fine (that one piece is treated as
  // owned, nothing broken, matching what they'd actually have had).
  // (The matching encoder was removed in Phase 8a — new saves are JSON
  // now, this decoder only exists for migrating old ones.)
  function decodeArmorInventory(str){
    const result = { equipped: "none", owned: {}, broken: {} };
    ARMOR_ORDER.forEach(k => { result.owned[k] = false; result.broken[k] = false; });
    if (!str) return result;
    if (str.length <= 1){
      result.equipped = ARMOR_LETTERS_REVERSE[str] || "none";
      if (result.equipped !== "none") result.owned[result.equipped] = true;
      return result;
    }
    result.equipped = ARMOR_LETTERS_REVERSE[str[0]] || "none";
    const ownedBits = str.slice(1, 1 + ARMOR_ORDER.length);
    const brokenBits = str.slice(1 + ARMOR_ORDER.length, 1 + ARMOR_ORDER.length * 2);
    ARMOR_ORDER.forEach((k, i) => {
      result.owned[k] = ownedBits[i] === "1";
      result.broken[k] = brokenBits[i] === "1";
    });
    if (result.equipped !== "none") result.owned[result.equipped] = true; // safety net, equipped implies owned
    return result;
  }

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
  const ALL_SPELL_LETTERS = SPELL_LETTERS.concat(RARE_SPELL_LETTERS).concat([{ key: "ghostArmy", letter: "G" }]); // 10 total — one per amulet slot, plus Ghost Army (which has no default key of its own)

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

  // Number keys 1-9 normally cast spells in a fixed default order. But
  // with an amulet equipped, its 9 slots (the same ones that control the
  // amulet's passive buff) take over as the actual key bindings — slot
  // index N becomes key N. This lets the player build their own layout
  // rather than being stuck with the default, which is the point: an
  // empty slot means that key does nothing while this amulet is worn,
  // and a spell not slotted anywhere isn't reachable by number key at
  // all until it's placed in one.
  function resolveSpellForKeySlot(idx){
    if (player.equippedAmulet){
      const slots = player.amuletSlots[player.equippedAmulet];
      return (slots && slots[idx]) || null;
    }
    return SPELL_ORDER.concat(RARE_SPELL_ORDER)[idx] || null;
  }

  const DEBUG = true; // logs key events to the console — flip to false once things look right
  /* ==================== end config ==================== */

  let canvas, ctx, overlay, overlayInner;
  let player, enemies, playerProjectiles, enemyProjectiles, allies, effects;
  let cameraX, frame, totalKills, keysDown;
  let spellCooldowns, spellUnlocked, activeSpell, meleeCooldown;
  let respawnMessageTimer, respawnMessageText;
  let altarOpen, mapOpen, rareAltarOpen, townHallOpen, castleUiOpen, started, running;
  let libraryUiOpen, blacksmithUiOpen, trainingUiOpen, graveyardUiOpen;
  let nearVillagerId = null; // edge-triggered proximity for the "T" interact prompt
  let villagerMenuOpen = false;
  let altarActiveTab = "spells"; // "spells" | "inventory" | "shops" | "amulets"
  let amuletViewKey = null; // which amulet's sub-tab is currently shown in the Amulets tab
  let wasInInnerCave, wasInBossArena;
  let nearMenuAction = null; // whichever walkup/climb menu the player is currently near, opened via M
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
    if (player.armorInventory[key] && player.armorInventory[key].owned) return false; // already owned — nothing to buy
    player.silver -= cfg.cost;
    player.armorInventory[key] = { owned: true, broken: false };
    equipArmor(key);
    if (DEBUG) console.log("[WvW] bought " + key + " armor");
    return true;
  }

  function equipArmor(key){
    const cfg = ARMOR[key];
    const inv = player.armorInventory[key];
    if (!cfg || !inv || !inv.owned) return false;
    player.armorType = key;
    player.armorMaxHp = Math.round(PLAYER_MAX_HP * cfg.multiplier);
    player.armorHp = inv.broken ? 0 : player.armorMaxHp; // gear stays broken across an equip-swap until repaired
    player.armorBroken = inv.broken;
    if (DEBUG) console.log("[WvW] equipped " + key + " armor" + (inv.broken ? " (broken)" : ""));
    return true;
  }

  function repairArmor(key){
    const inv = player.armorInventory[key];
    if (!inv || !inv.owned || !inv.broken) return false; // nothing to repair
    const cost = armorRepairCost(key);
    if (player.silver < cost) return false;
    player.silver -= cost;
    inv.broken = false;
    if (key === player.armorType){
      player.armorHp = player.armorMaxHp;
      player.armorBroken = false;
    }
    if (DEBUG) console.log("[WvW] repaired " + key + " armor for " + cost + " silver");
    return true;
  }

  function randomVillagerStrength(){
    return VILLAGER_STRENGTH_MIN + Math.floor(Math.random() * (VILLAGER_STRENGTH_MAX - VILLAGER_STRENGTH_MIN + 1));
  }

  function makeVillager(id){
    const x = HOMEBASE_DOCK_END + 40 + Math.random() * (HOMEBASE_VILLAGE2_END - HOMEBASE_DOCK_END - 80);
    return { id: "v" + id, strength: randomVillagerStrength(), x, wanderTargetX: x, wanderPauseFrames: 0 };
  }

  function seedVillagers(count, startId){
    const list = [];
    for (let i = 0; i < count; i++) list.push(makeVillager(startId + i));
    return list;
  }

  function spawnReplacementVillager(){
    const v = makeVillager(player.nextVillagerId);
    player.nextVillagerId++;
    player.villagers.push(v);
  }

  // Simple wander: pick a nearby point, walk to it, pause, repeat.
  // Confined to village1+village2 — no reason for a villager to wander
  // into the castle/expansion row.
  function updateVillagers(){
    if (currentMap !== "homebase") return;
    const bounds = { start: HOMEBASE_DOCK_END + 20, end: HOMEBASE_VILLAGE2_END - 20 };
    const wanderStep = (entity) => {
      if (entity.wanderPauseFrames > 0){
        entity.wanderPauseFrames--;
        return;
      }
      const dist = entity.wanderTargetX - entity.x;
      if (Math.abs(dist) < 2){
        entity.wanderPauseFrames = 60 + Math.floor(Math.random() * 180); // pause 1-4s between walks
        entity.wanderTargetX = clamp(entity.x + (Math.random() * 240 - 120), bounds.start, bounds.end);
      }else{
        entity.x += Math.sign(dist) * 0.6;
      }
    };
    player.villagers.forEach(wanderStep);
    // Idle trained crew wander the village too, same as untrained
    // villagers — "reappear in the village" once training finishes.
    player.crew.forEach(c => {
      if (c.status !== "idle") return;
      if (c.x === undefined){
        c.x = HOMEBASE_DOCK_END + 40 + Math.random() * (HOMEBASE_VILLAGE2_END - HOMEBASE_DOCK_END - 80);
        c.wanderTargetX = c.x;
        c.wanderPauseFrames = 0;
      }
      wanderStep(c);
    });
  }

  function updateVillagerProximity(){
    if (currentMap !== "homebase"){ nearVillagerId = null; return; }
    const range = 40;
    const playerCx = player.x + PLAYER_W / 2;
    let closest = null, closestDist = Infinity;
    player.villagers.forEach(v => {
      const dist = Math.abs(v.x - playerCx);
      if (dist < range && dist < closestDist){ closest = v; closestDist = dist; }
    });
    // Idle/following crew wander the village too, once trained — T works
    // on them the same way, offering Assign/Unassign instead of Recruit.
    player.crew.forEach(c => {
      if ((c.status !== "idle" && c.status !== "following") || c.x === undefined) return;
      const dist = Math.abs(c.x - playerCx);
      if (dist < range && dist < closestDist){ closest = c; closestDist = dist; }
    });
    nearVillagerId = closest ? closest.id : null;
  }

  function assignCrewToFollow(crewId){
    const c = player.crew.find(x => x.id === crewId && x.status === "idle");
    if (!c) return false;
    c.status = "following";
    c.attackCooldown = 0;
    c.spellCooldown = 0;
    return true;
  }

  function unassignCrewFromFollow(crewId){
    const c = player.crew.find(x => x.id === crewId && x.status === "following");
    if (!c) return false;
    c.status = "idle";
    // Reappear wandering the village near wherever the player currently
    // is, rather than snapping back to a stale old village position.
    c.x = clamp(player.x, HOMEBASE_DOCK_END + 20, HOMEBASE_VILLAGE2_END - 20);
    c.wanderTargetX = c.x;
    c.wanderPauseFrames = 60;
    return true;
  }

  function recruitVillager(villagerId){
    if (!player.trainingGroundsBuilt) return false;
    if (player.silver < RECRUIT_COST_SILVER) return false;
    const idx = player.villagers.findIndex(v => v.id === villagerId);
    if (idx < 0) return false;
    const v = player.villagers[idx];
    player.silver -= RECRUIT_COST_SILVER;
    player.villagers.splice(idx, 1);
    player.crew.push({
      id: "c" + player.nextCrewId, strength: v.strength, status: "training",
      framesRemaining: TRAINING_DURATION_MINUTES * FRAMES_PER_MINUTE
    });
    player.nextCrewId++;
    spawnReplacementVillager(); // village stays populated
    if (DEBUG) console.log("[WvW] recruited " + v.id + " -> training, " + TRAINING_DURATION_MINUTES + " min");
    return true;
  }

  function updateCrewTimers(){
    player.crew.forEach(c => {
      if ((c.status === "training" || c.status === "library") && c.framesRemaining > 0){
        c.framesRemaining--;
        if (c.framesRemaining <= 0){
          if (c.status === "training"){
            c.status = "idle";
            if (DEBUG) console.log("[WvW] " + c.id + " finished training");
          }else{
            c.spellsKnown = c.spellsKnown || [];
            const learnable = SPELL_ORDER.concat(RARE_SPELL_ORDER).filter(k => spellUnlocked.has(k) && !c.spellsKnown.includes(k));
            if (learnable.length > 0){
              const learned = learnable[Math.floor(Math.random() * learnable.length)];
              c.spellsKnown.push(learned);
              c.spellsLearned = c.spellsKnown.length;
              if (DEBUG) console.log("[WvW] " + c.id + " learned " + learned + " (" + c.spellsLearned + " total)");
            }
            c.status = "idle";
          }
        }
      }
    });
  }

  function updateBlacksmithJob(){
    const worker = player.crew.find(c => c.status === "blacksmith");
    if (!worker) return;
    player.silver = Math.max(0, player.silver - BLACKSMITH_UPKEEP_PER_MINUTE / FRAMES_PER_MINUTE);
    worker.fallCheckFrames = (worker.fallCheckFrames || FRAMES_PER_MINUTE) - 1;
    if (worker.fallCheckFrames <= 0){
      worker.fallCheckFrames = FRAMES_PER_MINUTE;
      if (Math.random() < BLACKSMITH_FALL_CHANCE_PER_MINUTE){
        worker.status = "dead";
        if (DEBUG) console.log("[WvW] " + worker.id + " fell while working the forge");
      }
    }
  }

  // "Automatically repairs crew armor when they visit the village" — no
  // crew combat/armor system exists anywhere in the game to repair, so
  // this is reinterpreted as auto-repairing the PLAYER's own broken gear
  // (the one armor-with-broken-state system that actually exists) while
  // a blacksmith is staffed and the player is physically in the village.
  function updateBlacksmithAutoRepair(){
    if (currentMap !== "homebase") return;
    if (!player.crew.some(c => c.status === "blacksmith")) return;
    ARMOR_ORDER.forEach(key => {
      const inv = player.armorInventory[key];
      if (inv && inv.owned && inv.broken){
        inv.broken = false;
        if (key === player.armorType){ player.armorHp = player.armorMaxHp; player.armorBroken = false; }
      }
    });
  }

  function assignCrewToLibrary(crewId){
    if (player.libraryLevel <= 0) return false;
    const c = player.crew.find(x => x.id === crewId && x.status === "idle");
    if (!c) return false;
    c.status = "library";
    c.framesRemaining = LIBRARY_LEARNING_DURATION_MINUTES * FRAMES_PER_MINUTE;
    return true;
  }

  function assignCrewToBlacksmith(crewId){
    if (!player.blacksmithBuilt) return false;
    if (player.crew.some(c => c.status === "blacksmith")) return false; // one blacksmith at a time
    const c = player.crew.find(x => x.id === crewId && x.status === "idle");
    if (!c) return false;
    c.status = "blacksmith";
    c.fallCheckFrames = FRAMES_PER_MINUTE;
    return true;
  }

  function unassignCrew(crewId){
    const c = player.crew.find(x => x.id === crewId);
    if (!c || (c.status !== "library" && c.status !== "blacksmith")) return false;
    c.status = "idle";
    c.framesRemaining = 0;
    return true;
  }

  function necromancyResurrect(crewId){
    if (totalCrystals() < NECROMANCY_COST_CRYSTALS) return false;
    const c = player.crew.find(x => x.id === crewId && x.status === "dead");
    if (!c) return false;
    spendCrystals(NECROMANCY_COST_CRYSTALS);
    c.status = "idle";
    if (DEBUG) console.log("[WvW] " + c.id + " resurrected");
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

  function spellDamageMultiplier(){
    return 1 + player.libraryLevel * LIBRARY_DAMAGE_BONUS_PER_LEVEL;
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

  function equipAmulet(key){
    if (!player.amuletsOwned.has(key)) return false;
    player.equippedAmulet = key; // only one equipped at a time — this just replaces whichever was equipped before
    return true;
  }
  function unequipAmulet(key){
    if (player.equippedAmulet !== key) return false;
    player.equippedAmulet = null;
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
    if (DEBUG) console.log("[WvW] set sail for the first land");
  }

  function sailToLand2(){
    currentMap = "land2";
    player.x = LAND2_DOCK_X + 10;
    player.y = GROUND_Y - PLAYER_H;
    player.vy = 0;
    enemies = [];
    enemyProjectiles = [];
    if (DEBUG) console.log("[WvW] set sail for the second land");
  }

  function sailToHomebase(){
    currentMap = "homebase";
    player.x = HOMEBASE_DOCK_X + 10;
    player.y = GROUND_Y - PLAYER_H;
    player.vy = 0;
    enemies = [];
    enemyProjectiles = [];
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
    if (DEBUG) console.log("[WvW] sailed home");
  }

  /* ---------------- progress save/load codex ----------------
     Format: $<silver>$&<5 spell letters>&@<banked crystals>@!<armor L/S/N>!
     Spell letters use SPELL_LETTERS above, uppercase = unlocked.
     Only banked crystals persist — carried (at-risk) crystals are always
     0 at the start of a session, same as any other respawn. Kill count
     and HP aren't part of this format, so both reset each session too. */
  // ==================== JSON PlayerState schema (Phase 8a) ====================
  // Replaces the old hand-rolled delimiter-string Codex. Room is already
  // allocated for swordInventory (Phase 8b) and elementalComboStates
  // (Phase 8c) so those phases don't need a second migration later.
  const SAVE_SCHEMA_VERSION = 2;

  function buildPlayerStateSchema(){
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      playerStats: {
        // Silver accrues fractionally (passive income), but only the
        // floored snapshot is persisted — the in-memory fractional part
        // just keeps accumulating live during the session.
        silver: Math.floor(player.silver),
        bankedCrystals: player.bankedCrystals,
        maxMana: player.maxMana
      },
      spells: {
        unlocked: Array.from(spellUnlocked)
      },
      swordInventory: {
        swords: player.swordInventory.swords.map(s => ({
          id: s.id, type: s.type, label: s.label
          // activeImbues intentionally not persisted — same "transient
          // combat state" treatment as burn/freeze/cloak timers elsewhere;
          // an imbue you're mid-fight with shouldn't survive a reload.
        })),
        equippedSwordId: player.swordInventory.equippedSwordId
      },
      armorInventory: {
        equipped: player.armorType || null,
        items: ARMOR_ORDER.reduce((acc, key) => {
          const inv = player.armorInventory[key];
          acc[key] = { owned: !!(inv && inv.owned), broken: !!(inv && inv.broken) };
          return acc;
        }, {})
      },
      amuletLibrary: {
        owned: AMULET_ORDER.filter(k => player.amuletsOwned.has(k)),
        equipped: player.equippedAmulet || null,
        slots: AMULET_ORDER.filter(k => player.amuletsOwned.has(k)).reduce((acc, k) => {
          acc[k] = (player.amuletSlots[k] || new Array(9).fill(null)).slice();
          return acc;
        }, {})
      },
      homeBase: {
        houseLevels: HOMEBASE_HOUSES.reduce((acc, h) => { acc[h.id] = player.houseLevels[h.id] || 0; return acc; }, {}),
        castleRebuilt: !!player.castleRebuilt,
        shrineLevel: player.shrineLevel || 0,
        libraryLevel: player.libraryLevel || 0,
        blacksmithBuilt: !!player.blacksmithBuilt,
        trainingGroundsBuilt: !!player.trainingGroundsBuilt
      },
      crewRoster: player.crew.map(c => ({
        id: c.id, name: c.name || null, strength: c.strength, status: c.status,
        framesRemaining: Math.round(c.framesRemaining || 0),
        spellsKnown: (c.spellsKnown || []).slice()
      })),
      worldProgress: {
        highestUnlockedLand: player.highestUnlockedLand
      },
      elementalComboStates: {}, // Phase 8c
      flags: {
        crewHired: !!player.crewHired,
        land1ChestCollected: !!player.land1ChestCollected
      }
    };
  }

  function encodeProgress(){
    return JSON.stringify(buildPlayerStateSchema());
  }

  // Maps decodeLegacyCodex()'s old flat output shape onto the new nested
  // schema, so a returning player's save migrates transparently the next
  // time it's loaded. Runs once per legacy save; the very next
  // saveProgress() call writes it back out in the new JSON format, so
  // this only ever fires a single time per player.
  function migrateLegacyToSchema(legacy){
    const unlocked = Array.from(legacy.spells || []);
    if (legacy.ghostArmyUnlocked && !unlocked.includes("ghostArmy")) unlocked.push("ghostArmy");
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      playerStats: {
        silver: legacy.silver || 0,
        bankedCrystals: legacy.crystals || 0,
        maxMana: legacy.maxMana || MAX_MANA_START
      },
      spells: { unlocked },
      swordInventory: { swords: [{ id: "default", type: "standard", label: "Iron Sword" }], equippedSwordId: "default" },
      armorInventory: {
        equipped: (legacy.armor && legacy.armor !== "none") ? legacy.armor : null,
        items: ARMOR_ORDER.reduce((acc, key) => {
          acc[key] = {
            owned: !!(legacy.armorOwned && legacy.armorOwned[key]),
            broken: !!(legacy.armorBroken && legacy.armorBroken[key])
          };
          return acc;
        }, {})
      },
      amuletLibrary: {
        owned: legacy.amuletOwnedKeys || [],
        equipped: legacy.amuletEquippedKey || null,
        slots: Object.assign({}, legacy.amuletSlotsByKey || {})
      },
      homeBase: {
        houseLevels: HOMEBASE_HOUSES.reduce((acc, h, i) => {
          acc[h.id] = (legacy.houseLevels && legacy.houseLevels[i]) || 0;
          return acc;
        }, {}),
        castleRebuilt: !!legacy.castleRebuilt,
        shrineLevel: legacy.shrineLevel || 0,
        libraryLevel: legacy.libraryLevel || 0,
        blacksmithBuilt: !!legacy.blacksmithBuilt,
        trainingGroundsBuilt: !!legacy.trainingGroundsBuilt
      },
      crewRoster: (legacy.crew || []).map(c => ({
        id: c.id, name: null, strength: c.strength, status: c.status,
        framesRemaining: c.framesRemaining || 0,
        spellsKnown: c.spellsKnown || []
      })),
      worldProgress: {
        highestUnlockedLand: legacy.highestUnlockedLand || 2
      },
      elementalComboStates: {},
      flags: {
        crewHired: !!legacy.crewHired,
        land1ChestCollected: !!legacy.land1ChestCollected
      }
    };
  }

  // Dispatcher: new saves are JSON, old saves are the legacy delimiter
  // string. Detected by attempting JSON.parse rather than sniffing the
  // first character, since that's the actual ground truth either way.
  function decodeProgress(str){
    if (!str) return migrateLegacyToSchema(decodeLegacyCodex(""));
    try{
      const parsed = JSON.parse(str);
      if (parsed && parsed.schemaVersion) return parsed;
    }catch(e){
      // not JSON — fall through to the legacy parser
    }
    if (DEBUG) console.log("[WvW] migrating a legacy codex save to the JSON schema");
    return migrateLegacyToSchema(decodeLegacyCodex(str));
  }

  const CREW_STATUS_LETTERS = { training: "T", idle: "I", library: "L", blacksmith: "B", dead: "D", following: "F" };
  const CREW_STATUS_LETTERS_REVERSE = { T: "training", I: "idle", L: "library", B: "blacksmith", D: "dead", F: "following" };
  // (encodeCrew was removed in Phase 8a — new saves are JSON now, this
  // decoder only exists for migrating old ones.)
  function decodeCrew(str){
    if (!str) return [];
    return str.split("|").filter(Boolean).map(entry => {
      const parts = entry.split("-");
      const spellsKnown = (parts[5] || "").split(".").filter(Boolean).map(letter => {
        const entry = ALL_SPELL_LETTERS.find(e => e.letter === letter);
        return entry ? entry.key : null;
      }).filter(Boolean);
      return {
        id: "c" + parts[0],
        strength: parseInt(parts[1], 10) || 0,
        status: CREW_STATUS_LETTERS_REVERSE[parts[2]] || "idle",
        framesRemaining: parseInt(parts[3], 10) || 0,
        spellsLearned: parseInt(parts[4], 10) || 0,
        spellsKnown
      };
    });
  }

  // (encodeHomebase was removed in Phase 8a — new saves are JSON now,
  // this decoder only exists for migrating old ones.)
  function decodeHomebase(str){
    const result = { houseLevels: HOMEBASE_HOUSES.map(() => 0), castleRebuilt: false, shrineLevel: 0, libraryLevel: 0, blacksmithBuilt: false, trainingGroundsBuilt: false };
    if (!str) return result;
    const parts = str.split(",").map(s => parseInt(s, 10));
    HOMEBASE_HOUSES.forEach((h, i) => {
      result.houseLevels[i] = Number.isFinite(parts[i]) ? Math.max(0, parts[i]) : 0;
    });
    result.castleRebuilt = parts[HOMEBASE_HOUSES.length] === 1;
    result.shrineLevel = Number.isFinite(parts[HOMEBASE_HOUSES.length + 1]) ? Math.max(0, parts[HOMEBASE_HOUSES.length + 1]) : 0;
    result.libraryLevel = Number.isFinite(parts[HOMEBASE_HOUSES.length + 2]) ? Math.max(0, parts[HOMEBASE_HOUSES.length + 2]) : 0;
    result.blacksmithBuilt = parts[HOMEBASE_HOUSES.length + 3] === 1;
    result.trainingGroundsBuilt = parts[HOMEBASE_HOUSES.length + 4] === 1;
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
  // (encodeAmulets was removed in Phase 8a — new saves are JSON now,
  // this decoder only exists for migrating old ones.)
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

  // Kept exactly as it was — this is now purely the migration path's
  // parser for pre-JSON saves, untouched so its battle-tested behavior
  // (including every backward-compat quirk it already handles) survives.
  function decodeLegacyCodex(str){
    const result = {
      silver: 0, crystals: 0, armor: "none", armorOwned: {}, armorBroken: {}, spells: new Set(), maxMana: MAX_MANA_START,
      crewHired: false, land1ChestCollected: false,
      amuletOwnedKeys: [], amuletEquippedKey: null, amuletSlotsByKey: {},
      houseLevels: HOMEBASE_HOUSES.map(() => 0), castleRebuilt: false, shrineLevel: 0,
      libraryLevel: 0, blacksmithBuilt: false, trainingGroundsBuilt: false, crew: [], ghostArmyUnlocked: false,
      worldSeed: null, highestUnlockedLand: 2
    };
    if (!str) return result;
    // The #maxMana#, ~rare~, ^flags^, *amulet*, +homebase+, and %world%
    // segments are all optional so saves from before each feature existed
    // still load fine.
    const m = String(str).match(/\$(\d+)\$&([A-Za-z]*)&@(\d+)@!([LSNGRC01]*)!(?:#(\d+)#)?(?:~([A-Za-z]*)~)?(?:\^(\d*)\^)?(?:\*([0-9x:\-A-Za-z]*)\*)?(?:\+([\d,]*)\+)?(?:%([\d,]*)%)?(?:=([0-9|.\-A-Za-z]*)=)?(?:;(\d*);)?/);
    if (!m) return result;
    result.silver = parseInt(m[1], 10) || 0;
    result.crystals = parseInt(m[3], 10) || 0;
    const armorData = decodeArmorInventory(m[4] || "");
    result.armor = armorData.equipped;
    result.armorOwned = armorData.owned;
    result.armorBroken = armorData.broken;
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
    result.libraryLevel = homebaseData.libraryLevel;
    result.blacksmithBuilt = homebaseData.blacksmithBuilt;
    result.trainingGroundsBuilt = homebaseData.trainingGroundsBuilt;
    result.crew = decodeCrew(m[11] || "");
    result.ghostArmyUnlocked = m[12] === "1";

    const worldParts = (m[10] || "").split(",");
    if (worldParts[0]) result.worldSeed = parseInt(worldParts[0], 10) || null;
    if (worldParts[1]) result.highestUnlockedLand = Math.max(2, parseInt(worldParts[1], 10) || 2);

    return result;
  }

  function applyLoadedProgress(){
    if (!loadedProgress) return;
    const s = loadedProgress;
    player.silver = s.playerStats.silver;
    player.bankedCrystals = s.playerStats.bankedCrystals;
    player.maxMana = s.playerStats.maxMana;
    player.mana = s.playerStats.maxMana; // start each session with mana full, same as HP
    player.crewHired = s.flags.crewHired;
    player.land1ChestCollected = s.flags.land1ChestCollected;
    s.spells.unlocked.forEach(key => spellUnlocked.add(key));
    ARMOR_ORDER.forEach(key => {
      const item = s.armorInventory.items[key];
      player.armorInventory[key] = { owned: !!(item && item.owned), broken: !!(item && item.broken) };
    });
    if (s.armorInventory.equipped && player.armorInventory[s.armorInventory.equipped] && player.armorInventory[s.armorInventory.equipped].owned){
      equipArmor(s.armorInventory.equipped);
    }
    s.amuletLibrary.owned.forEach(key => {
      player.amuletsOwned.add(key);
      player.amuletSlots[key] = s.amuletLibrary.slots[key] || new Array(9).fill(null);
    });
    if (s.amuletLibrary.equipped) player.equippedAmulet = s.amuletLibrary.equipped;
    HOMEBASE_HOUSES.forEach(h => { player.houseLevels[h.id] = s.homeBase.houseLevels[h.id] || 0; });
    player.castleRebuilt = s.homeBase.castleRebuilt;
    player.shrineLevel = s.homeBase.shrineLevel || 0;
    player.libraryLevel = s.homeBase.libraryLevel || 0;
    player.blacksmithBuilt = !!s.homeBase.blacksmithBuilt;
    player.trainingGroundsBuilt = !!s.homeBase.trainingGroundsBuilt;
    player.crew = s.crewRoster || [];
    if (s.swordInventory && s.swordInventory.swords && s.swordInventory.swords.length){
      player.swordInventory.swords = s.swordInventory.swords.map(sw => ({ ...sw, activeImbues: {} }));
      player.swordInventory.equippedSwordId = s.swordInventory.equippedSwordId || player.swordInventory.swords[0].id;
    }
    const maxLoadedCrewId = player.crew.reduce((max, c) => Math.max(max, parseInt(c.id.replace("c", ""), 10) || 0), 0);
    player.nextCrewId = maxLoadedCrewId + 1;
    player.highestUnlockedLand = s.worldProgress.highestUnlockedLand;
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
      mysticArmor: 0, demon: 0, angel: 0, teleport: 0, ghostArmy: 0 };
    spellUnlocked = new Set();
    ghosts = [];
    player.amuletsOwned = new Set();
    player.armorInventory = {}; // { [armorType]: { owned: bool, broken: bool } } — persists per-piece, independent of what's currently worn
    player.swordInventory = {
      swords: [{ id: "default", type: "standard", label: "Iron Sword", activeImbues: {} }],
      equippedSwordId: "default"
    };
    ARMOR_ORDER.forEach(key => { player.armorInventory[key] = { owned: false, broken: false }; });
    player.amuletSlots = {}; // { amuletKey: [9 slots, spell key or null] }, populated as amulets are earned
    player.houseLevels = {}; // { houseId: level }, 0 or absent = decrepit/unremodeled
    HOMEBASE_HOUSES.forEach(h => { player.houseLevels[h.id] = 0; });
    player.castleRebuilt = false;
    player.shrineLevel = 0; // decrepit until remodeled, then each level adds +20% mana regen
    player.eelChargeMeter = 0; // 0-100, builds from incoming lightning damage while Eel Skin Armor is equipped
    // Village Expansion state. Villagers wander and can be recruited;
    // once recruited they move into the crew roster and villagers[] is
    // regenerated to keep the village populated.
    player.villagers = [];
    player.crew = []; // { id, strength, status: "training"|"idle"|"library"|"blacksmith"|"dead", framesRemaining }
    player.nextVillagerId = 1;
    player.nextCrewId = 1;
    player.libraryLevel = 0;
    player.trainingGroundsBuilt = false;
    player.blacksmithBuilt = false;
    player.villagers = seedVillagers(VILLAGER_COUNT, player.nextVillagerId);
    player.nextVillagerId += VILLAGER_COUNT;
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
    wasInInnerCave = false;
    wasInBossArena = false;
    nearMenuAction = null;
    lastGeneratedLandBiomeIds = [];
    nextSpawnFrame = 90;
    running = true;
  }

  /* ---------------- input ---------------- */
  function onKeyDown(e){
    if (document.activeElement !== canvas) return;
    if (!started){ if (loginComplete) startGame(); return; }
    if (altarOpen || mapOpen || rareAltarOpen || townHallOpen || castleUiOpen || libraryUiOpen || blacksmithUiOpen || trainingUiOpen || graveyardUiOpen || villagerMenuOpen) return; // menus have their own buttons, don't also move/attack behind them

    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault();
    keysDown.add(e.code);

    if (e.code === "Space"){
      if (activeSpell) castSpell(activeSpell);
      else meleeAttack();
    }

    if (e.code === "KeyC") activateCloak();

    if (e.code === "KeyT" && nearVillagerId && !villagerMenuOpen) openVillagerMenu(nearVillagerId);
    if (e.code === "KeyQ" && nearMenuAction) openMenuForAction(nearMenuAction);

    if (e.code === "ArrowUp"){
      const onLadderNow = Math.abs(player.x + PLAYER_W/2 - TOWER_X) < LADDER_HALF_WIDTH && currentZone(player.x) === "tower";
      if (!onLadderNow) jumpIfGrounded();
    }

    const numMatch = e.code.match(/^Digit([1-9])$/);
    if (numMatch){
      const idx = Number(numMatch[1]) - 1;
      const key = resolveSpellForKeySlot(idx);
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
    updateVillagers();
    updateVillagerProximity();
    updateCrewTimers();
    updateBlacksmithJob();
    updateBlacksmithAutoRepair();
    updateWaveSpawning();
    updateCyclopsEncounter();
    updateGeneratedBossEncounter();
    updateEnemies();
    updateProjectiles();
    updateAllies();
    updateFollowingCrew();
    updateGhosts();
    updateEffects();
    updateSwordImbues();
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
    SPELL_ORDER.concat(RARE_SPELL_ORDER).concat(SPECIAL_SPELL_ORDER).forEach(k => { if (spellCooldowns[k] > 0) spellCooldowns[k]--; });
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
  function getEquippedSword(){
    return player.swordInventory.swords.find(s => s.id === player.swordInventory.equippedSwordId) || null;
  }

  function equipSword(swordId){
    if (!player.swordInventory.swords.some(s => s.id === swordId)) return false;
    player.swordInventory.equippedSwordId = swordId;
    return true;
  }

  function buySOTGK(){
    if (!player.castleRebuilt) return false;
    if (player.swordInventory.swords.some(s => s.id === "sotgk")) return false; // one-time purchase
    if (player.silver < SOTGK_COST_SILVER) return false;
    player.silver -= SOTGK_COST_SILVER;
    player.swordInventory.swords.push({ id: "sotgk", type: "sotgk", label: "Sword of the Great King", activeImbues: {} });
    equipSword("sotgk"); // auto-equip, matching how buying armor/amulets already auto-equips
    if (DEBUG) console.log("[WvW] purchased the Sword of the Great King");
    return true;
  }

  // Casting Fireball/Lightning/Freeze also imbues the equipped sword —
  // see the constant block above for why this is the trigger. A
  // standard sword only ever holds one imbue (a new element replaces the
  // old one); the SOTGK stacks up to all three independently.
  function applyImbueToSword(element){
    const sword = getEquippedSword();
    if (!sword) return;
    if (sword.type === "sotgk"){
      sword.activeImbues[element] = IMBUE_DURATION_FRAMES;
    }else{
      sword.activeImbues = { [element]: IMBUE_DURATION_FRAMES };
    }
  }

  function updateSwordImbues(){
    const sword = getEquippedSword();
    if (!sword) return;
    Object.keys(sword.activeImbues).forEach(el => {
      sword.activeImbues[el]--;
      if (sword.activeImbues[el] <= 0) delete sword.activeImbues[el];
    });
  }

  // Fires a short lightning arc from the player to nearby enemies,
  // reusing the same "nearest, not yet hit" chaining approach the
  // Lightning spell already uses, just capped at a different count.
  // Reaching 100% charge fires a big lightning arc and resets — reuses
  // the same "nearest, not yet hit" arc helper the SOTGK's combos use.
  function dischargeEelSkin(){
    const lightningDamage = SPELLS.lightning.damage * spellDamageMultiplier();
    fireSwordArc(10, lightningDamage * 2);
    player.eelChargeMeter = 0;
    effects.push({ type: "eel-discharge", x: player.x + PLAYER_W/2, y: player.y + PLAYER_H/2, life: 15 });
    if (DEBUG) console.log("[WvW] Eel Skin discharged — 10-target arc for " + Math.round(lightningDamage * 2) + " each");
  }

  function fireSwordArc(maxTargets, damage){
    const hitSoFar = [];
    let fromX = player.x + PLAYER_W/2, fromY = player.y + PLAYER_H/2;
    for (let i = 0; i < maxTargets; i++){
      let nearest = null, nearestDist = Infinity;
      enemies.forEach(en => {
        if (en.hp <= 0 || hitSoFar.includes(en)) return;
        const d = Math.hypot((en.x + en.w/2) - fromX, (en.y + en.h/2) - fromY);
        if (d < 260 && d < nearestDist){ nearest = en; nearestDist = d; }
      });
      if (!nearest) break;
      damageEnemy(nearest, damage);
      hitSoFar.push(nearest);
      effects.push({ type: "lightning-link", x1: fromX, y1: fromY, x2: nearest.x + nearest.w/2, y2: nearest.y + nearest.h/2, life: 8 });
      fromX = nearest.x + nearest.w/2; fromY = nearest.y + nearest.h/2;
    }
    return hitSoFar;
  }

  // The SOTGK's deterministic combo table, per its spec. Only called on
  // a melee hit while the SOTGK is equipped with 2+ active imbues.
  function applySOTGKCombo(target){
    const sword = getEquippedSword();
    const imbues = Object.keys(sword.activeImbues);
    const has = (el) => imbues.includes(el);

    if (has("lightning") && has("fire") && has("freeze")){
      // Ultimate: arc up to 10 targets, permanent white burn, passive freeze damage
      fireSwordArc(SOTGK_ARC_TARGETS, MELEE_DAMAGE);
      target.burningFrames = 999999; // "permanent" for practical purposes — cleared on death/respawn like any burn
      target.whiteBurn = true;
      target.frozenFrames = Math.max(target.frozenFrames || 0, 120);
      damageEnemy(target, MELEE_DAMAGE * 0.3); // passive freeze damage, on top of the arc
    }else if (has("lightning") && has("freeze")){
      fireSwordArc(SOTGK_COMBO_ARC_TARGETS, MELEE_DAMAGE * 0.6);
      target.frozenFrames = Math.max(target.frozenFrames || 0, 90);
    }else if (has("lightning") && has("fire")){
      fireSwordArc(SOTGK_COMBO_ARC_TARGETS, MELEE_DAMAGE * 0.6);
      target.burningFrames = Math.max(target.burningFrames || 0, 180);
      target.whiteBurn = true;
    }else if (has("fire") && has("freeze")){
      // "Damaging Freeze" — control plus direct passive damage, no arc
      target.frozenFrames = Math.max(target.frozenFrames || 0, 90);
      damageEnemy(target, MELEE_DAMAGE * 0.5);
    }
  }

  function meleeAttack(){
    if (meleeCooldown > 0) return;
    meleeCooldown = MELEE_COOLDOWN;
    const hitX = player.facing > 0 ? player.x + PLAYER_W : player.x - MELEE_RANGE;
    const sword = getEquippedSword();
    const imbues = sword ? Object.keys(sword.activeImbues) : [];
    enemies.forEach(en => {
      if (en.hp > 0 && rectsOverlap(hitX, player.y, MELEE_RANGE, PLAYER_H, en.x, en.y, en.w, en.h)){
        damageEnemy(en, MELEE_DAMAGE);
        if (en.hp <= 0) return;
        if (sword && sword.type === "sotgk" && imbues.length >= 2){
          applySOTGKCombo(en);
        }else if (imbues.length === 1){
          // standard sword, single imbue — a small bonus effect, not the
          // full SOTGK combo table (that's exclusive to the SOTGK)
          const el = imbues[0];
          damageEnemy(en, IMBUE_BONUS_DAMAGE);
          if (el === "fire") en.burningFrames = Math.max(en.burningFrames || 0, 90);
          else if (el === "freeze") en.frozenFrames = Math.max(en.frozenFrames || 0, 45);
          else if (el === "lightning") fireSwordArc(1, IMBUE_BONUS_DAMAGE);
        }
      }
    });
  }

  function castSpell(key){
    const cfg = SPELLS[key];
    if (!cfg || spellCooldowns[key] > 0) return;
    // Ghost Army needs fallen crew to summon — checked before spending
    // mana/cooldown, same as the other spells' implicit "always works
    // once affordable" contract; this one just has an extra condition.
    if (key === "ghostArmy" && !player.crew.some(c => c.status === "dead")) return;
    const manaCost = key === "ghostArmy" ? cfg.manaCost
      : RARE_SPELL_ORDER.includes(key) ? RARE_SPELL_MANA_COST : MANA_COST_PER_SPELL;
    if (player.mana < manaCost) return;
    spellCooldowns[key] = cfg.cooldown;
    player.mana -= manaCost;

    if (key === "fireball"){
      applyImbueToSword("fire");
      playerProjectiles.push({
        type: "fireball", x: player.x + PLAYER_W/2, y: player.y + PLAYER_H/2,
        vx: cfg.speed * player.facing, damage: cfg.damage * spellDamageMultiplier()
      });
    }else if (key === "lightning"){
      applyImbueToSword("lightning");
      // Chain lightning: bridges from Walter to the nearest enemy, then from
      // that enemy to the next nearest (not yet hit), up to chainMax links.
      // An equipped amulet (Banner of Valor / Emerald Fang) can extend that
      // chain while Lightning is slotted in one of its 9 slots.
      const chainMax = cfg.chainMax + (isAmuletBuffActive("lightning") ? (AMULETS[player.equippedAmulet].chainBonus || 0) : 0);
      const chainPoints = [{ x: player.x + PLAYER_W/2, y: player.y + PLAYER_H/2 }];
      const hitSoFar = [];
      let fromX = chainPoints[0].x, fromY = chainPoints[0].y;

      for (let i = 0; i < chainMax; i++){
        // Elemental combo: an untransitioned Black Hole in range is a
        // high-priority target — checked before the nearest-enemy search,
        // per the roadmap's combo table.
        const nearbyBlackHole = effects.find(fx => fx.type === "black-hole" && !fx.isNebula &&
          Math.hypot(fx.x - fromX, fx.y - fromY) <= cfg.range);
        if (nearbyBlackHole){
          nearbyBlackHole.isNebula = true;
          chainPoints.push({ x: nearbyBlackHole.x, y: nearbyBlackHole.y });
          fromX = nearbyBlackHole.x; fromY = nearbyBlackHole.y;
          if (DEBUG) console.log("[WvW] Black Hole struck by Lightning — transitioned to Nebula");
          continue;
        }
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
        damageEnemy(nearest, cfg.damage * spellDamageMultiplier());
        const enCx = nearest.x + nearest.w/2, enCy = nearest.y + nearest.h/2;
        chainPoints.push({ x: enCx, y: enCy });
        fromX = enCx; fromY = enCy;
      }

      effects.push({ type: "lightning-chain", points: chainPoints, life: 10 });
    }else if (key === "freeze"){
      applyImbueToSword("freeze");
      const originX = player.x + PLAYER_W/2, originY = player.y + PLAYER_H/2;
      enemies.forEach(en => {
        const dx = (en.x + en.w/2) - originX, dy = (en.y + en.h/2) - originY;
        if (Math.sqrt(dx*dx + dy*dy) < cfg.radius){
          en.frozenFrames = cfg.duration;
          // Elemental combo: Freeze extinguishes an active burn, per the roadmap's combo table.
          if (en.burningFrames > 0){ en.burningFrames = 0; en.whiteBurn = false; }
        }
      });
      player.burningFrames = 0; // ice puts out fire — extinguishes an active cyclops burn early
      effects.push({ type: "freeze-burst", x: originX, y: originY, radius: cfg.radius, life: 20 });
    }else if (key === "summonAlly"){
      allies = []; // only one summoned creature at a time — casting any summon spell replaces it
      allies.push({
        kind: "melee", x: player.x - 30 * player.facing, y: player.y, hp: cfg.allyHp,
        life: cfg.allyDuration, damage: cfg.allyDamage * spellDamageMultiplier(), cooldown: 0
      });
    }else if (key === "demon" || key === "angel"){
      allies = []; // same one-summon-at-a-time rule as summonAlly
      allies.push({
        kind: key, x: player.x - 30 * player.facing, y: player.y - 20, hp: cfg.allyHp,
        life: cfg.allyDuration, damage: cfg.allyDamage * spellDamageMultiplier(), cooldown: 0,
        flyPhase: Math.random() * Math.PI * 2
      });
    }else if (key === "teleport"){
      teleportToSafety();
    }else if (key === "blackHole"){
      const cx = player.x + PLAYER_W/2 + 90 * player.facing;
      effects.push({
        type: "black-hole", x: cx, y: GROUND_Y - 60, radius: cfg.radius,
        life: cfg.duration, damagePerFrame: cfg.damagePerFrame * spellDamageMultiplier(), pullStrength: cfg.pullStrength
      });
    }else if (key === "mysticArmor"){
      player.mysticArmorFramesLeft = cfg.duration;
    }else if (key === "ghostArmy"){
      const fallen = player.crew.filter(c => c.status === "dead");
      fallen.forEach((c, i) => {
        ghosts.push({
          x: player.x - 30 * player.facing - i * 20, y: player.y,
          life: cfg.duration, damage: c.strength, cooldown: 0
        });
      });
      if (DEBUG) console.log("[WvW] Ghost Army summoned — " + fallen.length + " fallen crew, " + (cfg.duration/60) + "s");
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

    // Eel Skin Armor: halves incoming lightning damage and charges toward
    // a big discharge. Charges off the RAW incoming amount (how hard the
    // attack hit), not what actually got through, same as it charging off
    // "damage received" rather than "damage suffered".
    if (opts.source === "lightning" && player.armorType === "eelSkin"){
      player.eelChargeMeter = Math.min(100, player.eelChargeMeter + amount);
      amount *= 0.5;
      if (player.eelChargeMeter >= 100) dischargeEelSkin();
    }

    let remaining = amount;
    if (player.armorHp > 0){
      const absorbed = Math.min(player.armorHp, remaining);
      player.armorHp -= absorbed;
      remaining -= absorbed;
      if (player.armorHp <= 0){
        player.armorHp = 0;
        player.armorBroken = true; // depleted, not deleted — repairable at an altar
        if (player.armorInventory[player.armorType]) player.armorInventory[player.armorType].broken = true;
        if (DEBUG) console.log("[WvW] " + player.armorType + " armor broke");
      }
    }
    if (remaining > 0) player.hp -= remaining;

    if (!opts.ignoreInvuln) player.invulnFrames = HIT_INVULN_FRAMES;
    if (player.hp <= 0) respawnPlayer();
  }

  // Teleport spell: same destination logic as a death respawn, but
  // nothing is lost and it isn't treated as going down — no crystal
  // loss, no "you went down" message, no burn/HP reset since the player
  // wasn't actually hurt.
  function teleportToSafety(){
    currentMap = "home";
    const spawn = spawnPoint();
    player.x = spawn.x;
    player.y = spawn.y;
    player.vy = 0;
    player.invulnFrames = RESPAWN_INVULN_FRAMES;
    respawnMessageText = "Teleported to safety.";
    respawnMessageTimer = 180;
    if (DEBUG) console.log("[WvW] teleported — kept " + player.carriedCrystals + " carried crystals");
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
          en.moving = true;
        }else{
          en.moving = false;
          if (en.attackCooldown <= 0){
            damagePlayer(en.scaledDamage);
            en.attackCooldown = stats.attackCooldown;
          }
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
          en.moving = true;
        }else if (Math.abs(dist) < stats.preferredRange - 20){
          en.x -= Math.sign(dist) * stats.speed;
          en.moving = true;
        }else{
          en.moving = false;
          if (en.attackCooldown <= 0){
            fireEnemyProjectile(en, Math.sign(dist) || 1);
            en.attackCooldown = stats.attackCooldown;
          }
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
          // Elemental combo: Frozen + Fireball doubles the hit — a
          // "shatter" interaction, matching the roadmap's combo table.
          const dmg = (p.type === "fireball" && en.frozenFrames > 0) ? p.damage * 2 : p.damage;
          damageEnemy(en, dmg);
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
        damagePlayer(p.damage, { source: p.type === "lightning" ? "lightning" : undefined });
        p.hit = true;
      }
    });
    enemyProjectiles = enemyProjectiles.filter(p => !p.hit && p.x > -30 && p.x < currentWorldWidth() + 30);
  }

  /* ---------------- allies ---------------- */
  function updateFollowingCrew(){
    const followers = player.crew.filter(c => c.status === "following");
    followers.forEach((c, i) => {
      if (c.x === undefined){
        c.x = player.x - 40 - i * 24;
        c.y = player.y;
        c.facing = 1;
        c.attackCooldown = 0;
        c.spellCooldown = 0;
      }
      // Catch up instantly on a map change or if left far behind — avoids
      // needing to hook every single sail/teleport/respawn function
      // individually; "following" just means always effectively with you.
      if (c.lastMap !== currentMap || Math.abs(c.x - player.x) > 400){
        c.x = player.x - 40 - i * 24;
        c.y = player.y;
      }
      c.lastMap = currentMap;
      c.y = GROUND_Y - PLAYER_H; // stays grounded, same as allies/ghosts — no jump/climb/swim simulation for followers

      if (c.attackCooldown > 0) c.attackCooldown--;
      if (c.spellCooldown > 0) c.spellCooldown--;

      const alive = enemies.filter(en => en.hp > 0 && Math.abs(en.x - c.x) < 280);
      const target = alive.sort((p, q) => Math.abs(p.x - c.x) - Math.abs(q.x - c.x))[0];

      if (target){
        const dist = (target.x + target.w/2) - (c.x + PLAYER_W/2);
        c.facing = dist >= 0 ? 1 : -1;
        if (Math.abs(dist) > 30){
          c.x += Math.sign(dist) * 2.4;
          c.moving = true;
        }else{
          c.moving = false;
          if (c.attackCooldown <= 0){
            damageEnemy(target, c.strength); // sword — always available, "sword to start"
            c.attackCooldown = MELEE_COOLDOWN;
          }
        }
        // spells, if any are known — an additional ranged option layered
        // on top of the sword, not a replacement for it
        if (c.spellsKnown && c.spellsKnown.length > 0 && c.spellCooldown <= 0){
          const spellKey = c.spellsKnown[Math.floor(Math.random() * c.spellsKnown.length)];
          const spellCfg = SPELLS[spellKey];
          playerProjectiles.push({
            type: "crewBolt", x: c.x + PLAYER_W/2, y: c.y + PLAYER_H/2,
            vx: 7 * (Math.sign(dist) || c.facing), damage: Math.round((spellCfg.damage || c.strength) * 0.6)
          });
          c.spellCooldown = 180; // 3s between casts
        }
      }else{
        // nothing nearby to fight — follow the player, staggered so
        // multiple followers don't stack on the exact same spot
        const followTargetX = player.x - 40 - i * 24;
        const followDist = followTargetX - c.x;
        if (Math.abs(followDist) > 10){
          c.x += Math.sign(followDist) * Math.min(3, Math.abs(followDist) * 0.1);
          c.facing = followDist >= 0 ? 1 : -1;
          c.moving = true;
        }else{
          c.moving = false;
        }
      }
    });
  }

  function drawFollowingCrew(){
    player.crew.forEach(c => {
      if (c.status !== "following" || c.x === undefined) return;
      const sx = worldToScreen(c.x);
      if (sx < -40 || sx > CANVAS_W + 40) return;
      drawWalterFigure(sx, c.y, COLORS.playerSteel, { moving: !!c.moving, airborne: false, climbing: false }, "crewHelmet");
      drawSword(sx, c.y, c.facing || 1, c.attackCooldown || 0, MELEE_COOLDOWN, false, null); // same sword + swing as the player, always available
    });
  }

  function updateAllies(){
    allies.forEach(a => {
      a.life--;
      if (a.cooldown > 0) a.cooldown--;
      const alive = enemies.filter(en => en.hp > 0);
      const target = alive.sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
      if (a.kind === "demon" || a.kind === "angel"){
        a.flyPhase = (a.flyPhase || 0) + 0.08;
        a.y = player.y - 20 + Math.sin(a.flyPhase) * 4; // gentle hover bob
        if (target){
          const dist = (target.x + target.w/2) - (a.x + PLAYER_W/2);
          const cfg = SPELLS[a.kind];
          if (Math.abs(dist) > cfg.preferredRange + 20){
            a.x += Math.sign(dist) * 2.4;
          }else if (Math.abs(dist) < cfg.preferredRange - 20){
            a.x -= Math.sign(dist) * 2.4;
          }else if (a.cooldown <= 0){
            playerProjectiles.push({
              type: a.kind === "demon" ? "demonBolt" : "angelBolt",
              x: a.x + PLAYER_W/2, y: a.y + PLAYER_H/2,
              vx: cfg.projectileSpeed * Math.sign(dist), damage: a.damage
            });
            a.cooldown = cfg.attackCooldown;
          }
        }
      }else if (target){
        const dist = (target.x + target.w/2) - (a.x + PLAYER_W/2);
        if (Math.abs(dist) > 30){
          a.x += Math.sign(dist) * 2.2;
          a.moving = true;
        }else{
          a.moving = false;
          if (a.cooldown <= 0){
            damageEnemy(target, a.damage);
            a.cooldown = 40;
          }
        }
      }else{
        a.moving = false;
      }
    });
    allies = allies.filter(a => a.life > 0 && a.hp > 0);
  }

  function updateGhosts(){
    if (ghosts.length === 0) return;
    ghosts.forEach(g => {
      g.life--;
      if (g.cooldown > 0) g.cooldown--;
      const alive = enemies.filter(en => en.hp > 0);
      const target = alive.sort((p, q) => Math.abs(p.x - g.x) - Math.abs(q.x - g.x))[0];
      if (target){
        const dist = (target.x + target.w/2) - (g.x + PLAYER_W/2);
        if (Math.abs(dist) > 30){
          g.x += Math.sign(dist) * 2.2;
        }else if (g.cooldown <= 0){
          damageEnemy(target, g.damage);
          g.cooldown = 40;
        }
      }
    });
    ghosts = ghosts.filter(g => g.life > 0);
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
  function drawMenuPrompt(){
    if (!nearMenuAction) return;
    const x = worldToScreen(player.x);
    ctx.fillStyle = COLORS.hud;
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("[Q] Open", x + PLAYER_W / 2, player.y - 10);
  }

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

    // Proximity only — no auto-open. Pressing Q (like T for villagers)
    // does the actual opening, so walking through the village doesn't
    // mean constantly dismissing menus that pop up on their own.
    const walkupHit = getWalkupAltars().find(a =>
      rectsOverlap(player.x, player.y, PLAYER_W, PLAYER_H, a.x, GROUND_Y - a.h, a.w, a.h)
    );

    const climb = activeClimbPoint();
    const atClimbTop = !!climb && player.y <= climb.topY - PLAYER_H + 20;

    nearMenuAction = walkupHit ? walkupHit.action : (atClimbTop ? climb.action : null);
  }

  function openMenuForAction(action){
    if (action === "map" && !mapOpen) openMap();
    else if (action === "altar" && !altarOpen) openAltar();
    else if (action === "townhall" && !townHallOpen) openTownHall();
    else if (action === "castle" && !castleUiOpen) openCastleUi();
    else if (action === "library" && !libraryUiOpen) openLibraryUi();
    else if (action === "blacksmith" && !blacksmithUiOpen) openBlacksmithUi();
    else if (action === "training" && !trainingUiOpen) openTrainingUi();
    else if (action === "graveyard" && !graveyardUiOpen) openGraveyardUi();
    else if (action === "land1Tower") openLand1Tower();
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
      drawHomebaseLibrary();
      drawHomebaseBlacksmith();
      drawHomebaseTraining();
      drawHomebaseGraveyard();
      drawVillagers();
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
    drawFollowingCrew();
    ghosts.forEach(drawGhost);
    effects.forEach(drawEffect);
    enemyProjectiles.forEach(p => drawProjectile(p));
    playerProjectiles.forEach(p => drawProjectile(p));
    drawPlayer();
    drawMenuPrompt();
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

  function drawVillagers(){
    if (currentMap !== "homebase") return;
    player.villagers.forEach(v => {
      const sx = worldToScreen(v.x) - PLAYER_W / 2;
      if (sx < -30 || sx > CANVAS_W + 30) return;
      const moving = v.wanderPauseFrames <= 0;
      drawWalterFigure(sx, GROUND_Y - PLAYER_H, COLORS.playerLeather, { moving, airborne: false, climbing: false }, "villagerHat");
      if (v.id === nearVillagerId){
        ctx.fillStyle = COLORS.hud;
        ctx.font = "700 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("[T] Talk", sx + PLAYER_W / 2, GROUND_Y - PLAYER_H - 10);
      }
    });
    // Trained crew doing their job also show up in the village, near
    // their assigned building — visual confirmation they're actually there.
    const libraryWorkerX = HOMEBASE_LIBRARY_X - 20;
    const blacksmithWorkerX = HOMEBASE_BLACKSMITH_X - 20;
    player.crew.forEach(c => {
      if (c.status === "idle" && c.x !== undefined){
        // wandering, same as untrained villagers, but in their crew look
        const sx = worldToScreen(c.x) - PLAYER_W / 2;
        if (sx < -30 || sx > CANVAS_W + 30) return;
        const moving = c.wanderPauseFrames <= 0;
        drawWalterFigure(sx, GROUND_Y - PLAYER_H, COLORS.playerSteel, { moving, airborne: false, climbing: false }, "crewHelmet");
        if (c.id === nearVillagerId){
          ctx.fillStyle = COLORS.hud;
          ctx.font = "700 10px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText("[T] Talk", sx + PLAYER_W / 2, GROUND_Y - PLAYER_H - 10);
        }
        return;
      }
      let wx = null;
      if (c.status === "library") wx = libraryWorkerX;
      else if (c.status === "blacksmith") wx = blacksmithWorkerX;
      if (wx === null) return;
      const sx = worldToScreen(wx) - PLAYER_W / 2;
      if (sx < -30 || sx > CANVAS_W + 30) return;
      drawWalterFigure(sx, GROUND_Y - PLAYER_H, COLORS.playerSteel, { moving: false, airborne: false, climbing: false }, "crewHelmet");
    });
  }

  function drawHomebaseLibrary(){
    const x = worldToScreen(HOMEBASE_LIBRARY_X);
    if (x < -40 || x > CANVAS_W + 40) return;
    const built = player.libraryLevel > 0;
    ctx.fillStyle = built ? COLORS.houseWall : COLORS.houseDecrepit;
    ctx.fillRect(x - 20, GROUND_Y - 50, 40, 50);
    ctx.fillStyle = built ? COLORS.townHallRoof : COLORS.houseDecrepitDark;
    ctx.beginPath();
    ctx.moveTo(x - 24, GROUND_Y - 50);
    ctx.lineTo(x, GROUND_Y - 66);
    ctx.lineTo(x + 24, GROUND_Y - 50);
    ctx.closePath();
    ctx.fill();
    if (built){
      // a couple of little "book" marks on the front to read as a library
      ctx.fillStyle = COLORS.mana;
      ctx.fillRect(x - 12, GROUND_Y - 30, 6, 10);
      ctx.fillRect(x - 3, GROUND_Y - 30, 6, 10);
      ctx.fillRect(x + 6, GROUND_Y - 30, 6, 10);
    }
  }

  function drawHomebaseBlacksmith(){
    const x = worldToScreen(HOMEBASE_BLACKSMITH_X);
    if (x < -40 || x > CANVAS_W + 40) return;
    const built = player.blacksmithBuilt;
    ctx.fillStyle = built ? COLORS.shrineStone : COLORS.houseDecrepit;
    ctx.fillRect(x - 20, GROUND_Y - 40, 40, 40);
    if (built){
      // a little forge glow
      ctx.fillStyle = COLORS.sunColor;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(frame * 0.15);
      ctx.beginPath();
      ctx.arc(x, GROUND_Y - 14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = built ? COLORS.shrineStoneDark : COLORS.houseDecrepitDark;
    ctx.fillRect(x - 22, GROUND_Y - 44, 44, 6);
  }

  function drawHomebaseTraining(){
    const x = worldToScreen(HOMEBASE_TRAINING_X);
    if (x < -50 || x > CANVAS_W + 50) return;
    const built = player.trainingGroundsBuilt;
    ctx.strokeStyle = built ? COLORS.houseDoor : COLORS.houseDecrepitDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 30, GROUND_Y - 20);
    ctx.lineTo(x - 30, GROUND_Y);
    ctx.moveTo(x + 30, GROUND_Y - 20);
    ctx.lineTo(x + 30, GROUND_Y);
    ctx.moveTo(x - 30, GROUND_Y - 20);
    ctx.lineTo(x + 30, GROUND_Y - 20);
    ctx.stroke();
    if (built){
      ctx.fillStyle = COLORS.houseDoor;
      ctx.beginPath();
      ctx.arc(x, GROUND_Y - 8, 8, 0, Math.PI * 2);
      ctx.fill(); // a practice dummy/target
    }
  }

  function drawHomebaseGraveyard(){
    const x = worldToScreen(HOMEBASE_GRAVEYARD_X);
    if (x < -50 || x > CANVAS_W + 50) return;
    const deadCount = player.crew.filter(c => c.status === "dead").length;
    ctx.fillStyle = COLORS.shrineDecrepitDark;
    ctx.fillRect(x - 40, GROUND_Y - 4, 80, 4); // low stone wall footing
    const stoneCount = Math.max(2, Math.min(6, deadCount + 2));
    for (let i = 0; i < stoneCount; i++){
      const sx = x - 32 + i * (64 / (stoneCount - 1));
      ctx.fillStyle = COLORS.shrineStone;
      ctx.fillRect(sx - 4, GROUND_Y - 22, 8, 18);
      ctx.beginPath();
      ctx.arc(sx, GROUND_Y - 22, 4, Math.PI, 0);
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
  function drawWalterFigure(x, y, bodyColor, movement, accessory){
    const cx = x + PLAYER_W / 2;
    const moving = !!(movement && movement.moving);
    const airborne = !!(movement && movement.airborne);
    const climbing = !!(movement && movement.climbing);

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
    const headCy = y + headR + 1;
    const torsoTop = y + headR * 2 + 2;
    const torsoH = 14;
    const torsoBottom = torsoTop + torsoH;
    const torsoW = 12;
    const legW = 4;
    const legTop = torsoBottom;
    const legBottom = y + PLAYER_H;

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

    // optional head accessory — villagers wear a wizard hat, trained
    // crew swap it for a helmet, matching the roadmap's own spec exactly
    if (accessory === "villagerHat"){
      ctx.fillStyle = COLORS.villagerHat;
      ctx.beginPath();
      ctx.moveTo(cx - 6, headCy - 2);
      ctx.lineTo(cx, headCy - 15);
      ctx.lineTo(cx + 6, headCy - 2);
      ctx.closePath();
      ctx.fill();
    }else if (accessory === "crewHelmet"){
      ctx.fillStyle = COLORS.crewHelmet;
      ctx.beginPath();
      ctx.arc(cx, headCy - 1, headR + 1.5, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - headR - 1.5, headCy - 1, (headR + 1.5) * 2, 3);
    }
  }

  // Eel Skin Armor's segmented charge display — drawn as an overlay on
  // top of the normal humanoid rig, since it's the one armor with a
  // dynamic, charge-driven look. Segments light from the waist upward
  // as charge builds; full charge adds flickering arcs off the shoulders.
  function drawEelSkinOverlay(x, y){
    const cx = x + PLAYER_W / 2;
    const torsoTop = y + 14, torsoH = 14, torsoW = 12;
    const segments = 4;
    const litSegments = Math.round((player.eelChargeMeter / 100) * segments);

    for (let i = 0; i < segments; i++){
      const segY = torsoTop + (segments - 1 - i) * (torsoH / segments); // i=0 is the waist, filling upward
      const isLit = i < litSegments;
      ctx.strokeStyle = isLit ? COLORS.eelSkinTrim : "rgba(95,212,232,0.25)";
      ctx.lineWidth = isLit ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(cx - torsoW/2, segY);
      ctx.lineTo(cx + torsoW/2, segY);
      ctx.stroke();
    }

    // small lightning-bolt emblem, center chest
    ctx.strokeStyle = COLORS.eelSkinEmblem;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 1, torsoTop + 3);
    ctx.lineTo(cx + 2, torsoTop + 7);
    ctx.lineTo(cx - 1, torsoTop + 7);
    ctx.lineTo(cx + 2, torsoTop + 11);
    ctx.stroke();

    // full charge: every segment glows, plus a few flickering arcs off the shoulders/forearms
    if (player.eelChargeMeter >= 100){
      ctx.strokeStyle = COLORS.eelSkinTrim;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(frame * 0.3);
      [[cx - torsoW/2 - 3, torsoTop + 2], [cx + torsoW/2 + 3, torsoTop + 2]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 3, sy + 4);
        ctx.lineTo(sx - 2, sy + 6);
        ctx.lineTo(sx + 4, sy + 10);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }

  function drawPlayer(){
    const x = worldToScreen(player.x);
    if (player.invulnFrames > 0 && Math.floor(frame / 4) % 2 === 0) return;
    const bodyColor = player.armorType === "leather" ? COLORS.playerLeather
      : player.armorType === "steel" ? COLORS.playerSteel
      : player.armorType === "goblin" ? COLORS.playerGoblin
      : player.armorType === "siren" ? COLORS.playerSiren
      : player.armorType === "eelSkin" ? COLORS.eelSkinBody
      : player.armorType === "cloak" ? COLORS.playerCloak
      : COLORS.player;

    const wasCloaked = player.cloakActiveFramesLeft > 0;
    if (wasCloaked) ctx.globalAlpha = 0.35; // visibly faded while invisible to enemies

    const playerMovement = {
      moving: (keysDown.has("ArrowLeft") || keysDown.has("ArrowRight")) && player.onGround && !player.onLadder,
      airborne: !player.onGround && !player.onLadder,
      climbing: player.onLadder
    };
    drawWalterFigure(x, player.y, bodyColor, playerMovement, null);
    if (player.armorType === "eelSkin") drawEelSkinOverlay(x, player.y);

    if (isOverOpenWater(player.x) && player.y > GROUND_Y - PLAYER_H){
      ctx.fillStyle = "rgba(44,110,142,0.5)"; // sinking below the surface
      ctx.fillRect(x, player.y, PLAYER_W, PLAYER_H);
    }
    if (player.burningFrames > 0){
      ctx.fillStyle = "rgba(225,75,60,0.45)"; // on fire, same treatment as a burning enemy
      ctx.fillRect(x, player.y, PLAYER_W, PLAYER_H);
    }

    if (!activeSpell){
      const sword = getEquippedSword();
      const isSOTGK = !!(sword && sword.type === "sotgk");
      drawSword(x, player.y, player.facing, meleeCooldown, MELEE_COOLDOWN, isSOTGK, computeSwordBladeTint(sword));
    }
    if (wasCloaked) ctx.globalAlpha = 1;
  }

  // Single tint per state — the SOTGK's own blade already carries the
  // white-edge/grey-core look as its base, so an imbue tint layers a
  // color on top of that via the outline; a standard sword's blade fill
  // just becomes that color directly. Fully stacked (all 3 imbues) gets
  // a distinct gold "ultimate" tint rather than picking one element.
  function computeSwordBladeTint(sword){
    if (!sword) return null;
    const imbues = Object.keys(sword.activeImbues || {});
    if (imbues.length === 0) return null;
    if (imbues.length >= 3) return COLORS.sotgkUltimate;
    if (imbues.includes("lightning")) return COLORS.imbueLightning;
    if (imbues.includes("fire")) return COLORS.imbueFire;
    return COLORS.imbueFreeze;
  }

  function drawSword(x, y, facing, attackCooldown, maxCooldown, isSOTGK, bladeTint){
    const swordDir = facing > 0 ? 1 : -1;
    const cx = x + PLAYER_W / 2;
    // Anchored to the humanoid figure's actual arm position now (was
    // anchored to the old full-body-width edges, which reads as
    // floating too far out once the body got real limbs).
    const handX = cx + 9 * swordDir;
    const handY = y + 23;

    // Quick swing: sweeps from a raised, wound-up pose down through to
    // the normal ready position over the first part of the melee
    // cooldown, then just holds there until the next swing is available.
    const SWING_DURATION = 10;
    const elapsed = maxCooldown - attackCooldown;
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

    // handle — the SOTGK gets its own brown leather-wrapped hilt color, per its spec
    ctx.strokeStyle = isSOTGK ? COLORS.swordHiltSOTGK : COLORS.swordHilt;
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

    // blade — a tapered shape from the guard to a pointed tip. Color
    // reflects the equipped sword's active imbue(s); the SOTGK additionally
    // gets its own two-tone crystalline look (bright white edge, opaque
    // grey core) instead of the plain steel color, per its spec.
    ctx.beginPath();
    ctx.moveTo(guardX + nx * bladeWidth, guardY + ny * bladeWidth);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(guardX - nx * bladeWidth, guardY - ny * bladeWidth);
    ctx.closePath();
    if (isSOTGK){
      ctx.fillStyle = COLORS.sotgkBladeCore;
      ctx.fill();
      ctx.strokeStyle = bladeTint || COLORS.sotgkBladeEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }else{
      ctx.fillStyle = bladeTint || COLORS.playerSword;
      ctx.fill();
    }
  }

  // Eight distinct boss silhouettes, per the visual design brief. All
  // still flat canvas primitives — no images — sized within the same
  // bounding box as the generic boss stats (w:60 h:92), so none of this
  // touches hitboxes or combat balance, purely the art on top of it.
  function drawBossFigure(en, x){
    const w = en.w, h = en.h, y = en.y;
    const cx = x + w / 2;
    if (en.bossBiomeId === "village"){
      // Commander — broad armored knight with a crimson cape
      ctx.fillStyle = COLORS.commanderCape;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 14);
      ctx.lineTo(x - 6, y + h);
      ctx.lineTo(x + w * 0.4, y + h);
      ctx.lineTo(x + w * 0.3, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.commanderArmor;
      ctx.fillRect(x + w * 0.15, y, w * 0.7, h * 0.85);
      ctx.fillRect(x + w * 0.25, y - 10, w * 0.5, 14); // helm
      ctx.fillStyle = COLORS.commanderCape;
      ctx.fillRect(x + w * 0.15, y + h * 0.3, w * 0.7, 6); // trim band

    }else if (en.bossBiomeId === "castlewalls"){
      // Royal Champion — slim duelist with an oversized kite shield
      ctx.fillStyle = COLORS.championArmor;
      ctx.fillRect(x + w * 0.32, y, w * 0.36, h * 0.85);
      ctx.fillRect(x + w * 0.36, y - 8, w * 0.28, 10); // helm
      ctx.fillStyle = COLORS.championShield;
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x + w * 0.42, y + 4);
      ctx.lineTo(x + w * 0.42, y + h * 0.7);
      ctx.lineTo(x + w * 0.2, y + h);
      ctx.lineTo(x, y + h * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = COLORS.championShieldRim;
      ctx.lineWidth = 2;
      ctx.stroke();

    }else if (en.bossBiomeId === "forest"){
      // Fey Queen — floating green robe, antler crown
      const hover = Math.sin(frame * 0.05) * 4;
      ctx.fillStyle = COLORS.feyQueenRobe;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.3 + hover);
      ctx.lineTo(x + w * 0.8, y + h * 0.3 + hover);
      ctx.lineTo(x + w, y + h * 0.9 + hover);
      ctx.lineTo(x, y + h * 0.9 + hover);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + w * 0.3, y + hover, w * 0.4, h * 0.35); // torso/head block
      ctx.strokeStyle = COLORS.feyQueenAntler;
      ctx.lineWidth = 2;
      [-1, 1].forEach(dir => {
        ctx.beginPath();
        ctx.moveTo(cx + dir * 6, y + hover);
        ctx.lineTo(cx + dir * 16, y - 14 + hover);
        ctx.moveTo(cx + dir * 10, y - 4 + hover);
        ctx.lineTo(cx + dir * 20, y - 8 + hover);
        ctx.stroke();
      });

    }else if (en.bossBiomeId === "jungle"){
      // Serpent King — coiled cobra with hood and crown
      ctx.fillStyle = COLORS.serpentKingScale;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + h);
      ctx.quadraticCurveTo(x, y + h * 0.7, x + w * 0.3, y + h * 0.4);
      ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.15, x + w * 0.5, y + 10);
      ctx.quadraticCurveTo(x + w * 0.7, y + h * 0.4, x + w * 0.5, y + h * 0.55);
      ctx.quadraticCurveTo(x + w * 0.75, y + h * 0.75, x + w * 0.5, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.serpentKingHood;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + 6);
      ctx.lineTo(x + w * 0.5, y - 8);
      ctx.lineTo(x + w * 0.8, y + 6);
      ctx.lineTo(x + w * 0.5, y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.serpentKingCrown;
      ctx.fillRect(x + w * 0.42, y - 16, w * 0.16, 8);

    }else if (en.bossBiomeId === "swamp"){
      // Bog Titan — huge moss brute with a stone shoulder
      ctx.fillStyle = COLORS.bogTitanMoss;
      ctx.fillRect(x - 4, y, w + 8, h); // extra-wide, bulky
      ctx.fillStyle = COLORS.bogTitanMossDark;
      ctx.fillRect(x - 4, y + h * 0.55, w + 8, 10);
      ctx.fillStyle = COLORS.bogTitanStone;
      ctx.beginPath();
      ctx.arc(x + w * 0.78, y + h * 0.18, 16, 0, Math.PI * 2);
      ctx.fill();

    }else if (en.bossBiomeId === "desert"){
      // Sand Colossus — blocky sandstone giant with orbiting shards
      ctx.fillStyle = COLORS.sandColossusBody;
      ctx.fillRect(x, y, w, h * 0.4);
      ctx.fillRect(x + 4, y + h * 0.4, w - 8, h * 0.3);
      ctx.fillRect(x + 8, y + h * 0.7, w - 16, h * 0.3);
      ctx.fillStyle = COLORS.sandColossusDark;
      ctx.fillRect(x, y + h * 0.38, w, 4);
      ctx.fillRect(x + 4, y + h * 0.68, w - 8, 4);
      for (let i = 0; i < 3; i++){
        const angle = frame * 0.03 + i * (Math.PI * 2 / 3);
        const ox = cx + Math.cos(angle) * (w * 0.75);
        const oy = y + h * 0.4 + Math.sin(angle) * 14;
        ctx.fillStyle = COLORS.sandColossusShard;
        ctx.fillRect(ox - 3, oy - 3, 6, 6);
      }

    }else if (en.bossBiomeId === "treehouses"){
      // Elder Dryad — floating tree spirit with a leaf halo
      const hover = Math.sin(frame * 0.05) * 4;
      ctx.fillStyle = COLORS.elderDryadTrunk;
      ctx.fillRect(x + w * 0.3, y + 12 + hover, w * 0.4, h * 0.8);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.15, y + h + hover);
      ctx.lineTo(x + w * 0.3, y + h * 0.75 + hover);
      ctx.lineTo(x + w * 0.4, y + h + hover);
      ctx.moveTo(x + w * 0.85, y + h + hover);
      ctx.lineTo(x + w * 0.7, y + h * 0.75 + hover);
      ctx.lineTo(x + w * 0.6, y + h + hover);
      ctx.fill();
      ctx.fillStyle = COLORS.elderDryadLeaf;
      for (let i = 0; i < 8; i++){
        const angle = (i / 8) * Math.PI * 2;
        const lx = cx + Math.cos(angle) * 20;
        const ly = y + hover + Math.sin(angle) * 14;
        ctx.beginPath();
        ctx.arc(lx, ly, 5, 0, Math.PI * 2);
        ctx.fill();
      }

    }else if (en.bossBiomeId === "underwater"){
      // Leviathan — giant sea serpent with a towering dorsal fin
      ctx.fillStyle = COLORS.leviathanBody;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.quadraticCurveTo(x + w * 0.2, y + h * 0.3, x + w * 0.5, y + h * 0.5);
      ctx.quadraticCurveTo(x + w * 0.8, y + h * 0.7, x + w, y + h * 0.2);
      ctx.lineTo(x + w, y + h * 0.45);
      ctx.quadraticCurveTo(x + w * 0.75, y + h * 0.85, x + w * 0.45, y + h * 0.65);
      ctx.quadraticCurveTo(x + w * 0.25, y + h * 0.5, x + w * 0.15, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.leviathanFin;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.35, y + h * 0.4);
      ctx.lineTo(x + w * 0.5, y - 22);
      ctx.lineTo(x + w * 0.6, y + h * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.leviathanBodyDark;
      ctx.beginPath();
      ctx.arc(x + w * 0.85, y + h * 0.35, 4, 0, Math.PI * 2);
      ctx.fill();

    }else{
      // Fallback — any future boss without a bespoke design yet still
      // reads clearly as a boss rather than breaking.
      ctx.fillStyle = COLORS.bossBody;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = COLORS.bossTrim;
      ctx.fillRect(x, y, w, 10);
      ctx.fillRect(x, y + h - 10, w, 6);
    }
  }

  function drawEnemy(en){
    if (en.hp <= 0) return;
    const x = worldToScreen(en.x);
    if (x < -40 || x > CANVAS_W + 40) return;

    if (en.type === "knight"){
      const w = en.w, h = en.h, y = en.y, cx = x + w/2;
      // legs, with a walking swing while approaching (same pattern as
      // the player/villager rig) — still while attacking or idle
      const legSwing = en.moving ? Math.sin(frame * 0.35) * 3 : 0;
      ctx.fillStyle = COLORS.knightPauldron;
      ctx.fillRect(x + 4 + legSwing, y + h - 10, 6, 10);
      ctx.fillRect(x + w - 10 - legSwing, y + h - 10, 6, 10);
      // torso
      ctx.fillStyle = COLORS.knight;
      ctx.fillRect(x + 4, y + 14, w - 8, h - 24);
      // oversized pauldrons, widening the shoulders past the torso
      ctx.fillStyle = COLORS.knightPauldron;
      ctx.fillRect(x - 3, y + 12, 10, 8);
      ctx.fillRect(x + w - 7, y + 12, 10, 8);
      // helmet with a T-shaped visor
      ctx.fillStyle = COLORS.knight;
      ctx.beginPath();
      ctx.arc(cx, y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.knightVisor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, y + 2); ctx.lineTo(cx, y + 12);
      ctx.moveTo(cx - 4, y + 7); ctx.lineTo(cx + 4, y + 7);
      ctx.stroke();
      // short sword at the hip
      ctx.fillStyle = COLORS.knightSword;
      ctx.fillRect(x + w - 4, y + h * 0.45, 3, 12);

    }else if (en.type === "archer"){
      const w = en.w, h = en.h, y = en.y, cx = x + w/2;
      // thin legs, with the same walking swing while moving (approach
      // or backing off) as the knight uses, still while firing
      const legSwing = en.moving ? Math.sin(frame * 0.35) * 2.5 : 0;
      ctx.fillStyle = COLORS.archerHood;
      ctx.fillRect(cx - 5 + legSwing, y + h - 10, 4, 10);
      ctx.fillRect(cx + 1 - legSwing, y + h - 10, 4, 10);
      // tunic
      ctx.fillStyle = COLORS.archerTunic;
      ctx.fillRect(cx - 6, y + 10, 12, h - 20);
      // hood, a rounded arc over the head
      ctx.fillStyle = COLORS.archerHood;
      ctx.beginPath();
      ctx.arc(cx, y + 8, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 7, y + 8, 14, 5);
      // tall bow spanning nearly the full height, with a straight string
      ctx.strokeStyle = COLORS.archerBow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w - 2, y + h/2, h/2 - 2, -Math.PI/2.3, Math.PI/2.3);
      ctx.stroke();
      ctx.strokeStyle = COLORS.archerHood;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w - 2, y + 4);
      ctx.lineTo(x + w - 2, y + h - 4);
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
      const w = en.w, h = en.h, y = en.y, cx = x + w/2;
      if (en.burrowed){
        // low sand mound with the wedge head poking through
        ctx.fillStyle = COLORS.sandwormBodyDark;
        ctx.beginPath();
        ctx.ellipse(cx, GROUND_Y - 4, w * 0.6, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.sandwormBody;
        ctx.beginPath();
        ctx.moveTo(cx - 6, GROUND_Y - 4);
        ctx.lineTo(cx, GROUND_Y - 16);
        ctx.lineTo(cx + 6, GROUND_Y - 4);
        ctx.closePath();
        ctx.fill();
      }else{
        // 3-4 overlapping segments tapering toward the tail
        const segments = 4;
        for (let i = segments - 1; i >= 0; i--){
          const t = i / (segments - 1); // 0 = head, 1 = tail
          const segY = y + h * 0.35 + t * h * 0.5;
          const segR = (w * 0.42) * (1 - t * 0.45);
          ctx.fillStyle = i === 0 ? COLORS.sandwormBody : COLORS.sandwormBodyDark;
          ctx.beginPath();
          ctx.arc(cx, segY, segR, 0, Math.PI * 2);
          ctx.fill();
        }
        // wedge-shaped head rising above the segments
        ctx.fillStyle = COLORS.sandwormBody;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.3, y + h * 0.35);
        ctx.lineTo(cx, y);
        ctx.lineTo(cx + w * 0.3, y + h * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = COLORS.sandwormMouth;
        ctx.beginPath();
        ctx.arc(cx, y + h * 0.18, w * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
    }else if (en.type === "fey"){
      const w = en.w, h = en.h, y = en.y, cx = x + w/2;
      // narrow robe, a trapezoid tapering to a point instead of legs
      ctx.fillStyle = COLORS.feyBody;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.32, y + h * 0.3);
      ctx.lineTo(cx + w * 0.32, y + h * 0.3);
      ctx.lineTo(cx, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - w * 0.2, y, w * 0.4, h * 0.32); // head/torso block
      // small leaf-like arms
      ctx.fillStyle = COLORS.feyArm;
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.38, y + h * 0.35, 5, 2.5, 0.6, 0, Math.PI * 2);
      ctx.ellipse(cx + w * 0.38, y + h * 0.35, 5, 2.5, -0.6, 0, Math.PI * 2);
      ctx.fill();
      // floating orb — the signature cue
      ctx.fillStyle = COLORS.feyGlow;
      ctx.beginPath();
      ctx.arc(cx + w * 0.42, y + h * 0.25 + Math.sin(frame * 0.1) * 2, 4, 0, Math.PI * 2);
      ctx.fill();

    }else if (en.type === "fairy"){
      const w = en.w, h = en.h, y = en.y, cx = x + w/2;
      // oversized teardrop wings, extending well past the tiny body
      ctx.fillStyle = COLORS.fairyWing;
      [-1, 1].forEach(dir => {
        ctx.beginPath();
        ctx.moveTo(cx, y + h * 0.35);
        ctx.quadraticCurveTo(cx + dir * w * 1.1, y - h * 0.1, cx + dir * w * 0.9, y + h * 0.45);
        ctx.quadraticCurveTo(cx + dir * w * 0.5, y + h * 0.55, cx, y + h * 0.5);
        ctx.closePath();
        ctx.fill();
      });
      // tiny round body + head
      ctx.fillStyle = COLORS.fairyBody;
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.4, w * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // short dangling legs
      ctx.strokeStyle = COLORS.fairyLeg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 2, y + h * 0.55); ctx.lineTo(cx - 3, y + h * 0.8);
      ctx.moveTo(cx + 2, y + h * 0.55); ctx.lineTo(cx + 3, y + h * 0.8);
      ctx.stroke();

    }else if (en.type === "siren"){
      const w = en.w, h = en.h, y = en.y, cx = x + w/2;
      // lower body, mostly hidden beneath the hair cloak
      ctx.fillStyle = COLORS.sirenBody;
      ctx.fillRect(cx - w * 0.2, y + h * 0.55, w * 0.4, h * 0.45);
      // dramatic triangular hair cloak reaching to the waist
      ctx.fillStyle = COLORS.sirenHair;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx - w * 0.4, y + h * 0.6);
      ctx.lineTo(cx + w * 0.4, y + h * 0.6);
      ctx.closePath();
      ctx.fill();
      // extended arm holding a fan-shaped shell
      ctx.strokeStyle = COLORS.sirenBody;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.2, y + h * 0.4);
      ctx.lineTo(x + w + 4, y + h * 0.3);
      ctx.stroke();
      ctx.fillStyle = COLORS.sirenShell;
      ctx.beginPath();
      ctx.arc(x + w + 6, y + h * 0.3, 6, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

    }else if (en.type === "mermaid"){
      const w = en.w, h = en.h, y = en.y, cx = x + w/2;
      // upper torso
      ctx.fillStyle = COLORS.mermaidBody;
      ctx.fillRect(cx - w * 0.22, y, w * 0.44, h * 0.4);
      // long sweeping tail curving to one side rather than straight down
      ctx.fillStyle = COLORS.mermaidTail;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.2, y + h * 0.35);
      ctx.quadraticCurveTo(cx + w * 0.5, y + h * 0.6, cx + w * 0.15, y + h * 0.85);
      ctx.quadraticCurveTo(cx + w * 0.05, y + h * 0.95, cx - w * 0.15, y + h * 0.8);
      ctx.quadraticCurveTo(cx + w * 0.15, y + h * 0.55, cx - w * 0.05, y + h * 0.35);
      ctx.closePath();
      ctx.fill();
      // small hip fins
      ctx.fillStyle = COLORS.mermaidFin;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.22, y + h * 0.4); ctx.lineTo(cx - w * 0.4, y + h * 0.45); ctx.lineTo(cx - w * 0.18, y + h * 0.5);
      ctx.closePath();
      ctx.fill();
      // broad V-shaped fin at the tail's end
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.05, y + h * 0.8);
      ctx.lineTo(cx + w * 0.32, y + h * 0.72);
      ctx.lineTo(cx + w * 0.1, y + h);
      ctx.lineTo(cx - w * 0.05, y + h * 0.9);
      ctx.closePath();
      ctx.fill();

    }else if (en.type === "ogre"){
      const w = en.w, h = en.h, y = en.y;
      // small head
      ctx.fillStyle = COLORS.ogreBody;
      ctx.beginPath();
      ctx.arc(x + w/2, y + 7, 6, 0, Math.PI * 2);
      ctx.fill();
      // tusks
      ctx.fillStyle = COLORS.ogreTusk;
      ctx.beginPath();
      ctx.moveTo(x + w/2 - 5, y + 9); ctx.lineTo(x + w/2 - 8, y + 14); ctx.lineTo(x + w/2 - 3, y + 11);
      ctx.moveTo(x + w/2 + 5, y + 9); ctx.lineTo(x + w/2 + 8, y + 14); ctx.lineTo(x + w/2 + 3, y + 11);
      ctx.fill();
      // huge torso
      ctx.fillStyle = COLORS.ogreBody;
      ctx.fillRect(x, y + 14, w, h * 0.6);
      ctx.fillStyle = COLORS.ogreBodyDark;
      ctx.fillRect(x, y + 22, w, 8);
      // oversized fists hanging below the knees — the defining feature
      ctx.fillStyle = COLORS.ogreFist;
      ctx.beginPath();
      ctx.arc(x - 2, y + h - 6, 8, 0, Math.PI * 2);
      ctx.arc(x + w + 2, y + h - 6, 8, 0, Math.PI * 2);
      ctx.fill();

    }else if (en.type === "snake"){
      const w = en.w, h = en.h, y = en.y, cx = x + w/2;
      // winding S-shaped body from overlapping circles instead of one oval
      ctx.fillStyle = COLORS.snakeBody;
      const bodyPts = [
        [cx - w * 0.35, y + h * 0.75], [cx - w * 0.1, y + h * 0.55], [cx + w * 0.2, y + h * 0.5],
        [cx + w * 0.35, y + h * 0.3], [cx + w * 0.15, y + h * 0.15]
      ];
      bodyPts.forEach(([px, py], i) => {
        ctx.beginPath();
        ctx.arc(px, py, w * 0.22 * (1 - i * 0.08), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = COLORS.snakeBelly;
      bodyPts.slice(0, 3).forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      // broad triangular raised head with a forked tongue
      const [hx, hy] = bodyPts[bodyPts.length - 1];
      ctx.fillStyle = COLORS.snakeBody;
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy + 2); ctx.lineTo(hx + 7, hy - 2); ctx.lineTo(hx - 2, hy - 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = COLORS.snakeTongue;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx + 6, hy - 1); ctx.lineTo(hx + 11, hy - 3);
      ctx.moveTo(hx + 9, hy - 2); ctx.lineTo(hx + 11, hy);
      ctx.stroke();

    }else if (en.isBoss){
      drawBossFigure(en, x);
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
      ctx.fillStyle = en.whiteBurn ? "rgba(245,240,230,0.5)" : "rgba(225,75,60,0.45)";
      ctx.fillRect(x, en.y, en.w, en.h);
    }

    ctx.fillStyle = COLORS.hpBad;
    ctx.fillRect(x, en.y - 8, en.w, 3);
    ctx.fillStyle = COLORS.hpGood;
    ctx.fillRect(x, en.y - 8, en.w * Math.max(0, en.hp / en.maxHp), 3);
  }

  function drawAlly(a){
    const x = worldToScreen(a.x);
    if (a.kind === "demon" || a.kind === "angel"){
      const bodyColor = a.kind === "demon" ? COLORS.demonBody : COLORS.angelBody;
      const wingColor = a.kind === "demon" ? COLORS.demonWing : COLORS.angelWing;
      const cx = x + PLAYER_W / 2, cy = a.y + PLAYER_H / 2;
      const flap = Math.sin(frame * 0.3) * 5; // small animated wing flap
      // wings, drawn behind the body
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.ellipse(cx - 7, cy - 2 + flap * 0.3, 6, 3 + Math.abs(flap) * 0.4, 0.5, 0, Math.PI * 2);
      ctx.ellipse(cx + 7, cy - 2 - flap * 0.3, 6, 3 + Math.abs(flap) * 0.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // small body — a compact person, not full player size
      ctx.fillStyle = COLORS.playerSkin;
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = bodyColor;
      ctx.fillRect(cx - 3, cy - 3, 6, 10);
      ctx.fillRect(cx - 2, cy + 7, 2, 5);
      ctx.fillRect(cx + 1, cy + 7, 2, 5);
    }else{
      // melee ally — a proper yellow humanoid using the same rig and
      // walk animation as the player/villagers, not a flat rectangle
      drawWalterFigure(x, a.y, COLORS.allyYellow, { moving: !!a.moving, airborne: false, climbing: false }, null);
    }
  }

  function drawGhost(g){
    const x = worldToScreen(g.x);
    ctx.globalAlpha = 0.55;
    drawWalterFigure(x, g.y, COLORS.ghostBody, { moving: true, airborne: false, climbing: false }, null);
    ctx.globalAlpha = 1;
  }

  function drawProjectile(p){
    const x = worldToScreen(p.x);
    if (p.type === "fireball"){
      ctx.fillStyle = COLORS.fireball;
      ctx.beginPath(); ctx.arc(x, p.y, 7, 0, Math.PI*2); ctx.fill();
    }else if (p.type === "crewBolt"){
      ctx.fillStyle = COLORS.playerSteel;
      ctx.beginPath(); ctx.arc(x, p.y, 4, 0, Math.PI*2); ctx.fill();
    }else if (p.type === "demonBolt"){
      ctx.fillStyle = COLORS.demonBody;
      ctx.beginPath(); ctx.arc(x, p.y, 5, 0, Math.PI*2); ctx.fill();
    }else if (p.type === "angelBolt"){
      ctx.strokeStyle = COLORS.angelBody;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 6, p.y - 4); ctx.lineTo(x, p.y); ctx.lineTo(x - 6, p.y + 4);
      ctx.moveTo(x, p.y); ctx.lineTo(x + 6, p.y);
      ctx.stroke();
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
    }else if (fx.type === "lightning-link"){
      ctx.strokeStyle = COLORS.lightning;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(worldToScreen(fx.x1), fx.y1);
      ctx.lineTo(worldToScreen(fx.x2), fx.y2);
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
      if (fx.isNebula){
        // thin glowing violet ring
        ctx.strokeStyle = COLORS.nebulaRing;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, fx.y, fx.radius * 0.7, 0, Math.PI*2);
        ctx.stroke();
        // orbiting particles
        ctx.fillStyle = COLORS.nebulaParticle;
        for (let i = 0; i < 4; i++){
          const angle = frame * 0.04 + i * (Math.PI / 2);
          const ox = x + Math.cos(angle) * fx.radius * 0.85;
          const oy = fx.y + Math.sin(angle) * fx.radius * 0.85;
          ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI*2); ctx.fill();
        }
        // persistent lightning — random flickering zigzag arcs radiating
        // outward, regenerated most frames so they constantly crackle
        const arcCount = 6; // within the spec's 4-8 range
        ctx.strokeStyle = COLORS.lightning;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < arcCount; i++){
          const angle = (i / arcCount) * Math.PI * 2 + frame * 0.02;
          const len = fx.radius * (0.6 + Math.random() * 0.7);
          const midAngle = angle + (Math.random() - 0.5) * 0.5;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * fx.radius, fx.y + Math.sin(angle) * fx.radius);
          ctx.lineTo(x + Math.cos(midAngle) * len * 0.6, fx.y + Math.sin(midAngle) * len * 0.6);
          ctx.lineTo(x + Math.cos(angle) * len, fx.y + Math.sin(angle) * len);
          ctx.stroke();
        }
      }
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
        ctx.fillText("broken — repair for " + armorRepairCost(player.armorType) + " silver", 138, 34);
      }
    }

    if (player.armorType === "eelSkin"){
      const chargeY = (player.armorType && player.armorMaxHp > 0) ? 38 : 27;
      ctx.fillStyle = COLORS.armorBg;
      ctx.fillRect(12, chargeY, 120, 6);
      ctx.fillStyle = COLORS.eelSkinTrim;
      ctx.fillRect(12, chargeY, 120 * (player.eelChargeMeter / 100), 6);
      ctx.strokeStyle = COLORS.hud;
      ctx.lineWidth = 1;
      ctx.strokeRect(12, chargeY, 120, 6);
      ctx.fillStyle = COLORS.hud;
      ctx.font = "700 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("eel charge " + Math.floor(player.eelChargeMeter) + "%", 138, chargeY + 6);
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
    if (!altarOpen && !mapOpen && !rareAltarOpen && !townHallOpen && !castleUiOpen && !libraryUiOpen && !blacksmithUiOpen && !trainingUiOpen && !graveyardUiOpen && !villagerMenuOpen) update();
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
    const spellCount = loadedProgress.spells.unlocked.length;
    const silver = loadedProgress.playerStats.silver;
    const crystals = loadedProgress.playerStats.bankedCrystals;
    const equippedArmor = loadedProgress.armorInventory.equipped;
    const hasAnything = spellCount > 0 || silver > 0 || crystals > 0 || !!equippedArmor;
    if (!hasAnything) return `<p style="font-size:0.8rem;opacity:0.8;">New save — starting fresh.</p>`;
    const armorLabel = equippedArmor && ARMOR[equippedArmor] ? ARMOR[equippedArmor].label : "no armor";
    return `<p style="font-size:0.8rem;opacity:0.8;">Welcome back — loaded ${spellCount} spell${spellCount === 1 ? "" : "s"}, ${silver} silver, ${crystals} banked crystals, ${armorLabel}.</p>`;
  }

  function showStartOverlay(){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>And So I Wander</h3>
      <p>Arrow keys to move, Up to jump or climb the tower ladder, Space to swing your sword (or cast your active spell). Number keys switch spells once you've unlocked them at the altar.</p>
      ${progressSummaryHTML()}
      <button type="button" class="btn" id="wvw-play-btn">Play</button>
    `;
    document.getElementById("wvw-play-btn").addEventListener("click", startGame);
  }

  function showLoginOverlay(){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>And So I Wander</h3>
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
      // Decoding is separated from the network call on purpose: a
      // successful login with a save that fails to parse is a totally
      // different problem than "couldn't reach the server", and was
      // previously reported with the same misleading message either way.
      try{
        loadedProgress = decodeProgress(res.progress);
      }catch(decodeErr){
        console.error("[WvW] save data failed to load — starting fresh instead of blocking login", decodeErr);
        loadedProgress = null; // resetState()'s defaults apply; nothing is lost server-side, the raw save string is untouched
        statusEl.textContent = "Logged in, but your save couldn't be read — starting fresh this session.";
        statusEl.style.color = "var(--red)";
      }
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
    altarActiveTab = "spells";
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

  function openVillagerMenu(villagerId){
    villagerMenuOpen = true;
    renderVillagerMenu(villagerId);
    overlay.style.display = "flex";
  }
  function closeVillagerMenu(){
    villagerMenuOpen = false;
    hideOverlay();
    canvas.focus();
  }
  function renderVillagerMenu(villagerId){
    const v = player.villagers.find(x => x.id === villagerId);
    if (v){
      const canRecruit = player.trainingGroundsBuilt;
      const affordable = player.silver >= RECRUIT_COST_SILVER;
      overlayInner.innerHTML = `
        <h3>A Villager</h3>
        <p>Strength: ${v.strength} (potential damage/sec once trained)</p>
        ${canRecruit
          ? `<button type="button" class="btn" id="wvw-recruit-btn" ${affordable ? "" : "disabled"}>Recruit (${RECRUIT_COST_SILVER} silver)</button>`
          : `<p style="opacity:0.7;font-size:0.85rem;">Training Grounds must be built before villagers can be recruited.</p>`
        }
        <button type="button" class="btn light" id="wvw-villager-close" style="margin-top:10px;">Close</button>
      `;
      const recruitBtn = document.getElementById("wvw-recruit-btn");
      if (recruitBtn) recruitBtn.addEventListener("click", () => {
        if (recruitVillager(villagerId)){
          closeVillagerMenu();
          saveProgress();
        }
      });
      document.getElementById("wvw-villager-close").addEventListener("click", closeVillagerMenu);
      return;
    }

    const c = player.crew.find(x => x.id === villagerId);
    if (!c){ closeVillagerMenu(); return; }
    const following = c.status === "following";
    const knownLabel = (c.spellsKnown && c.spellsKnown.length)
      ? c.spellsKnown.map(k => SPELLS[k] ? SPELLS[k].label : k).join(", ")
      : "None yet — assign them to the Library to learn some.";
    overlayInner.innerHTML = `
      <h3>Trained Crew — ${c.id}</h3>
      <p>Strength: ${c.strength} (sword damage). Spells known: ${knownLabel}</p>
      <button type="button" class="btn ${following ? "light" : ""}" id="wvw-crew-follow-toggle">${following ? "Unassign" : "Assign to follow you"}</button>
      <button type="button" class="btn light" id="wvw-villager-close" style="margin-top:10px;">Close</button>
    `;
    document.getElementById("wvw-crew-follow-toggle").addEventListener("click", () => {
      const ok = following ? unassignCrewFromFollow(c.id) : assignCrewToFollow(c.id);
      if (ok){
        closeVillagerMenu();
        saveProgress();
      }
    });
    document.getElementById("wvw-villager-close").addEventListener("click", closeVillagerMenu);
  }

  function openLibraryUi(){
    libraryUiOpen = true;
    renderLibraryUi();
    overlay.style.display = "flex";
  }
  function closeLibraryUi(){
    libraryUiOpen = false;
    hideOverlay();
    canvas.focus();
  }
  function renderLibraryUi(){
    if (!player.castleRebuilt){
      overlayInner.innerHTML = `
        <h3>Library</h3>
        <p>A pile of rubble — the Castle must be rebuilt before this can be remodeled.</p>
        <button type="button" class="btn light" id="wvw-library-close" style="margin-top:10px;">Close</button>
      `;
      document.getElementById("wvw-library-close").addEventListener("click", closeLibraryUi);
      return;
    }
    if (player.libraryLevel === 0){
      const affordable = player.silver >= LIBRARY_REMODEL_COST;
      overlayInner.innerHTML = `
        <h3>Library</h3>
        <p>A decrepit shell. Remodeling costs ${LIBRARY_REMODEL_COST} silver.</p>
        <button type="button" class="btn" id="wvw-library-remodel-btn" ${affordable ? "" : "disabled"}>Remodel (${LIBRARY_REMODEL_COST} silver)</button>
        <button type="button" class="btn light" id="wvw-library-close" style="margin-top:10px;">Close</button>
      `;
      document.getElementById("wvw-library-remodel-btn").addEventListener("click", () => {
        if (player.silver >= LIBRARY_REMODEL_COST){
          player.silver -= LIBRARY_REMODEL_COST;
          player.libraryLevel = 1;
          renderLibraryUi();
          saveProgress();
        }
      });
      document.getElementById("wvw-library-close").addEventListener("click", closeLibraryUi);
      return;
    }

    const upgradeAffordable = totalCrystals() >= LIBRARY_UPGRADE_COST_CRYSTALS;
    const idleCrew = player.crew.filter(c => c.status === "idle");
    const learningCrew = player.crew.filter(c => c.status === "library");
    const crewRows = idleCrew.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
        <span>${c.id} (Str ${c.strength})</span>
        <button type="button" class="btn light" style="padding:5px 10px;font-size:0.78rem;" data-assign-library="${c.id}">Assign to learn a spell</button>
      </div>
    `).join("");
    const learningRows = learningCrew.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;">
        <span>${c.id} — learning (${Math.ceil(c.framesRemaining / FRAMES_PER_MINUTE)} min left)</span>
        <button type="button" class="btn light" style="padding:5px 10px;font-size:0.78rem;" data-unassign="${c.id}">Recall</button>
      </div>
    `).join("");

    overlayInner.innerHTML = `
      <h3>Library — Level ${player.libraryLevel}</h3>
      <p>+${Math.round(player.libraryLevel * LIBRARY_DAMAGE_BONUS_PER_LEVEL * 100)}% spell damage. Upgrading costs ${LIBRARY_UPGRADE_COST_CRYSTALS} crystals and adds another +${Math.round(LIBRARY_DAMAGE_BONUS_PER_LEVEL * 100)}%.</p>
      <button type="button" class="btn" id="wvw-library-upgrade-btn" ${upgradeAffordable ? "" : "disabled"}>Upgrade (${LIBRARY_UPGRADE_COST_CRYSTALS} crystals)</button>
      <p style="font-weight:700;margin:14px 0 4px;">Learning (${LIBRARY_LEARNING_DURATION_MINUTES} min/spell)</p>
      <div style="text-align:left;">${learningRows || `<p style="opacity:0.7;font-size:0.85rem;">No crew currently studying.</p>`}</div>
      <p style="font-weight:700;margin:14px 0 4px;">Assign idle crew</p>
      <div style="text-align:left;">${crewRows || `<p style="opacity:0.7;font-size:0.85rem;">No idle crew available.</p>`}</div>
      <button type="button" class="btn light" id="wvw-library-close" style="margin-top:14px;">Close</button>
    `;
    document.getElementById("wvw-library-upgrade-btn").addEventListener("click", () => {
      if (totalCrystals() >= LIBRARY_UPGRADE_COST_CRYSTALS){
        spendCrystals(LIBRARY_UPGRADE_COST_CRYSTALS);
        player.libraryLevel++;
        renderLibraryUi();
        saveProgress();
      }
    });
    overlayInner.querySelectorAll("button[data-assign-library]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (assignCrewToLibrary(btn.dataset.assignLibrary)){
          renderLibraryUi();
          saveProgress();
        }
      });
    });
    overlayInner.querySelectorAll("button[data-unassign]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (unassignCrew(btn.dataset.unassign)){
          renderLibraryUi();
          saveProgress();
        }
      });
    });
    document.getElementById("wvw-library-close").addEventListener("click", closeLibraryUi);
  }

  function openBlacksmithUi(){
    blacksmithUiOpen = true;
    renderBlacksmithUi();
    overlay.style.display = "flex";
  }
  function closeBlacksmithUi(){
    blacksmithUiOpen = false;
    hideOverlay();
    canvas.focus();
  }
  function renderBlacksmithUi(){
    if (!player.blacksmithBuilt){
      const affordable = player.silver >= BLACKSMITH_REMODEL_COST;
      overlayInner.innerHTML = `
        <h3>Blacksmith</h3>
        <p>A cold forge. Remodeling costs ${BLACKSMITH_REMODEL_COST} silver.</p>
        <button type="button" class="btn" id="wvw-blacksmith-remodel-btn" ${affordable ? "" : "disabled"}>Remodel (${BLACKSMITH_REMODEL_COST} silver)</button>
        <button type="button" class="btn light" id="wvw-blacksmith-close" style="margin-top:10px;">Close</button>
      `;
      document.getElementById("wvw-blacksmith-remodel-btn").addEventListener("click", () => {
        if (player.silver >= BLACKSMITH_REMODEL_COST){
          player.silver -= BLACKSMITH_REMODEL_COST;
          player.blacksmithBuilt = true;
          renderBlacksmithUi();
          saveProgress();
        }
      });
      document.getElementById("wvw-blacksmith-close").addEventListener("click", closeBlacksmithUi);
      return;
    }

    const worker = player.crew.find(c => c.status === "blacksmith");
    const idleCrew = player.crew.filter(c => c.status === "idle");
    const idleRows = idleCrew.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
        <span>${c.id} (Str ${c.strength})</span>
        <button type="button" class="btn light" style="padding:5px 10px;font-size:0.78rem;" data-assign-blacksmith="${c.id}">Employ (${BLACKSMITH_UPKEEP_PER_MINUTE} silver/min)</button>
      </div>
    `).join("");

    overlayInner.innerHTML = `
      <h3>Blacksmith</h3>
      <p>Auto-repairs your broken gear whenever you're in the village with a blacksmith on duty. Costs ${BLACKSMITH_UPKEEP_PER_MINUTE} silver/minute to keep staffed.</p>
      ${worker
        ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;">
             <span>${worker.id} is working the forge.</span>
             <button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-unassign="${worker.id}">Dismiss</button>
           </div>`
        : `<p style="font-weight:700;margin:14px 0 4px;">Assign idle crew</p><div style="text-align:left;">${idleRows || `<p style="opacity:0.7;font-size:0.85rem;">No idle crew available.</p>`}</div>`
      }
      <button type="button" class="btn light" id="wvw-blacksmith-close" style="margin-top:14px;">Close</button>
    `;
    overlayInner.querySelectorAll("button[data-assign-blacksmith]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (assignCrewToBlacksmith(btn.dataset.assignBlacksmith)){
          renderBlacksmithUi();
          saveProgress();
        }
      });
    });
    overlayInner.querySelectorAll("button[data-unassign]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (unassignCrew(btn.dataset.unassign)){
          renderBlacksmithUi();
          saveProgress();
        }
      });
    });
    document.getElementById("wvw-blacksmith-close").addEventListener("click", closeBlacksmithUi);
  }

  function openTrainingUi(){
    trainingUiOpen = true;
    renderTrainingUi();
    overlay.style.display = "flex";
  }
  function closeTrainingUi(){
    trainingUiOpen = false;
    hideOverlay();
    canvas.focus();
  }
  function renderTrainingUi(){
    if (!player.castleRebuilt){
      overlayInner.innerHTML = `
        <h3>Training Grounds</h3>
        <p>An empty field — the Castle must be rebuilt before this can be remodeled.</p>
        <button type="button" class="btn light" id="wvw-training-close" style="margin-top:10px;">Close</button>
      `;
      document.getElementById("wvw-training-close").addEventListener("click", closeTrainingUi);
      return;
    }
    if (!player.trainingGroundsBuilt){
      const affordable = player.silver >= TRAINING_REMODEL_COST;
      overlayInner.innerHTML = `
        <h3>Training Grounds</h3>
        <p>An empty field. Remodeling costs ${TRAINING_REMODEL_COST} silver.</p>
        <button type="button" class="btn" id="wvw-training-remodel-btn" ${affordable ? "" : "disabled"}>Remodel (${TRAINING_REMODEL_COST} silver)</button>
        <button type="button" class="btn light" id="wvw-training-close" style="margin-top:10px;">Close</button>
      `;
      document.getElementById("wvw-training-remodel-btn").addEventListener("click", () => {
        if (player.silver >= TRAINING_REMODEL_COST){
          player.silver -= TRAINING_REMODEL_COST;
          player.trainingGroundsBuilt = true;
          renderTrainingUi();
          saveProgress();
        }
      });
      document.getElementById("wvw-training-close").addEventListener("click", closeTrainingUi);
      return;
    }

    const rosterRows = player.crew.filter(c => c.status !== "dead").map(c => {
      const statusLabel = {
        training: "Training (" + Math.ceil(c.framesRemaining / FRAMES_PER_MINUTE) + " min left)",
        idle: "Idle, unassigned",
        library: "Studying at the Library",
        blacksmith: "Working the Blacksmith",
        following: "Following you"
      }[c.status] || c.status;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>${c.id} (Str ${c.strength}) — ${statusLabel}</span>
        </div>
      `;
    }).join("");

    overlayInner.innerHTML = `
      <h3>Training Grounds</h3>
      <p>Recruit villagers near the dock (press T next to one) to start training here.</p>
      <p style="font-weight:700;margin:14px 0 4px;">Roster</p>
      <div style="text-align:left;">${rosterRows || `<p style="opacity:0.7;font-size:0.85rem;">No crew recruited yet.</p>`}</div>
      <button type="button" class="btn light" id="wvw-training-close" style="margin-top:14px;">Close</button>
    `;
    document.getElementById("wvw-training-close").addEventListener("click", closeTrainingUi);
  }

  function openGraveyardUi(){
    graveyardUiOpen = true;
    renderGraveyardUi();
    overlay.style.display = "flex";
  }
  function closeGraveyardUi(){
    graveyardUiOpen = false;
    hideOverlay();
    canvas.focus();
  }
  function renderGraveyardUi(){
    const dead = player.crew.filter(c => c.status === "dead");
    const affordable = totalCrystals() >= NECROMANCY_COST_CRYSTALS;
    const rows = dead.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
        <span>${c.id} (Str ${c.strength})</span>
        <button type="button" class="btn light" style="padding:5px 10px;font-size:0.78rem;" data-resurrect="${c.id}" ${affordable ? "" : "disabled"}>Resurrect (${NECROMANCY_COST_CRYSTALS} crystals)</button>
      </div>
    `).join("");
    overlayInner.innerHTML = `
      <h3>Graveyard</h3>
      <p>Fallen crew rest here. A Necromancy Ceremony can bring one back to the Training Grounds roster.</p>
      <div style="text-align:left;">${rows || `<p style="opacity:0.7;font-size:0.85rem;">No losses yet.</p>`}</div>
      <button type="button" class="btn light" id="wvw-graveyard-close" style="margin-top:14px;">Close</button>
    `;
    overlayInner.querySelectorAll("button[data-resurrect]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (necromancyResurrect(btn.dataset.resurrect)){
          renderGraveyardUi();
          saveProgress();
        }
      });
    });
    document.getElementById("wvw-graveyard-close").addEventListener("click", closeGraveyardUi);
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
      ? renderSOTGKSection()
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
    const sotgkBtn = document.getElementById("wvw-sotgk-buy-btn");
    if (sotgkBtn){
      sotgkBtn.addEventListener("click", () => {
        if (buySOTGK()){
          renderCastleUi();
          saveProgress();
        }
      });
    }
    document.getElementById("wvw-castle-close").addEventListener("click", closeCastleUi);
  }

  function renderSOTGKPreviewSVG(){
    return `
      <svg viewBox="0 0 120 220" width="140" height="auto" style="display:block;margin:10px auto;">
        <!-- soft glow behind the blade, to make it feel a little magical -->
        <ellipse cx="60" cy="80" rx="34" ry="80" fill="${COLORS.sotgkUltimate}" opacity="0.12"/>

        <!-- blade: opaque grey core, bright white edge outline -->
        <polygon points="60,8 74,60 70,140 50,140 46,60"
          fill="${COLORS.sotgkBladeCore}" stroke="${COLORS.sotgkBladeEdge}" stroke-width="3" stroke-linejoin="round"/>
        <!-- a thin center highlight line down the blade -->
        <line x1="60" y1="20" x2="60" y2="135" stroke="${COLORS.sotgkBladeEdge}" stroke-width="1.5" opacity="0.7"/>

        <!-- crossguard -->
        <rect x="30" y="140" width="60" height="9" rx="2" fill="${COLORS.sotgkUltimate}"/>

        <!-- brown leather-wrapped hilt -->
        <rect x="52" y="149" width="16" height="48" fill="${COLORS.swordHiltSOTGK}"/>
        ${[157, 166, 175, 184].map(y => `<line x1="52" y1="${y}" x2="68" y2="${y}" stroke="#4A331A" stroke-width="2"/>`).join("")}

        <!-- pommel -->
        <circle cx="60" cy="203" r="9" fill="${COLORS.sotgkUltimate}"/>

        <!-- sparkle accents around the blade, to sell the crystalline/magic feel -->
        ${[[30,45,5],[92,75,4],[36,100,3.5],[86,35,3]].map(([x,y,r]) => `
          <g transform="translate(${x},${y})" fill="${COLORS.sotgkBladeEdge}">
            <polygon points="0,-${r*2} ${r*0.6},-${r*0.6} ${r*2},0 ${r*0.6},${r*0.6} 0,${r*2} -${r*0.6},${r*0.6} -${r*2},0 -${r*0.6},-${r*0.6}"/>
          </g>
        `).join("")}
      </svg>
    `;
  }

  function renderSOTGKSection(){
    const owned = player.swordInventory.swords.some(s => s.id === "sotgk");
    const affordable = player.silver >= SOTGK_COST_SILVER;
    if (owned){
      return `<p>The Castle stands rebuilt, restored to its former glory.</p>
        <p style="opacity:0.8;font-size:0.85rem;">The Sword of the Great King already hangs at your side.</p>`;
    }
    return `<p>The Castle stands rebuilt, restored to its former glory.</p>
      <p style="font-weight:700;margin:14px 0 4px;">Sword of the Great King</p>
      ${renderSOTGKPreviewSVG()}
      <p style="opacity:0.85;font-size:0.85rem;">The ultimate endgame weapon — a crystalline blade that stacks Lightning, Fire, and Freeze simultaneously, unlike any other sword.</p>
      <button type="button" class="btn" id="wvw-sotgk-buy-btn" ${affordable ? "" : "disabled"}>Forge the Sword of the Great King (${SOTGK_COST_SILVER.toLocaleString()} silver)</button>`;
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
      actionHTML = `
        <button type="button" class="btn" id="wvw-sail-land1-btn">Grasslands</button>
        <button type="button" class="btn" id="wvw-sail-land2-btn" style="margin-left:8px;">Home of the Cyclops</button>
        <div style="margin-top:10px;">
          <button type="button" class="btn" id="wvw-sail-generated-btn" data-land="${nextLand}">Explore New Lands</button>
        </div>
        <div style="margin-top:10px;">
          <button type="button" class="btn" id="wvw-sail-homebase-btn">Home Village</button>
        </div>
      `;
    }

    overlayInner.innerHTML = `
      <h3>Captain's Map</h3>
      <p>Four continents, charted so far. ${player.crewHired ? "Your crew can set sail whenever you're ready." : "Hiring a crew is the first step toward reaching them."}</p>
      <svg viewBox="0 0 300 200" width="100%" height="auto" style="border-radius:8px;">
        <!-- parchment frame -->
        <rect x="0" y="0" width="300" height="200" rx="8" fill="#E8D5A8" />
        <rect x="6" y="6" width="288" height="188" rx="5" fill="none" stroke="#8B6B4A" stroke-width="2" />
        <!-- ocean -->
        <rect x="14" y="14" width="272" height="172" fill="#3A7CA5" />
        <path d="M18,40 Q30,36 42,40 T66,40" stroke="#5A9BC4" stroke-width="1.5" fill="none" opacity="0.6"/>
        <path d="M18,160 Q30,156 42,160 T66,160" stroke="#5A9BC4" stroke-width="1.5" fill="none" opacity="0.6"/>
        <path d="M220,25 Q232,21 244,25 T268,25" stroke="#5A9BC4" stroke-width="1.5" fill="none" opacity="0.6"/>

        <!-- sail routes, dotted, converging near the compass -->
        <line x1="150" y1="100" x2="72" y2="55"  stroke="#E8D5A8" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.75"/>
        <line x1="150" y1="100" x2="222" y2="50" stroke="#E8D5A8" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.75"/>
        <line x1="150" y1="100" x2="60" y2="145" stroke="#E8D5A8" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.75"/>
        <line x1="150" y1="100" x2="228" y2="150" stroke="#E8D5A8" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.75"/>

        <!-- Grasslands (Land 1) — green, irregular coastline -->
        <path d="M48,38 Q60,26 84,32 Q100,38 96,54 Q92,72 70,76 Q48,78 40,60 Q36,46 48,38 Z" fill="#4A9D5F" stroke="#2D6A4F" stroke-width="1.5"/>
        <circle cx="66" cy="52" r="4" fill="#2D6A4F"/>

        <!-- Home of the Cyclops (Land 2) — rocky grey-green, with an eye marker -->
        <path d="M198,32 Q212,22 232,26 Q248,32 246,46 Q244,62 226,64 Q206,66 198,50 Q194,40 198,32 Z" fill="#7A8A6E" stroke="#4A5A40" stroke-width="1.5"/>
        <circle cx="222" cy="46" r="6" fill="#F5F0E6"/>
        <circle cx="222" cy="46" r="2.5" fill="#E14B3C"/>

        <!-- Explore New Lands — mysterious violet-tinged island, swirl mark -->
        <path d="M40,124 Q54,114 76,120 Q90,128 84,144 Q78,160 58,162 Q40,162 34,146 Q30,132 40,124 Z" fill="#8B7AB8" stroke="#5B4E77" stroke-width="1.5"/>
        <path d="M52,140 Q58,132 66,138 Q70,144 62,148 Q56,150 52,144" fill="none" stroke="#F5F0E6" stroke-width="1.5"/>

        <!-- Home Village — warm tan, tiny house shapes -->
        <path d="M204,128 Q220,118 244,124 Q258,132 254,148 Q248,164 226,166 Q206,166 200,150 Q196,138 204,128 Z" fill="#D9C08A" stroke="#8B6B4A" stroke-width="1.5"/>
        <rect x="216" y="140" width="10" height="8" fill="#8B5A2B"/>
        <path d="M214,140 L221,133 L228,140 Z" fill="#B8543A"/>
        <rect x="232" y="144" width="8" height="6" fill="#8B5A2B"/>
        <path d="M230,144 L236,138 L242,144 Z" fill="#B8543A"/>

        <!-- compass rose -->
        <circle cx="150" cy="100" r="16" fill="none" stroke="#E8D5A8" stroke-width="1.5" opacity="0.9"/>
        <path d="M150,86 L154,100 L150,114 L146,100 Z" fill="#E8D5A8" opacity="0.9"/>
        <path d="M136,100 L150,96 L164,100 L150,104 Z" fill="#E8D5A8" opacity="0.6"/>
        <circle cx="150" cy="100" r="2.5" fill="#F6C945"/>
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

    const sailHomeBtn = document.getElementById("wvw-sail-home-btn");
    if (sailHomeBtn) sailHomeBtn.addEventListener("click", () => {
      sailHome();
      closeMap();
    });

    document.getElementById("wvw-map-close").addEventListener("click", closeMap);
  }

  function tabBarHtml(){
    const tabs = [["spells","Spells"],["inventory","Inventory"],["shops","Shops"],["amulets","Amulets"]];
    return `
      <div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;">
        ${tabs.map(([id, label]) => `
          <button type="button" class="btn ${altarActiveTab === id ? "" : "light"}" style="padding:6px 12px;font-size:0.82rem;" data-menu-tab="${id}">${label}</button>
        `).join("")}
      </div>
    `;
  }

  function renderSpellsTab(){
    const total = totalCrystals();
    const allKeys = SPELL_ORDER.concat(RARE_SPELL_ORDER).concat(SPECIAL_SPELL_ORDER);
    const mastered = allKeys.filter(k => spellUnlocked.has(k));
    const discovered = allKeys.filter(k => !spellUnlocked.has(k));

    const rowFor = (key, i) => {
      const cfg = SPELLS[key];
      const owned = spellUnlocked.has(key);
      const isRare = RARE_SPELL_ORDER.includes(key);
      const isSpecial = SPECIAL_SPELL_ORDER.includes(key);
      const affordable = total >= cfg.cost;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>${cfg.label}${isRare ? " (rare)" : ""}${isSpecial ? " (no default key — assign to an amulet slot)" : ""}</span>
          ${owned
            ? `<span style="opacity:0.7;font-size:0.8rem;">Mastered</span>`
            : `<button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-spell="${key}" ${affordable ? "" : "disabled"}>Master (${cfg.cost} crystals)</button>`
          }
        </div>
      `;
    };

    return `
      <p>You have ${total} crystal${total === 1 ? "" : "s"} to spend on spells (carried + banked).</p>
      <p style="font-weight:700;margin:14px 0 4px;">Mastered</p>
      <div style="text-align:left;">${mastered.length ? mastered.map(k => rowFor(k)).join("") : `<p style="opacity:0.7;font-size:0.85rem;">None yet.</p>`}</div>
      <p style="font-weight:700;margin:14px 0 4px;">Discovered</p>
      <div style="text-align:left;">${discovered.length ? discovered.map(k => rowFor(k)).join("") : `<p style="opacity:0.7;font-size:0.85rem;">Everything's mastered.</p>`}</div>
    `;
  }

  function renderInventoryTab(){
    const swordRows = player.swordInventory.swords.map(s => {
      const equipped = player.swordInventory.equippedSwordId === s.id;
      const action = equipped
        ? `<span style="opacity:0.7;font-size:0.8rem;">Equipped</span>`
        : `<button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-equip-sword="${s.id}">Equip</button>`;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>${s.label}${equipped ? " (equipped)" : ""}</span>
          ${action}
        </div>
      `;
    }).join("");
    const swordSection = `<p style="font-weight:700;margin:0 0 4px;">Swords</p><div style="text-align:left;">${swordRows}</div>`;

    const owned = ARMOR_ORDER.filter(k => player.armorInventory[k] && player.armorInventory[k].owned);
    if (owned.length === 0) return swordSection + `<p style="opacity:0.7;margin-top:14px;">No armor owned yet — check the Shops tab.</p>`;

    const rows = owned.map(key => {
      const cfg = ARMOR[key];
      const inv = player.armorInventory[key];
      const equipped = player.armorType === key;
      const status = inv.broken ? "Broken" : "Ready";
      const repairCost = armorRepairCost(key);
      const repairAffordable = player.silver >= repairCost;
      let actionHtml;
      if (inv.broken){
        actionHtml = `<button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-repair="${key}" ${repairAffordable ? "" : "disabled"}>Repair (${repairCost} silver)</button>`;
      }else if (equipped){
        actionHtml = `<span style="opacity:0.7;font-size:0.8rem;">Equipped</span>`;
      }else{
        actionHtml = `<button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-equip-armor="${key}">Equip</button>`;
      }
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>${cfg.label} — <span style="color:${inv.broken ? "#E14B3C" : "#12B76A"};">${status}</span>${equipped ? " (equipped)" : ""}</span>
          ${actionHtml}
        </div>
      `;
    }).join("");

    return swordSection + `<p style="font-weight:700;margin:14px 0 4px;">Armor</p><div style="text-align:left;">${rows}</div>`;
  }

  function renderShopsTab(){
    const notOwned = ARMOR_ORDER.filter(k => !player.armorInventory[k] || !player.armorInventory[k].owned);
    const armorRows = notOwned.map(key => {
      const cfg = ARMOR[key];
      const affordable = player.silver >= cfg.cost;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
          <span>${cfg.label}</span>
          <button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" data-armor="${key}" ${affordable ? "" : "disabled"}>Buy (${cfg.cost} silver)</button>
        </div>
      `;
    }).join("");

    const manaAffordable = player.silver >= MANA_UPGRADE_COST_SILVER;
    const manaRow = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;">
        <span>Max Mana: ${player.maxMana}</span>
        <button type="button" class="btn light" style="padding:6px 12px;font-size:0.8rem;" id="wvw-mana-upgrade-btn" ${manaAffordable ? "" : "disabled"}>+${MANA_UPGRADE_AMOUNT} (${MANA_UPGRADE_COST_SILVER} silver)</button>
      </div>
    `;

    return `
      <p>${Math.floor(player.silver)} silver available.</p>
      ${notOwned.length ? `<p style="font-weight:700;margin:14px 0 4px;">Gear</p><div style="text-align:left;">${armorRows}</div>` : `<p style="opacity:0.7;font-size:0.85rem;">All gear owned — check your Inventory.</p>`}
      <p style="font-weight:700;margin:14px 0 4px;">Mana (repeatable)</p>
      <div style="text-align:left;">${manaRow}</div>
    `;
  }

  function renderAmuletsTab(){
    if (player.amuletsOwned.size === 0) return `<p style="opacity:0.7;">No amulets earned yet — boss drops only.</p>`;

    const ownedKeys = AMULET_ORDER.filter(k => player.amuletsOwned.has(k));
    if (!amuletViewKey || !player.amuletsOwned.has(amuletViewKey)) amuletViewKey = player.equippedAmulet || ownedKeys[0];

    const subTabs = ownedKeys.map(k => `
      <button type="button" class="btn ${amuletViewKey === k ? "" : "light"}" style="padding:5px 10px;font-size:0.78rem;" data-amulet-subtab="${k}">${AMULETS[k].label}</button>
    `).join("");

    const amulet = AMULETS[amuletViewKey];
    const equipped = player.equippedAmulet === amuletViewKey;
    const slots = player.amuletSlots[amuletViewKey] || new Array(9).fill(null);
    const buffActive = isAmuletBuffActive(amulet.buffSpell);
    const buffSpellLabel = amulet.buffSpell ? (SPELLS[amulet.buffSpell] ? SPELLS[amulet.buffSpell].label : amulet.buffSpell) : null;
    const allSpellKeys = SPELL_ORDER.concat(RARE_SPELL_ORDER).concat(SPECIAL_SPELL_ORDER);
    const assignedElsewhere = new Set(slots.filter(Boolean));

    return `
      <div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;">${subTabs}</div>
      <p style="font-weight:700;margin:4px 0 4px;">${amulet.label}${buffActive ? " — buff active" : ""}</p>
      <p style="font-size:0.78rem;opacity:0.8;margin-top:-4px;">${buffSpellLabel ? `Slot ${buffSpellLabel} into any key to activate its passive.` : "Passive not yet implemented — no matching spell exists for this one yet."}</p>
      <p style="font-size:0.78rem;opacity:0.8;">${equipped ? "This amulet is equipped — number keys 1-9 now cast whatever's bound below, not the default spell order." : "Equip this amulet to make these key bindings active. While unequipped, number keys use the default order."}</p>
      <button type="button" class="btn ${equipped ? "light" : ""}" style="padding:6px 12px;font-size:0.8rem;margin-bottom:10px;" id="wvw-amulet-equip-toggle" data-amulet-key="${amuletViewKey}">${equipped ? "Unequip" : "Equip"}</button>
      <div style="text-align:left;">${slots.map((assigned, i) => {
        const choices = allSpellKeys.filter(k => spellUnlocked.has(k) && (k === assigned || !assignedElsewhere.has(k)));
        const options = ['<option value="">Empty (key does nothing)</option>'].concat(
          choices.map(k => `<option value="${k}" ${k === assigned ? "selected" : ""}>${SPELLS[k].label}</option>`)
        ).join("");
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;">
            <span style="font-size:0.78rem;opacity:0.75;min-width:48px;">Key ${i + 1}</span>
            <select data-amulet-slot="${i}" style="flex:1;">${options}</select>
          </div>
        `;
      }).join("")}</div>
    `;
  }

  function renderAltar(){
    let bodyHtml;
    if (altarActiveTab === "spells") bodyHtml = renderSpellsTab();
    else if (altarActiveTab === "inventory") bodyHtml = renderInventoryTab();
    else if (altarActiveTab === "shops") bodyHtml = renderShopsTab();
    else bodyHtml = renderAmuletsTab();

    overlayInner.innerHTML = `
      <h3>Menu</h3>
      ${tabBarHtml()}
      <div id="wvw-menu-body">${bodyHtml}</div>
      <button type="button" class="btn light" id="wvw-altar-close" style="margin-top:14px;">Close</button>
    `;

    overlayInner.querySelectorAll("button[data-menu-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        altarActiveTab = btn.dataset.menuTab;
        renderAltar();
      });
    });
    overlayInner.querySelectorAll("button[data-spell]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.spell;
        const cfg = SPELLS[key];
        if (totalCrystals() >= cfg.cost && !spellUnlocked.has(key)){
          spendCrystals(cfg.cost);
          spellUnlocked.add(key);
          if (DEBUG) console.log("[WvW] mastered spell " + key);
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
    overlayInner.querySelectorAll("button[data-equip-armor]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (equipArmor(btn.dataset.equipArmor)){
          renderAltar();
          saveProgress();
        }
      });
    });
    overlayInner.querySelectorAll("button[data-equip-sword]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (equipSword(btn.dataset.equipSword)){
          renderAltar();
          saveProgress();
        }
      });
    });
    overlayInner.querySelectorAll("button[data-repair]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (repairArmor(btn.dataset.repair)){
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
    overlayInner.querySelectorAll("button[data-amulet-subtab]").forEach(btn => {
      btn.addEventListener("click", () => {
        amuletViewKey = btn.dataset.amuletSubtab;
        renderAltar();
      });
    });
    const amuletToggleBtn = document.getElementById("wvw-amulet-equip-toggle");
    if (amuletToggleBtn){
      amuletToggleBtn.addEventListener("click", () => {
        const key = amuletToggleBtn.dataset.amuletKey;
        if (player.equippedAmulet === key) unequipAmulet(key);
        else equipAmulet(key);
        renderAltar();
        saveProgress();
      });
    }
    overlayInner.querySelectorAll("select[data-amulet-slot]").forEach(sel => {
      sel.addEventListener("change", () => {
        const slotIndex = Number(sel.dataset.amuletSlot);
        if (assignAmuletSlot(amuletViewKey, slotIndex, sel.value || null)){
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
        document.documentElement.requestFullscreen().catch(() => {}); // whole page, not just the canvas — overlay menus live outside the canvas and'd be invisible otherwise
      }
    });

    function applyFullscreenCanvasSize(){
      // object-fit on a <canvas> is unreliable across browsers (it's
      // really meant for img/video) — rather than depend on CSS to
      // preserve the aspect ratio, compute the exact pixel size
      // ourselves: fit within the viewport, preserving CANVAS_W:CANVAS_H,
      // and center whatever's left over rather than stretching.
      const targetAspect = CANVAS_W / CANVAS_H;
      const screenAspect = window.innerWidth / window.innerHeight;
      let w, h;
      if (screenAspect > targetAspect){
        h = window.innerHeight;
        w = h * targetAspect;
      }else{
        w = window.innerWidth;
        h = w / targetAspect;
      }
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.style.position = "fixed";
      canvas.style.top = "50%";
      canvas.style.left = "50%";
      canvas.style.transform = "translate(-50%, -50%)";
    }

    function onFullscreenResize(){
      if (document.fullscreenElement) applyFullscreenCanvasSize();
    }

    document.addEventListener("fullscreenchange", () => {
      const isFull = !!document.fullscreenElement;
      btn.textContent = isFull ? "✕ Exit Fullscreen" : "⛶ Fullscreen";
      if (isFull){
        applyFullscreenCanvasSize();
        window.addEventListener("resize", onFullscreenResize);
        // The overlay (shop/menu UI) isn't a canvas descendant, so it
        // doesn't automatically track the now-resized canvas — pin it
        // to the same full-viewport box explicitly, rather than relying
        // on external page CSS that may only ever have accounted for the
        // canvas at its normal, non-fullscreen size.
        if (overlay){
          overlay.style.position = "fixed";
          overlay.style.top = "0";
          overlay.style.left = "0";
          overlay.style.width = "100vw";
          overlay.style.height = "100vh";
          overlay.style.zIndex = "9999";
        }
      }else{
        canvas.style.width = "";
        canvas.style.height = "";
        canvas.style.position = "";
        canvas.style.top = "";
        canvas.style.left = "";
        canvas.style.transform = "";
        window.removeEventListener("resize", onFullscreenResize);
        if (overlay){
          overlay.style.position = "";
          overlay.style.top = "";
          overlay.style.left = "";
          overlay.style.width = "";
          overlay.style.height = "";
          overlay.style.zIndex = "";
        }
      }
    });

    if (canvas.parentNode) canvas.parentNode.insertBefore(btn, canvas.nextSibling);
  }

  document.addEventListener("DOMContentLoaded", initGame);
})();
