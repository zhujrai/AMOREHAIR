import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/dbApi';
import { useEscapeCierra } from '../utils/useEscapeCierra';
import { restaurarSesion } from '../utils/auth';
import { Inbox, MessagesSquare, PackageCheck, Search, RefreshCw, Archive, Maximize2, MessageCircle, ChevronLeft, ChevronRight, XCircle, Undo2, X } from 'lucide-react';
import type { Order } from '../types';
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
  motivo_descarte?: string | null;
  gestionado_por?: string | null;
  gestionado_en?: string | null;
  updated_at?: string | null;
}

const ESTADOS = [
  { valor: 'nueva', etiqueta: 'Por revisar' },
  { valor: 'en_conversacion', etiqueta: 'En negociación' },
  { valor: 'cerrada', etiqueta: 'Pedido confirmado' },
  { valor: 'descartada', etiqueta: 'Descartada' },
];
const COLUMNAS = [
  { estado: 'nueva', titulo: 'Por revisar', corto: 'Por revisar', ayuda: 'Cotizaciones nuevas: fija el precio y respóndele a la clienta', icono: <Inbox className="h-4 w-4" />, fondo: 'bg-[#F6E8E1]' },
  { estado: 'en_conversacion', titulo: 'En negociación', corto: 'En negociación', ayuda: 'Ya tienen precio y se está conversando con la clienta', icono: <MessagesSquare className="h-4 w-4" />, fondo: 'bg-[#FBF1DC]' },
  { estado: 'cerrada', titulo: 'Pedido confirmado', corto: 'Pedido confirmado', ayuda: 'La clienta aceptó: ya existe su tarjeta en el tablero de Pedidos', icono: <PackageCheck className="h-4 w-4" />, fondo: 'bg-[#ECFDF5]' },
];
const MOTIVOS_DESCARTE = ['Sin respuesta de la clienta', 'Le pareció caro', 'Compró en otro lado', 'Duplicada', 'Cambió de idea / ya no lo necesita', 'Otro'];
const MAX_CONFIRMADAS = 6; // la columna "Pedido confirmado" muestra solo las más recientes; el resto vive en el Archivo

interface RutinaFoto { id: string; nombre: string; foto_url: string; ancho_foto: number | null; alto_foto: number | null }
interface PiezaDB { rutina_id: string; producto_id: string; zona: ZonaCatalogo }

const ETIQUETAS = ['duda de precio', 'pide descuento', 'compara marcas', 'cliente frecuente', 'urgente', 'cambió productos', 'sin respuesta'];

