import { memo } from 'react'
import { money } from './format.js'
import { T } from './i18n.js'

// Regla de la casa: el SVG dibuja formas; las palabras van en HTML al lado.
// Cada gráfico anima UNA vez por serie (key = valores), nunca en cada refresco.
// Cero ≠ sin dato: 0 es un filo de 2 px, null es un hueco.

export const techo = (m) => {
  const p = m < 100 ? 20 : m < 500 ? 50 : m < 2000 ? 100 : 250
  return Math.max(p, Math.ceil(m / p) * p)
}

const esFinde = (dia) => [5, 6, 0].includes(new Date(dia + 'T12:00:00-05:00').getDay())

// Columnas de los últimos días. La de hoy en verde claro con tapa amarilla.
export const Columnas = memo(function Columnas({ dias, valores, pedidos, referencia, alto = 132, href, titulo }) {
  const n = dias.length
  const top = techo(Math.max(...valores.filter((v) => v != null), 1))
  const conVenta = valores.filter((v) => v > 0)
  const prom = referencia ?? (conVenta.length ? conVenta.reduce((a, b) => a + b, 0) / conVenta.length : 0)
  const key = valores.join('|')
  return (
    <div className="d-cols" style={{ '--alto': `${alto}px` }} role="img"
      aria-label={T(`Venta de los últimos ${n} días. Hoy ${money(valores[n - 1] || 0)}. Un día normal, ${money(prom)}.`, `Sales for the last ${n} days. Today ${money(valores[n - 1] || 0)}. A normal day, ${money(prom)}.`)}>
      <div className="d-cols__finde" style={{ gridTemplateColumns: `repeat(${n},1fr)` }} aria-hidden>
        {dias.map((d) => <i key={d} className={esFinde(d) ? 'on' : ''} />)}
      </div>
      <svg key={key} viewBox={`0 0 ${n * 10} 100`} preserveAspectRatio="none" shapeRendering="geometricPrecision" aria-hidden>
        {prom > 0 && <line className="d-ref" x1="0" x2={n * 10} y1={100 - (prom / top) * 100} y2={100 - (prom / top) * 100} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
        {dias.map((d, i) => {
          const v = valores[i]
          const h = v == null ? 0 : Math.max((v / top) * 100, v > 0 ? 0.5 : 0)
          const hoy = i === n - 1
          const rect = v > 0
            ? <rect className={'d-col' + (hoy ? ' hoy' : '')} x={i * 10 + 1} width="8" y={100 - h} height={h} style={{ '--i': i }} />
            : <rect className="d-col d-col--cero" x={i * 10 + 1} width="8" y="98.5" height="1.5" style={{ '--i': i }} />
          const tapa = hoy && v > 0 ? <rect className="d-col__tapa" x={i * 10 + 1} width="8" y={100 - h} height="1.6" style={{ '--i': i }} /> : null
          const t = titulo ? titulo(i) : `${d}: ${money(v || 0)}`
          return href
            ? <a key={d} href={href(i)}><title>{t}</title>{rect}{tapa}</a>
            : <g key={d}><title>{t}</title>{rect}{tapa}</g>
        })}
      </svg>
      <div className="d-days__axis" style={{ gridTemplateColumns: `repeat(${n},1fr)` }} aria-hidden>
        {dias.map((d, i) => <span key={d} className={i === n - 1 ? 'hoy' : ''}>{i === n - 1 ? T('hoy', 'today') : d.slice(8)}</span>)}
      </div>
      <p className="d-chartfoot">
        {T(`El fondo más claro son los fines de semana. La raya cortada es un día normal (${money(prom)}).`, `The lighter background marks weekends. The dashed line is a normal day (${money(prom)}).`)}
      </p>
    </div>
  )
})

// El acumulado del día, en escalera (el dinero no crece entre pedidos).
// series: [{ clase:'referencia', puntos:[{x,y}] }, { clase:'principal', puntos }] con x en minutos del día.
export const AreaLinea = memo(function AreaLinea({ series, xMin = 660, xMax = 1380, alto = 96, vivo = false, id = 'a', formato = money, pie }) {
  const todos = series.flatMap((s) => s.puntos.map((p) => p.y))
  const yMax = techo(Math.max(...todos, 1))
  const X = (x) => ((x - xMin) / (xMax - xMin)) * 100
  const Y = (y) => 100 - (y / yMax) * 100
  const camino = (pts) => {
    if (!pts.length) return ''
    let d = `M ${X(pts[0].x).toFixed(2)} ${Y(pts[0].y).toFixed(2)}`
    for (let i = 1; i < pts.length; i++) d += ` H ${X(pts[i].x).toFixed(2)} V ${Y(pts[i].y).toFixed(2)}`
    return d
  }
  const principal = series.find((s) => s.clase === 'principal')
  const ref = series.find((s) => s.clase === 'referencia')
  const key = series.map((s) => s.puntos.map((p) => p.y.toFixed(0)).join(',')).join('|')
  const ult = principal?.puntos[principal.puntos.length - 1]
  return (
    <div className="d-area-wrap" style={{ '--alto': `${alto}px` }} role="img" aria-label={pie || ''}>
      <svg key={key} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`g-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1F9A55" stopOpacity=".35" /><stop offset="1" stopColor="#1F9A55" stopOpacity="0" />
          </linearGradient>
        </defs>
        {principal && principal.puntos.length > 1 && (
          <path className="d-area" d={`${camino(principal.puntos)} V 100 H ${X(principal.puntos[0].x).toFixed(2)} Z`} fill={`url(#g-${id})`} />
        )}
        {ref && ref.puntos.length > 1 && (
          <path className="d-linea referencia" d={camino(ref.puntos)} vectorEffect="non-scaling-stroke" />
        )}
        {principal && principal.puntos.length > 1 && (
          <path className="d-linea" d={camino(principal.puntos)} pathLength="1" vectorEffect="non-scaling-stroke" />
        )}
        {vivo && ult && (
          <g>
            <circle className="d-punto-vivo__aro" cx={X(ult.x)} cy={Y(ult.y)} r="3.5" vectorEffect="non-scaling-stroke" />
            <circle className="d-punto-vivo" cx={X(ult.x)} cy={Y(ult.y)} r="2.2" />
          </g>
        )}
      </svg>
      <div className="d-eje" aria-hidden><span>11h</span><span>14h</span><span>17h</span><span>20h</span><span>23h</span></div>
      {pie && <p className="d-chartfoot">{pie}</p>}
    </div>
  )
})

