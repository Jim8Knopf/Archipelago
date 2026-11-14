# Part I — Ship Combat / Schiffskampf

*Standalone module. Compatible with the core d100 roll-under system — reuses the normal/hard/extreme ladder, personal combat damage and the First Aid mechanic.*

---

## 1. Core Loop — Grundprinzip

The ship always moves **straight ahead at its current speed** at the start of the round. Crew actions happen *during* that movement — nobody "stops" the ship to steer, they adjust it on the fly.

**Turn order alternates by ship, one character at a time** — not ship-by-ship blocks. With a PC ship and an NPC ship in a fight:

> PC ship (Character 1) → NPC ship (NPC 1) → PC ship (Character 2) → NPC ship (NPC 2) → PC ship (Character 3) → ...

Each character still only gets one action per round overall — the alternation just means the ships trade single actions back and forth instead of one ship's whole crew going, then the other's. With more than two ships in the fight, rotate through all of them in the same one-character-at-a-time pattern before any ship gets a repeat.

Each action is spent on exactly one of:

| Action | English | Deutsch | Effect |
|---|---|---|---|
| **Steer** | Turn the ship | Steuern / Wenden | Turns the ship up to its **Turn Rate** |
| **Speed** | Adjust sail | Segel setzen | Raises or lowers speed by up to its **Handling** |
| **Combat / Free** | Fight or act | Kampf / Freie Handlung | Fire weapons, cast, repair, board, anything else |

**There is no penalty for choosing Steer or Speed over Combat.** The cost is simply that the action is spent. Steering and speed need no skill, so no single character has to be "the helmsman".

---

## 2. Wind — Wind

Track wind direction on the map with a simple arrow. It affects **Speed**, not Steering — you can always turn, but the wind decides how fast you can go.

| Point of Sail | Deutsch | Effect on Speed |
|---|---|---|
| **Running** (wind behind) | Vor dem Wind | +1 speed tier this round, **on top of the ship's Max Speed** — the wind can push a ship past its normal ceiling |
| **Reaching** (wind at an angle) | Halbwind | No modifier |
| **Beating** (wind ahead) | Gegen den Wind (Aufkreuzen) | Speed capped at tier 1, regardless of Handling |

Stacked Speed actions (Section 4) can only push a ship up to its Max Speed — the wind bonus is the sole exception that goes beyond it.

A ship stuck beating into the wind can still turn freely to change its point of sail — this is usually the way out, not a punishment with no exit.

---

## 3. Turn Rate & Handling — Wendigkeit & Handling

Every ship class has fixed stats, set per class:

- **Turn Rate** — maximum degrees a single Steer action can turn the ship
- **Handling** — maximum speed tiers a single Speed action can change
- **Max Speed** — see Section 5.1

These are **per action, not per round** — see Section 4 for what happens when more than one crew member pitches in.

---

## 4. Multiple Crew, Stacking Actions

There is no dedicated helmsman skill — *anyone* can Steer or adjust Speed, and there's no cap on how many crew members choose to.

If more than one character spends their action on Steer (or on Speed) in the same round, **their effects stack**, up to the ship's rated maximum per contributor. This is the party's built-in emergency valve: sailing too close to the rocks, three crew members can each spend their action to steer, tripling the turn for that round — at the straightforward cost of three people *not* fighting or repairing that round. No extra hull strain, no separate roll, no additional penalty. The opportunity cost **is** the cost.

---

## 5. Ship Hull — Rumpf

Ship HP ("Hull") is **not derived from a formula** — the GM simply assigns a flat Hull value per ship, scaled to fit the story (a smuggler's sloop might have 8, a man-of-war might have 40). No point-buy, no curve — ships are GM-authored set pieces, not player-built characters.

### 5.1 Max Speed — Höchstgeschwindigkeit

Every ship class also has a **Max Speed**: the highest speed tier it can ever reach, regardless of how many Speed actions are spent boosting it. Handling governs how fast it *gets there* — Max Speed is the ceiling. The only thing that can exceed it is the running wind bonus (Section 2).

---

## 6. Combat, Damage & Defense

Ship-to-ship weapons (cannons, ballistae, ship-mounted spells) resolve **exactly like personal combat** (core rules, Section 4):

1. Gunner rolls their weapon skill.
2. On a hit, roll the weapon's damage dice.
3. Degree of success determines how the target's defense holds:
   - Normal success → defense applies at full strength
   - Hard success → defense halved
   - Extreme success → defense bypassed entirely

**Each cannon is one die, not one pool.** A broadside of 4 cannons rolling d6 each is `4d6`, not a single bigger die — every individual cannon is represented on the table. Use a smaller die size for lighter ships rather than fewer dice, so a small ship's broadside still visibly involves multiple guns (e.g. a sloop's 2 cannons roll 2d4 rather than 1d8).

**Broadside vs. Chasers.** Most cannons are mounted along the sides (**Broadside / Breitseite**) — fixed to fire only to that side, but full-strength. Larger ships often also carry a couple of **bow/stern chasers (Jagdkanonen)** — weaker (drop one die size down), but mounted to rotate freely in any direction.

