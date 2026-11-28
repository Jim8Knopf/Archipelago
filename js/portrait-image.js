// ============================================================
// Portrait pictures stored inside the character document.
//
// Links to pictures hosted elsewhere break: Discord attachment links expire
// after about a day, other hosts block embedding. So the sheet copies the
// picture itself into the character (field `imageUrl`, as a data: URL),
// shrunk to a small square, whether it comes from a file or from a link:
//
// - Any size or format the browser can read goes in; what is stored is a
//   SIZE×SIZE centre crop (portraits are always shown as squares with
//   object-fit: cover, so this is exactly the part that was visible).
// - Encoded as WebP where the browser can, JPEG otherwise, lowering the
//   quality until it fits MAX_BYTES. A Firestore document holds at most
//   1 MiB and the GM dashboard loads every character, so it stays small.
// - From a link: the picture is downloaded once now. That only works when
//   the host allows it (CORS); otherwise importFromUrl() throws
//   PortraitError with `blockedByHost` so the sheet can offer to keep the
//   plain link instead.
// ============================================================

import { portraitUrl } from "./format.js";

const SIZE = 256;
const MAX_BYTES = 60 * 1024;
const QUALITIES = [0.82, 0.7, 0.55, 0.4];
// Shown behind transparent pictures (JPEG has no transparency).
const BACKGROUND = "#17313e";

export class PortraitError extends Error {
  constructor(message, { blockedByHost = false } = {}) {
    super(message);
    this.blockedByHost = blockedByHost;
  }
}

async function decode(blob) {
  try {
    // Honour the camera's rotation flag, so phone photos aren't sideways.
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Older browsers: decode through an <img>.
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new PortraitError(
        "This browser can't read that picture format. Try a JPEG or PNG (on iPhone: share the photo as JPEG)."
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Ship pictures (gm/gm-ship.js) are wide instead of square: a 16:9 centre
// crop. A ship document also holds the hold, so the cap is a little higher.
export const SHIP_PICTURE = { width: 480, height: 270, maxBytes: 80 * 1024 };

// Any image Blob/File -> small data: URL, a centre crop of width×height
// (a SIZE square by default).
export async function compressPortrait(blob, { width = SIZE, height = SIZE, maxBytes = MAX_BYTES } = {}) {
  if (blob.type && !blob.type.startsWith("image/")) {
    throw new PortraitError("That file isn't a picture.");
  }
  const image = await decode(blob);
  const w = image.width || image.naturalWidth;
  const h = image.height || image.naturalHeight;
  if (!w || !h) throw new PortraitError("That picture appears to be empty.");

  // The largest centre crop with the target's shape, scaled down (never up).
  const aspect = width / height;
  const cropW = Math.min(w, h * aspect);
  const cropH = cropW / aspect;
  const scale = Math.min(1, width / cropW);
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, outW, outH);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, (w - cropW) / 2, (h - cropH) / 2, cropW, cropH, 0, 0, outW, outH);
  image.close?.();

  // Browsers that can't encode WebP silently return PNG; use JPEG there.
  let type = "image/webp";
  const probe = await toBlob(canvas, type, QUALITIES[0]);
  if (!probe || probe.type !== type) type = "image/jpeg";

  let out = probe && probe.type === type ? probe : null;
  for (const q of QUALITIES) {
    if (out && out.size <= maxBytes) break;
    out = await toBlob(canvas, type, q);
  }
  if (!out || out.size > maxBytes) {
    throw new PortraitError("Couldn't shrink that picture enough. Try a different one.");
  }
  return blobToDataUrl(out);
}

// Image link -> small data: URL (downloaded once, now). `options` as for
// compressPortrait().
export async function importFromUrl(link, options) {
  const src = portraitUrl(link);
  if (!src || src.startsWith("data:")) throw new PortraitError("That isn't a web link (it must start with https://).");

  let response;
  try {
    response = await fetch(src, { referrerPolicy: "no-referrer", credentials: "omit" });
  } catch {
    // A network failure and a host that forbids copying look the same here.
    throw new PortraitError(
      "Couldn't download that picture: the site doesn't allow it, or you're offline.",
      { blockedByHost: true }
    );
  }
  if (!response.ok) {
    throw new PortraitError(
      response.status === 404 || response.status === 403
        ? "That link doesn't work anymore (expired or removed). Discord links expire after a day."
        : `Couldn't download that picture (error ${response.status}).`
    );
  }
  return compressPortrait(await response.blob(), options);
}

export function isStoredPortrait(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}
