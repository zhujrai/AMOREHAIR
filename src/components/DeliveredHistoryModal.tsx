import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Phone, 
  Printer, 
  ExternalLink,
  Building2,
  Bike,
  Store,
  Download,
  Filter,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { 
  getShippingTypeBadge, 
  formatPeruvianDate, 
  getCustomerDirectWhatsAppUrl,
  WHATSAPP_ICON_URL 
} from '../utils/formatters';

interface DeliveredHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  storeSettings: StoreSettings;
  onOpenLabel: (order: Order) => void;
  isDark: boolean;
}

export const DeliveredHistoryModal: React.FC<DeliveredHistoryModalProps> = ({
  isOpen,
  onClose,
  orders,
  storeSettings,
  onOpenLabel,
  isDark,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courierFilter, setCourierFilter] = useState<string>('todos');

  // Filter delivered orders
  const deliveredOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'entregados')
      .filter((order) => {
        const matchCourier = courierFilter === 'todos' || order.shippingType === courierFilter;
        const term = searchTerm.toLowerCase().trim();
        const matchSearch =
          !term ||
          order.customerName.toLowerCase().includes(term) ||
          order.customerPhone.includes(term) ||
          order.documentNumber.includes(term) ||
          order.id.toLowerCase().includes(term) ||
          (order.agency?.name && order.agency.name.toLowerCase().includes(term)) ||
          (order.deliveryDistrict && order.deliveryDistrict.toLowerCase().includes(term)) ||
          (order.trackingNumber && order.trackingNumber.toLowerCase().includes(term));

        return matchCourier && matchSearch;
      });
  }, [orders, courierFilter, searchTerm]);

  if (!isOpen) return null;

  // Export CSV function
  const handleExportCSV = () => {
    if (deliveredOrders.length === 0) return;

    const headers = [
      'ID',
      'Fecha Despacho',
      'Destinatario',
      'Tipo Doc',
      'Nro Documento',
      'Telefono',
      'Metodo Envio',
      'Agencia/Distrito',
      'Direccion',
      'Nro Guia',
      'Items',
      'Notas'
    ];

    const rows = deliveredOrders.map((o) => [
      `#${o.id}`,
      o.dispatchDate || '',
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      o.documentType || 'DNI',
      `"${o.documentNumber || ''}"`,
      `"${o.customerPhone || ''}"`,
      o.shippingType || '',
      `"${(o.agency?.name || o.deliveryDistrict || '').replace(/"/g, '""')}"`,
      `"${(o.deliveryAddress || o.agency?.address || '').replace(/"/g, '""')}"`,
      `"${(o.trackingNumber || '').replace(/"/g, '""')}"`,
      `"${(o.itemsDescription || '').replace(/"/g, '""')}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_entregados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-5xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col transition-all overflow-hidden ${
          isDark 
            ? 'bg-[#18181B] border-zinc-800 text-zinc-100' 
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Historial de Pedidos Entregados</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold">
                  {deliveredOrders.length} {deliveredOrders.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Consulta y audita todos los despachos finalizados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={deliveredOrders.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Descargar historial en archivo Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
            <button
              id="close-delivered-history-modal"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Filter */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, teléfono, guía..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                isDark 
                  ? 'bg-zinc-900/90 border-zinc-800 text-white placeholder-zinc-500' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'shalom', label: 'Shalom' },
              { id: 'olva', label: 'Olva' },
              { id: 'delivery_lima', label: 'Delivery' },
              { id: 'tienda', label: 'Salón' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCourierFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer border text-xs whitespace-nowrap ${
                  courierFilter === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs'
                    : isDark
                      ? 'bg-zinc-900/70 text-zinc-400 hover:text-white border-zinc-800'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {deliveredOrders.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">No se encontraron pedidos entregados</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {searchTerm ? 'Prueba ajustando los filtros de búsqueda.' : 'Los pedidos completados aparecerán aquí.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                }`}>
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Destinatario</th>
                  <th className="py-3 px-4">Modalidad</th>
                  <th className="py-3 px-4">Destino / Agencia</th>
                  <th className="py-3 px-4">Despacho</th>
                  <th className="py-3 px-4">N° Guía</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {deliveredOrders.map((order) => {
                  const badge = getShippingTypeBadge(order.shippingType);
                  const waDirectUrl = getCustomerDirectWhatsAppUrl(order);
                  const displayPhone = order.customerPhone.replace(/\D/g, '').slice(-9);

                  let locationStr = '';
                  if (order.shippingType === 'shalom' || order.shippingType === 'olva') {
                    locationStr = order.agency ? `${order.agency.name} (${order.agency.department})` : order.deliveryDistrict || 'Agencia';
                  } else if (order.shippingType === 'delivery_lima') {
                    locationStr = `${order.deliveryDistrict}: ${order.deliveryAddress}`;
                  } else {
                    locationStr = 'Retiro en Salón';
                  }

                  return (
                    <tr 
                      key={order.id}
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                        #{order.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-white">{order.customerName}</div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span>{order.documentType}: {order.documentNumber}</span>
                          <span>•</span>
                          <a
                            href={waDirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono inline-flex items-center gap-1"
                          >
                            <img src={WHATSAPP_ICON_URL} alt="WA" className="w-3 h-3 object-contain" />
                            <span>{displayPhone}</span>
                          </a>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isDark ? badge.bgDark : badge.bgLight
                        } ${
                          isDark ? badge.textDark : badge.textLight
                        } ${
                          isDark ? badge.borderDark : badge.borderLight
                        }`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="truncate font-semibold text-zinc-800 dark:text-zinc-200" title={locationStr}>
                          {locationStr}
                        </p>
                        {order.notes && (
                          <p className="text-[11px] text-zinc-500 italic truncate mt-0.5">
                            Nota: {order.notes}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {formatPeruvianDate(order.dispatchDate)}
                      </td>

                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {order.trackingNumber ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 text-[11px]">
                            {order.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenLabel(order)}
                          className="p-1.5 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800 transition-colors font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          title="Reimprimir Rótulo Térmico"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Rótulo</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50">
          <span>Mostrando {deliveredOrders.length} registros en total</span>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
