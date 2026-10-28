import { Order, ShippingType, StoreSettings } from '../types';

export function getShippingTypeLabel(type?: ShippingType | null): string {
  if (!type) return 'Seleccionar';
  switch (type) {
    case 'shalom':
      return 'Retiro en agencia Shalom';
    case 'marvisur':
      return 'Retiro en agencia Expreso Marvisur';
    case 'olva':
      return 'Retiro en agencia Olva Courier';
    case 'delivery_lima':
      return 'Delivery (Lima Metropolitana)';
    case 'tienda':
      return 'Retiro en tienda física';
    default:
      return 'Seleccionar';
  }
}

export function getCutoffHourByShippingType(type?: ShippingType | null): number {
  if (!type) return 17;
  switch (type) {
    case 'shalom':
    case 'marvisur':
      return 17; // 5:00 PM (17:00)
    case 'delivery_lima':
      return 10; // 10:00 AM (10:00) - Motorizado
    case 'tienda':
      return 22; // 10:00 PM (22:00)
    case 'olva':
      return 16; // 4:00 PM (16:00)
    default:
      return 17;
  }
}

export function getCutoffDisplay(type?: ShippingType | null): string {
  if (!type) return '17:00 hrs (5:00 PM)';
  switch (type) {
    case 'shalom':
    case 'marvisur':
      return '17:00 hrs (5:00 PM)';
    case 'delivery_lima':
      return '10:00 hrs (10:00 AM)';
    case 'tienda':
      return '22:00 hrs (10:00 PM)';
    case 'olva':
      return '16:00 hrs (4:00 PM)';
    default:
      return '17:00 hrs (5:00 PM)';
  }
}

/**
 * Retorna las clases de color de fondo pastel claro y bordes según el método de envío del pedido:
 * - Shalom: Fondo pastel rojizo claro
 * - Marvisur: Fondo pastel azul índigo
 * - Olva: Fondo pastel amarillo claro
 * - Delivery Lima: Fondo pastel celeste claro
 * - Tienda física: Fondo pastel verde claro
 */
export function getOrderShippingCardStyle(shippingType: ShippingType, isDark: boolean): {
  cardClasses: string;
  badgeClasses: string;
  headerAccent: string;
} {
  switch (shippingType) {
    case 'shalom':
      return {
        cardClasses: isDark 
          ? 'bg-[#1D1B20] border-white/10 hover:border-[#713B50]/60' 
          : 'bg-white border-[#E5E0E3] hover:border-[#713B50]/40',
        badgeClasses: isDark
          ? 'bg-[#713B50]/30 text-rose-300 border-[#713B50]/40'
          : 'bg-[#F7EAF0] text-[#713B50] border-[#713B50]/20',
        headerAccent: 'text-[#713B50] dark:text-rose-300',
      };
    case 'marvisur':
      return {
        cardClasses: isDark 
          ? 'bg-[#1D1B20] border-white/10 hover:border-[#376C80]/60' 
          : 'bg-white border-[#E5E0E3] hover:border-[#376C80]/40',
        badgeClasses: isDark
          ? 'bg-[#376C80]/30 text-sky-300 border-[#376C80]/40'
          : 'bg-[#E8F1F5] text-[#376C80] border-[#376C80]/20',
        headerAccent: 'text-[#376C80] dark:text-sky-300',
      };
    case 'olva':
      return {
        cardClasses: isDark 
          ? 'bg-[#1D1B20] border-white/10 hover:border-[#C69A55]/60' 
          : 'bg-white border-[#E5E0E3] hover:border-[#C69A55]/40',
        badgeClasses: isDark
          ? 'bg-[#C69A55]/30 text-amber-200 border-[#C69A55]/40'
          : 'bg-[#FBF1DD] text-[#B47B28] border-[#C69A55]/30',
        headerAccent: 'text-[#B47B28] dark:text-amber-300',
      };
    case 'delivery_lima':
      return {
        cardClasses: isDark 
          ? 'bg-[#1D1B20] border-white/10 hover:border-[#376C80]/60' 
          : 'bg-white border-[#E5E0E3] hover:border-[#376C80]/40',
        badgeClasses: isDark
          ? 'bg-[#376C80]/30 text-sky-300 border-[#376C80]/40'
          : 'bg-[#E8F1F5] text-[#376C80] border-[#376C80]/20',
        headerAccent: 'text-[#376C80] dark:text-sky-300',
      };
    case 'tienda':
      return {
        cardClasses: isDark 
          ? 'bg-[#1D1B20] border-white/10 hover:border-[#477568]/60' 
          : 'bg-white border-[#E5E0E3] hover:border-[#477568]/40',
        badgeClasses: isDark
          ? 'bg-[#477568]/30 text-emerald-300 border-[#477568]/40'
          : 'bg-[#E8F3ED] text-[#39745F] border-[#477568]/30',
        headerAccent: 'text-[#39745F] dark:text-emerald-300',
      };
    default:
      return {
        cardClasses: isDark 
          ? 'bg-[#1D1B20] border-white/10 hover:border-zinc-500' 
          : 'bg-white border-[#E5E0E3] hover:border-[#713B50]/30',
        badgeClasses: 'bg-zinc-100 text-zinc-900 border-zinc-200',
        headerAccent: 'text-[#29272B] dark:text-zinc-200',
      };
  }
}

