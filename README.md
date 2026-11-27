# Archipelago — Ship's Log (prototype)

A live-synced, full character sheet — portrait and basic info, HP/Movement/Armor/
Evasion/Resilience, Mana, Basic Skills (in five fixed skill groups), Weapons/Magic/
Languages (with cross-training bonus), Traits, Notes, Inventory (items, armor,
weapons, potions) with potion bottles,
and a running character-creation point budget — plus a GM dashboard and an admin
page, hosted as a static site on GitHub Pages and backed by Firebase Firestore for
real-time sync between players and the GM.

All derived numbers (Max HP, Movement, Evasion, Max Mana, casting costs, category
transfer bonuses, normal/hard/extreme thresholds, points spent/remaining) are
calculated live from the formulas in `rules/rules.md` (also shown on the Rules
page) — nothing is hardcoded per-character, so the sheet stays correct as points change.

## What's in it

- **Character sheet** (`sheet/`) — opens in a compact View mode; Edit mode shows
  the raw point inputs and add/remove buttons. In View mode, tapping a skill's name
  or value marks it "used this session" (for post-session improvement rolls,
  Section 11.2); only the GM can clear the markers.
- **Skill groups** — Basic Skills always sit in five fixed groups (Physical,
  Social, Nature, Knowledge, Crafting) that cross-train like weapon and magic
  categories. In Edit mode each skill has a dropdown to move it to another group.
  Older, freely named groups are matched onto a fixed group by name where
  possible; anything left over shows below the five so its skills can be moved out.
- **Magic** — tapping a spell's Eff./Hard/Extreme value casts it and spends the
  Mana. Spells can carry a note (shown on hover / via the (i) button).
- **Potions** — inventory items of type `"potion"`. Tick "Brewable" on a spell;
  casting it then offers to bottle the result into an empty bottle (Section 9.1).
  Potions can also be added by hand from the inventory add row. Potions of the same spell and
  magnitude stack. Drink or pour out leaves the bottle empty; Throw breaks it.
  The player sets Max bottles; broken bottles only come back with **New Island**.
- **Rests** — Short and Long Rest apply instantly, from the sheet or the GM
  dashboard. Both go through one Firestore transaction with a shared 60-second
  cooldown (`js/rest.js`), so a rest pressed on two screens at once heals only once.
- **Notes** — a Session notes box (with a Clear button) and a Character notes box,
  editable in both modes and saved as you type.
- **GM dashboard** (`gm/`) — one card per character, updated live: only cards whose
  data changed are touched, HP/Mana changes are patched in place (with a short
  pulse), and open foldouts stay open. ±HP/Mana buttons, per-character Short/Long
  Rest, "Reset used skills", "Not playing today" (a per-browser bench), a
  skill-check lookup across the table, a shared Spellbook, and player links.
  Party-wide **Short Rest** / **Long Rest** cover everyone at the table;
  **🏝️ New Island** restores full HP and Mana, repairs broken bottles and clears
  used-skill markers for every character in the campaign, benched ones included.
- **Ship** — the crew's ship, shared by every character in the campaign. The GM
  can keep several ships and picks one as **the crew's ship**: that's the one every
  player's sheet shows. Players see the hull as a word (Perfect condition, A few
  scrapes, A bit damaged, Badly damaged, Barely afloat, Crippled) worked out from the
  share of max Hull left (`js/ship-calc.js`), never the numbers; the GM panel shows
  the numbers and the word players see. The sheet's **⛵ Ship** section lists the
  ship's values for ship combat; **📦 Ship's hold** is a shared, searchable hold
  with categories and the **ship's chest** (Doubloons). Everyone has full access:
  anyone can add, change, take or throw out anything. ⛵ on an inventory row puts it
  in the hold, Take brings it back; a potion takes its bottle along (Max bottles goes
  down, and up again when one is taken). The GM can move items between ships.
  Every hold, chest and move write is a Firestore transaction (`js/ship.js`), so two
  players acting at once never lose or duplicate an item — which also means these
  need a connection and don't queue offline.
- **Rules** (`rules/`) — two books: Core Rules (`rules.md`) and Ship Rules
  (`ships.md`, at `?book=ships`).
