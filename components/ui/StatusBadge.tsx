import { Badge } from '@/components/ui/badge'

type StatusBadgeProps = {
  status: string
}

function toVariant(status: string): 'secondary' | 'success' | 'warning' | 'outline' {
  if (status === 'enrolled') return 'success'
  if (status === 'approved') return 'success'
  if (status === 'waitlisted' || status === 'in_review') return 'warning'
  if (status === 'rejected' || status === 'withdrawn') return 'outline'
  return 'secondary'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={toVariant(status)}>{status.replaceAll('_', ' ')}</Badge>
}
