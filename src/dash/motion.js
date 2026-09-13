// La única puerta del movimiento. Todo JS que anime pasa por aquí, para que
// "Reducir movimiento" deje el tablero quieto con una sola regla.
import { useEffect, useMemo, useRef, useState } from 'react'

export const reduce = (() => {
  if (typeof matchMedia !== 'function') return () => false
  const mq = matchMedia('(prefers-reduced-motion: reduce)')
  let v = mq.matches
  mq.addEventListener?.('change', (e) => { v = e.matches })
  return () => v
})()

export const quieto = () => reduce() || (typeof document !== 'undefined' && document.hidden)

export function animar(el, kf, opts) {
  if (!el || typeof el.animate !== 'function') return null
  if (quieto()) { const a = el.animate(kf, { ...opts, duration: 0 }); a.finish(); return a }
  return el.animate(kf, opts)
}

// Cuenta una cifra de `desde` a `hasta`. Al 50 % del tiempo ya va en el 94 %:
// los miles se fijan a los 300 ms y el ojo lee el número final antes de que pare.
export function contar(el, desde, hasta, formato, { dur = 600, retraso = 0 } = {}) {
  if (!el) return
  if (quieto() || desde === hasta) { el.textContent = formato(hasta); return }
  const ease = (k) => 1 - Math.pow(1 - k, 4)
  let t0 = null
  const paso = (t) => {
    if (t0 === null) t0 = t
    const k = Math.min(1, (t - t0) / dur)
    el.textContent = formato(desde + (hasta - desde) * ease(k))
    if (k < 1) requestAnimationFrame(paso)
  }
  setTimeout(() => requestAnimationFrame(paso), retraso)
}

// Destello de "esto acaba de cambiar". En reduced-motion es un fondo fijo que se va.
export function marcar(el, clase = 'd-flash', ms = 1200) {
  if (!el) return
  const c = reduce() ? 'd-cambio' : clase
  el.classList.remove(c); void el.offsetWidth; el.classList.add(c)
  setTimeout(() => el.classList.remove(c), ms)
}

export function cruzar(el, escribir) {
  if (!el || quieto()) { escribir(); return }
  el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' })
  setTimeout(escribir, 75)
}

// La coreografía de llegada se hace UNA vez por sesión (o tras 30 minutos fuera).
export function useEntrada() {
  return useMemo(() => {
    if (reduce()) return false
    let t = 0
    try { t = +sessionStorage.getItem('eh.dash.entrada') || 0 } catch { /* privado */ }
    const toca = Date.now() - t > 30 * 60000
    try { sessionStorage.setItem('eh.dash.entrada', String(Date.now())) } catch { /* privado */ }
    return toca
  }, [])
}

// Qué ids no estaban en el render anterior. En el primer render, ninguno.
export function useNuevos(ids) {
  const vistos = useRef(null)
  const nuevos = useMemo(() => (vistos.current ? ids.filter((id) => !vistos.current.has(id)) : []), [ids])
  useEffect(() => { vistos.current = new Set(ids) }, [ids])
  return nuevos
}

// Con la pestaña oculta o 120 s sin tocar nada, todos los bucles se pausan.
export function useDormido() {
  const [dormido, setDormido] = useState(false)
  useEffect(() => {
    let t = null
    const despierta = () => { setDormido(false); clearTimeout(t); t = setTimeout(() => setDormido(true), 120000) }
    const vis = () => { if (document.hidden) setDormido(true); else despierta() }
    despierta()
    document.addEventListener('visibilitychange', vis)
    for (const ev of ['pointermove', 'touchstart', 'keydown', 'scroll']) window.addEventListener(ev, despierta, { passive: true })
    return () => {
      clearTimeout(t); document.removeEventListener('visibilitychange', vis)
      for (const ev of ['pointermove', 'touchstart', 'keydown', 'scroll']) window.removeEventListener(ev, despierta)
    }
  }, [])
  return dormido
}

// ¿Estamos en un teléfono? Reactivo: el tablero se abre en una ventana y se estira en otra.
export function useMovil(q = '(max-width: 899px)') {
  const [v, setV] = useState(() => (typeof matchMedia === 'function' ? matchMedia(q).matches : false))
  useEffect(() => {
    const mq = matchMedia(q)
    const on = (e) => setV(e.matches)
    setV(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return v
}

// <Cifra>: el número cuenta una vez al montar; el lector de pantalla recibe el valor final.
export function usarCifra(valor, formato, { activo = true, dur = 600 } = {}) {
  const ref = useRef(null)
  const previo = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (previo.current === null && activo) contar(el, 0, valor, formato, { dur })
    else el.textContent = formato(valor)
    previo.current = valor
  }, [valor, formato, activo, dur])
  return ref
}
