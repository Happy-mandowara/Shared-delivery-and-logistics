"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
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
  totalAmount: number;
  subtotalByMerchant: Record<string, number>;
  merchantGroups: MerchantSuborderGroup[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }, quantity?: number) => void;
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
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, isLoaded]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const merchantGroups = useMemo(() => {
    const groupMap = new Map<string, MerchantSuborderGroup>();
    items.forEach((item) => {
      const existing = groupMap.get(item.merchantId);
      if (existing) {
        existing.items.push(item);
        existing.subtotal += item.price * item.quantity;
      } else {
        groupMap.set(item.merchantId, {
          merchantId: item.merchantId,
          merchantName: item.merchantName,
          merchantLocality: item.merchantLocality,
          subtotal: item.price * item.quantity,
          items: [item],
        });
      }
    });
    return Array.from(groupMap.values());
  }, [items]);

  const subtotalByMerchant = useMemo(() => {
    const record: Record<string, number> = {};
    merchantGroups.forEach((g) => {
      record[g.merchantId] = g.subtotal;
    });
    return record;
  }, [merchantGroups]);

  const deliveryFee = useMemo(() => {
    if (items.length === 0) return 0;
    const feeObj = calculateDemoDeliveryFee(2.5, items.length);
    return typeof feeObj === "number" ? feeObj : feeObj.amount;
  }, [items.length]);

  const total = subtotal + deliveryFee;
  const totalAmount = total;

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }, quantity = 1) => {
    const addQty = item.quantity ?? quantity;
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === item.productId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + addQty,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: item.productId,
          merchantId: item.merchantId,
          merchantName: item.merchantName,
          merchantLocality: item.merchantLocality,
          name: item.name,
          price: item.price,
          handlingTag: item.handlingTag,
          imageUrl: item.imageUrl,
          quantity: addQty,
        },
      ];
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

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        deliveryFee,
        total,
        totalAmount,
        subtotalByMerchant,
        merchantGroups,
        isCartOpen,
        openCart,
        closeCart,
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
