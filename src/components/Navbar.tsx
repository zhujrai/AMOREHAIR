import React, { useEffect, useRef, useState } from 'react';
import {
  Sun,
  Moon,
  Truck,
  LogOut,
  ArrowLeft,
  Share2,
  Check,
  Camera,
  Boxes,
  MessageSquareText,
  PackageCheck,
  BookOpen,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';
import { StoreSettings, AdminUser } from '../types';
import { getBrandLogo } from '../utils/formatters';
import { LogoUploadModal } from './LogoUploadModal';
import { ShareFormModal } from './ShareFormModal';

export type SeccionPanel = 'pedidos' | 'cotizaciones';

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
  /** Cotizaciones nuevas del catálogo sin atender (contador del selector) */
  cotizacionesNuevas?: number;
  rolPersonal?: 'admin' | 'asesor';
  /** Presentaciones con stock en 0 (aviso en el enlace Stock) */
  stockAgotados?: number;
  /** Presentaciones con 1 a 3 unidades (por agotarse) */
  stockPoco?: number;
  /** Tablero visible dentro del panel */
  seccion?: SeccionPanel;
  onCambiarSeccion?: (s: SeccionPanel) => void;
}

/** Botón de icono con ayuda breve (tooltip) */
const IconBtn: React.FC<{
  tip: string;
  onClick?: () => void;
  href?: string;
  isDark: boolean;
  activo?: boolean;
  badge?: number;
  badgeClase?: string;
  alinear?: 'der' | 'izq';
  id?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ tip, onClick, href, isDark, activo, badge = 0, badgeClase = 'bg-[#A8634F]', alinear, id, className = '', children }) => {
  const base = `relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors cursor-pointer ${alinear === 'der' ? 'tip-der' : alinear === 'izq' ? 'tip-izq' : ''} ${
    activo
      ? 'border-[#A8634F] bg-[#A8634F] text-white'
      : isDark
        ? 'border-white/10 bg-[#2A1E1A] text-zinc-200 hover:bg-zinc-800'
        : 'border-[#EADCD3] bg-white text-[#1F1613] hover:bg-[#FBF4F0]'
  } ${className}`;
  const contenido = (
    <>
      {children}
      {badge > 0 && (
        <span className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-white ${badgeClase}`}>{badge}</span>
      )}
    </>
  );
  return href ? (
    <a id={id} href={href} data-tip={tip} aria-label={tip} className={base}>{contenido}</a>
  ) : (
    <button id={id} type="button" onClick={onClick} data-tip={tip} aria-label={tip} className={base}>{contenido}</button>
  );
};

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
  cotizacionesNuevas = 0,
  rolPersonal = 'asesor',
  stockAgotados = 0,
  stockPoco = 0,
  seccion = 'pedidos',
  onCambiarSeccion,
}) => {
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [copiado, setCopiado] = useState<'catalogo' | 'clientes' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const brandLogo = getBrandLogo(isDark, storeSettings);
  const isClientView = currentView === 'cliente';
  const enAdmin = currentView === 'admin' && isAdminAuthenticated;

  // El menú del usuario se cierra al tocar fuera o con Esc
  useEffect(() => {
    if (!menuAbierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('touchstart', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('touchstart', fuera); document.removeEventListener('keydown', tecla); };
  }, [menuAbierto]);

  const copiarEnlace = async (tipo: 'catalogo' | 'clientes') => {
    const texto = tipo === 'catalogo'
      ? `Arma tu rutina aquí: ${window.location.origin}/catalogo`
      : `Registra los datos de entrega aquí: ${window.location.origin}/pedidos`;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const t = document.createElement('textarea');
      t.value = texto;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
    }
    setCopiado(tipo);
    window.setTimeout(() => setCopiado(null), 1800);
  };

  const iniciales = ((adminUser?.email || 'A').split('@')[0].slice(0, 2) || 'A').toUpperCase();
  const itemMenu = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold cursor-pointer ${isDark ? 'text-zinc-200 hover:bg-white/10' : 'text-[#1F1613] hover:bg-[#FBF4F0]'}`;

  // Selector Pedidos | Cotizaciones (cada uno con su contador)
  const selector = (
    <div role="tablist" aria-label="Tablero" className={`inline-flex items-center gap-0.5 rounded-xl border p-0.5 ${isDark ? 'border-white/10 bg-[#2A1E1A]' : 'border-[#EADCD3] bg-[#FBF4F0]'}`}>
      {([
        { id: 'cotizaciones' as const, texto: 'Cotizaciones', paso: '1', icono: <MessageSquareText className="h-4 w-4" />, n: cotizacionesNuevas, ayuda: 'Paso 1: las consultas del catálogo se negocian aquí hasta confirmar el pedido' },
        { id: 'pedidos' as const, texto: 'Pedidos', paso: '2', icono: <PackageCheck className="h-4 w-4" />, n: pendingCount, ayuda: 'Paso 2: pedidos confirmados, abono, empaque y despacho' },
      ]).map((s) => (
        <button
          key={s.id}
          id={`seccion-${s.id}-btn`}
          role="tab"
          aria-selected={seccion === s.id}
          type="button"
          onClick={() => onCambiarSeccion?.(s.id)}
          title={s.ayuda}
          className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-extrabold transition-colors cursor-pointer ${
            seccion === s.id
              ? 'bg-[#A8634F] text-white shadow-sm'
              : isDark ? 'text-zinc-300 hover:bg-white/10' : 'text-[#6B5A55] hover:bg-white'
          }`}
        >
          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${seccion === s.id ? 'bg-white text-[#A8634F]' : isDark ? 'bg-white/15 text-zinc-200' : 'bg-[#EADCD3] text-[#6B5A55]'}`} aria-hidden="true">{s.paso}</span>
          <span>{s.texto}</span>
          {s.n > 0 && (
            <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black ${seccion === s.id ? 'bg-white text-[#A8634F]' : 'bg-[#A8634F] text-white'}`} title={s.id === 'cotizaciones' ? 'Por atender' : 'Por despachar'}>{s.n}</span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <header className={`${
      isClientView ? 'relative z-20' : 'sticky top-0 z-30'
    } transition-colors duration-200 border-b ${
      isDark
        ? 'border-white/10 bg-[#161419]/95 text-white'
        : 'border-[#EADCD3] bg-white/95 text-[#1F1613]'
    } backdrop-blur-md shadow-2xs`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-14 sm:h-16">

          {/* Marca y, en escritorio, el selector de tableros */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
            <div
              className="flex items-center cursor-pointer select-none py-0 min-w-0"
              onClick={isClientView ? onNavigateToClient : onNavigateToAdmin}
              title={isClientView ? 'AMORE SALON - Formulario de Envíos' : 'AMORE SALON - Panel Administrativo'}
            >
              {brandLogo ? (
                <div className="relative flex items-center h-11 sm:h-14 overflow-hidden">
                  <img
                    src={brandLogo}
                    alt={storeSettings.storeName || 'AMORE SALON'}
                    className="h-12 sm:h-16 w-auto max-w-[150px] sm:max-w-[260px] object-cover scale-y-[1.18] scale-x-[1.05] p-0 m-0 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#A8634F]/10 text-[#A8634F] flex items-center justify-center font-black">
                    <Truck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="font-black text-sm tracking-tight uppercase text-[#1F1613] dark:text-white">AMORE SALON</span>
                </div>
              )}
            </div>

            {enAdmin && <div className="hidden md:block">{selector}</div>}
            {isClientView && (
              <span className="hidden sm:inline font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#6B5A55] dark:text-zinc-300 font-extrabold pl-3 border-l border-[#EADCD3] dark:border-white/10">
                Formulario de envíos
              </span>
            )}
          </div>

          {/* Controles de la derecha: solo iconos, con ayuda al pasar el cursor */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {enAdmin && (
              <>
                <IconBtn id="navbar-catalogo-copy-btn" isDark={isDark} tip={copiado === 'catalogo' ? '¡Enlace copiado!' : 'Copiar enlace del catálogo'} onClick={() => copiarEnlace('catalogo')} activo={copiado === 'catalogo'} className="hidden sm:inline-flex">
                  {copiado === 'catalogo' ? <Check className="h-4 w-4" /> : <BookOpen className="h-4 w-4 text-[#A8634F]" />}
                </IconBtn>
                <IconBtn id="navbar-clientes-copy-btn" isDark={isDark} tip={copiado === 'clientes' ? '¡Enlace copiado!' : 'Copiar enlace del formulario de clientes'} onClick={() => copiarEnlace('clientes')} activo={copiado === 'clientes'} className="hidden sm:inline-flex">
                  {copiado === 'clientes' ? <Check className="h-4 w-4" /> : <ClipboardList className="h-4 w-4 text-[#A8634F]" />}
                </IconBtn>
                <IconBtn id="navbar-stock-btn" isDark={isDark} href="/stock" tip={stockAgotados + stockPoco > 0 ? `Stock: ${stockAgotados} agotados, ${stockPoco} por agotarse` : 'Stock de productos'} badge={stockAgotados + stockPoco} badgeClase={stockAgotados > 0 ? 'bg-[#D9534F]' : 'bg-[#E0A12B]'}>
                  <Boxes className="h-4 w-4 text-[#A8634F]" />
                </IconBtn>
              </>
            )}

            {currentView === 'cliente' && (
              <button
                id="header-goto-admin-btn"
                onClick={onNavigateToAdmin}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                  isDark
                    ? 'border-white/10 bg-[#A8634F] hover:bg-[#8E4F3E] text-zinc-300 hover:text-white'
                    : 'border-[#EADCD3] bg-white hover:bg-zinc-50 text-zinc-700 hover:text-[#1F1613]'
                }`}
                title="Acceso al Tablero Administrativo"
              >
                <span>Panel Admin</span>
              </button>
            )}

            {currentView === 'admin' && !isAdminAuthenticated && (
              <button
                id="back-to-client-header-btn"
                onClick={onNavigateToClient}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                  isDark
                    ? 'border-white/10 bg-[#A8634F] hover:bg-[#8E4F3E] text-white'
                    : 'border-[#EADCD3] bg-white hover:bg-zinc-50 text-[#1F1613]'
                }`}
                title="Ir al Formulario de Envíos (/pedidos)"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Form pedidos</span>
              </button>
            )}

            {/* Compartir (en el panel vive dentro del menú de usuario en móvil) */}
            <IconBtn id="navbar-share-form-btn" isDark={isDark} tip="Compartir el formulario de envíos" onClick={() => setShowShareModal(true)} className={enAdmin ? 'hidden md:inline-flex' : ''} alinear="der">
              <Share2 className="h-4 w-4 text-blue-500" />
            </IconBtn>

            <IconBtn id="theme-toggle-btn" isDark={isDark} tip={isDark ? 'Modo claro' : 'Modo oscuro'} onClick={() => setIsDark(!isDark)} alinear={enAdmin ? undefined : 'der'}>
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </IconBtn>

            {/* Usuario: iniciales y menú (rol, logo, formulario, salir) */}
            {enAdmin && (
              <div className="relative" ref={menuRef}>
                <button
                  id="navbar-user-btn"
                  type="button"
                  onClick={() => setMenuAbierto((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuAbierto}
                  aria-label="Menú de usuario"
                  data-tip={menuAbierto ? undefined : `${adminUser?.email || 'Cuenta'} · ${rolPersonal === 'admin' ? 'Administrador' : 'Asesor'}`}
                  className="tip-der relative flex h-9 w-9 items-center justify-center rounded-full bg-[#A8634F] text-[11px] font-black text-white cursor-pointer hover:bg-[#8E4F3E] transition-colors"
                >
                  {iniciales}
                </button>
                {menuAbierto && (
                  <div role="menu" className={`absolute right-0 top-11 z-50 w-64 rounded-xl border p-1.5 shadow-xl ${isDark ? 'border-white/15 bg-[#1B191E]' : 'border-[#EADCD3] bg-white'}`}>
                    <div className="px-3 py-2">
                      <p className="truncate text-[13px] font-bold" title={adminUser?.email}>{adminUser?.email || 'Administrador'}</p>
                      <span className="mt-1 inline-block rounded-full bg-[#F6E8E1] px-2 py-0.5 text-[10px] font-black uppercase text-[#8E4F3E]">{rolPersonal === 'admin' ? 'Administrador' : 'Asesor de ventas'}</span>
                    </div>
                    <div className={`my-1 h-px ${isDark ? 'bg-white/10' : 'bg-[#EADCD3]'}`} />
                    <button type="button" role="menuitem" className={`${itemMenu} sm:hidden`} onClick={() => { setMenuAbierto(false); copiarEnlace('catalogo'); }}>
                      <BookOpen className="h-4 w-4 text-[#A8634F]" /> Copiar enlace del catálogo
                    </button>
                    <button type="button" role="menuitem" className={`${itemMenu} sm:hidden`} onClick={() => { setMenuAbierto(false); copiarEnlace('clientes'); }}>
                      <ClipboardList className="h-4 w-4 text-[#A8634F]" /> Copiar enlace de clientes
                    </button>
                    <button type="button" role="menuitem" className={`${itemMenu} md:hidden`} onClick={() => { setMenuAbierto(false); setShowShareModal(true); }}>
                      <Share2 className="h-4 w-4 text-blue-500" /> Compartir formulario
                    </button>
                    <button type="button" role="menuitem" className={itemMenu} onClick={() => { setMenuAbierto(false); onNavigateToClient(); }}>
                      <ExternalLink className="h-4 w-4 text-[#A8634F]" /> Ver formulario de clientes
                    </button>
                    <button id="navbar-edit-logo-btn" type="button" role="menuitem" className={itemMenu} onClick={() => { setMenuAbierto(false); setShowLogoModal(true); }}>
                      <Camera className="h-4 w-4 text-[#A8634F]" /> Logo y datos del remitente
                    </button>
                    <div className={`my-1 h-px ${isDark ? 'bg-white/10' : 'bg-[#EADCD3]'}`} />
                    <button id="admin-logout-btn" type="button" role="menuitem" className={`${itemMenu} !text-rose-600`} onClick={() => { setMenuAbierto(false); onLogout(); }}>
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* En el móvil el selector va en su propia fila, a todo lo ancho */}
        {enAdmin && (
          <div className="pb-2 md:hidden [&>div]:flex [&>div]:w-full [&_button]:flex-1 [&_button]:justify-center">{selector}</div>
        )}
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
