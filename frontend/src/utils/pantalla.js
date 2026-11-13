import { useSyncExternalStore } from 'react'

// true en pantallas de celular (menos de 640 px, el «sm» de Tailwind). Cambia al girar o
// redimensionar. Sirve para mostrar en el celular una vista distinta, no solo otro estilo.
const CONSULTA = '(max-width: 639.98px)'

function suscribir(avisar) {
  const mq = window.matchMedia(CONSULTA)
  mq.addEventListener('change', avisar)
  return () => mq.removeEventListener('change', avisar)
}

export function useEsCelular() {
  return useSyncExternalStore(suscribir, () => window.matchMedia(CONSULTA).matches, () => false)
}