/**
 * Retorna las clases y etiquetas de estado de pago del pedido
 */
export function getOrderPaymentCardStyle(order: Order, isDark: boolean): {
  cardClasses: string;
  paymentLabel: string;
  paymentBadgeClass: string;
  paymentIcon: string;
} {
  const baseCard = isDark 
    ? 'bg-[#1D1B20] border-white/10 hover:border-[#713B50]/50' 
    : 'bg-white border-[#E5E0E3] hover:border-[#713B50]/30';

  // Retiro en Tienda
  if (order.shippingType === 'tienda') {
    return {
      cardClasses: baseCard,
      paymentLabel: 'Pago en Tienda',
      paymentBadgeClass: isDark
        ? 'bg-[#477568]/30 text-emerald-300 border-[#477568]/40'
        : 'bg-[#E8F3ED] text-[#39745F] border-[#477568]/30',
      paymentIcon: '🏬',
    };
  }

  // Delivery Lima con Pago Contraentrega
  if (order.shippingType === 'delivery_lima' && order.isCashOnDelivery) {
    const method = order.paymentMethod || 'motorizado';
    const amount = order.cashOnDeliveryAmount ?? order.subtotalAmount ?? 0;
    if (method === 'yape') {
      return {
        cardClasses: baseCard,
        paymentLabel: `Contraentrega Yape (${amount > 0 ? `S/ ${amount.toFixed(2)}` : 'Por Cobrar'})`,
        paymentBadgeClass: isDark
          ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
          : 'bg-purple-50 text-purple-900 border-purple-200',
        paymentIcon: '🟣',
      };
    }

    if (method === 'transferencia') {
      return {
        cardClasses: baseCard,
        paymentLabel: `Contraentrega Transf. (${amount > 0 ? `S/ ${amount.toFixed(2)}` : 'Por Cobrar'})`,
        paymentBadgeClass: isDark
          ? 'bg-blue-950/40 text-blue-300 border-blue-800/40'
          : 'bg-blue-50 text-blue-900 border-blue-200',
        paymentIcon: '🏦',
      };
    }

    // Efectivo / Motorizado
    return {
      cardClasses: baseCard,
      paymentLabel: `Contraentrega Efectivo (${amount > 0 ? `S/ ${amount.toFixed(2)}` : 'Por Cobrar'})`,
      paymentBadgeClass: isDark
        ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
        : 'bg-[#FAF8F5] text-[#29272B] border-[#E5E0E3]',
      paymentIcon: '🛵',
    };
  }

  // Prepagado / Pago Confirmado (Shalom, Olva, Delivery Lima pagado anticipadamente)
  return {
    cardClasses: baseCard,
    paymentLabel: 'Pago Confirmado',
    paymentBadgeClass: isDark
      ? 'bg-[#477568]/30 text-emerald-300 border-[#477568]/40'
      : 'bg-[#E8F3ED] text-[#39745F] border-[#477568]/30',
    paymentIcon: '💳',
  };
}

