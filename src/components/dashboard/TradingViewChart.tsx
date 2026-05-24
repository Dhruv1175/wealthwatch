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

    let tvSymbol = symbol.toUpperCase();
    if (tvSymbol.endsWith(".NS"))      tvSymbol = `NSE:${tvSymbol.replace(".NS", "")}`;
    else if (tvSymbol.endsWith(".BO")) tvSymbol = `BSE:${tvSymbol.replace(".BO", "")}`;

    const script       = document.createElement("script");
    script.src         = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type        = "text/javascript";
    script.async       = true;
    script.innerHTML   = JSON.stringify({
      autosize:            true,
      symbol:              tvSymbol,
      interval:            "D",
      timezone:            "Asia/Kolkata",
      theme:               "dark",
      style:               "1",
      locale:              "en",
      allow_symbol_change: true,
      calendar:            false,
      hide_volume:         false,
      support_host:        "https://www.tradingview.com",
      backgroundColor:     "rgba(0,0,0,0)",
      gridColor:           "rgba(255,255,255,0.03)",
    });

    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div
      className="w-full overflow-hidden"
      style={{ height: "460px", background: "hsl(220 14% 6%)" }}
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}