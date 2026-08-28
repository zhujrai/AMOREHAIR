import React, { useState } from 'react';
import { 
  Lock, 
  ArrowLeft, 
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  FlaskConical
} from 'lucide-react';
import { StoreSettings } from '../types';
import { getBrandLogo } from '../utils/formatters';
import { supabase } from '../utils/dbApi';

interface AdminLoginProps {
  onBackToClient: () => void;
  onSimulateAdmin?: (simulatedEmail?: string) => void;
  storeSettings: StoreSettings;
  isDark: boolean;
  errorMessage?: string | null;
  isCheckingAuth?: boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onBackToClient,
  onSimulateAdmin,
  storeSettings,
  isDark,
  errorMessage,
  isCheckingAuth = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const brandLogo = getBrandLogo(isDark, storeSettings);
  const displayError = errorMessage || localError;

  // Detect whether running in AI Studio preview iframe or development environment
  const isPreviewMode = typeof window !== 'undefined' && (
    window.self !== window.top || 
    window.location.hostname !== 'amorehair.vercel.app'
  );

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setLocalError(null);

    try {
      // Iniciar flujo OAuth de Google con Supabase
      const redirectToUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/#admin`
        : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      });

      if (error) {
        setLocalError(error.message || 'Error al iniciar sesión con Google');
        setIsLoading(false);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'No se pudo conectar con el servicio de autenticación de Google');
      setIsLoading(false);
    }
  };

  const isBusy = isLoading || isCheckingAuth;

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
      <div 
        className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-10 transition-all relative overflow-hidden ${
          isDark 
            ? 'bg-[#18181B] border-white/10 text-zinc-100 shadow-black/60' 
            : 'bg-white border-zinc-200/80 text-zinc-900 shadow-zinc-900/5'
        }`}
      >
        {/* Subtle Luxury Gold Background Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-500/10 dark:bg-[#FF7060]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Back Link */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <button
            id="back-to-client-btn"
            type="button"
            onClick={onBackToClient}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Envíos</span>
          </button>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Acceso Seguro</span>
          </span>
        </div>

        {/* Header with Logo */}
        <div className="relative z-10 text-center space-y-4 mb-8">
          {brandLogo ? (
            <div className="flex justify-center mb-3 py-1">
              <img
                src={brandLogo}
                alt={storeSettings.storeName}
                className="h-32 sm:h-40 md:h-44 w-auto max-w-full object-contain filter drop-shadow-sm transition-all duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center mx-auto shadow-md mb-3">
              <Lock className="w-8 h-8" />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white uppercase font-inter">
              Panel Administrativo
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Inicia sesión con tu cuenta de Google autorizada para gestionar los despachos y pedidos.
            </p>
          </div>
        </div>

        {/* Error Alert Message (e.g. Unauthorized Email) */}
        {displayError && (
          <div className="relative z-10 mb-6 p-4 rounded-2xl bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 text-red-900 dark:text-red-200 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-red-700 dark:text-red-300">
                Verificación de Administrador
              </p>
              <p className="text-[11px] leading-snug">
                {displayError}
              </p>
            </div>
          </div>
        )}

        {/* Google OAuth Login Button */}
        <div className="relative z-10 space-y-3">
          <button
            id="admin-google-login-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isBusy}
            className={`w-full group relative py-3.5 px-5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-lg flex items-center justify-center gap-3 border ${
              isDark 
                ? 'bg-zinc-900 hover:bg-zinc-800/90 text-white border-amber-500/30 hover:border-amber-400 shadow-amber-500/5' 
                : 'bg-white hover:bg-zinc-50 text-zinc-900 border-amber-500/40 hover:border-amber-500 shadow-amber-900/5'
            } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]`}
          >
            {isBusy ? (
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-zinc-700 dark:text-zinc-200">
                  {isCheckingAuth ? 'Verificando autorización en base de datos...' : 'Conectando con Google...'}
                </span>
              </div>
            ) : (
              <>
                {/* Official Google G Logo SVG */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-extrabold tracking-wide">
                  Continuar con Google
                </span>
              </>
            )}
          </button>

          {/* Test Bypass Button: ONLY rendered in preview / iframe / dev mode */}
          {isPreviewMode && (
            <div className="pt-2">
              <button
                id="admin-test-bypass-btn"
                type="button"
                onClick={() => onSimulateAdmin ? onSimulateAdmin('zhujrai@gmail.com') : null}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-dashed ${
                  isDark
                    ? 'bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 border-amber-500/30'
                    : 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-400/60'
                }`}
                title="Acceso de prueba exclusivo para el visor de desarrollo de AI Studio"
              >
                <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
                <span>🧪 Acceso Rápido (Simular Admin)</span>
              </button>
            </div>
          )}

          <p className="text-[11px] text-center text-zinc-500 dark:text-zinc-400">
            Solo cuentas de correo registradas en la tabla de administradores tienen acceso.
          </p>
        </div>

        {/* Client Form Direct Link Banner */}
        <div className="relative z-10 mt-8 pt-5 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            ¿Eres cliente o deseas registrar tu pedido?
          </p>
          <button
            type="button"
            onClick={onBackToClient}
            className="inline-flex items-center gap-1.5 text-xs font-black text-red-600 dark:text-[#FF7060] hover:underline cursor-pointer"
          >
            <span>Ir al Formulario de Clientes (/pedidos)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Minimalist Security Badge */}
        <div className="relative z-10 mt-5 pt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span>Supabase Auth • Validación en Base de Datos</span>
        </div>

      </div>
    </div>
  );
};
