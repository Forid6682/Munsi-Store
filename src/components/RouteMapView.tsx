import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation as NavIcon,
  Phone,
  Store,
  DollarSign,
  Search,
  Layers,
  Compass,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  LocateFixed,
  Plus,
  Compass as CompassIcon,
  Navigation
} from 'lucide-react';
import { Shop, PaymentMethod } from '../types';

interface RouteMapViewProps {
  shops: Shop[];
  onSelectShopForOrder: (shopId: string) => void;
  onRecordDuePayment: (shopId: string, amount: number, method: PaymentMethod, notes?: string) => void;
  onUpdateShopCoordinates?: (shopId: string, lat: number, lng: number) => void;
  onAddShop?: (shop: Shop) => void;
}

// Calculate distance between two coordinates in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const RouteMapView: React.FC<RouteMapViewProps> = ({
  shops,
  onSelectShopForOrder,
  onRecordDuePayment,
  onUpdateShopCoordinates,
  onAddShop,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [dueFilter, setDueFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  // User live geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Due collection modal inside map
  const [isDueModalOpen, setIsDueModalOpen] = useState<boolean>(false);
  const [dueAmount, setDueAmount] = useState<string>('');
  const [dueMethod, setDueMethod] = useState<PaymentMethod>('CASH');

  // Add new shop with live location modal
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState<boolean>(false);
  const [newShopName, setNewShopName] = useState<string>('');
  const [newOwnerName, setNewOwnerName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newRouteArea, setNewRouteArea] = useState<string>('চকবাজার রুট');
  const [newShopLat, setNewShopLat] = useState<number | null>(null);
  const [newShopLng, setNewShopLng] = useState<number | null>(null);
  const [isCapturingShopGPS, setIsCapturingShopGPS] = useState<boolean>(false);
  const [gpsCaptureStatus, setGpsCaptureStatus] = useState<string>('');

  // Filter routes
  const routes = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => set.add(s.routeArea));
    return Array.from(set);
  }, [shops]);

  // Filtered shops
  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      const matchRoute = selectedRoute === 'all' || s.routeArea === selectedRoute;
      const matchDue =
        dueFilter === 'ALL'
          ? true
          : dueFilter === 'DUE'
          ? s.previousDue > 0
          : s.previousDue === 0;
      const matchSearch =
        searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRoute && matchDue && matchSearch;
    });
  }, [shops, selectedRoute, dueFilter, searchQuery]);

  // Nearest shops sorted by distance if user location is known
  const nearestShops = useMemo(() => {
    if (!userLocation) return [];
    return [...filteredShops]
      .filter((s) => s.lat !== undefined && s.lng !== undefined)
      .map((s) => ({
        ...s,
        distanceKm: calculateDistanceKm(userLocation.lat, userLocation.lng, s.lat!, s.lng!),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [filteredShops, userLocation]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Dhaka center: [23.75, 90.39]
      const map = L.map(mapContainerRef.current, {
        center: [23.75, 90.39],
        zoom: 12,
        zoomControl: false,
      });

      // CartoDB Voyager - Premium, Clean, Fast, High-Contrast Free Map Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Custom zoom control in bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when filteredShops change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    filteredShops.forEach((shop) => {
      // Fallback coordinates if not set
      const lat = shop.lat ?? 23.75;
      const lng = shop.lng ?? 90.39;

      bounds.push([lat, lng]);

      // Custom HTML Pin Marker based on due amount
      const isHighDue = shop.previousDue > 6000;
      const hasDue = shop.previousDue > 0;
      const pinColor = isHighDue ? '#e11d48' : hasDue ? '#f59e0b' : '#059669';
      const badgeText = hasDue ? `৳${(shop.previousDue / 1000).toFixed(0)}k` : '✓';

      const customIcon = L.divIcon({
        className: 'custom-shop-pin',
        html: `
          <div style="
            position: relative;
            transform: translate(-50%, -100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
          ">
            <div style="
              background: ${pinColor};
              color: white;
              font-weight: 800;
              font-size: 11px;
              padding: 4px 8px;
              border-radius: 12px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              border: 2px solid white;
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>${shop.name.slice(0, 14)}...</span>
              <span style="background: rgba(0,0,0,0.25); padding: 1px 4px; border-radius: 6px; font-size: 10px;">${badgeText}</span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 8px solid ${pinColor};
            "></div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedShop(shop);
        map.panTo([lat, lng], { animate: true });
      });

      marker.addTo(layer);
    });

    // Auto-fit bounds if we have shop locations
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [filteredShops]);

  // Locate User
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('আপনার ব্রাউজারে জিপিএস লোকেশন সাপোর্ট নেই');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        const map = mapInstanceRef.current;
        if (map) {
          map.setView([latitude, longitude], 15);

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const userIcon = L.divIcon({
              className: 'user-live-pin',
              html: `
                <div style="
                  width: 20px;
                  height: 20px;
                  background: #2563eb;
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 0 14px rgba(37, 99, 235, 0.8);
                  position: relative;
                ">
                  <div style="
                    position: absolute;
                    inset: -8px;
                    border-radius: 50%;
                    border: 2px solid #3b82f6;
                    animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                  "></div>
                </div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });

            const marker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
            marker.bindPopup('<b>আপনার বর্তমান অবস্থান</b>').openPopup();
            userMarkerRef.current = marker;
          }
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationError('লোকেশন পাওয়া যায়নি। অনুগ্রহ করে ডিভাইসের GPS অন করুন।');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Focus a specific shop on the map
  const handleFocusShop = (shop: Shop) => {
    setSelectedShop(shop);
    if (mapInstanceRef.current && shop.lat && shop.lng) {
      mapInstanceRef.current.setView([shop.lat, shop.lng], 16, { animate: true });
    }
  };

  // Open Google Maps Directions
  const handleOpenGoogleMapsDirections = (shop: Shop) => {
    const lat = shop.lat ?? 23.75;
    const lng = shop.lng ?? 90.39;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Capture current GPS for existing shop
  const handleUpdateCurrentShopLocation = (shop: Shop) => {
    if (!navigator.geolocation) {
      alert('আপনার ডিভাইসে জিপিএস লোকেশন পাওয়া যাচ্ছে না');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (onUpdateShopCoordinates) {
          onUpdateShopCoordinates(shop.id, latitude, longitude);
          setSelectedShop((prev) => (prev && prev.id === shop.id ? { ...prev, lat: latitude, lng: longitude } : prev));
        }
      },
      (err) => {
        alert('জিপিএস লোকেশন নেওয়া যায়নি। অনুগ্রহ করে মোবাইল সেটিংসে GPS অন করুন।');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Capture live GPS location when adding a new shop
  const handleCaptureLiveGPSForNewShop = () => {
    if (!navigator.geolocation) {
      setGpsCaptureStatus('ডিভাইসে GPS সুবিধা নেই');
      return;
    }

    setIsCapturingShopGPS(true);
    setGpsCaptureStatus('লাইভ স্যাটেলাইট জিপিএস সিগন্যাল খোঁজা হচ্ছে...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCapturingShopGPS(false);
        const { latitude, longitude } = pos.coords;
        setNewShopLat(latitude);
        setNewShopLng(longitude);
        setGpsCaptureStatus(`জিপিএস সফল: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      (err) => {
        setIsCapturingShopGPS(false);
        setGpsCaptureStatus('জিপিএস ব্যর্থ: ডিভাইসের লোকেশন পারমিশন অন করুন');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit new shop with live GPS
  const handleCreateShopWithGPS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName || !newPhone) return;

    // Use captured GPS or fallback to user's location or default route center
    const finalLat = newShopLat ?? userLocation?.lat ?? 23.75;
    const finalLng = newShopLng ?? userLocation?.lng ?? 90.39;

    const createdShop: Shop = {
      id: `shop-${Date.now()}`,
      name: newShopName,
      ownerName: newOwnerName || 'মালিক',
      phone: newPhone,
      address: newAddress || 'রুটের দোকান',
      routeArea: newRouteArea || (selectedRoute !== 'all' ? selectedRoute : 'চকবাজার রুট'),
      previousDue: 0,
      category: 'সাধারণ মুদি শপ',
      lastVisitDate: new Date().toISOString().split('T')[0],
      lat: finalLat,
      lng: finalLng,
    };

    if (onAddShop) {
      onAddShop(createdShop);
    }

    // Pan map to new shop and select it
    setSelectedShop(createdShop);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([finalLat, finalLng], 16, { animate: true });
    }

    // Reset form
    setIsAddShopModalOpen(false);
    setNewShopName('');
    setNewOwnerName('');
    setNewPhone('');
    setNewAddress('');
    setNewShopLat(null);
    setNewShopLng(null);
    setGpsCaptureStatus('');
  };

  // Due Collection Submit
  const handleDueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    const amount = parseFloat(dueAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('সঠিক টাকার অংক লিখুন');
      return;
    }
    onRecordDuePayment(selectedShop.id, amount, dueMethod);
    setIsDueModalOpen(false);
    setDueAmount('');
    // update locally selected shop due
    setSelectedShop((prev) => (prev ? { ...prev, previousDue: Math.max(0, prev.previousDue - amount) } : null));
  };

  return (
    <div className="space-y-3">
      {/* Top Header & Metrics Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-neutral-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                ফিল্ড রুট ম্যাপ (Free Interactive Map)
              </h2>
              <p className="text-xs text-neutral-500">
                ওপেন-স্ট্রিট ম্যাপ দিয়ে দোকানের অবস্থান, বকেয়া ট্র্যাকিং ও দ্রুত নেভিগেশন
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Add New Shop with GPS */}
          <button
            onClick={() => {
              setIsAddShopModalOpen(true);
              if (userLocation) {
                setNewShopLat(userLocation.lat);
                setNewShopLng(userLocation.lng);
                setGpsCaptureStatus(`আপনার বর্তমান অবস্থান পাওয়া গেছে: ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`);
              } else {
                handleCaptureLiveGPSForNewShop();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন দোকান (GPS সহ)</span>
          </button>

          {/* Live GPS Locate button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          >
            <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'লোকেশন ট্র্যাকিং...' : 'আমার অবস্থান (GPS)'}</span>
          </button>

          {/* Quick Stats */}
          <div className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-100 px-2.5 py-1.5 rounded-xl border border-neutral-200">
            <span className="text-neutral-600">দোকান: {filteredShops.length}টি</span>
            <span className="text-neutral-300">|</span>
            <span className="text-rose-600">
              বকেয়া: ৳
              {filteredShops
                .reduce((sum, s) => sum + s.previousDue, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {locationError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-neutral-200/90 shadow-xs flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ম্যাপে দোকান বা ফোন খুঁজুন..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-neutral-300 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Route Selector */}
        <select
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
          className="text-xs bg-neutral-100 border border-neutral-300 rounded-xl px-2.5 py-1.5 text-neutral-800 font-medium focus:outline-hidden"
        >
          <option value="all">সকল রুট ({shops.length})</option>
          {routes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* Due filter chips */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setDueFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              dueFilter === 'ALL'
                ? 'bg-neutral-800 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            সব
          </button>
          <button
            onClick={() => setDueFilter('DUE')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              dueFilter === 'DUE'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            বকেয়া দোকান
          </button>
          <button
            onClick={() => setDueFilter('PAID')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              dueFilter === 'PAID'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            পরিশোধিত
          </button>
        </div>
      </div>

      {/* Main Map & Side List Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Map Canvas */}
        <div className="lg:col-span-8 xl:col-span-9 relative bg-neutral-200 rounded-3xl overflow-hidden border border-neutral-300 shadow-sm h-[460px] sm:h-[520px]">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map legend */}
          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-neutral-200 shadow-sm text-[11px] font-bold flex items-center gap-3">
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              বকেয়া শপ
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              পরিশোধিত
            </span>
            {userLocation && (
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                আপনার অবস্থান
              </span>
            )}
          </div>

          {/* Selected Shop Action Card Overlay */}
          {selectedShop && (
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/98 backdrop-blur-md rounded-2xl p-3.5 border border-neutral-200 shadow-xl max-w-lg mx-auto animate-in fade-in slide-in-from-bottom duration-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
                      {selectedShop.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedShop.previousDue > 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {selectedShop.previousDue > 0
                        ? `বকেয়া: ৳${selectedShop.previousDue.toLocaleString()}`
                        : 'পরিশোধিত'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    মালিক: {selectedShop.ownerName} | {selectedShop.routeArea}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                    {selectedShop.address}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedShop(null)}
                  className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-neutral-100">
                {/* 1. Book Order */}
                <button
                  onClick={() => onSelectShopForOrder(selectedShop.id)}
                  className="flex items-center justify-center gap-1 py-2 px-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>অর্ডার বুকিং</span>
                </button>

                {/* 2. Collect Due */}
                <button
                  onClick={() => setIsDueModalOpen(true)}
                  className="flex items-center justify-center gap-1 py-2 px-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs shadow-xs transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>বকেয়া আদায়</span>
                </button>

                {/* 3. Google Maps Directions */}
                <button
                  onClick={() => handleOpenGoogleMapsDirections(selectedShop)}
                  className="flex items-center justify-center gap-1 py-2 px-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                  title="গুগল ম্যাপে দিকনির্দেশনা দেখুন"
                >
                  <NavIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>ডিরেকশন</span>
                </button>
              </div>

              {/* Update Shop's GPS location on-spot */}
              <div className="mt-2.5 pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {selectedShop.lat && selectedShop.lng
                    ? `জিপিএস: ${selectedShop.lat.toFixed(4)}, ${selectedShop.lng.toFixed(4)}`
                    : 'জিপিএস সংরক্ষিত নেই'}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateCurrentShopLocation(selectedShop)}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center gap-1 transition-colors"
                  title="আপনি এখন এই দোকানে দাঁড়িয়ে থাকলে ক্লিক করুন"
                >
                  <LocateFixed className="w-3 h-3 text-blue-600" />
                  <span>বর্তমান লোকেশন সেভ করুন</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Route Shops List & Nearest Shops */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-2.5">
          <div className="bg-white rounded-2xl p-3 border border-neutral-200/90 shadow-xs">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{userLocation ? 'নিকটবর্তী দোকানসমূহ (দূরত্ব অনুযায়ী)' : 'রুটের দোকান তালিকা'}</span>
              <span className="text-neutral-400 font-normal">({filteredShops.length})</span>
            </h4>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {(userLocation ? nearestShops : filteredShops).map((shop) => {
                const isSelected = selectedShop?.id === shop.id;
                const distanceText =
                  'distanceKm' in shop
                    ? (shop as any).distanceKm < 1
                      ? `${Math.round((shop as any).distanceKm * 1000)} মি.`
                      : `${(shop as any).distanceKm.toFixed(1)} কি.মি.`
                    : null;

                return (
                  <div
                    key={shop.id}
                    onClick={() => handleFocusShop(shop)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-neutral-900 truncate">
                          {shop.name}
                        </h5>
                        <p className="text-[11px] text-neutral-500 truncate">{shop.routeArea}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            shop.previousDue > 0
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {shop.previousDue > 0 ? `৳${shop.previousDue}` : 'পরিশোধিত'}
                        </span>
                        {distanceText && (
                          <p className="text-[10px] text-blue-600 font-bold mt-0.5">
                            {distanceText}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                      <a
                        href={`tel:${shop.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-neutral-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-neutral-400" />
                        <span>{shop.phone}</span>
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectShopForOrder(shop.id);
                        }}
                        className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5"
                      >
                        <span>অর্ডার</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Due Collection Quick Modal */}
      {isDueModalOpen && selectedShop && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-base text-neutral-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              বকেয়া টাকা আদায়
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              দোকান: <span className="font-bold text-neutral-800">{selectedShop.name}</span>
            </p>
            <p className="text-xs text-rose-600 font-bold mt-0.5">
              বর্তমান মোট বকেয়া: ৳{selectedShop.previousDue.toLocaleString()}
            </p>

            <form onSubmit={handleDueSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  আদায়কৃত টাকার পরিমাণ (৳)
                </label>
                <input
                  type="number"
                  required
                  value={dueAmount}
                  onChange={(e) => setDueAmount(e.target.value)}
                  placeholder="যেমন: ২০০০"
                  className="w-full text-base font-black px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  পেমেন্ট মেথড
                </label>
                <select
                  value={dueMethod}
                  onChange={(e) => setDueMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-neutral-300 rounded-xl bg-neutral-50"
                >
                  <option value="CASH">নগদ ক্যাশ (CASH)</option>
                  <option value="BKASH">বিকাশ (bKash)</option>
                  <option value="NAGAD">নগদ (Nagad)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDueModalOpen(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 shadow"
                >
                  নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Shop with GPS Modal */}
      {isAddShopModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
                    রুটে নতুন দোকান ও লাইভ লোকেশন সেভ
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    দোকানের নাম ও বর্তমান স্যাটেলাইট জিপিএস অবস্থান যুক্ত করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddShopModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShopWithGPS} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">দোকানের নাম *</label>
                <input
                  type="text"
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="যেমন: ভাই ভাই জেনারেল স্টোর"
                  className="w-full p-2.5 border border-neutral-300 rounded-xl text-neutral-900 focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">মালিকের নাম</label>
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="মো: সেলিম মিয়া"
                    className="w-full p-2 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="০১৭xxxxxxxx"
                    className="w-full p-2 border border-neutral-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">রুট / এলাকা *</label>
                  <input
                    type="text"
                    required
                    value={newRouteArea}
                    onChange={(e) => setNewRouteArea(e.target.value)}
                    placeholder="চকবাজার রুট"
                    className="w-full p-2 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">দোকানের ঠিকানা / ল্যান্ডমার্ক</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="বাজার মোড়, বটতলা"
                    className="w-full p-2 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              {/* GPS Location Capture Section */}
              <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <LocateFixed className="w-4 h-4 text-emerald-700" />
                    দোকানের লাইভ জিপিএস লোকেশন
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureLiveGPSForNewShop}
                    disabled={isCapturingShopGPS}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <LocateFixed className={`w-3 h-3 ${isCapturingShopGPS ? 'animate-spin' : ''}`} />
                    <span>{isCapturingShopGPS ? 'খোঁজা হচ্ছে...' : 'বর্তমান GPS ধরুন'}</span>
                  </button>
                </div>

                {gpsCaptureStatus && (
                  <p className="text-[11px] font-semibold text-emerald-800 bg-white/80 p-2 rounded-lg border border-emerald-100">
                    {gpsCaptureStatus}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-neutral-500 font-medium block">অক্ষাংশ (Lat):</span>
                    <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-1 rounded border border-neutral-200 block truncate">
                      {newShopLat ? newShopLat.toFixed(6) : 'চিহ্নিত হয়নি'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 font-medium block">দ্রাঘিমাংশ (Lng):</span>
                    <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-1 rounded border border-neutral-200 block truncate">
                      {newShopLng ? newShopLng.toFixed(6) : 'চিহ্নিত হয়নি'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500">
                  * দোকানে থাকা অবস্থায় এই বাটনে চাপ দিলে পরবর্তীতে দূরবর্তী অবস্থান থেকেও ম্যাপে দোকানটি সরাসরি খুঁজে পাওয়া যাবে।
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddShopModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Store className="w-4 h-4" />
                  <span>দোকান ও লোকেশন সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
