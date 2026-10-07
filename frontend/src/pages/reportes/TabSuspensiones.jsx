import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import EmptyState from '../../components/EmptyState'

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function AgregarSancionForm({ idCampeonato, onCerrar }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ idJugador: '', motivo: '', partidosSancion: 1, fechaDecision: hoy() })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { data: equipos = [] } = useQuery({
    queryKey: ['campeonato-equipos', idCampeonato],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}`).then(r => r.data.equipos ?? []),
  })

  const { data: jugadoresPorEquipo = [] } = useQuery({
    queryKey: ['campeonato-jugadores', idCampeonato, equipos.map(e => e.idEquipo).join(',')],
    queryFn: async () => {
      const resultados = await Promise.all(
        equipos.map(e => api.get(`/equipos/${e.idEquipo}`).then(r => ({ equipo: e.nombre, jugadores: r.data.jugadores ?? []})))
      )
      return resultados.filter(r => r.jugadores.length > 0)
    },
    enabled: equipos.length > 0,
  })

  const agregarMutation = useMutation({
    mutationFn: (data) => api.post(`/campeonatos/${idCampeonato}/estadisticas/suspensiones`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estadisticas-suspensiones', idCampeonato] })
      onCerrar()
    },
    onError: (err) => setError(err.response?.data?.error || 'Error al agregar la sanción.'),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Jugador</label>
          <select className="input-field text-sm" value={form.idJugador} onChange={e => set('idJugador', e.target.value)}>
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
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de la decisión</label>
          <input type="date" className="input-field text-sm" value={form.fechaDecision} onChange={e => set('fechaDecision', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Motivo</label>
        <input className="input-field text-sm" value={form.motivo} maxLength={200}
          placeholder="Ej. Conducta antideportiva, decisión de la comisión disciplinaria..."
          onChange={e => set('motivo', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Partidos de sanción</label>
          <input type="number" min="1" className="input-field text-sm" value={form.partidosSancion}
            onChange={e => set('partidosSancion', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={submit} disabled={agregarMutation.isPending}
            className="btn-primary flex-1 disabled:opacity-40">
            {agregarMutation.isPending ? 'Guardando...' : 'Agregar sanción'}
          </button>
          <button onClick={onCerrar} className="text-gray-500 hover:text-white transition-colors px-3 text-sm">Cancelar</button>
        </div>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

export default function TabSuspensiones({ idCampeonato }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['estadisticas-suspensiones', idCampeonato],
    queryFn: () => api.get(`/campeonatos/${idCampeonato}/estadisticas/suspensiones`).then(r => r.data),
    enabled: !!idCampeonato,
  })

  const eliminarMutation = useMutation({
    mutationFn: (idSancion) => api.delete(`/campeonatos/${idCampeonato}/estadisticas/suspensiones/${idSancion}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estadisticas-suspensiones', idCampeonato] }),
    onError: (err) => alert(err.response?.data?.error || 'No se pudo eliminar la sanción.'),
  })

  if (isLoading) return <p className="text-gray-500 text-sm text-center py-10">Cargando suspensiones...</p>
  if (isError) return <p className="text-red-400 text-sm text-center py-10">No se pudieron cargar las suspensiones.</p>

  const sanciones = data?.sanciones ?? []
  const enRiesgo = data?.enRiesgo ?? []

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider">Sanciones</h3>
          {!showForm && (
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Jugador', 'Equipo', 'Motivo', 'Fecha', 'Partidos', 'Estado', ''].map(h => (
                      <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sanciones.map((s, i) => (
                    <tr key={`${s.idJugador}-${s.idPartidoSancion ?? 'manual'}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{s.jugador}</td>
                      <td className="px-3 py-2 text-gray-400">{s.equipo}</td>
                      <td className="px-3 py-2 text-gray-300">
                        {s.motivo}
                        {s.manual && <span className="ml-1.5 text-[10px] text-brand-400 border border-brand-700/50 rounded px-1 py-0.5 align-middle">Comisión</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-center text-xs">{s.fechaPartidoSancion}</td>
                      <td className="px-3 py-2 text-gray-400 text-center">{s.partidosCumplidos}/{s.partidosSancion}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          s.estado === 'Suspendido' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                        }`}>{s.estado}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {s.manual && (
                          <button
                            onClick={() => { if (confirm('¿Eliminar esta sanción?')) eliminarMutation.mutate(s.idSancion) }}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                          >✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">En riesgo de sanción</h3>
        {enRiesgo.length === 0 ? (
          <p className="text-gray-600 text-sm">Nadie está a una amarilla de la sanción por acumulación.</p>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[380px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Jugador', 'Equipo', 'Amarillas acumuladas'].map(h => (
                      <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enRiesgo.map(r => (
                    <tr key={r.idJugador} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{r.jugador}</td>
                      <td className="px-3 py-2 text-gray-400">{r.equipo}</td>
                      <td className="px-3 py-2 text-yellow-400 text-center font-semibold">{r.amarillasAcumuladas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
