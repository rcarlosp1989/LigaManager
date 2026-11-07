import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitFork, Info } from 'lucide-react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import EstadoError from '../../components/EstadoError'
import CampoFechaHora from '../../components/CampoFechaHora'
import CuadroLlaves from '../../components/CuadroLlaves'
import { useAviso, useDialogos, mensajeDeError } from '../../feedback/contextos'
import { fechaHoraCompleta } from '../../utils/fechas'

// Pestaña «Llaves» del organizador: configura la fase eliminatoria, arma cada ronda a mano
// (modo manual) y muestra el cuadro. El modo automático queda para más adelante.

const NOMBRES_RONDA = {
  OCTAVOS: 'Octavos de final', CUARTOS: 'Cuartos de final', SEMIFINAL: 'Semifinal',
  TERCER_PUESTO: 'Tercer puesto', FINAL: 'Final',
}
const DESEMPATES = [
  ['PENALES', 'Penales'],
  ['PRORROGA_PENALES', 'Prórroga y penales'],
  ['MEJOR_UBICADO', 'Clasifica el mejor ubicado'],
]
const REGLAS_TARJETAS = [
  ['BORRAR_SALVO_EXPULSION_FINAL', 'Borrar, salvo expulsión al final', 'Las amarillas se borran. Solo pasa la suspensión de quien fue expulsado en la última fecha de la fase regular.'],
  ['MANTENER', 'Mantener todo', 'Las amarillas siguen acumulando y toda suspensión pendiente se cumple.'],
  ['BORRAR_TODO', 'Borrar todo', 'Todos empiezan limpios: sin amarillas ni suspensiones pendientes.'],
]
const LLAVES_POR_CLASIFICADOS = { 2: 'la final', 4: 'semifinal', 8: 'cuartos de final', 16: 'octavos de final' }

function rondasDe(n, tercer) {
  const l = []
  if (n >= 16) l.push('OCTAVOS')
  if (n >= 8) l.push('CUARTOS')
  if (n >= 4) l.push('SEMIFINAL')
  if (n >= 4 && tercer) l.push('TERCER_PUESTO')
  l.push('FINAL')
  return l
}

