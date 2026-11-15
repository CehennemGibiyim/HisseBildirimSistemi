"use client";

import { useMemo, useState, type FormEvent } from "react";
import { fmtPct, fmtPrice, pctClass } from "@/lib/format";
import type { ScanQuote } from "@/lib/types";
import { usePortfolio } from "@/lib/watchlist";

interface Props {
  quotes: ScanQuote[];
  onSelect: (symbol: string) => void;
}

export default function PortfolioPanel({ quotes, onSelect }: Props) {
  const { positions, add, remove } = usePortfolio();
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");

  const prices = useMemo(() => {
    const map = new Map<string, number>();
    for (const quote of quotes) map.set(quote.symbol, quote.price);
    return map;
  }, [quotes]);

  let totalCost = 0;
  let totalValue = 0;
  for (const position of positions) {
    const price = prices.get(position.symbol) ?? position.cost;
    totalCost += position.shares * position.cost;
    totalValue += position.shares * price;
  }
  const pl = totalValue - totalCost;
  const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ticker = symbol.trim().toUpperCase();
    const shareCount = Number(shares.replace(",", "."));
    const unitCost = Number(cost.replace(",", "."));
    if (!ticker || !Number.isFinite(shareCount) || shareCount <= 0 || !Number.isFinite(unitCost) || unitCost <= 0) {
      return;
    }
    add({ symbol: ticker, shares: shareCount, cost: unitCost });
    setSymbol("");
    setShares("");
    setCost("");
  };

  return (
    <section className="panel panel--portfolio">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Portföy</h2>
          <p className="panel__sub">
            {positions.length ? `${positions.length} pozisyon · tarayıcıda saklanır` : "Maliyet gir, kâr/zararı izle"}
          </p>
        </div>
        {positions.length > 0 && <span className={`portfolio__pl ${pctClass(plPct)}`}>{fmtPct(plPct, 1)}</span>}
      </header>

      <div className="portfolio__body">
        {positions.length === 0 && (
          <p className="portfolio__empty">
            Aşağıdan sembol, adet ve ortalama maliyet ekle. Değerleme her taramada canlı fiyatla güncellenir.
          </p>
        )}

        {positions.map((position) => {
          const price = prices.get(position.symbol) ?? 0;
          const value = price > 0 ? price * position.shares : position.shares * position.cost;
          const diff = price > 0 ? ((price - position.cost) / position.cost) * 100 : 0;
          return (
            <div className="portfolio__row" key={position.symbol}>
              <button type="button" className="portfolio__sym" onClick={() => onSelect(position.symbol)}>
                <strong>{position.symbol}</strong>
                <span>
                  {position.shares.toLocaleString("tr-TR")} adet · {fmtPrice(position.cost)}
                </span>
              </button>
              <span className="portfolio__val">
                {fmtPrice(value)}
                <span className={pctClass(diff)}>{price > 0 ? fmtPct(diff, 1) : "fiyat yok"}</span>
              </span>
              <button
                type="button"
                className="portfolio__remove"
                aria-label={`${position.symbol} pozisyonunu sil`}
                onClick={() => remove(position.symbol)}
              >
                ×
              </button>
            </div>
          );
        })}

        {positions.length > 0 && (
          <div className="portfolio__total">
            <span>Toplam</span>
            <span>
              {fmtPrice(totalValue)} <em className={pctClass(plPct)}>{fmtPct(plPct, 1)}</em>
            </span>
          </div>
        )}
      </div>

      <form className="portfolio__form" onSubmit={submit}>
        <input
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
          placeholder="Sembol"
          aria-label="Sembol"
          maxLength={8}
        />
        <input
          value={shares}
          onChange={(event) => setShares(event.target.value)}
          placeholder="Adet"
          aria-label="Adet"
          inputMode="decimal"
        />
        <input
          value={cost}
          onChange={(event) => setCost(event.target.value)}
          placeholder="Maliyet $"
          aria-label="Ortalama maliyet"
          inputMode="decimal"
        />
        <button type="submit">Ekle</button>
      </form>
    </section>
  );
}
