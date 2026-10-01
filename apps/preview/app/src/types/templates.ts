// A single named sample-data preset, rendered by the CLI at build time.
export interface TemplatePresetContent {
  name: string;
  props: Record<string, unknown>;
  html: string;
  plain: string | null;
}

export interface PreviewImportContent {
  html: string;
  plain: string;
  presets?: TemplatePresetContent[];
  source: string;
  sourceFile: string;
  sourcePath?: string;
  templateName?: string;
}

export type TemplateTab = 'preview' | 'jsx' | 'html' | 'plain';

export interface TemplateData {
  templateClass?: { id: string; name: string };
  fileExtension: string;
  fileName: string;
  html: string;
  id: string;
  path: string;
  plain: string;
  presets: TemplatePresetContent[];
  source: string;
  sourceFile: string;
  sourcePath: string;
  templateName: string;
}

export interface FileTreeNode {
  children: FileTreeNode[];
  name: string;
  path: string;
  template?: TemplateData;
  type: 'folder' | 'file';
}

export interface PreviewPreset {
  height?: number;
  label: string;
  name: string;
  width: number | null;
  // When true, this "aspect ratio" renders every fixed-width size at once.
  all?: boolean;
}
