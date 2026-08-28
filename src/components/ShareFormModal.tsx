import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  ExternalLink, 
  Send, 
  QrCode,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { StoreSettings } from '../types';
import { getBrandLogo } from '../utils/formatters';

interface ShareFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings: StoreSettings;
  isDark: boolean;
}

export const ShareFormModal: React.FC<ShareFormModalProps> = ({
  isOpen,
  onClose,
  storeSettings,
  isDark,
}) => {
  const [copiedLinkOnly, setCopiedLinkOnly] = useState(false);
  const [copiedFullMessage, setCopiedFullMessage] = useState(false);
  const [customPhone, setCustomPhone] = useState('');

  if (!isOpen) return null;

  const publicFormUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}` 
    : '';

  const defaultShareMessage = `📦 *${storeSettings.storeName || 'AMORE SALON HAIR STYLE'}*\nPor favor, registra los datos para programar tu envío aquí:\n👉 ${publicFormUrl}\n\n¡Muchas gracias por tu compra! ✨`;

  const handleCopyOnlyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicFormUrl);
      setCopiedLinkOnly(true);
      setTimeout(() => setCopiedLinkOnly(false), 2500);
    } catch {
      const temp = document.createElement('textarea');
      temp.value = publicFormUrl;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      setCopiedLinkOnly(true);
      setTimeout(() => setCopiedLinkOnly(false), 2500);
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(defaultShareMessage);
      setCopiedFullMessage(true);
      setTimeout(() => setCopiedFullMessage(false), 2500);
    } catch {
      const temp = document.createElement('textarea');
      temp.value = defaultShareMessage;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      setCopiedFullMessage(true);
      setTimeout(() => setCopiedFullMessage(false), 2500);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = customPhone.replace(/\D/g, '');
    const encoded = encodeURIComponent(defaultShareMessage);
    const targetPhone = cleanPhone ? (cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`) : '';
    const waUrl = targetPhone 
      ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    
    window.open(waUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Registro de Envíos • ${storeSettings.storeName}`,
          text: `📦 Registra tus datos para programar tu envío aquí:`,
          url: publicFormUrl,
        });
      } catch {}
    } else {
      handleCopyFullMessage();
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicFormUrl)}&margin=8`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-lg rounded-3xl border p-5 sm:p-7 shadow-2xl transition-all max-h-[92vh] overflow-y-auto ${
          isDark 
            ? 'bg-[#18181F] border-white/10 text-white' 
            : 'bg-white border-zinc-200 text-zinc-950 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200/80 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
              <Share2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-zinc-950 dark:text-white">
                Compartir Formulario de Envíos
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                Envía este enlace a tus clientes para que registren sus datos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="space-y-4">
          
          {/* URL Box with direct Copy button */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>Enlace Directo del Formulario</span>
            </label>

            <div className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl border ${
              isDark ? 'bg-zinc-900 border-white/10' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <input
                type="text"
                readOnly
                value={publicFormUrl}
                className="w-full bg-transparent px-2 text-xs font-mono text-zinc-700 dark:text-zinc-300 outline-hidden select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />

              <button
                type="button"
                onClick={handleCopyOnlyUrl}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                  copiedLinkOnly
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {copiedLinkOnly ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Copy WhatsApp Ready Template */}
            <button
              type="button"
              onClick={handleCopyFullMessage}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:scale-[1.01] active:scale-[0.99] ${
                copiedFullMessage
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200'
                  : isDark
                    ? 'bg-zinc-900/90 hover:bg-zinc-800/90 border-white/10 text-white'
                    : 'bg-zinc-50 hover:bg-zinc-100/90 border-zinc-200 text-zinc-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Copy className="w-4 h-4 text-blue-500 stroke-[2.2]" />
                  <span>Copiar Mensaje Completo</span>
                </span>
                {copiedFullMessage && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Incluye saludo, nombre de la marca e instrucciones claras.
              </p>
            </button>

            {/* Native Share on mobile or browser */}
            <button
              type="button"
              onClick={handleNativeShare}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:scale-[1.01] active:scale-[0.99] ${
                isDark
                  ? 'bg-zinc-900/90 hover:bg-zinc-800/90 border-white/10 text-white'
                  : 'bg-zinc-50 hover:bg-zinc-100/90 border-zinc-200 text-zinc-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-500 stroke-[2.2]" />
                  <span>Compartir en Redes / App</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Abre el menú de compartir nativo de tu teléfono o navegador.
              </p>
            </button>
          </div>

          {/* Direct WhatsApp Send */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            isDark ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                <span>Enviar Directo por WhatsApp</span>
              </label>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Opcional</span>
            </div>

            <div className="flex gap-2">
              <input
                type="tel"
                maxLength={9}
                placeholder="Número del cliente (ej: 987654321)"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  isDark 
                    ? 'bg-zinc-900 border-white/10 text-white placeholder-zinc-500' 
                    : 'bg-white border-zinc-200 text-zinc-950 placeholder-zinc-400'
                }`}
              />

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-xs transition-all"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Enviar</span>
              </button>
            </div>
          </div>

          {/* QR Code section for in-store scanning */}
          <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
            isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div className="w-16 h-16 rounded-xl bg-white p-1 flex-shrink-0 shadow-xs flex items-center justify-center">
              <img
                src={qrUrl}
                alt="Código QR del Formulario"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-black text-xs text-zinc-950 dark:text-white">
                <QrCode className="w-3.5 h-3.5 text-purple-500" />
                <span>Código QR para Escaneo</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                Los clientes pueden escanear este código directamente desde su celular para abrir el formulario al instante.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-zinc-200/80 dark:border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-black text-xs cursor-pointer transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
