const priceFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFmt = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function fmtPrice(value: number, currency = "USD"): string {
  if (!Number.isFinite(value)) return "—";
  if (currency === "USD") return `$${priceFmt.format(value)}`;
  return `${priceFmt.format(value)} ${currency}`;
}

export function fmtPct(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function fmtSigned(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${priceFmt.format(Math.abs(value))}`;
}

export function fmtVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return compactFmt.format(value);
}

export function fmtMarketCap(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)} Tn`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)} Mr`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)} Mn`;
  return `$${value.toLocaleString("tr-TR")}`;
}

export function fmtClock(timestamp: number | null): string {
  if (!timestamp) return "--:--:--";
  return new Date(timestamp).toLocaleTimeString("tr-TR", { hour12: false });
}

export function timeAgo(timestamp: number): string {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "az önce";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function pctClass(value: number): string {
  if (value > 0) return "is-up";
  if (value < 0) return "is-down";
  return "is-flat";
}
