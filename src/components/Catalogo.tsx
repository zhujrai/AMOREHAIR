import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/dbApi';

/**
 * Catálogo por escenas de rutina (prototipo).
 * La clienta toca los productos de la foto (se resaltan y pasan a su selección), ajusta presentación/cantidad
 * y envía una CONSULTA por WhatsApp. El precio final lo fija la vendedora: aquí solo hay precios sugeridos.
 */

const WHATSAPP = '51940339934';

interface Zona { x: number; y: number; w: number; h: number }
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

export const Catalogo: React.FC = () => {
  const [rutina, setRutina] = useState<Rutina | null>(null);
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
        let consulta = supabase.from('rutinas').select('*').order('orden').limit(1);
        if (idPedido) consulta = supabase.from('rutinas').select('*').eq('id', idPedido).limit(1);
        const { data: rutinas, error: eR } = await consulta;
        if (eR) throw eR;
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

  const alternar = (p: Pieza) => {
    const prod = productos[p.producto_id];
    if (!prod || !prod.disponible) return;
    setSeleccion((prev) => {
      const copia = { ...prev };
      if (copia[p.producto_id]) {
        delete copia[p.producto_id];
      } else {
        const pres = presentaciones[p.producto_id] || [];
        const inicial = pres.find((x) => x.id === p.presentacion_foto_id) || pres[0];
        copia[p.producto_id] = { presentacionId: inicial?.id || '', cantidad: 1 };
      }
      return copia;
    });
  };

  const cambiar = (productoId: string, cambios: Partial<ItemSel>) =>
    setSeleccion((prev) => (prev[productoId] ? { ...prev, [productoId]: { ...prev[productoId], ...cambios } } : prev));

  const lineas = piezas
    .filter((p) => seleccion[p.producto_id])
    .map((p) => {
      const prod = productos[p.producto_id];
      const sel = seleccion[p.producto_id];
      const pres = (presentaciones[p.producto_id] || []).find((x) => x.id === sel.presentacionId);
      return { prod, sel, pres };
    });

  const todosConPrecio = lineas.length > 0 && lineas.every((l) => l.pres?.precio_sugerido != null);
  const totalSugerido = todosConPrecio
    ? lineas.reduce((s, l) => s + (l.pres!.precio_sugerido as number) * l.sel.cantidad, 0)
    : null;

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
  if (!rutina) {
    return <div className="min-h-screen flex items-center justify-center px-6 text-center text-sm text-zinc-600">{error || 'Catálogo no disponible.'}</div>;
  }

  const aspecto = rutina.ancho_foto && rutina.alto_foto ? `${rutina.ancho_foto} / ${rutina.alto_foto}` : '3 / 4';

  return (
    <div className="min-h-screen bg-[#FBF4F0] text-[#2B1D1A]">
      <header className="px-4 pt-5 pb-3 text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#B06F5C] font-semibold">Amore Salón · Hair Style Studio</p>
        <h1 className="mt-1 text-xl font-extrabold leading-tight">{rutina.nombre}</h1>
        {rutina.descripcion && <p className="mt-1 text-xs text-[#8A7A76] max-w-md mx-auto">{rutina.descripcion}</p>}
      </header>

      <main className="max-w-md mx-auto px-4 pb-32">
        {/* Escena: la foto completa con zonas tocables */}
        <div className="relative rounded-3xl overflow-hidden shadow-lg bg-white select-none" style={{ aspectRatio: aspecto }}>
          <img src={rutina.foto_url} alt={rutina.nombre} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          {piezasOrdenadas.map((p) => {
            const prod = productos[p.producto_id];
            if (!prod) return null;
            const marcado = Boolean(seleccion[p.producto_id]);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={marcado}
                aria-label={`${marcado ? 'Quitar' : 'Elegir'} ${prod.nombre}`}
                disabled={!prod.disponible}
                onClick={() => alternar(p)}
                className={`absolute rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#DFBF8B] ${
                  marcado
                    ? 'border-[3px] border-[#B06F5C] bg-[#B06F5C]/25 shadow-[0_0_0_4px_rgba(223,191,139,0.55)]'
                    : 'border-2 border-dashed border-white/80 bg-white/5 hover:bg-white/25'
                } ${!prod.disponible ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{
                  left: `${p.zona.x * 100}%`,
                  top: `${p.zona.y * 100}%`,
                  width: `${p.zona.w * 100}%`,
                  height: `${p.zona.h * 100}%`,
                }}
              >
                <span
                  className={`absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shadow-md transition-all ${
                    marcado ? 'bg-[#B06F5C] text-white scale-100' : 'bg-white text-[#B06F5C] scale-90'
                  }`}
                >
                  {marcado ? '✓' : '+'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-[#8A7A76]">Toca los productos que quieres. Tu asesora confirma el precio final.</p>

        {/* Lista con ajustes */}
        <ul className="mt-5 space-y-2.5">
          {piezas.map((p) => {
            const prod = productos[p.producto_id];
            if (!prod) return null;
            const sel = seleccion[p.producto_id];
            const pres = presentaciones[p.producto_id] || [];
            return (
              <li
                key={p.id}
                className={`rounded-2xl border p-3 transition-colors ${sel ? 'bg-white border-[#B06F5C] shadow-sm' : 'bg-white/60 border-[#EAD7BC]'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`pieza-${p.id}`}
                    checked={Boolean(sel)}
                    disabled={!prod.disponible}
                    onChange={() => alternar(p)}
                    className="w-5 h-5 accent-[#B06F5C] cursor-pointer"
                  />
                  <label htmlFor={`pieza-${p.id}`} className="flex-1 cursor-pointer">
                    <span className="block text-sm font-bold leading-tight">{prod.nombre}</span>
                    <span className="block text-[11px] text-[#8A7A76]">{prod.marca}{prod.disponible ? '' : ' · Agotado'}</span>
                  </label>
                </div>

                {sel && (
                  <div className="mt-2.5 flex items-center gap-2 pl-8">
                    {pres.length > 1 ? (
                      <select
                        value={sel.presentacionId}
                        onChange={(e) => cambiar(prod.id, { presentacionId: e.target.value })}
                        className="flex-1 min-w-0 rounded-xl border border-[#EAD7BC] bg-[#FBF4F0] px-2 py-1.5 text-xs font-semibold"
                      >
                        {pres.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.etiqueta}{x.precio_sugerido != null ? ` · ref. ${dinero(x.precio_sugerido)}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="flex-1 text-xs font-semibold text-[#2B1D1A]">
                        {pres[0]?.etiqueta}
                        {pres[0]?.precio_sugerido != null && <span className="text-[#8A7A76]"> · ref. {dinero(pres[0].precio_sugerido)}</span>}
                      </span>
                    )}
                    <div className="flex items-center rounded-xl border border-[#EAD7BC] bg-[#FBF4F0]">
                      <button type="button" aria-label="Menos" onClick={() => cambiar(prod.id, { cantidad: Math.max(1, sel.cantidad - 1) })} className="w-7 h-7 text-base font-bold cursor-pointer">−</button>
                      <span className="w-6 text-center text-xs font-bold">{sel.cantidad}</span>
                      <button type="button" aria-label="Más" onClick={() => cambiar(prod.id, { cantidad: Math.min(9, sel.cantidad + 1) })} className="w-7 h-7 text-base font-bold cursor-pointer">+</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

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
                ? 'Toca la foto o la lista'
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
