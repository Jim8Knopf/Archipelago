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

// Section 2: Movement — INT(SQRT(points invested))
export function movementFromPoints(points) {
  const p = Number(points) || 0;
  if (p <= 0) return 0;
  return Math.floor(Math.sqrt(p));
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

// Effective value of a skill within a cross-training category.
export function categorySkillEffective(skill, bonus) {
  return Math.floor((Number(skill.points) || 0) + bonus);
}

export function categoriesOfType(categories, type) {
  return (categories || []).filter(c => c.type === type);
}

// Section 4: Evasion = evasion basic skill (raw, no cross-training) + full Movement.
// Looks for a basic skill literally named "Evasion" (case-insensitive).
export function evasionTotal(basicSkills, movement) {
  const skill = (basicSkills || []).find(s => (s.name || "").trim().toLowerCase() === "evasion");
  const skillVal = skill ? (Number(skill.points) || 0) : 0;
  return skillVal + (Number(movement) || 0);
}

// Section 8: Trait tier point values.
export function tierValue(tier) {
  return { minor: 15, moderate: 30, major: 50 }[tier] || 0;
}

// Section 7/8: 800-point character creation budget, adjusted by Island Reset
// grants (pointsGranted) and Flaw bonus points.
export function pointsSpent(char) {
  let spent = (Number(char.hpPoints) || 0) + (Number(char.movementPoints) || 0) + (Number(char.manaPoints) || 0);
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
// transfer bonuses). E.g. 15 Mana Modifier points with a Fire category bonus
// of +10 gives a pool of 150. With multiple magic categories, their bonuses
// add together, since there's still just one shared pool (Section 5.1).
export function magicBonusTotal(categories) {
  return categoriesOfType(categories, "magic")
    .reduce((sum, cat) => sum + categoryBonus(cat.skills), 0);
}

export function manaPoolFromPoints(manaPoints, categories) {
  return (Number(manaPoints) || 0) * magicBonusTotal(categories);
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
    basicInfo: { age: "", race: "", birthplace: "", job: "", height: "", weight: "", gender: "" },
    pointsGranted: 800,
    hpPoints: 0,
    movementPoints: 0,
    currentHP: 0,
    armor: 0,
    manaPoints: 0,
    currentMana: 0,
    basicSkills: [{ id: makeId(), name: "Evasion", points: 0 }],
    // Weapons and Magic can have several named categories (Sword, Fire, ...).
    // Languages are a single shared pool per Section 3.2 — no sub-categories.
    categories: [],
    languages: [],
    traits: [],
    inventory: [],
    // "Used this session" markers — one-way toggle set from the sheet, only
    // clearable from the GM dashboard. Lives in Firestore (not just local
    // browser memory) specifically so a GM reset can reach every device.
    usedSkillIds: []
  };
}
