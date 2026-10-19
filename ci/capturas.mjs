// Prueba temporal de pantallas (no es parte del proyecto): abre la app compilada con un servidor
// simulado, toma capturas a 390 y 1440 px y comprueba lo esencial del rol Dirigente.
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
  { idEquipo: 14, nombre: 'Leones del Guasmo', pais: 'Ecuador', logoUrl: null },
]
const nombre = (id) => equipos.find(e => e.idEquipo === id).nombre
const partido = (id, l, v, fecha, jugado, gl, gv, jornada = 1) => ({
  idPartido: id, idJornada: jornada, numeroJornada: jornada, numero: id,
  idEquipoLocal: l, local: nombre(l), equipoLocal: nombre(l), logoLocal: null,
  idEquipoVisitante: v, visitante: nombre(v), equipoVisitante: nombre(v), logoVisitante: null,
  fecha, estadio: 'Estadio Recuspro', jugado, desierto: false, golesLocal: gl, golesVisitante: gv,
  estado: jugado ? 'Jugado' : 'Programado', oficiales: [], eventos: [], alineacionLocal: [], alineacionVisitante: [], cambios: [],
})
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
    porJugador: [{ idJugador: 1203, jugador: 'Jorge Ortiz', equipo: 'Sin Zapatos F.C.', amarillas: 3, rojas: 1, total: 4, fotoUrl: null }],
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

function respuesta(metodo, ruta) {
  const r = ruta.replace(/\?.*$/, '')
  const d = '/dirigente/campeonatos/1'
  if (metodo === 'GET') {
    if (r === '/dirigente/inicio') return { campeonatos: [{ idCampeonato: 1, nombre: 'Liga Barrial Recuspro', anio: 2026, estado: 'EnCurso', fechaInicio: '2026-09-01', fechaFin: '2026-12-20', idEquipo: 11, equipo: 'Ventarrón FC', logoEquipo: null }] }
    if (r === d) return campDirigente
    if (r === `${d}/equipos/11`) return { idEquipo: 11, nombre: 'Ventarrón FC', idPais: 1, pais: 'Ecuador', jugadores: jugadores(11, true), logoUrl: null }
    if (r.startsWith(`${d}/equipos/`)) { const id = Number(r.split('/').pop()); return { idEquipo: id, nombre: nombre(id), idPais: 1, pais: 'Ecuador', jugadores: jugadores(id, false), logoUrl: null } }
    if (r === `${d}/jornadas`) return jornadas
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
    if (r === '/equipos') return equipos.map(e => ({ ...e, totalJugadores: 6 }))
    if (r.startsWith('/equipos/')) { const id = Number(r.split('/').pop()); return { idEquipo: id, nombre: nombre(id), idPais: 1, pais: 'Ecuador', jugadores: jugadores(id, true), logoUrl: null } }
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respuesta(req.method(), ruta)) })
  })
  return { ctx, page, errores, llamadas }
}

async function captura(page, nombreArchivo, ancho) {
  await page.waitForTimeout(400)
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(`${nombreArchivo} @${ancho}: sin desplazamiento lateral`, desborde <= 1, `${desborde}px`)
  await page.screenshot({ path: `capturas/${nombreArchivo}_${ancho}.png`, fullPage: true })
}

