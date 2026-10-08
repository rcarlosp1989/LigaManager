import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Oswald (títulos) servida desde la propia app: no depende de Google Fonts ni de la señal.
import '@fontsource/oswald/latin-400.css'
import '@fontsource/oswald/latin-500.css'
import '@fontsource/oswald/latin-600.css'
import './index.css'
import App from './App.jsx'
import AvisosProvider from './components/AvisosProvider'
import DialogosProvider from './components/DialogosProvider'

// Los errores 4xx (no encontrado, sin permiso, datos inválidos) no mejoran al reintentar:
// se muestran de inmediato. Los de red o servidor se reintentan hasta 3 veces.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (intentos, error) => {
        const estado = error?.response?.status
        if (estado >= 400 && estado < 500) return false
        return intentos < 3
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AvisosProvider>
          <DialogosProvider>
            <App />
          </DialogosProvider>
        </AvisosProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)