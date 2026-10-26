import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  Clock,
  MapPin,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  ArrowLeft,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import apiClient from '../api/client';
import type { Restaurant, MenuItem, CartItem } from '../types';
import { useCart } from '../context/CartContext';
import FoodBadge from '../components/common/FoodBadge';

export const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const restaurantId = Number(id);

  const { items, addToCart, updateQuantity, restaurantId: cartRestId, subtotal, itemCount } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Conflict modal state for multi-restaurant cart
  const [conflictPrompt, setConflictPrompt] = useState<{
    show: boolean;
    pendingItem?: MenuItem;
  }>({ show: false });

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resResp, menuResp] = await Promise.all([
          apiClient.get<{ success: boolean; data: Restaurant }>(`/api/restaurants/${restaurantId}`),
          apiClient.get<{ success: boolean; data: MenuItem[] }>(`/api/restaurants/${restaurantId}/menu`),
        ]);

        if (resResp.data?.success) {
          setRestaurant(resResp.data.data);
        }
        if (menuResp.data?.success) {
          setMenuItems(menuResp.data.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch restaurant details:', err);
        setError('Restaurant not found or gateway route error.');
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchDetails();
    }
  }, [restaurantId]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      if (vegOnly && item.is_veg !== 1) {
        return false;
      }
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [menuItems, searchQuery, vegOnly, selectedCategory]);

  // Group items by category if "All" is selected
  const itemsByCategory = useMemo(() => {
    const map: { [cat: string]: MenuItem[] } = {};
    filteredItems.forEach((item) => {
      const cat = item.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [filteredItems]);

  const handleAddItem = (item: MenuItem) => {
    if (!restaurant) return;

    // Check if cart has items from another restaurant
    if (cartRestId && cartRestId !== restaurant.id && itemCount > 0) {
      setConflictPrompt({ show: true, pendingItem: item });
      return;
    }

    addToCart(item, restaurant.id, restaurant.name);
  };

  const confirmResetAndAdd = () => {
    if (conflictPrompt.pendingItem && restaurant) {
      addToCart(conflictPrompt.pendingItem, restaurant.id, restaurant.name);
    }
    setConflictPrompt({ show: false, pendingItem: undefined });
  };

  const getItemQuantity = (menuItemId: number) => {
    const found = items.find((i: CartItem) => i.menuItemId === menuItemId);
    return found ? found.quantity : 0;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-64 bg-slate-200 rounded-3xl"></div>
        <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Restaurant Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested restaurant could not be retrieved from the API Gateway.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="min-vh-screen pb-28">
      {/* Restaurant Header Banner */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src={restaurant.image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover blur-sm"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent"></div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white mb-6 group transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Explore
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {restaurant.cuisine}
                </span>
                {restaurant.is_open === 1 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Open Now
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Temporarily Closed
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {restaurant.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                {restaurant.address}, {restaurant.area}, {restaurant.city}
              </p>

              {restaurant.description && (
                <p className="text-xs text-slate-400 max-w-xl italic">
                  "{restaurant.description}"
                </p>
              )}
            </div>

            {/* Quick Metrics Badge Card */}
            <div className="flex flex-row sm:flex-col items-center sm:items-stretch justify-between w-full sm:w-auto gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-3.5 sm:p-4 rounded-2xl shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold text-xs shrink-0">
                  <Star className="w-4 h-4 fill-white" />
                </span>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white leading-none">
                    {Number(restaurant.rating).toFixed(1)} / 5.0
                  </div>
                  <span className="text-[10px] text-slate-300">Customer Rating</span>
                </div>
              </div>

              <div className="border-l sm:border-l-0 sm:border-t border-white/10 pl-3 sm:pl-0 sm:pt-2 flex items-center justify-between gap-4 text-xs">
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {restaurant.delivery_time}
                </span>
                <span className="font-bold text-orange-300">
                  ₹{restaurant.price_for_two} for 2
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* Sticky Filter Bar */}
        <div className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3 sm:p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Menu Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes in this menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-orange-500 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Veg Only Toggle */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                vegOnly
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FoodBadge isVeg={true} size="sm" />
              Veg Only
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-sm mx-auto space-y-3">
            <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-800">No dishes match your criteria</h4>
            <p className="text-xs text-slate-500">Try turning off Veg Only or clearing the search box.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setVegOnly(false);
                setSelectedCategory('All');
              }}
              className="text-xs font-bold text-orange-600 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(itemsByCategory).map((catName) => (
              <div key={catName} className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                  <span>{catName}</span>
                  <span className="text-xs font-semibold text-slate-400">
                    {itemsByCategory[catName].length} items
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {itemsByCategory[catName].map((item) => {
                    const qty = getItemQuantity(item.id);
                    const isVeg = item.is_veg === 1;

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-slate-200/80 hover:border-orange-200 p-4 shadow-xs hover:shadow-md transition-all flex justify-between gap-4"
                      >
                        {/* Left Details */}
                        <div className="flex-1 space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <FoodBadge isVeg={isVeg} size="sm" />
                              <span className="text-[11px] font-bold text-slate-400 uppercase">
                                {item.category}
                              </span>
                            </div>

                            <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                            <div className="text-sm font-black text-slate-800">
                              ₹{Number(item.price).toFixed(0)}
                            </div>

                            {item.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Image & Action Counter */}
                        <div className="relative w-28 h-28 shrink-0 flex flex-col items-center">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
                            }}
                            className="w-full h-24 object-cover rounded-xl shadow-xs"
                          />

                          {/* Add / Counter Button */}
                          <div className="absolute -bottom-2">
                            {qty === 0 ? (
                              <button
                                onClick={() => handleAddItem(item)}
                                className="px-4 py-1.5 bg-white border border-slate-200 hover:border-orange-500 text-orange-600 hover:bg-orange-50 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                ADD
                              </button>
                            ) : (
                              <div className="flex items-center bg-orange-600 text-white rounded-xl shadow-md overflow-hidden text-xs font-bold">
                                <button
                                  onClick={() => updateQuantity(item.id, qty - 1)}
                                  className="px-2.5 py-1.5 hover:bg-orange-700 transition-colors cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2 py-1 min-w-[20px] text-center">{qty}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, qty + 1)}
                                  className="px-2.5 py-1.5 hover:bg-orange-700 transition-colors cursor-pointer"
                                  title="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar if items exist */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} added
                </p>
                <p className="text-base font-black text-white">
                  ₹{subtotal.toFixed(0)}{' '}
                  <span className="text-[10px] font-normal text-slate-400">
                    plus delivery & taxes
                  </span>
                </p>
              </div>
            </div>

            <Link
              to="/cart"
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-600/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>View Cart</span>
              <span className="text-xs">→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Multi-Restaurant Conflict Modal */}
      {conflictPrompt.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Replace Cart Items?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your cart already contains dishes from a different restaurant. Would you like to reset your cart and add this item from <span className="font-bold text-slate-900">{restaurant.name}</span>?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConflictPrompt({ show: false, pendingItem: undefined })}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetAndAdd}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 cursor-pointer shadow-md"
              >
                Yes, Start New Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailPage;
