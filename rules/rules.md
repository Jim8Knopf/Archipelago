# Pirate d100 Ruleset — Working Draft

*A d100, roll-under system inspired by Call of Cthulhu / BRP and How to be a Hero. This document consolidates everything decided so far. Remaining unresolved questions are tracked in Section 12.*


## 1. Core Resolution

- Roll d100, **under your skill value** to succeed.
- Three degrees of success, using the same skill value every time:
  - **Normal success** — roll ≤ full skill value
  - **Hard success** — roll ≤ half skill value
  - **Extreme success** — roll ≤ one-fifth skill value
  - **Fail** — roll above skill value
- This same normal/hard/extreme ladder is reused everywhere in the system (skills, weapons, magic, evasion) so players only ever learn one resolution pattern.
- **A roll of 00 is always an automatic Extreme Success**, regardless of skill value — even for an untrained character with no dots in that skill at all.


## 2. Attributes: HP & Movement

**HP** uses a point-buy curve:

> Derived stat = the largest `n` such that `n(n+1)/2 ≤ points invested`

This means **each additional point of HP costs one more point to buy than the last one did** (going from 9→10 costs 10 points, 10→11 costs 11, and so on). It creates a natural soft cap without an arbitrary maximum. Low HP totals are intentional (single digits to low twenties for most characters).

**Movement** uses a flatter curve, tuned to keep speed values grounded even at high investment:

> Derived stat = `INT(SQRT(4 × points invested) / 2)` — which simplifies to `INT(SQRT(points invested))`

A 100-point investment yields Movement 10 — reasonably fast, nowhere near absurd. Any nonzero investment gives at least Movement 1, avoiding characters rooted in place. Movement is in m/s.


## 3. Skills

### 3.1 Basic Skills
Freeform, player-defined (Stealth, Perception, Swim, Sleight of Hand, First Aid, Ship Steering, etc.). Each skill is bought individually, and every skill belongs to one of five fixed **skill groups**:

| Group | Covers | Examples |
|---|---|---|
| **Physical** | body control, strength, agility, stamina | Climbing, Swim, Stealth, Acrobatics, Carousing |
| **Social** | dealing with people | Persuasion, Intimidation, Haggling, Etiquette, Disguise |
| **Nature** | surviving and finding your way outdoors | Tracking, Orienteering, Weather Sense, Fishing, Animal Lore |
| **Knowledge** | learned, theoretical know-how | History, Navigation Theory, Herb Lore, Law, Arcane Lore |
| **Crafting** | making, fixing and practical handiwork | First Aid, Carpentry, Lockpicking, Cooking, Ship Steering |

The player decides (with the GM) which group a new skill fits best. Skills in the same group partially train each other with the same transfer bonus as weapons and magic (Section 3.2). Standard normal/hard/extreme ladder applies.

**Skill Transfer (using a related skill instead):** a character can attempt a task with a skill they don't have, using a related one instead, if the GM allows it — always at a **malus** the GM sets on the spot, based on:
- **How closely related** the skill is to the task — a near-perfect match gets a small malus, a stretch gets a bigger one.
- **How general the skill itself is** — a broad, catch-all skill (e.g. a player-defined "Dexterity" instead of specific skills like Sleight of Hand, Lockpicking, or Acrobatics) can be used for almost anything, but that breadth is exactly what earns it a bigger malus every time. A narrowly defined skill (e.g. "Pick Pockets") never needs a malus for its one specific use, but also can't cover anything else.

GM-decided rather than formula-derived — quick at the table, no lookup table needed. It also doubles as a built-in check against naming an overly broad skill at creation: covering more ground always costs something in reliability. (This is separate from the automatic group transfer bonus in 3.2 below, which is a fixed formula, not a per-attempt GM call.)

### 3.2 Cross-Training — Skill Groups, Weapons, Magic and Languages
All four share one mechanic: skills within the same **category** partially train each other.

