// Thin client for the El Hornero order/tracking backend.
// Runtime config: window.EH_API (set in index.html) or VITE_API_BASE. Empty = demo mode (localStorage + simulated rider).
const BASE = (typeof window !== 'undefined' && window.EH_API) || import.meta.env.VITE_API_BASE || ''
export const DEMO = !BASE

const LS = 'elhornero.orders'
const read = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} } }
const write = (o) => { try { localStorage.setItem(LS, JSON.stringify(o)) } catch { /* ignore */ } }
const uid = () => 'EH' + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase()

async function http(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}`)
  return r.json()
}

// Quito demo route (Local La Carolina -> customer), used only in demo mode.
const DEMO_ROUTE = [[-0.1807, -78.4869], [-0.1830, -78.4860], [-0.1858, -78.4842], [-0.1885, -78.4831], [-0.1912, -78.4818], [-0.1940, -78.4802]]

export async function createOrder(order) {
  if (!DEMO) return http('POST', '/orders', order)
  const id = uid(); const all = read()
  all[id] = { id, ...order, status: 'recibido', createdAt: Date.now(), rider: { lat: DEMO_ROUTE[0][0], lng: DEMO_ROUTE[0][1], at: Date.now() }, dest: { lat: DEMO_ROUTE[DEMO_ROUTE.length - 1][0], lng: DEMO_ROUTE[DEMO_ROUTE.length - 1][1] } }
  write(all); return all[id]
}

export async function getOrder(id) {
  if (!DEMO) return http('GET', `/orders/${id}`)
  const all = read(); const o = all[id]; if (!o) return null
  // simulate progress: recibido -> horno (1 min) -> camino (2 min) -> entregado (6 min)
  const t = ((Date.now() - o.createdAt) / 60000) * (o.speed || 1)
  const status = o.paid === false && o.payMethod === 'tarjeta' ? 'pendiente_pago' : t < 1 ? 'recibido' : t < 2 ? 'horno' : t < 6 ? 'camino' : 'entregado'
  let rider = o.rider
  if (status === 'camino') {
    const f = Math.min(1, (t - 2) / 4); const seg = f * (DEMO_ROUTE.length - 1); const i = Math.min(DEMO_ROUTE.length - 2, Math.floor(seg)); const k = seg - i
    rider = { lat: DEMO_ROUTE[i][0] + (DEMO_ROUTE[i + 1][0] - DEMO_ROUTE[i][0]) * k, lng: DEMO_ROUTE[i][1] + (DEMO_ROUTE[i + 1][1] - DEMO_ROUTE[i][1]) * k, at: Date.now() }
  } else if (status === 'entregado') rider = { ...o.dest, at: Date.now() }
  return { ...o, status, rider }
}

export async function updateOrder(id, patch) {
  if (!DEMO) return http('PATCH', `/orders/${id}`, patch)
  const all = read(); if (!all[id]) return null; all[id] = { ...all[id], ...patch }; write(all); return all[id]
}

export async function pushRiderLocation(id, lat, lng) {
  if (!DEMO) return http('POST', `/orders/${id}/location`, { lat, lng })
  return updateOrder(id, { rider: { lat, lng, at: Date.now() }, status: 'camino' })
}

export const STATUS_LABEL_PICKUP = { pendiente_pago: 'Esperando tu pago', recibido: 'Pedido recibido', horno: 'En el horno', camino: 'Listo para retirar', entregado: 'Entregado' }
export const STATUS_LABEL = {
  pendiente_pago: 'Esperando tu pago',
  recibido: 'Pedido recibido',
  horno: 'En el horno',
  camino: 'En camino',
  entregado: 'Entregado',
}

// Demo helpers (demo mode only)
const STAGE_MIN = { recibido: 0, horno: 1, camino: 2, entregado: 6 }
export async function demoJump(id, stage) {
  const all = read(); const o = all[id]; if (!o) return null
  const speed = o.speed || 1
  o.createdAt = Date.now() - (STAGE_MIN[stage] * 60000) / speed
  if (stage === 'camino') o.createdAt -= (0.2 * 60000) / speed
  write(all); return o
}
export async function demoFast(id) {
  const all = read(); const o = all[id]; if (!o) return null
  o.speed = 12; o.createdAt = Date.now(); write(all); return o   // 6 min -> 30 s
}
