import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown) }, [open, onClose])
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="w-full max-w-lg rounded-md border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 id="modal-title" className="font-semibold text-slate-900">{title}</h2><button className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div><div className="p-5">{children}</div></div></div>
}
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onCancel, onConfirm }: { open: boolean; title: string; message: string; confirmLabel?: string; onCancel: () => void; onConfirm: () => void }) {
  return <Modal open={open} title={title} onClose={onCancel}><p className="text-sm text-slate-600">{message}</p><div className="mt-6 flex justify-end gap-3"><button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" onClick={onCancel}>Cancel</button><button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" onClick={onConfirm}>{confirmLabel}</button></div></Modal>
}
export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown) }, [open, onClose])
  if (!open) return null
  return <div className="fixed inset-0 z-50 bg-slate-900/40" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><button className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} aria-label="Close drawer" /><aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 id="drawer-title" className="font-semibold text-slate-900">{title}</h2><button className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close drawer"><X size={18} /></button></div><div className="p-5">{children}</div></aside></div>
}