- Basic skills go into one of the five fixed skill groups (Section 3.1); group weapons/spells/languages into categories (e.g. **Physical**: Swim, Climbing; **Sword**: Saber, Longsword; **Pistol**: Single Barrel, Gun; **Fire magic**: Spark, Dry Cloths, Fireball). All languages form a single category.
- Each category has a **transfer bonus** = (sum of *raw* invested points across all skills in that category) ÷ 10, rounded down.
- That bonus is added on top of each individual skill's raw value to get its **effective** value.
- The bonus must be calculated from raw invested points, not effective values — otherwise it compounds on itself every time it's recalculated.

\page

## 4. Combat: Attacks & Damage

1. Attacker rolls their weapon/spell skill. Fail = no hit, no further steps.
2. On a hit, roll damage dice for the weapon or spell magnitude (see Section 5 for spell damage).
3. The attacker's degree of success determines how well the defender's chosen defense holds up:
   - **Normal success** → the defense applies at full strength.
   - **Hard success** → the defense is halved.
   - **Extreme success** → the defense is bypassed entirely.

### 4.1 Defense — Armor or Evasion (either/or, not both)

**Armor** (default, no roll):
- Flat subtraction from incoming damage. Halved on a hard success, ignored entirely on an extreme success.
- **Minimum 1 damage always gets through** whenever armor applies at all.
- Simple, always-on, no dice.

**Evasion** (active choice, replaces armor entirely for that hit):
- On a normal success by the attacker, the defender rolls Evasion as normal:
  - Normal success → damage halved
  - Hard success → damage reduced to 1
  - Extreme success → damage reduced to 0 (clean dodge)
- On an attacker's **hard success**, the defender rolls against **half** their Evasion value instead, deriving their own normal/hard/extreme tiers from that halved number.
- On an attacker's **extreme success**, no Evasion roll happens at all — full damage, same as a failed dodge.
- If the Evasion roll fails, **armor does not apply either** — you committed to dodging instead of blocking, and you guessed wrong, so you take the hit in full. That built-in risk is the balancing cost of choosing to dodge — no extra penalty is needed on top of it.

Evasion = evasion skill + full movement.

**Against damage spells**, Resilience is a third choice alongside Armor and Evasion — see Section 5.5.

\page

## 5. Magic

### 5.1 Mana Pool
- Each character starts with **one element** (e.g. Fire), and therefore **one mana pool** for now. Whether to split pools per-element later is an open conversation to have with players once more disciplines exist.
- **Max Mana = Mana points invested × (sum of the transfer bonuses of all your magic categories) ÷ 2**, rounded down. Mana points are bought from the creation pool like any other points (Section 7). *Example:* 15 Mana points with a Fire magic bonus of +10 gives 15 × 10 ÷ 2 = **75 mana**.
- Because both factors grow with investment, a dedicated caster can reach very large pools, which is intended; the cost curve below is what keeps that from being overpowered, not the pool size.

### 5.2 Magnitude Scale (freeform, no spell list)
Rather than pre-writing every spell, spells are pitched by players and slotted into a magnitude by comparing to anchor examples — same instinct as judging a hard vs. extreme skill check.

| Magnitude | Feel | Anchor examples (Fire) | Damage dice |
|---|---|---|---|
| 1 – Cantrip | Trivial, momentary | Light a candle, warm your hands | — (utility only) |
| 2 – Minor | Real but small | Fist-sized flame you can throw, dry out gear | 1d4 |
| 3 – Moderate | A proper effect | A real fireball, superheat a blade | 1d6 |
| 4 – Major | Battlefield-changing | Wall of fire, burn out a room | 1d8 |
| 5 – Extreme | Rare, dramatic | Fire that keeps burning without fuel | 2d6 |
| 6 | | | 2d8 |
| 7 | | | 3d6 |
| 8 | | Summon a fire elemental, ignite the unburnable | 3d8 |

