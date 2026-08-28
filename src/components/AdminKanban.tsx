import React, { useState, useMemo } from 'react';
import { 
  Inbox, 
  Package, 
  Truck, 
  CheckCircle2, 
  Search, 
  Filter, 
  Printer, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Plus, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Building2, 
  Bike, 
  Store, 
  RefreshCw, 
  Download,
  ExternalLink,
  Sparkles,
  Layers,
  Share2,
  Check,
  Settings2,
  Camera,
  Image as ImageIcon,
  Edit3,
  Database,
  Copy,
  Link2
} from 'lucide-react';
import { Agency, Order, OrderStatus, ShippingMethodsConfig, ShippingType, StoreSettings } from '../types';
import { 
  getShippingTypeBadge, 
  getShippingTypeLabel, 
  formatPeruvianDate, 
  getCustomerDirectWhatsAppUrl,
  getTrackingWhatsAppUrl,
  formatPeruvianWhatsAppNumber,
  getOrderShippingCardStyle,
  getOrderPaymentCardStyle,
  WHATSAPP_ICON_URL
} from '../utils/formatters';
import { ThermalLabelModal } from './ThermalLabelModal';
import { BatchThermalLabelsModal } from './BatchThermalLabelsModal';
import { ShippingConfigModal } from './ShippingConfigModal';
import { LogoUploadModal } from './LogoUploadModal';
import { OrderEditModal } from './OrderEditModal';
import { DeliveredHistoryModal } from './DeliveredHistoryModal';
import { DatabaseStatusModal } from './DatabaseStatusModal';
import { TrashModal } from './TrashModal';

interface AdminKanbanProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrder?: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onRestoreOrder?: (order: Order) => void;
  onDeleteOrderPermanent?: (orderId: string) => void;
  onEmptyTrash?: () => void;
  storeSettings: StoreSettings;
  onUpdateStoreSettings?: (newSettings: StoreSettings) => void;
  isDark: boolean;
  onSwitchToClient: () => void;
  shippingConfig: ShippingMethodsConfig;
  onUpdateShippingConfig: (config: ShippingMethodsConfig) => void;
  shalomAgencies: Agency[];
  onUpdateShalomAgencies: (agencies: Agency[]) => void;
  olvaAgencies: Agency[];
  onUpdateOlvaAgencies: (agencies: Agency[]) => void;
  marvisurAgencies?: Agency[];
  onUpdateMarvisurAgencies?: (agencies: Agency[]) => void;
}

