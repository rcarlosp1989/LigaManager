import { useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Undo2, WifiOff, CloudUpload, Sun, X, Minus, Plus, RefreshCw, User } from 'lucide-react'
import api from '../../services/api'
import EstadoError from '../../components/EstadoError'
import MenuAcciones from '../../components/MenuAcciones'
import { useAviso, useDialogos, mensajeDeError } from '../../feedback/contextos'
import { useAtraparFoco } from '../../feedback/foco'
import { ordenarPorDorsal, jugadoresEnCancha, suplentesDisponibles, marcadorDesdeEventos, ETIQUETA_EVENTO, ICONO_EVENTO } from '../../utils/planilla'
import { urlFoto } from '../../utils/fotos'
import { formatearFecha } from '../../utils/fechas'
import { leerLocal, guardarLocal } from './almacen'
import { useReloj, NOMBRE_FASE } from './reloj'
import { useCola, nuevoUid } from './cola'
import { usePantallaEncendida } from './pantallaEncendida'
import { useAuth } from '../../context/AuthContext'

// Modo en vivo: registrar el partido desde la cancha, en un celular.
// Pantalla completa, alto contraste, un equipo a la vez. Usa los mismos endpoints que la
// planilla; los goles, tarjetas y cambios pasan por una cola que aguanta la falta de señal.

const TIEMPO_ESPERA = 15000
const VISTAS = [['convocatoria', 'Convocatoria'], ['partido', 'Partido'], ['cierre', 'Cierre']]

// Fase 8: el servidor dice si el registro está cerrado; con uno anterior, se usa «jugado».
const estaCerrado = (p) => (p?.estadoRegistro ? p.estadoRegistro === 'Cerrado' : !!p?.jugado)

// Hora de Ecuador «yyyy-MM-dd HH:mm» del servidor → milisegundos.
const msDesdeHoraEcuador = (t) => Date.parse(`${t.replace(' ', 'T')}:00-05:00`)

const nombreCorto = (j) => `${j.dorsal != null ? `${j.dorsal} · ` : ''}${j.jugador}`

// Copia local de una consulta: si se recarga sin señal, se muestra lo último que llegó.
function conCopia(claveLocal) {
  return {
    initialData: () => leerLocal(claveLocal, undefined),
    initialDataUpdatedAt: 0,
  }
}

export default function EnVivo() {
  const { idPartido: idTexto } = useParams()
  const idPartido = Number(idTexto)
  const [params, setParams] = useSearchParams()
  const idJornada = Number(params.get('jornada')) || null
  const { user } = useAuth()

  // El vocal usa sus propios endpoints (/api/vocal), que no necesitan la jornada.
  if (user?.rol === 'Vocal') {
    return <PartidoEnVivo key={`v${idPartido}`} modo="vocal" idPartido={idPartido} idJornada={null} params={params} setParams={setParams} />
  }
  // Sin ?jornada= en la dirección, se pregunta al servidor a qué jornada pertenece el partido.
  if (!idJornada) return <BuscarJornada idPartido={idPartido} params={params} />
  return <PartidoEnVivo key={idPartido} modo="organizador" idPartido={idPartido} idJornada={idJornada} params={params} setParams={setParams} />
}

function BuscarJornada({ idPartido, params }) {
  const q = useQuery({
    queryKey: ['partido', idPartido],
    queryFn: () => api.get(`/partidos/${idPartido}`, { timeout: TIEMPO_ESPERA }).then(r => r.data),
  })
  if (q.data?.idJornada) {
    const n = new URLSearchParams(params)
    n.set('jornada', String(q.data.idJornada))
    return <Navigate to={`/partidos/${idPartido}/en-vivo?${n}`} replace />
  }
  if (q.isError && q.error?.response?.status === 404) {
    return (
      <PantallaVivo>
        <div className="p-6 space-y-4 text-center">
          <p className="text-white text-lg">No se encontró este partido.</p>
          <Link to="/campeonatos" className="btn-primary inline-flex">Ir a Campeonatos</Link>
        </div>
      </PantallaVivo>
    )
  }
  if (q.isError) {
    return (
      <PantallaVivo>
        <div className="p-4"><EstadoError mensaje="No se pudo cargar el partido." onReintentar={q.refetch} reintentando={q.isFetching} /></div>
      </PantallaVivo>
    )
  }
  return <PantallaVivo><p className="p-8 text-center text-gray-300">Cargando partido...</p></PantallaVivo>
}

function PantallaVivo({ children }) {
  return <div className="min-h-dvh bg-black text-white">{children}</div>
}

