// ============================================================
// Pure rules calculations — mirrors Pirate_TTRPG_Rules_Draft.md exactly.
// No Firestore/DOM code here, so both sheet.js and gm.js can share it.
// ============================================================

// Section 2: HP — largest n such that n(n+1)/2 <= points invested
export function hpFromPoints(points) {
  const p = Number(points) || 0;
  if (p <= 0) return 0;
  return Math.floor((Math.sqrt(8 * p + 1) - 1) / 2);
}

// How many more points (from where you are now) it takes to raise Max HP by 1.
// The triangular curve means this cost keeps rising — going from HP n to n+1
// always costs (n+1) points, regardless of how the points already invested
// were "spent" getting there.
export function pointsToNextHP(hpPoints) {
  const p = Number(hpPoints) || 0;
  const currentHP = hpFromPoints(p);
  const nextThreshold = ((currentHP + 1) * (currentHP + 2)) / 2;
  return nextThreshold - p;
}

// Section 2: Movement — INT(SQRT(points invested))
export function movementFromPoints(points) {
  const p = Number(points) || 0;
  if (p <= 0) return 0;
  return Math.floor(Math.sqrt(p));
}

// How many more points it takes to raise Movement by 1 — the sqrt curve means
// this varies a lot (sometimes 1 point, sometimes a dozen) depending on how
// close the current investment is to the next perfect square.
export function pointsToNextMovement(movementPoints) {
  const p = Number(movementPoints) || 0;
  const currentMove = movementFromPoints(p);
  const nextThreshold = Math.pow(currentMove + 1, 2);
  return nextThreshold - p;
}

// Section 1: the normal/hard/extreme ladder, reused everywhere.
// effective value -> the three roll-under thresholds.
// Floored to whole numbers — you can't roll a fractional d100 threshold.
export function ladder(effective) {
  const eff = Number(effective) || 0;
  return {
    normal: Math.floor(eff),
    hard: Math.floor(eff / 2),
    extreme: Math.floor(eff / 5)
  };
}

// Section 3.2: category transfer bonus = (sum of RAW points in category) / 10
// Floored to a whole number for a clean, roll-able stat.
export function categoryBonus(skills) {
  const sum = (skills || []).reduce((a, s) => a + (Number(s.points) || 0), 0);
  return Math.floor(sum / 10);
}

// The transfer bonus of a whole category. Basic Skills in "No group"
// (Section 3.1) don't cross-train, so that group's bonus is always 0.
export function groupBonus(cat) {
  return cat?.group === NO_GROUP ? 0 : categoryBonus(cat?.skills);
}

// Effective value of a skill within a cross-training category.
export function categorySkillEffective(skill, bonus) {
  return Math.floor((Number(skill.points) || 0) + bonus);
}

export function categoriesOfType(categories, type) {
  return (categories || []).filter(c => c.type === type);
}

// Basic Skills used to be a flat `basicSkills` array with no cross-training.
// They're now skill groups — the same named-category shape Weapons and Magic
// use, so members of a group partially train each other (Section 3.2).
//
// This folds any leftover flat list into a "General" group so an older
// character keeps every skill (and its points) with no manual fixing up. It
// returns the categories array unchanged once there's nothing left to move,
// which is what makes it safe to run on every load.
export function migrateBasicSkills(basicSkills, categories) {
  const cats = categories || [];
  const flat = basicSkills || [];
  if (flat.length === 0) return cats;

  const existing = cats.find(c => c.type === "skill");
  if (existing) {
    return cats.map(c => c === existing
      ? { ...c, skills: [...(c.skills || []), ...flat] }
      : c
    );
  }
  return [...cats, { id: makeId(), name: "General", type: "skill", skills: flat }];
}

// Section 3.1: the five fixed skill groups (after DSA's Körper-,
// Gesellschafts-, Natur-, Wissens- and Handwerkstalente). `match` lists name
// fragments that map an older, freely named group onto a fixed one.
export const NO_GROUP = "none";

export const SKILL_GROUPS = [
  { key: "physical", name: "Physical", match: ["physical", "body", "körper", "koerper"] },
  { key: "social", name: "Social", match: ["social", "gesellschaft"] },
  { key: "nature", name: "Nature", match: ["nature", "natur"] },
  { key: "knowledge", name: "Knowledge", match: ["knowledge", "lore", "wissen"] },
  { key: "crafting", name: "Crafting", match: ["craft", "handwerk"] }
];

