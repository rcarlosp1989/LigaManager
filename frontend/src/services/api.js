import axios from 'axios'
import { leerToken, limpiarSesion } from '../utils/sesion'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

api.interceptors.request.use(config => {
  const token = leerToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    // Sesión vencida o cerrada (por ejemplo, porque se cambió la contraseña): al login.
    // No aplica a las pantallas públicas ni a las de la cuenta (login, restablecer…).
    if (err.response?.status === 401 && leerToken()) {
      limpiarSesion()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api