import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const normalize = (text) => text.replace(/[\s\u00a0\u202f]+/g, ' ').trim();
const variants = [
  { weight: '100', sku: '01306', current: '326,40 ₽', old: '349,20 ₽', discount: '−7%', saving: '22,80 ₽' },
  { weight: '500', sku: '01307', current: '1 432 ₽', old: '1 646 ₽', discount: '−13%', saving: '214 ₽' },
  { weight: '1000', sku: '01308', current: '2 064 ₽', old: '2 592 ₽', discount: '−20%', saving: '528 ₽' },
  { weight: '5000', sku: '01309', current: '6 320 ₽', old: '8 710 ₽', discount: '−27%', saving: '2 390 ₽' },
];

const selectWeight = (page, weight) => page.locator(`label:has(input[value="${weight}"])`).click();

const expectVariant = async (page, variant) => {
  await expect(page.locator('#product-sku')).toHaveText(variant.sku);
  expect(normalize(await page.locator('#current-price').innerText())).toBe(variant.current);
  expect(normalize(await page.locator('#old-price').innerText())).toBe(variant.old);
  await expect(page.locator('#discount-value')).toHaveText(variant.discount);
  expect(normalize(await page.locator('#saving-amount').innerText())).toBe(variant.saving);
  await expect(page.getByRole('radio', { name: `${variant.weight} г`, exact: true })).toBeChecked();
  await expect(page.locator('input[name="weight"]:checked')).toHaveCount(1);
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('radio', { name: '100 г', exact: true })).toBeEnabled();
});

test('initial variant is 100 g; every packaging updates all dependent values', async ({ page }) => {
  await expectVariant(page, variants[0]);
  for (const variant of [...variants.slice(1), variants[0]]) {
    await selectWeight(page, variant.weight);
    await expectVariant(page, variant);
  }
});

test('native radios work with arrow keys and expose the selected state', async ({ page }) => {
  const first = page.getByRole('radio', { name: '100 г', exact: true });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expectVariant(page, variants[1]);
  await expect(page.getByRole('radio', { name: '500 г', exact: true })).toBeFocused();
  await expect(page.locator('#product-status')).toContainText('Артикул 01307');
  await page.keyboard.press('ArrowLeft');
  await expectVariant(page, variants[0]);
});

test('cart only shows a demo notification, without making a request', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  await selectWeight(page, '1000');
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.getByRole('button', { name: 'В корзину', exact: true }).click();
  await expect(page.locator('#cart-toast')).toBeVisible();
  await expect(page.locator('#toast-title')).toHaveText('Ананасовый улун · 1000 г');
  expect(normalize(await page.locator('#toast-text').innerText())).toContain('2 064 ₽');
  await expect(page.locator('#toast-text')).toContainText('реальная корзина не подключена');
  await expect(page.getByRole('button', { name: 'Добавлено', exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Закрыть уведомление' }).click();
  await expect(page.locator('#cart-toast')).toBeHidden();
  await expect(page.getByRole('button', { name: 'В корзину', exact: true })).toBeVisible({ timeout: 4000 });
});

test('changing the variant clears stale cart feedback', async ({ page }) => {
  await page.getByRole('button', { name: 'В корзину', exact: true }).click();
  await selectWeight(page, '5000');
  await expect(page.locator('#cart-toast')).toBeHidden();
  await expect(page.getByRole('button', { name: 'В корзину', exact: true })).toBeVisible();
  await expectVariant(page, variants[3]);
});

test('photo dialog opens, traps focus, closes on Escape and restores focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Увеличить фотографию ананасового улуна' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Закрыть фотографию' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement.closest('dialog')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/dialog-open/);
});

test('compact navigation opens and closes with Escape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-1440', 'Desktop navigation is already visible.');
  const toggle = page.locator('.site-nav__toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#site-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#site-navigation')).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('cart hover has a visibly different background', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-375', 'Touch screens do not have hover.');
  const button = page.locator('#add-to-cart');
  const before = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
  await button.hover();
  await expect(button).toHaveCSS('background-color', 'rgb(214, 232, 158)');
  await page.mouse.move(1, 1);
  await expect(button).toHaveCSS('background-color', before);
  await button.hover();
  await page.mouse.down();
  await expect(button).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 1)');
  await page.mouse.up();
});

test('layout has no horizontal overflow for any of the four prices', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Ананасовый улун', level: 1 })).toBeVisible();
  const image = page.locator('.product-gallery__image');
  await expect(image).toBeVisible();
  expect(await image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
  for (const variant of variants) {
    await selectWeight(page, variant.weight);
    const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(fitsViewport).toBe(true);
  }
});

