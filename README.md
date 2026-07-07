# Midland Meetups — Bulletin Board

A website for posting upcoming events, event updates (rain delays,
cancellations, new locations), a "Happenings This Week" snapshot with
click-to-RSVP, an event submission form, and "The Lore Letter" — a feed of
memories from past events, with its own submission form. The site itself
is static HTML/CSS/JS hosted free on GitHub Pages. All the actual data —
events, memories, submissions, RSVPs — lives in a **Google Sheet**, read
and written through a **Google Apps Script** deployed as a web app. That
means everyone sees the same live data: shared RSVP counts, submissions
you can review before they go public, all editable right in a spreadsheet.

## How the pieces fit together

```
Your Google Sheet  <---->  Apps Script Web App  <---->  This website (GitHub Pages)
  (the database)         (the API in between)          (what people see/use)
```

- **The Sheet** has three tabs: `Events`, `Memories`, `RSVPs`. You can look
  at and hand-edit any of it any time.
- **The Apps Script** (`apps-script/Code.gs`) is code that lives *inside*
  that Sheet (via Extensions → Apps Script) and exposes it to the website
  through a URL.
- **The website** (everything else in this folder) calls that URL to load
  events/memories and to save RSVPs and new submissions.

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
   about scripts that touch your Sheets.)
7. Go back to the Sheet tab — you should now see three tabs at the bottom:
   `Events`, `Memories`, `RSVPs`, with headers and a couple of sample rows
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
live URL.

## Part 2 — Connect the website to it

Open `config.js` in this folder and paste your Web app URL in:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

That's the only file you need to edit to wire things up. Once that's set
and the site is deployed (see Part 3), it should be pulling live data.

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
- **RSVPs tab:** one row per person per event — this fills in automatically
  as people RSVP on the site. You generally won't need to touch it, though
  you're welcome to look at who's going to what.
- **Deleting something:** just delete the row in the Sheet.

Changes to the Sheet show up on the site the next time someone loads the
page — no redeploying anything.

## How RSVPs work

Clicking an event card opens a pop-up with the full details and two
buttons: **I'm going** / **Can't make it**. First time, it'll ask for a
name (remembered on that device after that). RSVPs are shared and
tallied for everyone — the card and pop-up show a live count like
"4 going · 1 can't make it."

## How the submission forms work

Both **Submit an Event** and the Lore Letter's memory form post straight
to the Sheet with `approved` set to `FALSE`. Review new rows in the Sheet,
edit anything that needs cleaning up, and flip `approved` to `TRUE` to
make them public.

## Submit an Event password

The Submit an Event page is behind a simple password (set in `config.js` as
`SUBMIT_PASSWORD`, currently `gatsbymethod`). It's meant to keep the form
from being stumbled on by strangers browsing the site, not as real
security — since this is a static site, anyone who views the page source
can see the password value. Once someone enters it correctly, the form
stays unlocked for the rest of that browser tab session.

To change the password, edit `SUBMIT_PASSWORD` in `config.js`.

- **Squad tab:** columns are `id`, `name`, `occupation`, `age`, `gender`,
  `socialLink`, `bio`, `photoUrl`, `approved`. Same approval pattern as
  Events and Memories — profiles submitted through the site's "Join the
  Squad" form arrive as `FALSE` for you to review before they go public.

## How Squad photos are stored

Google Sheets isn't built to hold images, so photos work a little
differently: when someone uploads one on the "Join the Squad" form, the
site resizes it down in the browser first (so a big phone photo doesn't
turn into a slow upload), then sends it to the Apps Script, which saves it
into a Google Drive folder called **"Midland Meetups Squad Photos"**
(created automatically the first time it's needed) and stores just the
resulting image link in the `photoUrl` column of the Squad sheet. The
Sheet itself never holds the actual image data.

That folder lives in the Drive of whoever's Google account the script is
deployed under (whoever ran `setup()` / did the deployment). If you ever
want to review or remove a photo directly, you can find it there.

Photos are optional — if someone skips it, their card shows a colored
circle with their first initial instead.

**Worth knowing:** Age and gender submitted here are shown publicly on the
site. Make sure that's something people submitting are aware of and
comfortable with — you may want to mention that on the page itself if it
isn't obvious to your group.

## If a date or time looks like "1899-12-31T02:32:11.000Z"

This is a known Google Sheets quirk, not a bug in the website. Sheets
auto-detects things that look like times or dates and silently stores
them as real Date values instead of plain text — timestamped against a
placeholder date from 1899/1900. `Code.gs` converts these back to a
normal-looking date/time before sending them to the site, but if you're
seeing this, you're likely running an older deployment. Fix:

1. In the Apps Script editor, run `setup()` again (safe — it won't touch
   existing data, it just also locks the `date`/`time` columns to plain
   text going forward so this stops happening for new rows).
2. Push a **new deployment version** (Deploy → Manage deployments →
   pencil icon → New version → Deploy) so the live URL picks up the fix.

No need to retype anything in existing rows — the fix normalizes the
value on the way out regardless of how the cell is stored.

- **Chat tab:** columns are `id`, `name`, `message`, `timestamp`. Messages
  post immediately — there's no approval step, since that would defeat the
  point of a live chat. The page polls for new messages every 8 seconds
  (not truly real-time, but close enough for this kind of casual chat).
  Only the most recent 200 messages are sent to the site at a time (see
  `CHAT_MESSAGE_LIMIT` in `Code.gs` if you want to change that).

**Moderation note:** since chat messages aren't reviewed before posting,
the only way to remove one is to delete its row directly in the `Chat`
sheet — it'll disappear from the site within one polling cycle (~8
seconds) after that.

## Putting the website on GitHub Pages

1. Create a new repository on GitHub (public repos get free Pages hosting).
2. Upload the website files — `index.html`, `lore.html`, `submit.html`,
   `squad.html`, `chat.html`, `style.css`, `app.js`, `config.js` (with
   your URL already pasted in). You don't need to upload the
   `apps-script` folder; that code lives in the Sheet's Apps Script
   editor, not on GitHub.
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
- **A new event/memory you added directly in the Sheet isn't showing** —
  check its `approved` column is `TRUE`, and for events, that the date
  falls within the next 7 days.

## Customizing

- **Site name:** search for "Midland Meetups" across the HTML files.
- **Colors:** CSS variables at the top of `style.css` (`--blue`, `--red`,
  `--yellow`, `--green`, `--ink`, `--bg`).
