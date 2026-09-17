import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

export default function Estadios() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', idCiudad: '' })
  const [error, setError] = useState('')
  const { data: estadios = [] } = useQuery({ queryKey: ['estadios'], queryFn: () => api.get('/estadios').then(r => r.data) })
  const { data: ciudades = [] } = useQuery({ queryKey: ['ciudades'], queryFn: () => api.get('/catalogos/ciudades').then(r => r.data) })
  const mutation = useMutation({
    mutationFn: data => api.post('/estadios', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['estadios'] }); setModal(false); setForm({ nombre: '', idCiudad: '' }); setError('') },
    onError: err => setError(err.response?.data?.error || 'Error al registrar estadio.'),
  })
  return <div className="p-8">
    <PageHeader title="ESTADIOS" subtitle={`${estadios.length} disponibles`} action={<button className="btn-primary" onClick={() => setModal(true)}>+ Nuevo estadio</button>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {estadios.map(e => <div className="card" key={e.idEstadio}><h3 className="text-white font-semibold">{e.nombre}</h3><p className="text-gray-400 text-sm mt-1">{e.ciudad}, {e.pais}</p></div>)}
    </div>
    <Modal isOpen={modal} onClose={() => { setModal(false); setError('') }} title="NUEVO ESTADIO">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, idCiudad: parseInt(form.idCiudad) }) }}>
        <input className="input-field" placeholder="Nombre del estadio" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        <select className="input-field" required value={form.idCiudad} onChange={e => setForm({ ...form, idCiudad: e.target.value })}><option value="">Ciudad...</option>{ciudades.map(c => <option key={c.idCiudad} value={c.idCiudad}>{c.nombre}</option>)}</select>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Guardar estadio'}</button>
      </form>
    </Modal>
  </div>
}
