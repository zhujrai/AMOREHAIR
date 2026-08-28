import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Upload, Trash2, Check, Sparkles, Link as LinkIcon, Camera } from 'lucide-react';
import { StoreSettings } from '../types';

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings: StoreSettings;
  onUpdateStoreSettings: (newSettings: StoreSettings) => void;
  isDark: boolean;
}

export const LogoUploadModal: React.FC<LogoUploadModalProps> = ({
  isOpen,
  onClose,
  storeSettings,
  onUpdateStoreSettings,
  isDark,
}) => {
  const [logoInput, setLogoInput] = useState<string>(storeSettings.logoUrl || '');
  const [storeNameInput, setStoreNameInput] = useState<string>(storeSettings.storeName || 'AMORE SALON HAIR STYLE');
  const [phoneInput, setPhoneInput] = useState<string>(storeSettings.phone || '940339934');
  const [activeMode, setActiveMode] = useState<'upload' | 'url'>('upload');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen debe pesar menos de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setLogoInput(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    onUpdateStoreSettings({
      ...storeSettings,
      storeName: storeNameInput.trim() || 'AMORE SALON HAIR STYLE',
      phone: phoneInput.trim() || '940339934',
      whatsappNumber: phoneInput.replace(/\D/g, '').length === 9 ? `51${phoneInput.replace(/\D/g, '')}` : storeSettings.whatsappNumber,
      logoUrl: logoInput.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDark 
            ? 'bg-[#15151A] border-[#2C2C35] text-[#F3F4F6]' 
            : 'bg-white border-zinc-200 text-[#1F2224]'
        }`}
      >
        {/* Header */}
        <div className={`p-5 border-b-2 flex items-center justify-between ${
          isDark ? 'border-[#2C2C35] bg-[#1A1A1F]' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-[#FF7060] border border-red-500/30 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-black dark:text-white">
                Espacio de Logo & Marca
              </h3>
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Personaliza el logo que se muestra en el encabezado y en el sistema
              </p>
            </div>
          </div>

          <button
            id="close-logo-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Visual Logo Preview Slot */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0F0F12] text-center space-y-3">
            <div className="relative group">
              <div className="h-24 min-w-[140px] px-3 rounded-2xl border-2 border-red-500/30 shadow-lg overflow-hidden flex items-center justify-center bg-white dark:bg-[#1A1A1F]">
                {logoInput ? (
                  <img
                    src={logoInput}
                    alt="Logo Marca"
                    className="max-h-16 w-auto max-w-[200px] object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-[#FF7060]">
                    <Sparkles className="w-8 h-8 mb-1 opacity-90" />
                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">
                      AMORE SALON
                    </span>
                  </div>
                )}
              </div>

              {logoInput && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                  title="Eliminar logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <p className="font-black text-sm text-black dark:text-zinc-100">
                {storeNameInput || 'AMORE SALON HAIR STYLE'}
              </p>
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-500 mt-0.5">
                {logoInput ? 'Vista previa del logo activo en la plataforma' : 'Sin logo personalizado cargado'}
              </p>
            </div>
          </div>

          {/* Preset Buttons for Official Amore 2026 Logos */}
          <div className="space-y-2">
            <span className="text-xs font-black text-black dark:text-zinc-400 block">
              Logos Oficiales AMORE SALON 2026:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLogoInput('https://res.cloudinary.com/nqvtgmba/image/upload/v1787124583/AmoreLogo2026horizontal.png')}
                className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2 text-xs font-black transition-all cursor-pointer ${
                  logoInput.includes('horizontal')
                    ? 'border-[#FF7060] bg-[#FF7060]/10 text-red-600 dark:text-[#FF7060]'
                    : 'border-zinc-300 dark:border-zinc-800 text-black dark:text-zinc-300 hover:border-black'
                }`}
              >
                <img
                  src="https://res.cloudinary.com/nqvtgmba/image/upload/v1787124583/AmoreLogo2026horizontal.png"
                  alt="Amore Horizontal"
                  className="h-5 w-auto max-w-[50px] object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="leading-tight">
                  <div className="text-[11px]">Versión Horizontal</div>
                  <div className="text-[9px] text-zinc-600 dark:text-zinc-400 font-mono font-bold">Recomendada Web</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLogoInput('https://res.cloudinary.com/nqvtgmba/image/upload/v1787124738/AmoreLogo2026_1x1.png')}
                className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2 text-xs font-black transition-all cursor-pointer ${
                  logoInput.includes('1x1')
                    ? 'border-[#FF7060] bg-[#FF7060]/10 text-red-600 dark:text-[#FF7060]'
                    : 'border-zinc-300 dark:border-zinc-800 text-black dark:text-zinc-300 hover:border-black'
                }`}
              >
                <img
                  src="https://res.cloudinary.com/nqvtgmba/image/upload/v1787124738/AmoreLogo2026_1x1.png"
                  alt="Amore 1:1"
                  className="h-5 w-5 object-contain rounded"
                  referrerPolicy="no-referrer"
                />
                <div className="leading-tight">
                  <div className="text-[11px]">Versión 1:1 Cuadrada</div>
                  <div className="text-[9px] text-zinc-600 dark:text-zinc-400 font-mono font-bold">Favicon / App Icon</div>
                </div>
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveMode('upload')}
              className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'upload'
                  ? 'bg-white dark:bg-zinc-800 text-red-600 dark:text-[#FF7060] shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-black'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Archivo de Imagen</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('url')}
              className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'url'
                  ? 'bg-white dark:bg-zinc-800 text-red-600 dark:text-[#FF7060] shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-black'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Pegar URL de Imagen</span>
            </button>
          </div>

          {/* Mode Upload File */}
          {activeMode === 'upload' ? (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="logo-file-input"
              />
              <label
                htmlFor="logo-file-input"
                className={`w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isDark 
                    ? 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 hover:border-[#FF7060]' 
                    : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100 hover:border-black'
                }`}
              >
                <Upload className="w-6 h-6 text-[#FF7060]" />
                <div className="text-center">
                  <span className="text-xs font-black text-black dark:text-zinc-100">
                    Haz clic para elegir una imagen de tu dispositivo
                  </span>
                  <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-500 mt-0.5">
                    Recomendado: PNG o JPG con fondo transparente o fondo blanco (máx. 5MB)
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-black text-black dark:text-zinc-400">
                URL directa de la imagen (HTTPS)
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://misitio.com/logo-amore-salon.png"
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF7060] ${
                    isDark 
                      ? 'bg-[#0F0F12] border-[#2C2C35] text-zinc-100' 
                      : 'bg-white border-zinc-300 text-black'
                  }`}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-red-500 font-black">{uploadError}</p>
          )}

          {/* Nombre de la Empresa */}
          <div className="space-y-3 pt-3 border-t-2 border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-black text-black dark:text-zinc-400 mb-1">
                Nombre de la Empresa
              </label>
              <input
                type="text"
                value={storeNameInput}
                onChange={(e) => setStoreNameInput(e.target.value)}
                placeholder="AMORE SALON HAIR STYLE"
                className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF7060] ${
                  isDark 
                    ? 'bg-[#0F0F12] border-[#2C2C35] text-zinc-100' 
                    : 'bg-white border-zinc-300 text-black'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-black dark:text-zinc-400 mb-1">
                Teléfono de Contacto Remitente (en rótulo)
              </label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="940339934"
                maxLength={9}
                className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF7060] ${
                  isDark 
                    ? 'bg-[#0F0F12] border-[#2C2C35] text-zinc-100' 
                    : 'bg-white border-zinc-300 text-black'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`p-4 border-t-2 flex items-center justify-end gap-3 ${
          isDark ? 'border-[#2C2C35] bg-[#1A1A1F]' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border-2 border-zinc-300 dark:border-zinc-700 text-xs font-black text-black dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#FF7060] hover:bg-[#ff5b48] text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-[#FF7060]/25 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
};
