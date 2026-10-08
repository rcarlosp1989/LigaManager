import { createContext, useContext } from 'react'

// Contextos y hooks de las piezas compartidas de la Fase 3 (ventanas, confirmaciones y avisos).
// Viven en un archivo sin componentes para que el recargado rápido de Vite funcione bien.

export const AvisosContext   = createContext(null)
export const DialogosContext = createContext(null)
export const ModalContext    = createContext(null)

// Avisos breves que desaparecen solos: aviso.exito('Campeonato creado'), aviso.error('No se pudo guardar.')
export const useAviso = () => useContext(AvisosContext)

// Ventanas propias en lugar de confirm() y prompt() del navegador. Ambas devuelven una promesa:
//   await confirmar({ titulo, mensaje, textoConfirmar, peligro })  -> true | false
//   await pedirNumero({ titulo, etiqueta, min, max, valorInicial }) -> número | null
export const useDialogos = () => useContext(DialogosContext)

// Dentro de una <Modal>: { cerrar } pide el cierre y avisa si hay cambios sin guardar.
export const useModal = () => useContext(ModalContext)

// Mensaje de error de la API o uno por defecto.
export const mensajeDeError = (err, porDefecto) => err?.response?.data?.error || porDefecto

// Agrupa varias consultas de React Query (por ejemplo, los catálogos de un formulario)
// para mostrar un solo estado de error con «Reintentar».
export function erroresDe(...consultas) {
  const fallidas = consultas.filter(c => c?.isError)
  return {
    hayError:     fallidas.length > 0,
    reintentar:   () => fallidas.forEach(c => c.refetch()),
    reintentando: fallidas.some(c => c.isFetching),
  }
}
