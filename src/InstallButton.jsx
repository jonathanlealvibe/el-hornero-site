import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferred, setDeferred] = useState(null)
  const [ios, setIos] = useState(false)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) setIos(true)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])
  if (!deferred && !ios) return null
  const install = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; setDeferred(null) }
  return (
    <div className="install-bar">
      {deferred
        ? <><span>Lleva El Hornero en tu celular.</span><button type="button" className="btn-install" onClick={install}>Instalar app</button></>
        : <span>Para instalar en iPhone: toca <b>Compartir</b> y luego <b>“Agregar a pantalla de inicio”</b>.</span>}
    </div>
  )
}
