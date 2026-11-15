"use client";

import PriceChart, { type ChartRange } from "./PriceChart";
import { fmtMarketCap, fmtPct, fmtPrice, fmtSigned, fmtVolume, pctClass, timeAgo } from "@/lib/format";
import type { ScanQuote, Signal } from "@/lib/types";
import { useWatchlist } from "@/lib/watchlist";

interface Props {
  selected: string;
  quote: ScanQuote | null;
  signal: Signal | null;
  change: number;
  delta: number;
  mounted: boolean;
  threshold: number;
  range: ChartRange;
  onRange: (range: ChartRange) => void;
}

const RANGES: { value: ChartRange; label: string }[] = [
  { value: "1d", label: "1G" },
  { value: "5d", label: "5G" },
  { value: "1mo", label: "1A" },
  { value: "3mo", label: "3A" },
];

export default function HeroPanel({
  selected,
  quote,
  signal,
  change,
  delta,
  mounted,
  threshold,
  range,
  onRange,
}: Props) {
  const { toggle, has } = useWatchlist();
  const watched = has(selected);

  return (
    <section className="panel panel--hero">
      <div className="hero__head">
        <div className="hero__id">
          <div className="hero__symbol-row">
            <h2>{quote?.symbol ?? selected}</h2>
            {quote && <span className="tag tag--sector">{quote.sector}</span>}
            <span className="tag">NASDAQ</span>
            {signal && (
              <span className={`chip chip--${signal.severity}`}>
                <span className="chip__dot" /> Sinyal {fmtPct(signal.triggerPct)}
              </span>
            )}
            <button
              type="button"
              className={`star${watched ? " is-on" : ""}`}
              aria-pressed={watched}
              aria-label={watched ? `${selected} takipten çıkar` : `${selected} takibe al`}
              onClick={() => toggle(selected)}
            >
              ★
            </button>
          </div>
          <p className="hero__name">{quote?.name ?? "Fiyat verisi yükleniyor…"}</p>
        </div>

        <div className="hero__price">
          <span className="hero__last">{quote ? fmtPrice(quote.price) : "—"}</span>
          <span className={`hero__chg ${pctClass(change)}`}>
            {quote ? fmtPct(change) : "—"}
            <em>{quote ? fmtSigned(delta) : ""}</em>
          </span>
          <span className="hero__updated">
            {quote && mounted ? `son tick ${timeAgo(quote.updatedAt)}` : "canlı akış"}
          </span>
        </div>
      </div>

      <div className="hero__metrics">
        <div className="metric">
          <span>Açılış</span>
          <strong>{quote ? fmtPrice(quote.open) : "—"}</strong>
        </div>
        <div className="metric">
          <span>Önceki kapanış</span>
          <strong>{quote ? fmtPrice(quote.prevClose) : "—"}</strong>
        </div>
        <div className="metric">
          <span>Gün aralığı</span>
          <strong className="metric__range">
            {quote ? `${fmtPrice(quote.low)} – ${fmtPrice(quote.high)}` : "—"}
          </strong>
        </div>
        <div className="metric">
          <span>Hacim</span>
          <strong>{quote ? fmtVolume(quote.volume) : "—"}</strong>
        </div>
        <div className="metric">
          <span>Piyasa değeri</span>
          <strong>{quote ? fmtMarketCap(quote.marketCap) : "—"}</strong>
        </div>
      </div>

      {(quote?.relVolume || quote?.week52High || (signal?.streak ?? 0) >= 2) && (
        <div className="extra-metrics">
          {quote?.relVolume ? (
            <span className="extra-metric">
              Rel. hacim <strong>{quote.relVolume.toFixed(1)}x</strong>
            </span>
          ) : null}
          {quote?.week52High ? (
            <span className="extra-metric">
              52h zirveye <strong>{fmtPct((quote.price / quote.week52High - 1) * 100, 1)}</strong>
            </span>
          ) : null}
          {(signal?.streak ?? 0) >= 2 ? (
            <span className="extra-metric">
              Kalıcılık <strong>{signal?.streak} tur</strong>
            </span>
          ) : null}
        </div>
      )}

      <div className="chart-toolbar">
        <div className="seg seg--ranges">
          {RANGES.map((item) => (
            <button
              type="button"
              key={item.value}
              className={range === item.value ? "is-active" : ""}
              onClick={() => onRange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="chart-toolbar__note">
          Eşik %{threshold} · grafik TradingView · tarama 2 dk'da bir yenilenir
        </span>
      </div>

      <PriceChart
        symbol={selected}
        range={range}
        threshold={threshold}
        livePrice={quote?.price ?? null}
        currency="USD"
      />
    </section>
  );
}
