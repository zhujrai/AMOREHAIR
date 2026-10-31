import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Settings2, 
  Building2, 
  Truck, 
  Bike, 
  Store, 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  Check, 
  Search, 
  RotateCcw,
  RefreshCw,
  MapPin,
  CheckCircle2,
  FileSpreadsheet,
  Globe2,
  Database,
  FileCode2,
  FileJson
} from 'lucide-react';
import { Agency, ShippingMethodsConfig, ShippingType } from '../types';
import { SHALOM_AGENCIES, OLVA_AGENCIES, MARVISUR_AGENCIES } from '../data/agencies';
import { 
  fetchShalomAgencies, 
  fetchOlvaAgencies,
  fetchMarvisurAgencies,
  syncCourierAgencies,
  parseAgenciesFromJSON,
  STORAGE_KEY_SHALOM_AGENCIES,
  STORAGE_KEY_OLVA_AGENCIES,
  STORAGE_KEY_MARVISUR_AGENCIES,
  STORAGE_KEY_LAST_SYNC 
} from '../utils/courierApi';

interface ShippingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  shippingConfig: ShippingMethodsConfig;
  onUpdateShippingConfig: (config: ShippingMethodsConfig) => void;
  shalomAgencies: Agency[];
  onUpdateShalomAgencies: (agencies: Agency[]) => void;
  olvaAgencies: Agency[];
  onUpdateOlvaAgencies: (agencies: Agency[]) => void;
  marvisurAgencies?: Agency[];
  onUpdateMarvisurAgencies?: (agencies: Agency[]) => void;
  isDark: boolean;
}

