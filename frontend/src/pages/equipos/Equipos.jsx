import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api        from '../../services/api'
import PageHeader from '../../components/PageHeader'
import Modal      from '../../components/Modal'
import EmptyState from '../../components/EmptyState'
import EstadoError from '../../components/EstadoError'
import MenuAcciones from '../../components/MenuAcciones'
import AccionesFormulario from '../../components/AccionesFormulario'
import { useAviso, useDialogos, mensajeDeError, erroresDe } from '../../feedback/contextos'

// Mismo formulario para crear y editar; al editar llega `inicial`.
function EquipoForm({ inicial, onSubmit, loading, error, textoGuardar = 'Guardar Equipo' }) {
  const id = useId()
  const [form, setForm] = useState(() => ({ nombre: inicial?.nombre ?? '', idPais: inicial?.idPais ?? '' }))
  const qPaises = useQuery({
    queryKey: ['paises'],
    queryFn:  () => api.get('/catalogos/paises').then(r => r.data),
  })
  const paises = qPaises.data ?? []
  const catalogos = erroresDe(qPaises)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ nombre: form.nombre.trim(), idPais: Number(form.idPais) }) }} className="space-y-4">
      {catalogos.hayError && (
        <EstadoError compacto mensaje="No se pudo cargar la lista de países."
          onReintentar={catalogos.reintentar} reintentando={catalogos.reintentando} />
      )}
      <div>
        <label htmlFor={`${id}-nombre`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
          Nombre del equipo
        </label>
        <input id={`${id}-nombre`} className="input-field" value={form.nombre} required
          onChange={e => set('nombre', e.target.value)}
          placeholder="Deportivo Quito FC" />
      </div>
      <div>
        <label htmlFor={`${id}-pais`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
          País
        </label>
        <select id={`${id}-pais`} className="input-field" value={form.idPais} required
          onChange={e => set('idPais', e.target.value)}>
          <option value="">Seleccionar país...</option>
          {paises.map(p => (
            <option key={p.idPais} value={p.idPais}>{p.nombre}</option>
          ))}
        </select>
      </div>
      {error && (
        <div role="alert" className="bg-red-900/30 border border-red-800 text-red-400
                        rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <AccionesFormulario guardando={loading} texto={textoGuardar} />
    </form>
  )
}

export default function Equipos() {
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [modal, setModal]         = useState(null)   // 'crear' | { editar: detalle }
  const [formError, setFormError] = useState('')
  const [abriendo, setAbriendo]   = useState(null)
  const cerrarModal = () => { setModal(null); setFormError('') }

  const { data: equipos = [], isLoading, isError, isSuccess, refetch, isFetching } = useQuery({
    queryKey: ['equipos'],
    queryFn:  () => api.get('/equipos').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/equipos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      cerrarModal()
      aviso.exito('Equipo creado.')
    },
    onError: (err) => setFormError(mensajeDeError(err, 'Error al guardar.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ idEquipo, ...data }) => api.put(`/equipos/${idEquipo}`, data),
    onSuccess: () => {
      // El nombre del equipo aparece en campeonatos, jornadas y reportes: se refresca todo.
      queryClient.invalidateQueries()
      cerrarModal()
      aviso.exito('Cambios guardados.')
    },
    onError: (err) => setFormError(mensajeDeError(err, 'Error al guardar los cambios.')),
  })

  // La lista trae el país por nombre; el formulario necesita su id.
  const abrirEditar = async (e) => {
    setAbriendo(e.idEquipo)
    try {
      const { data } = await api.get(`/equipos/${e.idEquipo}`)
      setFormError('')
      setModal({ editar: data })
    } catch (err) {
      aviso.error(mensajeDeError(err, 'No se pudieron cargar los datos del equipo. Inténtalo de nuevo.'))
    } finally {
      setAbriendo(null)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/equipos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      aviso.exito('Equipo eliminado.')
    },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se puede eliminar.')),
  })

  const eliminar = async (e) => {
    const ok = await confirmar({
      titulo: `¿Eliminar el equipo «${e.nombre}»?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (ok) deleteMutation.mutate(e.idEquipo)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="EQUIPOS"
        subtitle={!isLoading && !isError && equipos.length > 0 ? `${equipos.length} registrados` : undefined}
        action={!(isSuccess && equipos.length === 0) && (
          <button onClick={() => setModal('crear')} className="btn-primary">
            + Nuevo Equipo
          </button>
        )}
      />

      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Cargando...</div>
      ) : isError ? (
        <EstadoError mensaje="No se pudieron cargar los equipos." onReintentar={refetch} reintentando={isFetching} />
      ) : equipos.length === 0 ? (
        <EmptyState icon="🛡️" title="Sin equipos"
          description="Registra el primer equipo para comenzar."
          action={
            <button onClick={() => setModal('crear')} className="btn-primary">
              Crear equipo
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipos.map(e => (
            <div key={e.idEquipo} className="card flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-white font-semibold">{e.nombre}</h3>
                <p className="text-gray-400 text-sm mt-1">🌍 {e.pais}</p>
                <p className="text-gray-500 text-xs mt-2">
                  {e.totalJugadores} jugador{e.totalJugadores !== 1 ? 'es' : ''} activo{e.totalJugadores !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="-mr-2 -mt-2">
                {abriendo === e.idEquipo
                  ? <span className="text-gray-500 text-xs px-2">Abriendo...</span>
                  : (
                    <MenuAcciones
                      etiqueta={`Acciones de ${e.nombre}`}
                      acciones={[
                        { texto: 'Editar', onClick: () => abrirEditar(e) },
                        { texto: 'Eliminar', peligro: true, onClick: () => eliminar(e) },
                      ]}
                    />
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal === 'crear'} onClose={cerrarModal} title="NUEVO EQUIPO">
        <EquipoForm onSubmit={createMutation.mutate}
          loading={createMutation.isPending} error={formError} />
      </Modal>

      <Modal isOpen={!!modal?.editar} onClose={cerrarModal} title="EDITAR EQUIPO">
        {modal?.editar && (
          <EquipoForm
            key={modal.editar.idEquipo}
            inicial={modal.editar}
            onSubmit={datos => updateMutation.mutate({ idEquipo: modal.editar.idEquipo, ...datos })}
            loading={updateMutation.isPending}
            error={formError}
            textoGuardar="Guardar cambios"
          />
        )}
      </Modal>
    </div>
  )
}