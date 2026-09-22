#!/usr/bin/env node
/**
 * Sibernetick static site generator — zero-dependency Node ESM.
 *
 * Reads:  locales/{code}.json  (i18n chrome + per-page meta; en = canonical)
 *         content/en/**        (canonical EN page bodies)
 * Writes: public/{locale}/{page}.html  × 19 locales × 12 pages
 *         public/index.html            (EN home, x-default — byte-identical to /en/index.html)
 *         public/sitemap.xml, robots.txt, llms.txt, llms-full.txt,
 *         manifest.webmanifest, 404.html
 *
 * Run: node scripts/build.mjs   (npm run build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'public');
const LOCALES_DIR = path.join(ROOT, 'locales');
const CONTENT_DIR = path.join(ROOT, 'content', 'en');

const SITE = {
  name: 'Sibernetick',
  domain: 'https://sibernetick.com',
  repo: 'https://github.com/meviza/sibernetick-landing',
  email: 'hello@sibernetick.com',
  license: 'MIT OR Apache-2.0',
  ogImage: '',
  year: new Date().getFullYear(),
  metricsDate: '2026-06',
  metricsSource: 'product i18n/observatory'
};

const LOCALE_CODES = ['en', 'tr', 'ar', 'de', 'es', 'fr', 'nl', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'pl', 'uk', 'vi', 'id', 'hi', 'th'];
const RTL = new Set(['ar']);
const PAGES = ['index', 'platform', 'metrics', 'community', 'open-source', 'company', 'contact', 'privacy', 'terms', 'cookies', 'security', 'licenses'];
const CONTENT_FILE = { index: 'home', platform: 'platform', metrics: 'metrics', community: 'community', 'open-source': 'open-source', company: 'company', contact: 'contact', privacy: 'privacy', terms: 'terms', cookies: 'cookies', security: 'security', licenses: 'licenses' };
const LEGAL_PAGES = new Set(['privacy', 'terms', 'cookies', 'security', 'licenses']);

/* ─────────────────────────── utils ─────────────────────────── */

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
};
function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function deepMerge(base, over) {
  if (!isObj(base)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function arr(v, fallback = []) { return Array.isArray(v) ? v : fallback; }

/* ─────────────────────── load content + locales ─────────────────────── */

const content = {
  nav: readJson(path.join(CONTENT_DIR, 'nav.json')),
  footer: readJson(path.join(CONTENT_DIR, 'footer.json')),
  github: readJson(path.join(CONTENT_DIR, 'github.json')),
  pages: {}
};
for (const page of PAGES) {
  content.pages[page] = readJson(path.join(CONTENT_DIR, 'pages', `${CONTENT_FILE[page]}.json`));
}

const en = readJson(path.join(LOCALES_DIR, 'en.json'));
const locales = {};
for (const code of LOCALE_CODES) {
  const file = path.join(LOCALES_DIR, `${code}.json`);
  if (!fs.existsSync(file)) throw new Error(`Missing locale file: locales/${code}.json`);
  const raw = readJson(file);
  locales[code] = code === 'en' ? en : deepMerge(en, raw);
  locales[code].code = code;
}

/* ─────────────────────── URL helpers ─────────────────────── */

const isEn = (L) => L === 'en';
function pagePath(L, p) {
  if (isEn(L)) return p === 'index' ? '/' : `/en/${p}`;
  return p === 'index' ? `/${L}/` : `/${L}/${p}`;
}
function absUrl(L, p) { return SITE.domain + pagePath(L, p); }
function hrefTo(curLocale, curPage, targetLocale, targetPage) {
  return pagePath(targetLocale, targetPage);
}

/* ─────────────────────── icons ─────────────────────── */

const GH_SVG = (cls = '') =>
  `<svg class="gh-mark ${cls}" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;

const ARROW = `<svg class="arr" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3 8h10M9 4l4 4-4 4"/></svg>`;
const CHECK = `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5l3.2 3.2L13 5"/></svg>`;
const GLOBE = `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 8h12M8 1.8c1.8 1.7 2.7 3.9 2.7 6.2S9.8 12.5 8 14.2C6.2 12.5 5.3 10.3 5.3 8S6.2 3.5 8 1.8Z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`;

/* ─────────────────────── design: CSS ─────────────────────── */

const CSS = `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#04070f;--bg2:#070c18;--surface:rgba(255,255,255,.03);--surface2:rgba(255,255,255,.055);
  --line:rgba(120,160,255,.12);--line2:rgba(120,160,255,.22);
  --cyan:#22d3ee;--iris:#818cf8;--orchid:#c084fc;--ink:#e8ecf8;--dim:#8b95b5;--dim2:#5a6480;
  --ok:#34d399;--warn:#fbbf24;--err:#f87171;--r:14px;
  --grad:linear-gradient(135deg,#22d3ee 0%,#818cf8 55%,#c084fc 100%);
  --nav-h:64px;--ease:cubic-bezier(.22,1,.36,1);
}
html{scroll-behavior:smooth}
body{
  font-family:'Space Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;
  background:var(--bg);color:var(--ink);line-height:1.65;overflow-x:hidden;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
body::before{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%,rgba(34,211,238,.12),transparent 55%),
    radial-gradient(ellipse 60% 40% at 90% 60%,rgba(129,140,248,.08),transparent 50%),
    radial-gradient(ellipse 50% 30% at 10% 80%,rgba(192,132,252,.06),transparent 50%);
}
::selection{background:rgba(34,211,238,.3);color:#fff}
a{color:var(--cyan);text-decoration:none}
a:hover{text-decoration:underline;text-underline-offset:3px}
img,svg{display:block}
:focus-visible{outline:2px solid var(--cyan);outline-offset:3px;border-radius:4px}
.skip-link{
  position:absolute;left:1rem;top:-4rem;z-index:999;background:var(--grad);color:#04070f;
  padding:.6rem 1.1rem;border-radius:0 0 10px 10px;font-weight:600;transition:top .2s;
}
.skip-link:focus{top:0;text-decoration:none}
/* animated grid background */
.grid-bg{
  position:fixed;inset:-2px;pointer-events:none;z-index:0;opacity:.4;
  background-image:
    linear-gradient(rgba(120,160,255,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(120,160,255,.05) 1px,transparent 1px);
  background-size:52px 52px;
  mask-image:radial-gradient(ellipse 75% 65% at 50% 25%,black 15%,transparent 78%);
  -webkit-mask-image:radial-gradient(ellipse 75% 65% at 50% 25%,black 15%,transparent 78%);
  animation:gridDrift 60s linear infinite;
}
@keyframes gridDrift{to{background-position:52px 52px,52px 52px}}
/* scroll progress */
.progress{
  position:fixed;top:0;left:0;height:2px;width:100%;z-index:200;pointer-events:none;
  background:transparent;
}
.progress i{
  display:block;height:100%;width:0;background:var(--grad);
  box-shadow:0 0 12px rgba(34,211,238,.6);transition:width .1s linear;
}
/* NAV */
nav.top{
  position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:100;
  display:flex;align-items:center;gap:.25rem;padding:.45rem .5rem;
  background:rgba(7,12,24,.72);backdrop-filter:blur(20px) saturate(1.4);
  -webkit-backdrop-filter:blur(20px) saturate(1.4);
  border:1px solid var(--line);border-radius:999px;box-shadow:0 12px 40px rgba(0,0,0,.45);
  max-width:calc(100vw - 1.2rem);transition:box-shadow .3s,background .3s,border-color .3s;
  animation:navIn .7s var(--ease) both;
}
@keyframes navIn{from{opacity:0;transform:translate(-50%,-18px)}to{opacity:1;transform:translate(-50%,0)}}
nav.top.scrolled{background:rgba(7,12,24,.92);box-shadow:0 16px 48px rgba(0,0,0,.6);border-color:var(--line2)}
.nav-logo{
  font-weight:700;font-size:.92rem;letter-spacing:-.02em;padding:.35rem .8rem;color:#fff;
  text-decoration:none;display:flex;align-items:center;gap:.5rem;white-space:nowrap;
}
.nav-logo:hover{text-decoration:none}
.nav-logo .dot{width:8px;height:8px;border-radius:50%;background:var(--grad);box-shadow:0 0 12px var(--cyan);animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.85)}}
nav.top a.nlink{
  color:var(--dim);text-decoration:none;font-size:.78rem;padding:.42rem .78rem;border-radius:999px;
  transition:.25s;white-space:nowrap;display:inline-flex;align-items:center;gap:.4rem;
}
nav.top a.nlink:hover{color:#fff;background:var(--surface2);text-decoration:none}
nav.top a.nlink[aria-current="page"]{color:#fff;background:rgba(34,211,238,.1);box-shadow:inset 0 0 0 1px rgba(34,211,238,.25)}
nav.top a.nlink.gh{color:var(--ink)}
nav.top a.nlink.gh:hover{color:var(--cyan)}
.nav-cta{
  background:var(--grad);color:#04070f !important;font-weight:600 !important;
  padding:.45rem 1rem !important;border-radius:999px !important;
}
.nav-cta:hover{filter:brightness(1.12);text-decoration:none !important;transform:translateY(-1px)}
.locale-wrap{position:relative;display:flex;align-items:center}
.locale-wrap select{
  appearance:none;background:transparent;border:1px solid var(--line);color:var(--dim);
  font:inherit;font-size:.72rem;padding:.4rem 1.5rem .4rem .7rem;border-radius:999px;cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='%238b95b5'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right .55rem center;transition:.25s;
}
.locale-wrap select:hover{border-color:var(--cyan);color:var(--cyan)}
.locale-wrap select option{background:#0a0f1e;color:var(--ink)}
.nav-burger{
  display:none;background:transparent;border:1px solid var(--line);border-radius:999px;
  width:36px;height:32px;cursor:pointer;position:relative;
}
.nav-burger span,.nav-burger span::before,.nav-burger span::after{
  content:'';position:absolute;left:9px;width:16px;height:1.6px;background:var(--ink);border-radius:2px;transition:.3s var(--ease);
}
.nav-burger span{top:14px}
.nav-burger span::before{top:-5px;left:0}
.nav-burger span::after{top:5px;left:0}
.nav-burger[aria-expanded="true"] span{background:transparent}
.nav-burger[aria-expanded="true"] span::before{top:0;transform:rotate(45deg)}
.nav-burger[aria-expanded="true"] span::after{top:0;transform:rotate(-45deg)}
.mobile-menu{
  position:fixed;inset:0;z-index:99;background:rgba(4,7,15,.96);backdrop-filter:blur(18px);
  display:flex;flex-direction:column;justify-content:center;gap:.4rem;padding:5rem 2rem 3rem;
  opacity:0;visibility:hidden;transition:opacity .35s var(--ease),visibility .35s;
}
.mobile-menu.open{opacity:1;visibility:visible}
.mobile-menu a{
  color:var(--ink);font-size:1.45rem;font-weight:600;padding:.7rem 0;text-decoration:none;
  border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;
  transform:translateY(16px);opacity:0;transition:transform .45s var(--ease),opacity .45s;
}
.mobile-menu.open a{transform:none;opacity:1}
.mobile-menu.open a:nth-child(1){transition-delay:.05s}
.mobile-menu.open a:nth-child(2){transition-delay:.1s}
.mobile-menu.open a:nth-child(3){transition-delay:.15s}
.mobile-menu.open a:nth-child(4){transition-delay:.2s}
.mobile-menu.open a:nth-child(5){transition-delay:.25s}
.mobile-menu.open a:nth-child(6){transition-delay:.3s}
.mobile-menu.open a:nth-child(7){transition-delay:.35s}
.mobile-menu a .arr{opacity:.5}
/* LAYOUT */
.wrap{position:relative;z-index:1;max-width:1120px;margin:0 auto;padding:0 1.4rem}
section{padding:5rem 0;position:relative;z-index:1}
.kicker{
  font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:.68rem;letter-spacing:.22em;
  text-transform:uppercase;color:var(--cyan);display:flex;align-items:center;gap:.65rem;margin-bottom:1rem;
}
.kicker::before{content:'';width:1.8rem;height:1px;background:var(--cyan);opacity:.55}
h1{font-size:clamp(2.3rem,6vw,4.3rem);font-weight:700;line-height:1.06;letter-spacing:-.035em}
h2{font-size:clamp(1.65rem,3.6vw,2.55rem);font-weight:700;line-height:1.15;letter-spacing:-.03em;margin-bottom:1rem}
h3{font-size:1.05rem;font-weight:600;margin-bottom:.45rem;letter-spacing:-.01em}
p{color:var(--dim)}
.lede{color:var(--dim);font-size:1.06rem;max-width:680px;margin-bottom:1.6rem}
.grad-text{
  background:var(--grad);background-size:220% 220%;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  animation:gradShift 8s ease infinite;
}
@keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.mono{font-family:'IBM Plex Mono',ui-monospace,monospace}
/* HERO */
.hero{
  min-height:92vh;display:flex;flex-direction:column;justify-content:center;
  padding-top:8rem;padding-bottom:3.5rem;position:relative;
}
.badge{
  display:inline-flex;align-items:center;gap:.5rem;font-family:'IBM Plex Mono',monospace;
  font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);
  border:1px solid rgba(34,211,238,.35);background:rgba(34,211,238,.08);
  padding:.4rem .9rem;border-radius:999px;margin-bottom:1.5rem;width:fit-content;
  animation:fadeUp .8s var(--ease) both;
}
.badge .live{width:6px;height:6px;border-radius:50%;background:var(--ok);box-shadow:0 0 8px var(--ok);animation:pulse 1.6s infinite}
.hero h1{max-width:920px;animation:fadeUp .9s .1s var(--ease) both}
.hero .lede{animation:fadeUp .9s .2s var(--ease) both;font-size:1.12rem;max-width:720px}
.cta-row{display:flex;flex-wrap:wrap;gap:.85rem;animation:fadeUp .9s .3s var(--ease) both}
.trust{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.7rem;
  margin-top:2.8rem;max-width:820px;animation:fadeUp 1s .45s var(--ease) both;list-style:none;
}
.trust li{
  display:flex;align-items:center;gap:.55rem;font-size:.78rem;color:var(--dim);
  border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:.65rem .8rem;
}
.trust .ic{color:var(--cyan);display:flex}
@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
/* orbs */
.orb{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none;z-index:-1;will-change:transform}
.orb1{width:420px;height:420px;background:rgba(34,211,238,.13);top:6%;right:-6%;animation:float 11s ease-in-out infinite}
.orb2{width:280px;height:280px;background:rgba(129,140,248,.12);bottom:12%;left:-8%;animation:float 13s ease-in-out infinite;animation-delay:-4s}
.orb3{width:220px;height:220px;background:rgba(192,132,252,.1);top:40%;right:12%;animation:float 15s ease-in-out infinite;animation-delay:-8s}
@keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-22px,28px) scale(1.08)}}
/* CARDS */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin-top:2rem}
.card{
  background:linear-gradient(160deg,rgba(255,255,255,.045),rgba(255,255,255,.015));
  border:1px solid var(--line);border-radius:var(--r);padding:1.5rem 1.35rem;
  transition:transform .35s var(--ease),border-color .35s,box-shadow .35s;position:relative;overflow:hidden;
}
.card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--grad);
  opacity:0;transition:opacity .35s;
}
.card:hover{transform:translateY(-6px);border-color:rgba(34,211,238,.35);box-shadow:0 16px 48px rgba(0,0,0,.4)}
.card:hover::before{opacity:1}
.card .icon{
  width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;
  background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.2);margin-bottom:1rem;
  color:var(--cyan);font-size:1.05rem;
}
.card p{color:var(--dim);font-size:.88rem}
/* METRICS */
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-top:2rem}
.metric{
  text-align:center;padding:1.5rem 1rem;border:1px solid var(--line);border-radius:var(--r);
  background:var(--surface);transition:.3s;position:relative;overflow:hidden;
}
.metric:hover{border-color:rgba(129,140,248,.4);background:var(--surface2);transform:translateY(-3px)}
.metric .val{
  font-size:2.1rem;font-weight:700;background:var(--grad);background-size:200% 200%;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  font-family:'IBM Plex Mono',monospace;animation:gradShift 7s ease infinite;
}
.metric .lbl{font-size:.75rem;color:var(--dim);margin-top:.35rem;letter-spacing:.04em}
/* metric registry rows */
.mrow{
  border:1px solid var(--line);border-radius:var(--r);background:var(--surface);
  padding:1.5rem 1.5rem 1.35rem;margin-top:1rem;position:relative;overflow:hidden;
  transition:border-color .3s,transform .3s var(--ease);
}
.mrow:hover{border-color:rgba(34,211,238,.3);transform:translateY(-3px)}
.mrow::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--grad);opacity:.8}
.mrow-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:.8rem;justify-content:space-between}
.mrow .val{
  font-size:2.2rem;font-weight:700;font-family:'IBM Plex Mono',monospace;
  background:var(--grad);background-size:200% 200%;-webkit-background-clip:text;background-clip:text;
  color:transparent;animation:gradShift 7s ease infinite;
}
.mrow .lbl{font-size:1rem;font-weight:600;color:var(--ink)}
.badges{display:flex;flex-wrap:wrap;gap:.4rem;margin:.6rem 0 .8rem}
.st{
  font-family:'IBM Plex Mono',monospace;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;
  padding:.24rem .6rem;border-radius:999px;border:1px solid;white-space:nowrap;
}
.st-ok{color:var(--ok);border-color:rgba(52,211,153,.4);background:rgba(52,211,153,.08)}
.st-road{color:var(--warn);border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.08)}
.st-proto{color:var(--iris);border-color:rgba(129,140,248,.4);background:rgba(129,140,248,.08)}
.st-meta{color:var(--dim);border-color:var(--line);background:var(--surface)}
.mrow dl{display:grid;grid-template-columns:auto 1fr;gap:.35rem 1rem;font-size:.82rem;margin-top:.4rem}
.mrow dt{color:var(--dim2);font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;padding-top:.15rem}
.mrow dd{color:var(--dim);margin:0}
.mrow .note{font-size:.78rem;color:var(--dim2);margin-top:.75rem;padding-top:.7rem;border-top:1px dashed var(--line)}
/* status board table */
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r);margin-top:1.5rem;background:var(--surface)}
table{width:100%;border-collapse:collapse;font-size:.88rem;min-width:520px}
th,td{padding:.85rem 1.1rem;text-align:left;border-bottom:1px solid var(--line)}
th{
  font-family:'IBM Plex Mono',monospace;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--cyan);background:rgba(34,211,238,.05);
}
td{color:var(--dim)}
td:first-child{color:var(--ink)}
tr:last-child td{border-bottom:none}
tbody tr{transition:background .2s}
tbody tr:hover{background:rgba(255,255,255,.025)}
/* agents */
.agents{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:.85rem;margin-top:2rem}
.agent{
  border:1px solid var(--line);border-radius:12px;padding:1.2rem 1.1rem;background:var(--surface);
  transition:.3s var(--ease);position:relative;overflow:hidden;
}
.agent::after{
  content:'';position:absolute;inset:auto -30% -60% auto;width:120px;height:120px;border-radius:50%;
  background:radial-gradient(circle,rgba(34,211,238,.12),transparent 70%);opacity:0;transition:opacity .4s;
}
.agent:hover{border-color:rgba(34,211,238,.4);transform:translateY(-4px)}
.agent:hover::after{opacity:1}
.agent .tag{
  font-family:'IBM Plex Mono',monospace;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--iris);margin-bottom:.5rem;
}
.agent p{font-size:.83rem;color:var(--dim)}
/* steps */
.steps{display:flex;flex-direction:column;margin-top:2rem;position:relative}
.step{
  padding:1.25rem 0 1.25rem 0;border-left:1px solid var(--line);margin-left:24px;
  padding-left:1.9rem;position:relative;
}
.step:last-child{border-left-color:transparent}
.step::before{
  content:attr(data-n);position:absolute;left:-17px;top:1.25rem;width:34px;height:34px;
  border-radius:50%;background:var(--bg2);border:1px solid var(--cyan);
  display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;
  font-size:.75rem;color:var(--cyan);font-weight:600;box-shadow:0 0 16px rgba(34,211,238,.25);
}
.step p{color:var(--dim);font-size:.9rem}
/* CTA band */
.cta-band{
  margin-top:2.5rem;padding:2.6rem 2.4rem;border-radius:22px;position:relative;overflow:hidden;
  background:linear-gradient(150deg,rgba(34,211,238,.1),rgba(129,140,248,.09),rgba(192,132,252,.07));
  border:1px solid var(--line2);
}
.cta-band::after{
  content:'';position:absolute;top:-50%;right:-15%;width:420px;height:420px;border-radius:50%;
  background:radial-gradient(circle,rgba(34,211,238,.14),transparent 65%);pointer-events:none;
}
.cta-band h2{font-size:clamp(1.5rem,3vw,2.1rem)}
.cta-band p{max-width:640px;margin-bottom:1.5rem}
/* github blocks */
.gh-cta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin-top:2rem}
.gh-cta{
  border:1px solid var(--line);border-radius:var(--r);padding:1.5rem 1.4rem;background:var(--surface);
  transition:.35s var(--ease);display:flex;flex-direction:column;gap:.5rem;position:relative;overflow:hidden;
}
.gh-cta::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--grad);opacity:0;transition:.35s}
.gh-cta:hover{transform:translateY(-5px);border-color:rgba(34,211,238,.4);box-shadow:0 14px 44px rgba(0,0,0,.4);text-decoration:none}
.gh-cta:hover::before{opacity:1}
.gh-cta .gh-head{display:flex;align-items:center;gap:.6rem;color:var(--ink);font-weight:600;font-size:.98rem}
.gh-cta .gh-head .gh-mark{color:var(--ink);transition:color .3s}
.gh-cta:hover .gh-head .gh-mark{color:var(--cyan)}
.gh-cta p{font-size:.85rem;color:var(--dim);flex:1}
.gh-cta .go{display:inline-flex;align-items:center;gap:.4rem;color:var(--cyan);font-size:.8rem;font-weight:600;margin-top:.4rem}
/* buttons */
.btn{
  display:inline-flex;align-items:center;gap:.55rem;padding:.88rem 1.65rem;border-radius:999px;
  font-size:.92rem;font-weight:600;text-decoration:none;cursor:pointer;border:none;
  transition:transform .3s var(--ease),box-shadow .3s,background .3s,color .3s,border-color .3s;
  font-family:inherit;position:relative;will-change:transform;
}
.btn:hover{text-decoration:none}
.btn-p{background:var(--grad);color:#04070f;box-shadow:0 8px 28px rgba(34,211,238,.25)}
.btn-p:hover{transform:translateY(-3px);box-shadow:0 14px 40px rgba(34,211,238,.4)}
.btn-s{border:1px solid var(--line);color:var(--ink);background:var(--surface)}
.btn-s:hover{border-color:var(--cyan);color:var(--cyan);background:rgba(34,211,238,.06);transform:translateY(-2px)}
.btn-gh{border:1px solid var(--line2);color:var(--ink);background:rgba(255,255,255,.04)}
.btn-gh:hover{border-color:var(--iris);color:#fff;background:rgba(129,140,248,.12);transform:translateY(-2px)}
.btn-gh .gh-mark{transition:transform .4s var(--ease)}
.btn-gh:hover .gh-mark{transform:rotate(360deg)}
/* breadcrumb */
.crumbs{
  display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;font-size:.75rem;color:var(--dim2);
  padding-top:7.5rem;margin-bottom:1.4rem;font-family:'IBM Plex Mono',monospace;letter-spacing:.06em;
}
.crumbs a{color:var(--dim)}
.crumbs a:hover{color:var(--cyan)}
.crumbs .sep{opacity:.5}
.crumbs [aria-current]{color:var(--cyan)}
/* page header */
.page-head{padding-bottom:1rem;position:relative}
.page-head h1{font-size:clamp(2rem,5vw,3.4rem);max-width:900px}
.page-head .lede{margin-top:1.1rem}
.dates{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.1rem}
/* generic section blocks */
.block{margin-top:3rem}
.block-title{display:flex;align-items:center;gap:.7rem;margin-bottom:1rem}
.block-title h2{margin:0;font-size:clamp(1.3rem,2.6vw,1.8rem)}
.prose{max-width:760px}
.prose p+p{margin-top:.9rem}
.prose ul,. bullets{padding-left:1.2rem;color:var(--dim);font-size:.92rem}
.prose li,.bullets li{margin:.5rem 0}
.prose li::marker{color:var(--cyan)}
.facts{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:1.5rem;background:var(--surface)}
.facts dt{padding:.8rem 1.1rem;font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--cyan);background:rgba(34,211,238,.05);border-bottom:1px solid var(--line)}
.facts dd{padding:.8rem 1.1rem;margin:0;color:var(--dim);font-size:.9rem;border-bottom:1px solid var(--line);border-left:1px solid var(--line)}
.facts dt:last-of-type,.facts dd:last-of-type{border-bottom:none}
.cols-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.1rem;margin-top:1.6rem}
.cols-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.1rem;margin-top:1.6rem}
.panel{
  border:1px solid var(--line);border-radius:var(--r);background:var(--surface);padding:1.5rem 1.4rem;
  transition:.3s var(--ease);
}
.panel:hover{border-color:var(--line2)}
.panel h3{display:flex;align-items:center;gap:.55rem}
.panel p,.panel li{font-size:.88rem;color:var(--dim)}
.panel ul{padding-left:1.1rem;margin-top:.5rem}
.panel li{margin:.4rem 0}
.panel li::marker{color:var(--cyan)}
/* legal sections */
.legal-section{
  border:1px solid var(--line);border-radius:var(--r);background:var(--surface);
  padding:1.6rem 1.6rem;margin-top:1.1rem;position:relative;
}
.legal-section h2{font-size:1.15rem;margin-bottom:.7rem;letter-spacing:-.01em}
.legal-section p{font-size:.92rem}
.legal-section ul{padding-left:1.15rem;margin-top:.6rem}
.legal-section li{font-size:.9rem;color:var(--dim);margin:.42rem 0}
.legal-section li::marker{color:var(--cyan)}
.legal-section .sid{
  font-family:'IBM Plex Mono',monospace;font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;
  color:var(--dim2);margin-bottom:.5rem;
}
.related{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:2rem}
.related a{
  font-size:.8rem;border:1px solid var(--line);border-radius:999px;padding:.45rem .95rem;
  color:var(--dim);transition:.25s;background:var(--surface);
}
.related a:hover{border-color:var(--cyan);color:var(--cyan);text-decoration:none}
/* contact form */
.form-shell{
  display:grid;grid-template-columns:1fr 1.15fr;gap:3rem;align-items:start;
  background:linear-gradient(160deg,rgba(255,255,255,.04),rgba(255,255,255,.01));
  border:1px solid var(--line);border-radius:22px;padding:2.5rem;
  box-shadow:0 24px 80px rgba(0,0,0,.45);position:relative;overflow:hidden;
}
.form-shell::after{
  content:'';position:absolute;top:-40%;right:-20%;width:420px;height:420px;
  background:radial-gradient(circle,rgba(34,211,238,.1),transparent 65%);pointer-events:none;
}
.form-info h2{font-size:1.7rem}
.form-info .lede{font-size:.95rem;margin-bottom:1.4rem}
.form-info ul{list-style:none;display:flex;flex-direction:column;gap:.75rem}
.form-info li{display:flex;gap:.65rem;font-size:.88rem;color:var(--dim);align-items:flex-start}
.form-info li .ck{
  color:var(--ok);flex-shrink:0;margin-top:.2rem;width:18px;height:18px;border-radius:50%;
  background:rgba(52,211,153,.12);display:flex;align-items:center;justify-content:center;
}
.contact-meta{margin-top:1.8rem;padding-top:1.4rem;border-top:1px solid var(--line);font-size:.85rem;color:var(--dim)}
.contact-meta a{color:var(--cyan)}
form{position:relative;z-index:1;display:flex;flex-direction:column;gap:1rem}
.f-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
label{font-size:.75rem;font-weight:500;color:var(--dim);letter-spacing:.04em;display:block;margin-bottom:.4rem}
label .req{color:var(--cyan)}
input,select,textarea{
  width:100%;padding:.82rem 1rem;border-radius:10px;border:1px solid var(--line);
  background:rgba(0,0,0,.35);color:var(--ink);font-family:inherit;font-size:.9rem;
  transition:border-color .25s,box-shadow .25s;outline:none;
}
input:focus,select:focus,textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(34,211,238,.15)}
input::placeholder,textarea::placeholder{color:#4a5578}
select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='%238b95b5'%3E%3Cpath d='M1 1l5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 1rem center}
select option{background:#0a0f1e;color:var(--ink)}
textarea{min-height:115px;resize:vertical}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.form-note{font-size:.72rem;color:var(--dim2);line-height:1.55}
.btn-submit{
  background:var(--grad);color:#04070f;font-weight:700;padding:1rem;border-radius:12px;
  border:none;font-size:.95rem;cursor:pointer;font-family:inherit;transition:.3s var(--ease);
  display:flex;align-items:center;justify-content:center;gap:.5rem;
}
.btn-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 36px rgba(34,211,238,.35)}
.btn-submit:disabled{opacity:.6;cursor:not-allowed}
.btn-submit .spin{
  width:16px;height:16px;border:2px solid rgba(4,7,15,.3);border-top-color:#04070f;
  border-radius:50%;animation:spin .7s linear infinite;display:none;
}
.btn-submit.loading .spin{display:block}
@keyframes spin{to{transform:rotate(360deg)}}
.form-msg{padding:.9rem 1.1rem;border-radius:10px;font-size:.88rem;display:none;animation:fadeUp .4s var(--ease)}
.form-msg.ok{display:block;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.35);color:#6ee7b7}
.form-msg.err{display:block;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.35);color:#fca5a5}
/* FAQ */
.faq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin-top:1.8rem}
.faq-item{
  border:1px solid var(--line);border-radius:var(--r);background:var(--surface);padding:1.4rem 1.35rem;
  transition:.3s var(--ease);
}
.faq-item:hover{border-color:rgba(129,140,248,.35);transform:translateY(-3px)}
.faq-item h3{font-size:.98rem;color:var(--ink);display:flex;gap:.5rem;align-items:flex-start}
.faq-item h3 .q{color:var(--iris);font-family:'IBM Plex Mono',monospace;font-size:.8rem;flex-shrink:0}
.faq-item p{font-size:.87rem;margin-top:.5rem}
/* footer */
footer.site{
  position:relative;z-index:1;border-top:1px solid var(--line);margin-top:4rem;
  background:linear-gradient(180deg,transparent,rgba(7,12,24,.6));padding:3.5rem 1.4rem 2rem;
}
.foot-grid{
  max-width:1120px;margin:0 auto;display:grid;
  grid-template-columns:1.4fr repeat(4,1fr);gap:2.2rem;
}
.foot-brand .nav-logo{padding:0;margin-bottom:.8rem}
.foot-brand p{font-size:.83rem;color:var(--dim2);max-width:280px}
.foot-col h4{
  font-family:'IBM Plex Mono',monospace;font-size:.64rem;letter-spacing:.18em;text-transform:uppercase;
  color:var(--cyan);margin-bottom:.9rem;font-weight:500;
}
.foot-col ul{list-style:none;display:flex;flex-direction:column;gap:.5rem}
.foot-col a{font-size:.83rem;color:var(--dim);transition:.2s;display:inline-flex;align-items:center;gap:.4rem}
.foot-col a:hover{color:var(--cyan);text-decoration:none;transform:translateX(2px)}
.foot-col a .gh-mark{opacity:.7}
.foot-bottom{
  max-width:1120px;margin:2.5rem auto 0;padding-top:1.5rem;border-top:1px solid var(--line);
  display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;align-items:center;
  font-size:.75rem;color:var(--dim2);
}
.foot-bottom a{color:var(--dim2)}
.foot-bottom a:hover{color:var(--cyan)}
.lic-badge{
  display:inline-flex;align-items:center;gap:.45rem;font-family:'IBM Plex Mono',monospace;
  font-size:.66rem;letter-spacing:.08em;border:1px solid var(--line);border-radius:999px;
  padding:.35rem .8rem;color:var(--dim);background:var(--surface);
}
.lic-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--grad)}
.socials{display:flex;gap:.6rem;margin-top:1.1rem}
.socials a{
  width:34px;height:34px;border-radius:9px;border:1px solid var(--line);display:flex;
  align-items:center;justify-content:center;color:var(--dim);transition:.25s;background:var(--surface);
}
.socials a:hover{border-color:var(--cyan);color:var(--cyan);transform:translateY(-2px)}
/* 404 */
.nf{min-height:70vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding-top:8rem}
.nf .code{font-family:'IBM Plex Mono',monospace;font-size:.8rem;letter-spacing:.3em;color:var(--cyan);margin-bottom:1rem}
/* reveal / stagger */
.reveal{opacity:0;transform:translateY(34px);transition:opacity .75s var(--ease),transform .75s var(--ease);transition-delay:var(--d,0ms)}
.reveal.in{opacity:1;transform:none}
.stagger>*{opacity:0;transform:translateY(24px);transition:opacity .6s var(--ease),transform .6s var(--ease)}
.stagger.in>*{opacity:1;transform:none}
.stagger.in>*:nth-child(1){transition-delay:.05s}
.stagger.in>*:nth-child(2){transition-delay:.12s}
.stagger.in>*:nth-child(3){transition-delay:.19s}
.stagger.in>*:nth-child(4){transition-delay:.26s}
.stagger.in>*:nth-child(5){transition-delay:.33s}
.stagger.in>*:nth-child(6){transition-delay:.4s}
.stagger.in>*:nth-child(7){transition-delay:.47s}
.stagger.in>*:nth-child(8){transition-delay:.54s}
/* page transition (view transitions API) */
@media (navigation:auto){
  ::view-transition-old(root){animation:vtOut .28s ease both}
  ::view-transition-new(root){animation:vtIn .38s var(--ease) both}
}
@keyframes vtOut{to{opacity:0;transform:translateY(-8px)}}
@keyframes vtIn{from{opacity:0;transform:translateY(12px)}}
html.vt-fallback body{animation:vtIn .34s var(--ease) both}
/* responsive */
@media(max-width:1024px){
  .foot-grid{grid-template-columns:1fr 1fr;gap:1.8rem}
}
@media(max-width:860px){
  .form-shell{grid-template-columns:1fr;padding:1.6rem;gap:2rem}
  .f-row{grid-template-columns:1fr}
  nav.top .nlink:not(.gh):not(.nav-cta){display:none}
  nav.top .locale-wrap{display:none}
  .nav-burger{display:block}
  .hero{min-height:auto;padding-top:7rem}
  section{padding:3.6rem 0}
  .facts{grid-template-columns:1fr}
  .facts dd{border-left:none}
  .mrow dl{grid-template-columns:1fr}
}
@media(max-width:560px){
  .foot-grid{grid-template-columns:1fr}
  .cta-row .btn{width:100%;justify-content:center}
}
/* reduced motion — kill all non-essential motion */
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms !important;animation-iteration-count:1 !important;
    transition-duration:.01ms !important;scroll-behavior:auto !important;
  }
  .reveal,.stagger>*{opacity:1 !important;transform:none !important}
  .grid-bg{animation:none}
  .orb{animation:none !important}
  .grad-text,.metric .val,.mrow .val{animation:none !important}
}
@media print{
  nav.top,.progress,.grid-bg,.orb,footer.site .socials{display:none !important}
  body{background:#fff;color:#111}
}
`.trim();

/* ─────────────────────── design: JS ─────────────────────── */

const JS = `
(function(){
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced(){ return RM.matches; }

  /* year */
  document.querySelectorAll('[data-year]').forEach(function(el){ el.textContent = String(new Date().getFullYear()); });

  /* scroll progress bar */
  var bar = document.querySelector('.progress i');
  function onScrollProgress(){
    if(!bar) return;
    var h = document.documentElement;
    var max = (h.scrollHeight - h.clientHeight) || 1;
    bar.style.width = Math.min(100, (h.scrollTop / max) * 100) + '%';
  }

  /* nav scrolled state */
  var nav = document.querySelector('nav.top');
  function onScrollNav(){ if(nav) nav.classList.toggle('scrolled', window.scrollY > 24); }

  /* reveal + stagger */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .stagger').forEach(function(el){ io.observe(el); });

  /* number count-up */
  function animateCount(el){
    if(el.dataset.counted) return;
    el.dataset.counted = '1';
    var finalText = el.textContent;
    var m = finalText.match(/^([^\\d]*)([\\d][\\d.,]*)(.*)$/);
    if(!m) return;
    var prefix = m[1], raw = m[2], suffix = m[3];
    var num = parseFloat(raw.replace(/,/g, ''));
    if(isNaN(num)) return;
    var hasComma = raw.indexOf(',') > -1 && raw.indexOf('.') === -1;
    var lang = (document.documentElement.lang || 'en').replace('-','_');
    function fmt(n){
      try{
        return new Intl.NumberFormat(lang, { maximumFractionDigits: (String(num).indexOf('.')>-1?1:0) }).format(n);
      }catch(e){ return hasComma ? String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',') : String(n); }
    }
    if(reduced()){ el.textContent = prefix + fmt(num) + suffix; return; }
    var start = performance.now(), dur = 1400;
    function frame(now){
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + fmt(Math.round(num * eased)) + suffix;
      if(p < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }
  var cio = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ animateCount(e.target); cio.unobserve(e.target); } });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(function(el){ cio.observe(el); });

  /* magnetic buttons */
  if(!reduced() && matchMedia('(hover:hover)').matches){
    document.querySelectorAll('.btn').forEach(function(btn){
      btn.addEventListener('mousemove', function(ev){
        var r = btn.getBoundingClientRect();
        var x = ev.clientX - r.left - r.width/2;
        var y = ev.clientY - r.top - r.height/2;
        btn.style.transform = 'translate(' + (x*0.14) + 'px,' + (y*0.22 - 2) + 'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform = ''; });
    });
  }

  /* parallax orbs */
  var orbs = Array.prototype.slice.call(document.querySelectorAll('.orb'));
  var ticking = false;
  function parallax(){
    if(reduced() || !orbs.length) return;
    var y = window.scrollY;
    orbs.forEach(function(o, i){
      var f = (i + 1) * 0.06;
      o.style.transform = 'translate3d(0,' + (-y * f) + 'px,0)';
    });
  }
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      onScrollProgress(); onScrollNav(); parallax();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  var burger = document.querySelector('.nav-burger');
  var menu = document.querySelector('.mobile-menu');
  if(burger && menu){
    function setMenu(open){
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    }
    burger.addEventListener('click', function(){ setMenu(!menu.classList.contains('open')); });
    menu.addEventListener('click', function(e){ if(e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') setMenu(false); });
  }

  /* locale switcher */
  var loc = document.querySelector('.locale-wrap select');
  if(loc){ loc.addEventListener('change', function(){ if(loc.value) location.href = loc.value; }); }

  /* page transition fade: view-transition API with CSS fallback */
  if(!reduced()){
    if(!document.startViewTransition){
      document.documentElement.classList.add('vt-fallback');
    }
    document.addEventListener('click', function(e){
      var a = e.target.closest('a');
      if(!a) return;
      var href = a.getAttribute('href') || '';
      if(a.target === '_blank' || a.hasAttribute('download')) return;
      if(href.charAt(0) !== '/' ) return;
      if(href === location.pathname) return;
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if(document.startViewTransition){
        e.preventDefault();
        document.startViewTransition(function(){ location.href = href; });
      }
    });
  }

  /* contact form → POST /api/contact */
  var form = document.getElementById('contactForm');
  if(form){
    var I18N = window.__FORM_I18N || {};
    var btn = document.getElementById('submitBtn');
    var msg = document.getElementById('formMsg');
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      msg.className = 'form-msg'; msg.textContent = '';
      if(form.website.value) return;
      var data = Object.fromEntries(new FormData(form).entries());
      if(!data.name || !data.name.trim() || !data.email || !data.email.trim() || !data.interest || !data.message || !data.message.trim()){
        msg.className = 'form-msg err'; msg.textContent = I18N.required || 'Required fields missing.'; return;
      }
      if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)){
        msg.className = 'form-msg err'; msg.textContent = I18N.invalidEmail || 'Invalid email.'; return;
      }
      btn.classList.add('loading'); btn.disabled = true;
      try{
        var res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({}, data, { site: 'sibernetick', locale: document.documentElement.lang }))
        });
        var out = {};
        try{ out = await res.json(); }catch(_){}
        if(!res.ok) throw new Error(out.error || I18N.error || 'Request failed');
        msg.className = 'form-msg ok';
        msg.textContent = I18N.success || 'Thank you!';
        form.reset();
      }catch(err){
        msg.className = 'form-msg err';
        msg.textContent = (err && err.message) || I18N.error || 'Error';
      }finally{
        btn.classList.remove('loading'); btn.disabled = false;
      }
    });
  }
})();
`.trim();

/* ─────────────────────── head / nav / footer ─────────────────────── */

function hreflangLinks(L, p) {
  const out = [];
  for (const code of LOCALE_CODES) {
    out.push(`    <link rel="alternate" hreflang="${code}" href="${absUrl(code, p)}" />`);
  }
  out.push(`    <link rel="alternate" hreflang="x-default" href="${absUrl('en', p)}" />`);
  return out.join('\n');
}

function jsonldOrg() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.domain + '/',
    email: 'mailto:' + SITE.email,
    description: en.site.description,
    sameAs: ['https://github.com/meviza', 'https://x.com/sibernetick', 'https://www.linkedin.com/company/sibernetick']
  };
}
function jsonldWebsite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.domain + '/',
    inLanguage: 'en',
    description: en.site.description,
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.domain + '/' }
  };
}
function jsonldSoftware(L) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'On-prem / Private cloud',
    url: absUrl(L, 'platform'),
    description: locales[L].pages.platform.description,
    license: SITE.repo + '/blob/main/LICENSE.md',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', category: 'commercial-agreement' },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.domain + '/' }
  };
}
function jsonldBreadcrumbs(L, p) {
  if (p === 'index') return null;
  const name = navLabelForPage(locales[L], p);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: locales[L].nav.home, item: absUrl(L, 'index') },
      { '@type': 'ListItem', position: 2, name, item: absUrl(L, p) }
    ]
  };
}
function jsonldFaq(L) {
  const items = arr(content.pages.index?.trust?.items);
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.title,
      acceptedAnswer: { '@type': 'Answer', text: it.body }
    }))
  };
}
function ld(blocks) {
  return blocks.filter(Boolean).map((b) => `    <script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n');
}

function navLabelForPage(t, p) {
  const map = { index: t.nav.home, platform: t.nav.platform, metrics: t.nav.metrics, community: t.nav.community, 'open-source': t.nav.opensource, company: t.nav.company, contact: t.nav.contact, privacy: t.footer.links.privacy, terms: t.footer.links.terms, cookies: t.footer.links.cookies, security: t.footer.links.security, licenses: t.footer.links.licenses };
  return map[p] || p;
}

function renderHead(ctx) {
  const { L, p, t, dir } = ctx;
  const title = t.pages[p].title;
  const desc = t.pages[p].description;
  const canonical = absUrl(L, p) === SITE.domain + '/en/index' ? SITE.domain + '/' : absUrl(L, p);
  const canonFinal = (L === 'en' && p === 'index') ? SITE.domain + '/' : canonical;
  const ogLocale = t.ogLocale || (L === 'en' ? 'en_US' : L);
  const ldBlocks = [jsonldOrg()];
  if (p === 'index') { ldBlocks.push(jsonldWebsite(), jsonldSoftware(L), jsonldFaq(L)); }
  else { ldBlocks.push(jsonldBreadcrumbs(L, p)); if (p === 'platform') ldBlocks.push(jsonldSoftware(L)); }
  return `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="author" content="${SITE.name}" />
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large" />
  <link rel="canonical" href="${canonFinal}" />
${hreflangLinks(L, p)}
  <meta name="theme-color" content="#04070f" />
  <meta property="og:type" content="${p === 'index' ? 'website' : 'article'}" />
  <meta property="og:site_name" content="${SITE.name}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${canonFinal}" />
  <meta property="og:locale" content="${esc(ogLocale)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:url" content="${canonFinal}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
${CSS}
  </style>
${ld(ldBlocks)}`;
}

function renderNav(ctx) {
  const { L, p, t } = ctx;
  const navItems = [
    ['platform', t.nav.platform], ['metrics', t.nav.metrics], ['open-source', t.nav.opensource],
    ['community', t.nav.community], ['company', t.nav.company], ['contact', t.nav.contact]
  ];
  const links = navItems.map(([id, label]) =>
    `      <a class="nlink" href="${hrefTo(L, p, L, id)}"${p === id ? ' aria-current="page"' : ''}>${esc(label)}</a>`
  ).join('\n');
  const mobileLinks = [['index', t.nav.home], ...navItems].map(([id, label]) =>
    `      <a href="${hrefTo(L, p, L, id)}"${p === id ? ' aria-current="page"' : ''}>${esc(label)} ${ARROW}</a>`
  ).join('\n');
  const options = LOCALE_CODES.map((code) => {
    const label = locales[code].name || code.toUpperCase();
    return `        <option value="${pagePath(code, p)}"${code === L ? ' selected' : ''}>${esc(label)}</option>`;
  }).join('\n');
  return `  <a class="skip-link" href="#main">${esc(t.common.skip)}</a>
  <div class="progress" aria-hidden="true"><i></i></div>
  <div class="grid-bg" aria-hidden="true"></div>

  <nav class="top" aria-label="${esc(t.nav.menu)}">
    <a class="nav-logo" href="${hrefTo(L, p, L, 'index')}"><span class="dot"></span>${SITE.name}</a>
${links}
    <a class="nlink gh" href="${SITE.repo}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t.nav.github)}">${GH_SVG()}<span class="gh-label">${esc(t.nav.github)}</span></a>
    <span class="locale-wrap">
      <label class="hp" for="localeSel">${esc(t.nav.language)}</label>
      <select id="localeSel" aria-label="${esc(t.nav.language)}">
${options}
      </select>
    </span>
    <a class="nlink nav-cta" href="${hrefTo(L, p, L, 'contact')}">${esc(t.nav.demo)}</a>
    <button class="nav-burger" type="button" aria-expanded="false" aria-label="${esc(t.nav.menu)}"><span></span></button>
  </nav>
  <div class="mobile-menu" role="dialog" aria-label="${esc(t.nav.menu)}">
${mobileLinks}
    <a href="${SITE.repo}" target="_blank" rel="noopener noreferrer">${esc(t.nav.github)} ${GH_SVG()}</a>
  </div>`;
}

function renderFooter(ctx) {
  const { L, p, t } = ctx;
  const gh = content.github;
  const col = (title, links) => `      <div class="foot-col">
        <h4>${esc(title)}</h4>
        <ul>
${links.map((l) => `          <li>${l}</li>`).join('\n')}
        </ul>
      </div>`;
  const L1 = (href, label, ext = false) =>
    `<a href="${href}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(label)}</a>`;
  const LG = (href, label) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer">${GH_SVG()}${esc(label)}</a>`;

  const product = col(t.footer.product, [
    L1(hrefTo(L, p, L, 'platform'), t.footer.links.platform),
    L1(hrefTo(L, p, L, 'metrics'), t.footer.links.metrics),
    L1(hrefTo(L, p, L, 'open-source'), t.footer.links.opensource),
    L1(hrefTo(L, p, L, 'contact'), t.footer.links.demo)
  ]);
  const company = col(t.footer.company, [
    L1(hrefTo(L, p, L, 'company'), t.footer.links.about),
    L1(hrefTo(L, p, L, 'contact'), t.footer.links.contact),
    L1(hrefTo(L, p, L, 'company') + '#audiences', t.footer.links.press)
  ]);
  const legal = col(t.footer.legal, [
    L1(hrefTo(L, p, L, 'privacy'), t.footer.links.privacy),
    L1(hrefTo(L, p, L, 'terms'), t.footer.links.terms),
    L1(hrefTo(L, p, L, 'cookies'), t.footer.links.cookies),
    L1(hrefTo(L, p, L, 'security'), t.footer.links.security),
    L1(hrefTo(L, p, L, 'licenses'), t.footer.links.licenses)
  ]);
  const community = col(t.footer.community, [
    LG(gh.url, t.footer.links.repository),
    LG(gh.links.releases, t.footer.links.releases),
    LG(gh.links.goodFirstIssues, t.footer.links.issues),
    L1(hrefTo(L, p, L, 'community'), t.footer.links.communityPage)
  ]);

  return `  <footer class="site">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="nav-logo" href="${hrefTo(L, p, L, 'index')}"><span class="dot"></span>${SITE.name}</a>
        <p>${esc(t.footer.description)}</p>
        <div class="socials">
          <a href="https://github.com/meviza" target="_blank" rel="noopener noreferrer" aria-label="GitHub">${GH_SVG()}</a>
          <a href="https://x.com/sibernetick" target="_blank" rel="noopener noreferrer" aria-label="X"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9.52 6.77 15.48 0h-1.41L8.9 5.88 4.77 0H0l6.25 8.9L0 16h1.41l5.46-6.21L11.23 16H16L9.52 6.77ZM7.58 8.98l-.63-.89L1.92 1.04h2.17l4.06 5.7.63.89 5.29 7.51h-2.17L7.58 8.98Z"/></svg></a>
          <a href="https://www.linkedin.com/company/sibernetick" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3.6 16H.26V5.3H3.6V16ZM1.93 3.86A1.97 1.97 0 1 1 1.93 0a1.97 1.97 0 0 1 0 3.86ZM16 16h-3.33v-5.2c0-1.24-.02-2.83-1.72-2.83-1.73 0-2 1.35-2 2.74V16H5.6V5.3h3.2v1.46h.05c.44-.84 1.53-1.72 3.15-1.72 3.37 0 4 2.22 4 5.1V16Z"/></svg></a>
        </div>
      </div>
${product}
${company}
${legal}
${community}
    </div>
    <div class="foot-bottom">
      <p>${esc(t.footer.legalLine.replace('{year}', String(SITE.year)))}</p>
      <span class="lic-badge">${esc(t.footer.licenseBadge)}</span>
    </div>
  </footer>`;
}

/* ─────────────────────── shared blocks ─────────────────────── */

function statusClass(s) {
  if (s === 'lab-validated') return 'st-ok';
  if (s === 'roadmap') return 'st-road';
  if (s === 'prototype') return 'st-proto';
  return 'st-meta';
}
function statusLabel(t, s) {
  if (s === 'lab-validated') return t.common.labValidated;
  if (s === 'roadmap') return t.common.roadmap;
  if (s === 'prototype') return t.common.prototype;
  return s;
}
function badge(t, s) { return `<span class="st ${statusClass(s)}">${esc(statusLabel(t, s))}</span>`; }

function internalHref(ctx, href) {
  if (!href) return hrefTo(ctx.L, ctx.p, ctx.L, 'contact');
  if (/^https?:\/\//.test(href)) return href;
  const clean = String(href).replace(/^\//, '');
  const [pageRaw, hash] = clean.split('#');
  const page = pageRaw || 'index';
  const base = PAGES.includes(page) ? hrefTo(ctx.L, ctx.p, ctx.L, page) : hrefTo(ctx.L, ctx.p, ctx.L, 'contact');
  return hash ? `${base}#${hash}` : base;
}

function renderCtaBand(ctx, band, titleOverride, bodyOverride) {
  const { t } = ctx;
  const title = titleOverride || band?.title || t.cta.bandTitle;
  const body = bodyOverride || band?.body || t.cta.bandBody;
  const primary = band?.primaryCta || { label: t.cta.getDemo, href: '/contact' };
  const secondary = band?.secondaryCta || { label: t.cta.viewGithub, href: SITE.repo };
  const pHref = internalHref(ctx, primary.href);
  const pExt = /^https?:\/\//.test(pHref);
  const sExt = /^https?:\/\//.test(secondary.href);
  return `<div class="cta-band reveal">
      <div class="kicker">${esc(t.nav.contact)}</div>
      <h2 class="grad-text">${esc(title)}</h2>
      <p>${esc(body)}</p>
      <div class="cta-row">
        <a class="btn btn-p magnetic" href="${pHref}"${pExt ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(primary.label)} ${ARROW}</a>
        <a class="btn btn-gh magnetic" href="${secondary.href}"${sExt ? ' target="_blank" rel="noopener noreferrer"' : ''}>${GH_SVG()}${esc(secondary.label)}</a>
      </div>
    </div>`;
}

function renderBreadcrumbs(ctx) {
  const { L, p, t } = ctx;
  if (p === 'index') return '';
  return `<nav class="crumbs" aria-label="Breadcrumb">
      <a href="${hrefTo(L, p, L, 'index')}">${esc(t.nav.home)}</a>
      <span class="sep" aria-hidden="true">/</span>
      <span aria-current="page">${esc(navLabelForPage(t, p))}</span>
    </nav>`;
}

function renderForm(ctx) {
  const { t } = ctx;
  const f = t.form;
  return `<div class="form-shell">
      <div class="form-info">
        <div class="kicker">${esc(f.kicker)}</div>
        <h2>${esc(f.heading)}</h2>
        <p class="lede">${esc(f.lede)}</p>
        <ul>
${arr(f.bullets).map((b) => `          <li><span class="ck">${CHECK}</span>${esc(b)}</li>`).join('\n')}
        </ul>
        <div class="contact-meta">
          ${esc(f.direct)} <a href="mailto:${SITE.email}">${SITE.email}</a><br />
          <span style="font-size:.78rem;opacity:.75">${esc(f.routingNote)}</span>
        </div>
      </div>

      <form id="contactForm" novalidate>
        <div class="hp" aria-hidden="true">
          <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
        </div>
        <div class="f-row">
          <div>
            <label for="name">${esc(f.name)} <span class="req">*</span></label>
            <input id="name" name="name" type="text" required maxlength="120" placeholder="${esc(f.namePh)}" autocomplete="name" />
          </div>
          <div>
            <label for="email">${esc(f.email)} <span class="req">*</span></label>
            <input id="email" name="email" type="email" required maxlength="200" placeholder="${esc(f.emailPh)}" autocomplete="email" />
          </div>
        </div>
        <div class="f-row">
          <div>
            <label for="company">${esc(f.companyLabel)}</label>
            <input id="company" name="company" type="text" maxlength="160" placeholder="${esc(f.companyPh)}" autocomplete="organization" />
          </div>
          <div>
            <label for="phone">${esc(f.phone)}</label>
            <input id="phone" name="phone" type="tel" maxlength="40" placeholder="${esc(f.phonePh)}" autocomplete="tel" />
          </div>
        </div>
        <div>
          <label for="interest">${esc(f.interest)} <span class="req">*</span></label>
          <select id="interest" name="interest" required>
            <option value="" disabled selected>${esc(f.select)}</option>
            <option value="demo">${esc(f.optDemo)}</option>
            <option value="pilot">${esc(f.optPilot)}</option>
            <option value="kurumsal">${esc(f.optEnterprise)}</option>
            <option value="yatirim">${esc(f.optInvestor)}</option>
            <option value="ortaklik">${esc(f.optPartner)}</option>
            <option value="diger">${esc(f.optOther)}</option>
          </select>
        </div>
        <div>
          <label for="message">${esc(f.message)} <span class="req">*</span></label>
          <textarea id="message" name="message" required maxlength="3000" placeholder="${esc(f.messagePh)}"></textarea>
        </div>
        <p class="form-note">${esc(f.note)}</p>
        <div class="form-msg" id="formMsg" role="status" aria-live="polite"></div>
        <button type="submit" class="btn-submit" id="submitBtn">
          <span class="spin" aria-hidden="true"></span>
          <span class="lbl">${esc(f.submit)} →</span>
        </button>
      </form>
    </div>`;
}

function githubCtaGrid(ctx, ctas) {
  const { t } = ctx;
  const localCta = { star: t.cta.starLong, watch: t.cta.watchLong, fork: t.cta.forkLong, issue: t.cta.issue, pr: t.cta.pr };
  return `<div class="gh-cta-grid stagger">
${ctas.map((c) => `      <a class="gh-cta" href="${c.href}" target="_blank" rel="noopener noreferrer">
        <span class="gh-head">${GH_SVG()}${esc(localCta[c.id] || c.label)}</span>
        <p>${esc(c.body)}</p>
        <span class="go">${ARROW}</span>
      </a>`).join('\n')}
    </div>`;
}

/* ─────────────────────── page renderers ─────────────────────── */

function renderIndex(ctx) {
  const { L, p, t } = ctx;
  const home = content.pages.index;
  const hero = t.hero;
  const pillars = arr(home.solution?.pillars);
  const ev = home.evidenceStrip || {};
  const trust = arr(home.trust?.items);
  const evMetrics = arr(t.metrics).slice(0, 4);

  return `<header class="hero wrap" id="main">
    <div class="orb orb1" aria-hidden="true" data-parallax></div>
    <div class="orb orb2" aria-hidden="true" data-parallax></div>
    <div class="orb orb3" aria-hidden="true" data-parallax></div>
    <div class="badge"><span class="live"></span>${esc(hero.badge)}</div>
    <p class="kicker">${esc(hero.eyebrow)}</p>
    <h1 class="grad-text">${esc(hero.title)}</h1>
    <p class="lede">${esc(hero.subtitle)}</p>
    <div class="cta-row">
      <a class="btn btn-p magnetic" href="${hrefTo(L, p, L, 'contact')}">${esc(hero.primaryCta)} ${ARROW}</a>
      <a class="btn btn-gh magnetic" href="${SITE.repo}" target="_blank" rel="noopener noreferrer">${GH_SVG()}${esc(hero.secondaryCta)}</a>
    </div>
    <ul class="trust">
${arr(hero.trust).map((item) => `      <li><span class="ic">${CHECK}</span>${esc(item)}</li>`).join('\n')}
    </ul>
  </header>

  <section class="wrap reveal" aria-labelledby="problem-h">
    <div class="kicker">${esc(t.nav.platform)}</div>
    <h2 id="problem-h">${esc(home.problem?.title || '')}</h2>
    <div class="prose lede" style="max-width:760px">
${arr(home.problem?.body).map((para) => `      <p>${esc(para)}</p>`).join('\n')}
      ${home.problem?.audienceNote ? `<p style="margin-top:1rem;font-size:.85rem;color:var(--dim2)">${esc(home.problem.audienceNote)}</p>` : ''}
    </div>
  </section>

  <section class="wrap reveal" aria-labelledby="sol-h">
    <div class="kicker">${esc(home.solution?.title || '')}</div>
    <h2 id="sol-h">${esc(home.solution?.title || '')}</h2>
    <p class="lede">${esc(home.solution?.body || '')}</p>
    <div class="cards stagger">
${pillars.map((pl, i) => `      <article class="card">
        <div class="icon" aria-hidden="true">${['⬢', '◎', '✓', '◈'][i % 4]}</div>
        <h3>${esc(pl.title)}</h3>
        <p>${esc(pl.body)}</p>
      </article>`).join('\n')}
    </div>
    <div class="metrics">
${evMetrics.map((m) => `      <div class="metric">
        <div class="val" data-count>${esc(m.value)}</div>
        <div class="lbl">${esc(m.label)}</div>
      </div>`).join('\n')}
    </div>
    <p class="form-note" style="margin-top:.9rem">${esc(ev.note || '')} <a href="${hrefTo(L, p, L, 'metrics')}">${esc(t.cta.readMetrics)} →</a></p>
  </section>

  <section class="wrap reveal" aria-labelledby="faq-h">
    <div class="kicker">${esc(t.nav.company)}</div>
    <h2 id="faq-h">${esc(home.trust?.title || '')}</h2>
    <div class="faq-grid stagger">
${trust.map((item) => `      <div class="faq-item">
        <h3><span class="q" aria-hidden="true">?</span>${esc(item.title)}</h3>
        <p>${esc(item.body)}</p>
      </div>`).join('\n')}
    </div>
    ${renderCtaBand(ctx, home.ctaBand)}
  </section>`;
}

function renderPlatform(ctx) {
  const { t } = ctx;
  const c = content.pages.platform;
  const arch = c.architecture || {};
  const agents = c.agents || {};
  const caps = c.capabilities || {};
  const op = c.operatingModel || {};
  return `${renderBreadcrumbs(ctx)}
  <header class="page-head wrap reveal" id="main">
    <div class="orb orb1" aria-hidden="true"></div>
    <div class="kicker">${esc(t.pages.platform.heading)}</div>
    <h1>${esc(c.header?.headline || t.pages.platform.heading)}</h1>
    <p class="lede">${esc(t.pages.platform.subhead)}</p>
  </header>

  <section class="wrap reveal" aria-labelledby="arch-h">
    <div class="block-title"><div class="kicker">${esc(arch.title || 'Architecture')}</div></div>
    <h2 id="arch-h" class="sr-title" style="position:absolute;left:-9999px">${esc(arch.title || 'Architecture')}</h2>
    <div class="cards stagger">
${arr(arch.layers).map((l) => `      <article class="card">
        <div class="badges">${badge(t, l.status)}</div>
        <h3>${esc(l.title)}</h3>
        <p>${esc(l.body)}</p>
      </article>`).join('\n')}
    </div>
  </section>

  <section class="wrap reveal" aria-labelledby="agents-h">
    <div class="kicker">${esc(agents.title || 'Agents')}</div>
    <h2 id="agents-h" style="position:absolute;left:-9999px">${esc(agents.title || 'Agents')}</h2>
    <p class="lede">${esc(agents.note || '')}</p>
    <div class="agents stagger">
${arr(agents.items).map((a) => `      <div class="agent">
        <div class="tag">${esc(a.id)}</div>
        <div class="badges">${badge(t, a.status)}</div>
        <h3>${esc(a.name)}</h3>
        <p>${esc(a.mission)}</p>
      </div>`).join('\n')}
    </div>
  </section>

  <section class="wrap reveal" aria-labelledby="caps-h">
    <div class="kicker">${esc(caps.title || 'Capabilities')}</div>
    <h2 id="caps-h" style="position:absolute;left:-9999px">${esc(caps.title || 'Capabilities')}</h2>
    <p class="lede">${esc(caps.note || '')}</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">${esc(caps.title || 'Capability')}</th><th scope="col">${esc(t.common.status)}</th></tr></thead>
        <tbody>
${arr(caps.rows).map((r) => `          <tr><td>${esc(r.capability)}</td><td>${badge(t, r.status)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>
  </section>

  <section class="wrap reveal" aria-labelledby="op-h">
    <div class="kicker">${esc(op.title || 'Operating model')}</div>
    <h2 id="op-h" style="position:absolute;left:-9999px">${esc(op.title || 'Operating model')}</h2>
    <div class="steps">
${arr(op.steps).map((s) => `      <div class="step" data-n="${String(s.step).padStart(2, '0')}">
        <div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>
      </div>`).join('\n')}
    </div>
    ${renderCtaBand(ctx, c.ctaBand)}
  </section>`;
}

function renderMetricsPage(ctx) {
  const { t } = ctx;
  const c = content.pages.metrics;
  const inv = c.investorNarrative || {};
  return `${renderBreadcrumbs(ctx)}
  <header class="page-head wrap reveal" id="main">
    <div class="orb orb2" aria-hidden="true"></div>
    <div class="kicker">${esc(c.header?.eyebrow || 'Metrics')}</div>
    <h1>${esc(t.pages.metrics.heading)}</h1>
    <p class="lede">${esc(t.pages.metrics.subhead)}</p>
    <div class="dates">
      <span class="st st-meta">${esc(t.common.date)}: ${esc(SITE.metricsDate)}</span>
      <span class="st st-meta">${esc(t.common.source)}: ${esc(SITE.metricsSource)}</span>
    </div>
  </header>

  <section class="wrap reveal" aria-label="${esc(t.pages.metrics.heading)}">
${arr(c.metrics).map((m) => `    <article class="mrow" id="${esc(m.id)}">
      <div class="mrow-top">
        <div class="val" data-count>${esc(m.value)}</div>
        <div class="lbl">${esc(m.label)}</div>
      </div>
      <div class="badges">
        ${badge(t, m.status)}
        <span class="st st-meta">${esc(t.common.date)}: ${esc(m.date)}</span>
        <span class="st st-meta">${esc(t.common.source)}: ${esc(m.source)}</span>
      </div>
      <dl>
        <dt>${esc(t.common.methodology)}</dt><dd>${esc(m.methodology)}</dd>
        <dt>${esc(t.common.source)}</dt><dd>${esc(m.source)}</dd>
        <dt>${esc(t.common.date)}</dt><dd>${esc(m.date)}</dd>
        <dt>${esc(t.common.status)}</dt><dd>${esc(statusLabel(t, m.status))}</dd>
      </dl>
      ${m.notes ? `<p class="note">${esc(m.notes)}</p>` : ''}
    </article>`).join('\n')}
    <p class="form-note" style="margin-top:1.4rem">${esc(c.disclaimer || '')}</p>
  </section>

  <section class="wrap reveal" aria-labelledby="inv-h">
    <div class="kicker">${esc(t.nav.metrics)}</div>
    <h2 id="inv-h">${esc(t.pages.metrics.heading)}</h2>
    <div class="prose lede">
      <p><strong style="color:var(--ink)">${esc(inv.note || '')}</strong></p>
      ${inv.problem ? `<p><strong style="color:var(--ink)">Problem.</strong> ${esc(inv.problem)}</p>` : ''}
      ${inv.wedge ? `<p><strong style="color:var(--ink)">Wedge.</strong> ${esc(inv.wedge)}</p>` : ''}
      ${inv.moat ? `<p><strong style="color:var(--ink)">Moat.</strong> ${esc(inv.moat)}</p>` : ''}
      ${inv.license ? `<p><strong style="color:var(--ink)">License.</strong> ${esc(inv.license)}</p>` : ''}
      ${inv.community ? `<p><strong style="color:var(--ink)">Community.</strong> ${esc(inv.community)}</p>` : ''}
    </div>
    ${renderCtaBand(ctx, { primaryCta: { label: t.cta.getDemo, href: '/contact' }, secondaryCta: { label: t.cta.viewGithub, href: SITE.repo } })}
  </section>`;
}

function renderCommunity(ctx) {
  const { t } = ctx;
  const c = content.pages.community;
  const gfi = c.goodFirstIssues || {};
  const coc = c.codeOfConduct || {};
  return `${renderBreadcrumbs(ctx)}
  <header class="page-head wrap reveal" id="main">
    <div class="orb orb3" aria-hidden="true"></div>
    <div class="kicker">${esc(t.nav.community)}</div>
    <h1>${esc(t.pages.community.heading)}</h1>
    <p class="lede">${esc(t.pages.community.subhead)}</p>
    <div class="cta-row" style="animation:none">
      <a class="btn btn-gh magnetic" href="${SITE.repo}" target="_blank" rel="noopener noreferrer">${GH_SVG()}${esc(t.cta.viewGithub)}</a>
      <a class="btn btn-p magnetic" href="${hrefTo(ctx.L, ctx.p, ctx.L, 'contact')}">${esc(t.cta.getDemo)} ${ARROW}</a>
    </div>
  </header>

  <section class="wrap reveal" aria-label="${esc(t.nav.community)}">
    <p class="lede" style="font-size:1.15rem;color:var(--ink);max-width:780px">${esc(c.tone || t.footer.tagline)}</p>
${githubCtaGrid(ctx, arr(c.ctas).map((x) => ({ id: x.id, label: x.label, body: x.body, href: x.href })))}
  </section>

  <section class="wrap reveal" aria-labelledby="gfi-h">
    <div class="kicker">${esc(gfi.title || 'Good first issues')}</div>
    <h2 id="gfi-h" style="position:absolute;left:-9999px">${esc(gfi.title || '')}</h2>
    <p class="lede">${esc(gfi.note || '')}</p>
    <div class="cards stagger">
${arr(gfi.items).map((it, i) => `      <article class="card">
        <div class="icon mono" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div>
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.body)}</p>
      </article>`).join('\n')}
    </div>
  </section>

  <section class="wrap reveal" aria-labelledby="coc-h">
    <div class="cols-2">
      <div class="panel">
        <h3>${esc(coc.title || 'Code of conduct')}</h3>
        <p>${esc(coc.body || '')}</p>
        ${coc.link ? `<p style="margin-top:.9rem"><a href="${coc.link.href}" target="_blank" rel="noopener noreferrer">${esc(coc.link.label)} ${ARROW}</a></p>` : ''}
      </div>
      <div class="panel">
        <h3>${esc(t.nav.opensource)}</h3>
        <ul>
${arr(c.contributionRules).map((r) => `          <li>${esc(r)}</li>`).join('\n')}
        </ul>
      </div>
    </div>
    ${renderCtaBand(ctx, c.ctaBand)}
  </section>`;
}

function renderOpenSource(ctx) {
  const { t } = ctx;
  const c = content.pages['open-source'];
  const dl = c.dualLicense || {};
  const bnd = c.boundary || {};
  const com = c.commercial || {};
  const ea = c.earlyAccess || {};
  return `${renderBreadcrumbs(ctx)}
  <header class="page-head wrap reveal" id="main">
    <div class="orb orb1" aria-hidden="true"></div>
    <div class="kicker">${esc(t.nav.opensource)}</div>
    <h1>${esc(t.pages['open-source'].heading)}</h1>
    <p class="lede">${esc(t.pages['open-source'].subhead)}</p>
    <div class="dates"><span class="lic-badge">${esc(t.footer.licenseBadge)}</span></div>
  </header>

  <section class="wrap reveal" aria-labelledby="dual-h">
    <div class="kicker">${esc(dl.title || 'Dual license')}</div>
    <h2 id="dual-h" style="position:absolute;left:-9999px">${esc(dl.title || '')}</h2>
    <p class="lede">${esc(dl.body || '')}</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">License</th><th scope="col">Grant</th><th scope="col">Best for</th><th scope="col">Considerations</th></tr></thead>
        <tbody>
${arr(dl.table).map((r) => `          <tr><td><strong>${esc(r.license)}</strong></td><td>${esc(r.grant)}</td><td>${esc(r.bestFor)}</td><td>${esc(r.considerations)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>
    <div class="cols-3 stagger" style="margin-top:1.4rem">
${arr(dl.whichForWhom).map((w) => `      <div class="panel"><h3>${esc(w.audience)}</h3><p>${esc(w.recommendation)}</p></div>`).join('\n')}
    </div>
  </section>

  <section class="wrap reveal" aria-labelledby="bnd-h">
    <div class="kicker">${esc(bnd.title || 'Boundary')}</div>
    <h2 id="bnd-h" style="position:absolute;left:-9999px">${esc(bnd.title || '')}</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">${esc(t.common.status)}</th><th scope="col">Item</th><th scope="col">License</th></tr></thead>
        <tbody>
${arr(bnd.rows).map((r) => `          <tr><td><span class="st ${r.scope === 'Open' ? 'st-ok' : 'st-proto'}">${esc(r.scope)}</span></td><td>${esc(r.item)}</td><td>${esc(r.license)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>
  </section>

  <section class="wrap reveal" aria-label="Commercial">
    <div class="cols-2">
      <div class="panel">
        <h3>${esc(com.title || 'Commercial')}</h3>
        <p>${esc(com.body || '')}</p>
        ${com.cta ? `<p style="margin-top:1rem"><a class="btn btn-p" href="${hrefTo(ctx.L, ctx.p, ctx.L, 'contact')}">${esc(com.cta.label)} ${ARROW}</a></p>` : ''}
      </div>
      <div class="panel">
        <h3>${esc(ea.title || 'Early access')}</h3>
        <div class="badges">${badge(t, ea.status || 'roadmap')}</div>
        <p>${esc(ea.body || '')}</p>
      </div>
    </div>
    ${renderCtaBand(ctx, c.ctaBand)}
  </section>`;
}

function renderCompany(ctx) {
  const { t } = ctx;
  const c = content.pages.company;
  const prof = c.profile || {};
  const aud = c.audiences || {};
  return `${renderBreadcrumbs(ctx)}
  <header class="page-head wrap reveal" id="main">
    <div class="orb orb2" aria-hidden="true"></div>
    <div class="kicker">${esc(t.nav.company)}</div>
    <h1>${esc(t.pages.company.heading)}</h1>
    <p class="lede">${esc(t.pages.company.subhead)}</p>
  </header>

  <section class="wrap reveal" aria-labelledby="prof-h">
    <div class="kicker">${esc(prof.title || 'Corporate profile')}</div>
    <h2 id="prof-h" style="position:absolute;left:-9999px">${esc(prof.title || '')}</h2>
    <dl class="facts">
${arr(prof.facts).map((f) => `      <dt>${esc(f.key)}</dt><dd>${esc(f.value)}</dd>`).join('\n')}
    </dl>
    <div class="prose lede" style="margin-top:1.5rem"><p>${esc(prof.body || '')}</p></div>
  </section>

  <section class="wrap reveal" id="audiences" aria-label="Audiences">
    <div class="cols-3 stagger">
${[aud.press, aud.investors, aud.developers].filter(Boolean).map((a) => `      <div class="panel">
        <h3>${esc(a.title)}</h3>
        <ul>
${arr(a.bullets).map((b) => `          <li>${esc(b)}</li>`).join('\n')}
        </ul>
      </div>`).join('\n')}
    </div>
  </section>

  <section class="wrap reveal" aria-labelledby="ch-h">
    <div class="kicker">${esc(t.nav.contact)}</div>
    <h2 id="ch-h" style="position:absolute;left:-9999px">${esc(t.nav.contact)}</h2>
    <div class="cards stagger">
${arr(c.contactChannels).map((ch) => `      <article class="card">
        <h3>${esc(ch.label)}</h3>
        <p>${esc(ch.value)}</p>
        <p style="margin-top:.6rem"><a href="${internalHref(ctx, ch.href)}"${/^https?:\/\//.test(ch.href) ? ' target="_blank" rel="noopener noreferrer"' : ''} aria-label="${esc(ch.label)}">${ARROW}</a></p>
      </article>`).join('\n')}
    </div>
    ${renderCtaBand(ctx, c.ctaBand)}
  </section>`;
}

function renderContact(ctx) {
  const { t } = ctx;
  const c = content.pages.contact;
  return `${renderBreadcrumbs(ctx)}
  <header class="page-head wrap reveal" id="main">
    <div class="orb orb1" aria-hidden="true"></div>
    <div class="kicker">${esc(t.nav.contact)}</div>
    <h1>${esc(t.pages.contact.heading)}</h1>
    <p class="lede">${esc(c.intro || t.pages.contact.subhead)}</p>
  </header>

  <section class="wrap reveal" aria-label="${esc(t.nav.contact)}">
    <div class="cards stagger">
${arr(c.tracks).map((tr, i) => `      <article class="card">
        <div class="icon mono" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div>
        <h3>${esc(tr.title)}</h3>
        <p>${esc(tr.body)}</p>
      </article>`).join('\n')}
    </div>
    <div class="panel" style="margin-top:1.6rem">
      <h3>${esc(t.form.kicker)}</h3>
      <ul>
${arr(c.expectations).map((e) => `        <li>${esc(e)}</li>`).join('\n')}
      </ul>
    </div>
  </section>

  <section class="wrap form-section reveal" style="padding-bottom:5rem" aria-label="Form">
    ${renderForm(ctx)}
    <div class="related">
${arr(c.alternativeChannels).map((a) => `      <a href="${internalHref(ctx, a.href)}"${/^https?:\/\//.test(a.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(a.label)}</a>`).join('\n')}
    </div>
    ${renderCtaBand(ctx, c.ctaBand)}
  </section>`;
}

function renderLegal(ctx) {
  const { L, p, t } = ctx;
  const c = content.pages[p];
  const isCookies = p === 'cookies';
  const isLicenses = p === 'licenses';
  const isSecurity = p === 'security';
  const extra = isCookies ? (c.cookies || []) : [];
  const mgmt = c.management;

  const sectionHtml = arr(c.sections).map((s) => `<article class="legal-section" id="${esc(s.id || '')}">
      <div class="sid">${esc(s.id || '')}</div>
      <h2>${esc(s.title)}</h2>
${s.body ? `      <p>${esc(s.body)}</p>\n` : ''}${s.body2 ? `      <p style="margin-top:.7rem">${esc(s.body2)}</p>\n` : ''}${arr(s.bullets).length ? `      <ul>\n${arr(s.bullets).map((b) => `        <li>${esc(b)}</li>`).join('\n')}\n      </ul>\n` : ''}${arr(s.steps).length ? `      <ul>\n${arr(s.steps).map((b) => `        <li>${esc(b)}</li>`).join('\n')}\n      </ul>\n` : ''}${arr(s.table).length ? `      <div class="table-wrap" style="margin-top:.9rem"><table><tbody>\n${arr(s.table).map((r) => `        <tr><td>${esc(r.component || r.name || '')}</td><td>${esc(r.license || r.purpose || '')}</td></tr>`).join('\n')}\n      </tbody></table></div>\n` : ''}${s.link ? `      <p style="margin-top:.9rem"><a href="${internalHref(ctx, s.link.href)}"${/^https?:\/\//.test(s.link.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(s.link.label)} ${ARROW}</a></p>` : ''}
    </article>`).join('\n');

  const cookiesTable = isCookies && extra.length ? `<div class="table-wrap" style="margin-top:1.4rem">
      <table>
        <thead><tr><th scope="col">Name</th><th scope="col">${esc(t.common.status)}</th><th scope="col">Purpose</th><th scope="col">Duration</th><th scope="col">Consent</th></tr></thead>
        <tbody>
${extra.map((ck) => `          <tr><td>${esc(ck.name)}</td><td><span class="st ${ck.category === 'Essential' ? 'st-ok' : 'st-road'}">${esc(ck.category)}</span></td><td>${esc(ck.purpose)}</td><td>${esc(ck.duration)}</td><td>${esc(ck.consent)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>` : '';

  const mgmtBlock = mgmt ? `<article class="legal-section">
      <div class="sid">management</div>
      <h2>${esc(mgmt.title)}</h2>
      <p>${esc(mgmt.body)}</p>
    </article>` : '';

  return `${renderBreadcrumbs(ctx)}
  <header class="page-head wrap reveal" id="main">
    <div class="kicker">${esc(c.header?.eyebrow || t.pages[p].heading)}</div>
    <h1>${esc(t.pages[p].heading)}</h1>
    <p class="lede">${esc(t.pages[p].subhead)}</p>
    <div class="dates">
${c.effectiveDate ? `      <span class="st st-meta">${esc(t.common.effective)}: ${esc(c.effectiveDate)}</span>\n` : ''}${c.lastUpdated ? `      <span class="st st-meta">${esc(t.common.lastUpdated)}: ${esc(c.lastUpdated)}</span>` : ''}
    </div>
  </header>

  <section class="wrap reveal" aria-label="${esc(t.pages[p].heading)}">
${isCookies ? arr(c.principles).map((pr) => `    <div class="panel" style="margin-bottom:.7rem"><p style="margin:0">${CHECK} ${esc(pr)}</p></div>`).join('\n') : ''}
${sectionHtml}
${cookiesTable}
${mgmtBlock}
${isSecurity && c.sections?.find?.((s) => s.id === 'disclosure') ? '' : ''}
    <div class="related">
${arr(c.related).map((r) => `      <a href="${internalHref(ctx, r.href)}">${esc(r.label)}</a>`).join('\n')}
    </div>
  </section>`;
}

const RENDERERS = {
  index: renderIndex,
  platform: renderPlatform,
  metrics: renderMetricsPage,
  community: renderCommunity,
  'open-source': renderOpenSource,
  company: renderCompany,
  contact: renderContact,
  privacy: renderLegal,
  terms: renderLegal,
  cookies: renderLegal,
  security: renderLegal,
  licenses: renderLegal
};

/* ─────────────────────── page shell ─────────────────────── */

function renderPage(L, p) {
  const t = locales[L];
  const dir = RTL.has(L) ? 'rtl' : 'ltr';
  const ctx = { L, p, t, dir };
  const body = RENDERERS[p](ctx);
  const formI18n = JSON.stringify({
    required: t.form.required, invalidEmail: t.form.invalidEmail,
    success: t.form.success, error: t.form.error
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="${L}" dir="${dir}">
<head>
${renderHead(ctx)}
</head>
<body>
${renderNav(ctx)}

<main>
${body}
</main>

${renderFooter(ctx)}

<script>window.__FORM_I18N = ${formI18n};</script>
<script>
${JS}
</script>
</body>
</html>
`;
}

/* ─────────────────────── static outputs ─────────────────────── */

function buildSitemap() {
  const urls = [];
  for (const code of LOCALE_CODES) {
    for (const p of PAGES) urls.push(absUrl(code, p));
  }
  urls.push(SITE.domain + '/en/');       // alias: /en/ home (root / is already the en entry)
  const today = new Date().toISOString().slice(0, 10);
  const priorities = { index: '1.0' };
  const body = urls.map((u) => {
    const parsed = new URL(u);
    const segs = parsed.pathname.split('/').filter(Boolean);
    let page = segs.length > 1 ? segs[segs.length - 1] : (segs.length === 1 && LOCALE_CODES.includes(segs[0]) ? 'index' : (segs.length === 1 ? segs[0] : 'index'));
    if (parsed.pathname === '/') page = 'index';
    const pri = priorities[page] || (['platform', 'contact', 'metrics'].includes(page) ? '0.9' : '0.7');
    return `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${pri}</priority>\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildRobots() {
  return `User-agent: *
Allow: /

# Contact API is not crawlable
Disallow: /api/

Sitemap: ${SITE.domain}/sitemap.xml
`;
}

function buildLlms() {
  const lines = [
    `# ${SITE.name}`,
    ``,
    `> ${en.site.description}`,
    ``,
    `Sibernetick is a data-sovereign, AI-native enterprise cybersecurity platform for banks, energy, telecom, and the public sector. AI security agents operate inside the customer perimeter; remediation is proposed by agents and approved by humans before any change is applied.`,
    ``,
    `## Site purpose`,
    ``,
    `Corporate landing and documentation site for the Sibernetick product: platform architecture, metrics registry with evidence, open-source posture, company information, and contact channels.`,
    ``,
    `## Canonical language & locales`,
    ``,
    `Canonical / x-default language: English (en). 19 locales available under /{locale}/: ${LOCALE_CODES.join(', ')}. Missing translations fall back to English.`,
    ``,
    `## Page map (English)`,
    ``,
  ];
  for (const p of PAGES) {
    lines.push(`- [${en.pages[p].heading}](${absUrl('en', p)}): ${en.pages[p].description}`);
  }
  lines.push(
    ``,
    `## License`,
    ``,
    `Landing site source is dual-licensed ${SITE.license}. The Sibernetick product application, agent runtime, and detection logic are proprietary and provided under commercial agreement only.`,
    ``,
    `Repository: ${SITE.repo}`,
    ``,
    `## Contact`,
    ``,
    `Email: ${SITE.email}`,
    `Contact form: ${absUrl('en', 'contact')}`,
    `Security disclosure: ${SITE.repo}/security`,
    ``,
    `## Claim boundaries (important)`,
    ``,
    `- **lab-validated**: prototype evidence produced in a lab environment (source: ${SITE.metricsSource}, date: ${SITE.metricsDate}). Not a production guarantee, certification, or third-party benchmark.`,
    `- **prototype**: capability exists in the prototype; maturity varies.`,
    `- **roadmap**: planned intent, not a commitment; no delivery date published.`,
    `- **early access**: design-partner evaluation under agreement, prior to general availability.`,
    `Every published number carries methodology, source, date, and status — see the metrics registry.`,
    ``
  );
  return lines.join('\n');
}

function buildLlmsFull() {
  const parts = [`# ${SITE.name} — full content dump (en)`, '', en.site.description, ''];
  for (const p of PAGES) {
    const c = content.pages[p];
    parts.push(`## ${en.pages[p].heading}`, '', en.pages[p].description, '');
    const dump = (obj, depth = 0) => {
      if (obj == null) return;
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        parts.push('  '.repeat(depth) + String(obj));
        return;
      }
      if (Array.isArray(obj)) { obj.forEach((x) => dump(x, depth)); return; }
      for (const [k, v] of Object.entries(obj)) {
        if (['site', 'page', 'locale', 'policyRef'].includes(k)) continue;
        if (v == null || v === '') continue;
        if (typeof v === 'object') {
          if (Array.isArray(v) && v.every((x) => typeof x !== 'object')) {
            parts.push('  '.repeat(depth) + `- ${k}: ${v.join(' · ')}`);
          } else {
            parts.push('  '.repeat(depth) + `**${k}**`);
            dump(v, depth + 1);
          }
        } else {
          parts.push('  '.repeat(depth) + `- ${k}: ${v}`);
        }
      }
    };
    dump(c);
    parts.push('');
  }
  parts.push('---', `Claim boundaries: lab-validated = lab-environment prototype evidence (${SITE.metricsSource}, ${SITE.metricsDate}); roadmap = planned intent. License: ${SITE.license} for landing source; product is proprietary. Contact: ${SITE.email}.`, '');
  return parts.join('\n');
}

function buildManifest() {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: en.site.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#04070f',
    theme_color: '#04070f',
    lang: 'en',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
  };
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22d3ee"/>
      <stop offset=".55" stop-color="#818cf8"/>
      <stop offset="1" stop-color="#c084fc"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#04070f"/>
  <circle cx="32" cy="32" r="17" fill="none" stroke="url(#g)" stroke-width="4"/>
  <circle cx="32" cy="32" r="6" fill="url(#g)"/>
  <path d="M32 8v8M32 48v8M8 32h8M48 32h8" stroke="url(#g)" stroke-width="3" stroke-linecap="round"/>
</svg>
`;

function build404() {
  const t = en;
  const ctx = { L: 'en', p: '404', t, dir: 'ltr' };
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 — ${SITE.name}</title>
  <meta name="robots" content="noindex" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
${CSS}
  </style>
</head>
<body>
  <div class="grid-bg" aria-hidden="true"></div>
  ${renderNav(ctx)}
  <main class="wrap nf" id="main">
    <div class="code">404</div>
    <h1 class="grad-text">${esc(t.common.pageNotFound)}</h1>
    <p class="lede">${esc(t.common.pageNotFoundBody)}</p>
    <div class="cta-row">
      <a class="btn btn-p" href="/">${esc(t.common.backHome)} ${ARROW}</a>
      <a class="btn btn-gh" href="${SITE.repo}" target="_blank" rel="noopener noreferrer">${GH_SVG()}${esc(t.nav.github)}</a>
    </div>
  </main>
  ${renderFooter(ctx)}
  <script>
${JS}
  </script>
</body>
</html>
`;
}

/* ─────────────────────── main ─────────────────────── */

function main() {
  const t0 = Date.now();
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let htmlCount = 0;
  const perLocale = {};

  for (const code of LOCALE_CODES) {
    perLocale[code] = 0;
    for (const p of PAGES) {
      const html = renderPage(code, p);
      write(path.join(OUT, code, `${p}.html`), html);
      htmlCount++;
      perLocale[code]++;
    }
  }

  // Root alias: EN home, byte-identical to /en/index.html (canonical → /)
  const enHome = fs.readFileSync(path.join(OUT, 'en', 'index.html'), 'utf8');
  write(path.join(OUT, 'index.html'), enHome);
  htmlCount++;

  write(path.join(OUT, '404.html'), build404());
  htmlCount++;
  write(path.join(OUT, 'sitemap.xml'), buildSitemap());
  write(path.join(OUT, 'robots.txt'), buildRobots());
  write(path.join(OUT, 'llms.txt'), buildLlms());
  write(path.join(OUT, 'llms-full.txt'), buildLlmsFull());
  write(path.join(OUT, 'manifest.webmanifest'), buildManifest());
  write(path.join(OUT, 'favicon.svg'), FAVICON);

  // counts
  const sitemapXml = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
  const sitemapCount = (sitemapXml.match(/<loc>/g) || []).length;
  const expected = LOCALE_CODES.length * PAGES.length; // 19*12 = 228 canonical
  const aliases = 1; // root / (EN home alias)
  const expectedTotal = expected + aliases;

  let files = 0;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else files++;
    }
  })(OUT);

  const ok = sitemapCount === expectedTotal;
  console.log('──────────────────────────────────────────────');
  console.log(` Sibernetick build OK  (${Date.now() - t0} ms)`);
  console.log('──────────────────────────────────────────────');
  console.log(` locales:        ${LOCALE_CODES.length}  (${LOCALE_CODES.join(', ')})`);
  console.log(` pages/locale:   ${PAGES.length}  (${PAGES.join(', ')})`);
  console.log(` locale pages:   ${LOCALE_CODES.length * PAGES.length}  -> public/{locale}/{page}.html`);
  console.log(` html total:     ${htmlCount}  (incl. root /index.html alias + 404.html)`);
  console.log(` sitemap URLs:   ${sitemapCount}  (expected ${expectedTotal} = ${LOCALE_CODES.length}*${PAGES.length} + ${aliases} alias)`);
  console.log(` files written:  ${files}`);
  console.log(` static extras:  sitemap.xml, robots.txt, llms.txt, llms-full.txt, manifest.webmanifest, favicon.svg`);
  console.log('──────────────────────────────────────────────');
  if (!ok) {
    console.error(` FAIL: sitemap URL count ${sitemapCount} !== expected ${expectedTotal}`);
    process.exit(1);
  }
}

main();
