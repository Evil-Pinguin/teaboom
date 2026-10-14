(() => {
  'use strict';

  document.documentElement.classList.add('js');

  // The only complete price list. Amounts are integer kopecks, not floats.
  const variants = Object.freeze({
    100: { sku: '01306', price: 32640, oldPrice: 34920 },
    500: { sku: '01307', price: 143200, oldPrice: 164600 },
    1000: { sku: '01308', price: 206400, oldPrice: 259200 },
    5000: { sku: '01309', price: 632000, oldPrice: 871000 },
  });
  const defaultWeight = '100';

  const form = document.querySelector('#product-form');
  const packaging = document.querySelector('#packaging');
  const weightInputs = form.elements.namedItem('weight');
  const sku = document.querySelector('#product-sku');
  const currentPrice = document.querySelector('#current-price');
  const oldPrice = document.querySelector('#old-price');
  const oldPriceWrap = document.querySelector('#old-price-wrap');
  const discountBadge = document.querySelector('#discount-badge');
  const discountValue = document.querySelector('#discount-value');
  const savingWrap = document.querySelector('#saving-wrap');
  const savingAmount = document.querySelector('#saving-amount');
  const cartButton = document.querySelector('#add-to-cart');
  const cartLabel = cartButton.querySelector('.add-to-cart__label');
  const cartIcon = cartButton.querySelector('use');
  const status = document.querySelector('#product-status');
  const toast = document.querySelector('#cart-toast');
  const toastTitle = document.querySelector('#toast-title');
  const toastText = document.querySelector('#toast-text');

  const currencyOptions = { style: 'currency', currency: 'RUB' };
  const wholeRubles = new Intl.NumberFormat('ru-RU', {
    ...currencyOptions, minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  const fractionalRubles = new Intl.NumberFormat('ru-RU', {
    ...currencyOptions, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  const formatPrice = (kopecks) => (
    kopecks % 100 === 0 ? wholeRubles : fractionalRubles
  ).format(kopecks / 100);

  const getVariant = () => ({
    weight: weightInputs.value,
    ...variants[weightInputs.value],
  });

  let toastTimer;
  let buttonTimer;

  const resetCartButton = () => {
    window.clearTimeout(buttonTimer);
    cartLabel.textContent = 'В корзину';
    cartIcon.setAttribute('href', '#icon-bag');
    cartButton.classList.remove('add-to-cart--added');
  };

  const closeToast = () => {
    window.clearTimeout(toastTimer);
    if (toast.contains(document.activeElement)) cartButton.focus();
    toast.hidden = true;
  };

  const renderVariant = (announce = true) => {
    const variant = getVariant();
    const hasDiscount = variant.oldPrice > variant.price;
    const discount = hasDiscount
      ? Math.round((1 - variant.price / variant.oldPrice) * 100)
      : 0;

    sku.textContent = variant.sku;
    currentPrice.textContent = formatPrice(variant.price);
    oldPrice.textContent = formatPrice(variant.oldPrice);
    oldPriceWrap.hidden = !hasDiscount;
    discountBadge.hidden = !hasDiscount;
    savingWrap.hidden = !hasDiscount;
    discountValue.textContent = `−${discount}%`;
    savingAmount.textContent = formatPrice(Math.max(0, variant.oldPrice - variant.price));

    resetCartButton();
    closeToast();

    if (announce) {
      status.textContent = `Фасовка ${variant.weight} г. Артикул ${variant.sku}. `
        + `Цена ${formatPrice(variant.price)}.`
        + (hasDiscount ? ` Старая цена ${formatPrice(variant.oldPrice)}.` : '');
    }
  };

  form.addEventListener('change', (event) => {
    if (event.target.matches('input[name="weight"]')) renderVariant();
  });
  // Never submit a real order, including an implicit keyboard submission.
  form.addEventListener('submit', (event) => event.preventDefault());

  // type="button": only local feedback, no form submission or cart API.
  cartButton.addEventListener('click', () => {
    const variant = getVariant();

    resetCartButton();
    closeToast();
    cartLabel.textContent = 'Добавлено';
    cartIcon.setAttribute('href', '#icon-check');
    cartButton.classList.add('add-to-cart--added');
    toastTitle.textContent = `Ананасовый улун · ${variant.weight} г`;
    toastText.textContent = `${formatPrice(variant.price)}. Демонстрация: реальная корзина не подключена.`;
    toast.hidden = false;
    status.textContent = `${toastTitle.textContent}. ${toastText.textContent}`;

    buttonTimer = window.setTimeout(resetCartButton, 2000);
    toastTimer = window.setTimeout(closeToast, 6500);
  });

  toast.querySelector('.toast__close').addEventListener('click', closeToast);

  const photoDialog = document.querySelector('#photo-dialog');
  const photoTrigger = document.querySelector('.product-gallery__trigger');

  photoTrigger.addEventListener('click', () => {
    photoDialog.showModal();
    document.body.classList.add('dialog-open');
  });

  photoDialog.querySelector('.photo-dialog__close').addEventListener('click', () => {
    photoDialog.close();
  });

  photoDialog.addEventListener('click', (event) => {
    // A native dialog's backdrop click targets the dialog itself.
    const rect = photoDialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom;
    if (event.target === photoDialog && outside) photoDialog.close();
  });

  photoDialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
  });

  const nav = document.querySelector('.site-nav');
  const navToggle = nav.querySelector('.site-nav__toggle');
  const mobileViewport = window.matchMedia('(max-width: 1023px)');

  const setMenuOpen = (open) => {
    nav.classList.toggle('site-nav--open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    navToggle.querySelector('use').setAttribute('href', open ? '#icon-close' : '#icon-menu');
  };

  navToggle.addEventListener('click', () => {
    setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      navToggle.focus();
    }
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });
  mobileViewport.addEventListener('change', () => setMenuOpen(false));

  packaging.disabled = false;
  cartButton.disabled = false;
  photoTrigger.disabled = false;
  weightInputs.value = defaultWeight;
  renderVariant(false);

  // Restore an existing bfcache page without resetting an early user choice.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) renderVariant(false);
  });
})();
