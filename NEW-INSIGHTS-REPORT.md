# Cashly: New Insights & Visualizations Report

**Date:** 2026-08-10  
**Scope:** Analysis of meaningful insights and visualizations that can be shown using existing data schema  
**Constraint:** NO schema changes, NO new user inputs required  
**Status:** Research only — no implementation performed

---

## Executive Summary

Cashly already collects rich transaction data across **8 dimensions** (type, amount, currency, date, category, person, account, note). By deriving new metrics and visualizations from this existing data, we can unlock **34+ new insights and views** that would provide users with deeper financial understanding without requiring schema modifications or additional data collection.

Key opportunity areas:
- **Spending patterns & habits** (daily/weekly patterns, time-of-day analysis)
- **Predictive insights** (forecast next month, run rate, burn rate)
- **Comparative analysis** (month-over-month, year-over-year)
- **Category deep-dives** (top categories, category trends, seasonality)
- **Person analytics** (lending patterns, settlement rates, frequency)
- **Account health** (velocity, diversification, currency exposure)
- **Anomalies & alerts** (unusual spending, rare categories, outliers)

---

## Data Already Collected

### Transaction Fields (Available)
- `type`: 'income' | 'expense' | 'give' | 'take' | 'exchange'
- `amount`: Numeric value
- `currency`: Currency code (BDT, USD, etc.)
- `date`: ISO 8601 timestamp
- `categoryId`: Link to category (for income/expense only)
- `personId`: Link to person (for give/take only)
- `accountId`: Link to account
- `note`: Free-form text (optional)
- `fromAmount` / `toAmount`: Exchange-specific amounts
- `payee`: Optional field (exists but rarely populated)

### Aggregated Data Already Computed
- Account balances (total and per-currency)
- Person balances (net given/taken)
- Monthly income/expense breakdown
- Category breakdowns (top spending, top income sources)
- Opening/closing balances
- Exchange gains/losses
- Daily average spending

---

## Part 1: Time-Based Insights

### 1.1 Spending Velocity & Trends

**Available without new inputs:**

#### Day-of-Week Analysis
- **Show:** Bar chart of average spending by day (Mon–Sun)
- **Insight:** Find which days have highest spending (e.g., Friday nights, Sundays)
- **Use:** Spot behavioral patterns, plan budgets by day-type
- **Data needed:** Transaction date (ISO 8601 already provides day-of-week)
- **Derivation:** Group transactions by `date.getDay()`, sum by day, divide by count of that day-type

#### Hour-of-Day Analysis
- **Show:** Heatmap or line chart of transaction count/amount by hour
- **Insight:** Identify when money flows most (peak hours, quiet hours)
- **Use:** Understand spending discipline (e.g., impulse purchases at night?)
- **Data needed:** Transaction time (already in date field)
- **Derivation:** Extract `date.getHours()`, aggregate by hour

#### Weekly Patterns
- **Show:** 4-week rolling average of daily spending with trend line
- **Insight:** See if spending is increasing, decreasing, or cyclical
- **Use:** Early warning system for budget creep
- **Data needed:** Historical transactions (already have all)
- **Derivation:** Compute 7-day moving average of daily amounts

#### Seasonality Detection
- **Show:** Month-by-month spending for the last 2–3 years (if available)
- **Insight:** Identify recurring spikes (holidays, annual events, seasonal patterns)
- **Use:** Prepare for known high-spending months
- **Data needed:** Full historical transaction set
- **Derivation:** Group by month, overlay multiple years as colored lines

### 1.2 Predictive Insights

#### Next Month Forecast
- **Show:** Predicted income and expense for next month based on trend
- **Insight:** "You're on track to spend ৳X next month (±Y%)"
- **Use:** Self-correction before overspending
- **Data needed:** Last 3–6 months of transactions
- **Derivation:** Linear regression over last 3–6 months, project 30 days forward

#### Run Rate / Burn Rate
- **Show:** "At current pace, you'll run out of money in X days" (if spending > income)
- **Insight:** Cash runway indicator
- **Use:** Urgency signal if negative cash flow detected
- **Data needed:** Current month's income/expense, current date
- **Derivation:** `(closing_balance / daily_burn) if burn > 0 else "indefinite"`