test('no runtime errors or failed local resources', async ({ page }) => {
  const errors = [];
  const failed = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failed.push(request.url()));
  await page.reload();
  await selectWeight(page, '500');
  await page.locator('.product-gallery__trigger').click();
  await page.getByRole('button', { name: 'Закрыть фотографию' }).click();
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('WCAG A/AA automated checks: semantics, accessible names and contrast', async ({ page }) => {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('without JavaScript the default price remains readable and controls are disabled', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'Ананасовый улун', level: 1 })).toBeVisible();
  expect(normalize(await page.locator('#current-price').innerText())).toBe('326,40 ₽');
  await expect(page.getByRole('radio', { name: '100 г', exact: true })).toBeDisabled();
  await expect(page.locator('#add-to-cart')).toBeDisabled();
  await expect(page.locator('.no-script-note')).toBeVisible();
  await context.close();
});


test('ordinary reload returns to the 100 g default with matching prices', async ({ page }) => {
  await selectWeight(page, '5000');
  await expectVariant(page, variants[3]);
  await page.reload();
  await expect(page.getByRole('radio', { name: '100 г', exact: true })).toBeEnabled();
  await expectVariant(page, variants[0]);
});

test('a variant without a discount hides old price, badge and saving', async ({ page }) => {
  await page.route('**/js/product.js', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    expect(source).toContain('oldPrice: 34920');
    await route.fulfill({
      response,
      body: source.replace('oldPrice: 34920', 'oldPrice: 32640'),
    });
  });
  await page.reload();
  await expect(page.locator('#old-price-wrap')).toBeHidden();
  await expect(page.locator('#discount-badge')).toBeHidden();
  await expect(page.locator('#saving-wrap')).toBeHidden();
  expect(normalize(await page.locator('#current-price').innerText())).toBe('326,40 ₽');
  await selectWeight(page, '500');
  await expect(page.locator('#old-price-wrap')).toBeVisible();
  await expect(page.locator('#discount-badge')).toBeVisible();
  await expect(page.locator('#saving-wrap')).toBeVisible();
  await expectVariant(page, variants[1]);
});

test('semantic structure, local images and non-submitting buttons', async ({ page }) => {
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('nav[aria-label]')).toHaveCount(2);
  await expect(page.getByRole('group', { name: 'Выберите фасовку' })).toBeVisible();
  await expect(page.locator('[style]')).toHaveCount(0);
  await expect(page.locator('input[data-price], input[data-old-price], input[data-sku]')).toHaveCount(0);
  for (const button of await page.locator('button').all()) {
    await expect(button).toHaveAttribute('type', 'button');
  }
  for (const image of await page.locator('img').all()) {
    expect(await image.getAttribute('src')).toMatch(/^img\//);
  }
  expect(await page.locator('.product-gallery__image').getAttribute('alt')).toBeTruthy();
  await page.keyboard.press('Tab');
  await page.locator('#add-to-cart').focus();
  await expect(page.locator('#add-to-cart')).toHaveCSS('outline-width', '3px');
});

test('all four labels fit their buttons and primary text is readable', async ({ page }) => {
  for (const variant of variants) {
    await selectWeight(page, variant.weight);
    for (const label of await page.locator('.packaging__label').all()) {
      expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      expect(await label.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
      expect((await label.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  }
  expect(await page.locator('.product-description__text').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
});


test('finishing a slow image load does not overwrite an early user selection', async ({ page }) => {
  let releaseImage;
  const imageGate = new Promise((resolve) => { releaseImage = resolve; });
  await page.route('**/img/pineapple-oolong-*.webp', async (route) => {
    await imageGate;
    await route.continue();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await selectWeight(page, '5000');
  await expectVariant(page, variants[3]);
  releaseImage();
  await page.waitForLoadState('load');
  await expectVariant(page, variants[3]);
});

test('classic Teaboom styling: local pattern, title above photo, flat gray purchase and red price', async ({ page }) => {
  const background = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(background).toContain('/img/tea-pattern.webp');
  await expect(page.locator('h1')).toHaveCSS('font-weight', '700');
  await expect(page.locator('.product-price__current')).toHaveCSS('color', 'rgb(240, 0, 0)');
  await expect(page.locator('.product__purchase')).toHaveCSS('background-color', 'rgb(245, 245, 245)');
  await expect(page.locator('.product-gallery__trigger')).toHaveCSS('border-radius', '0px');
  const title = await page.locator('h1').boundingBox();
  const photo = await page.locator('.product-gallery__image').boundingBox();
  expect(title.y + title.height).toBeLessThanOrEqual(photo.y);
  const brand = await page.locator('.brand').boundingBox();
  const navigation = await page.locator('.site-header__navigation').boundingBox();
  expect(brand.y + brand.height).toBeLessThanOrEqual(navigation.y);
});
