import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  ShieldCheck,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  Lock,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { Address, CartItem } from '../types';
import FoodBadge from '../components/common/FoodBadge';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, restaurantName, restaurantId, updateQuantity, clearCart, subtotal, itemCount } = useCart();
  const { isAuthenticated } = useAuth();

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState<boolean>(false);
  const [showNewAddressModal, setShowNewAddressModal] = useState<boolean>(false);

  // New address form
  const [addressLine, setAddressLine] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const stateName = 'Telangana';
  const [pincode, setPincode] = useState('500081');
  const [savingAddress, setSavingAddress] = useState(false);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');

  // Order submission
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Calculations
  const deliveryFee = subtotal >= 500 ? 0 : 40;
  const taxesAndCharges = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + deliveryFee + taxesAndCharges;

  // Load user addresses if authenticated
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!isAuthenticated) return;
      setLoadingAddresses(true);
      try {
        const resp = await apiClient.get<{ success: boolean; data: Address[] }>('/api/users/addresses');
        if (resp.data?.success && resp.data.data.length > 0) {
          setAddresses(resp.data.data);
          setSelectedAddressId(resp.data.data[0].id);
        } else {
          setAddresses([]);
        }
      } catch (err: any) {
        console.error('Failed to load user addresses:', err);
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [isAuthenticated]);

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressLine || !area || !pincode) return;

    setSavingAddress(true);
    try {
      const resp = await apiClient.post<{ success: boolean; data: Address }>('/api/users/addresses', {
        address_line: addressLine,
        area,
        city,
        state: stateName,
        pincode,
      });

      if (resp.data?.success) {
        const newAddr = resp.data.data;
        setAddresses([newAddr, ...addresses]);
        setSelectedAddressId(newAddr.id);
        setShowNewAddressModal(false);
        // Reset form
        setAddressLine('');
        setArea('');
      }
    } catch (err: any) {
      console.error('Failed to create address:', err);
      alert('Failed to save address. Please verify your details.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/cart');
      return;
    }

    if (!selectedAddressId) {
      setOrderError('Please select or add a delivery address to proceed.');
      return;
    }

    if (!restaurantId || items.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }

    setSubmittingOrder(true);
    setOrderError(null);

    try {
      // Zero-trust order payload:
      // Client sends ONLY menu_item_id and quantity.
      // Order Service (:3004) computes totals independently from MySQL!
      const payload = {
        restaurant_id: restaurantId,
        delivery_address_id: selectedAddressId,
        items: items.map((i: CartItem) => ({
          menu_item_id: i.menuItemId,
          quantity: i.quantity,
        })),
      };

      const response = await apiClient.post<{ success: boolean; data: { orderId: number; totalAmount: number } }>(
        '/api/orders',
        payload
      );

      if (response.data?.success) {
        const orderData = response.data.data as any;
        const newOrderId = orderData.id || orderData.orderId;
        clearCart();
        navigate(`/orders/${newOrderId}`);
      } else {
        setOrderError('Failed to place order. Please try again.');
      }
    } catch (err: any) {
      console.error('Error creating order:', err);
      const msg = err.response?.data?.message || err.message || 'Error communicating with Order Service via API Gateway.';
      setOrderError(msg);
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Your Cart is Empty</h2>
          <p className="text-sm text-slate-500">
            Looks like you haven't added anything to your cart yet. Explore our top restaurants!
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-600/30 hover:scale-105 transition-all"
        >
          See Restaurants Near You
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Checkout & Order</h1>
        <p className="text-xs sm:text-sm text-slate-500">Review items, delivery destination, and payment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Items & Delivery Address */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          {/* Restaurant & Cart Items Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
              <div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ordering From
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">{restaurantName}</h3>
              </div>
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Empty Cart
              </button>
            </div>

            {/* Item Rows */}
            <div className="divide-y divide-slate-100">
              {items.map((item: CartItem) => (
                <div key={item.menuItemId} className="py-3 flex items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <FoodBadge isVeg={item.isVeg} size="sm" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                      <p className="text-[11px] sm:text-xs text-slate-400">₹{item.price} each</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {/* Quantity Selector */}
                    <div className="flex items-center bg-slate-100 rounded-lg text-xs font-bold">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        className="p-1 sm:p-1.5 hover:bg-slate-200 rounded-l-lg text-slate-700 cursor-pointer"
                        title="Reduce quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-1.5 sm:px-2 min-w-[18px] sm:min-w-[20px] text-center text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        className="p-1 sm:p-1.5 hover:bg-slate-200 rounded-r-lg text-slate-700 cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-xs sm:text-sm font-black text-slate-900 w-12 sm:w-16 text-right">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <Link
                to={`/restaurants/${restaurantId}`}
                className="text-xs font-bold text-orange-600 hover:underline"
              >
                + Add more items from menu
              </Link>
            </div>
          </div>

          {/* Delivery Address Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900">Delivery Address</h3>
              </div>

              {isAuthenticated && (
                <button
                  onClick={() => setShowNewAddressModal(true)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add New Address
                </button>
              )}
            </div>

            {!isAuthenticated ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                <p className="text-xs text-amber-800 font-semibold">
                  You must be logged in to view your saved addresses and place an order.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to="/login?redirect=/cart"
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700"
                  >
                    Sign In / Register
                  </Link>
                </div>
              </div>
            ) : loadingAddresses ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-16 bg-slate-100 rounded-xl"></div>
                <div className="h-16 bg-slate-100 rounded-xl"></div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                <p className="text-xs text-slate-500 font-medium">No saved addresses found.</p>
                <button
                  onClick={() => setShowNewAddressModal(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 cursor-pointer"
                >
                  Add Your Delivery Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-orange-600 bg-orange-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{addr.area}</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {addr.address_line}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Method Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              Payment Option
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  paymentMethod === 'COD'
                    ? 'border-orange-600 bg-orange-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Cash on Delivery</h4>
                  <p className="text-[11px] text-slate-500">Pay cash or scan UPI on arrival</p>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('ONLINE')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  paymentMethod === 'ONLINE'
                    ? 'border-orange-600 bg-orange-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">UPI / Card (Simulated)</h4>
                  <p className="text-[11px] text-slate-500">Instant gateway simulation</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Bill Breakdown & Placement */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5 sticky top-24">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Bill Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Item Subtotal</span>
                <span className="font-semibold text-slate-900">₹{subtotal.toFixed(0)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span className="flex items-center gap-1">
                  Delivery Partner Fee
                  {deliveryFee === 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      FREE
                    </span>
                  )}
                </span>
                <span className="font-semibold text-slate-900">₹{deliveryFee}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Taxes & Restaurant Charges (5% GST)</span>
                <span className="font-semibold text-slate-900">₹{taxesAndCharges}</span>
              </div>

              {subtotal < 500 && (
                <div className="p-2 bg-amber-50 rounded-lg text-[11px] text-amber-800">
                  💡 Add items worth ₹{(500 - subtotal).toFixed(0)} more for FREE delivery!
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-slate-900">
                <div>
                  <span className="text-sm font-black">To Pay</span>
                  <p className="text-[10px] text-slate-400">Inclusive of all taxes</p>
                </div>
                <span className="text-2xl font-black text-orange-600">
                  ₹{totalAmount.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Zero-Trust Academic Callout */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Zero-Trust Backend Pricing
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Final bill is calculated strictly by Order Service (:3004) from database catalog prices. Client totals are never blindly trusted.
              </p>
            </div>

            {/* Error Message */}
            {orderError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Checkout Action Button */}
            {isAuthenticated ? (
              <button
                disabled={submittingOrder || !selectedAddressId}
                onClick={handlePlaceOrder}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingOrder ? (
                  <span>Securing Order via Gateway...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Place Order (₹{totalAmount.toFixed(0)})</span>
                  </>
                )}
              </button>
            ) : (
              <Link
                to="/login?redirect=/cart"
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                Sign In to Place Order
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* New Address Modal */}
      {showNewAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                Add Delivery Address
              </h3>
              <button
                onClick={() => setShowNewAddressModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAddress} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Street / Flat / Door No.
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Cyber Heights, Hitech City"
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
                  placeholder="e.g. Madhapur Near Metro"
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
                    placeholder="500081"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewAddressModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-md"
                >
                  {savingAddress ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
