# Comprehensive UI/UX Audit Report — Cashly

**Date:** 2026-08-10  
**Scope:** Read-only audit of all pages, components, responsiveness, theme support, and interaction states  
**Status:** NO CHANGES MADE — Audit findings only


> **Status note (9 September 2026).** Point-in-time audit, not maintained. Still broadly accurate; note that the transaction type shown as "Exchange" is now labelled **Transfer** in the UI (the stored value and the `exchange` colour token are unchanged), and the Summary tile that read "Exchange" is now "Transfer fees". The cash-flow chart has since been rebuilt — see [CALCULATION-AUDIT.md](CALCULATION-AUDIT.md) issue #14.

---

## Overall Assessment

✅ **Strong design system foundation** with excellent theme support, good component reusability, and consistent use of design tokens.

⚠️ However, there are **accessibility and mobile responsiveness gaps** that should be addressed, particularly around touch target sizes and responsive grid layouts.

---

## 1. App Structure & Pages

### Routes (12 main routes)
- `/` — Landing/Auth redirect
- `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`
- `/app` — Dashboard/Home
- `/app/summary` — Analytics & Reports
- `/app/accounts` — Account Management
- `/app/transactions` — Transaction History
- `/app/transactions/new` — Add Transaction
- `/app/transactions/[id]` — Edit Transaction
- `/app/categories` — Category Management
- `/app/people` — People/Debts Tracking
- `/app/people/[id]` — Person Detail & Share
- `/app/settings` — Settings
- `/share/[token]` — Public Share Link

### Reusable Components (26+ UI components)
**Primitives:** Button, Input, Select, Sheet, Toast, Loader, Skeleton, Empty State, Chip, Segmented Control, Search Bar, Masked Amount, Load More Button

**Navigation:** Sidebar, Bottom Nav, FAB (Floating Action Button)

**Domain:** TransactionRow, TransactionList, AccountCard, BalanceCard, CategoryIcon, PersonBreakdown

**Forms:** TransactionForm, AccountForm, CategoryForm

---

## 2. Visual & Layout Consistency

### Typography

**Font Sizes (Standardized):**
- `text-lg` (18px) — Main headings
- `text-xl` (20px) — Page titles
- `text-[1.75rem]` (28px) — Hero headings
- `text-[0.9375rem]` (15px) — Body text
- `text-sm` (14px) — Secondary text
- `text-[0.8125rem]` (13px) — Labels
- `text-xs` (12px) — Captions

**Issues:**
- **MEDIUM #1:** Inconsistent custom text sizes (`text-[0.8125rem]`, `text-[0.9375rem]`, `text-[0.6875rem]`) should use standardized scale <!-- USER_COMMENT: standardized scale -->

- **LOW #2:** Extra small text (10px) for month labels might be hard to read on mobile
<!-- USER_COMMENT: use suitable size and spacing. And also add some shadow for hover and click -->
### Spacing

**Scale:** Consistent multiples of 4px (0.5, 1, 2, 3, 4, 6, 8)  
**Gap patterns:** `gap-2`, `gap-3`, `gap-4`, `gap-6` used consistently

**Issues:**
- **LOW #3:** Inconsistent label spacing (`mb-1.5` vs `mb-2`)

### Colors

**Status:** ✅ **EXCELLENT**
- All colors use CSS variables from design tokens
- No hardcoded hex colors in component classes
- Proper semantic colors:
  - Income: `#16a34a` (light) → `#22c55e` (dark)
  - Expense: `#dc2626` (light) → `#ef4444` (dark)
  - Exchange: `#2563eb` (light) → `#3b82f6` (dark)

### Borders, Shadows, Radius

**Status:** ✅ **CONSISTENT**
- Borders: `border-border` token
- Shadows: `shadow-[var(--shadow-sm)]`, `shadow-[var(--shadow-md)]`
- Radius: `rounded-[var(--radius-md)]`, `rounded-[var(--radius-lg)]`, `rounded-[var(--radius-full)]`

