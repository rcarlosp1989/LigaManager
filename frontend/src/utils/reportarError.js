// Avisa al servidor los errores de la pantalla (JavaScript), para que el administrador reciba un
// correo (ver Monitoreo/AvisoErrores.cs en el servidor). Solo en la versión publicada.
//
// Límites para no molestar: cada error distinto se avisa una vez por carga de página y, en total,
// como máximo 5 por carga. Se ignoran los errores de extensiones del navegador y el ruido conocido.

import { leerToken } from './sesion'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const enviados = new Set()
let total = 0

const RUIDO = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,                 // errores de otros sitios: el navegador oculta el detalle
  /Loading chunk \d+ failed/i,          // versión nueva publicada: se resuelve al recargar
  /Failed to fetch dynamically imported module/i,
  /NetworkError|Network Error|Failed to fetch|Load failed/i, // sin señal: no es un error de la app
  /AbortError/i,
]

export function reportarError(error, extra = {}) {
  try {
    if (!import.meta.env.PROD) return
    const mensaje = String(error?.message ?? error ?? '').slice(0, 500)
    if (!mensaje || RUIDO.some(re => re.test(mensaje))) return
    const clave = mensaje + '|' + location.pathname
    if (enviados.has(clave) || total >= 5) return
    enviados.add(clave); total++

    const cuerpo = JSON.stringify({
      mensaje,
      pila: String(extra.pila ?? error?.stack ?? '').slice(0, 4000),
      ruta: location.pathname,                       // sin la consulta: puede llevar tokens
      navegador: navigator.userAgent.slice(0, 250),
      version: import.meta.env.VITE_VERSION ?? '',
    })
    const encabezados = { 'Content-Type': 'application/json' }
    let t = null
    try { t = leerToken() } catch { /* sin almacenamiento */ }
    if (t) encabezados.Authorization = `Bearer ${t}`
    fetch(`${API}/errores-pantalla`, { method: 'POST', headers: encabezados, body: cuerpo, keepalive: true }).catch(() => {})
  } catch {
    // Avisar nunca debe romper la pantalla.
  }
}

export function instalarReporteErrores() {
  window.addEventListener('error', (e) => {
    // Solo errores de nuestros propios archivos (no de extensiones ni de otros sitios).
    if (e.filename && !e.filename.startsWith(location.origin)) return
    reportarError(e.error ?? e.message)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    // Las respuestas del servidor (4xx/5xx) ya las maneja cada pantalla; el 500 lo avisa el servidor.
    if (r?.isAxiosError || r?.response) return
    reportarError(r)
  })
}