export default function TabLlaves({ camp }) {
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const clave = ['eliminatoria', camp.idCampeonato]
  const base = `/campeonatos/${camp.idCampeonato}/eliminatoria`
  const [config, setConfig] = useState(false)
  const [armar, setArmar] = useState(null)

  const q = useQuery({ queryKey: clave, queryFn: () => api.get(base).then(r => r.data) })
  const actualizar = (datos) => {
    queryClient.setQueryData(clave, datos)
    queryClient.invalidateQueries({ queryKey: ['jornadas', String(camp.idCampeonato)] })
    queryClient.invalidateQueries({ queryKey: ['jornadas', camp.idCampeonato] })
  }

  const quitarFase = useMutation({
    mutationFn: () => api.delete(base),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: clave }); aviso.exito('Fase eliminatoria quitada.') },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo quitar la fase.')),
  })
  const eliminarRonda = useMutation({
    mutationFn: (tipo) => api.delete(`${base}/rondas/${tipo}`).then(r => r.data),
    onSuccess: (d) => { actualizar(d); aviso.exito('Ronda eliminada.') },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo eliminar la ronda.')),
  })

  if (q.isLoading) return <p className="text-sm text-gray-500">Cargando...</p>
  if (q.isError) return <EstadoError compacto mensaje="No se pudo cargar la fase eliminatoria." onReintentar={q.refetch} reintentando={q.isFetching} />
  const datos = q.data

  if (!datos.configurada) {
    return (
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <GitFork size={22} className="text-brand-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-white font-semibold">Fase eliminatoria</h2>
            <p className="text-sm text-gray-400">Configure cuántos clasifican, cómo se juega cada ronda y cómo se define un empate. Después arma los cruces con los equipos que usted elija.</p>
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={() => setConfig(true)}>Configurar fase eliminatoria</button>
        <Modal isOpen={config} onClose={() => setConfig(false)} title="FASE ELIMINATORIA" maxWidth="max-w-2xl">
          <FormConfig camp={camp} datos={datos} onGuardado={(d) => { actualizar(d); setConfig(false); aviso.exito('Fase eliminatoria configurada.') }} onCancelar={() => setConfig(false)} />
        </Modal>
      </div>
    )
  }

  const hayCreada = datos.rondas.some(r => r.creada)
  const primera = datos.rondas[0]
  const regla = REGLAS_TARJETAS.find(([k]) => k === datos.reglaTarjetas)?.[1]

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-xs uppercase tracking-wider text-gray-500">Clasifican</dt><dd className="text-white">{datos.equiposClasifican} equipos · desde {LLAVES_POR_CLASIFICADOS[datos.equiposClasifican]}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-gray-500">Tercer puesto</dt><dd className="text-white">{datos.tercerPuesto ? 'Sí' : 'No'}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-gray-500">Tarjetas al empezar</dt><dd className="text-white">{regla}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-gray-500">Modo</dt><dd className="text-white">Manual</dd></div>
        </dl>
        <div className="flex gap-2 sm:ml-auto">
          <button type="button" className="btn-secundario text-sm" onClick={() => setConfig(true)}>Editar reglas</button>
          {!hayCreada && (
            <button type="button" className="btn-secundario text-sm" disabled={quitarFase.isPending}
              onClick={async () => { if (await confirmar({ titulo: '¿Quitar la fase eliminatoria?', mensaje: 'Se borra su configuración. Puede volver a configurarla cuando quiera.', textoConfirmar: 'Quitar', peligro: true })) quitarFase.mutate() }}>
              Quitar fase
            </button>
          )}
        </div>
      </div>

      {!primera.creada && (
        <div className="card space-y-3">
          <h2 className="text-white font-semibold">Arme {primera.nombre.toLowerCase()}</h2>
          <p className="text-sm text-gray-400">Marque los {datos.equiposClasifican} clasificados de la tabla y elija los cruces. Se crean las jornadas con sus partidos; la fecha, la hora y el estadio de cada partido se ajustan después en Jornadas.</p>
          <button type="button" className="btn-primary" onClick={() => setArmar(primera)}>Elegir clasificados y cruces</button>
        </div>
      )}

      <CuadroLlaves datos={datos}
        accionesLlave={(l, r) => (l.estado === 'FALTAN_PENALES' || (l.detalle ?? '').includes('penales')) && r.desempate !== 'MEJOR_UBICADO'
          ? <Penales llave={l} onGuardado={actualizar} /> : null}
        accionesRonda={(r) => (
          <div className="flex flex-wrap gap-2">
            {r.puedeEliminarse && (
              <button type="button" className="text-sm text-gray-400 hover:text-red-400 py-1" disabled={eliminarRonda.isPending}
                onClick={async () => { if (await confirmar({ titulo: `¿Eliminar ${r.nombre.toLowerCase()}?`, mensaje: 'Se borran sus llaves, partidos y jornadas. Solo se puede porque ningún partido empezó.', textoConfirmar: 'Eliminar', peligro: true })) eliminarRonda.mutate(r.tipo) }}>
                Eliminar {r.nombre.toLowerCase()}
              </button>
            )}
          </div>
        )} />

      {datos.rondas.filter(r => r.puedeCrearse && r.tipo !== primera.tipo).map(r => (
        <div key={r.tipo} className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-300">Ya están los equipos de <strong className="text-white">{r.nombre.toLowerCase()}</strong>.</p>
          <button type="button" className="btn-primary" onClick={() => setArmar(r)}>Armar {r.nombre.toLowerCase()}</button>
        </div>
      ))}

      <Modal isOpen={config} onClose={() => setConfig(false)} title="FASE ELIMINATORIA" maxWidth="max-w-2xl">
        <FormConfig camp={camp} datos={datos} onGuardado={(d) => { actualizar(d); setConfig(false); aviso.exito('Reglas guardadas.') }} onCancelar={() => setConfig(false)} />
      </Modal>
      <Modal isOpen={!!armar} onClose={() => setArmar(null)} title={armar ? armar.nombre.toUpperCase() : ''} maxWidth="max-w-2xl">
        {armar && <ArmarRonda camp={camp} datos={datos} ronda={armar} onGuardado={(d) => { actualizar(d); setArmar(null); aviso.exito(`${armar.nombre} armada.`) }} onCancelar={() => setArmar(null)} />}
      </Modal>
    </div>
  )
}