export const AdminKanban: React.FC<AdminKanbanProps> = ({
  orders,
  onUpdateOrderStatus,
  onUpdateOrder,
  onDeleteOrder,
  onRestoreOrder,
  onDeleteOrderPermanent,
  onEmptyTrash,
  storeSettings,
  onUpdateStoreSettings,
  isDark,
  onSwitchToClient,
  shippingConfig,
  onUpdateShippingConfig,
  shalomAgencies,
  onUpdateShalomAgencies,
  olvaAgencies,
  onUpdateOlvaAgencies,
  marvisurAgencies = [],
  onUpdateMarvisurAgencies,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courierFilter, setCourierFilter] = useState<'todos' | ShippingType>('todos');
  const [selectedLabelOrder, setSelectedLabelOrder] = useState<Order | null>(null);
  const [batchOrdersToPrint, setBatchOrdersToPrint] = useState<Order[]>([]);
  const [selectedForPrintIds, setSelectedForPrintIds] = useState<string[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [showBatchThermalModal, setShowBatchThermalModal] = useState(false);
  const [showDeliveredHistoryModal, setShowDeliveredHistoryModal] = useState(false);
  const [showShippingConfigModal, setShowShippingConfigModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);

  // Active vs Trash orders
  const activeOrders = useMemo(() => orders.filter((o) => !o.isDeleted), [orders]);
  const trashOrders = useMemo(() => orders.filter((o) => o.isDeleted), [orders]);

  // Drag and drop state
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [copiedClientUrl, setCopiedClientUrl] = useState(false);

  const clientFormUrl = typeof window !== 'undefined' ? `${window.location.origin}/pedidos` : '/pedidos';
  const textToCopy = `Registra los datos de entrega aquí: ${clientFormUrl}`;

  const handleCopyClientUrl = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedClientUrl(true);
      setTimeout(() => setCopiedClientUrl(false), 2500);
    } catch {
      const temp = document.createElement('textarea');
      temp.value = textToCopy;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      setCopiedClientUrl(true);
      setTimeout(() => setCopiedClientUrl(false), 2500);
    }
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((order) => {
      const matchCourier = courierFilter === 'todos' || order.shippingType === courierFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerPhone.includes(term) ||
        order.documentNumber.includes(term) ||
        order.id.toLowerCase().includes(term) ||
        (order.agency?.name && order.agency.name.toLowerCase().includes(term)) ||
        (order.deliveryDistrict && order.deliveryDistrict.toLowerCase().includes(term));

      return matchCourier && matchSearch;
    });
  }, [activeOrders, courierFilter, searchTerm]);

  // Group by Kanban columns
  const columns: Array<{
    id: OrderStatus;
    title: string;
    icon: React.ReactNode;
    color: string;
    bgBadge: string;
  }> = [
    {
      id: 'nuevos',
      title: 'Nuevos / Pendientes',
      icon: <Inbox className="w-4 h-4 text-red-500" />,
      color: 'border-red-500/50',
      bgBadge: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
    {
      id: 'empacados',
      title: 'Empacados',
      icon: <Package className="w-4 h-4 text-amber-500" />,
      color: 'border-amber-500/50',
      bgBadge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
    {
      id: 'en_camino',
      title: 'En Agencia / En Camino',
      icon: <Truck className="w-4 h-4 text-blue-500" />,
      color: 'border-blue-500/50',
      bgBadge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    {
      id: 'entregados',
      title: 'Entregados',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      color: 'border-emerald-500/50',
      bgBadge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    },
  ];

  const getOrdersByStatus = (status: OrderStatus) => {
    return filteredOrders.filter((o) => o.status === status);
  };

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case 'nuevos':
        return 'empacados';
      case 'empacados':
        return 'en_camino';
      case 'en_camino':
        return 'entregados';
      default:
        return null;
    }
  };

  const getPrevStatus = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case 'entregados':
        return 'en_camino';
      case 'en_camino':
        return 'empacados';
      case 'empacados':
        return 'nuevos';
      default:
        return null;
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('text/plain', orderId);
    setDraggedOrderId(orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: OrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId;
    if (orderId) {
      onUpdateOrderStatus(orderId, targetStatus);
    }
    setDraggedOrderId(null);
  };

  const handleOpenLabel = (order: Order) => {
    setSelectedLabelOrder(order);
    setShowThermalModal(true);
  };

  // Export orders to JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(orders, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `envios-logiperu-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full max-w-[1840px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-8 py-3.5 sm:py-5 space-y-4">
      
      {/* Top Helper Banner: Quick Client Form Link (/pedidos) */}
      <div className={`px-4 py-2.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-all text-xs ${
        isDark 
          ? 'bg-blue-950/20 border-blue-500/20 text-blue-200' 
          : 'bg-blue-50/70 border-blue-200/80 text-blue-950'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span>Enlace para Clientes:</span>
          </span>
          <code className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold ${
            isDark ? 'bg-zinc-900 text-blue-300 border border-blue-500/30' : 'bg-white text-blue-900 border border-blue-200 shadow-2xs'
          }`}>
            {clientFormUrl}
          </code>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleCopyClientUrl}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs text-[11px] ${
              copiedClientUrl
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title="Copiar enlace para enviar por WhatsApp o Instagram"
          >
            {copiedClientUrl ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          {onSwitchToClient && (
            <button
              type="button"
              onClick={onSwitchToClient}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer text-[11px] border ${
                isDark 
                  ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' 
                  : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-100'
              }`}
              title="Abrir y probar formulario de cliente"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Formulario</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter, Search & Actions Bar */}
      <div className={`p-3 sm:p-3.5 rounded-2xl border mb-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 ${
        isDark ? 'bg-[#18181D] border-white/10' : 'bg-white border-zinc-200 shadow-2xs'
      }`}>
        
        {/* Left: Search & Courier Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-72 lg:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="kanban-search-input"
              type="text"
              placeholder="Buscar por cliente, DNI, teléfono o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white/30 ${
                isDark 
                  ? 'bg-[#111115] border-white/10 text-white placeholder-zinc-500' 
                  : 'bg-zinc-50 border-zinc-200 text-black placeholder-zinc-500'
              }`}
            />
          </div>

          {/* Courier Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar py-0.5">
            <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 pr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Courier:
            </span>

            <button
              id="filter-courier-todos"
              onClick={() => setCourierFilter('todos')}
              className={`px-3 py-1.5 rounded-xl font-black transition-all whitespace-nowrap cursor-pointer ${
                courierFilter === 'todos'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : isDark ? 'bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              Todos ({orders.length})
            </button>

            <button
              id="filter-courier-shalom"
              onClick={() => setCourierFilter('shalom')}
              className={`px-3 py-1.5 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                courierFilter === 'shalom'
                  ? 'bg-red-600 text-white shadow-xs'
                  : isDark ? 'bg-red-950/30 text-red-400 hover:bg-red-950/50' : 'bg-red-50 text-red-900 hover:bg-red-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Shalom
            </button>

            <button
              id="filter-courier-marvisur"
              onClick={() => setCourierFilter('marvisur')}
              className={`px-3 py-1.5 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                courierFilter === 'marvisur'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : isDark ? 'bg-blue-950/30 text-blue-400 hover:bg-blue-950/50' : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Marvisur
            </button>

            <button
              id="filter-courier-olva"
              onClick={() => setCourierFilter('olva')}
              className={`px-3 py-1.5 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                courierFilter === 'olva'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDark ? 'bg-amber-950/30 text-amber-400 hover:bg-amber-950/50' : 'bg-amber-50 text-amber-950 hover:bg-amber-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Olva
            </button>

            <button
              id="filter-courier-delivery"
              onClick={() => setCourierFilter('delivery_lima')}
              className={`px-3 py-1.5 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                courierFilter === 'delivery_lima'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark ? 'bg-blue-950/30 text-blue-400 hover:bg-blue-950/50' : 'bg-blue-50 text-blue-950 hover:bg-blue-100'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              Delivery Lima
            </button>

            <button
              id="filter-courier-tienda"
              onClick={() => setCourierFilter('tienda')}
              className={`px-3 py-1.5 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                courierFilter === 'tienda'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDark ? 'bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50' : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Tienda
            </button>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5 self-end lg:self-auto flex-wrap">
          {/* BOTÓN IMPRIMIR SELECCIONADOS */}
          {selectedForPrintIds.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-xl">
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                {selectedForPrintIds.length} selecc.
              </span>
              <button
                id="print-selected-orders-btn"
                type="button"
                onClick={() => {
                  const selectedOrders = orders.filter((o) => selectedForPrintIds.includes(o.id));
                  setBatchOrdersToPrint(selectedOrders);
                  setShowBatchThermalModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir ({selectedForPrintIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedForPrintIds([])}
                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Desmarcar
              </button>
            </div>
          )}

          {/* PAPELERA DE RECICLAJE */}
          <button
            id="open-trash-modal-btn"
            onClick={() => setShowTrashModal(true)}
            className={`p-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs relative ${
              trashOrders.length > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                : isDark 
                  ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Papelera de Reciclaje - Rescatar o eliminar pedidos"
          >
            <Trash2 className="w-4 h-4 stroke-[2.2]" />
            {trashOrders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {trashOrders.length}
              </span>
            )}
          </button>

          {/* GESTIONAR MÉTODOS Y LOCALES */}
          <button
            id="admin-manage-shipping-config-btn"
            onClick={() => setShowShippingConfigModal(true)}
            className={`p-2 rounded-xl border text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
              isDark 
                ? 'bg-zinc-900 border-white/10 text-zinc-200 hover:border-white/20' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Gestionar Envíos & Sucursales (Shalom / Olva / Delivery Lima / Tienda)"
          >
            <Settings2 className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* ESTADO BASE DE DATOS SUPABASE */}
          <button
            id="admin-supabase-status-btn"
            onClick={() => setShowDatabaseModal(true)}
            className={`p-2 rounded-xl border text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
              isDark 
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
            title="Base de Datos Supabase Cloud (PostgreSQL) - Sincronización en vivo"
          >
            <Database className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* EXPORTAR BASE DE DATOS */}
          <button
            id="export-orders-btn"
            onClick={handleExportJSON}
            className={`p-2 rounded-xl border text-xs font-black flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
              isDark 
                ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Exportar pedidos a archivo JSON"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* KANBAN BOARD 4 COLUMNS WITH HORIZONTAL SCROLL FOR FOLDABLE, HORIZONTAL & COMPACT SCREENS */}
      <div className="overflow-x-auto pb-4 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0 scroll-smooth touch-pan-x">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 landscape:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-4.5 xl:gap-5 items-start min-w-[290px] md:min-w-[700px] lg:min-w-[960px] landscape:min-w-[1050px] xl:min-w-0">
        {columns.map((col) => {
          const colOrders = getOrdersByStatus(col.id);
          const isSearching = searchTerm.trim().length > 0;
          const isEntregados = col.id === 'entregados';
          
          // Entregados displays only the last 10 orders visually, unless the user is searching
          const displayedOrders = (isEntregados && !isSearching) 
            ? colOrders.slice(0, 10) 
            : colOrders;
            
          const hiddenCount = (isEntregados && !isSearching && colOrders.length > 10) 
            ? colOrders.length - 10 
            : 0;

          return (
            <div
              key={col.id}
              id={`kanban-col-${col.id}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl border flex flex-col transition-all min-h-[500px] shadow-2xs ${
                isDark 
                  ? 'bg-[#15151A] border-white/[0.08]' 
                  : 'bg-zinc-100/70 border-zinc-200/90'
              }`}
            >
              
              {/* Column Header */}
              <div className={`p-3.5 border-b flex items-center justify-between gap-2 ${
                isDark ? 'bg-[#1A1A1F]/60 border-white/[0.07]' : 'bg-white border-zinc-200/80 shadow-2xs'
              } rounded-t-2xl`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex-shrink-0">
                    {col.icon}
                  </div>
                  <h3 className="font-black text-xs sm:text-sm tracking-tight truncate text-black dark:text-white">
                    {col.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Botón Impresión Masiva para Empacados (Icon-first / compact) */}
                  {col.id === 'empacados' && colOrders.length > 0 && (
                    <button
                      id="batch-print-packed-btn"
                      type="button"
                      onClick={() => {
                        setBatchOrdersToPrint(colOrders);
                        setShowBatchThermalModal(true);
                      }}
                      className="p-1.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title={`Imprimir ${colOrders.length} rótulos empacados`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{colOrders.length}</span>
                    </button>
                  )}

                  {/* Botón Histórico Modal para Entregados */}
                  {col.id === 'entregados' && colOrders.length > 0 && (
                    <button
                      id="view-all-delivered-history-btn"
                      type="button"
                      onClick={() => setShowDeliveredHistoryModal(true)}
                      className="p-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title="Ver tabla completa de historial de entregados"
                    >
                      <span>Historial</span>
                    </button>
                  )}

                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${col.bgBadge}`}>
                    {isEntregados && !isSearching && colOrders.length > 10
                      ? `10 de ${colOrders.length}`
                      : colOrders.length}
                  </span>
                </div>
              </div>

              {/* Column Body Cards */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-280px)]">
                {displayedOrders.length === 0 ? (
                  <div className="h-40 border border-dashed border-zinc-300/80 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 p-4 text-center">
                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-200">
                      {isSearching ? 'Ningún pedido coincide con la búsqueda' : 'Sin pedidos en esta etapa'}
                    </p>
                    <p className="text-[10px] text-zinc-700 dark:text-zinc-400 mt-0.5 font-bold">
                      {isSearching ? 'Prueba con otro término de búsqueda' : 'Arrastra una tarjeta aquí'}
                    </p>
                  </div>
                ) : (
                  displayedOrders.map((order) => {
                    const badge = getShippingTypeBadge(order.shippingType);
                    const prev = getPrevStatus(order.status);
                    const next = getNextStatus(order.status);

                    let locationPreview = '';
                    if (order.shippingType === 'shalom') {
                      locationPreview = order.agency?.name || 'Agencia Shalom';
                    } else if (order.shippingType === 'olva') {
                      locationPreview = order.agency ? order.agency.name : `Olva Domicilio (${order.deliveryDistrict})`;
                    } else if (order.shippingType === 'delivery_lima') {
                      locationPreview = `${order.deliveryDistrict}: ${order.deliveryAddress}`;
                    } else {
                      locationPreview = 'Retiro en Tienda CyberPlaza';
                    }

                    const waDirectUrl = getCustomerDirectWhatsAppUrl(order);
                    const displayPhone = order.customerPhone.replace(/\D/g, '').slice(-9);
                    const shippingStyle = getOrderShippingCardStyle(order.shippingType, isDark);
                    const paymentStyle = getOrderPaymentCardStyle(order, isDark);

                    return (
                      <div
                        key={order.id}
                        id={`order-card-${order.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order.id)}
                        className={`w-full max-w-full min-w-0 p-3.5 rounded-2xl border transition-all duration-150 shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing group overflow-hidden box-border ${
                          shippingStyle.cardClasses
                        }`}
                      >
                        {/* Top: Checkbox Selección, ID, Courier Badge & Payment Badge */}
                        <div className="flex items-center justify-between gap-1 mb-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedForPrintIds.includes(order.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedForPrintIds((prev) =>
                                  prev.includes(order.id)
                                    ? prev.filter((id) => id !== order.id)
                                    : [...prev, order.id]
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded text-amber-600 accent-amber-600 cursor-pointer flex-shrink-0"
                              title="Seleccionar para imprimir rótulo"
                            />
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-black/10 dark:bg-white/10 text-zinc-950 dark:text-zinc-100 border border-black/10 dark:border-white/10">
                              #{order.id}
                            </span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border truncate ${paymentStyle.paymentBadgeClass}`} title={paymentStyle.paymentLabel}>
                              {paymentStyle.paymentIcon} {order.shippingType === 'delivery_lima' && order.isCashOnDelivery ? 'Contraentrega' : (order.shippingType === 'tienda' ? 'Tienda' : 'Pagado')}
                            </span>
                          </div>

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border truncate max-w-[140px] ${
                            isDark ? badge.bgDark : badge.bgLight
                          } ${
                            isDark ? badge.textDark : badge.textLight
                          } ${
                            isDark ? badge.borderDark : badge.borderLight
                          }`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Customer Name & Phone (High Contrast Light Mode) */}
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-black text-sm text-zinc-950 dark:text-zinc-100 tracking-tight leading-snug break-words">
                            {order.customerName}
                          </h4>

                          <div className="flex items-center justify-between gap-1 text-xs min-w-0">
                            <span className="text-zinc-800 dark:text-zinc-400 font-mono font-black text-[11px] truncate">
                              {order.documentType}: {order.documentNumber}
                            </span>
                            
                            {/* Enlace Directo wa.me con Logo Oficial y número limpio */}
                            <a
                              id={`wame-card-link-${order.id}`}
                              href={waDirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black font-mono transition-all flex-shrink-0 group/wame ${
                                isDark 
                                  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/60' 
                                  : 'bg-white/80 text-emerald-950 border border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                              }`}
                              title={`Abrir WhatsApp directo con ${order.customerPhone}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img
                                src={WHATSAPP_ICON_URL}
                                alt="WhatsApp"
                                className="w-3.5 h-3.5 object-contain flex-shrink-0 group-hover/wame:scale-110 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <span>{displayPhone}</span>
                            </a>
                          </div>
                        </div>

                        {/* Detalle Económico Admin: Precio & Precio Transporte */}
                        <div 
                          className="mt-2 pt-1.5 border-t border-dashed border-black/10 dark:border-white/10 text-[10px] space-y-1.5 min-w-0" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            {/* 1. Precio (Monto Productos) - Antes de método de despacho */}
                            <div className="flex items-center gap-1">
                              <span className="font-black text-zinc-900 dark:text-zinc-200">Precio:</span>
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-black text-zinc-600 text-[10px]">S/</span>
                                <input
                                  type="number"
                                  step="0.50"
                                  placeholder="0.00"
                                  value={order.subtotalAmount !== undefined ? order.subtotalAmount : ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const num = parseFloat(val);
                                    const sub = !isNaN(num) ? num : undefined;
                                    const fee = order.shippingType === 'delivery_lima' ? (order.deliveryFee !== undefined ? order.deliveryFee : 15.00) : 0;
                                    const updated = {
                                      ...order,
                                      subtotalAmount: sub,
                                      totalAmount: sub !== undefined ? sub + fee : undefined,
                                      cashOnDeliveryAmount: order.isCashOnDelivery ? sub : order.cashOnDeliveryAmount
                                    };
                                    if (onUpdateOrder) onUpdateOrder(updated);
                                  }}
                                  className={`w-20 pl-5 pr-1 py-0.5 rounded-md font-black text-[11px] border ${
                                    isDark ? 'bg-[#15151A] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-black shadow-2xs'
                                  }`}
                                  title="Precio de los productos"
                                />
                              </div>
                            </div>

                            {/* 2. Precio Transporte (solo aplica a Delivery Lima, por defecto S/15.00, editable) */}
                            {order.shippingType === 'delivery_lima' && (
                              <div className="flex items-center gap-1">
                                <span className="font-black text-blue-900 dark:text-blue-300">P. Transp:</span>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-black text-blue-700 text-[10px]">S/</span>
                                  <input
                                    type="number"
                                    step="0.50"
                                    placeholder="15.00"
                                    value={order.deliveryFee !== undefined ? order.deliveryFee : 15.00}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const num = parseFloat(val);
                                      const fee = !isNaN(num) ? num : 0;
                                      const sub = order.subtotalAmount || 0;
                                      const updated = {
                                        ...order,
                                        deliveryFee: !isNaN(num) ? num : undefined,
                                        totalAmount: sub + fee
                                      };
                                      if (onUpdateOrder) onUpdateOrder(updated);
                                    }}
                                    className={`w-18 pl-5 pr-1 py-0.5 rounded-md font-black text-[11px] border ${
                                      isDark ? 'bg-[#15151A] border-blue-900/50 text-blue-300' : 'bg-white border-blue-300 text-blue-950 shadow-2xs'
                                    }`}
                                    title="Precio transporte Delivery Lima (por defecto S/15.00)"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Resumen Total */}
                          {(order.subtotalAmount !== undefined || (order.shippingType === 'delivery_lima')) && (
                            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
                              <span>Monto Total:</span>
                              <span className="font-black text-emerald-800 dark:text-emerald-300">
                                S/ {((order.subtotalAmount || 0) + (order.shippingType === 'delivery_lima' ? (order.deliveryFee !== undefined ? order.deliveryFee : 15.00) : 0)).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Delivery Lima: Cash on Delivery & Payment Method Configuration */}
                        {order.shippingType === 'delivery_lima' && (
                          <div className="mt-2 pt-1.5 border-t border-dashed border-black/10 dark:border-white/10 text-[11px] space-y-1.5 min-w-0">
                            {order.isCashOnDelivery ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                                  <span className="font-black text-amber-950 dark:text-amber-300 uppercase">
                                    💵 Contraentrega: S/ {(order.cashOnDeliveryAmount || order.subtotalAmount || 0).toFixed(2)}
                                  </span>
                                  {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
                                    <span className="font-bold text-zinc-700 dark:text-zinc-400">
                                      (Envío pagado)
                                    </span>
                                  )}
                                </div>

                                {/* 3 Payment Modalities for Admin Configuration */}
                                <div className="grid grid-cols-3 gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onUpdateOrder) onUpdateOrder({ ...order, paymentMethod: 'motorizado' });
                                    }}
                                    className={`py-1 px-1 rounded-lg text-[10px] font-black transition-all cursor-pointer truncate text-center ${
                                      (!order.paymentMethod || order.paymentMethod === 'motorizado')
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs'
                                        : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-300 hover:bg-white'
                                    }`}
                                    title="🛵 Al motorizado por Cobrar"
                                  >
                                    🛵 Cobrar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onUpdateOrder) onUpdateOrder({ ...order, paymentMethod: 'yape' });
                                    }}
                                    className={`py-1 px-1 rounded-lg text-[10px] font-black transition-all cursor-pointer truncate text-center ${
                                      order.paymentMethod === 'yape'
                                        ? 'bg-purple-700 text-white shadow-2xs'
                                        : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-300 hover:bg-white'
                                    }`}
                                    title="🟣 Yape (al 940339934)"
                                  >
                                    🟣 Yape
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onUpdateOrder) onUpdateOrder({ ...order, paymentMethod: 'transferencia' });
                                    }}
                                    className={`py-1 px-1 rounded-lg text-[10px] font-black transition-all cursor-pointer truncate text-center ${
                                      order.paymentMethod === 'transferencia'
                                        ? 'bg-blue-700 text-white shadow-2xs'
                                        : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-300 hover:bg-white'
                                    }`}
                                    title="🏦 Transferencia"
                                  >
                                    🏦 Transf.
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-400 border border-emerald-300 font-black text-[10px]">
                                💳 Pago Confirmado
                              </span>
                            )}
                          </div>
                        )}

                        {/* Location Preview (High Contrast) */}
                        <div className="mt-2 pt-1.5 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-950 dark:text-zinc-200 space-y-1 font-bold min-w-0">
                          <p className="flex items-start gap-1 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                            <span className="break-words font-black text-zinc-950 dark:text-zinc-200 min-w-0">{locationPreview}</span>
                          </p>

                          <p className="flex items-center gap-1 text-[10px] text-zinc-800 dark:text-zinc-400 font-bold">
                            <Calendar className="w-3 h-3 flex-shrink-0 text-zinc-600" />
                            <span>{order.shippingType === 'tienda' ? 'Entrega' : 'Despacho'}: {formatPeruvianDate(order.dispatchDate)}</span>
                          </p>

                          {order.itemsDescription && (
                            <p className="text-[10px] text-zinc-800 dark:text-zinc-300 break-words italic font-bold">
                              📦 {order.itemsDescription}
                            </p>
                          )}
                        </div>

                        {/* Campo Rápido N° de Guía / Remito */}
                        {(order.status === 'en_camino' || order.shippingType === 'shalom' || order.shippingType === 'olva' || order.trackingNumber) && (
                          <div className="mt-2 pt-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-1 min-w-0">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-black text-zinc-900 dark:text-zinc-300 uppercase tracking-tight">
                                N° GUÍA / REMITO:
                              </span>
                              {order.trackingNumber && (
                                <span className="font-mono font-black text-blue-700 dark:text-blue-400 truncate max-w-[130px]">
                                  {order.trackingNumber}
                                </span>
                              )}
                            </div>

                            <input
                              id={`tracking-input-${order.id}`}
                              type="text"
                              placeholder="Ej. 104-987654..."
                              value={order.trackingNumber || ''}
                              onChange={(e) => {
                                if (onUpdateOrder) {
                                  onUpdateOrder({ ...order, trackingNumber: e.target.value });
                                }
                              }}
                              className={`w-full min-w-0 px-2 py-1 rounded-lg border text-xs font-mono font-bold ${
                                isDark 
                                  ? 'bg-[#0F0F12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600' 
                                  : 'bg-white border-zinc-300 text-zinc-950 placeholder:text-zinc-500'
                              } focus:outline-none focus:border-blue-600 box-border`}
                              title="Ingresa el número de guía o remito de Shalom/Olva"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}

                        {/* Card Actions: Icon-only buttons with soft borders */}
                        <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-1 min-w-0">
                          
                          <div className="flex items-center gap-1">
                            {/* Label Print Trigger (Icon Only) */}
                            <button
                              id={`print-label-btn-${order.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLabel(order);
                              }}
                              className="p-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-600/15 dark:text-red-400 border border-red-200 dark:border-red-500/20 transition-colors cursor-pointer"
                              title="Rótulo"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Order Modal Trigger (Icon Only) */}
                            {onUpdateOrder && (
                              <button
                                id={`edit-order-btn-${order.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOrder(order);
                                  setShowEditModal(true);
                                }}
                                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                  isDark 
                                    ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                                }`}
                                title="Editar pedido"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Quick Stage Controls (Icon Only) */}
                          <div className="flex items-center gap-1">
                            {prev && (
                              <button
                                id={`move-prev-btn-${order.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateOrderStatus(order.id, prev);
                                }}
                                className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
                                title="Mover a etapa anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            )}

                            {next && (
                              <button
                                id={`move-next-btn-${order.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateOrderStatus(order.id, next);
                                }}
                                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 transition-colors cursor-pointer shadow-xs"
                                title="Avanzar etapa"
                              >
                                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            )}

                            <button
                              id={`delete-order-btn-${order.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteOrder(order.id);
                              }}
                              className="p-1.5 rounded-xl hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Mover a la papelera (puedes rescatarlo desde la Papelera)"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                            </button>
                          </div>

                        </div>

                      </div>
                    );
                  })
                )}

                {/* Notificación de pedidos archivados en la columna Entregados */}
                {hiddenCount > 0 && (
                  <div className={`p-3 rounded-xl border text-center space-y-2 ${
                    isDark 
                      ? 'bg-[#0F0F12] border-emerald-900/40 text-zinc-300' 
                      : 'bg-emerald-50/70 border-emerald-300 text-black'
                  }`}>
                    <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>+{hiddenCount} pedidos entregados archivados</span>
                    </div>
                    <p className="text-[11px] text-zinc-900 dark:text-zinc-400 leading-tight font-bold">
                      Mostrando los 10 más recientes para mantener la agilidad del tablero.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeliveredHistoryModal(true)}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      Ver Historial Completo ({colOrders.length})
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}
        </div>
      </div>

      {/* Delivered History Modal (Tabla completa de entregados) */}
      <DeliveredHistoryModal
        isOpen={showDeliveredHistoryModal}
        onClose={() => setShowDeliveredHistoryModal(false)}
        orders={orders}
        storeSettings={storeSettings}
        onOpenLabel={(order) => {
          setSelectedLabelOrder(order);
          setShowThermalModal(true);
        }}
        isDark={isDark}
      />

      {/* Thermal Label Modal */}
      <ThermalLabelModal
        order={selectedLabelOrder}
        storeSettings={storeSettings}
        isOpen={showThermalModal}
        onClose={() => {
          setShowThermalModal(false);
          setSelectedLabelOrder(null);
        }}
        isDark={isDark}
      />

      {/* Batch Thermal Labels Modal (Impresión Masiva de Rótulos) */}
      <BatchThermalLabelsModal
        orders={batchOrdersToPrint.length > 0 ? batchOrdersToPrint : orders.filter((o) => o.status === 'empacados')}
        storeSettings={storeSettings}
        isOpen={showBatchThermalModal}
        onClose={() => setShowBatchThermalModal(false)}
        isDark={isDark}
      />

      {/* Shipping Methods & Agency Localities Management Modal */}
      <ShippingConfigModal
        isOpen={showShippingConfigModal}
        onClose={() => setShowShippingConfigModal(false)}
        shippingConfig={shippingConfig}
        onUpdateShippingConfig={onUpdateShippingConfig}
        shalomAgencies={shalomAgencies}
        onUpdateShalomAgencies={onUpdateShalomAgencies}
        olvaAgencies={olvaAgencies}
        onUpdateOlvaAgencies={onUpdateOlvaAgencies}
        marvisurAgencies={marvisurAgencies}
        onUpdateMarvisurAgencies={onUpdateMarvisurAgencies}
        isDark={isDark}
      />

      {/* Modal para configurar Logo y Datos de la Empresa */}
      {onUpdateStoreSettings && (
        <LogoUploadModal
          isOpen={showLogoModal}
          onClose={() => setShowLogoModal(false)}
          storeSettings={storeSettings}
          onUpdateStoreSettings={onUpdateStoreSettings}
          isDark={isDark}
        />
      )}

      {/* Modal para Editar Pedido y Contraentrega */}
      {onUpdateOrder && (
        <OrderEditModal
          order={editingOrder}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingOrder(null);
          }}
          onSaveOrder={(updated) => {
            onUpdateOrder(updated);
          }}
          onDeleteOrder={(orderId) => {
            onDeleteOrder(orderId);
          }}
          shalomAgencies={shalomAgencies}
          olvaAgencies={olvaAgencies}
          marvisurAgencies={marvisurAgencies}
          isDark={isDark}
        />
      )}

      {/* Modal de Estado y Sincronización de Base de Datos Supabase */}
      <DatabaseStatusModal
        isOpen={showDatabaseModal}
        onClose={() => setShowDatabaseModal(false)}
        isDark={isDark}
        orders={orders}
      />

      {/* Modal de Papelera de Reciclaje */}
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        trashOrders={trashOrders}
        onRestoreOrder={(order) => {
          if (onRestoreOrder) onRestoreOrder(order);
        }}
        onDeletePermanent={(orderId) => {
          if (onDeleteOrderPermanent) onDeleteOrderPermanent(orderId);
        }}
        onEmptyTrash={() => {
          if (onEmptyTrash) onEmptyTrash();
        }}
        isDark={isDark}
      />

    </div>
  );
};
