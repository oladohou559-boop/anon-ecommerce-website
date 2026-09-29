'use strict';

function reply(res, status, payload) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(payload);
}

module.exports = async function checkoutStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return reply(res, 405, { error: 'Méthode non autorisée.' });
  }

  const sessionId = typeof req.query?.session_id === 'string' ? req.query.session_id : '';
  if (!/^cs_(?:test|live)_[A-Za-z0-9_]{10,255}$/.test(sessionId)) {
    return reply(res, 400, { error: 'La référence de paiement est invalide.' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return reply(res, 503, { error: 'La vérification de paiement n’est pas configurée.' });

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
      signal: AbortSignal.timeout(10000)
    });
    const session = await response.json();
    if (!response.ok) {
      console.error('Stripe Checkout status verification failed.', session.error?.type || response.status);
      return reply(res, 502, { error: 'Impossible de vérifier le paiement auprès de Stripe pour le moment.' });
    }

    const status = session.payment_status === 'paid'
      ? 'paid'
      : session.status === 'expired'
        ? 'expired'
        : 'pending';
    return reply(res, 200, {
      status,
      amount: Number.isInteger(session.amount_total) ? session.amount_total : null,
      currency: typeof session.currency === 'string' ? session.currency.toUpperCase() : null
    });
  } catch (error) {
    console.error('Unable to verify a Stripe Checkout session.', error);
    return reply(res, 503, { error: 'La vérification est momentanément indisponible. Actualisez cette page dans quelques instants.' });
  }
};
