import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Star,
  Clock,
  MapPin,
  SlidersHorizontal,
  Flame,
  ArrowUpDown,
  Utensils,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import apiClient from '../api/client';
import type { Restaurant } from '../types';

const CUISINES = [
  'All',
  'Biryani',
  'North Indian',
  'South Indian',
  'Pizza',
  'Burgers',
  'Chinese',
  'Italian',
  'Desserts',
  'Beverages',
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const queryParam = searchParams.get('q') || '';
  const cityParam = searchParams.get('city') || '';
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [selectedCity, setSelectedCity] = useState(cityParam || 'All');
  const [sortBy, setSortBy] = useState<'rating' | 'delivery' | 'cost_asc' | 'cost_desc'>('rating');
  const [openOnly, setOpenOnly] = useState(false);

  // Sync state if URL query params change
  useEffect(() => {
    if (queryParam !== searchQuery) {
      setSearchQuery(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    if (cityParam && cityParam !== selectedCity) {
      setSelectedCity(cityParam);
    }
  }, [cityParam]);

  // Fetch restaurants from Gateway (/api/restaurants)
  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{ success: boolean; data: Restaurant[] }>('/api/restaurants');
        if (response.data && response.data.success) {
          setRestaurants(response.data.data);
        } else {
          setRestaurants([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch restaurants via Gateway:', err);
        setError('Unable to load restaurants. Please verify API Gateway on port 4000 is active.');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Filtered and sorted restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants
      .filter((r) => {
        // Search term matching
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = r.name.toLowerCase().includes(q);
          const matchCuisine = r.cuisine.toLowerCase().includes(q);
          const matchArea = r.area.toLowerCase().includes(q);
          if (!matchName && !matchCuisine && !matchArea) return false;
        }

        // Cuisine filter
        if (selectedCuisine !== 'All') {
          if (!r.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase())) {
            return false;
          }
        }

        // City filter
        if (selectedCity !== 'All' && selectedCity !== '') {
          if (r.city.toLowerCase() !== selectedCity.toLowerCase()) {
            return false;
          }
        }

        // Open only
        if (openOnly && r.is_open !== 1) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return Number(b.rating) - Number(a.rating);
        }
        if (sortBy === 'delivery') {
          const timeA = parseInt(a.delivery_time) || 30;
          const timeB = parseInt(b.delivery_time) || 30;
          return timeA - timeB;
        }
        if (sortBy === 'cost_asc') {
          return Number(a.price_for_two) - Number(b.price_for_two);
        }
        if (sortBy === 'cost_desc') {
          return Number(b.price_for_two) - Number(a.price_for_two);
        }
        return 0;
      });
  }, [restaurants, searchQuery, selectedCuisine, selectedCity, sortBy, openOnly]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCuisine('All');
    setSelectedCity('All');
    setSortBy('rating');
    setOpenOnly(false);
    setSearchParams({});
  };

  return (
    <div className="min-vh-screen pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 text-white py-16 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:24px_24px] opacity-15"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wide">
              <Zap className="w-3.5 h-3.5" />
              Microservices-Powered Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Delicious Food, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                Delivered Instantly.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
              Explore top-rated restaurants, authentic cuisines, and hand-crafted delicacies. Powered by our centralized API Gateway with real-time tracking.
            </p>

            {/* Quick Hero Search Input */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row gap-3 max-w-2xl bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/15 shadow-2xl">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by restaurant name, cuisine, or neighborhood..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white text-slate-900 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('restaurants-grid');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Utensils className="w-4 h-4" />
                  Explore Menus
                </button>
              </div>
            </div>

            {/* System Highlights Pills */}
            <div className="pt-4 flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Zero-Trust Backend Billing
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Avg 30 Mins Delivery
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                16 Verified Outlets
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Cuisine Filter Pills Carousel */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              Inspiration for your order
            </span>
            <span className="text-xs text-slate-400">{CUISINES.length} Categories</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
            {CUISINES.map((cuisine) => {
              const active = selectedCuisine === cuisine;
              return (
                <button
                  key={cuisine}
                  onClick={() => setSelectedCuisine(cuisine)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20 scale-105'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter & Sort Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left Filter Counts */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-800">
                {filteredRestaurants.length} Restaurants Available
              </span>
              {(selectedCuisine !== 'All' || selectedCity !== 'All' || searchQuery || openOnly) && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline ml-2 cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Right Sorting & Quick Toggles */}
            {/* Right Sorting & Quick Toggles */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {/* City Filter */}
              <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-1.5 text-xs min-w-[130px]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500 font-medium">City:</span>
                </div>
                <select
                  aria-label="Filter restaurants by city"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi">Delhi</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-1.5 text-xs min-w-[140px]">
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500 font-medium">Sort:</span>
                </div>
                <select
                  aria-label="Sort restaurants by criteria"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="rating">Top Rated (★)</option>
                  <option value="delivery">Fastest</option>
                  <option value="cost_asc">Cost: Low-High</option>
                  <option value="cost_desc">Cost: High-Low</option>
                </select>
              </div>

              {/* Open Only Switch */}
              <button
                type="button"
                onClick={() => setOpenOnly(!openOnly)}
                className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                  openOnly
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ● Open Now
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded-md w-1/2"></div>
                  <div className="h-4 bg-slate-200 rounded-md w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
            <p className="text-rose-700 font-bold">{error}</p>
            <p className="text-xs text-rose-500">Ensure npm run dev:backend is running with Gateway at :4000.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredRestaurants.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto text-orange-600">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">No restaurants found</h3>
            <p className="text-sm text-slate-500">
              We couldn't find any restaurants matching your current search or filter combination.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Restaurants Grid */}
        <div id="restaurants-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {!loading &&
            filteredRestaurants.map((res) => {
              const ratingNum = Number(res.rating);
              const isHighRated = ratingNum >= 4.5;

              return (
                <div
                  key={res.id}
                  onClick={() => navigate(`/restaurants/${res.id}`)}
                  className="group bg-white rounded-2xl border border-slate-100 hover:border-orange-200 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col hover:-translate-y-1"
                >
                  {/* Restaurant Banner / Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={res.image_url}
                      alt={res.name}
                      onError={(e) => {
                        // Fallback image if unsplash link is offline
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {res.is_open === 1 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow-xs">
                          OPEN
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800/90 text-white backdrop-blur-md shadow-xs">
                          CLOSED
                        </span>
                      )}
                    </div>

                    {/* Bottom Details in Banner Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="text-xs font-bold drop-shadow-md flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {res.delivery_time}
                      </span>
                      <span className="text-xs font-semibold drop-shadow-md">
                        ₹{res.price_for_two} for two
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {res.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-bold shrink-0 ${
                            isHighRated
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          <Star className="w-3 h-3 fill-white" />
                          {Number(res.rating).toFixed(1)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
                        {res.cuisine}
                      </p>

                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                        {res.area}, {res.city}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
                      <span>View Menu</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
