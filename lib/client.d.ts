import type { ReactElement } from 'react';
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Services this client plugin requires on `ctx`. */
export declare const inject: string[];
type DockProps = PropsRuntime<'conversation.composer.dock'>;
export declare function apply(ctx: ClientContext): void;
export declare function UsageReadout({ useProjection }: DockProps): ReactElement | null;
export {};
