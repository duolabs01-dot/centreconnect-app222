export type ParentHomeState = 'discover' | 'pending' | 'enrolled'

export function deriveParentHomeState(input: {
  hasPendingApplications: boolean
  hasEnrolledChild: boolean
}) {
  if (input.hasEnrolledChild) return 'enrolled' satisfies ParentHomeState
  if (input.hasPendingApplications) return 'pending' satisfies ParentHomeState
  return 'discover' satisfies ParentHomeState
}