#### Income Forecast
- **Show:** "Based on pattern, you'll earn ৳X ± Y next month"
- **Insight:** Expected income trend
- **Use:** Plan spending around expected income
- **Data needed:** Last 6 months of income transactions
- **Derivation:** Average income per month, show confidence bands

### 1.3 Comparative Analysis

#### Month-over-Month (MoM) Change
- **Show:** Side-by-side cards: "This month: ৳X, Last month: ৳Y, Change: ±Z%"
- **Insight:** Month-to-month volatility
- **Use:** Quick health check across income/expense/people/exchange
- **Data needed:** Current month + previous month transactions
- **Derivation:** Sum transactions, compare current vs. previous month

#### Year-over-Year (YoY) Change (if 12+ months of data)
- **Show:** This month vs. same month last year
- **Insight:** Annual spending patterns, inflation proxy
- **Use:** Seasonal adjustments, long-term trends
- **Data needed:** At least 13 months of transactions
- **Derivation:** Compare month N vs. month N-12

#### Best Month / Worst Month
- **Show:** "Best month: July (৳X income, ৳Y saved). Worst month: April (৳X spent)"
- **Insight:** Historical extremes
- **Use:** Celebrate wins, learn from challenges
- **Data needed:** All transactions
- **Derivation:** Group by month, find max/min by metric

#### Volatility Metrics
- **Show:** Standard deviation of monthly spending, coefficient of variation
- **Insight:** "Your spending is highly variable (+/- Z% month-to-month)"
- **Use:** Risk/stability assessment
- **Data needed:** Last 12 months of monthly sums
- **Derivation:** `stddev(monthly_amounts) / mean(monthly_amounts)`

---

## Part 2: Category Insights

### 2.1 Category Trends

#### Category Spending Trend
- **Show:** Line chart for each top-5 category over time (12-month view)
- **Insight:** Which categories are growing, shrinking, or stable
- **Use:** Spot category creep (e.g., dining out increasing by 50%)
- **Data needed:** All expense transactions with categoryId
- **Derivation:** Group by month + category, sum amounts, plot lines

#### Category Seasonality
- **Show:** Heatmap: category (rows) × month (columns), colored by average amount
- **Insight:** "Groceries peak in January, Entertainment drops in August"
- **Use:** Anticipate and plan seasonal spending
- **Data needed:** Last 2–3 years of expenses
- **Derivation:** Aggregate by (category, month-of-year), average across years

#### Category Volatility
- **Show:** "Groceries (stable, ±8%), Dining (volatile, ±35%)"
- **Insight:** Which categories are predictable vs. unpredictable
- **Use:** Budget predictability (groceries easy to budget, entertainment hard)
- **Data needed:** Last 6–12 months of category expenses
- **Derivation:** For each category, `stddev(monthly_sums) / mean(monthly_sums)`

#### Top Outliers by Category
- **Show:** "Top 5 biggest expenses in Dining: ৳500, ৳450, ৳420..."
- **Insight:** One-off large purchases vs. typical spending
- **Use:** Understand what counts as "normal" vs. "anomaly"
- **Data needed:** All expense transactions with amounts
- **Derivation:** Group by category, sort by amount, show top N per category

### 2.2 Category Ratio & Composition

#### Category Composition Over Time
- **Show:** 100% stacked bar chart: each month's spending broken into category slices
- **Insight:** "Groceries used to be 40% of budget, now 45%"
- **Use:** See if expense mix is shifting
- **Data needed:** Monthly category breakdowns (already computing for Summary)
- **Derivation:** For each month, sum by category, compute percentage

#### Top Income Sources by Category
- **Show:** "Salary (90%), Freelance (8%), Other (2%)"
- **Insight:** Income concentration risk
- **Use:** Assess financial stability (over-reliance on one income source?)
- **Data needed:** All income transactions with categoryId
- **Derivation:** Group by category, compute percentage

#### Efficiency by Category
- **Show:** "Groceries: ৳5,000 in 40 transactions (avg ৳125). Dining: ৳8,000 in 100 txns (avg ৳80)"
- **Insight:** Which categories have largest per-transaction amounts
- **Use:** Understand scale of spending per event
- **Data needed:** All transactions with categoryId and amount
- **Derivation:** For each category, count transactions, divide total by count

---

## Part 3: Person Analytics

