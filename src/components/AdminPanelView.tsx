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
  Users
} from 'lucide-react';
import { Category, Product, UserProfile, UserRole, Order } from '../types';
import { RoleManagementView } from './RoleManagementView';

interface AdminPanelViewProps {
  currentUser: UserProfile | null;
  activeSimulatedRole: UserRole;
  onSimulatedRoleChange: (role: UserRole) => void;
  onRefreshUserData: () => void;
  products: Product[];
  categories: Category[];
  orders: Order[];
  onAddCategory: (category: Category) => void;
  onAddProduct: (product: Product) => void;
}

type AdminSubTab = 'overview' | 'roles' | 'categories' | 'products';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  activeSimulatedRole,
  onSimulatedRoleChange,
  onRefreshUserData,
  products,
  categories,
  orders,
  onAddCategory,
  onAddProduct,
}) => {
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

  return (
    <div className="space-y-5 pb-16 animate-fadeIn" id="admin-panel-container">
      {/* Upper Navigation Tabs */}
      <div className="flex border-b border-neutral-200 bg-white rounded-xl p-1 shadow-xs overflow-x-auto gap-1">
        <button
          onClick={() => setSubTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'overview'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>ওভারভিউ ড্যাশবোর্ড</span>
        </button>

        <button
          onClick={() => setSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'roles'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>রোল ও রুট ম্যানেজমেন্ট</span>
        </button>

        <button
          onClick={() => setSubTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'categories'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>ক্যাটাগরি তৈরি করুন</span>
        </button>

        <button
          onClick={() => setSubTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            subTab === 'products'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>নতুন পণ্য আপলোড</span>
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
              <p className="text-[10px] text-neutral-500 mt-1">
                মার্কেট থেকে সংগৃহীত
              </p>
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

          {/* Quick Metrics & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Status */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-3">
              <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>মাস্টার কনফিগারেশন স্ট্যাটাস</span>
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <span className="text-xs font-semibold text-neutral-700">ফায়ারবেস ক্লাউড কানেকশন</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">সক্রিয় (Active)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <span className="text-xs font-semibold text-neutral-700">রুট ইন্টিগ্রেশন</span>
                  <span className="text-xs text-neutral-600 font-mono">৬টি সক্রিয় রুট</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <span className="text-xs font-semibold text-neutral-700">মোট নিবন্ধিত পণ্য SKU</span>
                  <span className="text-xs text-neutral-950 font-bold">{products.length}টি পণ্য</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
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

      {/* SUB TAB: ROLES & ROUTES */}
      {subTab === 'roles' && (
        <RoleManagementView
          currentUser={currentUser}
          activeSimulatedRole={activeSimulatedRole}
          onSimulatedRoleChange={onSimulatedRoleChange}
          onRefreshUserData={onRefreshUserData}
        />
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
                পণ্য আপলোডের সময় নিচের যেকোনো ক্যাটাগরি নির্বাচন করা যাবে।
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">ক্যাটাগরি আইডি ও নাম</th>
                    <th className="p-3">বিবরণ / ব্যাখ্যা</th>
                    <th className="p-3 text-center">নিবন্ধিত পণ্য</th>
                    <th className="p-3 text-right">তৈরির তারিখ</th>
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
                        <td className="p-3 text-right text-neutral-400 font-mono text-[11px]">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('bn-BD') : 'ডিফল্ট'}
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

      {/* SUB TAB: NEW PRODUCT UPLOAD */}
      {subTab === 'products' && (
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
                <p className="text-[10px] text-neutral-400 mt-1">
                  পছন্দের ক্যাটাগরি না থাকলে বাম পাশের "ক্যাটাগরি তৈরি করুন" ট্যাব থেকে যোগ করে নিন।
                </p>
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
      )}
    </div>
  );
};
