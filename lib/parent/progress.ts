'use server'

import { createClient } from '@/lib/supabase/server'
import {
  deriveParentHomeState,
  hasEnrolledChildStatus,
  hasPendingParentApplicationStatus,
  isEnrolledApplicationStatus,
  type ParentHomeState,
} from '@/lib/parent/home-state'
import { evaluateApplicationDocumentChecklist } from '@/lib/admissions/application-documents'

export type ParentProgress = {
  // Child counts
  childrenCount: number
  enrolledCount: number
  pendingApplicationsCount: number
  savedCentresCount: number
  
  // Application states
  hasEnrolledChild: boolean
  hasPendingApplications: boolean
  
  // Profile completeness
  hasName: boolean
  hasPhone: boolean
  hasRelationship: boolean
  hasEmergencyContact: boolean
  hasAvatar: boolean
  hasAllRequiredProfileFields: boolean
  
  // Document completeness
  documentsCount: number
  requiredDocumentsCount: number
  hasAllRequiredDocuments: boolean
  
  // Document expiry alerts
  expiringDocuments: Array<{
    docType: string
    expiryDate: string
    daysUntilExpiry: number
  }>
  urgentExpiringDocuments: Array<{
    docType: string
    expiryDate: string
    daysUntilExpiry: number
  }>
  upcomingExpiringDocuments: Array<{
    docType: string
    expiryDate: string
    daysUntilExpiry: number
  }>
  
  // Derived
  profileCompleteness: number
  homeState: ParentHomeState
  nextAction: ParentNextAction
}

export type ParentNextAction = {
  type: 'add_first_child' | 'browse_creches' | 'check_application' | 'complete_profile' | 'upload_documents' | 'view_updates' | 'renew_documents'
  title: string
  description: string
  href: string
  missingProfileFields: string[]
}

export async function getParentProgress(userId: string): Promise<ParentProgress> {
  const supabase = await createClient()

  // Fetch all needed data in parallel
  const [
    { data: userProfile },
    { data: parentProfile },
    { data: children },
    { count: childrenCount },
    { data: applications },
    { count: enrolledCount },
    { data: documents },
    { count: savedCentresCount },
  ] = await Promise.all([
    supabase.from('user_profiles').select('full_name,phone,avatar_url').eq('id', userId).maybeSingle(),
    supabase.from('parents').select('guardian_relationship,emergency_contact_name,emergency_contact_phone').eq('id', userId).maybeSingle(),
    supabase.from('children').select('id,enrollment_status').eq('parent_id', userId),
    supabase.from('children').select('id', { count: 'exact', head: true }).eq('parent_id', userId),
    supabase.from('applications').select('id,status').eq('parent_id', userId),
    supabase.from('applications').select('id', { count: 'exact', head: true }).eq('parent_id', userId).eq('status', 'enrolled'),
    supabase.from('parent_documents').select('doc_type,expiry_date').eq('parent_id', userId).limit(80),
    supabase.from('parent_shortlists').select('id', { count: 'exact', head: true }).eq('parent_id', userId),
  ])

  // Calculate child counts
  const actualChildrenCount = childrenCount ?? children?.length ?? 0
  const actualEnrolledCount = enrolledCount ?? 0
  const enrolledChildren = (children ?? []).filter((child: any) => hasEnrolledChildStatus(child.enrollment_status))
  const enrolledApplications = (applications ?? []).filter((application: any) =>
    isEnrolledApplicationStatus(application.status)
  )
  const hasEnrolledChild = enrolledChildren.length > 0 || enrolledApplications.length > 0 || actualEnrolledCount > 0

  // Application states
  const pendingApplications = (applications ?? []).filter((application: any) =>
    hasPendingParentApplicationStatus(application.status)
  )
  const hasPendingApplications = pendingApplications.length > 0

  // Profile fields
  const hasName = Boolean(userProfile?.full_name?.trim())
  const hasPhone = Boolean(userProfile?.phone?.trim())
  const hasRelationship = Boolean(parentProfile?.guardian_relationship?.trim())
  const hasEmergencyContact = Boolean(
    parentProfile?.emergency_contact_name?.trim() && 
    parentProfile?.emergency_contact_phone?.trim()
  )
  const hasAvatar = Boolean(userProfile?.avatar_url?.trim())
  const hasAllRequiredProfileFields = hasName && hasPhone && hasRelationship && hasEmergencyContact && hasAvatar

  // Document checklist
  const documentChecklist = evaluateApplicationDocumentChecklist((documents ?? []).map((d: any) => d.doc_type))
  const documentsCount = documentChecklist.uploadedCount
  const requiredDocumentsCount = documentChecklist.totalRequired
  const hasAllRequiredDocuments = documentChecklist.missingCodes.length === 0

  // Profile completeness — 5 profile fields only (documents tracked separately)
  // A parent who fills in all visible profile fields must reach exactly 100%
  const profileFieldsComplete = [hasName, hasPhone, hasRelationship, hasEmergencyContact, hasAvatar].filter(Boolean).length
  const profileCompleteness = Math.round((profileFieldsComplete / 5) * 100)

  // Check for expiring documents (30, 7, 1 days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiringDocuments = (documents ?? []).filter((d: any) => {
    if (!d.expiry_date) return false
    const expiryDate = new Date(d.expiry_date)
    expiryDate.setHours(0, 0, 0, 0)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }).map((d: any) => ({
    docType: d.doc_type,
    expiryDate: d.expiry_date,
    daysUntilExpiry: Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }))

  const urgentExpiring = expiringDocuments.filter(d => d.daysUntilExpiry <= 7)
  const upcomingExpiring = expiringDocuments.filter(d => d.daysUntilExpiry > 7 && d.daysUntilExpiry <= 30)

  // Home state
  const homeState = deriveParentHomeState({
    hasPendingApplications,
    hasEnrolledChild,
  })

  // Next action logic
  const nextAction = calculateNextAction({
    hasChildren: actualChildrenCount > 0,
    hasEnrolledChild,
    hasPendingApplications,
    hasAllRequiredProfileFields,
    hasAllRequiredDocuments,
    missingDocuments: documentChecklist.missingCodes.length,
    missingProfileFields: [
      { key: 'name', label: 'your name', complete: hasName },
      { key: 'phone', label: 'phone number', complete: hasPhone },
      { key: 'relationship', label: 'relationship to child', complete: hasRelationship },
      { key: 'emergency', label: 'emergency contact', complete: hasEmergencyContact },
      { key: 'avatar', label: 'profile photo', complete: hasAvatar },
    ].filter(f => !f.complete).map(f => f.label),
    urgentExpiringDocs: urgentExpiring.length,
  })

  return {
    childrenCount: actualChildrenCount,
    enrolledCount: actualEnrolledCount,
    pendingApplicationsCount: pendingApplications.length,
    savedCentresCount: savedCentresCount ?? 0,
    hasEnrolledChild,
    hasPendingApplications,
    hasName,
    hasPhone,
    hasRelationship,
    hasEmergencyContact,
    hasAvatar,
    hasAllRequiredProfileFields,
    documentsCount,
    requiredDocumentsCount,
    hasAllRequiredDocuments,
    expiringDocuments,
    urgentExpiringDocuments: urgentExpiring,
    upcomingExpiringDocuments: upcomingExpiring,
    profileCompleteness,
    homeState,
    nextAction,
  }
}

