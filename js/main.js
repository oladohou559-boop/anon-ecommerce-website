const PRODUITS = [
  { id: 1, nom: "Dinde fermière prête à cuire", catégorie: "Repas", prix: 89, "ancien prix": 109, badge: "Best-seller", img: "dinde.jpg", imgDisponible: true, emoji: "🦃" },
  { id: 2, nom: "Centre de table d'automne", catégorie: "Déco", prix: 34, img: "centre-table.jpg", imgDisponible: true, emoji: "🍂" },
  { id: 3, nom: "Set de 6 assiettes en grès", catégorie: "Table", prix: 59, "ancien prix": 74, badge: "-20 %", img: "assiettes.jpg", imgDisponible: true, emoji: "🍽️" },
  { id: 4, nom: "Nappe en lin brodée", catégorie: "Table", prix: 45, img: "nappe.jpg", imgDisponible: true, emoji: "🧵" },
  { id: 5, nom: "Trio de bougies cannelle-pomme", catégorie: "Déco", prix: 28, img: "bougies.jpg", imgDisponible: true, emoji: "🕯️" },
  { id: 6, nom: "Couronne de feuilles d'érable", catégorie: "Déco", prix: 39, badge: "Nouveau", img: "couronne.jpg", imgDisponible: true, emoji: "🍁" },
  { id: 7, nom: "Plat à gratin en fonte", catégorie: "Cuisine", prix: 64, img: "gratin.jpg", imgDisponible: true, emoji: "🥘" },
  { id: 8, nom: "Thermomètre à rôtir digital", catégorie: "Cuisine", prix: 24, badge: "Stock limité", img: "thermometre.jpg", imgDisponible: true, emoji: "🌡️" },
  { id: 9, nom: "Planche à découper en noyer", catégorie: "Cuisine", prix: 42, img: "planche.jpg", imgDisponible: true, emoji: "🪵" },
  { id: 10, nom: "Coffret tarte à la citrouille", catégorie: "Repas", prix: 32, img: "tarte.jpg", imgDisponible: true, emoji: "🥧" },
  { id: 11, nom: "Panier gourmand de l'hôte", catégorie: "Cadeaux", prix: 55, "ancien prix": 65, badge: "-15 %", img: "panier.jpg", imgDisponible: true, emoji: "🧺" },
  { id: 12, nom: "Tablier en lin", catégorie: "Cadeaux", prix: 27, img: "tablier.jpg", imgDisponible: true, emoji: "🧑‍🍳" },
  { id: 13, nom: "Sirop d'érable et noix de pécan", catégorie: "Repas", prix: 19, img: "sirop.jpg", imgDisponible: true, emoji: "🍯" }
];

const BUNDLE_ID = "coffret-hote";
const BUNDLE_PRICE = 74;
const BUNDLE_REGULAR_PRICE = 87;
const SHIPPING_THRESHOLD = 75;
const SHIPPING_PRICE = 6.9;
const CART_STORAGE_KEY = "gratitude-cie-panier-v1";
const productById = new Map(PRODUITS.map((product) => [product.id, product]));
const productGrid = document.querySelector("#product-grid");
const cartDrawer = document.querySelector("#cart-drawer");
const cartBackdrop = document.querySelector(".cart-backdrop");
const cartTrigger = document.querySelector(".cart-trigger");
const cartClose = document.querySelector(".cart-close");
const cartLines = document.querySelector(".cart-lines");
const cartEmpty = document.querySelector(".cart-empty");
const toast = document.querySelector(".toast");
let panier = loadCart();
let promoActive = false;
let toastTimer;
let lastFocusedElement = null;

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError("Le contenu du panier enregistré est invalide.");
    return parsed.filter((item) => {
      const validId = productById.has(item.id) || item.id === BUNDLE_ID;
      return validId && Number.isInteger(item.quantity) && item.quantity > 0;
    });
  } catch (error) {
    console.warn("Le panier enregistré n'a pas pu être relu ; un nouveau panier vide est utilisé.", error);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(panier));
  } catch (error) {
    console.warn("Le navigateur n'a pas pu enregistrer le panier.", error);
    showToast("Le panier reste disponible jusqu'à la fermeture de cette page.");
  }
}

function formatPrice(amount) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(amount);
}

