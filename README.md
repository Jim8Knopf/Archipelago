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
- **Rules** (`rules/`) — two books: Core Rules (`rules.md`) and Ship Rules
  (`ships.md`, at `?book=ships`).
- **Admin** (`admin/`) — every campaign and character across the whole Firebase
  project, with links to each GM dashboard and sheet, and delete buttons for a
  character or a whole campaign. No access control beyond the open Firestore rules.

## Project structure

```
Archipelago/
├── index.html              landing page
├── css/style.css           shared theme
├── js/
│   ├── firebase-config.js  Firebase project keys (generated from secrets on deploy)
│   ├── firebase-init.js    shared Firebase bootstrap + ?campaign= lookup
│   ├── rules-calc.js       pure formulas from the ruleset (HP curve, Movement,
│   │                       cross-training bonus, the ladder, Mana, casting cost,
│   │                       armor, bottles, points budget, default character) —
│   │                       shared by sheet, GM and admin so the math only
│   │                       lives in one place
│   ├── rest.js             Short/Long Rest transaction with shared cooldown
│   ├── nav.js              shared top navigation (marks the current page)
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
│   └── gm.js
├── admin/
│   ├── index.html          admin page — all campaigns and characters
│   └── admin.js
├── firestore.rules         paste into Firebase console
├── .github/workflows/
│   └── deploy.yml          builds and deploys to GitHub Pages
└── .nojekyll               tells GitHub Pages to serve files as-is
```

No build step — it's plain HTML/CSS/JS using ES modules. The only thing the deploy
workflow does before publishing is write `js/firebase-config.js` from repository secrets.

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

That's the entire backend. No servers, no functions, nothing else to deploy —
Firestore is reachable directly from the static site via the Firebase JS SDK.

## 3. Publish to GitHub Pages

Deployment runs through `.github/workflows/deploy.yml`, not "Deploy from a branch".

1. Push this repo to GitHub.
2. In the repo: **Settings → Secrets and variables → Actions**, add these secrets from
   your `firebaseConfig`: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`,
   `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SENDER_ID`
   (= `messagingSenderId`), `FIREBASE_APP_ID`.
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

New documents start from `defaultCharacter()` in `js/rules-calc.js`; the sheet's
`normalize()` (`sheet/sheet.js`) fills in anything missing on older documents.

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
```

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