### 3.1 Lending Patterns

#### Lending Settlement Rate
- **Show:** "You've settled 40% of debts (8 out of 20 people have zero balance)"
- **Insight:** Lending efficiency
- **Use:** Identify long-standing debts, follow up with debtors
- **Data needed:** All person balances (already computed)
- **Derivation:** Count people where `balance == 0` / total people

#### Lending Velocity per Person
- **Show:** Table: Person, Total Lent, Total Borrowed, Net, # Transactions
- **Insight:** Who you lend/borrow most from, frequency of dealings
- **Use:** Understand which relationships dominate
- **Data needed:** All give/take transactions with personId
- **Derivation:** Group by person, sum give/take, count transactions

#### Largest Unpaid Debt / Credit
- **Show:** "Biggest debt: Rafid (৳5,000 owed). Biggest credit: Sarah (৳2,000 owed to you)"
- **Insight:** Which relationships need action
- **Use:** Prioritize settlements
- **Data needed:** All person balances
- **Derivation:** `max(abs(balance)) per person`

#### Lending Trend
- **Show:** "In the last 30 days, you lent ৳8,000 and borrowed ৳2,000 (net +৳6,000 to you)"
- **Insight:** Current lending activity
- **Use:** Track short-term lending changes
- **Data needed:** Transactions for last 30 days
- **Derivation:** Sum give/take by type for date range

#### Person Frequency
- **Show:** "You deal with Alex every 2 days on average. Sarah once every 10 days."
- **Insight:** Relationship intensity
- **Use:** Expected timing for the next settlement
- **Data needed:** All give/take transactions with personId and date
- **Derivation:** For each person, `total_days_span / transaction_count`

### 3.2 Person Insights

#### Lending Circle
- **Show:** Network diagram: You (center) → arrows to people you lend/borrow from, width by amount
- **Insight:** Visual map of all relationships and exposure
- **Use:** Spot highly connected people, money flow patterns
- **Data needed:** All give/take transactions
- **Derivation:** Build nodes (you + all people), edges (lent/borrowed amounts)

#### Reciprocal Lending
- **Show:** "With Alex: you lent ৳3,000, borrowed ৳1,500 (net: ৳1,500 to you)"
- **Insight:** Mutual lending relationships
- **Use:** Understand bidirectional dynamics
- **Data needed:** All give/take transactions
- **Derivation:** For each pair, separate lent vs. borrowed, compute net

---

## Part 4: Account Analytics

### 4.1 Account Health

#### Multi-Currency Exposure
- **Show:** "You hold 60% BDT, 30% USD, 10% Other"
- **Insight:** Currency diversification / concentration risk
- **Use:** Understand foreign exchange exposure
- **Data needed:** Account balances + currency (already have)
- **Derivation:** Sum balances per currency, compute percentage

#### Account Contribution to Net Worth
- **Show:** Pie chart: "Cash Wallet (40%), Savings (35%), Card (25%)"
- **Insight:** Asset allocation
- **Use:** See if savings account is growing as intended
- **Data needed:** All account balances
- **Derivation:** `account_balance / sum(all_accounts)`

#### Account Velocity
- **Show:** "Cash Wallet: ৳50,000 in/out this month (turnover). Savings: ৳2,000 in/out (stable)"
- **Insight:** Which accounts are active vs. dormant
- **Use:** Spot unusual activity or accounts that should be consolidated
- **Data needed:** All transactions with accountId
- **Derivation:** Sum inflows + outflows per account per month

#### Dormant Accounts
- **Show:** "Nagad (last txn: 45 days ago), bKash (last txn: 120 days ago)"
- **Insight:** Inactive accounts
- **Use:** Consider consolidation or closure
- **Data needed:** All transactions with accountId and date
- **Derivation:** `today - max(transaction_date) for each account`

### 4.2 Account Balances Over Time

#### Account Balance Trajectory
- **Show:** Line chart for each account over last 12 months
- **Insight:** Which accounts are growing, which declining
- **Use:** Track savings progress, identify leaks
- **Data needed:** Transactions to reconstruct daily/weekly balances
- **Derivation:** Time-series: for each date, sum all txns up to that date

