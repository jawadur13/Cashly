# Cashly — Design System

Goal: **minimal, modern, intuitive.** The interface should feel calm and
uncluttered, put money amounts front and centre, and follow common mobile
finance-app patterns (Revolut/Monzo-style energy, but cleaner and lighter).

Principles:
1. One clear action per screen.
2. Money is the hero — large, clean numerals.
3. Colour communicates meaning, not decoration (income vs expense).
4. Mobile-first, thumb-friendly targets (min 44px).
5. Consistent spacing/radius everywhere — no ad-hoc values.

## 1. Colour Tokens

Light theme only in v1.

| Token | Hex | Usage |
| --- | --- | --- |
| `--bg` | `#FAFAFA` | App background |
| `--surface` | `#FFFFFF` | Cards, sheets, inputs |
| `--surface-hover` | `#F2F2F3` | Hover / pressed surfaces |
| `--border` | `#E5E5EA` | Hairline dividers, input borders |
| `--text-primary` | `#111113` | Headings, amounts |
| `--text-secondary` | `#6B6B70` | Labels, meta text |
| `--text-tertiary` | `#9B9BA1` | Placeholders, disabled |
| `--accent` | `#2563EB` (blue) | Primary buttons, links, focus rings, active tab |
| `--accent-soft` | `#EAF1FE` | Accent backgrounds, selected chips |
| `--income` | `#16A34A` (green) | Income amounts, income accents |
| `--income-soft` | `#EAF7EF` | Income chip backgrounds |
| `--expense` | `#DC2626` (red) | Expense amounts, expense accents |
| `--expense-soft` | `#FDECEC` | Expense chip backgrounds |
| `--danger` | `#DC2626` | Destructive actions (delete) |

Semantic mapping: `--accent` = primary interactive; `--income` / `--expense`
are data-colour only (amounts, type filters, category chips), never used for
large buttons.

## 2. Typography

- Font: **Inter** via `next/font/google`. Fallback stack
  `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`.
- Numerals: default Inter tabular figures (`font-variant-numeric: tabular-nums`)
  on all amounts so digits align in lists and balance.
- Scale (rem):

| Token | Size / Weight | Usage |
| --- | --- | --- |
| `display` | 2rem, 700 | Balance value |
| `title` | 1.125rem, 600 | Page title, section titles |
| `body` | 0.9375rem, 400 | Default text |
| `label` | 0.8125rem, 500 | Buttons, inputs, chips |
| `caption` | 0.75rem, 400 | Meta, dates, hint text |

## 3. Spacing, Radius, Shadows

- Spacing scale (px): `4 / 8 / 12 / 16 / 20 / 24 / 32`. Grid is 4px.
- Layout gutters: 16px on mobile, 32px on desktop.
- Radius: `--radius-sm: 8px` (inputs, chips), `--radius-md: 12px` (cards,
  buttons), `--radius-lg: 16px` (sheets, large cards), `--radius-full: 9999px`
  (FAB, segmented control, avatar).
- Shadows: subtle only. `--shadow-sm: 0 1px 2px rgba(17,17,19,0.06)`,
  `--shadow-md: 0 4px 12px rgba(17,17,19,0.08)`.
- Hairline borders preferred over heavy shadows for separation.

## 4. Iconography & Imagery

- Icons: `lucide-react` (stroke-based, 1.5px default weight, 20px default size).
- Category icons come from a fixed map (see `database-schema.md`): e.g.
  `ShoppingBag`, `Utensils`, `Car`, `Home`, `Briefcase`, `Wallet`, `HeartPulse`,
  `GraduationCap`, `Gift`, `Smartphone`, `Plane`, `PiggyBank`, `Receipt`,
  `MoreHorizontal` (fallback).
- No photography / illustration in v1. Empty states use a large soft circle
  with an icon.

## 5. Core Components

### Buttons
- **Primary:** `--accent` bg, white text, `--radius-md`, 100% width on mobile
  form actions; height 48px. Pressed state: darken accent 8%.
