// ============================================================
// Rules page: renders rules.md as Homebrewery-style book pages.
//
// Supported Homebrewery syntax on top of normal Markdown:
//   \page              start a new page
//   \column            force a column break
//   {{note ... }}      a block with a CSS class (note, descriptive, wide, ...)
//                      on its own lines: "{{class1,class2" ... "}}"
//   \shipcompendium    (Ship Rules only) the Ship Compendium, built from the
//                      one-file-per-ship type files in rules/ships/
//
// The third tab, the Ship Gallery (?book=gallery), shows the same ship
// type files as browsable cards with pictures, for players.
// ============================================================

import { marked } from "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js";
import { escapeHtml } from "../js/format.js";
import { loadShipCatalog, compendiumMarkdown } from "../js/ship-catalog.js";
import { shipTypeCardHtml, createShipTypeBrowser } from "../js/ship-cards.js";

marked.use({ gfm: true });

const book = document.getElementById("rules-book");

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Pull {{class ... }} blocks out before Markdown parsing (marked won't parse
// Markdown inside raw HTML blocks), render their insides separately, and
// splice them back in afterwards via placeholder comments.
function renderPage(source) {
  const blocks = [];
  const withPlaceholders = source.replace(
    /^\{\{([\w\s,-]+)\n([\s\S]*?)\n\}\}[ \t]*$/gm,
    (_, classes, inner) => {
      const cls = classes.split(/[\s,]+/).filter(Boolean).join(" ");
      blocks.push(`<div class="${cls}">${marked.parse(inner)}</div>`);
      return `\n<!--block:${blocks.length - 1}-->\n`;
    }
  ).replace(/^\\column[ \t]*$/gm, '\n<div class="column-break"></div>\n');

  return marked
    .parse(withPlaceholders)
    .replace(/<!--block:(\d+)-->/g, (_, i) => blocks[Number(i)]);
}

function buildBook(markdown) {
  const pages = markdown.split(/^\\page[ \t]*$/m);
  book.innerHTML = "";

  let footnote = "";
  pages.forEach((source, index) => {
    const page = document.createElement("section");
    page.className = "phb-page";
    page.id = `p${index + 1}`;
    page.innerHTML = renderPage(source);

    // Anchors for every heading so sections can be linked (rules/#5-magic).
    page.querySelectorAll("h1, h2, h3, h4").forEach(h => {
      if (!h.id) h.id = slugify(h.textContent);
    });

    // Footer text = the chapter (h2) this page belongs to, like Homebrewery's
    // running footnote. Carries over from the previous page if none starts here.
    const lastH2 = [...page.querySelectorAll("h2")].pop();
    const firstH2 = page.querySelector("h2");
    const label = firstH2 ? firstH2.textContent : footnote;
    if (lastH2) footnote = lastH2.textContent;

    page.insertAdjacentHTML(
      "beforeend",
      `<div class="phb-footnote">${label.replace(/^\d+\.\s*/, "")}</div>` +
      `<div class="phb-page-number">${index + 1}</div>`
    );
    book.appendChild(page);
  });

  // Re-apply a #hash jump now that the target exists.
  if (location.hash) {
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }
}

// Which rulebook to show: ?book=ships, otherwise the core rules.
const BOOKS = {
  core:    { file: "rules.md", title: "Rules" },
  ships:   { file: "ships.md", title: "Ship Rules" },
  gallery: { title: "Ship Gallery" }
};
const bookKey = new URLSearchParams(location.search).get("book");
const current = BOOKS[bookKey] ? bookKey : "core";

document.title = `${BOOKS[current].title} — Archipelago`;
document.querySelectorAll("#book-tabs a").forEach(a => {
  if (a.dataset.book === current) a.setAttribute("aria-current", "page");
});

// The \shipcompendium marker becomes Part III, numbered on from the last
// numbered chapter before it.
async function withCompendium(markdown) {
  if (!/^\\shipcompendium[ \t]*$/m.test(markdown)) return markdown;
  const catalog = await loadShipCatalog("./");
  const last = Math.max(0, ...[...markdown.matchAll(/^## (\d+)\./gm)].map(m => Number(m[1])));
  return markdown.replace(/^\\shipcompendium[ \t]*$/m, () => compendiumMarkdown(catalog, last + 1));
}

async function buildGallery() {
  const catalog = await loadShipCatalog("./");
  book.classList.add("ship-gallery");
  book.innerHTML = `
    <div class="ship-gallery-head">
      <h1>Ship Gallery</h1>
      <p>Every ship type in the Ship Rules' compendium — what it's like, what it's good at, and what it costs. Tap “About this ship” for the full story.</p>
      <div class="shipyard-tools">
        <input type="search" id="gallery-filter" placeholder="Search ships… e.g. fishing, oars, shallow" aria-label="Search ships">
        <div class="hold-chips" id="gallery-chips" role="group" aria-label="Show group"></div>
      </div>
    </div>
    <div class="gm-party shipyard-grid" id="gallery-grid"></div>`;
  const browser = createShipTypeBrowser({
    grid: document.getElementById("gallery-grid"),
    filter: document.getElementById("gallery-filter"),
    chips: document.getElementById("gallery-chips")
  }, {
    makeCard(type) {
      const el = document.createElement("article");
      el.className = "card gm-card shipyard-card";
      el.id = type.key;
      el.innerHTML = shipTypeCardHtml(type, { traits: catalog.traits });
      return el;
    }
  });
  browser.setTypes(catalog.ships);
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

try {
  if (current === "gallery") {
    await buildGallery();
  } else {
    const res = await fetch(BOOKS[current].file, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buildBook(await withCompendium(await res.text()));
  }
} catch (err) {
  book.innerHTML = `<p class="rules-status">Could not load the rules (${escapeHtml(err.message)}). ` +
    `If you opened this file directly, serve the folder over HTTP instead.</p>`;
}
