const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.local.json');

// Load saved config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {}
  return {};
}

function saveConfig(data) {
  const current = loadConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...data }, null, 2));
}

// Get active API key (saved config > env)
function getApiKey() {
  const cfg = loadConfig();
  return cfg.geminiApiKey || process.env.GEMINI_API_KEY || '';
}

function isKeyValid(key) {
  return key && key.length > 10 && key !== 'your_free_gemini_api_key_here';
}

// Model instance (lazy init)
let model = null;
let currentKey = '';

// Quota tracker (15 RPM free tier)
let requestTimestamps = [];
const FREE_TIER_RPM = 15;

function trackRequest() {
  const now = Date.now();
  requestTimestamps.push(now);
  // Keep only requests from the last 60 seconds
  requestTimestamps = requestTimestamps.filter(t => now - t < 60000);
}

function getQuotaStatus() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(t => now - t < 60000);
  return {
    used: requestTimestamps.length,
    limit: FREE_TIER_RPM,
    percent: Math.min(100, Math.round((requestTimestamps.length / FREE_TIER_RPM) * 100))
  };
}

function getModel() {
  const key = getApiKey();
  if (!isKeyValid(key)) { model = null; currentKey = ''; return null; }
  if (key !== currentKey) {
    const genAI = new GoogleGenerativeAI(key);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
    });
    currentKey = key;
    console.log('✅ Gemini model initialized');
  }
  return model;
}

// Try init on start
getModel();
if (!model) console.log('⚠️  No Gemini API key — using built-in demo recipes');

// ====== CONFIG API ======
function getStatus() {
  const key = getApiKey();
  return { configured: isKeyValid(key), keyPreview: isKeyValid(key) ? key.slice(0, 6) + '...' + key.slice(-4) : null, mode: isKeyValid(key) ? 'gemini' : 'demo' };
}

function setApiKey(key) {
  saveConfig({ geminiApiKey: key });
  currentKey = ''; // force reinit
  getModel();
  return getStatus();
}

const { DEMO_RECIPES } = require('./data/demoRecipes');

function generateDemoMealPlan({ duration, mealTypes, budgetMax }) {
  let numDays = 1;
  if (duration.includes('semaine')) numDays = 7;
  else if (duration.includes('mois')) numDays = 30;
  else if (duration.includes('repas')) numDays = 1;
  else { const m = duration.match(/(\d+)/); if (m) numDays = parseInt(m[1]); }

  const jours = [];
  let coutTotal = 0;
  const usedIdx = {};
  mealTypes.forEach(t => usedIdx[t] = 0);

  for (let d = 1; d <= numDays; d++) {
    const repas = [];
    for (const type of mealTypes) {
      const recipes = DEMO_RECIPES[type] || DEMO_RECIPES['dejeuner'];
      const recipe = { ...recipes[usedIdx[type] % recipes.length], type };
      repas.push(recipe);
      coutTotal += recipe.cout;
      usedIdx[type]++;
    }
    jours.push({ jour: d, repas });
  }

  if (budgetMax && coutTotal > budgetMax) {
    const ratio = budgetMax / coutTotal;
    coutTotal = 0;
    jours.forEach(j => j.repas.forEach(r => {
      r.cout = Math.round(r.cout * ratio);
      r.ingredients.forEach(i => { i.cout_total = Math.round(i.cout_total * ratio); });
      coutTotal += r.cout;
    }));
  }

  return { jours, cout_total: coutTotal };
}

