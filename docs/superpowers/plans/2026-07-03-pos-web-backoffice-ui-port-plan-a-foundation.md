# pos-web Backoffice UI Port — Plan A: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the shared foundation (design tokens, UI primitives, hooks, global stores) so later plans (B: layout shell, C: restyle existing pages, D: new pages) can build on it. This plan changes nothing about what the app *looks like yet* — it's additive/parallel, existing pages must render identically after every task.

**Architecture:** Mechanical file port from `services/backoffice` (Next.js) into `services/pos-web` (Vite). Both already share the same `@/` → `src/*` path alias and the same `cn()` util, so most files need zero import-path changes. The two real incompatibilities handled here: (1) backoffice imports individual `@radix-ui/react-*` packages while pos-web imports the bundled `radix-ui` package — imports get rewritten, no dependency changes; (2) `calendar.tsx` and `chart.tsx` are NOT ported — backoffice targets `react-day-picker` v9 and `recharts` v2, pos-web already runs v10 and v3 (breaking API differences) — pos-web's existing versions of these two files stay untouched and will pick up the shared design tokens automatically via CSS variables.

**Tech Stack:** React 19, Vite 8, Tailwind v4 (CSS-first), Zustand v5, Radix (via `radix-ui` bundle package), lucide-react, `@fontsource-variable/geist`.

## Global Constraints

- **No git operations inside `services/pos-web`.** Its `CLAUDE.md` forbids `git add`/`commit`/etc. in this submodule — "coordinated at root by authorized personnel." Every task in this plan ends at build/typecheck verification, never a commit. If a step template below shows a commit step, skip it for this service.
- **Package manager is `pnpm`** — never `npm`, per `pos-web/CLAUDE.md`.
- **`noUnusedLocals` / `noUnusedParameters` are on** (`tsconfig.app.json`) — a leftover unused import fails the build, not just lint.
- **`verbatimModuleSyntax` is on** — type-only imports must use `import type`.
- **ui/ primitives keep direct `lucide-react` imports.** pos-web's own existing 39 `components/ui/*` files already import lucide-react directly (confirmed: `select.tsx` imports `Check, ChevronDown, ChevronUp` straight from `lucide-react`), not through the `Icon` wrapper. The Icon-wrapper rule in `pos-web/CLAUDE.md` applies to feature/page/layout code, not shadcn-generated primitives — this plan does not touch icons in `components/ui/*`. (Icon-wrapper conversion is required starting Plan B, for layout-shell and page code.)
- **Do not overwrite `components.json`'s `style` field.** `"radix-nova"` describes this project's `radix-ui`-bundle import convention, not a visual shadcn style name — it must stay as-is so future `shadcn` CLI additions keep using the bundle-package convention this plan's transforms also target.
- Source of truth for every "copy from" path in this plan: `/home/anjar/Development/base-project-apps/services/backoffice/src/...`. Target root: `/home/anjar/Development/base-project-apps/services/pos-web/src/...`.

---

### Task 1: Merge design tokens + fix Geist font wiring

**Files:**
- Modify: `services/pos-web/src/index.css`

**Interfaces:** None (CSS only, no code contracts).

pos-web's tokens were already derived from backoffice's palette earlier — colors match almost exactly. The diff is: pos-web is missing `--destructive-foreground`, `--destructive-soft`, `--warning`, `--warning-soft` (both `@theme inline` mappings and `:root`/`.dark` values), and its `--destructive` light-mode value differs from backoffice's (`#E5484D` vs `#9C2730`). Also: `@fontsource-variable/geist` is an installed dependency but **never imported anywhere** — `--font-geist-sans`/`--font-geist-mono` are referenced in `@theme inline` but never defined, so Geist currently silently fails to apply.

- [ ] **Step 1: Add missing `@theme inline` token mappings**

In `services/pos-web/src/index.css`, the `@theme inline` block currently has (around line 27):
```css
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
```
Replace with:
```css
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-destructive-soft: var(--destructive-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-accent-foreground: var(--accent-foreground);
```

- [ ] **Step 2: Add missing `:root` values and fix `--destructive`**