**Direction is the gunner's choice, not the ship's.** Firing is a personal Combat/Free action — whichever character spends their action to fire chooses the target and, for chasers, the facing. The ship's own facing only limits which guns are pointed that way (broadside = must be that side; chaser = any direction).

A ship's **Armor (Panzerung)** (hull plating, wards) works identically to personal armor — flat subtraction, minimum 1 damage always gets through. Ships do not use Evasion; maneuvering to avoid fire is handled through Steering, not as a separate defense roll.

---

## 7. Repair — Reparatur

Reuses the **First Aid** mechanic (core rules, Section 6.3) wholesale, just renamed:

- Requires a consumable (spare timber, tar, canvas — *Ersatzholz, Teer, Segeltuch*)
- Fail → no repair, resource still used
- Normal success → repair 1 Hull
- Hard success → repair 2 Hull
- Extreme success → repair 4 Hull
- Limit: one repair attempt per damage instance, per character, per fight

---

## 8. Boarding — Entern

Boarding is a **Combat/Free action**, same slot as firing a cannon. It requires boarding equipment (grappling hooks, planks, boarding axes — *Enterhaken, Enterbrücken, Enteräxte*) to be on hand, but unlike Repair's consumables, **this equipment is not spent** — it's gear, not a one-use resource.

1. The boarding character rolls a relevant skill (Athletics, Ship Steering, or whatever fits the fiction of closing the gap and hooking on) to see if the attempt succeeds.
2. **On a success, the ship fight ends immediately.** The two ships are now locked together, and combat drops straight down to **personal-scale combat** using the core rules (Section 4) — normal skill rolls, weapon damage, Armor/Evasion, popcorn order, all of it, exactly as it works on land.
3. Whoever was mid-action on the ship layer when boarding succeeds simply carries their remaining actions over into the personal fight that follows.

No separate "boarding combat" subsystem is needed — it's a trigger that switches which ruleset is currently active, not a fight of its own.

*Ramming and collision rules are on hold and will be added later.*

---

\page

# Sample Ship Stat Blocks — Beispiel-Schiffe

{{descriptive

## Sloop — Slup

*Small, fast, and tight-turning. Favored by smugglers and boarding crews.*

| Stat | Value |
|---|---|
| **Hull (Rumpf)** | 8 |
| **Turn Rate (Wendigkeit)** | 90° per Steer action |
| **Handling** | 2 speed tiers per Speed action |
| **Max Speed (Höchstgeschwindigkeit)** | 5 |
| **Armor (Panzerung)** | 1 |
| **Broadside (Breitseite)** | 2d4 (2 cannons per side) |
| **Chasers (Jagdkanonen)** | none |
| **Crew Capacity (Besatzung)** | 6 |

}}

{{descriptive

## Brigantine — Brigantine

*The workhorse. Balanced speed, decent firepower, forgiving to sail.*

| Stat | Value |
|---|---|
| **Hull (Rumpf)** | 18 |
| **Turn Rate (Wendigkeit)** | 45° per Steer action |
| **Handling** | 2 speed tiers per Speed action |
| **Max Speed (Höchstgeschwindigkeit)** | 4 |
| **Armor (Panzerung)** | 2 |
| **Broadside (Breitseite)** | 4d6 (4 cannons per side) |
| **Chasers (Jagdkanonen)** | 1d4 bow, 1d4 stern — rotate freely |
| **Crew Capacity (Besatzung)** | 12 |

}}

{{descriptive

## Galleon — Galeone

*Slow and cumbersome, but a floating fortress. Turns like a barn door.*

| Stat | Value |
|---|---|
| **Hull (Rumpf)** | 35 |
| **Turn Rate (Wendigkeit)** | 30° per Steer action |
| **Handling** | 1 speed tier per Speed action |
| **Max Speed (Höchstgeschwindigkeit)** | 3 |
| **Armor (Panzerung)** | 4 |
| **Broadside (Breitseite)** | 6d8 (6 cannons per side) |
| **Chasers (Jagdkanonen)** | 2d6 bow, 1d6 stern — rotate freely |
| **Crew Capacity (Besatzung)** | 25 |

}}

{{note

**GM Dialogue Cue — Ansage des Spielleiters**

*"The wind's turned against you — the sails go slack and the deck tilts."*

*„Der Wind hat gedreht — die Segel hängen schlaff und das Deck neigt sich."*

Use bilingual read-aloud lines like this for moments the whole table needs to react to immediately (wind shifts, incoming broadsides, hull breaches).

}}

\page

# Part II — Ship Compendium / Schiffskompendium

*Sixteen ship types spanning oar-driven antiquity to the Golden Age of Sail, statted for the Pirate d100 ruleset. All ships are deliberately mundane, so later magical refits have a clean baseline. Ship and item names are given in English with a German gloss in parentheses; everything else is English only.*

