/* =====================================================================
   BENDING BRAWL
   A 1v1 elemental fighting game (Avatar: The Last Airbender-flavored).
   Every round starts with a spin of the wheel assigning you a random
   element — Fire, Water, Earth, or Air — each with its own three main
   strikes, two specials, and six combo/block pairs. Play against the
   CPU, or host/join a real match over the same Firebase Realtime
   Database setup Floppy Swords uses.

   Shares this page with the other games, so this file only reacts to
   keyboard input when its own canvas is focused (see the
   document.activeElement !== canvas guard in initGame(), same pattern
   Doom Scroller/And So I Wander/Arachnid Guy use).

   MOVE SYSTEM: every element's 11 moves (3 main, 2 specials, 6 combo/
   block pairs) are built from a small set of shared ARCHETYPES (base
   startup/active/recovery/damage/knockback numbers) plus a per-element
   ELEMENT_TUNING multiplier (Fire hits hardest and fastest but has the
   shortest reach; Earth hits hardest of all with huge knockback but is
   slowest to start moves; Air is fastest to start and best at pushing
   opponents away but hits lightest; Water sits in the middle with the
   best range) — see buildMove(). This is what makes 44 moves tractable
   and keeps the four elements comparably balanced by construction,
   rather than 44 individually hand-tuned numbers. See MOVES below.

   INPUT: WASD moves/jumps continuously; the three arrow keys (Left/Up/
   Right) are each element's three main strikes. Press two DIFFERENT
   arrow keys within COMBO_WINDOW_MS of each other and it's read as a
   combo pair instead of two separate main moves — see
   handleArrowPress(). Per the design doc's "Dynamic Mirroring Rule",
   each combo pair is an ATTACK in one order and a BLOCK/counter in the
   reverse order (Up-then-Left attacks, Left-then-Up blocks), which is
   just a lookup into the same combos table keyed by "first-second" —
   no separate mirroring logic needed. Down triggers a special: a heavy
   aerial drop while airborne, a low slide while grounded.

   COMBAT: melee moves check reach once per active window
   (checkMeleeHit()); projectile moves spawn a traveling hazard
   (spawnProjectile()) checked against both fighters every frame
   (updateProjectiles()). All damage/knockback/blocking resolves through
   one shared function, resolveHitOnDefender() — it reads the
   defender's CURRENT move (if they're in a block state) to decide how
   much damage gets through, whether a projectile is blocked at all
   (some block types don't cover projectiles), and whether a
   successful parry-type block stuns the attacker as a punish window.

   MULTIPLAYER: host-authoritative, same architecture as Floppy Swords
   (see that file's own header comment for the full rationale) — only
   the host ever runs the fight simulation; the guest sends its raw
   WASD state plus each individual arrow/down/jump key press as a
   discrete event, and the host feeds those into the EXACT SAME
   handleArrowPress()/etc. functions it uses for its own input, so
   there's only ever one place combo-window timing is decided. The
   guest never simulates locally — it just renders whatever the host
   broadcasts, the same "state ~20Hz, guest renders and relays input
   back" loop as Floppy Swords. See ensureFirebase()/hostMatch()/
   joinMatch() — this file reuses that file's Firebase setup
   (FLOPPY_FIREBASE_CONFIG in config.js also covers this game; no
   separate config needed, same project, a sibling /atla-rooms/ tree).

   TUNING: every number worth playing with lives in CONFIG below.
   ===================================================================== */

