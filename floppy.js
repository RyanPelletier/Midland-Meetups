/* =====================================================================
   FLOPPY SWORDS
   A 2D ragdoll sword-fighting prototype — single-player only for now.
   You drag your fighter around by the head with the mouse/touch; the
   rest of the body (and the weapon in its hand) trails behind on real
   ragdoll physics (Verlet integration + distance constraints), so how a
   weapon swings depends on its own weight and reach, not just yours.
   This build exists to nail down the physics feel before any of the
   realtime multiplayer/database work — there's no opponent or win
   condition yet, just a draggable fighter and four weapons to try.

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
   see WEAPONS below and satisfyStick().

   TUNING: every number worth playing with lives in CONFIG below.
   ===================================================================== */

(function(){

  const DEBUG = false;

  /* ==================== CONFIG ==================== */
  const CANVAS_W = 640;
  const CANVAS_H = 420;
  const GROUND_Y = 380;

  const GRAVITY = 0.6;
  const DAMPING = 0.992; // per-frame velocity carry-over (air resistance)
  const CONSTRAINT_ITERATIONS = 8; // higher = stiffer/more accurate bones, more expensive
  const GROUND_BOUNCE = 0.22; // fraction of impact speed returned on landing
  const GROUND_FRICTION = 0.985; // per-iteration horizontal speed retained while grounded
  const WALL_BOUNCE = 0.3;

  const HEAD_R = 14;
  const JOINT_R = 6; // hands/feet/elbows/knees, for ground/wall collision only

  // Body proportions (px) — same for every weapon, only the weapon
  // itself (reach + weight) changes between them.
  const NECK_LEN = 26, SPINE_LEN = 60;
  const UPPER_ARM_LEN = 34, LOWER_ARM_LEN = 34;
  const UPPER_LEG_LEN = 44, LOWER_LEG_LEN = 44;

  const COLORS = {
    sky: "#5EC1F0",
    ground: "#D8CDBA",
    groundTrim: "#B9AC8E",
    skin: "#E8A466",
    suit: "#2851E3",
    suitDark: "#1B3AA8",
    head: "#E8A466",
    dragRing: "#FFFFFF"
  };

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

  /* ==================== state ==================== */
  let canvas, ctx, overlay, overlayInner;
  let fighter = null; // { particles, sticks, head, handR, weaponTip, weaponKey }
  let started = false, animId = null;
  let dragging = false, dragX = 0, dragY = 0;

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

  /* ==================== fighter rig ==================== */
  // Places a particle at a fixed distance from an anchor with a given
  // horizontal offset, computing the vertical drop so the stick's rest
  // length is exact from frame one (no first-frame "pop" while the
  // solver corrects an approximate idle pose).
  function dropFrom(anchor, len, dx){
    const dy = Math.sqrt(Math.max(0, len * len - dx * dx));
    return { x: anchor.x + dx, y: anchor.y + dy };
  }

  function createFighter(weaponKey){
    const weapon = WEAPONS[weaponKey] || WEAPONS.sword;
    const baseX = CANVAS_W / 2;

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

    const kneeL = makeParticle(baseX - 12, kneeY, 1);
    const footL = makeParticle(baseX - 12, footY, 1);
    const kneeR = makeParticle(baseX + 12, kneeY, 1);
    const footR = makeParticle(baseX + 12, footY, 1);

    const weaponTip = makeParticle(handR.x + 6, handR.y + weapon.reach * 0.98, weapon.invMass, 5);

    const particles = [head, torso, hip, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR, weaponTip];
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
      makeStick(handR, weaponTip, weapon.reach)
    ];

    return { particles, sticks, head, torso, hip, elbowL, handL, elbowR, handR,
      kneeL, footL, kneeR, footR, weaponTip, weaponKey };
  }

  /* ==================== simulation step ==================== */
  function stepPhysics(){
    const f = fighter;
    if (!f) return;

    for (const p of f.particles){
      if (p === f.head && dragging) continue; // handled below with an exact pin
      const vx = (p.x - p.px) * DAMPING;
      const vy = (p.y - p.py) * DAMPING + GRAVITY;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy;
    }
    if (dragging){
      f.head.px = f.head.x; f.head.py = f.head.y;
      f.head.x = dragX; f.head.y = dragY;
    }
    f.head.pinned = dragging;

    for (let i = 0; i < CONSTRAINT_ITERATIONS; i++){
      for (const s of f.sticks) satisfyStick(s);
      for (const p of f.particles){
        if (p === f.head && dragging) continue; // let the drag go anywhere, even past the floor/walls
        clampToBounds(p);
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
      ctx.fillStyle = weapon.headColor;
      ctx.beginPath();
      ctx.moveTo(tip.x - ux * 16, tip.y - uy * 16);
      ctx.lineTo(tip.x + px * 16 + ux * 4, tip.y + py * 16 + uy * 4);
      ctx.lineTo(tip.x + ux * 10, tip.y + uy * 10);
      ctx.lineTo(tip.x - px * 10, tip.y - py * 10);
      ctx.closePath();
      ctx.fill();
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

  function draw(){
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = COLORS.groundTrim;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 4);

    if (!fighter) return;
    const f = fighter;

    drawBone(f.hip, f.kneeL, 11, COLORS.suitDark);
    drawBone(f.kneeL, f.footL, 10, COLORS.suitDark);
    drawBone(f.hip, f.kneeR, 11, COLORS.suit);
    drawBone(f.kneeR, f.footR, 10, COLORS.suit);

    drawBone(f.head, f.torso, 14, COLORS.suit);
    drawBone(f.torso, f.hip, 18, COLORS.suit);

    drawBone(f.torso, f.elbowL, 10, COLORS.suitDark);
    drawBone(f.elbowL, f.handL, 9, COLORS.suitDark);
    drawBone(f.torso, f.elbowR, 10, COLORS.suit);
    drawBone(f.elbowR, f.handR, 9, COLORS.suit);

    if (dragging){
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

    drawWeapon(f.handR, f.weaponTip, WEAPONS[f.weaponKey]);
  }

  function loop(){
    stepPhysics();
    draw();
    animId = requestAnimationFrame(loop);
  }

  /* ==================== pointer input ==================== */
  function pointerPos(e){
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * CANVAS_W,
      y: (e.clientY - rect.top) / rect.height * CANVAS_H
    };
  }

  function onPointerDown(e){
    if (!started || !fighter) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const pos = pointerPos(e);
    dragging = true;
    dragX = pos.x; dragY = pos.y;
  }
  function onPointerMove(e){
    if (!dragging) return;
    e.preventDefault();
    const pos = pointerPos(e);
    dragX = pos.x; dragY = pos.y;
  }
  function onPointerUp(e){
    if (!dragging) return;
    dragging = false;
    if (fighter) fighter.head.pinned = false;
  }

  /* ==================== overlays ==================== */
  function showWeaponSelectOverlay(){
    overlay.style.display = "flex";
    overlayInner.innerHTML = `
      <h3>Floppy Swords</h3>
      <p>Drag your fighter around by the head — the rest of the body
      (and whatever's in its hand) trails behind on ragdoll physics.
      Pick a weapon: heavier ones lag further behind your swing and are
      harder to redirect, lighter ones keep up almost instantly. No
      opponent yet — this build is just for testing how each one feels
      to swing.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        ${WEAPON_ORDER.map(key => `<button type="button" class="btn" data-weapon="${key}">${WEAPONS[key].label}</button>`).join("")}
      </div>
    `;
    WEAPON_ORDER.forEach(key => {
      overlayInner.querySelector(`[data-weapon="${key}"]`).addEventListener("click", () => startFight(key));
    });
  }

  function startFight(weaponKey){
    fighter = createFighter(weaponKey);
    started = true;
    dragging = false;
    overlay.style.display = "none";
    if (!animId) loop();
  }

  /* ==================== bootstrap ==================== */
  function initGame(){
    if (DEBUG) console.log("[Floppy Swords] floppy.js loaded");
    canvas = document.getElementById("floppy-canvas");
    overlay = document.getElementById("floppy-overlay");
    overlayInner = document.getElementById("floppy-overlay-inner");
    if (!canvas || !overlay) return;

    ctx = canvas.getContext("2d");
    draw();
    showWeaponSelectOverlay();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const changeBtn = document.getElementById("floppy-change-weapon-btn");
    if (changeBtn) changeBtn.addEventListener("click", () => {
      started = false;
      dragging = false;
      showWeaponSelectOverlay();
    });
    const resetBtn = document.getElementById("floppy-reset-btn");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      if (fighter) fighter = createFighter(fighter.weaponKey);
      dragging = false;
    });
  }

  document.addEventListener("DOMContentLoaded", initGame);

})();
