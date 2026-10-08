import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { DialogosContext } from '../feedback/contextos'
import { useAtraparFoco } from '../feedback/foco'

// Ventanas propias que reemplazan a confirm() y prompt() del navegador.
export default function DialogosProvider({ children }) {
  const [dialogo, setDialogo] = useState(null)
  const actual = useRef(null)

  const abrir = useCallback((tipo, opciones) => new Promise(resolve => {
    // Si ya había uno abierto, se resuelve como cancelado.
    actual.current?.resolve(tipo === 'numero' ? null : false)
    const nuevo = { tipo, opciones, resolve, clave: Date.now() }
    actual.current = nuevo
    setDialogo(nuevo)
  }), [])

  const api = useMemo(() => ({
    confirmar:   (opciones) => abrir('confirmar', opciones),
    pedirNumero: (opciones) => abrir('numero', opciones),
  }), [abrir])

  const cerrar = (valor) => {
    actual.current?.resolve(valor)
    actual.current = null
    setDialogo(null)
  }

  return (
    <DialogosContext.Provider value={api}>
      {children}
      {dialogo && <VentanaDialogo key={dialogo.clave} dialogo={dialogo} onCerrar={cerrar} />}
    </DialogosContext.Provider>
  )
}

function VentanaDialogo({ dialogo, onCerrar }) {
  const { tipo, opciones } = dialogo
  const {
    titulo, mensaje, peligro = false,
    textoConfirmar = tipo === 'numero' ? 'Aceptar' : 'Confirmar',
    textoCancelar = 'Cancelar',
    etiqueta = 'Valor', min, max, valorInicial = '',
  } = opciones
  const ref = useRef(null)
  const tituloId = useId()
  const mensajeId = useId()
  const campoId = useId()
  const errorId = useId()
  const [valor, setValor] = useState(String(valorInicial ?? ''))
  const [error, setError] = useState('')
  const esNumero = tipo === 'numero'
  const cancelar = () => onCerrar(esNumero ? null : false)

  // En una confirmación el foco empieza en «Cancelar», para no borrar nada por accidente.
  useAtraparFoco(ref, { enfocarPrimero: esNumero ? 'input' : '[data-cancelar]' })

  const aceptar = (e) => {
    e.preventDefault()
    if (!esNumero) return onCerrar(true)
    const numero = Number(valor)
    const fueraDeRango = (min != null && numero < min) || (max != null && numero > max)
    if (valor.trim() === '' || !Number.isInteger(numero) || fueraDeRango) {
      setError(min != null && max != null ? `Escribe un número entre ${min} y ${max}.` : 'Escribe un número válido.')
      return
    }
    onCerrar(numero)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={cancelar} aria-hidden="true" />
      <form
        ref={ref}
        onSubmit={aceptar}
        noValidate
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); cancelar() } }}
        role={esNumero ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={mensaje ? mensajeId : undefined}
        className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-5 space-y-4"
      >
        <h2 id={tituloId} className="text-white font-semibold text-lg leading-snug">{titulo}</h2>
        {mensaje && <p id={mensajeId} className="text-gray-400 text-sm">{mensaje}</p>}
        {esNumero && (
          <div>
            <label htmlFor={campoId} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{etiqueta}</label>
            <input
              id={campoId}
              type="number"
              inputMode="numeric"
              className="input-field"
              value={valor}
              min={min}
              max={max}
              onChange={e => { setValor(e.target.value); setError('') }}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
            />
            {error && <p id={errorId} role="alert" className="text-red-400 text-sm mt-1.5">{error}</p>}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
          <button type="button" data-cancelar onClick={cancelar} className="btn-secundario sm:flex-1">{textoCancelar}</button>
          <button type="submit" className={`${peligro ? 'btn-peligro' : 'btn-primary'} sm:flex-1`}>{textoConfirmar}</button>
        </div>
      </form>
    </div>
  )
}
