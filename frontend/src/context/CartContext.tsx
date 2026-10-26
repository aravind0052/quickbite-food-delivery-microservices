import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, MenuItem } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string | null;
  addItem: (item: MenuItem, restaurant: { id: number; name: string }) => boolean;
  addToCart: (item: MenuItem, restaurantId: number, restaurantName: string) => boolean;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (menuItemId: number) => number;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  taxes: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('quickbite_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [restaurantId, setRestaurantId] = useState<number | null>(() => {
    const saved = localStorage.getItem('quickbite_cart_rest_id');
    return saved ? parseInt(saved, 10) : null;
  });

  const [restaurantName, setRestaurantName] = useState<string | null>(() => {
    return localStorage.getItem('quickbite_cart_rest_name') || null;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('quickbite_cart', JSON.stringify(cartItems));
    if (restaurantId) {
      localStorage.setItem('quickbite_cart_rest_id', String(restaurantId));
    } else {
      localStorage.removeItem('quickbite_cart_rest_id');
    }
    if (restaurantName) {
      localStorage.setItem('quickbite_cart_rest_name', restaurantName);
    } else {
      localStorage.removeItem('quickbite_cart_rest_name');
    }
  }, [cartItems, restaurantId, restaurantName]);

  const addItem = (item: MenuItem, restaurant: { id: number; name: string }): boolean => {
    // If cart has items from another restaurant, reset cart to new restaurant
    if (restaurantId && restaurantId !== restaurant.id && cartItems.length > 0) {
      setCartItems([
        {
          menuItemId: item.id,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          name: item.name,
          price: parseFloat(String(item.price)),
          quantity: 1,
          isVeg: Number(item.is_veg) === 1,
          imageUrl: item.image_url,
        },
      ]);
      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);
      return true;
    }

    setRestaurantId(restaurant.id);
    setRestaurantName(restaurant.name);

    setCartItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          name: item.name,
          price: parseFloat(String(item.price)),
          quantity: 1,
          isVeg: Number(item.is_veg) === 1,
          imageUrl: item.image_url,
        },
      ];
    });

    return true;
  };

  const addToCart = (item: MenuItem, restId: number, restName: string) => {
    return addItem(item, { id: restId, name: restName });
  };

  const removeItem = (menuItemId: number) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId);
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        const next = prev.filter((i) => i.menuItemId !== menuItemId);
        if (next.length === 0) {
          setRestaurantId(null);
          setRestaurantName(null);
        }
        return next;
      }

      return prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
    localStorage.removeItem('quickbite_cart');
    localStorage.removeItem('quickbite_cart_rest_id');
    localStorage.removeItem('quickbite_cart_rest_name');
  };

  const getItemQuantity = (menuItemId: number): number => {
    const item = cartItems.find((i) => i.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  };

  const itemCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = Number(
    cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0).toFixed(2)
  );
  const deliveryFee = subtotal > 500 ? 0 : subtotal > 0 ? 35 : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  const taxes = Number((subtotal * 0.05).toFixed(2)); // 5% GST
  const totalAmount = Number((subtotal + deliveryFee + platformFee + taxes).toFixed(2));

  return (
    <CartContext.Provider
      value={{
        cartItems,
        items: cartItems,
        restaurantId,
        restaurantName,
        addItem,
        addToCart,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
        itemCount,
        subtotal,
        deliveryFee,
        platformFee,
        taxes,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
