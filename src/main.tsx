import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {Catalogo} from './components/Catalogo.tsx';
import {Consultas} from './components/Consultas.tsx';
import './index.css';

// /catalogo[/<rutina>] es una página pública independiente del ERP (no usa el panel ni la sesión de admin)
const esCatalogo = /^\/catalogo(\/|$)/.test(window.location.pathname);
const esConsultas = /^\/consultas\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {esCatalogo ? <Catalogo /> : esConsultas ? <Consultas /> : <App />}
  </StrictMode>,
);
