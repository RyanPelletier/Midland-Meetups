/* =====================================================================
   ARACHNID GUY
   A 2D right-scrolling rooftop parkour game — swing, run, and jump
   across the city on a dual web-shooter system while webbing up and
   taking down goons. Same mid-century modern visual language as the
   other games on this page, own file, own canvas.

   Shares this page with Wizards & Waffles, And So I Wander, and Doom
   Scroller, so this file only reacts to input when its OWN canvas is
   focused — see initGame() at the bottom (same guard those three use).

   CONTROLS: W to jump, S for a flying kick, Space to fire both
   web-shooters at once (whichever hand isn't currently swinging and is
   off cooldown). KeyA/KeyD each grab onto a swing the instant they're
   pressed and let go on release — always works, comic-Spider-Man style,
   no city anchor point needed. The left hand's web pulls you backward
   (anchored 15% in from the left edge), the right hand's pulls you
   forward (anchored 10% in from the right edge) — alternate hands for a
   real back-and-forth swinging rhythm. Releasing launches you onward
   with whatever momentum you built up. The web auto-climbs while you
   swing, so you gain height without any extra input. The flying kick
   locks onto the nearest goon (or the flying goblin) ahead and closes
   the distance instantly — the target is the anchor point and the
   "climb" runs at 100% speed instead of the usual slow auto-climb —
   defeating it outright (stunned or not) and sending it into a ragdoll
   tumble. An on-page toggle swaps the whole scheme to arrow keys
   (Left/Right/Up/Down) instead — see controlKeys() and the
   #webrunner-control-scheme checkbox in initGame(). Some goons carry
   rocket launchers instead of pistols — their shots explode on impact
   for 2 hit points instead of 1, same as a regular bullet now too (see
   GOON_BULLET_DAMAGE). A wiggly squiggle appears over the player's head
   whenever some enemy projectile is genuinely about to pass close by —
   see isThreatIncoming()/drawAlertSquiggles(). A rare flying goblin on a
   hoverboard occasionally shows up and chases the player, throwing
   exploding pumpkins, until either it or the player goes down — see
   trySpawnGoblin()/updateGoblin(). HP regenerates slowly on its own
   after a stretch of not getting hit — see REGEN_DELAY_FRAMES/
   REGEN_INTERVAL_FRAMES/updateRegen() — deliberately slow so it's a
   reward for careful play, not a crutch. Rooftop obstacles block
   forward progress rather than being an instant hit — running into one
   stops it dead against the player instead of passing through, and only
   sustained contact costs HP, at a slow drip (see
   OBSTACLE_DAMAGE_INTERVAL_FRAMES/applyObstacleDamage()); jump clear
   before the first tick and it costs nothing.

   Login/leaderboard/shop: see showLoginOverlay()/showShopOverlay() —
   an account-bound Tech Points balance buys permanent upgrades, same as
   Doom Scroller's login pattern but with its own account/Sheet tab.

   TUNING: every number worth playing with lives in CONFIG below.
   ===================================================================== */

