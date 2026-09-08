# Cashly — Calculation Logic Audit

**Date:** 8 September 2026
**Scope:** Every place in the app where money is added, subtracted, converted, averaged or compared
**Status:** Investigation only — **no code has been changed**

---

## How to read this document

Each issue is written in three parts:

- **Ki hocche** — what the app does right now, in plain language
- **Example** — real numbers showing the wrong result
- **Keno hocche** — the underlying reason
- **Amar comment** — an empty box for you to write your decision

I have **not** run the live app against your real Appwrite data. What I did instead: I copied the exact calculation code out of the app into standalone test scripts and ran them with made-up transactions where I already knew the correct answer. Every number in this report came out of those scripts — none of it is guesswork. Anything I could *not* prove that way is clearly marked as **unverified**.

---

## TL;DR — The short version

**Good news first:** the *core* money logic is correct. Income adds, expense subtracts, give/take work in the right direction, and currency conversion maths is right way round. When everything is used normally, the Home page balance and the Summary page closing balance **match to the paisa**. I verified this. The foundation is solid.

**The problems are all around the edges** — comparisons between months, what happens when you delete or edit something, and how numbers are labelled and coloured on screen.

I found **17 issues**. Grouped:

| Group | Count | What it means for you |
|---|---|---|
| 🔴 Numbers are actually wrong | 6 | The app shows a figure that is not true |
| 🟠 Numbers are right but misleading | 7 | The figure is correct, the label/colour lies |
| 🟡 Structural risk | 4 | Nothing broken today, but fragile |

**The single most important one:** issue #1 — your month-to-month comparison is comparing against the wrong date range, so the "you spent X% more/less" badge is wrong almost every month.

---

# 🔴 GROUP 1 — Numbers that are actually wrong

---

## Issue #1 — Month comparison uses the wrong date window ⚠️ HIGHEST PRIORITY

