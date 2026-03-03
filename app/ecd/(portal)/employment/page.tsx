import type { Metadata } from 'next'
import Link from 'next/link'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { createJobAction, toggleJobPublishAction, updateJobApplicationStatusAction } from './actions'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export const metadata: Metadata = {
  title: 'Employment - CentreConnect',
  description: 'Publish and manage jobs fast from mobile or desktop.',
}

type JobRow = {
  id: string
  title: string
  role_type: string
  is_published: boolean
  closes_at: string | null
  created_at: string
}

type JobApplicationRow = {
  id: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string | null
  status: 'new' | 'shortlisted' | 'interview' | 'offer' | 'hired' | 'rejected'
  notes: string | null
  interview_at: string | null
  created_at: string
  jobs:
    | {
        id: string
        title: string
      }
    | Array<{
        id: string
        title: string
      }>
    | null
}

type TeamMemberRow = {
  user_id: string
  role: 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
  can_approve_applications: boolean
  can_publish_announcements: boolean
  invited_at: string
  user_profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null
}

type EmploymentPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const PANEL_CLASS = 'rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]'
const FIELD_CLASS = 'cc-native-field h-11 rounded-2xl'
const OUTLINE_BUTTON_CLASS =
  'h-10 rounded-2xl border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-teal-50 hover:text-teal-700'
const PRIMARY_BUTTON_CLASS = 'h-11 rounded-2xl bg-teal-600 px-6 text-sm font-bold text-white hover:bg-teal-700'

