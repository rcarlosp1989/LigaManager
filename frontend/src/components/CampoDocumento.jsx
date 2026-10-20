import { useEffect, useId, useRef, useState } from 'react'
import { TIPOS_DOCUMENTO, TIPO_PENDIENTE, tipoDocumento, limpiarDocumento, errorDocumento } from '../utils/documento'

// Tipo de documento + número, con validación mientras se escribe.
// El aviso de error aparece al salir del campo o al intentar guardar, no a cada tecla.
// Dentro de un <form>, un número inválido bloquea el envío (validación del navegador).
// forzar: muestra el aviso aunque no se haya tocado el campo (formularios sin <form>).
// conPendiente: ofrece «Documento pendiente» (jugadores): se guarda sin número.
export default function CampoDocumento({ tipo, numero, onChange, opcional = false, labelClass, forzar = false, conPendiente = false }) {
  const fid = useId()
  const ref = useRef(null)
  const [tocado, setTocado] = useState(false)
  const info = tipoDocumento(tipo)
  const pendiente = tipo === 'Pendiente'
  const tipos = conPendiente ? [...TIPOS_DOCUMENTO, TIPO_PENDIENTE] : TIPOS_DOCUMENTO
  const error = pendiente || (opcional && !numero) ? null : errorDocumento(tipo, numero)
  const mostrarError = (tocado || forzar) && error
  useEffect(() => { ref.current?.setCustomValidity(error ?? '') }, [error])
  const etiqueta = labelClass ?? 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div>
        <label htmlFor={`${fid}-tipo`} className={etiqueta}>Tipo de documento</label>
        <select id={`${fid}-tipo`} className="input-field" value={tipo}
          onChange={e => onChange({ tipo: e.target.value, numero: limpiarDocumento(e.target.value, numero) })}>
          {tipos.map(t => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
        </select>
      </div>
      {pendiente ? (
        <p className="self-end rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
          Se guarda sin número. En la nómina aparecerá «Pendiente» hasta que lo completes con Editar.
        </p>
      ) : (
      <div>
        <label htmlFor={`${fid}-num`} className={etiqueta}>
          Número {opcional && <span className="normal-case text-gray-600">(opcional)</span>}
        </label>
        <input ref={ref} id={`${fid}-num`} className="input-field" value={numero} required={!opcional}
          inputMode={tipo === 'Pasaporte' ? 'text' : 'numeric'} autoCapitalize="characters" autoComplete="off"
          maxLength={tipo === 'Cedula' ? 10 : tipo === 'Extranjero' ? 15 : 20}
          placeholder={info.ejemplo}
          aria-invalid={mostrarError ? true : undefined} aria-describedby={`${fid}-ayuda`}
          onBlur={() => setTocado(true)}
          onInvalid={() => setTocado(true)}
          onChange={e => onChange({ tipo, numero: limpiarDocumento(tipo, e.target.value) })} />
        <p id={`${fid}-ayuda`} className={`mt-1 text-xs ${mostrarError ? 'text-red-400' : 'text-gray-500'}`} role={mostrarError ? 'alert' : undefined}>
          {mostrarError ? error : info.ayuda}
        </p>
      </div>
      )}
    </div>
  )
}
