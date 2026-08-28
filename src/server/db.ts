import pg from 'pg';
import { Order, ShippingMethodsConfig, StoreSettings, Agency } from '../types.ts';
import { SHALOM_AGENCIES, OLVA_AGENCIES } from '../data/agencies.ts';

const { Pool } = pg;

// Supabase / PostgreSQL Connection Pool
let pool: pg.Pool | null = null;
let isInitialized = false;

export function sanitizeDatabaseUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  // Remove wrapping quotes if present
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  // Remove spaces before or after @
  url = url.replace(/\s+@/g, '@').replace(/@\s+/g, '@');
  return url;
}

const DEFAULT_DATABASE_URL = "postgresql://postgres:!*ws8JwxfK$TSCy@db.nltbacpanvmvtrzhjdxz.supabase.co:5432/postgres";

export function getDbPool(): pg.Pool | null {
  if (pool) return pool;

  const rawConnString = process.env.DATABASE_URL || 
                        process.env.SUPABASE_DB_URL || 
                        process.env.POSTGRES_URL || 
                        DEFAULT_DATABASE_URL;

  // Check if connection string is configured and not containing literal placeholder [YOUR-PASSWORD]
  if (!rawConnString || rawConnString.includes('[YOUR-PASSWORD]') || rawConnString.includes('YOUR-PASSWORD')) {
    return null;
  }

  const connString = sanitizeDatabaseUrl(rawConnString);

  try {
    pool = new Pool({
      connectionString: connString,
      ssl: {
        rejectUnauthorized: false // Required for Supabase cloud connections
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL client error (non-fatal):', err.message);
    });

    return pool;
  } catch (err: any) {
    console.error('Failed to create PostgreSQL pool (falling back to memory):', err.message);
    return null;
  }
}

/**
 * Initializes database structure and runs migrations if not already done.
 */
export async function initDatabaseStructure(): Promise<{ success: boolean; message: string; tables: string[] }> {
  const p = getDbPool();
  if (!p) {
    return {
      success: false,
      message: 'Base de datos no configurada en variables de entorno (DATABASE_URL)',
      tables: []
    };
  }

  const client = await p.connect();
  try {
    await client.query('BEGIN');

    // 1. Table: orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        dispatch_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'nuevos',
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        document_type VARCHAR(20) DEFAULT 'DNI',
        document_number VARCHAR(50) NOT NULL,
        shipping_type VARCHAR(50) NOT NULL,
        items_description TEXT,
        notes TEXT,
        whatsapp_sent BOOLEAN DEFAULT FALSE,
        tracking_number VARCHAR(100),
        agency JSONB,
        delivery_address TEXT,
        delivery_district VARCHAR(100),
        delivery_reference TEXT,
        is_cash_on_delivery BOOLEAN DEFAULT FALSE,
        cash_on_delivery_amount NUMERIC(10, 2),
        delivery_fee NUMERIC(10, 2),
        subtotal_amount NUMERIC(10, 2),
        total_amount NUMERIC(10, 2),
        payment_method VARCHAR(50),
        raw_data JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Ensure newly added columns exist in case table was created earlier
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10, 2);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_cash_on_delivery BOOLEAN DEFAULT FALSE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_on_delivery_amount NUMERIC(10, 2);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS raw_data JSONB;
    `);

    // 2. Table: shipping_config
    await client.query(`
      CREATE TABLE IF NOT EXISTS shipping_config (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        config JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Table: store_settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        settings JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Table: agencies
    await client.query(`
      CREATE TABLE IF NOT EXISTS agencies (
        id VARCHAR(100) PRIMARY KEY,
        courier VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        province VARCHAR(100),
        district VARCHAR(100),
        address TEXT,
        code VARCHAR(50),
        schedule TEXT,
        phone VARCHAR(50),
        tipo VARCHAR(50),
        ubigeo VARCHAR(50),
        data JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Table: authorized_users
    await client.query(`
      CREATE TABLE IF NOT EXISTS authorized_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        full_name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO authorized_users (email, role, full_name)
      VALUES 
        ('zhujrai@gmail.com', 'admin', 'Administrador AMORE'),
        ('zhujrai278@gmail.com', 'admin', 'Administrador AMORE'),
        ('lizlindaura@gmail.com', 'admin', 'Liz Lindaura'),
        ('albsal611@gmail.com', 'admin', 'Alberto Salinas')
      ON CONFLICT (email) DO UPDATE SET is_active = TRUE;
    `);

    // Indexes for fast queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_dispatch_date ON orders(dispatch_date);
      CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
      CREATE INDEX IF NOT EXISTS idx_agencies_courier ON agencies(courier);
      CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);
    `);

    await client.query('COMMIT');
    isInitialized = true;

    return {
      success: true,
      message: 'Estructura de tablas en Supabase / PostgreSQL creada e inicializada correctamente.',
      tables: ['orders', 'shipping_config', 'store_settings', 'agencies', 'authorized_users']
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error initializing Supabase schema:', err);
    return {
      success: false,
      message: `Error al crear estructura: ${err.message}`,
      tables: []
    };
  } finally {
    client.release();
  }
}

/**
 * Diagnostics & status check for the database
 */
export async function getDbStatus(): Promise<{
  connected: boolean;
  configured: boolean;
  host: string;
  database: string;
  orderCount?: number;
  agencyCount?: number;
  message: string;
}> {
  const connString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  const isConfigured = Boolean(connString && !connString.includes('[YOUR-PASSWORD]'));

  if (!isConfigured) {
    return {
      connected: false,
      configured: false,
      host: 'db.nltbacpanvmvtrzhjdxz.supabase.co',
      database: 'postgres (Supabase)',
      message: 'DATABASE_URL contiene placeholder o no está definida. Requiere contraseña de Supabase.'
    };
  }

  const p = getDbPool();
  if (!p) {
    return {
      connected: false,
      configured: true,
      host: 'db.nltbacpanvmvtrzhjdxz.supabase.co',
      database: 'postgres (Supabase)',
      message: 'No se pudo crear el pool de conexión a PostgreSQL.'
    };
  }

  try {
    const client = await p.connect();
    try {
      if (!isInitialized) {
        await initDatabaseStructure();
      }

      const ordersRes = await client.query('SELECT COUNT(*) FROM orders');
      const agenciesRes = await client.query('SELECT COUNT(*) FROM agencies');

      return {
        connected: true,
        configured: true,
        host: 'db.nltbacpanvmvtrzhjdxz.supabase.co',
        database: 'postgres (Supabase)',
        orderCount: parseInt(ordersRes.rows[0]?.count || '0', 10),
        agencyCount: parseInt(agenciesRes.rows[0]?.count || '0', 10),
        message: 'Conectado exitosamente a Supabase PostgreSQL.'
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      host: 'db.nltbacpanvmvtrzhjdxz.supabase.co',
      database: 'postgres (Supabase)',
      message: `Error al conectar a Supabase: ${err.message}`
    };
  }
}

// In-memory fallback if database not yet connected
let memoryOrders: Order[] = [];
let memoryShippingConfig: ShippingMethodsConfig = {
  shalom: true,
  marvisur: true,
  olva: true,
  delivery_lima: true,
  tienda: true,
  deliveryLimaCashOnDeliveryEnabled: true,
};
let memoryStoreSettings: StoreSettings = {
  storeName: 'AMORE SALON HAIR STYLE',
  ruc: '20601234567',
  phone: '940339934',
  whatsappNumber: '51940339934',
  address: 'Av. Garcilaso de la Vega 1348, Centro Comercial CyberPlaza Tienda 2B-114, Lima',
  city: 'Lima',
  openingHours: 'Lunes a Sábado: 9:00 AM - 8:00 PM',
  cutoffHour: 14,
};

// ================= ORDERS CRUD ================= //

export async function fetchAllOrders(): Promise<Order[]> {
  const p = getDbPool();
  if (!p) return memoryOrders;

  try {
    const { rows } = await p.query('SELECT * FROM orders ORDER BY created_at DESC');
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
      dispatchDate: r.dispatch_date,
      status: r.status,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      documentType: r.document_type,
      documentNumber: r.document_number,
      shippingType: r.shipping_type,
      itemsDescription: r.items_description,
      notes: r.notes,
      whatsappSent: Boolean(r.whatsapp_sent),
      trackingNumber: r.tracking_number,
      agency: r.agency,
      deliveryAddress: r.delivery_address,
      deliveryDistrict: r.delivery_district,
      deliveryReference: r.delivery_reference,
      isCashOnDelivery: Boolean(r.is_cash_on_delivery),
      cashOnDeliveryAmount: r.cash_on_delivery_amount ? parseFloat(r.cash_on_delivery_amount) : undefined,
      deliveryFee: r.delivery_fee ? parseFloat(r.delivery_fee) : undefined,
      subtotalAmount: r.subtotal_amount ? parseFloat(r.subtotal_amount) : (r.raw_data?.subtotalAmount ?? undefined),
      totalAmount: r.total_amount ? parseFloat(r.total_amount) : (r.raw_data?.totalAmount ?? undefined),
      paymentMethod: r.payment_method,
      isDeleted: Boolean(r.is_deleted || r.raw_data?.isDeleted),
      deletedAt: r.deleted_at?.toISOString?.() || r.deleted_at || r.raw_data?.deletedAt,
      previousStatus: r.previous_status || r.raw_data?.previousStatus || 'nuevos',
    }));
  } catch (err) {
    console.error('Error fetching orders from PostgreSQL:', err);
    return memoryOrders;
  }
}

