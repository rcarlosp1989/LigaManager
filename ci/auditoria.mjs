// Auditoría UX (temporal, no es parte del proyecto): recorre la app real (API + frontend) como
// cada rol, a 390 y 1440 px. Por pantalla: captura, axe-core (WCAG 2.2 A/AA), recorrido con
// teclado (foco visible y nombre accesible), objetivos táctiles chicos, desborde lateral, tiempo
// de carga y saltos de contenido (CLS). Cada paso de tarea registra si se pudo completar.
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'

const APP = 'http://localhost:4173'
const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
fs.mkdirSync('auditoria', { recursive: true })
const resultados = { pantallas: [], pasos: [] }
let n = 0

const paso = (rol, ancho, texto, ok, detalle = '') => {
  resultados.pasos.push({ rol, ancho, texto, ok, detalle: String(detalle).slice(0, 300) })
  console.log(`${ok ? 'OK   ' : 'NO   '}[${rol} ${ancho}] ${texto}${detalle ? ' — ' + String(detalle).slice(0, 200) : ''}`)
}

async function contexto(browser, ancho) {
  const movil = ancho < 500
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: ancho, height: movil ? 844 : 900 }, hasTouch: movil, isMobile: movil, locale: 'es-EC', timezoneId: 'America/Guayaquil' })
  await ctx.addInitScript(() => {
    window.__cls = 0; window.__lcp = 0
    try {
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch { /* sin soporte */ }
  })
  const page = await ctx.newPage()
  page.__errores = []
  page.on('pageerror', e => page.__errores.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') page.__errores.push(m.text().slice(0, 200)) })
  return { ctx, page }
}

async function esperar(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(500)
}

async function revisar(page, rol, ancho, nombre, { teclado = true, t0 = null } = {}) {
  await esperar(page)
  const id = String(++n).padStart(3, '0')
  const archivo = `${id}_${rol}_${nombre}_${ancho}.png`.replace(/[^\w.-]+/g, '-')
  await page.screenshot({ path: `auditoria/${archivo}`, fullPage: true })
  const r = { id, rol, ancho, nombre, archivo, url: page.url().replace(APP, '') }
  if (t0) r.cargaMs = Date.now() - t0
  const m = await page.evaluate(() => {
    const vis = (el) => { const s = getComputedStyle(el), b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 }
    const chicos = []
    for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex="-1"])')) {
      if (!vis(el)) continue
      const b = el.getBoundingClientRect()
      if (el.type === 'checkbox' || el.type === 'radio') { const l = el.closest('label'); if (l) { const lb = l.getBoundingClientRect(); if (lb.height >= 24) continue } }
      if (b.width < 24 || b.height < 24) chicos.push({ tam: `${Math.round(b.width)}x${Math.round(b.height)}`, txt: (el.getAttribute('aria-label') || el.textContent || el.name || el.type || '').trim().slice(0, 40), nivel: 'menor-24' })
      else if (b.width < 44 || b.height < 44) chicos.push({ tam: `${Math.round(b.width)}x${Math.round(b.height)}`, txt: (el.getAttribute('aria-label') || el.textContent || el.name || el.type || '').trim().slice(0, 40), nivel: 'menor-44' })
    }
    return {
      desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      alto: document.documentElement.scrollHeight,
      cls: Math.round((window.__cls || 0) * 1000) / 1000,
      lcp: Math.round(window.__lcp || 0),
      h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 60)),
      titulo: document.title,
      lang: document.documentElement.lang,
      chicos24: chicos.filter(c => c.nivel === 'menor-24'),
      chicos44: chicos.filter(c => c.nivel === 'menor-44').length,
      chicos44ej: chicos.filter(c => c.nivel === 'menor-44').slice(0, 8),
      saltar: !!document.querySelector('a[href^="#"]'),
    }
  })
  Object.assign(r, m)
  try {
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    r.axe = axe.violations.map(v => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.length, ejemplos: v.nodes.slice(0, 3).map(x => `${x.target.join(' ')} :: ${x.html.slice(0, 140)}${x.any?.[0]?.message ? ' :: ' + x.any[0].message.slice(0, 160) : ''}`) }))
  } catch (e) { r.axe = [{ id: 'axe-error', ayuda: String(e).slice(0, 200) }] }
  if (teclado) {
    const focos = []
    await page.mouse.click(1, 1).catch(() => {})
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0) })
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const f = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const s = getComputedStyle(el)
        const anillo = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none')
        const b = el.getBoundingClientRect()
        const nombre = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
        return { tag: el.tagName.toLowerCase(), nombre, anillo, enPantalla: b.bottom > 0 && b.top < innerHeight }
      })
      if (!f) continue
      focos.push(f)
    }
    r.teclado = { recorridos: focos.length, sinAnillo: focos.filter(f => !f.anillo).map(f => `${f.tag}:${f.nombre}`), sinNombre: focos.filter(f => !f.nombre).map(f => f.tag), primeros: focos.slice(0, 6).map(f => `${f.tag}:${f.nombre}`) }
    await page.keyboard.press('Escape').catch(() => {})
  }
  r.errores = page.__errores.splice(0)
  resultados.pantallas.push(r)
  console.log(`  ${archivo} · axe ${r.axe.length} · carga ${r.cargaMs ?? '-'}ms · cls ${r.cls} · desborde ${r.desborde}`)
  return r
}

