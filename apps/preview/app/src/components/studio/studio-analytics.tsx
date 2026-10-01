import { useEffect, useState } from 'react';
import type { StudioCatalogProject } from './studio-home';
import { StudioMetrics, type StudioAnalyticsData } from './studio-metrics';

export const StudioAnalytics = ({ projects }: { projects: StudioCatalogProject[] }) => {
  const available = projects.filter((project) => project.analytics);
  const initial = new URLSearchParams(window.location.search).get('project');
  const [projectId, setProjectId] = useState(
    available.find((project) => project.id === initial)?.id || available[0]?.id || ''
  );
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState('account');
  const [data, setData] = useState<StudioAnalyticsData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    setData(null);
    const query = new URLSearchParams({ project: projectId, days: String(days), scope });
    void fetch(`/__studio/analytics?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new TypeError(result.error || 'Unable to read AWS analytics.');
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [projectId, days, scope, retry]);
  return (
    <main className="studio-home studio-analytics">
      <div className="studio-intro">
        <div>
          <p className="studio-eyebrow">Transactional email</p>
          <h1>Usage & delivery.</h1>
          <p>Read live SES and CloudWatch activity using your local AWS session.</p>
        </div>
      </div>
      {!available.length ? (
        <p role="status">No AWS analytics sources are configured for this studio.</p>
      ) : (
        <>
          <div className="studio-filters">
            <label>
              Project connection
              <select
                aria-label="Project connection"
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setScope('account');
                }}
              >
                {available.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Period
              <select
                aria-label="Period"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              >
                {[7, 30, 90].map((day) => (
                  <option key={day} value={day}>
                    Last {day} days
                  </option>
                ))}
              </select>
            </label>
            <label>
              Published metric scope
              <select
                aria-label="Published metric scope"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              >
                {(
                  data?.scopes || [
                    {
                      id: scope,
                      label: scope === 'account' ? 'Entire AWS account' : 'Selected dimensions'
                    }
                  ]
                ).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => setRetry((value) => value + 1)} disabled={busy}>
              Refresh analytics
            </button>
          </div>
          {busy && <p role="status">Reading AWS email metrics…</p>}
          {error && (
            <div className="studio-data-panel" role="alert">
              <h2>AWS connection needs attention</h2>
              <p>{error}</p>
              <p>After signing in or updating access, use Refresh analytics.</p>
            </div>
          )}
          {data && <StudioMetrics data={data} />}
        </>
      )}
    </main>
  );
};
