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
/**
 * Live stream speed source. The installed 0.1.5 dock kit passes a `useChat`
 * selector hook (SnapshotSelectorHook<ChatSnapshot>) whose `legacy.partial`
 * is the live PartialAssistant, republished on every visible stream chunk.
 * The rc type shim (this plugin's dev-time @deepseek-ai/* deps) does not
 * declare it on the session standard kit, so it is typed structurally here
 * with a no-op fallback — the hook call site stays unconditional either way.
 */
type LivePartialBlock = {
    kind?: string;
    text?: string;
};
type LivePartial = {
    turn: number;
    step: number;
    blocks: readonly LivePartialBlock[];
};
type LiveChatState = {
    legacy?: {
        partial?: LivePartial | null;
    } | null;
};
type UseChatLike = <S>(sel: (s: LiveChatState) => S) => S;
type DockProps = PropsRuntime<'conversation.composer.dock'> & {
    useChat?: UseChatLike;
};
export declare function apply(ctx: ClientContext): void;
export declare function UsageReadout({ useProjection, useChat }: DockProps): ReactElement | null;
export {};
