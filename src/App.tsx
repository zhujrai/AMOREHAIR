import React, { useState, useEffect, useRef } from 'react';
import { 
  Order, 
  OrderStatus, 
  KnownCustomer, 
  StoreSettings,
  ShippingMethodsConfig,
  Agency,
  AdminUser
} from './types';
import { 
  STORE_SETTINGS, 
  INITIAL_ORDERS, 
  KNOWN_CUSTOMERS,
  SHALOM_AGENCIES,
  OLVA_AGENCIES,
  MARVISUR_AGENCIES
} from './data/agencies';
import { Navbar } from './components/Navbar';
import { ClientShippingForm } from './components/ClientShippingForm';
import { SuccessSummaryModal } from './components/SuccessSummaryModal';
import { AdminKanban } from './components/AdminKanban';
import { AdminLogin } from './components/AdminLogin';
import { Lock, Sparkles, ShieldCheck, Bell, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { 
  fetchServerOrders, 
  saveServerOrder, 
  deleteServerOrder, 
  deleteServerOrderPermanently,
  restoreServerOrder,
  emptyTrashServerOrders,
  fetchServerShippingConfig, 
  saveServerShippingConfig, 
  fetchServerStoreSettings, 
  saveServerStoreSettings,
  fetchAgenciesWithPriority,
  checkDatabaseStatus,
  supabase
} from './utils/dbApi';
import { playNewOrderSound } from './utils/audioNotification';

const STORAGE_KEY_ORDERS = 'logiperu_orders_v1';
const STORAGE_KEY_THEME = 'logiperu_theme_v1';
const STORAGE_KEY_CUSTOMERS = 'logiperu_customers_v1';
const STORAGE_KEY_ADMIN_AUTH = 'logiperu_admin_auth_v1';
const STORAGE_KEY_SHIPPING_CONFIG = 'logiperu_shipping_config_v1';
const STORAGE_KEY_SHALOM_AGENCIES = 'logiperu_shalom_agencies_v2';
const STORAGE_KEY_OLVA_AGENCIES = 'logiperu_olva_agencies_v1';
const STORAGE_KEY_MARVISUR_AGENCIES = 'logiperu_marvisur_agencies_v1';
const STORAGE_KEY_STORE_SETTINGS = 'logiperu_store_settings_v1';

export default function App() {
  // Theme state: por defecto depende del navegador / sistema (prefers-color-scheme) si no hay preferencia guardada
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved !== null) {
        return saved === 'dark';
      }
      // Detectar preferencia del navegador/sistema
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Escuchar cambios de tema del sistema si no se fijó preferencia manual
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === null) {
        setIsDark(e.matches);
      }
    };
    try {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Helper to determine initial view based on URL pathname (/pedidos vs /)
  const getInitialView = (): 'cliente' | 'admin' => {
    if (typeof window === 'undefined') return 'admin';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.startsWith('/pedidos') || hash === '#pedidos' || hash === '#cliente') {
      return 'cliente';
    }
    // Default main URL is the admin dashboard / PIN login
    return 'admin';
  };

  // Current view state: 'admin' (by default on /) or 'cliente' (on /pedidos)
  const [currentView, setCurrentView] = useState<'cliente' | 'admin'>(getInitialView);

  // Admin authentication state with persistent credentials check
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    const isSessionAuth = sessionStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true';
    const isLocalAuth = localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true';
    const hasToken = Boolean(localStorage.getItem('logiperu_admin_token') || sessionStorage.getItem('logiperu_admin_token'));
    return (isSessionAuth || isLocalAuth) && (hasToken || Boolean(localStorage.getItem('logiperu_admin_user')));
  });

  // Current logged in admin user
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('logiperu_admin_user') || sessionStorage.getItem('logiperu_admin_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Auto-verify saved session token with backend on mount
  useEffect(() => {
    const token = localStorage.getItem('logiperu_admin_token') || sessionStorage.getItem('logiperu_admin_token');
    if (token) {
      fetch('/api/admin/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.valid) {
            setIsAdminAuthenticated(true);
            if (data.user) {
              setAdminUser(data.user);
              if (localStorage.getItem('logiperu_admin_token')) {
                localStorage.setItem('logiperu_admin_user', JSON.stringify(data.user));
              }
            }
          }
        })
        .catch(() => {
          // If server temporarily unreachable, keep client session active
        });
    }
  }, []);

  // Orders State with localStorage persistence
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_ORDERS;
      }
    }
    return INITIAL_ORDERS;
  });

  // Ref to track existing order IDs to detect new ones in real-time
  const knownOrderIdsRef = useRef<Set<string>>(new Set(orders.map(o => o.id)));

  // Update knownOrderIdsRef whenever orders change locally
  useEffect(() => {
    orders.forEach(o => knownOrderIdsRef.current.add(o.id));
  }, [orders]);

  // Known Customers database
  const [knownCustomers, setKnownCustomers] = useState<KnownCustomer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return KNOWN_CUSTOMERS;
      }
    }
    return KNOWN_CUSTOMERS;
  });

  // Shipping Methods Active/Inactive Configuration
  const [shippingConfig, setShippingConfig] = useState<ShippingMethodsConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SHIPPING_CONFIG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { shalom: true, olva: true, delivery_lima: true, tienda: true };
      }
    }
    return { shalom: true, olva: true, delivery_lima: true, tienda: true };
  });

  // Shalom Agencies list with full catalog (excluding Punto PRO) and API synchronization
  const [shalomAgencies, setShalomAgencies] = useState<Agency[]>(() => {
    const isPuntoPro = (a: Agency) => {
      const tipo = String(a.tipo || '').toUpperCase();
      const name = String(a.name || '').toLowerCase();
      return tipo === 'PUNTO PRO' || name.includes('punto pro');
    };

    const saved = localStorage.getItem(STORAGE_KEY_SHALOM_AGENCIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(a => !isPuntoPro(a));
          if (clean.length > 0) return clean;
        }
      } catch {
        return SHALOM_AGENCIES;
      }
    }
    return SHALOM_AGENCIES;
  });

  // Olva Agencies list with full catalog and API synchronization
  const [olvaAgencies, setOlvaAgencies] = useState<Agency[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_OLVA_AGENCIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= OLVA_AGENCIES.length) return parsed;
      } catch {
        return OLVA_AGENCIES;
      }
    }
    return OLVA_AGENCIES;
  });

  // Marvisur Agencies list with full catalog and API synchronization
  const [marvisurAgencies, setMarvisurAgencies] = useState<Agency[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MARVISUR_AGENCIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= MARVISUR_AGENCIES.length) return parsed;
      } catch {
        return MARVISUR_AGENCIES;
      }
    }
    return MARVISUR_AGENCIES;
  });

  // Database connection status state
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string>('');
  const lastConnectionStateRef = useRef<boolean>(true);

  // Helper to check DB connection status
  const verifyDbConnection = async (silent = false) => {
    if (!silent) setIsCheckingDb(true);
    try {
      const status = await checkDatabaseStatus();
      if (status.connected) {
        setIsDbConnected(true);
        setDbErrorMessage('');
        if (!lastConnectionStateRef.current) {
          showToast('✅ Conexión con la base de datos restablecida');
        }
        lastConnectionStateRef.current = true;
      } else {
        setIsDbConnected(false);
        setDbErrorMessage(status.message);
        lastConnectionStateRef.current = false;
      }
    } catch (err: any) {
      setIsDbConnected(false);
      setDbErrorMessage(err?.message || 'Error de conexión con la base de datos');
      lastConnectionStateRef.current = false;
    } finally {
      if (!silent) setIsCheckingDb(false);
    }
  };

  // Helper to process fetched orders and alert if new ones arrive
  const handleIncomingOrders = (incoming: Order[]) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;

    const newOrders = incoming.filter(o => !knownOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0) {
      // Add to known IDs
      newOrders.forEach(o => knownOrderIdsRef.current.add(o.id));

      // Play pleasant notification sound
      playNewOrderSound();

      // Show toast alert
      const latestOrder = newOrders[0];
      showToast(`🔔 ¡Nuevo pedido recibido! ${latestOrder.customerName || latestOrder.id}`);
    }

    setOrders(incoming);
  };

  // Sincronización de agencias priorizando Base de Datos Supabase -> API
  useEffect(() => {
    // 1. Verificación inicial de base de datos
    verifyDbConnection(true);

    const handleOnline = () => {
      verifyDbConnection(false);
    };
    const handleOffline = () => {
      setIsDbConnected(false);
      setDbErrorMessage('Sin conexión a internet (dispositivo sin red).');
      lastConnectionStateRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat de chequeo de base de datos cada 30 segundos
    const dbHeartbeat = setInterval(() => {
      verifyDbConnection(true);
    }, 30000);

    fetchAgenciesWithPriority('shalom').then(({ data }) => {
      if (Array.isArray(data) && data.length > 0) {
        const clean = data.filter(a => a.tipo !== 'PUNTO PRO' && !a.name.toLowerCase().includes('punto pro'));
        setShalomAgencies(clean);
        localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(clean));
      }
    }).catch(() => {});

    fetchAgenciesWithPriority('olva').then(({ data }) => {
      if (Array.isArray(data) && data.length > 0) {
        setOlvaAgencies(data);
        localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(data));
      }
    }).catch(() => {});

    fetchAgenciesWithPriority('marvisur').then(({ data }) => {
      if (Array.isArray(data) && data.length > 0) {
        setMarvisurAgencies(data);
        localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(data));
      }
    }).catch(() => {});

    // Sincronización inicial de pedidos con Supabase Cloud (cero data demo inventada)
    fetchServerOrders().then((serverOrders) => {
      if (Array.isArray(serverOrders)) {
        serverOrders.forEach(o => knownOrderIdsRef.current.add(o.id));
        setOrders(serverOrders);
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(serverOrders));
        setIsDbConnected(true);
        lastConnectionStateRef.current = true;
      }
    }).catch(() => {
      verifyDbConnection(true);
    });

    fetchServerShippingConfig().then((cfg) => {
      if (cfg) setShippingConfig(cfg);
    }).catch(() => {});

    fetchServerStoreSettings().then((st) => {
      if (st) setStoreSettings((prev) => ({ ...prev, ...st }));
    }).catch(() => {});

    // Suscripción a cambios en tiempo real de Supabase
    let channel: any = null;
    try {
      channel = supabase
        .channel('realtime_orders_app')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchServerOrders().then((latest) => {
            if (Array.isArray(latest)) {
              handleIncomingOrders(latest);
              setIsDbConnected(true);
              lastConnectionStateRef.current = true;
            }
          });
        })
        .subscribe();
    } catch {}

    // Polling de respaldo cada 10 segundos para garantizar detección inmediata en cualquier red
    const pollInterval = setInterval(() => {
      fetchServerOrders().then((latest) => {
        if (Array.isArray(latest)) {
          handleIncomingOrders(latest);
          if (!lastConnectionStateRef.current) {
            setIsDbConnected(true);
            lastConnectionStateRef.current = true;
          }
        }
      }).catch(() => {
        verifyDbConnection(true);
      });
    }, 10000);

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      clearInterval(pollInterval);
      clearInterval(dbHeartbeat);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Store Settings (Remitente) with localStorage persistence
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STORE_SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isOldCloudinary = (url?: string) => 
          !url || url.includes('v1787124583') || url.includes('v1787124738');

        return {
          ...STORE_SETTINGS,
          ...parsed,
          logoUrl: isOldCloudinary(parsed.logoUrl) ? STORE_SETTINGS.logoUrl : parsed.logoUrl,
          logoHorizontalUrl: isOldCloudinary(parsed.logoHorizontalUrl) ? STORE_SETTINGS.logoHorizontalUrl : parsed.logoHorizontalUrl,
          logoSquareUrl: isOldCloudinary(parsed.logoSquareUrl) ? STORE_SETTINGS.logoSquareUrl : parsed.logoSquareUrl,
        };
      } catch {
        return STORE_SETTINGS;
      }
    }
    return STORE_SETTINGS;
  });

  // Success summary modal state
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateStoreSettings = (newSettings: StoreSettings) => {
    setStoreSettings(newSettings);
    localStorage.setItem(STORAGE_KEY_STORE_SETTINGS, JSON.stringify(newSettings));
    saveServerStoreSettings(newSettings).catch(() => {});
    showToast('Identidad y configuración de la empresa actualizadas');
  };

  // Sync browser path and hash changes (e.g. forward/back buttons, manual URL changes)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.startsWith('/pedidos') || hash === '#pedidos' || hash === '#cliente') {
        setCurrentView('cliente');
      } else {
        setCurrentView('admin');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Update browser URL and view state
  const navigateToView = (view: 'cliente' | 'admin') => {
    setCurrentView(view);
    const targetPath = view === 'cliente' ? '/pedidos' : '/';
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
    }
  };

  // Sync document title dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const brandName = storeSettings.storeName || 'AMORE SALON HAIR STYLE';
      if (currentView === 'cliente') {
        document.title = `${brandName} • Formulario de Envíos`;
      } else {
        document.title = `${brandName} • Panel Administrativo`;
      }
    }
  }, [currentView, storeSettings.storeName]);

  // Sync theme with document class & localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Sync orders with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  }, [orders]);

  // Sync known customers with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(knownCustomers));
  }, [knownCustomers]);

  // Sync shipping config with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHIPPING_CONFIG, JSON.stringify(shippingConfig));
  }, [shippingConfig]);

  // Sync shalom agencies with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHALOM_AGENCIES, JSON.stringify(shalomAgencies));
  }, [shalomAgencies]);

  // Sync olva agencies with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_OLVA_AGENCIES, JSON.stringify(olvaAgencies));
  }, [olvaAgencies]);

  // Sync marvisur agencies with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MARVISUR_AGENCIES, JSON.stringify(marvisurAgencies));
  }, [marvisurAgencies]);

  // Handle admin login success
  const handleAdminLoginSuccess = (token?: string, user?: AdminUser, remember = true) => {
    setIsAdminAuthenticated(true);
    if (user) {
      setAdminUser(user);
    }
    if (remember) {
      localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
      if (token) localStorage.setItem('logiperu_admin_token', token);
      if (user) localStorage.setItem('logiperu_admin_user', JSON.stringify(user));
    } else {
      sessionStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
      if (token) sessionStorage.setItem('logiperu_admin_token', token);
      if (user) sessionStorage.setItem('logiperu_admin_user', JSON.stringify(user));
    }
    showToast(`¡Bienvenido ${user?.name || 'Administrador'}! Sesión iniciada.`);
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    localStorage.removeItem('logiperu_admin_token');
    sessionStorage.removeItem('logiperu_admin_token');
    localStorage.removeItem('logiperu_admin_user');
    sessionStorage.removeItem('logiperu_admin_user');
    showToast('Sesión de Administrador cerrada correctamente');
  };

  // Handle new order creation from Client form
  const handleOrderCreated = (newOrder: Order) => {
    // Add to orders list
    setOrders((prev) => [newOrder, ...prev]);

    // Persist to Supabase
    saveServerOrder(newOrder).catch(() => {});

    // Add or update customer in known customers memory
    setKnownCustomers((prev) => {
      const existingIdx = prev.findIndex((c) => c.phone === newOrder.customerPhone);
      const customerData: KnownCustomer = {
        phone: newOrder.customerPhone,
        fullName: newOrder.customerName,
        documentNumber: newOrder.documentNumber,
        documentType: newOrder.documentType,
        preferredShippingType: newOrder.shippingType,
        preferredAgency: newOrder.agency?.id,
        preferredAddress: newOrder.deliveryAddress,
        preferredDistrict: newOrder.deliveryDistrict,
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = customerData;
        return copy;
      }
      return [...prev, customerData];
    });

    setLastCreatedOrder(newOrder);
    setShowSuccessModal(true);
    showToast(`¡Envío #${newOrder.id} registrado exitosamente!`);
  };

  // Update order status in Kanban
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      const targetOrder = updated.find((o) => o.id === orderId);
      if (targetOrder) {
        saveServerOrder(targetOrder).catch(() => {});
      }
      return updated;
    });
    showToast(`Pedido #${orderId} actualizado`);
  };

  // Full order update (editing details, contraentrega, address, recipient)
  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    saveServerOrder(updatedOrder).catch(() => {});
    showToast(`Pedido #${updatedOrder.id} modificado correctamente`);
  };

  // Delete order -> Move to Trash (Soft Delete)
  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              isDeleted: true,
              deletedAt: new Date().toISOString(),
              previousStatus: o.status,
            }
          : o
      )
    );
    deleteServerOrder(orderId).catch(() => {});
    showToast(`Pedido #${orderId} movido a la papelera`);
  };

  // Restore order from Trash
  const handleRestoreOrder = (order: Order) => {
    const restoredOrder: Order = {
      ...order,
      isDeleted: false,
      deletedAt: undefined,
      status: order.previousStatus || 'nuevos',
    };
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? restoredOrder : o))
    );
    restoreServerOrder(restoredOrder).catch(() => {});
    showToast(`¡Pedido #${order.id} rescatado de la papelera!`);
  };

  // Permanently delete order from Supabase
  const handleDeleteOrderPermanent = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    deleteServerOrderPermanently(orderId).catch(() => {});
    showToast(`Pedido #${orderId} eliminado definitivamente`);
  };

  // Empty all trash permanently
  const handleEmptyTrash = () => {
    const trashItems = orders.filter((o) => o.isDeleted);
    setOrders((prev) => prev.filter((o) => !o.isDeleted));
    emptyTrashServerOrders(trashItems).catch(() => {});
    showToast(`Papelera vaciada (${trashItems.length} pedidos eliminados)`);
  };

  const pendingCount = orders.filter((o) => !o.isDeleted && o.status === 'nuevos').length;
  const activeOrdersCount = orders.filter((o) => !o.isDeleted).length;

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-inter ${
      isDark 
        ? 'bg-[#0F172A] text-[#FFFFFF]' 
        : 'bg-[#F8FAFC] text-[#0F172A]'
    }`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="px-4 py-3 rounded-2xl bg-[#1E293B] text-white border border-blue-500/30 shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Alerta Destacada de Desconexión de Base de Datos */}
      {!isDbConnected && (
        <div 
          id="db-connection-alert-banner"
          role="alert"
          aria-live="assertive"
          className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-3 sm:px-5 py-2.5 shadow-lg border-b border-red-500/40 sticky top-0 z-50 animate-in slide-in-from-top duration-300 backdrop-blur-md"
        >
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-left w-full sm:w-auto">
              <div className="p-1.5 rounded-lg bg-black/20 text-white flex-shrink-0 animate-pulse">
                <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md">
                    Sin Conexión a la Base de Datos
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-red-100 font-medium mt-0.5 leading-snug">
                  {dbErrorMessage || 'No se puede establecer comunicación con Supabase Cloud. Los cambios y nuevos pedidos se guardarán provisionalmente en este dispositivo hasta restablecer la conexión.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => verifyDbConnection(false)}
                disabled={isCheckingDb}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-white text-red-700 hover:bg-red-50 font-black text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
                <span>{isCheckingDb ? 'Comprobando...' : 'Reintentar conexión'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation - Fixed / Sticky Header exclusively for Dispatch Admin Dashboard */}
      {currentView === 'admin' && isAdminAuthenticated && (
        <Navbar
          currentView={currentView}
          isAdminAuthenticated={isAdminAuthenticated}
          adminUser={adminUser}
          onNavigateToClient={() => navigateToView('cliente')}
          onNavigateToAdmin={() => navigateToView('admin')}
          onLogout={handleAdminLogout}
          isDark={isDark}
          setIsDark={setIsDark}
          pendingCount={pendingCount}
          totalOrdersCount={activeOrdersCount}
          storeSettings={storeSettings}
          onUpdateStoreSettings={handleUpdateStoreSettings}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {currentView === 'cliente' ? (
          <ClientShippingForm
            storeSettings={storeSettings}
            knownCustomers={knownCustomers}
            onOrderCreated={handleOrderCreated}
            shippingConfig={shippingConfig}
            shalomAgencies={shalomAgencies}
            olvaAgencies={olvaAgencies}
            marvisurAgencies={marvisurAgencies}
            isDark={isDark}
            setIsDark={setIsDark}
            onNavigateToAdmin={() => navigateToView('admin')}
            isDbConnected={isDbConnected}
          />
        ) : !isAdminAuthenticated ? (
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            onBackToClient={() => navigateToView('cliente')}
            storeSettings={storeSettings}
            isDark={isDark}
          />
        ) : (
          <AdminKanban
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            onRestoreOrder={handleRestoreOrder}
            onDeleteOrderPermanent={handleDeleteOrderPermanent}
            onEmptyTrash={handleEmptyTrash}
            storeSettings={storeSettings}
            onUpdateStoreSettings={handleUpdateStoreSettings}
            isDark={isDark}
            onSwitchToClient={() => navigateToView('cliente')}
            shippingConfig={shippingConfig}
            onUpdateShippingConfig={(newConfig) => {
              setShippingConfig(newConfig);
              saveServerShippingConfig(newConfig).catch(() => {});
              showToast('Métodos de envío actualizados');
            }}
            shalomAgencies={shalomAgencies}
            onUpdateShalomAgencies={(agencies) => {
              setShalomAgencies(agencies);
              showToast(`Lista de agencias Shalom actualizada (${agencies.length} locales)`);
            }}
            olvaAgencies={olvaAgencies}
            onUpdateOlvaAgencies={(agencies) => {
              setOlvaAgencies(agencies);
              showToast(`Lista de agencias Olva actualizada (${agencies.length} locales)`);
            }}
            marvisurAgencies={marvisurAgencies}
            onUpdateMarvisurAgencies={(agencies) => {
              setMarvisurAgencies(agencies);
              showToast(`Lista de sucursales Marvisur actualizada (${agencies.length} locales)`);
            }}
          />
        )}
      </main>

      {/* Success Summary Modal (Customer view only) */}
      <SuccessSummaryModal
        order={lastCreatedOrder}
        storeSettings={storeSettings}
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewOrder={() => {
          setShowSuccessModal(false);
          setLastCreatedOrder(null);
        }}
        isDark={isDark}
      />

      {/* Public Footer Strip from Design Specification */}
      <footer className={`border-t py-4 sm:py-5 transition-colors duration-200 mt-auto ${
        isDark 
          ? 'bg-[#0F172A]/80 border-white/5 text-[#475569]' 
          : 'bg-white border-[#E2E8F0] text-[#475569]'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="font-mono-meta text-[11px] uppercase tracking-[0.12em] text-[#475569] font-medium">
            © 2026 AMORE SALON HAIR STYLE
          </div>

          {currentView !== 'admin' && !isAdminAuthenticated && (
            <div className="flex items-center gap-5">
              <button
                id="footer-operator-login-btn"
                type="button"
                onClick={() => navigateToView('admin')}
                className="text-zinc-400 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Acceso Administración"
                aria-label="Acceso Administración"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </footer>

    </div>
  );
}
