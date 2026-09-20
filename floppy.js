/* =====================================================================
   FLOPPY SWORDS
   A 2D ragdoll sword-fighting game. Drag your fighter around by the
   head with the mouse/touch; the rest of the body (and the weapon in
   its hand) trails behind on real ragdoll physics (Verlet integration +
   distance constraints), so how a weapon swings depends on its own
   weight and reach, not just yours. Practice mode is a single-fighter
   sandbox; Multiplayer connects two browsers (any two devices,
   including phones) into the same match over Firebase Realtime
   Database so the two ragdolls can actually fight.

   Shares this page with the other games, so this file only reacts to
   pointer input when its own canvas is the target (pointer events are
   already scoped to the canvas element itself, so no extra guard is
   needed the way the keyboard-driven games need one).

   PHYSICS: every joint (head, torso, hip, elbows, hands, knees, feet)
   and the weapon's tip are "particles" with a current and previous
   position — the difference between the two IS the velocity, so
   there's no separate velocity field to keep in sync (classic Verlet).
   "Sticks" are fixed-length constraints between two particles (bones,
   plus the hand-to-weapon-tip link); satisfying all of them a handful
   of times per frame is what keeps the ragdoll's proportions from
   collapsing while still letting every joint swing freely — there are
   deliberately no angular joint limits, so elbows/knees can bend any
   which way, which is exactly the floppy, slightly-chaotic look the
   name promises. A particle's invMass controls how much it gives way
   when a stick pulls on it (0 = immovable); the weapon's tip particle
   gets a lower invMass the heavier the weapon is, so a war hammer drags
   noticeably behind the hand while a sword keeps up almost instantly —
   see WEAPONS below and satisfyStick(). When two fighters share a
   match, every particle of one is also collision-checked against every
   particle of the other each frame (resolveInterFighterCollisions()) so
   they can't pass through each other.

   SCORING: landing your weapon's tip on an opponent scores points —
   5 for a limb, 10 for the torso, 15 for the head (checkMatchScoring(),
   host-only, same authority as the physics). A per-fighter cooldown
   stops one continued overlap from scoring every frame. The floating
   "+X" popup only ever appears on the screen of whoever actually
   scored — never the other player's, even though both fighters' scores
   live in the same host-broadcast state. A shield in the off hand
   blocks instead — it scores nothing, but a weapon tip that touches it
   is deflected before the body-part checks even run, and both players
   see a shared "Blocked!" popup (not private, unlike points — everyone
   just watched it happen). See the "scoring" section below and the
   guestScoreEvent/lastBlockEvent comments near the other module state.

   ROUNDS: the host picks a point ceiling and a round count (1-5) at
   match setup (showHostSetupOverlay()). Reaching the ceiling ends the
   round and tallies a win for whoever got there (endRound()); after the
   last round, whoever won more rounds wins the match (a tie is possible
   with an even round count). Between rounds both fighters reset to
   their starting pose/position and the in-round score resets to 0, but
   the round-win tally carries the whole match. Whoever won the
   *previous* round wears a small crown next to their head for the
   round that follows — nobody does in round 1 (lastRoundWinner starts
   null). This is all just more host-broadcast state, same pattern as
   scoring — the guest never decides any of it, only displays it.

   MULTIPLAYER: host-authoritative, not lockstep or peer-simulated —
   floating point ragdoll physics is exactly the kind of chaotic system
   where two independent simulations fed "the same" inputs quietly
   diverge, so only ONE side ever runs stepPhysics() for a match: the
   player who created the room (the "host"). The joining player (the
   "guest") never simulates locally; their client just sends its own
   drag position to the host over Realtime Database and renders whatever
   position snapshot the host broadcasts back, interpolated between the
   last two snapshots so a ~20Hz update rate still looks smooth — see
   ensureFirebase()/hostMatch()/joinMatch() and the "networking" section
   below. See the README's "How Floppy Swords works" section for the
   Firebase console setup this depends on (FLOPPY_FIREBASE_CONFIG in
   config.js).

   TUNING: every number worth playing with lives in CONFIG below.
   ===================================================================== */