// ── Configuración (pantalla 1) ───────────────────────────────────────────────

function FormConfig({ camp, datos, onGuardado, onCancelar }) {
  const fid = useId()
  const aviso = useAviso()
  const creadas = new Set((datos.rondas ?? []).filter(r => r.creada).map(r => r.tipo))
  const inscritos = camp.equipos?.length ?? 0
  const [n, setN] = useState(datos.configurada ? datos.equiposClasifican : ([8, 4, 2].find(x => x <= inscritos) ?? 2))
  const [tercer, setTercer] = useState(datos.configurada ? datos.tercerPuesto : false)
  const [regla, setRegla] = useState(datos.reglaTarjetas || 'BORRAR_SALVO_EXPULSION_FINAL')
  const [reglas, setReglas] = useState(() => Object.fromEntries((datos.rondas ?? []).map(r => [r.tipo, { idaYVuelta: r.idaYVuelta, desempate: r.desempate, golVisitante: r.golVisitante }])))
  const tipos = rondasDe(n, tercer)
  const regRonda = (t) => reglas[t] ?? { idaYVuelta: !['FINAL', 'TERCER_PUESTO'].includes(t), desempate: 'PENALES', golVisitante: false }
  const setRonda = (t, cambio) => setReglas(r => ({ ...r, [t]: { ...regRonda(t), ...cambio } }))

  const guardar = useMutation({
    mutationFn: () => api.put(`/campeonatos/${camp.idCampeonato}/eliminatoria`, {
      equiposClasifican: n, tercerPuesto: tercer, reglaTarjetas: regla,
      rondas: tipos.map(t => ({ tipo: t, ...regRonda(t), golVisitante: regRonda(t).idaYVuelta && regRonda(t).golVisitante })),
    }).then(r => r.data),
    onSuccess: onGuardado,
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo guardar.')),
  })

  return (
    <form className="space-y-5" onSubmit={e => { e.preventDefault(); guardar.mutate() }}>
      <fieldset className="space-y-2">
        <legend className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Cómo se arman las llaves</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-lg border border-brand-400/60 bg-brand-400/5 p-3">
            <input type="radio" name={`${fid}-modo`} checked readOnly className="mt-1 accent-brand-500" />
            <span><span className="block font-semibold text-white">Manual</span><span className="text-sm text-gray-400">Usted elige los clasificados y arma cada cruce.</span></span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-gray-800 p-3 opacity-60">
            <input type="radio" name={`${fid}-modo`} disabled className="mt-1" />
            <span><span className="block font-semibold text-white">Automático</span><span className="text-sm text-gray-400">Próximamente: cruces según la tabla.</span></span>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${fid}-n`} className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Equipos que clasifican</label>
          <select id={`${fid}-n`} className="input-field" value={n} disabled={creadas.size > 0} onChange={e => setN(Number(e.target.value))}>
            {[2, 4, 8, 16].map(x => <option key={x} value={x} disabled={x > inscritos}>{x} equipos · empieza en {LLAVES_POR_CLASIFICADOS[x]}</option>)}
          </select>
          {creadas.size > 0 && <p className="mt-1 text-xs text-gray-500">Ya hay llaves armadas: no se puede cambiar.</p>}
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={tercer && n >= 4} disabled={n < 4 || creadas.has('TERCER_PUESTO')} onChange={e => setTercer(e.target.checked)} />
          Partido por el tercer puesto
        </label>
      </div>

      <fieldset>
        <legend className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Reglas por ronda</legend>
        <div className="space-y-3">
          {tipos.map(t => {
            const r = regRonda(t)
            return (
              <div key={t} className="rounded-lg border border-gray-800 p-3 space-y-2">
                <p className="font-semibold text-white">{NOMBRES_RONDA[t]}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="block text-xs text-gray-500 mb-1">Se juega a</span>
                    <select className="input-field" value={r.idaYVuelta ? 'IV' : 'U'} disabled={creadas.has(t)}
                      onChange={e => setRonda(t, { idaYVuelta: e.target.value === 'IV' })} aria-label={`Formato de ${NOMBRES_RONDA[t]}`}>
                      <option value="U">Partido único</option>
                      <option value="IV">Ida y vuelta</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs text-gray-500 mb-1">Si la llave empata</span>
                    <select className="input-field" value={r.desempate} onChange={e => setRonda(t, { desempate: e.target.value })} aria-label={`Desempate de ${NOMBRES_RONDA[t]}`}>
                      {DESEMPATES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </label>
                </div>
                {r.idaYVuelta && (
                  <label className="flex items-center gap-2 text-sm text-gray-200">
                    <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={r.golVisitante} onChange={e => setRonda(t, { golVisitante: e.target.checked })} />
                    Gol de visitante (se aplica antes del criterio de empate)
                  </label>
                )}
              </div>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Tarjetas y suspensiones al empezar la fase</legend>
        <div className="space-y-2">
          {REGLAS_TARJETAS.map(([k, titulo, texto]) => (
            <label key={k} className={`flex items-start gap-2 rounded-lg border p-3 ${regla === k ? 'border-brand-400/60 bg-brand-400/5' : 'border-gray-800'}`}>
              <input type="radio" name={`${fid}-tarjetas`} value={k} checked={regla === k} onChange={() => setRegla(k)} className="mt-1 accent-brand-500" />
              <span><span className="block font-semibold text-white">{titulo}</span><span className="text-sm text-gray-400">{texto}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="flex gap-2 text-sm text-gray-400"><Info size={16} className="shrink-0 mt-0.5 text-brand-400" aria-hidden="true" />La tabla de posiciones solo cuenta la fase regular. Los goles de la fase eliminatoria suman en goleadores.</p>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  )
}

// ── Armar una ronda (pantalla 2) ─────────────────────────────────────────────

function ArmarRonda({ camp, datos, ronda, onGuardado, onCancelar }) {
  const fid = useId()
  const aviso = useAviso()
  const esPrimera = ronda.candidatos.length === 0
  const total = ronda.totalLlaves
  const qTabla = useQuery({
    queryKey: ['posiciones-campeonato', camp.idCampeonato],
    queryFn: () => api.get(`/campeonatos/${camp.idCampeonato}/posiciones`).then(r => r.data),
    enabled: esPrimera,
  })
  const tabla = qTabla.data ?? []
  const [marcados, setMarcados] = useState(null)
  const elegidos = esPrimera
    ? (marcados ?? tabla.slice(0, datos.equiposClasifican).map(t => t.idEquipo))
    : ronda.candidatos.map(c => c.idEquipo)
  const nombre = (id) => (esPrimera ? tabla.find(t => t.idEquipo === id)?.equipo : ronda.candidatos.find(c => c.idEquipo === id)?.nombre) ?? ''
  const [llaves, setLlaves] = useState(() => Array.from({ length: total }, () => ({ a: '', b: '' })))
  const [ida, setIda] = useState('')
  const [vuelta, setVuelta] = useState('')

  const usados = new Set(llaves.flatMap(l => [l.a, l.b]).filter(Boolean).map(Number))
  const sinLlave = elegidos.filter(id => !usados.has(id))
  const setLlave = (i, lado, valor) => setLlaves(ls => ls.map((l, j) => (j === i ? { ...l, [lado]: valor } : l)))
  const sugerir = () => {
    const orden = esPrimera ? tabla.filter(t => elegidos.includes(t.idEquipo)).map(t => t.idEquipo) : elegidos
    setLlaves(Array.from({ length: total }, (_, i) => ({ a: String(orden[i] ?? ''), b: String(orden[orden.length - 1 - i] ?? '') })))
  }
  const listo = (!esPrimera || elegidos.length === datos.equiposClasifican)
    && llaves.every(l => l.a && l.b) && sinLlave.length === 0
    && fechaHoraCompleta(ida) && (!ronda.idaYVuelta || fechaHoraCompleta(vuelta))

  const crear = useMutation({
    mutationFn: () => api.post(`/campeonatos/${camp.idCampeonato}/eliminatoria/rondas/${ronda.tipo}`, {
      llaves: llaves.map(l => ({ idEquipoA: Number(l.a), idEquipoB: Number(l.b) })),
      fechaIda: ida, fechaVuelta: ronda.idaYVuelta ? vuelta : null,
    }).then(r => r.data),
    onSuccess: onGuardado,
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudo armar la ronda.')),
  })

  const alternar = (id) => {
    const actual = new Set(elegidos)
    if (actual.has(id)) actual.delete(id); else actual.add(id)
    setMarcados([...actual])
    setLlaves(ls => ls.map(l => ({ a: actual.has(Number(l.a)) ? l.a : '', b: actual.has(Number(l.b)) ? l.b : '' })))
  }

  return (
    <form className="space-y-5" onSubmit={e => { e.preventDefault(); if (listo) crear.mutate() }}>
      {esPrimera && (
        <fieldset>
          <legend className="flex w-full items-baseline justify-between text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            <span>1 · Marque los clasificados</span>
            <span className={elegidos.length === datos.equiposClasifican ? 'text-brand-400' : 'text-amber-300'}>{elegidos.length} de {datos.equiposClasifican}</span>
          </legend>
          {qTabla.isLoading ? <p className="text-sm text-gray-500">Cargando la tabla...</p> : (
            <ul className="divide-y divide-gray-800 rounded-lg border border-gray-800">
              {tabla.map(t => (
                <li key={t.idEquipo}>
                  <label className="flex items-center gap-3 px-3 py-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={elegidos.includes(t.idEquipo)} onChange={() => alternar(t.idEquipo)} />
                    <span className="w-6 text-gray-500">{t.posicion}</span>
                    <span className="flex-1 truncate font-medium text-white">{t.equipo}</span>
                    <span className="text-gray-400">{t.pts} pts</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-gray-500">Puede marcar a otro equipo si el reglamento lo pide (sanción, retiro…).</p>
        </fieldset>
      )}

      <fieldset>
        <legend className="flex w-full items-baseline justify-between gap-2 text-xs text-gray-400 uppercase tracking-wider mb-1.5">
          <span>{esPrimera ? '2 · Arme los cruces' : 'Arme los cruces'}</span>
          <button type="button" className="normal-case tracking-normal text-brand-400 hover:text-brand-300" onClick={sugerir}>Sugerir: 1.º contra el último</button>
        </legend>
        <div className="space-y-2">
          {llaves.map((l, i) => {
            const opciones = (lado) => elegidos.filter(id => id === Number(l[lado]) || !usados.has(id))
            return (
              <div key={i} className="grid gap-2 rounded-lg border border-gray-800 p-3 sm:grid-cols-[4rem_1fr_auto_1fr] sm:items-end">
                <span className="text-sm font-semibold text-brand-400 sm:pb-2.5">{total === 1 ? NOMBRES_RONDA[ronda.tipo] : `Llave ${i + 1}`}</span>
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">{ronda.idaYVuelta ? 'Local en la ida' : 'Local'}</span>
                  <select id={`${fid}-a${i}`} className="input-field" value={l.a} onChange={e => setLlave(i, 'a', e.target.value)}>
                    <option value="">Elegir equipo…</option>
                    {opciones('a').map(id => <option key={id} value={id}>{nombre(id)}</option>)}
                  </select>
                </label>
                <span className="hidden text-center text-gray-500 sm:block sm:pb-2.5">vs</span>
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">{ronda.idaYVuelta ? 'Local en la vuelta' : 'Visitante'}</span>
                  <select id={`${fid}-b${i}`} className="input-field" value={l.b} onChange={e => setLlave(i, 'b', e.target.value)}>
                    <option value="">Elegir equipo…</option>
                    {opciones('b').map(id => <option key={id} value={id}>{nombre(id)}</option>)}
                  </select>
                </label>
              </div>
            )
          })}
        </div>
        {sinLlave.length > 0 && elegidos.length > 0 && (
          <p className="mt-2 text-sm text-amber-300">Falta ubicar: {sinLlave.map(nombre).join(', ')}.</p>
        )}
      </fieldset>

      <div className="space-y-3">
        <CampoFechaHora id={`${fid}-ida`} value={ida} onChange={setIda} leyenda={ronda.idaYVuelta ? 'Fecha y hora de la ida' : 'Fecha y hora'} />
        {ronda.idaYVuelta && <CampoFechaHora id={`${fid}-vuelta`} value={vuelta} onChange={setVuelta} leyenda="Fecha y hora de la vuelta" />}
        <p className="text-xs text-gray-500">Todos los partidos se crean con esa fecha y hora. Ajuste cada uno (hora, estadio, árbitro) en la pestaña Jornadas.</p>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!listo || crear.isPending}>{crear.isPending ? 'Creando...' : `Crear ${ronda.nombre.toLowerCase()}`}</button>
      </div>
    </form>
  )
}

// ── Penales de una llave empatada ────────────────────────────────────────────

function Penales({ llave, onGuardado }) {
  const fid = useId()
  const aviso = useAviso()
  const ultimo = llave.partidos[llave.partidos.length - 1]
  const [a, setA] = useState(ultimo?.penalesA ?? '')
  const [b, setB] = useState(ultimo?.penalesB ?? '')
  const guardar = useMutation({
    mutationFn: () => api.put(`/llaves/${llave.idLlave}/penales`, { penalesA: Number(a), penalesB: Number(b) }).then(r => r.data),
    onSuccess: (d) => { onGuardado(d); aviso.exito('Penales guardados.') },
    onError: (err) => aviso.error(mensajeDeError(err, 'No se pudieron guardar los penales.')),
  })
  return (
    <form className="mt-2 space-y-2 rounded-lg border border-amber-400/40 bg-amber-400/5 p-2" onSubmit={e => { e.preventDefault(); guardar.mutate() }}>
      <p className="text-xs font-semibold text-amber-200">Penales</p>
      <div className="grid grid-cols-[1fr_4rem] items-center gap-2 text-sm">
        <label htmlFor={`${fid}-a`} className="truncate text-gray-200">{llave.equipoA.nombre}</label>
        <input id={`${fid}-a`} type="number" min="0" max="99" inputMode="numeric" className="input-field text-center" value={a} onChange={e => setA(e.target.value)} required />
        <label htmlFor={`${fid}-b`} className="truncate text-gray-200">{llave.equipoB.nombre}</label>
        <input id={`${fid}-b`} type="number" min="0" max="99" inputMode="numeric" className="input-field text-center" value={b} onChange={e => setB(e.target.value)} required />
      </div>
      <button type="submit" className="btn-primary w-full text-sm" disabled={guardar.isPending || a === '' || b === ''}>Guardar penales</button>
    </form>
  )
}
