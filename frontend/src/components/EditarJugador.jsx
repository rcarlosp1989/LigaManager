import { useState, useId } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import Modal from './Modal'
import EstadoError from './EstadoError'
import UbicacionSelector from './UbicacionSelector'
import AccionesFormulario from './AccionesFormulario'
import CampoDocumento from './CampoDocumento'
import CampoFoto from './CampoFoto'
import { documentoValido } from '../utils/documento'
import { achicarImagen, LADO_FOTO } from '../utils/imagen'
import { useAviso, mensajeDeError } from '../feedback/contextos'
import { posiciones, calcularEdad } from '../utils/jugador'

// Edición de un jugador: el formulario (lo usa la página Jugadores) y una ventana que lo
// carga, guarda y avisa (la usa la nómina de Reportes). Solo organizador y administrador.

// ── Formulario editar jugador ─────────────────────────────────────────────────

export default function EditarJugadorForm({ jugador, onSubmit, loading, error }) {
  const fid = useId()
  const [intento, setIntento] = useState(false)
  const [form, setForm] = useState({
    nombre:   jugador.nombre,
    apellido: jugador.apellido,
    cedula:    jugador.cedula,
    tipoIdentificacion: jugador.tipoIdentificacion ?? 'Cedula',
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
          <label htmlFor={`${fid}-c11`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre</label>
          <input id={`${fid}-c11`} className="input-field" value={form.nombre}
            onChange={e => set('nombre', e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${fid}-c12`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Apellido</label>
          <input id={`${fid}-c12`} className="input-field" value={form.apellido}
            onChange={e => set('apellido', e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor={`${fid}-c13`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Posición</label>
        <select id={`${fid}-c13`} className="input-field" value={form.posicion} required onChange={e => set('posicion', e.target.value)}>
          <option value="">Seleccionar posición...</option>
          {posiciones.map(posicion => <option key={posicion} value={posicion}>{posicion}</option>)}
        </select>
      </div>
      <CampoDocumento conPendiente tipo={form.tipoIdentificacion} numero={form.cedula} forzar={intento}
        onChange={d => setForm(f => ({ ...f, tipoIdentificacion: d.tipo, cedula: d.numero }))} />
      <CampoFoto id={`${fid}-c15`} nombre={`${form.nombre} ${form.apellido}`.trim()} fotoActual={jugador.fotoUrl}
        archivo={form.foto} onChange={f => set('foto', f)} />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor={`${fid}-c16`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de nacimiento</label>
          <input id={`${fid}-c16`} type="date" className="input-field" value={form.fechaNac}
            onChange={e => set('fechaNac', e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${fid}-c17`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Edad</label>
          <input id={`${fid}-c17`} className="input-field text-gray-400" value={calcularEdad(form.fechaNac) ?? '–'} disabled readOnly />
        </div>
        <div>
          <label htmlFor={`${fid}-c18`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Dorsal</label>
          <input id={`${fid}-c18`} type="number" className="input-field" value={form.dorsal} min="1" max="99"
            onChange={e => set('dorsal', e.target.value)} placeholder="10" />
        </div>
      </div>
      <UbicacionSelector
        value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }}
        onChange={u => setForm(f => ({ ...f, ...u }))}
      />
      {error && (
        <div role="alert" className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <AccionesFormulario guardando={loading} texto="Guardar cambios" onGuardar={() => {
        // Un documento inválido (por ejemplo, uno antiguo con letras) se corrige antes de guardar.
        if (!documentoValido(form.tipoIdentificacion, form.cedula)) { setIntento(true); return }
        onSubmit(form)
      }} />
    </div>
  )
}

// Ventana completa: carga el jugador, muestra el formulario y guarda.
// onGuardado: se llama tras guardar (por ejemplo, para recargar la nómina).
export function EditarJugadorModal({ idJugador, onCerrar, onGuardado }) {
  const aviso = useAviso()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const { data: jugador, isError, refetch, isFetching } = useQuery({
    queryKey: ['jugador', idJugador],
    queryFn: () => api.get(`/jugadores/${idJugador}`).then(r => r.data),
    enabled: !!idJugador,
    staleTime: 0,
  })
  const guardar = useMutation({
    mutationFn: async (data) => {
      const body = new FormData()
      Object.entries(data).forEach(([key, value]) => key !== 'foto' && key !== 'idProvincia' && body.append(key, value ?? ''))
      if (data.foto) body.append('foto', await achicarImagen(data.foto, LADO_FOTO))
      return api.put(`/jugadores/${idJugador}`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jugadores'] })
      queryClient.invalidateQueries({ queryKey: ['jugador', idJugador] })
      setError('')
      aviso.exito('Cambios guardados.')
      onGuardado?.()
      onCerrar()
    },
    onError: (err) => setError(mensajeDeError(err, 'Error al actualizar.')),
  })
  return (
    <Modal isOpen={!!idJugador} onClose={onCerrar} title="EDITAR JUGADOR" maxWidth="max-w-lg">
      {isError ? (
        <EstadoError mensaje="No se pudieron cargar los datos del jugador." onReintentar={refetch} reintentando={isFetching} />
      ) : !jugador ? (
        <p className="py-8 text-center text-sm text-gray-500">Cargando jugador...</p>
      ) : (
        <EditarJugadorForm key={jugador.idJugador} jugador={jugador} onSubmit={guardar.mutate} loading={guardar.isPending} error={error} />
      )}
    </Modal>
  )
}
