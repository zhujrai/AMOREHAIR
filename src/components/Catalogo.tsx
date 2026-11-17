import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { trazoContorno, ZonaCatalogo } from '../utils/contornos';

/**
 * Catálogo por escenas — diseño móvil primero (iPhone y Android), minimalista.
 * - Carrusel vertical de rutinas (también se cambia deslizando la foto).
 * - Cada producto se elige tocando su contorno luminoso sobre la foto del kit.
 * - Cesta única agrupada por marca; barra flotante de vidrio con el botón "Pedir cotización".
 * El precio final lo fija la asesora (aquí solo hay precios sugeridos, hoy vacíos).
 */

const WHATSAPP = '51940339934';
const CLAVE_CESTA = 'amore_cesta_v1';
// Texto del mensaje del botón de kit completo. IMPORTANTE: debe corresponder a una oferta real que la asesora confirme.
const TEXTO_KIT = 'Lleva el kit completo y pide tu descuento exclusivo: tu asesora te lo confirma en la cotización.';

type Zona = ZonaCatalogo;
interface Presentacion { id: string; producto_id: string; etiqueta: string; precio_sugerido: number | null; orden: number; stock_modo?: string; stock_cantidad?: number }
interface Producto { id: string; marca: string; nombre: string; tipo: string | null; disponible: boolean }
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