#### Account Growth Rate
- **Show:** "Cash Wallet: +5% this month, +12% this quarter"
- **Insight:** Savings momentum
- **Use:** See if you're on track for savings goals
- **Data needed:** Monthly opening/closing per account
- **Derivation:** `(current_balance - past_balance) / past_balance * 100`

---

## Part 5: Exchange & Currency Insights

### 5.1 Exchange Analysis

#### Exchange Gain/Loss Trend
- **Show:** Line chart of cumulative exchange gain/loss over time
- **Insight:** "You've made ৳2,000 in exchange gains this year"
- **Use:** Assess forex timing (good or bad?)
- **Data needed:** All exchange transactions (already computing exchange net)
- **Derivation:** For each exchange, `to_amount - from_amount`, cumsum

#### Best/Worst Exchange Rate
- **Show:** "Best rate: 100 BDT = $1.15 (Sep 1). Worst: 100 BDT = $0.95 (Jun 15)"
- **Insight:** Historical rates at time of each exchange
- **Use:** Understand if you timed exchanges well
- **Data needed:** Exchange transactions with timestamps and amounts
- **Derivation:** Compute `from_amount / to_amount` for each exchange, find min/max

#### Currency Pair Frequency
- **Show:** "BDT↔USD (8 times), BDT↔EUR (2 times)"
- **Insight:** Most-used currency pairs
- **Use:** See which currencies you actually trade
- **Data needed:** All exchange transactions
- **Derivation:** Extract currency pairs, count occurrences

#### Average Exchange Margin
- **Show:** "For BDT→USD, average fee: 2.3% (mid-market + your cost)"
- **Insight:** How much you pay to exchange (if applicable)
- **Use:** Decide if exchange rate is fair
- **Data needed:** All exchanges, compare to mid-market rate if available
- **Derivation:** Compute actual rate vs. theoretical mid-market rate

### 5.2 Currency Trends

#### Currency Conversion Needs
- **Show:** "You own ৳10,000, $500, €100. Top spending category is Groceries (₹) in default currency"
- **Insight:** Mismatch between holdings and spending currency
- **Use:** Identify rebalancing opportunities
- **Data needed:** Account balances + spending categories
- **Derivation:** Detect if currency of large holdings ≠ currency of large spending

---

## Part 6: Anomaly & Alert Insights

### 6.1 Unusual Activity Detection

#### Spending Spike Detection
- **Show:** Alert: "Spending 150% higher than usual this week"
- **Insight:** Detect unusual activity early
- **Use:** Catch overspending before it becomes a problem
- **Data needed:** Weekly spending amounts + historical average
- **Derivation:** Compare current week to rolling 8-week average, flag if > 1.5×

#### One-Off Transactions
- **Show:** "Largest expense this month: ৳50,000 to 'Home Repair' (vs avg ৳2,000)"
- **Insight:** Spot unusual one-time purchases
- **Use:** Distinguish routine spending from anomalies
- **Data needed:** All transactions with amounts
- **Derivation:** For each month, identify transactions > 2× monthly average

#### Rare Categories
- **Show:** "New category this month: 'Medical' (only appears 3 times in history)"
- **Insight:** First-time or infrequent spending
- **Use:** Note unusual expense types
- **Data needed:** All transactions with categoryId
- **Derivation:** Count historical occurrences, flag if < 5 times total

#### Negative Savings Month
- **Show:** Alert: "You spent more than you earned in August (deficit: ৳5,000)"
- **Insight:** Cash flow crisis indicator
- **Use:** Trigger review / corrective action
- **Data needed:** Monthly income vs. expense
- **Derivation:** `if expense > income: alert`

### 6.2 Threshold Violations

#### Budget Variance
- **Show:** "If you've set targets: Groceries on track (92% of budget), Dining over (120%)"
- **Insight:** Track against self-imposed limits (if available)
- **Use:** Note: This would require user input, so skip per constraints
- **Data needed:** User-defined budgets (not available)
- **Derivation:** N/A — requires schema change

#### Daily Spending Cap Exceeded
- **Show:** "Today's spending: ৳8,000 (average: ৳3,000)"
- **Insight:** High-spending day
- **Use:** Awareness + reflection
- **Data needed:** All transactions
- **Derivation:** Sum transactions by date, compare to daily average

---

## Part 7: Summary Dashboard Enhancements

