import { useModal } from '../feedback/contextos'

// Botones al pie de un formulario: «Cancelar» (si está dentro de una ventana) y el botón principal.
// Sin onGuardar el botón principal es de tipo submit y usa el onSubmit del <form>.
export default function AccionesFormulario({
  texto = 'Guardar',
  textoGuardando = 'Guardando...',
  guardando = false,
  deshabilitado = false,
  onGuardar,
}) {
  const modal = useModal()
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
      {modal && (
        <button type="button" onClick={modal.cerrar} className="btn-secundario sm:flex-1">
          Cancelar
        </button>
      )}
      <button
        type={onGuardar ? 'button' : 'submit'}
        onClick={onGuardar}
        disabled={guardando || deshabilitado}
        className="btn-primary sm:flex-1 disabled:opacity-40"
      >
        {guardando ? textoGuardando : texto}
      </button>
    </div>
  )
}
