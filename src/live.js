// Ubicación real del repartidor para la demo, sin servidor propio.
// El celular del repartidor publica cada fix en un tema de ntfy.sh (relevo público, sin cuenta)
// y la página del cliente se suscribe por SSE. Un tema por pedido, derivado del código del
// pedido, así los dos celulares llegan al mismo canal sin acordar nada. ntfy guarda los mensajes
// unas horas, por eso el cliente ve la última posición aunque abra el link después.
import { hash6 } from './api.js'

const NTFY = 'https://ntfy.sh'
const SALT = 'hornero-quito-2026'
// Un fix más viejo que esto no cuenta: evita que una prueba de hace horas mueva el mapa.
export const LIVE_MAX_AGE_MS = 30 * 60 * 1000
// ntfy.sh admite ~1 mensaje cada 5 s de forma sostenida por celular.
export const PUBLISH_EVERY_MS = 5000

export const topicFor = (id) => `elhornero-${String(id).toLowerCase()}-${hash6(String(id) + SALT).toLowerCase()}`

export async function publishLive(id, msg) {
  try {
    const r = await fetch(`${NTFY}/${topicFor(id)}`, { method: 'POST', body: JSON.stringify(msg), headers: { 'Content-Type': 'text/plain', Title: 'gps' } })
    return r.ok
  } catch { return false }
}

// onMsg recibe {t:'fix', lat, lng, acc, at} o {t:'status', status, at}. Devuelve la función para cerrar.
export function subscribeLive(id, onMsg) {
  if (typeof EventSource === 'undefined') return () => {}
  const es = new EventSource(`${NTFY}/${topicFor(id)}/sse?since=1h`)
  es.onmessage = (e) => {
    try {
      const env = JSON.parse(e.data)
      if (env.event && env.event !== 'message') return
      const m = JSON.parse(env.message)
      if (!m || typeof m.at !== 'number') return
      if (Date.now() - m.at > LIVE_MAX_AGE_MS) return
      onMsg(m)
    } catch { /* mensaje ajeno o roto: se ignora */ }
  }
  return () => es.close()
}
