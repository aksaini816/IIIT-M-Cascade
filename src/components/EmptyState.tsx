export const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
    <p className="font-semibold text-slate-700">{title}</p>
    <p className="mt-2 text-sm text-slate-500">{body}</p>
  </div>
)
