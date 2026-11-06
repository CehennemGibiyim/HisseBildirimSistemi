/**
 * "Izleme baslangicindan itibaren" olcutu icin gunun ilk gorulen fiyatlarini tutar.
 * Statik surumde sunucu yok; temel fiyatlar tarayicinin localStorage'inda saklanir
 * ve New York gunu degistiginde kendiliginden sifirlanir.
 */

const KEY = "nasdaq-radar:baseline:v1";

interface Entry {
  price: number;
  at: number;
  day: string;
}

type Store = Record<string, Entry>;

export function newYorkDayKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* kota dolu ya da gizli mod: yok say */
  }
}

export function trackAndGetBaseline(symbol: string, price: number): { price: number; at: number } {
  const day = newYorkDayKey();
  const store = read();
  const current = store[symbol];

  if (!current || current.day !== day || !Number.isFinite(current.price) || current.price <= 0) {
    const fresh: Entry = { price, at: Date.now(), day };
    store[symbol] = fresh;
    write(store);
    return { price: fresh.price, at: fresh.at };
  }

  return { price: current.price, at: current.at };
}
