// ============================================================
// Pure helpers for the admin page: backup JSON (with Firestore Timestamps
// in a tagged form), import planning, ID checks and batch chunking.
//
// No DOM and no Firebase imports, so everything here can be tested in
// Node. Where a Firestore Timestamp has to be created (on import), the
// caller passes a factory in.
// ============================================================

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

// campaigns: Map(campaignId -> Map(charId -> data)). `only` limits the
// backup to those campaign IDs (one campaign export).
export function buildBackup(campaigns, { only = null, now = new Date() } = {}) {
  const ids = [...campaigns.keys()].filter(id => !only || only.includes(id)).sort();
  const out = {};
  ids.forEach(campaignId => {
    const characters = {};
    [...campaigns.get(campaignId).keys()].sort().forEach(charId => {
      characters[charId] = toJsonValue(campaigns.get(campaignId).get(charId), `${campaignId}/${charId}`);
    });
    out[campaignId] = { characters };
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
  });
  return { errors };
}

// What importing `backup` would do, given what's in the database now
// (`existing`: Map(campaignId -> Map or Set of charIds)). One entry per
// campaign in the backup:
//   { campaignId, isNewCampaign, create: [charIds], existing: [charIds] }
export function planImport(backup, existing) {
  return Object.keys(backup.campaigns).sort().map(campaignId => {
    const here = existing.get(campaignId);
    const has = (id) => !!here && here.has(id);
    const charIds = Object.keys(backup.campaigns[campaignId].characters).sort();
    return {
      campaignId,
      isNewCampaign: !here || here.size === 0,
      create: charIds.filter(id => !has(id)),
      existing: charIds.filter(id => has(id))
    };
  });
}

// The writes a plan turns into: new characters always; existing ones only
// for campaigns in `overwrite` (a Set of campaign IDs) — skipped otherwise.
export function importWrites(plan, overwrite) {
  const writes = [];
  let created = 0, overwritten = 0, skipped = 0;
  plan.forEach(p => {
    p.create.forEach(charId => writes.push({ campaignId: p.campaignId, charId, overwrite: false }));
    created += p.create.length;
    if (overwrite.has(p.campaignId)) {
      p.existing.forEach(charId => writes.push({ campaignId: p.campaignId, charId, overwrite: true }));
      overwritten += p.existing.length;
    } else {
      skipped += p.existing.length;
    }
  });
  return { writes, created, overwritten, skipped };
}
