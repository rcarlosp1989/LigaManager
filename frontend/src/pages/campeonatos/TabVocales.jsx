import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import InvitacionCreada from '../../components/InvitacionCreada'
import { useAviso, useDialogos, mensajeDeError } from '../../feedback/contextos'
import { formatearFecha } from '../../utils/fechas'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

// Pestaña «Vocales» del campeonato: invitar al vocal titular o a un reemplazo para un día,
// ver quién está habilitado, quitarlo y anular invitaciones pendientes.
export default function TabVocales({ camp }) {
  const fid = useId()
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [form, setForm] = useState(null)        // null | { tipo, fecha }
  const [creada, setCreada] = useState(null)
  const clave = ['vocales', camp.idCampeonato]

  const q = useQuery({ queryKey: clave, queryFn: () => api.get(`/campeonatos/${camp.idCampeonato}/vocales`).then(r => r.data) })
  const refrescar = () => queryClient.invalidateQueries({ queryKey: clave })

  const crear = useMutation({
    mutationFn: (datos) => api.post(`/campeonatos/${camp.idCampeonato}/vocales/invitaciones`, datos).then(r => r.data),
    onSuccess: (inv) => { setCreada(inv); setForm(null); refrescar() },
  })

  const quitar = async (v) => {
    const ok = await confirmar({
      titulo: `¿Quitar a ${v.nombre} como vocal?`,
      mensaje: 'Ya no podrá registrar partidos de este campeonato. Lo que registró se conserva.',
      textoConfirmar: 'Quitar', peligro: true,
    })
    if (!ok) return
    try {
      await api.delete(`/campeonatos/${camp.idCampeonato}/vocales/${v.idUsuario}`)
      aviso.exito('Vocal quitado.'); refrescar()
    } catch (err) { aviso.error(mensajeDeError(err, 'No se pudo quitar al vocal.')) }
  }

  const anular = async (i) => {
    const ok = await confirmar({
      titulo: '¿Anular esta invitación?', mensaje: 'El código deja de servir.', textoConfirmar: 'Anular', peligro: true,
    })
    if (!ok) return
    try {
      await api.delete(`/campeonatos/${camp.idCampeonato}/vocales/invitaciones/${i.idInvitacion}`)
      aviso.exito('Invitación anulada.'); refrescar()
    } catch (err) { aviso.error(mensajeDeError(err, 'No se pudo anular.')) }
  }

  const hoy = new Date().toLocaleDateString('en-CA')
  const terminado = camp.fechaFin < hoy

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vocales</h2>
        <p className="text-gray-400 text-sm">
          El vocal registra los partidos desde la cancha con su propia cuenta. El titular queda habilitado mientras dure
          el campeonato y registra cada partido el día que se juega. Si no puede ir, él o tú pueden invitar a un reemplazo para ese día.
        </p>
      </div>

      {creada && <InvitacionCreada invitacion={creada} campeonato={camp.nombre} />}

      {!form && !terminado && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setCreada(null); crear.reset(); setForm({ tipo: 'Titular' }) }} className="btn-primary">+ Invitar vocal titular</button>
          <button type="button" onClick={() => { setCreada(null); crear.reset(); setForm({ tipo: 'Reemplazo', fecha: hoy }) }} className="btn-secundario">Invitar reemplazo por un día</button>
        </div>
      )}
      {terminado && <p className="text-sm text-gray-500">El campeonato ya terminó: no se pueden invitar vocales.</p>}

      {form && (
        <form className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4"
          onSubmit={e => { e.preventDefault(); crear.mutate(form.tipo === 'Titular' ? { tipo: 'Titular' } : { tipo: 'Reemplazo', fecha: form.fecha }) }}>
          <p className="text-sm text-white">
            {form.tipo === 'Titular'
              ? `Se crea un código de una sola vez para que el vocal cree su cuenta. Vence el ${formatearFecha(camp.fechaFin)}, al terminar el campeonato.`
              : 'Se crea un enlace de una sola vez. Quien lo use podrá registrar solo los partidos de ese día.'}
          </p>
          {form.tipo === 'Reemplazo' && (
            <div className="max-w-xs">
              <label htmlFor={`${fid}-fecha`} className={labelClass}>Día del reemplazo</label>
              <input id={`${fid}-fecha`} type="date" className="input-field" value={form.fecha} min={hoy} max={camp.fechaFin} required
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
          )}
          {crear.isError && <p role="alert" className="text-red-400 text-sm">{mensajeDeError(crear.error, 'No se pudo crear la invitación.')}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setForm(null)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={crear.isPending} className="btn-primary">{crear.isPending ? 'Creando...' : 'Crear invitación'}</button>
          </div>
        </form>
      )}

      {q.isLoading ? (
        <p className="text-gray-500 text-sm">Cargando vocales...</p>
      ) : q.isError ? (
        <EstadoError compacto mensaje="No se pudieron cargar los vocales." onReintentar={q.refetch} reintentando={q.isFetching} />
      ) : (
        <>
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Habilitados</h3>
            {q.data.vocales.length === 0 ? (
              <p className="text-gray-500 text-sm">Todavía no hay vocales. Invita al titular para que registre los partidos desde la cancha.</p>
            ) : (
              <ul className="divide-y divide-gray-800 rounded-lg border border-gray-800">
                {q.data.vocales.map(v => (
                  <li key={`${v.idUsuario}-${v.tipo}-${v.soloFecha ?? ''}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium">{v.nombre}</p>
                      <p className="text-gray-500 text-xs">{v.email} · {v.tipo === 'Titular' ? 'Titular' : `Reemplazo el ${formatearFecha(v.soloFecha)}`}</p>
                    </div>
                    <button type="button" onClick={() => quitar(v)} className="text-sm text-gray-400 hover:text-red-400 px-2">Quitar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {q.data.invitaciones.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Invitaciones sin usar</h3>
              <ul className="divide-y divide-gray-800 rounded-lg border border-gray-800">
                {q.data.invitaciones.map(i => (
                  <li key={i.idInvitacion} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm">{i.tipo === 'Titular' ? 'Vocal titular' : `Reemplazo el ${formatearFecha(i.soloFecha)}`}</p>
                      <p className="text-gray-500 text-xs">Creada por {i.creadaPor} · vence el {formatearFecha(i.venceEn)}</p>
                    </div>
                    <button type="button" onClick={() => anular(i)} className="text-sm text-gray-400 hover:text-red-400 px-2">Anular</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
