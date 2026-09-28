import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

const labelClass = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

// Selector encadenado País → Provincia → Cantón.
// value:    { idPais, idProvincia, idCanton } (números o strings vacíos)
// onChange: recibe el objeto completo actualizado.
// Si el país elegido no tiene provincias cargadas (extranjero), provincia y cantón no se piden y quedan vacíos.
export default function UbicacionSelector({ value, onChange }) {
  const { idPais = '', idProvincia = '', idCanton = '' } = value

  const { data: paises = [] } = useQuery({
    queryKey: ['paises'],
    queryFn:  () => api.get('/catalogos/paises').then(r => r.data),
  })
  const { data: provincias = [], isFetched: provinciasListas } = useQuery({
    queryKey: ['provincias', String(idPais)],
    queryFn:  () => api.get(`/catalogos/provincias?paisId=${idPais}`).then(r => r.data),
    enabled:  !!idPais,
  })
  const { data: cantones = [] } = useQuery({
    queryKey: ['cantones', String(idProvincia)],
    queryFn:  () => api.get(`/catalogos/cantones?provinciaId=${idProvincia}`).then(r => r.data),
    enabled:  !!idProvincia,
  })

  const tieneProvincias = !!idPais && provincias.length > 0
  const esExtranjero    = !!idPais && provinciasListas && provincias.length === 0

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>País</label>
        <select className="input-field" value={idPais} required
          onChange={e => onChange({ idPais: e.target.value, idProvincia: '', idCanton: '' })}>
          <option value="">Seleccionar...</option>
          {paises.map(p => <option key={p.idPais} value={p.idPais}>{p.nombre}</option>)}
        </select>
      </div>

      {tieneProvincias && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Provincia</label>
            <select className="input-field" value={idProvincia} required
              onChange={e => onChange({ idPais, idProvincia: e.target.value, idCanton: '' })}>
              <option value="">Seleccionar...</option>
              {provincias.map(p => <option key={p.idProvincia} value={p.idProvincia}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Cantón</label>
            <select className="input-field" value={idCanton} required disabled={!idProvincia}
              onChange={e => onChange({ idPais, idProvincia, idCanton: e.target.value })}>
              <option value="">Seleccionar...</option>
              {cantones.map(c => <option key={c.idCanton} value={c.idCanton}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
      )}

      {esExtranjero && (
        <p className="text-gray-500 text-xs">Otro país: no se requiere provincia ni cantón.</p>
      )}
    </div>
  )
}
