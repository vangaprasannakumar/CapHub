# CapHub — Precision Winding & Potting Calculator

A single-file Progressive Web App for MPP film capacitor element design: winding geometry, potting/resin recipes, kVAr↔µF conversion, and multi-stage concentric windings. Built to match a validated production Excel workbook (`Cap_Formula.xlsx`) exactly, then extended well past what the spreadsheet could do.

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
- **Formula Matrix** — batch calculator for running many configurations at once, with CSV export.
- **Product Library** — 56 real qualified product configurations pulled directly from the source workbook, each with its original Drawing/Code ID. Searchable; one tap loads a product straight into Cap Formula.

## Other features

- **Can-Fit Check** — Yes/No fit validation against a target can diameter, with an **editable clearance margin** (defaults match the source workbook: 6mm for Cap Formula/Flat Elements, 9mm for kVAr, but fully overridable per calculation).
- **Live winding diagram** — Cap Formula renders an to-scale SVG cross-section (core / film / cover) that redraws as you type.
- **Calculation History** — every "Force Calc" or ticket print is snapshotted locally; restore or delete past runs, or export the log as CSV. (Stored in browser `localStorage` — it's per-device, not synced across your phone/desktop.)
- **Cross-tab carry-over** — push Cap Formula's winding parameters (thickness, width, margin, offset, core OD, cover turns) straight into DCW, TCW, or Flat Elements instead of retyping them.
- **Production tickets** — print-to-PDF travelers with a letterhead, unique ticket ID, the winding diagram (Cap Formula), and a Prepared/Checked/Approved signoff block. Laid out to fit one A4 page.
- **Engine Self-Test** — a built-in diagnostic (checkmark icon, top right) that re-validates the calculation engine against hand-verified values from the source Excel workbook. Run it after any future edit to the formulas.

---

## Engine accuracy

Every formula in this app was cross-checked cell-by-cell against `Cap_Formula.xlsx`'s cached values, not just re-derived from first principles. Where this mattered:

- The kVAr↔µF conversion intentionally uses the workbook's **legacy constant** (`159,235,000`, and `1.732` for √3) rather than exact physics constants, so results match historical drawings exactly rather than diverging by ~0.05%.
- The two TCW modes use **different, real cover-thickness schemes** (0.5/0.5/0.5mm for MFD-driven, 0.8/0.8/1.5mm for kVAr-driven) — this is a genuine difference between the source workbook's two sheets, not a simplification.
- SA/MFD divides by **Fin. MFD**, not the raw target MFD — a bug that only shows up when Pos Tol % is non-zero, which is why it stayed hidden through early testing.
- Core weight follows the workbook's `(2/75) × Width` formula rather than a fixed constant.

Run **Engine Self-Test** any time you're unsure the app still matches the workbook — it checks 30 assertions across every calculation type against real cached values from the source file.

---

## Changelog

Summarized from the engineering pass this app went through — kept here as a record of what was found and fixed, in case any of it needs revisiting.

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

**Additions:**
- Can-Fit check (with editable clearance), Product Library, Calculation History, CSV export, cross-tab carry-over, the Engine Self-Test suite, required-field validation, the live winding diagram, and the full visual/print redesign

---

## Notes

- **No servers, no accounts.** Everything runs client-side. History and preferences live in your browser's `localStorage`.
- **Offline support** is opportunistic — the app shell is cached on first load, and other assets (fonts, icons) cache themselves in as they're used via a stale-while-revalidate service worker.
- If a formula ever needs revisiting, the audit trail for *why* it's implemented the way it is lives in the code comments right next to each calculation — look for comments referencing "Excel" or specific cell formulas.
