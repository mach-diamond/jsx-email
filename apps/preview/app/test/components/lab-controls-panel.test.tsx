// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { LabControlsPanel } from '../../src/components/lab-controls/lab-controls-panel';
import { usePreviewStore } from '../../src/stores/preview-store';
import type { TemplateData } from '../../src/types/templates';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const template = {
  fileExtension: '.tsx',
  fileName: 'welcome.tsx',
  html: '<p>hi</p>',
  id: 'welcome',
  path: 'welcome.tsx',
  plain: 'hi',
  presets: [],
  source: '',
  sourceFile: 'welcome.tsx',
  sourcePath: 'welcome.tsx',
  templateName: 'welcome'
} satisfies TemplateData;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  container?.remove();
  container = undefined;
  usePreviewStore.setState({ labs: {}, panelCollapsed: true });
});

describe('LabControlsPanel', () => {
  it('keeps the same recipient input node while a lab value changes', () => {
    usePreviewStore.getState().ensureLab('card-1');
    usePreviewStore.getState().setPanelCollapsed(false);

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(<LabControlsPanel cardId="card-1" template={template} />);
    });

    const input = container.querySelector<HTMLInputElement>('#preview-send-to');
    expect(input).not.toBeNull();

    act(() => usePreviewStore.getState().updateLab('card-1', { sendEmail: 'a' }));
    act(() => usePreviewStore.getState().updateLab('card-1', { sendEmail: 'ab' }));

    const after = container.querySelector<HTMLInputElement>('#preview-send-to');
    expect(after).toBe(input);
    expect(after?.value).toBe('ab');
  });
});
