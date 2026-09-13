import { useEffect, useState } from 'react'
import { getOrder, updateOrder, trackUrl } from '../api.js'

const money = (n) => '$' + Number(n).toFixed(2)

export default function Pay({ id, packed }) {
  const [o, setO] = useState(null)
  const [missing, setMissing] = useState(false)
  const [step, setStep] = useState('form')   // form | processing | done
  const [f, setF] = useState({ num: '', exp: '', cvv: '', nom: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => { getOrder(id, packed).then((r) => (r ? setO(r) : setMissing(true))) }, [id, packed])

  if (missing) return <section className="page-doc"><a href="#/" className="back-link">← Ir al menú</a><p>No encontramos el pedido <b>{id}</b>.</p></section>
  if (!o) return <section className="page-doc"><p>Cargando…</p></section>

  const digits = f.num.replace(/\D/g, '')
  const ready = digits.length >= 15 && /^\d{2}\/\d{2}$/.test(f.exp) && f.cvv.length >= 3 && f.nom.trim().length > 2

  const pay = async (e) => {
    e.preventDefault(); if (!ready || step !== 'form') return
    setStep('processing')
    await new Promise((r) => setTimeout(r, 1800))
    await updateOrder(id, { paid: true })
    const fresh = await getOrder(id, packed)
    setO(fresh); setStep('done')
  }

  if (step === 'done' || o.paid) {
    return (
      <section className="page-doc pay">
        <div className="pay-card ok">
          <div className="pay-check">✓</div>
          <h2>Pago aprobado</h2>
          <p className="muted">Pedido {id} · {money(o.total)}</p>
          <p className="muted small">Recibirás tu comprobante. Ya puedes seguir a tu motorizado.</p>
          <a className="btn-primary wide" href={trackUrl(o)}>Seguir mi pedido 🛵</a>
        </div>
        <p className="demo-note">Demostración: ningún cobro real fue procesado.</p>
      </section>
    )
  }

  return (
    <section className="page-doc pay">
      <div className="pay-card">
        <div className="pay-head">
          <span className="pay-brand">el Hornero</span>
          <span className="pay-secure">🔒 Pago seguro</span>
        </div>
        <p className="pay-amount">{money(o.total)}</p>
        <p className="muted small">Pedido {id} · {o.cliente?.nombre}</p>

        <form className="form" onSubmit={pay}>
          <label>Número de tarjeta
            <input value={f.num} onChange={set('num')} inputMode="numeric" placeholder="4242 4242 4242 4242" maxLength={19} autoComplete="off" />
          </label>
          <div className="pay-row">
            <label>Vence<input value={f.exp} onChange={set('exp')} placeholder="MM/AA" maxLength={5} autoComplete="off" /></label>
            <label>CVV<input value={f.cvv} onChange={set('cvv')} inputMode="numeric" placeholder="123" maxLength={4} autoComplete="off" /></label>
          </div>
          <label>Nombre en la tarjeta<input value={f.nom} onChange={set('nom')} placeholder="Como aparece en la tarjeta" autoComplete="off" /></label>
          <button className="btn-primary wide" disabled={!ready || step === 'processing'}>
            {step === 'processing' ? 'Procesando…' : `Pagar ${money(o.total)}`}
          </button>
        </form>
        <p className="muted small pay-foot">Visa · Mastercard · Diners · Discover</p>
      </div>
      <p className="demo-note">Demostración: no se procesa ningún cobro. Usa cualquier número de 16 dígitos.</p>
    </section>
  )
}
