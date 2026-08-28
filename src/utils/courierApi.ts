import { Agency } from '../types';
import { SHALOM_AGENCIES, OLVA_AGENCIES } from '../data/agencies';
import { MARVISUR_AGENCIES } from '../data/marvisurAgencies';
import { saveAgenciesToDatabase } from './dbApi';

export const STORAGE_KEY_SHALOM_AGENCIES = 'logiperu_shalom_agencies_v1';
export const STORAGE_KEY_MARVISUR_AGENCIES = 'logiperu_marvisur_agencies_v1';
export const STORAGE_KEY_OLVA_AGENCIES = 'logiperu_olva_agencies_v1';
export const STORAGE_KEY_LAST_SYNC = 'logiperu_agencies_last_sync_v1';

export interface SyncResult {
  success: boolean;
  shalomCount: number;
  marvisurCount: number;
  olvaCount: number;
  shalomSource: 'live_api' | 'contingency_fallback';
  marvisurSource: 'live_api' | 'contingency_fallback';
  olvaSource: 'live_api' | 'contingency_fallback';
  timestamp: string;
  message?: string;
}

/**
 * Universal normalizer for any courier agency object (Shalom, Marvisur, Olva or custom format)
 */
export function normalizeAgencyItem(item: any, fallbackCourier: 'shalom' | 'marvisur' | 'olva' = 'shalom', index: number = 0): Agency | null {
  if (!item || typeof item !== 'object') return null;

  const rawName = item.name || item.nombre || item.nombres || item.nombre_agencia || item.nom_agencia || item.local || item.descripcion || item.title || '';
  const rawAddress = item.address || item.direccion || item.dir || item.direccion_agencia || item.ubicacion || item.location || '';
  const rawDept = item.department || item.departamento || item.dep || item.depto || item.departamento_nombre || (rawName.includes('/') ? rawName.split('/')[0].trim() : 'Lima');
  const rawProv = item.province || item.provincia || item.prov || item.provincia_nombre || (rawName.includes('/') ? rawName.split('/')[1]?.trim() : rawDept);
  const rawDist = item.district || item.distrito || item.dist || item.distrito_nombre || (rawName.includes('/') ? rawName.split('/')[2]?.trim() : rawProv);
  const rawCode = item.code || item.codigo || item.cod || item.id_agencia || item.cod_agencia || item.codigo_agencia || undefined;
  const rawSchedule = item.schedule || item.horario || item.horarios || item.atencion || 'Lun - Sáb: 8:00 AM - 7:00 PM';
  const rawPhone = item.phone || item.telefono || item.telefonos || item.celular || undefined;
  const rawUbigeo = item.ubigeo || item.cod_ubigeo || item.ubigeo_inei || item.id_ubigeo || undefined;
  const rawRef = item.reference || item.referencia || item.ref || item.referencias || undefined;
  const rawLat = item.lat != null ? Number(item.lat) : (item.latitude != null ? Number(item.latitude) : undefined);
  const rawLng = item.lng != null ? Number(item.lng) : (item.longitude != null ? Number(item.longitude) : undefined);

  let tipo: 'TIENDA' | 'AGENTE' | undefined = undefined;
  if (fallbackCourier === 'olva' || item.tipo) {
    const tipoStr = String(item.tipo || (rawName.toLowerCase().includes('agente') ? 'AGENTE' : 'TIENDA')).toUpperCase();
    tipo = tipoStr.includes('AGENTE') ? 'AGENTE' : 'TIENDA';
  }

  // If there's neither name nor address, we can't use it
  if (!rawName && !rawAddress) return null;

  return {
    id: String(item.id || item.codigo || `${fallbackCourier}-${Date.now()}-${index}`),
    name: rawName || `${rawDept} / ${rawProv} / ${rawDist}`,
    address: rawAddress || 'Dirección de agencia',
    reference: rawRef,
    department: rawDept || 'Lima',
    province: rawProv || 'Lima',
    district: rawDist || 'Principal',
    code: rawCode ? String(rawCode) : undefined,
    tipo,
    ubigeo: rawUbigeo ? String(rawUbigeo) : undefined,
    schedule: rawSchedule,
    phone: rawPhone ? String(rawPhone) : undefined,
    lat: isNaN(rawLat as number) ? undefined : rawLat,
    lng: isNaN(rawLng as number) ? undefined : rawLng,
  };
}

/**
 * Universal JSON parser that handles arrays, nested objects, Shalom responses, Marvisur and Olva responses
 */
