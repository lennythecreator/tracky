import { useState } from 'react'
import { Button } from '../../../../registry/components/ui/button'

export default function ButtonExample() {
  const [activations, setActivations] = useState(0)

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button analyticsName="docs_continue" onClick={() => setActivations((count) => count + 1)}>
          Continue
        </Button>
        <Button
          analyticsName="docs_save_draft"
          variant="secondary"
          onClick={() => setActivations((count) => count + 1)}
        >
          Save draft
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Activations: {activations}. Each button sends <code>button · activate</code> and nothing about
        the label.
      </p>
    </div>
  )
}
