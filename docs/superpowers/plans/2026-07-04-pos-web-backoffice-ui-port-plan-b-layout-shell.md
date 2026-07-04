# pos-web Backoffice UI Port — Plan B: Layout Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port backoffice's full layout shell (sidebar, topbar, footer, right-sheet, layout switcher, theme/color-scheme providers, motion primitives) into pos-web, wired to React Router instead of backoffice's Zustand view-switching, with all layout-tier icons routed through pos-web's `Icon` wrapper component per its CLAUDE.md convention. Ends with `DashboardLayout` and `pos-layout.tsx` re-skinned to use the new shell while keeping their existing `{children, title, subtitle}` / `{children}` prop contracts — so the 5 existing pages (dashboard, inventory, pos, reports, settings) render inside the new chrome with zero changes to their own files.

**Architecture:** Same mechanical-port approach as Plan A (already complete — tokens, 57 UI primitives, hooks, shared Zustand stores all in place). This plan's new wrinkle: backoffice's layout code uses lucide-react directly and stores icons as component references in data (`icon: SomeLucideIcon`); pos-web's CLAUDE.md requires the `Icon` wrapper for all feature/layout code (confirmed in Plan A: this rule does NOT apply to `components/ui/*` primitives, which already use lucide-react directly by existing convention — it DOES apply here, since this is layout/feature code, not a shadcn primitive). Every file in this plan needs the **Icon Conversion Protocol** (defined once below) applied, on top of the router-nav rewrite backoffice's view-store-driven files need.

**Tech Stack:** React 19, React Router 7, Zustand v5 (stores already ported in Plan A), `motion` package (successor to `framer-motion`, same API via `motion/react`), `next-themes` (already a pos-web dependency), lucide-react (via `Icon` wrapper for this plan's files).

## Global Constraints

- **No git operations inside `services/pos-web`, under any circumstance, ever.** This is repeated with maximum emphasis because an implementer agent in Plan A violated it — it ran `git commit` in this exact submodule while dying to a session/API limit, apparently as a "save my work" reflex. That is explicitly the WRONG behavior. If an agent is about to run out of turns/context/session budget, it must simply stop and report its status honestly (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT) — leaving work uncommitted in the working tree IS the correct, complete behavior. Every task dispatch in this plan's execution must repeat this instruction verbatim, not just link to this section.
- **Verify tsc and git status through `rtk proxy <cmd>`, never the plain form.** The `rtk` CLI proxy hook (a global, transparent command-rewriting hook in this environment) was twice observed silently misreporting exact output during Plan A — once claiming `pnpm exec tsc -b --noEmit` had "no errors" when there were 16, and once returning an empty/misleading result for `git status --porcelain` when the tree had many uncommitted changes. `rtk proxy pnpm exec tsc -b --noEmit` and `/usr/bin/git status --porcelain` (the literal binary path, not the `git` shell entry) are the trustworthy forms — use them for anything a task's pass/fail or scope-boundary determination depends on.
- **Baseline is 7 pre-existing, unrelated tsc errors**, carried over unresolved from Plan A: `combobox.tsx` (icon-xs Button size), `command.tsx` + `drawer.tsx` (ReactNode/bigint typing), `dashboard-sidebar.tsx` (broken `motion` package import — Plan B's Task 1 fixes the ROOT CAUSE of this exact error, see below), `general-tab.tsx` + `localization-tab.tsx` (Zod resolver overload), `query-client.tsx` (ReactNode/bigint typing). None of these are this plan's to fix except where a task explicitly says so. A task is done when the count doesn't increase beyond what that task's own scope explains.
- **In-scope-only fixes.** If porting a file surfaces a type error strictly inside that same file (verbatimModuleSyntax violation, noUnusedParameters violation, a React 18/19 typing mismatch) — fix it narrowly, typed, no `as any`/`@ts-ignore`. If an error appears in a file outside the current task's named file list, STOP and report as a concern — do not fix it blind. (Plan A hit this repeatedly; it's a real, recurring category, not a hypothetical.)
- **Package manager is `pnpm`.**
- **`noUnusedLocals`/`noUnusedParameters`/`verbatimModuleSyntax` are on** in `tsconfig.app.json`.
- Source root: `services/backoffice/src/...`. Target root: `services/pos-web/src/...`.

### Icon Conversion Protocol (apply to every file in this plan)

Backoffice's layout code imports lucide-react icons directly and sometimes stores them as component references in data structures (`icon: SomeLucideIcon`, typed `LucideIcon`). pos-web's `Icon` wrapper (`src/components/icons/index.tsx`, already exists, unchanged by this plan) resolves any icon by kebab-case or PascalCase string name — `<Icon name="chevrons-up-down" />`. This is DIFFERENT from Plan A's `components/ui/*` primitives, which correctly keep direct lucide-react imports per existing convention — this protocol applies only to the layout-shell files in this plan.

For each file:
1. Find the `lucide-react` import block (e.g. `import { ChevronsUpDown, Plus, Sparkles } from "lucide-react"`).
2. Add `import Icon from "@/components/icons"` once, near the top.
3. For every name used as a direct JSX tag (`<ChevronsUpDown className="..." />`), replace with `<Icon name="chevrons-up-down" className="..." />` (PascalCase → kebab-case: insert a `-` before each internal capital, lowercase everything — `ChevronsUpDown` → `chevrons-up-down`, `LayoutDashboard` → `layout-dashboard`).
4. For every name used as a stored/passed component reference (`icon: SomeIcon` in a data object, a prop typed `LucideIcon`, a destructured `{ icon: Icon }` render like `<item.icon />`/`<qa.icon />`):
   - Change the stored value to the kebab-case string name instead of the component reference.
   - Change any `LucideIcon`-typed field/prop to `string`.
   - Change the render site from `<item.icon className="..." />` to `<Icon name={item.icon} className="..." />`.
5. Remove the `lucide-react` import entirely once every usage in the file is converted.
6. Verify with `grep -n 'from "lucide-react"' <file>` — must return nothing once the file's conversion is complete.

---

### Task 1: Port `motion/primitives.tsx`

**Files:**
- Create: `services/pos-web/src/components/backoffice/motion/primitives.tsx`

**Interfaces:**
- Produces: whatever `motion/primitives.tsx` exports (reduced-motion-aware animation primitives/hooks) — consumed by later layout-shell files in this plan and potentially Plan C/D page restyles.

No Icon Conversion Protocol needed — this file has zero lucide-react imports (verified). Only transform: `framer-motion` → `motion/react` (pos-web already depends on the `motion` package, same API surface, no new dependency). This ALSO fixes the pre-existing baseline error `dashboard-sidebar.tsx(3,10): Module '"motion"' has no exported member 'motion'` if that file is later updated to import from `motion/react` instead of bare `motion` (not this task's job — noting it since Task 1's transform pattern is the fix other files will need).

- [ ] **Step 1: Copy the file**

```bash
mkdir -p services/pos-web/src/components/backoffice/motion
cp services/backoffice/src/components/backoffice/motion/primitives.tsx services/pos-web/src/components/backoffice/motion/primitives.tsx
```

- [ ] **Step 2: Strip `"use client"` and rewrite the framer-motion import**

In `services/pos-web/src/components/backoffice/motion/primitives.tsx`:
```
"use client";

import * as React from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type Variants,
} from "framer-motion";
```
becomes:
```
import * as React from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type Variants,
} from "motion/react";
```

- [ ] **Step 2: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged baseline) — this file isn't imported by anything yet.