// Makes sure the character has all five fixed skill groups, tagged with
// their `group` key. An older group whose name matches one (e.g. "Körper")
// is adopted as that group and renamed. Groups that are still missing are
// added with a deterministic id (`skill-<key>`), so running this on every
// load always produces the same ids. Older groups that match nothing stay
// as they are, so their skills can be moved into a fixed group by hand.
//
// Groups without a `group` key are the player's own groups: they keep their
// name, can be renamed and removed. Every character also gets one "No group"
// holder (`group: "none"`, id `skill-none`) for skills that don't
// cross-train at all.
export function ensureSkillGroups(categories) {
  let cats = [...(categories || [])];
  SKILL_GROUPS.forEach(g => {
    if (cats.some(c => c.type === "skill" && c.group === g.key)) return;
    const legacy = cats.find(c => c.type === "skill" && !c.group
      && g.match.some(m => (c.name || "").toLowerCase().includes(m)));
    if (legacy) {
      cats = cats.map(c => c === legacy ? { ...c, group: g.key, name: g.name } : c);
    } else {
      cats.push({ id: `skill-${g.key}`, name: g.name, type: "skill", group: g.key, skills: [] });
    }
  });
  if (!cats.some(c => c.type === "skill" && c.group === NO_GROUP)) {
    cats.push({ id: "skill-none", name: "No group", type: "skill", group: NO_GROUP, skills: [] });
  }
  return cats;
}

// Section 4: Evasion = Evasion points invested + full Movement. Evasion has
// its own dedicated field now, rather than being a Basic Skill found by name.
export function evasionTotal(evasionPoints, movement) {
  return (Number(evasionPoints) || 0) + (Number(movement) || 0);
}

// Section 5.5: Resilience has its own invested points, like Evasion. It is
// never rolled — casters roll against their skill minus half of it, floored
// like every other halved threshold in the ladder.
export function resilienceModifier(resiliencePoints) {
  return Math.floor((Number(resiliencePoints) || 0) / 2);
}

// Section 8: Trait tier point values.
export function tierValue(tier) {
  return { minor: 15, moderate: 30, major: 50 }[tier] || 0;
}

// Section 7/8: 800-point character creation budget, adjusted by Island Reset
// grants (pointsGranted) and Flaw bonus points.
export function pointsSpent(char) {
  let spent = (Number(char.hpPoints) || 0) + (Number(char.movementPoints) || 0)
    + (Number(char.manaPoints) || 0) + (Number(char.evasionPoints) || 0)
    + (Number(char.resiliencePoints) || 0);
  // Legacy flat basic skills. Once a doc is migrated these live in
  // `categories` as type "skill" and are counted by the loop below, so this
  // term only ever contributes for an un-migrated document.
  spent += (char.basicSkills || []).reduce((a, s) => a + (Number(s.points) || 0), 0);
  spent += (char.languages || []).reduce((a, s) => a + (Number(s.points) || 0), 0);
  (char.categories || []).forEach(cat => {
    spent += (cat.skills || []).reduce((a, s) => a + (Number(s.points) || 0), 0);
  });
  spent += (char.traits || [])
    .filter(t => t.type === "advantage")
    .reduce((a, t) => a + tierValue(t.tier), 0);
  return spent;
}

export function bonusFromFlaws(char) {
  return (char.traits || [])
    .filter(t => t.type === "flaw")
    .reduce((a, t) => a + tierValue(t.tier), 0);
}

export function pointsAvailable(char) {
  return (Number(char.pointsGranted) || 800) + bonusFromFlaws(char);
}

export function pointsRemaining(char) {
  return pointsAvailable(char) - pointsSpent(char);
}

export function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

// Section 6.1: Short Rest — recover 1/10 of max (round down, minimum 1).
export function shortRestRecover(current, max) {
  const m = Number(max) || 0;
  if (m <= 0) return Number(current) || 0;
  const gain = Math.max(1, Math.floor(m / 10));
  return Math.min(m, (Number(current) || 0) + gain);
}

// Section 6.2: Long Rest — recover half of what's missing (round up).
export function longRestRecover(current, max) {
  const m = Number(max) || 0;
  const c = Number(current) || 0;
  const missing = m - c;
  if (missing <= 0) return c;
  const gain = Math.ceil(missing / 2);
  return Math.min(m, c + gain);
}

// Mana pool = (Mana Modifier points invested) × (sum of all Magic category
// transfer bonuses) / 2, rounded down. E.g. 15 Mana Modifier points with a Fire category bonus
// of +10 gives a pool of 75. With multiple magic categories, their bonuses
// add together, since there's still just one shared pool (Section 5.1).
export function magicBonusTotal(categories) {
  return categoriesOfType(categories, "magic")
    .reduce((sum, cat) => sum + categoryBonus(cat.skills), 0);
}

