import { marketSession } from "./session";
import { scoreHeadline } from "./sentiment";
import { buildQuotes, buildSignals } from "./signals";
import type { BaselineMode, MarketResponse, NewsItem, ScanRow } from "./types";

/** GitHub Actions'in 5 dakikada bir tazeledigi tarama anlik goruntusu. */
export interface SnapshotHeadline {
  title: string;
  link: string;
  publisher: string;
  publishedAt: number;
}

export interface Snapshot {
  fetchedAt: number;
  totalCount: number;
  quotes: ScanRow[];
  news: Record<string, SnapshotHeadline[]>;
}

export interface SnapshotMarket {
  market: MarketResponse;
  news: Record<string, NewsItem[]>;
  source: "live" | "bundled";
}

const RAW_URL = "https://raw.githubusercontent.com/CehennemGibiyim/HisseBildirimSistemi/data/market.json";
const BUNDLED_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/market.json`;
const FIVE_MIN = 5 * 60_000;

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(snapshot: Snapshot): Snapshot | null {
  if (!snapshot || !Array.isArray(snapshot.quotes) || snapshot.quotes.length === 0) return null;

  const quotes: ScanRow[] = [];
  for (const row of snapshot.quotes) {
    const symbol = String(row?.symbol ?? "").toUpperCase();
    const price = num(row?.price);
    if (!symbol || price <= 0) continue;
    quotes.push({
      symbol,
      name: String(row?.name ?? symbol),
      sector: String(row?.sector ?? "Diger"),
      price,
      changePct: num(row?.changePct),
      changeAbs: num(row?.changeAbs),
      prevClose: num(row?.prevClose) || price,
      open: num(row?.open) || price,
      high: num(row?.high) || price,
      low: num(row?.low) || price,
      volume: num(row?.volume),
      marketCap: num(row?.marketCap),
    });
  }

  if (!quotes.length) return null;

  const news: Record<string, SnapshotHeadline[]> = {};
  for (const [symbol, items] of Object.entries(snapshot.news ?? {})) {
    if (!Array.isArray(items)) continue;
    news[symbol.toUpperCase()] = items
      .filter((item) => item && typeof item.title === "string" && item.title.length > 1)
      .map((item) => ({
        title: item.title,
        link: typeof item.link === "string" ? item.link : "",
        publisher: typeof item.publisher === "string" ? item.publisher : "Haber",
        publishedAt: num(item.publishedAt) || Date.now(),
      }))
      .slice(0, 10);
  }

  return {
    fetchedAt: num(snapshot.fetchedAt) || Date.now(),
    totalCount: num(snapshot.totalCount) || quotes.length,
    quotes,
    news,
  };
}

async function request(url: string): Promise<Snapshot | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9_000) });
    if (!res.ok) return null;
    return normalize((await res.json()) as Snapshot);
  } catch {
    return null;
  }
}

/**
 * Once GitHub'daki 5 dakikalik anlik goruntu denenir; oradan veri gelmezse
 * depoyla birlikte yayinlanan yedek dosya kullanilir.
 */
export async function loadSnapshot(): Promise<{ snapshot: Snapshot; source: "live" | "bundled" } | null> {
  const bucket = Math.floor(Date.now() / FIVE_MIN);
  const live = await request(`${RAW_URL}?t=${bucket}`);
  if (live) return { snapshot: live, source: "live" };

  const bundled = await request(`${BUNDLED_URL}?t=${bucket}`);
  if (bundled) return { snapshot: bundled, source: "bundled" };

  return null;
}

function toNewsItems(snapshot: Snapshot): Record<string, NewsItem[]> {
  const out: Record<string, NewsItem[]> = {};

  for (const [symbol, headlines] of Object.entries(snapshot.news)) {
    out[symbol] = headlines.map((headline) => {
      const analysis = scoreHeadline(headline.title);
      return {
        id: `${symbol}-${headline.link || headline.title}`,
        symbol,
        title: headline.title,
        publisher: headline.publisher,
        link: headline.link,
        publishedAt: headline.publishedAt,
        sentiment: Number(analysis.sentiment.toFixed(3)),
        label: analysis.label,
        tags: analysis.tags,
      };
    });
  }

  return out;
}

export function buildSnapshotMarket(
  snapshot: Snapshot,
  threshold: number,
  mode: BaselineMode,
): SnapshotMarket {
  const quotes = buildQuotes(snapshot.quotes);
  const news = toNewsItems(snapshot);
  const { signals, near } = buildSignals(quotes, threshold, mode, (symbol) => news[symbol] ?? []);

  return {
    market: {
      quotes: quotes.slice(0, 60),
      signals: signals.slice(0, 40),
      near,
      totalScanned: snapshot.totalCount,
      session: marketSession(),
      threshold,
      mode,
      serverTime: Date.now(),
      dataTime: snapshot.fetchedAt,
    },
    news,
    source: "live",
  };
}