function addImageWithFallback(container, fileName, alt, emoji, className) {
  const fallback = document.createElement("span");
  fallback.className = "product-emoji";
  fallback.setAttribute("aria-hidden", "true");
  fallback.textContent = emoji;
  container.append(fallback);

  if (!fileName) {
    container.classList.add("is-fallback");
    return;
  }

  const image = document.createElement("img");
  image.className = className;
  image.alt = alt;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.remove();
    container.classList.add("is-fallback");
  }, { once: true });
  image.src = `images/${fileName}`;
  container.append(image);
}

function renderProducts(category = "Tous") {
  const items = category === "Tous" ? PRODUITS : PRODUITS.filter((product) => product.catégorie === category);
  productGrid.replaceChildren();

  items.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.id = `produit-${product.id}`;

    const visual = document.createElement("div");
    visual.className = "product-visual";
    visual.setAttribute("aria-label", product.nom);
    if (product.badge) {
      const badge = document.createElement("span");
      badge.className = `product-badge${product.badge.includes("%") ? " badge-gold" : ""}`;
      badge.textContent = product.badge;
      visual.append(badge);
    }
    const imageClass = product.id === 13 ? "product-image product-image--contained" : "product-image";
    addImageWithFallback(visual, product.imgDisponible ? product.img : null, product.nom, product.emoji, imageClass);

    const meta = document.createElement("div");
    meta.className = "product-meta";
    const categoryLabel = document.createElement("span");
    categoryLabel.textContent = product.catégorie;
    meta.append(categoryLabel);

    const name = document.createElement("h3");
    name.className = "product-name";
    name.textContent = product.nom;

    const price = document.createElement("p");
    price.className = "product-price";
    price.append(document.createTextNode(formatPrice(product.prix)));
    if (product["ancien prix"]) {
      const oldPrice = document.createElement("s");
      oldPrice.textContent = formatPrice(product["ancien prix"]);
      price.append(oldPrice);
    }

    const addButton = document.createElement("button");
    addButton.className = "product-add";
    addButton.type = "button";
    addButton.dataset.addProduct = String(product.id);
    addButton.setAttribute("aria-label", `Ajouter ${product.nom} au panier`);
    addButton.innerHTML = "Ajouter au panier <span aria-hidden=\"true\">+</span>";

    card.append(visual, meta, name, price, addButton);
    productGrid.append(card);
  });
}

function getCartProduct(id) {
  if (id === BUNDLE_ID) {
    return { id: BUNDLE_ID, nom: "Coffret de l'hôte", prix: BUNDLE_PRICE, emoji: "🎁", img: null };
  }
  return productById.get(id);
}

function getSubtotal() {
  return panier.reduce((total, item) => {
    const product = getCartProduct(item.id);
    return total + (product ? product.prix * item.quantity : 0);
  }, 0);
}

function cartQuantity() {
  return panier.reduce((total, item) => total + item.quantity, 0);
}

