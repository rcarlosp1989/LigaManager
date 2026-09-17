import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import Modal from '../../components/Modal'

// ── Badges ───────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }) {
  const styles = {
    Planificado: 'bg-blue-900/40 text-blue-400 border border-blue-800',
    EnCurso:     'bg-green-900/40 text-green-400 border border-green-800',
    Finalizado:  'bg-gray-800 text-gray-400 border border-gray-700',
  }
  const labels = { Planificado: 'Planificado', EnCurso: 'En Curso', Finalizado: 'Finalizado' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[estado] ?? styles.Planificado}`}>
      {labels[estado] ?? estado}
    </span>
  )
}

function PartidoBadge({ estado }) {
  const styles = {
    Programado: 'bg-blue-900/30 text-blue-400',
    Pendiente:  'bg-yellow-900/30 text-yellow-400',
    Finalizado: 'bg-green-900/30 text-green-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${styles[estado] ?? styles.Programado}`}>
      {estado}
    </span>
  )
}

// ── InfoItem ─────────────────────────────────────────────────────────────────

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  )
}

// ── Formulario nueva jornada ──────────────────────────────────────────────────

function JornadaForm({ onSubmit, loading, error, idCampeonato }) {
  const [form, setForm] = useState({ numero: '', idInstancia: '', idGrupo: '' })

  const { data: instancias = [] } = useQuery({
    queryKey: ['instancias'],
    queryFn:  () => api.get('/catalogos/instancias').then(r => r.data),
  })
  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos', idCampeonato],
    queryFn:  () => api.get(`/campeonatos/${idCampeonato}/grupos`).then(r => r.data),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Número</label>
          <input type="number" className="input-field" value={form.numero} min="1"
            onChange={e => set('numero', e.target.value)} placeholder="1" required />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Instancia</label>
          <select className="input-field" value={form.idInstancia}
            onChange={e => set('idInstancia', e.target.value)}>
            <option value="">Seleccionar...</option>
            {instancias.map(i => <option key={i.idInstancia} value={i.idInstancia}>{i.nombre}</option>)}
          </select>
        </div>
      </div>
      {grupos.length > 0 && (
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Grupo (opcional)</label>
          <select className="input-field" value={form.idGrupo}
            onChange={e => set('idGrupo', e.target.value)}>
            <option value="">Sin grupo</option>
            {grupos.map(g => <option key={g.idGrupo} value={g.idGrupo}>{g.nombre}</option>)}
          </select>
        </div>
      )}
      {error && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <button
        onClick={() => onSubmit({
          numero:      parseInt(form.numero),
          idInstancia: parseInt(form.idInstancia),
          idGrupo:     form.idGrupo ? parseInt(form.idGrupo) : null,
        })}
        disabled={loading || !form.numero || !form.idInstancia}
        className="btn-primary w-full disabled:opacity-40"
      >
        {loading ? 'Guardando...' : 'Crear Jornada'}
      </button>
    </div>
  )
}

// ── Formulario nuevo partido ──────────────────────────────────────────────────

