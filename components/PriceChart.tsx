"use client";

import { useMemo, useState } from "react";

export type ChartRange = "1d" | "5d" | "1mo" | "3mo";

interface Props {
  symbol: string;
  range: ChartRange;
  threshold: number;
  livePrice: number | null;
  currency: string;
}

/** Statik surumde mum verisi tarayicidan cekilemez (saglayicilar CORS'a kapali),
 *  bu yuzden grafik TradingView'in gomulebilir widget'iyla gosterilir. */
const INTERVALS: Record<ChartRange, string> = {
  "1d": "5",
  "5d": "30",
  "1mo": "60",
  "3mo": "D",
};

export default function PriceChart({ symbol, range, threshold, livePrice, currency }: Props) {
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: `NASDAQ:${symbol}`,
      interval: INTERVALS[range],
      theme: "dark",
      style: "1",
      locale: "tr",
      timezone: "America/New_York",
      hide_side_toolbar: "1",
      allow_symbol_change: "0",
      withdateranges: "0",
      save_image: "0",
      hide_top_toolbar: "0",
      hide_legend: "0",
      backgroundColor: "rgba(9,13,19,1)",
      gridColor: "rgba(255,255,255,0.05)",
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [range, symbol]);

  return (
    <div className="chart-shell">
      <div className="chart-canvas">
        <iframe
          key={`${symbol}-${range}`}
          src={src}
          title={`${symbol} grafiği`}
          allowFullScreen
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
      </div>

      {failed && (
        <div className="chart-overlay">
          <span className="chart-overlay__title">Grafik yüklenemedi</span>
          <span className="chart-overlay__msg">
            TradingView widget'ı bu ağda engellenmiş olabilir. Fiyat ve sinyal verileri etkilenmez.
          </span>
        </div>
      )}
    </div>
  );
}
