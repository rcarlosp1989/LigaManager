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
function respuesta(metodo, ruta) {
  const r = ruta.replace(/\?.*$/, '')
  const d = '/dirigente/campeonatos/1'
  if (r === '/auth/terminos') {
    if (metodo === 'POST') terminosPendientes = false
    return { version: '2026-10-20', aceptadosEn: terminosPendientes ? null : '2026-10-20T15:00:00Z', pendiente: terminosPendientes }
  }
  if (metodo === 'GET') {
    if (r === '/dirigente/inicio') return { campeonatos: [{ idCampeonato: 1, nombre: 'Liga Barrial Recuspro', anio: 2026, estado: 'EnCurso', fechaInicio: '2026-09-01', fechaFin: '2026-12-20', idEquipo: 11, equipo: 'Ventarrón FC', logoEquipo: null }] }
    if (r === d) return campDirigente
    if (r === `${d}/equipos/11`) return { idEquipo: 11, nombre: 'Ventarrón FC', idPais: 1, pais: 'Ecuador', jugadores: jugadores(11, true).map(pendiente), logoUrl: null }
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

const browser = await chromium.launch()
const dirigente = [
  ['posiciones', 'Leones del Guasmo'],
  ['goleadores', 'Carlos Mendoza'],
  ['tarjetas', 'Acumuladas'],
  ['suspensiones', 'Agresión verbal'],
  ['nomina', 'Pendiente'],
]
for (const ancho of [390, 1440]) {
  {
    const { ctx, page, errores, llamadas } = await abrir(browser, ancho, sesion('Dirigente', 'Pedro Alvarado'))
    for (const [tab, texto] of dirigente) {
      await page.goto(`${APP}/dirigente?tab=${tab}`)
      await page.getByText(texto).first().waitFor()
      await captura(page, `dir_${tab}`, ancho)
      await revisarFija(page, `dirigente ${tab}`, ancho)
      if (ancho < 500) await page.screenshot({ path: `capturas/dir_${tab}_deslizada_${ancho}.png`, fullPage: true })
      const otras = llamadas.filter(l => /\/equipos\/(?!11\b)\d+/.test(l))
      ok(`dirigente ${tab} @${ancho}: no pide nóminas de otros equipos`, otras.length === 0, otras.join(', '))
      if (tab === 'nomina') {
        ok(`nómina @${ancho}: sin selector de equipo`, await page.locator('select').count() === 0)
        ok(`nómina @${ancho}: muestra su equipo`, await page.getByText('Ventarrón FC', { exact: true }).count() >= 1)
        ok(`nómina @${ancho}: el jugador pendiente muestra «Pendiente»`, await page.locator('td span', { hasText: /^Pendiente$/ }).count() === 1)
        ok(`nómina @${ancho}: los demás conservan su cédula`, await page.getByText('0911123450').count() === 1)
      }
      if (tab === 'tarjetas') {
        ok(`tarjetas @${ancho}: muestra «2/5» y «4/5»`, await page.getByText('2/5').count() === 1 && await page.getByText('4/5').count() === 1)
        ok(`tarjetas @${ancho}: explica el historial y las acumuladas`, await page.getByText(/vuelven a 0 al llegar a 5/).isVisible())
      }
    }
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
await browser.close()
console.log(fallas.length ? `\n${fallas.length} fallas` : '\nTodo bien')
process.exit(fallas.length ? 1 : 0)
