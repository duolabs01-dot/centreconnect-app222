'use client'

import { useMemo, useState } from 'react'
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

type InternalTier = 'basic' | 'standard' | 'premium'
type PublicTier = 'starter' | 'growth' | 'pro'
type WizardStep = 1 | 2 | 3 | 4

const TIER_PRICES: Record<PublicTier, number> = {
  starter: 199,
  growth: 299,
  pro: 499,
}

const TIER_DESCRIPTIONS: Record<PublicTier, string> = {
  starter: 'Best for centres that want to fill open spaces and start quickly.',
  growth: 'For busy centres that need stronger daily operations and follow-up.',
  pro: 'For high-volume centres that want full control and priority support.',
}

const TIER_BENEFITS: Record<PublicTier, string[]> = {
  starter: ['Parent applications in one dashboard', 'Announcements and direct parent messages', 'Professional centre listing'],
  growth: ['Everything in Starter', 'Attendance and calendar workflows', 'Faster admissions follow-up and reminders'],
  pro: ['Everything in Growth', 'Website and growth tools', 'Priority onboarding and support'],
}

const PUBLIC_TO_INTERNAL_TIER: Record<PublicTier, InternalTier> = {
  starter: 'basic',
  growth: 'standard',
  pro: 'premium',
}

const PLAN_ALIAS_TO_PUBLIC_TIER: Record<string, PublicTier> = {
  starter: 'starter',
  basic: 'starter',
  pilot: 'starter',
  growth: 'growth',
  standard: 'growth',
  pro: 'pro',
  premium: 'pro',
}

const PLAN_OPTIONS: PublicTier[] = ['starter', 'growth', 'pro']

const STEP_TITLES: Record<WizardStep, string> = {
  1: 'Contact and Centre',
  2: 'Operations Profile',
  3: 'Package and Needs',
  4: 'Review and Submit',
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

export default function EcdRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || ''
  const requestedPlanParam = (searchParams.get('plan') || '').toLowerCase()
  const initialSelectedTier: PublicTier = PLAN_ALIAS_TO_PUBLIC_TIER[requestedPlanParam] ?? 'growth'
  const [step, setStep] = useState<WizardStep>(1)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    centreName: '',
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
    ageGroups: ['2-4 years', '4-6 years'] as string[],
    operatingHours: '',
    monthlyBudget: '299',
    expectedChildren: '60',
    selectedTier: initialSelectedTier,
    keyNeeds: ['Admissions pipeline', 'Parent communications'] as string[],
    additionalContext: '',
  })

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

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function nextStep() {
    setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev))
  }

  function previousStep() {
    setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev))
  }

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
    if (!validateStep(3)) return
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
          selectedTier: PUBLIC_TO_INTERNAL_TIER[form.selectedTier],
          recommendedTier: PUBLIC_TO_INTERNAL_TIER[recommendedTier],
          keyNeeds: form.keyNeeds,
          additionalContext: form.additionalContext.trim() || undefined,
          captchaToken: turnstileSiteKey ? captchaToken : undefined,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!response.ok) throw new Error(payload.error || 'Failed to submit application')

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
    <div className="min-h-screen bg-slate-50">
      <Section className="py-8 sm:py-10 lg:py-12" containerClassName="cc-section">
        <div className="mb-6">
          <Link href="/for-centres" className="text-xs font-semibold text-teal-700 hover:underline">
            Back to For ECD Centres
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">CentreConnect</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Register Your ECD</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Fill your creche faster and get paid on time. Complete this setup in minutes and choose the plan that matches your centre.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
          <Card className="h-fit rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)] xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Packages and Pricing</CardTitle>
              <CardDescription>Simple plans built for ECD owners.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PLAN_OPTIONS.map((tier) => (
                <div key={tier} className="rounded-2xl border border-border bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {tier === 'starter' ? 'Starter' : tier === 'growth' ? 'Growth' : 'Pro'}
                    </p>
                    <p className="text-xl font-bold text-foreground">R{TIER_PRICES[tier]}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">per month</p>
                  <p className="mt-2 text-sm text-muted-foreground">{TIER_DESCRIPTIONS[tier]}</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {TIER_BENEFITS[tier].map((benefit) => (
                      <li key={benefit}>- {benefit}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">After review and approval, your ECD dashboard is activated.</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal-700">Step {step} of 4</p>
                <p className="text-sm font-semibold text-muted-foreground">{STEP_TITLES[step]}</p>
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
                      Recommended package: {recommendedTier === 'starter' ? 'Starter' : recommendedTier === 'growth' ? 'Growth' : 'Pro'} (R{TIER_PRICES[recommendedTier]}/month)
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">{TIER_DESCRIPTIONS[recommendedTier]}</p>
                  </div>

                  <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
                    All plans include onboarding guidance so your team can launch smoothly.
                  </div>

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
                          <ul className="mt-2 space-y-1 text-[11px] text-slate-600">
                            {TIER_BENEFITS[tier].map((benefit) => (
                              <li key={benefit}>- {benefit}</li>
                            ))}
                          </ul>
                        </button>
                      )
                    })}
                  </div>

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
                  <p className="font-semibold text-foreground">Review your application</p>
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
                    No parent-style auth is required here. We review your application first, then activate your ECD admin access.
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
                    {loading ? 'Submitting...' : 'Submit Service Application'}
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



