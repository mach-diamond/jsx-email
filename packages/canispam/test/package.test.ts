import { describe, expect, it } from 'vitest';

import { plainEml } from './helpers.js';

describe('built package', () => {
  it('ships the classifier data needed to scan without source files', async () => {
    const { scan } = await import('../dist/index.js');
    const result = await scan(plainEml('Your receipt is ready. View your invoice.'));

    expect(result.classifier.isSpam).toBe(false);
    expect(result.classifier.tokenCount).toBeGreaterThan(0);
  });
});
