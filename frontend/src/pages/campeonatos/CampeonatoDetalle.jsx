import { useState, useEffect } from 'react'
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
    Desierto:   'bg-gray-700/40 text-gray-300',
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


// ── Alineación (titulares/suplentes) y cambios de un partido ─────────────────

// Jugadores con dorsal primero y en orden numérico; sin dorsal, al final.
function ordenarPorDorsal(lista) {
  return [...lista].sort((a, b) => {
    if (a.dorsal == null && b.dorsal == null) return 0
    if (a.dorsal == null) return 1
    if (b.dorsal == null) return -1
    return a.dorsal - b.dorsal
  })
}

function FilaJugadorPlanilla({ jugador, enCancha, sinGoles, onQuitar, onEvento }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-300">
      <span className="truncate">
        {jugador.dorsal != null && <span className="text-gray-500 mr-1.5">({jugador.dorsal})</span>}
        {jugador.jugador}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {enCancha ? (
          <>
            <button title={sinGoles ? 'Este partido no admite goles' : 'Gol'} disabled={sinGoles}
              onClick={() => onEvento(jugador.idJugador, 'GOL')}
              className="opacity-70 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity">⚽</button>
            <button title={sinGoles ? 'Este partido no admite goles' : 'Gol en contra (suma al equipo rival, no cuenta como gol del jugador)'} disabled={sinGoles}
              onClick={() => onEvento(jugador.idJugador, 'GOL_EN_CONTRA')}
              className="opacity-70 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity">🥅</button>
            <button title="Tarjeta amarilla" onClick={() => onEvento(jugador.idJugador, 'TARJETA_AMARILLA')}
              className="opacity-70 hover:opacity-100 transition-opacity">🟨</button>
            <button title="Tarjeta roja" onClick={() => onEvento(jugador.idJugador, 'TARJETA_ROJA')}
              className="opacity-70 hover:opacity-100 transition-opacity">🟥</button>
          </>
        ) : (
          <span className="text-gray-600 italic">banca</span>
        )}
        <button onClick={() => onQuitar(jugador.idAlineacion)} className="text-gray-600 hover:text-red-400 transition-colors">✕</button>
      </div>
    </div>
  )
}

