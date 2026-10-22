import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'
import { guardarSesion as guardar, leerUsuario, limpiarSesion } from '../utils/sesion'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Si la sesión guardada venció, leerUsuario la borra y devuelve null: la app lleva al login.
  const [user, setUser] = useState(() => {
    const u = leerUsuario()
    return u ? { nombre: u.nombre, rol: u.rol } : null
  })

  // recordarme: la sesión sigue al cerrar el navegador. Las invitaciones (vocal, dirigente) la recuerdan.
  const iniciarSesion = useCallback((data, recordarme = true) => {
    const u = guardar(data, recordarme)
    setUser({ nombre: u.nombre, rol: u.rol })
    return data
  }, [])

  const login = useCallback(async (email, password, recordarme = false) => {
    const { data } = await api.post('/auth/login', { email, password, recordarme })
    return iniciarSesion(data, recordarme)
  }, [iniciarSesion])

  // Con servicio de correo, la cuenta queda pendiente de confirmar: devuelve { confirmarCorreo, email }.
  const register = useCallback(async (nombre, email, password, aceptaTerminos = false) => {
    const { data } = await api.post('/auth/register', { nombre, email, password, aceptaTerminos })
    if (data.confirmarCorreo) return data
    return iniciarSesion(data, false)
  }, [iniciarSesion])

  const logout = useCallback(() => {
    limpiarSesion()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, iniciarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
