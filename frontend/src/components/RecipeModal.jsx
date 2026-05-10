import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { getMealImage } from '../utils/foodImages';

export default function RecipeModal({ recipeModal, setRecipeModal, persons, uiPrefs, handleRegenerateMeal, isRegenerating }) {
  const modalRef = useRef(null);

  const handleExportImage = async () => {
    if (!modalRef.current) return;
    try {
      // Pour éviter le CORS sur Unsplash via html2canvas, on utilise useCORS: true
      const canvas = await html2canvas(modalRef.current, { useCORS: true, backgroundColor: '#ffffff', scale: 2 });
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      a.download = `healthyplate_${recipeModal.nom.replace(/\s+/g, '_').toLowerCase()}.png`;
      a.click();
    } catch (err) {
      console.error('Erreur lors de l\'exportation de l\'image', err);
      alert("L'exportation de l'image a échoué. Assurez-vous d'avoir une bonne connexion.");
    }
  };

  if (!recipeModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setRecipeModal(null)} style={{zIndex: 100}}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 620, padding: 0, overflow: 'hidden'}} ref={modalRef}>
        <div style={{position: 'relative', height: 200, width: '100%'}}>
          <img 
            src={getMealImage(recipeModal.nom, recipeModal.type)} 
            alt={recipeModal.nom} 
            crossOrigin="anonymous"
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
          <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7))'}} />
          {/* Hide buttons during html2canvas render by moving them outside of the ref or keeping them simple, html2canvas handles it ok but we can hide close button */}
          <button className="close-btn" data-html2canvas-ignore onClick={() => setRecipeModal(null)} style={{background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', position: 'absolute', top: 12, right: 12, zIndex: 10}}>✕</button>
          <div style={{position: 'absolute', bottom: 20, left: 24, right: 24}}>
            <div style={{display:'flex', gap:8, alignItems:'center', marginBottom: 8}}>
              <span className={`meal-type-badge ${recipeModal.type}`}>{recipeModal.type}</span>
              {uiPrefs.showCalories && (recipeModal.calories !== undefined) && (
                <span style={{fontSize:13, color:'#fff', fontWeight:700, background:'rgba(16,185,129,0.8)', padding:'2px 8px', borderRadius:6, backdropFilter:'blur(4px)'}}>
                  🔥 {Math.round((recipeModal.calories || 0) * persons)} kcal
                </span>
              )}
              {uiPrefs.showCalories && (recipeModal.proteines !== undefined) && (
                <span style={{fontSize:13, color:'#fff', fontWeight:700, background:'rgba(0,0,0,0.5)', padding:'2px 8px', borderRadius:6, backdropFilter:'blur(4px)'}}>
                  🍗 {Math.round((recipeModal.proteines || 0) * persons)}g Prot.
                </span>
              )}
            </div>
            <h2 style={{margin:0, textAlign:'left', color: '#fff', fontSize: 28, textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{recipeModal.nom}</h2>
          </div>
        </div>

        <div style={{padding: 24}}>
          <p style={{color:'var(--muted)', fontSize:15, marginBottom:24, lineHeight:1.6, fontStyle:'italic'}}>{recipeModal.description}</p>

          {recipeModal.ingredients && recipeModal.ingredients.length > 0 && (
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12}}>
                📦 Ingrédients
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                {recipeModal.ingredients.map((ing, i) => (
                  <span key={i} style={{background:'var(--g50)', color:'var(--g6)', padding:'6px 12px', borderRadius:20, fontSize:13, fontWeight:600, border:'1px solid var(--g100)'}}>
                    {Number((ing.quantite * persons).toFixed(2))} {ing.unite} {ing.nom}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12}}>
              📋 Préparation
            </div>
            {[
              `Rassemblez tous vos ingrédients et préparez votre plan de travail.`,
              recipeModal.description ? `${recipeModal.description.split('.')[0]}.` : `Préparez les ingrédients selon les quantités indiquées.`,
              `Faites cuire à feu moyen en respectant les temps de cuisson recommandés.`,
              `Assaisonnez selon vos goûts et servez chaud.`,
            ].map((step, i) => (
              <div key={i} style={{display:'flex', gap:14, marginBottom:16, alignItems:'flex-start'}}>
                <div style={{minWidth:28, height:28, background:'linear-gradient(135deg, var(--g5), var(--g6))', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800, flexShrink:0}}>
                  {i + 1}
                </div>
                <p style={{margin:0, fontSize:14, lineHeight:1.6, color:'var(--txt)', paddingTop:4}}>{step}</p>
              </div>
            ))}
          </div>

          <div style={{display: 'flex', gap: 12, marginTop:20}} data-html2canvas-ignore>
            <div style={{flex: 1, padding:'14px 18px', background:'var(--g50)', borderRadius:12, border:'1px solid var(--g100)'}}>
              <div style={{fontWeight:800, fontSize:18, color:'var(--g6)'}}>💰 {Math.round(recipeModal.cout * persons)} DA</div>
              <div style={{fontSize:12, color:'var(--muted)', marginTop:2}}>Coût estimé pour {persons} personne{persons > 1 ? 's' : ''}</div>
            </div>
            <button 
              onClick={handleRegenerateMeal}
              disabled={isRegenerating}
              style={{
                padding: '14px 18px', 
                background: isRegenerating ? 'var(--g200)' : 'linear-gradient(135deg, var(--g5), var(--g6))',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 15,
                cursor: isRegenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isRegenerating ? 'none' : '0 4px 15px var(--g100)'
              }}
            >
              {isRegenerating ? '⏳ IA...' : '🎲 Changer'}
            </button>
            <button 
              onClick={handleExportImage}
              style={{
                padding: '14px 18px', 
                background: '#fff',
                color: 'var(--g6)',
                border: '2px solid var(--g200)',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              📸 Partager
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
