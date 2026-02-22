import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type StatCardProps = {
  title: string
  value: string | number
  helper?: string
}

export function StatCard({ title, value, helper }: StatCardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="px-4 pb-1 pt-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <p className="text-2xl font-semibold leading-none text-slate-900 sm:text-3xl">{value}</p>
        {helper ? <p className="mt-1 line-clamp-1 text-[11px] text-slate-600">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}
