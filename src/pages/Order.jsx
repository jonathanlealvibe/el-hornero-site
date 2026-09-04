import { useEffect, useState } from 'react'
import { getOrder, updateOrder, STATUS_LABEL, DEMO } from '../api.js'
import Map from './Map.jsx'

const money = (n) => '$' + Number(n).toFixed(2)
const STEPS = ['recibido', 'horno', 'camino', 'entregado']

export default function Order({ id }) {
  const [o, setO] = useState(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    let alive = true
    const tick = async () => { const r = await getOrder(id); if (!alive) return; if (!r) setMissing(true); else setO(r) }
    tick(); const t = setInterval(tick, 4000); return () => { alive = false; clearInterval(t) }
  }, [id])

  if (missing) return <section className="page"><a href="#/" className="back-link">← Volver al menú</a><p>No encontramos el pedido <b>{id}</b>.</p></section>
  if (!o) return <section className="page"><p>Cargando tu pedido…</p></section>

  const stepIdx = STEPS.indexOf(o.status)
  const payNow = async () => {
    // Payphone / Kushki go here. Until the merchant account exists, mark as paid for the demo.
    const r = await updateOrder(id, { paid: true, paidAt: Date.now() }); setO({ ...o, ...r })
  }
  const shareUrl = `${location.origin}/#/pedido/${id}`
  const waText = encodeURIComponent(`Hola, confirmo mi pedido ${id} de El Hornero. Total ${money(o.total)}. Seguimiento: ${shareUrl}`)

  return (
    <section className="page order">
      <a href="#/" className="back-link">← Volver al menú</a>
      <div className="order-head">
        <div><span className="eyebrow">Pedido</span><h2 className="page-title">{id}</h2></div>
        <span className={'status-pill s-' + o.status}>{STATUS_LABEL[o.status]}</span>
      </div>

      {o.status === 'pendiente_pago' && (
        <div className="paybox">
          <b>Total a pagar: {money(o.total)}</b>
          <p>Pago con tarjeta a través de Payphone (Ecuador). Cuando el comercio active su cuenta, aquí aparece el botón oficial.</p>
          <button className="btn-primary" onClick={payNow}>Pagar {money(o.total)}</button>
        </div>
      )}

      <ol className="timeline">
        {STEPS.map((s, i) => <li key={s} className={i <= stepIdx ? 'done' : ''}><span className="dot" />{STATUS_LABEL[s]}</li>)}
      </ol>

      {o.modalidad === 'A domicilio' && o.dest && (
        <div className="track">
          <div className="track-head"><b>{o.status === 'camino' ? '🛵 Tu motorizado va en camino' : o.status === 'entregado' ? '✅ Entregado' : '🏠 Tu dirección'}</b>
            {o.rider?.at && <span className="muted">actualizado {Math.max(0, Math.round((Date.now() - o.rider.at) / 1000))} s</span>}</div>
          <Map rider={o.status === 'camino' || o.status === 'entregado' ? o.rider : null} dest={o.dest} />
          <p className="muted small">{o.direccion?.calle}{o.direccion?.referencia ? ` · ${o.direccion.referencia}` : ''} · {o.direccion?.sector}</p>
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
          <a className="btn-secondary" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer">Compartir por WhatsApp</a>
        </div>
      </div>
      {DEMO && <p className="demo-note">Modo demostración: el motorizado se simula. Con el servidor activo, la ubicación viene del celular del repartidor.</p>}
    </section>
  )
}
