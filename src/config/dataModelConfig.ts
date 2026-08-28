/**
 * CONFIGURACIÓN Y MODELO DE DATOS - SISTEMA DE ENVÍOS LOGIPERÚ / AMORE SALON
 * 
 * Este archivo contiene los scripts y esquemas para inicializar la base de datos
 * en entornos de despliegue de producción (PostgreSQL / Supabase / MySQL / Firestore / MongoDB / SQLite).
 * No es visible para el cliente final en la interfaz, sino de acceso directo a desarrolladores en el código fuente.
 */

import { Order, StoreSettings, ShippingMethodsConfig, Agency, KnownCustomer } from '../types';

export interface DatabaseDeploymentConfig {
  version: string;
  projectName: string;
  tables: {
    orders: string;
    storeSettings: string;
    shippingConfig: string;
    agencies: string;
    customers: string;
  };
  sqlSchema: string;
  firestoreCollections: {
    name: string;
    indexes: string[];
    rules: string;
  }[];
}

/**
 * ESQUEMA SQL COMPLETO PARA DESPLIEGUES EN POSTGRESQL / SUPABASE / CLOUD SQL
 */
export const SQL_INIT_SCRIPT = `
-- =================================================================
-- SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS PARA PRODUCCIÓN
-- SISTEMA DE PROGRAMACIÓN DE ENVÍOS (LOGIPERÚ / AMORE SALON)
-- =================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS DE ESTADO Y COURIER
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('nuevos', 'empacado', 'entregados');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE shipping_type AS ENUM ('shalom', 'olva', 'delivery_lima', 'tienda');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('DNI', 'CE', 'RUC', 'PASAPORTE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA DE CONFIGURACIÓN DEL COMERCIO / REMITENTE
CREATE TABLE IF NOT EXISTS store_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  ruc VARCHAR(20),
  business_name VARCHAR(150),
  whatsapp_number VARCHAR(20) NOT NULL,
  logo_url TEXT,
  logo_horizontal_url TEXT,
  logo_square_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE MÉTODOS Y LOCALES DE ENVÍO
CREATE TABLE IF NOT EXISTS shipping_config (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  shalom_enabled BOOLEAN DEFAULT TRUE,
  shalom_notes TEXT,
  olva_enabled BOOLEAN DEFAULT TRUE,
  olva_notes TEXT,
  delivery_lima_enabled BOOLEAN DEFAULT TRUE,
  delivery_lima_notes TEXT,
  delivery_lima_cost NUMERIC(10, 2) DEFAULT 12.00,
  tienda_enabled BOOLEAN DEFAULT TRUE,
  tienda_notes TEXT,
  tienda_address TEXT,
  tienda_schedule TEXT,
  cutoff_time VARCHAR(20) DEFAULT '14:00',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE AGENCIAS DE COURIER (SHALOM / OLVA)
CREATE TABLE IF NOT EXISTS agencies (
  id VARCHAR(100) PRIMARY KEY,
  courier VARCHAR(20) NOT NULL, -- 'shalom' | 'olva'
  name VARCHAR(200) NOT NULL,
  department VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50),
  is_pro BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agencies_courier ON agencies(courier);
CREATE INDEX IF NOT EXISTS idx_agencies_search ON agencies(courier, department, province, district);

-- 6. TABLA DE CLIENTES FRECUENTES
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  document_type document_type DEFAULT 'DNI',
  document_number VARCHAR(20),
  address TEXT,
  district VARCHAR(100),
  preferred_shipping_type shipping_type,
  preferred_agency_id VARCHAR(100) REFERENCES agencies(id) ON DELETE SET NULL,
  total_orders INT DEFAULT 1,
  last_order_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 7. TABLA PRINCIPAL DE PEDIDOS / DESPACHOS
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY, -- Ej: 'AMR-74829'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  dispatch_date DATE NOT NULL,
  status order_status NOT NULL DEFAULT 'nuevos',
  
  -- Datos del Destinatario
  customer_name VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  document_type document_type NOT NULL DEFAULT 'DNI',
  document_number VARCHAR(20) NOT NULL,
  
  -- Modalidad de Envío
  shipping_type shipping_type NOT NULL,
  
  -- Si es Agencia (Shalom / Olva)
  agency_id VARCHAR(100) REFERENCES agencies(id) ON DELETE SET NULL,
  agency_snapshot JSONB, -- Copia fija de la agencia al momento del pedido
  
  -- Si es Entrega a Domicilio (Delivery Lima / Olva Domicilio)
  delivery_address TEXT,
  delivery_district VARCHAR(100),
  delivery_reference TEXT,
  is_cash_on_delivery BOOLEAN DEFAULT FALSE,
  
  -- Detalle del Paquete
  items_description TEXT DEFAULT 'Rutina personalizada',
  package_weight_kg NUMERIC(6, 2) DEFAULT 1.0,
  notes TEXT,
  
  -- Seguimiento y Notificaciones
  tracking_number VARCHAR(100),
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  packed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de alto rendimiento para el Tablero Kanban y filtros
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_dispatch_date ON orders(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_type ON orders(shipping_type);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Trigger para actualización automática de updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
`;

