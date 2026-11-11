// Prueba temporal de pantallas (no es parte del proyecto): pagos del campeonato, con un servidor
// simulado. Capturas a 390 y 1440 px.
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

const equipos = [
  { idEquipo: 11, nombre: 'C.D.E.F Agremiados', pais: 'Ecuador', logoUrl: null },
  { idEquipo: 12, nombre: 'León F.C', pais: 'Ecuador', logoUrl: null },
  { idEquipo: 13, nombre: 'C.S Chicos Plásticos', pais: 'Ecuador', logoUrl: null },
  { idEquipo: 14, nombre: 'Leones del Guasmo Sporting Club', pais: 'Ecuador', logoUrl: null },
]
const campOrganizador = {
  idCampeonato: 1, nombre: 'Campeonato Senior Recuspro 2026', anio: 2026, fechaInicio: '2026-09-01', fechaFin: '2026-12-20', estado: 'EnCurso',
  idTipoPartido: 1, tipoPartido: 'Todos contra todos', idModalidad: 1, modalidad: 'Fútbol', equipos, logoUrl: null,
}
const campDirigente = {
  idCampeonato: 1, nombre: 'Campeonato Senior Recuspro 2026', anio: 2026, estado: 'EnCurso', fechaInicio: '2026-09-01', fechaFin: '2026-12-20',
  modalidad: 'Fútbol', idEquipoPropio: 11, equipoPropio: 'C.D.E.F Agremiados', logoEquipoPropio: null, equipos, proximos: [], ultimos: [],
}

let valores = { inscripcion: 0, refuerzo: 0, apelacion: 0, arbitraje: 0, amarilla: 0, roja: 0, inicioSegundaEtapa: null, configurados: false }
let valoresEnviados = null, cobroEnviado = null, abonoEnviado = null, abonoBorrado = null

const cobro = (idPago, fecha, concepto, conceptoNombre, descripcion, monto, abonado, automatico = true) =>
  ({ idPago, fecha, concepto, conceptoNombre, descripcion, monto, abonado, saldo: monto - abonado, automatico })
