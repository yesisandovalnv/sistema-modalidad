import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text-primary)] shadow-[var(--card-shadow)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
