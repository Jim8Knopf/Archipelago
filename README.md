# Archipelago — Ship's Log (prototype)

A live-synced, full character sheet — basic info, HP/Movement/Evasion,
Mana, Basic Skills, Weapons/Magic/Languages (with cross-training bonus),
Traits, Inventory, and a running character-creation point budget — plus
a GM dashboard, hosted as a static site on GitHub Pages and backed by
Firebase Firestore for real-time sync between players and the GM.

All derived numbers (Max HP, Movement, category transfer bonuses,
normal/hard/extreme thresholds, points spent/remaining) are calculated
live from the formulas in `Pirate_TTRPG_Rules_Draft.md` — nothing is
hardcoded per-character, so the sheet stays correct as points change.

## Project structure

```
pirate-ttrpg-web/
├── index.html              landing page
├── css/style.css           shared theme
├── js/
│   ├── firebase-config.js  YOUR Firebase project keys go here
│   ├── firebase-init.js    shared Firebase bootstrap (imported by sheet & gm)
│   └── rules-calc.js       pure formulas from the ruleset (HP curve, Movement,
│                           cross-training bonus, the ladder, points budget) —
│                           shared by both sheet.js and gm.js so the math only
│                           lives in one place
├── sheet/
│   ├── index.html          player character sheet (full, editable)
│   └── sheet.js
├── gm/
│   ├── index.html          GM dashboard
│   └── gm.js
├── firestore.rules         paste into Firebase console
└── .nojekyll                tells GitHub Pages to serve files as-is
```

No build step — it's plain HTML/CSS/JS using ES modules, so GitHub Pages
can serve it directly with zero configuration beyond turning Pages on.

---

## 1. Create the Firebase project (~5 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
   Name it anything (e.g. `archipelago-ttrpg`). Google Analytics isn't needed — skip it.
2. Once created, click the **Web** icon (`</>`) on the project overview page to register a web app.
   Give it any nickname. You do **not** need Firebase Hosting — you're using GitHub Pages instead.
3. Firebase will show you a `firebaseConfig` object. Copy those values into
   `js/firebase-config.js` in this project, replacing the placeholders.

## 2. Turn on Firestore

1. In the Firebase console sidebar: **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (we'll paste our own rules next), pick any region.
3. Once created, go to the **Rules** tab and replace the contents with what's in
   `firestore.rules` in this project. Click **Publish**.

That's the entire backend. No servers, no functions, nothing else to deploy —
Firestore is reachable directly from the static site via the Firebase JS SDK.

## 3. Publish to GitHub Pages

1. Push this whole folder to a GitHub repo (root of the repo, or a subfolder — either works).
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick your branch (e.g. `main`) and the folder this content lives in (`/ (root)` or `/docs`).
5. Save. GitHub gives you a URL like `https://yourname.github.io/your-repo/` within a minute or two.

Every future `git push` updates the live site automatically — no extra workflow needed
for a static site like this.

## 4. Try it out

- Open `your-site-url/gm/` — this is the GM dashboard. Set a **Campaign ID** (see note below),
  then add a character.
- Click **Copy** next to a character to get their player link, and send it to that player.
- Open that link — it loads `sheet/` with `?campaign=...&char=...` already filled in.
  Changes there appear on the GM dashboard within a second or two, no refresh needed.
- Players can also create their own character from `sheet/` directly if you'd rather they
  self-serve — same Campaign ID, blank Character ID, plus a name.

---

## Picking a Campaign ID

Anyone who knows your Campaign ID can read and write every character in it — the
prototype rules (see below) don't check who's asking, only that they know the ID.
So: use something long and specific to your table, not `default-campaign` or
`test`, e.g. `black-tortuga-crew-9f2a`. Treat it like a shared password.

## Hardening later (optional, once the prototype is proven out)

The open `allow read, write: if true` rule is what makes this prototype fast to
stand up, but it means anyone who ever sees a link can, in principle, guess other
campaign IDs or hand your link to someone you didn't intend. For a private home
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

```
campaigns/{campaignId}/characters/{characterId}
  name:           string
  basicInfo:      { age, race, birthplace, job, height, weight, gender, fightingStyle }
  pointsGranted:  number   — 800 by default; bump this after an Island Reset
  hpPoints:       number   — invested points; Max HP is derived, not stored
  movementPoints: number   — invested points; Movement (m/s) is derived
  currentHP:      number
  maxMana:        number   — set by GM/player judgement (Section 5.1 has no fixed formula)
  currentMana:    number
  basicSkills:    array of { id, name, points }         — no cross-training
  categories:     array of { id, name, type, skills: [{ id, name, points }] }
                             type is "weapon" | "magic" | "language"
  traits:         array of { id, name, type, tier, description }
                             type is "advantage" | "flaw"; tier is "minor" | "moderate" | "major"
  inventory:      array of { name, qty }
```

### How the derived numbers are calculated (`js/rules-calc.js`)

- **Max HP** — largest `n` where `n(n+1)/2 ≤ hpPoints` (Section 2)
- **Movement** — `floor(sqrt(movementPoints))` m/s (Section 2)
- **Evasion total** — the raw value of a Basic Skill literally named "Evasion", plus full Movement (Section 4). Add a skill called exactly `Evasion` to feed this.
- **Category transfer bonus** — `(sum of raw points across all skills in that category) ÷ 10`, added to each skill's raw value to get its effective value (Section 3.2)
- **Normal / Hard / Extreme** — effective value, effective ÷ 2, effective ÷ 5 (Section 1)
- **Points budget** — spent = HP points + Movement points + all Basic Skill points + all category skill points + Advantage costs; available = `pointsGranted` + Flaw bonus points; remaining = available − spent (Sections 7–8)

One thing the ruleset doesn't pin down with a formula: Mana pool size (Section 5.1 says it "scales from points invested," without giving the exact curve). Rather than guess at one, `maxMana` is just a plain editable number — set it by GM/player judgement per the current text, and if you land on a formula later, it's a one-line change in `rules-calc.js` plus swapping the Max Mana input for a points-invested input like HP/Movement already use.
