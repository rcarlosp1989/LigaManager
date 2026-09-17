const STATUS_MAP = {
  Planificado: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  EnCurso:     'bg-green-900/40  text-green-400  border border-green-800',
  Finalizado:  'bg-gray-800      text-gray-400   border border-gray-700',
}

export default function StatusBadge({ estado }) {
  return (
    <span className={`badge ${STATUS_MAP[estado] || STATUS_MAP.Planificado}`}>
      {estado === 'EnCurso' ? 'En Curso' : estado}
    </span>
  )
}