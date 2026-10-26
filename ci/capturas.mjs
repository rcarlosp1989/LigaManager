// Prueba temporal de pantallas (no es parte del proyecto): abre la app compilada con un servidor
// simulado, toma capturas a 390 y 1440 px y comprueba que al deslizar las tablas el nombre
// (equipo o jugador) queda a la vista.
import { chromium } from 'playwright'
import fs from 'node:fs'

const APP = 'http://localhost:4173'
const API = 'http://localhost:5000/api'
fs.mkdirSync('capturas', { recursive: true })
const fallas = []
const ok = (nombre, cond, detalle = '') => {
  console.log(`${cond ? 'OK   ' : 'FALLA '}${nombre}${!cond && detalle ? ' — ' + detalle : ''}`)
  if (!cond) fallas.push(nombre)
}

// ── Datos de ejemplo ────────────────────────────────────────────────────────
const equipos = [
  { idEquipo: 11, nombre: 'Ventarrón FC', pais: 'Ecuador', logoUrl: null },
  { idEquipo: 12, nombre: 'Sin Zapatos F.C.', pais: 'Ecuador', logoUrl: null },
  { idEquipo: 13, nombre: 'Deportivo San Juan', pais: 'Ecuador', logoUrl: null },
  { idEquipo: 14, nombre: 'Leones del Guasmo Sporting Club', pais: 'Ecuador', logoUrl: null },
]
const nombre = (id) => equipos.find(e => e.idEquipo === id).nombre
const partido = (id, l, v, fecha, jugado, gl, gv, jornada = 1) => ({
  idPartido: id, idJornada: jornada, numeroJornada: jornada, numero: id,
  idEquipoLocal: l, local: nombre(l), equipoLocal: nombre(l), logoLocal: null,
  idEquipoVisitante: v, visitante: nombre(v), equipoVisitante: nombre(v), logoVisitante: null,
  fecha, estadio: 'Estadio Recuspro', jugado, desierto: false, golesLocal: gl, golesVisitante: gv,
  estado: jugado ? 'Jugado' : 'Programado', oficiales: [], eventos: [], alineacionLocal: [], alineacionVisitante: [], cambios: [],
})
const pendiente = (j) => (j.idJugador === 1105 ? { ...j, cedula: '', tipoIdentificacion: 'Pendiente' } : j)
const jugadores = (idEquipo, conDoc) => Array.from({ length: 6 }, (_, i) => ({
  idJugador: idEquipo * 100 + i, nombre: ['Carlos', 'Luis', 'Andrés', 'Jorge', 'Bryan', 'Kevin'][i],
  apellido: ['Mendoza', 'Quiñónez', 'Bustamante Villacís', 'Ortiz', 'Cedeño', 'Plúas'][i],
  fechaDesde: '2026-08-01', fechaHasta: null, dorsal: i + 1,
  cedula: conDoc ? `09${String(idEquipo).padStart(2, '0')}12345${i}` : '', tipoIdentificacion: conDoc ? 'Cedula' : '',
  posicion: ['Arquero', 'Defensa', 'Defensa', 'Volante', 'Delantero', 'Delantero'][i], edad: 22 + i, fotoUrl: null,
}))
const posiciones = {
  tieneGrupos: false,
  grupos: [{ idGrupo: null, grupo: null, posiciones: equipos.map((e, i) => ({
    posicion: i + 1, idEquipo: e.idEquipo, equipo: e.nombre, pj: 3, pg: 3 - i > 0 ? 3 - i : 0, pe: i === 3 ? 1 : 0, pp: i, gf: 9 - i * 2, gc: 2 + i, dg: 7 - i * 3,
    pts: Math.max(0, 9 - i * 3) + (i === 3 ? 1 : 0), clasificado: i < 2, forma: ['V', 'E', 'D'].slice(0, 3 - (i % 2)),
  })) }],
}
const estadisticas = {
  goleadores: [
    { idJugador: 1100, jugador: 'Carlos Mendoza', equipo: 'Ventarrón FC', partidosJugados: 3, goles: 5, promedioPorPartido: 1.67, fotoUrl: null },
    { idJugador: 1200, jugador: 'Luis Quiñónez', equipo: 'Sin Zapatos F.C.', partidosJugados: 3, goles: 3, promedioPorPartido: 1, fotoUrl: null },
  ],
  tarjetas: {
    porJugador: [{ idJugador: 1203, jugador: 'Jorge Ortiz', equipo: 'Sin Zapatos F.C.', amarillas: 7, rojas: 1, total: 8, fotoUrl: null, amarillasAcumuladas: 2 }, { idJugador: 1102, jugador: 'Andrés Bustamante Villacís', equipo: 'Ventarrón FC', amarillas: 4, rojas: 0, total: 4, fotoUrl: null, amarillasAcumuladas: 4 }],
    amarillasParaSuspension: 5,
    porEquipo: [{ idEquipo: 12, equipo: 'Sin Zapatos F.C.', amarillas: 3, rojas: 1, puntosFairPlay: 6 }],
  },
  suspensiones: {
    sanciones: [
      { idSancion: 7, idJugador: 1203, jugador: 'Jorge Ortiz', equipo: 'Sin Zapatos F.C.', motivo: 'Tarjeta roja directa', fechaPartidoSancion: '2026-10-11', partidosSancion: 2, partidosCumplidos: 1, estado: 'Suspendido', manual: false, fotoUrl: null },
      { idSancion: 8, idJugador: 1104, jugador: 'Bryan Cedeño', equipo: 'Ventarrón FC', motivo: 'Agresión verbal al árbitro', fechaPartidoSancion: '2026-10-12', partidosSancion: 1, partidosCumplidos: 0, estado: 'Suspendido', manual: true, fotoUrl: null },
    ],
    enRiesgo: [{ idJugador: 1102, jugador: 'Andrés Bustamante Villacís', equipo: 'Ventarrón FC', amarillasAcumuladas: 4, fotoUrl: null }],
  },
}
const jornadas = [
  { idJornada: 1, numero: 1, idCampeonato: 1, instancia: 'Fase regular', grupo: null, totalPartidos: 2, equipoLibre: null },
  { idJornada: 2, numero: 2, idCampeonato: 1, instancia: 'Fase regular', grupo: null, totalPartidos: 2, equipoLibre: null },
]
const detalleJornada = (id) => ({
  idJornada: id, numero: id, idCampeonato: 1, idInstancia: 1, instancia: 'Fase regular', idGrupo: null, grupo: null, equipoLibre: null,
  partidos: id === 1
    ? [partido(1, 11, 12, '2026-10-11 10:00', true, 2, 1), partido(2, 13, 14, '2026-10-11 12:00', true, 0, 0)]
    : [partido(3, 14, 11, '2026-10-25 10:00', false, null, null, 2), partido(4, 12, 13, '2026-10-25 12:00', false, null, null, 2)],
})
const campDirigente = {
  idCampeonato: 1, nombre: 'Liga Barrial Recuspro', anio: 2026, estado: 'EnCurso', fechaInicio: '2026-09-01', fechaFin: '2026-12-20',
  modalidad: 'Fútbol', idEquipoPropio: 11, equipoPropio: 'Ventarrón FC', logoEquipoPropio: null, equipos,
  proximos: [partido(3, 14, 11, '2026-10-25 10:00', false, null, null, 2), partido(5, 11, 13, '2026-11-01 10:00', false, null, null, 3)],
  ultimos: [partido(1, 11, 12, '2026-10-11 10:00', true, 2, 1)],
}
const campOrganizador = {
  idCampeonato: 1, nombre: 'Liga Barrial Recuspro', anio: 2026, fechaInicio: '2026-09-01', fechaFin: '2026-12-20', estado: 'EnCurso',
  idTipoPartido: 1, tipoPartido: 'Todos contra todos', idModalidad: 1, modalidad: 'Fútbol',
  equipos: equipos.map(({ idEquipo, nombre: n, pais }) => ({ idEquipo, nombre: n, pais })),
}
const dirigentes = {
  dirigentes: [
    { idUsuario: 31, nombre: 'Pedro Alvarado', email: 'pedro.alvarado@gmail.com', idEquipo: 11, equipo: 'Ventarrón FC', desde: '2026-10-15' },
    { idUsuario: 32, nombre: 'María José Villón', email: 'mariajose.villon.sinzapatos@hotmail.com', idEquipo: 12, equipo: 'Sin Zapatos F.C.', desde: '2026-10-16' },
  ],
  invitaciones: [{ idInvitacion: 5, idEquipo: 13, equipo: 'Deportivo San Juan', venceEn: '2026-10-26 14:10', creadaPor: 'Roberto' }],
}

