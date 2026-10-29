import { useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { mensajeDeError } from '../../feedback/contextos'
import { formatearFecha } from '../../utils/fechas'
import MarcaLiga from '../../components/MarcaLiga'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

// Página de la invitación de dirigente. Llega por enlace (/invitacion-dirigente/ABCDE-FGHJK)
// o escribiendo el código (/invitacion-dirigente).
export default function InvitacionDirigente() {
  const { codigo: codigoUrl } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="flex justify-center"><MarcaLiga tamano="lg" vertical como="span" /></h1>
          <p className="text-gray-500 text-sm mt-2 tracking-wider uppercase">Acceso para dirigentes</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          {codigoUrl
            ? <DetalleInvitacion key={codigoUrl} codigo={codigoUrl} />
            : <EscribirCodigo onListo={c => navigate(`/invitacion-dirigente/${encodeURIComponent(c)}`)} />}
        </div>
        <p className="text-gray-500 text-sm text-center mt-6">
          <Link to="/login" className="inline-block py-3 text-brand-400 hover:text-brand-300">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}

function EscribirCodigo({ onListo }) {
  const fid = useId()
  const [codigo, setCodigo] = useState('')
  const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (
    <form onSubmit={e => { e.preventDefault(); if (limpio.length >= 10) onListo(limpio) }} className="space-y-4">
      <h2 className="text-white font-semibold text-lg">Código de dirigente</h2>
      <p className="text-gray-400 text-sm">Escriba el código que le envió el organizador del campeonato.</p>
      <div>
        <label htmlFor={`${fid}-codigo`} className={labelClass}>Código</label>
        <input id={`${fid}-codigo`} className="input-field font-mono tracking-widest uppercase" autoComplete="off"
          placeholder="ABCDE-FGHJK" value={codigo} onChange={e => setCodigo(e.target.value)} autoFocus />
      </div>
      <button type="submit" disabled={limpio.length < 10} className="btn-primary w-full py-3 disabled:opacity-40">Continuar</button>
    </form>
  )
}

function DetalleInvitacion({ codigo }) {
  const fid = useId()
  const navigate = useNavigate()
  const { user, iniciarSesion, logout } = useAuth()
  const [modo, setModo] = useState('nueva')     // 'nueva' | 'existente'
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const q = useQuery({
    queryKey: ['invitacion-dirigente', codigo],
    queryFn: () => api.get(`/invitaciones-dirigente/${encodeURIComponent(codigo)}`).then(r => r.data),
    retry: false,
  })

  const aceptar = async (cuerpo) => {
    setError(''); setEnviando(true)
    try {
      const { data } = await api.post(`/invitaciones-dirigente/${encodeURIComponent(codigo)}/aceptar`, cuerpo)
      iniciarSesion(data)
      navigate('/dirigente', { replace: true })
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo aceptar la invitación.'))
    } finally {
      setEnviando(false)
    }
  }

  if (q.isLoading) return <p className="text-gray-400 text-center py-6">Revisando la invitación...</p>
  if (q.isError) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-white font-semibold">{mensajeDeError(q.error, 'No se pudo revisar la invitación.')}</p>
        <Link to="/invitacion-dirigente" className="btn-secundario inline-flex">Escribir otro código</Link>
      </div>
    )
  }

  const inv = q.data

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-semibold text-lg leading-snug">
          {inv.organizador} le invita como dirigente de {inv.equipo} en «{inv.campeonato}»
        </h2>
        <p className="text-gray-400 text-sm mt-2">
          Podrá ver el campeonato desde su cuenta: jornadas, posiciones, la nómina de su equipo, goleadores, tarjetas y suspensiones.
          No podrá modificar nada.
        </p>
        {inv.vigente && <p className="text-gray-500 text-xs mt-2">La invitación sirve una sola vez y vence el {formatearFecha(inv.venceEn)}.</p>}
      </div>

      {!inv.vigente ? (
        <div role="alert" className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">{inv.motivo}</div>
      ) : user?.rol === 'Dirigente' ? (
        <div className="space-y-3">
          <p className="text-gray-300 text-sm">Entraste como <strong className="text-white">{user.nombre}</strong>.</p>
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          <button type="button" onClick={() => aceptar({})} disabled={enviando} className="btn-primary w-full py-3">
            {enviando ? 'Aceptando...' : 'Aceptar con mi cuenta'}
          </button>
        </div>
      ) : user ? (
        <div className="space-y-3">
          <p className="text-gray-300 text-sm">
            Entraste como <strong className="text-white">{user.nombre}</strong>, una cuenta de {user.rol === 'Vocal' ? 'vocal' : 'organizador'}.
            La invitación necesita una cuenta de dirigente, con otro correo.
          </p>
          <button type="button" onClick={logout} className="btn-secundario w-full">Cerrar sesión y continuar</button>
        </div>
      ) : (
        <form noValidate onSubmit={e => {
          e.preventDefault()
          aceptar(modo === 'nueva' ? form : { email: form.email, password: form.password })
        }} className="space-y-4">
          <div role="group" aria-label="Tipo de cuenta" className="grid grid-cols-2 gap-1 rounded-lg bg-gray-800 p-1">
            {[['nueva', 'Crear cuenta'], ['existente', 'Ya soy dirigente']].map(([valor, texto]) => (
              <button key={valor} type="button" aria-pressed={modo === valor} onClick={() => { setModo(valor); setError('') }}
                className={`rounded-md py-2 text-sm font-medium ${modo === valor ? 'bg-gray-950 text-white' : 'text-gray-400'}`}>{texto}</button>
            ))}
          </div>
          {modo === 'nueva' && (
            <div>
              <label htmlFor={`${fid}-nombre`} className={labelClass}>Su nombre</label>
              <input id={`${fid}-nombre`} className="input-field" autoComplete="name" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
          )}
          <div>
            <label htmlFor={`${fid}-email`} className={labelClass}>Correo electrónico</label>
            <input id={`${fid}-email`} type="email" className="input-field" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${fid}-pass`} className={labelClass}>{modo === 'nueva' ? 'Contraseña (mínimo 6 caracteres)' : 'Contraseña'}</label>
            <input id={`${fid}-pass`} type="password" className="input-field"
              autoComplete={modo === 'nueva' ? 'new-password' : 'current-password'} value={form.password} onChange={e => set('password', e.target.value)} />
          </div>
          {error && <div role="alert" className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}
          <button type="submit" disabled={enviando} className="btn-primary w-full py-3">
            {enviando ? 'Aceptando...' : modo === 'nueva' ? 'Crear cuenta y aceptar' : 'Entrar y aceptar'}
          </button>
        </form>
      )}
    </div>
  )
}