export function getShippingTypeBadge(type: ShippingType): {
  label: string;
  bgDark: string;
  bgLight: string;
  textDark: string;
  textLight: string;
  borderDark: string;
  borderLight: string;
  iconName: string;
} {
  switch (type) {
    case 'shalom':
      return {
        label: 'SHALOM',
        bgDark: 'bg-[#713B50]/30',
        bgLight: 'bg-[#F7EAF0]',
        textDark: 'text-rose-300',
        textLight: 'text-[#713B50]',
        borderDark: 'border-[#713B50]/40',
        borderLight: 'border-[#713B50]/20',
        iconName: 'Building2',
      };
    case 'marvisur':
      return {
        label: 'MARVISUR',
        bgDark: 'bg-[#376C80]/30',
        bgLight: 'bg-[#E8F1F5]',
        textDark: 'text-sky-300',
        textLight: 'text-[#376C80]',
        borderDark: 'border-[#376C80]/40',
        borderLight: 'border-[#376C80]/20',
        iconName: 'Truck',
      };
    case 'olva':
      return {
        label: 'OLVA COURIER',
        bgDark: 'bg-[#C69A55]/30',
        bgLight: 'bg-[#FBF1DD]',
        textDark: 'text-amber-200',
        textLight: 'text-[#B47B28]',
        borderDark: 'border-[#C69A55]/40',
        borderLight: 'border-[#C69A55]/30',
        iconName: 'Truck',
      };
    case 'delivery_lima':
      return {
        label: 'DELIVERY LIMA',
        bgDark: 'bg-[#376C80]/30',
        bgLight: 'bg-[#E8F1F5]',
        textDark: 'text-sky-300',
        textLight: 'text-[#376C80]',
        borderDark: 'border-[#376C80]/40',
        borderLight: 'border-[#376C80]/20',
        iconName: 'Bike',
      };
    case 'tienda':
      return {
        label: 'TIENDA',
        bgDark: 'bg-[#477568]/30',
        bgLight: 'bg-[#E8F3ED]',
        textDark: 'text-emerald-300',
        textLight: 'text-[#39745F]',
        borderDark: 'border-[#477568]/40',
        borderLight: 'border-[#477568]/30',
        iconName: 'Store',
      };
    default:
      return {
        label: 'ENVÍO',
        bgDark: 'bg-zinc-800',
        bgLight: 'bg-zinc-100',
        textDark: 'text-zinc-300',
        textLight: 'text-zinc-700',
        borderDark: 'border-zinc-700',
        borderLight: 'border-zinc-200',
        iconName: 'Package',
      };
  }
}

export function formatPeruvianDate(dateString: string): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getNext4DispatchDates(
  cutoffHour = 17,
  shippingType?: ShippingType | null,
  maxDates = 4
): Array<{
  dateStr: string;
  displayDay: string;
  displayWeekday: string;
  badge?: string;
  isToday?: boolean;
}> {
  const dates: Array<{
    dateStr: string;
    displayDay: string;
    displayWeekday: string;
    badge?: string;
    isToday?: boolean;
  }> = [];

  const now = new Date();
  const currentHour = now.getHours();

  // Motorizado: Cutoff is strictly 10 AM and NEVER operates on Sundays
  const isMotorizado = shippingType === 'delivery_lima';
  const effectiveCutoff = isMotorizado ? 10 : cutoffHour;

  // Can we dispatch today?
  // Motorizado: Only before 10:00 AM AND not on Sunday
  // Other modalities: If current hour is before cutoffHour
  const isSundayToday = now.getDay() === 0;
  const canDispatchToday = currentHour < effectiveCutoff && (!isMotorizado || !isSundayToday);

  let offset = canDispatchToday ? 0 : 1;
  let safetyCounter = 0;

  while (dates.length < maxDates && safetyCounter < 40) {
    safetyCounter++;
    const cursor = new Date(now);
    cursor.setDate(now.getDate() + offset);
    offset++;

    const dayOfWeek = cursor.getDay(); // 0 is Sunday

    // Motorized delivery NEVER operates on Sundays
    if (isMotorizado && dayOfWeek === 0) {
      continue;
    }

    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const isToday = cursor.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = cursor.toDateString() === tomorrow.toDateString();

    let badge = '';
    if (isToday) badge = 'Hoy';
    else if (isTomorrow) badge = 'Mañana';

    const displayWeekday = cursor.toLocaleDateString('es-PE', { weekday: 'long' });
    const displayDay = cursor.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
    });

    dates.push({
      dateStr,
      displayDay,
      displayWeekday: displayWeekday.charAt(0).toUpperCase() + displayWeekday.slice(1),
      badge,
      isToday,
    });
  }

  return dates;
}

export const WHATSAPP_ICON_URL = 'https://res.cloudinary.com/nqvtgmba/image/upload/v1787125248/whatsapp.png';

