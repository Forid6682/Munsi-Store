import React from 'react';
import { ShoppingCart, FileText, Store, Package, MapPin } from 'lucide-react';
import { UserRole } from '../types';

export type NavTab = 'order' | 'orders' | 'shops' | 'map' | 'inventory';

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  cartCount: number;
  userRole?: UserRole;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  userRole = 'admin',
}) => {
  const tabs = [
    {
      id: 'order' as NavTab,
      label: userRole === 'dsr' ? 'ফিল্ড অর্ডার বুকিং' : 'নতুন অর্ডার',
      shortLabel: 'অর্ডার',
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : null,
    },
    {
      id: 'orders' as NavTab,
      label: userRole === 'sr' ? 'রুট অর্ডার পর্যবেক্ষণ' : 'অর্ডার ও মেমো তালিকা',
      shortLabel: 'লিস্ট',
      icon: FileText,
    },
    {
      id: 'shops' as NavTab,
      label: 'দোকান ও বাকী খাতা',
      shortLabel: 'দোকান',
      icon: Store,
    },
    {
      id: 'map' as NavTab,
      label: 'ফিল্ড রুট ম্যাপ (Free)',
      shortLabel: 'ম্যাপ',
      icon: MapPin,
      highlight: true,
    },
    {
      id: 'inventory' as NavTab,
      label: 'ইনভেন্টরি স্টক ও ছবি',
      shortLabel: 'স্টক',
      icon: Package,
    },
  ];

  return (
    <>
      {/* Top / Desktop Tab Bar */}
      <nav className="hidden md:block bg-white border-b border-neutral-200/80 sticky top-[57px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex space-x-1 py-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-desktop-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 relative ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-white'
                        : tab.highlight
                        ? 'text-emerald-700'
                        : 'text-neutral-500'
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="bg-emerald-500 text-neutral-950 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                  {tab.highlight && !isActive && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold border border-emerald-300">
                      FREE MAP
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Fixed Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 shadow-2xl safe-area-inset-bottom">
        <div className="grid grid-cols-5 h-15">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-mobile-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center pt-1.5 pb-1 relative transition-colors ${
                  isActive ? 'text-emerald-800' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-emerald-800 scale-110'
                        : tab.highlight
                        ? 'text-emerald-700 font-bold'
                        : 'text-neutral-500'
                    } transition-transform`}
                  />
                  {tab.badge && (
                    <span className="absolute -top-1.5 -right-2.5 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] mt-1 tracking-tight leading-none truncate max-w-[58px] ${
                    isActive ? 'font-bold text-emerald-900' : 'font-medium'
                  }`}
                >
                  {tab.shortLabel}
                </span>
                {isActive && (
                  <span className="w-5 h-0.5 bg-emerald-800 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};


