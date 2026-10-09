import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { formatearFecha } from '../utils/fechas'

// Muestra un código de invitación recién creado, con su enlace para copiar o compartir.
// El servidor no lo vuelve a mostrar: solo guarda su huella.
export default function InvitacionCreada({ invitacion, campeonato }) {
  const [copiado, setCopiado] = useState(null)
  const enlace = `${window.location.origin}/invitacion/${invitacion.codigo}`
  const titular = invitacion.tipo === 'Titular'
  const mensaje = titular
    ? `Te invito como vocal del campeonato «${campeonato}» en LigaManager. Abre este enlace para crear tu cuenta: ${enlace} (código ${invitacion.codigo}).`
    : `Te pido reemplazarme como vocal del campeonato «${campeonato}» el ${formatearFecha(invitacion.soloFecha)}. Abre este enlace: ${enlace} (código ${invitacion.codigo}).`

  const copiar = async (texto, cual) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(cual)
      setTimeout(() => setCopiado(null), 2000)
    } catch {
      setCopiado('error')
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-700 bg-brand-900/30 p-4">
      <p className="text-sm text-white">
        {titular ? 'Invitación de vocal titular' : `Invitación de reemplazo para el ${formatearFecha(invitacion.soloFecha)}`}.
        Sirve una sola vez y vence el {formatearFecha(invitacion.venceEn)}.
      </p>
      <p className="text-center font-mono text-2xl tracking-[0.2em] text-white select-all" aria-label={`Código ${invitacion.codigo.split('').join(' ')}`}>
        {invitacion.codigo}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => copiar(invitacion.codigo, 'codigo')} className="btn-secundario inline-flex items-center justify-center gap-2 text-sm">
          {copiado === 'codigo' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copiado === 'codigo' ? 'Copiado' : 'Copiar código'}
        </button>
        <button type="button" onClick={() => copiar(enlace, 'enlace')} className="btn-secundario inline-flex items-center justify-center gap-2 text-sm">
          {copiado === 'enlace' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copiado === 'enlace' ? 'Copiado' : 'Copiar enlace'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer"
          className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
          <Share2 size={16} aria-hidden="true" /> WhatsApp
        </a>
      </div>
      {copiado === 'error' && <p role="alert" className="text-sm text-amber-300">No se pudo copiar. Mantén presionado el código para copiarlo a mano.</p>}
      <p className="text-xs text-gray-400">Guárdalo ahora: por seguridad no se vuelve a mostrar. Si se pierde, crea otra invitación.</p>
    </div>
  )
}
