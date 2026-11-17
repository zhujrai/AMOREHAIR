import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { trazoContorno, ZonaCatalogo } from '../utils/contornos';

/**
 * Catálogo por escenas de rutina con CESTA ÚNICA.
 * - Izquierda: carrusel vertical con las rutinas (cada una con el número de productos elegidos).
 * - Centro: la foto de la rutina activa; cada producto se elige tocando su contorno luminoso.
 * - Abajo (o a la derecha en pantallas anchas): la cesta con TODO lo elegido, de una o varias rutinas.
 * Envía una COTIZACIÓN por WhatsApp; el precio final lo fija la asesora (aquí solo hay precios sugeridos).
 */

const WHATSAPP = '51940339934';
const CLAVE_CESTA = 'amore_cesta_v1';

type Zona = ZonaCatalogo;
interface Presentacion { id: string; producto_id: string; etiqueta: string; precio_sugerido: number | null; orden: number }
interface Producto { id: string; marca: string; nombre: string; tipo: string | null; disponible: boolean }
interface Pieza { id: number; rutina_id: string; producto_id: string; presentacion_foto_id: string | null; zona: Zona; orden: number }
interface Rutina { id: string; nombre: string; descripcion: string | null; foto_url: string; ancho_foto: number | null; alto_foto: number | null; orden?: number }
interface ItemSel { presentacionId: string; cantidad: number }

const dinero = (n: number) => `S/ ${n.toFixed(2)}`;
const nombreCorto = (r: Rutina) => r.nombre.split('·')[0].trim();

function refDelEnlace(): string | undefined {
  try {
    const r = new URLSearchParams(window.location.search).get('ref') || '';
    return r.trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || undefined;
  } catch {
    return undefined;
  }
}

