import { useEffect, useRef, useState } from 'react'
import { LOCAL } from '../api.js'

// Leaflet is loaded globally from index.html (CDN, no API key). OpenStreetMap tiles.
// `children` are drawn on top of the map, so controls can sit over it.
export default function Map({ rider, dest, height = 260, showLocal = true, children }) {
  const el = useRef(null), map = useRef(null), mk = useRef({})
  const userMoved = useRef(false)
  const ours = useRef(false)          // true while WE are moving the map, so it is not read as a user pan
  const [offCenter, setOffCenter] = useState(false)

  const fit = () => {
    if (!map.current) return
    const L = window.L
    const pts = [[dest.lat, dest.lng]]
    if (rider) pts.push([rider.lat, rider.lng])
    else if (showLocal) pts.push([LOCAL.lat, LOCAL.lng])
    ours.current = true
    map.current.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 })
    setTimeout(() => { ours.current = false }, 400)
    userMoved.current = false
    setOffCenter(false)
  }

  useEffect(() => {
    if (!window.L || !el.current || map.current) return
    const L = window.L
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([dest.lat, dest.lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current)

    const home = L.divIcon({ className: 'eh-pin', html: '<div class="eh-pin-home">🏠</div>', iconSize: [34, 34], iconAnchor: [17, 34] })
    mk.current.dest = L.marker([dest.lat, dest.lng], { icon: home }).addTo(map.current).bindTooltip('Tu dirección')

    if (showLocal) {
      const shop = L.divIcon({ className: 'eh-pin', html: '<div class="eh-pin-shop">🏪</div>', iconSize: [34, 34], iconAnchor: [17, 34] })
      mk.current.local = L.marker([LOCAL.lat, LOCAL.lng], { icon: shop }).addTo(map.current).bindTooltip('El Hornero La Carolina')
    }

    mk.current.line = L.polyline([], { color: '#0E5A33', weight: 4, opacity: 0.8, dashArray: '6 8' }).addTo(map.current)

    // Once the customer pans or zooms to look at their own block, stop yanking the view back.
    // Detect a real user gesture on the container rather than Leaflet's move events, which
    // also fire for our own automatic re-centring and would show "Centrar" out of nowhere.
    const touched = () => { userMoved.current = true; setOffCenter(true) }
    el.current.addEventListener('pointerdown', touched)
    el.current.addEventListener('wheel', touched, { passive: true })
    // The container is often still 0px tall on the first paint, which makes fitBounds
    // pick a wildly wrong zoom. Measure again once the layout has settled.
    fit()
    requestAnimationFrame(() => { map.current?.invalidateSize(); fit() })
    setTimeout(() => { map.current?.invalidateSize(); fit() }, 250)
  }, [])

  useEffect(() => {
    if (!map.current) return
    const L = window.L
    // The rider only exists on the map once he has actually left the shop.
    if (rider) {
      if (!mk.current.rider) {
        const moto = L.divIcon({ className: 'eh-pin', html: '<div class="eh-pin-moto">🛵</div>', iconSize: [38, 38], iconAnchor: [19, 19] })
        mk.current.rider = L.marker([rider.lat, rider.lng], { icon: moto }).addTo(map.current).bindTooltip('Tu motorizado')
      } else {
        mk.current.rider.setLatLng([rider.lat, rider.lng])
      }
      mk.current.line.setLatLngs([[rider.lat, rider.lng], [dest.lat, dest.lng]])
    } else {
      if (mk.current.rider) { map.current.removeLayer(mk.current.rider); mk.current.rider = null }
      mk.current.line.setLatLngs(showLocal ? [[LOCAL.lat, LOCAL.lng], [dest.lat, dest.lng]] : [])
    }
    if (!userMoved.current) fit()
  }, [rider?.lat, rider?.lng, dest.lat, dest.lng])

  return (
    <div className="eh-map-wrap" style={{ height }}>
      <div ref={el} className="eh-map" style={{ height }} />
      {offCenter && <button type="button" className="eh-recenter" onClick={fit}>Centrar</button>}
      {children}
    </div>
  )
}
