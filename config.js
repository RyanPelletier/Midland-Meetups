/* =====================================================================
   THE MIDLAND MIXER — configuration
   Paste your deployed Google Apps Script Web App URL below, between
   the quotes. See apps-script/Code.gs and the README for setup steps.

   It looks like:
   https://script.google.com/macros/s/AKfycb.../exec
   ===================================================================== */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUjmfugZe7jkOt_kfbHo902DLnHJx9Hc7U8ICkzWFf17Xtk7RSSSHdlvpGK9FVsFsV/exec";

/* Simple password for the "Submit an Event" page. This is a light gate to
   keep the form from being stumbled on by strangers — not real security.
   Since this is a static site, anyone who views the page source can see
   this value, so don't rely on it for anything sensitive. */
const SUBMIT_PASSWORD = "gatsbymethod";

/* Same idea, gating the Chat page. */
const CHAT_PASSWORD = "ryanisthebest";

/* =====================================================================
   FLOPPY SWORDS — multiplayer (Firebase Realtime Database)
   Paste your Firebase project's web app config below. See the README's
   "Firebase setup for Floppy Swords multiplayer" section for the exact
   console steps. Until apiKey is filled in, floppy.js detects the
   placeholder and shows a friendly "not set up yet" message instead of
   trying to connect — Practice mode works fully offline either way.

   Unlike APPS_SCRIPT_URL/SUBMIT_PASSWORD above, these values are NOT
   meant to be secret — a Firebase web config is safe to ship in public
   client code. Multiplayer's actual security comes from the Realtime
   Database Rules you paste into the Firebase console (also in the
   README section above), not from hiding this object.
   ===================================================================== */
const FLOPPY_FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "PASTE_YOUR_FIREBASE_AUTH_DOMAIN_HERE",
  databaseURL: "PASTE_YOUR_FIREBASE_DATABASE_URL_HERE",
  projectId: "PASTE_YOUR_FIREBASE_PROJECT_ID_HERE",
  appId: "PASTE_YOUR_FIREBASE_APP_ID_HERE"
};
