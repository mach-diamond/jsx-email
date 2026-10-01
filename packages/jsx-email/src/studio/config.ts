import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { array, custom, object, optional, parse, pipe, regex, string } from 'valibot';
import type { InferOutput } from 'valibot';
import type { ReactElement } from 'react';

const identifier = pipe(string(), regex(/^[a-z0-9][a-z0-9-]*$/));
type RenderEmail = (element: ReactElement, options?: { plainText?: boolean }) => Promise<string>;
type BrandContext = (brand: string, run: () => Promise<string>) => Promise<string>;
type SampleProps = (template: string, brand: string) => Record<string, unknown>;
const callable = <T>() => custom<T>((value) => typeof value === 'function');
export const projectSchema = object({
  id: identifier,
  name: string(),
  description: optional(string(), ''),
  templateDir: string(),
  assetDir: optional(string()),
  analytics: optional(object({ profile: optional(string()), region: string() })),
  templateClasses: optional(
    array(object({ id: identifier, name: string(), templates: array(string()) })),
    []
  ),
  brands: array(
    object({
      id: identifier,
      name: string(),
      description: optional(string(), ''),
      color: optional(string(), '#252525'),
      screenshot: optional(string()),
      templates: optional(array(string()), ['**/*'])
    })
  ),
  render: optional(callable<RenderEmail>()),
  withBrand: optional(callable<BrandContext>()),
  previewProps: optional(callable<SampleProps>())
});
export type StudioProject = InferOutput<typeof projectSchema>;

const registrySchema = object({ projects: array(string()) });
const configName = 'email-studio.config.ts';

// An explicit project never consults the workspace registry, even if it is missing.
export const resolveStudioConfigs = async (
  options: { project?: string; registry?: string },
  cwd: string
): Promise<string[]> => {
  if (options.project) {
    const path = resolve(cwd, options.project);
    if (!existsSync(path)) throw new TypeError(`Email project configuration not found: ${path}`);
    return [path];
  }
  if (options.registry) {
    const path = resolve(cwd, options.registry);
    const registry = parse(registrySchema, JSON.parse(await readFile(path, 'utf8')));
    return [...new Set(registry.projects.map((entry) => resolve(dirname(path), entry)))];
  }
  let directory = cwd;
  while (true) {
    for (const path of [
      join(directory, configName),
      join(directory, 'apps/_shared/mail/venture-config', configName)
    ]) {
      if (existsSync(path)) return [path];
    }
    const localRegistry = join(directory, 'studio.projects.json');
    if (directory === cwd && existsSync(localRegistry))
      return resolveStudioConfigs({ registry: localRegistry }, cwd);
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new TypeError(
    'No email project found. Supply --project <config> or --registry <registry.json>.'
  );
};
