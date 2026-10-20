# Cashly — Premium UI/UX Plan

Date: 2026-10-20 · Branch: `ui-ux-overhaul-plan` (level with `main`, Supabase build)

The first overhaul (`UI-UX-OVERHAUL-PLAN.md`) gave Cashly a navy/green token system,
IBM Plex Sans and restyled components. This plan takes it from "restyled" to
**premium**: calm, confident, fast, and honest with numbers. It is based on a full
audit, recorded in §2, and ends in phased work with acceptance checks (§9).

**Guardrail:** nothing here changes a calculation. The money rules in `AGENTS.md`
(minor units, currency from the account, never orphan a transaction, calendar
periods, per-leg conversion, per-metric trend colour) stay exactly as they are.
Where this plan changes how a number is *shown* (sign, decimals), it is display
only, in the formatting layer, with tests.

---

## 1. What "premium" means for Cashly

Five principles. Every change below serves one of them.

1. **Numbers first, beautifully set.** Money is the content. Amounts use tabular
   figures, a consistent decimal rule, aligned signs, and colour that always means
   the same thing. Nothing competes with the balance.
2. **Calm surfaces, one focal point per screen.** Fewer boxes, more whitespace,
   one hero per screen, one primary action per screen. Premium apps feel quiet.
3. **Fast to record, effortless to review.** Adding an expense should take three
   taps and a few keystrokes. Finding last month's grocery spend should take one
   tap from Summary.
4. **Never lose the user's place or data.** No surprise submissions, undo instead
   of "are you sure", filters that survive navigation, errors that offer a retry.
5. **Considered motion and feedback.** Every action answers within 100ms: press
   states, sheet transitions, count-ups, toasts with undo. Everything respects
   reduced motion.

---

## 2. Audit

### How it was done

- **Visual:** every route, at 375px and 1280px, in light and dark (61 screenshots),
  signed in as a temporary demo user with six months of realistic data. Automated
  checks ran on every view for sideways scroll, tap targets under 44px, text under
  12px, and unlabeled controls. The demo user was deleted afterwards.
- **Code:** every file under `src/app`, `src/components`, `src/hooks` and
  `src/providers`, plus `globals.css`, `manifest.ts` and `public/sw.js`.
- **Design reference:** checked against the ui-ux-pro-max fintech guidance, which
  confirms the direction (navy trust palette, IBM Plex Sans, Swiss minimalism) and
  flags the anti-patterns to avoid.

### What is already good (keep)

- Clean token foundation in `globals.css`, light and dark.
- No sideways scrolling at any width. Skip-link. Reduced-motion block. Every
  button has an accessible name.
- Masked-balance privacy concept, share page concept, People balances.
- Calculations are pure, tested and correct.

### 2.1 Critical bugs (wrong data saved, or a broken flow) — all verified

| # | Where | Problem |
|---|---|---|
| C1 | `components/ui/segmented-control.tsx:33` | The type tabs are `<button>`s with no `type`, so inside a `<form>` they **submit** it. On a filled transaction form, switching Expense → Income saves the transaction with the *old* type and navigates away. In the category sheet, tapping "Income" creates an Expense category. |
| C2 | `components/ui/sheet.tsx:34` | The Sheet's close (X) button has no `type`. The delete-confirmation sheet sits inside the edit form, so backing out of "Delete transaction" with X **saves the form**. |
| C3 | `components/transactions/transaction-form.tsx:261` | A transfer's To-amount copies From only while To is empty, so after the first keystroke it freezes. Typing 1500 can leave To = 1, which saves a phantom ৳1,499 "fee". (The 13 real transfers in production were checked: none show this pattern; their differences are genuine fees.) |
| C4 | `app/app/people/page.tsx:154-177` | Since the move to Supabase, the database refuses to delete a person who has give/take history. That is correct, because it protects the history. But the sheet promises "Existing transactions keep…", and the delete has no `catch`, so it silently does nothing. |
| C5 | `app/app/settings/page.tsx:45,165` | "Delete all my data" says "You will be signed out", but it never signs out, so the auth layout bounces the user back into an empty app. It also doesn't refresh the shared transaction cache, and it doesn't mention that people and share links are deleted too. |
| C6 | `public/sw.js:69-80` | The service worker serves `/api/share/[token]` stale-while-revalidate, so a share link can show an old balance. The cache name never changes, and the Appwrite branch is dead code. |

