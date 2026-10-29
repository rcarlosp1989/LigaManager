// Flyer de la jornada (1080×1350, para WhatsApp y redes): campeonato, jornada, fase, estadio y
// los partidos agrupados por día y ordenados por hora, con el escudo de cada equipo; al pie
// «Siga la jornada en vivo» y el logo de LigaManager. El enlace al campeonato va en el mensaje
// que acompaña a la imagen (una imagen no se puede tocar).
// Se dibuja en un <canvas>, sin librerías. Diseño: lienzo «Flyer de la jornada», versión A.
import { urlFoto } from './fotos'

const ANCHO = 1080
const ALTO = 1350
const C = {
  fondo: '#070d18', tarjeta: '#0e1828', borde: '#1e2b40', texto: '#ffffff', suave: '#cbd5e1',
  tenue: '#64748b', acento: '#2dd4bf', hora: '#facc15', rojo: '#ef4444', boton: '#04201c',
}
const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif'
const CUERPO = '"Trebuchet MS", "Segoe UI", sans-serif'
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
const COLORES = ['#1d4ed8', '#b91c1c', '#a16207', '#15803d', '#0f766e', '#7c3aed', '#c2410c', '#be185d', '#1e40af', '#57534e']

// Trofeo de la marca (mismas formas que el componente MarcaLiga), en coordenadas 120×132.
const TROFEO = {
  asas: ['M30 24 H16 C16 46 24 56 36 58', 'M90 24 H104 C104 46 96 56 84 58'],
  copa: 'M28 14 H92 V50 C92 70 78 82 60 82 C42 82 28 70 28 50 Z',
  rects: [[54, 82, 12, 18], [36, 100, 48, 14]],
  barras: [[42, 50, 10, 18], [55, 40, 10, 28], [68, 28, 10, 40]],
}

// «2026-10-29 13:30» → { dia: '2026-10-29', hora: '13:30' }
const partes = (fecha) => {
  const [dia = '', hora = ''] = String(fecha ?? '').replace('T', ' ').split(' ')
  return { dia, hora: hora.slice(0, 5) }
}
const nombreDia = (dia) => {
  const [a, m, d] = dia.split('-').map(Number)
  const f = new Date(a, m - 1, d)
  return Number.isNaN(f.getTime()) ? dia : `${DIAS[f.getDay()]} ${d} DE ${MESES[m - 1]}`
}
const iniciales = (nombre) => {
  const palabras = String(nombre).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(p => p.length > 1 || /\p{N}/u.test(p))
  const utiles = palabras.filter(p => !/^(c|d|e|f|cd|cs|cdef|sc|fc|club|deportivo|de|del|la|el|los)$/i.test(p))
  const base = utiles.length ? utiles : palabras
  return (base.slice(0, 2).map(p => p[0]).join('') || '?').toUpperCase()
}
const colorDe = (nombre) => COLORES[[...String(nombre)].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORES.length]

// Agrupa los partidos por día y los ordena por hora.
export function agruparPorDia(partidos) {
  const orden = [...partidos].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
  const dias = []
  for (const p of orden) {
    const { dia, hora } = partes(p.fecha)
    let g = dias.find(x => x.dia === dia)
    if (!g) dias.push(g = { dia, nombre: nombreDia(dia), partidos: [] })
    g.partidos.push({ ...p, hora })
  }
  return dias
}

async function cargarImagen(url) {
  if (!url) return null
  try {
    const r = await fetch(urlFoto(url))
    if (!r.ok) return null
    return await createImageBitmap(await r.blob())
  } catch {
    return null
  }
}

async function cargarLetras() {
  if (!document.fonts?.load) return
  try {
    await Promise.all([
      document.fonts.load(`italic 800 100px ${DISPLAY}`),
      document.fonts.load(`600 40px ${DISPLAY}`),
    ])
  } catch { /* se usa la letra de reemplazo */ }
}

// Texto que entra en `ancho`: baja el tamaño hasta `min` y, si aún no entra, lo corta con «…».
function textoQueEntra(ctx, texto, ancho, tamano, min, peso, familia) {
  let t = tamano
  for (; t >= min; t -= 1) {
    ctx.font = `${peso} ${t}px ${familia}`
    if (ctx.measureText(texto).width <= ancho) return { texto, t }
  }
  ctx.font = `${peso} ${min}px ${familia}`
  let s = texto
  while (s.length > 1 && ctx.measureText(`${s}…`).width > ancho) s = s.slice(0, -1)
  return { texto: `${s}…`, t: min }
}

function redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h)
}

