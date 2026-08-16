import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = {
  default: 'app-button--primary',
  secondary: 'app-button--secondary',
  outline: 'app-button--outline border',
  ghost: 'app-button--ghost',
}

const Button = forwardRef(({ className, variant = 'default', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  )
})

Button.displayName = 'Button'

export { Button }
