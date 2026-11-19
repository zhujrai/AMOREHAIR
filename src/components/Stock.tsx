import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { restaurarSesion } from '../utils/auth';

/**
 * Stock (solo personal con sesión). Control INDIVIDUAL por producto y tamaño, sin depender de la foto ni de la rutina
 * donde el producto aparezca en el catálogo: cada producto se ve una sola vez, agrupado por marca.
 * Cada presentación (tamaño) puede estar:  ∞ "Hay" (existe pero no sabemos cuántas)  |  con cantidad  |  agotada (cantidad 0).
 * Lo que está agotado deja de ofrecerse en el catálogo público.
 */

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
type Filtro = 'todos' | 'poco' | 'agotado';

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const Stock: React.FC = () => {
  const [listo, setListo] = useState(false);
  const [staff, setStaff] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pres, setPres] = useState<Record<string, Presentacion[]>>({});
  const [busca, setBusca] = useState('');
  const [marca, setMarca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [sinMigracion, setSinMigracion] = useState(false);

  const cargar = useCallback(async () => {
    const { data: pr, error: e1 } = await supabase.from('productos').select('id,marca,nombre,disponible').order('marca').order('nombre');
    if (e1 || !pr) return setError('No se pudo cargar los productos.');
    const { data: ps } = await supabase.from('presentaciones').select('*').order('orden');
    const por: Record<string, Presentacion[]> = {};
    (ps || []).forEach((x: Presentacion) => { (por[x.producto_id] ||= []).push(x); });
    setSinMigracion(Boolean(ps && ps.length > 0 && ps[0].stock_modo === undefined));
    setProductos(pr as Producto[]);
    setPres(por);
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
    setProductos((lista) => lista.map((p) => (p.id === pid ? { ...p, disponible } : p)));
    const { error: e1 } = await supabase.from('presentaciones').update(cambios).eq('id', presId);
    const { error: e2 } = await supabase.from('productos').update({ disponible }).eq('id', pid);
    if (e1 || e2) { setError('No se pudo guardar (¿aplicaste la migración 006?).'); cargar(); } else { setError(''); avisar('Guardado'); }
  };

  const marcas = useMemo(() => Array.from(new Set(productos.map((p) => p.marca))), [productos]);
  const cuentas = useMemo(() => {
    let poco = 0, agotado = 0;
    productos.forEach((p) => { const e = estadoDe(pres[p.id] || []); if (e === 'agotado') agotado++; else if (e === 'poco') poco++; });
    return { poco, agotado };
  }, [productos, pres]);

  const visibles = useMemo(() => {
    const q = sinTildes(busca.trim());
    return productos.filter((p) => {
      if (marca && p.marca !== marca) return false;
      if (q && !sinTildes(`${p.marca} ${p.nombre}`).includes(q)) return false;
      const e = estadoDe(pres[p.id] || []);
      if (filtro === 'agotado') return e === 'agotado';
      if (filtro === 'poco') return e === 'poco' || e === 'agotado';
      return true;
    });
  }, [productos, pres, busca, marca, filtro]);

  if (!listo) return <div className="min-h-screen flex items-center justify-center text-sm bg-[#FBF4F0] text-[#8A7A76]">Verificando sesión…</div>;
  if (!staff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center text-sm bg-[#FBF4F0] text-[#2B1D1A]">
        <p>Esta página es solo para el equipo de Amore.</p>
        <a href="/" className="font-bold text-[#A8634F] underline">Iniciar sesión en el panel</a>
      </div>
    );
  }

  const chip = (activo: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${activo ? 'bg-[#A8634F] text-white' : 'bg-[#F6E8E1] text-[#8E4F3E] hover:bg-[#F3DDD3]'}`;

  return (
    <div className="min-h-screen bg-[#FBF4F0] text-[#2B1D1A] pb-16">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur shadow-[0_1px_0_rgba(168,99,79,.12)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-xs font-bold text-[#A8634F] hover:underline">← Tablero</a>
          <h1 className="flex-1 text-base font-extrabold">Stock por producto</h1>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} type="search" placeholder="Buscar producto o marca…" className="w-full rounded-xl border border-[#EADCD3] bg-white px-3 py-2 text-sm" aria-label="Buscar producto" />
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => setFiltro('todos')} className={chip(filtro === 'todos')}>Todos {productos.length}</button>
          <button type="button" onClick={() => setFiltro('poco')} className={chip(filtro === 'poco')}>Poco o agotado {cuentas.poco + cuentas.agotado}</button>
          <button type="button" onClick={() => setFiltro('agotado')} className={chip(filtro === 'agotado')}>Agotados {cuentas.agotado}</button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => setMarca('')} className={chip(marca === '')}>Todas las marcas</button>
          {marcas.map((m) => <button key={m} type="button" onClick={() => setMarca(marca === m ? '' : m)} className={chip(marca === m)}>{m}</button>)}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {aviso && <div className="fixed top-3 right-3 z-20 rounded-xl bg-[#2B1D1A] px-3 py-2 text-xs font-semibold text-white shadow-lg">{aviso}</div>}
        {error && <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
        {sinMigracion && <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-800">Falta aplicar la migración 006 en la base de datos: los cambios de stock aún no se pueden guardar.</p>}
        <p className="text-[11px] text-[#6B5A55]">Cada producto y cada tamaño se controla por separado. Lo agotado deja de ofrecerse en el catálogo.</p>

        <ul className="space-y-2.5">
          {visibles.map((prod) => {
            const lista = pres[prod.id] || [];
            const est = estadoDe(lista);
            return (
              <li key={prod.id} className="rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(60,35,25,.05),0_6px_18px_-10px_rgba(60,35,25,.2)]">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#A8634F]">{prod.marca}</p>
                    <p className="text-[14px] font-bold leading-snug">{prod.nombre}</p>
                  </div>
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: COLOR[est] }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[est] }} />{ROTULO[est]}</span>
                </div>
                <ul className="mt-2.5 space-y-2">
                  {lista.length === 0 && <li className="text-xs text-[#8A7A76]">Sin tamaños registrados.</li>}
                  {lista.map((x) => {
                    const modo = x.stock_modo ?? 'ilimitado';
                    const cant = x.stock_cantidad ?? 0;
                    return (
                      <li key={x.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#FBF4F0] px-3 py-2">
                        <span className="min-w-0 flex-1 basis-32 text-[13px] font-semibold">{x.etiqueta}</span>
                        <button type="button" onClick={() => cambiar(prod.id, x.id, { stock_modo: 'ilimitado' })}
                          className={`h-9 rounded-full px-3.5 text-xs font-extrabold cursor-pointer ${modo === 'ilimitado' ? 'bg-[#2FA7A0] text-white' : 'bg-white text-[#6B5A55]'}`} title="Hay existencias pero no sabemos cuántas">∞ Hay</button>
                        <div className={`flex items-center rounded-full ${modo === 'cantidad' && cant > 0 ? 'bg-[#3BA55D] text-white' : 'bg-white text-[#2B1D1A]'}`}>
                          <button type="button" aria-label={`Menos ${x.etiqueta}`} onClick={() => cambiar(prod.id, x.id, { stock_modo: 'cantidad', stock_cantidad: Math.max(0, (modo === 'cantidad' ? cant : 0) - 1) })} className="h-9 w-9 text-lg cursor-pointer">−</button>
                          <span className="min-w-7 text-center text-sm font-extrabold tabular-nums">{modo === 'cantidad' ? cant : '#'}</span>
                          <button type="button" aria-label={`Más ${x.etiqueta}`} onClick={() => cambiar(prod.id, x.id, { stock_modo: 'cantidad', stock_cantidad: Math.min(99999, (modo === 'cantidad' ? cant : 0) + 1) })} className="h-9 w-9 text-lg cursor-pointer">+</button>
                        </div>
                        <button type="button" onClick={() => cambiar(prod.id, x.id, { stock_modo: 'cantidad', stock_cantidad: 0 })}
                          className={`h-9 rounded-full px-3.5 text-xs font-extrabold cursor-pointer ${modo === 'cantidad' && cant === 0 ? 'bg-[#D9534F] text-white' : 'bg-white text-[#6B5A55]'}`}>Agotado</button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
          {visibles.length === 0 && <li className="py-10 text-center text-sm text-[#8A7A76]">No hay productos con ese filtro.</li>}
        </ul>
      </main>
    </div>
  );
};
