import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.tsx',
  },
  format: ['esm'],
  // Peer deps are provided by the harness at load time — never bundle them.
  external: ['react', 'react/jsx-runtime', /^@deepseek-ai\//],
  dts: true,
  clean: true,
});
