import { boolean, object, optional, parse, string } from 'valibot';

import { resolveStudioConfigs } from '../../studio/config.js';
import { startStudio } from '../../studio/server.js';
import type { CommandFn } from './types.js';

export const command: CommandFn = async (flags) => {
  const options = parse(
    object({
      project: optional(string()),
      registry: optional(string()),
      open: optional(boolean()),
      host: optional(boolean())
    }),
    flags
  );
  const paths = await resolveStudioConfigs(options, process.cwd());
  const port = flags.port === undefined ? 55420 : Number(flags.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new TypeError('Invalid studio port');
  globalThis.isJsxEmailPreview = true;
  const server = await startStudio(paths, { ...options, port });
  server.bindCLIShortcuts();
  const stop = async () => {
    await server.close();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return true;
};