### 2.2 High-impact UX problems

**Navigation and structure**

- **Navigation.**
  - Seven icon-only bottom-nav items, and only the active one has a label, at 10px.
  - The hamburger menu duplicates the same seven items.
  - The mobile header shows only the logo: no page title, no back button.
  - Detail routes highlight no tab (exact `pathname ===` match).
  - Navigation uses `router.push` buttons, so there is no prefetch and no real links.
- **Every route remounts** (`key={pathname}`), and each screen refetches accounts,
  categories and people. Tab switches flash skeletons and feel slow; Home fetches
  accounts three times.

**Recording and finding transactions**

- **Recording is slow.**
  - Amount is the third field, isn't autofocused, and uses `type="number"`.
  - The account always defaults to the first one, not the last one used.
  - There are 16+ category chips in a wrapping cloud.
  - Payee and note are separate fields, and date and time are separate native inputs.
  - The save button isn't reachable without scrolling.
  - After saving, the user always lands on /transactions, wherever they started.
- **The transaction list is a flat feed.**
  - No date headers; the full date and time repeat on every row.
  - Filters live in component state, so saving an edit wipes filters, scroll
    position and "Load more" progress.
  - No month filter.
  - The six filter pills are cramped at 375px ("Income ExpenseTransfer" runs together).
  - A transfer row shows "—" instead of the amount moved.

**People, errors and summary**

- **People: confusing signs and risky controls.**
  - "Owes you" is shown next to **−৳3,000**, and the share page shows the opposite sign.
  - Edit and Delete are two 32px icons almost touching, on every row.
  - There's no "Record give/take with Rafi" or "Settle up" on the person page.
  - "Stop" (sharing) is vague, has no confirmation, and is blue on navy at about 2:1 contrast.
- **Silent failures.**
  - Load errors on Accounts, Categories, People and Summary show fake empty states
    or confident zeros. That invites duplicate accounts.
  - Several deletes have no `catch`.
  - Developer text leaks to users ("Check NEXT_PUBLIC_SUPABASE_URL…", raw Supabase
    messages).
- **Summary is crowded and repeats itself.**
  - Savings appears three times (tile, hero, savings badge).
  - "Transfer fees +৳0" and "People net +৳0" tiles add noise.
  - The 12-month chart ignores the selected period, has no axis values, and has
    10px bars with hover-only values (nothing on touch).
  - Breakdown rows don't drill into transactions.
  - Number formatting is inconsistent: "৳1,626.4", "৳12.5" and "৳12" appear together.

**Visual and platform polish**

- **Desktop wastes the screen.** At 1280px, Home is one narrow column of
  full-width stacked cards with no dashboard layout.
- **Dark mode.**
  - The hero gradient is nearly the same colour as the cards, so there's no focal point.
  - The theme loads after hydration, so there's a white flash.
  - System theme changes aren't followed.
- **Brand assets.**
  - The logo is a raster image in a white square: it looks low-resolution, and it
    sits as a boxed tile on the navy login.
  - `icon.tsx` and `apple-icon.tsx` still use the old blue `#2563EB`.
  - The manifest colours are the old palette.
  - iOS ignores the SVG touch icon.
- **Onboarding** seeds four **BDT** accounts with locked currency before asking
  anything, so a USD user has to delete all four.

### 2.3 Accessibility and touch

- **Contrast.**
  - `--text-tertiary #9b9ba1` on white is about 2.6:1; it's used for dates, hints
    and "≈" equivalents.
  - Income green `#16a34a` on white is about 3.3:1; it's used for every income amount.
  - The red arrow on the navy hero is about 2.5:1.
  - The dark-mode danger button is about 3.8:1.
- **Targets under 44px:**
  - menu button, eye button, Sheet close and chips (40px);
  - account, category and people delete/edit icons and search clear (32px);
  - "See all", every "Back" link and the password toggle (18–24px).
- **Dialogs and announcements.**
  - The Sheet has no focus trap, no Escape, no focus return and no scroll lock.
  - Toasts have no `aria-live`, so saves and errors are never announced. Their
    entrance animation also points at a keyframe that doesn't exist.
