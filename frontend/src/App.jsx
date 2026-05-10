import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Ingredients from './pages/Ingredients';
import Archives from './pages/Archives';
import Settings from './pages/Settings';
import { getStoredStyle, applyStyle } from './components/StyleSwitcher';
import { logout, getUser, isLoggedIn, getQuotaStatus, googleLogin } from './api';
import { LanguageProvider, useLanguage } from './i18n';
import { GoogleLogin } from '@react-oauth/google';

function AuthModal({ onClose, onAuth }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:400}}>
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2 style={{marginBottom: 4, textAlign: 'center'}}>👋 Connexion</h2>
        <p className="modal-sub" style={{textAlign: 'center', marginBottom: 24}}>Connectez-vous avec Google pour accéder à votre plan personnalisé</p>

        <div style={{display: 'flex', justifyContent: 'center', marginBottom: 16}}>
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                setLoading(true);
                await googleLogin(credentialResponse.credential);
                onAuth();
                onClose();
              } catch (err) {
                setError(err.message || 'Erreur Google Login');
              } finally {
                setLoading(false);
              }
            }}
            onError={() => {
              setError('La connexion Google a échoué. Vérifiez que http://localhost:5173 est autorisé dans Google Cloud Console.');
            }}
            shape="pill"
            theme="outline"
            text="continue_with"
            width="300"
          />
        </div>

        {error && <p className="error-msg" style={{textAlign:'center',fontSize:13}}>{error}</p>}

        <hr style={{margin:'20px 0',border:'none',borderTop:'1px solid var(--g100)'}} />
        <p style={{textAlign:'center',fontSize:12,color:'var(--muted)'}}>
          ⚠️ Si Google ne fonctionne pas en local, vous pouvez utiliser le mode démo :
        </p>
        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            try {
              await googleLogin('demo-token-123');
              onAuth();
              onClose();
            } catch (err) {
              setError(err.message);
            }
            setLoading(false);
          }}
          style={{marginTop:8,width:'100%',background:'var(--g50)',color:'var(--g6)',border:'1px dashed var(--g200)',padding:10,borderRadius:12,cursor:'pointer',fontSize:13,fontWeight:600}}
        >
          🧪 Mode Démo (sans Google)
        </button>
      </div>
    </div>
  );
}

function MainApp() {
  const [user, setUser] = useState(getUser());
  const [showAuth, setShowAuth] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const [quota, setQuota] = useState(null);

  useEffect(() => { 
    applyStyle(getStoredStyle());
    
    // Poll quota every 3 seconds
    const fetchQuota = async () => {
      try {
        const q = await getQuotaStatus();
        setQuota(q);
      } catch (err) {}
    };
    fetchQuota();
    const interval = setInterval(fetchQuota, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); setUser(null); };
  const handleAuth = () => setUser(getUser());

  return (
    <BrowserRouter>
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo">
            <span className="logo-icon">🥗</span>
            <span className="logo-text">HealthyPlate</span>
          </NavLink>
          <nav className="nav">
            {quota && (
              <div style={{display:'flex', alignItems:'center', gap: 10, padding: '6px 14px', background:'var(--g50)', borderRadius: 20, border:'1px solid var(--g100)', marginRight: 16}}>
                <span style={{fontSize: 13, fontWeight: 700, color: quota.percent > 80 ? '#ef4444' : 'var(--g6)'}}>
                  🤖 IA Quota : {quota.used} / {quota.limit}
                </span>
                <div style={{width: 80, height: 6, background:'var(--g200)', borderRadius: 3, overflow:'hidden'}}>
                  <div style={{height:'100%', width:`${quota.percent}%`, background: quota.percent > 80 ? '#ef4444' : 'linear-gradient(90deg, var(--g5), var(--g6))', transition:'width 0.4s ease, background 0.4s ease'}} />
                </div>
              </div>
            )}
            <select value={lang} onChange={e => setLang(e.target.value)} style={{background:'transparent', color:'var(--txt)', border:'1px solid var(--g200)', borderRadius:8, padding:'4px 8px', marginRight:12, cursor:'pointer'}}>
              <option value="fr">🇫🇷 FR</option>
              <option value="en">🇬🇧 EN</option>
              <option value="ar">🇩🇿 AR</option>
            </select>
            <NavLink to="/" className={({isActive}) => isActive ? 'active' : ''}>{t('nav_home')}</NavLink>
            <NavLink to="/ingredients" className={({isActive}) => isActive ? 'active' : ''}>{t('nav_ingredients')}</NavLink>
            <NavLink to="/archives" className={({isActive}) => isActive ? 'active' : ''}>{t('nav_archives')}</NavLink>
            <NavLink to="/settings" className={({isActive}) => isActive ? 'active' : ''}>{t('nav_settings')}</NavLink>
            {user ? (
              <>
                <span className="user-badge">👤 {user.name}</span>
                <button onClick={handleLogout}>{t('nav_logout')}</button>
              </>
            ) : (
              <button className="btn-auth" onClick={() => setShowAuth(true)}>{t('nav_login')}</button>
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/archives" element={<Archives />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} />}
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
