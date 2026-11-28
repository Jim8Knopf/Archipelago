// ============================================================
// The Ship Compendium: one Markdown file per ship type in rules/ships/,
// listed in book order by rules/ships/index.json. These files are the
// only place a ship type's values live. Everything else reads them:
//   - the Ship Rules book (Part III, the \shipcompendium marker),
//   - the Ship Gallery on the Rules page,
//   - the GM Dashboard's shipyard and ship cards, and
//   - the player sheet's ship section.
// A ship in a campaign stores only its type key and its story changes
// (js/ship-calc.js resolveShip()), so correcting a type file changes every
// ship of that type.
//
// A ship file is a "### Name / Other name (German)" heading, an italic
// one-line summary, the value table, a description paragraph, and
// **Benefits:** / **Flaws:** lines. A picture: put it next to the file and
// add a line like ![Sloop](sloop.webp). Ship traits come from the
// "- **Trait (German)** — text" list in rules/ships.md Section 2.1.
//
// The parse* functions are pure (testable in Node); loadShipCatalog()
// fetches.
// ============================================================

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
const IMAGE_LINE = /^!\[[^\]]*\]\(\s*([^)\s]+)\s*\)$/;

// Ship traits from the Ship Rules' Section 2.1 list.
export function parseTraits(shipsMd) {
  const traits = {};
  const section = shipsMd.split(/^### 2\.1 /m)[1]?.split(/^\\page|^#{1,3} /m)[0] || "";
  section.split("\n").forEach(line => {
    const m = line.match(/^- \*\*(.+?)(?: \((.+?)\))?\*\* — (.+)$/);
    if (m) traits[m[1].trim().toLowerCase()] = { name: m[1].trim(), de: m[2] || "", text: stripMd(m[3]) };
  });
  return traits;
}

// One ship file -> a ship type. `meta`: { key, group, groupDe, imageBase }
// (imageBase: the URL its picture path is relative to).
export function parseShipFile(md, { key, group = "", groupDe = "", imageBase = "" } = {}) {
  const ship = { name: "", alt: "", de: "", summary: "", rows: {}, text: [], benefits: "", flaws: "", image: "" };
  md.split("\n").forEach(raw => {
    const line = raw.trim();
    if (!line) return;
    const h = line.match(/^#{1,3} (.+)$/);
    if (h && !ship.name) {
      const t = h[1].match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      const [name, ...alt] = (t ? t[1] : h[1]).split(" / ").map(s => s.trim());
      Object.assign(ship, { name, alt: alt.join(" / "), de: t ? t[2].trim() : "" });
      return;
    }
    const img = line.match(IMAGE_LINE);
    if (img) {
      try { ship.image = imageBase ? new URL(img[1], imageBase).href : img[1]; } catch { ship.image = img[1]; }
      return;
    }
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

  const row = (label) => ship.rows[label.toLowerCase()] ?? "";
  const [hull, armor] = splitSlash(row("Hull / Armor"), 2);
  const [maxSpeed, handling, turnRate] = splitSlash(row("Max Speed / Handling / Turn Rate"), 3);
  const [broadside, chasers] = splitSlash(row("Broadside / Chasers"), 2);
  const [crew, cargo] = splitSlash(row("Crew / Cargo"), 2);
  const traitsText = row("Traits");
  return {
    key,
    name: ship.name || key,
    alt: ship.alt,
    de: ship.de,
    group,
    groupDe,
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

// index.json + { key: file text } + Ship Rules text -> the catalog:
//   { ships: [type...], byKey: { key: type }, groups: [{ group, de, note, ships: [keys] }],
//     traits, files: { key: markdown } }
export function buildCatalog(index, files, shipsMd = "", imageBaseFor = () => "") {
  const groups = (index?.groups || []).map(g => ({
    group: g.group || "", de: g.de || "", note: g.note || "",
    ships: (g.ships || []).filter(key => typeof files[key] === "string")
  }));
  const ships = groups.flatMap(g => g.ships.map(key =>
    parseShipFile(files[key], { key, group: g.group, groupDe: g.de, imageBase: imageBaseFor(key) })));
  return {
    ships,
    byKey: Object.fromEntries(ships.map(t => [t.key, t])),
    groups,
    traits: parseTraits(shipsMd),
    files
  };
}

// Part III of the Ship Rules, as Markdown: the quick-reference table, then
// every ship file under its group heading. `firstSection` numbers the
// chapters. Picture lines point at their absolute URL.
export function compendiumMarkdown(catalog, firstSection = 10) {
  const quick = [
    `## ${firstSection}. Quick Reference`,
    "",
    "| Ship | Hull | Arm. | Speed | Hand. | Turn | Man. | Broadside | Price |",
    "|---|---|---|---|---|---|---|---|---|",
    ...catalog.ships.map(t => `| ${t.name} | ${t.hull.toLocaleString("en")} | ${t.armor} | ${t.maxSpeed} | ${t.handling} | ${t.turnRate}° | ${t.maneuverability.replace(/\s.*$/, "")} | ${t.broadside} | ${t.price.toLocaleString("en")} |`)
  ].join("\n");
  const sections = catalog.groups.filter(g => g.ships.length).map((g, i) => {
    const body = g.ships.map(key => catalog.files[key].split("\n").map(line => {
      const img = line.trim().match(IMAGE_LINE);
      const image = img && catalog.byKey[key]?.image;
      return image ? `![${catalog.byKey[key].name}](${image})` : line;
    }).join("\n").trim()).join("\n\n");
    return `\\page\n\n## ${firstSection + 1 + i}. ${g.group}${g.de ? ` — ${g.de}` : ""}\n\n${body}${g.note ? `\n\n*${g.note}*` : ""}`;
  });
  return [quick, ...sections].join("\n\n");
}

let cached = null;

// Fetches index.json, every ship file and the Ship Rules (for the traits)
// once per page load. `rulesBase`: the rules/ folder, relative to the page.
export function loadShipCatalog(rulesBase = "../rules/") {
  if (!cached) {
    const base = new URL(rulesBase, window.location.href);
    const shipsBase = new URL("ships/", base);
    const get = (url, as = "text") => fetch(url, { cache: "no-cache" }).then(res => {
      if (!res.ok) throw new Error(`Couldn't load ${url.pathname} (${res.status}).`);
      return as === "json" ? res.json() : res.text();
    });
    cached = Promise.all([get(new URL("index.json", shipsBase), "json"), get(new URL("ships.md", base)).catch(() => "")])
      .then(async ([index, shipsMd]) => {
        const keys = (index.groups || []).flatMap(g => g.ships || []);
        const texts = await Promise.all(keys.map(key => get(new URL(`${key}.md`, shipsBase)).catch(err => {
          console.warn(err);
          return null;
        })));
        const files = {};
        keys.forEach((key, i) => { if (texts[i] != null) files[key] = texts[i]; });
        return buildCatalog(index, files, shipsMd, (key) => new URL(`${key}.md`, shipsBase).href);
      })
      .catch(err => { cached = null; throw err; });
  }
  return cached;
}
