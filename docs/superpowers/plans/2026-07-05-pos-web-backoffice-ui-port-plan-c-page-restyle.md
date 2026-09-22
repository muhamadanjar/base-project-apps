# pos-web Backoffice UI Port — Plan C: Restyle Existing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle pos-web's 5 existing pages (dashboard, inventory, pos, reports, settings) to match backoffice's visual system — JSX structure and className/styling only. Every page's existing props/state/hooks/store contracts stay byte-identical; nothing about *what* these pages do changes, only how they look.

**Architecture:** Same mechanical-port approach as Plan A/B (both complete: tokens/primitives/hooks/stores, then the layout shell — sidebar/topbar/footer/`DashboardLayout`/`POSLayout` all already wired). Plan C's new wrinkle: unlike Plan B's shell files (which had 1:1 backoffice source files to copy), these 5 pages' backoffice equivalents are single mega-files (1000–2100 lines each, except dashboard) containing far more feature surface than pos-web has logic for (stock-movement tabs, voucher/discount system, extra report tabs). Each task extracts a specific **visual pattern** (a card wrapper, a badge component, a table's styling conventions) from a named line range in the backoffice source and applies it to pos-web's existing, smaller, logic-bearing component — never the reverse (never bring backoffice's tab/feature shell across).

**Tech Stack:** React 19, React Router 7, Zustand v5, Tailwind v4 (`@theme inline`, no config file), lucide-react via the `Icon` wrapper for page/feature code (per pos-web's CLAUDE.md convention, already established in Plan A/B).

## Global Constraints

- **No git operations inside `services/pos-web`, under any circumstance, ever.** Repeated with maximum emphasis because an implementer agent in Plan A violated it — it ran `git commit` in this exact submodule while dying to a session/API limit, apparently as a "save my work" reflex. That is explicitly the WRONG behavior. If an agent is about to run out of turns/context/session budget, it must simply stop and report its status honestly (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT) — leaving work uncommitted in the working tree IS the correct, complete behavior. Every task dispatch in this plan's execution must repeat this instruction verbatim, not just link to this section.
- **Verify tsc and git status through `rtk proxy <cmd>`, never the plain form.** `rtk proxy pnpm exec tsc -b --noEmit` and `/usr/bin/git status --porcelain` (the literal binary path, not the `git` shell entry) are the trustworthy forms.
- **Baseline is exactly 7 pre-existing, unrelated tsc errors** as of 2026-07-05 (confirmed clean after a monorepo-wide `pnpm install` fixed a bun/pnpm hoisting conflict that had temporarily inflated this to 22 — see `.superpowers/sdd/pos_web_tsc_baseline_drift` history if that number ever looks wrong again, and re-check `ls node_modules/.bun` at the repo root first if it does): `src/components/ui/combobox.tsx`, `src/components/ui/command.tsx`, `src/components/ui/drawer.tsx`, `src/pages/dashboard/components/dashboard-sidebar.tsx` (broken `motion` import — **Task 3 of this plan deletes this file entirely as confirmed-dead code**, which will drop the true baseline to 6 once done), `src/pages/settings/components/general/general-tab.tsx`, `src/pages/settings/components/localization/localization-tab.tsx`, `src/providers/query-client.tsx`. None of these are this plan's to fix except Task 3's incidental deletion.
- **In-scope-only fixes.** If restyling a file surfaces a type error strictly inside that same file, fix it narrowly, typed, no `as any`/`@ts-ignore`. If an error appears in a file outside the current task's named file list, STOP and report as a concern — do not fix it blind.
- **Package manager is `pnpm`.**
- **`noUnusedLocals`/`noUnusedParameters`/`verbatimModuleSyntax` are on** in `tsconfig.app.json`.
- **Restyle-only scope, hard boundary.** Every pos-web page/component file this plan touches keeps its exact current props, exported function name, hooks, and Zustand store calls unchanged — verify with a quick before/after read of the file's non-JSX-return code (imports of hooks/stores, function signature, any business logic) if a task's diff looks larger than a pure markup/className change. The ONLY non-cosmetic exceptions, explicitly scoped below: Task 3 deletes `dashboard-sidebar.tsx` (dead code, zero importers, confirmed in Plan B Task 9) and Task 12 deletes a legacy inline `<style>` override block in `settings/index.tsx` that hardcodes hex colors on top of an already-theme-token-correct primitive.
- **Explicit non-goal, do NOT build these:** backoffice's `traffic-donut.tsx`/`weekly-activity.tsx` dashboard widgets, its POS `VoucherSelector` (voucher/discount system), and its Reports `BestSellerTab`/`StokValueTab`/`CashFlowTab` and Inventory `StockInTab`/`StockOutTab`/`StockOpnameTab`/`MovementsTab` tab systems all have **no corresponding pos-web store/hook/logic** — building them would be net-new feature work, not a restyle, and several map directly onto the spec's own work-order item 6 ("port 8 new pages", which explicitly includes `vouchers` and `purchase-orders` as separate future pages). If a task below references one of these backoffice files for a visual pattern, it names the **exact line range** to look at — stay inside that range; do not pull in the surrounding tab/feature logic.
- Source root: `services/backoffice/src/...`. Target root: `services/pos-web/src/...`.

### Icon Conversion Protocol (apply wherever a task's file list says so)

Identical protocol Plan B established and used successfully across 8 tasks. For each file with a `lucide-react` import:
1. Add `import Icon from "@/components/icons"` once, near the top (if not already present).
2. For every name used as a direct JSX tag (`<ChevronRight className="..." />`), replace with `<Icon name="chevron-right" className="..." />` (PascalCase → kebab-case: insert a `-` before each internal capital, lowercase everything).
3. For every name used as a stored/passed component reference (`icon: SomeIcon` in a data object, a prop typed `LucideIcon`, a destructured `{ icon: Icon }` render like `<item.icon />`), convert the stored value to a kebab-case string, change the type to `string`, and change the render site to `<Icon name={item.icon} className="..." />`.
4. Remove the `lucide-react` import entirely once every usage in the file is converted.
5. Verify with `grep -n 'from "lucide-react"' <file>` — must return nothing once the file's conversion is complete.

### Token Mapping Protocol (apply wherever a task's file list says so)

Identical mapping Plan B Task 10 established and used on `pos-layout.tsx`. Swap every `ds-*` Tailwind class for the shared token, **preserving whatever prefix and opacity-modifier suffix the original had**:

| Old | New |
|---|---|
| `bg-ds-surface` | `bg-background` |
| `text-ds-on-surface` | `text-foreground` |
| `bg-ds-surface-lowest` | `bg-card` |
| `bg-ds-surface-high` / `bg-ds-surface-highest` | `bg-muted` |
| `border-ds-outline-variant` (any opacity suffix) | `border-border` (same suffix) |
| `bg-ds-outline-variant` (any opacity suffix, e.g. a divider) | `bg-border` (same suffix) |
| `text-ds-on-surface-variant` | `text-muted-foreground` |
| `placeholder-ds-on-surface-variant` | `placeholder-muted-foreground` |
| `text-ds-primary` / `border-ds-primary` / `ring-ds-primary` (any opacity suffix) | `text-primary` / `border-primary` / `ring-primary` (same suffix) |

Verify with `grep -n 'ds-' <file>` — must return nothing (aside from unrelated words that happen to contain the substring "ds-", check by eye) once conversion is complete.

---

### Task 1: Restyle dashboard's `kpi-grid.tsx` and `revenue-chart.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/dashboard/components/kpi-grid.tsx`
- Modify: `services/pos-web/src/pages/dashboard/components/revenue-chart.tsx`
- Reference only (do not copy the whole file): `services/backoffice/src/components/backoffice/dashboard/kpi-cards.tsx` (254 lines), `services/backoffice/src/components/backoffice/dashboard/revenue-chart.tsx` (182 lines)

**Interfaces:** No change — both components keep their existing props signatures and continue reading from `src/pages/dashboard/store/index.tsx` / `src/pages/dashboard/data/mock-data.ts` exactly as today. Consumed unchanged by `src/pages/dashboard/index.tsx`.

- [ ] **Step 1: Read all four files** (the 2 pos-web files being changed, the 2 backoffice files being referenced) in full before editing anything.

- [ ] **Step 2: Restyle `kpi-grid.tsx`**

Match backoffice `kpi-cards.tsx`'s visual structure: its KPI card wrapper (border/shadow/padding/rounded treatment), the trend-indicator styling (up/down arrow + colored percentage text), and its icon-badge treatment (small colored circular/rounded icon container per card). Apply the Token Mapping Protocol to every `ds-*` class in the file. Apply the Icon Conversion Protocol if the file imports `lucide-react` directly (check first: `grep -n lucide-react services/pos-web/src/pages/dashboard/components/kpi-grid.tsx`). Do not change the prop shape the component receives or the data it reads.

- [ ] **Step 3: Restyle `revenue-chart.tsx`**

Match backoffice `revenue-chart.tsx`'s chart container styling (card wrapper, header row with title + period-selector styling if pos-web's version has an equivalent control, axis/tooltip/legend styling conventions if using the same underlying chart library — check both files' chart library import first, since a mismatch there means only container/header chrome is portable, not chart-internal props). Apply the Token Mapping Protocol. Apply the Icon Conversion Protocol if needed.

- [ ] **Step 4: Verify no `ds-` or `lucide-react` residue**

```bash
cd services/pos-web
grep -n 'ds-' src/pages/dashboard/components/kpi-grid.tsx src/pages/dashboard/components/revenue-chart.tsx
grep -n 'lucide-react' src/pages/dashboard/components/kpi-grid.tsx src/pages/dashboard/components/revenue-chart.tsx
```
Expected: no output from either.

- [ ] **Step 5: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged baseline).

