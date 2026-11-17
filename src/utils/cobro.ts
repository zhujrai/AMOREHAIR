import type { Order } from '../types';

/** Montos de un pedido: precio de venta (productos) y flete van separados; el cliente ve el total. */
export interface Cobro {
  venta: number | null;
  flete: number;
  total: number | null;
  pagado: number;
  saldo: number | null;
}

export function calcularCobro(o: Order): Cobro {
  const venta = typeof o.subtotalAmount === 'number' && o.subtotalAmount > 0 ? o.subtotalAmount : null;
  const flete = typeof o.deliveryFee === 'number' && o.deliveryFee > 0 ? o.deliveryFee : 0;
  const pagado = typeof o.amountPaid === 'number' && o.amountPaid > 0 ? o.amountPaid : 0;
  const total = venta !== null ? venta + flete : null;
  const saldo = total !== null ? Math.max(0, Math.round((total - pagado) * 100) / 100) : null;
  return { venta, flete, total, pagado, saldo };
}

/** Un pedido sin precio de venta no puede avanzar de la columna "Nuevos". */
export const faltaPrecio = (o: Order): boolean => calcularCobro(o).venta === null;

export const dinero = (n: number): string => `S/ ${n.toFixed(2)}`;

/** Qué falta para poder despachar: el aviso se muestra en la tarjeta (no bloquea el avance). */
export function faltaDatosEnvio(o: Order): string | null {
  if ((o.shippingType === 'shalom' || o.shippingType === 'marvisur') && !o.agency) return 'Falta agencia';
  if (o.shippingType === 'olva' && !o.agency && !(o.deliveryAddress || '').trim()) return 'Falta agencia o dirección';
  if (o.shippingType === 'delivery_lima' && !(o.deliveryAddress || '').trim()) return 'Falta dirección';
  if (!(o.documentNumber || '').trim()) return 'Falta documento';
  return null;
}


export type CampoBloqueo = 'subtotalAmount' | 'amountPaid';
export interface Bloqueo { campo: CampoBloqueo; mensaje: string }

/**
 * Reglas de avance del tablero:
 *  1) sin precio de venta no sale de "Nuevos";
 *  2) sin un abono registrado (aunque sea parcial) no pasa a "Empacados" ni más allá.
 * Devuelve null si puede avanzar.
 */
export function motivoBloqueo(o: Order, destino: string): Bloqueo | null {
  if (destino === 'nuevos') return null;
  if (faltaPrecio(o)) return { campo: 'subtotalAmount', mensaje: 'Antes de pasarla al tablero indica el precio de venta y guárdalo.' };
  if (!(calcularCobro(o).pagado > 0)) return { campo: 'amountPaid', mensaje: 'Para empacar registra el abono recibido (aunque sea parcial) en "Pagado" y guárdalo.' };
  return null;
}