No commit.

---

### Task 2: Port `theme-provider.tsx` and `color-scheme-init.tsx`

**Files:**
- Create: `services/pos-web/src/components/backoffice/theme-provider.tsx`
- Create: `services/pos-web/src/components/backoffice/color-scheme-init.tsx`

**Interfaces:**
- Consumes: `useColorSchemeStore`, `initColorScheme` from `@/lib/store/color-scheme-store` (already ported, Plan A Task 8).
- Produces: `ThemeProvider` (wraps `next-themes`' `ThemeProvider`) and `ColorSchemeInit` (side-effect-only component, renders `null`) — both consumed by Task 9's `DashboardLayout` rewrite.

No Icon Conversion Protocol needed — neither file has any lucide-react import. `next-themes` is already a pos-web dependency (used in Plan A's `sonner.tsx`). Both files are pure React with zero Next.js-specific code beyond the `next-themes` library import itself (which is framework-agnostic despite the package name — it works in any React app).

- [ ] **Step 1: Copy both files verbatim**

```bash
cp services/backoffice/src/components/backoffice/theme-provider.tsx services/pos-web/src/components/backoffice/theme-provider.tsx
cp services/backoffice/src/components/backoffice/color-scheme-init.tsx services/pos-web/src/components/backoffice/color-scheme-init.tsx
```

- [ ] **Step 2: Strip `"use client"` from both**

```bash
sed -i '/^"use client";$/d' services/pos-web/src/components/backoffice/theme-provider.tsx
sed -i '/^"use client";$/d' services/pos-web/src/components/backoffice/color-scheme-init.tsx
```

- [ ] **Step 3: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged).

No commit.

---

### Task 3: Port and adapt `navigation.ts` (view→url, Icon protocol)

**Files:**
- Create: `services/pos-web/src/lib/data/navigation.ts`

**Interfaces:**
- Produces: `NavChild`, `NavItem`, `NavSection` types (with `icon: string` instead of `icon: LucideIcon`, and `url` populated instead of `view` for every nav-bearing item), `navSections`, `megaMenuGroups`, `quickActions`, `searchCommands` (all with icon fields converted to string names) — consumed by Task 4 (`app-sidebar.tsx`), Task 5 (`app-topbar.tsx`), Task 8 (`horizontal-layout.tsx`).

This is backoffice's `lib/data/navigation.ts`, adapted in two ways: (1) every `view: "<name>"` becomes `url: "/<name>"` (pos-web keeps React Router URL navigation, not backoffice's Zustand view-switching — approved design decision from the original spec), and (2) full Icon Conversion Protocol (icon fields become kebab-case strings, `LucideIcon` type references become `string`).

- [ ] **Step 1: Copy the file**

```bash
mkdir -p services/pos-web/src/lib/data
cp services/backoffice/src/lib/data/navigation.ts services/pos-web/src/lib/data/navigation.ts
```

- [ ] **Step 2: Convert `view: "<name>"` to `url: "/<name>"`**

```bash
cd services/pos-web/src/lib/data
sed -i -E 's/view: "([a-z-]+)"/url: "\/\1"/g' navigation.ts
```
This converts every occurrence in both the `NavChild`/`NavItem` object literals (`navSections`) AND the type union members would be a problem if the sed touched type declarations — check by hand: the type declarations use `view?: "dashboard" | "settings" | ...` (a union, not `view: "dashboard"` object-literal syntax) so the regex `view: "([a-z-]+)"` does NOT match those (no closing quote immediately following a colon-quote pair in a union) — verify this after running the sed by confirming the type block still reads `view?: "dashboard" | "settings" | ...` unchanged, and only the actual data objects in `navSections` changed from `view: "pos"` to `url: "/pos"` etc.

- [ ] **Step 3: Remove the now-unused `view?:` type fields**

