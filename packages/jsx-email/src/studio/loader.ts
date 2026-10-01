import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build as bundle } from 'esbuild';
import { globby } from 'globby';
import micromatch from 'micromatch';
import { parse } from 'valibot';
import type { ReactElement } from 'react';

import { render } from '../renderer/render.js';
import { projectSchema, type StudioProject } from './config.js';

type TemplateModule = {
  Template?: (props: Record<string, unknown>) => ReactElement;
  default?: (props: Record<string, unknown>) => ReactElement;
  templateName?: string;
  previewProps?: Record<string, unknown>;
  previewPresets?: { name: string; props: Record<string, unknown> }[];
};
export interface LoadedProject {
  configPath: string;
  config: StudioProject;
  files: string[];
  modules: TemplateModule[];
}

export const createProjectLoader = () => {
  const session = randomUUID();
  const caches = new Set<string>();
  let revision = 0;
  const load = async (configPath: string): Promise<LoadedProject> => {
    const root = dirname(configPath);
    const cache = join(root, 'node_modules/.cache/email-studio', session);
    caches.add(cache);
    await mkdir(cache, { recursive: true });
    const compile = async (contents: string) => {
      revision += 1;
      const outfile = join(cache, `${revision}.mjs`);
      await bundle({
        stdin: { contents, resolveDir: root, loader: 'ts' },
        outfile,
        bundle: true,
        packages: 'external',
        platform: 'node',
        format: 'esm',
        jsx: 'automatic',
        logLevel: 'silent',
        define: { 'import.meta.isJsxEmailPreview': 'true' }
      });
      return import(pathToFileURL(outfile).href);
    };
    const preliminary = await compile(`export { default } from ${JSON.stringify(configPath)};`);
    const first = parse(projectSchema, preliminary.default);
    const files = await globby('**/*.{tsx,jsx}', {
      cwd: resolve(root, first.templateDir),
      absolute: true
    });
    files.sort();
    const entry = `export { default } from ${JSON.stringify(configPath)};\n${files
      .map((file, i) => `import * as template${i} from ${JSON.stringify(file)};`)
      .join('\n')}\nexport const templates = [${files.map((_, i) => `template${i}`).join(',')}];`;
    const loaded = await compile(entry);
    const config = parse(projectSchema, loaded.default);
    if (new Set(config.brands.map((brand) => brand.id)).size !== config.brands.length) {
      throw new TypeError(`Duplicate brand id in ${config.id}`);
    }
    return { configPath, config, files, modules: loaded.templates };
  };
  return {
    load,
    close: () => Promise.all([...caches].map((path) => rm(path, { recursive: true, force: true })))
  };
};

export const projectTemplatePath = (project: LoadedProject, file: string) =>
  relative(resolve(dirname(project.configPath), project.config.templateDir), file).replaceAll(
    '\\',
    '/'
  );

export const brandTemplateFiles = (project: LoadedProject, brandId: string) => {
  const brand = project.config.brands.find((item) => item.id === brandId);
  if (!brand) throw new TypeError(`Unknown brand: ${brandId}`);
  return project.files.filter((file) =>
    micromatch.isMatch(projectTemplatePath(project, file), brand.templates)
  );
};

export const templateClassFor = (project: LoadedProject, file: string) => {
  const path = projectTemplatePath(project, file);
  const configured = project.config.templateClasses.find((item) =>
    micromatch.isMatch(path, item.templates)
  );
  if (configured) return { id: configured.id, name: configured.name };
  const name = path.includes('/') ? path.split('/')[0] : 'General';
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name };
};

export const renderBrandTemplates = async (
  project: LoadedProject,
  brandId: string,
  classId?: string
) => {
  const selected = brandTemplateFiles(project, brandId).filter(
    (file) => !classId || templateClassFor(project, file).id === classId
  );
  const { config } = project;
  const renderEmail = config.render ?? render;
  return Promise.all(
    selected.map(async (file) => {
      const template = project.modules[project.files.indexOf(file)];
      const component = template.Template ?? template.default;
      if (typeof component !== 'function')
        throw new TypeError(`No Template or default component in ${file}`);
      const path = projectTemplatePath(project, file);
      const defaults = { ...template.previewProps, ...config.previewProps?.(path, brandId) };
      const samples = template.previewPresets?.length
        ? template.previewPresets
        : [{ name: 'Default', props: defaults }];
      const presets = await Promise.all(
        samples.map(async (sample) => {
          const props = { ...defaults, ...sample.props };
          const output = async (plainText: boolean) => {
            const run = () => renderEmail(component(props), { plainText });
            return config.withBrand ? config.withBrand(brandId, run) : run();
          };
          const [html, plain] = await Promise.all([output(false), output(true)]);
          const assetBase = `/__studio/assets/${config.id}/`;
          const normalize = (value: string) =>
            value.replaceAll(/(["'(])\/static\//g, `$1${assetBase}`);
          return { name: sample.name, props, html: normalize(html), plain };
        })
      );
      const route = path.replace(/\.[^.]+$/, '');
      return {
        id: `${config.id}/${brandId}/${route}`,
        path: route,
        fileName: route,
        fileExtension: '.tsx',
        templateName: template.templateName || route.split('/').at(-1)!,
        templateClass: templateClassFor(project, file),
        html: presets[0].html,
        plain: presets[0].plain,
        presets,
        source: await readFile(file, 'utf8'),
        sourcePath: file,
        sourceFile: path
      };
    })
  );
};
