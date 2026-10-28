import React, { useEffect } from 'react';
import { X, Building2, Truck, Bike, Store, Check, ArrowRight, Sparkles, Sun, Moon } from 'lucide-react';
import { ShippingMethodsConfig, ShippingType, StoreSettings } from '../types';
import { getBrandLogo } from '../utils/formatters';

interface ShippingTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType?: ShippingType | null;
  onSelect: (type: ShippingType) => void;
  shippingConfig?: ShippingMethodsConfig;
  isDark: boolean;
  setIsDark?: (dark: boolean) => void;
  storeSettings?: StoreSettings;
}

export const ShippingTypeModal: React.FC<ShippingTypeModalProps> = ({
  isOpen,
  onClose,
  selectedType,
  onSelect,
  shippingConfig = { shalom: true, olva: true, delivery_lima: true, tienda: true },
  isDark,
  setIsDark,
  storeSettings,
}) => {
  // Prevent background scrolling while modal is open (especially on mobile)
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const brandLogo = getBrandLogo(isDark, storeSettings);

  const allOptions: Array<{
    type: ShippingType;
    title: string;
    description: string;
    badge: string;
    icon: React.ReactNode;
    colorClasses: {
      activeBorder: string;
      activeBgDark: string;
      activeBgLight: string;
      iconBgDark: string;
      iconBgLight: string;
      badgeDark: string;
      badgeLight: string;
    };
  }> = [
    {
      type: 'shalom',
      title: 'Retiro en agencia Shalom',
      description: 'Agencias a Nivel Nacional, pago por adelantado.',
      badge: 'Provincias y Lima',
      icon: <Building2 className="w-5 h-5 text-rose-500" />,
      colorClasses: {
        activeBorder: 'border-rose-500 ring-2 ring-rose-500/30',
        activeBgDark: 'bg-rose-950/30',
        activeBgLight: 'bg-rose-50/90',
        iconBgDark: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
        iconBgLight: 'bg-rose-100/80 border-rose-200 text-rose-600',
        badgeDark: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        badgeLight: 'bg-rose-100 text-rose-700 border-rose-200',
      },
    },
    {
      type: 'marvisur',
      title: 'Retiro en agencia Expreso Marvisur',
      description: 'Sucursales a Nivel Nacional (Perú), encomiendas y carga pesada.',
      badge: 'Expreso Nacional',
      icon: <Truck className="w-5 h-5 text-cyan-500" />,
      colorClasses: {
        activeBorder: 'border-cyan-500 ring-2 ring-cyan-500/30',
        activeBgDark: 'bg-cyan-950/30',
        activeBgLight: 'bg-cyan-50/90',
        iconBgDark: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
        iconBgLight: 'bg-cyan-100/80 border-cyan-200 text-cyan-600',
        badgeDark: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        badgeLight: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      },
    },
    {
      type: 'delivery_lima',
      title: 'Delivery (Lima Metropolitana)',
      description: 'Motorizado de 3PM a 10PM. Pedidos antes de 10AM se entregan hoy (no opera domingos).',
      badge: 'A Domicilio',
      icon: <Bike className="w-5 h-5 text-blue-500" />,
      colorClasses: {
        activeBorder: 'border-blue-500 ring-2 ring-blue-500/30',
        activeBgDark: 'bg-blue-950/30',
        activeBgLight: 'bg-blue-50/90',
        iconBgDark: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
        iconBgLight: 'bg-blue-100/80 border-blue-200 text-blue-600',
        badgeDark: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        badgeLight: 'bg-blue-100 text-blue-700 border-blue-200',
      },
    },
    {
      type: 'olva',
      title: 'Retiro en agencia Olva Courier',
      description: 'Oficinas oficiales Olva con cobertura distrital y provincial garantizada.',
      badge: 'Cobertura Nacional',
      icon: <Truck className="w-5 h-5 text-amber-500" />,
      colorClasses: {
        activeBorder: 'border-amber-500 ring-2 ring-amber-500/30',
        activeBgDark: 'bg-amber-950/30',
        activeBgLight: 'bg-amber-50/90',
        iconBgDark: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
        iconBgLight: 'bg-amber-100/80 border-amber-200 text-amber-600',
        badgeDark: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        badgeLight: 'bg-amber-100 text-amber-700 border-amber-200',
      },
    },
    {
      type: 'tienda',
      title: 'Retiro en Salón / Tienda',
      description: 'En nuestro local comercial',
      badge: 'Gratis / Sin Costo',
      icon: <Store className="w-5 h-5 text-emerald-500" />,
      colorClasses: {
        activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/30',
        activeBgDark: 'bg-emerald-950/30',
        activeBgLight: 'bg-emerald-50/90',
        iconBgDark: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
        iconBgLight: 'bg-emerald-100/80 border-emerald-200 text-emerald-600',
        badgeDark: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        badgeLight: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      },
    },
  ];

  // Filter options by shippingConfig if any is active
  const availableOptions = allOptions.filter((opt) => shippingConfig[opt.type] !== false);
  const optionsToRender = availableOptions.length > 0 ? availableOptions : allOptions;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
      onTouchMove={(e) => {
        // Only allow scroll if it is within scrollable inner content
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div 
        className={`w-full h-full sm:h-auto sm:max-w-xl flex flex-col justify-between sm:justify-start rounded-none sm:rounded-[28px] border-0 sm:border p-6 sm:p-8 shadow-2xl transition-all duration-200 max-h-screen sm:max-h-[92vh] overflow-y-auto overscroll-contain touch-pan-y ${
          isDark 
            ? 'bg-[#16161B]/95 sm:border-white/10 text-[#F3F4F6]' 
            : 'bg-white/95 sm:border-zinc-200/90 text-black'
        }`}
      >
        <div>
          {/* Top Brand Bar inside Modal */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200/70 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={storeSettings?.storeName || 'AMORE SALON'}
                  className="h-8 w-auto max-w-[160px] object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-black text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
                  {storeSettings?.storeName || 'AMORE SALON'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {setIsDark && (
                <button
                  type="button"
                  onClick={() => setIsDark(!isDark)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer shadow-2xs ${
                    isDark 
                      ? 'border-white/10 bg-zinc-900 text-amber-400 hover:bg-zinc-800' 
                      : 'border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                  }`}
                  title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}

              <button
                id="close-shipping-modal-btn"
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Cerrar y volver al formulario"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight leading-tight">
              Elige cómo deseas recibir o retirar tu pedido
            </h2>
          </div>

          {/* Options List */}
          <div className="space-y-3 mt-4">
            {optionsToRender.map((opt) => {
              const isSelected = selectedType === opt.type;
              return (
                <button
                  key={opt.type}
                  id={`shipping-option-${opt.type}`}
                  type="button"
                  onClick={() => {
                    onSelect(opt.type);
                    onClose();
                  }}
                  className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 relative group cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.005] active:scale-[0.99] ${
                    isSelected
                      ? `${opt.colorClasses.activeBorder} ${
                          isDark ? opt.colorClasses.activeBgDark : opt.colorClasses.activeBgLight
                        }`
                      : isDark
                        ? 'border-white/10 bg-[#1F1F26]/70 hover:bg-[#252530] hover:border-white/20'
                        : 'border-zinc-200/90 bg-white hover:bg-zinc-50/90 hover:border-zinc-400'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105 ${
                    isDark ? opt.colorClasses.iconBgDark : opt.colorClasses.iconBgLight
                  }`}>
                    {opt.icon}
                  </div>

                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-sm sm:text-base tracking-tight text-black dark:text-white">
                        {opt.title}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        isDark ? opt.colorClasses.badgeDark : opt.colorClasses.badgeLight
                      }`}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                      {opt.description}
                    </p>
                  </div>

                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-rose-600 group-hover:text-white transition-all">
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

