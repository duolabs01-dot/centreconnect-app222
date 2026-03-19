import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { createJobAction, toggleJobPublishAction, updateJobApplicationStatusAction, updateStaffRecordAction } from './actions'
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
  const timezoneAdjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return timezoneAdjusted.toISOString().slice(0, 16)
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
      .select('user_id,role,can_approve_applications,can_publish_announcements,invited_at,user_profiles!ecd_admins_user_id_fkey(full_name)')
      .eq('ecd_id', ecdId)
      .order('invited_at', { ascending: true })
      .limit(100),
  ])

  const jobRows = (jobs ?? []) as JobRow[]
  const applicationRows = (jobApplications ?? []) as JobApplicationRow[]
  const teamMembers = (teamMembersResult.data ?? []) as TeamMemberRow[]

  const { data: ecdStaff } = await supabase
    .from('ecd_staff')
    .select('id,first_name,surname,role,is_trained,is_computer_literate')
    .eq('ecd_id', ecdId)
    .order('surname', { ascending: true })
    .limit(100)

  const publishedCount = jobRows.filter((job) => job.is_published).length
  const draftCount = Math.max(jobRows.length - publishedCount, 0)

  const successMessage =
    successParam === 'job-created'
      ? 'Job created successfully.'
      : successParam === 'job-updated'
        ? 'Job visibility updated.'
        : successParam === 'application-updated'
          ? 'Applicant status updated.'
          : successParam === 'staff-updated'
            ? 'Staff record updated successfully.'
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
          : errorParam === 'update-failed'
            ? 'Could not update this applicant status. Try again.'
            : null

  return (
    <>
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
                    <div key={member.user_id} className="flex flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
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

            <div className="flex flex-wrap gap-3">
              {role === 'ecd_admin' ? (
                <Button variant="outline" size="sm" asChild className={OUTLINE_BUTTON_CLASS}>
                  <Link href="/ecd/profile#staff">Manage staff in settings</Link>
                </Button>
              ) : null}
              <Button variant="outline" size="sm" asChild className={OUTLINE_BUTTON_CLASS}>
                <Link href="/ecd/team-plans">Open weekly staff plan</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* DOE / DSD Practitioner Records */}
        <Card className={PANEL_CLASS}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Practitioner & Staff Records (DOE Format)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!ecdStaff || ecdStaff.length === 0) ? (
              <p className="text-sm text-slate-500">No official practitioner records found. These are required for DOE monthly returns.</p>
            ) : (
              <div className="divide-y divide-border rounded-2xl border border-border">
                {ecdStaff.map((staff) => (
                  <div key={staff.id} className="flex flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{staff.first_name} {staff.surname}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{staff.role}</p>
                    </div>
                    
                    <form action={updateStaffRecordAction} className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                      <input type="hidden" name="staff_id" value={staff.id} />
                      
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-600 cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="is_trained" 
                          defaultChecked={staff.is_trained}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Trained
                      </label>

                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-600 cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="is_computer_literate" 
                          defaultChecked={staff.is_computer_literate}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Excel Literate
                      </label>

                      <Button type="submit" size="sm" variant="outline" className="h-7 rounded-xl border-slate-200 px-3 text-[10px] font-bold uppercase tracking-wider hover:bg-teal-50 hover:text-teal-700">
                        Update
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              These records are automatically included in your official DSD/DOE Monthly Report exports.
            </p>
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

                <select
                  name="role_type"
                  className="cc-native-field h-11 rounded-2xl"
                  defaultValue={selectedTemplate?.roleType ?? 'assistant'}
                >
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
              <Link href={`/c/${centre.slug}`}>View your public jobs section</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </>
  )
}


