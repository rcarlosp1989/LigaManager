import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import LogoEquipo from './LogoEquipo'
import { achicarImagen, LADO_LOGO } from '../utils/imagen'

const MAX_LOGO_BYTES = 300 * 1024

// Campo «Logo» del formulario de equipo, con vista previa.
//  - nombre: nombre del equipo (para las iniciales cuando no hay logo).
//  - logoActual: URL del logo guardado, si tiene.
//  - valor: { archivo: File | null, quitar: boolean }; onChange recibe el nuevo valor.
// La imagen se achica a 256 px en el celular antes de subirla.
export default function CampoLogo({ nombre, logoActual, valor, onChange, onProcesando }) {
  const id = useId()
  const input = useRef(null)
  const [vista, setVista] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  // Vista previa de la imagen elegida; se libera al cambiarla y al cerrar el formulario.
  const vistaRef = useRef(null)
  const ponerVista = (archivo) => {
    if (vistaRef.current) URL.revokeObjectURL(vistaRef.current)
    vistaRef.current = archivo ? URL.createObjectURL(archivo) : null
    setVista(vistaRef.current)
  }
  useEffect(() => () => { if (vistaRef.current) URL.revokeObjectURL(vistaRef.current) }, [])

  const elegir = async (e) => {
    const original = e.target.files?.[0]
    e.target.value = ''
    if (!original) return
    setError('')
    if (!/^image\/(jpeg|png|webp)$/.test(original.type)) {
      setError('El logo debe ser una imagen JPG, PNG o WEBP.')
      return
    }
    setProcesando(true); onProcesando?.(true)
    try {
      const archivo = await achicarImagen(original, LADO_LOGO)
      if (archivo.size > MAX_LOGO_BYTES) {
        setError('La imagen es demasiado pesada. Pruebe con otra (máximo 300 KB).')
        return
      }
      ponerVista(archivo)
      onChange({ archivo, quitar: false })
    } finally {
      setProcesando(false); onProcesando?.(false)
    }
  }

  const mostrado = vista ?? (valor.quitar ? null : logoActual)
  const tieneLogo = !!mostrado

  return (
    <div>
      <span id={`${id}-et`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
        Logo <span className="normal-case text-gray-600">(opcional)</span>
      </span>
      <div className="flex items-center gap-3">
        <LogoEquipo nombre={nombre || '?'} logoUrl={mostrado} tamano={64} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={procesando}
            aria-describedby={`${id}-et`}
            className="btn-secundario inline-flex items-center gap-1.5 text-sm">
            <ImagePlus size={16} aria-hidden="true" />
            {procesando ? 'Preparando…' : tieneLogo ? 'Cambiar' : 'Subir logo'}
          </button>
          {tieneLogo && !procesando && (
            <button type="button"
              onClick={() => { setError(''); ponerVista(null); onChange({ archivo: null, quitar: !!logoActual }) }}
              className="btn-secundario inline-flex items-center gap-1.5 text-sm text-red-300">
              <Trash2 size={16} aria-hidden="true" /> Quitar
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
        tabIndex={-1} aria-hidden="true" onChange={elegir} />
      <p className="text-gray-500 text-xs mt-1.5">
        {valor.quitar && !vista ? 'El logo se quitará al guardar.' : 'JPG, PNG o WEBP. Se ve mejor si es cuadrado.'}
      </p>
      {error && <p role="alert" className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