---

## 0. How These Numbers Were Built

Each ship is based on real historical vessels of its type, with figures drawn from a realistic range rather than one single specimen. Real-world tonnage and knots were converted into game terms as follows:

- **Speed** uses the same m/s unit as a character's Movement stat (core rules, Section 2), so a ship's speed can be directly compared to a swimming or running PC. Cruising speed is the sustainable, all-day figure; Max speed is a short burst under ideal wind/rowing conditions. (1 knot ≈ 0.5 m/s.)
- **Maneuverability** is a flat modifier (roughly -20 to +20) added to whoever is rolling the Ship Steering basic skill for that vessel — for threading a reef or out-turning a pursuer.
- **HP** is on a much bigger scale than character HP — a rowboat can be reduced to splinters by the same weapon that barely scratches a man-of-war.
- **Cargo** is given in tons purely as a sanity check for the GM. It doesn't replace the "ship storage is effectively unlimited, within reason" rule — it just tells you how reasonable a given ship's "within reason" actually is.
- **Price** uses the Doubloon (Dbl.) as the working currency. Treat these numbers as a starting point for the table, not a locked economy.

---

## 1. Quick Reference Table

| Ship | Crew | Cannons | Cargo (t) | Speed (m/s) | Maneuver. | HP | Price (Dbl.) |
|---|---|---|---|---|---|---|---|
| Rowboat (Ruderboot) | 1–4 | 0 | 0.1–0.5 | 1 / 2 | +15 | 6–12 | 30–80 |
| Longship (Langschiff) | 25–80 | 0 | 8–20 | 3 / 8 | +10 (coastal) | 35–55 | 900–1,600 |
| War Galley (Kriegsgaleere) | 50–200 | 0 | 10–25 | 2 / 5 | +15 / −10 (open sea) | 45–70 | 3,000–5,500 |
| Cog (Kogge) | 6–25 | 0–2 | 80–150 | 2 / 3 | −5 | 55–85 | 1,400–2,400 |
| Caravel (Karavelle) | 15–30 | 0–4 | 50–90 | 2 / 4 | +10 | 50–75 | 1,800–3,000 |
| Xebec (Xebeke) | 20–50 | 6–24 | 70–130 | 4 / 6 | +15 | 55–80 | 2,800–4,500 |
| Fluyt (Fleute) | 10–20 | 0–6 | 200–350 | 2 / 3 | −10 | 60–90 | 2,200–3,800 |
| Sloop (Slup) | 15–80 | 6–14 | 70–100 | 5 / 7 | +18 | 55–85 | 2,000–3,500 |
| Schooner (Schoner) | 15–75 | 8–12 | 80–110 | 4 / 6 | +15 | 60–90 | 2,500–4,000 |
| Brigantine | 12–125 | 10–20 | 150–280 | 3 / 4 | +5 | 90–130 | 4,500–7,500 |
| Frigate (Fregatte) | 150–300 | 28–44 | 40–90* | 4 / 6 | +5 | 150–220 | 14,000–22,000 |
| Galleon (Galeone) | 100–250 | 40–60 | 400–1,000 | 3 / 4 | −15 | 220–300 | 20,000–32,000 |
| Man-of-War (Linienschiff) | 400–850 | 74–124 | 60–150* | 2 / 4 | −18 | 350–500 | 70,000–120,000 |
| Merchantman (Kauffahrer) | 15–40 | 4–10 | 150–250 | 3 / 4 | −5 | 90–130 | 5,000–9,000 |
| Carrack (Karacke) | 40–150 | 20–40 | 300–600 | 2 / 4 | −12 | 180–240 | 12,000–18,000 |
| East Indiaman (Ostindienfahrer) | 80–150 | 25–56 | 600–1,400 | 3 / 5 | −8 | 200–260 | 30,000–45,000 |

*\*Warship cargo is free hold space only — most of a frigate's or man-of-war's tonnage is eaten up by guns, powder, and crew, not tradeable goods.*

\page

## 2. Rowboat / Jolly Boat (Ruderboot)
*Ancient through present — the boat every other ship carries.*

| Stat | Value |
|---|---|
| Crew | 1–4 |
| Cannons | 0 (rarely a single swivel gun) |
| Cargo | 0.1–0.5 t |
| Sails | None, or a single small utility sail |
| Oars | Yes — 2–4 oars |
| Speed | 1 m/s cruise / 2 m/s max (~2–4 knots) |
| Maneuverability | +15 |
| HP | 6–12 |
| Price | 30–80 Dbl. |

Every larger ship carries one or two of these as a tender, for landing parties, ferrying supplies, or a quiet, oarless approach a lookout won't spot. It has no independent role in ship-to-ship combat.

**Benefits:**
- Costs almost nothing and needs no trained crew to row.
- Silent approach — no sails to spot on the horizon.
- Fits inside a larger ship's storage as a tender.

**Flaws:**
- No meaningful cargo or armament.
- Extremely fragile — a stiff wave can swamp it.
- Useless in open ocean or rough seas.

