import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

export default function Arbitros() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', cedula: '', fechaNac: '', idCiudad: '' })
  const [error, setError] = useState('')
  const { data: arbitros = [] } = useQuery({ queryKey: ['arbitros'], queryFn: () => api.get('/arbitros').then(r => r.data) })
  const { data: ciudades = [] } = useQuery({ queryKey: ['ciudades'], queryFn: () => api.get('/catalogos/ciudades').then(r => r.data) })
  const mutation = useMutation({
    mutationFn: data => api.post('/arbitros', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['arbitros'] }); setModal(false); setForm({ nombre: '', apellido: '', cedula: '', fechaNac: '', idCiudad: '' }); setError('') },
    onError: err => setError(err.response?.data?.error || 'Error al registrar oficial.'),
  })
  return <div className="p-8">
    <PageHeader title="OFICIALES" subtitle={`${arbitros.length} registrados`} action={<button className="btn-primary" onClick={() => setModal(true)}>+ Nuevo oficial</button>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {arbitros.map(a => <div className="card" key={a.idArbitro}><h3 className="text-white font-semibold">{a.nombre} {a.apellido}</h3><p className="text-gray-400 text-sm mt-1">Cédula: {a.cedula}</p><p className="text-gray-400 text-sm mt-1">{a.ciudad}, {a.pais}</p></div>)}
    </div>
    <Modal isOpen={modal} onClose={() => { setModal(false); setError('') }} title="NUEVO OFICIAL">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, idCiudad: parseInt(form.idCiudad) }) }}>
        <input className="input-field" placeholder="Nombre" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        <input className="input-field" placeholder="Apellido" required value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} />
        <input className="input-field" placeholder="Cédula" required value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} />
        <input className="input-field" type="date" required value={form.fechaNac} onChange={e => setForm({ ...form, fechaNac: e.target.value })} />
        <select className="input-field" required value={form.idCiudad} onChange={e => setForm({ ...form, idCiudad: e.target.value })}><option value="">Ciudad...</option>{ciudades.map(c => <option key={c.idCiudad} value={c.idCiudad}>{c.nombre}</option>)}</select>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Guardar oficial'}</button>
      </form>
    </Modal>
  </div>
}