const browser = await chromium.launch()
for (const ancho of [390, 1440]) {
  // ── Dirigente ──
  {
    const { ctx, page, errores, llamadas } = await abrir(browser, ancho, sesion('Dirigente', 'Pedro Alvarado'))
    await page.goto(`${APP}/dirigente`)
    await page.getByText('Próximos partidos de Ventarrón FC').waitFor()
    await captura(page, '01_dirigente_resumen', ancho)

    await page.goto(`${APP}/dirigente?tab=jornadas`)
    await page.getByRole('button', { name: /Jornada 1/ }).click()
    await page.getByText('2 - 1').first().waitFor()
    await captura(page, '02_dirigente_jornadas', ancho)

    await page.goto(`${APP}/dirigente?tab=posiciones`)
    await page.getByText('Leones del Guasmo').first().waitFor()
    await captura(page, '03_dirigente_posiciones', ancho)

    await page.goto(`${APP}/dirigente?tab=nomina`)
    await page.getByText('0911123450').waitFor()
    ok(`nómina propia con documentos @${ancho}`, await page.getByText('0911123450').isVisible())
    ok(`nómina propia sin aviso de privacidad @${ancho}`, await page.getByText('Por privacidad').count() === 0)
    await captura(page, '04_dirigente_nomina_propia', ancho)
    await page.getByLabel('Equipo', { exact: true }).selectOption('12')
    await page.getByText('Quiñónez').first().waitFor()
    ok(`nómina rival sin documentos @${ancho}`, await page.locator('td', { hasText: /^09\d{8}$/ }).count() === 0)
    ok(`nómina rival muestra «—» @${ancho}`, await page.locator('td', { hasText: /^—$/ }).count() >= 6)
    ok(`nómina rival con aviso de privacidad @${ancho}`, await page.getByText('Por privacidad').isVisible())
    await captura(page, '05_dirigente_nomina_rival', ancho)

    await page.goto(`${APP}/dirigente?tab=suspensiones`)
    await page.getByText('Agresión verbal al árbitro').waitFor()
    ok(`suspensiones sin «Agregar sanción» @${ancho}`, await page.getByText('Agregar sanción').count() === 0)
    ok(`suspensiones sin botón para borrar @${ancho}`, await page.getByRole('button', { name: /Eliminar la sanción/ }).count() === 0)
    await captura(page, '06_dirigente_suspensiones', ancho)

    await page.goto(`${APP}/dirigente?tab=goleadores`)
    await page.getByText('Carlos Mendoza').waitFor()
    await page.goto(`${APP}/dirigente?tab=tarjetas`)
    await page.getByText('Jorge Ortiz').first().waitFor()

    // Si intenta entrar a la administración o al modo en vivo, vuelve a su pantalla.
    await page.goto(`${APP}/campeonatos`)
    await page.waitForURL(/\/dirigente/)
    ok(`administración redirige al dirigente @${ancho}`, page.url().includes('/dirigente'))
    await page.goto(`${APP}/partidos/1/en-vivo?jornada=1`)
    await page.waitForURL(/\/dirigente/)
    ok(`modo en vivo redirige al dirigente @${ancho}`, page.url().includes('/dirigente'))

    const ajenas = llamadas.filter(l => !/ \/dirigente\//.test(l))
    ok(`el dirigente solo llama a /api/dirigente @${ancho}`, ajenas.length === 0, ajenas.join(', '))
    ok(`sin errores en la página del dirigente @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
  // ── Invitación (sin sesión) ──
  {
    const { ctx, page, errores } = await abrir(browser, ancho, null)
    await page.goto(`${APP}/invitacion-dirigente/ABCDE-FGHJK`)
    await page.getByText(/te invita como dirigente de Ventarrón FC/).waitFor()
    await captura(page, '07_invitacion_dirigente', ancho)
    ok(`sin errores en la invitación @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
  // ── Organizador ──
  {
    const { ctx, page, errores } = await abrir(browser, ancho, sesion('Organizador', 'Roberto Prado'))
    await page.goto(`${APP}/campeonatos/1?tab=dirigentes`)
    await page.getByText('Pedro Alvarado').waitFor()
    await captura(page, '08_organizador_dirigentes', ancho)
    await page.getByRole('button', { name: '+ Invitar dirigente' }).click()
    await page.getByLabel('Equipo del dirigente').selectOption('14')
    await page.getByRole('button', { name: 'Crear invitación' }).click()
    await page.getByText('K7M2P-QX9RT').waitFor()
    ok(`la invitación creada muestra el equipo @${ancho}`, await page.getByText(/Invitación de dirigente de Leones del Guasmo/).isVisible())
    await captura(page, '09_organizador_invitacion_creada', ancho)

    // Reportes del organizador: sin cambios (documentos de todos y «Agregar sanción»).
    await page.goto(`${APP}/reportes`)
    await page.getByRole('button', { name: /Nómina/ }).click()
    await page.getByLabel('Equipo', { exact: true }).selectOption('12')
    await page.getByText('0912123450').waitFor()
    ok(`organizador ve documentos de cualquier equipo @${ancho}`, await page.getByText('0912123450').isVisible())
    ok(`organizador sin aviso de privacidad @${ancho}`, await page.getByText('Por privacidad').count() === 0)
    await page.getByRole('button', { name: /Suspensiones/ }).click()
    await page.getByText('Agresión verbal al árbitro').waitFor()
    ok(`organizador conserva «Agregar sanción» @${ancho}`, await page.getByText('+ Agregar sanción').isVisible())
    await captura(page, '10_organizador_suspensiones', ancho)
    ok(`sin errores en las páginas del organizador @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
}
await browser.close()
console.log(fallas.length ? `\n${fallas.length} fallas` : '\nTodo bien')
process.exit(fallas.length ? 1 : 0)
