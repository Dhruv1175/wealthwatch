"use client";

import { useEffect, useRef } from "react";

interface ChartProps {
  symbol: string;
}

export default function TradingViewChart({ symbol }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    let tvSymbol = symbol.toUpperCase();
    if (tvSymbol.endsWith(".NS")) {
      tvSymbol = `NSE:${tvSymbol.replace(".NS", "")}`;
    } else if (tvSymbol.endsWith(".BO")) {
      tvSymbol = `BSE:${tvSymbol.replace(".BO", "")}`;
    }

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true, // Allows manually searching alternative tickers if mutual funds fail
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com"
    });

    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="w-full bg-zinc-950 border border-white/10 p-2 rounded h-[480px]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}