(function(){

  const DEBUG = false;

  /* ==================== CONFIG ==================== */
  // Canvas dimensions aren't const — the "Mobile" button swaps them
  // between these two presets (see applyOrientation()) by changing the
  // actual <canvas> element's width/height attributes, not just CSS, so
  // the internal simulation coordinate space itself gets narrower/taller,
  // not just the on-screen scaling of a fixed-resolution buffer. Every
  // other width/height-derived value below (GROUND_Y, and the
  // soloStartX()/hostStartX()/guestStartX() functions further down) has
  // to read CANVAS_W/CANVAS_H fresh each time rather than precomputing
  // once, or it'd stay stale after a switch.
  const ORIENTATION_PRESETS = {
    landscape: { w: 640, h: 420 },
    portrait: { w: 420, h: 680 }
  };
  let orientation = "landscape";
  let CANVAS_W = ORIENTATION_PRESETS.landscape.w;
  let CANVAS_H = ORIENTATION_PRESETS.landscape.h;
  let GROUND_Y = CANVAS_H - 40; // same 40px street margin in both orientations

  const GRAVITY = 0.6;
  const DAMPING = 0.98; // per-frame velocity carry-over (air resistance) — lower loses energy faster, settles down quicker instead of wobbling
  const CONSTRAINT_ITERATIONS = 12; // higher = stiffer/more accurate bones, more expensive
  const GROUND_BOUNCE = 0.12; // fraction of impact speed returned on landing
  const GROUND_FRICTION = 0.95; // per-iteration horizontal speed retained while grounded — lower grips the ground harder, slides less
  const WALL_BOUNCE = 0.3;

  const HEAD_R = 14;
  const JOINT_R = 6; // hands/feet/elbows/knees, for collision only

  // Body proportions (px) — same for every weapon, only the weapon
  // itself (reach + weight) changes between them.
  const NECK_LEN = 26, SPINE_LEN = 60;
  const UPPER_ARM_LEN = 34, LOWER_ARM_LEN = 34;
  const UPPER_LEG_LEN = 44, LOWER_LEG_LEN = 44;
  const STANCE_HALF_WIDTH = 12; // each leg's horizontal offset from center — also the footL-footR brace's rest half-width, see createFighter()

  // Hitting a weapon's tip against an opponent's body scores points —
  // small parts (arms/legs) are easiest to clip and worth least, the
  // head is hardest to land and worth most. See checkMatchScoring().
  const HIT_SCORE_LIMB = 5;
  const HIT_SCORE_TORSO = 10;
  const HIT_SCORE_HEAD = 15;
  const HIT_COOLDOWN_FRAMES = 24; // ~0.4s at 60fps — stops one continued overlap from scoring every frame
  const FLOAT_TEXT_LIFE_FRAMES = 50; // ~0.8s at 60fps

  // A shield in the off hand blocks — it scores nothing itself, but a
  // weapon tip that touches it is deflected instead of landing on
  // whatever's behind it. See findHitScore()/drawShield().
  const SHIELD_REACH = 30;
  const SHIELD_R = 16;
  const SHIELD_INVMASS = 0.7;

  // Host-selected at match setup — see showHostSetupOverlay().
  const POINT_CEILING_OPTIONS = [25, 50, 75, 100, 150, 200];
  const POINT_CEILING_DEFAULT = 50;
  const ROUND_COUNT_MIN = 1, ROUND_COUNT_MAX = 5, ROUND_COUNT_DEFAULT = 1;
  const ROUND_TRANSITION_MS = 3500; // how long the round-over banner shows before the next round starts

  // Multiplayer starting spots — apart and facing each other, close
  // enough that dragging toward the middle brings weapons into range
  // quickly rather than requiring a long walk that doesn't exist here
  // (there's no locomotion, only dragging). Functions, not precomputed
  // constants, since CANVAS_W changes when the orientation does — these
  // always read its current value.
  function soloStartX(){ return CANVAS_W / 2; }
  function hostStartX(){ return CANVAS_W * 0.3; }
  function guestStartX(){ return CANVAS_W * 0.7; }

  const COLORS = {
    sky: "#5EC1F0",
    ground: "#D8CDBA",
    groundTrim: "#B9AC8E",
    head: "#E8A466",
    dragRing: "#FFFFFF",
    mineMarker: "#F6C945",
    scoreText: "#1F2430",
    floatingText: "#F6C945",
    floatingTextOutline: "#1A1A22",
    blockText: "#E8ECF0",
    shieldFace: "#B8823D",
    shieldRim: "#5C3A21",
    shieldBoss: "#8B8F99",
    crownGold: "#FFD24C",
    crownOutline: "#8A5A00",
    bannerBg: "rgba(20,24,31,0.6)",
    bannerText: "#FFFFFF"
  };
  // Two distinct suit palettes so two fighters on screen together are
  // easy to tell apart at a glance — practice mode always uses "a".
  const SUIT_PALETTES = [
    { suit: "#2851E3", suitDark: "#1B3AA8" },
    { suit: "#E5484D", suitDark: "#A82F33" }
  ];

  // Lower invMass = heavier = drags further behind the hand and takes
  // more effort to redirect mid-swing. Reach is the hand-to-tip stick
  // length, i.e. how far the weapon's business end sits from the hand.
  const WEAPONS = {
    sword: { label: "Sword", kind: "sword", reach: 62, invMass: 1.0,
      shaftW: 5, handleColor: "#5C3A21", headColor: "#C9CDD6" },
    spear: { label: "Spear", kind: "spear", reach: 118, invMass: 0.8,
      shaftW: 5, handleColor: "#6B4A2B", headColor: "#C9CDD6" },
    axe: { label: "Battle Axe", kind: "axe", reach: 58, invMass: 0.5,
      shaftW: 6, handleColor: "#5C3A21", headColor: "#8B8F99" },
    hammer: { label: "War Hammer", kind: "hammer", reach: 50, invMass: 0.26,
      shaftW: 7, handleColor: "#4A3220", headColor: "#5B5F68" }
  };
  const WEAPON_ORDER = ["sword", "axe", "hammer", "spear"];

  // Fixed particle name order — used to (de)serialize a fighter into a
  // flat number array for the network payload. Order must never change
  // without bumping something, since old/new clients could otherwise
  // disagree mid-transition; not a concern here since host and guest
  // always load the exact same floppy.js from the same page.
  const PARTICLE_NAMES = ["head", "torso", "hip", "elbowL", "handL", "elbowR", "handR",
    "kneeL", "footL", "kneeR", "footR", "weaponTip", "shieldTip"];

  // How often the host pushes a state snapshot / the guest pushes its
  // input, independent of the 60fps render loop — no need to spend
  // database bandwidth faster than this actually improves the feel of
  // a slow, floppy game.
  const STATE_SEND_INTERVAL_MS = 50; // 20Hz
  const INPUT_SEND_INTERVAL_MS = 50; // 20Hz

  const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud/type
  const ROOM_CODE_LEN = 5;

  /* ==================== state ==================== */
  let canvas, ctx, overlay, overlayInner, orientationBtn;
  let mode = "menu"; // "menu" | "practice" | "mp-host" | "mp-guest"
  let started = false, animId = null;

  // Practice mode: one live-simulated fighter.
  let soloFighter = null;

  // Multiplayer, host side: two live-simulated fighters (host runs the
  // whole match). Multiplayer, guest side: no live fighters at all —
  // guestRenderPrev/Next hold the last two snapshots from the host,
  // interpolated in guestDrawableFighters() purely for rendering.
  let hostFighter = null, guestFighter = null;
  let guestRenderPrev = null, guestRenderNext = null, guestRenderNextAt = 0, guestRenderIntervalEstimate = STATE_SEND_INTERVAL_MS;

  let amIHost = false;
  let roomCode = null;
  let stateSendTimer = null, inputSendTimer = null;
  let latestGuestInput = { x: guestStartX(), y: GROUND_Y - 100, dragging: false };
  let pendingLocalInput = null; // guest's own not-yet-sent drag position

  // Scoring — only the host ever computes hits (see checkMatchScoring()),
  // same authority model as the physics itself. hostScore/guestScore are
  // the host's running totals, broadcast to the guest each state tick so
  // both sides' HUD stays accurate. guestScoreEvent is a tiny separate
  // "something just happened" signal (an incrementing id + the amount)
  // that only changes when the GUEST scores — the guest watches its id
  // to know when to pop its own "+X" text, without ever seeing one for
  // points the host scored. Floating texts themselves are a purely
  // local, per-client visual effect and are never sent over the network.
  let hostScore = 0, guestScore = 0;
  let lastGuestScoreEvent = { id: 0, amount: 0 };
  let guestOwnScore = 0, guestLastSeenScoreEventId = 0;
  let floatingTexts = [];

  // Blocks are a shared event, unlike points — whoever swung sees it
  // failed and whoever blocked sees it worked, so both clients react to
  // every block regardless of who was involved, the same "id changed"
  // pattern as guestScoreEvent but without the "only if it's mine" gate.
  let lastBlockEvent = { id: 0, x: 0, y: 0 };
  let guestLastSeenBlockEventId = 0;

  // Match/round structure — host-selected at setup (showHostSetupOverlay),
  // host-authoritative like everything else. currentRound/hostRoundsWon/
  // guestRoundsWon/matchPhase/lastRoundWinner are the host's own live
  // values; guestMatchInfo mirrors all of it from the state broadcast so
  // the guest's HUD/banner/crown can read the same shape either way.
  let matchPointCeiling = POINT_CEILING_DEFAULT, matchRoundCount = ROUND_COUNT_DEFAULT;
  let currentRound = 1, hostRoundsWon = 0, guestRoundsWon = 0;
  let matchPhase = "playing"; // "playing" | "round-over" | "match-over"
  let lastRoundWinner = null; // "host" | "guest" | null — null until a round has been won, so round 1 shows no crown
  let roundTransitionTimer = null;
  let guestMatchInfo = { phase: "playing", currentRound: 1, roundCount: 1,
    hostRoundsWon: 0, guestRoundsWon: 0, pointCeiling: POINT_CEILING_DEFAULT, lastRoundWinner: null };
  let guestMatchOverShown = false;

  /* ==================== particle/stick engine ==================== */
  function makeParticle(x, y, invMass, r){
    return { x, y, px: x, py: y, invMass, r: r || JOINT_R, pinned: false };
  }
  function makeStick(a, b, len){
    return { a, b, len: len != null ? len : Math.hypot(b.x - a.x, b.y - a.y) };
  }

  function satisfyStick(s){
    const a = s.a, b = s.b;
    let dx = b.x - a.x, dy = b.y - a.y;
    let dist = Math.hypot(dx, dy) || 0.0001;
    const invA = a.pinned ? 0 : a.invMass;
    const invB = b.pinned ? 0 : b.invMass;
    const total = invA + invB;
    if (total <= 0) return;
    const diff = (s.len - dist) / dist;
    const shareA = invA / total, shareB = invB / total;
    a.x -= dx * diff * shareA;
    a.y -= dy * diff * shareA;
    b.x += dx * diff * shareB;
    b.y += dy * diff * shareB;
  }

  function clampToBounds(p){
    const floor = GROUND_Y - p.r;
    if (p.y > floor){
      const vyOld = p.y - p.py;
      p.y = floor;
      p.py = p.y + vyOld * GROUND_BOUNCE;
    }
    if (p.y >= floor - 0.5){
      const vxOld = p.x - p.px;
      p.px = p.x - vxOld * GROUND_FRICTION;
    }
    const minX = p.r, maxX = CANVAS_W - p.r;
    if (p.x < minX){
      const vxOld = p.x - p.px;
      p.x = minX;
      p.px = p.x + vxOld * WALL_BOUNCE;
    } else if (p.x > maxX){
      const vxOld = p.x - p.px;
      p.x = maxX;
      p.px = p.x + vxOld * WALL_BOUNCE;
    }
  }

  // Pushes every particle of fighter A apart from every particle of
  // fighter B wherever their collision radii overlap — same
  // mass-weighted math as satisfyStick(), just a one-directional
  // "don't get closer than this" constraint instead of a fixed-length
  // one. O(12*12) particle pairs, trivial cost for two fighters.
  function resolveInterFighterCollisions(a, b){
    for (const pa of a.particles){
      for (const pb of b.particles){
        const dx = pb.x - pa.x, dy = pb.y - pa.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const minDist = pa.r + pb.r;
        if (dist >= minDist) continue;
        const invA = pa.pinned ? 0 : pa.invMass;
        const invB = pb.pinned ? 0 : pb.invMass;
        const total = invA + invB;
        if (total <= 0) continue;
        const overlap = (minDist - dist) / dist;
        const shareA = invA / total, shareB = invB / total;
        pa.x -= dx * overlap * shareA;
        pa.y -= dy * overlap * shareA;
        pb.x += dx * overlap * shareB;
        pb.y += dy * overlap * shareB;
      }
    }
  }

  /* ==================== fighter rig ==================== */
  function createFighter(weaponKey, startX, paletteIndex){
    const weapon = WEAPONS[weaponKey] || WEAPONS.sword;
    const baseX = startX != null ? startX : soloStartX();

    const footY = GROUND_Y;
    const kneeY = footY - LOWER_LEG_LEN;
    const hipY = kneeY - UPPER_LEG_LEN;
    const torsoY = hipY - SPINE_LEN;
    const headY = torsoY - NECK_LEN;

    const head = makeParticle(baseX, headY, 1, HEAD_R);
    const torso = makeParticle(baseX, torsoY, 1);
    const hip = makeParticle(baseX, hipY, 1);

    const elbowL = makeParticle(baseX - 12, torsoY + UPPER_ARM_LEN * 0.95, 1);
    const handL = makeParticle(baseX - 14, torsoY + UPPER_ARM_LEN + LOWER_ARM_LEN * 0.98, 1);
    const elbowR = makeParticle(baseX + 12, torsoY + UPPER_ARM_LEN * 0.95, 1);
    const handR = makeParticle(baseX + 14, torsoY + UPPER_ARM_LEN + LOWER_ARM_LEN * 0.98, 1);

    const kneeL = makeParticle(baseX - STANCE_HALF_WIDTH, kneeY, 1);
    const footL = makeParticle(baseX - STANCE_HALF_WIDTH, footY, 1);
    const kneeR = makeParticle(baseX + STANCE_HALF_WIDTH, kneeY, 1);
    const footR = makeParticle(baseX + STANCE_HALF_WIDTH, footY, 1);

    const weaponTip = makeParticle(handR.x + 6, handR.y + weapon.reach * 0.98, weapon.invMass, 5);
    const shieldTip = makeParticle(handL.x - 6, handL.y + SHIELD_REACH * 0.98, SHIELD_INVMASS, SHIELD_R);

    const particles = [head, torso, hip, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR, weaponTip, shieldTip];
    const sticks = [
      makeStick(head, torso, NECK_LEN),
      makeStick(torso, hip, SPINE_LEN),
      makeStick(torso, elbowL, UPPER_ARM_LEN),
      makeStick(elbowL, handL, LOWER_ARM_LEN),
      makeStick(torso, elbowR, UPPER_ARM_LEN),
      makeStick(elbowR, handR, LOWER_ARM_LEN),
      makeStick(hip, kneeL, UPPER_LEG_LEN),
      makeStick(kneeL, footL, LOWER_LEG_LEN),
      makeStick(hip, kneeR, UPPER_LEG_LEN),
      makeStick(kneeR, footR, LOWER_LEG_LEN),
      makeStick(handR, weaponTip, weapon.reach),
      makeStick(handL, shieldTip, SHIELD_REACH),
      // Brace between the feet, same width as their resting stance —
      // without it the two legs have nothing keeping them apart, and a
      // hip balanced directly above two independent legs is the classic
      // "pencil on its tip" unstable equilibrium: any tiny asymmetry
      // buckles it instantly. This doesn't fix standing outright (there's
      // still no active balance), but it meaningfully resists the legs
      // scissoring/collapsing into each other, so the fighter holds a
      // stance noticeably longer before flopping.
      makeStick(footL, footR, STANCE_HALF_WIDTH * 2)
    ];

    return { particles, sticks, head, torso, hip, elbowL, handL, elbowR, handR,
      kneeL, footL, kneeR, footR, weaponTip, shieldTip, weaponKey,
      palette: SUIT_PALETTES[paletteIndex || 0],
      dragging: false, dragX: 0, dragY: 0, hitCooldown: 0 };
  }

  /* ==================== simulation step ==================== */
  function integrateAndConstrainFighter(f){
    for (const p of f.particles){
      if (p === f.head && f.dragging) continue; // handled below with an exact pin
      const vx = (p.x - p.px) * DAMPING;
      const vy = (p.y - p.py) * DAMPING + GRAVITY;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy;
    }
    if (f.dragging){
      f.head.px = f.head.x; f.head.py = f.head.y;
      f.head.x = f.dragX; f.head.y = f.dragY;
    }
    f.head.pinned = f.dragging;
  }

  function stepPhysics(fighters){
    for (const f of fighters) integrateAndConstrainFighter(f);

    for (let i = 0; i < CONSTRAINT_ITERATIONS; i++){
      for (const f of fighters) for (const s of f.sticks) satisfyStick(s);
      if (fighters.length === 2) resolveInterFighterCollisions(fighters[0], fighters[1]);
      for (const f of fighters){
        for (const p of f.particles){
          if (p === f.head && f.dragging) continue; // let a drag go anywhere, even past the floor/walls
          clampToBounds(p);
        }
      }
    }
  }

  /* ==================== scoring ==================== */
  function particlesTouching(a, b){
    return Math.hypot(b.x - a.x, b.y - a.y) <= a.r + b.r + 1; // +1: a hair of slack for floating-point settling
  }

  // Checks one attacker's weapon tip against a defender's shield first
  // (a block beats any hit that would otherwise land), then closest
  // (highest-value) body part — head, then torso, then limbs. Only the
  // weapon tip scores, not general body contact (that's
  // resolveInterFighterCollisions()'s job, and shouldn't award points or
  // block on its own).
  function findHitScore(attacker, defender){
    if (particlesTouching(attacker.weaponTip, defender.shieldTip)) return { blocked: true };
    if (particlesTouching(attacker.weaponTip, defender.head)) return { amount: HIT_SCORE_HEAD };
    if (particlesTouching(attacker.weaponTip, defender.torso) || particlesTouching(attacker.weaponTip, defender.hip)){
      return { amount: HIT_SCORE_TORSO };
    }
    const limbs = [defender.elbowL, defender.handL, defender.elbowR, defender.handR,
      defender.kneeL, defender.footL, defender.kneeR, defender.footR];
    for (const part of limbs){
      if (particlesTouching(attacker.weaponTip, part)) return { amount: HIT_SCORE_LIMB };
    }
    return null;
  }

  function pushFloatingText(x, y, amount){
    floatingTexts.push({ x, y, text: "+" + amount, life: FLOAT_TEXT_LIFE_FRAMES, maxLife: FLOAT_TEXT_LIFE_FRAMES, kind: "score" });
  }
  function pushBlockText(x, y){
    floatingTexts.push({ x, y, text: "Blocked!", life: FLOAT_TEXT_LIFE_FRAMES, maxLife: FLOAT_TEXT_LIFE_FRAMES, kind: "block" });
  }

  // A block is shown to BOTH players — it's not private like points, it's
  // a shared event they both just watched happen. The host (which always
  // sees its own live simulation) pops this locally the instant it
  // detects a block on either fighter; the guest gets it via the relayed
  // blockEvent id in the state broadcast, same "id changed" pattern as
  // guestScoreEvent but reacted to unconditionally.
  function triggerBlockFeedback(x, y){
    pushBlockText(x, y - 10);
    lastBlockEvent = { id: lastBlockEvent.id + 1, x, y: y - 10 };
  }

  function updateFloatingTexts(){
    for (const t of floatingTexts){ t.y -= 0.7; t.life--; }
    floatingTexts = floatingTexts.filter((t) => t.life > 0);
  }

  // Ends the current round once a fighter's score reaches the host-
  // selected point ceiling: tallies the round win, then either starts
  // the next round after a pause (ROUND_TRANSITION_MS, on-canvas banner
  // only) or ends the whole match if that was the last one (a real
  // overlay with a "Back to Menu" button, since there's nowhere left to
  // auto-advance to). lastRoundWinner is what the crown reads for the
  // round that's about to start — see drawCrown().
  function endRound(winnerRole){
    if (winnerRole === "host") hostRoundsWon++; else guestRoundsWon++;
    lastRoundWinner = winnerRole;

    if (currentRound >= matchRoundCount){
      matchPhase = "match-over";
      showMatchOverOverlay(true, hostRoundsWon, guestRoundsWon);
    } else {
      matchPhase = "round-over";
      roundTransitionTimer = setTimeout(() => {
        roundTransitionTimer = null;
        currentRound++;
        const hWeapon = hostFighter.weaponKey, gWeapon = guestFighter.weaponKey;
        hostFighter = createFighter(hWeapon, hostStartX(), 0);
        guestFighter = createFighter(gWeapon, guestStartX(), 1);
        latestGuestInput = { x: guestStartX(), y: GROUND_Y - 100, dragging: false };
        hostScore = 0; guestScore = 0;
        matchPhase = "playing";
      }, ROUND_TRANSITION_MS);
    }
  }

  // Host-only — runs once per frame against that frame's settled
  // positions. A per-fighter cooldown (not a per-body-part one) is
  // enough to stop a single resting overlap from scoring every frame,
  // while still letting a fast flurry of distinct swings each score.
  function checkMatchScoring(){
    if (matchPhase !== "playing") return;

    if (hostFighter.hitCooldown > 0){
      hostFighter.hitCooldown--;
    } else {
      const hit = findHitScore(hostFighter, guestFighter);
      if (hit){
        hostFighter.hitCooldown = HIT_COOLDOWN_FRAMES;
        if (hit.blocked){
          triggerBlockFeedback(hostFighter.weaponTip.x, hostFighter.weaponTip.y);
        } else {
          hostScore += hit.amount;
          pushFloatingText(hostFighter.head.x, hostFighter.head.y - HEAD_R - 24, hit.amount);
          if (hostScore >= matchPointCeiling){ endRound("host"); return; }
        }
      }
    }

    if (guestFighter.hitCooldown > 0){
      guestFighter.hitCooldown--;
    } else {
      const hit = findHitScore(guestFighter, hostFighter);
      if (hit){
        guestFighter.hitCooldown = HIT_COOLDOWN_FRAMES;
        if (hit.blocked){
          triggerBlockFeedback(guestFighter.weaponTip.x, guestFighter.weaponTip.y);
        } else {
          guestScore += hit.amount;
          // No local floating text — this is the GUEST's point. It rides
          // along in the next state broadcast (see beginHostedMatch()) and
          // the guest pops its own text upon receiving it.
          lastGuestScoreEvent = { id: lastGuestScoreEvent.id + 1, amount: hit.amount };
          if (guestScore >= matchPointCeiling){ endRound("guest"); return; }
        }
      }
    }
  }

  /* ==================== rendering ==================== */
  function drawBone(a, b, width, color){
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function drawWeapon(hand, tip, weapon){
    ctx.strokeStyle = weapon.handleColor;
    ctx.lineWidth = weapon.shaftW;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    const dx = tip.x - hand.x, dy = tip.y - hand.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;

    if (weapon.kind === "sword"){
      const gripEnd = { x: hand.x + ux * len * 0.22, y: hand.y + uy * len * 0.22 };
      ctx.strokeStyle = weapon.headColor;
      ctx.lineWidth = weapon.shaftW * 0.8;
      ctx.beginPath();
      ctx.moveTo(gripEnd.x, gripEnd.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.strokeStyle = "#8B8F99";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gripEnd.x + px * 10, gripEnd.y + py * 10);
      ctx.lineTo(gripEnd.x - px * 10, gripEnd.y - py * 10);
      ctx.stroke();
    } else if (weapon.kind === "spear"){
      ctx.fillStyle = weapon.headColor;
      ctx.beginPath();
      ctx.moveTo(tip.x + ux * 14, tip.y + uy * 14);
      ctx.lineTo(tip.x + px * 5, tip.y + py * 5);
      ctx.lineTo(tip.x - px * 5, tip.y - py * 5);
      ctx.closePath();
      ctx.fill();
    } else if (weapon.kind === "axe"){
      // Double-bitted (labrys-style) head — a mirrored blade wedge on
      // each side of the shaft, larger than a single-sided head so it
      // reads clearly even at this scale.
      ctx.fillStyle = weapon.headColor;
      [1, -1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(tip.x - ux * 20, tip.y - uy * 20);
        ctx.lineTo(tip.x + px * side * 26 + ux * 2, tip.y + py * side * 26 + uy * 2);
        ctx.lineTo(tip.x + ux * 16, tip.y + uy * 16);
        ctx.lineTo(tip.x - px * side * 5, tip.y - py * side * 5);
        ctx.closePath();
        ctx.fill();
      });
    } else if (weapon.kind === "hammer"){
      const headLen = 22, headW = 16;
      ctx.fillStyle = weapon.headColor;
      ctx.beginPath();
      ctx.moveTo(tip.x - ux * headLen / 2 + px * headW / 2, tip.y - uy * headLen / 2 + py * headW / 2);
      ctx.lineTo(tip.x + ux * headLen / 2 + px * headW / 2, tip.y + uy * headLen / 2 + py * headW / 2);
      ctx.lineTo(tip.x + ux * headLen / 2 - px * headW / 2, tip.y + uy * headLen / 2 - py * headW / 2);
      ctx.lineTo(tip.x - ux * headLen / 2 - px * headW / 2, tip.y - uy * headLen / 2 - py * headW / 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // The off-hand shield — always present, not weapon-dependent, so
  // there's no "kind" branching here the way drawWeapon() needs. A
  // round face with a raised boss reads clearly at this scale and
  // doesn't get confused with any of the four weapon heads.
  function drawShield(hand, tip){
    ctx.strokeStyle = COLORS.shieldRim;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tip.x, tip.y, SHIELD_R, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.shieldFace;
    ctx.fill();
    ctx.strokeStyle = COLORS.shieldRim;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tip.x, tip.y, SHIELD_R * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.shieldBoss;
    ctx.fill();
  }

  // Sits above the "mine" marker, not on top of it — see the y offsets
  // where this is called from drawFighter(). y is the crown's base;
  // it's drawn upward from there.
  function drawCrown(x, y){
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x - 9, y - 8);
    ctx.lineTo(x - 5, y - 3);
    ctx.lineTo(x, y - 10);
    ctx.lineTo(x + 5, y - 3);
    ctx.lineTo(x + 9, y - 8);
    ctx.lineTo(x + 9, y);
    ctx.closePath();
    ctx.fillStyle = COLORS.crownGold;
    ctx.fill();
    ctx.strokeStyle = COLORS.crownOutline;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draws one fighter from anything shaped like { head:{x,y}, torso:{x,y},
  // ... weaponKey, palette }, whether that's a live simulated particle
  // set (host, or practice) or a plain interpolated snapshot object
  // (guest) — rendering doesn't care which, so multiplayer needed zero
  // changes to any of the drawing code above.
  function drawFighter(f, opts){
    const palette = f.palette || SUIT_PALETTES[0];
    drawBone(f.hip, f.kneeL, 11, palette.suitDark);
    drawBone(f.kneeL, f.footL, 10, palette.suitDark);
    drawBone(f.hip, f.kneeR, 11, palette.suit);
    drawBone(f.kneeR, f.footR, 10, palette.suit);

    drawBone(f.head, f.torso, 14, palette.suit);
    drawBone(f.torso, f.hip, 18, palette.suit);

    drawBone(f.torso, f.elbowL, 10, palette.suitDark);
    drawBone(f.elbowL, f.handL, 9, palette.suitDark);
    drawBone(f.torso, f.elbowR, 10, palette.suit);
    drawBone(f.elbowR, f.handR, 9, palette.suit);

    if (opts && opts.dragging){
      ctx.beginPath();
      ctx.arc(f.head.x, f.head.y, HEAD_R + 5, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.dragRing;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(f.head.x, f.head.y, HEAD_R, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.head;
    ctx.fill();

    if (opts && opts.mine){
      ctx.beginPath();
      ctx.moveTo(f.head.x - 7, f.head.y - HEAD_R - 12);
      ctx.lineTo(f.head.x + 7, f.head.y - HEAD_R - 12);
      ctx.lineTo(f.head.x, f.head.y - HEAD_R - 3);
      ctx.closePath();
      ctx.fillStyle = COLORS.mineMarker;
      ctx.fill();
    }
    if (opts && opts.crowned){
      drawCrown(f.head.x, f.head.y - HEAD_R - 16);
    }

    drawWeapon(f.handR, f.weaponTip, WEAPONS[f.weaponKey] || WEAPONS.sword);
    drawShield(f.handL, f.shieldTip);
  }

  // Only ever shows your OWN score, never the opponent's — matches the
  // floating "+X" text below, which also only ever appears for whoever
  // actually scored the points.
  function drawScoreHud(){
    if (mode !== "mp-host" && mode !== "mp-guest") return;
    const myScore = mode === "mp-host" ? hostScore : guestOwnScore;
    ctx.textAlign = "left";
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = COLORS.scoreText;
    ctx.fillText("Score: " + myScore, 12, 24);
  }

  function drawFloatingTexts(){
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    for (const t of floatingTexts){
      ctx.font = t.kind === "block" ? "bold 15px sans-serif" : "bold 20px sans-serif";
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.strokeStyle = COLORS.floatingTextOutline;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.kind === "block" ? COLORS.blockText : COLORS.floatingText;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  // Round/win tally is shown to both players — unlike the "+X" points
  // popup, it's not private, it's the shared scoreboard both sides need
  // to follow the match.
  function drawRoundHud(){
    if (mode !== "mp-host" && mode !== "mp-guest") return;
    const info = mode === "mp-host"
      ? { round: currentRound, total: matchRoundCount, myWins: hostRoundsWon, theirWins: guestRoundsWon, ceiling: matchPointCeiling }
      : { round: guestMatchInfo.currentRound, total: guestMatchInfo.roundCount, myWins: guestMatchInfo.guestRoundsWon, theirWins: guestMatchInfo.hostRoundsWon, ceiling: guestMatchInfo.pointCeiling };
    ctx.textAlign = "left";
    ctx.font = "13px sans-serif";
    ctx.fillStyle = COLORS.scoreText;
    ctx.fillText(`Round ${info.round} of ${info.total} — Rounds won: You ${info.myWins}, Opponent ${info.theirWins} (first to ${info.ceiling})`, 12, 42);
  }

  function roundBannerText(phase, amIHostLocal, currentRoundNum, roundsWinner, hWins, gWins){
    const myWins = amIHostLocal ? hWins : gWins;
    const theirWins = amIHostLocal ? gWins : hWins;
    if (phase === "round-over"){
      const iWonRound = amIHostLocal ? roundsWinner === "host" : roundsWinner === "guest";
      return (iWonRound ? "You win Round " : "Opponent wins Round ") + currentRoundNum +
        `! (Rounds: You ${myWins} — Opponent ${theirWins})`;
    }
    return "";
  }

  function drawRoundBanner(){
    let phase, amIHostLocal, currentRoundNum, roundsWinner, hWins, gWins;
    if (mode === "mp-host"){
      phase = matchPhase; amIHostLocal = true; currentRoundNum = currentRound;
      roundsWinner = lastRoundWinner; hWins = hostRoundsWon; gWins = guestRoundsWon;
    } else if (mode === "mp-guest"){
      phase = guestMatchInfo.phase; amIHostLocal = false; currentRoundNum = guestMatchInfo.currentRound;
      roundsWinner = guestMatchInfo.lastRoundWinner; hWins = guestMatchInfo.hostRoundsWon; gWins = guestMatchInfo.guestRoundsWon;
    } else {
      return;
    }
    if (phase !== "round-over") return;
    const text = roundBannerText(phase, amIHostLocal, currentRoundNum, roundsWinner, hWins, gWins);
    ctx.fillStyle = COLORS.bannerBg;
    ctx.fillRect(0, CANVAS_H / 2 - 40, CANVAS_W, 80);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.bannerText;
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2 + 7);
  }

  function draw(){
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = COLORS.groundTrim;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 4);

    if (mode === "practice" && soloFighter){
      drawFighter(soloFighter, { dragging: soloFighter.dragging });
    } else if (mode === "mp-host" && hostFighter && guestFighter){
      drawFighter(guestFighter, { dragging: guestFighter.dragging, mine: false, crowned: lastRoundWinner === "guest" });
      drawFighter(hostFighter, { dragging: hostFighter.dragging, mine: true, crowned: lastRoundWinner === "host" });
    } else if (mode === "mp-guest"){
      const drawable = guestDrawableFighters();
      if (drawable){
        drawFighter(drawable.host, { dragging: drawable.hostDragging, mine: false, crowned: guestMatchInfo.lastRoundWinner === "host" });
        drawFighter(drawable.guest, { dragging: pendingLocalInput ? pendingLocalInput.dragging : false, mine: true, crowned: guestMatchInfo.lastRoundWinner === "guest" });
      }
    }

    drawScoreHud();
    drawRoundHud();
    drawFloatingTexts();
    drawRoundBanner();
  }

  function loop(){
    if (mode === "practice" && soloFighter){
      stepPhysics([soloFighter]);
    } else if (mode === "mp-host" && hostFighter && guestFighter){
      guestFighter.dragging = latestGuestInput.dragging;
      guestFighter.dragX = latestGuestInput.x;
      guestFighter.dragY = latestGuestInput.y;
      stepPhysics([hostFighter, guestFighter]);
      checkMatchScoring();
    }
    // mp-guest never simulates — it just interpolates + renders below.
    updateFloatingTexts();
    draw();
    animId = requestAnimationFrame(loop);
  }

  /* ==================== network (de)serialization ==================== */
  function serializeFighter(f){
    const p = [];
    for (const name of PARTICLE_NAMES){ p.push(f[name].x, f[name].y); }
    return { w: f.weaponKey, d: !!f.dragging, p };
  }
  function deserializeFighter(data, paletteIndex){
    const out = { weaponKey: data.w, dragging: !!data.d, palette: SUIT_PALETTES[paletteIndex || 0] };
    PARTICLE_NAMES.forEach((name, i) => { out[name] = { x: data.p[i * 2], y: data.p[i * 2 + 1] }; });
    return out;
  }
  function lerpFighterSnapshot(a, b, t){
    const out = { weaponKey: b.w, dragging: !!b.d, palette: a.palette };
    PARTICLE_NAMES.forEach((name, i) => {
      out[name] = {
        x: a.p[i * 2] + (b.p[i * 2] - a.p[i * 2]) * t,
        y: a.p[i * 2 + 1] + (b.p[i * 2 + 1] - a.p[i * 2 + 1]) * t
      };
    });
    return out;
  }

  function guestDrawableFighters(){
    if (!guestRenderNext) return null;
    if (!guestRenderPrev){
      return {
        host: deserializeFighter(guestRenderNext.host, 0),
        guest: deserializeFighter(guestRenderNext.guest, 1),
        hostDragging: !!guestRenderNext.host.d
      };
    }
    const elapsed = performance.now() - guestRenderNextAt;
    const t = Math.max(0, Math.min(1, elapsed / guestRenderIntervalEstimate));
    const hostSnap = lerpFighterSnapshot(guestRenderPrev.host, guestRenderNext.host, t);
    const guestSnap = lerpFighterSnapshot(guestRenderPrev.guest, guestRenderNext.guest, t);
    hostSnap.palette = SUIT_PALETTES[0];
    guestSnap.palette = SUIT_PALETTES[1];
    return { host: hostSnap, guest: guestSnap, hostDragging: !!guestRenderNext.host.d };
  }

  /* ==================== pointer input ==================== */
  function pointerPos(e){
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * CANVAS_W,
      y: (e.clientY - rect.top) / rect.height * CANVAS_H
    };
  }

  function localDragTarget(){
    if (mode === "practice") return soloFighter;
    if (mode === "mp-host") return hostFighter;
    return null; // mp-guest has no local fighter to pin directly — see onPointerMove
  }

  function onPointerDown(e){
    if (!started) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const pos = pointerPos(e);
    const f = localDragTarget();
    if (f){
      f.dragging = true;
      f.dragX = pos.x; f.dragY = pos.y;
    } else if (mode === "mp-guest"){
      pendingLocalInput = { x: pos.x, y: pos.y, dragging: true };
    }
  }
  function onPointerMove(e){
    const f = localDragTarget();
    if (f && f.dragging){
      e.preventDefault();
      const pos = pointerPos(e);
      f.dragX = pos.x; f.dragY = pos.y;
    } else if (mode === "mp-guest" && pendingLocalInput && pendingLocalInput.dragging){
      e.preventDefault();
      const pos = pointerPos(e);
      pendingLocalInput.x = pos.x; pendingLocalInput.y = pos.y;
    }
  }
  function onPointerUp(){
    const f = localDragTarget();
    if (f && f.dragging){
      f.dragging = false;
      f.head.pinned = false;
    } else if (mode === "mp-guest" && pendingLocalInput){
      pendingLocalInput.dragging = false;
    }
  }

  /* ==================== Firebase (lazy-loaded) ==================== */
  // Nothing below this point runs, and no Firebase code is even
  // downloaded, unless the player actually opens the Multiplayer menu —
  // Practice mode and the rest of this site never touch the network.
  const FIREBASE_SDK_VERSION = "10.14.1";
  let fb = null; // { db, uid, ref, set, update, onValue, onDisconnect, get, child, remove }

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
    for (let i = 0; i < ROOM_CODE_LEN; i++){
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    return code;
  }

  let stateListenerUnsub = null, guestInputListenerUnsub = null, roomListenerUnsub = null;

  function stopNetworkTimers(){
    if (stateSendTimer){ clearInterval(stateSendTimer); stateSendTimer = null; }
    if (inputSendTimer){ clearInterval(inputSendTimer); inputSendTimer = null; }
    if (stateListenerUnsub){ stateListenerUnsub(); stateListenerUnsub = null; }
    if (guestInputListenerUnsub){ guestInputListenerUnsub(); guestInputListenerUnsub = null; }
    if (roomListenerUnsub){ roomListenerUnsub(); roomListenerUnsub = null; }
  }

  async function leaveMatch(){
    stopNetworkTimers();
    if (roundTransitionTimer){ clearTimeout(roundTransitionTimer); roundTransitionTimer = null; }
    matchPhase = "playing";
    lastRoundWinner = null;
    guestMatchOverShown = false;
    if (fb && roomCode){
      const roomRef = fb.ref(fb.db, `floppy-rooms/${roomCode}`);
      try {
        if (amIHost){
          await fb.remove(roomRef);
        } else {
          // Sequential, not a single combined update() — guestWeapon's
          // and status's rules check the CURRENT guestUid, so they have
          // to land while it's still there; only clear guestUid last.
          // See "Firebase setup for Floppy Swords multiplayer" in the
          // README for why this matters.
          await fb.update(roomRef, { status: "waiting" });
          await fb.update(roomRef, { guestWeapon: null });
          await fb.update(roomRef, { guestUid: null });
        }
      } catch (err){ if (DEBUG) console.warn("[Floppy Swords] leaveMatch cleanup failed:", err); }
    }
    roomCode = null;
    hostFighter = null; guestFighter = null;
    guestRenderPrev = null; guestRenderNext = null;
    floatingTexts = [];
    started = false;
    if (animId){ cancelAnimationFrame(animId); animId = null; }
  }

  async function hostMatch(weaponKey, pointCeiling, roundCount){
    overlayInner.innerHTML = `<h3>Floppy Swords</h3><p>Connecting…</p>`;
    try {
      await ensureFirebase();
    } catch (err){
      showConnectError(err);
      return;
    }
    amIHost = true;
    matchPointCeiling = pointCeiling;
    matchRoundCount = roundCount;
    currentRound = 1;
    hostRoundsWon = 0; guestRoundsWon = 0;
    lastRoundWinner = null;
    matchPhase = "playing";
    roomCode = randomRoomCode();
    const roomRef = fb.ref(fb.db, `floppy-rooms/${roomCode}`);
    await fb.set(roomRef, {
      hostUid: fb.uid, guestUid: null,
      hostWeapon: weaponKey, guestWeapon: null,
      pointCeiling, roundCount, orientation,
      status: "waiting", createdAt: Date.now()
    });
    fb.onDisconnect(roomRef).remove();

    showHostWaitingOverlay(roomCode);

    roomListenerUnsub = fb.onValue(roomRef, (snap) => {
      const data = snap.val();
      if (!data){
        if (mode === "mp-host" && started) showOpponentLeftOverlay();
        return;
      }
      // guestUid and guestWeapon land in separate sequential writes (see
      // joinMatch()), so a guest who's mid-join can briefly show up here
      // with guestUid set but guestWeapon not yet — wait for both, or
      // this could lock in a wrong fallback weapon for the whole match.
      if (data.guestUid && data.guestWeapon && mode !== "mp-host"){
        beginHostedMatch(weaponKey, data.guestWeapon);
      } else if (!data.guestUid && started){
        showOpponentLeftOverlay();
      }
    });
  }

  function beginHostedMatch(hostWeaponKey, guestWeaponKey){
    mode = "mp-host";
    hostFighter = createFighter(hostWeaponKey, hostStartX(), 0);
    guestFighter = createFighter(guestWeaponKey, guestStartX(), 1);
    latestGuestInput = { x: guestStartX(), y: GROUND_Y - 100, dragging: false };
    hostScore = 0; guestScore = 0;
    lastGuestScoreEvent = { id: 0, amount: 0 };
    floatingTexts = [];
    started = true;
    overlay.style.display = "none";

    const roomRef = fb.ref(fb.db, `floppy-rooms/${roomCode}`);
    guestInputListenerUnsub = fb.onValue(fb.ref(fb.db, `floppy-rooms/${roomCode}/inputs/guest`), (snap) => {
      const data = snap.val();
      if (data) latestGuestInput = data;
    });

    stateSendTimer = setInterval(() => {
      if (!hostFighter || !guestFighter) return;
      fb.update(roomRef, {
        state: { t: Date.now(), host: serializeFighter(hostFighter), guest: serializeFighter(guestFighter),
          hostScore, guestScore, guestScoreEvent: lastGuestScoreEvent, blockEvent: lastBlockEvent,
          phase: matchPhase, currentRound, roundCount: matchRoundCount,
          hostRoundsWon, guestRoundsWon, pointCeiling: matchPointCeiling, lastRoundWinner }
      }).catch((err) => { if (DEBUG) console.warn("[Floppy Swords] state push failed:", err); });
    }, STATE_SEND_INTERVAL_MS);

    if (!animId) loop();
  }

  async function joinMatch(code, weaponKey){
    overlayInner.innerHTML = `<h3>Floppy Swords</h3><p>Connecting…</p>`;
    let f;
    try {
      f = await ensureFirebase();
    } catch (err){
      showConnectError(err);
      return;
    }
    roomCode = code.trim().toUpperCase();
    const roomRef = f.ref(f.db, `floppy-rooms/${roomCode}`);
    const snap = await f.get(roomRef);
    const data = snap.val();
    if (!data || data.status !== "waiting" || data.guestUid){
      showJoinErrorOverlay("That code isn't open right now — check it and try again.");
      return;
    }
    amIHost = false;
    // Joining adopts the host's chosen orientation, not whatever this
    // client had locally — both sides must agree on CANVAS_W/CANVAS_H,
    // since the guest renders the host's raw broadcast coordinates
    // directly with no per-client rescaling. Applied before anything
    // below reads guestStartX()/GROUND_Y for a default position.
    applyOrientation(data.orientation || "landscape");
    // Sequential, not a single combined update() — guestWeapon's and
    // status's rules check that guestUid already matches this client,
    // so guestUid has to land (and be readably committed) first. See
    // "Firebase setup for Floppy Swords multiplayer" in the README.
    await f.update(roomRef, { guestUid: f.uid });
    await f.update(roomRef, { guestWeapon: weaponKey });
    await f.update(roomRef, { status: "active" });
    f.onDisconnect(f.ref(f.db, `floppy-rooms/${roomCode}/guestUid`)).remove();

    mode = "mp-guest";
    started = true;
    pendingLocalInput = { x: guestStartX(), y: GROUND_Y - 100, dragging: false };
    guestOwnScore = 0; guestLastSeenScoreEventId = 0; guestLastSeenBlockEventId = 0;
    guestMatchOverShown = false;
    floatingTexts = [];
    overlay.style.display = "none";

    stateListenerUnsub = f.onValue(f.ref(f.db, `floppy-rooms/${roomCode}/state`), (snap2) => {
      const stateData = snap2.val();
      if (!stateData) return;
      guestRenderPrev = guestRenderNext;
      guestRenderNext = stateData;
      const now = performance.now();
      if (guestRenderNextAt) guestRenderIntervalEstimate = Math.max(30, Math.min(300, now - guestRenderNextAt));
      guestRenderNextAt = now;

      guestOwnScore = stateData.guestScore || 0;
      const ev = stateData.guestScoreEvent;
      if (ev && ev.id > guestLastSeenScoreEventId){
        guestLastSeenScoreEventId = ev.id;
        // stateData.guest.p[0]/[1] are the head's x/y — PARTICLE_NAMES
        // puts "head" first, so no need to deserialize the whole fighter
        // just to place this popup.
        pushFloatingText(stateData.guest.p[0], stateData.guest.p[1] - HEAD_R - 24, ev.amount);
      }
      const bEv = stateData.blockEvent;
      if (bEv && bEv.id > guestLastSeenBlockEventId){
        guestLastSeenBlockEventId = bEv.id;
        pushBlockText(bEv.x, bEv.y);
      }

      guestMatchInfo = {
        phase: stateData.phase || "playing",
        currentRound: stateData.currentRound || 1,
        roundCount: stateData.roundCount || 1,
        hostRoundsWon: stateData.hostRoundsWon || 0,
        guestRoundsWon: stateData.guestRoundsWon || 0,
        pointCeiling: stateData.pointCeiling || POINT_CEILING_DEFAULT,
        lastRoundWinner: stateData.lastRoundWinner || null
      };
      if (guestMatchInfo.phase === "match-over" && !guestMatchOverShown){
        guestMatchOverShown = true;
        showMatchOverOverlay(false, guestMatchInfo.hostRoundsWon, guestMatchInfo.guestRoundsWon);
      }
    });
    roomListenerUnsub = f.onValue(roomRef, (snap2) => {
      const roomData = snap2.val();
      if (!roomData && started) showOpponentLeftOverlay();
    });

    inputSendTimer = setInterval(() => {
      if (!pendingLocalInput) return;
      f.update(f.ref(f.db, `floppy-rooms/${roomCode}`), {
        [`inputs/guest`]: { x: pendingLocalInput.x, y: pendingLocalInput.y, dragging: pendingLocalInput.dragging, t: Date.now() }
      }).catch((err) => { if (DEBUG) console.warn("[Floppy Swords] input push failed:", err); });
    }, INPUT_SEND_INTERVAL_MS);

    if (!animId) loop();
  }

  /* ==================== overlays ==================== */
  function showModeSelectOverlay(){
    mode = "menu";
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Floppy Swords</h3>
      <p>Drag a fighter around by the head — the rest of the body (and
      whatever's in its hand) trails behind on ragdoll physics. Practice
      alone, or connect with someone else's phone or computer for a real
      match.</p>
      <button type="button" class="btn" id="floppy-mode-practice-btn">Practice</button>
      <button type="button" class="btn" id="floppy-mode-multiplayer-btn">Multiplayer</button>
    `;
    document.getElementById("floppy-mode-practice-btn").addEventListener("click", showWeaponSelectOverlay);
    document.getElementById("floppy-mode-multiplayer-btn").addEventListener("click", showMultiplayerMenuOverlay);
  }

  function showWeaponSelectOverlay(){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Floppy Swords</h3>
      <p>Pick a weapon: heavier ones lag further behind your swing and
      are harder to redirect, lighter ones keep up almost instantly.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        ${WEAPON_ORDER.map(key => `<button type="button" class="btn" data-weapon="${key}">${WEAPONS[key].label}</button>`).join("")}
      </div>
      <p class="form-note" style="margin-top:10px;"><a href="#" id="floppy-back-to-menu">&larr; Back</a></p>
    `;
    WEAPON_ORDER.forEach(key => {
      overlayInner.querySelector(`[data-weapon="${key}"]`).addEventListener("click", () => startPracticeFight(key));
    });
    document.getElementById("floppy-back-to-menu").addEventListener("click", (e) => { e.preventDefault(); showModeSelectOverlay(); });
  }

  function startPracticeFight(weaponKey){
    mode = "practice";
    soloFighter = createFighter(weaponKey, soloStartX(), 0);
    started = true;
    overlay.style.display = "none";
    if (!animId) loop();
  }

  function showMultiplayerMenuOverlay(){
    overlay.style.display = "flex";
    if (!isFirebaseConfigured()){
      overlayInner.innerHTML = `
        <h3>Multiplayer isn't set up yet</h3>
        <p>This site's owner needs to finish the Firebase Realtime
        Database setup described in the README before matches can
        connect. Practice mode still works fully offline.</p>
        <button type="button" class="btn light" id="floppy-back-to-menu-2">&larr; Back</button>
      `;
      document.getElementById("floppy-back-to-menu-2").addEventListener("click", showModeSelectOverlay);
      return;
    }
    overlayInner.innerHTML = `
      <h3>Multiplayer</h3>
      <p>Host a match and share the code, or join one someone else
      started. Works across any two devices — including two phones.</p>
      <button type="button" class="btn" id="floppy-host-btn">Host Match</button>
      <button type="button" class="btn" id="floppy-join-btn">Join Match</button>
      <p class="form-note" style="margin-top:10px;"><a href="#" id="floppy-back-to-menu-3">&larr; Back</a></p>
    `;
    document.getElementById("floppy-host-btn").addEventListener("click", showHostSetupOverlay);
    document.getElementById("floppy-join-btn").addEventListener("click", showJoinCodeEntryOverlay);
    document.getElementById("floppy-back-to-menu-3").addEventListener("click", (e) => { e.preventDefault(); showModeSelectOverlay(); });
  }

  function showHostSetupOverlay(){
    const roundOptions = [];
    for (let n = ROUND_COUNT_MIN; n <= ROUND_COUNT_MAX; n++) roundOptions.push(n);
    overlayInner.innerHTML = `
      <h3>Set up the match</h3>
      <div class="form-row">
        <label for="floppy-ceiling-select">First to how many points wins a round?</label>
        <select id="floppy-ceiling-select">
          ${POINT_CEILING_OPTIONS.map(v => `<option value="${v}"${v === POINT_CEILING_DEFAULT ? " selected" : ""}>${v} points</option>`).join("")}
        </select>
      </div>
      <div class="form-row">
        <label for="floppy-roundcount-select">How many rounds?</label>
        <select id="floppy-roundcount-select">
          ${roundOptions.map(v => `<option value="${v}"${v === ROUND_COUNT_DEFAULT ? " selected" : ""}>${v} round${v > 1 ? "s" : ""}</option>`).join("")}
        </select>
      </div>
      <p class="form-note">Pick your weapon to start the match.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        ${WEAPON_ORDER.map(key => `<button type="button" class="btn" data-weapon="${key}">${WEAPONS[key].label}</button>`).join("")}
      </div>
    `;
    WEAPON_ORDER.forEach(key => {
      overlayInner.querySelector(`[data-weapon="${key}"]`).addEventListener("click", () => {
        const ceiling = parseInt(document.getElementById("floppy-ceiling-select").value, 10);
        const rounds = parseInt(document.getElementById("floppy-roundcount-select").value, 10);
        hostMatch(key, ceiling, rounds);
      });
    });
  }

  function showHostWaitingOverlay(code){
    overlayInner.innerHTML = `
      <h3>Waiting for an opponent…</h3>
      <p>Share this code with them — they'll enter it under "Join Match" on their own device:</p>
      <p style="font-size:2rem;font-weight:700;letter-spacing:0.3em;margin:14px 0;">${escapeCodeForDisplay(code)}</p>
      <button type="button" class="btn light" id="floppy-cancel-host-btn">Cancel</button>
    `;
    document.getElementById("floppy-cancel-host-btn").addEventListener("click", async () => {
      await leaveMatch();
      showModeSelectOverlay();
    });
  }

  function showJoinCodeEntryOverlay(){
    overlayInner.innerHTML = `
      <h3>Join a match</h3>
      <div class="form-row">
        <input type="text" id="floppy-code-input" placeholder="CODE" maxlength="${ROOM_CODE_LEN}"
          autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false"
          inputmode="text" style="text-transform:uppercase;letter-spacing:0.2em;text-align:center;font-size:1.3rem;">
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        ${WEAPON_ORDER.map(key => `<button type="button" class="btn" data-weapon="${key}">${WEAPONS[key].label}</button>`).join("")}
      </div>
      <p class="form-note">Pick a weapon once you've typed the code.</p>
    `;
    const input = document.getElementById("floppy-code-input");
    input.addEventListener("input", () => { input.value = input.value.toUpperCase(); });
    WEAPON_ORDER.forEach(key => {
      overlayInner.querySelector(`[data-weapon="${key}"]`).addEventListener("click", () => {
        const code = input.value.trim();
        if (code.length !== ROOM_CODE_LEN){
          showJoinErrorOverlay("Enter the full " + ROOM_CODE_LEN + "-character code first.");
          return;
        }
        joinMatch(code, key);
      });
    });
  }

  function showJoinErrorOverlay(message){
    overlayInner.innerHTML = `
      <h3>Couldn't join</h3>
      <p>${escapeCodeForDisplay(message)}</p>
      <button type="button" class="btn" id="floppy-retry-join-btn">Try Again</button>
      <button type="button" class="btn light" id="floppy-back-to-menu-4">&larr; Back</button>
    `;
    document.getElementById("floppy-retry-join-btn").addEventListener("click", showJoinCodeEntryOverlay);
    document.getElementById("floppy-back-to-menu-4").addEventListener("click", showModeSelectOverlay);
  }

  function showConnectError(err){
    if (DEBUG) console.error("[Floppy Swords] Firebase connect failed:", err);
    overlayInner.innerHTML = `
      <h3>Couldn't connect</h3>
      <p>Multiplayer needs a network connection to the realtime database — check your connection and try again.</p>
      <button type="button" class="btn light" id="floppy-back-to-menu-5">&larr; Back</button>
    `;
    document.getElementById("floppy-back-to-menu-5").addEventListener("click", showModeSelectOverlay);
  }

  async function showOpponentLeftOverlay(){
    await leaveMatch();
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Opponent left</h3>
      <p>The other player disconnected.</p>
      <button type="button" class="btn" id="floppy-back-to-menu-6">Back to Menu</button>
    `;
    document.getElementById("floppy-back-to-menu-6").addEventListener("click", showModeSelectOverlay);
  }

  // Shown on both sides once the last round ends — unlike round-over
  // (an on-canvas banner that auto-clears), the match is actually done,
  // so this is a real overlay: nowhere left to auto-advance to. Doesn't
  // tear the match down itself (the fighters/room stay alive so both
  // players can see the final positions) — only leaving via the button
  // does that.
  function showMatchOverOverlay(amIHostLocal, hWon, gWon){
    overlay.style.display = "flex";
    const myWins = amIHostLocal ? hWon : gWon;
    const theirWins = amIHostLocal ? gWon : hWon;
    let resultLine;
    if (hWon === gWon) resultLine = `The match ended in a tie, ${hWon}-${gWon}.`;
    else resultLine = myWins > theirWins ? `You won the match, ${myWins}-${theirWins}!` : `You lost the match, ${theirWins}-${myWins}.`;
    overlayInner.innerHTML = `
      <h3>Match Complete</h3>
      <p>${resultLine}</p>
      <button type="button" class="btn" id="floppy-match-over-menu-btn">Back to Menu</button>
    `;
    document.getElementById("floppy-match-over-menu-btn").addEventListener("click", async () => {
      await leaveMatch();
      showModeSelectOverlay();
    });
  }

  function escapeCodeForDisplay(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  /* ==================== bootstrap ==================== */
  // Swaps CANVAS_W/CANVAS_H/GROUND_Y between the landscape/portrait
  // presets, resizes the actual <canvas> element (its width/height
  // attributes define the internal pixel-coordinate space the physics
  // runs in — separate from the CSS size it's displayed at), toggles the
  // matching CSS class on the wrap div (see .game-wrap.floppy-portrait in
  // style.css) so the container's own max-width follows suit instead of
  // stretching a portrait-shaped buffer wide, and updates the button's
  // own label to whatever it would switch to next. Only ever called
  // between sessions (see the button handler below and joinMatch()) —
  // never mid-fight, so there's no "existing fighter's positions are now
  // nonsense" case to handle.
  function applyOrientation(newOrientation){
    orientation = newOrientation === "portrait" ? "portrait" : "landscape";
    const preset = ORIENTATION_PRESETS[orientation];
    CANVAS_W = preset.w;
    CANVAS_H = preset.h;
    GROUND_Y = CANVAS_H - 40;
    if (canvas){ canvas.width = CANVAS_W; canvas.height = CANVAS_H; }
    const wrap = document.getElementById("floppy-game-wrap");
    if (wrap) wrap.classList.toggle("floppy-portrait", orientation === "portrait");
    if (orientationBtn) orientationBtn.textContent = orientation === "portrait" ? "Desktop" : "Mobile";
    if (ctx) draw();
  }

  function initGame(){
    if (DEBUG) console.log("[Floppy Swords] floppy.js loaded");
    canvas = document.getElementById("floppy-canvas");
    overlay = document.getElementById("floppy-overlay");
    overlayInner = document.getElementById("floppy-overlay-inner");
    if (!canvas || !overlay) return;

    ctx = canvas.getContext("2d");
    draw();
    showModeSelectOverlay();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const menuBtn = document.getElementById("floppy-menu-btn");
    if (menuBtn) menuBtn.addEventListener("click", async () => {
      started = false;
      await leaveMatch();
      showModeSelectOverlay();
    });
    const resetBtn = document.getElementById("floppy-reset-btn");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      if (mode === "practice" && soloFighter) soloFighter = createFighter(soloFighter.weaponKey, soloStartX(), 0);
    });

    orientationBtn = document.getElementById("floppy-orientation-btn");
    if (orientationBtn) orientationBtn.addEventListener("click", async () => {
      started = false;
      await leaveMatch();
      applyOrientation(orientation === "portrait" ? "landscape" : "portrait");
      showModeSelectOverlay();
    });

    window.addEventListener("beforeunload", () => { leaveMatch(); });
  }

  document.addEventListener("DOMContentLoaded", initGame);

})();
