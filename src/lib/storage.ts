import { Product, Shop, Order, DueCollectionRecord, DailyMetrics, Category } from '../types';

const STORAGE_KEYS = {
  SHOPS: 'dsr_shops_v1',
  PRODUCTS: 'dsr_products_v1',
  ORDERS: 'dsr_orders_v1',
  COLLECTIONS: 'dsr_collections_v1',
  LAST_MEMO_NUM: 'dsr_last_memo_v1',
  CATEGORIES: 'dsr_categories_v1',
};

// Initial default FMCG products common in Bangladesh grocery distribution
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Rupchanda Soybean Oil (5L)',
    banglaName: 'রূপচাঁদা সয়াবিন তেল (৫ লিটার)',
    sku: 'OIL-RUP-5L',
    category: 'তেল ও ঘি',
    unit: 'কার্টুন',
    unitPrice: 3850,
    costPrice: 3680,
    stock: 45,
    minStockAlert: 10,
    tradeOfferDesc: 'প্রতি ৫ কার্টুনে ২০০৳ ছাড়',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-2',
    name: 'Teer Atta (2Kg Pack)',
    banglaName: 'তীর আটা (২ কেজি প্যাকেট)',
    sku: 'FLR-TEER-2K',
    category: 'আটা ও ময়দা',
    unit: 'কার্টুন',
    unitPrice: 1280,
    costPrice: 1190,
    stock: 60,
    minStockAlert: 15,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-3',
    name: 'Fresh Refined Sugar (1Kg)',
    banglaName: 'ফ্রেশ পরিশোধিত চিনি (১ কেজি)',
    sku: 'SUG-FRSH-1K',
    category: 'চিনি ও গুড়',
    unit: 'বস্তা',
    unitPrice: 6500,
    costPrice: 6250,
    stock: 22,
    minStockAlert: 8,
    imageUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-4',
    name: 'Danish Condensed Milk (397g)',
    banglaName: 'ড্যানিশ কনডেন্সড মিল্ক (৩৯৭ গ্রাম)',
    sku: 'MLK-DNSH-397',
    category: 'দুধ ও দুগ্ধজাত',
    unit: 'কার্টুন',
    unitPrice: 3950,
    costPrice: 3750,
    stock: 35,
    minStockAlert: 10,
    tradeOfferDesc: '১০ কার্টুনে ১ কার্টুন ফ্রি',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-5',
    name: 'Radhuni Turmeric Powder (200g)',
    banglaName: 'রাঁধুনী হলুদ গুঁড়া (২০০ গ্রাম)',
    sku: 'SPC-RAD-200',
    category: 'মসলা',
    unit: 'কার্টুন',
    unitPrice: 1850,
    costPrice: 1680,
    stock: 8, // Low stock on purpose
    minStockAlert: 12,
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-6',
    name: 'Lux Velvet Glow Soap (100g)',
    banglaName: 'লাক্স বিউটি সাবান (১০০ গ্রাম)',
    sku: 'SOP-LUX-100',
    category: 'টয়লেটিজ ও সাবান',
    unit: 'ডজন',
    unitPrice: 720,
    costPrice: 640,
    stock: 50,
    minStockAlert: 15,
    imageUrl: 'https://images.unsplash.com/photo-1607006314181-42778f307399?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-7',
    name: 'Pran Frooto Mango Juice (250ml)',
    banglaName: 'প্রাণ ফ্রুটো ম্যাঙ্গো জুস (২৫০ মি.লি.)',
    sku: 'BEV-PRN-250',
    category: 'পানীয়',
    unit: 'কার্টুন',
    unitPrice: 640,
    costPrice: 560,
    stock: 40,
    minStockAlert: 10,
    tradeOfferDesc: '৫ কার্টুনে ২৫৳ ছাড়',
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-8',
    name: 'Parachute Coconut Oil (200ml)',
    banglaName: 'প্যারাসুট নারিকেল তেল (২০০ মি.লি.)',
    sku: 'OIL-PAR-200',
    category: 'টয়লেটিজ ও কসমেটিক্স',
    unit: 'কার্টুন',
    unitPrice: 2400,
    costPrice: 2200,
    stock: 25,
    minStockAlert: 10,
    imageUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-9',
    name: 'Energy Plus Biscuit Box',
    banglaName: 'এনার্জি প্লাস বিস্কুট বক্স',
    sku: 'BSC-ENG-BX',
    category: 'স্ন্যাক্স ও বিস্কুট',
    unit: 'কার্টুন',
    unitPrice: 1450,
    costPrice: 1320,
    stock: 5, // Very low stock
    minStockAlert: 12,
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-10',
    name: 'Wheel 2in1 Washing Powder (1Kg)',
    banglaName: 'হুইল ডিটারজেন্ট পাউডার (১ কেজি)',
    sku: 'DET-WHL-1K',
    category: 'টয়লেটিজ ও ক্লিনিং',
    unit: 'কার্টুন',
    unitPrice: 1980,
    costPrice: 1820,
    stock: 30,
    minStockAlert: 10,
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80',
  },
];

