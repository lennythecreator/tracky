import { useState } from 'react'
import { Input } from '../../../../registry/components/ui/input'
import { Label } from '../../../../registry/components/ui/label'

export default function LabelExample() {
  const [focused, setFocused] = useState(false)

  return (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="docs-label-digest">Digest frequency</Label>
      <Input
        id="docs-label-digest"
        defaultValue="Weekly"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <p className="text-sm text-muted-foreground">
        Click the label to move focus to the field. Field focused: {focused ? 'yes' : 'no'}.
      </p>
    </div>
  )
}
