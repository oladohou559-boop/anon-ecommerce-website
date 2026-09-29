'use strict';

const catalog = Array.isArray(window.MoissonsProductCatalog) ? window.MoissonsProductCatalog : [];
const bundles = Array.isArray(window.MoissonsBundleCatalog) ? window.MoissonsBundleCatalog : [];
const products = Object.fromEntries([...catalog, ...bundles].map((product) => [product.id, product]));

const FREE_SHIPPING_THRESHOLD = 85;
const SHIPPING_PRICE = 5.9;
const GIFT_WRAP_PRICE = 4.9;
const PROMO_CODE = 'MERCI10';
const cartKey = 'moissons-cart-v1';
const preferenceKey = 'moissons-preferences-v1';
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.error(`Impossible de lire le stockage local (${key}).`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Impossible d’enregistrer le stockage local (${key}).`, error);
    showToast('Le stockage local est indisponible ; votre panier ne sera pas conservé après cette visite.');
  }
}

function readCart() {
  const saved = readStorage(cartKey, {});
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { items: {}, giftWrap: false, promo: '' };
  const promoUnlocked = readStorage(preferenceKey, {}).promoUnlocked === true;
  const items = {};
  Object.entries(saved.items || {}).forEach(([id, quantity]) => {
    if (products[id] && Number.isInteger(quantity) && quantity > 0 && quantity < 100) items[id] = quantity;
  });
  return { items, giftWrap: saved.giftWrap === true, promo: promoUnlocked && saved.promo === PROMO_CODE ? PROMO_CODE : '' };
}

let cart = readCart();
let toastTimeout;
let lastFocus = null;
let activeRecipient = 'all';
let favoritesOnly = false;
let activeCheckoutWindow = null;
const favoritesKey = 'moissons-favorites-v1';

function itemCount() {
  return Object.values(cart.items).reduce((total, quantity) => total + quantity, 0);
}

function cartSubtotal() {
  return Object.entries(cart.items).reduce((total, [id, quantity]) => total + products[id].price * quantity, 0);
}

function showToast(message) {
  const toast = document.querySelector('[data-toast]');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function savedFavorites() {
  const saved = readStorage(favoritesKey, []);
  return Array.isArray(saved) ? saved.filter((id) => products[id] && catalog.some((product) => product.id === id)) : [];
}

function renderFavorites() {
  const favorites = savedFavorites();
  document.querySelectorAll('[data-favorite]').forEach((button) => {
    const active = favorites.includes(button.dataset.favorite);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `${active ? 'Retirer' : 'Ajouter'} ${products[button.dataset.favorite].name} ${active ? 'des' : 'aux'} favoris`);
    button.textContent = active ? '♥' : '♡';
  });
  const count = document.querySelector('[data-wishlist-count]');
  if (count) count.textContent = favorites.length ? `Mes favoris (${favorites.length})` : 'Mes favoris';
}

function updateProductFilters() {
  const query = document.querySelector('#product-search')?.value.trim().toLocaleLowerCase('fr') || '';
  const category = document.querySelector('#product-category')?.value || 'all';
  const budget = document.querySelector('#budget-filter')?.value || 'all';
  const favorites = savedFavorites();
  let visible = 0;

  document.querySelectorAll('[data-product-card]').forEach((card) => {
    const product = products[card.dataset.productId];
    if (!product) return;
    const matchesRecipient = activeRecipient === 'all' || product.audience.includes(activeRecipient);
    const matchesBudget = budget === 'all' || product.price <= Number(budget);
    const matchesCategory = category === 'all' || product.category === category;
    const matchesQuery = !query || `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase('fr').includes(query);
    const matchesFavorites = !favoritesOnly || favorites.includes(product.id);
    card.hidden = !(matchesRecipient && matchesBudget && matchesCategory && matchesQuery && matchesFavorites);
    if (!card.hidden) visible += 1;
  });

  const empty = document.querySelector('[data-product-empty]');
  if (empty) empty.hidden = visible > 0;
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.id = `product-${product.id}`;
  card.dataset.productCard = '';
  card.dataset.productId = product.id;
  card.dataset.recipient = product.audience.join(' ');
  card.dataset.price = String(product.price);

  const art = document.createElement('div');
  art.className = 'product-art';
  const photo = document.createElement('button');
  photo.type = 'button';
  photo.className = 'product-photo';
  photo.dataset.openProduct = product.id;
  photo.setAttribute('aria-label', `Voir la fiche de ${product.name}`);
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.imageAlt;
  image.loading = 'lazy';
  image.decoding = 'async';
  photo.append(image);

  const tag = document.createElement('span');
  tag.className = 'product-tag';
  tag.textContent = product.badge;
  const favorite = document.createElement('button');
  favorite.type = 'button';
  favorite.className = 'favorite-button';
  favorite.dataset.favorite = product.id;
  art.append(photo, tag, favorite);

  const info = document.createElement('div');
  info.className = 'product-info';
  const category = document.createElement('span');
  category.className = 'product-category';
  category.textContent = product.category;
  const title = document.createElement('h3');
  title.textContent = product.name;
  const description = document.createElement('p');
  description.className = 'product-desc';
  description.textContent = product.description;
  const rating = document.createElement('div');
  rating.className = 'rating';
  rating.setAttribute('aria-label', 'Évaluation illustrative, à remplacer par des avis vérifiés');
  const stars = document.createElement('span');
  stars.setAttribute('aria-hidden', 'true');
  stars.textContent = '★★★★★';
  const ratingNote = document.createElement('small');
  ratingNote.textContent = 'Avis de démonstration';
  rating.append(stars, ratingNote);
  const detailsButton = document.createElement('button');
  detailsButton.type = 'button';
  detailsButton.className = 'product-details-button';
  detailsButton.dataset.openProduct = product.id;
  detailsButton.textContent = 'Voir la fiche article';
  const price = document.createElement('div');
  price.className = 'price-row';
  const currentPrice = document.createElement('strong');
  currentPrice.textContent = money.format(product.price);
  const oldPrice = document.createElement('del');
  oldPrice.textContent = money.format(product.comparePrice);
  const discount = document.createElement('span');
  discount.className = 'discount-tag';
  discount.textContent = `−${Math.round((1 - product.price / product.comparePrice) * 100)} %`;
  price.append(currentPrice, oldPrice, discount);
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button button-add';
  add.dataset.addToCart = product.id;
  add.innerHTML = 'Ajouter au panier <span aria-hidden="true">＋</span>';
  info.append(category, title, description, rating, detailsButton, price, add);
  card.append(art, info);
  return card;
}