- **Labels.**
  - `Select` never sets an `id`, so **no select label in the app is attached to its
    control**: account, currency, summary month/year, transfer From/To.
  - The ~60 category icon buttons have no names.
  - The segmented control claims to be `tablist` but has no panels and no arrow keys.
- **Reduced motion** keeps infinite animations running at 0.01ms, which makes
  skeletons and loaders flicker.

### 2.4 Consistency debt

- Three "selected" styles: navy chip, blue accent picker, white segmented pill.
- Three section-heading styles and three error-banner styles.
- Card radius mixes lg and md, so skeletons jump on load.
- `card-lift` hover on static cards, and missing on tappable ones. Home account
  cards are buttons that do nothing.
- Copy uses three words for one idea: Transfer / Exchange / Currency exchange;
  Give / Take / Sent / Received / Given to; Owes you / They owe you.
- Mixed Title Case ("From Account", "Mobile Wallet") and sentence case.
- The component-layer tokens in `globals.css` (`--button-primary-bg`, `--card-bg`…)
  are referenced nowhere.

---

## 3. Design direction

Keep the foundation (navy trust palette, IBM Plex Sans, Swiss minimalism), and
make it more refined, more consistent, and more confident.

### 3.1 Colour

| Role | Light | Dark | Notes |
|---|---|---|---|
| Canvas | `#F7F8FA` | `#0B1120` | Slightly cooler and deeper than today |
| Surface (cards) | `#FFFFFF` | `#131B2E` | Dark surface clearly lifts off the canvas |
| Surface raised (sheets, popovers) | `#FFFFFF` + shadow-lg | `#1A2338` | |
| Text primary | `#0B1220` | `#F1F5F9` | |
| Text secondary | `#475569` | `#A3AEC2` | 7:1 / 8:1 |
| Text tertiary | `#64748B` | `#8391A7` | **Fix:** ≥4.5:1 on both surfaces |
| Brand navy (primary actions, hero) | `#0F172A` → `#1E3A8A` gradient | `#1E293B` → `#1E3A8A` | Dark hero keeps a visible blue lift |
| Income | `#15803D` | `#4ADE80` | **Fix:** AA on white |
| Expense | `#DC2626` | `#F87171` | |
| Transfer (neutral movement) | `#4F46E5` | `#A5B4FC` | Its own hue, distinct from income and expense |
| Owed to you / you owe | Income / expense hues + label | | Colour is never the only signal |

**Decision for the owner — the premium accent (§10, D1):** today green is both the
"add" button and the colour for income, so a green button reads like money coming
in. Two options:
- **(a) Recommended: navy CTA + champagne-gold detail.** Primary actions are navy.
  A restrained gold (`#B08D57` light / `#D4B483` dark) appears only on premium
  moments: the balance hero's hairline, the active-tab indicator, the savings-rate
  ring. Green and red stay purely semantic. This is the classic private-banking look.
- **(b) Keep green as the CTA.** Simpler, but it blurs the meaning of green.

### 3.2 Typography (IBM Plex Sans, with tabular figures everywhere money appears)

| Token | Size / line | Weight | Use |
|---|---|---|---|
| display | 40/44 (mobile 34/40) | 600 | Balance hero amount |
| title-1 | 24/30 | 600 | Page titles |
| title-2 | 18/24 | 600 | Section titles, sheet titles |
| body | 16/24 | 400 | Body text, inputs (16px also stops iOS zooming into inputs) |
| body-sm | 14/20 | 400–500 | Row subtitles, helper text |
| caption | 12/16 | 500 | Labels, dates, nav labels (**no text under 12px**) |
| overline | 12/16, +0.06em, uppercase | 600 | Section labels |

Amounts get `font-variant-numeric: tabular-nums`. The currency code is set smaller
and lighter than the figure (`BDT` at 0.6em, secondary colour), which is the single
biggest "premium" tell in finance UIs.

### 3.3 Numbers — one display convention (display-only, in `src/lib/currency/format.ts`)

- **Decimals:** whole amounts show no decimals (`৳3,000`). Any amount with paisa
  shows exactly two (`৳1,626.40`, never `৳1,626.4`). Inside one list column, if any
  row has paisa, every row shows two decimals, so tabular figures line up.