### 7.1 Extended Summary Tiles

#### Quick Stats Row (above existing tiles)
- **Metric 1:** "Savings Rate: 35%" (savings / income)
- **Metric 2:** "Days to Month-End: 12"
- **Metric 3:** "Largest Category: Groceries (32%)"
- **Metric 4:** "People Settled: 8/20"

#### Micro-Trends (below each main tile)
- Income tile: "↑ 10% vs last month"
- Expense tile: "↑ 5% vs last month"
- Savings tile: "↑ 15% vs last month"
- Exchange tile: "↓ 2% (small loss this month)"

#### Health Checkup Badge
- **Show:** Single card summarizing overall financial health
- **Color:** Green (healthy), Yellow (caution), Red (alert)
- **Factors:**
  - Savings rate > 20% → Green
  - Expense < income → Green
  - No negative weeks → Green
  - Settling debts on pace → Green
  - Alert if any factor red

### 7.2 Expanded Monthly Chart

#### Stacked Area Chart (replace current bar chart)
- **Axis Y:** Cumulative amount
- **Axis X:** Month (last 12)
- **Layers:** Income (green), Expense (red), Exchange (blue), People Net (purple)
- **Insight:** See the full cash flow composition per month at a glance

#### Daily Spending Sparkline
- **Show:** Tiny inline chart: "Spending this month ↗️ (trend)" next to main chart
- **Insight:** Quick visual of current month's trajectory
- **Data needed:** Transactions for current month
- **Derivation:** Day-by-day cumulative spending

---

## Part 8: Detailed Analytics Pages (Proposed New Routes)

### 8.1 `/app/analytics/spending-patterns`
**Goal:** Deep dive into when and how you spend

- **Sections:**
  1. Heatmap: Day-of-week × Hour-of-day → spending amount
  2. Distribution: Pie chart of transaction count/amount by hour
  3. Insights: "You spend most on Friday nights (avg ৳2,000). Most frequent on Wednesdays (8 txns/day)"
  4. Predictions: "If pattern continues, next Friday night: ৳1,800±500"

### 8.2 `/app/analytics/category-deep-dive`
**Goal:** Understand category-level trends

- **Sections:**
  1. Category selector dropdown
  2. Trend line: Selected category over 12 months
  3. Sub-breakdown: If selected category has parent, show siblings
  4. Outliers: Largest 10 transactions in this category
  5. Forecast: Next month prediction
  6. Comparisons: How this month vs last year

### 8.3 `/app/analytics/people-summary`
**Goal:** Lending relationship overview

- **Sections:**
  1. Settlement status: X settled / Y total
  2. Lending circle diagram (if data supports 5+ people)
  3. Person table: Name, balance, lent, borrowed, frequency, days-since-last-txn
  4. Alerts: Overdue debts (no activity in 30+ days)

### 8.4 `/app/analytics/account-health`
**Goal:** Multi-account portfolio view

- **Sections:**
  1. Pie: Allocation by account
  2. Pie: Allocation by currency
  3. Time series: Each account balance over 12 months
  4. Velocity: Inflow/outflow per account per month
  5. Growth rate: YoY comparison per account

### 8.5 `/app/analytics/cash-flow`
**Goal:** Complete income/expense/savings view

- **Sections:**
  1. Waterfall chart: Opening balance → +Income → -Expense → +Exchange → +People Net = Closing balance
  2. Monthly table: Each month's opening, income, expense, exchange, people net, closing, savings rate
  3. Trend: Is cash flow improving?

---

## Part 9: Micro-Insights & Notifications

### 9.1 Smart Alerts (Optional Notifications)

**Enable/disable per user in settings:**

- "Your spending this week is 40% above average"
- "You've settled 50% of your debts! 10 to go."
- "Dining expense jumped 50% this month. Worth reviewing?"
- "Largest expense today: ৳5,000 (vs avg ৳1,200)"
- "You're on track to save ৳20,000 this month!"
- "No transactions with Sarah in 60 days. Debt settled?"

### 9.2 Smart Widget Rotation

**On home page, rotate between insights:**

- One week: "This month you're saving 40% (vs 35% last month)"
- Next week: "Your favorite spending day: Friday (avg ৳2,500)"
- Next week: "Groceries are up 15% year-over-year"
- Next week: "You've lent $1,000 to Alex in 3 transactions"

