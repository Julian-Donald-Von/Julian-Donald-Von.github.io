# STFU unique-IP counter

The homepage has no working counter endpoint yet. It shows `STFU consensus: unavailable` until `assets/js/stfu-config.js` points to a deployed Worker. It never substitutes a browser-local click count for unique IPs. Dismissal works even when the service fails.

## Deployment

Use a Cloudflare account with Workers and D1. From `counter/`:

1. Copy `wrangler.example.toml` to `wrangler.toml`.
2. Run `npx wrangler d1 create stfu-counter`; put the returned database ID in `wrangler.toml`.
3. Run `npx wrangler d1 migrations apply stfu-counter --remote`.
4. Run `npx wrangler secret put IP_SALT` and supply a cryptographically random secret of at least 32 characters. Keep it stable: rotation changes all IP hashes and allows old IPs to count again. Never commit it.
5. Run `npx wrangler deploy`.
6. Set `window.STFU_COUNTER_URL` in `assets/js/stfu-config.js` to the returned HTTPS origin, without a trailing slash, and deploy the homepage.
7. Verify GET `/count`, click STFU twice from the same network (refresh between clicks), and confirm the count increases only once. A second public IP should add one.

Official setup references: [D1 getting started](https://developers.cloudflare.com/d1/get-started/) and [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Semantics and privacy

POST `/stfu` reads Cloudflare's edge-provided `CF-Connecting-IP`, stores only a secret-keyed HMAC-SHA-256 digest, and uses a primary key plus `INSERT OR IGNORE` to deduplicate concurrent clicks. No raw IP, timestamp, browser identifier, or client secret is persisted by this application. GET `/count` is read-only. Missing IPs are rejected rather than grouped as `unknown`. Allowed browser origin is exactly the homepage origin; CORS is not an anti-bot boundary. This playful counter is not suitable for trusted analytics: VPNs, shared networks and changing IPv6 addresses affect the total, and automated traffic can inflate it. Cloudflare's own request logs are subject to the account's settings.

## Tests

From the repository root, run `node --test tests/*.test.mjs`. Tests use fake time and deterministic random values for rare splash paths; production has no debug URL or forced-easter-egg mode. No three-second completion deadline is imposed.
