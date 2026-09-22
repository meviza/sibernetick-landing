/**
 * Sibernetick site Worker
 * - POST /api/contact → validate → send_email binding → NOTIFY_EMAIL
 * - /healthz → ok
 * - Everything else → static assets from ./public
 * - Extensionless path resolution:
 *     /platform        → /en/platform.html   (EN default)
 *     /tr/platform     → /tr/platform.html   (locale prefix)
 *     /tr              → /tr/index.html
 * Root "/" is served straight from /index.html (EN home, x-default);
 * /en/ is an alias of the same content.
 */
import { handleContact } from './contact-handler.js';

const LOCALES = new Set([
  'en', 'tr', 'ar', 'de', 'es', 'fr', 'nl', 'it', 'pt', 'ru',
  'zh', 'ja', 'ko', 'pl', 'uk', 'vi', 'id', 'hi', 'th'
]);

const hasExt = (p) => /\.[a-z0-9]{1,8}$/i.test(p);

function candidatesFor(pathname) {
  const segs = pathname.split('/').filter(Boolean);
  if (!segs.length) return [];
  const out = [];
  if (LOCALES.has(segs[0])) {
    // /{locale}/... → .html sibling, then directory index
    out.push(`${pathname}.html`);
    if (segs.length === 1) out.push(`/${segs[0]}/index.html`);
  } else {
    // extensionless root shorthand → default to EN
    out.push(`/en${pathname}.html`);
    if (segs.length === 1) out.push(`/en/${segs[0]}/index.html`);
    out.push(`${pathname}/index.html`);
  }
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const siteEnv = {
        ...env,
        SITE_NAME: 'Sibernetick',
        FROM_EMAIL: env.FROM_EMAIL || 'noreply@sibernetick.com',
        NOTIFY_EMAIL: env.NOTIFY_EMAIL || 'kerem.newton571@gmail.com'
      };
      return handleContact(request, siteEnv);
    }

    if (url.pathname === '/healthz') {
      return new Response('ok', { status: 200 });
    }

    const res = await env.ASSETS.fetch(request);

    // Locale / extensionless resolution when no file matched
    if (res.status === 404 && !hasExt(url.pathname) && url.pathname !== '/') {
      for (const cand of candidatesFor(url.pathname)) {
        const r = await env.ASSETS.fetch(new Request(new URL(cand, url.origin), request));
        if (r.status === 200) return r;
      }
    }

    return res;
  }
};
