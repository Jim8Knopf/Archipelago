// ============================================================
// Character document normalization, shared by the player sheet (on every
// load, in memory) and the admin page (legacy scan + "Migrate all", which
// writes the result back). Pure: no DOM or Firestore.
// ============================================================

import * as R from "./rules-calc.js";
import { normalizeLayout } from "./sheet-layout.js";

// Fills in missing fields from older/partial docs, and migrates legacy shapes:
// - flat `basicSkills` array -> a "skill" type category (skill group)
// - "language" type categories -> flat `languages` array
// - a Basic Skill literally named "Evasion" -> `evasionPoints`
// - old flat `armor` number -> `armorCustom`
// - inventory items without a `type` -> type "item"
export function normalize(d) {
  const def = R.defaultCharacter(d.name);
  const rawCategories = d.categories || [];
  const categories = rawCategories.filter(c => c.type !== "language");
  const legacyLangSkills = rawCategories
    .filter(c => c.type === "language")
    .flatMap(c => c.skills || []);

  const rawBasicSkills = d.basicSkills || [];
  const legacyEvasionSkill = rawBasicSkills.find(s => (s.name || "").trim().toLowerCase() === "evasion");
  const basicSkills = rawBasicSkills.filter(s => s !== legacyEvasionSkill);
  const evasionPoints = d.evasionPoints ?? (legacyEvasionSkill ? legacyEvasionSkill.points : 0);

  const inventory = [
    ...(d.inventory || []).map(item => item.type ? item : { ...item, type: "item" }),
    // A separate `potions` list (first version of Section 9.1) -> potion items.
    ...(d.potions || []).map(p => ({ ...p, type: "potion" }))
  ];

  // Basic Skills are groups now (type "skill" categories). Any flat list
  // left on an older document is folded into a group here, and `basicSkills`
  // is emptied so the same skills can't be counted or shown twice. The
  // emptied list is written back on the next save of that field.
  // Then every character gets the five fixed groups (Section 3.1).
  const withSkillGroups = R.ensureSkillGroups(R.migrateBasicSkills(basicSkills, categories));

  return {
    ...def,
    ...d,
    basicInfo: { ...def.basicInfo, ...(d.basicInfo || {}) },
    basicSkills: [],
    categories: withSkillGroups,
    languages: d.languages && d.languages.length ? d.languages : legacyLangSkills,
    traits: d.traits || [],
    inventory,
    armorCustom: d.armorCustom ?? d.armor ?? 0,
    evasionPoints,
    resiliencePoints: d.resiliencePoints ?? 0,
    imageUrl: d.imageUrl || "",
    manaPoints: d.manaPoints ?? 0,
    // Older documents may hold a fractional currentMana (Max Mana wasn't rounded down).
    currentMana: Math.floor(d.currentMana ?? 0),
    potions: [],
    bottlesMax: d.bottlesMax ?? 0,
    bottlesBroken: d.bottlesBroken ?? 0,
    usedSkillIds: d.usedSkillIds || [],
    layout: normalizeLayout(d.layout),
    notes: { ...def.notes, ...(d.notes || {}) }
  };
}
