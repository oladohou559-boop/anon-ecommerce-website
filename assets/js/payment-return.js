'use strict';

const title = document.querySelector('[data-payment-title]');
const message = document.querySelector('[data-payment-message]');
const total = document.querySelector('[data-payment-total]');
const sessionId = new URLSearchParams(window.location.search).get('session_id');

function displayState(heading, detail) {
  if (title) title.textContent = heading;
  if (message) message.textContent = detail;
}

async function verifyPayment() {
  if (!sessionId) {
    displayState('Aucun paiement à vérifier', 'Aucune référence de paiement sécurisée n’a été fournie.');
    return;
  }

  try {
    const response = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Le service de vérification est indisponible.');

    if (result.status === 'paid') {
      displayState('Votre paiement est confirmé', 'Stripe nous a confirmé le règlement de votre commande. Un reçu est envoyé par e-mail par le prestataire.');
      if (total && Number.isInteger(result.amount) && typeof result.currency === 'string') {
        total.textContent = `Montant confirmé : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: result.currency }).format(result.amount / 100)}`;
        total.hidden = false;
      }
    } else if (result.status === 'expired') {
      displayState('Cette session de paiement a expiré', 'Aucun paiement confirmé pour cette session. Vous pouvez reprendre vos achats depuis la boutique.');
    } else {
      displayState('Paiement en cours de vérification', 'Stripe n’a pas encore confirmé ce paiement. Consultez votre e-mail et actualisez cette page dans quelques instants.');
    }
  } catch (error) {
    displayState('État du paiement indisponible', error instanceof Error ? error.message : 'Réessayez dans quelques instants.');
  }
}

verifyPayment();
