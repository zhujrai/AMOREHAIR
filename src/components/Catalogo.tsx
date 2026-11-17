import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { trazoContorno, ZonaCatalogo } from '../utils/contornos';

/**
 * Catálogo por escenas de rutina.
 * La clienta toca el CONTORNO de cada producto sobre la foto del kit (se ilumina y entra a su selección).
 * Debajo hay un resumen corto de lo elegido, solo para repasar y ajustar cantidad/tamaño.
 * Envía una CONSULTA por WhatsApp; el precio final lo fija la vendedora (aquí solo hay precios sugeridos).
 */

const WHATSAPP = '51940339934';

type Zona = ZonaCatalogo;
interface Presentacion { id: string; producto_id: string; etiqueta: string; precio_sugerido: number | null; orden: number }
interface Producto { id: string; marca: string; nombre: string; tipo: string | null; disponible: boolean }
interface Pieza { id: number; producto_id: string; presentacion_foto_id: string | null; zona: Zona; orden: number }
interface Rutina { id: string; nombre: string; descripcion: string | null; foto_url: string; ancho_foto: number | null; alto_foto: number | null }
interface ItemSel { presentacionId: string; cantidad: number }

const dinero = (n: number) => `S/ ${n.toFixed(2)}`;

function refDelEnlace(): string | undefined {
  try {
    const r = new URLSearchParams(window.location.search).get('ref') || '';
    return r.trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || undefined;
  } catch {
    return undefined;
  }
}

/** Miniatura cuadrada recortada de la misma foto (según la zona de la pieza). */
const Miniatura: React.FC<{ foto: string; zona: Zona; ancho: number; alto: number; lado?: number }> = ({ foto, zona, ancho, alto, lado = 44 }) => {
  const pw = zona.w * ancho;
  const ph = zona.h * alto;
  const escala = lado / Math.max(pw, ph);
  return (
    <div className="relative shrink-0 rounded-xl bg-[#F2E7DF]" style={{ width: lado, height: lado }}>
      {/* Solo se ve el recorte exacto del producto (sin los vecinos), centrado en el cuadro */}
      <div
        className="absolute overflow-hidden rounded-md"
        style={{ width: pw * escala, height: ph * escala, left: (lado - pw * escala) / 2, top: (lado - ph * escala) / 2 }}
      >
        <img
          src={foto}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            maxWidth: 'none',
            width: ancho * escala,
            height: alto * escala,
            left: -zona.x * ancho * escala,
            top: -zona.y * alto * escala,
          }}
        />
      </div>
    </div>
  );
};

