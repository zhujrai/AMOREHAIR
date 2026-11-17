import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { restaurarSesion } from '../utils/auth';
import { dinero } from '../utils/cobro';

/**
 * Bandeja de cotizaciones (solo administradores con sesión).
 * Flujo: la clienta arma su cesta en /catalogo → llega aquí como cotización → la asesora fija el precio de venta y el
 * flete (el cliente solo ve el TOTAL), conversa por WhatsApp y, al aceptarse, la pasa al tablero como tarjeta.
 */

interface LineaSel { producto: string; presentacion: string | null; cantidad: number; precio_sugerido: number | null; rutina?: string; marca?: string }
interface Cotizacion {
  id: string;
  created_at: string;
  nombre: string | null;
  telefono: string | null;
  ref: string | null;
  estado: string;
  seleccion: LineaSel[];
  total_sugerido: number | null;
  precio_final: number | null;
  flete: number | null;
  motivo_ajuste: string | null;
  notas: string | null;
  etiquetas: string[] | null;
  pedido_id: string | null;
}

const ESTADOS = [
  { valor: 'nueva', etiqueta: 'Nuevas' },
  { valor: 'en_conversacion', etiqueta: 'En conversación' },
  { valor: 'cerrada', etiqueta: 'En el tablero' },
  { valor: 'descartada', etiqueta: 'Descartadas' },
];

const ETIQUETAS = ['duda de precio', 'pide descuento', 'compara marcas', 'cliente frecuente', 'urgente', 'cambió productos', 'sin respuesta'];

const MEDIOS = [
  { valor: 'shalom', etiqueta: 'Shalom (agencia)' },
  { valor: 'marvisur', etiqueta: 'Marvisur (agencia)' },
  { valor: 'olva', etiqueta: 'Olva' },
  { valor: 'delivery_lima', etiqueta: 'Delivery Lima' },
  { valor: 'tienda', etiqueta: 'Retiro en tienda' },
];

const hoyISO = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function hace(fechaISO: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000));
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

const lineaTexto = (l: LineaSel) => `${l.cantidad} × ${l.producto}${l.presentacion ? ` (${l.presentacion})` : ''}`;

function agrupar(sel: LineaSel[]): [string, LineaSel[]][] {
  const mapa = new Map<string, LineaSel[]>();
  sel.forEach((l) => {
    const clave = l.marca || l.rutina || 'Productos';
    mapa.set(clave, [...(mapa.get(clave) || []), l]);
  });
  return Array.from(mapa.entries());
}

function enlaceDespacho(c: Cotizacion): string {
  const params = new URLSearchParams();
  if (c.ref) params.set('ref', c.ref);
  params.set('c', c.id);
  params.set('items', c.seleccion.map(lineaTexto).join('; ').slice(0, 300));
  return `${window.location.origin}/pedidos?${params.toString()}`;
}

/** Mensaje de cotización para WhatsApp: la clienta ve solo el TOTAL. */
function mensajeCotizacion(c: Cotizacion): string {
  const venta = c.precio_final ?? 0;
  const flete = c.flete ?? 0;
  const detalle = agrupar(c.seleccion)
    .map(([r, ls]) => `*${r}*\n${ls.map((l) => `• ${lineaTexto(l)}`).join('\n')}`)
    .join('\n\n');
  const total = venta > 0 ? `\n\n*Total: ${dinero(venta + flete)}*${flete > 0 ? ' (incluye envío)' : ''}` : '';
  return (
    `Hola${c.nombre ? ` ${c.nombre.trim()}` : ''}, te comparto tu cotización ${c.id}:\n\n${detalle}${total}` +
    `\n\nSi estás de acuerdo, completa tus datos de envío aquí:\n${enlaceDespacho(c)}`
  );
}

