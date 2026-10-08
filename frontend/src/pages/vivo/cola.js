import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../services/api'
import { mensajeDeError } from '../../feedback/contextos'
import { leerLocal, guardarLocal } from './almacen'

// Cola de envío del modo en vivo. Cada gol, tarjeta o cambio se guarda primero en el
// dispositivo y después se envía, en orden. Si no hay señal, espera y reintenta.
//
// Para no registrar dos veces lo mismo: si un envío quedó sin respuesta (pudo haber
// llegado al servidor), antes de reenviarlo se consulta el partido y se busca un registro
// igual que no existía cuando se anotó. Si está, se da por enviado.
//
// item: { uid, clase: 'evento' | 'cambio', lado, datos, conocidos: [ids], incierto }

const clave = (idPartido) => `vivo.cola.${idPartido}`
const VACIA = { items: [], rechazados: [] }
const REINTENTO_MS = 15000

const idDe = (clase, x) => (clase === 'evento' ? x.idEvento : x.idCambio)
const listaDe = (clase, partido) => (clase === 'evento' ? partido?.eventos : partido?.cambios) ?? []
function coincide(item, x) {
  const d = item.datos
  return item.clase === 'evento'
    ? x.idJugador === d.idJugador && x.tipoEvento === d.tipoEvento && x.minuto === d.minuto
    : x.idJugadorSale === d.idJugadorSale && x.idJugadorEntra === d.idJugadorEntra && x.minuto === d.minuto
}
// El registro nuevo que corresponde a este item: igual en datos y que no existía al anotarlo.
function creadoEn(item, partido) {
  return listaDe(item.clase, partido)
    .filter(x => !item.conocidos.includes(idDe(item.clase, x)) && coincide(item, x))
    .sort((a, b) => idDe(item.clase, b) - idDe(item.clase, a))[0] ?? null
}

export function nuevoUid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// obtenerPartido: lee el partido del servidor. alConfirmar(item, idCreado, partido) y
// alRechazar(item, mensaje) avisan a la pantalla.
export function useCola(idPartido, { obtenerPartido, alConfirmar, alRechazar }) {
  const [estado, setEstado] = useState(() => ({ ...VACIA, ...leerLocal(clave(idPartido), {}) }))
  const [enviando, setEnviando] = useState(false)
  const [sinConexion, setSinConexion] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const actual = useRef(estado)
  const procesando = useRef(false)
  const avisos = useRef({ obtenerPartido, alConfirmar, alRechazar })
  useEffect(() => { avisos.current = { obtenerPartido, alConfirmar, alRechazar } })

  const escribir = useCallback((cambio) => {
    const nuevo = cambio(actual.current)
    actual.current = nuevo
    guardarLocal(clave(idPartido), nuevo.items.length || nuevo.rechazados.length ? nuevo : null)
    setEstado(nuevo)
  }, [idPartido])

  const procesar = useCallback(async () => {
    if (procesando.current) return
    procesando.current = true
    setEnviando(true)
    try {
      while (actual.current.items.length > 0) {
        const item = actual.current.items[0]
        let partido = null
        let creado = null
        try {
          if (item.incierto) {
            partido = await avisos.current.obtenerPartido()
            creado = creadoEn(item, partido)
          }
          if (!creado) {
            const url = `/partidos/${idPartido}/${item.clase === 'evento' ? 'eventos' : 'cambios'}`
            partido = (await api.post(url, item.datos)).data
            creado = creadoEn(item, partido)
          }
        } catch (err) {
          const status = err?.response?.status
          if (status >= 400 && status < 500) {
            // El servidor lo rechazó: no se reintenta. Queda a la vista para revisarlo.
            const mensaje = mensajeDeError(err, 'El servidor rechazó el registro.')
            escribir(e => ({ items: e.items.slice(1), rechazados: [...e.rechazados, { ...item, error: mensaje }] }))
            avisos.current.alRechazar?.(item, mensaje)
            continue
          }
          // Sin respuesta o error del servidor: pudo haber llegado. Se revisa antes de reenviar.
          escribir(e => ({ ...e, items: e.items.map((x, i) => (i === 0 ? { ...x, incierto: true } : x)) }))
          setSinConexion(!err?.response)
          break
        }
        setSinConexion(false)
        const idCreado = creado ? idDe(item.clase, creado) : null
        escribir(e => ({
          ...e,
          items: e.items.slice(1).map(x => (idCreado ? { ...x, conocidos: [...x.conocidos, idCreado] } : x)),
        }))
        avisos.current.alConfirmar?.(item, idCreado, partido)
      }
    } finally {
      procesando.current = false
      setEnviando(false)
    }
  }, [idPartido, escribir])

  // Envía al abrir, al volver la señal y, mientras quede algo, cada 15 segundos.
  useEffect(() => {
    procesar()
    const enLinea = () => { setSinConexion(false); procesar() }
    const fueraDeLinea = () => setSinConexion(true)
    window.addEventListener('online', enLinea)
    window.addEventListener('offline', fueraDeLinea)
    return () => {
      window.removeEventListener('online', enLinea)
      window.removeEventListener('offline', fueraDeLinea)
    }
  }, [procesar])

  const hayPendientes = estado.items.length > 0
  useEffect(() => {
    if (!hayPendientes) return
    const id = setInterval(procesar, REINTENTO_MS)
    return () => clearInterval(id)
  }, [hayPendientes, procesar])

  const agregar = useCallback((item) => {
    escribir(e => ({ ...e, items: [...e.items, { incierto: false, ...item }] }))
    procesar()
  }, [escribir, procesar])

  // Quita un pendiente que todavía no salió. Si ya se está enviando, no se puede.
  const quitar = useCallback((uid) => {
    const i = actual.current.items.findIndex(x => x.uid === uid)
    if (i === -1) return 'no-esta'
    const item = actual.current.items[i]
    if (item.incierto || (i === 0 && procesando.current)) return 'enviando'
    escribir(e => ({ ...e, items: e.items.filter(x => x.uid !== uid) }))
    return 'quitado'
  }, [escribir])

  const descartarRechazado = useCallback((uid) => {
    escribir(e => ({ ...e, rechazados: e.rechazados.filter(x => x.uid !== uid) }))
  }, [escribir])

  return {
    items: estado.items,
    rechazados: estado.rechazados,
    enviando,
    sinConexion,
    agregar,
    quitar,
    descartarRechazado,
    reintentar: procesar,
  }
}
