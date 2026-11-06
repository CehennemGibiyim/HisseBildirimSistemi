"use client";

import RangeBar from "./RangeBar";
import { fmtPct, fmtPrice, timeAgo } from "@/lib/format";
import { MODE_LABELS, TRIGGER_LABELS } from "@/lib/signals";
import type { BaselineMode, Signal } from "@/lib/types";

interface Props {
  signals: Signal[];
  near: Signal[];
  threshold: number;
  mode: BaselineMode;
  selected: string;
  onSelect: (symbol: string) => void;
}

const SEVERITY_LABEL: Record<Signal["severity"], string> = {
  extreme: "Kritik",
  strong: "Güçlü",
  watch: "İzle",
};

function SignalCard({
  signal,
  selected,
  onSelect,
}: {
  signal: Signal;
  selected: boolean;
  onSelect: (symbol: string) => void;
}) {
  return (
    <button
      type="button"
      className={`signal signal--${signal.severity}${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(signal.symbol)}
    >
      <div className="signal__top">
        <div className="signal__id">
          <span className="signal__sym">{signal.symbol}</span>
          <span className={`chip chip--${signal.severity}`}>{SEVERITY_LABEL[signal.severity]}</span>
        </div>
        <span className="signal__pct">{fmtPct(signal.triggerPct)}</span>
      </div>

      <div className="signal__name">
        {signal.name} <span className="signal__sector">· {signal.sector}</span>
      </div>

      <div className="signal__meta">
        <span>{TRIGGER_LABELS[signal.trigger]}</span>
        <span className="signal__dot" />
        <span>{fmtPrice(signal.price)}</span>
        <span className="signal__dot" />
        <span className="signal__age">{timeAgo(signal.detectedAt)}</span>
      </div>

      <div className="signal__strength">
        <span className="signal__strength-label">Güç</span>
        <span className="meter">
          <span className="meter__fill" style={{ width: `${signal.strength}%` }} />
        </span>
        <span className="signal__strength-value">{signal.strength}</span>
      </div>

      {signal.headline ? (
        <div className="signal__news">
          <span className={`sent-dot sent-dot--${signal.headline.label}`} />
          <span className="signal__news-title">{signal.headline.title}</span>
        </div>
      ) : (
        <div className="signal__news signal__news--muted">Bu hareketi destekleyen taze manşet yok</div>
      )}

      <div className="signal__foot">
        <RangeBar pos={signal.rangePos} hot />
        <span className="signal__range-label">
          {fmtPrice(signal.dayLow)} – {fmtPrice(signal.dayHigh)}
        </span>
        <span className="signal__hint">grafik →</span>
      </div>
    </button>
  );
}

export default function SignalRadar({ signals, near, threshold, mode, selected, onSelect }: Props) {
  return (
    <section className="panel panel--signals">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">
            Sinyal Radarı
            {signals.length > 0 && <span className="count">{signals.length}</span>}
          </h2>
          <p className="panel__sub">
            Eşik ≥ %{threshold} · {MODE_LABELS[mode].toLowerCase()}
          </p>
        </div>
        <span className={`pulse${signals.length ? " pulse--hot" : ""}`} aria-hidden="true" />
      </header>

      <div className="signal-list">
        {signals.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">◎</div>
            <p className="empty__title">Eşik üstü sinyal yok</p>
            <p className="empty__text">
              Tarama sürüyor. Bir hisse %{threshold} artışa ulaştığında burada belirir ve bildirim gönderilir.
            </p>
          </div>
        ) : (
          signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} selected={selected === signal.symbol} onSelect={onSelect} />
          ))
        )}
      </div>

      {near.length > 0 && (
        <div className="near">
          <p className="near__title">Eşiğe en yakınlar</p>
          {near.map((signal) => {
            const progress = Math.min(100, Math.max(0, (signal.triggerPct / threshold) * 100));
            return (
              <button key={signal.id} type="button" className="near__row" onClick={() => onSelect(signal.symbol)}>
                <span className="near__sym">{signal.symbol}</span>
                <span className="near__bar">
                  <span className="near__fill" style={{ width: `${progress}%` }} />
                </span>
                <span className="near__pct">{fmtPct(signal.triggerPct, 1)}</span>
                <span className="near__target">/ %{threshold}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
