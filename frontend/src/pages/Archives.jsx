import React, { useState, useEffect } from 'react';
import MealCard from '../components/MealCard';
import { isLoggedIn } from '../api';

export default function Archives() {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState(null);
  const [activeMeal, setActiveMeal] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    if (!isLoggedIn()) {
      setError('Connectez-vous pour voir vos archives');
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('hp_token');
      const res = await fetch('/api/propositions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setArchives(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur de chargement');
    }
    setLoading(false);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce plan ?')) return;
    try {
      const token = localStorage.getItem('hp_token');
      const res = await fetch(`/api/propositions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setArchives(archives.filter(a => a.id !== id));
        if (activePlan?.id === id) setActivePlan(null);
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const handleOpenPlan = (plan) => {
    // data is stored as json string or object depending on db setup, let's parse if needed
    let parsedData = plan.data;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch(e) {}
    }
    setActivePlan({ ...plan, parsedData });
  };

  return (
    <div style={{maxWidth: 1200, margin: '0 auto'}}>
      <div style={{marginBottom: 24}}>
        <h1 style={{fontSize: 28, fontWeight: 800}}>📂 Vos Archives</h1>
        <p style={{color: 'var(--muted)'}}>Retrouvez ici tous les plans de repas que vous avez générés.</p>
      </div>

      {error && <p style={{color: '#ef4444'}}>{error}</p>}

      {!activePlan ? (
        <div className="ing-grid">
          {loading ? <p>Chargement...</p> : archives.length === 0 ? <p>Aucune archive trouvée.</p> : null}
          {archives.map(a => (
            <div key={a.id} className="ing-card" onClick={() => handleOpenPlan(a)} style={{cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: 8, position: 'relative'}}>
              <button 
                onClick={(e) => handleDelete(e, a.id)} 
                style={{position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#ef4444', fontSize: 16, cursor: 'pointer', padding: 4, borderRadius: 4}}
                title="Supprimer l'archive"
              >
                🗑️
              </button>
              <h3 style={{fontSize: 18, fontWeight: 700}}>Plan pour {a.duration}</h3>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 6}}>
                {typeof a.meal_types === 'string' 
                  ? JSON.parse(a.meal_types).map(m => <span key={m} className="meal-type-badge" style={{background: '#e5e7eb', color: '#374151'}}>{m}</span>)
                  : (a.meal_types || []).map(m => <span key={m} className="meal-type-badge" style={{background: '#e5e7eb', color: '#374151'}}>{m}</span>)
                }
              </div>
              <div style={{marginTop: 8, fontSize: 14, color: 'var(--muted)'}}>
                <span>💰 Budget: {a.budget_max ? a.budget_max + ' DA' : 'Sans limite'}</span>
                <br/>
                <span style={{fontWeight: 700, color: 'var(--g6)'}}>Coût total estimé: {a.total_cost} DA</span>
                <br/>
                <span>📅 {new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setActivePlan(null)} style={{background: 'none', border: 'none', color: 'var(--g5)', fontWeight: 600, cursor: 'pointer', marginBottom: 16, fontSize: 15}}>
            ← Retour aux archives
          </button>
          
          <div className="proposal-header">
            <h2>📋 Plan archivé ({activePlan.duration})</h2>
            <div className="proposal-stats">
              <div className="stat">
                <span className="stat-value">{activePlan.total_cost} DA</span>
                <span className="stat-label">Coût total</span>
              </div>
              <div className="stat">
                <span className="stat-value">{activePlan.parsedData?.jours?.length || 0}</span>
                <span className="stat-label">Jours</span>
              </div>
            </div>
          </div>

          {activePlan.parsedData?.jours?.map((jour, ji) => (
            <div key={ji} className="day-section" style={{animationDelay: `${ji * 0.1}s`}}>
              <div className="day-title">📅 Jour {jour.jour}</div>
              <div className="meals-grid">
                {jour.repas?.map((meal, mi) => (
                  <MealCard key={mi} meal={meal} onClick={setActiveMeal} />
                ))}
              </div>
            </div>
          ))}


        </div>
      )}

      {/* MODAL FOR MEAL DETAILS */}
      {activeMeal && (
        <div className="modal-overlay" onClick={() => setActiveMeal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 500}}>
            <button className="close-btn" onClick={() => setActiveMeal(null)}>✕</button>
            <h2 style={{marginBottom:8}}>{activeMeal.nom}</h2>
            <div style={{display:'flex', gap:12, marginBottom:16}}>
              <span className="meal-type-badge">{activeMeal.type}</span>
              <span className="meal-cost" style={{fontWeight:'bold'}}>{activeMeal.cout} DA</span>
            </div>
            {activeMeal.description && <p style={{color:'#6b7280', marginBottom:16}}>{activeMeal.description}</p>}
            
            <h3 style={{fontSize:15, marginBottom:12}}>Ingrédients</h3>
            {activeMeal.ingredients && activeMeal.ingredients.length > 0 ? (
              <table className="ingredients-table">
                <thead>
                  <tr><th>Ingrédient</th><th>Qté</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {activeMeal.ingredients.map((ing, i) => (
                    <tr key={i}>
                      <td>{ing.nom}</td>
                      <td>{ing.quantite} {ing.unite}</td>
                      <td style={{fontWeight:600}}>{ing.cout_total || (ing.quantite * ing.cout_unitaire)} DA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Aucun ingrédient détaillé.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
