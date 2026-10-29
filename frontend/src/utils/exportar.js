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
//  - logo (opcional): { dataUrl, ancho, alto } — se dibuja a la izquierda del título.
//  - fotos (opcional): una por fila ({ dataUrl, formato } o null), en una primera columna
//    «Foto»; sin foto se dibujan las iniciales de iniciales[i].
//  - marca (opcional): el trofeo de LigaManager ({ dataUrl, ancho, alto }) para el pie de cada página.
export function exportarPdf({ titulo, subtitulo, columnas, filas, archivo, logo, fotos, iniciales, marca }) {
  const conFotos = Array.isArray(fotos)
  const cols = conFotos ? [{ titulo: 'Foto' }, ...columnas] : columnas
  const doc = new jsPDF({ orientation: cols.length > 6 ? 'landscape' : 'portrait' })
  let x = 14
  let inicioTabla = subtitulo ? 26 : 20
  if (logo) {
    const lado = 18   // mm: el lado mayor del logo
    const escala = lado / Math.max(logo.ancho, logo.alto)
    const ancho = logo.ancho * escala
    const alto = logo.alto * escala
    try {
      doc.addImage(logo.dataUrl, logo.formato ?? 'PNG', 14 + (lado - ancho) / 2, 8 + (lado - alto) / 2, ancho, alto, undefined, 'FAST')
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
  const FOTO = 10   // mm
  autoTable(doc, {
    startY: inicioTabla,
    head: [cols.map(c => c.titulo)],
    body: conFotos ? filas.map(f => ['', ...f]) : filas,
    margin: { bottom: 18 },   // espacio para el pie «Generado con LigaManager»
    styles: { fontSize: 8, valign: 'middle' },
    headStyles: { fillColor: [31, 111, 92] },
    columnStyles: conFotos ? { 0: { cellWidth: FOTO + 4, minCellHeight: FOTO + 2 } } : {},
    didDrawCell: conFotos ? (d) => {
      if (d.section !== 'body' || d.column.index !== 0) return
      const cx = d.cell.x + (d.cell.width - FOTO) / 2
      const cy = d.cell.y + (d.cell.height - FOTO) / 2
      const foto = fotos[d.row.index]
      if (foto) {
        try { doc.addImage(foto.dataUrl, foto.formato ?? 'JPEG', cx, cy, FOTO, FOTO, undefined, 'FAST'); return } catch { /* iniciales */ }
      }
      doc.setFillColor(225, 229, 234)
      doc.circle(cx + FOTO / 2, cy + FOTO / 2, FOTO / 2, 'F')
      doc.setFontSize(8); doc.setTextColor(70)
      doc.text(iniciales?.[d.row.index] ?? '', cx + FOTO / 2, cy + FOTO / 2, { align: 'center', baseline: 'middle' })
    } : undefined,
  })
  // Pie de cada página: «Generado con LigaManager» y el número de página.
  const paginas = doc.getNumberOfPages()
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    let xPie = 14
    if (marca) {
      try { doc.addImage(marca.dataUrl, marca.formato ?? 'PNG', 14, alto - 11.5, 4.4, 4.8, undefined, 'FAST'); xPie = 20 } catch { /* sin trofeo */ }
    }
    doc.setFontSize(8); doc.setTextColor(110)
    doc.text('Generado con LigaManager', xPie, alto - 8)
    doc.text(`Página ${i} de ${paginas}`, ancho - 14, alto - 8, { align: 'right' })
  }
  doc.save(archivo)
}
