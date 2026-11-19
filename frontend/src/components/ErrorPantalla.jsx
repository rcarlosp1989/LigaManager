import { Component } from 'react'
import { reportarError } from '../utils/reportarError'

// Si una pantalla se rompe, en lugar de quedar en blanco muestra un aviso con «Recargar» y avisa
// el error al administrador (utils/reportarError).
export default class ErrorPantalla extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportarError(error, { pila: `${error?.stack ?? ''}\n\nComponentes:${info?.componentStack ?? ''}` })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="font-display text-3xl tracking-wide text-white">ALGO SALIÓ MAL</h1>
          <p className="text-sm text-gray-300">
            Esta pantalla tuvo un problema. Ya avisamos al administrador. Recargue la página para seguir;
            sus datos guardados no se perdieron.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary min-h-11 px-5">Recargar</button>
            <a href="/" className="btn-secundario inline-flex min-h-11 items-center px-5">Ir al inicio</a>
          </div>
        </div>
      </main>
    )
  }
}
