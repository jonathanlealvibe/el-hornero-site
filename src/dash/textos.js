// Todas las palabras del tablero, en español y en inglés. Sin jerga: nada de
// "ticket", "mix", "cohorte", "índice" ni "tasa de conversión".
import { money } from './format.js'
import { T, getLang, locale } from './i18n.js'

export const cuenta = (n, uno, varios, one, many) => `${n} ${n === 1 ? T(uno, one) : T(varios, many)}`

export const CANAL = {
  get llamada() { return T('Por teléfono', 'By phone') }, get web() { return T('Por la página', 'From the website') }, get whatsapp() { return T('Por WhatsApp', 'By WhatsApp') },
}
export const MODALIDAD = { get domicilio() { return T('A domicilio', 'Delivery') }, get retiro() { return T('Para llevar', 'Pickup') } }
export const PAGO = { get efectivo() { return T('Efectivo', 'Cash') }, get tarjeta() { return T('Tarjeta', 'Card') }, get transferencia() { return T('Transferencia', 'Bank transfer') } }
export const RESULTADO = {
  get pedido() { return T('Pidió', 'Ordered') }, get sin_pedido() { return T('No pidió', 'Did not order') }, get colgo() { return T('Colgó', 'Hung up') }, get no_contestada() { return T('No contestada', 'Unanswered') },
}
export const CONFIANZA = { get confirmada() { return T('Confirmado', 'Confirmed') }, get inferida() { return T('Sin confirmar', 'Unconfirmed') } }
const MOT = {
  'fuera de cobertura': ['Fuera de cobertura', 'estaban fuera de cobertura', 'Out of coverage', 'they were out of the delivery area'],
  precio: ['Les pareció caro', 'les pareció caro', 'Too expensive', 'they found it expensive'],
  'demora estimada': ['Mucha espera', 'les pareció mucha la espera', 'Wait too long', 'the wait seemed too long'],
  'producto no disponible': ['No había el plato', 'no teníamos el plato', 'Item unavailable', 'we did not have the item'],
  'solo consultaba': ['Solo preguntaba', 'solo estaban preguntando', 'Just asking', 'they were only asking'],
}
export const MOTIVO = new Proxy({}, { get: (_, k) => { const m = MOT[k]; return m ? { corto: T(m[0], m[2]), frase: T(m[1], m[3]) } : undefined } })

// Estado del pedido en palabras que entiende cualquiera del local.
const EST = {
  pendiente_pago: ['Listo para pagar', 'Ready to pay', 'wait'],
  recibido: ['Pedido recibido', 'Order received', 'wait'],
  horno: ['En el horno', 'In the oven', 'wait'],
  camino: ['En camino', 'On the way', 'wait'],
  entregado: ['Entregado', 'Delivered', 'ok'],
  cancelado: ['Cancelado', 'Cancelled', 'bad'],
}
export const ESTADO = new Proxy({}, {
  get: (_, k) => { const e = EST[k]; return e ? [T(e[0], e[1]), e[2]] : undefined },
  ownKeys: () => Object.keys(EST), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
})
export function estadoTexto(estado, modalidad) {
  if (estado === 'camino' && modalidad === 'retiro') return T('Listo para retirar', 'Ready for pickup')
  const e = EST[estado]
  return e ? T(e[0], e[1]) : estado
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function diaLargo(dia) {
  const d = new Date(dia + 'T12:00:00-05:00')
  return new Intl.DateTimeFormat(locale(), { timeZone: 'America/Guayaquil', weekday: 'long', day: 'numeric' }).format(d)
}
export function diaSemana(dia) {
  const d = new Date(dia + 'T12:00:00-05:00')
  return new Intl.DateTimeFormat(locale(), { timeZone: 'America/Guayaquil', weekday: 'long' }).format(d)
}

const PERIODO_TXT = () => ({ hoy: T('hoy', 'today'), ayer: T('ayer', 'yesterday'), '7d': T('últimos 7 días', 'last 7 days'), mes: T('este mes', 'this month') })

// Títulos de las listas que se abren desde una cifra.
export function tituloLista({ n, estado, modalidad, canal, pago, categoria, local, periodo, dia, orden, resultado, motivo, cedula }) {
  const pedidos = cuenta(n, 'pedido', 'pedidos', 'order', 'orders')
  const llamadas = cuenta(n, 'llamada', 'llamadas', 'call', 'calls')
  let que = pedidos
  if (estado === 'en_curso') que = T(`${pedidos} en marcha ahora`, `${pedidos} in progress now`)
  else if (estado === 'entregado' && orden === 'minutos') que = T(`${cuenta(n, 'entrega terminada', 'entregas terminadas')}, de la más lenta a la más rápida`, `${cuenta(n, '', '', 'finished delivery', 'finished deliveries')}, slowest to fastest`)
  else if (estado) que = `${pedidos} ${estadoTexto(estado, modalidad).toLowerCase()}`
  else if (modalidad) que = T(`${pedidos} ${MODALIDAD[modalidad].toLowerCase()}`, `${MODALIDAD[modalidad].toLowerCase()} ${pedidos}`)
  else if (canal) que = `${pedidos} ${CANAL[canal].toLowerCase()}`
  else if (pago) que = T(`${pedidos} pagados con ${PAGO[pago].toLowerCase()}`, `${pedidos} paid by ${PAGO[pago].toLowerCase()}`)
  else if (categoria) que = T(`${cuenta(n, 'plato', 'platos')} de ${categoria.toLowerCase()}`, `${cuenta(n, '', '', 'item', 'items')} of ${categoria.toLowerCase()}`)
  else if (resultado) que = T(`${llamadas} que ${RESULTADO[resultado].toLowerCase()}`, `${llamadas} that ${RESULTADO[resultado].toLowerCase()}`)
  else if (motivo) que = T(`${llamadas} en que ${MOTIVO[motivo]?.frase || motivo}`, `${llamadas} where ${MOTIVO[motivo]?.frase || motivo}`)
  else if (cedula) que = T(`${llamadas} con cédula`, `${llamadas} with ID number`)
  const cuando = periodo === 'dia' && dia ? diaLargo(dia) : PERIODO_TXT()[periodo] || T('hoy', 'today')
  return `${cap(que)} · ${cuando}${local ? ` · ${local}` : ''}`
}

// El titular de Hoy: una frase, sin modelo de lenguaje, con las cifras enlazadas.
export function titularHoy({ n, hora, base, baseN, dia }) {
  const semana = T(`el ${diaSemana(dia)} pasado a esta hora`, `last ${diaSemana(dia)} at this time`)
  if (n === 0) return { tipo: 'vacio', texto: T('Todavía no entra ningún pedido hoy.', 'No orders have come in yet today.') }
  const cabeza = T(`${cuenta(n, 'pedido', 'pedidos')} hasta las ${hora}`, `${cuenta(n, '', '', 'order', 'orders')} by ${hora}`)
  if (baseN < 5) return { tipo: 'sin_base', cabeza, cola: T(`${cap(semana)} iban ${baseN} pedidos: todavía no hay con qué comparar.`, `${cap(semana)} there were ${baseN} orders: nothing to compare against yet.`) }
  const d = base.hoy - base.base
  if (Math.abs(d) < 5) return { tipo: 'igual', cabeza, cola: T(`casi igual que ${semana}`, `about the same as ${semana}`) }
  return { tipo: d > 0 ? 'up' : 'down', cabeza, delta: money(Math.abs(d)), cola: T(`${d > 0 ? 'más' : 'menos'} que ${semana}`, `${d > 0 ? 'more' : 'less'} than ${semana}`) }
}

export const esIngles = () => getLang() === 'en'
