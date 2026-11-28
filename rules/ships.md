# Ship Rules — Schiffsregeln

*Standalone module for the Pirate d100 system. Ships reuse the core rules wherever possible: the normal/hard/extreme ladder, weapon damage and Armor, the First Aid mechanic, and Wards. Names are given in English with a German gloss.*

## 1. Your Ship — Euer Schiff

Ships are **not built with points**. The GM hands the crew a ship of one of the types in the Ship Compendium (Part III), and it comes with that type's **fixed values** — no ranges, no rolling, nothing to calculate, no upgrade shopping. A sloop is always a sloop: Hull 140, Armor 2, Max Speed 7, and so on.

If a ship ever changes, it's because of the story — a shipwright's favour, a cursed figurehead, a Guard Stone Terminal pried from a wreck (Section 9). The GM decides what changes and writes it on the ship's record:

| Ship Record | |
|---|---|
| Name & type | *e.g. "Salt Widow", Sloop* |
| Current Hull | */ max Hull* |
| Story changes | *e.g. Guard Stone Terminal (2 slots)* |
| Guard Stones seated | *see Section 9* |

Captured ships keep their type's values plus any story changes they already had.

## 2. Ship Values — Schiffswerte

| Value | Deutsch | What it does |
|---|---|---|
| **Hull** | Rumpf | The ship's HP, on ship scale (Section 6.4). At 0 the ship is crippled (Section 6.3). |
| **Armor** | Panzerung | Flat damage reduction, like personal Armor — ×10 against ship weapons (Section 6.2). |
| **Max Speed** | Höchstgeschwindigkeit | Highest speed the ship can reach, in m/s (same unit as Movement). |
| **Handling** | Handling | How much one Speed action can raise or lower speed. |
| **Turn Rate** | Wendigkeit | How far one Steer action can turn the ship. |
| **Maneuverability** | Manövrierfähigkeit | Modifier to Ship Steering rolls against hazards (Section 8). |
| **Broadside** | Breitseite | Damage dice of the guns on each side. |
| **Chasers** | Jagdkanonen | Smaller guns that can fire in any direction. |
| **Crew** | Besatzung | Full crew complement — flavour and upkeep only (see below). |
| **Cargo** | Ladung | Hold size in tons — a sanity check, not an inventory. |
| **Price** | Preis | Price in Doubloons (Dbl.), for buying or selling a ship in the story. |
| **Traits** | Eigenschaften | Special rules, below. |

**Crew** numbers are for the story, pay and provisions. In ship combat only **named characters** (PCs and important NPCs) take actions — nobody tracks 180 sailors.

**Cargo** doesn't replace the core rule that ship storage is "effectively unlimited, within reason" — it just tells the GM how reasonable "within reason" is for this hull. What is actually aboard goes in the ship's hold (on the Character Sheet and the GM Dashboard); Cargo is the sanity check on how much of it fits.

### 2.1 Ship Traits — Schiffseigenschaften

- **Oars (Ruder)** — the ship can move in a dead calm and ignores the Beating speed cap (Section 4) while rowing.
- **Shallow Draft (Geringer Tiefgang)** — can enter rivers, shallows and reefs that ships without this trait can't follow into.
- **High Sides (Hohe Bordwand)** — boarding attempts against this ship take a **−20** malus.
- **Ram (Rammsporn)** — built for ramming. Ramming rules are on hold and will be added later.
- **Weatherly (Hoch am Wind)** — fore-and-aft or lateen sails that work close to the wind: while **Beating** (Section 4), speed is capped at **2** instead of 1.

\page

# Part I — Ship Combat / Schiffskampf

## 3. Core Loop — Grundprinzip

At the start of each round, every ship moves **straight ahead at its current speed**. Crew actions happen *during* that movement — nobody "stops" the ship to steer, they adjust it on the fly.

**Turn order alternates by ship, one character at a time** — not ship-by-ship blocks:

> PC ship (Character 1) → NPC ship (NPC 1) → PC ship (Character 2) → NPC ship (NPC 2) → PC ship (Character 3) → ...

With more than two ships, rotate through all of them in the same one-character-at-a-time pattern before any ship gets a repeat. Each character still gets one action per round, spent on exactly one of:

