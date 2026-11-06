"use client";

import { fmtMarketCap, fmtPct, pctClass } from "@/lib/format";
import { MODE_LABELS } from "@/lib/signals";
import type { BaselineMode, MarketSession, ScanQuote } from "@/lib/types";

interface Props {
  totalScanned: number;
  session: MarketSession | undefined;
  signalsCount: number;
  threshold: number;
  mode: BaselineMode;
  topGainer: ScanQuote | null;
  newsBuzz: number;
  newsCount: number;
}

function toneOf(value: number): string {
  return value > 0.16 ? "positive" : value < -0.16 ? "negative" : "neutral";
}

export default function StatsRow({
  totalScanned,
  session,
  signalsCount,
  threshold,
  mode,
  topGainer,
  newsBuzz,
  newsCount,
}: Props) {
  const tone = toneOf(newsBuzz);

  return (
    <section className="stats">
      <article className="stat">
        <span className="stat__label">Taranan hisse</span>
        <span className="stat__value">{totalScanned.toLocaleString("tr-TR")}</span>
        <span className="stat__foot">
          <i className={`session__dot${session?.isOpen ? " is-open" : ""}`} />
          {session?.nextEvent ?? "Seans bilgisi alınıyor"}
        </span>
      </article>

      <article className={`stat${signalsCount ? " stat--hot" : ""}`}>
        <span className="stat__label">Aktif sinyal</span>
        <span className="stat__value">{signalsCount}</span>
        <span className="stat__foot">
          Eşik ≥ %{threshold} · {MODE_LABELS[mode].toLowerCase()}
        </span>
      </article>

      <article className="stat">
        <span className="stat__label">En yüksek artış</span>
        <span className={`stat__value ${pctClass(topGainer?.changePct ?? 0)}`}>
          {topGainer ? fmtPct(topGainer.changePct, 1) : "—"}
        </span>
        <span className="stat__foot">
          {topGainer ? `${topGainer.symbol} · ${topGainer.sector} · ${fmtMarketCap(topGainer.marketCap)}` : "Veri bekleniyor"}
        </span>
      </article>

      <article className="stat">
        <span className="stat__label">Haber nabzı</span>
        <span className={`stat__value tone-${tone}`}>{newsCount ? Math.round(newsBuzz * 100) : "—"}</span>
        <span className="stat__foot">
          {newsCount
            ? `${tone === "positive" ? "Ton olumlu" : tone === "negative" ? "Ton olumsuz" : "Ton nötr"} · ${newsCount} manşet`
            : "Haberler yükleniyor"}
        </span>
      </article>
    </section>
  );
}
