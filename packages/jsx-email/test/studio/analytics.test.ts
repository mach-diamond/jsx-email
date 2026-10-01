import { describe, expect, it, vi } from 'vitest';
import { readEmailAnalytics } from '../../src/studio/analytics.js';

const now = new Date('2026-10-01T16:00:00Z');
const source = { profile: 'test', region: 'us-east-1' };
const reader = () =>
  vi.fn(async (_service: string, operation: string, _args?: string[]) => {
    if (operation === 'get-account')
      return {
        ProductionAccessEnabled: true,
        SendingEnabled: true,
        SendQuota: { SentLast24Hours: 2 }
      };
    if (operation === 'list-metrics')
      return { Metrics: [{ MetricName: 'Send', Dimensions: [{ Name: 'brand', Value: 'id4' }] }] };
    return {
      MetricDataResults: [
        { Id: 'm0', StatusCode: 'Complete', Timestamps: ['2026-10-01T00:00:00Z'], Values: [12] },
        ...[1, 2, 3, 4, 5].map((id) => ({
          Id: `m${id}`,
          StatusCode: 'Complete',
          Timestamps: [],
          Values: []
        }))
      ]
    };
  });

describe('AWS email analytics', () => {
  it('preserves missing metrics, scopes queries, and aligns the UTC period', async () => {
    const read = reader();
    const result = await readEmailAnalytics(source, 7, 'account', read, now);
    expect(result.start).toBe('2026-09-25T00:00:00.000Z');
    expect(result.series[0].total).toBe(12);
    expect(result.series[1].total).toBeNull();
    expect(result.attribution).toContain('Account-wide');
    expect(result.scopes).toHaveLength(2);
    await readEmailAnalytics(source, 7, result.scopes[1].id, read, now);
    const args = read.mock.calls.at(-1)![2]!;
    expect(JSON.parse(args[1])[0].MetricStat.Metric.Dimensions).toEqual([
      { Name: 'brand', Value: 'id4' }
    ]);
  });
  it('rejects arbitrary scopes and periods before reading their metrics', async () => {
    const read = reader();
    await expect(readEmailAnalytics(source, 8, 'account', read, now)).rejects.toThrow(
      '7, 30, or 90'
    );
    expect(read).not.toHaveBeenCalled();
    await expect(readEmailAnalytics(source, 7, 'other-account', read, now)).rejects.toThrow(
      'no longer available'
    );
    expect(read.mock.calls.some((call) => call[1] === 'get-metric-data')).toBe(false);
  });
  it('keeps accessible metrics when SES account permission is missing', async () => {
    const read = reader();
    read.mockRejectedValueOnce(new TypeError('Account read denied'));
    const result = await readEmailAnalytics(source, 7, 'account', read, now);
    expect(result.account).toBeNull();
    expect(result.warnings).toContain('TypeError: Account read denied');
    expect(result.series[0].total).toBe(12);
  });
  it('reports expired sessions instead of inventing usage numbers', async () => {
    await expect(
      readEmailAnalytics(
        source,
        7,
        'account',
        async () => {
          throw new TypeError('Session expired');
        },
        now
      )
    ).rejects.toThrow('Session expired');
  });
});
