// Datos en vivo: los pedidos REALES que entran por la tienda (src/api.js los
// guarda en localStorage bajo 'elhornero.orders' mientras no haya backend).
// Cada refresco los trae al tablero; el mismo pedido nunca se duplica.
import { MENU } from '../data.js'
import { LOCALES } from '../locales.js'
import * as S from './store.js'

const LS_TIENDA = 'elhornero.orders'
const LOCAL_TIENDA = { lat: -0.1807, lng: -78.4869 }   // de dónde sale la moto en la tienda (api.js LOCAL)

const leerTienda = () => { try { return JSON.parse(localStorage.getItem(LS_TIENDA) || '{}') } catch { return {} } }
const escribirTienda = (o) => { try { localStorage.setItem(LS_TIENDA, JSON.stringify(o)) } catch { /* lleno */ } }

const dist2 = (a, b) => (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2
function localMasCercano(p) {
  let mejor = null, d = Infinity
  for (const l of LOCALES) { if (l.lat == null) continue; const x = dist2(p, l); if (x < d) { d = x; mejor = l } }
  return mejor || LOCALES[0]
}

// El nombre de la línea puede traer el tamaño ("Napolitana · M"): se busca el plato por prefijo.
function categoriaDe(nombre) {
  const n = String(nombre || '').toLowerCase()
  const m = MENU.find((x) => n === x.name.toLowerCase()) || MENU.find((x) => n.startsWith(x.name.toLowerCase()))
  return m ? m.cat : 'Otros'
}
const tamanoDe = (nombre) => { const m = String(nombre || '').match(/·\s*(S|M|L|XL|XXL)\s*$/i); return m ? m[1].toUpperCase() : null }

// El estado que hoy simula la tienda por reloj (getOrder en api.js), salvo que
// alguien lo haya movido a mano desde el tablero (statusManual).
function estadoDe(o, ahora) {
  if (o.statusManual) return o.statusManual
  const t = ((ahora - o.createdAt) / 60000) * (o.speed || 1)
  if (o.paid === false && o.payMethod === 'tarjeta') return 'pendiente_pago'
  return t < 1 ? 'recibido' : t < 2 ? 'horno' : t < 6 ? 'camino' : 'entregado'
}

function partirNombre(completo) {
  const p = String(completo || '').trim().split(/\s+/)
  return { nombre: p[0] || '', apellido: p.slice(1).join(' ') }
}

// Trae al tablero lo nuevo de la tienda y actualiza el estado de lo que ya estaba.
export function importarPedidosDelSitio() {
  const tienda = leerTienda()
  const ids = Object.keys(tienda)
  if (!ids.length) return 0
  const ahora = Date.now()
  let nuevos = 0
  S.enBloque(() => {
    const db = S.estado()
    for (const id of ids) {
      const o = tienda[id]
      if (!o || !o.id || o.id !== id) continue            // los alias de links apuntan al mismo pedido
      const estado = estadoDe(o, ahora)
      const domicilio = o.modalidad === 'A domicilio'
      const existente = db.pedidos[id]
      if (existente) {
        // Solo el reloj de la tienda cambia el estado; lo movido a mano manda.
        if (!existente.manual && existente.estado !== estado && estado !== 'cancelado') {
          existente.estado = estado
          existente.historial = { ...(existente.historial || {}), [estado]: ahora }
          if (estado === 'camino' && domicilio) existente.salio_en = existente.salio_en || ahora
          if (estado === 'entregado') existente.minutos_entrega = existente.minutos_entrega ?? Math.max(1, Math.round((ahora - o.createdAt) / 60000))
        }
        if (existente.estado === 'camino' && domicilio && o.rider) existente.rider = { lat: o.rider.lat, lng: o.rider.lng, at: ahora, demo: !o.rider?.real }
        continue
      }
      // Nuevo: persona (por teléfono o cédula), dirección, local y el pedido.
      const c = o.cliente || {}
      const { nombre, apellido } = partirNombre(c.nombre)
      let r = S.resolverPersona({ telefono: c.telefono, cedula: c.cedula, nombre })
      const persona = r.persona || S.crearPersona({ nombre, apellido, cedula: c.cedula, telefono: c.telefono, correo: c.correo })
      if (r.persona && c.cedula && !r.persona.cedula) S.actualizarPersona(r.persona.persona_id, { cedula: c.cedula })
      const dest = o.dest && o.dest.lat != null ? o.dest : null
      const local = localMasCercano(dest || LOCAL_TIENDA)
      let direccion = null
      if (domicilio && o.direccion) {
        direccion = S.agregarDireccion(persona.persona_id, {
          calle: o.direccion.calle, referencia: o.direccion.referencia, sector: o.direccion.sector,
          lat: dest?.lat ?? null, lng: dest?.lng ?? null, local_id: local.id,
        })
      }
      const items = (o.items || []).map((i) => ({
        nombre: String(i.nombre || '').replace(/\s*·\s*(S|M|L|XL|XXL)\s*$/i, ''), categoria: categoriaDe(i.nombre), tamano: tamanoDe(i.nombre),
        cantidad: +i.cantidad || 1, precio_unitario: +i.precio || 0,
      }))
      const subtotal = o.subtotal ?? items.reduce((t, i) => t + i.precio_unitario * i.cantidad, 0)
      const envio = o.envio ?? o.shipping ?? (domicilio && subtotal < 25 ? 2.5 : 0)
      const total = o.total ?? Math.round((subtotal + envio) * 100) / 100
      const historial = { recibido: o.createdAt }
      if (estado === 'horno' || estado === 'camino' || estado === 'entregado') historial.horno = o.createdAt + 60000 / (o.speed || 1)
      if (estado === 'camino' || estado === 'entregado') historial.camino = o.createdAt + 120000 / (o.speed || 1)
      if (estado === 'entregado') historial.entregado = o.createdAt + 360000 / (o.speed || 1)
      S.registrarPedido({
        pedido_id: id, persona_id: persona.persona_id, local_id: local.id,
        direccion_id: direccion ? direccion.direccion_id : null,
        modalidad: domicilio ? 'domicilio' : 'retiro', canal: o.canal || 'web', estado,
        subtotal, envio_cobrado: envio, total_cobrado: total,
        forma_pago: o.payMethod || 'efectivo', creado_en: o.createdAt || ahora,
        minutos_entrega: estado === 'entregado' ? Math.max(1, Math.round((historial.entregado - o.createdAt) / 60000)) : null,
        repartidor: domicilio ? 'Motorizado' : null,
        salio_en: historial.camino || null,
        rider: domicilio && o.rider ? { lat: o.rider.lat, lng: o.rider.lng, at: ahora, demo: true } : null,
        historial, items,
      })
      db.pedidos[id].origen = 'sitio'
      nuevos++
    }
  })
  return nuevos
}

// Lo que se mueve a mano en el tablero vuelve a la tienda, para que el link del
// cliente muestre el mismo estado.
export function avisarTienda(pedido_id, estado) {
  const tienda = leerTienda()
  if (!tienda[pedido_id]) return
  if (['pendiente_pago', 'recibido', 'horno', 'camino', 'entregado'].includes(estado)) tienda[pedido_id].statusManual = estado
  if (estado === 'cancelado') tienda[pedido_id].cancelado = true
  escribirTienda(tienda)
}

export const hayPedidosEnLaTienda = () => Object.keys(leerTienda()).length > 0
