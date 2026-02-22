'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { FormShell, FormFooter } from '@/components/ui/form-shell'
import { Input } from '@/components/ui/input'
import { Smartphone, MessageSquare, PenLine, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { addGuardianAction } from '@/lib/actions/guardians/add-guardian'

type ImportSource = 'device_contacts' | 'whatsapp' | 'manual'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().email().nullable(),
  relationship: z.string().min(2, 'e.g. Father, Grandmother'),
})

type Values = z.infer<typeof schema>

export function AddGuardianSheet({
  open,
  childId,
  onClose,
  onSuccess,
}: {
  open: boolean
  childId: string
  onClose: () => void
  onSuccess?: () => void
}) {
  const router = useRouter()
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [source, setSource] = useState<ImportSource>('manual')
  const [loading, setLoading] = useState(false)

  const importSources = [
    {
      key: 'device_contacts' as const,
      icon: Smartphone,
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      label: 'Import from Contacts',
      sub: 'Pick from your phone',
      action: async () => {
        if (!('contacts' in navigator)) {
          toast.info('Contact picker not available; enter manually.')
          setSource('manual')
          setStep('form')
          return
        }
        try {
          // @ts-ignore
          const [contact] = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: false })
          if (contact) {
            form.setValue('full_name', contact.name?.[0] ?? '')
            form.setValue('phone', contact.tel?.[0] ?? '')
            form.setValue('email', contact.email?.[0] ?? '')
          }
          setSource('device_contacts')
          setStep('form')
        } catch {
          toast.error('Unable to open your contacts. Please enter details manually.')
          setSource('manual')
          setStep('form')
        }
      },
    },
    {
      key: 'whatsapp' as const,
      icon: MessageSquare,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      label: 'Import via WhatsApp',
      sub: 'Copy details from a chat',
      action: () => {
        toast.info('Copy their name + number from WhatsApp, then paste below.', { duration: 7000 })
        setSource('whatsapp')
        setStep('form')
      },
    },
    {
      key: 'manual' as const,
      icon: PenLine,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      label: 'Enter manually',
      sub: 'Type the guardian’s details',
      action: () => {
        setSource('manual')
        setStep('form')
      },
    },
  ]

  const tryDeviceContacts = importSources[0].action

  const onSubmit = async (values: Values) => {
    if (!childId) return
    setLoading(true)
    try {
      const result = await addGuardianAction({
        child_id: childId,
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || null,
        relationship: values.relationship,
        import_source: source,
        can_pickup: true,
        can_view_applications: true,
        can_receive_announcements: true,
        can_generate_pickup_code: false,
      })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${values.full_name} added as co-guardian`)
      onSuccess?.()
      onClose()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setStep('pick')
          onClose()
        }
      }}
    >
      <SheetContent side="right" className="w-full max-w-md p-0">
        {step === 'pick' ? (
          <FormShell
            title="Add Co-Guardian"
            description="Co-guardians can view applications, receive updates, and help with pickups."
            onClose={onClose}
          >
            <div className="space-y-3">
              {importSources.map((sourceOption) => {
                const Icon = sourceOption.icon
                return (
                  <button
                    type="button"
                    key={sourceOption.key}
                    onClick={sourceOption.action}
                    className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-left transition-colors hover:border-cyan-500/50 hover:bg-white/5"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${sourceOption.iconBg}`}>
                      <Icon className={`h-5 w-5 ${sourceOption.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{sourceOption.label}</p>
                      <p className="text-xs text-slate-400">{sourceOption.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </FormShell>
        ) : (
          <FormShell
            title="Co-Guardian Details"
            description={
              source === 'device_contacts'
                ? '✓ Pre-filled from your contacts — please verify.'
                : source === 'whatsapp'
                  ? 'Paste the details copied from WhatsApp below.'
                  : 'Enter the co-guardian’s information.'
            }
            onClose={onClose}
            footer={
              <div className="space-y-3">
                <FormFooter onCancel={onClose} submitLabel="Add Co-Guardian" loading={loading} formId="guardian-form" />
                <button
                  type="button"
                  onClick={() => setStep('pick')}
                  className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" /> Change import method
                </button>
              </div>
            }
          >
            <form id="guardian-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <GField label="Full Name *" error={form.formState.errors.full_name?.message}>
                <Input {...form.register('full_name')} placeholder="Guardian name" />
              </GField>
              <GField label="Phone *" error={form.formState.errors.phone?.message}>
                <Input {...form.register('phone')} type="tel" placeholder="0XX XXX XXXX" />
              </GField>
              <GField label="Email (optional)" error={form.formState.errors.email?.message}>
                <Input {...form.register('email')} type="email" placeholder="Optional email" />
              </GField>
              <GField label="Relationship *" error={form.formState.errors.relationship?.message}>
                <Input {...form.register('relationship')} placeholder="e.g. Aunt, Co-parent" />
              </GField>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">What they can do</p>
                {[
                  [true, 'View application status'],
                  [true, 'Receive centre announcements'],
                  [true, 'Authorised for child pickup'],
                  [false, 'Generate pickup codes'],
                  [false, 'Submit applications'],
                  [false, 'Accept enrolment offers'],
                ].map(([allowed, label]) => (
                  <div key={label as string} className="flex items-center gap-2 pt-2 text-sm">
                    <span className={allowed ? 'text-emerald-400' : 'text-slate-500'}>{allowed ? '✓' : '✗'}</span>
                    <span className={allowed ? '' : 'opacity-60'}>{label as string}</span>
                  </div>
                ))}
              </div>
            </form>
          </FormShell>
        )}
      </SheetContent>
    </Sheet>
  )
}

function GField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-200">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
