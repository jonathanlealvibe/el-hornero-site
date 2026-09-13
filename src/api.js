// Thin client for the El Hornero order/tracking backend.
// Runtime config: window.EH_API (set in index.html) or VITE_API_BASE. Empty = demo mode (localStorage + simulated rider).
import LZString from 'lz-string'

const BASE = (typeof window !== 'undefined' && window.EH_API) || import.meta.env.VITE_API_BASE || ''
export const DEMO = !BASE

const LS = 'elhornero.orders'
const read = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} } }
const write = (o) => { try { localStorage.setItem(LS, JSON.stringify(o)) } catch { /* ignore */ } }
// Order codes get read aloud by Camila and typed by customers, so the alphabet drops
// everything that sounds or looks the same: no 0/O, no 1/I, no vowels (avoids real words).
const CODE_ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXZ'
const uid = () => {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return 'EH' + s
}

async function http(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}`)
  return r.json()
}

// Demo mode: the rider leaves from the La Carolina local and rides in a straight line to the customer's address.
export const LOCAL = { lat: -0.1807, lng: -78.4869, nombre: 'El Hornero La Carolina' }
const DEFAULT_DEST = { lat: -0.1940, lng: -78.4802 }
async function geocodeOne(q) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ec&q=${encodeURIComponent(q)}`, { headers: { 'accept-language': 'es' } })
    const j = await r.json(); if (!j[0]) return null
    return { lat: +j[0].lat, lng: +j[0].lon }
  } catch { return null }
}

// Ecuadorian addresses are often written as intersections ("X y Z"), which geocoders miss.
// Try the full string, then each street alone, then the sector, then the city.
async function geocode(addr) {
  if (!addr?.calle) return null
  const sector = (addr.sector || '').trim()
  const city = sector.split(',').pop().trim() || 'Quito'
  const calle = addr.calle.trim()
  const parts = calle.split(/\s+y\s+/i).map((x) => x.trim()).filter(Boolean)
  const tries = [
    sector ? `${calle}, ${sector}` : `${calle}, ${city}`,
    `${calle}, ${city}`,
    ...parts.map((p) => `${p}, ${city}`),
    sector ? `${sector}` : null,
  ].filter(Boolean)
  for (const q of tries) {
    const hit = await geocodeOne(q)
    if (hit) return hit
  }
  return null
}

export async function createOrder(order) {
  if (!DEMO) return http('POST', '/orders', order)
  const id = uid(); const all = read()
  const dest = (order.modalidad === 'A domicilio' && await geocode(order.direccion)) || (order.modalidad === 'A domicilio' ? DEFAULT_DEST : LOCAL)
  all[id] = { id, ...order, status: 'recibido', createdAt: Date.now(), rider: { ...LOCAL, at: Date.now() }, dest, geocoded: dest !== DEFAULT_DEST && dest !== LOCAL }
  write(all); return all[id]
}

export async function getOrder(id, packed) {
  if (!DEMO) return http('GET', `/orders/${id}`)
  const all = read()
  if (!all[id] && packed) {
    const fromLink = unpackOrder(packed)
    if (fromLink && fromLink.id) {
      // A demo link can be opened days after it was made: restart the clock so the
      // customer always sees the order progress from the beginning.
      const age = Date.now() - (fromLink.createdAt || 0)
      if (!fromLink.createdAt || age > 2 * 60 * 60 * 1000) fromLink.createdAt = Date.now()
      all[id] = fromLink; write(all)
    }
  }
  const o = all[id]; if (!o) return null
  // simulate progress: recibido -> horno (1 min) -> camino (2 min) -> entregado (6 min)
  const t = ((Date.now() - o.createdAt) / 60000) * (o.speed || 1)
  const status = o.paid === false && o.payMethod === 'tarjeta' ? 'pendiente_pago' : t < 1 ? 'recibido' : t < 2 ? 'horno' : t < 6 ? 'camino' : 'entregado'
  let rider = o.rider
  if (status === 'camino') {
    const f = Math.min(1, (t - 2) / 4)
    // slight curve so it does not look like a ruler line
    const bend = Math.sin(f * Math.PI) * 0.004
    rider = { lat: LOCAL.lat + (o.dest.lat - LOCAL.lat) * f + bend, lng: LOCAL.lng + (o.dest.lng - LOCAL.lng) * f - bend, at: Date.now() }
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

// ---- Portable orders: pack the order into the link so it opens on ANY phone ----
// v1 is a positional array run through lz-string: ~40% shorter than the old base64 JSON,
// and it no longer carries the customer's full cedula (only the last four digits, masked).
// The old format is still decoded so links already sent by WhatsApp keep working.
const b64d = (str) => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))))

