import * as React from 'react'

import { cn } from '@/lib/utils'

type PageHeaderTone = 'default' | 'parent' | 'admin'
type PageHeaderAlign = 'left' | 'center'

const TONE_STYLES: Record<
  PageHeaderTone,
  {
    accent: string
    eyebrow: string
    title: string
    description: string
  }
> = {
  default: {
    accent: 'bg-slate-300',
    eyebrow: 'text-slate-500',
    title: 'text-slate-950',
    description: 'text-slate-600',
  },
  parent: {
    accent: 'bg-teal-600',
    eyebrow: 'text-teal-600',
    title: 'text-stone-800',
    description: 'text-stone-600',
  },
  admin: {
    accent: 'bg-cyan-400',
    eyebrow: 'text-cyan-200',
    title: 'text-slate-50',
    description: 'text-slate-400',
  },
}

type PageHeaderProps = {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  tone?: PageHeaderTone
  align?: PageHeaderAlign
  className?: string
  contentClassName?: string
  actionsClassName?: string
  eyebrowClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  tone = 'default',
  align = 'left',
  className,
  contentClassName,
  actionsClassName,
  eyebrowClassName,
  titleClassName,
  descriptionClassName,
}: PageHeaderProps) {
  const toneStyles = TONE_STYLES[tone]
  const isCentered = align === 'center'

  return (
    <div
      className={cn(
        'flex flex-col gap-5 md:flex-row md:items-end md:justify-between',
        isCentered && 'md:flex-col md:items-center',
        className
      )}
    >
      <div className={cn('space-y-3', isCentered && 'text-center', contentClassName)}>
        {eyebrow ? (
          <div className={cn('flex items-center gap-2', isCentered && 'justify-center')}>
            <span className={cn('h-2 w-2 rounded-full', toneStyles.accent)} aria-hidden />
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.18em]',
                toneStyles.eyebrow,
                eyebrowClassName
              )}
            >
              {eyebrow}
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          <h1 className={cn('text-3xl font-semibold tracking-tight sm:text-4xl', toneStyles.title, titleClassName)}>
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                'max-w-2xl text-sm leading-6 sm:text-base',
                toneStyles.description,
                isCentered && 'mx-auto',
                descriptionClassName
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        {children ? <div className={cn('pt-1', isCentered && 'mx-auto')}>{children}</div> : null}
      </div>

      {actions ? (
        <div className={cn('flex flex-wrap items-center gap-3', isCentered && 'justify-center', actionsClassName)}>
          {actions}
        </div>
      ) : null}
    </div>
  )
}
