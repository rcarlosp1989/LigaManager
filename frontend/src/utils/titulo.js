import { useEffect } from 'react'

// Título de la pestaña del navegador: «Sección · LigaManager». Ayuda a ubicarse entre
// pestañas abiertas, en el historial y con lector de pantalla (WCAG 2.4.2).
export const tituloDe = (texto) => (texto ? `${texto} · LigaManager` : 'LigaManager')

export function useTitulo(texto) {
  useEffect(() => { if (texto) document.title = tituloDe(texto) }, [texto])
}

const POR_RUTA = [
  ['/login', 'Ingresar'], ['/register', 'Crear cuenta'], ['/olvide-clave', 'Recuperar contraseña'],
  ['/restablecer', 'Nueva contraseña'], ['/confirmar-correo', 'Confirmar correo'],
  ['/invitacion-dirigente', 'Invitación de dirigente'], ['/invitacion', 'Invitación de vocal'],
  ['/vocal', 'Mis partidos'], ['/dirigente', 'Mi equipo'], ['/partidos/', 'Partido en vivo'],
  ['/publico/', 'Campeonato'], ['/dashboard', 'Inicio'], ['/campeonatos', 'Campeonatos'],
  ['/equipos', 'Equipos'], ['/jugadores', 'Jugadores'], ['/reportes', 'Reportes'],
  ['/mantenimiento', 'Mantenimiento'], ['/privacidad', 'Aviso de privacidad'], ['/terminos', 'Términos de uso'],
]

// Título por ruta; las pantallas con un nombre propio (un campeonato) lo afinan con useTitulo.
export const tituloDeRuta = (ruta) => POR_RUTA.find(([p]) => ruta.startsWith(p))?.[1] ?? null
