import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cambiarClave } from '../utils/auth';

interface NuevaClaveProps {
  onListo: () => void;
  isDark: boolean;
}

/** Pantalla que se muestra al entrar desde el enlace de "recuperar contraseña". */
export const NuevaClave: React.FC<NuevaClaveProps> = ({ onListo, isDark }) => {
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (clave !== repetir) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    const res = await cambiarClave(clave);
    setCargando(false);
    if (!res.ok) {
      setError(res.error || 'No se pudo cambiar la contraseña.');
      return;
    }
    onListo();
  };

  const campo = `w-full px-4 py-3 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 ${
    isDark ? 'bg-zinc-900/90 border-zinc-800 text-white' : 'bg-zinc-50/80 border-zinc-300 text-[#0F172A]'
  }`;

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
      <form
        onSubmit={enviar}
        autoComplete="on"
        className={`w-full max-w-md rounded-2xl border shadow-xl p-6 sm:p-8 space-y-4 ${
          isDark ? 'bg-[#18181B] border-white/10 text-zinc-100' : 'bg-white border-[#E2E8F0] text-[#0F172A]'
        }`}
      >
        <div className="text-center space-y-1">
          <KeyRound className="w-8 h-8 mx-auto text-[#6366F1]" />
          <h1 className="text-lg font-black">Crea tu nueva contraseña</h1>
          <p className="text-xs text-[#475569] dark:text-zinc-400">Mínimo 8 caracteres.</p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        <div className="relative">
          <input
            id="nueva-clave-input"
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            minLength={8}
            className={`${campo} pr-11`}
          />
          <button
            type="button"
            onClick={() => setVer(!ver)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            title={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <input
          id="repetir-clave-input"
          type={ver ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          required
          minLength={8}
          className={campo}
        />

        <button
          type="submit"
          id="guardar-nueva-clave-btn"
          disabled={cargando || clave.length < 8 || repetir.length < 8}
          className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-zinc-900 hover:bg-[#6366F1] dark:bg-white dark:text-[#0F172A] dark:hover:bg-zinc-100 shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cargando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
};
