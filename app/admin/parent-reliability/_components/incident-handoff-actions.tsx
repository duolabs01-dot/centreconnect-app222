'use client'

import { useCallback, useEffect, useState } from 'react'

type CopyStatus = 'idle' | 'copied' | 'failed'

type IncidentHandoffActionsProps = {
  summaryText: string
  whatsappHref: string
}

export function IncidentHandoffActions({ summaryText, whatsappHref }: IncidentHandoffActionsProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  useEffect(() => {
    if (copyStatus === 'idle') return
    const timeout = window.setTimeout(() => setCopyStatus('idle'), 2500)
    return () => window.clearTimeout(timeout)
  }, [copyStatus])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }, [summaryText])

  const copyLabel = copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Copy failed' : 'Copy summary'
  const copyHint =
    copyStatus === 'copied'
      ? 'Summary copied to clipboard.'
      : copyStatus === 'failed'
        ? 'Copy failed. Select the text and copy manually.'
        : 'Copy or share this handoff summary.'

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
      >
        {copyLabel}
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/20"
      >
        Share on WhatsApp
      </a>
      <p className="text-[11px] text-slate-400 sm:ml-1">{copyHint}</p>
    </div>
  )
}
