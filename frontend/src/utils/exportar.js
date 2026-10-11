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
// logo (opcional): { dataUrl, ancho, alto } — se dibuja a la izquierda del título.
export function exportarPdf({ titulo, subtitulo, columnas, filas, archivo, logo }) {
  const doc = new jsPDF({ orientation: columnas.length > 6 ? 'landscape' : 'portrait' })
  let x = 14
  let inicioTabla = subtitulo ? 26 : 20
  if (logo) {
    const lado = 18   // mm: el lado mayor del logo
    const escala = lado / Math.max(logo.ancho, logo.alto)
    const ancho = logo.ancho * escala
    const alto = logo.alto * escala
    try {
      doc.addImage(logo.dataUrl, 'PNG', 14 + (lado - ancho) / 2, 8 + (lado - alto) / 2, ancho, alto, undefined, 'FAST')
      x = 14 + lado + 4
      inicioTabla = Math.max(inicioTabla, 8 + lado + 4)
    } catch { /* sin logo si la imagen no sirve */ }
  }
  doc.setFontSize(14)
  doc.text(titulo, x, 15)
  if (subtitulo) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(subtitulo, x, 21)
  }
  autoTable(doc, {
    startY: inicioTabla,
    head: [columnas.map(c => c.titulo)],
    body: filas,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [31, 111, 92] },
  })
  doc.save(archivo)
}
