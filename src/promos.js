// Promociones vigentes: la gerencia las edita en el Centro de mando (pestaña Promociones),
// el sitio las muestra y Camila las consulta al empezar cada llamada. Viajan por un canal
// de mensajes en la nube (el último mensaje publicado es la lista vigente). Sin servidor propio.
const NTFY = 'https://ntfy.sh'
export const PROMOS_TOPIC = 'elhornero-promos-k7d2m9'
export const PROMOS_URL = `${NTFY}/${PROMOS_TOPIC}/raw?poll=1&since=latest`
const LS_KEY = 'elhornero.promos.v1'

export const PROMOS_SEMILLA = [
  { id: 'p12', nombre: '12 pedazos por $6.99', detalle: 'Pizza de 12 pedazos de un ingrediente', precio: 6.99, condicion: 'Un ingrediente. Todos los locales.', hasta: '', activa: true },
  { id: 'p16', nombre: '16 pedazos por $7.99', detalle: 'Pizza de 16 pedazos de un ingrediente', precio: 7.99, condicion: 'Un ingrediente. Todos los locales.', hasta: '', activa: true },
  { id: 'p24', nombre: '24 pedazos por $10.99', detalle: 'Pizza de 24 pedazos de un ingrediente', precio: 10.99, condicion: 'Un ingrediente. Todos los locales.', hasta: '', activa: true },
  { id: 'combo', nombre: 'Combo Perfecto $20.50', detalle: 'Dos pizzas, papas y bebida familiar', precio: 20.5, condicion: 'Todos los locales.', hasta: '', activa: true },
  { id: 'kids', nombre: 'Menú infantil $5.99', detalle: 'Con juguete incluido', precio: 5.99, condicion: 'Para niños. Todos los locales.', hasta: '', activa: true },
]

export const uidPromo = () => 'pr' + Math.random().toString(36).slice(2, 8)

const money = (n) => '$' + Number(n || 0).toFixed(2)
// Precio en palabras cortas para la voz: 6.99 -> "seis noventa y nueve" lo hace Camila; aquí va el número.
export function textoParaCamila(promos, fecha = new Date()) {
  const activas = (promos || []).filter((p) => p.activa && vigente(p, fecha))
  if (!activas.length) return 'Hoy no hay promociones vigentes. No inventes ninguna.'
  const lineas = activas.map((p) => `${p.nombre}: ${p.detalle}${p.precio ? ` (${money(p.precio)})` : ''}${p.condicion ? `. ${p.condicion}` : ''}${p.hasta ? ` Vigente hasta ${p.hasta}.` : ''}`)
  return `PROMOCIONES VIGENTES (actualizadas ${fecha.toLocaleDateString('es-EC')}): ` + lineas.join(' | ') + '. Solo estas; ninguna otra promoción existe.'
}
export const vigente = (p, fecha = new Date()) => !p.hasta || new Date(p.hasta + 'T23:59:59') >= fecha

export function cargarLocal() {
  try { const v = JSON.parse(localStorage.getItem(LS_KEY)); if (v && Array.isArray(v.promos)) return v } catch { /* nada */ }
  return { v: 1, actualizado: null, promos: PROMOS_SEMILLA }
}
export function guardarLocal(doc) { try { localStorage.setItem(LS_KEY, JSON.stringify(doc)) } catch { /* lleno */ } }

// Trae la última lista publicada; si no hay (o falla), devuelve null y quien llama usa lo local.
export async function traerPromos() {
  try {
    const r = await fetch(PROMOS_URL, { cache: 'no-store' })
    if (!r.ok) return null
    const txt = await r.text()
    if (!txt.trim()) return null
    const doc = JSON.parse(txt)
    return doc && Array.isArray(doc.promos) ? doc : null
  } catch { return null }
}

export async function publicarPromos(promos) {
  const doc = { v: 1, actualizado: new Date().toISOString(), promos, texto: textoParaCamila(promos) }
  const r = await fetch(`${NTFY}/${PROMOS_TOPIC}`, { method: 'POST', body: JSON.stringify(doc), headers: { 'Content-Type': 'application/json', Title: 'promociones' } })
  if (!r.ok) throw new Error('No se pudo publicar (' + r.status + ')')
  guardarLocal(doc)
  return doc
}