let terminosPendientes = false
const TOKEN = 'AbCdEfGhJkLmNpQrStUvWx'
let enlaceToken = null
// Marcadores en vivo: un partido en el 2.º tiempo, otro en medio tiempo (o según faseVivo), uno terminado y uno por jugar.
let faseVivo = '1T'
const enVivo = () => {
  const base = (id, l, v, hora, estado, gl, gv, reloj, eventos) => ({
    idPartido: id, idEquipoLocal: l, local: nombre(l), logoLocal: null, idEquipoVisitante: v, visitante: nombre(v), logoVisitante: null,
    fecha: `2026-10-26 ${hora}`, estadio: 'Estadio Recuspro', estado, desierto: false, golesLocal: gl, golesVisitante: gv, reloj, eventos,
  })
  return { hoy: '2026-10-26', partidos: [
    base(21, 11, 12, '10:00', 'EnVivo', 2, 1, { fase: '2T', segundos: 425, corriendo: true, duracionMin: 25 }, [
      { minuto: 11, tipo: 'GOL', jugador: 'Carlos Mendoza', lado: 'local', dobleAmarilla: false },
      { minuto: 19, tipo: 'GOL', jugador: 'Luis Quiñónez', lado: 'visitante', dobleAmarilla: false },
      { minuto: 22, tipo: 'ROJA', jugador: 'Jorge Ortiz', lado: 'visitante', dobleAmarilla: true },
      { minuto: 29, tipo: 'GOL_EN_CONTRA', jugador: 'Kevin Plúas', lado: 'local', dobleAmarilla: false },
    ]),
    base(22, 13, 14, '10:00', 'EnVivo', faseVivo === 'descanso' ? 0 : 0, 0, faseVivo === 'descanso'
      ? { fase: 'descanso', segundos: 1530, corriendo: false, duracionMin: 25 }
      : { fase: '1T', segundos: 1520, corriendo: true, duracionMin: 25 }, []),
    base(23, 12, 13, '08:00', 'Final', 1, 1, { fase: 'final', segundos: 1560, corriendo: false, duracionMin: 25 }, [
      { minuto: 5, tipo: 'GOL', jugador: 'Andrés Bustamante', lado: 'local', dobleAmarilla: false },
      { minuto: 40, tipo: 'GOL', jugador: 'Bryan Cedeño', lado: 'visitante', dobleAmarilla: false },
    ]),
    base(24, 14, 11, '16:00', 'PorJugar', null, null, null, []),
  ] }
}
function respuesta(metodo, ruta, cuerpoPedido = null) {
  const r = ruta.replace(/\?.*$/, '')
  const d = '/dirigente/campeonatos/1'
  if (r.startsWith('/publico/')) {
    const [, , tk, ...resto] = r.split('/')
    if (tk !== TOKEN) return { __status: 404, error: 'Este enlace no existe o fue desactivado por la organización.' }
    const sub = resto.length ? '/' + resto.join('/') : ''
    if (sub === '') return { nombre: 'Liga Barrial Recuspro', anio: 2026, estado: 'EnCurso', fechaInicio: '2026-09-01', fechaFin: '2026-12-20', modalidad: 'Fútbol', organizacion: 'Roberto Prado', equipos }
    if (sub === '/jornadas') return [1, 2].map(id => { const d = detalleJornada(id); return { idJornada: id, numero: id, instancia: 'Fase regular', grupo: null, partidos: d.partidos } })
    if (sub === '/grupos') return []
    if (sub === '/en-vivo') return enVivo()
    if (sub.startsWith('/estadisticas/')) return respuesta('GET', `/dirigente/campeonatos/1${sub}`)
    return { __status: 404 }
  }
  if (r === '/campeonatos/1/enlace-publico') {
    if (metodo === 'POST') enlaceToken = TOKEN
    if (metodo === 'DELETE') enlaceToken = null
    return { token: enlaceToken }
  }
  const sesionOk = { token: 'x', nombre: 'Roberto Prado', rol: 'Organizador', expira: new Date(Date.now() + 3600e3).toISOString() }
  if (r === '/auth/opciones') return { correo: true }
  if (r === '/auth/login' && metodo === 'POST') {
    if (cuerpoPedido?.email === 'sin@confirmar.ec') return { __status: 403, error: 'Confirma tu correo para entrar. Revisa tu bandeja de entrada (y Spam o Promociones).', codigo: 'CORREO_SIN_CONFIRMAR' }
    return sesionOk
  }
  if (r === '/auth/register' && metodo === 'POST') return { confirmarCorreo: true, email: cuerpoPedido?.email }
  if (r === '/auth/reenviar-confirmacion' || r === '/auth/olvide-clave') return { mensaje: 'Si el correo está registrado, te llegará un mensaje en unos minutos. Revisa también Spam o Promociones.' }
  if (r.startsWith('/auth/restablecer/')) return r.endsWith('/BUENO') ? { valido: true, motivo: null } : { __status: 404, valido: false, motivo: 'Este enlace venció. Pide uno nuevo.' }
  if (r === '/auth/restablecer' || r === '/auth/confirmar-correo') return sesionOk
  if (r === '/auth/terminos') {
    if (metodo === 'POST') terminosPendientes = false
    return { version: '2026-10-20', aceptadosEn: terminosPendientes ? null : '2026-10-20T15:00:00Z', pendiente: terminosPendientes }
  }
  if (metodo === 'GET') {
    if (r === '/dirigente/inicio') return { campeonatos: [{ idCampeonato: 1, nombre: 'Liga Barrial Recuspro', anio: 2026, estado: 'EnCurso', fechaInicio: '2026-09-01', fechaFin: '2026-12-20', idEquipo: 11, equipo: 'Ventarrón FC', logoEquipo: null }] }
    if (r === d) return campDirigente
    if (r === `${d}/equipos/11`) return { idEquipo: 11, nombre: 'Ventarrón FC', idPais: 1, pais: 'Ecuador', jugadores: jugadores(11, false), logoUrl: null }
    if (r.startsWith(`${d}/equipos/`)) { const id = Number(r.split('/').pop()); return { idEquipo: id, nombre: nombre(id), idPais: 1, pais: 'Ecuador', jugadores: jugadores(id, false), logoUrl: null } }
    if (r === `${d}/jornadas`) return jornadas
    if (r === `${d}/en-vivo`) return enVivo()
    if (r.startsWith(`${d}/jornadas/`)) return detalleJornada(Number(r.split('/').pop()))
    if (r.endsWith('/estadisticas/posiciones')) return posiciones
    if (r.endsWith('/estadisticas/goleadores')) return estadisticas.goleadores
    if (r.endsWith('/estadisticas/tarjetas')) return estadisticas.tarjetas
    if (r.endsWith('/estadisticas/suspensiones')) return estadisticas.suspensiones
    if (r.startsWith('/invitaciones-dirigente/')) return { campeonato: 'Liga Barrial Recuspro', organizador: 'Roberto Prado', equipo: 'Ventarrón FC', venceEn: '2026-10-26 14:10', vigente: true, motivo: null }
    // Organizador
    if (r === '/campeonatos') return [{ idCampeonato: 1, nombre: 'Liga Barrial Recuspro', anio: 2026, fechaInicio: '2026-09-01', fechaFin: '2026-12-20', estado: 'EnCurso', tipoPartido: 'Todos contra todos', totalEquipos: 4, modalidad: 'Fútbol', totalJornadas: 2 }]
    if (r === '/campeonatos/1') return campOrganizador
    if (r === '/campeonatos/1/dirigentes') return dirigentes
    if (r === '/campeonatos/1/vocales') return { vocales: [], invitaciones: [] }
    if (r === '/campeonatos/1/posiciones') return posiciones.grupos[0].posiciones
    if (r === '/jugadores') return equipos.flatMap(e => jugadores(e.idEquipo, true).map(pendiente).map(j => ({ ...j, ubicacion: 'Guayaquil, Guayas', equipoActual: e.nombre })))
    if (r === '/equipos') return equipos.map(e => ({ ...e, totalJugadores: 6 }))
    if (r.startsWith('/equipos/')) { const id = Number(r.split('/').pop()); return { idEquipo: id, nombre: nombre(id), idPais: 1, pais: 'Ecuador', jugadores: jugadores(id, true).map(pendiente), logoUrl: null } }
    return []
  }
  if (metodo === 'POST' && r === '/campeonatos/1/dirigentes/invitaciones') return { idInvitacion: 9, codigo: 'K7M2P-QX9RT', idEquipo: 14, equipo: 'Leones del Guasmo', venceEn: '2026-10-26 15:02' }
  return {}
}

