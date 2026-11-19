import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {Catalogo} from './components/Catalogo.tsx';
import {Stock} from './components/Stock.tsx';
import {ToqueAyuda} from './components/ToqueAyuda.tsx';
import './index.css';

// /catalogo[/<rutina>] es una página pública independiente del ERP (no usa el panel ni la sesión de admin)
const esCatalogo = /^\/catalogo(\/|$)/.test(window.location.pathname);

const esStock = /^\/stock\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {esCatalogo ? <Catalogo /> : esStock ? <Stock /> : <App />}
    <ToqueAyuda />
  </StrictMode>,
);
