# Handoff: El Hornero — Ordering Site (home + catalogue)

## Overview
A recreation of the El Hornero food-delivery ordering site: marketing home page with a
promo hero banner, an order-mode strip (delivery / pickup), a "Menú" grid of category
tiles, two promo banners, and a green footer. Clicking a category tile switches the
Menú section into a product grid for that category; adding a product opens a slide-in
cart drawer with subtotal / shipping / 15% IVA / total.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing
intended look and behavior, not production code to copy directly. The task is to
**recreate this design in the target codebase's existing environment** (React, Vue,
Next.js, etc.) using its established patterns, component library, and styling approach.
If no environment exists yet, pick the framework most appropriate for the project
(the real site is a client-rendered SPA; Next.js is a natural fit) and implement there.

`Pizzeria Delivery.dc.html` is a single-file streaming component format: markup with
`{{ value }}` holes plus a logic class that returns those values. Read it as
"template + view model" — the logic class is where all state and derived values live.

## Fidelity
**High-fidelity.** Colors, typography, spacing and interactions are final and should be
reproduced closely. Brand artwork (hero banner, 8 category tiles, 2 promo banners) is
real, supplied by the client, and is included in `assets/`. Two things are NOT final:
- individual dish photography inside category product cards (striped placeholders)
- the `el Hornero` wordmark in header and footer (set in italic Poppins as a stand-in;
  replace with the official logo SVG)

## Screens / Views

### 1. Home (default state)
**Purpose:** orient the customer, push the app/promos, and get them into the catalogue.