// ====== GEMINI STREAMING ======
function buildPrompt({ duration, mealTypes, budgetMax, ingredientPrices, preferences, fridge, region, country, persons = 1, calorieTarget }) {
  const priceList = ingredientPrices.map(i => `- ${i.name}: ${i.price} DA / ${i.unit}`).join('\n');
  const budgetLine = budgetMax ? `- Budget MAXIMUM: ${budgetMax} DA.` : '- Pas de contrainte de budget.';
  const prefsLine = (preferences && preferences.length > 0) ? `- PREFERENCES DIETETIQUES OBLIGATOIRES: ${preferences.join(', ')}.` : '';
  const fridgeLine = fridge ? `- FRIGO ANTI-GASPI (À UTILISER ABSOLUMENT, COUT 0 DA): ${fridge}` : '';
  const regionLine = region ? `- RÉGION CULINAIRE: ${region}. Inspire-toi des plats et saveurs de cette région.` : '';
  const countryLine = country ? `- PAYS CULINAIRE: ${country}. Crée des plats traditionnels ou inspirés de ce pays.` : '';
  const calorieLine = calorieTarget ? `- CIBLE CALORIQUE QUOTIDIENNE (POUR 1 PERS): ${calorieTarget} kcal. La somme des calories (petit-déjeuner + déjeuner + dîner) de CHAQUE JOUR doit être d'environ ${calorieTarget} kcal (+/- 5%).` : '';

  const randomSeed = Math.floor(Math.random() * 9999);
  const FORBIDDEN_FIRST = ['poulet grillé', 'poulet rôti', 'salade de poulet'];
  const forbiddenLine = `- INTERDIT comme premier plat: ${FORBIDDEN_FIRST.join(', ')}. Varie absolument !`;
  const cuisineList = [
    'kabyle', 'constantinois', 'oranais', 'tunisien', 'marocain', 'libanais', 'turc',
    'méditerranéen', 'algérois', 'oriental', 'sahraouien', 'berbère'
  ];
  // Si un pays ou une région est spécifié, on force le style de l'IA sur celui-ci
  const randomCuisine = country || region || cuisineList[randomSeed % cuisineList.length];

  return `Tu es un chef cuisinier créatif expert en cuisine ${randomCuisine}.
Génère un plan de repas SAIN, ÉQUILIBRÉ et TOTALEMENT ORIGINAL. Graine de créativité: #${randomSeed}.
CONTRAINTES:
- Durée: ${duration}
- Types de repas: ${(mealTypes || []).join(', ')}
${budgetLine}
${prefsLine}
${fridgeLine}
${regionLine}
${countryLine}
${calorieLine}
${forbiddenLine}
PRIX DES INGRÉDIENTS:
${priceList}
RÈGLES IMPORTANTES:
1. Utilise UNIQUEMENT les ingrédients listés (ou ceux du frigo)
2. cout_total = quantite × cout_unitaire (sauf pour les ingrédients du frigo qui coûtent 0 DA !)
3. Quantités réalistes pour 1 personne. (Le coût et l'apport calorique seront multipliés par l'interface utilisateur selon le besoin).
4. VARIÉTÉ ABSOLUE: Chaque plat doit avoir un nom différent. JAMAIS de répétition.
5. Commence TOUJOURS par un plat différent selon la graine #${randomSeed}. Sois imprévisible.
6. Inspire-toi de la cuisine ${randomCuisine} pour les noms et les saveurs.
RÉPONDS UNIQUEMENT avec du JSON valide:
{"jours":[{"jour":1,"repas":[{"type":"petit-dejeuner","nom":"Nom","description":"Desc","cout":320,"calories":450,"proteines":25,"ingredients":[{"nom":"X","quantite":0.5,"unite":"kg","cout_unitaire":200,"cout_total":100}]}]}],"cout_total":4750}`;
}

async function streamMealPlan(config, onChunk) {
  const activeModel = getModel();
  if (!activeModel) {
    const result = generateDemoMealPlan(config);
    const text = JSON.stringify(result, null, 2);
    for (let i = 0; i < text.length; i += 80) {
      onChunk(text.slice(i, i + 80));
      await new Promise(r => setTimeout(r, 25));
    }
    return text;
  }

  const prompt = buildPrompt(config);
  let fullText = '';
  try {
    trackRequest();
    const result = await activeModel.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const t = chunk.text();
      if (t) { fullText += t; onChunk(t); }
    }
  } catch (err) {
    console.error('❌ Gemini error:', err.message);
    const demoResult = generateDemoMealPlan(config);
    fullText = JSON.stringify(demoResult, null, 2);
    for (let i = 0; i < fullText.length; i += 80) {
      onChunk(fullText.slice(i, i + 80));
      await new Promise(r => setTimeout(r, 25));
    }
  }
  return fullText;
}

function buildSingleMealPrompt({ oldMeal, budgetMax, ingredientPrices, preferences, fridge, region, country, persons = 1, calorieTarget }) {
  const priceList = ingredientPrices.map(i => `- ${i.name}: ${i.price} DA / ${i.unit}`).join('\n');
  const budgetLine = budgetMax ? `- Budget MAXIMUM GLOBAL: ${budgetMax} DA.` : '- Pas de contrainte de budget.';
  const prefsLine = (preferences && preferences.length > 0) ? `- PREFERENCES DIETETIQUES OBLIGATOIRES: ${preferences.join(', ')}.` : '';
  const fridgeLine = fridge ? `- FRIGO ANTI-GASPI (À UTILISER ABSOLUMENT, COUT 0 DA): ${fridge}` : '';
  const regionLine = region ? `- RÉGION CULINAIRE: ${region}. Inspire-toi des plats et saveurs de cette région.` : '';
  const countryLine = country ? `- PAYS CULINAIRE: ${country}. Crée des plats traditionnels ou inspirés de ce pays.` : '';
  const oldMealName = oldMeal?.nom || 'Le repas précédent';
  const calorieLine = calorieTarget ? `- CIBLE CALORIQUE POUR CE REPAS (DÉDUITE): Puisque la cible journalière est de ${calorieTarget} kcal, ce repas doit être équilibré pour s'insérer dans ce total (environ 30-40% du total).` : '';

  return `Tu es un chef cuisinier expert.
On veut remplacer le repas suivant: "${oldMealName}" (type: ${oldMeal?.type || 'repas'}).
Génère UN SEUL REPAS de remplacement, totalement différent de "${oldMealName}".
CONTRAINTES:
- Type de repas: ${oldMeal?.type || 'repas'}
${budgetLine}
${prefsLine}
${fridgeLine}
${regionLine}
${countryLine}
PRIX DES INGRÉDIENTS:
${priceList}
RÈGLES:
1. Utilise UNIQUEMENT les ingrédients listés (ou ceux du frigo)
2. cout_total = quantite × cout_unitaire
3. Quantités réalistes pour 1 personne.
4. Doit être nouveau et délicieux.
${calorieLine}
RÉPONDS UNIQUEMENT avec du JSON valide correspondant au format d'un seul repas:
{"type":"${oldMeal?.type || 'repas'}","nom":"Nouveau Nom","description":"Nouvelle desc","cout":320,"calories":450,"proteines":25,"ingredients":[{"nom":"X","quantite":0.5,"unite":"kg","cout_unitaire":200,"cout_total":100}]}`;
}

