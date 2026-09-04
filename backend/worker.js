// El Hornero orders + live tracking API — Cloudflare Worker + KV (free tier).
// Endpoints: POST /orders, GET /orders/:id, PATCH /orders/:id, POST /orders/:id/location
// Deploy: npx wrangler deploy  (after `npx wrangler login` and creating the KV namespace in wrangler.toml)
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type' }
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } })
const uid = () => 'EH' + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase()

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
    const url = new URL(req.url)
    const m = url.pathname.match(/^\/orders(?:\/([A-Z0-9]+))?(?:\/(location))?$/i)
    if (!m) return json({ error: 'not found' }, 404)
    const [, id, sub] = m

    if (req.method === 'POST' && !id) {
      const body = await req.json()
      const order = { id: uid(), ...body, status: body.paid === false ? 'pendiente_pago' : 'recibido', createdAt: Date.now(), rider: null, dest: body.dest || null }
      await env.ORDERS.put(order.id, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 })
      return json(order, 201)
    }
    if (!id) return json({ error: 'id required' }, 400)
    const raw = await env.ORDERS.get(id); if (!raw) return json({ error: 'not found' }, 404)
    const order = JSON.parse(raw)

    if (req.method === 'GET') return json(order)
    if (req.method === 'POST' && sub === 'location') {
      const { lat, lng } = await req.json()
      order.rider = { lat, lng, at: Date.now() }; if (order.status !== 'entregado') order.status = 'camino'
      await env.ORDERS.put(id, JSON.stringify(order)); return json(order)
    }
    if (req.method === 'PATCH') {
      const patch = await req.json(); Object.assign(order, patch)
      if (patch.paid === true && order.status === 'pendiente_pago') order.status = 'recibido'
      await env.ORDERS.put(id, JSON.stringify(order)); return json(order)
    }
    return json({ error: 'method' }, 405)
  },
}
