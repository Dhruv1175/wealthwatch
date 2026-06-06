# WealthWatch

**Live:** [wealthwatch-ten.vercel.app](https://wealthwatch-ten.vercel.app)

A full-stack personal finance and investment tracking platform built for Indian retail investors. Tracks equities, mutual funds, FDs, gold, crypto, PPF, EPF, NPS, real estate, and more — with AI-powered bank statement parsing, live market prices, XIRR calculations, portfolio health scoring, and goal-based financial planning.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router, Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS design system |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js (Google OAuth + credentials) |
| AI | Groq (llama-3.3-70b) — PDF parsing, categorization, financial advice |
| Market Data | Yahoo Finance (yahoo-finance2) |
| Payments | Razorpay (Pro tier upgrade) |
| File Uploads | Cloudinary (profile photos) |
| Deployment | Vercel |

---

## Features

### Transaction Management
- AI-powered PDF bank statement ingestion — extracts transactions from any digital e-statement using Groq
- OCR fallback for scanned documents (tesseract.js + sharp)
- Deduplication via SHA-256 content hash — re-uploading the same statement won't create duplicates
- Confidence scoring — low-confidence extractions are flagged
- Manual transaction entry with AI auto-categorization (single Groq call, 20 tokens max)
- 15 categories: SALARY, INCOME, FOOD, HOUSING, UTILITIES, TRANSPORT, HEALTHCARE, ENTERTAINMENT, SHOPPING, EDUCATION, INSURANCE, SUBSCRIPTION, EMI, TAX, OTHER
- Full paginated transactions page with category filters
- BASIC tier: 50 transactions max · PRO tier: unlimited

### Portfolio Tracking
Supports 15 asset types with completely separate add forms per type:

| Asset Type | Key Fields |
|---|---|
| Direct Equity / ETF / US Stock | Ticker, shares, avg buy price, exchange, sector, broker |
| SIP / Mutual Fund | Fund name, monthly SIP amount, debit day, units accumulated, current NAV, folio, ISIN |
| MF Lumpsum | Fund name, units purchased, purchase NAV, folio, ISIN |
| Fixed Deposit | Bank name, principal, interest rate %, start date, maturity date |
| Recurring Deposit | Bank name, monthly instalment, interest rate %, maturity date |
| Bond / Debenture | Bond name, ISIN, units, purchase price, coupon rate, maturity date |
| Gold (Physical) | Weight in grams, avg purchase price per gram |
| Gold (SGB) | Units (1 = 1 gram), issue price, series name, maturity date |
| Gold (ETF / MF) | Ticker, units, avg buy price |
| Cryptocurrency | Coin name, ticker, quantity, avg buy price in ₹, exchange |
| PPF | Bank/PO, current balance, annual contribution, account opened date, maturity date |
| EPF | Employer name, total balance, monthly contribution, UAN |
| NPS | Fund manager, Tier I/II, balance, monthly contribution, PRAN |
| Real Estate | Property description, purchase price, current market value, purchase date, rental income |
| Other | Asset name, current value, cost |

### Client-Side Return Calculations
All fixed-income / retirement calculations run in the browser — no extra API call:

- **FD** — compound interest quarterly (A = P × (1 + r/n)^nt), shows current accrued interest and maturity amount
- **RD** — each instalment compounded for its remaining term at quarterly rate
- **SIP** — FV = P × [(1 + i)^n − 1] / i × (1 + i), uses actual units × current NAV when available
- **PPF** — projects maturity from current balance + future contributions at 7.1% p.a.
- **SGB** — gold price appreciation + 2.5% p.a. interest on issue price
- Live preview card in the add form updates on every keystroke

### XIRR (Extended IRR)
- Newton-Raphson method, converges to 7 decimal places
- Per-position XIRR using `InvestmentCashFlow` records (BUY / SELL / DIVIDEND / SIP_INSTALMENT)
- Portfolio-wide XIRR across all cash flows
- Backfill script included for existing positions

### Portfolio Analytics
- **Health Score (0–100 / A–F grade)** — diversification (0–25), returns (0–25), risk balance (0–25), consistency (0–25)
- **Allocation breakdown** — by asset type and currency with concentration warning (>30% single holding)
- **Tax summary** — STCG (20%) and LTCG (12.5% above ₹1.25L exemption), post-budget 2024 rates
- Physical gold P&L — inline price-per-gram input on each card for manual price entry
- Real estate P&L — uses `currentMarketValue` stored in DB (separate from purchase price)

### Financial Goals
- Create goals by category: Retirement, Education, Home, Vehicle, Emergency Fund, Vacation, Wedding, Business, Other
- Link investments to goals via `goalId` on each position
- Goal calculator: set expected return % and monthly addition → instantly computes months to goal, expected date, required monthly SIP, 10-year projection chart
- Unlinked investments banner shows how much wealth is not tracked toward any goal
- Summary stats: total goals, goals achieved, overall corpus progress

### Live Market Data
- NSE/BSE equities via Yahoo Finance (`.NS` / `.BO` suffix)
- US stocks via Yahoo Finance
- Gold futures (GC=F), Crude Oil (CL=F)
- USD/INR live forex rate (USDINR=X)
- Market news feed via Yahoo Finance search (first ticker or RELIANCE.NS / TCS.NS fallback)
- SIP reminder engine — fires when today is within 2 days of the SIP debit day

### AI Financial Advice
- Powered by Groq llama-3.3-70b (temperature 0.2)
- Three-section analysis: Temporal Health Diagnosis, Portfolio Optimization & Rebalancing, High-Yield Capital Allocation
- SEBI advisor disclaimer — always visible, cannot be dismissed
- Growth tips: 50/30/20 rule, emergency fund sizing, SIP automation, ELSS tax saving, category tracking

### Tier System

| Feature | BASIC | PRO |
|---|---|---|
| Investment positions | 5 max | Unlimited |
| Transaction records | 50 max | Unlimited |
| AI PDF statement parsing | 3/month | Unlimited |
| Real-time price feeds | ✓ | ✓ |
| Portfolio news | ✓ | ✓ |
| Annual analytics view | ✗ | ✓ |
| AI financial advisor | ✗ | ✓ |
| CSV/PDF export | ✗ | ✓ |
| Tax-loss harvesting signals | ✗ | ✓ |
| Security audit log | ✗ | ✓ |

Upgrade via Razorpay (₹1,299/year). HMAC signature verification on webhook.

---

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                  # Overview — transaction preview, PDF upload, news
│   │   ├── layout.tsx                # FAB + NotificationProvider (shared across all dashboard routes)
│   │   ├── portfolio/page.tsx        # Read-only portfolio overview with analytics
│   │   ├── transactions/page.tsx     # Full paginated transactions with category filters
│   │   ├── goals/page.tsx            # Goal planner with calculator and projections
│   │   ├── billing/page.tsx          # Subscription management
│   │   └── settings/page.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── api/
│       ├── investments/route.ts      # GET (with XIRR + analytics) / POST
│       ├── transactions/
│       │   ├── route.ts              # GET paginated
│       │   ├── manual/route.ts       # POST single transaction
│       │   └── categorize/route.ts   # POST AI category suggestion
│       ├── goals/
│       │   ├── route.ts              # GET / POST
│       │   └── [id]/route.ts         # DELETE / PATCH
│       ├── portfolio/route.ts        # GET portfolio with price hydration
│       ├── billing/create-order/route.ts
│       └── payments/verify/route.ts
├── components/dashboard/
│   ├── InvestmentManager.tsx         # Full add/delete/sell/analytics client component
│   ├── Sidebar.tsx                   # Fixed nav with route-aware active states
│   ├── UserProfileDropdown.tsx       # Tier-aware profile dropdown
│   ├── AddTransactionButton.tsx      # FAB (floating action button)
│   ├── AddTransactionModal.tsx       # Manual transaction entry modal
│   ├── SummarySection.tsx            # Server component — analytics + timeframe gate
│   ├── SummaryPanelClient.tsx        # Client charts and timeframe switcher
│   ├── FinancialAdvicePanel.tsx      # AI advice + disclaimer + growth tips
│   ├── MacroNewsPanel.tsx            # Yahoo Finance news feed
│   ├── TradingViewChart.tsx          # Embedded TradingView widget
│   ├── UploadForm.tsx                # PDF upload form
│   ├── RazorpayUpgradeButton.tsx     # Razorpay checkout trigger
│   └── NotificationContext.tsx       # Toast notification system
└── lib/
    ├── parsers/statement-pipeline.ts # PDF extraction with OCR fallback + deduplication
    ├── portfolio/analytics.ts        # XIRR, allocation, health score, tax summary
    ├── market/stock-engine.ts        # Yahoo Finance price + news fetching
    ├── ai/financial-analyzer.ts      # Groq financial advice + advanced summary
    └── utils/
        ├── currencyUtils.ts          # Symbol lookup + formatting (₹/$€£¥ etc.)
        └── investmentCalculations.ts # FD, RD, SIP, PPF, SGB calculations
```

---

## Database Schema

Key models (PostgreSQL via Prisma):

- **User** — tier (BASIC/PRO), subscriptionEnd, accounts, investments, transactions, goals, portfolios, taxEvents
- **Investment** — 15 asset types, extended fields: isin, folioNumber, broker, currency, exchange, sector, maturityDate, interestRate, lockInDate, currentMarketValue, tags, goalId, portfolioId
- **InvestmentCashFlow** — BUY / SELL / DIVIDEND / INTEREST / SIP_INSTALMENT / BONUS_UNITS / REDEMPTION (feeds XIRR)
- **Transaction** — amount, description, category, date
- **FinancialGoal** — targetAmount, targetDate, category (9 types), linked investments
- **Portfolio** — named grouping of investments with color
- **TaxEvent** — realized gains/losses with STCG/LTCG/STCL/LTCL classification
- **SystemEvent** — audit log
- **SecurityAuditLog** — IP, user agent per event

---

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/yourusername/wealthwatch
cd wealthwatch
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in: DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
#          GROQ_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
#          NEXT_PUBLIC_RAZORPAY_KEY_ID, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
#          NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

# 3. Database setup
npx prisma migrate dev
npx prisma generate

# 4. (Optional) Backfill opening cash flows for existing investments
npx ts-node scripts/seed-cashflows.ts

# 5. Run
npm run dev
```

### Optional dependencies (OCR + CAS parsing)
```bash
npm install tesseract.js sharp  # OCR fallback for scanned PDFs
npm install cas-parser          # CAMS/KFintech CAS file import
```

---

## Environment Variables

```env
DATABASE_URL=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GROQ_API_KEY=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

---

## Roadmap

- [ ] Zerodha Kite Connect API integration (Pro-gated broker sync)
- [ ] CAS file import via `cas-parser` (CAMS + KFintech)
- [ ] AMFI NAV auto-update via daily cron (free public API)
- [ ] SIP instalment auto-logging (mark SIP as paid → creates cash flow record)
- [ ] AWS Textract for production-quality scanned PDF OCR
- [ ] CSV import (Zerodha Coin, Kuvera, Groww exports)
- [ ] Overlap detection between mutual fund holdings
- [ ] Mobile app (React Native / Expo)

---

## License

MIT