/**
 * ESQUEMA JSON PARA COLECCIONES EN FIRESTORE / NO-SQL
 */
export const FIRESTORE_SCHEMA = {
  collections: [
    {
      collectionName: "orders",
      documentId: "string (e.g. 'AMR-74829')",
      fields: {
        id: "string",
        createdAt: "timestamp / ISO string",
        dispatchDate: "string (YYYY-MM-DD)",
        status: "'nuevos' | 'empacado' | 'entregados'",
        customerName: "string",
        customerPhone: "string (9 digits)",
        documentType: "'DNI' | 'CE' | 'RUC'",
        documentNumber: "string",
        shippingType: "'shalom' | 'olva' | 'delivery_lima' | 'tienda'",
        agency: {
          id: "string",
          name: "string",
          department: "string",
          province: "string",
          district: "string",
          address: "string",
          phone: "string"
        },
        deliveryAddress: "string (optional)",
        deliveryDistrict: "string (optional)",
        deliveryReference: "string (optional)",
        isCashOnDelivery: "boolean (optional)",
        itemsDescription: "string",
        notes: "string (optional)",
        trackingNumber: "string (optional)",
        whatsappSent: "boolean",
        whatsappSentAt: "string (optional)",
        packedAt: "string (optional)",
        deliveredAt: "string (optional)"
      },
      indexes: [
        { field: "status", mode: "ASCENDING" },
        { field: "dispatchDate", mode: "ASCENDING" },
        { field: "createdAt", mode: "DESCENDING" },
        { field: "shippingType", mode: "ASCENDING" }
      ]
    },
    {
      collectionName: "store_settings",
      documentId: "'default'",
      fields: {
        name: "string",
        phone: "string",
        address: "string",
        city: "string",
        ruc: "string",
        businessName: "string",
        whatsappNumber: "string",
        logoUrl: "string (optional)",
        logoHorizontalUrl: "string (optional)",
        logoSquareUrl: "string (optional)"
      }
    },
    {
      collectionName: "shipping_config",
      documentId: "'default'",
      fields: {
        shalomEnabled: "boolean",
        shalomNotes: "string (optional)",
        olvaEnabled: "boolean",
        olvaNotes: "string (optional)",
        deliveryLimaEnabled: "boolean",
        deliveryLimaNotes: "string (optional)",
        deliveryLimaCost: "number",
        tiendaEnabled: "boolean",
        tiendaNotes: "string (optional)",
        tiendaAddress: "string",
        tiendaSchedule: "string",
        cutoffTime: "string (e.g. '14:00')"
      }
    },
    {
      collectionName: "agencies_cache",
      documentId: "'shalom' | 'olva'",
      fields: {
        lastSynced: "string (ISO)",
        count: "number",
        agencies: "Array<Agency>"
      }
    }
  ]
};

/**
 * HELPER DE GENERACIÓN DE MODELO DE DATOS INICIAL (SEED)
 */
export function generateInitialDeploymentData() {
  return {
    version: "2026.1.0",
    generatedAt: new Date().toISOString(),
    sql: SQL_INIT_SCRIPT,
    firestore: FIRESTORE_SCHEMA,
    defaultShippingConfig: {
      shalomEnabled: true,
      olvaEnabled: true,
      deliveryLimaEnabled: true,
      tiendaEnabled: true,
      deliveryLimaCost: 12.00,
      cutoffTime: "14:00",
      tiendaAddress: "Av. Las Palmeras 3829, Los Olivos, Lima",
      tiendaSchedule: "Lunes a Sábado de 9:00 am a 8:00 pm"
    },
    defaultStoreSettings: {
      name: "Amore Salon",
      businessName: "AMORE SALON PERU S.A.C.",
      ruc: "20608934512",
      phone: "987654321",
      whatsappNumber: "51987654321",
      address: "Av. Las Palmeras 3829",
      city: "Lima, Perú",
      logoUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop&q=80"
    }
  };
}