**Extras:** Simple oarlocks, nothing more; usually lashed to a larger ship's deck.

---

## 3. Viking-Style Longship (Langschiff)
*Ancient/early medieval raider.*

| Stat | Value |
|---|---|
| Crew | 25–80 |
| Cannons | 0 — spears, axes, bows; carved prow for intimidation only |
| Cargo | 8–20 t |
| Sails | 1 mast, single square sail |
| Oars | Yes — 15–35 pairs |
| Speed | 3 m/s cruise / 8 m/s max (~6–16 knots) |
| Maneuverability | +10 in calm/coastal water (see Flaws) |
| HP | 35–55 |
| Price | 900–1,600 Dbl. |

A long, shallow, double-ended hull that can land on a beach or slip up a river as easily as it crosses open water. Oars give it a burst of speed and control that a pure sailing ship can't match when the wind dies.

**Benefits:**
- Shallow draft reaches rivers and beaches no larger ship can follow.
- Oars provide propulsion even in a dead calm.
- Large crew-to-hull ratio makes it a strong raiding and boarding platform.

**Flaws:**
- Open deck — no shelter for the crew from weather or incoming fire.
- Very little cargo space for its crew size.
- Thin hull and low freeboard perform badly in storms or high seas (GM may apply a Maneuverability penalty of roughly -10 in such conditions).

**Extras:** Beachable hull, shields lined along the gunwale, carved dragon-head prow.

---

## 4. Ancient War Galley (Kriegsgaleere)
*Trireme/penteconter style — the classic Mediterranean warship.*

| Stat | Value |
|---|---|
| Crew | 50–200 (mostly rowers plus marines) |
| Cannons | 0 — bronze ram; optional deck-mounted catapult/ballista |
| Cargo | 10–25 t |
| Sails | 1 auxiliary sail, lowered before battle |
| Oars | Yes — up to 170, arranged in multiple banks |
| Speed | 2 m/s sustained cruise / 5 m/s short ramming burst (~4–9.5 knots) |
| Maneuverability | +15 in calm/coastal water / −10 on open ocean or in storms |
| HP | 45–70 |
| Price | 3,000–5,500 Dbl. |

Built for speed and precision rather than durability, the war galley trades cargo space and open-ocean resilience for a devastating ram and unmatched short-range maneuverability. It's at its best hugging a coastline in fair weather, not crossing an open sea in a storm.

**Benefits:**
- The ram is a devastating melee weapon against other ships (GM may treat a successful ram as bonus hull damage).
- Independent of wind — oars keep it moving in a dead calm.
- Exceptional maneuverability in calm, sheltered water.
- Large marine complement makes it strong at boarding actions.

**Flaws:**
- Poor seaworthiness away from the coast; storms are a real danger.
- Enormous crew (mostly non-combatant rowers) strains pay and provisions.
- Almost no cargo room once rowers and marines are aboard.
- Ramming speed exhausts the rowers and can't be sustained (a single short burst per encounter is reasonable).

**Extras:** Bronze-sheathed ram, raised fighting deck for marines, painted eyes on the prow.

\page

## 5. Cog (Kogge)
*Medieval merchant workhorse of the North and Baltic Seas.*

| Stat | Value |
|---|---|
| Crew | 6–25 |
| Cannons | 0–2 (late-era bombards, optional) |
| Cargo | 80–150 t (rare examples up to 200 t) |
| Sails | 1 mast (larger variants: 2), square-rigged |
| Oars | No (steering oar only) |
| Speed | 2 m/s cruise / 3 m/s max (~2–4 knots) |
| Maneuverability | −5 |
| HP | 55–85 |
| Price | 1,400–2,400 Dbl. |

A round-hulled, flat-bottomed trader built to move as much cargo as possible with as small a crew as possible. It's slow and clumsy, but its high sides make it a hard ship to board.

**Benefits:**
- Cheap and simple to sail — a small, low-skill crew is enough.
- Excellent cargo-to-crew ratio, ideal for straightforward trade runs.
- High sides make it difficult for small raiders to board.

**Flaws:**
- Painfully slow and poorly maneuverable.
- Little to no armament by default.
- A single mast and sail means no backup if the rigging is damaged.

**Extras:** Raised fore- and sterncastle as a defensive platform, flat bottom lets it settle upright at low tide for easy loading.

---

## 6. Caravel (Karavelle)
*Age-of-Exploration scout and light trader.*

| Stat | Value |
|---|---|
| Crew | 15–30 |
| Cannons | 0–4 small lombards/falconets |
| Cargo | 50–90 t |
| Sails | 2–3 masts, lateen-rigged (later square-rigged "redonda" variant) |
| Oars | No |
| Speed | 2 m/s cruise / 4 m/s max (~4–8 knots) |
| Maneuverability | +10 |
| HP | 50–75 |
| Price | 1,800–3,000 Dbl. |

