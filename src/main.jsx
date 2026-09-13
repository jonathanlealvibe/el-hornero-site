import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'

// El tablero es oscuro; la tienda no. El fondo del <html> tiene que cambiar antes
// de que React pinte, o el rebote de iOS y la carga perezosa destellan en blanco.
const sincTema = () => {
  const o = location.hash.startsWith('#/panel')
  if (o) document.documentElement.setAttribute('data-tema', 'oscuro'); else document.documentElement.removeAttribute('data-tema')
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', o ? '#0F1F16' : '#0E5A33')
}
sincTema(); addEventListener('hashchange', sincTema)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