- **Admin** (`admin/`) — behind a password screen: every campaign and character
  across the whole Firebase project, with JSON backup export/import, move/copy of
  characters, campaign rename and delete, a legacy-data scan with **Migrate all**,
  a raw JSON viewer and junk hints. See [Admin page](#admin-page) below. The
  password only hides the page; it doesn't protect the database.

## Project structure

```
Archipelago/
├── index.html              landing page
├── css/style.css           shared theme
├── js/
│   ├── firebase-config.js  Firebase project keys (generated from secrets on deploy)
│   ├── admin-config.js     admin password hash (generated from ADMIN_PASSWORD on deploy)
│   ├── firebase-init.js    shared Firebase bootstrap + ?campaign= lookup
│   ├── normalize.js        fills in / migrates older character documents —
│   │                       used by the sheet on load and by the admin legacy scan
│   ├── rules-calc.js       pure formulas from the ruleset (HP curve, Movement,
│   │                       cross-training bonus, the ladder, Mana, casting cost,
│   │                       armor, bottles, points budget, default character) —
│   │                       shared by sheet, GM and admin so the math only
│   │                       lives in one place
│   ├── rest.js             Short/Long Rest transaction with shared cooldown
│   ├── nav.js              shared top navigation (marks the current page)
│   ├── confirm.js          themed confirm dialog
│   ├── sync-status.js      Saving… / Saved / Offline marker for every write
│   ├── ship-types.js       the Ship Compendium's values (keep in sync with ships.md)
│   ├── ship-calc.js        pure ship helpers: hull condition words, ship defaults,
│   │                       hold stacking, bottles going along with potions
│   ├── ship.js             ship writes: active ship, hold/chest/move transactions
│   ├── hold-ui.js          the hold + chest widget (sheet and GM dashboard)
│   ├── dialogs.js          form and read-only text dialogs (admin, hold)
│   ├── sheet-layout.js     each player's sheet section order / collapsed / hidden
│   └── format.js           small helpers: escapeHtml, flash, roman numerals,
│                           slugify, portrait URL clean-up
├── rules/
│   ├── index.html          rules page — renders the books as Homebrewery-style pages
│   ├── rules.md            core ruleset (\page, \column and {{note ... }} supported)
│   ├── ships.md            ship rules
│   ├── rules.js
│   └── rules.css
├── sheet/
│   ├── index.html          player character sheet (View / Edit modes)
│   └── sheet.js
├── gm/
│   ├── index.html          GM dashboard
│   ├── gm.js
│   └── gm-ship.js          the ship panel: crew's ship, hull, editor, all ships
├── admin/
│   ├── index.html          admin page — all campaigns and characters
│   ├── admin.js            password gate; loads the admin UI once unlocked
│   ├── admin-auth.js       password / session-token hashing (WebCrypto)
│   ├── admin-app.js        the admin UI: campaign list, detail pane, actions
│   └── admin-data.js       pure helpers: backup JSON, import plan, batching,
│                           legacy scan, junk hints
├── firestore.rules         paste into Firebase console
├── .github/workflows/
│   └── deploy.yml          builds and deploys to GitHub Pages
└── .nojekyll               tells GitHub Pages to serve files as-is
```

No build step — it's plain HTML/CSS/JS using ES modules. The only things the deploy
workflow does before publishing are write `js/firebase-config.js` from repository
secrets and write the admin password hash into `js/admin-config.js`.

---

## 1. Create the Firebase project (~5 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
   Name it anything (e.g. `archipelago-ttrpg`). Google Analytics isn't needed — skip it.
2. Once created, click the **Web** icon (`</>`) on the project overview page to register a web app.
   Give it any nickname. You do **not** need Firebase Hosting — you're using GitHub Pages instead.
3. Firebase will show you a `firebaseConfig` object. Keep those values handy — they go
   into repository secrets in step 3. (To run the site locally, paste them into
   `js/firebase-config.js` instead, but don't commit that: the committed file keeps
   `${{ secrets.… }}` placeholders, which the site rejects until they're replaced.)

## 2. Turn on Firestore

1. In the Firebase console sidebar: **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (we'll paste our own rules next), pick any region.
3. Once created, go to the **Rules** tab and replace the contents with what's in
   `firestore.rules` in this project. Click **Publish**.
   Do this again whenever `firestore.rules` changes — e.g. the ship feature added
   rules for `ships` and `settings`; without them the ship panel and the sheet's
   ship sections can't load ("permission denied").

That's the entire backend. No servers, no functions, nothing else to deploy —
Firestore is reachable directly from the static site via the Firebase JS SDK.

## 3. Publish to GitHub Pages

Deployment runs through `.github/workflows/deploy.yml`, not "Deploy from a branch".

1. Push this repo to GitHub.
2. In the repo: **Settings → Secrets and variables → Actions**, add these secrets from
   your `firebaseConfig`: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`,
   `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SENDER_ID`
   (= `messagingSenderId`), `FIREBASE_APP_ID`. For the admin page, also add
   `ADMIN_PASSWORD` (see [Admin page](#admin-page)).
3. **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**.
4. Push to `main`. The workflow writes `js/firebase-config.js` from the secrets,
   uploads the repo root as the Pages artifact and deploys it. GitHub gives you a URL
   like `https://yourname.github.io/your-repo/`.

After that, the live site is redeployed on:

- **every push to `main`**;
- **a manual run** (Actions → *Deploy to GitHub Pages* → *Run workflow*), optionally
  with a branch, tag or commit SHA in `ref`;
- **adding the `deploy` label to a PR** — this starts a manual run on `main` that
  deploys the PR's branch, comments on the PR when it starts and when it finishes,
  and removes the label so it can be added again.

There is only one live site. A label deploy of a PR branch **replaces production**
with that branch, and it stays that way until the next deploy. If the branch is behind
`main`, the live site rolls back to that older state — rebase or merge `main` into the
branch first, and redeploy `main` once you're done testing. Only one deploy runs at a
time; a newer one cancels one in progress.

## 4. Try it out

- Open `your-site-url/gm/` — this is the GM dashboard. Under **⚙️ Manage campaign**,
  set a **Campaign ID** (see note below), then add a character.
- Copy a character's player link from **Player links** (or the card's ⋯ menu →
  **Copy player link**), and send it to that player.
- Open that link — it loads `sheet/` with `?campaign=...&char=...` already filled in.
  Changes there appear on the GM dashboard within a second or two, no refresh needed.
- Players can also create their own character from `sheet/` directly if you'd rather they
  self-serve — same Campaign ID plus a character name; it opens that character if it
  exists, or offers to create it.

---

## Admin page

`your-site-url/admin/` (the **Admin** link in the nav) shows every campaign and
character in the Firebase project. Campaigns aren't stored on their own: a campaign
is just the parent path of its characters, so it exists as long as it has at least
one character.

### Setting the admin password

1. Pick a password. In the repo: **Settings → Secrets and variables → Actions →
   New repository secret**. Name: `ADMIN_PASSWORD`, value: the password (exactly as
   you'll type it — no extra spaces or line break at the end).
2. Redeploy: push to `main`, or Actions → *Deploy to GitHub Pages* → *Run workflow*.
   The workflow hashes the password (SHA-256 of `archipelago-admin:` + password) and
   writes **only the hash** into `js/admin-config.js`. The password itself is never
   written to a file or printed in the log.
3. Open `/admin/`, enter the password. It stays unlocked until you close the tab, or
   press **🔒 Lock**.

To change the password, update the secret and redeploy; anyone unlocked with the old
one is locked out on their next page load. Until the secret is set — and when you run
the site locally, where `js/admin-config.js` keeps its placeholder — the page says
*Admin password not configured*. To try the admin page locally, put a hash into your
local copy of `js/admin-config.js` (e.g. from
`printf '%s' 'archipelago-admin:yourpassword' | sha256sum`), and don't commit it.

**What the password does and doesn't do:** it hides the admin UI from anyone who
stumbles onto the link. It is *not* access control. The hash ships with the site, the
check runs in the browser, and the Firestore rules don't know about it: anyone with a
campaign ID, or who queries Firestore directly, can still read and change everything.
See [Hardening later](#hardening-later-optional-once-the-prototype-is-proven-out) for
real protection.

### What it can do

- **Campaign list and detail** — campaigns on the left with character counts (on a
  phone, the list drills into the detail). Each campaign shows its ID, character count,
  the last rest anyone took (the only activity timestamp stored), and links to the GM
  dashboard and every sheet. Each character has a ⋯ menu.
- **Backup / restore** — **Export everything** (Overview & tools) or **Export
  campaign** (campaign ⋯ menu) downloads a JSON file. Timestamps are stored as
  `{"__archipelagoType": "timestamp", "seconds": …, "nanoseconds": …}` and turned back
  into Firestore timestamps on import. **Import from a backup…** previews, per campaign,
  what would be created and what already exists. Existing characters are skipped
  unless you tick **Overwrite** for their campaign. Nothing is written until you confirm.
- **Move / copy a character** to another new or existing campaign. The player link
  changes, so the new one is shown afterwards.
- **Rename a campaign** — copies every character to the new ID, then deletes the old
  ones. All player links and the GM link change. The GM's "Not playing today" list is
  stored per browser: it's carried over in the browser you rename from, and lost on
  every other device.
- **Delete a campaign** — offers a backup download first, then deletes every
  character in it. (Deleting single characters works here and on the GM dashboard.)
- **Legacy data** — lists characters still stored in an older shape (see
  [Data model](#data-model)). **Migrate all** writes back the fields `normalize()`
  changes, so the document matches what the sheet already shows.
- **View raw JSON** of any character, read-only.
- **Junk hints** — flags placeholder campaign IDs (`default-campaign`, `test`, …) and
  characters with no name, a placeholder name or nothing filled in. They're guesses;
  every delete asks first.

Every change goes through the same **Saving… / Saved** marker as the other pages, and
large operations are written in batches of at most 500 (Firestore's batch limit).
Batches after the first aren't atomic with it: a rename copies everything before it
deletes anything, so a failure leaves duplicates rather than lost characters.

The list relies on the `match /{path=**}/characters/{characterId}` read rule in
`firestore.rules` (a collection-group query) — make sure the rules in the Firebase
console include it.

---

## Picking a Campaign ID

Anyone who knows your Campaign ID can read and write every character in it — the
prototype rules (see below) don't check who's asking, only that they know the ID.
So: use something long and specific to your table, not `default-campaign` or
`test`, e.g. `black-tortuga-crew-9f2a`. Treat it like a shared password.

## Hardening later (optional, once the prototype is proven out)

The open `allow read, write: if true` rule is what makes this prototype fast to
stand up, but it means anyone who ever sees a link can, in principle, guess other
campaign IDs or hand your link to someone you didn't intend. The Admin page makes
this explicit: it lists every campaign in the project. For a private home
game this is a low-stakes trade-off. If you want to tighten it later, two
straightforward options, roughly in order of effort:

- **Firebase App Check** — blocks requests that don't come from your actual
  deployed site (stops randoms hitting the database directly via curl/scripts),
  without requiring player logins.
- **Firebase Anonymous Auth + per-campaign membership doc** — each visitor gets
  a silent anonymous account, and rules check that their UID is listed as a
  member of the campaign before allowing reads/writes. More setup, but proper
  access control instead of "security by obscure URL."

Both are additive — nothing in the current code needs to change structurally,
just the rules file and a small amount of added auth-init code.

## Data model

New documents start from `defaultCharacter()` in `js/rules-calc.js`; `normalize()`
(`js/normalize.js`) fills in anything missing on older documents when the sheet
loads them. The admin page's **Migrate all** writes that result back.

```
campaigns/{campaignId}/characters/{characterId}
  name:             string
  imageUrl:         string   — portrait URL (Google Drive / Dropbox share links are rewritten)
  basicInfo:        { age, race, birthplace, job, height, weight, gender, fightingStyle }
  pointsGranted:    number   — 800 by default; bump this after an Island Reset
  hpPoints:         number   — invested points; Max HP is derived, not stored
  movementPoints:   number   — invested points; Movement (m/s) is derived
  evasionPoints:    number   — invested points; Evasion total is derived
  resiliencePoints: number   — invested points; Resilience modifier is derived
  manaPoints:       number   — invested Mana Modifier points; Max Mana is derived
  armorCustom:      number   — natural armor, traits etc., added to worn armor
  currentHP:        number
  currentMana:      number
  categories:       array of { id, name, type, group?, skills: [...] }
                               type is "skill" | "weapon" | "magic"
                               group (skill type only) is "physical" | "social" |
                               "nature" | "knowledge" | "crafting"
                               skills: { id, name, points } — spells also have
                               magnitude (1–8), note, brewable
  languages:        array of { id, name, points } — one shared pool
  traits:           array of { id, name, type, tier, description }
                               type is "advantage" | "flaw"; tier is "minor" | "moderate" | "major"
  inventory:        array of { id, type, name, ... }
                               type "item":   qty
                               type "armor":  armorValue, worn
                               type "weapon": woundDice (e.g. "1d6")
                               type "potion": magnitude, qty, spellId (when brewed)
  bottlesMax:       number   — set by the player
  bottlesBroken:    number   — reset to 0 by New Island
  usedSkillIds:     array of skill ids marked "used this session"
  notes:            { session, character } — free text
  lastRestAt:       timestamp — written by rests, drives the shared cooldown
  lastRestType:     "short" | "long"
  basicSkills:      legacy — always [] now (see below)
  layout:           { order, collapsed, hidden } — the player's section layout

campaigns/{campaignId}/ships/{shipId}
  name, type, typeName  "Salt Widow", "sloop", "Sloop" (type = js/ship-types.js key)
  hullMax, hullCurrent  only the GM screen shows these numbers
  armor, maxSpeed, handling, turnRate (degrees), crew, price   numbers
  maneuverability, broadside, chasers, cargo                    text
  traits:           array of strings
  terminalSlots:    number — Guard Stone Terminal slots (0 = no terminal)
  guardStones:      array of { id, tier, element } — tier "minor" | "moderate" | "major"
  storyChanges, notes   free text (everyone sees them)
  chest:            number — Doubloons in the ship's chest
  hold:             array of inventory items (same shape as a character's), each
                    with qty, category ("supplies" | "cargo" | "weapons" | "armor" |
                    "potions" | "treasure" | "misc"), optional note and addedBy
  createdAt:        millis — ships are listed in the order they were added

campaigns/{campaignId}/settings/main
  activeShipId:     the crew's ship, or null
```

Backups include each campaign's `ships` and `settings` next to its `characters`;
backups made before ships existed still import. Renaming or deleting a campaign on
the admin page takes its ships and settings along.

Legacy shapes migrated by `normalize()` on load:

- flat `basicSkills` list → folded into a skill group (then the five fixed groups are
  ensured). The sheet writes the migrated `categories` and an empty `basicSkills`
  back once, so the points aren't counted twice.
- categories of type `"language"` → the flat `languages` array
- a Basic Skill named exactly `Evasion` → `evasionPoints`
- old flat `armor` number → `armorCustom`
- inventory items without a `type` → type `"item"`
- a separate `potions` list (first version of Section 9.1) → inventory items of type
  `"potion"`; the sheet writes the merged `inventory` and an empty `potions` back once

### How the derived numbers are calculated (`js/rules-calc.js`)

- **Max HP** — largest `n` where `n(n+1)/2 ≤ hpPoints` (Section 2)
- **Movement** — `floor(sqrt(movementPoints))` m/s (Section 2)
- **Evasion total** — `evasionPoints` plus full Movement (Section 4)
- **Resilience modifier** — `floor(resiliencePoints ÷ 2)`, subtracted from the caster's roll; never rolled itself (Section 5.5)
- **Armor** — `armorCustom` plus the `armorValue` of every worn armor item
- **Category transfer bonus** — `floor(sum of raw points across all skills in that category ÷ 10)`, added to each skill's raw value to get its effective value (Section 3.2). Applies to skill groups, weapon categories, magic categories and the languages pool alike.
- **Normal / Hard / Extreme** — effective value, effective ÷ 2, effective ÷ 5, each floored (Section 1)
- **Max Mana** — `manaPoints × (sum of all magic category bonuses) ÷ 2` (Section 5.1)
- **Casting cost** — base `2^(magnitude−1)`; Normal = base × 5, Hard = ceil(base × 2.5), Extreme = base (Section 5.3)
- **Short Rest** — recover `max(1, floor(max ÷ 10))`; **Long Rest** — recover `ceil(missing ÷ 2)`; both capped at max, for HP and (if the character has magic) Mana (Section 6)
- **Bottles** — full = potion items carried (summed `qty`), broken = `bottlesBroken`, empty = `bottlesMax − full − broken` (Section 9.1)
- **Points budget** — spent = HP + Movement + Mana + Evasion + Resilience points + all skill, weapon, spell and language points + Advantage costs (15/30/50 by tier); available = `pointsGranted` + Flaw bonus points; remaining = available − spent (Sections 7–8)
