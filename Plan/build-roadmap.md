# Cashly — Build Roadmap

Phased execution plan. Each phase ends in a runnable, verifiable milestone.
"Done" = builds, lints, and the listed acceptance criteria pass on desktop and
mobile viewports. No extra features beyond `Project-Context.md` §3.

Estimated sequence only — sizes are per-phase, total is a small app.

---

## Phase 0 — Project & Tooling Setup

**Goal:** empty Next.js app that runs, with Tailwind + design tokens in place.

- [ ] `create-next-app` with TypeScript, App Router, ESLint; `src/` dir.
- [ ] Tailwind CSS v4 + design tokens in `globals.css` (`design.md` §1–3).
- [ ] Inter font via `next/font/google`.
- [ ] Prettier config; `.gitignore` with `.env.local`, `.next`, `node_modules`.
- [ ] Git repo init + first commit (if user approves).
- [ ] Add `lucide-react`, `appwrite` deps.
- [ ] Appwrite Cloud project + DB + collections created (per
  `architecture.md` §4 / `database-schema.md`); `.env.local` filled.
- [ ] Seed predefined categories via console or setup script (run once).

**Acceptance:** `npm run dev` → blank page renders; `npm run lint` clean;
env vars read from `.env.local`.

---

## Phase 1 — Auth

**Goal:** register, login, logout, recovery, protected routing.

- [ ] `lib/appwrite/client.ts`, `lib/appwrite/auth.ts` wrappers.
- [ ] `AuthProvider` + `useAuth` hook (session state machine).
- [ ] `/auth/login` — email/password, error handling, links.
- [ ] `/auth/register` — validation (email format, password ≥ 8, match), create
  account, auto sign-in, **seed default prefs** (`defaultCurrency: "USD"`).
- [ ] `/auth/forgot-password` — sends recovery email via Appwrite.
- [ ] Root `/` redirect logic; `/auth/*` redirect to `/app` when logged in.
- [ ] `src/app/app/layout.tsx` auth guard (loader → redirect when anonymous).
- [ ] Sign out (from Settings later in Phase 7; provide dev-only button here).

**Acceptance:** can register, log out, log back in, request recovery; refresh
keeps session; `/app` redirects anonymous users to login.

---

## Phase 2 — Data Layer

**Goal:** hooks + CRUD utilities against Appwrite.

- [ ] `lib/appwrite/collections.ts`: `listTransactions`, `create/update/delete
  Transaction`, `listCategories`, `create/deleteCategory` (owner permissions,
  queries from `database-schema.md` §2–3).
- [ ] `lib/currency/currencies.ts` (supported codes + locales) and
  `lib/currency/format.ts` (`formatCurrency(amount, currency)` via Intl).
- [ ] `lib/constants/categories.ts` (predefined presets + icon map from
  `database-schema.md` §3).
- [ ] Hooks: `useTransactions(filters)`, `useCategories()`,
  `useUserPrefs()`/`SettingsProvider`.
- [ ] Validation helper (`lib/utils.ts`): positive amount, supported currency,
  matching category type, trimmed note.

**Acceptance:** each hook returns data for the current user only; Appwrite
console shows correct permissions; invalid inputs rejected at hook level.

---

## Phase 3 — App Shell & UI Kit

**Goal:** navigable shell + reusable components (no data yet).

- [ ] UI kit per `design.md` §5: `Button`, `Input`, `SegmentedControl`, `Chip`,
  `Sheet` (bottom sheet + desktop modal), `Toast`, `Skeleton`, `EmptyState`.
- [ ] `TransactionRow` component (income/expense styling).
- [ ] Nav: `BottomNav` (mobile), `Sidebar` (desktop), `TopBar`, `FAB`.
- [ ] `/app` layout wiring nav; placeholders for Home/Transactions/Categories/
  Settings pages (skeleton states).
- [ ] Not-found page.

