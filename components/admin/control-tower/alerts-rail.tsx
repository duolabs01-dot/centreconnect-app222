import { AlertTriangle, Clock, CreditCard, UserX, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'
import { Button } from '@/components/cc-admin/Button'
import { cn } from '@/lib/utils'

export type AlertType = 'failed_payment' | 'inactive_centre' | 'stalled_onboarding' | 'old_ticket' | 'rls_error'

export interface Alert {
  id: string
  type: AlertType
  priority: 'high' | 'medium' | 'low'
  message: string
  details: string
  actionLabel: string
  timestamp: string
}

interface AlertsRailProps {
  alerts: Alert[]
}

const AlertIcon = ({ type }: { type: AlertType }) => {
  switch (type) {
    case 'failed_payment':
      return <CreditCard className="h-4 w-4 text-rose-500" />
    case 'inactive_centre':
      return <UserX className="h-4 w-4 text-amber-500" />
    case 'stalled_onboarding':
      return <Clock className="h-4 w-4 text-blue-500" />
    case 'old_ticket':
      return <AlertCircle className="h-4 w-4 text-purple-500" />
    case 'rls_error':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-slate-500" />
  }
}

export function AlertsRail({ alerts }: AlertsRailProps) {
  if (alerts.length === 0) {
    return (
      <Card className="h-full border-dashed bg-slate-50">
        <CardContent className="flex flex-col items-center justify-center h-full text-slate-400">
          <CheckCircle2 className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">All systems operational</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full shadow-md border-l-4 border-l-amber-400 bg-white">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Action Required ({alerts.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto max-h-[600px]">
        <div className="divide-y divide-slate-100">
          {alerts.map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors group">
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 rounded-full p-1.5 ring-1 ring-inset", 
                  alert.priority === 'high' ? "bg-rose-50 ring-rose-200" : "bg-slate-50 ring-slate-200"
                )}>
                  <AlertIcon type={alert.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900 truncate pr-2">
                      {alert.message}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(alert.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {alert.details}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs w-full justify-between group-hover:border-slate-300 group-hover:text-slate-900 transition-all"
                  >
                    {alert.actionLabel}
                    <ArrowRight className="h-3 w-3 ml-1 opacity-50" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


