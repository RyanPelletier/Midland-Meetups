/* =====================================================================
   DOOM SCROLLER
   A 2D right-scrolling brawler starring Dr. Doom. Same mid-century
   modern visual language as the other two games on this page (bold
   primary colors, simple flat shapes), but its own genre: you travel
   right through a repeating sequence of biomes, and each biome ends in
   a stationary fight against a randomly-picked Marvel character.

   Shares this page with Wizards & Waffles and And So I Wander, so this
   file only reacts to input when its OWN canvas is focused — see
   initGame() at the bottom (same guard those two files use).

   THE CHARACTER LIBRARY (CHARACTERS below) is deliberately structured
   as one self-contained entry per fighter — movement type + exactly
   three abilities each — so adding the next Marvel character later is
   just one more entry, no engine changes. The parts that ARE
   engine-level (updateAbilityState/dealAbilityDamageToPlayer) are
   generic: every enemy ability is one of a handful of "kinds" (a
   telegraphed danger band — ground-level or head-level or wider —, a
   pick-the-safe-gap barrage, a top+bottom pincer, a real aimed
   projectile, a self-buff, or a reflect) rather than bespoke code per
   character.

   TUNING: every number worth playing with lives in CONFIG below.
   ===================================================================== */

(function(){

  /* ==================== CONFIG ==================== */
  const CANVAS_W = 640;
  const CANVAS_H = 360;
  const GROUND_Y = 300;

  const PLAYER_W = 32;
  const PLAYER_H = 46;
  const DUCK_H = 26;

  const PLAYER_ARENA_MIN_X = 40;
  const PLAYER_ARENA_MAX_X = 340;
  const ENEMY_X = 480;

  const STRAFE_SPEED = 4.5;
  const FLY_VERT_SPEED = 4.2;
  const FLY_MIN_Y = 40;

  const GRAVITY = 0.8;
  const JUMP_VELOCITY = -13;

  const SCROLL_SPEED = 3.2;
  const BIOME_TRAVEL_DISTANCE = 900; // world-distance per biome before its resident fighter appears

  const PLAYER_MAX_HP = 150;
  const ENERGY_MAX = 100;
  const ENERGY_REGEN = 0.24; // per frame

  const VICTORY_PAUSE_FRAMES = 90;
  const DOUBLE_TAP_WINDOW_FRAMES = 18; // ~300ms at 60fps — how close together two Space taps must land to toggle flying

  const LOCAL_BEST_KEY = "midland-meetups-doom-best-score";

  const DEBUG = false;

  // Danger bands (canvas y-ranges). "wide" and the two "trackPlayerY"
  // half-heights below are how enemy abilities threaten the player —
  // dodging is a vertical problem (fly up/down, jump, or duck), never
  // a horizontal one, so every hazard spans the full arena width.
  // "ground" (a floor-level sweep/charge) catches Doom whether he's
  // standing OR ducking — only jumping/flying clears it. "head" (a
  // swing at standing head/torso height) only threatens a STANDING
  // Doom — ducking drops him clean under it. That split is what makes
  // duck a real choice instead of a no-op.
  const BAND = {
    ground: { min: 270, max: 300 },
    head:   { min: 254, max: 274 },
    wide:   { min: 110, max: 300 }
  };

  const COLORS = {
    hud: "#1F2430",
    hpBar: "#E14B3C",
    hpBarBack: "#3A2A2A",
    energyBar: "#3E7ADB",
    energyBarBack: "#22304A",
    enemyHpBar: "#F6C945",
    threatGlow: "229,72,77",

    doomCloak: "#2E6B3A",
    doomCloakDark: "#204D29",
    doomArmor: "#7A7E86",
    doomArmorDark: "#4F5359",
    doomMask: "#4A4E55",
    doomTrim: "#C9A227",
    doomEyes: "#D9D4C0",

    plasma: "#7FE0C4",
    beam: "#3EDB8F",
    bolt: "#7FE0C4",
    levitation: "#8FD9FF",
    nova: "#F6C945",
    shieldFx: "#3E7ADB",
    teleportFx: "#B98FE0",
    healFx: "#5FD97A",
    blockFx: "#C9A227",

    repulsorFx: "#E5484D",
    boulderFx: "#8B6B4A",
    opticFx: "#E14B3C"
  };

  const BIOMES = [
    { name: "Latveria — The Ruined Approach", skyTop: "#2A1F33", skyBottom: "#4A3A55", ground: "#3B2E3F", silhouette: "#1C1420", farColor: "#3A2E42", tileW: 140, kind: "towers" },
    { name: "Manhattan Skyline", skyTop: "#3A4A6B", skyBottom: "#6B85A8", ground: "#4B4B55", silhouette: "#26314A", farColor: "#4A5A78", tileW: 90, kind: "buildings" },
    { name: "Canadian Wilds", skyTop: "#BFE3D0", skyBottom: "#DCEFC4", ground: "#5A7A46", silhouette: "#2F5233", farColor: "#6B9A6E", tileW: 70, kind: "pines" },
    { name: "The Gamma Wastes", skyTop: "#B7C24A", skyBottom: "#DCE38A", ground: "#8A7A3E", silhouette: "#5C5426", farColor: "#9A9256", tileW: 110, kind: "spires" },
    { name: "Xavier's Grounds", skyTop: "#AEE2FF", skyBottom: "#EAF6FF", ground: "#8FBF5A", silhouette: "#3F7A3A", farColor: "#8FC490", tileW: 160, kind: "hills" }
  ];

  /* ==================== character library ==================== */
  // Each fighter: displayName, size, hp, a movement type (purely how
  // they drift around their spot), and exactly three abilities. Every
  // ability is one of: "band" (a telegraphed y-range that turns
  // dangerous — "ground" and "head" hit a standing Doom differently,
  // see BAND above), "projectile" (a real shot aimed at wherever Doom
  // actually is the instant it fires — dodge by not being there when
  // it arrives), "buff" (a self-effect, no player-facing zone),
  // "reflectBuff" (blocks + bounces the next ranged hit back at the
  // player), or "unblockable" (a custom-animated attack — see `visual`
  // — that always lands unless Doom is actively shielded when it
  // connects; there's no positional dodge for these, only timing a
  // block, so they get their own hand-drawn telegraph in
  // drawSpecialTelegraphs() instead of a generic danger band).
  const CHARACTERS = {
    wolverine: {
      displayName: "Wolverine",
      w: 40, h: 50,
      hp: 180,
      colors: { body: "#5B4A9B", mask: "#F6C945", claws: "#E5E7EA" },
      movement: { type: "lunger" },
      abilities: [
        { name: "Claw Flurry", kind: "band", band: "head", damage: 16, telegraphFrames: 16, activeFrames: 12, cdMin: 40, cdMax: 60 },
        { name: "Berserker Lunge", kind: "band", band: "ground", damage: 28, telegraphFrames: 30, activeFrames: 13, cdMin: 120, cdMax: 160, chargeForward: true, chargeDistance: 220 },
        { name: "Adamantium Guard", kind: "buff", buffType: "damageReduction", buffAmount: 0.7, telegraphFrames: 10, activeFrames: 130, cdMin: 260, cdMax: 320 }
      ]
    },
    ironman: {
      displayName: "Iron Man",
      w: 42, h: 54,
      hp: 210,
      colors: { body: "#B02E2E", gold: "#D9A93B" },
      movement: { type: "hoverer" },
      abilities: [
        { name: "Repulsor Blast", kind: "projectile", damage: 6, speed: 9, r: 5, color: COLORS.repulsorFx, telegraphFrames: 10, activeFrames: 8, cdMin: 40, cdMax: 65 },
        { name: "Unibeam Charge", kind: "band", band: "wide", damage: 17, telegraphFrames: 55, activeFrames: 16, cdMin: 210, cdMax: 260 },
        { name: "Missile Barrage", kind: "unblockable", visual: "barrage", rocketCount: 6, damage: 20, telegraphFrames: 46, activeFrames: 10, cdMin: 160, cdMax: 200 }
      ]
    },
    hulk: {
      displayName: "Hulk",
      w: 54, h: 64,
      hp: 280,
      colors: { body: "#4C8C3A", pants: "#5B4A9B" },
      movement: { type: "stomper" },
      abilities: [
        { name: "Ground Pound", kind: "band", band: "ground", damage: 22, telegraphFrames: 26, activeFrames: 12, cdMin: 150, cdMax: 190 },
        { name: "Boulder Throw", kind: "projectile", damage: 10, speed: 7, r: 7, color: COLORS.boulderFx, telegraphFrames: 20, activeFrames: 10, cdMin: 90, cdMax: 130 },
        { name: "Rage Charge", kind: "band", band: "ground", damage: 24, telegraphFrames: 34, activeFrames: 13, cdMin: 140, cdMax: 180, chargeForward: true, chargeDistance: 220 }
      ]
    },
    cyclops: {
      displayName: "Cyclops",
      w: 40, h: 52,
      hp: 190,
      colors: { body: "#2E5AA8", visor: "#E5484D" },
      movement: { type: "strafer" },
      abilities: [
        { name: "Optic Blast", kind: "projectile", damage: 7, speed: 10, r: 5, color: COLORS.opticFx, telegraphFrames: 14, activeFrames: 10, cdMin: 45, cdMax: 70 },
        { name: "Focused Beam", kind: "band", trackPlayerY: true, trackHalf: 70, damage: 18, telegraphFrames: 45, activeFrames: 16, cdMin: 180, cdMax: 230 },
        { name: "Crossfire", kind: "unblockable", visual: "crossfire", damage: 24, telegraphFrames: 40, activeFrames: 10, cdMin: 140, cdMax: 180 }
      ]
    },
    capamerica: {
      displayName: "Captain America",
      w: 42, h: 54,
      hp: 220,
      colors: { body: "#2851E3", shield: "#E5484D", shieldRim: "#9CA3AF" },
      movement: { type: "charger" },
      abilities: [
        { name: "Shield Throw", kind: "projectile", damage: 9, speed: 11, r: 12, style: "shield", telegraphFrames: 14, activeFrames: 10, cdMin: 90, cdMax: 130 },
        { name: "Shield Charge", kind: "band", band: "ground", damage: 20, telegraphFrames: 24, activeFrames: 11, cdMin: 130, cdMax: 170, rangedImmuneWhileActive: true, chargeForward: true, chargeDistance: 220 },
        { name: "Bounce Back", kind: "reflectBuff", reflectChance: 0.7, telegraphFrames: 14, activeFrames: 70, cdMin: 170, cdMax: 220 }
      ]
    }
  };
  const CHARACTER_IDS = Object.keys(CHARACTERS);

  /* ==================== Doom's own kit (keys 1-9) ==================== */
  // Costs draw from a shared energy bar; every ability also has its
  // own independent cooldown. 1/3/4/9 are "energy" damage (blockable by
  // Cap's Shield Charge / reflectable — 70% of the time — by his
  // Bounce Back, except Nova which pierces both); 8 is "physical"
  // (never blocked/reflected). Mystic Shield (index 4) is special: it's
  // a HELD stance, not a discrete cast — see updateShieldHold() and the
  // Digit5 handling in initGame(). Its `cost` is energy drained per
  // frame held, not a one-time price, and it has no cooldown (holding
  // it just costs energy the whole time; a quick tap gives a brief
  // window, matching "click to use" still technically working).
  const DOOM_ABILITIES = [
    { name: "Plasma Bolt", cost: 8, cooldownFrames: 12, damage: 14 },
    { name: "Self Repair", cost: 35, cooldownFrames: 200, healAmount: 45 },
    { name: "Disruptor Beam", cost: 28, cooldownFrames: 90, damage: 50 },
    { name: "Doom Bolts", cost: 18, cooldownFrames: 50, damage: 11 },
    { name: "Mystic Shield", cost: 1.4, cooldownFrames: 0 },
    { name: "Teleport Slip", cost: 15, cooldownFrames: 60 },
    { name: "Molecular Barrier", cost: 18, cooldownFrames: 70, blockReduction: 0.75, blockDurationFrames: 50 },
    { name: "Levitation Burst", cost: 20, cooldownFrames: 80, damage: 24 },
    { name: "Hyperbolic Nova", cost: 50, cooldownFrames: 360, damage: 90 }
  ];

  let canvas, ctx, overlay, overlayInner;
  let player, enemy, doomProjectiles, enemyProjectiles, hazards, effects;
  let biomeIndex, travelDistance, worldXTotal, lastCharacterId;
  let phase, victoryTimer, lastDefeatedName, lastScoreBonus;
  let score, frame, running, over, started, animId;
  let lastSpaceTapFrame, selectedAbilityIndex;
  const keysDown = {};

  function resetState(){
    player = {
      x: PLAYER_ARENA_MIN_X + 40,
      y: GROUND_Y - PLAYER_H,
      vy: 0,
      onGround: true,
      ducking: false,
      mode: "walking",
      hp: PLAYER_MAX_HP,
      energy: ENERGY_MAX,
      invulnFrames: 0,
      blockFrames: 0,
      blockReduction: 0,
      abilityCooldowns: new Array(9).fill(0)
    };
    enemy = null;
    doomProjectiles = [];
    enemyProjectiles = [];
    hazards = [];
    effects = [];
    biomeIndex = 0;
    travelDistance = 0;
    worldXTotal = 0;
    lastCharacterId = null;
    phase = "traveling";
    victoryTimer = 0;
    lastDefeatedName = "";
    lastScoreBonus = 0;
    score = 0;
    frame = 0;
    lastSpaceTapFrame = -9999;
    selectedAbilityIndex = 0;
    running = false;
    over = false;
    for (const k in keysDown) delete keysDown[k];
  }

  /* ---------------- local best score ---------------- */
  function getLocalBest(){
    return Number(localStorage.getItem(LOCAL_BEST_KEY)) || 0;
  }
  function setLocalBestIfHigher(candidateScore){
    const current = getLocalBest();
    if (candidateScore > current){
      localStorage.setItem(LOCAL_BEST_KEY, String(candidateScore));
      return true;
    }
    return false;
  }

  /* ---------------- helpers ---------------- */
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function randBetween(lo, hi){ return lo + Math.random() * (hi - lo); }
  function rectOverlap(x1,y1,w1,h1,x2,y2,w2,h2){
    return x1 < x2+w2 && x1+w1 > x2 && y1 < y2+h2 && y1+h1 > y2;
  }
  // Direction+speed from one point toward another — used so Doom's
  // projectiles and beam always aim at wherever the enemy actually is
  // (including its altitude), not just straight out at Doom's own y.
  function aimAt(fromX, fromY, toX, toY, speed){
    const dx = toX - fromX, dy = toY - fromY;
    const dist = Math.max(1, Math.hypot(dx, dy));
    return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
  }
  function enemyTargetPoint(fallbackX, fallbackY){
    return enemy ? { x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2 } : { x: fallbackX, y: fallbackY };
  }
  function playerHeight(){
    return (player.mode === "walking" && player.ducking) ? DUCK_H : PLAYER_H;
  }
  // Ducking keeps Doom's feet on the ground and pulls his head down —
  // the hitbox's TOP moves toward the ground, not the physics y used
  // for jump/gravity. That's what makes ground vs. head-level attacks
  // (see BAND below) an actual choice: duck dodges one, jumping/flying
  // dodges the other.
  function playerTop(){
    return (player.mode === "walking" && player.ducking) ? (GROUND_Y - DUCK_H) : player.y;
  }
  function playerCenterY(){
    return playerTop() + playerHeight()/2;
  }
  function playerOverlapsBand(band){
    const top = playerTop(), bot = top + playerHeight();
    return top < band.max && bot > band.min;
  }

  /* ---------------- player ---------------- */
  function updatePlayer(){
    if (keysDown.ArrowLeft) player.x -= STRAFE_SPEED;
    if (keysDown.ArrowRight) player.x += STRAFE_SPEED;
    player.x = clamp(player.x, PLAYER_ARENA_MIN_X, PLAYER_ARENA_MAX_X);

    if (player.mode === "flying"){
      if (keysDown.ArrowUp) player.y -= FLY_VERT_SPEED;
      if (keysDown.ArrowDown) player.y += FLY_VERT_SPEED;
      player.y = clamp(player.y, FLY_MIN_Y, GROUND_Y - PLAYER_H);
      player.vy = 0;
      player.onGround = false;
      player.ducking = false;
    } else {
      player.vy += GRAVITY;
      player.y += player.vy;
      if (player.y >= GROUND_Y - PLAYER_H){
        player.y = GROUND_Y - PLAYER_H;
        player.vy = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }
      player.ducking = !!(keysDown.ArrowDown && player.onGround);
    }

    if (player.invulnFrames > 0) player.invulnFrames--;
    if (player.blockFrames > 0) player.blockFrames--;
    else player.blockReduction = 0;
    player.energy = Math.min(ENERGY_MAX, player.energy + ENERGY_REGEN);
    for (let i = 0; i < 9; i++){
      if (player.abilityCooldowns[i] > 0) player.abilityCooldowns[i]--;
    }
    updateShieldHold();
  }

  // Mystic Shield (key 5) is held, not cast: as long as it's down and
  // there's energy left, invulnFrames is kept topped up every frame
  // (draining energy every frame), so releasing lets it lapse almost
  // immediately. A quick tap still runs this for the one frame it was
  // held, granting a brief flicker of invulnerability — "technically
  // works, just brief" — with no separate tap-vs-hold code path needed.
  function updateShieldHold(){
    // Gated on the FULL per-frame cost, not just "any energy left" —
    // otherwise once energy bottoms out, regen alone (which always
    // ticks up before this runs) would tick it just above zero every
    // frame, making an indefinitely-held shield free. Requiring the
    // full cost each frame means a drained bar makes the shield gappy
    // and eventually fails, instead of becoming permanent for free.
    if (keysDown.Digit5 && player.energy >= DOOM_ABILITIES[4].cost){
      player.energy -= DOOM_ABILITIES[4].cost;
      player.invulnFrames = Math.max(player.invulnFrames, 3);
    }
  }

  function jump(){
    if (player.mode === "walking" && player.onGround && !player.ducking){
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
    }
  }

  function toggleFlight(){
    player.mode = (player.mode === "walking") ? "flying" : "walking";
  }

  function applyDamageToPlayer(amount){
    if (player.invulnFrames > 0) return;
    if (player.blockFrames > 0) amount *= (1 - player.blockReduction);
    player.hp = Math.max(0, player.hp - amount);
    effects.push({ type: "hit", x: player.x + PLAYER_W/2, y: playerCenterY(), life: 14 });
    if (player.hp <= 0) endGame();
  }

  /* ---------------- Doom's abilities ---------------- */
  function tryCastAbility(idx){
    const def = DOOM_ABILITIES[idx];
    if (player.abilityCooldowns[idx] > 0) return;
    if (player.energy < def.cost) return;
    player.energy -= def.cost;
    player.abilityCooldowns[idx] = def.cooldownFrames;
    CAST_FNS[idx]();
    if (DEBUG) console.log("[Doom Scroller] cast " + def.name);
  }

  function spawnDoomProjectile(p){ doomProjectiles.push(p); }

  const CAST_FNS = [
    function castPlasmaBolt(){
      const originX = player.x + PLAYER_W, originY = playerCenterY();
      const target = enemyTargetPoint(originX + 300, originY);
      const v = aimAt(originX, originY, target.x, target.y, 10);
      spawnDoomProjectile({ x: originX, y: originY, vx: v.vx, vy: v.vy, dmg: DOOM_ABILITIES[0].damage, category: "energy", r: 6, color: COLORS.plasma });
    },
    function castSelfRepair(){
      const def = DOOM_ABILITIES[1];
      player.hp = Math.min(PLAYER_MAX_HP, player.hp + def.healAmount);
      effects.push({ type: "heal", x: player.x + PLAYER_W/2, y: playerCenterY(), life: 26 });
    },
    function castDisruptorBeam(){
      const originX = player.x + PLAYER_W, originY = playerCenterY();
      const target = enemyTargetPoint(originX + 300, originY);
      effects.push({ type: "beam", x1: originX, y1: originY, x2: target.x, y2: target.y, life: 14, color: COLORS.beam });
      if (enemy) applyDamageToEnemy(DOOM_ABILITIES[2].damage, "energy", false);
    },
    function castDoomBolts(){
      const originX = player.x + PLAYER_W, originY = playerCenterY();
      const target = enemyTargetPoint(originX + 300, originY);
      const baseAngle = Math.atan2(target.y - originY, target.x - originX);
      [-0.18, 0, 0.18].forEach(spread => {
        const angle = baseAngle + spread;
        spawnDoomProjectile({ x: originX, y: originY, vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9, dmg: DOOM_ABILITIES[3].damage, category: "energy", r: 5, color: COLORS.bolt });
      });
    },
    function mysticShieldSlotUnused(){
      // Mystic Shield is now a held stance handled every frame by
      // updateShieldHold(), not a discrete cast — this slot is never
      // invoked. It stays as a no-op purely to keep CAST_FNS positionally
      // aligned with DOOM_ABILITIES by index.
    },
    function castTeleportSlip(){
      const midpoint = (PLAYER_ARENA_MIN_X + PLAYER_ARENA_MAX_X) / 2;
      const dir = player.x > midpoint ? -1 : 1;
      player.x = clamp(player.x + dir * 90, PLAYER_ARENA_MIN_X, PLAYER_ARENA_MAX_X);
      player.invulnFrames = Math.max(player.invulnFrames, 20);
      effects.push({ type: "teleport", x: player.x + PLAYER_W/2, y: playerCenterY(), life: 16 });
    },
    function castMolecularBarrier(){
      const def = DOOM_ABILITIES[6];
      player.blockFrames = def.blockDurationFrames;
      player.blockReduction = def.blockReduction;
      effects.push({ type: "block", x: player.x + PLAYER_W/2, y: playerCenterY(), life: def.blockDurationFrames });
    },
    function castLevitationBurst(){
      if (player.mode === "walking"){
        player.mode = "flying";
        player.y -= 10;
      }
      const cx = player.x + PLAYER_W/2;
      effects.push({ type: "burst", x: cx, y: GROUND_Y, maxR: 170, life: 18, color: COLORS.levitation });
      if (enemy && Math.abs((enemy.x + enemy.w/2) - cx) <= 170 && (enemy.y + enemy.h) > GROUND_Y - 60){
        applyDamageToEnemy(DOOM_ABILITIES[7].damage, "physical", false);
      }
    },
    function castHyperbolicNova(){
      effects.push({ type: "nova", x: player.x + PLAYER_W/2, y: playerCenterY(), life: 26 });
      if (enemy) applyDamageToEnemy(DOOM_ABILITIES[8].damage, "energy", true);
    }
  ];

  function updateProjectiles(){
    doomProjectiles.forEach(p => { p.x += p.vx; p.y += p.vy; });
    doomProjectiles = doomProjectiles.filter(p => {
      if (p.x > CANVAS_W + 20 || p.y < -50 || p.y > CANVAS_H + 50) return false;
      if (enemy && rectOverlap(p.x - p.r, p.y - p.r, p.r*2, p.r*2, enemy.x, enemy.y, enemy.w, enemy.h)){
        applyDamageToEnemy(p.dmg, p.category, false);
        return false;
      }
      return true;
    });
  }

  function updateHazards(){
    hazards.forEach(h => {
      if (h.armed && playerOverlapsBand({ min: h.min, max: h.max })){
        applyDamageToPlayer(h.dmg);
        h.armed = false;
      }
      h.life--;
    });
    hazards = hazards.filter(h => h.life > 0);
  }

  function scheduleReflect(amount){
    const cy = playerCenterY();
    hazards.push({ min: cy - 25, max: cy + 25, life: 16, dmg: amount, armed: true });
  }

  /* ---------------- enemy ---------------- */
  function spawnEnemy(defId){
    const def = CHARACTERS[defId];
    const baseY = def.movement.type === "hoverer" ? (GROUND_Y - def.h - 40) : (GROUND_Y - def.h);
    enemy = {
      defId, def,
      x: ENEMY_X, y: baseY,
      w: def.w, h: def.h,
      baseX: ENEMY_X, baseY,
      hp: def.hp, maxHp: def.hp,
      movementT: 0,
      busy: false,
      rangedImmune: false,
      reflectPending: false,
      reflectChance: 1,
      damageReduction: 0,
      hasShield: true,
      abilityStates: def.abilities.map((a, i) => ({
        phase: "idle",
        timer: 0,
        cooldownRemaining: 20 + i * 25 + Math.random() * 30,
        safeBand: null,
        trackedY: null,
        hasHitPlayer: false
      }))
    };
  }

  function runMovement(){
    const t = enemy.movementT;
    const type = enemy.def.movement.type;
    let x = enemy.baseX, y = enemy.baseY;
    if (type === "lunger") x = enemy.baseX - 35 + 35 * Math.sin(t * 0.09); // fast, restless — always closing and darting back
    else if (type === "hoverer"){ y = enemy.baseY - 30 + 20 * Math.sin(t * 0.04); x = enemy.baseX + 25 * Math.sin(t * 0.017); }
    else if (type === "strafer") x = enemy.baseX + 35 * Math.sin(t * 0.02);
    else if (type === "charger") x = enemy.baseX + 25 * Math.sin(t * 0.045);
    else if (type === "stomper") x = enemy.baseX + 12 * Math.sin(t * 0.03); // a restless shuffle between charges, not a dead stop

    for (let i = 0; i < enemy.def.abilities.length; i++){
      const def = enemy.def.abilities[i], st = enemy.abilityStates[i];
      if (def.chargeForward && st.phase === "active"){
        const progress = 1 - (st.timer / def.activeFrames);
        x = enemy.baseX - (def.chargeDistance || 150) * Math.sin(progress * Math.PI);
      }
    }
    enemy.x = x; enemy.y = y;
  }

  function updateAbilityState(i){
    const def = enemy.def.abilities[i];
    const st = enemy.abilityStates[i];

    if (st.phase === "idle"){
      if (st.cooldownRemaining > 0){ st.cooldownRemaining--; return; }
      if (enemy.busy) return;
      enemy.busy = true;
      st.phase = "telegraph";
      st.timer = def.telegraphFrames;
      st.hasHitPlayer = false;
      if (def.trackPlayerY) st.trackedY = playerCenterY();
      if (def.kind === "unblockable" && def.visual === "barrage"){
        st.rocketSeeds = Array.from({ length: def.rocketCount || 6 }, () => ({
          angle: (Math.random() * 2 - 1) * 1.2,
          dist: 30 + Math.random() * 40
        }));
      }
    } else if (st.phase === "telegraph"){
      st.timer--;
      if (st.timer <= 0){
        st.phase = "active";
        st.timer = def.activeFrames;
        if (def.rangedImmuneWhileActive) enemy.rangedImmune = true;
        if (def.kind === "buff" && def.buffType === "damageReduction") enemy.damageReduction = def.buffAmount;
        if (def.kind === "reflectBuff"){
          enemy.reflectPending = true;
          enemy.reflectChance = def.reflectChance != null ? def.reflectChance : 1;
        }
        if (def.kind === "projectile") spawnEnemyProjectile(def);
      }
    } else if (st.phase === "active"){
      if (def.kind === "unblockable"){
        dealUnblockableDamage(def, st);
      } else if (def.kind !== "buff" && def.kind !== "reflectBuff" && def.kind !== "projectile"){
        dealAbilityDamageToPlayer(def, st);
      }
      st.timer--;
      if (st.timer <= 0){
        if (def.rangedImmuneWhileActive) enemy.rangedImmune = false;
        if (def.kind === "buff") enemy.damageReduction = 0;
        if (def.kind === "reflectBuff") enemy.reflectPending = false;
        st.phase = "idle";
        st.cooldownRemaining = randBetween(def.cdMin, def.cdMax);
        enemy.busy = false;
      }
    }
  }

  // "projectile" abilities fire a real traveling shot aimed at wherever
  // Doom actually is the instant it launches (angle included) — exactly
  // like Doom's own Plasma Bolt/Doom Bolts. It doesn't home in after
  // that, so Doom dodges by no longer being there when it arrives:
  // moving, changing altitude, or dropping out of the sky to duck under it.
  function spawnEnemyProjectile(def){
    const originX = enemy.x + enemy.w/2, originY = enemy.y + enemy.h/2;
    const targetX = player.x + PLAYER_W/2, targetY = playerCenterY();
    const v = aimAt(originX, originY, targetX, targetY, def.speed);
    const p = { x: originX, y: originY, vx: v.vx, vy: v.vy, dmg: def.damage, r: def.r || 6, color: def.color };
    if (def.style === "shield"){
      p.style = "shield";
      p.rimColor = enemy.def.colors.shieldRim;
      p.color = enemy.def.colors.shield;
      p.boomerang = true;
      p.age = 0;
      p.turnAfter = 26; // frames outbound before it curves back to Cap, whether or not it connected
      enemy.hasShield = false; // he's throwing it — his own static shield shouldn't also be drawn on him
    }
    enemyProjectiles.push(p);
  }

  function updateEnemyProjectiles(){
    enemyProjectiles.forEach(p => {
      if (p.boomerang){
        if (!p.returning && ++p.age > p.turnAfter) p.returning = true;
        if (p.returning && enemy){
          const back = aimAt(p.x, p.y, enemy.x + enemy.w/2, enemy.y + enemy.h/2, Math.hypot(p.vx, p.vy) || 6);
          p.vx = back.vx; p.vy = back.vy;
        }
      }
      p.x += p.vx; p.y += p.vy;
    });
    enemyProjectiles = enemyProjectiles.filter(p => {
      // A shield-style projectile hands the shield back the moment it's
      // removed, whatever the reason (caught, hit its target, or flew
      // off-screen) — otherwise Cap could end up permanently shieldless.
      const releaseShield = () => { if (p.style === "shield" && enemy) enemy.hasShield = true; return false; };
      if (p.returning && enemy && Math.hypot((enemy.x + enemy.w/2) - p.x, (enemy.y + enemy.h/2) - p.y) < 18) return releaseShield(); // caught
      if (p.x < -50 || p.x > CANVAS_W + 50 || p.y < -50 || p.y > CANVAS_H + 50) return releaseShield();
      if (!p.returning){
        const top = playerTop(), height = playerHeight();
        if (rectOverlap(p.x - p.r, p.y - p.r, p.r*2, p.r*2, player.x, top, PLAYER_W, height)){
          applyDamageToPlayer(p.dmg);
          return releaseShield();
        }
      }
      return true;
    });
  }

  function dealAbilityDamageToPlayer(def, st){
    if (st.hasHitPlayer) return;
    const band = def.trackPlayerY ? { min: st.trackedY - def.trackHalf, max: st.trackedY + def.trackHalf } : BAND[def.band];
    if (playerOverlapsBand(band)){
      applyDamageToPlayer(def.damage);
      st.hasHitPlayer = true;
    }
  }

  // "unblockable" abilities (Cyclops's Crossfire, Iron Man's Missile
  // Barrage) have no y-band at all — their custom telegraph in
  // drawSpecialTelegraphs() always converges on Doom, so the only way
  // to avoid the hit is to be actively shielded (invulnFrames) the
  // instant it connects, which applyDamageToPlayer already checks.
  function dealUnblockableDamage(def, st){
    if (st.hasHitPlayer) return;
    applyDamageToPlayer(def.damage);
    st.hasHitPlayer = true;
  }

  function applyDamageToEnemy(amount, category, piercing){
    if (!enemy || enemy.hp <= 0) return false;
    if (category === "energy" && !piercing){
      if (enemy.rangedImmune){
        effects.push({ type: "clang", x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2, life: 12 });
        return false;
      }
      if (enemy.reflectPending){
        enemy.reflectPending = false;
        // A bounce-back attempt is one-shot either way — it only
        // consumes the buff, then either sends the hit right back at
        // Doom or (30% by default) fumbles it and takes the hit clean.
        if (Math.random() < enemy.reflectChance){
          scheduleReflect(amount);
          effects.push({ type: "clang", x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2, life: 12 });
          return false;
        }
      }
    }
    const mult = 1 - (enemy.damageReduction || 0);
    enemy.hp = Math.max(0, enemy.hp - amount * mult);
    effects.push({ type: "spark", x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2, life: 10 });
    if (enemy.hp <= 0) triggerEnemyDefeat();
    return true;
  }

  function triggerEnemyDefeat(){
    lastDefeatedName = enemy.def.displayName;
    lastScoreBonus = 150 + Math.floor(player.hp);
    score += lastScoreBonus;
    lastCharacterId = enemy.defId;
    enemy = null;
    hazards = [];
    phase = "victory";
    victoryTimer = VICTORY_PAUSE_FRAMES;
  }

  function updateEnemy(){
    enemy.movementT++;
    runMovement();
    for (let i = 0; i < enemy.def.abilities.length; i++) updateAbilityState(i);
  }

  function startEncounter(){
    let pool = CHARACTER_IDS;
    if (pool.length > 1) pool = pool.filter(id => id !== lastCharacterId);
    const defId = pool[Math.floor(Math.random() * pool.length)];
    spawnEnemy(defId);
    phase = "encounter";
  }

  function nextBiome(){
    biomeIndex = (biomeIndex + 1) % BIOMES.length;
    travelDistance = 0;
    phase = "traveling";
  }

  /* ---------------- effects ---------------- */
  function updateEffects(){
    effects.forEach(e => { e.life--; });
    effects = effects.filter(e => e.life > 0);
  }

  /* ---------------- update ---------------- */
  function update(){
    frame++;
    updatePlayer();

    if (phase === "traveling"){
      travelDistance += SCROLL_SPEED;
      worldXTotal += SCROLL_SPEED;
      score += SCROLL_SPEED * 0.05;
      if (travelDistance >= BIOME_TRAVEL_DISTANCE) startEncounter();
    } else if (phase === "encounter"){
      updateEnemy();
    } else if (phase === "victory"){
      victoryTimer--;
      if (victoryTimer <= 0) nextBiome();
    }

    updateHazards();
    updateProjectiles();
    updateEnemyProjectiles();
    updateEffects();
  }

  /* ---------------- draw: background ---------------- */
  function drawBackground(){
    const biome = BIOMES[biomeIndex];
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, biome.skyTop);
    grad.addColorStop(1, biome.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

    // Two parallax layers instead of one: a distant, faded, slow-moving
    // layer behind the existing silhouette row gives the scene real
    // depth for very little cost — no new geometry, just the same
    // shapes redrawn bigger/fainter/slower.
    drawSilhouetteLayer(biome, biome.farColor, biome.tileW * 1.7, 0.35, 0.5);
    drawSilhouetteLayer(biome, biome.silhouette, biome.tileW, 1, 1);

    ctx.fillStyle = biome.ground;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.strokeStyle = biome.silhouette;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_W, GROUND_Y);
    ctx.stroke();
  }

  function drawSilhouetteLayer(biome, color, tileW, parallax, alpha){
    const offset = (worldXTotal * parallax) % tileW;
    const count = Math.ceil(CANVAS_W / tileW) + 2;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (let i = -1; i < count; i++){
      const tx = i * tileW - offset;
      drawBiomeUnit(biome.kind, tx, i, tileW);
    }
    ctx.globalAlpha = 1;
  }

  function drawBiomeUnit(kind, tx, i, tileW){
    const baseY = GROUND_Y;
    if (kind === "towers"){
      const h = 70 + ((i * 37) % 50);
      ctx.fillRect(tx + 20, baseY - h, 34, h);
      ctx.beginPath();
      ctx.moveTo(tx + 20, baseY - h);
      ctx.lineTo(tx + 37, baseY - h - 18);
      ctx.lineTo(tx + 54, baseY - h);
      ctx.closePath();
      ctx.fill();
      if (i % 2 === 0) ctx.clearRect(tx + 30, baseY - h + 10, 8, 10);
    } else if (kind === "buildings"){
      const h = 40 + ((i * 53) % 90);
      ctx.fillRect(tx + 6, baseY - h, tileW - 20, h);
    } else if (kind === "pines"){
      const h = 46 + ((i * 29) % 26);
      ctx.beginPath();
      ctx.moveTo(tx + tileW/2, baseY - h);
      ctx.lineTo(tx + 6, baseY);
      ctx.lineTo(tx + tileW - 6, baseY);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "spires"){
      const h = 30 + ((i * 41) % 70);
      ctx.beginPath();
      ctx.moveTo(tx + 10, baseY);
      ctx.lineTo(tx + tileW/2 - 6, baseY - h);
      ctx.lineTo(tx + tileW/2 + 8, baseY - h * 0.6);
      ctx.lineTo(tx + tileW - 10, baseY);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "hills"){
      ctx.beginPath();
      ctx.arc(tx + tileW/2, baseY + 30, 60, Math.PI, 0);
      ctx.fill();
      if (i % 3 === 0){
        ctx.fillRect(tx + tileW/2 - 22, baseY - 40, 44, 40);
        ctx.beginPath();
        ctx.moveTo(tx + tileW/2 - 26, baseY - 40);
        ctx.lineTo(tx + tileW/2, baseY - 58);
        ctx.lineTo(tx + tileW/2 + 26, baseY - 40);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /* ---------------- draw: unblockable telegraphs ---------------- */
  // Each "unblockable" ability draws its own custom wind-up instead of
  // a generic danger band, since there's no y-range to show — the only
  // real information is "this is coming, get your shield up."
  function drawSpecialTelegraphs(){
    if (!enemy) return;
    enemy.def.abilities.forEach((def, i) => {
      if (def.kind !== "unblockable") return;
      const st = enemy.abilityStates[i];
      if (st.phase !== "telegraph" && st.phase !== "active") return;
      if (def.visual === "crossfire") drawCrossfireTelegraph(def, st);
      else if (def.visual === "barrage") drawBarrageTelegraph(def, st);
    });
  }

  // Two beams sweep in from wide angles and converge exactly on Doom's
  // current position as the telegraph completes, then flash together
  // during the active frame — a shield (any invulnFrames) is the only
  // way through it.
  function drawCrossfireTelegraph(def, st){
    const originX = enemy.x + enemy.w * 0.5, originY = enemy.y + enemy.h * 0.14;
    const targetX = player.x + PLAYER_W / 2, targetY = playerCenterY();
    const baseAngle = Math.atan2(targetY - originY, targetX - originX);
    const spreadMax = 70 * Math.PI / 180;
    const spread = st.phase === "telegraph" ? spreadMax * (st.timer / def.telegraphFrames) : 0;
    const len = Math.max(CANVAS_W, CANVAS_H) * 1.2;
    const active = st.phase === "active";
    [spread, -spread].forEach(offset => {
      const angle = baseAngle + offset;
      ctx.strokeStyle = active ? "rgba(255,120,110,0.95)" : "rgba(229,72,77,0.55)";
      ctx.lineWidth = active ? 7 : 3;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + Math.cos(angle) * len, originY + Math.sin(angle) * len);
      ctx.stroke();
    });
  }

  // A handful of tiny rockets spray out from Iron Man, then curve in to
  // converge on wherever Doom currently is by the time the telegraph
  // completes — same "shield or take it" rule as Crossfire.
  function drawBarrageTelegraph(def, st){
    if (!st.rocketSeeds) return;
    const originX = enemy.x + enemy.w * 0.5, originY = enemy.y + enemy.h * 0.4;
    const targetX = player.x + PLAYER_W / 2, targetY = playerCenterY();
    const progress = st.phase === "telegraph" ? 1 - st.timer / def.telegraphFrames : 1;
    const spreadPhase = Math.min(1, progress / 0.45);
    const homePhase = Math.max(0, (progress - 0.45) / 0.55);
    const active = st.phase === "active";
    st.rocketSeeds.forEach(seed => {
      const sx = originX + Math.cos(seed.angle) * seed.dist * spreadPhase;
      const sy = originY + Math.sin(seed.angle) * seed.dist * spreadPhase - 14 * spreadPhase;
      const rx = sx + (targetX - sx) * homePhase;
      const ry = sy + (targetY - sy) * homePhase;
      const backAngle = Math.atan2(ry - originY, rx - originX);
      ctx.strokeStyle = "rgba(246,169,59,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - Math.cos(backAngle) * 9, ry - Math.sin(backAngle) * 9);
      ctx.stroke();
      ctx.fillStyle = active ? "#FFFFFF" : COLORS.repulsorFx;
      ctx.beginPath();
      ctx.arc(rx, ry, active ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /* ---------------- draw: player ---------------- */
  function drawPlayer(){
    const x = player.x, y = playerTop(), h = playerHeight();
    const legPhase = Math.floor(frame / 6) % 2;

    drawGroundShadow(x + PLAYER_W/2, y + h);

    if (player.mode === "flying"){
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.12);
      const cx = x + PLAYER_W/2, cy = y + h/2;
      const r = Math.max(PLAYER_W, h) * (0.9 + pulse * 0.35);
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      glow.addColorStop(0, `rgba(95,217,122,${0.55 + pulse * 0.25})`);
      glow.addColorStop(0.6, `rgba(46,107,58,${0.28 + pulse * 0.15})`);
      glow.addColorStop(1, "rgba(46,107,58,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = COLORS.doomCloakDark;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + h);
    ctx.lineTo(x - 2, y + h * 0.15);
    ctx.lineTo(x + PLAYER_W * 0.4, y);
    ctx.lineTo(x + 4, y + h * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.doomArmor;
    ctx.fillRect(x, y + h * 0.18, PLAYER_W, h * 0.6);
    ctx.fillStyle = COLORS.doomArmorDark;
    ctx.fillRect(x, y + h * 0.18, PLAYER_W, 3);

    ctx.fillStyle = COLORS.doomTrim;
    ctx.fillRect(x + PLAYER_W * 0.3, y + h * 0.28, PLAYER_W * 0.4, 6);
    ctx.fillRect(x + PLAYER_W * 0.25, y + h * 0.62, PLAYER_W * 0.5, 5);
    ctx.fillRect(x - 3, y + h * 0.42, 6, PLAYER_W * 0.5);
    ctx.fillRect(x + PLAYER_W - 3, y + h * 0.42, 6, PLAYER_W * 0.5);

    ctx.fillStyle = COLORS.doomMask;
    ctx.beginPath();
    ctx.arc(x + PLAYER_W/2, y + h * 0.14, PLAYER_W * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.doomEyes;
    ctx.fillRect(x + PLAYER_W * 0.28, y + h * 0.1, PLAYER_W * 0.16, 4);
    ctx.fillRect(x + PLAYER_W * 0.56, y + h * 0.1, PLAYER_W * 0.16, 4);
    ctx.strokeStyle = COLORS.doomCloakDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + PLAYER_W/2, y + h * 0.14, PLAYER_W * 0.42, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.fillStyle = COLORS.doomCloak;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 4);
    ctx.lineTo(x + PLAYER_W + 4, y - 4);
    ctx.lineTo(x + PLAYER_W * 0.5, y - 16);
    ctx.closePath();
    ctx.fill();

    if (player.mode !== "flying" && !player.ducking){
      ctx.fillStyle = COLORS.doomArmorDark;
      if (!player.onGround){
        ctx.fillRect(x + 4, y + h - 6, 8, 6);
        ctx.fillRect(x + PLAYER_W - 12, y + h - 6, 8, 6);
      } else if (legPhase === 0){
        ctx.fillRect(x + 4, y + h - 6, 8, 6);
        ctx.fillRect(x + PLAYER_W - 12, y + h - 6, 8, 4);
      } else {
        ctx.fillRect(x + 4, y + h - 6, 8, 4);
        ctx.fillRect(x + PLAYER_W - 12, y + h - 6, 8, 6);
      }
    }

    if (player.invulnFrames > 0){
      ctx.strokeStyle = COLORS.shieldFx;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + PLAYER_W/2, y + h/2, Math.max(PLAYER_W, h) * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.blockFrames > 0){
      ctx.strokeStyle = COLORS.blockFx;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 6, y - 6, PLAYER_W + 12, h + 12);
    }
  }

  /* ---------------- draw: enemy ---------------- */
  function drawStar(cx, cy, outerR, innerR){
    ctx.beginPath();
    for (let i = 0; i < 10; i++){
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const px = cx + r * Math.cos(angle), py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function enemyIsDucking(){
    return enemy.def.abilities.some((def, i) => {
      const st = enemy.abilityStates[i];
      return def.kind === "band" && def.band === "ground" && (st.phase === "telegraph" || st.phase === "active");
    });
  }

  // The mirror image of the ducking squash — rearing back and up,
  // winding up for a head-height swing (Claw Flurry). Gives "ground"
  // and "head" band attacks visually distinct wind-ups without needing
  // separate art per character.
  function enemyIsRearing(){
    return enemy.def.abilities.some((def, i) => {
      const st = enemy.abilityStates[i];
      return def.kind === "band" && def.band === "head" && (st.phase === "telegraph" || st.phase === "active");
    });
  }

  // A pulsing red glow around whichever character is about to (or is
  // currently) hitting the player with a "band" attack — replaces a
  // screen-spanning color wash with a wind-up cue anchored on the
  // attacker, growing brighter as the telegraph nears completion.
  function enemyThreatGlowAlpha(){
    if (!enemy) return 0;
    let peak = 0;
    enemy.def.abilities.forEach((def, i) => {
      if (def.kind !== "band") return;
      const st = enemy.abilityStates[i];
      if (st.phase === "telegraph"){
        const progress = 1 - st.timer / def.telegraphFrames;
        peak = Math.max(peak, 0.2 + progress * 0.4);
      } else if (st.phase === "active"){
        peak = Math.max(peak, 0.75);
      }
    });
    return peak;
  }

  function drawGroundShadow(cx, feetY){
    const altitude = Math.max(0, GROUND_Y - feetY);
    const t = Math.min(1, altitude / 200);
    const rx = 22 * (1 - t * 0.5), ry = 6 * (1 - t * 0.5);
    ctx.fillStyle = `rgba(0,0,0,${(0.35 * (1 - t * 0.6)).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 4, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEnemy(){
    if (!enemy) return;
    const { x, y, w, h } = enemy;
    const c = enemy.def.colors;

    drawGroundShadow(x + w/2, y + h);

    // No per-character crouch/rear-back art — instead, squash or
    // stretch the whole sprite toward or away from its feet whenever
    // it's winding up a ground-level or head-level attack, so it
    // visibly telegraphs which height is coming.
    const ducking = enemyIsDucking();
    const rearing = !ducking && enemyIsRearing();
    ctx.save();
    if (ducking){
      const feetY = y + h;
      ctx.translate(0, feetY);
      ctx.scale(1, 0.6);
      ctx.translate(0, -feetY);
    } else if (rearing){
      const feetY = y + h;
      ctx.translate(0, feetY);
      ctx.scale(1, 1.18);
      ctx.translate(0, -feetY);
    }

    if (enemy.defId === "wolverine"){
      ctx.fillStyle = "#3A2F1F"; ctx.fillRect(x + 4, y + h*0.85, w - 8, h*0.15);
      ctx.fillStyle = c.body; ctx.fillRect(x, y + h*0.25, w, h*0.62);
      ctx.fillStyle = "#2A2140"; ctx.fillRect(x, y + h*0.62, w, 4);
      ctx.fillStyle = c.mask; ctx.beginPath(); ctx.arc(x+w/2, y+h*0.16, w*0.4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = c.mask;
      ctx.beginPath(); ctx.moveTo(x+w*0.18, y-h*0.02); ctx.lineTo(x+w*0.02, y-h*0.16); ctx.lineTo(x+w*0.34, y+h*0.02); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+w*0.82, y-h*0.02); ctx.lineTo(x+w*0.98, y-h*0.16); ctx.lineTo(x+w*0.66, y+h*0.02); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1A1A1A";
      ctx.fillRect(x+w*0.28, y+h*0.14, w*0.16, 4);
      ctx.fillRect(x+w*0.56, y+h*0.14, w*0.16, 4);
      ctx.fillStyle = c.claws;
      ctx.fillRect(x - 6, y + h*0.4, 6, 16);
      ctx.fillRect(x + w, y + h*0.4, 6, 16);
    } else if (enemy.defId === "ironman"){
      ctx.fillStyle = "#7A2323"; ctx.fillRect(x + 4, y + h*0.86, 8, h*0.14);
      ctx.fillStyle = "#7A2323"; ctx.fillRect(x + w - 12, y + h*0.86, 8, h*0.14);
      ctx.fillStyle = c.body; ctx.fillRect(x, y + h*0.2, w, h*0.8);
      ctx.fillStyle = c.gold; ctx.fillRect(x + w*0.25, y + h*0.3, w*0.5, h*0.3);
      ctx.fillStyle = "#8FE0F0"; ctx.beginPath(); ctx.arc(x+w/2, y+h*0.45, w*0.12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = c.gold; ctx.fillRect(x - 3, y + h*0.24, 6, h*0.22);
      ctx.fillRect(x + w - 3, y + h*0.24, 6, h*0.22);
      ctx.fillStyle = c.body; ctx.beginPath(); ctx.arc(x+w/2, y+h*0.14, w*0.38, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#8FE0F0";
      ctx.fillRect(x+w*0.24, y+h*0.1, w*0.2, 4);
      ctx.fillRect(x+w*0.56, y+h*0.1, w*0.2, 4);
    } else if (enemy.defId === "hulk"){
      ctx.fillStyle = c.pants; ctx.fillRect(x + w*0.1, y + h*0.75, w*0.8, h*0.25);
      ctx.fillStyle = "#3A6E2E";
      ctx.beginPath(); ctx.moveTo(x+w*0.1, y+h); ctx.lineTo(x+w*0.22, y+h*0.9); ctx.lineTo(x+w*0.34, y+h); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+w*0.66, y+h); ctx.lineTo(x+w*0.78, y+h*0.9); ctx.lineTo(x+w*0.9, y+h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.body; ctx.fillRect(x, y + h*0.18, w, h*0.62);
      ctx.fillStyle = "#3A6E2E"; ctx.fillRect(x, y + h*0.44, w, 5);
      ctx.fillStyle = "#5FA84A";
      ctx.beginPath(); ctx.arc(x - 2, y + h*0.4, w*0.16, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w + 2, y + h*0.4, w*0.16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = c.body; ctx.beginPath(); ctx.arc(x+w/2, y+h*0.14, w*0.34, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#3A6E2E";
      ctx.beginPath(); ctx.moveTo(x+w*0.2, y+h*0.06); ctx.lineTo(x+w*0.42, y+h*0.1); ctx.lineTo(x+w*0.24, y+h*0.14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+w*0.8, y+h*0.06); ctx.lineTo(x+w*0.58, y+h*0.1); ctx.lineTo(x+w*0.76, y+h*0.14); ctx.closePath(); ctx.fill();
    } else if (enemy.defId === "cyclops"){
      ctx.fillStyle = "#1E3E7A"; ctx.fillRect(x + 2, y + h*0.86, w - 4, h*0.14);
      ctx.fillStyle = c.body; ctx.fillRect(x, y + h*0.22, w, h*0.78);
      ctx.fillStyle = "#1E3E7A"; ctx.fillRect(x, y + h*0.5, w, 3);
      ctx.fillStyle = "#D4B24F"; ctx.fillRect(x + w*0.36, y + h*0.5 - 3, w*0.28, 9);
      ctx.fillStyle = c.body; ctx.beginPath(); ctx.arc(x+w/2, y+h*0.14, w*0.36, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1E3E7A"; ctx.fillRect(x + w*0.15, y + h*0.08, w*0.7, h*0.14);
      ctx.fillStyle = c.visor; ctx.fillRect(x + w*0.18, y + h*0.1, w*0.64, h*0.1);
      ctx.fillStyle = "#FF8A7A"; ctx.fillRect(x + w*0.2, y + h*0.115, w*0.6, 2);
    } else if (enemy.defId === "capamerica"){
      ctx.fillStyle = "#1E3AA0"; ctx.fillRect(x + 2, y + h*0.86, w - 4, h*0.14);
      ctx.fillStyle = c.body; ctx.fillRect(x, y + h*0.2, w, h*0.8);
      ctx.fillStyle = "#E5484D"; ctx.fillRect(x, y + h*0.56, w, h*0.08);
      ctx.fillStyle = "#FFFFFF";
      drawStar(x + w/2, y + h*0.42, w*0.16, w*0.07);
      ctx.fillStyle = c.body; ctx.beginPath(); ctx.arc(x+w/2, y+h*0.14, w*0.34, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#E5484D";
      ctx.beginPath(); ctx.moveTo(x+w*0.14, y-h*0.02); ctx.lineTo(x-w*0.02, y+h*0.08); ctx.lineTo(x+w*0.22, y+h*0.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+w*0.86, y-h*0.02); ctx.lineTo(x+w*1.02, y+h*0.08); ctx.lineTo(x+w*0.78, y+h*0.1); ctx.closePath(); ctx.fill();
      if (enemy.hasShield){
        ctx.fillStyle = c.shieldRim; ctx.beginPath(); ctx.arc(x - 14, y + h*0.5, 18, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = c.shield; ctx.beginPath(); ctx.arc(x - 14, y + h*0.5, 13, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#FFFFFF"; drawStar(x - 14, y + h*0.5, 6, 2.6);
      }
    }

    ctx.restore();

    const glowAlpha = enemyThreatGlowAlpha();
    if (glowAlpha > 0){
      const pulse = 0.6 + 0.4 * Math.sin(frame * 0.4);
      ctx.strokeStyle = `rgba(${COLORS.threatGlow},${(glowAlpha * pulse).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + w/2, y + h/2, Math.max(w, h) * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* ---------------- draw: effects & projectiles ---------------- */
  function drawProjectiles(){
    doomProjectiles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawEnemyProjectiles(){
    enemyProjectiles.forEach(p => {
      if (p.style === "shield"){
        ctx.fillStyle = p.rimColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.65, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawEffects(){
    effects.forEach(e => {
      if (e.type === "burst" || e.type === "nova"){
        const progress = 1 - (e.life / (e.type === "nova" ? 26 : 18));
        const r = (e.maxR || 90) * progress;
        ctx.strokeStyle = e.color || COLORS.nova;
        ctx.lineWidth = 3;
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.type === "beam"){
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 6;
        ctx.globalAlpha = e.life / 14;
        ctx.beginPath();
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.type === "heal"){
        ctx.strokeStyle = COLORS.healFx;
        ctx.lineWidth = 3;
        ctx.globalAlpha = e.life / 26;
        const r = 10 + (1 - e.life/26) * 20;
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = COLORS.healFx;
        ctx.fillRect(e.x - 2, e.y - 10, 4, 20);
        ctx.fillRect(e.x - 10, e.y - 2, 20, 4);
        ctx.globalAlpha = 1;
      } else if (e.type === "block"){
        ctx.strokeStyle = COLORS.blockFx;
        ctx.lineWidth = 3;
        ctx.globalAlpha = Math.min(1, e.life / 20);
        ctx.strokeRect(e.x - 22, e.y - 26, 44, 52);
        ctx.globalAlpha = 1;
      } else if (e.type === "teleport"){
        ctx.fillStyle = COLORS.teleportFx;
        ctx.globalAlpha = e.life / 16;
        ctx.beginPath(); ctx.arc(e.x, e.y, 24 * (1 - e.life/16), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (e.type === "hit" || e.type === "spark" || e.type === "clang"){
        ctx.fillStyle = e.type === "clang" ? "#FFFFFF" : COLORS.hpBar;
        ctx.globalAlpha = e.life / 12;
        ctx.beginPath(); ctx.arc(e.x, e.y, 10 * (1 - e.life/12) + 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }

  /* ---------------- draw: HUD ---------------- */
  function drawHud(){
    ctx.fillStyle = COLORS.hpBarBack;
    ctx.fillRect(14, 12, 150, 12);
    ctx.fillStyle = COLORS.hpBar;
    ctx.fillRect(14, 12, 150 * (player.hp / PLAYER_MAX_HP), 12);
    ctx.fillStyle = COLORS.energyBarBack;
    ctx.fillRect(14, 28, 150, 8);
    ctx.fillStyle = COLORS.energyBar;
    ctx.fillRect(14, 28, 150 * (player.energy / ENERGY_MAX), 8);

    ctx.fillStyle = COLORS.hud;
    ctx.font = "700 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("SCORE " + Math.floor(score), CANVAS_W - 12, 24);
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.fillText(BIOMES[biomeIndex].name, CANVAS_W - 12, 40);
    ctx.fillStyle = COLORS.doomTrim;
    ctx.font = "700 12px 'JetBrains Mono', monospace";
    ctx.fillText(DOOM_ABILITIES[selectedAbilityIndex].name.toUpperCase(), CANVAS_W - 12, 56);

    if (phase === "encounter" && enemy){
      const barW = 220, barX = (CANVAS_W - barW)/2;
      ctx.textAlign = "center";
      ctx.font = "700 13px 'JetBrains Mono', monospace";
      ctx.fillText(enemy.def.displayName, CANVAS_W/2, 20);
      ctx.fillStyle = COLORS.hpBarBack;
      ctx.fillRect(barX, 24, barW, 10);
      ctx.fillStyle = COLORS.enemyHpBar;
      ctx.fillRect(barX, 24, barW * (enemy.hp / enemy.maxHp), 10);
    }
    if (phase === "victory"){
      ctx.textAlign = "center";
      ctx.fillStyle = COLORS.hud;
      ctx.font = "700 16px 'JetBrains Mono', monospace";
      ctx.fillText(lastDefeatedName + " defeated! +" + lastScoreBonus, CANVAS_W/2, 60);
    }

    drawHotbar();
  }

  function drawHotbar(){
    const size = 30, gap = 4, total = 9 * size + 8 * gap;
    const startX = (CANVAS_W - total) / 2, y = CANVAS_H - 38;
    for (let i = 0; i < 9; i++){
      const x = startX + i * (size + gap);
      const def = DOOM_ABILITIES[i];
      const cd = player.abilityCooldowns[i];
      const affordable = player.energy >= def.cost;

      ctx.fillStyle = "rgba(31,36,48,0.85)";
      ctx.fillRect(x, y, size, size);

      if (i === 4 && keysDown.Digit5){
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.5);
        ctx.fillStyle = `rgba(62,122,219,${(0.35 + pulse * 0.25).toFixed(3)})`;
        ctx.fillRect(x, y, size, size);
      }

      if (cd > 0){
        const frac = cd / def.cooldownFrames;
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x, y, size, size * frac);
      }

      ctx.strokeStyle = affordable ? "rgba(255,255,255,0.5)" : "rgba(225,72,60,0.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

      if (i === selectedAbilityIndex){
        ctx.strokeStyle = COLORS.doomTrim;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1.5, y - 1.5, size + 3, size + 3);
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), x + size/2, y + size/2 + 4);
    }
  }

  /* ---------------- draw ---------------- */
  function draw(){
    drawBackground();
    drawEnemy();
    if (phase === "encounter") drawSpecialTelegraphs();
    drawProjectiles();
    drawEnemyProjectiles();
    drawPlayer();
    drawEffects();
    drawHud();
  }

  /* ---------------- loop / lifecycle ---------------- */
  // update()/draw() are wrapped so one bad frame logs to the console
  // and gets skipped instead of silently killing the whole animation
  // loop (which otherwise looks exactly like a freeze — the canvas
  // just stops, with no visible error). If this ever fires, the
  // console message names exactly what broke.
  function loop(){
    if (!running) return;
    try{
      update();
    }catch(err){
      console.error("[Doom Scroller] update() threw — recovering:", err);
    }
    if (running){
      try{
        draw();
      }catch(err){
        console.error("[Doom Scroller] draw() threw — recovering:", err);
      }
      animId = requestAnimationFrame(loop);
    }
  }

  function startGame(){
    resetState();
    started = true;
    running = true;
    hideOverlay();
    canvas.focus();
    loop();
  }

  function endGame(){
    running = false;
    over = true;
    cancelAnimationFrame(animId);
    // showGameOverOverlay() must run even if this final draw() throws —
    // otherwise a rendering bug at the exact moment of death leaves the
    // canvas stuck on its last frame with no game-over screen and no
    // way to restart, which looks exactly like a freeze.
    try{ draw(); }catch(err){ console.error("[Doom Scroller] final draw() threw:", err); }
    showGameOverOverlay();
  }

  /* ---------------- overlay UI ---------------- */
  function hideOverlay(){
    overlay.style.display = "none";
  }

  function showStartOverlay(){
    overlay.style.display = "flex";
    const localBest = getLocalBest();
    overlayInner.innerHTML = `
      <h3>Doom Scroller</h3>
      <p>Play as Dr. Doom, scrolling right through Latveria, Manhattan, the
      Canadian wilds, the Gamma Wastes, and Xavier's grounds. Each stretch
      ends in a fight against a random Marvel fighter — watch for the
      pulsing glow that means someone's winding up, dodge by flying,
      jumping, or ducking, and hold Mystic Shield through anything you
      can't dodge your way out of.</p>
      <p>Left/Right to move, Up to jump (or ascend while flying), Down to
      duck (or descend while flying), double-tap Space to toggle flying,
      number keys 1–9 for Doom's abilities — hold 5 for Mystic Shield.</p>
      ${localBest > 0 ? `<p style="font-size:0.82rem;opacity:0.85;">Your best so far: ${localBest}</p>` : ""}
      <button type="button" class="btn" id="doom-play-btn">Play</button>
    `;
    document.getElementById("doom-play-btn").addEventListener("click", startGame);
  }

  function showGameOverOverlay(){
    const finalScore = Math.floor(score);
    const isNewLocalBest = setLocalBestIfHigher(finalScore);
    const localBest = getLocalBest();

    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Doom Falls</h3>
      <p>Score: ${finalScore}${isNewLocalBest ? " — new personal best!" : ""}</p>
      <p style="font-size:0.78rem;opacity:0.8;margin-top:-10px;">Your best: ${localBest}</p>
      <button type="button" class="btn" id="doom-again-btn">Play Again</button>
    `;
    document.getElementById("doom-again-btn").addEventListener("click", startGame);
  }

  /* ---------------- input ---------------- */
  function initGame(){
    if (DEBUG) console.log("[Doom Scroller] doom.js loaded");
    canvas = document.getElementById("doom-canvas");
    overlay = document.getElementById("doom-overlay");
    overlayInner = document.getElementById("doom-overlay-inner");
    if (!canvas || !overlay) return;

    ctx = canvas.getContext("2d");
    resetState();
    draw();
    showStartOverlay();

    canvas.addEventListener("click", () => canvas.focus());
    canvas.addEventListener("blur", () => { for (const k in keysDown) delete keysDown[k]; });

    document.addEventListener("keydown", (e) => {
      if (document.activeElement !== canvas) return; // don't steal input meant for the other games on this page

      if (!started || over){
        if (e.code.startsWith("Digit") || e.code === "ArrowUp" || e.code === "Space"){
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "ArrowUp" || e.code === "ArrowDown"){
        e.preventDefault();
        keysDown[e.code] = true;
        if (e.code === "ArrowUp" && player.mode === "walking") jump();
      } else if (e.code === "Space"){
        e.preventDefault();
        if (!e.repeat){
          if (frame - lastSpaceTapFrame <= DOUBLE_TAP_WINDOW_FRAMES){
            toggleFlight();
            lastSpaceTapFrame = -9999;
          } else {
            lastSpaceTapFrame = frame;
          }
        }
      } else if (e.code.startsWith("Digit")){
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 9){
          e.preventDefault();
          selectedAbilityIndex = n - 1;
          if (n === 5){
            // Held, not cast — updateShieldHold() does the actual work
            // every frame this stays true. Not marked !e.repeat since a
            // held key's repeated keydowns are exactly what keeps this true.
            keysDown.Digit5 = true;
          } else {
            tryCastAbility(n - 1);
          }
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      if (document.activeElement !== canvas) return;
      if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "Digit5"){
        keysDown[e.code] = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initGame);
})();
