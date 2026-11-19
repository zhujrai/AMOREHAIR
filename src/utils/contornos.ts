/**
 * Contornos de los productos sobre la foto del kit.
 * Cada pieza del catálogo guarda una `zona` (rectángulo en fracciones 0–1 de la foto) y opcionalmente:
 *  - `forma`: 'botella' | 'frasco' | 'tarro' | 'caja' → se dibuja un contorno suave con esa silueta típica;
 *  - `cuello` / `cx`: ancho (0–1) y centro (0–1) de la tapa/bomba, para ajustar botellas con bomba o tapa angosta;
 *  - `cilindro`: envase recto con tapa casi tan ancha como el cuerpo (p. ej. Radiant 300 ml, tapa plateada plana); `cuello` = ancho de la tapa, `tapaAlto` = alto de la tapa;
 *  - `hombro`: envase con cuello angosto y hombros en pendiente recta que caen hasta el ancho completo (p. ej. Hanna Caball); usa `cuello`, `tapaAlto` y `hombro`;
 *  - `tapaAlto` / `hombro`: alto de la tapa o bomba (0–1 de la zona) y la altura donde el envase alcanza su ancho completo; sirven para botellas de 400/500 ml (tapa de bisagra, hombro corto) o con bomba alta;
 *  - `contorno`: lista de puntos [u, v] (0–1 dentro de la zona) con la silueta exacta; tiene prioridad sobre `forma`.
 */
export type FormaProducto = 'botella' | 'frasco' | 'tarro' | 'caja' | 'cilindro' | 'hombro';

export interface ZonaCatalogo {
  x: number;
  y: number;
  w: number;
  h: number;
  forma?: FormaProducto;
  cuello?: number;
  cx?: number;
  tapaAlto?: number;
  hombro?: number;
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
    case 'cilindro': {
      const ta = z.tapaAlto ?? 0.1;
      const m = (1 - (z.cuello ?? 0.94)) / 2;
      return [[m, 0], [1 - m, 0], [1 - m, ta], [1, ta + 0.015], [1, 0.95], [0.93, 1], [0.07, 1], [0, 0.95], [0, ta + 0.015], [m, ta]];
    }
    case 'hombro': {
      const ta = z.tapaAlto ?? 0.14;
      const hb = Math.max(ta + 0.05, z.hombro ?? 0.26);
      // hombros rectos: el ancho crece en línea recta desde el cuello hasta el cuerpo, con un pequeño quiebre al inicio y al final
      const q = (hb - ta) * 0.18;
      return [
        [l, 0], [r, 0], [r, ta],
        [r + (1 - r) * 0.12, ta + q], [1 - (1 - r) * 0.12, hb - q], [1, hb],
        [1, 0.95], [0.93, 1], [0.07, 1], [0, 0.95],
        [0, hb], [l * 0.12, hb - q], [l - l * 0.12 + 0, ta + q], [l, ta],
      ];
    }
    case 'botella':
    default: {
      // Tapa/bomba (ancho c, alto ta) → hombro curvo → cuerpo de ancho completo hasta la base redondeada
      const ta = Math.min(0.45, z.tapaAlto ?? 0.12);
      const hb = Math.max(ta + 0.04, Math.min(0.6, z.hombro ?? 0.29));
      const s = hb - ta;
      const rs = r + (1 - r) * 0.62;
      const ls = l - l * 0.62;
      return [
        [l, 0], [r, 0], [r, ta],
        [rs, ta + s * 0.34], [1 - (1 - rs) * 0.25, ta + s * 0.72], [1, hb],
        [1, 0.95], [0.92, 1], [0.08, 1], [0, 0.95],
        [0, hb], [ls * 0.25, ta + s * 0.72], [ls, ta + s * 0.34], [l, ta],
      ];
    }
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
