'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateParentPreferencesAction } from '@/lib/actions/parents/update-preferences'
import { reportParentSubmitFailure } from '@/lib/telemetry/parent-submit-failures.client'
import { SurfaceCard } from '@/components/ui/surface-card'
import { Calendar, Wallet, Map, Truck, Navigation, Save, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const { register, handleSubmit, watch } = useForm<PreferencesFormValues>({
    defaultValues: {
      max_monthly_budget: initial.max_monthly_budget?.toString() ?? '',
      preferred_radius_km: initial.preferred_radius_km?.toString() ?? '8',
      preferred_suburbs: (initial.preferred_suburbs ?? []).join(', '),
      transport_needed: initial.transport_needed ?? false,
      preferred_start_month: initial.preferred_start_month ?? '',
    },
  })

  const transportNeeded = watch('transport_needed')

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
        reportParentSubmitFailure({
          route: '/parent/preferences',
          form: 'preferences_update',
          failureType: 'submit_failed',
          message: result.error,
        })
        toast.error(result.error)
        return
      }

      toast.success('Preferences saved')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
      <div className="grid gap-6">

        {/* Timeline Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4 text-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timing</p>
          </div>
          <SurfaceCard className="p-6">
            <div className="space-y-2">
              <Label htmlFor="preferred_start_month" className="text-sm font-bold text-slate-900">Preferred Start Date</Label>
              <Input
                id="preferred_start_month"
                type="date"
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-4"
                {...register('preferred_start_month')}
              />
              <p className="text-[10px] text-slate-500 font-medium px-1">Helps centres plan for your child&apos;s entry.</p>
            </div>
          </SurfaceCard>
        </div>

        {/* Budget Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Wallet className="h-4 w-4 text-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Finance</p>
          </div>
          <SurfaceCard className="p-6">
            <div className="space-y-2">
              <Label htmlFor="max_monthly_budget" className="text-sm font-bold text-slate-900">Max Monthly Fee (R)</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">R</div>
                <Input
                  id="max_monthly_budget"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 3500"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold pl-10"
                  {...register('max_monthly_budget')}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium px-1">
                We&apos;ll prioritise centres that fit within your budget.
              </p>
            </div>
          </SurfaceCard>
        </div>

        {/* Proximity Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Navigation className="h-4 w-4 text-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Discovery Radius</p>
          </div>
          <SurfaceCard className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="preferred_radius_km" className="text-sm font-bold text-slate-900">Distance Range</Label>
                <span className="text-sm font-black text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full">{radiusValue} km</span>
              </div>
              <div className="space-y-2">
                <input
                  id="preferred_radius_km"
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  defaultValue={radiusValue}
                  onChange={(event) => {
                    radiusOnChange(event)
                    setRadiusValue(event.target.value)
                  }}
                  onBlur={radiusOnBlur}
                  ref={radiusRef}
                  className="w-full accent-cyan-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                  <span>1 km</span>
                  <span>25 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>

        {/* Suburbs Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Search className="h-4 w-4 text-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Area Focus</p>
          </div>
          <SurfaceCard className="p-6">
            <div className="space-y-2">
              <Label htmlFor="preferred_suburbs" className="text-sm font-bold text-slate-900">Target Suburbs</Label>
              <Input
                id="preferred_suburbs"
                placeholder="e.g. Sandton, Alexandra"
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold px-4"
                {...register('preferred_suburbs')}
              />
              <p className="text-[10px] text-slate-500 font-medium px-1">
                Comma-separated list for precise matching.
              </p>
            </div>
          </SurfaceCard>
        </div>

        {/* Transport Toggle */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Truck className="h-4 w-4 text-cyan-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Logistics</p>
          </div>
          <SurfaceCard
            className={cn(
              "p-6 transition-all duration-300 border-l-4",
              transportNeeded ? "border-l-emerald-500 bg-emerald-50/10" : "border-l-transparent"
            )}
          >
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                  transportNeeded ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"
                )}>
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 leading-tight">Transport Service</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tight">Pick up/drop off needed</p>
                </div>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('transport_needed')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </div>
            </label>
          </SurfaceCard>
        </div>
      </div>

      <div className="pt-4 sticky bottom-24 z-10 px-1">
        <Button
          type="submit"
          disabled={isPending}
          size="lg"
          className="w-full h-16 rounded-[2rem] text-lg font-black shadow-float bg-slate-900 hover:bg-slate-800 text-white transition-all active:scale-[0.98]"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Save className="h-5 w-5 animate-pulse" />
              Saving preferences...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Preferences
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}
