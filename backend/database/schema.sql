-- HealthyPlate Database Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    default_unit VARCHAR(30) NOT NULL,
    default_price NUMERIC(10,2) DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_ingredient_prices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS propositions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    duration VARCHAR(50) NOT NULL,
    meal_types JSONB NOT NULL DEFAULT '[]',
    budget_max NUMERIC(10,2),
    total_cost NUMERIC(10,2),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_props_user ON propositions(user_id);
CREATE INDEX idx_prices_user ON user_ingredient_prices(user_id);
