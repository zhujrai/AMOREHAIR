import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { restaurarSesion } from '../utils/auth';
import { trazoContorno, ZonaCatalogo } from '../utils/contornos';

/**
 * Stock (solo personal con sesión). Vista gráfica como el catálogo: foto del kit con contornos de colores;
 * al tocar un producto se ajustan sus presentaciones (tamaños).
 * Cada presentación puede estar:  ∞ "Hay" (existen pero no sabemos cuántas)  |  con cantidad  |  agotada (cantidad 0).
 * Lo que está agotado deja de ofrecerse en el catálogo público.
 */

interface Rutina { id: string; nombre: string; foto_url: string; ancho_foto: number | null; alto_foto: number | null; orden: number }
interface Pieza { id: number; rutina_id: string; producto_id: string; zona: ZonaCatalogo }
interface Producto { id: string; marca: string; nombre: string; disponible: boolean }
interface Presentacion { id: string; producto_id: string; etiqueta: string; orden: number; stock_modo?: 'ilimitado' | 'cantidad'; stock_cantidad?: number }

const hay = (p: Presentacion) => (p.stock_modo ?? 'ilimitado') === 'ilimitado' || (p.stock_cantidad ?? 0) > 0;
type Estado = 'infinito' | 'bien' | 'poco' | 'agotado';
const estadoDe = (pres: Presentacion[]): Estado => {
  if (pres.length === 0 || pres.every((p) => !hay(p))) return 'agotado';
  if (pres.some((p) => (p.stock_modo ?? 'ilimitado') === 'ilimitado')) return 'infinito';
  const total = pres.reduce((a, p) => a + (hay(p) ? (p.stock_cantidad ?? 0) : 0), 0);
  return total <= 3 ? 'poco' : 'bien';
};
const COLOR: Record<Estado, string> = { infinito: '#2FA7A0', bien: '#3BA55D', poco: '#E0A12B', agotado: '#D9534F' };
const ROTULO: Record<Estado, string> = { infinito: '∞ Hay', bien: 'Con stock', poco: 'Poco stock', agotado: 'Agotado' };

