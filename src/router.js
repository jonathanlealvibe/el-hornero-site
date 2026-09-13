import { useEffect, useState } from 'react'
// Hash router: "#/pedido/EH1234", "#/panel/ventas?tab=productos", otherwise home.
export function useRoute() {
  const parse = () => {
    const raw = window.location.hash.replace(/^#\/?/, '')
    const [path, qs] = raw.split('?')
    const parts = path.split('/')
    const query = new URLSearchParams(qs || '')
    return {
      page: parts[0] || 'home',
      id: parts[1] || null,
      sub: parts[2] || null,
      q: Object.fromEntries(query),
      d: query.get('d'),
    }
  }
  const [route, setRoute] = useState(parse)
  useEffect(() => { const on = () => setRoute(parse()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  return route
}
export const go = (path) => { window.location.hash = path }
