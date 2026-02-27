'use client'

import { useLiteMode } from '@/lib/context/LiteModeProvider'
import { Switch } from '@/components/ui/switch' // Assuming Radix UI Switch component
import { Label } from '@/components/ui/label'   // Assuming Radix UI Label component

export function LiteModeToggle() {
  const { isLiteMode, toggleLiteMode } = useLiteMode();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor="lite-mode-toggle" className="text-base font-semibold text-gray-900">
          Lite Mode
        </Label>
        <p className="text-sm text-gray-500">
          Reduce data usage by lowering image quality and disabling animations.
        </p>
      </div>
      <Switch
        id="lite-mode-toggle"
        checked={isLiteMode}
        onCheckedChange={toggleLiteMode}
      />
    </div>
  );
}
