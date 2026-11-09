/**
 * dsh-usage-meter-desktop — file-backed settings scope.
 *
 * DSH 0.1 shipped a host settings service (`ctx.settings.register(name, schema,
 * { base })`) that returned a scope with `get()` / `update()` / `watch()` and
 * persisted user values into `settings.yaml`. DSH 0.2 (0.2.0-rc.2) replaced that
 * service with `SettingsForms` (presentation only): `ctx.settings.register` no
 * longer exists, so a 0.1-era call throws
 * `TypeError: ctx.settings.register is not a function` and the whole plugin
 * entry fails to activate (`dsh: warning: 1 entry did not activate`).
 *
 * This module reproduces the 0.1 scope semantics on plain JSON, so the desktop
 * build depends on nothing from the harness settings service:
 *
 *   schema defaults  →  composition `base`  →  persisted user values
 *
 * The user file lives in the plugin's OWN data directory
 * (`$DSH_HOME/usage-meter-desktop/settings.json`), never in the web build's
 * `$DSH_HOME/usage-meter` tree, so the two builds cannot share or corrupt state.
 *
 * @module dsh-usage-meter-desktop/settings-scope
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

/** Read a JSON object, tolerating a missing or corrupt file (fresh defaults). */
function readObject(file: string): Values {
  try {
    if (!existsSync(file)) return {};
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Values;
  } catch {
    return {};
  }
}

/** Replace the file in one atomic step so a crash cannot leave half a document. */
function writeObjectAtomic(file: string, value: Values): void {
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temp, file);
}

/**
 * Create the scope. Loading is lazy per call so an external edit of the file is
 * picked up by the next `get()`, matching the 0.1 service's read path.
 * @param options - directory, schema, and composition base config.
 * @returns the scope with `get` / `update` / `watch`.
 */
export function createSettingsScope(options: SettingsScopeOptions): SettingsScope {
  const file = join(options.dir, 'settings.json');
  const listeners = new Set<(next: Values) => void>();

  const resolve = (): Values => {
    const layered: Values = { ...(options.base ?? {}), ...readObject(file) };
    try {
      return options.schema(layered) as Values;
    } catch {
      // A persisted value no longer satisfies the schema (downgrade or a hand
      // edit). Keep defaults + base instead of taking the plugin down; the next
      // successful `update` rewrites a valid document.
      try {
        return { ...(options.schema({}) as Values), ...layered };
      } catch {
        return layered;
      }
    }
  };

  return {
    get: resolve,
    async update(patch) {
      const stored: Values = { ...readObject(file), ...patch };
      // Validate before persisting: an invalid patch must not poison the file.
      options.schema(stored);
      mkdirSync(options.dir, { recursive: true });
      writeObjectAtomic(file, stored);
      // Watchers observe the RESOLVED value (defaults ← base ← stored), exactly
      // like get(). Handing out the bare patch merge instead would silently drop
      // the composition `base` config the moment a watcher re-applies it.
      const next = resolve();
      for (const listener of [...listeners]) {
        try {
          listener(next);
        } catch (err) {
          console.warn('[usage-meter-desktop] settings watcher failed:', err);
        }
      }
    },
    watch(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