Current `:root` block has:
```css
  --destructive: #E5484D;

  --border: #EAE2D2;
```
Replace with:
```css
  --destructive: #9C2730;
  --destructive-foreground: #FFFFFF;
  --destructive-soft: #FFE2E4;

  --warning: #C99249;
  --warning-soft: #FFE0C5;

  --border: #EAE2D2;
```

- [ ] **Step 3: Add missing `.dark` values**

Current `.dark` block has:
```css
  --destructive: #FF6368;
  --border: rgba(255, 255, 255, 0.08);
```
Replace with:
```css
  --destructive: #FF6368;
  --destructive-foreground: #FFFFFF;
  --destructive-soft: #3D1818;
  --warning: #FFB877;
  --warning-soft: #3D2E18;
  --border: rgba(255, 255, 255, 0.08);
```

- [ ] **Step 4: Wire the Geist font that's already a dependency but unused**

At the very top of `services/pos-web/src/index.css`, current:
```css
@import "tailwindcss";
@import "tw-animate-css";
```
Replace with:
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@fontsource-variable/geist";
```

Then in the `:root` block, add the font vars right after `--radius: 0.75rem;`:
```css
  --radius: 0.75rem;
  --font-geist-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-geist-mono: ui-monospace, "SFMono-Regular", Menlo, monospace;
```
(No `@fontsource-variable/geist-mono` package is installed on either side, so mono falls back to a system monospace stack — this matches what's actually available, not an invented value.)

- [ ] **Step 5: Verify build**

```bash
cd services/pos-web && pnpm build
```
Expected: build succeeds, no CSS/type errors.

- [ ] **Step 6: Manual visual check**

```bash
cd services/pos-web && pnpm dev
```
Open the app in a browser, confirm: page still renders exactly as before (colors unchanged — new tokens are additive, not replacing anything currently used), and body text now renders in Geist (visually distinct from the previous default sans-serif fallback — compare letterforms of "a" and "g", Geist has a distinctive single-story "a").

No commit (forbidden in this submodule) — leave the change in the working tree.

---

### Task 2: Port `use-mobile` hook

**Files:**
- Create: `services/pos-web/src/hooks/use-mobile.ts`

**Interfaces:**
- Produces: `useIsMobile(): boolean` — consumed by `components/ui/sidebar.tsx` in Task 3.

pos-web has no `src/hooks/` directory yet (`package.json` already declares the `#hooks/*` import alias for it, unused until now). backoffice's `use-toast.ts` (the old pre-sonner toast hook) is intentionally **not** ported — pos-web already uses `sonner` exclusively for toasts (wired in `App.tsx`), and no ported page code calls the old `useToast()` hook (verified: `customers-page.tsx` and siblings call `toast()` from `"sonner"` directly). Porting the old system would just be dead code.

- [ ] **Step 1: Copy the file verbatim**

```bash
mkdir -p services/pos-web/src/hooks
cp services/backoffice/src/hooks/use-mobile.ts services/pos-web/src/hooks/use-mobile.ts
```

- [ ] **Step 2: Verify contents (no transform needed — pure React, no Next.js dependency)**

```bash
cat services/pos-web/src/hooks/use-mobile.ts
```
Expected: starts with `import * as React from "react"`, defines `MOBILE_BREAKPOINT = 768` and exports `useIsMobile()`. No `"use client"` directive in this file (confirmed absent in source), so nothing to strip.

- [ ] **Step 3: Typecheck**