- **Sign and colour:**
  - Income `+৳`, green. Expense `−৳`, red; the minus is a true U+2212, aligned.
  - Transfers show the moved amount in the transfer hue, with the fee on the sub-line.
  - People show the **absolute** amount, with direction in words and colour:
    "Rafi owes you ৳3,000" / "You owe Tanvir ৳3,000". This is the same convention
    the share page already uses.
- **Negative balances** (an overdrawn wallet) show in expense red with a small
  "overdrawn" caption, not in plain black.
- **Large numbers in tiles:** compact form only where space demands it (`৳4.37L`
  is ambiguous, so keep full figures and let them shrink with `clamp()`).

### 3.4 Shape, depth, spacing

- **Radius:**
  - cards 20px (`--radius-lg`);
  - controls 14px (`--radius-md`);
  - chips and pills full;
  - sheets 28px top corners.

  One rule per element type; skeletons match the element they stand in for.
- **Elevation:** three levels only.
  - Flat: list rows inside a card.
  - Card: 1px border plus a soft shadow.
  - Raised: sheets, popovers, FAB.

  In dark mode, elevation is shown by a lighter surface, not by shadow.
- **Lists become grouped cards.** One card per group, rows separated by hairlines
  inset past the icon, in the iOS / Revolut pattern. This replaces today's separate
  boxed card per row, which is the main source of visual clutter (see Accounts and
  Categories).
- **Spacing scale:** 4/8/12/16/24/32/48. Page gutter 16px on mobile and 24px from
  768px; 24px between sections.

### 3.5 Motion (all disabled or reduced under `prefers-reduced-motion`)

| Moment | Motion |
|---|---|
| Press | scale 0.97, 80ms |
| Sheet | slide up 280ms with ease-out spring feel; backdrop fade; exit 200ms |
| Page | 150ms fade + 4px rise on route change (no remount) |
| Balance | count-up 600ms on first reveal of each session |
| Toast | slide up + fade 200ms; undo countdown bar |
| List insert/delete | height-free fade + slide (transform/opacity only) |
| Segmented control | sliding indicator (transform only) |

Durations are tokens (`--dur-fast 120ms`, `--dur-base 200ms`, `--dur-slow 280ms`)
plus one easing curve.

### 3.6 Iconography and brand

- Lucide only, 1.75px stroke, 20px in rows, 24px in nav.
- Category icons sit in 40px rounded squares tinted at 12% of their category hue.
- A vector logo (SVG mark + wordmark) that works on navy and on white. Regenerate
  `icon.tsx`, `apple-icon.tsx` and the manifest icons (192/512 PNG + maskable) from it.

---

## 4. Information architecture and navigation

**Mobile bottom bar: four tabs plus one action**

`Home · Activity · [ + ] · Insights · People`

- **Activity** is the renamed Transactions; **Insights** is the renamed Summary.
- Labels are always visible at 12px. Active state: filled icon + label + gold (or
  navy) indicator.
- The centre **+** is the single add action. It opens a quick-add sheet (§5.3) from
  anywhere, which replaces the separate FAB and the header "+" buttons.
- **Accounts, Categories and Settings** move to a **Me / More** entry: the avatar at
  top-right of the header, opening a sheet with profile, accounts, categories,
  preferences, sign out. The hamburger menu goes away.

**Mobile header**

- Large title that collapses on scroll (Home shows a greeting).
- Back chevron on detail routes, at 44px.
- Contextual action on the right (filter on Activity, share on a person).

**Desktop (≥1024px)**

- Keep the sidebar, but group it as Overview (Home, Activity, Insights, People) and
  Manage (Accounts, Categories, Settings).
- Show the user card and sign out at the bottom.
- Content uses a **12-column grid up to 1200px** instead of a single column (§5.1).

**Mechanics**

- `next/link` everywhere, so there is prefetch, real hrefs and long-press to open in
  a new tab.
- Active state uses prefix matching.
- Remove `key={pathname}`.
- Lift accounts, categories and people into shared providers next to
  `all-transactions-provider`, so screens render instantly from cache and refresh
  quietly.
- Filters and periods live in the URL (`?type=expense&month=2026-10`), so Back
  restores them and links can be shared.

---

## 5. Screen-by-screen target

### 5.1 Home — "everything at a glance in one screen-height"

**Mobile**

