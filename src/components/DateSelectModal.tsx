import React from 'react';
import { Calendar, Check, X, Clock, AlertCircle } from 'lucide-react';
import { ShippingType } from '../types';
import { getNext4DispatchDates } from '../utils/formatters';

interface DateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelect: (dateStr: string) => void;
  isDark: boolean;
  cutoffHour: number;
  shippingType?: ShippingType | null;
}

export const DateSelectModal: React.FC<DateSelectModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelect,
  isDark,
  cutoffHour,
  shippingType,
}) => {
  if (!isOpen) return null;

  const dates = getNext4DispatchDates(cutoffHour, shippingType);
  const isTienda = shippingType === 'tienda';
  const isMotorizado = shippingType === 'delivery_lima';
  const modalTitle = isTienda ? 'Fecha de Entrega' : 'Fecha de Envío';
  const modalDesc = isTienda 
    ? 'Selecciona la fecha en la que retirarás tu pedido en tienda'
    : 'Selecciona la fecha en la que despacharemos tu paquete';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all duration-200 ${
          isDark 
            ? 'bg-[#1A1A1F] border-[#2C2C35] text-[#F3F4F6]' 
            : 'bg-white border-zinc-200 text-black'
        }`}
      >
        <div className="w-12 h-1.5 bg-zinc-400/40 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-black dark:text-white">{modalTitle}</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold">
                {modalDesc}
              </p>
            </div>
          </div>
          <button
            id="close-date-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-black hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Cutoff note */}
        <div className={`mt-3 p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${
          isDark 
            ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' 
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
          <span className="font-semibold">
            {isTienda ? (
              <span>Tu pedido estará listo para retiro a partir de la fecha seleccionada en nuestro horario habitual.</span>
            ) : isMotorizado ? (
              <span>Despacho motorizado hoy disponible para pedidos antes de las <strong className="font-black text-black dark:text-white">10:00 AM</strong>. Después de las 10:00 AM aplica a partir de mañana. <span className="underline font-bold">Motorizado no opera domingos</span>.</span>
            ) : (
              <span>Los pedidos registrados antes de las <strong className="font-black text-black dark:text-white">{cutoffHour}:00 hrs</strong> se procesan y despachan el mismo día programado.</span>
            )}
          </span>
        </div>

        {/* Dates list */}
        <div className="space-y-2.5 mt-4">
          {dates.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            return (
              <button
                key={item.dateStr}
                id={`date-option-${item.dateStr}`}
                type="button"
                onClick={() => {
                  onSelect(item.dateStr);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-150 cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/30 ring-2 ring-red-500/20 text-red-700 font-black'
                    : isDark
                      ? 'border-[#2C2C35] bg-[#0F0F12] hover:bg-[#25252d] text-zinc-200 hover:border-zinc-600'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 text-black hover:border-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black text-xs border ${
                    isSelected
                      ? 'bg-red-600 text-white border-red-600 shadow'
                      : isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                        : 'bg-zinc-100 border-zinc-200 text-black'
                  }`}>
                    <span className="text-[10px] uppercase font-black opacity-90">
                      {item.displayDay.split(' ')[1] || 'DÍA'}
                    </span>
                    <span className="text-sm font-black leading-none">
                      {item.displayDay.split(' ')[0]}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-black dark:text-white">
                        {item.displayWeekday}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/20 dark:text-[#FF7060] dark:border-red-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-950 dark:text-zinc-300 font-bold">
                      Despacho seguro
                    </span>
                  </div>
                </div>

                <div>
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-zinc-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <button
            id="cancel-date-btn"
            type="button"
            onClick={onClose}
            className="text-xs font-black text-black hover:underline dark:text-zinc-300 py-1 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
