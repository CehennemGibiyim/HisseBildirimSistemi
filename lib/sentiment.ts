import type { SentimentLabel } from "./types";

interface Lexicon {
  terms: string[];
  weight: number;
  tag: string;
}

const POSITIVE: Lexicon[] = [
  {
    terms: ["surge", "surges", "surged", "surging", "soar", "soars", "soared", "soaring", "skyrocket", "skyrockets", "skyrocketed", "skyrocketing", "zoom", "zoomed"],
    weight: 3,
    tag: "Sıçrama",
  },
  {
    terms: ["jump", "jumps", "jumped", "rally", "rallies", "rallied", "rallying", "spike", "spikes", "spiked", "climb", "climbs", "climbed", "climbing"],
    weight: 2.4,
    tag: "Ralli",
  },
  { terms: ["gain", "gains", "gained", "gaining", "advance", "advances", "advanced", "rise", "rises", "rose", "higher", "up "], weight: 1.6, tag: "Artış" },
  { terms: ["beat", "beats", "topped", "tops", "exceeds", "exceeded", "blowout", "ahead of estimates"], weight: 2.6, tag: "Beklenti üstü" },
  { terms: ["record", "all-time high", "all time high", "highs", "milestone", "best-ever"], weight: 2.2, tag: "Rekor" },
  {
    terms: ["upgrade", "upgrades", "upgraded", "outperform", "overweight", "buy rating", "price target raised", "raises target", "raised target", "initiates coverage with buy"],
    weight: 2.8,
    tag: "Not artışı",
  },
  {
    terms: ["raises guidance", "raised guidance", "guidance raise", "raises outlook", "raised outlook", "boost outlook", "boosts outlook", "hikes forecast", "raises forecast"],
    weight: 3,
    tag: "Guidance artışı",
  },
  { terms: ["strong", "stronger", "robust", "solid", "accelerating", "momentum", "resilient", "smashes"], weight: 1.6, tag: "Güçlü" },
  { terms: ["growth", "grew", "growing", "expands", "expansion", "scales", "scaling"], weight: 1.4, tag: "Büyüme" },
  { terms: ["profit", "profits", "profitable", "profitability", "margin expansion", "free cash flow"], weight: 1.5, tag: "Kârlılık" },
  {
    terms: ["partnership", "partners", "partnered", "collaboration", "contract", "contracts", "deal", "deals", "wins", "won", "order", "orders", "awarded"],
    weight: 2,
    tag: "Anlaşma",
  },
  { terms: ["approval", "approved", "cleared", "authorized", "patent", "green light"], weight: 2.1, tag: "Onay" },
  { terms: ["buyback", "repurchase", "dividend", "split", "special dividend"], weight: 1.6, tag: "Sermaye" },
  { terms: ["breakthrough", "unveils", "unveiled", "launches", "launched", "launch", "first-ever", "next-gen", "wins approval"], weight: 1.7, tag: "Ürün" },
  { terms: ["outlook improved", "optimistic", "bullish", "upside", "says buy", "top pick", "attractive"], weight: 1.5, tag: "İyimserlik" },
  { terms: ["yükseldi", "yükseliş", "rekor", "sıçradı", "güçlü", "arttı", "artış", "kazandı"], weight: 2.2, tag: "Yükseliş" },
  { terms: ["kâr", "kar açıkladı", "büyüme", "anlaşma", "yatırım", "hedef yükseltti", "olumlu", "beğendi"], weight: 1.8, tag: "Olumlu" },
];

