import { useCallback, useEffect, useState } from 'react'
import { leerLocal, guardarLocal } from './almacen'

// Reloj del partido. Vive en el dispositivo y se guarda en cada cambio, así que
// sobrevive a una recarga: lo que se guarda es la hora de inicio, no un contador.
//
// fase: 'antes' | '1T' | 'descanso' | '2T' | 'final'
// En cada tiempo, `acumulado` son los ms jugados antes de la última pausa y
// `desde` la hora (Date.now) en que se reanudó; null si está en pausa.

const INICIAL = { fase: 'antes', duracion: 45, acumulado: 0, desde: null }
const clave = (idPartido) => `vivo.reloj.${idPartido}`

export function msJugados(reloj, ahora = Date.now()) {
  return reloj.acumulado + (reloj.desde ? ahora - reloj.desde : 0)
}

// Minuto para registrar un evento (1 a 120, el rango que acepta el servidor).
// El tiempo añadido se registra en el último minuto reglamentario: 45+2 se guarda como 45.
export function minutoDelReloj(reloj, ahora = Date.now()) {
  const d = reloj.duracion
  const transcurrido = Math.floor(msJugados(reloj, ahora) / 60000) + 1
  let minuto
  switch (reloj.fase) {
    case 'antes':    minuto = 1; break
    case '1T':       minuto = Math.min(transcurrido, d); break
    case 'descanso': minuto = d; break
    case '2T':       minuto = d + Math.min(transcurrido, d); break
    default:         minuto = 2 * d
  }
  return Math.max(1, Math.min(120, minuto))
}

// Texto del reloj: «23:41», o «45:00 +2» en tiempo añadido.
export function textoDelReloj(reloj, ahora = Date.now()) {
  if (reloj.fase === 'antes') return '00:00'
  if (reloj.fase === 'descanso') return 'Descanso'
  if (reloj.fase === 'final') return 'Final'
  const ms = msJugados(reloj, ahora)
  const limite = reloj.duracion * 60000
  const base = reloj.fase === '2T' ? reloj.duracion : 0
  const mmss = (t) => {
    const s = Math.floor(t / 1000)
    return `${String(Math.floor(s / 60) + base).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }
  if (ms <= limite) return mmss(ms)
  return `${mmss(limite)} +${Math.floor((ms - limite) / 60000) + 1}`
}

export const NOMBRE_FASE = {
  antes: 'Sin iniciar', '1T': '1.er tiempo', descanso: 'Descanso', '2T': '2.º tiempo', final: 'Terminado',
}

export function useReloj(idPartido) {
  const [reloj, setRelojEstado] = useState(() => ({ ...INICIAL, ...leerLocal(clave(idPartido), {}) }))
  const [ahora, setAhora] = useState(() => Date.now())

  const setReloj = useCallback((cambio) => {
    setRelojEstado(actual => {
      const nuevo = typeof cambio === 'function' ? cambio(actual) : { ...actual, ...cambio }
      guardarLocal(clave(idPartido), nuevo)
      return nuevo
    })
  }, [idPartido])

  // Mientras corre, se redibuja cada segundo.
  useEffect(() => {
    if (!reloj.desde) return
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [reloj.desde])

  const corriendo = !!reloj.desde
  const acciones = {
    iniciar:   () => setReloj(r => ({ ...r, fase: r.fase === 'descanso' ? '2T' : '1T', acumulado: 0, desde: Date.now() })),
    pausar:    () => setReloj(r => ({ ...r, acumulado: msJugados(r), desde: null })),
    reanudar:  () => setReloj(r => ({ ...r, desde: Date.now() })),
    terminarTiempo: () => setReloj(r => ({ ...r, fase: r.fase === '1T' ? 'descanso' : 'final', acumulado: msJugados(r), desde: null })),
    finalizar: () => setReloj(r => ({ ...r, fase: 'final', acumulado: msJugados(r), desde: null })),
    reiniciar: () => setReloj(r => ({ ...INICIAL, duracion: r.duracion })),
    duracion:  (minutos) => setReloj(r => ({ ...r, duracion: minutos })),
  }

  return {
    reloj, corriendo, acciones,
    minuto: minutoDelReloj(reloj, ahora),
    texto: textoDelReloj(reloj, ahora),
    // El minuto exacto se calcula al momento de usarlo, no en el último redibujo.
    minutoAhora: () => minutoDelReloj(reloj, Date.now()),
  }
}
