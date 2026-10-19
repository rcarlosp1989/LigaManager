// Pantalla de inicio de cada rol: el vocal y el dirigente no usan el menú de administración.
export const inicioDeRol = (rol) => (rol === 'Vocal' ? '/vocal' : rol === 'Dirigente' ? '/dirigente' : '/dashboard')
