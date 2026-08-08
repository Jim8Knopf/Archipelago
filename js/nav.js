// ============================================================
// Shared top navigation.
// Every page used to hand-write its own <nav> with a slightly different
// subset of links (never linking to itself). That meant 4 copies to keep in
// sync, and no page ever showed "you are here". This module replaces all of
// that: every page lists all four destinations, and the current one is
// rendered as plain text instead of a link.
//
// Usage: <nav id="site-nav"></nav> somewhere in header.top, then
//   <script type="module" src="js/nav.js"></script>       (from site root)
//   <script type="module" src="../js/nav.js"></script>    (from a subfolder)
// ============================================================

const PAGES = [
  { key: "home", label: "Home", folder: "" },
  { key: "sheet", label: "Character Sheet", folder: "sheet/" },
  { key: "gm", label: "GM Dashboard", folder: "gm/" },
  { key: "admin", label: "Admin", folder: "admin/" }
];

// Every non-home page lives exactly one folder below the site root
// (site.com/sheet/, site.com/gm/, site.com/admin/), so we can tell which
// page we're on just by checking which folder name the path ends with.
function currentPageKey() {
  const path = window.location.pathname.replace(/index\.html$/, "");
  const match = PAGES.find(p => p.folder && path.endsWith("/" + p.folder));
  return match ? match.key : "home";
}

function linkHref(page, current) {
  // From the site root, folders are relative ("sheet/"); from one folder
  // down, everything (including the root itself) is reached via "../".
  if (current === "home") return page.folder || "./";
  return page.folder ? `../${page.folder}` : "../";
}

export function renderNav() {
  const nav = document.getElementById("site-nav");
  if (!nav) return;

  const current = currentPageKey();
  nav.innerHTML = PAGES.map(page => {
    if (page.key === current) {
      return `<span class="nav-current" aria-current="page">${page.label}</span>`;
    }
    return `<a href="${linkHref(page, current)}">${page.label}</a>`;
  }).join("");
}

renderNav();
