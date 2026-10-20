# Appwrite → Supabase migration — design

Date: 2026-10-20 · Branch: `supabase-migration`

Move Cashly's auth and data from Appwrite to Supabase without losing anything.
Appwrite is live production data (8 users, 64 accounts, 465 transactions, 10
people, 2 shares, 28 categories at the time of writing).

## Non-negotiables

1. **Appwrite is read-only to us.** Migration code reaches it only through
   `scripts/lib/appwrite-readonly.mjs`, which exposes list/count functions and
   nothing else. Appwrite stays intact after cutover as the fallback.
2. **Backup first.** `scripts/backup-appwrite.mjs` writes a verbatim snapshot
   (users with password hashes, every document with every `$` field) plus a
   sha256 to `../Cashly-backups/`, outside the repo.
3. **Every byte is kept somewhere in Supabase too.** Each source document and
   user is stored verbatim as JSON in the private `migration` schema, alongside
   the typed tables the app uses. This also holds the rows whose Appwrite user
   no longer exists (see Orphans).
4. **Verify before switching.** Counts, every field of every row, and per-user
   balances computed with `src/lib/calculations.ts` must match between the
   snapshot and Supabase, or the copy fails.
5. **The copy is rehearsable.** Until cutover, a run resets the typed tables and
   copies again from a fresh snapshot. A `migration.state` marker set at cutover
   makes the reset refuse to run afterwards.

## Auth

All 8 Appwrite users have argon2id hashes (`m=65536,t=4,p=3`). Supabase accepts
these via `auth.admin.createUser({ password_hash })` — verified on 2026-10-20
by importing a known-password hash, signing in with it, and rejecting a wrong
password. Users keep their passwords. Appwrite never verified emails, so
imported users are created with `email_confirm: true`, and **Confirm email is
switched off** in Supabase so new sign-ups behave as they do today.

Supabase user ids are new UUIDs; `profiles.appwrite_user_id` and
`migration.source_users` record the mapping.

Password reset moves from Appwrite recovery (`userId` + `secret`) to Supabase
`resetPasswordForEmail` → `/auth/reset-password` → `updateUser({ password })`.
Supabase's built-in mailer only reaches project team members, so **custom SMTP
is a cutover prerequisite**.

## Schema (public)

Document ids are kept as `text` primary keys, so existing share links, URLs and
references survive unchanged. New rows get `gen_random_uuid()::text`. Every
table has `created_at` / `updated_at` carried over from `$createdAt` /
`$updatedAt`.

| Table | Notes |
|---|---|
| `profiles` | `id` = auth user. `name`, `default_currency` (was Appwrite prefs), `appwrite_user_id`. Created by a trigger on `auth.users` insert. |
| `accounts` | `currency` cannot change once set (trigger) — money rule. |
| `transactions` | Both `amount` (float, legacy) and `amount_minor` (bigint) columns kept and both written, per AGENTS.md. `account_id`, `from_account_id`, `to_account_id` → `accounts` **on delete restrict**: the database itself now refuses to orphan a transaction. `person_id` → `people` restrict. `category_id` has no FK: deleting a category leaves references, as it does today, and `''` is kept verbatim for give/take/exchange. |
| `people` | `share_token` unique, null when not shared (the app wrote `''` on Appwrite; it writes null now). |
| `shares` | `person_id` → `people` restrict. |
| `categories` | Predefined rows have `owner_id` null (Appwrite stored `''`). |

All `user_id` / `owner_id` columns reference `auth.users` **on delete
restrict** — deleting a login can never silently delete money data.

Row Level Security on every table: a user reads and writes only rows where
`user_id = auth.uid()`; categories are readable when predefined or owned.
Tables are granted to `authenticated` and `service_role` only — nothing to
`anon` (the project was created with automatic exposure off). The public share
page keeps reading through a server route with the secret key, as it does with
the Appwrite admin key today.

## Orphans

28 accounts and 8 transactions belong to 7 Appwrite user ids that no longer
exist (test sign-ups deleted on 2026-08-01, rows left behind). Nobody can log
in as them and the app never shows them. They go into
`migration.source_documents` verbatim — preserved, queryable, not in the typed
tables (which require a real owner).

## App changes

The app keeps its domain shapes (`$id`, `$createdAt`, camelCase fields), so
components do not change. Only the data layer is swapped:

- `src/lib/appwrite/*` → `src/lib/supabase/*` with the same exported function
  names; rows are mapped snake_case ↔ camelCase at the boundary.
- `auth-provider`, `settings-provider`, settings page (name), reset-password
  page → Supabase auth + `profiles`.
- `/api/share/[token]` → Supabase with the secret key.
- Types drop `Models.Document` for a local `{ $id, $createdAt, $updatedAt }`.
- `deleteUserData` deletes in FK order (transactions, shares, people, accounts,
  categories).

## Cutover

Users are told in advance; no maintenance screen. Sequence: fresh backup →
reset + copy + verify → set the cutover marker → deploy the Supabase build with
new env vars → smoke-test login and balances with a real account. The final
copy re-counts Appwrite at the end and fails if anything changed during it.

Rollback: redeploy the previous (Appwrite) build. Appwrite was never written to,
so it is exactly as it was at cutover; anything written to Supabase after
cutover would need copying back by hand, so roll back early or not at all.

## Prerequisites the owner does in the dashboard

- Supabase: Auth → Providers → Email → **Confirm email off**.
- Supabase: Auth → URL Configuration → Site URL + redirect URL for the
  production domain and `http://localhost:3000`.
- Supabase: custom SMTP (Auth → Emails → SMTP settings).
- Supabase: upgrade to Pro (daily backups) before cutover.
- Hosting: add the Supabase env vars to the production environment.
