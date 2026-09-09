# Cashly UI/UX Overhaul — Conversion Plan

**Branch:** `ui-ux-overhaul-plan`
**Status:** PLAN ONLY — no code changed
**Date:** 2026-09-09
**Goal:** Total visual refresh. Functionality, routes, calculations, and data model stay exactly as-is.

Skills used: `ui-ux-pro-max`, `design-system`, `ui-styling`, `design` (+ `brand` tokens pattern).
Skill searches run:
- `--design-system "personal finance dashboard modern minimal" -p Cashly` → Glassmorphism style, Trust-blue + profit-green palette
- `--domain color "finance banking trustworthy"` → Banking/Traditional Finance + Personal Finance Tracker palettes
- `--domain typography "finance professional clean"` → Financial Trust (IBM Plex Sans), Corporate Trust (Lexend + Source Sans 3)
- `--stack nextjs "dashboard card list"` → 0 results, fell back to general Next.js defaults (stated explicitly per skill contract)

---

## 1. Non-negotiables (do not redesign these behaviors)

From `AGENTS.md` money rules + `CALCULATION-AUDIT.md`:

1. Amounts are whole minor units (paisa). UI parses with `toMinorUnits`, displays with `formatMoney`. Never arithmetic on `amount` float.
2. Transaction currency = its account's currency. No currency picker on transaction form. No editable account currency.
3. Never orphan a transaction. Account delete → reassign same-currency. No delete-cascade in UI copy or logic.
4. Calendar periods only (`monthPeriod` / `yearPeriod` etc.). No ms-subtraction in charts/filters.
5. Transfers convert per leg, then subtract. Summary/people tiles must keep this.
6. Trend colour is per-metric (up = good for income/savings, bad for expense).
7. `convertMinor` rounds to whole minor units.
8. Calculations stay pure in `src/lib` (`calculations.ts`, `money.ts`, `chart.ts`). No logic moves into hooks/components during restyle.
9. All writers call `all-transactions-provider` `refresh`. Keep.
10. `npm test` covers money logic — restyle must keep tests green.

Next.js note: this repo is Next 16 (`next@16.2.12`). Per `AGENTS.md`, read `node_modules/next/dist/docs/` before writing code in implementation phase. This plan writes no code.

---

## 2. Current inventory (what we are reskinning)

Routes (12): `/`, `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/app` (Home), `/app/summary`, `/app/accounts`, `/app/transactions`, `/app/transactions/new`, `/app/transactions/[id]`, `/app/categories`, `/app/people`, `/app/people/[id]`, `/app/settings`, `/share/[token]`.

Components (~40 files): primitives `button, input, select, sheet, toast, loader, skeleton, empty-state, chip, segmented-control, search-bar, masked-amount, load-more-button, category-icon`; nav `sidebar, bottom-nav, fab`; domain `transaction-row/list, account-card, balance-card, person-breakdown`; forms `transaction-form, account-form, category-form`.

Current tokens (`src/app/globals.css`, Tailwind v4 `@theme inline`):
- `--bg #fafafa / #0e0e11`, `--surface #fff / #191a1f`, `--border #e5e5ea / #2c2d34`
- `--accent #2563eb / #3b82f6`, income `#16a34a/#22c55e`, expense `#dc2626/#ef4444`, exchange `#2563eb/#3b82f6`
- `--radius-sm/md/lg 8/12/16`, `--shadow-sm/md`, font Inter via `--font-inter`
- Prior audit fixes already in: responsive summary grid, 44px touch targets, focus-visible rings, error border+ring. Do not regress these.

---

## 3. New visual direction

**Concept: "Trusted Ledger" — bank-grade trust + modern fintech clarity.**

- Style: soft Glassmorphism limited to overlays/nav (per skill perf: low cost, conditional a11y risk). App surfaces stay solid for money readability. Avoid pure-white backgrounds in light mode (skill AVOID rule) → warm paper `#F8FAFC`.
- Palette (merged from both skill hits):
  - Light: bg `#F8FAFC`, surface `#FFFFFF`, border `#E2E8F0`, primary navy `#0F172A`, secondary `#1E3A8A`, accent CTA profit-green `#059669`, destructive `#DC2626`, muted `#E8ECF1`, muted-fg `#475569`, ring navy.
  - Dark: bg `#0F172A`, card `#192134`, muted `#101A34`, muted-fg `#94A3B8`, primary `#1E40AF`, secondary `#3B82F6`, accent `#059669`, border `rgba(255,255,255,0.08)`, ring white.
  - Semantic money colors UNCHANGED in meaning, retuned for 4.5:1: income green, expense red, transfer blue. Trend arrows keep per-metric semantics.
