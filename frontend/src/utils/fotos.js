import api from '../services/api'

// El servidor guarda la foto como ruta propia («/uploads/jugadores/x.jpg»), servida por el
// backend, no por el frontend. Se arma la dirección completa a partir de la de la API.
export function urlFoto(fotoUrl) {
  if (!fotoUrl) return null
  if (/^https?:\/\//i.test(fotoUrl)) return fotoUrl
  try {
    const base = new URL(api.defaults.baseURL, window.location.origin)
    return new URL(fotoUrl, base.origin).href
  } catch {
    return fotoUrl
  }
}
