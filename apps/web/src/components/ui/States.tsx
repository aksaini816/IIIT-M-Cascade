import { AlertCircle, FileQuestion, LoaderCircle } from 'lucide-react'

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><FileQuestion className="mx-auto mb-3 text-slate-400" size={28} /><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>
}
export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} aria-label="Loading" />
}
export function ErrorBanner({ message }: { message: string }) {
  return <div role="alert" className="flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900"><AlertCircle size={18} /><span>{message}</span></div>
}
export function LoadingIndicator() {
  return <LoaderCircle className="animate-spin text-blue-700" size={18} aria-label="Loading" />
}
