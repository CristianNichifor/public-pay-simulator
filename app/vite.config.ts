import react from '@vitejs/plugin-react';
import { createReadStream, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const base = process.env.VITE_BASE ?? '/';
const basePath = base.endsWith('/') ? base : `${base}/`;
const dataDir = resolve(root, 'public', 'data');

function serveDataFiles(): Plugin {
  return {
    name: 'serve-data-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        const localPath =
          basePath !== '/' && pathname.startsWith(basePath) ? `/${pathname.slice(basePath.length)}` : pathname;

        if (!localPath.startsWith('/data/')) {
          next();
          return;
        }

        const relativePath = decodeURIComponent(localPath.slice('/data/'.length));
        const filePath = resolve(dataDir, relativePath);
        if (!filePath.startsWith(`${dataDir}/`)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        try {
          if (!statSync(filePath).isFile()) {
            next();
            return;
          }
        } catch {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

// A project site is served from /<repo>/, so the base must carry that prefix in CI.
export default defineConfig({
  root,
  base,
  publicDir: resolve(root, 'public'),
  plugins: [serveDataFiles(), react()],
  build: { outDir: 'dist', sourcemap: false },
});