| Action | Deutsch | Effect |
|---|---|---|
| **Steer** | Steuern / Wenden | Turn the ship up to its **Turn Rate** |
| **Speed** | Segel setzen | Raise or lower speed by up to its **Handling** |
| **Combat / Free** | Kampf / Freie Handlung | Fire a gun, cast, repair, board, anything else |

**There is no penalty for choosing Steer or Speed over Combat.** The cost is simply that the action is spent. Steering and speed in combat need no skill roll, so no single character has to be "the helmsman".

## 4. Wind — Wind

Track wind direction on the map with a simple arrow. It affects **speed**, not steering — you can always turn, but the wind decides how fast you can go.

| Point of Sail | Deutsch | Effect on Speed |
|---|---|---|
| **Running** (wind behind) | Vor dem Wind | +1 speed this round, even **beyond Max Speed** |
| **Reaching** (wind at an angle) | Halbwind | No modifier |
| **Beating** (wind ahead) | Gegen den Wind | Speed capped at 1, regardless of Handling |

The running bonus is the only thing that pushes a ship past its Max Speed. A ship stuck beating into the wind can still turn freely to change its point of sail — that's the way out. Ships with **Oars** ignore the Beating cap while rowing; **Weatherly** ships are capped at 2 instead of 1.

{{note
#### GM Cue — Ansage des Spielleiters
*"The wind's turned against you — the sails go slack and the deck tilts."*

*„Der Wind hat gedreht — die Segel hängen schlaff und das Deck neigt sich."*

Use bilingual read-aloud lines like this for moments the whole table needs to react to immediately (wind shifts, incoming broadsides, hull breaches).
}}

## 5. Steering & Speed — Steuern & Fahrt

- **Turn Rate** is the most a **single** Steer action can turn the ship.
- **Handling** is the most a **single** Speed action can change its speed.
- **Max Speed** is the ceiling, no matter how many Speed actions are spent.

**Stacking.** Anyone can Steer or adjust Speed, and there's no cap on how many crew members do. If several characters spend their action on Steer (or on Speed) in the same round, **their effects add up**, each up to the ship's value. Three characters steering a sloop can turn it 3 × 90° in one round — at the cost of three people *not* fighting or repairing. No extra strain, no roll, no penalty: the opportunity cost **is** the cost.

\page

## 6. Firing & Damage — Feuern & Schaden

Ship weapons (cannons, ballistae, ship-mounted spells) resolve **like personal combat** (core rules, Section 4), on **ship scale**:

1. The gunner rolls their weapon skill.
2. On a hit, roll the weapon's damage dice and **multiply by 10**.
3. The degree of success degrades the target's Armor (×10, Section 6.2): normal → full, hard → halved, extreme → ignored.

*Example:* a sloop's 2d4 broadside rolls 3 + 2 = 5 → 50 damage. Against another sloop (Armor 2 → 20) on a normal success, 30 Hull comes off its 140.

### 6.1 Guns — Geschütze

- **Each die is one gun battery.** A broadside of 4d6 is four dice, not one bigger die — every battery is on the table. Small ships use smaller dice rather than fewer dice.
- **Broadside (Breitseite)** guns fire only to their own side, at full strength.
- **Chasers (Jagdkanonen)** are one die size smaller (never below d4) but rotate to fire in any direction.
- **Direction is the gunner's choice, not the ship's.** Firing is a personal Combat/Free action: the character who fires picks the target. The ship's facing only limits which guns point that way.
- One firing action fires **one** broadside (one side) or **one** chaser.

### 6.2 Defense — Verteidigung

A ship's **Armor** is flat subtraction, like personal armor. Against **ship weapons** it counts **×10**, and at least 10 damage always gets through. Against **personal** weapons and spells it counts as written, and there is **no minimum** — a blow that doesn't beat the planking does nothing (Section 6.4). Ships do not use Evasion or Resilience; avoiding fire is handled through steering, not a defense roll. Against ship-mounted spells, **Guard Stones** (Section 9) reduce the magnitude first.

### 6.3 Hull 0 — Kampfunfähig

At **0 Hull** the ship is crippled: it stops dead in the water, can't fire, and will sink at the end of the fight unless it is repaired back above 0. Damage never takes Hull below 0.

### 6.4 Ship Scale — People against Ships (Schiffsmaßstab)

A ship is tons of oak and pine, not a person: one Hull point is a whole plank, a frame or a stretch of rail. So Hull runs about ten times higher than a character's HP, and ship weapons hit ten times harder (Section 6).