// Initial default shops across routes in Bangladesh with geo coordinates
const DEFAULT_SHOPS: Shop[] = [
  {
    id: 'shop-1',
    name: 'মেসার্স ভাই ভাই জেনারেল স্টোর',
    ownerName: 'মো: রফিকুল ইসলাম',
    phone: '01711223344',
    address: 'দোকান নং ১২, চকবাজার রোড, ঢাকা',
    routeArea: 'চকবাজার রুট',
    previousDue: 4500,
    category: 'বড় মুদি দোকান (A Category)',
    notes: 'নগদ পেমেন্ট ভালো, প্রতি মঙ্গলবারে অর্ডার কাটে',
    lastVisitDate: '2026-09-15',
    lat: 23.7171,
    lng: 90.3986,
  },
  {
    id: 'shop-2',
    name: 'আল্লাহর দান ভ্যারাইটিজ স্টোর',
    ownerName: 'হাজী মোজাম্মেল হক',
    phone: '01822334455',
    address: 'মেইন রোড, মিরপুর-১০ গোলচত্বর',
    routeArea: 'মিরপুর রুট',
    previousDue: 8200,
    category: 'সুপার মুদি শপ (A Category)',
    notes: 'বিকেল ৪টার পর ভিজিট করলে ভালো ক্যাশ পাওয়া যায়',
    lastVisitDate: '2026-09-16',
    lat: 23.8071,
    lng: 90.3687,
  },
  {
    id: 'shop-3',
    name: 'বিসমিল্লাহ ডিপার্টমেন্টাল স্টোর',
    ownerName: 'আব্দুল কাদির',
    phone: '01933445566',
    address: 'কারওয়ান বাজার কাঁচাবাজার গলি',
    routeArea: 'কারওয়ান বাজার রুট',
    previousDue: 2100,
    category: 'হোলসেল ও রিটেইল (B Category)',
    notes: 'তেল ও চিনির চাহিদা বেশি',
    lastVisitDate: '2026-09-17',
    lat: 23.7516,
    lng: 90.3938,
  },
  {
    id: 'shop-4',
    name: 'জননী এন্টারপ্রাইজ',
    ownerName: 'স্বপন কুমার দে',
    phone: '01644556677',
    address: 'দোকান ৪৪, নিউ মার্কেট বাজার কমপ্লেক্স',
    routeArea: 'নিউ মার্কেট রুট',
    previousDue: 0,
    category: 'রেগুলার শপ (B Category)',
    notes: '১০০% নগদ পার্টি',
    lastVisitDate: '2026-09-14',
    lat: 23.7333,
    lng: 90.3842,
  },
  {
    id: 'shop-5',
    name: 'মা বাবার দোয়া কনফেকশনারি',
    ownerName: 'মো: জাহিদ হাসান',
    phone: '01755667788',
    address: 'সেক্টর ৩, জসিমউদদীন রোড, উত্তরা',
    routeArea: 'উত্তরা রুট',
    previousDue: 11500,
    category: 'কনফেকশনারি ও বেকারি (B Category)',
    notes: 'বকেয়া লিমিট ক্রস করেছে, নতুন অর্ডার কাটার আগে টাকা তুলতে হবে',
    lastVisitDate: '2026-09-12',
    lat: 23.8693,
    lng: 90.3995,
  },
  {
    id: 'shop-6',
    name: 'আল-মদিনা গ্রোসারি শপ',
    ownerName: 'মাওলানা নজরুল ইসলাম',
    phone: '01866778899',
    address: 'যাত্রাবাড়ী চৌরাস্তা মোড়',
    routeArea: 'যাত্রাবাড়ী রুট',
    previousDue: 1800,
    category: 'মুদি দোকান (C Category)',
    notes: 'সকালে দ্রুত অর্ডার দিতে পছন্দ করে',
    lastVisitDate: '2026-09-13',
    lat: 23.7104,
    lng: 90.4348,
  },
];