- Typography (skill: Financial Trust): **IBM Plex Sans** everywhere (headings 600/700, body 400/500, numbers `tabular-nums`). Fallback if licensing/offline is an issue: Lexend headings + Source Sans 3 body (Corporate Trust pairing). Base 16px, line-height 1.5, no body text <12px.
- Shape: radius scale up one step for friendliness — sm 10, md 14, lg 20, full 999. Cards `radius-lg + shadow-md + 1px border`.
- Motion: 150–300ms `transition-colors/transform`, hover lift `translateY(-1px) + shadow-md`, press `scale(0.98)`. Respect `prefers-reduced-motion` (already in CSS, keep). No layout-animating width/height.
- Icons: Lucide only, no emoji. Sizes 16/20/24. All icon-only buttons get `aria-label` (already mostly, audit during implementation).

---

## 4. Token architecture (design-system skill, three layers)

Migrate `globals.css` to primitive → semantic → component, Tailwind v4 `@theme inline` mapped:

```css
/* primitive */
--blue-900: #0F172A; --blue-800:#1E3A8A; --blue-600:#2563EB; --blue-500:#3B82F6;
--green-700:#059669; --green-600:#16A34A; --green-500:#22C55E;
--red-600:#DC2626; --red-500:#EF4444;
--slate-50:#F8FAFC; --slate-200:#E2E8F0; --slate-500:#475569;
/* semantic */
--color-bg: var(--slate-50); --color-surface: #fff; --color-primary: var(--blue-900);
--color-accent: var(--green-700); --color-income: var(--green-600);
--color-expense: var(--red-600); --color-exchange: var(--blue-600);
/* component */
--button-primary-bg: var(--color-primary); --button-primary-fg: #fff;
--card-bg: var(--color-surface); --card-border: var(--slate-200);
--input-bg: var(--color-surface); --input-border: var(--slate-200);
```

Dark theme overrides only semantic + component layers. Add tokens missing today: `--radius-xl`, `--shadow-lg`, `--font-heading/body`, `--space-*` scale, `--state-focus-ring`. Validation in implementation: `node scripts/validate-tokens.cjs --dir src/` pattern (design-system skill) — no raw hex in components.

---

## 5. Screen-by-screen conversion (layout changes, zero logic changes)

1. **App shell + nav** — Sidebar (desktop) gets navy `#0F172A` dark / white light with active pill `accent-soft`; bottom-nav (mobile) floating rounded-full bar with blur 16px, ≤5 items, 56px height, focus-visible rings. Header: balance-visibility eye + theme toggle grouped right, 44px targets.
2. **Home `/app`** — BalanceCard becomes hero: navy gradient panel, large IBM Plex 32px tabular amount, masked blur retained, income/expense mini-stats row. AccountBalances horizontal snap-scroll cards with currency code chip. RecentTransactions list with date dividers, 12px section labels uppercase.
3. **Summary `/app/summary`** — Keep 4 tiles + cash-flow 12-month chart + breakdowns. New: tile cards with top accent bar (green/red/blue/neutral), delta chip with correct per-metric colour, chart in card with legend + tooltip + accessible colors (never color-alone; add labels). Mobile `grid-cols-2`, desktop `md:grid-cols-4` (keep fix).
4. **Accounts `/app/accounts`** — AccountCard: bank-card look, currency badge, masked balance, hover lift. AccountForm in sheet `max-h-90dvh` mobile.
5. **Transactions list/new/edit** — TransactionRow: 56px row, icon in soft-tinted rounded square (income/expense/transfer/give/take), right-aligned tabular amount + running-date group header. Filters: segmented-control pill group + search-bar. Forms keep all fields/order/validation copy; only inputs get new border/radius/focus tokens, errors `text-sm font-medium + border-expense`.
6. **People + person detail** — PersonBreakdown rows with owe/owed chips; share button prominent; person detail header with net balance hero + settlement CTA (existing action only).
7. **Categories** — Icon grid `grid-cols-4 md:grid-cols-8` (keep fix), icon buttons 44px, selected = navy fill + white icon.
8. **Settings** — Grouped sections (profile, preferences, danger), 48px rows, toggles unchanged behavior.
9. **Auth (login/register/forgot/reset)** — Centered card on subtle gradient + faint grid pattern, primary CTA full-width 48px, error summary near fields (forms & feedback rule), visible labels (no placeholder-only).
10. **Share `/share/[token]`** — Public, read-only styling: white card on navy page bg, token status states (loading/error/not-found) keep copy, amounts formatted same lib.
11. **Landing `/`** — Hero + feature trio + CTA (skill pattern: Product Demo + Features, no autoplay video). Static mock of dashboard built from real components (screenshot-style, not live data).

