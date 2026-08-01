# Cashly — Database Schema (Appwrite Cloud)

Appwrite Cloud database. Two collections plus Appwrite Auth users and user
prefs. Document IDs: Appwrite auto-generates string IDs.

## 1. Users (Appwrite Auth — built-in, not a collection)

- Managed by Appwrite. Each user gets `$id` (user id).
- **User Prefs** (JSON object on the user, via `account.updatePrefs()`):
  - `defaultCurrency`: `string` (ISO 4217 code, e.g. `"USD"`). Default `"USD"`
    on first sign-up.
- Display name captured at registration (Appwrite `name` field).

## 2. Collection: `transactions`

One document per income/expense entry. Owner-only permissions.

### Attributes

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | string | yes | The Appwrite user `$id` that owns the transaction. Always the current user. |
| `type` | string (enum) | yes | `income` \| `expense` |
| `amount` | double | yes | Positive number, stored in currency minor logic handled at format time (store plain decimal, e.g. `12.50`). |
| `currency` | string | yes | ISO 4217 code, e.g. `"USD"`, `"EUR"`. Defaults to user's `defaultCurrency`. |
| `categoryId` | string | yes | `$id` of a category document (income or expense matching `type`). |
| `note` | string | no | Free-text note, trimmed, ≤ 500 chars. |
| `date` | string | yes | ISO date `YYYY-MM-DD`. Stored as string for simplicity + sortable. |

System attributes: `$id`, `$createdAt`, `$updatedAt` (used for default ordering).

### Indexes

| Name | Type | Attributes | Order |
| --- | --- | --- | --- |
| `by_user_date` | Key | `userId`, `date` | Descending |
| `by_user_currency` | Key | `userId`, `currency` | Ascending |
| `by_user_type` | Key | `userId`, `type` | Ascending |

### Permissions (applied on create)

- Read / Update / Delete: **only the owning user**.
- Create: default (the API user creating it).

### Queries used (Appwrite `Query`)

- List for home/list: `Query.equal('userId', user.$id)` +
  `Query.orderDesc('date')` (+ optional `type`, `currency` filters) +
  `Query.limit(20)` + `Query.offset(...)` for pagination.
- Balance: list with `currency` filter equal to default currency, sum client-side.

## 3. Collection: `categories`

Predefined (seeded once, shared read-only) + custom (owner-owned).

### Attributes

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string (enum) | yes | `income` \| `expense` |
| `name` | string | yes | Display name, ≤ 40 chars |
| `icon` | string | yes | Key into the icon map, e.g. `"utensils"`, `"shopping-bag"` |
| `color` | string | no | Optional hex accent for the icon/tint (falls back to income/expense colour). |
| `isCustom` | boolean | yes | `true` = user-created, `false` = predefined |
| `ownerId` | string | no | User `$id` for custom categories; **empty/`null` for predefined** |

### Indexes

| Name | Type | Attributes |
| --- | --- | --- |
| `by_type` | Key | `type` |
| `by_owner` | Key | `ownerId` |

### Permissions

- **Predefined** (`ownerId` empty): Read = all logged-in users (`read("any")`
  or `read("users")`); Update/Delete = none. Created once via console or a
  setup script — never created from the client.
- **Custom** (`ownerId` set): Read/Update/Delete = owning user only.

### Seed data (predefined)

**Expense:** `food` (Utensils), `shopping` (ShoppingBag), `transport`
(Car), `housing` (Home), `bills` (Receipt), `health` (HeartPulse),
`education` (GraduationCap), `entertainment` (Clapperboard),
`travel` (Plane), `phone` (Smartphone), `other` (MoreHorizontal).

**Income:** `salary` (Briefcase), `freelance` (Laptop), `investments`
(TrendingUp), `gift` (Gift), `other` (MoreHorizontal).

## 4. Currencies (static app config, not a collection)

`src/lib/currency/currencies.ts` — supported set for v1:

```
USD, EUR, GBP, INR, JPY, CAD, AUD, CHF, BRL, SGD, HKD, CNY
```

Each entry: `{ code, locale }` used by `Intl.NumberFormat` for symbol + format
(e.g. `USD → en-US`, `INR → en-IN`). The supported list is a design decision;
expand later by editing one file.

## 5. Integrity Rules (enforced in hook layer, not DB)

- `amount` must be a positive finite number > 0.
- `categoryId` must reference a category whose `type` matches the transaction
  `type`.
- `currency` must be in the supported currency list.
- `note` trimmed, ≤ 500 chars.
- Custom category delete is **blocked** (with toast) if it is referenced by any
  transaction of the user. Predefined categories can never be deleted.

## 6. Balance semantics (v1)

- Home balance = sum of `amount` for the user's transactions where
  `currency === defaultCurrency`, minus/plus by type: `income − expense`.
- Per-currency totals computed the same way when filtering on the Transactions
  page. Cross-currency conversion intentionally not applied (see
  `Project-Context.md` §5).
