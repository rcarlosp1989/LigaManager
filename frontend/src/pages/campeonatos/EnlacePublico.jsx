import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, Globe, Share2 } from 'lucide-react'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import { useAviso, useDialogos, mensajeDeError } from '../../feedback/contextos'

// Enlace público del campeonato: lo ve cualquiera, sin cuenta. Solo resultados, tablas y
// estadísticas (jugadores con nombre corto y sin fotos). El organizador lo crea, lo cambia o lo
// desactiva desde aquí.
export default function EnlacePublico({ camp }) {
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [copiado, setCopiado] = useState(false)
  const clave = ['enlace-publico', camp.idCampeonato]
  const ruta = `/campeonatos/${camp.idCampeonato}/enlace-publico`

  const q = useQuery({ queryKey: clave, queryFn: () => api.get(ruta).then(r => r.data) })
  const generar = useMutation({
    mutationFn: () => api.post(ruta).then(r => r.data),
    onSuccess: (d) => { queryClient.setQueryData(clave, d); setCopiado(false) },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo crear el enlace.')),
  })
  const desactivar = useMutation({
    mutationFn: () => api.delete(ruta),
    onSuccess: () => { queryClient.setQueryData(clave, { token: null }); aviso.exito('Enlace público desactivado.') },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo desactivar.')),
  })

  const token = q.data?.token
  const enlace = token ? `${window.location.origin}/publico/${token}` : ''
  const mensaje = `Sigue el campeonato «${camp.nombre}»: resultados, posiciones, goleadores y sanciones. ${enlace}`

  const copiar = async () => {
    try { await navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }
    catch { aviso.error('No se pudo copiar. Mantén presionado el enlace para copiarlo a mano.') }
  }
  const cambiar = async () => {
    const ok = await confirmar({
      titulo: '¿Cambiar el enlace público?',
      mensaje: 'Se crea un enlace nuevo y el actual deja de funcionar. Tendrás que compartir el nuevo.',
      textoConfirmar: 'Cambiar enlace',
    })
    if (ok) generar.mutate()
  }
  const apagar = async () => {
    const ok = await confirmar({
      titulo: '¿Desactivar el enlace público?',
      mensaje: 'Nadie podrá ver el campeonato con el enlace. Puedes crear uno nuevo cuando quieras.',
      textoConfirmar: 'Desactivar', peligro: true,
    })
    if (ok) desactivar.mutate()
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="mb-1 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500">
          <Globe size={14} className="text-brand-400" aria-hidden="true" /> Enlace público
        </h2>
        <p className="text-sm text-gray-400">Para todos, sin cuenta: resultados, tablas y sanciones. Sin nóminas ni fotos.</p>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : q.isError ? (
        <EstadoError compacto mensaje="No se pudo cargar el enlace público." onReintentar={q.refetch} reintentando={q.isFetching} />
      ) : !token ? (
        <button type="button" onClick={() => generar.mutate()} disabled={generar.isPending} className="btn-secundario">
          {generar.isPending ? 'Creando...' : 'Crear enlace público'}
        </button>
      ) : (
        <>
          <input readOnly value={enlace} aria-label="Enlace público" onFocus={e => e.target.select()}
            className="input-field font-mono text-xs" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" onClick={copiar} className="btn-secundario inline-flex items-center justify-center gap-2 text-sm">
              {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copiado ? 'Copiado' : 'Copiar enlace'}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer"
              className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
              <Share2 size={16} aria-hidden="true" /> WhatsApp
            </a>
            <a href={enlace} target="_blank" rel="noreferrer" className="btn-secundario inline-flex items-center justify-center gap-2 text-sm">
              <ExternalLink size={16} aria-hidden="true" /> Abrir
            </a>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <button type="button" onClick={cambiar} disabled={generar.isPending} className="py-1 text-sm text-gray-400 hover:text-white">Cambiar enlace</button>
            <button type="button" onClick={apagar} disabled={desactivar.isPending} className="py-1 text-sm text-gray-400 hover:text-red-400">Desactivar</button>
          </div>
        </>
      )}
    </div>
  )
}
