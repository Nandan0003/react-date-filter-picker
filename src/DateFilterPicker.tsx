import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  DATE_FILTER_OPTIONS,
  type DateFilterOption,
  type DateFilterPickerProps,
  type DateFilterValue,
} from "./types";
import {
  MONTHS,
  QUICK_RANGE,
  WEEKDAYS,
  buildDates,
  buildLabel,
  datesToStartEnd,
  daysInMonth,
  firstWeekday,
  formatDate,
  inRange,
  isEndOnly,
  isQuickOption,
  isStartOnly,
  sameDay,
} from "./dateUtils";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "./icons";

const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(" ");

/**
 * Modal containers that trap pointer events / focus (Radix & shadcn Dialog, Sheet,
 * AlertDialog, vaul Drawer, native <dialog>, …). When the field lives inside one,
 * the popover is portaled into it so it stays clickable and focusable.
 */
const MODAL_SELECTOR = '[role="dialog"], [role="alertdialog"], dialog';

/** Theme variables copied from the field to the portaled popover so per-instance theming works. */
const THEME_VARS = [
  "--dfp-primary", "--dfp-primary-hover", "--dfp-primary-disabled", "--dfp-primary-contrast",
  "--dfp-primary-soft", "--dfp-primary-soft-text", "--dfp-range", "--dfp-range-text",
  "--dfp-today-ring", "--dfp-focus-ring", "--dfp-surface", "--dfp-border", "--dfp-border-hover",
  "--dfp-divider", "--dfp-hover", "--dfp-hover-soft", "--dfp-text", "--dfp-text-strong",
  "--dfp-heading", "--dfp-text-muted", "--dfp-text-subtle", "--dfp-skeleton", "--dfp-radius",
  "--dfp-popover-radius", "--dfp-font-size", "--dfp-font-family", "--dfp-z-index",
  "--dfp-popover-width", "--dfp-shadow", "--dfp-accent", "--dfp-accent-contrast",
  "--dfp-color-scheme", "--dfp-accent-shade", "--dfp-on-light",
] as const;

