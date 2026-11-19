import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { restaurarSesion } from '../utils/auth';
import { dinero } from '../utils/cobro';
import { KitResaltado } from './KitResaltado';
import { generarImagenCotizacion } from '../utils/imagenCotizacion';
import type { PiezaKit } from './KitResaltado';
import type { ZonaCatalogo } from '../utils/contornos';

/**
 * Bandeja de cotizaciones (solo administradores con sesión).
 * Flujo: la clienta arma su cesta en /catalogo → llega aquí como cotización → la asesora fija el precio de venta y el
 * flete (el cliente solo ve el TOTAL), conversa por WhatsApp y, al aceptarse, la pasa al tablero como tarjeta.
 */

interface LineaSel { presentacion_id?: string | null; producto_id?: string; producto: string; presentacion: string | null; cantidad: number; precio_sugerido: number | null; rutina?: string; marca?: string }
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

interface RutinaFoto { id: string; nombre: string; foto_url: string; ancho_foto: number | null; alto_foto: number | null }
interface PiezaDB { rutina_id: string; producto_id: string; zona: ZonaCatalogo }

const ETIQUETAS = ['duda de precio', 'pide descuento', 'compara marcas', 'cliente frecuente', 'urgente', 'cambió productos', 'sin respuesta'];

const MEDIOS = [
  { valor: 'shalom', etiqueta: 'Shalom (agencia)' },
  { valor: 'marvisur', etiqueta: 'Marvisur (agencia)' },
  { valor: 'olva', etiqueta: 'Olva' },
  { valor: 'delivery_lima', etiqueta: 'Delivery Lima' },
  { valor: 'tienda', etiqueta: 'Retiro en Local Amore' },
];

