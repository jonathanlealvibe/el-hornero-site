import { useEffect, useMemo, useRef, useState } from 'react'
import * as S from './store.js'
import FleetMap from './FleetMap.jsx'
import { PorQueCambio, DondeSeVendeMas } from './graficos.jsx'
import { Columnas, AreaLinea, Bullet } from './trazos.jsx'
import { money, num, hhmm, fecha, fechaLarga, tasa, SIN_DATO, UMBRALES } from './format.js'
import { hrefPanel, irCon, PERIODO_FRASE } from './nav.js'
import { useVersion } from './useStore.js'
import { useEntrada, useNuevos, usarCifra, marcar, useMovil } from './motion.js'
import { cuenta, CANAL, MODALIDAD, PAGO, ESTADO, estadoTexto, tituloLista, titularHoy, diaSemana, diaLargo } from './textos.js'
import { EstadoPedido, CampoEditable, useToast } from './Editable.jsx'

/* ---------------------------------------------------------------- piezas */

export const Card = ({ title, sub, tools, children, foot, span, i, className = '' }) => (
  <section className={'d-card' + (span ? ` d-c${span}` : '') + (className ? ` ${className}` : '')} style={i != null ? { '--i': i } : undefined}>
    {(title || tools) && (
      <div className="d-card__head">
        <div>
          <h2 className="d-card__title">{title}</h2>
          {sub && <p className="d-card__sub">{sub}</p>}
        </div>
        {tools && <div className="d-card__tools">{tools}</div>}
      </div>
    )}
    <div className="d-card__body">{children}</div>
    {foot && <div className="d-card__foot">{foot}</div>}
  </section>
)

// Cada cifra abre las filas que la suman. Con 0 no hay enlace: no hay nada que abrir.
export const Stat = ({ label, value, foot, href, go, tono, ariaGo }) => {
  const inner = (
    <>
      <span className="d-stat__label">{label}</span>
      <span className={'d-stat__value' + (tono ? ` ${tono}` : '')}>{value}</span>
      {foot && <span className="d-stat__foot">{foot}</span>}
      {href && go && <span className="d-stat__go">{go} ›</span>}
      {href && <span className="d-stat__chev" aria-hidden>›</span>}
    </>
  )
  return href
    ? <a className="d-stat" href={href} data-drill aria-label={ariaGo || `${label}: ${value}. ${go || 'Ver el detalle'}`}>{inner}</a>
    : <article className="d-stat" aria-disabled={value === SIN_DATO || undefined}>{inner}</article>
}