The `NavChild` and `NavItem` type definitions still declare a `view?: "dashboard" | "settings" | ...` union field that nothing populates anymore after Step 2. Remove it from both type definitions (it's dead surface — nothing in this plan or Plan C/D reads `.view` off a nav item). Find:
```typescript
export type NavChild = {
  title: string;
  url?: string;
  badge?: string;
  isActive?: boolean;
  view?:
    | "dashboard"
    | "settings"
    | "pos"
    | "catalog"
    | "suppliers"
    | "inventory"
    | "transactions"
    | "customers"
    | "vouchers"
    | "reports"
    | "debts"
    | "access-control"
    | "audit-log";
};
```
Remove the `view?: ...` block (7 lines including the union), leaving `url?: string;` as the only navigation-target field. Do the same for the near-identical `view?:` block in the `NavItem` type just below it.

- [ ] **Step 4: Apply the Icon Conversion Protocol**

This file has no JSX (it's a data file), so only the "stored component reference" half of the protocol applies:
- `NavChild`/`NavItem`/`QuickAction` types: change `icon: LucideIcon;` to `icon: string;`.
- Remove the `import type { LucideIcon } from "lucide-react";` line and the big `import { LayoutDashboard, Users, ... } from "lucide-react";` block entirely.
- Every place an icon component was assigned as a value (e.g. `icon: LayoutDashboard,` in a `navSections`/`megaMenuGroups`/`quickActions`/`searchCommands` entry), replace with the kebab-case string: `icon: "layout-dashboard",`. There are roughly 40 such assignments across `navSections`, `megaMenuGroups`, `quickActions`, and `searchCommands` — convert every one. Example conversions needed: `LayoutDashboard` → `"layout-dashboard"`, `ShoppingBag` → `"shopping-bag"`, `Package` → `"package"`, `Truck` → `"truck"`, `ClipboardList` → `"clipboard-list"`, `Users` → `"users"`, `Tags` → `"tags"`, `ArrowLeftRight` → `"arrow-left-right"`, `FileBarChart` → `"file-bar-chart"`, `HandCoins` → `"hand-coins"`, `Settings` → `"settings"`, `UserCog` → `"user-cog"`, `ScrollText` → `"scroll-text"`, `Layers` → `"layers"`, `ShieldCheck` → `"shield-check"`, `Bell` → `"bell"`, `Calendar` → `"calendar"`, `Repeat` → `"repeat"`, `LifeBuoy` → `"life-buoy"`, `FileText` → `"file-text"`, `PenSquare` → `"pen-square"`, `KeyRound` → `"key-round"`. (These are the exact identifiers imported at the top of the original file — convert each occurrence wherever it's used as a value.)

- [ ] **Step 5: Verify no lucide-react import remains**

```bash
grep -n "lucide-react" services/pos-web/src/lib/data/navigation.ts
```
Expected: no output.

- [ ] **Step 6: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged — this file isn't consumed by anything yet).

No commit.

---

### Task 4: Port `app-sidebar.tsx` (router-nav + Icon protocol)

**Files:**
- Create: `services/pos-web/src/components/backoffice/app-sidebar.tsx`

**Interfaces:**
- Consumes: `navSections`, `NavItem`, `NavChild` from `@/lib/data/navigation` (Task 3) — now using `.url` and string `.icon`, not `.view`/`LucideIcon`.
- Produces: `AppSidebar` component — consumed by Task 9's `default-layout.tsx`... wait, `default-layout.tsx` is backoffice's, ported in Task 9 of this plan below (see Task 9 renumbering note) — consumed by the layout composition task.

- [ ] **Step 1: Copy the file**

```bash
cp services/backoffice/src/components/backoffice/app-sidebar.tsx services/pos-web/src/components/backoffice/app-sidebar.tsx
```

- [ ] **Step 2: Strip `"use client"`**

```bash
sed -i '/^"use client";$/d' services/pos-web/src/components/backoffice/app-sidebar.tsx
```

- [ ] **Step 3: Replace the `useViewStore` import and usage with React Router**

Find:
```typescript
import { navSections, type NavItem, type NavChild } from "@/lib/data/navigation";
```
This import stays as-is (no rewrite needed here) — but two lines above it, find:
```typescript
import { useViewStore } from "@/lib/store/view-store";
```
Delete this line, and add instead (near the top, alongside the other `@/lib/*` imports):
```typescript
import { Link, useLocation } from "react-router";
```

Find the `MenuItem` function body:
```typescript
function MenuItem({ item }: { item: NavItem }) {
  const hasGroups = item.groups && item.groups.length > 0;
  const hasChildren = item.children && item.children.length > 0;
  const setView = useViewStore((s) => s.setView);
  const currentView = useViewStore((s) => s.view);

  if (!hasGroups && !hasChildren) {
    const isActive = item.view ? currentView === item.view : item.isActive;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={item.title}
          onClick={() => item.view && setView(item.view)}
        >
          <item.icon />
          <span>{item.title}</span>
          {item.badge && <NavBadge value={item.badge} />}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
```
Replace with:
```typescript
function MenuItem({ item }: { item: NavItem }) {
  const hasGroups = item.groups && item.groups.length > 0;
  const hasChildren = item.children && item.children.length > 0;
  const location = useLocation();

  if (!hasGroups && !hasChildren) {
    const isActive = item.url ? location.pathname === item.url : item.isActive;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton isActive={isActive} tooltip={item.title} asChild>
          <Link to={item.url ?? "#"}>
            <Icon name={item.icon} />
            <span>{item.title}</span>
            {item.badge && <NavBadge value={item.badge} />}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
```
(Note `item.icon` is now a string per Task 3's conversion, rendered via `<Icon name={item.icon} />` — this single spot handles the "stored icon reference" half of the protocol for `NavItem`; the direct-JSX half is handled in Step 4 below for this file's OWN lucide imports, e.g. `ChevronsUpDown`, `Plus`, `Sparkles`, `Search` used elsewhere in this same file.)

Also check the `SubMenuList`/`NavChild` rendering (renders `NavChild` items, which after Task 3 have `url`/`icon: string` too, but the original `app-sidebar.tsx` source doesn't render child icons at all — only title/badge — so no additional icon conversion needed there beyond what Task 3 already did to the data).

- [ ] **Step 4: Apply the Icon Conversion Protocol to this file's own direct lucide-react usage**

This file imports `{ ChevronsUpDown, Plus, Sparkles, Search } from "lucide-react"` for its own UI chrome (workspace switcher, upgrade card, search trigger — not the nav items, which are handled in Step 3 above). Add `import Icon from "@/components/icons";`, replace each direct JSX usage:
- `<ChevronsUpDown ... />` → `<Icon name="chevrons-up-down" ... />`
- `<Plus ... />` → `<Icon name="plus" ... />`
- `<Sparkles ... />` → `<Icon name="sparkles" ... />`
- `<Search ... />` → `<Icon name="search" ... />`

Remove the `lucide-react` import line entirely once done.

- [ ] **Step 5: Verify**

```bash
grep -n "lucide-react\|useViewStore" services/pos-web/src/components/backoffice/app-sidebar.tsx
```
Expected: no output.

- [ ] **Step 6: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged — not consumed by anything yet). Fix in-scope if this file itself has a new error; escalate if elsewhere.

No commit.

---

### Task 5: Port `app-topbar.tsx` (router-nav + Icon protocol)

**Files:**
- Create: `services/pos-web/src/components/backoffice/app-topbar.tsx`

**Interfaces:**
- Consumes: `megaMenuGroups`, `searchCommands`, `quickActions` from `@/lib/data/navigation` (Task 3), `useSheetStore` from `@/lib/store/sheet-store` (Plan A Task 8).
- Produces: `AppTopbar` — consumed by the layout composition task (Task 9 below).

This file's ONLY `view-store` usage is a single brand-logo click handler (verified during research: `const view = useViewStore(...)` is declared but the variable itself is never read anywhere except this one `setView` call).

- [ ] **Step 1: Copy the file**

```bash
cp services/backoffice/src/components/backoffice/app-topbar.tsx services/pos-web/src/components/backoffice/app-topbar.tsx
```

- [ ] **Step 2: Strip `"use client"`**

```bash
sed -i '/^"use client";$/d' services/pos-web/src/components/backoffice/app-topbar.tsx
```

- [ ] **Step 3: Replace view-store brand-click with router navigation**

Find:
```typescript
import { useViewStore } from "@/lib/store/view-store";
```
Delete it, add:
```typescript
import { useNavigate } from "react-router";
```
Find inside the component body:
```typescript
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);
```
Replace with:
```typescript
  const navigate = useNavigate();
```
Find:
```typescript
          onClick={() => setView("dashboard")}
```
Replace with:
```typescript
          onClick={() => navigate("/dashboard")}
```

- [ ] **Step 4: Apply the Icon Conversion Protocol**

This file imports a large lucide-react block: `Search, Menu, LayoutGrid, ChevronDown, Sun, Moon, Plus, Inbox, CheckCircle2, Circle, Command as CommandIcon, EllipsisVertical`. Add `import Icon from "@/components/icons";`, convert every direct JSX usage (e.g. `<Search className="..." />` → `<Icon name="search" className="..." />`, `<Sun ... />` → `<Icon name="sun" ... />`, `<Command as CommandIcon>` used as `<CommandIcon ... />` → `<Icon name="command" ... />`, etc. — go through each of the 12 imported names and convert every JSX call site). Remove the `lucide-react` import once done.

Also apply the protocol's "stored reference" half to any `qa.icon`/`item.icon` render calls in this file (mega menu items, search command items, quick actions) — same pattern as Task 4's Step 3: `<qa.icon className="..." />` → `<Icon name={qa.icon} className="..." />`.

- [ ] **Step 5: Verify**

```bash
grep -n "lucide-react\|useViewStore" services/pos-web/src/components/backoffice/app-topbar.tsx
```
Expected: no output.

- [ ] **Step 6: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged). Fix in-scope if new error is in this file; escalate otherwise.

No commit.

---

### Task 6: Port `app-footer.tsx` (Icon protocol + copy tweak)

**Files:**
- Create: `services/pos-web/src/components/backoffice/app-footer.tsx`

**Interfaces:**
- Produces: `AppFooter` — consumed by the layout composition task (Task 9).

No router-nav transform needed (this file has no view-store usage at all — just static footer links). Only the Icon Conversion Protocol plus one cosmetic text fix (the file says "Built with ♥ on Next.js" — pos-web is Vite, not Next.js).

- [ ] **Step 1: Copy the file**

```bash
cp services/backoffice/src/components/backoffice/app-footer.tsx services/pos-web/src/components/backoffice/app-footer.tsx
```

- [ ] **Step 2: Strip `"use client"`**

```bash
sed -i '/^"use client";$/d' services/pos-web/src/components/backoffice/app-footer.tsx
```

- [ ] **Step 3: Apply the Icon Conversion Protocol**

Imports `{ Heart, Github, Twitter, LifeBuoy } from "lucide-react"`. Add `import Icon from "@/components/icons";`, convert:
- `<Heart className="size-3 fill-[#FF7A85] text-[#FF7A85]" />` → `<Icon name="heart" className="size-3 fill-[#FF7A85] text-[#FF7A85]" />`
- `<Github className="size-3.5" />` → `<Icon name="github" className="size-3.5" />`
- `<Twitter className="size-3.5" />` → `<Icon name="twitter" className="size-3.5" />`
- `<LifeBuoy className="size-3.5" />` → `<Icon name="life-buoy" className="size-3.5" />`

Remove the `lucide-react` import.

- [ ] **Step 4: Fix the "on Next.js" copy**

Find:
```
            <Heart className="size-3 fill-[#FF7A85] text-[#FF7A85]" /> on Next.js
```
(now converted to the `Icon` form per Step 3) — change the trailing text from `on Next.js` to `on Vite`.

- [ ] **Step 5: Verify**

```bash
grep -n "lucide-react" services/pos-web/src/components/backoffice/app-footer.tsx
```
Expected: no output.

- [ ] **Step 6: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged).

No commit.

---

### Task 7: Port `app-right-sheet.tsx` and `sheet-contents.tsx` (Icon protocol, large file)

**Files:**
- Create: `services/pos-web/src/components/backoffice/app-right-sheet.tsx`
- Create: `services/pos-web/src/components/backoffice/sheet-contents.tsx`

**Interfaces:**
- Consumes: `useSheetStore`, `type SheetKind` from `@/lib/store/sheet-store` (Plan A Task 8).
- Produces: `AppRightSheet` (from `app-right-sheet.tsx`) and `ProfileSheet`, `NotificationsSheet`, `MessagesSheet`, `TasksSheet`, `CalendarSheet`, `ActivitySheet`, `SettingsSheet`, `HelpSheet`, `CartSheet`, `BookmarksSheet` (from `sheet-contents.tsx`) — consumed by the layout composition task (Task 9) and `horizontal-layout.tsx` (Task 8 below).

`sheet-contents.tsx` is 1176 lines with ~25 lucide-react icon imports, all used as direct JSX (no icon-as-value pattern found during research — verified only 5 unrelated `icon:`-substring matches, none forming a `LucideIcon`-typed data field). `app-right-sheet.tsx` has zero lucide-react imports (verified) and zero view-store usage — it's a pure dispatcher keyed by `SheetKind` string, no transform needed beyond the strip+directory move.

- [ ] **Step 1: Copy both files**

```bash
cp services/backoffice/src/components/backoffice/app-right-sheet.tsx services/pos-web/src/components/backoffice/app-right-sheet.tsx
cp services/backoffice/src/components/backoffice/sheet-contents.tsx services/pos-web/src/components/backoffice/sheet-contents.tsx
```

- [ ] **Step 2: Strip `"use client"` from both**

```bash
sed -i '/^"use client";$/d' services/pos-web/src/components/backoffice/app-right-sheet.tsx
sed -i '/^"use client";$/d' services/pos-web/src/components/backoffice/sheet-contents.tsx
```

- [ ] **Step 3: Apply the Icon Conversion Protocol to `sheet-contents.tsx`**

Read the file's lucide-react import block first (`grep -n -A 30 "^import {" services/pos-web/src/components/backoffice/sheet-contents.tsx | grep -B30 lucide-react` or just open the file — the import block is at the top, roughly 25 names). For each imported name:
1. Note its exact identifier.
2. Find every JSX call site (`<Name .../>`) in the file.
3. Replace with `<Icon name="kebab-case" .../>`.
4. After converting all of them, delete the `lucide-react` import block and add `import Icon from "@/components/icons";` once near the top.

This is the largest single icon-conversion in this plan (~25 distinct icon names across a 1176-line file, likely 40+ call sites total since some icons like `Bell` or `Search` may be used more than once). Work through it systematically — grep for each imported name individually to find every call site rather than eyeballing, e.g.:
```bash
grep -n "<Bell\b" services/pos-web/src/components/backoffice/sheet-contents.tsx
```
repeated per imported icon name, to make sure none are missed.

- [ ] **Step 4: Verify no lucide-react import remains in either file**

```bash
grep -n "lucide-react" services/pos-web/src/components/backoffice/app-right-sheet.tsx services/pos-web/src/components/backoffice/sheet-contents.tsx
```
Expected: no output.

- [ ] **Step 5: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged — nothing consumes these two files yet). Fix in-scope if a new error is inside one of these two files (e.g. a stray unconverted icon name causing "cannot find name X" — that means Step 3 missed a call site, go back and find it); escalate if elsewhere.

