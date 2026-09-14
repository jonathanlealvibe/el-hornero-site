// Modelo de datos del tablero. La unidad es la PERSONA, no el teléfono.
//
//   persona            1 ── n  direccion
//   persona            n ── n  telefono      (tabla puente: el fijo de la casa
//                                             es de dos personas, y una persona
//                                             tiene celular, fijo y el de la esposa)
//   persona            1 ── n  pedido ── n  pedido_item
//   local              1 ── n  pedido
//
// Hoy vive en localStorage con la misma forma que tendrá en Postgres, para que
// encender el backend sea cambiar de dónde salen los datos y nada más.
// El store es observable: cada escritura avisa, y las pantallas se refrescan
// solas (useStore.js).

import { LOCALES } from '../locales.js'
import { dayKey } from './format.js'
import { getDatos } from './i18n.js'

// Dos cajones separados: la demostración (inventada) y lo vivo (la tienda).
const LS_DE = (m) => (m === 'vivo' ? 'elhornero.panel.vivo.v1' : 'elhornero.panel.v11')
let modo = getDatos()
export const getModo = () => modo
export function setModo(m) { modo = m === 'vivo' ? 'vivo' : 'demo'; db = null; emitir() }
const LS = () => LS_DE(modo)

const vacio = () => ({
  personas: {}, telefonos: {}, vinculos: [], direcciones: {},
  pedidos: {}, items: [], conversaciones: {}, sembrado: null,
})

let db = null
const cargar = () => {
  if (db) return db
  try { db = JSON.parse(localStorage.getItem(LS())) || vacio() } catch { db = vacio() }
  return db
}

// ---------------------------------------------------------------- observable
let version = 0
const oyentes = new Set()
export const getVersion = () => version
export const suscribir = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn) }
export const emitir = () => { version++; for (const fn of oyentes) fn(version) }
export const refrescar = () => emitir()          // el reloj de 30 s llama aquí
let silencio = false                              // la siembra escribe mil veces: un solo aviso al final
const guardar = () => { try { localStorage.setItem(LS(), JSON.stringify(db)) } catch { /* lleno */ } if (!silencio) emitir() }
// Lo que se mueve a mano en vivo se avisa a la tienda (vivo.js lo conecta).
let alMoverEstado = null
export const conectarTienda = (fn) => { alMoverEstado = fn }
export const reset = () => { db = vacio(); guardar() }
export const estado = () => cargar()
export function enBloque(fn) { silencio = true; try { fn() } finally { silencio = false; guardar() } }

// ---------------------------------------------------------------- identidad

// Cédula ecuatoriana: 10 dígitos, provincia 01-24 (o 30), tercer dígito < 6
// para persona natural, y dígito verificador por módulo 10.
export function validarCedula(raw) {
  const c = String(raw || '').replace(/\D/g, '')
  if (c.length !== 10) return false
  const prov = +c.slice(0, 2)
  if (!((prov >= 1 && prov <= 24) || prov === 30)) return false
  if (+c[2] > 5) return false
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let v = +c[i] * (i % 2 === 0 ? 2 : 1)
    if (v > 9) v -= 9
    suma += v
  }
  return (10 - (suma % 10)) % 10 === +c[9]
}

// Un RUC de persona natural (tercer dígito 0-5, termina en 001) es la MISMA
// persona: su cédula son los primeros 10 dígitos. Un RUC de sociedad (tercer
// dígito 6 o 9) no es una persona y nunca toca persona.cedula.
export function analizarDocumento(raw) {
  const d = String(raw || '').replace(/\D/g, '')
  if (d.length === 10) return { tipo: validarCedula(d) ? 'cedula' : 'invalido', cedula: d, ruc: null }
  if (d.length === 13 && d.endsWith('001')) {
    const base = d.slice(0, 10)
    const tercero = +d[2]
    if (tercero <= 5 && validarCedula(base)) return { tipo: 'ruc_natural', cedula: base, ruc: d }
    return { tipo: 'ruc_sociedad', cedula: null, ruc: d }
  }
  return { tipo: 'invalido', cedula: null, ruc: null }
}

