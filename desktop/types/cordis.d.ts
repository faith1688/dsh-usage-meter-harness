/**
 * Local type stub for `@deepseek-ai/cordis` — used ONLY to type-check and build
 * this plugin outside the DSH source repo (the real package is a peer
 * dependency provided by the harness at runtime, and is not installed here).
 *
 * Types are intentionally loose (the harness's actual `Context` is richer);
 * the emitted JS is identical regardless because every usage is type-only or
 * structural. This file is NOT published (it lives under `./types`, outside
 * the npm `files` allowlist) and only wires up `tsconfig paths`.
 */

export interface SettingsScope {
  get(): Record<string, unknown>;
  watch(cb: (value: unknown) => void): void;
  update(patch: Record<string, unknown>): Promise<void>;
}

export interface Context {
  settings: {
    register(namespace: unknown, schema: unknown, opts?: unknown): SettingsScope;
  };
  sessionProjections: {
    register(def: unknown): void;
    snapshot(session: unknown): { values: Record<string, unknown> };
  };
  webServer: {
    register(opts: { kind: string; path: string; handler: (req: any, res: any) => unknown }): void;
  };
  effect(fn: () => unknown): unknown;
  on(
    event: string,
    listener: (session: object, event: { type: string; data: Record<string, unknown>; time: number }) => void,
  ): unknown;
  [key: string]: unknown;
}

export class Service {
  ctx: Context;
  constructor(ctx: Context, name: string) {
    this.ctx = ctx;
    void name;
  }
  [key: string]: unknown;
}
