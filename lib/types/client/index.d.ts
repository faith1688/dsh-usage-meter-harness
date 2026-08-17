/**
 * dsh-usage-meter — client plugin entry.
 *
 * The client bundle entry is `src/client/index.ts` (no JSX), mirroring
 * ui-layout/ui-conversation: this file exports `inject` + `apply` and imports
 * the JSX component from `UsageReadout.tsx`.
 *
 * @module @deepseek-ai/dsh-usage-meter/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Services this client plugin requires on `ctx`. */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map