Small, cheap, and easy to handle, the caravel's lateen sails let it work close to the wind — a rare trick among older ship types. It scouts coastlines and river mouths that bigger ships can't approach.

**Benefits:**
- Shallow draft explores coastlines and river mouths larger ships can't reach.
- Lateen rig sails well against the wind.
- Cheap and quick to build, with a small, capable crew.

**Flaws:**
- Small cargo hold limits profit from trading or raiding.
- Light frame and weak armament by default.
- Cramped quarters make long voyages uncomfortable.

**Extras:** Aftercastle, shallow draft, rigging simple enough for a small crew to manage alone.

---

## 7. Xebec (Xebeke)
*Corsair hybrid of galley and lateen-rigged sailer.*

| Stat | Value |
|---|---|
| Crew | 20–50 |
| Cannons | 6–24 |
| Cargo | 70–130 t |
| Sails | 2–3 masts, lateen-rigged |
| Oars | Yes — auxiliary bank, moderate size |
| Speed | 4 m/s cruise / 6 m/s max (~8–12 knots) |
| Maneuverability | +15 |
| HP | 55–80 |
| Price | 2,800–4,500 Dbl. |

A favorite of Barbary corsairs, the xebec combines a galley's independence from the wind with a much faster sailing rig, giving it legendary agility for hit-and-run raids on merchant shipping.

**Benefits:**
- Combines oar independence with sailing speed a true galley lacks.
- Superb maneuverability, ideal for hit-and-run raiding.
- Reasonable balance of cargo and armament.

**Flaws:**
- Needs both oarsmen and sailors, raising crew costs.
- Less cargo capacity than a dedicated trading vessel.
- Oars are auxiliary only — it can't out-row a true war galley in calm water.

**Extras:** Overhanging bow and stern platforms, lateen yards, benches for auxiliary oarsmen.

\page

## 8. Fluyt (Fleute)
*Dutch cargo specialist — huge hold, tiny crew.*

| Stat | Value |
|---|---|
| Crew | 10–20 |
| Cannons | 0–6 (usually unarmed or lightly armed) |
| Cargo | 200–350 t |
| Sails | 3 masts, square + spritsail |
| Oars | No |
| Speed | 2 m/s cruise / 3 m/s max (~4–6 knots) |
| Maneuverability | −10 |
| HP | 60–90 |
| Price | 2,200–3,800 Dbl. |

Purpose-built to haul the most cargo for the least money, the fluyt's pear-shaped hull and clever rigging let a handful of sailors manage a hold most ships would need triple the crew for. It was never meant to fight.

**Benefits:**
- Best cargo-to-crew ratio of any ship on this list.
- Very cheap to operate given its size.
- Shallow draft reaches minor ports other cargo ships can't.

**Flaws:**
- Nearly unarmed by default — a poor choice for raiding.
- Poor maneuverability and slow speed.
- Its huge, lightly-defended hold makes it an attractive target for other pirates.

**Extras:** Pear-shaped hull with a narrow deck and wide hold, simple block-and-tackle rigging that a small crew can work alone.

---

## 9. Sloop (Slup)
*The quintessential pirate raider.*

| Stat | Value |
|---|---|
| Crew | 15–80 |
| Cannons | 6–14 (4–9 pounders) |
| Cargo | 70–100 t |
| Sails | 1 mast, fore-and-aft (gaff) rig, with jib |
| Oars | No |
| Speed | 5 m/s cruise / 7 m/s max (~10–15 knots) |
| Maneuverability | +18 |
| HP | 55–85 |
| Price | 2,000–3,500 Dbl. |

Fast, shallow-drafted, and worked entirely from the deck, the sloop was the favorite first ship of nearly every Golden Age pirate. It outruns almost anything bigger and can vanish into water no warship dares follow.

**Benefits:**
- Best-in-class speed and maneuverability among common ships.
- Shallow draft reaches hideouts and shallows warships can't follow into.
- Small, skilled crew suffices; sails are worked from the deck, not aloft.

**Flaws:**
- Modest cargo and armament compared to bigger ships.
- Thin hull struggles against a sustained broadside from a heavier ship.
- Not built to slug it out — it wins by not getting hit at all.

**Extras:** Single mast worked entirely from deck level, exceptionally shallow draft.

---

## 10. Schooner (Schoner)
*Fast, fore-and-aft rigged all-rounder.*

| Stat | Value |
|---|---|
| Crew | 15–75 |
| Cannons | 8–12 |
| Cargo | 80–110 t |
| Sails | 2 masts, fore-and-aft rigged |
| Oars | No |
| Speed | 4 m/s cruise / 6 m/s max (~8–11 knots) |
| Maneuverability | +15 |
| HP | 60–90 |
| Price | 2,500–4,000 Dbl. |

Sharing the sloop's speed and shallow draft with a bit more cargo and gun capacity, the schooner is a strong all-rounder for raiding, smuggling, and running blockades alike.

**Benefits:**
- Nearly sloop-level speed and agility with more cargo and gun capacity.
- Shallow draft suits smuggling and coastal raiding equally well.
- Two masts give more redundancy than a single-masted sloop.