// Seed initial demo orders so user sees immediate insights & metrics
function getInitialOrders(): Order[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return [
    {
      id: 'ord-101',
      memoNumber: 'MEMO-2026-001',
      shopId: 'shop-1',
      shopName: 'মেসার্স ভাই ভাই জেনারেল স্টোর',
      shopPhone: '01711223344',
      shopAddress: 'দোকান নং ১২, চকবাজার রোড, ঢাকা',
      shopRoute: 'চকবাজার রুট',
      items: [
        {
          productId: 'prod-1',
          productName: 'Rupchanda Soybean Oil (5L)',
          unit: 'কার্টুন',
          unitPrice: 3850,
          quantity: 2,
          lineTotal: 7700,
        },
        {
          productId: 'prod-6',
          productName: 'Lux Velvet Glow Soap (100g)',
          unit: 'ডজন',
          unitPrice: 720,
          quantity: 3,
          lineTotal: 2160,
        },
      ],
      subTotal: 9860,
      discountPercent: 2,
      discountAmount: 197,
      netTotal: 9663,
      paidAmount: 5000,
      dueAmount: 4663,
      previousDueAtBooking: 4500,
      totalOutstandingAfterOrder: 9163,
      paymentMethod: 'PARTIAL',
      deliveryStatus: 'DELIVERED',
      orderDate: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      syncedWithSheets: true,
      syncedAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
      notes: 'অর্ডারের ৫০% ডেলিভারির সময় নগদ পরিশোধ',
    },
    {
      id: 'ord-102',
      memoNumber: 'MEMO-2026-002',
      shopId: 'shop-4',
      shopName: 'জননী এন্টারপ্রাইজ',
      shopPhone: '01644556677',
      shopAddress: 'দোকান ৪৪, নিউ মার্কেট বাজার কমপ্লেক্স',
      shopRoute: 'নিউ মার্কেট রুট',
      items: [
        {
          productId: 'prod-2',
          productName: 'Teer Atta (2Kg Pack)',
          unit: 'কার্টুন',
          unitPrice: 1280,
          quantity: 5,
          lineTotal: 6400,
        },
      ],
      subTotal: 6400,
      discountPercent: 0,
      discountAmount: 0,
      netTotal: 6400,
      paidAmount: 6400,
      dueAmount: 0,
      previousDueAtBooking: 0,
      totalOutstandingAfterOrder: 0,
      paymentMethod: 'CASH',
      deliveryStatus: 'PENDING',
      orderDate: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
      syncedWithSheets: false, // demonstrates offline sync pending
      notes: 'নগদ পরিশোধিত, বিকেলে ডেলিভারি দিতে হবে',
    },
  ];
}

