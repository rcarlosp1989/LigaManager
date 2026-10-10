import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Modal from '../components/Modal'
import UbicacionSelector from '../components/UbicacionSelector'
import EstadoError from '../components/EstadoError'
import AccionesFormulario from '../components/AccionesFormulario'
import MenuAcciones from '../components/MenuAcciones'
import { useAviso, useDialogos, mensajeDeError } from '../feedback/contextos'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'
const VACIO = { nombre: '', idPais: '', idProvincia: '', idCanton: '' }

// standalone: true agrega su propio encabezado y padding (uso como página suelta);
// en false (por defecto) asume que el contenedor (ej. Mantenimiento) ya los provee.
export default function Estadios({ standalone = false }) {
  const fid = useId()
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [editando, setEditando] = useState(null)   // null: cerrado · 'nuevo' · objeto del estadio
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState('')
  const { data: estadios = [], isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ['estadios'], queryFn: () => api.get('/estadios').then(r => r.data) })

  const esNuevo = editando === 'nuevo'
  const cerrar = () => { setEditando(null); setError('') }
  const abrirNuevo = () => { setForm(VACIO); setError(''); setEditando('nuevo') }
  const abrirEditar = (e) => {
    setForm({ nombre: e.nombre, idPais: e.idPais ?? '', idProvincia: e.idProvincia ?? '', idCanton: e.idCanton ?? '' })
    setError(''); setEditando(e)
  }

  const guardar = useMutation({
    mutationFn: data => (esNuevo ? api.post('/estadios', data) : api.put(`/estadios/${editando.idEstadio}`, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estadios'] })
      aviso.exito(esNuevo ? 'Estadio registrado.' : 'Cambios guardados.')
      cerrar()
    },
    onError: err => setError(mensajeDeError(err, esNuevo ? 'Error al registrar estadio.' : 'Error al guardar los cambios.')),
  })
  const eliminar = useMutation({
    mutationFn: id => api.delete(`/estadios/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['estadios'] }); aviso.exito('Estadio eliminado.') },
    onError: err => aviso.error(mensajeDeError(err, 'No se pudo eliminar el estadio.')),
  })
  const pedirEliminar = async (e) => {
    const ok = await confirmar({
      titulo: `¿Eliminar el estadio «${e.nombre}»?`,
      mensaje: 'Si tiene partidos asignados no se podrá eliminar. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar', peligro: true,
    })
    if (ok) eliminar.mutate(e.idEstadio)
  }

  return <div className={standalone ? 'p-4 sm:p-6 lg:p-8' : ''}>
    <div className="flex items-center justify-between mb-5">
      <p className="text-gray-400 text-sm">{!isLoading && !isError ? `${estadios.length} disponibles` : ''}</p>
      <button className="btn-primary" onClick={abrirNuevo}>+ Nuevo estadio</button>
    </div>
    {isLoading ? (
      <div className="text-gray-500 text-center py-16">Cargando...</div>
    ) : isError ? (
      <EstadoError mensaje="No se pudieron cargar los estadios." onReintentar={refetch} reintentando={isFetching} />
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {estadios.map(e => (
          <div className="card flex items-start justify-between gap-3" key={e.idEstadio}>
            <div className="min-w-0">
              <h3 className="text-white font-semibold">{e.nombre}</h3>
              <p className="text-gray-400 text-sm mt-1">{[e.canton, e.provincia, e.pais].filter(Boolean).join(', ')}</p>
            </div>
            <MenuAcciones etiqueta={`Acciones de ${e.nombre}`} acciones={[
              { texto: 'Editar', onClick: () => abrirEditar(e) },
              { texto: 'Eliminar', peligro: true, onClick: () => pedirEliminar(e) },
            ]} />
          </div>
        ))}
      </div>
    )}
    <Modal isOpen={editando !== null} onClose={cerrar} title={esNuevo ? 'NUEVO ESTADIO' : 'EDITAR ESTADIO'}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); guardar.mutate({ nombre: form.nombre.trim(), idPais: parseInt(form.idPais), idCanton: form.idCanton ? parseInt(form.idCanton) : null }) }}>
        <div>
          <label htmlFor={`${fid}-nombre`} className={labelClass}>Nombre del estadio</label>
          <input id={`${fid}-nombre`} className="input-field" placeholder="Estadio Modelo" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <UbicacionSelector value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }} onChange={u => setForm(f => ({ ...f, ...u }))} />
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
        <AccionesFormulario guardando={guardar.isPending} texto={esNuevo ? 'Guardar estadio' : 'Guardar cambios'} />
      </form>
    </Modal>
  </div>
}
