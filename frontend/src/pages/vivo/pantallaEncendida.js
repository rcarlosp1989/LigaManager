import { useEffect, useState } from 'react'

// Pide al navegador que no apague la pantalla mientras esta vista está abierta.
// El permiso se pierde al cambiar de app o bloquear el celular, así que se vuelve a
// pedir cada vez que la pestaña vuelve a estar visible.
// Devuelve 'activa', 'no-disponible' (el navegador no lo permite) o 'inactiva'.
export function usePantallaEncendida() {
  const disponible = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [estado, setEstado] = useState(disponible ? 'inactiva' : 'no-disponible')

  useEffect(() => {
    if (!disponible) return
    let bloqueo = null
    let vigente = true

    const pedir = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        bloqueo = await navigator.wakeLock.request('screen')
        if (!vigente) { bloqueo.release(); return }
        setEstado('activa')
        bloqueo.addEventListener('release', () => { if (vigente) setEstado('inactiva') })
      } catch {
        if (vigente) setEstado('inactiva')
      }
    }

    pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => {
      vigente = false
      document.removeEventListener('visibilitychange', pedir)
      bloqueo?.release().catch(() => {})
    }
  }, [disponible])

  return estado
}
