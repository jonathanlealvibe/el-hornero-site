import { useEffect, useState } from 'react'
import { Card } from './screens.jsx'
import { useToast, Dialogo } from './Editable.jsx'
import { T } from './i18n.js'
import { PROMOS_SEMILLA, cargarLocal, guardarLocal, traerPromos, publicarPromos, textoParaCamila, uidPromo, vigente } from '../promos.js'

const money = (n) => '$' + Number(n || 0).toFixed(2)
const vacia = () => ({ id: uidPromo(), nombre: '', detalle: '', precio: '', condicion: 'Todos los locales.', hasta: '', activa: true })

// Pestaña Promociones: la gerencia agrega, edita, pausa y publica. Al publicar, el sitio y
// Camila (al inicio de cada llamada) reciben la lista vigente.
export function Promociones() {
  const toast = useToast()
  const [doc, setDoc] = useState(cargarLocal)
  const [edit, setEdit] = useState(null)        // promoción en el diálogo
  const [publicando, setPublicando] = useState(false)
  const [sucio, setSucio] = useState(false)

  useEffect(() => {
    let alive = true
    traerPromos().then((remoto) => {
      if (!alive || !remoto) return
      const local = cargarLocal()
      if (!local.actualizado || (remoto.actualizado && remoto.actualizado > local.actualizado)) { setDoc(remoto); guardarLocal(remoto) }
    })
    return () => { alive = false }
  }, [])

  const promos = doc.promos
  const setPromos = (lista) => { const d = { ...doc, promos: lista }; setDoc(d); guardarLocal(d); setSucio(true) }
  const guardarEdit = () => {
    if (!edit.nombre.trim()) { toast?.(T('Ponle un nombre a la promoción', 'Give the promotion a name')); return }
    const p = { ...edit, nombre: edit.nombre.trim(), detalle: edit.detalle.trim(), condicion: edit.condicion.trim(), precio: edit.precio === '' ? '' : Math.round(Number(edit.precio) * 100) / 100 }
    const existe = promos.some((x) => x.id === p.id)
    setPromos(existe ? promos.map((x) => (x.id === p.id ? p : x)) : [...promos, p])
    setEdit(null)
  }
  const publicar = async () => {
    setPublicando(true)
    try {
      const d = await publicarPromos(promos)
      setDoc(d); setSucio(false)
      toast?.(T('Publicado: el sitio y Camila ya tienen las promociones vigentes', 'Published: the site and Camila now have the current promotions'))
    } catch (e) { toast?.(T('No se pudo publicar. Revise la conexión e intente de nuevo.', 'Could not publish. Check the connection and retry.')) }
    setPublicando(false)
  }

  const activas = promos.filter((p) => p.activa && vigente(p))
  return (
    <>
      <Card title={T('Promociones', 'Promotions')}
        sub={T(`${activas.length} vigentes · ${promos.length - activas.length} pausadas o vencidas`, `${activas.length} active · ${promos.length - activas.length} paused or expired`)}
        tools={<>
          <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => setEdit(vacia())}>{T('+ Nueva promoción', '+ New promotion')}</button>
          <button type="button" className="d-btn d-btn--primary d-btn--sm" disabled={publicando} onClick={publicar}>{publicando ? T('Publicando…', 'Publishing…') : T('Publicar al sitio y a Camila', 'Publish to site and Camila')}</button>
        </>}
        foot={<span>{doc.actualizado ? T(`Última publicación: ${new Date(doc.actualizado).toLocaleString('es-EC')}`, `Last published: ${new Date(doc.actualizado).toLocaleString('en-US')}`) : T('Todavía no se ha publicado desde este tablero.', 'Not published from this dashboard yet.')}{sucio ? ' · ' + T('Hay cambios sin publicar', 'Unpublished changes') : ''}</span>}>
        {promos.length === 0 ? (
          <p className="d-empty"><strong>{T('No hay promociones.', 'No promotions.')}</strong>{T('Cree la primera con el botón de arriba.', 'Create the first one with the button above.')}</p>
        ) : (
          <table className="d-table">
            <thead><tr><th>{T('Promoción', 'Promotion')}</th><th>{T('Detalle', 'Details')}</th><th className="d-num">{T('Precio', 'Price')}</th><th>{T('Vigencia', 'Valid until')}</th><th>{T('Estado', 'Status')}</th><th></th></tr></thead>
            <tbody>
              {promos.map((p) => {
                const ok = p.activa && vigente(p)
                return (
                  <tr key={p.id}>
                    <td data-l={T('Promoción', 'Promotion')}><strong>{p.nombre}</strong></td>
                    <td data-l={T('Detalle', 'Details')} className="d-quiet">{p.detalle}{p.condicion ? ` · ${p.condicion}` : ''}</td>
                    <td data-l={T('Precio', 'Price')} className="d-num money">{p.precio === '' ? '—' : money(p.precio)}</td>
                    <td data-l={T('Vigencia', 'Valid until')} className="d-quiet">{p.hasta || T('Sin fecha', 'Open-ended')}</td>
                    <td data-l={T('Estado', 'Status')}><span className={'d-badge ' + (ok ? 'd-badge--ok' : 'd-badge--off')}>{ok ? T('Vigente', 'Active') : (p.activa ? T('Vencida', 'Expired') : T('Pausada', 'Paused'))}</span></td>
                    <td className="d-num">
                      <button type="button" className="d-linkbtn" onClick={() => setEdit({ ...p, precio: p.precio === '' ? '' : String(p.precio) })}>{T('Editar', 'Edit')}</button>{' · '}
                      <button type="button" className="d-linkbtn" onClick={() => setPromos(promos.map((x) => (x.id === p.id ? { ...x, activa: !x.activa } : x)))}>{p.activa ? T('Pausar', 'Pause') : T('Activar', 'Activate')}</button>{' · '}
                      <button type="button" className="d-linkbtn" onClick={() => { if (confirm(T('¿Borrar esta promoción?', 'Delete this promotion?'))) setPromos(promos.filter((x) => x.id !== p.id)) }}>{T('Borrar', 'Delete')}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card title={T('Lo que Camila dirá', 'What Camila will say')} sub={T('Camila consulta esta lista al empezar cada llamada y no ofrece nada que no esté aquí', 'Camila reads this list at the start of every call and never offers anything not listed here')}>
        <p className="d-promo-texto">{textoParaCamila(promos)}</p>
        <p className="d-quiet" style={{ marginTop: 10 }}>
          {T('Cómo funciona: agregue o edite, toque Publicar, y en segundos la página muestra las promociones vigentes y Camila las conoce en la siguiente llamada. Pausar una promoción la quita de ambos sin borrarla. Para volver a las cinco de siempre, use Restaurar.', 'How it works: add or edit, tap Publish, and within seconds the site shows the current promotions and Camila knows them on the next call. Pausing removes a promotion from both without deleting it. Use Restore to get the usual five back.')}
          {' '}<button type="button" className="d-linkbtn" onClick={() => setPromos(PROMOS_SEMILLA)}>{T('Restaurar las de siempre', 'Restore the usual ones')}</button>
        </p>
      </Card>

      {edit && (
        <Dialogo titulo={promos.some((x) => x.id === edit.id) ? T('Editar promoción', 'Edit promotion') : T('Nueva promoción', 'New promotion')} onCerrar={() => setEdit(null)}>
          <div className="d-form">
            <label>{T('Nombre (como la dirá Camila)', 'Name (as Camila will say it)')}<input className="d-input" value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} placeholder={T('16 pedazos por $7.99', '16 slices for $7.99')} /></label>
            <label>{T('Detalle', 'Details')}<input className="d-input" value={edit.detalle} onChange={(e) => setEdit({ ...edit, detalle: e.target.value })} placeholder={T('Pizza de 16 pedazos de un ingrediente', '16-slice one-topping pizza')} /></label>
            <div className="d-form__row">
              <label>{T('Precio', 'Price')}<input className="d-input" type="number" step="0.01" min="0" value={edit.precio} onChange={(e) => setEdit({ ...edit, precio: e.target.value })} placeholder="7.99" /></label>
              <label>{T('Vigente hasta', 'Valid until')}<input className="d-input" type="date" value={edit.hasta} onChange={(e) => setEdit({ ...edit, hasta: e.target.value })} /></label>
            </div>
            <label>{T('Condición o locales', 'Condition or branches')}<input className="d-input" value={edit.condicion} onChange={(e) => setEdit({ ...edit, condicion: e.target.value })} placeholder={T('Un ingrediente. Todos los locales.', 'One topping. All branches.')} /></label>
            <label className="d-form__check"><input type="checkbox" checked={edit.activa} onChange={(e) => setEdit({ ...edit, activa: e.target.checked })} /> {T('Activa', 'Active')}</label>
            <div className="d-form__actions">
              <button type="button" className="d-btn d-btn--ghost" onClick={() => setEdit(null)}>{T('Cancelar', 'Cancel')}</button>
              <button type="button" className="d-btn d-btn--primary" onClick={guardarEdit}>{T('Guardar', 'Save')}</button>
            </div>
          </div>
        </Dialogo>
      )}
    </>
  )
}