/** Miniatura cuadrada recortada de la misma foto (solo el producto, sin sus vecinos). */
const Miniatura: React.FC<{ foto: string; zona: Zona; ancho: number; alto: number; lado?: number }> = ({ foto, zona, ancho, alto, lado = 44 }) => {
  const pw = zona.w * ancho;
  const ph = zona.h * alto;
  const escala = lado / Math.max(pw, ph);
  return (
    <div className="relative shrink-0 rounded-xl bg-[#F2E7DF]" style={{ width: lado, height: lado }}>
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
        (pres || []).forEach((x: Presentacion) => { (porProducto[x.producto_id] ||= []).push(x); });
        const mapaProductos: Record<string, Producto> = Object.fromEntries((prods || []).map((p: Producto) => [p.id, p]));
        setRutinas(rs as Rutina[]);
        setPiezas((pz || []) as Pieza[]);
        setProductos(mapaProductos);
        setPresentaciones(porProducto);

        // Rutina inicial: la del enlace (/catalogo/<id>) o la primera
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
            const pres = lista.find((x) => x.id === it.presentacionId) || lista[0];
            valida[pid] = { presentacionId: pres.id, cantidad: Math.min(9, Math.max(1, Number(it.cantidad) || 1)) };
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

  // La cesta se recuerda en el teléfono
  useEffect(() => {
    if (cargando) return;
    try { localStorage.setItem(CLAVE_CESTA, JSON.stringify(seleccion)); } catch {}
  }, [seleccion, cargando]);

  const activa = rutinas.find((r) => r.id === activaId) || null;
  const piezasActiva = useMemo(() => piezas.filter((p) => p.rutina_id === activaId), [piezas, activaId]);
  // Piezas más pequeñas arriba para que se puedan tocar aunque se superpongan
  const piezasOrdenadas = useMemo(
    () => [...piezasActiva].sort((a, b) => b.zona.w * b.zona.h - a.zona.w * a.zona.h),
    [piezasActiva]
  );

  const elegirRutina = (id: string) => {
    setActivaId(id);
    try {
      const ref = refDelEnlace();
      window.history.replaceState(null, '', `/catalogo/${id}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`);
    } catch {}
  };

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

  const elegirTodoElKit = () =>
    setSeleccion((prev) => {
      const copia = { ...prev };
      piezasActiva.forEach((p) => {
        const prod = productos[p.producto_id];
        if (prod && prod.disponible && !copia[p.producto_id]) copia[p.producto_id] = seleccionInicial(p);
      });
      return copia;
    });

  const cambiar = (productoId: string, cambios: Partial<ItemSel>) =>
    setSeleccion((prev) => (prev[productoId] ? { ...prev, [productoId]: { ...prev[productoId], ...cambios } } : prev));

  // Líneas de la cesta, agrupadas por rutina (en el orden del carrusel)
  const grupos = useMemo(() => {
    return rutinas
      .map((r) => {
        const lineas = piezas
          .filter((p) => p.rutina_id === r.id && seleccion[p.producto_id])
          .map((p) => {
            const prod = productos[p.producto_id];
            const sel = seleccion[p.producto_id];
            const pres = (presentaciones[p.producto_id] || []).find((x) => x.id === sel.presentacionId);
            return { pieza: p, prod, sel, pres };
          })
          .filter((l) => l.prod);
        return { rutina: r, lineas };
      })
      .filter((g) => g.lineas.length > 0);
  }, [rutinas, piezas, seleccion, productos, presentaciones]);

  // Un producto que aparece en dos rutinas solo se cuenta una vez
  const lineas = useMemo(() => {
    const vistos = new Set<string>();
    return grupos.flatMap((g) => g.lineas.filter((l) => (vistos.has(l.prod.id) ? false : (vistos.add(l.prod.id), true))).map((l) => ({ ...l, rutina: g.rutina })));
  }, [grupos]);

  const cantidadTotal = lineas.reduce((s, l) => s + l.sel.cantidad, 0);
  const todosConPrecio = lineas.length > 0 && lineas.every((l) => l.pres?.precio_sugerido != null);
  const totalSugerido = todosConPrecio ? lineas.reduce((s, l) => s + (l.pres!.precio_sugerido as number) * l.sel.cantidad, 0) : null;
  const disponiblesActiva = piezasActiva.filter((p) => productos[p.producto_id]?.disponible).length;
  const elegidasActiva = piezasActiva.filter((p) => seleccion[p.producto_id]).length;

  const vaciarCesta = () => setSeleccion({});

  const consultar = async () => {
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

    // Se guarda la cotización; si falla igualmente se abre WhatsApp para no perder la venta
    let codigo = '';
    try {
      const { data: id } = await supabase.rpc('siguiente_consulta_id');
      if (typeof id === 'string' && id) {
        const { error: eI } = await supabase.from('consultas').insert([{
          id,
          nombre: nombre.trim() || null,
          telefono: telefono.replace(/\D/g, '') || null,
          rutina_id: grupos[0]?.rutina.id ?? null,
          ref: ref || null,
          estado: 'nueva',
          seleccion: snapshot,
          total_sugerido: totalSugerido,
        }]);
        if (!eI) codigo = id;
      }
    } catch {}

    // Mensaje agrupado por rutina
    const porRutina = new Map<string, string[]>();
    snapshot.forEach((s) => {
      const linea = `• ${s.cantidad} × ${s.producto}${s.presentacion ? ` (${s.presentacion})` : ''}`;
      porRutina.set(s.rutina, [...(porRutina.get(s.rutina) || []), linea]);
    });
    const detalle = Array.from(porRutina.entries()).map(([r, ls]) => `*${r}*\n${ls.join('\n')}`).join('\n\n');
    const mensaje =
      `Hola Amore Salón, ${nombre.trim() ? `soy ${nombre.trim()}. ` : ''}Quiero una cotización:\n\n${detalle}` +
      `${codigo ? `\n\nCódigo de cotización: ${codigo}` : ''}${ref ? `\nOrigen: ${ref}` : ''}`;
    setEnviando(false);
    window.location.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  };

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#8A7A76] bg-[#FBF4F0]">Cargando catálogo…</div>;
  }
  if (!activa) {
    return <div className="min-h-screen flex items-center justify-center px-6 text-center text-sm text-[#6B5A55] bg-[#FBF4F0]">{error || 'Catálogo no disponible.'}</div>;
  }

  const W = activa.ancho_foto || 1000;
  const H = activa.alto_foto || 1333;
  const cantidadPorRutina = (id: string) => piezas.filter((p) => p.rutina_id === id && seleccion[p.producto_id]).length;

  const cesta = (
    <section aria-label="Tu cesta">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-[#A8634F]">Tu cesta</h2>
        {lineas.length > 0 && (
          <button type="button" onClick={vaciarCesta} className="text-[11px] font-semibold text-[#8A7A76] underline cursor-pointer">Vaciar</button>
        )}
      </div>
      {grupos.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-[#EADCD3] bg-white/60 px-3 py-4 text-center text-xs text-[#8A7A76]">
          Toca los productos de la foto. Puedes combinar varias rutinas en una sola cotización.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {grupos.map((g) => (
            <div key={g.rutina.id} className="rounded-2xl border border-[#EADCD3] bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => elegirRutina(g.rutina.id)}
                className="flex w-full items-center justify-between bg-[#F6E8E1] px-3 py-1.5 text-left cursor-pointer"
              >
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#8E4F3E]">{nombreCorto(g.rutina)}</span>
                <span className="text-[10px] font-semibold text-[#8E4F3E]">{g.lineas.length} de {piezas.filter((p) => p.rutina_id === g.rutina.id).length}</span>
              </button>
              <ul className="divide-y divide-[#F4EBE5]">
                {g.lineas.map(({ pieza, prod, sel }) => {
                  const pres = presentaciones[prod.id] || [];
                  return (
                    <li key={pieza.id} className="flex items-center gap-2.5 px-2.5 py-2">
                      <Miniatura foto={g.rutina.foto_url} zona={pieza.zona} ancho={g.rutina.ancho_foto || 1000} alto={g.rutina.alto_foto || 1333} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold leading-tight">{prod.nombre}</p>
                        {pres.length > 1 ? (
                          <select
                            value={sel.presentacionId}
                            onChange={(e) => cambiar(prod.id, { presentacionId: e.target.value })}
                            className="mt-0.5 max-w-full rounded-lg border border-[#EADCD3] bg-[#FBF4F0] px-1.5 py-0.5 text-[11px] font-semibold"
                            aria-label={`Tamaño de ${prod.nombre}`}
                          >
                            {pres.map((x) => (
                              <option key={x.id} value={x.id}>{x.etiqueta}{x.precio_sugerido != null ? ` · ref. ${dinero(x.precio_sugerido)}` : ''}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[11px] text-[#8A7A76]">{pres[0]?.etiqueta}{pres[0]?.precio_sugerido != null && ` · ref. ${dinero(pres[0].precio_sugerido)}`}</p>
                        )}
                      </div>
                      <div className="flex items-center rounded-xl border border-[#EADCD3] bg-[#FBF4F0]">
                        <button type="button" aria-label="Menos" onClick={() => cambiar(prod.id, { cantidad: Math.max(1, sel.cantidad - 1) })} className="w-7 h-7 text-base font-bold cursor-pointer">−</button>
                        <span className="w-5 text-center text-xs font-bold">{sel.cantidad}</span>
                        <button type="button" aria-label="Más" onClick={() => cambiar(prod.id, { cantidad: Math.min(9, sel.cantidad + 1) })} className="w-7 h-7 text-base font-bold cursor-pointer">+</button>
                      </div>
                      <button type="button" aria-label={`Quitar ${prod.nombre}`} onClick={() => alternar(pieza)} className="w-7 h-7 rounded-full text-sm text-[#8A7A76] hover:bg-[#FBF4F0] cursor-pointer">✕</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-[#FBF4F0] text-[#2B1D1A]">
      <style>{`
        @keyframes amorePulso { 0%,100% { stroke-opacity: .55 } 50% { stroke-opacity: 1 } }
        .contorno-libre { animation: amorePulso 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .contorno-libre { animation: none; } }
      `}</style>

      <header className="px-4 pt-5 pb-3 text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#A8634F] font-semibold">Amore Salón · Hair Style Studio</p>
        <h1 className="mt-1 text-xl font-extrabold leading-tight">Arma tu rutina</h1>
        <p className="mt-1 text-xs text-[#8A7A76] max-w-xs mx-auto">Elige productos de una o varias rutinas y pide tu cotización por WhatsApp.</p>
      </header>

      <main className="max-w-md md:max-w-4xl mx-auto px-3 pb-32 md:grid md:grid-cols-[1fr_340px] md:gap-6">
        <div>
          <div className="grid grid-cols-[62px_1fr] gap-2.5">
            {/* Carrusel vertical de rutinas */}
            <nav aria-label="Rutinas" className="sticky top-2 self-start max-h-[78vh] overflow-y-auto no-scrollbar space-y-2 pr-0.5">
              {rutinas.map((r) => {
                const n = cantidadPorRutina(r.id);
                const esActiva = r.id === activaId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => elegirRutina(r.id)}
                    aria-current={esActiva}
                    aria-label={`${nombreCorto(r)}${n ? `, ${n} elegidos` : ''}`}
                    className={`relative block w-full rounded-xl p-0.5 text-center transition-all cursor-pointer ${
                      esActiva ? 'bg-[#A8634F] shadow-md' : 'bg-white shadow-sm opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={r.foto_url} alt="" className="aspect-[3/4] w-full rounded-[10px] object-cover" draggable={false} loading="lazy" />
                    <span className={`block px-0.5 py-1 text-[9px] font-extrabold leading-tight ${esActiva ? 'text-white' : 'text-[#6B5A55]'}`}>{nombreCorto(r)}</span>
                    {n > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DFBF8B] px-1 text-[10px] font-black text-[#2B1D1A] shadow">{n}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Escena de la rutina activa */}
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h2 className="truncate text-sm font-extrabold leading-tight">{activa.nombre}</h2>
                {disponiblesActiva > 0 && elegidasActiva < disponiblesActiva && (
                  <button
                    type="button"
                    onClick={elegirTodoElKit}
                    className="shrink-0 rounded-full border border-[#A8634F] px-2.5 py-1 text-[10px] font-bold text-[#A8634F] cursor-pointer hover:bg-[#A8634F] hover:text-white transition-colors"
                  >
                    Todo el kit
                  </button>
                )}
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-lg bg-white select-none" style={{ aspectRatio: `${W} / ${H}` }}>
                <img src={activa.foto_url} alt={activa.nombre} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full" role="group" aria-label="Productos de la rutina">
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
                        <path d={trazo} fill="transparent" stroke="transparent" strokeWidth={22} vectorEffect="non-scaling-stroke" pointerEvents="all" />
                        <path
                          d={trazo}
                          className={marcado ? '' : 'contorno-libre'}
                          fill={marcado ? 'rgba(168,99,79,0.26)' : 'rgba(255,255,255,0.05)'}
                          stroke={marcado ? '#FFE3A8' : 'rgba(255,255,255,0.95)'}
                          strokeWidth={marcado ? 3.2 : 1.6}
                          strokeDasharray={marcado ? undefined : '7 5'}
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          pointerEvents="none"
                          style={{
                            transition: 'all .25s ease',
                            filter: marcado ? 'drop-shadow(0 0 7px rgba(255,214,140,.95)) drop-shadow(0 0 2px rgba(168,99,79,1))' : 'none',
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>
                {piezasActiva.map((p) => {
                  const prod = productos[p.producto_id];
                  if (!prod) return null;
                  const marcado = Boolean(seleccion[p.producto_id]);
                  return (
                    <span
                      key={`b-${p.id}`}
                      aria-hidden="true"
                      className={`pointer-events-none absolute w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-md transition-all ${
                        marcado ? 'bg-[#A8634F] text-white scale-100' : 'bg-white/90 text-[#A8634F] scale-90'
                      }`}
                      style={{ left: `calc(${(p.zona.x + p.zona.w) * 100}% - 22px)`, top: `calc(${p.zona.y * 100}% + 3px)` }}
                    >
                      {marcado ? '✓' : '+'}
                    </span>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-[#8A7A76]">Toca el contorno de cada producto. Tu asesora confirma el precio final.</p>
            </div>
          </div>

          {/* Cesta (móvil: debajo) */}
          <div className="mt-5 md:hidden">{cesta}</div>
        </div>

        {/* Cesta y datos (pantallas anchas: columna derecha fija) */}
        <aside className="hidden md:block md:sticky md:top-3 md:self-start space-y-4">{cesta}</aside>

        <div className="mt-5 grid grid-cols-2 gap-2.5 md:col-span-2 md:max-w-md md:mx-auto md:w-full">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre (opcional)"
            autoComplete="name"
            className="rounded-2xl border border-[#EADCD3] bg-white px-3 py-2.5 text-sm"
          />
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Tu WhatsApp (opcional)"
            inputMode="tel"
            autoComplete="tel"
            className="rounded-2xl border border-[#EADCD3] bg-white px-3 py-2.5 text-sm"
          />
        </div>
        {error && <p className="mt-3 text-center text-xs text-red-700 md:col-span-2">{error}</p>}
      </main>

      {/* Barra fija con el resumen y el botón */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-[#EADCD3] px-4 py-3">
        <div className="max-w-md md:max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold">
              {lineas.length === 0 ? 'Tu cesta está vacía' : `${cantidadTotal} producto(s) · ${grupos.length} rutina(s)`}
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
            {enviando ? 'Enviando…' : 'Pedir cotización'}
          </button>
        </div>
      </div>
    </div>
  );
};
