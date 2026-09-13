import { Fragment, memo, useRef } from 'react'
import { money, money0 } from './format.js'
import { T } from './i18n.js'

// Regla de la casa: el SVG dibuja formas; las palabras van en HTML al lado.
// Cada gráfico anima UNA vez por serie (key = valores), nunca en cada refresco.
// Cero ≠ sin dato: 0 es un filo de 2 px, null es un hueco.

export const techo = (m) => {
  const p = m < 100 ? 20 : m < 500 ? 50 : m < 2000 ? 100 : 250
  return Math.max(p, Math.ceil(m / p) * p)
}

// Escala "bonita" para las rejillas: el tope es un múltiplo redondo y las
// rayas caen en cifras que se leen de un vistazo ($250, $500… o 5, 10, 15).
const pasoBonito = (x, entero) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(x, 1e-9)))
  const f = x / p
  const m = entero && p < 10
    ? (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10)
    : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10)
  return Math.max(entero ? 1 : 0, m * p)
}
export function escala(max, { lineas = 4, entero = false } = {}) {
  const m = Math.max(max, entero ? 4 : 1)
  const paso = pasoBonito(m / lineas, entero)
  const top = Math.ceil(m / paso - 1e-9) * paso
  const ticks = []
  for (let v = paso; v <= top + 1e-9; v += paso) ticks.push(+v.toFixed(6))
  return { top, ticks }
}

const esFinde = (dia) => [5, 6, 0].includes(new Date(dia + 'T12:00:00-05:00').getDay())

// Ids para los degradados: uno por instancia, estable entre renders.
let contadorIds = 0
const useIdGrafico = (prefijo) => { const r = useRef(null); if (!r.current) r.current = `${prefijo}${++contadorIds}`; return r.current }

// Rejilla: las rayas van dentro del SVG (formas) y las cifras en HTML, a la
// izquierda, en la canaleta que deja `.con-rejilla`.
export const LineasRejilla = ({ ticks, top, ancho = 100 }) => ticks.map((v) => (
  <line key={v} className="d-rejilla__linea" x1="0" x2={ancho} y1={100 - (v / top) * 100} y2={100 - (v / top) * 100} vectorEffect="non-scaling-stroke" />
))
export const Rejilla = ({ ticks, top, formato = money0 }) => (
  <div className="d-rejilla" aria-hidden>
    {ticks.map((v) => <span key={v} style={{ bottom: `${(v / top) * 100}%` }}>{formato(v)}</span>)}
  </div>
)

// Leyenda en HTML: un cuadrito con la clase de la serie y su nombre.
export const Leyenda = ({ items }) => (
  <ul className="d-leyenda" aria-hidden>
    {items.map((it, i) => <li key={i}><i className={`d-sw ${it.clase || ''}`} />{it.etiqueta}</li>)}
  </ul>
)

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

