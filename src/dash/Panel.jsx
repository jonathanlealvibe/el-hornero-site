import { useEffect, useMemo, useRef, useState } from 'react'
import { useRoute, go } from '../router.js'
import * as S from './store.js'
import { sembrar, haySemilla } from './seed.js'
import { hhmm, fechaLarga } from './format.js'
import { PERIODOS, rangoDe, usarFiltros, irCon, hrefPanel } from './nav.js'
import { useDormido } from './motion.js'
import { T, getLang, setLang, getTema, setTema, getDatos, setDatos } from './i18n.js'
import { importarPedidosDelSitio, avisarTienda } from './vivo.js'
import { ToastHost } from './Editable.jsx'
import { Hoy, Pedidos, PedidoFicha, Resumen } from './screens.jsx'
import { Camila, Clientes, Cliente, Motorizados } from './screens2.jsx'
import './dash.css'

const DESTINOS = () => [
  { key: 'hoy', label: T('Centro de mando', 'Command center') },
  { key: 'resumen', label: T('Resumen', 'Summary') },
  { key: 'pedidos', label: T('Pedidos', 'Orders') },
  { key: 'motos', label: T('Motos', 'Riders') },
  { key: 'camila', label: 'Camila' },
  { key: 'clientes', label: T('Clientes', 'Customers') },
]

S.conectarTienda(avisarTienda)

