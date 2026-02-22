import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/cc-admin/Table'
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CentreHealth = {
  id: string
  name: string
  suburb: string
  city: string
  tier: string
  status: string
  last_login_at: string | null
  attendance_recorded: number
  applications_received: number
  payment_status: 'paid' | 'overdue' | 'failed' | 'unknown'
  support_tickets_open: number
  health_score: 'green' | 'amber' | 'red'
}

interface CentreHealthGridProps {
  centres: CentreHealth[]
}

function HealthIndicator({ score }: { score: 'green' | 'amber' | 'red' }) {
  if (score === 'green') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  }
  if (score === 'amber') {
    return <AlertTriangle className="h-5 w-5 text-amber-500" />
  }
  return <AlertCircle className="h-5 w-5 text-rose-500" />
}

export function CentreHealthGrid({ centres }: CentreHealthGridProps) {
  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]"></TableHead>
            <TableHead>Centre</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>Finance</TableHead>
            <TableHead>Support</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {centres.map((centre) => (
            <TableRow key={centre.id}>
              <TableCell>
                <HealthIndicator score={centre.health_score} />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{centre.name}</span>
                  <span className="text-xs text-slate-500 capitalize">{centre.tier} plan</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-xs text-slate-500">
                  <span>{centre.suburb}</span>
                  <span>{centre.city}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>Login: {centre.last_login_at ? new Date(centre.last_login_at).toLocaleDateString() : 'Never'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-slate-400" />
                    <span>Attendance: {centre.attendance_recorded} (7d)</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={centre.payment_status === 'overdue' || centre.payment_status === 'failed' ? 'destructive' : 'outline'} className="capitalize">
                  {centre.payment_status}
                </Badge>
              </TableCell>
              <TableCell>
                {centre.support_tickets_open > 0 ? (
                  <Badge variant="secondary" className="text-amber-700 bg-amber-50 border-amber-200">
                    {centre.support_tickets_open} Open
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-400">None</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <button className="text-xs font-medium text-blue-600 hover:underline">
                  View
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
