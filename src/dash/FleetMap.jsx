import { useEffect, useRef, useState } from 'react'
import { LOCALES } from '../locales.js'
import { reduce, animar } from './motion.js'
import { T } from './i18n.js'

// Mapa de TODAS las entregas en curso a la vez, en oscuro. Es distinto del mapa
// del cliente (src/pages/Map.jsx), que sigue un solo pedido y se queda claro.
//
// Base: teselas de OpenStreetMap invertidas por CSS (.d-fleetmap__lienzo.is-invertido).
// CARTO dark queda como mejora opcional cuando haya clave: se cambia BASE y se
// quita el filtro; nada más cambia.
const ATTR_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const BASE = { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', opts: { maxZoom: 19, keepBuffer: 4, attribution: ATTR_OSM }, invertir: true }

const esMovil = () => !!window.matchMedia?.('(max-width: 899px)').matches

// Rumbo (grados desde el norte) y distancia (m) entre dos posiciones.
const rad = (x) => (x * Math.PI) / 180
export function rumbo(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat))
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng))
  const r = (Math.atan2(y, x) * 180) / Math.PI
  return r < 0 ? r + 360 : r
}
export function metros(a, b) {
  const s = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(s))
}
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }

// La flecha solo sale cuando la moto de verdad se mueve: 15 m o más en 2 min o
// menos (≥ 0.8 m/s). Una moto parada en un semáforo no apunta a ningún lado.
const MIN_METROS = 15, MAX_SEG = 120, MIN_MS = 0.8

// Inicial del repartidor. Si dos que están fuera comparten inicial, dos letras.
function iniciales(entregas) {
  const cuenta = {}
  for (const e of entregas) { const k = (e.repartidor || 'M')[0].toUpperCase(); cuenta[k] = (cuenta[k] || 0) + 1 }
  const out = {}
  for (const e of entregas) {
    const n = e.repartidor || 'Moto'
    out[e.pedido_id] = cuenta[n[0].toUpperCase()] > 1 ? n.slice(0, 2) : n[0].toUpperCase()
  }
  return out
}

const htmlMoto = (ini, dly) =>
  `<div class="d-rider" style="--rumbo:0deg;--dly:${dly}ms" role="img">` +
  `<i class="d-rider__pulse"></i><i class="d-rider__ping"></i><i class="d-rider__arrow"></i>` +
  `<b class="d-rider__disc">${ini}</b><span class="d-rider__min" hidden></span><span class="d-rider__n" hidden></span></div>`
const htmlCasa = () => '<div class="d-casa"><i></i></div>'
const htmlSede = () => '<div class="d-sede"><i></i></div>'
const htmlHuella = () => '<div class="d-huella"></div>'