No commit.

---

### Task 8: Port `layouts/default-layout.tsx`, `layout-wrapper.tsx`, `layout-switcher.tsx`, `layouts/horizontal-layout.tsx` (router-nav + Icon protocol)

**Files:**
- Create: `services/pos-web/src/components/backoffice/layouts/default-layout.tsx`
- Create: `services/pos-web/src/components/backoffice/layouts/layout-wrapper.tsx`
- Create: `services/pos-web/src/components/backoffice/layouts/layout-switcher.tsx`
- Create: `services/pos-web/src/components/backoffice/layouts/horizontal-layout.tsx`

**Interfaces:**
- Consumes: `AppSidebar` (Task 4), `AppTopbar` (Task 5), `AppFooter` (Task 6), `AppRightSheet` (Task 7), `useLayoutStore` (Plan A Task 8), `navSections`/`quickActions`/`searchCommands` (Task 3), `SidebarProvider`/`SidebarInset` from `@/components/ui/sidebar` (Plan A Task 3).
- Produces: `LayoutWrapper` (chooses `DefaultLayout` vs `HorizontalLayout` based on `useLayoutStore`), `LayoutSwitcher` (floating toggle button) — both consumed by Task 9.

`default-layout.tsx`, `layout-wrapper.tsx`, `layout-switcher.tsx` have zero lucide-react-as-JSX issues needing the Icon protocol EXCEPT `layout-switcher.tsx`, which imports `{ PanelLeft, PanelTop, Check } from "lucide-react"` used both as direct JSX (`<Check ... />`) AND as a stored value in its local `layouts` array (`icon: PanelLeft`, rendered later as `<current.icon .../>` / `<l.icon .../>`) — both halves of the protocol apply here. `horizontal-layout.tsx` needs the full treatment: router-nav rewrite (heaviest view-store usage of any file in this plan — used for BOTH its desktop top-nav AND its mobile sheet-nav) plus the Icon Conversion Protocol (both direct JSX icons like `Sparkles`/`Search`/`Sun`/`Moon` and the `item.icon`/`qa.icon` stored-reference render pattern, same as Task 4/5).

