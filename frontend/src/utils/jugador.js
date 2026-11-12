// Datos y reglas de jugadores compartidos por varias pantallas.

export const posiciones = [
  'Arquero', 'Defensa central', 'Lateral izquierdo', 'Lateral derecho',
  'Mediocentro', 'Mediocentro ofensivo', 'Pivote', 'Extremo izquierdo',
  'Extremo derecho', 'Delantero centro'
]

export function calcularEdad(fechaNac) {
  if (!fechaNac) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNac)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const aunNoCumple = hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
  if (aunNoCumple) edad--
  return edad
}

// Editar jugadores: solo organizador y administrador.
export const puedeEditarJugadores = (rol) => rol === 'Organizador' || rol === 'Admin'
