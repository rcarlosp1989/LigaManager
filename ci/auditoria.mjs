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
  for (const t of tabs.slice(1)) {
    const t1 = Date.now()
    if (await clic(page, page.getByRole('button', { name: t, exact: true }), rol, ancho, `pestaña ${t}`)) await revisar(page, rol, ancho, `campeonato-${t.toLowerCase()}`, { t0: t1, teclado: t === 'Jornadas' })
    if (t === 'Jornadas') {
      const jornada = page.getByRole('button', { name: /Jornada \d/ })
      if (await clic(page, jornada, rol, ancho, 'abrir la primera jornada')) await revisar(page, rol, ancho, 'jornada-abierta')
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
