import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { resolveStudioConfigs } from '../../src/studio/config.js';
import {
  brandTemplateFiles,
  createProjectLoader,
  renderBrandTemplates
} from '../../src/studio/loader.js';

const loader = createProjectLoader();
const fixture = resolve(import.meta.dirname, 'fixtures/email-studio.config.ts');
afterAll(() => loader.close());

describe('studio scope', () => {
  it('finds only the enclosing project even with a sibling registry', async () => {
    const root = await mkdtemp(join(tmpdir(), 'studio-scope-'));
    try {
      const config = join(root, 'project/apps/_shared/mail/venture-config/email-studio.config.ts');
      await mkdir(join(root, 'project/apps/_shared/mail/venture-config'), { recursive: true });
      await writeFile(config, '');
      await writeFile(
        join(root, 'studio.projects.json'),
        JSON.stringify({ projects: ['other.ts'] })
      );
      expect(await resolveStudioConfigs({}, join(root, 'project'))).toEqual([config]);
      await expect(resolveStudioConfigs({ project: 'missing.ts' }, root)).rejects.toThrow(
        'not found'
      );
      expect(await resolveStudioConfigs({ registry: 'studio.projects.json' }, root)).toEqual([
        join(root, 'other.ts')
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('studio rendering', () => {
  it('filters brand applicability and isolates concurrent async brand renders', async () => {
    const project = await loader.load(fixture);
    expect(brandTemplateFiles(project, 'alpha')).toHaveLength(2);
    expect(brandTemplateFiles(project, 'beta')).toHaveLength(1);
    const [alpha, beta] = await Promise.all([
      renderBrandTemplates(project, 'alpha'),
      renderBrandTemplates(project, 'beta')
    ]);
    const welcome = alpha.find((item) => item.path === 'welcome')!;
    expect(welcome.html).toContain('alpha: Alex');
    expect(welcome.presets[1].html).toContain('alpha: Sam');
    expect(beta[0].html).toContain('beta: Alex');
    expect(beta[0].html).not.toContain('alpha:');
    expect(beta[0].plain).toContain('beta: Alex');
    expect(beta[0].id).not.toEqual(welcome.id);
    expect(beta[0].source).toContain('brand.getStore');
    await expect(renderBrandTemplates(project, 'unregistered')).rejects.toThrow('Unknown brand');
  });
});