**Layout:** single column, max-width 1920px, centered, white background. Vertical order:
1. Sticky header (white, min-height 78px, padding 14px 28px, `position: sticky; top: 0; z-index: 30`)
2. Order-mode strip (background #2B2B2B, padding 12px 28px)
3. Hero banner section (background #0E5A33; full-bleed `<img>`, `width: 100%; height: auto`)
4. Centered "Conoce nuestro catálogo" pill (padding block 46px / 6px)
5. `#menu` section (max-width 1400px, centered, padding 40px 28px 20px)
6. `#promo-pair` (max-width 1400px, padding 48px 28px 80px, 2 columns, gap 34px)
7. Footer (background #0E5A33, padding 56px 28px 30px)
8. Cart drawer (fixed, off-canvas)

**Header components (left → right, flex, gap 26px):**
- Wordmark: "el Hornero", Poppins italic 600, 28px, letter-spacing -0.02em, color #0E5A33
- Nav links "Ordenar / Restaurantes / Contactos": Poppins 600, 16px, #1D1D1B, hover #0E5A33, gap 22px
- Right cluster (`margin-left: auto`, flex 1 1 340px, gap 18px, justify-end):
  - Search field: background #F2F2F2, border-radius 999px, padding 8px 14px, flex 1 1 240px,
    max-width 300px. Leading 28px circle #0E5A33 containing a white 15px search icon
    (stroke 2.4, circle r 6.5 + 45° handle). Input: transparent, Poppins 15px,
    placeholder "Busca tu comida favorita".
  - "Cupones": 30×22 rounded-5 #1D1D1B chip with a #F5C518 ticket icon, label 12.5px below
  - "Perfil": 24px circle #1D1D1B with a white person glyph, label 12.5px below
  - "Ingresar" button: background #1D1D1B, white, border-radius 999px, padding 15px 26px,
    Poppins 600 15.5px; hover background #0E5A33
  - Cart button: 52px circle #F2F2F2 (hover #E4E4E4) with a 23px #1D1D1B cart icon
    (stroke 1.9) and a count badge — min-width 22px, height 22px, radius 999px,
    background #0E5A33, white 12px 600, offset top/right -2px

**Order-mode strip:**
- Segmented control: container `position: relative`, `display: grid; grid-template-columns: 1fr 1fr`,
  background #3A3A3A, border-radius 999px, padding 3px. An absolutely positioned indicator
  (top/bottom/left 3px, `width: calc(50% - 3px)`, radius 999px, background #0E7C41)
  slides with `transform: translateX(0 | 100%)`, transition 200ms ease. Buttons sit above it
  (`z-index: 1`, transparent, white, Poppins 600 14.5px, padding 8px 18px): "A domicilio", "Para llevar".
- "Ingresa tu ubicación ▾": transparent button, white Poppins 500 15px, hover #F5C518.

**"Conoce nuestro catálogo" button:** background #0E5A33, white, radius 999px,
padding 15px 34px, Poppins 500 17px; hover #0A4526. Anchors to `#menu`.

**Menú section:**
- Heading `<h2>`: Poppins 600 34px, letter-spacing -0.02em. Text is the active category
  name, "Resultados" when searching, otherwise "Menú".
- Tile grid: `repeat(auto-fill, minmax(200px, 1fr))`, gap 24px 26px.
- Tile: square (`aspect-ratio: 1/1`), border-radius 10px, background #0E5A33 (fallback),
  `overflow: hidden`, containing the supplied artwork `<img>` at `object-fit: cover`.
  The category title is baked into the artwork — do not overlay text.
  Below the tile: label (Poppins 400 15.5px, #1D1D1B) then a 1px #D9D9D9 rule, gap 12px/10px.
  Whole tile is clickable (cursor pointer).

**Promo pair:** two rounded-10 links, each a full-width `<img>` (native 630px wide).
Left = `banner-cupon.png` (#Cupones), right = `banner-descarga.png` (#AppMobile).

**Footer:** background #0E5A33, white. Grid `1fr 1.6fr`, gap 40px, max-width 1400px.
Left: wordmark (italic 600, 30px) + two 34px social chips (Instagram = rounded-8 outlined
1px rgba(255,255,255,0.55), hover inverts to white on green; Facebook = white circle, green "f").
Right: link row, right-aligned, wrap, gap 12px 26px, Poppins 600 15.5px, hover #F5C518 —
Ordenar, Restaurantes, Términos legales, Contactos, Sé parte de hornero, Comprobantes.
Bottom bar: 1px rgba(255,255,255,0.35) top border, margin-top 40px, padding-top 20px,
14px text — copyright left, phone + hours right.

### 2. Category view (in-place replacement of the tile grid)
Same section, tiles swapped for a product grid plus a "← Volver al menú" text button
(transparent, #0E5A33, Poppins 600 15px) beside the heading.
- Grid: `repeat(auto-fill, minmax(268px, 1fr))`, gap 26px.
- Card: 1px #E6E6E6 border (hover #0E5A33), radius 10px, `overflow: hidden`,
  rows `176px auto`.
  - Media area 176px: dish photo. Optional tag pill top-left 12px/12px — background #F5C518,
    color #0E5A33, 11px 700, letter-spacing 0.06em, uppercase, padding 5px 10px, radius 999px.
  - Body padding 16px 16px 18px, gap 9px: title (Poppins 600 17.5px), description
    (13.5px/1.5, #6A6A6A), then a row with price (700 19px, #0E5A33) and
    "Agregar" button (background #0E5A33, white, radius 999px, padding 10px 18px, 600 14px;
    hover #0A4526).
- Empty state: dashed 1px #D9D9D9, radius 10px, padding 56px 20px, centered —
  "Sin resultados" (600 19px) + "Probá con otra categoría o cambiá la búsqueda." (15px, #6A6A6A).

### 3. Cart drawer
Fixed right panel: `top/right/bottom: 0`, width 376px, `max-width: 92vw`, white,
`z-index: 40`, flex column, `box-shadow: -18px 0 46px rgba(0,0,0,0.16)`,
`transition: transform 260ms ease`, `transform: translateX(0)` open / `translateX(105%)` closed.
- Header: padding 20px 22px, 1px #EDEDED bottom border — "Mi pedido" (600 19px) with the
  mode label beneath (12.5px #6A6A6A, "A DOMICILIO" / "PARA LLEVAR"), plus a 34px
  circular #F2F2F2 close button.
- Lines (scrollable): grid `48px 1fr auto`, gap 12px, padding 15px 22px, 1px #F4F4F4 divider.
  48px rounded-8 thumbnail, name (500 14.5px), qty stepper (26px rounded-7 buttons,
  1px #E0E0E0, white), line total (600 14.5px).
- Empty state: padding 44px 26px, centered, #6A6A6A 14.5px/1.55.
- Totals block (`margin-top: auto`): padding 18px 22px 22px, 1px #EDEDED top border,
  background #FAFAFA, gap 8px — Subtotal, Envío, "IVA 15%" rows (14px #6A6A6A),
  then Total (700 19px) above a 1px #E6E6E6 rule. CTA "Continuar al pago": full width,
  background #0E5A33, white, radius 999px, padding 15px, 600 16px; hover #0A4526.
  Hint line beneath: 12.5px #6A6A6A.

## Interactions & Behavior
- **Category tile click** → set active category, clear the search query. Section heading
  becomes the category name; tile grid is replaced by that category's product grid.
- **"Volver al menú"** → clear category and query, restoring the tile grid.
- **Search input** → any non-empty query searches across ALL categories (matching name +
  description + category, case-insensitive) and takes precedence over the active category;
  heading reads "Resultados".
- **"Agregar"** → increment that product's quantity AND open the cart drawer.
- **Qty − / +** → adjust quantity; reaching 0 removes the line entirely.
- **Cart button / close button** → toggle the drawer (translateX, 260ms ease).
- **Order mode** → "A domicilio" / "Para llevar"; the pill indicator slides 200ms ease.
  Pickup forces shipping to $0.00 ("Gratis") and changes the drawer's mode label and hint.
- **Totals math**: subtotal = Σ price × qty. Shipping = $0 when pickup, when subtotal is 0,
  or when subtotal ≥ free-delivery threshold (default $25); otherwise $2.50.
  IVA = subtotal × 0.15 (Ecuador's statutory rate). Total = subtotal + shipping + IVA.
  All money formatted as `$` + 2 decimals.
- **Hint copy**: pickup → "Retiro en el local que elijas al pagar.";
  subtotal ≥ threshold → "Tenés envío gratis en este pedido.";
  otherwise → "Envío gratis desde $25.00."
- **Hover states**: nav links and footer links change color; primary buttons darken
  (#0E5A33 → #0A4526, #1D1D1B → #0E5A33); product cards shift border to #0E5A33;
  the cart circle goes #F2F2F2 → #E4E4E4.
- **Responsive** (breakpoints in the prototype's helmet `<style>`):
  - ≤1080px: header wraps and the nav moves to its own full-width row (`order: 3; flex-basis: 100%`);
    `#promo-pair` collapses to one centered column with banners capped at their native 630px;
    footer becomes one column.
  - ≤700px: header padding tightens to 12px 18px.
  - Both grids are intrinsically responsive via `auto-fill` + `minmax`, no breakpoint needed.
  - Hit targets: keep all buttons ≥44px tall on touch.

## State Management
Five pieces of local UI state — no server state in the prototype:
- `cat: string | null` — active category key (null = show tiles)
- `query: string` — search text
- `cart: Record<productId, qty>` — line quantities
- `mode: 'delivery' | 'pickup'`
- `cartOpen: boolean`

Derived (recomputed per render): filtered item list, cart line array with per-line totals,
subtotal / shipping / IVA / total, cart item count, section heading, hint copy.

Data fetching in a real build: categories and products come from the catalogue API
(the live site keys the catalogue off a `catalogueId` query param, e.g. `/?catalogueId=1`).
The prototype hardcodes 8 categories and 18 products in module-level arrays —
replace with fetched data keyed the same way (category tile → `img` + display name;
product → id, category, name, description, price, optional tag).
Cart state should persist (localStorage or server cart) and the address/location picker,
auth ("Ingresar"), coupons, and checkout are all out of scope here.

## Design Tokens
**Colors**
- Brand green `#0E5A33` (primary surfaces, buttons, links)
- Green dark / hover `#0A4526`
- Green accent (mode pill) `#0E7C41`
- Brand yellow `#F5C518` (tags, app CTA, footer link hover)
- Ink `#1D1D1B` (text, "Ingresar")
- Strip dark `#2B2B2B`; strip control `#3A3A3A`
- Muted text `#6A6A6A`
- Field grey `#F2F2F2`; field hover `#E4E4E4`; drawer footer `#FAFAFA`
- Borders: `#E6E6E6` (cards), `#EDEDED` (drawer), `#F4F4F4` (line divider), `#D9D9D9` (tile rule), `#E0E0E0` (steppers)
- Placeholder stripes: `#EFEFEF` / `#E4E4E4`
- White `#FFFFFF`

**Typography** — Poppins (300, 400, 500, 600, 700, 800 + italic 600), fallback Helvetica, sans-serif
- h2 section: 600 / 34px / -0.02em
- Card title: 600 / 17.5px / -0.01em
- Body: 400 / 15.5px; small body 13.5px / 1.5; meta 12.5px
- Nav + buttons: 600 / 15–16px
- Wordmark: italic 600 / 28px header, 30px footer
- Price: 700 / 19px

**Spacing** — 3, 6, 8, 9, 10, 12, 14, 16, 18, 20, 22, 26, 28, 34, 40, 46, 56, 80px.
Page gutter 28px; section max-width 1400px; page max-width 1920px.

**Radius** — 999px (pills, chips, badges), 10px (tiles, cards, banners), 8px (thumbnails, IG chip), 7px (steppers), 5px (cupones chip).

**Shadows** — drawer only: `-18px 0 46px rgba(0,0,0,0.16)`.

**Motion** — drawer `transform 260ms ease`; mode pill `transform 200ms ease`.

## Assets
Client-supplied artwork, in `assets/` (PNG). Titles are baked into the category tiles
and banners, so no text overlays:
- `hero-portada.png` — home hero banner, 1440×~440 ("Encuentra promociones y descuentos exclusivos")
- `cat-temporada.png`, `cat-combos.png`, `cat-pizzas.png`, `cat-ofertas.png`,
  `cat-fuertes.png`, `cat-empezar.png`, `cat-infantil.png`, `cat-acompanantes.png` —
  square category tiles, 745×745
- `banner-cupon.png`, `banner-descarga.png` — promo banners, 630px wide native
  (request 2× versions if they'll render wider than 630px)

Missing / to be supplied:
- Official `el Hornero` wordmark (SVG preferred) for header + footer — currently italic Poppins
- Per-dish photography for product cards — currently striped placeholders
- Instagram / Facebook brand icons — currently "IG" and a serif "f"

Icons in the prototype (search, cupones ticket, perfil, cart) are hand-rolled inline SVG;
substitute your icon library's equivalents.

## Files
- `Pizzeria Delivery.dc.html` — the full design (template + logic class + tweakable props)
- `assets/` — all client artwork referenced above
- `screenshots/` — reference captures of the built design:
  - `01-home-hero.png` — header, order-mode strip, hero banner
  - `02-menu-tiles.png` — Menú category tile grid
  - `03-category-products.png` — a category's product grid with "Volver al menú"
  - `04-cart-drawer.png` — open cart drawer with totals (subtotal $29.80 → total $34.27)

Tweakable props declared on the prototype, worth keeping as configuration:
- `showPromoPair` (boolean, default true) — show/hide the #Cupones + #AppMobile pair
- `freeDeliveryOver` (number, default 25) — free-shipping threshold in USD
- `defaultCategory` (enum, default "Ninguna") — land directly in a category
