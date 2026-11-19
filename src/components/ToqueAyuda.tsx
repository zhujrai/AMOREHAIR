import React, { useEffect, useRef, useState } from 'react';

/**
 * En pantallas táctiles no existe el "pasar el cursor": al tocar un icono sin texto muestra un aviso breve
 * con su nombre (tomado de data-tip, aria-label o title). Funciona en todas las páginas.
 */
export const ToqueAyuda: React.FC = () => {
  const [texto, setTexto] = useState('');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const alTocar = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      const objetivo = (e.target as Element | null)?.closest?.('button, a, [role="button"], [role="tab"], [data-tip]') as HTMLElement | null;
      if (!objetivo) return;
      // Solo iconos: si el elemento ya muestra texto visible, no hace falta avisar
      const visible = (objetivo.textContent || '').replace(/\s+/g, '').length;
      if (visible > 2) return;
      const nombre = objetivo.getAttribute('data-tip') || objetivo.getAttribute('aria-label') || objetivo.getAttribute('title');
      if (!nombre) return;
      setTexto(nombre);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setTexto(''), 1600);
    };
    document.addEventListener('pointerdown', alTocar, { passive: true });
    return () => { document.removeEventListener('pointerdown', alTocar); window.clearTimeout(timer.current); };
  }, []);

  if (!texto) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4" style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <span className="rounded-full bg-[#2B1D1A] px-4 py-2 text-xs font-bold text-white shadow-lg">{texto}</span>
    </div>
  );
};