const saludo = (c: Cotizacion) => `Hola${c.nombre ? ` ${c.nombre.trim().split(' ')[0]}` : ''}`;
/** Respuestas rápidas por WhatsApp (texto editable antes de enviar; WhatsApp abre el chat con el mensaje listo). */
const RESPUESTAS: { etiqueta: string; texto: (c: Cotizacion) => string }[] = [
  { etiqueta: 'Saludo', texto: (c) => `${saludo(c)} 💖 soy de Amore Salon. Vi tu cotización ${c.id}, ¿te ayudo con alguna duda?` },
  { etiqueta: 'Seguimiento', texto: (c) => `${saludo(c)} 🌸 ¿pudiste revisar tu cotización ${c.id}? Quedo atenta para ayudarte a completar tu pedido.` },
  { etiqueta: 'Enviar enlace de pedido', texto: (c) => `${saludo(c)} ✨ para confirmar tu pedido completa tus datos de envío aquí:\n${enlaceDespacho(c)}` },
  { etiqueta: 'Disponibilidad', texto: (c) => `${saludo(c)} 💖 ya revisé la disponibilidad de tu cotización ${c.id}: todo lo que elegiste está listo para enviarse.` },
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

function agruparRutina(sel: LineaSel[]): [string, LineaSel[]][] {
  const mapa = new Map<string, LineaSel[]>();
  sel.forEach((l) => { const k = l.rutina || l.marca || 'Productos'; mapa.set(k, [...(mapa.get(k) || []), l]); });
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
  const total = venta > 0 ? (flete > 0 ? `\n\n*Total: ${dinero(venta + flete)}* (incluye envío)` : `\n\n*Total productos: ${dinero(venta)}*\n_El costo de envío se calcula según tu destino al completar tus datos._`) : '';
  return (
    `Hola${c.nombre ? ` ${c.nombre.trim()}` : ''}, te comparto tu cotización ${c.id}:\n\n${detalle}${total}` +
    `\n\nSi estás de acuerdo, confirma tu pedido y completa tus datos de envío aquí:\n${enlaceDespacho(c)}`
  );
}

export const Cotizaciones: React.FC = () => {
  const [listo, setListo] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [filtro, setFiltro] = useState('nueva');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [edicion, setEdicion] = useState<Record<string, { venta: string; flete: string; motivo: string; notas: string }>>({});
  const [pasando, setPasando] = useState<string | null>(null);
  const [pedidosPorConsulta, setPedidosPorConsulta] = useState<Record<string, { id: string; status: string }>>({});
  // Edición de productos de una cotización (antes de pasarla al tablero, o incluso después)
  const [productosDB, setProductosDB] = useState<{ id: string; marca: string; nombre: string }[]>([]);
  const [presDB, setPresDB] = useState<Record<string, { id: string; etiqueta: string; precio_sugerido: number | null }[]>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<{ lineas: LineaSel[]; nombre: string; telefono: string }>({ lineas: [], nombre: '', telefono: '' });
  const [rutinasFoto, setRutinasFoto] = useState<RutinaFoto[]>([]);
  const [piezasDB, setPiezasDB] = useState<PiezaDB[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({}); // nombre de producto -> id (cotizaciones antiguas sin producto_id)
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
      if (u) {
        cargar();
        supabase.from('orders').select('id,status,raw_data').not('raw_data->>consultaId', 'is', null).limit(500).then(({ data }) => {
          const m: Record<string, { id: string; status: string }> = {};
          (data || []).forEach((o: { id: string; status: string; raw_data?: { consultaId?: string } }) => { if (o.raw_data?.consultaId) m[o.raw_data.consultaId] = { id: o.id, status: o.status }; });
          setPedidosPorConsulta(m);
        });
        supabase.from('rutinas').select('id,nombre,foto_url,ancho_foto,alto_foto').then(({ data }) => setRutinasFoto((data || []) as RutinaFoto[]));
        supabase.from('productos').select('id,nombre').then(({ data }) => setNombres(Object.fromEntries((data || []).map((p: { id: string; nombre: string }) => [p.nombre, p.id]))));
        supabase.from('presentaciones').select('id,producto_id,etiqueta,precio_sugerido,orden').order('orden').then(({ data }) => {
          const m: Record<string, { id: string; etiqueta: string; precio_sugerido: number | null }[]> = {};
          (data || []).forEach((x: { id: string; producto_id: string; etiqueta: string; precio_sugerido: number | null }) => { (m[x.producto_id] ||= []).push({ id: x.id, etiqueta: x.etiqueta, precio_sugerido: x.precio_sugerido }); });
          setPresDB(m);
        });
        supabase.from('productos').select('id,marca,nombre').order('marca').order('nombre').then(({ data }) => setProductosDB((data || []) as { id: string; marca: string; nombre: string }[]));
        supabase.from('rutina_piezas').select('rutina_id,producto_id,zona').then(({ data }) => setPiezasDB((data || []) as PiezaDB[]));
      }
    });
  }, [cargar]);

  const avisar = (texto: string, ms = 2200) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(''), ms);
  };

  // Actualiza la pantalla al instante y guarda en segundo plano; si falla, vuelve a leer lo guardado
  const guardar = async (c: Cotizacion, cambios: Partial<Cotizacion>, mensaje = 'Guardado') => {
    setCotizaciones((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...cambios } : x)));
    avisar(mensaje, 1400);
    const { error: e } = await supabase.from('consultas').update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', c.id);
    if (e) {
      setError('No se pudo guardar el cambio.');
      await cargar();
      return false;
    }
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
    if (v.venta.trim() !== '' && venta === null) return setError('El precio de venta debe ser un número válido.');
    setError('');
    await guardar(c, {
      precio_final: venta,
      motivo_ajuste: v.motivo.trim() || null,
      notas: v.notas.trim() || null,
      estado: c.estado === 'nueva' && venta !== null ? 'en_conversacion' : c.estado,
    }, 'Cotización guardada');
  };

  const alternarEtiqueta = (c: Cotizacion, tag: string) => {
    const actuales = c.etiquetas || [];
    guardar(c, { etiquetas: actuales.includes(tag) ? actuales.filter((t) => t !== tag) : [...actuales, tag] }, 'Etiqueta actualizada');
  };

  /** Agrupa la selección por rutina y busca su foto y las piezas elegidas (para la vista y para la imagen). */
  const kitsDe = (c: Cotizacion) =>
    agruparRutina(c.seleccion).map(([r, ls]) => {
      const ids = new Set(ls.map((l) => l.producto_id || nombres[l.producto]).filter(Boolean) as string[]);
      const porNombre = rutinasFoto.find((x) => x.nombre.split('·')[0].trim() === (ls[0].rutina || r));
      const cuenta = (rid: string) => piezasDB.filter((p) => p.rutina_id === rid && ids.has(p.producto_id)).length;
      const rutina = porNombre && cuenta(porNombre.id) > 0 ? porNombre : [...rutinasFoto].sort((x, y) => cuenta(y.id) - cuenta(x.id))[0];
      const piezas: PiezaKit[] = rutina && cuenta(rutina.id) > 0 ? piezasDB.filter((p) => p.rutina_id === rutina.id).map((p) => ({ producto_id: p.producto_id, zona: p.zona, elegida: ids.has(p.producto_id) })) : [];
      return { r, ls, rutina: rutina && piezas.length > 0 ? rutina : undefined, piezas };
    });

  /** Cotización como imagen: en el celular abre "Compartir" (se elige el chat de WhatsApp); en escritorio la descarga. */
  const compartirImagen = async (c: Cotizacion, venta: number) => {
    try {
      avisar('Generando imagen…', 4000);
      const flete = c.flete ?? 0;
      const blob = await generarImagenCotizacion({
        codigo: c.id,
        nombre: c.nombre?.trim() || null,
        grupos: kitsDe(c).map(({ r, ls, rutina, piezas }) => ({
          titulo: r,
          foto: rutina ? new URL(rutina.foto_url, window.location.origin).toString() : null,
          ancho: rutina?.ancho_foto || 1000,
          alto: rutina?.alto_foto || 1333,
          zonasElegidas: piezas.filter((p) => p.elegida).map((p) => p.zona),
          lineas: ls.map(lineaTexto),
        })),
        total: venta > 0 ? dinero(venta + flete) : '',
        notaTotal: flete > 0 ? 'Total (incluye envío)' : 'Total productos',
      });
      const archivo = new File([blob], `cotizacion-${c.id}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [archivo] })) {
        await nav.share({ files: [archivo], text: `Tu cotización ${c.id}` });
        avisar('Compartida');
        return;
      }
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = archivo.name;
      enlace.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      avisar('Imagen descargada: adjúntala en el chat de WhatsApp');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setError('No se pudo generar la imagen (si la foto está en otro dominio, revisa permisos CORS).');
    }
  };

  const empezarEdicion = (c: Cotizacion) => {
    setBorrador({ lineas: c.seleccion.map((l) => ({ ...l })), nombre: c.nombre || '', telefono: (c.telefono || '').replace(/^51/, '') });
    setEditando(c.id);
  };
  const cambiarLinea = (i: number, cambios: Partial<LineaSel>) => setBorrador((b) => ({ ...b, lineas: b.lineas.map((l, k) => (k === i ? { ...l, ...cambios } : l)) }));
  const agregarProducto = (productoId: string) => {
    const prod = productosDB.find((x) => x.id === productoId);
    if (!prod) return;
    const pres = presDB[prod.id]?.[0];
    const pieza = piezasDB.find((x) => x.producto_id === prod.id);
    const rutina = rutinasFoto.find((r) => r.id === pieza?.rutina_id);
    const nueva: LineaSel = { producto_id: prod.id, producto: prod.nombre, marca: prod.marca, rutina: rutina ? rutina.nombre.split('·')[0].trim() : undefined, presentacion: pres?.etiqueta ?? null, cantidad: 1, precio_sugerido: pres?.precio_sugerido ?? null };
    (nueva as LineaSel & { presentacion_id?: string | null }).presentacion_id = pres?.id ?? null;
    setBorrador((b) => ({ ...b, lineas: [...b.lineas, nueva] }));
  };
  const guardarEdicion = async (c: Cotizacion) => {
    const lineas = borrador.lineas.filter((l) => l.cantidad > 0);
    if (lineas.length === 0) return setError('La cotización debe tener al menos un producto (para anularla usa el estado "Descartadas").');
    const tel = borrador.telefono.replace(/\D/g, '');
    if (borrador.nombre.trim().length < 2) return setError('El nombre de la clienta es obligatorio.');
    if (!/^9\d{8}$/.test(tel)) return setError('El WhatsApp debe tener 9 dígitos y empezar con 9.');
    setError('');
    const conPrecio = lineas.every((l) => l.precio_sugerido != null);
    const total = conPrecio ? lineas.reduce((s, l) => s + (l.precio_sugerido as number) * l.cantidad, 0) : null;
    const ok = await guardar(c, { seleccion: lineas, total_sugerido: total, nombre: borrador.nombre.trim(), telefono: tel }, 'Cotización actualizada');
    if (!ok) return;
    // Si la cotización ya es una tarjeta, actualiza también sus productos para que no queden desfasados
    const idPedido = c.pedido_id || pedidosPorConsulta[c.id]?.id;
    if (idPedido) {
      const items = lineas.map(lineaTexto).join('; ').slice(0, 900);
      const { data: fila } = await supabase.from('orders').select('raw_data').eq('id', idPedido).maybeSingle();
      const raw = { ...((fila?.raw_data as Record<string, unknown>) || {}), itemsDescription: items };
      const { error: eO } = await supabase.from('orders').update({ items_description: items, raw_data: raw, updated_at: new Date().toISOString() }).eq('id', idPedido);
      avisar(eO ? 'Cotización guardada, pero no se pudo actualizar la tarjeta' : `Tarjeta ${idPedido} actualizada`, 3200);
    }
    setEditando(null);
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
    if (venta <= 0) { setError('Antes de pasarla al tablero indica el precio de venta y guárdalo.'); document.getElementById(`venta-${c.id}`)?.focus(); return; }
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

  useEffect(() => {
    cotizaciones.forEach((c) => {
      const p = pedidosPorConsulta[c.id];
      if (p && c.estado !== 'cerrada' && c.estado !== 'descartada') guardar(c, { estado: 'cerrada', pedido_id: p.id }, `Cotización ${c.id} confirmada como pedido ${p.id}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotizaciones, pedidosPorConsulta]);

  const conteo = useMemo(() => {
    const m: Record<string, number> = {};
    cotizaciones.forEach((c) => { m[c.estado] = (m[c.estado] || 0) + 1; });
    return m;
  }, [cotizaciones]);
  // Con texto en el buscador se busca en todas las etapas (nombre, teléfono, código, origen, notas, etiquetas y productos)
  const termino = busqueda.trim().toLowerCase();
  const visibles = termino
    ? cotizaciones.filter((c) => [c.id, c.nombre, c.telefono, c.ref, c.notas, c.pedido_id, ...(c.etiquetas || []), ...c.seleccion.map((l) => l.producto)].some((x) => (x || '').toString().toLowerCase().includes(termino)))
    : cotizaciones.filter((c) => c.estado === filtro);

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
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, teléfono, código, producto o nota…" aria-label="Buscar cotizaciones" className="w-full rounded-xl bg-[#F6E8E1]/70 px-3 py-2 text-sm placeholder:text-[#8A7A76]" />
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
        {visibles.length === 0 && !error && <p className="py-8 text-center text-sm text-[#8A7A76]">{termino ? 'Sin resultados para esa búsqueda.' : 'No hay cotizaciones en esta etapa.'}</p>}

        {visibles.map((c) => {
          const v = valores(c);
          const venta = num(v.venta) ?? 0;
          const flete = c.flete ?? 0; // el flete se define luego, en la tarjeta, cuando se conoce el destino
          const total = venta + flete;
          const tel = (c.telefono || '').replace(/^51/, '');
          return (
            <article key={c.id} className="space-y-3 rounded-2xl border border-[#EADCD3] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold">{c.id}</span>
                <span className={c.estado === 'nueva' && Date.now() - new Date(c.created_at).getTime() > 86400000 ? 'rounded-md bg-rose-500/15 px-1.5 text-xs font-bold text-rose-700' : 'text-xs text-[#8A7A76]'}>{hace(c.created_at)}{c.estado === 'nueva' && Date.now() - new Date(c.created_at).getTime() > 86400000 ? ' · sin atender' : ''}</span>
                {c.ref && <span className="rounded bg-[#F6E8E1] px-1.5 py-0.5 font-mono text-[11px] text-[#8E4F3E]">{c.ref}</span>}
                {(c.pedido_id || pedidosPorConsulta[c.id]) && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">{pedidosPorConsulta[c.id] && !c.pedido_id ? 'Pedido confirmado' : 'Tarjeta'} {c.pedido_id || pedidosPorConsulta[c.id].id}</span>}
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

              <div className="space-y-3 rounded-xl bg-[#FBF4F0] p-3 text-sm">
                {kitsDe(c).map(({ r, ls, rutina, piezas }) => {
                  return (
                    <div key={r} className="flex flex-col gap-3 sm:flex-row">
                      {rutina && piezas.length > 0 && <KitResaltado foto={rutina.foto_url} ancho={rutina.ancho_foto || 1000} alto={rutina.alto_foto || 1333} piezas={piezas} className="mx-auto w-full max-w-[220px] sm:mx-0 sm:w-44 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#A8634F]">{r}</p>
                        <ul className="mt-1 space-y-1">{ls.map((l, i) => <li key={i} className="flex gap-2 text-[14px] leading-snug"><span className="text-[#A8634F]">•</span><span className="min-w-0 break-words">{lineaTexto(l)}</span></li>)}</ul>
                      </div>
                    </div>
                  );
                })}
                {c.total_sugerido != null && <p className="text-xs text-[#8A7A76]">Total sugerido por catálogo: {dinero(Number(c.total_sugerido))}</p>}
              </div>

              {/* Ajuste de la cotización: el equipo puede cambiar productos, tamaños, cantidades y datos de contacto */}
              {c.estado !== 'descartada' && editando !== c.id && (
                <button type="button" onClick={() => empezarEdicion(c)} className="rounded-xl border border-[#EADCD3] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#FBF4F0]">Editar productos y datos</button>
              )}
              {editando === c.id && (
                <div className="space-y-3 rounded-xl border border-dashed border-[#DFBF8B] bg-[#FBF1DC]/40 p-3">
                  <p className="text-xs font-bold">Editar cotización {c.id}{(c.pedido_id || pedidosPorConsulta[c.id]) ? ' · también se actualizará su tarjeta' : ''}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">Nombre *<input value={borrador.nombre} onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#EADCD3] bg-white px-2.5 py-2 text-sm font-semibold normal-case" /></label>
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">WhatsApp (9 dígitos) *<input value={borrador.telefono} onChange={(e) => setBorrador((b) => ({ ...b, telefono: e.target.value }))} inputMode="tel" className="mt-1 w-full rounded-xl border border-[#EADCD3] bg-white px-2.5 py-2 text-sm font-semibold normal-case" /></label>
                  </div>
                  <ul className="space-y-2">
                    {borrador.lineas.map((l, i) => {
                      const lista = (l.producto_id && presDB[l.producto_id]) || [];
                      const actual = (l as LineaSel & { presentacion_id?: string | null }).presentacion_id;
                      return (
                        <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2">
                          <span className="min-w-0 flex-1 basis-40 text-[13px] font-semibold leading-snug">{l.producto}</span>
                          {lista.length > 1 ? (
                            <select value={actual || lista.find((x) => x.etiqueta === l.presentacion)?.id || ''} onChange={(e) => { const pr = lista.find((x) => x.id === e.target.value); cambiarLinea(i, { presentacion: pr?.etiqueta ?? null, precio_sugerido: pr?.precio_sugerido ?? null, ...(pr ? ({ presentacion_id: pr.id } as Partial<LineaSel>) : {}) }); }} className="rounded-lg border border-[#EADCD3] px-2 py-1.5 text-xs font-semibold" aria-label="Tamaño">
                              {lista.map((x) => <option key={x.id} value={x.id}>{x.etiqueta}</option>)}
                            </select>
                          ) : <span className="text-xs text-[#8A7A76]">{l.presentacion}</span>}
                          <span className="flex items-center rounded-full bg-[#F6E8E1]">
                            <button type="button" aria-label="Menos" onClick={() => cambiarLinea(i, { cantidad: Math.max(1, l.cantidad - 1) })} className="h-8 w-8 cursor-pointer text-lg leading-none">−</button>
                            <span className="w-5 text-center text-sm font-bold tabular-nums">{l.cantidad}</span>
                            <button type="button" aria-label="Más" onClick={() => cambiarLinea(i, { cantidad: Math.min(99, l.cantidad + 1) })} className="h-8 w-8 cursor-pointer text-lg leading-none">+</button>
                          </span>
                          <button type="button" aria-label={`Quitar ${l.producto}`} title="Quitar" onClick={() => setBorrador((b) => ({ ...b, lineas: b.lineas.filter((_, k) => k !== i) }))} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#8A7A76] hover:bg-[#F6E8E1]">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <select value="" onChange={(e) => { if (e.target.value) agregarProducto(e.target.value); }} className="w-full rounded-xl border border-[#EADCD3] bg-white px-2.5 py-2 text-sm" aria-label="Agregar producto">
                    <option value="">+ Agregar un producto…</option>
                    {Array.from(new Set(productosDB.map((x) => x.marca))).map((m) => (
                      <optgroup key={m} label={m}>{productosDB.filter((x) => x.marca === m).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</optgroup>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => guardarEdicion(c)} className="rounded-xl bg-[#2B1D1A] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#A8634F] transition-colors">Guardar cambios</button>
                    <button type="button" onClick={() => setEditando(null)} className="rounded-xl border border-[#EADCD3] px-3.5 py-2 text-xs font-bold cursor-pointer">Cancelar</button>
                  </div>
                </div>
              )}

              {/* Cotización de productos. El flete NO se calcula aquí: se agrega en la tarjeta cuando se sabe el destino */}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">
                  Precio de venta (productos) *
                  <input id={`venta-${c.id}`} value={v.venta} onChange={(e) => setEdicion((p) => ({ ...p, [c.id]: { ...v, venta: e.target.value } }))} inputMode="decimal" placeholder="0.00" className="mt-1 w-full rounded-xl border border-[#EADCD3] px-2.5 py-2 text-sm font-bold normal-case" />
                </label>
                <div className="flex items-end">
                  <div className="w-full rounded-xl bg-[#F6E8E1] px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#8E4F3E]">{flete > 0 ? 'Total que ve la clienta' : 'Total productos'}</p>
                    <p className="text-lg font-black text-[#2B1D1A]">{total > 0 ? dinero(total) : '—'}</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#8A7A76]">El envío se calcula después, cuando la clienta indique su destino (en el detalle de la tarjeta).</p>
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
                    <button type="button" onClick={() => copiar(mensajeCotizacion({ ...c, precio_final: venta }), 'Cotización copiada')} className="rounded-xl border border-[#EADCD3] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#FBF4F0]">Copiar cotización</button>
                    {tel && (
                      <a href={`https://wa.me/51${tel}?text=${encodeURIComponent(mensajeCotizacion({ ...c, precio_final: venta }))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white">Enviar por WhatsApp</a>
                    )}
                  </>
                )}
                {venta > 0 && (<button type="button" onClick={() => compartirImagen(c, venta)} className="rounded-xl border border-[#EADCD3] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#FBF4F0]">Cotización en imagen</button>)}
                <button type="button" onClick={() => copiar(enlaceDespacho(c), 'Enlace para confirmar pedido copiado')} className="rounded-xl border border-[#EADCD3] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#FBF4F0]">Enlace para confirmar pedido</button>
                {!c.pedido_id && !pedidosPorConsulta[c.id] && (
                  <button type="button" onClick={() => setPasando(pasando === c.id ? null : c.id)} className="ml-auto rounded-xl bg-[#A8634F] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#8E4F3E]">Pasar al tablero</button>
                )}
              </div>

              {tel && (
                <div className="flex flex-wrap items-center gap-1.5" aria-label="Respuestas rápidas">
                  <span className="text-[10px] font-black uppercase tracking-wide text-[#8A7A76]">Respuestas rápidas</span>
                  {RESPUESTAS.map((rp) => (
                    <a key={rp.etiqueta} href={`https://wa.me/51${tel}?text=${encodeURIComponent(rp.texto(c))}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-[#D4EADE]">{rp.etiqueta}</a>
                  ))}
                </div>
              )}

              {pasando === c.id && (
                <div className="space-y-2.5 rounded-xl border border-dashed border-[#DFBF8B] bg-[#FBF1DC]/50 p-3">
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
                    <button type="button" onClick={() => pasarAlTablero({ ...c, precio_final: num(v.venta) })} className="rounded-xl bg-[#A8634F] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#8E4F3E]">Crear tarjeta</button>
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
