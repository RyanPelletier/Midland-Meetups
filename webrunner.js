/* =====================================================================
   ARACHNID GUY
   A 2D right-scrolling rooftop parkour game — swing, run, and jump
   across the city on a dual web-shooter system while webbing up and
   taking down goons. Same mid-century modern visual language as the
   other games on this page, own file, own canvas.

   Shares this page with Wizards & Waffles, And So I Wander, and Doom
   Scroller, so this file only reacts to input when its OWN canvas is
   focused — see initGame() at the bottom (same guard those three use).

   CONTROLS: Space to jump. KeyA/KeyD are the left/right web-shooters —
   tap either to fire a web shot (stuns a goon on a hit), hold either to
   swing — always works, comic-Spider-Man style, no city anchor point
   needed. Release to let go, launching you onward with whatever
   momentum you built up. The web auto-climbs while you swing, so you
   gain height without any extra input.

   No score saving yet — this is a first pass at the game itself; a
   Sheet-backed leaderboard entry is planned for later, same as Doom
   Scroller's.

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
  const SCROLL_MAX = 6.0;
  const SCROLL_RAMP = 0.0005; // per frame

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

  // Dual web-shooters — tap fires a shot, hold (past the threshold)
  // starts a swing. Swinging always works, comic-Spider-Man style — no
  // city anchor point to find, it just shoots up into the skyline. See
  // updateHands() / attemptSwingAttach().
  const HAND_TAP_THRESHOLD_FRAMES = 9;
  const WEB_SHOT_SPEED = 10.5;
  const WEB_HAND_COOLDOWN_FRAMES = 20;
  const SWING_VIRTUAL_HEIGHT = 150; // how high above the anchor's screen-x the web's attach point sits
  const SWING_ANCHOR_X_FRACTION = 0.9; // anchor sits at this fraction of canvas width (10% in from the right edge) — fixed on screen, not tied to the player's position, so the auto-scroll can't outrun it and drag the player backward mid-swing
  const SWING_DAMPING = 0.999;
  const SWING_AUTO_CLIMB_RATE = 0.05; // fraction the rope shortens by, automatically, every frame while swinging
  const SWING_MIN_ROPE = 40;

  const GOON_W = 22, GOON_H = 34;
  const GOON_SPAWN_CHANCE = 0.5; // per eligible platform
  const GOON_FIRE_COOLDOWN_MIN = 70, GOON_FIRE_COOLDOWN_MAX = 140;
  const GOON_BULLET_SPEED = 6.5;
  const GOON_RANGE = 420;
  const STUN_DURATION_FRAMES = 150;
  const SCORE_PER_GOON = 40;

  const PLAYER_MAX_HP = 4;
  const INVULN_AFTER_HIT_FRAMES = 55;
  const RAGDOLL_GRAVITY = 0.5;

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
    bullet: "#F6A93B",
    hpFull: "#E5484D", hpEmpty: "#E4DCC8",
    scoreText: "#1F2430"
  };

  let canvas, ctx, overlay, overlayInner;
  let player, platforms, obstacles, goons, webShots, goonBullets, tumbles;
  let scrollSpeed, score, frame, running, over, started, animId;
  let genCursorX; // screen-x out to which platforms/gaps have already been generated
  const keysDown = {};

  function resetState(){
    player = {
      x: PLAYER_X_BASE, y: GROUND_Y - 90 - PLAYER_H, vy: 0, vx: 0,
      mode: "airborne", // "running" | "airborne" | "swinging" | "dead"
      hp: PLAYER_MAX_HP,
      invulnFrames: 0,
      hand: {
        left:  { holdFrames: 0, cooldown: 0, active: false },
        right: { holdFrames: 0, cooldown: 0, active: false }
      },
      swingHand: null, anchorX: 0, anchorY: 0, ropeLen: 0, angle: 0, angularVel: 0,
      ragdoll: null
    };
    platforms = [];
    obstacles = [];
    goons = [];
    webShots = [];
    goonBullets = [];
    tumbles = [];
    scrollSpeed = SCROLL_START;
    score = 0;
    frame = 0;
    running = false;
    over = false;
    for (const k in keysDown) delete keysDown[k];

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
      goons.push({
        x: x + w * 0.6, y: nextY - GOON_H, w: GOON_W, h: GOON_H,
        alive: true, stunFrames: 0,
        fireCooldown: randBetween(GOON_FIRE_COOLDOWN_MIN, GOON_FIRE_COOLDOWN_MAX)
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

  function updateHands(){
    ["left","right"].forEach(side => {
      const h = player.hand[side];
      if (h.cooldown > 0) h.cooldown--;
      const code = side === "left" ? "KeyA" : "KeyD";
      // Pause hold-tracking on the *other* hand once one is already
      // swinging — otherwise holding both at once leaves the second
      // hand's press stuck past the tap threshold, so releasing it
      // later fires nothing instead of a web shot.
      if (player.mode === "swinging" && player.swingHand !== side) return;
      if (keysDown[code] && h.cooldown <= 0 && player.mode !== "dead"){
        h.holdFrames++;
        if (!h.active && h.holdFrames >= HAND_TAP_THRESHOLD_FRAMES && player.mode !== "swinging"){
          attemptSwingAttach(side);
        }
      }
    });
  }

  // Swinging always works, comic-Spider-Man style — no city anchor point
  // to find or be in range of, the web just shoots up into the skyline.
  // The attach point is a "virtual" spot fixed at 10% in from the right
  // edge of the screen (not relative to the player's own x) so the
  // auto-scroll can't outrun it mid-swing and drag the player backward;
  // it then scrolls with the world like everything else (see
  // updateSwing()) rather than staying nailed to one world position.
  function attemptSwingAttach(side){
    if (player.mode === "dead") return;
    player.mode = "swinging";
    player.swingHand = side;
    player.hand[side].active = true;
    player.anchorX = CANVAS_W * SWING_ANCHOR_X_FRACTION;
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

  function fireWebShot(side){
    const originX = player.x + (side === "left" ? 2 : PLAYER_W - 2);
    const originY = player.y + PLAYER_H * 0.3;
    const target = nearestGoonTarget();
    const t = target ? { x: target.x + target.w/2, y: target.y + target.h/2 } : { x: originX + 300, y: originY - 40 };
    const v = aimAt(originX, originY, t.x, t.y, WEB_SHOT_SPEED);
    webShots.push({ x: originX, y: originY, vx: v.vx, vy: v.vy, r: 4 });
  }

  function nearestGoonTarget(){
    let best = null, bestDist = Infinity;
    for (const g of goons){
      if (!g.alive || g.stunFrames > 0) continue;
      if (g.x < player.x) continue;
      const d = g.x - player.x;
      if (d < bestDist){ best = g; bestDist = d; }
    }
    return best;
  }

  function releaseHand(side){
    const h = player.hand[side];
    if (h.active){
      // was the swinging hand — let go of the rope
      if (player.swingHand === side) releaseSwing();
      h.active = false;
    } else if (h.holdFrames > 0 && h.holdFrames < HAND_TAP_THRESHOLD_FRAMES){
      fireWebShot(side);
    }
    h.holdFrames = 0;
    h.cooldown = WEB_HAND_COOLDOWN_FRAMES;
  }

  function jump(){
    if (player.mode === "running"){
      player.vy = JUMP_VELOCITY;
      player.mode = "airborne";
    }
  }

  function takeHit(){
    if (player.invulnFrames > 0 || player.mode === "dead") return;
    player.hp--;
    player.invulnFrames = INVULN_AFTER_HIT_FRAMES;
    if (player.hp <= 0) startRagdoll();
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
    tumbles.push({ x: g.x, y: g.y, w: g.w, h: g.h, vx: scrollSpeed * -0.3 + randBetween(-1,1), vy: -3, rot: 0, rotVel: randBetween(-0.15,0.15), life: 50, color: COLORS.goonStunned });
  }

  function updatePlayer(){
    if (player.mode === "dead"){ updateRagdoll(); return; }

    updateHands();

    if (player.mode === "swinging"){
      updateSwing();
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

    // rooftop obstacles — only threaten while actually running along the roof
    if (player.mode === "running"){
      obstacles.forEach(o => {
        if (rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, o.x, o.y, o.w, o.h)) takeHit();
      });
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
          const v = aimAt(g.x, g.y + g.h/2, player.x + PLAYER_W/2, playerCenterY(), GOON_BULLET_SPEED);
          goonBullets.push({ x: g.x, y: g.y + g.h/2, vx: v.vx, vy: v.vy, r: 4 });
          g.fireCooldown = randBetween(GOON_FIRE_COOLDOWN_MIN, GOON_FIRE_COOLDOWN_MAX);
        }
      }
    });
    goons = goons.filter(g => g.x + g.w > -30);
  }

  function updateWebShots(){
    webShots.forEach(p => { p.x += p.vx; p.y += p.vy; });
    webShots = webShots.filter(p => {
      if (p.x > CANVAS_W + 20 || p.y < -30 || p.y > CANVAS_H + 30) return false;
      for (const g of goons){
        if (g.alive && g.stunFrames <= 0 && rectOverlap(p.x-p.r, p.y-p.r, p.r*2, p.r*2, g.x, g.y, g.w, g.h)){
          g.stunFrames = STUN_DURATION_FRAMES;
          return false;
        }
      }
      return true;
    });
  }

  function updateGoonBullets(){
    goonBullets.forEach(p => { p.x += p.vx; p.y += p.vy; });
    goonBullets = goonBullets.filter(p => {
      if (p.x < -30 || p.x > CANVAS_W + 30 || p.y < -30 || p.y > CANVAS_H + 30) return false;
      if (player.mode !== "dead" && rectOverlap(p.x-p.r, p.y-p.r, p.r*2, p.r*2, player.x, player.y, PLAYER_W, PLAYER_H)){
        takeHit();
        return false;
      }
      return true;
    });
  }

  // Contact resolution: a stunned goon touched by the player (running,
  // airborne, or mid-swing — any state) goes down; an armed goon hurts
  // the player instead. This is what makes the tap-to-stun/hold-to-swing
  // split meaningful — swinging *into* a webbed goon is the payoff.
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
    if (player.mode !== "dead") score += scrollSpeed * 0.05;

    platforms.forEach(p => p.x -= scrollSpeed);
    obstacles.forEach(o => o.x -= scrollSpeed);
    platforms = platforms.filter(p => p.x + p.w > -30);
    obstacles = obstacles.filter(o => o.x + o.w > -30);
    genCursorX -= scrollSpeed; // the generation cursor is screen-space too — it has to scroll with
    // everything else, or it goes stale after the first batch and the world stops generating
    updateGeneration();

    updatePlayer();
    updateGoons();
    updateWebShots();
    updateGoonBullets();
    checkGoonContact();
    updateTumbles();
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
  }

  function drawGoons(){
    goons.forEach(g => {
      const stunned = g.stunFrames > 0;
      const bodyColor = stunned ? COLORS.goonStunned : COLORS.goon;
      let armAngleL, armAngleR, legAngleL, legAngleR;
      if (stunned){
        // Limp and dangling — no animation, sells "webbed in place".
        armAngleL = 0.35; armAngleR = -0.25;
        legAngleL = 0.15; legAngleR = -0.12;
      } else {
        const sway = Math.sin(frame * 0.06 + g.x * 0.01) * 0.12;
        armAngleL = -0.9; // gun arm, raised toward the player
        armAngleR = sway;
        legAngleL = sway * 0.5;
        legAngleR = -sway * 0.5;
      }
      drawHumanoidFigure(g.x, g.y, g.w, g.h, COLORS.goonGun, bodyColor, bodyColor, armAngleL, armAngleR, legAngleL, legAngleR);
      if (!stunned){
        ctx.fillStyle = COLORS.goonGun;
        ctx.fillRect(g.x - 8, g.y + g.h*0.45, 10, 4);
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
    if (player.mode === "swinging"){
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

    drawHumanoidFigure(player.x, player.y, PLAYER_W, PLAYER_H, COLORS.heroMask, COLORS.hero, COLORS.heroTrim, armAngleL, armAngleR, legAngleL, legAngleR);

    if (flicker) ctx.globalAlpha = 1;
  }

  function drawProjectiles(){
    ctx.fillStyle = COLORS.web;
    webShots.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = COLORS.bullet;
    goonBullets.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); });
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
    }
  }

  function draw(){
    drawBackground();
    drawPlatforms();
    drawGoons();
    drawWebLine();
    drawTumbles();
    drawPlayer();
    drawProjectiles();
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

  function showStartOverlay(){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Arachnid Guy</h3>
      <p>Swing, run, and jump across the rooftops. Space to jump. A and D
      are your left and right web-shooters — tap either to fire a web
      shot (webs up a goon in place), hold either to swing — always
      works, no city anchor point needed, and the web auto-climbs while
      you hang on for extra height. Swing or run into a webbed goon to
      take them down; an armed one hurts you back.</p>
      <button type="button" class="btn" id="webrunner-play-btn">Play</button>
    `;
    document.getElementById("webrunner-play-btn").addEventListener("click", startGame);
  }

  function showGameOverOverlay(){
    const finalScore = Math.floor(score);
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Web's Cut</h3>
      <p>Score: ${finalScore}</p>
      <button type="button" class="btn" id="webrunner-again-btn">Play Again</button>
    `;
    document.getElementById("webrunner-again-btn").addEventListener("click", startGame);
  }

  /* ---------------- input ---------------- */
  function initGame(){
    if (DEBUG) console.log("[Arachnid Guy] webrunner.js loaded");
    canvas = document.getElementById("webrunner-canvas");
    overlay = document.getElementById("webrunner-overlay");
    overlayInner = document.getElementById("webrunner-overlay-inner");
    if (!canvas || !overlay) return;

    ctx = canvas.getContext("2d");
    resetState();
    draw();
    showStartOverlay();

    canvas.addEventListener("click", () => canvas.focus());
    canvas.addEventListener("blur", () => {
      for (const k in keysDown) delete keysDown[k];
      if (player){
        if (player.hand.left.active || player.hand.right.active){
          if (player.swingHand) releaseSwing();
          player.hand.left.active = false;
          player.hand.right.active = false;
        }
        player.hand.left.holdFrames = 0;
        player.hand.right.holdFrames = 0;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (document.activeElement !== canvas) return; // don't steal input meant for the other games on this page

      if (!started || over){
        if (e.code === "Space" || e.code === "KeyA" || e.code === "KeyD"){
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === "Space"){
        e.preventDefault();
        if (!e.repeat) jump();
      } else if (e.code === "KeyA" || e.code === "KeyD"){
        e.preventDefault();
        keysDown[e.code] = true;
      }
    });

    document.addEventListener("keyup", (e) => {
      if (document.activeElement !== canvas) return;
      if (e.code === "KeyA"){ keysDown.KeyA = false; releaseHand("left"); }
      else if (e.code === "KeyD"){ keysDown.KeyD = false; releaseHand("right"); }
    });
  }

  document.addEventListener("DOMContentLoaded", initGame);
})();