**Flaws:**
- Two masts mean more rigging to maintain and repair.
- Still outgunned by any dedicated warship.
- Thin hull, same as the sloop.

**Extras:** Fore-and-aft rig sails closer to the wind than square-riggers, shallow draft.

\page

## 11. Brigantine
*Balanced two-masted workhorse.*

| Stat | Value |
|---|---|
| Crew | 12–125 |
| Cannons | 10–20 |
| Cargo | 150–280 t |
| Sails | 2 masts — square-rigged foremast, gaff-rigged mainmast |
| Oars | No (historically, occasional small auxiliary sweeps) |
| Speed | 3 m/s cruise / 4 m/s max (~6–8 knots) |
| Maneuverability | +5 |
| HP | 90–130 |
| Price | 4,500–7,500 Dbl. |

A true jack-of-all-trades: enough cargo to trade, enough guns to fight, and enough crew capacity to do both at once. Many successful pirate captains "graduated" from a sloop into a brigantine.

**Benefits:**
- Strong balance of speed, cargo, crew, and armament.
- Durable enough for extended campaigns and drawn-out fights.
- A prestigious step up from a sloop for a growing crew.

**Flaws:**
- Less nimble than a dedicated sloop or schooner.
- Needs a sizable crew to reach full fighting effectiveness.
- More expensive to maintain than smaller raiders.

**Extras:** Raised quarterdeck and forecastle for extra deck space, mixed rig for versatility in open sea and coastal waters alike.

---

## 12. Frigate (Fregatte)
*Fast, heavily-armed warship.*

| Stat | Value |
|---|---|
| Crew | 150–300 |
| Cannons | 28–44 |
| Cargo | 40–90 t free hold (total burthen ~400–700 t, mostly guns/crew/stores) |
| Sails | 3 masts, full square rig |
| Oars | No |
| Speed | 4 m/s cruise / 6 m/s max (~7–9 knots, exceptional ships up to 13) |
| Maneuverability | +5 |
| HP | 150–220 |
| Price | 14,000–22,000 Dbl. |

Fast and maneuverable enough to chase down almost anything smaller while carrying enough guns to outfight almost anything bigger, the frigate is the closest thing to an ideal warship — and the traditional flagship of a truly successful pirate captain.

**Benefits:**
- Heavily armed yet still fast and maneuverable for its size.
- Can chase down nearly anything smaller and outrun nearly anything bigger.
- A prestigious flagship befitting a captain of real renown.

**Flaws:**
- Expensive to buy and maintain.
- Large crew requires serious recruitment, pay, and loyalty management.
- Overkill — and a very obvious target — for routine smuggling or trading runs.

**Extras:** Multiple gun decks, dedicated powder magazine, a surgeon's bay, and officer's quarters fit for a captain of note.

---

## 13. Galleon (Galeone)
*Massive treasure and trade ship.*

| Stat | Value |
|---|---|
| Crew | 100–250 |
| Cannons | 40–60 |
| Cargo | 400–1,000 t |
| Sails | 3–4 masts, square-rigged with a lateen mizzen |
| Oars | No |
| Speed | 3 m/s cruise / 4 m/s max (~4–8 knots) |
| Maneuverability | −15 |
| HP | 220–300 |
| Price | 20,000–32,000 Dbl. |

Built to haul a kingdom's treasure across an ocean, the galleon carries enormous cargo and enough guns to make most attackers think twice — but it turns like a barn door and can't outrun a determined pursuer.

**Benefits:**
- Massive cargo hold, ideal for treasure or bulk trade.
- Heavy armament discourages most would-be attackers.
- High sides and sterncastle aid defense against boarding.

**Flaws:**
- Notoriously poor maneuverability — easy to out-turn.
- Slow; a determined faster ship will eventually catch it.
- Requires a large crew and huge upkeep.
- Its cargo and prestige make it a magnet for both pirates and pirate-hunters.

**Extras:** Multiple gun decks, a ballasted hold to stay upright under heavy cargo, ornate stern galleries as a status symbol.

\page

## 14. Man-of-War / Ship of the Line (Linienschiff)
*The largest and most heavily armed vessel afloat.*

| Stat | Value |
|---|---|
| Crew | 400–850 |
| Cannons | 74–124 |
| Cargo | 60–150 t free hold (total displacement ~1,200–2,600 t, mostly guns/crew/stores) |
| Sails | 3 masts, full square rig, up to 3 gun decks |
| Oars | No |
| Speed | 2 m/s cruise / 4 m/s max (~4–9 knots) |
| Maneuverability | −18 |
| HP | 350–500 |
| Price | 70,000–120,000 Dbl. |

A floating fortress with a broadside that can end most fights before they properly start. Ordinary pirates never own one of these — they're state property, and getting your hands on one (or capturing one) is the stuff of legend.