### Buttons

**Status:** ⚠️ **MOSTLY CONSISTENT WITH GAPS**

- Sizes: `h-9` (sm), `h-12` (md), `h-14` (lg)
- Variants: primary, secondary, ghost, danger
- States: hover (`opacity-90`), disabled (`opacity-50`), loading (spinner)

**Issues:**
- **HIGH #4:** Button size `sm` is `h-9` = 36px (below 44-48px touch target minimum)
- **HIGH #5:** Icon buttons use `size-8` = 32px (below 44-48px minimum)

### Form Inputs

**Status:** ⚠️ **MISSING FOCUS BORDER STATE**

- Height: `h-12` = 48px ✅
- Error state: `border-expense` with `ring-expense/30`
- Label spacing: consistent

**Issues:**
- **MEDIUM #6:** Input missing `focus:border-accent` when focused with error — only shows `ring-expense/30`
- **MEDIUM #7:** Select component missing `focus:border-accent` — only has `focus:ring-2 focus:ring-accent-soft`

---

## 3. Responsiveness

### Mobile-First Approach

✅ **Sidebar & Navigation:**
- Mobile: `md:hidden` (hides sidebar, shows bottom nav & header)
- Desktop: `hidden md:flex` (shows sidebar, hides bottom nav)

✅ **Main Content:**
- Mobile: `px-4` (4 padding)
- Desktop: `md:pl-60` (sidebar offset)

### Responsive Issues

**Issues:**
- **HIGH #8:** Summary page grid uses `grid-cols-4` without responsive breakpoints
  - Becomes 4 tiny columns on mobile (should be `grid-cols-2 md:grid-cols-4`)
  - Location: `src/app/app/summary/page.tsx`
<!-- USER_COMMENT: fix it -->

- **MEDIUM #9:** Cash flow 12-month chart becomes too narrow on mobile

- **MEDIUM #10:** Category form icon grid uses `grid-cols-8` without responsive
  - Should be `grid-cols-4 md:grid-cols-8`
  - Location: `src/components/categories/category-form.tsx`

- **MEDIUM #11:** Account/people lists might have insufficient horizontal padding on very small screens

### Touch Targets

**Recommended minimum:** 44-48px (WCAG 2.5 level AAA)

**Issues:**
- **HIGH #12:** Navigation button touch targets too small:
  - Sidebar nav items: `py-2.5` ≈ 28px height
  - Icon buttons: `size-8` = 32px
  - Small buttons: `h-9` = 36px

---

## 4. Theme Support (Dark/Light)

### Root Setup

✅ **Correct Implementation:**
- Root layout has `suppressHydrationWarning`
- Theme provider uses `data-theme` attribute
- Reads from localStorage and system preference
- Respects `prefers-reduced-motion`

### Color Tokens

✅ **Both themes working:**
- Light mode: CSS variables in `:root`
- Dark mode: CSS variables in `[data-theme="dark"]`
- All semantic colors have dark mode equivalents
- No hardcoded colors

---

## 5. States & Feedback

### Loading States

✅ **IMPLEMENTED:**
- Full page loader with animated logo
- Skeleton screens with pulse animation
- Button loading spinner
- Share page shows loader while fetching

### Empty States

✅ **WELL IMPLEMENTED:**
- `EmptyState` component used consistently
- Shows icon, title, description, optional action
- Consistent styling and messaging

### Error States

⚠️ **PARTIALLY WORKING:**
- Form errors show with `text-expense` color
- Error messages display inline below inputs
- Error background: `bg-expense-soft`

**Issues:**
- **MEDIUM #13:** Error styling not visually prominent enough (small text)
- **MEDIUM #14:** Input error state doesn't change border — only shows ring
<!-- USER_COMMENT: fix border issue. when error occurs it should show border -->
### Success Feedback

