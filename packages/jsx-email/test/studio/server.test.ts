import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer as createSocket } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { expect, it } from 'vitest';

// Exercise the compiled server and packed app, as installed consumers do.
import { startStudio } from '../../dist/studio/server.js';

it('serves only registered projects, survives bad saves, and reloads recovered templates', async () => {
  const root = await mkdtemp(join(tmpdir(), 'email-studio-server-test-'));
  await cp(resolve(import.meta.dirname, 'fixtures'), root, {
    recursive: true,
    filter: (path) => !path.includes('node_modules')
  });
  await symlink(
    resolve(import.meta.dirname, '../../../../node_modules'),
    join(root, 'node_modules')
  );
  const socket = createSocket();
  await new Promise<void>((done) => socket.listen(0, 'localhost', done));
  const { port } = socket.address() as { port: number };
  await new Promise<void>((done) => socket.close(() => done()));
  const server = await startStudio([join(root, 'email-studio.config.ts')], {
    port,
    open: false
  });
  const base = server.resolvedUrls!.local[0];
  const file = join(root, 'templates/welcome.tsx');
  const original = await readFile(file, 'utf8');
  try {
    const home = await fetch(base);
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('main.tsx');
    const catalog = await fetch(`${base}__studio/catalog`).then((reply) => reply.json());
    expect(catalog.map((project: { id: string }) => project.id)).toEqual(['fixture']);
    const unknown = await fetch(`${base}__studio/templates?project=other&brand=alpha`);
    expect(unknown.status).toBe(404);
    const templates = () => fetch(`${base}__studio/templates?project=fixture&brand=beta`);
    expect((await (await templates()).json())[0].html).toContain('beta: Alex');
    await writeFile(file, 'this is invalid tsx <');
    await expect.poll(async () => (await templates()).status, { timeout: 5000 }).toBe(500);
    await writeFile(file, original.replace('{recipient}</Text>', 'Updated {recipient}</Text>'));
    await expect
      .poll(
        async () => {
          const reply = await templates();
          if (!reply.ok) return '';
          return (await reply.json())[0].html;
        },
        { timeout: 5000 }
      )
      .toContain('Updated Alex');
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
}, 20000);