- [ ] **Step 1: Copy all four files**

```bash
mkdir -p services/pos-web/src/components/backoffice/layouts
for f in default-layout layout-wrapper layout-switcher horizontal-layout; do
  cp "services/backoffice/src/components/backoffice/layouts/${f}.tsx" "services/pos-web/src/components/backoffice/layouts/${f}.tsx"
done
```

- [ ] **Step 2: Strip `"use client"` from all four**

```bash
cd services/pos-web/src/components/backoffice/layouts
for f in default-layout layout-wrapper layout-switcher horizontal-layout; do
  sed -i '/^"use client";$/d' "${f}.tsx"
done
```

- [ ] **Step 3: Apply the Icon Conversion Protocol to `layout-switcher.tsx`**

Import block:
```typescript
import { PanelLeft, PanelTop, Check } from "lucide-react";
```
becomes:
```typescript
import Icon from "@/components/icons";
```
The local `layouts` array:
```typescript
const layouts: { value: LayoutType; label: string; description: string; icon: any }[] = [
  { value: "default", label: "Sidebar", description: "Sidebar di kiri + topbar", icon: PanelLeft },
  { value: "horizontal", label: "Horizontal", description: "Navigasi horizontal di atas", icon: PanelTop },
];
```
becomes:
```typescript
const layouts: { value: LayoutType; label: string; description: string; icon: string }[] = [
  { value: "default", label: "Sidebar", description: "Sidebar di kiri + topbar", icon: "panel-left" },
  { value: "horizontal", label: "Horizontal", description: "Navigasi horizontal di atas", icon: "panel-top" },
];
```
Every render site using `.icon` as a component (`<current.icon className="size-4" />`, `<l.icon className={cn(...)} />`) becomes `<Icon name={current.icon} className="size-4" />` / `<Icon name={l.icon} className={cn(...)} />`. The one direct-JSX usage, `<Check className="mt-0.5 size-4 shrink-0 text-brand" />`, becomes `<Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />`.

