import { useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import ReenviarConfirmacion from './cuenta/ReenviarConfirmacion'
import { useAuth } from '../context/AuthContext'
import { inicioDeRol } from '../utils/roles'

export default function LoginPage() {
  const fid = useId()
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '', recordarme: false })
  const [error,   setError]   = useState('')
  const [sinConfirmar, setSinConfirmar] = useState(null)   // correo de una cuenta sin confirmar
  // Restablecer la contraseña solo si el servidor tiene servicio de correo.
  const opciones = useQuery({ queryKey: ['auth-opciones'], queryFn: () => api.get('/auth/opciones').then(r => r.data), staleTime: Infinity, retry: false })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSinConfirmar(null)
    setLoading(true)
    try {
      const sesion = await login(form.email, form.password, form.recordarme)
      // El vocal entra directo a sus partidos y el dirigente a su campeonato, sin el menú de administración.
      navigate(inicioDeRol(sesion?.rol))
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.')
      if (err.response?.data?.codigo === 'CORREO_SIN_CONFIRMAR') setSinConfirmar(form.email.trim())
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
              <label htmlFor={`${fid}-c1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                Correo electrónico
              </label>
              <input id={`${fid}-c1`}
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
              <label htmlFor={`${fid}-c2`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input id={`${fid}-c2`}
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
              {opciones.data?.correo && (
                <p className="mt-2 text-right text-sm">
                  <Link to="/olvide-clave" className="text-brand-400 hover:text-brand-300">¿Olvidó su contraseña?</Link>
                </p>
              )}
            </div>

            <label htmlFor={`${fid}-recordarme`} className="flex items-start gap-3 text-sm text-gray-300">
              <input id={`${fid}-recordarme`} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-teal-500"
                checked={form.recordarme} onChange={e => setForm(f => ({ ...f, recordarme: e.target.checked }))} />
              <span>
                Recordarme en este dispositivo
                <span className="block text-xs text-gray-500">La sesión sigue abierta 7 días. Sin marcar, se cierra al cerrar el navegador.</span>
              </span>
            </label>

            {error && (
              <div role="alert" className="bg-red-900/30 border border-red-800 text-red-400
                              rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}
            {sinConfirmar && <ReenviarConfirmacion email={sinConfirmar} esperaInicial={0} />}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-gray-500 text-sm text-center mt-6">
            ¿No tiene una cuenta?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300">Regístrate</Link>
          </p>
          <p className="text-gray-500 text-sm text-center mt-2">
            ¿Es vocal y tiene un código?{' '}
            <Link to="/invitacion" className="text-brand-400 hover:text-brand-300">Úselo aquí</Link>
          </p>
          <p className="text-gray-600 text-xs text-center mt-4">
            <Link to="/privacidad" className="hover:text-gray-400">Aviso de privacidad</Link>{' · '}
            <Link to="/terminos" className="hover:text-gray-400">Términos de uso</Link>
          </p>
        </div>
      </div>
    </div>
  )
}