import React, { useState, useEffect } from 'react';

const STYLES = [
  { id: 'instagram', name: 'Instagram', emoji: '📸', desc: 'Dark minimal' },
  { id: 'cyberpunk', name: 'Cyberpunk', emoji: '🤖', desc: 'Néon & futur' },
  { id: 'aurora', name: 'Aurora', emoji: '🌌', desc: 'Violet & cosmos' },
  { id: 'lava', name: 'Lava', emoji: '🌋', desc: 'Volcanique & chaud' },
  // --- Thèmes Clairs ---
  { id: 'fresh', name: 'Fresh', emoji: '🌿', desc: 'Vert & naturel' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', desc: 'Bleu & apaisant' },
  { id: 'sunset', name: 'Sunset', emoji: '🌅', desc: 'Rose & chaleureux' },
  { id: 'paper', name: 'Paper', emoji: '📰', desc: 'Minimaliste & propre' },
];

export function getStoredStyle() {
  return localStorage.getItem('hp_style') || 'instagram';
}

export function applyStyle(styleId) {
  document.body.setAttribute('data-style', styleId);
  localStorage.setItem('hp_style', styleId);
}

export default function StyleSwitcher() {
  const [current, setCurrent] = useState(getStoredStyle());

  useEffect(() => { applyStyle(current); }, [current]);

  return (
    <div className="style-switcher">
      <h3>🎨 Style de l'interface</h3>
      <div className="style-grid">
        {STYLES.map(s => (
          <button
            key={s.id}
            className={`style-card ${current === s.id ? 'active' : ''}`}
            data-style-preview={s.id}
            onClick={() => { setCurrent(s.id); applyStyle(s.id); }}
          >
            <span className="style-emoji">{s.emoji}</span>
            <span className="style-name">{s.name}</span>
            <span className="style-desc">{s.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
