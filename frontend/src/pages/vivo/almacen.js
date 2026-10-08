// Lectura y escritura en el almacenamiento del navegador. Si no está disponible
// (modo privado, almacenamiento lleno), la pantalla sigue funcionando sin guardar.

export function leerLocal(clave, porDefecto) {
  try {
    const texto = localStorage.getItem(clave)
    return texto == null ? porDefecto : JSON.parse(texto)
  } catch {
    return porDefecto
  }
}

export function guardarLocal(clave, valor) {
  try {
    if (valor === undefined || valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}
