# CapHub — Precision Winding & Potting Calculator

A single-file Progressive Web App for MPP film capacitor element design: winding geometry, potting/resin recipes, kVAr↔µF conversion, multi-stage concentric windings, zinc spray consumption, and discharge resistor sizing. Built to match a validated production Excel workbook (`Cap_Formula.xlsx`) exactly, then extended well past what the spreadsheet could do.

No build step, no backend, no dependencies to install — it's one HTML file plus a manifest and a service worker.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app — UI, styling, and calculation engine in one file |
| `manifest.json` | PWA metadata (name, icons, theme colors) so it can be "installed" on desktop/mobile |
| `sw.js` | Service worker — enables offline use and in-app update notifications |

To deploy: host all three files together on any static web server (or open `index.html` directly for local use — PWA install and offline caching require serving over `http(s)`, not `file://`).

---

## Modules

- **Cap Formula** — single-stage winding + potting recipe calculator. The primary tool.
- **kVAr Integrator** — kVAr ⇄ µF conversion (both directions), feeding into its own winding calculator with a Film Type (SERIES / SLOPE-WC) toggle that changes the winding formula.
- **DCW Module** — double concentric winding (two nested elements).
- **TCW Module** — triple concentric winding, with separate MFD-driven and kVAr-driven modes (these use different, source-verified cover-thickness schemes — see Engine Accuracy below).
- **Flat Elements** — oval/flat winding plus minimum PBT box sizing.
- **Spray & Zinc** — zinc schoopage consumption per element, in grams. Handles 1, 2 or 3 concentric elements and sums them. Can and film dimensions are recorded on the ticket for traceability but do not enter the calculation — only element diameter and spray thickness do.
- **Discharge Resistor** — sizes the three discharge resistors for a 3-Φ bank, from either a kVAr rating or a µF value entered directly. Returns resistance, wattage, and the standard wattage to fit.
- **Formula Matrix** — batch calculator for running many configurations at once, with CSV export.

---

## Reading the Length figure

Two metallised films are wound together, forming two dielectric interfaces. The engine's **Length** output is the **combined run across both films** — which is what you issue from stores, and what the element weight is calculated from.

The winder needs half of it. Every winding module therefore reports both:

| Row | Meaning |
|---|---|
| **Total Film Length — both films** | Material to issue. Element weight is derived from this. |
| **Length per Film — cut length** | What to set per reel. Half of the above. |

Both figures print on the production ticket. Cutting each reel to the *total* issues twice the film needed.

---

## Other features

