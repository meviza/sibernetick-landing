# Sibernetick — EN content index

Machine-readable JSON pages for the sibernetick.com multi-page landing site.

```
sibernetick/
  nav.json                 — navigation labels + CTAs
  footer.json               — footer columns (Product, Company, Legal, Community), social links
  github.json               — org/repo/url placeholders, star/watch/fork CTAs
  pages/
    home.json               — hero, problem, solution (4 pillars), trust, dual CTA
    platform.json           — architecture layers, agent roster, capability status board
    metrics.json            — metric objects (id/value/label/methodology/source/date/status) + investor narrative
    community.json          — GitHub CTAs, good first issues, code of conduct tone
    open-source.json        — MIT/Apache dual-license table, open vs private boundary, commercial CTA
    company.json            — corporate profile, press/investor/developer bullets, contact channels
    contact.json            — demo/pilot/investor/partner intro (form fields live in app)
    privacy.json            — privacy policy
    terms.json              — terms of use
    cookies.json            — cookie policy
    security.json           — responsible use + disclosure
    licenses.json           — license overview page
```

Rules: every number → methodology + source + date + status (`../METRICS_POLICY.md`). Copy bans: arsenal, exploit, payload, weaponized, unverified competitive claims. Allowed evidence words: lab-validated, prototype, roadmap, early access.