function renderProducts() {
  const grid = document.querySelector('[data-product-grid]');
  if (!grid) return;
  grid.replaceChildren(...catalog.map(createProductCard));
  renderFavorites();
  updateProductFilters();
}

function setProductModal(open, productId = null) {
  const modal = document.querySelector('[data-product-modal]');
  const content = document.querySelector('[data-product-modal-content]');
  if (!modal || !content) return;

  if (!open) {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
    return;
  }

  const product = products[productId];
  if (!product || !catalog.some((item) => item.id === productId)) return;
  lastFocus = document.activeElement;
  content.replaceChildren();

  const image = document.createElement('img');
  image.className = 'product-modal-image';
  image.src = product.image;
  image.alt = product.imageAlt;
  const copy = document.createElement('div');
  copy.className = 'product-modal-copy';
  const category = document.createElement('p');
  category.className = 'eyebrow';
  category.textContent = product.category;
  const title = document.createElement('h2');
  title.id = 'product-modal-title';
  title.textContent = product.name;
  const price = document.createElement('p');
  price.className = 'product-modal-price';
  const currentPrice = document.createElement('strong');
  currentPrice.textContent = money.format(product.price);
  const comparePrice = document.createElement('del');
  comparePrice.textContent = money.format(product.comparePrice);
  price.append(currentPrice, comparePrice);
  const description = document.createElement('p');
  description.textContent = product.description;
  const includedTitle = document.createElement('h3');
  includedTitle.textContent = 'À savoir';
  const included = document.createElement('ul');
  product.details.forEach((detail) => {
    const item = document.createElement('li');
    item.textContent = detail;
    included.append(item);
  });
  const note = document.createElement('p');
  note.className = 'demo-note';
  note.textContent = 'Photo d’ambiance. Les prix, caractéristiques et disponibilités sont à confirmer avant toute vente.';
  const actions = document.createElement('div');
  actions.className = 'product-modal-actions';
  const quantityLabel = document.createElement('label');
  quantityLabel.textContent = 'Quantité';
  const quantity = document.createElement('input');
  quantity.type = 'number';
  quantity.min = '1';
  quantity.max = '99';
  quantity.value = '1';
  quantity.dataset.modalQuantity = '';
  quantityLabel.append(quantity);
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button button-primary';
  add.dataset.modalAdd = product.id;
  add.textContent = `Ajouter · ${money.format(product.price)}`;
  actions.append(quantityLabel, add);
  copy.append(category, title, price, description, includedTitle, included, note, actions);
  content.append(image, copy);
  modal.hidden = false;
  document.body.classList.add('modal-open');
  modal.querySelector('[data-close-product]')?.focus();
}