✅ **WORKING:**
- Toast notifications with success/error variants
- Auto-dismiss after 5 seconds
- CheckCircle2 icon in income color (green)

### Disabled States

✅ **CONSISTENT:**
- Buttons: `disabled:opacity-50 disabled:pointer-events-none`
- Form inputs: proper disabled styling

### Masked Amount Feature

✅ **WORKING CORRECTLY:**
- Uses `blur-[6px]` for masked amounts
- Proper `aria-label` for accessibility
- Applied on balance cards and account cards

**Issues:**
- **LOW #15:** Blur amount (6px) might be too weak on high-density displays

---

## 6. Component Consistency

### Button Component

✅ **CONSISTENT:**
- Props: variant, size, fullWidth, loading
- All variants have proper hover states
- All have focus-visible indicators

### Input Component

⚠️ **MISSING FEATURES:**
- Props: label, error, hint, showPasswordToggle
- Missing: focus border color on error state
<!-- USER_COMMENT:add them -->
**Issues:**
- **MEDIUM #16:** Missing `focus:border-accent` when input has error

### Select Component

⚠️ **INCOMPLETE:**
- Props: label, error
- Missing: focus border color change

**Issues:**
- **MEDIUM #17:** Missing `focus:border-accent`
<!-- USER_COMMENT:fix -->
### Chip Component

✅ **CONSISTENT:**
- Selected state styling
- Hover states
- Icon support

### Segmented Control

✅ **CONSISTENT:**
- Selected state with background
- Proper tab semantics
- Color-coded (income/expense/exchange)

### Icon Usage

✅ **CONSISTENT:**
- Lucide React icons throughout
- Sizes: `size-4` (16px), `size-5` (20px), `size-6` (24px)
- Proper `strokeWidth` variations

### Cards & Containers

✅ **CONSISTENT:**
- Uniform styling: border, bg-surface, shadow, radius
- Applied across all card-like elements

### Navigation Components

⚠️ **MISSING FOCUS STATES:**

**Issues:**
- **MEDIUM #18:** Sidebar nav buttons missing `focus-visible:outline-2 focus-visible:outline-accent`
- **MEDIUM #19:** Bottom nav buttons missing `focus-visible` styling
<!-- USER_COMMENT:fix all -->
### Transaction Row

✅ **WELL IMPLEMENTED:**
- Correct icons for all transaction types
- Proper colors: income (green), expense (red), exchange (blue), give (red), take (green)
- Good visual hierarchy

---

## 7. Feature-Specific Audit

### Share Link Feature

✅ **WORKING:**
- Error state shows "Link not found" with helpful messaging
- Proper error handling with fallback UI
- Live transaction fetching works
- Currency display dynamic

### Exchange Rate Management

✅ **WORKING:**
- `useExchangeRates` hook handles loading
- Share page shows loader while fetching
- Conversion works with fallback rates

### Masked Amount Privacy Feature

✅ **WORKING:**
- `blur-[6px]` correctly hides amounts
- Proper `aria-label` for accessibility
- Works on both balance cards and account cards

### Transaction Type Display

✅ **CORRECT:**
- Income: green background, green icon
- Expense: red background, red icon
- Exchange: blue background, blue icon
- Give: red background (expense-soft), red icon
- Take: green background (income-soft), green icon

### Summary Page Layout