- **Can-Fit Check** — Yes/No fit validation against a target can diameter, with an **editable clearance margin** (defaults match the source workbook: 6mm for Cap Formula/Flat Elements, 9mm for kVAr, but fully overridable per calculation).
- **Element-fit guard** — Cap Formula warns, and names the overflow in cm³, when the element volume exceeds the can volume or the element is wider than the bore. The source workbook lets this pass silently and prints a *negative* resin quantity; here the void is clamped at zero and the impossible combination is called out instead of hiding behind a plausible-looking `0.00`.
- **Batch resin** — a No. of Elements input gives the resin mix for a whole batch alongside the per-element figure. Multiplies the full-precision value, not the rounded display value.
- **Live winding diagram** — Cap Formula renders a to-scale SVG cross-section (core / film / cover) that redraws as you type.
- **Calculation History** — every "Force Calc" or ticket print is snapshotted locally; restore or delete past runs, or export the log as CSV. (Stored in browser `localStorage` — it's per-device, not synced across your phone/desktop.)
- **Cross-tab carry-over** — push Cap Formula's winding parameters (thickness, width, margin, offset, core OD, cover turns) straight into DCW, TCW, or Flat Elements instead of retyping them. Every winding module can also push its computed element diameters straight into Spray & Zinc.
- **Production tickets** — print-to-PDF travelers with a letterhead, unique ticket ID, the winding diagram (Cap Formula), and a Prepared/Checked/Approved signoff block. Laid out to fit one A4 page.
- **App Lock** — an optional 4-digit PIN gate, with the hash synced from a Google Apps Script endpoint. This is a casual-access gate for shared shop-floor devices, **not** a security boundary: it runs entirely client-side, and a 4-digit PIN with a known salt is trivially brute-forced by anyone holding the hash. Treat it as a "don't wander in here by accident" lock. The PIN screen itself now says as much, alongside a note that nothing calculated leaves the device and a contact address for a forgotten PIN.
- **Engine Self-Test** — a built-in diagnostic that re-validates the calculation engine against hand-verified values from the source workbooks. Run it after any future edit to the formulas.

---

## Settings

Reached from the gear in the top right.

- **Theme** — Light, Dark, System, or **Glass**. System follows the OS preference live. Glass is an iOS-style frosted treatment: translucent panels at 24px blur with 180% saturation over a warm aurora backdrop, so the blur has something to pick up.
- **Zoom** — 80% to 200% in 10% steps. Scales the **calculator body only**; the header and bottom nav stay fixed. Implemented as a single CSS `zoom` on the scroll container, which the header and nav are siblings of rather than children — so they are structurally incapable of scaling. The nav clearance is divided by the zoom factor so the gap stays visually constant at every level. Requires CSS `zoom` support (Chrome, Safari, Firefox 126+); where it's missing the control hides itself rather than sitting there doing nothing.
- **Backup / Restore Data** — writes `caphub_backup_YYYY-MM-DD.json` stamped with app and version. Restore accepts either a full backup object or a bare history array, rejects malformed JSON, files with no history, and files with no readable entries, and confirms with both counts before replacing.
- **Quick Guide** — the first-run tour of what sits on each tab, reopenable at any time.
- **Formula Book** — see below.
- **Calculation History**, **Engine Self-Test**, **App Lock** and **Install App** all live here too.

### First run

A **Quick Guide** opens the first time the app is loaded, describing what each of the eight calculator tabs does, what the shared Force Calc / Print Ticket / Share buttons do, and what lives in Settings. It is dismissed permanently once closed and can be reopened from Settings → Quick Guide.

The install offer waits its turn behind it — the guide is about using the app, so it goes first, and the install sheet is presented once the guide is closed. An explicit tap on **Install App** in Settings overrides that ordering; the PIN screen never can be overridden.

### Install prompt

There are two separate offers, and they are dismissed independently:

- A **persistent bar** just under the header, centred, shown whenever the app is installable and not yet installed. Hiding it is remembered.
- A **one-shot sheet** on first run with the fuller pitch.

Dismissing the sheet deliberately leaves the bar in place, so declining once does not remove the only remaining route to installing. Settings → Install App restores both.

Both use the same two paths, because Android and iOS are genuinely different:

- **Android/Chrome** captures `beforeinstallprompt`, defers it, and replays the real native prompt from the app's own button.
- **iOS Safari** has no such event and never will, so the Install button would be a dead control. It is hidden and manual Share → Add to Home Screen steps are shown instead.

Suppressed when already installed, when already answered, and while the PIN screen is up (it would cover the only way in) — re-offered shortly after unlock. iPadOS 13+ reports a desktop Mac UA, so detection also checks touch points. Dismissing is remembered; the **Install App** row in Settings re-offers it, since these are shared devices and the first person to see the prompt may not be the one who wants it.

---

## Formula Book

Settings → Formula Book. Eight chapters — Cap Formula, Potting, kVAr, DCW/TCW, Flat Elements, Spray & Zinc, Discharge Resistor, and Constants — documenting every calculation the app performs.

Each formula carries four things:

1. The equation.
2. A symbol table: meaning, unit, and where the value comes from.
3. A worked example **using your current inputs**.
4. A note on *why* it's built that way.

The worked examples are not hardcoded. The book calls the same engine functions the calculators use — `getWindingResults`, `calcResin`, `calcZinc`, `calcDischargeResistor` and the rest — so it always shows real current numbers, and if an engine is ever changed the book follows it rather than drifting into a confident lie.

Seven chapters carry an animated flow diagram of how values move through the chain. Five carry an animated SVG explainer: two films winding together, zinc landing on both end faces, voltage decaying to the 50V line, resin filling the void around an element, and each concentric stage becoming the next one's core. All pure SVG and CSS keyframes — no canvas, no animation loop — so they cost nothing while the book is closed.

The Constants chapter documents every fixed number with its derivation, including the ones that are deliberately imprecise. See below.

---

## Engine accuracy

Every formula in this app was cross-checked cell-by-cell against `Cap_Formula.xlsx`'s cached values, not just re-derived from first principles. Where this mattered:

- The kVAr↔µF conversion intentionally uses the workbook's **legacy constant** (`159,235,000`, and `1.732` for √3) rather than exact physics constants, so results match historical drawings exactly rather than diverging by ~0.05%.
- The two TCW modes use **different, real cover-thickness schemes** (0.5/0.5/0.5mm for MFD-driven, 0.8/0.8/1.5mm for kVAr-driven) — this is a genuine difference between the source workbook's two sheets, not a simplification.
- SA/MFD divides by **Fin. MFD**, not the raw target MFD — a bug that only shows up when Pos Tol % is non-zero, which is why it stayed hidden through early testing.
- Core weight follows the workbook's `(2/75) × Width` formula rather than a fixed constant.
- **Zinc** uses the source sheet's `d² × t × 11.21 / 1000`. The constant resolves to `2 × (π/4) × 7.14` — two sprayed end faces at zinc's density of 7.14 g/cm³. The sheet's first data row omits the `/1000` that every other row applies, reporting ~9036 where it means 9.036 g; the engine applies it uniformly.
- **Discharge resistor** capacitance comes from CapHub's shared kVAr engine rather than the source Resistor sheet's own `4 × 3.142`, so the tab always agrees with the kVAr Integrator. The divergence runs up to ~0.1% — far too small to move a standard wattage band. The sheet's discharge constant `2.3` is a rounded `ln(10)` (2.302585), leaving it ~0.26% below the exact `ln(√2·V/50)` form; kept for parity with existing drawings.
- **Standard wattage bands** were listed in the source sheet as ranges with a gap between 1.0 and 1.10, so a computed 1.05 W matched no band at all. They are treated here as contiguous upper bounds. Above the largest stocked size the app says *Non-standard* rather than guessing.
- **`3.14` rather than `Math.PI`** is used throughout, matching the workbook. It runs 0.0507% below π. In the wound-radius derivation it largely cancels, since the same value appears above and below the square root; on can volume it doesn't cancel, but 0.05% of a typical void is well under a hundredth of a gram of resin. Deliberate, not an oversight.

Run **Engine Self-Test** any time you're unsure the app still matches the workbooks — it checks 50 assertions across 19 cases covering every calculation type, against real cached values from the source files.

---

## Changelog

Summarized from the engineering passes this app went through — kept here as a record of what was found and fixed, in case any of it needs revisiting.

**Formula corrections** (all verified against `Cap_Formula.xlsx`):
- Cover-film diameter was hardcoded `+0.4mm` regardless of the Cover Turns input — now tracks it dynamically
- Cover-film weight constant tightened to the exact `1/910`, and `Math.PI` swapped for Excel's literal `3.14` in that formula
- TCW module was using one cover scheme for both MFD- and kVAr-driven modes — split into the two real, distinct schemes
- Resin/hardener calculation had the split order backwards (was computing the total mix and subtracting hardener, instead of computing resin first and adding hardener on top)
- SA/MFD was dividing by raw MFD instead of Fin. MFD
- Core weight was hardcoded to `0.8g` (only correct at the default 30mm width) instead of the actual `(2/75)×Width` formula
- kVAr↔µF conversion switched to the workbook's exact legacy constant, and per-element MFD rounding order corrected to match Excel's cell-by-cell evaluation
- kVAr tab's Film Type (SERIES/SLOPE-WC) dropdown existed in the UI but wasn't wired to the ×4 MFD multiplier or the active-width formula it controls in the source sheet

**Bugs found outside the formulas:**
- A CSS grid bug left the TCW module confined to half the screen width on desktop
- The header's icon buttons sat in an unstyled `<div>`, causing inconsistent layout
- The service worker's cache version had never been bumped, meaning updates were invisible to anyone who'd already loaded the app — this is fixed, and an in-app "update available" toast now surfaces future updates instead of failing silently
- The kVAr tab seeded its conversion panel at load, but the TCW kVAr tab had no equivalent — its MFD per Phase / Total µF / Total kVAr fields sat on static placeholders until an input was touched, and a ticket printed before that captured the placeholders instead of real values

**Later pass — new modules and app shell:**
- Added the **Spray & Zinc** and **Discharge Resistor** modules
- Added **Length per Film** alongside the existing total, on screen and on every ticket, after the total was found to be ambiguous enough to risk cutting reels at double length
- Added the element-fit guard and the batch resin quantity to Cap Formula
- Consolidated four header icons into a single **Settings** sheet, adding the Glass theme, body-only Zoom, and JSON Backup/Restore
- Added the first-run **install prompt** for Android and iOS
- Added the **Formula Book**
- `manifest.json` advertised the dark palette while the app defaults to light, so the install splash flashed dark then jumped — both colors now match the default theme
- **Removed the Product Library.** The 56 stored configurations duplicated data that lives in the source workbook, and keeping a frozen copy inside the app meant two sources of truth drifting apart

**Version 2.0:**
- Cap Formula's default Target MFD changed from 5 to 2.5 µF
- Added the persistent top install bar, alongside the existing first-run sheet
- Added the first-run **Quick Guide**, with a Settings row to reopen it
- Expanded Settings → About with a description, developer and contact address
- Added an explanation of what the App Lock is and isn't to the PIN screen

---

## Known gaps

Worth knowing about before the next round of work:

- **Input validation is uneven.** Spray & Zinc and Discharge Resistor guard their inputs; the five original winding modules do not. A negative film thickness produces negative length and turns but still prints a plausible-looking element weight, and a target of `0 µF` renders SA/MFD as `Infinity` — both of which reach the printed ticket.
- **The app icon is hotlinked** from a third-party image host rather than committed here. The service worker caches it opportunistically after a first online load, but a first-ever offline load shows no logo, and manifest icon availability depends on that host staying up.
- **History has no filter.** With eight modules feeding a 50-entry cap, it fills quickly and can only be scrolled.

---

## Notes

- **No servers, no accounts.** Everything runs client-side. History and preferences live in your browser's `localStorage`.
- **Offline support** is opportunistic — the app shell is cached on first load, and other assets (fonts, icons) cache themselves in as they're used via a stale-while-revalidate service worker.
- **Bump `CACHE_NAME` in `sw.js` on every release.** Service workers only re-install when that file's bytes change; if it doesn't change, returning users can stay on an old cached `index.html` indefinitely.
- **Contact** — Vanga Prasanna Kumar, <vangaprasannakumar@gmail.com>. The address is also surfaced in Settings → About and on the PIN screen, so anyone locked out on the floor has a route back in.
- If a formula ever needs revisiting, the audit trail for *why* it's implemented the way it is lives in the code comments right next to each calculation — look for comments referencing "Excel" or specific cell formulas. The Formula Book covers the same ground in plain language, with units.
