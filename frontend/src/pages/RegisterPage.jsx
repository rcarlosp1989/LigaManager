import { useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const emailValido = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)

export default function RegisterPage() {
  const fid = useId()
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form,    setForm]    = useState({ nombre: '', email: '', password: '', confirmar: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim())          return setError('El nombre es obligatorio.')
    if (!emailValido(form.email))     return setError('Ingresa un email válido.')
    if (form.password.length < 6)     return setError('La contraseña debe tener al menos 6 caracteres.')
    if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden.')

    setLoading(true)
    try {
      await register(form.nombre.trim(), form.email.trim(), form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse.')
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
          <h2 className="text-white font-semibold text-lg mb-6">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor={`${fid}-c1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre</label>
              <input id={`${fid}-c1`} className="input-field" placeholder="Tu nombre" value={form.nombre}
                onChange={e => set('nombre', e.target.value)} maxLength={100} required autoFocus />
            </div>
            <div>
              <label htmlFor={`${fid}-c2`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Correo electrónico</label>
              <input id={`${fid}-c2`} type="email" className="input-field" placeholder="tucorreo@ejemplo.com" value={form.email}
                onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label htmlFor={`${fid}-c3`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Contraseña</label>
              <input id={`${fid}-c3`} type="password" className="input-field" placeholder="Mínimo 6 caracteres" value={form.password}
                onChange={e => set('password', e.target.value)} required />
            </div>
            <div>
              <label htmlFor={`${fid}-c4`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
              <input id={`${fid}-c4`} type="password" className="input-field" placeholder="Repite la contraseña" value={form.confirmar}
                onChange={e => set('confirmar', e.target.value)} required />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400
                              rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? 'Creando cuenta...' : 'Registrarme'}
            </button>
          </form>

          <p className="text-gray-500 text-sm text-center mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