No commit.

---

### Task 2: Restyle dashboard's `top-products.tsx` and `recent-transactions.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/dashboard/components/top-products.tsx`
- Modify: `services/pos-web/src/pages/dashboard/components/recent-transactions.tsx`
- Reference only: `services/backoffice/src/components/backoffice/dashboard/top-products.tsx` (173 lines), `services/backoffice/src/components/backoffice/dashboard/transactions-table.tsx` (166 lines — this is backoffice's closest analog to pos-web's `recent-transactions.tsx`)

**Interfaces:** No change — same store/data reads as today, same consumer (`src/pages/dashboard/index.tsx`).

- [ ] **Step 1: Read all four files** in full before editing.

- [ ] **Step 2: Restyle `top-products.tsx`**

Match backoffice's ranked-list-row styling (rank badge/number, product thumbnail-or-icon treatment, name/metric layout, any progress-bar-style visual indicating relative sales volume if backoffice's version has one and pos-web's data shape supports it without new fields). Apply the Token Mapping Protocol. Apply the Icon Conversion Protocol if needed.

- [ ] **Step 3: Restyle `recent-transactions.tsx`**

Match backoffice `transactions-table.tsx`'s table/row styling (header row treatment, status-badge styling per row, alternating-row or hover treatment, monetary-value alignment/formatting classes). Apply the Token Mapping Protocol. Apply the Icon Conversion Protocol if needed.

- [ ] **Step 4: Verify no `ds-` or `lucide-react` residue**

```bash
cd services/pos-web
grep -n 'ds-' src/pages/dashboard/components/top-products.tsx src/pages/dashboard/components/recent-transactions.tsx
grep -n 'lucide-react' src/pages/dashboard/components/top-products.tsx src/pages/dashboard/components/recent-transactions.tsx
```
Expected: no output.

