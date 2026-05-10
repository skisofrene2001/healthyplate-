const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { streamMealPlan, streamSingleMeal, parseResponse, getStatus, setApiKey } = require('../aiService');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'healthyplate_fallback_secret_2024';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
  cb(null, true);
}});

// In-memory user store (fallback when no DB)
const memUsers = [];
let memUserId = 1;

// === AUTH MIDDLEWARE ===
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Token invalide' }); }
}

// === AUTH ROUTES ===
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    if (db.isAvailable()) {
      const result = await db.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, email, hash]
      );
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ user, token });
    }

    // Memory fallback
    if (memUsers.find(u => u.email === email)) return res.status(400).json({ error: 'Email déjà utilisé' });
    const user = { id: memUserId++, name, email, password_hash: hash };
    memUsers.push(user);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (db.isAvailable()) {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash)))
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
    }

    // Memory fallback
    const user = memUsers.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    let name, email;
    
    // Si c'est une démo locale sans vrai Client ID, on simule l'auth
    if (credential === 'demo-token-123') {
      name = 'Test Google User';
      email = 'test@gmail.com';
    } else {
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        name = payload.name;
        email = payload.email;
      } catch (e) {
        return res.status(401).json({ error: 'Token Google invalide' });
      }
    }

    if (db.isAvailable()) {
      let result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      let user = result.rows[0];
      if (!user) {
        // Create user
        result = await db.query(
          'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
          [name, email, 'google-oauth']
        );
        user = result.rows[0];
      }
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
    }

    // Memory fallback
    let user = memUsers.find(u => u.email === email);
    if (!user) {
      user = { id: memUserId++, name, email, password_hash: 'google-oauth' };
      memUsers.push(user);
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === INGREDIENTS ROUTES ===
router.get('/ingredients', async (req, res) => {
  try {
    if (!db.isAvailable()) {
      return res.json(db.getDefaultIngredients());
    }

    const userId = req.headers.authorization ?
      jwt.verify(req.headers.authorization.split(' ')[1], JWT_SECRET).id : null;

    const query = await db.query(
      'SELECT i.id, i.name, i.category, i.default_unit as unit, i.image_url, COALESCE(uip.price, i.default_price) as price FROM ingredients i LEFT JOIN user_ingredient_prices uip ON i.id = uip.ingredient_id AND uip.user_id = $1 ORDER BY i.category, i.name',
      [userId]
    );
    res.json(query.rows);
  } catch (err) {
    // Fallback to memory
    res.json(db.getDefaultIngredients());
  }
});

router.post('/ingredients', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, category, unit, price } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    if (db.isAvailable()) {
      const result = await db.query(
        'INSERT INTO ingredients (name, category, default_unit, default_price, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, category, unit, price, image_url]
      );
      res.json(result.rows[0]);
    } else {
      res.status(400).json({ error: 'Database not available' });
    }
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ingrédient existe déjà' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/ingredients/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, category, unit, price } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url || null;
    if (db.isAvailable()) {
      await db.query(
        'UPDATE ingredients SET name = $1, category = $2, default_unit = $3, default_price = $4, image_url = $5 WHERE id = $6',
        [name, category, unit, price, image_url, req.params.id]
      );
      res.json({ success: true, image_url });
    } else {
      res.status(400).json({ error: 'Database not available' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/ingredients/:id', auth, async (req, res) => {
  try {
    if (db.isAvailable()) {
      await db.query('DELETE FROM ingredients WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Database not available' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/ingredients/:id/price', auth, async (req, res) => {
  try {
    const { price, unit } = req.body;
    if (db.isAvailable()) {
      await db.query(`
        INSERT INTO user_ingredient_prices (user_id, ingredient_id, price, unit)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, ingredient_id)
        DO UPDATE SET price = $3, unit = $4, updated_at = NOW()
      `, [req.user.id, req.params.id, price, unit]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === PROPOSITIONS ROUTES ===
router.post('/propositions/generate', async (req, res) => {
  try {
    const { duration, mealTypes, budgetMax, preferences, fridge, region, country, persons, calorieTarget } = req.body;

    // Get ingredient prices (DB or fallback)
    let ingredientPrices;
    try {
      if (db.isAvailable()) {
        const q = await db.query('SELECT name, default_price as price, default_unit as unit FROM ingredients');
        ingredientPrices = q.rows;
      } else {
        ingredientPrices = db.getDefaultIngredients().map(i => ({ name: i.name, price: i.price, unit: i.unit }));
      }
    } catch {
      ingredientPrices = db.getDefaultIngredients().map(i => ({ name: i.name, price: i.price, unit: i.unit }));
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Stream from Gemini
    const fullText = await streamMealPlan(
      { duration, mealTypes, budgetMax, ingredientPrices, preferences, fridge, region, country, persons, calorieTarget },
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      }
    );

    // Parse result
    try {
      const parsed = parseResponse(fullText);
      res.write(`data: ${JSON.stringify({ type: 'complete', data: parsed })}\n\n`);
    } catch (parseErr) {
      res.write(`data: ${JSON.stringify({ type: 'raw', text: fullText })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Generate error:', err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.post('/propositions/regenerate-meal', auth, async (req, res) => {
  try {
    const { oldMeal, budgetMax, preferences, fridge, region, country, persons, calorieTarget } = req.body;
    let ingredientPrices;
    try {
      if (db.isAvailable()) {
        const q = await db.query('SELECT name, default_price as price, default_unit as unit FROM ingredients');
        ingredientPrices = q.rows;
      } else {
        ingredientPrices = db.getDefaultIngredients().map(i => ({ name: i.name, price: i.price, unit: i.unit }));
      }
    } catch {
      ingredientPrices = db.getDefaultIngredients().map(i => ({ name: i.name, price: i.price, unit: i.unit }));
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const fullText = await streamSingleMeal(
      { oldMeal, budgetMax, ingredientPrices, preferences, fridge, region, country, persons, calorieTarget },
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      }
    );

    try {
      const parsed = parseResponse(fullText);
      res.write(`data: ${JSON.stringify({ type: 'complete', data: parsed })}\n\n`);
    } catch (parseErr) {
      res.write(`data: ${JSON.stringify({ type: 'raw', text: fullText })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get('/propositions', auth, async (req, res) => {
  try {
    if (!db.isAvailable()) {
      return res.json(db.getMemoryPropositions(req.user.id));
    }
    const result = await db.query(
      'SELECT id, duration, meal_types, budget_max, total_cost, created_at, data FROM propositions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/propositions/search', auth, async (req, res) => {
  // We always generate fresh to ensure variety - cache is only used for archives display
  // Return found:false so AI always generates a new unique plan
  res.json({ found: false });
});

router.post('/propositions', auth, async (req, res) => {
  try {
    const { duration, mealTypes, budgetMax, totalCost, data } = req.body;
    if (!db.isAvailable()) {
      // Check for duplicate in memory before saving
      const existing = db.getMemoryPropositions(req.user.id);
      const isDuplicate = existing.some(p => {
        const existingMeals = (p.data?.jours || []).flatMap(j => j.repas?.map(r => r.nom) || []).sort().join(',');
        const newMeals = (data?.jours || []).flatMap(j => j.repas?.map(r => r.nom) || []).sort().join(',');
        return existingMeals === newMeals;
      });
      if (isDuplicate) return res.json({ success: true, duplicate: true });
      const prop = db.saveMemoryProposition(req.user.id, duration, mealTypes, budgetMax, totalCost, data);
      return res.json({ success: true, id: prop.id });
    }
    // Check for duplicate in DB: same meal names
    const newMeals = (data?.jours || []).flatMap(j => j.repas?.map(r => r.nom) || []).sort().join(',');
    const dupCheck = await db.query(
      'SELECT id FROM propositions WHERE user_id = $1 AND data::text LIKE $2 LIMIT 1',
      [req.user.id, `%${(data?.jours?.[0]?.repas?.[0]?.nom || '').replace(/'/g, "''")}%`]
    );
    if (dupCheck.rows.length > 0) {
      return res.json({ success: true, duplicate: true });
    }
    const result = await db.query(
      'INSERT INTO propositions (user_id, duration, meal_types, budget_max, total_cost, data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.user.id, duration, JSON.stringify(mealTypes), budgetMax, totalCost, JSON.stringify(data)]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/propositions/:id', auth, async (req, res) => {
  try {
    if (!db.isAvailable()) {
      const success = db.deleteMemoryProposition(req.user.id, req.params.id);
      if (success) return res.json({ success: true });
      return res.status(404).json({ error: 'Non trouvé' });
    }
    const result = await db.query('DELETE FROM propositions WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === CONFIG ROUTES ===
router.get('/config/status', (req, res) => {
  res.json(getStatus());
});

router.get('/config/quota', (req, res) => {
  const { getQuotaStatus } = require('../aiService');
  res.json(getQuotaStatus());
});

router.post('/config/gemini-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'Clé API requise' });
  const status = setApiKey(apiKey);
  res.json(status);
});

router.post('/config/test-gemini', async (req, res) => {
  try {
    const status = getStatus();
    if (status.mode !== 'gemini') {
      return res.json({ success: false, error: 'Aucune clé configurée' });
    }
    // Quick test with a simple prompt
    let result = '';
    await streamMealPlan(
      { duration: '1 repas', mealTypes: ['dejeuner'], budgetMax: null,
        ingredientPrices: [{ name: 'Œuf', price: 25, unit: 'unité' }] },
      (chunk) => { result += chunk; }
    );
    res.json({ success: result.length > 50, mode: 'gemini' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// === VISION & PROMPT ROUTES ===
router.post('/vision/scan', auth, async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ error: 'Image requise' });
    const { scanImageForIngredients } = require('../aiService');
    const result = await scanImageForIngredients(image, mimeType || 'image/jpeg');
    res.json({ ingredients: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ingredients/generate', auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt requis' });
    const { generateIngredientsFromPrompt } = require('../aiService');
    const ingredients = await generateIngredientsFromPrompt(prompt);
    
    if (db.isAvailable()) {
      for (const ing of ingredients) {
        await db.query(
          'INSERT INTO ingredients (name, category, default_price, default_unit) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
          [ing.nom, ing.category || 'Autre', ing.price || 0, ing.unit || 'unité']
        );
      }
    } else {
      // Pour la démo sans DB on ne les sauvegarde pas globalement (trop complexe)
    }
    res.json({ success: true, ingredients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