function updateCheckoutSummary() {
  const summary = document.querySelector('[data-checkout-summary]');
  if (!summary) return;
  summary.replaceChildren();

  Object.entries(cart.items).forEach(([id, quantity]) => {
    const item = document.createElement('p');
    const name = document.createElement('span');
    name.textContent = `${products[id].name} × ${quantity}`;
    const price = document.createElement('strong');
    price.textContent = money.format(products[id].price * quantity);
    item.append(name, price);
    summary.append(item);
  });

  const subtotal = cartSubtotal();
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICE;
  const gift = cart.giftWrap ? GIFT_WRAP_PRICE : 0;
  const discount = cart.promo ? (subtotal + gift) * 0.1 : 0;
  const totals = [
    ['Sous-total', subtotal],
    ...(discount ? [['Remise', -discount]] : []),
    ['Emballage cadeau', gift],
    ['Livraison', shipping],
    ['Total à payer', Math.max(0, subtotal - discount) + gift + shipping]
  ];
  totals.forEach(([label, value]) => {
    const row = document.createElement('p');
    if (label === 'Total à payer') row.className = 'checkout-total';
    const name = document.createElement('span');
    name.textContent = label;
    const amount = document.createElement('strong');
    amount.textContent = Number(value) < 0 ? `−${money.format(Math.abs(value))}` : money.format(value);
    row.append(name, amount);
    summary.append(row);
  });
}

