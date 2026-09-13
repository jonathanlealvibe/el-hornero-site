import { useSyncExternalStore } from 'react'
import * as S from './store.js'

// La versión del store cambia con cada escritura o refresco; las pantallas
// recalculan solo entonces, en el mismo frame.
export function useVersion() {
  return useSyncExternalStore(S.suscribir, S.getVersion, S.getVersion)
}
