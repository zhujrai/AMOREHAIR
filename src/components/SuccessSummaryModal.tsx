import React, { useState } from 'react';
import { 
  Check, 
  Package, 
  Copy, 
  PlusCircle, 
  X
} from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { 
  getWhatsAppShareUrl, 
  buildWhatsAppMessage,
  formatShortPeruvianDate,
  WHATSAPP_ICON_URL
} from '../utils/formatters';

interface SuccessSummaryModalProps {
  order: Order | null;
  storeSettings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onNewOrder: () => void;
  isDark: boolean;
}

export const SuccessSummaryModal: React.FC<SuccessSummaryModalProps> = ({
  order,
  storeSettings,
  isOpen,
  onClose,
  onNewOrder,
  isDark,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const whatsappUrl = getWhatsAppShareUrl(order, storeSettings);
  const rawMessage = buildWhatsAppMessage(order, storeSettings);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // Determine header type & courier
  let shippingHeader = 'AGENCIA';
  let courierName = 'Shalom';
  let agencyText = '';
  let addressText = '';

  if (order.shippingType === 'shalom') {
    shippingHeader = 'AGENCIA';
    courierName = 'Shalom';
    const dep = order.agency?.department || 'Lima';
    const prov = order.agency?.province || 'Lima';
    const dist = order.agency?.district || 'Lima';
    const name = order.agency?.name?.split('/').pop()?.trim() || order.agency?.name || 'Agencia';
    agencyText = `Agencia: ${dep} / ${prov} / ${dist} / ${name}`;
    addressText = order.agency?.address || 'Av. Principal';
  } else if (order.shippingType === 'olva') {
    if (order.agency) {
      shippingHeader = 'AGENCIA';
      courierName = 'Olva Courier';
      const dep = order.agency?.department || 'Lima';
      const prov = order.agency?.province || 'Lima';
      const dist = order.agency?.district || 'Lima';
      const name = order.agency?.name || 'Agencia';
      agencyText = `Agencia: ${dep} / ${prov} / ${dist} / ${name}`;
      addressText = order.agency?.address || 'Av. Principal';
    } else {
      shippingHeader = 'DOMICILIO';
      courierName = 'Olva Courier';
      agencyText = `Destino: ${order.deliveryDistrict || 'Lima'}`;
      addressText = `${order.deliveryAddress || ''}${order.deliveryReference ? `, Ref. ${order.deliveryReference}` : ''}`;
    }
  } else if (order.shippingType === 'delivery_lima') {
    shippingHeader = 'LIMA DOMICILIO';
    courierName = 'Delivery Motorizado';
    agencyText = `Distrito: ${order.deliveryDistrict || 'Lima Metropolitana'}`;
    addressText = `${order.deliveryAddress || ''}${order.deliveryReference ? `, Ref. ${order.deliveryReference}` : ''}`;
  } else {
    shippingHeader = 'RETIRO EN SALÓN';
    courierName = storeSettings.storeName || 'Amore Salon';
    agencyText = `Local: ${storeSettings.address || 'CyberPlaza - Lima Centro'}`;
    addressText = `Horario: ${storeSettings.openingHours || 'Lun - Sáb: 9am - 8pm'}`;
  }

  const shortDate = formatShortPeruvianDate(order.dispatchDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-md rounded-2xl border p-5 sm:p-7 shadow-2xl transition-all duration-200 max-h-[96vh] overflow-y-auto ${
          isDark 
            ? 'bg-[#1E293B] border-white/10 text-white' 
            : 'bg-white border-[#E2E8F0] text-[#0F172A]'
        }`}
      >
        {/* Top Mini Header with Box Icon */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] dark:bg-white/10 text-[#0F172A] dark:text-zinc-200 flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="font-mono-meta text-[11px] font-black tracking-[0.16em] uppercase text-[#475569] dark:text-zinc-400">
              FORMULARIO DE ENVÍO
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Big Circular Green Check */}
        <div className="text-center pt-5 pb-3">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#22C55E] flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-10 h-10 sm:w-12 sm:h-12 stroke-[3.5]" />
          </div>

          <h2 className="text-2xl sm:text-[28px] font-black tracking-tight text-[#0F172A] dark:text-white mt-4">
            ¡Registro Exitoso!
          </h2>

          <p className="text-xs sm:text-sm text-[#475569] dark:text-zinc-300 font-medium max-w-xs mx-auto leading-relaxed mt-2">
            Tu envío ha sido programado correctamente. Verifica los datos, continuaremos la coordinación por Whatsapp.
          </p>
        </div>

        {/* Resumen Card styled exactly like the screenshot without client-inaccessible items */}
        <div className={`mt-4 p-4 sm:p-5 rounded-2xl border transition-all text-left space-y-3 ${
          isDark 
            ? 'bg-[#0F172A] border-white/10 text-zinc-200' 
            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] shadow-2xs'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-[#EDF2F7] dark:border-zinc-800">
            <span className="text-[11px] uppercase tracking-widest font-black text-[#475569] dark:text-zinc-400">
              RESUMEN
            </span>
            <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              #{order.id}
            </span>
          </div>

          <div className="space-y-2.5 text-xs sm:text-[13px] font-medium leading-relaxed">
            <div className="flex items-center gap-2 font-black text-black dark:text-white">
              <span className="text-base flex-shrink-0">📦</span>
              <span>REGISTRÉ NUEVO ENVÍO ({shippingHeader})</span>
            </div>

            <div className="flex items-center gap-2 text-black dark:text-zinc-100 font-bold">
              <span className="text-base flex-shrink-0">👤</span>
              <span>{order.customerName}</span>
            </div>

            <div className="flex items-center gap-2 text-black dark:text-zinc-100 font-bold font-mono">
              <span className="text-base flex-shrink-0">📱</span>
              <span>{order.customerPhone}</span>
            </div>

            <div className="flex items-center gap-2 text-black dark:text-zinc-100 font-bold">
              <span className="text-base flex-shrink-0">🆔</span>
              <span>{order.documentType || 'DNI'}: <strong className="font-mono">{order.documentNumber}</strong></span>
            </div>

            {agencyText && (
              <div className="flex items-start gap-2 text-black dark:text-zinc-200 font-bold">
                <span className="text-base flex-shrink-0">🖨️</span>
                <span className="leading-snug">{agencyText}</span>
              </div>
            )}

            {addressText && (
              <div className="flex items-start gap-2 text-black dark:text-zinc-200 font-bold">
                <span className="text-base flex-shrink-0">📍</span>
                <span className="leading-snug">{addressText}</span>
              </div>
            )}

            <div className="pt-1 space-y-2 border-t border-dashed border-[#E2E8F0] dark:border-zinc-800">
              <div className="flex items-center gap-2 text-black dark:text-zinc-100 font-bold">
                <span className="text-base flex-shrink-0">🚚</span>
                <span>{courierName}</span>
              </div>

              <div className="flex items-center gap-2 text-black dark:text-zinc-100 font-bold">
                <span className="text-base flex-shrink-0">📅</span>
                <span className="capitalize">{shortDate}</span>
              </div>
            </div>

            {order.isCashOnDelivery && order.shippingType === 'delivery_lima' && (
              <div className="flex items-center gap-2 pt-1 border-t border-[#E2E8F0] dark:border-zinc-800 text-amber-900 dark:text-amber-300 font-bold">
                <span className="text-base flex-shrink-0">💵</span>
                <span>Pago Contraentrega {order.cashOnDeliveryAmount ? `(S/ ${order.cashOnDeliveryAmount.toFixed(2)})` : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Big Green WhatsApp Button - 'Avisar a Amore' */}
        <div className="mt-5 space-y-2.5">
          <button
            id="send-whatsapp-success-btn"
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full py-4 px-6 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-black text-base sm:text-lg shadow-xl shadow-[#10B981]/25 flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <span className="text-white font-black">Avisar a Amore</span>
            <img
              src={WHATSAPP_ICON_URL}
              alt="WhatsApp"
              className="w-6 h-6 object-contain flex-shrink-0 drop-shadow"
              referrerPolicy="no-referrer"
            />
          </button>

          {/* Secondary Action: Copy */}
          <button
            id="copy-summary-btn"
            type="button"
            onClick={handleCopy}
            className={`w-full py-3 px-4 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                : isDark
                  ? 'bg-[#0F172A] border-white/10 text-white hover:bg-[#202026]'
                  : 'bg-white border-zinc-300 text-black hover:bg-zinc-100'
            }`}
          >
            {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
            <span className={copied ? 'text-emerald-800 dark:text-emerald-300' : isDark ? 'text-white' : 'text-black'}>
              {copied ? '¡Datos copiados al portapapeles!' : 'Copiar Resumen de Envío'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