// Hoy contra el mismo día de la semana pasada. La marca clara es la referencia.
export function Bullet({ actual, base, etiqueta = 'semana pasada' }) {
  const max = Math.max(actual, base, 1) * 1.15
  return (
    <div className="d-bullet" role="img" aria-label={T(`Hoy ${money(actual)}. La ${etiqueta}, ${money(base)}.`, `Today ${money(actual)}. ${etiqueta}: ${money(base)}.`)}>
      <i className="d-bullet__fill" style={{ width: `${(actual / max) * 100}%` }} />
      <span className="d-bullet__mark" style={{ left: `${(base / max) * 100}%` }} />
      <span className="d-bullet__lab" style={{ left: `${(base / max) * 100}%` }}>{etiqueta}</span>
    </div>
  )
}

// Dona: partes de un total. Cada tramo se dibuja una vez; la cifra va en el centro.
// partes: [{ etiqueta, valor, tono, href }]. tono: ok | wait | off | down | acc
const TONO = { ok: 'var(--d-green-bar)', lit: 'var(--d-green-lit)', wait: 'var(--d-yellow)', off: 'var(--d-line-ctl)', down: 'var(--d-down)', acc: 'var(--d-green-acc)', soft: 'var(--d-green-soft)' }
export const Dona = memo(function Dona({ partes, centro, sub, formato = (v) => String(v), aria }) {
  const total = partes.reduce((t, p) => t + p.valor, 0) || 1
  let acc = 0
  const key = partes.map((p) => p.valor).join('|')
  return (
    <div className="d-dona" role="img" aria-label={aria || partes.map((p) => `${p.etiqueta}: ${formato(p.valor)}`).join('. ')}>
      <div className="d-dona__aro">
        <svg key={key} viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--d-surface-3)" strokeWidth="12" />
          {partes.map((p, i) => {
            const pct = (p.valor / total) * 100
            const start = acc; acc += pct
            if (pct <= 0) return null
            return <circle key={i} className="d-dona__seg" cx="50" cy="50" r="40" fill="none" stroke={TONO[p.tono] || TONO.ok} strokeWidth="12"
              pathLength="100" strokeDasharray={`${Math.max(pct - 1.2, 0.6)} 100`} transform={`rotate(${start * 3.6 - 90} 50 50)`} style={{ '--i': i }} />
          })}
        </svg>
        <div className="d-dona__centro"><b>{centro}</b>{sub && <span>{sub}</span>}</div>
      </div>
      <ul className="d-dona__leyenda">
        {partes.map((p, i) => (
          <li key={i}>
            <i style={{ background: TONO[p.tono] || TONO.ok }} />
            {p.href ? <a href={p.href}>{p.etiqueta}</a> : <span>{p.etiqueta}</span>}
            <b>{formato(p.valor)}</b>
          </li>
        ))}
      </ul>
    </div>
  )
})

