import { useEffect, useState } from 'react'
import { getOrder, updateOrder, STATUS_LABEL, STATUS_LABEL_PICKUP, DEMO, demoJump, demoFast, trackUrl, payUrl } from '../api.js'
import Map from './Map.jsx'

const money = (n) => '$' + Number(n).toFixed(2)
const STEPS = ['recibido', 'horno', 'camino', 'entregado']

export default function Order({ id, packed }) {
  const [o, setO] = useState(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    let alive = true
    const tick = async () => { const r = await getOrder(id, packed); if (!alive) return; if (!r) setMissing(true); else setO(r) }
    tick(); const t = setInterval(tick, 1500); return () => { alive = false; clearInterval(t) }
  }, [id, packed])

  if (missing) return <section className="page"><a href="#/" className="back-link">← Volver al menú</a><p>No encontramos el pedido <b>{id}</b>.</p></section>
  if (!o) return <section className="page"><p>Cargando tu pedido…</p></section>

  const LABEL = o.modalidad === 'A domicilio' ? STATUS_LABEL : STATUS_LABEL_PICKUP
  const stepIdx = STEPS.indexOf(o.status)
  const track = trackUrl(o)
  const pay = payUrl(o)
  const waPay = encodeURIComponent(`Hola ${o.cliente?.nombre || ''}, aquí está el link para pagar tu pedido ${id} de El Hornero 🍕 Total ${money(o.total)}: ${pay}`)
  const waTrack = encodeURIComponent(`Tu pedido ${id} ya va en camino 🛵 Sigue a tu motorizado en vivo aquí: ${track}`)

  return (
    <section className="page order">
      <a href="#/" className="back-link">← Volver al menú</a>
      <div className="order-head">
        <div><span className="eyebrow">Pedido</span><h2 className="page-title">{id}</h2></div>
        <span className={'status-pill s-' + o.status}>{LABEL[o.status]}</span>
      </div>

      {!o.paid && o.payMethod === 'tarjeta' && (
        <div className="paybox">
          <b>Falta tu pago: {money(o.total)}</b>
          <p>Paga con tarjeta para que tu pedido entre al horno.</p>
          <a className="btn-primary" href={pay}>Pagar {money(o.total)}</a>
        </div>
      )}

      <ol className="timeline">
        {STEPS.map((s, i) => <li key={s} className={i <= stepIdx ? 'done' : ''}><span className="dot" />{LABEL[s]}</li>)}
      </ol>

      {o.modalidad !== 'A domicilio' && o.dest && (
        <div className="track">
          <div className="track-head"><b>🏪 Para llevar · retiras en el local</b></div>
          <Map rider={null} dest={o.dest} />
          <p className="muted small">Local La Carolina · Av. Amazonas y Naciones Unidas, Quito. Te avisamos cuando esté listo.</p>
        </div>
      )}
      {o.modalidad === 'A domicilio' && o.dest && (
        <div className="track">
          <div className="track-head"><b>{o.status === 'camino' ? '🛵 Tu motorizado va en camino' : o.status === 'entregado' ? '✅ Entregado' : '🏠 Tu dirección'}</b>
            {o.status === 'camino' && o.rider?.at && <span className="muted">actualizado hace {Math.max(0, Math.round((Date.now() - o.rider.at) / 1000))} s</span>}</div>
          <Map rider={o.status === 'camino' || o.status === 'entregado' ? o.rider : null} dest={o.dest} />
          <p className="muted small">{o.direccion?.calle}{o.direccion?.referencia ? ` · ${o.direccion.referencia}` : ''} · {o.direccion?.sector}{DEMO && !o.geocoded ? ' · (dirección no ubicada en el mapa, se muestra un punto de referencia)' : ''}</p>
        </div>
      )}

      <div className="receipt">
        <h3>Detalle</h3>
        {o.items.map((it, i) => <div key={i} className="row"><span>{it.cantidad} × {it.nombre}</span><b>{money(it.precio * it.cantidad)}</b></div>)}
        <div className="row muted"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
        <div className="row muted"><span>Envío</span><span>{o.envio ? money(o.envio) : 'Gratis'}</span></div>
        <div className="row muted"><span>IVA 15%</span><span>{money(o.iva)}</span></div>
        <div className="row total"><span>Total</span><span>{money(o.total)}</span></div>
        <div className="row muted"><span>Pago</span><span>{o.payMethod}{o.cambioPara ? ` (cambio para ${money(Number(o.cambioPara))})` : ''}{o.paid ? ' · pagado' : ''}</span></div>
        <div className="row muted"><span>Factura</span><span>{o.factura === 'con_datos' ? `con datos · ${o.cliente.cedula}` : 'consumidor final'}</span></div>
        <div className="receipt-actions">
          <button className="btn-secondary" onClick={() => window.print()}>Descargar recibo (PDF)</button>
          <a className="btn-secondary" href={`https://wa.me/?text=${waTrack}`} target="_blank" rel="noreferrer">Enviar seguimiento por WhatsApp</a>
          {!o.paid && <a className="btn-secondary" href={`https://wa.me/?text=${waPay}`} target="_blank" rel="noreferrer">Enviar link de pago por WhatsApp</a>}
          <a className="btn-secondary" href={`#/repartidor/${id}?d=${packed || ''}`}>Abrir vista del repartidor</a>
        </div>
      </div>
      {DEMO && (
        <div className="demo-bar">
          <span>Demo</span>
          <button className="btn-secondary" onClick={async () => { const n = STEPS[Math.min(STEPS.length - 1, Math.max(0, stepIdx) + 1)]; await demoJump(id, n); setO(await getOrder(id)) }} disabled={o.status === 'entregado'}>⏭ Siguiente paso</button>
          <button className="btn-secondary" onClick={async () => { await demoFast(id); setO(await getOrder(id)) }}>▶ Demo rápida (30 s)</button>
          <button className="btn-secondary" onClick={async () => { await demoJump(id, 'recibido'); setO(await getOrder(id)) }}>↺ Reiniciar</button>
          <p className="demo-note">Modo demostración: el motorizado se simula. Con el servidor activo, la ubicación viene del celular del repartidor.</p>
        </div>
      )}
    </section>
  )
}
