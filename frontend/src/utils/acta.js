import jsPDF from 'jspdf'
import { urlFoto } from './fotos'
import { ordenarPorDorsal } from './planilla'

// Acta de juego de un partido (PDF A4 vertical), para registrarlo a mano si hace falta.
// Mismo formato que el acta en papel de la liga: logo de la liga a los dos lados, datos del
// partido, una tabla por equipo con todos sus jugadores habilitados (No. = dorsal, Nombres,
// T/S, Ent, Sal, T-A, T-R, Gol), marcador, observaciones y firmas.
//
// datos: {
//   campeonato, logoLiga (url o null), numeroFecha, instancia, grupo,
//   fecha ('yyyy-MM-dd HH:mm'), estadio, arbitro,
//   local: { nombre, jugadores: [{ dorsal, nombre, apellido, suspendido }] },
//   visitante: { …igual },
// }
// Devuelve el jsPDF (el que llama decide guardarlo).

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function fechaLarga(valor) {
  const [dia] = String(valor ?? '').split(' ')
  const [a, m, d] = dia.split('-').map(Number)
  if (!a || !m || !d) return ''
  const f = new Date(a, m - 1, d)
  return `${DIAS[f.getDay()]} ${d} de ${MESES[m - 1]} de ${a}`
}

// Logo como PNG para el PDF (jsPDF no lee WEBP). Se pide de nuevo al servidor: la copia que el
// navegador guardó al mostrarlo no sirve para dibujarlo (ver flyer.js).
async function cargarLogo(url) {
  if (!url) return null
  try {
    const r = await fetch(urlFoto(url), { cache: 'reload' })
    if (!r.ok) return null
    const img = await createImageBitmap(await r.blob())
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    canvas.getContext('2d').drawImage(img, 0, 0)
    return { dataUrl: canvas.toDataURL('image/png'), ancho: img.width, alto: img.height }
  } catch {
    return null
  }
}

// Recorta el texto con «…» hasta que entre en el ancho (mm) con la letra actual.
function recortar(doc, texto, ancho) {
  let s = String(texto ?? '')
  if (doc.getTextWidth(s) <= ancho) return s
  while (s.length > 1 && doc.getTextWidth(`${s}…`) > ancho) s = s.slice(0, -1)
  return `${s.trimEnd()}…`
}

const punteada = (doc) => { doc.setLineDashPattern([0.35, 0.7], 0); doc.setLineWidth(0.25) }
const continua = (doc, grosor = 0.25) => { doc.setLineDashPattern([], 0); doc.setLineWidth(grosor) }

// Etiqueta en negrita y, a continuación, una línea punteada con el valor (o vacía para llenar a mano).
function campo(doc, etiqueta, valor, x, y, ancho) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
  const et = `${etiqueta.toUpperCase()}`
  doc.text(et, x, y)
  const x0 = x + doc.getTextWidth(et) + 1.5
  punteada(doc); doc.line(x0, y + 0.8, x + ancho, y + 0.8); continua(doc)
  if (valor) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(recortar(doc, valor, x + ancho - x0 - 2), x0 + 1, y - 0.3)
  }
}

const COLUMNAS = [
  { titulo: 'No.', ancho: 8 },
  { titulo: 'NOMBRES', ancho: null },
  { titulo: 'T/S', ancho: 7 },
  { titulo: 'ENT', ancho: 7 },
  { titulo: 'SAL', ancho: 7 },
  { titulo: 'T-A', ancho: 7 },
  { titulo: 'T-R', ancho: 7, gris: true },
  { titulo: 'GOL', ancho: 7 },
]

