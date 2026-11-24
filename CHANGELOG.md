# Changelog

All notable changes to this project are documented here. This project follows [Semantic Versioning](https://semver.org/).

## 1.0.0

Initial release.

- `DateFilterPicker` with On / Before / After / On or Before / On or After / Between modes and Last 7 / Last 30 / Next 7 days quick ranges.
- Zero runtime dependencies (`react` / `react-dom` ≥ 18 as peers). Ships ESM + CommonJS builds, TypeScript declarations and a standalone `styles.css`. Tailwind CSS and shadcn/ui are not required.
- Works inside modal containers (Radix / shadcn Dialog, Sheet, AlertDialog, vaul Drawer, native `<dialog>`). The popover renders inside the modal, is positioned correctly in transformed containers, and Escape closes the picker without closing the dialog.
- `accentColor` prop and `--dfp-accent` CSS variable: one brand colour drives every shade (derived with `color-mix()`). Opt-in recipes let it follow shadcn/ui `--primary`, including dark mode. Light accents automatically get dark text and darker text shades so they stay readable. The built-in green theme is unchanged when no accent is set.
- Built-in dark theme. The `theme` prop is `"auto"` by default, which follows the app's `.dark`, `data-theme`, `data-bs-theme` or `data-mui-color-scheme` marker; `"light"`, `"dark"` and `"system"` (OS setting) are also available. Native selects switch to dark, a dark section inside a light page works, and brand accents adapt to the dark background.
- Theming through `--dfp-*` CSS variables, globally or per instance. Variables set on the field carry over to its portaled popover.
- Defaults to a system sans-serif font stack. Set `--dfp-font-family: initial` to use the app's font.
- Keyboard support: focus moves into the popover on open and returns to the field on close.
- Documents how to let Tailwind utilities override the package CSS: CSS variables, the important modifier, or `@import … layer(components)`.
