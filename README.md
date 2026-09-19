# Midland Meetups — Bulletin Board

A website for posting upcoming events, event updates (rain delays,
cancellations, new locations), a "Happenings This Week" snapshot with
click-to-RSVP, an event submission form, "The Lore Letter" (a memory feed
with its own submission form), "The Squad" (a member directory with
profile submissions and photos), and a live group Chat. The site itself
is static HTML/CSS/JS hosted free on GitHub Pages. All the actual data —
events, memories, squad profiles, RSVPs, chat messages — lives in a
**Google Sheet**, read and written through a **Google Apps Script**
deployed as a web app. That means everyone sees the same live data, and
you can review submissions before they go public, all editable right in
a spreadsheet.

## How the pieces fit together

```
Your Google Sheet  <---->  Apps Script Web App  <---->  This website (GitHub Pages)
  (the database)         (the API in between)          (what people see/use)
```

- **The Sheet** has eight tabs: `Events`, `Memories`, `RSVPs`, `Squad`,
  `Chat`, `Scores`, `WalterProgress`, `DoomScores`. You can look at and
  hand-edit any of it any time.
- **The Apps Script** (`apps-script/Code.gs`) is code that lives *inside*
  that Sheet (via Extensions → Apps Script) and exposes it to the website
  through a URL. It also emails you when something needs review, and
  saves Squad photos to Google Drive.
- **The website** (everything else in this folder) calls that URL to load
  content and to save RSVPs, submissions, and chat messages.

## Part 1 — Set up the Google Sheet + Apps Script

