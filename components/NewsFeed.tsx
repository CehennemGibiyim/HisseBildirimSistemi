"use client";

import { useMemo, useState } from "react";
import { timeAgo } from "@/lib/format";
import type { NewsItem } from "@/lib/types";

interface Props {
  symbol: string;
  items: NewsItem[];
  loading: boolean;
}

const LABEL_TEXT: Record<NewsItem["label"], string> = {
  positive: "Olumlu",
  neutral: "Nötr",
  negative: "Olumsuz",
};

export default function NewsFeed({ symbol, items, loading }: Props) {
  const [sort, setSort] = useState<"impact" | "new">("impact");

  const ordered = useMemo(() => {
    const copy = [...items];
    if (sort === "new") return copy.sort((a, b) => b.publishedAt - a.publishedAt);
    return copy.sort((a, b) => {
      const scoreA = Math.abs(a.sentiment) * 100 + Math.max(0, 24 - (Date.now() - a.publishedAt) / 36e5) * 0.6;
      const scoreB = Math.abs(b.sentiment) * 100 + Math.max(0, 24 - (Date.now() - b.publishedAt) / 36e5) * 0.6;
      return scoreB - scoreA;
    });
  }, [items, sort]);

  const positive = items.filter((item) => item.label === "positive").length;
  const negative = items.filter((item) => item.label === "negative").length;
  const avg = items.length ? items.reduce((sum, item) => sum + item.sentiment, 0) / items.length : 0;
  const tone = avg > 0.16 ? "positive" : avg < -0.16 ? "negative" : "neutral";

  return (
    <section className="panel panel--news">
      <header className="panel__head panel__head--news">
        <div>
          <h2 className="panel__title">
            Haber Analizi <span className="panel__title-sym">{symbol}</span>
          </h2>
          <p className="panel__sub">
            {items.length > 0
              ? `${items.length} manşet · ${positive} olumlu · ${negative} olumsuz`
              : "Manşetler taranıyor"}
          </p>
        </div>

        <div className="news-tools">
          {items.length > 0 && (
            <span className={`tone tone--${tone}`}>
              Ton {tone === "positive" ? "olumlu" : tone === "negative" ? "olumsuz" : "nötr"} ({Math.round(avg * 100)})
            </span>
          )}
          <div className="seg">
            <button type="button" className={sort === "impact" ? "is-active" : ""} onClick={() => setSort("impact")}>
              Etki
            </button>
            <button type="button" className={sort === "new" ? "is-active" : ""} onClick={() => setSort("new")}>
              Yeni
            </button>
          </div>
        </div>
      </header>

      <div className="news">
        {loading && items.length === 0 && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div className="news__item news__item--skeleton" key={i}>
                <span className="skel skel--line" />
                <span className="skel skel--line skel--short" />
              </div>
            ))}
          </>
        )}

        {!loading && items.length === 0 && (
          <div className="empty empty--news">
            <p className="empty__title">Bu sembol için taze haber bulunamadı</p>
            <p className="empty__text">Fiyat sinyalleri çalışmaya devam ediyor; haber kaynağı yeni manşet yayınladığında burada görünür.</p>
          </div>
        )}

        {ordered.map((item) => (
          <article className="news__item" key={item.id}>
            <div className="news__head">
              <span className={`sent-chip sent-chip--${item.label}`}>
                {LABEL_TEXT[item.label]}
                <span className="sent-chip__score">{Math.round(item.sentiment * 100)}</span>
              </span>
              <span className="news__publisher">{item.publisher}</span>
              <span className="news__time">{timeAgo(item.publishedAt)}</span>
            </div>
            <a className="news__title" href={item.link} target="_blank" rel="noreferrer noopener">
              {item.title}
            </a>
            {item.tags.length > 0 && (
              <div className="news__tags">
                {item.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