// modo: 'organizador' (endpoints de siempre) o 'vocal' (endpoints /api/vocal, Fase 7).
function PartidoEnVivo({ modo, idPartido, idJornada, params, setParams }) {
  const vocal = modo === 'vocal'
  const base = vocal ? '/vocal' : ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const aviso = useAviso()
  const { confirmar } = useDialogos()
  const pantalla = usePantallaEncendida()
  const { reloj, corriendo, acciones: accionesReloj, texto: textoReloj, minutoAhora } = useReloj(idPartido)
  const [hoja, setHoja] = useState(null)        // { jugador, lado }
  const [fotoGrande, setFotoGrande] = useState(null)

  const setParam = (clave, valor) => setParams(p => {
    const n = new URLSearchParams(p)
    n.set(clave, valor)
    return n
  }, { replace: true })

  // ── Datos ──────────────────────────────────────────────────────────────────
  const claveJornada = useMemo(() => ['jornada', idJornada], [idJornada])
  const copiaJornada = `vivo.copia.jornada.${idJornada}`
  const qJornada = useQuery({
    queryKey: claveJornada,
    queryFn: () => api.get(`/jornadas/${idJornada}`, { timeout: TIEMPO_ESPERA }).then(r => {
      guardarLocal(copiaJornada, r.data)
      return r.data
    }),
    enabled: !vocal,
    ...conCopia(copiaJornada),
  })
  // Vocal: una sola llamada trae el partido y los dos planteles.
  const claveVocal = useMemo(() => ['vocal-partido', idPartido], [idPartido])
  const copiaVocal = `vivo.copia.vocal.${idPartido}`
  const qVocal = useQuery({
    queryKey: claveVocal,
    queryFn: () => api.get(`/vocal/partidos/${idPartido}`, { timeout: TIEMPO_ESPERA }).then(r => {
      guardarLocal(copiaVocal, r.data)
      return r.data
    }),
    enabled: vocal,
    ...conCopia(copiaVocal),
  })
  const qPrincipal = vocal ? qVocal : qJornada
  const jornada = vocal ? qVocal.data : qJornada.data
  const partido = vocal ? qVocal.data?.partido : jornada?.partidos?.find(p => p.idPartido === idPartido)
  const fecha = partido?.fecha?.slice(0, 10)

  const consultaEquipo = (idEquipo) => ({
    queryKey: ['equipo', idEquipo, fecha],
    queryFn: () => api.get(`/equipos/${idEquipo}`, { params: { fecha }, timeout: TIEMPO_ESPERA }).then(r => {
      guardarLocal(`vivo.copia.equipo.${idEquipo}.${fecha}`, r.data)
      return r.data
    }),
    enabled: !vocal && !!idEquipo && !!fecha,
    ...conCopia(`vivo.copia.equipo.${idEquipo}.${fecha}`),
  })
  const qLocalOrg = useQuery(consultaEquipo(partido?.idEquipoLocal))
  const qVisitanteOrg = useQuery(consultaEquipo(partido?.idEquipoVisitante))
  // Para el vocal, el plantel viene dentro de su consulta; se presenta con la misma forma.
  const desdeVocal = (lado) => ({
    data: qVocal.data?.[lado], isLoading: qVocal.isLoading, isError: qVocal.isError,
    isFetching: qVocal.isFetching, refetch: qVocal.refetch,
  })
  const qLocal = vocal ? desdeVocal('local') : qLocalOrg
  const qVisitante = vocal ? desdeVocal('visitante') : qVisitanteOrg
  // Las fotos vienen en la lista general de jugadores.
  // La foto viene en el plantel y en la alineación. Con un servidor anterior a la Fase 6
  // no viene, y entonces se toma de la lista general de jugadores.
  const plantelTraeFoto = (qLocal.data?.jugadores ?? []).some(j => 'fotoUrl' in j)
  const qJugadores = useQuery({
    queryKey: ['jugadores'],
    queryFn: () => api.get('/jugadores').then(r => r.data),
    enabled: !vocal && !!qLocal.data && !plantelTraeFoto,
  })
  const fotos = useMemo(() => {
    const mapa = new Map()
    const fuentes = [
      ...(qJugadores.data ?? []),
      ...(qLocal.data?.jugadores ?? []), ...(qVisitante.data?.jugadores ?? []),
      ...(partido?.alineacionLocal ?? []), ...(partido?.alineacionVisitante ?? []),
    ]
    for (const j of fuentes) if (j.fotoUrl) mapa.set(j.idJugador, urlFoto(j.fotoUrl))
    return mapa
  }, [qJugadores.data, qLocal.data, qVisitante.data, partido])

  const ponerPartido = (p) => {
    if (!p) return
    if (vocal) {
      queryClient.setQueryData(claveVocal, viejo => {
        if (!viejo) return viejo
        const nuevo = { ...viejo, partido: p }
        guardarLocal(copiaVocal, nuevo)
        return nuevo
      })
      return
    }
    queryClient.setQueryData(claveJornada, viejo => {
      if (!viejo) return viejo
      const nuevo = { ...viejo, partidos: viejo.partidos.map(x => (x.idPartido === p.idPartido ? p : x)) }
      guardarLocal(copiaJornada, nuevo)
      return nuevo
    })
  }
  const obtenerPartido = async () => {
    if (vocal) {
      const datos = (await api.get(`/vocal/partidos/${idPartido}`, { timeout: TIEMPO_ESPERA })).data
      guardarLocal(copiaVocal, datos)
      queryClient.setQueryData(claveVocal, datos)
      return datos.partido
    }
    const datos = (await api.get(`/jornadas/${idJornada}`, { timeout: TIEMPO_ESPERA })).data
    guardarLocal(copiaJornada, datos)
    queryClient.setQueryData(claveJornada, datos)
    return datos.partidos.find(p => p.idPartido === idPartido)
  }
  const invalidarTablas = () => {
    queryClient.invalidateQueries({ queryKey: ['grupo'] })
    queryClient.invalidateQueries({ queryKey: ['posiciones-campeonato'] })
  }

  // ── Último registro y cola ─────────────────────────────────────────────────
  const claveUltimo = `vivo.ultimo.${idPartido}`
  const [ultimo, setUltimoEstado] = useState(() => leerLocal(claveUltimo, null))
  const setUltimo = (cambio) => setUltimoEstado(actual => {
    const nuevo = typeof cambio === 'function' ? cambio(actual) : cambio
    guardarLocal(claveUltimo, nuevo)
    return nuevo
  })

  const cola = useCola(idPartido, {
    prefijo: base,
    obtenerPartido,
    alConfirmar: (item, idCreado, p) => {
      ponerPartido(p)
      invalidarTablas()
      setUltimo(u => (u?.uid === item.uid ? { ...u, idServidor: idCreado } : u))
    },
    alRechazar: (item, mensaje) => {
      aviso.error(`No se registró «${item.texto}». ${mensaje}`)
      setUltimo(u => (u?.uid === item.uid ? null : u))
    },
  })

  // ── Derivados ──────────────────────────────────────────────────────────────
  const alineacion = { local: partido?.alineacionLocal ?? [], visitante: partido?.alineacionVisitante ?? [] }
  const plantel = { local: qLocal.data?.jugadores ?? [], visitante: qVisitante.data?.jugadores ?? [] }
  const idEquipo = { local: partido?.idEquipoLocal, visitante: partido?.idEquipoVisitante }
  const nombreEquipo = { local: partido?.equipoLocal, visitante: partido?.equipoVisitante }

  const ladoDe = (idJugador) => {
    for (const lado of ['local', 'visitante']) {
      if (alineacion[lado].some(a => a.idJugador === idJugador)) return lado
    }
    for (const lado of ['local', 'visitante']) {
      if (plantel[lado].some(j => j.idJugador === idJugador)) return lado
    }
    return null
  }
  const filaDe = (idJugador) => [...alineacion.local, ...alineacion.visitante].find(a => a.idJugador === idJugador)
  const nombreDe = (idJugador) => {
    const fila = filaDe(idJugador)
    return fila ? nombreCorto(fila) : 'Jugador'
  }

  const eventos = [
    ...(partido?.eventos ?? []),
    ...cola.items.filter(i => i.clase === 'evento').map(i => ({ ...i.datos, uid: i.uid, pendiente: true, jugador: nombreDe(i.datos.idJugador) })),
  ]
  const cambios = [
    ...(partido?.cambios ?? []),
    ...cola.items.filter(i => i.clase === 'cambio').map(i => ({
      ...i.datos, uid: i.uid, pendiente: true, idEquipo: idEquipo[i.lado],
      jugadorSale: nombreDe(i.datos.idJugadorSale), jugadorEntra: nombreDe(i.datos.idJugadorEntra),
    })),
  ]
  const cambiosDe = (lado) => cambios.filter(c => c.idEquipo === idEquipo[lado])
  const marcador = marcadorDesdeEventos(eventos, ladoDe)
  const sinGoles = !!(partido?.desierto || partido?.perdidaReglamento)

  const lado = params.get('equipo') === 'visitante' ? 'visitante' : 'local'
  const hayConvocados = alineacion.local.length + alineacion.visitante.length > 0
  // Fase 8: cerrado el partido, el vocal solo ve el resumen.
  const bloqueado = vocal && estaCerrado(partido)
  const vista = bloqueado ? 'cierre'
    : VISTAS.some(([v]) => v === params.get('vista')) ? params.get('vista') : (hayConvocados ? 'partido' : 'convocatoria')

  // El servidor guarda la hora de inicio (Fase 8): avisa que el partido empezó y permite retomar el reloj.
  const iniciarEnServidor = () => {
    api.put(`${base}/partidos/${idPartido}/iniciar`, null, { timeout: TIEMPO_ESPERA })
      .then(r => ponerPartido(r.data)).catch(() => {})
  }
  const accionesRelojVivo = {
    ...accionesReloj,
    iniciar: () => {
      if (reloj.fase === 'antes') iniciarEnServidor()
      accionesReloj.iniciar()
    },
  }
  const puedeRetomar = reloj.fase === 'antes' && partido?.iniciadoEn && !estaCerrado(partido)

  // ── Acciones ───────────────────────────────────────────────────────────────
  const anotar = (item, texto, icono) => {
    cola.agregar({ ...item, uid: item.uid, texto })
    setUltimo({ uid: item.uid, clase: item.clase, texto, icono, idServidor: null })
    // Sin aviso emergente: la barra del último registro, arriba, ya lo muestra.
    navigator.vibrate?.(40)
  }

  const registrarEvento = (jugador, ladoJugador, tipoEvento, minuto) => {
    const uid = nuevoUid()
    anotar({
      uid, clase: 'evento', lado: ladoJugador,
      datos: { idJugador: jugador.idJugador, tipoEvento, minuto, idCliente: uid },
      conocidos: (partido.eventos ?? []).map(e => e.idEvento),
    }, `${ETIQUETA_EVENTO[tipoEvento]} · ${nombreCorto(jugador)} · min ${minuto}`, ICONO_EVENTO[tipoEvento])
    setHoja(null)
  }

  const registrarCambio = (sale, entra, ladoJugador, minuto) => {
    const uid = nuevoUid()
    anotar({
      uid, clase: 'cambio', lado: ladoJugador,
      datos: { idJugadorSale: sale.idJugador, idJugadorEntra: entra.idJugador, minuto, idCliente: uid },
      conocidos: (partido.cambios ?? []).map(c => c.idCambio),
    }, `Cambio · sale ${nombreCorto(sale)}, entra ${nombreCorto(entra)} · min ${minuto}`, '🔄')
    setHoja(null)
  }

  const deshacer = async () => {
    if (!ultimo) return
    const resultado = cola.quitar(ultimo.uid)
    if (resultado === 'quitado') {
      setUltimo(null)
      return
    }
    if (resultado === 'enviando') {
      aviso.error('Se está enviando. Espera unos segundos y vuelve a intentar.')
      return
    }
    if (!ultimo.idServidor) {
      aviso.error('No se encontró el registro en el servidor. Corrígelo desde la planilla.')
      return
    }
    try {
      await api.delete(ultimo.clase === 'evento' ? `${base}/eventos/${ultimo.idServidor}` : `${base}/cambios/${ultimo.idServidor}`, { timeout: TIEMPO_ESPERA })
    } catch (err) {
      aviso.error(err?.response
        ? mensajeDeError(err, 'No se pudo deshacer.')
        : 'Sin conexión: no se puede deshacer ahora. Inténtalo cuando vuelva la señal.')
      return
    }
    setUltimo(null)
    invalidarTablas()
    obtenerPartido().catch(() => qPrincipal.refetch())
  }

  const convocarMutation = useMutation({
    mutationFn: async ({ ids, titular }) => {
      const res = await Promise.allSettled(ids.map(idJugador =>
        api.post(`${base}/partidos/${idPartido}/alineacion`, { idJugador, titular }, { timeout: TIEMPO_ESPERA })))
      return {
        agregados: res.filter(r => r.status === 'fulfilled').length,
        sinRed: res.some(r => r.status === 'rejected' && !r.reason?.response),
        errores: [...new Set(res.filter(r => r.status === 'rejected' && r.reason?.response).map(r => mensajeDeError(r.reason, 'Error al convocar.')))],
      }
    },
    onSuccess: async ({ agregados, sinRed, errores }) => {
      if (agregados > 0) aviso.exito(agregados === 1 ? 'Jugador convocado.' : `${agregados} jugadores convocados.`)
      if (sinRed) aviso.error('Sin conexión: la convocatoria necesita señal. Vuelve a intentarlo.')
      else if (errores.length) aviso.error(errores.join(' '))
      await obtenerPartido().catch(() => {})
    },
  })

  const quitarConvocado = async (fila) => {
    const ok = await confirmar({
      titulo: `¿Quitar a ${nombreCorto(fila)} de la convocatoria?`,
      mensaje: 'Deja de estar convocado para este partido.',
      textoConfirmar: 'Quitar',
      peligro: true,
    })
    if (!ok) return
    try {
      await api.delete(`${base}/alineacion/${fila.idAlineacion}`, { timeout: TIEMPO_ESPERA })
      aviso.exito('Jugador quitado de la convocatoria.')
      await obtenerPartido().catch(() => {})
    } catch (err) {
      aviso.error(err?.response ? mensajeDeError(err, 'No se puede quitar.') : 'Sin conexión: quitar a un jugador necesita señal.')
    }
  }

  const cerrarMutation = useMutation({
    // El vocal cierra con sus observaciones; el organizador marca el partido como jugado.
    mutationFn: (observaciones) => vocal
      ? api.put(`/vocal/partidos/${idPartido}/cerrar`, { observaciones: observaciones || null }, { timeout: TIEMPO_ESPERA })
      : api.put(`/partidos/${idPartido}/cerrar`, { observaciones: null }, { timeout: TIEMPO_ESPERA }),
    onSuccess: (r) => {
      ponerPartido(r.data)
      invalidarTablas()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (reloj.fase !== 'final') accionesReloj.finalizar()
      aviso.exito('Partido cerrado y marcado como jugado.')
    },
    onError: (err) => aviso.error(err?.response ? mensajeDeError(err, 'No se pudo cerrar el partido.') : 'Sin conexión: cerrar el partido necesita señal.'),
  })

  const cerrarPartido = async (observaciones) => {
    const ok = await confirmar({
      titulo: '¿Cerrar el partido y marcarlo como jugado?',
      mensaje: `Resultado: ${nombreEquipo.local} ${marcador.local} – ${marcador.visitante} ${nombreEquipo.visitante}. La tabla de posiciones se actualiza. Las correcciones posteriores se hacen desde la planilla.`,
      textoConfirmar: 'Cerrar partido',
    })
    if (ok) cerrarMutation.mutate(observaciones)
  }

  const salir = () => navigate(vocal ? '/vocal' : `/campeonatos/${jornada?.idCampeonato ?? ''}?tab=jornadas&jornada=${idJornada}`)

  // ── Estados de carga ───────────────────────────────────────────────────────
  if (!jornada && qPrincipal.isLoading) {
    return <PantallaVivo><p className="p-8 text-center text-gray-300">Cargando partido...</p></PantallaVivo>
  }
  if (!jornada && vocal && qVocal.error?.response?.status === 404) {
    return (
      <PantallaVivo>
        <div className="p-6 space-y-4 text-center">
          <p className="text-white text-lg">Este partido no está disponible para registrar hoy.</p>
          <p className="text-gray-300">Cada partido se registra solo el día que se juega, en un campeonato donde estés habilitado.</p>
          <Link to="/vocal" className="btn-primary inline-flex">Ver mis partidos</Link>
        </div>
      </PantallaVivo>
    )
  }
  if (!jornada) {
    return (
      <PantallaVivo>
        <div className="p-4">
          <EstadoError mensaje="No se pudo cargar el partido." onReintentar={qPrincipal.refetch} reintentando={qPrincipal.isFetching} />
        </div>
      </PantallaVivo>
    )
  }
  if (!partido) {
    return (
      <PantallaVivo>
        <div className="p-6 space-y-4 text-center">
          <p className="text-white text-lg">Este partido no está en la jornada indicada.</p>
          <Link to={vocal ? '/vocal' : '/campeonatos'} className="btn-primary inline-flex">{vocal ? 'Ver mis partidos' : 'Ir a Campeonatos'}</Link>
        </div>
      </PantallaVivo>
    )
  }

  const pendientes = cola.items.length
  const copiaVieja = qPrincipal.isError

  return (
    <PantallaVivo>
      {/* ── Encabezado fijo: marcador, reloj y último registro ── */}
      <header className="sticky top-0 z-20 bg-black border-b border-neutral-700">
        <div className="flex items-center gap-2 px-2 pt-2">
          <button type="button" onClick={salir} aria-label="Salir del modo en vivo"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-200 hover:bg-neutral-800">
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="sr-only">Marcador</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="truncate text-right text-sm font-semibold text-gray-200">{partido.equipoLocal}</span>
              <span className="font-display text-3xl leading-none tracking-wide text-white tabular-nums">
                {marcador.local}<span className="mx-1.5 text-gray-400">–</span>{marcador.visitante}
              </span>
              <span className="truncate text-sm font-semibold text-gray-200">{partido.equipoVisitante}</span>
            </div>
          </div>
          <EstadoEnvio pendientes={pendientes} sinConexion={cola.sinConexion} enviando={cola.enviando} onReintentar={cola.reintentar} />
        </div>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="font-display text-3xl leading-none tabular-nums text-white" aria-label={`Reloj: ${textoReloj}`}>{textoReloj}</p>
            <p className="text-xs text-gray-300 mt-1">
              {NOMBRE_FASE[reloj.fase]}{reloj.fase !== 'antes' && !corriendo && reloj.fase !== 'final' && reloj.fase !== 'descanso' ? ' · en pausa' : ''}
              {pantalla === 'activa' && <span className="ml-2 inline-flex items-center gap-1 text-amber-300"><Sun size={12} aria-hidden="true" />Pantalla encendida</span>}
            </p>
          </div>
          {!bloqueado && <ControlReloj reloj={reloj} corriendo={corriendo} acciones={accionesRelojVivo} />}
        </div>

        {ultimo && (
          <div className="flex items-center gap-2 border-t border-neutral-800 bg-neutral-900 px-3 py-1.5">
            <p className="min-w-0 flex-1 truncate text-sm text-white">
              <span aria-hidden="true" className="mr-1.5">{ultimo.icono}</span>{ultimo.texto}
              {cola.items.some(i => i.uid === ultimo.uid) && <span className="ml-2 text-xs text-amber-300">por enviar</span>}
            </p>
            <button type="button" onClick={deshacer}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-500 px-3 text-sm font-semibold text-white hover:bg-neutral-800">
              <Undo2 size={16} aria-hidden="true" /> Deshacer
            </button>
          </div>
        )}
      </header>

      {copiaVieja && (
        <p role="status" className="mx-3 mt-3 rounded-lg border border-amber-500/60 bg-amber-950/60 px-3 py-2 text-sm text-amber-100">
          No se pudo actualizar desde el servidor. Se muestra la última copia guardada en este dispositivo.
        </p>
      )}
      {cola.rechazados.length > 0 && (
        <div role="alert" className="mx-3 mt-3 space-y-2 rounded-lg border border-red-500/70 bg-red-950/60 p-3">
          <p className="text-sm font-semibold text-white">El servidor rechazó {cola.rechazados.length === 1 ? 'un registro' : `${cola.rechazados.length} registros`}:</p>
          {cola.rechazados.map(r => (
            <div key={r.uid} className="flex items-start gap-2 text-sm text-red-100">
              <p className="flex-1">{r.texto}. {r.error}</p>
              <button type="button" onClick={() => cola.descartarRechazado(r.uid)} aria-label={`Descartar el aviso de ${r.texto}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-red-100 hover:bg-red-900"><X size={16} aria-hidden="true" /></button>
            </div>
          ))}
        </div>
      )}

      {puedeRetomar && (
        <div role="status" className="mx-3 mt-3 rounded-lg border border-sky-400/60 bg-sky-950/60 px-3 py-2 text-sm text-sky-50">
          <p>El partido se inició a las {partido.iniciadoEn.slice(11, 16)}, quizás en otro dispositivo.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => accionesReloj.retomar(msDesdeHoraEcuador(partido.iniciadoEn))}
              className="h-11 rounded-lg bg-sky-300 font-bold text-black">Retomar desde esa hora</button>
            <button type="button" onClick={accionesRelojVivo.iniciar} className="h-11 rounded-lg border border-sky-300 text-sky-100">Empezar de cero</button>
          </div>
          <p className="mt-1.5 text-xs text-sky-200">Al retomar no se cuentan las pausas: corrige el minuto en cada registro si hace falta.</p>
        </div>
      )}
      {bloqueado && (
        <p role="status" className="mx-3 mt-3 rounded-lg border border-green-500/60 bg-green-950/60 px-3 py-2 text-sm text-green-50">
          Partido cerrado{partido.cerradoPor ? ` por ${partido.cerradoPor}` : ''}{partido.cerradoEn ? ` a las ${partido.cerradoEn.slice(11, 16)}` : ''}.
          Ya no se pueden hacer registros; las correcciones las hace el organizador.
        </p>
      )}

      {/* ── Vista ── */}
      {!bloqueado && <nav aria-label="Etapas del partido" className="grid grid-cols-3 gap-1 px-3 pt-3">
        {VISTAS.map(([clave, texto]) => (
          <button key={clave} type="button" onClick={() => setParam('vista', clave)} aria-current={vista === clave ? 'step' : undefined}
            className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
              vista === clave ? 'bg-white text-black' : 'bg-neutral-900 text-gray-200 hover:bg-neutral-800'
            }`}>{texto}</button>
        ))}
      </nav>}

      {vista !== 'cierre' && (
        <div role="group" aria-label="Equipo" className="grid grid-cols-2 gap-2 px-3 pt-3">
          {['local', 'visitante'].map(l => (
            <button key={l} type="button" onClick={() => setParam('equipo', l)} aria-pressed={lado === l}
              className={`min-h-12 rounded-lg border-2 px-2 py-1.5 text-left transition-colors ${
                lado === l ? 'border-brand-300 bg-brand-900/70 text-white' : 'border-neutral-700 bg-neutral-900 text-gray-300'
              }`}>
              <span className="block text-[11px] uppercase tracking-wider text-gray-300">{l === 'local' ? 'Local' : 'Visitante'}</span>
              <span className="block truncate text-sm font-semibold">{nombreEquipo[l]}</span>
            </button>
          ))}
        </div>
      )}

      <main className="px-3 pb-28 pt-3">
        {vista === 'convocatoria' && (
          <VistaConvocatoria
            key={lado}
            plantel={plantel[lado]}
            consulta={lado === 'local' ? qLocal : qVisitante}
            alineacion={alineacion[lado]}
            fotos={fotos}
            onVerFoto={setFotoGrande}
            onConvocar={(ids, titular) => convocarMutation.mutate({ ids, titular })}
            convocando={convocarMutation.isPending}
            onQuitar={quitarConvocado}
            onListo={() => setParam('vista', 'partido')}
          />
        )}
        {vista === 'partido' && (
          <VistaPartido
            alineacion={alineacion[lado]}
            cambios={cambiosDe(lado)}
            eventos={eventos}
            fotos={fotos}
            onElegir={(jugador) => setHoja({ jugador, lado })}
            onIrConvocatoria={() => setParam('vista', 'convocatoria')}
          />
        )}
        {vista === 'cierre' && (
          <VistaCierre
            partido={partido}
            marcador={marcador}
            eventos={eventos}
            cambios={cambios}
            ladoDe={ladoDe}
            pendientes={pendientes}
            sinConexion={cola.sinConexion}
            onReintentar={cola.reintentar}
            onCerrar={cerrarPartido}
            cerrando={cerrarMutation.isPending}
            onSalir={salir}
            vocal={vocal}
          />
        )}
      </main>

      {hoja && (
        <HojaJugador
          jugador={hoja.jugador}
          foto={fotos.get(hoja.jugador.idJugador)}
          minutoInicial={minutoAhora()}
          sinGoles={sinGoles}
          suplentes={ordenarPorDorsal(suplentesDisponibles(alineacion[hoja.lado], cambiosDe(hoja.lado)))}
          tarjetas={eventos.filter(e => e.idJugador === hoja.jugador.idJugador)}
          onEvento={(tipo, minuto) => registrarEvento(hoja.jugador, hoja.lado, tipo, minuto)}
          onCambio={(entra, minuto) => registrarCambio(hoja.jugador, entra, hoja.lado, minuto)}
          onCerrar={() => setHoja(null)}
        />
      )}
      {fotoGrande && <FotoGrande {...fotoGrande} onCerrar={() => setFotoGrande(null)} />}
    </PantallaVivo>
  )
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function EstadoEnvio({ pendientes, sinConexion, enviando, onReintentar }) {
  if (pendientes === 0 && !sinConexion) {
    return <span className="sr-only">Todo enviado</span>
  }
  return (
    <button type="button" onClick={onReintentar}
      aria-label={`${sinConexion ? 'Sin conexión. ' : ''}${pendientes} ${pendientes === 1 ? 'registro' : 'registros'} por enviar. Tocar para reintentar.`}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold ${
        sinConexion ? 'bg-red-600 text-white' : 'bg-amber-400 text-black'
      }`}>
      {sinConexion ? <WifiOff size={16} aria-hidden="true" /> : <CloudUpload size={16} aria-hidden="true" className={enviando ? 'animate-pulse' : ''} />}
      <span aria-hidden="true">{pendientes}</span>
    </button>
  )
}

function ControlReloj({ reloj, corriendo, acciones }) {
  const { confirmar, pedirNumero } = useDialogos()
  const principal =
    reloj.fase === 'antes' ? { texto: 'Iniciar partido', accion: acciones.iniciar }
    : reloj.fase === 'descanso' ? { texto: 'Iniciar 2.º tiempo', accion: acciones.iniciar }
    : reloj.fase === 'final' ? null
    : corriendo ? { texto: 'Pausar', accion: acciones.pausar }
    : { texto: 'Reanudar', accion: acciones.reanudar }

  const terminar = async () => {
    const primero = reloj.fase === '1T'
    const ok = await confirmar({
      titulo: primero ? '¿Terminar el 1.er tiempo?' : '¿Terminar el 2.º tiempo?',
      mensaje: primero ? 'El reloj pasa a descanso.' : 'El reloj se detiene. El partido se cierra desde «Cierre».',
      textoConfirmar: 'Terminar',
    })
    if (ok) acciones.terminarTiempo()
  }
  const cambiarDuracion = async () => {
    const minutos = await pedirNumero({
      titulo: 'Duración de cada tiempo', etiqueta: 'Minutos', min: 5, max: 60,
      valorInicial: reloj.duracion, textoConfirmar: 'Guardar',
    })
    if (minutos != null) acciones.duracion(minutos)
  }
  const reiniciar = async () => {
    const ok = await confirmar({
      titulo: '¿Reiniciar el reloj?', mensaje: 'Vuelve a 00:00 y sin iniciar. Los eventos registrados no cambian.',
      textoConfirmar: 'Reiniciar', peligro: true,
    })
    if (ok) acciones.reiniciar()
  }

  const opciones = [
    ...((reloj.fase === '1T' || reloj.fase === '2T') ? [{ texto: reloj.fase === '1T' ? 'Terminar 1.er tiempo' : 'Terminar 2.º tiempo', onClick: terminar }] : []),
    { texto: `Duración de cada tiempo: ${reloj.duracion} min`, onClick: cambiarDuracion },
    { texto: 'Reiniciar reloj', onClick: reiniciar, peligro: true, deshabilitado: reloj.fase === 'antes', motivo: 'El reloj no ha empezado.' },
  ]

  return (
    <div className="flex shrink-0 items-center gap-1">
      {principal && (
        <button type="button" onClick={principal.accion}
          className={`h-12 rounded-lg px-4 text-base font-bold ${
            principal.texto === 'Pausar' ? 'bg-neutral-200 text-black' : 'bg-green-500 text-black'
          }`}>{principal.texto}</button>
      )}
      <MenuAcciones etiqueta="Opciones del reloj" acciones={opciones} />
    </div>
  )
}

// Foto del jugador; sin foto (o si no carga), una silueta.
function FotoJugador({ url, tam = 'h-12 w-12' }) {
  const [fallo, setFallo] = useState(false)
  if (url && !fallo) {
    return <img src={url} alt="" onError={() => setFallo(true)} className={`${tam} shrink-0 rounded-lg object-cover bg-neutral-800`} />
  }
  return (
    <span aria-hidden="true" className={`${tam} flex shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-gray-400`}>
      <User size={22} />
    </span>
  )
}

function VistaConvocatoria({ plantel, consulta, alineacion, fotos, onVerFoto, onConvocar, convocando, onQuitar, onListo }) {
  const [seleccion, setSeleccion] = useState([])
  const convocados = new Map(alineacion.map(a => [a.idJugador, a]))
  const jugadores = ordenarPorDorsal(plantel)
  const disponibles = new Set(jugadores.filter(j => !convocados.has(j.idJugador)).map(j => j.idJugador))
  const elegidos = seleccion.filter(id => disponibles.has(id))
  const titulares = alineacion.filter(a => a.titular).length

  if (consulta.isLoading && !consulta.data) return <p className="py-8 text-center text-gray-300">Cargando jugadores...</p>
  if (!consulta.data && consulta.isError) {
    return <EstadoError mensaje="No se pudo cargar la lista de jugadores." onReintentar={consulta.refetch} reintentando={consulta.isFetching} />
  }

  return (
    <section aria-label="Convocatoria">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-gray-200">
          <strong className="text-white">{titulares}</strong> titulares · <strong className="text-white">{alineacion.length - titulares}</strong> suplentes
        </p>
        {alineacion.length > 0 && (
          <button type="button" onClick={onListo} className="h-11 rounded-lg border border-neutral-500 px-3 text-sm font-semibold text-white">Ir al partido</button>
        )}
      </div>
      <p className="mb-3 text-sm text-gray-300">Marca a los jugadores presentes y conviértelos en titulares o suplentes. Toca la foto para verla grande.</p>

      {jugadores.length === 0 && <p className="py-6 text-center text-gray-300">Este equipo no tiene jugadores habilitados para la fecha del partido.</p>}
      <ul className="space-y-2">
        {jugadores.map(j => {
          const fila = convocados.get(j.idJugador)
          const nombre = `${j.apellido}, ${j.nombre}`
          const marcado = elegidos.includes(j.idJugador)
          const foto = fotos.get(j.idJugador)
          return (
            <li key={j.idJugador}
              className={`flex items-center gap-3 rounded-xl border px-2 py-2 ${
                fila ? 'border-neutral-600 bg-neutral-900' : marcado ? 'border-brand-300 bg-brand-900/70' : 'border-neutral-800 bg-neutral-950'
              }`}>
              <button type="button" onClick={() => onVerFoto({ url: foto, nombre, dorsal: j.dorsal })}
                aria-label={`Ver la foto de ${nombre}`} className="shrink-0 rounded-lg">
                <FotoJugador url={foto} tam="h-14 w-14" />
              </button>
              {fila ? (
                <>
                  <span className="w-10 shrink-0 text-center font-display text-3xl text-white">{j.dorsal ?? '–'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-white">{nombre}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${fila.titular ? 'text-green-400' : 'text-sky-300'}`}>
                      {fila.titular ? 'Titular' : 'Suplente'}
                    </span>
                  </span>
                  <button type="button" onClick={() => onQuitar({ ...fila, jugador: `${j.nombre} ${j.apellido}` })}
                    aria-label={`Quitar a ${nombre} de la convocatoria`}
                    className="h-11 shrink-0 rounded-lg px-3 text-sm text-gray-300 hover:bg-neutral-800">Quitar</button>
                </>
              ) : (
                <label className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <span className="w-10 shrink-0 text-center font-display text-3xl text-white">{j.dorsal ?? '–'}</span>
                  <span className="min-w-0 flex-1 truncate text-base text-gray-100">{nombre}</span>
                  <input type="checkbox" checked={marcado} className="h-6 w-6 shrink-0 accent-brand-400"
                    onChange={() => setSeleccion(s => (marcado ? s.filter(x => x !== j.idJugador) : [...s, j.idJugador]))} />
                </label>
              )}
            </li>
          )
        })}
      </ul>

      {elegidos.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-600 bg-neutral-950 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <p className="mb-2 text-sm text-white">{elegidos.length} {elegidos.length === 1 ? 'seleccionado' : 'seleccionados'} · convocar como:</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={convocando} onClick={() => { onConvocar(elegidos, true); setSeleccion([]) }}
              className="h-12 rounded-lg bg-green-500 text-base font-bold text-black disabled:opacity-50">Titulares</button>
            <button type="button" disabled={convocando} onClick={() => { onConvocar(elegidos, false); setSeleccion([]) }}
              className="h-12 rounded-lg bg-sky-300 text-base font-bold text-black disabled:opacity-50">Suplentes</button>
          </div>
        </div>
      )}
    </section>
  )
}

