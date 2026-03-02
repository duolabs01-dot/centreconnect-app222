import Link from 'next/link'
import { Button } from '@/components/ui/button'

type EmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  checklist?: string[]
}

export function EmptyState({ title, description, actionLabel, actionHref, checklist }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {checklist && checklist.length > 0 ? (
        <div className="mx-auto mt-3 max-w-md rounded-2xl bg-slate-50 p-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next Steps</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {actionLabel && actionHref ? (
        <div className="mt-4">
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