const cobrosIniciales = () => [
  cobro(1, '2026-09-01', 'INSCRIPCION', 'Inscripción del equipo', null, 150, 150),
  cobro(2, '2026-10-12', 'ARBITRAJE', 'Arbitraje', 'Jornada 1 · vs León F.C', 10, 0),
  cobro(3, '2026-10-12', 'AMARILLA', 'Tarjeta amarilla', 'Jornada 1 · Carlos Vera, min 34', 2, 0),
  cobro(4, '2026-10-19', 'ARBITRAJE', 'Arbitraje', 'Jornada 2 · vs Leones del Guasmo Sporting Club', 10, 0),
  cobro(5, '2026-10-19', 'ROJA', 'Tarjeta roja', 'Jornada 2 · Pedro Alvia, doble amarilla', 10, 0),
  cobro(6, '2026-10-21', 'MULTA', 'Multa', 'Jornada 2 · indisciplina de la barra (comité de disciplina de la liga)', 30, 0, false),
  cobro(7, '2026-11-22', 'REFUERZO', 'Refuerzo', 'Luis Mera · inscrito el 22/11/2026', 25, 0),
  cobro(8, '2026-11-24', 'APELACION', 'Apelación', 'Roja de Pedro Alvia', 20, 0, false),
]
const abonosIniciales = () => [{ lote: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', fecha: '2026-10-01', metodo: 'TRANSFERENCIA', referencia: 'TRX-88421', monto: 150, cobros: ['Inscripción del equipo'] }]
let cobros = cobrosIniciales(), abonos = abonosIniciales()
const cuenta = () => {
  const total = cobros.reduce((s, c) => s + c.monto, 0), pagado = cobros.reduce((s, c) => s + c.abonado, 0)
  return { idEquipo: 11, equipo: 'C.D.E.F Agremiados', logoUrl: null, campeonato: campOrganizador.nombre, cobros, abonos, total, pagado, saldo: total - pagado }
}
const resumen = () => {
  const c = cuenta()
  const suma = (...k) => cobros.filter(x => k.includes(x.concepto)).reduce((s, x) => s + x.monto, 0)
  const filas = [
    { idEquipo: 11, nombre: 'C.D.E.F Agremiados', logoUrl: null, inscripcion: suma('INSCRIPCION'), refuerzos: suma('REFUERZO'), arbitraje: suma('ARBITRAJE'), tarjetas: suma('AMARILLA', 'ROJA'), multas: suma('MULTA', 'APELACION', 'OTRO'), total: c.total, pagado: c.pagado, saldo: c.saldo },
    { idEquipo: 12, nombre: 'León F.C', logoUrl: null, inscripcion: 150, refuerzos: 0, arbitraje: 20, tarjetas: 6, multas: 0, total: 176, pagado: 176, saldo: 0 },
    { idEquipo: 13, nombre: 'C.S Chicos Plásticos', logoUrl: null, inscripcion: 150, refuerzos: 50, arbitraje: 20, tarjetas: 12, multas: 50, total: 282, pagado: 100, saldo: 182 },
    { idEquipo: 14, nombre: 'Leones del Guasmo Sporting Club', logoUrl: null, inscripcion: 150, refuerzos: 0, arbitraje: 20, tarjetas: 0, multas: 0, total: 170, pagado: 0, saldo: 170 },
  ]
  const t = filas.reduce((s, f) => s + f.total, 0), p = filas.reduce((s, f) => s + f.pagado, 0)
  return { valores, equipos: filas, total: t, pagado: p, saldo: t - p }
}

function respuesta(metodo, r, cuerpo) {
  const d = '/dirigente/campeonatos/1'
  if (r === '/auth/terminos') return { version: '2026-10-20', aceptadosEn: '2026-10-20T15:00:00Z', pendiente: false }
  if (r === '/auth/opciones') return { correo: true }
  if (r === '/campeonatos/1/pagos/valores' && metodo === 'PUT') {
    valoresEnviados = cuerpo; valores = { ...cuerpo, configurados: true }; return valores
  }
  if (r === '/campeonatos/1/pagos/cobros' && metodo === 'POST') {
    cobroEnviado = cuerpo
    cobros = [...cobros, cobro(20, cuerpo.fecha, cuerpo.concepto, cuerpo.concepto === 'MULTA' ? 'Multa' : cuerpo.concepto === 'APELACION' ? 'Apelación' : 'Otro', cuerpo.descripcion, cuerpo.monto, 0, false)]
    return cuenta()
  }
  if (r === '/campeonatos/1/pagos/equipos/11/abonos' && metodo === 'POST') {
    abonoEnviado = cuerpo
    let resta = cuerpo.monto
    const aplicados = []
    cobros = cobros.map(c => {
      if (resta <= 0 || c.saldo <= 0 || (cuerpo.idPago && c.idPago !== cuerpo.idPago)) return c
      const parte = Math.min(resta, c.saldo); resta -= parte
      aplicados.push(c.descripcion ? `${c.conceptoNombre} · ${c.descripcion}` : c.conceptoNombre)
      return { ...c, abonado: c.abonado + parte, saldo: c.saldo - parte }
    })
    abonos = [{ lote: 'ffff0000eeee1111dddd2222cccc3333', fecha: cuerpo.fecha, metodo: cuerpo.metodo, referencia: cuerpo.referencia, monto: cuerpo.monto, cobros: aplicados }, ...abonos]
    return cuenta()
  }
  if (r.startsWith('/campeonatos/1/pagos/abonos/') && metodo === 'DELETE') { abonoBorrado = r.split('/').pop(); return cuenta() }
  if (metodo === 'GET') {
    if (r === '/campeonatos/1') return campOrganizador
    if (r === '/campeonatos/1/pagos') return resumen()
    if (r === '/campeonatos/1/pagos/equipos/11') return cuenta()
    if (r === '/dirigente/inicio') return { campeonatos: [{ idCampeonato: 1, nombre: campDirigente.nombre, anio: 2026, estado: 'EnCurso', fechaInicio: '2026-09-01', fechaFin: '2026-12-20', idEquipo: 11, equipo: 'C.D.E.F Agremiados', logoEquipo: null }] }
    if (r === d) return campDirigente
    if (r === `${d}/pagos`) return cuenta()
    if (r === `${d}/eliminatoria`) return { configurada: false, modo: 'MANUAL', equiposClasifican: 0, tercerPuesto: false, reglaTarjetas: '', rondas: [] }
    if (r === `${d}/en-vivo`) return { hoy: '2026-11-10', partidos: [] }
    return []
  }
  return {}
}

const sesion = (rol, nombreUsuario) => ({ token: 'x', nombre: nombreUsuario, rol })
async function abrir(browser, ancho, usuario) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: ancho, height: ancho < 500 ? 844 : 900 }, hasTouch: ancho < 500, isMobile: ancho < 500, acceptDownloads: true })
  await ctx.addInitScript(([u]) => {
    localStorage.setItem('lm_token', u.token)
    localStorage.setItem('lm_user', JSON.stringify({ nombre: u.nombre, rol: u.rol }))
  }, [usuario])
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respuesta(req.method(), ruta, enviado)) })
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
  valores = { inscripcion: 0, refuerzo: 0, apelacion: 0, arbitraje: 0, amarilla: 0, roja: 0, inicioSegundaEtapa: null, configurados: false }
  cobros = cobrosIniciales(); abonos = abonosIniciales(); valoresEnviados = null; cobroEnviado = null; abonoEnviado = null
  {
    const { ctx, page, errores } = await abrir(browser, ancho, sesion('Organizador', 'Roberto Prado'))
    await page.goto(`${APP}/campeonatos/1?tab=pagos`)
    await page.getByRole('button', { name: 'Configurar valores' }).waitFor()
    await captura(page, 'pagos_sin_valores', ancho)

    // Valores
    await page.getByRole('button', { name: 'Configurar valores' }).click()
    await page.getByLabel('Inscripción del equipo').fill('150')
    await page.getByLabel('Por refuerzo').fill('25')
    await page.getByLabel('Apelación').fill('20')
    await page.getByLabel('Arbitraje (cada equipo)').fill('10')
    await page.getByLabel('Tarjeta amarilla').fill('2')
    await page.getByLabel('Tarjeta roja').fill('10,50')
    await page.getByLabel('Inicio de la segunda etapa (refuerzos)').fill('2026-11-20')
    await captura(page, 'pagos_valores', ancho)
    await page.getByRole('button', { name: 'Guardar valores' }).click()
    await page.getByText('Total cobrado').waitFor()
    ok(`valores @${ancho}: se envían como números (10,50 → 10.5)`, valoresEnviados?.inscripcion === 150 && valoresEnviados?.roja === 10.5 && valoresEnviados?.inicioSegundaEtapa === '2026-11-20', JSON.stringify(valoresEnviados))
    await captura(page, 'pagos_resumen', ancho)
    ok(`resumen @${ancho}: «Al día» para quien no debe`, await page.getByText('Al día').count() >= 1)
    if (ancho < 500) {
      const r = await page.evaluate(async () => {
        const c = document.querySelector('table.tabla').parentElement
        c.scrollLeft = c.scrollWidth
        await new Promise(res => setTimeout(res, 250))
        const celda = document.querySelector('table.tabla tbody .fija-borde'), cr = c.getBoundingClientRect(), fr = celda.getBoundingClientRect()
        return { desliza: c.scrollWidth > c.clientWidth, visible: fr.left >= cr.left - 1 && fr.right <= cr.right + 1 }
      })
      ok(`resumen @${ancho}: la tabla se desliza y el equipo sigue a la vista`, r.desliza && r.visible, JSON.stringify(r))
      await page.screenshot({ path: `capturas/pagos_resumen_deslizada_${ancho}.png`, fullPage: true })
    }

    // Cobro manual
    await page.getByRole('button', { name: '+ Cobro manual' }).click()
    await page.getByLabel('Equipo', { exact: true }).selectOption('11')
    await page.getByLabel('Apelación').check()
    ok(`cobro @${ancho}: la apelación sugiere el valor del campeonato`, await page.getByLabel('Valor', { exact: true }).inputValue() === '20,00', await page.getByLabel('Valor', { exact: true }).inputValue())
    await page.getByLabel('Multa').check()
    await captura(page, 'pagos_cobro_manual', ancho)
    await page.getByRole('button', { name: 'Registrar cobro' }).click()
    ok(`cobro @${ancho}: la multa sin motivo no se envía`, cobroEnviado === null)
    await page.getByLabel('Motivo').fill('Agresión al vocal, jornada 3')
    await page.getByRole('button', { name: 'Registrar cobro' }).click()
    await page.getByText('Cobro registrado.').waitFor()
    ok(`cobro @${ancho}: se envía la multa`, cobroEnviado?.concepto === 'MULTA' && cobroEnviado?.idEquipo === 11 && cobroEnviado?.monto === 20, JSON.stringify(cobroEnviado))
    cobros = cobros.filter(c => c.idPago !== 20); cobroEnviado = null

    // Estado de cuenta y abono
    await page.getByRole('button', { name: /C\.D\.E\.F Agremiados/ }).click()
    await page.getByText('Registrar abono').waitFor()
    await captura(page, 'pagos_cuenta', ancho)
    await page.getByLabel('Monto', { exact: true }).fill('50')
    await page.getByLabel('Método', { exact: true }).selectOption('EFECTIVO')
    await page.getByRole('button', { name: 'Guardar abono' }).click()
    await page.getByText('Abono registrado.').waitFor()
    ok(`abono @${ancho}: se reparte (sin cobro elegido)`, abonoEnviado?.monto === 50 && abonoEnviado?.idPago === null && abonoEnviado?.metodo === 'EFECTIVO', JSON.stringify(abonoEnviado))
    await page.getByRole('button', { name: 'Abonar' }).last().click()
    ok(`abono @${ancho}: «Abonar» en una fila elige ese cobro`, await page.getByText(/^A: Apelación/).count() === 1)
    await page.getByRole('button', { name: 'Guardar abono' }).click()
    await page.getByText('Abono registrado.').last().waitFor()
    ok(`abono @${ancho}: abono a un cobro puntual`, abonoEnviado?.idPago === 8 && abonoEnviado?.monto === 20, JSON.stringify(abonoEnviado))
    await captura(page, 'pagos_cuenta_abonada', ancho)
    const descarga = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Descargar recibo' }).first().click()
    const pdf = await descarga
    await pdf.saveAs(`capturas/recibo_${ancho}.pdf`)
    ok(`recibo @${ancho}: se descarga un PDF`, pdf.suggestedFilename().endsWith('.pdf') && fs.statSync(`capturas/recibo_${ancho}.pdf`).size > 1000, pdf.suggestedFilename())
    ok(`sin errores (organizador) @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
  {
    const { ctx, page, errores, llamadas } = await abrir(browser, ancho, sesion('Dirigente', 'Pedro Alvarado'))
    await page.goto(`${APP}/dirigente?tab=pagos`)
    await page.getByText('Saldo pendiente').waitFor()
    await captura(page, 'dir_pagos', ancho)
    ok(`dirigente @${ancho}: sin formulario de abono ni botones para eliminar`, await page.getByText('Registrar abono').count() === 0 && await page.getByRole('button', { name: /Eliminar|Abonar/ }).count() === 0)
    ok(`dirigente @${ancho}: solo pide su cuenta`, !llamadas.some(l => l.includes(' /campeonatos/1/pagos')), llamadas.join(', '))
    ok(`sin errores (dirigente) @${ancho}`, errores.length === 0, errores.join(' | '))
    await ctx.close()
  }
}
await browser.close()
console.log(`\n${fallas.length} fallas`)
process.exit(fallas.length ? 1 : 0)
