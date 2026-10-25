export const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
  <header>
    <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
    {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
  </header>
)
