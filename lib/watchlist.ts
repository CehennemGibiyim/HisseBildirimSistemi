"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface Position {
  symbol: string;
  shares: number;
  cost: number;
}

type Listener = () => void;

const CHANNEL = "nasdaq-radar:store";
const WATCH_KEY = "nasdaq-radar:watchlist:v2";
const PORT_KEY = "nasdaq-radar:portfolio:v2";

function makeStore<T>(key: string, fallback: T) {
  let cache: T = fallback;
  let loaded = false;
  const listeners = new Set<Listener>();

  const read = (): T => {
    if (loaded || typeof window === "undefined") return cache;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) cache = JSON.parse(raw) as T;
    } catch {
      /* bozuk kayıt yok sayılır */
    }
    return cache;
  };

  const emit = () => listeners.forEach((listener) => listener());

  return {
    subscribe(listener: Listener) {
      read();
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key !== key) return;
        loaded = false;
        emit();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(CHANNEL, emit);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(CHANNEL, emit);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => fallback,
    set(next: T) {
      cache = next;
      loaded = true;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* kota doluysa sessizce geç */
      }
      emit();
      window.dispatchEvent(new Event(CHANNEL));
    },
  };
}

const watchStore = makeStore<string[]>(WATCH_KEY, []);
const positionStore = makeStore<Position[]>(PORT_KEY, []);

export function useWatchlist() {
  const list = useSyncExternalStore(
    watchStore.subscribe,
    watchStore.getSnapshot,
    watchStore.getServerSnapshot,
  );

  const toggle = useCallback((symbol: string) => {
    const current = watchStore.getSnapshot();
    const next = current.includes(symbol)
      ? current.filter((item) => item !== symbol)
      : [...current, symbol].sort();
    watchStore.set(next);
  }, []);

  return { list, toggle, has: (symbol: string) => list.includes(symbol) };
}

export function usePortfolio() {
  const positions = useSyncExternalStore(
    positionStore.subscribe,
    positionStore.getSnapshot,
    positionStore.getServerSnapshot,
  );

  const add = useCallback((position: Position) => {
    const rest = positionStore.getSnapshot().filter((item) => item.symbol !== position.symbol);
    positionStore.set([...rest, position].sort((a, b) => a.symbol.localeCompare(b.symbol)));
  }, []);

  const remove = useCallback((symbol: string) => {
    positionStore.set(positionStore.getSnapshot().filter((item) => item.symbol !== symbol));
  }, []);

  return { positions, add, remove };
}