- [ ] **Step 5: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged baseline).

No commit.

---

### Task 3: Restyle `reports-section.tsx` + `index.tsx`, delete dead `dashboard-sidebar.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/dashboard/components/reports-section.tsx`
- Modify: `services/pos-web/src/pages/dashboard/index.tsx`
- Delete: `services/pos-web/src/pages/dashboard/components/dashboard-sidebar.tsx`
- Reference only: no direct backoffice 1:1 exists for `reports-section.tsx` (it's pos-web-specific) — reuse the same card/table visual conventions established in Tasks 1–2 for internal consistency instead of pulling a new backoffice reference.

**Interfaces:** No change to `reports-section.tsx`'s props or `index.tsx`'s exported `DashboardPage` component signature.

- [ ] **Step 1: Confirm `dashboard-sidebar.tsx` is genuinely unused before deleting**

```bash
cd services/pos-web
grep -rn "dashboard-sidebar" src
```
Expected: only the file's own path appears (i.e., nothing imports it). This was already confirmed once during Plan B Task 9 (`.superpowers/sdd/planb-task-9-report.md`) — re-confirm here since time has passed and other tasks may have changed things. If anything besides the file itself shows up, STOP — do not delete, report as a concern instead.

- [ ] **Step 2: Delete the file**

```bash
rm services/pos-web/src/pages/dashboard/components/dashboard-sidebar.tsx
```

- [ ] **Step 3: Read `reports-section.tsx` and `index.tsx` in full**

- [ ] **Step 4: Restyle `reports-section.tsx`**

Apply the same card/section-header/table conventions used in Tasks 1–2's restyled dashboard components (for visual consistency within the same page). Apply the Token Mapping Protocol. Apply the Icon Conversion Protocol if needed.

- [ ] **Step 5: Clean up `index.tsx`**

This file composes the dashboard's child components inside `DashboardLayout` (already restyled in Plan B Task 9 — do not touch `DashboardLayout` itself). Apply the Token Mapping Protocol to any `ds-*` classes on the page-level wrapper/grid div here (e.g. grid-gap/padding classes). Do not change the `<DashboardLayout title="..." subtitle="...">` call or which child components it renders.

- [ ] **Step 6: Verify**

```bash
cd services/pos-web
grep -n 'ds-' src/pages/dashboard/components/reports-section.tsx src/pages/dashboard/index.tsx
grep -n 'lucide-react' src/pages/dashboard/components/reports-section.tsx src/pages/dashboard/index.tsx
find src/pages/dashboard -name "dashboard-sidebar.tsx"
```
Expected: no `ds-`/`lucide-react` output, and the `find` returns nothing (file is gone).

- [ ] **Step 7: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: **6 errors** (baseline drops by 1 — `dashboard-sidebar.tsx`'s broken `motion` import error disappears since the file no longer exists to typecheck). If it's still 7, something else is wrong — investigate before proceeding (check the file was actually deleted and nothing re-creates/re-imports it).

No commit.

---

### Task 4: Restyle inventory's `index.tsx` (main page shell + product/category tables' surrounding chrome)

**Files:**
- Modify: `services/pos-web/src/pages/inventory/index.tsx` (524 lines — read carefully, this is pos-web's largest single page file in scope)
- Reference only, specific line ranges: `services/backoffice/src/components/backoffice/inventory/inventory-page.tsx` lines 154–254 (`StatCard`, `StatusPill`, `StockLevelBadge`, `MovementTypeBadge` helper components) and lines 309–620 (`OverviewTab` — its KPI-row layout and table-styling conventions only, NOT its stock-in/out/opname/movements tab logic)

**Interfaces:** No change — `index.tsx` keeps its existing composition of `use-products.ts`/`use-categories` hooks and `store/product.ts`/`store/category.ts` Zustand stores exactly as today.

- [ ] **Step 1: Read `services/pos-web/src/pages/inventory/index.tsx` in full**

- [ ] **Step 2: Read backoffice's `inventory-page.tsx` lines 154–254 and 309–620 only** (use `sed -n '154,254p'` / `sed -n '309,620p'` rather than opening the whole 2043-line file, to stay inside the scoped range)

```bash
sed -n '154,254p' services/backoffice/src/components/backoffice/inventory/inventory-page.tsx
sed -n '309,620p' services/backoffice/src/components/backoffice/inventory/inventory-page.tsx
```

- [ ] **Step 3: Extract and adapt the `StatCard`/`StatusPill`/`StockLevelBadge` visual patterns**

Apply their card/badge/pill styling (border, padding, rounded corners, color-coding scheme for status states) to pos-web's `index.tsx` wherever it renders a KPI summary row or a stock-level/status indicator for products or categories. Do not introduce the `MovementTypeBadge` pattern unless pos-web's product/category data already has an equivalent "movement type" concept (check `use-products.ts`/`store/product.ts` first — if no such field exists, skip this one, it doesn't apply here).

- [ ] **Step 4: Restyle the page's own table/list chrome**

Apply `OverviewTab`'s table header/row/cell styling conventions (not its tab-switching structure — pos-web's `index.tsx` has no tabs to add) to whatever table or list markup `index.tsx` already renders directly.

- [ ] **Step 5: Apply the Icon Conversion Protocol**

```bash
grep -n 'lucide-react' services/pos-web/src/pages/inventory/index.tsx
```
Convert every direct-JSX and stored-reference usage found.

- [ ] **Step 6: Apply the Token Mapping Protocol**

```bash
grep -n 'ds-' services/pos-web/src/pages/inventory/index.tsx
```
Convert every occurrence found.

- [ ] **Step 7: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/inventory/index.tsx
```
Expected: no output.

- [ ] **Step 8: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged from Task 3's new baseline).

No commit.

---

### Task 5: Restyle `table-product.tsx` and `products.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/inventory/components/table-product.tsx` (77 lines)
- Modify: `services/pos-web/src/pages/inventory/products.tsx` (142 lines)
- Reference only: the same `StatusPill`/`StockLevelBadge` patterns from Task 4 (reuse Task 4's already-adapted version for consistency — do not re-derive a second, possibly-inconsistent styling for the same badge concept)

**Interfaces:** No change to either file's props or their reads from `hooks/use-products.ts` / `store/product.ts`.

- [ ] **Step 1: Read both files in full**, and re-read whatever badge/pill styling Task 4 landed on in `index.tsx` so this task matches it exactly (same className string, not a close approximation).

- [ ] **Step 2: Restyle `table-product.tsx`**

Apply the same table row/cell/badge conventions from Task 4. Apply the Icon Conversion Protocol and Token Mapping Protocol (check both with `grep -n 'lucide-react\|ds-' services/pos-web/src/pages/inventory/components/table-product.tsx` first).

- [ ] **Step 3: Restyle `products.tsx`**

Same treatment — apply Task 4's established badge/card conventions, Icon Conversion Protocol, Token Mapping Protocol.

- [ ] **Step 4: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/inventory/components/table-product.tsx src/pages/inventory/products.tsx
```
Expected: no output.

- [ ] **Step 5: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged).

No commit.

---

### Task 6: Restyle `add-product-modal.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/inventory/components/add-product-modal.tsx` (169 lines)

**Interfaces:** No change to its props (the modal's open/close/submit contract) or its form-handling logic.

**Note on scope:** `services/pos-web/src/pages/inventory/components/table-category.tsx` is a confirmed 0-byte empty file, and `services/pos-web/src/pages/inventory/category.tsx` is a 5-line stub — both appear to be pre-existing incomplete pos-web work unrelated to this restyle plan (there is no category-management feature to restyle because it was never built). **Do not touch either file in this task or any other Plan C task.** If the user wants category management built out, that is new feature work outside this plan's scope — flag it, don't build it.

- [ ] **Step 1: Read `add-product-modal.tsx` in full**

- [ ] **Step 2: Restyle the modal**

Apply the form-field layout, label/input spacing, and button-row conventions already established in this plan's earlier tasks (dialog/modal styling should match whatever card/section conventions Tasks 4–5 landed on for internal consistency, since this modal is triggered from the page those tasks restyled). Apply the Icon Conversion Protocol and Token Mapping Protocol.

- [ ] **Step 3: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/inventory/components/add-product-modal.tsx
```
Expected: no output.

- [ ] **Step 4: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged).

No commit.

---

### Task 7: Restyle POS's `product-card.tsx`, `product-catalog.tsx`, `category-filter.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/pos/components/product-card.tsx` (53 lines)
- Modify: `services/pos-web/src/pages/pos/components/product-catalog.tsx` (64 lines)
- Modify: `services/pos-web/src/pages/pos/components/category-filter.tsx` (31 lines)
- Reference only, specific line range: `services/backoffice/src/components/backoffice/pos/pos-page.tsx` lines 1–100 (imports + `CustomerSelector` start, for surrounding context) and the `ProductCard` component (lines ~301–367 per the research pass — re-locate exactly with `grep -n "^function ProductCard\|^const ProductCard" services/backoffice/src/components/backoffice/pos/pos-page.tsx` since a single 1114-line file's exact boundaries are easy to mis-cite by hand)

**Interfaces:** No change — these three keep reading from `src/pages/pos/data/products.ts` and calling into `src/pages/pos/store/use-cart-store.ts` exactly as today.

- [ ] **Step 1: Locate backoffice's exact `ProductCard` boundaries**

```bash
grep -n "^function ProductCard\|^const ProductCard\|^}" services/backoffice/src/components/backoffice/pos/pos-page.tsx | head -20
```
Use this to find the real start/end line numbers, then read just that range with `sed -n 'START,ENDp'`.

- [ ] **Step 2: Read the 3 pos-web files in full**

- [ ] **Step 3: Restyle `product-card.tsx`**

Match backoffice's `ProductCard` visual treatment (image/placeholder area, price/name layout, stock-availability indicator styling, add-to-cart button/interaction affordance styling — not its click handler logic, which is pos-web's own `use-cart-store.ts` call, unchanged). Apply the Icon Conversion Protocol and Token Mapping Protocol.

- [ ] **Step 4: Restyle `product-catalog.tsx`**

Match the grid/list layout conventions surrounding backoffice's product cards (spacing, responsive column count classes, empty-state styling if present). Apply both protocols.

- [ ] **Step 5: Restyle `category-filter.tsx`**

Match backoffice's category-chip/pill/tab styling for the equivalent filter control (check `pos-page.tsx` for how it filters products by category — likely near the top of `PosPage`'s own body, not inside `ProductCard`). Apply both protocols.

- [ ] **Step 6: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/pos/components/product-card.tsx src/pages/pos/components/product-catalog.tsx src/pages/pos/components/category-filter.tsx
```
Expected: no output.

- [ ] **Step 7: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged).

No commit.

---

### Task 8: Restyle POS's `cart-panel.tsx`, `cart-item-row.tsx`, `cart-summary.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/pos/components/cart-panel.tsx` (338 lines — largest POS component)
- Modify: `services/pos-web/src/pages/pos/components/cart-item-row.tsx` (70 lines)
- Modify: `services/pos-web/src/pages/pos/components/cart-summary.tsx` (61 lines)
- Reference only: backoffice's `CartLine` and `CartContent` components inside `services/backoffice/src/components/backoffice/pos/pos-page.tsx` — locate exact boundaries the same way as Task 7 (`grep -n "^function CartLine\|^const CartLine\|^function CartContent\|^const CartContent"`)

**Interfaces:** No change — all three keep their exact current props and `use-cart-store.ts` reads/calls (add/remove/update-quantity actions, cart line data shape).

**Scope reminder:** backoffice's cart flow includes a `VoucherSelector` (lines ~189–300 of the same file, per the research pass — re-locate exactly, don't trust the line numbers blindly on a large file that may have shifted). **Do not port `VoucherSelector` or any discount/voucher UI** — pos-web's `use-cart-store.ts` has no voucher/discount concept, and `vouchers` is explicitly one of Plan D's future new pages per the spec. If `cart-summary.tsx` currently has a discount-input field that already exists in pos-web's own logic (check `use-cart-store.ts` first), restyle that existing field — do not add a new one.

- [ ] **Step 1: Locate backoffice's exact `CartLine`/`CartContent` boundaries**

```bash
grep -n "^function CartLine\|^const CartLine\|^function CartContent\|^const CartContent" services/backoffice/src/components/backoffice/pos/pos-page.tsx
```

- [ ] **Step 2: Read the 3 pos-web files in full**, and read `use-cart-store.ts` to confirm exactly which fields/actions exist (this determines what's safe to restyle vs. what would require new logic).

- [ ] **Step 3: Restyle `cart-panel.tsx`**

Match backoffice's `CartContent` panel styling (header, scrollable list area treatment, footer/summary docking) around the cart items — but keep pos-web's own list-rendering logic (which maps over its own cart-store state) untouched. Apply the Icon Conversion Protocol and Token Mapping Protocol.

- [ ] **Step 4: Restyle `cart-item-row.tsx`**

Match backoffice's `CartLine` row styling (quantity stepper buttons, remove-item control, line-total alignment). Apply both protocols.

- [ ] **Step 5: Restyle `cart-summary.tsx`**

Match the summary-block styling (subtotal/tax/total row treatment, divider styling) for whatever fields pos-web's `use-cart-store.ts` actually computes — do not add rows for fields that don't exist in the store. Apply both protocols.

- [ ] **Step 6: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/pos/components/cart-panel.tsx src/pages/pos/components/cart-item-row.tsx src/pages/pos/components/cart-summary.tsx
```
Expected: no output.

- [ ] **Step 7: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged).

- [ ] **Step 8: Manual cart-flow smoke check**

```bash
rtk proxy pnpm dev
```
Open `/pos` in a browser. Add a product to the cart, adjust its quantity, remove an item. Confirm the cart updates correctly and nothing crashes — this is pos-web's core business flow and a regression here would be serious (same check the original design spec calls out explicitly). Kill the dev server after.

No commit.

---

### Task 9: Restyle POS's `customer-info.tsx`, `payment-method.tsx`, `receipt-modal.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/pos/components/customer-info.tsx` (36 lines)
- Modify: `services/pos-web/src/pages/pos/components/payment-method.tsx` (36 lines)
- Modify: `services/pos-web/src/pages/pos/components/receipt-modal.tsx` (136 lines)
- Reference only: backoffice's `CustomerSelector`, `PaymentPanel`, `SuccessOverlay` components inside `pos-page.tsx` — locate exact boundaries with `grep -n "^function CustomerSelector\|^const CustomerSelector\|^function PaymentPanel\|^const PaymentPanel\|^function SuccessOverlay\|^const SuccessOverlay" services/backoffice/src/components/backoffice/pos/pos-page.tsx`

**Interfaces:** No change to any of the three files' props or store reads.

- [ ] **Step 1: Locate the 3 backoffice component boundaries** with the grep command above, then read each range with `sed -n`.

- [ ] **Step 2: Read the 3 pos-web files in full**

- [ ] **Step 3: Restyle `customer-info.tsx`**

Match `CustomerSelector`'s visual treatment for whichever subset of its UI applies (a name/phone input or a selected-customer display card) — pos-web's version is much smaller (36 lines) so likely only covers a slice of what backoffice's does; only restyle what pos-web's file actually renders, do not add fields. Apply both protocols.

- [ ] **Step 4: Restyle `payment-method.tsx`**

Match `PaymentPanel`'s payment-method selector styling (button/radio group treatment for cash/card/etc., whatever methods pos-web's own component already lists). Apply both protocols.

- [ ] **Step 5: Restyle `receipt-modal.tsx`**

Match `SuccessOverlay`'s success-state visual treatment (checkmark/icon treatment, receipt summary layout, action-button row). Apply both protocols.

- [ ] **Step 6: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/pos/components/customer-info.tsx src/pages/pos/components/payment-method.tsx src/pages/pos/components/receipt-modal.tsx
```
Expected: no output.

- [ ] **Step 7: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged).

No commit.

---

### Task 10: Restyle reports' `header.tsx` and `income-chart.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/reports/components/header.tsx` (56 lines)
- Modify: `services/pos-web/src/pages/reports/components/income-chart.tsx` (88 lines)
- Reference only: backoffice's `PageHeader` and `LabaRugiTab` inside `services/backoffice/src/components/backoffice/reports/reports-page.tsx` — locate exact boundaries with `grep -n "^function PageHeader\|^const PageHeader\|^function LabaRugiTab\|^const LabaRugiTab" services/backoffice/src/components/backoffice/reports/reports-page.tsx`

**Interfaces:** No change to either file's props or `src/pages/reports/store/index.ts` reads.

- [ ] **Step 1: Locate the backoffice boundaries**, read `PageHeader`'s range in full and `LabaRugiTab`'s range in full.

- [ ] **Step 2: Read `header.tsx` and `income-chart.tsx` in full**

- [ ] **Step 3: Restyle `header.tsx`**

Match `PageHeader`'s title/subtitle/action-button-row layout and spacing conventions. Apply both protocols.

- [ ] **Step 4: Restyle `income-chart.tsx`**

Match `LabaRugiTab`'s income/P&L chart section styling (card wrapper, chart header row, legend/summary-figure treatment) — for whichever chart library pos-web's version already uses (check the import first; only container/header chrome is portable if the underlying chart library differs from backoffice's). Apply both protocols.

- [ ] **Step 5: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/reports/components/header.tsx src/pages/reports/components/income-chart.tsx
```
Expected: no output.

- [ ] **Step 6: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged).

No commit.

---

### Task 11: Restyle reports' `expense-breakdown.tsx` and `daily-profit-table.tsx`, clean up `index.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/reports/components/expense-breakdown.tsx` (64 lines)
- Modify: `services/pos-web/src/pages/reports/components/daily-profit-table.tsx` (95 lines)
- Modify: `services/pos-web/src/pages/reports/index.tsx` (23 lines — confirmed to still have `bg-ds-surface p-8` at the page-body level)
- Reference only: same `LabaRugiTab` range from Task 10 (reuse Task 10's already-adapted conventions for internal page consistency, same pattern as Task 5 reusing Task 4's badges)

**Interfaces:** No change to any of the three files' props/exports/store reads.

- [ ] **Step 1: Read all three files in full**, and re-read whatever card/section styling Task 10 landed on so this task matches it exactly.

- [ ] **Step 2: Restyle `expense-breakdown.tsx`**

Apply the same card/chart-section conventions from Task 10. Apply the Icon Conversion Protocol and Token Mapping Protocol.

- [ ] **Step 3: Restyle `daily-profit-table.tsx`**

Apply `LabaRugiTab`'s table styling conventions (same table-row/cell treatment referenced in Task 10). Apply both protocols.

- [ ] **Step 4: Clean up `index.tsx`**

Apply the Token Mapping Protocol to the page-body wrapper's `bg-ds-surface p-8` (and any other `ds-*` classes present). Do not change the `<DashboardLayout>` call or which child components it composes.

- [ ] **Step 5: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/reports/components/expense-breakdown.tsx src/pages/reports/components/daily-profit-table.tsx src/pages/reports/index.tsx
```
Expected: no output.

- [ ] **Step 6: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged).

No commit.

---

### Task 12: Remove settings' hardcoded-hex legacy `<style>` override, restyle its `Tabs`

**Files:**
- Modify: `services/pos-web/src/pages/settings/index.tsx` (50 lines)

**Interfaces:** No change to the exported `SettingsPage` component's signature (it takes no props today) or which children it renders.

**Context (already confirmed by direct read, not backoffice-referenced — this file's problem is self-contained legacy cruft):** the current file has an inline `<style>{tabsStyle}</style>` block hardcoding `rgb(0, 110, 33)`, `rgb(21, 30, 20)`, `rgb(231, 241, 225)`, `rgb(71, 230, 96)` onto `[data-slot="tabs-trigger"][data-state="active"]::after` and `[role="option"]` selectors. `services/pos-web/src/components/ui/tabs.tsx` (Plan A, already correct) already implements a proper `line` variant with a theme-token-based active-state indicator (`after:bg-foreground` at `tabs.tsx:51`) — the hardcoded style block is a redundant override sitting on top of an already-correct primitive, not a necessary customization. Delete it outright.

- [ ] **Step 1: Read the current file** (reproduced here so this step is self-contained; if it has drifted since 2026-07-05, stop and report instead of guessing):

```typescript
import DashboardLayout from '@/layouts/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GeneralTab from './components/general/general-tab'
import LocalizationTab from './components/localization/localization-tab'

const tabsStyle = `
  [data-slot="tabs-trigger"][data-state="active"]::after {
    background-color: rgb(0, 110, 33) !important;
  }
  [role="option"] {
    color: rgb(21, 30, 20) !important;
  }
  [role="option"]:hover {
    background-color: rgb(231, 241, 225) !important;
  }
  [role="option"][data-state="checked"] {
    background-color: rgb(71, 230, 96) !important;
    color: rgb(255, 255, 255) !important;
  }
`

export default function SettingsPage() {
  return (
    <>
      <style>{tabsStyle}</style>
      <DashboardLayout title="Settings" subtitle="Manage your store preferences">
        <Tabs defaultValue="general" className="w-full" orientation="horizontal">
        <TabsList variant="line" className="w-full justify-start border-b border-ds-surface-highest bg-transparent p-0 gap-8">
          <TabsTrigger value="general" className="text-ds-on-surface-variant data-active:text-ds-primary pb-4">General</TabsTrigger>
          <TabsTrigger value="localization" className="text-ds-on-surface-variant data-active:text-ds-primary pb-4">Localization</TabsTrigger>
          <TabsTrigger value="store" disabled className="text-ds-on-surface-variant/50 pb-4">
            Store
          </TabsTrigger>
          <TabsTrigger value="users" disabled className="text-ds-on-surface-variant/50 pb-4">
            Users
          </TabsTrigger>
          <TabsTrigger value="security" disabled className="text-ds-on-surface-variant/50 pb-4">
            Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="pt-6">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="localization" className="pt-6">
          <LocalizationTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
    </>
  )
}
```

- [ ] **Step 2: Replace with the cleaned-up version**

```typescript
import DashboardLayout from '@/layouts/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GeneralTab from './components/general/general-tab'
import LocalizationTab from './components/localization/localization-tab'

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" subtitle="Manage your store preferences">
      <Tabs defaultValue="general" className="w-full" orientation="horizontal">
        <TabsList variant="line" className="w-full justify-start border-b border-border bg-transparent p-0 gap-8">
          <TabsTrigger value="general" className="text-muted-foreground data-[state=active]:text-foreground pb-4">General</TabsTrigger>
          <TabsTrigger value="localization" className="text-muted-foreground data-[state=active]:text-foreground pb-4">Localization</TabsTrigger>
          <TabsTrigger value="store" disabled className="text-muted-foreground/50 pb-4">
            Store
          </TabsTrigger>
          <TabsTrigger value="users" disabled className="text-muted-foreground/50 pb-4">
            Users
          </TabsTrigger>
          <TabsTrigger value="security" disabled className="text-muted-foreground/50 pb-4">
            Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="pt-6">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="localization" className="pt-6">
          <LocalizationTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}
```

Note what changed: the entire `tabsStyle` constant and its `<style>` tag are gone (the `line` variant's own `after:bg-foreground` indicator in `tabs.tsx` already does this correctly — confirmed by direct read of `tabs.tsx:51` during planning). The outer `<>...</>` fragment wrapper is no longer needed since there's only one child now. `data-active:` (which isn't valid Tailwind arbitrary-variant syntax — the primitive itself uses `data-[state=active]:`) is corrected to `data-[state=active]:`, matching the pattern the primitive actually emits. All `ds-*` tokens converted per the Token Mapping Protocol.

- [ ] **Step 3: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|tabsStyle' src/pages/settings/index.tsx
```
Expected: no output.

- [ ] **Step 4: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged).

- [ ] **Step 5: Manual visual check**

```bash
rtk proxy pnpm dev
```
Open `/settings`. Confirm the General/Localization tabs still switch correctly and the active tab's underline indicator shows in the theme's accent color (not the old hardcoded green). Kill the dev server after.

No commit.

---

### Task 13: Restyle `currency-section.tsx` and `taxation-section.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/settings/components/general/currency-section.tsx` (137 lines)
- Modify: `services/pos-web/src/pages/settings/components/general/taxation-section.tsx` (119 lines)
- Reference only, specific components: `services/backoffice/src/components/backoffice/settings/settings-page.tsx` — the `Field` helper (lines ~413–437) and `SettingsCard` helper (lines ~438–470). Re-locate exactly with `grep -n "^function Field\|^const Field\|^function SettingsCard\|^const SettingsCard" services/backoffice/src/components/backoffice/settings/settings-page.tsx` before reading, since line numbers may have shifted since the research pass.

**Interfaces:** No change to either file's props or `schemas/general-schema.ts`/form-handling logic (both are presumably `react-hook-form` sections registered into `general-tab.tsx`'s form — verify this by reading `general-tab.tsx` first if the exact wiring isn't obvious from the file itself).

- [ ] **Step 1: Locate and read backoffice's `Field` and `SettingsCard` helpers**

```bash
grep -n "^function Field\|^const Field\|^function SettingsCard\|^const SettingsCard" services/backoffice/src/components/backoffice/settings/settings-page.tsx
```
Read both ranges in full.

- [ ] **Step 2: Read `currency-section.tsx` and `taxation-section.tsx` in full**

- [ ] **Step 3: Restyle `currency-section.tsx`**

Wrap the section (or its internal field groups) in `SettingsCard`'s visual conventions (card border/padding/header treatment) and apply `Field`'s label+control layout pattern to each form field, without changing which `react-hook-form` register calls or schema fields exist. Apply the Icon Conversion Protocol and Token Mapping Protocol.

- [ ] **Step 4: Restyle `taxation-section.tsx`**

Same treatment — `SettingsCard` wrapper conventions, `Field` layout pattern, both protocols.

- [ ] **Step 5: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/settings/components/general/currency-section.tsx src/pages/settings/components/general/taxation-section.tsx
```
Expected: no output.

- [ ] **Step 6: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged) — **note** `general-tab.tsx` itself is one of the 6 baseline-error files (zod resolver overload mismatch); if this task's changes to its child sections somehow shift that error's line number or message, that's still the same known baseline issue, not a new one — don't attempt to fix it, it's explicitly out of scope for this plan.

No commit.

---

### Task 14: Restyle `regional-section.tsx`, `general-tab.tsx`, `localization-tab.tsx`

**Files:**
- Modify: `services/pos-web/src/pages/settings/components/localization/regional-section.tsx` (183 lines)
- Modify: `services/pos-web/src/pages/settings/components/general/general-tab.tsx` (43 lines — **baseline tsc error file**, see note below)
- Modify: `services/pos-web/src/pages/settings/components/localization/localization-tab.tsx` (39 lines — **baseline tsc error file**, see note below)
- Reference only: same `Field`/`SettingsCard` helpers from Task 13 (reuse, don't re-derive)

**Interfaces:** No change to any file's props/exports. `general-tab.tsx` and `localization-tab.tsx` keep composing their respective section components exactly as today.

**Baseline-error note:** both `general-tab.tsx` and `localization-tab.tsx` are 2 of this plan's 6 known-baseline tsc errors (zod resolver overload mismatch, unrelated to styling — pre-existing, not this plan's to fix). This task will touch these files for pure JSX/className changes; if the tsc error's exact line number shifts as a result, that is expected and fine — the error type/file is still the same known baseline entry. Do NOT attempt to fix the zod resolver error itself as part of this task; it is explicitly out of scope.

- [ ] **Step 1: Read all three files in full**, plus re-confirm the `Field`/`SettingsCard` conventions from Task 13.

- [ ] **Step 2: Restyle `regional-section.tsx`**

Apply the same `SettingsCard`/`Field` conventions from Task 13 for consistency across the Localization tab. Apply the Icon Conversion Protocol and Token Mapping Protocol.

- [ ] **Step 3: Restyle `general-tab.tsx`**

This file orchestrates `currency-section.tsx`/`taxation-section.tsx` (Task 13) inside its own form wrapper — restyle only its own wrapping markup (spacing between sections, any tab-level heading) without touching the `react-hook-form` `useForm`/zod-resolver setup that's producing the known baseline error. Apply both protocols to any `ds-*`/`lucide-react` usage in the file's own JSX.

- [ ] **Step 4: Restyle `localization-tab.tsx`**

Same treatment — restyle its own wrapping markup around `regional-section.tsx`, leave its form-setup logic untouched. Apply both protocols.

- [ ] **Step 5: Verify**

```bash
cd services/pos-web
grep -n 'ds-\|lucide-react' src/pages/settings/components/localization/regional-section.tsx src/pages/settings/components/general/general-tab.tsx src/pages/settings/components/localization/localization-tab.tsx
```
Expected: no output.

- [ ] **Step 6: Typecheck**

```bash
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 6 errors (unchanged — the 2 zod-resolver baseline errors persist, by design).

- [ ] **Step 7: Manual visual check**

```bash
rtk proxy pnpm dev
```
Open `/settings`, click into both General and Localization tabs. Confirm all fields render, the layout looks consistent between the two tabs (same card/field conventions), and nothing crashes. Kill the dev server after.

No commit.

---

### Task 15: Plan C integration verification

**Files:** None — verification only.

- [ ] **Step 1: Full typecheck**

```bash
cd services/pos-web
rtk proxy pnpm exec tsc -b --noEmit
```
Expected: **6 errors** — `combobox.tsx`, `command.tsx`, `drawer.tsx`, `general-tab.tsx`, `localization-tab.tsx`, `query-client.tsx` (the original 7-error baseline minus `dashboard-sidebar.tsx`, deleted in Task 3). Confirm every error matches one of these 6 known files; if anything else appears, that's a real regression from this plan — identify which task introduced it before declaring Plan C done.

- [ ] **Step 2: Confirm no `ds-*` or stray `lucide-react` residue across all 5 pages**

```bash
cd services/pos-web
grep -rn 'ds-\[a-z\]\|bg-ds-\|text-ds-\|border-ds-\|placeholder-ds-\|ring-ds-' src/pages/dashboard src/pages/inventory src/pages/pos src/pages/reports src/pages/settings
grep -rln "from \"lucide-react\"\|from 'lucide-react'" src/pages/dashboard src/pages/inventory src/pages/pos src/pages/reports src/pages/settings
```
Expected: no output from either. If anything shows up, that file's conversion in an earlier task was incomplete — finish it before treating Plan C as done.

- [ ] **Step 3: Confirm `dashboard-sidebar.tsx` is actually gone**

```bash
find src/pages/dashboard -name "dashboard-sidebar.tsx"
```
Expected: no output.

- [ ] **Step 4: Confirm `table-category.tsx` and `category.tsx` were left untouched** (out-of-scope stub files per Task 6's note)

```bash
/usr/bin/git diff --stat -- src/pages/inventory/components/table-category.tsx src/pages/inventory/category.tsx
```
Expected: no output (zero changes to either).

- [ ] **Step 5: Full manual smoke pass**

```bash
rtk proxy pnpm dev
```
Walk through all 5 restyled pages plus `/pos` for a second cart-flow pass:
- `/dashboard` — KPI cards, revenue chart, top products, recent transactions, reports section all render with the new visual system, no leftover raw hex/`--ds-*` look.
- `/inventory` and `/inventory/products` — product/category tables render with the new badge/card styling, add-product modal opens and looks consistent.
- `/pos` — full add-to-cart-to-payment-to-receipt flow works end-to-end once more (this is the third time this flow is checked across Plan B/C — treat any regression here as blocking).
- `/reports` — all 3 report widgets render with consistent card/table styling.
- `/settings` — both tabs render, active-tab indicator uses the theme accent color (not hardcoded green), no console errors.

Check the browser console for errors on every route.

- [ ] **Step 6: Report final status**

No commit — Plan C is complete. Report back before starting Plan D (port the 8 new pages), since Plan D is unrelated in scope (adds new routes/pages) and doesn't depend on anything in Plan C beyond the now-complete restyle giving a consistent visual reference to match.

---

## Self-Review Notes

- **Spec coverage:** Covers spec work-order item 5 (restyle existing 5 pages) in full — all 5 pages, all their component files, per the research pass's file inventory. Item 6 (port 8 new pages) remains a future Plan D, explicitly out of scope here.
- **Placeholder scan:** No TBD/TODO. Where a task says "match backoffice's X styling" instead of pasting literal className strings (most tasks, since backoffice's source files are 1000+-line mega-files not fully reproduced in this plan), that mirrors the same idiom Plan B used successfully for its own large files (Tasks 3, 7, 8) — a named protocol (Icon Conversion Protocol, Token Mapping Protocol) plus an exact backoffice line-range/component-name to reference, gated by a mandatory `grep`/tsc verification step, rather than a vague "make it look nice." Task 12 (settings' hardcoded-hex cleanup) has fully literal before/after code since that file's current content was directly read and is small enough to reproduce whole.
- **Type consistency:** Every task's Interfaces section states "no prop/store/hook changes" consistently; the two structural exceptions (Task 3's file deletion, Task 12's style-block deletion) are each individually justified with a confirmed-dead-code check or a direct read proving redundancy, not asserted blind.
- **Scope boundary, the plan's central risk:** repeatedly documented (Global Constraints, and per-task "Scope reminder"/"Context" notes on Tasks 4, 6, 8) that backoffice's source files contain substantially more feature surface (stock-movement tabs, voucher system, extra report tabs) than pos-web has logic for, and that porting those would silently turn a restyle plan into new-feature work overlapping Plan D's own future scope (`vouchers`, `purchase-orders` are literally named as separate Plan D pages in the spec). Every task that references a large backoffice file names an exact sub-range to stay inside, specifically to prevent an implementer from mechanically porting an entire mega-file's tab shell.
- **Baseline tracking:** the plan explicitly tracks the tsc baseline shifting from 7 → 6 at Task 3 (dead-code deletion) and holds implementers to a single, clearly-stated known-error list for the remaining 11 tasks, rather than a generic "shouldn't increase" with no concrete number to check against.
