import React from 'react';
import { Sparkles, MoveDown } from 'lucide-react';
import { OrderStatus } from '../types';

interface KanbanEmptyStateProps {
  status: OrderStatus;
  isSearching: boolean;
  isDark: boolean;
}

export const KanbanEmptyState: React.FC<KanbanEmptyStateProps> = ({
  status,
  isSearching,
  isDark,
}) => {
  if (isSearching) {
    return (
      <div className={`py-12 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${
        isDark ? 'border-white/10 bg-white/[0.02]' : 'border-zinc-300 bg-white/40'
      }`}>
        <p className="text-xs font-black text-[#0F172A] dark:text-zinc-200">
          Sin coincidencias
        </p>
        <p className="text-[11px] text-[#475569] dark:text-zinc-400 mt-1 font-semibold">
          Prueba con otro término de búsqueda o filtro
        </p>
      </div>
    );
  }

  return (
    <div className={`py-8 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all relative overflow-hidden group ${
      isDark 
        ? 'border-white/10 bg-[#141419]/40 hover:border-white/20' 
        : 'border-zinc-300/80 bg-white/40 hover:border-zinc-400'
    }`}>
      {/* Background Subtle Radiant Glow */}
      <div className={`absolute w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-40 transition-opacity group-hover:opacity-70 ${
        status === 'nuevos' ? 'bg-rose-500/20' :
        status === 'empacados' ? 'bg-amber-500/20' :
        status === 'en_camino' ? 'bg-blue-500/20' : 'bg-emerald-500/20'
      }`} />

      {/* Stylized Minimalist SVG Illustration */}
      <div className="relative z-10 mb-3 flex items-center justify-center w-28 h-24">
        {status === 'nuevos' && (
          <svg viewBox="0 0 140 120" className="w-full h-full drop-shadow-sm">
            {/* Glowing lines */}
            <g opacity="0.85">
              <line x1="20" y1="25" x2="35" y2="25" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 4" />
              <line x1="105" y1="20" x2="120" y2="20" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 4" />
              <line x1="110" y1="45" x2="125" y2="45" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
              <circle cx="28" cy="42" r="2" fill="#F43F5E" />
              <circle cx="118" cy="30" r="2.5" fill="#FB7185" />
            </g>

            {/* Glowing Envelopes Stack */}
            <g transform="translate(48, 48) rotate(-6)">
              <rect x="0" y="0" width="46" height="32" rx="6" fill={isDark ? '#261C22' : '#FFE4E6'} stroke="#F43F5E" strokeWidth="2" />
              <path d="M0 0 L23 18 L46 0" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinejoin="round" />
            </g>
            <g transform="translate(42, 54)">
              <rect x="0" y="0" width="50" height="34" rx="7" fill={isDark ? '#361E28' : '#FFF1F2'} stroke="#E11D48" strokeWidth="2.2" />
              <path d="M0 0 L25 19 L50 0" fill="none" stroke="#E11D48" strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="25" cy="19" r="3.5" fill="#FB7185" />
            </g>

            {/* Minimalist Character reviewing letter */}
            <g transform="translate(26, 22)">
              {/* Head */}
              <circle cx="24" cy="16" r="11" fill={isDark ? '#4C1D2A' : '#FECDD3'} stroke="#E11D48" strokeWidth="2" />
              {/* Eye / Glasses */}
              <circle cx="27" cy="15" r="2" fill="#881337" />
              <path d="M22 19 Q26 23 30 19" stroke="#881337" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Torso */}
              <path d="M12 44 C12 32 36 32 36 44 Z" fill={isDark ? '#2D151E' : '#FFE4E6'} stroke="#E11D48" strokeWidth="2" />
              {/* Arm holding magnifier/letter */}
              <path d="M30 34 Q38 30 40 24" stroke="#E11D48" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="42" cy="22" r="5" stroke="#F43F5E" strokeWidth="2" fill={isDark ? '#4C1D2A' : '#FFF'} />
              <line x1="45" y1="26" x2="50" y2="31" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* Sparkle */}
            <path d="M96 15 L98 21 L104 23 L98 25 L96 31 L94 25 L88 23 L94 21 Z" fill="#FB7185" />
          </svg>
        )}

        {status === 'empacados' && (
          <svg viewBox="0 0 140 120" className="w-full h-full drop-shadow-sm">
            {/* Glowing lines */}
            <g opacity="0.85">
              <line x1="15" y1="35" x2="30" y2="35" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
              <line x1="110" y1="25" x2="125" y2="25" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
              <circle cx="22" cy="22" r="2.5" fill="#F59E0B" />
              <circle cx="115" cy="40" r="2" fill="#FBBF24" />
            </g>

            {/* Parcel Box */}
            <g transform="translate(42, 45)">
              <rect x="0" y="8" width="56" height="42" rx="7" fill={isDark ? '#2B2215' : '#FEF3C7'} stroke="#D97706" strokeWidth="2.2" />
              {/* Flaps */}
              <polygon points="0,8 14,0 42,0 56,8" fill={isDark ? '#3D2F19' : '#FDE68A'} stroke="#D97706" strokeWidth="2" />
              {/* Sealing Tape Glowing */}
              <line x1="28" y1="0" x2="28" y2="50" stroke="#F59E0B" strokeWidth="7" strokeOpacity="0.3" />
              <line x1="28" y1="0" x2="28" y2="50" stroke="#B45309" strokeWidth="3" strokeDasharray="3 3" />
              {/* Label */}
              <rect x="8" y="20" width="14" height="18" rx="2" fill="#FFF" stroke="#D97706" strokeWidth="1.2" />
              <line x1="11" y1="24" x2="19" y2="24" stroke="#D97706" strokeWidth="1" />
              <line x1="11" y1="28" x2="17" y2="28" stroke="#D97706" strokeWidth="1" />
            </g>

            {/* Minimalist Character taping the box */}
            <g transform="translate(68, 14)">
              {/* Head */}
              <circle cx="20" cy="14" r="10" fill={isDark ? '#4D3613' : '#FDE68A'} stroke="#D97706" strokeWidth="2" />
              <circle cx="23" cy="13" r="1.8" fill="#78350F" />
              <path d="M18 17 Q22 20 25 17" stroke="#78350F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Cap */}
              <path d="M10 12 C10 6 26 4 30 10 L34 12 Z" fill="#D97706" />
              {/* Body */}
              <path d="M10 38 C10 26 30 26 30 38 Z" fill={isDark ? '#38250A' : '#FEF3C7'} stroke="#D97706" strokeWidth="2" />
              {/* Arms applying tape roll */}
              <path d="M14 28 L-4 36" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="-4" cy="36" r="4.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
            </g>

            {/* Sparkle */}
            <path d="M30 18 L32 23 L37 25 L32 27 L30 32 L28 27 L23 25 L28 23 Z" fill="#F59E0B" />
          </svg>
        )}

        {status === 'en_camino' && (
          <svg viewBox="0 0 140 120" className="w-full h-full drop-shadow-sm">
            {/* Glowing Map Route Lines */}
            <g opacity="0.85">
              <path d="M15 85 Q45 65 70 80 T125 55" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeDasharray="3 4" strokeLinecap="round" />
              <circle cx="18" cy="85" r="3.5" fill="#3B82F6" />
              <line x1="20" y1="30" x2="35" y2="30" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
              <circle cx="120" cy="25" r="2.5" fill="#3B82F6" />
            </g>

            {/* Moving Delivery Vehicle */}
            <g transform="translate(38, 38)">
              {/* Van Body */}
              <rect x="0" y="8" width="46" height="28" rx="5" fill={isDark ? '#192C45' : '#DBEAFE'} stroke="#2563EB" strokeWidth="2.2" />
              <path d="M46 16 L58 16 L64 25 L64 36 L46 36 Z" fill={isDark ? '#203A5C' : '#BFDBFE'} stroke="#2563EB" strokeWidth="2.2" />
              {/* Window */}
              <polygon points="48,18 56,18 60,25 48,25" fill="#FFF" stroke="#2563EB" strokeWidth="1.5" />
              {/* Wheels */}
              <circle cx="14" cy="37" r="7" fill={isDark ? '#0F172A' : '#1E293B'} stroke="#2563EB" strokeWidth="2" />
              <circle cx="14" cy="37" r="2.5" fill="#60A5FA" />
              <circle cx="50" cy="37" r="7" fill={isDark ? '#0F172A' : '#1E293B'} stroke="#2563EB" strokeWidth="2" />
              <circle cx="50" cy="37" r="2.5" fill="#60A5FA" />
              {/* Speed Lines */}
              <line x1="-12" y1="18" x2="-4" y2="18" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
              <line x1="-16" y1="25" x2="-6" y2="25" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* GPS Beacon Pin */}
            <g transform="translate(108, 35)">
              <path d="M10 0 C4.5 0 0 4.5 0 10 C0 17 10 26 10 26 C10 26 20 17 20 10 C20 4.5 15.5 0 10 0 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
              <circle cx="10" cy="9" r="4" fill="#FFF" />
            </g>

            {/* Sparkle */}
            <path d="M85 18 L87 23 L92 25 L87 27 L85 32 L83 27 L78 25 L83 23 Z" fill="#3B82F6" />
          </svg>
        )}

        {status === 'entregados' && (
          <svg viewBox="0 0 140 120" className="w-full h-full drop-shadow-sm">
            {/* Glowing Success Sparkles & Stars */}
            <g opacity="0.85">
              <path d="M22 25 L24 30 L29 32 L24 34 L22 39 L20 34 L15 32 L20 30 Z" fill="#10B981" />
              <path d="M115 20 L117 25 L122 27 L117 29 L115 34 L113 29 L108 27 L113 25 Z" fill="#34D399" />
              <circle cx="28" cy="55" r="2.5" fill="#10B981" />
              <circle cx="112" cy="50" r="2.5" fill="#059669" />
            </g>

            {/* Smiling Character with Delivered Box */}
            <g transform="translate(48, 16)">
              {/* Head */}
              <circle cx="22" cy="18" r="12" fill={isDark ? '#14382A' : '#D1FAE5'} stroke="#059669" strokeWidth="2.2" />
              {/* Happy Eyes (Arcs) */}
              <path d="M16 16 Q19 13 22 16" stroke="#065F46" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M24 16 Q27 13 30 16" stroke="#065F46" strokeWidth="2" fill="none" strokeLinecap="round" />
              {/* Big Smile */}
              <path d="M17 21 Q23 27 29 21" stroke="#065F46" strokeWidth="2" fill="none" strokeLinecap="round" />
              {/* Cheeks */}
              <circle cx="15" cy="21" r="1.5" fill="#F87171" />
              <circle cx="31" cy="21" r="1.5" fill="#F87171" />

              {/* Torso */}
              <path d="M10 50 C10 36 34 36 34 50 Z" fill={isDark ? '#0E281E' : '#ECFDF5'} stroke="#059669" strokeWidth="2.2" />

              {/* Held Parcel with Green Check Ribbon */}
              <g transform="translate(8, 38)">
                <rect x="0" y="0" width="28" height="22" rx="4" fill={isDark ? '#2D3E35' : '#A7F3D0'} stroke="#059669" strokeWidth="1.8" />
                <line x1="14" y1="0" x2="14" y2="22" stroke="#059669" strokeWidth="2" />
                {/* Big Glowing Checkmark Badge */}
                <circle cx="14" cy="11" r="8" fill="#10B981" stroke="#FFF" strokeWidth="1.5" />
                <path d="M10 11 L13 14 L18 8" stroke="#FFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          </svg>
        )}
      </div>

      {/* Prominent "Arrastra una tarjeta aquí" Highlighted Badge */}
      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border shadow-xs transition-transform group-hover:scale-105 ${
          status === 'nuevos'
            ? 'bg-rose-500/15 text-[#6366F1] dark:text-rose-400 border-rose-500/30'
            : status === 'empacados'
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-[#FBBF24]/30'
            : status === 'en_camino'
            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
        }`}>
          <MoveDown className="w-3.5 h-3.5 animate-bounce stroke-[2.5]" />
          <span>Arrastra una tarjeta aquí</span>
        </span>
        <p className="text-[11px] text-[#475569] dark:text-zinc-400 font-bold">
          {status === 'nuevos' && 'Nuevos pedidos registrados'}
          {status === 'empacados' && 'Listos para rotular y empaque'}
          {status === 'en_camino' && 'En tránsito o agencia courier'}
          {status === 'entregados' && 'Completados exitosamente'}
        </p>
      </div>
    </div>
  );
};
