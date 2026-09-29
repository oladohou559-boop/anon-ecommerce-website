'use strict';

const { products, bundles } = require('../assets/js/catalog');

const catalog = new Map([...products, ...bundles].map((item) => [item.id, item]));
const freeShippingThreshold = 8500;
const shippingAmount = 590;
const giftWrapAmount = 490;

function reply(res, status, payload) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(payload);
}

function checkoutError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      throw checkoutError('Le contenu de la commande est invalide.');
    }
  }
  throw checkoutError('Le contenu de la commande est invalide.');
}

function formatUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('SITE_URL doit être défini avec une URL publique valide.');
  }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('SITE_URL doit utiliser HTTPS.');
  }
  return url;
}

module.exports = async function createCheckoutSession(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Méthode non autorisée.' });
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const siteUrl = formatUrl(process.env.SITE_URL);
    if (!stripeKey) return reply(res, 503, { error: 'Le paiement n’est pas encore configuré pour cette boutique.' });
    if (process.env.STRIPE_CATALOG_CONFIRMED !== 'true' || process.env.STRIPE_ORDERS_READY !== 'true') {
      return reply(res, 503, { error: 'Le catalogue et la préparation réelle des commandes doivent être validés avant l’activation des paiements.' });
    }

    const requestOrigin = req.headers.origin;
    if (requestOrigin && requestOrigin !== siteUrl.origin) {
      return reply(res, 403, { error: 'Cette origine ne peut pas créer de commande.' });
    }

    const body = readBody(req);
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > catalog.size) {
      throw checkoutError('Votre panier ne contient aucun article valide.');
    }
    if (typeof body.giftWrap !== 'boolean' || !['', 'MERCI10'].includes(body.promo)) {
      throw checkoutError('Les options de commande sont invalides.');
    }

    const quantities = new Map();
    let itemSubtotal = 0;
    for (const line of body.items) {
      if (!line || typeof line.id !== 'string' || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 || quantities.has(line.id)) {
        throw checkoutError('Une quantité ou une référence de produit est invalide.');
      }
      const product = catalog.get(line.id);
      if (!product) throw checkoutError('Un article de votre panier n’est plus disponible.');
      quantities.set(line.id, line.quantity);
      itemSubtotal += Math.round(product.price * 100) * line.quantity;
    }

    const giftWrap = body.giftWrap ? giftWrapAmount : 0;
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('billing_address_collection', 'required');
    form.set('shipping_address_collection[allowed_countries][0]', 'FR');
    form.set('automatic_tax[enabled]', 'true');
    form.set('success_url', new URL('/payment-return.html?session_id={CHECKOUT_SESSION_ID}', siteUrl).toString());
    form.set('cancel_url', new URL('/index.html?checkout=cancelled', siteUrl).toString());
    form.set('metadata[store]', 'Maison des Moissons');
    form.set('metadata[catalog_version]', 'thanksgiving-demo-1');

    let lineIndex = 0;
    for (const [id, quantity] of quantities) {
      const product = catalog.get(id);
      const prefix = `line_items[${lineIndex}]`;
      form.set(`${prefix}[quantity]`, String(quantity));
      form.set(`${prefix}[price_data][currency]`, 'eur');
      form.set(`${prefix}[price_data][unit_amount]`, String(Math.round(product.price * 100)));
      form.set(`${prefix}[price_data][product_data][name]`, product.name);
      form.set(`${prefix}[price_data][tax_behavior]`, 'inclusive');
      lineIndex += 1;
    }
    if (giftWrap) {
      const prefix = `line_items[${lineIndex}]`;
      form.set(`${prefix}[quantity]`, '1');
      form.set(`${prefix}[price_data][currency]`, 'eur');
      form.set(`${prefix}[price_data][unit_amount]`, String(giftWrapAmount));
      form.set(`${prefix}[price_data][product_data][name]`, 'Emballage cadeau');
      form.set(`${prefix}[price_data][tax_behavior]`, 'inclusive');
    }

    form.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(itemSubtotal >= freeShippingThreshold ? 0 : shippingAmount));
    form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'eur');
    form.set('shipping_options[0][shipping_rate_data][fixed_amount][tax_behavior]', 'inclusive');
    form.set('shipping_options[0][shipping_rate_data][display_name]', itemSubtotal >= freeShippingThreshold ? 'Livraison offerte' : 'Livraison suivie');

    if (body.promo) {
      const couponId = process.env.STRIPE_PROMO_COUPON_ID;
      if (!couponId) return reply(res, 503, { error: 'Le code de bienvenue ne peut pas encore être appliqué au paiement.' });
      form.set('discounts[0][coupon]', couponId);
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString(),
      signal: AbortSignal.timeout(10000)
    });
    const stripeResult = await stripeResponse.json();
    if (!stripeResponse.ok || typeof stripeResult.url !== 'string') {
      console.error('Stripe Checkout session creation failed.', stripeResult.error?.type || stripeResponse.status);
      return reply(res, 502, { error: 'Stripe ne peut pas démarrer le paiement pour le moment. Réessayez dans quelques instants.' });
    }
    return reply(res, 200, { url: stripeResult.url });
  } catch (error) {
    if (error.statusCode) return reply(res, error.statusCode, { error: error.message });
    console.error('Unable to create a Stripe Checkout session.', error);
    return reply(res, 503, { error: error.message || 'Le paiement sécurisé est momentanément indisponible.' });
  }
};