(function(){

  /* ==================== CONFIG ==================== */
  const CANVAS_W = 640;
  const CANVAS_H = 360;
  const GROUND_Y = 340; // street level — falling past this is a death, not just a stumble

  const PLAYER_X_BASE = 170; // resting on-screen x while running/airborne (no direct left/right input)
  const PLAYER_W = 24;
  const PLAYER_H = 38;

  const GRAVITY = 0.55;
  const JUMP_VELOCITY = -11.5;

  const SCROLL_START = 3.0;
  const SCROLL_MAX = 9.0; // higher ceiling so a long run keeps visibly escalating instead of plateauing early
  const SCROLL_RAMP = 0.0005; // per frame — now takes ~200s to hit SCROLL_MAX instead of ~100s

  // Rooftop generation — heights vary within this band so jumps/swings
  // stay fair, never a sheer unreachable cliff.
  const ROOFTOP_MIN_Y = 200;
  const ROOFTOP_MAX_Y = 300;
  const ROOFTOP_MAX_STEP = 55; // max height change platform-to-platform
  const PLATFORM_MIN_W = 150;
  const PLATFORM_MAX_W = 300;
  const GAP_SMALL_MIN = 70, GAP_SMALL_MAX = 120;   // jumpable without swinging
  const GAP_BIG_MIN = 160, GAP_BIG_MAX = 250;      // wide enough that swinging is the practical way across
  const BIG_GAP_CHANCE = 0.45;

  // Rooftop obstacles — a platform can get more than one now that
  // platforms run longer. Placement divides the platform's usable span
  // (inside the edge margin on both sides) into `count` equal slots and
  // drops one obstacle with a little jitter in each, which guarantees
  // both the edge margin AND minimum spacing between obstacles in one
  // pass — no rejection-sampling/retry loop needed.
  const OBSTACLE_CHANCE = 0.5; // chance a platform gets any obstacles at all
  const OBSTACLE_W = 20, OBSTACLE_H = 22;
  const OBSTACLE_EDGE_MARGIN = 34; // min clearance from either platform edge
  const OBSTACLE_MIN_GAP = 50; // min slot width, so obstacles never cluster/overlap
  const OBSTACLE_MAX_COUNT = 3;

  // Dual web-shooters — Space fires both hands at once (each still gated
  // by its own cooldown, and skipped if that hand is currently the one
  // swinging); A/D each grab onto a swing the instant they're pressed
  // and let go on release. Swinging always works, comic-Spider-Man
  // style — no city anchor point to find, it just shoots up into the
  // skyline. See fireBothHands() / attemptSwingAttach().
  const WEB_SHOT_SPEED = 10.5;
  const WEB_HAND_COOLDOWN_FRAMES = 20;
  const SWING_VIRTUAL_HEIGHT = 150; // how high above the anchor's screen-x the web's attach point sits
  // Each hand anchors to a different fixed screen-x, not the same spot —
  // the left hand pulls backward (toward 15% in from the left edge), the
  // right hand pulls forward (toward 10% in from the right edge, same
  // spot as before), so alternating hands gives a real back-and-forth
  // swinging rhythm instead of both arms doing the same thing.
  const SWING_ANCHOR_X_FRACTION_LEFT = 0.15;
  const SWING_ANCHOR_X_FRACTION_RIGHT = 0.9;
  const SWING_DAMPING = 0.999;
  const SWING_AUTO_CLIMB_RATE = 0.0375; // fraction the rope shortens by, automatically, every frame while swinging (75% of the original 0.05 rate — slower climb)
  const SWING_MIN_ROPE = 40;

  // Flying kick — S/Down. Locks onto the nearest goon ahead (within
  // KICK_RANGE) and reuses the swing's anchor+rope math with the goon as
  // the anchor, but the rope "climbs" at 100% instead of the swing's slow
  // auto-climb, so it closes the whole distance in a single beat rather
  // than reeling in gradually. See attemptFlyingKick()/updateKick().
  const KICK_RANGE = 240;
  const KICK_CLOSE_RATE = 1.0; // 100% speed — collapses the rope to the anchor in one frame
  const KICK_RECOVERY_FRAMES = 18; // how long the kick pose holds before returning to normal control
  const KICK_COOLDOWN_FRAMES = 30;
  const SCORE_PER_KICK = 10; // worth less than a web-shooter takedown — it's the faster, lower-effort finisher

  const GOON_W = 22, GOON_H = 34;
  const GOON_SPAWN_CHANCE = 0.5; // per eligible platform
  const GOON_FIRE_COOLDOWN_MIN = 45, GOON_FIRE_COOLDOWN_MAX = 85; // faster than before — goons open fire more often
  const GOON_BULLET_SPEED = 6.5;
  const GOON_BULLET_DAMAGE = 2;
  const GOON_RANGE = 600; // wider than the ~470px needed to just barely reach on-screen — at the faster scroll speed, goons need to start their cooldown while still approaching, or they never get a shot off before the player is already past them
  const STUN_DURATION_FRAMES = 150;
  const SCORE_PER_GOON = 30; // web-shooter stun + contact takedown

  // Incoming-fire alert — a wiggly squiggle over the player's head
  // whenever some enemy projectile (bullet, rocket, or pumpkin — any
  // entry in goonBullets) is on a straight-line path that will pass
  // close by soon, using the true closest-approach point along its
  // trajectory rather than just its current distance. See
  // isThreatIncoming()/drawAlertSquiggles().
  const ALERT_LOOKAHEAD_FRAMES = 45;
  const ALERT_RADIUS = 30;

  // RPG goons — a subset of spawned goons carry a rocket launcher instead
  // of a pistol. Slower shots, longer reload, but a hit explodes for
  // ROCKET_DAMAGE instead of the usual 1.
  const RPG_GOON_CHANCE = 0.25; // fraction of spawned goons that are the RPG variant
  const ROCKET_SPEED = 4.5;
  const ROCKET_R = 6;
  const ROCKET_DAMAGE = 2;
  const RPG_FIRE_COOLDOWN_MIN = 110, RPG_FIRE_COOLDOWN_MAX = 200;
  const EXPLOSION_LIFE_FRAMES = 18;

  const PLAYER_MAX_HP = 4;
  const INVULN_AFTER_HIT_FRAMES = 55;
  const RAGDOLL_GRAVITY = 0.5;

  // Regenerative healing — a slow trickle, not a crutch: roughly 5s out
  // of combat before it kicks in, then about 8s per HP after that, so
  // recovering from a big hit takes real time spent staying unhit.
  const REGEN_DELAY_FRAMES = 300;
  const REGEN_INTERVAL_FRAMES = 480;

  // Rooftop obstacles now block forward progress instead of being an
  // instant hit — running into one stops it dead against the player
  // (see updatePlayer()) rather than letting the player pass through,
  // and only sustained contact costs HP, at a slow drip (2x the regen
  // rate above) rather than a single burst. Jump clear before the first
  // tick and it costs nothing.
  const OBSTACLE_DAMAGE_INTERVAL_FRAMES = REGEN_INTERVAL_FRAMES / 2;

  // Shop — permanent, account-bound upgrades bought with Tech Points
  // (earned 1:1 with score at the end of every logged-in run, added to a
  // running balance regardless of whether it's a new best). See
  // hasWebShooterUpgrade()/effectiveRegenInterval() for where these
  // actually change behavior.
  //
  // Web Shooter Auto-Targeting — a one-time unlock. Without it, a web
  // shot fires in a fixed direction (left hand up-and-back, right hand
  // up-and-forward, same as the old no-target fallback) — landing a hit
  // takes real aim. With it, shots auto-track the nearest un-stunned
  // goon in either direction, same as every shot has since it was built.
  const WEB_SHOOTER_UPGRADE_COST = 800;
  // Health Regen Boost — repeatable, each purchase multiplies regen
  // speed by 1.2x. Capped at 5 levels (~2.5x total) so it stays a
  // meaningful grind rather than making regen trivially fast.
  const REGEN_UPGRADE_MULTIPLIER = 1.2;
  const REGEN_UPGRADE_MAX_LEVEL = 5;
  const REGEN_UPGRADE_BASE_COST = 400; // cost for level N+1 is this * (N+1)

  // Flying Goblin — a rare, persistent chase enemy on a hoverboard.
  // Unlike regular goons (which spawn with the scrolling city and get
  // left behind), it actively repositions to stay near the player and
  // never leaves on its own — only defeating it (or the player dying)
  // ends the encounter. See trySpawnGoblin()/updateGoblin().
  const GOBLIN_MIN_SPAWN_FRAME = 900; // no goblin in the first ~15s
  const GOBLIN_SPAWN_CHECK_INTERVAL_FRAMES = 600; // ~10s between spawn rolls
  const GOBLIN_SPAWN_CHANCE = 0.525; // per roll, while none is currently active (50% higher than the original 0.35)
  const GOBLIN_W = 26, GOBLIN_H = 30;
  const GOBLIN_FOLLOW_DX = 190; // stays roughly this far ahead of the player
  const GOBLIN_FOLLOW_DY = 130; // and this far above
  const GOBLIN_CHASE_EASE = 0.04; // how quickly it eases toward its target spot each frame
  const GOBLIN_THROW_COOLDOWN_MIN = 90, GOBLIN_THROW_COOLDOWN_MAX = 160;
  const PUMPKIN_SPEED = 5.5;
  const PUMPKIN_R = 7;
  const PUMPKIN_DAMAGE = 2;
  const SCORE_PER_GOBLIN = 50; // flat, regardless of how it's defeated (kick or web-stun + contact)

  const DEBUG = false;
  /* ==================== end config ==================== */

  // Bright, happy daytime palette — bold primary colors on a clear blue
  // sky fading to a warm sunny horizon, matching the mid-century modern
  // look the rest of the site's games use.
  const COLORS = {
    skyTop: "#5EC1F0", skyBottom: "#FBE79A",
    farBuildings: "#8FCFE0", nearBuildings: "#F2A65A",
    street: "#D8CDBA",
    rooftop: "#F6C945", rooftopTrim: "#E0982E",
    obstacle: "#9CA3AF",
    hero: "#E5484D", heroTrim: "#2851E3", heroMask: "#1A1A22",
    web: "#FFFFFF",
    goon: "#3A3F5C", goonGun: "#22263A", goonStunned: "#B8B4C0",
    rpgGoon: "#6B2FA0", rpgLauncher: "#3D2247",
    goblin: "#4CAF50", goblinDark: "#1B5E20",
    hoverboard: "#5C3A21", hoverboardGlow: "#9B6FD6",
    bullet: "#F6A93B", rocket: "#FF6B35", pumpkin: "#FF7A1A",
    alert: "#FF2D55",
    hpFull: "#E5484D", hpEmpty: "#E4DCC8",
    scoreText: "#1F2430"
  };

  let canvas, ctx, overlay, overlayInner, controlToggle;
  let player, platforms, obstacles, goons, webShots, goonBullets, tumbles, explosions;
  let goblin, goblinSpawnTimer; // goblin is null when none is currently active
  let scrollSpeed, score, frame, running, over, started, animId;
  let genCursorX; // screen-x out to which platforms/gaps have already been generated

  // Control scheme — WASD-style (A/D web-shooters, W jump, S kick) or
  // arrow keys (Left/Right web-shooters, Up jump, Down kick), swapped via
  // the on-page toggle and remembered across visits. Everything else keys
  // off e.code, so the rest of the game only ever reads the mapping,
  // never a hardcoded key.
  const CONTROL_SCHEME_KEY = "webrunner-control-scheme";
  let controlScheme = localStorage.getItem(CONTROL_SCHEME_KEY) === "arrows" ? "arrows" : "wasd";
  // Space always fires (shoot()); it isn't part of either scheme since
  // it's a neutral key neither layout otherwise uses.
  function controlKeys(){
    return controlScheme === "arrows"
      ? { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", kick: "ArrowDown", shoot: "Space" }
      : { left: "KeyA", right: "KeyD", jump: "KeyW", kick: "KeyS", shoot: "Space" };
  }

  /* ---------------- account / shop state ---------------- */
  // Login mirrors Doom Scroller's name+password pattern (see
  // showLoginOverlay()/attemptLogin()) — kept in memory only, never
  // written to localStorage, so it clears on reload same as Doom's.
  // Guests get the exact same bestScore/techPoints/shopLevels state,
  // just persisted to localStorage instead of the Sheet (see
  // loadGuestSave()/saveGuestState()) — never synced or shared, same
  // "this device only" deal every guest mode on this site already makes.
  // These live outside resetState() on purpose: they're account-level,
  // carried across every run, not per-run state.
  const GUEST_SAVE_KEY = "webrunner-guest-save";
  let wrName, wrPassword, wrGuestMode, wrLoginComplete;
  let wrBestScore = 0, wrTechPoints = 0;
  let wrShopLevels = { webShooter: 0, regen: 0 };

  function hasWebShooterUpgrade(){ return wrShopLevels.webShooter >= 1; }
  function regenUpgradeLevel(){ return wrShopLevels.regen || 0; }
  function effectiveRegenInterval(){
    return REGEN_INTERVAL_FRAMES / Math.pow(REGEN_UPGRADE_MULTIPLIER, regenUpgradeLevel());
  }
  function regenUpgradeCost(){
    return REGEN_UPGRADE_BASE_COST * (regenUpgradeLevel() + 1);
  }

  // "ws:0,regen:3" — a compact, hand-editable string (same idea as
  // Walter's progress save) so future shop items don't need new Sheet
  // columns, just another key:value pair here.
  function parseShopLevels(str){
    const levels = { webShooter: 0, regen: 0 };
    String(str || "").split(",").forEach(pair => {
      const [key, val] = pair.split(":");
      if (key === "ws") levels.webShooter = clamp(Number(val) || 0, 0, 1);
      if (key === "regen") levels.regen = clamp(Number(val) || 0, 0, REGEN_UPGRADE_MAX_LEVEL);
    });
    return levels;
  }
  function shopLevelsToString(levels){
    return "ws:" + (levels.webShooter || 0) + ",regen:" + (levels.regen || 0);
  }

  function loadGuestSave(){
    const fallback = { bestScore: 0, techPoints: 0, shopLevels: { webShooter: 0, regen: 0 } };
    try{
      const raw = localStorage.getItem(GUEST_SAVE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        bestScore: Number(parsed.bestScore) || 0,
        techPoints: Number(parsed.techPoints) || 0,
        shopLevels: parseShopLevels(parsed.shopLevels)
      };
    }catch(err){
      return fallback; // corrupted/unreadable save — start fresh rather than crash
    }
  }
  function saveGuestState(){
    localStorage.setItem(GUEST_SAVE_KEY, JSON.stringify({
      bestScore: wrBestScore, techPoints: wrTechPoints, shopLevels: shopLevelsToString(wrShopLevels)
    }));
  }

  function resetState(){
    player = {
      x: PLAYER_X_BASE, y: GROUND_Y - 90 - PLAYER_H, vy: 0, vx: 0,
      mode: "airborne", // "running" | "airborne" | "swinging" | "kicking" | "dead"
      hp: PLAYER_MAX_HP,
      invulnFrames: 0,
      regenDelay: 0, regenTimer: 0,
      obstacleContactFrames: 0,
      hand: {
        left:  { cooldown: 0 },
        right: { cooldown: 0 }
      },
      swingHand: null, anchorX: 0, anchorY: 0, ropeLen: 0, angle: 0, angularVel: 0,
      kickCooldown: 0, kickFrames: 0, kickTargetGoon: null,
      ragdoll: null
    };
    platforms = [];
    obstacles = [];
    goons = [];
    webShots = [];
    goonBullets = [];
    tumbles = [];
    explosions = [];
    goblin = null;
    goblinSpawnTimer = GOBLIN_SPAWN_CHECK_INTERVAL_FRAMES;
    scrollSpeed = SCROLL_START;
    score = 0;
    frame = 0;
    running = false;
    over = false;

    // Seed a safe starting rooftop right under the player so the run
    // doesn't open with an instant fall.
    genCursorX = 0;
    platforms.push({ x: 40, y: GROUND_Y - 90, w: 260 });
    genCursorX = 300;
    while (genCursorX < CANVAS_W + 300) generateNextSpan();
  }

  /* ---------------- helpers ---------------- */
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function randBetween(lo, hi){ return lo + Math.random() * (hi - lo); }
  function rectOverlap(x1,y1,w1,h1,x2,y2,w2,h2){
    return x1 < x2+w2 && x1+w1 > x2 && y1 < y2+h2 && y1+h1 > y2;
  }
  // Direction+speed from one point to another — used for web shots and
  // goon bullets alike, exactly like Doom Scroller's aimAt(): aimed at
  // wherever the target actually is the instant it fires, no homing.
  function aimAt(fromX, fromY, toX, toY, speed){
    const dx = toX - fromX, dy = toY - fromY;
    const dist = Math.max(1, Math.hypot(dx, dy));
    return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
  }
  function playerCenterY(){ return player.y + PLAYER_H/2; }

  /* ---------------- procedural rooftops ---------------- */
  function generateNextSpan(){
    const last = platforms[platforms.length - 1];
    const big = Math.random() < BIG_GAP_CHANCE;
    const gap = big ? randBetween(GAP_BIG_MIN, GAP_BIG_MAX) : randBetween(GAP_SMALL_MIN, GAP_SMALL_MAX);

    const prevY = last.y;
    const minY = Math.max(ROOFTOP_MIN_Y, prevY - ROOFTOP_MAX_STEP);
    const maxY = Math.min(ROOFTOP_MAX_Y, prevY + ROOFTOP_MAX_STEP);
    const nextY = randBetween(minY, maxY);
    const w = randBetween(PLATFORM_MIN_W, PLATFORM_MAX_W);
    const x = last.x + last.w + gap;

    const plat = { x, y: nextY, w };
    platforms.push(plat);
    genCursorX = x + w;

    if (Math.random() < OBSTACLE_CHANCE){
      const availableSpan = w - 2 * OBSTACLE_EDGE_MARGIN;
      // Hard ceiling on how many obstacles could possibly fit at
      // OBSTACLE_W each without a slot ever shrinking below the
      // obstacle's own width — the jitter below can't go negative (and
      // so can't spill into the margin or the next slot) as long as
      // count never exceeds this.
      const hardMaxCount = Math.floor(availableSpan / OBSTACLE_W);
      if (hardMaxCount >= 1){
        const softMax = Math.max(1, Math.min(OBSTACLE_MAX_COUNT, hardMaxCount, Math.floor(availableSpan / (OBSTACLE_W + OBSTACLE_MIN_GAP)) + 1));
        const count = 1 + Math.floor(Math.random() * softMax);
        const slotW = availableSpan / count;
        const jitterRange = slotW - OBSTACLE_W; // always >= 0 since count <= hardMaxCount
        for (let i = 0; i < count; i++){
          const slotStart = x + OBSTACLE_EDGE_MARGIN + i * slotW;
          const ox = slotStart + Math.random() * jitterRange;
          obstacles.push({ x: ox, y: nextY - OBSTACLE_H, w: OBSTACLE_W, h: OBSTACLE_H });
        }
      }
    }
    if (Math.random() < GOON_SPAWN_CHANCE && w > 80){
      const type = Math.random() < RPG_GOON_CHANCE ? "rpg" : "gun";
      const cooldownMin = type === "rpg" ? RPG_FIRE_COOLDOWN_MIN : GOON_FIRE_COOLDOWN_MIN;
      const cooldownMax = type === "rpg" ? RPG_FIRE_COOLDOWN_MAX : GOON_FIRE_COOLDOWN_MAX;
      goons.push({
        x: x + w * 0.6, y: nextY - GOON_H, w: GOON_W, h: GOON_H,
        alive: true, stunFrames: 0, type,
        fireCooldown: randBetween(cooldownMin, cooldownMax)
      });
    }
  }

  function updateGeneration(){
    while (genCursorX < CANVAS_W + 300) generateNextSpan();
  }

  /* ---------------- player ---------------- */
  function currentPlatformUnder(){
    // The rooftop (if any) whose x-range currently contains the player's
    // horizontal center — used for landing/standing checks.
    const cx = player.x + PLAYER_W/2;
    for (const p of platforms){
      if (cx >= p.x && cx <= p.x + p.w) return p;
    }
    return null;
  }

  function updateHandCooldowns(){
    if (player.hand.left.cooldown > 0) player.hand.left.cooldown--;
    if (player.hand.right.cooldown > 0) player.hand.right.cooldown--;
  }

  // Swinging always works, comic-Spider-Man style — no city anchor point
  // to find or be in range of, the web just shoots up into the skyline.
  // The attach point is a "virtual" spot fixed on screen (not relative to
  // the player's own x) so the auto-scroll can't outrun it mid-swing and
  // drag the player backward; it then scrolls with the world like
  // everything else (see updateSwing()) rather than staying nailed to one
  // world position. Each hand anchors to a different screen-x — left
  // pulls backward, right pulls forward — so alternating them gives a
  // real back-and-forth swing instead of both arms doing the same thing.
  // Triggers instantly on keydown (see initGame()) — player.swingHand is
  // the single source of truth for which hand, if any, is busy holding
  // the rope, so there's no separate "is this hand active" flag to keep
  // in sync with it.
  function attemptSwingAttach(side){
    if (player.mode === "dead" || player.mode === "swinging") return;
    if (player.hand[side].cooldown > 0) return;
    player.mode = "swinging";
    player.swingHand = side;
    player.anchorX = CANVAS_W * (side === "left" ? SWING_ANCHOR_X_FRACTION_LEFT : SWING_ANCHOR_X_FRACTION_RIGHT);
    player.anchorY = player.y - SWING_VIRTUAL_HEIGHT;
    const dx = player.x - player.anchorX, dy = player.y - player.anchorY;
    player.ropeLen = Math.max(30, Math.hypot(dx, dy));
    player.angle = Math.atan2(dx, dy); // 0 = hanging straight down
    // Carry existing momentum into the swing as initial angular velocity
    // rather than snapping to a dead stop, so grabbing mid-arc feels smooth.
    player.angularVel = clamp((player.vx * Math.cos(player.angle) - player.vy * Math.sin(player.angle)) / player.ropeLen, -0.09, 0.09);
  }

  // Player position while swinging is anchor + (sin θ, cos θ)*ropeLen, so
  // its velocity (the tangent to the arc) is ropeLen*θ' * (cos θ, -sin θ).
  // Releasing mid-upswing should launch you up and onward, not down —
  // this is the sign that actually makes that true.
  function releaseSwing(){
    const cosA = Math.cos(player.angle), sinA = Math.sin(player.angle);
    player.vx = player.angularVel * player.ropeLen * cosA;
    player.vy = -player.angularVel * player.ropeLen * sinA;
    player.mode = "airborne";
    player.hand[player.swingHand].cooldown = WEB_HAND_COOLDOWN_FRAMES;
    player.swingHand = null;
  }

  function updateSwing(){
    player.anchorX -= scrollSpeed; // the attach point is part of the world, scrolls with it like everything else

    // Auto-climb: the web reels itself in a little every frame, no key
    // needed — a straight proportional radius decay, not real conserved
    // angular momentum (which would also spin you faster) — simple and
    // readable beats "physically exact" here, same call as the ragdoll's.
    player.ropeLen = Math.max(SWING_MIN_ROPE, player.ropeLen * (1 - SWING_AUTO_CLIMB_RATE));

    const angAccel = -(GRAVITY / player.ropeLen) * Math.sin(player.angle);
    player.angularVel += angAccel;
    player.angularVel *= SWING_DAMPING;
    player.angle += player.angularVel;
    player.x = player.anchorX + Math.sin(player.angle) * player.ropeLen;
    player.y = player.anchorY + Math.cos(player.angle) * player.ropeLen;
  }

  // Nearest still-alive goon ahead of the player within range — unlike
  // nearestGoonTarget() (web shots, which skip already-stunned goons
  // since they don't need re-stunning), the kick works on ANY alive
  // goon, stunned or not, so it can finish an armed one outright. The
  // goblin (same {x,y,w,h,alive} shape as a goon) is a valid target too.
  function nearestAliveGoonAhead(maxDist){
    let best = null, bestDist = Infinity;
    for (const g of goons){
      if (!g.alive) continue;
      const gx = g.x + g.w/2, gy = g.y + g.h/2;
      if (gx < player.x) continue;
      const d = Math.hypot(gx - (player.x + PLAYER_W/2), gy - playerCenterY());
      if (d <= maxDist && d < bestDist){ best = g; bestDist = d; }
    }
    if (goblin && goblin.alive){
      const gx = goblin.x + goblin.w/2, gy = goblin.y + goblin.h/2;
      if (gx >= player.x){
        const d = Math.hypot(gx - (player.x + PLAYER_W/2), gy - playerCenterY());
        if (d <= maxDist && d < bestDist){ best = goblin; bestDist = d; }
      }
    }
    return best;
  }

  // Flying kick — locks onto the nearest goon ahead and reuses the
  // swing's anchor+rope setup with the goon as the anchor, but see
  // updateKick() for the part that makes it a kick and not a swing.
  function attemptFlyingKick(){
    if (player.mode === "dead" || player.mode === "kicking") return;
    if (player.kickCooldown > 0) return;
    const target = nearestAliveGoonAhead(KICK_RANGE);
    if (!target) return;
    if (player.mode === "swinging") releaseSwing();
    player.mode = "kicking";
    player.kickFrames = 0;
    player.kickTargetGoon = target;
    player.anchorX = target.x + target.w/2;
    player.anchorY = target.y + target.h/2;
    const dx = (player.x + PLAYER_W/2) - player.anchorX, dy = playerCenterY() - player.anchorY;
    player.ropeLen = Math.max(1, Math.hypot(dx, dy));
    player.angle = Math.atan2(dx, dy);
  }

  // The goon is the anchor point and the rope "climbs" at 100% speed
  // instead of the swing's slow auto-climb rate — it collapses to the
  // anchor in a single frame rather than reeling in gradually, so the
  // kick closes the whole gap in one beat. The kicking pose then holds
  // for a short recovery window (see drawPlayer()) so the move still
  // reads as an animated attack, not a teleport.
  function updateKick(){
    player.kickFrames++;
    player.anchorX -= scrollSpeed; // the anchor is part of the world too, same as a normal swing anchor
    player.ropeLen = Math.max(0, player.ropeLen * (1 - KICK_CLOSE_RATE));
    player.x = player.anchorX + Math.sin(player.angle) * player.ropeLen - PLAYER_W/2;
    player.y = player.anchorY + Math.cos(player.angle) * player.ropeLen - PLAYER_H/2;

    if (player.ropeLen <= 0.5 && player.kickTargetGoon){
      const g = player.kickTargetGoon;
      if (g.alive){
        g.alive = false;
        score += g.type === "goblin" ? SCORE_PER_GOBLIN : SCORE_PER_KICK;
        spawnGoonRagdoll(g);
      }
      player.kickTargetGoon = null;
    }

    if (player.kickFrames >= KICK_RECOVERY_FRAMES){
      player.mode = "airborne";
      player.vx = 0; player.vy = 0;
      player.kickTargetGoon = null;
      player.kickCooldown = KICK_COOLDOWN_FRAMES;
    }
  }

  // Without the Web Shooter Auto-Targeting upgrade, a shot fires in a
  // fixed direction — up-and-back for the left hand, up-and-forward for
  // the right, same angle the old no-target fallback always used — so
  // landing a hit takes real aim. With it, shots auto-track the nearest
  // un-stunned goon in either direction (see nearestGoonTarget()).
  function fireWebShot(side){
    const originX = player.x + (side === "left" ? 2 : PLAYER_W - 2);
    const originY = player.y + PLAYER_H * 0.3;
    let t;
    if (hasWebShooterUpgrade()){
      const target = nearestGoonTarget();
      t = target ? { x: target.x + target.w/2, y: target.y + target.h/2 } : { x: originX + 300, y: originY - 40 };
    } else {
      t = { x: originX + (side === "left" ? -300 : 300), y: originY - 40 };
    }
    const v = aimAt(originX, originY, t.x, t.y, WEB_SHOT_SPEED);
    webShots.push({ x: originX, y: originY, vx: v.vx, vy: v.vy, r: 4 });
  }

  // Nearest un-stunned goon in either direction — ahead or behind — so a
  // web shot can hit whichever is actually closest, not just whatever's
  // in front. aimAt() already points the shot the right way regardless
  // of which side the target is on.
  function nearestGoonTarget(){
    let best = null, bestDist = Infinity;
    for (const g of goons){
      if (!g.alive || g.stunFrames > 0) continue;
      const d = Math.abs((g.x + g.w/2) - (player.x + PLAYER_W/2));
      if (d < bestDist){ best = g; bestDist = d; }
    }
    return best;
  }

  // Space fires whichever hands are actually free — skips a hand that's
  // currently the one holding the swing rope, and each hand still
  // respects its own cooldown independently, so it's not a full reset
  // of both at once if only one just fired or just let go of a swing.
  function fireBothHands(){
    if (player.mode === "dead") return;
    ["left","right"].forEach(side => {
      if (side === player.swingHand) return;
      const h = player.hand[side];
      if (h.cooldown > 0) return;
      fireWebShot(side);
      h.cooldown = WEB_HAND_COOLDOWN_FRAMES;
    });
  }

  function jump(){
    if (player.mode === "running"){
      player.vy = JUMP_VELOCITY;
      player.mode = "airborne";
    }
  }

  function takeHit(amount){
    if (player.invulnFrames > 0 || player.mode === "dead") return;
    player.hp -= amount || 1;
    player.invulnFrames = INVULN_AFTER_HIT_FRAMES;
    player.regenDelay = REGEN_DELAY_FRAMES; // getting hit resets the out-of-combat clock, not just full HP
    player.regenTimer = 0;
    if (player.hp <= 0) startRagdoll();
  }

  // The obstacle drip — deliberately NOT gated by invulnFrames like
  // takeHit(), since that gate exists to give breathing room after a
  // one-off burst hit, and gating a continuous drip the same way would
  // just turn it back into "one hit then free," exactly what this is
  // replacing. It still sets invulnFrames afterward (a brief flicker and
  // a short mercy window against other damage sources), just doesn't
  // check it on the way in. Rate-limited by OBSTACLE_DAMAGE_INTERVAL_FRAMES
  // in the caller, not by this.
  function applyObstacleDamage(){
    if (player.mode === "dead") return;
    player.hp -= 1;
    player.invulnFrames = INVULN_AFTER_HIT_FRAMES;
    player.regenDelay = REGEN_DELAY_FRAMES;
    player.regenTimer = 0;
    if (player.hp <= 0) startRagdoll();
  }

  // A slow trickle back toward full HP after a stretch of not getting
  // hit — see REGEN_DELAY_FRAMES/effectiveRegenInterval() for the
  // pacing. The interval shrinks with each Health Regen Boost purchase
  // (see effectiveRegenInterval()), so a leveled-up account heals
  // faster without the base rate itself ever changing.
  function updateRegen(){
    if (player.hp >= PLAYER_MAX_HP){ player.regenTimer = 0; return; }
    if (player.regenDelay > 0){ player.regenDelay--; return; }
    player.regenTimer++;
    if (player.regenTimer >= effectiveRegenInterval()){
      player.hp++;
      player.regenTimer = 0;
    }
  }

  function startRagdoll(){
    player.mode = "dead";
    player.ragdoll = [
      { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H * 0.55, vx: player.vx * 0.4 - 1, vy: -4, rot: 0, rotVel: -0.12 },
      { x: player.x, y: player.y + PLAYER_H * 0.5, w: PLAYER_W * 0.8, h: PLAYER_H * 0.5, vx: player.vx * 0.4 + 1, vy: -2, rot: 0, rotVel: 0.09 }
    ];
  }

  function updateRagdoll(){
    player.ragdoll.forEach(seg => {
      seg.vy += RAGDOLL_GRAVITY;
      seg.x += seg.vx; seg.y += seg.vy;
      seg.rot += seg.rotVel;
    });
    if (player.ragdoll.every(seg => seg.y > CANVAS_H + 60)) endGame();
  }

  function spawnGoonTumble(g){
    tumbles.push({ x: g.x, y: g.y, w: g.w, h: g.h, vx: scrollSpeed * -0.3 + randBetween(-1,1), vy: -3, rot: 0, rotVel: randBetween(-0.15,0.15), life: 50, color: g.type === "rpg" ? COLORS.rpgLauncher : COLORS.goonStunned });
  }

  // A two-piece ragdoll for a goon finished off by a flying kick — same
  // lightweight independently-tumbling-segments approach as the player's
  // own death ragdoll (startRagdoll()), just pushed through the existing
  // tumbles list instead of a separate system.
  function spawnGoonRagdoll(g){
    const color = g.type === "rpg" ? COLORS.rpgGoon : g.type === "goblin" ? COLORS.goblin : COLORS.goon;
    const kickDir = player.x <= g.x ? 1 : -1; // which way the kick sent it flying
    tumbles.push(
      { x: g.x, y: g.y, w: g.w, h: g.h * 0.55, vx: kickDir * 3 + randBetween(-1,1), vy: -5, rot: 0, rotVel: randBetween(-0.2,-0.1), life: 55, color },
      { x: g.x, y: g.y + g.h * 0.5, w: g.w * 0.8, h: g.h * 0.5, vx: kickDir * 2 + randBetween(-1,1), vy: -3, rot: 0, rotVel: randBetween(0.1,0.2), life: 55, color }
    );
  }

  function updatePlayer(){
    if (player.mode === "dead"){ updateRagdoll(); return; }

    updateHandCooldowns();
    if (player.kickCooldown > 0) player.kickCooldown--;

    if (player.mode === "swinging"){
      updateSwing();
    } else if (player.mode === "kicking"){
      updateKick();
    } else {
      player.vy += GRAVITY;
      player.y += player.vy;
      player.x += player.vx;
      player.vx *= 0.95;
      // gentle re-centering toward the resting screen position — no
      // direct left/right input, so this keeps the camera sane after a
      // swing or jump without a jarring snap
      player.x += (PLAYER_X_BASE - player.x) * 0.03;

      const under = currentPlatformUnder();
      if (under && player.vy >= 0 && player.y + PLAYER_H >= under.y && player.y + PLAYER_H <= under.y + 26){
        player.y = under.y - PLAYER_H;
        player.vy = 0;
        player.vx = 0;
        player.mode = "running";
      } else if (player.mode === "running") {
        player.mode = "airborne"; // walked off an edge
      }
    }

    if (player.y > GROUND_Y){ startRagdoll(); return; }

    if (player.invulnFrames > 0) player.invulnFrames--;
    updateRegen();

    // Rooftop obstacles — only threaten while actually running along the
    // roof (jump clear and there's no overlap at all). Contact blocks
    // forward progress instead of an instant hit: the obstacle stops
    // dead against the player's leading edge rather than scrolling
    // through them, so standing there is a choice, not an ambush. Only
    // sustained contact costs HP, at OBSTACLE_DAMAGE_INTERVAL_FRAMES per
    // tick — jump away before the first tick and it costs nothing.
    if (player.mode === "running"){
      let touchingObstacle = false;
      obstacles.forEach(o => {
        if (rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, o.x, o.y, o.w, o.h)){
          touchingObstacle = true;
          o.x = player.x + PLAYER_W;
        }
      });
      if (touchingObstacle){
        player.obstacleContactFrames++;
        if (player.obstacleContactFrames >= OBSTACLE_DAMAGE_INTERVAL_FRAMES){
          applyObstacleDamage();
          player.obstacleContactFrames = 0;
        }
      } else {
        player.obstacleContactFrames = 0;
      }
    }
  }

  function updateGoons(){
    goons.forEach(g => {
      g.x -= scrollSpeed;
      if (!g.alive) return;
      if (g.stunFrames > 0){
        g.stunFrames--;
        return;
      }
      const dist = g.x - player.x;
      if (dist > 0 && dist < GOON_RANGE){
        g.fireCooldown--;
        if (g.fireCooldown <= 0){
          if (g.type === "rpg"){
            const v = aimAt(g.x, g.y + g.h/2, player.x + PLAYER_W/2, playerCenterY(), ROCKET_SPEED);
            goonBullets.push({ x: g.x, y: g.y + g.h/2, vx: v.vx, vy: v.vy, r: ROCKET_R, type: "rocket" });
            g.fireCooldown = randBetween(RPG_FIRE_COOLDOWN_MIN, RPG_FIRE_COOLDOWN_MAX);
          } else {
            const v = aimAt(g.x, g.y + g.h/2, player.x + PLAYER_W/2, playerCenterY(), GOON_BULLET_SPEED);
            goonBullets.push({ x: g.x, y: g.y + g.h/2, vx: v.vx, vy: v.vy, r: 4, type: "bullet" });
            g.fireCooldown = randBetween(GOON_FIRE_COOLDOWN_MIN, GOON_FIRE_COOLDOWN_MAX);
          }
        }
      }
    });
    goons = goons.filter(g => g.x + g.w > -30);
  }

  function updateWebShots(){
    webShots.forEach(p => { p.x += p.vx; p.y += p.vy; });
    webShots = webShots.filter(p => {
      // Shots can now travel either direction (a target behind the player
      // aims backward), so both screen edges need a cleanup bound, not
      // just the right one.
      if (p.x < -30 || p.x > CANVAS_W + 20 || p.y < -30 || p.y > CANVAS_H + 30) return false;
      for (const g of goons){
        if (g.alive && g.stunFrames <= 0 && rectOverlap(p.x-p.r, p.y-p.r, p.r*2, p.r*2, g.x, g.y, g.w, g.h)){
          g.stunFrames = STUN_DURATION_FRAMES;
          return false;
        }
      }
      if (goblin && goblin.alive && goblin.stunFrames <= 0 && rectOverlap(p.x-p.r, p.y-p.r, p.r*2, p.r*2, goblin.x, goblin.y, goblin.w, goblin.h)){
        goblin.stunFrames = STUN_DURATION_FRAMES;
        return false;
      }
      return true;
    });
  }

  function spawnExplosion(x, y){
    explosions.push({ x, y, life: EXPLOSION_LIFE_FRAMES, maxLife: EXPLOSION_LIFE_FRAMES });
  }

  function updateExplosions(){
    explosions.forEach(e => e.life--);
    explosions = explosions.filter(e => e.life > 0);
  }

  function updateGoonBullets(){
    goonBullets.forEach(p => { p.x += p.vx; p.y += p.vy; });
    goonBullets = goonBullets.filter(p => {
      if (p.x < -30 || p.x > CANVAS_W + 30 || p.y < -30 || p.y > CANVAS_H + 30) return false;
      if (player.mode !== "dead" && rectOverlap(p.x-p.r, p.y-p.r, p.r*2, p.r*2, player.x, player.y, PLAYER_W, PLAYER_H)){
        if (p.type === "rocket"){
          spawnExplosion(p.x, p.y);
          takeHit(ROCKET_DAMAGE);
        } else if (p.type === "pumpkin"){
          spawnExplosion(p.x, p.y);
          takeHit(PUMPKIN_DAMAGE);
        } else {
          takeHit(GOON_BULLET_DAMAGE);
        }
        return false;
      }
      return true;
    });
  }

  // Contact resolution: a stunned goon touched by the player (running,
  // airborne, or mid-swing — any state) goes down; an armed goon hurts
  // the player instead. This is what makes stunning-then-touching a goon
  // meaningful — swinging *into* a webbed one is the payoff.
  function checkGoonContact(){
    if (player.mode === "dead") return;
    goons.forEach(g => {
      if (!g.alive) return;
      if (!rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, g.x, g.y, g.w, g.h)) return;
      if (g.stunFrames > 0){
        g.alive = false;
        score += SCORE_PER_GOON;
        spawnGoonTumble(g);
      } else {
        takeHit();
      }
    });
    goons = goons.filter(g => g.alive);
  }

  // Same idea as checkGoonContact() but for the singular goblin — a
  // ragdoll tumble on defeat (like a kick kill) rather than the plainer
  // regular-goon tumble, since it's the rarer/tougher enemy.
  function checkGoblinContact(){
    if (!goblin || !goblin.alive || player.mode === "dead") return;
    if (!rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, goblin.x, goblin.y, goblin.w, goblin.h)) return;
    if (goblin.stunFrames > 0){
      goblin.alive = false;
      score += SCORE_PER_GOBLIN;
      spawnGoonRagdoll(goblin);
      goblin = null;
    } else {
      takeHit();
    }
  }

  // Rolls for the flying goblin to appear — rare, and only one at a
  // time. Once it exists it doesn't despawn on its own; see
  // updateGoblin()/checkGoblinContact() for how the encounter ends.
  function trySpawnGoblin(){
    if (goblin || frame < GOBLIN_MIN_SPAWN_FRAME) return;
    goblinSpawnTimer--;
    if (goblinSpawnTimer > 0) return;
    goblinSpawnTimer = GOBLIN_SPAWN_CHECK_INTERVAL_FRAMES;
    if (Math.random() < GOBLIN_SPAWN_CHANCE){
      goblin = {
        x: player.x + GOBLIN_FOLLOW_DX, y: player.y - GOBLIN_FOLLOW_DY,
        w: GOBLIN_W, h: GOBLIN_H, type: "goblin", alive: true, stunFrames: 0,
        throwCooldown: randBetween(GOBLIN_THROW_COOLDOWN_MIN, GOBLIN_THROW_COOLDOWN_MAX)
      };
    }
  }

  // Doesn't scroll with the world like everything else — it actively
  // eases toward a spot near the player every frame (a weaving hover,
  // not a straight line), which is what makes it read as "following"
  // rather than just another scrolling hazard.
  function updateGoblin(){
    if (!goblin) return;
    if (!goblin.alive){ goblin = null; return; }
    if (player.mode === "dead") return; // freeze in place once the run's over

    const targetX = player.x + GOBLIN_FOLLOW_DX + Math.sin(frame * 0.02) * 40;
    const targetY = player.y - GOBLIN_FOLLOW_DY + Math.sin(frame * 0.035) * 22;
    goblin.x += (targetX - goblin.x) * GOBLIN_CHASE_EASE;
    goblin.y += (targetY - goblin.y) * GOBLIN_CHASE_EASE;

    if (goblin.stunFrames > 0){ goblin.stunFrames--; return; }

    goblin.throwCooldown--;
    if (goblin.throwCooldown <= 0){
      const v = aimAt(goblin.x, goblin.y + goblin.h/2, player.x + PLAYER_W/2, playerCenterY(), PUMPKIN_SPEED);
      goonBullets.push({ x: goblin.x, y: goblin.y + goblin.h/2, vx: v.vx, vy: v.vy, r: PUMPKIN_R, type: "pumpkin" });
      goblin.throwCooldown = randBetween(GOBLIN_THROW_COOLDOWN_MIN, GOBLIN_THROW_COOLDOWN_MAX);
    }
  }

  // Whether any currently-airborne enemy projectile (bullet, rocket, or
  // pumpkin — anything in goonBullets) is on a straight-line path that
  // will pass close to the player soon, using the true closest-approach
  // point along its trajectory rather than just its current distance —
  // a fast projectile can be far away right now and still be a fraction
  // of a second from a hit. Drives the head-squiggle alert in drawPlayer().
  function isThreatIncoming(){
    const cx = player.x + PLAYER_W/2, cy = playerCenterY();
    for (const p of goonBullets){
      const speedSq = p.vx*p.vx + p.vy*p.vy;
      if (speedSq < 0.0001) continue;
      const t = -((p.x - cx)*p.vx + (p.y - cy)*p.vy) / speedSq;
      if (t < 0 || t > ALERT_LOOKAHEAD_FRAMES) continue;
      const closestX = p.x + p.vx*t, closestY = p.y + p.vy*t;
      if (Math.hypot(closestX - cx, closestY - cy) < ALERT_RADIUS) return true;
    }
    return false;
  }

  function updateTumbles(){
    tumbles.forEach(t => {
      t.vy += RAGDOLL_GRAVITY;
      t.x += t.vx; t.y += t.vy; t.rot += t.rotVel; t.life--;
    });
    tumbles = tumbles.filter(t => t.life > 0);
  }

  /* ---------------- update ---------------- */
  function update(){
    frame++;
    scrollSpeed = Math.min(SCROLL_MAX, SCROLL_START + frame * SCROLL_RAMP);
    // Score only comes from takedowns now (SCORE_PER_KICK/SCORE_PER_GOON/
    // SCORE_PER_GOBLIN) — no more passive points for distance survived.

    platforms.forEach(p => p.x -= scrollSpeed);
    obstacles.forEach(o => o.x -= scrollSpeed);
    platforms = platforms.filter(p => p.x + p.w > -30);
    obstacles = obstacles.filter(o => o.x + o.w > -30);
    genCursorX -= scrollSpeed; // the generation cursor is screen-space too — it has to scroll with
    // everything else, or it goes stale after the first batch and the world stops generating
    updateGeneration();

    updatePlayer();
    updateGoons();
    trySpawnGoblin();
    updateGoblin();
    updateWebShots();
    updateGoonBullets();
    checkGoonContact();
    checkGoblinContact();
    updateTumbles();
    updateExplosions();
  }

  /* ---------------- draw ---------------- */
  function drawBackground(){
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, COLORS.skyTop);
    grad.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

    ctx.fillStyle = "#FDF3C4";
    ctx.beginPath();
    ctx.arc(CANVAS_W - 90, 60, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.farBuildings;
    for (let i = -1; i < 8; i++){
      const bx = ((i * 110) - (frame * 0.4) % 110);
      ctx.fillRect(bx, 90 + (i % 3) * 18, 70, GROUND_Y - (90 + (i % 3) * 18));
    }
    ctx.fillStyle = COLORS.nearBuildings;
    for (let i = -1; i < 6; i++){
      const bx = ((i * 160) - (frame * 0.9) % 160);
      ctx.fillRect(bx, 150 + (i % 2) * 30, 90, GROUND_Y - (150 + (i % 2) * 30));
    }

    ctx.fillStyle = COLORS.street;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  }

  function drawPlatforms(){
    ctx.fillStyle = COLORS.rooftop;
    platforms.forEach(p => {
      ctx.fillRect(p.x, p.y, p.w, GROUND_Y - p.y);
      ctx.fillStyle = COLORS.rooftopTrim;
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.fillStyle = COLORS.rooftop;
    });
    ctx.fillStyle = COLORS.obstacle;
    obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));
  }

  // Shared mini-humanoid rig: head circle + torso rect + two arm rects +
  // two leg rects, each limb pivoting from its shoulder/hip point via
  // save/translate/rotate — used for both the player and goons so they
  // read as actual figures instead of flat blobs, while staying pure
  // canvas primitives (no images, no physics/animation library). Angle 0
  // means a limb hanging straight down; positive angles swing it toward
  // -x (screen-back), negative toward +x (screen-front), which is all
  // callers need to fake a running/aiming/dangling gait.
  function drawHumanoidFigure(x, y, w, h, headColor, torsoColor, limbColor, armAngleL, armAngleR, legAngleL, legAngleR){
    const headR = w * 0.30;
    const headCX = x + w/2, headCY = y + headR + 1;
    const torsoTop = headCY + headR * 0.85;
    const torsoBottom = y + h * 0.68;
    const torsoW = w * 0.56;
    const shoulderY = torsoTop + (torsoBottom - torsoTop) * 0.12;
    const hipY = torsoBottom;
    const legLen = (y + h) - hipY;
    const armLen = (torsoBottom - torsoTop) * 0.88;
    const limbThick = w * 0.22;

    function limb(pivotX, pivotY, len, angle){
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(angle);
      ctx.fillStyle = limbColor;
      ctx.fillRect(-limbThick/2, 0, limbThick, len);
      ctx.restore();
    }

    // Back-side limbs first, then the torso, then front-side limbs on
    // top of it, then the head — cheap layering that reads correctly
    // without any real depth sorting.
    limb(x + w*0.28, hipY, legLen, legAngleL);
    limb(x + w*0.28, shoulderY, armLen, armAngleL);

    ctx.fillStyle = torsoColor;
    ctx.fillRect(x + (w - torsoW)/2, torsoTop, torsoW, torsoBottom - torsoTop);

    limb(x + w*0.72, hipY, legLen, legAngleR);
    limb(x + w*0.72, shoulderY, armLen, armAngleR);

    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(headCX, headCY, headR, 0, Math.PI*2);
    ctx.fill();

    return { headCX, headCY, headR };
  }

  function drawGoons(){
    goons.forEach(g => {
      const stunned = g.stunFrames > 0;
      const isRpg = g.type === "rpg";
      const bodyColor = stunned ? COLORS.goonStunned : (isRpg ? COLORS.rpgGoon : COLORS.goon);
      let armAngleL, armAngleR, legAngleL, legAngleR;
      if (stunned){
        // Limp and dangling — no animation, sells "webbed in place".
        armAngleL = 0.35; armAngleR = -0.25;
        legAngleL = 0.15; legAngleR = -0.12;
      } else {
        const sway = Math.sin(frame * 0.06 + g.x * 0.01) * 0.12;
        armAngleL = -0.9; // weapon arm, raised toward the player
        armAngleR = sway;
        legAngleL = sway * 0.5;
        legAngleR = -sway * 0.5;
      }
      drawHumanoidFigure(g.x, g.y, g.w, g.h, COLORS.goonGun, bodyColor, bodyColor, armAngleL, armAngleR, legAngleL, legAngleR);
      if (!stunned){
        if (isRpg){
          ctx.fillStyle = COLORS.rpgLauncher;
          ctx.fillRect(g.x - 15, g.y + g.h*0.38, 17, 7);
        } else {
          ctx.fillStyle = COLORS.goonGun;
          ctx.fillRect(g.x - 8, g.y + g.h*0.45, 10, 4);
        }
      } else {
        ctx.strokeStyle = COLORS.web;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++){
          ctx.beginPath();
          ctx.moveTo(g.x, g.y + i*10);
          ctx.lineTo(g.x + g.w, g.y + g.h - i*8);
          ctx.stroke();
        }
      }
    });
  }

  function drawGoblin(){
    if (!goblin) return;
    const bob = Math.sin(frame * 0.1) * 3;
    const by = goblin.y + bob;

    ctx.fillStyle = COLORS.hoverboardGlow;
    ctx.fillRect(goblin.x - 2, by + goblin.h + 3, goblin.w + 4, 2);
    ctx.fillStyle = COLORS.hoverboard;
    ctx.fillRect(goblin.x - 4, by + goblin.h - 2, goblin.w + 8, 5);

    const stunned = goblin.stunFrames > 0;
    const bodyColor = stunned ? COLORS.goonStunned : COLORS.goblin;
    let armAngleL, armAngleR, legAngleL, legAngleR;
    if (stunned){
      armAngleL = 0.3; armAngleR = -0.3;
      legAngleL = 0.2; legAngleR = -0.2;
    } else {
      const sway = Math.sin(frame * 0.08) * 0.2;
      armAngleL = sway; armAngleR = -0.8 + sway * 0.3; // one arm cocked back, winding up to throw
      legAngleL = 0.15; legAngleR = -0.15;
    }
    drawHumanoidFigure(goblin.x, by, goblin.w, goblin.h, COLORS.goblinDark, bodyColor, bodyColor, armAngleL, armAngleR, legAngleL, legAngleR);

    if (stunned){
      ctx.strokeStyle = COLORS.web;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++){
        ctx.beginPath();
        ctx.moveTo(goblin.x, by + i*10);
        ctx.lineTo(goblin.x + goblin.w, by + goblin.h - i*8);
        ctx.stroke();
      }
    }
  }

  function drawWebLine(){
    if (player.mode !== "swinging") return;
    ctx.strokeStyle = COLORS.web;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.anchorX, player.anchorY);
    ctx.lineTo(player.x + PLAYER_W/2, player.y + 6);
    ctx.stroke();
  }

  function drawPlayer(){
    if (player.mode === "dead"){
      player.ragdoll.forEach(seg => {
        ctx.save();
        ctx.translate(seg.x + seg.w/2, seg.y + seg.h/2);
        ctx.rotate(seg.rot);
        ctx.fillStyle = COLORS.hero;
        ctx.fillRect(-seg.w/2, -seg.h/2, seg.w, seg.h);
        ctx.restore();
      });
      return;
    }

    const flicker = player.invulnFrames > 0 && Math.floor(frame/4) % 2 === 0;
    if (flicker) ctx.globalAlpha = 0.4;

    let armAngleL, armAngleR, legAngleL, legAngleR;
    if (player.mode === "kicking"){
      // Front (right) leg driven straight out, back leg tucked, both arms
      // swept back for momentum — reads as a mid-air flying kick.
      legAngleR = -1.3; legAngleL = 0.5;
      armAngleL = 0.6; armAngleR = 0.7;
    } else if (player.mode === "swinging"){
      const sway = Math.sin(frame * 0.2) * 0.12;
      const reach = 2.6;       // swinging hand reaches up toward the web
      const trail = 0.45 + sway; // everything else trails behind in the wind
      if (player.swingHand === "left"){ armAngleL = reach; armAngleR = trail; }
      else { armAngleR = reach; armAngleL = trail; }
      legAngleL = trail * 0.7;
      legAngleR = trail * 0.7 + sway;
    } else if (player.mode === "running"){
      const phase = frame * 0.35;
      legAngleL = Math.sin(phase) * 0.6;
      legAngleR = Math.sin(phase + Math.PI) * 0.6;
      armAngleL = Math.sin(phase + Math.PI) * 0.45;
      armAngleR = Math.sin(phase) * 0.45;
    } else { // airborne — a simple fixed tucked pose
      legAngleL = -0.4; legAngleR = 0.35;
      armAngleL = -0.7; armAngleR = 0.5;
    }

    const head = drawHumanoidFigure(player.x, player.y, PLAYER_W, PLAYER_H, COLORS.heroMask, COLORS.hero, COLORS.heroTrim, armAngleL, armAngleR, legAngleL, legAngleR);

    if (flicker) ctx.globalAlpha = 1;

    if (isThreatIncoming()) drawAlertSquiggles(head.headCX, head.headCY - head.headR);
  }

  // Three small wavy lines fanning above the head, animated over time —
  // a "spidey sense" cue that only appears while isThreatIncoming() is
  // true, so it reads as a real warning rather than constant decoration.
  function drawAlertSquiggles(headCX, headTopY){
    ctx.strokeStyle = COLORS.alert;
    ctx.lineWidth = 2;
    const wiggle = frame * 0.5;
    [-11, 0, 11].forEach((dx, i) => {
      const baseX = headCX + dx, baseY = headTopY - 4;
      ctx.beginPath();
      for (let s = 0; s <= 4; s++){
        const t = s / 4;
        const px = baseX + Math.sin(wiggle + i * 2 + t * Math.PI * 2) * 3;
        const py = baseY - t * 12;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  }

  function drawProjectiles(){
    ctx.fillStyle = COLORS.web;
    webShots.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); });
    goonBullets.forEach(p => {
      ctx.fillStyle = p.type === "rocket" ? COLORS.rocket : p.type === "pumpkin" ? COLORS.pumpkin : COLORS.bullet;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    });
  }

  function drawExplosions(){
    explosions.forEach(e => {
      const t = 1 - e.life / e.maxLife;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = COLORS.rocket;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 + t * 22, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawTumbles(){
    tumbles.forEach(t => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life / 20);
      ctx.translate(t.x + t.w/2, t.y + t.h/2);
      ctx.rotate(t.rot);
      ctx.fillStyle = t.color;
      ctx.fillRect(-t.w/2, -t.h/2, t.w, t.h);
      ctx.restore();
    });
  }

  function drawHud(){
    ctx.fillStyle = COLORS.scoreText;
    ctx.font = "700 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("SCORE " + Math.floor(score), CANVAS_W - 12, 24);

    ctx.textAlign = "left";
    for (let i = 0; i < PLAYER_MAX_HP; i++){
      ctx.fillStyle = i < player.hp ? COLORS.hpFull : COLORS.hpEmpty;
      ctx.fillRect(12 + i * 16, 12, 12, 12);
      // The next pip fills in gradually as regen progresses, so there's a
      // visible readout of how close the next HP tick actually is.
      if (i === player.hp && player.regenDelay <= 0 && player.hp < PLAYER_MAX_HP){
        const t = clamp(player.regenTimer / effectiveRegenInterval(), 0, 1);
        ctx.fillStyle = COLORS.hpFull;
        ctx.fillRect(12 + i * 16, 12, 12 * t, 12);
      }
    }
  }

  function draw(){
    drawBackground();
    drawPlatforms();
    drawGoons();
    drawGoblin();
    drawWebLine();
    drawTumbles();
    drawPlayer();
    drawProjectiles();
    drawExplosions();
    drawHud();
  }

  /* ---------------- loop ---------------- */
  function loop(){
    if (!running) return;
    try{ update(); }catch(err){ console.error("[Arachnid Guy] update() threw:", err); }
    try{ draw(); }catch(err){ console.error("[Arachnid Guy] draw() threw:", err); }
    if (running) animId = requestAnimationFrame(loop);
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
    try{ draw(); }catch(err){ console.error("[Arachnid Guy] final draw() threw:", err); }
    showGameOverOverlay();
  }

  /* ---------------- overlay UI ---------------- */
  function hideOverlay(){ overlay.style.display = "none"; }

  function currentBestDisplay(){ return wrBestScore || 0; }

  /* ---------------- login ---------------- */
  // Mirrors Doom Scroller's name+password login exactly (see doom.js's
  // showLoginOverlay()/attemptDoomLogin()) — same flow, same guest
  // fallback, just its own Sheet tab/account so Arachnid Guy progress
  // never collides with Doom Scroller's.
  function showLoginOverlay(){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Arachnid Guy</h3>
      <p>Log in with a name and password to save your high score across
      sessions, see it on the leaderboard above, and bank Tech Points
      toward shop upgrades. First time using a name creates a fresh save
      automatically — just remember the password.</p>
      <div class="form-row"><input type="text" id="webrunner-login-name" placeholder="Name" maxlength="40"></div>
      <div class="form-row"><input type="password" id="webrunner-login-password" placeholder="Password" maxlength="40"></div>
      <button type="button" class="btn" id="webrunner-login-btn">Log In &amp; Play</button>
      <p class="form-note" id="webrunner-login-status"></p>
      <p class="form-note" style="margin-top:6px;"><a href="#" id="webrunner-guest-link" style="color:inherit;text-decoration:underline;">Play without saving</a></p>
    `;

    if (typeof getStoredName === "function"){
      const stored = getStoredName();
      if (stored) document.getElementById("webrunner-login-name").value = stored;
    }

    document.getElementById("webrunner-login-btn").addEventListener("click", attemptLogin);
    document.getElementById("webrunner-guest-link").addEventListener("click", (e) => {
      e.preventDefault();
      enterGuestMode();
      showStartOverlay();
    });
  }

  function enterGuestMode(){
    wrGuestMode = true;
    wrName = null;
    wrPassword = null;
    const saved = loadGuestSave();
    wrBestScore = saved.bestScore;
    wrTechPoints = saved.techPoints;
    wrShopLevels = saved.shopLevels;
    wrLoginComplete = true;
  }

  async function attemptLogin(){
    const nameInput = document.getElementById("webrunner-login-name");
    const passwordInput = document.getElementById("webrunner-login-password");
    const statusEl = document.getElementById("webrunner-login-status");
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
      enterGuestMode();
      setTimeout(showStartOverlay, 1200);
      return;
    }

    const btn = document.getElementById("webrunner-login-btn");
    btn.disabled = true;
    statusEl.textContent = "Logging in…";
    statusEl.style.color = "var(--muted)";

    try{
      const res = await apiPost({ action: "webrunnerLogin", name, password });
      if (!res.success){
        statusEl.textContent = res.error || "Couldn't log in — try again.";
        statusEl.style.color = "var(--red)";
        btn.disabled = false;
        return;
      }
      wrGuestMode = false;
      wrName = name;
      wrPassword = password;
      wrBestScore = Number(res.bestScore) || 0;
      wrTechPoints = Number(res.techPoints) || 0;
      wrShopLevels = parseShopLevels(res.shopLevels);
      if (typeof setStoredName === "function") setStoredName(name);
      wrLoginComplete = true;
      showStartOverlay();
    }catch(err){
      console.error("[Arachnid Guy] login failed", err);
      statusEl.textContent = "Couldn't reach the server — check your connection and try again.";
      statusEl.style.color = "var(--red)";
      btn.disabled = false;
    }
  }

  function showStartOverlay(){
    overlay.style.display = "flex";
    const whoLine = wrGuestMode
      ? `<p style="font-size:0.78rem;opacity:0.7;">Playing as guest — score and Tech Points stay on this device only.</p>`
      : `<p style="font-size:0.78rem;opacity:0.7;">Logged in as ${escapeHTML(wrName)}.</p>`;
    overlayInner.innerHTML = `
      <h3>Arachnid Guy</h3>
      <p>Swing, run, and jump across the rooftops. W to jump, S for a
      flying kick — locks onto the nearest threat ahead and takes it
      down outright, stunned or not. Space fires both web-shooters at
      once; A and D each grab onto a swing the instant you press them
      (left pulls you back, right pulls you forward — alternate for
      momentum), and the web auto-climbs while you hang on for extra
      height. Swing or run into a webbed goon to take them down; an
      armed one hurts you back, and some carry rocket launchers that hit
      twice as hard. Watch for a wiggly squiggle over your head — it
      means a shot is about to come close. A rare flying goblin on a
      hoverboard occasionally shows up and chases you with exploding
      pumpkins until one of you goes down. Rooftop obstacles block your
      way rather than hurting you outright — jump them, or standing in
      one costs HP slowly the longer you stay put. HP trickles back on
      its own if you stay unhit for a while — slow, so it's not a
      crutch. Prefer arrow keys? Flip the toggle below the game.</p>
      ${whoLine}
      <p style="font-size:0.82rem;opacity:0.85;">Your best: ${currentBestDisplay()} &middot; Tech Points: ${wrTechPoints}</p>
      <button type="button" class="btn" id="webrunner-play-btn">Play</button>
      <button type="button" class="btn light" id="webrunner-shop-btn">Shop</button>
    `;
    document.getElementById("webrunner-play-btn").addEventListener("click", startGame);
    document.getElementById("webrunner-shop-btn").addEventListener("click", showShopOverlay);
  }

  /* ---------------- shop ---------------- */
  // Permanent, account-bound upgrades — see the CONFIG comments above
  // WEB_SHOOTER_UPGRADE_COST for what each one actually does. Purchases
  // save immediately (Sheet for a logged-in account, localStorage for a
  // guest), no separate confirm step.
  function showShopOverlay(){
    overlay.style.display = "flex";
    const owned = hasWebShooterUpgrade();
    const wsCost = WEB_SHOOTER_UPGRADE_COST;
    const wsAffordable = !owned && wrTechPoints >= wsCost;
    const regenLevel = regenUpgradeLevel();
    const regenMaxed = regenLevel >= REGEN_UPGRADE_MAX_LEVEL;
    const regenCost = regenUpgradeCost();
    const regenAffordable = !regenMaxed && wrTechPoints >= regenCost;

    overlayInner.innerHTML = `
      <h3>Shop</h3>
      <p style="font-size:0.82rem;opacity:0.85;">Tech Points: ${wrTechPoints}</p>
      <div class="form-row">
        <p style="margin:0 0 4px;font-weight:700;">Web Shooter: Auto-Targeting</p>
        <p style="font-size:0.78rem;opacity:0.8;margin:0 0 8px;">Web shots auto-track the nearest goon instead of firing straight. One-time unlock.</p>
        <button type="button" class="btn" id="webrunner-buy-ws-btn" ${owned || !wsAffordable ? "disabled" : ""}>${owned ? "Owned" : "Buy (" + wsCost + " Tech Points)"}</button>
      </div>
      <div class="form-row">
        <p style="margin:0 0 4px;font-weight:700;">Health Regen Boost — level ${regenLevel}/${REGEN_UPGRADE_MAX_LEVEL}</p>
        <p style="font-size:0.78rem;opacity:0.8;margin:0 0 8px;">Each purchase makes HP regen 1.2&times; faster.</p>
        <button type="button" class="btn" id="webrunner-buy-regen-btn" ${regenMaxed || !regenAffordable ? "disabled" : ""}>${regenMaxed ? "Maxed out" : "Buy (" + regenCost + " Tech Points)"}</button>
      </div>
      <p class="form-note" id="webrunner-shop-status"></p>
      <button type="button" class="btn light" id="webrunner-shop-back-btn">Back</button>
    `;

    document.getElementById("webrunner-buy-ws-btn").addEventListener("click", () => buyUpgrade("webShooter"));
    document.getElementById("webrunner-buy-regen-btn").addEventListener("click", () => buyUpgrade("regen"));
    document.getElementById("webrunner-shop-back-btn").addEventListener("click", showStartOverlay);
  }

  async function buyUpgrade(key){
    let cost;
    if (key === "webShooter"){
      if (hasWebShooterUpgrade()) return;
      cost = WEB_SHOOTER_UPGRADE_COST;
    } else {
      if (regenUpgradeLevel() >= REGEN_UPGRADE_MAX_LEVEL) return;
      cost = regenUpgradeCost();
    }
    if (wrTechPoints < cost) return;

    const nextLevels = Object.assign({}, wrShopLevels);
    if (key === "webShooter") nextLevels.webShooter = 1;
    else nextLevels.regen = (nextLevels.regen || 0) + 1;
    const nextTechPoints = wrTechPoints - cost;

    if (wrGuestMode || !isConfigured()){
      wrTechPoints = nextTechPoints;
      wrShopLevels = nextLevels;
      saveGuestState();
      showShopOverlay();
      return;
    }

    const statusEl = document.getElementById("webrunner-shop-status");
    if (statusEl){ statusEl.textContent = "Saving…"; statusEl.style.color = "var(--muted)"; }
    try{
      const res = await apiPost({
        action: "webrunnerSaveShop", name: wrName, password: wrPassword,
        techPoints: nextTechPoints, shopLevels: shopLevelsToString(nextLevels)
      });
      if (!res.success){
        if (statusEl){ statusEl.textContent = res.error || "Couldn't save that purchase — try again."; statusEl.style.color = "var(--red)"; }
        return;
      }
      wrTechPoints = res.techPoints != null ? Number(res.techPoints) : nextTechPoints;
      wrShopLevels = parseShopLevels(res.shopLevels != null ? res.shopLevels : shopLevelsToString(nextLevels));
      showShopOverlay();
    }catch(err){
      console.error("[Arachnid Guy] couldn't save shop purchase:", err);
      if (statusEl){ statusEl.textContent = "Couldn't reach the server — check your connection and try again."; statusEl.style.color = "var(--red)"; }
    }
  }

  /* ---------------- game over / score save ---------------- */
  // Every run's score is added to the Tech Points balance unconditionally
  // (not just new bests) — see the CONFIG comment above
  // WEB_SHOOTER_UPGRADE_COST. bestScore (the leaderboard stat) only ever
  // goes up, same as Doom Scroller's.
  async function saveRun(finalScore){
    const isNewBest = finalScore > (wrBestScore || 0);
    if (wrGuestMode || !isConfigured()){
      if (isNewBest) wrBestScore = finalScore;
      wrTechPoints += finalScore;
      saveGuestState();
      return { isNewBest, saved: false };
    }
    try{
      const res = await apiPost({ action: "webrunnerSaveScore", name: wrName, password: wrPassword, score: finalScore });
      if (res && res.success){
        if (res.bestScore != null) wrBestScore = Number(res.bestScore);
        if (res.techPoints != null) wrTechPoints = Number(res.techPoints);
        if (typeof renderLeaderboard === "function") renderLeaderboard();
        return { isNewBest, saved: true };
      }
      console.error("[Arachnid Guy] webrunnerSaveScore rejected:", res && res.error);
      return { isNewBest, saved: false };
    }catch(err){
      console.error("[Arachnid Guy] couldn't save score to the Sheet:", err);
      return { isNewBest, saved: false };
    }
  }

  function showGameOverOverlay(){
    const finalScore = Math.floor(score);
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Web's Cut</h3>
      <p>Score: ${finalScore}</p>
      <p style="font-size:0.78rem;opacity:0.8;margin-top:-10px;" id="webrunner-best-line">Your best: ${currentBestDisplay()} &middot; Tech Points: ${wrTechPoints}</p>
      <p class="form-note" id="webrunner-save-status">Saving…</p>
      <button type="button" class="btn" id="webrunner-again-btn">Play Again</button>
      <button type="button" class="btn light" id="webrunner-shop-again-btn">Shop</button>
    `;
    document.getElementById("webrunner-again-btn").addEventListener("click", startGame);
    document.getElementById("webrunner-shop-again-btn").addEventListener("click", showShopOverlay);

    const statusEl = document.getElementById("webrunner-save-status");
    const bestLineEl = document.getElementById("webrunner-best-line");

    saveRun(finalScore).then((result) => {
      if (bestLineEl) bestLineEl.textContent = "Your best: " + currentBestDisplay() + " · Tech Points: " + wrTechPoints;
      if (!statusEl) return;
      if (result.saved){
        statusEl.textContent = (result.isNewBest ? "New best! " : "") + "+" + finalScore + " Tech Points saved.";
        statusEl.style.color = "var(--green)";
      }else if (wrGuestMode || !isConfigured()){
        statusEl.textContent = "+" + finalScore + " Tech Points (this device only — log in to save for real).";
        statusEl.style.color = "var(--muted)";
      }else{
        statusEl.textContent = "Couldn't save to the leaderboard — check your connection.";
        statusEl.style.color = "var(--red)";
      }
    });
  }

  /* ---------------- input ---------------- */
  // Drops any in-progress swing — used both when the canvas loses focus
  // and when the control scheme is swapped mid-game, since either one
  // can leave the player permanently "holding" a rope with no way left
  // to release it under the new mapping.
  function resetInputState(){
    if (player && player.swingHand) releaseSwing();
  }

  function initGame(){
    if (DEBUG) console.log("[Arachnid Guy] webrunner.js loaded");
    canvas = document.getElementById("webrunner-canvas");
    overlay = document.getElementById("webrunner-overlay");
    overlayInner = document.getElementById("webrunner-overlay-inner");
    controlToggle = document.getElementById("webrunner-control-scheme");
    if (!canvas || !overlay) return;

    ctx = canvas.getContext("2d");
    resetState();
    wrLoginComplete = false;
    draw();
    showLoginOverlay();

    if (controlToggle){
      controlToggle.checked = controlScheme === "arrows";
      controlToggle.addEventListener("change", () => {
        controlScheme = controlToggle.checked ? "arrows" : "wasd";
        localStorage.setItem(CONTROL_SCHEME_KEY, controlScheme);
        resetInputState();
      });
    }

    canvas.addEventListener("click", () => canvas.focus());
    canvas.addEventListener("blur", resetInputState);

    document.addEventListener("keydown", (e) => {
      if (document.activeElement !== canvas) return; // don't steal input meant for the other games on this page
      const keys = controlKeys();

      if (!started || over){
        if (!wrLoginComplete) return; // still on the login screen — its own button handles input
        if (e.code === keys.jump || e.code === keys.left || e.code === keys.right || e.code === keys.kick || e.code === keys.shoot){
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === keys.jump){
        e.preventDefault();
        if (!e.repeat) jump();
      } else if (e.code === keys.kick){
        e.preventDefault();
        if (!e.repeat) attemptFlyingKick();
      } else if (e.code === keys.shoot){
        e.preventDefault();
        if (!e.repeat) fireBothHands();
      } else if (e.code === keys.left || e.code === keys.right){
        e.preventDefault();
        if (!e.repeat) attemptSwingAttach(e.code === keys.left ? "left" : "right");
      }
    });

    document.addEventListener("keyup", (e) => {
      if (document.activeElement !== canvas) return;
      const keys = controlKeys();
      if (e.code === keys.left && player.swingHand === "left") releaseSwing();
      else if (e.code === keys.right && player.swingHand === "right") releaseSwing();
    });
  }

  document.addEventListener("DOMContentLoaded", initGame);
})();
