import { aggregateSentiment } from "./sentiment";
import { trackAndGetBaseline } from "./session-tracker";
import type { BaselineMode, FiredTrigger, NewsItem, ScanQuote, ScanRow, Signal } from "./types";

export type NewsLookup = (symbol: string) => NewsItem[];

export const TRIGGER_LABELS: Record<FiredTrigger, string> = {
  day: "Günlük artış",
  low: "Gün içi dipten",
  session: "İzleme başlangıcından",
};

export const MODE_LABELS: Record<BaselineMode, string> = {
  day: "Günlük değişim",
  low: "Gün içi dipten",
  session: "İzleme başlangıcı",
};

const TRIGGERS: FiredTrigger[] = ["day", "low", "session"];

function pct(value: number, base: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base <= 0) return 0;
  return ((value - base) / base) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildQuotes(rows: ScanRow[]): ScanQuote[] {
  return rows.map((row) => {
    const baseline = trackAndGetBaseline(row.symbol, row.price);

    return {
      ...row,
      lowPct: pct(row.price, row.low),
      sessionPct: pct(row.price, baseline.price),
      sessionBase: baseline.price,
      trackedSince: baseline.at,
      updatedAt: Date.now(),
      rangePos: row.high > row.low ? clamp((row.price - row.low) / (row.high - row.low), 0, 1) : 0.5,
    };
  });
}

export function triggerValue(quote: ScanQuote, trigger: FiredTrigger): { value: number; baseline: number } {
  switch (trigger) {
    case "low":
      return { value: quote.lowPct, baseline: quote.low };
    case "session":
      return { value: quote.sessionPct, baseline: quote.sessionBase };
    default:
      return { value: quote.changePct, baseline: quote.prevClose };
  }
}

const detection = new Map<string, number>();

function detectedAt(key: string): number {
  const existing = detection.get(key);
  if (existing && Date.now() - existing < 86_400_000) return existing;
  const now = Date.now();
  detection.set(key, now);
  if (detection.size > 1000) {
    const cutoff = now - 86_400_000;
    for (const [k, v] of detection) if (v < cutoff) detection.delete(k);
  }
  return now;
}

function severity(ratio: number): Signal["severity"] {
  if (ratio >= 1.75) return "extreme";
  if (ratio >= 1.3) return "strong";
  return "watch";
}

/** En etkili manseti secer; taze haber eskileri golgede birakir. */
export function pickHeadline(items: NewsItem[]): { headline: NewsItem | null; impact: number } {
  if (!items.length) return { headline: null, impact: 0 };

  const fresh = items.filter((item) => Date.now() - item.publishedAt < 3 * 86_400_000);
  const pool = fresh.length ? fresh : items;

  let best: NewsItem | null = null;
  let bestScore = -Infinity;

  for (const item of pool) {
    const ageHours = Math.max(0, (Date.now() - item.publishedAt) / 36e5);
    const recency = 1 / (1 + ageHours / 10);
    const score = item.sentiment * 100 * recency;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return { headline: best, impact: aggregateSentiment(items) * 100 };
}

function toSignal(
  quote: ScanQuote,
  trigger: FiredTrigger,
  threshold: number,
  newsFor: NewsLookup,
): Signal {
  const metric = triggerValue(quote, trigger);
  const { headline, impact } = pickHeadline(newsFor(quote.symbol));
  const ratio = threshold > 0 ? metric.value / threshold : 1;

  // Güç skoru: esigi ne kadar astigi + haber tonu + günün tepesine yakinlik.
  let strength = 52 + Math.min(Math.max(ratio - 1, 0), 1.5) * 22;
  strength += Math.min(Math.max(impact, 0), 10) * 0.8;
  strength += quote.rangePos * 6;
  if (quote.volume > 0) strength += 2;

  const dayKey = new Date().toISOString().slice(0, 10);

  return {
    id: `${quote.symbol}-${trigger}`,
    symbol: quote.symbol,
    name: quote.name,
    sector: quote.sector,
    price: quote.price,
    changePct: quote.changePct,
    trigger,
    triggerLabel: TRIGGER_LABELS[trigger],
    triggerPct: metric.value,
    threshold,
    baseline: metric.baseline,
    strength: Math.round(clamp(strength, 1, 99)),
    severity: severity(ratio),
    dayHigh: quote.high,
    dayLow: quote.low,
    volume: quote.volume,
    marketCap: quote.marketCap,
    rangePos: quote.rangePos,
    headline,
    newsImpact: Math.round(impact * 10) / 10,
    detectedAt: detectedAt(`${quote.symbol}-${trigger}-${dayKey}`),
    updatedAt: Date.now(),
  };
}

/**
 * Esigi asan sinyalleri uretir. Kullanici hangi olcutu sectiyse sinyal o olcutle hesaplanir.
 */
export function buildSignals(
  quotes: ScanQuote[],
  threshold: number,
  mode: BaselineMode,
  newsFor: NewsLookup = () => [],
): { signals: Signal[]; near: Signal[] } {
  const signals: Signal[] = [];
  const near: Signal[] = [];

  for (const quote of quotes) {
    if (!Number.isFinite(quote.price) || quote.price <= 0) continue;
    if (!TRIGGERS.includes(mode)) continue;

    const candidate = toSignal(quote, mode, threshold, newsFor);

    if (candidate.triggerPct >= threshold) {
      signals.push(candidate);
    } else if (candidate.triggerPct > 0) {
      near.push(candidate);
    }
  }

  signals.sort((a, b) => b.triggerPct - a.triggerPct);
  near.sort((a, b) => b.triggerPct - a.triggerPct);

  return { signals, near: near.slice(0, 4) };
}