function setCheckoutModal(open) {
  const modal = document.querySelector('[data-checkout-modal]');
  if (!modal) return;
  if (open && itemCount() === 0) return;
  if (open) {
    lastFocus = document.activeElement;
    updateCheckoutSummary();
    const error = modal.querySelector('[data-checkout-error]');
    if (error) error.hidden = true;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('[data-start-checkout]')?.focus();
  } else {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
}

function updateCart() {
  const count = itemCount();
  if (count === 0) {
    cart.giftWrap = false;
    if (readStorage(preferenceKey, {}).promoUnlocked !== true) cart.promo = '';
  }
  writeStorage(cartKey, cart);
  const subtotal = cartSubtotal();
  const gift = cart.giftWrap ? GIFT_WRAP_PRICE : 0;
  const discount = cart.promo ? (subtotal + gift) * 0.1 : 0;
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICE;
  const total = Math.max(0, subtotal - discount) + gift + shipping;
  const drawer = document.querySelector('[data-cart-drawer]');
  const itemContainer = document.querySelector('[data-cart-items]');
  const options = document.querySelector('[data-cart-options]');
  if (!itemContainer || !options || !drawer) return;

  document.querySelectorAll('[data-cart-count], [data-drawer-count], [data-mobile-cart-count]').forEach((element) => {
    element.textContent = element.matches('[data-drawer-count]') ? `(${count})` : String(count);
  });
  document.querySelectorAll('[data-open-cart]').forEach((button) => {
    button.setAttribute('aria-label', `Ouvrir le panier, ${count} article${count > 1 ? 's' : ''}`);
  });
  const mobileTotal = document.querySelector('[data-mobile-cart-total]');
  if (mobileTotal) mobileTotal.textContent = money.format(total);

  if (count === 0) {
    itemContainer.innerHTML = '<div class="empty-cart"><span aria-hidden="true">🧺</span><h3>Votre panier attend ses premières trouvailles.</h3><p>Quelques jolis détails, et la fête peut commencer.</p><button type="button" class="button button-outline" data-close-cart>Découvrir la boutique</button></div>';
    options.hidden = true;
  } else {
    options.hidden = false;
    itemContainer.replaceChildren();
    Object.entries(cart.items).forEach(([id, quantity]) => {
      const product = products[id];
      const line = document.createElement('article');
      line.className = 'cart-line';

      const image = document.createElement('img');
      image.className = 'cart-line-art';
      image.setAttribute('aria-hidden', 'true');
      image.src = product.image;
      image.alt = '';

      const copy = document.createElement('div');
      copy.className = 'cart-line-copy';
      const name = document.createElement('strong');
      name.textContent = product.name;
      const unitPrice = document.createElement('small');
      unitPrice.textContent = `${money.format(product.price)} l’unité`;
      const quantityControl = document.createElement('div');
      quantityControl.className = 'quantity-control';
      quantityControl.setAttribute('aria-label', `Quantité de ${product.name}`);
      quantityControl.innerHTML = `<button type="button" data-quantity-change="-1" data-product-id="${id}" aria-label="Retirer une unité">−</button><span>${quantity}</span><button type="button" data-quantity-change="1" data-product-id="${id}" aria-label="Ajouter une unité">＋</button>`;
      copy.append(name, unitPrice, quantityControl);

      const end = document.createElement('div');
      end.className = 'cart-line-end';
      const linePrice = document.createElement('strong');
      linePrice.textContent = money.format(product.price * quantity);
      const remove = document.createElement('button');
      remove.className = 'remove-item';
      remove.type = 'button';
      remove.dataset.removeItem = id;
      remove.textContent = 'Supprimer';
      end.append(linePrice, remove);
      line.append(image, copy, end);
      itemContainer.append(line);
    });
  }

  const giftOption = document.querySelector('[data-gift-wrap]');
  if (giftOption) giftOption.checked = cart.giftWrap;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = document.querySelector('[data-shipping-progress]');
  if (progress) progress.style.width = `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`;
  const shippingMessage = document.querySelector('[data-shipping-message]');
  if (shippingMessage) shippingMessage.textContent = remaining > 0 ? `Plus que ${money.format(remaining)} pour profiter de la livraison offerte.` : 'Bonne nouvelle, la livraison vous est offerte !';

  const subtotalElement = document.querySelector('[data-cart-subtotal]');
  const discountRow = document.querySelector('[data-discount-row]');
  const discountElement = document.querySelector('[data-cart-discount]');
  const codeElement = document.querySelector('[data-applied-code]');
  const shippingElement = document.querySelector('[data-cart-shipping]');
  const totalElement = document.querySelector('[data-cart-total]');
  if (subtotalElement) subtotalElement.textContent = money.format(subtotal);
  if (discountRow) discountRow.hidden = discount === 0;
  if (discountElement) discountElement.textContent = `−${money.format(discount)}`;
  if (codeElement) codeElement.textContent = cart.promo ? `(${cart.promo})` : '';
  if (shippingElement) shippingElement.textContent = shipping === 0 ? 'Offerte' : money.format(shipping);
  if (totalElement) totalElement.textContent = money.format(total);
}

function setCartOpen(open) {
  const drawer = document.querySelector('[data-cart-drawer]');
  const backdrop = document.querySelector('[data-drawer-backdrop]');
  if (!drawer || !backdrop) return;
  if (open) {
    lastFocus = document.activeElement;
    drawer.inert = false;
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('is-open');
    backdrop.hidden = false;
    document.body.classList.add('drawer-open');
    window.setTimeout(() => drawer.querySelector('[data-close-cart]')?.focus(), 50);
  } else {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    backdrop.hidden = true;
    document.body.classList.remove('drawer-open');
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
}

function setPromoModalOpen(open) {
  const modal = document.querySelector('[data-promo-modal]');
  if (!modal) return;
  if (open) {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    window.setTimeout(() => modal.querySelector('input')?.focus(), 20);
  } else {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
}

function updateCountdown() {
  const target = new Date('2026-11-26T00:00:00+01:00').getTime();
  const remaining = Math.max(0, target - Date.now());
  const values = {
    '[data-days]': Math.floor(remaining / 86400000),
    '[data-hours]': Math.floor((remaining % 86400000) / 3600000),
    '[data-minutes]': Math.floor((remaining % 3600000) / 60000),
    '[data-seconds]': Math.floor((remaining % 60000) / 1000)
  };
  document.querySelectorAll('[data-countdown]').forEach((counter) => {
    Object.entries(values).forEach(([selector, value]) => {
      const output = counter.querySelector(selector);
      if (output) output.textContent = String(value).padStart(2, '0');
    });
    if (remaining === 0) counter.setAttribute('aria-label', 'C’est le jour de Thanksgiving 2026');
  });
}

function updateGiftGuide() {
  const budget = document.querySelector('#budget-filter')?.value || 'all';
  const cards = [...document.querySelectorAll('.guide-card')];
  let shown = 0;
  cards.forEach((card) => {
    const recipients = (card.dataset.recipient || '').split(' ');
    const matchesRecipient = activeRecipient === 'all' || recipients.includes(activeRecipient);
    const matchesBudget = budget === 'all' || Number(card.dataset.price) <= Number(budget);
    const visible = matchesRecipient && matchesBudget;
    card.hidden = !visible;
    if (visible) shown += 1;
  });
  const empty = document.querySelector('.filter-empty');
  if (empty) empty.hidden = shown > 0;
}

function closeMobileMenu() {
  const menu = document.querySelector('#main-nav');
  const toggle = document.querySelector('.menu-toggle');
  if (!menu || !toggle) return;
  menu.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const addButton = target.closest('[data-add-to-cart]');
  if (addButton) {
    const id = addButton.getAttribute('data-add-to-cart');
    if (!id || !products[id]) return;
    if ((cart.items[id] || 0) >= 99) {
      showToast('La quantité maximale pour un article est de 99.');
      return;
    }
    cart.items[id] = (cart.items[id] || 0) + 1;
    updateCart();
    showToast(`${products[id].name} a rejoint votre panier.`);
    return;
  }

  const productButton = target.closest('[data-open-product]');
  if (productButton) {
    setProductModal(true, productButton.dataset.openProduct);
    return;
  }

  const favoriteButton = target.closest('[data-favorite]');
  if (favoriteButton) {
    const favorites = savedFavorites();
    const id = favoriteButton.dataset.favorite;
    const updated = favorites.includes(id) ? favorites.filter((favorite) => favorite !== id) : [...favorites, id];
    writeStorage(favoritesKey, updated);
    renderFavorites();
    updateProductFilters();
    return;
  }

  const modalAdd = target.closest('[data-modal-add]');
  if (modalAdd) {
    const id = modalAdd.dataset.modalAdd;
    const quantityInput = document.querySelector('[data-modal-quantity]');
    const quantity = Number(quantityInput?.value);
    if (!products[id] || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      showToast('Choisissez une quantité comprise entre 1 et 99.');
      return;
    }
    if ((cart.items[id] || 0) + quantity > 99) {
      showToast('La quantité maximale pour un article est de 99.');
      return;
    }
    cart.items[id] = (cart.items[id] || 0) + quantity;
    updateCart();
    setProductModal(false);
    setCartOpen(true);
    showToast(`${products[id].name} a rejoint votre panier.`);
    return;
  }

  const quantityButton = target.closest('[data-quantity-change]');
  if (quantityButton) {
    const id = quantityButton.getAttribute('data-product-id');
    const change = Number(quantityButton.getAttribute('data-quantity-change'));
    if (!id || !products[id] || !Number.isInteger(change)) return;
    if (change > 0 && (cart.items[id] || 0) >= 99) {
      showToast('La quantité maximale pour un article est de 99.');
      return;
    }
    cart.items[id] = (cart.items[id] || 0) + change;
    if (cart.items[id] <= 0) delete cart.items[id];
    updateCart();
    return;
  }

  const removeButton = target.closest('[data-remove-item]');
  if (removeButton) {
    const id = removeButton.getAttribute('data-remove-item');
    if (id && products[id]) {
      delete cart.items[id];
      updateCart();
    }
    return;
  }

  if (target.closest('[data-open-cart]')) {
    setCartOpen(true);
    closeMobileMenu();
  }
  if (target.closest('[data-close-cart], [data-drawer-backdrop]')) setCartOpen(false);
  if (target.closest('[data-close-product]')) setProductModal(false);
  if (target.closest('[data-close-checkout]')) setCheckoutModal(false);
  if (target.closest('[data-close-promo]')) setPromoModalOpen(false);
  if (target.closest('[data-open-promo]')) {
    event.preventDefault();
    const preferences = readStorage(preferenceKey, {});
    preferences.promoSeen = true;
    writeStorage(preferenceKey, preferences);
    setPromoModalOpen(true);
  }

  const cookieButton = target.closest('[data-cookie-choice]');
  if (cookieButton) {
    const preferences = readStorage(preferenceKey, {});
    preferences.cookies = cookieButton.getAttribute('data-cookie-choice');
    writeStorage(preferenceKey, preferences);
    const banner = document.querySelector('[data-cookie-banner]');
    if (banner) banner.hidden = true;
  }

  if (target.closest('[data-toggle-wishlist]')) {
    favoritesOnly = !favoritesOnly;
    const button = target.closest('[data-toggle-wishlist]');
    button.setAttribute('aria-pressed', String(favoritesOnly));
    updateProductFilters();
  }
});

document.querySelector('#product-search')?.addEventListener('input', updateProductFilters);
document.querySelector('#product-category')?.addEventListener('change', updateProductFilters);
document.querySelector('.product-modal-content')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const modal = document.querySelector('[data-product-modal]');
  if (!modal) return;
  const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled])')];
  if (!focusable.length) return;
  if (event.shiftKey && document.activeElement === focusable[0]) {
    event.preventDefault();
    focusable[focusable.length - 1].focus();
  } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
    event.preventDefault();
    focusable[0].focus();
  }
});