function calculateNextAction(input: {
  hasChildren: boolean
  hasEnrolledChild: boolean
  hasPendingApplications: boolean
  hasAllRequiredProfileFields: boolean
  hasAllRequiredDocuments: boolean
  missingDocuments: number
  missingProfileFields: string[]
  urgentExpiringDocs?: number
}): ParentNextAction {
  const base = { missingProfileFields: input.missingProfileFields }
  
  // Priority 0: Urgent document expiry (within 7 days) - always show this first
  if (input.urgentExpiringDocs && input.urgentExpiringDocs > 0) {
    return {
      type: 'renew_documents',
      title: 'Documents expiring soon!',
      description: `${input.urgentExpiringDocs} document${input.urgentExpiringDocs > 1 ? 's will' : ' will'} expire within 7 days. Renew now to avoid issues.`,
      href: '/parent/profile/documents',
      ...base,
    }
  }

  // Priority 1: No children yet
  if (!input.hasChildren) {
    return {
      type: 'add_first_child',
      title: 'Add your first child',
      description: 'Register your child to start applying to trusted creches.',
      href: '/parent/children/new',
      ...base,
    }
  }

  // Priority 2: Has enrolled child
  if (input.hasEnrolledChild) {
    if (!input.hasAllRequiredProfileFields) {
      return {
        type: 'complete_profile',
        title: 'Complete your profile',
        description: `Add ${input.missingProfileFields.join(', ')} to receive updates from the creche.`,
        href: '/parent/profile',
        ...base,
      }
    }
    return {
      type: 'view_updates',
      title: "View today's updates",
      description: 'Check in on your enrolled child\'s activities and reports.',
      href: '/parent/dashboard',
      ...base,
    }
  }

  // Priority 3: Has pending applications
  if (input.hasPendingApplications) {
    if (!input.hasAllRequiredDocuments) {
      return {
        type: 'upload_documents',
        title: 'Upload remaining documents',
        description: `${input.missingDocuments} document${input.missingDocuments > 1 ? 's' : ''} needed to complete your application${input.hasPendingApplications ? 's' : ''}.`,
        href: '/parent/profile/documents',
        ...base,
      }
    }
    return {
      type: 'check_application',
      title: 'Check your application status',
      description: 'See what\'s happening with your creche applications.',
      href: '/parent/applications',
      ...base,
    }
  }

  // Priority 4: No applications yet
  if (!input.hasAllRequiredProfileFields) {
    return {
      type: 'complete_profile',
      title: 'Complete your profile',
      description: `Add ${input.missingProfileFields.join(', ')} before applying.`,
      href: '/parent/profile',
      ...base,
    }
  }

  // Default: Browse creches
  return {
    type: 'browse_creches',
    title: 'Find creches near you',
    description: 'Browse trusted creches and start your application.',
    href: '/parent/discover',
    ...base,
  }
}

