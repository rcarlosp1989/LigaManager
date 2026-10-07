import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Modal from '../components/Modal'
import UbicacionSelector from '../components/UbicacionSelector'

// standalone: true agrega su propio encabezado y padding (uso como página suelta);
// en false (por defecto) asume que el contenedor (ej. Mantenimiento) ya los provee.
export default function Arbitros({ standalone = false }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', cedula: '', fechaNac: '', idPais: '', idProvincia: '', idCanton: '' })
  const [error, setError] = useState('')
  const { data: arbitros = [] } = useQuery({ queryKey: ['arbitros'], queryFn: () => api.get('/arbitros').then(r => r.data) })
  const mutation = useMutation({
    mutationFn: data => api.post('/arbitros', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['arbitros'] }); setModal(false); setForm({ nombre: '', apellido: '', cedula: '', fechaNac: '', idPais: '', idProvincia: '', idCanton: '' }); setError('') },
    onError: err => setError(err.response?.data?.error || 'Error al registrar oficial.'),
  })
  return <div className={standalone ? 'p-8' : ''}>
    <div className="flex items-center justify-between mb-5">
      <p className="text-gray-400 text-sm">{arbitros.length} registrados</p>
      <button className="btn-primary" onClick={() => setModal(true)}>+ Nuevo oficial</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {arbitros.map(a => <div className="card" key={a.idArbitro}><h3 className="text-white font-semibold">{a.nombre} {a.apellido}</h3><p className="text-gray-400 text-sm mt-1">Cédula: {a.cedula}</p><p className="text-gray-400 text-sm mt-1">{[a.canton, a.provincia, a.pais].filter(Boolean).join(', ')}</p></div>)}
    </div>
    <Modal isOpen={modal} onClose={() => { setModal(false); setError('') }} title="NUEVO OFICIAL">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate({ nombre: form.nombre, apellido: form.apellido, cedula: form.cedula, fechaNac: form.fechaNac, idPais: parseInt(form.idPais), idCanton: form.idCanton ? parseInt(form.idCanton) : null }) }}>
        <input className="input-field" placeholder="Nombre" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        <input className="input-field" placeholder="Apellido" required value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} />
        <input className="input-field" placeholder="Cédula" required value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} />
        <input className="input-field" type="date" required value={form.fechaNac} onChange={e => setForm({ ...form, fechaNac: e.target.value })} />
        <UbicacionSelector value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }} onChange={u => setForm({ ...form, ...u })} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Guardar oficial'}</button>
      </form>
    </Modal>
  </div>
}