function renderCart() {
  const count = cartQuantity();
  const subtotal = getSubtotal();
  const discount = promoActive ? subtotal * .1 : 0;
  const shipping = subtotal === 0 || subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICE;
  const total = Math.max(0, subtotal - discount + shipping);
  const remaining = Math.max(0, SHIPPING_THRESHOLD - subtotal);

  cartTrigger.querySelector(".cart-count").textContent = String(count);
  cartTrigger.setAttribute("aria-label", `Ouvrir le panier, ${count} article${count === 1 ? "" : "s"}`);
  document.querySelector(".cart-title-count").textContent = `(${count})`;
  cartEmpty.hidden = count > 0;
  cartLines.replaceChildren();

  panier.forEach((item) => {
    const product = getCartProduct(item.id);
    if (!product) return;

    const line = document.createElement("article");
    line.className = "cart-line";
    const visual = document.createElement("div");
    visual.className = "cart-line-visual";
    addImageWithFallback(visual, product.imgDisponible ? product.img : null, "", product.emoji, "");
    visual.querySelector(".product-emoji").className = "cart-line-emoji";

    const info = document.createElement("div");
    info.className = "cart-line-info";
    const title = document.createElement("strong");
    title.textContent = product.nom;
    const detail = document.createElement("small");
    detail.textContent = item.id === BUNDLE_ID
      ? `3 pièces · au lieu de ${formatPrice(BUNDLE_REGULAR_PRICE)}`
      : product.catégorie;
    const controls = document.createElement("div");
    controls.className = "cart-line-controls";
    controls.innerHTML = `<button class="quantity-button" type="button" data-cart-action="decrease" data-id="${item.id}" aria-label="Retirer un article ${product.nom}">−</button><span class="quantity-value" aria-label="Quantité">${item.quantity}</span><button class="quantity-button" type="button" data-cart-action="increase" data-id="${item.id}" aria-label="Ajouter un article ${product.nom}">+</button><button class="remove-button" type="button" data-cart-action="remove" data-id="${item.id}">Retirer</button>`;
    info.append(title, detail, controls);

    const linePrice = document.createElement("strong");
    linePrice.className = "cart-line-price";
    linePrice.textContent = formatPrice(product.prix * item.quantity);
    line.append(visual, info, linePrice);
    cartLines.append(line);
  });

  document.querySelector(".cart-subtotal").textContent = formatPrice(subtotal);
  document.querySelector(".cart-discount-row").hidden = !promoActive || subtotal === 0;
  document.querySelector(".cart-discount").textContent = `−${formatPrice(discount)}`;
  document.querySelector(".cart-shipping").textContent = subtotal === 0 ? "—" : (shipping === 0 ? "Offerte" : formatPrice(shipping));
  document.querySelector(".cart-grand-total").textContent = formatPrice(total);
  document.querySelector(".checkout-button").disabled = count === 0;
  document.querySelector(".shipping-remaining").textContent = subtotal >= SHIPPING_THRESHOLD
    ? "Livraison offerte !"
    : (subtotal === 0 ? "" : `Encore ${formatPrice(remaining)}`);
  const progress = document.querySelector(".progress-track");
  const progressValue = Math.min(100, subtotal / SHIPPING_THRESHOLD * 100);
  progress.querySelector("span").style.width = `${progressValue}%`;
  progress.setAttribute("aria-valuenow", String(Math.min(SHIPPING_THRESHOLD, Math.round(subtotal))));
}

function updateCart(id, delta) {
  const current = panier.find((item) => item.id === id);
  if (!current && delta > 0) panier.push({ id, quantity: delta });
  else if (current) {
    current.quantity += delta;
    if (current.quantity <= 0) panier = panier.filter((item) => item.id !== id);
  }
  saveCart();
  renderCart();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function openCart() {
  lastFocusedElement = document.activeElement;
  cartBackdrop.hidden = false;
  cartDrawer.inert = false;
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  requestAnimationFrame(() => {
    cartBackdrop.classList.add("is-visible");
    cartDrawer.classList.add("is-open");
    cartClose.focus();
  });
}

function closeCart() {
  cartBackdrop.classList.remove("is-visible");
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartDrawer.inert = true;
  document.body.classList.remove("cart-open");
  window.setTimeout(() => { cartBackdrop.hidden = true; }, 280);
  if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

function setupLocalImage(image) {
  const frame = image.parentElement;
  image.addEventListener("error", () => {
    image.remove();
    frame.classList.add("image-missing");
  }, { once: true });
  image.src = image.dataset.localImage;
}

function updateCountdown() {
  const target = new Date("2026-11-26T00:00:00+01:00").getTime();
  const distance = Math.max(0, target - Date.now());
  const values = {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance % 86400000) / 3600000),
    minutes: Math.floor((distance % 3600000) / 60000),
    seconds: Math.floor((distance % 60000) / 1000)
  };
  Object.entries(values).forEach(([key, value]) => {
    const targetElement = document.querySelector(`[data-countdown="${key}"]`);
    targetElement.textContent = String(value).padStart(2, "0");
  });
  if (distance === 0) document.querySelector(".countdown-label").textContent = "C'est aujourd'hui !";
}

