import { useEffect, useState } from 'react'
import { getOrder, STATUS_LABEL, STATUS_LABEL_PICKUP, DEMO, demoJump, demoStep, demoFast, demoReset, trackUrl, WA, LOCAL_TEL } from '../api.js'
import Map from './Map.jsx'
import { go } from '../router.js'

const money = (n) => '$' + Number(n).toFixed(2)
const STEPS = ['recibido', 'horno', 'camino', 'entregado']
// The simulated run takes 6 minutes end to end; speed divides it.
const STEP_MIN = { recibido: 0, horno: 1, camino: 2, entregado: 6 }
const hhmm = (ms) => new Date(ms).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function Order({ id, packed }) {
  const [o, setO] = useState(null)
  const [missing, setMissing] = useState(false)
  const refresh = async () => setO(await getOrder(id, packed))
  useEffect(() => {
    let alive = true
    const tick = async () => {
      const r = await getOrder(id, packed); if (!alive) return
      if (!r) { setMissing(true); return }
      // Un link armado por el CRM llega con id "q": el id real viene adentro.
      if (r.id && r.id !== id) { go(`/pedido/${r.id}${packed ? `?d=${packed}` : ''}`); return }
      setO(r)
    }
    tick(); const t = setInterval(tick, 1500); return () => { alive = false; clearInterval(t) }
  }, [id, packed])

  if (missing) return <section className="page-doc"><a href="#/" className="back-link">← Volver al menú</a><p>No encontramos el pedido <b>{id}</b>.</p></section>
  if (!o) return <section className="page-doc"><p>Cargando su pedido…</p></section>

  const pickup = o.modalidad !== 'A domicilio'
  const LABEL = pickup ? STATUS_LABEL_PICKUP : STATUS_LABEL
  const stepIdx = STEPS.indexOf(o.status)
  const speed = o.speed || 1
  const stepAt = (s) => o.createdAt + (STEP_MIN[s] * 60000) / speed
  const eta = stepAt('entregado')

  const headline =
    o.status === 'entregado' ? (pickup ? `Retirado a las ${hhmm(eta)}` : `Entregado a las ${hhmm(eta)}`)
      : o.status === 'pendiente_pago' ? 'Solo falta el pago y va al horno'
        : pickup ? `Listo para retirar ~${hhmm(eta)}`
          : `Llega ~${hhmm(eta)}`

  const riderAgeS = o.rider?.at ? Math.max(0, Math.round((Date.now() - o.rider.at) / 1000)) : null
  const track = trackUrl(o)

  const demoDock = DEMO && (
    <div className="demo-dock" role="group" aria-label="Controles de demostración">
      <button type="button" title="Empezar de nuevo" onClick={async () => { await demoReset(id); refresh() }}>↺</button>
      <button type="button" title="Adelantar un paso" onClick={async () => { await demoStep(id); refresh() }} disabled={o.status === 'entregado'}>⏩</button>
      <button type="button" className="wide" title="Ver el recorrido en 30 segundos" onClick={async () => { await demoFast(id); refresh() }}>▶ 30 s</button>
      <button type="button" title="Ya llegó" onClick={async () => { await demoJump(id, 'entregado'); refresh() }} disabled={o.status === 'entregado'}>🏁</button>
      {speed > 1 && <span className="demo-speed">{speed}×</span>}
    </div>
  )

  return (
    <section className="page-doc order">
      <a href="#/" className="back-link">← Volver al menú</a>
      <div className="order-head">
        <div>
          <span className="eyebrow">Pedido {id} · {LOCAL_NAME}</span>
          <h1 className="page-title">{headline}</h1>
        </div>
        <span className={'status-pill s-' + o.status}>{LABEL[o.status]}</span>
      </div>

      {!o.paid && o.payMethod === 'tarjeta' && (
        <div className="paybox">
          <b>Solo falta el pago: {money(o.total)}</b>
          <p>Apenas paga, su pizza entra al horno.</p>
          <a className="btn-primary" href={`#/pago/${id}${packed ? `?d=${packed}` : ''}`}>Pagar {money(o.total)}</a>
        </div>
      )}

      <ol className="timeline">
        {STEPS.map((s, i) => (
          <li key={s} className={i <= stepIdx ? 'done' : ''}>
            <span className="dot" />
            {LABEL[s]}
            {i <= stepIdx && <span className="step-time">{hhmm(stepAt(s))}</span>}
          </li>
        ))}
      </ol>

      {o.dest && (
        <div className="track">
          <div className="track-head">
            <b>{pickup ? '🏪 Para llevar · retira en el local'
              : o.status === 'camino' ? '🛵 Su motorizado va en camino'
                : o.status === 'entregado' ? '✅ Entregado'
                  : '🏠 Su dirección'}</b>
            {o.status === 'camino' && riderAgeS !== null && (
              <span className="muted">{riderAgeS < 20 ? 'en vivo' : `actualizado hace ${riderAgeS} s`}</span>
            )}
          </div>
          <Map
            rider={o.status === 'camino' || o.status === 'entregado' ? o.rider : null}
            dest={o.dest}
            showLocal={!pickup}
          >{demoDock}</Map>
          <p className="muted small">
            {pickup
              ? 'Local La Carolina · Av. Amazonas y Naciones Unidas, Quito. Le avisamos cuando esté listo.'
              : <>{o.direccion?.calle}{o.direccion?.referencia ? ` · ${o.direccion.referencia}` : ''} · {o.direccion?.sector}</>}
          </p>
        </div>
      )}

      <div className="receipt">
        <h3>Detalle</h3>
        {o.items.map((it, i) => <div key={i} className="row"><span>{it.cantidad} × {it.nombre}</span><b>{money(it.precio * it.cantidad)}</b></div>)}
        <div className="row muted"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
        <div className="row muted"><span>Envío</span><span>{o.envio ? money(o.envio) : 'Gratis'}</span></div>
        <div className="row muted"><span>IVA 15% incluido</span><span>{money(o.iva)}</span></div>
        <div className="row total"><span>Total</span><span>{money(o.total)}</span></div>
        <div className="row muted"><span>Pago</span><span>{o.payMethod}{o.cambioPara ? ` (cambio para ${money(Number(o.cambioPara))})` : ''}{o.paid ? ' · pagado' : ''}</span></div>
        <div className="row muted"><span>Factura</span><span>{o.factura === 'con_datos' ? `con datos · ${o.cliente?.cedula || ''}` : 'consumidor final'}</span></div>
        <div className="receipt-actions">
          <a className="btn-wa" href={`https://wa.me/?text=${encodeURIComponent(WA.seguimiento(o, track))}`} target="_blank" rel="noreferrer">Compartir mi pedido</a>
          <a className="btn-secondary" href={`tel:${LOCAL_TEL}`}>Llamar al local</a>
          <button className="btn-secondary" onClick={() => window.print()}>Imprimir recibo</button>
        </div>
      </div>

      {DEMO && (
        <p className="demo-note">
          Vista de demostración · el motorizado se simula.
          {' '}<a href={`#/repartidor/${id}${packed ? `?d=${packed}` : ''}`}>Abrir la pantalla del repartidor</a>
        </p>
      )}
    </section>
  )
}

const LOCAL_NAME = 'Local La Carolina'
