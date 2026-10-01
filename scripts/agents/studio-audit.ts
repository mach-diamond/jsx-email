import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium } from 'playwright';

const main = async () => {
  const base = process.env.STUDIO_URL || 'http://localhost:55430';
  const scope = process.env.STUDIO_SCOPE || 'all';
  const output = '/tmp/email-studio-audit';
  await mkdir(output, { recursive: true });
  const response = await fetch(`${base}/__studio/catalog`);
  assert.equal(response.status, 200);
  const catalog = await response.json();
  assert.deepEqual(
    catalog.map((p: { id: string }) => p.id).sort(),
    scope === 'all' ? ['boc', 'jewelry'] : [scope]
  );
  assert.ok(
    catalog.every((p: { error?: string }) => !p.error),
    JSON.stringify(catalog)
  );
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('heading', { name: 'Your brands. Every message.' }).waitFor();
    await page.screenshot({ path: `${output}/${scope}-home.png`, fullPage: true });
    if (scope === 'all' || scope === 'boc') {
      await page.getByRole('searchbox').fill('Ember');
      assert.equal(await page.locator('.studio-brand-card').count(), 1);
      await page.getByRole('searchbox').fill('');
      await page.getByRole('link', { name: /id4.finance.*7 templates/ }).click();
      await page.getByRole('button', { name: 'MagicLinkSignInEmail', exact: true }).click();
      await page.waitForFunction(() => window.location.hash.includes('magiclinksigninemail'));
      const frames = page.locator('iframe');
      await frames.first().waitFor();
      await page.screenshot({ path: `${output}/${scope}-id4.png`, fullPage: true });
      assert.equal(
        await page.getByRole('button', { name: 'WelcomeEmail', exact: true }).count(),
        0
      );
      await page.reload();
      await page.locator('iframe').first().waitFor();
      await page.getByRole('link', { name: 'EmailStudio', exact: true }).click();
      await page.getByRole('heading', { name: 'Your brands. Every message.' }).waitFor();
      const [ember, id4] = await Promise.all(
        ['equity', 'id4'].map(async (brand) => {
          const reply = await fetch(`${base}/__studio/templates?project=boc&brand=${brand}`);
          assert.equal(reply.status, 200);
          return reply.json();
        })
      );
      const magic = (templates: { path: string; html: string }[]) =>
        templates.find((t) => t.path === 'MagicLinkSignInEmail')!.html;
      assert.match(magic(ember), /Sign in to Ember/);
      assert.doesNotMatch(magic(ember), /Sign in to id4/);
      assert.match(magic(id4), /Sign in to id4/);
    }
    if (scope !== 'all') {
      const other = scope === 'boc' ? 'jewelry' : 'boc';
      const denied = await fetch(`${base}/__studio/templates?project=${other}&brand=boc`);
      assert.equal(denied.status, 404);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${output}/${scope}-mobile.png`, fullPage: true });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true
    );
    assert.deepEqual(errors, []);
    console.log(
      `Studio ${scope}: catalog, scope, navigation, brand rendering, deep links, and mobile checks passed.`
    );
  } finally {
    await browser.close();
  }
};
void main();