async function ir(page, ruta) { const t0 = Date.now(); await page.goto(APP + ruta); return t0 }
async function clic(page, loc, rol, ancho, texto) {
  try { await loc.first().click({ timeout: 6000 }); await esperar(page); paso(rol, ancho, texto, true); return true }
  catch (e) { paso(rol, ancho, texto, false, e.message.split('\n')[0]); return false }
}

async function login(page, rol, ancho, email) {
  await ir(page, '/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.locator('input[type=password]').first().fill('clave123')
  const t0 = Date.now()
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 15000 }).then(() => paso(rol, ancho, `iniciar sesión (${email})`, true, `${Date.now() - t0} ms`)).catch(e => paso(rol, ancho, `iniciar sesión (${email})`, false, e.message.split('\n')[0]))
  await esperar(page)
}

async function aceptarInvitacion(page, rol, ancho, ruta, nombre, email) {
  const t0 = await ir(page, ruta)
  await revisar(page, rol, ancho, 'invitacion', { t0 })
  try {
    const nueva = page.getByRole('button', { name: /cuenta nueva|nueva/i })
    if (await nueva.count()) await nueva.first().click()
    const n1 = page.getByLabel(/nombre/i)
    if (await n1.count()) await n1.first().fill(nombre)
    await page.getByLabel(/correo/i).first().fill(email)
    for (const pw of await page.locator('input[type=password]').all()) await pw.fill('clave123')
    for (const cb of await page.locator('input[type=checkbox]').all()) await cb.check().catch(() => {})
    await revisar(page, rol, ancho, 'invitacion-llena', { teclado: false })
    await page.locator('form button[type=submit]').last().click()
    await page.waitForURL(u => !u.pathname.startsWith('/invitacion'), { timeout: 15000 })
    paso(rol, ancho, 'aceptar la invitación y entrar', true)
  } catch (e) {
    paso(rol, ancho, 'aceptar la invitación y entrar', false, e.message.split('\n')[0])
    await revisar(page, rol, ancho, 'invitacion-error', { teclado: false })
  }
  await esperar(page)
}

const browser = await chromium.launch()

