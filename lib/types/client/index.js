import { UsageReadout } from "./UsageReadout.js";
/** Services this client plugin requires on `ctx`. */
export const inject = ['slots'];
export function apply(ctx) {
    // Wrap in slots.inject so registration waits for the dock seat's declaration
    // regardless of plugin load order.
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({ name: 'conversation.composer.dock', id: 'usage-meter.readout', order: 20 }, UsageReadout));
}
//# sourceMappingURL=index.js.map