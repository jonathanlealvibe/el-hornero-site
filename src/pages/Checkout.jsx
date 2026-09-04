import { useState } from 'react'
import { createOrder } from '../api.js'
import { go } from '../router.js'

const money = (n) => '$' + n.toFixed(2)

export default function Checkout({ lines, mode, subtotal, shipping, tax, total, onPlaced }) {
  const [f, setF] = useState({ nombre: '', telefono: '', cedula: '', direccion: '', referencia: '', sector: '', pago: 'efectivo', cambio: '', factura: 'consumidor_final', correo: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ok = f.nombre && f.telefono.length >= 9 && /^\d{10}(\d{3})?$/.test(f.cedula) && (mode === 'pickup' || (f.direccion && f.sector))

  const submit = async (e) => {
    e.preventDefault(); if (!ok || busy) return; setBusy(true)
    const order = {
      cliente: { nombre: f.nombre, telefono: f.telefono, cedula: f.cedula, correo: f.correo },
      modalidad: mode === 'pickup' ? 'Para llevar' : 'A domicilio',
      direccion: mode === 'pickup' ? null : { calle: f.direccion, referencia: f.referencia, sector: f.sector },
      items: lines.map((l) => ({ id: l.id, nombre: l.name, cantidad: l.qty, precio: l.price })),
      subtotal, envio: shipping, iva: tax, total,
      payMethod: f.pago, cambioPara: f.pago === 'efectivo' ? f.cambio : null, factura: f.factura,
      paid: f.pago !== 'tarjeta' ? null : false,
    }
    const o = await createOrder(order)
    onPlaced?.(); go(`/pedido/${o.id}`)
  }

  return (
    <section className="page">
      <a href="#/" className="back-link">← Volver al menú</a>
      <h2 className="page-title">Confirma tu pedido</h2>
      <div className="checkout-grid">
        <form className="form" onSubmit={submit}>
          <h3>Tus datos</h3>
          <label>Nombre<input value={f.nombre} onChange={set('nombre')} required placeholder="Ej. Mauricio" /></label>
          <label>Celular<input value={f.telefono} onChange={set('telefono')} required inputMode="tel" placeholder="09 9999 9999" /></label>
          <label>Cédula o RUC<input value={f.cedula} onChange={set('cedula')} required inputMode="numeric" placeholder="10 dígitos (13 para RUC)" /></label>
          {mode !== 'pickup' && (<>
            <h3>Entrega</h3>
            <label>Dirección<input value={f.direccion} onChange={set('direccion')} required placeholder="Calle principal y secundaria, N°" /></label>
            <label>Referencia<input value={f.referencia} onChange={set('referencia')} placeholder="Edificio, color de casa, junto a…" /></label>
            <label>Sector / ciudad<input value={f.sector} onChange={set('sector')} required placeholder="Ej. La Carolina, Quito" /></label>
          </>)}
          <h3>Pago</h3>
          <div className="radio-row">
            {[['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['tarjeta', 'Tarjeta / Payphone']].map(([v, l]) => (
              <label key={v} className={'chip' + (f.pago === v ? ' on' : '')}><input type="radio" name="pago" value={v} checked={f.pago === v} onChange={set('pago')} />{l}</label>
            ))}
          </div>
          {f.pago === 'efectivo' && <label>¿Con cuánto pagas?<input value={f.cambio} onChange={set('cambio')} inputMode="decimal" placeholder="Para enviarte el cambio" /></label>}
          <h3>Factura</h3>
          <div className="radio-row">
            <label className={'chip' + (f.factura === 'consumidor_final' ? ' on' : '')}><input type="radio" name="fac" value="consumidor_final" checked={f.factura === 'consumidor_final'} onChange={set('factura')} />Consumidor final</label>
            <label className={'chip' + (f.factura === 'con_datos' ? ' on' : '')}><input type="radio" name="fac" value="con_datos" checked={f.factura === 'con_datos'} onChange={set('factura')} />Con mis datos</label>
          </div>
          {f.factura === 'con_datos' && <label>Correo para la factura<input value={f.correo} onChange={set('correo')} type="email" placeholder="tu@correo.com" /></label>}
          <button className="btn-primary wide" disabled={!ok || busy}>{busy ? 'Enviando…' : f.pago === 'tarjeta' ? 'Continuar al pago con tarjeta' : 'Confirmar pedido'}</button>
        </form>
        <aside className="summary">
          <h3>Resumen</h3>
          {lines.map((l) => <div key={l.id} className="row"><span>{l.qty} × {l.name}</span><b>{money(l.price * l.qty)}</b></div>)}
          <div className="row muted"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="row muted"><span>Envío</span><span>{shipping === 0 ? 'Gratis' : money(shipping)}</span></div>
          <div className="row muted"><span>IVA 15%</span><span>{money(tax)}</span></div>
          <div className="row total"><span>Total</span><span>{money(total)}</span></div>
          <p className="hint">{mode === 'pickup' ? 'Retiro en el local que elijas.' : 'Entrega estimada: 30 minutos.'}</p>
        </aside>
      </div>
    </section>
  )
}
