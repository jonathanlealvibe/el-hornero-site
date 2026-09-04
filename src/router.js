import { useEffect, useState } from 'react'
// Hash router: "#/pedido/EH1234", "#/repartidor/EH1234", otherwise home.
export function useRoute() {
  const parse = () => {
    const h = window.location.hash.replace(/^#\/?/, '')
    const [page, id] = h.split('/')
    return { page: page || 'home', id: id || null }
  }
  const [route, setRoute] = useState(parse)
  useEffect(() => { const on = () => setRoute(parse()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  return route
}
export const go = (path) => { window.location.hash = path }
