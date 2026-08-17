/**
 * dsh-usage-meter — client plugin entry.
 *
 * The client bundle entry is `src/client/index.ts` (no JSX), mirroring
 * ui-layout/ui-conversation: this file exports `inject` + `apply` and imports
 * the JSX component from `UsageReadout.tsx`.
 *
 * @module @deepseek-ai/dsh-usage-meter/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { UsageReadout } from './UsageReadout.tsx'

/** Services this client plugin requires on `ctx`. */
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  // Wrap in slots.inject so registration waits for the dock seat's declaration
  // regardless of plugin load order.
  ctx.slots.inject('conversation.composer.dock', () =>
    ctx.slots.register(
      { name: 'conversation.composer.dock', id: 'usage-meter.readout', order: 20 },
      UsageReadout,
    ),
  )
}