- [ ] **Step 4: Replace `horizontal-layout.tsx`'s view-store usage with router navigation**

Find:
```typescript
import { useViewStore } from "@/lib/store/view-store";
```
Delete it, add:
```typescript
import { Link, useLocation, useNavigate } from "react-router";
```
Find inside `HorizontalLayout`:
```typescript
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);
```
Replace with:
```typescript
  const location = useLocation();
  const navigate = useNavigate();
```
Find the `topNavItems` memo:
```typescript
  const topNavItems = React.useMemo(() =>
    navSections.flatMap((s) =>
      s.items.filter((i) => i.view).map((i) => ({
        title: i.title, view: i.view, badge: i.badge, icon: i.icon,
      }))
    ), []);
```
Replace with:
```typescript
  const topNavItems = React.useMemo(() =>
    navSections.flatMap((s) =>
      s.items.filter((i) => i.url).map((i) => ({
        title: i.title, url: i.url, badge: i.badge, icon: i.icon,
      }))
    ), []);
```
Find the desktop nav render:
```typescript
          {topNavItems.map((item) => {
            const isActive = view === item.view;
            return (
              <button key={item.title} onClick={() => { setView(item.view as any); setMobileMenuOpen(false); }}
                className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition",
                  isActive ? "bg-accent text-brand shadow-sm" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground")}>
                {item.icon && <item.icon className="size-3.5" />}
```
Replace the `onClick`/`isActive` lines and the icon render (keep the rest of the JSX, className etc. unchanged):
```typescript
          {topNavItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <button key={item.title} onClick={() => { if (item.url) navigate(item.url); setMobileMenuOpen(false); }}
                className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition",
                  isActive ? "bg-accent text-brand shadow-sm" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground")}>
                {item.icon && <Icon name={item.icon} className="size-3.5" />}
```
Find the mobile sheet nav render (structurally identical pattern, inside the `<Sheet>` block):
```typescript
                  {section.items.filter((i) => i.view).map((item) => {
                    const isActive = view === item.view;
                    return (
                      <button key={item.title} onClick={() => { setView(item.view as any); setMobileMenuOpen(false); }}
                        className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition", isActive ? "bg-accent text-brand font-medium" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground")}>
                        {item.icon && <item.icon className="size-4" />}
```
Replace with:
```typescript
                  {section.items.filter((i) => i.url).map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <button key={item.title} onClick={() => { if (item.url) navigate(item.url); setMobileMenuOpen(false); }}
                        className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition", isActive ? "bg-accent text-brand font-medium" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground")}>
                        {item.icon && <Icon name={item.icon} className="size-4" />}
```

- [ ] **Step 5: Apply the Icon Conversion Protocol to `horizontal-layout.tsx`'s own direct lucide-react usage**

