WealthWatch Core

WealthWatch is a type-safe personal finance dashboard and analytics engine built to provide high-density financial asset monitoring, real-time data streaming, and autonomous multi-asset wealth tracking. The platform features an integrated AI-driven bank statement PDF extraction engine alongside client-side usage guardrails tied to dynamic billing tiers.

Architectural Architecture & Tech Stack
Framework: Next.js 14 (App Router) utilizing progressive server-side rendering (SSR) streaming

Language: TypeScript enforcing compile-time data integrity and full-stack type safety

Database ORM: Prisma Client linking directly to a transactional relational database instance

Styling Core: Tailwind CSS utilizing system-inherited semantic variables

Component System: Radix UI primitives / Shadcn UI integration layer

Payment Processing: Razorpay client-side SDK integrated with secure verification routes

Complete Project Workspace Mapping
wealthwatch/
├── prisma/
│   └── schema.prisma              # Database schemas (User, Transaction, Investment, Logs)
├── public/                        # Scalable vector graphics and branding static assets
├── src/
│   ├── actions/
│   │   └── auth.ts                # Server Actions (Login, Sign-out execution closures)
│   ├── api/
│   │   ├── auth/                  # NextAuth credentials authentication handlers
│   │   ├── dashboard/summary/     # Operational overview metric calculations
│   │   ├── investments/           # Multi-asset CRUD API endpoints
│   │   ├── payments/verify/       # Razorpay cryptographic token signature validation
│   │   ├── transactions/upload/   # Secure file ingestion stream and engine routes
│   │   ├── user/profile/          # Account preferences management routes
│   │   └── webhooks/events/       # Secondary payment gateway event streams
│   ├── app/
│   │   ├── layout.tsx             # Root template wrapper and global style injection
│   │   ├── page.tsx               # Primary guest landing page
│   │   ├── login/page.tsx         # Account authentication viewport
│   │   ├── register/page.tsx      # User onboarding viewport
│   │   └── dashboard/
│   │       ├── page.tsx           # Main Dashboard server canvas and column grid
│   │       └── billing/page.tsx   # Subscription management and audit log ledger
│   ├── components/dashboard/
│   │   ├── AnalyticsSkeleton.tsx     # Monospace placeholder loading grids
│   │   ├── InvestmentManager.tsx     # Portfolio grid displaying active tracking limits
│   │   ├── MacroNewsPanel.tsx        # High-density global market ticker
│   │   ├── NotificationContext.tsx   # Application-wide global toast dispatch system
│   │   ├── RazorpayUpgradeButton.tsx # Polymorphic checkout button component
│   │   ├── StreamingAdviceCard.tsx   # Asynchronous metric assessment container
│   │   ├── SummaryPanel.tsx          # Presentation structure for aggregate balances
│   │   ├── SummaryPanelClient.tsx    # Interactive client-side timeframe control bars
│   │   ├── SummarySection.tsx        # Server-side parallel database query layer
│   │   ├── TradingViewChart.tsx      # Integrated financial asset chart component
│   │   ├── UploadForm.tsx            # Terminal-style document dropzone
│   │   └── UserProfileDropdown.tsx   # Nav metadata and explicit telemetry records
│   └── lib/
│       ├── ai/
│       │   ├── financial-analyzer.ts # Large Language Model reasoning loops
│       │   └── pdf-processor.ts      # Unencrypted document statement data extractors
│       ├── auth/
│       │   └── tier-guard.ts         # Server-side route authorization verification middleware
│       ├── db.ts                     # Singleton Prisma client instance
│       └── market/
│           └── stock-engine.ts       # Quantitative market tracking systems
├── eslint.config.mjs                 # Strict static analysis configuration rules
├── next.config.ts                    # Optimized framework compilation settings
├── tailwind.config.ts                # Root styling configuration file
└── tsconfig.json                     # Type compiler path definitions

Component Interface Layout Specifications
1. Main Dashboard Shell (src/app/dashboard/page.tsx)
Acts as the central presentation canvas for the application. It executes asynchronous parallel data resolutions across core user transaction tables and investment tracking instances on the server before passing data down to child components. Maps components across a clean grid layout split into distinct workspace areas:

Navigation Row: Mounts branding components along the leading margin and attaches the explicit user options dropdown component to the trailing edge.

Analytics Row: Uses granular code splitting to encapsulate the primary portfolio asset metrics within a high-performance streaming framework.

Data Workstation Grid: Allocates screen real estate asymmetricly. Places the drag-and-drop document upload platform on top of global tracking channels in a single compact column layout, while devoting a double-column track to detailed transaction data streams.

2. Subscription Management Workspace (src/app/dashboard/billing/page.tsx)
A dedicated, high-fidelity sub-view designed entirely around subscription metrics, billing actions, and system clarity.

Account State Panel: Renders structural account badges checking the exact operational limits currently active on the user's workspace profile.

Access Range Matrix: Formats raw timestamps pulled from database subscription fields into highly scannable status lines detailing exact account expiration bounds.

Database System Logs: Integrates a tabular report reading directly from user security logs to display historical confirmation paths, tracking IP addresses, and user-agent signatures.

3. Usage Limits Enforcer (src/components/dashboard/InvestmentManager.tsx)
Manages portfolio wealth distributions while monitoring system limits. If a user's database count reveals they have hit the threshold limit under basic tier privileges, the component dynamically adapts:

It hides data input metrics behind a clean, blurred backdrop layer.

It displays a high-visibility message noting the restriction, using a prominent action link to route users cleanly to the payment processing container.

4. Telemetry Navigation Dropdown (src/components/dashboard/UserProfileDropdown.tsx)
An interactive popover structure that separates display constraints from critical session logic.

Accepts an explicit, type-safe prop signature processing live metrics alongside logout actions.

Integrates a double-column layout tracking transaction histories and asset thresholds.

Houses the payment component inline to trigger upgrade operations directly without requiring full navigation shifts.

Theme Integration Architecture
The platform relies on system variables inherited directly from the global theme configuration file to maintain a clean, high-density look without hardcoded styling rules:

Surface Tokens: Layout properties use system theme tags exclusively (bg-background, text-foreground, border-border, bg-card, bg-muted).

Typography Matrix: Section headers use clean sans-serif tracking rules (font-sans tracking-tight font-medium), while numbers, balance logs, and feed columns use strict monospace layout systems (font-mono) to guarantee vertical mathematical data alignment.

Structural Separation: Visual boundaries avoid blocky design frames, separating panels through low-opacity rule borders (border-white/[0.06] or border-zinc-800/60).

System Initialization & Execution Loops
Configure local tracking keys inside your environment file (.env):

Plaintext
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your_secret_key_here"
Generate client structures and trigger schema migrations:

Bash
npx prisma generate
npx prisma migrate dev
Wipe old compilation route tracking artifacts out of memory and boot the server:

Bash
rm -rf .next
npm run dev