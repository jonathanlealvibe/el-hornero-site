// Pestaña "Automatizaciones": el constructor de workflows, dentro del panel.
// El lienzo se sirve desde el mismo Worker que guarda y ejecuta, así que aquí
// solo lo incrustamos. La llave del servidor se pega una vez dentro del lienzo
// y se queda en el navegador de quien la puso; nunca viaja en este código.
import { useState } from 'react'
import { T } from './i18n.js'

// Mismo origen a propósito: un iframe hacia otro dominio queda a merced de la
// configuración del navegador de quien mire el panel. Los archivos viven en
// public/flujos y se refrescan con `npm run sync:flujos`.
const CONSTRUCTOR = './flujos/index.html'
const CONSTRUCTOR_ABS = new URL('flujos/index.html', window.location.origin + window.location.pathname.replace(/[^/]*$/, '')).href

export function Automatizaciones() {
  const [falló, setFalló] = useState(false)

  return (
    <section className="tarjeta" style={{ display: 'flex', flexDirection: 'column', minHeight: '72vh' }}>
      <header className="tarjeta-cab">
        <div>
          <h2>{T('Automatizaciones', 'Automations')}</h2>
          <p className="sub">
            {T('Armá lo que quieras que pase solo: recuperar pedidos sin pagar, avisar al local, encuestas después de entregar. Pedíselo al asistente en español o armalo con los bloques.',
               'Build what should happen on its own: recover unpaid orders, notify the branch, post-delivery surveys. Ask the assistant in Spanish or drag the blocks yourself.')}
          </p>
        </div>
        <a className="btn-lin" href={CONSTRUCTOR_ABS} target="_blank" rel="noreferrer">
          {T('Abrir en otra pestaña', 'Open in a new tab')} ↗
        </a>
      </header>

      {falló ? (
        <div className="vacio" style={{ padding: 36, textAlign: 'center' }}>
          <p>{T('El constructor no se pudo mostrar aquí dentro.', 'The builder could not be shown inline.')}</p>
          <a className="btn-lin" href={CONSTRUCTOR_ABS} target="_blank" rel="noreferrer">
            {T('Abrirlo en otra pestaña', 'Open it in a new tab')} ↗
          </a>
        </div>
      ) : (
        <iframe
          title={T('Constructor de automatizaciones', 'Automation builder')}
          src={CONSTRUCTOR}
          onError={() => setFalló(true)}
          style={{ flex: 1, width: '100%', minHeight: '68vh', border: 0, borderRadius: 10, background: 'var(--fondo-2, #0e1116)' }}
        />
      )}
    </section>
  )
}
