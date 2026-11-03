"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { calculateDemoDeliveryFee } from "@nationx/shared";

export interface CartItem {
  productId: string;
  merchantId: string;
  merchantName: string;
  merchantLocality?: string;
  name: string;
  price: number;
  quantity: number;
  handlingTag?: string;
  imageUrl?: string | null;
}

export interface MerchantSuborderGroup {
  merchantId: string;
  merchantName: string;
  merchantLocality?: string;
  subtotal: number;
  items: CartItem[];
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  merchantGroups: MerchantSuborderGroup[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "nationx_customer_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // ignore
      }
    }
  }, [items, isLoaded]);

  const addItem = (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  // Group items by merchant
  const merchantMap = new Map<string, MerchantSuborderGroup>();
  for (const item of items) {
    if (!merchantMap.has(item.merchantId)) {
      merchantMap.set(item.merchantId, {
        merchantId: item.merchantId,
        merchantName: item.merchantName,
        merchantLocality: item.merchantLocality,
        subtotal: 0,
        items: [],
      });
    }
    const group = merchantMap.get(item.merchantId)!;
    group.items.push(item);
    group.subtotal += item.price * item.quantity;
  }

  const merchantGroups = Array.from(merchantMap.values());
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Authoritative demo delivery fee (base 2.5km distance assumption across Khammam)
  const feeInfo = calculateDemoDeliveryFee(2.5, itemCount);
  const deliveryFee = items.length > 0 ? feeInfo.amount : 0;
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        deliveryFee,
        total,
        merchantGroups,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

