import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Modal from '../components/Modal'
import UbicacionSelector from '../components/UbicacionSelector'
import EstadoError from '../components/EstadoError'
import AccionesFormulario from '../components/AccionesFormulario'
import { useAviso, mensajeDeError } from '../feedback/contextos'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

// standalone: true agrega su propio encabezado y padding (uso como página suelta);
// en false (por defecto) asume que el contenedor (ej. Mantenimiento) ya los provee.
export default function Arbitros({ standalone = false }) {
  const fid = useId()
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', cedula: '', fechaNac: '', idPais: '', idProvincia: '', idCanton: '' })
  const [error, setError] = useState('')
  const { data: arbitros = [], isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ['arbitros'], queryFn: () => api.get('/arbitros').then(r => r.data) })
  const mutation = useMutation({
    mutationFn: data => api.post('/arbitros', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arbitros'] }); setModal(false); setForm({ nombre: '', apellido: '', cedula: '', fechaNac: '', idPais: '', idProvincia: '', idCanton: '' }); setError('')
      aviso.exito('Oficial registrado.')
    },
    onError: err => setError(mensajeDeError(err, 'Error al registrar oficial.')),
  })
  return <div className={standalone ? 'p-4 sm:p-6 lg:p-8' : ''}>
    <div className="flex items-center justify-between mb-5">
      <p className="text-gray-400 text-sm">{!isLoading && !isError ? `${arbitros.length} registrados` : ''}</p>
      <button className="btn-primary" onClick={() => setModal(true)}>+ Nuevo oficial</button>
    </div>
    {isLoading ? (
      <div className="text-gray-500 text-center py-16">Cargando...</div>
    ) : isError ? (
      <EstadoError mensaje="No se pudieron cargar los oficiales." onReintentar={refetch} reintentando={isFetching} />
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {arbitros.map(a => <div className="card" key={a.idArbitro}><h3 className="text-white font-semibold">{a.nombre} {a.apellido}</h3><p className="text-gray-400 text-sm mt-1">Cédula: {a.cedula}</p><p className="text-gray-400 text-sm mt-1">{[a.canton, a.provincia, a.pais].filter(Boolean).join(', ')}</p></div>)}
      </div>
    )}
    <Modal isOpen={modal} onClose={() => { setModal(false); setError('') }} title="NUEVO OFICIAL">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate({ nombre: form.nombre, apellido: form.apellido, cedula: form.cedula, fechaNac: form.fechaNac, idPais: parseInt(form.idPais), idCanton: form.idCanton ? parseInt(form.idCanton) : null }) }}>
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
        <div>
          <label htmlFor={`${fid}-cedula`} className={labelClass}>Número de cédula</label>
          <input id={`${fid}-cedula`} className="input-field" inputMode="numeric" required value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${fid}-fechanac`} className={labelClass}>Fecha de nacimiento</label>
          <input id={`${fid}-fechanac`} className="input-field" type="date" required value={form.fechaNac} onChange={e => setForm({ ...form, fechaNac: e.target.value })} />
        </div>
        <UbicacionSelector value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }} onChange={u => setForm({ ...form, ...u })} />
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
        <AccionesFormulario guardando={mutation.isPending} texto="Guardar oficial" />
      </form>
    </Modal>
  </div>
}
