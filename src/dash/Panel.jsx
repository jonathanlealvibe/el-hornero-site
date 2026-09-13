import { useEffect, useMemo, useState } from 'react'
import { useRoute, go } from '../router.js'
import * as S from './store.js'
import { sembrar, haySemilla } from './seed.js'
import { dayKey, hhmm, fechaLarga } from './format.js'
import { Hoy, Pedidos, Ventas, Camila, Clientes, Cliente, PedidoFicha } from './screens.jsx'
import './dash.css'

const DESTINOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'camila', label: 'Camila' },
  { key: 'clientes', label: 'Clientes' },
]

const PERIODOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: 'mes', label: 'Este mes' },
]

function rangoDe(periodo) {
  const hoy = new Date()
  const k = (d) => dayKey(d)
  if (periodo === 'ayer') { const a = new Date(hoy.getTime() - 86400000); return { desde: k(a), hasta: k(a) } }
  if (periodo === '7d') return { desde: k(new Date(hoy.getTime() - 6 * 86400000)), hasta: k(hoy) }
  if (periodo === 'mes') { const p = k(hoy).slice(0, 8) + '01'; return { desde: p, hasta: k(hoy) } }
  return { desde: k(hoy), hasta: k(hoy) }
}

export default function Panel() {
  const { id: pantalla, sub, q } = useRoute()
  const vista = pantalla || 'hoy'
  const [local, setLocal] = useState(() => { try { return localStorage.getItem('eh.dash.local') || '' } catch { return '' } })
  // El periodo NO se recuerda: leer la cifra del mes creyendo que es la de hoy
  // es el único error grave posible.
  const [periodo, setPeriodo] = useState('hoy')
  const [hoja, setHoja] = useState(false)
  const [listo, setListo] = useState(haySemilla())
  const [tic, setTic] = useState(0)

  useEffect(() => {
    if (!listo) { sembrar({ dias: 14 }); setListo(true) }
  }, [listo])

  useEffect(() => { try { localStorage.setItem('eh.dash.local', local) } catch { /* ignore */ } }, [local])

  // Solo refresca cuando el periodo es Hoy: la semana pasada no cambia.
  useEffect(() => {
    if (periodo !== 'hoy') return
    const t = setInterval(() => { if (!document.hidden) setTic((n) => n + 1) }, 60000)
    const on = () => { if (!document.hidden) setTic((n) => n + 1) }
    document.addEventListener('visibilitychange', on)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', on) }
  }, [periodo])

  const rango = useMemo(() => ({ ...rangoDe(periodo), local: local || undefined }), [periodo, local, tic])
  const locs = S.locales()
  const localNombre = local ? (S.localPorId(local)?.nombre || local) : 'Todos los locales'
  const periodoLabel = PERIODOS.find((p) => p.key === periodo)?.label || 'Hoy'

  if (!listo) return <div className="dash"><p style={{ padding: 40 }}>Preparando el tablero…</p></div>

  const contenido = () => {
    if (vista === 'clientes' && sub) return <Cliente id={sub} />
    if (vista === 'pedidos' && sub) return <PedidoFicha id={sub} />
    switch (vista) {
      case 'pedidos': return <Pedidos rango={rango} q={q} />
      case 'ventas': return <Ventas rango={rango} q={q} periodoLabel={periodoLabel} />
      case 'camila': return <Camila rango={rango} />
      case 'clientes': return <Clientes q={q} />
      default: return <Hoy rango={rango} local={local} onLocal={setLocal} />
    }
  }

  return (
    <div className="dash">
      <a className="d-skip" href="#panel-main">Saltar al contenido</a>

      <header className="d-rail">
        <a className="d-rail__mark" href="#/panel/hoy">el Hornero<span>Operación</span></a>
        <nav>
          {DESTINOS.map((d) => (
            <a key={d.key} href={`#/panel/${d.key}`} aria-current={vista === d.key ? 'page' : undefined}>{d.label}</a>
          ))}
        </nav>
        <div className="d-rail__user">
          <a href="#/" style={{ color: 'rgba(255,255,255,.82)' }}>Ver la tienda ↗</a>
        </div>
      </header>

      <div className="d-filterbar">
        <strong style={{ fontSize: 15 }}>{DESTINOS.find((d) => d.key === vista)?.label || 'Panel'}</strong>
        <span className="d-muted" style={{ fontSize: 13 }}>{fechaLarga(new Date())}</span>
        <div className="d-filterbar__right">
          {vista !== 'hoy' && (
            <select className="d-select" value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Periodo">
              {PERIODOS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          )}
          <select className="d-select" value={local} onChange={(e) => setLocal(e.target.value)} aria-label="Local">
            <option value="">Todos los locales</option>
            {locs.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </div>
      </div>

      {periodo !== 'hoy' && vista !== 'hoy' && (
        <div className="d-histstrip">
          Viendo {periodoLabel.toLowerCase()} · no son datos de hoy
          <button type="button" className="d-linkbtn" onClick={() => setPeriodo('hoy')}>Volver a hoy</button>
        </div>
      )}

      <main className="d-main" id="panel-main">
        <div className="d-wrap">{contenido()}</div>
        <p className="d-updated" aria-live="polite">Actualizado {hhmm(new Date())}</p>
      </main>

      <button type="button" className="d-filterpill" onClick={() => setHoja(true)}>
        {periodoLabel} · {localNombre} ▾
      </button>

      {hoja && (
        <div className="d-sheetwrap" onClick={() => setHoja(false)}>
          <div className="d-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Filtros</h2>
            {vista !== 'hoy' && (
              <>
                <p className="d-eyebrow">Periodo</p>
                <div className="d-chiprow">
                  {PERIODOS.map((p) => (
                    <button key={p.key} type="button"
                      className={'d-chipf' + (periodo === p.key ? ' on' : '')}
                      onClick={() => setPeriodo(p.key)}>{p.label}</button>
                  ))}
                </div>
              </>
            )}
            <p className="d-eyebrow">Local</p>
            <div className="d-sheetlist">
              <button type="button" className={'d-sheetrow' + (!local ? ' on' : '')} onClick={() => setLocal('')}>
                Todos los locales
              </button>
              {locs.map((l) => (
                <button key={l.id} type="button" className={'d-sheetrow' + (local === l.id ? ' on' : '')}
                  onClick={() => setLocal(l.id)}>
                  <span>{l.nombre}</span><span className="d-muted">{l.ciudad}</span>
                </button>
              ))}
            </div>
            <button type="button" className="d-btn d-btn--primary d-btn--block" onClick={() => setHoja(false)}>Aplicar</button>
          </div>
        </div>
      )}

      <nav className="d-tabbar">
        {DESTINOS.map((d) => (
          <a key={d.key} href={`#/panel/${d.key}`} aria-current={vista === d.key ? 'page' : undefined}>{d.label}</a>
        ))}
      </nav>
    </div>
  )
}

export { go }
