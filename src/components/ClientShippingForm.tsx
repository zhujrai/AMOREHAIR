import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Truck, 
  Bike, 
  Store, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Search, 
  Info, 
  AlertCircle,
  AlertTriangle,
  WifiOff,
  PackageCheck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Share2,
  Sun,
  Moon
} from 'lucide-react';
import { Agency, KnownCustomer, Order, ShippingMethodsConfig, ShippingType, StoreSettings } from '../types';
import { SHALOM_AGENCIES, OLVA_AGENCIES, MARVISUR_AGENCIES, LIMA_DISTRICTS } from '../data/agencies';
import { 
  getShippingTypeLabel, 
  getShippingTypeBadge, 
  getCutoffHourByShippingType,
  getCutoffDisplay,
  formatPeruvianDate, 
  getNext4DispatchDates,
  generateOrderId,
  getBrandLogo
} from '../utils/formatters';
import { ShippingTypeModal } from './ShippingTypeModal';
import { AgencySearchModal } from './AgencySearchModal';
import { DateSelectModal } from './DateSelectModal';
import { ShareFormModal } from './ShareFormModal';

interface ClientShippingFormProps {
  storeSettings: StoreSettings;
  knownCustomers: KnownCustomer[];
  onOrderCreated: (order: Order) => void;
  shippingConfig?: ShippingMethodsConfig;
  shalomAgencies?: Agency[];
  olvaAgencies?: Agency[];
  marvisurAgencies?: Agency[];
  isDark: boolean;
  setIsDark?: (dark: boolean) => void;
  onNavigateToAdmin?: () => void;
  isDbConnected?: boolean;
}

