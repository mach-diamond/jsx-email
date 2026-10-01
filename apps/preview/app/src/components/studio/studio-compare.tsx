import { useEffect, useState } from 'react';
import type { StudioCatalogProject } from './studio-home';
import { StudioComparisonCard } from './studio-comparison-card';
import type { TemplateData } from '../../types/templates';

interface ComparisonGroup {
  project: string;
  projectName: string;
  brand: string;
  brandName: string;
  templates: TemplateData[];
  error?: string;
}

export const StudioCompare = ({
  projects,
  revision
}: {
  projects: StudioCatalogProject[];
  revision: number;
}) => {
  const initial = new URLSearchParams(window.location.search);
  const [projectId, setProjectId] = useState(initial.get('project') || 'all');
  const [classId, setClassId] = useState(initial.get('class') || 'account-access');
  const [templateName, setTemplateName] = useState('all');
  const [groups, setGroups] = useState<ComparisonGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [width, setWidth] = useState(600);
  const selectedProjects = projects.filter(
    (project) => projectId === 'all' || project.id === projectId
  );
  const classes = [
    ...new Map(
      selectedProjects.flatMap((project) =>
        project.brands.flatMap((brand) =>
          (brand.classes || []).map((item) => [item.id, item] as const)
        )
      )
    ).values()
  ].sort((a, b) => a.name.localeCompare(b.name));
  const activeClass = classes.some((item) => item.id === classId) ? classId : classes[0]?.id;
  useEffect(() => {
    const controller = new AbortController();
    setGroups([]);
    setBusy(true);
    const targets = projects
      .filter((project) => projectId === 'all' || project.id === projectId)
      .flatMap((project) =>
        project.brands
          .filter((brand) => brand.classes?.some((item) => item.id === activeClass))
          .map((brand) => ({ project, brand }))
      );
    const query = new URLSearchParams({
      view: 'compare',
      project: projectId,
      ...(activeClass ? { class: activeClass } : {})
    });
    window.history.replaceState(null, '', `?${query}`);
    void Promise.all(
      targets.map(async ({ project, brand }): Promise<ComparisonGroup> => {
        const identity = {
          project: project.id,
          projectName: project.name,
          brand: brand.id,
          brandName: brand.name
        };
        try {
          const params = new URLSearchParams({
            project: project.id,
            brand: brand.id,
            class: activeClass!
          });
          const response = await fetch(`/__studio/templates?${params}`, {
            signal: controller.signal
          });
          const data = await response.json();
          if (!response.ok) throw new TypeError(data.error || 'Preview unavailable');
          return { ...identity, templates: data };
        } catch (error) {
          return {
            ...identity,
            templates: [],
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    ).then((data) => {
      if (!controller.signal.aborted) {
        setGroups(data);
        setBusy(false);
      }
    });
    return () => controller.abort();
  }, [projects, projectId, activeClass, revision, retry]);
  const names = [
    ...new Set(groups.flatMap((group) => group.templates.map((template) => template.templateName)))
  ].sort();
  const shownName = names.includes(templateName) ? templateName : 'all';
  return (
    <main className="studio-home studio-compare">
      <div className="studio-intro">
        <div>
          <p className="studio-eyebrow">Template classes</p>
          <h1>Compare across brands.</h1>
          <p>Inspect the same kind of message at a consistent email width.</p>
        </div>
      </div>
      <div className="studio-filters">
        <label>
          Project
          <select
            aria-label="Project"
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setTemplateName('all');
            }}
          >
            <option value="all">All available projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Template class
          <select
            aria-label="Template class"
            value={activeClass || ''}
            onChange={(event) => {
              setClassId(event.target.value);
              setTemplateName('all');
            }}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Template
          <select
            aria-label="Template"
            value={shownName}
            onChange={(event) => setTemplateName(event.target.value)}
          >
            <option value="all">All templates in class</option>
            {names.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Email width
          <select
            aria-label="Email width"
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          >
            <option value={600}>Desktop · 600px</option>
            <option value={360}>Mobile · 360px</option>
          </select>
        </label>
        <button onClick={() => setRetry((value) => value + 1)}>Refresh previews</button>
      </div>
      {busy && <p role="status">Rendering brand previews…</p>}
      {!busy && !groups.length && (
        <p role="status">No templates in this class for the selected project.</p>
      )}
      <div
        className="studio-comparison-grid"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${width + 32}px), 1fr))` }}
      >
        {groups.map((group) =>
          group.error ? (
            <article className="studio-comparison-card" key={`${group.project}/${group.brand}`}>
              <h2>{group.brandName}</h2>
              <p role="alert">{group.error}</p>
            </article>
          ) : (
            group.templates
              .filter((template) => shownName === 'all' || template.templateName === shownName)
              .map((template) => (
                <StudioComparisonCard
                  key={template.id}
                  {...group}
                  template={template}
                  width={width}
                />
              ))
          )
        )}
      </div>
    </main>
  );
};
