import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Truck, 
  LogOut, 
  ArrowLeft, 
  Share2, 
  Check, 
  Camera
} from 'lucide-react';
import { StoreSettings, AdminUser } from '../types';
import { getBrandLogo } from '../utils/formatters';
import { LogoUploadModal } from './LogoUploadModal';
import { ShareFormModal } from './ShareFormModal';

interface NavbarProps {
  currentView: 'cliente' | 'admin';
  isAdminAuthenticated: boolean;
  adminUser?: AdminUser | null;
  onNavigateToClient: () => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  pendingCount: number;
  totalOrdersCount?: number;
  storeSettings: StoreSettings;
  onUpdateStoreSettings?: (newSettings: StoreSettings) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  isAdminAuthenticated,
  adminUser,
  onNavigateToClient,
  onNavigateToAdmin,
  onLogout,
  isDark,
  setIsDark,
  pendingCount,
  totalOrdersCount,
  storeSettings,
  onUpdateStoreSettings,
}) => {
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const brandLogo = getBrandLogo(isDark, storeSettings);

  const isClientView = currentView === 'cliente';

  return (
    <header className={`${
      isClientView ? 'relative z-20' : 'sticky top-0 z-30'
    } transition-colors duration-200 border-b ${
      isDark 
        ? 'border-white/10 bg-[#141419]/95 text-white' 
        : 'border-zinc-200/80 bg-white/95 text-zinc-950'
    } backdrop-blur-md shadow-2xs`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Left: Brand / System Label & Logo */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div 
              className="flex items-center cursor-pointer select-none py-0" 
              onClick={isClientView ? onNavigateToClient : onNavigateToAdmin}
              title={isClientView ? "AMORE SALON - Formulario de Envíos" : "AMORE SALON - Panel Administrativo"}
            >
              {brandLogo ? (
                <div className="relative flex items-center h-12 sm:h-14 overflow-hidden">
                  <img
                    src={brandLogo}
                    alt={storeSettings.storeName || 'AMORE SALON'}
                    className="h-14 sm:h-16 w-auto max-w-[230px] sm:max-w-[300px] object-cover scale-y-[1.18] scale-x-[1.05] p-0 m-0 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-600 flex items-center justify-center font-black">
                    <Truck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="font-black text-sm tracking-tight uppercase text-zinc-950 dark:text-white">AMORE SALON</span>
                </div>
              )}
            </div>

            <div className={`hidden sm:flex items-center gap-2 pl-3 border-l ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
              <span className="font-mono-meta text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-zinc-700 dark:text-zinc-300 font-extrabold">
                {currentView === 'admin' ? 'TABLERO DE DESPACHOS' : 'FORMULARIO DE ENVÍOS'}
              </span>
              {currentView === 'admin' && isAdminAuthenticated && (
                <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  {totalOrdersCount ?? pendingCount} pedidos
                </span>
              )}
              {currentView === 'cliente' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                  /pedidos
                </span>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* If Admin is logged in, show View Client Form button, status badge, Logo button, Share Link button, and Logout */}
            {currentView === 'admin' && isAdminAuthenticated && (
              <>
                {/* Botón Ver Formulario Cliente (/pedidos) */}
                <button
                  id="navbar-view-client-form-btn"
                  onClick={onNavigateToClient}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    isDark
                      ? 'border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800'
                  }`}
                  title="Ver Formulario de Clientes (/pedidos)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-blue-500" />
                  <span>Ver Formulario</span>
                </button>

                {/* Botón Espacio para Logo de la Marca */}
                <button
                  id="navbar-edit-logo-btn"
                  onClick={() => setShowLogoModal(true)}
                  className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    isDark
                      ? 'border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-white'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900'
                  }`}
                  title="Configurar logo de la empresa y datos del remitente"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-500" />
                  <span>Logo</span>
                </button>

                <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold shadow-2xs ${
                  isDark
                    ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-950'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-[11px] font-bold truncate max-w-[140px] sm:max-w-[200px]" title={adminUser?.email || 'Administrador'}>
                    {adminUser?.email ? adminUser.email.split('@')[0] : 'ADMIN'}
                  </span>
                  {adminUser?.role === 'superadmin' && (
                    <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      SUPER
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-blue-600 text-white" title={`${pendingCount} pedidos nuevos pendientes`}>
                      {pendingCount}
                    </span>
                  )}
                </div>

                <button
                  id="admin-logout-btn"
                  onClick={onLogout}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                    isDark
                      ? 'bg-zinc-900/80 hover:bg-red-950/40 text-zinc-300 hover:text-red-400 border-white/10 hover:border-red-500/30'
                      : 'bg-white hover:bg-red-50 text-zinc-800 hover:text-red-700 border-zinc-200 hover:border-red-300'
                  }`}
                  title={`Cerrar Sesión (${adminUser?.email || 'Admin'})`}
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Salir</span>
                </button>
              </>
            )}

            {/* If in Client view, offer button to go to Admin Panel */}
            {currentView === 'cliente' && (
              <button
                id="header-goto-admin-btn"
                onClick={onNavigateToAdmin}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                  isDark
                    ? 'border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900'
                }`}
                title="Acceso al Tablero Administrativo"
              >
                <span>Panel Admin</span>
              </button>
            )}

            {/* If on Admin login screen, offer button back to public client form */}
            {currentView === 'admin' && !isAdminAuthenticated && (
              <button
                id="back-to-client-header-btn"
                onClick={onNavigateToClient}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                  isDark
                    ? 'border-white/10 bg-zinc-900 hover:bg-zinc-800 text-white'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900'
                }`}
                title="Ir al Formulario de Envíos (/pedidos)"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Formulario (/pedidos)</span>
              </button>
            )}

            {/* Share Form Button (Visible in both Client and Admin views, right next to Theme Switcher) */}
            <button
              id="navbar-share-form-btn"
              type="button"
              onClick={() => setShowShareModal(true)}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'bg-zinc-900/90 hover:bg-zinc-800 border-white/10 text-white hover:border-blue-500/40'
                  : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900 hover:border-blue-500/40'
              }`}
              title="Compartir / Copiar enlace del formulario de envíos"
              aria-label="Compartir formulario"
            >
              <Share2 className="w-4 h-4 text-blue-500 stroke-[2.2]" />
            </button>

            {/* Dark / Light Mode Switcher */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border transition-all duration-150 cursor-pointer shadow-2xs ${
                isDark
                  ? 'border-white/10 bg-zinc-900 hover:bg-zinc-800 text-amber-400'
                  : 'border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800'
              }`}
              title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label="Cambiar tema"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-800" />}
            </button>
          </div>

        </div>
      </div>

      {/* Modal para Compartir Formulario */}
      <ShareFormModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        storeSettings={storeSettings}
        isDark={isDark}
      />

      {/* Modal para configurar Logo y Marca */}
      {onUpdateStoreSettings && (
        <LogoUploadModal
          isOpen={showLogoModal}
          onClose={() => setShowLogoModal(false)}
          storeSettings={storeSettings}
          onUpdateStoreSettings={onUpdateStoreSettings}
          isDark={isDark}
        />
      )}
    </header>
  );
};