const ESTILOS = `
.cat {
  --bg:#FAF6F2; --surface:#FFFFFF; --ink:#1F1613; --muted:#8A7A76; --linea:rgba(31,22,19,.08); --hueco:#F1E7E0;
  --acento:#A8634F; --acento2:#C68173; --oro:#DFBF8B; --vidrio:rgba(255,255,255,.66); --sombra:0 18px 40px -22px rgba(70,38,26,.45);
  background:var(--bg); color:var(--ink); min-height:100vh; min-height:100dvh;
  font-family: ui-sans-serif, system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent; touch-action:manipulation; overscroll-behavior-y:contain;
}
.cat.oscuro { --bg:#0D0807; --surface:#211815; --ink:#FFF7F2; --muted:#CDBBB1; --linea:rgba(255,255,255,.17); --hueco:#352722; --vidrio:rgba(44,32,27,.74); --sombra:0 18px 40px -20px rgba(0,0,0,.85); }
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

  const activa = rutinas.find((r) => r.id === activaId) || null;
  const indiceActiva = rutinas.findIndex((r) => r.id === activaId);
  const piezasActiva = useMemo(() => piezas.filter((p) => p.rutina_id === activaId), [piezas, activaId]);
  const piezasOrdenadas = useMemo(() => [...piezasActiva].sort((a, b) => b.zona.w * b.zona.h - a.zona.w * a.zona.h), [piezasActiva]);

  const elegirRutina = (id: string) => {
    setActivaId(id);
    try {
      const ref = refDelEnlace();
      window.history.replaceState(null, '', `/catalogo/${id}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`);
    } catch {}
  };
  const irA = (delta: number) => {
    const i = indiceActiva + delta;
    if (i >= 0 && i < rutinas.length) { elegirRutina(rutinas[i].id); vibrar(6); }
  };

  const seleccionInicial = (p: Pieza): ItemSel => {
    const pres = presentaciones[p.producto_id] || [];
    const inicial = pres.find((x) => x.id === p.presentacion_foto_id) || pres[0];
    return { presentacionId: inicial?.id || '', cantidad: 1 };
  };

  const alternar = (p: Pieza) => {
    const prod = productos[p.producto_id];
    if (!prod || !prod.disponible) return;
    vibrar();
    setSeleccion((prev) => {
      const copia = { ...prev };
      if (copia[p.producto_id]) delete copia[p.producto_id];
      else copia[p.producto_id] = seleccionInicial(p);
      return copia;
    });
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
  const disponiblesActiva = piezasActiva.filter((p) => productos[p.producto_id]?.disponible).length;
  const elegidasActiva = piezasActiva.filter((p) => seleccion[p.producto_id]).length;
  const cantidadPorRutina = (id: string) => piezas.filter((p) => p.rutina_id === id && seleccion[p.producto_id]).length;

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
    const mensaje =
      `Hola Amore Salón, ${nombre.trim() ? `soy ${nombre.trim()}. ` : ''}Quiero una cotización:\n\n${detalle}` +
      `${codigo ? `\n\nCódigo de cotización: ${codigo}` : ''}${ref ? `\nOrigen: ${ref}` : ''}`;
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
          <div className="mt-5 grid grid-cols-[56px_1fr] gap-3">
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="esqueleto h-[68px] rounded-2xl" />)}</div>
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
      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="leading-none">
          <p className="text-[19px] font-semibold tracking-[0.34em]" style={{ fontFamily: "ui-serif, Georgia, 'Times New Roman', serif" }}>AMORE</p>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em]" style={{ color: 'var(--muted)' }}>Hair style studio</p>
        </div>
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
            <h1 className="text-[28px] font-bold leading-[1.1] tracking-tight">Arma tu rutina</h1>
            <p className="mt-1.5 text-[14px] leading-snug" style={{ color: 'var(--muted)' }}>Toca los productos que quieres. Puedes combinar marcas.</p>
          </div>

          <div className="grid grid-cols-[56px_1fr] gap-3">
            {/* Carrusel vertical de rutinas */}
            <nav aria-label="Rutinas" className="sin-barra sticky top-3 max-h-[74dvh] space-y-2.5 self-start overflow-y-auto py-1" style={{ scrollSnapType: 'y proximity' }}>
              {rutinas.map((r) => {
                const n = cantidadPorRutina(r.id);
                const esActiva = r.id === activaId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { elegirRutina(r.id); vibrar(6); }}
                    aria-current={esActiva}
                    aria-label={`${nombreCorto(r)}${n ? `, ${n} elegidos` : ''}`}
                    className="relative block w-full cursor-pointer text-center"
                    style={{ scrollSnapAlign: 'center' }}
                  >
                    <span
                      className="block overflow-hidden rounded-[18px] transition-all duration-300"
                      style={{
                        boxShadow: esActiva ? '0 0 0 2px var(--surface), 0 0 0 4px var(--acento)' : '0 0 0 1px var(--linea)',
                        opacity: esActiva ? 1 : 0.62,
                        transform: esActiva ? 'scale(1)' : 'scale(.94)',
                      }}
                    >
                      <img src={r.foto_url} alt="" className="aspect-[3/4] w-full object-cover" draggable={false} loading="lazy" />
                    </span>
                    <span className="mt-1.5 block truncate text-[9.5px] font-semibold leading-tight" style={{ color: esActiva ? 'var(--ink)' : 'var(--muted)' }}>{nombreCorto(r)}</span>
                    {n > 0 && (
                      <span key={n} className="pop absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white boton-acento">{n}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Escena de la rutina activa */}
            <div className="min-w-0" onTouchStart={alTocar} onTouchEnd={alSoltar}>
              <div key={activa.id} className="entra relative overflow-hidden rounded-[28px] shadow-[var(--sombra)]" style={{ aspectRatio: `${W} / ${H}`, background: 'var(--hueco)' }}>
                <img src={activa.foto_url} alt={activa.nombre} className="absolute inset-0 h-full w-full select-none object-cover" draggable={false} />
                {barrido > 0 && <div key={barrido} className="barrido" aria-hidden="true" />}

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
                    const marcado = Boolean(seleccion[p.producto_id]);
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
                  const marcado = Boolean(seleccion[p.producto_id]);
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

              {/* Puntos de paginación */}
              {rutinas.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
                  {rutinas.map((r) => (
                    <span key={r.id} className="h-1.5 rounded-full transition-all duration-300" style={{ width: r.id === activaId ? 18 : 6, background: r.id === activaId ? 'var(--acento)' : 'var(--linea)' }} />
                  ))}
                </div>
              )}
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
                              <button type="button" aria-label={`Quitar ${prod.nombre}`} onClick={() => alternar(pieza)} className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center" style={{ color: 'var(--muted)' }}>
                                <Icono d={D_X} className="h-4 w-4" />
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
          {lineas.length > 0 && (<button type="button" onClick={() => consultar('despacho')} disabled={enviando} className="mt-3 w-full cursor-pointer rounded-2xl py-3 text-[14px] font-semibold disabled:opacity-50" style={{ background: 'var(--hueco)', color: 'var(--ink)' }}>Ya sé a dónde enviar: completar datos de envío →</button>)}
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
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }} role="dialog" aria-label="Datos de envío">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[15px] font-semibold">Datos de envío</p>
            <button type="button" onClick={() => setDespachoUrl(null)} aria-label="Cerrar" className="h-10 w-10 cursor-pointer rounded-full text-xl leading-none" style={{ background: 'var(--hueco)' }}>×</button>
          </div>
          <iframe src={despachoUrl} title="Formulario de despacho" className="min-h-0 w-full flex-1 border-0" />
        </div>
      )}
    </div>
  );
};