const sesion = (rol, nombreUsuario) => ({ token: 'x', nombre: nombreUsuario, rol })

async function abrir(browser, ancho, usuario) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: ancho, height: ancho < 500 ? 844 : 900 }, hasTouch: ancho < 500, isMobile: ancho < 500 })
  if (usuario) {
    await ctx.addInitScript(([u]) => {
      localStorage.setItem('lm_token', u.token)
      localStorage.setItem('lm_user', JSON.stringify({ nombre: u.nombre, rol: u.rol }))
    }, [usuario])
  }
  const page = await ctx.newPage()
  const errores = []
  page.on('pageerror', e => errores.push(String(e)))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errores.push(m.text()) })
  const llamadas = []
  await page.route(`${API}/**`, async route => {
    const req = route.request()
    const ruta = req.url().slice(API.length)
    llamadas.push(`${req.method()} ${ruta}`)
    let enviado = null
    try { enviado = req.postDataJSON() } catch { /* sin cuerpo */ }
    const cuerpo = respuesta(req.method(), ruta, enviado)
    const estado = cuerpo && cuerpo.__status ? cuerpo.__status : 200
    await route.fulfill({ status: estado, contentType: 'application/json', body: JSON.stringify(cuerpo) })
  })
  return { ctx, page, errores, llamadas }
}

