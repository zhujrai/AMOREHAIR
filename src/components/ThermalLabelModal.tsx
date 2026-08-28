import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { ShippingLabel, LabelPaperSize } from './ShippingLabel';

interface ThermalLabelModalProps {
  order: Order | null;
  storeSettings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const ThermalLabelModal: React.FC<ThermalLabelModalProps> = ({
  order,
  storeSettings,
  isOpen,
  onClose,
  isDark,
}) => {
  const [paperSize, setPaperSize] = useState<LabelPaperSize>('thermal');

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto print:static print:p-0 print:m-0 print:bg-transparent print:overflow-visible">
      
      {/* Modal Container */}
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl transition-all duration-200 my-auto print:border-none print:shadow-none print:bg-transparent print:w-full print:max-w-none ${
        isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-[#F3F4F6]' : 'bg-white border-zinc-300 text-zinc-900'
      }`}>
        
        {/* Modal Toolbar (hidden when printing) */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-black dark:text-white">
                Rótulo #{order.id}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Selecciona el tamaño e imprime en 1 sola copia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="print-label-now-btn"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-red-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Rótulo</span>
            </button>
            <button
              id="close-thermal-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Size Selector (3 Sizes) */}
        <div className="px-4 sm:px-6 pt-4 flex items-center justify-between gap-2 print:hidden flex-wrap">
          <span className="text-xs font-black text-black dark:text-zinc-300">
            Formato de Impresión:
          </span>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setPaperSize('thermal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                paperSize === 'thermal'
                  ? 'bg-black text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white'
              }`}
            >
              🏷️ Pequeño (Térmica 100x150 mm)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('half_a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                paperSize === 'half_a4'
                  ? 'bg-black text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white'
              }`}
            >
              📄 Mediano (Mitad A4 / A5)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('full_a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                paperSize === 'full_a4'
                  ? 'bg-black text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white'
              }`}
            >
              📑 Grande (Hoja A4 Completa)
            </button>
          </div>
        </div>

        {/* PRINTABLE LABEL AREA */}
        <div className="p-4 sm:p-6 flex justify-center bg-zinc-900/10 dark:bg-black/40 print:p-0 print:m-0 print:bg-transparent">
          <div id="printable-thermal-label" className="print:w-full print-active-single-container">
            <ShippingLabel
              order={order}
              storeSettings={storeSettings}
              paperSize={paperSize}
            />
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 print:hidden">
          <span>AMORE SALON HAIR STYLE • Vista previa de 1 sola copia exacta</span>
          <button
            onClick={onClose}
            className="font-bold text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

    </div>
  );
};