document.querySelector('.menu-toggle')?.addEventListener('click', (event) => {
  const toggle = event.currentTarget;
  const menu = document.querySelector('#main-nav');
  if (!menu) return;
  const isOpen = menu.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('#main-nav a').forEach((link) => link.addEventListener('click', closeMobileMenu));

document.querySelectorAll('[data-filter-recipient]').forEach((button) => {
  button.addEventListener('click', () => {
    activeRecipient = button.getAttribute('data-filter-recipient') || 'all';
    document.querySelectorAll('[data-filter-recipient]').forEach((filter) => {
      const active = filter === button;
      filter.classList.toggle('is-active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    updateGiftGuide();
    updateProductFilters();
  });
});
document.querySelector('#budget-filter')?.addEventListener('change', () => {
  updateGiftGuide();
  updateProductFilters();
});

document.querySelector('[data-gift-wrap]')?.addEventListener('change', (event) => {
  cart.giftWrap = event.currentTarget.checked;
  updateCart();
});

document.querySelector('[data-promo-form]')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector('input');
  const status = form.querySelector('[data-promo-status]');
  const code = input.value.trim().toUpperCase();
  const promoUnlocked = readStorage(preferenceKey, {}).promoUnlocked === true;
  if (code === PROMO_CODE && promoUnlocked) {
    cart.promo = PROMO_CODE;
    if (status) {
      status.classList.remove('is-error');
      status.textContent = 'Code appliqué : 10 % de remise sur vos articles.';
    }
    updateCart();
  } else if (code === PROMO_CODE) {
    if (status) {
      status.classList.add('is-error');
      status.textContent = 'Cette offre de bienvenue est réservée aux abonnés. Recevez votre code ci-dessus.';
    }
  } else {
    if (status) {
      status.classList.add('is-error');
      status.textContent = 'Ce code n’est pas reconnu. Vérifiez son orthographe.';
    }
  }
});

document.querySelector('[data-checkout]')?.addEventListener('click', () => {
  setCartOpen(false);
  setCheckoutModal(true);
});

document.querySelector('[data-start-checkout]')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const modal = document.querySelector('[data-checkout-modal]');
  const error = modal?.querySelector('[data-checkout-error]');
  if (!modal || !error) return;
  error.hidden = true;
  activeCheckoutWindow = window.open('about:blank', '_blank');
  button.disabled = true;
  button.textContent = 'Connexion à Stripe…';

  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: Object.entries(cart.items).map(([id, quantity]) => ({ id, quantity })),
        giftWrap: cart.giftWrap,
        promo: cart.promo
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.url !== 'string') {
      throw new Error(result.error || 'Le paiement sécurisé est momentanément indisponible.');
    }

    if (activeCheckoutWindow) activeCheckoutWindow.location.replace(result.url);
    else window.location.assign(result.url);
  } catch (checkoutError) {
    if (activeCheckoutWindow && !activeCheckoutWindow.closed) activeCheckoutWindow.close();
    activeCheckoutWindow = null;
    error.textContent = checkoutError instanceof Error ? checkoutError.message : 'Le paiement sécurisé est momentanément indisponible.';
    error.hidden = false;
    button.disabled = false;
    button.textContent = 'Réessayer le paiement sécurisé ↗';
  }
});