---

## 6. Component spec deltas

| Component | Now | New |
|---|---|---|
| Button | h-9→h-11 prior, variants primary/secondary/ghost/danger | Keep sizes (≥44px), new: primary navy, accent green CTA, radius-md, hover opacity-90 + translateY(-1px), focus-visible 2px ring, loading spinner same |
| Input/Select | h-12, border-border, error border+ring | radius-md(14), bg-surface, border-slate-200, focus:border-primary + ring, error `text-sm font-medium mt-2`, hint 12px secondary |
| Card | border + surface + shadow-sm/md | radius-lg(20), shadow-md, hover:shadow-lg on clickable, accent top-bar variant for summary |
| Chip/Segmented | selected bg | Pill segmented with sliding indicator (transform only), color-coded income/expense/transfer |
| Sheet/Dialog | max-h-85/90dvh, backdrop | Glass backdrop `blur(8px) + black/40`, panel radius-lg top on mobile, full modal desktop, focus trap keep |
| Toast/Loader/Skeleton/Empty | working | Toast bottom-center pill with icon; skeleton shimmer keep; empty-state larger icon + CTA button |
| FAB | — | 56px circular accent-green, plus icon, bottom-right above bottom-nav, `aria-label="Add transaction"` |

---

## 7. Accessibility + responsive + theming checklist (ui-ux-pro-max priorities 1–10)

- Contrast 4.5:1 body, 3:1 large; verify navy-on-white, white-on-navy, green/red chips.
- Touch 44×44 min everywhere; 8px+ gaps; loading feedback on every submit/nav.
- Mobile-first: verify 375/768/1024/1440, no horizontal scroll, `md:pl-60` shell offset kept.
- Keyboard: visible focus on nav/buttons/inputs/sheet-close; skip-link to add; tab order unchanged.
- Forms: visible labels, inline errors near field, helper text, no placeholder-only.
- Charts: legend + tooltip + text labels, not color-alone; 12-month scroll on small screens.
- Motion: reduced-motion disables lift/blur animation; no width/height animation.
- Dark mode: every token has dark equivalent; masked blur `blur-[6px]` retest on high-DPI, bump to 8px if weak.

---

## 8. Implementation phases (for later, not now)

- P0 Scaffold: tokens in `globals.css`, font swap to IBM Plex Sans, Tailwind theme map, no component edits. Verify `npm run build`.
- P1 Primitives: button/input/select/chip/segmented/sheet/toast/skeleton/empty/search/masked-amount. Story-check each route.
- P2 Shell + Home + Transactions (highest traffic).
- P3 Summary charts + Accounts + People + Categories + Settings.
- P4 Auth + Share + Landing.
- P5 Polish: motion, focus, dark-mode contrast pass, 375px sweep, `npm run lint`, `npm test`.
- Each phase: `npm run build && npm test`, screenshot before/after, keep `CALCULATION-AUDIT.md` green.

Out of scope: new features, copy changes beyond casing, new deps (no shadcn install — hand-roll to current primitives to avoid churn), currency logic, period logic, API changes.

---

## 9. Acceptance

- [ ] All routes render same data/counts/totals as `main` (spot-check Home, Summary, People, Share).
- [ ] `npm test` passes (money/calc/chart suites untouched).
- [ ] Touch targets ≥44px, focus visible, no new lint errors.
- [ ] Light + dark screenshots for all 12 routes at 375px + 1280px.
- [ ] No raw hex in components (token validator clean).
