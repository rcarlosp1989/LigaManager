import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { mensajeDeError } from '../../feedback/contextos'
import { inicioDeRol } from '../../utils/roles'
import PantallaCuenta from './PantallaCuenta'

// Enlace del correo /confirmar-correo/{código}: activa la cuenta y entra directo.
export default function ConfirmarCorreo() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { iniciarSesion } = useAuth()
  const [error, setError] = useState('')
  const pedido = useRef(false)   // en modo desarrollo React monta dos veces: el enlace es de un solo uso

  useEffect(() => {
    if (pedido.current) return
    pedido.current = true
    api.post('/auth/confirmar-correo', { token })
      .then(({ data }) => { iniciarSesion(data, false); navigate(inicioDeRol(data.rol), { replace: true }) })
      .catch(err => setError(mensajeDeError(err, 'No se pudo confirmar el correo.')))
  }, [token, iniciarSesion, navigate])

  return (
    <PantallaCuenta titulo="Confirmar correo">
      {error ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm text-gray-200">{error}</p>
          <p className="text-sm text-gray-400">Inicie sesión con su correo y contraseña: si la cuenta aún no está confirmada, podrá solicitar otro enlace.</p>
          <Link to="/login" className="btn-primary inline-flex w-full justify-center">Ir a iniciar sesión</Link>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Confirmando su correo...</p>
      )}
    </PantallaCuenta>
  )
}
