import type { ReactElement } from 'react';
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/**
 * Slot contract for the sidebar settings page. The canonical declaration lives
 * in `@deepseek-ai/dsh-client-ui-settings` (the shell's settings base package),
 * which this plugin program does not import; the SlotMap merge below is
 * structurally identical to that declaration (list/root, owner `close`), and
 * declaration merging is additive — the shell's real declaration wins at
 * runtime composition.
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'settings.section': {
            kind: 'list';
            scope: 'root';
            owner: {
                close: () => void;
            };
        };
    }
}
/** Services this client plugin requires on `ctx`. */
export declare const inject: string[];
type DockProps = PropsRuntime<'conversation.composer.dock'>;
export declare function apply(ctx: ClientContext): void;
export declare function UsageReadout({ useProjection }: DockProps): ReactElement | null;
export {};
