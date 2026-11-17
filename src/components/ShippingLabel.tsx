import React from 'react';
import { Order, StoreSettings } from '../types';

export type LabelPaperSize = 'thermal' | 'half_a4' | 'full_a4';
export type LabelOrientation = 'horizontal' | 'vertical';

interface ShippingLabelProps {
  order: Order;
  storeSettings: StoreSettings;
  paperSize?: LabelPaperSize;
  orientation?: LabelOrientation;
  className?: string;
  /** (compatibilidad) rótulo mediano que comparte hoja con otro */
  isTwoPerPageItem?: boolean;
}

/** Medidas reales de impresión (mm) por tamaño de papel y orientación. */
export const MEDIDAS_ROTULO: Record<LabelPaperSize, Record<LabelOrientation, { w: number; h: number }>> = {
  thermal: { horizontal: { w: 148, h: 98 }, vertical: { w: 98, h: 148 } },
  half_a4: { horizontal: { w: 196, h: 140 }, vertical: { w: 140, h: 196 } },
  full_a4: { horizontal: { w: 280, h: 194 }, vertical: { w: 194, h: 280 } },
};

/** Tamaño de página para @page al imprimir (el rótulo mediano horizontal va 2 por hoja A4 vertical). */
export function paginaDeImpresion(paper: LabelPaperSize, o: LabelOrientation): string {
  if (paper === 'thermal') {
    const m = MEDIDAS_ROTULO.thermal[o];
    return `${m.w + 2}mm ${m.h + 2}mm`;
  }
  if (paper === 'half_a4') return 'A4 portrait';
  return o === 'horizontal' ? 'A4 landscape' : 'A4 portrait';
}

/**
 * Rótulo de envío simplificado: un solo marco fino, sin cajas internas; la jerarquía sale del tamaño de letra.
 * Todo se mide en `cqw` (porcentaje del ancho del rótulo), así el mismo diseño sirve para cualquier tamaño de papel.
 */
