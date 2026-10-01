// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import {
  StudioMetrics,
  type StudioAnalyticsData
} from '../../../src/components/studio/studio-metrics';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('shows measured counts separately from absent data and provides a semantic daily table', () => {
  const data: StudioAnalyticsData = {
    fetchedAt: '2026-10-01T12:00:00Z',
    region: 'us-east-1',
    profile: 'fixture',
    start: '2026-09-30T00:00:00Z',
    end: '2026-10-01T12:00:00Z',
    days: 2,
    scope: { id: 'account', label: 'Entire AWS account' },
    scopes: [],
    attribution: 'Account-wide SES activity.',
    account: null,
    warnings: [],
    series: [
      { name: 'Send', complete: true, total: 1200, points: [{ date: '2026-10-01', value: 1200 }] },
      { name: 'Bounce', complete: true, total: null, points: [] }
    ]
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<StudioMetrics data={data} />));
  expect(container.textContent).toContain('1,200');
  expect(container.textContent).toContain('No datapoints reported');
  expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  expect(container.querySelector('tbody tr')?.textContent).toBe('2026-09-30——');
  expect(container.querySelector('summary')?.textContent).toBe('Daily events table');
  expect(container.textContent).toContain('Account-wide SES activity.');
  act(() => root.unmount());
});
