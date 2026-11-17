import { useState } from 'react'
import { Checkbox } from '../../../../registry/components/ui/checkbox'

export default function CheckboxExample() {
  const [weekly, setWeekly] = useState(false)

  return (
    <div className="grid gap-3">
      <label className="flex items-center gap-2.5 text-sm">
        <Checkbox
          analyticsName="docs_weekly_email"
          checked={weekly}
          onChange={(event) => setWeekly(event.currentTarget.checked)}
        />
        Weekly product email
      </label>
      <p className="text-sm text-muted-foreground">
        Checked: {weekly ? 'yes' : 'no'}. The event reports <code>checkbox · toggle</code>, never the
        checked state.
      </p>
    </div>
  )
}
