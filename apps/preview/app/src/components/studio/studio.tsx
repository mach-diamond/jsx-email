import { type ReactNode, useEffect, useRef, useState } from 'react';

import type { TemplateData } from '../../types/templates';
import { usePreviewStore } from '../../stores/preview-store';
import { StudioHome, type StudioCatalogProject } from './studio-home';

import { StudioCompare } from './studio-compare';
import { StudioAnalytics } from './studio-analytics';

export const Studio = ({ children }: { children: ReactNode }) => {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') || 'brands';
  const projectId = params.get('project');
  const brandId = params.get('brand');
  const [projects, setProjects] = useState<StudioCatalogProject[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    const { current } = generation;
    const controller = new AbortController();
    const read = async <T,>(url: string): Promise<T> => {
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new TypeError(data.error || 'Unable to load this brand.');
      return data;
    };
    setBusy(true);
    const load = async () => {
      try {
        const catalog = await read<StudioCatalogProject[]>('/__studio/catalog');
        if (current !== generation.current) return;
        setProjects(catalog);
        if (view === 'brands' && (projectId || brandId)) {
          const project = catalog.find((item) => item.id === projectId);
          if (!project?.brands.some((brand) => brand.id === brandId))
            throw new TypeError(project?.error || 'This brand is not available in this studio.');
          const templates = await read<TemplateData[]>(
            `/__studio/templates?project=${encodeURIComponent(projectId!)}&brand=${encodeURIComponent(brandId!)}`
          );
          if (current !== generation.current) return;
          usePreviewStore.getState().setTemplates(templates);
          usePreviewStore.getState().startSpamAnalysis();
        }
        setError('');
        setReady(true);
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [projectId, brandId, revision, view]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setRevision((value) => value + 1), 200);
    };
    import.meta.hot?.on('email-studio:change', changed);
    return () => {
      clearTimeout(timer);
      import.meta.hot?.off('email-studio:change', changed);
    };
  }, []);
  const project = projects.find((item) => item.id === projectId);
  const brand = project?.brands.find((item) => item.id === brandId);
  return (
    <div className="studio-shell">
      <header className="studio-header">
        <a href="/" className="studio-wordmark">
          Email<span>Studio</span>
        </a>
        <nav aria-label="Breadcrumb">
          <a href="/" aria-current={view === 'brands' ? 'page' : undefined}>
            Brands
          </a>
          <a href="?view=compare" aria-current={view === 'compare' ? 'page' : undefined}>
            Compare classes
          </a>
          <a href="?view=analytics" aria-current={view === 'analytics' ? 'page' : undefined}>
            Analytics
          </a>
          {brand && (
            <>
              <span aria-hidden="true">/</span>
              <span>{project?.name}</span>
              <span aria-hidden="true">/</span>
              <strong>{brand.name}</strong>
            </>
          )}
        </nav>
        <span className="studio-header-note">
          {busy ? 'Updating…' : brand ? `${brand.count} templates` : `${projects.length} projects`}
        </span>
      </header>
      {error && (
        <div className="studio-notice" role="alert">
          <span>
            {error}
            {ready && ' Your last successful preview is still shown.'}
          </span>
          <button onClick={() => setRevision((value) => value + 1)}>Retry</button>
        </div>
      )}
      {!ready && !error && (
        <main className="studio-home" role="status">
          Loading your email library…
        </main>
      )}
      {ready &&
        (view === 'compare' ? (
          <StudioCompare projects={projects} revision={revision} />
        ) : view === 'analytics' ? (
          <StudioAnalytics projects={projects} />
        ) : brand ? (
          <div className="studio-workspace">{children}</div>
        ) : (
          <StudioHome projects={projects} />
        ))}
    </div>
  );
};
