import type { AnalyticsClient } from '../types.js'
import { CLICKABLE, isIgnored, targetMetadata } from './dom.js'

/** Each function attaches one page-wide capture category and returns its cleanup. */

export function captureClicks(client: AnalyticsClient): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element) || isIgnored(target)) return
    // A Tracky component emits its own documented action for this interaction.
    if (target.closest('[data-tracky-component]')) return
    const el = target.closest(CLICKABLE)
    if (el) client.track('click', targetMetadata(el))
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}

export function captureFormSubmits(client: AnalyticsClient): () => void {
  const onSubmit = (event: Event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || isIgnored(form)) return
    client.track('form_submit', targetMetadata(form))
  }
  document.addEventListener('submit', onSubmit, true)
  return () => document.removeEventListener('submit', onSubmit, true)
}

export function captureInputChanges(client: AnalyticsClient): () => void {
  const onChange = (event: Event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return
    if (target instanceof HTMLInputElement && (target.type === 'password' || target.type === 'hidden')) return
    if (isIgnored(target)) return
    client.track('input_interaction', targetMetadata(target))
  }
  document.addEventListener('change', onChange, true)
  return () => document.removeEventListener('change', onChange, true)
}
