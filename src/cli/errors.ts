/**
 * An expected CLI failure. The message is the problem; `hint` is what the
 * developer can do about it. Both are printed without a stack trace.
 */
export class CliError extends Error {
  readonly hint?: string

  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'CliError'
    this.hint = hint
  }
}
