import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { waLink, MENSAJE_LINKS } from './whatsapp.js'

// Botón fijo abajo a la izquierda (el asistente de voz vive abajo a la derecha).
// Camila lo nombra al cerrar el pedido: "toque el botón verde de WhatsApp".
//
// En el celular la ventana del asistente ocupa toda la pantalla y tapaba el botón. Dos defensas:
// 1. El botón vive en la "capa superior" del navegador (popover manual), por encima de cualquier z-index.
// 2. Donde no hay popover, se apoya en el orden del DOM: el asistente se inserta al final del body
//    cuando carga y empata en z-index, así que el botón se vuelve a poner al final cada vez que
//    aparece algo después de él.
export default function WhatsAppLinks() {
  const ref = useRef(null)
  const [host, setHost] = useState(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.className = 'wa-host'
    document.body.appendChild(el)
    setHost(el)
    const show = () => {
      const a = ref.current
      if (!a || typeof a.showPopover !== 'function') return
      try { if (!a.matches(':popover-open')) a.showPopover() } catch { /* sin soporte */ }
    }
    const keepLast = () => {
      if (document.body.lastElementChild !== el) { document.body.appendChild(el); show() }
    }
    const mo = new MutationObserver(keepLast)
    mo.observe(document.body, { childList: true })
    const t = setInterval(show, 800)
    return () => { mo.disconnect(); clearInterval(t); el.remove() }
  }, [])

  if (!host) return null
  return createPortal(
    <a ref={ref} popover="manual" className="wa-links" href={waLink(MENSAJE_LINKS)} target="_blank" rel="noopener noreferrer"
      aria-label="Recibir mis links de pago y seguimiento por WhatsApp">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
        <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8zm-3.1 4.4c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.2 5 4.4 2.5 1 3 .8 3.5.7.5 0 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4l-.5-.3-2-1c-.3 0-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.3z"/>
      </svg>
      <span>Mis links por WhatsApp</span>
    </a>,
    host,
  )
}

// Franja en el flujo normal de la página, debajo de la barra de modalidad: no depende de capas
// flotantes ni del asistente, así que se ve en cualquier celular en cuanto se cierra la ventana de Camila.
export function WhatsAppBanner() {
  return (
    <a className="wa-banner" href={waLink(MENSAJE_LINKS)} target="_blank" rel="noopener noreferrer">
      <span>¿Ya pediste por voz con Camila?</span>
      <b>Recibe tus links de pago y seguimiento por WhatsApp →</b>
    </a>
  )
}
