import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { trazoContorno, ZonaCatalogo } from '../utils/contornos';
import { useEscapeCierra } from '../utils/useEscapeCierra';

/**
 * Catálogo por escenas — diseño móvil primero (iPhone y Android), minimalista.
 * - Carrusel vertical de rutinas (también se cambia deslizando la foto).
 * - Cada producto se elige tocando su contorno luminoso sobre la foto del kit.
 * - Cesta única agrupada por marca; barra flotante de vidrio con el botón "Pedir cotización".
 * El precio final lo fija la asesora (aquí solo hay precios sugeridos, hoy vacíos).
 */

const WHATSAPP = '51940339934';
const CLAVE_CESTA = 'amore_cesta_v1';
// Logo de marca (Cloudinary: amore/marca). Claro: fondo casi blanco que se funde con el fondo; oscuro: versión dorada para modo oscuro.
const LOGO_CLARO = 'https://res.cloudinary.com/gvwnzzml/image/upload/e_trim:12,f_auto,q_auto,c_limit,w_420/v1795066846/amore/marca/logo-horizontal-claro';
const LOGO_OSCURO = 'https://res.cloudinary.com/gvwnzzml/image/upload/e_trim:12,f_auto,q_auto,c_limit,w_420/v1795066847/amore/marca/logo-horizontal-oscuro';
// Texto del mensaje del botón de kit completo. IMPORTANTE: debe corresponder a una oferta real que la asesora confirme.
const TEXTO_KIT = 'Lleva el kit completo y pide tu descuento exclusivo: tu asesora te lo confirma en la cotización.';

type Zona = ZonaCatalogo;
interface Presentacion { id: string; producto_id: string; etiqueta: string; precio_sugerido: number | null; orden: number; stock_modo?: string; stock_cantidad?: number }
interface Producto { id: string; marca: string; linea?: string | null; nombre: string; tipo: string | null; disponible: boolean }
interface Pieza { id: number; rutina_id: string; producto_id: string; presentacion_foto_id: string | null; zona: Zona; orden: number }
interface Rutina { id: string; nombre: string; descripcion: string | null; foto_url: string; ancho_foto: number | null; alto_foto: number | null; orden?: number }
interface ItemSel { presentacionId: string; cantidad: number }

const dinero = (n: number) => `S/ ${n.toFixed(2)}`;
const nombreCorto = (r: Rutina) => r.nombre.split('·')[0].trim();
const vibrar = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };

function refDelEnlace(): string | undefined {
  try {
    const r = new URLSearchParams(window.location.search).get('ref') || '';
    return r.trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || undefined;
  } catch {
    return undefined;
  }
}

/* ---------- Iconos mínimos (trazo fino, sin dependencias) ---------- */
const Icono: React.FC<{ d: string; className?: string; relleno?: boolean }> = ({ d, className = 'w-5 h-5', relleno }) => (
  <svg viewBox="0 0 24 24" className={className} fill={relleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const D_BOLSA = 'M6 8h12l-1 12H7L6 8zm3 0V6a3 3 0 0 1 6 0v2';
const D_CHECK = 'M5 12.5l4.2 4.2L19 7';
const D_MAS = 'M12 5v14M5 12h14';
const D_X = 'M6 6l12 12M18 6L6 18';
const D_IZQ = 'M15 5l-7 7 7 7';
const D_DER = 'M9 5l7 7-7 7';
const D_TACHO = 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3';
const D_REJILLA = 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z';
const D_BUSCAR = 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4-4';
const D_LUNA = 'M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z';
const D_SOL = 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4';
const D_WSP = 'M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6L3 21zm5.6-12.3c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 1.9c.1.2 0 .4-.1.6l-.5.7c-.1.2-.2.3 0 .6.5.9 1.4 1.8 2.5 2.3.3.1.5.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.3.4.5 0 .8-.6 1.5-1.4 1.7-1 .3-2.5.1-4.2-.9-1.6-1-3-2.5-3.7-4.1-.4-1-.4-2 .2-2.8z';

/** Miniatura cuadrada recortada de la misma foto (solo el producto, sin sus vecinos). */
const Miniatura: React.FC<{ foto: string; zona: Zona; ancho: number; alto: number; lado?: number; clase?: string }> = ({ foto, zona, ancho, alto, lado = 52, clase = 'rounded-2xl' }) => {
  const pw = zona.w * ancho;
  const ph = zona.h * alto;
  const escala = lado / Math.max(pw, ph);
  return (
    <div className={`relative shrink-0 ${clase} bg-[var(--hueco)]`} style={{ width: lado, height: lado }}>
      <div className="absolute overflow-hidden rounded-lg" style={{ width: pw * escala, height: ph * escala, left: (lado - pw * escala) / 2, top: (lado - ph * escala) / 2 }}>
        <img
          src={foto}
          alt=""
          draggable={false}
          style={{ position: 'absolute', maxWidth: 'none', width: ancho * escala, height: alto * escala, left: -zona.x * ancho * escala, top: -zona.y * alto * escala }}
        />
      </div>
    </div>
  );
};

/** Tira horizontal: se desliza con el dedo (táctil) y con mouse tiene flechas, arrastre y teclado; los bordes se difuminan si hay más contenido. */
const Tira: React.FC<{ etiqueta: string; rol?: string; interior?: string; children: React.ReactNode }> = ({ etiqueta, rol, interior = '', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [borde, setBorde] = useState({ izq: false, der: false });
  const [arrastrando, setArrastrando] = useState(false);
  const arr = useRef({ activo: false, x: 0, left: 0, movido: false });
  const medir = () => {
    const el = ref.current;
    if (!el) return;
    setBorde({ izq: el.scrollLeft > 6, der: el.scrollLeft + el.clientWidth < el.scrollWidth - 6 });
  };
  useEffect(() => {
    medir();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);
  const mover = (d: number) => ref.current?.scrollBy({ left: d * Math.max(180, (ref.current?.clientWidth || 300) * 0.7), behavior: 'smooth' });
  const mascara = `linear-gradient(90deg, ${borde.izq ? 'transparent 0, #000 28px' : '#000 0'}, ${borde.der ? '#000 calc(100% - 28px), transparent 100%' : '#000 100%'})`;
  return (
    <div className="relative -mx-4">
      <div
        ref={ref}
        role={rol}
        aria-label={etiqueta}
        tabIndex={0}
        onScroll={medir}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); } }}
        onMouseDown={(e) => { if (e.button !== 0 || !ref.current) return; arr.current = { activo: true, x: e.clientX, left: ref.current.scrollLeft, movido: false }; }}
        onMouseMove={(e) => {
          const a = arr.current;
          if (!a.activo || !ref.current) return;
          const dx = e.clientX - a.x;
          if (!a.movido && Math.abs(dx) > 5) { a.movido = true; setArrastrando(true); }
          if (a.movido) ref.current.scrollLeft = a.left - dx;
        }}
        onMouseUp={() => { arr.current.activo = false; setArrastrando(false); }}
        onMouseLeave={() => { arr.current.activo = false; setArrastrando(false); }}
        onClickCapture={(e) => { if (arr.current.movido) { e.stopPropagation(); e.preventDefault(); arr.current.movido = false; } }}
        className={`tira sin-barra flex overflow-x-auto px-4 ${arrastrando ? 'arrastrando' : ''} ${interior}`}
        style={{ WebkitMaskImage: mascara, maskImage: mascara }}
      >
        {children}
      </div>
      {borde.izq && <button type="button" className="flecha izq" aria-label={`${etiqueta}: anterior`} onClick={() => mover(-1)}><Icono d={D_IZQ} className="h-4 w-4" /></button>}
      {borde.der && <button type="button" className="flecha der" aria-label={`${etiqueta}: siguiente`} onClick={() => mover(1)}><Icono d={D_DER} className="h-4 w-4" /></button>}
    </div>
  );
};

