import { useEffect, useMemo, useState } from 'react'
import * as S from './store.js'
import FleetMap from './FleetMap.jsx'
import { money, num, hhmm, fecha, dur, tasa, SIN_DATO } from './format.js'
import { hrefPanel, irCon, PERIODO_FRASE } from './nav.js'
import { useVersion } from './useStore.js'
import { useEntrada, marcar, useMovil } from './motion.js'
import { cuenta, CANAL, MOTIVO, RESULTADO, CONFIANZA, MODALIDAD, PAGO, tituloLista } from './textos.js'
import { EstadoPedido, CampoEditable, Dialogo, useToast } from './Editable.jsx'
import { Card, Stat, Rank, Badge } from './screens.jsx'

/* ---------------------------------------------------------------- Camila */

export function Camila({ rango, F, q }) {
  const version = useVersion()
  const filtros = { ...rango, resultado: q.resultado, motivo: q.motivo, cedula: q.cedula }
  const cs = useMemo(() => S.conversaciones(filtros), [JSON.stringify(filtros), version]) // eslint-disable-line react-hooks/exhaustive-deps
  const embudo = useMemo(() => S.embudoLlamadas(rango), [rango, version])
  const entrada = useEntrada()
  const [ver, setVer] = useState(40)
  const conFiltro = q.resultado || q.motivo || q.cedula
  const titulo = conFiltro ? tituloLista({ n: cs.length, resultado: q.resultado, motivo: q.motivo, cedula: q.cedula, local: F.local ? S.nombreLocal(F.local) : null, periodo: F.periodo, dia: F.dia }) : 'Las llamadas'
  const cierre = tasa(embudo.pedidos, embudo.contestadas)
  const vendido = useMemo(() => cs.filter((c) => c.resultado === 'pedido').reduce((t, c) => t + (c.pedido_id ? S.estado().pedidos[c.pedido_id]?.total_cobrado || 0 : 0), 0), [cs])

  return (
    <div className={entrada ? 'd-entrada' : ''} style={{ display: 'grid', gap: 20 }}>
      {q.from && <a className="d-back" href={hrefPanel(q.from, {}, F)}>← Volver a {q.from === 'hoy' ? 'Hoy' : 'Resumen'}</a>}
      <div className="d-stats">
        <Stat label="Llamadas que entraron" value={embudo.total ? num(embudo.total) : SIN_DATO} foot={embudo.total ? `Camila contestó ${embudo.contestadas}` : `Aún ninguna llamada ${PERIODO_FRASE[F.periodo]}`}
          href={embudo.total ? hrefPanel('camila', { resultado: '', motivo: '', cedula: '' }, F) : null} go="Ver todas" />
        <Stat label="Terminaron en pedido" value={embudo.contestadas ? cierre.texto : SIN_DATO}
          foot={embudo.contestadas ? (cierre.exacto ? `de ${embudo.contestadas} contestadas` : `${embudo.pedidos} de ${embudo.contestadas} contestadas`) : 'Sin llamadas contestadas'}
          href={embudo.pedidos ? hrefPanel('camila', { resultado: 'pedido' }, F) : null} go={`Ver las ${embudo.pedidos}`} />
        <Stat label="Vendido por teléfono" value={money(vendido)} foot="Lo cobrado en pedidos que entraron por llamada" />
        <Stat label="Dieron su cédula" value={embudo.total ? tasa(embudo.conCedula, embudo.total).texto : SIN_DATO}
          foot="Con la cédula se reconoce a la persona aunque llame desde otro teléfono"
          href={embudo.conCedula ? hrefPanel('camila', { cedula: '1' }, F) : null} go={`Ver las ${embudo.conCedula}`} />
      </div>

      <div className="d-grid">
        <Card span={6} i={0} title="Por qué no pidieron" sub="Solo las llamadas contestadas que no terminaron en pedido">
          {embudo.motivos.length === 0
            ? <p className="d-empty">{embudo.total ? 'Todas las llamadas contestadas terminaron en pedido.' : 'Aún ninguna llamada.'}</p>
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
        <Card span={6} i={1} title="Qué pasó con cada llamada" sub="Contestada, colgó, no pidió o pidió">
          {embudo.total === 0 ? <p className="d-empty">Aún ninguna llamada.</p> : (
            <>
              <div className="d-stack" role="img" aria-label={`${embudo.pedidos} pidieron, ${embudo.sinPedido} no pidieron, ${embudo.colgo} colgaron, ${embudo.total - embudo.contestadas} sin contestar`}>
                <i className="ok" style={{ width: `${(embudo.pedidos / embudo.total) * 100}%` }} />
                <i className="wait" style={{ width: `${((embudo.sinPedido + embudo.colgo) / embudo.total) * 100}%` }} />
                <i className="off" style={{ width: `${((embudo.total - embudo.contestadas) / embudo.total) * 100}%` }} />
              </div>
              <div className="d-stack__legend">
                <div><i style={{ background: 'var(--d-green-bar)' }} /><a href={hrefPanel('camila', { resultado: 'pedido' }, F)}>Pidieron</a><b>{embudo.pedidos}</b></div>
                <div><i style={{ background: 'var(--d-yellow)' }} /><a href={hrefPanel('camila', { resultado: 'sin_pedido' }, F)}>No pidieron</a><b>{embudo.sinPedido}</b></div>
                <div><i style={{ background: 'var(--d-yellow)', opacity: .6 }} /><a href={hrefPanel('camila', { resultado: 'colgo' }, F)}>Colgaron</a><b>{embudo.colgo}</b></div>
                <div><i style={{ background: 'var(--d-line-ctl)' }} /><a href={hrefPanel('camila', { resultado: 'no_contestada' }, F)}>Sin contestar</a><b>{embudo.total - embudo.contestadas}</b></div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card i={2} title={titulo} sub={conFiltro ? undefined : `${cuenta(cs.length, 'llamada', 'llamadas')} ${PERIODO_FRASE[F.periodo]}`}
        tools={conFiltro ? <button type="button" className="d-btn d-btn--sm" onClick={() => irCon({ resultado: '', motivo: '', cedula: '' })}>Quitar el filtro</button> : null}
        foot={cs.length > ver ? <><span>{ver} de {cs.length}</span><button type="button" className="d-linkbtn" onClick={() => setVer(cs.length)}>Ver todas</button></> : null}>
        {cs.length === 0 ? <p className="d-empty"><strong>Ninguna llamada {PERIODO_FRASE[F.periodo]}.</strong>Las llamadas aparecen aquí apenas terminan.</p> : (
          <table className="d-table">
            <thead><tr><th>Hora</th><th>Teléfono</th><th>Local</th><th>Duración</th><th>Resultado</th></tr></thead>
            <tbody>
              {cs.slice(0, ver).map((c) => {
                const per = c.persona_id ? S.personaPorId(c.persona_id) : null
                return (
                  <tr key={c.conversacion_id}>
                    <td data-l="Hora">{F.periodo === 'hoy' || F.periodo === 'ayer' ? hhmm(c.inicio) : `${fecha(c.inicio)} ${hhmm(c.inicio)}`}</td>
                    <td data-l="Teléfono">{per ? <a href={hrefPanel('clientes/' + per.persona_id, {}, F)}>{per.nombre} {per.apellido}</a> : <span className="d-quiet">{S.telefonoBonito(c.telefono)}</span>}</td>
                    <td data-l="Local">{S.nombreLocal(c.local_id) || SIN_DATO}</td>
                    <td data-l="Duración">{c.duracion_s ? dur(c.duracion_s) : SIN_DATO}</td>
                    <td data-l="Resultado">{c.resultado === 'pedido'
                      ? <a href={hrefPanel('pedidos/' + c.pedido_id, { from: 'camila' }, F)}>Pidió · {c.pedido_id}</a>
                      : <span className="d-quiet">{RESULTADO[c.resultado]}{c.motivo_no_cierre ? ` · ${MOTIVO[c.motivo_no_cierre]?.corto || c.motivo_no_cierre}` : ''}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
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
    <Card title={`${cuenta(rows.length, 'cliente', 'clientes')}`}
      sub="Cada cliente es una persona con cédula; sus teléfonos y direcciones se guardan bajo ella"
      tools={<input className="d-input" placeholder="Buscar por nombre, cédula o teléfono" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar" />}
      foot={rows.length > ver ? <><span>{ver} de {rows.length}</span><button type="button" className="d-linkbtn" onClick={() => setVer(rows.length)}>Ver todos</button></> : null}>
      {rows.length === 0 ? (
        <p className="d-empty">
          <strong>{q.q ? `Nadie coincide con «${q.q}».` : 'Todavía no hay clientes registrados.'}</strong>
          {q.q ? <button type="button" onClick={() => { setTexto(''); irCon({ q: '' }) }}>Busque por nombre, cédula o los últimos números del teléfono · Borrar la búsqueda</button>
            : 'Cada persona que Camila registra aparece aquí con su cédula, sus teléfonos y sus direcciones.'}
        </p>
      ) : (
        <table className="d-table">
          <thead>
            <tr><th>Cliente</th><th>Cédula</th><th className="d-num">Teléfonos</th><th className="d-num">Direcciones</th><th className="d-num">Pedidos</th><th className="d-num">Gastado</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, ver).map((p) => (
              <tr key={p.persona_id}>
                <td data-l="Cliente"><a href={hrefPanel('clientes/' + p.persona_id, {}, F)}>{p.nombre} {p.apellido}</a></td>
                <td data-l="Cédula" className="d-quiet">{p.cedula || 'Sin cédula'}</td>
                <td data-l="Teléfonos" className="d-num">{p.telefonos.length}</td>
                <td data-l="Direcciones" className="d-num">{p.direcciones.length}</td>
                <td data-l="Pedidos" className="d-num">{p.pedidos.length}</td>
                <td data-l="Gastado" className="d-num money">{money(p.gastado)}</td>
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
  const [pregunta, setPregunta] = useState(null)   // { tipo:'quitar'|'compartir', telefono, otra }
  const [nuevaDir, setNuevaDir] = useState(null)
  if (!p) return <Card title="No encontramos a esa persona"><p className="d-empty">Ficha inexistente.</p></Card>

  const guardarPersona = (campos) => { const r = S.actualizarPersona(p.persona_id, campos); if (r.ok) avisar('Guardado.'); return r }
  const agregarTel = () => {
    const tel = S.normalizarTelefono(nuevoTel)
    if (!tel || !/^\+593\d{9}$/.test(tel)) { avisar('El celular necesita 10 números y empieza por 09; escríbalo como 0991234567.'); return }
    const otros = S.duenosDe(tel, p.persona_id)
    if (otros.length) { setPregunta({ tipo: 'compartir', telefono: tel, otra: otros[0] }); return }
    S.vincularTelefono(p.persona_id, tel, 'confirmada'); setNuevoTel(''); avisar('Guardado.')
  }
  const quitar = (tel) => {
    const r = S.quitarTelefono(p.persona_id, tel)
    if (r.error) avisar(r.error); else avisar('Guardado.')
    setPregunta(null)
  }

  return (
    <>
      <a className="d-back" href={hrefPanel('clientes', {}, F)}>← Volver a clientes</a>
      <section className="d-hero d-hero--tight">
        <p className="d-eyebrow">Cliente</p>
        <h1 style={{ marginTop: 4 }}>{p.nombre} {p.apellido}</h1>
        <p className="d-hero__foot">
          {p.cedula ? `Cédula ${p.cedula} · se le reconoce desde cualquiera de sus teléfonos` : 'Sin cédula · no se le reconoce desde otro teléfono'}
          {' · '}{cuenta(p.pedidos.length, 'pedido', 'pedidos')} · {money(p.gastado)} en total
        </p>
      </section>

      <div className="d-grid">
        <Card span={4} i={0} title="Datos" sub="Toque un dato para corregirlo">
          <div style={{ display: 'grid', gap: 10 }}>
            <CampoEditable etiqueta="Nombre" valor={p.nombre} onGuardar={(v) => guardarPersona({ nombre: v })} />
            <CampoEditable etiqueta="Apellido" valor={p.apellido} onGuardar={(v) => guardarPersona({ apellido: v })} />
            <CampoEditable etiqueta="Cédula" valor={p.cedula || ''} vacio="Sin cédula" normalizar={(v) => v.replace(/\D/g, '')}
              validar={(v) => (v && !S.validarCedula(v) ? 'Esa cédula no cuadra. Son 10 números; revise el último.' : null)}
              onGuardar={(v) => guardarPersona({ cedula: v })} />
            <CampoEditable etiqueta="Correo para la factura" valor={p.correo || ''} vacio="Sin correo" tipo="email" onGuardar={(v) => guardarPersona({ correo: v })} />
          </div>
        </Card>
        <Card span={4} i={1} title="Teléfonos" sub="Cualquiera de estos números es esta persona">
          <ul className="d-list">
            {p.telefonos.map((t) => (
              <li key={t.telefono}>
                <span>{S.telefonoBonito(t.telefono)}</span>
                <span className="d-quiet">{CONFIANZA[t.confianza] || t.confianza}{t.compartido ? ' · lo usan dos personas' : ''} · usado {cuenta(t.veces_usado, 'vez', 'veces')}</span>
                <span className="d-list__acts"><button type="button" onClick={() => setPregunta({ tipo: 'quitar', telefono: t.telefono })}>Quitar</button></span>
              </li>
            ))}
          </ul>
          <div className="d-add">
            <input className="d-input" placeholder="Otro celular, 0991234567" value={nuevoTel} onChange={(e) => setNuevoTel(e.target.value)} aria-label="Nuevo teléfono" />
            <button type="button" className="d-btn d-btn--sm" onClick={agregarTel}>Agregar</button>
          </div>
        </Card>
        <Card span={4} i={2} title="Lo que más pide">
          {fav ? <p className="d-lede">{fav[0]}<br /><span className="d-quiet" style={{ fontSize: 13 }}>{cuenta(fav[1], 'vez', 'veces')} en total</span></p>
            : <p className="d-empty">Aún sin pedidos.</p>}
        </Card>
      </div>

      <Card i={3} title="Direcciones" sub="Editar crea una dirección nueva; los pedidos pasados no se reescriben"
        tools={<button type="button" className="d-btn d-btn--sm" onClick={() => setNuevaDir({ calle: '', sector: '', referencia: '', alias: 'Casa' })}>Agregar dirección</button>}>
        {p.direcciones.length === 0 && !nuevaDir && <p className="d-empty">Sin direcciones guardadas.</p>}
        <div style={{ display: 'grid', gap: 16 }}>
          {p.direcciones.map((d) => (
            <div key={d.direccion_id} className="d-grid" style={{ gap: 12, alignItems: 'start' }}>
              <div className="d-c2" style={{ gridColumn: 'span 2' }}><CampoEditable etiqueta="Nombre" valor={d.alias} onGuardar={(v) => { S.editarDireccion(d.direccion_id, { alias: v }); avisar('Guardado.') }} /></div>
              <div className="d-c4"><CampoEditable etiqueta="Calle principal y secundaria" valor={d.calle} onGuardar={(v) => { S.editarDireccion(d.direccion_id, { calle: v }); avisar('Guardado.') }} /></div>
              <div className="d-c2" style={{ gridColumn: 'span 2' }}><CampoEditable etiqueta="Sector" valor={d.sector} onGuardar={(v) => { S.editarDireccion(d.direccion_id, { sector: v }); avisar('Guardado.') }} /></div>
              <div className="d-c3"><CampoEditable etiqueta="Referencia para el motorizado" valor={d.referencia} ayuda="Algo que se vea desde la calle" onGuardar={(v) => { S.editarDireccion(d.direccion_id, { referencia: v }); avisar('Guardado.') }} /></div>
              <div className="d-c1" style={{ gridColumn: 'span 1', alignSelf: 'end' }}>
                {d.es_default ? <span className="d-badge d-badge--ok">la de siempre</span>
                  : <button type="button" className="d-btn d-btn--sm" onClick={() => { S.marcarDireccionPrincipal(p.persona_id, d.direccion_id); avisar('Guardado.') }}>Usar siempre</button>}
                {d.lat == null && <span className="d-quiet" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>Sin ubicar en el mapa</span>}
              </div>
            </div>
          ))}
          {nuevaDir && (
            <div className="d-grid" style={{ gap: 12 }}>
              <input className="d-input d-c3" placeholder="Nombre (Casa, Oficina)" value={nuevaDir.alias} onChange={(e) => setNuevaDir({ ...nuevaDir, alias: e.target.value })} />
              <input className="d-input d-c4" placeholder="Calle principal y secundaria" value={nuevaDir.calle} onChange={(e) => setNuevaDir({ ...nuevaDir, calle: e.target.value })} />
              <input className="d-input d-c2" style={{ gridColumn: 'span 2' }} placeholder="Sector" value={nuevaDir.sector} onChange={(e) => setNuevaDir({ ...nuevaDir, sector: e.target.value })} />
              <input className="d-input d-c3" placeholder="Referencia" value={nuevaDir.referencia} onChange={(e) => setNuevaDir({ ...nuevaDir, referencia: e.target.value })} />
              <div className="d-c12" style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="d-btn d-btn--primary" disabled={!nuevaDir.calle || !nuevaDir.sector} onClick={() => { S.agregarDireccion(p.persona_id, nuevaDir); setNuevaDir(null); avisar('Guardado.') }}>Guardar dirección</button>
                <button type="button" className="d-btn" onClick={() => setNuevaDir(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card i={4} title="Sus pedidos">
        {p.pedidos.length === 0 ? <p className="d-empty">Aún sin pedidos.</p> : (
          <table className="d-table">
            <thead><tr><th>Pedido</th><th>Fecha</th><th>Local</th><th>Por dónde pidió</th><th>Estado</th><th className="d-num">Total</th></tr></thead>
            <tbody>
              {p.pedidos.map((o) => (
                <tr key={o.pedido_id}>
                  <td data-l="Pedido"><a href={hrefPanel('pedidos/' + o.pedido_id, { from: 'clientes/' + p.persona_id }, F)}>{o.pedido_id}</a></td>
                  <td data-l="Fecha">{fecha(o.creado_en)} {hhmm(o.creado_en)}</td>
                  <td data-l="Local">{S.nombreLocal(o.local_id)}</td>
                  <td data-l="Por dónde" className="d-quiet">{CANAL[o.canal] || o.canal}</td>
                  <td data-l="Estado"><Badge estado={o.estado} modalidad={o.modalidad} /></td>
                  <td data-l="Total" className="d-num money">{money(o.total_cobrado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {pregunta?.tipo === 'quitar' && (
        <Dialogo titulo={`¿Quitar el ${S.telefonoBonito(pregunta.telefono)}?`} onCerrar={() => setPregunta(null)}>
          <p>Camila dejará de reconocer a {p.nombre} desde este número.</p>
          <div className="d-dialog__acts">
            <button type="button" className="d-btn" onClick={() => setPregunta(null)}>Cancelar</button>
            <button type="button" className="d-btn d-btn--danger" onClick={() => quitar(pregunta.telefono)}>Sí, quitar</button>
          </div>
        </Dialogo>
      )}
      {pregunta?.tipo === 'compartir' && (
        <Dialogo titulo="Este número ya es de otra persona" onCerrar={() => setPregunta(null)}>
          <p>El {S.telefonoBonito(pregunta.telefono)} ya es de {pregunta.otra.nombre} {pregunta.otra.apellido}. ¿Comparten el teléfono?</p>
          <div className="d-dialog__acts">
            <button type="button" className="d-btn" onClick={() => setPregunta(null)}>Cancelar</button>
            <button type="button" className="d-btn d-btn--primary" onClick={() => { S.vincularTelefono(p.persona_id, pregunta.telefono, 'confirmada'); setNuevoTel(''); setPregunta(null); avisar('Guardado.') }}>Sí, lo comparten</button>
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
          <Stat label="Motos en la calle" value="0" foot="Ninguna entrega en camino ahora" />
          <Stat label="Entregas de hoy" value={num(entregadasHoy)} foot={entregadasHoy ? 'Todas ya llegaron' : 'Todavía ninguna'} href={entregadasHoy ? hrefPanel('pedidos', { estado: 'entregado', modalidad: 'domicilio', from: 'motos' }, A) : null} go={`Ver las ${entregadasHoy}`} />
          <Stat label="Última vuelta" value={ultima ? hhmm(ultima.hora) : SIN_DATO} foot={ultima ? `Pedido ${ultima.pedido_id}` : 'Aún ninguna'} href={ultima ? hrefPanel('pedidos/' + ultima.pedido_id, { from: 'motos' }, A) : null} go="Ver el pedido" />
          <Stat label="Tiempo de entrega" value={mins.length ? (mins.length < 20 ? `${Math.min(...mins)}–${Math.max(...mins)} min` : `${Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)} min`) : SIN_DATO} foot={mins.length ? (mins.length < 20 ? 'Entre la más rápida y la más lenta' : 'Promedio de hoy') : 'Sin entregas terminadas'} />
        </div>
        <Card title="Ninguna moto en la calle"
          sub={abre && !hoyN ? 'Todavía no sale ninguna entrega hoy. Los locales abren a las 11:00.'
            : entregadasHoy ? `Hoy salieron ${entregadasHoy} entregas y todas ya llegaron.${ultima ? ` La última volvió a las ${hhmm(ultima.hora)}.` : ''}${mins.length ? ` Tardaron entre ${Math.min(...mins)} y ${Math.max(...mins)} minutos.` : ''}`
              : 'Hoy todavía no ha salido ninguna entrega.'}
          foot={enHorno ? `Hay ${cuenta(enHorno, 'pedido', 'pedidos')} en el horno que saldrán pronto.` : null}>
          <FleetMap entregas={[]} huella={huella} height={320} sedesVisibles={S.localesConectados().map((l) => l.id)}
            onHuella={(id) => { window.location.hash = hrefPanel('pedidos/' + id, { from: 'motos' }, A).slice(1) }} />
        </Card>
      </div>
    )
  }

  return (
    <div className={entrada ? 'd-entrada' : ''} style={{ display: 'grid', gap: 20 }}>
      <div className="d-stats">
        <Stat label="Motos en la calle" value={num(todas.length)} foot={`${cuenta(todas.length, 'entrega', 'entregas')} en camino ahora`} href="#quien" go="Ver quién está fuera" />
        <Stat label="Pasadas de 35 minutos" value={num(atrasadas)} tono={atrasadas ? 'es-abajo' : ''}
          foot={atrasadas ? 'Conviene avisar al cliente antes de que llame' : 'Todas dentro de lo normal'}
          href={atrasadas ? hrefPanel('motos', { atrasadas: '1' }, F) : null} go={`Ver las ${atrasadas}`} />
        <Stat label="Dinero en la calle" value={money(enCalle)} foot="Lo que va en las motos ahora mismo" />
        <Stat label="La que más lleva fuera" value={masFuera?.minutos_fuera != null ? `${masFuera.minutos_fuera} min` : SIN_DATO}
          foot={masFuera ? `${masFuera.repartidor || 'Motorizado'} · ${S.nombreLocal(masFuera.local_id)}` : ''}
          href={masFuera ? hrefPanel('motos/' + masFuera.pedido_id, {}, F) : null} go="Seguir esa moto" />
      </div>

      <Card i={0}
        title={elegida ? `${elegida.repartidor || 'Motorizado'} · ${elegida.pedido_id}` : soloAtrasadas ? 'Las motos pasadas de 35 minutos' : 'Todas las motos ahora'}
        sub={elegida
          ? `Salió hace ${elegida.minutos_fuera} min de ${S.nombreLocal(elegida.local_id)} hacia ${elegida.destino?.sector || 'la casa del cliente'}`
          : 'Toque una moto en el mapa, o una fila de la lista, para seguir solo esa'}
        tools={(elegida || soloAtrasadas) && <a className="d-btn d-btn--sm" href={hrefPanel('motos', {}, F)}>Ver todas</a>}
        foot="La línea marca hacia dónde va, no por qué calles.">
        <FleetMap entregas={entregas} seleccion={sel} onSelect={(id) => elegir(id)} hover={hover} onHover={setHover}>
          {movil && elegida && (
            <div className="d-flotante">
              <b>{elegida.repartidor || 'Motorizado'} · {elegida.minutos_fuera} min</b>
              <span>{elegida.destino?.sector || ''}{elegida.destino?.calle ? ` · ${elegida.destino.calle}` : ''}</span>
              <a className="d-btn d-btn--primary" href={hrefPanel('pedidos/' + elegida.pedido_id, { from: 'motos' }, A)}>Ver pedido</a>
              <button type="button" className="x" aria-label="Cerrar" onClick={() => elegir(null)}>×</button>
            </div>
          )}
        </FleetMap>
      </Card>

      {elegida && !movil && (
        <div className="d-grid">
          <Card span={7} i={1} title="Esta entrega">
            <table className="d-table">
              <tbody>
                <tr><td data-l="Cliente">{elegida.persona ? `${elegida.persona.nombre} ${elegida.persona.apellido}` : SIN_DATO}</td>
                  <td data-l="Teléfono" className="d-quiet">{elegida.persona?.telefonos[0] ? S.telefonoBonito(elegida.persona.telefonos[0].telefono) : SIN_DATO}</td></tr>
                <tr><td data-l="Dirección">{elegida.destino?.calle || SIN_DATO}</td>
                  <td data-l="Sector" className="d-quiet">{elegida.destino?.sector || SIN_DATO}</td></tr>
                <tr><td data-l="Total">{money(elegida.total_cobrado)}</td>
                  <td data-l="Pago" className="d-quiet">{PAGO[elegida.forma_pago] || elegida.forma_pago}</td></tr>
              </tbody>
            </table>
            <p style={{ marginTop: 12 }}><a className="d-btn" href={hrefPanel('pedidos/' + elegida.pedido_id, { from: 'motos' }, A)}>Ver el pedido completo</a></p>
          </Card>
          <Card span={5} i={2} title="Estado" sub="Cuando llegue, un toque en Entregado">
            <EstadoPedido pedido={elegida} />
          </Card>
        </div>
      )}

      <Card i={3} title="Quién está fuera" sub="Toque una fila para seguirla en el mapa">
        <div id="quien" />
        <table className="d-table">
          <thead><tr><th>Motorizado</th><th>Pedido</th><th>Local</th><th>Sector</th><th>Salió hace</th><th className="d-num">Total</th></tr></thead>
          <tbody>
            {entregas.map((e) => (
              <tr key={e.pedido_id} id={'fila-' + e.pedido_id} tabIndex={0} role="button"
                onClick={() => elegir(e.pedido_id === sel ? null : e.pedido_id)}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); elegir(e.pedido_id === sel ? null : e.pedido_id) } }}
                onMouseEnter={() => setHover(e.pedido_id)} onMouseLeave={() => setHover(null)}
                className={(e.pedido_id === sel ? 'd-row--on' : '') + (hover === e.pedido_id ? ' d-row--hover' : '') + (soloAtrasadas || !sel || sel === e.pedido_id ? '' : ' d-dim')}
                style={{ cursor: 'pointer' }}>
                <td data-l="Motorizado">{e.repartidor || SIN_DATO}</td>
                <td data-l="Pedido"><a href={hrefPanel('pedidos/' + e.pedido_id, { from: 'motos' }, A)} onClick={(ev) => ev.stopPropagation()}>{e.pedido_id}</a></td>
                <td data-l="Local">{S.nombreLocal(e.local_id)}</td>
                <td data-l="Sector" className="d-quiet">{e.destino?.sector || SIN_DATO}</td>
                <td data-l="Salió hace">{e.minutos_fuera != null ? <span className={e.atrasado ? 'd-late' : ''}>{e.minutos_fuera} min</span> : SIN_DATO}</td>
                <td data-l="Total" className="d-num money">{money(e.total_cobrado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

const hoyKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date())