async function streamSingleMeal(config, onChunk) {
  const activeModel = getModel();
  if (!activeModel) {
    const type = config.oldMeal?.type || 'dejeuner';
    const fallbackList = DEMO_RECIPES[type] || DEMO_RECIPES['dejeuner'];
    const randomMeal = fallbackList[Math.floor(Math.random() * fallbackList.length)];
    const fallbackMeal = { ...randomMeal, type };
    
    const text = JSON.stringify(fallbackMeal, null, 2);
    for (let i = 0; i < text.length; i += 80) {
      onChunk(text.slice(i, i + 80));
      await new Promise(r => setTimeout(r, 25));
    }
    return text;
  }

  const prompt = buildSingleMealPrompt(config);
  let fullText = '';
  try {
    trackRequest();
    const result = await activeModel.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const t = chunk.text();
      if (t) { fullText += t; onChunk(t); }
    }
  } catch (err) {
    console.error('❌ Gemini single meal error:', err.message);
    const type = config.oldMeal?.type || 'dejeuner';
    const fallbackList = DEMO_RECIPES[type] || DEMO_RECIPES['dejeuner'];
    const randomMeal = fallbackList[Math.floor(Math.random() * fallbackList.length)];
    const fallbackMeal = { ...randomMeal, type };
    
    const text = JSON.stringify(fallbackMeal, null, 2);
    for (let i = 0; i < text.length; i += 80) {
      onChunk(text.slice(i, i + 80));
      await new Promise(r => setTimeout(r, 25));
    }
    return text;
  }
  return fullText;
}

async function scanImageForIngredients(base64Data, mimeType) {
  const activeModel = getModel();
  if (!activeModel) throw new Error('API Key manquante pour la vision IA');
  
  const prompt = "Analyse cette image (frigo, table, aliments) et liste tous les ingrédients alimentaires que tu peux y voir. Réponds UNIQUEMENT avec les noms des ingrédients séparés par des virgules, en français. N'ajoute aucune autre phrase.";
  
  try {
    trackRequest();
    const result = await activeModel.generateContent([
      prompt,
      { inlineData: { data: base64Data.split(',')[1], mimeType } }
    ]);
    return result.response.text().replace(/\n/g, '').trim();
  } catch (err) {
    if (err.message.includes('429') || err.message.includes('quota')) {
      console.warn('Quota Gemini atteint, utilisation du fallback pour la vision');
      return "Tomate, Oignon, Poivron, Fromage (Données de secours, quota IA dépassé)";
    }
    throw err;
  }
}

async function generateIngredientsFromPrompt(userPrompt) {
  const activeModel = getModel();
  if (!activeModel) throw new Error('API Key manquante pour la génération IA');
  
  const prompt = `Génère une liste d'ingrédients selon la demande suivante: "${userPrompt}".
RÉPONDS UNIQUEMENT avec un tableau JSON valide contenant des objets avec ces clés: nom (string), category (string: Viandes, Légumes, Fruits, Épicerie, Produits Laitiers, Poissons, Céréales, Épices, ou Autre), price (nombre entier, prix réaliste en dinars algériens DA), unit (string: kg, L, pièce, botte, etc).
Exemple: [{"nom":"Couscous","category":"Céréales","price":150,"unit":"kg"}]`;

  try {
    trackRequest();
    const result = await activeModel.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      return JSON.parse(text);
    } catch (e) {
      const m = text.match(/\[[\s\S]*\]/);
      if (m) return JSON.parse(m[0]);
      throw new Error('Erreur de parsing de la réponse IA');
    }
  } catch (err) {
    if (err.message.includes('429') || err.message.includes('quota')) {
      console.warn('Quota Gemini atteint, utilisation du fallback pour les ingrédients');
      return [
        { nom: "Ingrédient Démo 1", category: "Épicerie", price: 100, unit: "kg" },
        { nom: "Ingrédient Démo 2", category: "Légumes", price: 50, unit: "pièce" }
      ];
    }
    throw err;
  }
}

function parseResponse(text) {
  let c = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(c); }
  catch { const m = c.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Parse error'); }
}

module.exports = { 
  streamMealPlan, 
  streamSingleMeal, 
  scanImageForIngredients,
  generateIngredientsFromPrompt,
  parseResponse, 
  getStatus, 
  getQuotaStatus,
  setApiKey 
};
