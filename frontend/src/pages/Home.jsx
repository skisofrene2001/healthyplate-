import React, { useState, useEffect } from 'react';
import MealCard from '../components/MealCard';
import NutritionChart from '../components/NutritionChart';
import RecipeModal from '../components/RecipeModal';
import { generateProposition, saveProposition, isLoggedIn, regenerateMeal, scanFridgeImage } from '../api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '../i18n';
import { getUiPrefs } from '../utils/uiPrefs';
import { cacheProposition, getCachedPropositions, clearCache } from '../utils/db';
import { getMealImage } from '../utils/foodImages';

const MEAL_TYPES = [
  { id: 'petit-dejeuner', key: 'meal_petit_dejeuner' },
  { id: 'dejeuner', key: 'meal_dejeuner' },
  { id: 'diner', key: 'meal_diner' },
  { id: 'snack', key: 'meal_snack' },
];
const DURATIONS = [
  { id: '1 repas', key: 'dur_1_repas' },
  { id: '1 jour', key: 'dur_1_jour' },
  { id: '3 jours', key: 'dur_3_jours' },
  { id: '5 jours', key: 'dur_5_jours' },
  { id: '1 semaine', key: 'dur_1_semaine' },
  { id: '1 mois', key: 'dur_1_mois' },
];

