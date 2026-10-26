import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Activity,
  ShoppingBag,
  Store,
  DollarSign,
  Search,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import apiClient from '../api/client';
import type { Order, Restaurant } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchOrder, setSearchOrder] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, restRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: Order[] }>('/api/orders/all'),
        apiClient.get<{ success: boolean; data: Restaurant[] }>('/api/restaurants'),
      ]);

      if (ordersRes.data?.success) {
        setOrders(ordersRes.data.data);
      }
      if (restRes.data?.success) {
        setRestaurants(restRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'ADMIN') {
      fetchData();
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading, isAuthenticated, user]);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const resp = await apiClient.patch<{ success: boolean }>(`/api/orders/${orderId}/status`, {
        status: newStatus,
      });
      if (resp.data?.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
        );
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert('Error changing status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleRestaurant = async (restId: number, currentOpen: number) => {
    try {
      const nextOpen = currentOpen === 1 ? 0 : 1;
      const resp = await apiClient.put<{ success: boolean }>(`/api/restaurants/${restId}`, {
        is_open: nextOpen,
      });
      if (resp.data?.success) {
        setRestaurants((prev) =>
          prev.map((r) => (r.id === restId ? { ...r, is_open: nextOpen } : r))
        );
      }
    } catch (err: any) {
      console.error('Failed to toggle restaurant status:', err);
      alert('Error updating restaurant.');
    }
  };

  // Metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    if (searchOrder.trim()) {
      const q = searchOrder.toLowerCase().trim();
      const matchId = String(o.id).includes(q);
      const matchCustomer = o.customer_name?.toLowerCase().includes(q);
      const matchRest = o.restaurant_name?.toLowerCase().includes(q);
      if (!matchId && !matchCustomer && !matchRest) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center mx-auto border border-purple-100 shadow-sm">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Admin Credentials Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This dashboard is reserved for authorized system administrators. Please sign in with an administrator account to access platform management.
          </p>
          <div className="pt-2">
            <Link
              to="/login?redirect=/admin"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all hover:scale-105"
            >
              Sign In as Administrator
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Shield className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Administrative Control Center
            </span>
          </div>
          <h1 className="text-3xl font-black text-white">System Operations</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage global orders, restaurant catalogs, and monitor gateway telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/gateway-monitor"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Activity className="w-4 h-4" />
            Live Gateway Monitor
          </Link>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Reload data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Total System Orders</span>
            <p className="text-2xl font-black text-slate-900">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Platform GMV</span>
            <p className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Active Outlets</span>
            <p className="text-2xl font-black text-slate-900">{restaurants.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Orders Delivered</span>
            <p className="text-2xl font-black text-slate-900">{deliveredCount}</p>
          </div>
        </div>
      </div>

      {/* Orders Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Platform Order Stream</h3>
            <p className="text-xs text-slate-500">Live order status dispatch and fulfillment control</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, customer..."
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
              />
            </div>

            <select
              aria-label="Filter orders by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="PLACED">PLACED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PREPARING">PREPARING</option>
              <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading system orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No matching orders found.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left border-collapse text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Order #</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Restaurant</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Update Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      <Link to={`/orders/${ord.id}`} className="text-orange-600 hover:underline">
                        #{ord.id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-3 text-slate-800">
                      {ord.customer_name || `User ${ord.user_id}`}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-semibold">
                      {ord.restaurant_name}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      ₹{Number(ord.total_amount).toFixed(0)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ord.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <select
                        aria-label={`Update status for order #${ord.id}`}
                        disabled={updatingId === ord.id}
                        value={ord.status}
                        onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-orange-500"
                      >
                        <option value="PLACED">PLACED</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PREPARING">PREPARING</option>
                        <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restaurant Availability Control */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
          Restaurant Partner Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants.map((res) => {
            const isOpen = res.is_open === 1;
            return (
              <div
                key={res.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{res.name}</h4>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    ></span>
                  </div>
                  <p className="text-[11px] text-slate-500">{res.cuisine}</p>
                  <p className="text-[10px] text-slate-400">{res.area}, {res.city}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] font-semibold text-slate-600">
                    {isOpen ? 'Open to Orders' : 'Store Closed'}
                  </span>
                  <button
                    onClick={() => handleToggleRestaurant(res.id, res.is_open)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                      isOpen
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {isOpen ? 'Close' : 'Open'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