export const ShippingConfigModal: React.FC<ShippingConfigModalProps> = ({
  isOpen,
  onClose,
  shippingConfig,
  onUpdateShippingConfig,
  shalomAgencies,
  onUpdateShalomAgencies,
  olvaAgencies,
  onUpdateOlvaAgencies,
  marvisurAgencies = [],
  onUpdateMarvisurAgencies,
  isDark,
}) => {
  const [activeTab, setActiveTab] = useState<'methods' | 'shalom' | 'olva' | 'marvisur' | 'import'>('methods');
  const [importTarget, setImportTarget] = useState<'shalom' | 'olva' | 'marvisur'>('shalom');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [rawImportText, setRawImportText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Agency[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ lastSync?: string }>({});

  const shalomFileInputRef = useRef<HTMLInputElement>(null);
  const olvaFileInputRef = useRef<HTMLInputElement>(null);
  const marvisurFileInputRef = useRef<HTMLInputElement>(null);

  // Olva filter in modal
  const [olvaTipoFilter, setOlvaTipoFilter] = useState<'TODOS' | 'TIENDA' | 'AGENTE'>('TODOS');

  // New agency manual form state
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newAgencyAddress, setNewAgencyAddress] = useState('');
  const [newAgencyDepartment, setNewAgencyDepartment] = useState('Lima');
  const [newAgencyCode, setNewAgencyCode] = useState('');
  const [newAgencyTipo, setNewAgencyTipo] = useState<'TIENDA' | 'AGENTE'>('TIENDA');
  const [newAgencyUbigeo, setNewAgencyUbigeo] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const savedLastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    if (savedLastSync) {
      setSyncStatus({ lastSync: new Date(savedLastSync).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) });
    }
  }, []);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Sync specific courier or all
  const handleSyncAgencies = async (target: 'all' | 'shalom' | 'olva' | 'marvisur') => {
    setIsSyncing(true);
    try {
      if (target === 'shalom') {
        const res = await fetchShalomAgencies();
        onUpdateShalomAgencies(res.data);
        localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(res.data));
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
        showToast(
          res.source === 'live_api'
            ? `¡Sincronizado en vivo con API Shalom! (${res.data.length} locales actualizados)`
            : `Contingencia actualizada: ${res.data.length} locales de Shalom disponibles.`
        );
      } else if (target === 'olva') {
        const res = await fetchOlvaAgencies();
        onUpdateOlvaAgencies(res.data);
        localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(res.data));
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
        showToast(
          res.source === 'live_api'
            ? `¡Sincronizado en vivo con API Olva! (${res.data.length} Tiendas y Agentes)`
            : `Contingencia actualizada: ${res.data.length} locales de Olva disponibles.`
        );
      } else if (target === 'marvisur') {
        const res = await fetchMarvisurAgencies();
        if (onUpdateMarvisurAgencies) {
          onUpdateMarvisurAgencies(res.data);
        }
        localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(res.data));
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
        showToast(
          res.source === 'live_api'
            ? `¡Sincronizado en vivo con Expreso Marvisur! (${res.data.length} sucursales)`
            : `Contingencia actualizada: ${res.data.length} sucursales de Marvisur disponibles.`
        );
      } else {
        const res = await syncCourierAgencies();
        const shalomList = await fetchShalomAgencies();
        const olvaList = await fetchOlvaAgencies();
        const marvisurList = await fetchMarvisurAgencies();
        onUpdateShalomAgencies(shalomList.data);
        onUpdateOlvaAgencies(olvaList.data);
        if (onUpdateMarvisurAgencies) {
          onUpdateMarvisurAgencies(marvisurList.data);
        }
        showToast(`¡Sincronización completa! Shalom (${res.shalomCount}), Olva (${res.olvaCount}), Marvisur (${res.marvisurCount})`);
      }
      setSyncStatus({ lastSync: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) });
    } catch (err: any) {
      showToast(`Error de sincronización: ${err.message || 'Intente nuevamente'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Load JSON file directly
  const handleLoadJSONFile = (e: React.ChangeEvent<HTMLInputElement>, target: 'shalom' | 'olva' | 'marvisur') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = parseAgenciesFromJSON(content, target);
        
        if (parsed.length === 0) {
          alert("El archivo no contiene un formato de agencias reconocido o está vacío.");
          return;
        }

        if (target === 'shalom') {
          onUpdateShalomAgencies(parsed);
          localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(parsed));
        } else if (target === 'olva') {
          onUpdateOlvaAgencies(parsed);
          localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(parsed));
        } else {
          if (onUpdateMarvisurAgencies) {
            onUpdateMarvisurAgencies(parsed);
          }
          localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(parsed));
        }

        showToast(`Cargadas ${parsed.length} agencias de ${target.toUpperCase()} desde el archivo JSON.`);
      } catch {
        alert("Formato JSON inválido. Revisa la estructura del archivo.");
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Toggle shipping method
  const handleToggleMethod = (method: ShippingType) => {
    const updated = {
      ...shippingConfig,
      [method]: !shippingConfig[method],
    };
    onUpdateShippingConfig(updated);
    showToast(`Método ${method.toUpperCase()} ${updated[method] ? 'activado' : 'desactivado'}`);
  };

  // Add single agency
  const handleAddAgency = (target: 'shalom' | 'olva' | 'marvisur') => {
    if (!newAgencyName.trim() || !newAgencyAddress.trim()) {
      alert('Ingresa al menos el nombre de la sucursal y la dirección.');
      return;
    }

    const newAgency: Agency = {
      id: `${target}-${Date.now()}`,
      name: newAgencyName.trim(),
      address: newAgencyAddress.trim(),
      department: newAgencyDepartment.trim() || 'Lima',
      province: newAgencyDepartment.trim() || 'Lima',
      district: newAgencyName.split('/')[2]?.trim() || newAgencyDepartment.trim() || 'Principal',
      code: newAgencyCode.trim() || undefined,
      tipo: target === 'olva' ? newAgencyTipo : undefined,
      ubigeo: target === 'olva' && newAgencyUbigeo.trim() ? newAgencyUbigeo.trim() : undefined,
      schedule: 'Lun - Sáb: 8:00 AM - 7:00 PM',
    };

    if (target === 'shalom') {
      const updated = [newAgency, ...shalomAgencies];
      onUpdateShalomAgencies(updated);
      localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(updated));
    } else if (target === 'olva') {
      const updated = [newAgency, ...olvaAgencies];
      onUpdateOlvaAgencies(updated);
      localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(updated));
    } else {
      const updated = [newAgency, ...marvisurAgencies];
      if (onUpdateMarvisurAgencies) {
        onUpdateMarvisurAgencies(updated);
      }
      localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(updated));
    }

    setNewAgencyName('');
    setNewAgencyAddress('');
    setNewAgencyCode('');
    setNewAgencyUbigeo('');
    setShowAddForm(false);
    showToast(`Sucursal añadida a ${target === 'shalom' ? 'Shalom' : target === 'olva' ? 'Olva' : 'Marvisur'}`);
  };

  // Delete agency
  const handleDeleteAgency = (target: 'shalom' | 'olva' | 'marvisur', id: string) => {
    if (target === 'shalom') {
      const updated = shalomAgencies.filter((a) => a.id !== id);
      onUpdateShalomAgencies(updated);
      localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(updated));
    } else if (target === 'olva') {
      const updated = olvaAgencies.filter((a) => a.id !== id);
      onUpdateOlvaAgencies(updated);
      localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(updated));
    } else {
      const updated = marvisurAgencies.filter((a) => a.id !== id);
      if (onUpdateMarvisurAgencies) {
        onUpdateMarvisurAgencies(updated);
      }
      localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(updated));
    }
    showToast('Sucursal eliminada de la base de contingencia');
  };

  // Reset to default agencies
  const handleResetAgencies = (target: 'shalom' | 'olva' | 'marvisur') => {
    if (confirm(`¿Restablecer lista oficial predeterminada de ${target.toUpperCase()}?`)) {
      if (target === 'shalom') {
        onUpdateShalomAgencies(SHALOM_AGENCIES);
        localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(SHALOM_AGENCIES));
      } else if (target === 'olva') {
        onUpdateOlvaAgencies(OLVA_AGENCIES);
        localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(OLVA_AGENCIES));
      } else {
        if (onUpdateMarvisurAgencies) {
          onUpdateMarvisurAgencies(MARVISUR_AGENCIES);
        }
        localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(MARVISUR_AGENCIES));
      }
      showToast(`Lista de ${target.toUpperCase()} restablecida con el catálogo completo`);
    }
  };

  // Universal parser for Raw Text (JSON or CSV or TXT)
  const parseImportText = (text: string, target: 'shalom' | 'olva' | 'marvisur'): Agency[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // Check if it's JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return parseAgenciesFromJSON(trimmed, target);
    }

    // Otherwise parse CSV / TSV / pipe delimited
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const result: Agency[] = [];

    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes('sucursal') || line.toLowerCase().includes('nombre') || line.toLowerCase().includes('direccion'))) {
        return;
      }

      let parts: string[] = [];
      if (line.includes(';')) {
        parts = line.split(';').map((p) => p.trim());
      } else if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim());
      } else if (line.includes('|')) {
        parts = line.split('|').map((p) => p.trim());
      } else {
        parts = line.split(',').map((p) => p.trim());
      }

      if (parts.length >= 2) {
        const name = parts[0].replace(/^["']|["']$/g, '');
        const address = parts[1].replace(/^["']|["']$/g, '');
        const dept = parts[2] ? parts[2].replace(/^["']|["']$/g, '') : (name.includes('/') ? name.split('/')[0].trim() : 'Lima');
        const code = parts[3] ? parts[3].replace(/^["']|["']$/g, '') : undefined;
        const rawTipo = parts[4] ? parts[4].replace(/^["']|["']$/g, '').toUpperCase() : undefined;
        const tipo = rawTipo || (name.toLowerCase().includes('agente') ? 'AGENTE' : 'TIENDA');
        const ubigeo = parts[5] ? parts[5].replace(/^["']|["']$/g, '') : undefined;

        result.push({
          id: `imp-${Date.now()}-${index}`,
          name: name,
          address: address,
          department: dept,
          province: dept,
          district: dept,
          code: code,
          tipo: target === 'olva' ? (tipo as 'TIENDA' | 'AGENTE') : undefined,
          ubigeo: target === 'olva' ? ubigeo : undefined,
          schedule: 'Lun - Sáb: 8:00 AM - 7:00 PM',
        });
      }
    });

    return result;
  };

  const handleRawTextChange = (text: string) => {
    setRawImportText(text);
    const parsed = parseImportText(text, importTarget);
    setParsedPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleRawTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (parsedPreview.length === 0) {
      alert('No se encontraron sucursales válidas para importar. Revisa el formato.');
      return;
    }

    if (importTarget === 'shalom') {
      const updated = importMode === 'replace' ? parsedPreview : [...parsedPreview, ...shalomAgencies];
      onUpdateShalomAgencies(updated);
      localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(updated));
    } else if (importTarget === 'olva') {
      const updated = importMode === 'replace' ? parsedPreview : [...parsedPreview, ...olvaAgencies];
      onUpdateOlvaAgencies(updated);
      localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(updated));
    } else {
      const updated = importMode === 'replace' ? parsedPreview : [...parsedPreview, ...marvisurAgencies];
      if (onUpdateMarvisurAgencies) {
        onUpdateMarvisurAgencies(updated);
      }
      localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(updated));
    }

    showToast(`¡${parsedPreview.length} sucursales importadas exitosamente a ${importTarget.toUpperCase()}!`);
    setRawImportText('');
    setParsedPreview([]);
    setActiveTab(importTarget);
  };

  // Export JSON file
  const handleExportJSON = (target: 'shalom' | 'olva' | 'marvisur') => {
    const list = target === 'shalom' ? shalomAgencies : target === 'olva' ? olvaAgencies : marvisurAgencies;
    const jsonStr = JSON.stringify(list, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agencias_${target}_completo_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Descargando JSON con ${list.length} agencias de ${target.toUpperCase()}...`);
  };

  // Export CSV file
  const handleExportCSV = (target: 'shalom' | 'olva' | 'marvisur') => {
    const list = target === 'shalom' ? shalomAgencies : target === 'olva' ? olvaAgencies : marvisurAgencies;
    const header = target === 'olva' 
      ? 'Nombre Sucursal,Dirección,Departamento,Código,Tipo,Ubigeo\n'
      : 'Nombre Sucursal,Dirección,Departamento,Código\n';
    const rows = list.map((a) => {
      if (target === 'olva') {
        return `"${a.name}","${a.address}","${a.department}","${a.code || ''}","${a.tipo || 'TIENDA'}","${a.ubigeo || ''}"`;
      }
      return `"${a.name}","${a.address}","${a.department}","${a.code || ''}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `locales_${target}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Descargando CSV con ${list.length} agencias...`);
  };

  const currentAgencies = activeTab === 'shalom' ? shalomAgencies : activeTab === 'olva' ? olvaAgencies : marvisurAgencies;
  const filteredAgencies = currentAgencies.filter((a) => {
    const matchesSearch = 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.district && a.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.province && a.province.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.code && a.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.ubigeo && a.ubigeo.toLowerCase().includes(searchTerm.toLowerCase()));

    if (activeTab === 'olva' && olvaTipoFilter !== 'TODOS') {
      const isAgente = a.tipo?.toUpperCase() === 'AGENTE' || a.name.toLowerCase().includes('agente');
      if (olvaTipoFilter === 'AGENTE') return matchesSearch && isAgente;
      if (olvaTipoFilter === 'TIENDA') return matchesSearch && !isAgente;
    }

    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className={`w-full max-w-4xl rounded-2xl border-2 shadow-2xl transition-all duration-200 my-auto max-h-[92vh] flex flex-col ${
        isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-black'
      }`}>
        
        {/* Hidden File Inputs for Cargar JSON Completo */}
        <input
          type="file"
          id="jsonFileInputShalom"
          ref={shalomFileInputRef}
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => handleLoadJSONFile(e, 'shalom')}
        />
        <input
          type="file"
          id="jsonFileInputOlva"
          ref={olvaFileInputRef}
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => handleLoadJSONFile(e, 'olva')}
        />
        <input
          type="file"
          id="jsonFileInputMarvisur"
          ref={marvisurFileInputRef}
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => handleLoadJSONFile(e, 'marvisur')}
        />

        {/* Header */}
        <div className="p-5 border-b-2 border-[#E2E8F0] dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#FF7060]/15 text-[#FF7060] border border-[#FF7060]/30">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-black dark:text-white">
                  Gestión de Envíos y Sucursales
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-400">
                  <Globe2 className="w-3 h-3" />
                  API Sync + Cargar JSON
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-400">
                Sincronización en vivo con APIs oficiales, carga masiva JSON/CSV y base de contingencia nacional
              </p>
            </div>
          </div>

          <button
            id="close-shipping-config-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#475569] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Status Banner */}
        {successNotice && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-b-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-black flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Tab Navigation with Single Letter Titles */}
        <div className="flex border-b-2 border-[#E2E8F0] dark:border-zinc-800 px-5 pt-2.5 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar flex-shrink-0 bg-zinc-50/50 dark:bg-[#121217]/60">
          <button
            type="button"
            id="tab-btn-methods"
            onClick={() => setActiveTab('methods')}
            title="M - Métodos de Envío y Reglas"
            className={`pb-2.5 pt-1.5 px-3.5 sm:px-4 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-t-xl ${
              activeTab === 'methods'
                ? 'border-[#FF7060] text-red-600 dark:text-[#FF7060] bg-white dark:bg-zinc-800/80 shadow-2xs'
                : 'border-transparent text-[#475569] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="text-base font-black tracking-wide">M</span>
          </button>

          <button
            type="button"
            id="tab-btn-shalom"
            onClick={() => { setActiveTab('shalom'); setSearchTerm(''); }}
            title={`S - Locales Shalom (${shalomAgencies.length} agencias)`}
            className={`pb-2.5 pt-1.5 px-3.5 sm:px-4 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-t-xl ${
              activeTab === 'shalom'
                ? 'border-[#FF7060] text-red-600 dark:text-[#FF7060] bg-white dark:bg-zinc-800/80 shadow-2xs'
                : 'border-transparent text-[#475569] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-red-500" />
            <span className="text-base font-black tracking-wide">S</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'shalom'
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-black'
                : 'bg-zinc-200 dark:bg-zinc-800 text-[#475569] dark:text-zinc-400'
            }`}>
              {shalomAgencies.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-marvisur"
            onClick={() => { setActiveTab('marvisur'); setSearchTerm(''); }}
            title={`M - Sucursales Expreso Marvisur (${marvisurAgencies.length} sucursales)`}
            className={`pb-2.5 pt-1.5 px-3.5 sm:px-4 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-t-xl ${
              activeTab === 'marvisur'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-800/80 shadow-2xs'
                : 'border-transparent text-[#475569] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-base font-black tracking-wide text-blue-600 dark:text-blue-400">M</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'marvisur'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black'
                : 'bg-zinc-200 dark:bg-zinc-800 text-[#475569] dark:text-zinc-400'
            }`}>
              {marvisurAgencies.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-olva"
            onClick={() => { setActiveTab('olva'); setSearchTerm(''); }}
            title={`O - Locales Olva Courier (${olvaAgencies.length} tiendas y agentes)`}
            className={`pb-2.5 pt-1.5 px-3.5 sm:px-4 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-t-xl ${
              activeTab === 'olva'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-zinc-800/80 shadow-2xs'
                : 'border-transparent text-[#475569] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-base font-black tracking-wide text-amber-600 dark:text-amber-400">O</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'olva'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black'
                : 'bg-zinc-200 dark:bg-zinc-800 text-[#475569] dark:text-zinc-400'
            }`}>
              {olvaAgencies.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-import"
            onClick={() => setActiveTab('import')}
            title="I - Importador Universal JSON / CSV / TXT"
            className={`pb-2.5 pt-1.5 px-3.5 sm:px-4 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 cursor-pointer rounded-t-xl ${
              activeTab === 'import'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-800/80 shadow-2xs'
                : 'border-transparent text-[#475569] dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-base font-black tracking-wide text-purple-600 dark:text-purple-400">I</span>
          </button>
        </div>

        {/* Contextual Active Tab Breadcrumb Bar */}
        <div className="px-5 py-2 bg-zinc-100/70 dark:bg-[#16161C] border-b border-[#E2E8F0] dark:border-zinc-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[11px] text-white shadow-2xs ${
              activeTab === 'methods' ? 'bg-[#FF7060]' :
              activeTab === 'shalom' ? 'bg-red-600' :
              activeTab === 'marvisur' ? 'bg-blue-600' :
              activeTab === 'olva' ? 'bg-amber-600' : 'bg-purple-600'
            }`}>
              {activeTab === 'methods' ? 'M' : activeTab === 'shalom' ? 'S' : activeTab === 'marvisur' ? 'M' : activeTab === 'olva' ? 'O' : 'I'}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-black text-black dark:text-white text-xs">
                {activeTab === 'methods' && 'Métodos de Envío y Reglas'}
                {activeTab === 'shalom' && `Locales Shalom (${shalomAgencies.length} agencias)`}
                {activeTab === 'marvisur' && `Sucursales Expreso Marvisur (${marvisurAgencies.length} sucursales)`}
                {activeTab === 'olva' && `Locales Olva Courier (${olvaAgencies.length} tiendas y agentes)`}
                {activeTab === 'import' && 'Importador Universal de Sucursales'}
              </span>
              <span className="hidden md:inline text-[#475569] dark:text-zinc-400 text-[11px] font-semibold">
                {activeTab === 'methods' && '• Configuración general de canales de despacho'}
                {activeTab === 'shalom' && '• Catálogo nacional de recojo en agencia'}
                {activeTab === 'marvisur' && '• Cobertura sur, centro y norte del Perú'}
                {activeTab === 'olva' && '• Tiendas propias y agentes autorizados'}
                {activeTab === 'import' && '• Pegar texto o subir archivo JSON / CSV / TXT'}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: MÉTODOS DE ENVÍO */}
          {activeTab === 'methods' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Selecciona qué métodos de envío estarán disponibles para los clientes:
                </span>
                <button
                  type="button"
                  onClick={() => handleSyncAgencies('all')}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title="Sincronizar Shalom, Marvisur y Olva en vivo con las APIs oficiales y actualizar contingencia"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Todo (Shalom/Marvisur/Olva)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Shalom */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  shippingConfig.shalom
                    ? isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50/80 border-red-200'
                    : isDark ? 'bg-zinc-900/40 border-zinc-800 opacity-60' : 'bg-zinc-100 border-[#E2E8F0] opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-600/20 text-red-500">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Shalom Empresarial</h4>
                        <p className="text-[11px] text-[#475569] dark:text-zinc-400 font-bold">Corte: 5:00 PM • {shalomAgencies.length} locales en BD</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleMethod('shalom')}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        shippingConfig.shalom ? 'bg-[#FF7060]' : 'bg-zinc-600'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        shippingConfig.shalom ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Expreso Marvisur */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  shippingConfig.marvisur
                    ? isDark ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/80 border-blue-200'
                    : isDark ? 'bg-zinc-900/40 border-zinc-800 opacity-60' : 'bg-zinc-100 border-[#E2E8F0] opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Expreso Marvisur</h4>
                        <p className="text-[11px] text-[#475569] dark:text-zinc-400 font-bold">Corte: 5:00 PM • {marvisurAgencies.length} sucursales en BD</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleMethod('marvisur')}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        shippingConfig.marvisur ? 'bg-blue-600' : 'bg-zinc-600'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        shippingConfig.marvisur ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Olva */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  shippingConfig.olva
                    ? isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/80 border-amber-200'
                    : isDark ? 'bg-zinc-900/40 border-zinc-800 opacity-60' : 'bg-zinc-100 border-[#E2E8F0] opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-600/20 text-amber-500">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Olva Courier</h4>
                        <p className="text-[11px] text-[#475569] dark:text-zinc-400 font-bold">Corte: 4:00 PM • {olvaAgencies.length} Tiendas/Agentes</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleMethod('olva')}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        shippingConfig.olva ? 'bg-[#FF7060]' : 'bg-zinc-600'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        shippingConfig.olva ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Delivery Lima */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  shippingConfig.delivery_lima
                    ? isDark ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/80 border-blue-200'
                    : isDark ? 'bg-zinc-900/40 border-zinc-800 opacity-60' : 'bg-zinc-100 border-[#E2E8F0] opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Delivery Lima Metropolitana</h4>
                        <p className="text-[11px] text-[#475569] dark:text-zinc-400 font-bold">Corte: 1:00 PM • Cobertura total distritos</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleMethod('delivery_lima')}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        shippingConfig.delivery_lima ? 'bg-[#FF7060]' : 'bg-zinc-600'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        shippingConfig.delivery_lima ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Retiro en Tienda */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  shippingConfig.tienda
                    ? isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/80 border-emerald-200'
                    : isDark ? 'bg-zinc-900/40 border-zinc-800 opacity-60' : 'bg-zinc-100 border-[#E2E8F0] opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-500">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Retiro en Salón / Tienda</h4>
                        <p className="text-[11px] text-[#475569] dark:text-zinc-400 font-bold">Corte: 10:00 PM • Entrega en mostrador</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleMethod('tienda')}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        shippingConfig.tienda ? 'bg-[#FF7060]' : 'bg-zinc-600'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        shippingConfig.tienda ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* CONTRAENTREGA TOGGLE */}
              <div className={`p-4 rounded-2xl border transition-all mt-4 ${
                isDark ? 'bg-[#15151A] border-[#2C2C35]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💵</span>
                      <h4 className="font-bold text-sm text-[#0F172A] dark:text-zinc-100">
                        Habilitar Pago Contraentrega (Delivery Lima)
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        shippingConfig.deliveryLimaCashOnDeliveryEnabled !== false
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
                      }`}>
                        {shippingConfig.deliveryLimaCashOnDeliveryEnabled !== false ? 'Activo en Formulario' : 'Desactivado'}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] dark:text-zinc-400 max-w-xl">
                      Permite que los clientes que elijan <strong>Delivery Lima</strong> puedan seleccionar la modalidad de <strong>Pago Contraentrega</strong> (Motorizado por Cobrar, Yape o Transferencia).
                    </p>
                  </div>

                  <button
                    id="toggle-cash-on-delivery-btn"
                    type="button"
                    onClick={() => {
                      const currentVal = shippingConfig.deliveryLimaCashOnDeliveryEnabled !== false;
                      const updated = {
                        ...shippingConfig,
                        deliveryLimaCashOnDeliveryEnabled: !currentVal,
                      };
                      onUpdateShippingConfig(updated);
                      showToast(`Pago Contraentrega ${!currentVal ? 'habilitado' : 'deshabilitado'}`);
                    }}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-shrink-0 ${
                      shippingConfig.deliveryLimaCashOnDeliveryEnabled !== false ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      shippingConfig.deliveryLimaCashOnDeliveryEnabled !== false ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2, 3 & 4: GESTIÓN DE LOCALES SHALOM / MARVISUR / OLVA */}
          {(activeTab === 'shalom' || activeTab === 'olva' || activeTab === 'marvisur') && (
            <div className="space-y-4">
              
              {/* Sync status & Action Toolbar */}
              <div className={`p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'bg-[#0F0F12] border-[#2C2C35]' : 'bg-zinc-50 border-zinc-300'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-black dark:text-white uppercase tracking-tight">
                        Catálogo de {activeTab === 'shalom' ? 'Shalom' : activeTab === 'marvisur' ? 'Expreso Marvisur' : 'Olva Courier'}
                      </span>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30">
                        {currentAgencies.length} locales cargados
                      </span>
                      {syncStatus.lastSync && (
                        <span className="text-[10px] text-[#475569] font-medium">
                          Últ. sync: {syncStatus.lastSync}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#475569] dark:text-zinc-400 font-medium mt-0.5">
                      {activeTab === 'shalom' 
                        ? 'Envíos a nivel nacional con retiro en agencia Shalom oficial (https://shalom.com.pe/agencias)'
                        : activeTab === 'marvisur'
                        ? 'Envíos a nivel nacional con retiro en sucursales de Expreso Marvisur (https://expresomarvisur.com/sucursales)'
                        : 'Envíos Olva Courier a Tiendas y Agentes oficiales (https://www.olvacourier.com/ubicanos)'
                      }
                    </p>
                  </div>
                </div>

                {/* Primary Sync & Load JSON Action Group */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Load JSON File (Direct feature from prompt) */}
                  <button
                    id={`btn-load-json-${activeTab}`}
                    type="button"
                    onClick={() => {
                      if (activeTab === 'shalom') shalomFileInputRef.current?.click();
                      else if (activeTab === 'marvisur') marvisurFileInputRef.current?.click();
                      else olvaFileInputRef.current?.click();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-[#6366F1] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title={`Cargar archivo JSON completo con todas las agencias de ${activeTab.toUpperCase()}`}
                  >
                    <FileJson className="w-4 h-4" />
                    <span>Cargar JSON Completo</span>
                  </button>

                  {/* Sync Live API Button */}
                  <button
                    id={`sync-api-btn-${activeTab}`}
                    type="button"
                    onClick={() => handleSyncAgencies(activeTab)}
                    disabled={isSyncing}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    title={`Sincronizar manualmente lista de locales de ${activeTab.toUpperCase()} desde el API proxy`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : `Sincronizar ${activeTab === 'shalom' ? 'Shalom' : activeTab === 'marvisur' ? 'Marvisur' : 'Olva'}`}</span>
                  </button>
                </div>
              </div>

              {/* Search and Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <input
                    type="text"
                    placeholder={`Buscar en ${activeTab === 'shalom' ? 'Shalom' : activeTab === 'marvisur' ? 'Marvisur' : 'Olva'} por departamento, provincia, distrito o dirección...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-bold border-2 ${
                      isDark ? 'bg-[#0F0F12] border-[#2C2C35] text-white placeholder:text-[#475569]' : 'bg-white border-zinc-300 text-black placeholder:text-[#475569]'
                    }`}
                  />
                </div>

                {activeTab === 'olva' && (
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-300 dark:border-zinc-700">
                    {(['TODOS', 'TIENDA', 'AGENTE'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setOlvaTipoFilter(t)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          olvaTipoFilter === t
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-[#0F172A] shadow-2xs'
                            : 'text-[#475569] dark:text-zinc-400 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {t === 'TODOS' ? 'Todos' : t === 'TIENDA' ? '🏪 Tiendas' : '📍 Agentes'}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-3 py-2 rounded-xl bg-[#FF7060] text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-[#ff5d4b]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportJSON(activeTab)}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isDark ? 'bg-[#0F0F12] border-[#2C2C35] text-purple-300 hover:border-purple-500' : 'bg-purple-50 border-purple-200 text-purple-800 hover:border-purple-400'
                    }`}
                    title="Exportar JSON completo de agencias"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>Exportar JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCSV(activeTab)}
                    className={`p-2 rounded-xl border-2 text-xs font-black flex items-center gap-1 transition-colors cursor-pointer ${
                      isDark ? 'bg-[#0F0F12] border-[#2C2C35] text-zinc-300' : 'bg-zinc-50 border-zinc-300 text-zinc-700'
                    }`}
                    title="Exportar CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetAgencies(activeTab)}
                    className={`p-2 rounded-xl border-2 text-xs text-[#475569] hover:text-red-500 transition-colors cursor-pointer ${
                      isDark ? 'bg-[#0F0F12] border-[#2C2C35]' : 'bg-zinc-50 border-zinc-300'
                    }`}
                    title="Restablecer catálogo oficial de contingencia"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add New Agency Form Modal Collapse */}
              {showAddForm && (
                <div className={`p-4 rounded-2xl border-2 space-y-3 animate-in fade-in duration-150 ${
                  isDark ? 'bg-[#0F0F12] border-[#2C2C35]' : 'bg-zinc-50 border-zinc-300'
                }`}>
                  <h5 className="font-black text-xs uppercase tracking-wider text-[#FF7060] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    Nueva Sucursal para {activeTab === 'shalom' ? 'Shalom' : activeTab === 'marvisur' ? 'Marvisur' : 'Olva'}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black block mb-1 text-black dark:text-zinc-200">Nombre de Sucursal *</label>
                      <input
                        type="text"
                        placeholder="Ej: Lima / La Victoria / Luna Pizarro"
                        value={newAgencyName}
                        onChange={(e) => setNewAgencyName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                          isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-black'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black block mb-1 text-black dark:text-zinc-200">Dirección Exacta *</label>
                      <input
                        type="text"
                        placeholder="Ej: Av. Luna Pizarro 542"
                        value={newAgencyAddress}
                        onChange={(e) => setNewAgencyAddress(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                          isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-black'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black block mb-1 text-black dark:text-zinc-200">Departamento / Región</label>
                      <input
                        type="text"
                        placeholder="Ej: Lima / Arequipa / Cusco"
                        value={newAgencyDepartment}
                        onChange={(e) => setNewAgencyDepartment(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                          isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-black'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black block mb-1 text-black dark:text-zinc-200">Código de Agencia (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej: MARV-LIM-01"
                        value={newAgencyCode}
                        onChange={(e) => setNewAgencyCode(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                          isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-black'
                        }`}
                      />
                    </div>

                    {activeTab === 'olva' && (
                      <>
                        <div>
                          <label className="text-[11px] font-black block mb-1 text-black dark:text-zinc-200">Tipo de Sede Olva</label>
                          <select
                            value={newAgencyTipo}
                            onChange={(e) => setNewAgencyTipo(e.target.value as 'TIENDA' | 'AGENTE')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                              isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-black'
                            }`}
                          >
                            <option value="TIENDA">🏪 TIENDA (Oficina propia)</option>
                            <option value="AGENTE">📍 AGENTE (Establecimiento autorizado)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-black block mb-1 text-black dark:text-zinc-200">Código Ubigeo (6 dígitos)</label>
                          <input
                            type="text"
                            placeholder="Ej: 150117"
                            value={newAgencyUbigeo}
                            onChange={(e) => setNewAgencyUbigeo(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                              isDark ? 'bg-[#1A1A1F] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-black'
                            }`}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#475569] hover:text-black dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAgency(activeTab)}
                      className="px-4 py-1.5 rounded-lg bg-[#FF7060] hover:bg-[#ff5d4b] text-white text-xs font-black cursor-pointer"
                    >
                      Guardar Sucursal
                    </button>
                  </div>
                </div>
              )}

              {/* Agencies List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredAgencies.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[#475569] font-bold">
                    No se encontraron sucursales que coincidan con "{searchTerm}".
                  </div>
                ) : (
                  filteredAgencies.map((agency) => (
                    <div
                      key={agency.id}
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                        isDark ? 'bg-[#0F0F12] border-[#2C2C35]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MapPin className="w-4 h-4 text-[#FF7060] flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-black dark:text-zinc-100 truncate">{agency.name}</span>
                            
                            {/* Olva Dual Classification Badge */}
                            {agency.tipo && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                agency.tipo.toUpperCase() === 'AGENTE'
                                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-400'
                                  : 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-400'
                              }`}>
                                {agency.tipo.toUpperCase() === 'AGENTE' ? 'AGENTE' : 'TIENDA'}
                              </span>
                            )}

                            {agency.code && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700/40 text-[#0F172A] dark:text-zinc-300">
                                {agency.code}
                              </span>
                            )}

                            {agency.ubigeo && (
                              <span className="font-mono text-[9px] font-bold text-[#475569] dark:text-zinc-400">
                                Ubigeo: {agency.ubigeo}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate mt-0.5 font-medium">
                            {agency.address} • <strong className="text-black dark:text-zinc-200">{agency.department}</strong>
                            {agency.province && agency.province !== agency.department && ` / ${agency.province}`}
                            {agency.district && ` / ${agency.district}`}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteAgency(activeTab, agency.id)}
                        className="p-1.5 rounded-lg text-[#475569] hover:text-red-600 hover:bg-red-500/10 transition-colors flex-shrink-0 cursor-pointer"
                        title="Eliminar sucursal de la base de contingencia"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 4: IMPORTADOR JSON / TXT / CSV */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border-2 bg-[#FF7060]/10 border-[#FF7060]/20 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-[#FF7060]" />
                    <span className="font-black text-[#FF7060] text-sm">Importador Universal (JSON / CSV / TXT)</span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-400 text-[11px]">
                    Sube archivos <code>.json</code> completos descargados de las APIs de Shalom/Marvisur/Olva, o archivos <code>.csv/.txt</code>.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={importTarget}
                    onChange={(e) => {
                      const newTarget = e.target.value as 'shalom' | 'olva' | 'marvisur';
                      setImportTarget(newTarget);
                      if (rawImportText) {
                        setParsedPreview(parseImportText(rawImportText, newTarget));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border-2 ${
                      isDark ? 'bg-[#0F0F12] border-[#2C2C35] text-white' : 'bg-white border-zinc-300'
                    }`}
                  >
                    <option value="shalom">Destino: Shalom ({shalomAgencies.length} actuales)</option>
                    <option value="marvisur">Destino: Expreso Marvisur ({marvisurAgencies.length} actuales)</option>
                    <option value="olva">Destino: Olva Courier ({olvaAgencies.length} actuales)</option>
                  </select>

                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border-2 ${
                      isDark ? 'bg-[#0F0F12] border-[#2C2C35] text-white' : 'bg-white border-zinc-300'
                    }`}
                  >
                    <option value="replace">Reemplazar lista completa</option>
                    <option value="append">Añadir a las existentes</option>
                  </select>
                </div>
              </div>

              {/* Upload file box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDark ? 'bg-[#0F0F12] border-zinc-700 hover:border-[#FF7060]' : 'bg-zinc-50 border-zinc-300 hover:border-[#FF7060]'
                }`}>
                  <FileCode2 className="w-8 h-8 text-[#FF7060] mb-2" />
                  <span className="text-xs font-black text-black dark:text-white">Cargar archivo .JSON / .CSV / .TXT</span>
                  <span className="text-[10px] text-[#475569] dark:text-zinc-400 mt-1">
                    Detecta automáticamente estructura array <code>[...]</code>, <code>{'{ data: [...] }'}</code> o CSV.
                  </span>
                  <input
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className={`p-4 rounded-2xl border-2 text-xs space-y-2 ${
                  isDark ? 'bg-[#0F0F12] border-[#2C2C35]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[11px]">Formatos JSON Aceptados:</span>
                    <button
                      type="button"
                      onClick={() => handleExportJSON(importTarget)}
                      className="text-[10px] text-[#FF7060] font-black hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Descargar plantilla modelo
                    </button>
                  </div>
                  <pre className="font-mono text-[10px] text-[#475569] dark:text-zinc-400 bg-black/10 dark:bg-black/40 p-2.5 rounded-xl overflow-x-auto leading-relaxed border border-[#E2E8F0] dark:border-zinc-800">
{`[
  {
    "name": "Lima / La Victoria / Parinacochas",
    "address": "Av. Parinacochas 1240",
    "department": "Lima",
    "code": "SH-LIM-01"
  }
]`}
                  </pre>
                </div>
              </div>

              {/* Textarea for manual paste */}
              <div>
                <label className="text-xs font-bold block mb-1 text-black dark:text-zinc-200">
                  O pega aquí directamente el contenido JSON o CSV:
                </label>
                <textarea
                  rows={4}
                  placeholder='Pega aquí tu JSON completo (ej: [{"name": "...", "address": "..."}]) o texto CSV...'
                  value={rawImportText}
                  onChange={(e) => handleRawTextChange(e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs font-mono border-2 ${
                    isDark ? 'bg-[#0F0F12] border-[#2C2C35] text-white placeholder:text-[#475569]' : 'bg-white border-zinc-300 text-[#0F172A] placeholder:text-zinc-400'
                  }`}
                />
              </div>

              {/* Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-black">
                      <Check className="w-4 h-4" />
                      {parsedPreview.length} sucursales detectadas listas para importar a {importTarget.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyImport}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/30 cursor-pointer"
                    >
                      {importMode === 'replace' ? 'Reemplazar Catálogo con estas Agencias' : 'Añadir Agencias al Catálogo'}
                    </button>
                  </div>

                  <div className="border-2 rounded-2xl max-h-[180px] overflow-y-auto text-xs border-[#E2E8F0] dark:border-zinc-800">
                    <table className="w-full text-left">
                      <thead className={`text-[10px] font-black uppercase sticky top-0 ${
                        isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                      }`}>
                        <tr>
                          <th className="p-2">Sucursal</th>
                          <th className="p-2">Dirección</th>
                          <th className="p-2">Departamento</th>
                          <th className="p-2">Código</th>
                          {importTarget === 'olva' && <th className="p-2">Tipo</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {parsedPreview.slice(0, 20).map((a, i) => (
                          <tr key={i} className="text-[11px]">
                            <td className="p-2 font-bold">{a.name}</td>
                            <td className="p-2 text-[#475569] dark:text-zinc-400">{a.address}</td>
                            <td className="p-2">{a.department}</td>
                            <td className="p-2 font-mono text-[10px]">{a.code || '-'}</td>
                            {importTarget === 'olva' && (
                              <td className="p-2">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  a.tipo === 'AGENTE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {a.tipo || 'TIENDA'}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-[#E2E8F0] dark:border-zinc-800 flex items-center justify-between text-xs text-[#475569] dark:text-zinc-400 flex-shrink-0">
          <span>Los cambios y sincronizaciones se aplican en tiempo real al formulario de despacho de clientes.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#FF7060] text-white font-black text-xs cursor-pointer hover:bg-[#ff5d4b]"
          >
            Listo / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