- **Personal weapons and spells** (a dagger, a cutlass, a musket ball, a fireball) roll their usual damage and subtract the ship's plain Armor, with no minimum. A dagger can't hurt a fishing boat; an axe can hack a hole in one given a minute or two; nothing a person carries troubles a man-of-war.
- **Sinking a small boat by hand** is still possible: it's just a lot of Combat actions with an axe, a crowbar or a hammer, or a fire left to spread — the GM decides how long a fire burns and what it costs.
- **Ship weapons against people:** guns are aimed at ships. Turning one on a person (grapeshot across a deck, a swivel gun at a boarding party) is the GM's call; a direct hit at ship scale kills anyone.

## 7. Repair — Reparatur

Reuses the core **First Aid** mechanic (Section 6.3), just renamed. Requires a consumable (spare timber, tar, canvas — *Ersatzholz, Teer, Segeltuch*):

- Fail → no repair, the resource is still used
- Normal success → repair 10 Hull
- Hard success → repair 20 Hull
- Extreme success → repair 40 Hull
- Limit: one repair attempt per ship, per character, per fight

Outside combat, a ship in a harbour or shipyard is fully repaired for a price set by the GM.

## 8. Boarding & Hazards — Entern & Gefahren

**Boarding** is a Combat/Free action and needs boarding gear (grappling hooks, planks, boarding axes — *Enterhaken, Enterbrücken, Enteräxte*). The gear is equipment, not a consumable.

1. The boarder rolls a fitting skill (Athletics, Ship Steering...) to close the gap and hook on. **High Sides** on the target ship give −20.
2. **On a success, the ship fight ends immediately.** The ships are locked together and combat drops straight to **personal combat** (core rules Section 4 and 10) — exactly as on land.
3. Characters who hadn't acted yet this round carry their actions into the personal fight.

**Hazards.** When the ship itself has to do something risky — threading a reef, riding out a storm, out-turning a pursuer in a chase — one character rolls **Ship Steering + the ship's Maneuverability**. This is the only time Maneuverability is used.

*Ramming and collision rules are on hold and will be added later.*

\page

# Part II — Guard Stones / Bannsteine

## 9. Guard Stone Terminal — Bannstein-Terminal

*Rare, element-locked stones that shrink incoming spells before they ever reach the hull.*

**The Terminal.** A ship can carry Guard Stones only if it has a **Guard Stone Terminal** — and no ship comes with one. A terminal is only ever gained **through the story**: salvaged from a wreck, granted by a patron, built by a mad artificer as payment for a debt. The GM sets its number of **slots** when it enters the game; each slot holds exactly one Guard Stone. Most terminals have 1–2 slots; 3 or more is the stuff of legend.

**Guard Stones (Bannsteine).** Rare, magically attuned gemstones — the ship-sized version of personal Wards (core rules Section 5.5). Each stone is locked to one element (currently just Fire, until a second element exists). Before an incoming spell of the matching element rolls damage, the stone **reduces its magnitude**. At magnitude 0 or lower, the spell fizzles. Whatever survives resolves normally, then the ship's Armor applies.

- A stone shrinks the spell itself, so the caster's degree of success doesn't affect it.
- **Stones never stack:** against any one spell only the **single best** stone of that element counts — the same rule as personal Wards. Filling several slots is worth it for covering **different elements**, not for doubling up.
- A stone does nothing against other elements, cannonballs or boarding axes.

| Guard Stone | Effect | Price (Dbl.) |
|---|---|---|
| Minor | Magnitude −1 | 8,000–15,000 |
| Moderate | Magnitude −2 | 25,000–45,000 |
| Major | Magnitude −3 | 60,000–100,000+ |

**Swapping stones** takes about a short rest's worth of crew work (core rules Section 6.1), so it can't happen mid-broadside. Spare stones can be kept in cargo, but only seated stones protect the ship.

**Rarity.** Guard Stones are a quest reward or a rumour to chase more often than shop stock. If the GM allows outright purchase, the price should feel like buying a warship.

**Looking ahead.** The same stones are the seed for offensive gem-weapons later — shot or blades that unleash the stone's element on a hit. That's left for a future document so the protective version gets played first.

\page

# Part III — Ship Compendium / Schiffskompendium

*Twenty-two ship types, from a dugout canoe and a fishing boat to the Golden Age's great men-of-war, sorted from small to large within each group. All values are fixed and mundane — no ship comes with a Guard Stone Terminal.*

