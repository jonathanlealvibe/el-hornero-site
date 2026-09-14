import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import * as S from './store.js'
import { estadoTexto } from './textos.js'
import { hhmm, money } from './format.js'
import { marcar } from './motion.js'
import { T } from './i18n.js'

/* ---------------------------------------------------------------- toast */

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastHost({ children }) {
  const [t, setT] = useState(null)
  const timer = useRef(null)
  const cerrar = useCallback(() => setT((x) => (x ? { ...x, saliendo: true } : x)), [])
  const avisar = useCallback((texto, { deshacer, vida = deshacer ? 5000 : 2000 } = {}) => {
    clearTimeout(timer.current)
    setT({ texto, deshacer, vida, id: Date.now() })
    timer.current = setTimeout(cerrar, vida)
  }, [cerrar])
  useEffect(() => {
    if (!t?.saliendo) return
    const x = setTimeout(() => setT(null), 170)
    return () => clearTimeout(x)
  }, [t])
  const pausa = () => clearTimeout(timer.current)
  const sigue = () => { if (t && !t.saliendo) timer.current = setTimeout(cerrar, 1500) }
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      {t && (
        <div className={'d-toast' + (t.saliendo ? ' saliendo' : '')} role="status" style={{ '--vida': `${t.vida}ms` }}
          onMouseEnter={pausa} onMouseLeave={sigue} onFocus={pausa} onBlur={sigue}>
          <span>{t.texto}</span>
          {t.deshacer && <button type="button" onClick={() => { t.deshacer(); clearTimeout(timer.current); cerrar() }}>{T('Deshacer', 'Undo')}</button>}
          <i className="d-toast__barra" key={t.id} aria-hidden />
        </div>
      )}
    </ToastCtx.Provider>
  )
}

/* -------------------------------------------------------------- diálogo */

