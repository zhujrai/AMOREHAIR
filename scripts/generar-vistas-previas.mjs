// Genera, después del build, una copia del index.html por ruta pública con su propia vista previa
// (título, descripción e imagen que ven WhatsApp, Facebook, etc.). Esos rastreadores no ejecutan
// JavaScript, por eso la vista previa tiene que estar ya escrita en el HTML de cada ruta.
import { readFileSync, writeFileSync } from 'node:fs';

const SITIO = 'https://amorehair.vercel.app';
const base = readFileSync('dist/index.html', 'utf8');

const rutas = {
  'pedidos.html': {
    ruta: '/pedidos',
    titulo: 'Amore Salon · Formulario de despacho',
    descripcion: 'Completa tus datos para coordinar el envío o recojo de tu pedido.',
    imagen: '/og/despacho.png',
  },
  'catalogo.html': {
    ruta: '/catalogo',
    titulo: 'Amore Salon · Catálogo',
    descripcion: 'Arma tu rutina con tus productos favoritos y pide tu cotización por WhatsApp.',
    imagen: '/og/catalogo.png',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function aplicar(html, { ruta, titulo, descripcion, imagen }) {
  const og = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Amore Salon Hair Style" />`,
    `<meta property="og:url" content="${SITIO}${ruta}" />`,
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descripcion)}" />`,
    `<meta property="og:image" content="${SITIO}${imagen}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(descripcion)}" />`)
    .replace(/<meta property="og:[^>]*>\s*/g, '')
    .replace('<link rel="preconnect"', `${og}\n\n    <link rel="preconnect"`);
}

for (const [archivo, datos] of Object.entries(rutas)) {
  const salida = aplicar(base, datos);
  if (!salida.includes(`${SITIO}${datos.imagen}`)) throw new Error(`No se pudo escribir la vista previa de ${archivo}`);
  writeFileSync(`dist/${archivo}`, salida);
  console.log(`vista previa: dist/${archivo}`);
}
