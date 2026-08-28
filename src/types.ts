export type ShippingType = 'shalom' | 'marvisur' | 'olva' | 'delivery_lima' | 'tienda';

export type OrderStatus = 'nuevos' | 'empacados' | 'en_camino' | 'entregados';

export interface Agency {
  id: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address: string;
  reference?: string;
  code?: string;
  schedule?: string;
  phone?: string;
  tipo?: 'TIENDA' | 'AGENTE' | string;
  ubigeo?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
}

export interface ShippingMethodsConfig {
  shalom: boolean;
  marvisur: boolean;
  olva: boolean;
  delivery_lima: boolean;
  tienda: boolean;
  deliveryLimaCashOnDeliveryEnabled?: boolean;
}

export interface KnownCustomer {
  phone: string;
  fullName: string;
  documentNumber: string;
  documentType: 'DNI' | 'CE';
  preferredShippingType?: ShippingType;
  preferredAgency?: string;
  preferredAddress?: string;
  preferredDistrict?: string;
}

export interface Order {
  id: string; // e.g. "PE-7842"
  createdAt: string; // ISO string
  dispatchDate: string; // e.g. "2026-08-19"
  status: OrderStatus;
  
  // Recipient
  customerName: string;
  customerPhone: string;
  documentType: 'DNI' | 'CE';
  documentNumber: string;
  
  // Shipping details
  shippingType: ShippingType;
  agency?: Agency;
  deliveryAddress?: string;
  deliveryReference?: string;
  deliveryDistrict?: string;
  
  // Admin Financial Breakdown (Solo llena el administrador)
  subtotalAmount?: number; // Monto a pagar (productos)
  deliveryFee?: number; // Costo de delivery
  totalAmount?: number; // Monto total
  
  // Cash on Delivery (Pago Contraentrega en Lima)
  isCashOnDelivery?: boolean;
  cashOnDeliveryAmount?: number; // Monto a cobrar (se copia del monto a pagar)
  paymentMethod?: 'motorizado' | 'yape' | 'transferencia';
  notes?: string;
  
  // Metadata & Status
  itemsDescription?: string; // Descripción del contenido (ej. Rutina personalizada)
  trackingNumber?: string; // N° de Guía, Remito o Código de Seguimiento de Shalom/Olva
  whatsappSent?: boolean;
  
  // Papelera / Soft Delete
  isDeleted?: boolean;
  deletedAt?: string; // ISO string when deleted
  previousStatus?: OrderStatus; // Status before being moved to trash
}

export interface StoreSettings {
  storeName: string;
  ruc: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  city: string;
  openingHours: string;
  cutoffHour: number; // e.g. 14 (14:00)
  logoUrl?: string;
  logoHorizontalUrl?: string;
  logoSquareUrl?: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
}
