# Ship Rules — Schiffsregeln

*Standalone module for the Pirate d100 system. Ships reuse the core rules wherever possible: the normal/hard/extreme ladder, weapon damage and Armor, the First Aid mechanic, and Wards. Names are given in English with a German gloss.*

## 1. Your Ship — Euer Schiff

Ships are **not built with points**. The GM hands the crew a ship of one of the types in the Ship Compendium (Part III), and it comes with that type's **fixed values** — no ranges, no rolling, nothing to calculate, no upgrade shopping. A sloop is always a sloop: every sloop has the same Hull, Armor, speed and guns, and they are the ones in the compendium.

The compendium is the only place those values live. A ship keeps following its type: if a type's values are corrected, every ship of that type changes with them.

If a ship ever changes, it's because of the story — a shipwright's favour, a cursed figurehead, a Guard Stone Terminal pried from a wreck (Section 9). The GM writes it on the ship's record; a story change replaces just that one value, and everything else still comes from the type:

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
| **Hull** | Rumpf | The ship's HP (Section 6.4). At 0 the ship is crippled (Section 6.3). |
| **Armor** | Panzerung | The planking: flat damage reduction like personal Armor, but with no minimum damage (Section 6.2). |
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

Ship weapons (cannons, ballistae, ship-mounted spells) resolve **exactly like personal combat** (core rules, Section 4):

1. The gunner rolls their weapon skill.
2. On a hit, roll the weapon's damage dice.
3. The degree of success degrades the target's Armor: normal → full, hard → halved, extreme → ignored.

*Example:* a 3d8 broadside rolls 5 + 4 + 6 = 15. Against a ship with Armor 3 on a normal success, 12 Hull comes off; on a hard success (Armor halved to 1) 14.

### 6.1 Guns — Geschütze

- **Each die is one gun battery,** and the die is the weight of its guns: **d8** light guns, **d10** medium guns, **d12** heavy guns. A broadside of 7d12 is seven batteries of heavy guns — every battery is on the table.
- **Broadside (Breitseite)** guns fire only to their own side, at full strength.
- **Chasers (Jagdkanonen)** are one die size smaller (never below d6, a swivel gun) but rotate to fire in any direction.
- **Direction is the gunner's choice, not the ship's.** Firing is a personal Combat/Free action: the character who fires picks the target. The ship's facing only limits which guns point that way.
- One firing action fires **one** broadside (one side) or **one** chaser.

### 6.2 Defense — Verteidigung

A ship's **Armor** is its planking: flat subtraction, like personal armor, halved on a hard success and ignored on an extreme one. Unlike personal armor there is **no minimum damage** — a hit that doesn't beat the planking does nothing (Section 6.4). That is what keeps a sloop's light guns from ever sinking a man-of-war. Ships do not use Evasion or Resilience; avoiding fire is handled through steering, not a defense roll. Against ship-mounted spells, **Guard Stones** (Section 9) reduce the magnitude first.

### 6.3 Hull 0 — Kampfunfähig

At **0 Hull** the ship is crippled: it stops dead in the water, can't fire, and will sink at the end of the fight unless it is repaired back above 0. Damage never takes Hull below 0.

### 6.4 People against Ships — Menschen gegen Schiffe

A ship is tons of oak and pine, not a person. Its Armor (the planking) is thick enough that most personal weapons never get through it, and with no minimum damage (Section 6.2) a blow that doesn't is simply wasted.

- **Personal weapons and spells** (a dagger, a cutlass, a musket ball, a fireball) roll their usual damage against the ship's Armor. A dagger can't hurt a fishing boat; an axe hacks a hole in one in a few rounds; nothing a person carries troubles a man-of-war. Only the strongest magic dents a real ship.
- **Sinking a small boat by hand** takes many Combat actions with an axe, a crowbar or a hammer — or a fire left to spread, which the GM runs as a hazard (how long it burns, what it costs).
- **Ship weapons against people:** guns are aimed at ships. Turning one on a person (grapeshot across a deck, a swivel gun at a boarding party) is the GM's call; a direct hit kills anyone.

## 7. Repair — Reparatur

Reuses the core **First Aid** mechanic (Section 6.3), just renamed. Requires a consumable (spare timber, tar, canvas — *Ersatzholz, Teer, Segeltuch*):

- Fail → no repair, the resource is still used
- Normal success → repair 4 Hull
- Hard success → repair 8 Hull
- Extreme success → repair 16 Hull
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

*Ship types from an outrigger canoe and a fishing boat to the Golden Age's great men-of-war, sorted from small to large within each group. All values are fixed and mundane — no ship comes with a Guard Stone Terminal. Every type lives in its own file in `rules/ships/`; this compendium, the Ship Gallery and the GM's shipyard are all built from those files.*

\shipcompendium
