import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import mime from 'mime-types';
import { brandTemplateFiles, templateClassFor, type LoadedProject } from './loader.js';

export const studioProjectSummary = (project: LoadedProject) => ({
  id: project.config.id,
  name: project.config.name,
  description: project.config.description,
  analytics: Boolean(project.config.analytics),
  brands: project.config.brands.map(({ templates: _, screenshot, ...brand }) => {
    const files = brandTemplateFiles(project, brand.id);
    const classes = new Map<string, { id: string; name: string; count: number }>();
    for (const file of files) {
      const type = templateClassFor(project, file);
      const current = classes.get(type.id) || { ...type, count: 0 };
      current.count += 1;
      classes.set(type.id, current);
    }
    return {
      ...brand,
      count: files.length,
      classes: [...classes.values()],
      screenshot: screenshot ? `/__studio/assets/${project.config.id}/${screenshot}` : undefined
    };
  })
});

export const serveStudioAsset = async (
  project: LoadedProject,
  asset: string,
  response: ServerResponse
) => {
  if (!project.config.assetDir) {
    response.statusCode = 404;
    response.end();
    return;
  }
  const assetRoot = await realpath(resolve(dirname(project.configPath), project.config.assetDir));
  const file = await realpath(resolve(assetRoot, decodeURIComponent(asset)));
  const path = relative(assetRoot, file);
  if (path.startsWith('..') || isAbsolute(path) || !(await stat(file)).isFile()) {
    response.statusCode = 404;
    response.end();
    return;
  }
  response.setHeader('Content-Type', mime.lookup(file) || 'application/octet-stream');
  createReadStream(file).pipe(response);
};
