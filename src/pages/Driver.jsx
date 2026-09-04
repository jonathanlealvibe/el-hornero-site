import { useEffect, useRef, useState } from 'react'
import { getOrder, pushRiderLocation, updateOrder, STATUS_LABEL } from '../api.js'

export default function Driver({ id }) {
  const [o, setO] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [last, setLast] = useState(null)
  const [err, setErr] = useState('')
  const watch = useRef(null)

  useEffect(() => { getOrder(id).then(setO) }, [id])

  const start = () => {
    if (!navigator.geolocation) { setErr('Este celular no permite ubicación.'); return }
    setErr(''); setSharing(true)
    watch.current = navigator.geolocation.watchPosition(
      async (p) => { const { latitude: lat, longitude: lng } = p.coords; setLast({ lat, lng, at: Date.now() }); await pushRiderLocation(id, lat, lng) },
      (e) => setErr(e.message), { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )
  }
  const stop = () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); setSharing(false) }
  const delivered = async () => { stop(); const r = await updateOrder(id, { status: 'entregado', deliveredAt: Date.now() }); setO({ ...o, ...r }) }
  useEffect(() => () => stop(), [])

  if (!o) return <section className="page"><p>Cargando pedido {id}…</p></section>
  return (
    <section className="page driver">
      <span className="eyebrow">Repartidor · El Hornero</span>
      <h2 className="page-title">Pedido {id}</h2>
      <div className="card">
        <b>{o.cliente?.nombre}</b> · <a href={`tel:${o.cliente?.telefono}`}>{o.cliente?.telefono}</a>
        <p>{o.direccion?.calle}<br />{o.direccion?.referencia}<br />{o.direccion?.sector}</p>
        <p className="muted">Estado: {STATUS_LABEL[o.status]} · Total {`$${Number(o.total).toFixed(2)}`} · {o.payMethod}{o.cambioPara ? ` (cambio para $${o.cambioPara})` : ''}</p>
      </div>
      {!sharing
        ? <button className="btn-primary wide" onClick={start}>🛵 Salir a entregar (compartir ubicación)</button>
        : <button className="btn-secondary wide" onClick={stop}>Pausar ubicación</button>}
      {last && <p className="muted small">Última ubicación enviada: {last.lat.toFixed(5)}, {last.lng.toFixed(5)}</p>}
      {err && <p className="error">{err}</p>}
      <button className="btn-primary wide" onClick={delivered} disabled={o.status === 'entregado'}>✅ Marcar entregado</button>
      <p className="muted small">Deja esta pantalla abierta mientras vas en camino. El cliente ve tu posición en su mapa.</p>
    </section>
  )
}