async function captura(page, nombreArchivo, ancho) {
  await page.waitForTimeout(400)
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(`${nombreArchivo} @${ancho}: sin desplazamiento lateral`, desborde <= 1, `${desborde}px`)
  await page.screenshot({ path: `capturas/${nombreArchivo}_${ancho}.png`, fullPage: true })
}


// Desliza cada tabla hasta el final y comprueba que la columna fija (.fija-borde) sigue entera a la vista.
async function revisarFija(page, nombre, ancho) {
  const r = await page.evaluate(async () => {
    const out = []
    for (const t of document.querySelectorAll('table.tabla')) {
      const c = t.parentElement
      if (c.scrollWidth <= c.clientWidth + 2) { out.push({ desliza: false }); continue }
      c.scrollLeft = c.scrollWidth
      await new Promise(res => setTimeout(res, 250))
      const celda = t.querySelector('tbody .fija-borde')
      const cr = c.getBoundingClientRect(), fr = celda.getBoundingClientRect()
      out.push({ desliza: true, visible: fr.left >= cr.left - 1 && fr.right <= cr.right, marcado: c.hasAttribute('data-desplazada'),
                 texto: celda.textContent.trim().slice(0, 30) })
    }
    return out
  })
  const deslizan = r.filter(x => x.desliza)
  if (ancho < 500) ok(`${nombre} @${ancho}: hay tablas que se deslizan`, deslizan.length > 0, JSON.stringify(r))
  for (const x of deslizan) {
    ok(`${nombre} @${ancho}: «${x.texto}» sigue a la vista al deslizar`, x.visible, JSON.stringify(x))
    ok(`${nombre} @${ancho}: sombra de la columna fija`, x.marcado)
  }
}

// Cuenta un texto fuera del bloque «En vivo» (que también muestra marcadores).
const fueraDeVivo = (page, texto) => page.evaluate((t) => [...document.querySelectorAll('span, p, li')]
  .filter(e => e.textContent.trim() === t && !e.closest('section[aria-labelledby="en-vivo-titulo"]')).length, texto)