// Barras con umbral: minutos de cada moto contra los 35 que marcan "tarde".
export const BarrasUmbral = memo(function BarrasUmbral({ filas, umbral = 35, max, unidad = 'min', href }) {
  const tope = Math.max(max || 0, umbral * 1.3, ...filas.map((f) => f.valor)) 
  return (
    <ul className="d-barras" role="img" aria-label={filas.map((f) => `${f.etiqueta}: ${f.valor} ${unidad}`).join('. ')}>
      {filas.map((f, i) => (
        <li key={i} className={f.valor > umbral ? 'tarde' : ''}>
          <span className="d-barras__lab">{href ? <a href={href(f)}>{f.etiqueta}</a> : f.etiqueta}</span>
          <span className="d-barras__track">
            <i style={{ width: `${(f.valor / tope) * 100}%`, '--i': i }} />
            <em style={{ left: `${(umbral / tope) * 100}%` }} title={`${umbral} ${unidad}`} />
          </span>
          <span className="d-barras__val">{f.valor} {unidad}</span>
        </li>
      ))}
    </ul>
  )
})

// Columnas con cualquier etiqueta (horas, días de la semana).
export const ColumnasSimples = memo(function ColumnasSimples({ etiquetas, valores, resaltar = -1, alto = 120, formato = money, href, titulo }) {
  const n = etiquetas.length
  const top = techo(Math.max(...valores, 1))
  const key = valores.join('|')
  return (
    <div className="d-cols" style={{ '--alto': `${alto}px` }} role="img" aria-label={etiquetas.map((e, i) => `${e}: ${formato(valores[i])}`).join('. ')}>
      <svg key={key} viewBox={`0 0 ${n * 10} 100`} preserveAspectRatio="none" shapeRendering="geometricPrecision" aria-hidden>
        {valores.map((v, i) => {
          const h = Math.max((v / top) * 100, v > 0 ? 0.8 : 0)
          const rect = v > 0
            ? <rect className={'d-col' + (i === resaltar ? ' hoy' : '')} x={i * 10 + 1.5} width="7" y={100 - h} height={h} style={{ '--i': i }} />
            : <rect className="d-col d-col--cero" x={i * 10 + 1.5} width="7" y="98.5" height="1.5" style={{ '--i': i }} />
          const t = titulo ? titulo(i) : `${etiquetas[i]}: ${formato(v)}`
          return href ? <a key={i} href={href(i)}><title>{t}</title>{rect}</a> : <g key={i}><title>{t}</title>{rect}</g>
        })}
      </svg>
      <div className="d-days__axis" style={{ gridTemplateColumns: `repeat(${n},1fr)` }} aria-hidden>
        {etiquetas.map((e, i) => <span key={i} className={i === resaltar ? 'hoy' : ''}>{e}</span>)}
      </div>
    </div>
  )
})
