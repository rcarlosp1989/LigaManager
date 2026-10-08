import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api         from '../../services/api'
import PageHeader  from '../../components/PageHeader'
import Modal       from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import EmptyState  from '../../components/EmptyState'
import EstadoError from '../../components/EstadoError'
import AccionesFormulario from '../../components/AccionesFormulario'
import { useAviso, useDialogos, mensajeDeError, erroresDe } from '../../feedback/contextos'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

function CampeonatoForm({ onSubmit, loading, error }) {
  const id = useId()
  const [form, setForm] = useState({
    nombre: '', anio: new Date().getFullYear(),
    fechaInicio: '', fechaFin: '', idTipoPartido: '', idModalidad: ''
  })

  const qTipos = useQuery({
    queryKey: ['tipos-partido'],
    queryFn:  () => api.get('/catalogos/tipos-partido').then(r => r.data),
  })
  const qModalidades = useQuery({
    queryKey: ['modalidades'],
    queryFn:  () => api.get('/catalogos/modalidades').then(r => r.data),
  })
  const tipos = qTipos.data ?? []
  const modalidades = qModalidades.data ?? []
  const catalogos = erroresDe(qTipos, qModalidades)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      {catalogos.hayError && (
        <EstadoError compacto mensaje="No se pudieron cargar los tipos y modalidades."
          onReintentar={catalogos.reintentar} reintentando={catalogos.reintentando} />
      )}
      <div>
        <label htmlFor={`${id}-nombre`} className={labelClass}>
          Nombre
        </label>
        <input id={`${id}-nombre`} className="input-field" value={form.nombre} required
          onChange={e => set('nombre', e.target.value)}
          placeholder="Copa Ecuador 2025" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-anio`} className={labelClass}>
            Año
          </label>
          <input id={`${id}-anio`} type="number" className="input-field" value={form.anio} required
            onChange={e => set('anio', parseInt(e.target.value))}
            min="2000" max="2100" />
        </div>
        <div>
          <label htmlFor={`${id}-tipo`} className={labelClass}>
            Tipo
          </label>
          <select id={`${id}-tipo`} className="input-field" value={form.idTipoPartido} required
            onChange={e => set('idTipoPartido', parseInt(e.target.value))}>
            <option value="">Seleccionar...</option>
            {tipos.map(t => (
              <option key={t.idTipoPartido} value={t.idTipoPartido}>{t.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-modalidad`} className={labelClass}>
          Modalidad
        </label>
        <select id={`${id}-modalidad`} className="input-field" value={form.idModalidad} required
          onChange={e => set('idModalidad', parseInt(e.target.value))}>
          <option value="">Seleccionar...</option>
          {modalidades.map(m => (
            <option key={m.idModalidad} value={m.idModalidad}>{m.nombre}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-inicio`} className={labelClass}>
            Inicio
          </label>
          <input id={`${id}-inicio`} type="date" className="input-field" value={form.fechaInicio} required
            onChange={e => set('fechaInicio', e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-fin`} className={labelClass}>
            Fin
          </label>
          <input id={`${id}-fin`} type="date" className="input-field" value={form.fechaFin} required
            onChange={e => set('fechaFin', e.target.value)} />
        </div>
      </div>
      {error && (
        <div role="alert" className="bg-red-900/30 border border-red-800 text-red-400
                        rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <AccionesFormulario guardando={loading} />
    </form>
  )
}

export default function Campeonatos() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const aviso       = useAviso()
  const { confirmar } = useDialogos()
  const [modal, setModal]       = useState(null)
  const [formError, setFormError] = useState('')

  const { data: campeonatos = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['campeonatos'],
    queryFn:  () => api.get('/campeonatos').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/campeonatos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] })
      setModal(null); setFormError('')
      aviso.exito('Campeonato creado.')
    },
    onError: (err) => setFormError(mensajeDeError(err, 'Error al guardar.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/campeonatos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] })
      aviso.exito('Campeonato eliminado.')
    },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se puede eliminar.')),
  })

  const eliminar = async (c) => {
    const ok = await confirmar({
      titulo: `¿Eliminar el campeonato «${c.nombre}»?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (ok) deleteMutation.mutate(c.idCampeonato)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="CAMPEONATOS"
        subtitle={!isLoading && !isError ? `${campeonatos.length} registrados` : undefined}
        action={
          <button onClick={() => setModal('create')} className="btn-primary">
            + Nuevo Campeonato
          </button>
        }
      />

      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Cargando...</div>
      ) : isError ? (
        <EstadoError mensaje="No se pudieron cargar los campeonatos." onReintentar={refetch} reintentando={isFetching} />
      ) : campeonatos.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Sin campeonatos"
          description="Crea tu primer campeonato para comenzar a gestionar torneos."
          action={
            <button onClick={() => setModal('create')} className="btn-primary">
              Crear Campeonato
            </button>
          }
        />
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-800">
                {['Nombre','Tipo','Año','Equipos','Estado',''].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 uppercase
                                         tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campeonatos.map(c => (
                <tr key={c.idCampeonato} className="table-row">
                  <td className="px-5 py-4 min-w-48">
                    <button
                      onClick={() => navigate(`/campeonatos/${c.idCampeonato}`)}
                      className="text-white font-medium hover:text-brand-400 transition-colors text-left"
                    >
                      {c.nombre}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{c.tipoPartido}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{c.anio}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{c.totalEquipos}</td>
                  <td className="px-5 py-4"><StatusBadge estado={c.estado} /></td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => eliminar(c)}
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

      <Modal isOpen={modal === 'create'}
             onClose={() => { setModal(null); setFormError('') }}
             title="NUEVO CAMPEONATO">
        <CampeonatoForm
          onSubmit={createMutation.mutate}
          loading={createMutation.isPending}
          error={formError}
        />
      </Modal>
    </div>
  )
}
