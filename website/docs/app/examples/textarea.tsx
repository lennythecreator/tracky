import { useState } from 'react'
import { Label } from '../../../../registry/components/ui/label'
import { Textarea } from '../../../../registry/components/ui/textarea'

export default function TextareaExample() {
  const [focused, setFocused] = useState(false)

  return (
    <div className="grid max-w-sm gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="docs-textarea-note">Release note</Label>
        <Textarea
          id="docs-textarea-note"
          rows={4}
          defaultValue="Focus styles use the ring token."
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      <Textarea
        disabled
        rows={3}
        placeholder="Disabled"
        aria-label="Disabled textarea example"
      />

      <p className="text-sm text-muted-foreground">
        Focused: {focused ? 'yes' : 'no'}. The text never leaves the element, and the component sends
        nothing.
      </p>
    </div>
  )
}