const MEDIOS = [
  { valor: 'por_confirmar', etiqueta: 'Por confirmar (lo define la clienta)' },
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

const Mini: React.FC<{ tip: string; onClick?: () => void; href?: string; tono?: string; children: React.ReactNode }> = ({ tip, onClick, href, tono = 'text-[#6B5A55] hover:bg-[#F6E8E1] dark:text-zinc-300 dark:hover:bg-white/10', children }) => {
  const clase = `flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors ${tono}`;
  return href
    ? <a href={href} target="_blank" rel="noreferrer" data-tip={tip} aria-label={tip} onClick={(e) => e.stopPropagation()} className={clase}>{children}</a>
    : <button type="button" data-tip={tip} aria-label={tip} onClick={(e) => { e.stopPropagation(); onClick?.(); }} className={clase}>{children}</button>;
};

interface CotizacionesProps {
  orders: Order[];
  /** Cotización a abrir (viene de un salto desde una tarjeta de pedido) */
  focoId?: string | null;
  onFocoAtendido?: () => void;
  onVerPedido?: (idPedido: string) => void;
  /** Cantidad de cotizaciones "Por revisar" (alimenta el contador del selector) */
  onNuevas?: (n: number) => void;
}

/** Deja solo los 9 dígitos del celular: admite +51, 51, espacios, guiones y paréntesis */
const normalizarTel = (raw: string): string => {
  let d = (raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('51')) d = d.slice(2);
  return d;
};

export const Cotizaciones: React.FC<CotizacionesProps> = ({ orders, focoId, onFocoAtendido, onVerPedido, onNuevas }) => {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [filtro, setFiltro] = useState('nueva');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [edicion, setEdicion] = useState<Record<string, { venta: string; flete: string; motivo: string; notas: string }>>({});
  // El pedido enlazado de cada cotización sale de los pedidos ya cargados en el panel (se actualiza en vivo)
  const pedidosPorConsulta = useMemo(() => {
    const m: Record<string, { id: string; status: string }> = {};
    orders.forEach((o) => { if (o.consultaId && !o.isDeleted) m[o.consultaId] = { id: o.id, status: o.status }; });
    return m;
  }, [orders]);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [pestana, setPestana] = useState('nueva');
  const [arrastrada, setArrastrada] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [descartando, setDescartando] = useState<Cotizacion | null>(null);
  const [motivoSel, setMotivoSel] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [confirmando, setConfirmando] = useState<Cotizacion | null>(null);
  const [archivo, setArchivo] = useState<null | 'descartada' | 'cerrada'>(null);
  // Edición de productos de una cotización (antes de pasarla al tablero, o incluso después)
  const [productosDB, setProductosDB] = useState<{ id: string; marca: string; nombre: string }[]>([]);
  const [presDB, setPresDB] = useState<Record<string, { id: string; etiqueta: string; precio_sugerido: number | null }[]>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<{ lineas: LineaSel[]; nombre: string; telefono: string }>({ lineas: [], nombre: '', telefono: '' });
  const [rutinasFoto, setRutinasFoto] = useState<RutinaFoto[]>([]);
  const [piezasDB, setPiezasDB] = useState<PiezaDB[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({}); // nombre de producto -> id (cotizaciones antiguas sin producto_id)
  const [envio, setEnvio] = useState({ medio: 'por_confirmar', fecha: hoyISO(), dni: '' });

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
    cargar();
    supabase.from('rutinas').select('id,nombre,foto_url,ancho_foto,alto_foto').then(({ data }) => setRutinasFoto((data || []) as RutinaFoto[]));
    supabase.from('productos').select('id,nombre').then(({ data }) => setNombres(Object.fromEntries((data || []).map((p: { id: string; nombre: string }) => [p.nombre, p.id]))));
    supabase.from('presentaciones').select('id,producto_id,etiqueta,precio_sugerido,orden').order('orden').then(({ data }) => {
      const m: Record<string, { id: string; etiqueta: string; precio_sugerido: number | null }[]> = {};
      (data || []).forEach((x: { id: string; producto_id: string; etiqueta: string; precio_sugerido: number | null }) => { (m[x.producto_id] ||= []).push({ id: x.id, etiqueta: x.etiqueta, precio_sugerido: x.precio_sugerido }); });
      setPresDB(m);
    });
    supabase.from('productos').select('id,marca,nombre').order('marca').order('nombre').then(({ data }) => setProductosDB((data || []) as { id: string; marca: string; nombre: string }[]));
    supabase.from('rutina_piezas').select('rutina_id,producto_id,zona').then(({ data }) => setPiezasDB((data || []) as PiezaDB[]));
    // Llegan cotizaciones nuevas del catálogo en cualquier momento: se refresca sola cada 30 s
    const intervalo = window.setInterval(() => { if (!document.hidden) cargar(); }, 30000);
    return () => window.clearInterval(intervalo);
  }, [cargar]);

  // Quién hace los cambios de etapa: se guarda solo la ÚLTIMA gestión (sin historial, para no llenar la base)
  const [quien, setQuien] = useState('');
  useEffect(() => { restaurarSesion().then((u) => setQuien(u?.name || '')); }, []);

  const avisar = (texto: string, ms = 2200) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(''), ms);
  };

  // Actualiza la pantalla al instante y guarda en segundo plano; si falla, vuelve a leer lo guardado
  const guardar = async (c: Cotizacion, cambios: Partial<Cotizacion>, mensaje = 'Guardado') => {
    const ahora = new Date().toISOString();
    if (cambios.estado && cambios.estado !== c.estado) { cambios = { ...cambios, gestionado_por: quien || null, gestionado_en: ahora }; }
    setCotizaciones((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...cambios } : x)));
    avisar(mensaje, 1400);
    const { error: e } = await supabase.from('consultas').update({ ...cambios, updated_at: ahora }).eq('id', c.id);
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
    const tel = normalizarTel(borrador.telefono);
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

  /** Lo que falta para poder confirmar el pedido (null = todo listo) */
  const faltaParaConfirmar = (c: Cotizacion): string | null => {
    if (!((c.precio_final ?? 0) > 0)) return 'Para confirmar el pedido indica el precio de venta y guárdalo.';
    if ((c.nombre || '').trim().length < 2) return 'Falta el nombre de la clienta (edítalo en "Editar productos y datos").';
    if (!/^9\d{8}$/.test(normalizarTel(c.telefono || ''))) return 'Falta el WhatsApp de la clienta (9 dígitos, empieza con 9).';
    return null;
  };

  /** Botón "Confirmar pedido" del detalle: guarda lo escrito, y si falta nombre o WhatsApp abre su edición */
  const confirmarDesdeDetalle = async (c: Cotizacion) => {
    const v = valores(c);
    const venta = num(v.venta);
    if (v.venta.trim() !== '' && venta === null) return setError('El precio de venta debe ser un número válido.');
    if (venta === null || venta <= 0) { setError('Para confirmar el pedido indica el precio de venta.'); document.getElementById(`venta-${c.id}`)?.focus(); return; }
    const datos: { nombre?: string; telefono?: string } = {};
    if (editando === c.id) {
      const tel = normalizarTel(borrador.telefono);
      if (borrador.nombre.trim().length < 2) return setError('El nombre de la clienta es obligatorio.');
      if (!/^9\d{8}$/.test(tel)) return setError('El WhatsApp debe tener 9 dígitos y empezar con 9 (puedes escribirlo con +51 o espacios).');
      datos.nombre = borrador.nombre.trim(); datos.telefono = tel;
    }
    const actualizada = { ...c, ...datos, precio_final: venta, motivo_ajuste: v.motivo.trim() || null, notas: v.notas.trim() || null };
    const ok = await guardar(c, { ...datos, precio_final: venta, motivo_ajuste: actualizada.motivo_ajuste, notas: actualizada.notas, ...(c.estado === 'nueva' ? { estado: 'en_conversacion' } : {}) }, 'Guardado');
    if (!ok) return;
    const falta = faltaParaConfirmar(actualizada);
    if (falta) {
      setError(falta);
      if (editando !== c.id) empezarEdicion(c);
      return;
    }
    setError('');
    if (editando === c.id) setEditando(null);
    setConfirmando(actualizada);
  };

  const intentarConfirmar = (c: Cotizacion) => {
    const falta = faltaParaConfirmar(c);
    if (falta) {
      setError(falta);
      setDetalleId(c.id);
      window.setTimeout(() => document.getElementById(`venta-${c.id}`)?.focus(), 80);
      return;
    }
    setError('');
    setConfirmando(c);
  };

  /** Reglas del tablero: una cotización se mueve entre etapas; confirmar crea el pedido y descartar pide motivo */
  const mover = (c: Cotizacion, destino: string) => {
    if (destino === c.estado) return;
    if (c.estado === 'cerrada') { setError('Esa cotización ya está confirmada: su seguimiento continúa en el tablero de Pedidos.'); return; }
    if (destino === 'descartada') { setError(''); setMotivoSel(''); setMotivoOtro(''); setDescartando(c); return; }
    if (destino === 'cerrada') { intentarConfirmar(c); return; }
    setError('');
    guardar(c, { estado: destino, ...(c.estado === 'descartada' ? { motivo_descarte: null } : {}) }, destino === 'nueva' ? 'Devuelta a Por revisar' : 'Pasó a En negociación');
  };

  const descartar = async () => {
    if (!descartando) return;
    const motivo = motivoSel === 'Otro' ? motivoOtro.trim() : motivoSel;
    if (!motivo) { setError('Elige el motivo del descarte (si es "Otro", escríbelo).'); return; }
    setError('');
    await guardar(descartando, { estado: 'descartada', motivo_descarte: motivo }, `Cotización ${descartando.id} descartada`);
    if (detalleId === descartando.id) setDetalleId(null);
    setDescartando(null);
  };

  /** Crea el pedido enlazado (una sola vez) y deja la cotización en "Pedido confirmado" */
  const crearPedido = async (c: Cotizacion) => {
    const falta = faltaParaConfirmar(c);
    if (falta) return setError(falta);
    setError('');
    const venta = c.precio_final ?? 0;
    const flete = c.flete ?? 0;
    // Evita duplicados: si la clienta ya confirmó por su enlace (o alguien más lo hizo), solo se enlaza
    const { data: previo } = await supabase.from('orders').select('id').eq('raw_data->>consultaId', c.id).limit(1);
    if (previo && previo.length > 0) {
      await guardar(c, { estado: 'cerrada', pedido_id: previo[0].id }, `Ya existía el pedido ${previo[0].id}: enlazado`);
      setConfirmando(null);
      return;
    }
    const { data: id, error: eId } = await supabase.rpc('siguiente_pedido_id');
    if (eId || typeof id !== 'string') return setError('No se pudo obtener el número de pedido.');
    const ahora = new Date().toISOString();
    const items = c.seleccion.map(lineaTexto).join('; ').slice(0, 900);
    const porConfirmar = envio.medio === 'por_confirmar';
    const { error: eO } = await supabase.from('orders').insert([{
      id,
      created_at: ahora,
      dispatch_date: envio.fecha,
      status: 'nuevos',
      customer_name: c.nombre?.trim() || `Cliente ${c.id}`,
      customer_phone: normalizarTel(c.telefono || '').slice(-9),
      document_type: 'DNI',
      document_number: envio.dni.trim(),
      shipping_type: porConfirmar ? 'shalom' : envio.medio,
      items_description: items,
      notes: `Cotización ${c.id}${c.motivo_ajuste ? `: ${c.motivo_ajuste}` : ''}${porConfirmar ? ' · Medio de envío por confirmar con la clienta' : ''}`,
      whatsapp_sent: false,
      is_cash_on_delivery: false,
      subtotal_amount: venta,
      delivery_fee: flete > 0 ? flete : null,
      total_amount: venta + flete,
      is_deleted: false,
      previous_status: 'nuevos',
      raw_data: { consultaId: c.id, sourceRef: c.ref || undefined, itemsDescription: items, ...(porConfirmar ? { medioPorConfirmar: true } : {}) },
      updated_at: ahora,
    }]);
    if (eO) return setError('No se pudo crear la tarjeta del tablero: ' + eO.message);
    await guardar(c, { estado: 'cerrada', pedido_id: id }, `Pedido ${id} creado y enlazado`);
    setConfirmando(null);
  };

  useEffect(() => {
    cotizaciones.forEach((c) => {
      const p = pedidosPorConsulta[c.id];
      if (p && c.estado !== 'cerrada' && c.estado !== 'descartada') guardar(c, { estado: 'cerrada', pedido_id: p.id }, `Cotización ${c.id} confirmada como pedido ${p.id}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotizaciones, pedidosPorConsulta]);


  // Estadísticas y filtrado
  const termino = busqueda.trim().toLowerCase();
  const coincide = (c: Cotizacion) => [c.id, c.nombre, c.telefono, c.ref, c.notas, c.pedido_id, c.motivo_descarte, ...(c.etiquetas || []), ...c.seleccion.map((l) => l.producto)].some((x) => (x || '').toString().toLowerCase().includes(termino));
  const filtradas = termino ? cotizaciones.filter(coincide) : cotizaciones;
  const porEstado = (e: string) => filtradas.filter((c) => c.estado === e);
  const descartadas = cotizaciones.filter((c) => c.estado === 'descartada');
  const confirmadasTodas = cotizaciones.filter((c) => c.estado === 'cerrada');
  const detalle = cotizaciones.find((c) => c.id === detalleId) || null;

  useEffect(() => { onNuevas?.(cotizaciones.filter((c) => c.estado === 'nueva').length); }, [cotizaciones, onNuevas]);
  // Salto desde una tarjeta de pedido: abre esa cotización
  useEffect(() => {
    if (focoId && cotizaciones.some((c) => c.id === focoId)) {
      setDetalleId(focoId);
      onFocoAtendido?.();
    }
  }, [focoId, cotizaciones, onFocoAtendido]);

  useEscapeCierra(Boolean(detalle) && !descartando && !confirmando, () => { setDetalleId(null); setError(''); });
  useEscapeCierra(Boolean(descartando), () => setDescartando(null));
  useEscapeCierra(Boolean(confirmando), () => setConfirmando(null));
  useEscapeCierra(archivo !== null, () => setArchivo(null));

  const sinAtender = (c: Cotizacion) => c.estado === 'nueva' && Date.now() - new Date(c.created_at).getTime() > 86400000;

  const tarjeta = (c: Cotizacion) => {
    const tel = (c.telefono || '').replace(/^51/, '');
    const pedido = c.pedido_id || pedidosPorConsulta[c.id]?.id;
    const unidades = c.seleccion.reduce((s, l) => s + l.cantidad, 0);
    const rutinas = agruparRutina(c.seleccion).map(([r]) => r).filter((r) => r && r !== 'Otros').slice(0, 2).join(' · ');
    const idx = COLUMNAS.findIndex((x) => x.estado === c.estado);
    const anterior = idx > 0 ? COLUMNAS[idx - 1] : null;
    const siguiente = idx >= 0 && idx < COLUMNAS.length - 1 ? COLUMNAS[idx + 1] : null;
    const total = (c.precio_final ?? 0) + (c.flete ?? 0);
    return (
      <article
        key={c.id}
        id={`cot-card-${c.id}`}
        draggable={c.estado !== 'cerrada'}
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; setArrastrada(c.id); }}
        onDragEnd={() => { setArrastrada(null); setSobre(null); }}
        className={`rounded-xl border border-[#EADCD3] bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#2A1E1A] dark:text-white ${arrastrada === c.id ? 'opacity-40' : ''} ${c.estado !== 'cerrada' ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div role="button" tabIndex={0} onClick={() => setDetalleId(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalleId(c.id); } }} className="cursor-pointer space-y-1.5" aria-label={`Abrir cotización ${c.id}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[13px] font-black">{c.id}</span>
            <span className={sinAtender(c) ? 'rounded-md bg-rose-500/15 px-1.5 text-[11px] font-bold text-rose-700' : 'text-[11px] text-[#8A7A76]'}>{hace(c.created_at)}{sinAtender(c) ? ' · sin atender' : ''}</span>
            {c.ref && <span className="rounded bg-[#F6E8E1] px-1.5 font-mono text-[10px] text-[#8E4F3E]">{c.ref}</span>}
          </div>
          <p className="truncate text-sm font-bold">{c.nombre || 'Sin nombre'}</p>
          <p className="line-clamp-2 text-xs leading-snug text-[#6B5A55] dark:text-zinc-300">{unidades} {unidades === 1 ? 'producto' : 'productos'}{rutinas ? ` · ${rutinas}` : ''}</p>
          <div className="flex items-center justify-between gap-2">
            {total > 0
              ? <span className="text-sm font-black">{dinero(total)}</span>
              : c.estado === 'cerrada' ? <span /> : <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">Precio por definir</span>}
            {pedido && <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{pedido}</span>}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-0.5 border-t border-[#EADCD3]/70 pt-1.5 dark:border-white/10">
          <Mini tip="Abrir detalle" onClick={() => setDetalleId(c.id)}><Maximize2 className="h-4 w-4" /></Mini>
          {tel && <Mini tip="Escribir por WhatsApp" href={`https://wa.me/51${tel}`} tono="text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"><MessageCircle className="h-4 w-4" /></Mini>}
          <span className="flex-1" />
          {c.estado === 'cerrada' ? (
            pedido && onVerPedido ? <Mini tip={`Ver pedido ${pedido}`} onClick={() => onVerPedido(pedido)} tono="text-emerald-700 hover:bg-emerald-500/10"><PackageCheck className="h-4 w-4" /></Mini> : null
          ) : (
            <>
              {anterior && <Mini tip={`Devolver a ${anterior.titulo}`} onClick={() => mover(c, anterior.estado)}><ChevronLeft className="h-4 w-4" /></Mini>}
              {siguiente && <Mini tip={siguiente.estado === 'cerrada' ? 'Confirmar pedido' : `Pasar a ${siguiente.titulo}`} onClick={() => mover(c, siguiente.estado)} tono="text-[#A8634F] hover:bg-[#F6E8E1]"><ChevronRight className="h-4 w-4" /></Mini>}
              <Mini tip="Descartar" onClick={() => mover(c, 'descartada')} tono="text-rose-600 hover:bg-rose-500/10"><XCircle className="h-4 w-4" /></Mini>
            </>
          )}
        </div>
      </article>
    );
  };

  const modal = (cerrar: () => void, ancho: string, hijos: React.ReactNode, z = 'z-40') => (
    <div className={`fixed inset-0 ${z} flex items-end justify-center bg-black/45 sm:items-center sm:p-4`} onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div role="dialog" aria-modal="true" className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[#FBF4F0] text-[#2B1D1A] shadow-2xl sm:rounded-2xl ${ancho}`}>{hijos}</div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-2.5 py-3 sm:px-5 sm:py-4 space-y-3">
      {/* Barra: búsqueda y acciones con iconos */}
      <div className="flex items-center gap-2 rounded-xl border border-[#EADCD3] bg-white p-2.5 shadow-2xs dark:border-white/10 dark:bg-[#2A1E1A]">
        <div className="relative min-w-0 flex-1 sm:max-w-sm" title="Nombre, teléfono, código, producto o nota">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B5A55]" />
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cotización…" aria-label="Buscar cotizaciones" className="w-full rounded-lg border border-[#EADCD3] bg-[#FBF4F0] py-2 pl-9 pr-3 text-sm placeholder:text-[#8A7A76] focus:border-[#A8634F] focus:bg-white focus:outline-none dark:border-white/10 dark:bg-[#1F1613] dark:text-white" />
        </div>
        <span className="flex-1 hidden sm:block" />
        <button type="button" onClick={cargar} data-tip="Actualizar" aria-label="Actualizar" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EADCD3] bg-white text-[#6B5A55] cursor-pointer hover:bg-[#FBF4F0] dark:border-white/10 dark:bg-[#2A1E1A] dark:text-zinc-200"><RefreshCw className="h-4 w-4" /></button>
        <button type="button" onClick={() => setArchivo('descartada')} data-tip="Archivo: descartadas y confirmadas" aria-label="Archivo de cotizaciones" className="tip-der relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#EADCD3] bg-white text-[#6B5A55] cursor-pointer hover:bg-[#FBF4F0] dark:border-white/10 dark:bg-[#2A1E1A] dark:text-zinc-200">
          <Archive className="h-4 w-4" />
          {descartadas.length + Math.max(0, confirmadasTodas.length - MAX_CONFIRMADAS) > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6B5A55] px-1 text-[9px] font-black text-white">{descartadas.length + Math.max(0, confirmadasTodas.length - MAX_CONFIRMADAS)}</span>}
        </button>
      </div>

      {aviso && <div className="fixed right-3 top-20 z-[60] max-w-xs rounded-xl bg-[#2B1D1A] px-3 py-2 text-xs font-semibold text-white shadow-lg">{aviso}</div>}
      {error && !detalle && !confirmando && !descartando && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}

      {/* Móvil: pestañas de etapa con contador (una columna a la vez) */}
      <div className="flex gap-1 md:hidden" role="tablist" aria-label="Etapa">
        {COLUMNAS.map((col) => (
          <button key={col.estado} type="button" role="tab" aria-selected={pestana === col.estado} onClick={() => setPestana(col.estado)} className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[11px] font-extrabold cursor-pointer transition-colors ${pestana === col.estado ? 'bg-[#A8634F] text-white' : 'bg-[#F6E8E1] text-[#8E4F3E] dark:bg-white/10 dark:text-zinc-200'}`}>
            <span className="hidden min-[400px]:inline">{col.icono}</span><span className="text-center leading-tight">{col.corto}</span><span className="opacity-80">{porEstado(col.estado).length}</span>
          </button>
        ))}
      </div>

      {/* Tablero */}
      <div className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-3">
        {COLUMNAS.map((col) => {
          const todas = porEstado(col.estado);
          const lista = col.estado === 'cerrada' && !termino ? [...todas].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()).slice(0, MAX_CONFIRMADAS) : todas;
          const ocultas = todas.length - lista.length;
          return (
            <section
              key={col.estado}
              id={`cot-col-${col.estado}`}
              onDragOver={(e) => { if (arrastrada) { e.preventDefault(); setSobre(col.estado); } }}
              onDragLeave={() => setSobre((s) => (s === col.estado ? null : s))}
              onDrop={(e) => { e.preventDefault(); const c = cotizaciones.find((x) => x.id === arrastrada); setSobre(null); setArrastrada(null); if (c) mover(c, col.estado); }}
              className={`${pestana === col.estado ? 'block' : 'hidden'} md:block min-h-[200px] rounded-2xl bg-[#F6E8E1]/60 p-2 transition-colors dark:bg-white/5 ${sobre === col.estado ? 'ring-2 ring-[#A8634F] ring-offset-2' : ''}`}
            >
              <div className="mb-2 hidden items-center gap-2 px-1.5 pt-1 md:flex" title={col.ayuda}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[#8E4F3E] ${col.fondo}`}>{col.icono}</span>
                <h3 className="flex-1 truncate text-sm font-extrabold">{col.titulo}</h3>
                <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-[#6B5A55] dark:bg-white/10 dark:text-zinc-200">{todas.length}</span>
              </div>
              <div className="space-y-2.5">
                {lista.length === 0 && <p className="px-2 py-8 text-center text-xs text-[#8A7A76]">{termino ? 'Sin resultados.' : col.estado === 'nueva' ? 'No hay cotizaciones por revisar.' : col.estado === 'en_conversacion' ? 'Nada en negociación.' : 'Aún no hay pedidos confirmados.'}</p>}
                {lista.map(tarjeta)}
                {ocultas > 0 && <button type="button" onClick={() => setArchivo('cerrada')} className="w-full rounded-xl py-2 text-xs font-bold text-[#A8634F] cursor-pointer hover:bg-white/60">Ver {ocultas} más en el archivo</button>}
              </div>
            </section>
          );
        })}
      </div>

      {/* Zona para soltar y descartar (solo aparece mientras se arrastra una tarjeta) */}
      {arrastrada && (
        <div
          onDragOver={(e) => { e.preventDefault(); setSobre('descartada'); }}
          onDragLeave={() => setSobre(null)}
          onDrop={(e) => { e.preventDefault(); const c = cotizaciones.find((x) => x.id === arrastrada); setSobre(null); setArrastrada(null); if (c) mover(c, 'descartada'); }}
          className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-4 text-sm font-extrabold shadow-xl ${sobre === 'descartada' ? 'border-rose-600 bg-rose-600 text-white' : 'border-rose-400 bg-white text-rose-600'}`}
        >
          <XCircle className="h-5 w-5" /> Suelta aquí para descartar
        </div>
      )}

      {/* Detalle de la cotización */}
      {detalle && (() => {
        const c = detalle;
        const v = valores(c);
        const venta = num(v.venta) ?? 0;
        const flete = c.flete ?? 0;
        const total = venta + flete;
        const tel = (c.telefono || '').replace(/^51/, '');
        return modal(() => { setDetalleId(null); setError(''); }, 'sm:max-w-3xl', (
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-base font-extrabold">Cotización {c.id}</h2>
              <button type="button" onClick={() => { setDetalleId(null); setError(''); }} data-tip="Cerrar" aria-label="Cerrar" className="tip-der flex h-8 w-8 items-center justify-center rounded-lg text-[#6B5A55] cursor-pointer hover:bg-[#F6E8E1]"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 rounded-2xl border border-[#EADCD3] bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold">{c.id}</span>
                <span className={c.estado === 'nueva' && Date.now() - new Date(c.created_at).getTime() > 86400000 ? 'rounded-md bg-rose-500/15 px-1.5 text-xs font-bold text-rose-700' : 'text-xs text-[#8A7A76]'}>{hace(c.created_at)}{c.estado === 'nueva' && Date.now() - new Date(c.created_at).getTime() > 86400000 ? ' · sin atender' : ''}</span>
                {c.ref && <span className="rounded bg-[#F6E8E1] px-1.5 py-0.5 font-mono text-[11px] text-[#8E4F3E]">{c.ref}</span>}
                {(c.pedido_id || pedidosPorConsulta[c.id]) && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">{pedidosPorConsulta[c.id] && !c.pedido_id ? 'Pedido confirmado' : 'Tarjeta'} {c.pedido_id || pedidosPorConsulta[c.id].id}</span>}
                <select
                  value={c.estado}
                  onChange={(e) => mover(c, e.target.value)}
                  className="ml-auto rounded-xl border border-[#EADCD3] px-2 py-1 text-xs font-semibold"
                  aria-label="Estado"
                >
                  {ESTADOS.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
                </select>
              </div>

              {c.estado === 'descartada' && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700">Descartada{c.motivo_descarte ? `: ${c.motivo_descarte}` : ''}</p>}
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
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">WhatsApp (9 dígitos) *<input value={borrador.telefono} onChange={(e) => setBorrador((b) => ({ ...b, telefono: e.target.value }))} onBlur={() => setBorrador((b) => ({ ...b, telefono: /^9\d{8}$/.test(normalizarTel(b.telefono)) ? normalizarTel(b.telefono) : b.telefono }))} inputMode="tel" className="mt-1 w-full rounded-xl border border-[#EADCD3] bg-white px-2.5 py-2 text-sm font-semibold normal-case" /></label>
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

              {/* Enviar la cotización a la clienta */}
              <div className="space-y-2 rounded-xl bg-[#FBF4F0] p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8E4F3E]">Enviar a la clienta</p>
                <div className="flex flex-wrap gap-2">
                  {venta > 0 ? (
                    <>
                      <button type="button" onClick={() => copiar(mensajeCotizacion({ ...c, precio_final: venta }), 'Cotización copiada')} className="rounded-xl border border-[#EADCD3] bg-white px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#F6E8E1]">Copiar texto</button>
                      {tel && (
                        <a href={`https://wa.me/51${tel}?text=${encodeURIComponent(mensajeCotizacion({ ...c, precio_final: venta }))}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white">Enviar por WhatsApp</a>
                      )}
                      <button type="button" onClick={() => compartirImagen(c, venta)} className="rounded-xl border border-[#EADCD3] bg-white px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#F6E8E1]">Compartir como imagen</button>
                    </>
                  ) : <p className="text-xs text-[#8A7A76]">Indica el precio de venta para poder enviarla.</p>}
                  <button type="button" onClick={() => copiar(enlaceDespacho(c), 'Enlace copiado')} className="rounded-xl border border-[#EADCD3] bg-white px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#F6E8E1]" title="La clienta abre el enlace y llena ella misma sus datos de envío">Enlace para que ella complete sus datos</button>
                </div>
                {c.estado !== 'descartada' && !c.pedido_id && !pedidosPorConsulta[c.id] && (
                  <p className="text-[11px] leading-snug text-[#6B5A55]">
                    <b>Dos formas de cerrar el pedido:</b> (1) la clienta te da sus datos por chat y tú pulsas <b>Confirmar pedido</b>; (2) le envías el enlace y ella llena sus datos: el pedido aparece solo en Pedidos y esta cotización pasa a <b>Pedido confirmado</b>.
                  </p>
                )}
                {c.gestionado_por && c.gestionado_en && <p className="text-[11px] text-[#8A7A76]">Última gestión: {c.gestionado_por} · {hace(c.gestionado_en)}</p>}
                {tel && (
                  <div className="flex flex-wrap items-center gap-1.5" aria-label="Respuestas rápidas">
                    <span className="text-[10px] font-black uppercase tracking-wide text-[#8A7A76]">Respuestas rápidas</span>
                    {RESPUESTAS.map((rp) => (
                      <a key={rp.etiqueta} href={`https://wa.me/51${tel}?text=${encodeURIComponent(rp.texto(c))}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-[#D4EADE]">{rp.etiqueta}</a>
                    ))}
                  </div>
                )}
              </div>

              {/* Pie fijo: siempre visible, con el error y las dos acciones principales */}
              <div className="sticky bottom-0 -mx-4 -mb-4 space-y-2 rounded-b-2xl border-t border-[#EADCD3] bg-white/95 px-4 py-3 backdrop-blur">
                {error && <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => guardarCotizacion(c)} className="rounded-xl border border-[#2B1D1A] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[#F6E8E1]">Guardar precio y notas</button>
                  <span className="hidden text-[11px] text-[#8A7A76] sm:inline">Cuando la clienta acepte →</span>
                  {!c.pedido_id && !pedidosPorConsulta[c.id] && c.estado !== 'descartada' && (
                    <button type="button" onClick={() => confirmarDesdeDetalle(c)} className="ml-auto rounded-xl bg-[#A8634F] px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#8E4F3E]">Confirmar pedido</button>
                  )}
                  {(c.pedido_id || pedidosPorConsulta[c.id]) && onVerPedido && (
                    <button type="button" onClick={() => onVerPedido((c.pedido_id || pedidosPorConsulta[c.id]?.id) as string)} className="ml-auto rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-emerald-700">Ver pedido {c.pedido_id || pedidosPorConsulta[c.id]?.id}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ));
      })()}

      {/* Descartar: motivo obligatorio */}
      {descartando && modal(() => setDescartando(null), 'sm:max-w-md', (
        <div className="space-y-3 p-4">
          <h2 className="text-base font-extrabold">Descartar {descartando.id}</h2>
          <p className="text-xs text-[#6B5A55]">Quedará en el archivo (se puede restaurar). El motivo ayuda a entender por qué no se concretan las ventas.</p>
          <div className="grid gap-1.5" role="radiogroup" aria-label="Motivo">
            {MOTIVOS_DESCARTE.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={motivoSel === m} onClick={() => setMotivoSel(m)} className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold cursor-pointer ${motivoSel === m ? 'border-[#A8634F] bg-[#F6E8E1]' : 'border-[#EADCD3] bg-white hover:bg-[#FBF4F0]'}`}>{m}</button>
            ))}
          </div>
          {motivoSel === 'Otro' && <input autoFocus value={motivoOtro} onChange={(e) => setMotivoOtro(e.target.value)} placeholder="Escribe el motivo" className="w-full rounded-xl border border-[#EADCD3] bg-white px-3 py-2 text-sm" />}
          {error && <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDescartando(null)} className="rounded-xl border border-[#EADCD3] bg-white px-3.5 py-2 text-xs font-bold cursor-pointer">Cancelar</button>
            <button type="button" onClick={descartar} className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-rose-700">Descartar cotización</button>
          </div>
        </div>
      ), 'z-[55]')}

      {/* Confirmar pedido: crea la tarjeta enlazada */}
      {confirmando && modal(() => setConfirmando(null), 'sm:max-w-lg', (
        <div className="space-y-3 p-4">
          <h2 className="text-base font-extrabold">Confirmar pedido de {confirmando.id}</h2>
          <p className="text-xs text-[#6B5A55]">{confirmando.nombre} · total productos {dinero(confirmando.precio_final ?? 0)}. Se creará la tarjeta en el tablero de Pedidos; el flete y los datos de envío se completan allí cuando la clienta los indique.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">Medio de envío
              <select value={envio.medio} onChange={(e) => setEnvio((p) => ({ ...p, medio: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#EADCD3] bg-white px-2 py-2 text-sm font-semibold normal-case">
                {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
              </select>
            </label>
            <label className="text-[10px] font-black uppercase tracking-wide text-[#6B5A55]">Fecha de despacho
              <input type="date" value={envio.fecha} onChange={(e) => setEnvio((p) => ({ ...p, fecha: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#EADCD3] bg-white px-2 py-2 text-sm font-semibold normal-case" />
            </label>
          </div>
          <p className="text-[11px] text-[#8A7A76]">Si la clienta prefiere llenar sus datos ella misma, envíale el enlace de confirmación desde el detalle (no hace falta confirmar aquí).</p>
          {error && <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmando(null)} className="rounded-xl border border-[#EADCD3] bg-white px-3.5 py-2 text-xs font-bold cursor-pointer">Cancelar</button>
            <button type="button" onClick={() => crearPedido(confirmando)} className="rounded-xl bg-[#A8634F] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#8E4F3E]">Crear pedido</button>
          </div>
        </div>
      ), 'z-[55]')}

      {/* Archivo: descartadas y confirmadas antiguas (fuera del flujo para no llenar la pantalla) */}
      {archivo && modal(() => setArchivo(null), 'sm:max-w-2xl', (
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-base font-extrabold">Archivo de cotizaciones</h2>
            <button type="button" onClick={() => setArchivo(null)} data-tip="Cerrar" aria-label="Cerrar" className="tip-der flex h-8 w-8 items-center justify-center rounded-lg text-[#6B5A55] cursor-pointer hover:bg-[#F6E8E1]"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex gap-1.5" role="tablist">
            {([['descartada', 'Descartadas', descartadas.length], ['cerrada', 'Pedido confirmado', confirmadasTodas.length]] as const).map(([k, tx, n]) => (
              <button key={k} type="button" role="tab" aria-selected={archivo === k} onClick={() => setArchivo(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer ${archivo === k ? 'bg-[#A8634F] text-white' : 'bg-[#F6E8E1] text-[#8E4F3E]'}`}>{tx} {n}</button>
            ))}
          </div>
          <ul className="space-y-2">
            {(archivo === 'descartada' ? descartadas : confirmadasTodas).filter((c) => !termino || coincide(c)).map((c) => {
              const pedido = c.pedido_id || pedidosPorConsulta[c.id]?.id;
              return (
                <li key={c.id} className="flex items-center gap-2 rounded-xl border border-[#EADCD3] bg-white p-2.5">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { setArchivo(null); setDetalleId(c.id); }}>
                    <p className="truncate text-sm font-bold"><span className="font-mono">{c.id}</span> · {c.nombre || 'Sin nombre'}</p>
                    <p className="truncate text-xs text-[#6B5A55]">{hace(c.created_at)}{c.estado === 'descartada' && c.motivo_descarte ? ` · ${c.motivo_descarte}` : ''}{pedido ? ` · pedido ${pedido}` : ''}</p>
                  </div>
                  {c.estado === 'descartada' ? (
                    <button type="button" onClick={() => mover(c, 'nueva')} data-tip="Restaurar a Por revisar" aria-label="Restaurar" className="tip-der flex h-8 w-8 items-center justify-center rounded-lg text-[#A8634F] cursor-pointer hover:bg-[#F6E8E1]"><Undo2 className="h-4 w-4" /></button>
                  ) : pedido && onVerPedido ? (
                    <button type="button" onClick={() => { setArchivo(null); onVerPedido(pedido); }} data-tip={`Ver pedido ${pedido}`} aria-label="Ver pedido" className="tip-der flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 cursor-pointer hover:bg-emerald-500/10"><PackageCheck className="h-4 w-4" /></button>
                  ) : null}
                </li>
              );
            })}
            {(archivo === 'descartada' ? descartadas : confirmadasTodas).length === 0 && <li className="py-6 text-center text-sm text-[#8A7A76]">Nada por aquí todavía.</li>}
          </ul>
        </div>
      ))}
    </div>
  );
};
