import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeMode } from './ThemeProvider'

const options: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: 'system', label: 'System (Auto)', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme()
  const selected = options.find((option) => option.value === mode) ?? options[0]
  const Icon = selected.icon
  return <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
    <Icon size={16} aria-hidden="true" />
    <span className={compact ? 'sr-only' : 'hidden sm:inline'}>Theme</span>
    <select aria-label="Theme" value={mode} onChange={(event) => setMode(event.target.value as ThemeMode)} className="border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {options.map((option) => <option key={option.value} value={option.value}>{compact ? option.label : option.label}</option>)}
    </select>
  </label>
}
