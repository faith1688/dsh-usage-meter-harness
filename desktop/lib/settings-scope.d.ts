type Values = Record<string, unknown>;
/** The 0.1 `ctx.settings.register(...)` scope surface this plugin relies on. */
export interface SettingsScope {
    /** The resolved value: schema defaults ← base ← persisted user values. */
    get(): Values;
    /** Merge a patch into persisted user values, then notify watchers. */
    update(patch: Values): Promise<void>;
    /** Observe resolved-value changes; returns the disposer. */
    watch(listener: (next: Values) => void): () => void;
}
export interface SettingsScopeOptions {
    /** Directory holding `settings.json` (created on demand). */
    dir: string;
    /** schemastery schema: callable, applies defaults, validates, strips unknown keys. */
    schema: (value?: unknown) => Values;
    /** Composition-entry config: beats schema defaults, loses to persisted values. */
    base?: Values;
}
/**
 * Create the scope. Loading is lazy per call so an external edit of the file is
 * picked up by the next `get()`, matching the 0.1 service's read path.
 * @param options - directory, schema, and composition base config.
 * @returns the scope with `get` / `update` / `watch`.
 */
export declare function createSettingsScope(options: SettingsScopeOptions): SettingsScope;
export {};
