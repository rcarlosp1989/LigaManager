export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6">
      <div className="min-w-0">
        <h2 className="font-display text-3xl sm:text-4xl text-white tracking-wide">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
