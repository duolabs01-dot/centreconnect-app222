'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateParentPreferencesAction } from '@/lib/actions/parents/update-preferences'

type PreferencesFormValues = {
  max_monthly_budget: string
  preferred_radius_km: string
  preferred_suburbs: string
  transport_needed: boolean
  preferred_start_month: string
}

type PreferencesFormProps = {
  initial: {
    max_monthly_budget?: number | null
    preferred_radius_km?: number | null
    preferred_suburbs?: string[] | null
    transport_needed?: boolean | null
    preferred_start_month?: string | null
  }
}

export function PreferencesForm({ initial }: PreferencesFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [radiusValue, setRadiusValue] = useState(
    String(initial.preferred_radius_km ?? 8)
  )

  const { register, handleSubmit } = useForm<PreferencesFormValues>({
    defaultValues: {
      max_monthly_budget: initial.max_monthly_budget?.toString() ?? '',
      preferred_radius_km: initial.preferred_radius_km?.toString() ?? '8',
      preferred_suburbs: (initial.preferred_suburbs ?? []).join(', '),
      transport_needed: initial.transport_needed ?? false,
      preferred_start_month: initial.preferred_start_month ?? '',
    },
  })
  const {
    ref: radiusRef,
    onChange: radiusOnChange,
    onBlur: radiusOnBlur,
  } = register('preferred_radius_km')

  const onSubmit = (values: PreferencesFormValues) => {
    startTransition(async () => {
      const result = await updateParentPreferencesAction({
        max_monthly_budget: values.max_monthly_budget ? Number(values.max_monthly_budget) : null,
        preferred_radius_km: values.preferred_radius_km ? Number(values.preferred_radius_km) : null,
        preferred_suburbs: values.preferred_suburbs.trim() || undefined,
        transport_needed: values.transport_needed,
        preferred_start_month: values.preferred_start_month || undefined,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Preferences saved')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-2xl border border-border bg-card/80 p-6">
      <div className="space-y-1">
        <Label htmlFor="preferred_start_month">Preferred start date</Label>
        <Input id="preferred_start_month" type="date" {...register('preferred_start_month')} />
        <p className="text-xs text-muted-foreground">Parents can tell you when they prefer the journey to begin for their child.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="max_monthly_budget">Maximum monthly budget (R)</Label>
        <Input id="max_monthly_budget" type="number" min="0" step="1" {...register('max_monthly_budget')} />
        <p className="text-xs text-muted-foreground">
          Set the maximum fee you want to see; this keeps marketplace filters precise.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="preferred_radius_km">Preferred radius (km)</Label>
        <div className="space-y-2 rounded-2xl border border-border bg-white/5 p-3">
          <input
            id="preferred_radius_km"
            type="range"
            min="1"
            max="40"
            step="1"
            defaultValue={radiusValue}
            onChange={(event) => {
              radiusOnChange(event)
              setRadiusValue(event.target.value)
            }}
            onBlur={radiusOnBlur}
            ref={radiusRef}
            className="w-full accent-cyan-600"
          />
          <p className="text-sm font-semibold text-foreground">{radiusValue} km</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Distance is always weighted heavily in our recommendations—tune this slider first for the most relevant centres.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="preferred_suburbs">Preferred suburbs</Label>
        <Input
          id="preferred_suburbs"
          placeholder="e.g. Sandton, Alexandra"
          {...register('preferred_suburbs')}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple suburbs with commas so we only show the most relevant centres.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" {...register('transport_needed')} className="h-4 w-4 rounded border border-border bg-background text-cyan-500" />
        Transport needed
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Preferences'}
        </Button>
      </div>
    </form>
  )
}
