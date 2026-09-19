import React, { useState, useEffect, useCallback } from 'react';
import {
  initializeDefaultData,
  getProducts,
  getShops,
  getOrders,
  saveOrder,
  updateOrderStatus,
  saveShop,
  saveProduct,
  adjustProductStock,
  recordDuePayment,
  getPendingSyncOrders,
  markOrdersAsSynced,
  getUserProfile,
  saveUserProfile,
  getCategories,
  saveCategory,
  saveCategories,
  deleteProductFromLocal,
  deleteShopFromLocal,
  deleteOrderFromLocal,
  deleteCategoryFromLocal,
  resetToDemoData
} from './lib/storage';
import {
  subscribeToCloudShops,
  subscribeToCloudProducts,
  subscribeToCloudOrders,
  saveOrderToCloud,
  saveShopToCloud,
  saveProductToCloud,
  saveDueCollectionToCloud,
  subscribeToCloudCategories,
  saveCategoryToCloud,
  deleteProductFromCloud,
  deleteShopFromCloud,
  deleteOrderFromCloud,
  deleteCategoryFromCloud
} from './lib/firebase';
import { syncOrdersToGoogleSheets, backupAllDataToGoogleDrive } from './lib/sheetsService';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { OrderBookingView } from './components/OrderBookingView';
import { OrdersListView } from './components/OrdersListView';
import { ShopsListView } from './components/ShopsListView';
import { InventoryView } from './components/InventoryView';
import { RouteMapView } from './components/RouteMapView';
import { MemoModal } from './components/MemoModal';
import { AdminPanelView } from './components/AdminPanelView';
import { Product, Shop, Order, UserProfile, PaymentMethod, UserRole, DueCollectionRecord, Category } from './types';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  // PWA Install Hook
  const { deferredPrompt, isInstalled: isAppInstalled, install: installPWA } = usePWAInstall();

  // Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('order');
  const [targetOrderShopId, setTargetOrderShopId] = useState<string | undefined>(undefined);

  // Application Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Network & Auth & RBAC
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [activeSimulatedRole, setActiveSimulatedRole] = useState<UserRole>('admin');

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(
    localStorage.getItem('munsi_sheet_url')
  );
  const [lastDriveBackupLink, setLastDriveBackupLink] = useState<string | null>(null);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Memo Modal
  const [selectedMemoOrder, setSelectedMemoOrder] = useState<Order | null>(null);
  const [isMemoOpen, setIsMemoOpen] = useState<boolean>(false);

  // Cart count for badge
  const [cartCount, setCartCount] = useState<number>(0);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load and refresh state from local storage
  const reloadData = useCallback(() => {
    const prods = getProducts();
    const cats = getCategories();
    const shps = getShops();
    const ords = getOrders();
    const pending = getPendingSyncOrders();
    const user = getUserProfile();

    setProducts(prods);
    setCategories(cats);
    setShops(shps);
    setOrders(ords);
    setPendingSyncCount(pending.length);
    setUserProfileState(user);
    if (user?.role) {
      setActiveSimulatedRole(user.role);
    }
  }, []);

  // Initial load
  useEffect(() => {
    initializeDefaultData();
    reloadData();

    const handleOnline = () => {
      setIsOnline(true);
      showToast('ইন্টারনেট সংযোগ পাওয়া গেছে। ফায়ারবেস ক্লাউড সিঙ্ক চালু হয়েছে।', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('ইন্টারনেট সংযোগ বিচ্ছিন্ন। অফলাইন মোডে দ্রুত অর্ডার কাটা চালু আছে।', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to Firestore Real-time Collections (if online)
    let unsubscribeShops: (() => void) | undefined;
    let unsubscribeProducts: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeCategories: (() => void) | undefined;

    try {
      unsubscribeShops = subscribeToCloudShops((cloudShops) => {
        if (cloudShops && cloudShops.length > 0) {
          setShops(cloudShops);
          cloudShops.forEach((s) => saveShop(s));
        }
      });

      unsubscribeProducts = subscribeToCloudProducts((cloudProducts) => {
        if (cloudProducts && cloudProducts.length > 0) {
          setProducts(cloudProducts);
          cloudProducts.forEach((p) => saveProduct(p));
        }
      });

      unsubscribeOrders = subscribeToCloudOrders((cloudOrders) => {
        if (cloudOrders && cloudOrders.length > 0) {
          setOrders(cloudOrders);
          cloudOrders.forEach((o) => saveOrder(o));
        }
      });

      unsubscribeCategories = subscribeToCloudCategories((cloudCategories) => {
        if (cloudCategories && cloudCategories.length > 0) {
          setCategories(cloudCategories);
          saveCategories(cloudCategories);
        }
      });
    } catch (err) {
      console.warn('Firestore subscription initialized in offline mode:', err);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeShops) unsubscribeShops();
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeCategories) unsubscribeCategories();
    };
  }, [reloadData]);

  // Order Creation Handler
  const handleOrderCreated = async (orderData: any) => {
    try {
      const memoNumber = `MS-${Date.now().toString().slice(-6)}`;
      const newOrder: Order = {
        ...orderData,
        id: `ord-${Date.now()}`,
        memoNumber,
        orderDate: new Date().toISOString(),
        syncedWithSheets: false,
        bookedByUid: userProfile?.uid || 'usr-local',
        bookedByName: userProfile?.displayName || (activeSimulatedRole === 'dsr' ? 'হাবিবুর রহমান (DSR)' : 'এডমিন অফিসার'),
        bookedByRole: activeSimulatedRole,
      };

      // 1. Save to local storage (instant offline persistence)
      saveOrder(newOrder);

      // 2. Automatically deduct inventory stock for each ordered item
      for (const item of newOrder.items) {
        const totalDeducted = item.quantity + (item.tradeOfferQty || 0);
        adjustProductStock(item.productId, -totalDeducted);
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const updatedProd = { ...prod, stock: Math.max(0, prod.stock - totalDeducted) };
          saveProductToCloud(updatedProd).catch(() => {});
        }
      }

      // 3. Update shop's debt in local storage & Firestore
      const shopToUpdate = shops.find((s) => s.id === newOrder.shopId);
      if (shopToUpdate) {
        const updatedShop: Shop = {
          ...shopToUpdate,
          previousDue: newOrder.totalOutstandingAfterOrder,
          lastVisitDate: new Date().toISOString().split('T')[0],
        };
        saveShop(updatedShop);
        saveShopToCloud(updatedShop).catch(() => {});
      }

      // 4. Save order to Firebase Firestore in background
      saveOrderToCloud(newOrder).catch((err) => console.log('Firestore cloud sync deferred:', err));

      // Reload state
      reloadData();

      // Open printable memo modal immediately
      setSelectedMemoOrder(newOrder);
      setIsMemoOpen(true);
      showToast(`মেমো #${memoNumber} সফলভাবে তৈরি ও সংরক্ষিত হয়েছে!`, 'success');

      // 5. Background auto-sync to Sheets if online and token available
      if (navigator.onLine && userProfile?.accessToken) {
        syncOrdersToGoogleSheets([newOrder], products, userProfile.accessToken)
          .then((result) => {
            if (result.success) {
              markOrdersAsSynced([newOrder.id]);
              if (result.spreadsheetUrl) {
                setSpreadsheetUrl(result.spreadsheetUrl);
                localStorage.setItem('munsi_sheet_url', result.spreadsheetUrl);
              }
              reloadData();
            }
          })
          .catch((err) => console.log('Auto-sync deferred to next online sync:', err));
      }
    } catch (e: any) {
      console.error(e);
      showToast('অর্ডার সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    }
  };

  // Due Payment Collection Handler
  const handleRecordDuePayment = (
    shopId: string,
    amount: number,
    method: PaymentMethod,
    notes?: string
  ) => {
    try {
      recordDuePayment(shopId, amount, method, notes);

      // Also persist due collection record to Firestore
      const targetShop = shops.find((s) => s.id === shopId);
      const collectionRecord: DueCollectionRecord = {
        id: `col-${Date.now()}`,
        shopId,
        shopName: targetShop?.name || 'শপ',
        amount,
        date: new Date().toISOString(),
        paymentMethod: method,
        collectedBy: userProfile?.displayName || 'সেলস এজেন্ট',
        collectedByUid: userProfile?.uid,
        collectorRole: activeSimulatedRole,
        notes,
      };
      saveDueCollectionToCloud(collectionRecord).catch(() => {});

      if (targetShop) {
        const updatedShop = {
          ...targetShop,
          previousDue: Math.max(0, targetShop.previousDue - amount),
          lastVisitDate: new Date().toISOString().split('T')[0],
        };
        saveShopToCloud(updatedShop).catch(() => {});
      }

      reloadData();
      showToast(`৳${amount.toLocaleString()} বকেয়া আদায় সফলভাবে লিপিবদ্ধ হয়েছে।`, 'success');
    } catch (e: any) {
      showToast('বকেয়া পরিশোধ রেকর্ড ব্যর্থ হয়েছে', 'error');
    }
  };

  // Add Shop Handler
  const handleAddShop = (shop: Shop) => {
    saveShop(shop);
    saveShopToCloud(shop).catch(() => {});
    reloadData();
    showToast(`দোকান "${shop.name}" সফলভাবে যুক্ত হয়েছে!`, 'success');
  };

  // Add Product Handler
  const handleAddProduct = (product: Product) => {
    saveProduct(product);
    saveProductToCloud(product).catch(() => {});
    reloadData();
    showToast(`পণ্য "${product.banglaName}" সফলভাবে যুক্ত হয়েছে!`, 'success');
  };

  // Add Category Handler
  const handleAddCategory = (category: Category) => {
    saveCategory(category);
    saveCategoryToCloud(category).catch(() => {});
    reloadData();
    showToast(`ক্যাটাগরি "${category.name}" সফলভাবে তৈরি হয়েছে!`, 'success');
  };

  // Delete Handlers for Admin Panel
  const handleDeleteProduct = (productId: string) => {
    deleteProductFromLocal(productId);
    deleteProductFromCloud(productId).catch(() => {});
    reloadData();
    showToast('পণ্যটি সফলভাবে মুছে ফেলা হয়েছে!', 'success');
  };

  const handleDeleteShop = (shopId: string) => {
    deleteShopFromLocal(shopId);
    deleteShopFromCloud(shopId).catch(() => {});
    reloadData();
    showToast('দোকানটি সফলভাবে মুছে ফেলা হয়েছে!', 'success');
  };

  const handleDeleteOrder = (orderId: string) => {
    deleteOrderFromLocal(orderId);
    deleteOrderFromCloud(orderId).catch(() => {});
    reloadData();
    showToast('অর্ডার মেমোটি সফলভাবে মুছে ফেলা হয়েছে!', 'success');
  };

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategoryFromLocal(categoryId);
    deleteCategoryFromCloud(categoryId).catch(() => {});
    reloadData();
    showToast('ক্যাটাগরিটি সফলভাবে মুছে ফেলা হয়েছে!', 'success');
  };

  // Reset/Wipe handler for Full Site Control
  const handleResetSite = (type: 'clear_all' | 'restore_defaults') => {
    if (type === 'clear_all') {
      localStorage.removeItem('munsi_products');
      localStorage.removeItem('munsi_shops');
      localStorage.removeItem('munsi_orders');
      localStorage.removeItem('munsi_collections');
      localStorage.removeItem('munsi_categories');
      showToast('সব লোকাল ডাটা সফলভাবে মুছে ফেলা হয়েছে! ক্লাউড ডাটা অক্ষত আছে।', 'success');
    } else {
      resetToDemoData();
      showToast('ডিফল্ট এফএমসিজি ডাটা সফলভাবে রিস্টোর করা হয়েছে!', 'success');
    }
    reloadData();
  };

  // Stock Adjustment Handler
  const handleAdjustStock = (productId: string, delta: number) => {
    adjustProductStock(productId, delta);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      saveProductToCloud({ ...prod, stock: Math.max(0, prod.stock + delta) }).catch(() => {});
    }
    reloadData();
    showToast('স্টক সফলভাবে আপডেট করা হয়েছে', 'success');
  };

  // Delivery status update
  const handleUpdateDeliveryStatus = (orderId: string, status: Order['deliveryStatus']) => {
    updateOrderStatus(orderId, status);
    const ord = orders.find((o) => o.id === orderId);
    if (ord) {
      saveOrderToCloud({ ...ord, deliveryStatus: status }).catch(() => {});
    }
    reloadData();
    showToast(
      status === 'DELIVERED'
        ? 'অর্ডারের ডেলিভারি সম্পন্ন হিসেবে চিহ্নিত হয়েছে'
        : 'অর্ডার অপেক্ষমান স্ট্যাটাসে রাখা হয়েছে',
      'info'
    );
  };

  // Manual Sync with Google Sheets
  const handleSyncWithSheets = async () => {
    if (!isOnline) {
      showToast('ইন্টারনেট সংযোগ নেই। অনলাইন হয়ে আবার চেষ্টা করুন।', 'error');
      return;
    }

    const pendingOrders = getPendingSyncOrders();
    const ordersToSync = pendingOrders.length > 0 ? pendingOrders : orders;

    if (ordersToSync.length === 0) {
      showToast('সিঙ্ক করার মতো কোনো অর্ডার নেই', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncOrdersToGoogleSheets(
        ordersToSync,
        products,
        userProfile?.accessToken
      );

      if (result.success) {
        markOrdersAsSynced(ordersToSync.map((o) => o.id));
        if (result.spreadsheetUrl) {
          setSpreadsheetUrl(result.spreadsheetUrl);
          localStorage.setItem('munsi_sheet_url', result.spreadsheetUrl);
        }
        reloadData();
        showToast(
          `গুগল শিটে ${ordersToSync.length}টি অর্ডার সফলভাবে সিঙ্ক হয়েছে!`,
          'success'
        );
      } else {
        throw new Error(result.error || 'গুগল শিট সিঙ্ক ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      console.error('Sync failed:', e);
      showToast(e.message || 'গুগল শিট সিঙ্ক ব্যর্থ হয়েছে। অনুগ্রহ করে গুগল লগইন চেক করুন।', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual Google Drive Backup
  const handleBackupToDrive = async () => {
    if (!isOnline) {
      showToast('ড্রাইভ ব্যাকআপের জন্য ইন্টারনেট সংযোগ প্রয়োজন', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await backupAllDataToGoogleDrive(userProfile?.accessToken);
      if (result.success) {
        if (result.fileUrl) {
          setLastDriveBackupLink(result.fileUrl);
        }
        showToast('গুগল ড্রাইভে সম্পূর্ণ ডাটাবেজ সফলভাবে ব্যাকআপ হয়েছে!', 'success');
      } else {
        throw new Error(result.error || 'ড্রাইভ ব্যাকআপ ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      console.error('Drive backup failed:', e);
      showToast(e.message || 'ড্রাইভে ব্যাকআপ ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col font-sans pb-18 md:pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700 shadow-emerald-900/20'
              : toastMessage.type === 'error'
              ? 'bg-rose-800 text-white border-rose-700 shadow-rose-900/20'
              : 'bg-neutral-900 text-white border-neutral-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onSyncClick={handleSyncWithSheets}
        isSyncing={isSyncing}
        userProfile={userProfile}
        activeRole={activeSimulatedRole}
        installPrompt={deferredPrompt}
        isAppInstalled={isAppInstalled}
        onInstallApp={async () => {
          const res = await installPWA();
          if (res) {
            showToast('অ্যাপ সফলভাবে ফোনে ইনস্টল হয়েছে!', 'success');
          }
        }}
        onSwitchRole={(role) => {
          setActiveSimulatedRole(role);
          showToast(`${role === 'admin' ? 'এডমিন' : role === 'sr' ? 'এসআর' : 'ডিএসআর'} রোল প্যানেল সক্রিয়`, 'info');
        }}
        setUserProfile={(user: UserProfile | null) => {
          setUserProfileState(user);
          saveUserProfile(user);
          if (user?.role) {
            setActiveSimulatedRole(user.role);
          }
        }}
      />

      {/* Navigation Tabs (Sticky Desktop + Mobile Bottom) */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        userRole={activeSimulatedRole}
        currentUserProfile={userProfile}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 pt-4">
        {activeTab === 'order' && (
          <OrderBookingView
            products={products}
            shops={shops}
            selectedShopIdProp={targetOrderShopId}
            onOrderCreated={handleOrderCreated}
            onAddShop={handleAddShop}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersListView
            orders={orders}
            onViewMemo={(order) => {
              setSelectedMemoOrder(order);
              setIsMemoOpen(true);
            }}
            onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
            onSyncWithSheets={handleSyncWithSheets}
            onBackupToDrive={handleBackupToDrive}
            isSyncing={isSyncing}
            spreadsheetUrl={spreadsheetUrl}
            lastDriveBackupLink={lastDriveBackupLink}
          />
        )}

        {activeTab === 'shops' && (
          <ShopsListView
            shops={shops}
            onAddShop={handleAddShop}
            onRecordDuePayment={handleRecordDuePayment}
            onSelectShopForOrder={(shopId) => {
              setTargetOrderShopId(shopId);
              setActiveTab('order');
            }}
            onOpenMapForShop={(shopId) => {
              setActiveTab('map');
            }}
          />
        )}

        {activeTab === 'map' && (
          <RouteMapView
            shops={shops}
            onAddShop={handleAddShop}
            onSelectShopForOrder={(shopId) => {
              setTargetOrderShopId(shopId);
              setActiveTab('order');
            }}
            onRecordDuePayment={handleRecordDuePayment}
            onUpdateShopCoordinates={(shopId, lat, lng) => {
              const targetShop = shops.find((s) => s.id === shopId);
              if (targetShop) {
                const updatedShop = { ...targetShop, lat, lng };
                saveShop(updatedShop);
                saveShopToCloud(updatedShop);
                setShops((prev) => prev.map((s) => (s.id === shopId ? updatedShop : s)));
                showToast(`'${targetShop.name}' এর বর্তমান জিপিএস লোকেশন আপডেট করা হয়েছে`, 'success');
              }
            }}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            categoriesProp={categories}
            onAddProduct={handleAddProduct}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanelView
            currentUser={userProfile}
            activeSimulatedRole={activeSimulatedRole}
            onSimulatedRoleChange={setActiveSimulatedRole}
            onRefreshUserData={reloadData}
            products={products}
            categories={categories}
            orders={orders}
            shops={shops}
            onAddCategory={handleAddCategory}
            onAddProduct={handleAddProduct}
            onDeleteProduct={handleDeleteProduct}
            onDeleteShop={handleDeleteShop}
            onDeleteOrder={handleDeleteOrder}
            onDeleteCategory={handleDeleteCategory}
            onResetSite={handleResetSite}
            onSyncSheets={handleSyncWithSheets}
            onBackupDrive={handleBackupToDrive}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Printable Memo Modal */}
      <MemoModal
        order={selectedMemoOrder}
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
      />
    </div>
  );
}

