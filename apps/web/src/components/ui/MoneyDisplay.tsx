export function MoneyDisplay({ paise, className = '' }: { paise: number; className?: string }) {
  const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(paise / 100)
  return <span className={`tabular-nums ${className}`} title={`${paise} paise`}>{formatted}</span>
}
