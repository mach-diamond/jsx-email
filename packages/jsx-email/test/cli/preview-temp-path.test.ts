import os from 'node:os';
import { join } from 'node:path';

import { realpath } from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

describe('getTempPath', () => {
  it('gives each process its own preview directory, stable within the process', async () => {
    const first = await import('../../src/cli/commands/build.js');
    const a = await first.getTempPath('preview');
    expect(await first.getTempPath('preview')).toBe(a);

    // A second module instance stands in for a second `email preview` process.
    vi.resetModules();
    const second = await import('../../src/cli/commands/build.js');
    const b = await second.getTempPath('preview');

    const shared = first.normalizePath(join(await realpath(os.tmpdir()), 'jsx-email/preview'));
    expect(a).not.toBe(shared);
    expect(b).not.toBe(shared);
    expect(b).not.toBe(a);
  });

  it('keeps the build directory fixed', async () => {
    const { getTempPath, normalizePath } = await import('../../src/cli/commands/build.js');
    expect(await getTempPath('build')).toBe(
      normalizePath(join(await realpath(os.tmpdir()), 'jsx-email/build'))
    );
  });
});
