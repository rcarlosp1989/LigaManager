import jsPDF from 'jspdf'

// Pagos del campeonato: formato de montos, nombres de conceptos y el recibo de un abono.

export const CONCEPTOS = {
  INSCRIPCION: 'Inscripción', REFUERZO: 'Refuerzo', ARBITRAJE: 'Arbitraje',
  AMARILLA: 'Tarjeta amarilla', ROJA: 'Tarjeta roja', MULTA: 'Multa', APELACION: 'Apelación', OTRO: 'Otro',
}

// Etiqueta corta y colores (clases de Tailwind) de cada concepto en la lista de cobros.
export const ETIQUETAS = {
  INSCRIPCION: ['INS', 'bg-sky-500/15 text-sky-300'],
  REFUERZO:    ['REF', 'bg-violet-500/15 text-violet-300'],
  ARBITRAJE:   ['ARB', 'bg-teal-500/15 text-teal-300'],
  AMARILLA:    ['T-A', 'bg-yellow-500/15 text-yellow-300'],
  ROJA:        ['T-R', 'bg-red-500/15 text-red-300'],
  MULTA:       ['MUL', 'bg-rose-500/15 text-rose-300'],
  APELACION:   ['APE', 'bg-amber-500/15 text-amber-300'],
  OTRO:        ['OTR', 'bg-gray-500/15 text-gray-300'],
}

export const METODOS = [['EFECTIVO', 'Efectivo'], ['TRANSFERENCIA', 'Transferencia'], ['DEPOSITO', 'Depósito'], ['OTRO', 'Otro']]
export const nombreMetodo = (m) => METODOS.find(([k]) => k === m)?.[1] ?? m

// Formato del dólar en Ecuador: 1234.5 → «$1,234.50». 0 → «$0.00».
export function dinero(n) {
  const [ent, dec] = Math.abs(Number(n) || 0).toFixed(2).split('.')
  return `${Number(n) < 0 ? '-' : ''}$${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`
}

// Texto que escribe el usuario → número, o NaN. Acepta punto o coma como decimal:
// «2», «2.5», «2,50», «1,234.50», «1.234,50», «1,234» (miles), «$ 12.00».
export function leerMonto(texto) {
  let s = String(texto ?? '').trim().replace(/\$/g, '').replace(/\s/g, '')
  if (s === '') return NaN
  const punto = s.lastIndexOf('.'), coma = s.lastIndexOf(',')
  if (punto >= 0 && coma >= 0) {
    // Con ambos signos, el último es el decimal.
    s = punto > coma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.')
  } else if (coma >= 0) {
    // Solo coma: decimal si le siguen 1 o 2 cifras al final («2,5», «2,50»); si no, separa miles («1,234»).
    s = /^\d+,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,(?=\d{3}(\D|$))/g, '')
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '')    // «1.234.567» como miles
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN
  return Number(s)
}

// Monto para mostrar en un campo de texto: 12.5 → «12.50»; 0 → «».
export const montoEnCampo = (n) => (Number(n) ? Number(n).toFixed(2) : '')

// Fecha de hoy en Ecuador, 'yyyy-MM-dd'.
export function hoyEcuador() {
  const d = new Date(Date.now() - 5 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

// 'yyyy-MM-dd' → 'dd/MM/yyyy'.
export const fechaCorta = (v) => {
  const [a, m, d] = String(v ?? '').split('-')
  return a && m && d ? `${d}/${m}/${a}` : v ?? ''
}

// Recibo de un abono (PDF A5 vertical).
// datos: { campeonato, equipo, abono: { lote, fecha, metodo, referencia, monto, cobros: [texto] }, saldo }
export function generarRecibo({ campeonato, equipo, abono, saldo }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' })
  const ancho = doc.internal.pageSize.getWidth()
  const m = 14
  let y = 18
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('RECIBO DE PAGO', ancho / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(doc.splitTextToSize(campeonato, ancho - 2 * m), ancho / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(8); doc.setTextColor(110)
  doc.text(`N.º ${abono.lote.slice(0, 8).toUpperCase()}`, ancho / 2, y, { align: 'center' })
  doc.setTextColor(0)
  y += 10

  const fila = (etiqueta, valor) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(etiqueta, m, y)
    doc.setFont('helvetica', 'normal')
    const lineas = doc.splitTextToSize(String(valor), ancho - 2 * m - 32)
    doc.text(lineas, m + 32, y)
    y += 6 * lineas.length
  }
  fila('Equipo', equipo)
  fila('Fecha', fechaCorta(abono.fecha))
  fila('Método', nombreMetodo(abono.metodo))
  if (abono.referencia) fila('Referencia', abono.referencia)

  y += 2
  doc.setLineWidth(0.3); doc.line(m, y, ancho - m, y); y += 6
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('Aplicado a', m, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  for (const c of abono.cobros) {
    const lineas = doc.splitTextToSize(`• ${c}`, ancho - 2 * m)
    doc.text(lineas, m, y)
    y += 4.5 * lineas.length
  }
  y += 3
  doc.line(m, y, ancho - m, y); y += 9

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text('Valor recibido', m, y); doc.text(dinero(abono.monto), ancho - m, y, { align: 'right' })
  y += 7
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text('Saldo pendiente del equipo', m, y); doc.text(dinero(saldo), ancho - m, y, { align: 'right' })

  y = Math.max(y + 30, 170)
  doc.setLineWidth(0.25); doc.line(ancho / 2 - 30, y, ancho / 2 + 30, y)
  doc.setFontSize(8); doc.text('Recibí conforme', ancho / 2, y + 4, { align: 'center' })
  return doc
}
