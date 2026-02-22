import { cn } from '@/lib/utils'

type StepperProps = {
  status: string
}

function decisionLabel(status: string) {
  if (status === 'enrolled') return 'Enrolled'
  if (status === 'approved') return 'Accepted'
  if (status === 'waitlisted') return 'Waitlisted'
  if (status === 'rejected') return 'Rejected'
  if (status === 'withdrawn') return 'Withdrawn'
  return 'Decision'
}

export function Stepper({ status }: StepperProps) {
  const steps = [
    { label: 'Submitted', reached: true },
    { label: 'In Review', reached: status !== 'submitted' },
    { label: decisionLabel(status), reached: ['approved', 'enrolled', 'waitlisted', 'rejected', 'withdrawn'].includes(status) },
  ]

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step.label} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                step.reached ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-300 text-slate-500'
              )}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 ? (
              <div className={cn('h-0.5 flex-1 rounded', step.reached ? 'bg-primary/70' : 'bg-slate-200')} />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
        {steps.map((step) => (
          <p key={step.label} className="truncate">
            {step.label}
          </p>
        ))}
      </div>
    </div>
  )
}
