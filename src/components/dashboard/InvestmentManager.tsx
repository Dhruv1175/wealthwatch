"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, TrendingUp, TrendingDown, Landmark, Trash2, LineChart, X, DollarSign } from "lucide-react";
import TradingViewChart from "./TradingViewChart";
import { useNotifications } from "@/components/dashboard/NotificationContext";


export default function InvestmentManager() {
  const [data, setData] = useState<any>({ positions: [], totalValue: 0, totalPnl: 0, sipReminders: [] });
  const [loading, setLoading] = useState(true);
  const [activeChartSymbol, setActiveChartSymbol] = useState<string | null>(null);
  const [sellingAsset, setSellingAsset] = useState<any>(null); // State for handling active sell order configurations
  const [sellForm, setSellForm] = useState({ sharesToSell: "", salePrice: "" });
  const { triggerToast } = useNotifications();
  const [form, setForm] = useState({ symbol: "", name: "", type: "EQUITY_STOCK", sharesOwned: "", avgBuyPrice: "", sipAmount: "", sipDay: "" });

  async function loadPortfolio() {
    try {
      const res = await fetch("/api/investments");
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadPortfolio(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ symbol: "", name: "", type: "EQUITY_STOCK", sharesOwned: "", avgBuyPrice: "", sipAmount: "", sipDay: "" });
        loadPortfolio();
      }
    } catch (e) { console.error(e); }
  }

  async function handleDeletePosition(id: string) {
    if (!confirm("CRITICAL: This permanently removes this item from tracking WITHOUT updating your bank cash feed balance. Proceed?")) return;
    try {
      const res = await fetch(`/api/investments/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (activeChartSymbol === data.positions.find((p: any) => p.id === id)?.symbol) setActiveChartSymbol(null);
        triggerToast("Asset Traced Entry Removed", "The ledger allocation records have been hard deleted from PostgreSQL storage fields.", "INFO");
        loadPortfolio();
      }
    } catch (e) { console.error(e); }
  }

  async function handleExecuteSale(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/investments/${sellingAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sellForm)
      });
      if (res.ok) {
        setSellingAsset(null);
        triggerToast(
          "Asset Position Sale Settled",
          `Successfully processed liquidation order for ${sellingAsset.symbol}. Capital has been logged to your cash inflows table context list.`,
          "SUCCESS"
        );
        setSellForm({ sharesToSell: "", salePrice: "" });
        loadPortfolio();
        
      } else {
        const err = await res.json();
        alert(err.error || "Failed to process transaction.");
      }
    } catch (e) { console.error(e); }
  }

  return (
    <div className="space-y-6 border-t border-white/10 pt-8 mt-8">
      {/* Live Chart Module Wrapper Block */}
      {activeChartSymbol && (
        <div className="border border-sky-500/30 bg-zinc-950 p-4 relative animate-fadeIn">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
            <span className="font-mono text-xs text-sky-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <LineChart className="w-4 h-4" /> Real-time Streaming Terminal: {activeChartSymbol}
            </span>
            <button onClick={() => setActiveChartSymbol(null)} className="text-gray-500 hover:text-white p-1 font-mono flex items-center gap-1 text-[10px] uppercase border border-white/5 bg-black">
              <X className="w-3 h-3" /> Close
            </button>
          </div>
          <TradingViewChart symbol={activeChartSymbol} />
        </div>
      )}

      {/* Sell Execution Overlay Modal Component Interface Inline Box */}
      {sellingAsset && (
        <div className="border border-red-500/30 bg-zinc-950 p-4 font-mono text-xs max-w-xl animate-fadeIn">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
            <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Market Liquidation Order: {sellingAsset.symbol}
            </span>
            <button onClick={() => setSellingAsset(null)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <form onSubmit={handleExecuteSale} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-gray-500 uppercase block mb-1">Units to Sell (Max: {sellingAsset.sharesOwned})</label>
              <input type="number" step="any" required max={sellingAsset.sharesOwned} className="w-full bg-black border border-white/10 p-2 text-white" value={sellForm.sharesToSell} onChange={e => setSellForm({...sellForm, sharesToSell: e.target.value})} />
            </div>
            <div>
              <label className="text-gray-500 uppercase block mb-1">Execution Sale Price (₹)</label>
              <input type="number" step="any" required placeholder={`Current: ₹${sellingAsset.currentPrice.toFixed(1)}`} className="w-full bg-black border border-white/10 p-2 text-white" value={sellForm.salePrice} onChange={e => setSellForm({...sellForm, salePrice: e.target.value})} />
            </div>
            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold p-2 uppercase h-9">Confirm Sale</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Entry Input Form Panel */}
        <div className="border border-white/10 bg-zinc-950 p-5 font-mono text-xs h-fit">
          <h3 className="text-xs uppercase tracking-widest text-sky-400 font-bold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Capital Allocation Entry
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-500 uppercase block mb-1">Ticker Symbol (e.g. RELIANCE.NS)</label>
              <input type="text" placeholder="RELIANCE.NS" required className="w-full bg-black border border-white/10 p-2 text-white uppercase" value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} />
            </div>
            <div>
              <label className="text-gray-500 uppercase block mb-1">Asset Name</label>
              <input type="text" placeholder="Reliance Industries" required className="w-full bg-black border border-white/10 p-2 text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="text-gray-500 uppercase block mb-1">Position Variant</label>
              <select className="w-full bg-black border border-white/10 p-2 text-white" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="EQUITY_STOCK">Direct Equity Stock</option>
                <option value="SIP_MUTUAL_FUND">Systematic Investment Plan (SIP)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 uppercase block mb-1">Units Owned</label>
                <input type="number" step="any" placeholder="10" required className="w-full bg-black border border-white/10 p-2 text-white" value={form.sharesOwned} onChange={e => setForm({...form, sharesOwned: e.target.value})} />
              </div>
              <div>
                <label className="text-gray-500 uppercase block mb-1">Avg Buy Cost</label>
                <input type="number" step="any" placeholder="₹" required className="w-full bg-black border border-white/10 p-2 text-white" value={form.avgBuyPrice} onChange={e => setForm({...form, avgBuyPrice: e.target.value})} />
              </div>
            </div>

            {form.type === "SIP_MUTUAL_FUND" && (
              <div className="grid grid-cols-2 gap-2 border-l border-sky-900/50 pl-2">
                <div>
                  <label className="text-gray-500 uppercase block mb-1">SIP Amount</label>
                  <input type="number" placeholder="₹" className="w-full bg-black border border-white/10 p-2 text-white" value={form.sipAmount} onChange={e => setForm({...form, sipAmount: e.target.value})} />
                </div>
                <div>
                  <label className="text-gray-500 uppercase block mb-1">Reminder Date</label>
                  <input type="number" placeholder="1-31" className="w-full bg-black border border-white/10 p-2 text-white" value={form.sipDay} onChange={e => setForm({...form, sipDay: e.target.value})} />
                </div>
              </div>
            )}
            <button type="submit" className="w-full bg-white text-black font-bold p-2.5 uppercase hover:bg-zinc-200">Commit Position to Ledger</button>
          </form>
        </div>

        {/* Right Asset List Tracker Board Area */}
        <div className="lg:col-span-2 space-y-4">
          {data.sipReminders.length > 0 && (
            <div className="bg-sky-950/20 border border-sky-900/50 p-4 font-mono text-xs text-sky-300 space-y-2">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sky-400">
                <Bell className="w-4 h-4" /> Reminders Triggered:
              </div>
              {data.sipReminders.map((rem: string, index: number) => <div key={index}>• {rem}</div>)}
            </div>
          )}

          <div className="border border-white/10 bg-zinc-950 p-5 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2">
                <Landmark className="w-4 h-4 text-sky-400" /> Tracked Assets Overview Ticker
              </h3>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 uppercase block">Net Asset Worth</span>
                <span className="text-base font-black text-white">₹{data.totalValue.toLocaleString("en-IN", {maximumFractionDigits: 0})}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-600 animate-pulse">REFRESHING TELEMETRY STREAMS...</div>
            ) : data.positions.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 border border-dashed border-white/5">No assets registered.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[410px] overflow-y-auto pr-1">
                {data.positions.map((pos: any) => {
                  const isProfit = pos.profitOrLoss >= 0;
                  return (
                    <div key={pos.id} className="bg-black border border-white/5 p-4 flex flex-col justify-between group relative hover:border-zinc-700 transition-all">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-white block text-sm tracking-tight">{pos.symbol}</span>
                            <span className="text-[10px] text-gray-500 truncate max-w-[130px] block">{pos.name}</span>
                          </div>
                          
                          {/* Interactivity Action Button Track Cluster */}
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => setActiveChartSymbol(pos.symbol)} title="View Live Chart" className="p-1 bg-zinc-900 border border-white/10 text-sky-400 hover:bg-sky-950/30 hover:border-sky-500 transition-all rounded">
                              <LineChart className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setSellingAsset(pos)} title="Sell / Liquidate Units" className="p-1 bg-zinc-900 border border-white/10 text-emerald-400 hover:bg-emerald-950/30 hover:border-emerald-500 transition-all rounded font-mono text-[10px] px-1.5 uppercase font-bold flex items-center gap-0.5">
                              Sell
                            </button>
                            <button onClick={() => handleDeletePosition(pos.id)} title="Delete Erroneous Record" className="p-1 bg-zinc-900 border border-white/10 text-red-500 hover:bg-red-950/30 hover:border-red-400 transition-all rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-4 border-t border-dashed border-white/10 pt-2 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] text-gray-500 block uppercase">Current Spot Price</span>
                            <span className="text-xs font-bold text-gray-200">₹{pos.currentPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-500 block uppercase">Avg Purchase Price</span>
                            <span className="text-xs text-gray-400">₹{pos.avgBuyPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-between items-end border-t border-white/5 pt-2">
                        <div>
                          <span className="text-[9px] text-gray-500 block uppercase">Holding Value</span>
                          <span className="text-xs font-black text-white">₹{pos.currentValue.toLocaleString("en-IN", {maximumFractionDigits: 0})}</span>
                        </div>
                        <div className={`text-right flex items-center gap-1 text-xs font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <div>
                            <div>{isProfit ? "+" : ""}₹{pos.profitOrLoss.toFixed(0)}</div>
                            <div className="text-[9px] font-medium opacity-80">({pos.pnlPercentage.toFixed(1)}%)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}