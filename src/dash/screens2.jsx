import { Fragment, useEffect, useMemo, useState } from 'react'
import * as S from './store.js'
import FleetMap from './FleetMap.jsx'
import { money, num, hhmm, fecha, dur, tasa, SIN_DATO } from './format.js'
import { hrefPanel, irCon, PERIODO_FRASE } from './nav.js'
import { useVersion } from './useStore.js'
import { useEntrada, marcar, useMovil } from './motion.js'
import { T } from './i18n.js'
import { cuenta, CANAL, MOTIVO, RESULTADO, CONFIANZA, PAGO, MODALIDAD, tituloLista } from './textos.js'
import { EstadoPedido, CampoEditable, Dialogo, useToast } from './Editable.jsx'
import { Card, Stat, Rank, Badge } from './screens.jsx'

const llamadasTxt = (n) => cuenta(n, 'llamada', 'llamadas', 'call', 'calls')
const pedidosTxt = (n) => cuenta(n, 'pedido', 'pedidos', 'order', 'orders')
const hoyKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date())

/* ---------------------------------------------------------------- Camila */

export function Camila({ rango, F, q }) {
  const version = useVersion()
  const filtros = { ...rango, resultado: q.resultado, motivo: q.motivo, cedula: q.cedula }
  const cs = useMemo(() => S.conversaciones(filtros), [JSON.stringify(filtros), version]) // eslint-disable-line react-hooks/exhaustive-deps
  const embudo = useMemo(() => S.embudoLlamadas(rango), [rango, version])
  const entrada = useEntrada()
  const [ver, setVer] = useState(40)
  const [abierta, setAbierta] = useState(null)      // la llamada cuyo detalle está abierto
  const conFiltro = q.resultado || q.motivo || q.cedula
  const titulo = conFiltro ? tituloLista({ n: cs.length, resultado: q.resultado, motivo: q.motivo, cedula: q.cedula, local: F.local ? S.nombreLocal(F.local) : null, periodo: F.periodo, dia: F.dia }) : T('Las llamadas', 'The calls')
  const cierre = tasa(embudo.pedidos, embudo.contestadas)
  const vendido = useMemo(() => cs.filter((c) => c.resultado === 'pedido').reduce((t, c) => t + (c.pedido_id ? S.estado().pedidos[c.pedido_id]?.total_cobrado || 0 : (c.total || 0)), 0), [cs])

  return (
    <div className={entrada ? 'd-entrada' : ''} style={{ display: 'grid', gap: 20 }}>
      {q.from && <a className="d-back" href={hrefPanel(q.from, {}, F)}>← {T('Volver a', 'Back to')} {q.from === 'hoy' ? T('Centro de mando', 'Command center') : T('Resumen', 'Summary')}</a>}
      <div className="d-stats">
        <Stat label={T('Llamadas que entraron', 'Calls received')} value={embudo.total ? num(embudo.total) : SIN_DATO} foot={embudo.total ? T(`Camila contestó ${embudo.contestadas}`, `Camila answered ${embudo.contestadas}`) : T(`Aún ninguna llamada ${PERIODO_FRASE[F.periodo]}`, `No calls yet ${PERIODO_FRASE[F.periodo]}`)}
          href={embudo.total ? hrefPanel('camila', { resultado: '', motivo: '', cedula: '' }, F) : null} go={T('Ver todas', 'See all')} />
        <Stat label={T('Terminaron en pedido', 'Ended in an order')} value={embudo.contestadas ? cierre.texto : SIN_DATO}
          foot={embudo.contestadas ? (cierre.exacto ? T(`de ${embudo.contestadas} contestadas`, `of ${embudo.contestadas} answered`) : T(`${embudo.pedidos} de ${embudo.contestadas} contestadas`, `${embudo.pedidos} of ${embudo.contestadas} answered`)) : T('Sin llamadas contestadas', 'No answered calls')}
          href={embudo.pedidos ? hrefPanel('camila', { resultado: 'pedido' }, F) : null} go={T(`Ver las ${embudo.pedidos}`, `See the ${embudo.pedidos}`)} />
        <Stat label={T('Vendido por teléfono', 'Sold by phone')} value={money(vendido)} foot={T('Lo cobrado en pedidos que entraron por llamada', 'Takings from orders that came in by phone')} />
        <Stat label={T('Dieron su cédula', 'Gave their ID number')} value={embudo.total ? tasa(embudo.conCedula, embudo.total).texto : SIN_DATO}
          foot={T('Con la cédula se reconoce a la persona aunque llame desde otro teléfono', 'With the ID the person is recognised even from another phone')}
          href={embudo.conCedula ? hrefPanel('camila', { cedula: '1' }, F) : null} go={T(`Ver las ${embudo.conCedula}`, `See the ${embudo.conCedula}`)} />
      </div>

      <div className="d-grid">
        <Card span={6} i={0} title={T('Por qué no pidieron', 'Why they did not order')} sub={T('Solo las llamadas contestadas que no terminaron en pedido', 'Only answered calls that did not end in an order')}>
          {embudo.motivos.length === 0
            ? <p className="d-empty">{embudo.total ? T('Todas las llamadas contestadas terminaron en pedido.', 'Every answered call ended in an order.') : T('Aún ninguna llamada.', 'No calls yet.')}</p>
            : (
              <ol className="d-rank">
                {embudo.motivos.map((m, i) => (
                  <li key={m.motivo}>
                    <div className="d-rank__row">
                      <span className="d-rank__name">{MOTIVO[m.motivo]?.corto || m.motivo}</span>
                      <span className="d-rank__bar"><i style={{ width: `${(m.n / embudo.motivos[0].n) * 100}%`, '--i': i }} /></span>
                      <a className="d-rank__val" href={hrefPanel('camila', { motivo: m.motivo }, F)} data-drill>{m.n}</a>
                    </div>
                  </li>
                ))}
              </ol>
            )}
        </Card>
        <Card span={6} i={1} title={T('Qué pasó con cada llamada', 'What happened with each call')} sub={T('Contestada, colgó, no pidió o pidió', 'Answered, hung up, did not order or ordered')}>
          {embudo.total === 0 ? <p className="d-empty">{T('Aún ninguna llamada.', 'No calls yet.')}</p> : (
            <>
              <div className="d-stack" role="img" aria-label={T(`${embudo.pedidos} pidieron, ${embudo.sinPedido} no pidieron, ${embudo.colgo} colgaron, ${embudo.total - embudo.contestadas} sin contestar`, `${embudo.pedidos} ordered, ${embudo.sinPedido} did not order, ${embudo.colgo} hung up, ${embudo.total - embudo.contestadas} unanswered`)}>
                <i className="ok" style={{ width: `${(embudo.pedidos / embudo.total) * 100}%` }} />
                <i className="wait" style={{ width: `${((embudo.sinPedido + embudo.colgo) / embudo.total) * 100}%` }} />
                <i className="off" style={{ width: `${((embudo.total - embudo.contestadas) / embudo.total) * 100}%` }} />
              </div>
              <div className="d-stack__legend">
                <div><i style={{ background: 'var(--d-green-bar)' }} /><a href={hrefPanel('camila', { resultado: 'pedido' }, F)}>{T('Pidieron', 'Ordered')}</a><b>{embudo.pedidos}</b></div>
                <div><i style={{ background: 'var(--d-yellow)' }} /><a href={hrefPanel('camila', { resultado: 'sin_pedido' }, F)}>{T('No pidieron', 'Did not order')}</a><b>{embudo.sinPedido}</b></div>
                <div><i style={{ background: 'var(--d-yellow)', opacity: .6 }} /><a href={hrefPanel('camila', { resultado: 'colgo' }, F)}>{T('Colgaron', 'Hung up')}</a><b>{embudo.colgo}</b></div>
                <div><i style={{ background: 'var(--d-line-ctl)' }} /><a href={hrefPanel('camila', { resultado: 'no_contestada' }, F)}>{T('Sin contestar', 'Unanswered')}</a><b>{embudo.total - embudo.contestadas}</b></div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card i={2} title={titulo} sub={conFiltro ? undefined : `${llamadasTxt(cs.length)} ${PERIODO_FRASE[F.periodo]}`}
        tools={conFiltro ? <button type="button" className="d-btn d-btn--sm" onClick={() => irCon({ resultado: '', motivo: '', cedula: '' })}>{T('Quitar el filtro', 'Clear the filter')}</button> : null}
        foot={cs.length > ver ? <><span>{ver} {T('de', 'of')} {cs.length}</span><button type="button" className="d-linkbtn" onClick={() => setVer(cs.length)}>{T('Ver todas', 'See all')}</button></> : null}>
        {cs.length === 0 ? <p className="d-empty"><strong>{T(`Ninguna llamada ${PERIODO_FRASE[F.periodo]}.`, `No calls ${PERIODO_FRASE[F.periodo]}.`)}</strong>{T('Las llamadas aparecen aquí apenas terminan.', 'Calls show up here as soon as they end.')}</p> : (
          <table className="d-table">
            <thead><tr><th>{T('Hora', 'Time')}</th><th>{T('Teléfono', 'Phone')}</th><th>{T('Local', 'Branch')}</th><th>{T('Duración', 'Length')}</th><th>{T('Resultado', 'Outcome')}</th><th>{T('Detalle', 'Detail')}</th></tr></thead>
            <tbody>
              {cs.slice(0, ver).map((c) => {
                const per = c.persona_id ? S.personaPorId(c.persona_id) : null
                return (
                  <tr key={c.conversacion_id}>
                    <td data-l={T('Hora', 'Time')}>{F.periodo === 'hoy' || F.periodo === 'ayer' ? hhmm(c.inicio) : `${fecha(c.inicio)} ${hhmm(c.inicio)}`}</td>
                    <td data-l={T('Teléfono', 'Phone')}>{per ? <a href={hrefPanel('clientes/' + per.persona_id, {}, F)}>{per.nombre} {per.apellido}</a> : c.contacto ? <span>{c.contacto}</span> : <span className="d-quiet">{S.telefonoBonito(c.telefono)}</span>}</td>
                    <td data-l={T('Local', 'Branch')}>{S.nombreLocal(c.local_id) || SIN_DATO}</td>
                    <td data-l={T('Duración', 'Length')}>{c.duracion_s ? dur(c.duracion_s) : SIN_DATO}</td>
                    <td data-l={T('Resultado', 'Outcome')}>{c.resultado === 'pedido' && c.pedido_id
                      ? <a href={hrefPanel('pedidos/' + c.pedido_id, { from: 'camila' }, F)}>{T('Pidió', 'Ordered')} · {c.pedido_id}</a>
                      : c.resultado === 'pedido' ? <span>{T('Pidió', 'Ordered')}{c.total ? ` · ${money(c.total)}` : ''}</span>
                      : <span className="d-quiet">{RESULTADO[c.resultado]}{c.motivo_no_cierre ? ` · ${MOTIVO[c.motivo_no_cierre]?.corto || c.motivo_no_cierre}` : ''}</span>}</td>
                    <td data-l={T('Detalle', 'Detail')}>{c.transcripcion?.length || c.resumen
                      ? <button type="button" className="d-btn d-btn--sm" onClick={() => setAbierta(c)}>{T('Resumen y transcripción', 'Summary and transcript')}</button>
                      : <span className="d-quiet">{SIN_DATO}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
      {abierta && <LlamadaDetalle c={abierta} onCerrar={() => setAbierta(null)} />}
    </div>
  )
}

/* ------------------------------------------------ una llamada, completa */

// Lo que la plataforma de voz deja de cada llamada: resumen, datos guardados,
// acciones y la transcripción palabra por palabra.
function LlamadaDetalle({ c, onCerrar }) {
  const avisar = useToast()
  const per = c.persona_id ? S.personaPorId(c.persona_id) : null
  const quien = per ? `${per.nombre} ${per.apellido}`.trim() : (c.contacto || S.telefonoBonito(c.telefono) || T('Sin nombre', 'No name'))
  const datos = c.datos && typeof c.datos === 'object' ? Object.entries(c.datos) : []
  const lineas = (c.transcripcion || []).map((m) => `${m.q === 'cliente' ? quien : 'Camila'}: ${m.t}`).join('\n')
  const copiar = async () => {
    try { await navigator.clipboard.writeText(lineas); avisar(T('Transcripción copiada', 'Transcript copied')) }
    catch { avisar(T('No se pudo copiar', 'Could not copy')) }
  }
  return (
    <Dialogo ancho titulo={`${T('Llamada de las', 'Call at')} ${hhmm(c.inicio)} · ${quien}`} onCerrar={onCerrar}>
      <div className="d-llamada">
        <div className="d-llamada__meta">
          <span className="d-chipq">{fecha(c.inicio)} · {hhmm(c.inicio)}</span>
          <span className="d-chipq">{c.duracion_s ? dur(c.duracion_s) : SIN_DATO}</span>
          <span className={'d-badge ' + (c.resultado === 'pedido' ? 'd-badge--ok' : c.resultado === 'no_contestada' ? 'd-badge--off' : 'd-badge--wait')}>{RESULTADO[c.resultado]}{c.total ? ` · ${money(c.total)}` : ''}</span>
          {c.local_id && <span className="d-chipq">{S.nombreLocal(c.local_id)}</span>}
          {c.modalidad && <span className="d-chipq">{MODALIDAD[c.modalidad]}</span>}
          {c.origen === 'real' && <span className="d-badge d-badge--ok">{T('Llamada real', 'Real call')}</span>}
        </div>
        {c.resumen && <section><h3>{T('Resumen', 'Summary')}</h3><p className="d-llamada__resumen">{c.resumen}</p></section>}
        <section>
          <h3>{T('Datos que quedaron guardados', 'Data saved')}</h3>
          {datos.length
            ? <dl className="d-kv2">{datos.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
            : <p className="d-quiet">{T('No alcanzó a guardar datos.', 'Nothing was saved.')}</p>}
        </section>
        {c.acciones?.length > 0 && (
          <section>
            <h3>{T('Lo que hizo Camila', 'What Camila did')}</h3>
            <div className="d-llamada__meta">{c.acciones.map((a, i) => <span key={i} className="d-chipq">{a}</span>)}</div>
          </section>
        )}
        {c.transcripcion?.length > 0 && (
          <section>
            <h3>{T('Transcripción completa', 'Full transcript')} · {c.transcripcion.length} {T('intervenciones', 'turns')}</h3>
            {c.nota && <p className="d-chat__nota">{c.nota}</p>}
            <div className="d-chat">
              {c.transcripcion.map((m, i) => (
                <div key={i} className={'d-chat__m d-chat__m--' + (m.q === 'cliente' ? 'cliente' : 'camila')}>
                  <b>{m.q === 'cliente' ? quien : 'Camila'}</b>{m.t}
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="d-dialog__acts">
          {c.transcripcion?.length > 0 && <button type="button" className="d-btn" onClick={copiar}>{T('Copiar transcripción', 'Copy transcript')}</button>}
          <button type="button" className="d-btn d-btn--primary" onClick={onCerrar}>{T('Cerrar', 'Close')}</button>
        </div>
      </div>
    </Dialogo>
  )
}

/* -------------------------------------------------------------- Clientes */

export function Clientes({ q, F }) {
  const version = useVersion()
  const [texto, setTexto] = useState(q.q || '')
  useEffect(() => { const t = setTimeout(() => { if ((q.q || '') !== texto) irCon({ q: texto }) }, 250); return () => clearTimeout(t) }, [texto]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => S.personas({ q: q.q }), [q.q, version])
  const [ver, setVer] = useState(60)
  return (
    <Card title={cuenta(rows.length, 'cliente', 'clientes', 'customer', 'customers')}
      sub={T('Cada cliente es una persona con cédula; sus teléfonos y direcciones se guardan bajo ella', 'Each customer is a person with an ID number; their phones and addresses are kept under it')}
      tools={<input className="d-input" placeholder={T('Buscar por nombre, cédula o teléfono', 'Search by name, ID or phone')} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={T('Buscar', 'Search')} />}
      foot={rows.length > ver ? <><span>{ver} {T('de', 'of')} {rows.length}</span><button type="button" className="d-linkbtn" onClick={() => setVer(rows.length)}>{T('Ver todos', 'See all')}</button></> : null}>
      {rows.length === 0 ? (
        <p className="d-empty">
          <strong>{q.q ? T(`Nadie coincide con «${q.q}».`, `Nobody matches “${q.q}”.`) : T('Todavía no hay clientes registrados.', 'No customers registered yet.')}</strong>
          {q.q ? <button type="button" onClick={() => { setTexto(''); irCon({ q: '' }) }}>{T('Busque por nombre, cédula o los últimos números del teléfono · Borrar la búsqueda', 'Search by name, ID or the last digits of the phone · Clear the search')}</button>
            : T('Cada persona que Camila registra aparece aquí con su cédula, sus teléfonos y sus direcciones.', 'Every person Camila registers shows up here with their ID, phones and addresses.')}
        </p>
      ) : (
        <table className="d-table">
          <thead>
            <tr><th>{T('Cliente', 'Customer')}</th><th>{T('Cédula', 'ID number')}</th><th className="d-num">{T('Teléfonos', 'Phones')}</th><th className="d-num">{T('Direcciones', 'Addresses')}</th><th className="d-num">{T('Pedidos', 'Orders')}</th><th className="d-num">{T('Gastado', 'Spent')}</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, ver).map((p) => (
              <tr key={p.persona_id}>
                <td data-l={T('Cliente', 'Customer')}><a href={hrefPanel('clientes/' + p.persona_id, {}, F)}>{p.nombre} {p.apellido}</a></td>
                <td data-l={T('Cédula', 'ID number')} className="d-quiet">{p.cedula || T('Sin cédula', 'No ID')}</td>
                <td data-l={T('Teléfonos', 'Phones')} className="d-num">{p.telefonos.length}</td>
                <td data-l={T('Direcciones', 'Addresses')} className="d-num">{p.direcciones.length}</td>
                <td data-l={T('Pedidos', 'Orders')} className="d-num">{p.pedidos.length}</td>
                <td data-l={T('Gastado', 'Spent')} className="d-num money">{money(p.gastado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

export function Cliente({ id, F }) {
  const version = useVersion()
  const avisar = useToast()
  const p = useMemo(() => S.personaPorId(id), [id, version])
  const fav = useMemo(() => {
    if (!p) return null
    const m = new Map()
    for (const it of S.estado().items.filter((i) => p.pedidos.some((x) => x.pedido_id === i.pedido_id))) m.set(it.nombre, (m.get(it.nombre) || 0) + it.cantidad)
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]
  }, [p])
  const [nuevoTel, setNuevoTel] = useState('')
  const [pregunta, setPregunta] = useState(null)
  const [nuevaDir, setNuevaDir] = useState(null)
  if (!p) return <Card title={T('No encontramos a esa persona', 'We could not find that person')}><p className="d-empty">{T('Ficha inexistente.', 'No such record.')}</p></Card>

  const guardado = () => avisar(T('Guardado.', 'Saved.'))
  const guardarPersona = (campos) => { const r = S.actualizarPersona(p.persona_id, campos); if (r.ok) guardado(); return r }
  const agregarTel = () => {
    const tel = S.normalizarTelefono(nuevoTel)
    if (!tel || !/^\+593\d{9}$/.test(tel)) { avisar(T('El celular necesita 10 números y empieza por 09; escríbalo como 0991234567.', 'The mobile needs 10 digits and starts with 09; write it as 0991234567.')); return }
    const otros = S.duenosDe(tel, p.persona_id)
    if (otros.length) { setPregunta({ tipo: 'compartir', telefono: tel, otra: otros[0] }); return }
    S.vincularTelefono(p.persona_id, tel, 'confirmada'); setNuevoTel(''); guardado()
  }
  const quitar = (tel) => {
    const r = S.quitarTelefono(p.persona_id, tel)
    if (r.error) avisar(T(r.error, 'Without a phone, Camila will not recognise them.')); else guardado()
    setPregunta(null)
  }
  const editarDir = (d, campos) => { S.editarDireccion(d.direccion_id, campos); guardado() }

  return (
    <>
      <a className="d-back" href={hrefPanel('clientes', {}, F)}>← {T('Volver a clientes', 'Back to customers')}</a>
      <section className="d-hero d-hero--tight">
        <p className="d-eyebrow">{T('Cliente', 'Customer')}</p>
        <h1 style={{ marginTop: 4 }}>{p.nombre} {p.apellido}</h1>
        <p className="d-hero__foot">
          {p.cedula ? T(`Cédula ${p.cedula} · se le reconoce desde cualquiera de sus teléfonos`, `ID ${p.cedula} · recognised from any of their phones`) : T('Sin cédula · no se le reconoce desde otro teléfono', 'No ID number · not recognised from another phone')}
          {' · '}{pedidosTxt(p.pedidos.length)} · {money(p.gastado)} {T('en total', 'in total')}
        </p>
      </section>

      <div className="d-grid">
        <Card span={4} i={0} title={T('Datos', 'Details')} sub={T('Toque un dato para corregirlo', 'Tap a field to correct it')}>
          <div style={{ display: 'grid', gap: 10 }}>
            <CampoEditable etiqueta={T('Nombre', 'First name')} valor={p.nombre} onGuardar={(v) => guardarPersona({ nombre: v })} />
            <CampoEditable etiqueta={T('Apellido', 'Last name')} valor={p.apellido} onGuardar={(v) => guardarPersona({ apellido: v })} />
            <CampoEditable etiqueta={T('Cédula', 'ID number')} valor={p.cedula || ''} vacio={T('Sin cédula', 'No ID')} normalizar={(v) => v.replace(/\D/g, '')}
              validar={(v) => (v && !S.validarCedula(v) ? T('Esa cédula no cuadra. Son 10 números; revise el último.', 'That ID does not check out. It is 10 digits; check the last one.') : null)}
              onGuardar={(v) => guardarPersona({ cedula: v })} />
            <CampoEditable etiqueta={T('Correo para la factura', 'Email for the invoice')} valor={p.correo || ''} vacio={T('Sin correo', 'No email')} tipo="email" onGuardar={(v) => guardarPersona({ correo: v })} />
          </div>
        </Card>
        <Card span={4} i={1} title={T('Teléfonos', 'Phones')} sub={T('Cualquiera de estos números es esta persona', 'Any of these numbers is this person')}>
          <ul className="d-list">
            {p.telefonos.map((t) => (
              <li key={t.telefono}>
                <span>{S.telefonoBonito(t.telefono)}</span>
                <span className="d-quiet">{CONFIANZA[t.confianza] || t.confianza}{t.compartido ? T(' · lo usan dos personas', ' · shared by two people') : ''} · {T('usado', 'used')} {cuenta(t.veces_usado, 'vez', 'veces', 'time', 'times')}</span>
                <span className="d-list__acts"><button type="button" onClick={() => setPregunta({ tipo: 'quitar', telefono: t.telefono })}>{T('Quitar', 'Remove')}</button></span>
              </li>
            ))}
          </ul>
          <div className="d-add">
            <input className="d-input" placeholder={T('Otro celular, 0991234567', 'Another mobile, 0991234567')} value={nuevoTel} onChange={(e) => setNuevoTel(e.target.value)} aria-label={T('Nuevo teléfono', 'New phone')} />
            <button type="button" className="d-btn d-btn--sm" onClick={agregarTel}>{T('Agregar', 'Add')}</button>
          </div>
        </Card>
        <Card span={4} i={2} title={T('Lo que más pide', 'What they order most')}>
          {fav ? <p className="d-lede">{fav[0]}<br /><span className="d-quiet" style={{ fontSize: 13 }}>{cuenta(fav[1], 'vez', 'veces', 'time', 'times')} {T('en total', 'in total')}</span></p>
            : <p className="d-empty">{T('Aún sin pedidos.', 'No orders yet.')}</p>}
        </Card>
      </div>

      <Card i={3} title={T('Direcciones', 'Addresses')} sub={T('Editar crea una dirección nueva; los pedidos pasados no se reescriben', 'Editing creates a new address; past orders are not rewritten')}
        tools={<button type="button" className="d-btn d-btn--sm" onClick={() => setNuevaDir({ calle: '', sector: '', referencia: '', alias: T('Casa', 'Home') })}>{T('Agregar dirección', 'Add address')}</button>}>
        {p.direcciones.length === 0 && !nuevaDir && <p className="d-empty">{T('Sin direcciones guardadas.', 'No saved addresses.')}</p>}
        <div style={{ display: 'grid', gap: 16 }}>
          {p.direcciones.map((d) => (
            <div key={d.direccion_id} className="d-grid" style={{ gap: 12, alignItems: 'start' }}>
              <div style={{ gridColumn: 'span 2' }}><CampoEditable etiqueta={T('Nombre', 'Name')} valor={d.alias} onGuardar={(v) => editarDir(d, { alias: v })} /></div>
              <div className="d-c4"><CampoEditable etiqueta={T('Calle principal y secundaria', 'Main and cross street')} valor={d.calle} onGuardar={(v) => editarDir(d, { calle: v })} /></div>
              <div style={{ gridColumn: 'span 2' }}><CampoEditable etiqueta={T('Sector', 'Area')} valor={d.sector} onGuardar={(v) => editarDir(d, { sector: v })} /></div>
              <div className="d-c3"><CampoEditable etiqueta={T('Referencia para el motorizado', 'Landmark for the rider')} valor={d.referencia} ayuda={T('Algo que se vea desde la calle', 'Something visible from the street')} onGuardar={(v) => editarDir(d, { referencia: v })} /></div>
              <div style={{ gridColumn: 'span 1', alignSelf: 'end' }}>
                {d.es_default ? <span className="d-badge d-badge--ok">{T('la de siempre', 'the usual')}</span>
                  : <button type="button" className="d-btn d-btn--sm" onClick={() => { S.marcarDireccionPrincipal(p.persona_id, d.direccion_id); guardado() }}>{T('Usar siempre', 'Use always')}</button>}
                {d.lat == null && <span className="d-quiet" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{T('Sin ubicar en el mapa', 'Not placed on the map')}</span>}
              </div>
            </div>
          ))}
          {nuevaDir && (
            <div className="d-grid" style={{ gap: 12 }}>
              <input className="d-input d-c3" placeholder={T('Nombre (Casa, Oficina)', 'Name (Home, Office)')} value={nuevaDir.alias} onChange={(e) => setNuevaDir({ ...nuevaDir, alias: e.target.value })} />
              <input className="d-input d-c4" placeholder={T('Calle principal y secundaria', 'Main and cross street')} value={nuevaDir.calle} onChange={(e) => setNuevaDir({ ...nuevaDir, calle: e.target.value })} />
              <input className="d-input" style={{ gridColumn: 'span 2' }} placeholder={T('Sector', 'Area')} value={nuevaDir.sector} onChange={(e) => setNuevaDir({ ...nuevaDir, sector: e.target.value })} />
              <input className="d-input d-c3" placeholder={T('Referencia', 'Landmark')} value={nuevaDir.referencia} onChange={(e) => setNuevaDir({ ...nuevaDir, referencia: e.target.value })} />
              <div className="d-c12" style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="d-btn d-btn--primary" disabled={!nuevaDir.calle || !nuevaDir.sector} onClick={() => { S.agregarDireccion(p.persona_id, nuevaDir); setNuevaDir(null); guardado() }}>{T('Guardar dirección', 'Save address')}</button>
                <button type="button" className="d-btn" onClick={() => setNuevaDir(null)}>{T('Cancelar', 'Cancel')}</button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card i={4} title={T('Sus pedidos', 'Their orders')}>
        {p.pedidos.length === 0 ? <p className="d-empty">{T('Aún sin pedidos.', 'No orders yet.')}</p> : (
          <table className="d-table">
            <thead><tr><th>{T('Pedido', 'Order')}</th><th>{T('Fecha', 'Date')}</th><th>{T('Local', 'Branch')}</th><th>{T('Por dónde pidió', 'Ordered via')}</th><th>{T('Estado', 'Status')}</th><th className="d-num">Total</th></tr></thead>
            <tbody>
              {p.pedidos.map((o) => (
                <tr key={o.pedido_id}>
                  <td data-l={T('Pedido', 'Order')}><a href={hrefPanel('pedidos/' + o.pedido_id, { from: 'clientes/' + p.persona_id }, F)}>{o.pedido_id}</a></td>
                  <td data-l={T('Fecha', 'Date')}>{fecha(o.creado_en)} {hhmm(o.creado_en)}</td>
                  <td data-l={T('Local', 'Branch')}>{S.nombreLocal(o.local_id)}</td>
                  <td data-l={T('Por dónde', 'Via')} className="d-quiet">{CANAL[o.canal] || o.canal}</td>
                  <td data-l={T('Estado', 'Status')}><Badge estado={o.estado} modalidad={o.modalidad} /></td>
                  <td data-l="Total" className="d-num money">{money(o.total_cobrado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {pregunta?.tipo === 'quitar' && (
        <Dialogo titulo={T(`¿Quitar el ${S.telefonoBonito(pregunta.telefono)}?`, `Remove ${S.telefonoBonito(pregunta.telefono)}?`)} onCerrar={() => setPregunta(null)}>
          <p>{T(`Camila dejará de reconocer a ${p.nombre} desde este número.`, `Camila will stop recognising ${p.nombre} from this number.`)}</p>
          <div className="d-dialog__acts">
            <button type="button" className="d-btn" onClick={() => setPregunta(null)}>{T('Cancelar', 'Cancel')}</button>
            <button type="button" className="d-btn d-btn--danger" onClick={() => quitar(pregunta.telefono)}>{T('Sí, quitar', 'Yes, remove')}</button>
          </div>
        </Dialogo>
      )}
      {pregunta?.tipo === 'compartir' && (
        <Dialogo titulo={T('Este número ya es de otra persona', 'This number already belongs to someone else')} onCerrar={() => setPregunta(null)}>
          <p>{T(`El ${S.telefonoBonito(pregunta.telefono)} ya es de ${pregunta.otra.nombre} ${pregunta.otra.apellido}. ¿Comparten el teléfono?`, `${S.telefonoBonito(pregunta.telefono)} already belongs to ${pregunta.otra.nombre} ${pregunta.otra.apellido}. Do they share the phone?`)}</p>
          <div className="d-dialog__acts">
            <button type="button" className="d-btn" onClick={() => setPregunta(null)}>{T('Cancelar', 'Cancel')}</button>
            <button type="button" className="d-btn d-btn--primary" onClick={() => { S.vincularTelefono(p.persona_id, pregunta.telefono, 'confirmada'); setNuevoTel(''); setPregunta(null); guardado() }}>{T('Sí, lo comparten', 'Yes, they share it')}</button>
          </div>
        </Dialogo>
      )}
    </>
  )
}

/* ----------------------------------------------------------- Motorizados */

export function Motorizados({ F, sel, q }) {
  const version = useVersion()
  const [tic, setTic] = useState(0)
  const [hover, setHover] = useState(null)
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) setTic((n) => n + 1) }, 20000)
    return () => clearInterval(t)
  }, [])
  const local = F.local || undefined
  const todas = useMemo(() => S.enRuta().filter((e) => !local || e.local_id === local), [tic, version, local])
  const soloAtrasadas = q.atrasadas === '1'
  const entregas = soloAtrasadas ? todas.filter((e) => e.atrasado) : todas
  const elegida = todas.find((e) => e.pedido_id === sel) || null
  const atrasadas = todas.filter((e) => e.atrasado).length
  const huella = useMemo(() => S.huellaDeHoy(local), [version, local, tic])
  const hoyR = useMemo(() => S.resumen({ desde: hoyKey(), hasta: hoyKey(), local }), [version, local, tic])
  const entrada = useEntrada()
  const A = { ...F, periodo: 'hoy' }
  const elegir = (id) => { window.location.hash = hrefPanel('motos' + (id ? '/' + id : ''), soloAtrasadas ? { atrasadas: '1' } : {}, F).slice(1) }
  const masFuera = todas[0]
  const enHorno = hoyR.porEstado.horno || 0
  const movil = useMovil()
  const enCalle = todas.reduce((t, e) => t + e.total_cobrado, 0)

  useEffect(() => {
    if (!sel) return
    const fila = document.getElementById('fila-' + sel)
    if (fila) { fila.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); marcar(fila) }
  }, [sel])

  if (todas.length === 0) {
    const hoyN = hoyR.pedidos
    const entregadasHoy = huella.length
    const ultima = huella.length ? huella.reduce((a, b) => (b.hora > a.hora ? b : a)) : null
    const mins = huella.map((h) => h.minutos).filter((m) => m != null)
    const abre = new Date().getHours() < 11
    return (
      <div className={entrada ? 'd-entrada' : ''} style={{ display: 'grid', gap: 20 }}>
        <div className="d-stats">
          <Stat label={T('Motos en la calle', 'Riders out')} value="0" foot={T('Ninguna entrega en camino ahora', 'No delivery on the way now')} />
          <Stat label={T('Entregas de hoy', "Today's deliveries")} value={num(entregadasHoy)} foot={entregadasHoy ? T('Todas ya llegaron', 'All have arrived') : T('Todavía ninguna', 'None yet')} href={entregadasHoy ? hrefPanel('pedidos', { estado: 'entregado', modalidad: 'domicilio', from: 'motos' }, A) : null} go={T(`Ver las ${entregadasHoy}`, `See the ${entregadasHoy}`)} />
          <Stat label={T('Última vuelta', 'Last run')} value={ultima ? hhmm(ultima.hora) : SIN_DATO} foot={ultima ? T(`Pedido ${ultima.pedido_id}`, `Order ${ultima.pedido_id}`) : T('Aún ninguna', 'None yet')} href={ultima ? hrefPanel('pedidos/' + ultima.pedido_id, { from: 'motos' }, A) : null} go={T('Ver el pedido', 'See the order')} />
          <Stat label={T('Tiempo de entrega', 'Delivery time')} value={mins.length ? (mins.length < 20 ? `${Math.min(...mins)}–${Math.max(...mins)} min` : `${Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)} min`) : SIN_DATO} foot={mins.length ? (mins.length < 20 ? T('Entre la más rápida y la más lenta', 'Between the fastest and the slowest') : T('Promedio de hoy', "Today's average")) : T('Sin entregas terminadas', 'No finished deliveries')} />
        </div>
        <Card title={T('Ninguna moto en la calle', 'No riders out')}
          sub={abre && !hoyN ? T('Todavía no sale ninguna entrega hoy. Los locales abren a las 11:00.', 'No delivery has gone out yet today. Branches open at 11:00.')
            : entregadasHoy ? T(`Hoy salieron ${entregadasHoy} entregas y todas ya llegaron.${ultima ? ` La última volvió a las ${hhmm(ultima.hora)}.` : ''}${mins.length ? ` Tardaron entre ${Math.min(...mins)} y ${Math.max(...mins)} minutos.` : ''}`, `${entregadasHoy} deliveries went out today and all have arrived.${ultima ? ` The last one came back at ${hhmm(ultima.hora)}.` : ''}${mins.length ? ` They took between ${Math.min(...mins)} and ${Math.max(...mins)} minutes.` : ''}`)
              : T('Hoy todavía no ha salido ninguna entrega.', 'No delivery has gone out yet today.')}
          foot={enHorno ? T(`Hay ${pedidosTxt(enHorno)} en el horno que saldrán pronto.`, `There are ${pedidosTxt(enHorno)} in the oven that will go out soon.`) : null}>
          <FleetMap entregas={[]} huella={huella} height={320} sedesVisibles={S.localesConectados().map((l) => l.id)}
            onHuella={(id) => { window.location.hash = hrefPanel('pedidos/' + id, { from: 'motos' }, A).slice(1) }} />
        </Card>
      </div>
    )
  }

  return (
    <div className={entrada ? 'd-entrada' : ''} style={{ display: 'grid', gap: 20 }}>
      <div className="d-stats">
        <Stat label={T('Motos en la calle', 'Riders out')} value={num(todas.length)} foot={`${cuenta(todas.length, 'entrega', 'entregas', 'delivery', 'deliveries')} ${T('en camino ahora', 'on the way now')}`} href="#quien" go={T('Ver quién está fuera', 'See who is out')} />
        <Stat label={T('Pasadas de 35 minutos', 'Past 35 minutes')} value={num(atrasadas)} tono={atrasadas ? 'es-abajo' : ''}
          foot={atrasadas ? T('Conviene avisar al cliente antes de que llame', 'Worth warning the customer before they call') : T('Todas dentro de lo normal', 'All within the normal range')}
          href={atrasadas ? hrefPanel('motos', { atrasadas: '1' }, F) : null} go={T(`Ver las ${atrasadas}`, `See the ${atrasadas}`)} />
        <Stat label={T('Dinero en la calle', 'Money on the road')} value={money(enCalle)} foot={T('Lo que va en las motos ahora mismo', 'What the riders are carrying right now')} />
        <Stat label={T('La que más lleva fuera', 'Longest out')} value={masFuera?.minutos_fuera != null ? `${masFuera.minutos_fuera} min` : SIN_DATO}
          foot={masFuera ? `${masFuera.repartidor || T('Motorizado', 'Rider')} · ${S.nombreLocal(masFuera.local_id)}` : ''}
          href={masFuera ? hrefPanel('motos/' + masFuera.pedido_id, {}, F) : null} go={T('Seguir esa moto', 'Follow that rider')} />
      </div>

      <Card i={0}
        title={elegida ? `${elegida.repartidor || T('Motorizado', 'Rider')} · ${elegida.pedido_id}` : soloAtrasadas ? T('Las motos pasadas de 35 minutos', 'Riders past 35 minutes') : T('Todas las motos ahora', 'All riders now')}
        sub={elegida
          ? T(`Salió hace ${elegida.minutos_fuera} min de ${S.nombreLocal(elegida.local_id)} hacia ${elegida.destino?.sector || 'la casa del cliente'}`, `Left ${S.nombreLocal(elegida.local_id)} ${elegida.minutos_fuera} min ago towards ${elegida.destino?.sector || "the customer's home"}`)
          : T('Toque una moto en el mapa, o una fila de la lista, para seguir solo esa', 'Tap a rider on the map, or a row in the list, to follow only that one')}
        tools={(elegida || soloAtrasadas) && <a className="d-btn d-btn--sm" href={hrefPanel('motos', {}, F)}>{T('Ver todas', 'See all')}</a>}
        foot={T('La línea marca hacia dónde va, no por qué calles.', 'The line shows where it is heading, not which streets.')}>
        <FleetMap entregas={entregas} seleccion={sel} onSelect={(id) => elegir(id)} hover={hover} onHover={setHover}>
          {movil && elegida && (
            <div className="d-flotante">
              <b>{elegida.repartidor || T('Motorizado', 'Rider')} · {elegida.minutos_fuera} min</b>
              <span>{elegida.destino?.sector || ''}{elegida.destino?.calle ? ` · ${elegida.destino.calle}` : ''}</span>
              <a className="d-btn d-btn--primary" href={hrefPanel('pedidos/' + elegida.pedido_id, { from: 'motos' }, A)}>{T('Ver pedido', 'See order')}</a>
              <button type="button" className="x" aria-label={T('Cerrar', 'Close')} onClick={() => elegir(null)}>×</button>
            </div>
          )}
        </FleetMap>
      </Card>

      {elegida && !movil && (
        <div className="d-grid">
          <Card span={7} i={1} title={T('Esta entrega', 'This delivery')}>
            <table className="d-table">
              <tbody>
                <tr><td data-l={T('Cliente', 'Customer')}>{elegida.persona ? `${elegida.persona.nombre} ${elegida.persona.apellido}` : SIN_DATO}</td>
                  <td data-l={T('Teléfono', 'Phone')} className="d-quiet">{elegida.persona?.telefonos[0] ? S.telefonoBonito(elegida.persona.telefonos[0].telefono) : SIN_DATO}</td></tr>
                <tr><td data-l={T('Dirección', 'Address')}>{elegida.destino?.calle || SIN_DATO}</td>
                  <td data-l={T('Sector', 'Area')} className="d-quiet">{elegida.destino?.sector || SIN_DATO}</td></tr>
                <tr><td data-l="Total">{money(elegida.total_cobrado)}</td>
                  <td data-l={T('Pago', 'Payment')} className="d-quiet">{PAGO[elegida.forma_pago] || elegida.forma_pago}</td></tr>
              </tbody>
            </table>
            <p style={{ marginTop: 12 }}><a className="d-btn" href={hrefPanel('pedidos/' + elegida.pedido_id, { from: 'motos' }, A)}>{T('Ver el pedido completo', 'See the full order')}</a></p>
          </Card>
          <Card span={5} i={2} title={T('Estado', 'Status')} sub={T('Cuando llegue, un toque en Entregado', 'When it arrives, one tap on Delivered')}>
            <EstadoPedido pedido={elegida} />
          </Card>
        </div>
      )}

      <Card i={3} title={T('Quién está fuera', 'Who is out')} sub={T('Toque una fila para seguirla en el mapa', 'Tap a row to follow it on the map')}>
        <div id="quien" />
        <table className="d-table">
          <thead><tr><th>{T('Motorizado', 'Rider')}</th><th>{T('Pedido', 'Order')}</th><th>{T('Local', 'Branch')}</th><th>{T('Sector', 'Area')}</th><th>{T('Salió hace', 'Left')}</th><th className="d-num">Total</th></tr></thead>
          <tbody>
            {entregas.map((e) => (
              <tr key={e.pedido_id} id={'fila-' + e.pedido_id} tabIndex={0} role="button"
                onClick={() => elegir(e.pedido_id === sel ? null : e.pedido_id)}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); elegir(e.pedido_id === sel ? null : e.pedido_id) } }}
                onMouseEnter={() => setHover(e.pedido_id)} onMouseLeave={() => setHover(null)}
                className={(e.pedido_id === sel ? 'd-row--on' : '') + (hover === e.pedido_id ? ' d-row--hover' : '') + (soloAtrasadas || !sel || sel === e.pedido_id ? '' : ' d-dim')}
                style={{ cursor: 'pointer' }}>
                <td data-l={T('Motorizado', 'Rider')}>{e.repartidor || SIN_DATO}</td>
                <td data-l={T('Pedido', 'Order')}><a href={hrefPanel('pedidos/' + e.pedido_id, { from: 'motos' }, A)} onClick={(ev) => ev.stopPropagation()}>{e.pedido_id}</a></td>
                <td data-l={T('Local', 'Branch')}>{S.nombreLocal(e.local_id)}</td>
                <td data-l={T('Sector', 'Area')} className="d-quiet">{e.destino?.sector || SIN_DATO}</td>
                <td data-l={T('Salió hace', 'Left')}>{e.minutos_fuera != null ? <span className={e.atrasado ? 'd-late' : ''}>{e.minutos_fuera} min</span> : SIN_DATO}</td>
                <td data-l="Total" className="d-num money">{money(e.total_cobrado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
