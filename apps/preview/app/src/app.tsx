import { Studio } from './components/studio/studio';
import { useEffect } from 'react';

import { Canvas } from './components/canvas/canvas';
import { FileSystemPanel } from './components/file-system/file-system-panel';
import { Header } from './components/header';
import { LabControlsPanel } from './components/lab-controls/lab-controls-panel';
import { getHashRouteSlug } from './helpers/template-routing';
import { usePreviewStore } from './stores/preview-store';

export function PreviewWorkspace({ studio = false }: { studio?: boolean }) {
  const zoom = usePreviewStore((state) => state.zoom);
  const cards = usePreviewStore((state) => state.cards);
  const selectedId = usePreviewStore((state) => state.selectedId);
  const templates = usePreviewStore((state) => state.templates);
  const addOrFocusTemplateBySlug = usePreviewStore((state) => state.addOrFocusTemplateBySlug);
  const selected = cards.find((card) => card.id === selectedId);
  const selectedTemplate = templates.find((template) => template.id === selected?.templateId);

  useEffect(() => {
    function openHashRoute() {
      const slug = getHashRouteSlug();
      if (slug) addOrFocusTemplateBySlug(slug);
    }

    openHashRoute();
    window.addEventListener('hashchange', openHashRoute);

    return () => window.removeEventListener('hashchange', openHashRoute);
  }, [addOrFocusTemplateBySlug, templates]);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
      {studio ? (
        <div className="studio-preview-toolbar">
          <button
            className="app-button"
            aria-label="Zoom out"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('preview-canvas-zoom', { detail: -1 }))
            }
          >
            −
          </button>
          <span>{zoom}%</span>
          <button
            className="app-button"
            aria-label="Zoom in"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('preview-canvas-zoom', { detail: 1 }))
            }
          >
            +
          </button>
        </div>
      ) : (
        <Header />
      )}
      <FileSystemPanel />
      {selected && selectedTemplate && (
        <LabControlsPanel cardId={selected.id} template={selectedTemplate} />
      )}
      <Canvas />
    </div>
  );
}

export function App() {
  return import.meta.env.VITE_JSXEMAIL_STUDIO ? (
    <Studio>
      <PreviewWorkspace studio />
    </Studio>
  ) : (
    <PreviewWorkspace />
  );
}
