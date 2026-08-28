import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { SHALOM_AGENCIES, OLVA_AGENCIES, MARVISUR_AGENCIES } from './src/data/agencies.ts';
import { 
  getDbStatus, 
  initDatabaseStructure, 
  fetchAllOrders, 
  insertOrUpdateOrder, 
  deleteOrder, 
  fetchShippingConfig, 
  saveShippingConfig, 
  fetchStoreSettings, 
  saveStoreSettings 
} from './src/server/db.ts';
import {
  verifyAdminPin,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  generateAdminSessionToken,
  validateAdminSessionToken
} from './src/server/auth.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Initialize DB structure automatically in background if configured
  initDatabaseStructure().catch((err) => {
    console.log('Database init check:', err.message);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'AMORE SALON Logistics, Supabase DB & Courier Proxy',
      timestamp: new Date().toISOString()
    });
  });

  // PIN-based Authentication with Rate Limiting and Timing Attack Protection
  app.post('/api/admin/login', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const { pin } = req.body;

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Acceso temporalmente bloqueado por demasiados intentos. Intenta de nuevo en ${rateCheck.lockoutSeconds} segundos.`,
        lockoutSeconds: rateCheck.lockoutSeconds,
        remainingAttempts: 0
      });
    }

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Ingresa el PIN de seguridad.',
        remainingAttempts: rateCheck.remainingAttempts
      });
    }

    const isValid = verifyAdminPin(pin);

    if (!isValid) {
      const record = recordFailedAttempt(ip);
      if (record.lockoutSeconds > 0) {
        return res.status(429).json({
          success: false,
          error: `PIN incorrecto. Límite de intentos alcanzado. Bloqueado por ${record.lockoutSeconds} segundos.`,
          lockoutSeconds: record.lockoutSeconds,
          remainingAttempts: 0
        });
      }

      return res.status(401).json({
        success: false,
        error: `PIN incorrecto. Te quedan ${record.remainingAttempts} ${record.remainingAttempts === 1 ? 'intento' : 'intentos'}.`,
        remainingAttempts: record.remainingAttempts,
        lockoutSeconds: 0
      });
    }

    // Success: reset rate limit & issue signed session token
    resetRateLimit(ip);
    const session = generateAdminSessionToken();

    return res.json({
      success: true,
      message: 'Acceso administrativo autorizado.',
      token: session.token,
      expiresAt: session.expiresAt
    });
  });

  app.post('/api/admin/verify-token', (req, res) => {
    const { token } = req.body;
    const isValid = validateAdminSessionToken(token);
    res.json({ valid: isValid });
  });

  // Database status and management endpoints
  app.get('/api/db/status', async (req, res) => {
    try {
      const status = await getDbStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ connected: false, message: err.message });
    }
  });

  app.post('/api/db/init', async (req, res) => {
    try {
      const result = await initDatabaseStructure();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Orders CRUD endpoints (Supabase / PostgreSQL with fallback)
  app.get('/api/orders', async (req, res) => {
    try {
      const orders = await fetchAllOrders();
      res.json({ success: true, count: orders.length, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const order = req.body;
      const saved = await insertOrUpdateOrder(order);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/orders/:id', async (req, res) => {
    try {
      const order = { ...req.body, id: req.params.id };
      const saved = await insertOrUpdateOrder(order);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/orders/:id', async (req, res) => {
    try {
      const isPermanent = req.query.permanent === 'true';
      const success = await deleteOrder(req.params.id, isPermanent);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Shipping Config endpoints
  app.get('/api/shipping-config', async (req, res) => {
    try {
      const config = await fetchShippingConfig();
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/shipping-config', async (req, res) => {
    try {
      const saved = await saveShippingConfig(req.body);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Store Settings endpoints
  app.get('/api/store-settings', async (req, res) => {
    try {
      const settings = await fetchStoreSettings();
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/store-settings', async (req, res) => {
    try {
      const saved = await saveStoreSettings(req.body);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PROXY: Shalom Agencies (Live API with Contingency Fallback)
  app.get('/api/shalom/agencias', async (req, res) => {
    try {
      const q = req.query.q ? String(req.query.q) : '';
      const apiKey = process.env.SHALOM_API_KEY || '';

      // Set a short abort timeout so request never hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const apiRes = await fetch(`https://api.shalom-api-peru.com/v1/agencies/search?q=${encodeURIComponent(q)}`, {
          headers: { 
            'X-API-Key': apiKey,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (apiRes.ok) {
          const rawData = await apiRes.json();
          const list = Array.isArray(rawData) ? rawData : (rawData.data || rawData.agencies || rawData.items || []);
          
          if (Array.isArray(list) && list.length > 0) {
            const normalized = list.map((item: any, idx: number) => ({
              id: item.id || item.codigo || `sh-api-${idx + 1}`,
              name: item.nombre || item.nombres || item.name || `${item.departamento || 'Lima'} / ${item.provincia || 'Lima'} / ${item.distrito || item.local || 'Central'}`,
              department: item.departamento || item.department || (item.name && item.name.includes('/') ? item.name.split('/')[0].trim() : 'Lima'),
              province: item.provincia || item.province || (item.name && item.name.includes('/') ? item.name.split('/')[1]?.trim() : 'Lima'),
              district: item.distrito || item.district || (item.name && item.name.includes('/') ? item.name.split('/')[2]?.trim() : 'Principal'),
              address: item.direccion || item.address || item.dir || 'Dirección de agencia Shalom',
              code: item.codigo || item.code || `SH-${idx + 1}`,
              schedule: item.horario || item.schedule || 'Lun - Sáb: 8:00 AM - 7:00 PM',
              phone: item.telefono || item.phone
            }));

            return res.json({
              success: true,
              source: 'live_api',
              count: normalized.length,
              data: normalized,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch {
        // Fall through to contingency database
      } finally {
        clearTimeout(timeoutId);
      }

      // Filter contingency database by query if query exists
      let result = SHALOM_AGENCIES;
      if (q.trim()) {
        const queryLower = q.toLowerCase();
        result = SHALOM_AGENCIES.filter(a => 
          a.name.toLowerCase().includes(queryLower) ||
          a.department.toLowerCase().includes(queryLower) ||
          a.province.toLowerCase().includes(queryLower) ||
          a.district.toLowerCase().includes(queryLower) ||
          a.address.toLowerCase().includes(queryLower) ||
          (a.code && a.code.toLowerCase().includes(queryLower))
        );
      }

      return res.json({
        success: true,
        source: 'contingency_fallback',
        count: result.length,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(200).json({
        success: true,
        source: 'contingency_fallback',
        count: SHALOM_AGENCIES.length,
        data: SHALOM_AGENCIES,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // PROXY: Expreso Marvisur Agencies (Live API / Sucursales Scraper with Contingency Fallback)
  app.get('/api/marvisur/agencias', async (req, res) => {
    try {
      const q = req.query.q ? String(req.query.q) : '';
      const apiKey = process.env.MARVISUR_API_KEY || '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const apiRes = await fetch(`https://api.expresomarvisur.com/v1/sucursales?q=${encodeURIComponent(q)}`, {
          headers: { 
            'X-API-Key': apiKey,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (apiRes.ok) {
          const rawData = await apiRes.json();
          const list = Array.isArray(rawData) ? rawData : (rawData.data || rawData.sucursales || rawData.agencias || rawData.items || []);
          
          if (Array.isArray(list) && list.length > 0) {
            const normalized = list.map((item: any, idx: number) => ({
              id: item.id || item.codigo || `mar-api-${idx + 1}`,
              name: item.nombre || item.nombres || item.name || `${item.departamento || 'Lima'} / ${item.provincia || 'Lima'} / ${item.distrito || item.local || 'Principal'}`,
              department: item.departamento || item.department || (item.name && item.name.includes('/') ? item.name.split('/')[0].trim() : 'Lima'),
              province: item.provincia || item.province || (item.name && item.name.includes('/') ? item.name.split('/')[1]?.trim() : 'Lima'),
              district: item.distrito || item.district || (item.name && item.name.includes('/') ? item.name.split('/')[2]?.trim() : 'Principal'),
              address: item.direccion || item.address || item.dir || 'Dirección de sucursal Marvisur',
              reference: item.referencia || item.reference,
              code: item.codigo || item.code || `MAR-${idx + 1}`,
              schedule: item.horario || item.schedule || 'Lun - Sáb: 8:00 AM - 7:00 PM',
              phone: item.telefono || item.phone
            }));

            return res.json({
              success: true,
              source: 'live_api',
              count: normalized.length,
              data: normalized,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch {
        // Fall through to contingency database
      } finally {
        clearTimeout(timeoutId);
      }

      // Filter contingency database by query if query exists
      let result = MARVISUR_AGENCIES;
      if (q.trim()) {
        const queryLower = q.toLowerCase();
        result = MARVISUR_AGENCIES.filter(a => 
          a.name.toLowerCase().includes(queryLower) ||
          a.department.toLowerCase().includes(queryLower) ||
          a.province.toLowerCase().includes(queryLower) ||
          a.district.toLowerCase().includes(queryLower) ||
          a.address.toLowerCase().includes(queryLower) ||
          (a.reference && a.reference.toLowerCase().includes(queryLower)) ||
          (a.code && a.code.toLowerCase().includes(queryLower))
        );
      }

      return res.json({
        success: true,
        source: 'contingency_fallback',
        count: result.length,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(200).json({
        success: true,
        source: 'contingency_fallback',
        count: MARVISUR_AGENCIES.length,
        data: MARVISUR_AGENCIES,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // PROXY: Olva Courier Agencies (Tiendas & Agentes with Ubigeo)
  app.get('/api/olva/agencias', async (req, res) => {
    try {
      const { cod_dep, tipo, nombres, limit } = req.query;
      const apiKey = process.env.OLVA_API_KEY || '';

      const queryParams = new URLSearchParams();
      if (cod_dep) queryParams.append('cod_dep', String(cod_dep));
      if (tipo) queryParams.append('tipo', String(tipo));
      if (nombres) queryParams.append('nombres', String(nombres));
      if (limit) queryParams.append('limit', String(limit));
      else queryParams.append('limit', '500');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const apiRes = await fetch(`https://api.olva-api-peru.com/v1/agencias?${queryParams.toString()}`, {
          headers: { 
            'X-API-Key': apiKey,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (apiRes.ok) {
          const rawData = await apiRes.json();
          const list = Array.isArray(rawData) ? rawData : (rawData.data || rawData.agencias || rawData.items || []);

          if (Array.isArray(list) && list.length > 0) {
            const normalized = list.map((item: any, idx: number) => {
              const itemTipo = (item.tipo || (item.nombres && item.nombres.toLowerCase().includes('agente') ? 'AGENTE' : 'TIENDA')).toUpperCase();
              return {
                id: item.codigo || item.id || `olva-api-${idx + 1}`,
                name: item.nombres || item.nombre || item.name || `Olva ${item.distrito || item.departamento || 'Agencia'}`,
                department: item.departamento || item.department || 'Lima',
                province: item.provincia || item.province || item.departamento || 'Lima',
                district: item.distrito || item.district || 'Principal',
                address: item.direccion || item.address || 'Dirección de sede Olva Courier',
                code: item.codigo || item.cod_ubigeo || item.id || `OLV-${idx + 1}`,
                tipo: itemTipo,
                ubigeo: item.cod_ubigeo || item.ubigeo,
                schedule: item.horario || item.schedule || 'Lun - Sáb: 8:30 AM - 6:30 PM',
                phone: item.telefono || item.phone
              };
            });

            return res.json({
              success: true,
              source: 'live_api',
              count: normalized.length,
              data: normalized,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch {
        // Fall through to contingency database
      } finally {
        clearTimeout(timeoutId);
      }

      // Filter contingency database based on query params if present
      let result = OLVA_AGENCIES;
      if (tipo) {
        result = result.filter(a => a.tipo?.toUpperCase() === String(tipo).toUpperCase());
      }
      if (nombres) {
        const nameQuery = String(nombres).toLowerCase();
        result = result.filter(a => 
          a.name.toLowerCase().includes(nameQuery) ||
          a.address.toLowerCase().includes(nameQuery) ||
          a.department.toLowerCase().includes(nameQuery) ||
          a.district.toLowerCase().includes(nameQuery)
        );
      }

      return res.json({
        success: true,
        source: 'contingency_fallback',
        count: result.length,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(200).json({
        success: true,
        source: 'contingency_fallback',
        count: OLVA_AGENCIES.length,
        data: OLVA_AGENCIES,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Vite middleware setup (development vs production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AMORE SALON Server & Courier Proxy running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
