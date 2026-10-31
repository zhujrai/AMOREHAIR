import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  X, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Phone, 
  MapPin, 
  Building2, 
  Truck, 
  Bike, 
  Store,
  DollarSign
} from 'lucide-react';
import { Order } from '../types';
import { formatPeruvianDate } from '../utils/formatters';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashOrders: Order[];
  onRestoreOrder: (order: Order) => void;
  onDeletePermanent: (orderId: string) => void;
  onEmptyTrash: () => void;
  isDark: boolean;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  trashOrders,
  onRestoreOrder,
  onDeletePermanent,
  onEmptyTrash,
  isDark,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  if (!isOpen) return null;

  const filteredTrash = trashOrders.filter((order) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      order.customerName.toLowerCase().includes(term) ||
      order.customerPhone.includes(term) ||
      order.documentNumber.includes(term) ||
      order.id.toLowerCase().includes(term) ||
      (order.agency?.name && order.agency.name.toLowerCase().includes(term)) ||
      (order.deliveryDistrict && order.deliveryDistrict.toLowerCase().includes(term))
    );
  });

  const getShippingIcon = (type?: string) => {
    switch (type) {
      case 'shalom':
        return <Building2 className="w-4 h-4 text-[#6366F1]" />;
      case 'olva':
        return <Truck className="w-4 h-4 text-amber-500" />;
      case 'delivery_lima':
        return <Bike className="w-4 h-4 text-sky-500" />;
      case 'tienda':
        return <Store className="w-4 h-4 text-emerald-500" />;
      default:
        return <Truck className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'nuevos':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">Nuevos</span>;
      case 'empacados':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Empacados</span>;
      case 'en_camino':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">En Camino</span>;
      case 'entregados':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Entregados</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-500/10 text-[#475569] dark:text-zinc-400 border border-zinc-500/20">Desconocido</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto ${
          isDark ? 'bg-[#16161B] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-[#0F172A]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
          isDark ? 'bg-[#1A1A22] border-[#2C2C35]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-[#6366F1] border border-[#818CF8]/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Papelera de Pedidos
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-[#6366F1] dark:text-rose-400 border border-rose-500/30">
                  {trashOrders.length} {trashOrders.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </h3>
              <p className="text-xs text-[#475569] dark:text-zinc-400">
                Rescata pedidos eliminados por error o bórralos definitivamente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trashOrders.length > 0 && !confirmEmpty && (
              <button
                id="empty-trash-btn"
                type="button"
                onClick={() => setConfirmEmpty(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-[#6366F1] dark:text-rose-400 border border-rose-600/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Papelera</span>
              </button>
            )}
            <button
              id="close-trash-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Confirmation banner for Empty Trash */}
        {confirmEmpty && (
          <div className="p-3 bg-rose-600 text-white flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>¿Estás seguro de vaciar toda la papelera? Se borrarán {trashOrders.length} pedidos permanentemente de la base de datos.</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  onEmptyTrash();
                  setConfirmEmpty(false);
                }}
                className="px-3 py-1 rounded-lg bg-white text-rose-700 hover:bg-zinc-100 font-black cursor-pointer shadow-xs"
              >
                Sí, Vaciar Todo
              </button>
              <button
                type="button"
                onClick={() => setConfirmEmpty(false)}
                className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Search bar */}
        {trashOrders.length > 0 && (
          <div className="p-3 sm:p-4 border-b border-[#E2E8F0] dark:border-zinc-800/80">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en papelera por cliente, teléfono, DNI o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                  isDark 
                    ? 'bg-[#111115] border-white/10 text-white placeholder-[#475569]/70' 
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-black placeholder-[#475569]/70'
                }`}
              />
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 max-h-[55vh]">
          {trashOrders.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-[#475569] flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-black text-[#0F172A] dark:text-zinc-200">
                  La papelera está vacía
                </h4>
                <p className="text-xs text-[#475569] dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  Cuando elimines un pedido del panel Kanban, se moverá aquí temporalmente antes de ser borrado para que puedas recuperarlo en cualquier momento.
                </p>
              </div>
            </div>
          ) : filteredTrash.length === 0 ? (
            <div className="text-center py-10 text-[#475569] text-xs font-bold">
              No se encontraron pedidos en la papelera que coincidan con "{searchTerm}".
            </div>
          ) : (
            filteredTrash.map((order) => (
              <div
                key={order.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-[#1C1C24] border-zinc-800 hover:border-zinc-700' 
                    : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-zinc-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-[#0F172A] dark:text-zinc-100">
                        #{order.id}
                      </span>
                      {getShippingIcon(order.shippingType)}
                      <span className="text-xs font-black capitalize">
                        {order.shippingType === 'shalom' ? 'Shalom' : order.shippingType === 'olva' ? 'Olva' : order.shippingType === 'delivery_lima' ? 'Delivery Lima' : 'Retiro en Tienda'}
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-[11px] text-[#475569] dark:text-zinc-400">
                        Estado previo:
                      </span>
                      {getStatusBadge(order.previousStatus || order.status)}
                    </div>

                    <div className="flex items-center gap-3">
                      <h4 className="text-sm sm:text-base font-black text-[#0F172A] dark:text-white truncate">
                        {order.customerName}
                      </h4>
                      <span className="text-xs font-mono font-bold text-[#475569] dark:text-zinc-400">
                        {order.documentType}: {order.documentNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#475569] dark:text-zinc-400 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        {order.customerPhone}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        {order.shippingType === 'shalom' || order.shippingType === 'olva'
                          ? (order.agency?.name || 'Agencia')
                          : (order.deliveryDistrict || order.deliveryAddress || 'Lima')}
                      </span>
                      {order.totalAmount !== undefined && (
                        <>
                          <span>•</span>
                          <span className="font-black text-[#0F172A] dark:text-white font-mono">
                            Total: S/ {Number(order.totalAmount).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0] dark:border-zinc-800">
                    
                    {/* Restore button */}
                    <button
                      id={`restore-order-${order.id}-btn`}
                      type="button"
                      onClick={() => onRestoreOrder(order)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Restaurar al tablero Kanban"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rescatar</span>
                    </button>

                    {/* Permanent Delete */}
                    {confirmDeleteId === order.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePermanent(order.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer shadow-xs"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`hard-delete-order-${order.id}-btn`}
                        type="button"
                        onClick={() => setConfirmDeleteId(order.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-[#6366F1] hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Eliminar definitivamente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                  </div>

                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs text-[#475569] ${
          isDark ? 'bg-[#141419] border-zinc-800' : 'bg-[#F8FAFC] border-[#E2E8F0]'
        }`}>
          <span>Los pedidos rescatados regresan a su columna previa en el Kanban.</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-[#0F172A] dark:text-zinc-200 font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
