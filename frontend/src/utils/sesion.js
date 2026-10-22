// Dónde se guarda la sesión en el navegador.
//  - «Recordarme»: localStorage (sigue abierta al cerrar el navegador; dura 7 días).
//  - Sin marcar: sessionStorage (se cierra al cerrar el navegador; máximo 12 horas).
// Se guarda también cuándo vence: al abrir la app, una sesión vencida se borra y lleva al login.
const TOKEN = 'lm_token'
const USUARIO = 'lm_user'

const almacenes = () => {
  const lista = []
  try { lista.push(window.sessionStorage) } catch { /* sin almacenamiento */ }
  try { lista.push(window.localStorage) } catch { /* sin almacenamiento */ }
  return lista
}

export function limpiarSesion() {
  for (const a of almacenes()) {
    try { a.removeItem(TOKEN); a.removeItem(USUARIO) } catch { /* nada */ }
  }
}

function leer() {
  for (const a of almacenes()) {
    try {
      const token = a.getItem(TOKEN)
      if (!token) continue
      const usuario = JSON.parse(a.getItem(USUARIO) ?? 'null')
      if (usuario?.expira && new Date(usuario.expira) <= new Date()) { limpiarSesion(); return null }
      return { token, usuario }
    } catch { /* dato dañado: se ignora */ }
  }
  return null
}

export const leerToken = () => leer()?.token ?? null
export const leerUsuario = () => leer()?.usuario ?? null

export function guardarSesion(data, recordarme) {
  limpiarSesion()
  const usuario = { nombre: data.nombre, rol: data.rol, expira: data.expira }
  const lista = almacenes()
  const destino = recordarme ? lista[lista.length - 1] : lista[0]
  try {
    destino?.setItem(TOKEN, data.token)
    destino?.setItem(USUARIO, JSON.stringify(usuario))
  } catch { /* sin almacenamiento: la sesión dura mientras la página esté abierta */ }
  return usuario
}