1. Greeting with the first name only ("Good evening, Nusrat").
2. **Balance hero:**
   - total in display type with a count-up;
   - an eye toggle whose choice is remembered and applied app-wide;
   - a **this-month strip** inside the hero: In ৳136,903 · Out ৳32,528 ·
     Saved 76% (savings ring).
3. **Accounts as a horizontal snap carousel** of compact bank-style cards: name,
   type icon, balance, ≈ converted value for foreign currencies. A trailing
   "Manage" card. Overdrawn accounts are marked. Tapping a card opens Activity
   filtered to that account.
4. **Quick actions row:**
   - Expense, Income, Transfer, Lend/Borrow, each opening quick-add with the type
     preset;
   - optionally the 3 most-used categories as one-tap chips.
5. **Recent activity:** the last 8, grouped under "Today / Yesterday / 14 Oct".
   Rows show the time only, since the date is in the group header. "See all" is a
   44px button.
6. An insight card when there's something worth saying ("Food is 18% above your
   3-month average"). This is display-only, from existing aggregates.

**Desktop:** a two-column dashboard.
- Left (8 columns): hero + this-month strip, then recent activity.
- Right (4 columns): accounts list, top spending this month (mini bars), people
  summary.

### 5.2 Activity (transactions)

- **Sticky toolbar:**
  - search (searches note, payee and category);
  - a month picker chip ("October 2026 ▾");
  - a filter button that opens a sheet with type, account, category and person.

  Active filters show as removable chips. All of it lives in the URL.
- **Month summary row** under the toolbar: In / Out / Net for the filtered set.
- **Date-grouped list** with sticky day headers and a per-day net on the right.
- **Rows (64px):**
  - category icon tile;
  - **title = payee or note** (falling back to category);
  - subtitle = category · account · time;
  - right: the signed, aligned amount;
  - transfers: "City Bank → Cash", moved amount in the transfer hue, fee as the
    sub-line.
- **Swipe left:** Delete, with an undo toast. **Swipe right:** Duplicate. Long-press
  opens a context menu (edit, duplicate, delete). Pull to refresh.
- Infinite scroll with a skeleton at the end, instead of "Load more".
- **Empty states:**
  - for a filter: "No expenses in October", with a "Clear filters" button;
  - for a new user: an illustrated "Record your first transaction" CTA.

### 5.3 Quick-add and edit transaction (the most important flow)

A bottom sheet on mobile and a centred dialog on desktop. A full page remains for
deep links (`/app/transactions/new`).

1. **Type segmented control** at the top: Expense · Income · Transfer · Lend ·
   Borrow. Fixes C1 (`type="button"`); keyboard arrow support.
2. **Amount hero:** large display-size field, autofocused, `inputMode="decimal"`,
   with the currency badge from the selected account inline (`BDT`). Parsing stays
   `toMinorUnits`.
3. **Account picker:** horizontal chips of accounts with balances. Defaults to the
   **last account used for this type** (stored per user in localStorage).
4. **Category:**
   - the 6 most-used for this type as chips, plus "All categories", which opens a
     searchable grid;
   - "+ New category" inline, which returns to the form with the new category
     selected.
5. **Details row:** one "Note or payee" field, with suggestions from recent payees.
6. **Date chip** ("Today, 3:14 PM ▾"), which opens a combined date/time picker with
   Today / Yesterday shortcuts.
7. **Sticky footer:** primary "Save expense", plus "Save & add another" (secondary).
   Stays above the keyboard and the safe area.
8. **Transfer mode:**
   - From and To account chips with a swap button;
   - one amount, with "Different amount received?" revealing the To amount. Fixes
     C3: To mirrors From until edited;
   - a live line, e.g. "Fee ৳55.80" or "You gain ৳5".
9. **Lend/Borrow mode:** a person picker with recent people and "+ Add person"
   inline.

**Feedback and edit mode**

- Validation runs on blur and on submit. The first error is scrolled to and focused.
  Errors clear as the user types.
- After saving: return to where the user came from (`router.back()` or a `from`
  param), and show a toast: "Expense saved · Undo".
- Edit mode uses the same sheet. Delete lives in the footer overflow, with an undo
  toast instead of a confirmation dialog (fixes C2 by removing the nested sheet).

