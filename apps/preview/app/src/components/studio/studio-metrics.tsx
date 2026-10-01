export interface StudioMetric {
  name: string;
  complete: boolean;
  total: number | null;
  points: { date: string; value: number | null }[];
}
export interface StudioAnalyticsData {
  fetchedAt: string;
  region: string;
  profile: string;
  start: string;
  end: string;
  days: number;
  scope: { id: string; label: string };
  scopes: { id: string; label: string }[];
  attribution: string;
  account: {
    productionAccess?: boolean;
    sendingEnabled?: boolean;
    quota?: { Max24HourSend?: number; MaxSendRate?: number; SentLast24Hours?: number };
  } | null;
  series: StudioMetric[];
  warnings: string[];
}
const metricNumber = (value?: number | null) => (value == null ? '—' : value.toLocaleString());

export const StudioMetrics = ({ data }: { data: StudioAnalyticsData }) => {
  const sends = data.series.find((item) => item.name === 'Send');
  const dates = Array.from({ length: data.days }, (_, index) => {
    const date = new Date(data.start);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const max = Math.max(1, ...(sends?.points.map((point) => point.value || 0) || []));
  return (
    <>
      <p className="studio-data-scope">{data.attribution}</p>
      {data.warnings.map((warning) => (
        <p key={warning} role="alert" className="studio-error">
          {warning}
        </p>
      ))}
      <section className="studio-metric-grid" aria-label="Email event totals">
        {data.series.map((metric) => (
          <article key={metric.name}>
            <h2>{metric.name}</h2>
            <strong>{metricNumber(metric.total)}</strong>
            <p>
              {metric.total == null
                ? 'No datapoints reported'
                : metric.complete
                  ? 'Events in selected period'
                  : 'Partial data'}
            </p>
          </article>
        ))}
      </section>
      <section className="studio-data-panel">
        <h2>Daily sends</h2>
        <p>
          {data.start.slice(0, 10)} – {data.end.slice(0, 10)} · UTC · Today is partial
        </p>
        {sends?.total == null ? (
          <p>No send datapoints reported for this scope and period.</p>
        ) : (
          <div
            className="studio-send-chart"
            role="img"
            aria-label="Daily send volume; exact values appear in the daily events table below."
          >
            {dates.map((date) => {
              const value = sends?.points.find((point) => point.date === date)?.value;
              return (
                <div key={date} title={`${date}: ${metricNumber(value)}`}>
                  <span
                    style={{ height: `${value == null ? 0 : Math.max(1, (value / max) * 100)}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <details>
          <summary>Daily events table</summary>
          <div
            className="studio-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Daily email events"
          >
            <table>
              <caption>SES events by UTC day. A dash means no datapoint was returned.</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  {data.series.map((metric) => (
                    <th scope="col" key={metric.name}>
                      {metric.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => (
                  <tr key={date}>
                    <th scope="row">{date}</th>
                    {data.series.map((metric) => (
                      <td key={metric.name}>
                        {metricNumber(metric.points.find((point) => point.date === date)?.value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="studio-data-panel">
        <h2>AWS account capacity</h2>
        <p>Account-wide quota, independent of the selected metric scope.</p>
        {data.account ? (
          <dl className="studio-quota">
            <div>
              <dt>SES access</dt>
              <dd>{data.account.productionAccess ? 'Production' : 'Sandbox'}</dd>
            </div>
            <div>
              <dt>Sending</dt>
              <dd>{data.account.sendingEnabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>Sent in last 24 hours</dt>
              <dd>{metricNumber(data.account.quota?.SentLast24Hours)}</dd>
            </div>
            <div>
              <dt>24-hour quota</dt>
              <dd>{metricNumber(data.account.quota?.Max24HourSend)}</dd>
            </div>
            <div>
              <dt>Maximum send rate</dt>
              <dd>{metricNumber(data.account.quota?.MaxSendRate)} / second</dd>
            </div>
          </dl>
        ) : (
          <p>Account capacity is unavailable for this AWS profile.</p>
        )}
      </section>
      <p className="studio-data-footnote">
        Updated {new Date(data.fetchedAt).toLocaleString()} · {data.region} · AWS profile:{' '}
        {data.profile}. Cached for up to 60 seconds. Delivery means acceptance by the recipient’s
        mail server; it does not confirm inbox placement.
      </p>
    </>
  );
};