function PartidoForm({ onSubmit, loading, error, idCampeonato }) {
  const [form, setForm] = useState({
    idEquipoLocal: '', idEquipoVisitante: '', fecha: '', idEstadio: '', idArbitro: '', oficiales: {}
  })

  const { data: camp } = useQuery({
    queryKey: ['campeonato', idCampeonato],
    queryFn:  () => api.get(`/campeonatos/${idCampeonato}`).then(r => r.data),
  })
  const { data: estadios = [] } = useQuery({
    queryKey: ['estadios'],
    queryFn:  () => api.get('/estadios').then(r => r.data),
  })
  const { data: arbitros = [] } = useQuery({
    queryKey: ['arbitros'],
    queryFn:  () => api.get('/arbitros').then(r => r.data),
  })
  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos-oficiales', camp?.idModalidad],
    queryFn:  () => api.get(`/catalogos/cargos-oficiales?modalidadId=${camp.idModalidad}`).then(r => r.data),
    enabled: !!camp?.idModalidad,
  })

  const equipos = camp?.equipos ?? []
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setOficial = (idCargo, idArbitro) => setForm(f => ({
    ...f,
    oficiales: { ...f.oficiales, [idCargo]: idArbitro },
  }))
  const faltanCargosObligatorios = cargos.some(cargo =>
    cargo.obligatorio && !form.oficiales[cargo.idCargo]
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Local</label>
          <select className="input-field" value={form.idEquipoLocal}
            onChange={e => set('idEquipoLocal', e.target.value)}>
            <option value="">Seleccionar...</option>
            {equipos.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Visitante</label>
          <select className="input-field" value={form.idEquipoVisitante}
            onChange={e => set('idEquipoVisitante', e.target.value)}>
            <option value="">Seleccionar...</option>
            {equipos.filter(e => e.idEquipo !== parseInt(form.idEquipoLocal))
              .map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
          </select>
        </div>
      </div>
      {cargos.length > 0 && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Designación del partido</p>
          {cargos.map(cargo => (
            <div key={cargo.idCargo}>
              <label className="block text-xs text-gray-400 mb-1.5">
                {cargo.cargo} {cargo.obligatorio && <span className="text-amber-300">*</span>}
              </label>
              <select className="input-field" value={form.oficiales[cargo.idCargo] ?? ''}
                onChange={e => setOficial(cargo.idCargo, e.target.value)}>
                <option value="">Sin asignar</option>
                {arbitros.map(a => <option key={a.idArbitro} value={a.idArbitro}>{a.apellido}, {a.nombre}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha</label>
        <input type="date" className="input-field" value={form.fecha}
          onChange={e => set('fecha', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Estadio</label>
          <select className="input-field" value={form.idEstadio}
            onChange={e => set('idEstadio', e.target.value)}>
            <option value="">Seleccionar...</option>
            {estadios.map(e => <option key={e.idEstadio} value={e.idEstadio}>{e.nombre}</option>)}
          </select>
        </div>
        {cargos.length === 0 && <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Árbitro principal</label>
          <select className="input-field" value={form.idArbitro}
            onChange={e => set('idArbitro', e.target.value)}>
            <option value="">Seleccionar...</option>
            {arbitros.map(a => <option key={a.idArbitro} value={a.idArbitro}>{a.apellido}, {a.nombre}</option>)}
          </select>
        </div>}
      </div>
      {error && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <button
        onClick={() => onSubmit({
          idEquipoLocal:     parseInt(form.idEquipoLocal),
          idEquipoVisitante: parseInt(form.idEquipoVisitante),
          fecha:             form.fecha,
          idEstadio:         parseInt(form.idEstadio),
          idArbitro:         parseInt(form.idArbitro || Object.values(form.oficiales)[0]),
          oficiales:         Object.entries(form.oficiales)
            .filter(([, idArbitro]) => idArbitro)
            .map(([idCargo, idArbitro]) => ({ idCargo: parseInt(idCargo), idArbitro: parseInt(idArbitro) })),
        })}
        disabled={loading || !form.idEquipoLocal || !form.idEquipoVisitante || !form.fecha || !form.idEstadio
          || (!form.idArbitro && !Object.values(form.oficiales).some(Boolean))
          || faltanCargosObligatorios}
        className="btn-primary w-full disabled:opacity-40"
      >
        {loading ? 'Guardando...' : 'Agregar Partido'}
      </button>
    </div>
  )
}

// ── Formulario registrar evento ───────────────────────────────────────────────

function EventoForm({ onSubmit, loading, error, partido }) {
  const [form, setForm] = useState({ idJugador: '', tipoEvento: 'GOL', minuto: '' })
  const fechaPartido = partido?.fecha?.slice(0, 10)

  const { data: equipoLocal } = useQuery({
    queryKey: ['equipo', partido?.idEquipoLocal, fechaPartido],
    queryFn:  () => api.get(`/equipos/${partido.idEquipoLocal}`, { params: { fecha: fechaPartido } }).then(r => r.data),
    enabled:  !!partido?.idEquipoLocal,
  })
  const { data: equipoVisitante } = useQuery({
    queryKey: ['equipo', partido?.idEquipoVisitante, fechaPartido],
    queryFn:  () => api.get(`/equipos/${partido.idEquipoVisitante}`, { params: { fecha: fechaPartido } }).then(r => r.data),
    enabled:  !!partido?.idEquipoVisitante,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const tipos = [
    { value: 'GOL',              label: '⚽ Gol' },
    { value: 'TARJETA_AMARILLA', label: '🟨 Tarjeta Amarilla' },
    { value: 'TARJETA_ROJA',     label: '🟥 Tarjeta Roja' },
  ]

  const jugadoresLocal     = equipoLocal?.jugadores ?? []
  const jugadoresVisitante = equipoVisitante?.jugadores ?? []

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Tipo de evento</label>
        <select className="input-field" value={form.tipoEvento}
          onChange={e => set('tipoEvento', e.target.value)}>
          {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Jugador</label>
        <select className="input-field" value={form.idJugador}
          onChange={e => set('idJugador', e.target.value)}>
          <option value="">Seleccionar jugador...</option>
          {jugadoresLocal.length > 0 && (
            <optgroup label={`🏠 ${equipoLocal?.nombre}`}>
              {jugadoresLocal.map(j => (
                <option key={j.idJugador} value={j.idJugador}>
                  {j.apellido}, {j.nombre}
                </option>
              ))}
            </optgroup>
          )}
          {jugadoresVisitante.length > 0 && (
            <optgroup label={`✈️ ${equipoVisitante?.nombre}`}>
              {jugadoresVisitante.map(j => (
                <option key={j.idJugador} value={j.idJugador}>
                  {j.apellido}, {j.nombre}
                </option>
              ))}
            </optgroup>
          )}
          {jugadoresLocal.length === 0 && jugadoresVisitante.length === 0 && (
            <option disabled>No hay jugadores registrados</option>
          )}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Minuto</label>
        <input type="number" className="input-field" value={form.minuto} min="1" max="120"
          onChange={e => set('minuto', e.target.value)} placeholder="45" />
      </div>
      {error && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <button
        onClick={() => onSubmit({
          idJugador:  parseInt(form.idJugador),
          tipoEvento: form.tipoEvento,
          minuto:     parseInt(form.minuto),
        })}
        disabled={loading || !form.idJugador || !form.minuto || parseInt(form.minuto) < 1 || parseInt(form.minuto) > 120}
        className="btn-primary w-full disabled:opacity-40"
      >
        {loading ? 'Guardando...' : 'Registrar Evento'}
      </button>
    </div>
  )
}

// ── Selector de equipo del campeonato ────────────────────────────────────────

function EquipoSelector({ idCampeonato, value, onChange, excluir }) {
  const { data: camp } = useQuery({
    queryKey: ['campeonato', idCampeonato],
    queryFn:  () => api.get(`/campeonatos/${idCampeonato}`).then(r => r.data),
  })
  const equipos = (camp?.equipos ?? []).filter(e => e.idEquipo !== parseInt(excluir))

  return (
    <select className="input-field" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Sin cambio</option>
      {equipos.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
    </select>
  )
}

// ── Card de Partido ───────────────────────────────────────────────────────────

function PartidoCard({ partido, idCampeonato }) {
  const queryClient = useQueryClient()
  const [showEventoModal, setShowEventoModal] = useState(false)
  const [showEditModal, setShowEditModal]     = useState(false)
  const [eventoError, setEventoError]         = useState('')
  const [editError, setEditError]             = useState('')
  const [editForm, setEditForm] = useState({
    idEstadio:         partido.idEstadio ?? '',
    idArbitro:         partido.idArbitro ?? '',
    fecha:             partido.fecha ?? '',
    idEquipoLocal:     partido.idEquipoLocal ?? '',
    idEquipoVisitante: partido.idEquipoVisitante ?? '',
  })

  const { data: estadios = [] } = useQuery({
    queryKey: ['estadios'],
    queryFn:  () => api.get('/estadios').then(r => r.data),
    enabled:  showEditModal,
  })
  const { data: arbitros = [] } = useQuery({
    queryKey: ['arbitros'],
    queryFn:  () => api.get('/arbitros').then(r => r.data),
    enabled:  showEditModal,
  })

  const marcarMutation = useMutation({
    mutationFn: () => api.put(`/partidos/${partido.idPartido}/jugado`, { jugado: !partido.jugado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornada'] })
      queryClient.invalidateQueries({ queryKey: ['grupo'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-campeonato', idCampeonato] })
    },
    onError: (err) => alert(err.response?.data?.error || 'Error al actualizar partido.'),
  })

  const editarMutation = useMutation({
    mutationFn: (data) => api.put(`/partidos/${partido.idPartido}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornada'] })
      setShowEditModal(false)
      setEditError('')
    },
    onError: (err) => setEditError(err.response?.data?.error || 'Error al actualizar partido.'),
  })

  const eventoMutation = useMutation({
    mutationFn: (data) => api.post(`/partidos/${partido.idPartido}/eventos`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornada'] })
      queryClient.invalidateQueries({ queryKey: ['grupo'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-campeonato', idCampeonato] })
      setShowEventoModal(false)
      setEventoError('')
    },
    onError: (err) => setEventoError(err.response?.data?.error || 'Error al registrar evento.'),
  })

  const eliminarEventoMutation = useMutation({
    mutationFn: (idEvento) => api.delete(`/eventos/${idEvento}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornada'] })
      queryClient.invalidateQueries({ queryKey: ['grupo'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-campeonato', idCampeonato] })
    },
    onError: (err) => alert(err.response?.data?.error || 'No se puede eliminar.'),
  })

  const iconoEvento = {
    'GOL':              '⚽',
    'TARJETA_AMARILLA': '🟨',
    'TARJETA_ROJA':     '🟥',
  }

  const setE = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  return (
    <div className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-white font-medium text-sm">{partido.equipoLocal}</span>
          {partido.jugado && (
            <span className="text-white font-display text-sm">
              {partido.golesLocal ?? 0} - {partido.golesVisitante ?? 0}
            </span>
          )}
          {!partido.jugado && <span className="text-gray-600 text-xs">vs</span>}
          <span className="text-white font-medium text-sm">{partido.equipoVisitante}</span>
        </div>
        <div className="flex items-center gap-3">
          <PartidoBadge estado={partido.estado} />
          <span className="text-gray-500 text-xs">{partido.fecha}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        {partido.estadio
          ? <span>🏟️ {partido.estadio}</span>
          : <span className="text-gray-700">🏟️ Sin estadio</span>}
        {partido.arbitro
          ? <span>👤 {partido.arbitro}</span>
          : <span className="text-gray-700">👤 Sin árbitro</span>}
      </div>

      {partido.oficiales?.length > 0 && (
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
          {partido.oficiales.map(oficial => (
            <span key={oficial.idCargo}>{oficial.cargo}: <strong className="text-gray-200">{oficial.arbitro}</strong></span>
          ))}
        </div>
      )}

      {partido.eventos?.length > 0 && (
        <div className="mb-3 space-y-1">
          {partido.eventos.map(ev => (
            <div key={ev.idEvento} className="flex items-center justify-between text-xs text-gray-400 bg-gray-800/40 rounded px-2 py-1">
              <span>{iconoEvento[ev.tipoEvento] ?? '📋'} {ev.jugador} <span className="text-gray-600">min. {ev.minuto}</span></span>
              <button
                onClick={() => { if (confirm('¿Eliminar este evento?')) eliminarEventoMutation.mutate(ev.idEvento) }}
                className="text-gray-600 hover:text-red-400 transition-colors ml-2"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => marcarMutation.mutate()}
          disabled={marcarMutation.isPending}
          className={`text-xs px-3 py-1.5 rounded border transition-colors ${
            partido.jugado
              ? 'border-gray-700 text-gray-400 hover:border-red-800 hover:text-red-400'
              : 'border-green-800 text-green-400 hover:bg-green-900/20'
          }`}
        >
          {partido.jugado ? '↩ Desmarcar jugado' : '✓ Marcar jugado'}
        </button>
        <button
          onClick={() => setShowEventoModal(true)}
          className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
        >+ Evento</button>
        <button
          onClick={() => {
            setEditForm({
              idEstadio:         partido.idEstadio ?? '',
              idArbitro:         partido.idArbitro ?? '',
              fecha:             partido.fecha ?? '',
              idEquipoLocal:     partido.idEquipoLocal ?? '',
              idEquipoVisitante: partido.idEquipoVisitante ?? '',
            })
            setShowEditModal(true)
          }}
          className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-blue-700 hover:text-blue-400 transition-colors"
        >✏️ Editar</button>
      </div>

      {/* Modal editar partido */}
      <Modal isOpen={showEditModal}
             onClose={() => { setShowEditModal(false); setEditError('') }}
             title="EDITAR PARTIDO">
        <div className="space-y-4">
          <div className="text-sm text-gray-400 bg-gray-800/40 rounded px-3 py-2">
            {partido.equipoLocal} vs {partido.equipoVisitante}
          </div>
          {/* Cambio de equipos solo si no hay eventos registrados */}
          {partido.eventos?.length === 0 && !partido.jugado && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipo local</label>
                <EquipoSelector
                  idCampeonato={idCampeonato}
                  value={editForm.idEquipoLocal}
                  onChange={v => setE('idEquipoLocal', v)}
                  excluir={editForm.idEquipoVisitante}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipo visitante</label>
                <EquipoSelector
                  idCampeonato={idCampeonato}
                  value={editForm.idEquipoVisitante}
                  onChange={v => setE('idEquipoVisitante', v)}
                  excluir={editForm.idEquipoLocal}
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha y hora</label>
            <input type="datetime-local" className="input-field" value={editForm.fecha}
              onChange={e => setE('fecha', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Estadio</label>
            <select className="input-field" value={editForm.idEstadio}
              onChange={e => setE('idEstadio', e.target.value)}>
              <option value="">Sin asignar</option>
              {estadios.map(e => <option key={e.idEstadio} value={e.idEstadio}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Árbitro</label>
            <select className="input-field" value={editForm.idArbitro}
              onChange={e => setE('idArbitro', e.target.value)}>
              <option value="">Sin asignar</option>
              {arbitros.map(a => <option key={a.idArbitro} value={a.idArbitro}>{a.apellido}, {a.nombre}</option>)}
            </select>
          </div>
          {editError && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{editError}</div>}
          <button
            onClick={() => editarMutation.mutate({
              idEstadio:         editForm.idEstadio ? parseInt(editForm.idEstadio) : null,
              idArbitro:         editForm.idArbitro ? parseInt(editForm.idArbitro) : null,
              fecha:             editForm.fecha,
              idEquipoLocal:     editForm.idEquipoLocal ? parseInt(editForm.idEquipoLocal) : null,
              idEquipoVisitante: editForm.idEquipoVisitante ? parseInt(editForm.idEquipoVisitante) : null,
            })}
            disabled={editarMutation.isPending}
            className="btn-primary w-full disabled:opacity-40"
          >{editarMutation.isPending ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </Modal>

      <Modal isOpen={showEventoModal}
             onClose={() => { setShowEventoModal(false); setEventoError('') }}
             title="REGISTRAR EVENTO">
        <EventoForm
          onSubmit={eventoMutation.mutate}
          loading={eventoMutation.isPending}
          error={eventoError}
          partido={partido}
        />
      </Modal>
    </div>
  )
}

// ── Card de Jornada ───────────────────────────────────────────────────────────

function JornadaCard({ jornada, idCampeonato }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [showPartidoModal, setShowPartidoModal] = useState(false)
  const [partidoError, setPartidoError] = useState('')

  const { data: jornadaDetalle } = useQuery({
    queryKey: ['jornada', jornada.idJornada],
    queryFn:  () => api.get(`/jornadas/${jornada.idJornada}`).then(r => r.data),
    enabled:  expanded,
  })

  const agregarPartidoMutation = useMutation({
    mutationFn: (data) => api.post(`/jornadas/${jornada.idJornada}/partidos`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornada', jornada.idJornada] })
      queryClient.invalidateQueries({ queryKey: ['jornadas', idCampeonato] })
      setShowPartidoModal(false)
      setPartidoError('')
    },
    onError: (err) => setPartidoError(err.response?.data?.error || 'Error al agregar partido.'),
  })

  const eliminarJornadaMutation = useMutation({
    mutationFn: () => api.delete(`/jornadas/${jornada.idJornada}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jornadas', idCampeonato] }),
    onError: (err) => alert(err.response?.data?.error || 'No se puede eliminar.'),
  })

  const partidos = jornadaDetalle?.partidos ?? []

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">Jornada {jornada.numero}</span>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{jornada.instancia}</span>
          {jornada.grupo && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Grupo {jornada.grupo}</span>}
          <span className="text-xs text-gray-600">{jornada.totalPartidos} partido{jornada.totalPartidos !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={e => {
              e.stopPropagation()
              if (confirm(`¿Eliminar Jornada ${jornada.numero}?`))
                eliminarJornadaMutation.mutate()
            }}
            className="text-gray-600 hover:text-red-400 transition-colors text-xs"
          >Eliminar</button>
          <span className="text-gray-500 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          {partidos.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No hay partidos en esta jornada.</p>
          ) : (
            partidos.map(p => (
              <PartidoCard key={p.idPartido} partido={p} idCampeonato={idCampeonato} />
            ))
          )}
          <button
            onClick={() => setShowPartidoModal(true)}
            className="w-full border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 text-sm py-2 rounded-lg transition-colors"
          >+ Agregar partido</button>
        </div>
      )}

      <Modal isOpen={showPartidoModal}
             onClose={() => { setShowPartidoModal(false); setPartidoError('') }}
             title="NUEVO PARTIDO">
        <PartidoForm
          onSubmit={agregarPartidoMutation.mutate}
          loading={agregarPartidoMutation.isPending}
          error={partidoError}
          idCampeonato={idCampeonato}
        />
      </Modal>
    </div>
  )
}

// ── Tabla de posiciones de un grupo ──────────────────────────────────────────

function TablaPosiciones({ idGrupo, idCampeonato }) {
  const queryClient = useQueryClient()
  const [showCalendarioModal, setShowCalendarioModal] = useState(false)
  const [showAsignarModal, setShowAsignarModal]       = useState(false)
  const [calendarioError, setCalendarioError]         = useState('')
  const [asignarError, setAsignarError]               = useState('')
  const [equipoSel, setEquipoSel]                     = useState('')
  const [calendarioForm, setCalendarioForm] = useState({
    idInstancia: '', idArbitro: '', idEstadio: '',
    fechaInicio: '', diasEntreJornadas: 7, idaYVuelta: false
  })

  const { data: grupo, isLoading } = useQuery({
    queryKey: ['grupo', idGrupo],
    queryFn:  () => api.get(`/grupos/${idGrupo}`).then(r => r.data),
  })
  const { data: camp } = useQuery({
    queryKey: ['campeonato', idCampeonato],
    queryFn:  () => api.get(`/campeonatos/${idCampeonato}`).then(r => r.data),
  })
  const { data: instancias = [] } = useQuery({
    queryKey: ['instancias'],
    queryFn:  () => api.get('/catalogos/instancias').then(r => r.data),
    enabled:  showCalendarioModal,
  })
  const { data: estadios = [] } = useQuery({
    queryKey: ['estadios'],
    queryFn:  () => api.get('/estadios').then(r => r.data),
    enabled:  showCalendarioModal,
  })
  const { data: arbitros = [] } = useQuery({
    queryKey: ['arbitros'],
    queryFn:  () => api.get('/arbitros').then(r => r.data),
    enabled:  showCalendarioModal,
  })

  const equiposInscritos   = camp?.equipos ?? []
  const equiposEnGrupo     = grupo?.equipos?.map(e => e.idEquipo) ?? []
  const equiposDisponibles = equiposInscritos.filter(e => !equiposEnGrupo.includes(e.idEquipo))

  const asignarMutation = useMutation({
    mutationFn: (idEquipo) => api.post(`/grupos/${idGrupo}/equipos/${idEquipo}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupo', idGrupo] })
      setShowAsignarModal(false); setEquipoSel(''); setAsignarError('')
    },
    onError: (err) => setAsignarError(err.response?.data?.error || 'Error al asignar equipo.'),
  })

  const removerMutation = useMutation({
    mutationFn: (idEquipo) => api.delete(`/grupos/${idGrupo}/equipos/${idEquipo}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grupo', idGrupo] }),
    onError: (err) => alert(err.response?.data?.error || 'No se puede remover.'),
  })

  const calendarioMutation = useMutation({
    mutationFn: (data) => api.post(`/grupos/${idGrupo}/calendario`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['jornadas', String(idCampeonato)] })
      setShowCalendarioModal(false)
      setCalendarioError('')
      alert(res.data.mensaje)
    },
    onError: (err) => setCalendarioError(err.response?.data?.error || 'Error al generar calendario.'),
  })

  const setC = (k, v) => setCalendarioForm(f => ({ ...f, [k]: v }))

  if (isLoading) return <div className="text-gray-500 text-sm text-center py-4">Cargando grupo...</div>
  if (!grupo) return null

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden mb-4">
      {/* Header grupo */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/30">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">Grupo {grupo.nombre}</span>
          <span className="text-xs text-gray-500">{grupo.equipos?.length ?? 0} equipos</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAsignarModal(true)}
            className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
          >+ Equipo</button>
          <button
            onClick={() => setShowCalendarioModal(true)}
            disabled={(grupo.equipos?.length ?? 0) < 2}
            className="text-xs px-3 py-1.5 rounded border border-blue-800 text-blue-400 hover:bg-blue-900/20 transition-colors disabled:opacity-40"
          >📅 Generar calendario</button>
        </div>
      </div>

      {/* Equipos asignados */}
      {grupo.equipos?.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800 flex flex-wrap gap-2">
          {grupo.equipos.map(e => (
            <div key={e.idEquipo} className="flex items-center gap-1.5 bg-gray-800 rounded px-2 py-1 text-xs">
              <span className="text-gray-300">{e.nombre}</span>
              <button
                onClick={() => { if (confirm(`¿Remover ${e.nombre} del grupo?`)) removerMutation.mutate(e.idEquipo) }}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de posiciones */}
      {grupo.posiciones?.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS'].map(h => (
                <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupo.posiciones.map(p => (
              <tr key={p.idEquipo}
                className={`border-b border-gray-800/50 transition-colors ${
                  p.clasificado ? 'bg-green-900/10 hover:bg-green-900/20' : 'hover:bg-gray-800/30'
                }`}>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">{p.posicion}</span>
                    {p.clasificado && <span className="text-green-400 text-xs">✓</span>}
                  </div>
                </td>
                <td className="px-3 py-2 text-white font-medium">{p.equipo}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pj}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pg}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pe}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pp}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.gf}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.gc}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.dg > 0 ? `+${p.dg}` : p.dg}</td>
                <td className="px-3 py-2 text-white font-bold text-center">{p.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">Sin partidos jugados aún.</p>
          <p className="text-gray-600 text-xs mt-1">La tabla se actualizará automáticamente al marcar partidos como jugados.</p>
        </div>
      )}

      {/* Modal asignar equipo */}
      <Modal isOpen={showAsignarModal}
             onClose={() => { setShowAsignarModal(false); setEquipoSel(''); setAsignarError('') }}
             title={`AGREGAR EQUIPO — GRUPO ${grupo.nombre}`}>
        <div className="space-y-4">
          <select className="input-field" value={equipoSel} onChange={e => setEquipoSel(e.target.value)}>
            <option value="">Seleccionar equipo...</option>
            {equiposDisponibles.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
          </select>
          {equiposDisponibles.length === 0 && (
            <p className="text-gray-500 text-sm text-center">Todos los equipos inscritos ya están asignados a un grupo.</p>
          )}
          {asignarError && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{asignarError}</div>}
          <button
            onClick={() => equipoSel && asignarMutation.mutate(parseInt(equipoSel))}
            disabled={!equipoSel || asignarMutation.isPending}
            className="btn-primary w-full disabled:opacity-40"
          >{asignarMutation.isPending ? 'Asignando...' : 'Asignar al grupo'}</button>
        </div>
      </Modal>

      {/* Modal generar calendario */}
      <Modal isOpen={showCalendarioModal}
             onClose={() => { setShowCalendarioModal(false); setCalendarioError('') }}
             title={`GENERAR CALENDARIO — GRUPO ${grupo.nombre}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Instancia</label>
            <select className="input-field" value={calendarioForm.idInstancia}
              onChange={e => setC('idInstancia', e.target.value)}>
              <option value="">Seleccionar...</option>
              {instancias.map(i => <option key={i.idInstancia} value={i.idInstancia}>{i.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Estadio <span className="text-gray-600">(opcional)</span></label>
              <select className="input-field" value={calendarioForm.idEstadio}
                onChange={e => setC('idEstadio', e.target.value)}>
                <option value="">Sin asignar</option>
                {estadios.map(e => <option key={e.idEstadio} value={e.idEstadio}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Árbitro <span className="text-gray-600">(opcional)</span></label>
              <select className="input-field" value={calendarioForm.idArbitro}
                onChange={e => setC('idArbitro', e.target.value)}>
                <option value="">Sin asignar</option>
                {arbitros.map(a => <option key={a.idArbitro} value={a.idArbitro}>{a.apellido}, {a.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha inicio</label>
              <input type="date" className="input-field" value={calendarioForm.fechaInicio}
                onChange={e => setC('fechaInicio', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Días entre jornadas</label>
              <input type="number" className="input-field" value={calendarioForm.diasEntreJornadas}
                min="1" max="30" onChange={e => setC('diasEntreJornadas', parseInt(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-lg">
            <input type="checkbox" id="idaYVuelta" checked={calendarioForm.idaYVuelta ?? false}
              onChange={e => setC('idaYVuelta', e.target.checked)}
              className="w-4 h-4 accent-brand-400" />
            <div>
              <label htmlFor="idaYVuelta" className="text-white text-sm cursor-pointer">Ida y vuelta</label>
              <p className="text-gray-500 text-xs">Genera dos rondas: en la segunda se invierten local y visitante.</p>
            </div>
          </div>
          {calendarioError && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{calendarioError}</div>}
          <button
            onClick={() => calendarioMutation.mutate({
              idInstancia:       parseInt(calendarioForm.idInstancia),
              idArbitro:         calendarioForm.idArbitro ? parseInt(calendarioForm.idArbitro) : null,
              idEstadio:         calendarioForm.idEstadio ? parseInt(calendarioForm.idEstadio) : null,
              fechaInicio:       calendarioForm.fechaInicio,
              diasEntreJornadas: calendarioForm.diasEntreJornadas,
              idaYVuelta:        calendarioForm.idaYVuelta ?? false,
            })}
            disabled={calendarioMutation.isPending || !calendarioForm.idInstancia || !calendarioForm.fechaInicio}
            className="btn-primary w-full disabled:opacity-40"
          >{calendarioMutation.isPending ? 'Generando...' : '📅 Generar calendario completo'}</button>
        </div>
      </Modal>
    </div>
  )
}

function TablaCampeonato({ idCampeonato }) {
  const { data: posiciones = [], isLoading } = useQuery({
    queryKey: ['posiciones-campeonato', idCampeonato],
    queryFn:  () => api.get(`/campeonatos/${idCampeonato}/posiciones`).then(r => r.data),
  })

  if (isLoading) return <div className="card text-gray-500 text-sm text-center py-4">Cargando tabla...</div>

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs text-gray-500 uppercase tracking-wider">Tabla general</h2>
        <span className="text-xs text-gray-500">Todos contra todos</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS'].map(h => (
                <th key={h} className="text-xs text-gray-500 uppercase tracking-wider px-3 py-2 text-center first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posiciones.map(p => (
              <tr key={p.idEquipo} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-3 py-2 text-gray-400 text-xs">{p.posicion}</td>
                <td className="px-3 py-2 text-white font-medium">{p.equipo}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pj}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pg}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pe}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.pp}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.gf}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.gc}</td>
                <td className="px-3 py-2 text-gray-400 text-center">{p.dg}</td>
                <td className="px-3 py-2 text-white font-semibold text-center">{p.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CampeonatoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [tab, setTab]                           = useState('equipos')
  const [showAgregar, setShowAgregar]           = useState(false)
  const [equiposSel, setEquiposSel]             = useState([])
  const [showJornadaModal, setShowJornadaModal] = useState(false)
  const [jornadaError, setJornadaError]         = useState('')
  const [showGrupoModal, setShowGrupoModal]     = useState(false)
  const [grupoNombre, setGrupoNombre]           = useState('')
  const [grupoError, setGrupoError]             = useState('')

  const { data: camp, isLoading, isError } = useQuery({
    queryKey: ['campeonato', id],
    queryFn:  () => api.get(`/campeonatos/${id}`).then(r => r.data),
  })

  const { data: jornadas = [] } = useQuery({
    queryKey: ['jornadas', id],
    queryFn:  () => api.get(`/campeonatos/${id}/jornadas`).then(r => r.data),
    enabled:  tab === 'jornadas',
  })

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos', id],
    queryFn:  () => api.get(`/campeonatos/${id}/grupos`).then(r => r.data),
    enabled:  tab === 'grupos',
  })

  const { data: todosEquipos = [] } = useQuery({
    queryKey: ['equipos'],
    queryFn:  () => api.get('/equipos').then(r => r.data),
    enabled:  showAgregar,
  })

  const equiposInscritos   = camp?.equipos ?? []
  const idsInscritos       = new Set(equiposInscritos.map(e => e.idEquipo))
  const equiposDisponibles = todosEquipos.filter(e => !idsInscritos.has(e.idEquipo))

  const agregarEquipoMutation = useMutation({
    mutationFn: async (idsEquipo) => {
      const resultados = await Promise.allSettled(
        idsEquipo.map(idEquipo => api.post(`/campeonatos/${id}/equipos/${idEquipo}`))
      )
      return {
        agregados: resultados.filter(resultado => resultado.status === 'fulfilled').length,
        fallidos: resultados
          .filter(resultado => resultado.status === 'rejected')
          .map(resultado => resultado.reason?.response?.data?.error || 'Error al agregar equipo.'),
      }
    },
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ['campeonato', id] })
      setShowAgregar(false); setEquiposSel([])
      if (resultado.fallidos.length > 0) {
        alert(`${resultado.agregados} equipo(s) agregado(s). ${resultado.fallidos.join(' ')}`)
      }
    },
    onError: (err) => alert(err.response?.data?.error || 'Error al agregar equipo.'),
  })

  const removerEquipoMutation = useMutation({
    mutationFn: (idEquipo) => api.delete(`/campeonatos/${id}/equipos/${idEquipo}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campeonato', id] }),
    onError: (err) => alert(err.response?.data?.error || 'No se puede remover el equipo.'),
  })

  const crearJornadaMutation = useMutation({
    mutationFn: (data) => api.post(`/campeonatos/${id}/jornadas`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornadas', id] })
      setShowJornadaModal(false); setJornadaError('')
    },
    onError: (err) => setJornadaError(err.response?.data?.error || 'Error al crear jornada.'),
  })

  const crearGrupoMutation = useMutation({
    mutationFn: (nombre) => api.post(`/campeonatos/${id}/grupos`, { nombre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos', id] })
      setShowGrupoModal(false); setGrupoNombre(''); setGrupoError('')
    },
    onError: (err) => setGrupoError(err.response?.data?.error || 'Error al crear grupo.'),
  })

  if (isLoading) return <div className="p-8 text-gray-500 text-center py-24">Cargando campeonato...</div>
  if (isError || !camp) return (
    <div className="p-8 text-center py-24">
      <p className="text-red-400 mb-4">No se encontró el campeonato.</p>
      <button onClick={() => navigate('/campeonatos')} className="btn-primary">← Volver</button>
    </div>
  )

  return (
    <div className="p-8 max-w-5xl">
      <button onClick={() => navigate('/campeonatos')}
        className="text-gray-500 hover:text-gray-300 text-sm mb-6 flex items-center gap-1.5 transition-colors">
        ← Campeonatos
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-white tracking-wide mb-2">{camp.nombre}</h1>
          <EstadoBadge estado={camp.estado} />
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Información general</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <InfoItem label="Año"       value={camp.anio} />
          <InfoItem label="Modalidad" value={camp.modalidad} />
          <InfoItem label="Tipo"      value={camp.tipoPartido} />
          <InfoItem label="Equipos"   value={`${equiposInscritos.length} inscritos`} />
          <InfoItem label="Inicio"    value={camp.fechaInicio} />
          <InfoItem label="Fin"       value={camp.fechaFin} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {[['equipos', '🛡️ Equipos'], ['grupos', '🏅 Grupos'], ['jornadas', '📅 Jornadas']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-brand-400 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab Equipos */}
      {tab === 'equipos' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider">Equipos inscritos</h2>
            {!showAgregar && (
              <button onClick={() => setShowAgregar(true)} className="btn-primary text-sm py-1.5 px-3">
                + Agregar equipo
              </button>
            )}
          </div>
          {showAgregar && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Seleccionar equipos</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900/60 p-2">
                  {equiposDisponibles.map(e => {
                    const seleccionado = equiposSel.includes(String(e.idEquipo))
                    return (
                      <label key={e.idEquipo}
                        className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                          seleccionado
                            ? 'border-brand-500/70 bg-brand-900/30 text-white'
                            : 'border-transparent text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                        }`}>
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => setEquiposSel(actual => seleccionado
                            ? actual.filter(id => id !== String(e.idEquipo))
                            : [...actual, String(e.idEquipo)])}
                          className="h-4 w-4 accent-brand-500"
                        />
                        <span>{e.nombre}</span>
                      </label>
                    )
                  })}
                </div>
                {equiposSel.length > 0 && <p className="text-brand-400 text-xs mt-1">{equiposSel.length} equipo(s) seleccionado(s)</p>}
                {equiposDisponibles.length === 0 && <p className="text-gray-500 text-xs mt-1">Todos los equipos ya están inscritos.</p>}
              </div>
              <button onClick={() => equiposSel.length > 0 && agregarEquipoMutation.mutate(equiposSel.map(Number))}
                disabled={equiposSel.length === 0 || agregarEquipoMutation.isPending}
                className="btn-primary py-2 px-4 disabled:opacity-40">
                {agregarEquipoMutation.isPending ? 'Agregando...' : 'Agregar'}
              </button>
              <button onClick={() => { setShowAgregar(false); setEquiposSel([]) }}
                className="text-gray-500 hover:text-white transition-colors py-2 px-3 text-sm">
                Cancelar
              </button>
            </div>
          )}
          {equiposInscritos.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🛡️</p>
              <p className="text-gray-400 text-sm">No hay equipos inscritos.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['#', 'Equipo', 'País', ''].map(h => (
                    <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wider px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equiposInscritos.map((e, i) => (
                  <tr key={e.idEquipo} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-3 text-gray-600 text-sm">{i + 1}</td>
                    <td className="px-3 py-3 text-white font-medium">{e.nombre}</td>
                    <td className="px-3 py-3 text-gray-400 text-sm">{e.pais}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => { if (confirm(`¿Remover a ${e.nombre}?`)) removerEquipoMutation.mutate(e.idEquipo) }}
                        className="text-gray-600 hover:text-red-400 transition-colors text-sm">
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Grupos */}
      {tab === 'grupos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowGrupoModal(true)} className="btn-primary">
              + Nuevo Grupo
            </button>
          </div>
          {grupos.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🏅</p>
              <p className="text-gray-400 text-sm">No hay grupos creados.</p>
              <p className="text-gray-600 text-xs mt-1">Crea grupos para dividir los equipos y generar el calendario.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grupos.map(g => (
                <TablaPosiciones key={g.idGrupo} idGrupo={g.idGrupo} idCampeonato={id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Jornadas */}
      {tab === 'jornadas' && (
        <div>
          {camp.tipoPartido === 'Todos contra todos' && <TablaCampeonato idCampeonato={id} />}
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowJornadaModal(true)} className="btn-primary">
              + Nueva Jornada
            </button>
          </div>
          {jornadas.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-400 text-sm">No hay jornadas creadas.</p>
              <p className="text-gray-600 text-xs mt-1">Crea jornadas manualmente o genera el calendario desde la pestaña Grupos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jornadas.map(j => (
                <JornadaCard key={j.idJornada} jornada={j} idCampeonato={id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal nueva jornada */}
      <Modal isOpen={showJornadaModal}
             onClose={() => { setShowJornadaModal(false); setJornadaError('') }}
             title="NUEVA JORNADA">
        <JornadaForm
          onSubmit={crearJornadaMutation.mutate}
          loading={crearJornadaMutation.isPending}
          error={jornadaError}
          idCampeonato={id}
        />
      </Modal>

      {/* Modal nuevo grupo */}
      <Modal isOpen={showGrupoModal}
             onClose={() => { setShowGrupoModal(false); setGrupoNombre(''); setGrupoError('') }}
             title="NUEVO GRUPO">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre del grupo</label>
            <input className="input-field" value={grupoNombre}
              onChange={e => setGrupoNombre(e.target.value)}
              placeholder="A, B, C..." maxLength={10} />
          </div>
          {grupoError && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{grupoError}</div>}
          <button
            onClick={() => grupoNombre.trim() && crearGrupoMutation.mutate(grupoNombre.trim())}
            disabled={!grupoNombre.trim() || crearGrupoMutation.isPending}
            className="btn-primary w-full disabled:opacity-40"
          >{crearGrupoMutation.isPending ? 'Creando...' : 'Crear Grupo'}</button>
        </div>
      </Modal>
    </div>
  )
}