document.querySelector('[data-promo-signup]')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = new FormData(event.currentTarget).get('email');
  if (typeof email !== 'string' || !email.includes('@')) return;
  const preferences = readStorage(preferenceKey, {});
  preferences.promoSeen = true;
  preferences.promoUnlocked = true;
  writeStorage(preferenceKey, preferences);
  cart.promo = PROMO_CODE;
  updateCart();
  const status = event.currentTarget.querySelector('[data-promo-signup-status]');
  if (status) {
    status.classList.add('is-success');
    status.textContent = `Merci ! Votre code ${PROMO_CODE} est prêt à utiliser dans le panier. Démonstration : votre adresse n’a pas été transmise.`;
  }
  window.setTimeout(() => setPromoModalOpen(false), 2600);
});

document.querySelector('[data-newsletter-form]')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const status = event.currentTarget.querySelector('[data-form-status]');
  if (status) status.textContent = 'Merci pour votre intérêt ! Cette vitrine de démonstration ne transmet pas les adresses e-mail.';
  event.currentTarget.reset();
});

document.querySelector('[data-contact-form]')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const subject = encodeURIComponent(`Message du site — ${data.get('subject') || 'Renseignement'}`);
  const body = encodeURIComponent(`Nom : ${data.get('name')}\nE-mail : ${data.get('email')}\n\n${data.get('message')}`);
  const status = form.querySelector('[data-contact-status]');
  if (status) status.textContent = 'Votre logiciel de messagerie va s’ouvrir pour envoyer votre message.';
  window.location.href = `mailto:bonjour@maisondesmoissons.fr?subject=${subject}&body=${body}`;
});

