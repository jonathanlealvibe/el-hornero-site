// Español por defecto; inglés como segunda voz. Cada texto se escribe UNA vez en
// el sitio donde se usa, con su traducción al lado: T('Pedidos', 'Orders').
// El idioma vive en localStorage y en una variable de módulo, para que también
// las funciones puras (títulos, renglones) hablen el idioma elegido.
let lang = 'es'
try { lang = localStorage.getItem('eh.dash.idioma') === 'en' ? 'en' : 'es' } catch { /* privado */ }

export const getLang = () => lang
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'es'
  try { localStorage.setItem('eh.dash.idioma', lang) } catch { /* privado */ }
  document.documentElement.lang = lang
}
export const T = (es, en) => (lang === 'en' && en != null ? en : es)
export const locale = () => (lang === 'en' ? 'en-US' : 'es-EC')

// Tema: oscuro por defecto; claro es la paleta de siempre.
export const getTema = () => { try { return localStorage.getItem('eh.dash.tema') === 'oscuro' ? 'oscuro' : 'claro' } catch { return 'claro' } }
export function setTema(t) {
  const v = t === 'claro' ? 'claro' : 'oscuro'
  try { localStorage.setItem('eh.dash.tema', v) } catch { /* privado */ }
  aplicarTema()
  return v
}
export function aplicarTema() {
  const enPanel = location.hash.startsWith('#/panel')
  const t = getTema()
  if (enPanel) document.documentElement.setAttribute('data-tema', t); else document.documentElement.removeAttribute('data-tema')
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', enPanel ? (t === 'claro' ? '#0A4526' : '#0F1F16') : '#0E5A33')
}

// Datos: demostración (inventados) o en vivo (los pedidos reales de la tienda).
export const getDatos = () => { try { return localStorage.getItem('eh.dash.datos') === 'vivo' ? 'vivo' : 'demo' } catch { return 'demo' } }
export function setDatos(d) {
  const v = d === 'vivo' ? 'vivo' : 'demo'
  try { localStorage.setItem('eh.dash.datos', v) } catch { /* privado */ }
  return v
}