export const Cotizaciones: React.FC = () => {
  const [listo, setListo] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [filtro, setFiltro] = useState('nueva');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [edicion, setEdicion] = useState<Record<string, { venta: string; flete: string; motivo: string; notas: string }>>({});
  const [pasando, setPasando] = useState<string | null>(null);
  const [envio, setEnvio] = useState({ medio: 'shalom', fecha: hoyISO(), dni: '' });

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.from('consultas').select('*').order('created_at', { ascending: false }).limit(200);
    if (e) {
      setError('No se pudieron cargar las cotizaciones (¿tu cuenta es de administrador? ¿está aplicada la migración 005?).');
      return;
    }
    setError('');
    setCotizaciones((data || []) as Cotizacion[]);
  }, []);

  useEffect(() => {
    restaurarSesion().then((u) => {
      setAdmin(Boolean(u));
      setListo(true);
      if (u) cargar();
    });
  }, [cargar]);

  const avisar = (texto: string, ms = 2200) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(''), ms);
  };

  const guardar = async (c: Cotizacion, cambios: Partial<Cotizacion>, mensaje = 'Guardado') => {
    const { error: e } = await supabase.from('consultas').update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', c.id);
    if (e) {
      setError('No se pudo guardar el cambio.');
      return false;
    }
    avisar(mensaje);
    await cargar();
    return true;
  };

  const valores = (c: Cotizacion) =>
    edicion[c.id] ?? {
      venta: c.precio_final != null ? String(c.precio_final) : '',
      flete: c.flete != null ? String(c.flete) : '',
      motivo: c.motivo_ajuste ?? '',
      notas: c.notas ?? '',
    };

  const num = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return s.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
  };

  const guardarCotizacion = async (c: Cotizacion) => {
    const v = valores(c);
    const venta = num(v.venta);
    const flete = num(v.flete);
    if (v.venta.trim() !== '' && venta === null) return setError('El precio de venta debe ser un número válido.');
    if (v.flete.trim() !== '' && flete === null) return setError('El flete debe ser un número válido.');
    setError('');
    await guardar(c, {
      precio_final: venta,
      flete,
      motivo_ajuste: v.motivo.trim() || null,
      notas: v.notas.trim() || null,
      estado: c.estado === 'nueva' && venta !== null ? 'en_conversacion' : c.estado,
    }, 'Cotización guardada');
  };

  const alternarEtiqueta = (c: Cotizacion, tag: string) => {
    const actuales = c.etiquetas || [];
    guardar(c, { etiquetas: actuales.includes(tag) ? actuales.filter((t) => t !== tag) : [...actuales, tag] }, 'Etiqueta actualizada');
  };

  const copiar = async (texto: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar(ok);
    } catch {
      avisar('No se pudo copiar: ' + texto.slice(0, 60), 4000);
    }
  };

  const pasarAlTablero = async (c: Cotizacion) => {
    const venta = c.precio_final ?? 0;
    const flete = c.flete ?? 0;
    if (venta <= 0) return setError('Antes de pasarla al tablero indica el precio de venta y guárdalo.');
    setError('');
    const { data: id, error: eId } = await supabase.rpc('siguiente_pedido_id');
    if (eId || typeof id !== 'string') return setError('No se pudo obtener el número de pedido.');
    const ahora = new Date().toISOString();
    const items = c.seleccion.map(lineaTexto).join('; ').slice(0, 900);
    const { error: eO } = await supabase.from('orders').insert([{
      id,
      created_at: ahora,
      dispatch_date: envio.fecha,
      status: 'nuevos',
      customer_name: c.nombre?.trim() || `Cliente ${c.id}`,
      customer_phone: (c.telefono || '').slice(-9),
      document_type: 'DNI',
      document_number: envio.dni.trim(),
      shipping_type: envio.medio,
      items_description: items,
      notes: `Cotización ${c.id}${c.motivo_ajuste ? `: ${c.motivo_ajuste}` : ''}`,
      whatsapp_sent: false,
      is_cash_on_delivery: false,
      subtotal_amount: venta,
      delivery_fee: flete > 0 ? flete : null,
      total_amount: venta + flete,
      is_deleted: false,
      previous_status: 'nuevos',
      raw_data: { consultaId: c.id, sourceRef: c.ref || undefined, itemsDescription: items },
      updated_at: ahora,
    }]);
    if (eO) return setError('No se pudo crear la tarjeta del tablero: ' + eO.message);
    await guardar(c, { estado: 'cerrada', pedido_id: id }, `Tarjeta ${id} creada en el tablero`);
    setPasando(null);
  };

  const conteo = useMemo(() => {
    const m: Record<string, number> = {};
    cotizaciones.forEach((c) => { m[c.estado] = (m[c.estado] || 0) + 1; });
    return m;
  }, [cotizaciones]);
  const visibles = cotizaciones.filter((c) => c.estado === filtro);

  if (!listo) return <div className="min-h-screen flex items-center justify-center text-sm text-[#8A7A76] bg-[#FBF4F0]">Verificando sesión…</div>;
  if (!admin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center text-sm bg-[#FBF4F0] text-[#2B1D1A]">
        <p>Esta página es solo para administradores.</p>
        <a href="/" className="font-bold text-[#A8634F] underline">Iniciar sesión en el panel</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF4F0] text-[#2B1D1A]">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#EADCD3]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-xs font-bold text-[#A8634F] hover:underline">← Tablero</a>
          <h1 className="flex-1 text-base font-extrabold">Cotizaciones</h1>
          <button type="button" onClick={cargar} className="rounded-xl border border-[#EADCD3] px-3 py-1.5 text-xs font-bold hover:bg-[#FBF4F0] cursor-pointer">Actualizar</button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {ESTADOS.map((e) => (
            <button
              key={e.valor}
              type="button"
              onClick={() => setFiltro(e.valor)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                filtro === e.valor ? 'bg-[#A8634F] text-white' : 'bg-[#F6E8E1] text-[#8E4F3E] hover:bg-[#F3DDD3]'
              }`}
            >
              {e.etiqueta} <span className="opacity-80">{conteo[e.valor] || 0}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {aviso && <div className="fixed top-3 right-3 z-20 max-w-xs rounded-xl bg-[#2B1D1A] px-3 py-2 text-xs font-semibold text-white shadow-lg">{aviso}</div>}
        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
        {visibles.length === 0 && !error && <p className="py-8 text-center text-sm text-[#8A7A76]">No hay cotizaciones en esta etapa.</p>}

        {visibles.map((c) => {
          const v = valores(c);
          const venta = num(v.venta) ?? 0;
          const flete = num(v.flete) ?? 0;
          const total = venta + flete;
          const tel = (c.telefono || '').replace(/^51/, '');
          return (
            <article key={c.id} className="space-y-3 rounded-2xl border border-[#EADCD3] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold">{c.id}</span>
                <span className="text-xs text-[#8A7A76]">{hace(c.created_at)}</span>
                {c.ref && <span className="rounded bg-[#F6E8E1] px-1.5 py-0.5 font-mono text-[11px] text-[#8E4F3E]">{c.ref}</span>}
                {c.pedido_id && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">Tarjeta {c.pedido_id}</span>}
                <select
                  value={c.estado}
                  onChange={(e) => guardar(c, { estado: e.target.value }, 'Estado actualizado')}
                  className="ml-auto rounded-xl border border-[#EADCD3] px-2 py-1 text-xs font-semibold"
                  aria-label="Estado"
                >
                  {ESTADOS.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-bold">{c.nombre || 'Sin nombre'}</span>
                {tel && (
                  <a className="text-xs font-semibold text-emerald-700 underline" href={`https://wa.me/51${tel}`} target="_blank" rel="noreferrer">{tel} · WhatsApp</a>
                )}
              </div>

              <div className="space-y-1.5 rounded-xl bg-[#FBF4F0] p-3 text-sm">
                {agrupar(c.seleccion).map(([r, ls]) => (
                  <div key={r}>
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#A8634F]">{r}</p>
                    <ul className="mt-0.5 space-y-0.5">{ls.map((l, i) => <li key={i}>• {lineaTexto(l)}</li>)}</ul>
                  </div>
                ))}
                {c.total_sugerido != null && <p className="text-xs text-[#8A7A76]">Total sugerido por catálogo: {dinero(Number(c.total_sugerido))}</p>}
              </div>

              {/* Cotización: el cliente solo verá el total */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">
                  Precio de venta
                  <input value={v.venta} onChange={(e) => setEdicion((p) => ({ ...p, [c.id]: { ...v, venta: e.target.value } }))} inputMode="decimal" placeholder="0.00" className="mt-1 w-full rounded-xl border border-[#EADCD3] px-2.5 py-2 text-sm font-bold normal-case" />
                </label>
                <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">
                  Flete
                  <input value={v.flete} onChange={(e) => setEdicion((p) => ({ ...p, [c.id]: { ...v, flete: e.target.value } }))} inputMode="decimal" placeholder="0.00" className="mt-1 w-full rounded-xl border border-[#EADCD3] px-2.5 py-2 text-sm font-bold normal-case" />
                </label>
                <div className="col-span-2 flex items-end">
                  <div className="w-full rounded-xl bg-[#F6E8E1] px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#8E4F3E]">Total que ve la clienta</p>
                    <p className="text-lg font-black text-[#2B1D1A]">{total > 0 ? dinero(total) : '—'}</p>
                  </div>
                </div>
              </div>
              <input value={v.motivo} onChange={(e) => setEdicion((p) => ({ ...p, [c.id]: { ...v, motivo: e.target.value } }))} placeholder="Motivo del ajuste de precio (opcional)" className="w-full rounded-xl border border-[#EADCD3] px-2.5 py-2 text-sm" />

              {/* Etiquetas y notas: alimentan el conocimiento del negocio */}
              <div className="flex flex-wrap gap-1.5" aria-label="Etiquetas">
                {ETIQUETAS.map((t) => {
                  const on = (c.etiquetas || []).includes(t);
                  return (
                    <button key={t} type="button" onClick={() => alternarEtiqueta(c, t)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${on ? 'bg-[#DFBF8B] text-[#2B1D1A]' : 'bg-[#FBF4F0] text-[#8A7A76] hover:bg-[#F6E8E1]'}`}>
                      {on ? '✓ ' : ''}{t}
                    </button>
                  );
                })}
              </div>
              <textarea value={v.notas} onChange={(e) => setEdicion((p) => ({ ...p, [c.id]: { ...v, notas: e.target.value } }))} rows={2} placeholder="Notas de la conversación (tipo de cabello, dudas, objeciones, qué decidió…)" className="w-full rounded-xl border border-[#EADCD3] px-2.5 py-2 text-sm" />

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => guardarCotizacion(c)} className="rounded-xl bg-[#2B1D1A] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#A8634F] transition-colors">Guardar</button>
                {venta > 0 && (
                  <>
                    <button type="button" onClick={() => copiar(mensajeCotizacion({ ...c, precio_final: venta, flete }), 'Cotización copiada')} className="rounded-xl border border-[#EADCD3] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#FBF4F0]">Copiar cotización</button>
                    {tel && (
                      <a href={`https://wa.me/51${tel}?text=${encodeURIComponent(mensajeCotizacion({ ...c, precio_final: venta, flete }))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white">Enviar por WhatsApp</a>
                    )}
                  </>
                )}
                <button type="button" onClick={() => copiar(enlaceDespacho(c), 'Enlace de despacho copiado')} className="rounded-xl border border-[#EADCD3] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#FBF4F0]">Enlace de despacho</button>
                {!c.pedido_id && (
                  <button type="button" onClick={() => setPasando(pasando === c.id ? null : c.id)} className="ml-auto rounded-xl bg-[#A8634F] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#8E4F3E]">Pasar al tablero</button>
                )}
              </div>

              {pasando === c.id && (
                <div className="space-y-2.5 rounded-xl border-2 border-dashed border-[#DFBF8B] bg-[#FBF1DC]/50 p-3">
                  <p className="text-xs font-bold text-[#2B1D1A]">Crear la tarjeta en el tablero ahora (completarás el resto en su detalle)</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">
                      Medio de envío
                      <select value={envio.medio} onChange={(e) => setEnvio((p) => ({ ...p, medio: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#EADCD3] bg-white px-2 py-2 text-sm font-semibold normal-case">
                        {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
                      </select>
                    </label>
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">
                      Fecha de despacho
                      <input type="date" value={envio.fecha} onChange={(e) => setEnvio((p) => ({ ...p, fecha: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#EADCD3] bg-white px-2 py-2 text-sm font-semibold normal-case" />
                    </label>
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">
                      DNI (opcional)
                      <input value={envio.dni} onChange={(e) => setEnvio((p) => ({ ...p, dni: e.target.value }))} inputMode="numeric" className="mt-1 w-full rounded-xl border border-[#EADCD3] bg-white px-2 py-2 text-sm font-semibold normal-case" />
                    </label>
                  </div>
                  <p className="text-[11px] text-[#8A7A76]">Usa esta opción <b>o</b> el enlace de despacho (si la clienta completa el formulario llegará otra tarjeta; evita duplicados eligiendo solo una).</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => pasarAlTablero({ ...c, precio_final: num(v.venta), flete: num(v.flete) })} className="rounded-xl bg-[#A8634F] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#8E4F3E]">Crear tarjeta</button>
                    <button type="button" onClick={() => setPasando(null)} className="rounded-xl border border-[#EADCD3] px-3.5 py-2 text-xs font-bold cursor-pointer">Cancelar</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </main>
    </div>
  );
};