function Tarjetas({ eventos, idJugador }) {
  const propios = eventos.filter(e => e.idJugador === idJugador)
  const goles = propios.filter(e => e.tipoEvento === 'GOL').length
  const amarillas = propios.filter(e => e.tipoEvento === 'TARJETA_AMARILLA').length
  const rojas = propios.filter(e => e.tipoEvento === 'TARJETA_ROJA').length
  if (!goles && !amarillas && !rojas) return null
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-xs">
      {goles > 0 && <span className="rounded bg-green-500 px-1.5 font-bold text-black">⚽ {goles}</span>}
      {amarillas > 0 && <span className="rounded bg-yellow-300 px-1.5 font-bold text-black">{amarillas} amarilla{amarillas > 1 ? 's' : ''}</span>}
      {(rojas > 0 || amarillas >= 2) && <span className="rounded bg-red-600 px-1.5 font-bold text-white">Expulsado</span>}
    </span>
  )
}

function VistaPartido({ alineacion, cambios, eventos, fotos, onElegir, onIrConvocatoria }) {
  const enCancha = ordenarPorDorsal(jugadoresEnCancha(alineacion, cambios))
  const idsCancha = new Set(enCancha.map(a => a.idJugador))
  const salieron = new Set(cambios.map(c => c.idJugadorSale))
  const banca = ordenarPorDorsal(alineacion.filter(a => !idsCancha.has(a.idJugador) && !salieron.has(a.idJugador)))
  const fuera = ordenarPorDorsal(alineacion.filter(a => !idsCancha.has(a.idJugador) && salieron.has(a.idJugador)))

  if (alineacion.length === 0) {
    return (
      <div className="py-8 text-center space-y-4">
        <p className="text-gray-200">Este equipo aún no tiene convocados.</p>
        <button type="button" onClick={onIrConvocatoria} className="btn-primary">Ir a la convocatoria</button>
      </div>
    )
  }

  return (
    <section aria-label="Jugadores en cancha">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-300">En cancha ({enCancha.length})</h2>
      {enCancha.length === 0 && <p className="mb-4 text-sm text-gray-300">No hay titulares. Convoca titulares en «Convocatoria».</p>}
      <ul className="space-y-2">
        {enCancha.map(a => (
          <li key={a.idAlineacion}>
            <button type="button" onClick={() => onElegir(a)}
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-neutral-600 bg-neutral-900 px-3 py-2 text-left active:bg-neutral-700">
              <span className="w-12 shrink-0 text-center font-display text-4xl leading-none text-white">{a.dorsal ?? '–'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-white">{a.jugador}</span>
                <Tarjetas eventos={eventos} idJugador={a.idJugador} />
              </span>
              {fotos.get(a.idJugador) && <FotoJugador url={fotos.get(a.idJugador)} tam="h-11 w-11" />}
            </button>
          </li>
        ))}
      </ul>

      {banca.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-gray-300">Banca ({banca.length})</h2>
          <p className="mb-2 text-xs text-gray-300">Para un cambio, toca al jugador que sale.</p>
          <ul className="space-y-1.5">
            {banca.map(a => (
              <li key={a.idAlineacion} className="flex min-h-12 items-center gap-3 rounded-xl border border-neutral-800 px-3 py-1.5 text-gray-300">
                <span className="w-12 shrink-0 text-center font-display text-2xl">{a.dorsal ?? '–'}</span>
                <span className="min-w-0 flex-1 truncate">{a.jugador}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {fuera.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-gray-300">Salieron ({fuera.length})</h2>
          <ul className="space-y-1.5">
            {fuera.map(a => (
              <li key={a.idAlineacion} className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-1.5 text-gray-400">
                <span className="w-12 shrink-0 text-center font-display text-2xl">{a.dorsal ?? '–'}</span>
                <span className="min-w-0 flex-1 truncate line-through decoration-gray-500">{a.jugador}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function HojaJugador({ jugador, foto, minutoInicial, sinGoles, suplentes, tarjetas, onEvento, onCambio, onCerrar }) {
  const ref = useRef(null)
  const tituloId = useId()
  const minutoId = useId()
  const [minuto, setMinuto] = useState(String(minutoInicial))
  const [modoCambio, setModoCambio] = useState(false)
  useAtraparFoco(ref, { enfocarContenedor: true })

  const numero = Number(minuto)
  const minutoValido = Number.isInteger(numero) && numero >= 1 && numero <= 120
  const ajustar = (delta) => setMinuto(m => String(Math.max(1, Math.min(120, (Number(m) || minutoInicial) + delta))))
  const amarillas = tarjetas.filter(e => e.tipoEvento === 'TARJETA_AMARILLA').length

  const BOTONES = [
    { tipo: 'GOL', texto: 'Gol', icono: '⚽', clase: 'bg-green-500 text-black', goles: true },
    { tipo: 'TARJETA_AMARILLA', texto: amarillas ? '2.ª amarilla' : 'Amarilla', icono: '🟨', clase: 'bg-yellow-300 text-black' },
    { tipo: 'TARJETA_ROJA', texto: 'Roja', icono: '🟥', clase: 'bg-red-600 text-white' },
    { tipo: 'GOL_EN_CONTRA', texto: 'Gol en contra', icono: '🥅', clase: 'bg-neutral-200 text-black', goles: true },
  ]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/75" onClick={onCerrar} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1}
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onCerrar() } }}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-neutral-600 bg-neutral-950 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 focus:outline-none">
        <div className="mb-4 flex items-center gap-3">
          {foto && <FotoJugador url={foto} tam="h-16 w-16" />}
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="text-lg font-semibold leading-tight text-white">
              <span className="mr-2 font-display text-3xl align-middle">{jugador.dorsal ?? '–'}</span>{' '}{jugador.jugador}
            </h2>
            {amarillas > 0 && <p className="text-sm text-yellow-300">Ya tiene {amarillas} amarilla{amarillas > 1 ? 's' : ''}.</p>}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-200 hover:bg-neutral-800"><X size={22} aria-hidden="true" /></button>
        </div>

        <div className="mb-4">
          <label htmlFor={minutoId} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Minuto (del reloj, se puede cambiar)</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => ajustar(-1)} aria-label="Restar un minuto"
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-500 text-white"><Minus size={20} aria-hidden="true" /></button>
            <input id={minutoId} type="number" inputMode="numeric" min="1" max="120" value={minuto}
              onChange={e => setMinuto(e.target.value)} aria-invalid={!minutoValido}
              className="h-12 w-20 rounded-lg border border-neutral-500 bg-black text-center font-display text-2xl text-white" />
            <button type="button" onClick={() => ajustar(1)} aria-label="Sumar un minuto"
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-500 text-white"><Plus size={20} aria-hidden="true" /></button>
          </div>
          {!minutoValido && <p role="alert" className="mt-1.5 text-sm text-red-300">Escribe un minuto entre 1 y 120.</p>}
        </div>

        {!modoCambio ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {BOTONES.map(b => {
                const bloqueado = !minutoValido || (b.goles && sinGoles)
                return (
                  <button key={b.tipo} type="button" disabled={bloqueado} onClick={() => onEvento(b.tipo, numero)}
                    className={`flex h-20 flex-col items-center justify-center rounded-xl text-lg font-bold disabled:opacity-35 ${b.clase}`}>
                    <span aria-hidden="true" className="text-2xl leading-none">{b.icono}</span>
                    {b.texto}
                  </button>
                )
              })}
            </div>
            {sinGoles && <p className="mt-2 text-sm text-gray-300">Este partido es desierto o perdido por reglamento: no admite goles.</p>}
            <button type="button" onClick={() => setModoCambio(true)} disabled={suplentes.length === 0 || !minutoValido}
              className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-300 text-base font-bold text-sky-200 disabled:opacity-35">
              <RefreshCw size={18} aria-hidden="true" /> Cambio: sale este jugador
            </button>
            {suplentes.length === 0 && <p className="mt-1.5 text-center text-xs text-gray-300">No quedan suplentes en la banca.</p>}
          </>
        ) : (
          <div>
            <p className="mb-2 text-sm font-semibold text-white">¿Quién entra?</p>
            <ul className="space-y-2">
              {suplentes.map(s => (
                <li key={s.idAlineacion}>
                  <button type="button" onClick={() => onCambio(s, numero)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-neutral-600 bg-neutral-900 px-3 text-left">
                    <span className="w-12 shrink-0 text-center font-display text-3xl text-white">{s.dorsal ?? '–'}</span>
                    <span className="min-w-0 flex-1 truncate text-base text-white">{s.jugador}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setModoCambio(false)}
              className="mt-3 h-12 w-full rounded-xl border border-neutral-500 text-base text-white">Volver</button>
          </div>
        )}
      </div>
    </div>
  )
}

function FotoGrande({ url, nombre, dorsal, onCerrar }) {
  const ref = useRef(null)
  const tituloId = useId()
  useAtraparFoco(ref, { enfocarContenedor: true })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85" onClick={onCerrar} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1}
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onCerrar() } }}
        className="relative w-full max-w-sm rounded-2xl border border-neutral-600 bg-neutral-950 p-4 focus:outline-none">
        <div className="mb-3 flex items-center gap-2">
          <h2 id={tituloId} className="min-w-0 flex-1 text-lg font-semibold text-white">
            <span className="mr-2 font-display text-3xl align-middle">{dorsal ?? '–'}</span>{' '}{nombre}
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-200 hover:bg-neutral-800"><X size={22} aria-hidden="true" /></button>
        </div>
        {url
          ? <FotoJugador url={url} tam="aspect-square w-full" />
          : <p className="rounded-lg bg-neutral-900 py-12 text-center text-gray-300">Este jugador no tiene foto registrada.</p>}
      </div>
    </div>
  )
}

function VistaCierre({ partido, marcador, eventos, cambios, ladoDe, pendientes, sinConexion, onReintentar, onCerrar, cerrando, onSalir, vocal }) {
  const obsId = useId()
  const [observaciones, setObservaciones] = useState(partido.observaciones ?? '')
  const registros = [
    ...eventos.map(e => ({ ...e, clase: 'evento', clave: e.uid ?? `e${e.idEvento}`, lado: ladoDe(e.idJugador) })),
    ...cambios.map(c => ({ ...c, clase: 'cambio', clave: c.uid ?? `c${c.idCambio}`, lado: c.idEquipo === partido.idEquipoLocal ? 'local' : 'visitante' })),
  ].sort((a, b) => a.minuto - b.minuto)

  return (
    <section aria-label="Resumen del partido" className="space-y-4">
      <div className="rounded-2xl border border-neutral-600 bg-neutral-900 p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-gray-300">{formatearFecha(partido.fecha)}{partido.estadio ? ` · ${partido.estadio}` : ''}</p>
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="text-right text-base font-semibold text-white">{partido.equipoLocal}</p>
          <p className="font-display text-5xl tabular-nums text-white">{marcador.local} – {marcador.visitante}</p>
          <p className="text-left text-base font-semibold text-white">{partido.equipoVisitante}</p>
        </div>
        {estaCerrado(partido) && (
          <p className="mt-2 text-sm font-semibold text-green-400">
            Partido cerrado{partido.cerradoPor ? ` por ${partido.cerradoPor}` : ''} y marcado como jugado.
          </p>
        )}
        {(partido.desierto || partido.perdidaReglamento) && (
          <p className="mt-2 text-sm text-amber-300">{partido.desierto ? 'Marcado como desierto.' : 'Perdido por reglamento (3-0).'} El resultado oficial lo define la planilla.</p>
        )}
      </div>

      {pendientes > 0 && (
        <div role="alert" className="rounded-xl border border-amber-400 bg-amber-950/70 p-3 text-amber-50">
          <p className="font-semibold">Faltan {pendientes} {pendientes === 1 ? 'registro' : 'registros'} por enviar.</p>
          <p className="text-sm">{sinConexion ? 'No hay conexión. Se enviarán solos cuando vuelva la señal.' : 'Se están enviando.'} El partido se puede cerrar cuando todo esté enviado.</p>
          <button type="button" onClick={onReintentar} className="mt-2 h-11 rounded-lg bg-amber-400 px-4 text-sm font-bold text-black">Reintentar ahora</button>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-300">Registros del partido ({registros.length})</h2>
        {registros.length === 0 && <p className="text-sm text-gray-300">Todavía no hay goles, tarjetas ni cambios.</p>}
        <ol className="space-y-1.5">
          {registros.map(r => (
            <li key={r.clave} className="flex items-start gap-3 rounded-lg bg-neutral-900 px-3 py-2">
              <span className="w-9 shrink-0 font-display text-xl tabular-nums text-white">{r.minuto}&apos;</span>
              <span className="min-w-0 flex-1 text-sm text-gray-100">
                {r.clase === 'evento'
                  ? <><span aria-hidden="true" className="mr-1">{ICONO_EVENTO[r.tipoEvento]}</span>{ETIQUETA_EVENTO[r.tipoEvento]} · {r.jugador}</>
                  : <><span aria-hidden="true" className="mr-1">🔄</span>Cambio · sale {r.jugadorSale}, entra {r.jugadorEntra}</>}
                <span className="block text-xs text-gray-300">
                  {r.lado === 'local' ? partido.equipoLocal : r.lado === 'visitante' ? partido.equipoVisitante : ''}
                  {r.pendiente && <span className="ml-2 font-semibold text-amber-300">por enviar</span>}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {vocal ? (
        <>
          {!estaCerrado(partido) && (
            <div>
              <label htmlFor={obsId} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Observaciones (opcional)</label>
              <textarea id={obsId} rows={4} maxLength={2000} value={observaciones} onChange={e => setObservaciones(e.target.value)}
                placeholder="Novedades del partido: incidentes, demoras, reclamos..."
                className="w-full rounded-lg border border-neutral-500 bg-black px-3 py-2 text-base text-white placeholder:text-gray-500" />
            </div>
          )}
          {estaCerrado(partido) && partido.observaciones && (
            <p className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-gray-100"><span className="text-gray-300">Observaciones:</span> {partido.observaciones}</p>
          )}
          <p className="text-sm text-gray-300">El partido desierto y el perdido por reglamento los registra el organizador.</p>
        </>
      ) : (
        <p className="text-sm text-gray-300">
          Las observaciones, el partido desierto y el perdido por reglamento se registran en la planilla del partido.
        </p>
      )}

      {estaCerrado(partido) ? (
        <button type="button" onClick={onSalir} className="h-14 w-full rounded-xl bg-white text-base font-bold text-black">{vocal ? 'Volver a mis partidos' : 'Volver a la jornada'}</button>
      ) : (
        <button type="button" onClick={() => onCerrar(observaciones.trim())} disabled={pendientes > 0 || cerrando}
          className="h-14 w-full rounded-xl bg-green-500 text-base font-bold text-black disabled:opacity-40">
          {cerrando ? 'Cerrando...' : 'Cerrar partido y marcarlo como jugado'}
        </button>
      )}
    </section>
  )
}
