import { cn } from '@/lib/utils'

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
}

export function SurfaceCard({ className, variant = 'default', children, ...props }: SurfaceCardProps) {
  return (
    <div className={cn(
      'rounded-squircle bg-surface p-5 transition-shadow duration-200',
      variant === 'default' && 'shadow-card hover:shadow-card-hover',
      variant === 'elevated' && 'shadow-float',
      variant === 'outlined' && 'border border-gray-100 shadow-none',
      className
    )} {...props}>{children}</div>
  )
}