### 5.4 Insights (summary)

**Header and overview**

- **Period control:** Month · Year · All time, with ‹ › steppers ("‹ October 2026 ›")
  instead of a long select.
- **Hero:** Net saved this period, with a savings-rate ring and In / Out beneath it.
  The duplicate Savings tile and the badge go.
- **Comparison strip:** "vs September: Income +12% · Spending −8%", with per-metric
  colours (rising spending is red).
- **Cash flow chart:**
  - follows the selected period: 12 months for a year view, days or weeks for a
    month view;
  - thicker bars, a y-axis with 3 gridlines and compact labels;
  - tap a bar to see that month's values (works on touch);
  - a screen-reader data table;
  - legend chips.

**Breakdowns and secondary stats**

- **Spending by category:** a donut plus a ranked list. **Tapping a row opens
  Activity filtered** to that category and period.
- **Income sources** in the same pattern.
- **People this period:** compact; hidden when empty.
- **Secondary stats** in one quiet row, shown only when non-zero: average per day,
  transaction count, transfer fees.
- **Opening / closing balance:** a single "Balance moved from ৳332,791 to ৳437,166"
  line with a mini sparkline.

### 5.5 People and person detail

- **List:**
  - an avatar with initials in a tinted circle;
  - name and last activity date;
  - "Owes you ৳3,000" in income colour or "You owe ৳3,000" in expense colour;
  - "Settled" in muted text.

  No inline edit/delete icons. Totals card at the top: "People owe you ৳X · You owe ৳Y".
- **Person detail:**
  - **Hero:** avatar, name, the absolute amount with direction, a note.
  - **Actions:** "Lend" / "Borrow" / "Settle up". Settle up pre-fills the exact
    balance as a give or take, using existing transaction types.
  - **Share:** "Share link" uses `navigator.share` on mobile and falls back to copy.
    "Stop sharing" is a secondary button with a confirmation.
  - **History** grouped by month, with a running balance.
  - **Edit and Delete** in the header overflow. Delete is offered only when there's
    no history. Otherwise the menu explains "Rafi has 12 transactions — settle up or
    move them first", which matches what the database enforces (fixes C4).

### 5.6 Accounts

- **Net worth header:** a total in the default currency, plus an "Assets / Overdrawn"
  split.
- **Grouped list by type** (Cash · Bank · Mobile wallets), one card per group with
  hairline rows: name, type, balance, ≈ converted, and a chevron.
- **Tap:** an account sheet with balance, this-month in/out, recent transactions,
  and Edit / Delete. Delete keeps today's safe reassign flow, moved inside the sheet.
- **Add account sheet:** name autofocused, type as icon tiles, currency as a
  searchable list, and a colour/icon pick. An optional opening balance depends on
  decision D8.

### 5.7 Categories

- Tabs: Expense · Income. Each is a grouped list: icon tile, name, "used 24 times
  this year" in caption text.
- Built-in categories show a small "Built-in" tag (no lock-icon tooltip that touch
  users can't see). Custom categories can be **edited** (the form already supports
  it) and deleted.
- **Delete copy that tells the truth:** "24 transactions use Pets. They'll show as
  Uncategorized." Offer "Move them to…" first.
- **Icon picker:** a searchable grid, each icon labelled for screen readers.
  Selected = navy fill + white icon.

### 5.8 Settings ("Me" sheet on mobile, page on desktop)

- **Profile card:** avatar, name (inline edit), email.
- **Preferences** as grouped 52px rows with values and chevrons:
  - Appearance (Light/Dark/System);
  - Default currency (with a coin icon, replacing the Languages icon);
  - Hide balances by default (toggle);
  - Start of week.
- **Data:** Export CSV (all transactions); Manage share links.
- **Account:** Sign out, and the Danger zone. "Delete all my data" lists exactly what
  goes (transactions, accounts, categories, people, share links), requires typing
  DELETE, then signs out and refreshes (fixes C5).
- An "About" row with the real app version from `package.json`.

### 5.9 Auth, onboarding and landing

- **Auth screens:**
  - the vector logo (no white box);
  - a glass card on the navy gradient with a faint grid pattern;
  - first field autofocused; errors with `role="alert"` next to their fields;
  - a 44px password toggle reachable by keyboard;
  - human error messages ("Can't reach Cashly — check your connection").
