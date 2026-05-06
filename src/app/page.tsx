import { auth, signIn } from "@/auth";
import {redirect} from "next/navigation";


export default async function Home() {

  const session = await auth();
  if(session){
    redirect("/dashboard");
  }


  return (
   <div className="relative min-h-screen flex flex-col bg-brand-black text-brand-white font-sans antialiased overflow-x-hidden selection:bg-mint-500/20">
    <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"/>
    {/* Navigation Bar */}
    <nav className=" fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl flex items-center justify-between px-12 h-[60px] ">
    <div className=" flex items-center gap-2.5 text-[15px] font-medium uppercase tracking-[0.12em] text-brand-white ">
      <span className ="flex items-center justify-center w-6 h-6 border border-mint-600">
        <svg viewBox="0 0 14 14 " className="w-3.5 h-3.5 " fill="none">
          <polyline points="1,10 4,6 7,8 10,3 13,5" stroke="#22C55E" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      WealthWatch
    </div>
    <ul className="flex gap-9 list-none">
      <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Product</a></li>
      <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors"> Markets</a></li>
      <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Pricing</a></li>
      <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Enterprise</a></li>
      <li><a href="#" className="text-[13px] text-gray-400 no-underline tracking-[0.04em] hover:text-brand-white transition-colors">Docs</a></li>
    </ul>
    <div className="flex items-center gap-3">
      <button onClick={async ()=>{
        "use server";
        await signIn("google")
      }} className="font-sans text-[13px] font-medium text-brand-white bg-brand-black border border-brand-white px-5 py-2 tracking-[0.04em] hover:bg-brand-white hover:text-brand-black transition-all">Get started →</button>
    </div>
    </nav>
{/* Hero Section */}
    <section className="min-h-screen grid grid-cols-2 border-b border-brand-white/10">
    {/* Left Column - Hero Content */}
    <div className="col-span-1 flex px-16 pt-[120px] pb-20 border-r border-white/10 flex-col justify-center">
        <span className="inline-flex items-center gap-2 text-[11px] font-normal tracking-[0.14em] uppercase text-sky-400 font-mono mb-10">
          <span className="block w-5 h-px bg-sky-400">Portfolio Intelligence Platform </span>
        </span>
        <h1 className="text-[clamp(42px,4.5vw,72px)] font-light leading-[1.05] tracking-[-0.02em] mb-8">
          Know your <br/> <em>wealth.</em><br/>Down to <br/> the basis point. 
        </h1>
        <p className="text-base text-gray-400 leading-7 max-w-[420px] mb-12">
          WealthWatch is the institutional-grade dashboard for investors who demand precision. Real-time analytics, multi-account aggregation, and zero noise. 
        </p>
        <div className="flex items-center gap-4">
          <a
  href="#signin-card"
  className="group font-sans text-sm font-medium text-brand-black bg-brand-white border-none py-3.5 px-8 tracking-[0.02em] inline-flex items-center gap-2.5 hover:bg-gray-200 transition-all no-underline"
>
            Start Tracking
            <svg className="-ml-1 transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10m8 315 5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
        <div className="mt-16 pt-10 border-t border-white/10 grid grid-cols-3 gap-8">
          <div>
            <div className="text-[26px] font-medium tracking-[-0.02em] text-mint-500 mb-1"> $4.2T</div>
            <div className="text-[11px] text-gray-500 tracking-[0.08em] uppercase font-mono">Assets Tracked </div>
          </div>
          <div >
            <div className="text-[26px] font-medium tracking-[-0.02em] mb-1">280K</div>
            <div className="text-[11px] text-gray-500 tracking-[0.08em] uppercase font-mono">Active Portfolios</div>
          </div>
          <div>
            <div className="text-[26px] font-medium tracking-[-0.02em] mb-1">99.99%</div>
            <div className="text-[11px] text-gray-500 tracking-[0.08em] uppercase font-mono">Data Accuracy</div>
          </div>
        </div>
    </div>
    {/* Right Column - Hero Image */}
    </section>
    
   </div>
  );
}
