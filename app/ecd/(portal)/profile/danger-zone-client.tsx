'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'

type DangerZoneClientProps = {
  action: (formData: FormData) => void | Promise<void>
}

export function DangerZoneClient({ action }: DangerZoneClientProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <Card className="border-rose-200 bg-rose-50/50">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!revealed ? (
          <Button type="button" variant="outline" className="border-rose-300 text-rose-800" onClick={() => setRevealed(true)}>
            Show cancellation options
          </Button>
        ) : (
          <form action={action} className="grid gap-3 md:grid-cols-2">
            <textarea
              name="reason"
              className="cc-native-field md:col-span-2 h-auto min-h-24 py-2"
              placeholder="Reason for cancellation"
              required
            />
            <input
              name="confirmation"
              className="cc-native-field"
              placeholder='Type "CANCEL" to confirm'
              required
            />
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" variant="outline" className="border-rose-300 text-rose-800">
                Request Subscription Cancellation
              </Button>
              <Button type="button" variant="outline" onClick={() => setRevealed(false)}>
                Hide
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