function tabla(doc, equipo, letra, x, y, ancho, filas, altoFila) {
  const fijos = COLUMNAS.reduce((s, c) => s + (c.ancho ?? 0), 0)
  const cols = COLUMNAS.map(c => ({ ...c, ancho: c.ancho ?? ancho - fijos }))
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text(recortar(doc, `JUGADORES ${letra} · ${equipo.nombre.toUpperCase()}`, ancho), x + ancho / 2, y, { align: 'center' })
  const y0 = y + 2
  const altoEnc = 5.5
  const alto = altoEnc + filas * altoFila

  // Sombra de la columna T-R y encabezado.
  let cx = x
  for (const c of cols) {
    if (c.gris) { doc.setFillColor(225, 225, 225); doc.rect(cx, y0, c.ancho, alto, 'F') }
    cx += c.ancho
  }
  doc.setFontSize(6.5)
  cx = x
  for (const c of cols) {
    doc.text(c.titulo, cx + c.ancho / 2, y0 + altoEnc / 2 + 0.8, { align: 'center' })
    cx += c.ancho
  }

  // Filas: jugadores y, al final, filas vacías para anotar a mano.
  const tamLetra = Math.min(8.5, Math.max(6, altoFila * 1.65))
  const jugadores = ordenarPorDorsal(equipo.jugadores)
  for (let i = 0; i < filas; i++) {
    const j = jugadores[i]
    if (!j) continue
    const yb = y0 + altoEnc + i * altoFila + altoFila / 2 + tamLetra * 0.13
    doc.setFont('helvetica', 'bold'); doc.setFontSize(tamLetra)
    doc.setTextColor(17, 24, 39)
    if (j.dorsal != null) doc.text(String(j.dorsal), x + cols[0].ancho / 2, yb, { align: 'center' })
    const xn = x + cols[0].ancho + 1.2
    let anchoNombre = cols[1].ancho - 2.4
    if (j.suspendido) {
      doc.setFontSize(5.5)
      const marca = 'SUSPENDIDO'
      const am = doc.getTextWidth(marca) + 1.6
      const xm = x + cols[0].ancho + cols[1].ancho - am - 1
      continua(doc, 0.2); doc.rect(xm, yb - tamLetra * 0.3, am, tamLetra * 0.42)
      doc.text(marca, xm + 0.8, yb - 0.25)
      anchoNombre -= am + 1.5
      doc.setTextColor(110, 110, 110)
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(tamLetra)
    const nombre = recortar(doc, `${j.nombre} ${j.apellido}`.trim(), anchoNombre)
    doc.text(nombre, xn, yb)
    if (j.suspendido) {
      continua(doc, 0.3); doc.setDrawColor(80, 80, 80)
      doc.line(xn, yb - tamLetra * 0.12, xn + doc.getTextWidth(nombre), yb - tamLetra * 0.12)
      doc.setDrawColor(17, 24, 39); doc.setTextColor(17, 24, 39)
    }
  }

  // Cuadrícula.
  continua(doc, 0.2); doc.setDrawColor(110, 110, 110)
  for (let i = 1; i < filas; i++) doc.line(x, y0 + altoEnc + i * altoFila, x + ancho, y0 + altoEnc + i * altoFila)
  doc.setDrawColor(17, 24, 39)
  cx = x
  for (const c of cols.slice(0, -1)) { cx += c.ancho; doc.line(cx, y0, cx, y0 + alto) }
  continua(doc, 0.45)
  doc.line(x, y0 + altoEnc, x + ancho, y0 + altoEnc)
  doc.rect(x, y0, ancho, alto)
  continua(doc)
  return y0 + alto
}

export async function generarActa(datos) {
  const logo = await cargarLogo(datos.logoLiga)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const M = 12
  const ANCHO = 210
  doc.setTextColor(17, 24, 39); doc.setDrawColor(17, 24, 39)

  // Encabezado: logo de la liga a los dos lados.
  const LADO = 21
  if (logo) {
    const e = LADO / Math.max(logo.ancho, logo.alto)
    const w = logo.ancho * e, h = logo.alto * e
    for (const x of [M, ANCHO - M - LADO]) {
      try { doc.addImage(logo.dataUrl, 'PNG', x + (LADO - w) / 2, 9 + (LADO - h) / 2, w, h, undefined, 'FAST') } catch { /* sin logo */ }
    }
  }
  const anchoCentro = ANCHO - 2 * (M + LADO + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  const titulo = doc.splitTextToSize(String(datos.campeonato ?? '').toUpperCase(), anchoCentro).slice(0, 2)
  let y = titulo.length > 1 ? 14 : 16
  titulo.forEach((l, i) => doc.text(l, ANCHO / 2, y + i * 4.6, { align: 'center' }))
  y += titulo.length * 4.6 + 0.6
  doc.setFontSize(9.5); doc.setCharSpace(0.6)
  doc.text('ACTA DE JUEGO', ANCHO / 2, y, { align: 'center' })
  doc.setCharSpace(0)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  doc.text(recortar(doc, `${datos.local.nombre}  vs  ${datos.visitante.nombre}`, anchoCentro), ANCHO / 2, y + 4.6, { align: 'center' })

  // Datos del partido.
  const fase = [datos.numeroFecha, datos.instancia, datos.grupo ? (/^grupo\b/i.test(datos.grupo) ? datos.grupo : `Grupo ${datos.grupo}`) : null].filter(Boolean).join(' · ')
  const col = (ANCHO - 2 * M - 8) / 2
  const x2 = M + col + 8
  y = 38
  const pares = [
    ['Número de fecha', fase, 'Hora', String(datos.fecha ?? '').slice(11, 16)],
    ['Fecha', fechaLarga(datos.fecha), 'Estadio', datos.estadio],
    ['Vocal', '', 'Árbitro', datos.arbitro],
    ['Nombre de equipo A', datos.local.nombre, 'Nombre de equipo B', datos.visitante.nombre],
  ]
  for (const [e1, v1, e2, v2] of pares) {
    campo(doc, e1, v1, M, y, col)
    campo(doc, e2, v2, x2, y, col)
    y += 6.6
  }

  // Tablas: el mismo número de filas en las dos, con al menos 3 vacías al final.
  const PIE = 64   // mm reservados abajo: nota, marcador, observaciones y firmas
  const yTabla = y + 2
  const filas = Math.max(24, datos.local.jugadores.length + 3, datos.visitante.jugadores.length + 3)
  const altoFila = Math.min(5.6, (297 - M - PIE - yTabla - 7.5) / filas)
  const fin = Math.max(
    tabla(doc, datos.local, 'A', M, yTabla, col, filas, altoFila),
    tabla(doc, datos.visitante, 'B', x2, yTabla, col, filas, altoFila),
  )
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(75, 85, 99)
  doc.text('T/S: escriba T (titular) o S (suplente).', M, fin + 3.2)
  doc.text('T/S: escriba T (titular) o S (suplente).', x2, fin + 3.2)
  doc.setTextColor(17, 24, 39)

  // Marcador, observaciones y firmas.
  y = fin + 10
  campo(doc, 'Marcador equipo A', '', M, y, col)
  campo(doc, 'Marcador equipo B', '', x2, y, col)
  y += 8
  const linea = (yy) => { punteada(doc); doc.line(M, yy, ANCHO - M, yy); continua(doc) }
  campo(doc, 'Observación vocal', '', M, y, ANCHO - 2 * M)
  linea(y + 6.8)
  y += 13
  campo(doc, 'Observación arbitral', '', M, y, ANCHO - 2 * M)
  linea(y + 6.8)

  const yFirma = 297 - M - 9
  const anchoFirma = (ANCHO - 2 * M - 3 * 8) / 4
  ;['Delegado A', 'Árbitro', 'Vocal', 'Delegado B'].forEach((t, i) => {
    const x = M + i * (anchoFirma + 8)
    punteada(doc); doc.line(x, yFirma, x + anchoFirma, yFirma); continua(doc)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
    doc.text(t.toUpperCase(), x + anchoFirma / 2, yFirma + 3.4, { align: 'center' })
  })
  const hoy = new Date()
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(107, 114, 128)
  doc.text(`Generado con LigaManager · ${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`, ANCHO - M, 297 - 5, { align: 'right' })
  return doc
}
