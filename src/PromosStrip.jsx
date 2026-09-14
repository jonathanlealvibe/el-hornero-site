import { useEffect, useState } from 'react'
import { cargarLocal, traerPromos, vigente } from './promos.js'

// Promociones vigentes en la página: las mismas que publica el Centro de mando y que Camila ofrece.
export default function PromosStrip() {
  const [promos, setPromos] = useState(() => cargarLocal().promos)
  useEffect(() => { traerPromos().then((d) => { if (d) setPromos(d.promos) }) }, [])
  const activas = promos.filter((p) => p.activa && vigente(p))
  if (!activas.length) return null
  return (
    <section className="promos" aria-label="Promociones vigentes">
      <h2 className="promos__title">Promociones de hoy</h2>
      <div className="promos__row">
        {activas.map((p) => (
          <div className="promo" key={p.id}>
            <b>{p.nombre}</b>
            <span>{p.detalle}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