export async function insertOrUpdateOrder(order: Order): Promise<Order> {
  const p = getDbPool();
  if (!p) {
    const idx = memoryOrders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      memoryOrders[idx] = order;
    } else {
      memoryOrders.unshift(order);
    }
    return order;
  }

  try {
    const query = `
      INSERT INTO orders (
        id, created_at, dispatch_date, status, customer_name, customer_phone,
        document_type, document_number, shipping_type, items_description, notes,
        whatsapp_sent, tracking_number, agency, delivery_address, delivery_district,
        delivery_reference, is_cash_on_delivery, cash_on_delivery_amount, delivery_fee,
        subtotal_amount, total_amount, payment_method, is_deleted, deleted_at, previous_status, raw_data, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        dispatch_date = EXCLUDED.dispatch_date,
        status = EXCLUDED.status,
        customer_name = EXCLUDED.customer_name,
        customer_phone = EXCLUDED.customer_phone,
        document_type = EXCLUDED.document_type,
        document_number = EXCLUDED.document_number,
        shipping_type = EXCLUDED.shipping_type,
        items_description = EXCLUDED.items_description,
        notes = EXCLUDED.notes,
        whatsapp_sent = EXCLUDED.whatsapp_sent,
        tracking_number = EXCLUDED.tracking_number,
        agency = EXCLUDED.agency,
        delivery_address = EXCLUDED.delivery_address,
        delivery_district = EXCLUDED.delivery_district,
        delivery_reference = EXCLUDED.delivery_reference,
        is_cash_on_delivery = EXCLUDED.is_cash_on_delivery,
        cash_on_delivery_amount = EXCLUDED.cash_on_delivery_amount,
        delivery_fee = EXCLUDED.delivery_fee,
        subtotal_amount = EXCLUDED.subtotal_amount,
        total_amount = EXCLUDED.total_amount,
        payment_method = EXCLUDED.payment_method,
        is_deleted = EXCLUDED.is_deleted,
        deleted_at = EXCLUDED.deleted_at,
        previous_status = EXCLUDED.previous_status,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      order.id,
      order.createdAt || new Date().toISOString(),
      order.dispatchDate,
      order.status || 'nuevos',
      order.customerName,
      order.customerPhone,
      order.documentType || 'DNI',
      order.documentNumber,
      order.shippingType,
      order.itemsDescription || '',
      order.notes || '',
      Boolean(order.whatsappSent),
      order.trackingNumber || null,
      order.agency ? JSON.stringify(order.agency) : null,
      order.deliveryAddress || null,
      order.deliveryDistrict || null,
      order.deliveryReference || null,
      Boolean(order.isCashOnDelivery),
      order.cashOnDeliveryAmount || null,
      order.deliveryFee || null,
      order.subtotalAmount || null,
      order.totalAmount || null,
      order.paymentMethod || null,
      Boolean(order.isDeleted),
      order.deletedAt || null,
      order.previousStatus || 'nuevos',
      JSON.stringify(order),
    ];

    await p.query(query, values);
    return order;
  } catch (err) {
    console.error('Error saving order to PostgreSQL:', err);
    // Keep in memory fallback
    const idx = memoryOrders.findIndex((o) => o.id === order.id);
    if (idx >= 0) memoryOrders[idx] = order;
    else memoryOrders.unshift(order);
    return order;
  }
}

export async function deleteOrder(id: string, permanent: boolean = false): Promise<boolean> {
  const p = getDbPool();
  if (!p) {
    if (permanent) {
      memoryOrders = memoryOrders.filter((o) => o.id !== id);
    } else {
      const idx = memoryOrders.findIndex((o) => o.id === id);
      if (idx >= 0) {
        memoryOrders[idx] = {
          ...memoryOrders[idx],
          isDeleted: true,
          deletedAt: new Date().toISOString(),
        };
      }
    }
    return true;
  }

  try {
    if (permanent) {
      await p.query('DELETE FROM orders WHERE id = $1', [id]);
    } else {
      await p.query('UPDATE orders SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
    }
    return true;
  } catch (err) {
    console.error('Error deleting order in PostgreSQL:', err);
    if (permanent) {
      memoryOrders = memoryOrders.filter((o) => o.id !== id);
    }
    return false;
  }
}

// ================= SHIPPING CONFIG CRUD ================= //

export async function fetchShippingConfig(): Promise<ShippingMethodsConfig> {
  const p = getDbPool();
  if (!p) return memoryShippingConfig;

  try {
    const { rows } = await p.query("SELECT config FROM shipping_config WHERE id = 'current'");
    if (rows.length > 0 && rows[0].config) {
      return rows[0].config as ShippingMethodsConfig;
    }
    return memoryShippingConfig;
  } catch {
    return memoryShippingConfig;
  }
}

export async function saveShippingConfig(config: ShippingMethodsConfig): Promise<ShippingMethodsConfig> {
  memoryShippingConfig = config;
  const p = getDbPool();
  if (!p) return config;

  try {
    await p.query(`
      INSERT INTO shipping_config (id, config, updated_at)
      VALUES ('current', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW();
    `, [JSON.stringify(config)]);
    return config;
  } catch (err) {
    console.error('Error saving shipping config to PostgreSQL:', err);
    return config;
  }
}

// ================= STORE SETTINGS CRUD ================= //

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const p = getDbPool();
  if (!p) return memoryStoreSettings;

  try {
    const { rows } = await p.query("SELECT settings FROM store_settings WHERE id = 'current'");
    if (rows.length > 0 && rows[0].settings) {
      return rows[0].settings as StoreSettings;
    }
    return memoryStoreSettings;
  } catch {
    return memoryStoreSettings;
  }
}

export async function saveStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
  memoryStoreSettings = settings;
  const p = getDbPool();
  if (!p) return settings;

  try {
    await p.query(`
      INSERT INTO store_settings (id, settings, updated_at)
      VALUES ('current', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();
    `, [JSON.stringify(settings)]);
    return settings;
  } catch (err) {
    console.error('Error saving store settings to PostgreSQL:', err);
    return settings;
  }
}

// ================= AUTHORIZED ADMIN USERS ================= //

export async function isAuthorizedAdminEmail(email: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const defaultList = [
    'zhujrai@gmail.com',
    'zhujrai278@gmail.com',
    'lizlindaura@gmail.com',
    'albsal611@gmail.com'
  ];
  
  const pool = getDbPool();
  if (!pool) {
    return defaultList.includes(cleanEmail);
  }

  try {
    const res = await pool.query(
      'SELECT email FROM authorized_users WHERE LOWER(email) = $1 AND (is_active IS NULL OR is_active = TRUE) LIMIT 1',
      [cleanEmail]
    );
    if (res.rows.length > 0) return true;
    // Fallback check against default allowed emails if table is empty
    return defaultList.includes(cleanEmail);
  } catch (err) {
    console.error('Error checking authorized_users in DB:', err);
    return defaultList.includes(cleanEmail);
  }
}