export const ClientShippingForm: React.FC<ClientShippingFormProps> = ({
  storeSettings,
  knownCustomers,
  onOrderCreated,
  shippingConfig = { 
    shalom: true, 
    olva: true, 
    marvisur: true,
    delivery_lima: true, 
    tienda: true,
    deliveryLimaCashOnDeliveryEnabled: true
  },
  shalomAgencies = SHALOM_AGENCIES,
  olvaAgencies = OLVA_AGENCIES,
  marvisurAgencies = MARVISUR_AGENCIES,
  isDark,
  setIsDark,
  onNavigateToAdmin,
  isDbConnected = true,
}) => {
  // Form State
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [documentType, setDocumentType] = useState<'DNI' | 'CE'>('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [shippingType, setShippingType] = useState<ShippingType | null>(null);
  
  // Shalom / Olva / Marvisur agency (null by default so user initiates selection)
  const [selectedShalomAgency, setSelectedShalomAgency] = useState<Agency | null>(null);
  const [selectedOlvaAgency, setSelectedOlvaAgency] = useState<Agency | null>(null);
  const [selectedMarvisurAgency, setSelectedMarvisurAgency] = useState<Agency | null>(null);
  const [olvaDeliveryMode, setOlvaDeliveryMode] = useState<'agencia' | 'domicilio'>('agencia');

  // Highlight / emphasis effect for next step (agency selection)
  const [highlightAgencyStep, setHighlightAgencyStep] = useState(false);

  // Delivery Lima / Olva Domicilio
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [deliveryDistrict, setDeliveryDistrict] = useState(LIMA_DISTRICTS[0]);
  const [isCashOnDelivery, setIsCashOnDelivery] = useState(false);

  // Package & dispatch date
  const [dispatchDate, setDispatchDate] = useState<string>('');
  const [itemsDescription, setItemsDescription] = useState('Rutina personalizada');
  const [notes, setNotes] = useState('');

  // UI Modals - Modal opens when user clicks to choose or change shipping method
  const [showShippingModal, setShowShippingModal] = useState<boolean>(false);
  const [showShalomSearchModal, setShowShalomSearchModal] = useState(false);
  const [showOlvaSearchModal, setShowOlvaSearchModal] = useState(false);
  const [showMarvisurSearchModal, setShowMarvisurSearchModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Recognition animation state
  const [isKnownCustomer, setIsKnownCustomer] = useState(false);
  const [recognizedName, setRecognizedName] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const brandLogo = getBrandLogo(isDark, storeSettings);

  // Dynamic cutoff hour based on selected shipping type
  const currentCutoffHour = getCutoffHourByShippingType(shippingType);
  const currentCutoffDisplay = getCutoffDisplay(shippingType);

  // Countdown timer to cutoff
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; passed: boolean }>({
    hours: 0,
    minutes: 0,
    passed: false,
  });

  // Calculate cutoff countdown for current shipping type (only when a shipping type is selected)
  useEffect(() => {
    if (!shippingType) return;
    const calculateTime = () => {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(currentCutoffHour, 0, 0, 0);

      const diffMs = cutoff.getTime() - now.getTime();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining({ hours, minutes, passed: false });
      } else {
        setTimeRemaining({ hours: 0, minutes: 0, passed: true });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 15000);
    return () => clearInterval(interval);
  }, [currentCutoffHour, shippingType]);

  // Recalculate dispatch date when shipping type changes or cutoff updates
  useEffect(() => {
    const available = getNext4DispatchDates(currentCutoffHour, shippingType);
    if (available.length > 0) {
      const exists = available.some(d => d.dateStr === dispatchDate);
      if (!exists || !dispatchDate) {
        setDispatchDate(available[0].dateStr);
      }
    }
  }, [currentCutoffHour, shippingType]);

  // Reusable helper to populate data when a customer match is found
  const applyCustomerMatch = (match: KnownCustomer) => {
    setIsKnownCustomer(true);
    setRecognizedName(match.fullName);
    if (!customerName || customerName !== match.fullName) {
      setCustomerName(match.fullName);
    }
    if (match.documentNumber && (!documentNumber || documentNumber !== match.documentNumber)) {
      setDocumentNumber(match.documentNumber);
      if (match.documentType) setDocumentType(match.documentType);
    }
    if (match.phone && (!phone || phone !== match.phone)) {
      setPhone(match.phone);
    }

    if (!shippingType && match.preferredShippingType) {
      setShippingType(match.preferredShippingType);
    }
    if (match.preferredAgency) {
      const shalomMatch = shalomAgencies.find((a) => a.id === match.preferredAgency);
      if (shalomMatch && !selectedShalomAgency) setSelectedShalomAgency(shalomMatch);
      const marvisurMatch = marvisurAgencies.find((a) => a.id === match.preferredAgency);
      if (marvisurMatch && !selectedMarvisurAgency) setSelectedMarvisurAgency(marvisurMatch);
      const olvaMatch = olvaAgencies.find((a) => a.id === match.preferredAgency);
      if (olvaMatch && !selectedOlvaAgency) setSelectedOlvaAgency(olvaMatch);
    }
    if (match.preferredAddress && !deliveryAddress) {
      setDeliveryAddress(match.preferredAddress);
    }
    if (match.preferredDistrict && !deliveryDistrict) {
      setDeliveryDistrict(match.preferredDistrict);
    }
  };

  // Handler for document number input with immediate autofill
  const handleDocNumberChange = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    setDocumentNumber(clean);
    if (errors.documentNumber) setErrors((prev) => ({ ...prev, documentNumber: '' }));

    if ((documentType === 'DNI' && clean.length === 8) || (documentType === 'CE' && clean.length >= 8)) {
      const match = knownCustomers.find(
        (c) => c.documentNumber?.replace(/\D/g, '') === clean
      );
      if (match) {
        applyCustomerMatch(match);
      }
    }
  };

  // Handler for phone number input with immediate autofill
  const handlePhoneChange = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    setPhone(clean);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));

    if (clean.length === 9) {
      const match = knownCustomers.find(
        (c) => c.phone?.replace(/\D/g, '') === clean
      );
      if (match) {
        applyCustomerMatch(match);
      }
    }
  };

  // Check known customers on initial load or async updates
  useEffect(() => {
    if (knownCustomers.length === 0) return;
    const cleanDoc = documentNumber.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    if ((documentType === 'DNI' && cleanDoc.length === 8) || (documentType === 'CE' && cleanDoc.length >= 8)) {
      const matchDoc = knownCustomers.find((c) => c.documentNumber?.replace(/\D/g, '') === cleanDoc);
      if (matchDoc) {
        applyCustomerMatch(matchDoc);
        return;
      }
    }

    if (cleanPhone.length === 9) {
      const matchPhone = knownCustomers.find((c) => c.phone?.replace(/\D/g, '') === cleanPhone);
      if (matchPhone) {
        applyCustomerMatch(matchPhone);
      }
    }
  }, [knownCustomers]);

  const handleSelectShippingType = (type: ShippingType) => {
    setShippingType(type);
    setShowShippingModal(false);
    
    // Highlight agency selection as next logical step if an agency-based courier is chosen
    if (type === 'shalom' || type === 'marvisur' || type === 'olva') {
      setHighlightAgencyStep(true);
      setTimeout(() => setHighlightAgencyStep(false), 4500);
    } else {
      setHighlightAgencyStep(false);
    }

    if (errors.shippingType) {
      setErrors((prev) => ({ ...prev, shippingType: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errs: { [key: string]: string } = {};

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 9 || !cleanPhone.startsWith('9')) {
      errs.phone = 'Ingresa un celular peruano de 9 dígitos';
    }

    if (!customerName.trim()) {
      errs.customerName = 'Ingresa tu nombre y apellido';
    }

    const cleanDoc = documentNumber.replace(/\D/g, '');
    if (documentType === 'DNI') {
      if (cleanDoc.length !== 8) {
        errs.documentNumber = 'Ingresa un DNI válido de 8 números';
      }
    } else {
      if (cleanDoc.length < 8 || cleanDoc.length > 12) {
        errs.documentNumber = 'Ingresa un Carné de Extranjería válido';
      }
    }

    if (!shippingType) {
      errs.shippingType = 'Selecciona una modalidad de envío';
    } else if (shippingType === 'shalom') {
      if (!selectedShalomAgency) {
        errs.agency = 'Debes seleccionar una agencia Shalom';
      }
    } else if (shippingType === 'marvisur') {
      if (!selectedMarvisurAgency) {
        errs.agency = 'Debes seleccionar una sucursal Marvisur';
      }
    } else if (shippingType === 'olva') {
      if (olvaDeliveryMode === 'agencia') {
        if (!selectedOlvaAgency) {
          errs.agency = 'Debes seleccionar una agencia Olva Courier';
        }
      } else {
        if (!deliveryAddress.trim()) {
          errs.deliveryAddress = 'Ingresa la dirección para Olva';
        }
      }
    } else if (shippingType === 'delivery_lima') {
      if (!deliveryAddress.trim()) {
        errs.deliveryAddress = 'Ingresa la dirección de entrega';
      }
      if (!deliveryDistrict) {
        errs.deliveryDistrict = 'Selecciona tu distrito en Lima';
      }
    }

    if (!dispatchDate) {
      errs.dispatchDate = 'Selecciona una fecha de envío';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !shippingType) {
      const firstError = document.querySelector('.border-red-500, .text-red-500, .text-red-600');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const orderId = generateOrderId();
    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      dispatchDate: dispatchDate,
      status: 'nuevos',
      customerName: customerName.trim(),
      customerPhone: phone.replace(/\D/g, ''),
      documentType: documentType,
      documentNumber: documentNumber.trim(),
      shippingType: shippingType,
      itemsDescription: itemsDescription.trim() || 'Rutina personalizada',
      notes: notes.trim() || undefined,
      whatsappSent: false,
    };

    if (shippingType === 'shalom') {
      newOrder.agency = selectedShalomAgency || undefined;
    } else if (shippingType === 'marvisur') {
      newOrder.agency = selectedMarvisurAgency || undefined;
    } else if (shippingType === 'olva') {
      if (olvaDeliveryMode === 'agencia') {
        newOrder.agency = selectedOlvaAgency || undefined;
      } else {
        newOrder.deliveryAddress = deliveryAddress.trim();
        newOrder.deliveryDistrict = deliveryDistrict;
        newOrder.deliveryReference = deliveryReference.trim();
      }
    } else if (shippingType === 'delivery_lima') {
      newOrder.deliveryAddress = deliveryAddress.trim();
      newOrder.deliveryDistrict = deliveryDistrict;
      newOrder.deliveryReference = deliveryReference.trim();
      newOrder.isCashOnDelivery = isCashOnDelivery;
      newOrder.deliveryFee = 15.00;
    }

    onOrderCreated(newOrder);
  };

  let courierCutoffName = 'Shalom';
  if (shippingType === 'marvisur') courierCutoffName = 'Marvisur';
  else if (shippingType === 'delivery_lima') courierCutoffName = 'Delivery Lima';
  else if (shippingType === 'tienda') courierCutoffName = 'Retiro en Tienda';
  else if (shippingType === 'olva') courierCutoffName = 'Olva Courier';

  return (
    <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 py-2 sm:py-5 animate-in fade-in duration-300">
      
      {/* Standalone Brand Header with Logo, Title, Share & Theme Switcher */}
      <div className="flex items-center justify-between gap-3 mb-2 sm:mb-3 px-1 sm:px-2">
        <div className="flex items-center">
          {brandLogo ? (
            <div className="relative flex items-center h-14 sm:h-18 overflow-hidden">
              <img
                src={brandLogo}
                alt={storeSettings.storeName || 'AMORE SALON'}
                className="h-16 sm:h-20 w-auto max-w-[240px] sm:max-w-[340px] object-cover scale-y-[1.18] scale-x-[1.05] p-0 m-0 transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center font-black shadow-sm">
                <Truck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-black text-base sm:text-lg tracking-tight uppercase text-[#0F172A] dark:text-white">AMORE SALON</span>
            </div>
          )}
        </div>

        {/* Action Controls: Share & Theme Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="client-share-form-btn"
            type="button"
            onClick={() => setShowShareModal(true)}
            className={`p-2 sm:p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs backdrop-blur-md ${
              isDark
                ? 'bg-zinc-900/80 hover:bg-[#4F46E5] border-white/10 text-white hover:border-blue-500/40'
                : 'bg-white/80 hover:bg-white border-[#E2E8F0] text-[#0F172A] hover:border-blue-500/40'
            }`}
            title="Compartir enlace del formulario"
            aria-label="Compartir formulario"
          >
            <Share2 className="w-4 h-4 text-blue-500 stroke-[2.2]" />
          </button>

          {setIsDark && (
            <button
              id="client-theme-toggle-btn"
              type="button"
              onClick={() => setIsDark(!isDark)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-150 cursor-pointer shadow-2xs backdrop-blur-md ${
                isDark
                  ? 'border-white/10 bg-zinc-900/80 hover:bg-[#4F46E5] text-amber-400'
                  : 'border-[#E2E8F0] bg-white/80 hover:bg-white text-[#0F172A]'
              }`}
              title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label="Cambiar tema"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#0F172A]" />}
            </button>
          )}
        </div>
      </div>

      {/* Title above form */}
      <div className="mb-2.5 sm:mb-3 px-1 sm:px-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A] dark:text-white">
            Formulario de envío
          </h1>
          <p className="text-xs font-medium text-[#475569] dark:text-zinc-400 mt-0.5">
            Completa tus datos para coordinar el despacho de tu pedido
          </p>
        </div>
      </div>

      {/* Horario de Corte Dinámico: Solo aparece si ya se ha seleccionado un método de envío */}
      {shippingType && (
        <div className="mb-3 sm:mb-4 flex items-center justify-center animate-in fade-in slide-in-from-top-1 duration-200">
          <div className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-xs ${
            isDark 
              ? 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FBBF24]/30' 
              : 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FBBF24]/30'
          }`}>
            <span className="text-amber-500">⚡</span>
            <span>
              Corte {courierCutoffName}: <strong className="font-extrabold">{currentCutoffDisplay}</strong>
            </span>
            <span className="text-zinc-400 dark:text-[#475569]">•</span>
            <span>
              {shippingType === 'delivery_lima' ? (
                <span>Despacho de 3 a 10 PM</span>
              ) : timeRemaining.passed ? (
                <span>Despacho en siguiente ciclo</span>
              ) : (
                <span>Quedan <strong className="font-extrabold text-[#6366F1] dark:text-rose-400">{timeRemaining.hours}h {timeRemaining.minutes}m</strong> para hoy</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* MAIN FORM CONTAINER WITH MACOS GLASSMORPHISM & FLUID MOBILE ADAPTATION */}
      <div className={`rounded-2xl sm:rounded-2xl p-3.5 sm:p-7  transition-all shadow-2xs  ${
        isDark 
          ? 'bg-[#1E293B] border border-white/10 text-white shadow-2xs' 
          : 'bg-white border border-[#E2E8F0] text-[#0F172A] shadow-2xs'
      }`}>
        
        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4.5">

          {/* 1. MODALIDAD DE ENVÍO Y SU ESPECIFICACIÓN */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-black dark:text-zinc-100 font-extrabold text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  Modalidad de Envío <span className="text-[#6366F1] font-bold">*</span>
                </span>
                {shippingType && (
                  <span className="text-[11px] font-bold text-[#6366F1] dark:text-rose-400">
                    Paso 1 completado
                  </span>
                )}
              </label>

              {/* Si NO está seleccionado, interfaz limpia y minimalista: Solo camioncito con palabra "Elegir" */}
              {!shippingType ? (
                <div
                  id="open-shipping-type-modal-btn"
                  onClick={() => {
                    setShowShippingModal(true);
                    if (errors.shippingType) setErrors((prev) => ({ ...prev, shippingType: '' }));
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                    errors.shippingType
                      ? 'border-2 border-red-500 bg-red-500/10'
                      : isDark 
                        ? 'bg-[#818CF8]/20 hover:bg-[#818CF8]/35 border border-[#818CF8]/30 text-white' 
                        : 'bg-[#EEF2FF] hover:bg-rose-100/90 border border-[#818CF8]/30 text-black shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#6366F1] dark:bg-white text-white dark:text-[#0F172A] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Truck className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-zinc-100">
                      Modalidad de Envío
                    </span>
                  </div>

                  <span className="text-xs font-black px-4 py-2 rounded-xl shadow-xs flex-shrink-0 transition-colors bg-[#6366F1] hover:bg-[#4F46E5] dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-[#0F172A]">
                    Elegir
                  </span>
                </div>
              ) : (
                <div
                  id="open-shipping-type-modal-btn"
                  onClick={() => {
                    setShowShippingModal(true);
                    if (errors.shippingType) setErrors((prev) => ({ ...prev, shippingType: '' }));
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                    errors.shippingType
                      ? 'border-2 border-red-500 bg-red-500/10'
                      : isDark 
                        ? 'bg-[#1E293B] hover:bg-[#201E24] border border-[#6366F1]/30 text-white shadow-xs' 
                        : 'bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#6366F1] dark:bg-white text-white dark:text-[#0F172A] flex items-center justify-center flex-shrink-0 shadow-sm">
                      {shippingType === 'shalom' && <Building2 className="w-5 h-5 stroke-[2.2]" />}
                      {shippingType === 'marvisur' && <Truck className="w-5 h-5 stroke-[2.2] text-blue-200 dark:text-blue-600" />}
                      {shippingType === 'olva' && <Truck className="w-5 h-5 stroke-[2.2]" />}
                      {shippingType === 'delivery_lima' && <Bike className="w-5 h-5 stroke-[2.2]" />}
                      {shippingType === 'tienda' && <Store className="w-5 h-5 stroke-[2.2]" />}
                    </div>

                    <div className="min-w-0">
                      <div className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-white truncate">
                        {getShippingTypeLabel(shippingType)}
                      </div>
                      <div className="text-xs text-[#475569] dark:text-zinc-300 font-bold mt-0.5 truncate">
                        {shippingType === 'shalom' && (
                          selectedShalomAgency 
                            ? `${selectedShalomAgency.department} / ${selectedShalomAgency.province} / ${selectedShalomAgency.name}`
                            : 'Agencia pendiente de selección'
                        )}
                        {shippingType === 'marvisur' && (
                          selectedMarvisurAgency 
                            ? `${selectedMarvisurAgency.department} / ${selectedMarvisurAgency.province || selectedMarvisurAgency.name}`
                            : 'Sucursal pendiente de selección'
                        )}
                        {shippingType === 'olva' && (
                          olvaDeliveryMode === 'agencia' 
                            ? (selectedOlvaAgency ? selectedOlvaAgency.name : 'Agencia pendiente de selección')
                            : 'Envío a Domicilio'
                        )}
                        {shippingType === 'delivery_lima' && (deliveryDistrict || 'Lima Metropolitana')}
                        {shippingType === 'tienda' && 'CyberPlaza - Lima Centro'}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs flex-shrink-0 transition-colors bg-[#6366F1] hover:bg-[#4F46E5] text-white ml-2">
                    Cambiar
                  </span>
                </div>
              )}

              {errors.shippingType && (
                <p className="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.shippingType}
                </p>
              )}
            </div>

            {/* 1.1 ESPECIFICACIÓN: SHALOM CON RESALTE DE SIGUIENTE PASO */}
            {shippingType === 'shalom' && (
              <div className={`p-4 rounded-2xl space-y-2.5 transition-all animate-in fade-in duration-200 ${
                isDark 
                  ? 'bg-[#1E293B] border border-[#E2E8F0]/15' 
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] shadow-2xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[#0F172A] dark:text-zinc-100 font-extrabold text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#6366F1] dark:text-[#FBBF24]" />
                    Agencia Shalom <span className="text-[#6366F1] dark:text-[#FBBF24] font-bold">*</span>
                  </span>
                  {!selectedShalomAgency ? (
                    <span className="text-[11px] font-bold text-[#6366F1] dark:text-[#FBBF24] bg-[#6366F1]/10 dark:bg-[#FBBF24]/20 px-2.5 py-0.5 rounded-full animate-pulse">
                      👉 Siguiente paso: Elige tu agencia
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#059669] dark:text-emerald-400">
                      ✓ Agencia seleccionada
                    </span>
                  )}
                </div>

                <div 
                  id="select-shalom-agency-btn"
                  onClick={() => {
                    setHighlightAgencyStep(false);
                    setShowShalomSearchModal(true);
                    if (errors.agency) setErrors((prev) => ({ ...prev, agency: '' }));
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                    errors.agency
                      ? 'border-2 border-red-500 bg-red-500/10'
                      : !selectedShalomAgency
                        ? 'border-2 border-[#6366F1] ring-4 ring-[#6366F1]/20 bg-white dark:bg-[#201D22] shadow-md animate-pulse'
                        : isDark 
                          ? 'bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-white' 
                          : 'bg-white hover:bg-zinc-50 border border-[#E2E8F0] text-[#0F172A] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {selectedShalomAgency ? (
                        <>
                          <div className="font-extrabold text-xs sm:text-sm text-[#0F172A] dark:text-white truncate flex items-center gap-1.5">
                            <span>{selectedShalomAgency.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1] dark:text-[#FBBF24] font-bold">
                              {selectedShalomAgency.district || selectedShalomAgency.province}
                            </span>
                          </div>
                          <p className="text-xs text-[#475569] dark:text-zinc-300 font-medium mt-0.5 line-clamp-2">
                            {selectedShalomAgency.address}
                          </p>
                        </>
                      ) : (
                        <div className="text-xs sm:text-sm font-bold text-[#6366F1] dark:text-[#FBBF24] flex items-center gap-1.5">
                          <Search className="w-4 h-4" />
                          <span>Toca aquí para elegir tu sucursal o agencia Shalom</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-xs flex-shrink-0 transition-colors">
                      {selectedShalomAgency ? 'Cambiar' : 'Elegir'}
                    </span>
                  </div>
                </div>

                {errors.agency && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.agency}
                  </p>
                )}
              </div>
            )}

            {/* 1.2 ESPECIFICACIÓN: MARVISUR */}
            {shippingType === 'marvisur' && (
              <div className={`p-4 rounded-2xl space-y-2.5 transition-all animate-in fade-in duration-200 ${
                isDark 
                  ? 'bg-[#1E293B] border border-[#E2E8F0]/15' 
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] shadow-2xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[#0F172A] dark:text-zinc-100 font-extrabold text-xs flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#06B6D4]" />
                    Sucursal Expreso Marvisur <span className="text-[#06B6D4] font-bold">*</span>
                  </span>
                  {!selectedMarvisurAgency ? (
                    <span className="text-[11px] font-bold text-[#06B6D4] dark:text-sky-400 bg-[#06B6D4]/10 px-2.5 py-0.5 rounded-full animate-pulse">
                      👉 Siguiente paso: Elige tu sucursal
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#059669] dark:text-emerald-400">
                      ✓ Sucursal seleccionada
                    </span>
                  )}
                </div>

                <div 
                  id="select-marvisur-agency-btn"
                  onClick={() => {
                    setHighlightAgencyStep(false);
                    setShowMarvisurSearchModal(true);
                    if (errors.agency) setErrors((prev) => ({ ...prev, agency: '' }));
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                    errors.agency
                      ? 'border-2 border-red-500 bg-red-500/10'
                      : !selectedMarvisurAgency
                        ? 'border-2 border-[#06B6D4] ring-4 ring-[#06B6D4]/20 bg-white dark:bg-[#201D22] shadow-md animate-pulse'
                        : isDark 
                          ? 'bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-white' 
                          : 'bg-white hover:bg-zinc-50 border border-[#E2E8F0] text-[#0F172A] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {selectedMarvisurAgency ? (
                        <>
                          <div className="font-extrabold text-xs sm:text-sm text-[#0F172A] dark:text-white truncate flex items-center gap-1.5">
                            <span>{selectedMarvisurAgency.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#06B6D4]/10 text-[#06B6D4] dark:text-blue-400 font-bold">
                              {selectedMarvisurAgency.department}
                            </span>
                          </div>
                          <p className="text-xs text-[#475569] dark:text-zinc-300 font-medium mt-0.5 line-clamp-2">
                            {selectedMarvisurAgency.address}
                          </p>
                        </>
                      ) : (
                        <div className="text-xs sm:text-sm font-bold text-[#06B6D4] dark:text-sky-300 flex items-center gap-1.5">
                          <Search className="w-4 h-4" />
                          <span>Toca aquí para elegir tu sucursal Marvisur</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#06B6D4] hover:bg-[#0891B2] text-white shadow-xs flex-shrink-0 transition-colors">
                      {selectedMarvisurAgency ? 'Cambiar' : 'Elegir'}
                    </span>
                  </div>
                </div>

                {errors.agency && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.agency}
                  </p>
                )}
              </div>
            )}

            {/* 1.3 ESPECIFICACIÓN: OLVA COURIER */}
            {shippingType === 'olva' && (
              <div className={`p-4 rounded-2xl space-y-2.5 transition-all animate-in fade-in duration-200 ${
                isDark 
                  ? 'bg-[#1E293B] border border-[#E2E8F0]/15' 
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] shadow-2xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[#0F172A] dark:text-zinc-100 font-extrabold text-xs">Modalidad Olva Courier</span>
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setOlvaDeliveryMode('agencia')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        olvaDeliveryMode === 'agencia' ? 'bg-[#6366F1] text-white shadow-xs' : 'bg-zinc-200 dark:bg-white/10 text-[#0F172A] dark:text-zinc-200'
                      }`}
                    >
                      En Agencia
                    </button>
                    <button
                      type="button"
                      onClick={() => setOlvaDeliveryMode('domicilio')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        olvaDeliveryMode === 'domicilio' ? 'bg-[#6366F1] text-white shadow-xs' : 'bg-zinc-200 dark:bg-white/10 text-[#0F172A] dark:text-zinc-200'
                      }`}
                    >
                      A Domicilio
                    </button>
                  </div>
                </div>

                {olvaDeliveryMode === 'agencia' ? (
                  <div>
                    <div 
                      id="select-olva-agency-btn"
                      onClick={() => {
                        setHighlightAgencyStep(false);
                        setShowOlvaSearchModal(true);
                        if (errors.agency) setErrors((prev) => ({ ...prev, agency: '' }));
                      }}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                        errors.agency
                          ? 'border-2 border-red-500 bg-red-500/10'
                          : !selectedOlvaAgency
                            ? 'border-2 border-[#FBBF24] ring-4 ring-[#FBBF24]/20 bg-white dark:bg-[#201D22] shadow-md animate-pulse'
                            : isDark 
                              ? 'bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-white' 
                              : 'bg-white hover:bg-zinc-50 border border-[#E2E8F0] text-[#0F172A] shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {selectedOlvaAgency ? (
                            <>
                              <div className="font-extrabold text-xs sm:text-sm text-[#0F172A] dark:text-white truncate">{selectedOlvaAgency.name}</div>
                              <p className="text-xs text-[#475569] dark:text-zinc-300 font-medium mt-0.5 line-clamp-2">{selectedOlvaAgency.address}</p>
                            </>
                          ) : (
                            <div className="text-xs sm:text-sm font-bold text-[#F59E0B] dark:text-amber-300 flex items-center gap-1.5">
                              <Search className="w-4 h-4" />
                              <span>Toca aquí para elegir tu sucursal o agencia Olva</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-xs flex-shrink-0 transition-colors">
                          {selectedOlvaAgency ? 'Cambiar' : 'Elegir'}
                        </span>
                      </div>
                    </div>

                    {errors.agency && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-bold mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {errors.agency}
                      </p>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Dirección exacta para entrega por Olva Courier"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold ${
                      isDark ? 'bg-zinc-900 text-white border border-white/10' : 'bg-white text-black placeholder-[#475569]/70 border border-[#E2E8F0] shadow-2xs'
                    }`}
                  />
                )}
              </div>
            )}

            {/* 1.3 ESPECIFICACIÓN: DELIVERY LIMA METROPOLITANA CON ÉNFASIS */}
            {shippingType === 'delivery_lima' && (
              <div className={`p-4 rounded-2xl space-y-3 transition-all animate-in fade-in duration-200 ${
                isDark 
                  ? 'bg-[#202029]/80 border border-blue-500/20' 
                  : 'bg-[#ECFEFF]/50 border border-[#06B6D4]/30 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-black dark:text-zinc-100 font-extrabold text-xs block">
                    Datos de Entrega (Lima Metropolitana)
                  </span>
                  <span className="text-[11px] font-extrabold text-[#06B6D4] dark:text-sky-300 bg-[#ECFEFF] dark:bg-[#06B6D4]/20 px-2.5 py-0.5 rounded-full">
                    🛵 Entrega de 3:00 PM a 10:00 PM
                  </span>
                </div>

                <select
                  value={deliveryDistrict}
                  onChange={(e) => setDeliveryDistrict(e.target.value)}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold ${
                    isDark ? 'bg-zinc-900 text-white border border-white/10' : 'bg-white text-black border border-[#E2E8F0] shadow-2xs'
                  }`}
                >
                  {LIMA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Dirección exacta (Av, Calle, Jr, Número, Dpto)"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold ${
                    errors.deliveryAddress 
                      ? 'border-2 border-red-500 ring-2 ring-red-500/20' 
                      : isDark 
                        ? 'bg-zinc-900 text-white border border-white/10' 
                        : 'bg-white text-black placeholder-[#475569]/70 border border-[#E2E8F0] shadow-2xs'
                  }`}
                />

                <input
                  type="text"
                  placeholder="Referencia (piso, timbre, color de casa, etc.)"
                  value={deliveryReference}
                  onChange={(e) => setDeliveryReference(e.target.value)}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold ${
                    isDark ? 'bg-zinc-900 text-white border border-white/10' : 'bg-white text-black placeholder-[#475569]/70 border border-[#E2E8F0] shadow-2xs'
                  }`}
                />

                {/* OPCIÓN DE PAGO CONTRAENTREGA */}
                {shippingConfig.deliveryLimaCashOnDeliveryEnabled !== false && (
                  <div className={`mt-3 pt-3 ${isDark ? 'border-t border-zinc-800' : 'border-t border-[#E2E8F0]'} space-y-2.5`}>
                    <label 
                      id="client-cod-toggle"
                      className={`flex items-start gap-3 cursor-pointer select-none p-3.5 rounded-2xl transition-all ${
                        isCashOnDelivery
                          ? isDark ? 'bg-[#F59E0B]/20 text-amber-200 border border-[#FBBF24]/30' : 'bg-[#FFFBEB] text-[#F59E0B] border border-[#FBBF24]/30 shadow-2xs'
                          : isDark ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-[#E2E8F0] shadow-2xs'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isCashOnDelivery}
                        onChange={(e) => setIsCashOnDelivery(e.target.checked)}
                        className="w-4.5 h-4.5 text-black rounded border-zinc-400 focus:ring-black cursor-pointer mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-extrabold text-black dark:text-white flex items-center gap-1.5">
                          💵 Solicitar Pago Contraentrega (Lima)
                        </span>
                        <p className="text-xs text-[#475569] dark:text-zinc-300 font-medium mt-0.5">
                          Pagas el valor de tus productos al recibir con el motorizado (Efectivo o Yape / Plin).
                        </p>
                      </div>
                    </label>

                    {isCashOnDelivery && (
                      <div className={`p-3.5 rounded-2xl ${
                        isDark 
                          ? 'bg-[#F59E0B]/25 text-amber-100 border border-[#FBBF24]/30' 
                          : 'bg-[#FFFBEB] text-[#F59E0B] border border-amber-200'
                      } text-xs space-y-1.5 animate-in fade-in`}>
                        <div className="flex items-center gap-1.5 font-extrabold text-[#F59E0B] dark:text-amber-300">
                          <Info className="w-4 h-4 text-[#F59E0B] flex-shrink-0 stroke-[2.5]" />
                          <span>Abono previo de transporte requerido</span>
                        </div>
                        <p className="text-xs leading-relaxed text-amber-950 dark:text-zinc-100 font-medium">
                          Para programar tu despacho contraentrega, se debe realizar el <strong>abono del costo de delivery/transporte antes de la hora de corte</strong> (<strong className="text-black dark:text-amber-300 font-extrabold">{currentCutoffDisplay}</strong>).
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 1.4 ESPECIFICACIÓN: RETIRO EN TIENDA */}
            {shippingType === 'tienda' && (
              <div className={`p-4 rounded-2xl space-y-1.5 transition-all animate-in fade-in duration-200 ${
                isDark ? 'bg-[#10B981]/25 border border-emerald-500/20 text-white' : 'bg-emerald-50 border border-emerald-200 text-emerald-950'
              }`}>
                <div className="font-extrabold text-xs text-[#10B981] dark:text-emerald-300 flex items-center gap-1.5">
                  <Store className="w-4 h-4" />
                  <span>Retiro en {storeSettings.storeName}</span>
                </div>
                <p className="text-xs text-[#10B981] dark:text-zinc-200 font-medium">
                  {storeSettings.address} • {storeSettings.openingHours}
                </p>
              </div>
            )}
          </div>

          {/* RECOGNIZED CUSTOMER BANNER IF MATCHED */}
          {isKnownCustomer && (
            <div 
              id="known-customer-banner"
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-[#FBBF24]/30 text-amber-950 dark:text-amber-200 text-xs font-bold animate-in fade-in"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-400 flex-shrink-0" />
                <span>¡Cliente frecuente reconocido: <strong>{recognizedName || customerName}</strong>!</span>
              </div>
              <span className="text-[10px] text-[#F59E0B] dark:text-amber-300 font-semibold hidden sm:inline">
                Datos completados
              </span>
            </div>
          )}

          {/* 2. TU DOCUMENTO (Pre-llena teléfono y nombre si ya existe) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="doc-number-input" className="text-black dark:text-zinc-100 font-extrabold text-xs block">
                Tu Documento <span className="text-[#6366F1] font-bold">*</span>
              </label>
              <span className="text-[10px] text-[#475569] dark:text-zinc-400 font-semibold">
                {documentNumber.length}/{documentType === 'DNI' ? '8' : '12'} dígitos
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-28 flex-shrink-0">
                <select
                  id="doc-type-select"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as 'DNI' | 'CE')}
                  className={`w-full px-2.5 py-2.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-[#0F172A] border-white/10 text-white focus:bg-[#0F172A] focus:border-white' 
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-black focus:bg-white focus:border-[#6366F1]'
                  }`}
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">C.E.</option>
                </select>
              </div>

              <div className="flex-1 min-w-0 relative">
                <input
                  id="doc-number-input"
                  type="text"
                  maxLength={documentType === 'DNI' ? 8 : 12}
                  placeholder={documentType === 'DNI' ? '8 dígitos (DNI)' : 'Número C.E.'}
                  value={documentNumber}
                  onChange={(e) => handleDocNumberChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                    errors.documentNumber 
                      ? 'border-red-500 ring-2 ring-red-500/30' 
                      : isDark
                        ? 'bg-[#0F172A] border-white/10 text-white placeholder-[#475569]/70 focus:bg-[#0F172A] focus:border-white focus:ring-2 focus:ring-white/20'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-black placeholder-[#475569]/70 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20'
                  }`}
                />

                {((documentType === 'DNI' && documentNumber.length === 8) || (documentType === 'CE' && documentNumber.length >= 8)) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
              </div>
            </div>

            {errors.documentNumber && (
              <p className="text-xs text-red-600 dark:text-red-400 font-bold">{errors.documentNumber}</p>
            )}
          </div>

          {/* 3. DESTINATARIO: NOMBRE COMPLETO */}
          <div className="space-y-1">
            <label htmlFor="customer-name-input" className="text-black dark:text-zinc-100 font-extrabold text-xs block">
              Tu nombre completo <span className="text-[#6366F1] font-bold">*</span>
            </label>

            <input
              id="customer-name-input"
              type="text"
              placeholder="Nombres y Apellidos"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value.toUpperCase());
                if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: '' }));
              }}
               className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all uppercase ${
                errors.customerName 
                  ? 'border-red-500 ring-2 ring-red-500/30' 
                  : isDark
                    ? 'bg-[#0F172A] border-white/10 text-white placeholder-[#475569]/70 focus:bg-[#0F172A] focus:border-white focus:ring-2 focus:ring-white/20'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-black placeholder-[#475569]/70 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20'
              }`}
            />

            {errors.customerName && (
              <p className="text-xs text-red-600 dark:text-red-400 font-bold">{errors.customerName}</p>
            )}
          </div>

          {/* 4. NÚMERO CELULAR / WHATSAPP (UBICADO LUEGO DE NOMBRE COMPLETO) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="phone-input" className="text-black dark:text-zinc-100 font-extrabold text-xs flex items-center gap-1.5">
                <span>Número Celular / WhatsApp</span>
                <span className="text-[#6366F1] font-bold">*</span>
              </label>
            </div>

            <div className="flex gap-2">
              <span className={`px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center select-none ${
                isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-zinc-100 border-[#E2E8F0] text-black'
              }`}>
                🇵🇪 +51
              </span>

              <div className="relative flex-1">
                <input
                  id="phone-input"
                  type="tel"
                  maxLength={9}
                  placeholder="9XXXXXXXX"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                    errors.phone 
                      ? 'border-red-500 ring-2 ring-red-500/30' 
                      : isDark
                        ? 'bg-[#0F172A] border-white/10 text-white placeholder-[#475569]/70 focus:bg-[#0F172A] focus:border-white focus:ring-2 focus:ring-white/20'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-black placeholder-[#475569]/70 focus:bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20'
                  }`}
                />

                {phone.length === 9 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
              </div>
            </div>

            {errors.phone && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-bold">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* 5. FECHA DE ENVÍO */}
          <div className="space-y-1">
            <label className="text-black dark:text-zinc-100 font-extrabold text-xs block">
              Fecha de envío <span className="text-[#6366F1] font-bold">*</span>
            </label>

            <div
              id="open-date-modal-btn"
              onClick={() => setShowDateModal(true)}
              className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                isDark 
                  ? 'bg-[#818CF8]/20 hover:bg-[#818CF8]/35 border border-[#818CF8]/30 text-white' 
                  : 'bg-[#EEF2FF] hover:bg-rose-100/90 border border-[#818CF8]/30 text-black shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg">📅</span>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm capitalize text-black dark:text-white truncate">
                    {formatPeruvianDate(dispatchDate)}
                  </div>
                </div>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex-shrink-0 transition-colors">
                Cambiar
              </span>
            </div>
          </div>

          {/* 6. COMENTARIO (OPCIONAL) */}
          <div className="space-y-1 pt-0.5">
            <label htmlFor="order-notes-input" className="text-black dark:text-zinc-100 font-extrabold text-xs flex items-center justify-between">
              <span>Comentario</span>
              <span className="text-[10px] font-semibold text-[#475569] dark:text-zinc-400">Opcional</span>
            </label>
            <input
              id="order-notes-input"
              type="text"
              placeholder=""
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                isDark 
                  ? 'bg-[#0F172A] border-white/10 text-white placeholder-[#475569]/70 focus:bg-[#0F172A] focus:border-white' 
                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-black placeholder-[#475569]/70 focus:bg-white focus:border-[#6366F1]'
              }`}
            />
          </div>

          {/* ALERTA DE CONEXIÓN A BASE DE DATOS EN FORMULARIO */}
          {!isDbConnected && (
            <div 
              id="client-db-offline-alert"
              className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-[#FBBF24]/30 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.2] flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-extrabold block">Modo sin conexión con la base de datos</span>
                <p className="text-[11px] text-[#475569] dark:text-zinc-300 font-medium leading-relaxed">
                  Puedes completar y registrar tu pedido con normalidad. Se guardará de forma segura en este dispositivo y se sincronizará con la central automáticamente cuando vuelva la conexión.
                </p>
              </div>
            </div>
          )}

          {/* 7. BTN ACTION: REGISTRAR */}
          <button
            id="submit-shipping-form-btn"
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-[#0F172A] font-black text-sm tracking-widest uppercase transition-all shadow-lg shadow-black/20 hover:scale-[1.008] active:scale-[0.992] flex items-center justify-center gap-2 cursor-pointer mt-5 backdrop-blur-md"
          >
            <span className="text-white dark:text-[#0F172A] font-black tracking-wider">REGISTRAR</span>
            <span className="text-lg leading-none text-white dark:text-[#0F172A] font-black">→</span>
          </button>

        </form>
      </div>

      {/* Modals */}
      <ShippingTypeModal
        isOpen={showShippingModal}
        onClose={() => setShowShippingModal(false)}
        selectedType={shippingType}
        onSelect={handleSelectShippingType}
        shippingConfig={shippingConfig}
        isDark={isDark}
        setIsDark={setIsDark}
        storeSettings={storeSettings}
      />

      <AgencySearchModal
        isOpen={showShalomSearchModal}
        onClose={() => setShowShalomSearchModal(false)}
        agencies={shalomAgencies}
        selectedAgencyId={selectedShalomAgency?.id}
        onSelect={(agency) => setSelectedShalomAgency(agency)}
        courierName="Shalom"
        isDark={isDark}
      />

      <AgencySearchModal
        isOpen={showMarvisurSearchModal}
        onClose={() => setShowMarvisurSearchModal(false)}
        agencies={marvisurAgencies}
        selectedAgencyId={selectedMarvisurAgency?.id}
        onSelect={(agency) => setSelectedMarvisurAgency(agency)}
        courierName="Marvisur"
        isDark={isDark}
      />

      <AgencySearchModal
        isOpen={showOlvaSearchModal}
        onClose={() => setShowOlvaSearchModal(false)}
        agencies={olvaAgencies}
        selectedAgencyId={selectedOlvaAgency?.id}
        onSelect={(agency) => setSelectedOlvaAgency(agency)}
        courierName="Olva"
        isDark={isDark}
      />

      <DateSelectModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        selectedDate={dispatchDate}
        onSelect={(date) => setDispatchDate(date)}
        isDark={isDark}
        cutoffHour={currentCutoffHour}
        shippingType={shippingType}
      />

      {/* Modal para Compartir Formulario */}
      <ShareFormModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        storeSettings={storeSettings}
        isDark={isDark}
      />

    </div>
  );
};