**Benefits:**
- Overwhelming firepower can end most fights in a single exchange.
- Highest HP of any vessel in this compendium.
- Immense prestige and intimidation value on sight alone.

**Flaws:**
- Essentially unattainable for ordinary pirates — a state or navy asset.
- Slow and extremely clumsy to turn.
- Enormous crew and upkeep costs, well beyond a normal crew's means.
- Overkill for anything short of the largest set-piece naval battles.

**Extras:** Up to three full gun decks, a dedicated brig, extensive officers' quarters and a great cabin fit for an admiral's flag.

---

## 15. Merchantman (Kauffahrer)
*The everyday prize — plain, common, and exactly what most trade routes actually look like.*

| Stat | Value |
|---|---|
| Crew | 15–40 |
| Cannons | 4–10 (typically 6-pounders, kept for deterrence, not battle) |
| Cargo | 150–250 t |
| Sails | 2–3 masts, mixed square and fore-and-aft rig |
| Oars | No |
| Speed | 3 m/s cruise / 4 m/s max (~5–7 knots) |
| Maneuverability | −5 |
| HP | 90–130 |
| Price | 5,000–9,000 Dbl. |

This is the ship that actually carries most of the world's trade — nothing special to look at, lightly armed just enough to make a lone raider think twice, and hauling whatever cargo the GM needs it to. It's the bread-and-butter target for a pirate crew looking for a reliable payday without picking a fight they can't win.

**Benefits:**
- Common and plentiful — there's always another one on the horizon.
- Predictable cargo and defenses make it an easy target to plan around.
- Cheap to buy or refit if a crew captures one intact.

**Flaws:**
- Modest cargo compared to a fluyt or galleon — a decent payday, not a legendary one.
- Light armament folds quickly against a determined attacker.
- Poor speed and maneuverability; it can't run from anything.

**Extras:** A handful of deck-mounted guns for deterrence, a modest cargo hold, no special fittings — the ship equivalent of an ordinary wagon on the road.

---

## 16. Carrack (Karacke)
*The lumbering long-hauler that came before the galleon.*

