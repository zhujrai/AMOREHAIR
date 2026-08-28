import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  X, 
  MapPin, 
  Building2, 
  Check, 
  ChevronRight, 
  Navigation, 
  Compass, 
  Clock, 
  Phone, 
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Agency } from '../types';

interface AgencySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencies: Agency[];
  selectedAgencyId?: string;
  onSelect: (agency: Agency) => void;
  courierName: 'Shalom' | 'Olva' | 'Marvisur' | 'Expreso Marvisur' | string;
  isDark: boolean;
}

// Fallback approximate coordinates for districts and departments
const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  // Lima Norte
  'los olivos': { lat: -11.9700, lng: -77.0700 },
  'san martin de porres': { lat: -11.9800, lng: -77.0800 },
  'smp': { lat: -11.9800, lng: -77.0800 },
  'comas': { lat: -11.9300, lng: -77.0500 },
  'independencia': { lat: -11.9900, lng: -77.0500 },
  'puente piedra': { lat: -11.8650, lng: -77.0750 },
  'carabayllo': { lat: -11.8900, lng: -77.0300 },
  'ancon': { lat: -11.7700, lng: -77.1700 },
  'santa rosa': { lat: -11.8100, lng: -77.1600 },
  
  // Lima Centro
  'lima': { lat: -12.0464, lng: -77.0428 },
  'lima cercado': { lat: -12.0464, lng: -77.0428 },
  'cercado de lima': { lat: -12.0464, lng: -77.0428 },
  'la victoria': { lat: -12.0650, lng: -77.0200 },
  'brena': { lat: -12.0580, lng: -77.0500 },
  'rimac': { lat: -12.0300, lng: -77.0300 },
  'lince': { lat: -12.0850, lng: -77.0350 },
  'jesus maria': { lat: -12.0750, lng: -77.0500 },
  'pueblo libre': { lat: -12.0750, lng: -77.0650 },
  'magdalena del mar': { lat: -12.0900, lng: -77.0700 },
  'magdalena': { lat: -12.0900, lng: -77.0700 },
  'san miguel': { lat: -12.0800, lng: -77.0900 },
  
  // Lima Este
  'san juan de lurigancho': { lat: -11.9800, lng: -76.9900 },
  'sjl': { lat: -11.9800, lng: -76.9900 },
  'ate': { lat: -12.0250, lng: -76.9150 },
  'vitarte': { lat: -12.0250, lng: -76.9150 },
  'santa anita': { lat: -12.0450, lng: -76.9700 },
  'el agustino': { lat: -12.0450, lng: -77.0000 },
  'chaclacayo': { lat: -11.9700, lng: -76.7700 },
  'chosica': { lat: -11.9400, lng: -76.7000 },
  'lurigancho': { lat: -11.9400, lng: -76.7000 },
  'cieneguilla': { lat: -12.0900, lng: -76.7700 },

  // Lima Sur
  'san juan de miraflores': { lat: -12.1600, lng: -76.9700 },
  'sjm': { lat: -12.1600, lng: -76.9700 },
  'villa maria del triunfo': { lat: -12.1800, lng: -76.9400 },
  'vmt': { lat: -12.1800, lng: -76.9400 },
  'villa el salvador': { lat: -12.2100, lng: -76.9300 },
  'ves': { lat: -12.2100, lng: -76.9300 },
  'chorrillos': { lat: -12.1800, lng: -77.0200 },
  'barranco': { lat: -12.1450, lng: -77.0200 },
  'miraflores': { lat: -12.1200, lng: -77.0300 },
  'san isidro': { lat: -12.0950, lng: -77.0350 },
  'surco': { lat: -12.1300, lng: -76.9900 },
  'santiago de surco': { lat: -12.1300, lng: -76.9900 },
  'surquillo': { lat: -12.1100, lng: -77.0150 },
  'san borja': { lat: -12.0900, lng: -77.0000 },
  'lurin': { lat: -12.2700, lng: -76.8700 },
  'pachacamac': { lat: -12.2300, lng: -76.8600 },
  'punta hermosa': { lat: -12.3300, lng: -76.8200 },
  'san bartolo': { lat: -12.3800, lng: -76.7800 },
  'pucusana': { lat: -12.4800, lng: -76.7900 },

  // Callao
  'callao': { lat: -12.0550, lng: -77.1150 },
  'bellavista': { lat: -12.0600, lng: -77.1250 },
  'la perla': { lat: -12.0700, lng: -77.1300 },
  'la punta': { lat: -12.0700, lng: -77.1600 },
  'carmen de la legua': { lat: -12.0450, lng: -77.0950 },
  'ventanilla': { lat: -11.8800, lng: -77.1300 },
  'mi peru': { lat: -11.8500, lng: -77.1200 },

  // Departamentos y Ciudades Principales del Perú
  'arequipa': { lat: -16.4090, lng: -71.5375 },
  'trujillo': { lat: -8.1116, lng: -79.0287 },
  'la libertad': { lat: -8.1116, lng: -79.0287 },
  'chiclayo': { lat: -6.7714, lng: -79.8409 },
  'lambayeque': { lat: -6.7714, lng: -79.8409 },
  'piura': { lat: -5.1945, lng: -80.6328 },
  'cusco': { lat: -13.5319, lng: -71.9675 },
  'cuzco': { lat: -13.5319, lng: -71.9675 },
  'huancayo': { lat: -12.0651, lng: -75.2049 },
  'junin': { lat: -12.0651, lng: -75.2049 },
  'ica': { lat: -14.0678, lng: -75.7286 },
  'chincha': { lat: -13.4178, lng: -76.1328 },
  'pisco': { lat: -13.7103, lng: -76.2053 },
  'chimbote': { lat: -9.0745, lng: -78.5936 },
  'huaraz': { lat: -9.5278, lng: -77.5278 },
  'ancash': { lat: -9.5278, lng: -77.5278 },
  'tacna': { lat: -18.0066, lng: -70.2463 },
  'juliaca': { lat: -15.4984, lng: -70.1332 },
  'puno': { lat: -15.8422, lng: -70.0199 },
  'iquitos': { lat: -3.7491, lng: -73.2538 },
  'loreto': { lat: -3.7491, lng: -73.2538 },
  'pucallpa': { lat: -8.3791, lng: -74.5539 },
  'ucayali': { lat: -8.3791, lng: -74.5539 },
  'tarapoto': { lat: -6.4853, lng: -76.3683 },
  'san martin': { lat: -6.4853, lng: -76.3683 },
  'cajamarca': { lat: -7.1617, lng: -78.5128 },
  'jaen': { lat: -5.7078, lng: -78.8078 },
  'ayacucho': { lat: -13.1588, lng: -74.2239 },
  'huanuco': { lat: -9.9306, lng: -76.2422 },
  'tingo maria': { lat: -9.2961, lng: -75.9986 },
  'tumbes': { lat: -3.5669, lng: -80.4515 },
  'moquegua': { lat: -17.1983, lng: -70.9356 },
  'ilo': { lat: -17.6394, lng: -71.3375 },
  'pasco': { lat: -10.6675, lng: -76.2561 },
  'cerro de pasco': { lat: -10.6675, lng: -76.2561 },
  'abancay': { lat: -13.6339, lng: -72.8814 },
  'apurimac': { lat: -13.6339, lng: -72.8814 },
  'huancavelica': { lat: -12.7864, lng: -74.9760 },
  'puerto maldonado': { lat: -12.5933, lng: -69.1891 },
  'madre de dios': { lat: -12.5933, lng: -69.1891 },
  'chachapoyas': { lat: -6.2294, lng: -77.8728 },
  'amazonas': { lat: -6.2294, lng: -77.8728 },
};