**File:** [summary/page.tsx:76-77](src/app/app/summary/page.tsx#L76-L77)

### Ki hocche

When you look at September and the app tells you *"Expense: 20% down"*, it is **not** comparing September against August. It is comparing September against **August 1st to August 30th** — silently dropping the 31st of August.

The app calculates the previous period by taking the current period and subtracting "the number of days in the previous month". That works for the *start* date but breaks the *end* date, because the two months have different lengths.

### Example (verified by running the code)

Say you paid **25,000 tk rent on 31 August**.

```
True August window   [Aug 01 .. Sep 01):  expense = 40,000 tk
App's "previous"     [Aug 01 .. Aug 31):  expense = 15,000 tk   ← rent is MISSING

Expense trend app shows:  -20%
Actual correct value:     -70%
```

The rent simply vanishes from the comparison. The badge is off by 50 percentage points.

It goes wrong in the other direction too. For **October**, the "previous period" becomes *Sep 1 → Oct 2* — which pulls **1st and 2nd of October (days from the current month)** into the previous month's total. Double counting.

I tested six different months. **Every single one was wrong:**

| Month you select | Drift on the end date |
|---|---|
| March 2026 | 3 days too many |
| May 2026 | 1 day too many |
| July 2026 | 1 day too many |
| September 2026 | 1 day missing |
| October 2026 | 1 day too many |
| December 2026 | 1 day too many |

Months at the start/end of a month are the ones that get lost — and that is exactly where **rent, salary and bills** usually sit. So this hits the biggest transactions most often.

### Keno hocche

The code does date maths by subtracting a fixed number of milliseconds. Calendar months are not a fixed number of milliseconds. The start date happens to land correctly; the end date does not.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================

fix kore felo, jevabe perfect hoy


============================================================ -->

---

## Issue #2 — Rising expenses are shown in GREEN

**File:** [summary/page.tsx:233-243](src/app/app/summary/page.tsx#L233-L243)

### Ki hocche

The three trend badges (Income / Expense / Savings) all use **one shared rule**: if the number went *up*, paint it green with an up-arrow. If it went *down*, paint it red with a down-arrow.

For **Income** that is correct — more income is good.
For **Expense** it is **exactly backwards** — spending more is bad, but it shows green.

### Example (verified)

```
Expenses 10,000 → 20,000 (spending DOUBLED)   → badge = GREEN ↗  100%
Expenses 20,000 → 10,000 (spending HALVED)    → badge = RED  ↘   50%
```

So the month you overspend, the app congratulates you in green. The month you save well, it warns you in red.

### Keno hocche

One colour rule written once and reused for all three badges, without accounting for the fact that "up is good" for income but "up is bad" for expense.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


fix kore felo

============================================================ -->

---

## Issue #3 — Savings trend flips sign when last month was a loss

**File:** [use-summary.ts:216](src/hooks/use-summary.ts#L216)

### Ki hocche

If last month you **lost** money (spent more than you earned), the savings-trend percentage comes out backwards. Improvement shows as decline, and decline shows as improvement.

### Example (verified)

```
Last month -1,000  →  This month -200   (you improved a LOT)
   shows: -80%, RED, down-arrow          ← looks like you got worse

Last month   -200  →  This month -1,000 (you got much worse)
   shows: +400%, GREEN, up-arrow         ← looks like a huge win

Last month   -500  →  This month  +500  (loss turned into profit!)
   shows: -200%, RED, down-arrow         ← looks like a disaster
```

### Keno hocche

The percentage-change formula divides by last month's figure. When that figure is negative, dividing by it flips the sign of the whole answer. The formula is only valid when the baseline is positive.

This one only bites in bad months — which is unfortunately when you most need the number to be honest.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


etaw thik koro

============================================================ -->

---

## Issue #4 — Deleting an account makes Home and Summary disagree

**Files:** [use-account-balances.ts:59-66](src/hooks/use-account-balances.ts#L59-L66) vs [use-summary.ts:251](src/hooks/use-summary.ts#L251)

### Ki hocche

The delete dialog honestly warns you: *"This does not delete its transactions."* True. But afterwards the two pages count those orphaned transactions **differently**:

- **Home page "Current balance"** — walks through your accounts list and adds up each one. The deleted account is not in the list, so its money silently disappears.
- **Summary page "Closing balance"** — walks through your *transactions*. It doesn't care about accounts, so all that money is still counted.

Same app, same data, two different totals. Neither page mentions the other exists.

### Example (verified)

Setup: a "Payoneer" USD account holding a 500 USD freelance payment.

```
BEFORE deleting the account:
   Home "Current balance":       126,605 tk
   Summary "Closing balance":    126,605 tk    ✓ perfect match

AFTER deleting the Payoneer account (transactions kept):
   Home "Current balance":        64,980 tk    ← dropped by 61,625
   Summary "Closing balance":    126,605 tk    ← unchanged

   MISMATCH: 61,625 tk
```

The money is still in your transaction history and still in your Summary. It is just invisible on the Home screen. Nothing warns you.

### Keno hocche

Two independent implementations of "what is my total balance", written in different files, that were never reconciled. One is account-driven, the other is transaction-driven.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================

account delete korle transaction o delete hoya jabe, ar total balance soho sob oivabe dekhabe j oi account kokhono exist e korto na dhore nibe, evabe sob calculation hobe... but account delete korar somoy use k proper warning dibe j ki hote jacche


============================================================ -->

---

## Issue #5 — Changing an account's currency silently rewrites history

**File:** [account-form.tsx:99](src/components/accounts/account-form.tsx#L99) → [use-account-balances.ts:59](src/hooks/use-account-balances.ts#L59)

### Ki hocche

You can edit any account and change its currency from a dropdown. Nothing stops you and nothing warns you.

The problem: the app stores account balances as **plain numbers with no currency attached**. The currency lives on the *account*, not on the balance. So changing the account's currency re-interprets every historical transaction in that account as if it had always been in the new currency.

### Example (verified)

```
Payoneer account holds 500 (meaning 500 USD)
Home total: 126,605 tk

You change the account currency USD → BDT.
The 500 is now read as 500 BDT.

Home total: 65,480 tk

61,125 tk gone. No transaction was created. No warning shown.
```

Conversely, switching a BDT account to USD would **multiply your balance by ~123**.

### Keno hocche

There is no conversion step when currency changes, and no check for whether the account already has transactions in it. The dropdown is fully editable at all times.

> **Note:** This is arguably worse than a wrong number — it is a way to silently corrupt data with one tap.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


account er currency change korar system bad dile kemom hoy? amar mote eta dorkar nei, karon account er currency normaly change hoy na.. also account create korar somoy dekhabe j currency future a change kora jabe na

============================================================ -->

---

## Issue #6 — Currency picker is dead on new transactions, live on edit

**File:** [transaction-form.tsx:109](src/components/transactions/transaction-form.tsx#L109)

### Ki hocche

Two related problems from one line of code.

**(a) On a NEW transaction, the currency dropdown does nothing.**
You can open it and pick USD. It will snap straight back to your account's currency, and the transaction saves in the account's currency regardless. Your choice is silently thrown away.

**(b) On EDIT, the same dropdown suddenly *does* work.**
So you can open an existing transaction sitting in a BDT account and change it to USD. The app allows it.

That combination creates a transaction whose currency doesn't match its account — and **the Home page cannot handle that**. It adds up raw numbers inside an account assuming they're all in the account's currency, then converts once at the end.

### Example (verified)

Take that same 500 USD income sitting in the USD account, and edit its currency to BDT:

```
Home page reads it as:      500 USD  →  61,625 tk
Summary page reads it as:   500 BDT  →       500 tk

Difference: 61,125 tk of phantom money
```

The same transaction is worth two wildly different amounts depending on which screen you're looking at.

### Keno hocche

The form decides which currency to display with a rule that behaves differently for new vs. existing transactions. For new ones it ignores the dropdown entirely; for edits it trusts it completely.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================

transaction a currency picker dorkar nei.. shudhu shudhu user ke confuse korbe na.. but currency dekhabe j oi account a ki currency ache 


============================================================ -->

---

# 🟠 GROUP 2 — Right number, misleading presentation

---

## Issue #7 — Your past months change by themselves

**File:** [exchange-rates-provider.tsx](src/providers/exchange-rates-provider.tsx)

### Ki hocche

The app fetches live exchange rates every hour and applies them to **every transaction ever recorded** — including ones from years ago.

So a 100 USD expense from January 2025 is converted at **today's** rate, not January 2025's rate.

### What this means

If you open the app tomorrow and the dollar has moved, **last January's total will be a different number than it was today.** Your history is not stable. You cannot screenshot a month and expect it to still say that next week.

For a personal expense tracker this may be acceptable. For anything you'd show an accountant, it is not — a recorded transaction should keep the value it had on the day it happened.

**The conversion maths itself is correct** — I verified 100 USD → 12,325 tk and back again, and the API rate inversion (`1 ÷ rate`) is the right way round. The issue is purely *which* rate gets used.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================

eta evabei thak. eta intentional chilo


============================================================ -->

---

## Issue #8 — "0% saved" in a month where you only spent

**File:** [use-summary.ts:250](src/hooks/use-summary.ts#L250)

### Ki hocche

Savings rate is *savings ÷ income*. When income is zero, dividing is impossible, so the code falls back to **0**.

### Example (verified)

```
Income:  0
Expense: 30,000
Savings: -30,000

Badge shows:  "0% saved"
```

A month where you burned 30,000 tk of savings and earned nothing reads as a flat, neutral **0%**. It should say something like "no income" or "-∞".

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


correct it

============================================================ -->

---

## Issue #9 — "Owes you −৳5,000"

**Files:** [people/page.tsx:96-102](src/app/app/people/page.tsx#L96-L102), [people/[id]/page.tsx](src/app/app/people/[id]/page.tsx)

### Ki hocche

The People list shows the label and the amount **with its raw sign**, so they contradict each other.

### Example (verified)

```
You gave Rahim 5,000 tk
   Label shown:   "Owes you"
   Amount shown:  -৳5,000     ← minus sign, next to "owes you"

You took 2,000 tk from Karim
   Label shown:   "You owe"
   Amount shown:  ৳2,000
```

"Owes you −৳5,000" reads like Rahim owes you *negative* money. The label already tells you the direction; the number should be shown as a plain positive amount.

Interestingly, the **public share page gets this right** — it shows `Math.abs(balance)` with a clean label. The in-app screen is the inconsistent one.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================

keep it as it is


============================================================ -->

---

## Issue #10 — "People net" shows a plus sign in red

**File:** [summary/page.tsx:169](src/app/app/summary/page.tsx#L169)

### Ki hocche

The "People net" tile adds a **+** in front when the number is positive — but colours it **red**, because a positive value here means *you took more than you gave*, i.e. you owe people money.

So you get a green-looking `+৳3,000` painted red. The plus sign and the colour are telling you opposite things.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


keep as it is

============================================================ -->

---

## Issue #11 — Unknown currency is silently treated as 1:1

**File:** [currencies.ts:76-79](src/lib/currency/currencies.ts#L76-L79)

### Ki hocche

If the app ever meets a currency code it has no rate for, the conversion function gives up and **returns the number unchanged** — silently treating it as if it were already in your default currency.

### Example (verified)

```
convertCurrency(100, 'XYZ', 'BDT')  →  100
```

100 of an unknown currency becomes 100 taka. No error, no warning, no log.

This is unlikely to fire today (the app only offers 13 currencies), but it is a silent-failure path in money code — the kind of thing that hides a bug for months.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================

remove unnecessary currencies, keep bdt, usd and few famous ones


============================================================ -->

---

## Issue #12 — "Avg. txn" ignores most of your transactions

**File:** [use-summary.ts:224](src/hooks/use-summary.ts#L224)

### Ki hocche

The "Transactions" tile counts **all five types** (income, expense, exchange, give, take).
The "Avg. txn" tile right next to it only averages **income and expense**.

So the two tiles sitting side by side are computed over different sets of transactions. If you use give/take a lot, the average is calculated from a smaller pool than the count suggests.

Not *wrong* exactly — but the labels imply they match, and they don't.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


its ok. keep as it is

============================================================ -->

---

## Issue #13 — Year comparison uses a flat 365 days

**File:** [summary/page.tsx:64](src/app/app/summary/page.tsx#L64)

### Ki hocche

Same family as issue #1, but milder. Year-over-year comparison subtracts exactly 365 days. Leap years have 366.

### Example (verified)

```
2025:  previous = [2024-01-01 .. 2024-12-31)   ← WRONG, misses 31 Dec 2024
2026:  previous = [2024-12-31 .. 2025-12-31)   ← correct
2027:  previous = [2025-12-31 .. 2026-12-31)   ← correct
```

Only breaks around leap years, and only by one day. Low impact, but it's the same root cause as #1 so it's worth fixing together.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


fix kore daw

============================================================ -->

---

## Issue #14 — Cash-flow chart bars can overflow their box

**File:** [summary/page.tsx:300-310](src/app/app/summary/page.tsx#L300-L310)

### Ki hocche

Each month is one column with the income bar stacked on top of the expense bar, in a fixed 120px-tall box. Both bars are sized as a percentage of the single largest value across all 12 months.

In the month that sets that maximum, income and expense can each be near 100% — so together they need **~200%** of the available height. The column can't fit them and the bars get squashed or clipped.

This is a visual/scale issue rather than a maths error, but it means the chart under-represents your busiest month — the one you most want to see clearly.

**Unverified** — I read the layout code but did not render it in a browser to measure the actual clipping.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


fix kore felo

============================================================ -->

---

# 🟡 GROUP 3 — Structural risks

---

## Issue #15 — "Exchange" is not an exchange

**Files:** [transaction-form.tsx:129](src/components/transactions/transaction-form.tsx#L129), [transaction-form.tsx:153](src/components/transactions/transaction-form.tsx#L153)

### Ki hocche

The feature is called **Exchange** and has a currency label on it — but the form **refuses to let you pick two accounts with different currencies**:

> *"Both accounts must use the same currency"*

So it can never actually exchange one currency for another. It is a **same-currency transfer** between your own accounts.

And what gets stored as the transaction's "amount" is `|to − from|` — which for a normal transfer is **0**, and otherwise is just the **fee**.

### Example (verified)

```
Transfer 10,000 Cash → Bank, no fee:
   stored amount = 0,      Summary "Exchange" = 0

Transfer 10,000 → 9,980 (20 tk fee):
   stored amount = 20,     Summary "Exchange" = -20
```

The maths is **internally consistent** — the account balances move correctly, and this is why Home and Summary matched perfectly in my clean test. But the naming misleads badly:

- The tile labelled **"Exchange"** on Summary is really *"total fees lost in transfers"*
- Your transaction list shows an exchange as just `+20` or `—`, not the 10,000 that actually moved
- If you have a USD account and a BDT account, **you cannot record moving money between them at all**

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


its also intentional, keep as it is.. but i will think of this later.. its ok for now

============================================================ -->

---

## Issue #16 — There are zero tests

**Verified:** searched the whole project — no `.test.`, no `.spec.`, no test folder, no test runner in `package.json`.

Every issue in this report is in code that handles money, and **none of it has a single automated check**. Every bug here would have been caught instantly by a basic test — I found them by writing exactly those tests in a scratch folder in about ten minutes.

The scripts I used are throwaway, but the same 20 lines committed into the repo would permanently protect against #1, #2, #3, #8 and #13.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================

ja valo hoy koro


============================================================ -->

---

## Issue #17 — Two smaller things worth knowing

**(a) Search by merchant/payee will error.**
[collections.ts:199](src/lib/appwrite/collections.ts#L199) searches both `note` and `payee`. But the database setup script only creates a full-text index on `note` — [setup-db.mjs:162](scripts/setup-db.mjs#L162). Appwrite requires an index on any field you full-text search, so this query should fail and show *"Couldn't load transactions"*.
**Unverified** — I confirmed the index is missing by reading the setup script, but did not run a live search against your Appwrite instance to see the error.

**(b) Every calculation downloads your entire transaction history.**
The balance hook, the summary hook and the people hook each page through **all** your transactions, 500 at a time, into the browser. On the Home page two of these run at once. It works fine at a few hundred transactions; at several thousand it will get slow and burn mobile data. Not a correctness bug — a scaling one.

**(c) Money is stored as floating-point numbers.**
[setup-db.mjs:147](scripts/setup-db.mjs#L147) declares `amount` as a Double. Floating point can't represent some decimal values exactly, so long chains of additions can drift by fractions of a paisa. Irrelevant for everyday use; standard practice in finance apps is to store paisa as whole numbers instead.

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================

a, b er jonno further suggestion daw
r c ta fix kore felo, standard system a


============================================================ -->

---

# Summary table

| # | Issue | Severity | Verified? |
|---|---|---|---|
| 1 | Month comparison uses wrong date window | 🔴 High | ✅ Yes |
| 2 | Rising expenses shown in green | 🔴 High | ✅ Yes |
| 3 | Savings trend flips sign on negative baseline | 🔴 High | ✅ Yes |
| 4 | Deleted account → Home ≠ Summary | 🔴 High | ✅ Yes |
| 5 | Account currency change rewrites history | 🔴 High | ✅ Yes |
| 6 | Currency picker dead on create, live on edit | 🔴 High | ✅ Yes |
| 7 | Live rates applied to old transactions | 🟠 Medium | ✅ Yes |
| 8 | "0% saved" when income is zero | 🟠 Medium | ✅ Yes |
| 9 | "Owes you −৳5,000" | 🟠 Medium | ✅ Yes |
| 10 | "People net" plus-sign in red | 🟠 Medium | ✅ Yes |
| 11 | Unknown currency silently 1:1 | 🟠 Medium | ✅ Yes |
| 12 | "Avg. txn" excludes give/take/exchange | 🟠 Low | ✅ Yes |
| 13 | Year comparison flat 365 days | 🟠 Low | ✅ Yes |
| 14 | Chart bars overflow their box | 🟠 Low | ⚠️ Read-only |
| 15 | "Exchange" is really a same-currency transfer | 🟡 Design | ✅ Yes |
| 16 | No tests anywhere | 🟡 Risk | ✅ Yes |
| 17 | Payee search / full download / float money | 🟡 Risk | ⚠️ Partly |

---

# What I would fix first

If you only touch three things:

1. **#1 + #13 together** — replace the millisecond date-subtraction with real calendar month/year arithmetic. One small fix repairs every trend badge in the app.
2. **#2 + #3 together** — give the Expense badge its own colour rule, and handle negative baselines in the savings trend. Both are in the same area of code.
3. **#5** — lock the currency dropdown once an account has transactions in it. This is the only issue in the report that can permanently corrupt your data, and it is the cheapest to prevent.

**#4 and #6** are more involved because they need a decision from you about what the "true" balance should be, not just a code change.

---

# Questions for you

I need your call on these before any fix:

1. **Deleted accounts (#4)** — should their transactions still count towards your total balance, or genuinely disappear? Or should deleting an account be blocked while transactions exist?
2. **Exchange rates (#7)** — should past transactions be frozen at the rate on the day they happened, or keep floating with today's rate?
3. **"Exchange" (#15)** — do you want it renamed to "Transfer", or do you actually want real cross-currency exchange built?

### Amar comment
<!-- ================== APNAR COMMENT EKHANE ==================


ha valo kotha boleso, exchange theke transfer name diye daw

============================================================ -->

---

## Method note

Findings were verified by extracting the app's calculation functions verbatim — `signedCashDelta`, `convertCurrency`, `aggregate`, `daysInPeriod`, `endOffset`, the account-balance reducer and the people-balance reducer — into standalone Node scripts and running them against constructed transaction sets with known-correct expected answers.

I did **not** connect to your live Appwrite database, and I did **not** run the app in a browser. Everything marked ✅ was proven by execution; everything marked ⚠️ was found by reading the code and is flagged as such in the text.
