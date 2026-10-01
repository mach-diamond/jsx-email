import { render } from 'jsx-email';
import { brand } from './brand';
export default {
  id: 'fixture', name: 'Fixture project', templateDir: 'templates',
  brands: [
    { id: 'alpha', name: 'Alpha' },
    { id: 'beta', name: 'Beta', templates: ['welcome.tsx'] },
  ],
  templateClasses: [{ id: 'welcome', name: 'Welcome', templates: ['welcome.tsx'] }],
  render,
  withBrand: (id: string, run: () => Promise<string>) => brand.run(id, run),
};
