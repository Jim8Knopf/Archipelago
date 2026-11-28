// ============================================================
// The Ship Compendium, read straight from the Ship Rules (rules/ships.md,
// Part III), so the rules book is the only place ship types are defined:
// add or change a ship there and the GM Dashboard's shipyard has it.
//
// Every ship in Part III is a "### Name / Other name (German)" heading
// under a "## NN. Group — German" heading, followed by an italic one-line
// summary, the value table, a description paragraph, and **Benefits:** /
// **Flaws:** lines — the format the book already uses. Ship traits come
// from the "- **Trait (German)** — text" list in Section 2.1.
//
// A picture for a ship type: put the file in rules/ships/ and add a line
// like ![Sloop](ships/sloop.webp) anywhere in that ship's block (the Rules
// page shows it too). `image` is that path, relative to rules/.
//
// parseShipCatalog() is pure (testable in Node); loadShipCatalog() fetches.
// ============================================================

const slug = (text) => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const toNumber = (text) => {
  const n = parseFloat(String(text ?? "").replace(/,/g, "").replace(/[−–]/g, "-"));
  return Number.isFinite(n) ? n : 0;
};
// "— / — (spears, axes, bows)" -> ["—", "— (spears, axes, bows)"]
const splitSlash = (text, parts) => {
  const out = String(text ?? "").split(" / ");
  if (out.length > parts) out.splice(parts - 1, out.length, out.slice(parts - 1).join(" / "));
  while (out.length < parts) out.push("");
  return out.map(s => s.trim());
};
const stripMd = (text) => text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").trim();

function parseTraits(md) {
  const traits = {};
  const section = md.split(/^### 2\.1 /m)[1]?.split(/^\\page|^#{1,3} /m)[0] || "";
  section.split("\n").forEach(line => {
    const m = line.match(/^- \*\*(.+?)(?: \((.+?)\))?\*\* — (.+)$/);
    if (m) traits[m[1].trim().toLowerCase()] = { name: m[1].trim(), de: m[2] || "", text: stripMd(m[3]) };
  });
  return traits;
}

function finishShip(ship) {
  const row = (label) => ship.rows[label.toLowerCase()] ?? "";
  const [hull, armor] = splitSlash(row("Hull / Armor"), 2);
  const [maxSpeed, handling, turnRate] = splitSlash(row("Max Speed / Handling / Turn Rate"), 3);
  const [broadside, chasers] = splitSlash(row("Broadside / Chasers"), 2);
  const [crew, cargo] = splitSlash(row("Crew / Cargo"), 2);
  const traitsText = row("Traits");
  return {
    key: ship.key,
    name: ship.name,
    alt: ship.alt,
    de: ship.de,
    group: ship.group,
    groupDe: ship.groupDe,
    summary: ship.summary,
    hull: toNumber(hull),
    armor: toNumber(armor),
    maxSpeed: toNumber(maxSpeed),
    handling: toNumber(handling),
    turnRate: toNumber(turnRate),
    maneuverability: row("Maneuverability"),
    broadside: broadside || "—",
    chasers: chasers || "—",
    crew: toNumber(crew),
    cargo,
    traits: /^[—–-]?$/.test(traitsText.trim()) ? [] : traitsText.split(",").map(t => t.trim()).filter(Boolean),
    price: toNumber(row("Price")),
    image: ship.image,
    description: ship.text.join(" ").trim(),
    benefits: ship.benefits,
    flaws: ship.flaws
  };
}

// -> { ships: [...], traits: { lowercase name: { name, de, text } } }
export function parseShipCatalog(md) {
  const traits = parseTraits(md);
  const part = md.split(/^# Part III\b.*$/m)[1] || "";
  const ships = [];
  let group = "", groupDe = "";
  let ship = null;
  const done = () => { if (ship) ships.push(finishShip(ship)); ship = null; };

  part.split("\n").forEach(raw => {
    const line = raw.trim();
    const g = line.match(/^## \d+\.\s*(.+?)(?:\s+—\s+(.+))?$/);
    if (g) { done(); group = g[1].trim(); groupDe = (g[2] || "").trim(); return; }
    if (/^#{1,2} /.test(line)) { done(); group = ""; return; }
    const h = line.match(/^### (.+)$/);
    if (h) {
      done();
      if (!group) return;
      const t = h[1].match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      const [name, ...alt] = (t ? t[1] : h[1]).split(" / ").map(s => s.trim());
      ship = { key: slug(name), name, alt: alt.join(" / "), de: t ? t[2].trim() : "", group, groupDe, summary: "", rows: {}, text: [], benefits: "", flaws: "", image: "" };
      return;
    }
    if (!ship || !line || line === "\\page") return;
    const img = line.match(/^!\[[^\]]*\]\(\s*([^)\s]+)\s*\)$/);
    if (img) { ship.image = img[1]; return; }
    const r = line.match(/^\|\s*(.+?)\s*\|\s*(.*?)\s*\|$/);
    if (r) {
      if (!/^-+$/.test(r[1]) && r[1].toLowerCase() !== "value") ship.rows[r[1].toLowerCase()] = r[2];
      return;
    }
    const b = line.match(/^\*\*(Benefits|Flaws):\*\*\s*(.+)$/);
    if (b) { ship[b[1].toLowerCase()] = stripMd(b[2]); return; }
    if (!ship.summary && !Object.keys(ship.rows).length && /^\*.+\*$/.test(line)) { ship.summary = stripMd(line); return; }
    if (Object.keys(ship.rows).length && !line.startsWith("*")) ship.text.push(stripMd(line));
  });
  done();
  return { ships, traits };
}

let cached = null;

// Fetches and parses the Ship Rules once per page load. `url` is relative
// to the page (the GM Dashboard is one folder down).
export function loadShipCatalog(url = "../rules/ships.md") {
  if (!cached) {
    cached = fetch(url, { cache: "no-cache" })
      .then(res => {
        if (!res.ok) throw new Error(`Couldn't load the Ship Rules (${res.status}).`);
        return res.text();
      })
      .then(parseShipCatalog)
      .catch(err => { cached = null; throw err; });
  }
  return cached;
}
