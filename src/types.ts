/** Every filter mode the picker supports, in display order. */
export const DATE_FILTER_OPTIONS = [
  "On",
  "Before",
  "After",
  "On or Before",
  "On or After",
  "Between",
  "Last 7 Days",
  "Last 30 Days",
  "Next 7 Days",
] as const;

export type DateFilterOption = (typeof DATE_FILTER_OPTIONS)[number];

export type DateFilterTheme = "auto" | "light" | "dark" | "system";

export interface DateFilterValue {
  /** The selected filter mode. */
  filter: DateFilterOption;
  /**
   * - Single-date modes ("On", "Before", "After", "On or Before", "On or After") → `[date]`
   * - Range modes ("Between" and the quick ranges) → `[from, to]`
   */
  dates: Date[];
  /** Human-readable summary, e.g. `"06 Jul 2026 - 14 Jul 2026"`. */
  label: string;
}

export interface DateFilterPickerProps {
  /** Field label shown above the trigger. Pass `null` to hide it. @default "Date" */
  label?: string | null;
  /** Controlled value. Pass `null` for an empty field. */
  value?: DateFilterValue | null;
  /** Called with the picked value on **Apply**, or with `null` on **Clear**. */
  onChange?: (next: DateFilterValue | null) => void;
  /** Trigger text when no value is set. @default "Select date" */
  placeholder?: string;
  /** Show a loading skeleton instead of the trigger. @default false */
  isLoading?: boolean;
  /** Disable the trigger. @default false */
  disabled?: boolean;
  /** Restrict / reorder the filter modes shown in the sidebar. @default all of DATE_FILTER_OPTIONS */
  options?: readonly DateFilterOption[];
  /** Mode selected when the field is empty. @default "Between" (or the first item of `options`) */
  defaultFilter?: DateFilterOption;
  /** Popover heading. @default "Select Date" */
  title?: string;
  /** Apply button text. @default "Apply" */
  applyLabel?: string;
  /** Clear button text. @default "Clear" */
  clearLabel?: string;
  /**
   * Brand colour for this picker — any CSS colour, e.g. `"#2563eb"` or `"var(--primary)"`.
   * All related shades (hover, disabled, range, active mode, today ring, focus ring) are
   * derived from it. Equivalent to setting the `--dfp-accent` CSS variable.
   * @default undefined (built-in green theme)
   */
  accentColor?: string;
  /**
   * Colour theme.
   * - `"auto"`: follow the app's dark-mode marker (`.dark`, `[data-theme="dark"]`,
   *   `[data-bs-theme="dark"]`, `[data-mui-color-scheme="dark"]`); light otherwise.
   * - `"light"` / `"dark"`: force one theme.
   * - `"system"`: follow the operating-system setting (`prefers-color-scheme`).
   * @default "auto"
   */
  theme?: DateFilterTheme;
  /** Extra class on the root wrapper. */
  className?: string;
  /** Extra class on the floating popover (it is portaled to `document.body`). */
  popoverClassName?: string;
  /** `id` for the trigger button (the label is linked to it). Auto-generated if omitted. */
  id?: string;
  /** `name` attribute for the trigger button. */
  name?: string;
}
