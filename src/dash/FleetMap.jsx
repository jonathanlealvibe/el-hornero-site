import { useEffect, useRef } from 'react'
import { LOCALES } from '../locales.js'

// Mapa de TODAS las entregas en curso a la vez. Es distinto del mapa del cliente
// (src/pages/Map.jsx), que sigue un solo pedido: aquí importa ver la flota junta
// y poder aislar una entrega sin perder de vista el resto.
export default function FleetMap({ entregas, seleccion, onSelect, height = 420 }) {
  const el = useRef(null), map = useRef(null), capas = useRef({ motos: {}, casas: {}, rutas: {}, sedes: {} })

  useEffect(() => {
    if (!window.L || !el.current || map.current) return
    const L = window.L
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([-0.19, -78.48], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current)
    // Las sedes se dibujan en el segundo efecto: solo las que tienen una moto
    // fuera. Los 19 locales a la vez son ruido, no contexto.
  }, [])

  useEffect(() => {
    if (!map.current || !window.L) return
    const L = window.L
    const vivos = new Set()

    // Solo los locales que hoy tienen una entrega en la calle.
    const shop = L.divIcon({ className: 'eh-pin', html: '<div class="eh-pin-shop">🏪</div>', iconSize: [26, 26], iconAnchor: [13, 26] })
    const sedesVivas = new Set(entregas.map((e) => e.local_id))
    for (const l of LOCALES) {
      const debe = sedesVivas.has(l.id) && l.lat != null
      if (debe && !capas.current.sedes[l.id]) {
        capas.current.sedes[l.id] = L.marker([l.lat, l.lng], { icon: shop, opacity: 0.8 })
          .addTo(map.current).bindTooltip(l.nombre)
      } else if (!debe && capas.current.sedes[l.id]) {
        map.current.removeLayer(capas.current.sedes[l.id]); delete capas.current.sedes[l.id]
      }
    }

    for (const e of entregas) {
      if (!e.rider || !e.destino || e.destino.lat == null) continue
      vivos.add(e.pedido_id)
      const activo = !seleccion || seleccion === e.pedido_id
      const atenuado = seleccion && seleccion !== e.pedido_id

      const moto = L.divIcon({
        className: 'eh-pin',
        html: `<div class="d-moto${e.atrasado ? ' d-moto--late' : ''}${seleccion === e.pedido_id ? ' d-moto--on' : ''}">🛵</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17],
      })
      const casa = L.divIcon({ className: 'eh-pin', html: '<div class="eh-pin-home">🏠</div>', iconSize: [24, 24], iconAnchor: [12, 24] })

      if (!capas.current.motos[e.pedido_id]) {
        capas.current.motos[e.pedido_id] = L.marker([e.rider.lat, e.rider.lng], { icon: moto })
          .addTo(map.current).on('click', () => onSelect(e.pedido_id))
        capas.current.casas[e.pedido_id] = L.marker([e.destino.lat, e.destino.lng], { icon: casa }).addTo(map.current)
        capas.current.rutas[e.pedido_id] = L.polyline(
          [[e.rider.lat, e.rider.lng], [e.destino.lat, e.destino.lng]],
          { color: e.atrasado ? '#B4472F' : '#0E5A33', weight: 3, opacity: 0.75, dashArray: '5 7' },
        ).addTo(map.current)
      } else {
        capas.current.motos[e.pedido_id].setLatLng([e.rider.lat, e.rider.lng]).setIcon(moto)
        capas.current.rutas[e.pedido_id].setLatLngs([[e.rider.lat, e.rider.lng], [e.destino.lat, e.destino.lng]])
      }
      capas.current.motos[e.pedido_id].setOpacity(atenuado ? 0.35 : 1)
      capas.current.casas[e.pedido_id].setOpacity(atenuado ? 0.25 : 1)
      capas.current.rutas[e.pedido_id].setStyle({ opacity: atenuado ? 0.18 : 0.75, color: e.atrasado ? '#B4472F' : '#0E5A33' })
      capas.current.motos[e.pedido_id].bindTooltip(
        `${e.repartidor || 'Motorizado'} · ${e.pedido_id}${e.minutos_fuera != null ? ` · ${e.minutos_fuera} min` : ''}`,
      )
      void activo
    }

    // Lo que ya se entregó sale del mapa.
    for (const grupo of ['motos', 'casas', 'rutas']) {
      for (const id of Object.keys(capas.current[grupo])) {
        if (!vivos.has(id)) { map.current.removeLayer(capas.current[grupo][id]); delete capas.current[grupo][id] }
      }
    }

    // Encuadre: la entrega elegida, o toda la flota.
    const pts = []
    for (const e of entregas) {
      if (!e.rider || !e.destino || e.destino.lat == null) continue
      if (seleccion && seleccion !== e.pedido_id) continue
      pts.push([e.rider.lat, e.rider.lng], [e.destino.lat, e.destino.lng])
    }
    if (pts.length) {
      map.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: seleccion ? 15 : 13 })
    }
  }, [entregas, seleccion])

  return <div ref={el} className="d-fleetmap" style={{ height }} />
}
