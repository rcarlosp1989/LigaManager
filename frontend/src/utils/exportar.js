import writeXlsxFile from 'write-excel-file/browser'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Exporta una tabla simple (encabezados + filas de texto/número) a un archivo .xlsx.
// columnas: [{ titulo: 'Nombre', ancho?: 20 }]
// filas: [[valor1, valor2, ...], ...]
export async function exportarExcel({ columnas, filas, archivo, hoja = 'Hoja1' }) {
  const encabezado = columnas.map(c => ({
    value: c.titulo, fontWeight: 'bold', backgroundColor: '#1F6F5C', color: '#FFFFFF',
    width: c.ancho ?? 18,
  }))
  const datos = filas.map(fila => fila.map(valor => ({ value: valor ?? '' })))
  await writeXlsxFile([encabezado, ...datos], { sheet: hoja }).toFile(archivo)
}

// Exporta la misma tabla a un .pdf, con título y la fecha de generación.
export function exportarPdf({ titulo, subtitulo, columnas, filas, archivo }) {
  const doc = new jsPDF({ orientation: columnas.length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(14)
  doc.text(titulo, 14, 15)
  if (subtitulo) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(subtitulo, 14, 21)
  }
  autoTable(doc, {
    startY: subtitulo ? 26 : 20,
    head: [columnas.map(c => c.titulo)],
    body: filas,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [31, 111, 92] },
  })
  doc.save(archivo)
}
