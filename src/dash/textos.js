// Todas las palabras del tablero. Sin jerga: nada de "ticket", "mix", "cohorte",
// "índice" ni "tasa de conversión". Una sola definición de cada etiqueta.
import { money } from './format.js'

export const cuenta = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

export const CANAL = { llamada: 'Por teléfono', web: 'Por la página', whatsapp: 'Por WhatsApp' }
export const MODALIDAD = { domicilio: 'A domicilio', retiro: 'Para llevar' }
export const PAGO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }
export const RESULTADO = { pedido: 'Pidió', sin_pedido: 'No pidió', colgo: 'Colgó', no_contestada: 'No contestada' }
export const CONFIANZA = { confirmada: 'Confirmado', inferida: 'Sin confirmar' }
export const MOTIVO = {
  'fuera de cobertura': { corto: 'Fuera de cobertura', frase: 'estaban fuera de cobertura' },
  precio: { corto: 'Les pareció caro', frase: 'les pareció caro' },
  'demora estimada': { corto: 'Mucha espera', frase: 'les pareció mucha la espera' },
  'producto no disponible': { corto: 'No había el plato', frase: 'no teníamos el plato' },
  'solo consultaba': { corto: 'Solo preguntaba', frase: 'solo estaban preguntando' },
}

// Estado del pedido en palabras que entiende cualquiera del local.
export const ESTADO = {
  pendiente_pago: ['Listo para pagar', 'wait'],
  recibido: ['Pedido recibido', 'wait'],
  horno: ['En el horno', 'wait'],
  camino: ['En camino', 'wait'],
  entregado: ['Entregado', 'ok'],
  cancelado: ['Cancelado', 'bad'],
}
export const ESTADO_RETIRO = { ...ESTADO, camino: ['Listo para retirar', 'wait'] }

export function estadoTexto(estado, modalidad) {
  const t = (modalidad === 'retiro' ? ESTADO_RETIRO : ESTADO)[estado]
  return t ? t[0] : estado
}

// Títulos de las listas que se abren desde una cifra.
export function tituloLista({ n, estado, modalidad, canal, pago, categoria, local, periodo, dia, orden, resultado, motivo, cedula }) {
  const pedidos = cuenta(n, 'pedido', 'pedidos')
  let que = pedidos
  if (estado === 'en_curso') que = `${pedidos} en marcha ahora`
  else if (estado === 'entregado' && orden === 'minutos') que = `${cuenta(n, 'entrega terminada', 'entregas terminadas')}, de la más lenta a la más rápida`
  else if (estado) que = `${pedidos} ${estadoTexto(estado, modalidad).toLowerCase()}`
  else if (modalidad) que = `${pedidos} ${MODALIDAD[modalidad].toLowerCase()}`
  else if (canal) que = `${pedidos} ${CANAL[canal].toLowerCase()}`
  else if (pago) que = `${pedidos} pagados con ${PAGO[pago].toLowerCase()}`
  else if (categoria) que = `${cuenta(n, 'plato', 'platos')} de ${categoria.toLowerCase()}`
  else if (resultado) que = `${cuenta(n, 'llamada', 'llamadas')} que ${RESULTADO[resultado].toLowerCase()}`
  else if (motivo) que = `${cuenta(n, 'llamada', 'llamadas')} en que ${MOTIVO[motivo]?.frase || motivo}`
  else if (cedula) que = `${cuenta(n, 'llamada', 'llamadas')} con cédula`
  const cuando = periodo === 'dia' && dia ? diaLargo(dia) : PERIODO_TXT[periodo] || 'hoy'
  return `${cap(que)} · ${cuando}${local ? ` · ${local}` : ''}`
}

const PERIODO_TXT = { hoy: 'hoy', ayer: 'ayer', '7d': 'últimos 7 días', mes: 'este mes' }
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function diaLargo(dia) {
  const d = new Date(dia + 'T12:00:00-05:00')
  return new Intl.DateTimeFormat('es-EC', { timeZone: 'America/Guayaquil', weekday: 'long', day: 'numeric' }).format(d)
}
export function diaSemana(dia) {
  const d = new Date(dia + 'T12:00:00-05:00')
  return new Intl.DateTimeFormat('es-EC', { timeZone: 'America/Guayaquil', weekday: 'long' }).format(d)
}

// El titular de Hoy: una frase, sin modelo de lenguaje, con las cifras enlazadas.
export function titularHoy({ n, hora, base, baseN, dia }) {
  const semana = `el ${diaSemana(dia)} pasado a esta hora`
  if (n === 0) return { tipo: 'vacio', texto: 'Todavía no entra ningún pedido hoy.' }
  const cabeza = `${cuenta(n, 'pedido', 'pedidos')} hasta las ${hora}`
  if (baseN < 5) return { tipo: 'sin_base', cabeza, cola: `${cap(semana)} iban ${baseN} pedidos: todavía no hay con qué comparar.` }
  const d = base.hoy - base.base
  if (Math.abs(d) < 5) return { tipo: 'igual', cabeza, cola: `casi igual que ${semana}` }
  return { tipo: d > 0 ? 'up' : 'down', cabeza, delta: money(Math.abs(d)), cola: `${d > 0 ? 'más' : 'menos'} que ${semana}` }
}

export const VACIO = {
  pedidos: (periodo) => `Ningún pedido ${PERIODO_FRASE_[periodo] || 'hoy'}.`,
  pedidosLocal: 'Con el local elegido no hay nada; puede que el pedido esté en otro.',
  llamadas: 'Ninguna llamada hoy.',
  clientes: 'Todavía no hay clientes registrados.',
}
const PERIODO_FRASE_ = { hoy: 'hoy', ayer: 'ayer', '7d': 'en los últimos 7 días', mes: 'este mes', dia: 'ese día' }
