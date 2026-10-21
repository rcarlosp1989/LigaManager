import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { inicioDeRol } from './utils/roles'
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
import InicioDirigente   from './pages/dirigente/InicioDirigente'
import InvitacionDirigente from './pages/dirigente/InvitacionDirigente'
import { Privacidad, Terminos } from './pages/legal/Legal'
import OlvideClave       from './pages/cuenta/OlvideClave'
import Restablecer       from './pages/cuenta/Restablecer'
import ConfirmarCorreo   from './pages/cuenta/ConfirmarCorreo'
import AceptarTerminos   from './components/AceptarTerminos'

// La administración no es para el vocal ni para el dirigente: los lleva a su propia pantalla.
// (El servidor igual rechaza sus llamadas; esto solo evita pantallas de error.)
function SoloGestion({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.rol === 'Vocal' || user.rol === 'Dirigente' ? <Navigate to={inicioDeRol(user.rol)} replace /> : children
}

function SoloRol({ rol, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.rol === rol ? children : <Navigate to={inicioDeRol(user.rol)} replace />
}

// Modo en vivo: organizador o vocal. El dirigente solo mira.
function SinDirigente({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.rol === 'Dirigente' ? <Navigate to="/dirigente" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invitacion" element={<Invitacion />} />
        <Route path="/invitacion/:codigo" element={<Invitacion />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/olvide-clave" element={<OlvideClave />} />
        <Route path="/restablecer/:token" element={<Restablecer />} />
        <Route path="/confirmar-correo/:token" element={<ConfirmarCorreo />} />
        <Route path="/invitacion-dirigente" element={<InvitacionDirigente />} />
        <Route path="/invitacion-dirigente/:codigo" element={<InvitacionDirigente />} />
        <Route path="/vocal" element={<SoloRol rol="Vocal"><InicioVocal /></SoloRol>} />
        <Route path="/dirigente" element={<SoloRol rol="Dirigente"><InicioDirigente /></SoloRol>} />
        <Route path="/dirigente/:idCampeonato" element={<SoloRol rol="Dirigente"><InicioDirigente /></SoloRol>} />
        {/* Modo en vivo: pantalla completa, sin el menú de administración. */}
        <Route path="/partidos/:idPartido/en-vivo" element={
          <SinDirigente>
            <EnVivo />
          </SinDirigente>
        } />
        <Route path="/" element={
          <SoloGestion>
            <AceptarTerminos>
              <Layout />
            </AceptarTerminos>
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