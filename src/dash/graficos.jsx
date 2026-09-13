import { money } from './format.js'
import { T } from './i18n.js'

// Gráficos dibujados a mano. Regla: si es una barra o una regla, es un div.
// Sin librería: una librería de gráficos pesa más que todos los datos de un día.

// Hoy contra el mismo día de la semana pasada. La marca negra es la referencia.
export function Bullet({ actual, base }) {
  const max = Math.max(actual, base, 1) * 1.15
  return (
    <div className="d-bullet" role="img"
      aria-label={`Hoy ${money(actual)}. El mismo día la semana pasada ${money(base)}.`}>
      <i className="d-bullet__fill" style={{ width: `${(actual / max) * 100}%` }} />
      <span className="d-bullet__mark" style={{ left: `${(base / max) * 100}%` }} />
    </div>
  )
}

// `new Date('2026-09-13')` se lee como medianoche UTC y en Guayaquil devuelve el
// día anterior: todas las fechas saldrían corridas un día.
const esFinde = (dia) => [5, 6, 0].includes(new Date(dia + 'T12:00:00-05:00').getDay())
const techo = (m) => {
  const p = m < 100 ? 20 : m < 500 ? 50 : m < 2000 ? 100 : 250
  return Math.max(p, Math.ceil(m / p) * p)
}

// Los últimos días. Columnas, no línea: con catorce puntos una línea es ruido
// con pendiente, y el fin de semana explica casi toda la forma.
export function Dias({ dias, valores }) {
  const top = techo(Math.max(...valores, 1))
  const conVenta = valores.filter((v) => v > 0)
  const prom = conVenta.length ? conVenta.reduce((a, b) => a + b, 0) / conVenta.length : 0
  const n = dias.length
  return (
    <>
      <div className="d-days" style={{ gridTemplateColumns: `repeat(${n},1fr)` }}>
        <div className="d-days__avg" style={{ bottom: `${(prom / top) * 100}%` }} />
        {dias.map((d, i) => (
          <div key={d} className={'d-days__col' + (esFinde(d) ? ' es-finde' : '')}
            title={`${d}: ${money(valores[i])}`}>
            {valores[i] > 0
              ? <i style={{ height: `${(valores[i] / top) * 100}%`, background: i === n - 1 ? 'var(--d-green-dark)' : 'var(--d-green-acc)' }} />
              : <i className="d-days__cero" />}
          </div>
        ))}
      </div>
      <div className="d-days__axis" style={{ gridTemplateColumns: `repeat(${n},1fr)` }}>
        {dias.map((d, i) => <span key={d}>{i === n - 1 ? 'hoy' : d.slice(8)}</span>)}
      </div>
      <p className="d-chartfoot">
        El fondo verde claro son los fines de semana. La raya cortada es un día normal
        ({money(prom)}).
      </p>
    </>
  )
}

// Por qué cambió la venta: o entraron más pedidos, o cada pedido fue más grande.
// La descomposición es exacta, sin residuo: N1·T1 − N0·T0 = (N1−N0)·T0 + N1·(T1−T0)
export function PorQueCambio({ n0, t0, n1, t1 }) {
  const porPedidos = (n1 - n0) * t0
  const porTamano = n1 * (t1 - t0)
  const total = porPedidos + porTamano
  const esc = Math.max(Math.abs(porPedidos), Math.abs(porTamano), 1)
  const fila = (etiqueta, v) => (
    <li>
      <span className="d-why__lab">{etiqueta}</span>
      <span className="d-why__track">
        <i className={v >= 0 ? 'pos' : 'neg'}
          style={{ width: `${(Math.abs(v) / esc) * 50}%`, [v >= 0 ? 'left' : 'right']: '50%' }} />
      </span>
      <span className={'d-why__val' + (v >= 0 ? '' : ' neg')}>{v >= 0 ? '+' : '−'}{money(Math.abs(v))}</span>
    </li>
  )
  return (
    <>
      <p className="d-lede">
        {T('Esta semana se cobró', 'This week took')} <b>{money(Math.abs(total))} {total >= 0 ? T('más', 'more') : T('menos', 'less')}</b> {T('que la anterior.', 'than the previous one.')}
      </p>
      <ul className="d-why">
        {fila(T(`${n1 >= n0 ? 'Entraron' : 'Faltaron'} ${Math.abs(n1 - n0)} pedidos`, `${Math.abs(n1 - n0)} ${n1 >= n0 ? 'more' : 'fewer'} orders`), porPedidos)}
        {fila(T(`Cada pedido fue ${money(Math.abs(t1 - t0))} ${t1 >= t0 ? 'más grande' : 'más chico'}`, `Each order was ${money(Math.abs(t1 - t0))} ${t1 >= t0 ? 'bigger' : 'smaller'}`), porTamano)}
      </ul>
    </>
  )
}

// "De cada $100 que vende este local, $54 son pizza; en los otros locales, $24."
// Se compara contra los OTROS locales, no contra un promedio que ya lo incluye.
export function DondeSeVendeMas({ filas }) {
  if (!filas.length) {
    return <p className="d-empty">{T('Todavía no hay suficientes pedidos para comparar los locales entre sí.', 'Not enough orders yet to compare branches against each other.')}</p>
  }
  return (
    <ul className="d-mix">
      {filas.map((f, i) => (
        <li key={i}>
          <b>{f.local}</b>{' '}
          {T('vende', 'sells')} <b>{T(f.veces, f.veces === 'el doble de' ? 'twice as much' : 'a lot more')}</b> {f.categoria.toLowerCase()} {T('que el resto.', 'than the rest.')}
          <span className="d-mix__det">
            {T('De cada $100 que vende,', 'Of every $100 it sells,')} <b>{money(f.aqui)}</b> {T('son', 'is')} {f.categoria.toLowerCase()};
            {' '}{T('en los otros locales,', 'in the other branches,')} {money(f.otros)}.
          </span>
        </li>
      ))}
    </ul>
  )
}