Import block: `{ Sparkles, Search, Sun, Moon, Command as CommandIcon, EllipsisVertical, Menu } from "lucide-react"`. Add `import Icon from "@/components/icons";` alongside the `react-router` import from Step 4. Convert every direct JSX call site for these 7 names (`<Sparkles ... />` → `<Icon name="sparkles" ... />`, `<Menu ... />` → `<Icon name="menu" ... />`, `<CommandIcon ... />` → `<Icon name="command" ... />`, etc. — there are multiple call sites for `Sparkles`, `Sun`/`Moon` in particular, appearing in both the desktop header and the mobile sheet — convert every one). Also convert the `qa.icon` render sites (`<qa.icon className="size-4" />` in the quick-actions row and the overflow dropdown) to `<Icon name={qa.icon} className="size-4" />`, same pattern as Task 5.

Remove the `lucide-react` import once every usage in the file is converted.

- [ ] **Step 6: Verify**

```bash
cd services/pos-web/src/components/backoffice/layouts
grep -n "lucide-react\|useViewStore" default-layout.tsx layout-wrapper.tsx layout-switcher.tsx horizontal-layout.tsx
```
Expected: no output.

- [ ] **Step 7: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged — `layout-wrapper.tsx`/`default-layout.tsx` now correctly resolve `AppSidebar`/`AppTopbar`/`AppFooter`/`AppRightSheet` from Tasks 4-7, so this is the first point where a wiring mistake in an EARLIER task would surface as a new error here — if one does, identify which earlier task's export doesn't match what's being imported, and fix the mismatch in whichever file has the wrong name/signature).

No commit.

---

### Task 9: Rewire `DashboardLayout` to use the new shell (prop contract preserved)

**Files:**
- Modify: `services/pos-web/src/layouts/dashboard-layout.tsx`

**Interfaces:**
- Consumes: `LayoutWrapper`, `LayoutSwitcher` (Task 8).
- Preserves: `DashboardLayout({ children, title, subtitle }: Props)` — the exact same prop contract the 5 existing pages already call (`dashboard/index.tsx`, `inventory/index.tsx`, `inventory/products.tsx`, `reports/index.tsx`, `settings/index.tsx` all call `<DashboardLayout title="..." subtitle="...">{children}</DashboardLayout>` today) — none of those 5 files should need ANY change after this task.

This is the task that actually makes the new shell visible. Current `dashboard-layout.tsx` hand-builds its own sidebar+topbar; this replaces that with the ported `LayoutWrapper` (which internally picks `DefaultLayout` or `HorizontalLayout` via `useLayoutStore`), keeping the existing title/subtitle header block and the "Export PDF" button pos-web already had.

- [ ] **Step 1: Read the current file to confirm nothing has drifted since Plan A**

```bash
cat services/pos-web/src/layouts/dashboard-layout.tsx
```
Confirm it still matches the version described in the original design spec (a `DashboardLayout({children, title, subtitle})` function hand-rendering a sidebar + topbar + title header + children, using `--ds-*` CSS custom properties and the old `Icon`-wrapper-based `DashboardSidebar`). If it has changed materially since then, stop and report — don't guess at a rewrite against unknown current content.

- [ ] **Step 2: Replace the file's implementation**

Replace the entire file content with:
```typescript
import type { ReactNode } from 'react'
import { LayoutWrapper } from '@/components/backoffice/layouts/layout-wrapper'
import { LayoutSwitcher } from '@/components/backoffice/layouts/layout-switcher'
import { Button } from '@/components/ui/button'
import Icon from '@/components/icons'

type Props = {
  children: ReactNode
  title?: string
  subtitle?: string
}

export default function DashboardLayout({ children, title, subtitle }: Props) {
  return (
    <>
      <LayoutWrapper>
        <div className="px-8 py-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {title && (
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h2 className="font-bold text-2xl tracking-tight mb-1 text-foreground">{title}</h2>
                  {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Icon name="download" className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
      </LayoutWrapper>
      <LayoutSwitcher />
    </>
  )
}
```
(`Icon` here is pos-web's EXISTING icon wrapper at `@/components/icons` — used correctly per this project's established convention; this is not new-to-this-plan usage, `dashboard-layout.tsx` already imported it before this change.)

- [ ] **Step 3: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged) OR a decrease if this happens to resolve `dashboard-sidebar.tsx`'s broken `motion` import baseline error — the old `DashboardSidebar` component (which had the broken `import { motion } from "motion"` causing that exact error) is no longer referenced by `DashboardLayout` after this change. If the error count drops to 6, that's expected and good — the old sidebar's broken import is now dead code (still present on disk, still broken if imported elsewhere, but no longer imported anywhere since `dashboard-layout.tsx` no longer uses it — confirm with `grep -rn "dashboard-sidebar" services/pos-web/src` that nothing else imports it before treating this as safe).

- [ ] **Step 4: Manual visual check**

