import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-900/20
                        rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-800/10
                        rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-widest">
            LIGA<span className="text-brand-500">MANAGER</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2 tracking-wider uppercase">
            Sistema de Gestión de Campeonatos
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8
                        shadow-2xl shadow-black/50">
          <h2 className="text-white font-semibold text-lg mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="admin@ligamanager.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400
                              rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-gray-500 text-sm text-center mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  )
}