// Con pocos datos, una lista ordenada con la cifra impresa le gana a cualquier
// gráfico. El nombre filtra; la cifra abre.
export const Rank = ({ rows, label = (r) => r.nombre, value = (r) => r.total, meta, onName, href, d0 = 0, vacio = 'Aún ningún dato en este periodo.' }) => {
  const max = Math.max(...rows.map(value), 1)
  if (!rows.length) return <p className="d-empty">{vacio}</p>
  return (
    <ol className="d-rank">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="d-rank__row">
            <span className="d-rank__name">
              {onName ? <button type="button" onClick={() => onName(r)}>{label(r)}</button> : label(r)}
            </span>
            <span className="d-rank__bar"><i style={{ width: `${Math.max((value(r) / max) * 100, value(r) > 0 ? 2 : 0)}%`, '--i': i, '--d0': `${d0}ms` }} /></span>
            {href
              ? <a className="d-rank__val" href={href(r)} data-drill>{money(value(r))}</a>
              : <span className="d-rank__val">{money(value(r))}</span>}
            {meta && <span className="d-rank__meta">{meta(r)}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export const Badge = ({ estado, modalidad }) => {
  const t = (modalidad === 'retiro' ? { ...ESTADO, camino: ['Listo para retirar', 'wait'] } : ESTADO)[estado] || [estado, 'off']
  return <span className={`d-badge d-badge--${t[1]}`}>{t[0]}</span>
}

// La cifra del día: cuenta una vez al montar; el lector recibe el valor final.
function Cifra({ valor, formato = money, activo }) {
  const ref = usarCifra(valor, formato, { activo })
  return (
    <>
      <span className="d-sr">{formato(valor)}</span>
      <span ref={ref} aria-hidden>{formato(valor)}</span>
    </>
  )
}

const minutosDesde = (ts) => (ts ? Math.max(0, Math.round((Date.now() - ts) / 60000)) : null)

/* ------------------------------------------------------------------- Hoy */

export function Hoy({ F, onNuevos }) {
  const version = useVersion()
  const local = F.local || undefined
  const rango = useMemo(() => ({ ...S.corteDeHoy && {}, desde: hoyKey(), hasta: hoyKey(), local }), [local, version])
  const r = useMemo(() => S.resumen(rango), [rango, version])
  const hcs = useMemo(() => S.hoyContraLaSemanaPasada(local), [local, version])
  const embudo = useMemo(() => S.embudoLlamadas(rango), [rango, version])
  const porLocal = useMemo(() => S.ventaPorLocal({ ...rango, local: undefined }), [rango, version])
  const cats = useMemo(() => S.ventaPorCategoria(rango), [rango, version])
  const pagos = useMemo(() => S.ventaPorPago(rango), [rango, version])
  const enRuta = useMemo(() => S.enRuta().filter((e) => !local || e.local_id === local), [local, version])
  const enCurso = useMemo(() => S.pedidos({ ...rango, estado: 'en_curso' }).sort((a, b) => a.creado_en - b.creado_en), [rango, version])
  const conectados = useMemo(() => S.localesConectados(), [version])
  const acum = useMemo(() => {
    const corte = S.corteDeHoy(local)
    const hoy = S.acumuladoDelDia(hoyKey(), local, corte)
    const base = S.acumuladoDelDia(hcs.baseK, local, corte)
    return { hoy, base, corte }
  }, [local, version, hcs.baseK])
  const entrada = useEntrada()
  const avisar = useToast()
  const [tic, setTic] = useState(0)
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) setTic((n) => n + 1) }, 30000); return () => clearInterval(t) }, [])
  const ids = useMemo(() => enCurso.map((p) => p.pedido_id), [enCurso])
  const nuevos = useNuevos(ids)
  const heroRef = useRef(null)
  const prevTotal = useRef(r.total)
  useEffect(() => {
    if (nuevos.length) {
      onNuevos?.(nuevos.length)
      marcar(heroRef.current)
      const el = document.getElementById('panel-status')
      if (el) el.textContent = `Entró el pedido ${nuevos[0]}`
    }
  }, [nuevos, onNuevos])
  useEffect(() => { prevTotal.current = r.total }, [r.total])

  const hoyN = r.pedidos
  const tit = titularHoy({ n: hoyN, hora: minToHora(acum.corte), base: hcs, baseN: hcs.baseN, dia: hoyKey() })
  const A = { ...F, periodo: 'hoy' }
  const enMarchaLate = enRuta.filter((e) => e.atrasado).length
  const localNombre = local ? S.nombreLocal(local) : null
  const esConectado = !local || conectados.some((l) => l.id === local)
  const tickets = enCurso.slice(0, 8)
  const [verTodos, setVerTodos] = useState(false)
  const movil = useMovil()
  const visibles = movil && !verTodos ? tickets.slice(0, 3) : tickets

  const avanzar = (p) => {
    const pasos = S.pasosDe(p)
    const sig = pasos[pasos.indexOf(p.estado) + 1]
    if (!sig) return
    const antes = p.estado
    if (S.cambiarEstado(p.pedido_id, sig)) {
      avisar(`${p.pedido_id} pasó a ${estadoTexto(sig, p.modalidad)}`, { deshacer: () => S.cambiarEstado(p.pedido_id, antes, { forzar: true }) })
    }
  }

  const lineaAcum = (
    <AreaLinea id="hoy" alto={110} vivo
      series={[
        ...(hcs.baseN >= UMBRALES.comparacion ? [{ clase: 'referencia', puntos: acum.base.puntos }] : []),
        { clase: 'principal', puntos: acum.hoy.puntos },
      ]}
      pie={hcs.baseN >= UMBRALES.comparacion
        ? `La línea punteada es el ${diaSemana(hoyKey())} pasado hasta esta hora: ${money(hcs.base)}.`
        : `El ${diaSemana(hoyKey())} pasado a esta hora iban ${hcs.baseN} pedidos: no sirve de comparación.`} />
  )

  return (
    <div className={entrada ? 'd-entrada' : ''} style={{ display: 'grid', gap: 20 }}>
      <section className="d-hero d-hero--flash" ref={heroRef}>
        <div className="d-hero__top">
          <p className="d-eyebrow">
            {(localNombre || 'Todos los locales')} · {local ? (esConectado ? 'conectado' : 'todavía sin conectar') : `${conectados.length} conectados`} · {fechaLarga(new Date())}
          </p>
          <span className="d-hero__iva">IVA incluido</span>
        </div>
        {!esConectado ? (
          <>
            <p className="d-hero__money">—</p>
            <p className="d-hero__line">Este local todavía no envía pedidos al tablero.</p>
          </>
        ) : hoyN === 0 ? (
          <>
            <p className="d-hero__money">$0.00</p>
            <p className="d-hero__line">Todavía no entra ningún pedido hoy.</p>
          </>
        ) : (
          <>
            <a className="d-hero__money d-cifra" href={hrefPanel('pedidos', { from: 'hoy' }, A)} data-drill
              aria-label={`${money(r.total)} cobrados hoy. Ver los ${hoyN} pedidos`}>
              <Cifra valor={r.total} activo={entrada} />
            </a>
            {hcs.baseN >= UMBRALES.comparacion && <Bullet actual={hcs.hoy} base={hcs.base} etiqueta={`${diaSemana(hoyKey())} pasado`} />}
            <p className="d-hero__line" key={tit.cabeza + (tit.cola || '')} style={{ marginTop: hcs.baseN >= UMBRALES.comparacion ? 26 : 10 }}>
              <a className="d-cifra" href={hrefPanel('pedidos', { from: 'hoy' }, A)}>{tit.cabeza}</a>
              {' · '}
              {tit.tipo === 'up' || tit.tipo === 'down'
                ? <><span className={tit.tipo}><span aria-hidden>{tit.tipo === 'up' ? '▲ ' : '▼ '}</span>
                  <a className="d-cifra" href={hrefPanel('pedidos', { periodo: 'dia', dia: hcs.baseK, hasta: acum.corte, from: 'hoy' }, A)}>{tit.delta}</a></span> {tit.cola}</>
                : tit.cola}
            </p>
          </>
        )}
      </section>

      <div className="d-stats">
        <Stat label="Pedidos" value={num(hoyN)} foot={hoyN ? `${r.domicilio} a domicilio · ${r.retiro} para llevar` : 'Todavía no entra ningún pedido.'}
          href={hoyN ? hrefPanel('pedidos', { from: 'hoy' }, A) : null} go={`Ver los ${hoyN} pedidos`} />
        <Stat label="En marcha ahora" value={num(r.pendientes)} tono={r.pendientes ? 'es-ahora' : ''}
          foot={r.pendientes
            ? <>{[['recibido', 'recibidos'], ['horno', 'en el horno'], ['camino', 'en camino']].filter(([k]) => r.porEstado[k]).map(([k, t]) => `${r.porEstado[k]} ${t}`).join(' · ')}
              {enMarchaLate ? <> · <span className="d-late">{enMarchaLate} {enMarchaLate === 1 ? 'lleva' : 'llevan'} más de 35 min</span></> : null}</>
            : hoyN ? 'Todo lo de hoy ya está entregado.' : 'Nada en marcha.'}
          href={r.pendientes ? hrefPanel('pedidos', { estado: 'en_curso', from: 'hoy' }, A) : null} go={`Ver los ${r.pendientes} en marcha`} />
        <Stat label="Entregas a tiempo" value={r.entregadas ? tasa(r.aTiempo, r.entregadas).texto : SIN_DATO}
          foot={r.entregadas ? 'Hasta 35 minutos cuenta a tiempo' : 'Aún ninguna entrega terminada'}
          href={r.entregadas ? hrefPanel('pedidos', { estado: 'entregado', modalidad: 'domicilio', orden: 'minutos', from: 'hoy' }, A) : null} go={`Ver las ${r.entregadas} entregas`} />
        <Stat label="Pedidos por teléfono" value={embudo.total ? `${embudo.pedidos} de ${embudo.total}` : SIN_DATO}
          foot={embudo.total ? `Camila contestó ${embudo.contestadas === embudo.total ? 'las ' + embudo.total : embudo.contestadas + ' de ' + embudo.total}${embudo.sinPedido ? ` · ${embudo.sinPedido} no pidieron` : ''}${embudo.colgo ? ` · ${embudo.colgo} ${embudo.colgo === 1 ? 'colgó' : 'colgaron'}` : ''}` : 'Aún ninguna llamada hoy'}
          href={embudo.total ? hrefPanel('camila', { from: 'hoy' }, A) : null} go={`Ver las ${embudo.total} llamadas`} />
      </div>

      <div className="d-grid">
        <Card span={7} i={0} title="En marcha ahora" sub="Lo de hoy que todavía no llega a la mesa.">
          {tickets.length === 0
            ? <p className="d-empty"><strong>Nada en marcha.</strong>{hoyN ? 'Todo lo de hoy ya está entregado.' : 'El primer pedido aparece aquí solo.'}</p>
            : (
              <div className={'d-tickets' + (tickets.length >= 5 ? ' dos' : '')}>
                {visibles.map((p, i) => {
                  const per = S.personaPorId(p.persona_id)
                  const nItems = S.estado().items.filter((x) => x.pedido_id === p.pedido_id).reduce((t, x) => t + x.cantidad, 0)
                  const enCamino = p.estado === 'camino' && p.modalidad === 'domicilio'
                  const min = enCamino ? minutosDesde(p.salio_en) : minutosDesde(p.creado_en)
                  const tarde = enCamino && min > 35
                  const espera = !enCamino && min > 20
                  const pasos = S.pasosDe(p); const sig = pasos[pasos.indexOf(p.estado) + 1]
                  return (
                    <a key={p.pedido_id} className={'d-ticket' + (nuevos.includes(p.pedido_id) ? ' d-new' : '')} style={{ '--i': i }}
                      href={hrefPanel('pedidos/' + p.pedido_id, { from: 'hoy' }, A)}>
                      <span className={'d-ticket__min' + (tarde ? ' es-tarde' : espera ? ' es-espera' : '')}>{min ?? '—'}<small>{enCamino ? 'fuera' : 'min'}</small></span>
                      <span className="d-ticket__l1">{p.pedido_id} · {!local ? `${S.nombreLocal(p.local_id)} · ` : ''}{MODALIDAD[p.modalidad]}</span>
                      <span className="d-ticket__l2">{per ? `${per.nombre} ${per.apellido}` : 'Sin cliente'} · {cuenta(nItems, 'plato', 'platos')} · {money(p.total_cobrado)}</span>
                      <span className="d-ticket__l3"><Badge estado={p.estado} modalidad={p.modalidad} />{enCamino && p.repartidor ? <span>{p.repartidor}, fuera {min} min</span> : null}</span>
                      {sig && (
                        <button type="button" className="d-btn d-btn--sm d-ticket__next" onClick={(e) => { e.preventDefault(); e.stopPropagation(); avanzar(p) }}>
                          {estadoTexto(sig, p.modalidad)} ›
                        </button>
                      )}
                    </a>
                  )
                })}
                {movil && tickets.length > 3 && !verTodos && (
                  <button type="button" className="d-mas" onClick={() => setVerTodos(true)}>Ver los {tickets.length} ›</button>
                )}
              </div>
            )}
        </Card>

        <Card span={5} i={1} title={enRuta.length ? 'Motos en la calle' : 'Cómo va el día'}
          sub={enRuta.length ? `${cuenta(enRuta.length, 'moto', 'motos')} ahora mismo${enMarchaLate ? ` · ${enMarchaLate} pasada de 35 min` : ''}` : `Lo cobrado hasta esta hora contra el ${diaSemana(hoyKey())} pasado`}
          foot={enRuta.length ? <><span>Toque el mapa para seguir cada moto</span><a href={hrefPanel('motos', {}, A)} data-drill>Ver todas ›</a></> : null}>
          {enRuta.length
            ? <FleetMap compacto entregas={enRuta} height={240} onClickCompacto={() => { window.location.hash = hrefPanel('motos', {}, A).slice(1) }} />
            : hoyN >= 3 ? lineaAcum : <p className="d-empty">{hoyN ? `Van ${hoyN} pedidos. La línea aparece desde el tercero.` : 'El primer pedido aparece aquí solo.'}</p>}
        </Card>
      </div>

      <div className="d-grid">
        <Card span={4} i={2} title={local ? 'Frente a los otros locales' : 'Dinero por local'}
          sub={local ? 'Este local contra los demás, hoy' : 'Toque un local y todo el tablero se filtra a ese local'}
          foot={!local && conectados.length < S.locales().length ? `${S.locales().length - conectados.length} locales todavía no envían pedidos al tablero` : null}>
          {local ? <FrenteALosOtros local={local} porLocal={porLocal} A={A} /> : (
            <Rank rows={conectados.map((l) => porLocal.find((x) => x.local_id === l.id) || { local_id: l.id, nombre: l.nombre, total: 0, pedidos: 0 }).sort((a, b) => b.total - a.total)}
              meta={(x) => x.pedidos ? cuenta(x.pedidos, 'pedido', 'pedidos') : 'ningún pedido hoy'}
              onName={(x) => irCon({ local: x.local_id })}
              href={(x) => x.total ? hrefPanel('pedidos', { local: x.local_id, from: 'hoy' }, A) : null} d0={entrada ? 240 : 0} />
          )}
        </Card>
        <Card span={4} i={3} title="Cómo pagaron" sub="Lo cobrado hoy por forma de pago">
          <Rank rows={pagos} label={(x) => PAGO[x.pago] || x.pago} meta={(x) => cuenta(x.pedidos, 'pedido', 'pedidos')}
            href={(x) => hrefPanel('pedidos', { pago: x.pago, from: 'hoy' }, A)} d0={entrada ? 240 : 0} vacio="Aún no se cobró nada hoy." />
        </Card>
        <Card span={4} i={4} title="Dinero por tipo de comida" sub="Lo cobrado hoy, plato por plato">
          {cats.length < 3
            ? <p className="d-lede" style={{ fontSize: 15 }}>{cats.length ? `Todo lo de hoy fue ${cats[0].categoria.toLowerCase()}: ${money(cats[0].total)} en ${cuenta(cats[0].unidades, 'plato', 'platos')}.` : 'Aún ningún plato vendido.'}</p>
            : <Rank rows={[...cats, ...(r.envio ? [{ categoria: 'Envío', total: r.envio, unidades: null }] : [])]} label={(x) => x.categoria}
              meta={(x) => x.unidades != null ? cuenta(x.unidades, 'plato', 'platos') : 'a domicilio'}
              href={(x) => x.unidades != null ? hrefPanel('pedidos', { categoria: x.categoria, from: 'hoy' }, A) : null} d0={entrada ? 240 : 0} />}
        </Card>
      </div>

      {enRuta.length > 0 && hoyN >= 3 && (
        <Card title={`Hoy contra el ${diaSemana(hoyKey())} pasado`} sub="Lo cobrado hasta esta hora, media hora a media hora" i={5}>
          {lineaAcum}
        </Card>
      )}
      <span hidden>{tic}</span>
    </div>
  )
}

