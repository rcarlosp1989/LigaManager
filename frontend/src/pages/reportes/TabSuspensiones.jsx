import { useState, useId } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import EmptyState from '../../components/EmptyState'
import { useAviso, useDialogos, mensajeDeError, erroresDe } from '../../feedback/contextos'
import TablaDesplazable from '../../components/TablaDesplazable'
import FotoJugador from '../../components/FotoJugador'
import NotaResponsabilidad from '../../components/NotaResponsabilidad'
import { Avance, ConteoTarjetas } from '../../components/Indicadores'

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function AgregarSancionForm({ idCampeonato, onCerrar }) {
  const fid = useId()
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const [form, setForm] = useState({ idJugador: '', motivo: '', partidosSancion: 1, fechaDecision: hoy() })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const qEquipos = useQuery({
    queryKey: ['campeonato-equipos', idCampeonato],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}`).then(r => r.data.equipos ?? []),
  })

  const equipos = qEquipos.data ?? []

  const qJugadores = useQuery({
    queryKey: ['campeonato-jugadores', idCampeonato, equipos.map(e => e.idEquipo).join(',')],
    queryFn: async () => {
      const resultados = await Promise.all(
        equipos.map(e => api.get(`/equipos/${e.idEquipo}`).then(r => ({ equipo: e.nombre, jugadores: r.data.jugadores ?? []})))
      )
      return resultados.filter(r => r.jugadores.length > 0)
    },
    enabled: equipos.length > 0,
  })
  const jugadoresPorEquipo = qJugadores.data ?? []
  const catalogos = erroresDe(qEquipos, qJugadores)

  const agregarMutation = useMutation({
    mutationFn: (data) => api.post(`/campeonatos/${idCampeonato}/estadisticas/suspensiones`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estadisticas-suspensiones', idCampeonato] })
      onCerrar()
      aviso.exito('Sanción agregada.')
    },
    onError: (err) => setError(mensajeDeError(err, 'Error al agregar la sanción.')),
  })

  const submit = () => {
    if (!form.idJugador) { setError('Selecciona un jugador.'); return }
    if (!form.motivo.trim()) { setError('El motivo es obligatorio.'); return }
    agregarMutation.mutate({
      idJugador: parseInt(form.idJugador),
      motivo: form.motivo.trim(),
      partidosSancion: parseInt(form.partidosSancion) || 1,
      fechaDecision: form.fechaDecision,
    })
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4 space-y-3">
      {catalogos.hayError && (
        <EstadoError compacto mensaje="No se pudo cargar la lista de jugadores."
          onReintentar={catalogos.reintentar} reintentando={catalogos.reintentando} />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${fid}-c1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Jugador</label>
          <select id={`${fid}-c1`} className="input-field text-sm" value={form.idJugador} onChange={e => set('idJugador', e.target.value)}>
            <option value="">Seleccionar...</option>
            {jugadoresPorEquipo.map(grupo => (
              <optgroup key={grupo.equipo} label={grupo.equipo}>
                {grupo.jugadores.map(j => (
                  <option key={j.idJugador} value={j.idJugador}>{j.apellido}, {j.nombre}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${fid}-c2`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de la decisión</label>
          <input id={`${fid}-c2`} type="date" className="input-field text-sm" value={form.fechaDecision} onChange={e => set('fechaDecision', e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor={`${fid}-c3`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Motivo</label>
        <input id={`${fid}-c3`} className="input-field text-sm" value={form.motivo} maxLength={200}
          placeholder="Ej. Conducta antideportiva, decisión de la comisión disciplinaria..."
          onChange={e => set('motivo', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div>
          <label htmlFor={`${fid}-c4`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Partidos de sanción</label>
          <input id={`${fid}-c4`} type="number" min="1" className="input-field text-sm" value={form.partidosSancion}
            onChange={e => set('partidosSancion', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={submit} disabled={agregarMutation.isPending}
            className="btn-primary flex-1 disabled:opacity-40">
            {agregarMutation.isPending ? 'Guardando...' : 'Agregar sanción'}
          </button>
          <button onClick={onCerrar} className="btn-secundario">Cancelar</button>
        </div>
      </div>
      {error && <p role="alert" className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

// soloLectura: el dirigente ve las sanciones, pero no las agrega ni las borra.
export default function TabSuspensiones({ idCampeonato, base = `/campeonatos/${idCampeonato}`, soloLectura = false }) {
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['estadisticas-suspensiones', idCampeonato, base],
    queryFn: () => api.get(`${base}/estadisticas/suspensiones`).then(r => r.data),
    enabled: !!idCampeonato,
  })

  const eliminarMutation = useMutation({
    mutationFn: (idSancion) => api.delete(`/campeonatos/${idCampeonato}/estadisticas/suspensiones/${idSancion}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estadisticas-suspensiones', idCampeonato] })
      aviso.exito('Sanción eliminada.')
    },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo eliminar la sanción.')),
  })

  const eliminar = async (s) => {
    const ok = await confirmar({
      titulo: `¿Eliminar la sanción de ${s.jugador}?`,
      mensaje: s.motivo ? `Motivo: ${s.motivo}` : undefined,
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (ok) eliminarMutation.mutate(s.idSancion)
  }

  if (isLoading) return <p className="text-gray-500 text-sm text-center py-10">Cargando suspensiones...</p>
  if (isError) return <EstadoError mensaje="No se pudieron cargar las suspensiones." onReintentar={refetch} reintentando={isFetching} />

  const sanciones = data?.sanciones ?? []
  const enRiesgo = data?.enRiesgo ?? []

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider">Sanciones</h3>
          {!showForm && !soloLectura && (
            <button onClick={() => setShowForm(true)} className="btn-primary text-xs py-1.5 px-3">
              + Agregar sanción
            </button>
          )}
        </div>

        {showForm && <AgregarSancionForm idCampeonato={idCampeonato} onCerrar={() => setShowForm(false)} />}

        {sanciones.length === 0 ? (
          <p className="text-gray-600 text-sm">Sin sanciones registradas.</p>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <TablaDesplazable>
              <table className="tabla w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th scope="col" className="fija fija-borde px-3 py-2 text-left text-xs uppercase tracking-wider">Jugador</th>
                    {['Equipo', 'Motivo', 'Fecha', 'Partidos', 'Estado', ''].map(h => (
                      <th key={h} scope="col" className={`px-3 py-2 text-xs uppercase tracking-wider ${h === 'Equipo' || h === 'Motivo' ? 'text-left' : 'text-center'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sanciones.map((s, i) => (
                    <tr key={`${s.idJugador}-${s.idPartidoSancion ?? 'manual'}-${i}`} className="border-b border-gray-800/50">
                      <th scope="row" className="fija fija-borde px-3 py-2 text-left font-medium text-white">
                        <span className="flex items-center gap-2" title={s.jugador}><FotoJugador nombre={s.jugador} fotoUrl={s.fotoUrl} tamano={28} /><span className="min-w-0 max-w-[9rem] truncate sm:max-w-[14rem]">{s.jugador}</span></span>
                      </th>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{s.equipo}</td>
                      <td className="px-3 py-2 text-gray-300">
                        {s.motivo}
                        {s.manual && <span className="ml-1.5 text-[10px] text-brand-400 border border-brand-700/50 rounded px-1 py-0.5 align-middle">Comisión</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-center text-xs">{s.fechaPartidoSancion}</td>
                      <td className="px-3 py-2 text-center"><Avance hecho={s.partidosCumplidos} total={s.partidosSancion} /></td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          s.estado === 'Suspendido' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                        }`}>{s.estado}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {s.manual && !soloLectura && (
                          <button
                            onClick={() => eliminar(s)}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                            aria-label={`Eliminar la sanción de ${s.jugador}`}
                          >✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablaDesplazable>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">En riesgo de sanción</h3>
        {enRiesgo.length === 0 ? (
          <p className="text-gray-600 text-sm">Nadie está a una amarilla de la sanción por acumulación.</p>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <TablaDesplazable>
              <table className="tabla w-full text-sm min-w-[380px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th scope="col" className="fija fija-borde px-3 py-2 text-left text-xs uppercase tracking-wider">Jugador</th>
                    {['Equipo', 'Amarillas acumuladas'].map(h => (
                      <th key={h} scope="col" className={`px-3 py-2 text-xs uppercase tracking-wider ${h === 'Equipo' ? 'text-left' : 'text-center'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enRiesgo.map(r => (
                    <tr key={r.idJugador} className="border-b border-gray-800/50">
                      <th scope="row" className="fija fija-borde px-3 py-2 text-left font-medium text-white">
                        <span className="flex items-center gap-2" title={r.jugador}><FotoJugador nombre={r.jugador} fotoUrl={r.fotoUrl} tamano={28} /><span className="min-w-0 max-w-[9rem] truncate sm:max-w-[16rem]">{r.jugador}</span></span>
                      </th>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.equipo}</td>
                      <td className="px-3 py-2 text-center"><ConteoTarjetas valor={r.amarillasAcumuladas} tipo="amarilla" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablaDesplazable>
          </div>
        )}
      </div>
      <NotaResponsabilidad texto="Las suspensiones se calculan con las tarjetas registradas y las reglas configuradas por la organización." />
    </div>
  )
}