⚠️ **MOSTLY ALIGNED WITH GAPS:**
- Income/Expense/Exchange/Savings tiles aligned
- Consistent styling
- **BUT:** Missing responsive grid breakpoints (Issue #8)

---

## 8. Functional UI Issues

### Form Submissions

✅ **WORKING:**
- Buttons disable while loading
- Success/error feedback via toast
- Form validation with error messages

### Modal/Sheet

✅ **WORKING:**
- Proper backdrop
- Correct z-index layering
- Functional close button
- Content scrollable with `max-h-[85dvh]`

**Issues:**
- **LOW #20:** Sheet max-height might cut content on very small devices (85dvh ≈ 425px on 500px device)

### Tooltips/Help Text

✅ **IMPLEMENTED:**
- Hint text below inputs
- Alt text on images
- Aria-labels on icon buttons

### Animations/Transitions

✅ **SMOOTH:**
- Button hover: `opacity-90`
- Transitions: `transition-colors` (200ms default)
- Animations: pulse, spin, shimmer
- Respects `prefers-reduced-motion`

---

## Summary of Issues by Severity

### 🔴 **HIGH** (Major UX Problems) — 2 issues

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 8 | Summary page grid not responsive (4 columns on mobile) | `src/app/app/summary/page.tsx` | HIGH |
| 12 | Navigation touch targets below 44-48px minimum | Navigation components | HIGH |

### 🟡 **MEDIUM** (Noticeable Issues) — 10 issues

| # | Issue | Location |
|---|-------|----------|
| 1 | Inconsistent custom text sizes | Throughout |
| 4 | Button size `sm` is 36px (below 44px) | `src/components/ui/button.tsx` |
| 5 | Icon buttons are 32px (below 44px) | Multiple components |
| 6 | Input missing border color on error focus | `src/components/ui/input.tsx` |
| 7 | Select missing border color on focus | `src/components/ui/select.tsx` |
| 9 | Cash flow chart too narrow on mobile | `src/app/app/summary/page.tsx` |
| 10 | Category form icon grid not responsive | `src/components/categories/category-form.tsx` |
| 13 | Error messages not prominent enough | Form components |
| 14 | Input error state only shows ring, no border | `src/components/ui/input.tsx` |
| 18, 19 | Navigation buttons missing focus-visible | Sidebar, bottom nav |

### 🔵 **LOW** (Polish Issues) — 7 issues

| # | Issue | Impact |
|---|-------|--------|
| 2 | Extra small text (10px) hard to read | Readability on mobile |
| 3 | Inconsistent form label spacing | Minor inconsistency |
| 11 | Insufficient horizontal padding on small screens | Edge case on 320px devices |
| 15 | Blur amount (6px) too weak on high-DPI | Readability on retina displays |
| 20 | Sheet max-height might cut content | Edge case on very small devices |
| + 2 more | Sidebar/button spacing variations | Minor |

---

## What's Working Well ✅

- ✅ Theme support (light/dark perfectly implemented)
- ✅ Color tokens (no hardcoded colors, all semantic)
- ✅ Component consistency (Button, Chip, Segmented Control)
- ✅ Loading/empty/error states
- ✅ Masked amount privacy feature
- ✅ Transaction types display correctly
- ✅ Animations smooth, respect `prefers-reduced-motion`
- ✅ No horizontal scroll issues
- ✅ Good flexbox/grid usage
- ✅ Proper accessibility for most interactive elements

---

## Recommendations by Priority

### Priority 1 — Fix Immediately
- [ ] Add responsive grid to summary page: `grid-cols-2 md:grid-cols-4`
- [ ] Increase all touch targets to minimum 44px (ideally 48px)
- [ ] Add `focus-visible:outline` to navigation buttons

### Priority 2 — Fix Soon
- [ ] Add focus border color to Input and Select components
- [ ] Make category form icon grid responsive: `grid-cols-4 md:grid-cols-8`
- [ ] Ensure button size `sm` is 44px instead of 36px
- [ ] Make error messages more visually prominent
- [ ] Review touch targets on all interactive elements

### Priority 3 — Polish
- [ ] Standardize typography with CSS custom properties
- [ ] Create consistent spacing scale documentation
- [ ] Consider blur strength for masked content on high-DPI
- [ ] Test sheet max-height on very small devices
- [ ] Add skip link for keyboard navigation

---

## Notes

- This audit is **read-only** — no code changes were made
- All issues are documented with file locations and severity levels
- The design system foundation is solid; issues are primarily accessibility and mobile responsiveness
- Many issues can be fixed with CSS-only changes to Tailwind class definitions
