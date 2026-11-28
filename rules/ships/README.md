# Ship types — one file per ship

Every ship type is one Markdown file in this folder, and `index.json` lists them
in book order, by group. These files are the **only** place a ship type's values
live. They are read by:

- the Ship Rules book (Part III, the Ship Compendium, where `\shipcompendium` stands
  in `../ships.md`) — the quick-reference table is built from them too,
- the **Ship Gallery** on the Rules page (players browse the types),
- the GM Dashboard's **Shipyard** and ship cards, and
- the player sheet's ⛵ Ship section.

A ship in a campaign stores only its type (the file name) and its story changes, so
correcting a value here changes every ship of that type.

## Adding a ship type

1. Copy a file, e.g. `sloop.md` → `ketch.md` (the file name is the type's key — keep
   it once ships use it).
2. Change the heading, the italic summary line, the value table, the description and
   the **Benefits:** / **Flaws:** lines. Keep the table's row labels as they are.
3. Add `"ketch"` to its group's `ships` list in `index.json` (that sets its place in
   the book). A new group gets a new entry there.

## Pictures

Put the picture next to the file (landscape works best) and add a line to the file:

    ![Sloop](sloop.webp)

The book, the gallery, the shipyard and every ship of that type show it (a ship can
still get its own picture under Edit ship).
