'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ParentNotificationBellProps = {
  parentId: string
}

export function ParentNotificationBell({ parentId }: ParentNotificationBellProps) {
  void parentId

  return (
    <Button
      asChild
      type="button"
      variant="outline"
      size="icon"
      className="relative h-10 w-10 rounded-2xl border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
      aria-label="Open notifications"
    >
      <Link href="/parent/notifications">
        <Bell className="h-4 w-4" />
      </Link>
    </Button>
  )
}

