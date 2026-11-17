import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  LogIn, 
  Mail, 
  KeyRound, 
  Timer 
} from 'lucide-react';
import { StoreSettings, AdminUser } from '../types';
import { getBrandLogo } from '../utils/formatters';
import { iniciarSesion, enviarRecuperacion } from '../utils/auth';

interface AdminLoginProps {
  onLoginSuccess: (token?: string, user?: AdminUser, remember?: boolean) => void;
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
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('logiperu_remembered_email') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Ingresa tu correo de usuario.');
      return;
    }

    if (!password) {
      setError('Ingresa tu contraseña de acceso.');
      return;
    }

    setIsLoading(true);
    try {
      // Autenticación real con Supabase Auth (sin contraseñas en el código)
      const res = await iniciarSesion(cleanEmail, password, rememberMe);
      if (res.ok === false) {
        setError(res.error);
        if (res.bloqueoSeg) setLockoutSeconds(res.bloqueoSeg);
        return;
      }
      if (rememberMe) {
        localStorage.setItem('logiperu_remembered_email', cleanEmail);
      } else {
        localStorage.removeItem('logiperu_remembered_email');
      }
      onLoginSuccess(undefined, res.user, rememberMe);
    } finally {
      setIsLoading(false);
    }
  };

  const [info, setInfo] = useState('');

  const handleOlvide = async () => {
    setError('');
    setInfo('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Escribe tu correo arriba y vuelve a pulsar "¿Olvidaste tu contraseña?".');
      return;
    }
    setIsLoading(true);
    const res = await enviarRecuperacion(cleanEmail);
    setIsLoading(false);
    if (res.ok) {
      setInfo('Si ese correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.');
    } else {
      setError(res.error || 'No se pudo enviar el correo.');
    }
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
      <div 
        className={`w-full max-w-md rounded-2xl border shadow-xl p-6 sm:p-8 transition-all ${
          isDark 
            ? 'bg-[#1B1412] border-white/10 text-zinc-100' 
            : 'bg-white border-[#EADCD3] text-[#1F1613]'
        }`}
      >
        {/* Back Link */}
        <button
          id="back-to-client-btn"
          type="button"
          onClick={onBackToClient}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-200 mb-5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al formulario</span>
        </button>

        {/* Header with Brand Logo */}
        <div className="text-center space-y-3 mb-6">
          {brandLogo ? (
            <div className="flex justify-center mb-3 py-1">
              <img
                src={brandLogo}
                alt={storeSettings.storeName}
                className="h-28 sm:h-36 md:h-40 w-auto max-w-full object-contain filter drop-shadow-sm transition-all duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#A8634F] dark:bg-white text-white dark:text-[#1F1613] flex items-center justify-center mx-auto shadow-md mb-2">
              <Lock className="w-9 h-9" />
            </div>
          )}

          <div>
            <p className="text-xs text-[#6B5A55] dark:text-zinc-400 mt-1">
              Ingresa con tu usuario y contraseña de operador
            </p>
          </div>
        </div>

        {/* Lockout Warning */}
        {isLocked && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-[#DFBF8B]/30 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5">
            <Timer className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-600 dark:text-amber-400" />
            <span>Acceso bloqueado por seguridad. Espera <strong>{lockoutSeconds}s</strong>.</span>
          </div>
        )}

        {/* Error message */}
        {error && !isLocked && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Native HTML Login Form supporting browser credential auto-fill and password managers */}
        <form 
          autoComplete="on"
          onSubmit={handleSubmit} 
          className="space-y-4"
        >
          {/* Email / Username Input */}
          <div className="space-y-1.5">
            <label 
              htmlFor="admin-email-input" 
              className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-[#6B5A55]" />
              <span>Usuario / Correo Electrónico</span>
            </label>
            <div className="relative">
              <input
                id="admin-email-input"
                name="username"
                type="email"
                autoComplete="username email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLocked || isLoading}
                required
                className={`w-full px-4 py-3 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all ${
                  isDark 
                    ? 'bg-zinc-900/90 border-zinc-800 text-white placeholder-[#6B5A55]/70' 
                    : 'bg-zinc-50/80 border-zinc-300 text-[#1F1613] placeholder-zinc-400'
                } disabled:opacity-50`}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="admin-password-input" 
                className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#6B5A55]" />
                <span>Contraseña</span>
              </label>
              {remainingAttempts !== null && remainingAttempts < 5 && !isLocked && (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {remainingAttempts} {remainingAttempts === 1 ? 'intento' : 'intentos'}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                id="admin-password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLocked || isLoading}
                required
                className={`w-full pl-4 pr-11 py-3 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all ${
                  isDark 
                    ? 'bg-zinc-900/90 border-zinc-800 text-white placeholder-[#6B5A55]/70' 
                    : 'bg-zinc-50/80 border-zinc-300 text-[#1F1613] placeholder-zinc-400'
                } disabled:opacity-50`}
              />
              <button
                type="button"
                id="toggle-password-visibility-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Session Checkbox */}
          <div className="flex items-center pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#6B5A55] dark:text-zinc-400">
              <input
                type="checkbox"
                id="remember-admin-session"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#1F1613] focus:ring-zinc-800 border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
              />
              <span>Recordar sesión en este equipo</span>
            </label>
          </div>

          <div className="flex justify-end -mt-1">
            <button
              type="button"
              id="forgot-password-btn"
              onClick={handleOlvide}
              disabled={isLoading || isLocked}
              className="text-xs font-semibold text-[#A8634F] dark:text-[#DFBF8B] hover:underline cursor-pointer disabled:opacity-40"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {info && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 text-xs font-medium">
              {info}
            </div>
          )}

          {/* Submit Button */}
          <button
            id="admin-login-submit-btn"
            type="submit"
            disabled={isLoading || isLocked || !email.trim() || !password.trim()}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-zinc-900 hover:bg-[#A8634F] dark:bg-white dark:text-[#1F1613] dark:hover:bg-zinc-100 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Client Form Direct Link Banner */}
        <div className="mt-6 pt-5 border-t border-[#EADCD3]/80 dark:border-zinc-800 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-[#6B5A55] dark:text-zinc-400">
            ¿Eres cliente o necesitas registrar un nuevo pedido?
          </p>
          <button
            type="button"
            onClick={onBackToClient}
            className="inline-flex items-center gap-1.5 text-xs font-black text-red-600 dark:text-[#C68173] hover:underline cursor-pointer"
          >
            <span>Form pedidos</span>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

      </div>
    </div>
  );
};
