import React, { useState, useEffect } from 'react';
import { getConfigStatus, setGeminiKey, testGemini } from '../api';
import StyleSwitcher from '../components/StyleSwitcher';
import { getUiPrefs, saveUiPrefs } from '../utils/uiPrefs';

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [uiPrefs, setUiPrefs] = useState(getUiPrefs());

  const handleUiPref = (key, val) => {
    const next = { ...uiPrefs, [key]: val !== undefined ? val : !uiPrefs[key] };
    setUiPrefs(next);
    saveUiPrefs(next);
  };

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try { setStatus(await getConfigStatus()); } catch {}
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true); setMsg('');
    try {
      const result = await setGeminiKey(apiKey.trim());
      setStatus(result);
      setMsg(result.configured ? '✅ Clé API sauvegardée avec succès !' : '❌ Clé invalide');
      if (result.configured) setApiKey('');
    } catch (err) {
      setMsg('❌ Erreur: ' + err.message);
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true); setMsg('');
    try {
      const result = await testGemini();
      setMsg(result.success ? '✅ Connexion Gemini réussie ! L\'IA est active.' : '❌ Test échoué: ' + (result.error || 'Erreur inconnue'));
    } catch (err) {
      setMsg('❌ Erreur: ' + err.message);
    }
    setTesting(false);
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const result = await setGeminiKey('');
      setStatus(result);
      setMsg('🔄 Clé supprimée — mode démo activé');
    } catch {}
    setSaving(false);
  };

  return (
    <div className="settings-page">
      <h1>⚙️ Configuration</h1>
      <p className="subtitle">Configurez votre connexion à l'IA Gemini pour des propositions personnalisées.</p>

      {/* Style Switcher */}
      <div className="settings-card">
        <StyleSwitcher />
      </div>

      {/* UI Preferences */}
      <div className="settings-card">
        <h3 style={{marginBottom:16}}>🎛️ Sections visibles sur l'accueil</h3>
        <p className="settings-desc" style={{marginBottom:16}}>Choisissez quelles options afficher ou masquer sur la page principale.</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          {[
            { key:'showBudget',      label:'💰 Budget' },
            { key:'showScanImage',   label:'📷 Scanner une image' },
            { key:'showAntiGaspi',   label:'🥦 Anti-Gaspi / Frigo' },
            { key:'showInspiration', label:'🌍 Inspiration Culinaire' },
            { key:'showDiet',        label:'🥗 Préférences diététiques' },
            { key:'showCalories',    label:'🔥 Apport calorique' },
          ].map(({ key, label }) => (
            <label key={key} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--g50)', borderRadius:10, cursor:'pointer', border: uiPrefs[key] ? '2px solid var(--g5)' : '2px solid var(--g200)', transition:'all .2s'}}>
              <div
                onClick={() => handleUiPref(key)}
                style={{width:40, height:22, borderRadius:11, background: uiPrefs[key] ? 'var(--g5)' : 'var(--g200)', position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0}}
              >
                <div style={{position:'absolute', top:3, left: uiPrefs[key] ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.2)'}} />
              </div>
              <span style={{fontSize:13, fontWeight:600, color: uiPrefs[key] ? 'var(--txt)' : 'var(--muted)'}}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Nutrition Goals */}
      <div className="settings-card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <h3 style={{margin:0}}>🥗 Objectifs Nutritionnels</h3>
          <div
            onClick={() => handleUiPref('useCalorieTarget')}
            style={{width:44, height:24, borderRadius:12, background: uiPrefs.useCalorieTarget ? 'var(--g5)' : 'var(--g200)', position:'relative', cursor:'pointer', transition:'background .2s'}}
          >
            <div style={{position:'absolute', top:3, left: uiPrefs.useCalorieTarget ? 23 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s'}} />
          </div>
        </div>
        <p className="settings-desc">Définissez vos cibles quotidiennes pour que l'IA adapte ses propositions.</p>
        
        {uiPrefs.useCalorieTarget && (
          <div style={{marginTop:16, padding:'16px', background:'var(--g50)', borderRadius:12, border:'1px solid var(--g100)'}}>
            <label style={{fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase'}}>Cible Calorique Quotidienne (kcal)</label>
            <div style={{display:'flex', alignItems:'center', gap:10, marginTop:8}}>
              <input 
                type="number" 
                value={uiPrefs.calorieTarget} 
                onChange={e => handleUiPref('calorieTarget', Number(e.target.value))}
                style={{flex:1, padding:'12px 14px', borderRadius:10, border:'2px solid var(--g200)', background:'#fff', fontSize:16, fontWeight:700, color:'var(--txt)'}}
              />
              <span style={{fontWeight:800, color:'var(--g5)'}}>KCAL / JOUR</span>
            </div>
            <p style={{fontSize:11, color:'var(--muted)', marginTop:8}}>L'IA répartira ce total sur vos repas (Petit-déjeuner, Déjeuner, Dîner).</p>
          </div>
        )}
      </div>

      {/* Performance & Cache */}
      <div className="settings-card">
        <h3>🚀 Performance & Cache</h3>
        <p className="settings-desc">Optimisez la fluidité de l'application et l'accès hors-ligne.</p>
        <label style={{display:'flex', alignItems:'center', gap:12, marginTop:16, padding:'12px 16px', background:'var(--g50)', borderRadius:12, cursor:'pointer', border: uiPrefs.enableCaching ? '2px solid var(--g5)' : '2px solid var(--g200)'}}>
          <input 
            type="checkbox" 
            checked={uiPrefs.enableCaching} 
            onChange={e => handleUiPref('enableCaching', e.target.checked)}
            style={{width:20, height:20}}
          />
          <div>
            <div style={{fontWeight:700, fontSize:14}}>Activer le cache intelligent (IndexedDB)</div>
            <div style={{fontSize:12, color:'var(--muted)'}}>Accélérez l'affichage des anciens plans et réduisez la consommation de données.</div>
          </div>
        </label>
      </div>

      {/* Status Card */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3>🤖 Statut de l'IA</h3>
          <span className={`status-badge ${status?.mode === 'gemini' ? 'online' : 'demo'}`}>
            {status?.mode === 'gemini' ? '🟢 Gemini Actif' : '🟡 Mode Démo'}
          </span>
        </div>
        <p className="settings-desc">
          {status?.mode === 'gemini'
            ? `Connecté à Google Gemini. Clé: ${status.keyPreview}`
            : 'L\'app utilise des recettes intégrées. Ajoutez une clé Gemini pour des propositions IA personnalisées et illimitées.'}
        </p>
      </div>

      {/* API Key Input */}
      <div className="settings-card">
        <h3>🔑 Clé API Gemini</h3>
        <p className="settings-desc">
          Obtenez une clé gratuite sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> — 
          aucune carte bancaire requise, 15 requêtes/min.
        </p>

        <div className="key-input-group">
          <input
            type="password"
            className="key-input"
            placeholder="Collez votre clé API ici..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
          <button className="btn-key-save" onClick={handleSave} disabled={saving || !apiKey.trim()}>
            {saving ? '...' : '💾 Sauvegarder'}
          </button>
        </div>

        {msg && <p className={`settings-msg ${msg.includes('✅') ? 'success' : msg.includes('🔄') ? 'info' : 'error'}`}>{msg}</p>}

        <div className="key-actions">
          {status?.configured && (
            <>
              <button className="btn-test" onClick={handleTest} disabled={testing}>
                {testing ? '⏳ Test en cours...' : '🧪 Tester la connexion'}
              </button>
              <button className="btn-remove" onClick={handleRemove}>
                🗑️ Supprimer la clé
              </button>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="settings-card instructions">
        <h3>📖 Comment obtenir une clé gratuite</h3>
        <ol className="steps-list">
          <li>
            <span className="step-num">1</span>
            <div>
              <strong>Accédez à Google AI Studio</strong>
              <p>Allez sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></p>
            </div>
          </li>
          <li>
            <span className="step-num">2</span>
            <div>
              <strong>Connectez-vous avec Google</strong>
              <p>Utilisez votre compte Gmail</p>
            </div>
          </li>
          <li>
            <span className="step-num">3</span>
            <div>
              <strong>Créez une clé API</strong>
              <p>Cliquez "Create API Key" → copiez la clé</p>
            </div>
          </li>
          <li>
            <span className="step-num">4</span>
            <div>
              <strong>Collez-la ici</strong>
              <p>Sauvegardez et testez — c'est tout !</p>
            </div>
          </li>
        </ol>
      </div>

      {/* Comparison */}
      <div className="settings-card">
        <h3>📊 Démo vs Gemini</h3>
        <table className="compare-table">
          <thead>
            <tr><th>Fonctionnalité</th><th>Mode Démo</th><th>Gemini IA</th></tr>
          </thead>
          <tbody>
            <tr><td>Variété des plats</td><td>~25 recettes</td><td className="highlight">♾️ Illimité</td></tr>
            <tr><td>Personnalisation</td><td>Basique</td><td className="highlight">Avancée</td></tr>
            <tr><td>Respect du budget</td><td>Proportionnel</td><td className="highlight">Intelligent</td></tr>
            <tr><td>Conseils nutrition</td><td>Génériques</td><td className="highlight">Personnalisés</td></tr>
            <tr><td>Coût</td><td className="highlight">Gratuit</td><td className="highlight">Gratuit</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
