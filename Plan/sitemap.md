# Cashly — Sitemap & Routing

Next.js App Router. All app pages live behind authentication (protected).
Public pages: auth only.

## Route Map

| Path | Type | Name | Purpose |
| --- | --- | --- | --- |
| `/` | public | Landing / redirect | If logged in → redirect to `/app`. If not → redirect to `/auth/login`. |
| `/auth/login` | public | Login | Email + password sign-in. |
| `/auth/register` | public | Register | Create account. On success → auto sign-in → `/app`. |
| `/auth/forgot-password` | public | Forgot password | Email input → Appwrite sends recovery link. |
| `/app` | protected | Home (Dashboard) | Current balance (based on accounts), monthly income/expense/savings, recent transactions, quick add buttons. |
| `/app/accounts` | protected | Accounts | List accounts with balances; create / edit / delete accounts. |
| `/app/transactions` | protected | Transactions | Full list, filters (type, currency, account) + text search, add/edit/delete. |
| `/app/transactions/new` | protected | New transaction | Form to create a transaction. |
| `/app/transactions/[id]` | protected | Edit transaction | Form to edit/delete an existing transaction. |
| `/app/categories` | protected | Categories | View predefined categories, add custom ones. |
| `/app/settings` | protected | Settings | Set default currency, sign out. |
| `/_not-found` | both | 404 | Friendly not-found page. |

## Page Details

### `/` — Landing / redirect
- Static logic only: check auth session, redirect accordingly.
- No marketing landing page in v1 (keep scope minimal).
- Shows a lightweight "redirecting…" splash if a session check is in flight.

### `/auth/login`
- Form: email, password.
- Submit → Appwrite `account.createEmailPasswordSession`.
- Error handling: invalid credentials, unverified email (see note).
- Links: "Don't have an account? Register", "Forgot password?".
- On success → `/app`.

### `/auth/register`
- Form: name (display name), email, password, confirm password.
- Submit → Appwrite `account.create`, then create session, then **seed data**:
  default prefs (`defaultCurrency: "BDT"`), default accounts (Cash, Bank,
  bKash, Nagad).
- Client + server validation (email format, password ≥ 8 chars).
- On success → `/app`.

### `/auth/forgot-password`
- Form: email.
- Submit → Appwrite `account.createRecovery`.
- Success state: "Check your inbox" (no reset UI in v1).

### `/app` — Home (Dashboard)
Mobile-first layout.
- **Balance card:** current balance across accounts (default currency).
- **Account balances:** per-account balances (based on the user's accounts).
- **Monthly summary:** Monthly Income, Monthly Expense, Monthly Savings
  (default currency, current month).
- **Quick actions:** "+ Income" and "+ Expense" buttons → open new-transaction
  flow pre-filled with type.
- **Recent transactions:** last ~10, tap to edit.
- **Link:** "See all transactions" → `/app/transactions`.

### `/app/accounts`
- List of the user's accounts, each showing name, type icon, balance.
- **Add account:** bottom sheet with name + type (cash / bank / mobile-wallet)
  + currency (defaults to user default).
- **Edit / delete** account (delete blocked with message if the account has
  transactions).
- Default accounts (Cash, Bank, bKash, Nagad) appear here after sign-up.

### `/app/transactions`
- Full list, newest first, with **Load More** button (infinite scroll) — no
  page-number pagination.
- **Filters:** type (all / income / expense), currency (all / specific),
  account (all / specific).
- **Search:** text input matching note text or category name, combined with the
  filters above.
- **Summary line:** total of the visible list per selected currency.
- Each row: category icon + name, payee, note, date, amount (+/- colour,
  currency symbol).
- **FAB (+):** quick add → `/app/transactions/new`.
- Empty state with CTA when no transactions match.

### `/app/transactions/new`
- Form fields:
  - Type segmented control: Income / Expense (default: Expense).
  - Account (dropdown/chips of the user's accounts; defaults to first account).
  - Amount (numeric, positive).
  - Currency (defaults to the selected account's currency, else user default).
  - Category (chip grid filtered by selected type).
  - Merchant / Payee (optional, separate from note).
  - Date (defaults to today; stored as full DateTime).
  - Note (optional, free text).
- Save → create document → redirect to `/app/transactions`.
- Cancel → back.

### `/app/transactions/[id]`
- Same form as new, pre-filled with existing values.
- Delete button (with confirm dialog).
- Save → update document → redirect to `/app/transactions`.

### `/app/categories`
- Section: **Income categories** (chips with icons).
- Section: **Expense categories** (chips with icons).
- "Add custom category" — inline form: name + type (+ icon picker).
- Custom categories show a delete affordance (small x). Predefined cannot be deleted.
- Deleting a custom category that is in use: block delete and show message, or
  reassign — decision: **block with message** (keep simple, safe).

### `/app/settings`
- **Default currency:** select from supported currencies.
- **Theme:** dark / light toggle (default follows system).
- **Account info:** display name + email (read-only in v1).
- **Sign out** button.
- App version footer.

### 404 — `/_not-found`
- Minimal page: "Page not found" + link back to `/app`.

## Layout & Navigation (app shell)

The protected area (`/app/**`) uses a shared layout:

- **Mobile (default):**
  - Top app bar: page title, avatar/menu on right.
  - Bottom navigation (5 tabs): Home, Transactions, Accounts, Categories, Settings.
  - FAB for quick add on Home and Transactions.
- **Desktop (≥ 768px):**
  - Left sidebar navigation with the same 5 items.
  - Top bar with page title + settings menu.
  - Content area with max-width container.

## Redirect Rules (middleware)

Implement with App Router `middleware.ts` (or a root layout guard):

| Current session | Visiting | Result |
| --- | --- | --- |
| Logged in | `/auth/*` | → `/app` |
| Logged in | `/app/*` | allow |
| Logged out | `/app/*` | → `/auth/login` |
| Logged out | `/auth/*` | allow |

Auth state is checked client-side via the Appwrite SDK (sessions are managed by
Appwrite with its own cookies); the middleware approach keeps server-rendered
pages safe. Final auth-gating strategy is described in `architecture.md`.
