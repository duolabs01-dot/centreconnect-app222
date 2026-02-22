'use client'

import { useState } from 'react'
import { Button } from '@/components/ecd/Button'
import {
  QUICK_PUBLISH_TEMPLATES,
  QuickPublishDrawer,
  type TemplateKey,
} from '@/components/ecd/announcements/quick-publish-drawer'

type QuickPublishPanelProps = {
  ecdId: string
  centreName: string
}

export function QuickPublishPanel({ ecdId, centreName }: QuickPublishPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey | null>(null)

  function handleQuickPublish(key: TemplateKey) {
    setActiveTemplate(key)
    setDrawerOpen(true)
  }

  return (
    <>
      <div className="grid gap-2 md:grid-cols-2">
        {(Object.keys(QUICK_PUBLISH_TEMPLATES) as TemplateKey[]).map((key) => {
          const template = QUICK_PUBLISH_TEMPLATES[key]
          return (
            <Button
              key={key}
              type="button"
              variant="outline"
              className="justify-start gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-left text-slate-100 shadow-sm transition-colors hover:border-cyan-500/40 hover:bg-white/5"
              onClick={() => handleQuickPublish(key)}
            >
              <span className="text-base">{template.emoji}</span>
              {template.label}
            </Button>
          )
        })}
      </div>
      <QuickPublishDrawer
        open={drawerOpen}
        templateKey={activeTemplate}
        ecdId={ecdId}
        centreName={centreName}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
