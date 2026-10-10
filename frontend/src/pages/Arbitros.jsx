import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Modal from '../components/Modal'
import UbicacionSelector from '../components/UbicacionSelector'
import EstadoError from '../components/EstadoError'
import AccionesFormulario from '../components/AccionesFormulario'
import MenuAcciones from '../components/MenuAcciones'
import CampoDocumento from '../components/CampoDocumento'
import { tipoDocumento } from '../utils/documento'
import { useAviso, useDialogos, mensajeDeError } from '../feedback/contextos'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'
const VACIO = { nombre: '', apellido: '', tipoIdentificacion: 'Cedula', cedula: '', fechaNac: '', idPais: '', idProvincia: '', idCanton: '' }
// Los oficiales registrados sin documento tienen un código interno «AR-…»: no se muestra.
const documentoVisible = (cedula) => (cedula && !cedula.startsWith('AR-') ? cedula : '')

// standalone: true agrega su propio encabezado y padding (uso como página suelta);
// en false (por defecto) asume que el contenedor (ej. Mantenimiento) ya los provee.
export default function Arbitros({ standalone = false }) {
  const fid = useId()
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [editando, setEditando] = useState(null)   // null: cerrado · 'nuevo' · id del oficial
  const [abriendo, setAbriendo] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState('')
  const { data: arbitros = [], isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ['arbitros'], queryFn: () => api.get('/arbitros').then(r => r.data) })

  const esNuevo = editando === 'nuevo'
  const cerrar = () => { setEditando(null); setError('') }
  const abrirNuevo = () => { setForm(VACIO); setError(''); setEditando('nuevo') }
  // Para editar se pide el detalle: trae fecha de nacimiento y ubicación completas.
  const abrirEditar = async (a) => {
    setAbriendo(a.idArbitro)
    try {
      const { data: d } = await api.get(`/arbitros/${a.idArbitro}`)
      setForm({
        nombre: d.nombre, apellido: d.apellido, tipoIdentificacion: d.tipoIdentificacion ?? 'Cedula',
        cedula: documentoVisible(d.cedula), fechaNac: d.fechaNac,
        idPais: d.idPais ?? '', idProvincia: d.idProvincia ?? '', idCanton: d.idCanton ?? '',
      })
      setError(''); setEditando(a.idArbitro)
    } catch (err) {
      aviso.error(mensajeDeError(err, 'No se pudo abrir el oficial.'))
    } finally {
      setAbriendo(null)
    }
  }

  const guardar = useMutation({
    mutationFn: data => (esNuevo ? api.post('/arbitros', data) : api.put(`/arbitros/${editando}`, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arbitros'] })
      aviso.exito(esNuevo ? 'Oficial registrado.' : 'Cambios guardados.')
      cerrar()
    },
    onError: err => setError(mensajeDeError(err, esNuevo ? 'Error al registrar oficial.' : 'Error al guardar los cambios.')),
  })
  const eliminar = useMutation({
    mutationFn: id => api.delete(`/arbitros/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['arbitros'] }); aviso.exito('Oficial eliminado.') },
    onError: err => aviso.error(mensajeDeError(err, 'No se pudo eliminar el oficial.')),
  })
  const pedirEliminar = async (a) => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${a.nombre} ${a.apellido}?`,
      mensaje: 'Si tiene partidos asignados no se podrá eliminar. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar', peligro: true,
    })
    if (ok) eliminar.mutate(a.idArbitro)
  }

  const enviar = (e) => {
    e.preventDefault()
    guardar.mutate({
      nombre: form.nombre.trim(), apellido: form.apellido.trim(),
      tipoIdentificacion: form.tipoIdentificacion, cedula: form.cedula,
      fechaNac: form.fechaNac, idPais: parseInt(form.idPais), idCanton: form.idCanton ? parseInt(form.idCanton) : null,
    })
  }

  return <div className={standalone ? 'p-4 sm:p-6 lg:p-8' : ''}>
    <div className="flex items-center justify-between mb-5">
      <p className="text-gray-400 text-sm">{!isLoading && !isError ? `${arbitros.length} registrados` : ''}</p>
      <button className="btn-primary" onClick={abrirNuevo}>+ Nuevo oficial</button>
    </div>
    {isLoading ? (
      <div className="text-gray-500 text-center py-16">Cargando...</div>
    ) : isError ? (
      <EstadoError mensaje="No se pudieron cargar los oficiales." onReintentar={refetch} reintentando={isFetching} />
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {arbitros.map(a => (
          <div className="card flex items-start justify-between gap-3" key={a.idArbitro}>
            <div className="min-w-0">
              <h3 className="text-white font-semibold">{a.nombre} {a.apellido}</h3>
              {documentoVisible(a.cedula)
                ? <p className="text-gray-400 text-sm mt-1">{tipoDocumento(a.tipoIdentificacion).corto}: {a.cedula}</p>
                : <p className="text-gray-600 text-sm mt-1">Sin documento</p>}
              <p className="text-gray-400 text-sm mt-1">{[a.canton, a.provincia, a.pais].filter(Boolean).join(', ')}</p>
              {abriendo === a.idArbitro && <p className="text-gray-500 text-xs mt-1">Abriendo...</p>}
            </div>
            <MenuAcciones etiqueta={`Acciones de ${a.nombre} ${a.apellido}`} acciones={[
              { texto: 'Editar', onClick: () => abrirEditar(a) },
              { texto: 'Eliminar', peligro: true, onClick: () => pedirEliminar(a) },
            ]} />
          </div>
        ))}
      </div>
    )}
    <Modal isOpen={editando !== null} onClose={cerrar} title={esNuevo ? 'NUEVO OFICIAL' : 'EDITAR OFICIAL'}>
      <form className="space-y-4" onSubmit={enviar}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${fid}-nombre`} className={labelClass}>Nombre</label>
            <input id={`${fid}-nombre`} className="input-field" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`${fid}-apellido`} className={labelClass}>Apellido</label>
            <input id={`${fid}-apellido`} className="input-field" required value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} />
          </div>
        </div>
        <CampoDocumento tipo={form.tipoIdentificacion} numero={form.cedula} labelClass={labelClass} opcional={!esNuevo}
          onChange={d => setForm(f => ({ ...f, tipoIdentificacion: d.tipo, cedula: d.numero }))} />
        <div>
          <label htmlFor={`${fid}-fechanac`} className={labelClass}>Fecha de nacimiento</label>
          <input id={`${fid}-fechanac`} className="input-field" type="date" required value={form.fechaNac} onChange={e => setForm({ ...form, fechaNac: e.target.value })} />
        </div>
        <UbicacionSelector value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }} onChange={u => setForm(f => ({ ...f, ...u }))} />
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
        <AccionesFormulario guardando={guardar.isPending} texto={esNuevo ? 'Guardar oficial' : 'Guardar cambios'} />
      </form>
    </Modal>
  </div>
}
