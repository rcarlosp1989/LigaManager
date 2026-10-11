import api from '../services/api'

// El servidor guarda fotos y logos como ruta propia («/api/imagenes/…»), servida por el
// backend, no por el frontend. Se arma la dirección completa a partir de la de la API.
export function urlFoto(fotoUrl) {
  if (!fotoUrl) return null
  if (/^(https?:|blob:|data:)/i.test(fotoUrl)) return fotoUrl
  try {
    const base = new URL(api.defaults.baseURL, window.location.origin)
    return new URL(fotoUrl, base.origin).href
  } catch {
    return fotoUrl
  }
}
