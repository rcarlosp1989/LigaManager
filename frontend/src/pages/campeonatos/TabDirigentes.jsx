import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import InvitacionCreada from '../../components/InvitacionCreada'
import LogoEquipo from '../../components/LogoEquipo'
import { useAviso, useDialogos, mensajeDeError } from '../../feedback/contextos'
import { formatearFecha } from '../../utils/fechas'
import { useLogosEquipos } from '../../utils/logos'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

// Pestaña «Dirigentes» del campeonato: invitar al dirigente de un equipo para que vea el
// campeonato en solo lectura, ver quién tiene acceso, quitarlo y anular invitaciones.
export default function TabDirigentes({ camp }) {
  const fid = useId()
  const logos = useLogosEquipos()
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [idEquipo, setIdEquipo] = useState(null)     // null = formulario cerrado
  const [creada, setCreada] = useState(null)
  const clave = ['dirigentes', camp.idCampeonato]
  const equipos = [...(camp.equipos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre))

  const q = useQuery({ queryKey: clave, queryFn: () => api.get(`/campeonatos/${camp.idCampeonato}/dirigentes`).then(r => r.data) })
  const refrescar = () => queryClient.invalidateQueries({ queryKey: clave })

  const crear = useMutation({
    mutationFn: (datos) => api.post(`/campeonatos/${camp.idCampeonato}/dirigentes/invitaciones`, datos).then(r => r.data),
    onSuccess: (inv) => { setCreada(inv); setIdEquipo(null); refrescar() },
  })

  const quitar = async (d) => {
    const ok = await confirmar({
      titulo: `¿Quitar el acceso a ${d.nombre}?`,
      mensaje: `Dejará de ver este campeonato. Si es dirigente de ${d.equipo} en otro campeonato, ahí lo sigue viendo.`,
      textoConfirmar: 'Quitar acceso', peligro: true,
    })
    if (!ok) return
    try {
      await api.delete(`/campeonatos/${camp.idCampeonato}/dirigentes/${d.idUsuario}`)
      aviso.exito('Acceso quitado.'); refrescar()
    } catch (err) { aviso.error(mensajeDeError(err, 'No se pudo quitar el acceso.')) }
  }

  const anular = async (i) => {
    const ok = await confirmar({
      titulo: '¿Anular esta invitación?', mensaje: 'El enlace deja de servir.', textoConfirmar: 'Anular', peligro: true,
    })
    if (!ok) return
    try {
      await api.delete(`/campeonatos/${camp.idCampeonato}/dirigentes/invitaciones/${i.idInvitacion}`)
      aviso.exito('Invitación anulada.'); refrescar()
    } catch (err) { aviso.error(mensajeDeError(err, 'No se pudo anular.')) }
  }

  const abrir = () => { setCreada(null); crear.reset(); setIdEquipo(equipos[0] ? String(equipos[0].idEquipo) : '') }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dirigentes</h2>
        <p className="text-gray-400 text-sm">
          El dirigente de un equipo ve el campeonato con su propia cuenta, sin poder cambiar nada: jornadas y resultados,
          posiciones, nóminas, goleadores, tarjetas y suspensiones. Por privacidad, solo ve los documentos de identidad de
          los jugadores de su equipo.
        </p>
      </div>

      {creada && (
        <InvitacionCreada invitacion={creada} campeonato={camp.nombre} ruta="/invitacion-dirigente" equipo={creada.equipo} />
      )}

      {idEquipo === null && (
        equipos.length === 0
          ? <p className="text-sm text-gray-500">Primero inscribe equipos en el campeonato para poder invitar a sus dirigentes.</p>
          : <div><button type="button" onClick={abrir} className="btn-primary">+ Invitar dirigente</button></div>
      )}

      {idEquipo !== null && (
        <form className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4"
          onSubmit={e => { e.preventDefault(); if (idEquipo) crear.mutate({ idEquipo: Number(idEquipo) }) }}>
          <p className="text-sm text-white">
            Se crea un enlace de una sola vez para que el dirigente cree su cuenta. Vence a los 7 días si nadie lo usa.
          </p>
          <div className="max-w-sm">
            <label htmlFor={`${fid}-equipo`} className={labelClass}>Equipo del dirigente</label>
            <select id={`${fid}-equipo`} className="input-field" value={idEquipo} required onChange={e => setIdEquipo(e.target.value)}>
              {equipos.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
            </select>
          </div>
          {crear.isError && <p role="alert" className="text-red-400 text-sm">{mensajeDeError(crear.error, 'No se pudo crear la invitación.')}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setIdEquipo(null)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={crear.isPending || !idEquipo} className="btn-primary">{crear.isPending ? 'Creando...' : 'Crear invitación'}</button>
          </div>
        </form>
      )}

      {q.isLoading ? (
        <p className="text-gray-500 text-sm">Cargando dirigentes...</p>
      ) : q.isError ? (
        <EstadoError compacto mensaje="No se pudieron cargar los dirigentes." onReintentar={q.refetch} reintentando={q.isFetching} />
      ) : (
        <>
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Con acceso</h3>
            {q.data.dirigentes.length === 0 ? (
              <p className="text-gray-500 text-sm">Todavía nadie. Invita a los dirigentes de los equipos para que sigan el campeonato.</p>
            ) : (
              <ul className="divide-y divide-gray-800 rounded-lg border border-gray-800">
                {q.data.dirigentes.map(d => (
                  <li key={d.idUsuario} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <LogoEquipo nombre={d.equipo} logoUrl={logos.get(d.idEquipo)} tamano={28} />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium">{d.nombre}</p>
                      <p className="text-gray-300 text-xs">{d.equipo}</p>
                      <p className="text-gray-500 text-xs break-all">{d.email} · desde el {formatearFecha(d.desde)}</p>
                    </div>
                    <button type="button" onClick={() => quitar(d)} className="text-sm text-gray-400 hover:text-red-400 px-2">Quitar acceso</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {q.data.invitaciones.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Invitaciones sin usar</h3>
              <ul className="divide-y divide-gray-800 rounded-lg border border-gray-800">
                {q.data.invitaciones.map(i => (
                  <li key={i.idInvitacion} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm">Dirigente de {i.equipo}</p>
                      <p className="text-gray-500 text-xs">Creada por {i.creadaPor} · vence el {formatearFecha(i.venceEn)}</p>
                    </div>
                    <button type="button" onClick={() => anular(i)} className="text-sm text-gray-400 hover:text-red-400 px-2">Anular</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
