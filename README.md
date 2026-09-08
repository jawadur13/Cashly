# Cashly

Cashly is a personal finance web app built with Next.js and Appwrite. It helps users manage accounts, categories, and transactions with a simple mobile-friendly experience, including authentication, balances, summaries, and transaction history.

🔗 **Live app:** [https://cashly.mvp.bd/](https://cashly.mvp.bd/)

## Overview

### What the app includes
- User authentication with Appwrite Auth (register, login, password reset)
- Multiple accounts per user (cash, bank, mobile wallet), each with its own currency, plus balance tracking
- Categories for income and expenses with a large built-in icon set
- Five transaction types: income, expense, **transfer** (between two same-currency accounts, tracking any fee or gain), and give/take (money lent to or borrowed from a person)
- People tracking: see who owes you and who you owe, backed by a shared `signedCashDelta` convention so the People page and Summary page always agree
- Public share links per person — always show that person's *live* balance and history (server-rendered via an admin-authenticated API route), not a frozen snapshot from when the link was created
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
- Appwrite Cloud for auth and database
- `appwrite` (browser SDK) for all client-side data access; `node-appwrite` (admin SDK) for the maintenance scripts and the share-link API route
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

- `src/app`: route pages, app layout, and the `/api/share/[token]` route handler (server-side, admin-authenticated)
- `src/components`: reusable UI and feature components
- `src/hooks`: data hooks for accounts, transactions, categories, people, and summary views
- `src/lib`: app constants, utility helpers, Appwrite client/config, currency formatting, and the pure calculation modules —
  - `calculations.ts` — period aggregation, balances, breakdowns, trends
  - `money.ts` — minor-unit parsing, formatting and storage-compatibility reads
  - `chart.ts` — cash-flow bar geometry
- `src/providers`: auth, theme, settings, exchange rates, toast, the shared transaction cache (`all-transactions-provider.tsx`), and app providers
- `scripts`: database setup and maintenance helpers

The money logic lives in `src/lib` as pure functions rather than inside the hooks, so it can be tested without rendering the app. Keep it that way — that separation is what the test suite depends on.

## Prerequisites

Before running the project locally, make sure you have:
- Node.js 20+ recommended
- npm
- An Appwrite Cloud project

## Environment variables

Create a local environment file named `.env.local` in the project root with the following values:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://<your-appwrite-endpoint>/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_APPWRITE_DATABASE_ID=<your-database-id>
APPWRITE_API_KEY=<your-server-side-appwrite-api-key>
APPWRITE_DATABASE_ID=<your-database-id>
```

### Notes
- `NEXT_PUBLIC_*` values are used by the browser app.
- `APPWRITE_API_KEY` and `APPWRITE_DATABASE_ID` are used by the maintenance scripts **and** at runtime by the `/api/share/[token]` route, which uses the admin SDK to serve live share-link data without exposing the transactions collection to public read access. Deployments (e.g. Vercel) must set these as real environment variables, not just locally.
- `npm run build` needs these present: the Appwrite clients are constructed as their modules load, which happens while Next collects page data.
- Never commit your real secrets. The repository already ignores `.env.local`, `.env.vercel` and `backup-*.json`.

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

## Appwrite setup

1. Create a project in Appwrite Cloud.
2. Enable email/password authentication.
3. Create a database and note the database ID.
4. Create collections named:
   - accounts
   - transactions
   - categories
   - people
   - shares
5. Add the required environment variables above.

### Database setup

Creates the collections, attributes, indexes, and seed categories. Idempotent — safe to re-run, and it skips anything that already exists.

```bash
node scripts/setup-db.mjs
```

**Run this before deploying a change that adds an attribute**, or writes using the new field will fail against the old schema.

### Maintenance scripts

Every script reports by default and writes only with `--apply`.

| Script | What it does |
|---|---|
| `node scripts/audit-data.mjs` | Reports currency mismatches, transactions pointing at deleted accounts, unsupported currencies, and cross-currency transfers. With `--apply`, aligns a transaction's currency with its account — the only repair it makes, and never an amount |
| `node scripts/migrate-to-minor-units.mjs` | Backfills `amountMinor` from the legacy float columns. Idempotent, never modifies the floats, and refuses to overwrite a row whose integer disagrees with its float |
| `node scripts/cleanup-orphaned-data.mjs` | Removes rows left behind by deleted users and throwaway sign-ups. **The only script that deletes** — it protects a hard-coded allowlist, keeps any user whose account still exists, and needs `--apply` |
| `node scripts/smoke-test.cjs` | Verifies Appwrite connectivity and a basic CRUD flow |

Take a backup before running anything with `--apply`.

## Build and lint

```bash
npm run build
npm run lint
```

## Deployment on Vercel

To deploy this app to Vercel:

1. Push the repository to GitHub.
2. Create a new Vercel project and import the repository.
3. Add the same environment variables in Vercel Project Settings > Environment Variables.
4. Deploy the project.

### Vercel env file

A ready-to-use env file is included at `.env.vercel` for reference and upload. It is gitignored by default.

### If login shows "Failed to fetch" on Vercel

Cashly uses the Appwrite browser SDK directly from the client. If the app works on localhost but fails on your deployed Vercel URL, the most common cause is that the Vercel domain has not been added to the Appwrite project as an allowed Web platform.

Check these items in Appwrite Cloud:

1. Add your production domain, such as `cashly-rust.vercel.app`, under Platforms > Web.
2. If you use preview deployments, add those domains too or use the appropriate wildcard setup supported by Appwrite.
3. Make sure the deployed Vercel project has the same `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, and `NEXT_PUBLIC_APPWRITE_DATABASE_ID` values as your local environment.
4. Re-deploy after updating environment variables.

If those settings are correct, open the browser console and network tab to look for a CORS error or an Appwrite request that is being blocked.

## Useful commands

```bash
npm run dev
npm test
npm run build
npm run lint
node scripts/setup-db.mjs
node scripts/audit-data.mjs
node scripts/migrate-to-minor-units.mjs
node scripts/smoke-test.cjs
```

## Documentation

| Document | What it covers |
|---|---|
| [CALCULATION-AUDIT.md](CALCULATION-AUDIT.md) | Audit of every money calculation, the 17 issues found, the decisions taken on each, and what was implemented. Start here before changing anything that handles an amount |
| [NEW-INSIGHTS-REPORT.md](NEW-INSIGHTS-REPORT.md) | Research (Aug 2026) into insights derivable from the existing schema |
| [UI-UX-AUDIT.md](UI-UX-AUDIT.md) | UI/UX audit findings (Aug 2026) |
| [UI-FIX-SUMMARY.md](UI-FIX-SUMMARY.md) | The fixes made in response to that audit (Aug 2026) |

The three August documents are point-in-time records and are not kept up to date.

## Notes

- The app is designed as a mobile-first finance experience.
- Authentication and data storage are handled by Appwrite rather than a custom backend.
- Almost all data access is client-side, relying on the Appwrite permission model for per-user data isolation. The one exception is `/api/share/[token]`, a server route that uses the admin SDK so a share link's data can be served live without granting public read access to the underlying transactions.
- The balances, summary, people and person-detail screens all read from one shared copy of the transaction history (`all-transactions-provider.tsx`) rather than fetching separately. Anything that writes a transaction must call its `refresh`, or the derived balances will keep showing pre-write numbers.
