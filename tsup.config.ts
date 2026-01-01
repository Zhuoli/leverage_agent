import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
    'mcp/atlassian-server': 'src/mcp/atlassian-server.ts',
    'mcp/oci-server': 'src/mcp/oci-server.ts',
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
