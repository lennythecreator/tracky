import { useState } from 'react'
import { Label } from '../../../../registry/components/ui/label'
import { Select } from '../../../../registry/components/ui/select'

const PLANS = [
  ['starter', 'Starter'],
  ['team', 'Team'],
  ['enterprise', 'Enterprise'],
] as const

export default function SelectExample() {
  const [plan, setPlan] = useState('team')

  return (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="docs-example-plan">Plan</Label>
      <Select
        id="docs-example-plan"
        analyticsName="docs_plan"
        value={plan}
        onChange={(event) => setPlan(event.currentTarget.value)}
      >
        {PLANS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <p className="text-sm text-muted-foreground">
        Selected: {plan}. The event reports <code>select · change</code>, never the chosen option.
      </p>
    </div>
  )
}
