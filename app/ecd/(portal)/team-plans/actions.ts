'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const createWeeklyPlanSchema = z.object({
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(3).max(120),
  theme: z.string().max(240).optional().default(''),
  learningLead: z.string().uuid().optional().or(z.literal('')),
  careLead: z.string().uuid().optional().or(z.literal('')),
  parentLead: z.string().uuid().optional().or(z.literal('')),
  closingLead: z.string().uuid().optional().or(z.literal('')),
})

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  nextStatus: z.enum(['pending', 'in_progress', 'done', 'blocked']),
})

const DAY_LABELS = [
  { key: 1, label: 'Monday' },
  { key: 2, label: 'Tuesday' },
  { key: 3, label: 'Wednesday' },
  { key: 4, label: 'Thursday' },
  { key: 5, label: 'Friday' },
] as const

function taskTemplate(args: {
  dayLabel: string
  theme: string
  classesLabel: string
  centreName: string
}) {
  const themeSuffix = args.theme ? ` around ${args.theme}` : ''
  return [
    {
      bucket: 'learning',
      title: `${args.dayLabel}: learning plan${themeSuffix}`,
      details: `Prepare and guide the day activities for ${args.classesLabel}. Keep it simple, practical, and age-appropriate.`,
    },
    {
      bucket: 'care',
      title: `${args.dayLabel}: attendance and care check`,
      details: `Confirm attendance, meals, and daily care notes for ${args.centreName}.`,
    },
    {
      bucket: 'parent',
      title: `${args.dayLabel}: parent updates`,
      details: 'Capture any parent notes, missing items, or follow-ups that must be sent through CentreConnect.',
    },
    {
      bucket: 'closing',
      title: `${args.dayLabel}: closing and safety wrap-up`,
      details: 'Check handover, classroom readiness, and any issue that the owner must review before the next day.',
    },
  ]
}

export async function createWeeklyPlanAction(formData: FormData) {
  const session = await requireEcdPortalSession({ cached: false })
  if (session.role === 'ecd_staff') {
    redirect('/ecd/team-plans?error=Only%20admins%20and%20supervisors%20can%20create%20the%20weekly%20plan.')
  }

  const parsed = createWeeklyPlanSchema.safeParse({
    weekOf: String(formData.get('week_of') ?? ''),
    title: String(formData.get('title') ?? ''),
    theme: String(formData.get('theme') ?? ''),
    learningLead: String(formData.get('learning_lead') ?? ''),
    careLead: String(formData.get('care_lead') ?? ''),
    parentLead: String(formData.get('parent_lead') ?? ''),
    closingLead: String(formData.get('closing_lead') ?? ''),
  })

  if (!parsed.success) {
    redirect('/ecd/team-plans?error=Please%20complete%20the%20weekly%20plan%20form%20properly.')
  }

  const [{ data: classes }, { data: centre }, { data: existingPlan }] = await Promise.all([
    session.supabase.from('ecd_classes').select('name,age_group').eq('ecd_id', session.ecdId).order('created_at', { ascending: true }),
    session.supabase.from('ecd_centres').select('name').eq('id', session.ecdId).maybeSingle(),
    session.supabase.from('ecd_weekly_plans').select('id').eq('ecd_id', session.ecdId).eq('week_of', parsed.data.weekOf).maybeSingle(),
  ])

  const classesLabel = (classes ?? [])
    .map((row: any) => [row.name, row.age_group].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(', ') || 'your classes'

  let planId = existingPlan?.id ?? null
  if (planId) {
    await session.supabase.from('ecd_weekly_plans').update({ title: parsed.data.title, theme: parsed.data.theme || null }).eq('id', planId)
    await session.supabase.from('ecd_weekly_plan_tasks').delete().eq('plan_id', planId)
  } else {
    const { data: planRow, error: planError } = await session.supabase
      .from('ecd_weekly_plans')
      .insert({
        ecd_id: session.ecdId,
        week_of: parsed.data.weekOf,
        title: parsed.data.title,
        theme: parsed.data.theme || null,
        created_by: session.user.id,
      })
      .select('id')
      .single()

    if (planError || !planRow?.id) {
      redirect('/ecd/team-plans?error=Could%20not%20save%20the%20weekly%20plan.')
    }
    planId = planRow.id
  }

  const assignments = {
    learning: parsed.data.learningLead || session.user.id,
    care: parsed.data.careLead || session.user.id,
    parent: parsed.data.parentLead || session.user.id,
    closing: parsed.data.closingLead || session.user.id,
  }

  const tasks = DAY_LABELS.flatMap((day) =>
    taskTemplate({
      dayLabel: day.label,
      theme: parsed.data.theme,
      classesLabel,
      centreName: centre?.name ?? 'your centre',
    }).map((task) => ({
      plan_id: planId,
      ecd_id: session.ecdId,
      day_of_week: day.key,
      bucket: task.bucket,
      title: task.title,
      details: task.details,
      assigned_to: assignments[task.bucket as keyof typeof assignments],
      status: 'pending',
    }))
  )

  const { error: tasksError } = await session.supabase.from('ecd_weekly_plan_tasks').insert(tasks)
  if (tasksError) {
    redirect('/ecd/team-plans?error=Could%20not%20create%20the%20daily%20tasks.')
  }

  revalidatePath('/ecd/team-plans')
  revalidatePath('/ecd/dashboard')
  revalidatePath('/ecd/employment')
  redirect('/ecd/team-plans?success=weekly-plan-saved')
}

export async function updateWeeklyTaskStatusAction(formData: FormData) {
  const session = await requireEcdPortalSession({ cached: false })
  const parsed = updateTaskSchema.safeParse({
    taskId: String(formData.get('task_id') ?? ''),
    nextStatus: String(formData.get('next_status') ?? 'pending'),
  })

  if (!parsed.success) {
    redirect('/ecd/team-plans?error=Invalid%20task%20update.')
  }

  const { error } = await session.supabase
    .from('ecd_weekly_plan_tasks')
    .update({
      status: parsed.data.nextStatus,
      completed_at: parsed.data.nextStatus === 'done' ? new Date().toISOString() : null,
      completed_by: parsed.data.nextStatus === 'done' ? session.user.id : null,
    })
    .eq('id', parsed.data.taskId)
    .eq('ecd_id', session.ecdId)

  if (error) {
    redirect('/ecd/team-plans?error=Could%20not%20update%20the%20task.')
  }

  revalidatePath('/ecd/team-plans')
  revalidatePath('/ecd/dashboard')
  redirect('/ecd/team-plans?success=task-updated')
}