**Acceptance:** nav works at all breakpoints; FAB + sheets animate (respecting
`prefers-reduced-motion`); tabs active state correct.

---

## Phase 4 — Transactions CRUD

**Goal:** full create / read / update / delete of transactions.

- [ ] `/app/transactions` list page: filter bar (type + currency), pagination
  (20/page), empty state, per-currency total line.
- [ ] `/app/transactions/new` form: type toggle, amount (decimal keypad),
  currency (defaults to user default), category chip grid (filtered by type),
  date (default today), note. Client validation.
- [ ] `/app/transactions/[id]` edit form (same component) + delete with confirm
  sheet/dialog.
- [ ] Toasts on save/delete success & errors; refetch after mutations.

**Acceptance:** create/edit/delete work end-to-end for the logged-in user;
values survive refresh; second user's data is invisible; invalid dates/amounts
blocked.

---

## Phase 5 — Home Dashboard

**Goal:** balance + recent transactions + quick add.

- [ ] `BalanceCard`: balance in default currency (income − expense, per
  `database-schema.md` §6), caption when other currencies exist.
- [ ] Quick-add buttons (+ Income / + Expense) → pre-filled new-transaction
  flow.
- [ ] `RecentTransactions` (last 10) → "See all" link.
- [ ] Income/expense summary chips on card.
- [ ] Loading skeletons + empty state CTA.

**Acceptance:** balance is correct for default currency; recent list matches
latest transactions; quick add sets the right type.

---

## Phase 6 — Categories

**Goal:** predefined categories visible + custom category CRUD.

- [ ] `/app/categories` page: income/expense sections, chips from
  `useCategories()`.
- [ ] Add custom category: bottom sheet with name + type (+ icon picker).
- [ ] Delete custom category (blocked with toast if in use; predefined not
  deletable).
- [ ] Category picker in transaction forms shows custom categories too.

**Acceptance:** custom categories appear immediately in pickers; delete is safe;
all fields validated.

---

## Phase 7 — Settings

**Goal:** default currency + account info + sign out.

- [ ] `/app/settings`: default-currency select (persisted via User Prefs),
  read-only name/email, sign out, version footer.

**Acceptance:** changing default currency updates balance on Home and the
default in new-transaction form immediately; persists after refresh.

---

## Phase 8 — PWA

**Goal:** installable, offline-capable shell.

- [ ] Generate icons (192/512/maskable, apple-touch) from one SVG.
- [ ] `src/app/manifest.ts` + apple meta tags in root layout.
- [ ] Serwist setup (`@serwist/next`): service worker, precache shell, runtime
  cache for fonts/static; network-first for Appwrite data.
- [ ] Offline state handling on data pages (cached or friendly offline message).

**Acceptance:** Lighthouse PWA checks pass (installable, manifest, service
worker, viewport, theme colour); install prompt works on mobile; app shell
loads offline.

---

## Phase 9 — Polish & QA

**Goal:** ship-quality.

- [ ] Empty/loading/error states reviewed on every page.
- [ ] Accessibility pass per `design.md` §7 (focus, contrast, labels,
  reduced-motion).
- [ ] Keyboard navigation on forms.
- [ ] Responsive pass: 360px, 768px, 1280px widths.
- [ ] Edge cases: very large amounts, leading/trailing zeros, midnight/date
  boundaries, rapid double-submit, slow network.
- [ ] `npm run lint` + `npm run build` clean; manual smoke test checklist run
  against live Appwrite Cloud.

**Acceptance:** all acceptance criteria across phases pass; no console errors;
app usable end-to-end on phone + desktop.

---

## Definition of Done (whole project)

- [ ] Scope = `Project-Context.md` §3 only; nothing out-of-scope built.
- [ ] Every plan document reflected in code (schema, routes, design tokens).
- [ ] Works online and offline (shell) as a PWA on Android + iOS + desktop.
- [ ] Lint + production build green; smoke tests pass.
