import { useEffect, useRef } from 'react'
// Leaflet is loaded globally from index.html (CDN, no API key). OpenStreetMap tiles.
export default function Map({ rider, dest, height = 260 }) {
  const el = useRef(null), map = useRef(null), mk = useRef({})
  useEffect(() => {
    if (!window.L || !el.current || map.current) return
    const L = window.L
    map.current = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([dest.lat, dest.lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map.current)
    const home = L.divIcon({ className: 'eh-pin', html: '<div class="eh-pin-home">🏠</div>', iconSize: [34, 34], iconAnchor: [17, 34] })
    const moto = L.divIcon({ className: 'eh-pin', html: '<div class="eh-pin-moto">🛵</div>', iconSize: [38, 38], iconAnchor: [19, 19] })
    mk.current.dest = L.marker([dest.lat, dest.lng], { icon: home }).addTo(map.current)
    mk.current.rider = L.marker([rider?.lat ?? dest.lat, rider?.lng ?? dest.lng], { icon: moto }).addTo(map.current)
    mk.current.line = L.polyline([], { color: '#0E5A33', weight: 4, opacity: 0.8, dashArray: '6 8' }).addTo(map.current)
  }, [])
  useEffect(() => {
    if (!map.current || !rider) return
    const L = window.L
    mk.current.rider.setLatLng([rider.lat, rider.lng])
    mk.current.line.setLatLngs([[rider.lat, rider.lng], [dest.lat, dest.lng]])
    map.current.fitBounds(L.latLngBounds([[rider.lat, rider.lng], [dest.lat, dest.lng]]), { padding: [40, 40], maxZoom: 16 })
  }, [rider?.lat, rider?.lng])
  return <div ref={el} className="eh-map" style={{ height }} />
}
