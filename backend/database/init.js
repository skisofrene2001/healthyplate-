require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SEED_INGREDIENTS = [
  // Protéines
  { name: 'Poulet (blanc)', category: 'Protéines', default_unit: 'kg', default_price: 450 },
  { name: 'Viande hachée', category: 'Protéines', default_unit: 'kg', default_price: 1200 },
  { name: 'Œuf', category: 'Protéines', default_unit: 'unité', default_price: 25 },
  { name: 'Thon (conserve)', category: 'Protéines', default_unit: 'boîte', default_price: 180 },
  { name: 'Sardine (conserve)', category: 'Protéines', default_unit: 'boîte', default_price: 100 },
  { name: 'Crevettes', category: 'Protéines', default_unit: 'kg', default_price: 1800 },
  { name: 'Lentilles', category: 'Protéines', default_unit: 'kg', default_price: 200 },
  { name: 'Pois chiches', category: 'Protéines', default_unit: 'kg', default_price: 250 },
  { name: 'Haricots blancs', category: 'Protéines', default_unit: 'kg', default_price: 300 },
  // Produits laitiers
  { name: 'Lait', category: 'Laitiers', default_unit: 'litre', default_price: 50 },
  { name: 'Yaourt nature', category: 'Laitiers', default_unit: 'unité', default_price: 30 },
  { name: 'Fromage', category: 'Laitiers', default_unit: 'kg', default_price: 800 },
  { name: 'Beurre', category: 'Laitiers', default_unit: 'kg', default_price: 900 },
  // Légumes
  { name: 'Tomate', category: 'Légumes', default_unit: 'kg', default_price: 80 },
  { name: 'Oignon', category: 'Légumes', default_unit: 'kg', default_price: 60 },
  { name: 'Pomme de terre', category: 'Légumes', default_unit: 'kg', default_price: 50 },
  { name: 'Carotte', category: 'Légumes', default_unit: 'kg', default_price: 70 },
  { name: 'Courgette', category: 'Légumes', default_unit: 'kg', default_price: 100 },
  { name: 'Poivron', category: 'Légumes', default_unit: 'kg', default_price: 150 },
  { name: 'Épinards', category: 'Légumes', default_unit: 'kg', default_price: 120 },
  { name: 'Concombre', category: 'Légumes', default_unit: 'unité', default_price: 40 },
  { name: 'Laitue', category: 'Légumes', default_unit: 'unité', default_price: 50 },
  { name: 'Ail', category: 'Légumes', default_unit: 'tête', default_price: 30 },
  { name: 'Avocat', category: 'Légumes', default_unit: 'unité', default_price: 150 },
  // Fruits
  { name: 'Banane', category: 'Fruits', default_unit: 'kg', default_price: 200 },
  { name: 'Pomme', category: 'Fruits', default_unit: 'kg', default_price: 250 },
  { name: 'Orange', category: 'Fruits', default_unit: 'kg', default_price: 150 },
  { name: 'Citron', category: 'Fruits', default_unit: 'unité', default_price: 20 },
  { name: 'Fraise', category: 'Fruits', default_unit: 'kg', default_price: 400 },
  { name: 'Dattes', category: 'Fruits', default_unit: 'kg', default_price: 500 },
  // Céréales
  { name: 'Pain complet', category: 'Céréales', default_unit: 'unité', default_price: 50 },
  { name: 'Riz', category: 'Céréales', default_unit: 'kg', default_price: 150 },
  { name: 'Pâtes', category: 'Céréales', default_unit: 'kg', default_price: 120 },
  { name: 'Semoule', category: 'Céréales', default_unit: 'kg', default_price: 100 },
  { name: 'Flocons d\'avoine', category: 'Céréales', default_unit: 'kg', default_price: 350 },
  { name: 'Farine', category: 'Céréales', default_unit: 'kg', default_price: 80 },
  // Huiles & condiments
  { name: 'Huile d\'olive', category: 'Huiles', default_unit: 'litre', default_price: 700 },
  { name: 'Huile de tournesol', category: 'Huiles', default_unit: 'litre', default_price: 250 },
  { name: 'Miel', category: 'Sucrants', default_unit: 'kg', default_price: 1500 },
  { name: 'Sucre', category: 'Sucrants', default_unit: 'kg', default_price: 100 },
  // Épices
  { name: 'Cumin', category: 'Épices', default_unit: 'sachet', default_price: 30 },
  { name: 'Paprika', category: 'Épices', default_unit: 'sachet', default_price: 30 },
  { name: 'Curcuma', category: 'Épices', default_unit: 'sachet', default_price: 40 },
  { name: 'Cannelle', category: 'Épices', default_unit: 'sachet', default_price: 50 },
  { name: 'Persil', category: 'Épices', default_unit: 'botte', default_price: 20 },
  { name: 'Coriandre', category: 'Épices', default_unit: 'botte', default_price: 20 },
  { name: 'Sel', category: 'Épices', default_unit: 'kg', default_price: 30 },
  { name: 'Poivre', category: 'Épices', default_unit: 'sachet', default_price: 40 },
];

async function init() {
  const client = await pool.connect();
  try {
    console.log('🔧 Creating tables...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    try {
      await client.query('ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS image_url TEXT;');
    } catch (err) {
      console.log('Column image_url may already exist or error:', err.message);
    }

    console.log('🌱 Seeding ingredients...');
    for (const ing of SEED_INGREDIENTS) {
      await client.query(
        `INSERT INTO ingredients (name, category, default_unit, default_price)
         VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
        [ing.name, ing.category, ing.default_unit, ing.default_price]
      );
    }

    console.log(`✅ Done! ${SEED_INGREDIENTS.length} ingredients seeded.`);
  } catch (err) {
    console.error('❌ Init failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

init();
