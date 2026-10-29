import { Link } from 'react-router-dom'
import MarcaLiga from '../../components/MarcaLiga'

// Marco común de las pantallas de la cuenta (olvidé la contraseña, restablecer, confirmar el correo).
export default function PantallaCuenta({ titulo, children }) {
  return (
    <div className="min-h-dvh bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <MarcaLiga tamano="lg" vertical className="justify-center" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <h1 className="text-white font-semibold text-lg mb-4">{titulo}</h1>
          {children}
        </div>
        <p className="text-gray-500 text-sm text-center mt-6">
          <Link to="/login" className="inline-block py-3 text-brand-400 hover:text-brand-300">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
