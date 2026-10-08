import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Trophy, Shield, Users, TrendingUp, Wrench, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/campeonatos',   label: 'Campeonatos',   icon: Trophy },
  { to: '/equipos',       label: 'Equipos',       icon: Shield },
  { to: '/jugadores',     label: 'Jugadores',     icon: Users },
  { to: '/reportes',      label: 'Reportes',      icon: TrendingUp },
  { to: '/mantenimiento', label: 'Mantenimiento', icon: Wrench },
]

function Logo({ className = '' }) {
  return (
    <span className={`font-display text-white tracking-wider ${className}`}>
      LIGA<span className="text-brand-500">MANAGER</span>
    </span>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  // En pantallas angostas (menos de 1024 px) el menú vive detrás de un botón.
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = () => setMenuAbierto(false)

  useEffect(() => {
    if (!menuAbierto) return
    const alPresionarTecla = (e) => { if (e.key === 'Escape') setMenuAbierto(false) }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [menuAbierto])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-dvh bg-gray-950 overflow-hidden">
      {/* Fondo oscuro detrás del menú abierto (solo pantallas angostas) */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={cerrarMenu} aria-hidden="true" />
      )}

      {/* Sidebar: fijo en pantallas anchas, panel deslizable en las angostas */}
      <aside
        id="menu-principal"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col
                    transition-[transform,visibility] duration-200
                    lg:static lg:translate-x-0 lg:visible
                    ${menuAbierto ? 'translate-x-0 visible' : '-translate-x-full invisible'}`}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800 flex items-start justify-between gap-2">
          <div>
            <h1><Logo className="text-3xl" /></h1>
            <p className="text-xs text-gray-500 mt-0.5">Sistema de Campeonatos</p>
          </div>
          <button
            onClick={cerrarMenu}
            className="lg:hidden -mr-3 -mt-1 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={cerrarMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                 font-medium transition-all duration-150
                 ${isActive
                   ? 'bg-brand-700 text-white'
                   : 'text-gray-400 hover:text-white hover:bg-gray-800'
                 }`
              }
            >
              <item.icon size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
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

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior con el botón de menú (solo pantallas angostas) */}
        <header className="lg:hidden flex items-center gap-2 h-14 shrink-0 px-2 bg-gray-900 border-b border-gray-800">
          <button
            onClick={() => setMenuAbierto(true)}
            className="p-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            aria-controls="menu-principal"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Logo className="text-2xl" />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