const jobTemplates: Record<string, { title: string; roleType: string; description: string; requirements: string }> = {
  assistant: {
    title: 'ECD Assistant Teacher',
    roleType: 'assistant',
    description: 'Support daily learning activities, classroom setup, and child supervision.',
    requirements: 'ECD Level 4 or equivalent experience. Caring attitude and strong communication.',
  },
  practitioner: {
    title: 'Aftercare Support Practitioner',
    roleType: 'practitioner',
    description: 'Lead aftercare routines, homework support, and parent handover updates.',
    requirements: 'Experience with ages 4-6. Reliable attendance and positive behaviour guidance.',
  },
  cleaner: {
    title: 'Crèche Cleaner',
    roleType: 'cleaner',
    description: 'Maintain clean and safe classrooms, bathrooms, and shared play areas.',
    requirements: 'Attention to hygiene standards and dependable attendance.',
  },
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function queryValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

export default async function EcdEmploymentPage({ searchParams }: EmploymentPageProps) {
  const { supabase, user, role, ecdId } = await requireEcdPortalSession()
  const canManageJobs = role === 'ecd_admin'

  const selectedTemplateKey = queryValue(searchParams?.template)
  const selectedTemplate = selectedTemplateKey ? jobTemplates[selectedTemplateKey] ?? null : null

  const successParam = queryValue(searchParams?.success)
  const errorParam = queryValue(searchParams?.error)

  const { data: centre } = await supabase.from('ecd_centres').select('slug,name').eq('id', ecdId).maybeSingle()

  const [{ data: jobs }, { count: applicationsCount }, { data: jobApplications }, teamMembersResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('id,title,role_type,is_published,closes_at,created_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('job_applications').select('*', { head: true, count: 'exact' }).eq('ecd_id', ecdId),
    supabase
      .from('job_applications')
      .select('id,applicant_name,applicant_email,applicant_phone,status,notes,interview_at,created_at,jobs(id,title)')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('ecd_admins')
      .select('user_id,role,can_approve_applications,can_publish_announcements,invited_at,user_profiles(full_name)')
      .eq('ecd_id', ecdId)
      .order('invited_at', { ascending: true })
      .limit(100),
  ])

  const jobRows = (jobs ?? []) as JobRow[]
  const applicationRows = (jobApplications ?? []) as JobApplicationRow[]
  const teamMembers = (teamMembersResult.data ?? []) as TeamMemberRow[]

  const publishedCount = jobRows.filter((job) => job.is_published).length
  const draftCount = Math.max(jobRows.length - publishedCount, 0)

  const successMessage =
    successParam === 'job-created'
      ? 'Job created successfully.'
      : successParam === 'job-updated'
        ? 'Job visibility updated.'
        : null

  const errorMessage =
    errorParam === 'owner-only'
      ? 'Only ECD admins can create or publish jobs.'
      : errorParam === 'invalid-job'
        ? 'Please check job fields and try again.'
        : errorParam === 'create-failed'
          ? 'Could not create job. Try again.'
          : errorParam === 'publish-failed'
            ? 'Could not update this action. Try again.'
            : null

  return (
    <EcdOsShell
      title="Employment"
      description="Publish jobs in seconds and keep your hiring pipeline active."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="space-y-6 pb-6">
        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className={PANEL_CLASS}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-foreground">{jobRows.length}</p>
            </CardContent>
          </Card>

          <Card className={PANEL_CLASS}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-foreground">{publishedCount}</p>
            </CardContent>
          </Card>

          <Card className={PANEL_CLASS}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-foreground">{draftCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card className={PANEL_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Your Team ({teamMembers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-slate-500">No team members found. Invite staff from settings.</p>
            ) : (
              <div className="divide-y divide-border rounded-2xl border border-border">
                {teamMembers.map((member) => {
                  const profile = normalizeOne(member.user_profiles)
                  const name = profile?.full_name ?? 'Team Member'
                  const memberRoleLabel =
                    member.role === 'ecd_admin' ? 'Crèche Admin' : member.role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'

                  return (
                    <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-[160px]">
                        <p className="text-sm font-semibold text-foreground">{name}</p>
                        <p className="text-xs text-slate-500">{memberRoleLabel}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-right">
                        {member.can_approve_applications ? (
                          <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700">
                            Can approve
                          </span>
                        ) : null}
                        {member.can_publish_announcements ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                            Can publish
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {role === 'ecd_admin' ? (
              <Button variant="outline" size="sm" asChild className={OUTLINE_BUTTON_CLASS}>
                <Link href="/ecd/profile#staff">Manage staff in settings</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Candidate Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">Total job applications received: {applicationsCount ?? 0}</p>

            {applicationRows.length === 0 ? (
              <p className="text-sm text-slate-600">No applicants yet.</p>
            ) : (
              <div className="space-y-3">
                {applicationRows.map((application) => {
                  const job = normalizeOne(application.jobs)
                  return (
                    <div key={application.id} className="rounded-2xl border border-border bg-slate-50/60 p-4">
                      <p className="text-sm font-semibold text-foreground">{application.applicant_name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {job?.title ?? 'Job role'} | Applied {formatDate(application.created_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{application.applicant_email}</p>
                      {application.applicant_phone ? (
                        <p className="mt-1 text-xs text-slate-600">{application.applicant_phone}</p>
                      ) : null}

                      <form action={updateJobApplicationStatusAction} className="mt-3 grid gap-2 md:grid-cols-[180px_220px_1fr_auto]">
                        <input type="hidden" name="application_id" value={application.id} />

                        <select name="next_status" defaultValue={application.status} className="cc-native-field h-10 rounded-2xl">
                          <option value="new">New</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="hired">Hired</option>
                          <option value="rejected">Rejected</option>
                        </select>

                        <input
                          type="datetime-local"
                          name="interview_at"
                          defaultValue={toDateTimeLocal(application.interview_at)}
                          className="cc-native-field h-10 rounded-2xl"
                        />

                        <input
                          type="text"
                          name="notes"
                          placeholder="Notes (optional)"
                          defaultValue={application.notes ?? ''}
                          className="cc-native-field h-10 rounded-2xl"
                        />

                        <Button type="submit" size="sm" variant="outline" className={OUTLINE_BUTTON_CLASS}>
                          Update
                        </Button>
                      </form>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Create Job</CardTitle>
          </CardHeader>
          <CardContent>
            {canManageJobs ? (
              <form action={createJobAction} className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <Button size="sm" type="button" variant="outline" asChild className={OUTLINE_BUTTON_CLASS}>
                    <Link href="/ecd/employment?template=assistant">Template: Assistant</Link>
                  </Button>
                  <Button size="sm" type="button" variant="outline" asChild className={OUTLINE_BUTTON_CLASS}>
                    <Link href="/ecd/employment?template=practitioner">Template: Practitioner</Link>
                  </Button>
                  <Button size="sm" type="button" variant="outline" asChild className={OUTLINE_BUTTON_CLASS}>
                    <Link href="/ecd/employment?template=cleaner">Template: Cleaner</Link>
                  </Button>
                  <Button size="sm" type="button" variant="outline" asChild className={OUTLINE_BUTTON_CLASS}>
                    <Link href="/ecd/employment">Custom</Link>
                  </Button>
                </div>

                <input
                  name="title"
                  required
                  placeholder="Job title (e.g. Assistant Practitioner)"
                  defaultValue={selectedTemplate?.title ?? ''}
                  className={`${FIELD_CLASS} sm:col-span-2`}
                />

                <select name="role_type" className={FIELD_CLASS} defaultValue={selectedTemplate?.roleType ?? 'assistant'}>
                  <option value="assistant">Assistant</option>
                  <option value="practitioner">Practitioner</option>
                  <option value="cook">Cook</option>
                  <option value="cleaner">Cleaner</option>
                  <option value="driver">Driver</option>
                  <option value="other">Other</option>
                </select>

                <div>
                  <label htmlFor="closes_at" className="mb-1 block text-sm font-medium text-slate-700">
                    Application closing date
                  </label>
                  <input id="closes_at" name="closes_at" type="date" className={FIELD_CLASS} min={new Date().toISOString().split('T')[0]} />
                  <p className="mt-1 text-xs text-slate-500">Leave blank if the role is open until filled.</p>
                </div>

                <textarea
                  name="description"
                  placeholder="Short role description"
                  defaultValue={selectedTemplate?.description ?? ''}
                  className="cc-native-field min-h-24 rounded-2xl sm:col-span-2"
                />

                <textarea
                  name="requirements"
                  placeholder="Key requirements"
                  defaultValue={selectedTemplate?.requirements ?? ''}
                  className="cc-native-field min-h-24 rounded-2xl sm:col-span-2"
                />

                <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input type="checkbox" name="publish_now" className="h-4 w-4 rounded border-border text-teal-600" />
                  Publish immediately
                </label>

                <div className="sm:col-span-2">
                  <Button type="submit" className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}>
                    Create Job
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-slate-600">You can view hiring activity, but only ECD admins can create and publish jobs.</p>
            )}
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Open Positions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobRows.length === 0 ? (
              <p className="text-sm text-slate-600">No jobs yet. Create your first role above to publish it on your public profile.</p>
            ) : (
              jobRows.map((job) => (
                <div key={job.id} className="rounded-2xl border border-border bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{job.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {job.role_type} | {job.is_published ? 'Published' : 'Draft'} | Created {formatDate(job.created_at)}
                      </p>
                      {job.closes_at ? <p className="mt-1 text-xs text-slate-600">Closes {formatDate(job.closes_at)}</p> : null}
                    </div>

                    {canManageJobs ? (
                      <form action={toggleJobPublishAction}>
                        <input type="hidden" name="job_id" value={job.id} />
                        <input type="hidden" name="next_published" value={job.is_published ? 'false' : 'true'} />
                        <Button
                          type="submit"
                          size="sm"
                          variant={job.is_published ? 'outline' : 'default'}
                          className={job.is_published ? OUTLINE_BUTTON_CLASS : PRIMARY_BUTTON_CLASS}
                        >
                          {job.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {centre?.slug ? (
          <div className="flex justify-start">
            <Button asChild variant="outline" className={OUTLINE_BUTTON_CLASS}>
              <Link href={`/centre/${centre.slug}`}>View your public jobs section</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </EcdOsShell>
  )
}
