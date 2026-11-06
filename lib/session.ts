import type { MarketSession } from "./types";

const TZ = "America/New_York";

interface Parts {
  weekday: string;
  hour: number;
  minute: number;
  second: number;
}

function nyParts(now: Date): Parts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const hour = Number(pick("hour")) % 24;

  return {
    weekday: pick("weekday"),
    hour,
    minute: Number(pick("minute")),
    second: Number(pick("second")),
  };
}

function mins(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function humanDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours <= 0) return `${minutes} dk`;
  return `${hours} sa ${minutes} dk`;
}

export function marketSession(now = new Date()): MarketSession {
  const parts = nyParts(now);
  const clock = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const dayNames: Record<string, string> = {
    Sat: "Cumartesi",
    Sun: "Pazar",
  };
  const weekend = Boolean(dayNames[parts.weekday]);
  const current = mins(parts.hour, parts.minute);

  const openMin = mins(9, 30);
  const closeMin = mins(16, 0);
  const preMin = mins(4, 0);
  const afterMin = mins(20, 0);

  if (!weekend && current >= openMin && current < closeMin) {
    return {
      isOpen: true,
      label: "Seans açık",
      timezone: TZ,
      clock,
      nextEvent: `Kapanışa ${humanDuration(closeMin - current)}`,
    };
  }

  if (!weekend && current >= preMin && current < openMin) {
    return {
      isOpen: false,
      label: "Açılış öncesi",
      timezone: TZ,
      clock,
      nextEvent: `Açılışa ${humanDuration(openMin - current)}`,
    };
  }

  if (!weekend && current >= closeMin && current < afterMin) {
    return {
      isOpen: false,
      label: "Kapanış sonrası",
      timezone: TZ,
      clock,
      nextEvent: "Sonrası seans 20:00'de kapanır",
    };
  }

  if (current >= closeMin || weekend) {
    return {
      isOpen: false,
      label: "Seans kapalı",
      timezone: TZ,
      clock,
      nextEvent: "Son kapanış verileri gösteriliyor",
    };
  }

  return {
    isOpen: false,
    label: "Seans kapalı",
    timezone: TZ,
    clock,
    nextEvent: `Açılışa ${humanDuration(openMin - current)}`,
  };
}
