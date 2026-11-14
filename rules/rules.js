// ============================================================
// Rules page: renders rules.md as Homebrewery-style book pages.
//
// Supported Homebrewery syntax on top of normal Markdown:
//   \page              start a new page
//   \column            force a column break
//   {{note ... }}      a block with a CSS class (note, descriptive, wide, ...)
//                      on its own lines: "{{class1,class2" ... "}}"
// ============================================================

import { marked } from "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js";

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

try {
  const res = await fetch("rules.md", { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  buildBook(await res.text());
} catch (err) {
  book.innerHTML = `<p class="rules-status">Could not load the rules (${err.message}). ` +
    `If you opened this file directly, serve the folder over HTTP instead.</p>`;
}
