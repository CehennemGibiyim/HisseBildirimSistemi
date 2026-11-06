"use client";

import { fmtClock } from "@/lib/format";
import { MODE_LABELS } from "@/lib/signals";
import type { BaselineMode } from "@/lib/types";

interface Props {
  threshold: number;
  changeThreshold: (value: number) => void;
  mode: BaselineMode;
  changeMode: (value: BaselineMode) => void;
  mounted: boolean;
  lastUpdated: number | null;
  totalScanned: number;
  sessionOpen: boolean;
  sessionLabel: string;
  soundOn: boolean;
  toggleSound: () => void;
  notifyPermission: NotificationPermission | "unsupported";
  onEnableNotifications: () => Promise<void> | void;
  status: "loading" | "live" | "error";
  hasMarket: boolean;
  countdown: number;
  onScan: () => Promise<void> | void;
}

const THRESHOLDS = [10, 15, 20, 25, 30, 50];
const MODES: BaselineMode[] = ["day", "low", "session"];

export default function TopBar({
  threshold,
  changeThreshold,
  mode,
  changeMode,
  mounted,
  lastUpdated,
  totalScanned,
  sessionOpen,
  sessionLabel,
  soundOn,
  toggleSound,
  notifyPermission,
  onEnableNotifications,
  status,
  hasMarket,
  countdown,
  onScan,
}: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <span className="brand__bar brand__bar--1" />
          <span className="brand__bar brand__bar--2" />
          <span className="brand__bar brand__bar--3" />
          <span className="brand__bar brand__bar--4" />
        </span>
        <div className="brand__text">
          <h1>
            NASDAQ <span>SİNYAL RADARI</span>
          </h1>
          <p>
            %{threshold} hareket taraması · {totalScanned.toLocaleString("tr-TR")} hisse
          </p>
        </div>
      </div>

      <div className="topbar__status">
        <span className={`session ${sessionOpen ? "session--open" : "session--closed"}`}>
          <i className="session__dot" />
          {sessionLabel}
        </span>
        <span className="topbar__clock">
          {mounted ? fmtClock(lastUpdated) : "--:--:--"} <em>NY</em>
        </span>
      </div>

      <div className="topbar__controls">
        <label className="control">
          <span>Eşik</span>
          <select value={threshold} onChange={(event) => changeThreshold(Number(event.target.value))} aria-label="Artış eşiği">
            {THRESHOLDS.map((value) => (
              <option value={value} key={value}>
                %{value}
              </option>
            ))}
          </select>
        </label>

        <label className="control control--mode">
          <span>Ölçüt</span>
          <select value={mode} onChange={(event) => changeMode(event.target.value as BaselineMode)} aria-label="Artış ölçütü">
            {MODES.map((value) => (
              <option value={value} key={value}>
                {MODE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`icon-btn${soundOn ? " is-on" : ""}`}
          onClick={toggleSound}
          title={soundOn ? "Sesli uyarı açık" : "Sesli uyarı kapalı"}
          aria-pressed={soundOn}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <path
              d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4Zm11.2-1.3a5.2 5.2 0 0 1 0 7.6m2.6-10.2a8.6 8.6 0 0 1 0 12.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <button
          type="button"
          className={`icon-btn${notifyPermission === "granted" ? " is-on" : ""}`}
          onClick={() => void onEnableNotifications()}
          title={
            notifyPermission === "granted"
              ? "Bildirimler açık"
              : notifyPermission === "denied"
                ? "Bildirimler tarayıcıda engellenmiş"
                : "Anlık bildirimleri aç"
          }
        >
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <path
              d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3.2L5 15.5h14l-1.5-3.3V9A5.5 5.5 0 0 0 12 3.5Zm-2 12a2 2 0 0 0 4 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {notifyPermission !== "granted" && <span className="icon-btn__dot" />}
        </button>

        <button
          type="button"
          className="btn btn--accent"
          onClick={() => void onScan()}
          disabled={status === "loading" && !hasMarket}
        >
          <span className={`live-dot${status === "live" ? " is-live" : ""}`} />
          {status === "loading" && !hasMarket ? "Taranıyor…" : `Tara · ${countdown}s`}
        </button>
      </div>
    </header>
  );
}
