'use client'

import { useFormStatus } from 'react-dom'
import { Button, type ButtonProps } from '@/components/ui/button'

type WebsiteActionButtonProps = ButtonProps & {
  pendingLabel: string
}

export function WebsiteActionButton({ pendingLabel, children, disabled, ...props }: WebsiteActionButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      {...props}
      type={props.type ?? 'submit'}
      disabled={disabled || pending}
      loading={pending}
      loadingText={pendingLabel}
    >
      {children}
    </Button>
  )
}
