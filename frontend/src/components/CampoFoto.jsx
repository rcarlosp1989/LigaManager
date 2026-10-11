import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import FotoJugador from './FotoJugador'

// Campo «Foto del jugador» con vista previa.
//  - nombre: para las iniciales cuando no hay foto.
//  - fotoActual: dirección de la foto guardada, si tiene.
//  - archivo / onChange(File | null): la foto elegida (se achica al guardar).
export default function CampoFoto({ id, etiqueta = 'Foto del jugador', nombre, fotoActual, archivo, onChange }) {
  const input = useRef(null)
  const [vista, setVista] = useState(null)
  const [error, setError] = useState('')

  // Vista previa de la foto elegida; se libera al cambiarla y al cerrar el formulario.
  const vistaRef = useRef(null)
  const ponerVista = (f) => {
    if (vistaRef.current) URL.revokeObjectURL(vistaRef.current)
    vistaRef.current = f ? URL.createObjectURL(f) : null
    setVista(vistaRef.current)
  }
  useEffect(() => () => { if (vistaRef.current) URL.revokeObjectURL(vistaRef.current) }, [])

  const elegir = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setError('La foto debe ser una imagen JPG, PNG o WEBP.')
      return
    }
    setError('')
    ponerVista(f)
    onChange(f)
  }

  const deshacer = () => { ponerVista(null); onChange(null) }
  const mostrada = archivo ? vista : fotoActual

  return (
    <div>
      <span id={`${id}-et`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">
        {etiqueta} <span className="normal-case text-gray-600">(opcional)</span>
      </span>
      <div className="flex items-center gap-3">
        <FotoJugador nombre={nombre || '?'} fotoUrl={mostrada} tamano={64} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} aria-describedby={`${id}-et`}
            className="btn-secundario inline-flex items-center gap-1.5 text-sm">
            <Camera size={16} aria-hidden="true" />
            {mostrada ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {archivo && (
            <button type="button" onClick={deshacer} className="btn-secundario text-sm">
              {fotoActual ? 'Dejar la anterior' : 'Quitar'}
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
        tabIndex={-1} aria-hidden="true" onChange={elegir} />
      <p className="text-gray-500 text-xs mt-1.5">JPG, PNG o WEBP. Se achica sola antes de subirla.</p>
      {error && <p role="alert" className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