| Stat | Value |
|---|---|
| Crew | 40–150 (the largest historical examples ran into the hundreds — GM's call for how big a given carrack is) |
| Cannons | 20–40 |
| Cargo | 300–600 t (exceptional ships far more — treat as a rare, valuable find) |
| Sails | 3–4 masts, square-rigged with a lateen mizzen |
| Oars | No |
| Speed | 2 m/s cruise / 4 m/s max (~4–6 knots) |
| Maneuverability | −12 |
| HP | 180–240 |
| Price | 12,000–18,000 Dbl. |

High-sided, round-bellied, and built for endurance over speed, the carrack was the long-range hauler of its age — sturdy enough to survive months at sea, but top-heavy and slow to answer the helm. A well-loaded carrack is a genuinely rich prize, if a crew can catch and board one.

**Benefits:**
- Very sturdy hull for its era — built to survive long ocean crossings.
- High freeboard makes it hard to board without a real fight.
- A rich prize: substantial cargo and reasonable defenses in one hull.

**Flaws:**
- Top-heavy and slow to turn — the "−12" is earned honestly.
- Cramped crew quarters below decks, most of the hull given to cargo and stores.
- Slow enough that a sloop or schooner can pick the terms of engagement.

**Extras:** Prominent forecastle and sterncastle, deep cargo holds below the waterline, a mainmast tall enough to carry a proper crow's nest.

---

## 17. East Indiaman (Ostindienfahrer)
*The big prize — rich cargo, real teeth, and a fight worth planning for.*

| Stat | Value |
|---|---|
| Crew | 80–150 |
| Cannons | 25–56 |
| Cargo | 600–1,400 t |
| Sails | 3 masts, full square rig |
| Oars | No |
| Speed | 3 m/s cruise / 5 m/s max (~6–8 knots) |
| Maneuverability | −8 |
| HP | 200–260 |
| Price | 30,000–45,000 Dbl. |

Built to haul immensely valuable cargo through dangerous waters, the East Indiaman carries enough guns that it's often mistaken for a warship at a distance — and can genuinely fight like one if it has to. This isn't an easy mark; it's the prize a crew plans a whole campaign around.

**Benefits:**
- The richest realistic cargo a pirate crew can plausibly capture short of a treasure fleet.
- Armed heavily enough to bluff or fight off most casual attackers.
- High sides and a disciplined crew make it a hard boarding target.

**Flaws:**
- Genuinely dangerous to attack — this can shoot back like a small warship.
- Expensive and slow to replace if a captured one is damaged in the taking.
- Attracts naval escorts on valuable routes, raising the stakes of any attempt.

**Extras:** Multiple gun decks disguised behind a merchant's profile, reinforced cargo holds for high-value goods, officer's quarters comparable to a naval vessel.

---

## 18. Using These Stats With the Core Rules

These ships plug into the existing system with no new subsystem required:

- A ship's **Maneuverability** modifier is added to whoever's rolling **Ship Steering** (a Basic Skill example in core rules Section 3.1) when the ship itself is trying to thread a hazard or out-turn a pursuer.
- **Cannons** resolve exactly like weapon damage (core rules Section 4), as set out in Part I, Section 6.
- **HP** is spent down using the same Normal/Hard/Extreme framework as character damage — nothing new to learn at the table.
- **Cargo tonnage** is a soft cap for GM common sense, not a hard inventory system, consistent with the core rules' "within reason" storage philosophy.

---

## 19. Open Items

- [ ] Confirm the Doubloon's exchange rate against character-creation points, if the two economies should ever interact.
- [ ] Decide whether larger ships (frigate and up) need separate rolls for helm and rigging crew, or whether one Ship Steering roll abstracts the whole vessel.
- [ ] Playtest whether the largest crew counts (galleon, man-of-war) create bookkeeping overhead at the table, and simplify if so.
- [ ] Decide how far to push carrack/East Indiaman crew and cargo at the high end (historical outliers ran far bigger) versus keeping the table playable.
- [ ] Align compendium HP and speed (m/s) with the flat Hull and speed tiers used in Part I.

\page

# Part III — Magical Upgrades / Magische Aufwertungen

## 20. Warding Gems (Bannsteine)

*The first magical ship upgrade: rare, element-locked gemstones that shrink incoming spells before they ever reach the hull.*

**Concept:** A Warding Gem is a rare, magically-attuned gemstone mounted into a ship's hull to grant protection against one specific element of magic — currently just Fire, until a second element (e.g. Water) is defined per the core rules' open items. A Fire Warding Gem does nothing against a Water spell, a cannonball, or a boarding axe; it only answers magic of its own element.

**How it works:** Before an incoming spell of the gem's matching element rolls its damage dice, the gem reduces the spell's effective Magnitude (core rules Section 5.2) by a fixed number of steps, based on the gem's tier. If this reduction brings the spell to Magnitude 0 or below, it fizzles harmlessly — no damage, no roll needed. Whatever magnitude survives the reduction resolves normally: roll its damage dice, then the ship's Armor applies as usual.

The gem is a first line of defense that shrinks the spell before the ship's ordinary defenses ever see it — it stacks with Armor rather than replacing it. Because it's reducing the spell itself rather than reacting to the hit, it isn't affected by the caster's degree of success (the Normal/Hard/Extreme ladder that lets a caster halve or bypass Armor): a gem shrinks an Extreme-success fireball exactly as much as a Normal one. It's magic answering magic, not a dodge timed right.

**Tiers** (mirrors the Trait tiers in core rules Section 8):

| Tier | Magnitude Reduction | Price (Doubloons) |
|---|---|---|
| Minor | −1 | 8,000–15,000 |
| Moderate | −2 | 25,000–45,000 |
| Major | −3 | 60,000–100,000+ |

**Mounting — the Gem Rack:** A ship that carries Warding Gems has a Gem Rack, a physical fitting built into the hull with a fixed number of slots. Each slot holds exactly one gem at a time, and a gem can be popped out and swapped for a different one whenever the crew has time to do the work — this is a loadout, not a permanent bond.

The **number of slots is not derived from a formula or tied to HP — it's a GM call**, set when the ship is built, bought, or refitted. Slot count is a story and budget decision (a smuggler's sloop might have one slot scavenged from a wreck; a captured navy flagship might have four built in from the yard) rather than something that scales automatically with ship size. As a loose sanity check, most small raiders will have 1–2 slots and only a dedicated flagship or a heavily-refitted prize is likely to carry 3 or more — but that's a guideline, not a rule.

**Swapping gems** takes real time — long enough that it can't happen mid-broadside. A short rest's worth of crew work (core rules Section 6.1) is a reasonable default; swapping faster than that under pressure should probably cost something (a skill check, a risk of damaging the gem, GM's call). Track a ship's current loadout on a simple rack table:

| Slot | Gem Installed | Element | Tier |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

Add or remove rows to match the ship's actual slot count. A ship can hold spare gems in cargo even when its rack is full — it just can't benefit from a gem that isn't currently seated in a slot.

**Rarity:** These are meant to be genuinely rare — a quest reward or a rumor to chase down more often than something sitting on a shelf in a shop. If a GM does allow outright purchase, the prices above should feel like a real gut-punch, on par with buying a warship.

**Looking ahead:** The same gems are the intended seed for offensive gem-weapons later — cannon shot or blades that unleash the gem's element on a hit instead of warding against it. That's flagged for a future document rather than designed here, so the protective mechanic gets played first.

---

## 21. Open Items — Warding Gems

- [ ] Decide whether a ship can hold two gems of the same element in separate rack slots, and if so, whether the Magnitude reduction adds or just takes the better one.
- [ ] Pin down the exact swap time and any risk/check for an emergency swap faster than a short rest.
- [ ] Design the offensive gem-weapon variant once the protective version has been playtested.
- [ ] Revisit gem pricing once a second element exists and gems can be compared against each other, not just against ship prices.
