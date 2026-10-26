import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  ShoppingBag,
  MapPin,
  Plus,
  Trash2,
  ChevronRight,
  Shield,
  Phone,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { Address, Order } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'orders';

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New address fields
  const [addressLine, setAddressLine] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const stateName = 'Telangana';
  const [pincode, setPincode] = useState('500081');
  const [savingAddr, setSavingAddr] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate('/login?redirect=/profile');
      return;
    }

    if (activeTab === 'addresses') {
      fetchAddresses();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [isAuthenticated, isLoading, activeTab]);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const resp = await apiClient.get<{ success: boolean; data: Address[] }>('/api/users/addresses');
      if (resp.data?.success) {
        setAddresses(resp.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const resp = await apiClient.get<{ success: boolean; data: Order[] }>('/api/orders/my-orders');
      if (resp.data?.success) {
        setOrders(resp.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch past orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressLine || !area || !pincode) return;

    setSavingAddr(true);
    try {
      const resp = await apiClient.post<{ success: boolean; data: Address }>('/api/users/addresses', {
        address_line: addressLine,
        area,
        city,
        state: stateName,
        pincode,
      });

      if (resp.data?.success) {
        setAddresses([resp.data.data, ...addresses]);
        setShowAddModal(false);
        setAddressLine('');
        setArea('');
      }
    } catch (err: any) {
      console.error('Failed to add address:', err);
      alert('Failed to save address.');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm('Are you sure you want to remove this address?')) return;
    try {
      const resp = await apiClient.delete<{ success: boolean }>(`/api/users/addresses/${id}`);
      if (resp.data?.success) {
        setAddresses(addresses.filter((a) => a.id !== id));
      }
    } catch (err: any) {
      console.error('Failed to delete address:', err);
      alert('Could not remove address.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{user.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
                {user.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {user.phone || '+91 98765 43210'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-none pb-0.5">
        <button
          onClick={() => setSearchParams({ tab: 'orders' })}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          My Orders
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'addresses' })}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'addresses'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Saved Addresses
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'details' })}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'details'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Account Details
        </button>
      </div>

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-sm mx-auto space-y-3">
              <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-900">No Orders Placed Yet</h4>
              <p className="text-xs text-slate-500">Order tasty dishes from our 16 curated restaurants!</p>
              <Link
                to="/"
                className="inline-block px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700"
              >
                Browse Menus
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-orange-300 p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-base text-slate-900">{o.restaurant_name}</h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          o.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Order #{o.id} • {new Date(o.created_at).toLocaleDateString()} at{' '}
                      {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    <p className="text-xs text-slate-600">
                      Delivered to: <span className="font-semibold text-slate-800">{o.area}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-black text-slate-900">
                        ₹{Number(o.total_amount).toFixed(0)}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {o.payment_status}
                      </span>
                    </div>

                    <Link
                      to={`/orders/${o.id}`}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      Track Order
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Your Saved Addresses</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Address
            </button>
          </div>

          {loadingAddresses ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
              <div className="h-28 bg-slate-200 rounded-2xl"></div>
              <div className="h-28 bg-slate-200 rounded-2xl"></div>
            </div>
          ) : addresses.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-sm mx-auto space-y-3">
              <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-900">No Saved Addresses</h4>
              <p className="text-xs text-slate-500">Save delivery addresses for faster 1-click checkout.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700"
              >
                Add Delivery Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      {addr.area}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{addr.address_line}</p>
                    <p className="text-xs text-slate-400">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Account Details */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Full Name</span>
              <p className="text-sm font-bold text-slate-900">{user.name}</p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-1">Email Address</span>
              <p className="text-sm font-bold text-slate-900">{user.email}</p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-1">Phone Number</span>
              <p className="text-sm font-bold text-slate-900">{user.phone || 'Not provided'}</p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-1">Assigned Role</span>
              <p className="text-sm font-bold text-slate-900">{user.role}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs text-slate-600">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block">Centralized Identity Context</span>
              Your identity is verified by API Gateway on port 4000 and injected into downstream microservices via trusted HTTP headers.
            </div>
          </div>
        </div>
      )}

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                Add New Delivery Address
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAddress} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Street / Flat / Door No.
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 104, Sunrise Villas, Kavuri Hills"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Area / Landmark
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madhapur"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddr}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-md"
                >
                  {savingAddr ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
