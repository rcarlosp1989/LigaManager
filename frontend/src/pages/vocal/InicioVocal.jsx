import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { LogOut, MapPin, UserPlus } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import EstadoError from '../../components/EstadoError'
import InvitacionCreada from '../../components/InvitacionCreada'
import { mensajeDeError } from '../../feedback/contextos'
import { formatearFecha } from '../../utils/fechas'

// Inicio del vocal: los partidos de hoy con «Registrar», sin el menú de administración.
// Alto contraste, como el modo en vivo, porque se usa en la cancha.
export default function InicioVocal() {
  const { user, logout } = useAuth()
  const q = useQuery({ queryKey: ['vocal-inicio'], queryFn: () => api.get('/vocal/inicio').then(r => r.data), refetchInterval: 60000 })
  const datos = q.data

  return (
    <div className="min-h-dvh bg-black text-white">
      <header className="flex items-center gap-3 border-b border-neutral-700 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl tracking-wide">LIGA<span className="text-brand-400">MANAGER</span></p>
          <p className="truncate text-sm text-gray-300">Vocal · {user?.nombre}</p>
        </div>
        <button type="button" onClick={logout} className="flex h-11 items-center gap-2 rounded-lg border border-neutral-600 px-3 text-sm text-gray-100">
          <LogOut size={16} aria-hidden="true" /> Salir
        </button>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 pb-16 pt-5">
        {q.isLoading ? (
          <p className="py-10 text-center text-gray-300">Cargando tus partidos...</p>
        ) : q.isError ? (
          <EstadoError mensaje="No se pudieron cargar tus partidos." onReintentar={q.refetch} reintentando={q.isFetching} />
        ) : (
          <>
            <section aria-labelledby="hoy-titulo">
              <h1 id="hoy-titulo" className="font-display text-3xl tracking-wide">HOY</h1>
              <p className="mb-4 text-sm text-gray-300">{formatearFecha(datos.hoy)}</p>
              {datos.partidosHoy.length === 0 ? (
                <p className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-6 text-center text-gray-200">
                  No tienes partidos para registrar hoy.
                </p>
              ) : (
                <ul className="space-y-3">
                  {datos.partidosHoy.map(p => <TarjetaPartido key={p.idPartido} partido={p} />)}
                </ul>
              )}
            </section>

            {datos.proximos.length > 0 && (
              <section aria-labelledby="proximos-titulo">
                <h2 id="proximos-titulo" className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-300">Próximos</h2>
                <p className="mb-3 text-sm text-gray-400">Cada partido se puede registrar solo el día que se juega.</p>
                <ul className="space-y-2">
                  {datos.proximos.map(p => <TarjetaPartido key={p.idPartido} partido={p} />)}
                </ul>
              </section>
            )}

            <section aria-labelledby="camps-titulo">
              <h2 id="camps-titulo" className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-300">Tus campeonatos</h2>
              {datos.campeonatos.length === 0 ? (
                <p className="text-sm text-gray-300">No estás habilitado en ningún campeonato vigente. Pide una invitación al organizador.</p>
              ) : (
                <ul className="space-y-3">
                  {datos.campeonatos.map(c => <TarjetaCampeonato key={`${c.idCampeonato}-${c.tipo}-${c.soloFecha ?? ''}`} campeonato={c} hoy={datos.hoy} />)}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function TarjetaPartido({ partido: p }) {
  const hora = p.fecha.slice(11, 16)
  return (
    <li className={`rounded-xl border px-4 py-3 ${p.esHoy ? 'border-neutral-500 bg-neutral-900' : 'border-neutral-800 bg-neutral-950'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs uppercase tracking-wider text-gray-300">{p.campeonato} · {p.jornada}</p>
        <p className="text-sm text-gray-200">{p.esHoy ? hora : formatearFecha(p.fecha)}</p>
      </div>
      <p className="mt-1 text-lg font-semibold leading-snug">{p.equipoLocal} <span className="text-gray-400">vs</span> {p.equipoVisitante}</p>
      {p.estadio && <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-300"><MapPin size={14} aria-hidden="true" />{p.estadio}</p>}
      {p.esHoy && (
        p.jugado ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-green-400">Cerrado</span>
            <Link to={`/partidos/${p.idPartido}/en-vivo?vista=cierre`} className="flex h-11 items-center rounded-lg border border-neutral-500 px-4 text-sm font-semibold">Ver resumen</Link>
          </div>
        ) : (
          <Link to={`/partidos/${p.idPartido}/en-vivo`}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-lg bg-green-500 text-base font-bold text-black">
            Registrar
          </Link>
        )
      )}
    </li>
  )
}

// Campeonato habilitado. El titular puede delegar un día a un reemplazo.
function TarjetaCampeonato({ campeonato: c, hoy }) {
  const fid = useId()
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(hoy)
  const delegar = useMutation({
    mutationFn: () => api.post(`/vocal/campeonatos/${c.idCampeonato}/reemplazos`, { fecha }).then(r => r.data),
  })
  const titular = c.tipo === 'Titular'

  return (
    <li className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3">
      <p className="font-semibold">{c.nombre}</p>
      <p className="text-sm text-gray-300">
        {titular ? `Titular hasta el ${formatearFecha(c.fechaFin)}` : `Reemplazo solo el ${formatearFecha(c.soloFecha)}`}
      </p>
      {titular && !abierto && !delegar.data && (
        <button type="button" onClick={() => setAbierto(true)}
          className="mt-3 flex h-11 items-center gap-2 rounded-lg border border-neutral-500 px-3 text-sm font-semibold">
          <UserPlus size={16} aria-hidden="true" /> No puedo ir: delegar un día
        </button>
      )}
      {titular && abierto && !delegar.data && (
        <form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); delegar.mutate() }}>
          <div>
            <label htmlFor={`${fid}-fecha`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Día que no puedes ir</label>
            <input id={`${fid}-fecha`} type="date" className="input-field" value={fecha} min={hoy} max={c.fechaFin} required
              onChange={e => setFecha(e.target.value)} />
          </div>
          <p className="text-sm text-gray-300">Se crea un enlace de una sola vez. Quien lo use podrá registrar solo los partidos de ese día.</p>
          {delegar.isError && <p role="alert" className="text-sm text-red-300">{mensajeDeError(delegar.error, 'No se pudo crear el enlace.')}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAbierto(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={delegar.isPending || !fecha} className="btn-primary">{delegar.isPending ? 'Creando...' : 'Crear enlace'}</button>
          </div>
        </form>
      )}
      {delegar.data && <div className="mt-3"><InvitacionCreada invitacion={delegar.data} campeonato={c.nombre} /></div>}
    </li>
  )
}
