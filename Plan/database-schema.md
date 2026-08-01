# Cashly — Database Schema (Appwrite Cloud)

Appwrite Cloud database. Three collections plus Appwrite Auth users and user
prefs. Document IDs: Appwrite auto-generates string IDs.

## 1. Users (Appwrite Auth — built-in, not a collection)

- Managed by Appwrite. Each user gets `$id` (user id).
- **User Prefs** (JSON object on the user, via `account.updatePrefs()`):
  - `defaultCurrency`: `string` (ISO 4217 code, e.g. `"BDT"`). Default `"BDT"`
    on first sign-up.
- Display name captured at registration (Appwrite `name` field).

## 2. Collection: `accounts`

One document per account/wallet the user tracks money in. Owner-only permissions.

### Attributes

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | string | yes | The Appwrite user `$id` that owns the account. |
| `name` | string | yes | Display name, ≤ 40 chars, e.g. "Cash", "Bank", "bKash". |
| `type` | string (enum) | yes | `cash` \| `bank` \| `mobile-wallet`. Used for icon + theming. |
| `currency` | string | yes | ISO 4217 code for this account (defaults to user's `defaultCurrency`). |
| `isDefault` | boolean | yes | `true` for the seeded defaults (Cash, Bank, bKash, Nagad). |

### Default seeds (created for every new user at sign-up)

| Name | type |
| --- | --- |
| Cash | `cash` |
| Bank | `bank` |
| bKash | `mobile-wallet` |
| Nagad | `mobile-wallet` |

### Indexes

| Name | Type | Attributes | Order |
| --- | --- | --- | --- |
| `by_user` | Key | `userId` | Ascending |

### Permissions (applied on create)

- Read / Update / Delete: **only the owning user**.

## 3. Collection: `transactions`

One document per income/expense entry. Owner-only permissions.

### Attributes

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | string | yes | The Appwrite user `$id` that owns the transaction. Always the current user. |
| `accountId` | string | yes | `$id` of the account this transaction belongs to (must be owned by the user). |
| `type` | string (enum) | yes | `income` \| `expense` |
| `amount` | double | yes | Positive number, stored in currency minor logic handled at format time (store plain decimal, e.g. `12.50`). |
| `currency` | string | yes | ISO 4217 code, e.g. `"BDT"`, `"USD"`, `"EUR"`. Defaults to user's `defaultCurrency`. |
| `categoryId` | string | yes | `$id` of a category document (income or expense matching `type`). |
| `payee` | string | no | Optional "Merchant / Payee" — **separate from** `note`, ≤ 200 chars. |
| `note` | string | no | Free-text note, trimmed, ≤ 500 chars. |
| `date` | datetime | yes | Full ISO **DateTime** timestamp (`YYYY-MM-DDTHH:mm:ss.sssZ`). UI may render date only; DB preserves full time. |

System attributes: `$id`, `$createdAt`, `$updatedAt` (used for default ordering).

### Indexes

| Name | Type | Attributes | Order |
| --- | --- | --- | --- |
| `by_user_date` | Key | `userId`, `date` | Descending |
| `by_user_account` | Key | `userId`, `accountId`, `date` | Descending |
| `by_user_currency` | Key | `userId`, `currency` | Ascending |
| `by_user_type` | Key | `userId`, `type` | Ascending |

### Permissions (applied on create)

- Read / Update / Delete: **only the owning user**.
- Create: default (the API user creating it).

### Queries used (Appwrite `Query`)

- List for home/list: `Query.equal('userId', user.$id)` +
  `Query.orderDesc('date')` (+ optional `type`, `currency`, `accountId`
  filters) + `Query.limit(20)` + `Query.offset(...)`.
- **Search:** `Query.search('note', term)` OR category-name search: look up
  categories whose `name` matches, collect their `$id`s, then
  `Query.equal('categoryId', [...ids])`. Combine both result sets client-side.
- **Monthly values:** `Query.greaterThanEqual('date', startOfMonth)` +
  `Query.lessThan('date', startOfNextMonth)` (ISO datetime), summed
  client-side per type.
- Balance: list with `currency` filter equal to default currency, sum
  client-side (per account and overall).

## 4. Collection: `categories`

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

## 5. Currencies (static app config, not a collection)

`src/lib/currency/currencies.ts` — supported set for v1:

```
BDT, USD, EUR, GBP, INR, JPY, CAD, AUD, CHF, BRL, SGD, HKD, CNY
```

Each entry: `{ code, locale }` used by `Intl.NumberFormat` for symbol + format
(e.g. `BDT → en-BD`, `USD → en-US`, `INR → en-IN`). The supported list is a
design decision; expand later by editing one file. **BDT is the default
currency for new users.**

## 6. Integrity Rules (enforced in hook layer, not DB)

- `amount` must be a positive finite number > 0.
- `accountId` must reference an account owned by the current user.
- `categoryId` must reference a category whose `type` matches the transaction
  `type`.
- `currency` must be in the supported currency list.
- `payee` trimmed, ≤ 200 chars; `note` trimmed, ≤ 500 chars.
- `date` is a valid ISO datetime.
- Deleting an **account that still has transactions** is **blocked** (with
  toast). Deleting a **custom category referenced by transactions** is also
  **blocked**. Predefined categories can never be deleted.

## 7. Balance semantics (v1)

- **Per account:** balance = sum of the account's transactions where
  `currency === account.currency`, income − expense.
- **Overall:** balance = sum across the user's accounts for transactions where
  `currency === defaultCurrency`, income − expense.
- **Monthly Income / Monthly Expense:** sum of income / expense transactions
  where `currency === defaultCurrency` AND `date` falls in the current calendar
  month. **Monthly Savings = Monthly Income − Monthly Expense.**
- Per-currency totals computed the same way when filtering on the Transactions
  page. Cross-currency conversion intentionally not applied (see
  `Project-Context.md` §5).