export function manaPoolFromPoints(manaPoints, categories) {
  return Math.floor((Number(manaPoints) || 0) * magicBonusTotal(categories) / 2);
}

// Section 5.2: a spell's magnitude, clamped to the valid 1-8 range. Pulled
// out into its own helper because sheet.js and gm.js both need this same
// clamp wherever a spell's magnitude is read.
export function magnitudeOf(skill) {
  return Math.max(1, Math.min(8, Number(skill?.magnitude) || 1));
}

// Section 5.3: casting cost — doubling base cost per magnitude, with
// Normal/Hard/Extreme-or-Fail multipliers from the table.
export function castingCost(magnitude) {
  const mag = Math.max(1, Math.min(8, Number(magnitude) || 1));
  const base = Math.pow(2, mag - 1); // 1,2,4,8,16,32,64,128
  return {
    base,
    normal: base * 5,
    hard: Math.ceil(base * 2.5),
    extreme: base
  };
}

// Armor is custom bonus (natural armor, traits, etc.) plus the sum of every
// inventory item that's type "armor" and currently marked worn.
export function armorFromInventory(inventory) {
  return (inventory || [])
    .filter(item => item.type === "armor" && item.worn)
    .reduce((sum, item) => sum + (Number(item.armorValue) || 0), 0);
}

export function totalArmor(char) {
  return (Number(char.armorCustom) || 0) + armorFromInventory(char.inventory);
}

// Section 5: a character only "has magic" once they've invested in a mana
// pool or actually put points into a magic skill — otherwise the block
// is just empty noise on the sheet, so callers use this to hide it.
export function hasMagic(char) {
  const magicSkillPoints = categoriesOfType(char.categories, "magic")
    .some(c => (c.skills || []).some(s => (Number(s.points) || 0) > 0));
  return manaPoolFromPoints(char.manaPoints, char.categories) > 0 || magicSkillPoints;
}

// Default shape for a brand-new character document.
export function defaultCharacter(name) {
  return {
    name: name || "New Character",
    imageUrl: "",
    basicInfo: { age: "", race: "", birthplace: "", job: "", height: "", weight: "", gender: "", fightingStyle: "" },
    pointsGranted: 800,
    hpPoints: 0,
    movementPoints: 0,
    currentHP: 0,
    evasionPoints: 0,
    resiliencePoints: 0,
    armorCustom: 0,
    manaPoints: 0,
    currentMana: 0,
    // Basic Skills are grouped like Weapons and Magic — see `categories`.
    // This stays only so an older document that still has a flat list keeps
    // loading; nothing writes to it any more.
    basicSkills: [],
    // Basic Skills sit in the five fixed groups (SKILL_GROUPS); Weapons and
    // Magic can have several named categories (Sword, Fire, ...). Each
    // category cross-trains its own members.
    // Languages are a single shared pool per Section 3.2 — no sub-categories.
    categories: ensureSkillGroups([]),
    languages: [],
    traits: [],
    // Inventory items are typed: "item" (name, qty), "armor" (name,
    // armorValue, worn), "weapon" (name, woundDice), "potion" (name,
    // magnitude, qty, and spellId when brewed — Section 9.1).
    inventory: [],
    // Potion bottles (Section 9.1): a max, plus a broken count that only the
    // GM's New Island button resets. Full/empty are derived — bottleCounts().
    bottlesMax: 0,
    bottlesBroken: 0,
    // "Used this session" markers — one-way toggle set from the sheet, only
    // clearable from the GM dashboard. Lives in Firestore (not just local
    // browser memory) specifically so a GM reset can reach every device.
    usedSkillIds: [],
    // Free-text player notes. `session` is for the current game night,
    // `character` for longer-lived things like backstory and goals.
    notes: { session: "", character: "" }
  };
}

// Section 9.1: potion bottles. Full = one per potion carried, broken =
// thrown or smashed (back at the Island Reset), empty = what's left of the
// max. Drinking or pouring out a potion turns a full bottle back into an
// empty one, so only the potion items and `bottlesBroken` are ever stored.
export const potionsOf = (d) => (d?.inventory || []).filter(i => i.type === "potion");

export function bottleCounts(d) {
  const max = Math.max(0, Number(d?.bottlesMax) || 0);
  const full = potionsOf(d).reduce((n, p) => n + Math.max(0, Number(p.qty) || 0), 0);
  const broken = Math.max(0, Number(d?.bottlesBroken) || 0);
  return { max, full, broken, empty: Math.max(0, max - full - broken) };
}
