"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MoversTable from "./MoversTable";
import NewsFeed from "./NewsFeed";
import HeroPanel from "./HeroPanel";
import type { ChartRange } from "./PriceChart";
import StatsRow from "./StatsRow";
import TopBar from "./TopBar";
import SignalRadar from "./SignalRadar";
import TickerStrip from "./TickerStrip";
import { fmtPct, fmtPrice, timeAgo } from "@/lib/format";
import { TRIGGER_LABELS } from "@/lib/signals";
import { buildSnapshotMarket, loadSnapshot } from "@/lib/snapshot";
import type { BaselineMode, MarketResponse, NewsItem, ScanQuote, Signal } from "@/lib/types";

const REFRESH_MS = 15_000;
const ALERT_COOLDOWN_MS = 30 * 60_000;
const FIRED_KEY = "nasdaq-radar:fired:v2";

interface Toast {
  id: string;
  symbol: string;
  pct: number;
  price: number;
  label: string;
  headline: string | null;
}

export default function Dashboard() {
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);

  const [threshold, setThreshold] = useState(20);
  const [mode, setMode] = useState<BaselineMode>("day");
  const [selected, setSelected] = useState("NVDA");
  const [range, setRange] = useState<ChartRange>("1d");

  const [newsMap, setNewsMap] = useState<Record<string, NewsItem[]>>({});
  const [newsLoading, setNewsLoading] = useState(true);

  const [mounted, setMounted] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">("default");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const firedRef = useRef<Map<string, number>>(new Map());
  const firstLoadRef = useRef(true);
  const suppressRef = useRef(false);
  const pickedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const lastQuotesRef = useRef<Map<string, ScanQuote>>(new Map());

  /* ----------------------------- bildirimler ----------------------------- */

  useEffect(() => {
    setMounted(true);
    setNotifyPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);

    try {
      const raw = window.localStorage.getItem(FIRED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>;
        const cutoff = Date.now() - 6 * 3600_000;
        for (const [key, at] of Object.entries(parsed)) {
          if (typeof at === "number" && at > cutoff) firedRef.current.set(key, at);
        }
      }
    } catch {
      /* localStorage yoksa yok say */
    }
  }, []);

  const persistFired = useCallback(() => {
    try {
      const payload: Record<string, number> = {};
      for (const [key, at] of firedRef.current) payload[key] = at;
      window.localStorage.setItem(FIRED_KEY, JSON.stringify(payload));
    } catch {
      /* yok say */
    }
  }, []);

  const playChime = useCallback(() => {
    try {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = audioRef.current ?? new Ctor();
      audioRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const start = ctx.currentTime;
      [880, 1320].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const at = start + index * 0.14;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.07, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.4);
      });
    } catch {
      /* ses desteklenmiyorsa yok say */
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Toast) => {
      setToasts((current) => [...current.slice(-3), toast]);
      window.setTimeout(() => dismissToast(toast.id), 10_000);
    },
    [dismissToast],
  );

  const pushAlert = useCallback(
    (signal: Signal) => {
      showToast({
        id: `${signal.symbol}-${signal.trigger}-${Date.now()}`,
        symbol: signal.symbol,
        pct: signal.triggerPct,
        price: signal.price,
        label: TRIGGER_LABELS[signal.trigger],
        headline: signal.headline?.title ?? null,
      });

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const notification = new Notification(
            `${signal.symbol} ${fmtPct(signal.triggerPct)} · ${TRIGGER_LABELS[signal.trigger]}`,
            {
              body: `${signal.name}\n${fmtPrice(signal.price)} · Sinyal gücü ${signal.strength}/100${
                signal.headline ? `\n${signal.headline.title}` : ""
              }`,
              tag: `${signal.symbol}-${signal.trigger}`,
              silent: true,
            },
          );
          notification.onclick = () => {
            window.focus();
            setSelected(signal.symbol);
            notification.close();
          };
        } catch {
          /* bildirim oluşturulamadı */
        }
      }

      if (soundOn) playChime();
    },
    [playChime, showToast, soundOn],
  );

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "granted") {
      showToast({
        id: `test-${Date.now()}`,
        symbol: "SİNYAL",
        pct: 0,
        price: 0,
        label: "Bildirim kanalı açık",
        headline: "Eşiği aşan her yeni hareket anında bildirilecek.",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifyPermission(permission);

    if (permission === "granted") {
      try {
        new Notification("Bildirimler açıldı", {
          body: "Eşiği aşan her yeni sinyal anında buraya düşecek.",
          silent: true,
        });
      } catch {
        /* yok say */
      }
    }
  }, [showToast]);

  const toggleSound = useCallback(() => {
    setSoundOn((current) => {
      if (!current) playChime();
      return !current;
    });
  }, [playChime]);

  /* ------------------------------ veri akışı ----------------------------- */

  const loadMarket = useCallback(async () => {
    try {
      const loaded = await loadSnapshot();
      if (!loaded) throw new Error("Tarama anlık görüntüsüne ulaşılamadı");

      const data = buildSnapshotMarket(loaded.snapshot, threshold, mode);
      setMarket(data.market);
      setNewsMap(data.news);
      setNewsLoading(false);
      setStatus("live");
      setError(
        loaded.source === "bundled" ? "Canlı tarama akışı yok; depoyla gelen yedek görüntü gösteriliyor." : null,
      );
      setLastUpdated(data.market.dataTime);
      setCountdown(REFRESH_MS / 1000);

      const now = Date.now();

      // İlk yüklemede veya eşik/ölçüt değişiminde mevcut sinyaller sessizce işaretlenir.
      if (firstLoadRef.current || suppressRef.current) {
        for (const signal of data.market.signals) firedRef.current.set(`${signal.symbol}:${signal.trigger}`, now);
        firstLoadRef.current = false;
        suppressRef.current = false;
        persistFired();
        return;
      }

      const fresh: Signal[] = [];
      for (const signal of data.market.signals) {
        const key = `${signal.symbol}:${signal.trigger}`;
        const last = firedRef.current.get(key) ?? 0;
        if (now - last > ALERT_COOLDOWN_MS) {
          firedRef.current.set(key, now);
          fresh.push(signal);
        }
      }

      if (fresh.length) {
        fresh.slice(0, 3).forEach(pushAlert);
        persistFired();
      }
    } catch (err) {
      setStatus((current) => (current === "live" ? "live" : "error"));
      setError(err instanceof Error ? err.message : "Bağlantı hatası");
      setCountdown(REFRESH_MS / 1000);
    }
  }, [mode, persistFired, pushAlert, threshold]);

  useEffect(() => {
    void loadMarket();
    const id = window.setInterval(() => void loadMarket(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadMarket]);

  useEffect(() => {
    const id = window.setInterval(() => setCountdown((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadMarket();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadMarket]);

  const quotes = market?.quotes ?? [];
  const signals = market?.signals ?? [];
  const near = market?.near ?? [];

  useEffect(() => {
    if (!market) return;
    for (const quote of market.quotes) lastQuotesRef.current.set(quote.symbol, quote);
  }, [market]);

  const selectedQuote = useMemo<ScanQuote | null>(
    () => quotes.find((quote) => quote.symbol === selected) ?? lastQuotesRef.current.get(selected) ?? null,
    [quotes, selected],
  );

  const selectedSignal = useMemo<Signal | null>(
    () => signals.find((signal) => signal.symbol === selected) ?? null,
    [signals, selected],
  );

  useEffect(() => {
    if (pickedRef.current || !market) return;
    const candidate = market.signals[0] ?? market.quotes[0];
    if (candidate) setSelected(candidate.symbol);
    pickedRef.current = true;
  }, [market]);

  const allNews = useMemo(() => Object.values(newsMap).flat(), [newsMap]);

  const newsBuzz = useMemo(() => {
    if (!allNews.length) return 0;
    return allNews.reduce((sum, item) => sum + item.sentiment, 0) / allNews.length;
  }, [allNews]);

  const topGainer = quotes[0] ?? null;
  const heroChange = selectedQuote?.changePct ?? 0;
  const heroDelta = selectedQuote?.changeAbs ?? 0;

  const changeThreshold = (value: number) => {
    suppressRef.current = true;
    setThreshold(value);
  };

  const changeMode = (value: BaselineMode) => {
    suppressRef.current = true;
    setMode(value);
  };

  return (
    <div className="app">
      <TopBar
        threshold={threshold}
        changeThreshold={changeThreshold}
        mode={mode}
        changeMode={changeMode}
        mounted={mounted}
        lastUpdated={lastUpdated}
        totalScanned={market?.totalScanned ?? 0}
        sessionOpen={market?.session.isOpen ?? false}
        sessionLabel={market?.session.label ?? "Bağlanıyor"}
        soundOn={soundOn}
        toggleSound={toggleSound}
        notifyPermission={notifyPermission}
        onEnableNotifications={enableNotifications}
        status={status}
        hasMarket={Boolean(market)}
        countdown={countdown}
        onScan={loadMarket}
      />

      {error && (
        <div className="banner" role="alert">
          <strong>Veri uyarısı:</strong> {error}
          {market && <span> · Son başarılı tarama {mounted ? timeAgo(lastUpdated ?? 0) : ""}</span>}
        </div>
      )}

      <TickerStrip quotes={quotes} onSelect={setSelected} />

      <main className="main">
        <div className="col col--main">
          <StatsRow
            totalScanned={market?.totalScanned ?? 0}
            session={market?.session}
            signalsCount={signals.length}
            threshold={threshold}
            mode={mode}
            topGainer={topGainer}
            newsBuzz={newsBuzz}
            newsCount={allNews.length}
          />

          <HeroPanel
            selected={selected}
            quote={selectedQuote}
            signal={selectedSignal}
            change={heroChange}
            delta={heroDelta}
            mounted={mounted}
            threshold={threshold}
            range={range}
            onRange={setRange}
          />

          <NewsFeed symbol={selected} items={newsMap[selected] ?? []} loading={newsLoading} />
        </div>

        <aside className="col col--side">
          <SignalRadar
            signals={signals}
            near={near}
            threshold={threshold}
            mode={mode}
            selected={selected}
            onSelect={setSelected}
          />

          <MoversTable
            quotes={quotes}
            signals={signals}
            totalScanned={market?.totalScanned ?? 0}
            selected={selected}
            onSelect={setSelected}
          />

          <button type="button" className="news-refresh" onClick={() => void loadMarket()}>
            Tarama ve haberleri yenile
          </button>
        </aside>
      </main>

      <footer className="footer">
        <span>
          Tarama: TradingView Nasdaq tarayıcısı · GitHub Actions ile 5 dk'da bir tazelenen anlık görüntü · Grafik:
          TradingView · veriler gecikmeli olabilir
        </span>
        <span className="footer__warn">Yatırım tavsiyesi değildir. Sinyaller fiyat hareketine ve haber tonuna dayanır.</span>
      </footer>

      <div className="toasts" aria-live="polite" role="status">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <span className="toast__icon" aria-hidden="true">
              ⚡
            </span>
            <div className="toast__body">
              <p className="toast__title">
                <strong>{toast.symbol}</strong> {toast.pct > 0 ? fmtPct(toast.pct) : ""} · {toast.label}
              </p>
              <p className="toast__sub">
                {toast.price > 0 ? fmtPrice(toast.price) : "Bildirim kanalı hazır"}
                {toast.headline ? ` · ${toast.headline}` : ""}
              </p>
            </div>
            <button type="button" className="toast__close" onClick={() => dismissToast(toast.id)} aria-label="Kapat">
              ×
            </button>
          </div>
        ))}
      </div>

      <span className="sr-only" aria-live="polite">
        {signals.length} aktif sinyal
      </span>
    </div>
  );
}
