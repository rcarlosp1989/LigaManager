import { useEffect } from 'react'

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Mientras una ventana está abierta: lleva el foco adentro, lo mantiene ahí con Tab
// y lo devuelve al elemento que la abrió cuando se cierra.
// enfocarContenedor: el foco empieza en la ventana misma (no abre el teclado del celular).
export function useAtraparFoco(ref, { enfocarPrimero, enfocarContenedor = false } = {}) {
  useEffect(() => {
    const contenedor = ref.current
    if (!contenedor) return
    const anterior = document.activeElement

    const inicial = (enfocarPrimero && contenedor.querySelector(enfocarPrimero))
      || contenedor.querySelector('[data-autofoco]')
      || (enfocarContenedor ? contenedor : contenedor.querySelector(ENFOCABLES))
      || contenedor
    inicial.focus({ preventScroll: true })

    const alPresionarTecla = (e) => {
      if (e.key !== 'Tab') return
      const elementos = [...contenedor.querySelectorAll(ENFOCABLES)].filter(el => el.offsetParent !== null)
      if (elementos.length === 0) return
      const primero = elementos[0]
      const ultimo  = elementos[elementos.length - 1]
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }
    contenedor.addEventListener('keydown', alPresionarTecla)
    return () => {
      contenedor.removeEventListener('keydown', alPresionarTecla)
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) anterior.focus({ preventScroll: true })
    }
  }, [ref, enfocarPrimero, enfocarContenedor])
}
