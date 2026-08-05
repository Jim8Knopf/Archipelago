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

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Section 1: the normal/hard/extreme ladder, reused everywhere.
// effective value -> the three roll-under thresholds.
export function ladder(effective) {
  const eff = Number(effective) || 0;
  return {
    normal: round1(eff),
    hard: round1(eff / 2),
    extreme: round1(eff / 5)
  };
}

// Section 3.2: category transfer bonus = (sum of RAW points in category) / 10
// Exact division, not floored — matches the ruleset's own worked examples.
export function categoryBonus(skills) {
  const sum = (skills || []).reduce((a, s) => a + (Number(s.points) || 0), 0);
  return round1(sum / 10);
}

// Effective value of a skill within a cross-training category.
export function categorySkillEffective(skill, bonus) {
  return round1((Number(skill.points) || 0) + bonus);
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
  let spent = (Number(char.hpPoints) || 0) + (Number(char.movementPoints) || 0);
  spent += (char.basicSkills || []).reduce((a, s) => a + (Number(s.points) || 0), 0);
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

// Default shape for a brand-new character document.
export function defaultCharacter(name) {
  return {
    name: name || "New Character",
    basicInfo: { age: "", race: "", birthplace: "", job: "", height: "", weight: "", gender: "", fightingStyle: "" },
    pointsGranted: 800,
    hpPoints: 0,
    movementPoints: 0,
    currentHP: 0,
    maxMana: 0,
    currentMana: 0,
    basicSkills: [{ id: makeId(), name: "Evasion", points: 0 }],
    categories: [],
    traits: [],
    inventory: []
  };
}
