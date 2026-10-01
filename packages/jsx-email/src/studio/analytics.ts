import { awsReader, type AwsRead, type AwsSource } from './aws.js';

export const emailMetrics = [
  'Send',
  'Delivery',
  'Bounce',
  'Complaint',
  'Reject',
  'Rendering Failure'
] as const;
type Dimension = { Name: string; Value: string };
type Metric = { MetricName: string; Dimensions?: Dimension[] };
type MetricResult = { Id: string; Values?: number[]; Timestamps?: string[]; StatusCode?: string };
const scopeId = (dimensions: Dimension[]) =>
  dimensions.length
    ? JSON.stringify([...dimensions].sort((a, b) => a.Name.localeCompare(b.Name)))
    : 'account';

export const readEmailAnalytics = async (
  source: AwsSource,
  days: number,
  selected = 'account',
  read: AwsRead = awsReader(source),
  now = new Date()
) => {
  if (![7, 30, 90].includes(days)) throw new TypeError('Choose 7, 30, or 90 days.');
  const end = now;
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const results = await Promise.allSettled([
    read('sesv2', 'get-account'),
    read('cloudwatch', 'list-metrics', ['--namespace', 'AWS/SES'])
  ]);
  const warnings: string[] = [];
  const accountResult = results[0];
  const metricList = results[1];
  const account = accountResult.status === 'fulfilled' ? accountResult.value : null;
  if (accountResult.status === 'rejected') warnings.push(String(accountResult.reason));
  if (metricList.status === 'rejected') throw metricList.reason;
  const metrics: Metric[] = metricList.value.Metrics || [];
  const groups = new Map<string, { id: string; label: string; dimensions: Dimension[] }>();
  groups.set('account', { id: 'account', label: 'Entire AWS account', dimensions: [] });
  for (const metric of metrics.filter(
    (item) =>
      emailMetrics.includes(item.MetricName as (typeof emailMetrics)[number]) &&
      item.Dimensions?.length
  )) {
    const dimensions = metric.Dimensions || [];
    const id = scopeId(dimensions);
    groups.set(id, {
      id,
      label: dimensions.map((d) => `${d.Name}: ${d.Value}`).join(' · '),
      dimensions
    });
  }
  const scope = groups.get(selected);
  if (!scope)
    throw new TypeError('This metric scope is no longer available. Select an available scope.');
  const queries = emailMetrics.map((name, index) => ({
    Id: `m${index}`,
    MetricStat: {
      Metric: { Namespace: 'AWS/SES', MetricName: name, Dimensions: scope.dimensions },
      Period: 86400,
      Stat: 'Sum'
    },
    ReturnData: true
  }));
  const data = await read('cloudwatch', 'get-metric-data', [
    '--metric-data-queries',
    JSON.stringify(queries),
    '--start-time',
    start.toISOString(),
    '--end-time',
    end.toISOString(),
    '--scan-by',
    'TimestampAscending'
  ]);
  const series = emailMetrics.map((name, index) => {
    const result: MetricResult | undefined = data.MetricDataResults?.find(
      (item: MetricResult) => item.Id === `m${index}`
    );
    const points = (result?.Timestamps || []).map((timestamp, i) => ({
      date: timestamp.slice(0, 10),
      value: result?.Values?.[i] ?? null
    }));
    const complete = result?.StatusCode === 'Complete';
    if (!complete) warnings.push(`${name}: AWS returned incomplete data.`);
    return {
      name,
      complete,
      total: points.length ? points.reduce((sum, point) => sum + (point.value ?? 0), 0) : null,
      points
    };
  });
  if (data.NextToken)
    warnings.push('AWS returned additional metric pages; this result is incomplete.');
  return {
    fetchedAt: now.toISOString(),
    region: source.region,
    profile: source.profile || 'default credential chain',
    start: start.toISOString(),
    end: end.toISOString(),
    days,
    scope: { id: scope.id, label: scope.label },
    scopes: [...groups.values()].map(({ id, label }) => ({ id, label })),
    attribution:
      scope.id === 'account'
        ? 'Account-wide SES activity. These totals can include other projects and marketing emails. Brand and template attribution requires published SES dimensions.'
        : 'SES event counts for the selected published dimensions. Events may arrive after the original send.',
    account: account
      ? {
          productionAccess: account.ProductionAccessEnabled,
          sendingEnabled: account.SendingEnabled,
          quota: account.SendQuota
        }
      : null,
    series,
    warnings
  };
};

export const createAnalyticsReader = () => {
  const cache = new Map<
    string,
    { expires: number; result: ReturnType<typeof readEmailAnalytics> }
  >();
  return (source: AwsSource, days: number, scope: string) => {
    const key = JSON.stringify([source, days, scope]);
    const previous = cache.get(key);
    if (previous && previous.expires > Date.now()) return previous.result;
    const result = readEmailAnalytics(source, days, scope).catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, { expires: Date.now() + 60000, result });
    return result;
  };
};
