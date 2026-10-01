import { useState } from 'react';

export interface StudioBrand {
  id: string;
  name: string;
  description: string;
  color: string;
  count: number;
}
export interface StudioCatalogProject {
  id: string;
  name: string;
  description: string;
  brands: StudioBrand[];
  error?: string;
}

export const StudioHome = ({ projects }: { projects: StudioCatalogProject[] }) => {
  const [query, setQuery] = useState('');
  const search = query.toLowerCase().trim();
  const visible = projects
    .map((project) => ({
      ...project,
      brands: project.brands.filter((brand) =>
        `${project.name} ${brand.name} ${brand.description}`.toLowerCase().includes(search)
      )
    }))
    .filter((project) => project.brands.length || project.error);
  return (
    <main className="studio-home">
      <div className="studio-intro">
        <div>
          <p className="studio-eyebrow">Email studio</p>
          <h1>Your brands. Every message.</h1>
          <p>Choose a brand to explore its templates, sample data, and previews.</p>
        </div>
        <label className="studio-search">
          Find a brand
          <input
            type="search"
            placeholder="Search projects or brands…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {visible.map((project) => (
        <section
          className="studio-project"
          key={project.id}
          aria-labelledby={`project-${project.id}`}
        >
          <div className="studio-project-heading">
            <div>
              <h2 id={`project-${project.id}`}>{project.name}</h2>
              <p>{project.description}</p>
            </div>
            <span>
              {project.brands.length} {project.brands.length === 1 ? 'brand' : 'brands'}
            </span>
          </div>
          {project.error ? (
            <p role="alert" className="studio-error">
              {project.error}
            </p>
          ) : (
            <div className="studio-grid">
              {project.brands.map((brand) => (
                <a
                  className="studio-brand-card"
                  key={brand.id}
                  href={`?project=${encodeURIComponent(project.id)}&brand=${encodeURIComponent(brand.id)}`}
                >
                  <div
                    className="studio-brand-art"
                    style={{ background: brand.color }}
                    aria-hidden="true"
                  >
                    <div className="studio-envelope">
                      <div />
                      <div />
                      <div />
                    </div>
                    <span>{brand.name}</span>
                  </div>
                  <div className="studio-brand-copy">
                    <h3>
                      {brand.name}
                      <span aria-hidden="true">↗</span>
                    </h3>
                    <p>{brand.description}</p>
                    <span className="studio-template-count">
                      {brand.count} {brand.count === 1 ? 'template' : 'templates'}{' '}
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      ))}
      {!visible.length && (
        <p role="status">
          {projects.length ? 'No brands match your search.' : 'No projects registered yet.'}
        </p>
      )}
    </main>
  );
};
