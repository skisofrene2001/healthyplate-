import React, { useState, useEffect } from 'react';
import { getIngredients, updateIngredientPrice, addIngredient, updateIngredient, deleteIngredient, isLoggedIn } from '../api';
import { getIngredientImage, CATEGORY_EMOJI } from '../utils/foodImages';

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tous');
  const [changes, setChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [currentIng, setCurrentIng] = useState({ name: '', category: 'Protéines', unit: 'kg', price: 0, image_url: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => { loadIngredients(); }, []);

  const loadIngredients = async () => {
    try {
      const data = await getIngredients();
      setIngredients(data);
    } catch {}
  };

  const categories = ['Tous', ...new Set(ingredients.map(i => i.category))];

  const filtered = ingredients.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Tous' || i.category === category;
    return matchSearch && matchCat;
  });

  const handlePriceChange = (id, value) => {
    setChanges(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!isLoggedIn()) { setMsg('Connectez-vous pour sauvegarder'); return; }
    setSaving(true);
    try {
      for (const [id, price] of Object.entries(changes)) {
        const ing = ingredients.find(i => i.id === Number(id));
        await updateIngredientPrice(id, price, ing?.unit || ing?.default_unit);
      }
      setChanges({});
      setMsg('✅ Prix sauvegardés !');
      loadIngredients();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('❌ Erreur: ' + err.message);
    }
    setSaving(false);
  };

  const handleOpenModal = (mode, ing = null) => {
    if (!isLoggedIn()) { setMsg('Connectez-vous pour ajouter/modifier'); return; }
    setModalMode(mode);
    setImageFile(null);
    setImagePreview('');
    if (mode === 'edit' && ing) {
      setCurrentIng({ id: ing.id, name: ing.name, category: ing.category, unit: ing.unit, price: ing.price, image_url: ing.image_url || '' });
      if (ing.image_url) setImagePreview(ing.image_url);
    } else {
      setCurrentIng({ name: '', category: 'Protéines', unit: 'kg', price: 0, image_url: '' });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...currentIng };
      if (imageFile) {
        data.image = imageFile;
      }
      if (modalMode === 'add') {
        await addIngredient(data);
        setMsg('✅ Ingrédient ajouté');
      } else if (modalMode === 'edit') {
        await updateIngredient(currentIng.id, data);
        setMsg('✅ Ingrédient modifié');
      }
      setModalMode(null);
      loadIngredients();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('❌ Erreur: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet ingrédient ?')) return;
    try {
      await deleteIngredient(id);
      setMsg('✅ Ingrédient supprimé');
      loadIngredients();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('❌ Erreur: ' + err.message);
    }
  };

  return (
    <div className="ingredients-page">
      <div className="ingredients-header-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h1>🏷️ Ingrédients</h1>
          <p className="subtitle" style={{marginBottom:0}}>Gérez votre base d'ingrédients et leurs prix.</p>
        </div>
        <button className="btn-add-ing" onClick={() => handleOpenModal('add')} style={{padding:'8px 16px',borderRadius:8,background:'var(--g5)',color:'#fff',border:'none',fontWeight:600,cursor:'pointer'}}>
          + Ajouter
        </button>
      </div>

      <input className="search-bar" type="text" placeholder="Rechercher un ingrédient..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="category-tabs">
        {categories.map(cat => (
          <button key={cat} className={`cat-tab ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {msg && <p style={{textAlign:'center',padding:12,fontSize:14,fontWeight:600,color: msg.includes('✅') ? '#059669' : '#ef4444'}}>{msg}</p>}

      <div className="ing-grid">
        {filtered.map(ing => (
          <div key={ing.id} className="ing-card" style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.opacity='0.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            <div className="ing-card-top" style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
              <img src={ing.image_url || getIngredientImage(ing.name, ing.category)} alt={ing.name} style={{width:48,height:48,borderRadius:8,objectFit:'cover'}} />
              <div className="ing-info">
                <h4>{ing.name}</h4>
                <span className="ing-cat-badge">{CATEGORY_EMOJI[ing.category] || '🏷️'} {ing.category}</span>
              </div>
            </div>
            <div className="ing-card-actions" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div className="ing-price-input">
                <input
                  type="number" min="0"
                  value={changes[ing.id] !== undefined ? changes[ing.id] : ing.price}
                  onChange={e => handlePriceChange(ing.id, Number(e.target.value))}
                />
                <span className="unit">DA/{ing.unit}</span>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => handleOpenModal('edit', ing)} title="Modifier" style={{background:'transparent',border:'none',cursor:'pointer',fontSize:16}}>✏️</button>
                <button onClick={() => handleDelete(ing.id)} title="Supprimer" style={{background:'transparent',border:'none',cursor:'pointer',fontSize:16}}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(changes).length > 0 && (
        <div className="save-bar">
          <button className="btn-cancel" onClick={() => setChanges({})}>Annuler</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : `Sauvegarder (${Object.keys(changes).length})`}
          </button>
        </div>
      )}

      {modalMode && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setModalMode(null)}>✕</button>
            <h2>{modalMode === 'add' ? 'Ajouter' : 'Modifier'} un ingrédient</h2>
            <form onSubmit={handleSaveModal}>
              <div className="form-field">
                <label>Nom</label>
                <input type="text" value={currentIng.name} onChange={e => setCurrentIng({...currentIng, name: e.target.value})} required />
              </div>
              <div className="form-field">
                <label>Catégorie</label>
                <select value={currentIng.category} onChange={e => setCurrentIng({...currentIng, category: e.target.value})} required style={{width:'100%',padding:'10px 14px',borderRadius:'var(--radx)',border:'2px solid var(--g200)'}}>
                  {Object.keys(CATEGORY_EMOJI).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{display:'flex',gap:12}}>
                <div className="form-field" style={{flex:1}}>
                  <label>Prix</label>
                  <input type="number" value={currentIng.price} onChange={e => setCurrentIng({...currentIng, price: Number(e.target.value)})} required min="0" />
                </div>
                <div className="form-field" style={{flex:1}}>
                  <label>Unité</label>
                  <input type="text" value={currentIng.unit} onChange={e => setCurrentIng({...currentIng, unit: e.target.value})} required placeholder="kg, unité, litre..." />
                </div>
              </div>
              <div className="form-field">
                <label>Image (Optionnel)</label>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{flex:1}} />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" style={{width:48,height:48,borderRadius:8,objectFit:'cover'}} />
                  )}
                </div>
              </div>
              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? '...' : 'Enregistrer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