// Storage Helpers
export function getProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    const parsed: Product[] = JSON.parse(raw);
    let updated = false;
    const enriched = parsed.map((p) => {
      if (!p.imageUrl) {
        const def = DEFAULT_PRODUCTS.find((dp) => dp.id === p.id || dp.sku === p.sku);
        if (def?.imageUrl) {
          updated = true;
          return { ...p, imageUrl: def.imageUrl };
        }
      }
      return p;
    });
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(enriched));
    }
    return enriched;
  } catch (e) {
    return DEFAULT_PRODUCTS;
  }
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

export function addOrUpdateProduct(product: Product): Product {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    products[idx] = product;
  } else {
    products.unshift(product);
  }
  saveProducts(products);
  return product;
}

export function adjustStock(productId: string, quantityDelta: number) {
  const products = getProducts();
  const product = products.find((p) => p.id === productId);
  if (product) {
    product.stock = Math.max(0, product.stock + quantityDelta);
    saveProducts(products);
  }
}

export function getShops(): Shop[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHOPS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(DEFAULT_SHOPS));
      return DEFAULT_SHOPS;
    }
    const parsed: Shop[] = JSON.parse(raw);
    let updated = false;
    const enriched = parsed.map((s) => {
      if (s.lat === undefined || s.lng === undefined) {
        const def = DEFAULT_SHOPS.find((ds) => ds.id === s.id);
        if (def?.lat && def?.lng) {
          updated = true;
          return { ...s, lat: def.lat, lng: def.lng };
        }
      }
      return s;
    });
    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(enriched));
    }
    return enriched;
  } catch (e) {
    return DEFAULT_SHOPS;
  }
}

export function saveShops(shops: Shop[]) {
  localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shops));
}

export function addOrUpdateShop(shop: Shop): Shop {
  const shops = getShops();
  const idx = shops.findIndex((s) => s.id === shop.id);
  if (idx >= 0) {
    shops[idx] = shop;
  } else {
    shops.unshift(shop);
  }
  saveShops(shops);
  return shop;
}

export function updateShopDue(shopId: string, dueDelta: number) {
  const shops = getShops();
  const shop = shops.find((s) => s.id === shopId);
  if (shop) {
    shop.previousDue = Math.max(0, shop.previousDue + dueDelta);
    shop.lastVisitDate = new Date().toISOString().split('T')[0];
    saveShops(shops);
  }
}

export function getOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) {
      const initial = getInitialOrders();
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function getNextMemoNumber(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_MEMO_NUM);
    const num = raw ? parseInt(raw, 10) + 1 : 103;
    localStorage.setItem(STORAGE_KEYS.LAST_MEMO_NUM, num.toString());
    const year = new Date().getFullYear();
    return `MEMO-${year}-${num.toString().padStart(4, '0')}`;
  } catch {
    return `MEMO-${Date.now().toString().slice(-6)}`;
  }
}

export function createOrder(orderData: Omit<Order, 'id' | 'memoNumber' | 'syncedWithSheets' | 'orderDate'>): Order {
  const id = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const memoNumber = getNextMemoNumber();
  const orderDate = new Date().toISOString();

  const newOrder: Order = {
    ...orderData,
    id,
    memoNumber,
    syncedWithSheets: false, // initially queued for sync
    orderDate,
  };

  // Deduct inventory
  newOrder.items.forEach((item) => {
    adjustStock(item.productId, -item.quantity);
  });

  // Update shop outstanding balance
  if (newOrder.dueAmount > 0) {
    updateShopDue(newOrder.shopId, newOrder.dueAmount);
  }

  // Save order to store
  const orders = getOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  return newOrder;
}

export function updateOrderStatus(orderId: string, status: Order['deliveryStatus']): Order | null {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.deliveryStatus = status;
    saveOrders(orders);
    return order;
  }
  return null;
}

export function getPendingSyncOrders(): Order[] {
  const orders = getOrders();
  return orders.filter((o) => !o.syncedWithSheets);
}