document.querySelector('[data-cart-drawer]')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const drawer = event.currentTarget;
  const focusable = [...drawer.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')];
  if (!focusable.length) return;
  if (event.shiftKey && document.activeElement === focusable[0]) {
    event.preventDefault();
    focusable[focusable.length - 1].focus();
  } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
    event.preventDefault();
    focusable[0].focus();
  }
});

document.querySelector('[data-promo-modal]')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const modal = event.currentTarget;
  const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled])')];
  if (!focusable.length) return;
  if (event.shiftKey && document.activeElement === focusable[0]) {
    event.preventDefault();
    focusable[focusable.length - 1].focus();
  } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
    event.preventDefault();
    focusable[0].focus();
  }
});

document.querySelector('[data-checkout-modal]')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const modal = event.currentTarget;
  const focusable = [...modal.querySelectorAll('button:not([disabled])')];
  if (!focusable.length) return;
  if (event.shiftKey && document.activeElement === focusable[0]) {
    event.preventDefault();
    focusable[focusable.length - 1].focus();
  } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
    event.preventDefault();
    focusable[0].focus();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!document.querySelector('[data-promo-modal]')?.hidden) setPromoModalOpen(false);
    if (!document.querySelector('[data-product-modal]')?.hidden) setProductModal(false);
    if (!document.querySelector('[data-checkout-modal]')?.hidden) setCheckoutModal(false);
    if (document.querySelector('[data-cart-drawer]')?.classList.contains('is-open')) setCartOpen(false);
    closeMobileMenu();
  }
});

const preferences = readStorage(preferenceKey, {});
const cookieBanner = document.querySelector('[data-cookie-banner]');
if (cookieBanner && !preferences.cookies) cookieBanner.hidden = false;
const promoModal = document.querySelector('[data-promo-modal]');
if (promoModal && !preferences.promoSeen) {
  window.setTimeout(() => {
    const latestPreferences = readStorage(preferenceKey, {});
    if (!latestPreferences.promoSeen) {
      latestPreferences.promoSeen = true;
      writeStorage(preferenceKey, latestPreferences);
      setPromoModalOpen(true);
    }
  }, 12000);
}

renderProducts();
updateCart();
updateCountdown();
window.setInterval(updateCountdown, 1000);

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.section-heading, .product-card, .bundle-card, .why-points article, .review-card').forEach((element) => {
    element.classList.add('reveal');
    revealObserver.observe(element);
  });
}