function setupFallCanvas() {
  const canvas = document.querySelector("#fall-canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let leaves = [];
  let frameId = 0;
  let width = 0;
  let height = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const leafCount = width <= 760 ? 15 : 30;
    leaves = Array.from({ length: leafCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 5 + Math.random() * 9,
      speed: .12 + Math.random() * .22,
      sway: .3 + Math.random() * .65,
      phase: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI * 2,
      spinRate: (Math.random() - .5) * .006,
      color: ["#E9B44C", "#EE8B2B", "#B8203A", "#8D6337"][Math.floor(Math.random() * 4)]
    }));
    draw(0);
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    leaves.forEach((leaf) => {
      context.save();
      context.translate(leaf.x + Math.sin(time * .00025 + leaf.phase) * 16 * leaf.sway, leaf.y);
      context.rotate(leaf.spin);
      context.fillStyle = leaf.color;
      context.globalAlpha = .45;
      context.beginPath();
      context.moveTo(0, -leaf.size);
      context.bezierCurveTo(leaf.size * .9, -leaf.size * .75, leaf.size * .95, leaf.size * .3, 0, leaf.size);
      context.bezierCurveTo(-leaf.size * .9, leaf.size * .3, -leaf.size * .9, -leaf.size * .75, 0, -leaf.size);
      context.fill();
      context.restore();
      if (!motionPreference.matches) {
        leaf.y += leaf.speed;
        leaf.spin += leaf.spinRate;
        if (leaf.y > height + 20) {
          leaf.y = -20;
          leaf.x = Math.random() * width;
        }
      }
    });
    if (!motionPreference.matches) frameId = window.requestAnimationFrame(draw);
  }

  function startOrPause() {
    window.cancelAnimationFrame(frameId);
    if (motionPreference.matches) draw(0);
    else frameId = window.requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", () => {
    resize();
    startOrPause();
  }, { passive: true });
  if (typeof motionPreference.addEventListener === "function") motionPreference.addEventListener("change", startOrPause);
  else motionPreference.addListener(startOrPause);
  startOrPause();
}

function setupReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        activeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  elements.forEach((element) => observer.observe(element));
}

document.querySelectorAll("[data-local-image]").forEach(setupLocalImage);
renderProducts();
renderCart();
updateCountdown();
window.setInterval(updateCountdown, 1000);
setupFallCanvas();
setupReveal();

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-button").forEach((filter) => {
      const isActive = filter === button;
      filter.classList.toggle("is-active", isActive);
      filter.setAttribute("aria-pressed", String(isActive));
    });
    renderProducts(button.dataset.filter);
  });
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-product]");
  if (!button) return;
  const product = productById.get(Number(button.dataset.addProduct));
  if (!product) return;
  updateCart(product.id, 1);
  showToast(`${product.nom} ajouté au panier`);
});

document.querySelector("[data-add-bundle]").addEventListener("click", () => {
  updateCart(BUNDLE_ID, 1);
  showToast("Le coffret de l'hôte a rejoint votre panier");
  openCart();
});

cartTrigger.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartDrawer.classList.contains("is-open")) closeCart();
  if (event.key === "Tab" && cartDrawer.classList.contains("is-open")) {
    const focusable = [...cartDrawer.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

cartLines.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const id = button.dataset.id === BUNDLE_ID ? BUNDLE_ID : Number(button.dataset.id);
  const action = button.dataset.cartAction;
  if (action === "increase") updateCart(id, 1);
  if (action === "decrease") updateCart(id, -1);
  if (action === "remove") updateCart(id, -(panier.find((item) => item.id === id)?.quantity || 0));
});

document.querySelector(".promo-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const code = document.querySelector("#promo-code").value.trim().toUpperCase();
  const status = document.querySelector("#promo-status");
  if (code === "THANKS10") {
    promoActive = true;
    status.textContent = "Code accepté : 10 % de remise appliqués.";
    status.classList.add("promo-success");
    renderCart();
  } else {
    promoActive = false;
    status.textContent = "Ce code n'est pas reconnu. Essayez THANKS10.";
    status.classList.remove("promo-success");
    renderCart();
  }
});

document.querySelector(".checkout-button").addEventListener("click", () => {
  if (panier.length === 0) return;
  panier = [];
  promoActive = false;
  document.querySelector("#promo-code").value = "";
  document.querySelector("#promo-status").textContent = "THANKS10 vous offre -10 %.";
  saveCart();
  renderCart();
  closeCart();
  showToast("Merci ! Votre commande de démonstration est prête — aucun paiement n'a été effectué.");
});

const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#main-navigation");
menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  menuToggle.setAttribute("aria-label", expanded ? "Ouvrir le menu" : "Fermer le menu");
  navigation.classList.toggle("is-open", !expanded);
});
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    navigation.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Ouvrir le menu");
  }
});

const heroParallax = document.querySelector("[data-parallax]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (!reducedMotion.matches) {
  window.addEventListener("scroll", () => {
    heroParallax.style.setProperty("--parallax-offset", `${Math.min(window.scrollY * .045, 22)}px`);
  }, { passive: true });
}

document.querySelector("[data-current-year]").textContent = String(new Date().getFullYear());
