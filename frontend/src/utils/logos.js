import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

// Logos de los equipos del organizador, por id de equipo, para las pantallas cuyos datos no
// traen el logo (tablas de posiciones, reportes). Usa la misma lista que la pantalla Equipos,
// así que no se pide dos veces. Si falla, simplemente se ven las iniciales.
export function useLogosEquipos(activo = true) {
  const { data } = useQuery({
    queryKey: ['equipos'],
    queryFn:  () => api.get('/equipos').then(r => r.data),
    enabled:  activo,
    staleTime: 5 * 60 * 1000,
  })
  const mapa = new Map()
  for (const e of data ?? []) if (e.logoUrl) mapa.set(e.idEquipo, e.logoUrl)
  return mapa
}
