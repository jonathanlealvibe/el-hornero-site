import { useEffect, useMemo, useRef, useState } from 'react'
import { useRoute, go } from '../router.js'
import * as S from './store.js'
import { sembrar, haySemilla } from './seed.js'
import { hhmm, fechaLarga } from './format.js'
import { PERIODOS, rangoDe, usarFiltros, irCon, hrefPanel } from './nav.js'
import { useDormido } from './motion.js'
import { ToastHost } from './Editable.jsx'
import { Hoy, Pedidos, PedidoFicha, Resumen } from './screens.jsx'
import { Camila, Clientes, Cliente, Motorizados } from './screens2.jsx'
import './dash.css'

const DESTINOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'resumen', label: 'Resumen' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'motos', label: 'Motos' },
  { key: 'camila', label: 'Camila' },
  { key: 'clientes', label: 'Clientes' },
]

export default function Panel() {
  const { id: pantalla, sub, q } = useRoute()
  const vista = pantalla || 'hoy'
  const F = usarFiltros()
  const [hoja, setHoja] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [listo, setListo] = useState(haySemilla())
  const [ultimo, setUltimo] = useState(Date.now())
  const [estadoVivo, setEstadoVivo] = useState('fresco')
  const dormido = useDormido()
  const toque = useRef(0)
  const wrapKey = `${vista}/${sub || ''}`
  const [nav, setNav] = useState('in')
  const previa = useRef(wrapKey)
  const nuevos = useRef(0)

  useEffect(() => {
    if (!listo) { sembrar({ dias: 14 }); setListo(true) }
  }, [listo])

  // Refresco cada 30 s con puerta de calma: no dispara si la persona acaba de
  // tocar o desplazar la pantalla, ni con la pestaña oculta.
  useEffect(() => {
    const marca = () => { toque.current = Date.now() }
    for (const ev of ['scroll', 'pointerdown']) window.addEventListener(ev, marca, { passive: true })
    const t = setInterval(() => {
      if (document.hidden) return
      if (Date.now() - toque.current < 800) return
      S.refrescar(); setUltimo(Date.now())
    }, 30000)
    const vis = () => { if (!document.hidden) { S.refrescar(); setUltimo(Date.now()) } }
    document.addEventListener('visibilitychange', vis)
    const vivo = setInterval(() => setEstadoVivo(Date.now() - ultimo > 180000 ? 'viejo' : 'fresco'), 15000)
    return () => {
      clearInterval(t); clearInterval(vivo); document.removeEventListener('visibilitychange', vis)
      for (const ev of ['scroll', 'pointerdown']) window.removeEventListener(ev, marca)
    }
  }, [ultimo])

  // Cambio de pantalla: entra desde abajo; al volver, desde arriba. Y arriba del todo.
  useEffect(() => {
    if (previa.current !== wrapKey) {
      const volver = q.from || (!sub && previa.current.includes('/') && previa.current.split('/')[0] === vista)
      setNav(volver && !sub ? 'back' : 'in')
      previa.current = wrapKey
      const guardado = sessionStorage.getItem('eh.scroll.' + wrapKey)
      window.scrollTo(0, guardado && volver ? +guardado : 0)
    }
    const onScroll = () => { try { sessionStorage.setItem('eh.scroll.' + wrapKey, String(window.scrollY)) } catch { /* privado */ } }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [wrapKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const rango = useMemo(() => ({ ...rangoDe(vista === 'hoy' ? 'hoy' : F.periodo, F.dia), local: F.local || undefined }), [vista, F.periodo, F.dia, F.local])
  const conectados = useMemo(() => S.localesConectados(), [listo])
  const conectadosIds = new Set(conectados.map((l) => l.id))
  const sinConectar = S.locales().filter((l) => !conectadosIds.has(l.id))
  const localNombre = F.local ? (S.localPorId(F.local)?.nombre || F.local) : 'Todos los locales'
  const periodoLabel = PERIODOS.find((p) => p.key === F.periodo)?.label || 'Hoy'
  const demo = true

  if (!listo) return <div className="dash" style={{ minHeight: '100dvh' }}><p style={{ padding: 40 }}>Preparando el tablero…</p></div>

  const cerrarHoja = () => { setCerrando(true); setTimeout(() => { setHoja(false); setCerrando(false) }, 170) }
  const setLocal = (v) => irCon({ local: v || '' })
  const setPeriodo = (v) => irCon({ periodo: v === 'hoy' ? '' : v })

  const contenido = () => {
    if (vista === 'clientes' && sub) return <Cliente id={sub} F={F} />
    if (vista === 'pedidos' && sub) return <PedidoFicha id={sub} F={F} />
    switch (vista) {
      case 'pedidos': return <Pedidos rango={rango} F={F} q={q} />
      case 'resumen': return <Resumen F={F} />
      case 'motos': return <Motorizados F={F} sel={sub} q={q} />
      case 'camila': return <Camila rango={rango} F={F} q={q} />
      case 'clientes': return <Clientes q={q} F={F} />
      default: return <Hoy F={F} onNuevos={(n) => { nuevos.current = n }} />
    }
  }

  return (
    <ToastHost>
      <div className={'dash' + (dormido ? ' dash--dormido' : '')}>
        <a className="d-skip" href="#panel-main">Saltar al contenido</a>

        <header className="d-rail">
          <a className="d-rail__mark" href={hrefPanel('hoy', {}, F)}>el Hornero<span>Operación</span></a>
          <nav>
            {DESTINOS.map((d) => (
              <a key={d.key} href={hrefPanel(d.key, {}, F)} aria-current={vista === d.key ? 'page' : undefined}>{d.label}</a>
            ))}
          </nav>
          <div className="d-rail__user">
            {demo && <span className="d-demo">Demostración · datos inventados</span>}
            <a href="#/">Ver la tienda del cliente ↗</a>
            <span className="d-vivo" data-estado={estadoVivo}>
              <i aria-hidden />
              <span aria-hidden>{estadoVivo === 'fresco' ? 'En vivo' : 'Sin actualizar desde las'} · {hhmm(ultimo)}</span>
            </span>
          </div>
        </header>

        <div className="d-filterbar">
          <strong style={{ fontSize: 15 }}>{DESTINOS.find((d) => d.key === vista)?.label || 'Panel'}</strong>
          <span className="d-quiet" style={{ fontSize: 13 }}>{fechaLarga(new Date())}</span>
          <div className="d-filterbar__right">
            {vista !== 'hoy' && (
              <select className="d-select" value={F.periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Periodo">
                {PERIODOS.filter((p) => p.key !== 'dia' || F.periodo === 'dia').map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            )}
            <select className="d-select" value={F.local} onChange={(e) => setLocal(e.target.value)} aria-label="Local">
              <option value="">Todos los locales</option>
              <optgroup label={`Conectados (${conectados.length})`}>
                {conectados.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </optgroup>
              <optgroup label={`Todavía sin conectar (${sinConectar.length})`}>
                {sinConectar.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </optgroup>
            </select>
          </div>
        </div>

        {F.periodo !== 'hoy' && vista !== 'hoy' && (
          <div className="d-histstrip">
            Está viendo {periodoLabel.toLowerCase()}, no lo de hoy
            <button type="button" className="d-linkbtn" onClick={() => setPeriodo('hoy')}>Volver a hoy</button>
          </div>
        )}

        <main className="d-main" id="panel-main">
          <div className="d-wrap" key={wrapKey} data-nav={nav}>{contenido()}</div>
        </main>
        <div role="status" aria-live="polite" className="d-sr" id="panel-status" />

        <button type="button" className="d-filterpill" onClick={() => setHoja(true)}>
          {vista === 'hoy' ? localNombre : `${periodoLabel} · ${localNombre}`} ▾
        </button>

        {hoja && (
          <div className={'d-sheetwrap' + (cerrando ? ' cerrando' : '')} onClick={cerrarHoja}>
            <div className="d-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="d-sheet__grip" />
              <h2>Filtros</h2>
              {vista !== 'hoy' && (
                <>
                  <p className="d-eyebrow">Periodo</p>
                  <div className="d-chiprow">
                    {PERIODOS.filter((p) => p.key !== 'dia').map((p) => (
                      <button key={p.key} type="button" className={'d-chipf' + (F.periodo === p.key ? ' on' : '')} onClick={() => setPeriodo(p.key)}>{p.label}</button>
                    ))}
                  </div>
                </>
              )}
              <p className="d-eyebrow">Local</p>
              <div className="d-sheetlist">
                <button type="button" className={'d-sheetrow' + (!F.local ? ' on' : '')} onClick={() => setLocal('')}>Todos los locales</button>
                {conectados.map((l) => (
                  <button key={l.id} type="button" className={'d-sheetrow' + (F.local === l.id ? ' on' : '')} onClick={() => setLocal(l.id)}>
                    <span>{l.nombre}</span><span className="d-quiet">{l.ciudad}</span>
                  </button>
                ))}
                {sinConectar.map((l) => (
                  <button key={l.id} type="button" className={'d-sheetrow' + (F.local === l.id ? ' on' : '')} onClick={() => setLocal(l.id)}>
                    <span className="d-quiet">{l.nombre}</span><span className="d-quiet">sin conectar</span>
                  </button>
                ))}
              </div>
              <button type="button" className="d-btn d-btn--primary d-btn--block" onClick={cerrarHoja}>Aplicar</button>
              <a href="#/" className="d-btn d-btn--ghost d-btn--block" style={{ marginTop: 8 }}>Ver la tienda del cliente ↗</a>
            </div>
          </div>
        )}

        <nav className="d-tabbar">
          {DESTINOS.map((d) => (
            <a key={d.key} href={hrefPanel(d.key, {}, F)} aria-current={vista === d.key ? 'page' : undefined}
              data-nuevos={d.key === 'pedidos' && vista !== 'pedidos' && nuevos.current > 0 ? '' : undefined}>{d.label}</a>
          ))}
        </nav>
      </div>
    </ToastHost>
  )
}

export { go }
