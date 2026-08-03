# Plan: Fix transaction date/time defaults and add time picker

## Problem
- New transactions default to `T12:00:00` (noon UTC) regardless of when they were added.
- Default date uses `.toISOString().slice(0,10)` which can be the previous day for users ahead of UTC (e.g., UTC+6 at 1 AM local = previous day UTC).
- No way to set/edit the transaction time — only a date picker exists.
- User wants: exact current time as default, editable time field, and local date default — **without location permissions**.

## Approach
Use the device's local `Date` object methods (`getFullYear`, `getMonth`, `getDate`, `getHours`, `getMinutes`) to derive defaults. This uses the phone's configured timezone and requires **zero permissions**.

## Changes

### 1. `src/components/transactions/transaction-form.tsx`
- Add `time` state (`HH:MM` string).
- Default `date` from local `new Date()` (not `.toISOString()`).
- Default `time` from current local hours/minutes.
- Add `<input type="time">` in the form UI (next to the date picker).
- On submit: combine as `new Date(date + 'T' + time).toISOString()` (browser converts local time to UTC ISO automatically).
- When editing: extract local date and time from `initial.date` via `new Date(initial.date).getFullYear()`, `.getMonth()`, `.getDate()`, `.getHours()`, `.getMinutes()`.
- Add `time` to `TransactionFormValues` and `TransactionFormProps.onSubmit` signature.

### 2. No other files need changes
- `transaction-row.tsx` already uses `formatDateTime(transaction.date)` — will display the stored time correctly.
- `format.ts` `formatDateTime` uses `toLocaleTimeString` — works with any stored ISO time.
- Appwrite `datetime` attribute and queries are timezone-agnostic (store and compare ISO strings).

## Edge cases / considerations
- Existing transactions stored at `T12:00:00Z` will display as 12:00 PM local time. This is acceptable; they will show the correct time once edited.
- `new Date('YYYY-MM-DDTHH:MM')` is parsed as local time by the browser, so `toISOString()` correctly converts it to UTC for storage. No timezone math needed.
- No database migration required — the `date` column is already `datetime`.

## Validation
- Create a transaction → verify it stores current local date + time.
- Edit a transaction → verify date and time pickers show the transaction's local date and time.
- Check list/display → verify formatted date/time matches entered value in local timezone.
- Verify filters/sorting still work (all comparisons use UTC millis internally).
