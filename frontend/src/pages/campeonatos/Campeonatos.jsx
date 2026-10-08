import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api         from '../../services/api'
import PageHeader  from '../../components/PageHeader'
import Modal       from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import EmptyState  from '../../components/EmptyState'
import EstadoError from '../../components/EstadoError'
import MenuAcciones from '../../components/MenuAcciones'
import AccionesFormulario from '../../components/AccionesFormulario'
import { useAviso, useDialogos, mensajeDeError, erroresDe } from '../../feedback/contextos'
import { anioDe, formatearRango } from '../../utils/fechas'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

const ESTADOS = [
  ['Planificado', 'Planificado'],
  ['EnCurso',     'En curso'],
  ['Finalizado',  'Finalizado'],
]

// Mismo formulario para crear y editar. Al editar llega `inicial` y se muestra el estado.
function CampeonatoForm({ inicial, onSubmit, loading, error, textoGuardar }) {
  const id = useId()
  const edicion = !!inicial
  const [form, setForm] = useState(() => ({
    nombre:        inicial?.nombre ?? '',
    fechaInicio:   inicial?.fechaInicio ?? '',
    fechaFin:      inicial?.fechaFin ?? '',
    idTipoPartido: inicial?.idTipoPartido ?? '',
    idModalidad:   inicial?.idModalidad ?? '',
    estado:        inicial?.estado ?? 'Planificado',
  }))
  const [errorFechas, setErrorFechas] = useState('')

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

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k === 'fechaInicio' || k === 'fechaFin') setErrorFechas('')
  }

  const anio = anioDe(form.fechaInicio)

  const enviar = (e) => {
    e.preventDefault()
    if (form.fechaInicio && form.fechaFin && form.fechaFin <= form.fechaInicio) {
      setErrorFechas('La fecha de fin debe ser posterior a la de inicio.')
      return
    }
    // El año del campeonato es el de su fecha de inicio.
    const datos = {
      nombre:        form.nombre.trim(),
      anio,
      fechaInicio:   form.fechaInicio,
      fechaFin:      form.fechaFin,
      idTipoPartido: Number(form.idTipoPartido),
      idModalidad:   Number(form.idModalidad),
    }
    onSubmit(edicion ? { ...datos, estado: form.estado } : datos)
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-tipo`} className={labelClass}>
            Tipo
          </label>
          <select id={`${id}-tipo`} className="input-field" value={form.idTipoPartido} required
            onChange={e => set('idTipoPartido', e.target.value)}>
            <option value="">Seleccionar...</option>
            {tipos.map(t => (
              <option key={t.idTipoPartido} value={t.idTipoPartido}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-modalidad`} className={labelClass}>
            Modalidad
          </label>
          <select id={`${id}-modalidad`} className="input-field" value={form.idModalidad} required
            onChange={e => set('idModalidad', e.target.value)}>
            <option value="">Seleccionar...</option>
            {modalidades.map(m => (
              <option key={m.idModalidad} value={m.idModalidad}>{m.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            aria-invalid={!!errorFechas}
            aria-describedby={errorFechas ? `${id}-error-fechas` : undefined}
            onChange={e => set('fechaFin', e.target.value)} />
        </div>
      </div>
      {errorFechas
        ? <p id={`${id}-error-fechas`} role="alert" className="text-red-400 text-sm -mt-2">{errorFechas}</p>
        : <p className="text-gray-500 text-xs -mt-2">{anio ? `Año del campeonato: ${anio}.` : 'El año se toma de la fecha de inicio.'}</p>}
      {edicion && (
        <div>
          <label htmlFor={`${id}-estado`} className={labelClass}>
            Estado
          </label>
          <select id={`${id}-estado`} className="input-field" value={form.estado}
            onChange={e => set('estado', e.target.value)}>
            {ESTADOS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </div>
      )}
      {error && (
        <div role="alert" className="bg-red-900/30 border border-red-800 text-red-400
                        rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <AccionesFormulario guardando={loading} texto={textoGuardar} />
    </form>
  )
}

export default function Campeonatos() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const aviso       = useAviso()
  const { confirmar } = useDialogos()
  const [modal, setModal]         = useState(null)   // 'crear' | { editar: detalle }
  const [formError, setFormError] = useState('')
  const [abriendo, setAbriendo]   = useState(null)

  const { data: campeonatos = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['campeonatos'],
    queryFn:  () => api.get('/campeonatos').then(r => r.data),
  })

  const cerrarModal = () => { setModal(null); setFormError('') }

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/campeonatos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] })
      cerrarModal()
      aviso.exito('Campeonato creado.')
    },
    onError: (err) => setFormError(mensajeDeError(err, 'Error al guardar.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ idCampeonato, ...data }) => api.put(`/campeonatos/${idCampeonato}`, data),
    onSuccess: (_, { idCampeonato }) => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] })
      queryClient.invalidateQueries({ queryKey: ['campeonato', String(idCampeonato)] })
      cerrarModal()
      aviso.exito('Cambios guardados.')
    },
    onError: (err) => setFormError(mensajeDeError(err, 'Error al guardar los cambios.')),
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

  // La lista no trae tipo ni modalidad por id; se piden al abrir.
  const abrirEditar = async (c) => {
    setAbriendo(c.idCampeonato)
    try {
      const { data } = await api.get(`/campeonatos/${c.idCampeonato}`)
      setFormError('')
      setModal({ editar: data })
    } catch (err) {
      aviso.error(mensajeDeError(err, 'No se pudieron cargar los datos del campeonato. Inténtalo de nuevo.'))
    } finally {
      setAbriendo(null)
    }
  }

  const vacio = !isLoading && !isError && campeonatos.length === 0
  // La modalidad y el conteo de jornadas aparecen cuando la API los envíe (ver PENDIENTES_BACKEND.md).
  const conModalidad = campeonatos.some(c => c.modalidad)
  const columnas = ['Nombre', ...(conModalidad ? ['Modalidad'] : []), 'Tipo', 'Fechas', 'Equipos', 'Estado', '']

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="CAMPEONATOS"
        subtitle={!isLoading && !isError && !vacio ? `${campeonatos.length} registrados` : undefined}
        action={!vacio && (
          <button onClick={() => setModal('crear')} className="btn-primary">
            + Nuevo Campeonato
          </button>
        )}
      />

      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Cargando...</div>
      ) : isError ? (
        <EstadoError mensaje="No se pudieron cargar los campeonatos." onReintentar={refetch} reintentando={isFetching} />
      ) : vacio ? (
        <EmptyState
          icon="🏆"
          title="Sin campeonatos"
          description="Crea tu primer campeonato para comenzar a gestionar torneos."
          action={
            <button onClick={() => setModal('crear')} className="btn-primary">
              Crear campeonato
            </button>
          }
        />
      ) : (
        // «relative» para que el texto oculto del encabezado quede dentro del área con desplazamiento.
        <div className="card p-0 overflow-x-auto relative">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-800">
                {columnas.map(h => (
                  <th key={h || 'acciones'} className="text-left text-xs text-gray-400 uppercase
                                         tracking-wider px-5 py-3">
                    {h || <span className="sr-only">Acciones</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campeonatos.map(c => {
                const tieneJornadas = (c.totalJornadas ?? 0) > 0
                return (
                  <tr key={c.idCampeonato}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/campeonatos/${c.idCampeonato}`)}>
                    <td className="px-5 py-4 min-w-48">
                      <Link
                        to={`/campeonatos/${c.idCampeonato}`}
                        onClick={e => e.stopPropagation()}
                        className="text-white font-medium hover:text-brand-400 hover:underline underline-offset-4 transition-colors"
                      >
                        {c.nombre}
                      </Link>
                    </td>
                    {conModalidad && <td className="px-5 py-4 text-gray-400 text-sm">{c.modalidad}</td>}
                    <td className="px-5 py-4 text-gray-400 text-sm">{c.tipoPartido}</td>
                    <td className="px-5 py-4 text-gray-400 text-sm whitespace-nowrap">{formatearRango(c.fechaInicio, c.fechaFin)}</td>
                    <td className="px-5 py-4 text-gray-400 text-sm">{c.totalEquipos}</td>
                    <td className="px-5 py-4"><StatusBadge estado={c.estado} /></td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end">
                        {abriendo === c.idCampeonato
                          ? <span className="text-gray-500 text-xs px-2">Abriendo...</span>
                          : (
                            <MenuAcciones
                              etiqueta={`Acciones de ${c.nombre}`}
                              acciones={[
                                { texto: 'Ver campeonato', onClick: () => navigate(`/campeonatos/${c.idCampeonato}`) },
                                { texto: 'Editar', onClick: () => abrirEditar(c) },
                                {
                                  texto: 'Eliminar', peligro: true, onClick: () => eliminar(c),
                                  deshabilitado: tieneJornadas,
                                  motivo: 'Tiene jornadas registradas.',
                                },
                              ]}
                            />
                          )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal === 'crear'} onClose={cerrarModal} title="NUEVO CAMPEONATO">
        <CampeonatoForm
          onSubmit={createMutation.mutate}
          loading={createMutation.isPending}
          error={formError}
          textoGuardar="Crear campeonato"
        />
      </Modal>

      <Modal isOpen={!!modal?.editar} onClose={cerrarModal} title="EDITAR CAMPEONATO">
        {modal?.editar && (
          <CampeonatoForm
            key={modal.editar.idCampeonato}
            inicial={modal.editar}
            onSubmit={datos => updateMutation.mutate({ idCampeonato: modal.editar.idCampeonato, ...datos })}
            loading={updateMutation.isPending}
            error={formError}
            textoGuardar="Guardar cambios"
          />
        )}
      </Modal>
    </div>
  )
}
