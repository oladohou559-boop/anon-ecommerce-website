'use strict';

(() => {
const catalog = [
  {
    id: 'candle',
    name: 'Bougie « Feu de bois »',
    category: 'Bougies d’automne',
    price: 28,
    comparePrice: 35,
    image: 'assets/images/thanksgiving/bougie-citrouille.jpg',
    imageAlt: 'Citrouille et chandelles allumées pour une ambiance d’automne',
    badge: 'Best-seller',
    audience: ['hote', 'famille'],
    description: 'Une lumière douce et des parfums épicés pour prolonger les conversations après le repas.',
    details: ['Cire végétale', 'Notes de citrouille et de cannelle', 'Environ 40 heures de combustion']
  },
  {
    id: 'centerpiece',
    name: 'Centre de table des moissons',
    category: 'Déco de table',
    price: 64,
    comparePrice: 76,
    image: 'assets/images/thanksgiving/table-repas.jpg',
    imageAlt: 'Table de Thanksgiving préparée pour un repas en famille',
    badge: 'Pièce maîtresse',
    audience: ['hote'],
    description: 'Une table généreuse donne le ton de la fête : composez votre décor autour de belles matières et des couleurs de saison.',
    details: ['Palette automnale', 'Pensé pour une grande tablée', 'Chaque composition est unique']
  },
  {
    id: 'linen',
    name: 'Serviettes en lin « Sous-bois »',
    category: 'Linge de table',
    price: 46,
    comparePrice: 58,
    image: 'assets/images/thanksgiving/table-repas.jpg',
    imageAlt: 'Détails d’une table dressée pour un dîner partagé',
    badge: 'Favori de saison',
    audience: ['hote', 'famille'],
    description: 'Des serviettes souples aux teintes naturelles, pour une table accueillante qui se ressort à chaque fête.',
    details: ['Lot de 4 serviettes', 'Lin lavé au toucher souple', 'Lavable en machine']
  },
  {
    id: 'pie',
    name: 'Coffret tarte à la citrouille',
    category: 'Pâtisserie',
    price: 32,
    comparePrice: 39,
    image: 'assets/images/thanksgiving/tarte-potiron.jpg',
    imageAlt: 'Part de tarte à la citrouille servie dans une assiette',
    badge: 'À partager',
    audience: ['famille', 'enfants'],
    description: 'Tout le plaisir d’une tarte aux épices à préparer ensemble avant que les invités n’arrivent.',
    details: ['Mélange d’épices douces', 'Recette illustrée incluse', 'Préparation à partager en famille']
  },
  {
    id: 'apron',
    name: 'Tablier « Chef de famille »',
    category: 'Pour les cuisiniers',
    price: 42,
    comparePrice: 52,
    image: 'assets/images/thanksgiving/cuisine.jpg',
    imageAlt: 'Deux proches préparent le repas ensemble dans une cuisine lumineuse',
    badge: 'Idée cadeau',
    audience: ['famille'],
    description: 'Une attention pratique pour la personne qui aime être aux fourneaux autant que recevoir.',
    details: ['Coton épais', 'Grande poche devant', 'Liens ajustables']
  },
  {
    id: 'kids',
    name: 'Atelier biscuits « Petite dinde »',
    category: 'Petits gourmands',
    price: 18,
    comparePrice: 22,
    image: 'assets/images/thanksgiving/biscuits-automne.jpg',
    imageAlt: 'Biscuits maison décorés de feuilles d’automne',
    badge: 'Pour les enfants',
    audience: ['enfants', 'famille'],
    description: 'Un atelier gourmand pour occuper les petites mains et partager une douceur avant le dîner.',
    details: ['Emporte-pièces de saison', 'Glaçage à préparer ensemble', 'Idée d’activité dès 4 ans']
  },
  {
    id: 'gourmet',
    name: 'Panier « Merci d’être là »',
    category: 'Paniers gourmands',
    price: 54,
    comparePrice: 68,
    image: 'assets/images/thanksgiving/repas-partage.jpg',
    imageAlt: 'Plats maison disposés au centre d’une table pour un repas partagé',
    badge: 'Cadeau d’hôte',
    audience: ['hote', 'famille'],
    description: 'Une sélection gourmande à déposer chez celles et ceux qui vous ouvrent leur porte.',
    details: ['Douceurs et saveurs de saison', 'Présentation prête à offrir', 'Carte de remerciement incluse']
  },
  {
    id: 'tools',
    name: 'Cuillères en bois d’olivier',
    category: 'Ustensiles de cuisine',
    price: 36,
    comparePrice: 45,
    image: 'assets/images/thanksgiving/cuisine.jpg',
    imageAlt: 'Préparation du repas avec des ustensiles dans une cuisine familiale',
    badge: 'Fait pour cuisiner',
    audience: ['famille'],
    description: 'Des ustensiles simples et robustes pour remuer les sauces, servir les légumes et cuisiner ensemble.',
    details: ['Ensemble de 3 ustensiles', 'Bois naturel', 'Nettoyage à la main recommandé']
  }
];

const bundles = [
  {
    id: 'bundle-table',
    name: 'Coffret « La Tablée complète »',
    category: 'Coffrets cadeaux',
    price: 119,
    comparePrice: 138,
    image: 'assets/images/thanksgiving/table-repas.jpg',
    imageAlt: 'Une table de fête dressée pour recevoir',
    badge: 'Pour recevoir',
    audience: ['hote'],
    description: 'Serviettes en lin, bougie Feu de bois et centre de table.',
    details: ['Un coffret prêt à offrir', 'Trois essentiels pour recevoir', 'Vous économisez 19 €']
  },
  {
    id: 'bundle-gourmet',
    name: 'Coffret « Le Goûter des cousins »',
    category: 'Coffrets cadeaux',
    price: 58,
    comparePrice: 68,
    image: 'assets/images/thanksgiving/tarte-potiron.jpg',
    imageAlt: 'Part de tarte à la citrouille',
    badge: 'Pour les gourmands',
    audience: ['famille', 'enfants'],
    description: 'Tarte à la citrouille, atelier biscuits et miel crémeux.',
    details: ['Des douceurs à partager', 'Une activité pour les enfants', 'Vous économisez 10 €']
  },
  {
    id: 'bundle-host',
    name: 'Coffret « Le Merci à l’hôte »',
    category: 'Coffrets cadeaux',
    price: 99,
    comparePrice: 118,
    image: 'assets/images/thanksgiving/repas-partage.jpg',
    imageAlt: 'Un repas partagé à la maison',
    badge: 'Cadeau d’hôte',
    audience: ['hote', 'famille'],
    description: 'Panier de douceurs, cuillères d’olivier et petite bougie.',
    details: ['Une attention complète pour votre hôte', 'Emballage cadeau disponible', 'Vous économisez 19 €']
  }
];

if (typeof module !== 'undefined' && module.exports) module.exports = { products: catalog, bundles };
if (typeof window !== 'undefined') window.MoissonsProductCatalog = catalog;
if (typeof window !== 'undefined') window.MoissonsBundleCatalog = bundles;
})();
