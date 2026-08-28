import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Server, 
  ShieldCheck, 
  Sparkles,
  Cloud,
  Layers,
  X
} from 'lucide-react';
import { 
  checkDatabaseStatus, 
  DbStatusInfo, 
  initializeDatabaseSchema, 
  SUPABASE_SCHEMA_SQL,
  fetchServerOrders,
  saveServerOrder
} from '../utils/dbApi';
import { Order } from '../types';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  orders: Order[];
  onSyncOrdersToSupabase?: () => Promise<void>;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  isDark,
  orders,
}) => {
  const [status, setStatus] = useState<DbStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [remoteOrderIds, setRemoteOrderIds] = useState<Set<string>>(new Set());

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const res = await checkDatabaseStatus();
      setStatus(res);

      const remoteOrders = await fetchServerOrders();
      const ids = new Set(remoteOrders.map((o) => o.id));
      setRemoteOrderIds(ids);
    } catch (err: any) {
      setStatus({
        connected: false,
        configured: true,
        host: 'db.nltbacpanvmvtrzhjdxz.supabase.co',
        database: 'postgres (Supabase Cloud)',
        message: err.message || 'Error de conexión',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  // Identify unsynced orders
  const unsyncedOrders = orders.filter((o) => !remoteOrderIds.has(o.id));
  const hasUnsynced = unsyncedOrders.length > 0;

  const handleCopySql = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      } else {
        const t = document.createElement('textarea');
        t.value = SUPABASE_SCHEMA_SQL;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
      }
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {}
  };

  const handleSyncPendingOrders = async () => {
    setSyncingAll(true);
    setSyncResult(null);
    try {
      const targetList = hasUnsynced ? unsyncedOrders : orders;
      let count = 0;
      for (const order of targetList) {
        const ok = await saveServerOrder(order);
        if (ok) count++;
      }
      setSyncResult(`¡Sincronización completada! ${count} pedido(s) guardados en Supabase.`);
      await loadStatus();
    } catch (err: any) {
      setSyncResult(`Error durante la sincronización: ${err.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-[#15151A] border-[#2C2C35] text-white' : 'bg-white border-zinc-300 text-zinc-950'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
          isDark ? 'bg-[#1A1A1F] border-[#2C2C35]' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Conexión a Base de Datos Supabase
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Cloud PostgreSQL
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Sincronización en tiempo real y persistencia en producción
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          
          {/* Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            status?.connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
          }`}>
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <div className="font-black text-sm flex items-center justify-between">
                <span>{status?.connected ? 'Base de Datos Conectada y Activa' : 'Verificando / Conectando con Supabase'}</span>
                <button
                  type="button"
                  onClick={loadStatus}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Probar Conexión
                </button>
              </div>
              <p className="text-xs opacity-90 font-medium">
                {status?.message || 'Conectando con Supabase...'}
              </p>
            </div>
          </div>

          {/* Connection Details Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-[#1A1A1F]/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <span className="text-[11px] text-zinc-500 font-bold block uppercase tracking-wider">Host Supabase</span>
              <span className="font-mono font-black text-xs text-zinc-900 dark:text-zinc-100 block mt-0.5 truncate">
                db.nltbacpanvmvtrzhjdxz.supabase.co
              </span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-[#1A1A1F]/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <span className="text-[11px] text-zinc-500 font-bold block uppercase tracking-wider">URL del Proyecto</span>
              <span className="font-mono font-black text-xs text-zinc-900 dark:text-zinc-100 block mt-0.5 truncate">
                https://nltbacpanvmvtrzhjdxz.supabase.co
              </span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-[#1A1A1F]/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <span className="text-[11px] text-zinc-500 font-bold block uppercase tracking-wider">Pedidos en Supabase</span>
              <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {status?.orderCount ?? orders.length} pedidos registrados
              </span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-[#1A1A1F]/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <span className="text-[11px] text-zinc-500 font-bold block uppercase tracking-wider">URL Producción (Vercel)</span>
              <a 
                href="https://amore-roan-three.vercel.app/" 
                target="_blank" 
                rel="noreferrer"
                className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
              >
                amore-roan-three.vercel.app
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Conditional Sync Section (Only offers sync when there is unsynced data) */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            hasUnsynced 
              ? 'bg-amber-500/10 border-amber-500/30' 
              : isDark ? 'bg-[#1A1A1F] border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-black text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Layers className={`w-4 h-4 ${hasUnsynced ? 'text-amber-500' : 'text-emerald-500'}`} />
                  {hasUnsynced 
                    ? `Hay ${unsyncedOrders.length} pedido(s) pendiente(s) de sincronizar`
                    : `Todos los pedidos (${orders.length}) están sincronizados con la nube`}
                </h4>
                <p className="text-[11px] text-zinc-500 font-medium">
                  {hasUnsynced
                    ? 'Existen registros en memoria o sesión local que aún no se encuentran guardados en Supabase.'
                    : 'La base de datos en la nube está completamente al día. Cero pérdidas de información.'}
                </p>
              </div>

              {hasUnsynced && (
                <button
                  type="button"
                  onClick={handleSyncPendingOrders}
                  disabled={syncingAll}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                  {syncingAll ? 'Sincronizando...' : `Sincronizar (${unsyncedOrders.length}) a Supabase`}
                </button>
              )}
            </div>

            {syncResult && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs font-bold">
                {syncResult}
              </div>
            )}
          </div>

          {/* SQL Editor Code Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                Script SQL de Tablas (Para Supabase SQL Editor)
              </span>

              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? '¡Copiado!' : 'Copiar SQL'}
              </button>
            </div>

            <pre className={`p-3 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-44 border ${
              isDark ? 'bg-[#0F0F12] border-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-100 border-zinc-700'
            }`}>
              {SUPABASE_SCHEMA_SQL.trim()}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
          isDark ? 'bg-[#1A1A1F] border-[#2C2C35]' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <a
            href="https://supabase.com/dashboard/project/nltbacpanvmvtrzhjdxz/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Abrir Supabase Dashboard
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-black text-xs shadow-xs hover:bg-black dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