export default function Panel() {
  const { id: pantalla, sub, q } = useRoute()
  const vista = pantalla || 'hoy'
  const F = usarFiltros()
  const [hoja, setHoja] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [idioma, setIdioma] = useState(getLang())
  const [tema, setTemaEstado] = useState(getTema())
  const [datos, setDatosEstado] = useState(getDatos())
  const [listo, setListo] = useState(false)
  const [ultimo, setUltimo] = useState(Date.now())
  const [estadoVivo, setEstadoVivo] = useState('fresco')
  const dormido = useDormido()
  const toque = useRef(0)
  const wrapKey = `${vista}/${sub || ''}`
  const [nav, setNav] = useState('in')
  const previa = useRef(wrapKey)
  const nuevos = useRef(0)

  // Demostración: se siembra una vez. En vivo: se traen los pedidos de la tienda.
  useEffect(() => {
    if (datos === 'demo') { if (!haySemilla()) sembrar({ dias: 14 }) }
    else importarPedidosDelSitio()
    setListo(true)
  }, [datos])

  // Refresco cada 30 s con puerta de calma: no dispara si la persona acaba de
  // tocar o desplazar la pantalla, ni con la pestaña oculta. En vivo, además,
  // cualquier pedido nuevo de la tienda (otra pestaña) entra al instante.
  useEffect(() => {
    const marca = () => { toque.current = Date.now() }
    for (const ev of ['scroll', 'pointerdown']) window.addEventListener(ev, marca, { passive: true })
    const refrescar = () => { if (datos === 'vivo') importarPedidosDelSitio(); S.refrescar(); setUltimo(Date.now()) }
    const t = setInterval(() => {
      if (document.hidden) return
      if (Date.now() - toque.current < 800) return
      refrescar()
    }, datos === 'vivo' ? 5000 : 30000)
    const vis = () => { if (!document.hidden) refrescar() }
    const alm = (e) => { if (e.key === 'elhornero.orders' && datos === 'vivo') refrescar() }
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('storage', alm)
    const vivo = setInterval(() => setEstadoVivo(Date.now() - ultimo > 180000 ? 'viejo' : 'fresco'), 15000)
    return () => {
      clearInterval(t); clearInterval(vivo); document.removeEventListener('visibilitychange', vis); window.removeEventListener('storage', alm)
      for (const ev of ['scroll', 'pointerdown']) window.removeEventListener(ev, marca)
    }
  }, [ultimo, datos])

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

  const cambiarIdioma = (l) => { setLang(l); setIdioma(l); S.refrescar() }
  const cambiarTema = (t) => { setTemaEstado(setTema(t)) }
  const cambiarDatos = (d) => { setDatosEstado(setDatos(d)); S.setModo(d) }

  const rango = useMemo(() => ({ ...rangoDe(vista === 'hoy' ? 'hoy' : F.periodo, F.dia), local: F.local || undefined }), [vista, F.periodo, F.dia, F.local])
  const conectados = useMemo(() => S.localesConectados(), [listo, datos]) // eslint-disable-line react-hooks/exhaustive-deps
  const conectadosIds = new Set(conectados.map((l) => l.id))
  const sinConectar = S.locales().filter((l) => !conectadosIds.has(l.id))
  const localNombre = F.local ? (S.localPorId(F.local)?.nombre || F.local) : T('Todos los locales', 'All branches')
  const periodoLabel = PERIODOS.find((p) => p.key === F.periodo)?.label || T('Hoy', 'Today')
  const D = DESTINOS()

  if (!listo) return <div className={'dash' + (tema === 'claro' ? ' dash--claro' : '')} style={{ minHeight: '100dvh' }}><p style={{ padding: 40 }}>{T('Preparando el tablero…', 'Preparing the dashboard…')}</p></div>

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
      default: return <Hoy F={F} datos={datos} onNuevos={(n) => { nuevos.current = n }} />
    }
  }

  const Conmutadores = () => (
    <>
      <div className="d-conm d-conm--datos" role="group" aria-label={T('Datos', 'Data')}>
        <button type="button" aria-pressed={datos === 'demo'} onClick={() => cambiarDatos('demo')}>{T('Demo', 'Demo')}</button>
        <button type="button" className="vivo" aria-pressed={datos === 'vivo'} onClick={() => cambiarDatos('vivo')}>{T('En vivo', 'Live')}</button>
      </div>
      <div className="d-conm" role="group" aria-label={T('Tema', 'Theme')}>
        <button type="button" aria-pressed={tema === 'oscuro'} onClick={() => cambiarTema('oscuro')}>{T('Oscuro', 'Dark')}</button>
        <button type="button" aria-pressed={tema === 'claro'} onClick={() => cambiarTema('claro')}>{T('Claro', 'Light')}</button>
      </div>
      <div className="d-conm" role="group" aria-label={T('Idioma', 'Language')}>
        <button type="button" aria-pressed={idioma === 'es'} onClick={() => cambiarIdioma('es')}>ES</button>
        <button type="button" aria-pressed={idioma === 'en'} onClick={() => cambiarIdioma('en')}>EN</button>
      </div>
    </>
  )

  return (
    <ToastHost>
      <div className={'dash' + (dormido ? ' dash--dormido' : '') + (tema === 'claro' ? ' dash--claro' : '')} lang={idioma}>
        <a className="d-skip" href="#panel-main">{T('Saltar al contenido', 'Skip to content')}</a>

        <header className="d-rail">
          <a className="d-rail__mark" href={hrefPanel('hoy', {}, F)}>el Hornero<span>{T('Operación', 'Operations')}</span></a>
          <nav>
            {D.map((d) => (
              <a key={d.key} href={hrefPanel(d.key, {}, F)} aria-current={vista === d.key ? 'page' : undefined}>{d.label}</a>
            ))}
          </nav>
          <div className="d-rail__user">
            <div className="d-rail__conms"><Conmutadores /></div>
            <span className="d-demo">{datos === 'demo' ? T('Datos inventados', 'Made-up data') : T('Pedidos reales de la tienda', 'Real store orders')}</span>
            <span className="d-vivo" data-estado={estadoVivo}>
              <i aria-hidden />
              <span aria-hidden>{estadoVivo === 'fresco' ? T('En vivo', 'Live') : T('Sin actualizar desde las', 'Not updated since')} · {hhmm(ultimo)}</span>
            </span>
          </div>
        </header>

        <div className="d-filterbar">
          <strong style={{ fontSize: 15 }}>{D.find((d) => d.key === vista)?.label || 'Panel'}</strong>
          <span className="d-quiet" style={{ fontSize: 13 }}>{fechaLarga(new Date())}</span>
          <a className="d-tienda" href="#/" target="_blank" rel="noreferrer">{T('Ver la tienda del cliente ↗', 'Open the customer store ↗')}</a>
          <div className="d-filterbar__right">
            {vista !== 'hoy' && (
              <select className="d-select" value={F.periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label={T('Periodo', 'Period')}>
                {PERIODOS.filter((p) => p.key !== 'dia' || F.periodo === 'dia').map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            )}
            <select className="d-select" value={F.local} onChange={(e) => setLocal(e.target.value)} aria-label={T('Local', 'Branch')}>
              <option value="">{T('Todos los locales', 'All branches')}</option>
              <optgroup label={`${T('Conectados', 'Connected')} (${conectados.length})`}>
                {conectados.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </optgroup>
              <optgroup label={`${T('Todavía sin conectar', 'Not connected yet')} (${sinConectar.length})`}>
                {sinConectar.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </optgroup>
            </select>
          </div>
        </div>

        {F.periodo !== 'hoy' && vista !== 'hoy' && (
          <div className="d-histstrip">
            {T(`Está viendo ${periodoLabel.toLowerCase()}, no lo de hoy`, `You are looking at ${periodoLabel.toLowerCase()}, not today`)}
            <button type="button" className="d-linkbtn" onClick={() => setPeriodo('hoy')}>{T('Volver a hoy', 'Back to today')}</button>
          </div>
        )}

        <main className="d-main" id="panel-main">
          <div className="d-wrap" key={wrapKey + idioma + datos} data-nav={nav}>{contenido()}</div>
        </main>
        <div role="status" aria-live="polite" className="d-sr" id="panel-status" />

        <button type="button" className="d-filterpill" onClick={() => setHoja(true)}>
          {vista === 'hoy' ? localNombre : `${periodoLabel} · ${localNombre}`} ▾
        </button>

        {hoja && (
          <div className={'d-sheetwrap' + (cerrando ? ' cerrando' : '')} onClick={cerrarHoja}>
            <div className="d-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="d-sheet__grip" />
              <h2>{T('Filtros', 'Filters')}</h2>
              <div className="d-conms"><Conmutadores /></div>
              {vista !== 'hoy' && (
                <>
                  <p className="d-eyebrow">{T('Periodo', 'Period')}</p>
                  <div className="d-chiprow">
                    {PERIODOS.filter((p) => p.key !== 'dia').map((p) => (
                      <button key={p.key} type="button" className={'d-chipf' + (F.periodo === p.key ? ' on' : '')} onClick={() => setPeriodo(p.key)}>{p.label}</button>
                    ))}
                  </div>
                </>
              )}
              <p className="d-eyebrow">{T('Local', 'Branch')}</p>
              <div className="d-sheetlist">
                <button type="button" className={'d-sheetrow' + (!F.local ? ' on' : '')} onClick={() => setLocal('')}>{T('Todos los locales', 'All branches')}</button>
                {conectados.map((l) => (
                  <button key={l.id} type="button" className={'d-sheetrow' + (F.local === l.id ? ' on' : '')} onClick={() => setLocal(l.id)}>
                    <span>{l.nombre}</span><span className="d-quiet">{l.ciudad}</span>
                  </button>
                ))}
                {sinConectar.map((l) => (
                  <button key={l.id} type="button" className={'d-sheetrow' + (F.local === l.id ? ' on' : '')} onClick={() => setLocal(l.id)}>
                    <span className="d-quiet">{l.nombre}</span><span className="d-quiet">{T('sin conectar', 'not connected')}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="d-btn d-btn--primary d-btn--block" onClick={cerrarHoja}>{T('Aplicar', 'Apply')}</button>
              <a href="#/" className="d-btn d-btn--ghost d-btn--block" style={{ marginTop: 8 }}>{T('Ver la tienda del cliente ↗', 'Open the customer store ↗')}</a>
            </div>
          </div>
        )}

        <nav className="d-tabbar">
          {D.map((d) => (
            <a key={d.key} href={hrefPanel(d.key, {}, F)} aria-current={vista === d.key ? 'page' : undefined}
              data-nuevos={d.key === 'pedidos' && vista !== 'pedidos' && nuevos.current > 0 ? '' : undefined}>{d.label}</a>
          ))}
        </nav>
      </div>
    </ToastHost>
  )
}

export { go }
