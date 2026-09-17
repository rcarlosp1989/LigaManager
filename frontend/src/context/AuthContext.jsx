import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('lm_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('lm_token', data.token)
    localStorage.setItem('lm_user', JSON.stringify({
      nombre: data.nombre,
      rol:    data.rol,
    }))
    setUser({ nombre: data.nombre, rol: data.rol })
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('lm_token')
    localStorage.removeItem('lm_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)