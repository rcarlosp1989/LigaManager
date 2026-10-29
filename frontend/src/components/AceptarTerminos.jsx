import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { mensajeDeError } from '../feedback/contextos'
import { VERSION_TERMINOS } from '../pages/legal/Legal'

// Antes de entrar a la administración, el organizador debe aceptar la versión vigente de los
// términos de uso (cuentas creadas antes de que existieran, o cuando los términos cambian).
// El servidor guarda cuándo y qué versión aceptó.
export default function AceptarTerminos({ children }) {
  const fid = useId()
  const { logout } = useAuth()
  const queryClient = useQueryClient()
  const [marcado, setMarcado] = useState(false)

  const q = useQuery({
    queryKey: ['terminos'],
    queryFn: () => api.get('/auth/terminos').then(r => r.data),
    staleTime: Infinity,
    retry: 1,
  })
  const aceptar = useMutation({
    mutationFn: () => api.post('/auth/terminos', { version: q.data?.version ?? VERSION_TERMINOS }).then(r => r.data),
    onSuccess: (d) => queryClient.setQueryData(['terminos'], d),
  })

  // Si no se puede consultar (sin señal, servidor anterior), no se bloquea la app.
  if (q.isLoading) return <div className="min-h-dvh bg-gray-950" />
  if (!q.data?.pendiente) return children

  return (
    <div className="min-h-dvh bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 shadow-2xl shadow-black/50">
        <ShieldCheck size={36} className="text-brand-400" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-white">Términos de uso y privacidad</h1>
        <p className="mt-3 text-sm text-gray-300">Antes de continuar, lea y acepte lo siguiente:</p>
        <ul className="mt-3 space-y-2 text-sm text-gray-300 [&_li]:ml-5 [&_li]:list-disc">
          <li>El reglamento, los resultados, las sanciones y las decisiones disciplinarias son <strong className="text-white">responsabilidad de la organización</strong>, no de LigaManager.</li>
          <li>Los cálculos de la aplicación (posiciones, tarjetas, suspensiones) son un apoyo y la organización debe revisarlos.</li>
          <li>La organización es la responsable de los datos personales que registra y debe contar con la autorización de cada jugador (o de su representante, si es menor de edad).</li>
        </ul>
        <p className="mt-3 text-sm">
          <Link to="/terminos" target="_blank" className="text-brand-400 hover:text-brand-300">Leer los términos completos</Link>
          {' · '}
          <Link to="/privacidad" target="_blank" className="text-brand-400 hover:text-brand-300">Aviso de privacidad</Link>
        </p>
        <label htmlFor={`${fid}-acepto`} className="mt-5 flex items-start gap-3 text-sm text-gray-200">
          <input id={`${fid}-acepto`} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-teal-500"
            checked={marcado} onChange={e => setMarcado(e.target.checked)} />
          <span>Acepto los términos de uso y el aviso de privacidad en nombre de mi organización.</span>
        </label>
        {aceptar.isError && <p role="alert" className="mt-3 text-sm text-red-400">{mensajeDeError(aceptar.error, 'No se pudo guardar. Inténtelo de nuevo.')}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => aceptar.mutate()} disabled={!marcado || aceptar.isPending} className="btn-primary flex-1 disabled:opacity-40">
            {aceptar.isPending ? 'Guardando...' : 'Aceptar y continuar'}
          </button>
          <button type="button" onClick={logout} className="btn-secundario">Salir</button>
        </div>
      </div>
    </div>
  )
}
