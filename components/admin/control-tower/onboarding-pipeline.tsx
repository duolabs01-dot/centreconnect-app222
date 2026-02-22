import { ArrowRight, CheckCircle2, UserPlus, FileText, Baby } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'

export interface PipelineStage {
  id: string
  label: string
  count: number
  description: string
  stalledCount: number
}

interface OnboardingPipelineProps {
  stages: PipelineStage[]
}

const StageIcon = ({ stage }: { stage: string }) => {
  switch (stage) {
    case 'signed_up': return <UserPlus className="h-4 w-4" />
    case 'profile_complete': return <CheckCircle2 className="h-4 w-4" />
    case 'first_child': return <Baby className="h-4 w-4" />
    case 'first_app': return <FileText className="h-4 w-4" />
    default: return <ArrowRight className="h-4 w-4" />
  }
}

export function OnboardingPipeline({ stages }: OnboardingPipelineProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-slate-600">Onboarding Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex-1 min-w-[120px] flex items-center">
              <div className="flex flex-col items-center w-full relative group">
                <div className="h-10 w-10 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mb-2 group-hover:bg-cyan-100 transition-colors">
                  <StageIcon stage={stage.id} />
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">{stage.count}</div>
                  <div className="text-xs font-medium text-slate-500">{stage.label}</div>
                  {stage.stalledCount > 0 && (
                     <div className="mt-1 text-[10px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full inline-block font-semibold">
                       {stage.stalledCount} stalled
                     </div>
                  )}
                </div>
                
                {index < stages.length - 1 && (
                  <div className="absolute top-5 left-1/2 w-full h-[2px] bg-slate-100 -z-10 transform translate-x-1/2" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
