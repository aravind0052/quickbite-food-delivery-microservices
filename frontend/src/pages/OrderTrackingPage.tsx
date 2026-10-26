import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Utensils,
  Truck,
  PackageCheck,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  FastForward,
  ShoppingBag,
} from 'lucide-react';
import apiClient from '../api/client';
import type { Order } from '../types';
import FoodBadge from '../components/common/FoodBadge';

const STATUS_STEPS = [
  { key: 'PLACED', label: 'Order Placed', icon: Clock, desc: 'Your order has been sent to the restaurant' },
  { key: 'CONFIRMED', label: 'Order Confirmed', icon: Utensils, desc: 'The kitchen accepted your order' },
  { key: 'PREPARING', label: 'Preparing Food', icon: FastForward, desc: 'Chefs are cooking your fresh meal' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck, desc: 'Delivery partner is on the way to you' },
  { key: 'DELIVERED', label: 'Delivered', icon: PackageCheck, desc: 'Enjoy your delicious QuickBite meal!' },
];

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const fetchOrder = async () => {
    try {
      const resp = await apiClient.get<{ success: boolean; data: Order }>(`/api/orders/${orderId}`);
      if (resp.data?.success) {
        setOrder(resp.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch order:', err);
      setError('Order not found or permission denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId && !isNaN(orderId)) {
      fetchOrder();
    } else {
      setLoading(false);
      setError('Invalid or missing order reference.');
    }
  }, [orderId]);

  // Compute status progression index
  const getCurrentStepIndex = (status: string) => {
    if (status === 'CANCELLED') return -1;
    return STATUS_STEPS.findIndex((s) => s.key === status);
  };

  const handleSimulateNextStatus = async () => {
    if (!order) return;
    const currentIndex = getCurrentStepIndex(order.status);
    if (currentIndex >= STATUS_STEPS.length - 1 || order.status === 'CANCELLED') return;

    const nextStatus = STATUS_STEPS[currentIndex + 1].key;
    setUpdatingStatus(true);
    try {
      const resp = await apiClient.patch<{ success: boolean; data: any }>(
        `/api/orders/${order.id}/status`,
        { status: nextStatus }
      );
      if (resp.data?.success) {
        await fetchOrder();
      }
    } catch (err: any) {
      console.error('Failed to advance order status:', err);
      alert('Could not update status. Please verify permissions.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-sm text-slate-500">
          We could not load order #{orderId}. It may belong to another user or does not exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  const currentStep = getCurrentStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/profile?tab=orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All My Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Order #{order.id}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isCancelled
                  ? 'bg-rose-100 text-rose-700'
                  : order.status === 'DELIVERED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-orange-100 text-orange-800 animate-pulse'
              }`}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Placed on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrder}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh order status"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Interactive Status Simulation for Academic Demo */}
          {currentStep >= 0 && currentStep < STATUS_STEPS.length - 1 && (
            <button
              onClick={handleSimulateNextStatus}
              disabled={updatingStatus}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              title="Demo Button: Simulates advancement to next delivery status"
            >
              <FastForward className="w-4 h-4 text-orange-400" />
              <span>{updatingStatus ? 'Updating...' : 'Advance Status (Demo)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Progress Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">
          Delivery Timeline
        </h3>

        {isCancelled ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Order Cancelled</h4>
              <p className="text-xs text-rose-600">This order was cancelled and will not be processed further.</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Desktop Horizontal Progress Track Line */}
            <div className="hidden sm:block absolute top-6 left-8 right-8 h-1 bg-slate-100 z-0">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-700"
                style={{
                  width: `${(Math.max(0, currentStep) / (STATUS_STEPS.length - 1)) * 100}%`,
                }}
              ></div>
            </div>

            {/* Mobile Vertical Progress Track Line */}
            <div className="sm:hidden absolute top-6 bottom-6 left-6 w-0.5 bg-slate-200 z-0">
              <div
                className="w-full bg-gradient-to-b from-orange-500 to-emerald-500 transition-all duration-700"
                style={{
                  height: `${(Math.max(0, currentStep) / (STATUS_STEPS.length - 1)) * 100}%`,
                }}
              ></div>
            </div>

            {/* Steps Container */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-2 relative z-10">
              {STATUS_STEPS.map((step, idx) => {
                const isPassed = idx < currentStep;
                const isCurrent = idx === currentStep;
                const IconComponent = step.icon;

                return (
                  <div key={step.key} className="flex sm:flex-col items-center sm:text-center gap-3.5 sm:gap-2">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                        isCurrent
                          ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30 ring-4 ring-orange-100 scale-105 sm:scale-110'
                          : isPassed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <IconComponent className="w-5 h-5 sm:w-5 sm:h-5" />
                      )}
                    </div>

                    <div className="flex-1 sm:flex-initial text-left sm:text-center">
                      <h4
                        className={`text-xs sm:text-xs font-bold ${
                          isCurrent
                            ? 'text-orange-600'
                            : isPassed
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 sm:max-w-[150px] sm:mx-auto">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Order Details & Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Restaurant Info */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Restaurant Details
          </span>
          <h4 className="font-bold text-slate-900 text-base">{order.restaurant_name}</h4>
          <p className="text-xs text-slate-500 flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            {order.restaurant_address || 'Restaurant partner kitchen'}
          </p>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Delivery Destination
          </span>
          <h4 className="font-bold text-slate-900 text-base">{order.area || 'Home'}</h4>
          <p className="text-xs text-slate-500 flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
            {order.address_line}, {order.city} - {order.pincode}
          </p>
        </div>

        {/* Payment & Amount */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Payment & Total
          </span>
          <div className="flex items-baseline justify-between">
            <h4 className="text-2xl font-black text-slate-900">₹{Number(order.total_amount).toFixed(0)}</h4>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
              {order.payment_status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Verified by Order Service (:3004)
          </p>
        </div>
      </div>

      {/* Ordered Items Catalog */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-orange-600" />
          Items in this Order ({order.items?.length || 0})
        </h3>

        <div className="divide-y divide-slate-100">
          {order.items?.map((item) => (
            <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FoodBadge isVeg={item.is_veg === 1} size="sm" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.name}</h4>
                  <p className="text-xs text-slate-400">
                    Qty: {item.quantity} × ₹{Number(item.price).toFixed(0)}
                  </p>
                </div>
              </div>

              <div className="text-xs sm:text-sm font-black text-slate-900">
                ₹{Number(item.subtotal).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