## 10. Quick Reference

| Ship | Hull | Arm. | Speed | Hand. | Turn | Man. | Broadside | Price |
|---|---|---|---|---|---|---|---|---|
| Outrigger Canoe | 20 | 1 | 3 | 2 | 90° | +20 | — | 20 |
| Rowboat | 30 | 1 | 2 | 1 | 90° | +15 | — | 50 |
| Pinnace | 50 | 1 | 4 | 2 | 90° | +15 | — | 400 |
| Longship | 90 | 1 | 8 | 3 | 60° | +10 | — | 1,200 |
| War Galley | 100 | 2 | 5 | 3 | 90° | +15/−10 | — | 4,000 |
| Fishing Boat | 40 | 1 | 3 | 1 | 90° | +12 | — | 150 |
| Fishing Smack | 80 | 1 | 5 | 2 | 60° | +10 | — | 900 |
| Lighter | 120 | 2 | 1 | 1 | 30° | −15 | — | 600 |
| Cog | 150 | 3 | 3 | 1 | 30° | −5 | 1d4 | 1,900 |
| Fluyt | 130 | 2 | 3 | 1 | 30° | −10 | 1d4 | 3,000 |
| Merchantman | 220 | 3 | 4 | 1 | 45° | −5 | 2d4 | 4,500 |
| Caravel | 120 | 2 | 4 | 2 | 60° | +10 | 1d4 | 2,400 |
| Sloop | 140 | 2 | 7 | 2 | 90° | +18 | 2d4 | 2,800 |
| Schooner | 180 | 2 | 6 | 2 | 60° | +15 | 3d4 | 3,200 |
| Xebec | 170 | 2 | 6 | 2 | 90° | +15 | 3d4 | 3,600 |
| Brigantine | 260 | 3 | 4 | 2 | 45° | +5 | 4d4 | 6,000 |
| Revenue Cutter | 130 | 2 | 7 | 2 | 90° | +15 | 2d4 | 3,400 |
| Frigate | 450 | 4 | 6 | 2 | 45° | +5 | 5d6 | 18,000 |
| Man-of-War | 1,100 | 6 | 4 | 1 | 30° | −18 | 8d8 | 95,000 |
| Carrack | 400 | 4 | 4 | 1 | 30° | −12 | 4d6 | 15,000 |
| Galleon | 600 | 5 | 4 | 1 | 30° | −15 | 6d6 | 26,000 |
| East Indiaman | 480 | 4 | 5 | 1 | 30° | −8 | 5d6 | 38,000 |

## 11. Boats & Oared Ships — Boote & Ruderschiffe

### Outrigger Canoe (Auslegerkanu)
*Island craft — a dugout hull with a float lashed beside it.*

| Value | |
|---|---|
| Hull / Armor | 20 / 1 |
| Max Speed / Handling / Turn Rate | 3 / 2 / 90° |
| Maneuverability | +20 |
| Broadside / Chasers | — / — |
| Crew / Cargo | 2 / 0.2 t |
| Traits | Oars, Shallow Draft |
| Price | 20 Dbl. |

Paddled, or sailed with a small crab-claw sail, the outrigger is how island folk cross lagoons and hop between nearby islands. The float makes it far steadier than its size suggests. Paddles count as Oars.

**Benefits:** almost free, and any islander can build one; crosses reefs and lagoons nothing else can; light enough to carry up a beach.
**Flaws:** room for two and a basket; no shelter at all; open sea and storms are deadly.

### Rowboat / Jolly Boat (Ruderboot)
*Ancient through present — the boat every other ship carries.*

| Value | |
|---|---|
| Hull / Armor | 30 / 1 |
| Max Speed / Handling / Turn Rate | 2 / 1 / 90° |
| Maneuverability | +15 |
| Broadside / Chasers | — / — |
| Crew / Cargo | 4 / 0.3 t |
| Traits | Oars, Shallow Draft |
| Price | 50 Dbl. |

Every larger ship carries one or two of these as a tender, for landing parties, ferrying supplies, or a quiet approach a lookout won't spot. It has no role in ship-to-ship combat.

**Benefits:** costs almost nothing and needs no trained crew; silent approach with no sails to spot; fits aboard a larger ship.
**Flaws:** no cargo or armament to speak of; a stiff wave can swamp it; useless in open ocean or rough seas.

