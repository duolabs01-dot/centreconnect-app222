'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FormShell({
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: {
  title: string
  description?: string
  onClose?: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col h-full max-h-full bg-transparent', className)}>
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground leading-snug">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">{children}</div>

      {footer && (
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/20">
          {footer}
        </div>
      )}
    </div>
  )
}

export function FormFooter({
  onCancel,
  submitLabel = 'Save',
  loading = false,
  destructive = false,
  disabled = false,
  formId,
}: {
  onCancel: () => void
  submitLabel?: string
  loading?: boolean
  destructive?: boolean
  disabled?: boolean
  formId?: string
}) {
  return (
    <div className="flex gap-2.5 justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form={formId}
        disabled={loading || disabled}
        className={cn(
          'px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          destructive ? 'bg-destructive hover:bg-destructive/90' : 'bg-cyan-600 hover:bg-cyan-500'
        )}
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}