const ESTILOS = `
.cat {
  --bg:#F7F1EB; --surface:#FFFFFF; --ink:#241814; --muted:#7B6963; --linea:rgba(36,24,20,.08); --hueco:#EFE5DC;
  --acento:#AE5B45; --acento2:#D48B77; --oro:#E4C690; --vidrio:rgba(255,255,255,.7); --sombra:0 20px 44px -24px rgba(80,40,26,.5);
  background:radial-gradient(900px 460px at 92% -6%, rgba(228,198,144,.42), transparent 62%), radial-gradient(760px 420px at -12% 6%, rgba(212,139,119,.28), transparent 58%), var(--bg); background-attachment:fixed;
  color:var(--ink); min-height:100vh; min-height:100dvh;
  font-family: ui-sans-serif, system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent; touch-action:manipulation; overscroll-behavior-y:contain;
}
.cat.oscuro { --bg:#0F0908; --surface:#1B1311; --ink:#FFF7F2; --muted:#CDBBB1; --linea:rgba(255,255,255,.16); --hueco:#2E221E; --vidrio:rgba(40,29,25,.76); --sombra:0 20px 44px -22px rgba(0,0,0,.9);
  background:radial-gradient(900px 460px at 92% -6%, rgba(174,91,69,.30), transparent 62%), radial-gradient(760px 420px at -12% 6%, rgba(228,198,144,.12), transparent 58%), var(--bg); background-attachment:fixed; }
.cat button, .cat input, .cat select, .cat textarea { font-family: inherit; }
.cat input, .cat select { font-size:16px; } /* evita el zoom automático de iOS al enfocar */
.cat .vidrio { background:var(--vidrio); backdrop-filter:blur(16px) saturate(1.5); -webkit-backdrop-filter:blur(16px) saturate(1.5); border:1px solid rgba(255,255,255,.32); }
.cat.oscuro .vidrio { border-color:rgba(255,255,255,.2); }
.cat .tarjeta { background:var(--surface); border:1px solid var(--linea); box-shadow:var(--sombra); }
.cat .sin-barra::-webkit-scrollbar { display:none; } .cat .sin-barra { scrollbar-width:none; }
@keyframes catPulso { 0%,100% { stroke-opacity:.5 } 50% { stroke-opacity:1 } }
@keyframes catEntra { from { opacity:0; transform:scale(.985) translateY(6px) } to { opacity:1; transform:none } }
@keyframes catPop { 0% { transform:scale(.4) } 60% { transform:scale(1.18) } 100% { transform:scale(1) } }
@keyframes catBrillo { 0% { background-position:-200px 0 } 100% { background-position:200px 0 } }
.cat .contorno-libre { animation:catPulso 2.6s ease-in-out infinite; }
.cat .entra { animation:catEntra .38s cubic-bezier(.2,.8,.2,1) both; }
.cat .pop { animation:catPop .34s cubic-bezier(.2,.9,.3,1.3) both; }
.cat .esqueleto { background:linear-gradient(90deg,var(--hueco) 0,rgba(255,255,255,.5) 50%,var(--hueco) 100%); background-size:400px 100%; animation:catBrillo 1.3s linear infinite; }
.cat .boton-acento { background:linear-gradient(135deg,var(--acento2),var(--acento)); color:#fff; box-shadow:0 10px 24px -10px rgba(168,99,79,.8); }
.cat .boton-acento:active { transform:scale(.97); }
@keyframes catLatido { 0%,100% { transform:scale(1); box-shadow:0 10px 24px -10px rgba(168,99,79,.8), 0 0 0 0 rgba(198,129,115,.55); } 50% { transform:scale(1.045); box-shadow:0 14px 30px -10px rgba(168,99,79,.9), 0 0 0 11px rgba(198,129,115,0); } }
@keyframes catReflejo { 0% { transform:translateX(-140%) skewX(-22deg); } 55%,100% { transform:translateX(320%) skewX(-22deg); } }
.cat .latido { position:relative; overflow:hidden; animation:catLatido 1.7s ease-in-out infinite; }
.cat .latido::after { content:''; position:absolute; top:0; bottom:0; left:0; width:38%; pointer-events:none; background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent); animation:catReflejo 2.9s ease-in-out infinite; }
.cat .latido:active { animation-play-state:paused; transform:scale(.97); }
@keyframes catBarrido { from { transform:translateX(-130%) skewX(-18deg); opacity:1; } to { transform:translateX(330%) skewX(-18deg); opacity:.9; } }
.cat .barrido { position:absolute; top:0; bottom:0; left:0; width:42%; pointer-events:none; mix-blend-mode:screen; background:linear-gradient(90deg,transparent,rgba(255,236,190,.65),transparent); animation:catBarrido 1.15s cubic-bezier(.3,.7,.2,1) both; }
.cat .recomendado { background:linear-gradient(135deg,#F6DDA3,#DFBF8B); color:#4A2E22; box-shadow:0 6px 14px -6px rgba(120,80,30,.7); }
.cat .titulo-grad { background:linear-gradient(115deg,var(--ink) 35%,var(--acento) 105%); -webkit-background-clip:text; background-clip:text; color:transparent; }
.cat .chip { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 15px; border-radius:999px; font-size:13px; font-weight:650; white-space:nowrap; cursor:pointer; color:var(--ink); background:var(--vidrio); border:1px solid var(--linea); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); transition:all .25s cubic-bezier(.2,.8,.2,1); flex:0 0 auto; }
.cat .chip:active { transform:scale(.96); }
.cat .chip-on { background:linear-gradient(135deg,var(--acento2),var(--acento)); color:#fff; border-color:transparent; box-shadow:0 10px 22px -10px rgba(174,91,69,.85); }
.cat .chip-n { display:inline-flex; align-items:center; justify-content:center; min-width:19px; height:19px; padding:0 5px; border-radius:999px; font-size:10.5px; font-weight:800; background:var(--hueco); color:var(--acento); }
.cat .chip-on .chip-n { background:rgba(255,255,255,.28); color:#fff; }
.cat .linea-card { position:relative; flex:0 0 auto; width:78px; cursor:pointer; text-align:center; scroll-snap-align:start; }
.cat .linea-foto { display:block; overflow:hidden; border-radius:20px; transition:all .3s cubic-bezier(.2,.8,.2,1); }
.cat .flecha { display:none; position:absolute; top:50%; z-index:5; width:34px; height:34px; margin-top:-17px; align-items:center; justify-content:center; border-radius:999px; cursor:pointer; color:var(--ink); background:var(--vidrio); border:1px solid var(--linea); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); box-shadow:0 8px 18px -8px rgba(0,0,0,.35); transition:transform .2s, opacity .2s; }
.cat .flecha:hover { transform:scale(1.08); }
.cat .flecha.izq { left:8px; } .cat .flecha.der { right:8px; }
@media (hover:hover) and (pointer:fine) { .cat .flecha { display:flex; } .cat .tira { cursor:grab; } .cat .tira.arrastrando { cursor:grabbing; user-select:none; } .cat .tira.arrastrando * { pointer-events:none; } }
.cat .hoja-fondo { position:fixed; inset:0; z-index:40; background:rgba(15,9,8,.55); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); animation:catEntra .25s both; }
.cat .hoja { position:fixed; left:0; right:0; bottom:0; z-index:41; margin:0 auto; max-width:640px; max-height:88dvh; display:flex; flex-direction:column; border-radius:30px 30px 0 0; background:var(--bg); box-shadow:0 -24px 60px -20px rgba(0,0,0,.5); animation:catSube .32s cubic-bezier(.2,.8,.2,1) both; padding-bottom:env(safe-area-inset-bottom); }
@keyframes catSube { from { transform:translateY(40px); opacity:0 } to { transform:none; opacity:1 } }
@media (prefers-reduced-motion: reduce) { .cat * { animation:none !important; transition:none !important; } }
`;

