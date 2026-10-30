import { useState } from 'react'
import { ImageDown } from 'lucide-react'
import { useAviso } from '../feedback/contextos'
import { generarFlyer, compartirFlyer } from '../utils/flyer'

// «Compartir flyer» de una jornada: arma la imagen con sus partidos y la comparte con un mensaje
// que lleva el enlace público del campeonato (en el celular abre el menú de compartir, con
// WhatsApp; en el computador descarga la imagen y copia el mensaje).
// jornada: { numero, instancia, grupo }; partidos: [{ fecha, local, visitante, logoLocal, logoVisitante, estadio }]
// enlace: dirección del enlace para aficionados, o null si el campeonato no tiene.
export default function BotonFlyer({ campeonato, jornada, partidos, enlace, className = '' }) {
  const aviso = useAviso()
  const [generando, setGenerando] = useState(false)
  if (!partidos?.length) return null

  const compartir = async () => {
    setGenerando(true)
    try {
      const blob = await generarFlyer({ campeonato, numero: jornada.numero, instancia: jornada.instancia, grupo: jornada.grupo, partidos })
      if (!blob) throw new Error('sin imagen')
      const texto = enlace
        ? `${campeonato} · Jornada ${jornada.numero}. Siga los partidos en vivo: ${enlace}`
        : `${campeonato} · Jornada ${jornada.numero}.`
      const archivo = `jornada_${jornada.numero}_${String(campeonato).replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 40)}.png`
      const r = await compartirFlyer(blob, { archivo, texto })
      if (r === 'descargado' || r === 'descargado_sin_texto') {
        aviso.exito(!enlace
          ? 'Flyer descargado. Para incluir el enlace en vivo, cree el enlace para aficionados en la pestaña Dirigentes.'
          : r === 'descargado'
            ? 'Flyer descargado. El mensaje con el enlace se copió: péguelo al enviar la imagen.'
            : `Flyer descargado. Envíelo junto con este enlace: ${enlace}`)
      }
    } catch {
      aviso.error('No se pudo crear el flyer. Inténtelo de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button type="button" onClick={compartir} disabled={generando}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-700 px-3 py-2 text-sm text-brand-300 hover:bg-brand-900/30 disabled:opacity-50 ${className}`}>
      <ImageDown size={16} aria-hidden="true" />{generando ? 'Creando flyer...' : 'Compartir flyer'}
    </button>
  )
}
