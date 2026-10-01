import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

import {
  brandTemplateFiles,
  createProjectLoader,
  renderBrandTemplates,
  type LoadedProject
} from './loader.js';

import { studioProjectSummary, serveStudioAsset } from './catalog.js';
import { createAnalyticsReader } from './analytics.js';

export const startStudio = async (
  configPaths: string[],
  options: { port?: number; host?: boolean; open?: boolean } = {}
) => {
  const loader = createProjectLoader();
  const analytics = createAnalyticsReader();
  const loaded = new Map<string, Promise<LoadedProject>>();
  const knownProjects = new Map<string, string>();
  const rendered = new WeakMap<
    LoadedProject,
    Map<string, ReturnType<typeof renderBrandTemplates>>
  >();
  const temp = await mkdtemp(join(tmpdir(), 'jsx-email-studio-'));
  const root = resolve(import.meta.dirname, '../preview');
  const load = (path: string) => {
    if (!loaded.has(path))
      loaded.set(
        path,
        loader
          .load(path)
          .then((project) => {
            knownProjects.set(project.config.id, path);
            return project;
          })
          .catch((error) => {
            loaded.delete(path);
            throw error;
          })
      );
    return loaded.get(path)!;
  };
  const catalog = async () => {
    const ids = new Set<string>();
    return Promise.all(
      configPaths.map(async (path) => {
        try {
          const project = await load(path);
          const { config } = project;
          if (ids.has(config.id)) throw new TypeError(`Duplicate project id: ${config.id}`);
          ids.add(config.id);
          return studioProjectSummary(project);
        } catch (error) {
          return {
            id: path,
            name: 'Unavailable project',
            description: '',
            brands: [],
            error: String(error)
          };
        }
      })
    );
  };
  const findProject = async (id: string) => {
    const known = knownProjects.get(id);
    if (known) {
      const project = await load(known);
      return project.config.id === id ? project : null;
    }
    const projects = await Promise.all(configPaths.map((path) => load(path).catch(() => null)));
    return projects.find((project) => project?.config.id === id) ?? null;
  };
  const server = await createServer({
    root,
    configFile: false,
    clearScreen: false,
    plugins: [
      react(),
      {
        name: 'email-studio',
        configureServer(vite) {
          vite.watcher.add(configPaths.map(dirname));
          vite.watcher.on('all', (_event, file) => {
            if (file.includes('/node_modules/')) return;
            const affected = configPaths.filter(
              (path) => file === path || file.startsWith(`${dirname(path)}/`)
            );
            if (!affected.length) return;
            affected.forEach((path) => loaded.delete(path));
            vite.ws.send({ type: 'custom', event: 'email-studio:change', data: {} });
          });
          vite.middlewares.use(async (request, response, next) => {
            const url = new URL(request.url || '/', 'http://localhost');
            if (!url.pathname.startsWith('/__studio/')) return next();
            response.setHeader('Cache-Control', 'no-store');
            try {
              if (request.method !== 'GET') {
                response.statusCode = 405;
                response.end();
                return;
              }
              let data: unknown;
              if (url.pathname === '/__studio/catalog') data = await catalog();
              else {
                const asset = url.pathname.match(/^\/__studio\/assets\/([^/]+)\/(.+)$/);
                const project = await findProject(
                  asset ? asset[1] : url.searchParams.get('project') || ''
                );
                if (!project) {
                  response.statusCode = 404;
                  response.end('Unknown project');
                  return;
                }
                if (asset) {
                  await serveStudioAsset(project, asset[2], response);
                  return;
                }
                if (url.pathname === '/__studio/analytics') {
                  if (
                    request.headers.origin &&
                    new URL(request.headers.origin).host !== request.headers.host
                  ) {
                    response.statusCode = 403;
                    response.end();
                    return;
                  }
                  if (!project.config.analytics)
                    throw new TypeError('AWS analytics is not configured for this project.');
                  data = await analytics(
                    project.config.analytics,
                    Number(url.searchParams.get('days') || 30),
                    url.searchParams.get('scope') || 'account'
                  );
                  response.setHeader('Content-Type', 'application/json');
                  response.end(JSON.stringify(data));
                  return;
                }
                if (url.pathname !== '/__studio/templates') {
                  response.statusCode = 404;
                  response.end();
                  return;
                }
                const brand = url.searchParams.get('brand') || '';
                brandTemplateFiles(project, brand);
                const classId = url.searchParams.get('class') || undefined;
                const key = JSON.stringify([brand, classId]);
                const cache =
                  rendered.get(project) ??
                  new Map<string, ReturnType<typeof renderBrandTemplates>>();
                rendered.set(project, cache);
                if (!cache.has(key))
                  cache.set(
                    key,
                    renderBrandTemplates(project, brand, classId).catch((error) => {
                      cache.delete(key);
                      throw error;
                    })
                  );
                data = await cache.get(key);
              }
              response.setHeader('Content-Type', 'application/json');
              response.end(JSON.stringify(data));
            } catch (error) {
              response.statusCode = 500;
              response.setHeader('Content-Type', 'application/json');
              response.end(
                JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
              );
            }
          });
        }
      }
    ],
    define: {
      'import.meta.env.VITE_JSXEMAIL_STUDIO': JSON.stringify(true),
      'import.meta.env.VITE_JSXEMAIL_TARGET_PATH': JSON.stringify(temp)
    },
    resolve: { alias: { '@jsxemailbuild': temp } },
    server: { host: options.host ?? false, port: options.port ?? 55420, strictPort: true }
  });
  const close = server.close.bind(server);
  server.close = async () => {
    await close();
    await loader.close();
    await rm(temp, { recursive: true, force: true });
  };
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  server.printUrls();
  if (options.open !== false) server.openBrowser();
  return server;
};
