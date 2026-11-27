// ============================================================
// Pure helpers for the admin page: backup JSON (with Firestore Timestamps
// in a tagged form), import planning, ID checks, batch chunking, the legacy
// data scan and junk hints.
//
// No DOM and no Firebase imports, so everything here can be tested in
// Node. Where a Firestore Timestamp has to be created (on import), the
// caller passes a factory in.
// ============================================================

import * as R from "../js/rules-calc.js";
import { normalize } from "../js/normalize.js";

export const BACKUP_FORMAT = "archipelago-backup";
export const BACKUP_VERSION = 1;

// Firestore allows at most 500 writes in one batch.
export const BATCH_LIMIT = 500;

// Key that marks a tagged non-JSON value, e.g.
//   { "__archipelagoType": "timestamp", "seconds": 1700000000, "nanoseconds": 0 }
export const TYPE_KEY = "__archipelagoType";

export function chunk(items, size = BATCH_LIMIT) {
  if (!(size > 0)) throw new Error("chunk size must be positive");
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// A Firestore Timestamp (duck-typed, so this module needn't import the SDK).
export function isTimestamp(v) {
  return !!v && typeof v === "object"
    && typeof v.toMillis === "function"
    && typeof v.seconds === "number"
    && typeof v.nanoseconds === "number";
}

function isPlainObject(v) {
  if (!v || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

// Firestore document data -> plain JSON. Timestamps become tagged objects;
// anything else that isn't plain JSON is refused rather than exported
// half-broken (the app never stores other Firestore types).
export function toJsonValue(value, path = "") {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`Can't export the number ${value} at ${path || "(root)"}`);
    }
    if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
      throw new Error(`Can't export a ${typeof value} at ${path || "(root)"}`);
    }
    return value;
  }
  if (isTimestamp(value)) {
    return { [TYPE_KEY]: "timestamp", seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    const seconds = Math.floor(ms / 1000);
    return { [TYPE_KEY]: "timestamp", seconds, nanoseconds: (ms - seconds * 1000) * 1e6 };
  }
  if (Array.isArray(value)) return value.map((v, i) => toJsonValue(v, `${path}[${i}]`));
  if (isPlainObject(value)) {
    if (TYPE_KEY in value) throw new Error(`Field name ${TYPE_KEY} is reserved (at ${path || "(root)"})`);
    const out = {};
    Object.entries(value).forEach(([k, v]) => { out[k] = toJsonValue(v, path ? `${path}.${k}` : k); });
    return out;
  }
  throw new Error(`Can't export a ${value.constructor?.name || "non-plain"} value at ${path || "(root)"}`);
}

// Plain JSON -> Firestore document data. `makeTimestamp(seconds,
// nanoseconds)` builds the real Timestamp (Timestamp from the SDK in the
// browser).
export function fromJsonValue(value, makeTimestamp, path = "") {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v, i) => fromJsonValue(v, makeTimestamp, `${path}[${i}]`));
  if (TYPE_KEY in value) {
    if (value[TYPE_KEY] === "timestamp"
      && Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds)
      && value.nanoseconds >= 0 && value.nanoseconds < 1e9) {
      return makeTimestamp(value.seconds, value.nanoseconds);
    }
    throw new Error(`Unknown or broken tagged value at ${path || "(root)"}`);
  }
  const out = {};
  Object.entries(value).forEach(([k, v]) => { out[k] = fromJsonValue(v, makeTimestamp, path ? `${path}.${k}` : k); });
  return out;
}

// Firestore document ID rules: non-empty, at most 1500 bytes, no "/",
// not "." or "..", and not of the reserved form __…__.
// Returns an error message, or "" if the ID is fine.
export function idProblem(id) {
  if (typeof id !== "string" || id.length === 0) return "can't be empty";
  if (id.trim() !== id) return "can't start or end with a space";
  if (id.includes("/")) return "can't contain “/”";
  if (id === "." || id === "..") return "can't be “.” or “..”";
  if (/^__.*__$/.test(id)) return "can't start and end with “__”";
  if (new TextEncoder().encode(id).length > 1500) return "is too long";
  return "";
}

// The other per-campaign collections a backup carries next to the
// characters: the ships (with their holds) and the campaign settings
// (which ship is the crew's). Both are optional in a backup file, so
// backups from before ships existed still import.
export const EXTRA_COLLECTIONS = ["ships", "settings"];

