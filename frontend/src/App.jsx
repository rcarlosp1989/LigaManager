import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout            from './components/Layout'
import LoginPage         from './pages/LoginPage'
import Dashboard         from './pages/Dashboard'
import Campeonatos       from './pages/campeonatos/Campeonatos'
import CampeonatoDetalle from './pages/campeonatos/CampeonatoDetalle'
import Equipos           from './pages/equipos/Equipos'
import Jugadores         from './pages/jugadores/Jugadores'
import Arbitros          from './pages/Arbitros'
import Estadios          from './pages/Estadios'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
          <Route path="oficiales"            element={<Arbitros />} />
          <Route path="estadios"             element={<Estadios />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}