export default function Home() {
  const { t } = useLanguage();
  const [selectedMeals, setSelectedMeals] = useState(['dejeuner']);
  const [duration, setDuration] = useState('1 jour');
  const [customDays, setCustomDays] = useState('');
  const [hasBudget, setHasBudget] = useState(false);
  const [budget, setBudget] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [preferences, setPreferences] = useState([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [fridgeItems, setFridgeItems] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [recipeModal, setRecipeModal] = useState(null);
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [persons, setPersons] = useState(1);
  const [uiPrefs, setUiPrefs] = useState(getUiPrefs());

  const loadHistory = async () => {
    try {
      const cached = await getCachedPropositions();
      setHistory(cached);
      setShowHistory(true);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  // Reload prefs on focus (if user changed settings in another tab)
  useEffect(() => {
    const reload = () => setUiPrefs(getUiPrefs());
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, []);

  const PREFERENCES_OPTS = [
    { id: 'Végétarien', key: 'pref_veg' }, 
    { id: 'Sans Gluten', key: 'pref_gf' }, 
    { id: 'Prise de masse', key: 'pref_mass' }, 
    { id: 'Perte de poids', key: 'pref_loss' }
  ];
  const REGIONS = [
    { id: 'Méditerranée', key: 'reg_med' }, 
    { id: 'Amérique Latine', key: 'reg_lat' }, 
    { id: 'Asie', key: 'reg_asia' }, 
    { id: 'Moyen-Orient', key: 'reg_mid' }, 
    { id: 'Europe du Nord', key: 'reg_euro' }, 
    { id: 'Afrique', key: 'reg_afr' }
  ];
  const COUNTRIES = [
    { id: 'Algérie', key: 'c_alg' }, 
    { id: 'Italie', key: 'c_ita' }, 
    { id: 'Mexique', key: 'c_mex' }, 
    { id: 'Japon', key: 'c_jap' }, 
    { id: 'Liban', key: 'c_lib' }, 
    { id: 'Maroc', key: 'c_mar' }, 
    { id: 'Grèce', key: 'c_gre' }, 
    { id: 'Espagne', key: 'c_esp' }
  ];

  const togglePreference = (pref) => {
    if (preferences.includes(pref)) {
      setPreferences(preferences.filter(p => p !== pref));
    } else {
      setPreferences([...preferences, pref]);
    }
  };

  const handleExportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Plan de Repas - HealthyPlate', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Nombre de personnes: ${persons}`, 14, 32);
    doc.text(`Coût total estimé: ${Math.round(result.cout_total * persons)} DA`, 14, 40);

    let yPos = 55;

    result.jours?.forEach((jour) => {
      doc.setFontSize(16);
      doc.text(`Jour ${jour.jour}`, 14, yPos);
      yPos += 8;

      jour.repas?.forEach((meal) => {
        doc.setFontSize(14);
        doc.text(`${meal.type.toUpperCase()}: ${meal.nom} (${Math.round(meal.cout * persons)} DA)`, 14, yPos);
        yPos += 6;

        if (meal.ingredients && meal.ingredients.length > 0) {
          const tableData = meal.ingredients.map(ing => [
            ing.nom, 
            `${Number((ing.quantite * persons).toFixed(2))} ${ing.unite}`, 
            `${Math.round((ing.cout_total || (ing.quantite * ing.cout_unitaire)) * persons)} DA`
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Ingrédient', 'Quantité', 'Total']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 10 },
            margin: { left: 14 }
          });
          yPos = doc.lastAutoTable.finalY + 10;
        } else {
          yPos += 10;
        }

        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
      yPos += 5;
    });



    doc.save('healthyplate_plan.pdf');
  };

  const handleSaveToDb = async () => {
    if (!isLoggedIn()) {
      setSaveMsg('❌ Connectez-vous pour sauvegarder');
      return;
    }
    try {
      setSaveMsg('⏳ Sauvegarde...');
      await saveProposition(
        duration === 'custom' ? `${customDays} jours` : duration,
        selectedMeals,
        hasBudget && budget ? Number(budget) : null,
        result.cout_total,
        result
      );
      setSaveMsg('✅ Proposition sauvegardée !');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('❌ Erreur: ' + err.message);
    }
  };

  const toggleMeal = (id) => {
    setSelectedMeals(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleScanImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await scanFridgeImage(reader.result, file.type);
          setFridgeItems(prev => prev ? prev + ', ' + res.ingredients : res.ingredients);
        } catch (err) {
          alert(err.message);
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Erreur de lecture image');
      setIsScanning(false);
    }
  };

  const handleRegenerateMeal = async () => {
    if (!recipeModal) return;
    setIsRegenerating(true);
    setStreamText(''); // Re-use streamText or just show a loading state for the modal
    
    // Determine the current meal location in the result
    let dayIndex = -1;
    let mealIndex = -1;
    if (result && result.jours) {
      for (let dIdx = 0; dIdx < result.jours.length; dIdx++) {
        const mIdx = result.jours[dIdx].repas.findIndex(r => r.nom === recipeModal.nom);
        if (mIdx !== -1) {
          dayIndex = dIdx;
          mealIndex = mIdx;
          break;
        }
      }
    }

    try {
      await regenerateMeal(
        {
          oldMeal: recipeModal,
          budgetMax: hasBudget ? Number(budget) : null,
          preferences,
          fridge: fridgeItems,
          region,
          country,
          persons,
          calorieTarget: uiPrefs.useCalorieTarget ? uiPrefs.calorieTarget : null
        },
        (chunk) => {
          // You could stream into the modal, but to keep it simple, just wait for complete
        },
        (newMeal) => {
          if (dayIndex !== -1 && mealIndex !== -1) {
            setResult(prev => {
              const next = { ...prev };
              next.jours = [...next.jours];
              next.jours[dayIndex] = { ...next.jours[dayIndex] };
              next.jours[dayIndex].repas = [...next.jours[dayIndex].repas];
              
              // Update total cost (1-person basis)
              next.cout_total = next.cout_total - next.jours[dayIndex].repas[mealIndex].cout + newMeal.cout;
              next.jours[dayIndex].repas[mealIndex] = newMeal;
              return next;
            });
          }
          setRecipeModal(newMeal);
          setIsRegenerating(false);
        },
        (errMsg) => {
          alert('Erreur: ' + errMsg);
          setIsRegenerating(false);
        }
      );
    } catch (e) {
      alert('Erreur: ' + e.message);
      setIsRegenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedMeals.length === 0) return;
    setStreaming(true);
    setStreamText('');
    setResult(null);
    setError('');

    const finalDuration = duration === 'custom' ? `${customDays} jours` : duration;
    const finalBudget = hasBudget && budget ? Number(budget) : null;

    try {
      // 1. Check cache first
      const token = localStorage.getItem('hp_token');
      if (token) {
        const cacheRes = await fetch('/api/propositions/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ duration: finalDuration, mealTypes: selectedMeals, budgetMax: finalBudget ? (finalBudget / persons) : null, preferences, fridge: fridgeItems, region, country, persons: 1, calorieTarget: uiPrefs.useCalorieTarget ? uiPrefs.calorieTarget : null })
        });
        const cacheData = await cacheRes.json();
        if (cacheData.found) {
          const parsed = typeof cacheData.data === 'string' ? JSON.parse(cacheData.data) : cacheData.data;
          setResult(parsed);
          setStreaming(false);
          return;
        }
      }
    } catch (e) {
      console.error("Cache error", e);
    }

    // 2. Generate if not cached
    await generateProposition(
      {
        duration: finalDuration,
        mealTypes: selectedMeals,
        budgetMax: finalBudget ? (finalBudget / persons) : null,
        preferences: preferences,
        fridge: fridgeItems,
        region: region,
        country: country,
        persons: 1, // Always target 1 person for AI, then scale in UI
        calorieTarget: uiPrefs.useCalorieTarget ? uiPrefs.calorieTarget : null
      },
      (chunk) => setStreamText(prev => prev + chunk),
      (data) => { 
        setResult(data); 
        setStreaming(false);
        // 3. Cache locally
        if (uiPrefs.enableCaching) {
          cacheProposition(data).catch(console.error);
        }
        // 4. Auto-archive on server
        if (isLoggedIn()) {
          saveProposition(finalDuration, selectedMeals, finalBudget, data.cout_total, data).catch(console.error);
        }
      },
      (errMsg) => { setError(errMsg); setStreaming(false); }
    );
  };

  return (
    <div className="config-section">
      {/* LEFT: Config Panel */}
      <div className="config-panel">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h2 style={{margin:0}}>{t('home_title')}</h2>
          <button onClick={loadHistory} style={{background:'var(--g50)', border:'1px solid var(--g200)', padding:'8px 14px', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6, color:'var(--txt)'}}>🕒 Historique</button>
        </div>

        <div className="field">
          <label>{t('home_meal_types')}</label>
          <div className="chips">
            {MEAL_TYPES.map(mt => (
              <div key={mt.id} className={`chip ${selectedMeals.includes(mt.id) ? 'active' : ''}`} onClick={() => toggleMeal(mt.id)}>
                {t(mt.key)}
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t('home_duration')}</label>
          <div className="duration-grid">
            {DURATIONS.map(d => (
              <button key={d.id} className={`dur-btn ${duration === d.id ? 'active' : ''}`} onClick={() => setDuration(d.id)}>
                {t(d.key)}
              </button>
            ))}
            <button className={`dur-btn ${duration === 'custom' ? 'active' : ''}`} onClick={() => setDuration('custom')}>
              {t('dur_custom')}
            </button>
          </div>
          {duration === 'custom' && (
            <div className="custom-days">
              <input type="number" min="1" max="60" value={customDays} onChange={e => setCustomDays(e.target.value)} placeholder="X" />
              <span style={{color:'#6b7280',fontSize:14}}>jours</span>
            </div>
          )}
        </div>

        {/* PERSONS COUNTER — always visible */}
        <div className="field">
          <label style={{display:'flex', justifyContent:'space-between'}}>
            <span>👥 Nombre de personnes</span>
            <span style={{color:'var(--g5)', fontWeight:700}}>{persons} personne{persons > 1 ? 's' : ''}</span>
          </label>
          <div style={{display:'flex', alignItems:'center', gap:12, marginTop:8}}>
            <button onClick={() => setPersons(p => Math.max(1, p - 1))} style={{width:36, height:36, borderRadius:'50%', border:'2px solid var(--g200)', background:'var(--g50)', cursor:'pointer', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--txt)', flexShrink:0}}>-</button>
            <div style={{flex:1, display:'flex', gap:4}}>
              {[1,2,3,4,5,6].map(n => (
                <button key={n} onClick={() => setPersons(n)} style={{flex:1, padding:'6px 0', borderRadius:8, border: persons === n ? '2px solid var(--g5)' : '2px solid var(--g200)', background: persons === n ? 'var(--g5)' : 'var(--g50)', color: persons === n ? '#fff' : 'var(--muted)', fontWeight:700, cursor:'pointer', fontSize:13, transition:'all .2s'}}>{n}</button>
              ))}
            </div>
            <button onClick={() => setPersons(p => Math.min(20, p + 1))} style={{width:36, height:36, borderRadius:'50%', border:'2px solid var(--g200)', background:'var(--g50)', cursor:'pointer', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--txt)', flexShrink:0}}>+</button>
          </div>
        </div>

        {uiPrefs.showBudget && (
        <div className="field">
          <label>{t('home_budget')}</label>
          <div className="budget-toggle">
            <div className={`toggle ${hasBudget ? 'active' : ''}`} onClick={() => setHasBudget(!hasBudget)} />
            <span style={{fontSize:14,color:'#6b7280'}}>{hasBudget ? t('with_budget') : t('no_budget')}</span>
          </div>
          {hasBudget && (
            <>
              <input className="budget-input" type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Ex: 5000" />
              <div className="budget-suffix">Dinars Algériens (DA)</div>
            </>
          )}
        </div>
        )}

        {uiPrefs.showDiet && (
        <div className="field">
          <label>{t('home_diet')}</label>
          <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:8}}>
            {PREFERENCES_OPTS.map(pref => (
              <div key={pref.id} className={`chip ${preferences.includes(pref.id) ? 'active' : ''}`} style={{fontSize: 12, padding: '4px 10px'}} onClick={() => togglePreference(pref.id)}>
                {t(pref.key)}
              </div>
            ))}
          </div>
        </div>
        )}

        {uiPrefs.showInspiration && (
        <div className="field">
          <label>{t('home_inspiration')}</label>
          <div style={{display:'flex', gap:8, marginTop:8}}>
            <select value={region} onChange={e => {setRegion(e.target.value); setCountry('');}} style={{flex:1, padding:8, borderRadius:8, border:'1px solid var(--g200)', background:'#fff', fontSize:13}}>
              <option value="">{t('region_all')}</option>
              {REGIONS.map(r => <option key={r.id} value={r.id}>{t(r.key)}</option>)}
            </select>
            <select value={country} onChange={e => {setCountry(e.target.value); setRegion('');}} style={{flex:1, padding:8, borderRadius:8, border:'1px solid var(--g200)', background:'#fff', fontSize:13}}>
              <option value="">{t('country_all')}</option>
              {COUNTRIES.map(c => <option key={c.id} value={c.id}>{t(c.key)}</option>)}
            </select>
          </div>
        </div>
        )}

        {uiPrefs.showAntiGaspi && (
        <div className="field">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <label>{t('home_antigaspi')}</label>
          {uiPrefs.showScanImage && (
            <label style={{cursor: isScanning ? 'not-allowed' : 'pointer', background:'var(--g50)', color:'var(--g6)', padding:'4px 10px', borderRadius:8, fontSize:12, fontWeight:700, border:'1px solid var(--g100)'}}>
              {isScanning ? t('home_scanning') : t('home_scan')}
              <input type="file" accept="image/*" onChange={handleScanImage} disabled={isScanning} style={{display:'none'}} />
            </label>
          )}
          </div>
          <textarea 
            value={fridgeItems} 
            onChange={e => setFridgeItems(e.target.value)} 
            placeholder="Ex: 3 œufs, une courgette, reste de poulet..." 
            style={{width:'100%', padding:10, borderRadius:8, border:'1px solid var(--g200)', background:'#fff', minHeight:60, marginTop:8, fontSize:13}}
          />
          <span style={{fontSize:12, color:'var(--muted)'}}>L'IA construira les repas autour de ces ingrédients !</span>
        </div>
        )}

        <button className="btn-generate" onClick={handleGenerate} disabled={streaming || selectedMeals.length === 0}>
          {streaming ? t('home_generating') : t('home_generate')}
        </button>
      </div>

      {/* RIGHT: Results */}
      <div className="results-panel">
        {streaming && (
          <div className="streaming-box">
            <div style={{fontSize:32}}>🤖</div>
            <h3 style={{margin:'8px 0',fontSize:16,fontWeight:700}}>L'IA prépare votre plan...</h3>
            <div className="streaming-dots"><span/><span/><span/></div>
            {streamText && <div className="streaming-text">{streamText.slice(-500)}</div>}
          </div>
        )}

        {error && (
          <div className="streaming-box" style={{borderColor:'#fca5a5'}}>
            <div style={{fontSize:32}}>❌</div>
            <h3 style={{margin:'8px 0',fontSize:16,color:'#ef4444'}}>Erreur</h3>
            <p style={{fontSize:14,color:'#6b7280'}}>{error}</p>
          </div>
        )}

        {!streaming && !result && !error && (
          <div className="empty-state">
            <div className="empty-icon">🥗</div>
            <h3>Prêt à manger sain ?</h3>
            <p>Configurez vos préférences et laissez l'IA vous proposer des repas sains et abordables.</p>
          </div>
        )}

        {result && (
          <div>
            <div className="proposal-header" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'24px', borderRadius:'16px', marginBottom:'24px'}}>
              <div style={{flex:1}}>
                <h2 style={{margin:0, fontSize:'24px'}}>📋 Votre plan de repas</h2>
                <div className="proposal-stats" style={{marginTop:16, display:'flex', gap:24}}>
                  <div className="stat" style={{display:'flex', flexDirection:'column'}}>
                    <span className="stat-value" style={{fontSize:'20px', fontWeight:800}}>{Math.round(result.cout_total * persons)} DA</span>
                    <span className="stat-label" style={{fontSize:'12px', opacity:0.8}}>Coût total</span>
                  </div>
                  <div className="stat" style={{display:'flex', flexDirection:'column'}}>
                    <span className="stat-value" style={{fontSize:'20px', fontWeight:800}}>{result.jours?.length || 0}</span>
                    <span className="stat-label" style={{fontSize:'12px', opacity:0.8}}>Jours</span>
                  </div>
                  <div className="stat" style={{display:'flex', flexDirection:'column'}}>
                    <span className="stat-value" style={{fontSize:'20px', fontWeight:800}}>{result.jours?.reduce((s, j) => s + (j.repas?.length || 0), 0) || 0}</span>
                    <span className="stat-label" style={{fontSize:'12px', opacity:0.8}}>Repas</span>
                  </div>
                </div>
                <div style={{display:'flex', gap:12, marginTop:20}}>
                  <button onClick={handleExportPDF} style={{padding:'10px 20px', borderRadius:12, background:'linear-gradient(135deg, var(--g5), var(--g6))', color:'#fff', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8, border:'none', boxShadow:'0 4px 12px rgba(16, 185, 129, 0.3)', transition:'transform 0.2s, box-shadow 0.2s'}} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    📄 Exporter PDF
                  </button>
                  <button onClick={() => setShowShoppingList(true)} style={{padding:'10px 20px', borderRadius:12, background:'var(--g50)', border:'1px solid var(--g200)', color:'var(--txt)', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'background 0.2s'}} onMouseOver={e => e.currentTarget.style.background = 'var(--g100)'} onMouseOut={e => e.currentTarget.style.background = 'var(--g50)'}>
                    🛒 Liste de courses
                  </button>
                </div>
              </div>

              <div className="persons-stepper" style={{padding:'14px 18px', borderRadius:20, border:'1px solid var(--g200)', display:'flex', flexDirection:'column', alignItems:'center', gap:10, backdropFilter:'blur(10px)'}}>
                <span style={{fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px', opacity:0.8}}>Personnes</span>
                <div style={{display:'flex', alignItems:'center', gap:18}}>
                  <button 
                    onClick={() => setPersons(Math.max(1, persons - 1))}
                    style={{width:34, height:34, borderRadius:'50%', border:'2px solid currentColor', background:'transparent', color:'inherit', fontWeight:900, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s'}}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >-</button>
                  <span style={{fontSize:28, fontWeight:900, minWidth:35, textAlign:'center', textShadow:'0 2px 4px rgba(0,0,0,0.2)'}}>{persons}</span>
                  <button 
                    onClick={() => setPersons(persons + 1)}
                    style={{width:34, height:34, borderRadius:'50%', border:'2px solid currentColor', background:'transparent', color:'inherit', fontWeight:900, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s'}}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >+</button>
                </div>
              </div>
            </div>
            {uiPrefs.showCalories && <NutritionChart result={result} />}

            {result.jours?.map((jour, ji) => (
              <div key={ji} className="day-section" style={{animationDelay: `${ji * 0.1}s`}}>
                <div className="day-title">📅 Jour {jour.jour}</div>
                <div className="meals-grid">
                  {jour.repas?.map((meal, mi) => (
                    <MealCard key={mi} meal={{...meal, cout: Math.round(meal.cout * persons), calories: meal.calories ? Math.round(meal.calories * persons) : null, proteines: meal.proteines ? Math.round(meal.proteines * persons) : null}} onClick={() => setRecipeModal(meal)} showCalories={uiPrefs.showCalories} />
                  ))}
                </div>
              </div>
            ))}


          </div>
        )}
      </div>



      {/* MODAL FOR SHOPPING LIST */}
      {showShoppingList && result && (
        <div className="modal-overlay" onClick={() => setShowShoppingList(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 600}}>
            <button className="close-btn" onClick={() => setShowShoppingList(false)}>✕</button>
            <h2 style={{marginBottom:16}}>🛒 Votre Liste de Courses</h2>
            <div style={{maxHeight: '60vh', overflowY: 'auto'}}>
              {(() => {
                const list = {};
                result.jours?.forEach(j => j.repas?.forEach(r => r.ingredients?.forEach(i => {
                  const key = `${i.nom}|${i.unite}`;
                  if (!list[key]) list[key] = { nom: i.nom, unite: i.unite, quantite: 0, cout_total: 0 };
                  list[key].quantite += Number(i.quantite || 0) * persons;
                  list[key].cout_total += Number(i.cout_total || 0) * persons;
                })));
                const items = Object.values(list);
                if (items.length === 0) return <p>Aucun ingrédient trouvé.</p>;

                const handleWhatsApp = () => {
                  const lines = items.map(it => `- ${it.nom} : ${Number(it.quantite.toFixed(2))} ${it.unite} (~${Math.round(it.cout_total)} DA)`);
                  const text = `🛒 *Ma liste HealthyPlate* 🛒\n\n${lines.join('\n')}\n\n*Total estimé pour ${persons} pers:* ${Math.round(result.cout_total * persons)} DA`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                };

                return (
                  <div>
                    <table className="ingredients-table">
                      <thead>
                        <tr><th>Ingrédient</th><th>Quantité totale</th><th>Coût estimé</th></tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td>{it.nom}</td>
                            <td style={{fontWeight:600}}>{Number(it.quantite.toFixed(2))} {it.unite}</td>
                            <td style={{color:'var(--g6)'}}>{Math.round(it.cout_total)} DA</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{marginTop: 16, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <button onClick={handleWhatsApp} style={{background:'#25D366', color:'#fff', padding:'8px 16px', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer'}}>
                        📱 Envoyer sur WhatsApp
                      </button>
                      <span style={{fontWeight: 'bold', fontSize: 18}}>Total estimé : {Math.round(result.cout_total * persons)} DA</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <RecipeModal 
        recipeModal={recipeModal} 
        setRecipeModal={setRecipeModal} 
        persons={persons} 
        uiPrefs={uiPrefs} 
        handleRegenerateMeal={handleRegenerateMeal} 
        isRegenerating={isRegenerating} 
      />
      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 500}}>
            <button className="close-btn" onClick={() => setShowHistory(false)}>✕</button>
            <h2 style={{marginBottom:16}}>🕒 Historique local</h2>
            <div style={{maxHeight: '60vh', overflowY: 'auto', display:'flex', flexDirection:'column', gap:10}}>
              {history.length === 0 ? (
                <p style={{textAlign:'center', color:'var(--muted)', padding:'20px 0'}}>Aucun plan enregistré dans le cache.</p>
              ) : (
                history.map((h, i) => (
                  <div 
                    key={i} 
                    onClick={() => { setResult(h); setShowHistory(false); }}
                    style={{padding:16, background:'var(--g50)', borderRadius:14, border:'1px solid var(--g100)', cursor:'pointer', transition:'all .2s'}}
                  >
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
                      <span style={{fontWeight:800, fontSize:15}}>{h.jours?.length} jours — {h.cout_total} DA</span>
                      <span style={{fontSize:11, color:'var(--muted)'}}>{new Date(h.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div style={{fontSize:12, color:'var(--muted)', opacity:0.8}}>
                      {h.jours?.[0]?.repas?.[0]?.nom}...
                    </div>
                  </div>
                ))
              )}
            </div>
            {history.length > 0 && (
              <button 
                onClick={async () => { if(window.confirm('Effacer tout l\'historique local ?')) { await clearCache(); setShowHistory(false); } }}
                style={{marginTop:16, width:'100%', background:'transparent', color:'#ef4444', border:'1px solid #ef4444', padding:'10px', borderRadius:12, fontWeight:700, cursor:'pointer'}}
              >
                🗑️ Effacer l'historique
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

