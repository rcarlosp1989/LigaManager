import { useState, useId } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api        from '../../services/api'
import PageHeader from '../../components/PageHeader'
import Modal      from '../../components/Modal'
import EmptyState from '../../components/EmptyState'
import UbicacionSelector from '../../components/UbicacionSelector'
import EstadoError from '../../components/EstadoError'
import AccionesFormulario from '../../components/AccionesFormulario'
import { useAviso, useDialogos, mensajeDeError, erroresDe } from '../../feedback/contextos'
import TablaDesplazable from '../../components/TablaDesplazable'
import { Pencil, Search, User } from 'lucide-react'
import CampoDocumento from '../../components/CampoDocumento'
import { achicarImagen, LADO_FOTO } from '../../utils/imagen'
import FotoJugador from '../../components/FotoJugador'
import CampoFoto from '../../components/CampoFoto'

import EditarJugadorForm, { posiciones, calcularEdad, puedeEditarJugadores } from '../../components/EditarJugador'
import { useAuth } from '../../context/AuthContext'

// ── Formulario crear jugador ──────────────────────────────────────────────────

function JugadorForm({ onSubmit, loading, error }) {
  const fid = useId()
  const [form, setForm] = useState({
    nombre: '', apellido: '', tipoIdentificacion: 'Cedula', cedula: '', fechaNac: '', posicion: '', foto: null,
    idPais: '', idProvincia: '', idCanton: '', idEquipo: '', fechaDesde: new Date().toISOString().split('T')[0],
    dorsal: '', autorizacionDatos: false,
  })

  const qEquipos = useQuery({
    queryKey: ['equipos'],
    queryFn:  () => api.get('/equipos').then(r => r.data),
  })
  const equipos = qEquipos.data ?? []
  const catalogos = erroresDe(qEquipos)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${fid}-c1`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Posición</label>
          <select id={`${fid}-c1`} className="input-field" value={form.posicion} required onChange={e => set('posicion', e.target.value)}>
            <option value="">Seleccionar posición...</option>
            {posiciones.map(posicion => <option key={posicion} value={posicion}>{posicion}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${fid}-c2`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Nombre</label>
          <input id={`${fid}-c2`} className="input-field" value={form.nombre} required
            onChange={e => set('nombre', e.target.value)} placeholder="Juan" />
        </div>
        <div>
          <label htmlFor={`${fid}-c3`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Apellido</label>
          <input id={`${fid}-c3`} className="input-field" value={form.apellido} required
            onChange={e => set('apellido', e.target.value)} placeholder="Pérez" />
        </div>
      </div>
      <CampoDocumento conPendiente tipo={form.tipoIdentificacion} numero={form.cedula}
        onChange={d => setForm(f => ({ ...f, tipoIdentificacion: d.tipo, cedula: d.numero }))} />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor={`${fid}-c5`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de nacimiento</label>
          <input id={`${fid}-c5`} type="date" className="input-field" value={form.fechaNac} required
            onChange={e => set('fechaNac', e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${fid}-c6`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Edad</label>
          <input id={`${fid}-c6`} className="input-field text-gray-400" value={calcularEdad(form.fechaNac) ?? '–'} disabled readOnly />
        </div>
        <div>
          <label htmlFor={`${fid}-c7`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Dorsal <span className="text-gray-600">(opcional)</span></label>
          <input id={`${fid}-c7`} type="number" className="input-field" value={form.dorsal} min="1" max="99"
            onChange={e => set('dorsal', e.target.value)} placeholder="10" />
        </div>
      </div>
      <UbicacionSelector
        value={{ idPais: form.idPais, idProvincia: form.idProvincia, idCanton: form.idCanton }}
        onChange={u => setForm(f => ({ ...f, ...u }))}
      />
      <div>
        <label htmlFor={`${fid}-c8`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipo inicial</label>
        <select id={`${fid}-c8`} className="input-field" value={form.idEquipo} required
          onChange={e => set('idEquipo', parseInt(e.target.value))}>
          <option value="">Seleccionar equipo...</option>
          {equipos.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${fid}-c9`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha de inscripción</label>
        <input id={`${fid}-c9`} type="date" className="input-field" value={form.fechaDesde} required
          onChange={e => set('fechaDesde', e.target.value)} />
      </div>
      <CampoFoto id={`${fid}-c10`} nombre={`${form.nombre} ${form.apellido}`.trim()}
        archivo={form.foto} onChange={f => set('foto', f)} />
      {catalogos.hayError && (
        <EstadoError compacto mensaje="No se pudo cargar la lista de equipos."
          onReintentar={catalogos.reintentar} reintentando={catalogos.reintentando} />
      )}
      <label htmlFor={`${fid}-autorizacion`} className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-3 text-sm text-gray-300">
        <input id={`${fid}-autorizacion`} type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-teal-500"
          checked={form.autorizacionDatos} onChange={e => set('autorizacionDatos', e.target.checked)} />
        <span>
          La organización cuenta con la autorización del jugador (o de su padre, madre o representante legal, si es menor
          de edad) para tratar sus datos personales.{' '}
          <Link to="/privacidad" target="_blank" className="text-brand-400 underline underline-offset-2 hover:text-brand-300">Aviso de privacidad</Link>
        </span>
      </label>
      {error && (
        <div role="alert" className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <AccionesFormulario guardando={loading} texto="Registrar Jugador" />
    </form>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Jugadores() {
  const { user } = useAuth()
  const puedeEditar = puedeEditarJugadores(user?.rol)
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [modal, setModal]           = useState(false)
  const [editModal, setEditModal]   = useState(false)
  const [jugadorEdit, setJugadorEdit] = useState(null)
  const [formError, setFormError]   = useState('')
  const [editError, setEditError]   = useState('')
  const [search, setSearch]         = useState('')

  const [abriendo, setAbriendo]     = useState(null)

  const { data: jugadores = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['jugadores'],
    queryFn:  () => api.get('/jugadores').then(r => r.data),
  })

  const sinJugadores = !isLoading && !isError && jugadores.length === 0
  const filtered = jugadores.filter(j => {
    const texto = search.toLowerCase()
    return `${j.nombre} ${j.apellido}`.toLowerCase().includes(texto)
      || (j.equipoActual ?? '').toLowerCase().includes(texto)
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const body = new FormData()
      const { idProvincia, ...resto } = data
      Object.entries({ ...resto, dorsal: data.dorsal ? parseInt(data.dorsal) : '' })
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .forEach(([key, value]) => key !== 'foto' && body.append(key, value))
      if (data.foto) body.append('foto', await achicarImagen(data.foto, LADO_FOTO))
      return api.post('/jugadores', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jugadores'] })
      setModal(false); setFormError('')
      aviso.exito('Jugador registrado.')
    },
    onError: (err) => setFormError(mensajeDeError(err, 'Error al guardar.')),
  })

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const body = new FormData()
      Object.entries(data).forEach(([key, value]) => key !== 'foto' && key !== 'idProvincia' && body.append(key, value ?? ''))
      if (data.foto) body.append('foto', await achicarImagen(data.foto, LADO_FOTO))
      return api.put(`/jugadores/${jugadorEdit.idJugador}`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jugadores'] })
      setEditModal(false); setEditError(''); setJugadorEdit(null)
      aviso.exito('Cambios guardados.')
    },
    onError: (err) => setEditError(mensajeDeError(err, 'Error al actualizar.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/jugadores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jugadores'] })
      aviso.exito('Jugador eliminado.')
    },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se puede eliminar.')),
  })

  const eliminar = async (j) => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${j.nombre} ${j.apellido}?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (ok) deleteMutation.mutate(j.idJugador)
  }

  const abrirEditar = async (j) => {
    setAbriendo(j.idJugador)
    try {
      const res = await api.get(`/jugadores/${j.idJugador}`)
      setJugadorEdit(res.data)
      setEditModal(true)
      setEditError('')
    } catch (err) {
      aviso.error(mensajeDeError(err, 'No se pudieron cargar los datos del jugador. Inténtelo de nuevo.'))
    } finally {
      setAbriendo(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="JUGADORES"
        subtitle={!isLoading && !isError && jugadores.length > 0 ? `${jugadores.length} registrados` : undefined}
        action={!sinJugadores && (
          <button onClick={() => setModal(true)} className="btn-primary">
            + Nuevo Jugador
          </button>
        )}
      />

      {!sinJugadores && <div className="mb-5">
        <input
          type="search"
          aria-label="Buscar jugadores"
          className="input-field max-w-sm"
          placeholder="Buscar por nombre, apellido o equipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>}

      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Cargando...</div>
      ) : isError ? (
        <EstadoError mensaje="No se pudieron cargar los jugadores." onReintentar={refetch} reintentando={isFetching} />
      ) : sinJugadores ? (
        <EmptyState icon={User} title="Sin jugadores"
          description="Registre el primer jugador del sistema."
          action={
            <button onClick={() => setModal(true)} className="btn-primary">
              Registrar jugador
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados para esa búsqueda"
          description={`Ningún jugador ni equipo coincide con «${search.trim()}».`}
          action={
            <button onClick={() => setSearch('')} className="btn-secundario">
              Limpiar búsqueda
            </button>
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <TablaDesplazable>
          <table className="tabla w-full min-w-[780px]">
            <thead>
              <tr className="border-b border-gray-800">
                <th scope="col" className="fija w-16 min-w-16 text-left text-xs uppercase tracking-wider px-5 py-3">#</th>
                <th scope="col" className="fija fija-2 fija-borde text-left text-xs uppercase tracking-wider px-5 py-3" style={{ '--ancho-fija-1': '4rem' }}>Jugador</th>
                {['Ubicación', 'Edad', 'Posición', 'Equipo Actual', ''].map(h => (
                  <th key={h} scope="col" className="text-left text-xs uppercase tracking-wider px-5 py-3">{h || <span className="sr-only">Acciones</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => (
                <tr key={j.idJugador} className="table-row">
                  <td className="fija w-16 min-w-16 px-5 py-4 text-gray-500 text-sm font-mono">
                    {j.dorsal ? `#${j.dorsal}` : '–'}
                  </td>
                  <th scope="row" className="fija fija-2 fija-borde px-5 py-4 text-left font-normal" style={{ '--ancho-fija-1': '4rem' }}>
                    <p className="flex items-center gap-2.5 text-white font-medium" title={`${j.apellido}, ${j.nombre}`}>
                      <FotoJugador nombre={`${j.apellido}, ${j.nombre}`} fotoUrl={j.fotoUrl} tamano={36} />
                      <span className="min-w-0 max-w-[8rem] truncate sm:max-w-[16rem]">{j.apellido}, {j.nombre}</span>
                      {j.tipoIdentificacion === 'Pendiente' && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/40 bg-amber-400/10">Doc. pendiente</span>
                      )}
                    </p>
                  </th>
                  <td className="px-5 py-4 text-gray-400 text-sm">{j.ubicacion}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{j.edad} años</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">{j.posicion || 'Sin posición'}</td>
                  <td className="px-5 py-4">
                    {j.equipoActual ? (
                      <span className="badge bg-brand-900/40 text-brand-400 border border-brand-800">
                        {j.equipoActual}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-sm">Sin equipo</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-3">
{puedeEditar && (
                    <button
                      onClick={() => abrirEditar(j)}
                      className="text-gray-500 hover:text-blue-400 transition-colors text-sm inline-flex items-center gap-1.5"
                    >
                      {abriendo === j.idJugador ? 'Abriendo...' : <><Pencil size={14} aria-hidden="true" />Editar</>}
                    </button>
                    )}
                    <button
                      onClick={() => eliminar(j)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TablaDesplazable>
        </div>
      )}

      {/* Modal crear */}
      <Modal isOpen={modal} onClose={() => { setModal(false); setFormError('') }}
             title="NUEVO JUGADOR" maxWidth="max-w-lg">
        <JugadorForm onSubmit={createMutation.mutate}
          loading={createMutation.isPending} error={formError} />
      </Modal>

      {/* Modal editar */}
      <Modal isOpen={editModal} onClose={() => { setEditModal(false); setJugadorEdit(null) }}
             title="EDITAR JUGADOR" maxWidth="max-w-lg">
        {jugadorEdit && (
          <EditarJugadorForm
            jugador={jugadorEdit}
            onSubmit={updateMutation.mutate}
            loading={updateMutation.isPending}
            error={editError}
          />
        )}
      </Modal>
    </div>
  )
}
