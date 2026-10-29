import path from 'node:path'
import { CliError } from './errors.js'
import { toPosix, type TrackyConfig } from './config.js'
import type { RegistryItem } from './registry.js'

export interface PlannedFile {
  item: string
  target: string
  content: string
}

/**
 * Import specifier for a project-relative directory, expressed through the
 * consumer's alias. `src/components/ui` with `@` mapped to `src` becomes
 * `@/components/ui`.
 */
export function aliasSpecifier(config: TrackyConfig, directory: string): string {
  const relative = path.posix.relative(toPosix(config.alias.root), toPosix(directory))

  if (relative === '' || relative === '.') return config.alias.prefix

  if (relative.startsWith('..')) {
    throw new CliError(
      `"${directory}" is outside the alias root "${config.alias.root}".`,
      'Set "alias.root" in tracky.json to a directory that contains both the UI and lib directories.',
    )
  }

  return `${config.alias.prefix}/${relative}`
}

/**
 * Replaces the registry's placeholders with the consumer's alias specifiers.
 * Payloads never carry repo or consumer paths; this is the only place that
 * knows either side.
 */
export function rewriteContent(content: string, config: TrackyConfig): string {
  let output = content

  if (output.includes('@tracky/ui/')) {
    output = output.split('@tracky/ui/').join(`${aliasSpecifier(config, config.ui)}/`)
  }

  if (output.includes('@tracky/lib/')) {
    output = output.split('@tracky/lib/').join(`${aliasSpecifier(config, config.lib)}/`)
  }

  if (output.includes('@tracky/')) {
    throw new CliError(
      'A registry payload contains a placeholder this version of the CLI does not know about.',
      'Update tracky, or report it at https://github.com/lennythecreator/tracky/issues.',
    )
  }

  return output
}

export function planFiles(
  root: string,
  config: TrackyConfig,
  items: RegistryItem[],
): PlannedFile[] {
  const planned = new Map<string, PlannedFile>()

  for (const item of items) {
    if (item.type === 'theme') {
      throw new CliError(
        `"${item.name}" is installed by tracky init, not tracky add.`,
        'Run `npx tracky init` to write the theme tokens and Tailwind mapping.',
      )
    }

    const directory = item.type === 'lib' ? config.lib : config.ui

    for (const file of item.files) {
      if (file.type === 'theme') continue

      const target = path.join(root, directory, path.basename(file.path))
      planned.set(target, {
        item: item.name,
        target,
        content: rewriteContent(file.content, config),
      })
    }
  }

  return [...planned.values()]
}
