/**
 * Legacy URLs keep working: every `html/Work/<name>.html` page of the old site lands on its
 * new page (alvin → the work index), and the résumé PDF stays at `files/Resume_General.pdf`.
 */
import { expect, test } from '@playwright/test';
import { gotoRel, LEGACY_PAGES, LEGACY_REDIRECTS } from './helpers/routes.ts';

for (const [name, target] of Object.entries(LEGACY_REDIRECTS)) {
  test(`html/Work/${name}.html redirects to ${target} @prod`, async ({ page, baseURL }) => {
    await gotoRel(page, `html/Work/${name}.html`);
    await expect(page).toHaveURL(new URL(target, baseURL).href);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('the build emits exactly the expected legacy stubs', () => {
  expect(LEGACY_PAGES).toEqual(Object.keys(LEGACY_REDIRECTS).sort());
});

test('résumé PDF is served at its legacy URL @prod', async ({ request }) => {
  const response = await request.get('files/Resume_General.pdf');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^application\/pdf/);
});
