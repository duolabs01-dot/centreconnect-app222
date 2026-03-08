'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Section } from '@/components/layout/Section'
import { TurnstileWidget } from '@/components/security/turnstile-widget'
import {
  PUBLIC_PLAN_OPTIONS,
  getPublicPlanDefinition,
  getPublicPlanLabel,
  getPublicPlanPrice,
  isKnownPlanAlias,
  toInternalTier,
  toPublicPlan,
  type PublicPlan,
} from '@/lib/billing/plans'

type PublicTier = PublicPlan
type WizardStep = 1 | 2 | 3 | 4
type RegisterFormState = {
  fullName: string
  email: string
  phone: string
  centreName: string
  centrePhone: string
  centreAddress: string
  centreSuburb: string
  centreCity: string
  centreProvince: string
  operatorRole: string
  registrationStatus: string
  yearsOperating: string
  currentChildren: string
  staffCount: string
  ageGroups: string[]
  operatingHours: string
  monthlyBudget: string
  expectedChildren: string
  selectedTier: PublicTier
  keyNeeds: string[]
  additionalContext: string
  claimSlug: string
}

const TIER_PRICES: Record<PublicTier, number> = {
  starter: getPublicPlanPrice('starter'),
  growth: getPublicPlanPrice('growth'),
  pro: getPublicPlanPrice('pro'),
}

const TIER_DESCRIPTIONS: Record<PublicTier, string> = {
  starter: getPublicPlanDefinition('starter').description,
  growth: getPublicPlanDefinition('growth').description,
  pro: getPublicPlanDefinition('pro').description,
}

const TIER_BENEFITS: Record<PublicTier, string[]> = {
  starter: getPublicPlanDefinition('starter').includes,
  growth: getPublicPlanDefinition('growth').includes,
  pro: getPublicPlanDefinition('pro').includes,
}

const TIER_PACKAGE_DETAILS: Record<
  PublicTier,
  { bestFor: string; packageIncludes: string[]; outcomes: string[] }
> = {
  starter: {
    bestFor: 'Community and small centres starting digital admissions.',
    packageIncludes: getPublicPlanDefinition('starter').includes,
    outcomes: getPublicPlanDefinition('starter').outcomes,
  },
  growth: {
    bestFor: 'Growing centres handling more children and daily operations.',
    packageIncludes: getPublicPlanDefinition('growth').includes,
    outcomes: getPublicPlanDefinition('growth').outcomes,
  },
  pro: {
    bestFor: 'Established centres scaling admissions, operations, and visibility.',
    packageIncludes: getPublicPlanDefinition('pro').includes,
    outcomes: getPublicPlanDefinition('pro').outcomes,
  },
}

const PLAN_OPTIONS: PublicTier[] = [...PUBLIC_PLAN_OPTIONS]
const REGISTER_DRAFT_STORAGE_KEY = 'cc-ecd-register-draft-v1'
const REGISTER_FAST_TRACK_KEY = 'cc-ecd-register-fast-track'

const STEP_TITLES: Record<WizardStep, string> = {
  1: 'You and your centre',
  2: 'How your centre runs',
  3: 'Pick your package',
  4: 'One last check',
}

const AGE_GROUP_OPTIONS = ['0-2 years', '2-4 years', '4-6 years', 'Aftercare (6+)']

const NEED_OPTIONS = [
  'Admissions pipeline',
  'Billing and subscriptions',
  'Parent communications',
  'Staff collaboration tools',
  'Website/profile visibility',
  'Analytics and reporting',
]

function recommendTier(monthlyBudget: number, expectedChildren: number): PublicTier {
  if (monthlyBudget <= 250 || expectedChildren <= 40) return 'starter'
  if (monthlyBudget <= 450 || expectedChildren <= 100) return 'growth'
  return 'pro'
}

function toggleArrayValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function formatClaimSlug(slug: string) {
  return slug
    .split(/[-_]/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function hasFastTrackCoreDetails(values: { fullName: string; email: string; centreName: string }) {
  return Boolean(values.fullName.trim() && values.email.trim() && values.centreName.trim())
}

export default function EcdRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || ''
  const requestedPlanParam = (searchParams.get('plan') || '').toLowerCase()
  const flowParam = (searchParams.get('flow') || '').toLowerCase()
  const fastTrackRequested = (searchParams.get('fast') || '').trim() === '1'
  const claimSlugParam = (searchParams.get('claim') || '').trim()
  const hasPresetPlan = isKnownPlanAlias(requestedPlanParam)
  const isConfirmFlow = hasPresetPlan && flowParam === 'confirm'
  const initialSelectedTier: PublicTier = toPublicPlan(requestedPlanParam, 'growth')
  const presetPlanLabel = getPublicPlanLabel(initialSelectedTier)
  const [step, setStep] = useState<WizardStep>(1)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [draftHydrated, setDraftHydrated] = useState(false)
  const initialFormState = useMemo<RegisterFormState>(
    () => ({
      fullName: '',
      email: '',
      phone: '',
      centreName: claimSlugParam ? formatClaimSlug(claimSlugParam) : '',
      centrePhone: '',
      centreAddress: '',
      centreSuburb: '',
      centreCity: 'Johannesburg',
      centreProvince: 'Gauteng',
      operatorRole: '',
      registrationStatus: 'Unregistered / Community-based',
      yearsOperating: '0',
      currentChildren: '0',
      staffCount: '0',
      ageGroups: ['2-4 years', '4-6 years'],
      operatingHours: '',
      monthlyBudget: '299',
      expectedChildren: '60',
      selectedTier: initialSelectedTier,
      keyNeeds: ['Admissions pipeline', 'Parent communications'],
      additionalContext: '',
      claimSlug: claimSlugParam,
    }),
    [claimSlugParam, initialSelectedTier]
  )
  const [form, setForm] = useState<RegisterFormState>(initialFormState)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let merged = initialFormState
    try {
      const saved = window.localStorage.getItem(REGISTER_DRAFT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<RegisterFormState>
        const parsedSelectedTier =
          typeof parsed.selectedTier === 'string' && PLAN_OPTIONS.includes(parsed.selectedTier as PublicTier)
            ? (parsed.selectedTier as PublicTier)
            : initialFormState.selectedTier

        merged = {
          ...initialFormState,
          ...parsed,
          ageGroups: Array.isArray(parsed.ageGroups)
            ? parsed.ageGroups.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : initialFormState.ageGroups,
          keyNeeds: Array.isArray(parsed.keyNeeds)
            ? parsed.keyNeeds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : initialFormState.keyNeeds,
          selectedTier: hasPresetPlan ? initialSelectedTier : parsedSelectedTier,
          claimSlug: claimSlugParam || (typeof parsed.claimSlug === 'string' ? parsed.claimSlug : initialFormState.claimSlug),
          centreName:
            claimSlugParam && !(typeof parsed.centreName === 'string' && parsed.centreName.trim())
              ? formatClaimSlug(claimSlugParam)
              : typeof parsed.centreName === 'string'
                ? parsed.centreName
                : initialFormState.centreName,
        }
      }
    } catch {
      merged = initialFormState
    }

    if (hasPresetPlan) {
      merged = { ...merged, selectedTier: initialSelectedTier }
    }

    setForm(merged)

    if (isConfirmFlow) {
      const fastTrackEnabled =
        fastTrackRequested ||
        window.localStorage.getItem(REGISTER_FAST_TRACK_KEY) === '1' ||
        hasFastTrackCoreDetails(merged)
      if (fastTrackEnabled && hasFastTrackCoreDetails(merged)) {
        setStep(4)
      }
    }

    setDraftHydrated(true)
  }, [claimSlugParam, fastTrackRequested, hasPresetPlan, initialFormState, initialSelectedTier, isConfirmFlow])

  useEffect(() => {
    if (!draftHydrated || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(REGISTER_DRAFT_STORAGE_KEY, JSON.stringify(form))
    } catch {
      // Ignore localStorage write issues.
    }
  }, [draftHydrated, form])

  useEffect(() => {
    if (!isConfirmFlow || step !== 4 || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(REGISTER_FAST_TRACK_KEY, '1')
    } catch {
      // Ignore localStorage write issues.
    }
  }, [isConfirmFlow, step])

  function setField<K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function nextStep() {
    setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev))
  }

  function previousStep() {
    setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev))
  }

  const numericBudget = Number(form.monthlyBudget || 0)
  const numericExpectedChildren = Number(form.expectedChildren || 0)
  const recommendedTier = useMemo(
    () =>
      recommendTier(
        Number.isFinite(numericBudget) ? numericBudget : 0,
        Number.isFinite(numericExpectedChildren) ? numericExpectedChildren : 0
      ),
    [numericBudget, numericExpectedChildren]
  )

  function validateStep(currentStep: WizardStep) {
    if (currentStep === 1) {
      if (!form.fullName.trim() || !form.email.trim() || !form.centreName.trim()) {
        toast.error('Complete required contact and centre details')
        return false
      }
    }

    if (currentStep === 2) {
      const yearsOperating = Number(form.yearsOperating)
      const currentChildren = Number(form.currentChildren)
      const staffCount = Number(form.staffCount)

      if (!Number.isFinite(yearsOperating) || yearsOperating < 0) {
        toast.error('Provide valid years operating')
        return false
      }
      if (!Number.isFinite(currentChildren) || currentChildren < 0) {
        toast.error('Provide valid current children count')
        return false
      }
      if (!Number.isFinite(staffCount) || staffCount < 0) {
        toast.error('Provide valid staff count')
        return false
      }
    }

    if (currentStep === 3) {
      if (!form.monthlyBudget || Number(form.monthlyBudget) < 0) {
        toast.error('Provide a valid monthly budget')
        return false
      }
      if (!form.expectedChildren || Number(form.expectedChildren) < 0) {
        toast.error('Provide expected children count')
        return false
      }
      if (form.keyNeeds.length === 0) {
        toast.error('Select at least one key need')
        return false
      }
    }

    return true
  }

  async function submitApplication() {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return
    if (turnstileSiteKey && !captchaToken) {
      toast.error('Please complete the security verification challenge')
      return
    }
    setLoading(true)

    try {
      const response = await fetch('/api/ecd/service-applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          centreName: form.centreName.trim(),
          centrePhone: form.centrePhone.trim() || undefined,
          centreAddress: form.centreAddress.trim() || undefined,
          centreSuburb: form.centreSuburb.trim() || undefined,
          centreCity: form.centreCity.trim() || 'Johannesburg',
          centreProvince: form.centreProvince.trim() || 'Gauteng',
          operatorRole: form.operatorRole.trim() || undefined,
          registrationStatus: form.registrationStatus.trim() || undefined,
          yearsOperating: Number(form.yearsOperating || 0),
          currentChildren: Number(form.currentChildren || 0),
          staffCount: Number(form.staffCount || 0),
          ageGroups: form.ageGroups,
          operatingHours: form.operatingHours.trim() || undefined,
          monthlyBudget: Number(form.monthlyBudget || 0),
          expectedChildren: Number(form.expectedChildren || 0),
          selectedTier: toInternalTier(form.selectedTier),
          recommendedTier: toInternalTier(recommendedTier),
          keyNeeds: form.keyNeeds,
          additionalContext: form.additionalContext.trim() || undefined,
          claimSlug: form.claimSlug || undefined,
          captchaToken: turnstileSiteKey ? captchaToken : undefined,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!response.ok) throw new Error(payload.error || 'Failed to submit application')

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY)
      }

      toast.success(payload.message || 'Application submitted')
      router.replace('/for-centres?status=application-submitted')
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#effcff_0%,#f8fbfd_28%,#ffffff_100%)]">
      <Section className="py-8 sm:py-10 lg:py-12" containerClassName="cc-section">
        <div className="mb-6">
          <Link href="/for-centres" className="text-xs font-semibold text-teal-700 hover:underline">
            Back to plans
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">CentreConnect</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Let&apos;s set up your centre 😊</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Fill your crèche faster, look professional to parents, and start with a package that fits your centre. {isConfirmFlow
              ? 'Your selected package is ready for one simple confirmation.'
              : 'This takes a few minutes, and we will guide you step by step.'}
          </p>
          {hasPresetPlan ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">
              Ready to go: {presetPlanLabel} (R{TIER_PRICES[initialSelectedTier]}/month)
            </div>
          ) : null}
          {form.claimSlug ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
              Claiming existing centre profile: {formatClaimSlug(form.claimSlug)}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
          <Card className="h-fit rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)] xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Your package</CardTitle>
              <CardDescription>Clear pricing. No surprises.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">
                    {form.selectedTier === 'starter' ? 'Starter' : form.selectedTier === 'growth' ? 'Growth' : 'Pro'}
                  </p>
                  <p className="text-xl font-black text-foreground">R{TIER_PRICES[form.selectedTier]}</p>
                </div>
                <p className="text-xs text-muted-foreground">per month</p>
                <p className="mt-2 text-sm text-muted-foreground">{TIER_DESCRIPTIONS[form.selectedTier]}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {TIER_BENEFITS[form.selectedTier].map((benefit) => (
                    <li key={benefit}>- {benefit}</li>
                  ))}
                </ul>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Best for</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {TIER_PACKAGE_DETAILS[form.selectedTier].bestFor}
                  </p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Package includes</p>
                  <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
                    {TIER_PACKAGE_DETAILS[form.selectedTier].packageIncludes.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {!hasPresetPlan ? (
                <p className="text-xs text-muted-foreground">
                  You can change this plan in step 3.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Plan was pre-selected from your Choose Plan action. You can confirm and continue below.
                </p>
              )}
              {!isConfirmFlow ? (
                <Button asChild variant="outline" className="h-10 w-full rounded-2xl border-border bg-card px-4 text-xs font-semibold">
                  <Link href="/for-centres#plans">Compare plans</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal-700">Step {step} of 4</p>
                <p className="text-sm font-semibold text-muted-foreground">
                  {step === 4 && isConfirmFlow ? 'Review and Confirm' : STEP_TITLES[step]}
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Primary Contact Name *</Label>
                      <Input id="fullName" placeholder="e.g. Nandi Mokoena" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} required className="h-11 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Business Email *</Label>
                      <Input id="email" type="email" placeholder="owner@yourcentre.co.za" value={form.email} onChange={(e) => setField('email', e.target.value)} required className="h-11 rounded-2xl" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Contact Number</Label>
                      <Input id="phone" placeholder="+27 72 123 4567" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operatorRole">Your Role at Centre</Label>
                      <Input id="operatorRole" value={form.operatorRole} onChange={(e) => setField('operatorRole', e.target.value)} placeholder="Owner, Principal, Manager" className="h-11 rounded-2xl" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="centreName">Centre Name *</Label>
                      <Input id="centreName" placeholder="Bright Start Early Learning" value={form.centreName} onChange={(e) => setField('centreName', e.target.value)} required className="h-11 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="centrePhone">Centre Phone</Label>
                      <Input id="centrePhone" placeholder="+27 11 234 5678" value={form.centrePhone} onChange={(e) => setField('centrePhone', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="centreAddress">Address</Label>
                    <Input id="centreAddress" placeholder="123 Rivonia Road" value={form.centreAddress} onChange={(e) => setField('centreAddress', e.target.value)} className="h-11 rounded-2xl" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="centreSuburb">Suburb</Label>
                      <Input id="centreSuburb" placeholder="Alexandra" value={form.centreSuburb} onChange={(e) => setField('centreSuburb', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="centreCity">City</Label>
                      <Input id="centreCity" placeholder="Johannesburg" value={form.centreCity} onChange={(e) => setField('centreCity', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="centreProvince">Province</Label>
                      <Input id="centreProvince" placeholder="Gauteng" value={form.centreProvince} onChange={(e) => setField('centreProvince', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="yearsOperating">Years Operating</Label>
                      <Input id="yearsOperating" type="number" min="0" value={form.yearsOperating} onChange={(e) => setField('yearsOperating', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentChildren">Current Children</Label>
                      <Input id="currentChildren" type="number" min="0" value={form.currentChildren} onChange={(e) => setField('currentChildren', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staffCount">Staff Count</Label>
                      <Input id="staffCount" type="number" min="0" value={form.staffCount} onChange={(e) => setField('staffCount', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationStatus">Registration Status</Label>
                    <select
                      id="registrationStatus"
                      value={form.registrationStatus}
                      onChange={(e) => setField('registrationStatus', e.target.value)}
                      className="cc-native-field h-11 rounded-2xl"
                    >
                      <option>Unregistered / Community-based</option>
                      <option>Partially Registered</option>
                      <option>Fully Registered</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="operatingHours">Operating Hours</Label>
                    <Input id="operatingHours" value={form.operatingHours} onChange={(e) => setField('operatingHours', e.target.value)} placeholder="Mon-Fri 06:30-17:30" className="h-11 rounded-2xl" />
                  </div>

                    <div className="space-y-2">
                      <Label>Age Groups Served</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {AGE_GROUP_OPTIONS.map((option) => (
                          <label key={option} className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={form.ageGroups.includes(option)}
                              onChange={() => setField('ageGroups', toggleArrayValue(form.ageGroups, option))}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyBudget">Monthly Budget (R)</Label>
                      <Input id="monthlyBudget" type="number" min="0" placeholder="299" value={form.monthlyBudget} onChange={(e) => setField('monthlyBudget', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedChildren">Expected Children (next 12 months)</Label>
                      <Input id="expectedChildren" type="number" min="0" placeholder="60" value={form.expectedChildren} onChange={(e) => setField('expectedChildren', e.target.value)} className="h-11 rounded-2xl" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-900">
                      Best fit for what you shared: {recommendedTier === 'starter' ? 'Starter' : recommendedTier === 'growth' ? 'Growth' : 'Pro'} (R{TIER_PRICES[recommendedTier]}/month)
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">{TIER_DESCRIPTIONS[recommendedTier]}</p>
                  </div>

                  <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
                    All packages include friendly onboarding help so your team is not left guessing. 😊
                  </div>

                  {hasPresetPlan ? (
                    <div className="rounded-2xl border border-teal-200 bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Chosen plan</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {presetPlanLabel} - R{TIER_PRICES[form.selectedTier]}/month
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This plan was pre-selected from your Choose Plan action.
                      </p>
                      {!isConfirmFlow ? (
                        <div className="mt-2">
                          <Button asChild variant="outline" className="h-9 rounded-2xl border-border bg-card px-3 text-xs font-semibold">
                            <Link href="/for-centres#plans">Need a different plan?</Link>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {PLAN_OPTIONS.map((tier) => {
                        const active = form.selectedTier === tier
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setField('selectedTier', tier)}
                            className={`rounded-2xl border p-3 text-left transition ${
                              active
                                ? 'border-teal-400 bg-teal-50 shadow-[var(--shadow-elevation-1)]'
                                : 'border-border bg-card text-foreground hover:border-teal-200 hover:bg-background'
                            }`}
                          >
                            <p className="text-sm font-semibold text-foreground">
                              {tier === 'starter' ? 'Starter' : tier === 'growth' ? 'Growth' : 'Pro'}
                            </p>
                            <p className="text-lg font-bold text-foreground">R{TIER_PRICES[tier]}</p>
                            <p className="text-[11px] font-medium text-muted-foreground">per month</p>
                            <p className="mt-1 text-xs text-muted-foreground">{TIER_DESCRIPTIONS[tier]}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-700">
                              {TIER_PACKAGE_DETAILS[tier].bestFor}
                            </p>
                            <ul className="mt-2 space-y-1 text-[11px] text-slate-600">
                              {TIER_BENEFITS[tier].map((benefit) => (
                                <li key={benefit}>- {benefit}</li>
                              ))}
                            </ul>
                            <ul className="mt-2 space-y-1 text-[10px] text-slate-500">
                              {TIER_PACKAGE_DETAILS[tier].outcomes.map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </button>
                        )
                      })}
                    </div>
                  )}

                    <div className="space-y-2">
                      <Label>What do you need most right now?</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {NEED_OPTIONS.map((need) => (
                          <label key={need} className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={form.keyNeeds.includes(need)}
                              onChange={() => setField('keyNeeds', toggleArrayValue(form.keyNeeds, need))}
                            />
                            {need}
                          </label>
                        ))}
                      </div>
                    </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Quick review before we help you launch</p>
                  <p className="text-muted-foreground">Contact: {form.fullName} ({form.email})</p>
                  <p className="text-muted-foreground">Centre: {form.centreName}</p>
                  <p className="text-muted-foreground">
                    Location: {form.centreSuburb || '-'}, {form.centreCity || '-'}, {form.centreProvince || '-'}
                  </p>
                  <p className="text-muted-foreground">Registration status: {form.registrationStatus}</p>
                  <p className="text-muted-foreground">Current children / staff: {form.currentChildren} / {form.staffCount}</p>
                  <p className="text-muted-foreground">
                    Selected package: {form.selectedTier === 'starter' ? 'Starter' : form.selectedTier === 'growth' ? 'Growth' : 'Pro'} (R{TIER_PRICES[form.selectedTier]}/month)
                  </p>
                  <p className="text-muted-foreground">
                    Recommended package: {recommendedTier === 'starter' ? 'Starter' : recommendedTier === 'growth' ? 'Growth' : 'Pro'}
                  </p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Selected package includes</p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-600">
                      {TIER_PACKAGE_DETAILS[form.selectedTier].packageIncludes.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-muted-foreground">Key needs: {form.keyNeeds.join(', ')}</p>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="additionalContext">Anything else we should know?</Label>
                    <Textarea
                      id="additionalContext"
                      value={form.additionalContext}
                      onChange={(e) => setField('additionalContext', e.target.value)}
                      placeholder="Share challenges, timelines, compliance goals, or implementation priorities."
                      rows={4}
                      className="min-h-24 rounded-2xl"
                    />
                  </div>
                  {turnstileSiteKey ? (
                    <div className="space-y-2 pt-1">
                      <Label>Security Check</Label>
                      <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={setCaptchaToken} />
                    </div>
                  ) : null}

                  <p className="text-xs text-muted-foreground">
                    We review this with you first, then activate the right CentreConnect access for your team.
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button variant="outline" onClick={previousStep} disabled={step === 1 || loading} className="h-11 rounded-2xl px-5 font-semibold">
                  Back
                </Button>

                {step < 4 ? (
                  <Button
                    onClick={() => {
                      if (!validateStep(step)) return
                      nextStep()
                    }}
                    disabled={loading}
                    className="h-11 rounded-2xl px-5 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  >
                    Next
                  </Button>
                ) : (
                  <Button onClick={submitApplication} disabled={loading} className="h-11 rounded-2xl px-5 bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                    {loading ? 'Submitting...' : hasPresetPlan ? 'Confirm & continue' : 'Send my application'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  )
}