const MODES = ['A domicilio', 'Para llevar']
const PAYS = ['efectivo', 'transferencia', 'tarjeta']
const FACTS = ['consumidor_final', 'con_datos']
const idx = (list, v, dflt = 0) => { const i = list.indexOf(v); return i < 0 ? dflt : i }
const r5 = (n) => Math.round(n * 1e5) / 1e5
const r2 = (n) => Math.round((n || 0) * 100) / 100
const maskCedula = (c) => (c ? '••••' + String(c).slice(-4) : null)

export function packOrder(o) {
  try {
    const d = o.direccion
    const ds = o.dest
    const a = [
      1,
      o.id,
      o.cliente?.nombre || '',
      o.cliente?.telefono || '',
      o.cliente?.cedula ? String(o.cliente.cedula).slice(-4) : '',
      idx(MODES, o.modalidad),
      d ? [d.calle || '', d.referencia || '', d.sector || ''] : 0,
      (o.items || []).map((x) => [x.nombre, x.cantidad, x.precio]),
      r2(o.subtotal), r2(o.envio), r2(o.iva), r2(o.total),
      idx(PAYS, o.payMethod),
      o.cambioPara || 0,
      idx(FACTS, o.factura),
      Math.round((o.createdAt || Date.now()) / 1000),
      ds ? [r5(ds.lat), r5(ds.lng)] : 0,
      o.paid === true ? 1 : o.paid === false ? 0 : 2,
      o.speed || 1,
    ]
    return LZString.compressToEncodedURIComponent(JSON.stringify(a))
  } catch { return '' }
}

function unpackV1(a) {
  const [, id, n, t, c4, m, d, it, s, e, v, g, p, cp, f, ca, ds, pd, sp] = a
  return {
    id,
    cliente: { nombre: n, telefono: t, cedula: c4 ? '••••' + c4 : null },
    modalidad: MODES[m] || MODES[0],
    direccion: d ? { calle: d[0], referencia: d[1], sector: d[2] } : null,
    items: (it || []).map(([nombre, cantidad, precio]) => ({ nombre, cantidad, precio })),
    subtotal: s, envio: e, iva: v, total: g,
    payMethod: PAYS[p] || PAYS[0],
    cambioPara: cp || null,
    factura: FACTS[f] || FACTS[0],
    createdAt: ca * 1000,
    dest: ds ? { lat: ds[0], lng: ds[1] } : null,
    paid: pd === 1 ? true : pd === 0 ? false : null,
    speed: sp || 1,
    fromLink: true,
  }
}

// Links made before 2026-09-12: base64url of a JSON object with short keys.
function unpackLegacy(packed) {
  const s = JSON.parse(b64d(packed))
  if (!s || !s.i) return null
  return {
    id: s.i, cliente: { nombre: s.n, telefono: s.t, cedula: maskCedula(s.c) }, modalidad: s.m, direccion: s.d,
    items: (s.it || []).map(([nombre, cantidad, precio]) => ({ nombre, cantidad, precio })),
    subtotal: s.s, envio: s.e, iva: s.v, total: s.g, payMethod: s.p, cambioPara: s.cp, factura: s.f,
    createdAt: s.ca, dest: s.ds, paid: !!s.pd, speed: s.sp || 1, fromLink: true,
  }
}

export function unpackOrder(packed) {
  if (!packed) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(packed)
    if (json) {
      const a = JSON.parse(json)
      if (Array.isArray(a) && a[0] === 1 && a[1]) return unpackV1(a)
    }
  } catch { /* not v1, fall through */ }
  try { return unpackLegacy(packed) } catch { return null }
}

// Absolute links you can paste into WhatsApp — they carry the order with them.
// Clean form (/s/ID.payload) works via public/404.html and is what WhatsApp templates need.
// Shared links. The order rides in the URL FRAGMENT, not the path:
//   https://…/seguir/#EH4K2M.<payload>
// Two reasons. The path is a real folder (public/seguir/index.html) so GitHub Pages answers 200
// with our og: tags instead of a 404 with none — that is what lets WhatsApp draw a preview card.
// And a fragment is never sent to the server, so the customer's data never reaches a log or
// Meta's preview crawler. Short branded links (…/seguir/EH4K2M) need the Worker deployed.
const clean = (folder, o) => `${location.origin}/${folder}/#${o.id}.${packOrder(o)}`
export function trackUrl(o) { return clean('seguir', o) }
export function payUrl(o) { return clean('pagar', o) }
export function driverUrl(o) { return clean('entrega', o) }