### Pinnace (Pinasse)
*A big ship's boat with a mast — the longboat that can make a voyage of its own.*

| Value | |
|---|---|
| Hull / Armor | 50 / 1 |
| Max Speed / Handling / Turn Rate | 4 / 2 / 90° |
| Maneuverability | +15 |
| Broadside / Chasers | — / Swivel gun 1d4 (bow) |
| Crew / Cargo | 12 / 2 t |
| Traits | Oars, Shallow Draft |
| Price | 400 Dbl. |

Larger ships carry a pinnace for cutting-out raids, scouting shoals and carrying a landing party with its gear. With a swivel gun in the bow and a dozen oars it can take a small boat — or run from a big one into water too shallow to follow.

**Benefits:** sails or rows; takes a whole landing party; the swivel gun gives it real teeth for its size.
**Flaws:** open boat — wet, cold and exposed on any longer trip; needs a mother ship to carry or tow it; anything with a broadside outguns it.

### Viking-Style Longship (Langschiff)
*Ancient/early medieval raider.*

| Value | |
|---|---|
| Hull / Armor | 90 / 1 |
| Max Speed / Handling / Turn Rate | 8 / 3 / 60° |
| Maneuverability | +10 (−10 in storms or high seas) |
| Broadside / Chasers | — / — (spears, axes, bows) |
| Crew / Cargo | 40 / 15 t |
| Traits | Oars, Shallow Draft |
| Price | 1,200 Dbl. |

A long, shallow, double-ended hull that can land on a beach or slip up a river as easily as it crosses open water. Oars give it a burst of speed no pure sailing ship can match when the wind dies.

**Benefits:** reaches rivers and beaches no larger ship can follow; moves in a dead calm; a huge crew for its size makes it a strong boarding platform.
**Flaws:** open deck with no shelter from weather or fire; very little cargo space; thin hull and low sides perform badly in storms.

### War Galley (Kriegsgaleere)
*Trireme/penteconter style — the classic Mediterranean warship.*

| Value | |
|---|---|
| Hull / Armor | 100 / 2 |
| Max Speed / Handling / Turn Rate | 5 / 3 / 90° |
| Maneuverability | +15 in calm/coastal water, −10 on open sea or in storms |
| Broadside / Chasers | — / Ballista 1d8 (bow, rotates) |
| Crew / Cargo | 120 / 15 t |
| Traits | Oars, Ram |
| Price | 4,000 Dbl. |

Built for speed and precision rather than durability, the war galley trades cargo and open-ocean resilience for a devastating ram and unmatched short-range agility. It's at its best hugging a coastline in fair weather.

**Benefits:** the bronze ram; independent of wind; exceptional agility in sheltered water; a large marine complement for boarding.
**Flaws:** poor seaworthiness away from the coast; an enormous crew of mostly non-combatant rowers; almost no cargo room.

\page

## 12. Working Boats — Arbeitsboote

### Fishing Boat (Fischerboot)
*The open boat every harbour is full of.*

| Value | |
|---|---|
| Hull / Armor | 40 / 1 |
| Max Speed / Handling / Turn Rate | 3 / 1 / 90° |
| Maneuverability | +12 |
| Broadside / Chasers | — / — |
| Crew / Cargo | 3 / 2 t |
| Traits | Oars, Shallow Draft |
| Price | 150 Dbl. |

One mast, a few oars, nets and a fish well: out at dawn, back by dusk. Nobody looks twice at a fishing boat, which makes it a fine way to slip into a harbour, land a message, or watch a fleet at anchor.

**Benefits:** cheap and found in every port; draws no attention at all; a handful of people can work it.
**Flaws:** a day's range — no stores for a real voyage; no defence whatsoever; smells of fish, forever.

### Fishing Smack (Fischkutter)
*A decked fishing vessel that stays out for days.*

| Value | |
|---|---|
| Hull / Armor | 80 / 1 |
| Max Speed / Handling / Turn Rate | 5 / 2 / 60° |
| Maneuverability | +10 |
| Broadside / Chasers | — / — |
| Crew / Cargo | 6 / 25 t |
| Traits | Shallow Draft, Weatherly |
| Price | 900 Dbl. |

Built to work the banks in any weather and race home with the catch, the smack is sturdier and faster than it looks. Many a smuggler started out as a fisherman who found a better-paying cargo.