export function parseAgenciesFromJSON(rawData: any, courier: 'shalom' | 'marvisur' | 'olva' = 'shalom'): Agency[] {
  let list: any[] = [];

  if (typeof rawData === 'string') {
    try {
      rawData = JSON.parse(rawData);
    } catch {
      return [];
    }
  }

  if (Array.isArray(rawData)) {
    list = rawData;
  } else if (rawData && typeof rawData === 'object') {
    if (Array.isArray(rawData.data)) list = rawData.data;
    else if (Array.isArray(rawData.agencias)) list = rawData.agencias;
    else if (Array.isArray(rawData.agencies)) list = rawData.agencies;
    else if (Array.isArray(rawData.sucursales)) list = rawData.sucursales;
    else if (Array.isArray(rawData.items)) list = rawData.items;
    else if (Array.isArray(rawData.results)) list = rawData.results;
    else if (Array.isArray(rawData.locales)) list = rawData.locales;
    else if (Array.isArray(rawData.response)) list = rawData.response;
    else {
      // If it's a key-value object of agencies
      const values = Object.values(rawData);
      if (values.length > 0 && typeof values[0] === 'object') {
        list = values;
      }
    }
  }

  const results: Agency[] = [];
  list.forEach((item, idx) => {
    const normalized = normalizeAgencyItem(item, courier, idx);
    if (normalized) {
      results.push(normalized);
    }
  });

  return results;
}

/**
 * Fetches Shalom agencies from live proxy endpoint with fallback
 */
export async function fetchShalomAgencies(query: string = ''): Promise<{ data: Agency[]; source: 'live_api' | 'contingency_fallback' }> {
  try {
    const res = await fetch(`/api/shalom/agencias?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return {
          data: json.data,
          source: json.source || 'live_api',
        };
      }
    }
  } catch (err) {
    console.warn('Live Shalom API fetch failed, using local contingency:', err);
  }

  // Contingency fallback from localStorage or constants
  const saved = localStorage.getItem(STORAGE_KEY_SHALOM_AGENCIES);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { data: parsed, source: 'contingency_fallback' };
      }
    } catch {}
  }

  return { data: SHALOM_AGENCIES, source: 'contingency_fallback' };
}

/**
 * Fetches Expreso Marvisur agencies from live proxy endpoint with fallback
 */
export async function fetchMarvisurAgencies(query: string = ''): Promise<{ data: Agency[]; source: 'live_api' | 'contingency_fallback' }> {
  try {
    const res = await fetch(`/api/marvisur/agencias?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return {
          data: json.data,
          source: json.source || 'live_api',
        };
      }
    }
  } catch (err) {
    console.warn('Live Marvisur API fetch failed, using local contingency:', err);
  }

  // Contingency fallback from localStorage or constants
  const saved = localStorage.getItem(STORAGE_KEY_MARVISUR_AGENCIES);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { data: parsed, source: 'contingency_fallback' };
      }
    } catch {}
  }

  return { data: MARVISUR_AGENCIES, source: 'contingency_fallback' };
}

/**
 * Fetches Olva agencies from live proxy endpoint with fallback
 */
export async function fetchOlvaAgencies(params?: {
  tipo?: string;
  nombres?: string;
  cod_dep?: string;
}): Promise<{ data: Agency[]; source: 'live_api' | 'contingency_fallback' }> {
  try {
    const query = new URLSearchParams();
    if (params?.tipo) query.append('tipo', params.tipo);
    if (params?.nombres) query.append('nombres', params.nombres);
    if (params?.cod_dep) query.append('cod_dep', params.cod_dep);

    const res = await fetch(`/api/olva/agencias?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return {
          data: json.data,
          source: json.source || 'live_api',
        };
      }
    }
  } catch (err) {
    console.warn('Live Olva API fetch failed, using local contingency:', err);
  }

  // Contingency fallback from localStorage or constants
  const saved = localStorage.getItem(STORAGE_KEY_OLVA_AGENCIES);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { data: parsed, source: 'contingency_fallback' };
      }
    } catch {}
  }

  return { data: OLVA_AGENCIES, source: 'contingency_fallback' };
}

/**
 * Synchronizes and updates the local contingency database for all couriers
 */
export async function syncCourierAgencies(): Promise<SyncResult> {
  const timestamp = new Date().toISOString();

  const [shalomRes, marvisurRes, olvaRes] = await Promise.all([
    fetchShalomAgencies(),
    fetchMarvisurAgencies(),
    fetchOlvaAgencies(),
  ]);

  // Persist to local contingency database (localStorage)
  localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(shalomRes.data));
  localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(marvisurRes.data));
  localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(olvaRes.data));
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, timestamp);

  // Sincronizar en la base de datos Supabase Cloud (PostgreSQL)
  saveAgenciesToDatabase(shalomRes.data, 'shalom').catch(() => {});
  saveAgenciesToDatabase(marvisurRes.data, 'marvisur').catch(() => {});
  saveAgenciesToDatabase(olvaRes.data, 'olva').catch(() => {});

  return {
    success: true,
    shalomCount: shalomRes.data.length,
    marvisurCount: marvisurRes.data.length,
    olvaCount: olvaRes.data.length,
    shalomSource: shalomRes.source,
    marvisurSource: marvisurRes.source,
    olvaSource: olvaRes.source,
    timestamp,
  };
}

