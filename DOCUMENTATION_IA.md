# 🧠 HealthyPlate - Documentation de Contexte pour l'IA

Ce fichier a été créé spécifiquement pour donner du contexte immédiat à toute future IA qui travaillerait sur ce projet. Il résume l'architecture, l'état actuel et les choix de conception (UI/UX) pour éviter de perdre du temps et des tokens à ré-analyser la base de code.

## 1. Description du Projet
**HealthyPlate** est un générateur de plans de repas sains et économiques propulsé par l'IA (Google Gemini). 
Il permet aux utilisateurs de :
- Gérer une liste d'ingrédients (CRUD complet) avec des prix en Dinars Algériens (DA).
- Générer des plans de repas sur plusieurs jours en fonction de leurs préférences (Petit-déj, Déjeuner, etc.) et de leur budget maximum.
- Visualiser les repas sous forme de grille interactive.
- Exporter les plans en PDF ou les archiver en base de données.

## 2. Stack Technique
- **Frontend** : React.js (via Vite), Vanilla CSS (`index.css`), requêtes API natives (`fetch`).
- **Backend** : Node.js, Express, `jsonwebtoken` (Auth).
- **Base de Données** : PostgreSQL (via `pg`). *NB: Un mécanisme de secours (Memory Fallback) est en place dans `db.js` si Postgres n'est pas lancé.*
- **IA** : Intégration de Google Gemini pour la génération intelligente et structurée des repas.

## 3. Architecture des Données (PostgreSQL)
Le fichier d'initialisation principal est `backend/database/init.js` et le schéma est dans `schema.sql`.
- `users` : id, name, email, password_hash
- `ingredients` : id, name, category, default_unit, default_price, **image_url** (Ajout récent pour personnaliser les photos).
- `user_ingredient_prices` : Permet aux utilisateurs de surcharger les prix par défaut des ingrédients.
- `propositions` : id, user_id, duration, meal_types, budget, total_cost, payload (JSON du plan), created_at.

## 4. Choix de Design & UI/UX (IMPORTANT)
L'esthétique de l'application est primordiale et doit toujours rester moderne, sombre ("Dark mode" par défaut) et fluide.
- **Grille "Instagram Explore"** : Les plans de repas générés (`Home.jsx`) sont affichés via le composant `MealCard.jsx` dans une grille dense de 3 colonnes (similaire à l'onglet *Explore* d'Instagram).
  - Les images sont strictement carrées (`aspect-ratio: 1/1`), collées (gap très fin).
  - Au survol (`hover`), un voile sombre (`.explore-overlay`) affiche le nom et le coût.
  - Au clic, une fenêtre modale (`modal-overlay`) s'ouvre au centre pour afficher la recette détaillée et les ingrédients exacts du plat.
- **Gestion des images (`foodImages.js`)** : Pour éviter d'appeler des API externes complexes, les images des plats sont mappées par mots-clés (ex: "césar", "poulet") vers des IDs Unsplash spécifiques (format long: `photo-xxxxxx`). 
  - *Note à l'IA*: Utilisez TOUJOURS le format complet Unsplash (`photo-1234...`) car les IDs courts de type base64 cassent l'URL `images.unsplash.com`.

## 5. Endpoints API Principaux (`backend/src/routes/api.js`)
- `POST /auth/register` & `POST /auth/login` : Retourne un token JWT.
- `GET /ingredients` : Retourne les ingrédients (en fusionnant les prix personnalisés de l'utilisateur avec les prix par défaut).
- `POST /ingredients` & `PUT /ingredients/:id` : Ajout/Modification, inclut désormais la gestion du champ optionnel `image_url`.
- `POST /generate` : Endpoint de streaming (Server-Sent Events) qui interroge Gemini et retourne un JSON partiel formaté.
- `POST /propositions` : Archive un plan de repas.

## 6. Problèmes Récemment Résolus & Pièges à Éviter
- **Erreur de port EADDRINUSE (3001)** : Le serveur backend a souvent du mal à se couper sur Windows. L'utilisateur doit forcer l'arrêt via PowerShell : `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force`
- **Erreur DB ECONNREFUSED** : L'utilisateur n'a pas toujours PostgreSQL d'allumé. Le fichier `backend/src/db.js` s'en rend compte et passe en mode "Fallback Mémoire" avec des faux ingrédients en dur. *Attention : les images ajoutées dans les ingrédients en mode mémoire disparaissent au redémarrage du backend.*
- **Images cassées** : Les identifiants Unsplash doivent obligatoirement commencer par `photo-`.

## 7. Fonctionnalités Futures Envisagées
- Favoris : Permettre de "liker" un repas généré pour le retrouver plus tard.
- Moteur de Recherche Instagram-like : Ajouter une page "Explorer" globale où l'on voit toutes les propositions publiques.

---
**Pour l'IA qui lit ce fichier** : Ton point de départ en cas de bug frontend est souvent `Home.jsx` (Génération/Affichage) ou `Ingredients.jsx` (Gestion base). Pour le backend, tout passe par `api.js` et `ai.js` (Prompt Gemini). Respecte toujours le style visuel décrit dans le point 4 !