- **Secondary:** `--surface` bg, 1px `--border`, `--text-primary` text.
- **Ghost / text:** no fill, accent text.
- **Danger:** `--expense` bg for confirm-delete dialogs only.
- **FAB (mobile):** 56px circle, `--accent`, white `+` icon, fixed bottom-right
  above bottom nav, `--shadow-md`.

### Inputs
- Height 48px, `--surface` bg, 1px `--border`, `--radius-md`, `--body` text.
- Focus: 2px accent ring (`box-shadow: 0 0 0 2px var(--accent-soft)` + border
  accent). Label above input (`--label`).
- Error: border `--expense` + caption error text below.
- Money input: `inputMode="decimal"`; on mobile, force a numeric keypad.

### Segmented control (type: Income / Expense)
- Pill container `--surface-hover`, active segment white pill with
  `--shadow-sm`. Income segment uses green text/icon; expense uses red.

### Transaction row
```
[icon in tinted circle]  Category name           - $12.50
                         Note · Today 12:30   (expense red / income green)
```
- Icon circle: 40px, `--income-soft`/`--expense-soft` bg with matching icon.
- Full row is tappable → edit screen.

### Balance card (Home)
- `--accent` soft gradient or clean `--surface` with `--shadow-sm`.
- Label "Current balance", `display` amount with currency symbol, caption
  "in USD" hint when other currencies exist.
- Two side-by-side summary chips: income this… / expense this… (period = all
  time in v1).

### Chips (category picker, filters)
- 32–36px pill, `--surface` bg + `--border`; selected = `--accent-soft` bg +
  accent border + accent text. Icon + label.

### Sheets / Dialogs
- Mobile: bottom sheet (`--radius-lg` top corners, slide-up).
- Desktop: centred modal with overlay.
- Used for: add-transaction quick flow, confirm delete, custom-category form.

### Nav
- **Mobile bottom nav:** 4 items (Home, Transactions, Categories, Settings),
  icon + label, active tab accent-filled icon. Height ~64px + safe-area inset.
- **Desktop sidebar:** fixed left, 4 items with icon + label, active = accent
  pill background.

### Toasts
- Small pill bottom/centre: success ("Transaction saved"), error, destructive
  confirmation. Auto-dismiss ~3s.

### States
- **Loading:** skeleton shimmer blocks (balance card, list rows).
- **Empty:** circle icon + title + hint + primary CTA.
- **Error:** message + retry button.

## 6. Money Formatting

- Use `Intl.NumberFormat(locale, { style: 'currency', currency })`.
- Locale: derive from `navigator.language`, fallback `en-US`.
- Symbols: `$`, `€`, `£`, `₹`, `¥`, `CHF`, `R$`, etc. (handled automatically by
  Intl; verify the chosen locales render symbols, not codes — add a manual
  symbol lookup override if needed).
- Sign convention in lists: expense = `-` prefix (or parenthesised in the
  region where that is the norm), income = `+` prefix, both coloured.

## 7. Accessibility

- Colour is never the only signal: income/expense also use `+` / `-` signs and
  labels.
- Focus-visible outlines on all interactive elements (2px accent ring).
- Minimum touch target 44×44px (48px buttons/rows where practical).
- Form labels linked to inputs; error text via `aria-describedby`.
- Semantic HTML: `<main>`, `<nav>`, `<button>`, `<label>`, proper heading order.
- Respect `prefers-reduced-motion`: disable slide/skeleton animations.

## 8. Responsive Behaviour

| Breakpoint | Layout |
| --- | --- |
| `< 640px` | Single column, bottom nav, FAB, sheets |
| `640–1023px` | Single column, wider gutters, bottom nav or top nav (keep bottom) |
| `≥ 1024px` | Sidebar nav, content max-width 880px centred |

## 9. Icon & Asset Requirements (PWA)

- App icon set: 192×192, 512×512 PNG (and maskable variants with padding).
- Apple touch icon 180×180.
- Manifest name "Cashly", short name "Cashly", theme colour `#FAFAFA`,
  background colour `#FAFAFA`.
- Favicon + `apple-touch-icon` in `src/app/`.
- All generated in `build-roadmap.md` phase 8 via a simple script or exported
  from a single SVG source.
