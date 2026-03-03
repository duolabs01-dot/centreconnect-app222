'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FormMode = 'parent' | 'ecd' | 'admin'

export function FormShell({
  title,
  description,
  onClose,
  children,
  footer,
  className,
  mode = 'parent'
}: {
  title: string
  description?: string
  onClose?: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  mode?: FormMode
}) {
  const isParent = mode === 'parent'
  const isEcd = mode === 'ecd'

  return (
    <div className={cn('flex flex-col h-full max-h-full bg-white', className)}>
      <div className={cn(
        "flex items-start justify-between gap-4 px-6 py-6 border-b shrink-0",
        isParent ? "border-slate-100 bg-white" : "border-teal-50 bg-teal-50/10"
      )}>
        <div className="min-w-0">
          <h2 className={cn(
            "text-xl font-black tracking-tight leading-snug",
            isParent ? "text-slate-900" : "text-teal-900"
          )}>{title}</h2>
          {description && (
            <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">{description}</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "shrink-0 p-2 rounded-2xl transition-colors",
              isParent 
                ? "text-slate-400 hover:text-slate-900 hover:bg-slate-50" 
                : "text-teal-400 hover:text-teal-900 hover:bg-teal-50"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto px-6 py-8 space-y-6 min-h-0 [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full",
        isParent ? "hover:[&::-webkit-scrollbar-thumb]:bg-slate-200" : "hover:[&::-webkit-scrollbar-thumb]:bg-teal-100"
      )}>
        {children}
      </div>

      {footer && (
        <div className={cn(
          "shrink-0 px-6 py-6 border-t",
          isParent ? "border-slate-100 bg-slate-50/30" : "border-teal-50 bg-teal-50/20"
        )}>
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
  mode = 'parent'
}: {
  onCancel: () => void
  submitLabel?: string
  loading?: boolean
  destructive?: boolean
  disabled?: boolean
  formId?: string
  mode?: FormMode
}) {
  const isParent = mode === 'parent'
  const isEcd = mode === 'ecd'

  return (
    <div className="flex gap-3 justify-end items-center">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className={cn(
          "px-6 py-3 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50",
          isParent 
            ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50" 
            : "text-teal-600 hover:text-teal-900 hover:bg-teal-50"
        )}
      >
        Cancel
      </button>
      <button
        type="submit"
        form={formId}
        disabled={loading || disabled}
        className={cn(
          'px-8 py-3.5 rounded-2xl text-sm font-black text-white transition-colors shadow-lg',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          destructive 
            ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20' 
            : isParent 
              ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
              : 'bg-teal-600 hover:bg-teal-700 shadow-teal-900/20'
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {isParent ? 'Safeguarding...' : 'Processing...'}
          </span>
        ) : submitLabel}
      </button>
    </div>
  )
}

