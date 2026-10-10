// icon: un ícono de lucide-react (por ejemplo Shield) o, como antes, un texto.
export default function EmptyState({ icon: Icono, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {typeof Icono === 'string'
        ? <span className="text-5xl mb-4">{Icono}</span>
        : Icono && <Icono size={44} strokeWidth={1.5} aria-hidden="true" className="mb-4 text-gray-600" />}
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      <p className="text-gray-400 text-sm max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}
