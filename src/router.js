import { useEffect, useState } from 'react'
// Hash router: "#/pedido/EH1234", "#/repartidor/EH1234", otherwise home.
export function useRoute() {
  const parse = () => {
    const raw = window.location.hash.replace(/^#\/?/, '')
    const [path, qs] = raw.split('?')
    const [page, id] = path.split('/')
    const query = new URLSearchParams(qs || '')
    return { page: page || 'home', id: id || null, d: query.get('d') }
  }
  const [route, setRoute] = useState(parse)
  useEffect(() => { const on = () => setRoute(parse()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  return route
}
export const go = (path) => { window.location.hash = path }
