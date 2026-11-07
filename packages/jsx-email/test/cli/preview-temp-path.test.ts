import { existsSync } from 'node:fs';
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

  it.each(['SIGINT', 'SIGTERM'] as const)('removes the preview directory on %s', async (signal) => {
    vi.resetModules();
    const { getTempPath } = await import('../../src/cli/commands/build.js');
    const dir = await getTempPath('preview');
    expect(existsSync(dir)).toBe(true);

    // The listeners from other module instances stand in for other shutdown owners; drop them so
    // this one is last and must re-raise.
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const ours = process.listeners(signal).at(-1)!;
    process.removeAllListeners(signal);
    process.once(signal, ours as NodeJS.SignalsListener);
    process.emit(signal, signal);

    expect(existsSync(dir)).toBe(false);
    expect(kill).toHaveBeenCalledWith(process.pid, signal);
    kill.mockRestore();
  });

  it('keeps the build directory fixed', async () => {
    const { getTempPath, normalizePath } = await import('../../src/cli/commands/build.js');
    expect(await getTempPath('build')).toBe(
      normalizePath(join(await realpath(os.tmpdir()), 'jsx-email/build'))
    );
  });
});