- **Onboarding after sign-up** (fixes the forced-BDT seeding):
  1. "What currency do you mostly use?" (default BDT).
  2. "Which accounts do you have?" Cash / Bank / bKash / Nagad / Rocket / Other
     toggles, plus optional starting balances.
  3. Done → Home, with a one-time coach mark on the + button.

  This replaces the silent creation of four BDT accounts.
- **Forgot password:** the contact page stays until SMTP exists, restyled to match.
  The reset page's "expired link" gets a "Request a new link" action.
- **Landing `/`** (currently just a redirect):
  - a premium single page with hero ("Your money, beautifully clear"), a static
    product mock built from real components, a three-feature row (Track · Understand
    · Share with people), a privacy note, and the CTA;
  - signed-in users are still redirected to /app.

### 5.10 Share page (public)

- The navy background spans the full viewport, with the content card centred. The
  footer has readable contrast.
- An "As of 20 Oct 2026, 3:14 PM" timestamp from the response.
- Clearer roles: "Nusrat shared this with you · You owe ৳3,000".
- Distinct states: loading, not found, and a temporary error with Retry.
- `/api/` is excluded from the service-worker cache (fixes C6).

---

## 6. Interaction and feedback system (shared components)

| Component | Target behaviour |
|---|---|
| **Sheet / Dialog** | Real dialog: focus trap, initial focus, Escape, focus returns to the trigger, body scroll lock, swipe-down to close on mobile, enter/exit animation, safe-area padding. The close button has `type="button"` (C2). |
| **Toast** | `aria-live="polite"` region (`assertive` for errors), always mounted. Slide-in keyframe added. Action slot for **Undo**. Errors stay 6s; success 3s. Positioned above the bottom bar, never over the + button. |
| **Undo pattern** | Deletes happen immediately in the UI and commit after 5s unless undone. No "are you sure" except for bulk/irreversible actions (delete all data, stop sharing). |
| **Optimistic writes** | Add, edit and delete update the list immediately; the shared history refreshes in the background; failures roll back with an error toast. |
| **Skeletons** | Match the real layout and radius; shimmer (not pulse); never a full-page logo loader inside the app. |
| **Error state** | One `ErrorState` component (icon, plain message, Retry calling the hook's `refresh`), on every data screen. Technical details go to the console only. |
| **Empty state** | Illustration-weight icon, one sentence, one CTA, and for filtered views a "Clear filters" action. |
| **Segmented control** | `type="button"` (C1), `role="radiogroup"`/`radio` with arrow keys, sliding indicator, 44px. |
| **Select** | `id` tied to its label; `aria-invalid` and `aria-describedby` for errors. For short option lists, prefer chips or a sheet picker over the native select. |
| **Inputs** | 48px, 16px text, visible labels, helper and error under the field (`text-sm font-medium`), `inputMode` per field. |
| **Buttons** | Variants: primary (navy), secondary, ghost, danger, and accent (gold, only if D1a is chosen). Sizes 44/48/56. Press scale. Loading keeps the width. |
| **Amount** | One `<Amount>` component: sign, colour role, tabular figures, small currency code, masking, compact option. Every screen uses it. |

---

## 7. Accessibility and quality bar

- Contrast: body ≥4.5:1, large ≥3:1, in both themes. The token values in §3.1 are
  chosen to pass; verify with the validator in P0.
- Touch targets ≥44×44 everywhere, with ≥8px between adjacent targets. The automated
  check from the audit becomes a script and must report zero.
- Every form control has a programmatic label; icon buttons have `aria-label`;
  decorative icons are `aria-hidden`.
- Keyboard: logical tab order, visible focus ring (2px, offset 2px, brand colour),
  Escape closes overlays, arrow keys in segmented controls.
- Screen readers: page titles via the metadata API per route; live regions for
  toasts; charts have data tables; amounts read as "minus 650 taka".
- Reduced motion: no transforms, no count-up, no infinite animations
  (`animation-iteration-count: 1`).
- No text under 12px; inputs at 16px.

---

## 8. PWA and platform polish

- A theme script in `<head>` before hydration (no white flash in dark mode). Listen
  for system theme changes.
- `viewport-fit=cover`, with safe-area padding on the header, the bottom bar and
  sheet footers.
- `theme-color` per theme. Manifest colours from the tokens; 192/512 PNG + maskable
  icons; a real 180px apple-touch PNG.
- Service worker: version the cache name; network-only for `/api/`; remove the
  Appwrite branch.
- Page titles per route ("Activity · Cashly").

---

## 9. Phases

Each phase ends with `npm run build`, `npm test`, `npm run lint`, the
touch-target/contrast checks, and before/after screenshots of the affected screens
in light and dark at 375 and 1280. The audit's capture script is reused, with a
throwaway demo account that is deleted afterwards.

| Phase | Scope | Why this order |
|---|---|---|
| **P0 — Correctness and trust** (small, ship first) | C1–C6; contrast tokens; Select `id`; error states with Retry on every data screen; human error copy; toast live region and keyframe; reduced-motion fix | Stops wrong data being saved and silent failures. Low visual risk. |
| **P1 — Foundations** | Final tokens (colour, type scale, motion, radius, elevation); D1 accent decision; `<Amount>` component and the number convention (with tests in `format.test.ts`); Sheet as a real dialog; Button/Input/Segmented updates; grouped-list card pattern; vector logo and icons | Every later screen builds on these. |
| **P2 — Navigation and speed** | New bottom bar + Me sheet; mobile header with title/back; `next/link`; prefix active state; remove the remount; shared providers for accounts/categories/people; filters in the URL; page fade | Makes the app feel fast and coherent before restyling screens. |
| **P3 — Record and review** | Quick-add/edit sheet (§5.3) with smart defaults; Activity redesign (§5.2) with date groups, month filter, swipe, undo, optimistic writes | The two most-used flows. |
| **P4 — Home and Insights** | Home dashboard (§5.1) including desktop grid; Insights (§5.4) with period stepper, interactive chart, drill-down | The "wow" screens. |
| **P5 — People, Accounts, Categories, Settings** | §5.5–5.8, including settle-up, category edit, CSV export, the safe delete-all flow | Completes the app. |
| **P6 — First-run and public** | Onboarding (§5.9), auth polish, landing page, share page (§5.10) | First impressions for new users. |
| **P7 — Polish pass** | Motion tuning, dark-mode review, safe areas, PWA assets, 768px tablet sweep, final accessibility audit, screenshots of every route | Final finish. |

### Acceptance (the whole plan)

- [ ] C1–C6 fixed, each with a regression test or a scripted check.
- [ ] Every route matches `main`'s numbers (Home total, Insights closing balance,
      People balances, share page) on the same data.
