import { useEffect, useRef, useState } from 'react'
import { getOrder, pushRiderLocation, updateOrder, STATUS_LABEL } from '../api.js'
import { publishLive, PUBLISH_EVERY_MS } from '../live.js'

export default function Driver({ id, packed }) {
  const [o, setO] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [last, setLast] = useState(null)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(0)
  const [relayOk, setRelayOk] = useState(true)
  const watch = useRef(null)
  const lastSent = useRef(0)
  const wake = useRef(null)
  const sharingRef = useRef(false)

  // Pantalla encendida mientras reparte: sin esto el celular se bloquea y el GPS se apaga.
  const keepAwake = async () => {
    try { if (navigator.wakeLock && !wake.current) wake.current = await navigator.wakeLock.request('screen') } catch { /* no soportado */ }
  }
  const releaseAwake = () => { try { wake.current?.release() } catch { /* ignore */ } wake.current = null }
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible' && sharingRef.current) { wake.current = null; keepAwake() } }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => { getOrder(id, packed).then(setO) }, [id, packed])

  const start = () => {
    if (!navigator.geolocation) { setErr('Este celular no permite ubicación.'); return }
    setErr(''); setSharing(true); sharingRef.current = true
    keepAwake()
    publishLive(id, { t: 'status', status: 'camino', at: Date.now() })
    watch.current = navigator.geolocation.watchPosition(
      async (p) => {
        const { latitude: lat, longitude: lng, accuracy } = p.coords
        const at = Date.now()
        setLast({ lat, lng, at })
        await pushRiderLocation(id, lat, lng)
        if (at - lastSent.current < PUBLISH_EVERY_MS) return
        lastSent.current = at
        const ok = await publishLive(id, { t: 'fix', lat, lng, acc: Math.round(accuracy || 0), at })
        setRelayOk(ok); if (ok) setSent((n) => n + 1)
      },
      (e) => setErr(e.message), { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )
  }
  const stop = () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); setSharing(false); sharingRef.current = false; releaseAwake() }
  const delivered = async () => {
    stop()
    const at = Date.now()
    if (last) await publishLive(id, { t: 'fix', lat: last.lat, lng: last.lng, acc: 0, at })
    await publishLive(id, { t: 'status', status: 'entregado', at: at + 1 })
    const r = await updateOrder(id, { status: 'entregado', deliveredAt: at }); setO({ ...o, ...r })
  }
  useEffect(() => () => stop(), [])

  if (!o) return <section className="page-doc"><p>Cargando pedido {id}…</p></section>
  return (
    <section className="page-doc driver">
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
      {last && <p className="muted small">Última ubicación: {last.lat.toFixed(5)}, {last.lng.toFixed(5)} · {sent} enviada{sent === 1 ? '' : 's'} al cliente</p>}
      {!relayOk && <p className="error">No se pudo enviar la ubicación al cliente. Revise la señal de datos.</p>}
      {err && <p className="error">{err}</p>}
      <button className="btn-primary wide" onClick={delivered} disabled={o.status === 'entregado'}>✅ Marcar entregado</button>
      <p className="muted small">Deje esta pantalla abierta y encendida mientras va en camino: el cliente ve su posición en el mapa. Si bloquea el celular, la ubicación deja de enviarse.</p>
    </section>
  )
}
