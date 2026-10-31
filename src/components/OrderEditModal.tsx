import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit3, 
  Save, 
  Trash2,
  User, 
  Phone, 
  MapPin, 
  Building2, 
  Truck, 
  Bike, 
  Store, 
  Calendar, 
  FileText, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Agency, Order, ShippingType } from '../types';
import { LIMA_DISTRICTS } from '../data/agencies';

interface OrderEditModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveOrder: (updatedOrder: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
  shalomAgencies: Agency[];
  olvaAgencies: Agency[];
  marvisurAgencies?: Agency[];
  isDark: boolean;
}

export const OrderEditModal: React.FC<OrderEditModalProps> = ({
  order,
  isOpen,
  onClose,
  onSaveOrder,
  onDeleteOrder,
  shalomAgencies,
  olvaAgencies,
  marvisurAgencies = [],
  isDark,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [documentType, setDocumentType] = useState<'DNI' | 'CE'>('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [shippingType, setShippingType] = useState<ShippingType>('shalom');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDistrict, setDeliveryDistrict] = useState(LIMA_DISTRICTS[0]);
  const [deliveryReference, setDeliveryReference] = useState('');
  const [selectedShalomId, setSelectedShalomId] = useState('');
  const [selectedMarvisurId, setSelectedMarvisurId] = useState('');
  const [selectedOlvaId, setSelectedOlvaId] = useState('');
  const [subtotalAmount, setSubtotalAmount] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [isCashOnDelivery, setIsCashOnDelivery] = useState(false);
  const [cashOnDeliveryAmount, setCashOnDeliveryAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'motorizado' | 'yape' | 'transferencia'>('motorizado');
  const [dispatchDate, setDispatchDate] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [itemsDescription, setItemsDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setDocumentType(order.documentType || 'DNI');
      setDocumentNumber(order.documentNumber || '');
      setShippingType(order.shippingType || 'shalom');
      setDeliveryAddress(order.deliveryAddress || '');
      setDeliveryDistrict(order.deliveryDistrict || LIMA_DISTRICTS[0]);
      setDeliveryReference(order.deliveryReference || '');
      setSelectedShalomId(order.agency?.id || shalomAgencies[0]?.id || '');
      setSelectedMarvisurId(order.agency?.id || marvisurAgencies[0]?.id || '');
      setSelectedOlvaId(order.agency?.id || olvaAgencies[0]?.id || '');
      
      const sub = order.subtotalAmount !== undefined ? String(order.subtotalAmount) : '';
      const fee = order.shippingType === 'delivery_lima'
        ? (order.deliveryFee !== undefined ? String(order.deliveryFee) : '15.00')
        : (order.deliveryFee !== undefined ? String(order.deliveryFee) : '');
      const tot = order.totalAmount !== undefined ? String(order.totalAmount) : '';
      const cod = order.cashOnDeliveryAmount !== undefined ? String(order.cashOnDeliveryAmount) : sub;

      setSubtotalAmount(sub);
      setDeliveryFee(fee);
      setTotalAmount(tot || (sub || fee ? String(((parseFloat(sub) || 0) + (parseFloat(fee) || 0)).toFixed(2)) : ''));
      setIsCashOnDelivery(!!order.isCashOnDelivery);
      setCashOnDeliveryAmount(cod);
      setPaymentMethod(order.paymentMethod || 'motorizado');
      setDispatchDate(order.dispatchDate || '');
      setTrackingNumber(order.trackingNumber || '');
      setItemsDescription(order.itemsDescription || 'Rutina personalizada');
      setNotes(order.notes || '');
      setError(null);
    }
  }, [order, shalomAgencies, olvaAgencies, marvisurAgencies]);

  // Handler cuando cambia el Monto a Pagar / Precio
  const handleSubtotalChange = (val: string) => {
    setSubtotalAmount(val);
    if (isCashOnDelivery) {
      setCashOnDeliveryAmount(val);
    }
    const numSub = parseFloat(val) || 0;
    const numFee = parseFloat(deliveryFee) || 0;
    if (val || deliveryFee) {
      setTotalAmount((numSub + numFee).toFixed(2));
    } else {
      setTotalAmount('');
    }
  };

  // Handler cuando cambia el Método de Despacho
  const handleShippingTypeChange = (type: ShippingType) => {
    setShippingType(type);
    if (type === 'delivery_lima') {
      const feeToSet = deliveryFee && deliveryFee !== '0' && deliveryFee !== '0.00' ? deliveryFee : '15.00';
      setDeliveryFee(feeToSet);
      const numSub = parseFloat(subtotalAmount) || 0;
      const numFee = parseFloat(feeToSet) || 0;
      setTotalAmount((numSub + numFee).toFixed(2));
    } else {
      setDeliveryFee('');
      const numSub = parseFloat(subtotalAmount) || 0;
      setTotalAmount(subtotalAmount ? numSub.toFixed(2) : '');
    }
  };

  // Handler cuando cambia el Precio Transporte (Delivery Lima)
  const handleDeliveryFeeChange = (val: string) => {
    setDeliveryFee(val);
    const numSub = parseFloat(subtotalAmount) || 0;
    const numFee = parseFloat(val) || 0;
    if (subtotalAmount || val) {
      setTotalAmount((numSub + numFee).toFixed(2));
    } else {
      setTotalAmount('');
    }
  };

  // Handler cuando se activa/desactiva Contraentrega
  const handleToggleContraentrega = (checked: boolean) => {
    setIsCashOnDelivery(checked);
    if (checked && (!cashOnDeliveryAmount || cashOnDeliveryAmount === '0')) {
      setCashOnDeliveryAmount(subtotalAmount);
    }
  };

  if (!isOpen || !order) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = new Set<string>();
    if (!customerName.trim()) errs.add('customerName');
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 9) errs.add('customerPhone');
    if (!documentNumber.trim()) errs.add('documentNumber');
    if (!dispatchDate.trim()) errs.add('dispatchDate');
    if (!subtotalAmount.trim()) errs.add('subtotalAmount');
    if (shippingType === 'shalom' && !selectedShalomId) errs.add('shalomAgency');
    if (shippingType === 'marvisur' && !selectedMarvisurId) errs.add('marvisurAgency');
    if (shippingType === 'olva' && !selectedOlvaId && !deliveryAddress.trim()) errs.add('olvaAgency');
    if (shippingType === 'olva' && deliveryAddress.trim() && !deliveryAddress.trim()) errs.add('deliveryAddress');
    if (shippingType === 'delivery_lima') {
      if (!deliveryAddress.trim()) errs.add('deliveryAddress');
      if (!deliveryDistrict) errs.add('deliveryDistrict');
    }
    if (errs.size > 0) {
      setFieldErrors(errs);
      setError('Completa los campos obligatorios marcados en rojo');
      return;
    }
    setFieldErrors(new Set());
    setError(null);
    const numSub = parseFloat(subtotalAmount);
    const numFee = parseFloat(deliveryFee);
    const numTot = parseFloat(totalAmount);
    const numCod = parseFloat(cashOnDeliveryAmount);

    const updated: Order = {
      ...order,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      documentType,
      documentNumber: documentNumber.trim(),
      shippingType,
      dispatchDate: dispatchDate || order.dispatchDate,
      trackingNumber: trackingNumber.trim() || undefined,
      itemsDescription: itemsDescription.trim() || 'Rutina personalizada',
      notes: notes.trim() || undefined,
      subtotalAmount: !isNaN(numSub) ? numSub : undefined,
      deliveryFee: !isNaN(numFee) ? numFee : undefined,
      totalAmount: !isNaN(numTot) ? numTot : (!isNaN(numSub) || !isNaN(numFee) ? (numSub || 0) + (numFee || 0) : undefined),
      isCashOnDelivery: isCashOnDelivery,
      cashOnDeliveryAmount: isCashOnDelivery 
        ? (!isNaN(numCod) ? numCod : (!isNaN(numSub) ? numSub : undefined))
        : undefined,
      paymentMethod: isCashOnDelivery ? paymentMethod : undefined,
    };

    if (shippingType === 'shalom') {
      const ag = shalomAgencies.find((a) => a.id === selectedShalomId) || shalomAgencies[0];
      updated.agency = ag;
      updated.deliveryAddress = undefined;
      updated.deliveryDistrict = undefined;
      updated.deliveryReference = undefined;
    } else if (shippingType === 'marvisur') {
      const ag = marvisurAgencies.find((a) => a.id === selectedMarvisurId) || marvisurAgencies[0];
      updated.agency = ag;
      updated.deliveryAddress = undefined;
      updated.deliveryDistrict = undefined;
      updated.deliveryReference = undefined;
    } else if (shippingType === 'olva') {
      const ag = olvaAgencies.find((a) => a.id === selectedOlvaId);
      if (ag) {
        updated.agency = ag;
      }
      updated.deliveryAddress = deliveryAddress.trim() || undefined;
      updated.deliveryDistrict = deliveryDistrict || undefined;
      updated.deliveryReference = deliveryReference.trim() || undefined;
    } else if (shippingType === 'delivery_lima') {
      updated.agency = undefined;
      updated.deliveryAddress = deliveryAddress.trim();
      updated.deliveryDistrict = deliveryDistrict;
      updated.deliveryReference = deliveryReference.trim();
    } else if (shippingType === 'tienda') {
      updated.agency = undefined;
      updated.deliveryAddress = undefined;
      updated.deliveryDistrict = undefined;
      updated.deliveryReference = undefined;
    }

    onSaveOrder(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl transition-all duration-200 my-auto max-h-[90vh] flex flex-col ${
        isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-[#E2E8F0] text-[#111827]'
      }`}>
        
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600/15 text-red-500 border border-red-500/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">
                  Editar Pedido #{order.id}
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                  {order.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Corrige o actualiza destinatario, courier, dirección y modalidad de pago
              </p>
            </div>
          </div>

          <button
            id="close-order-edit-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="px-5 py-2.5 bg-red-500/15 border-b border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          
          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-black text-black dark:text-zinc-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-red-600" />
                <span>Nombre Completo del Cliente *</span>
              </label>
              <input
                type="text"
                value={customerName}
                   style={fieldErrors.has('customerName') ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' } : undefined}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                }`}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-black text-black dark:text-zinc-300 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Celular WhatsApp (9 dígitos)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-black dark:text-zinc-400">+51</span>
                <input
                  type="tel"
                  maxLength={9}
                  value={customerPhone}
                   style={fieldErrors.has('customerPhone') ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' } : undefined}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className={`w-full pl-12 pr-3 py-2 rounded-xl border-2 font-mono font-bold ${
                    isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Document & Dispatch Date */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-4 space-y-1">
              <label className="font-black text-black dark:text-zinc-300">Tipo Doc. *</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as 'DNI' | 'CE')}
                className={`w-full px-3 py-2 rounded-xl border-2 font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                }`}
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carné Extranjería (CE)</option>
              </select>
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="font-black text-black dark:text-zinc-300">Número de Documento</label>
              <input
                type="text"
                value={documentNumber}
                   style={fieldErrors.has('documentNumber') ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' } : undefined}
                onChange={(e) => setDocumentNumber(e.target.value.trim())}
                className={`w-full px-3 py-2 rounded-xl border-2 font-mono font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                }`}
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="font-black text-black dark:text-zinc-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{shippingType === 'tienda' ? 'Fecha Entrega' : 'Fecha Despacho'} *</span>
              </label>
              <input
                type="date"
                value={dispatchDate}
                   style={fieldErrors.has('dispatchDate') ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' } : undefined}
                onChange={(e) => setDispatchDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 font-mono font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                }`}
              />
            </div>
          </div>

          {/* 1. PRECIO (Antes de seleccionar método de despacho) */}
          <div className={`p-3.5 rounded-2xl border-2 ${
            isDark ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0] shadow-2xs'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="font-black text-black dark:text-zinc-100 text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span title="sin incluir transporte">Precio de venta: *</span>
                </label>
                <span className="text-[10px] font-bold text-[#475569]">
                  sin incluir transporte
                </span>
              </div>
              <div className="relative w-36 flex-shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-700 dark:text-zinc-300">S/</span>
                <input
                  type="number"
                  step="0.10"
                  placeholder="0.00"
                  value={subtotalAmount}
                   style={fieldErrors.has('subtotalAmount') ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' } : undefined}
                  onChange={(e) => handleSubtotalChange(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm font-black border-2 ${
                    isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black focus:border-[#6366F1]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Shipping Method Selector */}
          <div className="space-y-1 pt-1">
            <label className="font-black text-black dark:text-zinc-300">Método de Despacho</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleShippingTypeChange('shalom')}
                className={`p-2.5 rounded-xl border-2 font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  shippingType === 'shalom'
                    ? 'bg-[#6366F1]/20 border-[#6366F1] text-[#6366F1] dark:text-[#818CF8] shadow-xs'
                    : isDark ? 'bg-[#1E293B] border-[#334155] text-zinc-400' : 'bg-white border-zinc-300 text-black hover:border-black'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="text-xs">Shalom</span>
              </button>

              <button
                type="button"
                onClick={() => handleShippingTypeChange('marvisur')}
                className={`p-2.5 rounded-xl border-2 font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  shippingType === 'marvisur'
                    ? 'bg-[#06B6D4]/20 border-[#06B6D4] text-[#06B6D4] dark:text-[#22D3EE] shadow-xs'
                    : isDark ? 'bg-[#1E293B] border-[#334155] text-zinc-400' : 'bg-white border-zinc-300 text-black hover:border-black'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span className="text-xs">Marvisur</span>
              </button>

              <button
                type="button"
                onClick={() => handleShippingTypeChange('olva')}
                className={`p-2.5 rounded-xl border-2 font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  shippingType === 'olva'
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] dark:text-[#FBBF24] shadow-xs'
                    : isDark ? 'bg-[#1E293B] border-[#334155] text-zinc-400' : 'bg-white border-zinc-300 text-black hover:border-black'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span className="text-xs">Olva</span>
              </button>

              <button
                type="button"
                onClick={() => handleShippingTypeChange('delivery_lima')}
                className={`p-2.5 rounded-xl border-2 font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  shippingType === 'delivery_lima'
                    ? 'bg-[#06B6D4]/20 border-[#06B6D4] text-[#06B6D4] dark:text-[#22D3EE] shadow-xs'
                    : isDark ? 'bg-[#1E293B] border-[#334155] text-zinc-400' : 'bg-white border-zinc-300 text-black hover:border-black'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span className="text-xs">Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => handleShippingTypeChange('tienda')}
                className={`p-2.5 rounded-xl border-2 font-black flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  shippingType === 'tienda'
                    ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981] dark:text-[#34D399] shadow-xs'
                    : isDark ? 'bg-[#1E293B] border-[#334155] text-zinc-400' : 'bg-white border-zinc-300 text-black hover:border-black'
                }`}
              >
                <Store className="w-4 h-4" />
                <span className="text-xs">Tienda</span>
              </button>
            </div>
          </div>

          {/* Conditional Shipping Destination Details */}
          {shippingType === 'shalom' && (
            <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${
              isDark ? 'bg-red-950/15 border-red-900/30' : 'bg-red-50 border-red-300'
            }`}>
              <label className="font-black text-red-900 dark:text-red-500 text-xs">Agencia Shalom Seleccionada *</label>
              <select
                value={selectedShalomId}
                onChange={(e) => setSelectedShalomId(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                }`}
              >
                {shalomAgencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.department} - {a.name} ({a.address})
                  </option>
                ))}
              </select>
            </div>
          )}

          {shippingType === 'marvisur' && (
            <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${
              isDark ? 'bg-blue-950/15 border-blue-900/30' : 'bg-blue-50 border-blue-300'
            }`}>
              <label className="font-black text-blue-900 dark:text-blue-400 text-xs">Sucursal Marvisur Seleccionada *</label>
              <select
                value={selectedMarvisurId}
                onChange={(e) => setSelectedMarvisurId(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                }`}
              >
                {marvisurAgencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.department} - {a.name} ({a.address})
                  </option>
                ))}
              </select>
            </div>
          )}

          {shippingType === 'olva' && (
            <div className={`p-3.5 rounded-2xl border-2 space-y-2.5 ${
              isDark ? 'bg-amber-950/15 border-amber-900/30' : 'bg-amber-50 border-[#FBBF24]/30'
            }`}>
              <label className="font-black text-amber-950 dark:text-amber-500 text-xs">Agencia Olva o Dirección</label>
              <select
                value={selectedOlvaId}
                onChange={(e) => setSelectedOlvaId(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                }`}
              >
                {olvaAgencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.department} - {a.name} ({a.address})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Dirección alternativa si es a domicilio"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                }`}
              />
            </div>
          )}

          {shippingType === 'delivery_lima' && (
            <div className={`p-3.5 rounded-2xl border-2 space-y-3 ${
              isDark ? 'bg-blue-950/15 border-blue-900/30' : 'bg-blue-50/70 border-blue-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-blue-900 dark:text-blue-400 text-xs block">
                  Detalles de Entrega en Lima Metropolitana
                </span>
                <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 bg-[#ECFEFF] dark:bg-[#06B6D4]/20 px-2 py-0.5 rounded-full">
                  Horario: 3 PM a 10 PM
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <select
                  value={deliveryDistrict}
                  onChange={(e) => setDeliveryDistrict(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-black ${
                    isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black'
                  }`}
                >
                  {LIMA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Dirección exacta"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold ${
                    isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black placeholder-[#475569]/70'
                  }`}
                  required
                />
              </div>

              <input
                type="text"
                placeholder="Referencia (opcional)"
                value={deliveryReference}
                onChange={(e) => setDeliveryReference(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black placeholder-[#475569]/70'
                }`}
              />

              {/* 2. PRECIO TRANSPORTE (Solo aplica a Delivery Lima, por defecto S/15.00, editable) */}
              <div className={`p-3 rounded-2xl border-2 ${
                isDark ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-blue-200 shadow-2xs'
              } space-y-2.5`}>
                
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="font-black text-black dark:text-zinc-100 text-xs flex items-center gap-1.5">
                      <Bike className="w-4 h-4 text-blue-600" />
                      <span title="cobro adelantado">Precio transporte:</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#475569]">
                      Costo de envío para Delivery Lima (por defecto S/ 15.00, editable)
                    </span>
                  </div>
                  <div className="relative w-32 flex-shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-700 dark:text-zinc-300">S/</span>
                    <input
                      type="number"
                      step="0.10"
                      placeholder="15.00"
                      value={deliveryFee}
                      onChange={(e) => handleDeliveryFeeChange(e.target.value)}
                      className={`w-full pl-8 pr-2.5 py-1.5 rounded-xl text-xs font-black border-2 ${
                        isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black focus:border-[#6366F1]'
                      }`}
                    />
                  </div>
                </div>

              </div>

              {/* Contraentrega Toggle (Especial para Delivery Lima o Recojo) */}
              <div className="pt-2.5 border-t-2 border-dashed border-[#E2E8F0] dark:border-zinc-800 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">💵</span>
                      <div>
                        <span className="font-black text-xs text-black dark:text-zinc-100">
                          Modalidad: Pago Contraentrega
                        </span>
                        <p className="text-[10px] font-bold text-[#475569] dark:text-zinc-400">
                          El cliente pagará al momento de recibir sus productos
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isCashOnDelivery}
                      onChange={(e) => handleToggleContraentrega(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded border-2 border-zinc-400 focus:ring-red-500 cursor-pointer"
                    />
                  </label>

                  {isCashOnDelivery && (
                    <div className="pt-2 pl-2 border-t-2 border-dashed border-[#FBBF24]/30 dark:border-amber-900/60 space-y-2.5 animate-in fade-in bg-amber-500/5 p-2 rounded-xl">
                      {/* Selector de Medios de Pago Contraentrega */}
                      <div className="space-y-1">
                        <span className="text-xs font-black text-[#F59E0B] dark:text-amber-300 block">
                          Tipo de pago:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('motorizado')}
                            className={`p-2 rounded-xl border-2 font-black text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                              paymentMethod === 'motorizado'
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-[#0F172A] border-zinc-900 dark:border-white shadow-xs'
                                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-[#0F172A] dark:text-zinc-200'
                            }`}
                          >
                            <span>🛵</span>
                            <span className="truncate">Al motorizado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('yape')}
                            className={`p-2 rounded-xl border-2 font-black text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                              paymentMethod === 'yape'
                                ? 'bg-[#6366F1] text-white border-purple-700 shadow-xs'
                                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-[#0F172A] dark:text-zinc-200'
                            }`}
                          >
                            <span>🟣</span>
                            <span className="truncate">Yape (al 940339934)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('transferencia')}
                            className={`p-2 rounded-xl border-2 font-black text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                              paymentMethod === 'transferencia'
                                ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-[#0F172A] dark:text-zinc-200'
                            }`}
                          >
                            <span>🏦</span>
                            <span className="truncate">Transferencia</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div>
                          <span className="text-xs font-black text-[#F59E0B] dark:text-amber-300 block">
                            Monto a Cobrar (S/):
                          </span>
                          <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-400">
                            (Se copia de Monto a Pagar y figurará en el rótulo)
                          </span>
                        </div>
                        <div className="relative w-28 flex-shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-amber-950 dark:text-amber-400">S/</span>
                          <input
                            type="number"
                            step="0.10"
                            placeholder="0.00"
                            value={cashOnDeliveryAmount}
                            onChange={(e) => setCashOnDeliveryAmount(e.target.value)}
                            className={`w-full pl-7 pr-2.5 py-1.5 rounded-lg text-xs font-black border-2 ${
                              isDark ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' : 'bg-amber-50 border-amber-400 text-amber-950'
                            }`}
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-amber-900 dark:text-amber-300/80">
                        * Nota: El transporte se abona por anticipado fuera del sistema; el motorizado únicamente cobra el valor del pedido.
                      </p>
                    </div>
                  )}
                </div>

            </div>
          )}

          {/* N° de Guía / Remito / Tracking */}
          <div className="space-y-1 pt-1">
            <label className="font-black text-black dark:text-zinc-300 text-xs flex items-center justify-between">
              <span>N° de Guía / Remito / Clave de Retiro (Shalom / Olva)</span>
              <span className="text-[10px] font-bold text-[#475569]">Opcional</span>
            </label>
            <input
              type="text"
              placeholder="Ej. 104-9876543 / 001-928374"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-mono font-bold ${
                isDark ? 'bg-[#1E293B] border-[#334155] text-zinc-100' : 'bg-white border-zinc-300 text-black'
              }`}
            />
          </div>

          {/* Description & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1">
              <label className="font-black text-black dark:text-zinc-300 text-xs">Contenido / Productos</label>
              <input
                type="text"
                placeholder="Ej. Rutina personalizada"
                value={itemsDescription}
                onChange={(e) => setItemsDescription(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black placeholder-[#475569]/70'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="font-black text-black dark:text-zinc-300 text-xs">Notas / Observaciones</label>
              <input
                type="text"
                placeholder="Ej. Timbrar fuerte, dejar en recepción"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold ${
                  isDark ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-zinc-300 text-black placeholder-[#475569]/70'
                }`}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t-2 border-[#E2E8F0] dark:border-zinc-800 flex items-center justify-between gap-2.5">
            {onDeleteOrder && order && (
              <button
                type="button"
                onClick={() => {
                  onDeleteOrder(order.id);
                  onClose();
                }}
                className="px-3.5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-[#6366F1] dark:text-rose-400 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Mover pedido a la papelera"
              >
                <Trash2 className="w-4 h-4 stroke-[2]" />
                <span>Mover a Papelera</span>
              </button>
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl border-2 text-xs font-black cursor-pointer transition-colors ${
                  isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-black hover:bg-zinc-100 hover:border-black'
                }`}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