export function Dialogo({ titulo, children, onCerrar }) {
  useEffect(() => {
    const on = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [onCerrar])
  return (
    <div className="d-dialogwrap" onClick={onCerrar}>
      <div className="d-dialog" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

/* -------------------------------------------------------- estado del pedido */

const MOTIVOS = () => [T('El cliente se arrepintió', 'The customer changed their mind'), T('No se pudo entregar', 'Could not be delivered'), T('Se tomó mal el pedido', 'The order was taken wrong'), T('Otro motivo', 'Another reason')]

// La escalera: un toque avanza un paso, con Deshacer 5 s. Cancelar pide motivo.
export function EstadoPedido({ pedido, compacto = false }) {
  const avisar = useToast()
  const [dialogo, setDialogo] = useState(false)
  const [motivo, setMotivo] = useState(MOTIVOS()[0])
  const pasos = S.pasosDe(pedido)
  const idx = pasos.indexOf(pedido.estado)
  const cancelado = pedido.estado === 'cancelado'
  const siguiente = idx >= 0 && idx < pasos.length - 1 ? pasos[idx + 1] : null
  const anterior = idx > 0 ? pasos[idx - 1] : null

  const ir = (estado, aviso = true) => {
    const antes = pedido.estado
    const ok = S.cambiarEstado(pedido.pedido_id, estado)
    if (!ok) return
    if (aviso) avisar(T(`${pedido.pedido_id} pasó a ${estadoTexto(estado, pedido.modalidad)}`, `${pedido.pedido_id} moved to ${estadoTexto(estado, pedido.modalidad)}`), { deshacer: () => S.cambiarEstado(pedido.pedido_id, antes, { forzar: true }) })
  }
  const cancelar = () => {
    S.cancelarPedido(pedido.pedido_id, motivo)
    setDialogo(false)
    avisar(T(`${pedido.pedido_id} quedó cancelado`, `${pedido.pedido_id} was cancelled`))
  }

  if (compacto) {
    return (
      <span className="d-pasos" aria-label={`${T('Estado', 'Status')}: ${estadoTexto(pedido.estado, pedido.modalidad)}`}>
        {pasos.map((p, i) => (
          <button key={p} type="button" title={estadoTexto(p, pedido.modalidad)}
            className={i < idx ? 'hecho' : i === idx ? 'actual' : ''}
            disabled={cancelado || i <= idx}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (i === idx + 1) ir(p) }} />
        ))}
      </span>
    )
  }

  return (
    <div className="d-escalera">
      {pasos.map((p, i) => {
        const hecho = i < idx, actual = i === idx, sig = i === idx + 1
        return (
          <button key={p} type="button" aria-pressed={actual}
            className={'d-escalera__paso' + (hecho ? ' hecho' : '') + (sig ? ' siguiente' : '')}
            disabled={cancelado || (!sig)}
            onClick={() => sig && ir(p)}>
            <i /> {estadoTexto(p, pedido.modalidad)}{sig ? ' ›' : ''}
            {pedido.historial?.[p] && <span className="d-escalera__hora">{hhmm(pedido.historial[p])}</span>}
          </button>
        )
      })}
      {!cancelado && (
        <div className="d-escalera__mas">
          {anterior && <button type="button" onClick={() => ir(anterior)}>{T('Devolver un paso', 'Go back one step')}</button>}
          <button type="button" className="peligro" onClick={() => setDialogo(true)}>{T('Cancelar el pedido', 'Cancel the order')}</button>
        </div>
      )}
      {cancelado && <p className="d-quiet" style={{ fontSize: 13 }}>{T('Cancelado', 'Cancelled')}{pedido.motivo_cancelacion ? `: ${pedido.motivo_cancelacion}` : ''}.</p>}
      {dialogo && (
        <Dialogo titulo={T(`¿Cancelar el pedido ${pedido.pedido_id}?`, `Cancel order ${pedido.pedido_id}?`)} onCerrar={() => setDialogo(false)}>
          <div className="d-radios">
            {MOTIVOS().map((m) => (
              <label key={m}><input type="radio" name="motivo" checked={motivo === m} onChange={() => setMotivo(m)} /> {m}</label>
            ))}
          </div>
          <p>{T(`Se restan ${money(pedido.total_cobrado)} de lo cobrado hoy y el cliente deja de verlo en su link.`, `${money(pedido.total_cobrado)} is taken off today's takings and the customer stops seeing it in their link.`)}</p>
          <div className="d-dialog__acts">
            <button type="button" className="d-btn" onClick={() => setDialogo(false)}>{T('No, dejarlo como está', 'No, leave it')}</button>
            <button type="button" className="d-btn d-btn--danger" onClick={cancelar}>{T('Sí, cancelar', 'Yes, cancel')}</button>
          </div>
        </Dialogo>
      )}
      <span className="d-quiet" style={{ fontSize: 12 }}>{siguiente ? T('Un toque avanza al siguiente paso. Se puede deshacer 5 segundos.', 'One tap moves to the next step. Undo within 5 seconds.') : ''}</span>
    </div>
  )
}

/* ----------------------------------------------------------- campo editable */

// El texto no se mueve un píxel al editar: mismo recuadro, Enter o salir guarda, Esc cancela.
export function CampoEditable({ etiqueta, valor, vacio = T('Sin dato', 'No data'), ayuda, onGuardar, normalizar, validar, tipo = 'text' }) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(valor || '')
  const [err, setErr] = useState(null)
  const wrap = useRef(null)
  const input = useRef(null)
  useEffect(() => { if (!edit) setV(valor || '') }, [valor, edit])
  useEffect(() => { if (edit) input.current?.select() }, [edit])

  const guardar = () => {
    const limpio = normalizar ? normalizar(v) : v.trim()
    const e = validar ? validar(limpio) : null
    if (e) { setErr(e); return }
    setErr(null)
    if (limpio !== (valor || '')) {
      const r = onGuardar(limpio)
      if (r && r.error) { setErr(r.error); return }
      marcar(wrap.current)
    }
    setEdit(false)
  }
  const teclas = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); guardar() }
    if (e.key === 'Escape') { setV(valor || ''); setErr(null); setEdit(false) }
  }
  return (
    <div className="d-campo" ref={wrap}>
      <span className="d-campo__lab">{etiqueta}</span>
      {edit
        ? <input ref={input} type={tipo} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={teclas} onBlur={guardar} aria-label={etiqueta} />
        : (
          <button type="button" className={'d-campo__val' + (valor ? '' : ' vacio')} onClick={() => setEdit(true)} aria-label={`${T('Editar', 'Edit')} ${etiqueta}`}>
            <span>{valor || vacio}</span><span className="lapiz" aria-hidden>✎</span>
          </button>
        )}
      {err && <span className="d-campo__err" role="alert">{err}</span>}
      {!err && ayuda && edit && <span className="d-campo__ayuda">{ayuda}</span>}
    </div>
  )
}

/* ---------------------------------------------------------- menú de estado */