function escudo(ctx, img, nombre, cx, cy, r) {
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath()
  if (img) {
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip()
    const lado = Math.min(img.width, img.height)
    ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, cx - r, cy - r, r * 2, r * 2)
  } else {
    ctx.fillStyle = colorDe(nombre); ctx.fill()
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `700 ${Math.round(r * 0.7)}px ${CUERPO}`
    ctx.fillText(iniciales(nombre), cx, cy + 1)
  }
  ctx.restore()
}

function trofeo(ctx, x, y, alto, color) {
  const e = alto / 132
  ctx.save()
  ctx.translate(x, y); ctx.scale(e, e)
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 8; ctx.lineCap = 'round'
  TROFEO.asas.forEach(d => ctx.stroke(new Path2D(d)))
  ctx.fill(new Path2D(TROFEO.copa))
  TROFEO.rects.forEach(([rx, ry, w, h]) => ctx.fillRect(rx, ry, w, h))
  ctx.fillStyle = C.fondo
  TROFEO.barras.forEach(([rx, ry, w, h]) => { redondeado(ctx, rx, ry, w, h, 2); ctx.fill() })
  ctx.restore()
}

// datos: { campeonato, numero, instancia, grupo, partidos: [{ fecha, local, visitante, logoLocal, logoVisitante, estadio }] }
// Devuelve un Blob PNG.
export async function generarFlyer(datos) {
  await cargarLetras()
  const dias = agruparPorDia(datos.partidos)
  const todos = dias.flatMap(d => d.partidos)
  const urls = new Map()
  for (const p of todos) {
    if (!urls.has(p.local)) urls.set(p.local, p.logoLocal)
    if (!urls.has(p.visitante)) urls.set(p.visitante, p.logoVisitante)
  }
  const logos = new Map(await Promise.all([...urls].map(async ([n, url]) => [n, await cargarImagen(url)])))

  const canvas = document.createElement('canvas')
  canvas.width = ANCHO; canvas.height = ALTO
  const ctx = canvas.getContext('2d')
  const X = 80

  // Fondo y trazos de cancha.
  ctx.fillStyle = C.fondo; ctx.fillRect(0, 0, ANCHO, ALTO)
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.10)'; ctx.lineWidth = 3
  ;[[ANCHO + 100, 100, 360], [ANCHO + 100, 100, 160]].forEach(([cx, cy, r]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke() })

  // Encabezado.
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
  ctx.fillStyle = C.acento
  ctx.font = `600 22px ${CUERPO}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '5px'
  const camp = textoQueEntra(ctx, String(datos.campeonato ?? '').toUpperCase(), ANCHO - 2 * X, 22, 16, 600, CUERPO)
  ctx.fillText(camp.texto, X, 72 + 22)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  ctx.fillStyle = C.texto
  ctx.font = `italic 800 184px ${DISPLAY}`
  ctx.fillText(`JORNADA ${datos.numero}`, X - 4, 112 + 160)
  const estadios = [...new Set(todos.map(p => p.estadio).filter(Boolean))]
  const sub = [datos.instancia, datos.grupo ? `Grupo ${datos.grupo}` : null,
    estadios.length === 1 ? `Estadio ${estadios[0].replace(/^estadio\s+/i, '')}` : estadios.length > 1 ? 'Varios estadios' : null]
    .filter(Boolean).join(' · ')
  ctx.fillStyle = C.suave
  const s = textoQueEntra(ctx, sub, ANCHO - 2 * X, 26, 18, 400, CUERPO)
  ctx.fillText(s.texto, X, 330)

  // Partidos: se ajusta el alto de cada fila para que entren todos.
  const inicio = 380
  const pie = ALTO - 64 - 170
  const disponible = pie - inicio - 20
  const titulo = 44
  const gapDia = 26
  let fila = 88
  let gap = 14
  const necesario = (f, g) => dias.length * titulo + (dias.length - 1) * gapDia + todos.length * f + (todos.length - dias.length) * g + dias.length * 14
  while (fila > 48 && necesario(fila, gap) > disponible) { fila -= 2; gap = Math.max(6, Math.round(fila / 7)) }
  const escala = fila / 88

  let y = inicio
  for (const d of dias) {
    ctx.fillStyle = C.acento; ctx.fillRect(X, y + 16, 36, 4)
    ctx.fillStyle = '#f8fafc'; ctx.font = `600 30px ${DISPLAY}`; ctx.textBaseline = 'middle'
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px'
    ctx.fillText(d.nombre, X + 52, y + 18)
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
    y += titulo + 14
    d.partidos.forEach((p, i) => {
      const h = fila
      ctx.fillStyle = C.tarjeta; redondeado(ctx, X, y, ANCHO - 2 * X, h, 18); ctx.fill()
      ctx.strokeStyle = C.borde; ctx.lineWidth = 2; ctx.stroke()
      const cy = y + h / 2
      ctx.textBaseline = 'middle'
      // Hora
      ctx.fillStyle = C.hora; ctx.font = `600 ${Math.round(40 * escala + 4)}px ${DISPLAY}`; ctx.textAlign = 'left'
      ctx.fillText(p.hora || '—', X + 24, cy)
      // Equipos
      const r = Math.round(26 * escala)
      const xl = X + 24 + 136
      const anchoNombre = (ANCHO - 2 * X - 24 - 136 - 24 - 64) / 2 - r * 2 - 14 - 10
      escudo(ctx, logos.get(p.local), p.local, xl + r, cy, r)
      ctx.fillStyle = C.texto; ctx.textAlign = 'left'
      const tl = textoQueEntra(ctx, p.local, anchoNombre, Math.round(25 * escala + 2), 16, 600, CUERPO)
      ctx.fillText(tl.texto, xl + r * 2 + 14, cy)
      const xvs = xl + (ANCHO - 2 * X - 24 - 136 - 24) / 2
      ctx.fillStyle = C.tenue; ctx.textAlign = 'center'; ctx.font = `600 24px ${DISPLAY}`
      ctx.fillText('VS', xvs, cy)
      const xr = ANCHO - X - 24
      escudo(ctx, logos.get(p.visitante), p.visitante, xr - r, cy, r)
      ctx.fillStyle = C.texto; ctx.textAlign = 'right'
      const tv = textoQueEntra(ctx, p.visitante, anchoNombre, Math.round(25 * escala + 2), 16, 600, CUERPO)
      ctx.fillText(tv.texto, xr - r * 2 - 14, cy)
      y += h + (i < d.partidos.length - 1 ? gap : 0)
    })
    y += gapDia
  }

  // Pie.
  const yPie = ALTO - 64 - 170
  ctx.strokeStyle = C.borde; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(X, yPie); ctx.lineTo(ANCHO - X, yPie); ctx.stroke()
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.rojo; ctx.beginPath(); ctx.arc(X + 9, yPie + 36 + 26, 9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.texto; ctx.font = `600 42px ${DISPLAY}`
  ctx.fillText('SIGA LA JORNADA EN VIVO', X + 32, yPie + 36 + 40)
  ctx.fillStyle = C.suave; ctx.font = `400 23px ${CUERPO}`
  ctx.fillText('Marcadores minuto a minuto, posiciones, goleadores y sanciones.', X, yPie + 36 + 84)
  // Botón «Toque el enlace del mensaje →»
  ctx.font = `700 24px ${CUERPO}`
  const textoBoton = 'Toque el enlace del mensaje'
  const wb = ctx.measureText(textoBoton).width + 28 * 2 + 40
  const yb = yPie + 36 + 106
  ctx.fillStyle = C.acento; redondeado(ctx, X, yb, wb, 56, 28); ctx.fill()
  ctx.fillStyle = C.boton; ctx.textBaseline = 'middle'
  ctx.fillText(textoBoton, X + 28, yb + 29)
  const xf = X + wb - 28 - 22
  ctx.strokeStyle = C.boton; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(xf, yb + 28); ctx.lineTo(xf + 20, yb + 28); ctx.moveTo(xf + 12, yb + 20); ctx.lineTo(xf + 20, yb + 28); ctx.lineTo(xf + 12, yb + 36); ctx.stroke()
  // Logo de LigaManager.
  ctx.textBaseline = 'alphabetic'
  ctx.font = `italic 800 46px ${DISPLAY}`
  const wLiga = ctx.measureText('Liga').width
  const wMarca = wLiga + ctx.measureText('Manager').width
  const xm = ANCHO - X - wMarca
  trofeo(ctx, xm - 12 - 46, yb + 56 - 51, 51, C.acento)
  ctx.fillStyle = C.texto; ctx.fillText('Liga', xm, yb + 50)
  ctx.fillStyle = C.acento; ctx.fillText('Manager', xm + wLiga, yb + 50)

  return await new Promise(resolver => canvas.toBlob(resolver, 'image/png'))
}

// Comparte la imagen con el mensaje (celular: menú de compartir, con WhatsApp). Donde no se
// puede compartir un archivo, la descarga y copia el mensaje para pegarlo al enviarla.
// Devuelve 'compartido' | 'descargado' | 'cancelado'.
export async function compartirFlyer(blob, { archivo, texto }) {
  const file = new File([blob], archivo, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: texto })
      return 'compartido'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelado'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = archivo
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  try { await navigator.clipboard?.writeText(texto) } catch { /* sin portapapeles */ }
  return 'descargado'
}