/**
 * Fórmula de Haversine para calcular distancia esférica en kilómetros
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalizar texto para búsqueda insensible a tildes y mayúsculas
const normalize = (str: string) => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const AgencySearchModal: React.FC<AgencySearchModalProps> = ({
  isOpen,
  onClose,
  agencies,
  selectedAgencyId,
  onSelect,
  courierName,
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'gps'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado local sincronizado con la API en vivo si no se encuentra
  const [localAgencies, setLocalAgencies] = useState<Agency[]>(agencies);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSyncNotice, setOnlineSyncNotice] = useState<string | null>(null);

  // Estado de geolocalización GPS
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isShalom = courierName === 'Shalom';
  const isMarvisur = courierName.toLowerCase().includes('marvisur');
  const isOlva = courierName.toLowerCase().includes('olva');

  // Sincronizar cambios de agencies de props
  useEffect(() => {
    setLocalAgencies((prev) => {
      const existingIds = new Set(prev.map(a => a.id));
      const toAdd = agencies.filter(a => !existingIds.has(a.id));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });
  }, [agencies]);

  // Consulta en línea automática a la API de Shalom / Marvisur / Olva si busca un término
  useEffect(() => {
    const term = searchTerm.trim();
    if (!isOpen || term.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearchingOnline(true);
        const endpoint = isShalom 
          ? '/api/shalom/agencias' 
          : isMarvisur 
            ? '/api/marvisur/agencias' 
            : '/api/olva/agencias';
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(term)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const apiAgencies: Agency[] = json.data;
            setLocalAgencies((prev) => {
              const existingIds = new Set(prev.map(a => a.id));
              const existingNames = new Set(prev.map(a => normalize(a.name)));
              const newAgencies = apiAgencies.filter(
                a => !existingIds.has(a.id) && !existingNames.has(normalize(a.name))
              );
              if (newAgencies.length > 0) {
                setOnlineSyncNotice(`✨ Sincronizadas ${newAgencies.length} agencias en vivo`);
                setTimeout(() => setOnlineSyncNotice(null), 3500);
                return [...prev, ...newAgencies];
              }
              return prev;
            });
          }
        }
      } catch {
        // Fallback silencioso
      } finally {
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, isShalom, isMarvisur]);

  // Obtener coordenadas de una agencia (reales o estimadas por distrito)
  const getAgencyCoords = (agency: Agency): { lat: number; lng: number } => {
    if (agency.lat != null && agency.lng != null) {
      return { lat: agency.lat, lng: agency.lng };
    }

    const distNorm = normalize(agency.district);
    const provNorm = normalize(agency.province);
    const deptNorm = normalize(agency.department);
    const nameNorm = normalize(agency.name);

    // Buscar coincidencia en diccionario de distritos/ciudades
    if (DISTRICT_COORDS[distNorm]) return DISTRICT_COORDS[distNorm];
    if (DISTRICT_COORDS[provNorm]) return DISTRICT_COORDS[provNorm];
    if (DISTRICT_COORDS[deptNorm]) return DISTRICT_COORDS[deptNorm];

    for (const [key, coords] of Object.entries(DISTRICT_COORDS)) {
      if (nameNorm.includes(key) || distNorm.includes(key)) {
        return coords;
      }
    }

    // Default Centro de Lima
    return { lat: -12.0464, lng: -77.0428 };
  };

  // Función para solicitar ubicación GPS
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador o dispositivo no soporta geolocalización.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Permiso de ubicación denegado. Puedes buscar tu agencia escribiendo en el buscador.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('No se pudo obtener tu ubicación precisa. Intenta con la búsqueda por texto.');
        } else {
          setLocationError('Tiempo de espera agotado al obtener el GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Activar GPS automáticamente al cambiar a la pestaña GPS si no se tienen coordenadas
  useEffect(() => {
    if (activeTab === 'gps' && !userCoords && !isLocating && !locationError) {
      handleRequestLocation();
    }
  }, [activeTab]);

  // ================= MODALIDAD 1: 5 AGENCIAS MÁS CERCANAS POR GPS ================= //
  const nearestAgencies = useMemo(() => {
    if (!userCoords) return [];

    const withDist = localAgencies.map((agency) => {
      const coords = getAgencyCoords(agency);
      const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng);
      return {
        agency: {
          ...agency,
          distanceKm: dist,
        },
        dist,
      };
    });

    // Ordenar de menor a mayor distancia
    withDist.sort((a, b) => a.dist - b.dist);

    // Tomar las 5 agencias más cercanas
    return withDist.slice(0, 5).map((item) => item.agency);
  }, [localAgencies, userCoords]);

  // ================= MODALIDAD 2: BÚSQUEDA TIPO GOOGLE (Nombre > Dirección > Referencia) ================= //
  const searchResults = useMemo(() => {
    const term = normalize(searchTerm);
    if (!term) return localAgencies;

    const queryWords = term.split(/\s+/).filter(Boolean);
    const scored: Array<{ agency: Agency; score: number; matchReasons: string[] }> = [];

    for (const agency of localAgencies) {
      const name = normalize(agency.name);
      const address = normalize(agency.address);
      const reference = normalize(agency.reference || '');
      const district = normalize(agency.district);
      const province = normalize(agency.province);
      const department = normalize(agency.department);
      const code = normalize(agency.code || '');

      let score = 0;
      const matchReasons: string[] = [];

      // Evaluar coincidencia del término completo
      const nameExact = name === term;
      const nameStarts = name.startsWith(term);
      const nameIncludes = name.includes(term);

      const addressStarts = address.startsWith(term);
      const addressIncludes = address.includes(term);

      const refIncludes = reference.includes(term);
      const locationIncludes = district.includes(term) || province.includes(term) || department.includes(term);
      const codeIncludes = code.includes(term);

      // 1. PRIMERA PRIORIDAD: NOMBRE (Peso 160)
      if (nameExact) {
        score += 200;
        matchReasons.push('Nombre exacto');
      } else if (nameStarts) {
        score += 160;
        matchReasons.push('Nombre');
      } else if (nameIncludes) {
        score += 120;
        matchReasons.push('Nombre');
      }

      // 2. SEGUNDA PRIORIDAD: DIRECCIÓN (Peso 90)
      if (addressStarts) {
        score += 90;
        matchReasons.push('Dirección');
      } else if (addressIncludes) {
        score += 70;
        matchReasons.push('Dirección');
      }

      // 3. TERCERA PRIORIDAD: REFERENCIA & CRUCES (Peso 60)
      if (refIncludes) {
        score += 60;
        matchReasons.push('Referencia');
      }

      // Distrito / Provincia / Código
      if (district.startsWith(term)) {
        score += 45;
        matchReasons.push('Distrito');
      } else if (locationIncludes) {
        score += 35;
      }

      if (codeIncludes) {
        score += 80;
        matchReasons.push('Código');
      }

      // Coincidencia por palabras individuales (tipo Google multi-palabra, ej: "unger 64" o "proceres puertas pro")
      if (queryWords.length > 1) {
        let wordsMatched = 0;
        for (const w of queryWords) {
          if (name.includes(w)) {
            score += 30;
            wordsMatched++;
          } else if (address.includes(w)) {
            score += 20;
            wordsMatched++;
          } else if (reference.includes(w)) {
            score += 15;
            wordsMatched++;
          } else if (district.includes(w) || province.includes(w)) {
            score += 10;
            wordsMatched++;
          }
        }
        if (wordsMatched === queryWords.length) {
          score += 50; // Bonus si contiene todas las palabras de la consulta
        }
      }

      if (score > 0) {
        scored.push({ agency, score, matchReasons });
      }
    }

    // Ordenar descendente por puntuación de relevancia
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.agency);
  }, [localAgencies, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl transition-all max-h-[90vh] flex flex-col ${
          isDark 
            ? 'bg-[#141418] text-zinc-100 border border-zinc-800' 
            : 'bg-white text-zinc-900 border border-zinc-200'
        }`}
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-zinc-400/40 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header con identidad de la empresa de envíos */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              isShalom 
                ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                : isMarvisur 
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white">
                  Sucursales {courierName}
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isShalom 
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400' 
                    : isMarvisur 
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' 
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}>
                  {agencies.length} locales
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Elige tu agencia por GPS cercano o buscador inteligente
              </p>
            </div>
          </div>

          <button
            id="close-agency-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SELECTOR DE MODALIDAD: [ 📍 5 Más Cercanas GPS ] vs [ 🔍 Buscador Inteligente ] */}
        <div className="p-3 sm:p-4 bg-zinc-50 dark:bg-[#19191F] border-b border-zinc-200/80 dark:border-zinc-800/80 flex gap-2">
          <button
            id="tab-agency-search-btn"
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'search'
                ? isDark
                  ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700'
                  : 'bg-white text-zinc-950 shadow-xs border border-zinc-300'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <Search className="w-4 h-4 text-zinc-400" />
            <span>Buscador Tipo Google</span>
          </button>

          <button
            id="tab-agency-gps-btn"
            type="button"
            onClick={() => {
              setActiveTab('gps');
              if (!userCoords && !isLocating) {
                handleRequestLocation();
              }
            }}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'gps'
                ? isShalom
                  ? 'bg-red-600 text-white shadow-xs'
                  : isMarvisur
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-amber-600 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>5 Más Cercanas (GPS)</span>
          </button>
        </div>

        {/* CUERPO SEGÚN MODALIDAD */}
        {activeTab === 'search' ? (
          // ================= MODALIDAD 2: BUSCADOR TIPO GOOGLE =================
          <>
            {/* Input de Búsqueda Jerárquica */}
            <div className="p-3.5 sm:p-4 border-b border-zinc-100 dark:border-zinc-800/80 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="agency-search-input"
                  type="text"
                  placeholder="Ej: Pro, Gerardo Unger, Santa Luisa, Los Olivos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-9 py-2.5 rounded-2xl text-sm font-medium focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-500 border border-zinc-800' 
                      : 'bg-zinc-100 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-black border border-zinc-200'
                  }`}
                  autoFocus
                />
                {searchTerm && (
                  <button
                    id="clear-agency-search-btn"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tips de búsqueda rápida & Feedback de Sincronización Online */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 px-1">
                <span>Prioriza: <b>1. Nombre</b> &gt; <b>2. Dirección</b> &gt; <b>3. Referencia</b></span>
                <div className="flex items-center gap-1.5 font-semibold">
                  {isSearchingOnline && (
                    <span className="text-[10px] text-amber-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      Consultando en línea...
                    </span>
                  )}
                  <span>{searchResults.length} resultados</span>
                </div>
              </div>

              {onlineSyncNotice && (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <span>{onlineSyncNotice}</span>
                </div>
              )}
            </div>

            {/* Lista de Resultados de Búsqueda */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {searchResults.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">No encontramos coincidencias</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    Intenta buscando por nombre del local (ej. &ldquo;Pro&rdquo; o &ldquo;Unger&rdquo;) o por el nombre de tu distrito o avenida.
                  </p>
                </div>
              ) : (
                searchResults.map((agency) => {
                  const isSelected = selectedAgencyId === agency.id;
                  const locationStr = [agency.district, agency.province].filter(Boolean).join(', ');

                  return (
                    <button
                      key={agency.id}
                      id={`agency-item-${agency.id}`}
                      type="button"
                      onClick={() => {
                        onSelect(agency);
                        onClose();
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start justify-between gap-3 cursor-pointer border ${
                        isSelected
                          ? isShalom
                            ? 'bg-red-500/10 border-red-500 text-red-950 dark:text-red-100 ring-2 ring-red-500/30'
                            : isMarvisur
                              ? 'bg-blue-500/10 border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/30'
                              : 'bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/30'
                          : isDark
                            ? 'bg-zinc-900/70 border-zinc-800/80 hover:bg-zinc-800/90 text-zinc-200 hover:border-zinc-700'
                            : 'bg-zinc-50/80 border-zinc-200/80 hover:bg-zinc-100 text-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        {/* Nombre del local y Ubicación */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-zinc-900 dark:text-white leading-snug">
                            {agency.name}
                          </span>
                          {agency.tipo && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {agency.tipo}
                            </span>
                          )}
                        </div>

                        {locationStr && (
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            {locationStr}
                          </div>
                        )}

                        {/* Dirección puntual */}
                        <div className="flex items-start gap-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                          <MapPin className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                            isShalom ? 'text-red-500' : isMarvisur ? 'text-blue-500' : 'text-amber-500'
                          }`} />
                          <span className="line-clamp-2">{agency.address}</span>
                        </div>

                        {/* Referencia detallada si existe */}
                        {agency.reference && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 p-1.5 rounded-lg">
                            <span className="font-bold">Ref:</span> {agency.reference}
                          </div>
                        )}

                        {/* Horario y Teléfono */}
                        {(agency.schedule || agency.phone) && (
                          <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
                            {agency.schedule && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                <span>{agency.schedule}</span>
                              </div>
                            )}
                            {agency.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-zinc-400" />
                                <span>{agency.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center self-center pl-2 flex-shrink-0">
                        {isSelected ? (
                          <div className={`w-7 h-7 rounded-full ${
                            isShalom ? 'bg-red-600' : isMarvisur ? 'bg-blue-600' : 'bg-amber-600'
                          } text-white flex items-center justify-center shadow-xs`}>
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-xl bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          // ================= MODALIDAD 1: 5 AGENCIAS MÁS CERCANAS POR GPS =================
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3">
            {/* Estado de carga GPS */}
            {isLocating && (
              <div className="p-8 text-center space-y-3">
                <Loader2 className={`w-8 h-8 animate-spin mx-auto ${
                  isShalom ? 'text-red-500' : isMarvisur ? 'text-blue-500' : 'text-amber-500'
                }`} />
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Detectando tu ubicación GPS...</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Calculando distancias a todas las sucursales de {courierName} en Perú
                </p>
              </div>
            )}

            {/* Error de Geolocalización */}
            {locationError && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>No se pudo acceder a tu GPS</span>
                </div>
                <p>{locationError}</p>
                <div className="pt-1 flex gap-2">
                  <button
                    id="retry-gps-btn"
                    type="button"
                    onClick={handleRequestLocation}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer hover:bg-amber-700"
                  >
                    Reintentar GPS
                  </button>
                  <button
                    id="switch-to-search-btn"
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs cursor-pointer"
                  >
                    Usar buscador por texto
                  </button>
                </div>
              </div>
            )}

            {/* Botón para actualizar posición GPS */}
            {userCoords && !isLocating && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 text-xs">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold">Ubicación GPS activa</span>
                </div>
                <button
                  id="recalculate-gps-btn"
                  type="button"
                  onClick={handleRequestLocation}
                  className="font-bold text-[11px] underline cursor-pointer hover:text-emerald-400"
                >
                  Actualizar GPS
                </button>
              </div>
            )}

            {/* Listado de las 5 Agencias más Cercanas */}
            {nearestAgencies.length > 0 && !isLocating && (
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>5 Agencias más próximas a ti:</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </div>

                {nearestAgencies.map((agency, index) => {
                  const isSelected = selectedAgencyId === agency.id;
                  const distFormatted = agency.distanceKm != null
                    ? agency.distanceKm < 1
                      ? `${Math.round(agency.distanceKm * 1000)} metros`
                      : `${agency.distanceKm.toFixed(1)} km`
                    : '';

                  return (
                    <div
                      key={agency.id}
                      id={`nearest-agency-${agency.id}`}
                      className={`p-4 rounded-2xl transition-all border ${
                        isSelected
                          ? isShalom
                            ? 'bg-red-500/10 border-red-500 ring-2 ring-red-500/40'
                            : isMarvisur
                              ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/40'
                              : 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/40'
                          : isDark
                            ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                            : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          {/* Badge de Distancia GPS y Posición */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              index === 0
                                ? 'bg-emerald-500 text-white'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}>
                              <Navigation className="w-3 h-3" />
                              {index === 0 ? 'Más cercana: ' : ''}{distFormatted}
                            </span>
                            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                              {agency.district}, {agency.province}
                            </span>
                          </div>

                          {/* Nombre del local */}
                          <h4 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white leading-snug pt-0.5">
                            {agency.name}
                          </h4>

                          {/* Dirección */}
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                            {agency.address}
                          </p>

                          {/* Referencia si existe */}
                          {agency.reference && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 p-1.5 rounded-lg mt-1">
                              <span className="font-bold">Ref:</span> {agency.reference}
                            </p>
                          )}

                          {/* Horario */}
                          {agency.schedule && (
                            <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>{agency.schedule}</span>
                            </div>
                          )}
                        </div>

                        {/* Botón de selección directa */}
                        <div className="flex-shrink-0 self-center">
                          <button
                            id={`select-nearest-${agency.id}`}
                            type="button"
                            onClick={() => {
                              onSelect(agency);
                              onClose();
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? isShalom
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : isMarvisur
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-amber-600 text-white shadow-xs'
                                : isDark
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Elegida</span>
                              </>
                            ) : (
                              <span>Elegir</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>Cobertura nacional de sucursales verificadas</span>
          </div>
          <button
            id="cancel-agency-select-btn"
            type="button"
            onClick={onClose}
            className="font-semibold text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