**Benefits:** seaworthy, quick and handy for its size; a real hold below deck; still looks innocent.
**Flaws:** no guns; small crew quarters; its hold always smells of fish, which customs men know to search.

### Lighter (Leichter)
*Flat harbour barge for loading and unloading ships at anchor.*

| Value | |
|---|---|
| Hull / Armor | 120 / 2 |
| Max Speed / Handling / Turn Rate | 1 / 1 / 30° |
| Maneuverability | −15 |
| Broadside / Chasers | — / — |
| Crew / Cargo | 6 / 80 t |
| Traits | Oars, Shallow Draft |
| Price | 600 Dbl. |

Where there is no quay, cargo goes ashore by lighter: a broad, flat, heavy barge rowed or poled between ship and beach. Useless at sea, indispensable in a harbour — and the quickest way to get a prize's hold emptied before anyone comes looking.

**Benefits:** carries a trader's worth of cargo; goes right up onto a beach; sturdy and cheap.
**Flaws:** barely moves; hopeless outside a harbour or river; no defence at all.

\page

## 13. Traders — Handelsschiffe

### Cog (Kogge)
*Medieval merchant workhorse of the northern seas.*

| Value | |
|---|---|
| Hull / Armor | 150 / 3 |
| Max Speed / Handling / Turn Rate | 3 / 1 / 30° |
| Maneuverability | −5 |
| Broadside / Chasers | 1d4 / — |
| Crew / Cargo | 12 / 120 t |
| Traits | High Sides |
| Price | 1,900 Dbl. |

A round-hulled, flat-bottomed trader built to move as much cargo as possible with as small a crew as possible. Slow and clumsy, but its high sides make it a hard ship to board.

**Benefits:** cheap and simple to sail; excellent cargo-to-crew ratio; hard for small raiders to board.
**Flaws:** painfully slow; barely armed; a single mast means no backup if the rigging is damaged.

### Fluyt (Fleute)
*Dutch cargo specialist — huge hold, tiny crew.*

| Value | |
|---|---|
| Hull / Armor | 130 / 2 |
| Max Speed / Handling / Turn Rate | 3 / 1 / 30° |
| Maneuverability | −10 |
| Broadside / Chasers | 1d4 / — |
| Crew / Cargo | 15 / 280 t |
| Traits | Shallow Draft |
| Price | 3,000 Dbl. |

Purpose-built to haul the most cargo for the least money, the fluyt's pear-shaped hull and clever rigging let a handful of sailors manage a hold most ships would need triple the crew for. It was never meant to fight.

**Benefits:** best cargo-to-crew ratio of any ship here; cheap to run; reaches minor ports other cargo ships can't.
**Flaws:** nearly unarmed; slow and clumsy; a huge, lightly defended hold makes it a favourite target.

### Merchantman (Kauffahrer)
*The everyday prize — plain, common, and exactly what most trade routes look like.*

| Value | |
|---|---|
| Hull / Armor | 220 / 3 |
| Max Speed / Handling / Turn Rate | 4 / 1 / 45° |
| Maneuverability | −5 |
| Broadside / Chasers | 2d4 / — |
| Crew / Cargo | 25 / 200 t |
| Traits | — |
| Price | 4,500 Dbl. |

The ship that carries most of the world's trade — nothing special to look at, armed just enough to make a lone raider think twice. The bread-and-butter target for a crew looking for a reliable payday.

**Benefits:** there's always another one on the horizon; predictable cargo and defences; cheap to refit if captured intact.
**Flaws:** a decent payday, not a legendary one; folds quickly against a determined attacker; can't run from anything.

\page

## 14. Raiders — Kaperschiffe

### Caravel (Karavelle)
*Age-of-Exploration scout and light trader.*

| Value | |
|---|---|
| Hull / Armor | 120 / 2 |
| Max Speed / Handling / Turn Rate | 4 / 2 / 60° |
| Maneuverability | +10 |
| Broadside / Chasers | 1d4 / — |
| Crew / Cargo | 20 / 70 t |
| Traits | Shallow Draft, Weatherly |
| Price | 2,400 Dbl. |

Small, cheap and easy to handle, the caravel's lateen sails let it work close to the wind — a rare trick among older ship types. It scouts coastlines and river mouths bigger ships can't approach.

**Benefits:** explores where larger ships can't; sails well against the wind; cheap, with a small capable crew.
**Flaws:** small hold; light frame and weak guns; cramped on long voyages.

