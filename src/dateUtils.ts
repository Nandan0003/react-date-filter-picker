import type { DateFilterOption } from "./types";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export const startOfDay = (d: Date): Date => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
};

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return startOfDay(r);
};

export const sameDay = (a: Date | null, b: Date | null): boolean =>
  !!a && !!b && startOfDay(a).getTime() === startOfDay(b).getTime();

/** Strictly between a and b (exclusive), order-independent. */
export const inRange = (d: Date, a: Date | null, b: Date | null): boolean => {
  if (!a || !b) return false;
  const t = startOfDay(d).getTime();
  const lo = Math.min(startOfDay(a).getTime(), startOfDay(b).getTime());
  const hi = Math.max(startOfDay(a).getTime(), startOfDay(b).getTime());
  return t > lo && t < hi;
};

/** `dd Mon yyyy`, e.g. `06 Jul 2026`. */
export const formatDate = (d: Date | null): string => {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")} ${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear()}`;
};

export const daysInMonth = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();
export const firstWeekday = (y: number, m: number): number => new Date(y, m, 1).getDay();

type QuickRangeFn = () => { start: Date; end: Date };

// Ranges are inclusive and count today, so "Last 7 Days" = today + previous 6 days.
export const QUICK_RANGE: Partial<Record<DateFilterOption, QuickRangeFn>> = {
  "Last 7 Days": () => ({ start: addDays(new Date(), -6), end: startOfDay(new Date()) }),
  "Last 30 Days": () => ({ start: addDays(new Date(), -29), end: startOfDay(new Date()) }),
  "Next 7 Days": () => ({ start: startOfDay(new Date()), end: addDays(new Date(), 6) }),
};

export const isQuickOption = (opt: DateFilterOption): boolean =>
  Object.prototype.hasOwnProperty.call(QUICK_RANGE, opt);

export const isEndOnly = (f: DateFilterOption): boolean => f === "Before" || f === "On or Before";
export const isStartOnly = (f: DateFilterOption): boolean =>
  f === "On" || f === "After" || f === "On or After";

export const buildLabel = (opt: DateFilterOption, start: Date | null, end: Date | null): string => {
  if (isQuickOption(opt)) return opt;
  if (opt === "Between") return start && end ? `${formatDate(start)} - ${formatDate(end)}` : "";
  if (isEndOnly(opt)) return end ? `${opt} ${formatDate(end)}` : "";
  return start ? `${opt} ${formatDate(start)}` : "";
};

/** Convert the external `dates[]` array into the internal start/end draft. */
export const datesToStartEnd = (
  f: DateFilterOption,
  dates: Date[] | undefined
): { start: Date | null; end: Date | null } => {
  if (!dates || dates.length === 0) return { start: null, end: null };
  if (isEndOnly(f)) return { start: null, end: new Date(dates[0]) };
  if (isStartOnly(f)) return { start: new Date(dates[0]), end: null };
  return {
    start: dates[0] ? new Date(dates[0]) : null,
    end: dates[1] ? new Date(dates[1]) : null,
  };
};

/** Convert the internal start/end draft into the external `dates[]` array. */
export const buildDates = (f: DateFilterOption, s: Date | null, e: Date | null): Date[] => {
  if (isEndOnly(f)) return e ? [e] : [];
  if (isStartOnly(f)) return s ? [s] : [];
  return [s, e].filter((d): d is Date => d !== null);
};
