# Cashly

Cashly is a personal finance web app built with Next.js and Supabase. It helps users manage accounts, categories, and transactions with a simple mobile-friendly experience, including authentication, balances, summaries, and transaction history.

🔗 **Live app:** [https://cashly.mvp.bd/](https://cashly.mvp.bd/)

## Overview

### What the app includes
- User authentication with Supabase Auth (register, login; password resets are handled by hand for now — see [Password resets](#password-resets))
- Multiple accounts per user (cash, bank, mobile wallet), each with its own currency, plus balance tracking
- Categories for income and expenses with a large built-in icon set
- Five transaction types: income, expense, **transfer** (between two same-currency accounts, tracking any fee or gain), and give/take (money lent to or borrowed from a person)
- People tracking: see who owes you and who you owe, backed by a shared `signedCashDelta` convention so the People page and Summary page always agree
- Public share links per person — always show that person's *live* balance and history (served by a server route using the Supabase secret key), not a frozen snapshot from when the link was created
- Transaction creation, editing, and filtering (search, type, account)
- Summary tab with monthly / yearly / all-time views, opening & closing balances, savings rate, trends, category breakdowns, people breakdown, and a 12-month cash flow chart
- Multi-currency support with live exchange-rate conversion, shared app-wide via a single provider (hourly refresh, cached, with a hardcoded fallback table)
- Balance privacy: hidden by default, with a "peek" eye toggle that blurs the amount but keeps the currency symbol readable
- Responsive mobile-first UI (bottom nav on phones, sidebar on desktop)
- Progressive Web App support via service worker registration

### Tech stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Vitest for the calculation test suite
- Supabase (Postgres + Auth) for auth and database, with Row Level Security on every table
- `@supabase/supabase-js` in the browser (publishable key) and in the share-link route (secret key)
- Lucide icons

## Money and calculations

These rules are what keep the figures on different screens agreeing with each other. Breaking one of them is how the bugs catalogued in [CALCULATION-AUDIT.md](CALCULATION-AUDIT.md) happened, so they are worth knowing before touching anything that handles an amount.

**Amounts are whole minor units.** A transaction's value is stored in paisa/cents as an integer (`amountMinor`), never as decimal taka. Floating-point decimals do not add up exactly — a thousand additions of `0.07` gives `70.0000000000004` — and the error accumulates across a long history. Use `toMinorUnits` to parse user input and `formatMoney` to display; both live in `src/lib/money.ts` and `src/lib/currency/format.ts`.

The float columns `amount` / `fromAmount` / `toAmount` still exist and are still written, so older clients keep working and the change stays reversible. Read them through `readAmountMinor` and friends, which prefer the integer and fall back to the float.

**A transaction's currency is always its account's currency.** There is no separate picker. Account currency is fixed at creation and cannot be edited, because balances are stored as bare numbers that take their currency from the account — changing it would silently re-value every past transaction.

**Deleting an account moves its transactions, it does not orphan them.** The destination must use the same currency. This is what keeps the Home total and the Summary closing balance equal.

**Periods are calendar periods.** Month and year comparisons are built from real calendar boundaries (`monthPeriod`, `previousMonthPeriod`, `yearPeriod`, `previousYearPeriod`), never by subtracting a fixed number of milliseconds — months differ in length and years have leap days.

**Trend colour is per-metric.** Rising income is good and rising expense is bad, so `TrendRow` is told which direction is good rather than sharing one rule. `percentChange` divides by the magnitude of the baseline so a shrinking loss reads as an improvement.

**Transfers are valued per leg.** Each side is converted using its own account's currency. The form only permits same-currency transfers, but older rows can cross currencies, and subtracting one leg from the other before converting produces nonsense.

**Supported currencies** are BDT, USD, EUR, GBP, INR, SAR, AED and MYR. All eight divide into 100 minor units, which the storage format relies on — adding one without a two-decimal subunit (JPY, KWD) would need `MINOR_UNITS_PER_MAJOR` to become per-currency.

## Project structure

- `src/app`: route pages, app layout, and the `/api/share/[token]` route handler (server-side, secret key)
- `src/components`: reusable UI and feature components
- `src/hooks`: data hooks for accounts, transactions, categories, people, and summary views
- `src/lib`: app constants, utility helpers, the Supabase client and data layer (`supabase/`), currency formatting, and the pure calculation modules —
  - `calculations.ts` — period aggregation, balances, breakdowns, trends
  - `money.ts` — minor-unit parsing, formatting and storage-compatibility reads
  - `chart.ts` — cash-flow bar geometry
- `src/providers`: auth, theme, settings, exchange rates, toast, the shared transaction cache (`all-transactions-provider.tsx`), and app providers
- `supabase/migrations`: the database schema (tables, constraints, Row Level Security)
- `scripts`: schema, maintenance and migration helpers

The money logic lives in `src/lib` as pure functions rather than inside the hooks, so it can be tested without rendering the app. Keep it that way — that separation is what the test suite depends on.

## Prerequisites

Before running the project locally, make sure you have:
- Node.js 20+ recommended
- npm
- A Supabase project

## Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

### Notes
- `NEXT_PUBLIC_*` values are used by the browser app. The publishable key is safe to ship: Row Level Security limits every query to the signed-in user's rows.
- `SUPABASE_SECRET_KEY` bypasses Row Level Security. Only the `/api/share/[token]` route uses it, on the server, so it must be set in Vercel as a real (preferably Sensitive) environment variable and never prefixed `NEXT_PUBLIC_`.
- `npm run build` needs these present: the Supabase clients are constructed as their modules load, which happens while Next collects page data.
- The database scripts read their own git-ignored file instead, `.env.supabase.local`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `SUPABASE_DB_URL` (the session-pooler connection string).
- Never commit your real secrets. The repository ignores `.env*.local`, `.env.vercel` and `backup-*.json`.

## Local development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Testing

The calculation layer is covered by Vitest. These are the figures users act on, so a change to anything under `src/lib` should come with a test.

```bash
npm test          # run once
npm run test:watch
```

`src/lib/audit-scenarios.test.ts` replays the specific bugs found in [CALCULATION-AUDIT.md](CALCULATION-AUDIT.md) and pins the wrong number each one used to produce, so a regression fails with the issue named.

## Supabase setup

1. Create a Supabase project (Southeast Asia / Singapore is closest to the users). Leave **Automatically expose new tables** off; the schema grants access itself.
2. Authentication → Sign In / Providers → Email: provider **on**, **Confirm email off** (the app logs new users straight in).
3. Authentication → URL Configuration: Site URL `https://cashly.mvp.bd`; add `<site>/auth/reset-password` and `http://localhost:3000/auth/reset-password` to Redirect URLs.
4. Apply the schema:

```bash
node --env-file=.env.supabase.local scripts/apply-schema.mjs
```

It runs every file in `supabase/migrations` that has not run yet, each in a transaction, and records it in `migration.schema_migrations`. **Add schema changes as a new migration file and apply it before deploying code that uses them.**

### What the database enforces

The money rules above are backed by the schema, not just the UI:
- Every table has Row Level Security: a user can only read and write their own rows, and signed-out visitors can read nothing.
- A transaction's account, transfer accounts and person are foreign keys with `on delete restrict` — the database refuses to orphan a transaction.
- An account's currency cannot be changed once created (trigger).
- Deleting a login is refused while it still owns any data.
- A trigger creates each new user's `profiles` row (display name, default currency).

### Password resets

Supabase's built-in mailer only reaches the project's own team members, and the project has no custom SMTP yet, so `/auth/forgot-password` shows a contact address (`PASSWORD_RESET_CONTACT` in `src/lib/constants.ts`) instead of a form. To reset a user's password:

```bash
node --env-file=.env.supabase.local scripts/set-user-password.mjs user@example.com
```

It prints a temporary password to send the user privately. Once SMTP is configured (Authentication → Emails → SMTP settings), set `PASSWORD_RESET_CONTACT` to `null` and the self-service form comes back.

### Scripts

| Script | What it does |
|---|---|
| `node --env-file=.env.supabase.local scripts/apply-schema.mjs` | Applies pending `supabase/migrations` files |
| `node --env-file=.env.supabase.local scripts/set-user-password.mjs <email>` | Sets and prints a temporary password for one user |
| `npx vite-node --config vitest.config.ts scripts/integration-test.ts` | End-to-end check of the data layer against the real project, as a throwaway user it deletes afterwards: RLS isolation, every write path, the orphan guard, share links |

### Moving from Appwrite (done 2026-10-20)

Cashly ran on Appwrite until 2026-10-20. The move is documented in [the design](docs/superpowers/specs/2026-10-20-supabase-migration-design.md) and [the cutover runbook](docs/supabase-cutover.md) (rollback and cleanup included). In short: users kept their passwords (their argon2id hashes were imported), every Appwrite document id was kept, every field and balance was verified, and every source document is also stored verbatim in the private `migration` schema.

The migration scripts read Appwrite only through `scripts/lib/appwrite-readonly.mjs`, which can list and nothing else:

| Script | What it does |
|---|---|
| `backup-appwrite.mjs` | Full, checksummed snapshot of Appwrite (users with password hashes, every document) to `../Cashly-backups` |
| `copy-to-supabase.ts` | Copies a snapshot into Supabase and verifies it. Refuses to run now that `migration.state` marks Supabase as live |
| `check-appwrite-drift.mjs` | Lists anything written to Appwrite after a snapshot |
| `check-connections.mjs` | Read-only connectivity check for both projects |

The older scripts `setup-db.mjs`, `audit-data.mjs`, `migrate-to-minor-units.mjs`, `cleanup-orphaned-data.mjs` and `smoke-test.cjs` work against **Appwrite only** and no longer touch production. They are kept until the post-migration cleanup removes them along with the `appwrite` packages.

## Build and lint

```bash
npm run build
npm run lint
```

## Deployment on Vercel

To deploy this app to Vercel:

1. Push the repository to GitHub.
2. Create a new Vercel project and import the repository.
3. Add the three environment variables above in Vercel Project Settings > Environment Variables (mark `SUPABASE_SECRET_KEY` Sensitive).
4. Deploy the project.

### Vercel env file

A ready-to-use env file is included at `.env.vercel` for reference and upload. It is gitignored by default.

### If login shows "Failed to fetch" on Vercel

The browser talks to Supabase directly. If the app works locally but not on Vercel, check that the deployment has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set, and redeploy after changing them — `NEXT_PUBLIC_*` values are built into the bundle. If share links fail, check `SUPABASE_SECRET_KEY`.

## Useful commands

```bash
npm run dev
npm test
npm run build
npm run lint
node --env-file=.env.supabase.local scripts/apply-schema.mjs
node --env-file=.env.supabase.local scripts/set-user-password.mjs <email>
npx vite-node --config vitest.config.ts scripts/integration-test.ts
```

## Documentation

| Document | What it covers |
|---|---|
| [docs/supabase-cutover.md](docs/supabase-cutover.md) | The Appwrite → Supabase cutover runbook, rollback and cleanup checklist |
| [CALCULATION-AUDIT.md](CALCULATION-AUDIT.md) | Audit of every money calculation, the 17 issues found, the decisions taken on each, and what was implemented. Start here before changing anything that handles an amount |
| [NEW-INSIGHTS-REPORT.md](NEW-INSIGHTS-REPORT.md) | Research (Aug 2026) into insights derivable from the existing schema |
| [UI-UX-AUDIT.md](UI-UX-AUDIT.md) | UI/UX audit findings (Aug 2026) |
| [UI-FIX-SUMMARY.md](UI-FIX-SUMMARY.md) | The fixes made in response to that audit (Aug 2026) |

The three August documents are point-in-time records and are not kept up to date.

## Notes

- The app is designed as a mobile-first finance experience.
- Authentication and data storage are handled by Supabase rather than a custom backend.
- Almost all data access is client-side, relying on Row Level Security for per-user data isolation. The one exception is `/api/share/[token]`, a server route that uses the secret key so a share link's data can be served live without granting public read access to the underlying transactions.
- The balances, summary, people and person-detail screens all read from one shared copy of the transaction history (`all-transactions-provider.tsx`) rather than fetching separately. Anything that writes a transaction must call its `refresh`, or the derived balances will keep showing pre-write numbers.
