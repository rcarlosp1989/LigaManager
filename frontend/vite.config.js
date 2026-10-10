import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

// Genera dist/sw.js con la lista de archivos de la versión recién construida, para que la
// app abra sin señal (ver sw/sw.js). La versión es un resumen del contenido: si cambia
// cualquier archivo, el celular descarga la versión nueva.
function serviceWorker() {
  let salida = 'dist'
  return {
    name: 'ligamanager-service-worker',
    apply: 'build',
    configResolved(config) { salida = resolve(config.root, config.build.outDir) },
    closeBundle() {
      const recorrer = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? recorrer(join(dir, e.name)) : [join(dir, e.name)])
      const archivos = recorrer(salida)
        .map(f => relative(salida, f).split(sep).join('/'))
        .filter(f => f !== 'sw.js' && !f.endsWith('.map'))
        .sort()
      const resumen = createHash('sha256')
      for (const f of archivos) resumen.update(f).update(readFileSync(join(salida, f)))
      const codigo = readFileSync(resolve(import.meta.dirname, 'sw/sw.js'), 'utf8')
        .replace("const VERSION = '__VERSION__'", `const VERSION = '${resumen.digest('hex').slice(0, 12)}'`)
        .replace('const ARCHIVOS = __ARCHIVOS__', `const ARCHIVOS = ${JSON.stringify(archivos.map(f => `/${f}`))}`)
      writeFileSync(join(salida, 'sw.js'), codigo)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
})
