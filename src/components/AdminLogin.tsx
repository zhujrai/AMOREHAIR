import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  AlertCircle,
  LogIn,
  KeyRound,
  ShieldCheck,
  Timer
} from 'lucide-react';
import { StoreSettings } from '../types';
import { getBrandLogo } from '../utils/formatters';

interface AdminLoginProps {
  onLoginSuccess: (token?: string) => void;
  onBackToClient: () => void;
  storeSettings: StoreSettings;
  isDark: boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToClient,
  storeSettings,
  isDark,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  const brandLogo = getBrandLogo(isDark, storeSettings);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError('');
          setRemainingAttempts(5);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setError('');
    const cleanPin = pin.trim();

    if (!cleanPin) {
      setError('Ingresa el PIN de seguridad.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Try server verification endpoint
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          sessionStorage.setItem('logiperu_admin_token', data.token);
        }
        onLoginSuccess(data.token);
      } else {
        if (data.lockoutSeconds && data.lockoutSeconds > 0) {
          setLockoutSeconds(data.lockoutSeconds);
        }
        if (typeof data.remainingAttempts === 'number') {
          setRemainingAttempts(data.remainingAttempts);
        }
        setError(data.error || 'PIN incorrecto. Intenta de nuevo.');
      }
    } catch {
      // Fallback local check if offline / client-only mode
      if (cleanPin === 'Itzelita') {
        onLoginSuccess();
      } else {
        setError('PIN incorrecto. Verifica el código.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
      <div 
        className={`w-full max-w-md rounded-3xl border shadow-xl p-6 sm:p-10 transition-all ${
          isDark 
            ? 'bg-[#18181B] border-white/10 text-zinc-100' 
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Back Link */}
        <button
          id="back-to-client-btn"
          type="button"
          onClick={onBackToClient}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-200 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver</span>
        </button>

        {/* Header with Triple-Sized Logo */}
        <div className="text-center space-y-4 mb-8">
          {brandLogo ? (
            <div className="flex justify-center mb-4 py-2">
              <img
                src={brandLogo}
                alt={storeSettings.storeName}
                className="h-36 sm:h-44 md:h-48 w-auto max-w-full object-contain filter drop-shadow-sm transition-all duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center mx-auto shadow-md mb-3">
              <Lock className="w-10 h-10" />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Panel Administrativo
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Ingresa el PIN de seguridad para gestionar pedidos
            </p>
          </div>
        </div>

        {/* Lockout Warning */}
        {isLocked && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5">
            <Timer className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-600 dark:text-amber-400" />
            <span>Bloqueado temporalmente. Espera <strong>{lockoutSeconds}s</strong>.</span>
          </div>
        )}

        {/* Error message */}
        {error && !isLocked && (
          <div className="mb-5 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* PIN Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="admin-pin-input" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                PIN de Acceso
              </label>
              {remainingAttempts !== null && remainingAttempts < 5 && !isLocked && (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  {remainingAttempts} {remainingAttempts === 1 ? 'intento' : 'intentos'}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                id="admin-pin-input"
                type={showPin ? 'text' : 'password'}
                placeholder="Ingresa el PIN..."
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isLocked || isLoading}
                className={`w-full pl-4 pr-11 py-3 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all ${
                  isDark 
                    ? 'bg-zinc-900/90 border-zinc-800 text-white placeholder-zinc-500' 
                    : 'bg-zinc-50/80 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                } disabled:opacity-50`}
                autoFocus
              />
              <button
                type="button"
                id="toggle-pin-visibility-btn"
                onClick={() => setShowPin(!showPin)}
                disabled={isLocked}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="admin-pin-submit-btn"
            type="submit"
            disabled={isLoading || isLocked || !pin.trim()}
            className="w-full py-3 px-4 rounded-2xl font-semibold text-sm text-white bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Ingresar</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Minimalist Security Badge */}
        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Acceso seguro protegido</span>
        </div>

      </div>
    </div>
  );
};
