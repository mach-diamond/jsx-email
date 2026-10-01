import type { TemplateData } from '../../types/templates';
import { getTemplateSlug } from '../../helpers/template-routing';

export const StudioComparisonCard = ({
  template,
  project,
  projectName,
  brand,
  brandName,
  width
}: {
  template: TemplateData;
  project: string;
  projectName: string;
  brand: string;
  brandName: string;
  width: number;
}) => (
  <article className="studio-comparison-card">
    <header>
      <div>
        <h2>{brandName}</h2>
        <p>
          {template.templateName} · {projectName}
        </p>
      </div>
      <a href={`?project=${project}&brand=${brand}#/${getTemplateSlug(template.fileName)}`}>
        Open template ↗
      </a>
    </header>
    <div
      className="studio-comparison-viewport"
      tabIndex={0}
      role="region"
      aria-label={`${brandName} email preview`}
    >
      <iframe
        title={`${brandName} — ${template.templateName}`}
        srcDoc={template.html}
        sandbox=""
        loading="lazy"
        width={width}
        height={760}
      />
    </div>
  </article>
);
