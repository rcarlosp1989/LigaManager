// Fechas legibles a partir de lo que devuelve la API («2026-10-04», «2026-10-04 10:00»
// o «2026-10-04T10:00»). Se arma a mano para no depender del idioma del navegador.

const DIAS  = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const PATRON = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/

function partes(valor) {
  const m = PATRON.exec(valor ?? '')
  if (!m) return null
  const [, anio, mes, dia, hora, minuto] = m
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia))
  return { anio: Number(anio), mes: Number(mes) - 1, dia: Number(dia), hora, minuto, fecha }
}

// «sáb 4 oct 2026» y, si trae hora distinta de 00:00, «sáb 4 oct 2026 · 10:00».
export function formatearFecha(valor, { conDia = true } = {}) {
  const p = partes(valor)
  if (!p) return valor ?? ''
  let texto = `${conDia ? `${DIAS[p.fecha.getDay()]} ` : ''}${p.dia} ${MESES[p.mes]} ${p.anio}`
  if (p.hora && !(p.hora === '00' && p.minuto === '00')) texto += ` · ${p.hora}:${p.minuto}`
  return texto
}

// «4 oct – 20 dic 2026», o con ambos años si son distintos.
export function formatearRango(inicio, fin) {
  const a = partes(inicio)
  const b = partes(fin)
  if (!a || !b) return [inicio, fin].filter(Boolean).join(' – ')
  const izquierda = a.anio === b.anio ? `${a.dia} ${MESES[a.mes]}` : `${a.dia} ${MESES[a.mes]} ${a.anio}`
  return `${izquierda} – ${b.dia} ${MESES[b.mes]} ${b.anio}`
}

// Año de una fecha «yyyy-MM-dd», o null si no es válida.
export function anioDe(valor) {
  return partes(valor)?.anio ?? null
}

// Fecha y hora de un partido en el formato del formulario: «2026-10-29T13:30».
export const fechaHoraCompleta = (valor) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor ?? '')

const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// Día de un partido para agrupar: clave «2026-10-11» y título «sábado 11 oct».
export function diaDe(valor) {
  const p = partes(valor)
  if (!p) return { clave: '', titulo: 'Sin fecha' }
  return { clave: `${p.anio}-${p.mes}-${p.dia}`, titulo: `${DIAS_LARGOS[p.fecha.getDay()]} ${p.dia} ${MESES[p.mes]}` }
}

// «10:00», o '' si no trae hora (o es 00:00).
export function horaDe(valor) {
  const p = partes(valor)
  return p?.hora && !(p.hora === '00' && p.minuto === '00') ? `${p.hora}:${p.minuto}` : ''
}

// «11 oct», para la tira de jornadas.
export function diaCorto(valor) {
  const p = partes(valor)
  return p ? `${p.dia} ${MESES[p.mes]}` : ''
}
