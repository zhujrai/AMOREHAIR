import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {Catalogo} from './components/Catalogo.tsx';
import {Cotizaciones} from './components/Cotizaciones.tsx';
import './index.css';

// /catalogo[/<rutina>] es una página pública independiente del ERP (no usa el panel ni la sesión de admin)
const esCatalogo = /^\/catalogo(\/|$)/.test(window.location.pathname);
// /cotizaciones (y el antiguo /consultas): bandeja de cotizaciones del catálogo, solo administradores
const esCotizaciones = /^\/(cotizaciones|consultas)\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {esCatalogo ? <Catalogo /> : esCotizaciones ? <Cotizaciones /> : <App />}
  </StrictMode>,
);