```bash
cd services/pos-web && pnpm exec tsc -b --noEmit
```
Expected: no errors (file isn't imported by anything yet, so this just confirms it parses).

No commit.

---

### Task 3: Add 15 net-new UI primitives (no new dependencies)

**Files:**
- Create: `services/pos-web/src/components/ui/{accordion→no,...}` — see exact list below
- Create: `services/pos-web/src/components/ui/alert-dialog.tsx`
- Create: `services/pos-web/src/components/ui/aspect-ratio.tsx`
- Create: `services/pos-web/src/components/ui/breadcrumb.tsx`
- Create: `services/pos-web/src/components/ui/collapsible.tsx`
- Create: `services/pos-web/src/components/ui/context-menu.tsx`
- Create: `services/pos-web/src/components/ui/hover-card.tsx`
- Create: `services/pos-web/src/components/ui/menubar.tsx`
- Create: `services/pos-web/src/components/ui/navigation-menu.tsx`
- Create: `services/pos-web/src/components/ui/progress.tsx`
- Create: `services/pos-web/src/components/ui/scroll-area.tsx`
- Create: `services/pos-web/src/components/ui/sidebar.tsx`
- Create: `services/pos-web/src/components/ui/slider.tsx`
- Create: `services/pos-web/src/components/ui/toggle-group.tsx`
- Create: `services/pos-web/src/components/ui/toggle.tsx`
- Create: `services/pos-web/src/components/ui/tooltip.tsx`

**Interfaces:**
- Consumes: `useIsMobile` from `@/hooks/use-mobile` (Task 2) — used by `sidebar.tsx`.
- Produces: standard shadcn component exports (`Accordion`, `AccordionItem`, `AlertDialog`, `Sidebar`, `SidebarProvider`, `SidebarInset`, `Tooltip`, etc.) — consumed by Plan B's layout shell (`app-sidebar.tsx` needs `Sidebar*` and `useSidebar`; `default-layout.tsx` needs `SidebarProvider`/`SidebarInset`).

Excluded from this task, ported separately because they need new npm dependencies: `carousel.tsx` (Task 5), `input-otp.tsx` (Task 6), `resizable.tsx` (Task 7). Excluded permanently: `toast.tsx`/`toaster.tsx` (old pre-sonner toast system — sonner already covers this, see Task 2 rationale).

- [ ] **Step 1: Copy all 15 files**

```bash
cd /home/anjar/Development/base-project-apps
for f in alert-dialog aspect-ratio breadcrumb collapsible context-menu hover-card menubar navigation-menu progress scroll-area sidebar slider toggle-group toggle tooltip; do
  cp "services/backoffice/src/components/ui/${f}.tsx" "services/pos-web/src/components/ui/${f}.tsx"
done
```

- [ ] **Step 2: Strip `"use client"` directives (no-op in Vite, but dead weight)**

```bash
cd /home/anjar/Development/base-project-apps
for f in alert-dialog aspect-ratio collapsible context-menu hover-card menubar navigation-menu progress scroll-area sidebar slider toggle-group toggle tooltip; do
  sed -i '/^"use client"$/d' "services/pos-web/src/components/ui/${f}.tsx"
done
# breadcrumb.tsx has no "use client" line in the source — skip it, sed would just no-op anyway
```

- [ ] **Step 3: Rewrite `@radix-ui/react-*` imports to pos-web's bundled `radix-ui` package**

`breadcrumb.tsx` and `sidebar.tsx` only import `Slot` from `@radix-ui/react-slot` — pos-web has that exact package installed already (`@radix-ui/react-slot": "^1.2.5"` in `package.json`), so those two need **no** import rewrite. The rest do:

```bash
cd /home/anjar/Development/base-project-apps/services/pos-web/src/components/ui

sed -i 's#import \* as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"#import { AlertDialog as AlertDialogPrimitive } from "radix-ui"#' alert-dialog.tsx
sed -i 's#import \* as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"#import { AspectRatio as AspectRatioPrimitive } from "radix-ui"#' aspect-ratio.tsx
sed -i 's#import \* as CollapsiblePrimitive from "@radix-ui/react-collapsible"#import { Collapsible as CollapsiblePrimitive } from "radix-ui"#' collapsible.tsx
sed -i 's#import \* as ContextMenuPrimitive from "@radix-ui/react-context-menu"#import { ContextMenu as ContextMenuPrimitive } from "radix-ui"#' context-menu.tsx
sed -i 's#import \* as HoverCardPrimitive from "@radix-ui/react-hover-card"#import { HoverCard as HoverCardPrimitive } from "radix-ui"#' hover-card.tsx
sed -i 's#import \* as MenubarPrimitive from "@radix-ui/react-menubar"#import { Menubar as MenubarPrimitive } from "radix-ui"#' menubar.tsx
sed -i 's#import \* as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"#import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui"#' navigation-menu.tsx
sed -i 's#import \* as ProgressPrimitive from "@radix-ui/react-progress"#import { Progress as ProgressPrimitive } from "radix-ui"#' progress.tsx
sed -i 's#import \* as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"#import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"#' scroll-area.tsx
sed -i 's#import \* as SliderPrimitive from "@radix-ui/react-slider"#import { Slider as SliderPrimitive } from "radix-ui"#' slider.tsx
sed -i 's#import \* as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"#import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"#' toggle-group.tsx
sed -i 's#import \* as TogglePrimitive from "@radix-ui/react-toggle"#import { Toggle as TogglePrimitive } from "radix-ui"#' toggle.tsx
sed -i 's#import \* as TooltipPrimitive from "@radix-ui/react-tooltip"#import { Tooltip as TooltipPrimitive } from "radix-ui"#' tooltip.tsx
```

- [ ] **Step 4: Verify no stray individual `@radix-ui/react-*` imports remain (except the two `Slot`-only files, which are fine as-is)**

```bash
cd /home/anjar/Development/base-project-apps/services/pos-web/src/components/ui
grep -rn '@radix-ui/react-' alert-dialog.tsx aspect-ratio.tsx collapsible.tsx context-menu.tsx hover-card.tsx menubar.tsx navigation-menu.tsx progress.tsx scroll-area.tsx slider.tsx toggle-group.tsx toggle.tsx tooltip.tsx
```
Expected: no output (empty grep result = pass).

```bash
grep -n '@radix-ui/react-slot' breadcrumb.tsx sidebar.tsx
```
Expected: one match in each file — that's correct, leave as-is.

- [ ] **Step 5: Typecheck**

```bash
cd /home/anjar/Development/base-project-apps/services/pos-web && pnpm exec tsc -b --noEmit
```
Expected: no errors. If `sidebar.tsx` errors on `useIsMobile` not found, confirm Task 2 ran first.

No commit.

---

### Task 4: Overwrite 26 shared UI primitives with backoffice's styling

**Files:** (all in `services/pos-web/src/components/ui/`, overwriting existing files)
`accordion.tsx`, `alert.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `command.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `form.tsx`, `input.tsx`, `label.tsx`, `pagination.tsx`, `popover.tsx`, `radio-group.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx`, `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`

**NOT included** (kept as pos-web's existing versions — see Architecture section for why): `calendar.tsx` (react-day-picker v9→v10 breaking API), `chart.tsx` (recharts v2→v3 breaking API).

**Interfaces:** Same component export names as before on both sides (`Button`, `Card`, `CardContent`, `Dialog`, `DialogContent`, etc.) — this is a pure re-styling, no signature changes, so nothing consuming these needs to change.

This is the highest-risk task in this plan (it overwrites files other code already imports) — review the diff carefully before moving on.

- [ ] **Step 1: Copy all 26 files, overwriting pos-web's existing versions**

```bash
cd /home/anjar/Development/base-project-apps
for f in accordion alert avatar badge button card checkbox command dialog drawer dropdown-menu form input label pagination popover radio-group select separator sheet skeleton sonner switch table tabs textarea; do
  cp "services/backoffice/src/components/ui/${f}.tsx" "services/pos-web/src/components/ui/${f}.tsx"
done
```

- [ ] **Step 2: Strip `"use client"` directives**

```bash
cd /home/anjar/Development/base-project-apps
for f in accordion avatar checkbox command dialog drawer dropdown-menu form label popover radio-group select separator sheet sonner switch table tabs; do
  sed -i '/^"use client"$/d' "services/pos-web/src/components/ui/${f}.tsx"
done
# alert, badge, button, card, input, pagination, skeleton, textarea have no "use client" line — sed no-ops, fine
```

- [ ] **Step 3: Rewrite `@radix-ui/react-*` imports (10 of the 26 files need this; `badge.tsx`/`button.tsx` use `Slot` from `@radix-ui/react-slot`, already compatible, no change)**

```bash
cd /home/anjar/Development/base-project-apps/services/pos-web/src/components/ui

sed -i 's#import \* as AccordionPrimitive from "@radix-ui/react-accordion"#import { Accordion as AccordionPrimitive } from "radix-ui"#' accordion.tsx
sed -i 's#import \* as AvatarPrimitive from "@radix-ui/react-avatar"#import { Avatar as AvatarPrimitive } from "radix-ui"#' avatar.tsx
sed -i 's#import \* as CheckboxPrimitive from "@radix-ui/react-checkbox"#import { Checkbox as CheckboxPrimitive } from "radix-ui"#' checkbox.tsx
sed -i 's#import \* as DialogPrimitive from "@radix-ui/react-dialog"#import { Dialog as DialogPrimitive } from "radix-ui"#' dialog.tsx
sed -i 's#import \* as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"#import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"#' dropdown-menu.tsx
sed -i 's#import \* as LabelPrimitive from "@radix-ui/react-label"#import { Label as LabelPrimitive } from "radix-ui"#' form.tsx
sed -i 's#import \* as LabelPrimitive from "@radix-ui/react-label"#import { Label as LabelPrimitive } from "radix-ui"#' label.tsx
sed -i 's#import \* as PopoverPrimitive from "@radix-ui/react-popover"#import { Popover as PopoverPrimitive } from "radix-ui"#' popover.tsx
sed -i 's#import \* as RadioGroupPrimitive from "@radix-ui/react-radio-group"#import { RadioGroup as RadioGroupPrimitive } from "radix-ui"#' radio-group.tsx
sed -i 's#import \* as SelectPrimitive from "@radix-ui/react-select"#import { Select as SelectPrimitive } from "radix-ui"#' select.tsx
sed -i 's#import \* as SeparatorPrimitive from "@radix-ui/react-separator"#import { Separator as SeparatorPrimitive } from "radix-ui"#' separator.tsx
sed -i 's#import \* as SheetPrimitive from "@radix-ui/react-dialog"#import { Dialog as SheetPrimitive } from "radix-ui"#' sheet.tsx
sed -i 's#import \* as SwitchPrimitive from "@radix-ui/react-switch"#import { Switch as SwitchPrimitive } from "radix-ui"#' switch.tsx
sed -i 's#import \* as TabsPrimitive from "@radix-ui/react-tabs"#import { Tabs as TabsPrimitive } from "radix-ui"#' tabs.tsx
```

Note `form.tsx` also imports `Slot` from `@radix-ui/react-slot` alongside `LabelPrimitive` — that half needs no change, only the `LabelPrimitive` line above.

- [ ] **Step 4: Verify no stray individual `@radix-ui/react-*` imports remain (except `Slot`, which is fine)**

```bash
cd /home/anjar/Development/base-project-apps/services/pos-web/src/components/ui
grep -n '@radix-ui/react-' accordion.tsx alert.tsx avatar.tsx badge.tsx button.tsx card.tsx checkbox.tsx command.tsx dialog.tsx drawer.tsx dropdown-menu.tsx form.tsx input.tsx label.tsx pagination.tsx popover.tsx radio-group.tsx select.tsx separator.tsx sheet.tsx skeleton.tsx sonner.tsx switch.tsx table.tsx tabs.tsx textarea.tsx
```
Expected: only `@radix-ui/react-slot` matches in `badge.tsx`, `button.tsx`, `form.tsx` — anything else is a missed rewrite, fix it before continuing.

- [ ] **Step 5: Typecheck**

```bash
cd /home/anjar/Development/base-project-apps/services/pos-web && pnpm exec tsc -b --noEmit
```
Expected: no errors. If errors appear referencing pos-web's own page code that used one of these components with props/behavior that changed between the old and new version of the file, note them — this is the one place a genuine behavior diff could surface (e.g. a renamed variant prop). Fix at the call site if so; do not water down the ported component to match old behavior (the whole point is adopting backoffice's version).

- [ ] **Step 6: Full build + manual visual smoke check**

```bash
cd /home/anjar/Development/base-project-apps/services/pos-web && pnpm build && pnpm dev
```
Open the app, click through dashboard/inventory/pos/reports/settings. Expected: buttons, dialogs, dropdowns, tables, tabs, badges etc. all still render and function — visually they should look extremely close to before (same tokens), just confirm nothing is visually broken (e.g. missing border, wrong padding) or throws a console error.

No commit.

---

### Task 5: Add `carousel.tsx` (new dependency: `embla-carousel-react`)

**Files:**
- Modify: `services/pos-web/package.json` (new dependency)
- Create: `services/pos-web/src/components/ui/carousel.tsx`

**Interfaces:** Produces `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext` — not consumed by any task in Plans A/B/C; available for Plan D's new pages if any use a carousel (none identified yet in the 8 new backoffice pages, but the primitive should exist since backoffice ships it as part of its ui/ set).

- [ ] **Step 1: Add the dependency**

```bash
cd services/pos-web && pnpm add embla-carousel-react@^8.6.0
```

- [ ] **Step 2: Copy and strip `"use client"`**

```bash
cd /home/anjar/Development/base-project-apps
cp services/backoffice/src/components/ui/carousel.tsx services/pos-web/src/components/ui/carousel.tsx
sed -i '/^"use client"$/d' services/pos-web/src/components/ui/carousel.tsx
```

- [ ] **Step 3: Verify import (no radix, no rewrite needed — check it imports from `embla-carousel-react` and `lucide-react` only)**

```bash
grep -n "^import" services/pos-web/src/components/ui/carousel.tsx
```

- [ ] **Step 4: Typecheck**

```bash
cd services/pos-web && pnpm exec tsc -b --noEmit
```
Expected: no errors.

No commit.

---

### Task 6: Add `input-otp.tsx` (new dependency: `input-otp`)

**Files:**
- Modify: `services/pos-web/package.json` (new dependency)
- Create: `services/pos-web/src/components/ui/input-otp.tsx`

**Interfaces:** Produces `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator` — not consumed by Plans A/B/C; available if Plan D's `access-control` page needs an OTP/2FA input.

- [ ] **Step 1: Add the dependency**

```bash
cd services/pos-web && pnpm add input-otp@^1.4.2
```

- [ ] **Step 2: Copy and strip `"use client"`**

```bash
cd /home/anjar/Development/base-project-apps
cp services/backoffice/src/components/ui/input-otp.tsx services/pos-web/src/components/ui/input-otp.tsx
sed -i '/^"use client"$/d' services/pos-web/src/components/ui/input-otp.tsx
```

- [ ] **Step 3: Typecheck**

```bash
cd services/pos-web && pnpm exec tsc -b --noEmit
```
Expected: no errors.

No commit.

---

### Task 7: Add `resizable.tsx` (new dependency: `react-resizable-panels`)

**Files:**
- Modify: `services/pos-web/package.json` (new dependency)
- Create: `services/pos-web/src/components/ui/resizable.tsx`

**Interfaces:** Produces `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` — not consumed by Plans A/B/C; available for later use.

- [ ] **Step 1: Add the dependency**

```bash
cd services/pos-web && pnpm add react-resizable-panels@^3.0.3
```

- [ ] **Step 2: Copy and strip `"use client"`**

```bash
cd /home/anjar/Development/base-project-apps
cp services/backoffice/src/components/ui/resizable.tsx services/pos-web/src/components/ui/resizable.tsx
sed -i '/^"use client"$/d' services/pos-web/src/components/ui/resizable.tsx
```

- [ ] **Step 3: Typecheck**

```bash
cd services/pos-web && pnpm exec tsc -b --noEmit
```
Expected: no errors.

No commit.

---

### Task 8: Port shared Zustand stores (layout, color-scheme, sheet)

**Files:**
- Create: `services/pos-web/src/lib/store/layout-store.ts`
- Create: `services/pos-web/src/lib/store/color-scheme-store.ts`
- Create: `services/pos-web/src/lib/store/sheet-store.ts`

**Interfaces:**
- Produces: `useLayoutStore(): { layout: "default" | "horizontal"; setLayout; toggleLayout }` — consumed by Plan B's `LayoutWrapper`/`LayoutSwitcher`.
- Produces: `useColorSchemeStore(): { scheme; setScheme }`, plus `initColorScheme()`, `applyColorScheme()`, `colorPalettes` — consumed by Plan B's `ColorSchemeInit`.
- Produces: `useSheetStore(): { openSheet; previousSheet; open; close; toggle }` — consumed by Plan B's `AppRightSheet`/`AppTopbar`.

**Not ported:** `view-store.ts` — per the approved spec, pos-web keeps React Router URL navigation instead of backoffice's Zustand-driven single-page view switching. Nothing in this plan or later plans references `useViewStore`.

pos-web's Zustand convention (per its `CLAUDE.md`) mandates the selector pattern (`useStore((s) => s.field)`), never destructuring the whole store — all three files already follow this exactly as-is in backoffice's source (verified: e.g. `useLayoutStore((s) => s.layout)`), so no rewrite is needed here beyond the copy.

- [ ] **Step 1: Copy all three files verbatim**

```bash
mkdir -p services/pos-web/src/lib/store
cp services/backoffice/src/lib/store/layout-store.ts services/pos-web/src/lib/store/layout-store.ts
cp services/backoffice/src/lib/store/color-scheme-store.ts services/pos-web/src/lib/store/color-scheme-store.ts
cp services/backoffice/src/lib/store/sheet-store.ts services/pos-web/src/lib/store/sheet-store.ts
```

- [ ] **Step 2: Confirm no Next-specific code snuck in**

```bash
grep -n "next/\|use client" services/pos-web/src/lib/store/layout-store.ts services/pos-web/src/lib/store/color-scheme-store.ts services/pos-web/src/lib/store/sheet-store.ts
```
Expected: no output — these are pure Zustand + `localStorage`/`document`, framework-agnostic (already confirmed during research).

- [ ] **Step 3: Typecheck**

```bash
cd services/pos-web && pnpm exec tsc -b --noEmit
```
Expected: no errors.

No commit.

---

### Task 9: Foundation integration verification

**Files:** None — verification only.

- [ ] **Step 1: Full typecheck + build**

```bash
cd services/pos-web && pnpm exec tsc -b --noEmit && pnpm build
```
Expected: both pass clean.

- [ ] **Step 2: Full manual smoke pass in the browser**

```bash
cd services/pos-web && pnpm dev
```
Walk through every existing route: `/`, `/dashboard`, `/pos`, `/inventory`, `/inventory/products`, `/reports`, `/settings`, `/auth/login`. Expected: every page renders exactly as it did before this plan started — this phase is additive-only (new files not yet imported anywhere except the token/font change in Task 1, which is intentionally visible). Check the browser console for errors on each route.

- [ ] **Step 3: Confirm final file inventory**

```bash
cd services/pos-web/src/components/ui && ls | wc -l
```
Expected: `39` (original) `+ 19` (Task 3's 15 + Task 5/6/7's 3) `- 2` (toast.tsx/toaster.tsx never added) `= 56`.

No commit — Plan A is complete. Report back before starting Plan B (layout shell), since Plan B depends on everything in this plan being in place and correct.

---

## Self-Review Notes

- **Spec coverage:** This plan covers spec work-order items 1 (tokens/globals) and 2 (ui primitives diff/port), plus the shared-store portion of item 3 that Plan B will need. Items 3 (layout shell + router nav wiring), 5 (restyle existing pages), and 6 (new pages) are explicitly deferred to Plans B, C, D.
- **Placeholder scan:** No TBD/TODO — every step has literal commands or literal diffs.
- **Type consistency:** `useIsMobile()` (Task 2) → consumed by `sidebar.tsx` (Task 3) — same name, same no-arg/boolean-return signature as backoffice's source, verified by reading the file before writing the task.
- **Scope:** Kept to foundation only — deliberately excludes anything visible to a user beyond the font/token fix in Task 1, so it's safe to ship in isolation and review before committing to the bigger layout-shell change in Plan B.
