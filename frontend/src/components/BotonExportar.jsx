import { useState } from 'react'
import { exportarExcel, exportarPdf } from '../utils/exportar'
import { imagenParaPdf } from '../utils/imagen'
import { urlFoto } from '../utils/fotos'

// Botones para exportar una tabla (columnas + filas ya armadas) a Excel y PDF.
// logoUrl (opcional): imagen para el encabezado del PDF (p. ej. el logo del equipo).
export default function BotonExportar({ titulo, subtitulo, columnas, filas, archivoBase, disabled, logoUrl }) {
  const [procesando, setProcesando] = useState(false)
  const sinDatos = disabled || filas.length === 0

  const aExcel = async () => {
    setProcesando(true)
    try {
      await exportarExcel({ columnas, filas, archivo: `${archivoBase}.xlsx` })
    } finally {
      setProcesando(false)
    }
  }

  const aPdf = async () => {
    setProcesando(true)
    try {
      const logo = logoUrl ? await imagenParaPdf(urlFoto(logoUrl)) : null
      exportarPdf({ titulo, subtitulo, columnas, filas, archivo: `${archivoBase}.pdf`, logo })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={aExcel} disabled={sinDatos || procesando}
        className="text-xs px-3 py-1.5 rounded border border-green-800 text-green-400 hover:bg-green-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap">
        ⬇ Excel
      </button>
      <button onClick={aPdf} disabled={sinDatos || procesando}
        className="text-xs px-3 py-1.5 rounded border border-red-800 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap">
        ⬇ PDF
      </button>
    </div>
  )
}
