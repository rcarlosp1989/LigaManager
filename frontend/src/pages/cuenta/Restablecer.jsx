import { useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { mensajeDeError } from '../../feedback/contextos'
import { inicioDeRol } from '../../utils/roles'
import PantallaCuenta from './PantallaCuenta'

// Enlace del correo /restablecer/{código}: elegir la contraseña nueva. Al guardarla se cierran
// las demás sesiones de la cuenta y se entra directo.
export default function Restablecer() {
  const fid = useId()
  const { token } = useParams()
  const navigate = useNavigate()
  const { iniciarSesion } = useAuth()
  const [form, setForm] = useState({ password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const q = useQuery({
    queryKey: ['restablecer', token],
    queryFn: () => api.get(`/auth/restablecer/${encodeURIComponent(token)}`).then(r => r.data),
    retry: false,
  })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden.')
    setEnviando(true)
    try {
      const { data } = await api.post('/auth/restablecer', { token, password: form.password })
      iniciarSesion(data, false)
      navigate(inicioDeRol(data.rol), { replace: true })
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la contraseña.'))
    } finally {
      setEnviando(false)
    }
  }

  if (q.isLoading) return <PantallaCuenta titulo="Restablecer contraseña"><p className="text-gray-400 text-sm">Revisando el enlace...</p></PantallaCuenta>
  if (q.isError) {
    return (
      <PantallaCuenta titulo="Restablecer contraseña">
        <p role="alert" className="text-sm text-gray-200">{q.error?.response?.data?.motivo ?? 'El enlace no es válido.'}</p>
        <Link to="/olvide-clave" className="btn-primary mt-4 inline-flex w-full justify-center">Pedir un enlace nuevo</Link>
      </PantallaCuenta>
    )
  }

  return (
    <PantallaCuenta titulo="Elija su nueva contraseña">
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label htmlFor={`${fid}-p1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Contraseña nueva (mínimo 6 caracteres)</label>
          <input id={`${fid}-p1`} type="password" required autoComplete="new-password" className="input-field"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoFocus />
        </div>
        <div>
          <label htmlFor={`${fid}-p2`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Repita la contraseña</label>
          <input id={`${fid}-p2`} type="password" required autoComplete="new-password" className="input-field"
            value={form.confirmar} onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))} />
        </div>
        <p className="text-xs text-gray-500">Al guardarla se cierran las sesiones abiertas en otros dispositivos.</p>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={enviando} className="btn-primary w-full py-3">{enviando ? 'Guardando...' : 'Guardar y entrar'}</button>
      </form>
    </PantallaCuenta>
  )
}
