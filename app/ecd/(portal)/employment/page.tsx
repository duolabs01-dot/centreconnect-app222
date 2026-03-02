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
  searchParams?: {
    success?: string
    error?: string
    template?: string
  }
}

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

export default async function EcdEmploymentPage({ searchParams }: EmploymentPageProps) {
  const { supabase, user, role, ecdId } = await requireEcdPortalSession()
  const canManageJobs = role === 'ecd_admin'
  const selectedTemplate = searchParams?.template && jobTemplates[searchParams.template]
    ? jobTemplates[searchParams.template]
    : null
  const { data: centre } = await supabase.from('ecd_centres').select('slug,name').eq('id', ecdId).maybeSingle()

  const [{ data: jobs }, { count: applicationsCount }, { data: jobApplications }, teamMembersResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('id,title,role_type,is_published,closes_at,created_at')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('job_applications')
      .select('*', { head: true, count: 'exact' })
      .eq('ecd_id', ecdId),
    supabase
      .from('job_applications')
      .select('id,applicant_name,applicant_email,applicant_phone,status,notes,interview_at,created_at,jobs(id,title)')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('ecd_admins')
      .select(
        'user_id,role,can_approve_applications,can_publish_announcements,invited_at,user_profiles(full_name)'
      )
      .eq('ecd_id', ecdId)
      .order('invited_at', { ascending: true })
      .limit(50),
  ])

  const jobRows = ((jobs ?? []) as JobRow[]) ?? []
  const applicationRows = ((jobApplications ?? []) as JobApplicationRow[]) ?? []
  const teamMembers = ((teamMembersResult.data ?? []) as TeamMemberRow[]) ?? []
  const publishedCount = jobRows.filter((job) => job.is_published).length
  const draftCount = jobRows.length - publishedCount

  const successMessage =
    searchParams?.success === 'job-created'
      ? 'Job created successfully.'
      : searchParams?.success === 'job-updated'
        ? 'Job visibility updated.'
        : null

  const errorMessage =
    searchParams?.error === 'owner-only'
      ? 'Only ECD admins can create or publish jobs.'
      : searchParams?.error === 'invalid-job'
        ? 'Please check job fields and try again.'
        : searchParams?.error === 'create-failed'
          ? 'Could not create job. Try again.'
          : searchParams?.error === 'publish-failed'
            ? 'Could not update publishing state. Try again.'
            : null

  return (
    <EcdOsShell
      title="Employment"
      description="Publish jobs in seconds and keep your hiring pipeline active."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="space-y-6">
        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{jobRows.length}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{publishedCount}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{draftCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Your Team ({teamMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-slate-500">No team members found. Invite staff from Settings.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {teamMembers.map((member) => {
                  const profile = Array.isArray(member.user_profiles) ? member.user_profiles[0] : member.user_profiles
                  const name = profile?.full_name ?? 'Team Member'
                  const memberRoleLabel =
                    member.role === 'ecd_admin'
                      ? 'Crèche Admin'
                      : member.role === 'ecd_supervisor'
                        ? 'Supervisor'
                        : 'Staff Member'
                  return (
                    <div key={member.user_id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">{memberRoleLabel}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 text-right">
                        {member.can_approve_applications ? (
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] text-cyan-700">
                            Can Approve
                          </span>
                        ) : null}
                        {member.can_publish_announcements ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                            Can Publish
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {role === 'ecd_admin' ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/ecd/profile#staff">Manage Staff in Settings</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="pipeline-card pipeline-col-shortlisted border-slate-200">
          <CardHeader>
            <CardTitle className="pipeline-column-header -mx-6 -mt-6 mb-3 px-6 py-4">Candidate Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">Total job applications received: {applicationsCount ?? 0}</p>
            {applicationRows.length === 0 ? (
              <p className="text-sm text-slate-600">No applicants yet.</p>
            ) : (
              <div className="space-y-3">
                {applicationRows.map((application) => {
                  const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs
                  return (
                    <div key={application.id} className="pipeline-item rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{application.applicant_name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {job?.title ?? 'Job role'} | Applied {formatDate(application.created_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{application.applicant_email}</p>
                      {application.applicant_phone ? (
                        <p className="mt-1 text-xs text-slate-600">{application.applicant_phone}</p>
                      ) : null}
                      <form action={updateJobApplicationStatusAction} className="mt-3 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="application_id" value={application.id} />
                        <select
                          name="next_status"
                          defaultValue={application.status}
                          className="cc-native-field h-9 min-w-[160px]"
                        >
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
                          defaultValue={
                            application.interview_at
                              ? new Date(application.interview_at).toISOString().slice(0, 16)
                              : ''
                          }
                          className="cc-native-field h-9"
                        />
                        <input
                          type="text"
                          name="notes"
                          placeholder="Notes (optional)"
                          defaultValue={application.notes ?? ''}
                          className="cc-native-field h-9 min-w-[220px] flex-1"
                        />
                        <Button type="submit" size="sm" variant="outline">Update</Button>
                      </form>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Create Job</CardTitle>
          </CardHeader>
          <CardContent>
            {canManageJobs ? (
              <form action={createJobAction} className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <Button size="sm" type="button" variant="outline" asChild>
                    <Link href="/ecd/employment?template=assistant">Template: Assistant</Link>
                  </Button>
                  <Button size="sm" type="button" variant="outline" asChild>
                    <Link href="/ecd/employment?template=practitioner">Template: Practitioner</Link>
                  </Button>
                  <Button size="sm" type="button" variant="outline" asChild>
                    <Link href="/ecd/employment?template=cleaner">Template: Cleaner</Link>
                  </Button>
                  <Button size="sm" type="button" variant="outline" asChild>
                    <Link href="/ecd/employment">Custom</Link>
                  </Button>
                </div>
                <input
                  name="title"
                  required
                  placeholder="Job title (e.g. Assistant Practitioner)"
                  defaultValue={selectedTemplate?.title ?? ''}
                  className="cc-native-field sm:col-span-2"
                />
                <select name="role_type" className="cc-native-field" defaultValue={selectedTemplate?.roleType ?? 'assistant'}>
                  <option value="assistant">Assistant</option>
                  <option value="practitioner">Practitioner</option>
                  <option value="cook">Cook</option>
                  <option value="cleaner">Cleaner</option>
                  <option value="driver">Driver</option>
                  <option value="other">Other</option>
                </select>
                <div>
                  <label htmlFor="closes_at" className="mb-1 block text-sm font-medium text-slate-700">
                    Application Closing Date
                    <span className="ml-1 text-xs font-normal text-slate-500">(Last day applicants can apply)</span>
                  </label>
                  <input
                    id="closes_at"
                    name="closes_at"
                    type="date"
                    className="cc-native-field"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="mt-1 text-xs text-slate-500">Leave blank if the position is open until filled.</p>
                </div>
                <textarea
                  name="description"
                  placeholder="Short role description"
                  defaultValue={selectedTemplate?.description ?? ''}
                  className="cc-native-field min-h-24 sm:col-span-2"
                />
                <textarea
                  name="requirements"
                  placeholder="Key requirements"
                  defaultValue={selectedTemplate?.requirements ?? ''}
                  className="cc-native-field min-h-24 sm:col-span-2"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input type="checkbox" name="publish_now" />
                  Publish immediately
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit" className="w-full sm:w-auto">Create Job</Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-slate-600">
                You can view hiring activity, but only ECD admins can create and publish jobs.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobRows.length === 0 ? (
              <p className="text-sm text-slate-600">
                No jobs yet. Create your first role above to show it under Job opportunities on the landing page.
              </p>
            ) : (
              jobRows.map((job) => (
                <div key={job.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{job.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {job.role_type} | {job.is_published ? 'Published' : 'Draft'} | Created {formatDate(job.created_at)}
                      </p>
                      {job.closes_at ? <p className="mt-1 text-xs text-slate-600">Closes {formatDate(job.closes_at)}</p> : null}
                    </div>
                    {canManageJobs ? (
                      <form action={toggleJobPublishAction}>
                        <input type="hidden" name="job_id" value={job.id} />
                        <input type="hidden" name="next_published" value={job.is_published ? 'false' : 'true'} />
                        <Button type="submit" size="sm" variant={job.is_published ? 'outline' : 'default'}>
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
            <Button asChild variant="outline">
              <Link href={`/centre/${centre.slug}`}>View your public jobs section</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </EcdOsShell>
  )
}

