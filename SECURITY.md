# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately via **GitHub Security Advisories**:

1. Open the **Security** tab of this repository.
2. Click **Report a vulnerability**.
3. Fill in the advisory form with reproduction steps, affected pages, and impact.

We will acknowledge reports as soon as practical and keep you informed of the fix timeline.

## Scope

This repository contains only static marketing/landing pages. It has:

- **No production secrets, API keys, or tokens** — none should ever be committed here.
- No backend databases or authenticated user data.

If you find a leak of credentials in this repo's history, treat it as critical and report it privately.

## Supported versions

| Version | Supported |
| ------- | --------- |
| latest `main` | ✅ |
| older commits | ⚠️ best effort |

## Safe harbor

We consider good-faith security research on this site protected behavior, provided you:

- Avoid privacy violations, data destruction, and service disruption.
- Do not access data that is not yours.
- Report findings privately before public disclosure.