// ── Visitante: ingreso, registro, recuperar clave ──
for (const ancho of [390, 1440]) {
  const { ctx, page } = await contexto(browser, ancho)
  let t0 = await ir(page, '/login')
  await revisar(page, 'visitante', ancho, 'login', { t0 })
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForTimeout(600)
  await revisar(page, 'visitante', ancho, 'login-vacio', { teclado: false })
  await page.getByLabel('Correo electrónico').fill('org1@prueba.ec')
  await page.locator('input[type=password]').first().fill('incorrecta')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForTimeout(1500)
  await revisar(page, 'visitante', ancho, 'login-clave-mala', { teclado: false })
  t0 = await ir(page, '/register'); await revisar(page, 'visitante', ancho, 'registro', { t0 })
  await page.locator('form button[type=submit]').last().click().catch(() => {})
  await page.waitForTimeout(600)
  await revisar(page, 'visitante', ancho, 'registro-vacio', { teclado: false })
  t0 = await ir(page, '/olvide-clave'); await revisar(page, 'visitante', ancho, 'olvide-clave', { t0 })
  await ctx.close()
}

// ── Organizador ──
for (const ancho of [390, 1440]) {
  const { ctx, page } = await contexto(browser, ancho)
  const rol = 'organizador'
  await login(page, rol, ancho, 'org1@prueba.ec')
  await revisar(page, rol, ancho, 'inicio-tras-login')
  if (ancho < 500) {
    const menu = page.getByRole('button', { name: /menú|menu|abrir/i })
    if (await clic(page, menu, rol, ancho, 'abrir el menú principal en celular')) await revisar(page, rol, ancho, 'menu-movil', { teclado: false })
    await page.keyboard.press('Escape').catch(() => {})
  }
  let t0 = await ir(page, '/campeonatos'); await revisar(page, rol, ancho, 'campeonatos', { t0 })
  if (await clic(page, page.getByRole('button', { name: /Nuevo Campeonato|Crear campeonato/i }), rol, ancho, 'abrir «Nuevo campeonato»')) {
    await revisar(page, rol, ancho, 'nuevo-campeonato')
    await clic(page, page.getByRole('dialog').getByRole('button', { name: /Crear campeonato/i }), rol, ancho, 'guardar el formulario vacío')
    await revisar(page, rol, ancho, 'nuevo-campeonato-vacio', { teclado: false })
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    await revisar(page, rol, ancho, 'tras-escape-en-formulario', { teclado: false })
    const descartar = page.getByRole('button', { name: /Descartar|Salir sin guardar|Sí/i })
    if (await descartar.count()) await descartar.first().click().catch(() => {})
  }
  const tabs = ['Equipos', 'Grupos', 'Jornadas', 'Llaves', 'Pagos', 'Vocales', 'Dirigentes']
  t0 = await ir(page, `/campeonatos/${P.campA}`); await revisar(page, rol, ancho, 'campeonato-equipos', { t0 })
  {
    const nav = page.getByRole('navigation', { name: 'Secciones del campeonato' })
    const grupos = []
    for (const g of ['Competencia', 'Pagos', 'Accesos']) {
      const b = nav.getByRole('button', { name: g, exact: true })
      const box = await b.boundingBox().catch(() => null)
      grupos.push(box && box.x >= 0 && box.x + box.width <= ancho + 1 && box.y + box.height <= 900)
    }
    paso(rol, ancho, 'VERIFICAR: los 3 grupos se ven completos sin deslizar ni bajar', grupos.every(Boolean), JSON.stringify(grupos))
    const tit = await page.title()
    paso(rol, ancho, 'VERIFICAR: título con pestaña y campeonato', /^Equipos · .+ · LigaManager$/.test(tit), tit)
    if (ancho < 500) {
      const info = await page.getByText('Información general').isVisible().catch(() => false)
      paso(rol, ancho, 'VERIFICAR: ficha plegada en celular', !info)
      await page.getByRole('button', { name: 'Ver más' }).click().catch(() => {})
      paso(rol, ancho, 'VERIFICAR: «Ver más» despliega la ficha', await page.getByText('Modalidad', { exact: true }).isVisible().catch(() => false))
      await page.getByRole('button', { name: 'Ver menos' }).click().catch(() => {})
    } else {
      await page.reload(); await esperar(page); await page.keyboard.press('Tab')
      const f = await page.evaluate(() => document.activeElement?.textContent?.trim())
      paso(rol, ancho, 'VERIFICAR: el primer Tab es «Saltar al contenido»', f === 'Saltar al contenido', f)
      await page.keyboard.press('Escape')
    }
    await nav.getByRole('button', { name: 'Accesos', exact: true }).click()
    await nav.getByRole('button', { name: 'Dirigentes', exact: true }).click()
    await nav.getByRole('button', { name: 'Competencia', exact: true }).click()
    await nav.getByRole('button', { name: 'Accesos', exact: true }).click()
    paso(rol, ancho, 'VERIFICAR: un grupo recuerda su última pestaña', page.url().includes('tab=dirigentes'), page.url())
    await nav.getByRole('button', { name: 'Competencia', exact: true }).click()
    await page.waitForTimeout(300)
  }
  for (const t of tabs.slice(1)) {
    const t1 = Date.now()
    const GRUPO = { Grupos: 'Competencia', Jornadas: 'Competencia', Llaves: 'Competencia', Vocales: 'Accesos', Dirigentes: 'Accesos' }
    const nav = page.getByRole('navigation', { name: 'Secciones del campeonato' })
    if (GRUPO[t] && !(await nav.getByRole('button', { name: t, exact: true }).isVisible().catch(() => false))) await nav.getByRole('button', { name: GRUPO[t], exact: true }).click().catch(() => {})
    if (await clic(page, nav.getByRole('button', { name: t, exact: true }), rol, ancho, `pestaña ${t}`)) await revisar(page, rol, ancho, `campeonato-${t.toLowerCase()}`, { t0: t1, teclado: t === 'Jornadas' })
    if (t === 'Jornadas') {
      const jornada = page.getByRole('button', { name: /Jornada \d/ })
      if (await clic(page, jornada, rol, ancho, 'abrir la primera jornada')) await revisar(page, rol, ancho, 'jornada-abierta')
      const xs = await page.locator('button[aria-label^="Eliminar "]').evaluateAll(bs => bs.filter(b => b.offsetParent && b.textContent.trim() === '✕').map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }))
      paso(rol, ancho, 'VERIFICAR: botones ✕ de eventos de al menos 24 px (44 en táctil)', xs.length > 0 && xs.every(([w, h]) => w >= (ancho < 500 ? 44 : 24) && h >= (ancho < 500 ? 44 : 24)), JSON.stringify(xs.slice(0, 6)))
      const planilla = page.getByRole('button', { name: /Planilla|Registrar|Resultado/i })
      if (await clic(page, planilla, rol, ancho, 'abrir planilla/resultado de un partido')) { await revisar(page, rol, ancho, 'planilla'); await page.keyboard.press('Escape') }
    }
    if (t === 'Pagos') {
      const fila = page.locator('table.tabla tbody th button')
      if (await clic(page, fila, rol, ancho, 'abrir estado de cuenta de un equipo')) { await revisar(page, rol, ancho, 'pagos-cuenta'); await page.keyboard.press('Escape') }
    }
  }
  t0 = await ir(page, '/equipos'); await revisar(page, rol, ancho, 'equipos', { t0 })
  if (await clic(page, page.getByRole('button', { name: /Nuevo Equipo/i }), rol, ancho, 'abrir «Nuevo equipo»')) {
    await revisar(page, rol, ancho, 'nuevo-equipo', { teclado: false })
    await clic(page, page.getByRole('dialog').locator('button[type=submit]'), rol, ancho, 'guardar equipo vacío')
    await revisar(page, rol, ancho, 'nuevo-equipo-vacio', { teclado: false })
    await page.keyboard.press('Escape')
  }
  t0 = await ir(page, '/jugadores'); await revisar(page, rol, ancho, 'jugadores', { t0 })
  if (await clic(page, page.getByRole('button', { name: /Nuevo Jugador/i }), rol, ancho, 'abrir «Nuevo jugador»')) {
    await revisar(page, rol, ancho, 'nuevo-jugador', { teclado: false })
    await clic(page, page.getByRole('button', { name: /Registrar Jugador/i }).last(), rol, ancho, 'guardar jugador vacío')
    await revisar(page, rol, ancho, 'nuevo-jugador-vacio', { teclado: false })
    await page.keyboard.press('Escape')
  }
  t0 = await ir(page, '/reportes'); await revisar(page, rol, ancho, 'reportes', { t0 })
  t0 = await ir(page, '/mantenimiento'); await revisar(page, rol, ancho, 'mantenimiento', { t0 })
  t0 = await ir(page, '/dashboard'); await revisar(page, rol, ancho, 'dashboard', { t0 })
  await ir(page, '/no-existe'); await revisar(page, rol, ancho, 'ruta-inexistente', { teclado: false })
  paso(rol, ancho, 'VERIFICAR: página no encontrada con salida', await page.getByRole('heading', { name: 'Página no encontrada' }).isVisible().catch(() => false) && await page.getByRole('link', { name: 'Ir al inicio' }).isVisible().catch(() => false))
  // ── Hallazgos 10 a 15 ──
  {
    const R = (t, ok, d = '') => paso(rol, ancho, 'VERIFICAR: ' + t, ok, d)
    await ir(page, '/campeonatos'); await esperar(page)
    await page.getByRole('button', { name: /Nuevo Campeonato/i }).first().click()
    const dlg = page.getByRole('dialog')
    await dlg.getByRole('button', { name: /Crear campeonato/i }).click()
    await page.waitForTimeout(400)
    const errs = await dlg.locator('[data-error]').evaluateAll(es => es.map(e => e.getAttribute('data-error')))
    const foco = await page.evaluate(() => ({ inv: document.activeElement?.getAttribute('aria-invalid'), id: document.activeElement?.id }))
    R('formulario vacío: mensajes propios en español bajo los campos', errs.length >= 3 && errs.every(m => /Complete|Elija|Indique/.test(m)), JSON.stringify(errs))
    R('formulario vacío: foco en el primer campo con error', foco.inv === 'true', JSON.stringify(foco))
    await revisar(page, rol, ancho, 'validacion-campeonato', { teclado: false })
    await dlg.getByLabel('Nombre').fill('Copa Validación')
    await page.waitForTimeout(200)
    const despues = await dlg.locator('[data-error]').count()
    R('al corregir un campo su mensaje desaparece', despues === errs.length - 1, `${errs.length} → ${despues}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    const desc = page.getByRole('button', { name: /Descartar|Salir sin guardar|Sí/i }); if (await desc.count()) await desc.first().click().catch(() => {})

    if (ancho < 500) await page.getByRole('button', { name: 'Abrir menú' }).click()
    R('menú dice «Estadios y oficiales»', await page.getByRole('link', { name: 'Estadios y oficiales' }).waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false) && !(await page.getByRole('link', { name: 'Mantenimiento' }).count()))
    if (ancho < 500) await page.keyboard.press('Escape')

    await ir(page, `/campeonatos/${P.campA}`); await esperar(page)
    R('no queda el verbo «Remover»', (await page.getByText(/Remover/).count()) === 0)
    await page.getByRole('link', { name: 'Reportes de este campeonato' }).click()
    await esperar(page)
    const sel = await page.getByLabel('Campeonato', { exact: true }).inputValue().catch(() => '')
    R('«Reportes de este campeonato» abre Reportes con ese campeonato', page.url().includes(`campeonato=${P.campA}`) && sel === String(P.campA), `${page.url()} sel=${sel}`)
    await revisar(page, rol, ancho, 'reportes-desde-campeonato', { teclado: false })

    // Editar jugador desde la nómina (organizador)
    await ir(page, `/reportes?campeonato=${P.campA}&tab=nomina`); await esperar(page)
    await page.getByLabel('Equipo', { exact: true }).selectOption({ index: 1 }); await esperar(page)
    const botonesEditar = page.getByRole('button', { name: /^Editar a / })
    const nEditar = await botonesEditar.count()
    R('nómina: el organizador ve «Editar» en cada jugador', nEditar > 0, String(nEditar))
    if (nEditar) {
      await botonesEditar.first().click()
      const ventana = page.getByRole('dialog')
      await ventana.getByLabel('Apellido').waitFor({ timeout: 5000 }).catch(() => {})
      const ap = await ventana.getByLabel('Apellido').inputValue().catch(() => '')
      await revisar(page, rol, ancho, 'nomina-editar', { teclado: false })
      await ventana.getByLabel('Apellido').fill(ap + ' Ed')
      await ventana.getByRole('button', { name: 'Guardar cambios' }).click(); await esperar(page)
      const cerrada = await page.getByRole('dialog').count() === 0
      const visto = await page.getByText(`${ap} Ed,`).count()
      R('nómina: guardar cierra la ventana y la nómina muestra el cambio', cerrada && visto > 0, `cerrada=${cerrada} visto=${visto}`)
      await page.getByRole('button', { name: new RegExp(`^Editar a .* ${ap} Ed$`) }).first().click().catch(() => {})
      await page.getByRole('dialog').getByLabel('Apellido').fill(ap).catch(() => {})
      await page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }).click().catch(() => {}); await esperar(page)
    }

    await ir(page, `/campeonatos/${P.campA}?tab=jornadas`); await esperar(page)
    await page.getByRole('button', { name: /Jornada \d/ }).first().click().catch(() => {}); await esperar(page)
    const altos = await page.locator('button, a').evaluateAll(es => {
      const fila = es.find(e => /Planilla/.test(e.textContent || ''))?.parentElement
      return fila ? [...fila.children].filter(c => c.offsetParent).map(c => [c.textContent.trim().slice(0, 14), Math.round(c.getBoundingClientRect().height)]) : []
    })
    const hs = new Set(altos.map(a => a[1]))
    R('botones de un partido con el mismo alto' + (ancho < 500 ? ' (44 px táctil)' : ''), altos.length >= 4 && hs.size === 1 && (ancho >= 500 || [...hs][0] >= 44), JSON.stringify(altos))
    R('«Eliminar» es el último botón del partido', altos.length > 0 && /Eliminar/.test(altos[altos.length - 1][0]), JSON.stringify(altos.map(a => a[0])))
    await revisar(page, rol, ancho, 'partido-botones', { teclado: false })

    await ir(page, `/campeonatos/${P.campA}?tab=dirigentes`); await esperar(page)
    const lineas = await page.getByText(/^desde el /).evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)))
    R('«desde el …» en una sola línea', lineas.length > 0 && lineas.every(h => h <= 20), JSON.stringify(lineas))
    await revisar(page, rol, ancho, 'dirigentes-fecha', { teclado: false })

    // Montos con formato de dólar
    await ir(page, `/campeonatos/${P.campA}?tab=pagos`); await esperar(page)
    await page.getByRole('button', { name: /Valores del campeonato|Configurar valores/ }).click(); await esperar(page)
    await page.getByLabel('Tarjeta amarilla').fill('2')
    await page.getByLabel('Tarjeta roja').fill('4,5')
    await page.getByLabel('Inscripción del equipo').fill('1,250.00')
    await page.getByRole('button', { name: 'Guardar valores' }).click(); await esperar(page)
    await page.getByRole('button', { name: 'Valores del campeonato' }).click(); await esperar(page)
    const vals = [await page.getByLabel('Tarjeta amarilla').inputValue(), await page.getByLabel('Tarjeta roja').inputValue(), await page.getByLabel('Inscripción del equipo').inputValue()]
    R('montos: «2», «4,5» y «1,250.00» se guardan como 2.00, 4.50 y 1250.00', JSON.stringify(vals) === '["2.00","4.50","1250.00"]', JSON.stringify(vals))
    await revisar(page, rol, ancho, 'pagos-valores-dolar', { teclado: false })
    await page.keyboard.press('Escape'); await esperar(page)
    const cuerpo = await page.locator('main').innerText()
    const viejos = cuerpo.match(/\$\d{1,3}(\.\d{3})*,\d{2}\b/g) || []
    const nuevos = cuerpo.match(/\$\d{1,3}(,\d{3})*\.\d{2}\b/g) || []
    R('montos de Pagos con punto decimal, sin «$2,00»', viejos.length === 0 && nuevos.length > 0, `${nuevos.slice(0, 4).join(' ')} | viejos: ${viejos.slice(0, 3).join(' ')}`)
  }
  await ctx.close()
}

// ── Vocal (celular primero) ──
if (P.vocal) {
  for (const ancho of [390, 1440]) {
    const { ctx, page } = await contexto(browser, ancho)
    const rol = 'vocal'
    if (ancho === 390) await aceptarInvitacion(page, rol, ancho, `/invitacion/${encodeURIComponent(P.vocal)}`, 'Ana Vocal Auditoría', 'vocal.auditoria@prueba.ec')
    else await login(page, rol, ancho, 'vocal.auditoria@prueba.ec')
    await revisar(page, rol, ancho, 'inicio')
    const partido = page.getByRole('link', { name: /vivo|registrar|abrir/i })
    if (await clic(page, partido, rol, ancho, 'abrir un partido para registrar en vivo')) await revisar(page, rol, ancho, 'en-vivo')
    await ctx.close()
  }
} else paso('vocal', 0, 'crear invitación de vocal', false, 'sin código')

// ── Dirigente ──
if (P.dirigente) {
  for (const ancho of [390, 1440]) {
    const { ctx, page } = await contexto(browser, ancho)
    const rol = 'dirigente'
    if (ancho === 390) await aceptarInvitacion(page, rol, ancho, `/invitacion-dirigente/${encodeURIComponent(P.dirigente)}`, 'Luis Dirigente Auditoría', 'dir.auditoria@prueba.ec')
    else await login(page, rol, ancho, 'dir.auditoria@prueba.ec')
    await revisar(page, rol, ancho, 'inicio')
    for (const t of ['Planilla', 'Posiciones', 'Goleadores', 'Suspensiones', 'Pagos', 'Llaves', 'En vivo']) {
      const b = page.getByRole('button', { name: t, exact: true })
      if (await b.count()) { await b.first().click(); await revisar(page, rol, ancho, `tab-${t.toLowerCase().replace(' ', '-')}`, { teclado: false }) }
    }
    const nom = page.getByRole('button', { name: 'Nómina', exact: true })
    if (await nom.count()) { await nom.first().click(); await esperar(page) }
    paso(rol, ancho, 'VERIFICAR: dirigente: sin botón «Editar» en la nómina', (await page.getByRole('button', { name: /^Editar a / }).count()) === 0)
    await ctx.close()
  }
} else paso('dirigente', 0, 'crear invitación de dirigente', false, 'sin código')

// ── Aficionado / enlace público ──
const tokens = Object.entries(P).filter(([k, v]) => /token/i.test(k) && v)
for (const [k, token] of tokens) {
  for (const ancho of [390, 1440]) {
    const { ctx, page } = await contexto(browser, ancho)
    const rol = k.toLowerCase().includes('aficion') ? 'aficionado' : 'publico'
    const t0 = await ir(page, `/publico/${token}`)
    await revisar(page, rol, ancho, 'inicio', { t0 })
    for (const b of (await page.getByRole('button').all()).slice(0, 12)) {
      const txt = (await b.innerText().catch(() => '')).trim()
      if (!txt || txt.length > 20 || /^(x|×)$/i.test(txt)) continue
      const antes = page.url()
      await b.click().catch(() => {})
      await esperar(page)
      if (page.url() !== antes || true) await revisar(page, rol, ancho, `boton-${txt.toLowerCase().replace(/\W+/g, '-')}`, { teclado: false })
    }
    await ctx.close()
  }
}

await browser.close()
fs.writeFileSync('auditoria/resultados.json', JSON.stringify(resultados, null, 1))
console.log(`\n${resultados.pantallas.length} pantallas · ${resultados.pasos.filter(p => !p.ok).length} pasos no completados`)