// campaigns: Map(campaignId -> Map(charId -> data)). `only` limits the
// backup to those campaign IDs (one campaign export). `extras`:
// Map(campaignId -> { ships: Map(id -> data), settings: Map(id -> data) }).
export function buildBackup(campaigns, { only = null, now = new Date(), extras = new Map() } = {}) {
  const ids = [...campaigns.keys()].filter(id => !only || only.includes(id)).sort();
  const out = {};
  ids.forEach(campaignId => {
    const characters = {};
    [...campaigns.get(campaignId).keys()].sort().forEach(charId => {
      characters[charId] = toJsonValue(campaigns.get(campaignId).get(charId), `${campaignId}/${charId}`);
    });
    out[campaignId] = { characters };
    EXTRA_COLLECTIONS.forEach(col => {
      const docs = extras.get(campaignId)?.[col];
      if (!docs || docs.size === 0) return;
      const entries = {};
      [...docs.keys()].sort().forEach(id => {
        entries[id] = toJsonValue(docs.get(id), `${campaignId}/${col}/${id}`);
      });
      out[campaignId][col] = entries;
    });
  });
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    scope: only ? "campaign" : "project",
    campaigns: out
  };
}

export function backupFileName(campaignId = null, now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const scope = campaignId == null
    ? "all"
    : (campaignId.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "campaign");
  return `archipelago-${scope}-${stamp}.json`;
}

// Checks a parsed backup file. Returns { errors: [...] }; empty means usable.
export function validateBackup(data) {
  const errors = [];
  if (!isPlainObject(data)) return { errors: ["This isn't an Archipelago backup file."] };
  if (data.format !== BACKUP_FORMAT) errors.push("This isn't an Archipelago backup file (format is missing or different).");
  if (data.version !== BACKUP_VERSION) errors.push(`Unsupported backup version: ${JSON.stringify(data.version)}.`);
  if (!isPlainObject(data.campaigns)) {
    errors.push("The backup has no campaigns.");
    return { errors };
  }
  Object.entries(data.campaigns).forEach(([campaignId, campaign]) => {
    const p = idProblem(campaignId);
    if (p) errors.push(`Campaign ID “${campaignId}” ${p}.`);
    if (!isPlainObject(campaign) || !isPlainObject(campaign.characters)) {
      errors.push(`Campaign “${campaignId}” has no characters list.`);
      return;
    }
    Object.entries(campaign.characters).forEach(([charId, char]) => {
      const cp = idProblem(charId);
      if (cp) errors.push(`Character ID “${charId}” in “${campaignId}” ${cp}.`);
      if (!isPlainObject(char)) errors.push(`Character “${campaignId}/${charId}” isn't an object.`);
    });
    EXTRA_COLLECTIONS.forEach(col => {
      if (campaign[col] == null) return;
      if (!isPlainObject(campaign[col])) { errors.push(`“${col}” in “${campaignId}” isn't a list of documents.`); return; }
      Object.entries(campaign[col]).forEach(([id, data]) => {
        const ip = idProblem(id);
        if (ip) errors.push(`ID “${id}” in “${campaignId}/${col}” ${ip}.`);
        if (!isPlainObject(data)) errors.push(`“${campaignId}/${col}/${id}” isn't an object.`);
      });
    });
  });
  return { errors };
}

// What importing `backup` would do, given what's in the database now
// (`existing`: Map(campaignId -> Map or Set of charIds); `existingExtras`:
// Map(campaignId -> { ships, settings }, each a Map or Set of IDs)). One
// entry per campaign in the backup:
//   { campaignId, isNewCampaign, create: [charIds], existing: [charIds],
//     extras: { ships: { create, existing }, settings: { create, existing } } }
export function planImport(backup, existing, existingExtras = new Map()) {
  return Object.keys(backup.campaigns).sort().map(campaignId => {
    const here = existing.get(campaignId);
    const has = (id) => !!here && here.has(id);
    const campaign = backup.campaigns[campaignId];
    const charIds = Object.keys(campaign.characters).sort();
    const extras = {};
    EXTRA_COLLECTIONS.forEach(col => {
      const ids = Object.keys(campaign[col] || {}).sort();
      const there = existingExtras.get(campaignId)?.[col];
      const exists = (id) => !!there && there.has(id);
      extras[col] = { create: ids.filter(id => !exists(id)), existing: ids.filter(id => exists(id)) };
    });
    return {
      campaignId,
      isNewCampaign: !here || here.size === 0,
      create: charIds.filter(id => !has(id)),
      existing: charIds.filter(id => has(id)),
      extras
    };
  });
}

