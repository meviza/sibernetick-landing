/**
 * Shared Pages Function: POST /api/contact
 * Validates lead form and sends notification email via Cloudflare Email Service.
 * Env:
 *   NOTIFY_EMAIL — destination (verified) address, e.g. kerem.newton571@gmail.com
 *   EMAIL        — send_email binding (Workers) OR optional RESEND_API_KEY fallback
 *   SITE_NAME    — brand shown in subject (Sibernetick / KONSENXIA)
 */

const MAX_BODY = 12_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

const rateMap = new Map();

function rateOk(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  return entry.count <= RATE_MAX;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    'unknown';

  if (!rateOk(ip)) {
    return json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, 429);
  }

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json({ error: 'Okunamayan istek gövdesi' }, 400);
  }
  if (!raw || raw.length > MAX_BODY) {
    return json({ error: 'Geçersiz istek gövdesi' }, 400);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Geçersiz JSON' }, 400);
  }

  // Honeypot
  if (body.website) {
    return json({ ok: true });
  }

  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = String(body.email ?? '').trim().slice(0, 200);
  const company = String(body.company ?? '').trim().slice(0, 160);
  const phone = String(body.phone ?? '').trim().slice(0, 40);
  const interest = String(body.interest ?? '').trim().slice(0, 40);
  const message = String(body.message ?? '').trim().slice(0, 3000);
  const site = String(body.site ?? env.SITE_NAME ?? 'landing').slice(0, 40);

  if (!name || !email || !interest || !message) {
    return json({ error: 'Zorunlu alanlar eksik' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ error: 'Geçersiz e-posta' }, 400);
  }

  const interestLabels = {
    demo: 'Demo / Kapalı sunum',
    pilot: 'Teknik / klinik pilot',
    kurumsal: 'Kurumsal hizmet talebi',
    yatirim: 'Yatırımcı görüşmesi',
    ortaklik: 'Ortaklık / İş birliği',
    diger: 'Diğer'
  };

  const brand = env.SITE_NAME || site;
  const to = env.NOTIFY_EMAIL || 'kerem.newton571@gmail.com';
  const subject = `[${brand}] Yeni talep: ${interestLabels[interest] || interest} — ${name}`;

  const text = [
    `Site: ${brand}`,
    `Ad Soyad: ${name}`,
    `E-posta: ${email}`,
    `Kurum: ${company || '—'}`,
    `Telefon: ${phone || '—'}`,
    `Talep: ${interestLabels[interest] || interest}`,
    `Mesaj:`,
    message,
    '',
    `— Cloudflare Pages/${brand} iletişim formu`,
    `IP: ${ip}`
  ].join('\n');

  const html = `
  <div style="font-family:system-ui,sans-serif;line-height:1.55;color:#0f172a;max-width:560px">
    <h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(brand)} — yeni iletişim talebi</h2>
    <p style="color:#64748b;margin:0 0 16px;font-size:13px">Cloudflare iletişim formu üzerinden geldi.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:110px">Ad Soyad</td><td><b>${escapeHtml(name)}</b></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">E-posta</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Kurum</td><td>${escapeHtml(company || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Telefon</td><td>${escapeHtml(phone || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Talep</td><td><b>${escapeHtml(interestLabels[interest] || interest)}</b></td></tr>
    </table>
    <p style="margin:16px 0 6px;font-weight:600;font-size:13px;color:#334155">Mesaj</p>
    <div style="background:#f1f5f9;border-radius:8px;padding:12px 14px;white-space:pre-wrap;font-size:14px">${escapeHtml(message)}</div>
    <p style="margin-top:16px;font-size:12px;color:#94a3b8">IP: ${escapeHtml(ip)} · ${new Date().toISOString()}</p>
  </div>`;

  // Prefer native send_email binding (free: verified destination only)
  if (env.EMAIL && typeof env.EMAIL.send === 'function') {
    try {
      await env.EMAIL.send({
        to,
        from: env.FROM_EMAIL || `noreply@${site === 'konsenxia' ? 'konsenxia.com' : 'sibernetick.com'}`,
        subject,
        text,
        html,
        replyTo: { email, name }
      });
      console.log('EMAIL_SENT_OK', brand, to, subject);
      return json({ ok: true, delivered: true });
    } catch (err) {
      // fall through to optional API fallback
      console.error('EMAIL.send failed:', err && err.message ? err.message : err);
    }
  }

  // Optional Resend fallback if RESEND_API_KEY present (free tier)
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || `onboarding@resend.dev`,
          to: [to],
          reply_to: email,
          subject,
          text,
          html
        })
      });
      if (r.ok) return json({ ok: true });
      const t = await r.text();
      console.error('Resend failed:', t);
    } catch (err) {
      console.error('Resend error:', err && err.message ? err.message : err);
    }
  }

  // Last resort: accept + log so UX still works; operator sees failure in logs
  console.log('LEAD_FALLBACK', JSON.stringify({ site, name, email, interest, company }));
  return json({
    ok: true,
    warning: 'lead_logged_only',
    message: 'Talebiniz alındı (bildirim kuyruğa alındı).'
  });
}
