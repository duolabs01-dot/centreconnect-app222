'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { FormFooter, FormShell } from '@/components/ui/form-shell'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, MessageSquare, PenLine, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { addGuardianAction } from '@/lib/actions/guardians/add-guardian'
import { useBottomNav } from '@/lib/context/BottomNavProvider'

type ImportSource = 'device_contacts' | 'whatsapp' | 'manual'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().email().nullable()
  ),
  relationship: z.string().min(2, 'e.g. Father, Grandmother'),
})

type Values = z.infer<typeof schema>

type ChildOption = {
  id: string
  first_name: string
  last_name: string
}

function parseWhatsappContact(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return { name: '', phone: '', email: '' }
  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const emailMatch = trimmed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const phoneMatch = trimmed.match(/(\+?\d[\d\s()\-]{7,}\d)/)
  const nameCandidate = lines[0]?.replace(/[:\-]$/, '') || ''
  return {
    name: nameCandidate,
    phone: phoneMatch?.[1]?.replace(/\s+/g, ' ') || '',
    email: emailMatch?.[0] || '',
  }
}

export function AddGuardianSheet({
  open,
  childId,
  childOptions,
  onClose,
  onSuccess,
}: {
  open: boolean
  childId: string
  childOptions: ChildOption[]
  onClose: () => void
  onSuccess?: () => void
}) {
  const router = useRouter()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: null } })
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [source, setSource] = useState<ImportSource>('manual')
  const [loading, setLoading] = useState(false)
  const [quickPaste, setQuickPaste] = useState('')
  const [linkAllChildren, setLinkAllChildren] = useState(false)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(childId ? [childId] : [])
  const [permissions, setPermissions] = useState({
    can_pickup: true,
    can_view_applications: true,
    can_receive_announcements: true,
    can_generate_pickup_code: false,
  })
  const { setVisible } = useBottomNav()

  useEffect(() => {
    if (open) {
      setVisible(false)
      setStep('pick')
      setSource('manual')
      form.reset({
        full_name: '',
        phone: '',
        email: null,
        relationship: '',
      })
      setQuickPaste('')
      setLinkAllChildren(false)
      setSelectedChildIds(childId ? [childId] : [])
      setPermissions({
        can_pickup: true,
        can_view_applications: true,
        can_receive_announcements: true,
        can_generate_pickup_code: false,
      })
    } else {
      setVisible(true)
    }
    return () => setVisible(true)
  }, [open, setVisible, childId, form])

  useEffect(() => {
    if (linkAllChildren) {
      setSelectedChildIds(childOptions.map((child) => child.id))
    } else if (selectedChildIds.length === 0 && childId) {
      setSelectedChildIds([childId])
    }
  }, [linkAllChildren, childOptions, selectedChildIds.length, childId])

  const allPermissionsEnabled = useMemo(
    () => Object.values(permissions).every(Boolean),
    [permissions]
  )

  const importSources = [
    {
      key: 'device_contacts' as const,
      icon: Smartphone,
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      label: 'Import from Contacts',
      sub: 'Pick from your phone contact list',
      action: async () => {
        if (!('contacts' in navigator)) {
          toast.info('Device contact picker not available. Use manual or WhatsApp paste.')
          setSource('manual')
          setStep('form')
          return
        }
        try {
          // @ts-ignore Contact Picker API support varies by browser.
          const [contact] = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: false })
          if (contact) {
            form.setValue('full_name', contact.name?.[0] ?? '')
            form.setValue('phone', contact.tel?.[0] ?? '')
            form.setValue('email', contact.email?.[0] ?? '')
          }
          setSource('device_contacts')
          setStep('form')
        } catch {
          toast.error('Unable to open contacts. Please continue manually.')
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
      label: 'Import from WhatsApp',
      sub: 'Paste contact details copied from a chat',
      action: () => {
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
      sub: 'Type details directly',
      action: () => {
        setSource('manual')
        setStep('form')
      },
    },
  ]

  function toggleChild(childOptionId: string) {
    setSelectedChildIds((current) => {
      if (current.includes(childOptionId)) {
        return current.filter((id) => id !== childOptionId)
      }
      return [...current, childOptionId]
    })
  }

  function applyQuickPaste() {
    const parsed = parseWhatsappContact(quickPaste)
    if (!parsed.name && !parsed.phone && !parsed.email) {
      toast.error('Could not detect a contact in the pasted text.')
      return
    }
    if (parsed.name) form.setValue('full_name', parsed.name)
    if (parsed.phone) form.setValue('phone', parsed.phone)
    if (parsed.email) form.setValue('email', parsed.email)
    toast.success('Contact details filled. Review and continue.')
  }

  function setAllPermissions(enabled: boolean) {
    setPermissions({
      can_pickup: enabled,
      can_view_applications: enabled,
      can_receive_announcements: enabled,
      can_generate_pickup_code: enabled,
    })
  }

  const onSubmit = async (values: Values) => {
    if (!selectedChildIds.length) {
      toast.error('Select at least one child for this co-parent.')
      return
    }

    setLoading(true)
    try {
      const result = await addGuardianAction({
        child_ids: selectedChildIds,
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || null,
        relationship: values.relationship,
        import_source: source,
        ...permissions,
      })

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        result.createdCount && result.createdCount > 1
          ? `Co-parent linked to ${result.createdCount} children.`
          : `${values.full_name} added as co-parent.`
      )
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
        if (!value) onClose()
      }}
    >
      <SheetContent side="right" className="w-full max-w-md p-0">
        {step === 'pick' ? (
          <FormShell
            title="Add Co-Parent"
            description="Import real contact details first, then choose children and access permissions."
            mode="parent"
          >
            <div className="space-y-3">
              {importSources.map((sourceOption) => {
                const Icon = sourceOption.icon
                return (
                  <button
                    type="button"
                    key={sourceOption.key}
                    onClick={sourceOption.action}
                    className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left transition-colors hover:border-cyan-200 hover:bg-slate-50"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${sourceOption.iconBg}`}>
                      <Icon className={`h-5 w-5 ${sourceOption.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{sourceOption.label}</p>
                      <p className="text-xs text-slate-500">{sourceOption.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </FormShell>
        ) : (
          <FormShell
            title="Co-Parent Details"
            description={
              source === 'device_contacts'
                ? 'Imported from contact list. Verify details and permissions below.'
                : source === 'whatsapp'
                  ? 'Paste copied details from WhatsApp, then confirm.'
                  : 'Enter details and choose access.'
            }
            mode="parent"
            footer={
              <div className="space-y-3">
                <FormFooter onCancel={onClose} submitLabel="Save Co-Parent" loading={loading} formId="guardian-form" mode="parent" />
                <button
                  type="button"
                  onClick={() => setStep('pick')}
                  className="px-1 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-cyan-600"
                >
                  <span className="inline-flex items-center gap-1">
                    <ChevronLeft className="h-3 w-3" /> Change import method
                  </span>
                </button>
              </div>
            }
          >
            <form id="guardian-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {source === 'whatsapp' ? (
                <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-emerald-700">Paste WhatsApp contact text</label>
                  <textarea
                    value={quickPaste}
                    onChange={(event) => setQuickPaste(event.target.value)}
                    placeholder="Example: Nomsa Khumalo, +27 82 123 4567, nomsa@email.com"
                    className="cc-native-field min-h-[80px] w-full rounded-xl border border-emerald-200 bg-white p-2 text-sm outline-none"
                  />
                  <Button type="button" size="sm" className="h-9 rounded-2xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700" onClick={applyQuickPaste}>
                    Fill from pasted text
                  </Button>
                </div>
              ) : null}

              <GField label="Full Name *" error={form.formState.errors.full_name?.message}>
                <Input {...form.register('full_name')} className="h-11 rounded-2xl" placeholder="Co-parent full name" />
              </GField>
              <GField label="Phone *" error={form.formState.errors.phone?.message}>
                <Input {...form.register('phone')} className="h-11 rounded-2xl" type="tel" placeholder="0XX XXX XXXX" />
              </GField>
              <GField label="Email (optional)" error={form.formState.errors.email?.message}>
                <Input {...form.register('email')} className="h-11 rounded-2xl" type="email" placeholder="name@email.com" />
              </GField>
              <GField label="Relationship *" error={form.formState.errors.relationship?.message}>
                <Input {...form.register('relationship')} className="h-11 rounded-2xl" placeholder="e.g. Father, Co-parent, Aunt" />
              </GField>

              {childOptions.length > 1 ? (
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Children to link</label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={linkAllChildren}
                      onChange={(event) => setLinkAllChildren(event.target.checked)}
                    />
                    Link this co-parent to all children
                  </label>
                  {!linkAllChildren ? (
                    <div className="space-y-2">
                      {childOptions.map((childOption) => (
                        <label key={childOption.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedChildIds.includes(childOption.id)}
                            onChange={() => toggleChild(childOption.id)}
                          />
                          {childOption.first_name} {childOption.last_name}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Permissions</p>
                  <button
                    type="button"
                    onClick={() => setAllPermissions(!allPermissionsEnabled)}
                    className="text-xs font-bold text-cyan-700 hover:text-cyan-900"
                  >
                    {allPermissionsEnabled ? 'Use custom' : 'Grant all'}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={permissions.can_view_applications}
                    onChange={(event) => setPermissions((current) => ({ ...current, can_view_applications: event.target.checked }))}
                  />
                  View applications
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={permissions.can_receive_announcements}
                    onChange={(event) => setPermissions((current) => ({ ...current, can_receive_announcements: event.target.checked }))}
                  />
                  Receive announcements
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={permissions.can_pickup}
                    onChange={(event) => setPermissions((current) => ({ ...current, can_pickup: event.target.checked }))}
                  />
                  Authorized pickup
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={permissions.can_generate_pickup_code}
                    onChange={(event) => setPermissions((current) => ({ ...current, can_generate_pickup_code: event.target.checked }))}
                  />
                  Generate pickup codes
                </label>
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
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
