import { useEffect, useRef } from 'react';

/** Pila de modales abiertos: Esc cierra solo el de encima (p. ej. un buscador abierto dentro de otro modal). */
const pila: symbol[] = [];

export function useEscapeCierra(abierto: boolean, cerrar?: () => void): void {
  // El callback se lee de una referencia: si el padre lo recrea en cada render, el orden de la pila no cambia.
  const ultimo = useRef(cerrar);
  ultimo.current = cerrar;
  useEffect(() => {
    if (!abierto) return;
    const id = Symbol('modal');
    pila.push(id);
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pila[pila.length - 1] === id) ultimo.current?.();
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      const i = pila.indexOf(id);
      if (i >= 0) pila.splice(i, 1);
    };
  }, [abierto]);
}
