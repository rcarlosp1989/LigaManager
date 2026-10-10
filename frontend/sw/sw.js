// Service worker de LigaManager: guarda la aplicación en el celular para que abra sin señal.
//
// Lo genera vite.config.js en cada `npm run build`: reemplaza __VERSION__ y __ARCHIVOS__
// con la lista de archivos de esa versión. No se usa en `npm run dev`.
//
// - Páginas: primero la red (con 4 segundos de espera); sin señal, la copia guardada.
// - Archivos de la app (JS, CSS, fuentes, íconos): la copia guardada; si falta, la red.
// - Las llamadas al servidor (Railway) no pasan por aquí: los datos los maneja cada pantalla.

/* global __ARCHIVOS__ */
const VERSION = '__VERSION__'
const ARCHIVOS = __ARCHIVOS__
const CACHE = `lm-${VERSION}`
const ESPERA_RED_MS = 4000

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS.map(a => new Request(a, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

// Al activarse una versión nueva, se borran las copias de las anteriores.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k.startsWith('lm-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(pagina(req))
    return
  }
  e.respondWith(caches.match(req, { cacheName: CACHE }).then(r => r || fetch(req)))
})

async function pagina(req) {
  try {
    return await conLimite(fetch(req), ESPERA_RED_MS)
  } catch {
    const copia = await caches.match('/index.html', { cacheName: CACHE })
    return copia || Response.error()
  }
}

function conLimite(promesa, ms) {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error('sin respuesta')), ms)
    promesa.then(
      r => { clearTimeout(t); resolver(r) },
      err => { clearTimeout(t); rechazar(err) },
    )
  })
}