/**
 * Normalizes any Peruvian phone number to the international +51 format for wa.me links
 * e.g. "940339934" -> "51940339934", "+51 940 339 934" -> "51940339934"
 */
export function formatPeruvianWhatsAppNumber(phone: string | undefined): string {
  if (!phone) return '51940339934';
  const cleanDigits = phone.replace(/\D/g, '');
  if (cleanDigits.startsWith('51') && cleanDigits.length >= 11) {
    return cleanDigits;
  }
  if (cleanDigits.length === 9) {
    return `51${cleanDigits}`;
  }
  if (cleanDigits.startsWith('0') && cleanDigits.length === 10) {
    return `51${cleanDigits.slice(1)}`;
  }
  return cleanDigits.length > 0 ? `51${cleanDigits}` : '51940339934';
}

export function formatShortPeruvianDate(dateString: string): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const weekday = date.toLocaleDateString('es-PE', { weekday: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      const d = String(day).padStart(2, '0');
      const m = String(month + 1).padStart(2, '0');
      return `${capitalizedWeekday} ${d}/${m}`;
    }
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('es-PE', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${capitalizedWeekday} ${d}/${m}`;
  } catch {
    return dateString;
  }
}

export function buildWhatsAppMessage(order: Order, store: StoreSettings): string {
  let shippingHeaderType = 'AGENCIA';
  let agencyOrLocationText = '';
  let addressOrRefText = '';
  let courierName = 'Shalom';

  if (order.shippingType === 'shalom') {
    shippingHeaderType = 'AGENCIA SHALOM';
    courierName = 'Shalom';
    const dep = order.agency?.department || 'Lima';
    const prov = order.agency?.province || 'Lima';
    const dist = order.agency?.district || 'Lima';
    const name = order.agency?.name?.split('/').pop()?.trim() || order.agency?.name || 'Agencia';
    agencyOrLocationText = `🏦 Agencia Shalom: ${dep} / ${prov} / ${dist} / ${name}`;
    addressOrRefText = `📍 ${order.agency?.address || 'Dirección de agencia'}`;
  } else if (order.shippingType === 'marvisur') {
    shippingHeaderType = 'AGENCIA EXPRESO MARVISUR';
    courierName = 'Expreso Marvisur';
    const dep = order.agency?.department || 'Lima';
    const prov = order.agency?.province || 'Lima';
    const dist = order.agency?.district || 'Lima';
    const name = order.agency?.name?.split('/').pop()?.trim() || order.agency?.name || 'Agencia';
    agencyOrLocationText = `🏦 Agencia Marvisur: ${dep} / ${prov} / ${dist} / ${name}`;
    addressOrRefText = `📍 ${order.agency?.address || 'Dirección de agencia'}`;
  } else if (order.shippingType === 'olva') {
    if (order.agency) {
      shippingHeaderType = 'AGENCIA';
      courierName = 'Olva Courier';
      const dep = order.agency?.department || 'Lima';
      const prov = order.agency?.province || 'Lima';
      const dist = order.agency?.district || 'Lima';
      const name = order.agency?.name || 'Agencia';
      agencyOrLocationText = `🏦 Agencia: ${dep} / ${prov} / ${dist} / ${name}`;
      addressOrRefText = `📍 ${order.agency?.address || 'Dirección de agencia'}`;
    } else {
      shippingHeaderType = 'DOMICILIO';
      courierName = 'Olva Courier';
      agencyOrLocationText = `🏙️ Destino: ${order.deliveryDistrict || 'Lima'}`;
      addressOrRefText = `📍 ${order.deliveryAddress || 'Dirección de entrega'}${order.deliveryReference ? ` (Ref: ${order.deliveryReference})` : ''}`;
    }
  } else if (order.shippingType === 'delivery_lima') {
    shippingHeaderType = 'LIMA DOMICILIO';
    courierName = 'Delivery Motorizado';
    agencyOrLocationText = `🏙️ Distrito: ${order.deliveryDistrict || 'Lima Metropolitana'}`;
    addressOrRefText = `📍 ${order.deliveryAddress || 'Dirección'}${order.deliveryReference ? `, Ref. ${order.deliveryReference}` : ''}`;
  } else {
    shippingHeaderType = 'RETIRO EN TIENDA';
    courierName = store.storeName || 'Amore Salon';
    agencyOrLocationText = `🏪 Local: ${store.address || 'CyberPlaza - Lima Centro'}`;
    addressOrRefText = `⏰ Horario: ${store.openingHours || 'Lun - Sáb: 9am - 8pm'}`;
  }

  const shortDate = formatShortPeruvianDate(order.dispatchDate);

  const lines = [
    `📦 NUEVO ENVÍO (${shippingHeaderType})`,
    '',
    `👤 ${order.customerName}`,
    `📱 ${order.customerPhone}`,
    `🆔 ${order.documentType || 'DNI'}: ${order.documentNumber}`,
    agencyOrLocationText,
    addressOrRefText,
    '',
    `🚚 ${courierName}`,
    `📅 ${shortDate}`,
  ];

  if (order.notes) {
    lines.push(`📝 Nota: ${order.notes}`);
  }

  if (order.isCashOnDelivery && order.shippingType === 'delivery_lima') {
    lines.push(`💵 Pago Contraentrega: S/ ${Number(order.cashOnDeliveryAmount || order.totalAmount || 0).toFixed(2)}`);
  }

  return lines.filter(line => line !== null && line !== undefined).join('\n');
}

export function getWhatsAppShareUrl(order: Order, store: StoreSettings): string {
  const text = buildWhatsAppMessage(order, store);
  const targetNumber = '51940339934';
  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
}

export function buildCustomerStatusWhatsAppMessage(order: Order, store?: Partial<StoreSettings>): string {
  const storeName = store?.storeName || 'AMORE SALON HAIR STYLE';
  const customerFirst = order.customerName.split(' ')[0] || order.customerName;

  if (order.status === 'nuevos') {
    if (order.shippingType === 'delivery_lima') {
      const codInfo = order.isCashOnDelivery
        ? `\n💵 *Modalidad:* Pago Contraentrega (Monto a pagar: S/ ${Number(order.cashOnDeliveryAmount || order.totalAmount || 0).toFixed(2)})`
        : `\n💳 *Modalidad:* Pago Previo Confirmado`;

      return (
        `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
        `Tu pedido *#${order.id}* con destino *${order.deliveryDistrict || 'Lima'}* se encuentra registrado con éxito.\n\n` +
        `🕒 *Horario de Entrega:* Tu pedido llegará hoy en el rango de *3:00 PM a 10:00 PM*. El motorizado se comunicará contigo cuando se encuentre en camino.` +
        `${codInfo}\n` +
        `📍 *Dirección:* ${order.deliveryAddress || ''} (Ref: ${order.deliveryReference || 'S/R'})\n\n` +
        `¡Muchas gracias por tu preferencia! ✨`
      );
    }

    if (order.shippingType === 'shalom') {
      const destination = order.agency?.name || 'Agencia Shalom';
      return (
        `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
        `Te confirmamos que tu pedido *#${order.id}* está registrado y en breve se despachará vía *SHALOM* con destino a: *${destination}*.\n\n` +
        `Apenas tengamos tu número de guía y código de retiro te lo compartiremos por este medio. 📦✨`
      );
    }

    if (order.shippingType === 'olva') {
      const destination = order.agency ? order.agency.name : `Domicilio en ${order.deliveryDistrict || 'Lima/Provincia'}`;
      return (
        `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
        `Te confirmamos que tu pedido *#${order.id}* está registrado y en breve se despachará vía *OLVA COURIER* (${destination}).\n\n` +
        `Apenas tengamos tu número de remito / código de tracking te lo compartiremos por aquí. 📦✨`
      );
    }

    return (
      `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
      `Tu pedido *#${order.id}* para *Retiro en Tienda* se encuentra en preparación. Te avisaremos en cuanto esté disponible para que pases a recogerlo. 🏪✨`
    );
  }

  if (order.status === 'empacados') {
    return (
      `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
      `Tu pedido *#${order.id}* ya se encuentra *EMPACADO* y verificado con su respectivo rótulo de despacho para *${getShippingTypeLabel(order.shippingType)}*. 📦✨`
    );
  }

  if (order.status === 'en_camino') {
    if (order.shippingType === 'delivery_lima') {
      const codReminder = order.isCashOnDelivery
        ? ` Recuerda tener a la mano el monto de *S/ ${Number(order.cashOnDeliveryAmount || order.totalAmount || 0).toFixed(2)}* para el pago contraentrega.`
        : '';
      return (
        `¡Hola ${customerFirst}! 👋 Tu pedido *#${order.id}* ya se encuentra *EN CAMINO* con el repartidor motorizado. Recuerda que la entrega es en el rango de *3:00 PM a 10:00 PM*.${codReminder} 🛵💨`
      );
    }

    return (
      `¡Hola ${customerFirst}! 👋 Tu pedido *#${order.id}* ya fue entregado a *${getShippingTypeLabel(order.shippingType)}* y se encuentra *EN RUTA / EN CAMINO* hacia tu destino. 🚚✨`
    );
  }

  // Entregados
  return (
    `¡Hola ${customerFirst}! 👋 Te confirmamos que tu pedido *#${order.id}* figura como *ENTREGADO CON ÉXITO* 🎉.\n\n` +
    `¡Muchas gracias por confiar en *${storeName}*! Esperamos que disfrutes tus productos. ✨💖`
  );
}