// Columnas apiladas de los últimos días: cada día partido en sus series (por
// dónde entró el pedido). Cada día es un enlace; hoy lleva la tapa amarilla.
// series: [{ etiqueta, valores, tono:'a'|'b'|'c' }]
export const ColumnasApiladas = memo(function ColumnasApiladas({ dias, series, referencia, alto = 150, href, titulo, formato = money, formatoEje = money0 }) {
  const n = dias.length
  const totales = dias.map((_, i) => series.reduce((t, s) => t + (s.valores[i] || 0), 0))
  const { top, ticks } = escala(Math.max(...totales, 1))
  const conVenta = totales.filter((v) => v > 0)
  const prom = referencia ?? (conVenta.length ? conVenta.reduce((a, b) => a + b, 0) / conVenta.length : 0)
  const key = series.map((s) => s.valores.map((v) => Math.round(v || 0)).join(',')).join('|')
  return (
    <div className="d-cols con-rejilla" style={{ '--alto': `${alto}px` }} role="img"
      aria-label={T(`Venta de los últimos ${n} días por canal. Hoy ${money(totales[n - 1] || 0)}. Un día normal, ${money(prom)}.`, `Sales for the last ${n} days by channel. Today ${money(totales[n - 1] || 0)}. A normal day, ${money(prom)}.`)}>
      <div className="d-cols__finde" style={{ gridTemplateColumns: `repeat(${n},1fr)` }} aria-hidden>
        {dias.map((d) => <i key={d} className={esFinde(d) ? 'on' : ''} />)}
      </div>
      <Rejilla ticks={ticks} top={top} formato={formatoEje} />
      <svg key={key} viewBox={`0 0 ${n * 10} 100`} preserveAspectRatio="none" shapeRendering="geometricPrecision" aria-hidden>
        <LineasRejilla ticks={ticks} top={top} ancho={n * 10} />
        {prom > 0 && <line className="d-ref" x1="0" x2={n * 10} y1={100 - (prom / top) * 100} y2={100 - (prom / top) * 100} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
        {dias.map((d, i) => {
          const hoy = i === n - 1
          const total = totales[i]
          let acc = 0
          const segs = series.map((s, j) => {
            const v = s.valores[i] || 0
            if (v <= 0) return null
            const h = (v / top) * 100
            acc += h
            return <rect key={j} className={`d-seg d-seg--${s.tono || 'a'}`} x={i * 10 + 1} width="8" y={100 - acc} height={Math.max(h, 0.4)} />
          })
          const cuerpo = (
            <g className="d-apilada" style={{ '--i': i }}>
              <title>{titulo ? titulo(i) : `${d}: ${formato(total)}`}</title>
              {total > 0 ? segs : <rect className="d-col d-col--cero" x={i * 10 + 1} width="8" y="98.5" height="1.5" />}
              {hoy && total > 0 && <rect className="d-col__tapa" x={i * 10 + 1} width="8" y={100 - acc} height="1.6" />}
            </g>
          )
          return href ? <a key={d} href={href(i)}>{cuerpo}</a> : <g key={d}>{cuerpo}</g>
        })}
      </svg>
      <div className="d-days__axis" style={{ gridTemplateColumns: `repeat(${n},1fr)` }} aria-hidden>
        {dias.map((d, i) => <span key={d} className={i === n - 1 ? 'hoy' : ''}>{i === n - 1 ? T('hoy', 'today') : d.slice(8)}</span>)}
      </div>
      <Leyenda items={series.map((s) => ({ etiqueta: s.etiqueta, clase: `d-seg--${s.tono || 'a'}` }))} />
    </div>
  )
})

// Columnas de a dos: la misma categoría en dos series, lado a lado (hoy contra
// la semana pasada, hora por hora). null es "todavía no llega esa hora".
// series: [{ etiqueta, valores, clase }]; la primera serie es la de hoy.
export const ColumnasDobles = memo(function ColumnasDobles({ etiquetas, series, alto = 150, formato = (v) => String(v), entero = true, resaltar = -1, titulo, rejilla = true }) {
  const n = etiquetas.length
  const todos = series.flatMap((s) => s.valores).filter((v) => v != null)
  const { top, ticks } = escala(Math.max(...todos, 1), { entero })
  const key = series.map((s) => s.valores.map((v) => (v == null ? '-' : v)).join(',')).join('|')
  const k = series.length, bw = 7 / k
  return (
    <div className={'d-cols' + (rejilla ? ' con-rejilla' : '')} style={{ '--alto': `${alto}px` }} role="img"
      aria-label={etiquetas.map((e, i) => `${e}: ${series.map((s) => `${s.etiqueta} ${s.valores[i] == null ? '—' : formato(s.valores[i])}`).join(', ')}`).join('. ')}>
      {rejilla && <Rejilla ticks={ticks} top={top} formato={formato} />}
      <svg key={key} viewBox={`0 0 ${n * 10} 100`} preserveAspectRatio="none" shapeRendering="geometricPrecision" aria-hidden>
        {rejilla && <LineasRejilla ticks={ticks} top={top} ancho={n * 10} />}
        {etiquetas.map((e, i) => {
          const t = titulo ? titulo(i) : `${e}: ${series.map((s) => `${s.etiqueta} ${s.valores[i] == null ? '—' : formato(s.valores[i])}`).join(' · ')}`
          return (
            <g key={i}>
              <title>{t}</title>
              {series.map((s, j) => {
                const v = s.valores[i]
                if (v == null) return null
                const x = i * 10 + 1.5 + j * bw
                const h = Math.max((v / top) * 100, v > 0 ? 0.8 : 0)
                if (!(v > 0)) return <rect key={j} className={`d-col d-col--cero ${s.clase || ''}`} x={x} width={bw - 0.5} y="98.5" height="1.5" style={{ '--i': i }} />
                return (
                  <Fragment key={j}>
                    <rect className={`d-col ${s.clase || ''}`} x={x} width={bw - 0.5} y={100 - h} height={h} style={{ '--i': i }} />
                    {j === 0 && i === resaltar && <rect className="d-col__tapa" x={x} width={bw - 0.5} y={100 - h} height="1.6" style={{ '--i': i }} />}
                  </Fragment>
                )
              })}
            </g>
          )
        })}
      </svg>
      <div className="d-days__axis" style={{ gridTemplateColumns: `repeat(${n},1fr)` }} aria-hidden>
        {etiquetas.map((e, i) => <span key={i} className={i === resaltar ? 'hoy' : ''}>{e}</span>)}
      </div>
      <Leyenda items={series.map((s) => ({ etiqueta: s.etiqueta, clase: s.clase }))} />
    </div>
  )
})

// Chispa: la línea de los últimos días debajo de una cifra. Línea fina, área
// suave y un punto en el último valor (hoy). null corta la línea.
export const Chispa = memo(function Chispa({ valores, alto = 34, tono = 'ok', etiquetas, formato = (v) => String(v), aria }) {
  const id = useIdGrafico('ch')
  const n = valores.length
  const vs = valores.filter((v) => v != null)
  const key = valores.map((v) => (v == null ? '-' : Math.round(v * 100))).join(',')
  if (vs.length < 2) return <div className="d-chispa d-chispa--vacia" style={{ '--alto': `${alto}px` }} aria-hidden />
  const min = Math.min(...vs), max = Math.max(...vs)
  const X = (i) => (n === 1 ? 50 : (i / (n - 1)) * 100)
  const Y = (v) => (max === min ? 50 : 92 - ((v - min) / (max - min)) * 78)
  // Tramos contiguos: un hueco corta la línea en vez de inventar un puente.
  const tramos = []
  let actual = []
  valores.forEach((v, i) => { if (v == null) { if (actual.length) tramos.push(actual); actual = [] } else actual.push({ x: X(i), y: Y(v) }) })
  if (actual.length) tramos.push(actual)
  const linea = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const ult = tramos[tramos.length - 1][tramos[tramos.length - 1].length - 1]
  const label = aria || valores.map((v, i) => `${etiquetas ? etiquetas[i] : i + 1}: ${v == null ? '—' : formato(v, i)}`).join('. ')
  return (
    <div className={`d-chispa d-chispa--${tono}`} style={{ '--alto': `${alto}px` }} role="img" aria-label={label}>
      <svg key={key} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`g-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--m-tono)', stopOpacity: 0.32 }} />
            <stop offset="1" style={{ stopColor: 'var(--m-tono)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {tramos.map((pts, i) => pts.length > 1 && (
          <path key={`a${i}`} className="d-chispa__area" d={`${linea(pts)} V 100 H ${pts[0].x.toFixed(2)} Z`} fill={`url(#g-${id})`} />
        ))}
        {tramos.map((pts, i) => pts.length > 1 && (
          <path key={`l${i}`} className="d-chispa__linea" d={linea(pts)} pathLength="1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <i className="d-chispa__punto" style={{ left: `${ult.x}%`, top: `${ult.y}%` }} aria-hidden />
    </div>
  )
})

// Mapa de calor: filas × columnas, la intensidad va del azul (poco) al verde
// encendido (mucho) y la celda más alta se pinta de amarillo. La cifra sale al
// pasar el ratón y, con sitio, impresa en la celda.
export const Calor = memo(function Calor({ filas, columnas, valores, formato = money, aria }) {
  const todos = valores.flat().filter((v) => v != null)
  const max = Math.max(...todos, 0)
  const key = todos.map((v) => Math.round(v)).join(',')
  const label = aria || filas.map((f, i) => `${f}: ${columnas.map((c, j) => `${c} ${valores[i][j] == null ? '—' : formato(valores[i][j])}`).join(', ')}`).join('. ')
  return (
    <div key={key} className="d-calor" style={{ '--n': columnas.length }} role="img" aria-label={label}>
      <span className="d-calor__esq" aria-hidden />
      {columnas.map((c, j) => <span key={`c${j}`} className="d-calor__col" aria-hidden>{c}</span>)}
      {filas.map((f, i) => (
        <Fragment key={f}>
          <span className="d-calor__fila" aria-hidden>{f}</span>
          {columnas.map((c, j) => {
            const v = valores[i][j]
            if (v == null) return <div key={j} className="d-calor__celda es-vacia" title={`${f} ${c}: ${T('sin dato', 'no data')}`} aria-hidden />
            const t = max > 0 ? v / max : 0
            const esMax = max > 0 && v === max
            const fuerte = t >= 0.55
            const mezcla = t < 0.5
              ? `color-mix(in srgb, var(--d-green-bar) ${Math.round(t * 200)}%, var(--d-blue))`
              : `color-mix(in srgb, var(--d-green-lit) ${Math.round((t - 0.5) * 200)}%, var(--d-green-bar))`
            return (
              <div key={j} className={'d-calor__celda' + (esMax ? ' es-max' : fuerte ? ' es-fuerte' : '') + (v === 0 ? ' es-cero' : '')}
                title={`${f} ${c}: ${formato(v)}`} style={{ '--i': i * columnas.length + j }} aria-hidden>
                <i style={v > 0 && !esMax ? { background: mezcla, opacity: 0.22 + 0.78 * t } : undefined} />
                <span>{v > 0 ? formato(v) : '0'}</span>
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
})

// El acumulado del día, en escalera (el dinero no crece entre pedidos).
// series: [{ clase:'referencia', puntos:[{x,y}] }, { clase:'principal', puntos }] con x en minutos del día.
export const AreaLinea = memo(function AreaLinea({ series, xMin = 660, xMax = 1380, alto = 96, vivo = false, id = 'a', formato = money, pie, rejilla = false, formatoEje = money0 }) {
  const todos = series.flatMap((s) => s.puntos.map((p) => p.y))
  const max = Math.max(...todos, 1)
  const { top: yMax, ticks } = rejilla ? escala(max) : { top: techo(max), ticks: [] }
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
    <div className={'d-area-wrap' + (rejilla ? ' con-rejilla' : '')} style={{ '--alto': `${alto}px` }} role="img" aria-label={pie || ''}>
      {rejilla && <Rejilla ticks={ticks} top={yMax} formato={formatoEje} />}
      <svg key={key} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`g-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--d-green-bar)', stopOpacity: 0.35 }} /><stop offset="1" style={{ stopColor: 'var(--d-green-bar)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {rejilla && <LineasRejilla ticks={ticks} top={yMax} ancho={100} />}
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

// Hoy contra el mismo día de la semana pasada. La marca azul es la referencia.
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
const TONO = { ok: 'var(--d-green-bar)', lit: 'var(--d-green-lit)', wait: 'var(--d-yellow)', off: 'var(--d-line-ctl)', down: 'var(--d-down)', acc: 'var(--d-green-acc)', soft: 'var(--d-green-soft)', blue: 'var(--d-blue)' }
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
export const ColumnasSimples = memo(function ColumnasSimples({ etiquetas, valores, resaltar = -1, alto = 120, formato = money, href, titulo, rejilla = false, formatoEje = money0, entero = false }) {
  const n = etiquetas.length
  const max = Math.max(...valores, 1)
  const { top, ticks } = rejilla ? escala(max, { entero }) : { top: techo(max), ticks: [] }
  const key = valores.join('|')
  return (
    <div className={'d-cols' + (rejilla ? ' con-rejilla' : '')} style={{ '--alto': `${alto}px` }} role="img" aria-label={etiquetas.map((e, i) => `${e}: ${formato(valores[i])}`).join('. ')}>
      {rejilla && <Rejilla ticks={ticks} top={top} formato={formatoEje} />}
      <svg key={key} viewBox={`0 0 ${n * 10} 100`} preserveAspectRatio="none" shapeRendering="geometricPrecision" aria-hidden>
        {rejilla && <LineasRejilla ticks={ticks} top={top} ancho={n * 10} />}
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
