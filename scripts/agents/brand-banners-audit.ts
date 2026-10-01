import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const auditBrandBanners = async () => {
  const base = process.env.STUDIO_URL || 'http://localhost:55420';
  const directory = '/tmp/email-studio-banners';
  const version = process.env.BANNER_VERSION || 'v2';
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [brand, name, file] of [
      ['matrix-studio', 'Matrix Studio', 'matrix-studio'],
      ['id4', 'id4.finance', 'id4'],
      ['equity', 'Ember', 'ember']
    ]) {
      const response = await fetch(`${base}/__studio/templates?project=boc&brand=${brand}`);
      assert.equal(response.status, 200);
      const templates = await response.json();
      assert.ok(templates.length > 0);
      assert.ok(
        templates.every((template: { html: string }) =>
          template.html.includes(`/__studio/assets/boc/email/${file}-banner-${version}.png`)
        )
      );
      await page.goto(`${base}/?project=boc&brand=${brand}#/account-access-magiclinksigninemail`);
      await page.waitForFunction((alt) => {
        const frame = document.querySelector('iframe');
        const image = frame?.contentDocument?.querySelector<HTMLImageElement>(`img[alt="${alt}"]`);
        return image?.complete && image.naturalWidth === 1200;
      }, name);
      await page.screenshot({ path: `${directory}/${file}-desktop.png`, fullPage: false });
      // Exercise the actual rendered email at a phone width, independently of canvas zoom.
      const template = templates.find((item: { path: string }) =>
        item.path.endsWith('/MagicLinkSignInEmail')
      );
      const phone = await browser.newPage({ viewport: { width: 360, height: 800 } });
      await phone.goto(base);
      await phone.setContent(template.html);
      await phone.waitForFunction((alt) => {
        const image = document.querySelector<HTMLImageElement>(`img[alt="${alt}"]`);
        return image?.complete && image.naturalWidth === 1200;
      }, name);
      const banner = phone.locator(`img[alt="${name}"]`);
      const bounds = await banner.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 360);
      assert.ok(Math.abs(bounds!.width / bounds!.height - 3.75) < 0.03);
      await phone.screenshot({ path: `${directory}/${file}-mobile.png`, fullPage: true });
      await phone.close();
    }
    assert.deepEqual(errors, []);
    console.log('All three branded banners load in the studio and fit mobile email widths.');
  } finally {
    await browser.close();
  }
};
void auditBrandBanners();