(function(){

  const DEBUG = false;

  /* ==================== CONFIG ==================== */
  const CANVAS_W = 640;
  const CANVAS_H = 360;
  const GROUND_Y = 300;

  const GRAVITY = 0.75;
  const JUMP_VELOCITY = -14;
  const MOVE_SPEED = 3.2;
  const FIGHTER_HALF_W = 16;

  const ROUND_HP = 100;
  const ROUNDS_TO_WIN = 2; // best of 3
  const ROUND_TIME_S = 60;

  const COMBO_WINDOW_MS = 320; // time to wait for a 2nd different arrow key before falling back to the single main move
  const HITSTUN_FRAMES = 16;

  const STATE_SEND_INTERVAL_MS = 50; // 20Hz, matches Floppy Swords
  const INPUT_SEND_INTERVAL_MS = 50;

  const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const ROOM_CODE_LEN = 5;

  const P1_START_X = CANVAS_W * 0.28;
  const P2_START_X = CANVAS_W * 0.72;

  const COLORS = {
    sky: "#5EC1F0",
    ground: "#D8CDBA",
    groundTrim: "#B9AC8E",
    skin: "#E8A466",
    outline: "#1A1A22",
    hpFull: "#5FB86B",
    hpMid: "#F6C945",
    hpLow: "#E5484D",
    hpBack: "#3A3F55",
    hudText: "#1F2430",
    roundPipOn: "#F6C945",
    roundPipOff: "rgba(255,255,255,0.35)",
    bannerBg: "rgba(20,24,31,0.65)",
    bannerText: "#FFFFFF"
  };

  /* ==================== elements & moves ==================== */
  // Base numbers for each of the 11 move "slots" every element fills —
  // see the file header comment for why this table (rather than 44
  // individually hand-tuned moves) is what makes this tractable.
  const ARCHETYPES = {
    mainMelee:      { kind: "melee", range: 95, dmg: 9, startup: 5, active: 6, recovery: 9, knockback: 5 },
    mainLauncher:   { kind: "melee", range: 90, dmg: 8, startup: 7, active: 6, recovery: 11, knockback: 3, launchUp: true },
    mainProjectile: { kind: "projectile", speed: 8, dmg: 9, startup: 6, recovery: 9, life: 100, knockback: 4 },
    specialAir:     { kind: "melee", range: 110, dmg: 13, startup: 4, active: 8, recovery: 12, knockback: 7, requiresAirborne: true, dashToward: true },
    specialGround:  { kind: "melee", range: 95, dmg: 8, startup: 5, active: 8, recovery: 10, knockback: 5, requiresGrounded: true, dash: true },
    comboBurst:     { kind: "projectile", speed: 12, dmg: 19, startup: 9, recovery: 15, life: 100, knockback: 6 },
    comboHeavy:     { kind: "melee", range: 100, dmg: 15, startup: 8, active: 6, recovery: 13, knockback: 11 },
    comboSustained: { kind: "melee", range: 95, dmgPerTick: 3, ticks: 6, tickInterval: 3, startup: 6, recovery: 10, knockback: 2 },
    blockWall:      { kind: "block", dmgReduction: 0.85, startup: 3, duration: 20, recovery: 8, blocksProjectiles: true },
    blockAbsorb:    { kind: "block", dmgReduction: 0.8, startup: 3, duration: 20, recovery: 8, blocksProjectiles: false, buffNextDmg: 0.3 },
    blockParry:     { kind: "block", dmgReduction: 1.0, startup: 2, duration: 11, recovery: 7, blocksProjectiles: true, isParry: true }
  };

  // Fire hits hardest and fastest but has the shortest reach; Earth hits
  // hardest of all with huge knockback but is slowest; Air is quickest
  // to start moves and best at shoving opponents away but hits
  // lightest; Water has no real weakness but no standout strength
  // either, the best all-round reach. Applied on top of ARCHETYPES in
  // buildMove() — see the file header for why this exists at all.
  const ELEMENT_TUNING = {
    fire: { dmg: 1.15, startup: 0.9, range: 0.9, knockback: 1.0, speed: 1.0 },
    water: { dmg: 1.0, startup: 1.0, range: 1.15, knockback: 1.0, speed: 1.0 },
    earth: { dmg: 1.2, startup: 1.15, range: 1.0, knockback: 1.3, speed: 0.85 },
    air: { dmg: 0.85, startup: 0.8, range: 1.05, knockback: 1.15, speed: 1.2 }
  };

  const ELEMENTS = {
    fire: {
      label: "Fire", color: "#E5484D", accent: "#FFB199", fx: "#E5484D",
      main: {
        left: { arch: "mainMelee", name: "Fire Whip" },
        up: { arch: "mainLauncher", name: "Fire Jet Kick" },
        right: { arch: "mainProjectile", name: "Fireball" }
      },
      specialAir: { arch: "specialAir", name: "Phoenix Dive" },
      specialGround: { arch: "specialGround", name: "Flare Slide" },
      combos: {
        "up-left": { arch: "comboBurst", name: "Lightning Arc" },
        "left-up": { arch: "blockWall", name: "Flame Shield" },
        "up-right": { arch: "comboHeavy", name: "Burning Blast" },
        "right-up": { arch: "blockAbsorb", name: "Heat Dispersion" },
        "left-right": { arch: "comboSustained", name: "Flame Stream" },
        "right-left": { arch: "blockParry", name: "Blaze Parry" }
      }
    },
    water: {
      label: "Water", color: "#2851E3", accent: "#9FD8F0", fx: "#2851E3",
      main: {
        left: { arch: "mainProjectile", name: "Ice Dagger" },
        up: { arch: "mainLauncher", name: "Water Spout" },
        right: { arch: "mainMelee", name: "Water Whip" }
      },
      specialAir: { arch: "specialAir", name: "Ice Spike Drop" },
      specialGround: { arch: "specialGround", name: "Torrent Slide" },
      combos: {
        "up-left": { arch: "comboBurst", name: "Ice Lance" },
        "left-up": { arch: "blockWall", name: "Ice Wall" },
        "up-right": { arch: "comboHeavy", name: "Tidal Wave" },
        "right-up": { arch: "blockAbsorb", name: "Water Veil" },
        "left-right": { arch: "comboSustained", name: "Surge Strike" },
        "right-left": { arch: "blockParry", name: "Redirection" }
      }
    },
    earth: {
      // fx deliberately differs from color/accent — earth's own body is
      // already brown, so a same-brown slash trail all but disappears
      // against the fighter's own limbs. A warmer, lighter amber reads
      // as a distinct effect instead of camouflage.
      label: "Earth", color: "#8A6D3B", accent: "#C7B07A", fx: "#D9A536",
      main: {
        left: { arch: "mainProjectile", name: "Earth Blast" },
        up: { arch: "mainLauncher", name: "Earth Pillar" },
        right: { arch: "mainMelee", name: "Rock Armor Slash" }
      },
      specialAir: { arch: "specialAir", name: "Meteor Drop" },
      specialGround: { arch: "specialGround", name: "Sand Slide" },
      combos: {
        "up-left": { arch: "comboBurst", name: "Rock Torrent" },
        "left-up": { arch: "blockWall", name: "Stone Wall" },
        "up-right": { arch: "comboHeavy", name: "Tremor Stomp" },
        "right-up": { arch: "blockAbsorb", name: "Fortress Guard" },
        "left-right": { arch: "comboSustained", name: "Boulder Launch" },
        "right-left": { arch: "blockParry", name: "Earth Deflect" }
      }
    },
    air: {
      // fx (not color/accent) is used for slash trails and the melee
      // charge glow — air's actual color/accent are both too close to
      // the sky background to read as an effect, so fx substitutes a
      // darker teal there (the projectile visual in drawProjectile()
      // works around the same problem with a white halo instead).
      label: "Air", color: "#8FCFE0", accent: "#FFFFFF", fx: "#2E7A94",
      main: {
        left: { arch: "mainProjectile", name: "Air Slice" },
        up: { arch: "mainLauncher", name: "Air Palm" },
        right: { arch: "mainMelee", name: "Air Punch" }
      },
      specialAir: { arch: "specialAir", name: "Vacuum Slam" },
      specialGround: { arch: "specialGround", name: "Wind Glide" },
      combos: {
        "up-left": { arch: "comboBurst", name: "Tornado Blast" },
        "left-up": { arch: "blockWall", name: "Air Shield" },
        "up-right": { arch: "comboHeavy", name: "Gust Burst" },
        "right-up": { arch: "blockAbsorb", name: "Cushion Parry" },
        "left-right": { arch: "comboSustained", name: "Vacuum Slice" },
        "right-left": { arch: "blockParry", name: "Air Repulsion" }
      }
    }
  };
  const ELEMENT_ORDER = ["fire", "water", "earth", "air"];

  function buildMove(elementKey, def){
    const base = ARCHETYPES[def.arch];
    const t = ELEMENT_TUNING[elementKey];
    const m = Object.assign({}, base);
    m.name = def.name;
    m.arch = def.arch;
    if (m.dmg != null) m.dmg = Math.round(m.dmg * t.dmg);
    if (m.dmgPerTick != null) m.dmgPerTick = Math.max(1, Math.round(m.dmgPerTick * t.dmg));
    if (m.range != null) m.range = Math.round(m.range * t.range);
    if (m.startup != null) m.startup = Math.max(2, Math.round(m.startup * t.startup));
    if (m.knockback != null) m.knockback = +(m.knockback * t.knockback).toFixed(1);
    if (m.speed != null) m.speed = +(m.speed * t.speed).toFixed(1);
    return m;
  }

  // Fully-resolved per-element move tables, built once at load —
  // MOVES.fire.main.left, MOVES.water.combos["up-left"], etc.
  const MOVES = {};
  ELEMENT_ORDER.forEach((key) => {
    const e = ELEMENTS[key];
    const combos = {};
    Object.keys(e.combos).forEach((comboKey) => { combos[comboKey] = buildMove(key, e.combos[comboKey]); });
    MOVES[key] = {
      main: {
        left: buildMove(key, e.main.left),
        up: buildMove(key, e.main.up),
        right: buildMove(key, e.main.right)
      },
      specialAir: buildMove(key, e.specialAir),
      specialGround: buildMove(key, e.specialGround),
      combos
    };
  });

  /* ==================== state ==================== */
  let canvas, ctx, overlay, overlayInner;
  let mode = "menu"; // "menu" | "cpu" | "mp-host" | "mp-guest"
  let started = false, animId = null;

  // The two fighters in play. In "cpu" mode, p1 is the local human and
  // p2 is AI-controlled. In "mp-host"/"mp-guest", p1 is always the host
  // and p2 always the guest, regardless of which physical device is
  // watching — same "host/guest are fixed roles, not host/guest are
  // fixed sides of the screen" approach as Floppy Swords.
  let p1 = null, p2 = null;
  let projectiles = [];
  let matchPhase = "idle"; // "wheel" | "fighting" | "round-over" | "match-over"
  let currentRoundNum = 1;
  let roundTimeLeft = ROUND_TIME_S;
  let roundTimerHandle = null;
  let bannerText = "";

  let amIHost = false;
  let roomCode = null;
  let stateSendTimer = null, inputSendTimer = null;
  let localInput = { moveLeft: false, moveRight: false, actionSeq: 0, actionKey: null };
  let latestGuestInput = { moveLeft: false, moveRight: false, actionSeq: 0, actionKey: null };
  let guestLastAppliedActionSeq = 0;

  // Guest-side mirrors of host-broadcast state — guest never simulates,
  // just renders these (with light position lerp, same as Floppy
  // Swords' guestDrawableFighters()).
  let guestRenderPrev = null, guestRenderNext = null, guestRenderNextAt = 0, guestRenderIntervalEstimate = STATE_SEND_INTERVAL_MS;
  let guestMatchOverShown = false;
  let guestLastWheelRound = 0;

  let aiTimer = 0;

  // Purely-cosmetic animation clock (idle/walk sway, projectile flicker) —
  // ticks once per draw() call on every client (host, cpu, AND guest,
  // since guest's loop() also calls draw() every frame), so it never
  // needs to be networked or kept in sync between clients.
  let animFrame = 0;

  // Small local-only "something just got hit" sparks — never networked;
  // the host/cpu side spawns them straight out of resolveHitOnDefender(),
  // and the guest side infers them from an HP drop between two state
  // broadcasts (see guestDrawablePair()) since it never runs that
  // function itself.
  let impactEffects = [];
  const IMPACT_LIFE_FRAMES = 16;
  let guestLastP1Hp = null, guestLastP2Hp = null;

  /* ==================== fighter ==================== */
  function createFighter(element, x){
    return {
      element, x, y: GROUND_Y, vx: 0, vy: 0, facing: x < CANVAS_W / 2 ? 1 : -1,
      hp: ROUND_HP, airborne: false,
      state: "idle", currentMove: null, moveFrame: 0, moveHasHit: false,
      hitstunFrames: 0, dashVX: 0,
      moveLeft: false, moveRight: false,
      pendingArrow: null, pendingArrowTimer: null,
      buffNextDmg: 0,
      roundsWon: 0
    };
  }

  function resetFightersForRound(p1Element, p2Element){
    p1 = createFighter(p1Element, P1_START_X);
    p2 = createFighter(p2Element, P2_START_X);
    p1.roundsWon = matchRoundsWon.p1;
    p2.roundsWon = matchRoundsWon.p2;
    projectiles = [];
    roundTimeLeft = ROUND_TIME_S;
  }
  let matchRoundsWon = { p1: 0, p2: 0 };

  /* ==================== input: combo/mirror detection ==================== */
  function clearPending(f){
    if (f.pendingArrowTimer){ clearTimeout(f.pendingArrowTimer); f.pendingArrowTimer = null; }
    f.pendingArrow = null;
  }

  function canAct(f){
    return f.state === "idle" || f.state === "walk" || f.state === "jump";
  }

  function handleArrowPress(f, key){
    if (!canAct(f)) return;
    if (f.pendingArrow && key !== f.pendingArrow){
      clearTimeout(f.pendingArrowTimer);
      const comboKey = f.pendingArrow + "-" + key;
      f.pendingArrow = null;
      const moveDef = MOVES[f.element].combos[comboKey];
      executeMove(f, moveDef);
      return;
    }
    clearPending(f);
    f.pendingArrow = key;
    f.pendingArrowTimer = setTimeout(() => {
      if (f.pendingArrow === key){
        executeMove(f, MOVES[f.element].main[key]);
        f.pendingArrow = null;
        f.pendingArrowTimer = null;
      }
    }, COMBO_WINDOW_MS);
  }

  function handleDownPress(f){
    if (!canAct(f)) return;
    clearPending(f);
    const moveDef = f.airborne ? MOVES[f.element].specialAir : MOVES[f.element].specialGround;
    if (moveDef.requiresAirborne && !f.airborne) return;
    if (moveDef.requiresGrounded && f.airborne) return;
    executeMove(f, moveDef);
  }

  function attemptJump(f){
    if (!canAct(f) || f.airborne) return;
    clearPending(f);
    f.vy = JUMP_VELOCITY;
    f.airborne = true;
    f.state = "jump";
  }

  function executeMove(f, moveDef){
    if (!moveDef) return;
    f.state = moveDef.kind === "block" ? "block" : "attack";
    f.currentMove = moveDef;
    f.moveFrame = 0;
    f.moveHasHit = false;
    if (moveDef.dashToward || moveDef.dash) f.dashVX = f.facing * 7;
  }

  /* ==================== combat resolution ==================== */
  function inRange(f, opponent, range){
    return Math.abs(f.x - opponent.x) <= range && (f.facing === (opponent.x >= f.x ? 1 : -1));
  }

  function resolveHitOnDefender(defender, attacker, moveDef){
    let dmg = moveDef.dmg != null ? moveDef.dmg : (moveDef.dmgPerTick || 0);
    let knockback = moveDef.knockback || 0;
    let blocked = false;

    if (attacker && attacker.buffNextDmg){
      dmg = Math.round(dmg * (1 + attacker.buffNextDmg));
      attacker.buffNextDmg = 0;
    }

    if (defender.state === "block" && defender.currentMove){
      const b = defender.currentMove;
      const coversThis = moveDef.kind !== "projectile" || b.blocksProjectiles;
      if (coversThis){
        blocked = true;
        dmg = Math.round(dmg * (1 - b.dmgReduction));
        knockback *= 0.25;
        if (b.buffNextDmg) defender.buffNextDmg = b.buffNextDmg;
        if (b.isParry && attacker){
          attacker.state = "hitstun";
          attacker.hitstunFrames = HITSTUN_FRAMES;
          attacker.currentMove = null;
        }
      }
    }

    defender.hp = Math.max(0, defender.hp - dmg);
    const dir = defender.x < (attacker ? attacker.x : defender.x) ? -1 : 1;
    defender.vx += dir * knockback;
    pushImpactEffect(defender.x, defender.y - 30, attacker ? ELEMENTS[attacker.element].accent : "#FFFFFF", blocked);
    if (moveDef.launchUp && !blocked){
      defender.vy = -11;
      defender.airborne = true;
    }
    if (!blocked && defender.state !== "hitstun"){
      defender.state = "hitstun";
      defender.hitstunFrames = HITSTUN_FRAMES;
      defender.currentMove = null;
    }
    return { blocked, dmg };
  }

  function spawnProjectile(owner, moveDef){
    projectiles.push({
      owner, x: owner.x + owner.facing * 26, y: owner.y - 42,
      vx: owner.facing * moveDef.speed, life: moveDef.life || 100,
      dmg: moveDef.dmg, knockback: moveDef.knockback || 4, launchUp: !!moveDef.launchUp,
      element: owner.element, kind: "projectile", blocksProjectiles: true
    });
  }

  function updateProjectiles(fighters){
    for (const p of projectiles){
      p.x += p.vx;
      p.life--;
      for (const f of fighters){
        if (f === p.owner || p.dead) continue;
        if (Math.abs(p.x - f.x) < 26 && Math.abs(p.y - (f.y - 42)) < 46){
          resolveHitOnDefender(f, p.owner, p);
          p.dead = true;
        }
      }
    }
    projectiles = projectiles.filter((p) => !p.dead && p.life > 0 && p.x > -40 && p.x < CANVAS_W + 40);
  }

  /* ==================== per-frame fighter update ==================== */
  function updateFighterPhysics(f, opponent){
    if (f.dashVX){
      f.x += f.dashVX;
      f.dashVX *= 0.82;
      if (Math.abs(f.dashVX) < 0.3) f.dashVX = 0;
    }
    if (f.state === "idle" || f.state === "walk" || f.state === "jump"){
      if (f.moveLeft && !f.moveRight) f.vx = -MOVE_SPEED;
      else if (f.moveRight && !f.moveLeft) f.vx = MOVE_SPEED;
      else f.vx *= 0.7;
    } else {
      f.vx *= 0.85;
    }
    f.x += f.vx;
    f.x = Math.max(FIGHTER_HALF_W, Math.min(CANVAS_W - FIGHTER_HALF_W, f.x));

    f.vy += GRAVITY;
    f.y += f.vy;
    if (f.y >= GROUND_Y){ f.y = GROUND_Y; f.vy = 0; f.airborne = false; }
    else f.airborne = true;

    if (f.state === "jump" && !f.airborne) f.state = "idle";
    if (f.state === "idle" || f.state === "walk"){
      f.state = (f.moveLeft || f.moveRight) ? "walk" : "idle";
      f.facing = f.x <= opponent.x ? 1 : -1;
    }
  }

  function updateFighterMove(f, opponent){
    if (f.state === "hitstun"){
      f.hitstunFrames--;
      if (f.hitstunFrames <= 0) f.state = "idle";
      return;
    }
    if (f.state !== "attack" && f.state !== "block") return;
    f.moveFrame++;
    const m = f.currentMove;
    const activeLen = m.active != null ? m.active : (m.duration || 0);
    const activeEnd = m.startup + activeLen;
    const recoveryEnd = activeEnd + (m.recovery || 0);

    if (m.kind === "projectile" && f.moveFrame === m.startup + 1){
      spawnProjectile(f, m);
    }
    if (m.kind === "melee" && !m.ticks && f.moveFrame > m.startup && f.moveFrame <= activeEnd && !f.moveHasHit){
      if (inRange(f, opponent, m.range)){
        resolveHitOnDefender(opponent, f, m);
        f.moveHasHit = true;
      }
    }
    if (m.kind === "melee" && m.ticks && f.moveFrame > m.startup && f.moveFrame <= activeEnd){
      const sinceStart = f.moveFrame - m.startup;
      if (sinceStart % m.tickInterval === 0 && inRange(f, opponent, m.range)){
        resolveHitOnDefender(opponent, f, m);
      }
    }
    if (f.moveFrame > recoveryEnd){
      f.state = "idle";
      f.currentMove = null;
    }
  }

  /* ==================== AI ==================== */
  const RANGED_SLOT_BY_ELEMENT = { fire: "right", water: "left", earth: "left", air: "left" };
  const MELEE_SLOT_BY_ELEMENT = { fire: "left", water: "right", earth: "right", air: "right" };

  function aiChooseComboAttackKey(element){
    const attackKeys = Object.keys(MOVES[element].combos).filter((k) => MOVES[element].combos[k].kind !== "block");
    return attackKeys[Math.floor(Math.random() * attackKeys.length)];
  }
  function aiChooseBlockKey(element){
    const blockKeys = Object.keys(MOVES[element].combos).filter((k) => MOVES[element].combos[k].kind === "block");
    return blockKeys[Math.floor(Math.random() * blockKeys.length)];
  }
  function triggerComboByKey(f, comboKey){
    executeMove(f, MOVES[f.element].combos[comboKey]);
  }

  function updateAI(ai, player){
    aiTimer--;
    if (aiTimer > 0) return;
    aiTimer = 8 + Math.floor(Math.random() * 10);

    const dist = Math.abs(ai.x - player.x);
    ai.facing = ai.x <= player.x ? 1 : -1;

    if (player.state === "attack" && dist < 150 && canAct(ai) && Math.random() < 0.35){
      triggerComboByKey(ai, aiChooseBlockKey(ai.element));
      return;
    }
    if (!canAct(ai)){
      ai.moveLeft = false; ai.moveRight = false;
      return;
    }

    if (dist > 230){
      ai.moveLeft = ai.x > player.x; ai.moveRight = ai.x < player.x;
      if (Math.random() < 0.2) handleArrowPress(ai, RANGED_SLOT_BY_ELEMENT[ai.element]);
    } else if (dist > 110){
      ai.moveLeft = ai.x > player.x; ai.moveRight = ai.x < player.x;
      if (Math.random() < 0.25) handleArrowPress(ai, RANGED_SLOT_BY_ELEMENT[ai.element]);
    } else {
      ai.moveLeft = false; ai.moveRight = false;
      const r = Math.random();
      if (r < 0.35) handleArrowPress(ai, MELEE_SLOT_BY_ELEMENT[ai.element]);
      else if (r < 0.5) handleArrowPress(ai, "up");
      else if (r < 0.68) triggerComboByKey(ai, aiChooseComboAttackKey(ai.element));
      else if (r < 0.78 && !ai.airborne) attemptJump(ai);
    }
  }

  /* ==================== round/match flow ==================== */
  function randomElement(){
    return ELEMENT_ORDER[Math.floor(Math.random() * ELEMENT_ORDER.length)];
  }

  function startRoundTimer(){
    if (roundTimerHandle) clearInterval(roundTimerHandle);
    roundTimerHandle = setInterval(() => {
      if (matchPhase !== "fighting") return;
      roundTimeLeft--;
      if (roundTimeLeft <= 0){
        const winner = p1.hp >= p2.hp ? "p1" : "p2";
        endRound(winner);
      }
    }, 1000);
  }
  function stopRoundTimer(){
    if (roundTimerHandle){ clearInterval(roundTimerHandle); roundTimerHandle = null; }
  }

  function checkForKO(){
    if (matchPhase !== "fighting") return;
    if (p1.hp <= 0) endRound("p2");
    else if (p2.hp <= 0) endRound("p1");
  }

  function endRound(winnerKey){
    matchPhase = "round-over";
    stopRoundTimer();
    matchRoundsWon[winnerKey]++;
    bannerText = (winnerKey === "p1" ? "Player 1" : (mode === "cpu" ? "CPU" : "Player 2")) +
      " wins Round " + currentRoundNum + "! (" + matchRoundsWon.p1 + "-" + matchRoundsWon.p2 + ")";

    if (matchRoundsWon.p1 >= ROUNDS_TO_WIN || matchRoundsWon.p2 >= ROUNDS_TO_WIN){
      matchPhase = "match-over";
      if (mode === "cpu" || mode === "mp-host"){
        showMatchOverOverlay(matchRoundsWon.p1 > matchRoundsWon.p2 ? "p1" : "p2");
      }
      return;
    }
    setTimeout(() => {
      currentRoundNum++;
      beginWheelPhase();
    }, 2600);
  }

  function beginWheelPhase(){
    matchPhase = "wheel";
    if (mode === "cpu"){
      spinWheelThenStart((chosenElement) => {
        resetFightersForRound(chosenElement, randomElement());
        beginFighting();
      });
    } else if (mode === "mp-host"){
      spinWheelThenStart((chosenElement) => {
        hostChosenElementThisRound = chosenElement;
        broadcastRoundStartWhenBothReady();
      });
    }
    // mp-guest doesn't drive this at all — it just reacts to the host's
    // broadcast phase/element fields, see joinMatch()'s state listener.
  }

  let hostChosenElementThisRound = null;
  let guestChosenElementThisRound = null;
  function broadcastRoundStartWhenBothReady(){
    // Guest spins independently on its own client (triggered by seeing
    // phase "wheel" in the broadcast state, see joinMatch()'s state
    // listener) and reports its choice via the "guestChoice" DB field,
    // keyed by round number. The round starts only once both this
    // client's own spin and the guest's reported choice for the SAME
    // round are in hand.
    if (hostChosenElementThisRound && guestChosenElementThisRound){
      resetFightersForRound(hostChosenElementThisRound, guestChosenElementThisRound);
      hostChosenElementThisRound = null; guestChosenElementThisRound = null;
      beginFighting();
    }
  }

  function beginFighting(){
    matchPhase = "fighting";
    startRoundTimer();
  }

  /* ==================== rendering: pose system ====================
     A limbed humanoid figure (head/torso/arms/legs as pivoted rectangles
     and a circle, same cheap-but-effective approach as Arachnid Guy's
     drawHumanoidFigure() in webrunner.js) instead of a flat body block.
     Which pose it strikes is driven entirely by state + the current
     move's archetype (m.arch) — one small keyframe table per archetype,
     shared by all four elements, exactly the same "structural role, not
     individual move" reuse the MOVES table itself is built from. A move
     plays three phases against its own startup/active/recovery numbers:
     ease from neutral into the archetype's "windup" pose during startup,
     hold its "strike" pose through the active hit window (a fast snap
     into the hit rather than a smooth glide reads more like an actual
     strike), then ease back to neutral through recovery. */
  const NEUTRAL_POSE = { armAngleL: 0.15, armAngleR: -0.15, legAngleL: 0, legAngleR: 0, torsoLean: 0, crouch: 0 };
  const HITSTUN_POSE = { armAngleL: 0.7, armAngleR: -0.5, legAngleL: 0.25, legAngleR: -0.15, torsoLean: -0.3, crouch: 0 };

  const ATTACK_KEYFRAMES = {
    // Forehand strike: arm draws back then whips forward, torso follows through.
    mainMelee: {
      windup: { armAngleL: -0.2, armAngleR: 1.5, legAngleL: 0.15, legAngleR: -0.15, torsoLean: -0.2, crouch: 0.05 },
      strike: { armAngleL: 0.3, armAngleR: -1.4, legAngleL: -0.15, legAngleR: 0.25, torsoLean: 0.3, crouch: 0 }
    },
    // Rising uppercut that launches the opponent skyward.
    mainLauncher: {
      windup: { armAngleL: 0.3, armAngleR: 0.9, legAngleL: -0.15, legAngleR: 0.3, torsoLean: 0.15, crouch: 0.3 },
      strike: { armAngleL: -0.2, armAngleR: -2.1, legAngleL: 0.15, legAngleR: -0.35, torsoLean: -0.25, crouch: 0 }
    },
    // A throwing/casting release — arm draws back to the shoulder, then extends.
    mainProjectile: {
      windup: { armAngleL: 0.2, armAngleR: 1.3, legAngleL: 0.05, legAngleR: -0.05, torsoLean: -0.1, crouch: 0 },
      strike: { armAngleL: 0.1, armAngleR: -0.5, legAngleL: 0, legAngleR: 0, torsoLean: 0.1, crouch: 0 }
    },
    // Airborne diving strike — tucks in on the windup, extends toward the target.
    specialAir: {
      windup: { armAngleL: 0.6, armAngleR: 0.6, legAngleL: 0.35, legAngleR: 0.35, torsoLean: -0.3, crouch: 0 },
      strike: { armAngleL: -0.9, armAngleR: -0.9, legAngleL: -0.5, legAngleR: -0.5, torsoLean: 0.55, crouch: 0 }
    },
    // Low sliding strike along the ground.
    specialGround: {
      windup: { armAngleL: -0.2, armAngleR: -0.2, legAngleL: 0.2, legAngleR: -0.4, torsoLean: -0.1, crouch: 0.55 },
      strike: { armAngleL: -0.4, armAngleR: -0.4, legAngleL: -0.3, legAngleR: -1.1, torsoLean: -0.15, crouch: 0.7 }
    },
    // Rapid-fire burst release — quicker, tighter windup than a single projectile.
    comboBurst: {
      windup: { armAngleL: 0.8, armAngleR: 0.8, legAngleL: 0.1, legAngleR: -0.1, torsoLean: -0.2, crouch: 0.1 },
      strike: { armAngleL: -0.1, armAngleR: -0.1, legAngleL: 0, legAngleR: 0, torsoLean: 0.15, crouch: 0 }
    },
    // A big two-handed overhead/wide swing — the hardest-hitting combo.
    comboHeavy: {
      windup: { armAngleL: 1.7, armAngleR: 1.7, legAngleL: 0.2, legAngleR: -0.2, torsoLean: -0.4, crouch: 0.1 },
      strike: { armAngleL: -1.5, armAngleR: -1.5, legAngleL: -0.25, legAngleR: 0.35, torsoLean: 0.45, crouch: 0 }
    },
    // A sustained channel — arm held out steady, small tremor layered on top.
    comboSustained: {
      windup: { armAngleL: 0.2, armAngleR: 1.1, legAngleL: 0.05, legAngleR: -0.05, torsoLean: -0.05, crouch: 0 },
      strike: { armAngleL: 0.15, armAngleR: -0.9, legAngleL: 0, legAngleR: 0, torsoLean: 0.05, crouch: 0 }
    }
  };

  // Block poses are a single held guard stance (no windup/recovery lerp
  // needed — a block's entire duration is already one steady stance).
  const BLOCK_KEYFRAMES = {
    blockWall: { armAngleL: -1.9, armAngleR: 1.9, legAngleL: 0.15, legAngleR: -0.15, torsoLean: -0.05, crouch: 0.15 },
    blockAbsorb: { armAngleL: -1.6, armAngleR: 1.6, legAngleL: 0.1, legAngleR: -0.1, torsoLean: -0.05, crouch: 0.1 },
    blockParry: { armAngleL: -2.3, armAngleR: 0.5, legAngleL: 0.1, legAngleR: -0.15, torsoLean: -0.2, crouch: 0.05 }
  };

  function lerpNum(a, b, t){ return a + (b - a) * t; }
  function lerpPose(a, b, t){
    return {
      armAngleL: lerpNum(a.armAngleL, b.armAngleL, t), armAngleR: lerpNum(a.armAngleR, b.armAngleR, t),
      legAngleL: lerpNum(a.legAngleL, b.legAngleL, t), legAngleR: lerpNum(a.legAngleR, b.legAngleR, t),
      torsoLean: lerpNum(a.torsoLean, b.torsoLean, t), crouch: lerpNum(a.crouch, b.crouch, t)
    };
  }
  function smoothstep(t){ t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  function walkPose(phase){
    return {
      armAngleL: Math.sin(phase + Math.PI) * 0.4, armAngleR: Math.sin(phase) * 0.4,
      legAngleL: Math.sin(phase) * 0.55, legAngleR: Math.sin(phase + Math.PI) * 0.55,
      torsoLean: 0, crouch: 0
    };
  }
  function idlePose(phase){
    const sway = Math.sin(phase * 0.5) * 0.05;
    return { armAngleL: 0.15 + sway, armAngleR: -0.15 - sway, legAngleL: 0, legAngleR: 0, torsoLean: 0, crouch: 0 };
  }
  const JUMP_POSE = { armAngleL: -0.5, armAngleR: 0.35, legAngleL: -0.35, legAngleR: 0.4, torsoLean: -0.15, crouch: 0 };

  // f only needs to look like { state, x, airborne?, moveFrame, arch? or
  // currentMove.arch } — true for a real fighter object (host/cpu) AND
  // for the guest's lerped drawable pseudo-fighter (see guestDrawablePair()),
  // so this one function computes poses for both without caring which.
  function computePose(f){
    const arch = f.currentMove ? f.currentMove.arch : f.arch;
    const moveFrame = f.moveFrame || 0;
    if (f.state === "hitstun") return HITSTUN_POSE;
    if (f.state === "block" && arch && BLOCK_KEYFRAMES[arch]) return BLOCK_KEYFRAMES[arch];
    if (f.state === "attack" && arch && ATTACK_KEYFRAMES[arch]){
      const kf = ATTACK_KEYFRAMES[arch];
      const m = ARCHETYPES[arch];
      const startup = m.startup || 4;
      const activeLen = m.active != null ? m.active : (m.duration || 6);
      const activeEnd = startup + activeLen;
      const recoveryEnd = activeEnd + (m.recovery || 8);
      if (moveFrame <= startup){
        return lerpPose(NEUTRAL_POSE, kf.windup, smoothstep(moveFrame / Math.max(1, startup)));
      } else if (moveFrame <= activeEnd){
        if (arch === "comboSustained"){
          const tremor = Math.sin(moveFrame * 1.7) * 0.08;
          return Object.assign({}, kf.strike, { armAngleR: kf.strike.armAngleR + tremor });
        }
        return kf.strike;
      }
      return lerpPose(kf.strike, NEUTRAL_POSE, smoothstep((moveFrame - activeEnd) / Math.max(1, recoveryEnd - activeEnd)));
    }
    const airborne = f.airborne !== undefined ? f.airborne : f.y < GROUND_Y - 1;
    if (airborne) return JUMP_POSE;
    if (f.state === "walk") return walkPose(animFrame * 0.35 + f.x * 0.02);
    return idlePose(animFrame + f.x);
  }

  /* ==================== rendering: fighter/effects ==================== */
  function limb(pivotX, pivotY, len, angle, thick, color){
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.fillRect(-thick / 2, 0, thick, len);
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.outline;
    ctx.strokeRect(-thick / 2, 0, thick, len);
    ctx.restore();
  }

  function drawFighter(f, opts){
    if (!f) return;
    const el = ELEMENTS[f.element];
    const pose = computePose(f);
    const limbColor = f.state === "hitstun" ? "#F0A0A0" : el.color;
    const legLen = 22, armLen = 19, torsoH = 22, torsoW = 15, headR = 10, limbThick = 6.5;
    const crouchPx = pose.crouch * 9, leanPx = pose.torsoLean * 9;

    const hipY = f.y - legLen;
    const torsoBottom = hipY - crouchPx;
    const torsoTop = torsoBottom - torsoH;
    const shoulderY = torsoTop + torsoH * 0.18;
    const headCY = torsoTop - headR - 1;

    ctx.save();
    ctx.translate(f.x, 0);
    ctx.scale(f.facing, 1);

    // Back-side limbs, then torso, then front-side limbs on top of it,
    // then the head — cheap layering that reads correctly without any
    // real depth sorting (same trick webrunner.js's humanoid figure uses).
    limb(-4, hipY, legLen, pose.legAngleL, limbThick, limbColor);
    limb(-4 + leanPx * 0.4, shoulderY, armLen, pose.armAngleL, limbThick * 0.85, limbColor);

    ctx.fillStyle = limbColor;
    ctx.fillRect(-torsoW / 2 + leanPx * 0.3, torsoTop, torsoW, torsoBottom - torsoTop);
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.outline;
    ctx.strokeRect(-torsoW / 2 + leanPx * 0.3, torsoTop, torsoW, torsoBottom - torsoTop);

    limb(4, hipY, legLen, pose.legAngleR, limbThick, limbColor);
    limb(4 + leanPx * 0.4, shoulderY, armLen, pose.armAngleR, limbThick * 0.85, limbColor);

    // Melee/launcher/combo strikes get a curved slash trail swept in
    // front of the striking arm during the active hit window; projectile
    // and burst releases instead get a small charge glow at the throwing
    // hand that builds through the windup and fires with the release.
    drawAttackEffect(f, pose, el, shoulderY, leanPx);
    drawBlockEffect(f, el, shoulderY);

    ctx.beginPath();
    ctx.arc(leanPx * 0.5, headCY, headR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.skin;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = COLORS.outline;
    ctx.stroke();

    if (f.state === "hitstun"){
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", 0, headCY - headR - 8);
    }

    ctx.restore();

    if (opts && opts.mine){
      ctx.beginPath();
      ctx.moveTo(f.x - 6, headCY - headR - 14);
      ctx.lineTo(f.x + 6, headCY - headR - 14);
      ctx.lineTo(f.x, headCY - headR - 7);
      ctx.closePath();
      ctx.fillStyle = "#F6C945";
      ctx.fill();
    }
  }

  // Every block archetype gets its own held visual, not just the guard
  // pose — a raised-arms stance alone doesn't read as "a wall/shield/
  // parry actually appeared" the way the move names (Stone Wall, Flame
  // Shield, Blaze Parry, ...) promise. Drawn INSIDE the fighter's
  // translate/scale block, same as drawAttackEffect below, so "forward"
  // is always local +x regardless of which way the fighter faces.
  function drawBlockEffect(f, el, shoulderY){
    const arch = f.currentMove ? f.currentMove.arch : f.arch;
    if (f.state !== "block" || !arch) return;
    if (arch === "blockWall"){
      // A solid barrier planted in front of the fighter.
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = el.fx;
      ctx.fillRect(11, shoulderY - 21, 7, 42);
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(11, shoulderY - 21, 7, 42);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(13.5, shoulderY - 18); ctx.lineTo(13.5, shoulderY + 18);
      ctx.stroke();
      ctx.restore();
    } else if (arch === "blockAbsorb"){
      // A soft absorbing aura drawn around the whole body.
      ctx.save();
      ctx.globalAlpha = 0.5;
      const grad = ctx.createRadialGradient(0, shoulderY, 4, 0, shoulderY, 28);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.75, el.fx);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, shoulderY, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (arch === "blockParry"){
      // A quick sharp flash at the guarding hand — reads as "ready to
      // punish", matching how briefly a parry window is actually open.
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++){
        const a = i * (Math.PI / 2) + 0.5;
        ctx.beginPath();
        ctx.moveTo(15 + Math.cos(a) * 5, shoulderY + Math.sin(a) * 5);
        ctx.lineTo(15 + Math.cos(a) * 15, shoulderY + Math.sin(a) * 15);
        ctx.stroke();
      }
      ctx.strokeStyle = el.fx;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(15, shoulderY, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Drawn INSIDE the fighter's translate/scale block, so "forward" is
  // always local +x regardless of which way the fighter actually faces.
  function drawAttackEffect(f, pose, el, shoulderY, leanPx){
    const arch = f.currentMove ? f.currentMove.arch : f.arch;
    if (f.state !== "attack" || !arch) return;
    const m = ARCHETYPES[arch];
    if (!m) return;
    const moveFrame = f.moveFrame || 0;
    const startup = m.startup || 4;
    const activeLen = m.active != null ? m.active : (m.duration || 6);
    const activeEnd = startup + activeLen;

    if (m.kind === "melee"){
      if (moveFrame <= startup || moveFrame > activeEnd) return;
      const activeT = (moveFrame - startup) / Math.max(1, activeLen);
      const cx = 14 + leanPx * 0.4, cy = shoulderY;
      const sweepStart = -1.3 + activeT * 1.7, span = 1.1;
      const rOuter = 26, rInner = 14;
      ctx.save();
      // A filled crescent wedge (blade-swipe shape) reads as a real slash
      // far more clearly than a thin arc stroke — outer/inner arcs joined
      // into one closed path, swept forward across the active window.
      ctx.globalAlpha = 0.85 * (1 - activeT * 0.25);
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, sweepStart, sweepStart + span);
      ctx.arc(cx, cy, rInner, sweepStart + span, sweepStart, true);
      ctx.closePath();
      ctx.fillStyle = el.fx;
      ctx.fill();
      ctx.globalAlpha = 0.9 * (1 - activeT * 0.5);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, sweepStart + span - 0.18, sweepStart + span);
      ctx.stroke();
      ctx.restore();
    } else if (m.kind === "projectile"){
      if (moveFrame > startup + 1) return;
      const chargeT = Math.min(1, moveFrame / Math.max(1, startup));
      ctx.save();
      ctx.globalAlpha = 0.75 * chargeT;
      const grad = ctx.createRadialGradient(16, shoulderY, 0, 16, shoulderY, 8 * chargeT + 2);
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.5, el.accent);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, shoulderY, 8 * chargeT + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function pushImpactEffect(x, y, color, blocked){
    impactEffects.push({ x, y, color, blocked: !!blocked, life: IMPACT_LIFE_FRAMES });
  }
  function updateImpactEffects(){
    impactEffects.forEach((e) => { e.life--; });
    impactEffects = impactEffects.filter((e) => e.life > 0);
  }
  function drawImpactEffects(){
    impactEffects.forEach((e) => {
      const t = 1 - e.life / IMPACT_LIFE_FRAMES;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.blocked ? 2 : 3;
      const spikes = e.blocked ? 5 : 7;
      const r1 = 3 + t * (e.blocked ? 9 : 15);
      const r0 = r1 * 0.4;
      ctx.beginPath();
      for (let i = 0; i < spikes; i++){
        const a = (i / spikes) * Math.PI * 2;
        const ox = Math.cos(a) * r0, oy = Math.sin(a) * r0;
        const ex = Math.cos(a) * r1, ey = Math.sin(a) * r1;
        ctx.moveTo(e.x + ox, e.y + oy);
        ctx.lineTo(e.x + ex, e.y + ey);
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawProjectile(p){
    const el = ELEMENTS[p.element];
    const t = animFrame * 0.3 + p.x * 0.05;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.element === "fire"){
      const flicker = 1 + Math.sin(t * 2) * 0.15;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 11 * flicker);
      grad.addColorStop(0, "#FFF3B0");
      grad.addColorStop(0.55, el.color);
      grad.addColorStop(1, "rgba(229,72,77,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 * flicker, 11 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 2; i++){
        const a = t * 3 + i * 2.1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 10, Math.sin(a) * 6, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD27A";
        ctx.fill();
      }
    } else if (p.element === "water"){
      ctx.rotate(t * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(6, -2); ctx.lineTo(3, 10); ctx.lineTo(-3, 10); ctx.lineTo(-6, -2);
      ctx.closePath();
      ctx.fillStyle = el.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(6, -2); ctx.lineTo(0, 2); ctx.closePath();
      ctx.globalAlpha = 0.5; ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = el.color; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(6, -2); ctx.lineTo(3, 10); ctx.lineTo(-3, 10); ctx.lineTo(-6, -2); ctx.closePath();
      ctx.stroke();
    } else if (p.element === "earth"){
      ctx.rotate(Math.sin(p.x * 0.1) * 0.3);
      ctx.beginPath();
      const pts = [[0, -10], [7, -4], [9, 4], [3, 11], [-5, 9], [-9, 1], [-6, -6]];
      pts.forEach(([px, py], i) => { if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      ctx.closePath();
      ctx.fillStyle = el.color;
      ctx.fill();
      ctx.strokeStyle = "#5C4826"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "rgba(199,176,122,0.4)";
      ctx.beginPath(); ctx.arc(-9, 4, 4, 0, Math.PI * 2); ctx.fill();
    } else { // air — el.color is too close to the sky blue to read on its
      // own, so a soft white halo plus el.fx's darker outer ring carry
      // the shape (same fx field the melee slash trail uses for air).
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = el.fx;
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, 9, -1.3 + t, 1.3 + t); ctx.stroke();
      ctx.beginPath(); ctx.arc(2, 0, 6, 1.6 + t * 1.4, 4.2 + t * 1.4); ctx.stroke();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 9, -1.3 + t, 1.3 + t); ctx.stroke();
      ctx.beginPath(); ctx.arc(2, 0, 6, 1.6 + t * 1.4, 4.2 + t * 1.4); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHpBar(x, hp, alignRight, label){
    const w = 220, h = 16;
    const bx = alignRight ? x - w : x;
    ctx.fillStyle = COLORS.hpBack;
    ctx.fillRect(bx, 12, w, h);
    const frac = Math.max(0, hp) / ROUND_HP;
    const fillColor = frac > 0.5 ? COLORS.hpFull : frac > 0.25 ? COLORS.hpMid : COLORS.hpLow;
    ctx.fillStyle = fillColor;
    if (alignRight) ctx.fillRect(bx + w * (1 - frac), 12, w * frac, h);
    else ctx.fillRect(bx, 12, w * frac, h);
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, 12, w, h);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(label, alignRight ? bx + w : bx, 40);
  }

  function drawRoundPips(){
    ctx.textAlign = "center";
    for (let i = 0; i < ROUNDS_TO_WIN; i++){
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2 - 30 + i * 16, 20, 5, 0, Math.PI * 2);
      ctx.fillStyle = i < matchRoundsWon.p1 ? COLORS.roundPipOn : COLORS.roundPipOff;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2 + 30 - i * 16, 20, 5, 0, Math.PI * 2);
      ctx.fillStyle = i < matchRoundsWon.p2 ? COLORS.roundPipOn : COLORS.roundPipOff;
      ctx.fill();
    }
    if (matchPhase === "fighting"){
      ctx.fillStyle = COLORS.hudText;
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(String(Math.max(0, roundTimeLeft)), CANVAS_W / 2, 46);
    }
  }

  function drawBanner(){
    if (matchPhase !== "round-over" || !bannerText) return;
    ctx.fillStyle = COLORS.bannerBg;
    ctx.fillRect(0, CANVAS_H / 2 - 30, CANVAS_W, 60);
    ctx.fillStyle = COLORS.bannerText;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(bannerText, CANVAS_W / 2, CANVAS_H / 2 + 6);
  }

  function draw(){
    animFrame++;
    updateImpactEffects();

    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = COLORS.groundTrim;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 4);

    if (mode === "mp-guest"){
      const d = guestDrawablePair();
      if (d){
        drawFighter(d.p1, { mine: false });
        drawFighter(d.p2, { mine: true });
        d.projectiles.forEach(drawProjectile);
        drawHpBar(20, d.p1.hp, false, ELEMENTS[d.p1.element].label);
        drawHpBar(CANVAS_W - 20, d.p2.hp, true, ELEMENTS[d.p2.element].label);
      }
    } else if (p1 && p2){
      // This branch only ever runs in "cpu" (p1 is the local human) or
      // "mp-host" (this client IS the host, who always controls p1) —
      // mp-guest is handled entirely in the branch above. So p1 is
      // always ours here, and p2 never is (AI in cpu mode, the remote
      // guest in mp-host mode).
      drawFighter(p1, { mine: true });
      drawFighter(p2, { mine: false });
      projectiles.forEach(drawProjectile);
      drawHpBar(20, p1.hp, false, ELEMENTS[p1.element].label);
      drawHpBar(CANVAS_W - 20, p2.hp, true, ELEMENTS[p2.element].label);
    }
    drawImpactEffects();
    drawRoundPips();
    drawBanner();
  }

  /* ==================== main loop ==================== */
  function loop(){
    if (mode === "cpu" && matchPhase === "fighting" && p1 && p2){
      updateFighterPhysics(p1, p2);
      updateFighterPhysics(p2, p1);
      updateFighterMove(p1, p2);
      updateAI(p2, p1);
      updateFighterMove(p2, p1);
      updateProjectiles([p1, p2]);
      checkForKO();
    } else if (mode === "mp-host" && matchPhase === "fighting" && p1 && p2){
      p2.moveLeft = latestGuestInput.moveLeft;
      p2.moveRight = latestGuestInput.moveRight;
      applyGuestActionIfNew();
      updateFighterPhysics(p1, p2);
      updateFighterPhysics(p2, p1);
      updateFighterMove(p1, p2);
      updateFighterMove(p2, p1);
      updateProjectiles([p1, p2]);
      checkForKO();
    }
    draw();
    animId = requestAnimationFrame(loop);
  }

  function applyGuestActionIfNew(){
    if (latestGuestInput.actionSeq > guestLastAppliedActionSeq){
      guestLastAppliedActionSeq = latestGuestInput.actionSeq;
      const key = latestGuestInput.actionKey;
      if (key === "jump") attemptJump(p2);
      else if (key === "down") handleDownPress(p2);
      else if (key === "left" || key === "up" || key === "right") handleArrowPress(p2, key);
    }
  }

  /* ==================== network (de)serialization ==================== */
  function serializeFighter(f){
    return {
      el: f.element, x: Math.round(f.x), y: Math.round(f.y), hp: f.hp,
      st: f.state, facing: f.facing,
      // Passed straight through (never interpolated, see lerpF below) so
      // the guest can run the exact same pose/animation code as the host
      // instead of guessing a generic "attacking" pose from state alone.
      mf: f.moveFrame, arch: f.currentMove ? f.currentMove.arch : null
    };
  }
  function serializeProjectiles(){
    return projectiles.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y), el: p.element }));
  }

  function guestDrawablePair(){
    if (!guestRenderNext) return null;
    const next = guestRenderNext, prev = guestRenderPrev;
    const t = prev ? Math.max(0, Math.min(1, (performance.now() - guestRenderNextAt) / guestRenderIntervalEstimate)) : 1;
    function lerpF(a, b){
      const src = a || b;
      return {
        element: b.el, hp: b.hp, state: b.st, facing: b.facing,
        moveFrame: b.mf, arch: b.arch,
        x: src ? src.x + (b.x - src.x) * t : b.x,
        y: src ? src.y + (b.y - src.y) * t : b.y
      };
    }
    const drawableP1 = lerpF(prev && prev.p1, next.p1);
    const drawableP2 = lerpF(prev && prev.p2, next.p2);
    // The guest never runs resolveHitOnDefender() itself, so it infers a
    // "something just landed" spark purely from an HP drop between two
    // consecutive broadcasts — same cosmetic-only impactEffects list the
    // host/cpu side feeds directly from combat resolution.
    if (guestLastP1Hp != null && next.p1.hp < guestLastP1Hp){
      pushImpactEffect(drawableP1.x, drawableP1.y - 30, ELEMENTS[drawableP2.element].accent, false);
    }
    if (guestLastP2Hp != null && next.p2.hp < guestLastP2Hp){
      pushImpactEffect(drawableP2.x, drawableP2.y - 30, ELEMENTS[drawableP1.element].accent, false);
    }
    guestLastP1Hp = next.p1.hp; guestLastP2Hp = next.p2.hp;
    return {
      p1: drawableP1,
      p2: drawableP2,
      projectiles: (next.pr || []).map((p) => ({ x: p.x, y: p.y, element: p.el }))
    };
  }

  /* ==================== pointer/keyboard input ==================== */
  function localFighterForInput(){
    if (mode === "cpu" || mode === "mp-host") return p1;
    return null; // mp-guest relays raw input instead of acting on a local fighter
  }

  function sendGuestAction(key){
    localInput.actionSeq++;
    localInput.actionKey = key;
  }

  function onKeyDown(e){
    if (document.activeElement !== canvas) return;
    if (!started) return;
    if (e.repeat && e.code !== "KeyA" && e.code !== "KeyD") return;
    const f = localFighterForInput();
    switch (e.code){
      case "KeyA":
        if (f) f.moveLeft = true; else localInput.moveLeft = true;
        e.preventDefault();
        break;
      case "KeyD":
        if (f) f.moveRight = true; else localInput.moveRight = true;
        e.preventDefault();
        break;
      case "KeyW":
        e.preventDefault();
        if (f) attemptJump(f); else sendGuestAction("jump");
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (f) handleArrowPress(f, "left"); else sendGuestAction("left");
        break;
      case "ArrowUp":
        e.preventDefault();
        if (f) handleArrowPress(f, "up"); else sendGuestAction("up");
        break;
      case "ArrowRight":
        e.preventDefault();
        if (f) handleArrowPress(f, "right"); else sendGuestAction("right");
        break;
      case "ArrowDown":
        e.preventDefault();
        if (f) handleDownPress(f); else sendGuestAction("down");
        break;
    }
  }
  function onKeyUp(e){
    if (document.activeElement !== canvas) return;
    const f = localFighterForInput();
    if (e.code === "KeyA"){ if (f) f.moveLeft = false; else localInput.moveLeft = false; }
    if (e.code === "KeyD"){ if (f) f.moveRight = false; else localInput.moveRight = false; }
  }

  /* ==================== wheel spin ==================== */
  function spinWheelThenStart(onDone){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Spinning for your element…</h3>
      <div class="atla-wheel" id="atla-wheel"><div class="atla-wheel-pointer"></div></div>
      <p id="atla-wheel-result" style="min-height:1.4em;font-weight:700;font-size:1.1rem;"></p>
    `;
    const wheel = document.getElementById("atla-wheel");
    const resultEl = document.getElementById("atla-wheel-result");
    const chosen = randomElement();
    const idx = ELEMENT_ORDER.indexOf(chosen);
    const sliceDeg = 360 / ELEMENT_ORDER.length;
    const targetDeg = 360 * 5 + (360 - (idx * sliceDeg + sliceDeg / 2));
    requestAnimationFrame(() => {
      wheel.style.transform = "rotate(" + targetDeg + "deg)";
    });
    setTimeout(() => {
      resultEl.textContent = ELEMENTS[chosen].label + " bender!";
      resultEl.style.color = ELEMENTS[chosen].color;
      setTimeout(() => {
        overlay.style.display = "none";
        onDone(chosen);
      }, 700);
    }, 2300);
  }

  /* ==================== Firebase (lazy-loaded, shared config with Floppy Swords) ==================== */
  const FIREBASE_SDK_VERSION = "10.14.1";
  let fb = null;

  function isFirebaseConfigured(){
    return typeof FLOPPY_FIREBASE_CONFIG === "object" && FLOPPY_FIREBASE_CONFIG &&
      typeof FLOPPY_FIREBASE_CONFIG.apiKey === "string" &&
      !FLOPPY_FIREBASE_CONFIG.apiKey.includes("PASTE_YOUR_FIREBASE") &&
      FLOPPY_FIREBASE_CONFIG.apiKey.length > 0;
  }

  async function ensureFirebase(){
    if (fb) return fb;
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [{ initializeApp }, dbMod, authMod] = await Promise.all([
      import(/* webpackIgnore: true */ `${base}/firebase-app.js`),
      import(/* webpackIgnore: true */ `${base}/firebase-database.js`),
      import(/* webpackIgnore: true */ `${base}/firebase-auth.js`)
    ]);
    const app = initializeApp(FLOPPY_FIREBASE_CONFIG);
    const db = dbMod.getDatabase(app);
    const auth = authMod.getAuth(app);
    const uid = await new Promise((resolve, reject) => {
      const unsub = authMod.onAuthStateChanged(auth, (user) => {
        if (user){ unsub(); resolve(user.uid); }
      }, reject);
      authMod.signInAnonymously(auth).catch(reject);
    });
    fb = { db, uid, ref: dbMod.ref, set: dbMod.set, update: dbMod.update,
      onValue: dbMod.onValue, onDisconnect: dbMod.onDisconnect,
      get: dbMod.get, child: dbMod.child, remove: dbMod.remove };
    return fb;
  }

  function randomRoomCode(){
    let code = "";
    for (let i = 0; i < ROOM_CODE_LEN; i++) code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    return code;
  }

  let stateListenerUnsub = null, guestInputListenerUnsub = null, roomListenerUnsub = null, guestElementListenerUnsub = null;

  function stopNetworkTimers(){
    if (stateSendTimer){ clearInterval(stateSendTimer); stateSendTimer = null; }
    if (inputSendTimer){ clearInterval(inputSendTimer); inputSendTimer = null; }
    if (stateListenerUnsub){ stateListenerUnsub(); stateListenerUnsub = null; }
    if (guestInputListenerUnsub){ guestInputListenerUnsub(); guestInputListenerUnsub = null; }
    if (roomListenerUnsub){ roomListenerUnsub(); roomListenerUnsub = null; }
    if (guestElementListenerUnsub){ guestElementListenerUnsub(); guestElementListenerUnsub = null; }
  }

  async function leaveMatch(){
    stopNetworkTimers();
    stopRoundTimer();
    matchPhase = "idle";
    if (fb && roomCode){
      const roomRef = fb.ref(fb.db, `atla-rooms/${roomCode}`);
      try {
        if (amIHost){
          await fb.remove(roomRef);
        } else {
          await fb.update(roomRef, { status: "waiting" });
          await fb.update(roomRef, { guestUid: null });
        }
      } catch (err){ if (DEBUG) console.warn("[Bending Brawl] leaveMatch cleanup failed:", err); }
    }
    roomCode = null;
    p1 = null; p2 = null;
    guestRenderPrev = null; guestRenderNext = null;
    guestMatchOverShown = false;
    guestLastWheelRound = 0;
    guestLastP1Hp = null; guestLastP2Hp = null;
    matchRoundsWon = { p1: 0, p2: 0 };
    currentRoundNum = 1;
    started = false;
    if (animId){ cancelAnimationFrame(animId); animId = null; }
  }

  async function hostMatch(){
    overlayInner.innerHTML = `<h3>Bending Brawl</h3><p>Connecting…</p>`;
    try {
      await ensureFirebase();
    } catch (err){
      showConnectError(err);
      return;
    }
    amIHost = true;
    roomCode = randomRoomCode();
    const roomRef = fb.ref(fb.db, `atla-rooms/${roomCode}`);
    await fb.set(roomRef, { hostUid: fb.uid, guestUid: null, status: "waiting", createdAt: Date.now() });
    fb.onDisconnect(roomRef).remove();

    showHostWaitingOverlay(roomCode);

    roomListenerUnsub = fb.onValue(roomRef, (snap) => {
      const data = snap.val();
      if (!data){
        if (mode === "mp-host" && started) showOpponentLeftOverlay();
        return;
      }
      if (data.guestUid && mode !== "mp-host"){
        beginHostedMatch();
      } else if (!data.guestUid && started){
        showOpponentLeftOverlay();
      }
    });
  }

  function beginHostedMatch(){
    mode = "mp-host";
    started = true;
    matchRoundsWon = { p1: 0, p2: 0 };
    currentRoundNum = 1;
    overlay.style.display = "none";

    const roomRef = fb.ref(fb.db, `atla-rooms/${roomCode}`);
    guestInputListenerUnsub = fb.onValue(fb.ref(fb.db, `atla-rooms/${roomCode}/inputs/guest`), (snap) => {
      const data = snap.val();
      if (data) latestGuestInput = data;
    });
    // Keyed by round number (not just presence) so a guest re-spin that
    // happens to land on the SAME element as a previous round still
    // registers as a fresh choice rather than looking like a no-op write.
    guestElementListenerUnsub = fb.onValue(fb.ref(fb.db, `atla-rooms/${roomCode}/guestChoice`), (snap) => {
      const choice = snap.val();
      if (choice && choice.round === currentRoundNum) guestChosenElementThisRound = choice.element;
      broadcastRoundStartWhenBothReady();
    });

    stateSendTimer = setInterval(() => {
      if (!p1 || !p2) return;
      fb.update(roomRef, {
        state: {
          t: Date.now(), phase: matchPhase, round: currentRoundNum,
          p1: serializeFighter(p1), p2: serializeFighter(p2),
          pr: serializeProjectiles(),
          p1RoundsWon: matchRoundsWon.p1, p2RoundsWon: matchRoundsWon.p2,
          bannerText, roundTimeLeft
        }
      }).catch((err) => { if (DEBUG) console.warn("[Bending Brawl] state push failed:", err); });
    }, STATE_SEND_INTERVAL_MS);

    beginWheelPhase();
    if (!animId) loop();
  }

  async function joinMatch(code){
    overlayInner.innerHTML = `<h3>Bending Brawl</h3><p>Connecting…</p>`;
    let f;
    try {
      f = await ensureFirebase();
    } catch (err){
      showConnectError(err);
      return;
    }
    roomCode = code.trim().toUpperCase();
    const roomRef = f.ref(f.db, `atla-rooms/${roomCode}`);
    const snap = await f.get(roomRef);
    const data = snap.val();
    if (!data || data.status !== "waiting" || data.guestUid){
      showJoinErrorOverlay("That code isn't open right now — check it and try again.");
      return;
    }
    amIHost = false;
    await f.update(roomRef, { guestUid: f.uid });

    mode = "mp-guest";
    started = true;
    guestMatchOverShown = false;
    overlay.style.display = "none";
    f.onDisconnect(f.ref(f.db, `atla-rooms/${roomCode}/guestUid`)).remove();

    // Round 1 is spun right here, unconditionally, rather than waiting to
    // see a "wheel" broadcast — the host doesn't start broadcasting state
    // at all until its fighters exist, which itself waits on THIS choice
    // (see broadcastRoundStartWhenBothReady()), so waiting for a broadcast
    // here would deadlock. Every later round (2+) doesn't have that
    // problem, since state broadcasts are already flowing by then, so
    // those are driven by the round-number-guarded check in the state
    // listener below instead.
    guestLastWheelRound = 1;
    spinWheelThenStart((chosenElement) => {
      f.update(roomRef, { guestChoice: { element: chosenElement, round: 1 } }).catch(() => {});
    });

    stateListenerUnsub = f.onValue(f.ref(f.db, `atla-rooms/${roomCode}/state`), (snap2) => {
      const stateData = snap2.val();
      if (!stateData) return;
      guestRenderPrev = guestRenderNext;
      guestRenderNext = stateData;
      const now = performance.now();
      if (guestRenderNextAt) guestRenderIntervalEstimate = Math.max(30, Math.min(300, now - guestRenderNextAt));
      guestRenderNextAt = now;
      matchPhase = stateData.phase || "fighting";
      matchRoundsWon = { p1: stateData.p1RoundsWon || 0, p2: stateData.p2RoundsWon || 0 };
      bannerText = stateData.bannerText || "";

      // Guest spins its own wheel locally and reports the result — the
      // host waits for both hostChosenElementThisRound (its own spin) and
      // this before starting the round (see broadcastRoundStartWhenBothReady()).
      // The host broadcasts phase "wheel" at 20Hz for the whole ~3s spin, so
      // guard on the round number to spin exactly once per round rather than
      // re-triggering on every state push.
      if (matchPhase === "wheel" && stateData.round !== guestLastWheelRound){
        const roundForThisSpin = stateData.round;
        guestLastWheelRound = roundForThisSpin;
        spinWheelThenStart((chosenElement) => {
          f.update(roomRef, { guestChoice: { element: chosenElement, round: roundForThisSpin } }).catch(() => {});
        });
      }
      roundTimeLeft = stateData.roundTimeLeft != null ? stateData.roundTimeLeft : ROUND_TIME_S;
      if (matchPhase === "match-over" && !guestMatchOverShown){
        guestMatchOverShown = true;
        showMatchOverOverlay(stateData.p1RoundsWon > stateData.p2RoundsWon ? "p1" : "p2");
      }
    });
    roomListenerUnsub = f.onValue(roomRef, (snap2) => {
      const roomData = snap2.val();
      if (!roomData && started) showOpponentLeftOverlay();
    });

    inputSendTimer = setInterval(() => {
      f.update(f.ref(f.db, `atla-rooms/${roomCode}`), {
        [`inputs/guest`]: { moveLeft: localInput.moveLeft, moveRight: localInput.moveRight,
          actionSeq: localInput.actionSeq, actionKey: localInput.actionKey, t: Date.now() }
      }).catch((err) => { if (DEBUG) console.warn("[Bending Brawl] input push failed:", err); });
    }, INPUT_SEND_INTERVAL_MS);

    if (!animId) loop();
  }

  /* ==================== overlays ==================== */
  function showModeSelectOverlay(){
    mode = "menu";
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Bending Brawl</h3>
      <p>Spin the wheel for a random element each round — Fire, Water,
      Earth, or Air — then fight with that element's own strikes,
      specials, and combos. Best of three rounds wins the match.</p>
      <button type="button" class="btn" id="atla-mode-cpu-btn">CPU Match</button>
      <button type="button" class="btn" id="atla-mode-multiplayer-btn">Multiplayer</button>
    `;
    document.getElementById("atla-mode-cpu-btn").addEventListener("click", startCpuMatch);
    document.getElementById("atla-mode-multiplayer-btn").addEventListener("click", showMultiplayerMenuOverlay);
  }

  function startCpuMatch(){
    mode = "cpu";
    started = true;
    matchRoundsWon = { p1: 0, p2: 0 };
    currentRoundNum = 1;
    overlay.style.display = "none";
    beginWheelPhase();
    if (!animId) loop();
  }

  function showMultiplayerMenuOverlay(){
    overlay.style.display = "flex";
    if (!isFirebaseConfigured()){
      overlayInner.innerHTML = `
        <h3>Multiplayer isn't set up yet</h3>
        <p>This site's owner needs to finish the Firebase Realtime
        Database setup described in the README (same setup Floppy
        Swords uses) before matches can connect. CPU Match still works
        fully offline.</p>
        <button type="button" class="btn light" id="atla-back-to-menu-2">&larr; Back</button>
      `;
      document.getElementById("atla-back-to-menu-2").addEventListener("click", showModeSelectOverlay);
      return;
    }
    overlayInner.innerHTML = `
      <h3>Multiplayer</h3>
      <p>Host a match and share the code, or join one someone else
      started.</p>
      <button type="button" class="btn" id="atla-host-btn">Host Match</button>
      <button type="button" class="btn" id="atla-join-btn">Join Match</button>
      <p class="form-note" style="margin-top:10px;"><a href="#" id="atla-back-to-menu-3">&larr; Back</a></p>
    `;
    document.getElementById("atla-host-btn").addEventListener("click", hostMatch);
    document.getElementById("atla-join-btn").addEventListener("click", showJoinCodeEntryOverlay);
    document.getElementById("atla-back-to-menu-3").addEventListener("click", (e) => { e.preventDefault(); showModeSelectOverlay(); });
  }

  function showHostWaitingOverlay(code){
    overlayInner.innerHTML = `
      <h3>Waiting for an opponent…</h3>
      <p>Share this code with them — they'll enter it under "Join Match" on their own device:</p>
      <p style="font-size:2rem;font-weight:700;letter-spacing:0.3em;margin:14px 0;">${escapeForDisplay(code)}</p>
      <button type="button" class="btn light" id="atla-cancel-host-btn">Cancel</button>
    `;
    document.getElementById("atla-cancel-host-btn").addEventListener("click", async () => {
      await leaveMatch();
      showModeSelectOverlay();
    });
  }

  function showJoinCodeEntryOverlay(){
    overlayInner.innerHTML = `
      <h3>Join a match</h3>
      <div class="form-row">
        <input type="text" id="atla-code-input" placeholder="CODE" maxlength="${ROOM_CODE_LEN}"
          autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false"
          inputmode="text" style="text-transform:uppercase;letter-spacing:0.2em;text-align:center;font-size:1.3rem;">
      </div>
      <button type="button" class="btn" id="atla-join-submit-btn">Join</button>
    `;
    const input = document.getElementById("atla-code-input");
    input.addEventListener("input", () => { input.value = input.value.toUpperCase(); });
    document.getElementById("atla-join-submit-btn").addEventListener("click", () => {
      const code = input.value.trim();
      if (code.length !== ROOM_CODE_LEN){
        showJoinErrorOverlay("Enter the full " + ROOM_CODE_LEN + "-character code first.");
        return;
      }
      joinMatch(code);
    });
  }

  function showJoinErrorOverlay(message){
    overlayInner.innerHTML = `
      <h3>Couldn't join</h3>
      <p>${escapeForDisplay(message)}</p>
      <button type="button" class="btn" id="atla-retry-join-btn">Try Again</button>
      <button type="button" class="btn light" id="atla-back-to-menu-4">&larr; Back</button>
    `;
    document.getElementById("atla-retry-join-btn").addEventListener("click", showJoinCodeEntryOverlay);
    document.getElementById("atla-back-to-menu-4").addEventListener("click", showModeSelectOverlay);
  }

  function showConnectError(err){
    if (DEBUG) console.error("[Bending Brawl] Firebase connect failed:", err);
    overlayInner.innerHTML = `
      <h3>Couldn't connect</h3>
      <p>Multiplayer needs a network connection to the realtime database — check your connection and try again.</p>
      <button type="button" class="btn light" id="atla-back-to-menu-5">&larr; Back</button>
    `;
    document.getElementById("atla-back-to-menu-5").addEventListener("click", showModeSelectOverlay);
  }

  async function showOpponentLeftOverlay(){
    await leaveMatch();
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Opponent left</h3>
      <p>The other player disconnected.</p>
      <button type="button" class="btn" id="atla-back-to-menu-6">Back to Menu</button>
    `;
    document.getElementById("atla-back-to-menu-6").addEventListener("click", showModeSelectOverlay);
  }

  function showMatchOverOverlay(winnerKey){
    overlay.style.display = "flex";
    const amIP1 = mode !== "mp-guest";
    const myKey = amIP1 ? "p1" : "p2";
    let resultLine;
    if (mode === "cpu"){
      resultLine = winnerKey === "p1" ? "You won the match!" : "The CPU won the match.";
    } else {
      resultLine = winnerKey === myKey ? "You won the match!" : "You lost the match.";
    }
    overlayInner.innerHTML = `
      <h3>Match Complete</h3>
      <p>${resultLine} (${matchRoundsWon.p1}-${matchRoundsWon.p2})</p>
      <button type="button" class="btn" id="atla-match-over-menu-btn">Back to Menu</button>
    `;
    document.getElementById("atla-match-over-menu-btn").addEventListener("click", async () => {
      await leaveMatch();
      showModeSelectOverlay();
    });
  }

  function escapeForDisplay(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  /* ==================== bootstrap ==================== */
  function initGame(){
    if (DEBUG) console.log("[Bending Brawl] atla.js loaded");
    canvas = document.getElementById("atla-canvas");
    overlay = document.getElementById("atla-overlay");
    overlayInner = document.getElementById("atla-overlay-inner");
    if (!canvas || !overlay) return;

    ctx = canvas.getContext("2d");
    draw();
    showModeSelectOverlay();

    canvas.addEventListener("click", () => canvas.focus());

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    const menuBtn = document.getElementById("atla-menu-btn");
    if (menuBtn) menuBtn.addEventListener("click", async () => {
      started = false;
      await leaveMatch();
      showModeSelectOverlay();
    });

    window.addEventListener("beforeunload", () => { leaveMatch(); });
  }

  document.addEventListener("DOMContentLoaded", initGame);

})();
