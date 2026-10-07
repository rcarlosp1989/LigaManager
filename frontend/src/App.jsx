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

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
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