export function markOrdersAsSynced(orderIds: string[]) {
  const orders = getOrders();
  const now = new Date().toISOString();
  orders.forEach((o) => {
    if (orderIds.includes(o.id)) {
      o.syncedWithSheets = true;
      o.syncedAt = now;
    }
  });
  saveOrders(orders);
}

// Due collection records
export function getDueCollections(): DueCollectionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDuePayment(shopId: string, amount: number, paymentMethod: any, notes?: string): DueCollectionRecord {
  const shops = getShops();
  const shop = shops.find((s) => s.id === shopId);
  const shopName = shop ? shop.name : 'Unknown Shop';

  const record: DueCollectionRecord = {
    id: `col-${Date.now()}`,
    shopId,
    shopName,
    amount,
    date: new Date().toISOString(),
    paymentMethod,
    notes,
  };

  const collections = getDueCollections();
  collections.unshift(record);
  localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));

  // Deduct from shop due
  updateShopDue(shopId, -amount);

  return record;
}

// Daily Metrics
export function calculateDailyMetrics(): DailyMetrics {
  const orders = getOrders();
  const products = getProducts();
  const todayStr = new Date().toISOString().split('T')[0];

  const todayOrders = orders.filter((o) => o.orderDate.startsWith(todayStr));
  const uniqueShops = new Set(todayOrders.map((o) => o.shopId)).size;

  const totalSalesToday = todayOrders.reduce((sum, o) => sum + o.netTotal, 0);
  const cashCollectedToday = todayOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const dueToday = todayOrders.reduce((sum, o) => sum + o.dueAmount, 0);

  const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;
  const pendingSyncCount = orders.filter((o) => !o.syncedWithSheets).length;

  return {
    totalOrdersToday: todayOrders.length,
    totalSalesToday,
    cashCollectedToday,
    dueToday,
    uniqueShopsVisited: uniqueShops,
    lowStockCount,
    pendingSyncCount,
  };
}

export function initializeDefaultData() {
  getProducts();
  getShops();
  getOrders();
}

export function saveOrder(order: Order): Order {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = order;
  } else {
    orders.unshift(order);
  }
  saveOrders(orders);
  return order;
}

export function saveShop(shop: Shop): Shop {
  return addOrUpdateShop(shop);
}

export function saveProduct(product: Product): Product {
  return addOrUpdateProduct(product);
}

export function adjustProductStock(productId: string, quantityDelta: number) {
  adjustStock(productId, quantityDelta);
}

export function getUserProfile() {
  try {
    const raw = localStorage.getItem('munsi_user_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(user: any) {
  if (!user) {
    localStorage.removeItem('munsi_user_profile');
  } else {
    localStorage.setItem('munsi_user_profile', JSON.stringify(user));
  }
}

export function resetToDemoData() {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(DEFAULT_SHOPS));
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(getInitialOrders()));
  localStorage.removeItem(STORAGE_KEYS.COLLECTIONS);
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'তেল ও ঘি', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-2', name: 'আটা ও ময়দা', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-3', name: 'চিনি ও গুড়', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-4', name: 'দুধ ও দুগ্ধজাত', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-5', name: 'মসলা', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-6', name: 'টয়লেটিজ ও সাবান', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-7', name: 'পানীয়', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-8', name: 'টয়লেটিজ ও কসমেটিক্স', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-9', name: 'স্ন্যাক্স ও বিস্কুট', createdAt: '2026-09-18T00:00:00.000Z' },
  { id: 'cat-10', name: 'টয়লেটিজ ও ক্লিনিং', createdAt: '2026-09-18T00:00:00.000Z' }
];

export function getCategories(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

export function saveCategory(category: Category): Category {
  const categories = getCategories();
  const idx = categories.findIndex((c) => c.id === category.id || c.name === category.name);
  if (idx >= 0) {
    categories[idx] = category;
  } else {
    categories.push(category);
  }
  saveCategories(categories);
  return category;
}
