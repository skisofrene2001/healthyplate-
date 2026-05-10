import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

// ID Client Google (mettre le vrai pour la prod)
const GOOGLE_CLIENT_ID = '515406147791-11e503qt6e61lq1bphbk2hlo37c4gogo.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
