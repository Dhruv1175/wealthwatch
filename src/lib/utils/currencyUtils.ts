export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "JPY" | "AED" | "SGD" | "CAD" | "AUD";
 
// ── Symbol map ─────────────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AED: "د.إ",
  SGD: "S$",
  CAD: "C$",
  AUD: "A$",
};
 
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? currency ?? "₹";
}
 
// ── Formatter ──────────────────────────────────────────────────────────────────
// Returns a formatted string like "₹1,24,500.00" or "$1,245.00"
export function formatCurrency(
  amount:   number,
  currency: string = "INR",
  options?: { decimals?: number; compact?: boolean }
): string {
  const decimals = options?.decimals ?? 2;
  const compact  = options?.compact  ?? false;
  const sym      = getCurrencySymbol(currency);
  const cur      = currency?.toUpperCase() ?? "INR";
 
  if (compact && Math.abs(amount) >= 1_00_000) {
    // Indian numbering: lakhs / crores for INR; K/M for others
    if (cur === "INR") {
      if (Math.abs(amount) >= 1_00_00_000) {
        return `${sym}${(amount / 1_00_00_000).toFixed(2)}Cr`;
      }
      return `${sym}${(amount / 1_00_000).toFixed(2)}L`;
    }
    if (Math.abs(amount) >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2)}M`;
    if (Math.abs(amount) >= 1_000)     return `${sym}${(amount / 1_000).toFixed(1)}K`;
  }
 
  // Use Intl for proper locale-aware number formatting
  const locale = cur === "INR" ? "en-IN" : "en-US";
  const formatted = Math.abs(amount).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
 
  const sign = amount < 0 ? "−" : "";
  return `${sign}${sym}${formatted}`;
}
 
// ── Sign-aware formatter for P&L ──────────────────────────────────────────────
export function formatPnL(
  amount:   number,
  currency: string = "INR",
  decimals: number = 0
): string {
  const sym       = getCurrencySymbol(currency);
  const locale    = (currency?.toUpperCase() ?? "INR") === "INR" ? "en-IN" : "en-US";
  const abs       = Math.abs(amount).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = amount >= 0 ? "+" : "−";
  return `${sign}${sym}${abs}`;
}
 
// ── Percentage formatter ──────────────────────────────────────────────────────
export function formatPct(value: number, decimals = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}
 