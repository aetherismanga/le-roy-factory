const { test, expect } = require('@playwright/test');

const pagesPubliques = [
  '/',
  '/partenaires.html',
  '/univers.html',
  '/configurateurs.html',
  '/catalogues.html',
  '/contact.html'
];

async function ouvrir(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  expect(response.status(), `Erreur HTTP sur ${url}`).toBeLessThan(400);
  await page.waitForLoadState('load').catch(() => {});
}

async function imagesCassees(page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  await page.waitForTimeout(300);
  return page.locator('img').evaluateAll(images => images
    .filter(img => img.src && img.complete && img.naturalWidth === 0)
    .map(img => img.currentSrc || img.src));
}

test.describe('Client virtuel LE ROY FACTORY', () => {
  test('accueil visible sans erreur majeure', async ({ page }) => {
    const erreurs = [];
    page.on('pageerror', err => erreurs.push(err.message));
    await ouvrir(page, '/');
    await expect(page).toHaveTitle(/LE ROY FACTORY/i);
    await expect(page.locator('header')).toBeVisible();
    expect(await imagesCassees(page)).toEqual([]);
    expect(erreurs).toEqual([]);
  });

  test('le client peut ouvrir Contact depuis la page accueil', async ({ page }) => {
    await ouvrir(page, '/');
    let lien = page.locator('header a[href*="contact.html"]:visible').first();

    if (await lien.count() === 0) {
      const burger = page.locator('header .burger-btn:visible').first();
      if (await burger.count()) {
        await burger.click();
        await page.waitForTimeout(200);
      }
      lien = page.locator('header a[href*="contact.html"]:visible').first();
    }

    if (await lien.count() === 0) {
      lien = page.locator('a[href*="contact.html"]:visible').first();
    }

    await expect(lien).toBeVisible();
    await lien.click();
    await page.waitForURL(/contact\.html/i);
    await expect(page).toHaveTitle(/contact/i);
  });

  test('les pages publiques essentielles et leurs images fonctionnent', async ({ page }) => {
    for (const url of pagesPubliques) {
      await test.step(url, async () => {
        await ouvrir(page, url);
        await expect(page.locator('body')).toBeVisible();
        const cassees = await imagesCassees(page);
        expect(cassees, `Images cassées sur ${url}: ${cassees.join(', ')}`).toEqual([]);
      });
    }
  });

  test('les liens internes visibles ne renvoient pas de page 404', async ({ page, request }) => {
    const origine = new URL(process.env.BASE_URL || 'https://leroyfactory.fr').origin;
    const liens = new Set();

    for (const url of pagesPubliques) {
      await ouvrir(page, url);
      const hrefs = await page.locator('a[href]').evaluateAll(items => items.map(a => a.href));
      for (const href of hrefs) {
        try {
          const cible = new URL(href);
          if (cible.origin !== origine) continue;
          if (!/\.(?:html?)?(?:$|[?#])|\/$/i.test(cible.pathname)) continue;
          cible.hash = '';
          liens.add(cible.href);
        } catch {}
      }
    }

    const erreurs = [];
    for (const href of [...liens].slice(0, 80)) {
      const response = await request.get(href, { timeout: 20000, failOnStatusCode: false });
      if (response.status() >= 400) erreurs.push(`${response.status()} ${href}`);
    }
    expect(erreurs, `Liens cassés:\n${erreurs.join('\n')}`).toEqual([]);
  });
});