export function getCustomerDirectWhatsAppUrl(order: Order, store?: Partial<StoreSettings>): string {
  const target = formatPeruvianWhatsAppNumber(order.customerPhone);
  const message = buildCustomerStatusWhatsAppMessage(order, store);
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

export function buildTrackingWhatsAppMessage(order: Order, store?: Partial<StoreSettings>): string {
  const customerFirst = order.customerName.split(' ')[0] || order.customerName;
  const storeName = store?.storeName || 'AMORE SALON HAIR STYLE';
  const tracking = (order.trackingNumber || '').trim();

  if (order.shippingType === 'shalom') {
    const destination = order.agency?.name || 'Agencia Shalom';
    return (
      `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
      `Tu pedido *#${order.id}* ya fue entregado a *SHALOM* con destino a: *${destination}*.\n\n` +
      `📦 *NÚMERO DE GUÍA / TRACKING:* *${tracking}*\n\n` +
      `Puedes realizar el seguimiento o presentarlo para retirar tu paquete con tu DNI. ¡Muchas gracias por tu preferencia! ✨💖`
    );
  }

  if (order.shippingType === 'olva') {
    const destination = order.agency ? order.agency.name : `Domicilio en ${order.deliveryDistrict || 'Lima/Provincia'}`;
    return (
      `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
      `Tu pedido *#${order.id}* ya fue entregado a *OLVA COURIER* (${destination}).\n\n` +
      `📦 *NÚMERO DE REMITO / TRACKING:* *${tracking}*\n\n` +
      `Puedes consultar el estado del paquete en la plataforma de Olva con tu número de remito. ¡Muchas gracias por tu compra! ✨💖`
    );
  }

  if (order.shippingType === 'delivery_lima') {
    const codNote = order.isCashOnDelivery
      ? `\n💵 *Pago Contraentrega:* S/ ${Number(order.cashOnDeliveryAmount || order.totalAmount || 0).toFixed(2)}`
      : '';
    return (
      `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
      `Tu pedido *#${order.id}* ya fue despachado con el motorizado.${tracking ? `\n🛵 *Guía/Ref:* *${tracking}*` : ''}\n` +
      `🕒 *Horario de Entrega:* Hoy de *3:00 PM a 10:00 PM*. El repartidor se comunicará contigo al estar en camino.${codNote}\n\n` +
      `¡Muchas gracias por tu compra! ✨`
    );
  }

  return (
    `¡Hola ${customerFirst}! 👋 Te saludamos de *${storeName}*.\n\n` +
    `Tu pedido *#${order.id}* cuenta con el código de seguimiento: *${tracking}*. ¡Muchas gracias por tu compra! ✨`
  );
}

export function getTrackingWhatsAppUrl(order: Order, store?: Partial<StoreSettings>): string {
  const target = formatPeruvianWhatsAppNumber(order.customerPhone);
  const message = buildTrackingWhatsAppMessage(order, store);
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

export function generateOrderId(): string {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `PE-${randNum}`;
}

export function getBrandLogo(isDark: boolean, settings?: StoreSettings): string {
  if (isDark) {
    return settings?.logoDarkUrl || settings?.logoHorizontalUrl || settings?.logoUrl || 'https://res.cloudinary.com/nqvtgmba/image/upload/v1787286775/AmoreBlackbg.png';
  }
  return settings?.logoLightUrl || settings?.logoHorizontalUrl || settings?.logoUrl || 'https://res.cloudinary.com/nqvtgmba/image/upload/v1787286775/AmoreWhitebg.png';
}

