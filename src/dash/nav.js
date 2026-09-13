// Navegación del tablero: los filtros viajan en la URL, así cada cifra es un
// enlace que se puede copiar, abrir en otra pestaña y compartir por WhatsApp.
import { useEffect, useState } from 'react'
import { dayKey } from './format.js'

export const PERIODOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'dia', label: 'Un día' },
]

export function rangoDe(periodo, dia) {
  const hoy = new Date()
  const k = (d) => dayKey(d)
  if (periodo === 'ayer') { const a = new Date(hoy.getTime() - 86400000); return { desde: k(a), hasta: k(a) } }
  if (periodo === '7d') return { desde: k(new Date(hoy.getTime() - 6 * 86400000)), hasta: k(hoy) }
  if (periodo === 'mes') { const p = k(hoy).slice(0, 8) + '01'; return { desde: p, hasta: k(hoy) } }
  if (periodo === 'dia' && dia) return { desde: dia, hasta: dia }
  return { desde: k(hoy), hasta: k(hoy) }
}

export const PERIODO_FRASE = {
  hoy: 'hoy', ayer: 'ayer', '7d': 'en los últimos 7 días', mes: 'este mes', dia: 'ese día',
}

// hrefPanel('pedidos', { estado:'camino' }, filtrosActuales) → '#/panel/pedidos?estado=camino&local=x&periodo=hoy'
export function hrefPanel(vista, params = {}, actuales = {}) {
  const q = new URLSearchParams()
  const local = 'local' in params ? params.local : actuales.local
  const periodo = 'periodo' in params ? params.periodo : actuales.periodo
  if (local) q.set('local', local)
  if (periodo && periodo !== 'hoy') q.set('periodo', periodo)
  if (periodo === 'dia' && (params.dia || actuales.dia)) q.set('dia', params.dia || actuales.dia)
  for (const [k, v] of Object.entries(params)) {
    if (['local', 'periodo', 'dia'].includes(k)) continue
    if (v === undefined || v === null || v === '') continue
    q.set(k, String(v))
  }
  const s = q.toString()
  return `#/panel/${vista}${s ? `?${s}` : ''}`
}

const leer = () => {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [, qs] = raw.split('?')
  return Object.fromEntries(new URLSearchParams(qs || ''))
}

// URL > localStorage (solo el local) > todos. El periodo NUNCA se recuerda:
// leer la cifra del mes creyendo que es la de hoy es el único error grave posible.
export function usarFiltros() {
  const [q, setQ] = useState(leer)
  useEffect(() => {
    const on = () => setQ(leer())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  let local = q.local
  if (local === undefined) { try { local = localStorage.getItem('eh.dash.local') || '' } catch { local = '' } }
  useEffect(() => { if (q.local !== undefined) { try { localStorage.setItem('eh.dash.local', q.local) } catch { /* privado */ } } }, [q.local])
  const periodo = PERIODOS.some((p) => p.key === q.periodo) ? q.periodo : 'hoy'
  return { ...q, local: local || '', periodo, dia: q.dia || '' }
}

// Cambia parámetros de la URL actual sin perder la vista.
export function irCon(params) {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path, qs] = raw.split('?')
  const q = new URLSearchParams(qs || '')
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') q.delete(k); else q.set(k, String(v))
  }
  const s = q.toString()
  window.location.hash = `/${path}${s ? `?${s}` : ''}`
}