// The writes a plan turns into: new documents always; existing ones only
// for campaigns in `overwrite` (a Set of campaign IDs) — skipped otherwise.
// Each write is { campaignId, collection, docId, overwrite }. The counts
// are characters; ships and settings are counted in `extra*`.
export function importWrites(plan, overwrite) {
  const writes = [];
  let created = 0, overwritten = 0, skipped = 0;
  let extraCreated = 0, extraOverwritten = 0, extraSkipped = 0;
  const add = (p, collection, ids, isOverwrite) =>
    ids.forEach(docId => writes.push({ campaignId: p.campaignId, collection, docId, overwrite: isOverwrite }));
  plan.forEach(p => {
    const over = overwrite.has(p.campaignId);
    add(p, "characters", p.create, false);
    created += p.create.length;
    if (over) {
      add(p, "characters", p.existing, true);
      overwritten += p.existing.length;
    } else {
      skipped += p.existing.length;
    }
    EXTRA_COLLECTIONS.forEach(col => {
      const e = p.extras?.[col] || { create: [], existing: [] };
      add(p, col, e.create, false);
      extraCreated += e.create.length;
      if (over) {
        add(p, col, e.existing, true);
        extraOverwritten += e.existing.length;
      } else {
        extraSkipped += e.existing.length;
      }
    });
  });
  return { writes, created, overwritten, skipped, extraCreated, extraOverwritten, extraSkipped };
}

// ---- Legacy data ----

// Why a stored character still has an old shape that normalize()
// (js/normalize.js) migrates on every load. Empty = nothing to migrate.
export function legacyReasons(raw) {
  const reasons = [];
  const cats = Array.isArray(raw.categories) ? raw.categories : [];
  if ((raw.basicSkills || []).length) reasons.push("flat Basic Skills list");
  if ((raw.potions || []).length) reasons.push("separate potions list");
  if ((raw.inventory || []).some(item => !item?.type)) reasons.push("inventory items without a type");
  if (cats.some(c => c?.type === "language")) reasons.push("language categories");
  if (raw.armor != null && raw.armorCustom == null) reasons.push("old armor field");
  if (typeof raw.currentMana === "number" && raw.currentMana !== Math.floor(raw.currentMana)) reasons.push("fractional Mana");
  const hasGroup = (key) => cats.some(c => c?.type === "skill" && c.group === key);
  if (!R.SKILL_GROUPS.every(g => hasGroup(g.key)) || !hasGroup(R.NO_GROUP)) reasons.push("missing skill groups");
  return reasons;
}

function sameValue(a, b) {
  if (a === b) return true;
  if (isTimestamp(a) && isTimestamp(b)) return a.seconds === b.seconds && a.nanoseconds === b.nanoseconds;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && sameValue(a[k], b[k]));
}

// The top-level fields that change when a character is normalized: what
// "Migrate all" writes back with an update, so fields it doesn't touch
// (and edits a player makes meanwhile to other fields) are left alone.
export function migrationUpdate(raw) {
  const next = normalize(raw);
  const update = {};
  Object.entries(next).forEach(([key, value]) => {
    if (value === undefined || sameValue(raw[key], value)) return;
    // A missing list and an empty one mean the same (e.g. the `potions: []`
    // normalize() always adds) — not worth a write.
    if (raw[key] === undefined && Array.isArray(value) && value.length === 0) return;
    update[key] = value;
  });
  return update;
}

// ---- Junk hints ----

const PLACEHOLDER_CAMPAIGN = /^(default-campaign|default|test(ing)?|demo|example|tmp|temp|sandbox|asdf|foo|bar)([-_ ]?\d+)?$/i;
const PLACEHOLDER_NAME = /^(new character|unnamed|test(ing)?|asdf|foo|bar|x+)( ?\d+)?$/i;

// True for a character nobody ever filled in: no points spent, nothing
// carried, no traits, portrait, notes or basic info.
function isUntouched(raw) {
  const d = normalize(raw);
  const blank = (v) => !String(v ?? "").trim();
  return R.pointsSpent(d) === 0
    && d.inventory.length === 0
    && d.traits.length === 0
    && blank(d.imageUrl)
    && blank(d.notes.session) && blank(d.notes.character)
    && Object.values(d.basicInfo).every(blank);
}

export function charJunkReasons(raw) {
  const reasons = [];
  const name = String(raw.name ?? "").trim();
  if (!name) reasons.push("no name");
  else if (PLACEHOLDER_NAME.test(name)) reasons.push("placeholder name");
  if (isUntouched(raw)) reasons.push("never filled in");
  return reasons;
}

// chars: Map(charId -> data)
export function campaignJunkReasons(campaignId, chars) {
  const reasons = [];
  if (PLACEHOLDER_CAMPAIGN.test(campaignId)) reasons.push("placeholder campaign ID");
  const all = [...chars.values()];
  if (all.length && all.every(d => charJunkReasons(d).length)) reasons.push("only placeholder characters");
  return reasons;
}