### Sloop (Slup)
*The quintessential pirate raider.*

| Value | |
|---|---|
| Hull / Armor | 140 / 2 |
| Max Speed / Handling / Turn Rate | 7 / 2 / 90° |
| Maneuverability | +18 |
| Broadside / Chasers | 2d4 / — |
| Crew / Cargo | 30 / 85 t |
| Traits | Shallow Draft |
| Price | 2,800 Dbl. |

Fast, shallow and worked entirely from the deck, the sloop was the first ship of nearly every Golden Age pirate. It outruns almost anything bigger and vanishes into water no warship dares follow.

**Benefits:** best speed and agility among common ships; reaches hideouts warships can't; a small skilled crew suffices.
**Flaws:** modest cargo and guns; a thin hull struggles against a heavy broadside; it wins by not getting hit.

### Schooner (Schoner)
*Fast, fore-and-aft rigged all-rounder.*

| Value | |
|---|---|
| Hull / Armor | 180 / 2 |
| Max Speed / Handling / Turn Rate | 6 / 2 / 60° |
| Maneuverability | +15 |
| Broadside / Chasers | 3d4 / — |
| Crew / Cargo | 30 / 95 t |
| Traits | Shallow Draft, Weatherly |
| Price | 3,200 Dbl. |

The sloop's speed and shallow draft with a bit more cargo and gun capacity — strong for raiding, smuggling and running blockades alike.

**Benefits:** nearly sloop-level agility with more guns; suits smuggling and coastal raids; two masts give redundancy.
**Flaws:** more rigging to maintain; outgunned by any real warship; thin hull.

### Xebec (Xebeke)
*Corsair hybrid of galley and lateen-rigged sailer.*

| Value | |
|---|---|
| Hull / Armor | 170 / 2 |
| Max Speed / Handling / Turn Rate | 6 / 2 / 90° |
| Maneuverability | +15 |
| Broadside / Chasers | 3d4 / 1d4 bow |
| Crew / Cargo | 35 / 100 t |
| Traits | Oars, Weatherly |
| Price | 3,600 Dbl. |

A favourite of corsairs, the xebec combines a galley's independence from the wind with a fast sailing rig, giving it legendary agility for hit-and-run raids on merchant shipping.

**Benefits:** oars plus real sailing speed; superb agility; a fair balance of cargo and guns.
**Flaws:** needs oarsmen and sailors; less cargo than a trader; can't out-row a true war galley.

### Brigantine (Brigantine)
*Balanced two-masted workhorse.*

| Value | |
|---|---|
| Hull / Armor | 260 / 3 |
| Max Speed / Handling / Turn Rate | 4 / 2 / 45° |
| Maneuverability | +5 |
| Broadside / Chasers | 4d4 / 1d4 bow, 1d4 stern |
| Crew / Cargo | 60 / 200 t |
| Traits | — |
| Price | 6,000 Dbl. |

A true jack-of-all-trades: enough cargo to trade, enough guns to fight, enough crew to do both. Many successful captains "graduate" from a sloop into a brigantine.

**Benefits:** strong balance of speed, cargo and guns; durable enough for long campaigns; a prestigious step up.
**Flaws:** less nimble than a sloop or schooner; needs a sizeable crew; costlier to maintain.

\page

## 15. Warships — Kriegsschiffe

### Revenue Cutter (Zollkutter)
*Small, fast government cruiser — the smuggler's and the pirate's everyday enemy.*

| Value | |
|---|---|
| Hull / Armor | 130 / 2 |
| Max Speed / Handling / Turn Rate | 7 / 2 / 90° |
| Maneuverability | +15 |
| Broadside / Chasers | 2d4 / 1d4 bow |
| Crew / Cargo | 40 / 20 t |
| Traits | Shallow Draft, Weatherly |
| Price | 3,400 Dbl. |

A single huge sail plan on a small, sharp hull: the cutter is built to catch sloops and smugglers, not to fight warships. It patrols coasts and harbour mouths with a crew big enough to put a boarding party aboard whatever it stops.

**Benefits:** as fast as a sloop and better close to the wind; a bow chaser for running fights; enough crew to board.
**Flaws:** light guns and a thin hull; tiny hold; its crew answers to someone ashore, and using one draws the authorities' attention.

### Frigate (Fregatte)
*Fast, heavily armed warship.*