---

## Part 10: Data Derivation Reference

### Formulas & Computations (No New Inputs Required)

| Insight | Formula | Source Data |
|---------|---------|-------------|
| Spending by day-of-week | `SUM(amount) GROUP BY date.dayOfWeek WHERE type IN (expense)` | Transactions + date |
| MoM change | `(current_month_sum - prior_month_sum) / prior_month_sum` | Transactions + date |
| Forecast | `LINREG(last_N_months, 1) → next_month` | Transactions + date |
| Category % | `category_sum / total_sum` | Transactions + categoryId |
| Settlement rate | `COUNT(people.balance == 0) / COUNT(people)` | Person balances |
| Days to month-end | `last_day_of_month - today` | System date |
| Savings rate | `(income - expense) / income` | Aggregated income/expense |
| Account growth % | `(current - prior) / prior * 100` | Account balances |
| Exchange gain | `to_amount - from_amount (in default currency)` | Exchange transactions |
| Lending velocity | `SUM(give + take) / day_span` | Give/take + date |

---

## Implementation Priority & Complexity

### Tier 1: Low Complexity (2–4 hour implementation each)
**High ROI, minimal new code**

- [ ] Day-of-week spending pattern (bar chart)
- [ ] MoM change indicators (% badges on existing tiles)
- [ ] Top outliers by category (sortable list)
- [ ] Multi-currency exposure pie chart
- [ ] Account balance trajectory (line chart)
- [ ] Spending spike alert (simple threshold)

### Tier 2: Medium Complexity (4–8 hour implementation each)
**More involved UI, significant new compute**

- [ ] Month-over-month/Year-over-year comparison page
- [ ] Category trend analysis (12-month line charts)
- [ ] People lending circle (network diagram, if library support)
- [ ] Spending patterns heatmap
- [ ] Cash flow waterfall
- [ ] Forecast modal (linear regression, confidence bands)

### Tier 3: High Complexity (8+ hour implementation each)
**New data structures, complex visualizations, or advanced math**

- [ ] Anomaly detection system (statistical alerts)
- [ ] Seasonality analysis (multivariate time-series)
- [ ] Predictive cash-flow model
- [ ] Dedicated analytics pages (5 new routes + state management)
- [ ] Smart notification system (with user preferences)

### Tier 4: Future / Nice-to-Have
**Beyond scope for now**

- Machine learning on spending patterns
- Budget-vs-actual tracking (requires schema: budgets table)
- Recurring transaction detection (algorithmic pattern matching)
- Export to external finance tools

---

## Summary: Why These Insights Matter

### User Value Propositions

1. **Visibility:** See patterns they didn't know they had (Friday night spending, seasonal peaks)
2. **Control:** Spot anomalies early, catch overspending before it becomes a crisis
3. **Planning:** Forecast income/expense, plan for high-spending seasons
4. **Accountability:** Track lending, settlements, see who you deal with most
5. **Confidence:** Know your savings rate, asset allocation, financial trajectory

### Technical Constraints (Respected)

- ✅ **No schema changes:** All derived from existing fields
- ✅ **No new user inputs:** All computed from transactions, dates, amounts
- ✅ **Backwards compatible:** Existing summary data remains unchanged
- ✅ **Privacy-first:** All analysis happens client-side (when possible) or on user's own data

---

## Implementation Roadmap (Hypothetical)

**Phase 1 (Week 1):** Tier 1 insights on Summary page (day-of-week, MoM badges, currency pie)  
**Phase 2 (Week 2):** Tier 1 extended tiles + sparklines + health checkup badge  
**Phase 3 (Week 3):** Tier 2 analytics pages (spending patterns, category deep-dive)  
**Phase 4 (Week 4):** Tier 2 people & account health pages  
**Phase 5 (Week 5):** Tier 3 anomaly detection + smart alerts  

---

## Conclusion

Cashly has all the raw data needed to become a **financial insight engine** without a single schema change. By layering analytics on top of existing transactions, the app can evolve from a **transaction tracker** to a **decision-support system**—helping users understand their money, spot problems early, and plan confidently.

The 34+ insights documented here represent **months of feature value** extracted from data already being collected. Start with Tier 1, validate with users, and iterate.
