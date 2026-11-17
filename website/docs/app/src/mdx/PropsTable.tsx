export interface PropsTableRow {
  name: string
  type: string
  defaultValue?: string
  description: string
}

export interface PropsTableProps {
  /** One row per prop; `description` is required so no prop ships unexplained. */
  rows: PropsTableRow[]
}

/**
 * The props table every component page shares. Rows are data, not MDX markup, so
 * a page cannot forget the default or reorder the columns.
 */
export function PropsTable({ rows }: PropsTableProps) {
  return (
    <div className="my-5 overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th scope="col">Prop</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
              </td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>{row.defaultValue ? <code>{row.defaultValue}</code> : '—'}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
