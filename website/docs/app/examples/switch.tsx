import { useState } from 'react'
import { Switch } from '../../../../registry/components/ui/switch'

export default function SwitchExample() {
  const [digest, setDigest] = useState(true)

  return (
    <div className="grid gap-3">
      <label className="flex items-center gap-2.5 text-sm">
        <Switch
          analyticsName="docs_weekly_digest"
          checked={digest}
          onChange={(event) => setDigest(event.currentTarget.checked)}
        />
        Weekly digest
      </label>
      <p className="text-sm text-muted-foreground">
        On: {digest ? 'yes' : 'no'}. The switch sends <code>switch · toggle</code> when it changes.
      </p>
    </div>
  )
}