/** sRGB relative luminance (WCAG) of a computed CSS colour string; null if not parseable. */
const relativeLuminance = (color: string): number | null => {
  const nums = (s: string) => s.match(/-?[\d.]+%?/g)?.map((n) => (n.endsWith("%") ? parseFloat(n) / 100 : parseFloat(n))) ?? [];
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  if (/^rgba?\(/.test(color)) {
    const [r, g, b] = nums(color);
    return 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
  }
  if (/^color\(srgb/.test(color)) {
    const [r, g, b] = nums(color.replace("color(srgb", ""));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  if (/^(oklch|oklab)\(/.test(color)) {
    const [l] = nums(color);
    return Math.min(1, l > 1 ? l / 100 : l) ** 3; // OK lightness → luminance (close enough for a threshold)
  }
  if (/^(lch|lab)\(/.test(color)) {
    const [raw] = nums(color);
    const L = raw > 1 ? raw : raw * 100; // CIE lightness 0–100
    return L > 8 ? ((L + 16) / 116) ** 3 : L / 903.3;
  }
  return null;
};

type AccentState = { on: boolean; light: boolean; low: boolean };
const NO_ACCENT: AccentState = { on: false, light: false, low: false };

/**
 * Reads the accent in effect on `el` (from the prop's inline variable or CSS).
 * - `light`: white text would fail 3:1 on the accent → dark text on it.
 * - `low`: the accent is under 4.5:1 against the picker surface of the current theme
 *   (light accent on a light picker, dark accent on a dark one) → text shades and
 *   rings are mixed toward the theme's text colour.
 * Resolves colours through a probe element (no canvas, so it is safe in jsdom).
 */
const readAccent = (el: Element): AccentState => {
  if (getComputedStyle(el).getPropertyValue("--dfp-accent").trim() === "") return NO_ACCENT;
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;color:var(--dfp-accent);background-color:var(--dfp-surface)";
  el.appendChild(probe);
  const ps = getComputedStyle(probe);
  const accentLum = relativeLuminance(ps.color);
  const surfaceLum = relativeLuminance(ps.backgroundColor) ?? 1;
  probe.remove();
  if (accentLum === null) return { on: true, light: false, low: false };
  const ratio = (Math.max(accentLum, surfaceLum) + 0.05) / (Math.min(accentLum, surfaceLum) + 0.05);
  // 4.5:1 because the accent is also used as text (active mode label).
  return { on: true, light: accentLum > 0.3, low: ratio < 4.5 };
};

const readThemeOverrides = (from: Element, to: Element): Record<string, string> => {
  const a = getComputedStyle(from);
  const b = getComputedStyle(to);
  const out: Record<string, string> = {};
  for (const v of THEME_VARS) {
    const val = a.getPropertyValue(v).trim();
    // An empty computed value means the field set the variable to `initial`
    // (e.g. `--dfp-font-family: initial` → use the inherited app font); mirror that.
    if (val !== b.getPropertyValue(v).trim()) out[v] = val || "initial";
  }
  return out;
};

export function DateFilterPicker({
  label = "Date",
  value = null,
  onChange,
  placeholder = "Select date",
  isLoading = false,
  disabled = false,
  options = DATE_FILTER_OPTIONS,
  defaultFilter,
  title = "Select Date",
  applyLabel = "Apply",
  clearLabel = "Clear",
  className,
  popoverClassName,
  accentColor,
  theme = "auto",
  id,
  name,
}: DateFilterPickerProps) {
  const autoId = useId();
  const triggerId = id ?? `dfp-${autoId}`;
  const titleId = `${triggerId}-title`;

  const fallbackFilter: DateFilterOption =
    defaultFilter ?? (options.includes("Between") ? "Between" : options[0] ?? "Between");

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Measured position (CSS top/left) for the portaled popover; null until measured
  // (kept invisible for that frame to avoid a flash at 0,0).
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  // Where the popover is portaled: document.body, or the enclosing modal container.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [themeVars, setThemeVars] = useState<Record<string, string>>({});

  // Accent mode: derive every shade from one brand colour, given either by the
  // `accentColor` prop or by a `--dfp-accent` CSS variable (global or per instance).
  const [accent, setAccent] = useState<AccentState>(NO_ACCENT);
  useLayoutEffect(() => {
    if (wrapRef.current) setAccent(readAccent(wrapRef.current));
  }, [className, accentColor, theme]);
  const accentOn = !!accentColor || accent.on;
  // "auto" adds no class: the CSS follows the app's dark-mode marker on an ancestor.
  const themeClass = theme !== "auto" ? `dfp-theme-${theme}` : null;
  const accentClasses = cx(
    themeClass,
    accentOn && "dfp-accent",
    accentOn && accent.light && "dfp-accent--light",
    accentOn && accent.low && "dfp-accent--low"
  );
  const accentStyle = accentColor ? ({ "--dfp-accent": accentColor } as CSSProperties) : undefined;

  // Draft state — only committed to `value` on Apply.
  const initialFilter = value?.filter ?? fallbackFilter;
  const initial = datesToStartEnd(initialFilter, value?.dates);
  const [filter, setFilter] = useState<DateFilterOption>(initialFilter);
  const [start, setStart] = useState<Date | null>(initial.start);
  const [end, setEnd] = useState<Date | null>(initial.end);
  const [pickingStart, setPickingStart] = useState(true); // "Between": which end is next
  const [viewDate, setViewDate] = useState<Date>(initial.start ?? initial.end ?? new Date());

  const resetDraftFromValue = (): void => {
    const nextFilter = value?.filter ?? fallbackFilter;
    const { start: s, end: e } = datesToStartEnd(nextFilter, value?.dates);
    setFilter(nextFilter);
    setStart(s);
    setEnd(e);
    setPickingStart(true);
    setViewDate(s ?? e ?? new Date());
  };

  const closeAndReset = (restoreFocus = false): void => {
    resetDraftFromValue();
    setOpen(false);
    setCoords(null);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const openPicker = (): void => {
    resetDraftFromValue();
    const wrap = wrapRef.current;
    const modal = wrap?.closest<HTMLElement>(MODAL_SELECTOR) ?? null;
    const target = modal ?? document.body;
    setPortalTarget(target);
    setThemeVars(wrap ? readThemeOverrides(wrap, target) : {});
    if (wrap) setAccent(readAccent(wrap)); // pick up CSS / theme changes since mount
    setOpen(true);
  };

  // Close on outside click / Escape / any scroll / resize.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent): void => {
      if (!(e.target instanceof Node)) return;
      const inside = wrapRef.current?.contains(e.target) || popRef.current?.contains(e.target);
      if (!inside) closeAndReset();
    };
    // Registered on window in the capture phase so it runs before dialog libraries
    // (Radix listens on document, capture phase): Escape closes only the picker,
    // not the dialog it sits in.
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      closeAndReset(true);
    };
    // The popover is fixed + portaled, so close rather than chase a moving trigger.
    const onScroll = (e: Event): void => {
      if (e.target instanceof Node && popRef.current?.contains(e.target)) return;
      closeAndReset();
    };
    const onResize = (): void => closeAndReset();

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onEsc, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onEsc, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Open into whichever side has room (below by default, above if needed).
  useLayoutEffect(() => {
    if (!open || !wrapRef.current || !popRef.current) return;
    const margin = 8;
    const trigger = wrapRef.current.getBoundingClientRect();
    const popEl = popRef.current;
    const pop = popEl.getBoundingClientRect();

    // `position: fixed` is relative to the viewport — unless an ancestor (e.g. a
    // dialog using `transform: translate(-50%, -50%)`) creates a new containing
    // block. Derive that block's on-screen origin from where the popover actually
    // sits versus the top/left currently applied, and offset by it.
    const originX = pop.left - (parseFloat(popEl.style.left) || 0);
    const originY = pop.top - (parseFloat(popEl.style.top) || 0);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - trigger.bottom;
    const spaceAbove = trigger.top;
    const openUpward = spaceBelow < pop.height + margin && spaceAbove > spaceBelow;

    let top = openUpward ? trigger.top - pop.height - margin : trigger.bottom + margin;
    top = Math.max(margin, Math.min(top, vh - pop.height - margin));

    let left = trigger.left;
    if (left + pop.width > vw - margin) left = vw - pop.width - margin;
    left = Math.max(margin, left);

    setCoords({ top: Math.round(top - originY), left: Math.round(left - originX) });
  }, [open, filter, portalTarget]);

  // Move focus into the popover once it is positioned (keyboard users land on the
  // active filter mode); focus returns to the trigger on Escape / Apply / Clear / ×.
  const positioned = coords !== null;
  useEffect(() => {
    if (!open || !positioned || !popRef.current) return;
    if (popRef.current.contains(document.activeElement)) return;
    popRef.current.querySelector<HTMLElement>(".dfp-option--active, .dfp-option")?.focus({ preventScroll: true });
  }, [open, positioned]);

  const selectFilter = (opt: DateFilterOption): void => {
    setFilter(opt);
    const quick = QUICK_RANGE[opt];
    if (quick) {
      const { start: s, end: e } = quick();
      setStart(s);
      setEnd(e);
      setViewDate(s);
    } else {
      // Fresh calendar when switching between manual modes.
      setStart(null);
      setEnd(null);
      setPickingStart(true);
    }
  };

  const clickDay = (d: Date): void => {
    if (isQuickOption(filter)) return;
    if (filter === "On") {
      setStart(d);
      setEnd(d);
      return;
    }
    if (isEndOnly(filter)) {
      setEnd(d);
      setStart(null);
      return;
    }
    if (isStartOnly(filter)) {
      setStart(d);
      setEnd(null);
      return;
    }
    // Between: first click anchors, second click sets the other end.
    if (pickingStart || !start) {
      setStart(d);
      setEnd(null);
      setPickingStart(false);
    } else {
      if (d < start) {
        setEnd(start);
        setStart(d);
      } else {
        setEnd(d);
      }
      setPickingStart(true);
    }
  };

  const canApply = useMemo(() => {
    if (isQuickOption(filter)) return true;
    if (filter === "Between") return !!start && !!end;
    if (isEndOnly(filter)) return !!end;
    return !!start;
  }, [filter, start, end]);

  const apply = (): void => {
    const next: DateFilterValue = {
      filter,
      dates: buildDates(filter, start, end),
      label: buildLabel(filter, start, end),
    };
    onChange?.(next);
    setOpen(false);
    setCoords(null);
    triggerRef.current?.focus();
  };

  const clear = (): void => {
    onChange?.(null);
    setFilter(fallbackFilter);
    setStart(null);
    setEnd(null);
    setPickingStart(true);
    setOpen(false);
    setCoords(null);
    triggerRef.current?.focus();
  };

  // Calendar grid for viewDate's month.
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday(y, m); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(new Date(y, m, d));
  const changeMonth = (delta: number): void => setViewDate(new Date(y, m + delta, 1));

  const quick = isQuickOption(filter);
  const showDate = filter === "On";
  const showFrom = (isStartOnly(filter) && filter !== "On") || filter === "Between" || quick;
  const showTo = isEndOnly(filter) || filter === "Between" || quick;
  const today = new Date();

  const popoverNode = open ? (
    <div
      ref={popRef}
      role="dialog"
      aria-labelledby={titleId}
      className={cx("dfp-popover", accentClasses, popoverClassName)}
      style={{
        ...themeVars,
        top: coords ? coords.top : 0,
        left: coords ? coords.left : 0,
        visibility: coords ? "visible" : "hidden",
      }}
    >
      <div className="dfp-header">
        <h2 id={titleId} className="dfp-title">{title}</h2>
        <button type="button" onClick={() => closeAndReset(true)} aria-label="Close" className="dfp-close">
          <XIcon />
        </button>
      </div>

      <div className="dfp-body">
        {/* Filter modes — horizontal scroller on mobile, sidebar from 768px */}
        <div className="dfp-options" role="group" aria-label="Filter type">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={filter === opt}
              onClick={() => selectFilter(opt)}
              className={cx("dfp-option", filter === opt && "dfp-option--active")}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Calendar */}
        <div className="dfp-calendar">
          <div className="dfp-nav">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="dfp-nav-btn">
              <ChevronLeftIcon />
            </button>
            <select
              aria-label="Month"
              value={m}
              onChange={(e) => setViewDate(new Date(y, Number(e.target.value), 1))}
              className="dfp-select"
            >
              {MONTHS.map((mn, i) => (
                <option key={mn} value={i}>{mn}</option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={y}
              onChange={(e) => setViewDate(new Date(Number(e.target.value), m, 1))}
              className="dfp-select"
            >
              {Array.from({ length: 12 }, (_, i) => y - 6 + i).map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="dfp-nav-btn dfp-nav-btn--next"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="dfp-grid">
            {WEEKDAYS.map((w) => (
              <div key={w} className="dfp-weekday">{w}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`blank-${i}`} />;
              const isStart = sameDay(d, start);
              const isEnd = sameDay(d, end);
              const selected = isStart || isEnd;
              const within = !selected && inRange(d, start, end);
              return (
                <button
                  key={d.getTime()}
                  type="button"
                  disabled={quick}
                  aria-pressed={selected}
                  aria-label={formatDate(d)}
                  onClick={() => clickDay(d)}
                  className={cx(
                    "dfp-day",
                    selected && "dfp-day--selected",
                    within && "dfp-day--in-range",
                    !selected && sameDay(d, today) && "dfp-day--today"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary + actions */}
        <div className="dfp-summary">
          <div className="dfp-summary-fields">
            {showDate && <SummaryField caption="Date" date={start} />}
            {showFrom && <SummaryField caption="From" date={start} />}
            {showTo && <SummaryField caption="To" date={end} />}
          </div>
          <div className="dfp-actions">
            <button type="button" onClick={clear} className="dfp-clear">
              {clearLabel}
            </button>
            <button type="button" onClick={apply} disabled={!canApply} className="dfp-apply">
              {applyLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={cx("dfp-root", accentClasses, className)} style={accentStyle} ref={wrapRef}>
      {label !== null && (
        <label htmlFor={triggerId} className="dfp-label">
          {label}
        </label>
      )}
      {isLoading ? (
        <div className="dfp-skeleton" aria-busy="true" aria-label="Loading" />
      ) : (
        <button
          ref={triggerRef}
          id={triggerId}
          name={name}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? closeAndReset() : openPicker())}
          className={cx("dfp-trigger", open && "dfp-trigger--open")}
        >
          <span
            className={cx("dfp-trigger-text", !value?.label && "dfp-trigger-text--placeholder")}
            title={value?.label || undefined}
          >
            {value?.label || placeholder}
          </span>
          <span className="dfp-trigger-icon">
            <CalendarIcon />
          </span>
        </button>
      )}

      {!isLoading && open && typeof document !== "undefined"
        ? createPortal(popoverNode, portalTarget ?? document.body)
        : null}
    </div>
  );
}

function SummaryField({ caption, date }: { caption: string; date: Date | null }) {
  return (
    <div className="dfp-summary-field">
      <div className="dfp-summary-caption">{caption}</div>
      <div className="dfp-summary-value">{date ? formatDate(date) : "—"}</div>
    </div>
  );
}
