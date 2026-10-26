import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  MapPin,
  Search,
  ShoppingBag,
  User as UserIcon,
  Activity,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          {/* 1. QuickBite Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
                <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
                  Quick<span className="text-orange-600">Bite</span>
                </span>
                <span className="hidden xs:inline text-[9px] sm:text-[10px] font-semibold tracking-wider text-slate-400 uppercase -mt-1">
                  Good food. Fast delivery.
                </span>
              </div>
            </Link>

            {/* Location selector (Desktop & Tablet) */}
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
              <select
                aria-label="Select delivery city"
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  navigate(`/?city=${e.target.value}`);
                }}
                className="text-xs font-semibold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-orange-600 transition-colors pr-2"
              >
                <option value="Hyderabad">Hyderabad</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Chennai">Chennai</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>
          </div>

          {/* 2. Global Search Bar (Desktop & Tablet) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md relative"
          >
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search for restaurants or dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              />
            </div>
          </form>

          {/* 3. Right Navigation Elements */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Gateway Monitor Link (Visible on sm+) */}
            <Link
              to="/gateway-monitor"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-slate-100 hover:bg-slate-800 border border-slate-700 shadow-xs transition-all group"
              title="Open Live API Gateway Monitoring Dashboard"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gateway Monitor</span>
            </Link>

            {/* Admin Dashboard Link (For ADMIN users) */}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                title="Admin Control Center"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            )}

            {/* Cart Button (Always visible on all screens) */}
            <Link
              to="/cart"
              className="relative p-2 sm:p-2.5 rounded-full text-slate-700 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              title="View Cart"
            >
              <ShoppingBag className="w-5 h-5 sm:w-5 sm:h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-5 h-5 rounded-full bg-orange-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Authentication / User Profile (Desktop Dropdown) */}
            {isAuthenticated && user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-full hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 max-w-[90px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showUserDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setShowUserDropdown(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700">
                        {user.role}
                      </span>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      My Profile & Addresses
                    </Link>

                    <Link
                      to="/profile?tab=orders"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4 text-slate-400" />
                      Past Orders
                    </Link>

                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-sm shadow-orange-600/20 transition-all hover:scale-105"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-orange-600" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2">
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search restaurants or dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-orange-500 focus:bg-white"
                />
              </div>
            </form>

            {/* Mobile City Selector */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                City Location:
              </span>
              <select
                aria-label="Select mobile delivery city"
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  navigate(`/?city=${e.target.value}`);
                  closeMobileMenu();
                }}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer"
              >
                <option value="Hyderabad">Hyderabad</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Chennai">Chennai</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>

            {/* Quick Links Menu */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/gateway-monitor"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gateway Monitor</span>
              </Link>

              <Link
                to="/cart"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Cart ({itemCount})</span>
              </Link>
            </div>

            {/* User Account State in Mobile Drawer */}
            <div className="pt-2 border-t border-slate-100">
              {isAuthenticated && user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500">{user.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700">
                      {user.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/profile"
                      onClick={closeMobileMenu}
                      className="p-2.5 text-center text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      My Profile
                    </Link>

                    <Link
                      to="/profile?tab=orders"
                      onClick={closeMobileMenu}
                      className="p-2.5 text-center text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      My Orders
                    </Link>
                  </div>

                  {user.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center gap-2 w-full p-2.5 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 border border-purple-200"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Admin Control Center
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      closeMobileMenu();
                      navigate('/');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="p-2.5 text-center text-xs font-bold bg-orange-600 text-white rounded-xl shadow-xs"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="p-2.5 text-center text-xs font-bold bg-slate-100 text-slate-800 rounded-xl border border-slate-200"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
