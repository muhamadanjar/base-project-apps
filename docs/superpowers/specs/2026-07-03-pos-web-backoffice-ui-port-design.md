# pos-web: Port Backoffice UI System — Design

Date: 2026-07-03
Status: Approved for planning

## Goal

`services/pos-web` (Vite + React Router SPA) adopts the full visual system from
`services/backoffice` (Next.js): design tokens, UI primitives, layout shell
(sidebar/topbar/footer), motion, and page-level structure. pos-web's existing
business logic (hooks, stores, mock data) and React Router navigation are kept.
Pages that exist only in backoffice are ported into pos-web as new routes.

## Non-goals

- No backend/API wiring for newly ported pages — they ship with mock data,
  same pattern pos-web already uses for inventory/dashboard.
- No `next-auth` — pos-web has its own auth (`pages/auth/login.tsx`), untouched.
- No `next-intl` / i18n port.
- No adoption of backoffice's Zustand view-store single-page navigation
  pattern — pos-web keeps URL-based React Router navigation.

## Source / Target inventory

**Existing pos-web pages to restyle (keep logic, swap markup/classes):**
dashboard, inventory, pos, reports, settings.

**New pages to port from backoffice (component + mock data + store slice):**
catalog (incl. product-detail), customers (incl. customer-detail), suppliers,
purchase-orders, vouchers, debts, access-control, audit-log, transactions.

**Shared system to port:**
- `globals.css` design tokens → merge into pos-web's Tailwind v4 CSS-first
  token file `src/index.css` (uses `@theme inline` + `:root`/`.dark` var
  blocks already — same pattern backoffice's `globals.css` uses, direct
  merge, no format conversion needed for the CSS-variable layer).
- Layout shell: `app-sidebar`, `app-topbar`, `app-footer`, `app-right-sheet`,
  `theme-provider`, `color-scheme-init`, `layouts/default-layout`,
  `layouts/horizontal-layout`, `layouts/layout-switcher` (layout style choice
  only — not view routing), `motion/primitives`.
- `components/ui/*` diff: port missing/differently-styled primitives from
  backoffice's 48 onto pos-web's 39, overwrite shared ones for consistent
  styling.

## Adaptation rules (Next.js → Vite/React Router)

1. Strip all `"use client"` directives.
2. Replace `next/link`, `next/navigation` (`useRouter`, `usePathname`) with
   `react-router`'s `Link`, `useNavigate`, `useLocation`.
3. Replace `framer-motion` imports with `motion/react` (pos-web already
   depends on the `motion` package, same API, no new dependency).
4. Replace `next/font/google` Geist loading with pos-web's existing
   `@fontsource-variable/geist` import; apply the same CSS variable names
   (`--font-geist-sans`, `--font-geist-mono`) so token references in ported
   components resolve unchanged.
5. Sidebar/topbar nav items are driven by pos-web's `src/config/menu.ts`
   (extended with new entries) and `NavLink`/`useLocation` active-state,
   not the backoffice `view-store`.
6. Any `next/image` usage → plain `<img>` (pos-web has no image optimizer).

## Data wiring for existing pages

Restyled pages keep pos-web's current data source:
- dashboard → `pages/dashboard/store`, `data/mock-data.ts`
- inventory → `inventory/hooks/use-products.ts`, `inventory/store/*`
- pos → `pos/store/use-cart-store.ts`, `pos/data/products.ts`
- reports → `reports/store`, `reports/data/mock-data.ts`
- settings → existing schemas/components

Only JSX structure, className/styling, and layout composition change —
props/state contracts into these components stay the same so existing
hooks/stores don't need edits.

## Data wiring for new pages

Ported wholesale from backoffice, including `lib/data/{catalog,customers,
suppliers,purchase-orders,vouchers,debts,transactions}.ts` mock files and
matching store slices (adapted to pos-web's existing zustand conventions,
mirroring `pos/store/use-cart-store.ts` style). Placed under each page's own
`data/` and `store/` subfolder to match pos-web's existing per-page structure
(`pages/<name>/{components,data,store,hooks}`).

## Routing

One route per page added to `src/routes`. New routes: `/catalog`,
`/catalog/:id`, `/customers`, `/customers/:id`, `/suppliers`,
`/purchase-orders`, `/vouchers`, `/debts`, `/access-control`, `/audit-log`,
`/transactions` (plus existing `/dashboard`, `/inventory`, `/pos`, `/reports`,
`/settings`). Sidebar entries added to `menu.ts` for all new routes.

## Work order

1. Tokens/globals — merge `globals.css` into pos-web styles.
2. `components/ui` diff — port missing primitives, overwrite shared ones.
3. Layout shell + motion primitives — adapted per rules above.
4. Wire router-based nav into sidebar/topbar (replace view-store refs).
5. Restyle existing 5 pages (dashboard, inventory, pos, reports, settings).
6. Port 8 new pages one at a time, each with its route + menu entry + mock
   data/store.

Each step should build/typecheck cleanly before moving to the next — this is
a large mechanical port, and catching breakage early per-step avoids a big
tangled failure at the end.

## Testing / verification

- `pnpm build` (tsc -b && vite build) must pass after each work-order step.
- Manual smoke check in browser: sidebar navigation across all routes, theme
  toggle (light/dark via `theme-provider`), POS cart flow still works
  end-to-end (regression check on existing logic since its wrapper changes).
- No automated test suite currently exists in pos-web (verify via `find` if
  this changes); rely on typecheck + manual smoke pass.

## Open risks

- Tailwind v4 token merge: backoffice mixes `tailwind.config.ts` (v3-style)
  with v4 CSS-first (`globals.css` `@theme`), while pos-web is pure v4
  CSS-first via `@tailwindcss/vite`. Config-based tokens (if any exist only
  in `tailwind.config.ts`) need manual translation to `@theme` CSS syntax —
  no automatic converter.
- Radix component surface: pos-web depends on the bundled `radix-ui` package
  vs backoffice's many individual `@radix-ui/react-*` packages. Need to
  confirm every primitive backoffice's `components/ui` uses is covered by
  the bundled package before porting each one.
- `next-themes` is shared by both — theme-provider port should be low-risk.
