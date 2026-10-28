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

  // Group by Kanban columns with exact stage colors & support backgrounds
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
      icon: <Inbox className="w-4 h-4 text-[#8A465F]" />,
      color: 'border-[#8A465F]/30',
      bgBadge: 'bg-[#F7EAF0] text-[#8A465F] border-[#8A465F]/20 dark:bg-[#8A465F]/20 dark:text-rose-200 dark:border-[#8A465F]/40',
    },
    {
      id: 'empacados',
      title: 'Empacados',
      icon: <Package className="w-4 h-4 text-[#B47B28]" />,
      color: 'border-[#B47B28]/30',
      bgBadge: 'bg-[#FBF1DD] text-[#B47B28] border-[#C69A55]/30 dark:bg-[#C69A55]/20 dark:text-amber-200 dark:border-[#C69A55]/40',
    },
    {
      id: 'en_camino',
      title: 'En Agencia / En Camino',
      icon: <Truck className="w-4 h-4 text-[#376C80]" />,
      color: 'border-[#376C80]/30',
      bgBadge: 'bg-[#E8F1F5] text-[#376C80] border-[#376C80]/30 dark:bg-[#376C80]/20 dark:text-sky-200 dark:border-[#376C80]/40',
    },
    {
      id: 'entregados',
      title: 'Entregados',
      icon: <CheckCircle2 className="w-4 h-4 text-[#39745F]" />,
      color: 'border-[#39745F]/30',
      bgBadge: 'bg-[#E8F3ED] text-[#39745F] border-[#39745F]/30 dark:bg-[#39745F]/20 dark:text-emerald-200 dark:border-[#39745F]/40',
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
    <div className="w-full max-w-[1840px] mx-auto px-2.5 sm:px-5 lg:px-6 xl:px-8 py-2.5 sm:py-4 space-y-2.5 sm:space-y-3.5">
      
      {/* Top Helper Banner: Quick Client Form Link (/pedidos) */}
      <div className={`px-3.5 py-2 sm:py-2.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-all text-xs ${
        isDark 
          ? 'bg-[#18161B] border-white/10 text-zinc-200' 
          : 'bg-white border-[#E5E0E3] text-[#29272B] shadow-2xs'
      }`}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-semibold text-[#625D63] dark:text-zinc-300 flex items-center gap-1.5 flex-shrink-0">
            <Link2 className="w-3.5 h-3.5 text-[#713B50] dark:text-[#C69A55] flex-shrink-0" />
            <span>Enlace para Clientes:</span>
          </span>
          <code className={`px-2.5 py-0.5 rounded-md font-mono text-[11px] font-medium truncate ${
            isDark ? 'bg-zinc-900 text-zinc-200 border border-white/10' : 'bg-[#FAF8F5] text-[#29272B] border border-[#E5E0E3]'
          }`}>
            {clientFormUrl}
          </code>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={handleCopyClientUrl}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs text-xs ${
              copiedClientUrl
                ? 'bg-[#39745F] text-white'
                : 'bg-[#713B50] hover:bg-[#5A2E3F] text-white'
            }`}
            title="Copiar enlace para enviar por WhatsApp o Instagram"
          >
            {copiedClientUrl ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2]" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          {onSwitchToClient && (
            <button
              type="button"
              onClick={onSwitchToClient}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer text-xs border ${
                isDark 
                  ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' 
                  : 'bg-white border-[#E5E0E3] text-[#29272B] hover:bg-[#FAF8F5]'
              }`}
              title="Abrir y probar formulario de cliente"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#625D63]" />
              <span>Abrir Formulario</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter, Search & Actions Bar */}
      <div className={`p-2.5 sm:p-3 rounded-xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 ${
        isDark ? 'bg-[#18161B] border-white/10' : 'bg-white border-[#E5E0E3] shadow-2xs'
      }`}>
        
        {/* Left: Search & Courier Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
          {/* Search */}
          <div className="relative w-full sm:w-64 lg:w-72 flex-shrink-0" title="Cliente, DNI, teléfono o código...">
            <Search className="w-4 h-4 text-[#625D63] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="kanban-search-input"
              type="text"
              placeholder="Buscar por cliente, DNI, guía..."
              title="Cliente, DNI, teléfono o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-[#111013] border-white/10 text-white placeholder-zinc-500 focus:border-[#713B50]' 
                  : 'bg-[#FAF8F5] border-[#E5E0E3] text-[#29272B] placeholder-[#625D63]/70 focus:border-[#713B50] focus:bg-white'
              }`}
            />
          </div>

          {/* Courier Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar py-0.5">
            <span className="text-[11px] font-semibold text-[#625D63] dark:text-zinc-400 pr-0.5 flex items-center gap-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Courier:
            </span>

            <button
              id="filter-courier-todos"
              onClick={() => setCourierFilter('todos')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer text-xs ${
                courierFilter === 'todos'
                  ? 'bg-[#713B50] text-white shadow-xs'
                  : isDark 
                    ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10' 
                    : 'bg-[#FAF8F5] text-[#625D63] hover:text-[#29272B] border border-[#E5E0E3] hover:bg-zinc-100'
              }`}
            >
              Todos ({orders.length})
            </button>

            <button
              id="filter-courier-shalom"
              onClick={() => setCourierFilter('shalom')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs ${
                courierFilter === 'shalom'
                  ? 'bg-[#713B50] text-white shadow-xs'
                  : isDark 
                    ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10' 
                    : 'bg-[#FAF8F5] text-[#625D63] hover:text-[#29272B] border border-[#E5E0E3] hover:bg-zinc-100'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${courierFilter === 'shalom' ? 'text-white' : 'text-[#713B50]'}`} />
              Shalom
            </button>

            <button
              id="filter-courier-marvisur"
              onClick={() => setCourierFilter('marvisur')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs ${
                courierFilter === 'marvisur'
                  ? 'bg-[#713B50] text-white shadow-xs'
                  : isDark 
                    ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10' 
                    : 'bg-[#FAF8F5] text-[#625D63] hover:text-[#29272B] border border-[#E5E0E3] hover:bg-zinc-100'
              }`}
            >
              <Truck className={`w-3.5 h-3.5 ${courierFilter === 'marvisur' ? 'text-white' : 'text-[#376C80]'}`} />
              Marvisur
            </button>

            <button
              id="filter-courier-olva"
              onClick={() => setCourierFilter('olva')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs ${
                courierFilter === 'olva'
                  ? 'bg-[#713B50] text-white shadow-xs'
                  : isDark 
                    ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10' 
                    : 'bg-[#FAF8F5] text-[#625D63] hover:text-[#29272B] border border-[#E5E0E3] hover:bg-zinc-100'
              }`}
            >
              <Truck className={`w-3.5 h-3.5 ${courierFilter === 'olva' ? 'text-white' : 'text-[#B47B28]'}`} />
              Olva
            </button>

            <button
              id="filter-courier-delivery"
              onClick={() => setCourierFilter('delivery_lima')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs ${
                courierFilter === 'delivery_lima'
                  ? 'bg-[#713B50] text-white shadow-xs'
                  : isDark 
                    ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10' 
                    : 'bg-[#FAF8F5] text-[#625D63] hover:text-[#29272B] border border-[#E5E0E3] hover:bg-zinc-100'
              }`}
            >
              <Bike className={`w-3.5 h-3.5 ${courierFilter === 'delivery_lima' ? 'text-white' : 'text-[#376C80]'}`} />
              Delivery Lima
            </button>

            <button
              id="filter-courier-tienda"
              onClick={() => setCourierFilter('tienda')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer text-xs ${
                courierFilter === 'tienda'
                  ? 'bg-[#713B50] text-white shadow-xs'
                  : isDark 
                    ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10' 
                    : 'bg-[#FAF8F5] text-[#625D63] hover:text-[#29272B] border border-[#E5E0E3] hover:bg-zinc-100'
              }`}
            >
              <Store className={`w-3.5 h-3.5 ${courierFilter === 'tienda' ? 'text-white' : 'text-[#39745F]'}`} />
              Tienda
            </button>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5 self-end lg:self-auto flex-wrap">
          {/* BOTÓN IMPRIMIR SELECCIONADOS */}
          {selectedForPrintIds.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FBF1DD] dark:bg-amber-950/40 border border-[#C69A55]/30 px-2.5 py-1 rounded-lg">
              <span className="text-xs font-semibold text-[#B47B28] dark:text-amber-300">
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
                className="px-2.5 py-1 rounded-md bg-[#713B50] hover:bg-[#5A2E3F] text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir ({selectedForPrintIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedForPrintIds([])}
                className="text-[11px] font-medium text-[#625D63] hover:text-[#29272B] dark:hover:text-zinc-200 cursor-pointer"
              >
                Desmarcar
              </button>
            </div>
          )}

          {/* PAPELERA DE RECICLAJE */}
          <button
            id="open-trash-modal-btn"
            onClick={() => setShowTrashModal(true)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs relative ${
              trashOrders.length > 0
                ? 'bg-[#F7EAF0] border-[#8A465F]/30 text-[#8A465F] dark:bg-rose-950/40 dark:text-rose-300'
                : isDark 
                  ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800' 
                  : 'bg-white border-[#E5E0E3] text-[#625D63] hover:text-[#29272B] hover:bg-[#FAF8F5]'
            }`}
            title="Papelera de Reciclaje - Rescatar o eliminar pedidos"
          >
            <Trash2 className="w-4 h-4 stroke-[2]" />
            {trashOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#8A465F] text-white text-[10px] font-bold">
                {trashOrders.length}
              </span>
            )}
          </button>

          {/* GESTIONAR MÉTODOS Y LOCALES */}
          <button
            id="admin-manage-shipping-config-btn"
            onClick={() => setShowShippingConfigModal(true)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
              isDark 
                ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white' 
                : 'bg-white border-[#E5E0E3] text-[#625D63] hover:text-[#29272B] hover:bg-[#FAF8F5]'
            }`}
            title="Gestionar Envíos & Sucursales (Shalom / Olva / Delivery Lima / Tienda)"
          >
            <Settings2 className="w-4 h-4 stroke-[2]" />
          </button>

          {/* ESTADO BASE DE DATOS SUPABASE */}
          <button
            id="admin-supabase-status-btn"
            onClick={() => setShowDatabaseModal(true)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
              isDark 
                ? 'bg-zinc-900 border-white/10 text-[#477568] hover:bg-zinc-800' 
                : 'bg-white border-[#E5E0E3] text-[#39745F] hover:bg-[#E8F3ED]'
            }`}
            title="Base de Datos Supabase Cloud (PostgreSQL) - Sincronización en vivo"
          >
            <Database className="w-4 h-4 stroke-[2]" />
          </button>

          {/* EXPORTAR BASE DE DATOS */}
          <button
            id="export-orders-btn"
            onClick={handleExportJSON}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
              isDark 
                ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white' 
                : 'bg-white border-[#E5E0E3] text-[#625D63] hover:text-[#29272B] hover:bg-[#FAF8F5]'
            }`}
            title="Exportar pedidos a archivo JSON"
          >
            <Download className="w-4 h-4 stroke-[2]" />
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
                  ? 'bg-[#151418] border-white/10' 
                  : 'bg-[#FAF8F5]/80 border-[#E5E0E3]'
              }`}
            >
              
              {/* Column Header */}
              <div className={`p-3.5 border-b flex items-center justify-between gap-2 ${
                isDark ? 'bg-[#1B191E] border-white/10' : 'bg-white border-[#E5E0E3]'
              } rounded-t-2xl`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                    col.id === 'nuevos' ? 'bg-[#F7EAF0]' :
                    col.id === 'empacados' ? 'bg-[#FBF1DD]' :
                    col.id === 'en_camino' ? 'bg-[#E8F1F5]' :
                    'bg-[#E8F3ED]'
                  }`}>
                    {col.icon}
                  </div>
                  <h3 className="font-semibold text-sm tracking-tight truncate text-[#29272B] dark:text-white">
                    {col.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Botón Impresión Masiva para Empacados */}
                  {col.id === 'empacados' && colOrders.length > 0 && (
                    <button
                      id="batch-print-packed-btn"
                      type="button"
                      onClick={() => {
                        setBatchOrdersToPrint(colOrders);
                        setShowBatchThermalModal(true);
                      }}
                      className="p-1 px-2 rounded-lg bg-[#713B50] hover:bg-[#5A2E3F] text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
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
                      className="p-1 px-2.5 rounded-lg bg-[#39745F] hover:bg-[#2F5F4E] text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title="Ver tabla completa de historial de entregados"
                    >
                      <span>Historial</span>
                    </button>
                  )}

                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${col.bgBadge}`}>
                    {isEntregados && !isSearching && colOrders.length > 10
                      ? `10 de ${colOrders.length}`
                      : colOrders.length}
                  </span>
                </div>
              </div>

              {/* Column Body Cards */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-280px)]">
                {displayedOrders.length === 0 ? (
                  <div className="h-44 border border-dashed border-[#E5E0E3] dark:border-white/10 rounded-xl flex flex-col items-center justify-center text-[#625D63] dark:text-zinc-400 p-4 text-center bg-white/40 dark:bg-zinc-900/20">
                    <div className="p-2 rounded-full bg-[#FAF8F5] dark:bg-zinc-800 text-[#625D63] dark:text-zinc-400 mb-2">
                      <Inbox className="w-5 h-5 opacity-60" />
                    </div>
                    <p className="text-xs font-semibold text-[#29272B] dark:text-zinc-200">
                      {isSearching ? 'Ningún pedido coincide con la búsqueda' : 'Sin pedidos en esta etapa'}
                    </p>
                    <p className="text-[11px] text-[#625D63] dark:text-zinc-400 mt-0.5 font-normal">
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
                    const paymentStyle = getOrderPaymentCardStyle(order, isDark);

                    return (
                      <div
                        key={order.id}
                        id={`order-card-${order.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order.id)}
                        className="w-full max-w-full min-w-0 p-3.5 rounded-xl border transition-all duration-150 shadow-2xs hover:shadow-xs cursor-grab active:cursor-grabbing group overflow-hidden box-border bg-white dark:bg-[#1E1C21] border-[#E5E0E3] dark:border-white/10 hover:border-[#713B50]/40 dark:hover:border-white/20"
                      >
                        {/* Top: Checkbox Selección, ID, Payment Badge & Courier Badge */}
                        <div className="flex items-center justify-between gap-1.5 mb-2.5 min-w-0 flex-nowrap">
                          <div className="flex items-center gap-1.5 min-w-0 flex-nowrap flex-1 overflow-hidden">
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
                              className="w-3.5 h-3.5 rounded text-[#713B50] accent-[#713B50] cursor-pointer flex-shrink-0"
                              title="Seleccionar para imprimir rótulo"
                            />
                            <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-md bg-[#FAF8F5] dark:bg-zinc-800 text-[#29272B] dark:text-zinc-100 border border-[#E5E0E3] dark:border-zinc-700 whitespace-nowrap flex-shrink-0 leading-none select-all">
                              #{order.id}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap flex-shrink-0 leading-none truncate ${paymentStyle.paymentBadgeClass}`} title={paymentStyle.paymentLabel}>
                              {paymentStyle.paymentIcon} {order.shippingType === 'delivery_lima' && order.isCashOnDelivery ? 'Contraentrega' : (order.shippingType === 'tienda' ? 'Tienda' : 'Pagado')}
                            </span>
                          </div>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap flex-shrink-0 leading-none truncate ${
                            isDark ? badge.bgDark : badge.bgLight
                          } ${
                            isDark ? badge.textDark : badge.textLight
                          } ${
                            isDark ? badge.borderDark : badge.borderLight
                          }`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Customer Name (15-16px, dark text, semibold) & DNI / WhatsApp */}
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-semibold text-[15px] sm:text-base text-[#29272B] dark:text-white tracking-tight leading-snug break-words">
                            {order.customerName}
                          </h4>

                          <div className="flex items-center justify-between gap-1 text-xs min-w-0">
                            <span className="text-[#625D63] dark:text-zinc-400 font-mono text-[11px] truncate">
                              {order.documentType}: {order.documentNumber}
                            </span>
                            
                            {/* Enlace Directo wa.me con Logo Oficial */}
                            <a
                              id={`wame-card-link-${order.id}`}
                              href={waDirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E8F3ED] text-[#39745F] dark:bg-emerald-950/40 dark:text-emerald-300 border border-[#39745F]/30 hover:bg-[#D4EADE] transition-colors flex-shrink-0 group/wame"
                              title={`Abrir WhatsApp directo con ${order.customerPhone}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img
                                src={WHATSAPP_ICON_URL}
                                alt="WhatsApp"
                                className="w-3.5 h-3.5 object-contain flex-shrink-0 group-hover/wame:scale-110 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <span className="font-mono whitespace-nowrap">{displayPhone}</span>
                            </a>
                          </div>
                        </div>

                        {/* Detalle Económico Admin: Precio & Precio Transporte */}
                        <div 
                          className="mt-2.5 pt-2 border-t border-[#E5E0E3] dark:border-white/10 text-xs space-y-1.5 min-w-0" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {/* 1. Precio (Monto Productos) */}
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#625D63] dark:text-zinc-300">Precio:</span>
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-semibold text-[#625D63] text-[10px]">S/</span>
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
                                  className="w-20 pl-5 pr-1.5 py-0.5 rounded-md text-xs font-semibold bg-white dark:bg-zinc-900 border border-[#E5E0E3] dark:border-zinc-700 text-[#29272B] dark:text-white focus:outline-none focus:border-[#713B50]"
                                  title="Precio de los productos"
                                />
                              </div>
                            </div>

                            {/* 2. Precio Transporte (solo aplica a Delivery Lima) */}
                            {order.shippingType === 'delivery_lima' && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-[#376C80]">P. Transp:</span>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-semibold text-[#376C80] text-[10px]">S/</span>
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
                                    className="w-18 pl-5 pr-1.5 py-0.5 rounded-md text-xs font-semibold bg-white dark:bg-zinc-900 border border-[#E5E0E3] dark:border-zinc-700 text-[#376C80] dark:text-sky-300 focus:outline-none focus:border-[#376C80]"
                                    title="Precio transporte Delivery Lima (por defecto S/15.00)"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Resumen Total: fondo neutro suave */}
                          {(order.subtotalAmount !== undefined || (order.shippingType === 'delivery_lima')) && (
                            <div className="flex items-center justify-between text-xs font-semibold text-[#29272B] dark:text-zinc-200 bg-[#FAF8F5] dark:bg-zinc-800/60 border border-[#E5E0E3] dark:border-white/10 px-2.5 py-1 rounded-md">
                              <span className="text-[#625D63] dark:text-zinc-400 font-normal">Monto Total:</span>
                              <span className="font-bold text-[#39745F] dark:text-emerald-400">
                                S/ {((order.subtotalAmount || 0) + (order.shippingType === 'delivery_lima' ? (order.deliveryFee !== undefined ? order.deliveryFee : 15.00) : 0)).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Delivery Lima: Cash on Delivery & Payment Method Configuration */}
                        {order.shippingType === 'delivery_lima' && (
                          <div className="mt-2.5 pt-2 border-t border-dashed border-[#E5E0E3] dark:border-white/10 text-xs space-y-1.5 min-w-0">
                            {order.isCashOnDelivery ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1 flex-wrap text-[11px]">
                                  <span className="font-semibold text-[#713B50] dark:text-[#C69A55]">
                                    💵 Contraentrega: S/ {(order.cashOnDeliveryAmount || order.subtotalAmount || 0).toFixed(2)}
                                  </span>
                                  {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
                                    <span className="text-[#625D63] dark:text-zinc-400 text-[10px]">
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
                                    className={`py-1 px-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer truncate text-center ${
                                      (!order.paymentMethod || order.paymentMethod === 'motorizado')
                                        ? 'bg-[#713B50] text-white shadow-2xs'
                                        : 'bg-[#FAF8F5] dark:bg-zinc-800 border border-[#E5E0E3] dark:border-zinc-700 text-[#625D63] dark:text-zinc-300 hover:text-[#29272B]'
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
                                    className={`py-1 px-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer truncate text-center ${
                                      order.paymentMethod === 'yape'
                                        ? 'bg-purple-700 text-white shadow-2xs'
                                        : 'bg-[#FAF8F5] dark:bg-zinc-800 border border-[#E5E0E3] dark:border-zinc-700 text-[#625D63] dark:text-zinc-300 hover:text-[#29272B]'
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
                                    className={`py-1 px-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer truncate text-center ${
                                      order.paymentMethod === 'transferencia'
                                        ? 'bg-[#376C80] text-white shadow-2xs'
                                        : 'bg-[#FAF8F5] dark:bg-zinc-800 border border-[#E5E0E3] dark:border-zinc-700 text-[#625D63] dark:text-zinc-300 hover:text-[#29272B]'
                                    }`}
                                    title="🏦 Transferencia"
                                  >
                                    🏦 Transf.
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E8F3ED] text-[#39745F] dark:bg-emerald-950/40 dark:text-emerald-300 border border-[#39745F]/30 text-[10px] font-semibold">
                                💳 Pago Confirmado
                              </span>
                            )}
                          </div>
                        )}

                        {/* Location Preview (9.4) */}
                        <div className="mt-2.5 pt-2 border-t border-[#E5E0E3] dark:border-white/10 text-xs text-[#29272B] dark:text-zinc-200 space-y-1 min-w-0">
                          <p className="flex items-start gap-1.5 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-[#713B50] dark:text-[#C69A55] flex-shrink-0 mt-0.5" />
                            <span className="break-words font-medium text-[#29272B] dark:text-zinc-100 min-w-0">{locationPreview}</span>
                          </p>

                          <p className="flex items-center gap-1.5 text-[11px] text-[#625D63] dark:text-zinc-400">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>{order.shippingType === 'tienda' ? 'Entrega' : 'Despacho'}: {formatPeruvianDate(order.dispatchDate)}</span>
                          </p>

                          {order.itemsDescription && (
                            <p className="text-[11px] text-[#625D63] dark:text-zinc-400 break-words italic">
                              📦 {order.itemsDescription}
                            </p>
                          )}
                        </div>

                        {/* Campo Rápido N° de Guía / Remito (9.5) */}
                        {(order.status === 'en_camino' || order.shippingType === 'shalom' || order.shippingType === 'olva' || order.trackingNumber) && (
                          <div className="mt-2.5 pt-2 border-t border-dashed border-[#E5E0E3] dark:border-white/10 space-y-1 min-w-0">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#625D63] dark:text-zinc-400 uppercase tracking-tight">
                                N° Guía / Remito:
                              </span>
                              {order.trackingNumber && (
                                <span className="font-mono font-medium text-[#376C80] dark:text-sky-400 truncate max-w-[130px]">
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
                              className="w-full min-w-0 px-2.5 py-1.5 rounded-lg border border-[#E5E0E3] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#29272B] dark:text-white placeholder-[#625D63]/60 text-xs font-mono focus:outline-none focus:border-[#713B50]"
                              title="Ingresa el número de guía o remito de Shalom/Olva"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}

                        {/* Card Actions: Uniform buttons (9.6) */}
                        <div className="mt-2.5 pt-2 border-t border-[#E5E0E3] dark:border-white/10 flex items-center justify-between gap-1.5 min-w-0">
                          
                          <div className="flex items-center gap-1.5">
                            {/* Label Print Trigger */}
                            <button
                              id={`print-label-btn-${order.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLabel(order);
                              }}
                              className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F7EAF0] text-[#713B50] dark:bg-zinc-800 dark:text-rose-300 border border-[#E5E0E3] dark:border-zinc-700 transition-colors cursor-pointer"
                              title="Imprimir Rótulo"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Order Modal Trigger */}
                            {onUpdateOrder && (
                              <button
                                id={`edit-order-btn-${order.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOrder(order);
                                  setShowEditModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-zinc-100 text-[#625D63] hover:text-[#29272B] dark:bg-zinc-800 dark:text-zinc-300 border border-[#E5E0E3] dark:border-zinc-700 transition-colors cursor-pointer"
                                title="Editar pedido"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Quick Stage Controls */}
                          <div className="flex items-center gap-1.5">
                            {prev && (
                              <button
                                id={`move-prev-btn-${order.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateOrderStatus(order.id, prev);
                                }}
                                className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#625D63] hover:text-[#29272B] dark:text-zinc-200 border border-[#E5E0E3] dark:border-zinc-700 transition-colors cursor-pointer"
                                title="Mover a etapa anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
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
                                className="p-1.5 rounded-lg bg-[#713B50] hover:bg-[#5A2E3F] text-white transition-colors cursor-pointer shadow-2xs"
                                title="Avanzar etapa"
                              >
                                <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
                              </button>
                            )}

                            <button
                              id={`delete-order-btn-${order.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteOrder(order.id);
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Mover a la papelera (puedes rescatarlo desde la Papelera)"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
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
