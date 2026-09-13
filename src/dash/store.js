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

import { LOCALES } from '../locales.js'
import { dayKey } from './format.js'

const LS = 'elhornero.panel.v6'

const vacio = () => ({
  personas: {}, telefonos: {}, vinculos: [], direcciones: {},
  pedidos: {}, items: [], conversaciones: {}, sembrado: null,
})

let db = null
const cargar = () => {
  if (db) return db
  try { db = JSON.parse(localStorage.getItem(LS)) || vacio() } catch { db = vacio() }
  return db
}
const guardar = () => { try { localStorage.setItem(LS, JSON.stringify(db)) } catch { /* lleno */ } }
export const reset = () => { db = vacio(); guardar() }
export const estado = () => cargar()

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

export function agregarDireccion(persona_id, dir) {
  const d = cargar()
  const id = ulid('dir_')
  const hash = norm(`${dir.calle}|${dir.sector}|${dir.ciudad || 'Quito'}`).replace(/\s+/g, ' ')
  const existente = Object.values(d.direcciones).find((x) => x.persona_id === persona_id && x.hash_norm === hash)
  if (existente) { existente.veces_usada++; existente.ultima_vez_en = Date.now(); guardar(); return existente }
  const primera = !Object.values(d.direcciones).some((x) => x.persona_id === persona_id && x.estado === 'activa')
  const row = {
    direccion_id: id, persona_id,
    alias: dir.alias || (primera ? 'Casa' : 'Otra'),
    calle: dir.calle || '', referencia: dir.referencia || '',
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

// ---------------------------------------------------------------- pedidos

// Las líneas guardan el precio y la categoría COBRADOS, no los de hoy: cuando
// suban los precios en enero, diciembre no se puede recalcular solo.
export function registrarPedido(p) {
  const d = cargar()
  const id = p.pedido_id || ulid('EH')
  const creado = p.creado_en || Date.now()
  d.pedidos[id] = {
    pedido_id: id,
    persona_id: p.persona_id,
    local_id: p.local_id,                     // NOT NULL: sin sede el pedido no sirve
    direccion_id: p.direccion_id || null,
    modalidad: p.modalidad || 'domicilio',
    canal: p.canal || 'llamada',
    estado: p.estado || 'entregado',
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
    rider: p.rider || null,                    // {lat,lng,at} ultima posicion conocida
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

const enRango = (dia, desde, hasta) => dia >= desde && dia <= hasta

export function pedidos({ desde, hasta, local } = {}) {
  const d = cargar()
  return Object.values(d.pedidos)
    .filter((p) => (!desde || enRango(p.dia, desde, hasta || desde)))
    .filter((p) => (!local || p.local_id === local))
    .filter((p) => p.estado !== 'cancelado')
    .sort((a, b) => b.creado_en - a.creado_en)
}

export function conversaciones({ desde, hasta, local } = {}) {
  const d = cargar()
  return Object.values(d.conversaciones)
    .filter((c) => (!desde || enRango(c.dia, desde, hasta || desde)))
    .filter((c) => (!local || c.local_id === local))
    .sort((a, b) => b.inicio - a.inicio)
}

export function itemsDe({ desde, hasta, local } = {}) {
  const d = cargar()
  return d.items
    .filter((i) => (!desde || enRango(i.dia, desde, hasta || desde)))
    .filter((i) => (!local || i.local_id === local))
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
  return {
    total,
    pedidos: ps.length,
    ticket: ps.length ? total / ps.length : 0,
    conversaciones: cs.length,
    cerradas,
    pendientes: ps.filter((p) => ['pendiente_pago', 'recibido', 'horno', 'camino'].includes(p.estado)).length,
    domicilio: ps.filter((p) => p.modalidad === 'domicilio').length,
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
  const gastado = peds.reduce((t, x) => t + x.total_cobrado, 0)
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

// Los pedidos que están en la calle ahora mismo, con su moto.
export function enRuta() {
  const d = cargar()
  return Object.values(d.pedidos)
    // 'camino' en un pedido para llevar significa 'listo para retirar':
    // no hay moto en la calle y no va en este mapa.
    .filter((p) => p.estado === 'camino' && p.modalidad === 'domicilio')
    .map((p) => {
      const dir = p.direccion_id ? d.direcciones[p.direccion_id] : null
      const min = p.salio_en ? Math.round((Date.now() - p.salio_en) / 60000) : null
      return {
        ...p,
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

// ---------------------------------------------------------------- resumen

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
    comunes: comunes.length,
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
  // El corte es la hora actual, o la del último pedido de hoy si ya es más
  // tarde que el reloj (pasa con los datos de demostración). Comparar contra
  // el día completo de la semana pasada siempre diría "vamos mal".
  let corte = ahora.getHours() * 60 + ahora.getMinutes()
  for (const p of Object.values(d.pedidos)) {
    if (p.dia !== hoyK) continue
    const t = new Date(p.creado_en)
    corte = Math.max(corte, t.getHours() * 60 + t.getMinutes())
  }
  let hoy = 0, base = 0
  for (const p of Object.values(d.pedidos)) {
    if (p.estado === 'cancelado') continue
    if (local && p.local_id !== local) continue
    const t = new Date(p.creado_en)
    const min = t.getHours() * 60 + t.getMinutes()
    if (p.dia === hoyK) hoy += p.total_cobrado
    else if (p.dia === baseK && min <= corte) base += p.total_cobrado
  }
  return { hoy, base }
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
        local: localPorId(id)?.nombre || id, categoria: cat, aqui, otros: ref,
        veces: veces >= 2 ? 'el doble de' : 'bastante más',
        orden: veces,
      })
    }
  }
  return filas.sort((a, b) => b.orden - a.orden).slice(0, 5)
}
