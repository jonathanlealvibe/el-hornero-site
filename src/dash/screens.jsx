import { useEffect, useMemo, useState } from 'react'
import * as S from './store.js'
import FleetMap from './FleetMap.jsx'
import { Bullet, Dias, PorQueCambio, DondeSeVendeMas } from './graficos.jsx'
import { money, num, hhmm, fecha, tasa, SIN_DATO, UMBRALES } from './format.js'

/* ---------------------------------------------------------------- piezas */

// `span` solo cuando la tarjeta vive dentro de un .d-grid. Suelta, sin clase:
// un `grid-column: span 12` sobre un contenedor de una columna le obliga a
// inventarse doce columnas implícitas y descuadra toda la página.
const Card = ({ title, sub, tools, children, foot, span }) => (
  <section className={'d-card' + (span ? ` d-c${span}` : '')}>
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

const Stat = ({ label, value, foot }) => (
  <article className="d-stat">
    <h3 className="d-stat__label">{label}</h3>
    <p className="d-stat__value">{value}</p>
    {foot && <p className="d-stat__foot">{foot}</p>}
  </article>
)

// Con pocos datos, una lista ordenada con la cifra impresa le gana a cualquier
// gráfico. La barra es el adorno; el número es el dato.
const Rank = ({ rows, label = (r) => r.nombre, value = (r) => r.total, meta, onRow }) => {
  const max = Math.max(...rows.map(value), 1)
  if (!rows.length) return <p className="d-empty">Aún ningún dato en este periodo.</p>
  return (
    <ol className="d-rank">
      {rows.map((r, i) => (
        <li key={i}>
          <button type="button" className="d-rank__row" onClick={onRow ? () => onRow(r) : undefined} disabled={!onRow}>
            <span className="d-rank__name">{label(r)}</span>
            <span className="d-rank__bar"><i style={{ width: `${(value(r) / max) * 100}%` }} /></span>
            <span className="d-rank__val">{money(value(r))}</span>
            {meta && <span className="d-rank__meta">{meta(r)}</span>}
          </button>
        </li>
      ))}
    </ol>
  )
}

const ESTADOS = {
  pendiente_pago: ['Sin pagar', 'wait'], recibido: ['Recibido', 'wait'],
  horno: ['En el horno', 'wait'], camino: ['En camino', 'wait'],
  entregado: ['Entregado', 'ok'], cancelado: ['Cancelado', 'bad'],
}
const Badge = ({ estado }) => {
  const [txt, tone] = ESTADOS[estado] || [estado, 'off']
  return <span className={`d-badge d-badge--${tone}`}>{txt}</span>
}

/* ------------------------------------------------------------------- Hoy */

export function Hoy({ rango, local, onLocal }) {
  const r = useMemo(() => S.resumen(rango), [rango])
  const porLocal = useMemo(() => S.ventaPorLocal(rango), [rango])
  const pend = useMemo(() => S.pedidos(rango).filter((p) => p.estado !== 'entregado'), [rango])
  const cats = useMemo(() => S.ventaPorCategoria(rango), [rango])

  const titular = r.pedidos === 0
    ? 'Todavía no entra ningún pedido hoy.'
    : `${r.pedidos} ${r.pedidos === 1 ? 'pedido' : 'pedidos'} hoy hasta las ${hhmm(new Date())}.`

  const cierre = tasa(r.cerradas, r.conversaciones)

  return (
    <>
      <section className="d-hero">
        <p className="d-eyebrow">{local ? S.localPorId(local)?.nombre : 'Todos los locales'}</p>
        <h1 className="d-hero__line">{titular}</h1>
        <p className="d-hero__money">{money(r.total)}</p>
        <p className="d-hero__foot">IVA incluido</p>
      </section>

      <div className="d-grid">
        <div className="d-c12 d-stats">
          <Stat label="Pedidos" value={num(r.pedidos)} foot={`${r.domicilio} a domicilio`} />
          <Stat label="Promedio por pedido" value={r.pedidos ? money(r.ticket) : SIN_DATO} />
          <Stat label="Llamadas que entraron" value={num(r.conversaciones)} />
          <Stat label="Terminaron en pedido" value={cierre.texto}
            foot={cierre.exacto ? undefined : 'Se muestra la fracción hasta tener 20 llamadas'} />
        </div>
      </div>

      <div className="d-grid">
        <Card span={7} title="Dinero por local" sub="Toca un local para filtrar todo el tablero">
          <Rank rows={porLocal} meta={(x) => `${x.pedidos} ped.`}
            onRow={(x) => onLocal(x.local_id === local ? '' : x.local_id)} />
        </Card>
        <Card span={5} title="Dinero por tipo de comida">
          {cats.length < 3
            ? <p className="d-lede">{cats.length ? `Todo lo de hoy fue ${cats[0].categoria}: ${money(cats[0].total)} en ${cats[0].unidades} platos.` : 'Aún ningún plato vendido.'}</p>
            : <Rank rows={cats} label={(x) => x.categoria} meta={(x) => `${x.unidades} u.`} />}
        </Card>
      </div>

      <Card title="Pendientes ahora" sub={pend.length ? undefined : 'Nada pendiente: todo lo de hoy está entregado.'}>
        {pend.length > 0 && (
          <table className="d-table">
            <thead><tr><th>Pedido</th><th>Local</th><th>Estado</th><th className="d-num">Total</th></tr></thead>
            <tbody>
              {pend.map((p) => (
                <tr key={p.pedido_id}>
                  <td data-l="Pedido"><a href={`#/panel/pedidos/${p.pedido_id}`}>{p.pedido_id}</a></td>
                  <td data-l="Local">{S.localPorId(p.local_id)?.nombre}</td>
                  <td data-l="Estado"><Badge estado={p.estado} /></td>
                  <td data-l="Total" className="d-num">{money(p.total_cobrado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}

/* --------------------------------------------------------------- Pedidos */

export function Pedidos({ rango }) {
  const [estado, setEstado] = useState('')
  const todos = useMemo(() => S.pedidos(rango), [rango])
  const rows = todos.filter((p) => !estado || p.estado === estado)
  const total = rows.reduce((t, p) => t + p.total_cobrado, 0)

  return (
    <Card title={`${rows.length} ${rows.length === 1 ? 'pedido' : 'pedidos'}`} sub={`Suman ${money(total)}`}
      tools={
        <select className="d-select" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
        </select>
      }>
      {rows.length === 0 ? <p className="d-empty">Aún ningún pedido en este periodo.</p> : (
        <table className="d-table">
          <thead>
            <tr><th>Pedido</th><th>Hora</th><th>Cliente</th><th>Local</th><th>Canal</th><th>Estado</th><th className="d-num">Total</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const per = S.personaPorId(p.persona_id)
              return (
                <tr key={p.pedido_id}>
                  <td data-l="Pedido"><a href={`#/panel/pedidos/${p.pedido_id}`}>{p.pedido_id}</a></td>
                  <td data-l="Hora">{hhmm(p.creado_en)}</td>
                  <td>{per ? <a href={`#/panel/clientes/${per.persona_id}`}>{per.nombre} {per.apellido}</a> : SIN_DATO}</td>
                  <td data-l="Local">{S.localPorId(p.local_id)?.nombre}</td>
                  <td data-l="Canal" className="d-dim">{p.canal}</td>
                  <td data-l="Estado"><Badge estado={p.estado} /></td>
                  <td data-l="Total" className="d-num">{money(p.total_cobrado)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Card>
  )
}

export function PedidoFicha({ id }) {
  const p = S.estado().pedidos[id]
  if (!p) return <Card title="No encontramos ese pedido"><p className="d-empty">El código {id} no existe.</p></Card>
  const per = S.personaPorId(p.persona_id)
  const items = S.estado().items.filter((i) => i.pedido_id === id)
  return (
    <>
      <a className="d-back" href="#/panel/pedidos">← Volver a pedidos</a>
      <div className="d-grid">
        <Card span={7} title={`Pedido ${id}`} sub={`${fecha(p.creado_en)} · ${hhmm(p.creado_en)} · ${S.localPorId(p.local_id)?.nombre}`}>
          <table className="d-table">
            <tbody>
              {items.map((i, k) => (
                <tr key={k}>
                  <td>{i.cantidad} × {i.nombre}{i.tamano ? ` · ${i.tamano}` : ''}</td>
                  <td className="d-dim">{i.categoria}</td>
                  <td className="d-num">{money(i.precio_unitario * i.cantidad)}</td>
                </tr>
              ))}
              <tr><td colSpan={2}>Envío</td><td className="d-num">{p.envio_cobrado ? money(p.envio_cobrado) : 'Gratis'}</td></tr>
              <tr className="d-total"><td colSpan={2}>Total</td><td data-l="Total" className="d-num">{money(p.total_cobrado)}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card span={5} title="Cliente">
          {per ? (
            <>
              <p className="d-lede"><a href={`#/panel/clientes/${per.persona_id}`}>{per.nombre} {per.apellido}</a></p>
              <p className="d-dim">{per.telefonos.map((t) => t.telefono).join(' · ')}</p>
              <p className="d-dim">{per.cedula ? `Cédula ${per.cedula}` : 'Sin cédula registrada'}</p>
              <p style={{ marginTop: 12 }}><Badge estado={p.estado} /> · {p.modalidad} · {p.forma_pago}</p>
            </>
          ) : <p className="d-empty">Pedido sin cliente asociado.</p>}
        </Card>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- Ventas */

export function Ventas({ rango, periodoLabel }) {
  const [tab, setTab] = useState('locales')
  const porLocal = useMemo(() => S.ventaPorLocal(rango), [rango])
  const cats = useMemo(() => S.ventaPorCategoria(rango), [rango])
  const top = useMemo(() => S.topProductos(rango, 12), [rango])
  const r = useMemo(() => S.resumen(rango), [rango])

  return (
    <>
      <div className="d-grid">
        <div className="d-c12 d-stats">
          <Stat label="Ventas del periodo" value={money(r.total)} foot="IVA incluido" />
          <Stat label="Sin IVA" value={money(r.total / 1.15)} />
          <Stat label="Pedidos" value={num(r.pedidos)} />
          <Stat label="Promedio por pedido" value={r.pedidos ? money(r.ticket) : SIN_DATO} />
        </div>
      </div>

      <Card title={periodoLabel}
        tools={
          <div className="d-chiprow">
            <button type="button" className={'d-chipf' + (tab === 'locales' ? ' on' : '')} onClick={() => setTab('locales')}>Por local</button>
            <button type="button" className={'d-chipf' + (tab === 'productos' ? ' on' : '')} onClick={() => setTab('productos')}>Por producto</button>
          </div>
        }>
        {tab === 'locales'
          ? <Rank rows={porLocal} meta={(x) => `${x.pedidos} ped.`} />
          : (
            <>
              <p className="d-eyebrow">Por tipo de comida</p>
              <Rank rows={cats} label={(x) => x.categoria} meta={(x) => `${x.unidades} u.`} />
              <p className="d-eyebrow" style={{ marginTop: 20 }}>Los que más venden</p>
              <table className="d-table">
                <thead><tr><th>Plato</th><th>Categoría</th><th className="d-num">Unid.</th><th className="d-num">Total</th></tr></thead>
                <tbody>
                  {top.map((t, i) => (
                    <tr key={i}><td>{t.nombre}</td><td data-l="Categoría" className="d-dim">{t.categoria}</td>
                      <td data-l="Unidades" className="d-num">{t.unidades}</td><td data-l="Total" className="d-num">{money(t.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
      </Card>
    </>
  )
}

/* ---------------------------------------------------------------- Camila */

export function Camila({ rango }) {
  const cs = useMemo(() => S.conversaciones(rango), [rango])
  const contestadas = cs.filter((c) => c.resultado !== 'no_contestada')
  const cerradas = cs.filter((c) => c.resultado === 'pedido')
  const cierre = tasa(cerradas.length, contestadas.length)
  const conCedula = cs.filter((c) => c.cedula_capturada).length

  const motivos = useMemo(() => {
    const m = new Map()
    for (const c of cs) {
      if (!c.motivo_no_cierre) continue
      m.set(c.motivo_no_cierre, (m.get(c.motivo_no_cierre) || 0) + 1)
    }
    return [...m.entries()].map(([motivo, n]) => ({ motivo, n })).sort((a, b) => b.n - a.n)
  }, [cs])

  const vendido = cerradas.reduce((t, c) => {
    const p = c.pedido_id ? S.estado().pedidos[c.pedido_id] : null
    return t + (p ? p.total_cobrado : 0)
  }, 0)

  return (
    <>
      <div className="d-grid">
        <div className="d-c12 d-stats">
          <Stat label="Llamadas que entraron" value={num(cs.length)} />
          <Stat label="Camila contestó" value={`${contestadas.length} de ${cs.length}`} />
          <Stat label="Terminaron en pedido" value={cierre.texto}
            foot={cierre.exacto ? undefined : 'Fracción hasta tener 20 llamadas'} />
          <Stat label="Vendido por teléfono" value={money(vendido)} />
        </div>
      </div>

      <div className="d-grid">
        <Card span={6} title="Por qué no cerraron" sub="Solo llamadas contestadas que no terminaron en pedido">
          {motivos.length === 0
            ? <p className="d-empty">Todas las llamadas contestadas terminaron en pedido.</p>
            : (
              <ol className="d-rank">
                {motivos.map((m) => (
                  <li key={m.motivo}>
                    <div className="d-rank__row">
                      <span className="d-rank__name">{m.motivo}</span>
                      <span className="d-rank__bar"><i style={{ width: `${(m.n / motivos[0].n) * 100}%` }} /></span>
                      <span className="d-rank__val">{m.n}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
        </Card>
        <Card span={6} title="Cédulas capturadas"
          sub="Es lo que permite reconocer a la persona cuando llama desde otro teléfono">
          <p className="d-hero__money" style={{ fontSize: 34 }}>{tasa(conCedula, cs.length).texto}</p>
        </Card>
      </div>

      <Card title="Últimas llamadas">
        {cs.length === 0 ? <p className="d-empty">Aún ninguna llamada en este periodo.</p> : (
          <table className="d-table">
            <thead><tr><th>Hora</th><th>Teléfono</th><th>Local</th><th>Duración</th><th>Resultado</th></tr></thead>
            <tbody>
              {cs.slice(0, 40).map((c) => (
                <tr key={c.conversacion_id}>
                  <td data-l="Hora">{hhmm(c.inicio)}</td>
                  <td data-l="Teléfono" className="d-dim">{c.telefono}</td>
                  <td data-l="Local">{S.localPorId(c.local_id)?.nombre || SIN_DATO}</td>
                  <td>{c.duracion_s ? `${Math.round(c.duracion_s / 60)} min` : SIN_DATO}</td>
                  <td>{c.resultado === 'pedido'
                    ? <a href={`#/panel/pedidos/${c.pedido_id}`}>Pedido {c.pedido_id}</a>
                    : <span className="d-dim">{c.motivo_no_cierre || c.resultado.replace('_', ' ')}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}

/* -------------------------------------------------------------- Clientes */

export function Clientes() {
  const [q, setQ] = useState('')
  const rows = useMemo(() => S.personas({ q }), [q])
  return (
    <Card title={`${rows.length} clientes`}
      sub="Una persona es una cédula: sus teléfonos y direcciones cuelgan de ella"
      tools={<input className="d-input" placeholder="Nombre, cédula o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />}>
      {rows.length === 0 ? <p className="d-empty">Nadie coincide con esa búsqueda.</p> : (
        <table className="d-table">
          <thead>
            <tr><th>Cliente</th><th>Cédula</th><th className="d-num">Teléfonos</th><th className="d-num">Direcciones</th><th className="d-num">Pedidos</th><th className="d-num">Gastado</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 60).map((p) => (
              <tr key={p.persona_id}>
                <td><a href={`#/panel/clientes/${p.persona_id}`}>{p.nombre} {p.apellido}</a></td>
                <td data-l="Cédula" className="d-dim">{p.cedula || 'Sin cédula'}</td>
                <td data-l="Teléfonos" className="d-num">{p.telefonos.length}</td>
                <td data-l="Direcciones" className="d-num">{p.direcciones.length}</td>
                <td data-l="Pedidos" className="d-num">{p.pedidos.length}</td>
                <td data-l="Gastado" className="d-num">{money(p.gastado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

export function Cliente({ id }) {
  const p = S.personaPorId(id)
  if (!p) return <Card title="No encontramos a esa persona"><p className="d-empty">Ficha inexistente.</p></Card>
  const fav = useMemo(() => {
    const m = new Map()
    for (const it of S.estado().items.filter((i) => p.pedidos.some((x) => x.pedido_id === i.pedido_id))) {
      m.set(it.nombre, (m.get(it.nombre) || 0) + it.cantidad)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]
  }, [id])

  return (
    <>
      <a className="d-back" href="#/panel/clientes">← Volver a clientes</a>
      <section className="d-hero d-hero--tight">
        <h1 className="d-hero__line">{p.nombre} {p.apellido}</h1>
        <p className="d-hero__foot">
          {p.cedula ? `Cédula ${p.cedula}` : 'Sin cédula · no se le reconoce desde otro teléfono'}
          {' · '}{p.pedidos.length} pedidos · {money(p.gastado)} en total
        </p>
      </section>

      <div className="d-grid">
        <Card span={4} title="Teléfonos" sub="Todos llegan a esta misma persona">
          <ul className="d-list">
            {p.telefonos.map((t) => (
              <li key={t.telefono}>
                <span>{t.telefono}</span>
                <span className="d-dim">{t.confianza === 'confirmada' ? 'confirmado' : 'inferido'}
                  {t.compartido ? ' · compartido' : ''}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card span={4} title="Direcciones">
          <ul className="d-list">
            {p.direcciones.map((d) => (
              <li key={d.direccion_id}>
                <span><strong>{d.alias}</strong> · {d.calle}</span>
                <span className="d-dim">{d.referencia} · {d.sector}{d.es_default ? ' · principal' : ''}</span>
              </li>
            ))}
            {p.direcciones.length === 0 && <li className="d-dim">Sin direcciones guardadas.</li>}
          </ul>
        </Card>
        <Card span={4} title="Lo que más pide">
          {fav ? <p className="d-lede">{fav[0]}<br /><span className="d-dim">{fav[1]} unidades en total</span></p>
            : <p className="d-empty">Aún sin pedidos.</p>}
        </Card>
      </div>

      <Card title="Historial de pedidos">
        {p.pedidos.length === 0 ? <p className="d-empty">Aún sin pedidos.</p> : (
          <table className="d-table">
            <thead><tr><th>Pedido</th><th>Fecha</th><th>Local</th><th>Canal</th><th className="d-num">Total</th></tr></thead>
            <tbody>
              {p.pedidos.map((o) => (
                <tr key={o.pedido_id}>
                  <td><a href={`#/panel/pedidos/${o.pedido_id}`}>{o.pedido_id}</a></td>
                  <td data-l="Fecha">{fecha(o.creado_en)}</td>
                  <td data-l="Local">{S.localPorId(o.local_id)?.nombre}</td>
                  <td data-l="Canal" className="d-dim">{o.canal}</td>
                  <td data-l="Total" className="d-num">{money(o.total_cobrado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}

export { UMBRALES }

/* ----------------------------------------------------------- Motorizados */

export function Motorizados() {
  const [sel, setSel] = useState(null)
  const [tic, setTic] = useState(0)
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) setTic((n) => n + 1) }, 20000)
    return () => clearInterval(t)
  }, [])
  const entregas = useMemo(() => S.enRuta(), [tic])
  const elegida = entregas.find((e) => e.pedido_id === sel) || null
  const atrasadas = entregas.filter((e) => e.atrasado).length

  if (entregas.length === 0) {
    return (
      <Card title="Ninguna moto en la calle">
        <p className="d-empty">
          Cuando un pedido salga del local, la moto aparece aquí y se puede seguir en el mapa.
        </p>
      </Card>
    )
  }

  return (
    <>
      <div className="d-grid">
        <div className="d-c12 d-stats">
          <Stat label="Motos en la calle" value={num(entregas.length)} />
          <Stat label="Pasadas de 35 minutos" value={num(atrasadas)}
            foot={atrasadas ? 'Conviene avisar al cliente antes de que llame' : 'Todas dentro de lo normal'} />
          <Stat label="En reparto" value={money(entregas.reduce((t, e) => t + e.total_cobrado, 0))} />
          <Stat label="Más tiempo fuera"
            value={entregas[0]?.minutos_fuera != null ? `${entregas[0].minutos_fuera} min` : SIN_DATO} />
        </div>
      </div>

      <Card
        title={elegida ? `Entrega ${elegida.pedido_id}` : 'Todas las entregas ahora'}
        sub={elegida
          ? `${elegida.repartidor} · salió hace ${elegida.minutos_fuera} min · ${S.localPorId(elegida.local_id)?.nombre}`
          : 'Toca una moto en el mapa o una fila de abajo para seguir solo esa'}
        tools={elegida && <button type="button" className="d-btn" onClick={() => setSel(null)}>Ver todas</button>}>
        <FleetMap entregas={entregas} seleccion={sel} onSelect={setSel} />
      </Card>

      {elegida && (
        <Card title="Esta entrega">
          <table className="d-table">
            <tbody>
              <tr><td data-l="Cliente">{elegida.persona ? `${elegida.persona.nombre} ${elegida.persona.apellido}` : SIN_DATO}</td>
                <td data-l="Teléfono" className="d-dim">{elegida.persona?.telefonos[0]?.telefono || SIN_DATO}</td></tr>
              <tr><td data-l="Dirección">{elegida.destino?.calle || SIN_DATO}</td>
                <td data-l="Sector" className="d-dim">{elegida.destino?.sector || SIN_DATO}</td></tr>
              <tr><td data-l="Total">{money(elegida.total_cobrado)}</td>
                <td data-l="Pago" className="d-dim">{elegida.forma_pago}</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 12 }}>
            <a className="d-btn" href={`#/panel/pedidos/${elegida.pedido_id}`}>Ver el pedido completo</a>
          </p>
        </Card>
      )}

      <Card title="Quién está fuera">
        <table className="d-table">
          <thead><tr><th>Motorizado</th><th>Pedido</th><th>Local</th><th>Sector</th><th>Fuera</th><th className="d-num">Total</th></tr></thead>
          <tbody>
            {entregas.map((e) => (
              <tr key={e.pedido_id}
                onClick={() => setSel(e.pedido_id === sel ? null : e.pedido_id)}
                className={e.pedido_id === sel ? 'd-row--on' : ''}
                style={{ cursor: 'pointer' }}>
                <td data-l="Motorizado">{e.repartidor || SIN_DATO}</td>
                <td data-l="Pedido" className="d-dim">{e.pedido_id}</td>
                <td data-l="Local">{S.localPorId(e.local_id)?.nombre}</td>
                <td data-l="Sector" className="d-dim">{e.destino?.sector || SIN_DATO}</td>
                <td data-l="Fuera">{e.minutos_fuera != null
                  ? <span className={e.atrasado ? 'd-late' : ''}>{e.minutos_fuera} min</span> : SIN_DATO}</td>
                <td data-l="Total" className="d-num">{money(e.total_cobrado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}

/* -------------------------------------------------------------- Resumen */

// El párrafo se arma con una PLANTILLA, nunca con un modelo de lenguaje: un
// tablero que redacta de una forma que nadie escribió puede equivocarse de una
// forma que nadie predijo. Si una cifra no llega a su umbral, su oración entera
// desaparece y las demás se reacomodan.
function parrafo({ sem, cats, r, cs, motivo }) {
  const f = []
  f.push(`Esta semana entraron ${sem.n1} pedidos y se cobró ${money(sem.v1)}.`)
  if (sem.n0 >= 5) {
    const d = sem.v1 - sem.v0
    f.push(`Son ${money(Math.abs(d))} ${d >= 0 ? 'más' : 'menos'} que la semana pasada, con los mismos ${sem.comunes} locales.`)
  }
  if (sem.n1) f.push(`Cada pedido dejó ${money(sem.t1)} en promedio.`)
  if (cats.length) {
    const tot = cats.reduce((t, c) => t + c.total, 0)
    f.push(`De cada $10 que entró, ${money((10 * cats[0].total) / tot)} fueron de ${cats[0].categoria.toLowerCase()}.`)
  }
  if (cs.total) {
    const t = tasa(cs.cerradas, cs.contestadas)
    f.push(`Camila contestó ${cs.contestadas} de ${cs.total} llamadas y ${t.exacto ? `el ${t.texto} terminó` : `${cs.cerradas} terminaron`} en pedido.`)
  }
  if (motivo) f.push(`De las que no cerraron, lo que más se repitió fue que ${motivo.frase}, ${motivo.n} veces.`)
  void r
  return f.join(' ')
}

const FRASE_MOTIVO = {
  'fuera de cobertura': 'estaban fuera de cobertura',
  precio: 'les pareció caro',
  'demora estimada': 'les pareció mucha la espera',
  'producto no disponible': 'no teníamos el plato',
  'solo consultaba': 'solo estaban preguntando',
}

export function Resumen({ local }) {
  const serie = useMemo(() => S.serieDiaria(14, local), [local])
  const sem = useMemo(() => S.semanaContraSemana(local), [local])
  const hcs = useMemo(() => S.hoyContraLaSemanaPasada(local), [local])
  const rango7 = useMemo(() => ({
    desde: serie.dias[serie.dias.length - 7],
    hasta: serie.dias[serie.dias.length - 1],
    local: local || undefined,
  }), [serie, local])
  const cats = useMemo(() => S.ventaPorCategoria(rango7), [rango7])
  const donde = useMemo(() => S.dondeSeVendeMas(rango7), [rango7])
  const r = useMemo(() => S.resumen(rango7), [rango7])
  const convs = useMemo(() => S.conversaciones(rango7), [rango7])

  const cs = {
    total: convs.length,
    contestadas: convs.filter((c) => c.resultado !== 'no_contestada').length,
    cerradas: convs.filter((c) => c.resultado === 'pedido').length,
  }
  const motivo = useMemo(() => {
    const m = new Map()
    for (const c of convs) if (c.motivo_no_cierre) m.set(c.motivo_no_cierre, (m.get(c.motivo_no_cierre) || 0) + 1)
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
    return top ? { frase: FRASE_MOTIVO[top[0]] || top[0], n: top[1] } : null
  }, [convs])

  const totalCats = cats.reduce((t, c) => t + c.total, 0)

  return (
    <>
      <section className="d-hero">
        <p className="d-eyebrow">Los últimos 7 días · {local ? S.localPorId(local)?.nombre : 'todos los locales'}</p>
        <p className="d-parrafo">{parrafo({ sem, cats, r, cs, motivo })}</p>
      </section>

      <div className="d-grid">
        <Card span={5} title="Hoy contra el mismo día la semana pasada"
          sub="A esta misma hora, para que la comparación sea justa">
          <p className="d-hero__money" style={{ fontSize: 30 }}>{money(hcs.hoy)}</p>
          <Bullet actual={hcs.hoy} base={hcs.base} />
          <p className="d-chartfoot">
            {hcs.base > 0
              ? <>La marca negra es el mismo día la semana pasada: {money(hcs.base)}.{' '}
                {hcs.hoy >= hcs.base ? 'Vamos arriba' : 'Vamos abajo'} por {money(Math.abs(hcs.hoy - hcs.base))}.</>
              : 'Todavía no hay un mismo día de la semana pasada con el que comparar.'}
          </p>
        </Card>
        <Card span={7} title="Los últimos 14 días" sub="Cuánto se cobró cada día">
          <Dias dias={serie.dias} valores={serie.valores} />
        </Card>
      </div>

      <div className="d-grid">
        <Card span={6} title="¿Entraron más pedidos o cada pedido fue más grande?"
          sub="Las dos cosas se arreglan de forma distinta, por eso se separan">
          {sem.n0 >= 5
            ? <PorQueCambio n0={sem.n0} t0={sem.t0} n1={sem.n1} t1={sem.t1} />
            : <p className="d-empty">Hace falta una semana anterior con al menos 5 pedidos para comparar.</p>}
        </Card>
        <Card span={6} title="De cada $10 que entró, cuánto fue de qué">
          {cats.length === 0 ? <p className="d-empty">Aún ningún plato vendido.</p> : (
            <ul className="d-rank">
              {cats.map((c) => (
                <li key={c.categoria}>
                  <div className="d-rank__row">
                    <span className="d-rank__name">{c.categoria}</span>
                    <span className="d-rank__bar"><i style={{ width: `${(c.total / cats[0].total) * 100}%` }} /></span>
                    <span className="d-rank__val">{money((10 * c.total) / totalCats)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="d-chartfoot">De cada diez dólares cobrados en los últimos 7 días.</p>
        </Card>
      </div>

      <div className="d-grid">
        <Card span={6} title="Dónde se vende más de qué"
          sub="Cada local comparado con los otros locales, no con un promedio que ya lo incluye">
          <DondeSeVendeMas filas={donde} />
        </Card>
        <Card span={6} title="Los platos que más venden" sub="Los últimos 7 días">
          <table className="d-table">
            <thead><tr><th>Plato</th><th className="d-num">Unid.</th><th className="d-num">Total</th></tr></thead>
            <tbody>
              {S.topProductos(rango7, 10).map((t, i) => (
                <tr key={i}>
                  <td data-l="Plato">{t.nombre}</td>
                  <td data-l="Unidades" className="d-num">{t.unidades}</td>
                  <td data-l="Total" className="d-num">{money(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="d-chartfoot">
            Con este volumen el orden de los primeros puestos todavía cambia de un día a otro.
          </p>
        </Card>
      </div>

      <Card title="Cuánto se cobró por local" sub="Los últimos 7 días">
        <Rank rows={S.ventaPorLocal(rango7)} meta={(x) => `${x.pedidos} ped.`} />
      </Card>
    </>
  )
}