function FrenteALosOtros({ local, porLocal, A }) {
  const yo = porLocal.find((x) => x.local_id === local) || { total: 0, pedidos: 0 }
  const puesto = porLocal.findIndex((x) => x.local_id === local) + 1
  const lider = porLocal[0]
  if (!yo.pedidos) return <p className="d-empty">{S.nombreLocal(local)} todavía no cobra nada hoy.</p>
  return (
    <>
      <p className="d-lede" style={{ fontSize: 15 }}>
        <a className="d-cifra" href={hrefPanel('pedidos', { from: 'hoy' }, A)}>{S.nombreLocal(local)} lleva {money(yo.total)}</a>
        {porLocal.length >= 3 ? `: ${puesto}.º de ${porLocal.length} locales.` : '.'}
        {lider && lider.local_id !== local ? ` El primero, ${lider.nombre}, lleva ${money(lider.total)}.` : lider ? ' Es el que más lleva hoy.' : ''}
      </p>
      {lider && lider.local_id !== local && <Bullet actual={yo.total} base={lider.total} etiqueta={lider.nombre} />}
    </>
  )
}

const hoyKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date())
const minToHora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/* --------------------------------------------------------------- Pedidos */

export function Pedidos({ rango, F, q }) {
  const version = useVersion()
  const estado = q.estado || ''
  const filtros = { ...rango, estado: estado || undefined, modalidad: q.modalidad, canal: q.canal, pago: q.pago, hastaMin: q.hasta ? +q.hasta : undefined }
  const todos = useMemo(() => S.pedidos(filtros), [JSON.stringify(filtros), version]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => {
    let r = todos
    if (q.categoria) { const ids = new Set(S.itemsDe({ ...rango, categoria: q.categoria }).map((i) => i.pedido_id)); r = r.filter((p) => ids.has(p.pedido_id)) }
    if (q.orden === 'minutos') r = [...r].sort((a, b) => (b.minutos_entrega || 0) - (a.minutos_entrega || 0))
    if (q.orden === 'total') r = [...r].sort((a, b) => b.total_cobrado - a.total_cobrado)
    return r
  }, [todos, q.categoria, q.orden, rango])
  const total = rows.reduce((t, p) => t + p.total_cobrado, 0)
  const titulo = tituloLista({ n: rows.length, estado, modalidad: q.modalidad, canal: q.canal, pago: q.pago, categoria: q.categoria, orden: q.orden, local: F.local ? S.nombreLocal(F.local) : null, periodo: F.periodo, dia: F.dia })
  const [ver, setVer] = useState(40)
  const fino = useMovil('(min-width: 900px) and (pointer: fine)')
  const conFiltro = estado || q.modalidad || q.canal || q.pago || q.categoria
  const sinFiltro = useMemo(() => (conFiltro ? S.pedidos(rango).length : 0), [conFiltro, rango, version])
  const conMinutos = q.orden === 'minutos'

  return (
    <>
      {q.from && <a className="d-back" href={hrefPanel(q.from, {}, F)}>← Volver a {q.from === 'hoy' ? 'Hoy' : q.from === 'resumen' ? 'Resumen' : q.from}</a>}
      <Card title={titulo} sub={rows.length ? `Suman ${money(total)}, IVA incluido` : undefined}
        tools={
          <select className="d-select" value={estado} onChange={(e) => irCon({ estado: e.target.value })} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="en_curso">En marcha ahora</option>
            {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
          </select>
        }
        foot={rows.length > ver ? <><span>{ver} de {rows.length}</span><button type="button" className="d-linkbtn" onClick={() => setVer(rows.length)}>Ver todos</button></> : null}>
        {rows.length === 0 ? (
          <p className="d-empty">
            <strong>{conFiltro ? `Ningún pedido ${estado ? estadoTexto(estado, q.modalidad).toLowerCase() : 'así'} ${PERIODO_FRASE[F.periodo]}.` : F.local ? 'Con el local elegido no hay nada.' : `Ningún pedido ${PERIODO_FRASE[F.periodo]}.`}</strong>
            {conFiltro && sinFiltro ? <button type="button" onClick={() => irCon({ estado: '', modalidad: '', canal: '', pago: '', categoria: '' })}>Hay {sinFiltro} pedidos en otros estados · Quitar el filtro</button>
              : F.local ? <button type="button" onClick={() => irCon({ local: '' })}>Puede que el pedido esté en otro local · Ver todos los locales</button> : 'Los pedidos aparecen aquí apenas Camila o la página los reciben.'}
          </p>
        ) : (
          <table className="d-table">
            <thead>
              <tr><th>Pedido</th><th>Hora</th><th>Cliente</th><th>Local</th><th>Por dónde pidió</th><th>Estado</th>{conMinutos && <th className="d-num">Minutos</th>}<th className="d-num">Total</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, ver).map((p) => {
                const per = S.personaPorId(p.persona_id)
                return (
                  <tr key={p.pedido_id}>
                    <td data-l="Pedido"><a href={hrefPanel('pedidos/' + p.pedido_id, { from: q.from || 'pedidos' }, F)}>{p.pedido_id}</a></td>
                    <td data-l="Hora">{F.periodo === 'hoy' || F.periodo === 'ayer' ? hhmm(p.creado_en) : `${fecha(p.creado_en)} ${hhmm(p.creado_en)}`}</td>
                    <td data-l="Cliente">{per ? <a href={hrefPanel('clientes/' + per.persona_id, {}, F)}>{per.nombre} {per.apellido}</a> : <span className="d-quiet">Sin cliente</span>}</td>
                    <td data-l="Local">{S.nombreLocal(p.local_id)}</td>
                    <td data-l="Por dónde" className="d-quiet">{CANAL[p.canal] || p.canal}</td>
                    <td data-l="Estado">{fino && !['entregado', 'cancelado'].includes(p.estado) ? <EstadoPedido pedido={p} compacto /> : <Badge estado={p.estado} modalidad={p.modalidad} />}</td>
                    {conMinutos && <td data-l="Minutos" className={'d-num' + (p.minutos_entrega > 35 ? ' d-late' : '')}>{p.minutos_entrega ?? SIN_DATO}</td>}
                    <td data-l="Total" className="d-num money">{money(p.total_cobrado)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={conMinutos ? 7 : 6} data-l="Pedidos">{cuenta(rows.length, 'pedido', 'pedidos')}</td><td data-l="Suman" className="d-num">{money(total)}</td></tr>
            </tfoot>
          </table>
        )}
      </Card>
    </>
  )
}

export function PedidoFicha({ id, F }) {
  const version = useVersion()
  const avisar = useToast()
  const p = S.estado().pedidos[id]
  const per = p ? S.personaPorId(p.persona_id) : null
  const items = useMemo(() => S.estado().items.filter((i) => i.pedido_id === id), [id, version])
  const dir = p?.direccion_id ? S.estado().direcciones[p.direccion_id] : null
  if (!p) return <Card title="No encontramos ese pedido"><p className="d-empty">El código {id} no existe.</p></Card>
  const pasos = S.pasosDe(p)
  const sig = pasos[pasos.indexOf(p.estado) + 1]
  const hist = Object.entries(p.historial || {}).sort((a, b) => a[1] - b[1]).map(([k, t]) => `${estadoTexto(k, p.modalidad)} ${hhmm(t)}`)
  const avanzar = () => {
    if (!sig) return
    const antes = p.estado
    if (S.cambiarEstado(p.pedido_id, sig)) avisar(`${p.pedido_id} pasó a ${estadoTexto(sig, p.modalidad)}`, { deshacer: () => S.cambiarEstado(p.pedido_id, antes, { forzar: true }) })
  }
  return (
    <>
      <a className="d-back" href={hrefPanel(F.from || 'pedidos', {}, F)}>← Volver a {F.from === 'hoy' ? 'Hoy' : F.from === 'motos' ? 'Motos' : 'pedidos'}</a>
      <section className="d-hero d-hero--tight">
        <p className="d-eyebrow">Pedido</p>
        <h1 style={{ marginTop: 4 }}>{id}</h1>
        <p className="d-hero__foot">{fechaLarga(p.creado_en)}, {hhmm(p.creado_en)} · {S.nombreLocal(p.local_id)} · {CANAL[p.canal] || p.canal}</p>
        <p style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge estado={p.estado} modalidad={p.modalidad} /> <span className="d-quiet">{MODALIDAD[p.modalidad]} · {PAGO[p.forma_pago] || p.forma_pago} · Envío: {p.envio_cobrado ? money(p.envio_cobrado) : 'sin costo'}</span>
        </p>
        {hist.length > 0 && <p className="d-hero__foot">{hist.join(' · ')}</p>}
      </section>

      <div className="d-grid">
        <Card span={7} title="Lo que pidió">
          <table className="d-table">
            <tbody>
              {items.map((i, k) => (
                <tr key={k}>
                  <td data-l="Plato">{i.cantidad} × {i.nombre}{i.tamano ? ` · ${i.tamano}` : ''}</td>
                  <td data-l="Tipo" className="d-quiet">{i.categoria}</td>
                  <td data-l="Precio" className="d-num">{money(i.precio_unitario * i.cantidad)}</td>
                </tr>
              ))}
              <tr><td colSpan={2} data-l="Envío">Envío</td><td data-l="Envío" className="d-num">{p.envio_cobrado ? money(p.envio_cobrado) : 'Sin costo'}</td></tr>
              <tr className="d-total"><td colSpan={2}>Total, IVA incluido</td><td data-l="Total" className="d-num">{money(p.total_cobrado)}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card span={5} title="Estado del pedido" sub="Un toque avanza un paso; se puede deshacer 5 segundos">
          <EstadoPedido pedido={p} />
        </Card>
      </div>

      <Card title="Cliente" sub={per?.cedula ? `Cédula ${per.cedula} · se le reconoce desde cualquier teléfono` : 'Sin cédula: no se le reconoce desde otro teléfono'}>
        {per ? (
          <div className="d-grid" style={{ gap: 12 }}>
            <div className="d-c4">
              <CampoEditable etiqueta="Nombre" valor={per.nombre} onGuardar={(v) => S.actualizarPersona(per.persona_id, { nombre: v })} />
            </div>
            <div className="d-c4">
              <CampoEditable etiqueta="Apellido" valor={per.apellido} onGuardar={(v) => S.actualizarPersona(per.persona_id, { apellido: v })} />
            </div>
            <div className="d-c4">
              <div className="d-campo"><span className="d-campo__lab">Teléfono</span>
                <span className="d-campo__val" style={{ cursor: 'default' }}>{per.telefonos.map((t) => S.telefonoBonito(t.telefono)).join(' · ') || 'Sin teléfono'}</span></div>
            </div>
            {dir && (
              <>
                <div className="d-c6"><CampoEditable etiqueta="Calle principal y secundaria" valor={dir.calle} onGuardar={(v) => { S.editarDireccion(dir.direccion_id, { calle: v }); avisar('Guardado.') }} /></div>
                <div className="d-c3"><CampoEditable etiqueta="Sector" valor={dir.sector} onGuardar={(v) => { S.editarDireccion(dir.direccion_id, { sector: v }); avisar('Guardado.') }} /></div>
                <div className="d-c3"><CampoEditable etiqueta="Referencia para el motorizado" valor={dir.referencia} ayuda="Algo que se vea desde la calle" onGuardar={(v) => { S.editarDireccion(dir.direccion_id, { referencia: v }); avisar('Guardado.') }} /></div>
              </>
            )}
            <p className="d-c12 d-quiet" style={{ fontSize: 13 }}>
              <a href={hrefPanel('clientes/' + per.persona_id, {}, F)} style={{ color: 'var(--d-green-lit)', fontWeight: 600 }}>Ver la ficha completa de {per.nombre} ›</a>
            </p>
          </div>
        ) : <p className="d-empty">Pedido sin cliente asociado.</p>}
      </Card>

      {!['entregado', 'cancelado'].includes(p.estado) && (
        <div className="d-actionbar">
          <button type="button" className="d-btn d-btn--primary" onClick={avanzar}>Siguiente paso: {estadoTexto(sig, p.modalidad)}</button>
          <a className="d-btn" href={hrefPanel(F.from || 'pedidos', {}, F)}>Volver</a>
        </div>
      )}
    </>
  )
}

/* -------------------------------------------------------------- Resumen */

// Renglones con plantilla, nunca con un modelo de lenguaje: cada uno sale solo
// si su cifra cumple su condición.
function lineas({ sem, cats, embudo, local, porLocal, A }) {
  const L = []
  if (sem.n1 === 0) return [{ txt: 'Ningún pedido en los últimos 7 días', href: hrefPanel('pedidos', { periodo: '7d', from: 'resumen' }, A) }]
  L.push({ b: cuenta(sem.n1, 'pedido', 'pedidos'), txt: `, ${money(sem.t1)} cada uno en promedio`, href: hrefPanel('pedidos', { periodo: '7d', from: 'resumen' }, A) })
  if (sem.n0 >= 5) {
    const d = sem.v1 - sem.v0
    if (Math.abs(d) < 5) L.push({ b: 'Casi lo mismo', txt: ' que los 7 días anteriores', ancla: '#porque' })
    else {
      L.push({ b: `${money(Math.abs(d))} ${d > 0 ? 'más' : 'menos'}`, txt: ` que los 7 días anteriores${sem.comunes < sem.locales ? `, con los ${sem.comunes} locales que ya vendían` : ''}`, ancla: '#porque', tono: d > 0 ? 'up' : 'down' })
      const porN = (sem.n1 - sem.n0) * sem.t0, porT = sem.n1 * (sem.t1 - sem.t0)
      const dn = Math.abs(sem.n1 - sem.n0)
      if (Math.abs(porN) > Math.abs(porT) * 3) L.push({ b: `Casi todo por ${dn} pedidos ${sem.n1 > sem.n0 ? 'más' : 'menos'}`, txt: ', no por el tamaño', ancla: '#porque' })
      else if (Math.abs(porT) > Math.abs(porN) * 3) L.push({ b: `Casi todo porque cada pedido fue ${money(Math.abs(sem.t1 - sem.t0))} ${sem.t1 > sem.t0 ? 'más grande' : 'más chico'}`, txt: '', ancla: '#porque' })
      else L.push({ b: `Parte por ${dn} pedidos ${sem.n1 > sem.n0 ? 'más' : 'menos'}`, txt: ` y parte por pedidos ${sem.t1 > sem.t0 ? 'más grandes' : 'más chicos'}`, ancla: '#porque' })
    }
  }
  if (cats.length) {
    const tot = cats.reduce((t, c) => t + c.total, 0)
    const seg = cats[1] && (10 * cats[1].total) / tot >= 2 ? ` y ${money((10 * cats[1].total) / tot)} de ${cats[1].categoria.toLowerCase()}` : ''
    L.push({ b: `${money((10 * cats[0].total) / tot)} de cada $10`, txt: ` fueron de ${cats[0].categoria.toLowerCase()}${seg}`, ancla: '#decada10' })
  }
  if (!local && porLocal.length >= 2) L.push({ b: `${porLocal[0].nombre} cobró más`, txt: `: ${money(porLocal[0].total)}`, href: hrefPanel('pedidos', { local: porLocal[0].local_id, periodo: '7d', from: 'resumen' }, A) })
  if (embudo.total) {
    const t = tasa(embudo.pedidos, embudo.contestadas)
    L.push({ b: `${embudo.contestadas} de ${embudo.total} llamadas contestadas`, txt: `; ${t.exacto ? `${t.texto} terminó` : `${embudo.pedidos} terminaron`} en pedido`, href: hrefPanel('camila', { periodo: '7d', from: 'resumen' }, A) })
  }
  const m = embudo.motivos[0]
  if (m && m.n >= 3) L.push({ b: `${m.n} veces`, txt: ` no pidieron ${({ precio: 'por el precio', 'demora estimada': 'por la espera', 'fuera de cobertura': 'por estar fuera de cobertura', 'producto no disponible': 'porque no había el plato', 'solo consultaba': 'porque solo preguntaban' })[m.motivo] || `por ${m.motivo}`}`, href: hrefPanel('camila', { periodo: '7d', motivo: m.motivo, from: 'resumen' }, A) })
  return L
}

export function Resumen({ F }) {
  const version = useVersion()
  const local = F.local || undefined
  const serie = useMemo(() => S.serieDiaria(14, local), [local, version])
  const sem = useMemo(() => S.semanaContraSemana(local), [local, version])
  const rango7 = useMemo(() => ({ desde: serie.dias[serie.dias.length - 7], hasta: serie.dias[serie.dias.length - 1], local }), [serie, local])
  const cats = useMemo(() => S.ventaPorCategoria(rango7), [rango7, version])
  const donde = useMemo(() => S.dondeSeVendeMas(rango7), [rango7, version])
  const embudo = useMemo(() => S.embudoLlamadas(rango7), [rango7, version])
  const porLocal = useMemo(() => S.ventaPorLocal({ ...rango7, local: undefined }), [rango7, version])
  const top = useMemo(() => S.topProductos(rango7, 10), [rango7, version])
  const entrada = useEntrada()
  const A = { ...F, periodo: '7d' }
  const totalCats = cats.reduce((t, c) => t + c.total, 0)
  const total7 = serie.valores.slice(-7).reduce((a, b) => a + b, 0)
  const conVenta = serie.valores.filter((v) => v > 0).length
  const L = lineas({ sem, cats, embudo, local, porLocal, A })
  const [verCats, setVerCats] = useState(false)
  const salto = (id) => (e) => { e.preventDefault(); const el = document.getElementById(id); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); marcar(el) }

  return (
    <div className={entrada ? 'd-entrada' : ''} style={{ display: 'grid', gap: 20 }}>
      <section className="d-hero">
        <div className="d-hero__top"><p className="d-eyebrow">Los últimos 7 días · {local ? S.nombreLocal(local) : 'todos los locales'}</p><span className="d-hero__iva">IVA incluido</span></div>
        <a className="d-hero__money d-cifra" href={hrefPanel('pedidos', { periodo: '7d', from: 'resumen' }, A)} style={{ fontSize: 'clamp(34px,4vw,44px)' }}>{money(total7)}</a>
        <ul className="d-lineas">
          {L.map((l, i) => (
            <li key={i}>
              {l.href
                ? <a href={l.href}><b className={l.tono || ''}>{l.b}</b>{l.txt}<span className="go">›</span></a>
                : <a href={l.ancla || '#'} onClick={l.ancla ? salto(l.ancla.slice(1)) : undefined}><b className={l.tono || ''}>{l.b}</b>{l.txt}<span className="go">›</span></a>}
            </li>
          ))}
        </ul>
      </section>

      <div className="d-grid">
        <Card span={6} i={0} title="¿Vamos mejor que la semana pasada?" sub="O entraron más pedidos, o cada pedido fue más grande: se arreglan distinto" className="d-flash-target">
          <div id="porque">
            {sem.n0 >= 5
              ? <PorQueCambio n0={sem.n0} t0={sem.t0} n1={sem.n1} t1={sem.t1} />
              : <p className="d-empty">Se compara a partir de 5 pedidos en la semana anterior. Van {sem.n0}.</p>}
          </div>
        </Card>
        <Card span={6} i={1} title="Los últimos 14 días" sub="Cuánto se cobró cada día · toque un día para ver sus pedidos">
          {conVenta >= 7
            ? <Columnas dias={serie.dias} valores={serie.valores} pedidos={serie.pedidos}
              href={(i) => hrefPanel('pedidos', { periodo: 'dia', dia: serie.dias[i], from: 'resumen' }, F)}
              titulo={(i) => `${diaLargo(serie.dias[i])}: ${money(serie.valores[i])}, ${cuenta(serie.pedidos[i], 'pedido', 'pedidos')}`} />
            : <p className="d-empty">Este gráfico se enciende a los 7 días con venta. Van {conVenta}.</p>}
        </Card>
      </div>

      <div className="d-grid">
        <Card span={6} i={2} title="De cada $10, cuánto fue de qué" sub="Lo cobrado en los últimos 7 días por tipo de comida">
          <div id="decada10">
            {cats.length === 0 ? <p className="d-empty">Aún ningún plato vendido.</p> : (
              <Rank rows={(verCats ? cats : cats.slice(0, 5))} label={(x) => x.categoria} value={(x) => (10 * x.total) / totalCats}
                meta={(x) => `${money(x.total)} · ${cuenta(x.unidades, 'plato', 'platos')}`}
                href={(x) => hrefPanel('pedidos', { categoria: x.categoria, periodo: '7d', from: 'resumen' }, A)} />
            )}
            {cats.length > 5 && !verCats && <button type="button" className="d-mas" onClick={() => setVerCats(true)}>Ver las {cats.length} ›</button>}
          </div>
        </Card>
        <Card span={6} i={3} title="Dónde se vende más de qué" sub="Cada local contra los demás, no contra un promedio que ya lo incluye">
          <DondeSeVendeMas filas={donde} />
        </Card>
      </div>

      <div className="d-grid">
        <Card span={6} i={4} title="Los platos que más venden" sub="Los últimos 7 días">
          <table className="d-table">
            <thead><tr><th>Plato</th><th className="d-num">Platos</th><th className="d-num">Total</th></tr></thead>
            <tbody>
              {top.map((t, i) => (
                <tr key={i}>
                  <td data-l="Plato">{t.nombre}</td>
                  <td data-l="Platos" className="d-num">{t.unidades}</td>
                  <td data-l="Total" className="d-num money">{money(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="d-chartfoot">Con este volumen el orden de los primeros puestos todavía cambia de un día a otro.</p>
        </Card>
        <Card span={6} i={5} title="Cuánto cobró cada local" sub="Los últimos 7 días · el nombre filtra, la cifra abre los pedidos">
          <Rank rows={porLocal} meta={(x) => cuenta(x.pedidos, 'pedido', 'pedidos')} onName={(x) => irCon({ local: x.local_id })}
            href={(x) => hrefPanel('pedidos', { local: x.local_id, periodo: '7d', from: 'resumen' }, A)} />
        </Card>
      </div>
    </div>
  )
}
