"use client";

import { useMemo, useState } from "react";
import RangeBar from "./RangeBar";
import PortfolioPanel from "./PortfolioPanel";
import { fmtPct, fmtPrice, pctClass } from "@/lib/format";
import type { ScanQuote, Signal } from "@/lib/types";
import { useWatchlist } from "@/lib/watchlist";

interface Props {
  quotes: ScanQuote[];
  signals: Signal[];
  totalScanned: number;
  selected: string;
  onSelect: (symbol: string) => void;
}

export default function MoversTable({ quotes, signals, totalScanned, selected, onSelect }: Props) {
  const flagged = useMemo(() => new Set(signals.map((signal) => signal.symbol)), [signals]);
  const { list, toggle, has } = useWatchlist();
  const [onlyWatch, setOnlyWatch] = useState(false);

  const visible = useMemo(
    () => (onlyWatch ? quotes.filter((quote) => list.includes(quote.symbol)) : quotes),
    [onlyWatch, quotes, list],
  );

  return (
    <>
      <section className="panel panel--movers">
        <header className="panel__head">
          <div>
            <h2 className="panel__title">Yükselenler</h2>
            <p className="panel__sub">{totalScanned.toLocaleString("tr-TR")} Nasdaq hissesi tarandı</p>
          </div>
          <div className="movers__tools">
            <button
              type="button"
              className={`filter-chip${onlyWatch ? " is-on" : ""}`}
              aria-pressed={onlyWatch}
              onClick={() => setOnlyWatch((value) => !value)}
            >
              ★ Takip{list.length ? ` (${list.length})` : ""}
            </button>
            <span className="panel__hint">canlı</span>
          </div>
        </header>

        <div className="movers">
          <div className="movers__labels">
            <span>#</span>
            <span>Hisse</span>
            <span>Fiyat</span>
            <span>Değişim</span>
          </div>

          <div className="movers__body">
            {visible.length === 0 && (
              <div className="movers__loading">
                {onlyWatch ? "Takip listesi boş. Yıldıza dokunarak hisse ekle." : "Tarama başlatılıyor…"}
              </div>
            )}

            {visible.map((quote, index) => (
              <div
                key={quote.symbol}
                role="button"
                tabIndex={0}
                className={`mover${selected === quote.symbol ? " is-selected" : ""}`}
                onClick={() => onSelect(quote.symbol)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(quote.symbol);
                  }
                }}
              >
                <span className="mover__rank">{index + 1}</span>
                <span className="mover__id">
                  <span className="mover__sym">
                    {quote.symbol}
                    {flagged.has(quote.symbol) && <span className="mover__flag" title="Eşik üstü sinyal" />}
                    {(quote.streak ?? 0) >= 2 && <span className="streak">{quote.streak} tur</span>}
                    <button
                      type="button"
                      className={`mover__star${has(quote.symbol) ? " is-on" : ""}`}
                      aria-pressed={has(quote.symbol)}
                      aria-label={has(quote.symbol) ? `${quote.symbol} takipten çıkar` : `${quote.symbol} takibe al`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggle(quote.symbol);
                      }}
                    >
                      ★
                    </button>
                  </span>
                  <span className="mover__name">{quote.name}</span>
                </span>
                <span className="mover__price">{fmtPrice(quote.price)}</span>
                <span className={`mover__chg ${pctClass(quote.changePct)}`}>{fmtPct(quote.changePct, 1)}</span>
                <span className="mover__range">
                  <RangeBar pos={quote.rangePos} hot={flagged.has(quote.symbol)} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PortfolioPanel quotes={quotes} onSelect={onSelect} />
    </>
  );
}
