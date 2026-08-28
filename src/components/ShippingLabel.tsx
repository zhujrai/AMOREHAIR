import React from 'react';
import { Order, StoreSettings } from '../types';

export type LabelPaperSize = 'thermal' | 'half_a4' | 'full_a4';

interface ShippingLabelProps {
  order: Order;
  storeSettings: StoreSettings;
  paperSize?: LabelPaperSize;
  className?: string;
  isTwoPerPageItem?: boolean;
}

export const ShippingLabel: React.FC<ShippingLabelProps> = ({
  order,
  storeSettings,
  paperSize = 'thermal',
  className = '',
  isTwoPerPageItem = false,
}) => {
  const isShalom = order.shippingType === 'shalom';
  const isMarvisur = order.shippingType === 'marvisur';
  const isOlva = order.shippingType === 'olva';
  const isDelivery = order.shippingType === 'delivery_lima';
  const isTienda = order.shippingType === 'tienda';

  let courierHeaderName = 'ENVÍO ESTÁNDAR';
  if (isShalom) courierHeaderName = 'AGENCIA SHALOM';
  else if (isMarvisur) courierHeaderName = 'EXPRESO MARVISUR';
  else if (isOlva) courierHeaderName = 'OLVA COURIER';
  else if (isDelivery) courierHeaderName = 'DELIVERY MOTORIZADO LIMA';
  else if (isTienda) courierHeaderName = 'RETIRO EN SALÓN / TIENDA';

  const hasNotes = Boolean(order.notes && order.notes.trim().length > 0);

  // Logo selection - prioritize clean horizontal / official logo
  const logoSrc = storeSettings.logoHorizontalUrl || storeSettings.logoUrl || 'https://res.cloudinary.com/nqvtgmba/image/upload/v1787286775/AmoreWhitebg.png';

  // Size styling configuration
  const config = {
    thermal: {
      container: 'w-full max-w-[420px] print:w-[98mm] print:max-h-[142mm] p-3 text-xs',
      logoHeight: 'h-14 max-w-[180px]',
      orderBadge: 'text-base font-black px-2.5 py-0.5',
      senderText: 'text-[11px]',
      recipientTitle: 'text-xs',
      recipientName: 'text-xl sm:text-2xl font-black leading-tight',
      documentSize: 'text-base sm:text-lg font-black',
      phoneSize: 'text-base sm:text-lg font-black',
      whatsappIcon: 'w-5 h-5',
      agencyHeader: 'text-sm font-black',
      agencyText: 'text-xs font-bold',
      footerPadding: 'py-1 text-[10px]',
    },
    half_a4: {
      container: isTwoPerPageItem
        ? 'w-full max-w-[580px] print:w-full print:max-h-[135mm] p-4 text-xs'
        : 'w-full max-w-[580px] print:w-[140mm] print:max-h-[195mm] p-5 text-sm',
      logoHeight: 'h-16 max-w-[220px]',
      orderBadge: 'text-xl font-black px-3 py-1',
      senderText: 'text-xs',
      recipientTitle: 'text-sm font-black',
      recipientName: 'text-2xl sm:text-3xl font-black leading-tight',
      documentSize: 'text-xl sm:text-2xl font-black',
      phoneSize: 'text-xl sm:text-2xl font-black',
      whatsappIcon: 'w-6 h-6',
      agencyHeader: 'text-base font-black',
      agencyText: 'text-sm font-bold',
      footerPadding: 'py-1.5 text-xs',
    },
    full_a4: {
      container: 'w-full max-w-[780px] print:w-[195mm] print:max-h-[265mm] p-7 text-base space-y-4',
      logoHeight: 'h-24 max-w-[300px]',
      orderBadge: 'text-3xl font-black px-4 py-1.5',
      senderText: 'text-sm',
      recipientTitle: 'text-base font-black',
      recipientName: 'text-3xl sm:text-4xl font-black leading-tight',
      documentSize: 'text-2xl sm:text-3xl font-black',
      phoneSize: 'text-2xl sm:text-3xl font-black',
      whatsappIcon: 'w-8 h-8',
      agencyHeader: 'text-xl font-black',
      agencyText: 'text-base sm:text-lg font-bold',
      footerPadding: 'py-2 text-sm',
    },
  }[paperSize];

  // Payment display for Delivery Lima Contraentrega
  const getPaymentMethodDisplay = () => {
    if (!order.isCashOnDelivery) return null;
    const amount = order.cashOnDeliveryAmount ?? order.subtotalAmount ?? 0;
    if (amount <= 0 && !order.paymentMethod) return null;

    const method = order.paymentMethod || 'motorizado';
    if (method === 'motorizado') {
      return {
        emoji: '🛵',
        title: 'COBRO CONTRAENTREGA',
        amount: amount > 0 ? `S/ ${amount.toFixed(2)}` : 'COBRO EN EFECTIVO',
      };
    }
    if (method === 'yape') {
      return {
        emoji: '🟣',
        title: 'PAGO POR YAPE (940339934)',
        amount: amount > 0 ? `S/ ${amount.toFixed(2)}` : 'PAGO POR YAPE',
      };
    }
    return {
      emoji: '🏦',
      title: 'PAGO POR TRANSFERENCIA',
      amount: amount > 0 ? `S/ ${amount.toFixed(2)}` : 'TRANSFERENCIA',
    };
  };

  const paymentDisplay = getPaymentMethodDisplay();

  return (
    <div
      className={`relative bg-white text-black border-2 border-black rounded-none shadow-none font-sans leading-tight print:border-2 print:border-black print:shadow-none overflow-hidden select-none mx-auto ${config.container} ${className}`}
      style={{
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* MARCA DE AGUA NÍTIDA (Logo centrado con opacidad muy sutil) */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden opacity-[0.04] print:opacity-[0.05]"
        aria-hidden="true"
      >
        <img
          src={logoSrc}
          alt=""
          className="w-4/5 max-w-[360px] object-contain grayscale"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative z-10 space-y-2.5">
        
        {/* 1. CABECERA: LOGO DESTACADO (GRANDE Y SIN BORDES EXTRA) + GUÍA / PEDIDO */}
        <div className="border-b-2 border-black pb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {logoSrc && (
              <img
                src={logoSrc}
                alt={storeSettings.storeName}
                className={`${config.logoHeight} w-auto object-contain flex-shrink-0`}
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-black">
                SERVICIO:
              </span>
              <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-black border-b border-black">
                {courierHeaderName}
              </span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-black block text-black uppercase">
              RÓTULO / GUÍA:
            </span>
            <span className={`${config.orderBadge} font-mono tracking-tight text-black border-2 border-black inline-block`}>
              #{order.id}
            </span>
          </div>
        </div>

        {/* 2. REMITENTE (DE) */}
        <div className="border border-black p-2 bg-white">
          <div className="flex justify-between items-center text-[10px] pb-1 border-b border-black font-black uppercase">
            <span>DE (REMITENTE):</span>
            <span className="font-mono text-[11px] font-black">CEL: 940339934</span>
          </div>
          
          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              <p className={`font-black uppercase ${config.senderText} text-black`}>
                {storeSettings.storeName || 'AMORE SALON HAIR STYLE'}
              </p>
              <p className="text-[11px] text-black font-bold">
                WhatsApp: +51 940339934
              </p>
            </div>
            <span className="text-[10px] font-black uppercase text-black border border-black px-1.5 py-0.5">
              LIMA - PERÚ
            </span>
          </div>
        </div>

        {/* 3. DESTINATARIO (PARA) - MÁXIMO PROTAGONISMO DNI, NOMBRE Y TELÉFONO */}
        <div className="border-2 border-black p-3 sm:p-3.5 bg-white space-y-2">
          
          {/* Fila Encabezado Destinatario con DNI en grande */}
          <div className="flex justify-between items-center border-b-2 border-black pb-1.5">
            <span className={`font-black uppercase tracking-wider text-black ${config.recipientTitle}`}>
              PARA (DESTINATARIO):
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-black">{order.documentType}:</span>
              <span className={`font-mono text-black ${config.documentSize}`}>
                {order.documentNumber}
              </span>
            </div>
          </div>

          {/* NOMBRE DEL DESTINATARIO (GRANDE Y LEGIBLE) */}
          <div className="pt-0.5">
            <h3 className={`uppercase tracking-tight text-black ${config.recipientName}`}>
              {order.customerName}
            </h3>
          </div>

          {/* CELULAR DEL CLIENTE CON ÍCONO WSP EN BLANCO Y NEGRO (SIN BORDE DE TEXTO) */}
          <div className="flex items-center gap-2 pt-0.5">
            <img
              src="https://res.cloudinary.com/nqvtgmba/image/upload/v1787125248/whatsapp.png"
              alt="WhatsApp"
              className={`${config.whatsappIcon} object-contain grayscale flex-shrink-0`}
              referrerPolicy="no-referrer"
            />
            <span className={`font-mono text-black tracking-wide ${config.phoneSize}`}>
              +51 {order.customerPhone}
            </span>
          </div>

          {/* DESTINO / AGENCIA / DIRECCIÓN */}
          <div className="pt-2 border-t border-black space-y-1">
            {isShalom && (
              <div>
                <div className={config.agencyHeader}>
                  <span className="uppercase underline mr-1.5">AGENCIA SHALOM:</span>
                  <span className="uppercase">{order.agency?.name}</span>
                </div>
                <p className={`${config.agencyText} text-black mt-0.5`}>
                  <strong>Dirección:</strong> {order.agency?.address}
                </p>
                {order.agency?.reference && (
                  <p className="text-xs text-black font-semibold mt-0.5">
                    <strong>Ref:</strong> {order.agency.reference}
                  </p>
                )}
              </div>
            )}

            {isMarvisur && (
              <div>
                <div className={config.agencyHeader}>
                  <span className="uppercase underline mr-1.5">AGENCIA MARVISUR:</span>
                  <span className="uppercase">{order.agency?.name}</span>
                </div>
                <p className={`${config.agencyText} text-black mt-0.5`}>
                  <strong>Dirección:</strong> {order.agency?.address}
                </p>
                {order.agency?.reference && (
                  <p className="text-xs text-black font-semibold mt-0.5">
                    <strong>Ref:</strong> {order.agency.reference}
                  </p>
                )}
              </div>
            )}

            {isOlva && (
              <div>
                <div className={config.agencyHeader}>
                  <span className="uppercase underline mr-1.5">DESTINO OLVA:</span>
                  <span className="uppercase">
                    {order.agency ? order.agency.name : `Envío a Domicilio - ${order.deliveryDistrict}`}
                  </span>
                </div>
                <p className={`${config.agencyText} text-black mt-0.5`}>
                  <strong>Dirección:</strong> {order.agency ? order.agency.address : order.deliveryAddress}
                </p>
                {order.deliveryReference && (
                  <p className="text-xs text-black font-semibold mt-0.5">
                    <strong>Ref:</strong> {order.deliveryReference}
                  </p>
                )}
              </div>
            )}

            {isDelivery && (
              <div>
                <div className={config.agencyHeader}>
                  <span className="uppercase underline mr-1.5">DISTRITO LIMA:</span>
                  <span className="uppercase border-b-2 border-black">
                    {order.deliveryDistrict}
                  </span>
                </div>
                <p className={`${config.agencyText} text-black mt-1`}>
                  <strong>Dirección:</strong> {order.deliveryAddress}
                </p>
                {order.deliveryReference && (
                  <p className="text-xs text-black font-semibold mt-0.5">
                    <strong>Ref:</strong> {order.deliveryReference}
                  </p>
                )}

                {/* Recuadro de Cobro Contraentrega */}
                {paymentDisplay && (
                  <div className="mt-2 p-1.5 border-2 border-black text-center font-black bg-white">
                    <div className="text-xs sm:text-sm uppercase tracking-tight flex items-center justify-center gap-1.5">
                      <span>{paymentDisplay.emoji}</span>
                      <span>{paymentDisplay.title}: {paymentDisplay.amount}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isTienda && (
              <div>
                <div className={config.agencyHeader}>
                  <span className="uppercase underline mr-1.5">PUNTO DE RECOJO:</span>
                  <span className="uppercase">RETIRO EN SALÓN COMERCIAL</span>
                </div>
                <p className={`${config.agencyText} text-black mt-0.5`}>
                  Presentar DNI original en físico para retirar el pedido
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. OBSERVACIONES (SI EXISTEN) */}
        {hasNotes && (
          <div className="border border-black p-2 bg-white text-xs">
            <p className="text-xs text-black font-bold">
              <strong>OBSERVACIONES:</strong> {order.notes}
            </p>
          </div>
        )}

        {/* 5. PIE DE RÓTULO: INDICADOR DE MANEJO */}
        <div className="pt-0.5 flex items-center justify-center font-black uppercase text-center">
          <div className={`border border-black px-3 ${config.footerPadding} w-full text-center tracking-wider`}>
            ⚠️ MANIPULAR CON CUIDADO / FRÁGIL
          </div>
        </div>

      </div>
    </div>
  );
};
