import { useId } from 'react'
import { fechaHoraCompleta } from '../utils/fechas'

// Fecha y hora de un partido sin a. m./p. m.: la fecha con el calendario del navegador y la hora
// en dos listas de 24 horas (00 a 23) y minutos. Si la hora cae de madrugada (00:00 a 05:59),
// avisa y ofrece pasarla a la tarde, porque casi siempre es un error al elegir la hora.
//
// value / onChange: «2026-10-29T13:30». Mientras falte una parte, el valor queda incompleto
// (fechaHoraCompleta lo dice) y el formulario no deja guardar.
const HORAS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

const nombreHora = (h) => {
  const n = Number(h)
  if (n === 0) return '00 (medianoche)'
  if (n === 12) return '12 (mediodía)'
  return n < 12 ? `${h} (${n} de la mañana)` : `${h} (${n - 12} de la tarde)`
}

export default function CampoFechaHora({ id, value, onChange, required = false }) {
  const uid = useId()
  const base = id ?? uid
  // «fecha T hora : minutos»; cualquiera de las partes puede faltar mientras se completa.
  const [fecha = '', resto = ''] = (value ?? '').split('T')
  const [hora = '', minuto = ''] = resto.split(':')
  const poner = (f, h, m) => onChange(`${f}T${h}:${h && !m ? '00' : m}`)
  const minutos = minuto && !MINUTOS.includes(minuto) ? [...MINUTOS, minuto].sort() : MINUTOS
  const madrugada = fechaHoraCompleta(value) && Number(hora) < 6

  return (
    <fieldset>
      <legend className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Fecha y hora</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="sr-only">Fecha</span>
          <input id={base} type="date" className="input-field" value={fecha} required={required}
            onChange={e => poner(e.target.value, hora, minuto)} />
        </label>
        <div className="flex items-center gap-1.5">
          <label className="block min-w-0 flex-1 sm:flex-none">
            <span className="sr-only">Hora (formato de 24 horas)</span>
            <select id={`${base}-hora`} className="input-field sm:w-56" value={hora} required={required}
              onChange={e => poner(fecha, e.target.value, minuto)}>
              <option value="">Hora</option>
              {HORAS.map(h => <option key={h} value={h}>{nombreHora(h)}</option>)}
            </select>
          </label>
          <span className="text-gray-400" aria-hidden="true">:</span>
          <label className="block shrink-0">
            <span className="sr-only">Minutos</span>
            <select id={`${base}-minuto`} className="input-field" value={minuto} required={required} style={{ width: '5rem' }}
              onChange={e => poner(fecha, hora, e.target.value)}>
              <option value="">min</option>
              {minutos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">Horario de 24 horas: 13 es la 1 de la tarde.</p>
      {madrugada && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          <span>Ese horario es de madrugada ({hora}:{minuto}). ¿Es correcto?</span>
          <button type="button" className="font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200"
            onClick={() => poner(fecha, String(Number(hora) + 12).padStart(2, '0'), minuto)}>
            Cambiar a {String(Number(hora) + 12).padStart(2, '0')}:{minuto} (tarde)
          </button>
        </div>
      )}
    </fieldset>
  )
}
