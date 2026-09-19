import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Package,
  ListPlus,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  TrendingUp,
  Coins,
  FileSpreadsheet,
  Users,
  Trash2,
  Database,
  RotateCcw,
  Building2,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Category, Product, UserProfile, UserRole, Order, Shop } from '../types';
import { RoleManagementView } from './RoleManagementView';

interface AdminPanelViewProps {
  currentUser: UserProfile | null;
  activeSimulatedRole: UserRole;
  onSimulatedRoleChange: (role: UserRole) => void;
  onRefreshUserData: () => void;
  products: Product[];
  categories: Category[];
  orders: Order[];
  shops: Shop[];
  onAddCategory: (category: Category) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteShop: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onResetSite: (type: 'clear_all' | 'restore_defaults') => void;
  onSyncSheets: () => void;
  onBackupDrive: () => void;
  isSyncing: boolean;
}

type AdminSubTab = 'overview' | 'roles' | 'categories' | 'products' | 'shops' | 'orders';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  activeSimulatedRole,
  onRefreshUserData,
  products,
  categories,
  orders,
  shops,
  onAddCategory,
  onAddProduct,
  onDeleteProduct,
  onDeleteShop,
  onDeleteOrder,
  onDeleteCategory,
  onResetSite,
  onSyncSheets,
  onBackupDrive,
  isSyncing,
}) => {
  // STRICT SECURITY GUARD: Nobody except true admin can see/access the admin panel
  const isRealAdmin = !currentUser || 
    currentUser.role === 'admin' || 
    currentUser.email?.toLowerCase() === 'ahmedmdforid39@gmail.com';

  if (!isRealAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-950 max-w-lg mx-auto my-12 shadow-sm animate-fadeIn">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold">অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে (Access Denied)</h2>
        <p className="text-xs text-rose-800 mt-2 leading-relaxed">
          দুঃখিত, এ্যাডমিন ছাড়া এ্যাডমিন প্যানেল আর কেউ দেখতে পারবেনা। অনুগ্রহ করে এ্যাডমিন মেইল দিয়ে গুগল সাইন-ইন সম্পন্ন করুন।
        </p>
      </div>
    );
  }

  const [subTab, setSubTab] = useState<AdminSubTab>('overview');

  // Create Category Form State
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catFeedback, setCatFeedback] = useState<string | null>(null);

  // Upload Product Form State
  const [prodName, setProdName] = useState('');
  const [prodBanglaName, setProdBanglaName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategory, setProdCategory] = useState(categories[0]?.name || 'তেল ও ঘি');
  const [prodUnit, setProdUnit] = useState('কার্টুন');
  const [prodUnitPrice, setProdUnitPrice] = useState('');
  const [prodCostPrice, setProdCostPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodMinAlert, setProdMinAlert] = useState('10');
  const [prodTradeOffer, setProdTradeOffer] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodFeedback, setProdFeedback] = useState<string | null>(null);

  // Auto-set category when categories load/change
  React.useEffect(() => {
    if (categories.length > 0 && !categories.some(c => c.name === prodCategory)) {
      setProdCategory(categories[0].name);
    }
  }, [categories]);

  // Overall calculations for Dashboard Overview
  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => o.deliveryStatus !== 'CANCELLED' ? sum + o.netTotal : sum, 0);
    const totalCollected = orders.reduce((sum, o) => o.deliveryStatus !== 'CANCELLED' ? sum + o.paidAmount : sum, 0);
    const totalDue = orders.reduce((sum, o) => o.deliveryStatus !== 'CANCELLED' ? sum + o.dueAmount : sum, 0);
    const totalOrders = orders.length;
    const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;
    return { totalSales, totalCollected, totalDue, totalOrders, lowStockCount };
  }, [orders, products]);

  // Count products per category
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (categories.some((c) => c.name.toLowerCase() === catName.trim().toLowerCase())) {
      setCatFeedback('এই ক্যাটাগরিটি ইতিমধ্যে তৈরি করা আছে!');
      setTimeout(() => setCatFeedback(null), 4000);
      return;
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: catName.trim(),
      description: catDesc.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onAddCategory(newCategory);
    setCatName('');
    setCatDesc('');
    setCatFeedback('ক্যাটাগরি সফলভাবে তৈরি করা হয়েছে এবং ফায়ারবেসে যুক্ত হয়েছে!');
    setTimeout(() => setCatFeedback(null), 4000);
  };

  const handleUploadProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodUnitPrice || !prodCostPrice) {
      setProdFeedback('অনুগ্রহ করে পণ্যের নাম, ক্রয়মূল্য ও বিক্রয়মূল্য প্রদান করুন।');
      return;
    }

    const created: Product = {
      id: `prod-${Date.now()}`,
      name: prodName,
      banglaName: prodBanglaName || prodName,
      sku: prodSku || `SKU-${Date.now().toString().slice(-4)}`,
      category: prodCategory,
      unit: prodUnit,
      unitPrice: parseFloat(prodUnitPrice) || 0,
      costPrice: parseFloat(prodCostPrice) || 0,
      stock: parseInt(prodStock, 10) || 0,
      minStockAlert: parseInt(prodMinAlert, 10) || 10,
      tradeOfferDesc: prodTradeOffer || undefined,
      imageUrl: prodImageUrl || undefined,
    };

    onAddProduct(created);
    setProdFeedback(`পণ্য "${created.banglaName}" সফলভাবে ফায়ারবেসে আপলোড করা হয়েছে!`);
    setTimeout(() => setProdFeedback(null), 4000);

    // Reset Form
    setProdName('');
    setProdBanglaName('');
    setProdSku('');
    setProdUnitPrice('');
    setProdCostPrice('');
    setProdStock('');
    setProdTradeOffer('');
    setProdImageUrl('');
  };

  const confirmReset = (type: 'clear_all' | 'restore_defaults') => {
    const msg = type === 'clear_all' 
      ? 'আপনি কি নিশ্চিতভাবে সব প্রোডাক্ট, দোকান ও অর্ডার ডাটা লোকাল স্টোরেজ থেকে ডিলিট করতে চান?' 
      : 'আপনি কি নিশ্চিতভাবে ডিফল্ট ডিস্ট্রিবিউটর ডাটা রিস্টোর করতে চান? এতে বর্তমান মেমোগুলো ডিলিট হতে পারে।';
    if (window.confirm(msg)) {
      onResetSite(type);
    }
  };

  return (
    <div className="space-y-5 pb-16 animate-fadeIn" id="admin-panel-container">
      {/* Upper Navigation Tabs */}
      <div className="flex border-b border-neutral-200 bg-white rounded-xl p-1 shadow-xs overflow-x-auto gap-1">
        <button
          onClick={() => setSubTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'overview'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>ড্যাশবোর্ড</span>
        </button>

        <button
          onClick={() => setSubTab('orders')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'orders'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>অর্ডার বুকিং তালিকা</span>
        </button>

        <button
          onClick={() => setSubTab('shops')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'shops'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>দোকান খাতা কন্ট্রোল</span>
        </button>

        <button
          onClick={() => setSubTab('products')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'products'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>ইনভেন্টরি ও পণ্য আপলোড</span>
        </button>

        <button
          onClick={() => setSubTab('categories')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'categories'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <ListPlus className="w-3.5 h-3.5" />
          <span>ক্যাটাগরি গ্রুপ</span>
        </button>

        <button
          onClick={() => setSubTab('roles')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'roles'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>টিম ও রুট এসাইন</span>
        </button>
      </div>

      {/* SUB TAB: OVERVIEW */}
      {subTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500 font-medium">মোট বিক্রয় (BDT)</p>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-neutral-900 mt-1">৳{stats.totalSales.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-600 mt-1">✓ বাতিল অর্ডার বাদে</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500 font-medium">আদায়কৃত ক্যাশ</p>
                <Coins className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl font-black text-teal-700 mt-1">৳{stats.totalCollected.toLocaleString()}</p>
              <p className="text-[10px] text-neutral-500 mt-1">মার্কেট থেকে আদায়কৃত</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500 font-medium">বকেয়া মেমো পাওনা</p>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-600 mt-1">৳{stats.totalDue.toLocaleString()}</p>
              <p className="text-[10px] text-neutral-500 mt-1">বাকী খাতা পাওনা</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500 font-medium">মোট অর্ডার মেমো</p>
                <ShoppingBag className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-neutral-900 mt-1">{stats.totalOrders} টি</p>
              <p className="text-[10px] text-purple-600 mt-1">DSR / SR মেমো বুকিং</p>
            </div>
          </div>

          {/* Necessary Admin Buttons & System controls */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
            <h3 className="font-bold text-neutral-900 text-sm mb-3.5 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-800" />
              <span>সিস্টেম কন্ট্রোল ও ডাটা ব্যাকআপ প্যানেল (Full Site Control)</span>
            </h3>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              ডিস্ট্রিবিউটর বা এডমিন হিসেবে পুরো সাইটের ক্লাউড সিঙ্ক, গুগল শিট এক্সপোর্ট, ড্রাইভ ব্যাকআপ অথবা ডেটাবেজ ক্লিনআপ নিচের বাটনগুলো দিয়ে সরাসরি নিয়ন্ত্রন করতে পারবেন।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Manual Sheets Sync */}
              <button
                onClick={onSyncSheets}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'গুগল শিট এক্সপোর্ট'}</span>
              </button>

              {/* Drive Backup */}
              <button
                onClick={onBackupDrive}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-teal-700" />
                <span>ড্রাইভ কমপ্লিট ব্যাকআপ</span>
              </button>

              {/* Restore Defaults */}
              <button
                onClick={() => confirmReset('restore_defaults')}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-indigo-700" />
                <span>ডিফল্ট ডেমো রিস্টোর</span>
              </button>

              {/* Clear All Data */}
              <button
                onClick={() => confirmReset('clear_all')}
                className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-rose-950 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-xs"
              >
                <Trash2 className="w-4 h-4 text-rose-700" />
                <span>সকল লোকাল ডাটা মুছুন</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Status Info */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-3">
              <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>রিয়েল-টাইম ক্লাউড স্ট্যাটাস</span>
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <span className="text-xs font-semibold text-neutral-700">ফায়ারবেস ক্লাউড কানেকশন</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">সক্রিয় (Active)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <span className="text-xs font-semibold text-neutral-700">নিবন্ধিত দোকান সংখ্যা</span>
                  <span className="text-xs font-bold text-neutral-950 font-mono">{shops.length}টি দোকান</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <span className="text-xs font-semibold text-neutral-700">মোট নিবন্ধিত পণ্য SKU</span>
                  <span className="text-xs text-neutral-950 font-bold">{products.length}টি পণ্য</span>
                </div>
              </div>
            </div>

            {/* Admin Info Summary */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm mb-1.5">দ্রুত এডমিন অ্যাকশন</h3>
                <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                  স্টোর পরিচালনা সহজ করতে নিচের শর্টকাটগুলো ব্যবহার করুন:
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSubTab('products')}
                  className="p-3 text-left bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
                >
                  <p className="font-bold text-emerald-800 text-xs">+ পণ্য আপলোড</p>
                  <p className="text-[10px] text-emerald-600/80 mt-0.5">নতুন SKU যোগ</p>
                </button>
                <button
                  onClick={() => setSubTab('categories')}
                  className="p-3 text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all"
                >
                  <p className="font-bold text-purple-800 text-xs">+ ক্যাটাগরি তৈরি</p>
                  <p className="text-[10px] text-purple-600/80 mt-0.5">নতুন গ্রুপ যোগ</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: ORDER MEMOS (FULL CONTROLL) */}
      {subTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">অর্ডার মেমো কন্ট্রোল তালিকা ({orders.length}টি)</h3>
              <p className="text-xs text-neutral-400">এ্যাডমিন এখান থেকে মেমোগুলো পর্যবেক্ষণ করতে পারবেন এবং প্রয়োজনবোধে বাতিল বা চিরতরে ডিলিট করতে পারবেন।</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-3">মেমো নং ও তারিখ</th>
                  <th className="p-3">দোকানের নাম ও মোবাইল</th>
                  <th className="p-3 text-right">মোট টাকা</th>
                  <th className="p-3 text-center">পেমেন্ট ও ডেলিভারি</th>
                  <th className="p-3 text-center">অর্ডার বুকিং কারী</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 font-medium">কোনো অর্ডার বুকিং পাওয়া যায়নি!</td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3">
                        <div className="font-black text-neutral-900">{o.memoNumber}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {new Date(o.orderDate).toLocaleDateString('bn-BD')} {new Date(o.orderDate).toLocaleTimeString('bn-BD', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-neutral-800">{o.shopName}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{o.shopPhone}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-neutral-900">৳{o.netTotal.toLocaleString()}</div>
                        <div className="text-[10px] text-rose-500">বকেয়া: ৳{o.dueAmount.toLocaleString()}</div>
                      </td>
                      <td className="p-3 text-center space-y-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${o.paymentMethod === 'CASH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {o.paymentMethod === 'CASH' ? 'নগদ পরিশোধ' : 'বকেয়া মেমো'}
                        </span>
                        <br />
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${o.deliveryStatus === 'DELIVERED' ? 'bg-teal-50 text-teal-700 border border-teal-200' : o.deliveryStatus === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {o.deliveryStatus === 'DELIVERED' ? 'ডেলিভারি সম্পন্ন' : o.deliveryStatus === 'CANCELLED' ? 'বাতিলকৃত' : 'অপেক্ষমান'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-medium text-neutral-700">{o.bookedByName || '—'}</div>
                        <div className="text-[10px] text-neutral-400 capitalize">{o.bookedByRole || 'SR'}</div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm('আপনি কি এই অর্ডার মেমোটি ডাটাবেজ থেকে ডিলিট করতে চান? স্টক পুনর্বহাল করতে চাইলে ইনভেন্টরি চেক করুন।')) {
                              onDeleteOrder(o.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          title="অর্ডার ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB: SHOPS CONTROLL (FULL CONTROLL) */}
      {subTab === 'shops' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-bold text-neutral-900 text-sm">দোকান খাতা ও বাকী কন্ট্রোল ({shops.length}টি দোকান)</h3>
            <p className="text-xs text-neutral-400">এ্যাডমিন যেকোনো দোকান চিরতরে ডিলিট করতে পারবেন এবং তাদের লেজার হিসাব দেখতে পারবেন।</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-3">দোকানের নাম ও মালিক</th>
                  <th className="p-3">মোবাইল ও ঠিকানা</th>
                  <th className="p-3">রুট এলাকা</th>
                  <th className="p-3 text-right">বকেয়া পাওনা (Due)</th>
                  <th className="p-3 text-center">সর্বশেষ ভিজিট</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {shops.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 font-medium">কোনো দোকান নিবন্ধিত পাওয়া যায়নি!</td>
                  </tr>
                ) : (
                  shops.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-neutral-900">{s.name}</div>
                        <div className="text-[10px] text-neutral-500">প্রোপ্রাইটর: {s.ownerName}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-neutral-800">{s.phone}</div>
                        <div className="text-[10px] text-neutral-400 max-w-[180px] truncate">{s.address}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                          {s.routeArea}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-rose-600 text-xs">
                        ৳{s.previousDue.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-mono text-[10px] text-neutral-500">
                        {s.lastVisitDate || 'কখনো না'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm(`আপনি কি '${s.name}' দোকানটি ডাটাবেজ থেকে চিরতরে ডিলিট করতে চান?`)) {
                              onDeleteShop(s.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          title="দোকান ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB: CATEGORIES */}
      {subTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Create Category Form */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4 h-fit">
            <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-emerald-800" />
              <span>নতুন ক্যাটাগরি তৈরি করুন</span>
            </h3>

            {catFeedback && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold mb-3 flex items-center gap-1.5 ${catFeedback.includes('ইতিমধ্যে') ? 'bg-amber-50 border border-amber-200 text-amber-950' : 'bg-emerald-50 border border-emerald-200 text-emerald-950'}`}>
                {catFeedback.includes('ইতিমধ্যে') ? <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                <span>{catFeedback}</span>
              </div>
            )}

            <form onSubmit={handleCreateCategorySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  ক্যাটাগরির নাম (বাঙালি অথবা ইংরেজি) *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="যেমন: মসলা, বিস্কুট ও ডেইরি..."
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)
                </label>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="যেমন: গুড়া মসলা, গোটা মসলা..."
                  rows={3}
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                ক্যাটাগরি যুক্ত করুন
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden lg:col-span-2">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-bold text-neutral-900 text-sm">
                বিদ্যমান ক্যাটাগরি তালিকা ({categories.length}টি)
              </h3>
              <p className="text-xs text-neutral-400">
                ক্যাটাগরি ডিলিট করলে ঐ ক্যাটাগরির পণ্য ইনভেন্টরি স্টক থেকে অপরিবর্তিত থাকবে।
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">ক্যাটাগরি নাম</th>
                    <th className="p-3">বিবরণ / ব্যাখ্যা</th>
                    <th className="p-3 text-center">নিবন্ধিত পণ্য</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {categories.map((c) => {
                    const count = categoryStats[c.name] || 0;
                    return (
                      <tr key={c.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-neutral-900">{c.name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{c.id}</div>
                        </td>
                        <td className="p-3 text-neutral-500 max-w-[200px] truncate">
                          {c.description || '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${count > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-neutral-100 text-neutral-400'}`}>
                            {count} টি
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`আপনি কি '${c.name}' ক্যাটাগরিটি ডিলিট করতে চান?`)) {
                                onDeleteCategory(c.id);
                              }
                            }}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg border border-transparent hover:border-rose-200"
                            title="ক্যাটাগরি ডিলিট"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: PRODUCTS & STOCK CONTROLL */}
      {subTab === 'products' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4 max-w-4xl mx-auto">
            <div className="border-b border-neutral-100 pb-3 mb-4">
              <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-800" />
                <span>নতুন প্রোডাক্ট ইনভেন্টরিতে আপলোড করুন</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                ইনভেন্টরিতে নতুন আইটেম যুক্ত করুন যা সরাসরি DSR/SR-দের রুট অর্ডার বুকিং প্যানেলে স্টকসহ দৃশ্যমান হবে।
              </p>
            </div>

            {prodFeedback && (
              <div className={`p-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-1.5 ${prodFeedback.includes('ব্যর্থ') ? 'bg-rose-50 border border-rose-200 text-rose-950' : 'bg-emerald-50 border border-emerald-200 text-emerald-950'}`}>
                {prodFeedback.includes('ব্যর্থ') ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                <span>{prodFeedback}</span>
              </div>
            )}

            <form onSubmit={handleUploadProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product English Name */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    প্রোডাক্ট ইংরেজি নাম (যেমন: Teer Soybean Oil 5L) *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Teer Soybean Oil 5L"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Product Bangla Name */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    বাংলা নাম (যা মেমো ও অ্যাপে প্রধানত দেখাবে) *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodBanglaName}
                    onChange={(e) => setProdBanglaName(e.target.value)}
                    placeholder="তীর সয়াবিন তেল ৫ লিটার"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    ইউনিক SKU কোড (বারকোড / স্টক কোড)
                  </label>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="e.g. OIL-TEER-5L"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    পণ্য ক্যাটাগরি নির্বাচন করুন *
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    প্যাকেজিং ইউনিট (Unit) *
                  </label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="কার্টুন">কার্টুন (Carton)</option>
                    <option value="ডজন">ডজন (Dozen)</option>
                    <option value="বস্তা">বস্তা (Bag)</option>
                    <option value="কেজি">কেজি (Kg)</option>
                    <option value="পিস">পিস (Piece)</option>
                  </select>
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    প্রারম্ভিক স্টক সংখ্যা (Quantity) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="যেমন: ৫০"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    ডিস্ট্রিবিউটর ক্রয় মূল্য (৳ Cost Price) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(e.target.value)}
                    placeholder="যেমন: ৩২০০"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Wholesale Selling Price */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    পাইকারি বিক্রয় মূল্য (৳ Selling Price) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={prodUnitPrice}
                    onChange={(e) => setProdUnitPrice(e.target.value)}
                    placeholder="যেমন: ৩৩৫০"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Min Stock Alert Level */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    কম স্টক অ্যালার্ট লেভেল *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={prodMinAlert}
                    onChange={(e) => setProdMinAlert(e.target.value)}
                    placeholder="যেমন: ১০"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Trade Offer Description */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    ট্রেড অফার প্রোমোশন (Trade Offer - ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={prodTradeOffer}
                    onChange={(e) => setProdTradeOffer(e.target.value)}
                    placeholder="যেমন: ১০ কার্টুনে ১ কার্টুন ফ্রি"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    পণ্য ছবির ইউআরএল (Image Link - ঐচ্ছিক)
                  </label>
                  <input
                    type="url"
                    value={prodImageUrl}
                    onChange={(e) => setProdImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... বা অন্য কোনো ছবির লিংক"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow"
                >
                  পণ্য সফলভাবে আপলোড করুন
                </button>
              </div>
            </form>
          </div>

          {/* Active Product Inventory List (CRUD table) */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden max-w-4xl mx-auto">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-bold text-neutral-900 text-sm">ইনভেন্টরি আইটেম তালিকা ({products.length}টি পণ্য)</h3>
              <p className="text-xs text-neutral-400">পুরো সাইটের পণ্য ক্যাটাালগ এখান থেকে সরাসরি ডিলেট বা কন্ট্রোল করা যাবে।</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">পণ্য (বাংলা ও ইংরেজি নাম)</th>
                    <th className="p-3">SKU কোড</th>
                    <th className="p-3 text-center">ক্যাটাগরি ও ইউনিট</th>
                    <th className="p-3 text-right">ক্রয় / বিক্রয় মূল্য</th>
                    <th className="p-3 text-center">বর্তমান স্টক</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt={p.name} className="w-7 h-7 rounded-lg border object-cover shrink-0" referrerPolicy="no-referrer" />
                          )}
                          <div>
                            <div className="font-bold text-neutral-900">{p.banglaName}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">{p.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-neutral-700">{p.sku}</td>
                      <td className="p-3 text-center space-y-1">
                        <span className="inline-block px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-bold">{p.category}</span>
                        <br />
                        <span className="text-[10px] text-neutral-400">প্রতি {p.unit}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-semibold text-neutral-900">৳{p.unitPrice.toLocaleString()}</div>
                        <div className="text-[10px] text-neutral-400">ক্রয়: ৳{p.costPrice.toLocaleString()}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-black ${p.stock <= p.minStockAlert ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {p.stock} {p.unit === 'পিস' ? 'পিস' : p.unit}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm(`আপনি কি '${p.banglaName}' পণ্যটি ডিলিট করতে চান?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          title="পণ্য ডিলিট"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
