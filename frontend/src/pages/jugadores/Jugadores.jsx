import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api        from '../../services/api'
import PageHeader from '../../components/PageHeader'
import Modal      from '../../components/Modal'
import EmptyState from '../../components/EmptyState'
import UbicacionSelector from '../../components/UbicacionSelector'

const posiciones = [
  'Arquero', 'Defensa central', 'Lateral izquierdo', 'Lateral derecho',
  'Mediocentro', 'Mediocentro ofensivo', 'Pivote', 'Extremo izquierdo',
  'Extremo derecho', 'Delantero centro'
]

function calcularEdad(fechaNac) {
  if (!fechaNac) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNac)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const aunNoCumple = hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
  if (aunNoCumple) edad--
  return edad
}

// ── Formulario crear jugador ──────────────────────────────────────────────────

function JugadorForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', cedula: '', fechaNac: '', posicion: '', foto: null,
    idPais: '', idProvincia: '', idCanton: '', idEquipo: '', fechaDesde: new Date().toISOString().split('T')[0],
    dorsal: ''
  })

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos'],
    queryFn:  () => api.get('/equipos').then(r => r.data),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Posición</label>
          <select className="input-field" value={form.posicion} required onChange={e => set('posicion', e.target.value)}>
            <option value="">Seleccionar posición...</option>
            {posiciones.map(posicion => <option key={posicion} value={posicion}>{posicion}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre</label>
          <input className="input-field" value={form.nombre} required
            onChange={e => set('nombre', e.target.value)} placeholder="Juan" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Apellido</label>
          <input className="input-field" value={form.apellido} required
            onChange={e => set('apellido', e.target.value)} placeholder="Pérez" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Número de cédula</label>
        <input className="input-field" value={form.cedula} required maxLength="20"
          onChange={e => set('cedula', e.target.value)} placeholder="0102030405" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de nacimiento</label>
          <input type="date" className="input-field" value={form.fechaNac} required
            onChange={e => set('fechaNac', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Edad</label>
          <input className="input-field text-gray-400" value={calcularEdad(form.fechaNac) ?? '–'} disabled readOnly />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Dorsal <span className="text-gray-600">(opcional)</span></label>
          <input type="number" className="input-field" value={form.dorsal} min="1" max="99"
            onChange={e => set('dorsal', e.target.value)} placeholder="10" />
        </div>
      </div>
      <UbicacionSelector
        value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }}
        onChange={u => setForm(f => ({ ...f, ...u }))}
      />
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipo inicial</label>
        <select className="input-field" value={form.idEquipo} required
          onChange={e => set('idEquipo', parseInt(e.target.value))}>
          <option value="">Seleccionar equipo...</option>
          {equipos.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de inscripción</label>
        <input type="date" className="input-field" value={form.fechaDesde} required
          onChange={e => set('fechaDesde', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Foto del jugador <span className="text-gray-600">(opcional)</span></label>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="input-field"
          onChange={e => set('foto', e.target.files?.[0] ?? null)} />
        <p className="text-gray-500 text-xs mt-1">JPG, PNG o WEBP. Máximo 5 MB.</p>
      </div>
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Guardando...' : 'Registrar Jugador'}
      </button>
    </form>
  )
}

// ── Formulario editar jugador ─────────────────────────────────────────────────

function EditarJugadorForm({ jugador, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    nombre:   jugador.nombre,
    apellido: jugador.apellido,
    cedula:    jugador.cedula,
    posicion:  jugador.historial?.find(h => !h.fechaHasta)?.posicion ?? '',
    foto:      null,
    fechaNac: jugador.fechaNac,
    idPais:      jugador.idPais,
    idProvincia: jugador.idProvincia ?? '',
    idCanton:    jugador.idCanton ?? '',
    dorsal:   jugador.historial?.find(h => !h.fechaHasta)?.dorsal ?? '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre</label>
          <input className="input-field" value={form.nombre}
            onChange={e => set('nombre', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Apellido</label>
          <input className="input-field" value={form.apellido}
            onChange={e => set('apellido', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Posición</label>
        <select className="input-field" value={form.posicion} required onChange={e => set('posicion', e.target.value)}>
          <option value="">Seleccionar posición...</option>
          {posiciones.map(posicion => <option key={posicion} value={posicion}>{posicion}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Número de cédula</label>
        <input className="input-field" value={form.cedula} required maxLength="20"
          onChange={e => set('cedula', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Cambiar foto <span className="text-gray-600">(opcional)</span></label>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="input-field"
          onChange={e => set('foto', e.target.files?.[0] ?? null)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de nacimiento</label>
          <input type="date" className="input-field" value={form.fechaNac}
            onChange={e => set('fechaNac', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Edad</label>
          <input className="input-field text-gray-400" value={calcularEdad(form.fechaNac) ?? '–'} disabled readOnly />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Dorsal</label>
          <input type="number" className="input-field" value={form.dorsal} min="1" max="99"
            onChange={e => set('dorsal', e.target.value)} placeholder="10" />
        </div>
      </div>
      <UbicacionSelector
        value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }}
        onChange={u => setForm(f => ({ ...f, ...u }))}
      />
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <button
        onClick={() => onSubmit(form)}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Jugadores() {
  const queryClient = useQueryClient()
  const [modal, setModal]           = useState(false)
  const [editModal, setEditModal]   = useState(false)
  const [jugadorEdit, setJugadorEdit] = useState(null)
  const [formError, setFormError]   = useState('')
  const [editError, setEditError]   = useState('')
  const [search, setSearch]         = useState('')

  const { data: jugadores = [], isLoading } = useQuery({
    queryKey: ['jugadores'],
    queryFn:  () => api.get('/jugadores').then(r => r.data),
  })

  const filtered = jugadores.filter(j => {
    const texto = search.toLowerCase()
    return `${j.nombre} ${j.apellido}`.toLowerCase().includes(texto)
      || (j.equipoActual ?? '').toLowerCase().includes(texto)
  })

  const createMutation = useMutation({
    mutationFn: (data) => {
      const body = new FormData()
      const { idProvincia, ...resto } = data
      Object.entries({ ...resto, dorsal: data.dorsal ? parseInt(data.dorsal) : '' })
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .forEach(([key, value]) => key !== 'foto' && body.append(key, value))
      if (data.foto) body.append('foto', data.foto)
      return api.post('/jugadores', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jugadores'] })
      setModal(false); setFormError('')
    },
    onError: (err) => setFormError(err.response?.data?.error || 'Error al guardar.'),
  })

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const body = new FormData()
      Object.entries(data).forEach(([key, value]) => key !== 'foto' && key !== 'idProvincia' && body.append(key, value ?? ''))
      if (data.foto) body.append('foto', data.foto)
      return api.put(`/jugadores/${jugadorEdit.idJugador}`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jugadores'] })
      setEditModal(false); setEditError(''); setJugadorEdit(null)
    },
    onError: (err) => setEditError(err.response?.data?.error || 'Error al actualizar.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/jugadores/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jugadores'] }),
    onError: (err) => alert(err.response?.data?.error || 'No se puede eliminar.'),
  })

  const abrirEditar = async (j) => {
    const res = await api.get(`/jugadores/${j.idJugador}`)
    setJugadorEdit(res.data)
    setEditModal(true)
    setEditError('')
  }

  return (
    <div className="p-8">
      <PageHeader
        title="JUGADORES"
        subtitle={`${jugadores.length} registrados`}
        action={
          <button onClick={() => setModal(true)} className="btn-primary">
            + Nuevo Jugador
          </button>
        }
      />

      <div className="mb-5">
        <input
          className="input-field max-w-sm"
          placeholder="Buscar por nombre, apellido o equipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Cargando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👤" title="Sin jugadores"
          description="Registra el primer jugador del sistema."
          action={
            <button onClick={() => setModal(true)} className="btn-primary">
              Registrar Jugador
            </button>
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['#', 'Jugador', 'Ubicación', 'Edad', 'Posición', 'Equipo Actual', ''].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => (
                <tr key={j.idJugador} className="table-row">
                  <td className="px-5 py-4 text-gray-500 text-sm font-mono">
                    {j.dorsal ? `#${j.dorsal}` : '–'}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-white font-medium">{j.apellido}, {j.nombre}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{j.ubicacion}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{j.edad} años</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{j.posicion || 'Sin posición'}</td>
                  <td className="px-5 py-4">
                    {j.equipoActual ? (
                      <span className="badge bg-brand-900/40 text-brand-400 border border-brand-800">
                        {j.equipoActual}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-sm">Sin equipo</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-3">
                    <button
                      onClick={() => abrirEditar(j)}
                      className="text-gray-500 hover:text-blue-400 transition-colors text-sm"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar a ${j.nombre} ${j.apellido}?`))
                          deleteMutation.mutate(j.idJugador)
                      }}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear */}
      <Modal isOpen={modal} onClose={() => { setModal(false); setFormError('') }}
             title="NUEVO JUGADOR" maxWidth="max-w-lg">
        <JugadorForm onSubmit={createMutation.mutate}
          loading={createMutation.isPending} error={formError} />
      </Modal>

      {/* Modal editar */}
      <Modal isOpen={editModal} onClose={() => { setEditModal(false); setJugadorEdit(null) }}
             title="EDITAR JUGADOR" maxWidth="max-w-lg">
        {jugadorEdit && (
          <EditarJugadorForm
            jugador={jugadorEdit}
            onSubmit={updateMutation.mutate}
            loading={updateMutation.isPending}
            error={editError}
          />
        )}
      </Modal>
    </div>
  )
}