- [ ] Adding an expense from Home: ≤3 taps + typing, saves in under 1s perceived.
- [ ] Zero targets under 44px, zero text under 12px, all contrast pairs ≥ AA, every
      control labelled.
- [ ] No load error is ever shown as an empty state or a zero.
- [ ] Light and dark screenshots of every route at 375 / 768 / 1280.
- [ ] `npm test`, `npm run lint` (no new warnings) and `npm run build` are clean.

---

## 10. Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| D1 | Premium accent: navy + champagne-gold detail, or keep green as CTA | Navy + gold (green stays meaning "income") |
| D2 | Rename tabs to Activity / Insights | Yes (clearer than Transactions / Summary; the routes stay the same) |
| D3 | Rename Give/Take to Lend/Borrow in the UI | Yes (labels only; stored types unchanged) |
| D4 | Accounts/Categories/Settings behind the avatar ("Me") on mobile | Yes (four tabs + add instead of seven icons) |
| D5 | Deletes become immediate + Undo instead of confirm dialogs | Yes, except delete-all and stop-sharing |
| D6 | Onboarding asks for currency and accounts instead of seeding 4 BDT accounts | Yes |
| D7 | Build the public landing page now or later | P6, after the app itself |
| D8 | Opening balance on new accounts. Stored as income, it would count as that month's income in Insights. Excluding it would need a calculation change, which is a money-rules decision and outside this plan. | Defer, or accept it showing as income with a clear "Opening balance" label |

---

## 11. Out of scope

- Calculation, currency, period or storage changes (see `AGENTS.md`).
- New backend features beyond what the UI needs (CSV export is client-side from
  existing data).
- Custom SMTP / email reset flow (separate infrastructure decision).
- Native apps.
