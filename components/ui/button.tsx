import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from 'lucide-react'

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-transparent text-sm font-semibold transition-colors transition-transform duration-200 ease-out active:translate-y-px active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "hover-lift bg-primary text-primary-foreground shadow-[var(--shadow-elevation-3)] hover:bg-primary/90 hover:shadow-[var(--shadow-elevation-3)]",
        destructive:
          "hover-lift bg-destructive text-destructive-foreground shadow-[var(--shadow-elevation-3)] hover:bg-destructive/90",
        outline:
          "hover-lift border-slate-200 bg-white text-slate-700 shadow-[var(--shadow-elevation-1)] hover:bg-slate-50 hover:text-slate-900 hover:shadow-[var(--shadow-elevation-3)]",
        secondary:
          "hover-lift bg-secondary text-secondary-foreground shadow-[var(--shadow-elevation-1)] hover:bg-secondary/80",
        ghost: "hover-lift text-slate-500 hover:text-slate-900 hover:bg-slate-50",
        link: "text-cyan-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 rounded-2xl px-4 text-xs",
        lg: "h-14 rounded-2xl px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  'aria-describedby'?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || 'Loading...'}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

