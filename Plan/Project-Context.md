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
| Users | Multiple accounts, each user sees only their own data |
| Core features | Income & expense tracking (add / edit / delete), categories, balance + recent transactions on home, multi-currency with a user-chosen default currency, responsive PWA |
| Categories | Predefined categories seeded for new users + user-created custom categories |
| Visual style | Minimal, modern, intuitive; light theme |
| Design/UX focus | Mobile-first, accessible, fast |

## 3. In-Scope Features (v1)

1. **Authentication**
   - Register (email + password)
   - Login / Logout
   - Password recovery (forgot password) — part of standard email/password auth
   - Protected routes (must be logged in to use the app)
2. **Transactions (core)**
   - Create income or expense transaction
   - Edit a transaction
   - Delete a transaction
   - Fields: type, amount, currency, category, note, date
   - Full transaction list with type filter and currency filter
3. **Categories**
   - Predefined categories seeded on first sign-up (split income vs expense)
   - User can add custom categories
4. **Home / Dashboard**
   - Current balance
   - Recent transactions (last N)
   - Quick actions to add income / expense
5. **Multi-currency**
   - User picks a **default currency** in settings
   - Every transaction records its own currency (defaults to the user's default)
   - Amounts display with correct symbol/format per currency
   - Cross-currency conversion is **out of scope for v1** (see limitation note below)
6. **Settings**
   - Set default currency
   - Sign out
7. **PWA**
   - Installable on mobile + desktop
   - App manifest + icons
   - Service worker with offline shell (basic caching)

## 4. Out of Scope (explicitly deferred)

These are intentionally NOT in v1. Do not build them unless the user asks.

- Budgets / spending limits
- Reports, charts, analytics
- Recurring / scheduled transactions
- Multiple accounts / wallets
- Cross-currency conversion & exchange rates
- Export to CSV/PDF
- Sharing / family mode
- Notifications / reminders
- Import from bank statements

## 5. Known Design Decision / Limitation

**Balance with multi-currency:** Without exchange rates, adding up amounts in
different currencies is not meaningful. For v1:

- The **balance card on Home** shows the sum of transactions in the user's
  **default currency only** (labelled with that currency).
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
