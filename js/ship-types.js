// ============================================================
// Ship types from the Ship Compendium (rules/ships.md, Part III).
//
// Adding a ship on the GM dashboard copies its type's values into the new
// ship, and the GM can change them from then on (story changes, rules
// Section 1). So editing a value here only affects ships added afterwards.
// KEEP IN SYNC with rules/ships.md, Sections 10–13.
//
// Maneuverability, Broadside, Chasers and Cargo are text, because the book
// gives several of them as text ("+15 in calm water, −10 on open sea").
// ============================================================

export const SHIP_TYPES = [
  { key: "rowboat", name: "Rowboat", de: "Ruderboot", hull: 3, armor: 0, maxSpeed: 2, handling: 1, turnRate: 90, maneuverability: "+15", broadside: "—", chasers: "—", crew: 4, cargo: "0.3 t", traits: ["Oars", "Shallow Draft"], price: 50 },
  { key: "longship", name: "Longship", de: "Langschiff", hull: 9, armor: 0, maxSpeed: 8, handling: 3, turnRate: 60, maneuverability: "+10 (−10 in storms or high seas)", broadside: "—", chasers: "— (spears, axes, bows)", crew: 40, cargo: "15 t", traits: ["Oars", "Shallow Draft"], price: 1200 },
  { key: "war-galley", name: "War Galley", de: "Kriegsgaleere", hull: 10, armor: 1, maxSpeed: 5, handling: 3, turnRate: 90, maneuverability: "+15 in calm/coastal water, −10 on open sea or in storms", broadside: "—", chasers: "Ballista 1d8 (bow, rotates)", crew: 120, cargo: "15 t", traits: ["Oars", "Ram"], price: 4000 },
  { key: "cog", name: "Cog", de: "Kogge", hull: 14, armor: 2, maxSpeed: 3, handling: 1, turnRate: 30, maneuverability: "−5", broadside: "1d4", chasers: "—", crew: 12, cargo: "120 t", traits: ["High Sides"], price: 1900 },
  { key: "fluyt", name: "Fluyt", de: "Fleute", hull: 13, armor: 1, maxSpeed: 3, handling: 1, turnRate: 30, maneuverability: "−10", broadside: "1d4", chasers: "—", crew: 15, cargo: "280 t", traits: ["Shallow Draft"], price: 3000 },
  { key: "merchantman", name: "Merchantman", de: "Kauffahrer", hull: 22, armor: 2, maxSpeed: 4, handling: 1, turnRate: 45, maneuverability: "−5", broadside: "2d4", chasers: "—", crew: 25, cargo: "200 t", traits: [], price: 7000 },
  { key: "caravel", name: "Caravel", de: "Karavelle", hull: 12, armor: 1, maxSpeed: 4, handling: 2, turnRate: 60, maneuverability: "+10", broadside: "1d4", chasers: "—", crew: 20, cargo: "70 t", traits: ["Shallow Draft"], price: 2400 },
  { key: "sloop", name: "Sloop", de: "Slup", hull: 14, armor: 1, maxSpeed: 7, handling: 2, turnRate: 90, maneuverability: "+18", broadside: "2d4", chasers: "—", crew: 30, cargo: "85 t", traits: ["Shallow Draft"], price: 2800 },
  { key: "schooner", name: "Schooner", de: "Schoner", hull: 20, armor: 1, maxSpeed: 6, handling: 2, turnRate: 60, maneuverability: "+15", broadside: "3d4", chasers: "—", crew: 30, cargo: "95 t", traits: ["Shallow Draft"], price: 3200 },
  { key: "xebec", name: "Xebec", de: "Xebeke", hull: 20, armor: 1, maxSpeed: 6, handling: 2, turnRate: 90, maneuverability: "+15", broadside: "3d4", chasers: "1d4 bow", crew: 35, cargo: "100 t", traits: ["Oars"], price: 3600 },
  { key: "brigantine", name: "Brigantine", de: "Brigantine", hull: 28, armor: 2, maxSpeed: 4, handling: 2, turnRate: 45, maneuverability: "+5", broadside: "4d4", chasers: "1d4 bow, 1d4 stern", crew: 60, cargo: "200 t", traits: [], price: 6000 },
  { key: "frigate", name: "Frigate", de: "Fregatte", hull: 50, armor: 3, maxSpeed: 6, handling: 2, turnRate: 45, maneuverability: "+5", broadside: "5d6", chasers: "1d4 bow, 1d4 stern", crew: 220, cargo: "65 t free hold", traits: [], price: 18000 },
  { key: "man-of-war", name: "Man-of-War", de: "Linienschiff", hull: 110, armor: 5, maxSpeed: 4, handling: 1, turnRate: 30, maneuverability: "−18", broadside: "8d8", chasers: "2d6 bow, 2d6 stern", crew: 600, cargo: "100 t free hold", traits: ["High Sides"], price: 95000 },
  { key: "carrack", name: "Carrack", de: "Karacke", hull: 40, armor: 3, maxSpeed: 4, handling: 1, turnRate: 30, maneuverability: "−12", broadside: "4d6", chasers: "1d4 bow", crew: 90, cargo: "450 t", traits: ["High Sides"], price: 15000 },
  { key: "galleon", name: "Galleon", de: "Galeone", hull: 60, armor: 4, maxSpeed: 4, handling: 1, turnRate: 30, maneuverability: "−15", broadside: "6d6", chasers: "2d4 bow, 1d4 stern", crew: 180, cargo: "700 t", traits: ["High Sides"], price: 26000 },
  { key: "east-indiaman", name: "East Indiaman", de: "Ostindienfahrer", hull: 48, armor: 3, maxSpeed: 5, handling: 1, turnRate: 30, maneuverability: "−8", broadside: "5d6", chasers: "1d4 bow, 1d4 stern", crew: 120, cargo: "1,000 t", traits: ["High Sides"], price: 38000 }
];

// A ship that isn't in the compendium (a story ship): everything starts
// blank and the GM fills it in.
export const CUSTOM_TYPE = {
  key: "custom", name: "Custom", de: "", hull: 10, armor: 0, maxSpeed: 4, handling: 1, turnRate: 45,
  maneuverability: "+0", broadside: "—", chasers: "—", crew: 0, cargo: "", traits: [], price: 0
};

export function shipType(key) {
  return SHIP_TYPES.find(t => t.key === key) || CUSTOM_TYPE;
}
