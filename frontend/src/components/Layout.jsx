import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',  icon: '⚡' },
  { to: '/campeonatos', label: 'Campeonatos', icon: '🏆' },
  { to: '/equipos',     label: 'Equipos',     icon: '🛡️' },
  { to: '/jugadores',   label: 'Jugadores',   icon: '👤' },
  { to: '/reportes',     label: 'Reportes',      icon: '📈' },
  { to: '/mantenimiento', label: 'Mantenimiento', icon: '🔧' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800">
          <h1 className="font-display text-3xl text-white tracking-wider">
            LIGA<span className="text-brand-500">MANAGER</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Sistema de Campeonatos</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                 font-medium transition-all duration-150
                 ${isActive
                   ? 'bg-brand-600 text-white'
                   : 'text-gray-400 hover:text-white hover:bg-gray-800'
                 }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{user?.nombre}</p>
              <p className="text-xs text-gray-500">{user?.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors text-xs"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}