| Value | |
|---|---|
| Hull / Armor | 450 / 4 |
| Max Speed / Handling / Turn Rate | 6 / 2 / 45° |
| Maneuverability | +5 |
| Broadside / Chasers | 5d6 / 1d4 bow, 1d4 stern |
| Crew / Cargo | 220 / 65 t free hold |
| Traits | — |
| Price | 18,000 Dbl. |

Fast enough to chase down almost anything smaller and armed to outfight almost anything bigger — the closest thing to an ideal warship, and the traditional flagship of a truly successful pirate captain.

**Benefits:** heavy guns with real speed; catches smaller ships, outruns bigger ones; a flagship of renown.
**Flaws:** expensive to buy and keep; a large crew to recruit and pay; a very obvious target.

### Man-of-War / Ship of the Line (Linienschiff)
*The largest and most heavily armed vessel afloat.*

| Value | |
|---|---|
| Hull / Armor | 1,100 / 6 |
| Max Speed / Handling / Turn Rate | 4 / 1 / 30° |
| Maneuverability | −18 |
| Broadside / Chasers | 8d8 / 2d6 bow, 2d6 stern |
| Crew / Cargo | 600 / 100 t free hold |
| Traits | High Sides |
| Price | 95,000 Dbl. |

A floating fortress whose broadside ends most fights before they start. Ordinary pirates never own one — they're state property, and capturing one is the stuff of legend.

**Benefits:** overwhelming firepower; the most Hull of any ship; terrifying on sight.
**Flaws:** essentially unattainable; slow and clumsy; upkeep far beyond a normal crew's means.

*Warship cargo is free hold space only — most of the tonnage is guns, powder and crew.*

## 16. Great Haulers — Große Frachtschiffe

### Carrack (Karacke)
*The lumbering long-hauler that came before the galleon.*

| Value | |
|---|---|
| Hull / Armor | 400 / 4 |
| Max Speed / Handling / Turn Rate | 4 / 1 / 30° |
| Maneuverability | −12 |
| Broadside / Chasers | 4d6 / 1d4 bow |
| Crew / Cargo | 90 / 450 t |
| Traits | High Sides |
| Price | 15,000 Dbl. |

High-sided, round-bellied and built for endurance, the carrack survives months at sea but is top-heavy and slow to answer the helm. A well-loaded carrack is a genuinely rich prize.

**Benefits:** a very sturdy hull for its era; hard to board; substantial cargo and fair defences in one hull.
**Flaws:** top-heavy and slow to turn; cramped crew quarters; a sloop can pick the terms of any fight.

\page

### Galleon (Galeone)
*Massive treasure and trade ship.*

| Value | |
|---|---|
| Hull / Armor | 600 / 5 |
| Max Speed / Handling / Turn Rate | 4 / 1 / 30° |
| Maneuverability | −15 |
| Broadside / Chasers | 6d6 / 2d4 bow, 1d4 stern |
| Crew / Cargo | 180 / 700 t |
| Traits | High Sides |
| Price | 26,000 Dbl. |

Built to haul a kingdom's treasure across an ocean, the galleon carries enormous cargo and enough guns to make most attackers think twice — but it turns like a barn door and can't outrun a determined pursuer.

**Benefits:** a massive hold; heavy guns; high sides and a sterncastle against boarders.
**Flaws:** easy to out-turn; slow; huge upkeep; a magnet for pirates and pirate-hunters alike.

### East Indiaman (Ostindienfahrer)
*The big prize — rich cargo, real teeth, and a fight worth planning for.*

| Value | |
|---|---|
| Hull / Armor | 480 / 4 |
| Max Speed / Handling / Turn Rate | 5 / 1 / 30° |
| Maneuverability | −8 |
| Broadside / Chasers | 5d6 / 1d4 bow, 1d4 stern |
| Crew / Cargo | 120 / 1,000 t |
| Traits | High Sides |
| Price | 38,000 Dbl. |

Built to haul immensely valuable cargo through dangerous waters, the East Indiaman carries enough guns to be mistaken for a warship — and can fight like one. Not an easy mark: the prize a crew plans a whole campaign around.

**Benefits:** the richest cargo a crew can realistically capture; armed to bluff or beat casual attackers; hard to board.
**Flaws:** genuinely dangerous to attack; slow to replace if damaged in the taking; often travels with naval escorts.
