import { readFile, writeFile } from 'node:fs/promises';

import chalk from 'chalk';
import prettyBytes from 'pretty-bytes';

import { type BuildTempatesResult, buildTemplates, normalizePath } from './commands/build.js';

export { originalCwd } from '../helpers.js';

interface BuildForPreviewParams {
  buildPath: string;
  exclude?: string;
  quiet?: boolean;
  targetPath: string;
}

interface PreviewPresetContent {
  html: string | null;
  name: string;
  plain: string | null;
  props: Record<string, unknown>;
}

// Note: This should match the same declaration in @jsx-email/app-preview
interface PreviewDataContent {
  html: string;
  plain: string;
  presets?: PreviewPresetContent[];
  source: string;
  sourceFile: string;
  sourcePath: string;
  templateName: string;
}

// Reduce arbitrary preview props to a JSON-safe shape for the Variables panel.
// JSX elements / functions become tags so they render as pills, not errors.
function serializePreviewProps(props: unknown): Record<string, unknown> {
  const seen = new WeakSet();
  try {
    return JSON.parse(
      JSON.stringify(props ?? {}, (_key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value && typeof value === 'object') {
          if ((value as { $$typeof?: symbol }).$$typeof) return '[ReactElement]';
          if (value instanceof Date) return value.toISOString();
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      })
    );
  } catch {
    return { __unserializable: true };
  }
}

// 102kb
export const gmailByteLimit = 102e3;
export const gmailBytesSafe = 102e3 - 20e3;

export const buildForPreview = async ({
  buildPath,
  exclude,
  quiet = false,
  targetPath
}: BuildForPreviewParams) => {
  const files = await buildTemplates({
    buildOptions: {
      exclude,
      minify: false,
      out: buildPath,
      plain: true,
      pretty: true,
      showStats: false,
      silent: quiet,
      usePreviewProps: true,
      writeToFile: false
    },
    targetPath
  });

  return files;
};

export const formatBytes = (bytes: number) => {
  const pretty = prettyBytes(bytes);

  if (bytes > gmailByteLimit) return chalk.red(pretty);
  else if (bytes > gmailBytesSafe - 20e3) return chalk.red(pretty);

  return chalk.green(pretty);
};

export const writePreviewDataFiles = async (files: BuildTempatesResult[]) => {
  const writes = files.map(async (file) => {
    const presets: PreviewPresetContent[] = (
      file.presets ?? [{ html: file.html, name: 'Default', plain: file.plainText, props: {} }]
    ).map((preset) => ({
      html: preset.html,
      name: preset.name,
      plain: preset.plain,
      props: serializePreviewProps(preset.props)
    }));
    const content = JSON.stringify(
      {
        html: file.html,
        plain: file.plainText,
        presets,
        source: await readFile(normalizePath(file.fileName), 'utf8'),
        sourceFile: file.sourceFile,
        sourcePath: file.fileName,
        templateName: file.templateName
      } as PreviewDataContent,
      null,
      2
    );
    const code = `export default ${content};`;
    await writeFile(`${file.writePathBase}.js`, code, 'utf8');
  });

  await Promise.all(writes);
};
