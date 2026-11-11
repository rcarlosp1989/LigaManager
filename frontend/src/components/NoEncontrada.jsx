import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useTitulo } from '../utils/titulo'

// Dirección que no existe: antes mostraba una pantalla vacía, sin forma de volver.
export default function NoEncontrada() {
  useTitulo('Página no encontrada')
  return (
    <main className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="font-display text-2xl text-white tracking-wide">Liga<span className="text-brand-400">Manager</span></p>
      <Compass size={40} className="text-brand-400" aria-hidden="true" />
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-white tracking-wide">Página no encontrada</h1>
        <p className="text-gray-400 max-w-sm">La dirección no existe o cambió. Revise el enlace o vuelva al inicio.</p>
      </div>
      <Link to="/" className="btn-primary inline-flex items-center justify-center min-h-11 px-6">Ir al inicio</Link>
    </main>
  )
}
