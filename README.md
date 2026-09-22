# Sibernetick Landing

[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE.md)
[![Open to contributors](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Live](https://img.shields.io/badge/live-sibernetick.com-iris.svg)](https://sibernetick.com)

Open-source marketing and documentation site for **Sibernetick** — a data-sovereign enterprise cybersecurity platform. This repository contains the static landing pages (Cloudflare Workers + Assets), localization files, and the zero-dependency static generator that power [sibernetick.com](https://sibernetick.com).

The core product remains proprietary; this repo is the public face of the brand and welcomes community contributions to pages, copy, and translations.

## Screenshots

<!-- TODO: add screenshots after first deploy -->

| Home | Platform | Contact |
| ---- | -------- | ------- |
| _coming soon_ | _coming soon_ | _coming soon_ |

## Quick Start

```bash
git clone https://github.com/meviza/sibernetick-landing.git
cd sibernetick-landing
npm install

npm run build      # node scripts/build.mjs → generates public/ (230 HTML files)
npm run dev        # build + wrangler dev  → http://localhost:8788
```

All available scripts:

| Script | What it does |
| ------ | ------------ |
| `npm run build` | Renders `public/` from `content/en/` + `locales/*.json` (19 locales × 12 pages) |
| `npm run dev` | Build, then serve locally with `wrangler dev` |
| `npm run preview` | Build, then `wrangler dev` (local preview) |
| `npm run check` | Same as `build` — CI-friendly build verification |
| `npm run deploy` | Maintainers only: `wrangler deploy` to Cloudflare |

`public/` is **build output** and is gitignored (except `.gitkeep`) — always run `npm run build` after cloning.

## Architecture

```
content/en/            canonical English page bodies (nav, footer, github, pages/*.json)
locales/{code}.json    i18n chrome + per-page meta; en = canonical, others deep-merge over it
scripts/build.mjs      zero-dependency Node ESM static generator → public/
src/index.js           Worker: path resolution, /api/contact, /healthz, asset serving
src/contact-handler.js contact form validation + send_email binding
wrangler.jsonc         assets directory (./public), routes, send_email binding
public/                generated HTML/sitemap/robots/llms/manifest (not committed)
```

Build flow: `content/en/` + `locales/*.json` → `scripts/build.mjs` → `public/{locale}/{page}.html` → Worker serves `public/` and handles `POST /api/contact`.

Root `/` is the English home (x-default); every other locale lives under `/{locale}/` (Arabic is RTL). English is the source of truth — missing keys fall back to English at build time.

## Contributing

We welcome issues and pull requests — page improvements, accessibility fixes, new locales, and copy edits are all fair game. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, including how to add a locale.

**i18n rule:** English is the source of truth. All other locales fall back to English for missing keys.

## Commercial licensing

The code in this repository is dual-licensed under **MIT OR Apache-2.0**.

> **Large enterprises:** contact us for a commercial agreement — see [sibernetick.com/licenses](https://sibernetick.com/licenses) for details.

## Star, watch, fork

If this is useful, star the repo, watch for releases, open an issue, or ship a branch — we review.

## Security

Please do not open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for private reporting via GitHub Security Advisories.

## License

Dual-licensed: [MIT](LICENSE-MIT) OR [Apache-2.0](LICENSE-APACHE). See [LICENSE.md](LICENSE.md) for how to choose.
