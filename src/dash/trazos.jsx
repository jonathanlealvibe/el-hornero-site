import { memo } from 'react'
import { money } from './format.js'

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
      aria-label={`Venta de los últimos ${n} días. Hoy ${money(valores[n - 1] || 0)}. Un día normal, ${money(prom)}.`}>
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
        {dias.map((d, i) => <span key={d} className={i === n - 1 ? 'hoy' : ''}>{i === n - 1 ? 'hoy' : d.slice(8)}</span>)}
      </div>
      <p className="d-chartfoot">
        El fondo más claro son los fines de semana. La raya cortada es un día normal ({money(prom)}).
        {pedidos ? '' : ''}
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
    <div className="d-bullet" role="img" aria-label={`Hoy ${money(actual)}. La ${etiqueta}, ${money(base)}.`}>
      <i className="d-bullet__fill" style={{ width: `${(actual / max) * 100}%` }} />
      <span className="d-bullet__mark" style={{ left: `${(base / max) * 100}%` }} />
      <span className="d-bullet__lab" style={{ left: `${(base / max) * 100}%` }}>{etiqueta}</span>
    </div>
  )
}
