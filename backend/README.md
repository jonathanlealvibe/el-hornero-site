# El Hornero orders API (Cloudflare Worker, free tier)

1. `npx wrangler login` (needs the Cloudflare account that will own it — Abba Systems or the client).
2. `npx wrangler kv namespace create ORDERS` → paste the id into wrangler.toml.
3. `npx wrangler deploy` → gives https://elhornero-api.<account>.workers.dev
4. In the site's `index.html`, set `window.EH_API = "https://elhornero-api.<account>.workers.dev"` and redeploy.

Until step 4 the site runs in demo mode (orders in the browser, simulated rider).
Payment: `PATCH /orders/:id {paid:true}` is what the Payphone/Kushki callback should call once the client has a merchant account.