1. Go to [sheets.google.com](https://sheets.google.com) and create a new,
   blank spreadsheet. Name it something like "Midland Meetups Data."
2. In that Sheet, go to **Extensions → Apps Script**. A new tab opens with
   a code editor.
3. Delete the placeholder `function myFunction() {}` code and paste in the
   entire contents of `apps-script/Code.gs` from this folder.
4. Save the project (the disk icon, or Ctrl/Cmd+S). Name it whatever you like.
5. In the toolbar, next to the "Run" button, there's a function picker
   dropdown — select **setup** and click **Run**.
6. The first time, Google will show an authorization prompt: click
   **Review permissions**, pick your account, click **Advanced**, then
   **Go to [project name] (unsafe)**, then **Allow**. (This warning shows
   up for any script you write yourself — it's just Google being cautious
   about scripts that touch your Sheets, Drive, and Gmail.)
7. Go back to the Sheet tab — you should now see eight tabs at the bottom:
   `Events`, `Memories`, `RSVPs`, `Squad`, `Chat`, `Scores`,
   `WalterProgress`, `DoomScores`, with headers and a couple of sample rows
   marked "(sample — delete me)".
8. Back in the Apps Script editor: **Deploy → New deployment**.
9. Click the gear icon next to "Select type" and choose **Web app**.
10. Set **Execute as** to "Me" and **Who has access** to **"Anyone"** —
    this is what lets the website reach it. (It does not give anyone
    access to your Sheet itself — only to the specific actions the script
    allows.)
11. Click **Deploy**. Copy the **Web app URL** it gives you
    (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

Keep that tab open — you'll need to come back and make a **new version**
any time you edit the script later (Deploy → Manage deployments → pencil
icon → New version → Deploy). Editing the code alone doesn't update the
live URL, but it *does* keep the same URL — no need to update `config.js`
again after that first time.

## Part 2 — Connect the website to it

Open `config.js` in this folder and paste your Web app URL in:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

That's the main thing you need to edit to wire things up. Once that's set
and the site is deployed (see below), it should be pulling live data.

## Managing content — it's all just the Sheet now

- **Events tab:** columns are `id`, `title`, `host`, `date`, `time`,
  `location`, `description`, `status`, `statusNote`, `approved`.
  - `status` is one of `confirmed`, `rain-delay`, `canceled`, `relocated`.
  - `statusNote` is the short explanation shown with the flag (e.g. "Moved
    indoors due to weather"). Leave blank for `confirmed`.
  - `approved` is a checkbox (TRUE/FALSE). Only `TRUE` rows show up on the
    site. If you type a row in yourself, set it to `TRUE`. Rows that come
    in through the "Submit an Event" form arrive as `FALSE` so you can
    review them first — flip to `TRUE` when ready to publish.
  - The home page automatically only shows events dated in the next 7
    days — no need to manage that part.
- **Memories tab:** columns are `id`, `title`, `author`, `date`, `text`,
  `approved`. Same approval pattern as Events.
- **Squad tab:** columns are `id`, `name`, `occupation`, `age`, `gender`,
  `socialLink`, `bio`, `photoUrl`, `approved`. Same approval pattern —
  profiles submitted through "Join the Squad" arrive as `FALSE` for review.
- **RSVPs tab:** one row per person per event — fills in automatically as
  people RSVP on the site. You generally won't need to touch it.
- **Scores tab:** columns are `id`, `name`, `score`, `timestamp` — powers
  the Wizards &amp; Waffles column of the shared leaderboard. Only each
  person's *best* score is kept (one row per name); a new run only
  overwrites their row if it beats their previous best. No approval step,
  no login — anyone can save a score under any name, same as always.
- **WalterProgress tab:** columns are `name`, `password`, `progress`,
  `updatedAt` — powers Walter vs. Wizards' save system (see below).
- **DoomScores tab:** columns are `name`, `password`, `bestScore`,
  `updatedAt` — same name+password login pattern as `WalterProgress`, but
  just tracking one number (Doom's best score) instead of a full save. One
  row per name; a new run only overwrites `bestScore` if it beats the
  previous one. Powers Doom Scroller's login and the shared leaderboard's
  "Doom" column (see below). Playing as a guest skips this tab entirely —
  guest scores stay in `localStorage` only, same as before this feature
  existed.
- **Chat tab:** columns are `id`, `name`, `message`, `timestamp`. Messages
  post immediately with no approval step (a review queue would defeat the
  point of a live chat). The page polls for new messages every 8 seconds.
  Only the most recent 200 messages are sent to the site at a time (see
  `CHAT_MESSAGE_LIMIT` in `Code.gs` to change that). To remove a message,
  delete its row directly — it disappears from the site within one poll.
- **Deleting something (any tab):** just delete the row in the Sheet.

Changes to the Sheet show up on the site the next time someone loads the
page — no redeploying anything, unless you've changed the script itself.

## How RSVPs work

Clicking an event card opens a pop-up with the full details and two
buttons: **I'm going** / **Can't make it**. First time, it'll ask for a
name (remembered on that device after that). RSVPs are shared and
tallied for everyone — the card and pop-up show a live count like
"4 going · 1 can't make it."

The same pop-up has an **Add to Google Calendar** button. It's a plain
link (no API key or Google account connection involved), so it works for
anyone regardless of whether they use Gmail. Since events don't store a
duration, it defaults every event to a 2-hour block starting at the
listed time — whoever adds it can adjust that in their own calendar
after the fact. If an event's `time` value isn't in a format the site
recognizes (`6:30 PM` or `18:30` both work), it falls back to adding it
as an all-day entry instead of guessing.

There's also a dedicated **RSVPs** page — a full directory of who's going
and who's not, for every event, split into Upcoming and Past. It's built
from the same `Events` and `RSVPs` data already used elsewhere, so there
was nothing new to add on the Sheet side for this one.

## How the submission forms work

**Submit an Event**, the Lore Letter's memory form, and "Join the Squad"
all post straight to the Sheet with `approved` set to `FALSE`. Review new
rows in the Sheet, edit anything that needs cleaning up, and flip
`approved` to `TRUE` to make them public.

## How Squad photos are stored

Google Sheets isn't built to hold images, so photos work a little
differently: when someone uploads one on the "Join the Squad" form
(JPG or PNG only), the site resizes it down in the browser first (so a
big phone photo doesn't turn into a slow upload), then sends it to the
Apps Script, which saves it into a Google Drive folder called
**"Midland Meetups Squad Photos"** (created automatically the first time
it's needed) and stores just the resulting image link in the `photoUrl`
column. The Sheet itself never holds the actual image data.

That folder lives in the Drive of whoever's Google account the script is
deployed under. If you ever want to review or remove a photo directly,
you can find it there.

Photos are optional — if someone skips it, their card shows a colored
circle with their first initial instead. The social media link is
optional too.

**Worth knowing:** Age and gender submitted here are shown publicly on the
site. Make sure that's something people submitting are aware of and
comfortable with.

## Passwords

Two pages are behind a simple password, set in `config.js`:

- **Submit an Event** — `SUBMIT_PASSWORD`, currently `gatsbymethod`.
- **Chat** — `CHAT_PASSWORD`, currently `ryanisthebest`. Chat doesn't even
  start polling for messages until it's unlocked.

These are light deterrents to keep the pages from being stumbled on by
strangers browsing the site — not real security. Since this is a static
site, anyone who views the page source can see the password values. Once
someone enters the right one, that page stays unlocked for the rest of
that browser tab session. To change either, just edit the constant in
`config.js`.

## Email notifications

Every time someone submits an event, a memory, or a Squad profile, the
Apps Script emails whatever address is set as `ORGANIZER_EMAIL` near the
top of `Code.gs` (currently `Rdp4709@gmail.com`), with the submitted
details and a reminder to flip `approved` to `TRUE` once reviewed. Chat
messages don't trigger an email since they post immediately without a
review step — a notification for every message would just be noise.

To change the notification address, edit `ORGANIZER_EMAIL` in `Code.gs`
and push a new deployment version.

**One-time step:** since sending email is a new capability for the
script, Google will likely ask you to re-authorize it. In the Apps Script
editor, run any function once (e.g. `setup`) and approve the new
permission prompt *before* creating the new deployment version —
otherwise the emails may silently fail.

Gmail/Apps Script email sending has a daily quota (100/day on a regular
Gmail account), which is far more than this is likely to need.

## If a date or time looks like "1899-12-31T02:32:11.000Z"

This is a known Google Sheets quirk, not a bug in the website. Sheets
auto-detects things that look like times or dates and silently stores
them as real Date values instead of plain text — timestamped against a
placeholder date from 1899/1900. `Code.gs` converts these back to a
normal-looking date/time before sending them to the site. If you're
seeing this, you're likely running an older deployment — run `setup()`
again (safe, won't touch existing data) and push a new deployment version.

## How Wizards & Waffles works

`game.html` is a small canvas-based arcade shooter (mid-century modern
style — bold primary colors, simple flat shapes) built from scratch in
`game.js`, no external game library. You run right automatically; jump
obstacles and wizards, or throw waffles to defeat wizards outright.
Grab the motorcycle power-up for 10 seconds of invincibility, or the
jetpack to hover above ground threats and throw arcing muffins instead.
The jetpack also leaves you with a brief (~1 second) grace period of
invincibility the instant it wears off — the flickering sprite — so
scrolling back down into whatever obstacle happens to be right underneath
at that exact moment isn't an unavoidable death. The board gets faster
the longer you survive.

**Controls:** Up arrow to jump, Space to throw. On touch devices, tap the
left half of the game to jump, the right half to throw.

**This is entirely self-contained and safe to experiment with** — every
tunable number (enemy spawn rate, projectile speed, power-up duration,
wizard-to-obstacle ratio, colors, everything) lives in a `CONFIG` block
at the top of `game.js`. Changing how the game looks or plays never
touches the Apps Script backend or the Sheet; the only thing that talks
to the backend is saving a score, which is a fixed `{name, score}` shape
regardless of what the game does above it. Edit `game.js`, re-upload it,
done — no redeployment, no new Sheet columns, nothing on the backend
side to keep in sync.

The **High Scores** leaderboard sits above the game and shows the top 10
scores from the `Scores` tab, refreshing automatically every 20 seconds
and immediately after anyone saves a new score. It only keeps each
person's best run, so the board stays a clean "who's the best" list
rather than a log of every game ever played. Same name-remembering trick
as RSVPs and Chat — it'll pre-fill whatever name you've used before on
that device.

`game.js` is its own file, loaded only on `game.html`, so it doesn't add
any weight to the rest of the site.

## How Walter vs. Wizards works

A second, more complex game living on the same page as Wizards & Waffles
(both load from `game.html`), built in its own file, `walter.js`. It's a
wave-based brawler rather than an endless runner:

- **Move and fight:** arrow keys to move, Up to jump (or to climb the
  tower's ladder), Space to swing your sword or cast whatever spell is
  currently active, number keys 1–5 to switch spells once you've
  unlocked them.
- **Three connected areas, left to right:** the **Tower** (a safe hub —
  climb it to reach the **Skill Altar** at the top, with a **crystal
  chest** at its base), the **Castle Wall** (waves attack from the
  right only), and the **Fair Grounds** (waves can attack from either
  side). Walking into the Wall or Fair Grounds triggers enemy spawns;
  retreating to the Tower pauses them.
- **Enemies:** knights (melee, drop **silver**), archers (ranged), and
  wizards (ranged magic, drop **crystals**). Waves start about 90%
  knights and gradually mix in more archers and wizards as you rack up
  kills. Walter's sword one-shots any of them (30 damage vs. 22–30 HP).
- **Crystals:** carried crystals are at risk — if Walter's HP hits
  zero, he respawns at the Tower and loses whatever he was carrying but
  hadn't banked. Walking onto the chest automatically banks whatever
  you're carrying. The altar lets you spend **carried + banked
  combined** to unlock any of the five spells (fireball, lightning,
  freeze, summon ally, black hole) — your choice, not an automatic
  unlock.
- **Silver & armor:** knights drop silver instead — a separate, simpler
  currency with no carry/bank risk (it's just always safe). Spend it at
  the same altar on **Leather Armor** (5 silver, a 150-point buffer —
  1.5× Walter's 100 HP) or **Steel Armor** (10 silver, a 200-point
  buffer, 2×). Armor is consumable: incoming damage drains the armor bar
  completely before touching Walter's actual HP, and once it hits zero
  it's gone. Buying new armor replaces whatever's left of the old piece
  rather than stacking.

**Progress saves to the Sheet now** — this used to be deferred, no longer
is. There's no shared leaderboard for Walter yet, but that's the only
thing still on the "later" list.

## How Walter vs. Wizards saves progress

The first thing the game asks for is a **name and password** — a
lightweight login, not a real account system. Typing a brand-new name
auto-creates a save under that name with whatever password you typed;
typing an existing name requires the matching password to load it
(and to prevent someone else from overwriting your save by reusing your
name). There's also a **"Play without saving"** link on that screen for
anyone who just wants to try the game once.

**What's saved:** unlocked spells, armor type, silver, and *banked*
crystals. **What's not:** carried-but-unbanked crystals, kill count, and
HP — those always reset fresh each session, same as any other respawn.
A save only updates at natural checkpoints — depositing crystals at the
chest, or buying a spell or armor at the altar — not continuously, so
nothing is spammed to the Sheet on every single knight kill.

**The save format is a deliberately simple, hand-readable string** (not
JSON), stored as-is in the `progress` column of `WalterProgress`:

```
$<silver>$&<5 spell letters>&@<banked crystals>@!<armor: L/S/N>!
```

Example: `$12$&fLzsb&@5@!N!` means 12 silver, only Lightning unlocked
(the one uppercase letter — the rest are locked/lowercase), 5 banked
crystals, no armor. The five spell-letter positions are always in this
order: **F**ireball, **L**ightning, free**Z**e, **S**ummonAlly,
**B**lackHole. Freeze uses Z instead of F since fireball already claimed
F; every other spell just uses its natural first letter.

You can read or hand-edit anyone's save directly in the Sheet if you
ever need to (e.g. to grant someone a spell, or fix a mistake) — it's
plain text, no encoding beyond what's shown above.

## How Doom Scroller works

A third game on the same page (`game.html`), built in its own file,
`doom.js`. You play as Dr. Doom, scrolling right through a repeating
sequence of five biomes — Latveria, the Manhattan skyline, the Canadian
wilds, the Gamma Wastes, and Xavier's grounds — each purely a cosmetic
backdrop. Every biome ends in a fight: a random Marvel character (drawn
from the character library at the top of `doom.js`) blocks your path,
and the world stops scrolling until you defeat them.

- **Move and dodge:** Left/Right to move, Up to jump (or ascend while
  flying), Down to duck (or descend while flying), **double-tap Space**
  to toggle between walking and flying. There's no screen-spanning
  danger-band overlay — instead, whoever's about to attack you gets a
  pulsing red glow that brightens as their wind-up completes (a
  generalized version of "a pulsing red light for Cyclops"), plus a
  pose change for close-range attacks: they visibly crouch for a
  ground-level sweep/charge (jump or fly to clear it — ducking doesn't
  help, your feet are still on the floor) or rear back for a
  head-level swing (duck drops you clean under it; ground and head are
  the two melee heights in the game). Ranged shots (Iron Man's
  **Repulsor Blast** — now yellow — Hulk's **Sonic Clap** — a
  semicircular shockwave that expands outward from him toward Doom,
  drawn as grey-green rings instead of a thrown rock — Cyclops' Optic
  Blast, Cap's thrown shield) are real traveling projectiles aimed at
  wherever Doom actually is — including his altitude — the instant they
  fire; since they don't home in after that, Doom dodges by no longer
  being there when the shot arrives. If Mystic Shield or Molecular
  Barrier is up when one arrives, it stops right at the glow's edge with
  a small deflection spark instead of flying in to visually overlap his
  body — the block/invulnerability rules are unchanged, only how far the
  shot actually travels before it's stopped. A handful of signature attacks are
  **unblockable** instead of dodgeable by position at all — Cyclops's
  twin-beam **Crossfire** (two beams sweep in from ±70° and converge
  exactly on Doom) and Iron Man's **Missile Barrage** (a swarm of tiny
  black rockets spreads out, then homes in on him, each one detonating
  in a fiery orange-red explosion the instant it arrives — whether or
  not Doom was shielded, since they still physically reach him and go
  off either way) always connect unless Doom is actively shielded the
  instant they land — no amount of flying or ducking avoids these, only
  timing a block does. While flying, a pulsing green glow replaces
  Doom's usual cape, and every
  character now casts a ground shadow that shrinks and fades with
  altitude for a cheap sense of depth (along with a second, fainter,
  slower-scrolling silhouette layer behind the existing one in each
  biome's background).
- **Fight back:** number keys 1–9 fire whichever of Doom's nine
  abilities you need — a quick poke (Plasma Bolt), a triple-shot
  (Doom Bolts), defensive options (Mystic Shield, Molecular Barrier), a
  utility counter (Projectile Reversal), a self-heal (Self Repair), a
  life-steal grapple (Levitation Siphon), and an ultimate (Hyperbolic
  Nova). Every ability draws from a shared energy bar and has its own
  cooldown, shown on the hotbar at the bottom of the canvas — the
  currently-selected ability (whichever number you pressed last) is
  also called out in the top-right corner and outlined on the hotbar.
  Plasma Bolt is deliberately the weakest hit per energy spent (it was
  cheap enough to win fights by itself just mashing 1) — it's there for
  quick chip damage between other abilities, not as a whole strategy on
  its own. Molecular Barrier now **fully blocks all incoming damage**
  for its duration (previously a partial 75% reduction), shown as a
  pulsating yellow radial glow around Doom instead of a static dotted
  outline. **Projectile Reversal** (key 6, replacing the old Teleport
  Slip) grabs every enemy shot currently in the air — Repulsor Blasts,
  Sonic Claps, Optic Blasts, Cap's thrown shield, whatever's live — and
  relaunches each one at the enemy from wherever it currently is,
  carrying its original damage; a shield grabbed mid-throw gets handed
  straight back to Cap rather than leaving him without one. It also
  interrupts Missile Barrage or Crossfire if either is currently
  telegraphing or active — those never spawn a real traveling shot (their
  motion is a scripted visual, not an object in the air), so without this
  they'd fly under Reversal's radar and connect anyway; catching one
  cancels it and reflects its own damage back at whoever cast it.
  **Four abilities are held, not cast.** Mystic Shield (key 5): holding
  it down drains energy every frame and keeps Doom invulnerable the
  whole time, shown as a pulsing yellow-green radial glow around him at
  1.5x the size of Molecular Barrier's (the hotbar slot pulses the same
  color while active) — its actual block radius is 1.5x bigger too, not
  just the glow; a quick tap still grants a brief flicker of
  invulnerability since the same per-frame check just runs for that one
  frame — this is the only way to survive an unblockable attack.
  Disruptor Beam (key 3): holding it diverts energy into the shot at
  10/sec (the hotbar slot fills green from the bottom as it charges)
  instead of spending a flat cost — release to fire a beam whose damage
  scales with however much you charged, up to your entire bar for a
  devastating full-charge blast; standing still charging for that long
  is genuinely risky, so it's a real trade-off against just poking with
  Plasma Bolt. Levitation Siphon (key 8): holding it lifts the current
  enemy into the air — the same pulsing green glow Doom's own flight
  uses, now wrapped around whoever's being drained — and pulls damage
  straight out of its HP into Doom's every frame the hold lasts, at a
  steady energy cost; the enemy's own attacks are paused the whole time
  it's lifted, so a long, committed hold both swings the fight's damage
  race and buys Doom a breather, at the cost of standing there
  channeling it instead of attacking with anything else. Hyperbolic Nova
  (key 9): holding it spends its whole cost and damage gradually instead
  of all at once — a green ring sweeps in around Doom for the first 60%
  of the charge, then a five-point star outline traces itself in one
  continuous line at its center for the rest — not a shape fading or
  scaling in, an actual line drawing itself point to point — and the
  instant it's fully charged (no release needed) the ring flashes and
  eight mystic meteors launch, one every few frames rather than all at
  once, cycling through blue/yellow/red/purple (two of each): each gets
  its own launch flash — a radial burst twice the size of Doom's flying
  glow, in that meteor's color — as it fires, then detonates in a matching
  colored explosion on impact, the same fiery-burst shape Missile Barrage
  uses just recolored per meteor. 90 total damage split across all eight;
  letting go before the charge completes just lets it (and whatever
  energy was already spent) fade back down for nothing, the same risk as
  walking away mid-charge on Disruptor Beam. Plasma Bolt, Doom Bolts, and
  Disruptor Beam all aim at wherever the current fighter
  actually is (including their altitude), and Disruptor Beam only ever
  draws as a line from Doom to that fighter — never as a beam spanning
  the whole screen behind him.
- **The character library:** Wolverine, Iron Man, Hulk, Cyclops, and
  Captain America to start, each with a unique movement style and
  exactly three fight abilities (defined together as one `CHARACTERS`
  entry near the top of `doom.js`). Adding the next Marvel character
  later is just one more entry in that table — the fight engine's
  ability kinds (band, projectile, unblockable, buff, reflectBuff) are
  generic and don't need touching. Captain America's shield is his
  signature move: **Shield Throw** is a real projectile (drawn larger
  than the other characters' shots) that, if it misses, curves back
  and returns to him rather than flying off — the shield on his own
  sprite disappears the instant he throws it and reappears only once
  it's back in hand, so there's never two visible at once; his
  **Bounce Back** (previously "Vibranium Block") only reflects Doom's
  projectile-based hits back at him 70% of the time — the other 30%
  it just takes the hit — instead of blocking every time. The
  close-range fighters (Wolverine's claws and lunge, Hulk's ground
  pound and rage charge, Cap's shield charge) hit noticeably harder
  than the ranged pokes, move faster between attacks, and dash a real
  distance when they charge — melee is meant to feel dangerous up
  close, not just attrition-y at range. Their movement now actively
  closes the gap toward wherever Doom currently is, too — Wolverine,
  Hulk, and Cap all ease toward a spot just in front of him (fastest for
  Wolverine, since a "restless lunger" standing still never made sense)
  instead of orbiting a fixed spot far off to the right the whole fight,
  which used to leave them looking like they never actually reached him.

If the canvas ever appears to freeze mid-game, it isn't silent: `loop()`
wraps each frame's `update()`/`draw()` in a try/catch that logs any
thrown error to the browser console (`[Doom Scroller] update() threw`
or `draw() threw`) and keeps the animation loop alive rather than
letting one bad frame kill it outright. If that ever fires, whatever's
in the console names the exact line to fix.

**Doom Scroller now has a login**, the same lightweight name+password
pattern as And So I Wander: the first thing you see is a login screen,
typing a brand-new name creates a fresh save under that name with
whatever password you typed, and an existing name requires the matching
password (so no one else can overwrite your score by reusing your name).
There's also a **"Play without saving"** guest link for anyone who just
wants to try the game once — a guest's score stays in `localStorage` only,
exactly like Doom Scroller's original local-best fallback, and never
touches the Sheet or the leaderboard.

Logged-in scores auto-save the instant a run beats your previous best —
there's no separate "save" button to click, since your identity is
already established by the login. That best score also feeds the shared
leaderboard at the top of this page (see `renderLeaderboard()` in
`app.js`), which now shows one row per player with both games' high
scores side by side — a name that's only played one of the two games
just shows "—" in the other column.

**This needs a small Apps Script addition to work** — see "Apps Script
setup for Doom Scroller's login" right below. Until that's added to your
live deployment, the login screen will show a "couldn't reach the server"
error; nothing on the rest of the site breaks.

### Apps Script setup for Doom Scroller's login

Since `Code.gs` lives in your Sheet's Apps Script editor, not on GitHub
(see "Putting the website on GitHub Pages" below), this repo can't ship
the backend half of this feature for you — you'll need to add it to your
own script once. Open **Extensions → Apps Script** on your Sheet and:

1. Add a new tab to the Sheet named exactly `DoomScores`, with a header
   row: `name`, `password`, `bestScore`, `updatedAt` (same shape as
   `WalterProgress`, minus the `progress` column).
2. Paste these three functions into `Code.gs` anywhere at the top level:

```js
function getDoomScoresSheet_(){
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DoomScores");
  if (!sheet) throw new Error("DoomScores tab not found — create it with headers: name, password, bestScore, updatedAt");
  return sheet;
}

function getDoomScores(){
  const sheet = getDoomScoresSheet_();
  const rows = sheet.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++){
    const name = rows[i][0], bestScore = rows[i][2];
    if (!name) continue;
    out.push({ name: String(name), score: Number(bestScore) || 0 });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function doomLogin(name, password){
  name = String(name || "").trim();
  password = String(password || "");
  if (!name || !password) return { success: false, error: "Enter both a name and a password." };

  const sheet = getDoomScoresSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++){
    if (String(rows[i][0]).trim().toLowerCase() === name.toLowerCase()){
      if (String(rows[i][1]) !== password) return { success: false, error: "Wrong password for that name." };
      return { success: true, bestScore: Number(rows[i][2]) || 0 };
    }
  }
  sheet.appendRow([name, password, 0, new Date().toISOString()]); // brand-new name — fresh save
  return { success: true, bestScore: 0 };
}

function doomSaveScore(name, password, score){
  name = String(name || "").trim();
  password = String(password || "");
  score = Number(score) || 0;

  const sheet = getDoomScoresSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++){
    if (String(rows[i][0]).trim().toLowerCase() === name.toLowerCase()){
      if (String(rows[i][1]) !== password) return { success: false, error: "Wrong password for that name." };
      const currentBest = Number(rows[i][2]) || 0;
      if (score <= currentBest) return { success: true, bestScore: currentBest };
      sheet.getRange(i + 1, 3).setValue(score);
      sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
      return { success: true, bestScore: score };
    }
  }
  return { success: false, error: "Not logged in — log in first." };
}
```

3. Wire those three into your existing `doGet`/`doPost` action dispatcher
   (the same `if`/`switch` that already handles `getScores`,
   `walterLogin`, etc.) — add cases for `getDoomScores` (GET), `doomLogin`
   (POST, needs `name` + `password`), and `doomSaveScore` (POST, needs
   `name` + `password` + `score`), each returning that function's result
   wrapped in whatever response helper your other actions already use.
   The exact wiring depends on how your dispatcher is written, since only
   the Sheet-side of this script is yours to edit here — the website side
   (`doom.js`, `app.js`) already calls these three action names and
   expects exactly the shapes above.
4. **Deploy → Manage deployments → pencil icon → New version → Deploy**
   so the live URL picks up the change (same step as any other script
   edit — see Part 1 above).

**A technical note for future changes:** since four games now share
one page, `game.js`, `walter.js`, `doom.js`, and `webrunner.js` each
check that their *own* canvas is the focused element before responding
to a keypress (see `document.activeElement !== canvas` near the top of
each file's keydown handler). If you add a fifth game to this page
later, it'll need the same guard, or its controls will collide with the
other four.

## How Arachnid Guy works

A fourth game on the same page (`game.html`), built in its own file,
`webrunner.js`. You play a rooftop-swinging vigilante scrolling right
across the city, jumping and web-slinging between procedurally generated
rooftops while taking down goons.

- **Move:** there's no direct left/right input — the world scrolls
  automatically, like the other three games. W jumps (only while running
  along a rooftop). A and D are your left and right web-shooters, and
  each does double duty depending on how long you hold it: **tap** either
  one to fire a web shot, **hold** either one to swing. Swinging always
  works, comic-Spider-Man style — no city anchor point to find or be in
  range of, the web just shoots up into the skyline. Each hand anchors to
  a different fixed screen-x rather than both sharing one spot: the left
  hand pulls you *backward* (anchored 15% in from the left edge), the
  right hand pulls you *forward* (anchored 10% in from the right edge,
  same spot as before) — alternating hands gives a real back-and-forth
  swinging rhythm instead of both arms doing the same thing. Either
  anchor scrolls with the world like everything else, so the auto-scroll
  can never outrun it and drag you backward mid-swing — and you swing
  from it with real pendulum physics (gravity pulls you back toward
  hanging straight down; building up angular momentum before you let go
  is what launches you up and onward instead of just dropping). The web
  auto-climbs a little every frame while you're swinging — no key needed
  — so you gain height mid-arc automatically. Release A/D to let go,
  carrying whatever velocity the swing built up into the jump that
  follows. Falling past street level is a death, same stakes as missing
  a jump in a real platformer. A toggle below the game swaps the whole
  scheme to arrow keys (Left/Right web-shooters, Up jump, Down kick)
  instead of A/D/W/S, remembered across visits via `localStorage` — both
  schemes just read from `controlKeys()` in `webrunner.js`, so there's no
  duplicated input-handling logic to keep in sync.
- **Flying kick:** S (or Down) locks onto the nearest alive goon ahead,
  within range, and closes the distance in a single beat — the goon
  becomes the anchor point and the same rope-climb math the swing uses
  runs at 100% instead of its usual slow auto-climb rate, so the rope
  collapses to the anchor in one frame instead of reeling in gradually
  (see `attemptFlyingKick()`/`updateKick()`). Unlike a body-contact
  takedown, the kick works on a goon whether it's stunned or not, so it's
  the way to finish an armed one outright without webbing it first. The
  player animates into a flying-kick pose for the move's short recovery
  window, and a defeated goon gets a two-piece ragdoll tumble — the same
  lightweight independently-falling-segments approach as the player's own
  death ragdoll, just reused through the existing tumble-effects list.
- **Combat:** a web shot doesn't damage a goon outright — it webs them
  in place (stunned) for a few seconds. Swinging or running into a
  *stunned* goon takes them down for a score bonus; touching an *armed*
  one (or catching one of their bullets) costs you a hit instead. Goon
  guns aim at wherever you actually are the instant they fire — no
  homing after that — using the exact same `aimAt()` targeting Doom
  Scroller's projectiles use; your own web shots use it too, auto-aimed
  at the nearest un-stunned goon in *either* direction — ahead of you or
  already behind you — rather than only ever looking forward (or
  straight ahead if none are in range). A fraction of spawned goons
  carry a rocket launcher instead of a pistol — slower shots and a
  longer reload, but a hit explodes on impact for 2 hit points instead
  of the usual 1.
- **Regen:** HP trickles back on its own after a stretch of not getting
  hit — deliberately slow, so it rewards staying alive and playing
  carefully rather than acting as a crutch. Getting hit at all resets
  the clock, so there's no way to "outrun" a fight by tanking a hit and
  immediately healing it back. Roughly 5 seconds out of combat before it
  starts, then about 8 seconds per HP after that (`REGEN_DELAY_FRAMES`/
  `REGEN_INTERVAL_FRAMES` in `webrunner.js`) — the next HP pip in the HUD
  fills in gradually so there's a visible readout of how close the next
  tick actually is.
- **Characters:** the player and goons are drawn as small canvas-primitive
  humanoids — a head circle, torso rect, and two arm/leg rects each
  pivoting from their own shoulder/hip point — rather than flat blobs.
  Limbs swing on a continuous phase for the player's run cycle, a fixed
  reach-for-the-web pose while swinging, and a fixed flying-kick pose
  (front leg driven straight out) when kicking; goons get a subtle idle
  sway with one arm raised toward their weapon, and go limp when
  stunned. RPG goons are a different body color with a launcher instead
  of a pistol, so they're identifiable before they fire. Still pure
  `fillRect`/`arc` shapes, no images or animation library, same as
  everything else on this page.
- **Ragdoll:** dying (out of HP, or falling past street level) triggers
  a lightweight tumble — a couple of independently falling, rotating
  body pieces with their own simple gravity — rather than a real
  joint-constrained physics simulation. Cheap, reliable, and matches the
  flat-shape/no-library approach every other game on this page uses.
- **No score saving yet.** Unlike Wizards & Waffles and Doom Scroller,
  Arachnid Guy doesn't touch the Sheet or the leaderboard at all right
  now — score is shown live and at game over, nothing more. A Sheet-backed
  best score (and a slot on the shared leaderboard) is planned but not
  built yet.

## Adding a new page (or renaming/reordering nav links)

The nav links are shared across every page from one file: **`nav.html`**.
It's just a plain list of links — no HTML boilerplate, no header, nothing
page-specific:

```html
<a href="index.html" data-page="index">Happenings</a>
<a href="rsvps.html" data-page="rsvps">RSVPs</a>
...
```

Each page fetches this file at load time and drops it into its (otherwise
empty) `<nav id="main-nav">` element — that's the only place nav links
live. To add, rename, reorder, or remove a link, edit `nav.html` once;
every page picks up the change automatically, no need to touch the other
HTML files.

To add a brand-new page:
1. Create the new `.html` file (easiest: copy an existing simple page like
   `lore.html` and swap out the `<main>` content).
2. Give its `<body>` tag a `data-page="something"` attribute — a short
   unique key for that page (e.g. `data-page="events-archive"`).
3. Add a matching link to `nav.html`:
   `<a href="your-page.html" data-page="something">Your Page</a>`

The `data-page` value just needs to match between the page's `<body>` tag
and its link in `nav.html` — that's what tells the site which nav link to
highlight as "active" on that page. If you skip step 2, the page still
works fine, it just won't highlight anything in the nav.

**Note on local testing:** since this uses `fetch()` to load `nav.html`,
opening a page by double-clicking the file (a `file://` URL) won't load
the nav — browsers block that kind of local file fetch for security
reasons. It works fine once uploaded to GitHub Pages (or if you run a
local server, e.g. `python3 -m http.server`, and open the page through
that instead).

## Putting the website on GitHub Pages

1. Create a new repository on GitHub (public repos get free Pages hosting).
2. Upload the website files — `index.html`, `rsvps.html`, `lore.html`,
   `submit.html`, `squad.html`, `chat.html`, `game.html`, `nav.html`,
   `style.css`, `app.js`, `game.js`, `walter.js`, `doom.js`,
   `webrunner.js`, `config.js` (with your URL already pasted in). You
   don't need to upload the `apps-script` folder; that code lives in the
   Sheet's Apps Script editor, not on GitHub.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment," set **Source** to "Deploy from a branch,"
   pick the `main` branch and the `/ (root)` folder, then **Save**.
5. GitHub will give you a URL like
   `https://yourusername.github.io/your-repo-name/` within a minute or two.

## If something's not loading

- **"This page hasn't been connected to your Google Sheet yet"** — means
  `config.js` still has the placeholder text. Paste in your real Web app URL.
- **Nothing loads / console shows a fetch error** — double check the
  deployment's "Who has access" is set to "Anyone," not "Anyone with a
  Google account." Also confirm you're using the newest deployment's URL
  after any script edits.
- **A new event/memory/profile you added directly in the Sheet isn't
  showing** — check its `approved` column is `TRUE`, and for events, that
  the date falls within the next 7 days.
- **Notification emails aren't arriving** — check spam, confirm
  `ORGANIZER_EMAIL` in `Code.gs` is correct, and make sure you
  re-authorized the script (see "Email notifications" above) after this
  feature was added.

## Customizing

- **Site name:** search for "Midland Meetups" across the HTML files.
- **Colors:** CSS variables at the top of `style.css` (`--blue`, `--red`,
  `--yellow`, `--green`, `--ink`, `--bg`).
