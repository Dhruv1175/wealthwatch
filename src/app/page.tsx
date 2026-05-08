import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-brand-black text-brand-white font-sans antialiased overflow-x-hidden selection:bg-mint-500/20">
      {/* Grid overlay */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl flex items-center justify-between px-4 h-[60px] md:px-12">
        <div className="flex items-center gap-2.5 text-sm md:text-[15px] shrink-0 font-medium uppercase tracking-[0.12em] text-brand-white">
          <span className="flex items-center justify-center w-6 h-6 border border-mint-600">
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none">
              <polyline points="1,10 4,6 7,8 10,3 13,5" stroke="#22C55E" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          WealthWatch
        </div>
        <ul className="hidden md:flex gap-9 list-none">
          <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Product</a></li>
          <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Markets</a></li>
          <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Pricing</a></li>
          <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Enterprise</a></li>
          <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Docs</a></li>
        </ul>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="text-xs md:text-[13px] font-medium text-brand-white bg-brand-black border border-brand-white px-3 md:px-5 py-1.5 md:py-2 tracking-[0.04em] hover:bg-brand-white hover:text-brand-black transition-all">
            Get started →
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen grid grid-cols-1 md:grid-cols-2 border-b border-white/10">
        {/* Left Column - Hero Content */}
        <div className="col-span-1 flex px-6 pt-32 md:px-16 md:pt-[120px] pb-12 md:pb-20 border-r-0 md:border-r border-white/10 flex-col justify-center">
          <span className="inline-flex items-center gap-2 text-[11px] font-normal tracking-[0.14em] uppercase text-sky-400 font-mono mb-6 md:mb-10">
            <span className="block w-5 h-px bg-sky-400" />
            Portfolio Intelligence Platform
          </span>
          <h1 className="text-[clamp(38px,10vw,72px)] font-light leading-[1.05] tracking-[-0.02em] mb-6 md:mb-8 mt-5 md:mt-0">
            Know your <br /> <em className="not-italic text-gray-400">wealth.</em><br />Down to <br /> the basis point.
          </h1>
          <p className="text-sm md:text-base text-gray-400 leading-7 max-w-[420px] mb-8 md:mb-12">
            WealthWatch is the institutional-grade dashboard for investors who demand precision. Real-time analytics, multi-account aggregation, and zero noise.
          </p>
          <div className="flex sm:items-center gap-4 sm:flex-row items-start flex-col">
            <a
              href="#signin-card"
              className="group font-sans text-sm font-medium text-brand-black bg-brand-white border-none py-3.5 px-8 tracking-[0.02em] inline-flex items-center gap-2.5 hover:bg-gray-200 transition-all no-underline " 
            >
              Start Tracking
              <svg className="-ml-1 transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
          <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-white/10 grid grid-cols-3 gap-4 md:gap-8">
            <div>
              <div className="text-xl md:text-[26px] font-medium tracking-[-0.02em] text-mint-500 mb-1">$4.2T</div>
              <div className="text-[9px] md:text-[11px] text-gray-500 tracking-[0.08em] uppercase font-mono">Assets Tracked</div>
            </div>
            <div>
              <div className="text-xl md:text-[26px] font-medium tracking-[-0.02em] mb-1">280K</div>
              <div className="text-[9px] md:text-[11px] text-gray-500 tracking-[0.08em] uppercase font-mono">Active Portfolios</div>
            </div>
            <div>
              <div className="text-xl md:text-[26px] font-medium tracking-[-0.02em] mb-1">99.99%</div>
              <div className="text-[9px] md:text-[11px] text-gray-500 tracking-[0.08em] uppercase font-mono">Data Accuracy</div>
            </div>
          </div>
        </div>

        {/* Right Column - Hero Dashboard Mockup */}
        <div className="col-span-1 relative pt-8 md:pt-[60px] px-4 md:px-0 flex flex-col overflow-hidden">
          <div className="md:mx-8 flex-1 border border-white/10 border-b-0 bg-gray-950 relative overflow-x-auto md:overflow-hidden">
            <div className="border-b border-white/10 px-4 md:px-5 py-3.5 flex items-center justify-between min-w-[480px] md:min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
                  <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                  <span className="w-2 h-2 rounded-full bg-[#28CA41]" />
                </div>
                <span className="text-xs text-gray-500 font-mono">wealthwatch — dashboard</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 tracking-[0.08em]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-mint-500 animate-live-pulse mr-1.5" /> LIVE
              </span>
            </div>
            <div className="grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr] h-[calc(100%-45px)] min-w-[480px] md:min-w-0">
              {/* Sidebar */}
              <div className="border-r border-white/10 py-5">
                {[
                  {
                    label: "Overview",
                    active: true,
                    icon: (
                      <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1" />
                        <rect x="8" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1" />
                        <rect x="1" y="8" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1" />
                        <rect x="8" y="8" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    ),
                  },
                  {
                    label: "Portfolio",
                    icon: (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                        <polyline points="1,10 4,7 7,8 10,4 13,6" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    label: "History",
                    icon: (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
                        <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    label: "Markets",
                    icon: (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                        <rect x="2" y="2" width="10" height="10" rx="0.5" stroke="currentColor" strokeWidth="1" />
                        <path d="M2 6h10M6 2v10" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    ),
                  },
                  {
                    label: "Alerts",
                    icon: (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1L9 5h4l-3 3 1.5 4L7 10l-4.5 2L4 8 1 5h4z" stroke="currentColor" strokeWidth="1" fill="none" strokeLinejoin="round" />
                      </svg>
                    ),
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 px-3 md:px-5 py-2 text-xs cursor-default ${
                      item.active ? "text-brand-white bg-gray-800" : "text-gray-500"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </div>
              {/* Main Content */}
              <div className="p-4 md:p-5 overflow-hidden">
                <div className="text-[10px] font-mono text-gray-500 tracking-[0.1em] mb-1.5">Total Portfolio Value</div>
                <div className="text-xl md:text-[28px] font-medium tracking-[-0.02em] mb-1">
                  $284,<span className="animate-blink">|</span>917.40
                </div>
                <div className="text-xs md:text-[11px] text-mint-500 font-mono flex items-center gap-1 mb-4">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 7L5 3l3 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  +$3,241.18 today (↑1.15%)
                </div>

                <svg className="w-full h-[60px] md:h-[90px]" viewBox="0 0 280 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="22" x2="280" y2="22" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="44" x2="280" y2="44" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="66" x2="280" y2="66" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <path
                    d="M0,72 L20,65 L40,70 L60,58 L80,62 L100,48 L120,52 L140,40 L160,35 L180,42 L200,30 L220,22 L240,18 L260,12 L280,8 L280,90 L0,90 Z"
                    fill="url(#chartFill)"
                  />
                  <path
                    className="animate-chart-draw"
                    d="M0,72 L20,65 L40,70 L60,58 L80,62 L100,48 L120,52 L140,40 L160,35 L180,42 L200,30 L220,22 L240,18 L260,12 L280,8"
                    stroke="#22C55E"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="1000"
                  />
                  <circle cx="280" cy="8" r="3" fill="#22C55E" opacity="0" className="animate-fade-up" style={{ animationDelay: "2.8s" }} />
                  <text x="0" y="88" fill="#555" fontSize="7" fontFamily="monospace">Jan</text>
                  <text x="60" y="88" fill="#555" fontSize="7" fontFamily="monospace">Mar</text>
                  <text x="130" y="88" fill="#555" fontSize="7" fontFamily="monospace">Jun</text>
                  <text x="200" y="88" fill="#555" fontSize="7" fontFamily="monospace">Sep</text>
                  <text x="258" y="88" fill="#555" fontSize="7" fontFamily="monospace">Now</text>
                </svg>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="border border-white/10 p-2.5 bg-gray-900">
                    <div className="text-[9px] text-gray-500 font-mono tracking-[0.08em] uppercase mb-1">Equities</div>
                    <div className="text-sm md:text-[15px] font-medium text-mint-500">+8.4%</div>
                  </div>
                  <div className="border border-white/10 p-2.5 bg-gray-900">
                    <div className="text-[9px] text-gray-500 font-mono tracking-[0.08em] uppercase mb-1">Expenses</div>
                    <div className="text-sm md:text-[15px] font-medium text-error-500">−$1,240</div>
                  </div>
                  <div className="border border-white/10 p-2.5 bg-gray-900">
                    <div className="text-[9px] text-gray-500 font-mono tracking-[0.08em] uppercase mb-1">Cash</div>
                    <div className="text-sm md:text-[15px] font-medium text-sky-400">$12,400</div>
                  </div>
                </div>

                <div className="mt-3.5">
                  <div className="text-[9px] font-mono text-gray-500 tracking-[0.1em] uppercase border-b border-white/10 pb-1.5 mb-2">
                    Recent Transactions
                  </div>
                  {[
                    { icon: "↑", name: "NVDA Dividend", cat: "INCOME", amt: "+$341.00", pos: true },
                    { icon: "↓", name: "Rent — Oct", cat: "HOUSING", amt: "−$2,400.00", pos: false },
                    { icon: "⇌", name: "AAPL × 3 shares", cat: "TRADE", amt: "+$614.72", pos: true },
                  ].map((tx, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-white/[0.04] text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 md:w-[22px] h-5 md:h-[22px] border border-white/10 flex items-center justify-center text-[10px] shrink-0">
                          {tx.icon}
                        </span>
                        <div>
                          <div className="text-gray-300 text-xs md:text-[11px]">{tx.name}</div>
                          <div className="text-[9px] text-gray-500 font-mono">{tx.cat}</div>
                        </div>
                      </div>
                      <span className={`font-mono text-xs md:text-[11px] ${tx.pos ? "text-mint-500" : "text-error-500"}`}>
                        {tx.amt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Band */}
      <section className="border-b border-white/10 grid grid-cols-2 md:grid-cols-4">
        {[
          { val: "$4.2", sup: "T", desc: "Total assets under tracking" },
          { val: "+0.3", sup: "ms", desc: "Average data latency", color: "text-mint-500" },
          { val: "280", sup: "K", desc: "Active portfolios" },
          { val: "12K", sup: "+", desc: "Securities tracked globally" },
        ].map((m, i) => (
          <div key={i} className="p-4 md:p-10 border-r-0 md:border-r border-white/10 even:border-r-0 md:even:border-r md:last:border-r-0 border-b md:border-b-0">
            <div className={`text-2xl md:text-4xl font-light tracking-[-0.03em] mb-1 md:mb-2 ${m.color || ""}`}>
              {m.val}<sup className="text-sm md:text-lg text-gray-500">{m.sup}</sup>
            </div>
            <div className="text-xs md:text-[13px] text-gray-500 leading-5">{m.desc}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="border-b border-white/10">
        <div className="px-6 md:px-12 pt-12 md:pt-16 pb-8 md:pb-10 border-b border-white/10">
          <div className="text-[11px] font-mono text-gray-500 tracking-[0.12em] uppercase mb-4">Platform Capabilities</div>
          <h2 className="text-2xl md:text-[32px] font-light tracking-[-0.02em] max-w-2xl">Built for precision.<br />Designed for clarity.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: "mint", title: "Live Portfolio Tracking", desc: "Sub-second data refresh across equities..." },
            { icon: "sky", title: "Multi-Account Aggregation", desc: "Connect brokerage, bank, and crypto accounts..." },
            { icon: "red", title: "Expense Intelligence", desc: "Automatic categorization and budget alerts..." },
            { icon: "sky", title: "Risk & Alert Engine", desc: "Configurable threshold alerts for drawdown..." },
            { icon: "mint", title: "Performance Attribution", desc: "Decompose returns by sector, asset class..." },
            { icon: "red", title: "Tax-Loss Harvesting", desc: "Surface unrealized losses with optimal harvesting..." },
          ].map((f, i) => (
            <div
              key={i}
              className="p-6 md:p-12 border-r-0 md:border-r border-white/10 border-b md:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0 last:border-b-0 md:last:border-b"
            >
              <div
                className={`w-10 h-10 border border-white/10 flex items-center justify-center mb-6 ${
                  f.icon === "sky" ? "text-sky-400" : f.icon === "mint" ? "text-mint-500" : "text-error-500"
                }`}
              >
                {i === 0 && (
                  <svg viewBox="0 0 18 18" className="w-4.5 h-4.5" fill="none">
                    <polyline points="1,14 5,9 9,11 13,5 17,7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="17" cy="7" r="1.5" fill="currentColor" />
                  </svg>
                )}
                {i === 1 && (
                  <svg viewBox="0 0 18 18" className="w-4.5 h-4.5" fill="none">
                    <rect x="2" y="2" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M2 7h14M7 2v14" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                )}
                {i === 2 && (
                  <svg viewBox="0 0 18 18" className="w-4.5 h-4.5" fill="none">
                    <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                )}
                {i === 3 && (
                  <svg viewBox="0 0 18 18" className="w-4.5 h-4.5" fill="none">
                    <path d="M9 1l2.5 5 5.5.8-4 3.9.9 5.5L9 13.5 4.1 16.2l.9-5.5L1 6.8l5.5-.8z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                  </svg>
                )}
                {i === 4 && (
                  <svg viewBox="0 0 18 18" className="w-4.5 h-4.5" fill="none">
                    <rect x="3" y="10" width="2.5" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
                    <rect x="7.5" y="6" width="2.5" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
                    <rect x="12" y="2" width="2.5" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                )}
                {i === 5 && (
                  <svg viewBox="0 0 18 18" className="w-4.5 h-4.5" fill="none">
                    <path d="M3 3h12v12H3z" stroke="currentColor" strokeWidth="1.4" fill="none" />
                    <path d="M3 8h12M8 3v12" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M6 6l6 6M12 6L6 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <h3 className="text-base font-medium mb-3">{f.title}</h3>
              <p className="text-[13px] text-gray-500 leading-7">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Charts & Allocation */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_480px] border-b border-white/10">
        <div className="p-6 md:p-16 border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="text-[11px] font-mono text-gray-500 tracking-[0.12em] uppercase mb-4">Portfolio Analytics</div>
          <h2 className="text-2xl md:text-[28px] font-light mb-2">12-Month Total Return</h2>
          <p className="text-sm md:text-[13px] text-gray-500 mb-6 md:mb-10">All asset classes, net of fees</p>
          <svg className="w-full h-48 md:h-60" viewBox="0 0 480 240" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bigFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="60" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="60" y1="65" x2="480" y2="65" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="60" y1="110" x2="480" y2="110" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="60" y1="155" x2="480" y2="155" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="60" y1="200" x2="480" y2="200" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x="48" y="23" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="end">+30%</text>
            <text x="48" y="68" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="end">+20%</text>
            <text x="48" y="113" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="end">+10%</text>
            <text x="48" y="158" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="end">0%</text>
            <text x="48" y="203" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="end">−10%</text>
            <line x1="60" y1="155" x2="480" y2="155" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <path d="M60,175 L100,168 L140,160 L180,155 L220,148 L260,140 L300,132 L340,125 L380,118 L420,110 L480,105" stroke="#0EA5E9" strokeWidth="1" fill="none" strokeDasharray="4,3" opacity="0.5" />
            <path d="M60,190 L100,178 L140,168 L180,162 L220,145 L260,130 L300,110 L340,85 L380,70 L420,50 L480,30 L480,200 L60,200 Z" fill="url(#bigFill)" />
            <path className="animate-chart-draw" d="M60,190 L100,178 L140,168 L180,162 L220,145 L260,130 L300,110 L340,85 L380,70 L420,50 L480,30" stroke="#22C55E" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1000" />
            <text x="60" y="220" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="middle">Jan</text>
            <text x="140" y="220" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="middle">Mar</text>
            <text x="220" y="220" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="middle">May</text>
            <text x="300" y="220" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="middle">Jul</text>
            <text x="380" y="220" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="middle">Sep</text>
            <text x="460" y="220" fill="#555" fontSize="9" fontFamily="monospace" textAnchor="middle">Nov</text>
            <line x1="300" y1="15" x2="320" y2="15" stroke="#22C55E" strokeWidth="1.5" />
            <text x="325" y="19" fill="#888" fontSize="9" fontFamily="monospace">Portfolio</text>
            <line x1="390" y1="15" x2="410" y2="15" stroke="#0EA5E9" strokeWidth="1" strokeDasharray="4,3" />
            <text x="415" y="19" fill="#888" fontSize="9" fontFamily="monospace">Benchmark</text>
          </svg>
        </div>
        <div className="p-6 md:p-16 flex flex-col gap-5">
          <div>
            <div className="text-[11px] font-mono text-gray-500 tracking-[0.12em] uppercase mb-5">Asset Allocation</div>
            {[
              { label: "US Equities", pct: "42%", width: "42%", color: "bg-mint-500" },
              { label: "Int’l Equities", pct: "18%", width: "18%", color: "bg-sky-500" },
              { label: "Fixed Income", pct: "22%", width: "22%", color: "bg-gray-500" },
              { label: "Real Assets", pct: "10%", width: "10%", color: "bg-gray-600" },
              { label: "Cash & Alts", pct: "8%", width: "8%", color: "bg-error-500" },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 mt-[18px] first:mt-0">
                <span className="text-[13px] text-gray-300 min-w-[80px]">{a.label}</span>
                <div className="flex-1 h-0.5 bg-gray-800"><div className={`h-0.5 ${a.color}`} style={{ width: a.width }} /></div>
                <span className="text-[12px] font-mono text-gray-500 min-w-[36px] text-right">{a.pct}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-7 mt-2">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "SHARPE RATIO", val: "1.84", color: "text-mint-500" },
                { label: "MAX DRAWDOWN", val: "−8.2%", color: "text-error-500" },
                { label: "BETA", val: "0.73" },
                { label: "ALPHA (ann.)", val: "+4.1%", color: "text-mint-500" },
              ].map((m, i) => (
                <div key={i}>
                  <div className="text-[10px] font-mono text-gray-500 tracking-[0.08em] mb-1.5">{m.label}</div>
                  <div className={`text-[22px] font-medium ${m.color || ""}`}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 md:px-12 py-12 md:py-24 border-b border-white/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
        {[
          { text: "“This is what Bloomberg Terminal would look like if it were designed in 2025. I cancelled three separate tools after the first month.”", author: "Priya Mehta", role: "Managing Director, Apex Capital" },
          { text: "“The expense tracking alone paid for itself. WealthWatch caught a billing error I’d been missing for eight months.”", author: "James Thornton", role: "Independent Investor, London" },
          { text: "“The interface is surgical. No clutter, no upsells — just the numbers I need to make decisions. Finally.”", author: "Ananya Krishnan", role: "Quant Analyst, Beacon Ridge" },
        ].map((t, i) => (
          <div key={i} className="pt-8 border-t border-white/10">
            <p className="text-base font-light leading-7 text-gray-300 italic mb-6">{t.text}</p>
            <div className="text-xs font-mono text-gray-500">
              <strong className="text-gray-300 font-normal block mb-0.5">{t.author}</strong>
              {t.role}
            </div>
          </div>
        ))}
      </section>

      {/* Sign In */}
      <section className="grid grid-cols-1 lg:grid-cols-2 border-b border-white/10">
        <div className="px-6 md:px-16 py-12 md:py-24 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-center">
          <div className="text-[11px] font-mono text-sky-400 tracking-[0.12em] uppercase mb-5">Get Started — Free</div>
          <h2 className="text-3xl md:text-[40px] font-light tracking-[-0.02em] leading-[1.1] mb-6">Your portfolio.<br />Complete clarity.</h2>
          <p className="text-sm md:text-sm text-gray-500 mb-8 md:mb-10 leading-7">Connect your accounts in under 60 seconds...</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-[13px] text-gray-500"><span className="text-mint-500">✓</span> 30-day free trial</div>
            <div className="flex items-center gap-2.5 text-[13px] text-gray-500"><span className="text-mint-500">✓</span> Bank-level encryption</div>
            <div className="flex items-center gap-2.5 text-[13px] text-gray-500"><span className="text-mint-500">✓</span> SOC 2 Type II certified</div>
          </div>
        </div>
        <div className="px-6 md:px-16 py-12 md:py-24 flex flex-col justify-center bg-gray-950" id="signin-card">
          <div className="border border-white/10 p-6 md:p-10 flex flex-col gap-4">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="flex items-center justify-center gap-3 w-full py-3.5 bg-brand-white text-brand-black font-sans text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <svg viewBox="0 0 18 18" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>
            </form>
            <div className="flex items-center gap-3 text-[11px] text-gray-600 font-mono before:flex-1 before:h-px before:bg-white/10 after:flex-1 after:h-px after:bg-white/10">
              OR
            </div>
            <input
              type="email"
              placeholder="name@company.com"
              className="w-full py-3 px-4 bg-brand-black border border-white/10 text-brand-white font-sans text-sm outline-none focus:border-sky-500 transition-colors placeholder:text-gray-600"
            />
            <button className="w-full py-3 font-sans text-sm font-medium text-brand-black bg-brand-white border border-brand-white hover:bg-gray-200 transition-colors">
              Continue with email →
            </button>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              By continuing, you agree to our <a href="#" className="text-gray-500">Terms of Service</a> and <a href="#" className="text-gray-500">Privacy Policy</a>. WealthWatch uses read‑only access to your financial accounts. We never execute trades on your behalf.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="px-6 md:px-12 py-8 md:py-12 grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-white/10">
          <div className="col-span-1">
            <div className="text-[13px] font-medium uppercase tracking-[0.12em] mb-3">WealthWatch</div>
            <p className="text-xs text-gray-500 leading-6 max-w-[200px]">Institutional-grade portfolio intelligence for the modern investor.</p>
          </div>
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.1em] uppercase text-gray-500 font-mono mb-4">Product</h4>
            <ul className="list-none flex flex-col gap-2.5">
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Dashboard</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Analytics</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Alerts</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Tax Reports</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Mobile App</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.1em] uppercase text-gray-500 font-mono mb-4">Company</h4>
            <ul className="list-none flex flex-col gap-2.5">
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">About</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Blog</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Careers</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Press</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.1em] uppercase text-gray-500 font-mono mb-4">Legal</h4>
            <ul className="list-none flex flex-col gap-2.5">
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Privacy Policy</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Terms of Service</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Security</a></li>
              <li><a href="#" className="text-[13px] text-gray-500 hover:text-brand-white">Compliance</a></li>
            </ul>
          </div>
        </div>
        <div className="px-6 md:px-12 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-[11px] text-gray-600 font-mono">© 2026 WealthWatch, Inc.</span>
          <div className="flex gap-4 md:gap-6">
            <a href="#" className="text-[11px] text-gray-600 font-mono hover:text-gray-400">Status</a>
            <a href="#" className="text-[11px] text-gray-600 font-mono hover:text-gray-400">SOC 2</a>
            <a href="#" className="text-[11px] text-gray-600 font-mono hover:text-gray-400">API</a>
            <a href="#" className="text-[11px] text-gray-600 font-mono hover:text-gray-400">Changelog</a>
          </div>
        </div>
      </footer>
    </div>
  );
}