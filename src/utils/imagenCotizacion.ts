import { trazoContorno, ZonaCatalogo } from './contornos';

/**
 * Genera la cotización como imagen (PNG) para enviarla por WhatsApp: encabezado de marca, el kit con los productos
 * elegidos resaltados (resto atenuado), la lista y el total. Se dibuja en un <canvas> (sin dependencias).
 */
export interface GrupoImagen {
  titulo: string;
  foto: string | null;
  ancho: number;
  alto: number;
  zonasElegidas: ZonaCatalogo[];
  lineas: string[];
}

export interface DatosImagen {
  codigo: string;
  nombre: string | null;
  grupos: GrupoImagen[];
  /** Texto del total, p. ej. "S/ 120.00" (vacío si aún no hay precio) */
  total: string;
  notaTotal: string;
}

const MARRON = '#A8634F';
const TINTA = '#2B1D1A';
const CREMA = '#FBF4F0';

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function partirTexto(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number): string[] {
  const palabras = texto.split(' ');
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > maxAncho && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export async function generarImagenCotizacion(d: DatosImagen): Promise<Blob> {
  const W = 1080;
  const M = 56;
  const FOTO = 400;
  const fotos = await Promise.all(d.grupos.map((g) => (g.foto ? cargarImagen(g.foto) : Promise.resolve(null))));

  // Medición previa de alturas
  const medidor = document.createElement('canvas').getContext('2d')!;
  medidor.font = '600 30px system-ui, sans-serif';
  const anchoTexto = W - M * 2 - FOTO - 36;
  const bloques = d.grupos.map((g, i) => {
    const tieneFoto = Boolean(fotos[i]);
    const anchoLista = tieneFoto ? anchoTexto : W - M * 2;
    const filas = g.lineas.flatMap((l) => partirTexto(medidor, l, anchoLista - 34));
    const altoLista = 56 + filas.length * 40;
    const altoFoto = tieneFoto ? Math.round((FOTO * g.alto) / g.ancho) : 0;
    return { filas, altoLista, altoFoto, alto: Math.max(altoLista, altoFoto) + 40 };
  });
  const altoCabecera = 190;
  const altoPie = d.total ? 260 : 150;
  const H = altoCabecera + bloques.reduce((a, b) => a + b.alto, 0) + altoPie;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = CREMA;
  ctx.fillRect(0, 0, W, H);

  // Cabecera
  ctx.fillStyle = MARRON;
  ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = TINTA;
  ctx.font = '700 54px Georgia, serif';
  ctx.letterSpacing = '12px';
  ctx.fillText('AMORE', M, 96);
  ctx.letterSpacing = '5px';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillStyle = '#8A7A76';
  ctx.fillText('HAIR STYLE STUDIO', M, 126);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'right';
  ctx.fillStyle = MARRON;
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText(`Cotización ${d.codigo}`, W - M, 90);
  if (d.nombre) {
    ctx.fillStyle = TINTA;
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillText(`Para ${d.nombre}`, W - M, 130);
  }
  ctx.textAlign = 'left';

  // Grupos (kit + lista)
  let y = altoCabecera;
  d.grupos.forEach((g, i) => {
    const b = bloques[i];
    const img = fotos[i];
    // tarjeta blanca
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(M - 16, y - 16, W - (M - 16) * 2, b.alto - 8, 28);
    ctx.fill();
    let xTexto = M;
    if (img) {
      const alto = b.altoFoto;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(M, y, FOTO, alto, 22);
      ctx.clip();
      ctx.drawImage(img, M, y, FOTO, alto);
      const k = FOTO / g.ancho;
      ctx.translate(M, y);
      ctx.scale(k, k);
      if (g.zonasElegidas.length > 0) {
        const atenuado = new Path2D();
        atenuado.rect(0, 0, g.ancho, g.alto);
        g.zonasElegidas.forEach((z) => atenuado.addPath(new Path2D(trazoContorno(z, g.ancho, g.alto))));
        ctx.fillStyle = 'rgba(20,10,8,0.55)';
        ctx.fill(atenuado, 'evenodd');
        ctx.strokeStyle = '#F6DDA3';
        ctx.lineWidth = 3.5 / k;
        ctx.lineJoin = 'round';
        g.zonasElegidas.forEach((z) => ctx.stroke(new Path2D(trazoContorno(z, g.ancho, g.alto))));
      }
      ctx.restore();
      xTexto = M + FOTO + 36;
    }
    ctx.fillStyle = MARRON;
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText(g.titulo.toUpperCase(), xTexto, y + 28);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = TINTA;
    ctx.font = '600 30px system-ui, sans-serif';
    let yy = y + 78;
    const anchoLista = (img ? anchoTexto : W - M * 2) - 34;
    g.lineas.forEach((l) => {
      const partes = partirTexto(ctx, l, anchoLista);
      ctx.fillStyle = MARRON;
      ctx.fillText('•', xTexto, yy);
      ctx.fillStyle = TINTA;
      partes.forEach((p, idx) => {
        ctx.fillText(p, xTexto + 34, yy + idx * 40);
      });
      yy += partes.length * 40;
    });
    y += b.alto;
  });

  // Total y pie
  if (d.total) {
    ctx.fillStyle = MARRON;
    ctx.beginPath();
    ctx.roundRect(M - 16, y, W - (M - 16) * 2, 120, 28);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText(d.notaTotal.toUpperCase(), M + 16, y + 48);
    ctx.textAlign = 'right';
    ctx.font = '800 56px system-ui, sans-serif';
    ctx.fillText(d.total, W - M - 16, y + 92);
    ctx.textAlign = 'left';
    y += 150;
  }
  ctx.fillStyle = '#8A7A76';
  ctx.font = '500 22px system-ui, sans-serif';
  const pie = partirTexto(ctx, 'El costo de envío se calcula según tu destino. Precios sujetos a confirmación de tu asesora. ¡Gracias por elegir Amore! 💖', W - M * 2);
  pie.forEach((l, i) => ctx.fillText(l, M, y + 34 + i * 30));

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), 'image/png'));
}
