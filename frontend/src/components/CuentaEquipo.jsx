import { useState } from 'react'
import { FileDown, Trash2 } from 'lucide-react'
import { CONCEPTOS, ETIQUETAS, dinero, fechaCorta, nombreMetodo } from '../utils/pagos'

// Estado de cuenta de un equipo en un campeonato: saldo, cobros y abonos.
// Lo usan el organizador (con acciones) y el dirigente (solo lectura: sin props de acciones).
//  - onAbonar(cobro): abonar a ese cobro.        - onEliminarCobro(cobro): solo cobros manuales.
//  - onEliminarAbono(abono).                     - onRecibo(abono): descarga el recibo.

const FILTROS = [
  ['todos', 'Todos', () => true],
  ['saldo', 'Con saldo', (c) => c.saldo > 0],
  ['arbitraje', 'Arbitraje', (c) => c.concepto === 'ARBITRAJE'],
  ['tarjetas', 'Tarjetas', (c) => c.concepto === 'AMARILLA' || c.concepto === 'ROJA'],
  ['multas', 'Multas y apelaciones', (c) => ['MULTA', 'APELACION', 'OTRO'].includes(c.concepto)],
]

export default function CuentaEquipo({ cuenta, onAbonar, onEliminarCobro, onEliminarAbono, onRecibo }) {
  const [filtro, setFiltro] = useState('todos')
  const cumple = FILTROS.find(([k]) => k === filtro)[2]
  const cobros = cuenta.cobros.filter(cumple)

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Saldo pendiente</p>
          <p className={`text-3xl font-bold tabular-nums ${cuenta.saldo > 0 ? 'text-amber-300' : 'text-brand-300'}`}>
            {cuenta.saldo > 0 ? dinero(cuenta.saldo) : 'Al día'}
          </p>
        </div>
        <p className="text-sm text-gray-400 tabular-nums">Cobrado {dinero(cuenta.total)} · pagado {dinero(cuenta.pagado)}</p>
      </div>

      <section className="space-y-2" aria-label="Cobros">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar cobros">
          {FILTROS.map(([k, texto]) => (
            <button key={k} type="button" onClick={() => setFiltro(k)} aria-pressed={filtro === k}
              className={`rounded-full border px-3 py-1.5 text-sm ${filtro === k ? 'border-brand-400 bg-brand-400 text-gray-950 font-semibold' : 'border-gray-700 text-gray-300 hover:border-gray-500'}`}>
              {texto}
            </button>
          ))}
        </div>
        {cobros.length === 0 ? (
          <p className="card text-sm text-gray-400">{cuenta.cobros.length === 0 ? 'Todavía no hay cobros para este equipo.' : 'No hay cobros con este filtro.'}</p>
        ) : (
          <ul className="card !p-0 divide-y divide-gray-800">
            {cobros.map(c => {
              const [etiqueta, color] = ETIQUETAS[c.concepto] ?? ETIQUETAS.OTRO
              return (
                <li key={c.idPago} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${color}`} title={CONCEPTOS[c.concepto]}>{etiqueta}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium">{c.conceptoNombre}</p>
                    {c.descripcion && <p className="text-sm text-gray-400 break-words">{c.descripcion}</p>}
                    <p className="text-xs text-gray-500">{fechaCorta(c.fecha)}{c.automatico ? ' · automático' : ''}</p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-white">{dinero(c.monto)}</p>
                    {c.saldo > 0
                      ? <p className="text-xs font-semibold text-amber-300">{c.abonado > 0 ? `Saldo ${dinero(c.saldo)}` : 'Pendiente'}</p>
                      : <p className="text-xs font-semibold text-brand-300">Pagado</p>}
                    {(onAbonar || onEliminarCobro) && (
                      <div className="mt-1 flex justify-end gap-3">
                        {onAbonar && c.saldo > 0 && (
                          <button type="button" className="text-xs text-brand-300 hover:text-brand-200 py-1" onClick={() => onAbonar(c)}>Abonar</button>
                        )}
                        {onEliminarCobro && !c.automatico && c.abonado === 0 && (
                          <button type="button" className="text-gray-500 hover:text-red-400 p-1" onClick={() => onEliminarCobro(c)} aria-label={`Eliminar cobro ${c.conceptoNombre}`}>
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-label="Abonos recibidos">
        <h3 className="text-sm font-semibold text-white">Abonos recibidos</h3>
        {cuenta.abonos.length === 0 ? (
          <p className="card text-sm text-gray-400">Todavía no hay abonos.</p>
        ) : (
          <ul className="card !p-0 divide-y divide-gray-800">
            {cuenta.abonos.map(a => (
              <li key={a.lote} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white">{fechaCorta(a.fecha)} · {nombreMetodo(a.metodo)}{a.referencia ? ` · ${a.referencia}` : ''}</p>
                  <p className="text-xs text-gray-500 break-words">{a.cobros.join('; ')}</p>
                </div>
                <p className="shrink-0 font-semibold text-brand-300 tabular-nums">{dinero(a.monto)}</p>
                {(onRecibo || onEliminarAbono) && (
                  <div className="flex shrink-0 gap-1">
                    {onRecibo && (
                      <button type="button" className="text-gray-400 hover:text-white p-1" onClick={() => onRecibo(a)} aria-label="Descargar recibo" title="Recibo PDF">
                        <FileDown size={16} aria-hidden="true" />
                      </button>
                    )}
                    {onEliminarAbono && (
                      <button type="button" className="text-gray-500 hover:text-red-400 p-1" onClick={() => onEliminarAbono(a)} aria-label="Eliminar abono" title="Eliminar abono">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