export const Stock: React.FC = () => {
  const [listo, setListo] = useState(false);
  const [staff, setStaff] = useState(false);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [productos, setProductos] = useState<Record<string, Producto>>({});
  const [pres, setPres] = useState<Record<string, Presentacion[]>>({});
  const [activa, setActiva] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [sinMigracion, setSinMigracion] = useState(false);

  const cargar = useCallback(async () => {
    const { data: rs, error: e1 } = await supabase.from('rutinas').select('id,nombre,foto_url,ancho_foto,alto_foto,orden').order('orden');
    if (e1 || !rs) return setError('No se pudo cargar el catálogo.');
    const { data: pz } = await supabase.from('rutina_piezas').select('id,rutina_id,producto_id,zona').order('orden');
    const ids = Array.from(new Set((pz || []).map((p: Pieza) => p.producto_id)));
    const { data: pr } = await supabase.from('productos').select('id,marca,nombre,disponible').in('id', ids);
    const { data: ps } = await supabase.from('presentaciones').select('*').in('producto_id', ids).order('orden');
    const por: Record<string, Presentacion[]> = {};
    (ps || []).forEach((x: Presentacion) => { (por[x.producto_id] ||= []).push(x); });
    setSinMigracion(Boolean(ps && ps.length > 0 && ps[0].stock_modo === undefined));
    setRutinas(rs as Rutina[]);
    setPiezas((pz || []) as Pieza[]);
    setProductos(Object.fromEntries((pr || []).map((p: Producto) => [p.id, p])));
    setPres(por);
    setActiva((a) => a || (rs as Rutina[])[0]?.id || '');
  }, []);

  useEffect(() => {
    restaurarSesion().then((u) => {
      setStaff(Boolean(u));
      setListo(true);
      if (u) cargar();
    });
  }, [cargar]);

  const avisar = (t: string) => { setAviso(t); window.setTimeout(() => setAviso(''), 1400); };

  /** Cambia una presentación al instante y guarda en segundo plano; mantiene el interruptor del producto al día. */
  const cambiar = async (pid: string, presId: string, cambios: Partial<Presentacion>) => {
    const nuevas = (pres[pid] || []).map((x) => (x.id === presId ? { ...x, ...cambios } : x));
    setPres((p) => ({ ...p, [pid]: nuevas }));
    const disponible = nuevas.some(hay);
    setProductos((p) => ({ ...p, [pid]: { ...p[pid], disponible } }));
    const { error: e1 } = await supabase.from('presentaciones').update(cambios).eq('id', presId);
    const { error: e2 } = await supabase.from('productos').update({ disponible }).eq('id', pid);
    if (e1 || e2) { setError('No se pudo guardar (¿aplicaste la migración 006?).'); cargar(); } else avisar('Guardado');
  };

  const rutina = rutinas.find((r) => r.id === activa);
  const piezasActiva = useMemo(() => piezas.filter((p) => p.rutina_id === activa), [piezas, activa]);
  const W = rutina?.ancho_foto || 1000;
  const H = rutina?.alto_foto || 1333;
  const prodAbierto = abierto ? productos[abierto] : null;

  if (!listo) return <div className="min-h-screen flex items-center justify-center text-sm bg-[#FBF4F0] text-[#8A7A76]">Verificando sesión…</div>;
  if (!staff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center text-sm bg-[#FBF4F0] text-[#2B1D1A]">
        <p>Esta página es solo para el equipo de Amore.</p>
        <a href="/" className="font-bold text-[#A8634F] underline">Iniciar sesión en el panel</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF4F0] text-[#2B1D1A] pb-40">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur shadow-[0_1px_0_rgba(168,99,79,.12)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-xs font-bold text-[#A8634F] hover:underline">← Tablero</a>
          <h1 className="flex-1 text-base font-extrabold">Stock</h1>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {rutinas.map((r) => (
            <button key={r.id} type="button" onClick={() => { setActiva(r.id); setAbierto(null); }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${activa === r.id ? 'bg-[#A8634F] text-white' : 'bg-[#F6E8E1] text-[#8E4F3E] hover:bg-[#F3DDD3]'}`}>
              {r.nombre.split('·')[0].trim()}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {aviso && <div className="fixed top-3 right-3 z-20 rounded-xl bg-[#2B1D1A] px-3 py-2 text-xs font-semibold text-white shadow-lg">{aviso}</div>}
        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
        {sinMigracion && <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-800">Falta aplicar la migración 006 en la base de datos: los cambios de stock aún no se pueden guardar.</p>}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-[#6B5A55]">
          {(Object.keys(COLOR) as Estado[]).map((e) => (
            <span key={e} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[e] }} />{ROTULO[e]}</span>
          ))}
        </div>

        {rutina && (
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-[#F1E7E0] shadow-[0_18px_40px_-22px_rgba(70,38,26,.45)]" style={{ aspectRatio: `${W} / ${H}` }}>
            <img src={rutina.foto_url} alt={rutina.nombre} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              {piezasActiva.map((p) => {
                const est = estadoDe(pres[p.producto_id] || []);
                const sel = abierto === p.producto_id;
                return (
                  <path key={p.id} d={trazoContorno(p.zona, W, H)} role="button" tabIndex={0}
                    aria-label={`${productos[p.producto_id]?.nombre || ''}: ${ROTULO[est]}`}
                    onClick={() => setAbierto(sel ? null : p.producto_id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setAbierto(sel ? null : p.producto_id); }}
                    fill={COLOR[est]} fillOpacity={sel ? 0.38 : 0.2} stroke={COLOR[est]} strokeWidth={sel ? W / 120 : W / 200} strokeLinejoin="round" className="cursor-pointer" />
                );
              })}
            </svg>
          </div>
        )}

        {/* Lista del kit (también para tocar) */}
        <ul className="space-y-1.5">
          {piezasActiva.map((p) => {
            const prod = productos[p.producto_id];
            if (!prod) return null;
            const est = estadoDe(pres[p.producto_id] || []);
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setAbierto(abierto === p.producto_id ? null : p.producto_id)}
                  className={`flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(60,35,25,.05),0_6px_18px_-10px_rgba(60,35,25,.2)] cursor-pointer ${abierto === p.producto_id ? 'ring-2 ring-[#DFBF8B]' : ''}`}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLOR[est] }} />
                  <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">{prod.nombre}</span>
                  <span className="shrink-0 text-[11px] font-bold" style={{ color: COLOR[est] }}>{ROTULO[est]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      {/* Panel de edición del producto elegido */}
      {abierto && prodAbierto && (
        <div className="fixed inset-x-0 bottom-0 z-20" onMouseDown={(e) => e.stopPropagation()}>
          <div className="mx-auto max-w-md rounded-t-3xl bg-white p-4 shadow-[0_-12px_40px_-12px_rgba(60,35,25,.35)]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#A8634F]">{prodAbierto.marca}</p>
                <p className="text-[15px] font-bold leading-snug">{prodAbierto.nombre}</p>
              </div>
              <button type="button" onClick={() => setAbierto(null)} aria-label="Cerrar" className="h-9 w-9 shrink-0 rounded-full bg-[#F6E8E1] text-lg leading-none cursor-pointer">×</button>
            </div>
            <ul className="space-y-2.5">
              {(pres[abierto] || []).map((x) => {
                const modo = x.stock_modo ?? 'ilimitado';
                const cant = x.stock_cantidad ?? 0;
                return (
                  <li key={x.id} className="rounded-2xl bg-[#FBF4F0] p-3">
                    <p className="mb-2 text-[13px] font-bold">{x.etiqueta}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => cambiar(abierto, x.id, { stock_modo: 'ilimitado' })}
                        className={`h-10 rounded-full px-4 text-sm font-extrabold cursor-pointer ${modo === 'ilimitado' ? 'bg-[#2FA7A0] text-white' : 'bg-white text-[#6B5A55]'}`} title="Hay existencias pero no sabemos cuántas">∞ Hay</button>
                      <div className={`flex items-center rounded-full ${modo === 'cantidad' && cant > 0 ? 'bg-[#3BA55D] text-white' : 'bg-white text-[#2B1D1A]'}`}>
                        <button type="button" aria-label="Menos" onClick={() => cambiar(abierto, x.id, { stock_modo: 'cantidad', stock_cantidad: Math.max(0, (modo === 'cantidad' ? cant : 0) - 1) })} className="h-10 w-10 text-xl cursor-pointer">−</button>
                        <span className="min-w-8 text-center text-sm font-extrabold tabular-nums">{modo === 'cantidad' ? cant : '#'}</span>
                        <button type="button" aria-label="Más" onClick={() => cambiar(abierto, x.id, { stock_modo: 'cantidad', stock_cantidad: Math.min(99999, (modo === 'cantidad' ? cant : 0) + 1) })} className="h-10 w-10 text-xl cursor-pointer">+</button>
                      </div>
                      <button type="button" onClick={() => cambiar(abierto, x.id, { stock_modo: 'cantidad', stock_cantidad: 0 })}
                        className={`h-10 rounded-full px-4 text-sm font-extrabold cursor-pointer ${modo === 'cantidad' && cant === 0 ? 'bg-[#D9534F] text-white' : 'bg-white text-[#6B5A55]'}`}>Agotado</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
