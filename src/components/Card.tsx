export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm transition hover:shadow-md ${className}`}>{children}</section>
)