```bash
cd services/pos-web && rtk proxy pnpm dev
```
Open `/dashboard` in a browser. Expected: new sidebar (dark teal, backoffice-style) + topbar render around the existing dashboard content (KPI grid, revenue chart, etc. — unchanged, since `dashboard/index.tsx` itself wasn't touched). Title "Dashboard" and subtitle render as before. Click the floating layout-switcher button (bottom-right) — confirm it toggles to horizontal-nav mode and back. Toggle dark mode via the topbar's theme button — confirm colors flip. Kill the dev server after checking.

No commit.

---

### Task 10: Re-skin `pos-layout.tsx` chrome (tokens only, structure unchanged)

**Files:**
- Modify: `services/pos-web/src/layouts/pos-layout.tsx`

**Interfaces:** Unchanged — `POSLayout({ children })`. `pos/index.tsx` (the only consumer) needs no changes.

Backoffice's own `PosPage` deliberately bypasses the sidebar/topbar shell entirely (confirmed during original design research: `if (view === "pos") return <TooltipProvider><PosPage /><AppRightSheet /></TooltipProvider>` — no `LayoutWrapper`), matching pos-web's existing POS design intent (full-screen terminal, no sidebar). So this task is NOT a shell swap like Task 9 — it's a lighter cosmetic pass: replace this file's `var(--ds-*)` custom-property references with the new shared design tokens established in Plan A (`--card`, `--border`, `--foreground`, `--muted-foreground`, `--primary`, `--muted`) so it visually matches the rest of the now-restyled app, while keeping its exact current structure (time display, search bar, back button, sync/fullscreen icons).

- [ ] **Step 1: Read the current file**

```bash
cat services/pos-web/src/layouts/pos-layout.tsx
```

- [ ] **Step 2: Replace `--ds-*` token references with the Plan A token set**

Go through the file's className/style usages and replace:
- `bg-ds-surface` → `bg-background`
- `text-ds-on-surface` → `text-foreground`
- `bg-ds-surface-lowest` → `bg-card`
- `border-ds-outline-variant` (and its `/15`, `/20` opacity variants) → `border-border` (keep the same opacity modifier syntax, e.g. `border-border/15`)
- `bg-ds-surface-high` → `bg-muted`
- `text-ds-on-surface-variant` → `text-muted-foreground`
- `text-ds-primary` / `border-ds-primary/20` / `ring-ds-primary/10` → `text-primary` / `border-primary/20` / `ring-primary/10`
- `placeholder-ds-on-surface-variant` → `placeholder-muted-foreground`

Do not change the icon usage, layout structure, JSX nesting, or the live-clock `useEffect` logic — this task is a pure token-name substitution, not a restructure. `Icon` is already used correctly in this file per pos-web's existing convention (no change needed there).

- [ ] **Step 3: Typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Expected: 7 errors (unchanged — pure className string edits, no type-level changes possible).

- [ ] **Step 4: Manual visual check**

```bash
cd services/pos-web && rtk proxy pnpm dev
```
Open `/pos`. Expected: same layout/structure as before, but colors now consistent with the rest of the restyled app (matching the sidebar/topbar's palette) instead of the old separate `--ds-*` scheme. Confirm the cart flow still works end-to-end (add a product, see it in the cart panel) — this is pos-web's core business flow, a regression here would be serious. Kill the dev server after checking.

No commit.

---

### Task 11: Layout-shell integration verification

**Files:** None — verification only.

- [ ] **Step 1: Full typecheck**

```bash
cd services/pos-web && rtk proxy pnpm exec tsc -b --noEmit
```
Record the exact error count and confirm every error matches a known pre-existing/explained case (7 baseline, minus one if Task 9's dead-code resolution of `dashboard-sidebar.tsx`'s broken import panned out — confirm which is actually true and report the real number, don't assume).

- [ ] **Step 2: Confirm no lucide-react leakage outside `components/ui/*` and `components/icons/*`**

```bash
grep -rln "from \"lucide-react\"\|from 'lucide-react'" services/pos-web/src/components/backoffice services/pos-web/src/layouts services/pos-web/src/lib/data
```
Expected: no output — every file this plan touched should have completed the Icon Conversion Protocol. If anything shows up, that file's conversion was incomplete — finish it before treating this task as done.

- [ ] **Step 3: Full manual smoke pass**

```bash
cd services/pos-web && rtk proxy pnpm dev
```
Walk through `/dashboard`, `/inventory`, `/inventory/products`, `/reports`, `/settings`, `/pos`, `/auth/login`. For the 6 non-POS routes: confirm the new sidebar+topbar+footer shell renders, sidebar highlights the active route correctly (matching `location.pathname`), theme toggle works, layout-switcher toggles default/horizontal correctly, and the mobile hamburger menu (in horizontal mode, narrow viewport) opens the sheet-based nav. For `/pos`: confirm it still renders full-screen with no sidebar (matching its original design), tokens look consistent with the rest of the app, and the cart flow works. Check the browser console for errors on every route.

- [ ] **Step 4: Confirm final file inventory**

```bash
find services/pos-web/src/components/backoffice -type f | sort
```
Expected: `app-footer.tsx`, `app-right-sheet.tsx`, `app-sidebar.tsx`, `app-topbar.tsx`, `color-scheme-init.tsx`, `sheet-contents.tsx`, `theme-provider.tsx`, `layouts/default-layout.tsx`, `layouts/horizontal-layout.tsx`, `layouts/layout-switcher.tsx`, `layouts/layout-wrapper.tsx`, `motion/primitives.tsx` — 12 files total.

No commit — Plan B is complete. Report back before starting Plan C (restyle the 5 existing pages), since Plan C depends on this shell being in place and correct.

---

## Self-Review Notes

- **Spec coverage:** Covers spec work-order items 3 (layout shell) and 4 (router-nav wiring), per the original design's numbered work order. Item 5 (restyle existing 5 pages) and item 6 (8 new pages) remain Plan C and Plan D.
- **Placeholder scan:** No TBD/TODO. Task 3 and Task 7's icon-name lists are enumerated as concretely as research allowed; where a task says "convert every call site" instead of listing each one individually (Task 7's sheet-contents.tsx, Task 5/8's larger icon blocks), that's because the file is large enough that hand-enumerating every line number would drift from reality by execution time — the verification step (`grep` for zero remaining lucide-react imports) is the actual completeness gate, not the prose list.
- **Type consistency:** `NavItem`/`NavChild`'s `icon: string` (Task 3) is consumed identically as `<Icon name={item.icon} />` in Task 4, Task 5, and Task 8 — verified the same field name and type flow through every consumer.
- **Scope:** Deliberately stops at making the shell visible and correct around the 5 EXISTING pages without touching those pages' own files (Task 9's prop-contract preservation is the load-bearing constraint that makes this true) — Plan C's job is restyling those 5 pages' own markup, not this plan's.
