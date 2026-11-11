// Validación de formularios con mensajes propios, en español y siempre con el mismo aspecto.
//
// Los campos siguen usando los atributos del navegador (required, type="email", minLength, min,
// max…), pero en lugar de la burbuja nativa (que cambia según el navegador y su idioma) se
// muestra un mensaje en rojo debajo del campo, el campo queda marcado (aria-invalid) y un lector
// de pantalla lo anuncia. Al corregirlo, el mensaje desaparece.
//
// Funciona para todos los formularios a la vez: se instala una sola vez en main.jsx.

function mensajeDe(el) {
  const v = el.validity
  if (v.valueMissing) {
    if (el.type === 'checkbox') return 'Marque esta casilla para continuar.'
    if (el.type === 'radio' || el.tagName === 'SELECT') return 'Elija una opción.'
    if (el.type === 'file') return 'Elija un archivo.'
    if (el.type === 'date' || el.type === 'datetime-local') return 'Indique la fecha.'
    return 'Complete este campo.'
  }
  if (v.typeMismatch) return el.type === 'email' ? 'Escriba un correo válido, por ejemplo nombre@correo.com.' : 'Revise el formato.'
  if (v.tooShort) return `Escriba al menos ${el.minLength} caracteres.`
  if (v.tooLong) return `Escriba como máximo ${el.maxLength} caracteres.`
  if (v.rangeUnderflow) return `El valor mínimo es ${el.min}.`
  if (v.rangeOverflow) return `El valor máximo es ${el.max}.`
  if (v.patternMismatch) return el.title || 'Revise el formato.'
  return el.validationMessage || 'Revise este campo.'
}

// El mensaje va en el contenedor del campo (la caja que agrupa etiqueta y campo).
const contenedorDe = (el) => (el.type === 'checkbox' || el.type === 'radio' ? el.closest('label')?.parentElement : el.parentElement)

let anunciador = null
function anunciar(texto) {
  if (!anunciador) {
    anunciador = document.createElement('div')
    anunciador.setAttribute('role', 'alert')
    anunciador.className = 'sr-only'
    document.body.appendChild(anunciador)
  }
  anunciador.textContent = ''
  setTimeout(() => { anunciador.textContent = texto }, 50)
}

function etiquetaDe(el) {
  const l = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : el.closest('label')
  return (l?.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')
}

function limpiar(el) {
  if (!el.hasAttribute('data-invalido')) return
  el.removeAttribute('data-invalido')
  el.removeAttribute('aria-invalid')
  contenedorDe(el)?.removeAttribute('data-error')
}

export function instalarValidacion() {
  let primero = null
  // El navegador lanza «invalid» en cada campo con problema al intentar enviar: se evita la
  // burbuja nativa y se muestra el mensaje propio. El envío sigue bloqueado.
  document.addEventListener('invalid', (e) => {
    const el = e.target
    if (!(el instanceof HTMLElement) || !el.form) return
    e.preventDefault()
    const mensaje = mensajeDe(el)
    el.setAttribute('aria-invalid', 'true')
    el.setAttribute('data-invalido', '')
    // Un campo que ya muestra su propio mensaje (data-mensaje-propio) no lleva un segundo.
    if (!el.hasAttribute('data-mensaje-propio')) contenedorDe(el)?.setAttribute('data-error', mensaje)
    if (!primero) {
      primero = el
      // Después de que el navegador revisó todos los campos: foco y aviso solo del primero.
      setTimeout(() => {
        primero.focus({ preventScroll: false })
        const nombre = etiquetaDe(primero)
        anunciar(nombre ? `${nombre}: ${mensajeDe(primero)}` : mensajeDe(primero))
        primero = null
      }, 0)
    }
  }, true)
  const alCambiar = (e) => {
    const el = e.target
    if (el instanceof HTMLElement && el.validity?.valid) limpiar(el)
  }
  document.addEventListener('input', alCambiar, true)
  document.addEventListener('change', alCambiar, true)
}
