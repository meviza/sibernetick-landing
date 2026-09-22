# Contributing to Sibernetick Landing

Thanks for your interest in contributing. This repo hosts the public marketing/documentation pages for [sibernetick.com](https://sibernetick.com).

## Getting started

1. Fork the repository and create a branch from `main`.
2. Install dependencies: `npm install`
3. Start the local server: `npx wrangler pages dev .`
4. Make your changes and verify them in the browser.

## How to add a locale

Locales live in `locales/<code>.json`. Supported codes are listed in `SHARED_I18N_SPEC.md` (one level up, or mirrored here when the spec is copied in).

1. Copy `locales/en.json` to `locales/<code>.json` (e.g. `locales/tr.json`).
2. Translate **values only** — never translate JSON keys, route slugs, or `hreflang` codes.
3. Keep placeholders (`{name}`, `%s`, etc.) intact and in the same order.
4. Keep array order identical to English (e.g. `metrics[]`, `nav[]`).
5. If a key is not yet translated, **delete it** — the site falls back to `en` automatically. Do not leave English strings inside a non-English file.
6. Open a pull request labeled `translation`.

## How to improve pages

- Pages are static HTML/markup under `src/` (structure may evolve — check existing pages first).
- Design tokens: sibernetick uses a cyan/iris dark theme. Reuse existing CSS custom properties; avoid hard-coded hex values in new code.
- Accessibility: all interactive elements need visible focus states, semantic HTML, and sufficient contrast.
- Performance: prefer system fonts and inline SVGs over large raster assets.

## i18n rules

- **English (`en`) is the source of truth.** All other locales fall back to `en` for missing keys.
- `hreflang` `x-default` always points to `en`.
- Never machine-translate without a native-speaker review when possible; machine translation is acceptable as a first pass if flagged in the PR.

## PR checklist

- [ ] Branch is up to date with `main`
- [ ] Changes verified locally with `npx wrangler pages dev .`
- [ ] No secrets, tokens, or `.env` files committed
- [ ] New/changed copy reviewed for tone (corporate but welcoming)
- [ ] If adding a locale: keys match `en.json`, no orphan keys, fallback behavior intact
- [ ] Screenshots attached if UI changed
- [ ] `CHANGELOG.md` updated for user-visible changes (optional for typo fixes)

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). For security issues, see [SECURITY.md](SECURITY.md) — do **not** open a public issue.

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
