'use client'

import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import Link from 'next/link'

type ComingSoonCardProps = {
  title: string
  description: string
  icon: LucideIcon
  backHref?: string
}

export function ComingSoonCard({ title, description, icon: Icon, backHref = '/ecd/dashboard' }: ComingSoonCardProps) {
  return (
    <Card className="max-w-2xl mx-auto mt-12 border-dashed border-2 border-slate-200 shadow-none">
      <CardContent className="pt-12 pb-12 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-3xl bg-cyan-50 flex items-center justify-center mb-6">
          <Icon className="h-10 w-10 text-cyan-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
        <p className="mt-2 text-slate-500 font-medium max-w-sm">
          {description}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button asChild className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-11 px-8 rounded-xl">
            <Link href={backHref}>Back to Dashboard</Link>
          </Button>
          <Button variant="outline" className="border-slate-200 text-slate-700 font-bold h-11 px-8 rounded-xl">
            Notify Me When Ready
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