**Modifiers** (adjust magnitude, no new spells needed):
- Bigger area, longer duration, more precision demanded → **+1 magnitude**
- Added drawback, narrower use-case, slower cast time → **−1 magnitude**

**Access gating:** a character can only attempt magnitudes that fall within their own success-tier reach — a magnitude within your "hard success" threshold is a normal attempt; above that requires rolling a hard/extreme success just to go off at all; beyond your extreme-success threshold, it's not attemptable regardless of mana. This ties magic's power ceiling to skill investment, the same way combat skill gates what a character can reliably hit.

### 5.3 Casting Cost
Base cost per magnitude follows a **doubling** curve (chosen specifically because it stays cheap for cantrips but gets steep fast at the top, so a large mana pool doesn't trivialize high-magnitude spells):

| Magnitude | Base cost | Normal success (×5) | Hard success (×2.5) | Extreme success / Fail |
|---|---|---|---|---|
| 1 | 1 | 5 | 3 | 1 |
| 2 | 2 | 10 | 5 | 2 |
| 3 | 4 | 20 | 10 | 4 |
| 4 | 8 | 40 | 20 | 8 |
| 5 | 16 | 80 | 40 | 16 |
| 6 | 32 | 160 | 80 | 32 |
| 7 | 64 | 320 | 160 | 64 |
| 8 | 128 | 640 | 320 | 128 |

- **Fail costs the same as Extreme success** (the low end of the table) — even a botched cast should sting a little, but not as much as a clumsy full-price attempt.
- Cantrips stay cheap under every outcome, preserving low-stakes "fluff" casting.
- Top-magnitude spells cost enough that even a very large pool only supports a handful of casts, keeping big magic rare without needing a damage-side penalty to compensate.
- A **natural 00** while casting is an automatic Extreme Success (Section 1), so it costs the cheap Extreme-success rate, plus the usual +1 skill point from Section 11.1 — no additional refund on top of that, so it can't be used to make high-magnitude spells free.

### 5.4 Spell Damage
Roll the dice from the magnitude table (after any magnitude reduction from Section 5.5), then resolve exactly like weapon damage (Section 4): straight to the defender's chosen Armor or Evasion. No separate success-based damage reduction on the caster's side — the cost table above is what keeps top-end magic in check, not a second damage penalty.

\page

### 5.5 Defending Against Magic
Magic is resisted in two ways: **Resilience** makes the spell harder to land, and **Wards** reduce its magnitude. The caster always pays the mana for the original magnitude.

**Resilience (Widerstandskraft)** — a basic skill, freeform like any other (Willpower, Iron Nerve, Warding Lore...); the broad-skill malus from Section 3.1 applies. Resilience is **never rolled**. Instead it lowers the caster's chance: the caster rolls against **their skill − half your Resilience**, and derives normal/hard/extreme from that lowered value. Access gating (Section 5.2) still uses the caster's unmodified skill.
- **Damage spells:** Resilience is one of your three defense choices (Armor, Evasion or Resilience). If the spell still hits, it deals full damage — armor does not apply.
- **Non-damage spells:** Resilience always applies; there is no choice to make (see Section 5.6).
- If the lowered value is 0 or less, only a natural 00 can affect you (Section 1).

**Wards (Bannsteine)** — the passive defense. Element-locked charms, amulets or gemstones, the personal version of the ship Guard Stones:

| Tier | Magnitude reduction |
|---|---|
| Minor | −1 |
| Moderate | −2 |
| Major | −3 |

A ward only works against spells of its own element. It works automatically on top of whichever defense you chose, and the caster's degree of success does not affect it. You can carry wards of **different elements** (a Fire ward and a Mind ward both protect you, each against its own element), but against any one spell only your **single best matching ward** counts — wards of the same element never stack. A spell reduced to magnitude 0 or lower has no effect.

**Order of resolution:** ward lowers the magnitude → caster rolls against their skill (minus half Resilience, if chosen) → damage dice from the final magnitude, then Armor or Evasion if that was the chosen defense.

{{note
#### Example — Fireball vs. Resilience and Ward
A caster with Fire skill 60 throws a magnitude 6 fireball (2d8). The target wears a Moderate Fire ward (−2 → magnitude 4, 1d8) and chooses Resilience 30, so the caster needs **60 − 15 = 45** or less (hard ≤ 22, extreme ≤ 9). They roll 38: a hit. The fireball does 1d8, and armor does not apply.
}}

### 5.6 Non-Damage Spells (Charm, Sleep, Fear...)
Same rule, nothing new to learn — but these spells are **hit or miss**: if the caster's roll succeeds, the effect lands at its (ward-reduced) magnitude; if it fails, nothing happens.

- **Only Resilience and Wards apply.** Armor and Evasion cannot stop a mind or body effect, so there is no either/or choice to make — Resilience always lowers the caster's chance, and the ward works on top, as usual.
- **Willing targets** (buffs, healing, a friendly charm) can waive their Resilience and take the spell at full magnitude.
- **Mixed spells** (damage plus an effect, like a burning curse) use the one chosen defense for both parts.

\page

## 6. Healing & Resource Regeneration

### 6.1 Short Rest
Recover **1/10 of max HP and max mana** (round down, minimum 1).

### 6.2 Long Rest
Recover **half of currently missing HP and mana** (round up). This can never fully top you off in a single rest — meaningful wear can linger across a rough island. Full restoration happens only at the Island Reset (Section 11.3).

### 6.3 First Aid (in-combat / urgent care)
Uses the First Aid basic skill, and requires a consumable (bandage, kit charge, etc.):
- Fail → no healing; the resource is still used up.
- Normal success → heal 1
- Hard success → heal 2
- Extreme success → heal 4

Limit: one attempt per patient, per healer, per fight — the resource cost is what keeps this in check, not the roll.

### 6.4 Magic Healing
Uses the same magnitude table as damage spells (Section 5.2) — identical cost and access gating — but the **healing dice** are read from the damage-dice column **one magnitude lower** than the spell's own magnitude:

| Spell Magnitude | Healing dice |
|---|---|
| 3 | 1d4 |
| 4 | 1d6 |
| 5 | 1d8 |
| 6 | 2d6 |
| 7 | 2d8 |
| 8 | 3d6 |

Magnitude 1–2 healing spells have no healing dice — they can soothe, clean or stabilise, but don't restore HP.

### 6.5 In-Combat Mana: Channel
Spend your action to recover **1/10 of max mana**. Channeling leaves you wide open until your next turn: you can't choose Evasion or Resilience, and your Resilience does **not** lower casters' chances against you — not even against non-damage spells like Charm. Armor still applies passively, and so do Wards.


## 7. Character Creation

**800 points, freely distributed** across HP, Movement, Evasion, Mana, Basic Skills, and Weapons/Magic/Languages — no dedicated sub-pools, no hard per-skill caps. This comfortably covers a 13 HP baseline (which only costs 91 points on its own) while leaving room to spread across several basic skills and more than one or two weapons/spells per category, matching cross-training's intent. GM discretion applies to any wildly lopsided allocation, same spirit as the inventory rule (Section 9).


## 8. Traits: Advantages & Flaws

Same philosophy as magic's magnitude scale — no exhaustive list to maintain, players pitch their own trait and it gets slotted into a tier by comparing to anchor examples.

| Tier | Point value | Example Advantage | Example Flaw |
|---|---|---|---|
| Minor | 15 | Steady Hands (+5 to a fine-motor skill) | Seasickness (penalty until acclimated each voyage) |
| Moderate | 30 | Sea Legs (ignore rough-weather penalties) | Gambling Addiction (compelled to bet when the chance arises) |
| Major | 50 | Uncanny Luck (reroll once per session) | Wanted (Navy patrols actively hunt you) |

- **Advantages** cost points out of the character creation pool — no free lunch; a heavily-advantaged character is trading away raw skill investment for it.
- **Flaws** grant bonus points to spend elsewhere, capped at roughly 100 points total (2–3 flaws), so nobody stacks minor flaws purely to farm points without ever living with them.

### Making Flaws Matter — Compel
A flaw that only exists on paper is just a discount. To make it a real ongoing mechanic: at any point, the GM can **compel** a character's flaw — invoking it to complicate the current scene (the gambler stumbles onto a high-stakes game right when the crew needs to move fast; the wanted pirate gets recognized by a guard). The player then chooses:
- **Accept it** — the complication plays out, and they get a small immediate reward (+1d10 to the skill value of their next roll, a bit of free mana/HP recovery — whichever currency fits the moment).
- **Refuse it** — the complication is avoided, but it costs them something small in return (a point of a relevant resource, or simply no reward this time).

This keeps flaws generating actual story beats throughout play, rather than being a one-time character-creation discount.

\page

## 9. Equipment & Inventory

- **Personal inventory**: keep it reasonable — a common-sense check on what a person could plausibly carry and stow on their body, no formal weight/slot tracking needed.
- **Ship storage**: effectively unlimited, within reason. The ship, not the character sheet, is where pirate loot actually lives — this keeps cargo and hoarding from turning into inventory bookkeeping.

### 9.1 Potions & Bottles
A potion is a spell in a bottle. To brew one, cast the potion's spell as usual (normal Mana cost and roll). On a success, the potion goes into one empty bottle. The potion's magnitude is the spell's magnitude at the time of brewing.

- **Bottles**: each brewer carries a set number of bottles. A bottle is full, empty, or broken.
- **Brewing happens in the cauldron**: a failed brew costs the Mana, but never a bottle.
- **Drinking or pouring out** a potion leaves the bottle empty and ready for the next brew.
- **Throwing** a potion breaks its bottle. Bottles can also break for story reasons (a fall, a crushed bag).
- **Broken bottles** stay broken until the next Island Reset (Section 11.3), when every bottle is whole again. Potions still in bottles carry over.


## 10. Combat Order — Popcorn, Locked After Round 1

At the start of Round 1:
1. Roll once per enemy (or enemy group, for identical mooks) to drop them into a slot in the order.
2. The players collectively decide their own order, filling the remaining slots.

That order then repeats unchanged for every subsequent round of the fight — no re-picking, no re-rolling. Faster at the table, while still giving players real say in how the fight opens.


## 11. Advancement

### 11.1 Natural 00 — Immediate Growth
- A roll of 00 is always an automatic Extreme Success (Section 1), and it also immediately grants **+1 point** to that skill.
- If the character didn't have the skill at all yet, rolling 00 on an untrained attempt means they **learn it on the spot**, starting at **5 or 10 points** — use 5 for something attempted almost incidentally, 10 for a deliberate, high-stakes attempt. GM's call.
- Because basic/weapon/spell skills aren't on the triangular curve (only HP and Movement are), every point gained this way is immediately meaningful — no "dead points" problem here.

### 11.2 Post-Session Improvement (CoC-style)
- For any skill a character actually used during the session, they can attempt an improvement roll afterward: roll d100, and if the roll is **higher than** the current skill value, gain a small batch of points (e.g. 1d10).
- This rewards attempting things you're bad at (you're more likely to roll over a low skill) as much as things you're good at, which keeps improvement flowing for the whole party rather than just the specialists.
- A skill that already got a natural-00 bump earlier in the session can still also get a post-session improvement roll — they're separate triggers.

### 11.3 Island Reset — Catch-Up
At the end of each island (story arc), before starting the next one:
1. Identify the highest total invested points in each relevant category across the party.
2. Any character below that total receives free catch-up points to bring them level.
3. Every character then receives an additional shared batch of points for the next island.

This deliberately trades strict "you get what you individually earned" purity for table-level balance — nobody falls permanently behind because they had less spotlight time or rolled fewer 00s, and every island starts the party on an even footing regardless of how the last one went.
