const { test, expect } = require('@playwright/test');

const scope = String(process.env.LRF_SCOPE || 'all').toLowerCase();
const intensity = String(process.env.LRF_INTENSITY || 'normal').toLowerCase();

const pagesParZone = {
  all: ['/', '/partenaires.html', '/univers.html', '/configurateurs.html', '/catalogues.html', '/contact.html'],
  navigation: ['/', '/partenaires.html', '/univers.html', '/catalogues.html', '/contact.html'],
  accueil: ['/'],
  selections: ['/univers.html'],
  elios: ['/univers.html?search=elios'],
  configurateurs: ['/configurateurs.html'],
  catalogues: ['/catalogues.html'],
  contact: ['/contact.html']
};

const pagesPubliques = pagesParZone[scope] || pagesParZone.all;
const veut = (...zones) => scope === 'all' || zones.includes(scope);

async function ouvrir(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  expect(response.status(), `Erreur HTTP sur ${url}`).toBeLessThan(400);
  await page.waitForLoadState('load').catch(() => {});
}

async function imagesCassees(page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  await page.waitForTimeout(intensity === 'quick' ? 150 : 350);
  return page.locator('img').evaluateAll(images => images
    .filter(img => img.src && img.complete && img.naturalWidth === 0)
    .map(img => img.currentSrc || img.src));
}

test.describe(`Client virtuel LE ROY FACTORY — ${scope} / ${intensity}`, () => {
  test('accueil visible sans erreur majeure', async ({ page }) => {
    test.skip(!veut('navigation', 'accueil'), 'Accueil hors de la zone sélectionnée');
    const erreurs = [];
    page.on('pageerror', err => erreurs.push(err.message));
    await ouvrir(page, '/');
    await expect(page).toHaveTitle(/LE ROY FACTORY/i);
    await expect(page.locator('header')).toBeVisible();
    expect(await imagesCassees(page)).toEqual([]);
    expect(erreurs).toEqual([]);
  });

  test('le client peut ouvrir Contact depuis la page accueil', async ({ page }) => {
    test.skip(!veut('navigation', 'accueil', 'contact'), 'Navigation Contact hors de la zone sélectionnée');
    await ouvrir(page, '/');

    const burger = page.locator('header .burger-btn').first();
    if (await burger.isVisible()) {
      await burger.click();
      await expect(burger).toHaveClass(/active/);
      await page.waitForTimeout(250);
    }

    const lien = page.locator('header a[href*="contact.html"]').first();
    await expect(lien).toBeVisible();

    const dansEcran = await lien.evaluate(element => {
      const r = element.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left < innerWidth && r.right > 0 && r.top < innerHeight && r.bottom > 0;
    });
    expect(dansEcran, 'Le lien Contact est présent mais hors de la zone visible').toBe(true);

    await lien.click();
    await page.waitForURL(/contact\.html/i);
    await expect(page).toHaveTitle(/contact/i);
  });

  test('les pages choisies et leurs images fonctionnent', async ({ page }) => {
    for (const url of pagesPubliques) {
      await test.step(url, async () => {
        await ouvrir(page, url);
        await expect(page.locator('body')).toBeVisible();
        const cassees = await imagesCassees(page);
        expect(cassees, `Images cassées sur ${url}: ${cassees.join(', ')}`).toEqual([]);
      });
    }
  });

  test('la zone Elios se charge dans les Sélections', async ({ page }) => {
    test.skip(!veut('elios'), 'Elios hors de la zone sélectionnée');
    await ouvrir(page, '/univers.html?search=elios');
    await expect(page).toHaveTitle(/Sélections|Produits/i);
    await expect(page.locator('#insp-categories')).toBeVisible();
    await expect(page.locator('#partner-grid')).toBeAttached();
    expect(await imagesCassees(page)).toEqual([]);
  });

  test('les liens internes de la zone ne renvoient pas de page 404', async ({ page, request }) => {
    test.skip(intensity === 'quick', 'Contrôle des liens désactivé en mode rapide');
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

    const limite = intensity === 'full' ? 180 : 80;
    const erreurs = [];
    for (const href of [...liens].slice(0, limite)) {
      const response = await request.get(href, { timeout: 20000, failOnStatusCode: false });
      if (response.status() >= 400) erreurs.push(`${response.status()} ${href}`);
    }
    expect(erreurs, `Liens cassés:\n${erreurs.join('\n')}`).toEqual([]);
  });
});
