import { Link } from 'react-router-dom'

// Nota al pie de los reportes que la app calcula (posiciones, tarjetas, suspensiones).
export default function NotaResponsabilidad({ texto = 'Calculado con los datos registrados y las reglas configuradas por la organización.' }) {
  return (
    <p className="mt-6 border-t border-gray-800 pt-3 text-xs text-gray-500">
      {texto} Las decisiones deportivas y disciplinarias son responsabilidad de la organización del campeonato, no de LigaManager.{' '}
      <Link to="/terminos" className="text-gray-400 underline underline-offset-2 hover:text-brand-300">Términos de uso</Link>
    </p>
  )
}
