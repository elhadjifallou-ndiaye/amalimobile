import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// IAP uniquement dans l'app native Capacitor, pas dans le navigateur web
if ((window as any).Capacitor?.isNativePlatform?.()) {
  import('./iap').then(({ initIAP }) => initIAP());
}

const path = window.location.pathname.replace(/\/$/, '') || '/';
const isAdminRoute = path === '/admin' || path.startsWith('/admin/');

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (isAdminRoute) {
  import('./admin/AdminApp')
    .then(({ default: AdminApp }) => {
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <AdminApp />
          </ErrorBoundary>
        </React.StrictMode>,
      );
    })
    .catch((err) => {
      console.error('❌ Erreur chargement AdminApp:', err);
      root.render(
        <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#ef4444' }}>
          <h2>Erreur Admin</h2>
          <pre style={{ fontSize: 12 }}>{String(err)}</pre>
        </div>
      );
    });
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
