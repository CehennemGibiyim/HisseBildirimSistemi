"use client";

import { fmtPct, fmtPrice, pctClass } from "@/lib/format";
import type { ScanQuote } from "@/lib/types";

interface Props {
  quotes: ScanQuote[];
  onSelect: (symbol: string) => void;
}

export default function TickerStrip({ quotes, onSelect }: Props) {
  if (!quotes.length) {
    return (
      <div className="ticker">
        <div className="ticker__row ticker__row--idle">Nasdaq taranıyor…</div>
      </div>
    );
  }

  const items = quotes.slice(0, 24);

  return (
    <div className="ticker" aria-label="Canlı fiyat şeridi">
      <div className="ticker__track">
        {[0, 1].map((copy) => (
          <div className="ticker__row" key={copy} aria-hidden={copy === 1}>
            {items.map((quote) => (
              <button
                key={`${copy}-${quote.symbol}`}
                type="button"
                className="ticker__item"
                onClick={() => onSelect(quote.symbol)}
                tabIndex={copy === 1 ? -1 : 0}
              >
                <span className="ticker__sym">{quote.symbol}</span>
                <span className="ticker__price">{fmtPrice(quote.price)}</span>
                <span className={`ticker__chg ${pctClass(quote.changePct)}`}>{fmtPct(quote.changePct, 1)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
