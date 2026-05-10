const { Pool } = require('pg');

const fs = require('fs');
const path = require('path');

let pool = null;
let dbAvailable = false;

const DB_FILE = path.join(__dirname, '../database.json');

// Load from file if exists
let memoryPropositions = [];
let propIdCounter = 1;

if (fs.existsSync(DB_FILE)) {
  try {
    const fileData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    memoryPropositions = fileData.propositions || [];
    if (memoryPropositions.length > 0) {
      propIdCounter = Math.max(...memoryPropositions.map(p => p.id)) + 1;
    }
  } catch (e) {
    console.error('Error reading database.json', e);
  }
}

function saveToFile() {
  fs.writeFileSync(DB_FILE, JSON.stringify({ propositions: memoryPropositions }), 'utf8');
}

// Default ingredients (used as fallback when DB is unavailable)
const DEFAULT_INGREDIENTS = [
  { id:1, name:'Poulet (blanc)', category:'Protéines', default_unit:'kg', default_price:450, price:450, unit:'kg' },
  { id:2, name:'Viande hachée', category:'Protéines', default_unit:'kg', default_price:1200, price:1200, unit:'kg' },
  { id:3, name:'Œuf', category:'Protéines', default_unit:'unité', default_price:25, price:25, unit:'unité' },
  { id:4, name:'Thon (conserve)', category:'Protéines', default_unit:'boîte', default_price:180, price:180, unit:'boîte' },
  { id:5, name:'Sardine (conserve)', category:'Protéines', default_unit:'boîte', default_price:100, price:100, unit:'boîte' },
  { id:6, name:'Lentilles', category:'Protéines', default_unit:'kg', default_price:200, price:200, unit:'kg' },
  { id:7, name:'Pois chiches', category:'Protéines', default_unit:'kg', default_price:250, price:250, unit:'kg' },
  { id:8, name:'Lait', category:'Laitiers', default_unit:'litre', default_price:50, price:50, unit:'litre' },
  { id:9, name:'Yaourt nature', category:'Laitiers', default_unit:'unité', default_price:30, price:30, unit:'unité' },
  { id:10, name:'Fromage', category:'Laitiers', default_unit:'kg', default_price:800, price:800, unit:'kg' },
  { id:11, name:'Beurre', category:'Laitiers', default_unit:'kg', default_price:900, price:900, unit:'kg' },
  { id:12, name:'Tomate', category:'Légumes', default_unit:'kg', default_price:80, price:80, unit:'kg' },
  { id:13, name:'Oignon', category:'Légumes', default_unit:'kg', default_price:60, price:60, unit:'kg' },
  { id:14, name:'Pomme de terre', category:'Légumes', default_unit:'kg', default_price:50, price:50, unit:'kg' },
  { id:15, name:'Carotte', category:'Légumes', default_unit:'kg', default_price:70, price:70, unit:'kg' },
  { id:16, name:'Courgette', category:'Légumes', default_unit:'kg', default_price:100, price:100, unit:'kg' },
  { id:17, name:'Poivron', category:'Légumes', default_unit:'kg', default_price:150, price:150, unit:'kg' },
  { id:18, name:'Épinards', category:'Légumes', default_unit:'kg', default_price:120, price:120, unit:'kg' },
  { id:19, name:'Concombre', category:'Légumes', default_unit:'unité', default_price:40, price:40, unit:'unité' },
  { id:20, name:'Laitue', category:'Légumes', default_unit:'unité', default_price:50, price:50, unit:'unité' },
  { id:21, name:'Ail', category:'Légumes', default_unit:'tête', default_price:30, price:30, unit:'tête' },
  { id:22, name:'Avocat', category:'Légumes', default_unit:'unité', default_price:150, price:150, unit:'unité' },
  { id:23, name:'Banane', category:'Fruits', default_unit:'kg', default_price:200, price:200, unit:'kg' },
  { id:24, name:'Pomme', category:'Fruits', default_unit:'kg', default_price:250, price:250, unit:'kg' },
  { id:25, name:'Orange', category:'Fruits', default_unit:'kg', default_price:150, price:150, unit:'kg' },
  { id:26, name:'Citron', category:'Fruits', default_unit:'unité', default_price:20, price:20, unit:'unité' },
  { id:27, name:'Dattes', category:'Fruits', default_unit:'kg', default_price:500, price:500, unit:'kg' },
  { id:28, name:'Pain complet', category:'Céréales', default_unit:'unité', default_price:50, price:50, unit:'unité' },
  { id:29, name:'Riz', category:'Céréales', default_unit:'kg', default_price:150, price:150, unit:'kg' },
  { id:30, name:'Pâtes', category:'Céréales', default_unit:'kg', default_price:120, price:120, unit:'kg' },
  { id:31, name:'Semoule', category:'Céréales', default_unit:'kg', default_price:100, price:100, unit:'kg' },
  { id:32, name:'Flocons d\'avoine', category:'Céréales', default_unit:'kg', default_price:350, price:350, unit:'kg' },
  { id:33, name:'Huile d\'olive', category:'Huiles', default_unit:'litre', default_price:700, price:700, unit:'litre' },
  { id:34, name:'Miel', category:'Sucrants', default_unit:'kg', default_price:1500, price:1500, unit:'kg' },
  { id:35, name:'Sucre', category:'Sucrants', default_unit:'kg', default_price:100, price:100, unit:'kg' },
  { id:36, name:'Cumin', category:'Épices', default_unit:'sachet', default_price:30, price:30, unit:'sachet' },
  { id:37, name:'Paprika', category:'Épices', default_unit:'sachet', default_price:30, price:30, unit:'sachet' },
  { id:38, name:'Curcuma', category:'Épices', default_unit:'sachet', default_price:40, price:40, unit:'sachet' },
  { id:39, name:'Persil', category:'Épices', default_unit:'botte', default_price:20, price:20, unit:'botte' },
  { id:40, name:'Sel', category:'Épices', default_unit:'kg', default_price:30, price:30, unit:'kg' },
];

// Try to connect to PostgreSQL
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set — running in memory mode');
    return;
  }
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('SELECT 1');
    dbAvailable = true;
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.log('⚠️  PostgreSQL unavailable — running in memory mode');
    pool = null;
    dbAvailable = false;
  }
}

initDB();

module.exports = {
  query: async (text, params) => {
    if (!dbAvailable || !pool) throw new Error('DB_UNAVAILABLE');
    return pool.query(text, params);
  },
  isAvailable: () => dbAvailable,
  getDefaultIngredients: () => DEFAULT_INGREDIENTS,
  pool,
  // Memory fallbacks for propositions
  saveMemoryProposition: (userId, duration, mealTypes, budgetMax, totalCost, data) => {
    const prop = {
      id: propIdCounter++,
      user_id: userId,
      duration,
      meal_types: typeof mealTypes === 'string' ? mealTypes : JSON.stringify(mealTypes),
      budget_max: budgetMax,
      total_cost: totalCost,
      data: typeof data === 'string' ? data : JSON.stringify(data),
      created_at: new Date().toISOString()
    };
    memoryPropositions.unshift(prop);
    saveToFile();
    return prop;
  },
  getMemoryPropositions: (userId) => {
    return memoryPropositions.filter(p => p.user_id === userId);
  },
  deleteMemoryProposition: (userId, propId) => {
    const idx = memoryPropositions.findIndex(p => p.user_id === userId && p.id == propId);
    if (idx !== -1) {
      memoryPropositions.splice(idx, 1);
      saveToFile();
      return true;
    }
    return false;
  }
};
