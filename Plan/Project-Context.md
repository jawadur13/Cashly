# Cashly — Project Context

This document captures the confirmed product decisions. All plan documents
(`sitemap.md`, `design.md`, `architecture.md`, `database-schema.md`,
`build-roadmap.md`) are derived from this context. If a decision changes,
update this file first and then propagate the change.

## 1. Product Summary

**Cashly** is a personal finance app. Its core job is simple: record income
and expense transactions so a user always knows how much money they have.

- **Core value proposition:** quick, frictionless tracking of income and
  expenses, with a clear balance view.
- **Persona:** one person managing their personal money on phone + desktop.

## 2. Confirmed Decisions

| Area | Decision |
| --- | --- |
| Product type | Personal finance app (income & expense tracking) |
| Platforms | Web + Mobile via a **Progressive Web App (PWA)** |
| UI language | English |
| Tech stack | **Next.js full-stack** (App Router, TypeScript) |
| Backend | **Appwrite Cloud** (appwrite.io, hosted) |
| Database | Appwrite Cloud database (collections) |
| Auth | Appwrite Auth — email/password accounts |
| Users | Multiple accounts (Appwrite Auth), each user sees only their own data |
| Core features | Income & expense tracking (add / edit / delete) tied to **accounts**, categories, search, merchant/payee, dashboard with balance + monthly summary, multi-currency with a user-chosen default currency, responsive PWA |
| Accounts | Users can create / edit / delete **accounts** (e.g. Cash, Bank, bKash, Nagad). Every transaction belongs to exactly one account. Dashboard balances are based on these accounts. |
| Categories | Predefined categories seeded for new users + user-created custom categories |
| Dark mode | Supported from Phase 1; light + dark theme tokens defined from the start, toggle in settings |
| Reports | Two simple monthly values only (Monthly Income, Monthly Expense) — **no charts / full analytics module** |
| Default currency | **BDT** (Bangladeshi Taka) for new users, changeable in settings |
| Visual style | Minimal, modern, intuitive; light + dark themes |
| Design/UX focus | Mobile-first, accessible, fast; smooth "Load More" scrolling on lists |

## 3. In-Scope Features (v1)

1. **Authentication**
   - Register (email + password)
   - Login / Logout
   - Password recovery (forgot password) — part of standard email/password auth
   - Protected routes (must be logged in to use the app)
2. **Accounts**
   - Users can create, edit and delete accounts
   - Default accounts seeded for every new user: **Cash, Bank, bKash, Nagad**
   - Every transaction belongs to exactly one account
   - Dashboard displays balances based on these accounts
   - Transfers between accounts are **NOT** part of v1
3. **Transactions (core)**
   - Create income or expense transaction
   - Edit a transaction
   - Delete a transaction
   - Fields: type, amount, currency, account, category, merchant/payee, note, date
   - Full transaction list with type filter, currency filter and text search
   - Date stored as full ISO DateTime (UI may display date only)
4. **Categories**
   - Predefined categories seeded on first sign-up (split income vs expense)
   - User can add custom categories
5. **Home / Dashboard**
   - Current Balance (based on accounts)
   - Monthly Income
   - Monthly Expense
   - Monthly Savings
   - Recent transactions (last N)
   - Quick actions to add income / expense
6. **Search**
   - Search transactions by note text or category name, in addition to existing
     type / currency filters
7. **Reports (simple)**
   - Two report values only: **Monthly Income** and **Monthly Expense**
   - No charts, no advanced analytics
8. **Multi-currency**
   - User picks a **default currency** in settings (new users start with **BDT**)
   - Every transaction records its own currency (defaults to the user's default)
   - Amounts display with correct symbol/format per currency
   - Cross-currency conversion is **out of scope for v1** (see limitation note below)
9. **Settings**
   - Set default currency
   - Toggle dark / light theme
   - Sign out
10. **PWA**
    - Installable on mobile + desktop
    - App manifest + icons
    - Service worker with offline shell (basic caching)

## 4. Out of Scope (explicitly deferred)

These are intentionally NOT in v1. Do not build them unless the user asks.

- Budgets / spending limits
- Full reports / charts / analytics module (only two monthly values in scope)
- Recurring / scheduled transactions
- Transfers between accounts
- Cross-currency conversion & exchange rates
- Export to CSV/PDF
- Sharing / family mode
- Notifications / reminders
- Import from bank statements

## 5. Known Design Decision / Limitation

**Balance with multi-currency:** Without exchange rates, adding up amounts in
different currencies is not meaningful. For v1:

- Each **account** has its own balance = sum of that account's transactions
  (income − expense), computed per currency.
- The **balance card on Home** shows the total across accounts, but only counts
  transactions in the user's **default currency** (labelled with that currency).
  If an account holds a different currency, its own balance is shown per
  currency within that account.
- Transactions in other currencies still appear in the list, each shown with
  its own symbol.
- A currency filter on the Transactions page lets the user see totals per
  currency.
- This is documented as a deliberate v1 simplification; a future version can
  add exchange rates.

If the user wants a different balance behaviour, this is the file to update.

## 6. Tech Constraints

- Next.js (App Router) + TypeScript.
- Appwrite Cloud SDK (`appwrite` npm package), client-side.
- Appwrite Auth for users; Appwrite Database for collections.
- Tailwind CSS for styling.
- PWA via Serwist (modern maintained alternative to `next-pwa`).
- Currency formatting via built-in `Intl.NumberFormat` (no extra library needed).
- Icons via `lucide-react`.
