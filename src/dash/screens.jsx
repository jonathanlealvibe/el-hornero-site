import { useEffect, useMemo, useRef, useState } from 'react'
import * as S from './store.js'
import FleetMap from './FleetMap.jsx'
import { PorQueCambio, DondeSeVendeMas } from './graficos.jsx'
import { Columnas, AreaLinea, Bullet } from './trazos.jsx'
import { money, num, hhmm, fecha, fechaLarga, tasa, SIN_DATO, UMBRALES } from './format.js'
import { hrefPanel, irCon, PERIODO_FRASE } from './nav.js'
import { useVersion } from './useStore.js'
import { useEntrada, useNuevos, usarCifra, marcar, useMovil } from './motion.js'
import { T } from './i18n.js'
import { cuenta, CANAL, MODALIDAD, PAGO, ESTADO, MOTIVO, estadoTexto, tituloLista, titularHoy, diaSemana, diaLargo } from './textos.js'
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
    ? <a className="d-stat" href={href} data-drill aria-label={ariaGo || `${label}: ${value}. ${go || T('Ver el detalle', 'See the detail')}`}>{inner}</a>
    : <article className="d-stat" aria-disabled={value === SIN_DATO || undefined}>{inner}</article>
}

// Con pocos datos, una lista ordenada con la cifra impresa le gana a cualquier
// gráfico. El nombre filtra; la cifra abre.
export const Rank = ({ rows, label = (r) => r.nombre, value = (r) => r.total, meta, onName, href, d0 = 0, vacio, formato = money }) => {
  const max = Math.max(...rows.map(value), 1)
  if (!rows.length) return <p className="d-empty">{vacio || T('Aún ningún dato en este periodo.', 'No data yet for this period.')}</p>
  return (
    <ol className="d-rank">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="d-rank__row">
            <span className="d-rank__name">
              {onName ? <button type="button" onClick={() => onName(r)}>{label(r)}</button> : label(r)}
            </span>
            <span className="d-rank__bar"><i style={{ width: `${Math.max((value(r) / max) * 100, value(r) > 0 ? 2 : 0)}%`, '--i': i, '--d0': `${d0}ms` }} /></span>
            {href && href(r)
              ? <a className="d-rank__val" href={href(r)} data-drill>{formato(value(r))}</a>
              : <span className="d-rank__val">{formato(value(r))}</span>}
            {meta && <span className="d-rank__meta">{meta(r)}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export const Badge = ({ estado, modalidad }) => {
  const t = ESTADO[estado] || [estado, 'off']
  return <span className={`d-badge d-badge--${t[1]}`}>{estadoTexto(estado, modalidad)}</span>
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
const hoyKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date())
const minToHora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const platos = (n) => cuenta(n, 'plato', 'platos', 'item', 'items')
const pedidosTxt = (n) => cuenta(n, 'pedido', 'pedidos', 'order', 'orders')

/* ------------------------------------------------------ Centro de mando */

// La primera pantalla: todo lo que está pasando ahora, en todas las pestañas,
// y cada cifra abre su detalle.
export function Hoy({ F, datos, onNuevos }) {
  const version = useVersion()
  const local = F.local || undefined
  const rango = useMemo(() => ({ desde: hoyKey(), hasta: hoyKey(), local }), [local, version])
  const r = useMemo(() => S.resumen(rango), [rango, version])
  const hcs = useMemo(() => S.hoyContraLaSemanaPasada(local), [local, version])
  const embudo = useMemo(() => S.embudoLlamadas(rango), [rango, version])
  const porLocal = useMemo(() => S.ventaPorLocal({ ...rango, local: undefined }), [rango, version])
  const cats = useMemo(() => S.ventaPorCategoria(rango), [rango, version])
  const pagos = useMemo(() => S.ventaPorPago(rango), [rango, version])
  const top = useMemo(() => S.topProductos(rango, 5), [rango, version])
  const enRuta = useMemo(() => S.enRuta().filter((e) => !local || e.local_id === local), [local, version])
  const huella = useMemo(() => S.huellaDeHoy(local), [local, version])
  const enCurso = useMemo(() => S.pedidos({ ...rango, estado: 'en_curso' }).sort((a, b) => a.creado_en - b.creado_en), [rango, version])
  const conectados = useMemo(() => S.localesConectados(), [version])
  const serie = useMemo(() => S.serieDiaria(14, local), [local, version])
  const clientesHoy = useMemo(() => {
    const db = S.estado()
    const hoy = hoyKey()
    const ids = new Set(S.pedidos(rango).map((p) => p.persona_id).filter(Boolean))
    let nuevos = 0, repiten = 0, conCedula = 0
    for (const id of ids) {
      const antes = Object.values(db.pedidos).some((p) => p.persona_id === id && p.dia < hoy && p.estado !== 'cancelado')
      if (antes) repiten++; else nuevos++
      if (db.personas[id]?.cedula) conCedula++
    }
    return { total: ids.size, nuevos, repiten, conCedula }
  }, [rango, version])
  const acum = useMemo(() => {
    const corte = S.corteDeHoy(local)
    return { hoy: S.acumuladoDelDia(hoyKey(), local, corte), base: S.acumuladoDelDia(hcs.baseK, local, corte), corte }
  }, [local, version, hcs.baseK])
  const entrada = useEntrada()
  const avisar = useToast()
  const [tic, setTic] = useState(0)
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) setTic((n) => n + 1) }, 30000); return () => clearInterval(t) }, [])
  const ids = useMemo(() => enCurso.map((p) => p.pedido_id), [enCurso])
  const nuevos = useNuevos(ids)
  const heroRef = useRef(null)
  useEffect(() => {
    if (nuevos.length) {
      onNuevos?.(nuevos.length)
      marcar(heroRef.current)
      const el = document.getElementById('panel-status')
      if (el) el.textContent = T(`Entró el pedido ${nuevos[0]}`, `Order ${nuevos[0]} came in`)
    }
  }, [nuevos, onNuevos])

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
  const vivoSinPedidos = datos === 'vivo' && Object.keys(S.estado().pedidos).length === 0
  const enCalle = enRuta.reduce((t, e) => t + e.total_cobrado, 0)
  const masFuera = enRuta[0]
  const conVenta = serie.valores.filter((v) => v > 0).length

  const avanzar = (p) => {
    const pasos = S.pasosDe(p)
    const sig = pasos[pasos.indexOf(p.estado) + 1]
    if (!sig) return
    const antes = p.estado
    if (S.cambiarEstado(p.pedido_id, sig)) {
      avisar(T(`${p.pedido_id} pasó a ${estadoTexto(sig, p.modalidad)}`, `${p.pedido_id} moved to ${estadoTexto(sig, p.modalidad)}`), { deshacer: () => S.cambiarEstado(p.pedido_id, antes, { forzar: true }) })
    }
  }

  const lineaAcum = hoyN >= 3
    ? <AreaLinea id="hoy" alto={120} vivo
      series={[
        ...(hcs.baseN >= UMBRALES.comparacion ? [{ clase: 'referencia', puntos: acum.base.puntos }] : []),
        { clase: 'principal', puntos: acum.hoy.puntos },
      ]}
      pie={hcs.baseN >= UMBRALES.comparacion
        ? T(`La línea punteada es el ${diaSemana(hoyKey())} pasado hasta esta hora: ${money(hcs.base)}.`, `The dotted line is last ${diaSemana(hoyKey())} up to this time: ${money(hcs.base)}.`)
        : T(`El ${diaSemana(hoyKey())} pasado a esta hora iban ${hcs.baseN} pedidos: no sirve de comparación.`, `Last ${diaSemana(hoyKey())} at this time there were ${hcs.baseN} orders: not a useful comparison.`)} />
    : <p className="d-empty">{hoyN ? T(`Van ${pedidosTxt(hoyN)}. La línea aparece desde el tercero.`, `${pedidosTxt(hoyN)} so far. The line appears from the third.`) : T('El primer pedido aparece aquí solo.', 'The first order shows up here by itself.')}</p>

  if (vivoSinPedidos) {
    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <section className="d-hero">
          <div className="d-hero__top"><p className="d-eyebrow">{T('En vivo · pedidos reales de la tienda', 'Live · real orders from the store')} · {fechaLarga(new Date())}</p></div>
          <p className="d-hero__money">$0.00</p>
          <p className="d-hero__line">{T('Todavía no entra ningún pedido real.', 'No real order has come in yet.')}</p>
        </section>
        <div className="d-vivo-empty">
          <h3>{T('Pruébelo con un pedido de verdad', 'Try it with a real order')}</h3>
          <ol>
            <li>{T('Abra la tienda del cliente y haga un pedido como si fuera un cliente (nombre, celular, cédula, dirección).', 'Open the customer store and place an order as a customer would (name, phone, ID, address).')}</li>
            <li>{T('Vuelva aquí: el pedido aparece solo, en segundos, con su cliente, su local y su estado.', 'Come back here: the order shows up by itself within seconds, with its customer, branch and status.')}</li>
            <li>{T('Avance el estado desde el tablero; el link de seguimiento del cliente lo refleja.', "Move the status from the dashboard; the customer's tracking link reflects it.")}</li>
          </ol>
          <a className="d-btn d-btn--primary" href="#/" target="_blank" rel="noreferrer">{T('Abrir la tienda en otra pestaña ↗', 'Open the store in a new tab ↗')}</a>
          <span className="d-quiet" style={{ fontSize: 12.5 }}>{T('Sin backend los pedidos viven en este navegador; con el backend, los de cualquier teléfono.', 'Without the backend the orders live in this browser; with the backend, from any phone.')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={entrada ? 'd-entrada' : ''} style={{ display: 'grid', gap: 20 }}>
      <div className="d-grid">
        <section className="d-hero d-hero--flash d-c7" ref={heroRef} style={{ padding: '12px 0 8px' }}>
          <div className="d-hero__top">
            <p className="d-eyebrow">
              {(localNombre || T('Todos los locales', 'All branches'))} · {local ? (esConectado ? T('conectado', 'connected') : T('todavía sin conectar', 'not connected yet')) : `${conectados.length} ${T('conectados', 'connected')}`} · {fechaLarga(new Date())}
            </p>
            <span className="d-hero__iva">{T('IVA incluido', 'VAT included')}</span>
          </div>
          {!esConectado ? (
            <>
              <p className="d-hero__money">—</p>
              <p className="d-hero__line">{T('Este local todavía no envía pedidos al tablero.', 'This branch does not send orders to the dashboard yet.')}</p>
            </>
          ) : hoyN === 0 ? (
            <>
              <p className="d-hero__money">$0.00</p>
              <p className="d-hero__line">{T('Todavía no entra ningún pedido hoy.', 'No orders have come in yet today.')}</p>
            </>
          ) : (
            <>
              <a className="d-hero__money d-cifra" href={hrefPanel('pedidos', { from: 'hoy' }, A)} data-drill
                aria-label={T(`${money(r.total)} cobrados hoy. Ver los ${hoyN} pedidos`, `${money(r.total)} taken today. See the ${hoyN} orders`)}>
                <Cifra valor={r.total} activo={entrada} />
              </a>
              {hcs.baseN >= UMBRALES.comparacion && <Bullet actual={hcs.hoy} base={hcs.base} etiqueta={T(`${diaSemana(hoyKey())} pasado`, `last ${diaSemana(hoyKey())}`)} />}
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
        <Card span={5} i={0} title={T('Cómo va el día', 'How the day is going')} sub={T(`Lo cobrado hasta esta hora contra el ${diaSemana(hoyKey())} pasado`, `Takings so far against last ${diaSemana(hoyKey())}`)}>
          {lineaAcum}
        </Card>
      </div>

      <div className="d-stats">
        <Stat label={T('Pedidos', 'Orders')} value={num(hoyN)} foot={hoyN ? T(`${r.domicilio} a domicilio · ${r.retiro} para llevar`, `${r.domicilio} delivery · ${r.retiro} pickup`) : T('Todavía no entra ningún pedido.', 'No orders yet.')}
          href={hoyN ? hrefPanel('pedidos', { from: 'hoy' }, A) : null} go={T(`Ver los ${hoyN} pedidos`, `See the ${hoyN} orders`)} />
        <Stat label={T('En marcha ahora', 'In progress now')} value={num(r.pendientes)} tono={r.pendientes ? 'es-ahora' : ''}
          foot={r.pendientes
            ? <>{[['recibido', T('recibidos', 'received')], ['horno', T('en el horno', 'in the oven')], ['camino', T('en camino', 'on the way')]].filter(([k]) => r.porEstado[k]).map(([k, t]) => `${r.porEstado[k]} ${t}`).join(' · ')}
              {enMarchaLate ? <> · <span className="d-late">{enMarchaLate} {T(enMarchaLate === 1 ? 'lleva' : 'llevan', enMarchaLate === 1 ? 'is' : 'are')} {T('más de 35 min', 'past 35 min')}</span></> : null}</>
            : hoyN ? T('Todo lo de hoy ya está entregado.', 'Everything from today is delivered.') : T('Nada en marcha.', 'Nothing in progress.')}
          href={r.pendientes ? hrefPanel('pedidos', { estado: 'en_curso', from: 'hoy' }, A) : null} go={T(`Ver los ${r.pendientes} en marcha`, `See the ${r.pendientes} in progress`)} />
        <Stat label={T('Entregas a tiempo', 'On-time deliveries')} value={r.entregadas ? tasa(r.aTiempo, r.entregadas).texto : SIN_DATO}
          foot={r.entregadas ? T('Hasta 35 minutos cuenta a tiempo', 'Up to 35 minutes counts as on time') : T('Aún ninguna entrega terminada', 'No finished deliveries yet')}
          href={r.entregadas ? hrefPanel('pedidos', { estado: 'entregado', modalidad: 'domicilio', orden: 'minutos', from: 'hoy' }, A) : null} go={T(`Ver las ${r.entregadas} entregas`, `See the ${r.entregadas} deliveries`)} />
        <Stat label={T('Pedidos por teléfono', 'Orders by phone')} value={embudo.total ? `${embudo.pedidos} ${T('de', 'of')} ${embudo.total}` : SIN_DATO}
          foot={embudo.total ? `${T('Camila contestó', 'Camila answered')} ${embudo.contestadas === embudo.total ? T('las ', 'all ') + embudo.total : embudo.contestadas + ` ${T('de', 'of')} ` + embudo.total}${embudo.sinPedido ? ` · ${embudo.sinPedido} ${T('no pidieron', 'did not order')}` : ''}${embudo.colgo ? ` · ${embudo.colgo} ${T(embudo.colgo === 1 ? 'colgó' : 'colgaron', 'hung up')}` : ''}` : T('Aún ninguna llamada hoy', 'No calls yet today')}
          href={embudo.total ? hrefPanel('camila', { from: 'hoy' }, A) : null} go={T(`Ver las ${embudo.total} llamadas`, `See the ${embudo.total} calls`)} />
      </div>

      <div className="d-grid">
        <Card span={7} i={1} title={enRuta.length ? T('Motos en la calle', 'Riders out') : T('Entregas de hoy', "Today's deliveries")}
          sub={enRuta.length ? `${cuenta(enRuta.length, 'moto', 'motos', 'rider', 'riders')} ${T('ahora mismo', 'right now')}${enMarchaLate ? ` · ${enMarchaLate} ${T('pasada de 35 min', 'past 35 min')}` : ''} · ${money(enCalle)} ${T('en la calle', 'on the road')}` : huella.length ? T(`${huella.length} entregas ya llegaron`, `${huella.length} deliveries have arrived`) : T('Todavía no sale ninguna moto', 'No rider has gone out yet')}
          foot={<><span>{enRuta.length ? T('Toque el mapa para seguir cada moto', 'Tap the map to follow each rider') : T('Los puntos son las entregas de hoy', "The dots are today's deliveries")}</span><a href={hrefPanel('motos', {}, A)} data-drill>{T('Ver todas ›', 'See all ›')}</a></>}>
          <FleetMap compacto entregas={enRuta} huella={enRuta.length ? [] : huella} height={movil ? 220 : 320} sedesVisibles={enRuta.length ? undefined : conectados.map((l) => l.id)} onClickCompacto={() => { window.location.hash = hrefPanel('motos', {}, A).slice(1) }} />
          {enRuta.length > 0 && (
            <table className="d-table" style={{ marginTop: 12 }}>
              <tbody>
                {enRuta.slice(0, 4).map((e) => (
                  <tr key={e.pedido_id}>
                    <td data-l={T('Motorizado', 'Rider')}><a href={hrefPanel('motos/' + e.pedido_id, {}, A)}>{e.repartidor || T('Motorizado', 'Rider')}</a></td>
                    <td data-l={T('Local', 'Branch')} className="d-quiet">{S.nombreLocal(e.local_id)} → {e.destino?.sector || ''}</td>
                    <td data-l={T('Fuera', 'Out')}><span className={e.atrasado ? 'd-late' : ''}>{e.minutos_fuera} min</span></td>
                    <td data-l="Total" className="d-num money">{money(e.total_cobrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card span={5} i={2} title={T('En marcha ahora', 'In progress now')} sub={T('Lo de hoy que todavía no llega a la mesa.', "Today's orders that have not reached the table yet.")}>
          {tickets.length === 0
            ? <p className="d-empty"><strong>{T('Nada en marcha.', 'Nothing in progress.')}</strong>{hoyN ? T('Todo lo de hoy ya está entregado.', 'Everything from today is delivered.') : T('El primer pedido aparece aquí solo.', 'The first order shows up here by itself.')}</p>
            : (
              <div className="d-tickets">
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
                      <span className={'d-ticket__min' + (tarde ? ' es-tarde' : espera ? ' es-espera' : '')}>{min ?? '—'}<small>{enCamino ? T('fuera', 'out') : 'min'}</small></span>
                      <span className="d-ticket__l1">{p.pedido_id} · {!local ? `${S.nombreLocal(p.local_id)} · ` : ''}{MODALIDAD[p.modalidad]}</span>
                      <span className="d-ticket__l2">{per ? `${per.nombre} ${per.apellido}` : T('Sin cliente', 'No customer')} · {platos(nItems)} · {money(p.total_cobrado)}</span>
                      <span className="d-ticket__l3"><Badge estado={p.estado} modalidad={p.modalidad} />{enCamino && p.repartidor ? <span>{p.repartidor}, {T('fuera', 'out')} {min} min</span> : null}</span>
                      {sig && (
                        <button type="button" className="d-btn d-btn--sm d-ticket__next" onClick={(e) => { e.preventDefault(); e.stopPropagation(); avanzar(p) }}>
                          {estadoTexto(sig, p.modalidad)} ›
                        </button>
                      )}
                    </a>
                  )
                })}
                {movil && tickets.length > 3 && !verTodos && (
                  <button type="button" className="d-mas" onClick={() => setVerTodos(true)}>{T(`Ver los ${tickets.length} ›`, `See all ${tickets.length} ›`)}</button>
                )}
                {!movil && enCurso.length > 8 && <a className="d-mas" href={hrefPanel('pedidos', { estado: 'en_curso', from: 'hoy' }, A)}>{T(`Ver los ${enCurso.length} ›`, `See all ${enCurso.length} ›`)}</a>}
              </div>
            )}
        </Card>
      </div>

      <div className="d-grid">
        <Card span={4} i={3} title={T('Motos', 'Riders')} sub={T('Cómo va el reparto hoy', 'How delivery is going today')}
          foot={<a href={hrefPanel('motos', {}, A)} data-drill>{T('Abrir Motos ›', 'Open Riders ›')}</a>}>
          <ul className="d-lineas" style={{ margin: 0 }}>
            <li><a href={hrefPanel('motos', {}, A)}><b>{num(enRuta.length)}</b>{T(' motos en la calle ahora', ' riders out now')}<span className="go">›</span></a></li>
            <li><a href={hrefPanel('motos', { atrasadas: '1' }, A)}><b className={enMarchaLate ? 'down' : ''}>{num(enMarchaLate)}</b>{T(' pasadas de 35 minutos', ' past 35 minutes')}<span className="go">›</span></a></li>
            <li><a href={hrefPanel('pedidos', { estado: 'entregado', modalidad: 'domicilio', orden: 'minutos', from: 'hoy' }, A)}><b>{num(r.entregadas)}</b>{T(' entregas terminadas', ' finished deliveries')}{r.entregadas ? ` · ${tasa(r.aTiempo, r.entregadas).texto} ${T('a tiempo', 'on time')}` : ''}<span className="go">›</span></a></li>
            <li><span><b>{masFuera ? `${masFuera.minutos_fuera} min` : SIN_DATO}</b>{masFuera ? ` · ${masFuera.repartidor || T('Motorizado', 'Rider')}, ${T('la que más lleva fuera', 'longest out')}` : T(' · ninguna fuera', ' · none out')}</span></li>
          </ul>
        </Card>
        <Card span={4} i={4} title="Camila" sub={T('Las llamadas de hoy', "Today's calls")}
          foot={<a href={hrefPanel('camila', { from: 'hoy' }, A)} data-drill>{T('Abrir Camila ›', 'Open Camila ›')}</a>}>
          {embudo.total === 0 ? <p className="d-empty">{T('Aún ninguna llamada hoy.', 'No calls yet today.')}</p> : (
            <>
              <div className="d-stack" role="img" aria-label={T(`${embudo.pedidos} pidieron, ${embudo.sinPedido + embudo.colgo} no pidieron, ${embudo.total - embudo.contestadas} sin contestar`, `${embudo.pedidos} ordered, ${embudo.sinPedido + embudo.colgo} did not, ${embudo.total - embudo.contestadas} unanswered`)}>
                <i className="ok" style={{ width: `${(embudo.pedidos / embudo.total) * 100}%` }} />
                <i className="wait" style={{ width: `${((embudo.sinPedido + embudo.colgo) / embudo.total) * 100}%` }} />
                <i className="off" style={{ width: `${((embudo.total - embudo.contestadas) / embudo.total) * 100}%` }} />
              </div>
              <ul className="d-lineas">
                <li><a href={hrefPanel('camila', { from: 'hoy' }, A)}><b>{embudo.total}</b>{T(' llamadas entraron', ' calls came in')}<span className="go">›</span></a></li>
                <li><a href={hrefPanel('camila', { resultado: 'pedido', from: 'hoy' }, A)}><b>{embudo.pedidos}</b>{T(' terminaron en pedido', ' ended in an order')}<span className="go">›</span></a></li>
                {embudo.motivos[0] && <li><a href={hrefPanel('camila', { motivo: embudo.motivos[0].motivo, from: 'hoy' }, A)}><b>{embudo.motivos[0].n}</b> {T('no pidieron:', 'did not order:')} {MOTIVO[embudo.motivos[0].motivo]?.corto.toLowerCase()}<span className="go">›</span></a></li>}
                <li><a href={hrefPanel('camila', { cedula: '1', from: 'hoy' }, A)}><b>{embudo.conCedula}</b>{T(' dieron su cédula', ' gave their ID number')}<span className="go">›</span></a></li>
              </ul>
            </>
          )}
        </Card>
        <Card span={4} i={5} title={T('Clientes', 'Customers')} sub={T('Quién compró hoy', 'Who bought today')}
          foot={<a href={hrefPanel('clientes', {}, F)} data-drill>{T('Abrir Clientes ›', 'Open Customers ›')}</a>}>
          {clientesHoy.total === 0 ? <p className="d-empty">{T('Aún nadie compró hoy.', 'Nobody has bought yet today.')}</p> : (
            <ul className="d-lineas" style={{ margin: 0 }}>
              <li><a href={hrefPanel('pedidos', { from: 'hoy' }, A)}><b>{clientesHoy.total}</b>{T(' personas compraron hoy', ' people bought today')}<span className="go">›</span></a></li>
              <li><span><b>{clientesHoy.repiten}</b>{T(' ya habían comprado antes', ' had bought before')}</span></li>
              <li><span><b>{clientesHoy.nuevos}</b>{T(' compran por primera vez', ' are first-time buyers')}</span></li>
              <li><span><b>{tasa(clientesHoy.conCedula, clientesHoy.total).texto}</b>{T(' con cédula registrada', ' with a registered ID')}</span></li>
            </ul>
          )}
        </Card>
      </div>

      <div className="d-grid">
        <Card span={4} i={6} title={local ? T('Frente a los otros locales', 'Against the other branches') : T('Dinero por local', 'Money by branch')}
          sub={local ? T('Este local contra los demás, hoy', 'This branch against the rest, today') : T('Toque un local y todo el tablero se filtra a ese local', 'Tap a branch and the whole dashboard filters to it')}
          foot={!local && conectados.length < S.locales().length ? T(`${S.locales().length - conectados.length} locales todavía no envían pedidos al tablero`, `${S.locales().length - conectados.length} branches do not send orders to the dashboard yet`) : null}>
          {local ? <FrenteALosOtros local={local} porLocal={porLocal} A={A} /> : (
            <Rank rows={conectados.map((l) => porLocal.find((x) => x.local_id === l.id) || { local_id: l.id, nombre: l.nombre, total: 0, pedidos: 0 }).sort((a, b) => b.total - a.total)}
              meta={(x) => x.pedidos ? pedidosTxt(x.pedidos) : T('ningún pedido hoy', 'no orders today')}
              onName={(x) => irCon({ local: x.local_id })}
              href={(x) => x.total ? hrefPanel('pedidos', { local: x.local_id, from: 'hoy' }, A) : null} d0={entrada ? 240 : 0} />
          )}
        </Card>
        <Card span={4} i={7} title={T('Cómo pagaron', 'How they paid')} sub={T('Lo cobrado hoy por forma de pago', "Today's takings by payment method")}>
          <Rank rows={pagos} label={(x) => PAGO[x.pago] || x.pago} meta={(x) => pedidosTxt(x.pedidos)}
            href={(x) => hrefPanel('pedidos', { pago: x.pago, from: 'hoy' }, A)} d0={entrada ? 240 : 0} vacio={T('Aún no se cobró nada hoy.', 'Nothing taken yet today.')} />
        </Card>
        <Card span={4} i={8} title={T('Dinero por tipo de comida', 'Money by food type')} sub={T('Lo cobrado hoy, plato por plato', "Today's takings, dish by dish")}>
          {cats.length < 3
            ? <p className="d-lede" style={{ fontSize: 15 }}>{cats.length ? T(`Todo lo de hoy fue ${cats[0].categoria.toLowerCase()}: ${money(cats[0].total)} en ${platos(cats[0].unidades)}.`, `Everything today was ${cats[0].categoria.toLowerCase()}: ${money(cats[0].total)} in ${platos(cats[0].unidades)}.`) : T('Aún ningún plato vendido.', 'No dishes sold yet.')}</p>
            : <Rank rows={[...cats, ...(r.envio ? [{ categoria: T('Envío', 'Delivery fee'), total: r.envio, unidades: null }] : [])]} label={(x) => x.categoria}
              meta={(x) => x.unidades != null ? platos(x.unidades) : T('a domicilio', 'delivery')}
              href={(x) => x.unidades != null ? hrefPanel('pedidos', { categoria: x.categoria, from: 'hoy' }, A) : null} d0={entrada ? 240 : 0} />}
        </Card>
      </div>

      <div className="d-grid">
        <Card span={7} i={9} title={T('Los últimos 14 días', 'The last 14 days')} sub={T('Cuánto se cobró cada día · toque un día para ver sus pedidos', 'How much was taken each day · tap a day to see its orders')}
          foot={<a href={hrefPanel('resumen', {}, F)} data-drill>{T('Abrir Resumen ›', 'Open Summary ›')}</a>}>
          {conVenta >= 7
            ? <Columnas dias={serie.dias} valores={serie.valores} pedidos={serie.pedidos}
              href={(i) => hrefPanel('pedidos', { periodo: 'dia', dia: serie.dias[i], from: 'hoy' }, F)}
              titulo={(i) => `${diaLargo(serie.dias[i])}: ${money(serie.valores[i])}, ${pedidosTxt(serie.pedidos[i])}`} />
            : <p className="d-empty">{T(`Este gráfico se enciende a los 7 días con venta. Van ${conVenta}.`, `This chart switches on at 7 days with sales. There are ${conVenta}.`)}</p>}
        </Card>
        <Card span={5} i={10} title={T('Lo que más se pidió hoy', 'Most ordered today')} sub={T('Los cinco platos que más dinero dejaron', 'The five dishes that made the most money')}>
          {top.length === 0 ? <p className="d-empty">{T('Aún ningún plato vendido.', 'No dishes sold yet.')}</p> : (
            <Rank rows={top} meta={(x) => platos(x.unidades)} href={(x) => hrefPanel('pedidos', { categoria: x.categoria, from: 'hoy' }, A)} d0={entrada ? 240 : 0} />
          )}
        </Card>
      </div>
      <span hidden>{tic}</span>
    </div>
  )
}

function FrenteALosOtros({ local, porLocal, A }) {
  const yo = porLocal.find((x) => x.local_id === local) || { total: 0, pedidos: 0 }
  const puesto = porLocal.findIndex((x) => x.local_id === local) + 1
  const lider = porLocal[0]
  if (!yo.pedidos) return <p className="d-empty">{T(`${S.nombreLocal(local)} todavía no cobra nada hoy.`, `${S.nombreLocal(local)} has not taken anything yet today.`)}</p>
  return (
    <>
      <p className="d-lede" style={{ fontSize: 15 }}>
        <a className="d-cifra" href={hrefPanel('pedidos', { from: 'hoy' }, A)}>{S.nombreLocal(local)} {T('lleva', 'has')} {money(yo.total)}</a>
        {porLocal.length >= 3 ? T(`: ${puesto}.º de ${porLocal.length} locales.`, `: #${puesto} of ${porLocal.length} branches.`) : '.'}
        {lider && lider.local_id !== local ? T(` El primero, ${lider.nombre}, lleva ${money(lider.total)}.`, ` The leader, ${lider.nombre}, has ${money(lider.total)}.`) : lider ? T(' Es el que más lleva hoy.', ' It leads today.') : ''}
      </p>
      {lider && lider.local_id !== local && <Bullet actual={yo.total} base={lider.total} etiqueta={lider.nombre} />}
    </>
  )
}

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
  const volverA = q.from === 'hoy' ? T('Centro de mando', 'Command center') : q.from === 'resumen' ? T('Resumen', 'Summary') : q.from

  return (
    <>
      {q.from && <a className="d-back" href={hrefPanel(q.from, {}, F)}>← {T('Volver a', 'Back to')} {volverA}</a>}
      <Card title={titulo} sub={rows.length ? T(`Suman ${money(total)}, IVA incluido`, `They add up to ${money(total)}, VAT included`) : undefined}
        tools={
          <select className="d-select" value={estado} onChange={(e) => irCon({ estado: e.target.value })} aria-label={T('Estado', 'Status')}>
            <option value="">{T('Todos los estados', 'All statuses')}</option>
            <option value="en_curso">{T('En marcha ahora', 'In progress now')}</option>
            {Object.keys(ESTADO).map((k) => <option key={k} value={k}>{ESTADO[k][0]}</option>)}
          </select>
        }
        foot={rows.length > ver ? <><span>{ver} {T('de', 'of')} {rows.length}</span><button type="button" className="d-linkbtn" onClick={() => setVer(rows.length)}>{T('Ver todos', 'See all')}</button></> : null}>
        {rows.length === 0 ? (
          <p className="d-empty">
            <strong>{conFiltro ? T(`Ningún pedido ${estado ? estadoTexto(estado, q.modalidad).toLowerCase() : 'así'} ${PERIODO_FRASE[F.periodo]}.`, `No ${estado ? estadoTexto(estado, q.modalidad).toLowerCase() : 'matching'} orders ${PERIODO_FRASE[F.periodo]}.`) : F.local ? T('Con el local elegido no hay nada.', 'Nothing for the chosen branch.') : T(`Ningún pedido ${PERIODO_FRASE[F.periodo]}.`, `No orders ${PERIODO_FRASE[F.periodo]}.`)}</strong>
            {conFiltro && sinFiltro ? <button type="button" onClick={() => irCon({ estado: '', modalidad: '', canal: '', pago: '', categoria: '' })}>{T(`Hay ${sinFiltro} pedidos en otros estados · Quitar el filtro`, `There are ${sinFiltro} orders in other statuses · Clear the filter`)}</button>
              : F.local ? <button type="button" onClick={() => irCon({ local: '' })}>{T('Puede que el pedido esté en otro local · Ver todos los locales', 'The order may be in another branch · See all branches')}</button> : T('Los pedidos aparecen aquí apenas Camila o la página los reciben.', 'Orders show up here as soon as Camila or the website receives them.')}
          </p>
        ) : (
          <table className="d-table">
            <thead>
              <tr><th>{T('Pedido', 'Order')}</th><th>{T('Hora', 'Time')}</th><th>{T('Cliente', 'Customer')}</th><th>{T('Local', 'Branch')}</th><th>{T('Por dónde pidió', 'Ordered via')}</th><th>{T('Estado', 'Status')}</th>{conMinutos && <th className="d-num">{T('Minutos', 'Minutes')}</th>}<th className="d-num">Total</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, ver).map((p) => {
                const per = S.personaPorId(p.persona_id)
                return (
                  <tr key={p.pedido_id}>
                    <td data-l={T('Pedido', 'Order')}><a href={hrefPanel('pedidos/' + p.pedido_id, { from: q.from || 'pedidos' }, F)}>{p.pedido_id}</a></td>
                    <td data-l={T('Hora', 'Time')}>{F.periodo === 'hoy' || F.periodo === 'ayer' ? hhmm(p.creado_en) : `${fecha(p.creado_en)} ${hhmm(p.creado_en)}`}</td>
                    <td data-l={T('Cliente', 'Customer')}>{per ? <a href={hrefPanel('clientes/' + per.persona_id, {}, F)}>{per.nombre} {per.apellido}</a> : <span className="d-quiet">{T('Sin cliente', 'No customer')}</span>}</td>
                    <td data-l={T('Local', 'Branch')}>{S.nombreLocal(p.local_id)}</td>
                    <td data-l={T('Por dónde', 'Via')} className="d-quiet">{CANAL[p.canal] || p.canal}</td>
                    <td data-l={T('Estado', 'Status')}>{fino && !['entregado', 'cancelado'].includes(p.estado) ? <EstadoPedido pedido={p} compacto /> : <Badge estado={p.estado} modalidad={p.modalidad} />}</td>
                    {conMinutos && <td data-l={T('Minutos', 'Minutes')} className={'d-num' + (p.minutos_entrega > 35 ? ' d-late' : '')}>{p.minutos_entrega ?? SIN_DATO}</td>}
                    <td data-l="Total" className="d-num money">{money(p.total_cobrado)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={conMinutos ? 7 : 6} data-l={T('Pedidos', 'Orders')}>{pedidosTxt(rows.length)}</td><td data-l={T('Suman', 'Total')} className="d-num">{money(total)}</td></tr>
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
  if (!p) return <Card title={T('No encontramos ese pedido', 'We could not find that order')}><p className="d-empty">{T(`El código ${id} no existe.`, `Code ${id} does not exist.`)}</p></Card>
  const pasos = S.pasosDe(p)
  const sig = pasos[pasos.indexOf(p.estado) + 1]
  const hist = Object.entries(p.historial || {}).sort((a, b) => a[1] - b[1]).map(([k, t]) => `${estadoTexto(k, p.modalidad)} ${hhmm(t)}`)
  const avanzar = () => {
    if (!sig) return
    const antes = p.estado
    if (S.cambiarEstado(p.pedido_id, sig)) avisar(T(`${p.pedido_id} pasó a ${estadoTexto(sig, p.modalidad)}`, `${p.pedido_id} moved to ${estadoTexto(sig, p.modalidad)}`), { deshacer: () => S.cambiarEstado(p.pedido_id, antes, { forzar: true }) })
  }
  const volverA = F.from === 'hoy' ? T('Centro de mando', 'Command center') : F.from === 'motos' ? T('Motos', 'Riders') : T('pedidos', 'orders')
  const guardado = () => avisar(T('Guardado.', 'Saved.'))
  return (
    <>
      <a className="d-back" href={hrefPanel(F.from || 'pedidos', {}, F)}>← {T('Volver a', 'Back to')} {volverA}</a>
      <section className="d-hero d-hero--tight">
        <p className="d-eyebrow">{T('Pedido', 'Order')}</p>
        <h1 style={{ marginTop: 4 }}>{id}</h1>
        <p className="d-hero__foot">{fechaLarga(p.creado_en)}, {hhmm(p.creado_en)} · {S.nombreLocal(p.local_id)} · {CANAL[p.canal] || p.canal}</p>
        <p style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge estado={p.estado} modalidad={p.modalidad} /> <span className="d-quiet">{MODALIDAD[p.modalidad]} · {PAGO[p.forma_pago] || p.forma_pago} · {T('Envío', 'Delivery fee')}: {p.envio_cobrado ? money(p.envio_cobrado) : T('sin costo', 'free')}</span>
        </p>
        {hist.length > 0 && <p className="d-hero__foot">{hist.join(' · ')}</p>}
      </section>

      <div className="d-grid">
        <Card span={7} title={T('Lo que pidió', 'What was ordered')}>
          <table className="d-table">
            <tbody>
              {items.map((i, k) => (
                <tr key={k}>
                  <td data-l={T('Plato', 'Item')}>{i.cantidad} × {i.nombre}{i.tamano ? ` · ${i.tamano}` : ''}</td>
                  <td data-l={T('Tipo', 'Type')} className="d-quiet">{i.categoria}</td>
                  <td data-l={T('Precio', 'Price')} className="d-num">{money(i.precio_unitario * i.cantidad)}</td>
                </tr>
              ))}
              <tr><td colSpan={2} data-l={T('Envío', 'Delivery fee')}>{T('Envío', 'Delivery fee')}</td><td data-l={T('Envío', 'Delivery fee')} className="d-num">{p.envio_cobrado ? money(p.envio_cobrado) : T('Sin costo', 'Free')}</td></tr>
              <tr className="d-total"><td colSpan={2}>{T('Total, IVA incluido', 'Total, VAT included')}</td><td data-l="Total" className="d-num">{money(p.total_cobrado)}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card span={5} title={T('Estado del pedido', 'Order status')} sub={T('Un toque avanza un paso; se puede deshacer 5 segundos', 'One tap moves one step; undo within 5 seconds')}>
          <EstadoPedido pedido={p} />
        </Card>
      </div>

      <Card title={T('Cliente', 'Customer')} sub={per?.cedula ? T(`Cédula ${per.cedula} · se le reconoce desde cualquier teléfono`, `ID ${per.cedula} · recognised from any phone`) : T('Sin cédula: no se le reconoce desde otro teléfono', 'No ID number: not recognised from another phone')}>
        {per ? (
          <div className="d-grid" style={{ gap: 12 }}>
            <div className="d-c4"><CampoEditable etiqueta={T('Nombre', 'First name')} valor={per.nombre} onGuardar={(v) => S.actualizarPersona(per.persona_id, { nombre: v })} /></div>
            <div className="d-c4"><CampoEditable etiqueta={T('Apellido', 'Last name')} valor={per.apellido} onGuardar={(v) => S.actualizarPersona(per.persona_id, { apellido: v })} /></div>
            <div className="d-c4">
              <div className="d-campo"><span className="d-campo__lab">{T('Teléfono', 'Phone')}</span>
                <span className="d-campo__val" style={{ cursor: 'default' }}>{per.telefonos.map((t) => S.telefonoBonito(t.telefono)).join(' · ') || T('Sin teléfono', 'No phone')}</span></div>
            </div>
            {dir && (
              <>
                <div className="d-c6"><CampoEditable etiqueta={T('Calle principal y secundaria', 'Main and cross street')} valor={dir.calle} onGuardar={(v) => { S.editarDireccion(dir.direccion_id, { calle: v }); guardado() }} /></div>
                <div className="d-c3"><CampoEditable etiqueta={T('Sector', 'Area')} valor={dir.sector} onGuardar={(v) => { S.editarDireccion(dir.direccion_id, { sector: v }); guardado() }} /></div>
                <div className="d-c3"><CampoEditable etiqueta={T('Referencia para el motorizado', 'Landmark for the rider')} valor={dir.referencia} ayuda={T('Algo que se vea desde la calle', 'Something visible from the street')} onGuardar={(v) => { S.editarDireccion(dir.direccion_id, { referencia: v }); guardado() }} /></div>
              </>
            )}
            <p className="d-c12 d-quiet" style={{ fontSize: 13 }}>
              <a href={hrefPanel('clientes/' + per.persona_id, {}, F)} style={{ color: 'var(--d-green-lit)', fontWeight: 600 }}>{T(`Ver la ficha completa de ${per.nombre} ›`, `See ${per.nombre}'s full record ›`)}</a>
            </p>
          </div>
        ) : <p className="d-empty">{T('Pedido sin cliente asociado.', 'Order without a customer.')}</p>}
      </Card>

      {!['entregado', 'cancelado'].includes(p.estado) && (
        <div className="d-actionbar">
          <button type="button" className="d-btn d-btn--primary" onClick={avanzar}>{T('Siguiente paso', 'Next step')}: {estadoTexto(sig, p.modalidad)}</button>
          <a className="d-btn" href={hrefPanel(F.from || 'pedidos', {}, F)}>{T('Volver', 'Back')}</a>
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
  if (sem.n1 === 0) return [{ txt: T('Ningún pedido en los últimos 7 días', 'No orders in the last 7 days'), href: hrefPanel('pedidos', { periodo: '7d', from: 'resumen' }, A) }]
  L.push({ b: pedidosTxt(sem.n1), txt: T(`, ${money(sem.t1)} cada uno en promedio`, `, ${money(sem.t1)} each on average`), href: hrefPanel('pedidos', { periodo: '7d', from: 'resumen' }, A) })
  if (sem.n0 >= 5) {
    const d = sem.v1 - sem.v0
    if (Math.abs(d) < 5) L.push({ b: T('Casi lo mismo', 'About the same'), txt: T(' que los 7 días anteriores', ' as the previous 7 days'), ancla: '#porque' })
    else {
      L.push({ b: T(`${money(Math.abs(d))} ${d > 0 ? 'más' : 'menos'}`, `${money(Math.abs(d))} ${d > 0 ? 'more' : 'less'}`), txt: T(` que los 7 días anteriores${sem.comunes < sem.locales ? `, con los ${sem.comunes} locales que ya vendían` : ''}`, ` than the previous 7 days${sem.comunes < sem.locales ? `, counting the ${sem.comunes} branches already selling` : ''}`), ancla: '#porque', tono: d > 0 ? 'up' : 'down' })
      const porN = (sem.n1 - sem.n0) * sem.t0, porT = sem.n1 * (sem.t1 - sem.t0)
      const dn = Math.abs(sem.n1 - sem.n0)
      if (Math.abs(porN) > Math.abs(porT) * 3) L.push({ b: T(`Casi todo por ${dn} pedidos ${sem.n1 > sem.n0 ? 'más' : 'menos'}`, `Almost all of it from ${dn} ${sem.n1 > sem.n0 ? 'more' : 'fewer'} orders`), txt: T(', no por el tamaño', ', not from order size'), ancla: '#porque' })
      else if (Math.abs(porT) > Math.abs(porN) * 3) L.push({ b: T(`Casi todo porque cada pedido fue ${money(Math.abs(sem.t1 - sem.t0))} ${sem.t1 > sem.t0 ? 'más grande' : 'más chico'}`, `Almost all of it because each order was ${money(Math.abs(sem.t1 - sem.t0))} ${sem.t1 > sem.t0 ? 'bigger' : 'smaller'}`), txt: '', ancla: '#porque' })
      else L.push({ b: T(`Parte por ${dn} pedidos ${sem.n1 > sem.n0 ? 'más' : 'menos'}`, `Partly from ${dn} ${sem.n1 > sem.n0 ? 'more' : 'fewer'} orders`), txt: T(` y parte por pedidos ${sem.t1 > sem.t0 ? 'más grandes' : 'más chicos'}`, ` and partly from ${sem.t1 > sem.t0 ? 'bigger' : 'smaller'} orders`), ancla: '#porque' })
    }
  }
  if (cats.length) {
    const tot = cats.reduce((t, c) => t + c.total, 0)
    const seg = cats[1] && (10 * cats[1].total) / tot >= 2 ? T(` y ${money((10 * cats[1].total) / tot)} de ${cats[1].categoria.toLowerCase()}`, ` and ${money((10 * cats[1].total) / tot)} from ${cats[1].categoria.toLowerCase()}`) : ''
    L.push({ b: T(`${money((10 * cats[0].total) / tot)} de cada $10`, `${money((10 * cats[0].total) / tot)} of every $10`), txt: T(` fueron de ${cats[0].categoria.toLowerCase()}${seg}`, ` came from ${cats[0].categoria.toLowerCase()}${seg}`), ancla: '#decada10' })
  }
  if (!local && porLocal.length >= 2) L.push({ b: T(`${porLocal[0].nombre} cobró más`, `${porLocal[0].nombre} took the most`), txt: `: ${money(porLocal[0].total)}`, href: hrefPanel('pedidos', { local: porLocal[0].local_id, periodo: '7d', from: 'resumen' }, A) })
  if (embudo.total) {
    const t = tasa(embudo.pedidos, embudo.contestadas)
    L.push({ b: T(`${embudo.contestadas} de ${embudo.total} llamadas contestadas`, `${embudo.contestadas} of ${embudo.total} calls answered`), txt: T(`; ${t.exacto ? `${t.texto} terminó` : `${embudo.pedidos} terminaron`} en pedido`, `; ${t.exacto ? `${t.texto} ended` : `${embudo.pedidos} ended`} in an order`), href: hrefPanel('camila', { periodo: '7d', from: 'resumen' }, A) })
  }
  const m = embudo.motivos[0]
  if (m && m.n >= 3) {
    const POR = { precio: T('por el precio', 'because of the price'), 'demora estimada': T('por la espera', 'because of the wait'), 'fuera de cobertura': T('por estar fuera de cobertura', 'for being out of the delivery area'), 'producto no disponible': T('porque no había el plato', 'because the item was unavailable'), 'solo consultaba': T('porque solo preguntaban', 'because they were only asking') }
    L.push({ b: T(`${m.n} veces`, `${m.n} times`), txt: T(` no pidieron ${POR[m.motivo] || `por ${m.motivo}`}`, ` people did not order ${POR[m.motivo] || m.motivo}`), href: hrefPanel('camila', { periodo: '7d', motivo: m.motivo, from: 'resumen' }, A) })
  }
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
        <div className="d-hero__top"><p className="d-eyebrow">{T('Los últimos 7 días', 'The last 7 days')} · {local ? S.nombreLocal(local) : T('todos los locales', 'all branches')}</p><span className="d-hero__iva">{T('IVA incluido', 'VAT included')}</span></div>
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
        <Card span={6} i={0} title={T('¿Vamos mejor que la semana pasada?', 'Are we doing better than last week?')} sub={T('O entraron más pedidos, o cada pedido fue más grande: se arreglan distinto', 'Either more orders came in, or each order was bigger: they are fixed differently')}>
          <div id="porque">
            {sem.n0 >= 5
              ? <PorQueCambio n0={sem.n0} t0={sem.t0} n1={sem.n1} t1={sem.t1} />
              : <p className="d-empty">{T(`Se compara a partir de 5 pedidos en la semana anterior. Van ${sem.n0}.`, `Comparison starts at 5 orders in the previous week. There are ${sem.n0}.`)}</p>}
          </div>
        </Card>
        <Card span={6} i={1} title={T('Los últimos 14 días', 'The last 14 days')} sub={T('Cuánto se cobró cada día · toque un día para ver sus pedidos', 'How much was taken each day · tap a day to see its orders')}>
          {conVenta >= 7
            ? <Columnas dias={serie.dias} valores={serie.valores} pedidos={serie.pedidos}
              href={(i) => hrefPanel('pedidos', { periodo: 'dia', dia: serie.dias[i], from: 'resumen' }, F)}
              titulo={(i) => `${diaLargo(serie.dias[i])}: ${money(serie.valores[i])}, ${pedidosTxt(serie.pedidos[i])}`} />
            : <p className="d-empty">{T(`Este gráfico se enciende a los 7 días con venta. Van ${conVenta}.`, `This chart switches on at 7 days with sales. There are ${conVenta}.`)}</p>}
        </Card>
      </div>

      <div className="d-grid">
        <Card span={6} i={2} title={T('De cada $10, cuánto fue de qué', 'Of every $10, how much came from what')} sub={T('Lo cobrado en los últimos 7 días por tipo de comida', 'Takings in the last 7 days by food type')}>
          <div id="decada10">
            {cats.length === 0 ? <p className="d-empty">{T('Aún ningún plato vendido.', 'No dishes sold yet.')}</p> : (
              <Rank rows={(verCats ? cats : cats.slice(0, 5))} label={(x) => x.categoria} value={(x) => (10 * x.total) / totalCats}
                meta={(x) => `${money(x.total)} · ${platos(x.unidades)}`}
                href={(x) => hrefPanel('pedidos', { categoria: x.categoria, periodo: '7d', from: 'resumen' }, A)} />
            )}
            {cats.length > 5 && !verCats && <button type="button" className="d-mas" onClick={() => setVerCats(true)}>{T(`Ver las ${cats.length} ›`, `See all ${cats.length} ›`)}</button>}
          </div>
        </Card>
        <Card span={6} i={3} title={T('Dónde se vende más de qué', 'Where more of what is sold')} sub={T('Cada local contra los demás, no contra un promedio que ya lo incluye', 'Each branch against the rest, not against an average that already includes it')}>
          <DondeSeVendeMas filas={donde} />
        </Card>
      </div>

      <div className="d-grid">
        <Card span={6} i={4} title={T('Los platos que más venden', 'Best-selling dishes')} sub={T('Los últimos 7 días', 'The last 7 days')}>
          <table className="d-table">
            <thead><tr><th>{T('Plato', 'Dish')}</th><th className="d-num">{T('Platos', 'Items')}</th><th className="d-num">Total</th></tr></thead>
            <tbody>
              {top.map((t, i) => (
                <tr key={i}>
                  <td data-l={T('Plato', 'Dish')}>{t.nombre}</td>
                  <td data-l={T('Platos', 'Items')} className="d-num">{t.unidades}</td>
                  <td data-l="Total" className="d-num money">{money(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="d-chartfoot">{T('Con este volumen el orden de los primeros puestos todavía cambia de un día a otro.', 'At this volume the top positions still change from one day to the next.')}</p>
        </Card>
        <Card span={6} i={5} title={T('Cuánto cobró cada local', 'How much each branch took')} sub={T('Los últimos 7 días · el nombre filtra, la cifra abre los pedidos', 'The last 7 days · the name filters, the figure opens the orders')}>
          <Rank rows={porLocal} meta={(x) => pedidosTxt(x.pedidos)} onName={(x) => irCon({ local: x.local_id })}
            href={(x) => hrefPanel('pedidos', { local: x.local_id, periodo: '7d', from: 'resumen' }, A)} />
        </Card>
      </div>
    </div>
  )
}