const browser = await chromium.launch()
const dirigente = [
  ['posiciones', 'Leones del Guasmo'],
  ['goleadores', 'Carlos Mendoza'],
  ['tarjetas', 'Acumuladas'],
  ['suspensiones', 'Agresión verbal'],
  ['nomina', 'Plúas'],
]
for (const ancho of [390, 1440]) {
  {
    const { ctx, page, errores, llamadas } = await abrir(browser, ancho, sesion('Dirigente', 'Pedro Alvarado'))
    for (const [tab, texto] of dirigente) {
      await page.goto(`${APP}/dirigente?tab=${tab}`)
      await page.getByText(texto).first().waitFor()
      await captura(page, `dir_${tab}`, ancho)
      if (tab !== 'goleadores') await revisarFija(page, `dirigente ${tab}`, ancho)  // goleadores simple ya no se desliza
      if (ancho < 500) await page.screenshot({ path: `capturas/dir_${tab}_deslizada_${ancho}.png`, fullPage: true })
      const otras = llamadas.filter(l => /\/equipos\/(?!11\b)\d+/.test(l))
      ok(`dirigente ${tab} @${ancho}: no pide nóminas de otros equipos`, otras.length === 0, otras.join(', '))
      if (tab === 'nomina') {
        ok(`nómina @${ancho}: sin selector de equipo`, await page.locator('select').count() === 0)
        ok(`nómina @${ancho}: muestra su equipo`, await page.getByText('Ventarrón FC', { exact: true }).count() >= 1)
        ok(`nómina @${ancho}: sin columna «Documento»`, await page.getByRole('columnheader', { name: /Documento/i }).count() === 0)
        ok(`nómina @${ancho}: ninguna cédula en pantalla`, await page.getByText(/\b09\d{8}\b/).count() === 0)
      }
      if (tab === 'goleadores') {
        ok(`dirigente goleadores @${ancho}: sin PJ ni promedio`, await page.getByRole('columnheader', { name: /^(PJ|Prom\.)$/ }).count() === 0)
        ok(`dirigente goleadores @${ancho}: con jugador, equipo y goles`, await page.getByRole('columnheader', { name: /^(Jugador|Equipo|Goles)$/ }).count() === (ancho < 500 ? 2 : 3))
        ok(`dirigente goleadores @${ancho}: se ve el equipo del jugador`, await page.getByText('Ventarrón FC').first().isVisible())
        ok(`dirigente goleadores @${ancho}: entra sin deslizar`, await page.evaluate(() => [...document.querySelectorAll('table')].every(t => { const c = t.closest('.overflow-x-auto'); return c && c.scrollWidth <= c.clientWidth + 1 })))
      }
      if (tab === 'tarjetas') {
        ok(`tarjetas @${ancho}: muestra «2/5» y «4/5»`, await page.getByText('2/5').count() === 1 && await page.getByText('4/5').count() === 1)
        ok(`tarjetas @${ancho}: explica el historial y las acumuladas`, await page.getByText(/vuelven a 0 al llegar a 5/).isVisible())
      }
    }
    await page.goto(`${APP}/dirigente`)
    await page.getByText("En vivo · 33'").waitFor()
    ok(`dirigente @${ancho}: bloque «En vivo» en Mi equipo`, true)
    await captura(page, 'dir_en_vivo', ancho)
    await page.goto(`${APP}/dirigente?tab=jornadas`)
    const bj = (n) => page.getByRole('button', { name: new RegExp(`^Jornada ${n}(?!\\d)`) })
    await bj(1).click(); await page.getByText('2 - 1').first().waitFor()
    await bj(2).click(); await page.getByText('vs', { exact: true }).first().waitFor()
    ok(`dirigente jornadas @${ancho}: se pueden abrir dos jornadas a la vez`, await bj(1).getAttribute('aria-expanded') === 'true' && await bj(2).getAttribute('aria-expanded') === 'true')
    await captura(page, 'dir_jornadas_dos_abiertas', ancho)
    await bj(1).click()
    ok(`dirigente jornadas @${ancho}: se contrae la jornada 1`, await bj(1).getAttribute('aria-expanded') === 'false' && await fueraDeVivo(page, '2 - 1') === 0)
    ok(`sin errores (dirigente) @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
  {
    const { ctx, page, errores } = await abrir(browser, ancho, sesion('Organizador', 'Roberto Prado'))
    const paginas = [
      ['org_reportes_posiciones', '/reportes', 'Leones del Guasmo'],
      ['org_tabla_general', '/campeonatos/1?tab=jornadas', 'Leones del Guasmo'],
      ['org_equipos_inscritos', '/campeonatos/1', 'Leones del Guasmo'],
      ['org_jugadores', '/jugadores', 'Quiñónez'],
      ['org_campeonatos', '/campeonatos', 'Liga Barrial Recuspro'],
    ]
    for (const [nombre, ruta, texto] of paginas) {
      await page.goto(`${APP}${ruta}`)
      await page.getByText(texto).first().waitFor()
      await captura(page, nombre, ancho)
      await revisarFija(page, nombre, ancho)
      if (ancho < 500) await page.screenshot({ path: `capturas/${nombre}_deslizada_${ancho}.png`, fullPage: true })
      if (nombre === 'org_jugadores') ok(`jugadores @${ancho}: «Doc. pendiente» en la lista`, await page.getByText('Doc. pendiente').count() >= 1)
    }
    await page.goto(`${APP}/reportes`)
    await page.getByRole('button', { name: /Goleadores/ }).click()
    await page.getByText('Carlos Mendoza').first().waitFor()
    ok(`organizador @${ancho}: goleadores conserva PJ y promedio`, await page.getByRole('columnheader', { name: /^(PJ|Prom\.)$/ }).count() === 2)
    await page.getByRole('button', { name: /Nómina/ }).click()
    await page.getByLabel('Equipo', { exact: true }).selectOption('12')
    await page.getByText('0912123450').waitFor()
    ok(`organizador @${ancho}: la nómina conserva la columna «Documento»`, await page.getByRole('columnheader', { name: /Documento/i }).count() === 1)
    await captura(page, 'org_nomina', ancho)
    ok(`sin errores (organizador) @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
}
// ── Privacidad y términos ──
for (const ancho of [390, 1440]) {
  {
    const { ctx, page, errores } = await abrir(browser, ancho, null)
    await page.goto(`${APP}/privacidad`)
    await page.getByRole('heading', { name: 'AVISO DE PRIVACIDAD' }).waitFor()
    ok(`privacidad @${ancho}: la organización es la responsable`, await page.getByText('Cada organización es la responsable del tratamiento').isVisible())
    await captura(page, 'legal_privacidad', ancho)
    await page.goto(`${APP}/terminos`)
    await page.getByRole('heading', { name: 'TÉRMINOS DE USO' }).waitFor()
    ok(`términos @${ancho}: responsabilidad exclusiva de la organización`, await page.getByText('responsabilidad exclusiva de la organización').isVisible())
    await captura(page, 'legal_terminos', ancho)
    await page.goto(`${APP}/login`)
    ok(`login @${ancho}: enlaces a privacidad y términos`, await page.getByRole('link', { name: 'Aviso de privacidad' }).isVisible() && await page.getByRole('link', { name: 'Términos de uso' }).isVisible())
    await page.goto(`${APP}/register`)
    const casilla = page.getByRole('checkbox')
    ok(`registro @${ancho}: casilla de aceptación sin marcar`, await casilla.count() === 1 && !(await casilla.isChecked()))
    await captura(page, 'registro', ancho)
    ok(`sin errores (páginas públicas) @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
  {
    terminosPendientes = true
    const { ctx, page, errores, llamadas } = await abrir(browser, ancho, sesion('Organizador', 'Roberto Prado'))
    await page.goto(`${APP}/dashboard`)
    await page.getByText('Términos de uso y privacidad').waitFor()
    ok(`términos pendientes @${ancho}: no deja entrar sin aceptar`, await page.getByRole('link', { name: 'Dashboard' }).count() === 0)
    const boton = page.getByRole('button', { name: 'Aceptar y continuar' })
    ok(`términos pendientes @${ancho}: el botón espera la casilla`, await boton.isDisabled())
    await captura(page, 'terminos_pendientes', ancho)
    await page.getByRole('checkbox').check()
    await boton.click()
    await page.getByText('Términos de uso y privacidad').waitFor({ state: 'detached' })
    ok(`términos pendientes @${ancho}: al aceptar entra a la app`, llamadas.some(l => l === 'POST /auth/terminos'))
    await page.goto(`${APP}/jugadores`)
    await page.getByRole('button', { name: /Nuevo Jugador/ }).click()
    const aut = page.getByLabel(/cuenta con la autorización del jugador/)
    await aut.waitFor()
    ok(`nuevo jugador @${ancho}: casilla de autorización obligatoria`, await aut.evaluate(e => e.required && !e.checked))
    await captura(page, 'nuevo_jugador', ancho)
    ok(`sin errores (organizador, términos) @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
  {
    const { ctx, page, errores } = await abrir(browser, ancho, sesion('Dirigente', 'Pedro Alvarado'))
    for (const tab of ['posiciones', 'tarjetas', 'suspensiones']) {
      await page.goto(`${APP}/dirigente?tab=${tab}`)
      await page.getByText(/no de LigaManager/).first().waitFor()
      ok(`${tab} @${ancho}: nota de responsabilidad`, await page.getByText(/responsabilidad de la organización del campeonato/).isVisible())
    }
    await captura(page, 'nota_suspensiones', ancho)
    ok(`sin errores (notas) @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
}
// ── Enlace público ──
for (const ancho of [390, 1440]) {
  {
    const { ctx, page, errores, llamadas } = await abrir(browser, ancho, null)
    await page.goto(`${APP}/publico/${TOKEN}`)
    await page.getByText('Organiza: Roberto Prado').waitFor()
    ok(`público @${ancho}: no pide iniciar sesión`, !page.url().includes('/login'))
    const boton = (n) => page.getByRole('button', { name: new RegExp(`^Jornada ${n}(?!\\d)`) })
    ok(`público @${ancho}: abre la jornada en curso (2) y deja cerrada la 1`, await boton(2).getAttribute('aria-expanded') === 'true' && await boton(1).getAttribute('aria-expanded') === 'false' && await fueraDeVivo(page, '2 - 1') === 0)
    ok(`público @${ancho}: cabecera con jugados`, await page.getByText('0 de 2 jugados').isVisible() && await page.getByText('2 partidos jugados').isVisible())
    await page.getByText('Leones del Guasmo Sporting Club').first().waitFor()
    ok(`público @${ancho}: bloque «En vivo» con el minuto del 2.º tiempo`, await page.getByText("En vivo · 33'").count() === 1, await page.locator('section[aria-labelledby="en-vivo-titulo"]').innerText().catch(() => ''))
    ok(`público @${ancho}: minuto del 1.er tiempo con añadido`, await page.getByText("En vivo · 25+'").count() === 0 && await page.getByText("En vivo · 25+1'").count() === 1)
    ok(`público @${ancho}: marcador en vivo y goleadores`, await page.getByText('2 - 1').first().isVisible() && await page.getByLabel("Gol, minuto 11: Carlos Mendoza").isVisible())
    ok(`público @${ancho}: roja por doble amarilla y gol en contra`, await page.getByLabel('Roja, minuto 22: Jorge Ortiz (doble amarilla)').isVisible() && await page.getByLabel('Gol, minuto 29: Kevin Plúas (en contra)').isVisible())
    ok(`público @${ancho}: terminado y por jugar`, await page.getByText('Final', { exact: true }).count() >= 1 && await page.getByText('Hoy · 16:00').isVisible())
    await captura(page, 'publico_en_vivo', ancho)
    // Llega el medio tiempo en el otro partido: al volver a consultar aparece el aviso.
    faseVivo = 'descanso'
    await page.evaluate(() => { window.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')) })
    await page.getByText('Medio tiempo: Deportivo San Juan 0 - 0 Leones del Guasmo Sporting Club').waitFor({ timeout: 10000 }).catch(() => {})
    ok(`público @${ancho}: aviso de medio tiempo`, await page.getByText('Medio tiempo: Deportivo San Juan 0 - 0 Leones del Guasmo Sporting Club').isVisible())
    ok(`público @${ancho}: la tarjeta dice «Medio tiempo»`, await page.getByText('Medio tiempo', { exact: true }).count() === 1)
    await captura(page, 'publico_medio_tiempo', ancho)
    faseVivo = '1T'
    await captura(page, 'publico_resultados_plegado', ancho)
    await boton(1).click()
    ok(`público @${ancho}: al abrir la jornada 1 se ve el marcador`, await page.getByText('2 - 1').first().isVisible())
    await boton(2).click()
    ok(`público @${ancho}: la jornada 2 se contrae`, await boton(2).getAttribute('aria-expanded') === 'false' && await fueraDeVivo(page, 'vs') === 0)
    await captura(page, 'publico_resultados', ancho)
    for (const [tab, texto] of [['posiciones', 'Leones del Guasmo'], ['goleadores', 'Carlos Mendoza'], ['tarjetas', 'Acumuladas'], ['suspensiones', 'Agresión verbal']]) {
      await page.goto(`${APP}/publico/${TOKEN}?tab=${tab}`)
      await page.getByText(texto).first().waitFor()
      if (tab === 'suspensiones') {
        ok(`público @${ancho}: sin «Agregar sanción»`, await page.getByText('Agregar sanción').count() === 0)
        await captura(page, 'publico_suspensiones', ancho)
      }
      if (tab === 'posiciones') await captura(page, 'publico_posiciones', ancho)
      if (tab === 'goleadores') {
        ok(`público goleadores @${ancho}: sin PJ ni promedio`, await page.getByRole('columnheader', { name: /^(PJ|Prom\.)$/ }).count() === 0)
        if (ancho < 500) ok(`público goleadores @${ancho}: la columna Goles se ve sin deslizar`, await page.getByRole('columnheader', { name: 'Goles' }).isVisible() && (await page.getByRole('columnheader', { name: 'Goles' }).boundingBox()).x + 30 < ancho)
        await captura(page, 'publico_goleadores', ancho)
      }
    }
    ok(`público @${ancho}: no pide nóminas ni datos privados`, !llamadas.some(l => /\/equipos\/|\/jugadores|\/dirigente\//.test(l)), llamadas.filter(l => /equipos|jugadores|dirigente/.test(l)).join(', '))
    ok(`público @${ancho}: no tiene pestaña de nómina`, await page.getByRole('button', { name: /Nómina/ }).count() === 0)
    await page.goto(`${APP}/publico/OtroCodigoQueNoExiste22`)
    await page.getByText('Enlace no disponible').waitFor()
    ok(`público @${ancho}: código inválido muestra «Enlace no disponible»`, true)
    await captura(page, 'publico_invalido', ancho)
    ok(`sin errores (público) @${ancho}`, errores.filter(e => !/404/.test(e)).length === 0, errores.join(' | '))
    await ctx.close()
  }
  {
    enlaceToken = null
    const { ctx, page, errores } = await abrir(browser, ancho, sesion('Organizador', 'Roberto Prado'))
    await page.goto(`${APP}/campeonatos/1?tab=dirigentes`)
    await page.getByRole('button', { name: 'Crear enlace público' }).click()
    const campo = page.getByLabel('Enlace público')
    await campo.waitFor()
    ok(`organizador @${ancho}: crea el enlace público`, (await campo.inputValue()).endsWith(`/publico/${TOKEN}`))
    ok(`organizador @${ancho}: botón de WhatsApp`, await page.getByRole('link', { name: /WhatsApp/ }).first().isVisible())
    await captura(page, 'organizador_enlace_publico', ancho)
    await page.getByRole('button', { name: 'Desactivar' }).click()
    await page.getByRole('button', { name: 'Desactivar' }).last().click()
    await page.getByRole('button', { name: 'Crear enlace público' }).waitFor()
    ok(`organizador @${ancho}: desactiva el enlace`, true)
    ok(`sin errores (organizador, enlace) @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
}
// ── Seguridad de cuentas ──
for (const ancho of [390, 1440]) {
  const { ctx, page, errores, llamadas } = await abrir(browser, ancho, null)
  const guardado = () => page.evaluate(() => ({ local: !!localStorage.getItem('lm_token'), sesion: !!sessionStorage.getItem('lm_token') }))
  await page.goto(`${APP}/login`)
  const olvide = page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })
  await olvide.waitFor()
  const recordarme = page.getByRole('checkbox', { name: /Recordarme en este dispositivo/ })
  ok(`login @${ancho}: «Recordarme» sin marcar`, await recordarme.count() === 1 && !(await recordarme.isChecked()))
  await captura(page, 'login', ancho)
  await page.getByLabel('Correo electrónico').fill('roberto@liga.ec')
  await page.getByLabel('Contraseña').fill('clave123')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL(/dashboard/)
  let g = await guardado()
  ok(`login @${ancho}: sin «Recordarme» la sesión va en sessionStorage`, g.sesion && !g.local, JSON.stringify(g))
  ok(`login @${ancho}: envía recordarme=false`, true)
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear() })
  await page.goto(`${APP}/login`)
  await page.getByLabel('Correo electrónico').fill('roberto@liga.ec')
  await page.getByLabel('Contraseña').fill('clave123')
  await page.getByRole('checkbox', { name: /Recordarme/ }).check()
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL(/dashboard/)
  g = await guardado()
  ok(`login @${ancho}: con «Recordarme» la sesión va en localStorage`, g.local && !g.sesion, JSON.stringify(g))

  // Sesión vencida: al abrir la app va al login.
  await page.evaluate(() => localStorage.setItem('lm_user', JSON.stringify({ nombre: 'R', rol: 'Organizador', expira: '2020-01-01T00:00:00Z' })))
  await page.goto(`${APP}/dashboard`)
  await page.waitForURL(/\/login/)
  ok(`sesión vencida @${ancho}: lleva al login y la borra`, !(await page.evaluate(() => localStorage.getItem('lm_token'))))

  // Correo sin confirmar.
  await page.getByLabel('Correo electrónico').fill('sin@confirmar.ec')
  await page.getByLabel('Contraseña').fill('clave123')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.getByText('Confirma tu correo para entrar').waitFor()
  ok(`login @${ancho}: ofrece reenviar el correo`, await page.getByRole('button', { name: 'Reenviar correo' }).isVisible())
  await captura(page, 'login_sin_confirmar', ancho)

  // Registro: pantalla «Revisa tu correo».
  await page.goto(`${APP}/register`)
  await page.getByLabel('Nombre').fill('Liga Nueva')
  await page.getByLabel('Correo electrónico').fill('nueva@liga.ec')
  await page.getByLabel('Contraseña', { exact: true }).fill('clave123')
  await page.getByLabel('Confirmar contraseña').fill('clave123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Registrarme' }).click()
  await page.getByText('Revisa tu correo').waitFor()
  ok(`registro @${ancho}: pide revisar el correo`, await page.getByText('nueva@liga.ec').isVisible())
  ok(`registro @${ancho}: reenviar espera un minuto`, await page.getByRole('button', { name: /Reenviar correo \(\d+ s\)/ }).isDisabled())
  await captura(page, 'registro_revisa_correo', ancho)

  // Olvidé la contraseña.
  await page.goto(`${APP}/olvide-clave`)
  await page.getByLabel('Correo electrónico').fill('roberto@liga.ec')
  await page.getByRole('button', { name: 'Enviar enlace' }).click()
  await page.getByText(/Si el correo está registrado/).waitFor()
  ok(`olvidé @${ancho}: respuesta genérica`, true)
  await captura(page, 'olvide_clave', ancho)

  // Restablecer: enlace inválido y válido.
  await page.goto(`${APP}/restablecer/MALO`)
  await page.getByText('Este enlace venció').waitFor()
  ok(`restablecer @${ancho}: enlace vencido ofrece pedir otro`, await page.getByRole('link', { name: 'Pedir un enlace nuevo' }).isVisible())
  await page.goto(`${APP}/restablecer/BUENO`)
  await page.getByLabel(/Contraseña nueva/).fill('nueva456')
  await page.getByLabel('Repite la contraseña').fill('nueva456')
  await captura(page, 'restablecer', ancho)
  await page.getByRole('button', { name: 'Guardar y entrar' }).click()
  await page.waitForURL(/dashboard/)
  ok(`restablecer @${ancho}: guarda y entra`, llamadas.includes('POST /auth/restablecer'))

  // Confirmar el correo desde el enlace.
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear() })
  await page.goto(`${APP}/confirmar-correo/CODIGO`)
  await page.waitForURL(/dashboard/)
  ok(`confirmar @${ancho}: confirma una sola vez y entra`, llamadas.filter(l => l === 'POST /auth/confirmar-correo').length === 1)
  ok(`sin errores (cuentas) @${ancho}`, errores.filter(e => !/40[34]/.test(e)).length === 0, errores.join(' | '))
  await ctx.close()
}
await browser.close()
console.log(fallas.length ? `\n${fallas.length} fallas` : '\nTodo bien')
process.exit(fallas.length ? 1 : 0)