const NEGATIVE: Lexicon[] = [
  {
    terms: ["plunge", "plunges", "plunged", "plunging", "crash", "crashes", "crashed", "collapse", "collapses", "collapsed", "tumble", "tumbles", "tumbled", "tumbling"],
    weight: 3,
    tag: "Çöküş",
  },
  {
    terms: ["slump", "slumps", "slumped", "fall", "falls", "fell", "falling", "drop", "drops", "dropped", "dropping", "decline", "declines", "declined", "declining", "lower", "slide", "slides", "slid", "sliding", "sink", "sinks", "sank"],
    weight: 2,
    tag: "Düşüş",
  },
  { terms: ["miss", "misses", "missed", "missing", "shortfall", "below estimates", "disappointing", "disappoints", "disappointed"], weight: 2.7, tag: "Beklenti altı" },
  { terms: ["downgrade", "downgrades", "downgraded", "underperform", "underweight", "sell rating", "price target cut", "cuts target", "cut target"], weight: 2.8, tag: "Not indirimi" },
  { terms: ["cuts guidance", "cut guidance", "lowers outlook", "lowered outlook", "guidance cut", "warns", "warned", "warning", "slashes forecast"], weight: 3, tag: "Guidance indirimi" },
  { terms: ["weak", "weaker", "weakness", "slowdown", "slowing", "soft demand", "headwinds", "pressure"], weight: 1.8, tag: "Zayıf" },
  { terms: ["loss", "losses", "unprofitable", "burn", "impairment", "writedown", "write-down"], weight: 1.6, tag: "Zarar" },
  { terms: ["lawsuit", "sues", "sued", "probe", "probes", "investigation", "inquiry", "subpoena", "class action"], weight: 2.3, tag: "Hukuki risk" },
  { terms: ["recall", "recalls", "halt", "halts", "halted", "delay", "delays", "delayed", "defect", "fire", "outage"], weight: 2.1, tag: "Operasyonel risk" },
  { terms: ["layoffs", "job cuts", "restructuring", "resigns", "resigned", "steps down", "departure", "stepping down"], weight: 1.5, tag: "Yeniden yapılanma" },
  { terms: ["short seller", "fraud", "accounting issues", "bankruptcy", "default", "dilution", "offering", "private placement"], weight: 2.6, tag: "Risk" },
  { terms: ["strong sell", "sell rating", "selloff", "sell-off", "selling pressure", "bearish", "avoid"], weight: 2.5, tag: "Satış baskısı" },
  { terms: ["geriledi", "düştü", "düşüş", "zarar", "zayıf", "dava", "soruşturma", "uyarı", "indirim", "kötü"], weight: 2, tag: "Olumsuz" },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const COMPILED = [
  ...POSITIVE.map((entry) => ({ ...entry, sign: 1 })),
  ...NEGATIVE.map((entry) => ({ ...entry, sign: -1 })),
].map((entry) => ({
  ...entry,
  regex: new RegExp(`\\b(?:${entry.terms.map(escapeRegExp).join("|")})\\b`, "g"),
}));

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[’']/g, " ").replace(/\s+/g, " ")} `;
}

/**
 * Anahtar kelime tabanlı haber duyarlılığı. Harici bir modele bağımlı değildir,
 * bu yüzden her başlık için anında ve deterministik sonuç üretir.
 */
export function scoreHeadline(title: string): {
  sentiment: number;
  label: SentimentLabel;
  tags: string[];
  score: number;
} {
  const text = normalize(title);
  let score = 0;
  const tags: string[] = [];

  for (const entry of COMPILED) {
    const matches = text.match(entry.regex);
    if (!matches) continue;

    // Aynı kelimenin tekrarı etkiyi artırır ama sınırsız değil.
    score += entry.sign * entry.weight * Math.min(matches.length, 2);
    if (!tags.includes(entry.tag)) tags.push(entry.tag);
  }

  if (/\b(?:not|no longer|fails to|without)\b/.test(text)) score *= 0.6;

  // tanh, ham skoru işaretinden bağımsız olarak -1..1 aralığına sıkıştırır.
  const sentiment = Math.tanh(score / 4);
  const label: SentimentLabel = sentiment > 0.16 ? "positive" : sentiment < -0.16 ? "negative" : "neutral";

  return { sentiment, label, tags: tags.slice(0, 3), score };
}

/** Bir haber kümesinin yaşa göre ağırlıklı ortalama duyarlılığı (-1..1). */
export function aggregateSentiment(items: { sentiment: number; publishedAt: number }[], now = Date.now()): number {
  if (!items.length) return 0;
  let weighted = 0;
  let total = 0;

  for (const item of items) {
    const ageHours = Math.max(0, (now - item.publishedAt) / 36e5);
    const recency = 1 / (1 + ageHours / 12);
    weighted += item.sentiment * recency;
    total += recency;
  }

  return total === 0 ? 0 : weighted / total;
}
