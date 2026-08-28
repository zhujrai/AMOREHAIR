import React, { useState } from 'react';
import { Printer, X, PackageCheck } from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { ShippingLabel, LabelPaperSize } from './ShippingLabel';

interface BatchThermalLabelsModalProps {
  orders: Order[];
  storeSettings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const BatchThermalLabelsModal: React.FC<BatchThermalLabelsModalProps> = ({
  orders,
  storeSettings,
  isOpen,
  onClose,
  isDark,
}) => {
  const [paperSize, setPaperSize] = useState<LabelPaperSize>('half_a4');

  if (!isOpen || orders.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  // Group into pairs of 2 when half_a4 is selected for 2-per-page A4 printing
  const pairs: Order[][] = [];
  if (paperSize === 'half_a4') {
    for (let i = 0; i < orders.length; i += 2) {
      pairs.push(orders.slice(i, i + 2));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto print:static print:p-0 print:m-0 print:bg-transparent print:overflow-visible">
      {/* Modal Container */}
      <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl transition-all duration-200 my-auto print:border-none print:shadow-none print:bg-transparent print:w-full print:max-w-none ${
        isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-[#F3F4F6]' : 'bg-white border-zinc-300 text-zinc-900'
      }`}>
        {/* Modal Toolbar (hidden when printing) */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-black dark:text-white">
                Impresión Masiva de Rótulos ({orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'})
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {paperSize === 'half_a4' 
                  ? 'Mediano: 2 rótulos por hoja A4 (con línea de corte central)' 
                  : paperSize === 'thermal' 
                    ? 'Pequeño: Térmica continua (100x150 mm)' 
                    : 'Grande: 1 rótulo por página A4 completa'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="print-all-packed-btn"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-amber-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Rótulos ({orders.length})</span>
            </button>
            <button
              id="close-batch-modal-btn"
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
            Tamaño de Rótulo:
          </span>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setPaperSize('thermal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                paperSize === 'thermal'
                  ? 'bg-amber-600 text-white shadow-xs'
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
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white'
              }`}
            >
              📄 Mediano (2 por Hoja A4)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('full_a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                paperSize === 'full_a4'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white'
              }`}
            >
              📑 Grande (1 por Hoja A4 Completa)
            </button>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <div id="printable-batch-area" className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto bg-zinc-900/10 dark:bg-black/40 print:p-0 print:m-0 print:bg-transparent print:overflow-visible print-active-batch-container">
          
          {/* Half A4 mode: 2 items per sheet */}
          {paperSize === 'half_a4' ? (
            <div className="space-y-8 print:space-y-0">
              {pairs.map((pair, pageIndex) => (
                <div
                  key={`page-${pageIndex}`}
                  className="print:w-full print:h-[285mm] print:flex print:flex-col print:justify-between print:page-break-after-always p-2 bg-zinc-100 dark:bg-zinc-900/50 print:bg-white rounded-2xl print:rounded-none border-2 border-dashed border-zinc-400 print:border-none"
                  style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                  <div className="text-center text-[10px] font-mono text-zinc-500 mb-2 print:hidden">
                    — Hoja A4 #{pageIndex + 1} ({pair.length} rótulos) —
                  </div>

                  <div className="space-y-4 print:space-y-0 print:h-full print:flex print:flex-col print:justify-between">
                    {pair.map((order, idx) => (
                      <React.Fragment key={order.id}>
                        <div className="flex justify-center print:flex-1 print:flex print:items-center">
                          <ShippingLabel
                            order={order}
                            storeSettings={storeSettings}
                            paperSize="half_a4"
                            isTwoPerPageItem={true}
                          />
                        </div>
                        {idx === 0 && pair.length > 1 && (
                          <div className="hidden print:flex items-center justify-center my-1">
                            <div className="w-full border-t-2 border-dashed border-zinc-400 relative">
                              <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-white px-2 text-[9px] font-mono uppercase text-zinc-600">
                                ✂️ LÍNEA DE CORTE CENTRAL
                              </span>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Thermal & Full A4 modes: 1 item per page */
            <div className="space-y-6 print:space-y-0">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex justify-center print:page-break-after-always"
                  style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                >
                  <ShippingLabel
                    order={order}
                    storeSettings={storeSettings}
                    paperSize={paperSize}
                  />
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 print:hidden">
          <span>Total: {orders.length} pedidos seleccionados para impresión</span>
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
