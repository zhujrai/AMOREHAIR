import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { restaurarSesion } from '../utils/auth';

/**
 * Bandeja de consultas del catálogo (solo administradores con sesión).
 * La vendedora ve lo que eligió la clienta, fija el precio final (con motivo del ajuste) y copia el enlace de despacho.
 */

interface LineaSel { producto: string; presentacion: string | null; cantidad: number; precio_sugerido: number | null }
interface Consulta {
  id: string;
  created_at: string;
  nombre: string | null;
  telefono: string | null;
  rutina_id: string | null;
  ref: string | null;
  estado: string;
  seleccion: LineaSel[];
  total_sugerido: number | null;
  precio_final: number | null;
  motivo_ajuste: string | null;
}

const ESTADOS: { valor: string; etiqueta: string }[] = [
  { valor: 'nueva', etiqueta: 'Nueva' },
  { valor: 'en_conversacion', etiqueta: 'En conversación' },
  { valor: 'cerrada', etiqueta: 'Cerrada (pasó a pedido)' },
  { valor: 'descartada', etiqueta: 'Descartada' },
];

export const Consultas: React.FC = () => {
  const [listo, setListo] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState<Record<string, { precio: string; motivo: string }>>({});
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.from('consultas').select('*').order('created_at', { ascending: false }).limit(100);
    if (e) {
      setError('No se pudieron cargar las consultas (¿tu cuenta es de administrador?).');
      return;
    }
    setError('');
    setConsultas((data || []) as Consulta[]);
  }, []);

  useEffect(() => {
    restaurarSesion().then((u) => {
      setAdmin(Boolean(u));
      setListo(true);
      if (u) cargar();
    });
  }, [cargar]);

  const guardar = async (c: Consulta, cambios: Partial<Consulta>) => {
    const { error: e } = await supabase.from('consultas').update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', c.id);
    if (e) {
      setError('No se pudo guardar el cambio.');
      return;
    }
    setAviso('Guardado');
    setTimeout(() => setAviso(''), 1500);
    cargar();
  };

  const guardarPrecio = (c: Consulta) => {
    const ed = editando[c.id];
    if (!ed) return;
    const precio = ed.precio.trim() === '' ? null : Number(ed.precio.replace(',', '.'));
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
      setError('El precio final debe ser un número válido.');
      return;
    }
    guardar(c, { precio_final: precio, motivo_ajuste: ed.motivo.trim() || null });
  };

  const copiarEnlace = async (c: Consulta) => {
    const url = `${window.location.origin}/pedidos${c.ref ? `?ref=${encodeURIComponent(c.ref)}` : ''}`;
    try {
      await navigator.clipboard.writeText(url);
      setAviso('Enlace de despacho copiado');
    } catch {
      setAviso(url);
    }
    setTimeout(() => setAviso(''), 2500);
  };

  if (!listo) return <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">Verificando sesión…</div>;
  if (!admin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center text-sm">
        <p>Esta página es solo para administradores.</p>
        <a href="/" className="font-bold text-[#6366F1] underline">Iniciar sesión en el panel</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
        <a href="/" className="text-xs font-bold text-[#6366F1] hover:underline">← Tablero</a>
        <h1 className="font-extrabold text-base flex-1">Consultas del catálogo <span className="text-xs font-semibold text-[#475569]">({consultas.length})</span></h1>
        <button type="button" onClick={cargar} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-zinc-50 cursor-pointer">Actualizar</button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {aviso && <div className="fixed top-3 right-3 z-20 bg-zinc-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">{aviso}</div>}
        {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
        {consultas.length === 0 && !error && <p className="text-sm text-[#475569]">Aún no hay consultas.</p>}

        {consultas.map((c) => {
          const ed = editando[c.id] ?? { precio: c.precio_final != null ? String(c.precio_final) : '', motivo: c.motivo_ajuste ?? '' };
          const fecha = new Date(c.created_at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
          return (
            <article key={c.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm">{c.id}</span>
                <span className="text-xs text-[#475569]">{fecha}</span>
                {c.ref && <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-700">Origen: {c.ref}</span>}
                <select
                  value={c.estado}
                  onChange={(e) => guardar(c, { estado: e.target.value })}
                  className="ml-auto text-xs font-semibold border border-[#E2E8F0] rounded-xl px-2 py-1"
                >
                  {ESTADOS.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
                </select>
              </div>

              <div className="text-sm">
                <p className="font-bold">{c.nombre || 'Sin nombre'}{c.telefono && (
                  <a className="ml-2 text-xs font-semibold text-emerald-700 underline" href={`https://wa.me/51${c.telefono.replace(/^51/, '')}`} target="_blank" rel="noreferrer">{c.telefono} · WhatsApp</a>
                )}</p>
              </div>

              <ul className="text-sm space-y-0.5">
                {c.seleccion.map((l, i) => (
                  <li key={i}>• {l.cantidad} × {l.producto}{l.presentacion ? ` (${l.presentacion})` : ''}{l.precio_sugerido != null ? ` · ref. S/ ${Number(l.precio_sugerido).toFixed(2)}` : ''}</li>
                ))}
              </ul>
              <p className="text-xs text-[#475569]">Total sugerido: {c.total_sugerido != null ? `S/ ${Number(c.total_sugerido).toFixed(2)}` : 'sin precios sugeridos'}</p>

              <div className="grid grid-cols-[110px_1fr_auto] gap-2 items-center">
                <input
                  value={ed.precio}
                  onChange={(e) => setEditando((p) => ({ ...p, [c.id]: { ...ed, precio: e.target.value } }))}
                  placeholder="Precio final"
                  inputMode="decimal"
                  className="border border-[#E2E8F0] rounded-xl px-2.5 py-2 text-sm"
                />
                <input
                  value={ed.motivo}
                  onChange={(e) => setEditando((p) => ({ ...p, [c.id]: { ...ed, motivo: e.target.value } }))}
                  placeholder="Motivo del ajuste (opcional)"
                  className="border border-[#E2E8F0] rounded-xl px-2.5 py-2 text-sm"
                />
                <button type="button" onClick={() => guardarPrecio(c)} className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold cursor-pointer">Guardar</button>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => copiarEnlace(c)} className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold hover:bg-zinc-50 cursor-pointer">
                  Copiar enlace de despacho
                </button>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
};
