// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { StudioHome } from '../../../src/components/studio/studio-home';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('studio library', () => {
  it('keeps unavailable projects visible alongside scoped brand links', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() =>
      root.render(
        <StudioHome
          projects={[
            {
              id: 'shop',
              name: 'Shop',
              description: 'Orders',
              brands: [
                {
                  id: 'gold',
                  name: 'Gold',
                  description: 'Jewelry',
                  color: '#222',
                  count: 2,
                  screenshot: '/__studio/assets/shop/frontend.png'
                }
              ]
            },
            {
              id: 'missing',
              name: 'Unavailable project',
              description: '',
              brands: [],
              error: 'Checkout missing'
            }
          ]}
        />
      )
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('?project=shop&brand=gold');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Checkout missing');
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/__studio/assets/shop/frontend.png'
    );
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    expect(container.textContent).toContain('2 templates');
    expect(container.querySelector('input')?.getAttribute('type')).toBe('search');
    act(() => root.unmount());
  });
});