export const STATUS_LABEL_PICKUP = { pendiente_pago: 'Listo para pagar', recibido: 'Pedido recibido', horno: 'En el horno', camino: 'Listo para retirar', entregado: 'Entregado' }
export const STATUS_LABEL = {
  pendiente_pago: 'Listo para pagar',
  recibido: 'Pedido recibido',
  horno: 'En el horno',
  camino: 'En camino',
  entregado: 'Entregado',
}

export const LOCAL_TEL = '2002000011'

// The WhatsApp copy lives here, once. Paste the same text into the GoHighLevel workflow and
// the Meta templates so the customer reads one voice. Rules: usted, real accents, who is
// writing BEFORE the link, amount and order code before the link, and the link alone on the
// last line so WhatsApp does not glue it to a word.
const m2 = (n) => '$' + Number(n || 0).toFixed(2)
const nombre = (o) => (o.cliente?.nombre ? ' ' + o.cliente.nombre : '')
// WhatsApp entiende *negrita*. El link va SIEMPRE solo en la última línea: pegado a
// una frase, WhatsApp no dibuja la tarjeta de vista previa.
const lista = (o) => (o.items || [])
  .map((i) => `• ${i.cantidad > 1 ? i.cantidad + ' × ' : ''}${i.nombre}`)
  .join('\n')

export const WA = {
  pago: (o, url) =>
    `🍕 *El Hornero*\n\n` +
    `Hola${nombre(o)}, le escribe Camila.\n` +
    `Su pedido *${o.id}* está reservado.\n\n` +
    `${lista(o)}\n\n` +
    `*Total: ${m2(o.total)}*  (IVA incluido)\n\n` +
    `Toque aquí para pagar con tarjeta y lo mandamos al horno 👇\n` +
    `${url}`,
  seguimiento: (o, url) =>
    `🛵 *El Hornero*\n\n` +
    `¡Su pedido ya salió${nombre(o)}!\n` +
    `*${o.id}* va en camino` +
    (o.direccion?.sector ? ` a ${o.direccion.sector}` : '') + `.\n\n` +
    `Siga a su motorizado en el mapa en vivo 👇\n` +
    `${url}`,
}

// Demo helpers (demo mode only)
const STAGE_MIN = { recibido: 0, horno: 1, camino: 2, entregado: 6 }
export const STAGES = ['recibido', 'horno', 'camino', 'entregado']

// A card order sits at 'pendiente_pago' until it is paid, and that state ignores the clock —
// so every demo control has to settle the payment first or nothing moves.
const settle = (o) => { if (o.payMethod === 'tarjeta') o.paid = true }
const elapsedMin = (o) => ((Date.now() - o.createdAt) / 60000) * (o.speed || 1)

export async function demoJump(id, stage) {
  const all = read(); const o = all[id]; if (!o) return null
  settle(o)
  const speed = o.speed || 1
  o.createdAt = Date.now() - (STAGE_MIN[stage] * 60000) / speed
  if (stage === 'camino') o.createdAt -= (0.2 * 60000) / speed
  write(all); return o
}

// One stage forward from wherever it is now.
export async function demoStep(id) {
  const all = read(); const o = all[id]; if (!o) return null
  if (o.payMethod === 'tarjeta' && o.paid !== true) { settle(o); write(all); return o }
  const t = elapsedMin(o)
  const now = t < 1 ? 0 : t < 2 ? 1 : t < 6 ? 2 : 3
  return demoJump(id, STAGES[Math.min(3, now + 1)])
}

// Run the remaining 6 minutes in 30 seconds WITHOUT teleporting the rider back to the shop:
// keep the elapsed time and only change the rate.
export async function demoFast(id) {
  const all = read(); const o = all[id]; if (!o) return null
  settle(o)
  const t = elapsedMin(o)
  o.speed = 12
  o.createdAt = Date.now() - (t * 60000) / 12
  write(all); return o
}

export async function demoReset(id) {
  const all = read(); const o = all[id]; if (!o) return null
  o.speed = 1
  o.createdAt = Date.now()
  if (o.payMethod === 'tarjeta') o.paid = false
  write(all); return o
}
