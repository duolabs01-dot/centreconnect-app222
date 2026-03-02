'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type PickupVerifyClientProps = {
  ecdId: string
}

type ChildRow = {
  id: string
  first_name: string
  last_name: string
}

type EnrolledApplicationRow = {
  child_id: string | null
  children:
    | { id: string; first_name: string | null; last_name: string | null }
    | Array<{ id: string; first_name: string | null; last_name: string | null }>
    | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function PickupVerifyClient({ ecdId }: PickupVerifyClientProps) {
  const [childSearch, setChildSearch] = useState('')
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [selectedChildName, setSelectedChildName] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [children, setChildren] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [childrenLoading, setChildrenLoading] = useState(true)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function loadChildren() {
      const { data } = await supabase
        .from('applications')
        .select('child_id,children(id,first_name,last_name)')
        .eq('ecd_id', ecdId)
        .eq('status', 'enrolled')
        .limit(100)

      if (!active) return

      const rows = (data ?? []) as EnrolledApplicationRow[]
      const seen = new Set<string>()
      const mapped: ChildRow[] = []

      for (const row of rows) {
        const child = normalizeOne(row.children)
        const childId = child?.id ?? row.child_id
        if (!childId || seen.has(childId)) continue
        seen.add(childId)
        mapped.push({
          id: childId,
          first_name: child?.first_name?.trim() || 'Child',
          last_name: child?.last_name?.trim() || '',
        })
      }

      setChildren(mapped)
      setChildrenLoading(false)
    }

    void loadChildren()
    return () => {
      active = false
    }
  }, [ecdId])

  const filteredChildren = useMemo(() => {
    const term = childSearch.trim().toLowerCase()
    if (!term) return children
    return children.filter((child) => `${child.first_name} ${child.last_name}`.toLowerCase().includes(term))
  }, [childSearch, children])

  async function verifyCode() {
    if (!selectedChildId || codeInput.length !== 6) return

    setVerifying(true)
    setResult(null)

    const supabase = createClient()
    const errorMap: Record<string, string> = {
      not_found: 'No code found for this child',
      expired: 'This code has expired. Ask the parent to generate a new one.',
      used: 'This code has already been used.',
      locked: 'This code is locked after too many failed attempts.',
      invalid: 'Incorrect code. Please check and try again.',
    }

    try {
      const { data, error } = await supabase.rpc('verify_pickup_code_atomic', {
        p_ecd_id: ecdId,
        p_child_id: selectedChildId,
        p_code: codeInput,
      })

      if (error) {
        setResult({ success: false, message: error.message || 'Verification failed.' })
        return
      }

      const payload = data as { success?: boolean; error?: string } | null
      const success = Boolean(payload?.success)
      const message = payload?.error
        ? (errorMap[payload.error] ?? 'Verification failed.')
        : `${selectedChildName ?? 'Child'} may be released.`

      setResult({ success, message })
      if (success) {
        setCodeInput('')
        toast.success(message)
        window.setTimeout(() => {
          setSelectedChildId(null)
          setSelectedChildName(null)
          setChildSearch('')
          setResult(null); // Clear result after successful verification and timeout
        }, 3000)
      } else {
        toast.error(message);
      }
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Select Child</p>
        <input
          className="cc-native-field mt-2"
          placeholder="Search child name..."
          value={childSearch}
          onChange={(event) => setChildSearch(event.target.value)}
        />

        {selectedChildName ? (
          <div className="mt-2 inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
            {selectedChildName}
          </div>
        ) : null}

        <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
          {childrenLoading ? (
            <p className="text-xs text-slate-500">Loading children...</p>
          ) : filteredChildren.length === 0 ? (
            <p className="text-xs text-slate-500">No matching children</p>
          ) : (
            filteredChildren.map((child) => {
              const fullName = `${child.first_name} ${child.last_name}`.trim()
              const active = selectedChildId === child.id
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    setSelectedChildId(child.id)
                    setSelectedChildName(fullName)
                  }}
                  className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {fullName}
                </button>
              )
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Pickup Code</p>
        <input
          type="text"
          inputMode="numeric" // Added inputMode
          maxLength={6}
          placeholder="Enter 6-digit code"
          value={codeInput}
          onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, ''))}
          className="cc-native-field mt-2 h-16 text-center text-3xl font-black tracking-[0.3em]" // Updated h-16 and text-3xl
        />

        <Button // Changed to Button component for consistent styling
          type="button"
          onClick={verifyCode}
          disabled={!selectedChildId || codeInput.length !== 6 || verifying}
          className="mt-3 w-full py-3 text-base" // Made button large and full width
        >
          {verifying ? 'Checking...' : 'Verify Code'}
        </Button>
      </section>

      {/* Removed direct result display as toast handles it */}
    </div>
  )
}
