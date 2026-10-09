import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('lm_user')
    return stored ? JSON.parse(stored) : null
  })

  const guardarSesion = useCallback((data) => {
    localStorage.setItem('lm_token', data.token)
    localStorage.setItem('lm_user', JSON.stringify({
      nombre: data.nombre,
      rol:    data.rol,
    }))
    setUser({ nombre: data.nombre, rol: data.rol })
    return data
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    return guardarSesion(data)
  }, [guardarSesion])

  const register = useCallback(async (nombre, email, password) => {
    const { data } = await api.post('/auth/register', { nombre, email, password })
    return guardarSesion(data)
  }, [guardarSesion])

  const logout = useCallback(() => {
    localStorage.removeItem('lm_token')
    localStorage.removeItem('lm_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, iniciarSesion: guardarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)