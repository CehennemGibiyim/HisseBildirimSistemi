"use client";

import RangeBar from "./RangeBar";
import { fmtPct, fmtPrice, pctClass } from "@/lib/format";
import type { ScanQuote, Signal } from "@/lib/types";

interface Props {
  quotes: ScanQuote[];
  signals: Signal[];
  totalScanned: number;
  selected: string;
  onSelect: (symbol: string) => void;
}

export default function MoversTable({ quotes, signals, totalScanned, selected, onSelect }: Props) {
  const flagged = new Set(signals.map((signal) => signal.symbol));

  return (
    <section className="panel panel--movers">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Yükselenler</h2>
          <p className="panel__sub">{totalScanned.toLocaleString("tr-TR")} Nasdaq hissesi tarandı</p>
        </div>
        <span className="panel__hint">canlı</span>
      </header>

      <div className="movers">
        <div className="movers__labels">
          <span>#</span>
          <span>Hisse</span>
          <span>Fiyat</span>
          <span>Değişim</span>
        </div>

        <div className="movers__body">
          {quotes.length === 0 && <div className="movers__loading">Tarama başlatılıyor…</div>}

          {quotes.map((quote, index) => (
            <button
              key={quote.symbol}
              type="button"
              className={`mover${selected === quote.symbol ? " is-selected" : ""}`}
              onClick={() => onSelect(quote.symbol)}
            >
              <span className="mover__rank">{index + 1}</span>
              <span className="mover__id">
                <span className="mover__sym">
                  {quote.symbol}
                  {flagged.has(quote.symbol) && <span className="mover__flag" title="Eşik üstü sinyal" />}
                </span>
                <span className="mover__name">{quote.name}</span>
              </span>
              <span className="mover__price">{fmtPrice(quote.price)}</span>
              <span className={`mover__chg ${pctClass(quote.changePct)}`}>{fmtPct(quote.changePct, 1)}</span>
              <span className="mover__range">
                <RangeBar pos={quote.rangePos} hot={flagged.has(quote.symbol)} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
