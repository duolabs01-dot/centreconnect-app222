import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-2xl border border-input/90 bg-gradient-to-b from-white to-slate-50/90 px-3 py-2 text-base text-foreground shadow-[var(--shadow-elevation-1)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-slate-600/80 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800/95 dark:text-slate-100 dark:placeholder:text-slate-400/90 dark:shadow-[var(--shadow-elevation-1)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }



