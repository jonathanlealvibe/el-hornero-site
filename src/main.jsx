import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'

// El tablero es oscuro; la tienda no. El fondo del <html> tiene que cambiar antes
// de que React pinte, o el rebote de iOS y la carga perezosa destellan en blanco.
import { aplicarTema } from './dash/i18n.js'
aplicarTema(); addEventListener('hashchange', aplicarTema)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
