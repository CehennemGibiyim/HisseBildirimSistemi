#!/usr/bin/env node
/**
 * Nasdaq tarama anlık görüntüsü üretir.
 *
 * Statik site (GitHub Pages) tarayıcıdan TradingView'a istek atamaz (CORS kapalı),
 * bu yüzden tarama GitHub Actions içinde burada yapılır ve `data` dalına yazılır.
 * Site her 15 saniyede bu dosyayı okur; dosya 5 dakikada bir tazelenir.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SCAN_URL = "https://scanner.tradingview.com/america/scan";
const RSS_BASE = "https://feeds.finance.yahoo.com/rss/2.0/headline";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const COLUMNS = [
  "name",
  "description",
  "close",
  "change",
  "volume",
  "market_cap_basic",
  "sector",
  "high",
  "low",
  "open",
];

const OUTPUT = resolve(process.cwd(), "public/data/market.json");
const LIMIT = 300;
const NEWS_SYMBOLS = 8;

const NAME_SUFFIX =
  /\s+(Class\s+[A-Z]\s+)?(Common Stock|Ordinary Shares|Common Shares|Capital Stock|American Depositary Shares|Depositary Shares|Subordinate Voting Shares|Voting Shares|Registered Shares|Preferred Stock)\b.*$/i;

const EXCLUDE_NAME =
  /warrant|\bunits?\b|\brights?\b|acquisition corp|acquisition corporation|blank check|\betf\b|\bfund\b|\btrust\b|preferred|notes due|depositary receipt|physical|leveraged|2x|3x/i;

function num(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanName(raw, symbol) {
  const name = String(raw ?? "").replace(NAME_SUFFIX, "").trim();
  return name.length >= 2 ? name : symbol;
}

function parseRow(row) {
  const ticker = String(row?.s ?? "");
  const symbol = ticker.includes(":") ? ticker.split(":")[1] : ticker;
  const d = row?.d ?? [];
  if (!symbol || d.length < 10) return null;

  const name = String(d[1] ?? d[0] ?? symbol);
  const price = num(d[2]);
  const changePct = num(d[3]);
  const high = num(d[7]);
  const low = num(d[8]);
  const open = num(d[9]);

  if (price < 1 || high <= 0 || low <= 0) return null;
  if (EXCLUDE_NAME.test(name)) return null;

  const prevClose = changePct > -100 ? price / (1 + changePct / 100) : price;

  return {
    symbol: symbol.toUpperCase(),
    name: cleanName(name, symbol),
    sector: String(d[6] ?? "Diğer"),
    price,
    changePct,
    changeAbs: price - prevClose,
    prevClose,
    open,
    high,
    low,
    volume: num(d[4]),
    marketCap: num(d[5]),
  };
}

async function scan() {
  const body = {
    filter: [
      { left: "exchange", operation: "equal", right: "NASDAQ" },
      { left: "close", operation: "greater", right: 1 },
      { left: "market_cap_basic", operation: "greater", right: 10_000_000 },
    ],
    options: { lang: "en" },
    markets: ["america"],
    symbols: { query: { types: ["stock"] }, tickers: [] },
    columns: COLUMNS,
    sort: { sortBy: "change", sortOrder: "desc" },
    range: [0, LIMIT],
  };

  const res = await fetch(SCAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://www.tradingview.com",
      Referer: "https://www.tradingview.com/",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Tarama kaynağı HTTP ${res.status}`);

  const json = await res.json();
  const rows = (json.data ?? []).map(parseRow).filter(Boolean);
  if (!rows.length) throw new Error("Tarama sonucu boş döndü");

  return { rows, totalCount: json.totalCount ?? rows.length };
}

function decodeEntities(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

async function headlines(symbol) {
  const url = `${RSS_BASE}?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`RSS ${res.status}`);

  const xml = await res.text();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const items = [];

  for (const block of blocks) {
    const title = tag(block, "title");
    const link = tag(block, "link");
    if (!title || !link) continue;
    items.push({
      title,
      link,
      publisher: tag(block, "source") || "Yahoo Finance",
      publishedAt: Date.parse(tag(block, "pubDate")) || Date.now(),
    });
    if (items.length >= 10) break;
  }

  return items;
}

async function collectNews(rows) {
  const symbols = [];
  for (const row of rows.slice(0, NEWS_SYMBOLS)) symbols.push(row.symbol);
  for (const extra of ["NVDA", "AAPL", "TSLA"]) if (!symbols.includes(extra)) symbols.push(extra);

  const news = {};
  let cursor = 0;

  async function worker() {
    while (cursor < symbols.length) {
      const symbol = symbols[cursor++];
      try {
        const items = await headlines(symbol);
        if (items.length) news[symbol] = items;
      } catch (error) {
        console.warn(`[news] ${symbol}: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: 3 }, worker));
  return news;
}

async function previous() {
  try {
    return JSON.parse(await readFile(OUTPUT, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  let scanResult = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 3 && !scanResult; attempt++) {
    try {
      scanResult = await scan();
    } catch (error) {
      lastError = error;
      console.warn(`[scan] deneme ${attempt} başarısız: ${error.message}`);
      await new Promise((done) => setTimeout(done, attempt * 3000));
    }
  }

  if (!scanResult) {
    const old = await previous();
    if (old) {
      console.warn(`[scan] tarama başarısız (${lastError?.message}); mevcut anlık görüntü korunuyor.`);
      process.exit(0);
    }
    throw lastError ?? new Error("Tarama yapılamadı");
  }

  const news = await collectNews(scanResult.rows);

  const payload = {
    fetchedAt: Date.now(),
    totalCount: scanResult.totalCount,
    quotes: scanResult.rows,
    news,
  };

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(payload)}\n`, "utf8");

  console.log(
    `[snapshot] ${payload.quotes.length} hisse, ${Object.keys(news).length} sembol haberi · ${new Date(payload.fetchedAt).toISOString()}`,
  );
}

main().catch((error) => {
  console.error(`[snapshot] HATA: ${error.message}`);
  process.exit(1);
});
