export type BaselineMode = "day" | "low" | "session";
export type FiredTrigger = BaselineMode;
export type SentimentLabel = "positive" | "neutral" | "negative";

export interface ScanRow {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  changeAbs: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number;
}

export interface ScanQuote extends ScanRow {
  lowPct: number;
  sessionPct: number;
  sessionBase: number;
  trackedSince: number;
  updatedAt: number;
  rangePos: number;
}

export interface NewsItem {
  id: string;
  symbol: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  sentiment: number;
  label: SentimentLabel;
  tags: string[];
}

export interface Signal {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  trigger: FiredTrigger;
  triggerLabel: string;
  triggerPct: number;
  threshold: number;
  baseline: number;
  strength: number;
  severity: "watch" | "strong" | "extreme";
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  rangePos: number;
  headline: NewsItem | null;
  newsImpact: number;
  detectedAt: number;
  updatedAt: number;
}

export interface MarketSession {
  isOpen: boolean;
  label: string;
  timezone: string;
  clock: string;
  nextEvent: string;
}

export interface MarketResponse {
  quotes: ScanQuote[];
  signals: Signal[];
  near: Signal[];
  totalScanned: number;
  session: MarketSession;
  threshold: number;
  mode: BaselineMode;
  serverTime: number;
  /** Tarama anlik goruntusunun uretildigi an (ms). */
  dataTime: number;
}