export const ShippingLabel: React.FC<ShippingLabelProps> = ({
  order,
  storeSettings,
  paperSize = 'thermal',
  orientation = 'horizontal',
  className = '',
}) => {
  const isShalom = order.shippingType === 'shalom';
  const isMarvisur = order.shippingType === 'marvisur';
  const isOlva = order.shippingType === 'olva';
  const isDelivery = order.shippingType === 'delivery_lima';
  const isTienda = order.shippingType === 'tienda';
  const horizontal = orientation === 'horizontal';

  let servicio = 'ENVÍO';
  if (isShalom) servicio = 'SHALOM';
  else if (isMarvisur) servicio = 'MARVISUR';
  else if (isOlva) servicio = 'OLVA COURIER';
  else if (isDelivery) servicio = 'DELIVERY LIMA';
  else if (isTienda) servicio = 'RETIRO EN LOCAL AMORE';

  const logoSrc = storeSettings.logoHorizontalUrl || storeSettings.logoUrl || 'https://res.cloudinary.com/nqvtgmba/image/upload/v1787286775/AmoreWhitebg.png';
  const medidas = MEDIDAS_ROTULO[paperSize][orientation];
  const tel = (order.customerPhone || '').replace(/\D/g, '').slice(-9);

  // Destino según el medio de envío
  let destinoTitulo = '';
  let destinoNombre = '';
  let destinoDireccion = '';
  let destinoRef = '';
  if (isShalom || isMarvisur) {
    destinoTitulo = isShalom ? 'Agencia Shalom' : 'Agencia Marvisur';
    destinoNombre = order.agency?.name || '';
    destinoDireccion = order.agency?.address || '';
    destinoRef = order.agency?.reference || '';
  } else if (isOlva) {
    destinoTitulo = 'Destino Olva';
    destinoNombre = order.agency ? order.agency.name : `Domicilio · ${order.deliveryDistrict || ''}`;
    destinoDireccion = order.agency ? order.agency.address || '' : order.deliveryAddress || '';
    destinoRef = order.deliveryReference || '';
  } else if (isDelivery) {
    destinoTitulo = 'Distrito';
    destinoNombre = order.deliveryDistrict || '';
    destinoDireccion = order.deliveryAddress || '';
    destinoRef = order.deliveryReference || '';
  } else if (isTienda) {
    destinoTitulo = 'Punto de recojo';
    destinoNombre = 'Local Amore';
    destinoDireccion = 'Presentar DNI original para retirar';
  }

  // Cobro al entregar (contraentrega o "paga al recoger")
  let cobro: { titulo: string; monto: string } | null = null;
  if (order.isCashOnDelivery && (isDelivery || isTienda)) {
    const monto = order.cashOnDeliveryAmount ?? order.subtotalAmount ?? 0;
    const metodo = order.paymentMethod || 'motorizado';
    const titulo = isTienda
      ? 'PAGA AL RECOGER'
      : metodo === 'yape' ? 'PAGO POR YAPE' : metodo === 'transferencia' ? 'PAGO POR TRANSFERENCIA' : 'COBRAR AL ENTREGAR';
    cobro = { titulo, monto: monto > 0 ? `S/ ${monto.toFixed(2)}` : 'EFECTIVO' };
  }

  const u = (n: number) => `calc(var(--u) * ${n})`;
  const notas = order.notes && order.notes.trim() ? order.notes.trim() : '';

  const bloquePara = (
    <div className="min-w-0">
      <p className="font-bold uppercase text-black/60" style={{ fontSize: u(1.9), letterSpacing: '0.16em' }}>Para</p>
      <h3 className="font-black uppercase leading-[1.05] text-black break-words" style={{ fontSize: u(5.4), marginTop: u(0.6), display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {order.customerName}
      </h3>
      <p className="font-mono font-black text-black" style={{ fontSize: u(3.8), marginTop: u(1.4) }}>
        {order.documentType} {order.documentNumber}
      </p>
      <p className="font-mono font-black text-black" style={{ fontSize: u(3.8), marginTop: u(0.4) }}>
        +51 {tel}
      </p>
    </div>
  );

  const bloqueDestino = (
    <div className="min-w-0" style={{ marginTop: u(2.6) }}>
      <p className="font-bold uppercase text-black/60" style={{ fontSize: u(1.9), letterSpacing: '0.16em' }}>{destinoTitulo}</p>
      <p className="font-black uppercase leading-tight text-black break-words" style={{ fontSize: u(3.5), marginTop: u(0.4) }}>{destinoNombre}</p>
      {destinoDireccion && <p className="font-semibold leading-snug text-black break-words" style={{ fontSize: u(2.7), marginTop: u(0.5) }}>{destinoDireccion}</p>}
      {destinoRef && <p className="font-medium leading-snug text-black/80 break-words" style={{ fontSize: u(2.4), marginTop: u(0.3) }}>Ref: {destinoRef}</p>}
      {notas && <p className="font-semibold leading-snug text-black break-words" style={{ fontSize: u(2.4), marginTop: u(1.2) }}>Obs: {notas}</p>}
    </div>
  );

  const bloqueLateral = (
    <div className={`flex min-w-0 flex-col ${horizontal ? 'items-end text-right justify-between' : 'items-start text-left'}`} style={{ gap: u(2) }}>
      <img src={logoSrc} alt={storeSettings.storeName} className="w-auto object-contain" style={{ height: u(horizontal ? 12 : 10), maxWidth: '100%' }} referrerPolicy="no-referrer" />
      <div>
        <p className="font-mono font-black leading-none text-black" style={{ fontSize: u(horizontal ? 7.2 : 8) }}>#{order.id}</p>
        <p className="font-bold uppercase text-black/70" style={{ fontSize: u(2.2), letterSpacing: '0.1em', marginTop: u(0.8) }}>{servicio}</p>
      </div>
      {cobro && (
        <div className="w-full bg-black text-white" style={{ padding: `${u(1.4)} ${u(2)}`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <p className="font-bold uppercase" style={{ fontSize: u(1.9), letterSpacing: '0.12em' }}>{cobro.titulo}</p>
          <p className="font-black leading-none" style={{ fontSize: u(6.2), marginTop: u(0.6) }}>{cobro.monto}</p>
        </div>
      )}
      <div className="text-black/70" style={{ fontSize: u(1.9) }}>
        <p className="font-bold uppercase">De: {storeSettings.storeName || 'Amore Salon Hair Style'}</p>
        <p className="font-medium">WhatsApp 940339934 · Lima, Perú</p>
        <p className="font-black uppercase" style={{ marginTop: u(0.6), letterSpacing: '0.1em' }}>Frágil · manipular con cuidado</p>
      </div>
    </div>
  );

  return (
    <div
      className={`rotulo-impreso relative mx-auto bg-white font-sans text-black select-none ${className}`}
      style={{
        // En pantalla: ancho cómodo; al imprimir: medida real en mm
        width: '100%',
        maxWidth: horizontal ? 640 : 420,
        aspectRatio: `${medidas.w} / ${medidas.h}`,
        containerType: 'inline-size',
        boxSizing: 'border-box',
        border: '1px solid #000',
        overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        ['--u' as string]: horizontal ? '1cqw' : '1.15cqw',
        ['--mm-w' as string]: `${medidas.w}mm`,
        ['--mm-h' as string]: `${medidas.h}mm`,
      }}
    >
      <div
        className="h-full w-full"
        style={{
          padding: u(3.2),
          display: 'grid',
          gridTemplateColumns: horizontal ? '1.6fr 1fr' : '1fr',
          gap: u(3),
          alignContent: horizontal ? 'stretch' : 'start',
        }}
      >
        <div className="min-w-0 min-h-0">
          {bloquePara}
          {bloqueDestino}
        </div>
        {bloqueLateral}
      </div>
    </div>
  );
};