export default function FleetMap({
  entregas, seleccion, onSelect, hover, onHover,
  huella = [],            // entregas de HOY ya terminadas: [{pedido_id, lat, lng, hora, minutos}]
  onHuella,               // click en una huella → abrir el pedido
  sedesVisibles,          // ids de locales a dibujar aunque no tengan moto (estado vacío / filtro)
  compacto = false,       // tira en Hoy: sin controles, sin arrastre, un click lleva a Motos
  onClickCompacto,
  height,
  children,               // la ficha flotante del teléfono (.d-flotante) vive DENTRO del mapa
}) {
  const wrap = useRef(null), el = useRef(null), map = useRef(null)
  const capas = useRef({ motos: {}, casas: {}, rutas: {}, casings: {}, sedes: {}, huellas: {} })
  const hist = useRef({})           // pedido_id → { prev:{lat,lng,at}, giro, conRumbo, quieto_desde }
  const firma = useRef('')          // qué encuadramos por última vez
  const programatico = useRef(false)
  const tonos = useRef(null)
  const [listo, setListo] = useState(false)
  const [movido, setMovido] = useState(false)
  const [roto, setRoto] = useState(false)
  const [intento, setIntento] = useState(0)

  // 1. Crear el mapa. Leaflet llega por <script defer>: si aún no está, esperar.
  useEffect(() => {
    let cancelado = false, t = null, errores = 0, cargado = false
    const init = () => {
      if (cancelado || map.current || !el.current || !window.L) return
      const L = window.L
      const cs = getComputedStyle(wrap.current)
      tonos.current = {
        ok: cs.getPropertyValue('--d-green-lit').trim() || '#4FCB85',
        tarde: cs.getPropertyValue('--d-down').trim() || '#E8865F',
        sel: cs.getPropertyValue('--d-yellow').trim() || '#F5C518',
      }
      const m = L.map(el.current, {
        zoomControl: false, attributionControl: false, zoomSnap: 0.5,
        fadeAnimation: !reduce(), zoomAnimation: !reduce(), markerZoomAnimation: !reduce(),
        dragging: !compacto, scrollWheelZoom: !compacto, touchZoom: !compacto, doubleClickZoom: !compacto,
        keyboard: !compacto, tap: !compacto,
      }).setView([-0.19, -78.48], 12)
      if (!compacto) L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(m)
      if (!compacto && !esMovil()) L.control.zoom({ position: 'bottomright', zoomInTitle: T('Acercar', 'Zoom in'), zoomOutTitle: T('Alejar', 'Zoom out') }).addTo(m)
      const tiles = L.tileLayer(BASE.url, BASE.opts).addTo(m)
      tiles.on('tileerror', () => { errores++; if (errores >= 4 && !cargado) setRoto(true) })
      tiles.on('load', () => { cargado = true })
      setTimeout(() => { if (!cancelado && !cargado && errores > 0) setRoto(true) }, 8000)
      if (BASE.invertir) el.current.classList.add('is-invertido')
      m.on('zoomstart', () => { wrap.current?.classList.add('is-zooming'); if (!programatico.current) setMovido(true) })
      m.on('zoomend', () => { wrap.current?.classList.remove('is-zooming'); agrupar() })
      m.on('movestart', () => { if (programatico.current) wrap.current?.classList.add('is-volando') })
      m.on('moveend', () => wrap.current?.classList.remove('is-volando'))
      m.on('dragstart', () => setMovido(true))
      map.current = m
      setListo(true)
    }
    if (window.L) init()
    else {
      let n = 0
      t = setInterval(() => { n++; if (window.L) { clearInterval(t); init() } else if (n > 100) { clearInterval(t); setRoto(true) } }, 100)
    }
    const ro = wrap.current && 'ResizeObserver' in window
      ? new ResizeObserver(() => requestAnimationFrame(() => map.current?.invalidateSize({ animate: false }))) : null
    ro?.observe(wrap.current)
    return () => {
      cancelado = true; clearInterval(t); ro?.disconnect()
      if (map.current) { map.current.remove(); map.current = null }
      capas.current = { motos: {}, casas: {}, rutas: {}, casings: {}, sedes: {}, huellas: {} }
      firma.current = ''; setListo(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento])

  // Dos motos encima: a < 30 px de distancia en pantalla se funden en una con
  // el número; desde zoom 16 se abren en abanico alrededor del punto real.
  const agrupar = () => {
    const m = map.current; if (!m || !window.L) return
    const ids = Object.keys(capas.current.motos)
    const pts = ids.map((id) => ({ id, p: m.latLngToLayerPoint(capas.current.motos[id].getLatLng()) }))
    const grupo = {}
    const usado = new Set()
    for (let i = 0; i < pts.length; i++) {
      if (usado.has(pts[i].id) || pts[i].id === seleccion) continue
      const g = [pts[i].id]
      for (let j = i + 1; j < pts.length; j++) {
        if (usado.has(pts[j].id) || pts[j].id === seleccion) continue
        if (pts[i].p.distanceTo(pts[j].p) < 30) { g.push(pts[j].id); usado.add(pts[j].id) }
      }
      usado.add(pts[i].id); grupo[pts[i].id] = g
    }
    const abanico = m.getZoom() >= 16
    for (const id of ids) {
      const nodo = capas.current.motos[id].getElement()?.firstElementChild
      if (!nodo) continue
      const g = Object.values(grupo).find((x) => x.includes(id)) || [id]
      const k = g.indexOf(id)
      nodo.classList.toggle('is-oculto', !abanico && g.length > 1 && k > 0)
      const n = nodo.querySelector('.d-rider__n')
      if (!abanico && g.length > 1 && k === 0) { n.hidden = false; n.textContent = String(g.length); nodo.classList.add('is-grupo') }
      else { n.hidden = true; nodo.classList.remove('is-grupo') }
      if (abanico && g.length > 1) {
        const ang = (2 * Math.PI * k) / g.length - Math.PI / 2
        nodo.style.setProperty('--dx', `${Math.round(Math.cos(ang) * 18)}px`)
        nodo.style.setProperty('--dy', `${Math.round(Math.sin(ang) * 18)}px`)
      } else { nodo.style.removeProperty('--dx'); nodo.style.removeProperty('--dy') }
      capas.current.motos[id]._grupo = g
    }
  }

  const encuadrar = (pts, { maxZoom, anim = true }) => {
    const m = map.current, L = window.L
    if (!m || !L || !pts.length) return
    const b = L.latLngBounds(pts)
    const movil = esMovil()
    // La tira compacta no tiene controles ni fichas encima: con 32 px de margen
    // le cabe medio paso más de zoom.
    const pad = movil ? 28 : compacto ? 32 : 56
    const opts = { paddingTopLeft: [pad, pad], paddingBottomRight: [pad, movil && seleccion ? 120 : pad], maxZoom }
    programatico.current = true
    // En la tira compacta el conjunto de motos cambia cada pocos minutos
    // (una llega, sale otra): el reencuadre se desliza en vez de saltar.
    if (anim && !reduce()) m.flyToBounds(b, { ...opts, duration: compacto ? 0.5 : 0.65, easeLinearity: 0.25 })
    else m.fitBounds(b, { ...opts, animate: false })
    m.once('moveend', () => { programatico.current = false })
    setMovido(false)
  }

  // 2. Pintar. Los pines se crean UNA vez y luego se mutan: así el pulso no se
  //    reinicia y la flecha gira en vez de saltar.
  useEffect(() => {
    if (!listo || !map.current || !window.L) return
    const L = window.L, m = map.current, C = capas.current, TN = tonos.current
    const vivos = new Set()
    const ini = iniciales(entregas)
    const ahora = Date.now()
    const primerPintado = firma.current === ''

    // Sedes: las que tienen moto fuera, más las pedidas (filtro o estado vacío).
    const porSede = {}
    for (const e of entregas) porSede[e.local_id] = (porSede[e.local_id] || 0) + 1
    const pedir = new Set([...(sedesVisibles || []), ...Object.keys(porSede)])
    for (const l of LOCALES) {
      const debe = pedir.has(l.id) && l.lat != null
      if (debe && !C.sedes[l.id]) {
        C.sedes[l.id] = L.marker([l.lat, l.lng], {
          icon: L.divIcon({ className: 'd-pin', html: htmlSede(), iconSize: [26, 26], iconAnchor: [13, 13] }),
          keyboard: false, interactive: false,
        }).addTo(m)
      } else if (!debe && C.sedes[l.id]) { m.removeLayer(C.sedes[l.id]); delete C.sedes[l.id] }
      if (C.sedes[l.id]) {
        const n = porSede[l.id] || 0
        const txt = n ? `${l.nombre} · ${n}` : l.nombre
        const permanente = !compacto && !esMovil() && pedir.size <= 6
        if (C.sedes[l.id].getTooltip()) C.sedes[l.id].setTooltipContent(txt)
        else C.sedes[l.id].bindTooltip(txt, { permanent: permanente, direction: 'right', offset: [16, 0], className: 'd-tip d-tip--sede', opacity: 1 })
        const origen = seleccion && entregas.find((e) => e.pedido_id === seleccion)?.local_id === l.id
        C.sedes[l.id].getElement()?.firstElementChild?.classList.toggle('is-sel', !!origen)
        C.sedes[l.id].getElement()?.firstElementChild?.classList.toggle('is-quieta', !n)
      }
    }

    const nRutas = entregas.filter((e) => e.rider && e.destino?.lat != null).length
    for (const e of entregas) {
      if (!e.rider || !e.destino || e.destino.lat == null) continue
      vivos.add(e.pedido_id)
      const sel = seleccion === e.pedido_id
      const dim = !!seleccion && !sel
      const tono = sel ? TN.sel : e.atrasado ? TN.tarde : TN.ok
      const pr = [e.rider.lat, e.rider.lng], pd = [e.destino.lat, e.destino.lng]

      if (!C.motos[e.pedido_id]) {
        C.casings[e.pedido_id] = L.polyline([pr, pd], { color: tono, weight: 9, opacity: 0.14, lineCap: 'round', interactive: false }).addTo(m)
        C.rutas[e.pedido_id] = L.polyline([pr, pd], { className: 'd-ruta', color: tono, weight: 3, opacity: 0.9, dashArray: '2 10', lineCap: 'round', interactive: false }).addTo(m)
        C.casas[e.pedido_id] = L.marker(pd, {
          icon: L.divIcon({ className: 'd-pin', html: htmlCasa(), iconSize: [24, 24], iconAnchor: [12, 12] }), keyboard: false,
        }).addTo(m).on('click', () => onSelect?.(e.pedido_id))
        const dly = 600 + (hash(e.pedido_id) % 8) * 300
        C.motos[e.pedido_id] = L.marker(pr, {
          icon: L.divIcon({ className: 'd-pin', html: htmlMoto(ini[e.pedido_id], dly), iconSize: [44, 44], iconAnchor: [22, 22] }),
          riseOnHover: true, zIndexOffset: 100,
        }).addTo(m)
          .on('click', () => {
            const g = C.motos[e.pedido_id]._grupo
            if (g && g.length > 1 && m.getZoom() < 16) encuadrar(g.map((id) => C.motos[id].getLatLng()), { maxZoom: 17 })
            else onSelect?.(sel ? null : e.pedido_id)
          })
          .on('mouseover', () => onHover?.(e.pedido_id)).on('mouseout', () => onHover?.(null))
        hist.current[e.pedido_id] = { prev: { ...e.rider }, giro: 0, conRumbo: false, quieto_desde: e.rider.at || ahora }
        // Pin nuevo (no en el primer pintado): entra con un rebote corto.
        if (!primerPintado) {
          const inner = C.motos[e.pedido_id].getElement()?.firstElementChild
          animar(inner, [{ scale: '.4', opacity: 0 }, { scale: '1.12', opacity: 1, offset: 0.7 }, { scale: '1' }], { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' })
        }
      } else {
        const mk = C.motos[e.pedido_id]
        const antes = m.latLngToLayerPoint(mk.getLatLng())
        mk.setLatLng(pr)
        const despues = m.latLngToLayerPoint(mk.getLatLng())
        const inner = mk.getElement()?.firstElementChild
        const quieto = wrap.current?.classList.contains('is-zooming') || wrap.current?.classList.contains('is-volando')
        if (inner && !quieto && (antes.x !== despues.x || antes.y !== despues.y)) {
          animar(inner, [{ translate: `${antes.x - despues.x}px ${antes.y - despues.y}px` }, { translate: '0 0' }], { duration: 1200, easing: 'linear' })
        }
        C.rutas[e.pedido_id].setLatLngs([pr, pd]); C.casings[e.pedido_id].setLatLngs([pr, pd])
        // Rumbo por historial de posiciones: el modelo solo guarda {lat,lng,at}.
        const h = hist.current[e.pedido_id]
        const d = metros(h.prev, e.rider), dt = ((e.rider.at || ahora) - (h.prev.at || ahora)) / 1000
        if (d >= MIN_METROS) {
          if (dt > 0 && dt <= MAX_SEG && d / dt >= MIN_MS) {
            const nuevo = rumbo(h.prev, e.rider)
            const actual = ((h.giro % 360) + 360) % 360
            h.giro += ((nuevo - actual + 540) % 360) - 180      // el camino corto, nunca 350°
            h.conRumbo = true
          }
          h.prev = { ...e.rider }; h.quieto_desde = e.rider.at || ahora
        } else if ((e.rider.at || ahora) - h.quieto_desde > MAX_SEG * 1000) h.conRumbo = false
      }
      // En la demo la moto siempre "avanza" hacia la casa: rumbo directo.
      if (e.rider.demo) { const h = hist.current[e.pedido_id]; h.giro = rumbo({ lat: pr[0], lng: pr[1] }, { lat: pd[0], lng: pd[1] }); h.conRumbo = true }

      C.rutas[e.pedido_id].setStyle({ color: tono, weight: sel ? 4 : 3, opacity: dim ? 0.14 : sel ? 1 : 0.9 })
      C.casings[e.pedido_id].setStyle({ color: tono, opacity: dim ? 0 : sel ? 0.18 : 0.14 })
      const ruta = C.rutas[e.pedido_id].getElement()
      ruta?.classList.toggle('is-dim', dim)
      ruta?.classList.toggle('marcha', !dim && (nRutas <= 6 || sel || !!e.atrasado))
      C.casas[e.pedido_id].getElement()?.firstElementChild?.classList.toggle('is-sel', sel)
      C.casas[e.pedido_id].getElement()?.firstElementChild?.classList.toggle('is-dim', dim)
      C.casas[e.pedido_id].getElement()?.firstElementChild?.classList.toggle('d-casa--late', !!e.atrasado)

      const nodo = C.motos[e.pedido_id].getElement()?.firstElementChild
      if (nodo) {
        const h = hist.current[e.pedido_id]
        nodo.classList.toggle('d-rider--late', !!e.atrasado)
        const eraSel = nodo.classList.contains('is-sel')
        nodo.classList.toggle('is-sel', sel)
        if (sel && !eraSel && !reduce()) { const ping = nodo.querySelector('.d-rider__ping'); ping.classList.remove('on'); void ping.offsetWidth; ping.classList.add('on') }
        nodo.classList.toggle('is-dim', dim)
        nodo.classList.toggle('is-hover', hover === e.pedido_id)
        nodo.classList.toggle('has-rumbo', h.conRumbo)
        nodo.style.setProperty('--rumbo', `${Math.round(h.giro)}deg`)
        nodo.querySelector('.d-rider__disc').textContent = ini[e.pedido_id]
        const min = nodo.querySelector('.d-rider__min')
        min.hidden = e.minutos_fuera == null; min.textContent = e.minutos_fuera ?? ''
        nodo.setAttribute('aria-label', T(`${e.repartidor || 'Motorizado'}, ${e.minutos_fuera ?? '?'} minutos fuera${e.atrasado ? ', pasada de 35 minutos' : ''}, de ${LOCALES.find((l) => l.id === e.local_id)?.nombre || ''} a ${e.destino.sector || ''}`, `${e.repartidor || 'Rider'}, ${e.minutos_fuera ?? '?'} minutes out${e.atrasado ? ', past 35 minutes' : ''}, from ${LOCALES.find((l) => l.id === e.local_id)?.nombre || ''} to ${e.destino.sector || ''}`))
      }
      const tip = `${e.repartidor || 'Motorizado'} · ${e.pedido_id}${e.minutos_fuera != null ? ` · ${e.minutos_fuera} min` : ''} · ${LOCALES.find((l) => l.id === e.local_id)?.nombre || ''} → ${e.destino.sector || ''}`
      if (C.motos[e.pedido_id].getTooltip()) C.motos[e.pedido_id].setTooltipContent(tip)
      else if (!compacto) C.motos[e.pedido_id].bindTooltip(tip, { className: 'd-tip', direction: 'top', offset: [0, -26], opacity: 1 })
      const tipCasa = `${e.persona ? `${e.persona.nombre} ${e.persona.apellido}` : T('Cliente', 'Customer')} · ${e.destino.sector || ''}${e.destino.calle ? ` · ${e.destino.calle}` : ''}`
      if (C.casas[e.pedido_id].getTooltip()) C.casas[e.pedido_id].setTooltipContent(tipCasa)
      else if (!compacto) C.casas[e.pedido_id].bindTooltip(tipCasa, { className: 'd-tip', direction: 'top', offset: [0, -14], opacity: 1 })
      C.motos[e.pedido_id].setZIndexOffset(sel ? 1000 : hover === e.pedido_id ? 500 : 100)
    }

    // Lo que ya se entregó sale del mapa (con una salida corta).
    for (const grupo of ['motos', 'casas', 'rutas', 'casings']) {
      for (const id of Object.keys(C[grupo])) {
        if (!vivos.has(id)) {
          const capa = C[grupo][id]; delete C[grupo][id]; delete hist.current[id]
          const inner = grupo === 'motos' ? capa.getElement?.()?.firstElementChild : null
          const a = inner ? animar(inner, [{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.6' }], { duration: 240, easing: 'cubic-bezier(.4,0,1,1)' }) : null
          if (a?.finished) a.finished.finally(() => m.removeLayer(capa)); else m.removeLayer(capa)
        }
      }
    }

    // Huella del día (estado vacío): puntos apagados donde ya se entregó.
    const huellaViva = new Set()
    for (const h of huella) {
      if (h.lat == null) continue
      huellaViva.add(h.pedido_id)
      if (!C.huellas[h.pedido_id]) {
        C.huellas[h.pedido_id] = L.marker([h.lat, h.lng], {
          icon: L.divIcon({ className: 'd-pin', html: htmlHuella(), iconSize: [16, 16], iconAnchor: [8, 8] }), keyboard: false, zIndexOffset: -100,
        }).addTo(m).on('click', () => onHuella?.(h.pedido_id))
          .bindTooltip(`${h.pedido_id}${h.minutos != null ? ` · ${h.minutos} min` : ''}`, { className: 'd-tip', direction: 'top', offset: [0, -10], opacity: 1 })
      }
    }
    for (const id of Object.keys(C.huellas)) if (!huellaViva.has(id)) { m.removeLayer(C.huellas[id]); delete C.huellas[id] }
    Object.keys(C.huellas).forEach((id, i) => { const n = C.huellas[id].getElement(); if (n && !n.dataset.vista) { n.dataset.vista = '1'; n.firstElementChild?.style.setProperty('--retraso', `${Math.min(i * 30, 900)}ms`) } })

    agrupar()

    // Encuadre: solo cuando cambia QUÉ hay que ver (la selección o el conjunto de
    // motos), nunca en cada refresco de posiciones.
    const ids = [...vivos].sort().join('|')
    const f = `${ids}#${seleccion || ''}#${huella.length ? 'h' : ''}`
    if (f !== firma.current) {
      const primera = firma.current === ''
      firma.current = f
      const pts = []
      for (const e of entregas) {
        if (!e.rider || !e.destino || e.destino.lat == null) continue
        if (seleccion && seleccion !== e.pedido_id) continue
        pts.push([e.rider.lat, e.rider.lng], [e.destino.lat, e.destino.lng])
        if (seleccion) { const l = LOCALES.find((x) => x.id === e.local_id); if (l?.lat != null) pts.push([l.lat, l.lng]) }
      }
      if (!pts.length) {
        for (const h of huella) if (h.lat != null) pts.push([h.lat, h.lng])
        for (const id of Object.keys(C.sedes)) pts.push(C.sedes[id].getLatLng())
      }
      // La tira compacta admite un paso más de zoom: sus diez motos viven en el
      // centro de Quito y a 13 se leerían como un solo pin con un número.
      if (!movido || seleccion) encuadrar(pts, { maxZoom: seleccion ? 15 : compacto ? 14 : 13, anim: !primera })
    }
  }, [listo, entregas, seleccion, hover, huella, sedesVisibles, compacto])   // eslint-disable-line react-hooks/exhaustive-deps

  const recentrar = () => {
    const pts = []
    for (const e of entregas) if (e.rider && e.destino?.lat != null) pts.push([e.rider.lat, e.rider.lng], [e.destino.lat, e.destino.lng])
    encuadrar(pts, { maxZoom: 13 })
  }
  const reintentar = () => { setRoto(false); if (map.current) { map.current.remove(); map.current = null } setIntento((n) => n + 1) }

  const nAtrasadas = entregas.filter((e) => e.atrasado).length
  return (
    <div ref={wrap} className={'d-fleetmap' + (compacto ? ' d-fleetmap--compacto' : '')} style={height ? { '--m-h': `${height}px` } : undefined}
      role="region" aria-label={T(`Mapa con ${entregas.length} motos en la calle${nAtrasadas ? `; ${nAtrasadas} pasada${nAtrasadas > 1 ? 's' : ''} de 35 minutos` : ''}`, `Map with ${entregas.length} riders out${nAtrasadas ? `; ${nAtrasadas} past 35 minutes` : ''}`)}>
      <div ref={el} className="d-fleetmap__lienzo" />
      {!compacto && movido && (
        <button type="button" className="d-mapa-btn" onClick={recentrar}>{T('Recentrar', 'Recenter')}</button>
      )}
      {huella.length > 0 && entregas.length === 0 && (
        <p className="d-mapa-leyenda"><i /> {T('Entregas de hoy', "Today's deliveries")} · {huella.length}</p>
      )}
      {roto && (
        <div className="d-fleetmap__aviso" role="alert">
          <span>{T('El mapa no cargó. La lista de abajo tiene las mismas entregas.', 'The map did not load. The list below has the same deliveries.')}</span>
          <button type="button" className="d-btn d-btn--sm" onClick={reintentar}>{T('Reintentar el mapa', 'Retry the map')}</button>
        </div>
      )}
      {compacto && (
        <button type="button" className="d-fleetmap__tapa" onClick={onClickCompacto} aria-label={T('Abrir el mapa de motos', 'Open the riders map')} />
      )}
      {children}
    </div>
  )
}
