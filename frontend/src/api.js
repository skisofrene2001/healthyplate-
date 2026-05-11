const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('hp_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function fetchWithMultipart(data) {
  const token = localStorage.getItem('hp_token');
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) formData.append(key, value);
  }
  const res = await fetch(`${API_BASE}/ingredients`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erreur lors de l\'ajout');
  return json;
}

async function fetchPutMultipart(id, data) {
  const token = localStorage.getItem('hp_token');
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) formData.append(key, value);
  }
  const res = await fetch(`${API_BASE}/ingredients/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erreur lors de la modification');
  return json;
}

// Auth
export async function register(name, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  localStorage.setItem('hp_token', data.token);
  localStorage.setItem('hp_user', JSON.stringify(data.user));
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  localStorage.setItem('hp_token', data.token);
  localStorage.setItem('hp_user', JSON.stringify(data.user));
  return data;
}

export async function googleLogin(credential) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  localStorage.setItem('hp_token', data.token);
  localStorage.setItem('hp_user', JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  localStorage.removeItem('hp_token');
  localStorage.removeItem('hp_user');
}

export function getUser() {
  const u = localStorage.getItem('hp_user');
  return u ? JSON.parse(u) : null;
}

export function isLoggedIn() {
  return !!localStorage.getItem('hp_token');
}

// Ingredients
export async function getIngredients() {
  const res = await fetch(`${API_BASE}/ingredients`, { headers: getHeaders() });
  return res.json();
}

export async function updateIngredientPrice(id, price, unit) {
  const res = await fetch(`${API_BASE}/ingredients/${id}/price`, {
    method: 'PUT', headers: getHeaders(),
    body: JSON.stringify({ price, unit }),
  });
  return res.json();
}

export async function addIngredient(ingredient) {
  return fetchWithMultipart(ingredient);
}

export async function updateIngredient(id, ingredient) {
  return fetchPutMultipart(id, ingredient);
}

export async function deleteIngredient(id) {
  const res = await fetch(`${API_BASE}/ingredients/${id}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
  return data;
}

export async function bulkUpdatePrices(prices) {
  const res = await fetch(`${API_BASE}/ingredients/bulk-prices`, {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ prices }),
  });
  return res.json();
}

// Propositions - streaming
export async function generateProposition(config, onChunk, onComplete, onError) {
  try {
    const res = await fetch(`${API_BASE}/propositions/generate`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      let msg = `Erreur serveur (${res.status})`;
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        msg = json.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            return;
          }
          try {
            const event = JSON.parse(payload);
            if (event.type === 'chunk') onChunk(event.text);
            else if (event.type === 'complete') onComplete(event.data);
            else if (event.type === 'raw') onChunk(event.text);
            else if (event.type === 'error') onError(event.message);
          } catch {}
        }
      }
    }
  } catch (err) {
    onError(err.message);
  }
}

export async function regenerateMeal(config, onChunk, onComplete, onError) {
  try {
    const res = await fetch(`${API_BASE}/propositions/regenerate-meal`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      let msg = `Erreur serveur (${res.status})`;
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        msg = json.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            return;
          }
          try {
            const event = JSON.parse(payload);
            if (event.type === 'chunk') onChunk(event.text);
            else if (event.type === 'complete') onComplete(event.data);
            else if (event.type === 'raw') onChunk(event.text);
            else if (event.type === 'error') onError(event.message);
          } catch {}
        }
      }
    }
  } catch (err) {
    onError(err.message);
  }
}

// Proposition history
export async function getPropositions() {
  const res = await fetch(`${API_BASE}/propositions`, { headers: getHeaders() });
  return res.json();
}

export async function getProposition(id) {
  const res = await fetch(`${API_BASE}/propositions/${id}`, { headers: getHeaders() });
  return res.json();
}

export async function saveProposition(duration, mealTypes, budgetMax, totalCost, data) {
  const res = await fetch(`${API_BASE}/propositions`, {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ duration, mealTypes, budgetMax, totalCost, data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erreur de sauvegarde');
  return json;
}

// Config
export async function getConfigStatus() {
  const res = await fetch(`${API_BASE}/config/status`);
  return res.json();
}

export async function getQuotaStatus() {
  const res = await fetch(`${API_BASE}/config/quota`);
  return res.json();
}

export async function setGeminiKey(apiKey) {
  const res = await fetch(`${API_BASE}/config/gemini-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return res.json();
}

export async function testGemini() {
  const res = await fetch(`${API_BASE}/config/test-gemini`, { method: 'POST' });
  return res.json();
}

export async function scanFridgeImage(imageStr, mimeType) {
  const res = await fetch(`${API_BASE}/vision/scan`, {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ image: imageStr, mimeType })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur lors du scan');
  return data;
}

export async function generateIngredientsAI(prompt) {
  const res = await fetch(`${API_BASE}/ingredients/generate`, {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur lors de la génération');
  return data;
}