export function normalizarTelefono(raw) {
  const d = String(raw || '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('593')) return '+' + d
  if (d.startsWith('0')) return '+593' + d.slice(1)
  if (d.length === 9) return '+593' + d
  return '+' + d
}
export const telefonoBonito = (e164) => {
  const d = String(e164 || '').replace(/\D/g, '')
  if (d.startsWith('593') && d.length === 12) return `0${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
  if (d.startsWith('593') && d.length === 11) return `0${d.slice(3, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return e164
}

const ulid = (p) => p + Math.random().toString(36).slice(2, 10).toUpperCase()

// La escalera de resolución. Este es el corazón del pedido de Jon: la misma
// persona reconocida desde cualquier teléfono.
export function resolverPersona({ telefono, cedula, nombre }) {
  const d = cargar()
  const tel = normalizarTelefono(telefono)

  // 1. Por teléfono. Es el camino del 90% de las llamadas y no pide nada.
  if (tel) {
    const ids = d.vinculos.filter((v) => v.telefono === tel).map((v) => v.persona)
    const vivos = ids.map((id) => d.personas[id]).filter((p) => p && p.estado === 'activa')
    if (vivos.length === 1) return { persona: vivos[0], via: 'telefono', ambiguo: false }
    if (vivos.length > 1) return { persona: null, via: 'telefono', ambiguo: true, candidatos: vivos }
  }

  // 2. Por cédula: el teléfono es nuevo pero la persona no.
  if (cedula) {
    const doc = analizarDocumento(cedula)
    if (doc.cedula) {
      const hit = Object.values(d.personas).find((p) => p.cedula === doc.cedula && p.estado === 'activa')
      if (hit) {
        // Nombre distinto no es una corrección: es otra persona en ese teléfono.
        const mismo = !nombre || !hit.nombre ||
          norm(hit.nombre).split(' ')[0] === norm(nombre).split(' ')[0]
        if (!mismo) return { persona: null, via: 'cedula', conflicto: true, candidatos: [hit] }
        if (tel) vincularTelefono(hit.persona_id, tel, 'confirmada')
        return { persona: hit, via: 'cedula', ambiguo: false }
      }
    }
  }

  return { persona: null, via: 'nuevo', ambiguo: false }
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function crearPersona({ nombre, apellido, cedula, telefono, correo }) {
  const d = cargar()
  const doc = analizarDocumento(cedula)
  const p = {
    persona_id: ulid('per_'),
    nombre: nombre || '', apellido: apellido || '',
    cedula: doc.cedula || null,
    cedula_estado: !cedula ? 'sin_dato' : doc.tipo === 'invalido' ? 'pendiente' : 'valida',
    ruc_facturacion: doc.ruc || null,
    correo: correo || null,
    estado: 'activa',
    creada_en: Date.now(),
  }
  d.personas[p.persona_id] = p
  const tel = normalizarTelefono(telefono)
  if (tel) vincularTelefono(p.persona_id, tel, cedula ? 'confirmada' : 'inferida')
  guardar()
  return p
}

export function vincularTelefono(persona_id, telefono, confianza = 'inferida') {
  const d = cargar()
  const tel = normalizarTelefono(telefono)
  if (!tel) return
  if (!d.telefonos[tel]) d.telefonos[tel] = { telefono_e164: tel, primera_vez_en: Date.now(), compartido: false }
  const ya = d.vinculos.find((v) => v.telefono === tel && v.persona === persona_id)
  if (ya) { ya.veces_usado++; ya.ultima_vez_en = Date.now(); if (confianza === 'confirmada') ya.confianza = 'confirmada' }
  else d.vinculos.push({ telefono: tel, persona: persona_id, confianza, veces_usado: 1, ultima_vez_en: Date.now() })
  // Un teléfono con dos personas confirmadas es un hogar: nunca se adivina.
  const n = d.vinculos.filter((v) => v.telefono === tel).length
  d.telefonos[tel].compartido = n > 1
  guardar()
}

// Quitar un teléfono de una persona. Nunca el último: sin teléfono Camila no la reconoce.
export function quitarTelefono(persona_id, telefono) {
  const d = cargar()
  const tel = normalizarTelefono(telefono)
  const mios = d.vinculos.filter((v) => v.persona === persona_id)
  if (mios.length <= 1) return { error: 'Sin teléfono, Camila no la reconocerá.' }
  d.vinculos = d.vinculos.filter((v) => !(v.persona === persona_id && v.telefono === tel))
  if (d.telefonos[tel]) d.telefonos[tel].compartido = d.vinculos.filter((v) => v.telefono === tel).length > 1
  guardar()
  return { ok: true }
}

// ¿De quién más es este número? (para avisar antes de compartirlo)
export function duenosDe(telefono, salvo) {
  const d = cargar()
  const tel = normalizarTelefono(telefono)
  return d.vinculos.filter((v) => v.telefono === tel && v.persona !== salvo).map((v) => d.personas[v.persona]).filter(Boolean)
}

export function agregarDireccion(persona_id, dir) {
  const d = cargar()
  const id = ulid('dir_')
  const hash = norm(`${dir.calle}|${dir.sector}|${dir.ciudad || 'Quito'}`).replace(/\s+/g, ' ')
  const existente = Object.values(d.direcciones).find((x) => x.persona_id === persona_id && x.hash_norm === hash && x.estado === 'activa')
  if (existente) { existente.veces_usada++; existente.ultima_vez_en = Date.now(); guardar(); return existente }
  const primera = !Object.values(d.direcciones).some((x) => x.persona_id === persona_id && x.estado === 'activa')
  const row = {
    direccion_id: id, persona_id,
    alias: dir.alias || (primera ? 'Casa' : 'Otra'),
    calle: dir.calle || '', numero: dir.numero || '', referencia: dir.referencia || '',
    sector: dir.sector || '', ciudad: dir.ciudad || 'Quito',
    lat: dir.lat ?? null, lng: dir.lng ?? null,
    local_id: dir.local_id || null,
    es_default: primera, estado: 'activa', hash_norm: hash,
    veces_usada: 1, ultima_vez_en: Date.now(), creada_en: Date.now(),
  }
  d.direcciones[id] = row
  guardar()
  return row
}

// Editar crea una fila nueva y apaga la vieja: los pedidos pasados no se reescriben.
export function editarDireccion(direccion_id, cambios) {
  const d = cargar()
  const vieja = d.direcciones[direccion_id]
  if (!vieja) return null
  const cambiaSitio = (cambios.calle != null && cambios.calle !== vieja.calle) || (cambios.sector != null && cambios.sector !== vieja.sector)
  vieja.estado = 'inactiva'
  const nueva = {
    ...vieja, ...cambios, direccion_id: ulid('dir_'), estado: 'activa', creada_en: Date.now(),
    lat: cambiaSitio ? null : vieja.lat, lng: cambiaSitio ? null : vieja.lng,
    hash_norm: norm(`${cambios.calle ?? vieja.calle}|${cambios.sector ?? vieja.sector}|${vieja.ciudad}`).replace(/\s+/g, ' '),
  }
  d.direcciones[nueva.direccion_id] = nueva
  // Los pedidos en curso siguen a la dirección nueva; los entregados no.
  for (const p of Object.values(d.pedidos)) if (p.direccion_id === direccion_id && !['entregado', 'cancelado'].includes(p.estado)) p.direccion_id = nueva.direccion_id
  guardar()
  return nueva
}

export function marcarDireccionPrincipal(persona_id, direccion_id) {
  const d = cargar()
  for (const x of Object.values(d.direcciones)) if (x.persona_id === persona_id) x.es_default = x.direccion_id === direccion_id
  guardar()
}

// Los datos de la persona. La cédula se valida y no puede ser de otra persona activa.
export function actualizarPersona(persona_id, campos) {
  const d = cargar()
  const p = d.personas[persona_id]
  if (!p) return { error: 'Ficha inexistente.' }
  if ('cedula' in campos) {
    const c = String(campos.cedula || '').replace(/\D/g, '')
    if (c && !validarCedula(c)) return { error: 'Esa cédula no cuadra. Son 10 números; revise el último.' }
    const otra = c && Object.values(d.personas).find((x) => x.cedula === c && x.estado === 'activa' && x.persona_id !== persona_id)
    if (otra) return { error: `Esa cédula ya es de ${otra.nombre} ${otra.apellido}. Si es la misma persona, hay que unir las fichas.`, otra }
    p.cedula = c || null
    p.cedula_estado = c ? 'valida' : 'sin_dato'
  }
  for (const k of ['nombre', 'apellido', 'correo']) if (k in campos) p[k] = campos[k]
  guardar()
  return { ok: true }
}

// ---------------------------------------------------------------- pedidos

export const PASOS_DOMICILIO = ['pendiente_pago', 'recibido', 'horno', 'camino', 'entregado']
export const PASOS_RETIRO = ['pendiente_pago', 'recibido', 'horno', 'camino', 'entregado']   // 'camino' = listo para retirar
export const pasosDe = (p) => {
  const base = p.modalidad === 'retiro' ? PASOS_RETIRO : PASOS_DOMICILIO
  // Un pedido que nació pagado o en efectivo no pasó por "listo para pagar".
  return p.historial && p.historial.pendiente_pago ? base : base.slice(1)
}

// Las líneas guardan el precio y la categoría COBRADOS, no los de hoy: cuando
// suban los precios en enero, diciembre no se puede recalcular solo.
export function registrarPedido(p) {
  const d = cargar()
  const id = p.pedido_id || ulid('EH')
  const creado = p.creado_en || Date.now()
  const est = p.estado || 'entregado'
  const historial = p.historial || {}
  if (!historial[est]) historial[est] = est === 'entregado' && p.minutos_entrega ? creado + p.minutos_entrega * 60000 : creado
  if (est !== 'recibido' && !historial.recibido) historial.recibido = creado
  d.pedidos[id] = {
    pedido_id: id,
    persona_id: p.persona_id,
    local_id: p.local_id,                     // NOT NULL: sin sede el pedido no sirve
    direccion_id: p.direccion_id || null,
    modalidad: p.modalidad || 'domicilio',
    canal: p.canal || 'llamada',
    estado: est,
    subtotal: p.subtotal || 0,
    envio_cobrado: p.envio_cobrado || 0,
    total_cobrado: p.total_cobrado || 0,
    forma_pago: p.forma_pago || 'efectivo',
    creado_en: creado,
    dia: dayKey(new Date(creado)),
    minutos_entrega: p.minutos_entrega ?? null,
    conversacion_id: p.conversacion_id || null,
    repartidor: p.repartidor || null,
    salio_en: p.salio_en || null,              // cuando la moto salio del local
    rider: p.rider || null,                    // {lat,lng,at,demo} ultima posicion conocida
    historial,                                 // estado → cuándo entró en él
    motivo_cancelacion: null,
  }
  for (const it of p.items || []) {
    d.items.push({
      pedido_id: id, nombre: it.nombre, categoria: it.categoria,
      tamano: it.tamano || null, cantidad: it.cantidad, precio_unitario: it.precio_unitario,
      dia: d.pedidos[id].dia, local_id: p.local_id,
    })
  }
  guardar()
  return d.pedidos[id]
}

// Cambiar de estado: solo al paso siguiente, salvo `forzar` (Deshacer).
export function cambiarEstado(pedido_id, estado, { forzar = false } = {}) {
  const d = cargar()
  const p = d.pedidos[pedido_id]
  if (!p || p.estado === 'cancelado') return false
  const pasos = pasosDe(p)
  const i = pasos.indexOf(p.estado), j = pasos.indexOf(estado)
  if (j < 0) return false
  if (!forzar && j !== i + 1 && j !== i - 1) return false
  p.estado = estado
  p.manual = true
  p.historial = { ...(p.historial || {}), [estado]: Date.now() }
  if (p.origen === 'sitio' && alMoverEstado) alMoverEstado(pedido_id, estado)
  if (estado === 'camino' && p.modalidad === 'domicilio') {
    p.salio_en = p.salio_en || Date.now()
    if (!p.repartidor) p.repartidor = 'Motorizado'
    if (!p.rider) {
      const sede = localPorId(p.local_id)
      if (sede?.lat != null) p.rider = { lat: sede.lat, lng: sede.lng, at: Date.now(), demo: true }
    }
  }
  if (estado === 'entregado') p.minutos_entrega = p.minutos_entrega ?? Math.max(1, Math.round((Date.now() - p.creado_en) / 60000))
  if (j < i) { if (estado !== 'entregado') p.minutos_entrega = null; if (j < pasos.indexOf('camino')) { p.salio_en = null; p.rider = null } }
  guardar()
  return true
}

export function anotarPedido(pedido_id, notas) {
  const d = cargar()
  const p = d.pedidos[pedido_id]
  if (!p) return false
  p.notas = notas || ''
  p.notas_en = notas ? Date.now() : null
  guardar()
  return true
}

export function cancelarPedido(pedido_id, motivo) {
  const d = cargar()
  const p = d.pedidos[pedido_id]
  if (!p) return false
  p.estado = 'cancelado'
  p.manual = true
  p.motivo_cancelacion = motivo || null
  p.historial = { ...(p.historial || {}), cancelado: Date.now() }
  if (p.origen === 'sitio' && alMoverEstado) alMoverEstado(pedido_id, 'cancelado')
  guardar()
  return true
}

export function registrarConversacion(c) {
  const d = cargar()
  const id = c.conversacion_id || ulid('CV-')
  d.conversaciones[id] = {
    conversacion_id: id,
    persona_id: c.persona_id || null,
    telefono: normalizarTelefono(c.telefono),
    local_id: c.local_id || null,
    canal: c.canal || 'llamada',
    inicio: c.inicio || Date.now(),
    duracion_s: c.duracion_s || 0,
    resultado: c.resultado || 'pedido',       // pedido | sin_pedido | colgo | no_contestada
    motivo_no_cierre: c.motivo_no_cierre || null,
    cedula_capturada: !!c.cedula_capturada,
    pedido_id: c.pedido_id || null,
    dia: dayKey(new Date(c.inicio || Date.now())),
  }
  guardar()
  return d.conversaciones[id]
}

// ---------------------------------------------------------------- consultas

export const locales = () => LOCALES
export const localPorId = (id) => LOCALES.find((l) => l.id === id) || null
export const nombreLocal = (id) => localPorId(id)?.nombre || id || ''

// Los locales que ya mandan pedidos al tablero (alguno en los últimos 14 días).
export function localesConectados() {
  const d = cargar()
  const desde = dayKey(new Date(Date.now() - 13 * 86400000))
  const ids = new Set(Object.values(d.pedidos).filter((p) => p.dia >= desde).map((p) => p.local_id))
  return LOCALES.filter((l) => ids.has(l.id))
}

const enRango = (dia, desde, hasta) => dia >= desde && dia <= hasta
const minutoDe = (ts) => { const t = new Date(ts); return t.getHours() * 60 + t.getMinutes() }
export const EN_CURSO = ['pendiente_pago', 'recibido', 'horno', 'camino']

export function pedidos({ desde, hasta, local, estado, modalidad, canal, pago, hastaMin, cancelados = false } = {}) {
  const d = cargar()
  return Object.values(d.pedidos)
    .filter((p) => (!desde || enRango(p.dia, desde, hasta || desde)))
    .filter((p) => (!local || p.local_id === local))
    .filter((p) => (cancelados || estado === 'cancelado' ? true : p.estado !== 'cancelado'))
    .filter((p) => !estado || (estado === 'en_curso' ? EN_CURSO.includes(p.estado) : p.estado === estado))
    .filter((p) => !modalidad || p.modalidad === modalidad)
    .filter((p) => !canal || p.canal === canal)
    .filter((p) => !pago || p.forma_pago === pago)
    .filter((p) => hastaMin == null || minutoDe(p.creado_en) <= hastaMin)
    .sort((a, b) => b.creado_en - a.creado_en)
}

export function conversaciones({ desde, hasta, local, resultado, motivo, cedula } = {}) {
  const d = cargar()
  return Object.values(d.conversaciones)
    .filter((c) => (!desde || enRango(c.dia, desde, hasta || desde)))
    .filter((c) => (!local || c.local_id === local))
    .filter((c) => !resultado || c.resultado === resultado)
    .filter((c) => !motivo || c.motivo_no_cierre === motivo)
    .filter((c) => !cedula || c.cedula_capturada)
    .sort((a, b) => b.inicio - a.inicio)
}

// Ítems de pedidos NO cancelados.
export function itemsDe({ desde, hasta, local, categoria } = {}) {
  const d = cargar()
  return d.items
    .filter((i) => (!desde || enRango(i.dia, desde, hasta || desde)))
    .filter((i) => (!local || i.local_id === local))
    .filter((i) => !categoria || i.categoria === categoria)
    .filter((i) => d.pedidos[i.pedido_id]?.estado !== 'cancelado')
}

export function ventaPorLocal(rango) {
  const ps = pedidos(rango)
  const map = new Map()
  for (const p of ps) {
    const e = map.get(p.local_id) || { local_id: p.local_id, total: 0, pedidos: 0 }
    e.total += p.total_cobrado; e.pedidos++
    map.set(p.local_id, e)
  }
  return [...map.values()]
    .map((e) => ({ ...e, nombre: localPorId(e.local_id)?.nombre || e.local_id }))
    .sort((a, b) => b.total - a.total)
}

export function ventaPorCategoria(rango) {
  const its = itemsDe(rango)
  const map = new Map()
  for (const i of its) {
    const e = map.get(i.categoria) || { categoria: i.categoria, total: 0, unidades: 0 }
    e.total += i.precio_unitario * i.cantidad; e.unidades += i.cantidad
    map.set(i.categoria, e)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function ventaPorPago(rango) {
  const ps = pedidos(rango)
  const map = new Map()
  for (const p of ps) {
    const e = map.get(p.forma_pago) || { pago: p.forma_pago, total: 0, pedidos: 0 }
    e.total += p.total_cobrado; e.pedidos++
    map.set(p.forma_pago, e)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function topProductos(rango, n = 10) {
  const its = itemsDe(rango)
  const map = new Map()
  for (const i of its) {
    const k = i.nombre + (i.tamano ? ` ${i.tamano}` : '')
    const e = map.get(k) || { nombre: k, categoria: i.categoria, total: 0, unidades: 0 }
    e.total += i.precio_unitario * i.cantidad; e.unidades += i.cantidad
    map.set(k, e)
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, n)
}

export function resumen(rango) {
  const ps = pedidos(rango)
  const cs = conversaciones(rango)
  const total = ps.reduce((t, p) => t + p.total_cobrado, 0)
  const cerradas = cs.filter((c) => c.resultado === 'pedido').length
  const enCurso = ps.filter((p) => EN_CURSO.includes(p.estado))
  const entregadas = ps.filter((p) => p.estado === 'entregado' && p.modalidad === 'domicilio' && p.minutos_entrega != null)
  const aTiempo = entregadas.filter((p) => p.minutos_entrega <= 35).length
  const envio = ps.reduce((t, p) => t + (p.envio_cobrado || 0), 0)
  const porEstado = {}
  for (const p of enCurso) porEstado[p.estado] = (porEstado[p.estado] || 0) + 1
  return {
    total, envio,
    pedidos: ps.length,
    ticket: ps.length ? total / ps.length : 0,
    conversaciones: cs.length,
    cerradas,
    pendientes: enCurso.length,
    porEstado,
    domicilio: ps.filter((p) => p.modalidad === 'domicilio').length,
    retiro: ps.filter((p) => p.modalidad === 'retiro').length,
    entregadas: entregadas.length, aTiempo,
    ultimo: ps[0] || null,
  }
}

// Las llamadas: cuántas entraron, cuántas contestó Camila, cuántas pidieron.
export function embudoLlamadas(rango) {
  const cs = conversaciones(rango)
  const contestadas = cs.filter((c) => c.resultado !== 'no_contestada').length
  const pedidos_ = cs.filter((c) => c.resultado === 'pedido').length
  const colgo = cs.filter((c) => c.resultado === 'colgo').length
  const sinPedido = cs.filter((c) => c.resultado === 'sin_pedido').length
  const motivos = new Map()
  for (const c of cs) if (c.motivo_no_cierre) motivos.set(c.motivo_no_cierre, (motivos.get(c.motivo_no_cierre) || 0) + 1)
  return {
    total: cs.length, contestadas, pedidos: pedidos_, colgo, sinPedido,
    conCedula: cs.filter((c) => c.cedula_capturada).length,
    motivos: [...motivos.entries()].map(([motivo, n]) => ({ motivo, n })).sort((a, b) => b.n - a.n),
  }
}

export function personaPorId(id) {
  const d = cargar()
  const p = d.personas[id]
  if (!p) return null
  const tels = d.vinculos.filter((v) => v.persona === id)
    .map((v) => ({ ...v, ...d.telefonos[v.telefono] }))
    .sort((a, b) => b.veces_usado - a.veces_usado)
  const dirs = Object.values(d.direcciones).filter((x) => x.persona_id === id && x.estado === 'activa')
    .sort((a, b) => Number(b.es_default) - Number(a.es_default))
  const peds = Object.values(d.pedidos).filter((x) => x.persona_id === id)
    .sort((a, b) => b.creado_en - a.creado_en)
  const gastado = peds.filter((x) => x.estado !== 'cancelado').reduce((t, x) => t + x.total_cobrado, 0)
  return {
    ...p, telefonos: tels, direcciones: dirs, pedidos: peds,
    gastado, ticket: peds.length ? gastado / peds.length : 0,
  }
}

export function personas({ q } = {}) {
  const d = cargar()
  const texto = norm(q || '')
  return Object.values(d.personas)
    .filter((p) => p.estado === 'activa')
    .map((p) => personaPorId(p.persona_id))
    .filter((p) => !texto || norm(`${p.nombre} ${p.apellido} ${p.cedula || ''}`).includes(texto) ||
      p.telefonos.some((t) => t.telefono.includes(texto.replace(/\D/g, ''))))
    .sort((a, b) => b.gastado - a.gastado)
}

// La ficha que Camila abre antes de contestar. Compacta a propósito: la
// memoria cambia el ORDEN de lo que ofrece, no sus palabras.
export function fichaParaAgente(telefono) {
  const r = resolverPersona({ telefono })
  if (!r.persona) return { conocido: false }
  const p = personaPorId(r.persona.persona_id)
  const ultimo = p.pedidos[0]
  return {
    conocido: true,
    persona_id: p.persona_id,
    nombre: p.nombre,
    pedidos: p.pedidos.length,
    tiene_cedula: !!p.cedula,
    direcciones: p.direcciones.map((x) => ({ alias: x.alias, sector: x.sector })),
    ultimo: ultimo ? { dia: ultimo.dia, total: ultimo.total_cobrado, local: localPorId(ultimo.local_id)?.nombre } : null,
  }
}

// Los pedidos que están en la calle ahora mismo, con su moto. En la demo la
// moto avanza sola por la recta local → casa según el tiempo que lleva fuera.
export function enRuta() {
  const d = cargar()
  return Object.values(d.pedidos)
    // 'camino' en un pedido para llevar significa 'listo para retirar':
    // no hay moto en la calle y no va en este mapa.
    .filter((p) => p.estado === 'camino' && p.modalidad === 'domicilio')
    .map((p) => {
      const dir = p.direccion_id ? d.direcciones[p.direccion_id] : null
      const min = p.salio_en ? Math.round((Date.now() - p.salio_en) / 60000) : null
      let rider = p.rider
      if (rider?.demo && dir?.lat != null) {
        const sede = localPorId(p.local_id)
        if (sede?.lat != null) {
          const f = Math.min(0.92, Math.max(0.08, (min || 0) / 30))
          rider = { lat: sede.lat + (dir.lat - sede.lat) * f, lng: sede.lng + (dir.lng - sede.lng) * f, at: Date.now(), demo: true }
        }
      }
      return {
        ...p, rider,
        destino: dir ? { lat: dir.lat, lng: dir.lng, sector: dir.sector, calle: dir.calle } : null,
        minutos_fuera: min,
        // 35 minutos es el umbral en que un pedido deja de ser normal y pasa a
        // ser una llamada del cliente preguntando dónde está.
        atrasado: min != null && min > 35,
        persona: personaPorId(p.persona_id),
      }
    })
    .sort((a, b) => (b.minutos_fuera || 0) - (a.minutos_fuera || 0))
}

// Entregas de HOY ya terminadas, para dibujar la huella del día.
export function huellaDeHoy(local) {
  const d = cargar()
  const hoy = dayKey(new Date())
  return Object.values(d.pedidos)
    .filter((p) => p.dia === hoy && p.estado === 'entregado' && p.modalidad === 'domicilio' && (!local || p.local_id === local))
    .map((p) => { const dir = p.direccion_id ? d.direcciones[p.direccion_id] : null; return dir ? { pedido_id: p.pedido_id, lat: dir.lat, lng: dir.lng, hora: p.historial?.entregado || p.creado_en, minutos: p.minutos_entrega } : null })
    .filter((x) => x && x.lat != null)
}

// ---------------------------------------------------------------- resumen

// El corte del día: la hora actual, o la del último pedido de hoy si ya es más
// tarde que el reloj (pasa con los datos de demostración).
export function corteDeHoy(local) {
  const d = cargar()
  const ahora = new Date()
  const hoyK = dayKey(ahora)
  let corte = ahora.getHours() * 60 + ahora.getMinutes()
  for (const p of Object.values(d.pedidos)) {
    if (p.dia !== hoyK || (local && p.local_id !== local)) continue
    corte = Math.max(corte, minutoDe(p.creado_en))
  }
  return corte
}

// La serie de los últimos N días, para el gráfico de columnas.
export function serieDiaria(n = 14, local) {
  const d = cargar()
  const dias = []
  const hoy = new Date()
  for (let i = n - 1; i >= 0; i--) dias.push(dayKey(new Date(hoy.getTime() - i * 86400000)))
  const suma = Object.fromEntries(dias.map((x) => [x, 0]))
  const cuenta = Object.fromEntries(dias.map((x) => [x, 0]))
  for (const p of Object.values(d.pedidos)) {
    if (p.estado === 'cancelado') continue
    if (local && p.local_id !== local) continue
    if (suma[p.dia] === undefined) continue
    suma[p.dia] += p.total_cobrado
    cuenta[p.dia]++
  }
  return { dias, valores: dias.map((x) => suma[x]), pedidos: dias.map((x) => cuenta[x]) }
}

// La misma serie partida por dónde entró el pedido (teléfono, página, WhatsApp),
// para las columnas apiladas. Los totales coinciden con serieDiaria.
export const CANALES = ['llamada', 'web', 'whatsapp']
export function serieDiariaPorCanal(n = 14, local) {
  const d = cargar()
  const dias = []
  const hoy = new Date()
  for (let i = n - 1; i >= 0; i--) dias.push(dayKey(new Date(hoy.getTime() - i * 86400000)))
  const idx = Object.fromEntries(dias.map((x, i) => [x, i]))
  const series = Object.fromEntries(CANALES.map((c) => [c, dias.map(() => 0)]))
  const cuentas = Object.fromEntries(CANALES.map((c) => [c, dias.map(() => 0)]))
  const valores = dias.map(() => 0), pedidos = dias.map(() => 0)
  for (const p of Object.values(d.pedidos)) {
    if (p.estado === 'cancelado') continue
    if (local && p.local_id !== local) continue
    const i = idx[p.dia]
    if (i === undefined) continue
    const c = CANALES.includes(p.canal) ? p.canal : 'web'
    series[c][i] += p.total_cobrado; cuentas[c][i]++
    valores[i] += p.total_cobrado; pedidos[i]++
  }
  return { dias, canales: CANALES, series, cuentas, valores, pedidos }
}

// Las cifras de la tira de arriba, día por día, en una sola pasada: pedidos,
// ticket, entregas a tiempo, llamadas y minutos de entrega de los últimos n
// días, más la base del mismo día de la semana pasada hasta la hora de hoy.
export function seriesKPI(n = 14, local) {
  const d = cargar()
  const hoy = new Date()
  const dias = []
  for (let i = n - 1; i >= 0; i--) dias.push(dayKey(new Date(hoy.getTime() - i * 86400000)))
  const idx = Object.fromEntries(dias.map((x, i) => [x, i]))
  const z = () => dias.map(() => 0)
  const pedidos = z(), dinero = z(), entregadas = z(), aTiempo = z(), minutos = z(), llamadas = z()
  const corte = corteDeHoy(local)
  const baseK = dias[n - 8] || null           // el mismo día de la semana pasada
  let llamadasBase = 0
  for (const p of Object.values(d.pedidos)) {
    if (p.estado === 'cancelado') continue
    if (local && p.local_id !== local) continue
    const i = idx[p.dia]
    if (i === undefined) continue
    pedidos[i]++; dinero[i] += p.total_cobrado
    if (p.estado === 'entregado' && p.modalidad === 'domicilio' && p.minutos_entrega != null) {
      entregadas[i]++; minutos[i] += p.minutos_entrega
      if (p.minutos_entrega <= 35) aTiempo[i]++
    }
  }
  for (const c of Object.values(d.conversaciones)) {
    if (local && c.local_id !== local) continue
    const i = idx[c.dia]
    if (i === undefined) continue
    llamadas[i]++
    if (c.dia === baseK && minutoDe(c.inicio) <= corte) llamadasBase++
  }
  return {
    dias, pedidos, entregadas, aTiempo, llamadas,
    ticket: dias.map((_, i) => (pedidos[i] ? dinero[i] / pedidos[i] : null)),
    aTiempoParte: dias.map((_, i) => (entregadas[i] ? aTiempo[i] / entregadas[i] : null)),
    minutos: dias.map((_, i) => (entregadas[i] ? minutos[i] / entregadas[i] : null)),
    base: { dia: baseK, llamadas: llamadasBase, i: n - 8 },
  }
}

// Cuándo se vende: promedio de lo cobrado por (día de la semana, hora) en los
// últimos n días, de 11 a 21. Hoy solo cuenta hasta la hora que ya pasó, para
// no diluir la tarde con ceros que todavía no son ceros.
export function matrizHoraDia(n = 14, local) {
  const d = cargar()
  const hoy = new Date()
  const hoyK = dayKey(hoy)
  const horaCorte = Math.floor(corteDeHoy(local) / 60)
  const horas = []
  for (let h = 11; h <= 21; h++) horas.push(h)
  const suma = Array.from({ length: 7 }, () => horas.map(() => 0))
  const den = Array.from({ length: 7 }, () => horas.map(() => 0))
  const dias = []
  for (let i = n - 1; i >= 0; i--) dias.push(dayKey(new Date(hoy.getTime() - i * 86400000)))
  for (const k of dias) {
    const dow = new Date(k + 'T12:00:00-05:00').getDay()
    horas.forEach((h, j) => { if (k !== hoyK || h <= horaCorte) den[dow][j]++ })
  }
  const desde = dias[0]
  for (const p of Object.values(d.pedidos)) {
    if (p.estado === 'cancelado' || p.dia < desde) continue
    if (local && p.local_id !== local) continue
    const j = new Date(p.creado_en).getHours() - 11
    if (j < 0 || j >= horas.length) continue
    suma[new Date(p.dia + 'T12:00:00-05:00').getDay()][j] += p.total_cobrado
  }
  const orden = [1, 2, 3, 4, 5, 6, 0]     // lunes primero
  return { dow: orden, horas, valores: orden.map((k) => horas.map((_, j) => (den[k][j] ? suma[k][j] / den[k][j] : null))) }
}

// Dos bloques de 7 días, comparables solo sobre los locales que ya vendían en
// ambos: si no, abrir un local se lee como crecimiento y no lo es.
export function semanaContraSemana(local) {
  const hoy = new Date()
  const k = (i) => dayKey(new Date(hoy.getTime() - i * 86400000))
  const esta = [], previa = []
  for (let i = 0; i < 7; i++) esta.push(k(i))
  for (let i = 7; i < 14; i++) previa.push(k(i))
  const d = cargar()
  const agrupa = (dias) => {
    const out = {}
    for (const p of Object.values(d.pedidos)) {
      if (p.estado === 'cancelado') continue
      if (local && p.local_id !== local) continue
      if (!dias.includes(p.dia)) continue
      const e = out[p.local_id] || { total: 0, n: 0 }
      e.total += p.total_cobrado; e.n++
      out[p.local_id] = e
    }
    return out
  }
  const A = agrupa(esta), B = agrupa(previa)
  const comunes = Object.keys(A).filter((id) => B[id])
  const sum = (o) => comunes.reduce((t, id) => t + o[id].total, 0)
  const cnt = (o) => comunes.reduce((t, id) => t + o[id].n, 0)
  const n1 = cnt(A), n0 = cnt(B)
  return {
    comunes: comunes.length, locales: Object.keys(A).length,
    n1, n0,
    v1: sum(A), v0: sum(B),
    t1: n1 ? sum(A) / n1 : 0,
    t0: n0 ? sum(B) / n0 : 0,
  }
}

// Hoy contra el MISMO día de la semana pasada, a la misma hora. Comparar un
// lunes contra un domingo no dice nada en un restaurante.
export function hoyContraLaSemanaPasada(local) {
  const ahora = new Date()
  const hoyK = dayKey(ahora)
  const baseK = dayKey(new Date(ahora.getTime() - 7 * 86400000))
  const d = cargar()
  const corte = corteDeHoy(local)
  let hoy = 0, base = 0, hoyN = 0, baseN = 0
  for (const p of Object.values(d.pedidos)) {
    if (p.estado === 'cancelado') continue
    if (local && p.local_id !== local) continue
    const min = minutoDe(p.creado_en)
    if (p.dia === hoyK) { hoy += p.total_cobrado; hoyN++ }
    else if (p.dia === baseK && min <= corte) { base += p.total_cobrado; baseN++ }
  }
  return { hoy, base, hoyN, baseN, corte, baseK }
}

// El acumulado de un día, cada `paso` minutos, desde las 11:00 hasta el corte.
export function acumuladoDelDia(dia, local, corteMin, paso = 30) {
  const d = cargar()
  const ps = Object.values(d.pedidos).filter((p) => p.dia === dia && p.estado !== 'cancelado' && (!local || p.local_id === local))
  const puntos = []
  for (let m = 660; m <= Math.max(660, corteMin); m += paso) {
    puntos.push({ x: Math.min(m, corteMin), y: ps.filter((p) => minutoDe(p.creado_en) <= m).reduce((t, p) => t + p.total_cobrado, 0) })
    if (m + paso > corteMin && m < corteMin) { puntos.push({ x: corteMin, y: ps.filter((p) => minutoDe(p.creado_en) <= corteMin).reduce((t, p) => t + p.total_cobrado, 0) }); break }
  }
  return { puntos, n: ps.length }
}

// Dónde se vende más de qué: cada local contra los OTROS, no contra un promedio
// que ya lo incluye. Se exige un mínimo de unidades para no llamar tendencia a
// tres pedidos.
export function dondeSeVendeMas(rango, { minUnidades = 12, minVeces = 1.4 } = {}) {
  const its = itemsDe({ ...rango, local: undefined })
  const porLocal = {}
  for (const i of its) {
    const L = (porLocal[i.local_id] = porLocal[i.local_id] || { total: 0, cat: {}, u: 0 })
    const v = i.precio_unitario * i.cantidad
    L.total += v; L.u += i.cantidad
    L.cat[i.categoria] = (L.cat[i.categoria] || 0) + v
  }
  const ids = Object.keys(porLocal)
  const filas = []
  for (const id of ids) {
    const yo = porLocal[id]
    if (yo.u < minUnidades) continue
    const otros = ids.filter((x) => x !== id)
    if (!otros.length) continue
    for (const cat of Object.keys(yo.cat)) {
      const aqui = (yo.cat[cat] / yo.total) * 100
      const totOtros = otros.reduce((t, x) => t + porLocal[x].total, 0)
      const catOtros = otros.reduce((t, x) => t + (porLocal[x].cat[cat] || 0), 0)
      if (!totOtros) continue
      const ref = (catOtros / totOtros) * 100
      if (ref < 3 || aqui < 8) continue
      const veces = aqui / ref
      if (veces < minVeces) continue
      filas.push({
        local: localPorId(id)?.nombre || id, local_id: id, categoria: cat, aqui, otros: ref,
        veces: veces >= 2 ? 'el doble de' : 'bastante más',
        orden: veces,
      })
    }
  }
  return filas.sort((a, b) => b.orden - a.orden).slice(0, 5)
}

// ---------------------------------------------------------------- más cortes

// A qué hora se vende: lo cobrado por hora del día (11 a 22).
export function ventaPorHora(rango) {
  const ps = pedidos(rango)
  const horas = []
  for (let h = 11; h <= 22; h++) horas.push(h)
  const suma = Object.fromEntries(horas.map((h) => [h, 0]))
  const cuenta = Object.fromEntries(horas.map((h) => [h, 0]))
  for (const p of ps) { const h = new Date(p.creado_en).getHours(); if (suma[h] !== undefined) { suma[h] += p.total_cobrado; cuenta[h]++ } }
  return { horas, valores: horas.map((h) => suma[h]), pedidos: horas.map((h) => cuenta[h]) }
}

// Qué día de la semana vende más (promedio por día sobre los últimos n días).
export function ventaPorDiaSemana(n = 14, local) {
  const d = cargar()
  const desde = dayKey(new Date(Date.now() - (n - 1) * 86400000))
  const suma = [0, 0, 0, 0, 0, 0, 0], dias = [0, 0, 0, 0, 0, 0, 0]
  const vistos = new Set()
  for (const p of Object.values(d.pedidos)) {
    if (p.estado === 'cancelado' || p.dia < desde) continue
    if (local && p.local_id !== local) continue
    const dow = new Date(p.dia + 'T12:00:00-05:00').getDay()
    suma[dow] += p.total_cobrado
    if (!vistos.has(p.dia)) { vistos.add(p.dia); dias[dow]++ }
  }
  // lunes primero
  const orden = [1, 2, 3, 4, 5, 6, 0]
  return { dow: orden, valores: orden.map((k) => (dias[k] ? suma[k] / dias[k] : 0)) }
}

export function ventaPorCanal(rango) {
  const ps = pedidos(rango)
  const map = new Map()
  for (const p of ps) { const e = map.get(p.canal) || { canal: p.canal, total: 0, pedidos: 0 }; e.total += p.total_cobrado; e.pedidos++; map.set(p.canal, e) }
  return [...map.values()].sort((a, b) => b.pedidos - a.pedidos)
}

export function ventaPorModalidad(rango) {
  const ps = pedidos(rango)
  const map = new Map()
  for (const p of ps) { const e = map.get(p.modalidad) || { modalidad: p.modalidad, total: 0, pedidos: 0 }; e.total += p.total_cobrado; e.pedidos++; map.set(p.modalidad, e) }
  return [...map.values()].sort((a, b) => b.pedidos - a.pedidos)
}