export const Catalogo: React.FC = () => {
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [listaRutinas, setListaRutinas] = useState<Rutina[] | null>(null);
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [productos, setProductos] = useState<Record<string, Producto>>({});
  const [presentaciones, setPresentaciones] = useState<Record<string, Presentacion[]>>({});
  const [seleccion, setSeleccion] = useState<Record<string, ItemSel>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Carga de la rutina y sus productos (lectura pública)
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const idPedido = window.location.pathname.replace(/^\/catalogo\/?/, '').split('/')[0];
        const consulta = idPedido
          ? supabase.from('rutinas').select('*').eq('id', idPedido).limit(1)
          : supabase.from('rutinas').select('*').order('orden');
        const { data: rutinas, error: eR } = await consulta;
        if (eR) throw eR;
        // Sin rutina elegida y con varias disponibles: se muestra el índice para escoger
        if (!idPedido && (rutinas || []).length > 1) {
          if (activo) setListaRutinas(rutinas as Rutina[]);
          return;
        }
        const r = (rutinas || [])[0] as Rutina | undefined;
        if (!r) throw new Error('No hay rutinas disponibles por ahora.');

        const { data: pz, error: eP } = await supabase.from('rutina_piezas').select('*').eq('rutina_id', r.id).order('orden');
        if (eP) throw eP;
        const ids = (pz || []).map((p: Pieza) => p.producto_id);
        const { data: prods, error: eD } = await supabase.from('productos').select('*').in('id', ids);
        if (eD) throw eD;
        const { data: pres, error: eS } = await supabase.from('presentaciones').select('*').in('producto_id', ids).order('orden');
        if (eS) throw eS;

        if (!activo) return;
        setRutina(r);
        setPiezas((pz || []) as Pieza[]);
        setProductos(Object.fromEntries((prods || []).map((p: Producto) => [p.id, p])));
        const porProducto: Record<string, Presentacion[]> = {};
        (pres || []).forEach((x: Presentacion) => { (porProducto[x.producto_id] ||= []).push(x); });
        setPresentaciones(porProducto);
      } catch (e: any) {
        if (activo) setError(e?.message || 'No se pudo cargar el catálogo.');
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Piezas más pequeñas arriba para que se puedan tocar aunque se superpongan
  const piezasOrdenadas = useMemo(
    () => [...piezas].sort((a, b) => b.zona.w * b.zona.h - a.zona.w * a.zona.h),
    [piezas]
  );

  const seleccionInicial = (p: Pieza): ItemSel => {
    const pres = presentaciones[p.producto_id] || [];
    const inicial = pres.find((x) => x.id === p.presentacion_foto_id) || pres[0];
    return { presentacionId: inicial?.id || '', cantidad: 1 };
  };

  const alternar = (p: Pieza) => {
    const prod = productos[p.producto_id];
    if (!prod || !prod.disponible) return;
    setSeleccion((prev) => {
      const copia = { ...prev };
      if (copia[p.producto_id]) delete copia[p.producto_id];
      else copia[p.producto_id] = seleccionInicial(p);
      return copia;
    });
  };

  const elegirTodo = () =>
    setSeleccion((prev) => {
      const copia = { ...prev };
      piezas.forEach((p) => {
        const prod = productos[p.producto_id];
        if (prod && prod.disponible && !copia[p.producto_id]) copia[p.producto_id] = seleccionInicial(p);
      });
      return copia;
    });

  const cambiar = (productoId: string, cambios: Partial<ItemSel>) =>
    setSeleccion((prev) => (prev[productoId] ? { ...prev, [productoId]: { ...prev[productoId], ...cambios } } : prev));

  const lineas = piezas
    .filter((p) => seleccion[p.producto_id])
    .map((p) => {
      const prod = productos[p.producto_id];
      const sel = seleccion[p.producto_id];
      const pres = (presentaciones[p.producto_id] || []).find((x) => x.id === sel.presentacionId);
      return { pieza: p, prod, sel, pres };
    });

  const todosConPrecio = lineas.length > 0 && lineas.every((l) => l.pres?.precio_sugerido != null);
  const totalSugerido = todosConPrecio
    ? lineas.reduce((s, l) => s + (l.pres!.precio_sugerido as number) * l.sel.cantidad, 0)
    : null;
  const disponibles = piezas.filter((p) => productos[p.producto_id]?.disponible).length;

  const consultar = async () => {
    if (!rutina || lineas.length === 0) return;
    setEnviando(true);
    setError('');
    const ref = refDelEnlace();
    const snapshot = lineas.map((l) => ({
      producto_id: l.prod.id,
      producto: l.prod.nombre,
      marca: l.prod.marca,
      presentacion_id: l.pres?.id || null,
      presentacion: l.pres?.etiqueta || null,
      cantidad: l.sel.cantidad,
      precio_sugerido: l.pres?.precio_sugerido ?? null,
    }));

    // Se guarda la consulta; si falla igualmente se abre WhatsApp para no perder la venta
    let codigo = '';
    try {
      const { data: id } = await supabase.rpc('siguiente_consulta_id');
      if (typeof id === 'string' && id) {
        const { error: eI } = await supabase.from('consultas').insert([{
          id,
          nombre: nombre.trim() || null,
          telefono: telefono.replace(/\D/g, '') || null,
          rutina_id: rutina.id,
          ref: ref || null,
          estado: 'nueva',
          seleccion: snapshot,
          total_sugerido: totalSugerido,
        }]);
        if (!eI) codigo = id;
      }
    } catch {}

    const detalle = snapshot
      .map((s) => `• ${s.cantidad} × ${s.producto}${s.presentacion ? ` (${s.presentacion})` : ''}`)
      .join('\n');
    const mensaje =
      `Hola Amore Salón, ${nombre.trim() ? `soy ${nombre.trim()}. ` : ''}Quiero consultar por la rutina "${rutina.nombre}":\n${detalle}` +
      `${codigo ? `\n\nCódigo de consulta: ${codigo}` : ''}${ref ? `\nOrigen: ${ref}` : ''}`;
    setEnviando(false);
    window.location.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  };

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">Cargando catálogo…</div>;
  }
  if (listaRutinas) {
    const ref = refDelEnlace();
    return (
      <div className="min-h-screen bg-[#FBF4F0] text-[#2B1D1A]">
        <header className="px-4 pt-5 pb-3 text-center">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#B06F5C] font-semibold">Amore Salón · Hair Style Studio</p>
          <h1 className="mt-1 text-xl font-extrabold">Elige tu rutina</h1>
          <p className="mt-1 text-xs text-[#8A7A76]">Toca una rutina, marca los productos que quieres y consulta por WhatsApp.</p>
        </header>
        <main className="max-w-md mx-auto px-4 pb-10 grid grid-cols-2 gap-3">
          {listaRutinas.map((r) => (
            <a
              key={r.id}
              href={`/catalogo/${r.id}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`}
              className="rounded-2xl overflow-hidden bg-white shadow-md border border-[#EAD7BC] flex flex-col"
            >
              <img src={r.foto_url} alt={r.nombre} className="w-full aspect-[4/5] object-cover" loading="lazy" />
              <span className="p-2.5 text-xs font-bold leading-snug">{r.nombre}</span>
            </a>
          ))}
        </main>
      </div>
    );
  }
  if (!rutina) {
    return <div className="min-h-screen flex items-center justify-center px-6 text-center text-sm text-zinc-600">{error || 'Catálogo no disponible.'}</div>;
  }

  const W = rutina.ancho_foto || 1000;
  const H = rutina.alto_foto || 1333;

  return (
    <div className="min-h-screen bg-[#FBF4F0] text-[#2B1D1A]">
      {/* Animaciones del contorno: las piezas sin elegir "respiran" para invitar a tocar */}
      <style>{`
        @keyframes amorePulso { 0%,100% { stroke-opacity: .55 } 50% { stroke-opacity: 1 } }
        .contorno-libre { animation: amorePulso 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .contorno-libre { animation: none; } }
      `}</style>

      <header className="px-4 pt-5 pb-3 text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#B06F5C] font-semibold">Amore Salón · Hair Style Studio</p>
        <h1 className="mt-1 text-xl font-extrabold leading-tight">{rutina.nombre}</h1>
        {rutina.descripcion && <p className="mt-1 text-xs text-[#8A7A76] max-w-md mx-auto">{rutina.descripcion}</p>}
      </header>

      <main className="max-w-md mx-auto px-4 pb-32">
        {/* Escena: la foto del kit; cada producto tiene un contorno que se ilumina al elegirlo */}
        <div className="relative rounded-3xl overflow-hidden shadow-lg bg-white select-none" style={{ aspectRatio: `${W} / ${H}` }}>
          <img src={rutina.foto_url} alt={rutina.nombre} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full" role="group" aria-label="Productos del kit">
            {piezasOrdenadas.map((p) => {
              const prod = productos[p.producto_id];
              if (!prod) return null;
              const marcado = Boolean(seleccion[p.producto_id]);
              const trazo = trazoContorno(p.zona, W, H);
              const libre = !prod.disponible;
              return (
                <g
                  key={p.id}
                  role="button"
                  tabIndex={libre ? -1 : 0}
                  aria-pressed={marcado}
                  aria-label={`${marcado ? 'Quitar' : 'Elegir'} ${prod.nombre}`}
                  aria-disabled={libre}
                  onClick={() => alternar(p)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(p); } }}
                  style={{ cursor: libre ? 'not-allowed' : 'pointer', outline: 'none', opacity: libre ? 0.4 : 1 }}
                >
                  {/* Área de toque amplia e invisible (ayuda con los frascos angostos) */}
                  <path d={trazo} fill="transparent" stroke="transparent" strokeWidth={22} vectorEffect="non-scaling-stroke" pointerEvents="all" />
                  {/* Contorno visible */}
                  <path
                    d={trazo}
                    className={marcado ? '' : 'contorno-libre'}
                    fill={marcado ? 'rgba(176,111,92,0.26)' : 'rgba(255,255,255,0.05)'}
                    stroke={marcado ? '#FFE3A8' : 'rgba(255,255,255,0.95)'}
                    strokeWidth={marcado ? 3.2 : 1.6}
                    strokeDasharray={marcado ? undefined : '7 5'}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                    style={{
                      transition: 'all .25s ease',
                      filter: marcado ? 'drop-shadow(0 0 7px rgba(255,214,140,.95)) drop-shadow(0 0 2px rgba(176,111,92,1))' : 'none',
                    }}
                  />
                </g>
              );
            })}
          </svg>
          {/* Insignias (no interceptan el toque) */}
          {piezas.map((p) => {
            const prod = productos[p.producto_id];
            if (!prod) return null;
            const marcado = Boolean(seleccion[p.producto_id]);
            return (
              <span
                key={`b-${p.id}`}
                aria-hidden="true"
                className={`pointer-events-none absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-md transition-all ${
                  marcado ? 'bg-[#B06F5C] text-white scale-100' : 'bg-white/90 text-[#B06F5C] scale-90'
                }`}
                style={{ left: `calc(${(p.zona.x + p.zona.w) * 100}% - 26px)`, top: `calc(${p.zona.y * 100}% + 4px)` }}
              >
                {marcado ? '✓' : '+'}
              </span>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#8A7A76] leading-snug">Toca el contorno de cada producto para elegirlo. Tu asesora confirma el precio final.</p>
          {disponibles > 0 && lineas.length < disponibles && (
            <button
              type="button"
              onClick={elegirTodo}
              className="shrink-0 rounded-full border border-[#B06F5C] px-3 py-1.5 text-[11px] font-bold text-[#B06F5C] cursor-pointer hover:bg-[#B06F5C] hover:text-white transition-colors"
            >
              Elegir todo el kit
            </button>
          )}
        </div>

        {/* Resumen corto para repasar lo elegido (no protagonista) */}
        <section className="mt-4" aria-label="Tu selección">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-[#B06F5C]">Tu selección</h2>
          {lineas.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-[#EAD7BC] bg-white/50 px-3 py-3 text-center text-xs text-[#8A7A76]">
              Aún no has elegido productos.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[#F1E4DA] rounded-2xl border border-[#EAD7BC] bg-white">
              {lineas.map(({ pieza, prod, sel }) => {
                const pres = presentaciones[prod.id] || [];
                return (
                  <li key={pieza.id} className="flex items-center gap-2.5 px-2.5 py-2">
                    <Miniatura foto={rutina.foto_url} zona={pieza.zona} ancho={W} alto={H} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold leading-tight">{prod.nombre}</p>
                      {pres.length > 1 ? (
                        <select
                          value={sel.presentacionId}
                          onChange={(e) => cambiar(prod.id, { presentacionId: e.target.value })}
                          className="mt-0.5 max-w-full rounded-lg border border-[#EAD7BC] bg-[#FBF4F0] px-1.5 py-0.5 text-[11px] font-semibold"
                          aria-label={`Tamaño de ${prod.nombre}`}
                        >
                          {pres.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.etiqueta}{x.precio_sugerido != null ? ` · ref. ${dinero(x.precio_sugerido)}` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] text-[#8A7A76]">
                          {pres[0]?.etiqueta}
                          {pres[0]?.precio_sugerido != null && ` · ref. ${dinero(pres[0].precio_sugerido)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center rounded-xl border border-[#EAD7BC] bg-[#FBF4F0]">
                      <button type="button" aria-label="Menos" onClick={() => cambiar(prod.id, { cantidad: Math.max(1, sel.cantidad - 1) })} className="w-7 h-7 text-base font-bold cursor-pointer">−</button>
                      <span className="w-5 text-center text-xs font-bold">{sel.cantidad}</span>
                      <button type="button" aria-label="Más" onClick={() => cambiar(prod.id, { cantidad: Math.min(9, sel.cantidad + 1) })} className="w-7 h-7 text-base font-bold cursor-pointer">+</button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Quitar ${prod.nombre}`}
                      onClick={() => alternar(pieza)}
                      className="w-7 h-7 rounded-full text-sm text-[#8A7A76] hover:bg-[#FBF4F0] cursor-pointer"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Datos opcionales */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre (opcional)"
            autoComplete="name"
            className="rounded-2xl border border-[#EAD7BC] bg-white px-3 py-2.5 text-sm"
          />
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Tu WhatsApp (opcional)"
            inputMode="tel"
            autoComplete="tel"
            className="rounded-2xl border border-[#EAD7BC] bg-white px-3 py-2.5 text-sm"
          />
        </div>

        {error && <p className="mt-3 text-center text-xs text-red-700">{error}</p>}
      </main>

      {/* Barra fija con el resumen y el botón */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-[#EAD7BC] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold">
              {lineas.length === 0 ? 'Elige tus productos' : `${lineas.reduce((s, l) => s + l.sel.cantidad, 0)} producto(s) elegidos`}
            </p>
            <p className="text-[11px] text-[#8A7A76] truncate">
              {lineas.length === 0
                ? 'Toca el contorno en la foto'
                : totalSugerido != null
                  ? `Precio referencial ${dinero(totalSugerido)} · lo confirma tu asesora`
                  : 'Precio por confirmar con tu asesora'}
            </p>
          </div>
          <button
            type="button"
            id="consultar-whatsapp-btn"
            onClick={consultar}
            disabled={lineas.length === 0 || enviando}
            className="shrink-0 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-extrabold text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {enviando ? 'Enviando…' : 'Consultar por WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
};
