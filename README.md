# Maison des Moissons

Boutique de saison en français, consacrée à Thanksgiving : décoration de table, cadeaux d’hôte, textiles et douceurs à partager. Le site utilise HTML, CSS et JavaScript natifs. Les pages statiques fonctionnent sans dépendance ; les fonctions de paiement sont des fonctions serverless Vercel.

## Aperçu du projet

- `index.html` : vitrine, guide cadeaux, recherche, catégories, favoris, fiches produits, coffrets et panier.
- `assets/js/catalog.js` : catalogue partagé avec l’API de paiement.
- `assets/js/script.js` : filtres, favoris, fenêtres produit et panier dans le navigateur.
- `api/create-checkout-session.js` : création contrôlée d’une session Stripe Checkout.
- `api/checkout-status.js` et `payment-return.html` : vérification côté serveur du statut Stripe ; la page de retour ne se fie jamais à la seule URL de succès.
- `mentions-legales.html`, `cgv.html`, `confidentialite.html`, `retours.html` et `contact.html` : pages d’information à adapter avant mise en vente.

## Lancer en local

Ouvrez `index.html` pour parcourir les fonctions statiques ou lancez un serveur :

```bash
python -m http.server 8000
```

Les fonctions `/api/*` ne sont pas disponibles sur un serveur statique simple. Pour les tester sur Vercel, déployez le projet et configurez les variables d’environnement décrites ci-dessous.

## Paiement Stripe et activation

Le bouton de paiement ouvre un récapitulatif puis demande une session hébergée Stripe Checkout. L’API recalcule les montants à partir du catalogue côté serveur, limite les quantités et zones de livraison, et ne reçoit jamais de coordonnées de carte. Les résultats de paiement sont vérifiés auprès de Stripe avant d’être annoncés comme confirmés. Sans configuration, le paiement est explicitement indisponible.

Variables Vercel requises :

- `STRIPE_SECRET_KEY` : clé secrète Stripe, stockée uniquement dans les variables d’environnement serveur.
- `SITE_URL` : URL HTTPS canonique du site déployé.
- `STRIPE_CATALOG_CONFIRMED=true` : à définir uniquement après validation des articles, prix TTC, taxes, stocks, frais et délais.
- `STRIPE_ORDERS_READY=true` : à définir uniquement après préparation réelle des commandes, du service client, de la livraison et du suivi des règlements.
- `STRIPE_PROMO_COUPON_ID` : identifiant du coupon Stripe correspondant à l’offre de bienvenue `MERCI10` (facultatif ; le code est refusé au paiement tant que ce coupon n’est pas configuré).

Activez également Stripe Tax et configurez les règles fiscales applicables au compte Stripe avant toute activation : Checkout demande le calcul automatique de taxes avec des prix TTC. Les indicateurs doivent rester absents ou différents de `true` tant que le vendeur n’a pas vérifié son catalogue et son processus de commande. Les produits, prix et remises actuellement affichés sont illustratifs : ils ne constituent pas des offres commerciales. Les avis sont des maquettes, les photos sont des images d’ambiance et ne représentent pas nécessairement les articles affichés. Complétez les pages légales avec les véritables informations du vendeur et faites vérifier les obligations applicables avant d’accepter des commandes. Vercel fournit les routes API ; un déploiement statique Netlify ne suffit pas au paiement.

## Photographies

Les photos locales ont été téléchargées depuis Wikimedia Commons (Liat Portal et Famartin, licence CC BY-SA 4.0) et Unsplash. Les liens de crédit et les licences sont indiqués dans le pied de page. Les scènes sont illustratives ; elles ne garantissent pas la représentation exacte des produits.
