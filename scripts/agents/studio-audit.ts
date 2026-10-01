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
      await page.getByRole('button', { name: 'Account Access', exact: true }).click();
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
        templates.find((t) => t.path.endsWith('/MagicLinkSignInEmail'))!.html;
      assert.match(magic(ember), /Sign in to Ember/);
      assert.doesNotMatch(magic(ember), /Sign in to id4/);
      assert.match(magic(id4), /Sign in to id4/);
    }
    if (scope !== 'all') {
      const other = scope === 'boc' ? 'jewelry' : 'boc';
      const denied = await fetch(`${base}/__studio/templates?project=${other}&brand=boc`);
      assert.equal(denied.status, 404);
    }
    assert.equal(await page.getByText('The Tape', { exact: true }).count(), 0);
    for (const img of await page.locator('.studio-brand-art img').all())
      await img.scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll<HTMLImageElement>('.studio-brand-art img')].every(
        (img) => img.complete && img.naturalWidth > 0
      )
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/${scope}-home.png`, fullPage: true });
    await page.getByRole('link', { name: 'Compare classes', exact: true }).click();
    await page.getByRole('heading', { name: 'Compare across brands.' }).waitFor();
    if (scope !== 'jewelry') {
      await page.getByLabel('Template', { exact: true }).selectOption('MagicLinkSignInEmail');
      await page.waitForFunction(
        () => document.querySelectorAll('.studio-comparison-card iframe').length === 8
      );
      assert.equal(
        await page.getByRole('heading', { name: 'Matrix Media', exact: true }).count(),
        1
      );
      await page.screenshot({ path: `${output}/${scope}-compare.png`, fullPage: false });
      await page.getByRole('link', { name: 'Open template ↗' }).first().click();
      await page.waitForFunction(() =>
        location.hash.includes('account-access-magiclinksigninemail')
      );
      await page.locator('iframe').first().waitFor();
    }
    await page.getByRole('link', { name: 'Analytics', exact: true }).click();
    await page.getByRole('heading', { name: 'Usage & delivery.' }).waitFor();
    await page.waitForFunction(
      () => /AWS connection needs attention|Daily sends/.test(document.body.innerText),
      undefined,
      { timeout: 60000 }
    );
    await page.screenshot({ path: `${output}/${scope}-analytics.png`, fullPage: true });
    await page.getByRole('link', { name: 'Brands', exact: true }).click();
    await page.getByRole('heading', { name: 'Your brands. Every message.' }).waitFor();
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
