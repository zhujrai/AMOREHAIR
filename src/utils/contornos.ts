/**
 * Contornos de los productos sobre la foto del kit.
 * Cada pieza del catálogo guarda una `zona` (rectángulo en fracciones 0–1 de la foto) y opcionalmente:
 *  - `forma`: 'botella' | 'frasco' | 'tarro' | 'caja' → se dibuja un contorno suave con esa silueta típica;
 *  - `cuello` / `cx`: ancho (0–1) y centro (0–1) de la tapa/bomba, para ajustar botellas con bomba o tapa angosta;
 *  - `contorno`: lista de puntos [u, v] (0–1 dentro de la zona) con la silueta exacta; tiene prioridad sobre `forma`.
 */
export type FormaProducto = 'botella' | 'frasco' | 'tarro' | 'caja';

export interface ZonaCatalogo {
  x: number;
  y: number;
  w: number;
  h: number;
  forma?: FormaProducto;
  cuello?: number;
  cx?: number;
  contorno?: [number, number][];
}

type Punto = [number, number];

function puntosDeForma(z: ZonaCatalogo): Punto[] {
  const c = z.cuello ?? (z.forma === 'frasco' ? 0.8 : 0.55);
  const cx = z.cx ?? 0.5;
  const l = Math.max(0, cx - c / 2);
  const r = Math.min(1, cx + c / 2);
  switch (z.forma) {
    case 'tarro':
      return [[0.08, 0], [0.92, 0], [1, 0.1], [1, 0.9], [0.92, 1], [0.08, 1], [0, 0.9], [0, 0.1]];
    case 'caja':
      return [[0.02, 0], [0.98, 0], [1, 0.03], [1, 0.97], [0.98, 1], [0.02, 1], [0, 0.97], [0, 0.03]];
    case 'frasco':
      return [[l, 0], [r, 0], [r, 0.22], [0.98, 0.3], [1, 0.36], [1, 0.95], [0.92, 1], [0.08, 1], [0, 0.95], [0, 0.36], [0.02, 0.3], [l, 0.22]];
    case 'botella':
    default:
      return [[l, 0], [r, 0], [r, 0.12], [0.97, 0.22], [1, 0.29], [1, 0.95], [0.92, 1], [0.08, 1], [0, 0.95], [0, 0.29], [0.03, 0.22], [l, 0.12]];
  }
}

/** Devuelve el trazo SVG (en píxeles de la foto, ancho × alto) del contorno suavizado de una pieza. */
export function trazoContorno(z: ZonaCatalogo, ancho: number, alto: number): string {
  const base = z.contorno && z.contorno.length >= 3 ? z.contorno : puntosDeForma(z);
  const pts: Punto[] = base.map(([u, v]) => [(z.x + u * z.w) * ancho, (z.y + v * z.h) * alto]);
  const n = pts.length;
  const medio = (a: Punto, b: Punto): Punto => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (v: number) => v.toFixed(1);
  const m0 = medio(pts[n - 1], pts[0]);
  let d = `M${f(m0[0])} ${f(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = medio(pts[i], pts[(i + 1) % n]);
    d += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return `${d} Z`;
}