function AlineacionLado({ label, equipo, alineacion, enCanchaIds, sinGoles, onAgregar, onQuitar, onEvento, agregando }) {
  const [jugadoresSel, setJugadoresSel] = useState([])
  const [titular, setTitular]           = useState(true)

  const titulares = ordenarPorDorsal(alineacion.filter(a => a.titular))
  const suplentes = ordenarPorDorsal(alineacion.filter(a => !a.titular))
  const convocadosIds = new Set(alineacion.map(a => a.idJugador))
  const disponibles = ordenarPorDorsal((equipo?.jugadores ?? []).filter(j => !convocadosIds.has(j.idJugador)))
  const disponiblesIds = new Set(disponibles.map(j => String(j.idJugador)))
  // Si un jugador seleccionado deja de estar disponible (por ejemplo, ya fue convocado), se descarta.
  const seleccionados = jugadoresSel.filter(id => disponiblesIds.has(id))

  return (
    <div className="border border-gray-800 rounded-lg p-3">
      <p className="text-white text-sm font-medium mb-3">{label}</p>

      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Titulares ({titulares.length})</p>
      <div className="space-y-1 mb-3 min-h-[1.75rem]">
        {titulares.length === 0 && <span className="text-gray-600 text-xs">Sin titulares aún.</span>}
        {titulares.map(a => (
          <FilaJugadorPlanilla key={a.idAlineacion} jugador={a} enCancha={enCanchaIds.has(a.idJugador)} sinGoles={sinGoles}
            onQuitar={onQuitar} onEvento={onEvento} />
        ))}
      </div>

      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Suplentes ({suplentes.length})</p>
      <div className="space-y-1 mb-3 min-h-[1.75rem]">
        {suplentes.length === 0 && <span className="text-gray-600 text-xs">Sin suplentes aún.</span>}
        {suplentes.map(a => (
          <FilaJugadorPlanilla key={a.idAlineacion} jugador={a} enCancha={enCanchaIds.has(a.idJugador)} sinGoles={sinGoles}
            onQuitar={onQuitar} onEvento={onEvento} />
        ))}
      </div>

      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Convocar jugadores</p>
      <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900/60 p-2 mb-2">
        {disponibles.map(j => {
          const id = String(j.idJugador)
          const marcado = seleccionados.includes(id)
          return (
            <label key={j.idJugador}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                marcado
                  ? 'border-brand-500/70 bg-brand-900/30 text-white'
                  : 'border-transparent text-gray-300 hover:border-gray-600 hover:bg-gray-800'
              }`}>
              <input type="checkbox" checked={marcado} className="h-3.5 w-3.5 accent-brand-500"
                onChange={() => setJugadoresSel(actual => marcado ? actual.filter(x => x !== id) : [...actual, id])} />
              <span>{j.dorsal != null && <span className="text-gray-500">({j.dorsal}) </span>}{j.apellido}, {j.nombre}</span>
            </label>
          )
        })}
        {disponibles.length === 0 && <span className="text-gray-600 text-xs px-1">No hay más jugadores disponibles.</span>}
      </div>
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <p className="text-brand-400 text-xs">{seleccionados.length > 0 ? `${seleccionados.length} seleccionado(s)` : ' '}</p>
        <div className="flex gap-1.5 shrink-0">
          {/* .input-field fuerza width:100%; se envuelve en un contenedor de ancho fijo para no pelear con esa clase. */}
          <div className="w-24 shrink-0">
            <select className="input-field text-sm" value={titular ? 'titular' : 'suplente'}
              onChange={e => setTitular(e.target.value === 'titular')}>
              <option value="titular">Titular</option>
              <option value="suplente">Suplente</option>
            </select>
          </div>
          <button
            onClick={() => { onAgregar(seleccionados.map(Number), titular); setJugadoresSel([]) }}
            disabled={seleccionados.length === 0 || agregando}
            className="shrink-0 text-xs px-3 rounded border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors disabled:opacity-40 whitespace-nowrap"
          >+ Agregar</button>
        </div>
      </div>
    </div>
  )
}

function pedirMinuto(tipoLabel) {
  const minutoStr = window.prompt(`Minuto del evento (${tipoLabel}):`, '')
  if (minutoStr === null) return null
  const minuto = parseInt(minutoStr)
  if (!minuto || minuto < 1 || minuto > 120) {
    alert('Minuto inválido. Debe ser un número entre 1 y 120.')
    return null
  }
  return minuto
}

function jugadoresEnCancha(alineacionEquipo, cambiosEquipo) {
  const enCancha = new Set(alineacionEquipo.filter(a => a.titular).map(a => a.idJugador))
  cambiosEquipo.forEach(c => enCancha.add(c.idJugadorEntra))
  cambiosEquipo.forEach(c => enCancha.delete(c.idJugadorSale))
  return alineacionEquipo.filter(a => enCancha.has(a.idJugador))
}

function AlineacionModal({ isOpen, onClose, partido, idCampeonato, onRegistrarEvento }) {
  const queryClient = useQueryClient()
  const fechaPartido = partido?.fecha?.slice(0, 10)
  const [cambioForm, setCambioForm] = useState({ idJugadorSale: '', idJugadorEntra: '', minuto: '' })
  const [error, setError] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [desierto, setDesierto]           = useState(false)
  const [perdidaReglamento, setPerdidaReglamento] = useState(false)
  const [idSancionado, setIdSancionado]   = useState('')
  const [guardadoOk, setGuardadoOk]       = useState(false)

  useEffect(() => {
    if (isOpen) {
      setObservaciones(partido?.observaciones ?? '')
      setDesierto(!!partido?.desierto)
      setPerdidaReglamento(!!partido?.perdidaReglamento)
      setIdSancionado(partido?.idEquipoSancionado ? String(partido.idEquipoSancionado) : '')
    } else {
      setGuardadoOk(false)
    }
  }, [isOpen, partido?.observaciones, partido?.desierto, partido?.perdidaReglamento, partido?.idEquipoSancionado])

  const { data: equipoLocal } = useQuery({
    queryKey: ['equipo', partido?.idEquipoLocal, fechaPartido],
    queryFn:  () => api.get(`/equipos/${partido.idEquipoLocal}`, { params: { fecha: fechaPartido } }).then(r => r.data),
    enabled:  isOpen && !!partido?.idEquipoLocal,
  })
  const { data: equipoVisitante } = useQuery({
    queryKey: ['equipo', partido?.idEquipoVisitante, fechaPartido],
    queryFn:  () => api.get(`/equipos/${partido.idEquipoVisitante}`, { params: { fecha: fechaPartido } }).then(r => r.data),
    enabled:  isOpen && !!partido?.idEquipoVisitante,
  })

  const alineacionLocal     = partido?.alineacionLocal ?? []
  const alineacionVisitante = partido?.alineacionVisitante ?? []
  const cambios             = partido?.cambios ?? []
  const cambiosLocal        = cambios.filter(c => c.idEquipo === partido?.idEquipoLocal)
  const cambiosVisitante    = cambios.filter(c => c.idEquipo === partido?.idEquipoVisitante)

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['jornada'] })

  const agregarMutation = useMutation({
    mutationFn: async ({ idsJugador, titular }) => {
      const resultados = await Promise.allSettled(
        idsJugador.map(idJugador => api.post(`/partidos/${partido.idPartido}/alineacion`, { idJugador, titular }))
      )
      return {
        agregados: resultados.filter(r => r.status === 'fulfilled').length,
        fallidos: resultados.filter(r => r.status === 'rejected').map(r => r.reason?.response?.data?.error || 'Error al agregar jugador.'),
      }
    },
    onSuccess: (resultado) => {
      invalidar()
      setError(resultado.fallidos.length > 0
        ? `${resultado.agregados} jugador(es) agregado(s). ${resultado.fallidos.join(' ')}`
        : '')
    },
    onError: (err) => setError(err.response?.data?.error || 'Error al agregar jugadores.'),
  })

  const quitarMutation = useMutation({
    mutationFn: (idAlineacion) => api.delete(`/alineacion/${idAlineacion}`),
    onSuccess: invalidar,
    onError: (err) => alert(err.response?.data?.error || 'No se puede quitar.'),
  })

  const cambioMutation = useMutation({
    mutationFn: (data) => api.post(`/partidos/${partido.idPartido}/cambios`, data),
    onSuccess: () => {
      invalidar()
      setCambioForm({ idJugadorSale: '', idJugadorEntra: '', minuto: '' })
      setError('')
    },
    onError: (err) => setError(err.response?.data?.error || 'Error al registrar cambio.'),
  })

  const eliminarCambioMutation = useMutation({
    mutationFn: (idCambio) => api.delete(`/cambios/${idCambio}`),
    onSuccess: invalidar,
    onError: (err) => alert(err.response?.data?.error || 'No se puede eliminar.'),
  })

  const planillaMutation = useMutation({
    mutationFn: (data) => api.put(`/partidos/${partido.idPartido}/planilla`, data),
    onSuccess: () => {
      invalidar()
      queryClient.invalidateQueries({ queryKey: ['grupo'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-campeonato', idCampeonato] })
      setError('')
      setGuardadoOk(true)
    },
    onError: (err) => {
      setGuardadoOk(false)
      setError(err.response?.data?.error || 'Error al guardar la planilla.')
    },
  })

  if (!isOpen || !partido) return null

  const enCanchaLocal     = ordenarPorDorsal(jugadoresEnCancha(alineacionLocal, cambiosLocal))
  const enCanchaVisitante = ordenarPorDorsal(jugadoresEnCancha(alineacionVisitante, cambiosVisitante))
  const enCanchaLocalIds     = new Set(enCanchaLocal.map(a => a.idJugador))
  const enCanchaVisitanteIds = new Set(enCanchaVisitante.map(a => a.idJugador))

  const tiposEvento = { GOL: 'gol', GOL_EN_CONTRA: 'gol en contra', TARJETA_AMARILLA: 'amarilla', TARJETA_ROJA: 'roja' }
  const onEvento = (idJugador, tipoEvento) => {
    const minuto = pedirMinuto(tiposEvento[tipoEvento])
    if (minuto === null) return
    onRegistrarEvento({ idJugador, tipoEvento, minuto })
  }

  const entradosLocal     = new Set(cambiosLocal.map(c => c.idJugadorEntra))
  const entradosVisitante = new Set(cambiosVisitante.map(c => c.idJugadorEntra))
  const suplentesDisponiblesLocal     = ordenarPorDorsal(alineacionLocal.filter(a => !a.titular && !entradosLocal.has(a.idJugador)))
  const suplentesDisponiblesVisitante = ordenarPorDorsal(alineacionVisitante.filter(a => !a.titular && !entradosVisitante.has(a.idJugador)))

  const saleEsLocal = enCanchaLocal.some(a => a.idJugador === parseInt(cambioForm.idJugadorSale))
  const suplentesParaEntrar = cambioForm.idJugadorSale
    ? (saleEsLocal ? suplentesDisponiblesLocal : suplentesDisponiblesVisitante)
    : []

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setError('') }} title="PLANILLA DEL PARTIDO" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AlineacionLado
            label={`🏠 ${partido.equipoLocal}`}
            equipo={equipoLocal}
            alineacion={alineacionLocal}
            enCanchaIds={enCanchaLocalIds}
            sinGoles={partido.desierto || partido.perdidaReglamento}
            onAgregar={(idsJugador, titular) => agregarMutation.mutate({ idsJugador, titular })}
            onQuitar={(id) => quitarMutation.mutate(id)}
            onEvento={onEvento}
            agregando={agregarMutation.isPending}
          />
          <AlineacionLado
            label={`✈️ ${partido.equipoVisitante}`}
            equipo={equipoVisitante}
            alineacion={alineacionVisitante}
            enCanchaIds={enCanchaVisitanteIds}
            sinGoles={partido.desierto || partido.perdidaReglamento}
            onAgregar={(idsJugador, titular) => agregarMutation.mutate({ idsJugador, titular })}
            onQuitar={(id) => quitarMutation.mutate(id)}
            onEvento={onEvento}
            agregando={agregarMutation.isPending}
          />
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Cambios registrados</p>
          <div className="space-y-1.5 mb-3">
            {cambios.length === 0 && <p className="text-gray-600 text-xs">Sin cambios registrados.</p>}
            {cambios.map(c => (
              <div key={c.idCambio} className="flex items-center justify-between text-xs text-gray-400 bg-gray-800/40 rounded px-2 py-1.5">
                <span>min. {c.minuto} — <span className="text-red-400">↓ {c.jugadorSale}</span> / <span className="text-green-400">↑ {c.jugadorEntra}</span></span>
                <button onClick={() => eliminarCambioMutation.mutate(c.idCambio)} className="text-gray-600 hover:text-red-400 transition-colors ml-2">✕</button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Sale</label>
              <select className="input-field text-sm" value={cambioForm.idJugadorSale}
                onChange={e => setCambioForm(f => ({ ...f, idJugadorSale: e.target.value, idJugadorEntra: '' }))}>
                <option value="">Seleccionar...</option>
                {enCanchaLocal.length > 0 && (
                  <optgroup label={`🏠 ${partido.equipoLocal}`}>
                    {enCanchaLocal.map(a => <option key={a.idJugador} value={a.idJugador}>{a.dorsal != null ? `(${a.dorsal}) ` : ''}{a.jugador}</option>)}
                  </optgroup>
                )}
                {enCanchaVisitante.length > 0 && (
                  <optgroup label={`✈️ ${partido.equipoVisitante}`}>
                    {enCanchaVisitante.map(a => <option key={a.idJugador} value={a.idJugador}>{a.dorsal != null ? `(${a.dorsal}) ` : ''}{a.jugador}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Entra</label>
              <select className="input-field text-sm" value={cambioForm.idJugadorEntra}
                disabled={!cambioForm.idJugadorSale}
                onChange={e => setCambioForm(f => ({ ...f, idJugadorEntra: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {suplentesParaEntrar.map(a => <option key={a.idJugador} value={a.idJugador}>{a.dorsal != null ? `(${a.dorsal}) ` : ''}{a.jugador}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="number" className="input-field text-sm flex-1" placeholder="Minuto" min="1" max="120"
              value={cambioForm.minuto} onChange={e => setCambioForm(f => ({ ...f, minuto: e.target.value }))} />
            <button
              onClick={() => cambioMutation.mutate({
                idJugadorSale:  parseInt(cambioForm.idJugadorSale),
                idJugadorEntra: parseInt(cambioForm.idJugadorEntra),
                minuto:         parseInt(cambioForm.minuto),
              })}
              disabled={cambioMutation.isPending || !cambioForm.idJugadorSale || !cambioForm.idJugadorEntra || !cambioForm.minuto}
              className="text-xs px-4 rounded border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors disabled:opacity-40 whitespace-nowrap"
            >🔄 Registrar cambio</button>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
              Observaciones <span className="text-gray-600">(opcional)</span>
            </label>
            <textarea className="input-field text-sm" rows={3} maxLength={2000}
              placeholder="Novedades o comentarios sobre el partido..."
              value={observaciones} onChange={e => { setObservaciones(e.target.value); setGuardadoOk(false) }} />
          </div>
          <label className="flex items-start gap-3 p-3 bg-gray-800/40 rounded-lg cursor-pointer">
            <input type="checkbox" checked={desierto} className="w-4 h-4 mt-0.5 accent-brand-400"
              onChange={e => {
                setDesierto(e.target.checked)
                if (e.target.checked) setPerdidaReglamento(false)
                setGuardadoOk(false)
              }} />
            <span>
              <span className="block text-white text-sm">Partido desierto</span>
              <span className="block text-gray-500 text-xs">
                Ningún equipo suma puntos. En la tabla de posiciones cada equipo suma 1 partido jugado,
                sin goles a favor ni en contra.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 p-3 bg-gray-800/40 rounded-lg cursor-pointer">
            <input type="checkbox" checked={perdidaReglamento} className="w-4 h-4 mt-0.5 accent-brand-400"
              onChange={e => {
                setPerdidaReglamento(e.target.checked)
                if (e.target.checked) setDesierto(false)
                setGuardadoOk(false)
              }} />
            <span>
              <span className="block text-white text-sm">Partido perdido por reglamento (3-0)</span>
              <span className="block text-gray-500 text-xs">
                El equipo que infringió el reglamento pierde 0-3. El rival suma 3 puntos y 3 goles a favor; el sancionado
                suma 3 goles en contra. Estos goles no se atribuyen a ningún jugador.
              </span>
            </span>
          </label>
          {perdidaReglamento && (
            <div className="ml-7">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipo que pierde por reglamento</label>
              <select className="input-field text-sm" value={idSancionado}
                onChange={e => { setIdSancionado(e.target.value); setGuardadoOk(false) }}>
                <option value="">Selecciona el equipo...</option>
                <option value={partido.idEquipoLocal}>{partido.equipoLocal}</option>
                <option value={partido.idEquipoVisitante}>{partido.equipoVisitante}</option>
              </select>
            </div>
          )}
          <button
            onClick={() => {
              if (perdidaReglamento && !idSancionado) { setError('Selecciona el equipo que pierde por reglamento.'); return }
              planillaMutation.mutate({
                observaciones: observaciones.trim() || null,
                desierto,
                perdidaReglamento,
                idEquipoSancionado: perdidaReglamento ? parseInt(idSancionado) : null,
              })
            }}
            disabled={planillaMutation.isPending}
            className="btn-primary w-full disabled:opacity-40"
          >{planillaMutation.isPending ? 'Guardando...' : 'Guardar observaciones y estado'}</button>
          {guardadoOk && <p className="text-green-400 text-xs text-center">✓ Guardado</p>}
        </div>

        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}
      </div>
    </Modal>
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
  const [showEditModal, setShowEditModal]             = useState(false)
  const [showAlineacionModal, setShowAlineacionModal] = useState(false)
  const [editError, setEditError]             = useState('')
  const [editForm, setEditForm] = useState({
    idEstadio:         partido.idEstadio ?? '',
    idArbitro:         partido.idArbitro ?? '',
    fecha:             partido.fecha ?? '',
    idEquipoLocal:     partido.idEquipoLocal ?? '',
    idEquipoVisitante: partido.idEquipoVisitante ?? '',
    oficiales:         Object.fromEntries((partido.oficiales ?? []).map(o => [o.idCargo, o.idArbitro])),
  })

  const { data: camp } = useQuery({
    queryKey: ['campeonato', idCampeonato],
    queryFn:  () => api.get(`/campeonatos/${idCampeonato}`).then(r => r.data),
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
  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos-oficiales', camp?.idModalidad],
    queryFn:  () => api.get(`/catalogos/cargos-oficiales?modalidadId=${camp.idModalidad}`).then(r => r.data),
    enabled:  showEditModal && !!camp?.idModalidad,
  })
  const faltanCargosObligatorios = cargos.some(cargo =>
    cargo.obligatorio && !editForm.oficiales[cargo.idCargo]
  )

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
    },
    onError: (err) => alert(err.response?.data?.error || 'Error al registrar evento.'),
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

  const eliminarPartidoMutation = useMutation({
    mutationFn: () => api.delete(`/partidos/${partido.idPartido}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornada', partido.idJornada] })
      queryClient.invalidateQueries({ queryKey: ['jornadas', idCampeonato] })
      queryClient.invalidateQueries({ queryKey: ['grupo'] })
      queryClient.invalidateQueries({ queryKey: ['posiciones-campeonato', idCampeonato] })
    },
    onError: (err) => alert(err.response?.data?.error || 'No se puede eliminar el partido.'),
  })

  const iconoEvento = {
    'GOL':              '⚽',
    'GOL_EN_CONTRA':    '🥅',
    'TARJETA_AMARILLA': '🟨',
    'TARJETA_ROJA':     '🟥',
  }

  const setE = (k, v) => setEditForm(f => ({ ...f, [k]: v }))
  const setEOficial = (idCargo, idArbitro) => setEditForm(f => ({
    ...f,
    oficiales: { ...f.oficiales, [idCargo]: idArbitro },
  }))
  const puedeEditarEquipos = partido.eventos?.length === 0 && !partido.jugado

  return (
    <div className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-white font-medium text-sm">{partido.equipoLocal}</span>
          {partido.jugado && !partido.desierto && (
            <span className="text-white font-display text-sm">
              {partido.golesLocal ?? 0} - {partido.golesVisitante ?? 0}
            </span>
          )}
          {partido.perdidaReglamento && <span className="text-amber-400 text-xs italic">por reglamento</span>}
          {partido.desierto && <span className="text-gray-500 text-xs italic">desierto</span>}
          {!partido.jugado && <span className="text-gray-600 text-xs">vs</span>}
          <span className="text-white font-medium text-sm">{partido.equipoVisitante}</span>
        </div>
        <div className="flex items-center gap-3">
          {partido.grupo && (
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
              {/^grupo\b/i.test(partido.grupo) ? partido.grupo : `Grupo ${partido.grupo}`}
            </span>
          )}
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

      {partido.observaciones && (
        <p className="mb-3 text-xs text-gray-400 italic whitespace-pre-line">📝 {partido.observaciones}</p>
      )}

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
              <span>{iconoEvento[ev.tipoEvento] ?? '📋'} {ev.jugador} {ev.tipoEvento === 'GOL_EN_CONTRA' && <span className="text-amber-500">(en contra)</span>} <span className="text-gray-600">min. {ev.minuto}</span></span>
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
          onClick={() => setShowAlineacionModal(true)}
          className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
        >📋 Planilla</button>
        <button
          onClick={() => {
            setEditForm({
              idEstadio:         partido.idEstadio ?? '',
              idArbitro:         partido.idArbitro ?? '',
              fecha:             partido.fecha ?? '',
              idEquipoLocal:     partido.idEquipoLocal ?? '',
              idEquipoVisitante: partido.idEquipoVisitante ?? '',
              oficiales:         Object.fromEntries((partido.oficiales ?? []).map(o => [o.idCargo, o.idArbitro])),
            })
            setShowEditModal(true)
          }}
          className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-blue-700 hover:text-blue-400 transition-colors"
        >✏️ Editar</button>
        <button
          onClick={() => {
            if (confirm(`¿Eliminar el partido ${partido.equipoLocal} vs ${partido.equipoVisitante}? Esto también borrará sus eventos registrados.`))
              eliminarPartidoMutation.mutate()
          }}
          disabled={eliminarPartidoMutation.isPending}
          className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-500 hover:border-red-800 hover:text-red-400 transition-colors"
        >🗑️ Eliminar</button>
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
          {puedeEditarEquipos && (
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
            <select className="input-field" value={editForm.idEstadio} required
              onChange={e => setE('idEstadio', e.target.value)}>
              <option value="">Seleccionar...</option>
              {estadios.map(e => <option key={e.idEstadio} value={e.idEstadio}>{e.nombre}</option>)}
            </select>
          </div>
          {cargos.length > 0 ? (
            <div className="space-y-3 border-t border-gray-800 pt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Designación del partido</p>
              {cargos.map(cargo => (
                <div key={cargo.idCargo}>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    {cargo.cargo} {cargo.obligatorio && <span className="text-amber-300">*</span>}
                  </label>
                  <select className="input-field" value={editForm.oficiales[cargo.idCargo] ?? ''}
                    onChange={e => setEOficial(cargo.idCargo, e.target.value)}>
                    <option value="">Sin asignar</option>
                    {arbitros.map(a => <option key={a.idArbitro} value={a.idArbitro}>{a.apellido}, {a.nombre}</option>)}
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Árbitro</label>
              <select className="input-field" value={editForm.idArbitro} required
                onChange={e => setE('idArbitro', e.target.value)}>
                <option value="">Seleccionar...</option>
                {arbitros.map(a => <option key={a.idArbitro} value={a.idArbitro}>{a.apellido}, {a.nombre}</option>)}
              </select>
            </div>
          )}
          {editError && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{editError}</div>}
          <button
            onClick={() => editarMutation.mutate({
              idEstadio:         editForm.idEstadio ? parseInt(editForm.idEstadio) : null,
              idArbitro:         parseInt(editForm.idArbitro || Object.values(editForm.oficiales).find(Boolean)),
              fecha:             editForm.fecha,
              idEquipoLocal:     puedeEditarEquipos && editForm.idEquipoLocal ? parseInt(editForm.idEquipoLocal) : null,
              idEquipoVisitante: puedeEditarEquipos && editForm.idEquipoVisitante ? parseInt(editForm.idEquipoVisitante) : null,
              oficiales:         Object.entries(editForm.oficiales)
                .filter(([, idArbitro]) => idArbitro)
                .map(([idCargo, idArbitro]) => ({ idCargo: parseInt(idCargo), idArbitro: parseInt(idArbitro) })),
            })}
            disabled={editarMutation.isPending || !editForm.idEstadio
              || (!editForm.idArbitro && !Object.values(editForm.oficiales).some(Boolean))
              || faltanCargosObligatorios}
            className="btn-primary w-full disabled:opacity-40"
          >{editarMutation.isPending ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </Modal>

      <AlineacionModal
        isOpen={showAlineacionModal}
        onClose={() => setShowAlineacionModal(false)}
        partido={partido}
        idCampeonato={idCampeonato}
        onRegistrarEvento={eventoMutation.mutate}
      />
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
          {jornada.equipoLibre && (
            <span className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/50 px-2 py-0.5 rounded">
              🛋️ Libre: {jornada.equipoLibre}
            </span>
          )}
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
          {jornadaDetalle?.equipoLibre && (
            <p className="text-amber-400 text-xs bg-amber-900/20 border border-amber-800/50 rounded px-3 py-2">
              🛋️ {jornadaDetalle.equipoLibre} queda libre en esta jornada.
            </p>
          )}
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

// ── Modal genérico para generar calendario automático ────────────────────────
// Reutilizable tanto a nivel de grupo (postUrl = /grupos/{id}/calendario) como
// a nivel de campeonato sin grupos (postUrl = /campeonatos/{id}/calendario).

function GenerarCalendarioModal({ isOpen, onClose, title, postUrl, minFecha, maxFecha, onGenerated }) {
  const [form, setForm] = useState({
    idInstancia: '', fechaInicio: '', diasEntreJornadas: 7, idaYVuelta: false
  })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { data: instancias = [] } = useQuery({
    queryKey: ['instancias'],
    queryFn:  () => api.get('/catalogos/instancias').then(r => r.data),
    enabled:  isOpen,
  })

  const calendarioMutation = useMutation({
    mutationFn: (data) => api.post(postUrl, data),
    onSuccess: (res) => { setError(''); onGenerated(res.data.mensaje) },
    onError: (err) => setError(err.response?.data?.error || 'Error al generar calendario.'),
  })

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setError('') }} title={title}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Instancia</label>
          <select className="input-field" value={form.idInstancia}
            onChange={e => set('idInstancia', e.target.value)}>
            <option value="">Seleccionar...</option>
            {instancias.map(i => <option key={i.idInstancia} value={i.idInstancia}>{i.nombre}</option>)}
          </select>
        </div>
        <p className="text-gray-500 text-xs -mt-2">
          El estadio y el árbitro se asignan después, al editar cada partido individualmente.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha inicio</label>
            <input type="date" className="input-field" value={form.fechaInicio}
              min={minFecha} max={maxFecha}
              onChange={e => set('fechaInicio', e.target.value)} />
            {minFecha && maxFecha && (
              <p className="text-gray-600 text-xs mt-1">Debe estar entre {minFecha} y {maxFecha}.</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Días entre jornadas</label>
            <input type="number" className="input-field" value={form.diasEntreJornadas}
              min="1" max="30" onChange={e => set('diasEntreJornadas', parseInt(e.target.value))} />
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-lg">
          <input type="checkbox" id="idaYVuelta" checked={form.idaYVuelta ?? false}
            onChange={e => set('idaYVuelta', e.target.checked)}
            className="w-4 h-4 accent-brand-400" />
          <div>
            <label htmlFor="idaYVuelta" className="text-white text-sm cursor-pointer">Ida y vuelta</label>
            <p className="text-gray-500 text-xs">Genera dos rondas: en la segunda se invierten local y visitante.</p>
          </div>
        </div>
        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}
        <button
          onClick={() => calendarioMutation.mutate({
            idInstancia:       parseInt(form.idInstancia),
            fechaInicio:       form.fechaInicio,
            diasEntreJornadas: form.diasEntreJornadas,
            idaYVuelta:        form.idaYVuelta ?? false,
          })}
          disabled={calendarioMutation.isPending || !form.idInstancia || !form.fechaInicio}
          className="btn-primary w-full disabled:opacity-40"
        >{calendarioMutation.isPending ? 'Generando...' : '📅 Generar calendario completo'}</button>
      </div>
    </Modal>
  )
}

// ── Tabla de posiciones de un grupo ──────────────────────────────────────────

function TablaPosiciones({ idGrupo, idCampeonato }) {
  const queryClient = useQueryClient()
  const [showCalendarioModal, setShowCalendarioModal] = useState(false)
  const [showAsignarModal, setShowAsignarModal]       = useState(false)
  const [asignarError, setAsignarError]               = useState('')
  const [equipoSel, setEquipoSel]                     = useState('')

  const { data: grupo, isLoading } = useQuery({
    queryKey: ['grupo', idGrupo],
    queryFn:  () => api.get(`/grupos/${idGrupo}`).then(r => r.data),
  })
  const { data: camp } = useQuery({
    queryKey: ['campeonato', idCampeonato],
    queryFn:  () => api.get(`/campeonatos/${idCampeonato}`).then(r => r.data),
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

      <GenerarCalendarioModal
        isOpen={showCalendarioModal}
        onClose={() => setShowCalendarioModal(false)}
        title={`GENERAR CALENDARIO — GRUPO ${grupo.nombre}`}
        postUrl={`/grupos/${idGrupo}/calendario`}
        minFecha={camp?.fechaInicio}
        maxFecha={camp?.fechaFin}
        onGenerated={(mensaje) => {
          queryClient.invalidateQueries({ queryKey: ['jornadas', String(idCampeonato)] })
          queryClient.invalidateQueries({ queryKey: ['grupo', idGrupo] })
          setShowCalendarioModal(false)
          alert(mensaje)
        }}
      />
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
  const [showCalendarioCampeonatoModal, setShowCalendarioCampeonatoModal] = useState(false)

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
              <p className="text-gray-600 text-xs mt-1">
                Crea grupos si vas a dividir por fases, o genera directamente el calendario de todos contra todos sin grupos.
              </p>
              <button
                onClick={() => setShowCalendarioCampeonatoModal(true)}
                disabled={(camp.equipos?.length ?? 0) < 2}
                className="mt-4 text-xs px-3 py-1.5 rounded border border-blue-800 text-blue-400 hover:bg-blue-900/20 transition-colors disabled:opacity-40"
              >📅 Generar calendario (todos contra todos)</button>
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

      <GenerarCalendarioModal
        isOpen={showCalendarioCampeonatoModal}
        onClose={() => setShowCalendarioCampeonatoModal(false)}
        title="GENERAR CALENDARIO — TODOS CONTRA TODOS"
        postUrl={`/campeonatos/${id}/calendario`}
        minFecha={camp.fechaInicio}
        maxFecha={camp.fechaFin}
        onGenerated={(mensaje) => {
          queryClient.invalidateQueries({ queryKey: ['jornadas', id] })
          queryClient.invalidateQueries({ queryKey: ['posiciones-campeonato', id] })
          setShowCalendarioCampeonatoModal(false)
          alert(mensaje)
        }}
      />
    </div>
  )
}
