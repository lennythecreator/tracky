import { useState } from 'react'
import { Input } from '../../../../registry/components/ui/input'
import { Label } from '../../../../registry/components/ui/label'

export default function InputExample() {
  const [focused, setFocused] = useState<string | null>(null)

  return (
    <div className="grid max-w-sm gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="docs-input-name">Workspace name</Label>
        <Input
          id="docs-input-name"
          defaultValue="Northstar Studio"
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="docs-input-slug">Workspace slug</Label>
        <Input
          id="docs-input-slug"
          aria-invalid="true"
          aria-describedby="docs-input-slug-error"
          defaultValue="northstar studio"
          onFocus={() => setFocused('slug')}
          onBlur={() => setFocused(null)}
        />
        <p id="docs-input-slug-error" className="text-sm text-destructive">
          Use lowercase letters and dashes.
        </p>
      </div>

      <Input disabled placeholder="Disabled" aria-label="Disabled example" />

      <p className="text-sm text-muted-foreground">
        Focused: {focused ?? 'none'}. Typing stays in the field, and the component sends nothing.
      </p>
    </div>
  )
}
