import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Info, Wallet, X } from 'lucide-react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import EstadoError from '../../components/EstadoError'
import LogoEquipo from '../../components/LogoEquipo'
import TablaDesplazable from '../../components/TablaDesplazable'
import CuentaEquipo from '../../components/CuentaEquipo'
import { useAviso, useDialogos, mensajeDeError } from '../../feedback/contextos'
import { METODOS, dinero, generarRecibo, hoyEcuador, leerMonto, montoEnCampo } from '../../utils/pagos'

// Pestaña «Pagos» del organizador: valores del campeonato, resumen por equipo, estado de cuenta,
// cobros manuales (multas, apelaciones, otros) y abonos. Inscripción, refuerzos, arbitraje y
// tarjetas los genera el servidor al consultar.

const etiqueta = 'block text-xs text-gray-400 uppercase tracking-wider mb-1.5'

export default function TabPagos({ camp }) {
  const aviso = useAviso()
  const [valores, setValores] = useState(false)
  const [cobro, setCobro] = useState(false)
  const [equipo, setEquipo] = useState(null)
  const clave = ['pagos', camp.idCampeonato]
  const q = useQuery({ queryKey: clave, queryFn: () => api.get(`/campeonatos/${camp.idCampeonato}/pagos`).then(r => r.data) })

  if (q.isLoading) return <p className="text-sm text-gray-500">Cargando...</p>
  if (q.isError) return <EstadoError compacto mensaje="No se pudieron cargar los pagos." onReintentar={q.refetch} reintentando={q.isFetching} />
  const datos = q.data
  const conSaldo = datos.equipos.filter(e => e.saldo > 0).length
  const modalValores = (
    <Modal isOpen={valores} onClose={() => setValores(false)} title="VALORES DEL CAMPEONATO" maxWidth="max-w-2xl">
      <FormValores camp={camp} valores={datos.valores} onGuardado={() => { setValores(false); q.refetch(); aviso.exito('Valores guardados.') }} onCancelar={() => setValores(false)} />
    </Modal>
  )

  if (!datos.valores.configurados) {
    return (
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <Wallet size={22} className="text-brand-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-white font-semibold">Pagos del campeonato</h2>
            <p className="text-sm text-gray-400">Configure cuánto cobra la liga: inscripción, refuerzos, apelación, arbitraje y tarjetas. Después la inscripción, el arbitraje y las tarjetas se cargan solos a cada equipo.</p>
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={() => setValores(true)}>Configurar valores</button>
        {modalValores}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secundario" onClick={() => setValores(true)}>Valores del campeonato</button>
        <button type="button" className="btn-primary" onClick={() => setCobro(true)} disabled={datos.equipos.length === 0}>+ Cobro manual</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Total titulo="Total cobrado" valor={dinero(datos.total)} nota="Inscripciones, refuerzos, arbitraje, tarjetas, multas y apelaciones" />
        <Total titulo="Pagado" valor={dinero(datos.pagado)} nota="Suma de abonos registrados" color="text-brand-300" />
        <Total titulo="Pendiente" valor={dinero(datos.saldo)} nota={conSaldo === 1 ? '1 equipo con saldo' : `${conSaldo} equipos con saldo`} color="text-amber-300" />
      </div>

      {datos.equipos.length === 0 ? (
        <p className="card text-sm text-gray-400">Inscriba equipos en el campeonato para ver sus pagos.</p>
      ) : (
        <div className="card !p-0 overflow-hidden">
        <TablaDesplazable>
          <table className="tabla w-full min-w-[920px] text-sm tabular-nums">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                <th scope="col" className="fija fija-borde px-4 py-3 text-left font-medium">Equipo</th>
                {['Inscripción', 'Refuerzos', 'Arbitraje', 'Tarjetas', 'Multas y apel.', 'Total', 'Pagado', 'Saldo'].map(t => (
                  <th key={t} scope="col" className="px-3 py-3 text-right font-medium whitespace-nowrap">{t}</th>
                ))}
                <th scope="col"><span className="sr-only">Ver cuenta</span></th>
              </tr>
            </thead>
            <tbody>
              {datos.equipos.map(e => (
                <tr key={e.idEquipo} className="border-b border-gray-800/50 last:border-0 cursor-pointer" onClick={() => setEquipo(e)}>
                  <th scope="row" className="fija fija-borde px-4 py-2.5 text-left font-semibold text-white">
                    <button type="button" className="flex items-center gap-2 text-left" onClick={(ev) => { ev.stopPropagation(); setEquipo(e) }}>
                      <LogoEquipo nombre={e.nombre} logoUrl={e.logoUrl} tamano={26} />
                      <span className="max-w-[8.5rem] sm:max-w-[14rem] truncate">{e.nombre}</span>
                    </button>
                  </th>
                  {[e.inscripcion, e.refuerzos, e.arbitraje, e.tarjetas, e.multas].map((v, i) => (
                    <td key={i} className="px-3 py-2.5 text-right text-gray-300 whitespace-nowrap">{v ? dinero(v) : '—'}</td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-semibold text-white whitespace-nowrap">{dinero(e.total)}</td>
                  <td className="px-3 py-2.5 text-right text-brand-300 whitespace-nowrap">{dinero(e.pagado)}</td>
                  <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${e.saldo > 0 ? 'text-amber-300' : 'text-brand-300'}`}>{e.saldo > 0 ? dinero(e.saldo) : 'Al día'}</td>
                  <td className="pr-3 text-gray-600"><ChevronRight size={16} aria-hidden="true" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablaDesplazable>
        </div>
      )}
      <p className="flex gap-2 text-sm text-gray-400">
        <Info size={16} className="shrink-0 mt-0.5 text-brand-400" aria-hidden="true" />
        Toque un equipo para ver su estado de cuenta y registrar abonos. El arbitraje y las tarjetas se cargan al cerrar cada partido; los refuerzos, al inscribir jugadores desde el inicio de la segunda etapa.
      </p>

      {modalValores}
      <Modal isOpen={cobro} onClose={() => setCobro(false)} title="COBRO MANUAL" maxWidth="max-w-lg">
        <FormCobro camp={camp} datos={datos} onGuardado={() => { setCobro(false); q.refetch(); aviso.exito('Cobro registrado.') }} onCancelar={() => setCobro(false)} />
      </Modal>
      <Modal isOpen={!!equipo} onClose={() => { setEquipo(null); q.refetch() }} title={equipo ? equipo.nombre.toUpperCase() : ''} maxWidth="max-w-3xl" hayCambios={false}>
        {equipo && <CuentaOrganizador camp={camp} idEquipo={equipo.idEquipo} />}
      </Modal>
    </div>
  )
}

function Total({ titulo, valor, nota, color = 'text-white' }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-gray-500">{titulo}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{valor}</p>
      <p className="text-xs text-gray-500">{nota}</p>
    </div>
  )
}

// ── Valores del campeonato ───────────────────────────────────────────────────

const CAMPOS_VALORES = [
  ['inscripcion', 'Inscripción del equipo', 'Valor único por equipo; cubre a sus jugadores.'],
  ['refuerzo', 'Por refuerzo', 'Jugador inscrito desde el inicio de la segunda etapa.'],
  ['apelacion', 'Apelación', 'Derecho a apelar. Valor sugerido al registrarla; se puede cambiar.'],
  ['arbitraje', 'Arbitraje (cada equipo)', 'Se carga a ambos equipos al cerrar cada partido.'],
  ['amarilla', 'Tarjeta amarilla', 'Por cada amarilla registrada.'],
  ['roja', 'Tarjeta roja', 'Roja directa o por doble amarilla (sus dos amarillas no se cobran aparte).'],
]

function FormValores({ camp, valores, onGuardado, onCancelar }) {
  const fid = useId()
  const aviso = useAviso()
  const [campos, setCampos] = useState(() => Object.fromEntries(CAMPOS_VALORES.map(([k]) => [k, montoEnCampo(valores[k])])))
  const [inicio, setInicio] = useState(valores.inicioSegundaEtapa ?? '')
  const guardar = useMutation({
    mutationFn: (cuerpo) => api.put(`/campeonatos/${camp.idCampeonato}/pagos/valores`, cuerpo).then(r => r.data),
    onSuccess: onGuardado,
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudieron guardar los valores.')),
  })
  const enviar = (e) => {
    e.preventDefault()
    const cuerpo = { inicioSegundaEtapa: inicio || null }
    for (const [k, nombre] of CAMPOS_VALORES) {
      const n = campos[k].trim() === '' ? 0 : leerMonto(campos[k])
      if (Number.isNaN(n)) { aviso.error(`Revise el valor de «${nombre}».`); return }
      cuerpo[k] = n
    }
    guardar.mutate(cuerpo)
  }

  return (
    <form className="space-y-5" onSubmit={enviar}>
      <p className="text-sm text-gray-400">Deje vacío lo que su liga no cobra. Los cambios no alteran los cobros ya generados.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS_VALORES.map(([k, nombre, ayuda]) => (
          <div key={k}>
            <label htmlFor={`${fid}-${k}`} className={etiqueta}>{nombre}</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input id={`${fid}-${k}`} className="input-field pl-7 text-right tabular-nums" inputMode="decimal" placeholder="0,00"
                value={campos[k]} onChange={e => setCampos(c => ({ ...c, [k]: e.target.value }))} aria-describedby={`${fid}-${k}-ayuda`} />
            </div>
            <p id={`${fid}-${k}-ayuda`} className="mt-1 text-xs text-gray-500">{ayuda}</p>
          </div>
        ))}
      </div>
      <div>
        <label htmlFor={`${fid}-inicio`} className={etiqueta}>Inicio de la segunda etapa (refuerzos)</label>
        <input id={`${fid}-inicio`} type="date" className="input-field sm:max-w-xs" value={inicio} onChange={e => setInicio(e.target.value)} aria-describedby={`${fid}-inicio-ayuda`} />
        <p id={`${fid}-inicio-ayuda`} className="mt-1 text-xs text-gray-500">Los jugadores inscritos desde esta fecha se cobran como refuerzo; los de antes no generan cobro. Déjela vacía hasta que empiece la segunda etapa.</p>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando...' : 'Guardar valores'}</button>
      </div>
    </form>
  )
}

// ── Cobro manual: multa, apelación u otro ────────────────────────────────────

const TIPOS_COBRO = [
  ['MULTA', 'Multa', 'Sanción económica (comité, indisciplina, etc.).'],
  ['APELACION', 'Apelación', 'Derecho a apelar; se cobra se gane o se pierda.'],
  ['OTRO', 'Otro', 'Cualquier otro cobro al equipo.'],
]

function FormCobro({ camp, datos, onGuardado, onCancelar, idEquipo }) {
  const fid = useId()
  const aviso = useAviso()
  const [equipo, setEquipo] = useState(idEquipo ? String(idEquipo) : '')
  const [tipo, setTipo] = useState('MULTA')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyEcuador())
  const [detalle, setDetalle] = useState('')
  const guardar = useMutation({
    mutationFn: (cuerpo) => api.post(`/campeonatos/${camp.idCampeonato}/pagos/cobros`, cuerpo).then(r => r.data),
    onSuccess: onGuardado,
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo registrar el cobro.')),
  })
  const elegirTipo = (t) => {
    setTipo(t)
    if (t === 'APELACION' && monto === '' && datos.valores.apelacion > 0) setMonto(montoEnCampo(datos.valores.apelacion))
  }
  const enviar = (e) => {
    e.preventDefault()
    if (!equipo) { aviso.error('Elija el equipo.'); return }
    const n = leerMonto(monto)
    if (Number.isNaN(n) || n <= 0) { aviso.error('Indique un valor mayor a 0.'); return }
    if (tipo !== 'APELACION' && !detalle.trim()) { aviso.error('Indique el motivo del cobro.'); return }
    guardar.mutate({ idEquipo: Number(equipo), concepto: tipo, monto: n, fecha, descripcion: detalle.trim() || null })
  }

  return (
    <form className="space-y-4" onSubmit={enviar}>
      {!idEquipo && (
        <div>
          <label htmlFor={`${fid}-eq`} className={etiqueta}>Equipo</label>
          <select id={`${fid}-eq`} className="input-field" value={equipo} onChange={e => setEquipo(e.target.value)}>
            <option value="">Elija un equipo</option>
            {datos.equipos.map(e => <option key={e.idEquipo} value={e.idEquipo}>{e.nombre}</option>)}
          </select>
        </div>
      )}
      <fieldset>
        <legend className={etiqueta}>Tipo de cobro</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TIPOS_COBRO.map(([k, nombre, texto]) => (
            <label key={k} className={`flex items-start gap-2 rounded-lg border p-3 ${tipo === k ? 'border-brand-400/60 bg-brand-400/5' : 'border-gray-800'}`}>
              <input type="radio" name={`${fid}-tipo`} checked={tipo === k} onChange={() => elegirTipo(k)} className="mt-1 accent-brand-500" />
              <span><span className="block font-semibold text-white">{nombre}</span><span className="text-xs text-gray-400">{texto}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${fid}-monto`} className={etiqueta}>Valor</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input id={`${fid}-monto`} className="input-field pl-7 text-right tabular-nums" inputMode="decimal" placeholder="0,00" value={monto} onChange={e => setMonto(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor={`${fid}-fecha`} className={etiqueta}>Fecha</label>
          <input id={`${fid}-fecha`} type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} required />
        </div>
      </div>
      <div>
        <label htmlFor={`${fid}-detalle`} className={etiqueta}>{tipo === 'APELACION' ? 'Qué se apela (opcional)' : 'Motivo'}</label>
        <input id={`${fid}-detalle`} className="input-field" maxLength={200} value={detalle} onChange={e => setDetalle(e.target.value)}
          placeholder={tipo === 'APELACION' ? 'Ej.: roja de Pedro Alvia, jornada 2' : 'Ej.: indisciplina de la barra, jornada 2'} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando...' : 'Registrar cobro'}</button>
      </div>
    </form>
  )
}

// ── Estado de cuenta (organizador) ───────────────────────────────────────────

function CuentaOrganizador({ camp, idEquipo }) {
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const [destino, setDestino] = useState(null)
  const clave = ['pagos-cuenta', camp.idCampeonato, idEquipo]
  const base = `/campeonatos/${camp.idCampeonato}/pagos`
  const q = useQuery({ queryKey: clave, queryFn: () => api.get(`${base}/equipos/${idEquipo}`).then(r => r.data) })
  const actualizar = (d) => { queryClient.setQueryData(clave, d); queryClient.invalidateQueries({ queryKey: ['pagos', camp.idCampeonato] }) }

  const eliminarCobro = useMutation({
    mutationFn: (c) => api.delete(`${base}/cobros/${c.idPago}`).then(r => r.data),
    onSuccess: (d) => { actualizar(d); aviso.exito('Cobro eliminado.') },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo eliminar el cobro.')),
  })
  const eliminarAbono = useMutation({
    mutationFn: (a) => api.delete(`${base}/abonos/${a.lote}`).then(r => r.data),
    onSuccess: (d) => { actualizar(d); aviso.exito('Abono eliminado.') },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo eliminar el abono.')),
  })

  if (q.isLoading) return <p className="text-sm text-gray-500">Cargando...</p>
  if (q.isError) return <EstadoError compacto mensaje="No se pudo cargar el estado de cuenta." onReintentar={q.refetch} reintentando={q.isFetching} />
  const cuenta = q.data

  return (
    <div className="space-y-4">
      {cuenta.saldo > 0 && (
        <FormAbono key={`${destino?.idPago ?? 'todos'}-${cuenta.saldo}`} camp={camp} cuenta={cuenta} destino={destino} onQuitarDestino={() => setDestino(null)}
          onGuardado={(d) => { actualizar(d); setDestino(null); aviso.exito('Abono registrado.') }} />
      )}
      <CuentaEquipo cuenta={cuenta}
        onAbonar={(c) => setDestino(c)}
        onEliminarCobro={async (c) => { if (await confirmar({ titulo: '¿Eliminar el cobro?', mensaje: `${c.conceptoNombre}${c.descripcion ? ` · ${c.descripcion}` : ''} (${dinero(c.monto)}).`, textoConfirmar: 'Eliminar', peligro: true })) eliminarCobro.mutate(c) }}
        onEliminarAbono={async (a) => { if (await confirmar({ titulo: '¿Eliminar el abono?', mensaje: `${dinero(a.monto)} del ${a.fecha}. Los cobros a los que se aplicó vuelven a quedar con saldo.`, textoConfirmar: 'Eliminar', peligro: true })) eliminarAbono.mutate(a) }}
        onRecibo={(a) => generarRecibo({ campeonato: cuenta.campeonato, equipo: cuenta.equipo, abono: a, saldo: cuenta.saldo }).save(`recibo-${a.fecha}-${a.lote.slice(0, 6)}.pdf`)} />
    </div>
  )
}

function FormAbono({ camp, cuenta, destino, onQuitarDestino, onGuardado }) {
  const fid = useId()
  const aviso = useAviso()
  const maximo = destino ? destino.saldo : cuenta.saldo
  const [monto, setMonto] = useState(montoEnCampo(maximo))
  const [fecha, setFecha] = useState(hoyEcuador())
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [referencia, setReferencia] = useState('')
  const guardar = useMutation({
    mutationFn: (cuerpo) => api.post(`/campeonatos/${camp.idCampeonato}/pagos/equipos/${cuenta.idEquipo}/abonos`, cuerpo).then(r => r.data),
    onSuccess: onGuardado,
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo registrar el abono.')),
  })
  const enviar = (e) => {
    e.preventDefault()
    const n = leerMonto(monto)
    if (Number.isNaN(n) || n <= 0) { aviso.error('Indique un monto mayor a 0.'); return }
    if (n > maximo) { aviso.error(`El monto supera el saldo pendiente (${dinero(maximo)}).`); return }
    guardar.mutate({ monto: n, fecha, metodo, referencia: referencia.trim() || null, idPago: destino?.idPago ?? null })
  }

  return (
    <form className="card space-y-3 border-brand-400/40" onSubmit={enviar}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-white">Registrar abono</h3>
        {destino ? (
          <span className="flex items-center gap-1 rounded-full bg-brand-400/10 px-3 py-1 text-xs text-brand-200">
            A: {destino.conceptoNombre}{destino.descripcion ? ` · ${destino.descripcion}` : ''}
            <button type="button" onClick={onQuitarDestino} className="p-0.5 hover:text-white" aria-label="Repartir entre todos los cobros"><X size={14} aria-hidden="true" /></button>
          </span>
        ) : (
          <span className="text-xs text-gray-500">Se aplica a los cobros más antiguos primero.</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label htmlFor={`${fid}-monto`} className={etiqueta}>Monto</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input id={`${fid}-monto`} className="input-field pl-7 text-right tabular-nums" inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor={`${fid}-fecha`} className={etiqueta}>Fecha</label>
          <input id={`${fid}-fecha`} type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} required />
        </div>
        <div>
          <label htmlFor={`${fid}-metodo`} className={etiqueta}>Método</label>
          <select id={`${fid}-metodo`} className="input-field" value={metodo} onChange={e => setMetodo(e.target.value)}>
            {METODOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${fid}-ref`} className={etiqueta}>Referencia</label>
          <input id={`${fid}-ref`} className="input-field" maxLength={100} placeholder="Opcional" value={referencia} onChange={e => setReferencia(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando...' : 'Guardar abono'}</button>
      </div>
    </form>
  )
}
