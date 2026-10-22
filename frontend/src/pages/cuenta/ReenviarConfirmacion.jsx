import { useEffect, useState } from 'react'
import api from '../../services/api'
import { mensajeDeError } from '../../feedback/contextos'

// Botón «Reenviar correo» de confirmación, con un minuto de espera entre envíos.
export default function ReenviarConfirmacion({ email, esperaInicial = 60 }) {
  const [espera, setEspera] = useState(esperaInicial)
  const [estado, setEstado] = useState(null)   // null | 'enviando' | { ok, texto }

  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera(e => e - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  const reenviar = async () => {
    setEstado('enviando')
    try {
      const { data } = await api.post('/auth/reenviar-confirmacion', { email })
      setEstado({ ok: true, texto: data.mensaje })
      setEspera(60)
    } catch (err) {
      setEstado({ ok: false, texto: mensajeDeError(err, 'No se pudo reenviar. Inténtalo en un momento.') })
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={reenviar} disabled={espera > 0 || estado === 'enviando'} className="btn-secundario w-full disabled:opacity-50">
        {estado === 'enviando' ? 'Enviando...' : espera > 0 ? `Reenviar correo (${espera} s)` : 'Reenviar correo'}
      </button>
      {estado && estado !== 'enviando' && (
        <p role="status" className={`text-xs ${estado.ok ? 'text-gray-400' : 'text-red-400'}`}>{estado.texto}</p>
      )}
    </div>
  )
}
