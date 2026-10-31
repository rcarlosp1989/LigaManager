import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, Globe, Megaphone, Share2 } from 'lucide-react'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import { useAviso, useDialogos, mensajeDeError } from '../../feedback/contextos'

// Enlaces del campeonato, se ven sin cuenta (jugadores con nombre corto y sin fotos):
//  - Enlace público, para los dirigentes: resultados, posiciones, goleadores, tarjetas y suspensiones.
//  - Enlace para aficionados, el que lleva el flyer: marcadores en vivo, resultados, posiciones y
//    goleadores; sin tarjetas ni suspensiones. Se crea junto con el público.
// El organizador los crea, los cambia o los desactiva desde aquí, cada uno por separado.
export default function EnlacePublico({ camp }) {
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const clave = ['enlace-publico', camp.idCampeonato]
  const base = `/campeonatos/${camp.idCampeonato}`

  const q = useQuery({ queryKey: clave, queryFn: () => api.get(`${base}/enlace-publico`).then(r => r.data) })
  const generar = useMutation({
    mutationFn: (ruta) => api.post(`${base}/${ruta}`).then(r => r.data),
    onSuccess: (d) => queryClient.setQueryData(clave, d),
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo crear el enlace.')),
  })
  const desactivar = useMutation({
    mutationFn: (ruta) => api.delete(`${base}/${ruta}`).then(() => ruta),
    onSuccess: (ruta) => {
      queryClient.setQueryData(clave, (d) => ({ ...d, [ruta === 'enlace-publico' ? 'token' : 'tokenAficionados']: null }))
      aviso.exito('Enlace desactivado.')
    },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo desactivar.')),
  })

  if (q.isLoading) return <p className="text-sm text-gray-500">Cargando...</p>
  if (q.isError) return <EstadoError compacto mensaje="No se pudo cargar el enlace público." onReintentar={q.refetch} reintentando={q.isFetching} />

  const ocupado = generar.isPending || desactivar.isPending
  return (
    <div className="space-y-6">
      <Enlace
        titulo="Enlace para dirigentes" Icono={Globe} etiqueta="Enlace para dirigentes"
        descripcion="Resultados, posiciones, goleadores, tarjetas y suspensiones. Compártalo solo con los dirigentes."
        textoCrear="Crear enlace para dirigentes"
        mensaje={(e) => `Campeonato «${camp.nombre}»: resultados, posiciones, goleadores, tarjetas y suspensiones. ${e}`}
        token={q.data?.token} ocupado={ocupado}
        onCrear={() => generar.mutate('enlace-publico')} onDesactivar={() => desactivar.mutate('enlace-publico')} />
      <Enlace
        titulo="Enlace para aficionados" Icono={Megaphone} etiqueta="Enlace para aficionados"
        descripcion="Marcadores en vivo, resultados, posiciones y goleadores, sin tarjetas ni suspensiones. Es el que lleva el flyer de la jornada."
        textoCrear="Crear enlace para aficionados"
        mensaje={(e) => `Siga el campeonato «${camp.nombre}»: marcadores en vivo, resultados, posiciones y goleadores. ${e}`}
        token={q.data?.tokenAficionados} ocupado={ocupado}
        onCrear={() => generar.mutate('enlace-aficionados')} onDesactivar={() => desactivar.mutate('enlace-aficionados')} />
    </div>
  )
}

function Enlace({ titulo, Icono, etiqueta, descripcion, textoCrear, mensaje, token, ocupado, onCrear, onDesactivar }) {
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [copiado, setCopiado] = useState(false)
  const enlace = token ? `${window.location.origin}/publico/${token}` : ''

  const copiar = async () => {
    try { await navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }
    catch { aviso.error('No se pudo copiar. Mantenga presionado el enlace para copiarlo manualmente.') }
  }
  const cambiar = async () => {
    const ok = await confirmar({
      titulo: `¿Cambiar el ${titulo.toLowerCase()}?`,
      mensaje: 'Se crea un enlace nuevo y el actual deja de funcionar. Deberá compartir el nuevo.',
      textoConfirmar: 'Cambiar enlace',
    })
    if (ok) onCrear()
  }
  const apagar = async () => {
    const ok = await confirmar({
      titulo: `¿Desactivar el ${titulo.toLowerCase()}?`,
      mensaje: 'Nadie podrá ver el campeonato con este enlace. Puede crear uno nuevo cuando lo necesite.',
      textoConfirmar: 'Desactivar', peligro: true,
    })
    if (ok) onDesactivar()
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="mb-1 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500">
          <Icono size={14} className="text-brand-400" aria-hidden="true" /> {titulo}
        </h2>
        <p className="text-sm text-gray-400">{descripcion}</p>
      </div>

      {!token ? (
        <button type="button" onClick={onCrear} disabled={ocupado} className="btn-secundario">
          {ocupado ? 'Un momento...' : textoCrear}
        </button>
      ) : (
        <>
          <input readOnly value={enlace} aria-label={etiqueta} onFocus={e => e.target.select()}
            className="input-field font-mono text-xs" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" onClick={copiar} className="btn-secundario inline-flex items-center justify-center gap-2 text-sm">
              {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copiado ? 'Copiado' : 'Copiar enlace'}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(mensaje(enlace))}`} target="_blank" rel="noreferrer"
              className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
              <Share2 size={16} aria-hidden="true" /> WhatsApp
            </a>
            <a href={enlace} target="_blank" rel="noreferrer" className="btn-secundario inline-flex items-center justify-center gap-2 text-sm">
              <ExternalLink size={16} aria-hidden="true" /> Abrir
            </a>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <button type="button" onClick={cambiar} disabled={ocupado} className="py-1 text-sm text-gray-400 hover:text-white">Cambiar enlace</button>
            <button type="button" onClick={apagar} disabled={ocupado} className="py-1 text-sm text-gray-400 hover:text-red-400">Desactivar</button>
          </div>
        </>
      )}
    </section>
  )
}
