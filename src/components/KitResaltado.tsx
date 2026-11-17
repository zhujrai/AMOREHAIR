import React, { useId } from 'react';
import { trazoContorno, ZonaCatalogo } from '../utils/contornos';

export interface PiezaKit {
  producto_id: string;
  zona: ZonaCatalogo;
  /** true = la clienta eligió este producto */
  elegida: boolean;
}

/**
 * Foto del kit con los productos elegidos resaltados (contorno dorado) y el resto atenuado.
 * Sirve para ver de un vistazo qué pidió la clienta, sin leer la lista.
 */
export const KitResaltado: React.FC<{
  foto: string;
  ancho: number;
  alto: number;
  piezas: PiezaKit[];
  className?: string;
}> = ({ foto, ancho, alto, piezas, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const elegidas = piezas.filter((p) => p.elegida);
  const hayElegidas = elegidas.length > 0;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#F1E7E0] ${className}`} style={{ aspectRatio: `${ancho} / ${alto}` }}>
      <img src={foto} alt="Kit cotizado" className="absolute inset-0 h-full w-full object-cover" draggable={false} loading="lazy" />
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        {hayElegidas && (
          <>
            <defs>
              <mask id={`m-${id}`}>
                <rect width={ancho} height={alto} fill="white" />
                {elegidas.map((p, i) => (
                  <path key={i} d={trazoContorno(p.zona, ancho, alto)} fill="black" />
                ))}
              </mask>
            </defs>
            <rect width={ancho} height={alto} fill="rgba(20,10,8,.55)" mask={`url(#m-${id})`} />
          </>
        )}
        {elegidas.map((p, i) => (
          <path key={i} d={trazoContorno(p.zona, ancho, alto)} fill="none" stroke="#F6DDA3" strokeWidth={Math.max(3, ancho / 260)} strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  );
};
