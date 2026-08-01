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
      Define **both light and dark token sets** from the start.
- [ ] Inter font via `next/font/google`.
- [ ] Prettier config; `.gitignore` with `.env.local`, `.next`, `node_modules`.
- [ ] Git repo init + first commit (if user approves).
- [ ] Add `lucide-react`, `appwrite` deps.
- [ ] Appwrite Cloud project + DB + collections created (per
  `architecture.md` §4 / `database-schema.md`): `accounts`, `transactions`,
  `categories`; `.env.local` filled.
- [ ] Seed predefined categories via console or setup script (run once).

**Acceptance:** `npm run dev` → blank page renders; `npm run lint` clean;
env vars read from `.env.local`; both themes render.

---

## Phase 1 — Auth, Dark Mode & Accounts

**Goal:** register, login, logout, recovery, protected routing, dark mode,
and account setup (default accounts per new user).

- [ ] `lib/appwrite/client.ts`, `lib/appwrite/auth.ts` wrappers.
- [ ] `AuthProvider` + `useAuth` hook (session state machine).
- [ ] `/auth/login` — email/password, error handling, links.
- [ ] `/auth/register` — validation (email format, password ≥ 8, match), create
  account, auto sign-in, then **seed data**:
  default prefs (`defaultCurrency: "BDT"`) + default accounts
  (Cash, Bank, bKash, Nagad).
- [ ] `/auth/forgot-password` — sends recovery email via Appwrite.
- [ ] Root `/` redirect logic; `/auth/*` redirect to `/app` when logged in.
- [ ] `src/app/app/layout.tsx` auth guard (loader → redirect when anonymous).
- [ ] `ThemeProvider` + `data-theme` on `<html>`; light/dark/system
  (defaults to system). Both token sets already in CSS.
- [ ] `/app/accounts` page: list seeded accounts, create/edit/delete
  (`useAccounts` hook), delete blocked if account has transactions.
- [ ] Sign out (from Settings later in Phase 7; provide dev-only button here).

**Acceptance:** can register, log out, log back in, request recovery; refresh
keeps session; `/app` redirects anonymous users to login; new user gets Cash/
Bank/bKash/Nagad accounts; theme toggle switches light/dark; default currency
is BDT.

---

## Phase 2 — Data Layer

**Goal:** hooks + CRUD utilities against Appwrite.

- [ ] `lib/appwrite/collections.ts`: `listAccounts`, `create/update/delete
  Account`, `listTransactions`, `create/update/delete Transaction`,
  `listCategories`, `create/deleteCategory` (owner permissions, queries from
  `database-schema.md` §2–4).
- [ ] `searchTransactions(term)` — note search (`Query.search`) + category-name
  search (match category ids) per `database-schema.md` §3.
- [ ] `lib/currency/currencies.ts` (supported codes incl. **BDT** + locales)
  and `lib/currency/format.ts` (`formatCurrency(amount, currency)` via Intl).
- [ ] `lib/constants/` — category presets, icon map, default account seeds.
- [ ] Hooks: `useTransactions(filters)`, `useAccounts()`, `useCategories()`,
  `useUserPrefs()`/`SettingsProvider`.
- [ ] Validation helper (`lib/utils.ts`): positive amount, supported currency,
  valid accountId, matching category type, trimmed note/payee, valid datetime.

**Acceptance:** each hook returns data for the current user only; Appwrite
console shows correct permissions; invalid inputs rejected at hook level;
search returns matches on note and category name.

---

## Phase 3 — App Shell & UI Kit

**Goal:** navigable shell + reusable components (no data yet).

- [ ] UI kit per `design.md` §5: `Button`, `Input`, `SegmentedControl`, `Chip`,
  `Sheet` (bottom sheet + desktop modal), `Toast`, `Skeleton`, `EmptyState`,
  `SearchBar`, `LoadMoreButton`.
- [ ] `TransactionRow`, `AccountCard`, `AccountPicker`, `MonthlySummary`
  components (light + dark styling).
- [ ] Nav: `BottomNav` (mobile, 5 tabs), `Sidebar` (desktop, 5 tabs), `TopBar`
  (with theme toggle), `FAB`.
- [ ] `/app` layout wiring nav; placeholders for Home/Accounts/Transactions/
  Categories/Settings pages (skeleton states).
- [ ] Not-found page.

**Acceptance:** nav works at all breakpoints with 5 tabs; FAB + sheets animate
(respecting `prefers-reduced-motion`); tabs active state correct; both themes
look right on all components.

---

## Phase 4 — Transactions CRUD

**Goal:** full create / read / update / delete of transactions.

- [ ] `/app/transactions` list page: filter bar (type + currency + account),
  **SearchBar** (note/category text), **Load More** button (no page numbers),
  empty state, per-currency total line.
- [ ] `/app/transactions/new` form: type toggle, account picker, amount
  (decimal keypad), currency (defaults to selected account's currency),
  category chip grid (filtered by type), merchant/payee (optional), date
  (default today), note. Client validation.
- [ ] `/app/transactions/[id]` edit form (same component) + delete with confirm
  sheet/dialog.
- [ ] Dates stored as full ISO **DateTime**; UI may display date only.
- [ ] Toasts on save/delete success & errors; refetch after mutations.

**Acceptance:** create/edit/delete work end-to-end for the logged-in user;
values survive refresh; second user's data is invisible; invalid dates/amounts
blocked; search + filters combine correctly; Load More appends more rows.

---

## Phase 5 — Home Dashboard

**Goal:** balance, monthly summary, recent transactions, quick add.

- [ ] `BalanceCard`: current balance across accounts in default currency
  (income − expense, per `database-schema.md` §7).
- [ ] `AccountBalances`: per-account balances list.
- [ ] `MonthlySummary`: **Monthly Income**, **Monthly Expense**, **Monthly
  Savings** (current month, default currency; no charts).
- [ ] Quick-add buttons (+ Income / + Expense) → pre-filled new-transaction
  flow.
- [ ] `RecentTransactions` (last 10) → "See all" link.
- [ ] Loading skeletons + empty state CTA.

**Acceptance:** balances correct per account and overall (default currency);
monthly income/expense/savings correct; recent list matches latest
transactions; quick add sets the right type.

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

**Goal:** default currency + theme + account info + sign out.

- [ ] `/app/settings`: default-currency select (persisted via User Prefs,
  default BDT), **theme selector** (Light / Dark / System), read-only
  name/email, sign out, version footer.

**Acceptance:** changing default currency updates balance on Home, monthly
summary, and the default in new-transaction form immediately; persists after
refresh; theme choice persists and follows system when set to System.

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
  reduced-motion); both light and dark contrast checked.
- [ ] Keyboard navigation on forms.
- [ ] Responsive pass: 360px, 768px, 1280px widths.
- [ ] Edge cases: very large amounts, leading/trailing zeros, midnight/date
  boundaries (full datetime), rapid double-submit, slow network, empty account
  list, delete-account-in-use block, search with no results.
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
