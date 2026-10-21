import { useId, useState } from 'react'
import api from '../../services/api'
import { mensajeDeError } from '../../feedback/contextos'
import PantallaCuenta from './PantallaCuenta'

// «¿Olvidaste tu contraseña?»: pide el correo y responde siempre igual (no revela si existe).
export default function OlvideClave() {
  const fid = useId()
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(null)
  const [error, setError] = useState('')

  const enviar = async (e) => {
    e.preventDefault()
    setError(''); setEnviando(true)
    try {
      const { data } = await api.post('/auth/olvide-clave', { email: email.trim() })
      setListo(data.mensaje)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo enviar. Inténtalo en un momento.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PantallaCuenta titulo="Restablecer contraseña">
      {listo ? (
        <div role="status" className="space-y-3 text-sm text-gray-300">
          <p>{listo}</p>
          <p className="text-gray-500">El enlace vale 1 hora. Si no llega, revisa que el correo esté bien escrito.</p>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-gray-400">Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.</p>
          <div>
            <label htmlFor={`${fid}-email`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Correo electrónico</label>
            <input id={`${fid}-email`} type="email" required autoComplete="email" className="input-field"
              value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={enviando} className="btn-primary w-full py-3">{enviando ? 'Enviando...' : 'Enviar enlace'}</button>
        </form>
      )}
    </PantallaCuenta>
  )
}