export const Catalogo: React.FC = () => {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [productos, setProductos] = useState<Record<string, Producto>>({});
  const [presentaciones, setPresentaciones] = useState<Record<string, Presentacion[]>>({});
  const [activaId, setActivaId] = useState<string>('');
  const [seleccion, setSeleccion] = useState<Record<string, ItemSel>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Tema: claro por defecto; la elección se recuerda en este teléfono
  const [oscuro, setOscuro] = useState<boolean>(() => {
    try { return localStorage.getItem('amore_tema_catalogo') === 'oscuro'; } catch { return false; }
  });
  const cambiarTema = () => {
    setOscuro((v) => {
      try { localStorage.setItem('amore_tema_catalogo', v ? 'claro' : 'oscuro'); } catch {}
      return !v;
    });
  };
  const [marcaFiltro, setMarcaFiltro] = useState<string>('todas');
  const [verTodas, setVerTodas] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  useEscapeCierra(verTodas, () => setVerTodas(false));
  // El carrusel de líneas se centra en la línea activa (también al cargar la página)
  useEffect(() => { if (!cargando && activaId) window.setTimeout(() => document.getElementById(`linea-${activaId}`)?.scrollIntoView({ inline: 'center', block: 'nearest' }), 80); }, [cargando, activaId]);
  // La fila de marcas sigue a la marca activa
  useEffect(() => { document.getElementById(`marca-${marcaFiltro}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, [marcaFiltro]);
  const [despachoUrl, setDespachoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!despachoUrl) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setDespachoUrl(null); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [despachoUrl]);
  const [barrido, setBarrido] = useState(0); // cuenta de veces que se eligió el kit completo (dispara el barrido de luz)
  const cestaRef = useRef<HTMLElement | null>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);

  // Ajustes de página móvil: título y área segura (notch) mientras se ve el catálogo
  useEffect(() => {
    const titulo = document.title;
    document.title = 'Catálogo · Amore Salón';
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute('content') || '';
    if (meta && !/viewport-fit/.test(original)) meta.setAttribute('content', `${original}, viewport-fit=cover`);
    return () => {
      document.title = titulo;
      if (meta) meta.setAttribute('content', original);
    };
  }, []);

  // Carga de todas las rutinas y sus productos (lectura pública)
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { data: rs, error: eR } = await supabase.from('rutinas').select('*').order('orden');
        if (eR) throw eR;
        if (!rs || rs.length === 0) throw new Error('No hay rutinas disponibles por ahora.');
        const rutinaIds = rs.map((r: Rutina) => r.id);
        const { data: pz, error: eP } = await supabase.from('rutina_piezas').select('*').in('rutina_id', rutinaIds).order('orden');
        if (eP) throw eP;
        const ids = Array.from(new Set((pz || []).map((p: Pieza) => p.producto_id)));
        const { data: prods, error: eD } = await supabase.from('productos').select('*').in('id', ids);
        if (eD) throw eD;
        const { data: pres, error: eS } = await supabase.from('presentaciones').select('*').in('producto_id', ids).order('orden');
        if (eS) throw eS;

        if (!activo) return;
        const porProducto: Record<string, Presentacion[]> = {};
        // Stock: una presentación agotada (modo cantidad con 0) no se ofrece; sin presentaciones disponibles el producto figura agotado
        (pres || []).forEach((x: Presentacion) => { if (x.stock_modo === 'cantidad' && (x.stock_cantidad ?? 0) <= 0) return; (porProducto[x.producto_id] ||= []).push(x); });
        const mapaProductos: Record<string, Producto> = Object.fromEntries((prods || []).map((p: Producto) => [p.id, { ...p, disponible: p.disponible && (porProducto[p.id] || []).length > 0 }]));
        setRutinas(rs as Rutina[]);
        setPiezas((pz || []) as Pieza[]);
        setProductos(mapaProductos);
        setPresentaciones(porProducto);

        const idEnlace = window.location.pathname.replace(/^\/catalogo\/?/, '').split('/')[0];
        setActivaId((rs as Rutina[]).some((r) => r.id === idEnlace) ? idEnlace : (rs as Rutina[])[0].id);

        // Cesta guardada en este teléfono (se valida contra lo que existe hoy)
        try {
          const guardada = JSON.parse(localStorage.getItem(CLAVE_CESTA) || '{}') as Record<string, ItemSel>;
          const valida: Record<string, ItemSel> = {};
          Object.entries(guardada).forEach(([pid, it]) => {
            const prod = mapaProductos[pid];
            const lista = porProducto[pid] || [];
            if (!prod || !prod.disponible || lista.length === 0) return;
            const pr = lista.find((x) => x.id === it.presentacionId) || lista[0];
            valida[pid] = { presentacionId: pr.id, cantidad: Math.min(9, Math.max(1, Number(it.cantidad) || 1)) };
          });
          setSeleccion(valida);
        } catch {}
      } catch (e: any) {
        if (activo) setError(e?.message || 'No se pudo cargar el catálogo.');
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (cargando) return;
    try { localStorage.setItem(CLAVE_CESTA, JSON.stringify(seleccion)); } catch {}
  }, [seleccion, cargando]);

  // Marca de cada rutina (por sus productos) y listas para el selector de líneas
  const marcaPorRutina = useMemo(() => {
    const m: Record<string, string> = {};
    rutinas.forEach((r) => {
      const pz = piezas.find((p) => p.rutina_id === r.id && productos[p.producto_id]);
      m[r.id] = pz ? productos[pz.producto_id].marca : 'Otras';
    });
    return m;
  }, [rutinas, piezas, productos]);
  const marcas = useMemo(() => {
    const orden: string[] = [];
    rutinas.forEach((r) => { const mk = marcaPorRutina[r.id]; if (mk && !orden.includes(mk)) orden.push(mk); });
    return orden;
  }, [rutinas, marcaPorRutina]);
  const rutinasVisibles = useMemo(() => (marcaFiltro === 'todas' ? rutinas : rutinas.filter((r) => marcaPorRutina[r.id] === marcaFiltro)), [rutinas, marcaFiltro, marcaPorRutina]);
  const textoRutina = useMemo(() => {
    const m: Record<string, string> = {};
    rutinas.forEach((r) => {
      m[r.id] = [r.nombre, marcaPorRutina[r.id], ...piezas.filter((p) => p.rutina_id === r.id).map((p) => productos[p.producto_id]?.nombre || '')].join(' ').toLowerCase();
    });
    return m;
  }, [rutinas, piezas, productos, marcaPorRutina]);
  const activa = rutinas.find((r) => r.id === activaId) || null;
  const indiceActiva = rutinasVisibles.findIndex((r) => r.id === activaId);
  const piezasActiva = useMemo(() => piezas.filter((p) => p.rutina_id === activaId), [piezas, activaId]);
  const piezasOrdenadas = useMemo(() => [...piezasActiva].sort((a, b) => b.zona.w * b.zona.h - a.zona.w * a.zona.h), [piezasActiva]);

  const elegirRutina = (id: string) => {
    setActivaId(id);
    if (marcaFiltro !== 'todas' && marcaPorRutina[id] && marcaPorRutina[id] !== marcaFiltro) setMarcaFiltro(marcaPorRutina[id]);
    window.setTimeout(() => document.getElementById(`linea-${id}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 60);
    try {
      const ref = refDelEnlace();
      window.history.replaceState(null, '', `/catalogo/${id}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`);
    } catch {}
  };
  // Teclado: flechas izquierda/derecha cambian de línea (si no se está escribiendo)
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.getAttribute('role') === 'tablist' || el.classList.contains('tira'))) return;
      if (verTodas || despachoUrl) return;
      if (e.key === 'ArrowRight') irARef.current(1);
      else if (e.key === 'ArrowLeft') irARef.current(-1);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [verTodas, despachoUrl]);
  const irARef = useRef<(d: number) => void>(() => {});
  const irA = (delta: number) => {
    const i = indiceActiva + delta;
    if (i >= 0 && i < rutinasVisibles.length) { elegirRutina(rutinasVisibles[i].id); vibrar(6); }
  };
  irARef.current = irA;

  const seleccionInicial = (p: Pieza): ItemSel => {
    const pres = presentaciones[p.producto_id] || [];
    const inicial = pres.find((x) => x.id === p.presentacion_foto_id) || pres[0];
    return { presentacionId: inicial?.id || '', cantidad: 1 };
  };

  // Un producto puede aparecer dos veces en la foto (p. ej. shampoo de 1 L y de 400 ml): tocar el otro tamaño cambia el tamaño; tocar el elegido lo quita.
  const alternar = (p: Pieza) => {
    const prod = productos[p.producto_id];
    if (!prod || !prod.disponible) return;
    vibrar();
    setSeleccion((prev) => {
      const copia = { ...prev };
      const actual = copia[p.producto_id];
      const variasEnFoto = piezas.filter((x) => x.rutina_id === p.rutina_id && x.producto_id === p.producto_id).length > 1;
      if (actual) {
        if (variasEnFoto && p.presentacion_foto_id && actual.presentacionId !== p.presentacion_foto_id && (presentaciones[p.producto_id] || []).some((x) => x.id === p.presentacion_foto_id)) {
          copia[p.producto_id] = { ...actual, presentacionId: p.presentacion_foto_id };
        } else delete copia[p.producto_id];
      } else copia[p.producto_id] = seleccionInicial(p);
      return copia;
    });
  };
  const quitarProducto = (productoId: string) => { vibrar(); setSeleccion((prev) => { const c = { ...prev }; delete c[productoId]; return c; }); };
  // ¿Esta pieza de la foto está elegida? (con dos tamaños del mismo producto, solo brilla el elegido)
  const piezaMarcada = (p: Pieza): boolean => {
    const sel = seleccion[p.producto_id];
    if (!sel) return false;
    const variasEnFoto = piezas.filter((x) => x.rutina_id === p.rutina_id && x.producto_id === p.producto_id).length > 1;
    return !variasEnFoto || !p.presentacion_foto_id || sel.presentacionId === p.presentacion_foto_id;
  };

  const elegirTodoElKit = () => {
    vibrar(14);
    setBarrido((n) => n + 1);
    setSeleccion((prev) => {
      const copia = { ...prev };
      piezasActiva.forEach((p) => {
        const prod = productos[p.producto_id];
        if (prod && prod.disponible && !copia[p.producto_id]) copia[p.producto_id] = seleccionInicial(p);
      });
      return copia;
    });
  };

  const cambiar = (productoId: string, cambios: Partial<ItemSel>) =>
    setSeleccion((prev) => (prev[productoId] ? { ...prev, [productoId]: { ...prev[productoId], ...cambios } } : prev));

  // Líneas de la cesta (sin repetir productos) y su agrupación por MARCA
  const lineas = useMemo(() => {
    const vistos = new Set<string>();
    const res: { pieza: Pieza; rutina: Rutina; prod: Producto; sel: ItemSel; pres?: Presentacion }[] = [];
    rutinas.forEach((r) => {
      piezas.filter((p) => p.rutina_id === r.id && seleccion[p.producto_id]).forEach((p) => {
        const prod = productos[p.producto_id];
        if (!prod || vistos.has(prod.id)) return;
        vistos.add(prod.id);
        const sel = seleccion[p.producto_id];
        res.push({ pieza: p, rutina: r, prod, sel, pres: (presentaciones[prod.id] || []).find((x) => x.id === sel.presentacionId) });
      });
    });
    return res;
  }, [rutinas, piezas, seleccion, productos, presentaciones]);

  const gruposMarca = useMemo(() => {
    const orden: string[] = [];
    const mapa = new Map<string, typeof lineas>();
    lineas.forEach((l) => {
      if (!mapa.has(l.prod.marca)) { mapa.set(l.prod.marca, []); orden.push(l.prod.marca); }
      mapa.get(l.prod.marca)!.push(l);
    });
    return orden.map((m) => ({ marca: m, lineas: mapa.get(m)! }));
  }, [lineas]);

  const cantidadTotal = lineas.reduce((s, l) => s + l.sel.cantidad, 0);
  const todosConPrecio = lineas.length > 0 && lineas.every((l) => l.pres?.precio_sugerido != null);
  const totalSugerido = todosConPrecio ? lineas.reduce((s, l) => s + (l.pres!.precio_sugerido as number) * l.sel.cantidad, 0) : null;
  const disponiblesActiva = Array.from(new Set(piezasActiva.filter((p) => productos[p.producto_id]?.disponible).map((p) => p.producto_id))).length;
  const productosActiva = Array.from(new Set(piezasActiva.map((p) => p.producto_id)));
  const elegidasActiva = productosActiva.filter((id) => seleccion[id]).length;
  const cantidadPorRutina = (id: string) => new Set(piezas.filter((p) => p.rutina_id === id && seleccion[p.producto_id]).map((p) => p.producto_id)).size;
  const cantidadPorMarca = (marca: string) => rutinas.filter((r) => marcaPorRutina[r.id] === marca).reduce((s, r) => s + cantidadPorRutina(r.id), 0);

  const consultar = async (destino: 'whatsapp' | 'despacho' = 'whatsapp') => {
    if (lineas.length === 0) return;
    setEnviando(true);
    setError('');
    const ref = refDelEnlace();
    const snapshot = lineas.map((l) => ({
      producto_id: l.prod.id,
      producto: l.prod.nombre,
      marca: l.prod.marca,
      rutina: nombreCorto(l.rutina),
      presentacion_id: l.pres?.id || null,
      presentacion: l.pres?.etiqueta || null,
      cantidad: l.sel.cantidad,
      precio_sugerido: l.pres?.precio_sugerido ?? null,
    }));

    let codigo = '';
    try {
      const { data: id } = await supabase.rpc('siguiente_consulta_id');
      if (typeof id === 'string' && id) {
        const { error: eI } = await supabase.from('consultas').insert([{
          id,
          nombre: nombre.trim() || null,
          telefono: telefono.replace(/\D/g, '') || null,
          rutina_id: lineas[0]?.rutina.id ?? null,
          ref: ref || null,
          estado: 'nueva',
          seleccion: snapshot,
          total_sugerido: totalSugerido,
        }]);
        if (!eI) codigo = id;
      }
    } catch {}

    const detalle = gruposMarca
      .map((g) => `*${g.marca}*\n${g.lineas.map((l) => `• ${l.sel.cantidad} × ${l.prod.nombre}${l.pres ? ` (${l.pres.etiqueta})` : ''}`).join('\n')}`)
      .join('\n\n');
    // Mensaje para la asesora: se envía normalmente tras un saludo o consulta previa por WhatsApp
    const nombresLineas = Array.from(new Set(lineas.map((l) => nombreCorto(l.rutina))));
    const deLineas = nombresLineas.length === 0 ? '' : nombresLineas.length === 1 ? ` de ${nombresLineas[0]}` : ` de ${nombresLineas.slice(0, 2).join(' y ')}${nombresLineas.length > 2 ? ` y ${nombresLineas.length - 2} más` : ''}`;
    const quien = nombre.trim() ? `Hola 👋 soy ${nombre.trim()}.` : 'Hola 👋';
    const registro = codigo ? `Registré la cotización *${codigo}*${deLineas} en el catálogo de Amore:` : `Armé mi selección${deLineas} en el catálogo de Amore:`;
    const mensaje = `${quien} ${registro}\n\n${detalle}\n\n¿Me confirmas el precio total y el costo de envío? 🙌${ref ? `\n(ref. ${ref})` : ''}`;
    setEnviando(false);
    if (destino === 'despacho') {
      // Abre el formulario de despacho encima del catálogo (la cotización ya quedó registrada)
      const q = new URLSearchParams();
      if (codigo) q.set('c', codigo);
      if (ref) q.set('ref', ref);
      q.set('items', lineas.map((l) => `${l.sel.cantidad} × ${l.prod.nombre}${l.pres ? ` (${l.pres.etiqueta})` : ''}`).join('; ').slice(0, 300));
      setDespachoUrl(`/pedidos?${q.toString()}`);
      return;
    }
    window.location.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  };

  const alTocar = (e: React.TouchEvent) => { toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const alSoltar = (e: React.TouchEvent) => {
    const t = toque.current;
    toque.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 64 && Math.abs(dy) < 44) irA(dx < 0 ? 1 : -1);
  };

  /* ---------- Estados de carga / error ---------- */
  if (cargando) {
    return (
      <div className={`cat${oscuro ? ' oscuro' : ''}`}>
        <style>{ESTILOS}</style>
        <div className="mx-auto max-w-md px-4 pt-6">
          <div className="esqueleto h-5 w-24 rounded-full" />
          <div className="esqueleto mt-6 h-8 w-56 rounded-xl" />
          <div className="mt-5 grid grid-cols-1 gap-3">
            <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="esqueleto h-[38px] w-24 rounded-full" />)}</div>
            <div className="esqueleto aspect-[3/4] rounded-[28px]" />
          </div>
        </div>
      </div>
    );
  }
  if (!activa) {
    return (
      <div className={`cat${oscuro ? ' oscuro' : ''} flex items-center justify-center px-8 text-center text-sm`} style={{ color: 'var(--muted)' }}>
        <style>{ESTILOS}</style>
        {error || 'Catálogo no disponible.'}
      </div>
    );
  }

  const W = activa.ancho_foto || 1000;
  const H = activa.alto_foto || 1333;
  const irACesta = () => cestaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className={`cat${oscuro ? ' oscuro' : ''}`}>
      <style>{ESTILOS}</style>

      {/* Encabezado mínimo */}
      <header className="mx-auto flex max-w-md items-center justify-between px-4 pt-[max(10px,env(safe-area-inset-top))] md:max-w-4xl">
        <a href="/catalogo" aria-label="Amore Hair Style Studio, inicio del catálogo" className="block">
          <img src={oscuro ? LOGO_OSCURO : LOGO_CLARO} alt="Amore Hair Style Studio" className="h-[62px] w-auto select-none" style={{ mixBlendMode: oscuro ? 'screen' : 'multiply', filter: oscuro ? 'none' : 'brightness(1.07) contrast(1.12)' }} draggable={false} />
        </a>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cambiarTema}
          aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="vidrio flex h-11 w-11 items-center justify-center rounded-full cursor-pointer"
        >
          <Icono d={oscuro ? D_SOL : D_LUNA} />
        </button>
        <button
          type="button"
          onClick={irACesta}
          aria-label={`Ver cesta, ${cantidadTotal} producto(s)`}
          className="vidrio relative flex h-11 w-11 items-center justify-center rounded-full cursor-pointer"
        >
          <Icono d={D_BOLSA} />
          {cantidadTotal > 0 && (
            <span key={cantidadTotal} className="pop absolute -right-0.5 -top-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white boton-acento">{cantidadTotal}</span>
          )}
        </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-40 md:max-w-4xl md:grid md:grid-cols-[1fr_360px] md:gap-8">
        <div>
          <div className="px-1 pb-4 pt-5">
            <h1 className="titulo-grad text-[30px] font-extrabold leading-[1.08] tracking-tight">Arma tu rutina</h1>
            <p className="mt-1.5 text-[14px] leading-snug" style={{ color: 'var(--muted)' }}>Toca los productos que quieres. Puedes combinar marcas.</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Selector: marcas (chips) + líneas de la marca (carrusel horizontal) + hoja "Ver todas" */}
            <div>
              <Tira etiqueta="Marcas" rol="tablist" interior="gap-2 pb-1">
                {['todas', ...marcas].map((m) => {
                  const activo = marcaFiltro === m;
                  const n = m === 'todas' ? cantidadTotal : cantidadPorMarca(m);
                  return (
                    <button key={m} id={`marca-${m}`} type="button" role="tab" aria-selected={activo} onClick={() => { setMarcaFiltro(m); vibrar(6); const primera = (m === 'todas' ? rutinas : rutinas.filter((r) => marcaPorRutina[r.id] === m))[0]; if (primera && marcaPorRutina[activaId] !== m && m !== 'todas') elegirRutina(primera.id); }} className={`chip${activo ? ' chip-on' : ''}`}>
                      {m === 'todas' ? 'Todas' : m}
                      {n > 0 && <span className="chip-n">{n}</span>}
                    </button>
                  );
                })}
                <button type="button" onClick={() => { setBusqueda(''); setVerTodas(true); vibrar(8); }} className="chip" aria-label="Ver todas las líneas y buscar">
                  <Icono d={D_REJILLA} className="h-4 w-4" /> Ver todas <span className="chip-n">{rutinas.length}</span>
                </button>
              </Tira>
              <div className="mt-2.5"><Tira etiqueta="Líneas" interior="gap-2.5 pb-2 pt-1">
                {rutinasVisibles.map((r) => {
                  const n = cantidadPorRutina(r.id);
                  const esActiva = r.id === activaId;
                  return (
                    <button key={r.id} id={`linea-${r.id}`} type="button" onClick={() => { elegirRutina(r.id); vibrar(6); }} aria-current={esActiva} aria-label={`${nombreCorto(r)}${n ? `, ${n} elegidos` : ''}`} className="linea-card">
                      <span className="linea-foto" style={{ boxShadow: esActiva ? '0 0 0 2px var(--bg), 0 0 0 4px var(--acento)' : '0 0 0 1px var(--linea)', opacity: esActiva ? 1 : 0.7, transform: esActiva ? 'scale(1)' : 'scale(.95)' }}>
                        <img src={r.foto_url} alt="" className="aspect-[3/4] w-full object-cover" draggable={false} loading="lazy" />
                      </span>
                      <span className="mt-1.5 line-clamp-2 block text-[10.5px] font-semibold leading-tight" style={{ color: esActiva ? 'var(--ink)' : 'var(--muted)' }}>{nombreCorto(r)}</span>
                      {n > 0 && <span key={n} className="pop boton-acento absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">{n}</span>}
                    </button>
                  );
                })}
              </Tira></div>
            </div>

            {/* Escena de la rutina activa */}
            <div className="min-w-0" onTouchStart={alTocar} onTouchEnd={alSoltar}>
              <div key={activa.id} className="entra relative overflow-hidden rounded-[28px] shadow-[var(--sombra)]" style={{ aspectRatio: `${W} / ${H}`, background: 'var(--hueco)' }}>
                <img src={activa.foto_url} alt={activa.nombre} className="absolute inset-0 h-full w-full select-none object-cover" draggable={false} />
                {barrido > 0 && <div key={barrido} className="barrido" aria-hidden="true" />}
                {indiceActiva > 0 && <button type="button" className="flecha izq" aria-label="Línea anterior" onClick={() => irA(-1)}><Icono d={D_IZQ} className="h-4 w-4" /></button>}
                {indiceActiva >= 0 && indiceActiva < rutinasVisibles.length - 1 && <button type="button" className="flecha der" aria-label="Línea siguiente" onClick={() => irA(1)}><Icono d={D_DER} className="h-4 w-4" /></button>}

                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="group" aria-label="Productos de la rutina">
                  <defs>
                    <linearGradient id="catSel" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFE9B8" />
                      <stop offset="100%" stopColor="#F2B6A5" />
                    </linearGradient>
                  </defs>
                  {piezasOrdenadas.map((p) => {
                    const prod = productos[p.producto_id];
                    if (!prod) return null;
                    const marcado = piezaMarcada(p);
                    const trazo = trazoContorno(p.zona, W, H);
                    const agotado = !prod.disponible;
                    return (
                      <g
                        key={p.id}
                        role="button"
                        tabIndex={agotado ? -1 : 0}
                        aria-pressed={marcado}
                        aria-label={`${marcado ? 'Quitar' : 'Elegir'} ${prod.nombre}`}
                        aria-disabled={agotado}
                        onClick={() => alternar(p)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(p); } }}
                        style={{ cursor: agotado ? 'not-allowed' : 'pointer', outline: 'none', opacity: agotado ? 0.4 : 1 }}
                      >
                        <path d={trazo} fill="transparent" stroke="transparent" strokeWidth={26} vectorEffect="non-scaling-stroke" pointerEvents="all" />
                        <path
                          d={trazo}
                          className={marcado ? '' : 'contorno-libre'}
                          fill={marcado ? 'rgba(255,226,170,0.20)' : 'rgba(255,255,255,0.03)'}
                          stroke={marcado ? 'url(#catSel)' : 'rgba(255,255,255,0.92)'}
                          strokeWidth={marcado ? 3 : 1.4}
                          strokeDasharray={marcado ? undefined : '6 6'}
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          pointerEvents="none"
                          style={{
                            transition: 'all .3s cubic-bezier(.2,.8,.2,1)',
                            filter: marcado ? 'drop-shadow(0 0 8px rgba(255,214,140,.9)) drop-shadow(0 0 2px rgba(242,182,165,.9))' : 'drop-shadow(0 0 1.5px rgba(0,0,0,.35))',
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Insignias de vidrio */}
                {piezasActiva.map((p) => {
                  const prod = productos[p.producto_id];
                  if (!prod) return null;
                  const marcado = piezaMarcada(p);
                  return (
                    <span
                      key={`b-${p.id}-${marcado}`}
                      aria-hidden="true"
                      className={`${marcado ? 'pop boton-acento' : 'vidrio'} pointer-events-none absolute flex h-[22px] w-[22px] items-center justify-center rounded-full`}
                      style={{ left: `calc(${(p.zona.x + p.zona.w) * 100}% - 26px)`, top: `calc(${p.zona.y * 100}% + 4px)`, color: marcado ? '#fff' : 'var(--ink)' }}
                    >
                      <Icono d={marcado ? D_CHECK : D_MAS} className="h-3 w-3" />
                    </span>
                  );
                })}

                {/* Etiqueta y acción en vidrio */}
                <div className="vidrio pointer-events-none absolute left-2.5 top-2.5 max-w-[62%] truncate rounded-full px-3 py-1.5 text-[11px] font-semibold">{nombreCorto(activa)}</div>
                {disponiblesActiva > 0 && elegidasActiva < disponiblesActiva && (
                  <div className="group absolute bottom-2.5 right-2.5">
                    {/* Mensaje al pasar el cursor o enfocar (en el celular se ve la etiqueta "Dcto. exclusivo") */}
                    <span id="tip-kit" role="tooltip" className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 rounded-2xl px-3.5 py-2.5 text-[12px] font-medium leading-snug opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
                      {TEXTO_KIT}
                    </span>
                    <span className="recomendado pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[9px] font-extrabold uppercase tracking-[0.14em]">★ Recomendado</span>
                    <button type="button" onClick={elegirTodoElKit} className="boton-acento latido flex cursor-pointer flex-col items-center rounded-full px-4 py-2 leading-tight">
                      <span className="text-[12px] font-bold">Kit completo</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#FFE9B8]">Dcto. exclusivo</span>
                    </button>
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>

        {/* Cesta agrupada por marca */}
        <section ref={cestaRef} aria-label="Tu cesta" className="mt-8 scroll-mt-4 md:sticky md:top-4 md:mt-[84px] md:self-start">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-[19px] font-bold tracking-tight">Tu cesta</h2>
            {lineas.length > 0 && (
              <button type="button" onClick={() => { setSeleccion({}); vibrar(10); }} className="cursor-pointer py-2 text-[13px] font-medium" style={{ color: 'var(--muted)' }}>Vaciar</button>
            )}
          </div>

          {gruposMarca.length === 0 ? (
            <div className="mt-2 rounded-[24px] px-5 py-7 text-center" style={{ background: 'var(--surface)', border: '1px dashed var(--linea)' }}>
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--hueco)', color: 'var(--acento)' }}><Icono d={D_BOLSA} /></span>
              <p className="mt-3 text-[14px] font-medium">Tu cesta está vacía</p>
              <p className="mt-0.5 text-[13px]" style={{ color: 'var(--muted)' }}>Toca un producto en la foto para sumarlo.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {gruposMarca.map((g) => (
                <div key={g.marca}>
                  <div className="mb-1.5 flex items-center justify-between px-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--acento)' }}>{g.marca}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{g.lineas.reduce((s, l) => s + l.sel.cantidad, 0)} und.</p>
                  </div>
                  <ul className="tarjeta overflow-hidden rounded-[24px]">
                    {g.lineas.map(({ pieza, prod, sel, rutina }, i) => {
                      const pres = presentaciones[prod.id] || [];
                      return (
                        <li key={pieza.id} className="entra flex gap-3 px-3 py-3" style={{ borderTop: i ? '1px solid var(--linea)' : 'none' }}>
                          <Miniatura foto={rutina.foto_url} zona={pieza.zona} ancho={rutina.ancho_foto || 1000} alto={rutina.alto_foto || 1333} />
                          <div className="min-w-0 flex-1">
                            {/* Nombre completo (puede ocupar 2 líneas) y botón de quitar */}
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-[14px] font-semibold leading-snug" style={{ overflowWrap: 'anywhere' }}>{prod.nombre}</p>
                              <button type="button" aria-label={`Quitar ${prod.nombre}`} onClick={() => quitarProducto(prod.id)} title="Quitar de la cesta" className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[var(--hueco)]" style={{ color: 'var(--muted)' }}>
                                <Icono d={D_TACHO} className="h-[17px] w-[17px]" />
                              </button>
                            </div>
                            {/* Tamaño y cantidad en su propia línea */}
                            <div className="mt-1 flex items-center justify-between gap-2">
                              {pres.length > 1 ? (
                                <select
                                  value={sel.presentacionId}
                                  onChange={(e) => cambiar(prod.id, { presentacionId: e.target.value })}
                                  className="min-w-0 max-w-[58%] rounded-full py-1.5 pl-3 pr-2 text-[13px] font-medium"
                                  style={{ background: 'var(--hueco)', color: 'var(--ink)', border: 'none' }}
                                  aria-label={`Tamaño de ${prod.nombre}`}
                                >
                                  {pres.map((x) => (
                                    <option key={x.id} value={x.id}>{x.etiqueta}{x.precio_sugerido != null ? ` · ref. ${dinero(x.precio_sugerido)}` : ''}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="min-w-0 text-[13px]" style={{ color: 'var(--muted)' }}>{pres[0]?.etiqueta}{pres[0]?.precio_sugerido != null && ` · ref. ${dinero(pres[0].precio_sugerido)}`}</span>
                              )}
                              <div className="flex shrink-0 items-center rounded-full" style={{ background: 'var(--hueco)' }}>
                                <button type="button" aria-label="Menos" onClick={() => { cambiar(prod.id, { cantidad: Math.max(1, sel.cantidad - 1) }); vibrar(6); }} className="h-9 w-9 cursor-pointer text-[18px] font-medium leading-none">−</button>
                                <span className="w-4 text-center text-[14px] font-semibold tabular-nums">{sel.cantidad}</span>
                                <button type="button" aria-label="Más" onClick={() => { cambiar(prod.id, { cantidad: Math.min(9, sel.cantidad + 1) }); vibrar(6); }} className="h-9 w-9 cursor-pointer text-[18px] font-medium leading-none">+</button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Datos opcionales */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
              enterKeyHint="next"
              className="h-12 rounded-2xl px-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--linea)', color: 'var(--ink)' }}
            />
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Tu WhatsApp"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              className="h-12 rounded-2xl px-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--linea)', color: 'var(--ink)' }}
            />
          </div>
          <p className="mt-2 px-1 text-[12px]" style={{ color: 'var(--muted)' }}>Opcional. Tu asesora te responde por WhatsApp y confirma el precio final.</p>
          {lineas.length > 0 && (<button type="button" onClick={() => consultar('despacho')} disabled={enviando} className="mt-3 w-full cursor-pointer rounded-2xl py-3 text-[14px] font-semibold disabled:opacity-50" style={{ background: 'var(--hueco)', color: 'var(--ink)' }}>Confirmar mi pedido ahora →</button>)}
          {error && <p className="mt-3 text-center text-[13px] text-red-600">{error}</p>}
        </section>
      </main>

      {/* Barra flotante de vidrio */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 px-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="vidrio pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-[30px] p-2.5 pl-4 shadow-[var(--sombra)] md:max-w-4xl">
          <button type="button" onClick={irACesta} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" aria-label="Ir a la cesta">
            {lineas.length > 0 && (
              <span className="hidden shrink-0 -space-x-2.5 min-[400px]:flex">
                {lineas.slice(0, 3).map((l) => (
                  <span key={l.prod.id} className="rounded-full" style={{ boxShadow: '0 0 0 2px var(--surface)' }}>
                    <Miniatura foto={l.rutina.foto_url} zona={l.pieza.zona} ancho={l.rutina.ancho_foto || 1000} alto={l.rutina.alto_foto || 1333} lado={34} clase="rounded-full" />
                  </span>
                ))}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold leading-tight">
                {lineas.length === 0 ? 'Cesta vacía' : `${cantidadTotal} producto${cantidadTotal > 1 ? 's' : ''}`}
              </span>
              <span className="block truncate text-[12px] leading-tight" style={{ color: 'var(--muted)' }}>
                {lineas.length === 0 ? 'Elige en la foto' : totalSugerido != null ? `Ref. ${dinero(totalSugerido)}` : 'Precio por confirmar'}
              </span>
            </span>
          </button>
          <button
            type="button"
            id="consultar-whatsapp-btn"
            onClick={() => consultar('whatsapp')}
            disabled={lineas.length === 0 || enviando}
            className={`boton-acento ${lineas.length > 0 && !enviando ? 'latido' : ''} flex h-[50px] shrink-0 cursor-pointer items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-transform disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}
          >
            <Icono d={D_WSP} className="h-[18px] w-[18px]" />
            {enviando ? 'Enviando…' : 'Pedir cotización'}
          </button>
        </div>
      </div>
      {despachoUrl && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }} role="dialog" aria-label="Confirmar pedido">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[15px] font-semibold">Confirmar pedido</p>
            <button type="button" onClick={() => setDespachoUrl(null)} aria-label="Cerrar" className="h-10 w-10 cursor-pointer rounded-full text-xl leading-none" style={{ background: 'var(--hueco)' }}>×</button>
          </div>
          <iframe src={despachoUrl} title="Confirmar pedido" className="min-h-0 w-full flex-1 border-0" />
        </div>
      )}
      {verTodas && (() => {
        const q = busqueda.trim().toLowerCase();
        const lista = rutinas.filter((r) => !q || textoRutina[r.id]?.includes(q));
        const porMarca = marcas.map((m) => ({ marca: m, items: lista.filter((r) => marcaPorRutina[r.id] === m) })).filter((g) => g.items.length > 0);
        return (
          <>
            <div className="hoja-fondo" onClick={() => setVerTodas(false)} aria-hidden="true" />
            <div className="hoja" role="dialog" aria-modal="true" aria-label="Todas las líneas">
              <div className="flex items-center justify-between px-5 pb-2 pt-4">
                <p className="text-[18px] font-bold tracking-tight">Todas las líneas</p>
                <button type="button" onClick={() => setVerTodas(false)} aria-label="Cerrar" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full" style={{ background: 'var(--hueco)' }}><Icono d={D_X} className="h-4 w-4" /></button>
              </div>
              <div className="px-5 pb-3">
                <label className="flex h-12 items-center gap-2.5 rounded-2xl px-4" style={{ background: 'var(--surface)', border: '1px solid var(--linea)' }}>
                  <span style={{ color: 'var(--muted)' }}><Icono d={D_BUSCAR} className="h-[18px] w-[18px]" /></span>
                  <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Busca por marca, línea o producto…" aria-label="Buscar línea" className="min-w-0 flex-1 bg-transparent outline-none" style={{ color: 'var(--ink)' }} />
                </label>
              </div>
              <div className="sin-barra overflow-y-auto px-5 pb-6">
                {porMarca.length === 0 && <p className="py-10 text-center text-[14px]" style={{ color: 'var(--muted)' }}>No encontramos esa línea. Prueba con otra palabra.</p>}
                <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                  {porMarca.flatMap((g) => g.items).map((r) => {
                    const n = cantidadPorRutina(r.id);
                    const esActiva = r.id === activaId;
                    return (
                      <button key={r.id} type="button" onClick={() => { setMarcaFiltro(marcaPorRutina[r.id]); elegirRutina(r.id); setVerTodas(false); vibrar(8); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="relative cursor-pointer text-center">
                        <span className="block overflow-hidden rounded-[20px]" style={{ boxShadow: esActiva ? '0 0 0 2px var(--bg), 0 0 0 4px var(--acento)' : '0 0 0 1px var(--linea)' }}>
                          <img src={r.foto_url} alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" draggable={false} />
                        </span>
                        <span className="mt-1.5 block truncate text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--acento)' }}>{marcaPorRutina[r.id]}</span>
                        <span className="line-clamp-2 block text-[11.5px] font-semibold leading-tight">{nombreCorto(r)}</span>
                        {n > 0 && <span className="boton-acento absolute -right-1 -top-1 flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold text-white">{n}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};
