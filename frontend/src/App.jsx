import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout            from './components/Layout'
import LoginPage         from './pages/LoginPage'
import RegisterPage      from './pages/RegisterPage'
import Dashboard         from './pages/Dashboard'
import Campeonatos       from './pages/campeonatos/Campeonatos'
import CampeonatoDetalle from './pages/campeonatos/CampeonatoDetalle'
import Equipos           from './pages/equipos/Equipos'
import Jugadores         from './pages/jugadores/Jugadores'
import Reportes          from './pages/reportes/Reportes'
import Mantenimiento     from './pages/mantenimiento/Mantenimiento'
import EnVivo            from './pages/vivo/EnVivo'
import InicioVocal       from './pages/vocal/InicioVocal'
import Invitacion        from './pages/vocal/Invitacion'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// La administración no es para el vocal: lo lleva a su lista de partidos.
// (El servidor igual rechaza sus llamadas; esto solo evita pantallas de error.)
function SoloGestion({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.rol === 'Vocal' ? <Navigate to="/vocal" replace /> : children
}

function SoloVocal({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.rol === 'Vocal' ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invitacion" element={<Invitacion />} />
        <Route path="/invitacion/:codigo" element={<Invitacion />} />
        <Route path="/vocal" element={<SoloVocal><InicioVocal /></SoloVocal>} />
        {/* Modo en vivo: pantalla completa, sin el menú de administración. */}
        <Route path="/partidos/:idPartido/en-vivo" element={
          <ProtectedRoute>
            <EnVivo />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <SoloGestion>
            <Layout />
          </SoloGestion>
        }>
          <Route index                      element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"           element={<Dashboard />} />
          <Route path="campeonatos"         element={<Campeonatos />} />
          <Route path="campeonatos/:id"     element={<CampeonatoDetalle />} />
          <Route path="equipos"             element={<Equipos />} />
          <Route path="jugadores"           element={<Jugadores />} />
          <Route path="reportes"             element={<Reportes />} />
          <Route path="mantenimiento"        element={<Mantenimiento />} />
          {/* Rutas anteriores: se mantienen como redirección por si quedaron guardadas en favoritos. */}
          <Route path="posiciones"           element={<Navigate to="/reportes" replace />} />
          <Route path="estadisticas"         element={<Navigate to="/reportes" replace />} />
          <Route path="estadios"             element={<Navigate to="/mantenimiento" replace />} />
          <Route path="oficiales"            element={<Navigate to="/mantenimiento" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}