const MEAL_IMAGES = {
  'salade': 'photo-1512621776951-a57141f2eefd',
  'couscous': 'photo-1585937421612-70a008356fbe',
  'pâtes': 'photo-1621996346565-e3dbc646d9a9',
  'soupe': 'photo-1547592166-23ac45744acd',
  'tajine': 'photo-1713089941197-0a4c8b3dfeca',
  'riz': 'photo-1516684732162-798a0062be99',
  'poulet': 'photo-1598103442097-8b74394b95c6',
  'poisson': 'photo-1519708227418-c8fd9a32b7a2',
  'viande': 'photo-1588168333986-5078d3ae3976',
  'thon': 'photo-1546069901-ba9599a7e63c',
  'lentille': 'photo-1546549032-9571cd6b27df',
  'fruit': 'photo-1676064229122-a5d5fb0c11ed',
  'pain': 'photo-1509440159596-0249088772ff',
  'avocat': 'photo-1687276287139-88f7333c8ca4',
  'yaourt': 'photo-1488477181946-6428a0291777',
  'omelette': 'photo-1525351484163-7529414344d8',
  'crêpe': 'photo-1707757442370-c86084c6ae0c',
  'sandwich': 'photo-1528735602780-2552fd46c7af',
  'smoothie': 'photo-1505252585461-04db1eb84625',
  'porridge': 'photo-1517673400267-0251440c45dc',
  'burger': 'photo-1568901346375-23c9450c58cd',
  'pizza': 'photo-1513104890138-7c749659a591',
  'grillé': 'photo-1598103442097-8b74394b95c6',
  'légumes': 'photo-1540420773420-3366772f4999',
  'dattes': 'photo-1676208753932-6e8bc83a0b0d',
  'fraise': 'photo-1724256149016-05c013fe058e',
};

const MEAL_TYPE_FALLBACK = {
  'petit-dejeuner': 'photo-1504674900247-0877df9cc836',
  'dejeuner': 'photo-1546069901-ba9599a7e63c',
  'diner': 'photo-1414235077428-338989a2e8c0',
  'snack': 'photo-1676064229122-a5d5fb0c11ed',
};

const LOCAL_IMAGES = {
  'poulet': '/images/poulet.jpg',
  'blanc': '/images/poulet.jpg',
  'viande': '/images/viande.jpg',
  'hachée': '/images/viande.jpg',
  'bœuf': '/images/viande.jpg',
  'porc': '/images/viande.jpg',
  'agneau': '/images/viande.jpg',
  'œuf': '/images/oeuf.jpg',
  'omelette': '/images/oeuf.jpg',
  'thon': '/images/thon.jpg',
  'sardine': '/images/sardine.jpg',
  'crevette': '/images/thon.jpg',
  'poisson': '/images/thon.jpg',
  'lentille': '/images/lentille.jpg',
  'pois chiche': '/images/pois_chiche.jpg',
  'haricot': '/images/haricot.jpg',
  'lait': '/images/lait.jpg',
  'yaourt': '/images/yaourt.jpg',
  'fromage': '/images/fromage.jpg',
  'beurre': '/images/huile.jpg',
  'tomate': '/images/tomate.jpg',
  'oignon': '/images/tomate.jpg',
  'pomme de terre': '/images/tomate.jpg',
  'carotte': '/images/carotte.jpg',
  'courgette': '/images/carotte.jpg',
  'poivron': '/images/poivron.jpg',
  'épinard': '/images/epinard.jpg',
  'concombre': '/images/epinard.jpg',
  'laitue': '/images/epinard.jpg',
  'ail': '/images/epinard.jpg',
  'avocat': '/images/avocat.jpg',
  'banane': '/images/banane.jpg',
  'pomme': '/images/pomme.jpg',
  'orange': '/images/pomme.jpg',
  'citron': '/images/citron.jpg',
  'fraise': '/images/fraise.jpg',
  'datte': '/images/fraise.jpg',
  'pain': '/images/pain.jpg',
  'riz': '/images/riz.jpg',
  'pâte': '/images/pate.jpg',
  'semoule': '/images/semoule.jpg',
  'flocon': '/images/flocon.jpg',
  'farine': '/images/farine.jpg',
  'huile': '/images/huile.jpg',
  'olive': '/images/huile.jpg',
  'miel': '/images/miel.jpg',
  'sucre': '/images/miel.jpg',
  'cumin': '/images/cumin.jpg',
  'paprika': '/images/paprika.jpg',
  'curcuma': '/images/curcuma.jpg',
  'cannelle': '/images/cannelle.jpg',
  'persil': '/images/cumin.jpg',
  'coriandre': '/images/cumin.jpg',
  'sel': '/images/cumin.jpg',
  'poivre': '/images/poivre.jpg',
};

const FALLBACK_MAP = {
  'Protéines': '/images/proteines.jpg',
  'Laitiers': '/images/laitiers.jpg',
  'Légumes': '/images/legumes.jpg',
  'Fruits': '/images/fruits.jpg',
  'Céréales': '/images/cereales.jpg',
  'Huiles': '/images/huiles.jpg',
  'Sucrants': '/images/sucrants.jpg',
  'Épices': '/images/epices.jpg',
};

function unsplashUrl(photoId, w = 400, h = 400) {
  return `https://images.unsplash.com/${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

export function getMealImage(mealName, mealType) {
  const name = (mealName || '').toLowerCase();
  for (const [keyword, photoId] of Object.entries(MEAL_IMAGES)) {
    if (name.includes(keyword)) return unsplashUrl(photoId);
  }
  const fallback = MEAL_TYPE_FALLBACK[mealType] || MEAL_TYPE_FALLBACK['dejeuner'];
  return unsplashUrl(fallback);
}

export function getIngredientImage(ingredientName, category) {
  const name = (ingredientName || '').toLowerCase();
  for (const [keyword, localPath] of Object.entries(LOCAL_IMAGES)) {
    if (name.includes(keyword)) return localPath;
  }
  return FALLBACK_MAP[category] || '/images/legumes.jpg';
}

export const CATEGORY_EMOJI = {
  'Protéines': '🥩',
  'Laitiers': '🥛',
  'Légumes': '🥬',
  'Fruits': '🍎',
  'Céréales': '🌾',
  'Huiles': '🫒',
  'Sucrants': '🍯',
  'Épices': '🌿',
};