// El menú desplegable del ticket: cualquier paso, ver el pedido, cancelar.
export function MenuEstado({ pedido, href }) {
  const avisar = useToast()
  const [abierto, setAbierto] = useState(false)
  const [dialogo, setDialogo] = useState(false)
  const [motivo, setMotivo] = useState(MOTIVOS()[0])
  const wrap = useRef(null)
  const pasos = S.pasosDe(pedido)
  const idx = pasos.indexOf(pedido.estado)
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => { if (!wrap.current?.contains(e.target)) setAbierto(false) }
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', fuera); window.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', tecla) }
  }, [abierto])
  const ir = (estado) => {
    const antes = pedido.estado
    setAbierto(false)
    if (S.cambiarEstado(pedido.pedido_id, estado, { forzar: true })) {
      avisar(T(`${pedido.pedido_id} pasó a ${estadoTexto(estado, pedido.modalidad)}`, `${pedido.pedido_id} moved to ${estadoTexto(estado, pedido.modalidad)}`), { deshacer: () => S.cambiarEstado(pedido.pedido_id, antes, { forzar: true }) })
    }
  }
  const cancelar = () => { S.cancelarPedido(pedido.pedido_id, motivo); setDialogo(false); avisar(T(`${pedido.pedido_id} quedó cancelado`, `${pedido.pedido_id} was cancelled`)) }
  const quieto = (e) => { e.preventDefault(); e.stopPropagation() }
  return (
    <span className="d-menu" ref={wrap} onClick={quieto}>
      <button type="button" className="d-btn d-btn--sm d-ticket__next" aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        {estadoTexto(pedido.estado, pedido.modalidad)} ▾
      </button>
      {abierto && (
        <div className="d-menu__lista" role="menu">
          {pasos.map((p, i) => (
            <button key={p} type="button" role="menuitem" className={i < idx ? 'hecho' : i === idx ? 'actual' : i === idx + 1 ? 'siguiente' : ''} disabled={i === idx} onClick={() => ir(p)}>
              <i /> {estadoTexto(p, pedido.modalidad)}{i === idx + 1 ? ' ›' : ''}
            </button>
          ))}
          <hr />
          {href && <button type="button" role="menuitem" onClick={() => { setAbierto(false); window.location.hash = href.replace(/^#/, '') }}>{T('Ver el pedido completo', 'See the full order')}</button>}
          <button type="button" role="menuitem" className="peligro" onClick={() => { setAbierto(false); setDialogo(true) }}>{T('Cancelar el pedido…', 'Cancel the order…')}</button>
        </div>
      )}
      {dialogo && (
        <Dialogo titulo={T(`¿Cancelar el pedido ${pedido.pedido_id}?`, `Cancel order ${pedido.pedido_id}?`)} onCerrar={() => setDialogo(false)}>
          <div className="d-radios">
            {MOTIVOS().map((m) => (
              <label key={m}><input type="radio" name={'motivo-' + pedido.pedido_id} checked={motivo === m} onChange={() => setMotivo(m)} /> {m}</label>
            ))}
          </div>
          <p>{T(`Se restan ${money(pedido.total_cobrado)} de lo cobrado hoy y el cliente deja de verlo en su link.`, `${money(pedido.total_cobrado)} is taken off today's takings and the customer stops seeing it in their link.`)}</p>
          <div className="d-dialog__acts">
            <button type="button" className="d-btn" onClick={() => setDialogo(false)}>{T('No, dejarlo como está', 'No, leave it')}</button>
            <button type="button" className="d-btn d-btn--danger" onClick={cancelar}>{T('Sí, cancelar', 'Yes, cancel')}</button>
          </div>
        </Dialogo>
      )}
    </span>
  )
}


/* ----------------------------------------------------- desplegable de estado */

// Desplegable simple con la palabra y el color del estado: salta a cualquier paso (con Deshacer)
// o cancela pidiendo motivo. Convive con la escalera y con el avance automático del reloj.
export function SelectorEstado({ pedido }) {
  const avisar = useToast()
  const [dialogo, setDialogo] = useState(false)
  const [motivo, setMotivo] = useState(MOTIVOS()[0])
  const pasos = S.pasosDe(pedido)
  const cancelado = pedido.estado === 'cancelado'
  const cambiar = (v) => {
    if (v === '__cancelar') { setDialogo(true); return }
    if (v === pedido.estado) return
    const antes = pedido.estado
    if (S.cambiarEstado(pedido.pedido_id, v, { forzar: true })) {
      avisar(T(`${pedido.pedido_id} pasó a ${estadoTexto(v, pedido.modalidad)}`, `${pedido.pedido_id} moved to ${estadoTexto(v, pedido.modalidad)}`), { deshacer: () => S.cambiarEstado(pedido.pedido_id, antes, { forzar: true }) })
    }
  }
  const cancelar = () => { S.cancelarPedido(pedido.pedido_id, motivo); setDialogo(false); avisar(T(`${pedido.pedido_id} quedó cancelado`, `${pedido.pedido_id} was cancelled`)) }
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <select className={'d-select d-select--estado d-select--e-' + pedido.estado} value={pedido.estado} disabled={cancelado}
        aria-label={T('Cambiar estado', 'Change status')} onChange={(e) => cambiar(e.target.value)}>
        {pasos.map((p) => <option key={p} value={p}>{estadoTexto(p, pedido.modalidad)}</option>)}
        {cancelado ? <option value="cancelado">{estadoTexto('cancelado')}</option> : <option value="__cancelar">{T('Cancelar el pedido…', 'Cancel the order…')}</option>}
      </select>
      {dialogo && (
        <Dialogo titulo={T(`¿Cancelar el pedido ${pedido.pedido_id}?`, `Cancel order ${pedido.pedido_id}?`)} onCerrar={() => setDialogo(false)}>
          <div className="d-radios">
            {MOTIVOS().map((m) => (
              <label key={m}><input type="radio" name={'motivo-sel-' + pedido.pedido_id} checked={motivo === m} onChange={() => setMotivo(m)} /> {m}</label>
            ))}
          </div>
          <div className="d-dialog__acts">
            <button type="button" className="d-btn" onClick={() => setDialogo(false)}>{T('No, dejarlo como está', 'No, leave it')}</button>
            <button type="button" className="d-btn d-btn--danger" onClick={cancelar}>{T('Sí, cancelar', 'Yes, cancel')}</button>
          </div>
        </Dialogo>
      )}
    </span>
  )
}
